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

// Individual category tabs — BL/illenium order
const ALL_CATEGORIES = [
  { name: 'Hats',       type: 'prop',      ids: [0],  configKeys: ['hats'] },
  { name: 'Masks',      type: 'component', ids: [1],  configKeys: ['masks'] },
  { name: 'Jackets',    type: 'component', ids: [11], configKeys: ['jackets'] },
  { name: 'Shirts',     type: 'component', ids: [8],  configKeys: ['shirts'] },
  { name: 'Arms',       type: 'component', ids: [3],  configKeys: ['upperBody'] },
  { name: 'Pants',      type: 'component', ids: [4],  configKeys: ['lowerBody'] },
  { name: 'Bags',       type: 'component', ids: [5],  configKeys: ['bags'] },
  { name: 'Shoes',      type: 'component', ids: [6],  configKeys: ['shoes'] },
  { name: 'Chains',     type: 'component', ids: [7],  configKeys: ['scarfAndChains'] },
  { name: 'Armor',      type: 'component', ids: [9],  configKeys: ['bodyArmor'] },
  { name: 'Decals',     type: 'component', ids: [10], configKeys: ['decals'] },
  { name: 'Glasses',    type: 'prop',      ids: [1],  configKeys: ['glasses'] },
  { name: 'Ears',       type: 'prop',      ids: [2],  configKeys: ['ear'] },
  { name: 'Watches',    type: 'prop',      ids: [6],  configKeys: ['watches'] },
  { name: 'Bracelets',  type: 'prop',      ids: [7],  configKeys: ['bracelets'] },
];

// CDN image URL for clothing screenshots (FiveManage R2)
const CDN_BASE = 'https://r2.fivemanage.com/UCYQxfFhJPgMhBGb0n0lw/UUID98670F42-F5F8-FFC2-61B0-23158C758820';

export function getClothingImageUrl(type, id, drawable, gender) {
  const g = gender === 1 ? 'female' : 'male';
  const t = type === 'component' ? 'Clothing' : 'Accessories';
  return `${CDN_BASE}_${g}_${t}_${id}_${drawable}.webp?v=9999`;
}

/**
 * Build active categories from illenium config (componentConfig + propConfig)
 * Filters out categories where ALL component/prop keys are disabled
 */
export function getActiveCategories(componentConfig, propConfig) {
  if (!componentConfig && !propConfig) return ALL_CATEGORIES;

  return ALL_CATEGORIES.filter(cat => {
    const cfgMap = cat.type === 'prop' ? propConfig : componentConfig;
    return cat.configKeys.some(key => !cfgMap || cfgMap[key] !== false);
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
  let activeCategory = $state('Hats');
  let searchQuery = $state('');
  let selectedDrawable = $state({});  // { [componentId|propId]: drawableIndex }
  let currentTexture = $state({});    // { [componentId|propId]: textureIndex }
  let maxDrawable = $state({});       // { [componentId|propId]: max }
  let maxTexture = $state({});        // { [componentId|propId]: max }
  let activeCamera = $state('default');
  let gender = $state(0);            // 0 = male, 1 = female (from ped model)

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
    get gender() { return gender; },
    get searchQuery() { return searchQuery; },

    // Setters
    set activeCategory(val) { activeCategory = val; },
    set activeCamera(val) { activeCamera = val; },
    set searchQuery(val) { searchQuery = val; },

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

        // Detect gender from appearance model
        if (appearance?.model) {
          gender = (appearance.model === 'mp_f_freemode_01') ? 1 : 0;
        } else if (appearance?.sex !== undefined) {
          gender = appearance.sex;
        }

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

    async reset() {
      if (!originalAppearance) return;
      // Restore all components to original
      if (originalAppearance.components) {
        for (const comp of originalAppearance.components) {
          await this.changeComponent(comp.component_id, comp.drawable, comp.texture);
        }
      }
      // Restore all props to original
      if (originalAppearance.props) {
        for (const prop of originalAppearance.props) {
          await this.changeProp(prop.prop_id, prop.drawable, prop.texture);
        }
      }
    },

    // ---- HELPERS ----

    getItemsForCategory(categoryName) {
      const cat = categories.find(c => c.name === categoryName);
      if (!cat) return [];

      const prefix = cat.type === 'prop' ? 'p' : 'c';
      const map = cat.type === 'prop' ? PROP_MAP : COMPONENT_MAP;
      const items = [];
      const query = searchQuery.toLowerCase();

      for (const id of cat.ids) {
        const key = `${prefix}_${id}`;
        const max = maxDrawable[key] || 0;
        for (let d = 0; d <= max; d++) {
          const label = `${map[id]?.name || 'Item'} ${d + 1}`;
          if (query && !label.toLowerCase().includes(query)) continue;
          items.push({
            type: cat.type,
            id,
            drawable: d,
            key: `${prefix}_${id}_${d}`,
            label,
            isSelected: selectedDrawable[key] === d,
            texture: currentTexture[key] || 0,
            maxTexture: maxTexture[key] || 0,
          });
        }
      }

      return items;
    },

    getSelectedItem() {
      const cat = categories.find(c => c.name === activeCategory);
      if (!cat) return null;

      const prefix = cat.type === 'prop' ? 'p' : 'c';
      const map = cat.type === 'prop' ? PROP_MAP : COMPONENT_MAP;

      for (const id of cat.ids) {
        const key = `${prefix}_${id}`;
        const drawable = selectedDrawable[key];
        if (drawable !== undefined && drawable >= 0) {
          return {
            type: cat.type,
            id,
            drawable,
            texture: currentTexture[key] || 0,
            maxTexture: maxTexture[key] || 0,
            label: `${map[id]?.name || 'Item'} ${drawable + 1}`,
          };
        }
      }
      return null;
    },
  };
}
