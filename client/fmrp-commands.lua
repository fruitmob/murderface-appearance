-- FMRP: Slash commands + smooth camera controls + shop info for murderface-appearance

currentShopType = "clothing" -- Global: tracks which command opened the menu (also set by OpenShop in client.lua)

-- Helper: open customization with specific config
local function openCustomization(conf, shopType)
    currentShopType = shopType or "clothing"
    local config = GetDefaultConfig()
    for k, v in pairs(conf) do config[k] = v end
    config.enableExit = true

    -- Ensure ped is visible and frozen before opening menu
    local ped = cache.ped
    SetEntityVisible(ped, true, false)
    SetEntityAlpha(ped, 255, false)
    FreezeEntityPosition(ped, true)

    client.startPlayerCustomization(function(appearance)
        FreezeEntityPosition(cache.ped, false)
        if appearance then
            TriggerServerEvent("illenium-appearance:server:saveAppearance", appearance)
        end
    end, config)
end

-- /clothing — clothing only (components + props)
RegisterCommand("clothing", function()
    openCustomization({ components = true, props = true }, "clothing")
end, false)

-- /barber — hair + head overlays only
RegisterCommand("barber", function()
    openCustomization({ headOverlays = true }, "barber")
end, false)

-- /tattoo — tattoos only
RegisterCommand("tattoo", function()
    openCustomization({ tattoos = true }, "tattoo")
end, false)

-- /outfits — full clothing + outfits screen
RegisterCommand("outfits", function()
    openCustomization({ components = true, props = true }, "clothing")
end, false)

-- Event: server triggers full appearance menu on this client (used by /appearance [id])
RegisterNetEvent("murderface-appearance:client:openFullMenu", function()
    openCustomization({
        ped = true,
        headBlend = true,
        faceFeatures = true,
        headOverlays = true,
        components = true,
        props = true,
        tattoos = true,
    }, "surgeon")
end)

-- ============ ORBITAL CAMERA SYSTEM ============
-- Based on bl_appearance pattern: event-driven, no game thread.
-- Presets change target + distance, orbital drag always works.

local orbitAngleZ = 0.0      -- horizontal yaw (degrees, matches heading)
local orbitAngleY = 0.0      -- vertical pitch (degrees)
local orbitDistance = 1.8     -- zoom distance
local orbitTargetCoords = nil -- vec3 orbit target (ped position + bone offset)
local orbitCam = nil          -- current camera handle
local orbitOldCam = nil       -- previous camera (during interp)
local changingCam = false     -- lock during preset transitions
local CAM_FOV = 49.0          -- match stock illenium FOV

-- Bone IDs for camera presets (matches bl_appearance)
local CAMERA_BONES = {
    default = 0,        -- whole body (use entity coords)
    head    = 31086,    -- SKEL_Head
    body    = 24818,    -- SKEL_Spine3
    bottom  = 16335,    -- l_thigh (leg area)
}

local CAMERA_DISTANCES = {
    default = 1.8,
    head    = 0.8,
    body    = 1.1,
    bottom  = 1.0,
}

-- Convert spherical to cartesian offset
local function getOrbitOffset()
    local radZ = math.rad(orbitAngleZ)
    local radY = math.rad(orbitAngleY)
    local x = math.cos(radZ) * math.cos(radY) * orbitDistance
    local y = math.sin(radZ) * math.cos(radY) * orbitDistance
    local z = math.sin(radY) * orbitDistance
    return x, y, z
end

-- Update camera position — called on every mouse move/zoom/preset (no thread)
local function updateCamPosition()
    if not orbitCam or not orbitTargetCoords or changingCam then return end
    local ox, oy, oz = getOrbitOffset()
    SetCamCoord(orbitCam, orbitTargetCoords.x + ox, orbitTargetCoords.y + oy, orbitTargetCoords.z + oz)
    PointCamAtCoord(orbitCam, orbitTargetCoords.x, orbitTargetCoords.y, orbitTargetCoords.z)
end

-- Destroy all orbital cameras (cleanup)
local function destroyOrbitCameras()
    if orbitCam then DestroyCam(orbitCam, true); orbitCam = nil end
    if orbitOldCam then DestroyCam(orbitOldCam, true); orbitOldCam = nil end
    orbitTargetCoords = nil
    changingCam = false
end

-- Get target coords from ped bone
local function getBoneCoords(ped, boneOrPreset)
    local boneId = CAMERA_BONES[boneOrPreset] or CAMERA_BONES.default
    if boneId == 0 then
        local coords = GetEntityCoords(ped)
        return vector3(coords.x, coords.y, coords.z + 0.2) -- slight offset above feet
    end
    return GetPedBoneCoords(ped, boneId, 0.0, 0.0, 0.0)
