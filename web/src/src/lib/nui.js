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
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
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
