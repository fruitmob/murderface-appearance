<script>
  /** @type {{ store: any }} */
  let { store } = $props();

  // Creator sections — stepped wizard flow
  const sections = [
    { id: 'model', label: 'Model', camera: 'default' },
    { id: 'heritage', label: 'Heritage', camera: 'head' },
    { id: 'face', label: 'Face', camera: 'head' },
    { id: 'hair', label: 'Hair', camera: 'head' },
    { id: 'overlays', label: 'Features', camera: 'head' },
    { id: 'eyes', label: 'Eyes', camera: 'head' },
  ];

  let activeSection = $state('heritage');

  // Face feature names → readable labels, grouped by body area
  const FACE_FEATURE_GROUPS = [
    { group: 'Nose', features: [
      { key: 'noseWidth', label: 'Width' },
      { key: 'nosePeakHigh', label: 'Height' },
      { key: 'nosePeakSize', label: 'Peak' },
      { key: 'noseBoneHigh', label: 'Bone' },
      { key: 'nosePeakLowering', label: 'Tip' },
      { key: 'noseBoneTwist', label: 'Twist' },
    ]},
    { group: 'Brows & Cheeks', features: [
      { key: 'eyeBrownHigh', label: 'Brow Height' },
      { key: 'eyeBrownForward', label: 'Brow Depth' },
      { key: 'cheeksBoneHigh', label: 'Cheekbone Height' },
      { key: 'cheeksBoneWidth', label: 'Cheekbone Width' },
      { key: 'cheeksWidth', label: 'Cheek Width' },
    ]},
    { group: 'Eyes & Lips', features: [
      { key: 'eyesOpening', label: 'Eye Opening' },
      { key: 'lipsThickness', label: 'Lip Thickness' },
    ]},
    { group: 'Jaw & Chin', features: [
      { key: 'jawBoneWidth', label: 'Jaw Width' },
      { key: 'jawBoneBackSize', label: 'Jaw Back' },
      { key: 'chinBoneLowering', label: 'Chin Height' },
      { key: 'chinBoneLenght', label: 'Chin Length' },
      { key: 'chinBoneSize', label: 'Chin Size' },
      { key: 'chinHole', label: 'Chin Cleft' },
    ]},
    { group: 'Neck', features: [
      { key: 'neckThickness', label: 'Neck Thickness' },
    ]},
  ];

  // Flat list for reset function
  const FACE_FEATURES = FACE_FEATURE_GROUPS.flatMap(g => g.features);

  const HEAD_OVERLAYS = [
    { key: 'blemishes', label: 'Blemishes' },
    { key: 'beard', label: 'Beard', hasColor: 'hair' },
    { key: 'eyebrows', label: 'Eyebrows', hasColor: 'hair' },
    { key: 'ageing', label: 'Ageing' },
    { key: 'makeUp', label: 'Makeup', hasColor: 'makeup' },
    { key: 'blush', label: 'Blush', hasColor: 'makeup' },
    { key: 'complexion', label: 'Complexion' },
    { key: 'sunDamage', label: 'Sun Damage' },
    { key: 'lipstick', label: 'Lipstick', hasColor: 'makeup' },
    { key: 'moleAndFreckles', label: 'Moles' },
    { key: 'chestHair', label: 'Chest Hair', hasColor: 'hair' },
    { key: 'bodyBlemishes', label: 'Body Marks' },
  ];

  const EYE_COLORS = [
    'Green', 'Emerald', 'Light Blue', 'Ocean Blue', 'Light Brown',
    'Dark Brown', 'Hazel', 'Dark Gray', 'Light Gray', 'Pink',
    'Yellow', 'Purple', 'Blackout', 'Shades of Gray', 'Tequila Sunrise',
    'Atomic', 'Warp', 'ECola', 'Space Ranger', 'Ying Yang',
    'Bullseye', 'Lizard', 'Dragon', 'Extra Terrestrial', 'Goat',
    'Smiley', 'Possessed', 'Demon', 'Infected', 'Alien', 'Undead'
  ];

  function setSection(s) {
    activeSection = s.id;
    store.setCamera(s.camera);
  }

  function getFaceValue(key) {
    return store.appearance?.faceFeatures?.[key] ?? 0;
  }

  function getHeadBlendValue(key) {
    return store.appearance?.headBlend?.[key] ?? 0;
  }

  function getOverlayStyle(key) {
    return store.appearance?.headOverlays?.[key]?.style ?? 0;
  }

  function getOverlayOpacity(key) {
    return store.appearance?.headOverlays?.[key]?.opacity ?? 0;
  }

  function getOverlayColor(key) {
    return store.appearance?.headOverlays?.[key]?.color ?? 0;
  }

  async function handleFaceFeatureChange(key, value) {
    await store.changeFaceFeature({ [key]: parseFloat(value) });
  }

  async function handleHeadBlendChange(key, value) {
    await store.changeHeadBlend({ [key]: parseFloat(value) });
  }

  async function handleOverlayChange(key, field, value) {
    const current = store.appearance?.headOverlays?.[key] || { style: 0, opacity: 0, color: 0, secondColor: 0 };
    await store.changeHeadOverlay({
      [key]: { ...current, [field]: parseFloat(value) }
    });
  }

  async function resetHeritage() {
    await store.changeHeadBlend({ shapeFirst: 0, shapeSecond: 0, shapeMix: 0.5, skinMix: 0.5 });
  }

  async function resetFace() {
    const data = {};
    for (const feat of FACE_FEATURES) data[feat.key] = 0;
    await store.changeFaceFeature(data);
  }

  async function resetHair() {
    await store.changeHair({ style: 0, color: 0, highlight: 0, texture: 0 });
  }

  async function resetOverlays() {
    for (const overlay of HEAD_OVERLAYS) {
      await store.changeHeadOverlay({
        [overlay.key]: { style: 0, opacity: 0, color: 0, secondColor: 0 }
      });
    }
  }

  let subNavEl;
  let pedSearchQuery = $state('');

  function scrollSubLeft() { if (subNavEl) subNavEl.scrollLeft -= 100; }
  function scrollSubRight() { if (subNavEl) subNavEl.scrollLeft += 100; }

  // Ped model helpers
  const FREEMODE_PEDS = ['mp_m_freemode_01', 'mp_f_freemode_01'];

  function getAvailablePeds() {
    // Lua nests as settings.ped.model.items
    const items = store.settings?.ped?.model?.items;
    if (!items || !Array.isArray(items)) return [];
    return items.filter(p => !FREEMODE_PEDS.includes(p));
  }

  function getFilteredPeds() {
    let peds = getAvailablePeds();
    if (pedSearchQuery.trim()) {
      const q = pedSearchQuery.toLowerCase();
      peds = peds.filter(p => p.toLowerCase().includes(q) || formatPedName(p).toLowerCase().includes(q));
    }
    return peds;
  }

  function formatPedName(ped) {
    // a_c_cat_01 → Cat, s_m_y_cop_01 → Cop, ig_tracydisanto → Tracy Disanto
    return ped
      .replace(/^(a_[cfm]_[mfy]?_?|s_[mf]_[ymo]_|u_[mf]_[ymo]_|csb_|cs_|ig_|mp_[mf]_|g_[mf]_y_|hc_)/i, '')
      .replace(/_\d+$/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim() || ped;
  }

  // Get dynamic max values from settings, fallback to sensible defaults
  function getSettingsMax(path, fallback) {
    try {
      const parts = path.split('.');
      let val = store.settings;
      for (const p of parts) val = val?.[p];
      return val ?? fallback;
    } catch { return fallback; }
  }

  function getHairMax(field) {
    return getSettingsMax(`hair.${field}.max`, field === 'style' ? 30 : field === 'texture' ? 5 : 63);
  }

  function getOverlayMax(key) {
    const overlay = store.settings?.headOverlays?.[key];
    return overlay?.style?.max ?? 15;
  }

  function getOverlayColorItems(key) {
    return store.settings?.headOverlays?.[key]?.color?.items || null;
  }

  async function randomizeAppearance() {
    const rand = (min, max) => Math.random() * (max - min) + min;
    const randInt = (min, max) => Math.floor(rand(min, max + 1));

    // Random heritage
    await store.changeHeadBlend({
      shapeFirst: randInt(0, 45),
      shapeSecond: randInt(0, 45),
      shapeThird: 0,
      skinFirst: randInt(0, 45),
      skinSecond: randInt(0, 45),
      skinThird: 0,
      shapeMix: parseFloat(rand(0, 1).toFixed(2)),
      skinMix: parseFloat(rand(0, 1).toFixed(2)),
      thirdMix: 0,
    });

    // Random face features
    const faceData = {};
    for (const feat of FACE_FEATURES) {
      faceData[feat.key] = parseFloat(rand(-1.0, 1.0).toFixed(2));
    }
    await store.changeFaceFeature(faceData);

    // Random eye color (0-30)
    await store.changeEyeColor(randInt(0, 30));
  }
</script>

<div class="creator">
  <!-- Section Navigation with scroll arrows -->
  <div class="section-nav-wrap">
    <button class="nav-arrow" onclick={scrollSubLeft}>&#8249;</button>
    <div class="section-nav" bind:this={subNavEl}>
      {#each sections as s}
        <button
          class="section-tab"
          class:active={activeSection === s.id}
          onclick={() => setSection(s)}
        >
          {s.label}
        </button>
      {/each}
      <button class="section-tab randomize" onclick={randomizeAppearance} title="Randomize face">
        Dice
      </button>
    </div>
    <button class="nav-arrow" onclick={scrollSubRight}>&#8250;</button>
  </div>

  <!-- Section Content -->
  <div class="section-content">

    {#if activeSection === 'model'}
      <div class="section-group">
        <h3 class="section-title">Character Model</h3>
        <p class="section-desc">Select your character's base model. Freemode models support full customization.</p>
        <div class="model-buttons">
          <button class="model-btn freemode" class:active={store.appearance?.model === 'mp_m_freemode_01'}
            onclick={() => store.changeModel('mp_m_freemode_01')}>
            <img class="model-thumb" src="https://docs.fivem.net/peds/mp_m_freemode_01.png" alt="Male" loading="lazy" />
            <span>Male</span>
          </button>
          <button class="model-btn freemode" class:active={store.appearance?.model === 'mp_f_freemode_01'}
            onclick={() => store.changeModel('mp_f_freemode_01')}>
            <img class="model-thumb" src="https://docs.fivem.net/peds/mp_f_freemode_01.png" alt="Female" loading="lazy" />
            <span>Female</span>
          </button>
        </div>

        <!-- Other Ped Models -->
        {#if getAvailablePeds().length > 0}
          <h3 class="section-title" style="margin-top: 12px;">Other Models</h3>
          <p class="section-desc">These models have a fixed appearance and cannot be customized.</p>

          <div class="search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input class="search-input" type="text" placeholder="Search ped models..."
              bind:value={pedSearchQuery} />
          </div>

          <div class="ped-grid">
            {#each getFilteredPeds() as ped (ped)}
              <button class="ped-card" class:active={store.appearance?.model === ped}
                onclick={() => store.changeModel(ped)}>
                <img class="ped-img" src="https://docs.fivem.net/peds/{ped}.png" alt={ped} loading="lazy"
                  onerror={(e) => { e.target.style.display = 'none'; }} />
                <span class="ped-name">{formatPedName(ped)}</span>
              </button>
            {/each}
            {#if getFilteredPeds().length === 0}
              <p class="empty-hint" style="grid-column: 1/-1;">No models match "{pedSearchQuery}"</p>
            {/if}
          </div>
        {/if}
      </div>

    {:else if activeSection === 'heritage'}
      <div class="section-group">
        <div class="section-header">
          <h3 class="section-title">Heritage</h3>
          <button class="reset-btn" onclick={resetHeritage}>Reset</button>
        </div>
        <p class="section-desc">Choose your character's parents to define facial structure and skin tone.</p>

        <div class="slider-card">
          <span class="slider-card-label">Parent Selection</span>
          {#each [
            { key: 'shapeFirst', label: 'Mother (Shape)' },
            { key: 'shapeSecond', label: 'Father (Shape)' },
            { key: 'skinFirst', label: 'Mother (Skin)' },
            { key: 'skinSecond', label: 'Father (Skin)' },
          ] as { key, label }}
            <div class="slider-group">
              <label class="slider-label">
                <span>{label}</span>
                <div class="step-arrows">
                  <button class="step-btn" onclick={() => handleHeadBlendChange(key, Math.max(0, getHeadBlendValue(key) - 1))}>&#8249;</button>
                  <span class="slider-value">{getHeadBlendValue(key)}</span>
                  <button class="step-btn" onclick={() => handleHeadBlendChange(key, Math.min(45, getHeadBlendValue(key) + 1))}>&#8250;</button>
                </div>
              </label>
              <input type="range" class="slider" min="0" max="45" step="1" value={getHeadBlendValue(key)} oninput={(e) => handleHeadBlendChange(key, e.target.value)} />
            </div>
          {/each}
        </div>

        <div class="slider-card">
          <span class="slider-card-label">Blend Mix</span>
          <div class="slider-group">
            <label class="slider-label"><span>Shape Mix</span><span class="slider-value">{(getHeadBlendValue('shapeMix') * 100).toFixed(0)}%</span></label>
            <input type="range" class="slider" min="0" max="1" step="0.1" value={getHeadBlendValue('shapeMix')} oninput={(e) => handleHeadBlendChange('shapeMix', e.target.value)} />
          </div>
          <div class="slider-group">
            <label class="slider-label"><span>Skin Mix</span><span class="slider-value">{(getHeadBlendValue('skinMix') * 100).toFixed(0)}%</span></label>
            <input type="range" class="slider" min="0" max="1" step="0.1" value={getHeadBlendValue('skinMix')} oninput={(e) => handleHeadBlendChange('skinMix', e.target.value)} />
          </div>
        </div>
      </div>

    {:else if activeSection === 'face'}
      <div class="section-group">
        <div class="section-header">
          <h3 class="section-title">Face Features</h3>
          <button class="reset-btn" onclick={resetFace}>Reset</button>
        </div>
        <p class="section-desc">Fine-tune facial proportions and structure.</p>
        {#each FACE_FEATURE_GROUPS as group}
          <div class="slider-card">
            <span class="slider-card-label">{group.group}</span>
            {#each group.features as feat}
              <div class="slider-group compact">
                <label class="slider-label">
                  <span>{feat.label}</span>
                  <span class="slider-value">{(getFaceValue(feat.key) * 100).toFixed(0)}%</span>
                </label>
                <input type="range" class="slider" min="-1" max="1" step="0.1"
                  value={getFaceValue(feat.key)}
                  oninput={(e) => handleFaceFeatureChange(feat.key, e.target.value)} />
              </div>
            {/each}
          </div>
        {/each}
      </div>

    {:else if activeSection === 'hair'}
      <div class="section-group">
        <div class="section-header">
          <h3 class="section-title">Hair</h3>
          <button class="reset-btn" onclick={resetHair}>Reset</button>
        </div>
        <p class="section-desc">Choose hair style, color, and highlights.</p>

        <div class="slider-group">
          <label class="slider-label">
            <span>Style</span>
            <div class="step-arrows">
              <button class="step-btn" onclick={() => store.changeHair({ style: Math.max(0, (store.appearance?.hair?.style ?? 0) - 1) })}>&#8249;</button>
              <span class="slider-value">{store.appearance?.hair?.style ?? 0}</span>
              <button class="step-btn" onclick={() => store.changeHair({ style: Math.min(getHairMax('style'), (store.appearance?.hair?.style ?? 0) + 1) })}>&#8250;</button>
            </div>
          </label>
          <input type="range" class="slider" min="0" max={getHairMax('style')} step="1"
            value={store.appearance?.hair?.style ?? 0}
            oninput={(e) => store.changeHair({ style: parseInt(e.target.value) })} />
        </div>

        <div class="slider-group">
          <label class="slider-label">
            <span>Color</span>
            <span class="slider-value">{store.appearance?.hair?.color ?? 0}</span>
          </label>
          <input type="range" class="slider accent" min="0" max="63" step="1"
            value={store.appearance?.hair?.color ?? 0}
            oninput={(e) => store.changeHair({ color: parseInt(e.target.value) })} />
          {#if store.settings?.hair?.color?.items?.length > 0}
            <div class="color-picker">
              {#each store.settings.hair.color.items as rgb, i}
                <button class="color-dot" class:active={(store.appearance?.hair?.color ?? 0) === i}
                  style="background:rgb({rgb[0]},{rgb[1]},{rgb[2]})"
                  onclick={() => store.changeHair({ color: i })} />
              {/each}
            </div>
          {:else}
            <div class="color-gradient-hair"></div>
          {/if}
        </div>

        <div class="slider-group">
          <label class="slider-label">
            <span>Highlight</span>
            <span class="slider-value">{store.appearance?.hair?.highlight ?? 0}</span>
          </label>
          <input type="range" class="slider accent" min="0" max="63" step="1"
            value={store.appearance?.hair?.highlight ?? 0}
            oninput={(e) => store.changeHair({ highlight: parseInt(e.target.value) })} />
          {#if store.settings?.hair?.highlight?.items?.length > 0}
            <div class="color-picker">
              {#each store.settings.hair.highlight.items as rgb, i}
                <button class="color-dot" class:active={(store.appearance?.hair?.highlight ?? 0) === i}
                  style="background:rgb({rgb[0]},{rgb[1]},{rgb[2]})"
                  onclick={() => store.changeHair({ highlight: i })} />
              {/each}
            </div>
          {:else}
            <div class="color-gradient-hair"></div>
          {/if}
        </div>

        <div class="slider-group">
          <label class="slider-label">
            <span>Texture</span>
            <div class="step-arrows">
              <button class="step-btn" onclick={() => store.changeHair({ texture: Math.max(0, (store.appearance?.hair?.texture ?? 0) - 1) })}>&#8249;</button>
              <span class="slider-value">{store.appearance?.hair?.texture ?? 0}</span>
              <button class="step-btn" onclick={() => store.changeHair({ texture: Math.min(getHairMax('texture'), (store.appearance?.hair?.texture ?? 0) + 1) })}>&#8250;</button>
            </div>
          </label>
          <input type="range" class="slider" min="0" max={getHairMax('texture')} step="1"
            value={store.appearance?.hair?.texture ?? 0}
            oninput={(e) => store.changeHair({ texture: parseInt(e.target.value) })} />
        </div>
      </div>

    {:else if activeSection === 'overlays'}
      <div class="section-group">
        <div class="section-header">
          <h3 class="section-title">Features & Overlays</h3>
          <button class="reset-btn" onclick={resetOverlays}>Reset</button>
        </div>
        <p class="section-desc">Customize facial hair, makeup, and skin details.</p>
        {#each HEAD_OVERLAYS as overlay}
          <div class="overlay-group">
            <span class="overlay-name">{overlay.label}</span>
            <div class="overlay-controls">
              <div class="slider-group compact">
                <label class="slider-label">
                  <span>Style</span>
                  <div class="step-arrows">
                    <button class="step-btn" onclick={() => handleOverlayChange(overlay.key, 'style', Math.max(0, getOverlayStyle(overlay.key) - 1))}>&#8249;</button>
                    <span class="slider-value">{getOverlayStyle(overlay.key)}</span>
                    <button class="step-btn" onclick={() => handleOverlayChange(overlay.key, 'style', Math.min(getOverlayMax(overlay.key), getOverlayStyle(overlay.key) + 1))}>&#8250;</button>
                  </div>
                </label>
                <input type="range" class="slider" min="0" max={getOverlayMax(overlay.key)} step="1"
                  value={getOverlayStyle(overlay.key)}
                  oninput={(e) => handleOverlayChange(overlay.key, 'style', e.target.value)} />
              </div>
              <div class="slider-group compact">
                <label class="slider-label">
                  <span>Opacity</span>
                  <span class="slider-value">{(getOverlayOpacity(overlay.key) * 100).toFixed(0)}%</span>
                </label>
                <input type="range" class="slider accent" min="0" max="1" step="0.1"
                  value={getOverlayOpacity(overlay.key)}
                  oninput={(e) => handleOverlayChange(overlay.key, 'opacity', e.target.value)} />
              </div>
              {#if overlay.hasColor}
                {@const colorItems = getOverlayColorItems(overlay.key)}
                <div class="slider-group compact">
                  <label class="slider-label">
                    <span>Color</span>
                    <span class="slider-value">{getOverlayColor(overlay.key)}</span>
                  </label>
                  <input type="range" class="slider accent" min="0" max="63" step="1"
                    value={getOverlayColor(overlay.key)}
                    oninput={(e) => handleOverlayChange(overlay.key, 'color', e.target.value)} />
                  {#if colorItems?.length > 0}
                    <div class="color-picker">
                      {#each colorItems as rgb, i}
                        <button class="color-dot" class:active={getOverlayColor(overlay.key) === i}
                          style="background:rgb({rgb[0]},{rgb[1]},{rgb[2]})"
                          onclick={() => handleOverlayChange(overlay.key, 'color', i)} />
                      {/each}
                    </div>
                  {:else}
                    <div class={overlay.hasColor === 'hair' ? 'color-gradient-hair' : 'color-gradient-makeup'}></div>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>

    {:else if activeSection === 'eyes'}
      <div class="section-group">
        <h3 class="section-title">Eye Color</h3>
        <p class="section-desc">Pick your eye color.</p>
        <div class="eye-grid">
          {#each EYE_COLORS as color, i}
            <button
              class="eye-btn"
              class:active={store.appearance?.eyeColor === i}
              onclick={() => store.changeEyeColor(i)}
            >
              {color}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .creator {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  /* ---- SECTION NAV ---- */
  .section-nav-wrap {
    display: flex; align-items: center; gap: 4px;
    padding: 6px 8px 10px; flex-shrink: 0;
  }
  .nav-arrow {
    width: 22px; height: 26px; border-radius: 6px;
    background: rgba(18, 19, 24, 0.8); border: 1px solid rgba(30, 32, 40, 0.4);
    color: var(--text-secondary); font-size: 16px; cursor: pointer;
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    font-family: var(--font); transition: all 0.15s;
  }
  .nav-arrow:hover { color: var(--text-primary); border-color: rgba(60, 65, 78, 0.6); }
  .section-nav {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    flex: 1;
    scroll-behavior: smooth;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .section-nav::-webkit-scrollbar { display: none; }

  .section-tab {
    padding: 7px 16px;
    border-radius: var(--radius-pill);
    font-size: 12px;
    font-weight: 500;
    font-family: var(--font);
    color: var(--text-secondary);
    background: rgba(18, 19, 24, 0.8);
    border: 1px solid rgba(30, 32, 40, 0.4);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;
  }
  .section-tab:hover { color: var(--text-primary); border-color: rgba(60, 65, 78, 0.6); }
  .section-tab.active {
    color: var(--accent);
    font-weight: 600;
    background: rgba(0, 40, 36, 0.8);
    border-color: var(--accent-border);
  }

  .section-tab.randomize {
    margin-left: auto;
    background: rgba(40, 30, 10, 0.8);
    border-color: rgba(180, 140, 40, 0.3);
    color: rgba(220, 180, 60, 0.8);
  }
  .section-tab.randomize:hover {
    color: rgba(240, 200, 80, 1);
    border-color: rgba(220, 180, 60, 0.5);
    background: rgba(50, 40, 15, 0.9);
  }

  /* ---- SECTION CONTENT ---- */
  .section-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px 12px;
    min-height: 0;
  }

  .section-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .section-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .section-desc {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 8px;
    line-height: 1.5;
  }

  /* ---- MODEL SELECT ---- */
  .model-buttons {
    display: flex;
    gap: 12px;
  }

  .model-btn {
    flex: 1;
    padding: 24px 16px;
    border-radius: var(--radius-md);
    background: var(--bg-card);
    border: 1px solid rgba(25, 28, 36, 0.6);
    color: var(--text-secondary);
    cursor: pointer;
    font-family: var(--font);
    text-align: center;
    transition: all 0.2s;
  }
  .model-btn:hover { border-color: var(--border-hover); background: var(--bg-card-hover); }
  .model-btn.active {
    background: var(--bg-card-selected);
    border-color: rgba(0, 255, 235, 0.5);
    color: var(--accent);
    box-shadow: 0 0 16px var(--accent-glow);
  }

  .model-btn.freemode { padding: 12px 16px; }
  .model-thumb {
    width: 64px; height: 80px; object-fit: cover; object-position: top;
    border-radius: 6px; margin-bottom: 6px;
    background: rgba(20, 22, 28, 0.5);
  }
  .model-icon { font-size: 32px; margin-bottom: 8px; }
  .model-btn span { font-size: 14px; font-weight: 600; }

  /* ---- PED GRID ---- */
  .ped-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    max-height: 400px;
    overflow-y: auto;
    padding-right: 2px;
  }

  .ped-card {
    display: flex; flex-direction: column; align-items: center;
    padding: 8px 4px 6px;
    border-radius: var(--radius-sm);
    background: var(--bg-card);
    border: 1px solid rgba(25, 28, 36, 0.6);
    cursor: pointer; font-family: var(--font);
    transition: all 0.15s;
    overflow: hidden;
  }
  .ped-card:hover { border-color: var(--border-hover); background: var(--bg-card-hover); }
  .ped-card.active {
    border-color: rgba(0, 255, 235, 0.5);
    background: var(--bg-card-selected);
  }

  .ped-img {
    width: 56px; height: 70px;
    object-fit: cover; object-position: top;
    border-radius: 4px;
    background: rgba(20, 22, 28, 0.5);
  }

  .ped-name {
    font-size: 11px; font-weight: 500;
    color: var(--text-secondary);
    margin-top: 4px;
    text-align: center;
    line-height: 1.2;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ped-card.active .ped-name { color: var(--accent); font-weight: 600; }

  /* ---- SLIDER CARDS (visual grouping) ---- */
  .slider-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: var(--radius-sm);
    padding: 12px 14px;
    margin-bottom: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .slider-card-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    margin-bottom: 2px;
  }

  /* ---- SLIDERS ---- */
  .slider-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .slider-group.compact { gap: 2px; }

  .slider-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .slider-value {
    font-size: 11px;
    font-weight: 600;
    color: var(--accent);
    min-width: 35px;
    text-align: right;
  }

  .slider {
    width: 100%;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: rgba(30, 32, 40, 0.8);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--text-primary);
    border: 2px solid rgba(30, 32, 40, 1);
    cursor: pointer;
    transition: background 0.15s;
  }
  .slider::-webkit-slider-thumb:hover { background: var(--accent); }

  .slider.accent::-webkit-slider-thumb {
    background: var(--accent);
    border-color: rgba(0, 100, 90, 0.5);
  }

  /* ---- OVERLAYS ---- */
  .overlay-group {
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
  }
  .overlay-group:last-child { border-bottom: none; }

  .overlay-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 6px;
    display: block;
  }

  .overlay-controls {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  /* ---- EYE COLOR GRID ---- */
  .eye-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .eye-btn {
    padding: 8px 6px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    font-weight: 500;
    font-family: var(--font);
    color: var(--text-secondary);
    background: var(--bg-card);
    border: 1px solid rgba(25, 28, 36, 0.6);
    cursor: pointer;
    transition: all 0.15s;
    text-align: center;
  }
  .eye-btn:hover { color: var(--text-primary); border-color: var(--border-hover); }
  .eye-btn.active {
    color: var(--accent);
    background: var(--bg-card-selected);
    border-color: rgba(0, 255, 235, 0.5);
    font-weight: 600;
  }
</style>
