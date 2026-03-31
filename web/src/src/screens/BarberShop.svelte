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
    { key: 'beard', label: 'Beard' },
    { key: 'eyebrows', label: 'Eyebrows' },
    { key: 'chestHair', label: 'Chest Hair' },
  ];

  const MAKEUP_OVERLAYS = [
    { key: 'makeUp', label: 'Makeup' },
    { key: 'blush', label: 'Blush' },
    { key: 'lipstick', label: 'Lipstick' },
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

  async function handleOverlayChange(key, field, value) {
    const current = store.appearance?.headOverlays?.[key] || { style: 0, opacity: 0, color: 0, secondColor: 0 };
    await store.changeHeadOverlay({
      [key]: { ...current, [field]: parseFloat(value) }
    });
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
        <h3 class="section-title">Hair Style</h3>

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
        <h3 class="section-title">Facial Hair & Brows</h3>
        {#each FACIAL_OVERLAYS as overlay}
          <div class="overlay-group">
            <span class="overlay-name">{overlay.label}</span>
            <div class="overlay-controls">
              <div class="slider-group compact">
                <label class="slider-label">
                  <span>Style</span>
                  <span class="slider-value">{getOverlayStyle(overlay.key)}</span>
                </label>
                <input type="range" class="slider" min="0" max="30" step="1"
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

    {:else if activeSection === 'makeup'}
      <div class="section-group">
        <h3 class="section-title">Makeup & Skin</h3>
        {#each MAKEUP_OVERLAYS as overlay}
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
    gap: 8px;
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
