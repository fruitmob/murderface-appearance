<script>
  /** @type {{ store: any }} */
  let { store } = $props();

  const sections = [
    { id: 'hair', label: 'Hair', camera: 'head' },
    { id: 'overlays', label: 'Facial Hair', camera: 'head' },
    { id: 'makeup', label: 'Makeup', camera: 'head' },
  ];

  let activeSection = $state('hair');

  const FACIAL_OVERLAYS = [
    { key: 'beard', label: 'Beard', hasColor: 'hair' },
    { key: 'eyebrows', label: 'Eyebrows', hasColor: 'hair' },
    { key: 'chestHair', label: 'Chest Hair', hasColor: 'hair' },
  ];

  const MAKEUP_OVERLAYS = [
    { key: 'makeUp', label: 'Makeup', hasColor: 'makeup' },
    { key: 'blush', label: 'Blush', hasColor: 'makeup' },
    { key: 'lipstick', label: 'Lipstick', hasColor: 'makeup' },
    { key: 'blemishes', label: 'Blemishes' },
    { key: 'ageing', label: 'Ageing' },
    { key: 'complexion', label: 'Complexion' },
    { key: 'sunDamage', label: 'Sun Damage' },
    { key: 'moleAndFreckles', label: 'Moles & Freckles' },
    { key: 'bodyBlemishes', label: 'Body Marks' },
  ];

  function setSection(s) {
    activeSection = s.id;
    store.setCamera(s.camera);
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

  async function handleOverlayChange(key, field, value) {
    const current = store.appearance?.headOverlays?.[key] || { style: 0, opacity: 0, color: 0, secondColor: 0 };
    await store.changeHeadOverlay({
      [key]: { ...current, [field]: parseFloat(value) }
    });
  }

  async function resetHair() {
    await store.changeHair({ style: 0, color: 0, highlight: 0, texture: 0 });
  }

  async function resetFacialHair() {
    for (const o of FACIAL_OVERLAYS) {
      await store.changeHeadOverlay({ [o.key]: { style: 0, opacity: 0, color: 0, secondColor: 0 } });
    }
  }

  async function resetMakeup() {
    for (const o of MAKEUP_OVERLAYS) {
      await store.changeHeadOverlay({ [o.key]: { style: 0, opacity: 0, color: 0, secondColor: 0 } });
    }
  }

  function getHairMax(field) {
    const val = store.settings?.hair?.[field]?.max;
    return val ?? (field === 'style' ? 30 : field === 'texture' ? 5 : 63);
  }

  function getOverlayMax(key) {
    const overlay = store.settings?.headOverlays?.[key];
    return overlay?.style?.max ?? 15;
  }

  function getOverlayColorItems(key) {
    return store.settings?.headOverlays?.[key]?.color?.items || null;
  }

</script>

<div class="barber">
  <div class="section-nav">
    {#each sections as s}
      <button class="section-tab" class:active={activeSection === s.id}
        onclick={() => setSection(s)}>
        {s.label}
      </button>
    {/each}
  </div>

  <div class="section-content">
    {#if activeSection === 'hair'}
      <div class="section-group">
        <div class="section-header">
          <h3 class="section-title">Hair Style</h3>
          <button class="reset-btn" onclick={resetHair}>Reset</button>
        </div>
        <p class="section-desc">Change your hair style and color.</p>

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
          <h3 class="section-title">Facial Hair & Brows</h3>
          <button class="reset-btn" onclick={resetFacialHair}>Reset</button>
        </div>
        <p class="section-desc">Style your beard, eyebrows, and chest hair.</p>
        {#each FACIAL_OVERLAYS as overlay}
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

    {:else if activeSection === 'makeup'}
      <div class="section-group">
        <div class="section-header">
          <h3 class="section-title">Makeup & Skin</h3>
          <button class="reset-btn" onclick={resetMakeup}>Reset</button>
        </div>
        <p class="section-desc">Apply makeup, blush, and lipstick. Adjust skin details.</p>
        {#each MAKEUP_OVERLAYS as overlay}
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
    {/if}
  </div>
</div>

<style>
  .barber {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .section-nav {
    display: flex;
    gap: 6px;
    padding: 6px 16px 10px;
    flex-shrink: 0;
  }

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
  .section-tab:hover { color: var(--text-primary); }
  .section-tab.active {
    color: var(--accent);
    font-weight: 600;
    background: rgba(0, 40, 36, 0.8);
    border-color: var(--accent-border);
  }

  .section-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px 12px;
    min-height: 0;
  }

  .section-group { display: flex; flex-direction: column; gap: 10px; }
  .section-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }

  .slider-group { display: flex; flex-direction: column; gap: 4px; }
  .slider-group.compact { gap: 2px; }

  .slider-label {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--text-secondary);
  }
  .slider-value { font-size: 11px; font-weight: 600; color: var(--accent); min-width: 35px; text-align: right; }

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
    width: 14px; height: 14px;
    border-radius: 50%;
    background: var(--text-primary);
    border: 2px solid rgba(30, 32, 40, 1);
    cursor: pointer;
  }
  .slider::-webkit-slider-thumb:hover { background: var(--accent); }
  .slider.accent::-webkit-slider-thumb { background: var(--accent); border-color: rgba(0, 100, 90, 0.5); }

  .overlay-group { padding: 10px 0; border-bottom: 1px solid var(--border); }
  .overlay-group:last-child { border-bottom: none; }
  .overlay-name { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; display: block; }
  .overlay-controls { display: flex; flex-direction: column; gap: 4px; }
</style>
