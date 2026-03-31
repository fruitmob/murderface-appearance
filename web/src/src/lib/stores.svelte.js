/**
 * Reactive stores for murderface-appearance
 * Manages all appearance state and NUI communication
 */
import { fetchNui } from './nui.js';

// Component ID → human-readable name + illenium config key
export const COMPONENT_MAP = {
  0: { name: 'Head', configKey: null },         // Not shown in UI
  1: { name: 'Masks', configKey: 'masks' },
  2: { name: 'Hair', configKey: null },         // Handled by barber
  3: { name: 'Arms', configKey: 'upperBody' },
  4: { name: 'Pants', configKey: 'lowerBody' },
  5: { name: 'Bags', configKey: 'bags' },
  6: { name: 'Shoes', configKey: 'shoes' },
  7: { name: 'Chains', configKey: 'scarfAndChains' },
  8: { name: 'Undershirt', configKey: 'shirts' },
  9: { name: 'Body Armor', configKey: 'bodyArmor' },
  10: { name: 'Decals', configKey: 'decals' },
  11: { name: 'Jackets', configKey: 'jackets' },
};

export const PROP_MAP = {
  0: { name: 'Hats', configKey: 'hats' },
  1: { name: 'Glasses', configKey: 'glasses' },
  2: { name: 'Ear', configKey: 'ear' },
  6: { name: 'Watches', configKey: 'watches' },
  7: { name: 'Bracelets', configKey: 'bracelets' },
};

// All possible category definitions — filtered at runtime by componentConfig/propConfig
const ALL_CATEGORIES = [
  { name: 'Tops', type: 'component', ids: [11, 8, 3], configKeys: ['jackets', 'shirts', 'upperBody'] },
  { name: 'Pants', type: 'component', ids: [4], configKeys: ['lowerBody'] },
  { name: 'Shoes', type: 'component', ids: [6], configKeys: ['shoes'] },
  { name: 'Hats', type: 'prop', ids: [0], configKeys: ['hats'] },
  { name: 'Glasses', type: 'prop', ids: [1], configKeys: ['glasses'] },
  { name: 'Masks', type: 'component', ids: [1], configKeys: ['masks'] },
  { name: 'Bags', type: 'component', ids: [5], configKeys: ['bags'] },
  { name: 'Armor', type: 'component', ids: [9], configKeys: ['bodyArmor'] },
  { name: 'Accessories', type: 'mixed', componentIds: [7, 10], propIds: [2, 6, 7], configKeys: ['scarfAndChains', 'decals', 'ear', 'watches', 'bracelets'] },
];

/**
 * Build active categories from illenium config (componentConfig + propConfig)
 * Filters out categories where ALL component/prop keys are disabled
 */
export function getActiveCategories(componentConfig, propConfig) {
  if (!componentConfig && !propConfig) return ALL_CATEGORIES;

  return ALL_CATEGORIES.filter(cat => {
    if (cat.type === 'component') {
      return cat.configKeys.some(key => !componentConfig || componentConfig[key] !== false);
    }
    if (cat.type === 'prop') {
      return cat.configKeys.some(key => !propConfig || propConfig[key] !== false);
    }
    // mixed — show if any component OR prop key is enabled
    const hasComp = cat.configKeys.some(key => {
      if (key in (componentConfig || {})) return componentConfig[key] !== false;
      if (key in (propConfig || {})) return propConfig[key] !== false;
      return true;
    });
    return hasComp;
  });
}

/**
 * Create the main appearance store
 * Uses Svelte 5 $state runes for reactivity
 */
