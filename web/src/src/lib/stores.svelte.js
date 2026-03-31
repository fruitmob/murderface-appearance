/**
 * Reactive stores for murderface-appearance
 * Manages all appearance state and NUI communication
 */
import { fetchNui } from './nui.js';

// Component ID → human-readable category mapping
export const COMPONENT_MAP = {
  0: { name: 'Head', category: null },     // Not shown in UI
  1: { name: 'Masks', category: 'Masks' },
  2: { name: 'Hair', category: null },     // Handled by barber
  3: { name: 'Arms', category: 'Tops' },   // Upper body torso
  4: { name: 'Pants', category: 'Pants' },
  5: { name: 'Bags', category: 'Bags' },
  6: { name: 'Shoes', category: 'Shoes' },
  7: { name: 'Accessories', category: 'Accessories' },
  8: { name: 'Undershirt', category: 'Shirts' },
  9: { name: 'Body Armor', category: 'Armor' },
  10: { name: 'Decals', category: 'Decals' },
  11: { name: 'Jackets', category: 'Tops' },
};

export const PROP_MAP = {
  0: { name: 'Hats', category: 'Hats' },
  1: { name: 'Glasses', category: 'Glasses' },
  2: { name: 'Ear', category: 'Ear' },
  6: { name: 'Watches', category: 'Watches' },
  7: { name: 'Bracelets', category: 'Bracelets' },
};

// Categories shown in the UI tabs
export const CATEGORIES = [
  { name: 'Tops', type: 'component', ids: [11, 8, 3] },
  { name: 'Pants', type: 'component', ids: [4] },
  { name: 'Shoes', type: 'component', ids: [6] },
  { name: 'Hats', type: 'prop', ids: [0] },
  { name: 'Glasses', type: 'prop', ids: [1] },
  { name: 'Masks', type: 'component', ids: [1] },
  { name: 'Bags', type: 'component', ids: [5] },
  { name: 'Armor', type: 'component', ids: [9] },
  { name: 'Accessories', type: 'mixed', componentIds: [7, 10], propIds: [2, 6, 7] },
];

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
      const cat = CATEGORIES.find(c => c.name === categoryName);
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
