/**
 * NUI Communication Layer for murderface-appearance
 * Handles fetch calls to illenium-appearance Lua backend
 * and incoming window messages from the game.
 */

const isDev = !window.GetParentResourceName;

/**
 * Get the FiveM resource name (or fallback for dev)
 */
function getResourceName() {
  if (isDev) return 'illenium-appearance';
  return window.GetParentResourceName();
}

/**
 * Send a NUI callback to the Lua backend.
 * Maps to RegisterNUICallback handlers in game/nui.lua
 * @param {string} event - callback name (e.g. 'appearance_get_data')
 * @param {any} data - payload to send
 * @returns {Promise<any>} - response from Lua
 */
export async function fetchNui(event, data = {}) {
  if (isDev) {
    console.log(`[NUI DEV] ${event}`, data);
    return getMockResponse(event, data);
  }

  const url = `https://${getResourceName()}/${event}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Listen for NUI messages from the Lua backend.
 * Maps to SendNuiMessage calls in game/customization.lua
 * @param {string} type - message type (e.g. 'appearance_display')
 * @param {function} handler - callback function
 * @returns {function} - cleanup function to remove listener
 */
export function onNuiMessage(type, handler) {
  const listener = (event) => {
    if (event.data?.type === type) {
      handler(event.data.payload || event.data);
    }
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}

/**
 * Dev mode: mock responses for testing without FiveM
 */
function getMockResponse(event, data) {
  switch (event) {
    case 'appearance_get_locales':
      return { /* locale strings would go here */ };

    case 'appearance_get_settings':
      return { appearanceSettings: getMockSettings() };

    case 'appearance_get_data':
      return { config: getMockConfig(), appearanceData: getMockAppearance() };

    case 'get_theme_configuration':
      return {
        borderRadius: '12px',
        fontColor: '255, 255, 255',
        fontColorHover: '255, 255, 255',
        fontColorSelected: '0, 255, 235',
        fontFamily: 'Inter',
        primaryBackground: '0, 200, 180',
        primaryBackgroundSelected: '0, 180, 160',
        secondaryBackground: '20, 20, 30',
        scaleOnHover: true,
        sectionFontWeight: 'bold',
        smoothBackgroundTransition: true,
      };

    case 'appearance_change_component':
    case 'appearance_change_prop':
      return {
        ...data,
        drawable: { min: 0, max: 15 },
        texture: { min: 0, max: 5 },
        blacklist: { drawables: {}, textures: {} },
      };

    case 'appearance_change_hair':
      return {
        style: { min: 0, max: 30 },
        color: { items: [] },
        highlight: { items: [] },
        texture: { min: 0, max: 5 },
        blacklist: {},
      };

    default:
      return 1;
  }
}

function getMockConfig() {
  return {
    ped: true,
    headBlend: true,
    faceFeatures: true,
    headOverlays: true,
    components: true,
    componentConfig: {
      masks: true, upperBody: true, lowerBody: true, bags: true,
      shoes: true, scarfAndChains: true, bodyArmor: true,
      shirts: true, decals: true, jackets: true,
    },
    props: true,
    propConfig: {
      hats: true, glasses: true, ear: true, watches: true, bracelets: true,
    },
    tattoos: true,
    enableExit: true,
  };
}

function getMockSettings() {
  const mkRange = (min, max) => ({ min, max });
  return {
    ped: { model: {
      items: [
        'mp_m_freemode_01', 'mp_f_freemode_01',
        // Animals
        'a_c_boar', 'a_c_cat_01', 'a_c_chimp', 'a_c_chop', 'a_c_chop_02',
        'a_c_cow', 'a_c_coyote', 'a_c_crow', 'a_c_deer', 'a_c_hen',
        'a_c_husky', 'a_c_mtlion', 'a_c_panther', 'a_c_pig', 'a_c_pigeon',
        'a_c_poodle', 'a_c_pug', 'a_c_rabbit_01', 'a_c_rat', 'a_c_retriever',
        'a_c_rottweiler', 'a_c_seagull', 'a_c_shepherd', 'a_c_westy',
        // Civilians
        'a_f_m_beach_01', 'a_f_m_bevhills_01', 'a_f_m_bodybuild_01',
        'a_f_m_business_02', 'a_f_m_downtown_01', 'a_f_m_eastsa_01',
        'a_m_m_beach_01', 'a_m_m_bevhills_01', 'a_m_m_business_01',
        'a_m_m_farmer_01', 'a_m_m_fatlatin_01', 'a_m_m_genfat_01',
        'a_m_m_golfer_01', 'a_m_m_hillbilly_01', 'a_m_m_indian_01',
        'a_m_m_malibu_01', 'a_m_m_mexcntry_01', 'a_m_m_og_boss_01',
        'a_m_m_paparazzi_01', 'a_m_m_polynesian_01', 'a_m_m_prolhost_01',
        'a_m_m_rurmeth_01', 'a_m_m_salton_01', 'a_m_m_skater_01',
        'a_m_m_socenlat_01', 'a_m_m_stlat_02', 'a_m_m_tourist_01',
        'a_m_m_tramp_01', 'a_m_m_tranvest_01', 'a_m_m_tranvest_02',
        // Services
        's_m_y_cop_01', 's_f_y_cop_01', 's_m_y_sheriff_01',
        's_m_m_doctor_01', 's_m_y_fireman_01', 's_m_y_paramedic_01',
        's_m_y_pilot_01', 's_m_y_swat_01', 's_m_m_bouncer_01',
        's_m_y_clown_01', 's_m_y_garbage', 's_m_y_mime',
        // Story characters
        'ig_abigail', 'ig_amandatownley', 'ig_andreas', 'ig_ballasog',
        'ig_bankman', 'ig_barry', 'ig_bestmen', 'ig_beverly',
        'ig_brad', 'ig_claypain', 'ig_clay', 'ig_dale',
        'ig_davenorton', 'ig_denise', 'ig_devin', 'ig_dom',
        'ig_dreyfuss', 'ig_drfriedlander', 'ig_fabien', 'ig_floyd',
        'ig_hao', 'ig_janet', 'ig_jay_norris', 'ig_jimmydisanto',
        'ig_johnnyklebitz', 'ig_josef', 'ig_karen_daniels', 'ig_kerrymcintosh',
        'ig_lamardavis', 'ig_lazlow', 'ig_lifeinvad_01', 'ig_lifeinvad_02',
        'ig_magenta', 'ig_manuel', 'ig_marnie', 'ig_maryann',
        'ig_michelle', 'ig_milton', 'ig_molly', 'ig_mrk',
        'ig_nervousron', 'ig_nigel', 'ig_old_man1a', 'ig_old_man2',
        'ig_omega', 'ig_orleans', 'ig_ortega', 'ig_paper',
        'ig_patricia', 'ig_priest', 'ig_prolsec_02', 'ig_ramp_gang',
        'ig_roccopelosi', 'ig_russiandrunk', 'ig_screen_writer',
        'ig_siemonyetarian', 'ig_solomon', 'ig_stevehains',
        'ig_stretch', 'ig_talina', 'ig_tanisha', 'ig_taocheng',
        'ig_taostranslator', 'ig_tenniscoach', 'ig_terry', 'ig_tomepsilon',
        'ig_tracydisanto', 'ig_tylerdix', 'ig_wade', 'ig_zimbor',
        // Player models
        'player_one', 'player_two', 'player_zero',
      ],
    } },
    components: Array.from({ length: 12 }, (_, i) => ({
      component_id: i,
      drawable: mkRange(0, 10 + i),
      texture: mkRange(0, 4),
      blacklist: { drawables: {}, textures: {} },
    })),
    props: [0, 1, 2, 6, 7].map(id => ({
      prop_id: id,
      drawable: mkRange(-1, 8),
      texture: mkRange(-1, 3),
      blacklist: {},
    })),
    hair: {
      style: mkRange(0, 30),
      color: { items: [] },
      highlight: { items: [] },
      texture: mkRange(0, 5),
      blacklist: {},
    },
    headOverlays: [
      { id: 'blemishes', style: mkRange(0, 23) },
      { id: 'beard', style: mkRange(0, 28) },
      { id: 'eyebrows', style: mkRange(0, 33) },
      { id: 'ageing', style: mkRange(0, 14) },
      { id: 'makeUp', style: mkRange(0, 74) },
      { id: 'blush', style: mkRange(0, 6) },
      { id: 'complexion', style: mkRange(0, 11) },
      { id: 'sunDamage', style: mkRange(0, 10) },
      { id: 'lipstick', style: mkRange(0, 9) },
      { id: 'moleAndFreckles', style: mkRange(0, 17) },
      { id: 'chestHair', style: mkRange(0, 16) },
      { id: 'bodyBlemishes', style: mkRange(0, 11) },
    ],
    eyeColor: mkRange(0, 30),
  };
}

function getMockAppearance() {
  return {
    model: 'mp_m_freemode_01',
    headBlend: {
      shapeFirst: 0, shapeSecond: 0, shapeThird: 0,
      skinFirst: 0, skinSecond: 0, skinThird: 0,
      shapeMix: 0.5, skinMix: 0.5, thirdMix: 0,
    },
    faceFeatures: Object.fromEntries(
      ['noseWidth','nosePeakHigh','nosePeakSize','noseBoneHigh','nosePeakLowering',
       'noseBoneTwist','eyeBrownHigh','eyeBrownForward','cheeksBoneHigh','cheeksBoneWidth',
       'cheeksWidth','eyesOpening','lipsThickness','jawBoneWidth','jawBoneBackSize',
       'chinBoneLowering','chinBoneLenght','chinBoneSize','chinHole','neckThickness']
        .map(k => [k, 0])
    ),
    headOverlays: {},
    components: Array.from({ length: 12 }, (_, i) => ({
      component_id: i, drawable: 0, texture: 0,
    })),
    props: [0, 1, 2, 6, 7].map(id => ({
      prop_id: id, drawable: -1, texture: -1,
    })),
    hair: { style: 0, color: 0, highlight: 0, texture: 0 },
    tattoos: {},
    eyeColor: 0,
  };
}
