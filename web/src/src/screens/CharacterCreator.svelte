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

  // Face feature names → readable labels
  const FACE_FEATURES = [
    { key: 'noseWidth', label: 'Nose Width' },
    { key: 'nosePeakHigh', label: 'Nose Height' },
    { key: 'nosePeakSize', label: 'Nose Peak' },
    { key: 'noseBoneHigh', label: 'Nose Bone' },
    { key: 'nosePeakLowering', label: 'Nose Tip' },
    { key: 'noseBoneTwist', label: 'Nose Twist' },
    { key: 'eyeBrownHigh', label: 'Brow Height' },
    { key: 'eyeBrownForward', label: 'Brow Depth' },
    { key: 'cheeksBoneHigh', label: 'Cheekbone Height' },
    { key: 'cheeksBoneWidth', label: 'Cheekbone Width' },
    { key: 'cheeksWidth', label: 'Cheek Width' },
    { key: 'eyesOpening', label: 'Eye Opening' },
    { key: 'lipsThickness', label: 'Lip Thickness' },
    { key: 'jawBoneWidth', label: 'Jaw Width' },
    { key: 'jawBoneBackSize', label: 'Jaw Back' },
    { key: 'chinBoneLowering', label: 'Chin Height' },
    { key: 'chinBoneLenght', label: 'Chin Length' },
    { key: 'chinBoneSize', label: 'Chin Size' },
    { key: 'chinHole', label: 'Chin Cleft' },
    { key: 'neckThickness', label: 'Neck Thickness' },
  ];

  const HEAD_OVERLAYS = [
    { key: 'blemishes', label: 'Blemishes' },
    { key: 'beard', label: 'Beard' },
    { key: 'eyebrows', label: 'Eyebrows' },
    { key: 'ageing', label: 'Ageing' },
    { key: 'makeUp', label: 'Makeup' },
    { key: 'blush', label: 'Blush' },
    { key: 'complexion', label: 'Complexion' },
    { key: 'sunDamage', label: 'Sun Damage' },
    { key: 'lipstick', label: 'Lipstick' },
    { key: 'moleAndFreckles', label: 'Moles' },
    { key: 'chestHair', label: 'Chest Hair' },
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
</script>

<div class="creator">
  <!-- Section Navigation (vertical tabs on top) -->
  <div class="section-nav">
    {#each sections as s}
      <button
        class="section-tab"
        class:active={activeSection === s.id}
        onclick={() => setSection(s)}
      >
        {s.label}
      </button>
    {/each}
  </div>

  <!-- Section Content -->
  <div class="section-content">

    {#if activeSection === 'model'}
      <div class="section-group">
        <h3 class="section-title">Character Model</h3>
        <div class="model-buttons">
          <button class="model-btn" class:active={store.appearance?.model === 'mp_m_freemode_01'}
            onclick={() => store.changeModel('mp_m_freemode_01')}>
            <div class="model-icon">♂</div>
            <span>Male</span>
          </button>
          <button class="model-btn" class:active={store.appearance?.model === 'mp_f_freemode_01'}
            onclick={() => store.changeModel('mp_f_freemode_01')}>
            <div class="model-icon">♀</div>
            <span>Female</span>
          </button>
        </div>
      </div>

    {:else if activeSection === 'heritage'}
      <div class="section-group">
        <h3 class="section-title">Heritage</h3>
        <p class="section-desc">Choose your character's parents to define facial structure and skin tone.</p>

        <div class="slider-group">
          <label class="slider-label">
            <span>Mother (Shape)</span>
            <span class="slider-value">{getHeadBlendValue('shapeFirst')}</span>
          </label>
          <input type="range" class="slider" min="0" max="45" step="1"
            value={getHeadBlendValue('shapeFirst')}
            oninput={(e) => handleHeadBlendChange('shapeFirst', e.target.value)} />
        </div>

        <div class="slider-group">
          <label class="slider-label">
            <span>Father (Shape)</span>
            <span class="slider-value">{getHeadBlendValue('shapeSecond')}</span>
          </label>
          <input type="range" class="slider" min="0" max="45" step="1"
            value={getHeadBlendValue('shapeSecond')}
            oninput={(e) => handleHeadBlendChange('shapeSecond', e.target.value)} />
        </div>

        <div class="slider-group">
          <label class="slider-label">
            <span>Shape Mix</span>
            <span class="slider-value">{(getHeadBlendValue('shapeMix') * 100).toFixed(0)}%</span>
          </label>
          <input type="range" class="slider" min="0" max="1" step="0.1"
            value={getHeadBlendValue('shapeMix')}
            oninput={(e) => handleHeadBlendChange('shapeMix', e.target.value)} />
        </div>

        <div class="slider-group">
          <label class="slider-label">
            <span>Skin Mix</span>
            <span class="slider-value">{(getHeadBlendValue('skinMix') * 100).toFixed(0)}%</span>
          </label>
          <input type="range" class="slider" min="0" max="1" step="0.1"
            value={getHeadBlendValue('skinMix')}
            oninput={(e) => handleHeadBlendChange('skinMix', e.target.value)} />
        </div>
      </div>

    {:else if activeSection === 'face'}
      <div class="section-group">
        <h3 class="section-title">Face Features</h3>
        {#each FACE_FEATURES as feat}
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

    {:else if activeSection === 'hair'}
      <div class="section-group">
        <h3 class="section-title">Hair</h3>

        <div class="slider-group">
          <label class="slider-label">
            <span>Style</span>
            <span class="slider-value">{store.appearance?.hair?.style ?? 0}</span>
          </label>
          <input type="range" class="slider" min="0" max="30" step="1"
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
        </div>

        <div class="slider-group">
          <label class="slider-label">
            <span>Highlight</span>
            <span class="slider-value">{store.appearance?.hair?.highlight ?? 0}</span>
          </label>
          <input type="range" class="slider accent" min="0" max="63" step="1"
            value={store.appearance?.hair?.highlight ?? 0}
            oninput={(e) => store.changeHair({ highlight: parseInt(e.target.value) })} />
        </div>

        <div class="slider-group">
          <label class="slider-label">
            <span>Texture</span>
            <span class="slider-value">{store.appearance?.hair?.texture ?? 0}</span>
          </label>
          <input type="range" class="slider" min="0" max="5" step="1"
            value={store.appearance?.hair?.texture ?? 0}
            oninput={(e) => store.changeHair({ texture: parseInt(e.target.value) })} />
        </div>
      </div>

    {:else if activeSection === 'overlays'}
      <div class="section-group">
        <h3 class="section-title">Features & Overlays</h3>
        {#each HEAD_OVERLAYS as overlay}
          <div class="overlay-group">
            <span class="overlay-name">{overlay.label}</span>
            <div class="overlay-controls">
              <div class="slider-group compact">
                <label class="slider-label">
                  <span>Style</span>
                  <span class="slider-value">{getOverlayStyle(overlay.key)}</span>
                </label>
                <input type="range" class="slider" min="0" max="15" step="1"
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
            </div>
          </div>
        {/each}
      </div>

    {:else if activeSection === 'eyes'}
      <div class="section-group">
        <h3 class="section-title">Eye Color</h3>
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
  .section-nav {
    display: flex;
    gap: 6px;
    padding: 6px 16px 10px;
    overflow-x: auto;
    flex-shrink: 0;
    scroll-behavior: smooth;
    -ms-overflow-style: none;
    scrollbar-width: none;
    mask-image: linear-gradient(to right, black 88%, transparent 100%);
    -webkit-mask-image: linear-gradient(to right, black 88%, transparent 100%);
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

  .model-icon { font-size: 32px; margin-bottom: 8px; }
  .model-btn span { font-size: 14px; font-weight: 600; }

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