end

-- Move camera to a preset with smooth interpolation (bl_appearance pattern)
local function moveCamera(ped, preset)
    local newTarget = getBoneCoords(ped, preset)
    local newDist = CAMERA_DISTANCES[preset] or 1.8

    changingCam = true
    orbitDistance = newDist
    orbitAngleZ = GetEntityHeading(ped) + 180.0 -- face front of ped
    orbitTargetCoords = newTarget

    local ox, oy, oz = getOrbitOffset()

    -- Create new camera at destination (FOV matches stock illenium)
    local newCam = CreateCamWithParams("DEFAULT_SCRIPTED_CAMERA",
        newTarget.x + ox, newTarget.y + oy, newTarget.z + oz,
        0.0, 0.0, 0.0, CAM_FOV, false, 0)

    PointCamAtCoord(newCam, newTarget.x, newTarget.y, newTarget.z)

    -- Find previous camera to interp from (ours or stock illenium's)
    local prevCam = orbitCam or GetRenderingCam()
    if prevCam and prevCam ~= -1 and DoesCamExist(prevCam) then
        -- Smooth interp with easing (1,1 = ease location + rotation)
        SetCamActiveWithInterp(newCam, prevCam, 400, 1, 1)
        orbitOldCam = prevCam -- always track for cleanup
    else
        SetCamActive(newCam, true)
        RenderScriptCams(true, false, 0, true, true)
    end

    orbitCam = newCam

    -- Keep changingCam locked during interp to prevent jitter, unlock after
    SetTimeout(450, function()
        changingCam = false
        -- Destroy old cam after interp completes
        if orbitOldCam and orbitOldCam ~= orbitCam then
            DestroyCam(orbitOldCam, true)
            orbitOldCam = nil
        end
    end)
end

-- NUI callback: mouse drag adjusts orbit angles (event-driven, no thread)
RegisterNUICallback("murderface_rotate", function(data, cb)
    cb(1)
    if changingCam then return end
    local dx = tonumber(data.deltaX) or 0
    local dy = tonumber(data.deltaY) or 0

    orbitAngleZ = orbitAngleZ - dx * 0.3   -- horizontal orbit
    orbitAngleY = math.max(-20.0, math.min(89.0, orbitAngleY + dy * 0.3)) -- vertical, clamped

    updateCamPosition()
end)

-- NUI callback: scroll wheel adjusts zoom distance
RegisterNUICallback("murderface_zoom", function(data, cb)
    cb(1)
    local delta = tonumber(data.delta) or 0
    orbitDistance = math.max(0.3, math.min(3.0, orbitDistance + delta * 0.1))
    updateCamPosition()
end)

-- Override camera presets — just changes target + distance, orbit keeps working
RegisterNUICallback("appearance_set_camera", function(camera, cb)
    cb(1)
    local ped = PlayerPedId()
    moveCamera(ped, camera)
end)

-- Override save/exit to clean up orbital cameras (stock exitPlayerCustomization only destroys its own cameraHandle)
RegisterNUICallback("appearance_save", function(appearance, cb)
    cb(1)
    destroyOrbitCameras()
    client.wearClothes(appearance, "head")
    client.wearClothes(appearance, "body")
    client.wearClothes(appearance, "bottom")
    client.exitPlayerCustomization(appearance)
end)

RegisterNUICallback("appearance_exit", function(_, cb)
    cb(1)
    destroyOrbitCameras()
    client.exitPlayerCustomization()
end)

-- Clean up orbital cameras on resource stop (prevents leaks)
AddEventHandler("onResourceStop", function(resource)
    if resource == GetCurrentResourceName() then
        destroyOrbitCameras()
        FreezeEntityPosition(cache.ped, false)
    end
end)

-- Get shop costs + player cash balance for the UI
RegisterNUICallback("murderface_get_shop_info", function(_, cb)
    local shopType = currentShopType or "clothing"
    local cost = Config.ClothingCost or 100
    if shopType == "barber" then
        cost = Config.BarberCost or 100
    elseif shopType == "tattoo" then
        cost = Config.TattooCost or 100
    elseif shopType == "surgeon" then
        cost = Config.SurgeonCost or 100
    end

    -- Get player cash from QBX
    local cash = 0
    local player = exports.qbx_core:GetPlayerData()
    if player and player.money then
        cash = player.money.cash or 0
    end

    cb({
        shopType = shopType,
        cost = cost,
        cash = cash,
    })
end)
