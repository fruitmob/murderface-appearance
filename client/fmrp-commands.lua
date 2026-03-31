-- FMRP: Admin commands + smooth camera controls + shop info for murderface-appearance

-- /appearance command - opens full customization
RegisterCommand("appearance", function()
    local config = {
        ped = true,
        headBlend = true,
        faceFeatures = true,
        headOverlays = true,
        components = true,
        props = true,
        tattoos = true,
        enableExit = true,
    }
    exports["illenium-appearance"]:startPlayerCustomization(function(appearance)
        if appearance then
            TriggerServerEvent("illenium-appearance:server:saveAppearance", appearance)
        end
    end, config)
end, false)

-- /reloadskin command
RegisterCommand("reloadskin", function()
    TriggerServerEvent("illenium-appearance:server:loadAppearance")
end, false)

-- Smooth mouse drag rotation (called from NUI)
RegisterNUICallback("murderface_rotate", function(data, cb)
    cb(1)
    local ped = PlayerPedId()
    local delta = tonumber(data.delta) or 0
    local currentHeading = GetEntityHeading(ped)
    SetEntityHeading(ped, currentHeading + delta)
end)

-- Get shop costs + player cash balance for the UI
RegisterNUICallback("murderface_get_shop_info", function(_, cb)
    local shopType = client.getShopType and client.getShopType() or "clothing"
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