export function createAppearanceStore() {
  let visible = $state(false);
  let loading = $state(false);
  let config = $state(null);
  let settings = $state(null);
  let appearance = $state(null);
  let originalAppearance = $state(null);
  let theme = $state(null);
  let locales = $state(null);
  let categories = $state(ALL_CATEGORIES);
  let shopInfo = $state({ shopType: 'clothing', cost: 0, cash: 0 });

  // Current UI state
  let activeCategory = $state('Tops');
  let selectedDrawable = $state({});  // { [componentId|propId]: drawableIndex }
  let currentTexture = $state({});    // { [componentId|propId]: textureIndex }
  let maxDrawable = $state({});       // { [componentId|propId]: max }
  let maxTexture = $state({});        // { [componentId|propId]: max }
  let activeCamera = $state('default');

  return {
    // Getters
    get visible() { return visible; },
    get loading() { return loading; },
    get config() { return config; },
    get settings() { return settings; },
    get appearance() { return appearance; },
    get theme() { return theme; },
    get locales() { return locales; },
    get activeCategory() { return activeCategory; },
    get selectedDrawable() { return selectedDrawable; },
    get currentTexture() { return currentTexture; },
    get maxDrawable() { return maxDrawable; },
    get maxTexture() { return maxTexture; },
    get activeCamera() { return activeCamera; },
    get categories() { return categories; },
    get shopInfo() { return shopInfo; },

    // Setters
    set activeCategory(val) { activeCategory = val; },
    set activeCamera(val) { activeCamera = val; },

    // ---- LIFECYCLE ----

    async show() {
      visible = true;
      loading = true;
      try {
        const [loc, settingsRes, dataRes, themeRes] = await Promise.all([
          fetchNui('appearance_get_locales'),
          fetchNui('appearance_get_settings'),
          fetchNui('appearance_get_data'),
          fetchNui('get_theme_configuration'),
        ]);
        locales = loc;
        settings = settingsRes?.appearanceSettings || settingsRes;
        config = dataRes?.config;
        appearance = dataRes?.appearanceData;
        originalAppearance = JSON.parse(JSON.stringify(appearance));

        // Build categories from illenium config (respect disabled components/props)
        categories = getActiveCategories(
          config?.componentConfig,
          config?.propConfig
        );
        // Reset active category to first available
        if (categories.length > 0 && !categories.find(c => c.name === activeCategory)) {
          activeCategory = categories[0].name;
        }

        // Get shop costs + player balance
        try {
          const info = await fetchNui('murderface_get_shop_info');
          if (info) shopInfo = info;
        } catch (_) {
          // Non-critical — keep defaults
        }
        theme = themeRes;

        // Initialize drawable/texture state from current appearance
        if (appearance?.components) {
          for (const comp of appearance.components) {
            selectedDrawable[`c_${comp.component_id}`] = comp.drawable;
            currentTexture[`c_${comp.component_id}`] = comp.texture;
          }
        }
        if (appearance?.props) {
          for (const prop of appearance.props) {
            selectedDrawable[`p_${prop.prop_id}`] = prop.drawable;
            currentTexture[`p_${prop.prop_id}`] = prop.texture;
          }
        }

        // Initialize max values from settings
        if (settings?.components) {
          for (const comp of settings.components) {
            maxDrawable[`c_${comp.component_id}`] = comp.drawable?.max || 0;
            maxTexture[`c_${comp.component_id}`] = comp.texture?.max || 0;
          }
        }
        if (settings?.props) {
          for (const prop of settings.props) {
            maxDrawable[`p_${prop.prop_id}`] = prop.drawable?.max || 0;
            maxTexture[`p_${prop.prop_id}`] = prop.texture?.max || 0;
          }
        }
      } catch (e) {
        console.error('[murderface] Failed to load appearance data:', e);
      }
      loading = false;
    },

    hide() {
      visible = false;
    },

    // ---- COMPONENT CHANGES ----

    async changeComponent(componentId, drawable, texture = 0) {
      const key = `c_${componentId}`;
      selectedDrawable[key] = drawable;
      currentTexture[key] = texture;

      // Update appearance state
      if (appearance?.components) {
        const comp = appearance.components.find(c => c.component_id === componentId);
        if (comp) {
          comp.drawable = drawable;
          comp.texture = texture;
        }
      }

      // Send to game
      const result = await fetchNui('appearance_change_component', {
        component_id: componentId,
        drawable,
        texture,
      });

      // Update max texture from response
      if (result?.texture) {
        maxTexture[key] = result.texture.max || 0;
      }
      if (result?.drawable) {
        maxDrawable[key] = result.drawable.max || 0;
      }

      return result;
    },

    async changeProp(propId, drawable, texture = 0) {
      const key = `p_${propId}`;
      selectedDrawable[key] = drawable;
      currentTexture[key] = texture;

      if (appearance?.props) {
        const prop = appearance.props.find(p => p.prop_id === propId);
        if (prop) {
          prop.drawable = drawable;
          prop.texture = texture;
        }
      }

      const result = await fetchNui('appearance_change_prop', {
        prop_id: propId,
        drawable,
        texture,
      });

      if (result?.texture) {
        maxTexture[key] = result.texture.max || 0;
      }
      if (result?.drawable) {
        maxDrawable[key] = result.drawable.max || 0;
      }

      return result;
    },

    async changeTexture(type, id, texture) {
      const key = `${type}_${id}`;
      currentTexture[key] = texture;

      if (type === 'c') {
        return this.changeComponent(id, selectedDrawable[key], texture);
      } else {
        return this.changeProp(id, selectedDrawable[key], texture);
      }
    },

    // ---- HAIR ----

    async changeHair(hair) {
      if (appearance) {
        appearance.hair = { ...appearance.hair, ...hair };
      }
      return fetchNui('appearance_change_hair', appearance?.hair || hair);
    },

    // ---- FACE ----

    async changeHeadBlend(headBlend) {
      if (appearance) {
        appearance.headBlend = { ...appearance.headBlend, ...headBlend };
      }
      return fetchNui('appearance_change_head_blend', appearance?.headBlend || headBlend);
    },

    async changeFaceFeature(faceFeatures) {
      if (appearance) {
        appearance.faceFeatures = { ...appearance.faceFeatures, ...faceFeatures };
      }
      return fetchNui('appearance_change_face_feature', appearance?.faceFeatures || faceFeatures);
    },

    async changeHeadOverlay(headOverlays) {
      if (appearance) {
        appearance.headOverlays = { ...appearance.headOverlays, ...headOverlays };
      }
      return fetchNui('appearance_change_head_overlay', appearance?.headOverlays || headOverlays);
    },

    // ---- EYE COLOR ----

    async changeEyeColor(eyeColor) {
      if (appearance) {
        appearance.eyeColor = eyeColor;
      }
      return fetchNui('appearance_change_eye_color', eyeColor);
    },

    // ---- TATTOOS ----

    async applyTattoo(tattoo, updatedTattoos) {
      return fetchNui('appearance_apply_tattoo', { tattoo, updatedTattoos });
    },

    async previewTattoo(data, tattoo) {
      return fetchNui('appearance_preview_tattoo', { data, tattoo });
    },

    async deleteTattoo(data) {
      return fetchNui('appearance_delete_tattoo', data);
    },

    // ---- OUTFITS ----

    async wearClothes(data, key) {
      return fetchNui('appearance_wear_clothes', { data, key });
    },

    async removeClothes(clothes) {
      return fetchNui('appearance_remove_clothes', clothes);
    },

    // ---- CAMERA ----

    async setCamera(camera) {
      activeCamera = camera;
      return fetchNui('appearance_set_camera', camera);
    },

    async rotateLeft() { return fetchNui('rotate_left'); },
    async rotateRight() { return fetchNui('rotate_right'); },
    async turnAround() { return fetchNui('appearance_turn_around'); },

    // ---- MODEL ----

    async changeModel(model) {
      const result = await fetchNui('appearance_change_model', model);
      if (result) {
        settings = result.appearanceSettings || settings;
        appearance = result.appearanceData || appearance;
      }
      return result;
    },

    // ---- SAVE / EXIT ----

    async save() {
      await fetchNui('appearance_save', appearance);
      visible = false;
    },

    async exit() {
      await fetchNui('appearance_exit');
      visible = false;
    },

    // ---- HELPERS ----

    getItemsForCategory(categoryName) {
      const cat = categories.find(c => c.name === categoryName);
      if (!cat) return [];

      const items = [];

      if (cat.type === 'component' || cat.type === 'mixed') {
        const compIds = cat.ids || cat.componentIds || [];
        for (const id of compIds) {
          const key = `c_${id}`;
          const max = maxDrawable[key] || 0;
          for (let d = 0; d <= max; d++) {
            items.push({
              type: 'component',
              id,
              drawable: d,
              key: `c_${id}_${d}`,
              label: `${COMPONENT_MAP[id]?.name || 'Item'} ${d + 1}`,
              isSelected: selectedDrawable[key] === d,
              texture: currentTexture[key] || 0,
              maxTexture: maxTexture[key] || 0,
            });
          }
        }
      }

      if (cat.type === 'prop' || cat.type === 'mixed') {
        const propIds = cat.ids || cat.propIds || [];
        for (const id of propIds) {
          const key = `p_${id}`;
          const max = maxDrawable[key] || 0;
          // Props start at -1 (none)
          for (let d = 0; d <= max; d++) {
            items.push({
              type: 'prop',
              id,
              drawable: d,
              key: `p_${id}_${d}`,
              label: `${PROP_MAP[id]?.name || 'Item'} ${d + 1}`,
              isSelected: selectedDrawable[key] === d,
              texture: currentTexture[key] || 0,
              maxTexture: maxTexture[key] || 0,
            });
          }
        }
      }

      return items;
    },

    getSelectedItem() {
      // Find the currently selected item in the active category
      const cat = CATEGORIES.find(c => c.name === activeCategory);
      if (!cat) return null;

      const ids = cat.ids || cat.componentIds || [];
      const type = cat.type === 'prop' ? 'p' : 'c';

      for (const id of ids) {
        const key = `${type}_${id}`;
        const drawable = selectedDrawable[key];
        if (drawable !== undefined && drawable >= 0) {
          return {
            type: type === 'c' ? 'component' : 'prop',
            id,
            drawable,
            texture: currentTexture[key] || 0,
            maxTexture: maxTexture[key] || 0,
            label: type === 'c'
              ? `${COMPONENT_MAP[id]?.name || 'Item'} ${drawable + 1}`
              : `${PROP_MAP[id]?.name || 'Item'} ${drawable + 1}`,
          };
        }
      }
      return null;
    },
  };
}
