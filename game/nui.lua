local client = client

-- ============ SHOP TYPE TRACKING ============
currentShopType = "clothing" -- Global: set by commands and OpenShop in client.lua

-- ============ ORBITAL CAMERA SYSTEM ============
-- Event-driven orbital camera. Presets change target + distance, drag always works.

local orbitAngleZ = 0.0
local orbitAngleY = 0.0
local orbitDistance = 1.8
local orbitTargetCoords = nil
local orbitCam = nil
local orbitOldCam = nil
local changingCam = false
local CAM_FOV = 49.0

local CAMERA_BONES = {
    default = 0,
    head    = 31086,    -- SKEL_Head
    body    = 24818,    -- SKEL_Spine3
    bottom  = 16335,    -- l_thigh
}

local CAMERA_DISTANCES = {
    default = 1.8,
    head    = 0.8,
    body    = 1.1,
    bottom  = 1.0,
}

local function getOrbitOffset()
    local radZ = math.rad(orbitAngleZ)
    local radY = math.rad(orbitAngleY)
    return
        math.cos(radZ) * math.cos(radY) * orbitDistance,
        math.sin(radZ) * math.cos(radY) * orbitDistance,
        math.sin(radY) * orbitDistance
end

local function updateCamPosition()
    if not orbitCam or not orbitTargetCoords or changingCam then return end
    local ox, oy, oz = getOrbitOffset()
    SetCamCoord(orbitCam, orbitTargetCoords.x + ox, orbitTargetCoords.y + oy, orbitTargetCoords.z + oz)
    PointCamAtCoord(orbitCam, orbitTargetCoords.x, orbitTargetCoords.y, orbitTargetCoords.z)
end

local function destroyOrbitCameras()
    if orbitCam then DestroyCam(orbitCam, true); orbitCam = nil end
    if orbitOldCam then DestroyCam(orbitOldCam, true); orbitOldCam = nil end
    RenderScriptCams(false, false, 0, true, true)
    orbitTargetCoords = nil
    changingCam = false
    orbitInitialized = false
end

local function getBoneCoords(ped, preset)
    local boneId = CAMERA_BONES[preset] or CAMERA_BONES.default
    if boneId == 0 then
        local coords = GetEntityCoords(ped)
        return vector3(coords.x, coords.y, coords.z + 0.2)
    end
    return GetPedBoneCoords(ped, boneId, 0.0, 0.0, 0.0)
end

local orbitInitialized = false

local function moveCamera(ped, preset)
    local newTarget = getBoneCoords(ped, preset)
    local newDist = CAMERA_DISTANCES[preset] or 1.8

    changingCam = true
    orbitDistance = newDist
    -- FMRP: Only set initial angle on first camera init, preserve user rotation on preset changes
    -- Math: GTA entity forward = (-sin(H), cos(H)), orbital offset = (cos(θ), sin(θ))
    -- Setting cos(θ)=-sin(H) and sin(θ)=cos(H) → θ = 90 + H (camera directly in front of ped face)
    if not orbitInitialized then
        orbitAngleZ = 90.0 + GetEntityHeading(ped)
        orbitAngleY = 0.0
        orbitInitialized = true
    end
    orbitTargetCoords = newTarget

    local ox, oy, oz = getOrbitOffset()
    local newCam = CreateCamWithParams("DEFAULT_SCRIPTED_CAMERA",
        newTarget.x + ox, newTarget.y + oy, newTarget.z + oz,
        0.0, 0.0, 0.0, CAM_FOV, false, 0)
    PointCamAtCoord(newCam, newTarget.x, newTarget.y, newTarget.z)

    local prevCam = orbitCam or GetRenderingCam()
    if prevCam and prevCam ~= -1 and DoesCamExist(prevCam) then
        SetCamActiveWithInterp(newCam, prevCam, 400, 1, 1)
        orbitOldCam = prevCam
    else
        SetCamActive(newCam, true)
        RenderScriptCams(true, false, 0, true, true)
    end

    orbitCam = newCam

    SetTimeout(450, function()
        changingCam = false
        if orbitOldCam and orbitOldCam ~= orbitCam then
            DestroyCam(orbitOldCam, true)
            orbitOldCam = nil
        end
    end)
end

-- ============ SLASH COMMANDS ============

local function openCustomization(conf, shopType)
    currentShopType = shopType or "clothing"
    local config = GetDefaultConfig()
    for k, v in pairs(conf) do config[k] = v end
    config.enableExit = true

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

RegisterCommand("clothing", function()
    openCustomization({ components = true, props = true }, "clothing")
end, false)

RegisterCommand("barber", function()
    openCustomization({ headOverlays = true }, "barber")
end, false)

RegisterCommand("tattoo", function()
    openCustomization({ tattoos = true }, "tattoo")
end, false)

