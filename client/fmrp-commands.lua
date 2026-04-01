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
-- Camera orbits around stationary ped using spherical coordinates

local orbitAngleZ = 0.0      -- horizontal yaw (radians)
local orbitAngleY = 0.15     -- vertical pitch (radians), slight upward look
local orbitDistance = 2.2     -- zoom distance
local orbitTargetZ = 0.2     -- target point Z offset from ped root
local orbitCamActive = false
local orbitCam = nil

-- Camera presets: bone offset + distance + pitch
local ORBIT_PRESETS = {
    default = { z = 0.2,  dist = 2.2, pitch = 0.15 },
    head    = { z = 0.65, dist = 0.9, pitch = 0.10 },
    body    = { z = 0.2,  dist = 1.2, pitch = 0.12 },
    bottom  = { z = -0.7, dist = 1.0, pitch = -0.15 },
}

local function startOrbitCamera()
    if orbitCamActive then return end
    orbitCamActive = true

    local ped = PlayerPedId()
    local pedCoords = GetEntityCoords(ped)

    orbitCam = CreateCam("DEFAULT_SCRIPTED_CAMERA", true)
    SetCamActive(orbitCam, true)
    RenderScriptCams(true, false, 0, true, true)

    CreateThread(function()
        while orbitCamActive do
            ped = PlayerPedId()
            pedCoords = GetEntityCoords(ped)

            -- Spherical to cartesian
            local camX = pedCoords.x + orbitDistance * math.cos(orbitAngleY) * math.sin(orbitAngleZ)
            local camY = pedCoords.y + orbitDistance * math.cos(orbitAngleY) * math.cos(orbitAngleZ)
            local camZ = pedCoords.z + orbitTargetZ + orbitDistance * math.sin(orbitAngleY)

            SetCamCoord(orbitCam, camX, camY, camZ)
            PointCamAtCoord(orbitCam, pedCoords.x, pedCoords.y, pedCoords.z + orbitTargetZ)

            Wait(0)
        end
    end)
end

local function stopOrbitCamera()
    orbitCamActive = false
    if orbitCam then
        DestroyCam(orbitCam, false)
        orbitCam = nil
    end
end

-- NUI callback: mouse drag adjusts orbit angles
RegisterNUICallback("murderface_rotate", function(data, cb)
    cb(1)
    local dx = tonumber(data.deltaX) or tonumber(data.delta) or 0
    local dy = tonumber(data.deltaY) or 0

    -- Horizontal orbit (yaw)
    orbitAngleZ = orbitAngleZ - dx * 0.008  -- FMRP: inverted for natural drag direction

    -- Vertical orbit (pitch) — clamp to avoid flipping
    orbitAngleY = math.max(-0.8, math.min(0.8, orbitAngleY - dy * 0.005))  -- FMRP: inverted
end)

-- NUI callback: scroll wheel adjusts zoom distance
RegisterNUICallback("murderface_zoom", function(data, cb)
    cb(1)
    local delta = tonumber(data.delta) or 0
    orbitDistance = math.max(0.5, math.min(4.0, orbitDistance + delta * 0.15))
end)

-- Override camera presets to work with orbital system
RegisterNUICallback("appearance_set_camera", function(camera, cb)
    cb(1)
    local preset = ORBIT_PRESETS[camera] or ORBIT_PRESETS.default
    orbitTargetZ = preset.z
    orbitDistance = preset.dist
    orbitAngleY = preset.pitch

    -- Start orbital camera if not yet running
    if not orbitCamActive then
        startOrbitCamera()
    end
end)

-- Hook into customization lifecycle to start/stop orbital camera
AddEventHandler("murderface-appearance:startOrbit", startOrbitCamera)
AddEventHandler("murderface-appearance:stopOrbit", stopOrbitCamera)

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