RegisterCommand("outfits", function()
    openCustomization({ components = true, props = true }, "clothing")
end, false)

-- ============ MISSING ILLENIUM COMMANDS ============

RegisterCommand("reloadskin", function()
    TriggerEvent("illenium-appearance:client:reloadSkin", false)
end, false)

RegisterCommand("clearstuckprops", function()
    TriggerEvent("illenium-appearance:client:ClearStuckProps")
end, false)

RegisterCommand("pedmenu", function(_, args)
    local targetId = tonumber(args[1])
    if targetId then
        -- Admin: open full menu on target player (requires ace)
        TriggerServerEvent("illenium-appearance:server:openPedMenu", targetId)
    else
        openCustomization({
            ped = true,
            headBlend = true,
            faceFeatures = true,
            headOverlays = true,
            components = true,
            props = true,
            tattoos = true,
        }, "surgeon")
    end
end, true) -- ACE restricted

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

-- ============ uz_AutoShot INTEGRATION ============
-- Detects uz_AutoShot for clothing thumbnail images.
-- When available, the NUI uses cfx-nui URLs from AutoShot instead of the CDN fallback.
-- Credit: UZ (https://github.com/uz-scripts/uz_AutoShot) — awesome work!

local autoShotBase = nil

CreateThread(function()
    if GetResourceState('uz_AutoShot') == 'started' then
        local ok, url = pcall(exports['uz_AutoShot'].getShotsBaseURL, exports['uz_AutoShot'])
        if ok and url then
            autoShotBase = url
            local fmt = exports['uz_AutoShot']:getPhotoFormat() or 'png'
            autoShotBase = { url = url, format = fmt }
            print('^2[murderface-appearance]^0 uz_AutoShot detected — clothing thumbnails via cfx-nui')
        end
    end
end)

-- ============ NUI CALLBACKS ============

RegisterNUICallback("appearance_get_locales", function(_, cb)
    cb(Locales[GetConvar("illenium-appearance:locale", "en")].UI)
end)

RegisterNUICallback("appearance_get_settings", function(_, cb)
    Wait(250)
    local settings = client.getAppearanceSettings()
    cb({
        appearanceSettings = settings,
        autoShot = autoShotBase, -- nil if not installed, { url, format } if available
    })
end)

RegisterNUICallback("appearance_get_data", function(_, cb)
    Wait(250)
    local appearanceData = client.getAppearance()
    if appearanceData.tattoos then
        client.setPedTattoos(cache.ped, appearanceData.tattoos)
    end
    -- FMRP: Initialize orbital camera on NUI open (replaces old camera system)
    if not orbitCam then
        moveCamera(PlayerPedId(), "default")
    end
    cb({ config = client.getConfig(), appearanceData = appearanceData })
end)

RegisterNUICallback("appearance_set_camera", function(camera, cb)
    cb(1)
    moveCamera(PlayerPedId(), camera)
end)

RegisterNUICallback("appearance_turn_around", function(_, cb)
    cb(1)
    if not orbitCam or changingCam then return end
    orbitAngleZ = orbitAngleZ + 180.0
    updateCamPosition()
end)

RegisterNUICallback("murderface_rotate", function(data, cb)
    cb(1)
    if not orbitCam then return end -- FMRP: wait for orbital cam to be created
    local dx = tonumber(data.deltaX) or 0
    local dy = tonumber(data.deltaY) or 0
    orbitAngleZ = orbitAngleZ - dx * 0.3
    orbitAngleY = math.max(-20.0, math.min(89.0, orbitAngleY + dy * 0.3))
    updateCamPosition()
end)

RegisterNUICallback("murderface_zoom", function(data, cb)
    cb(1)
    local delta = tonumber(data.delta) or 0
    orbitDistance = math.max(0.3, math.min(3.0, orbitDistance + delta * 0.1))
    updateCamPosition()
end)

RegisterNUICallback("appearance_change_model", function(model, cb)
    local playerPed = client.setPlayerModel(model)

    SetEntityHeading(cache.ped, client.getHeading())
    SetEntityInvincible(playerPed, true)
    TaskStandStill(playerPed, -1)

    -- FMRP: Try loading saved appearance from DB for this model (prevents losing customization on model revert)
    local savedAppearance = lib.callback.await("illenium-appearance:server:getAppearance", false, model)
    if savedAppearance and savedAppearance.model == model then
        client.setPedAppearance(playerPed, savedAppearance)
        cb({
            appearanceSettings = client.getAppearanceSettings(),
            appearanceData = savedAppearance
        })
    else
        cb({
            appearanceSettings = client.getAppearanceSettings(),
            appearanceData = client.getPedAppearance(playerPed)
        })
    end
end)

RegisterNUICallback("appearance_change_component", function(component, cb)
    client.setPedComponent(cache.ped, component)
    cb(client.getComponentSettings(cache.ped, component.component_id))
end)

RegisterNUICallback("appearance_change_prop", function(prop, cb)
    client.setPedProp(cache.ped, prop)
    cb(client.getPropSettings(cache.ped, prop.prop_id))
end)

RegisterNUICallback("appearance_change_head_blend", function(headBlend, cb)
    cb(1)
    client.setPedHeadBlend(cache.ped, headBlend)
end)

RegisterNUICallback("appearance_change_face_feature", function(faceFeatures, cb)
    cb(1)
    client.setPedFaceFeatures(cache.ped, faceFeatures)
end)

RegisterNUICallback("appearance_change_head_overlay", function(headOverlays, cb)
    cb(1)
    client.setPedHeadOverlays(cache.ped, headOverlays)
end)

RegisterNUICallback("appearance_change_hair", function(hair, cb)
    client.setPedHair(cache.ped, hair)
    cb(client.getHairSettings(cache.ped))
end)

RegisterNUICallback("appearance_change_eye_color", function(eyeColor, cb)
    cb(1)
    client.setPedEyeColor(cache.ped, eyeColor)
end)

RegisterNUICallback("appearance_apply_tattoo", function(data, cb)
    -- Apply tattoo immediately, handle payment in background
    if data.updatedTattoos then
        client.setPedTattoos(cache.ped, data.updatedTattoos)
    end
    cb(true)
    -- Charge after cb to avoid blocking NUI
    if data.tattoo and Config.ChargePerTattoo then
        CreateThread(function()
            lib.callback.await("illenium-appearance:server:payForTattoo", false, data.tattoo)
        end)
    end
end)

RegisterNUICallback("appearance_preview_tattoo", function(previewTattoo, cb)
    cb(1)
    client.setPreviewTattoo(cache.ped, previewTattoo.data, previewTattoo.tattoo)
end)

RegisterNUICallback("appearance_delete_tattoo", function(data, cb)
    cb(1)
    client.setPedTattoos(cache.ped, data)
end)

RegisterNUICallback("appearance_wear_clothes", function(dataWearClothes, cb)
    cb(1)
    client.wearClothes(dataWearClothes.data, dataWearClothes.key)
end)

RegisterNUICallback("appearance_remove_clothes", function(clothes, cb)
    cb(1)
    client.removeClothes(clothes)
end)

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

-- ============ OUTFIT CALLBACKS ============

RegisterNUICallback("illenium-appearance:getOutfits", function(_, cb)
    local outfits = lib.callback.await("illenium-appearance:server:getOutfits", false)
    cb(outfits or {})
end)

RegisterNUICallback("illenium-appearance:saveOutfit", function(data, cb)
    TriggerServerEvent("illenium-appearance:server:saveOutfit", data.name, data.model, data.components, data.props)
    Wait(300)
    cb(1)
end)

RegisterNUICallback("illenium-appearance:deleteOutfit", function(id, cb)
    TriggerServerEvent("illenium-appearance:server:deleteOutfit", id)
    Wait(300)
    cb(1)
end)

RegisterNUICallback("illenium-appearance:generateOutfitCode", function(outfitId, cb)
    local code = lib.callback.await("illenium-appearance:server:generateOutfitCode", false, outfitId)
    cb(code or "")
end)

RegisterNUICallback("illenium-appearance:importOutfitCode", function(data, cb)
    local success = lib.callback.await("illenium-appearance:server:importOutfitCode", false, data.code, data.name)
    cb(success or false)
end)

RegisterNUICallback("illenium-appearance:renameOutfit", function(data, cb)
    cb(1)
end)

-- ============ LEGACY ROTATION (unused with orbital, kept for compat) ============

RegisterNUICallback("rotate_left", function(_, cb)
    cb(1)
    if orbitCam then
        orbitAngleZ = orbitAngleZ + 10.0
        updateCamPosition()
    end
end)

RegisterNUICallback("rotate_right", function(_, cb)
    cb(1)
    if orbitCam then
        orbitAngleZ = orbitAngleZ - 10.0
        updateCamPosition()
    end
end)

-- ============ SHOP INFO ============

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

    local cash = 0
    local player = exports.qbx_core:GetPlayerData()
    if player and player.money then
        cash = player.money.cash or 0
    end

    cb({ shopType = shopType, cost = cost, cash = cash })
end)

RegisterNUICallback("get_theme_configuration", function(_, cb)
    cb(Config.Theme)
end)

-- ============ CLEANUP ============

AddEventHandler("onResourceStop", function(resource)
    if resource == GetCurrentResourceName() then
        destroyOrbitCameras()
        if cache.ped and DoesEntityExist(cache.ped) then
            FreezeEntityPosition(cache.ped, false)
        end
    end
end)
