<script>
  import { onMount, onDestroy } from 'svelte';
  import { fetchNui, onNuiMessage } from './lib/nui.js';
  import { createAppearanceStore, getClothingImageUrl } from './lib/stores.svelte.js';
  import CharacterCreator from './screens/CharacterCreator.svelte';
  import BarberShop from './screens/BarberShop.svelte';
  import TattooShop from './screens/TattooShop.svelte';
  import OutfitMenu from './screens/OutfitMenu.svelte';
  const gtaBg = import.meta.env.DEV ? new URL('./assets/gta-bg.png', import.meta.url).href : '';

  const store = createAppearanceStore();
  const isDev = !window.GetParentResourceName;

  // Screen mode: null (loading) | 'clothing' | 'creator' | 'barber' | 'tattoo' | 'outfits'
  let screenMode = $state(null);

  // Section nav — built from config booleans, shown when 2+ sections enabled
  let sections = $state([]);

  function buildSections(cfg) {
    if (!cfg) return [];
    const s = [];
    if (cfg.ped || cfg.headBlend || cfg.faceFeatures)  s.push({ id: 'creator',  label: 'Ped' });
    if (cfg.headOverlays)                               s.push({ id: 'barber',   label: 'Hair' });
    if (cfg.components || cfg.props)                     s.push({ id: 'clothing', label: 'Clothing' });
    if (cfg.tattoos)                                     s.push({ id: 'tattoo',   label: 'Tattoos' });
    s.push({ id: 'outfits', label: 'Outfits' }); // always available
    return s;
  }

  function autoDetectScreen(cfg) {
    if (!cfg) return 'clothing';
    if (cfg.ped || cfg.headBlend || cfg.faceFeatures) return 'creator';
    if (cfg.headOverlays) return 'barber';
    if (cfg.tattoos) return 'tattoo';
    return 'clothing';
  }

  // Dev: toggle with keyboard
  function handleKeyDown(e) {
    if (!isDev) return;
    if (e.key === '1') screenMode = 'clothing';
    if (e.key === '2') screenMode = 'creator';
    if (e.key === '3') screenMode = 'barber';
    if (e.key === '4') screenMode = 'tattoo';
    if (e.key === '5') screenMode = 'outfits';
  }

  onMount(async () => {
    if (isDev) {
      await store.show();
      sections = buildSections(store.config);
      screenMode = autoDetectScreen(store.config);
      window.addEventListener('keydown', handleKeyDown);
    }
  });

  const cleanupShow = onNuiMessage('appearance_display', async () => {
    await store.show();
    sections = buildSections(store.config);
    screenMode = autoDetectScreen(store.config);
    strippedRegions = { head: false, body: false, bottom: false };
  });
  const cleanupHide = onNuiMessage('appearance_hide', () => store.hide());
  onDestroy(() => {
    cleanupShow(); cleanupHide();
    if (isDev) window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('mouseup', handleMouseUp);
  });

  // Global mouseup to catch releases outside the NUI frame
  if (typeof window !== 'undefined') {
    window.addEventListener('mouseup', handleMouseUp);
  }

  // Get items for current category from store
  function getItems() {
    return store.getItemsForCategory(store.activeCategory);
  }

  function getSelected() {
    return store.getSelectedItem();
  }

  async function handleItemClick(item) {
    if (item.type === 'component') {
      await store.changeComponent(item.id, item.drawable);
    } else {
      await store.changeProp(item.id, item.drawable);
    }
  }

  async function handleTextureChange(delta) {
    const sel = getSelected();
    if (!sel) return;
    const newTex = Math.max(0, Math.min(sel.maxTexture, sel.texture + delta));
    const type = sel.type === 'component' ? 'c' : 'p';
    await store.changeTexture(type, sel.id, newTex);
  }

  async function handleDrawableStep(delta) {
    const sel = getSelected();
    if (!sel) return;
    const items = getItems();
    const maxDrawable = items.length > 0 ? items[items.length - 1].drawable : 0;
    const newDrawable = Math.max(0, Math.min(maxDrawable, sel.drawable + delta));
    await handleItemClick({ ...sel, drawable: newDrawable });
  }

  async function handleDrawableInput(e) {
    const val = parseInt(e.target.value);
    if (isNaN(val)) return;
    const sel = getSelected();
    if (!sel) return;
    const items = getItems();
    const maxDrawable = items.length > 0 ? items[items.length - 1].drawable : 0;
    const clamped = Math.max(0, Math.min(maxDrawable, val));
    await handleItemClick({ ...sel, drawable: clamped });
  }

  // ---- TABS SCROLL ----
  let tabsEl = $state(null);
  // FMRP: Cycle through categories with arrows + auto-scroll active into view
  function scrollTabsLeft() {
    const cats = store.categories;
    if (!cats || cats.length === 0) return;
    const idx = cats.findIndex(c => c.name === store.activeCategory);
    const prev = idx > 0 ? cats[idx - 1] : cats[cats.length - 1];
    store.activeCategory = prev.name;
    store.setCamera('default');
    scrollActiveCatIntoView();
  }
  function scrollTabsRight() {
    const cats = store.categories;
    if (!cats || cats.length === 0) return;
    const idx = cats.findIndex(c => c.name === store.activeCategory);
    const next = idx < cats.length - 1 ? cats[idx + 1] : cats[0];
    store.activeCategory = next.name;
    store.setCamera('default');
    scrollActiveCatIntoView();
  }
  function scrollActiveCatIntoView() {
    requestAnimationFrame(() => {
      if (!tabsEl) return;
      const activeBtn = tabsEl.querySelector('.tab.active');
      if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  }

  // ---- CLOTHING TOGGLE STATE ----
  let strippedRegions = $state({ head: false, body: false, bottom: false });

  async function toggleClothes(region) {
    if (strippedRegions[region]) {
      // Restore — send current appearance data + region key
      await store.wearClothes(store.appearance, region);
      strippedRegions[region] = false;
    } else {
      // Strip
      await store.removeClothes(region);
      strippedRegions[region] = true;
    }
  }

  // ---- MOUSE DRAG CAMERA ----
  let isDragging = $state(false);
  let lastMouseX = $state(0);
  let lastMouseY = $state(0);

  function handleMouseDown(e) {
    // Only drag on the game area (right side, outside the panel)
    if (e.target.closest('.panel')) return;
    if (e.button === 0) {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }
  }

  function handleMouseUp() {
    isDragging = false;
  }

  function handleMouseMove(e) {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMouseX;
    const deltaY = e.clientY - lastMouseY;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
      fetchNui('murderface_rotate', { deltaX, deltaY });
    }
  }

  function handleWheel(e) {
    // Only zoom on game area
    if (e.target.closest('.panel')) return;
    e.preventDefault();
    // Smooth zoom via orbital camera
    const delta = e.deltaY > 0 ? 1 : -1;
    fetchNui('murderface_zoom', { delta });
  }
</script>

{#if store.visible && screenMode}
<div class="app" style={isDev ? `background-image: url(${gtaBg});` : ''}
  onmousedown={handleMouseDown}
  onmousemove={handleMouseMove}
  onwheel={handleWheel}
  role="application">
  <!-- Left Panel with Glassmorphism -->
  <div class="panel">
    <!-- Top accent glow line -->
    <div class="panel-glow"></div>

    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <h1 class="title">{sections.length > 1 ? 'APPEARANCE' : screenMode === 'creator' ? 'CHARACTER' : screenMode === 'barber' ? 'BARBER' : screenMode === 'tattoo' ? 'TATTOO' : screenMode === 'outfits' ? 'OUTFITS' : 'CLOTHING'}</h1>
        <div class="location">
          {#if screenMode === 'creator'}
            <span class="store-name">Character Creation</span>
          {:else if screenMode === 'outfits'}
            <span class="store-name">Saved Outfits</span>
          {:else}
            <span class="store-name">Suburban</span>
            <span class="store-location">Del Perro Blvd</span>
          {/if}
        </div>
      </div>
      {#if screenMode !== 'creator' && screenMode !== 'outfits'}
        <div class="header-right">
          <div class="money-section">
            <span class="money-label">Shop Fee</span>
            <span class="money-value">${store.shopInfo.cost.toLocaleString()}</span>
          </div>
          <div class="money-section balance">
            <span class="money-label">Cash</span>
            <span class="money-value dim">${store.shopInfo.cash.toLocaleString()}</span>
          </div>
        </div>
      {/if}
    </div>

    <div class="divider"></div>

    <!-- Section Navigation (shown when 2+ sections enabled) -->
    {#if sections.length > 1}
      <div class="section-nav">
        {#each sections as sec}
          <button
            class="section-btn"
            class:active={screenMode === sec.id}
            onclick={() => { screenMode = sec.id; }}
          >{sec.label}</button>
        {/each}
      </div>
    {/if}

    {#if screenMode === 'creator'}
      <CharacterCreator {store} />
    {:else if screenMode === 'barber'}
      <BarberShop {store} />
    {:else if screenMode === 'tattoo'}
      <TattooShop {store} />
    {:else if screenMode === 'outfits'}
      <OutfitMenu {store} />
    {:else}

    <p class="section-desc" style="padding: 0 16px 6px;">Browse and purchase clothing items.</p>

    <!-- Clothing Toggle Buttons -->
    <div class="clothing-toggles">
      <button class="toggle-btn" class:stripped={strippedRegions.head} onclick={() => toggleClothes('head')}>{strippedRegions.head ? 'Restore Head' : 'Strip Head'}</button>
      <button class="toggle-btn" class:stripped={strippedRegions.body} onclick={() => toggleClothes('body')}>{strippedRegions.body ? 'Restore Top' : 'Strip Top'}</button>
      <button class="toggle-btn" class:stripped={strippedRegions.bottom} onclick={() => toggleClothes('bottom')}>{strippedRegions.bottom ? 'Restore Bottom' : 'Strip Bottom'}</button>
    </div>

    <!-- Search -->
    <div class="search-wrap" style="padding: 0 16px;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input class="search-input" type="text" placeholder="Search items..." bind:value={store.searchQuery} />
    </div>

    <!-- Category Tabs -->
    <div class="tabs-wrapper">
      <button class="tabs-arrow tabs-arrow-left" onclick={scrollTabsLeft}>‹</button>
      <div class="tabs" bind:this={tabsEl}>
        {#each store.categories as cat}
          {@const count = store.getItemsForCategory(cat.name).length}
          <button
            class="tab"
            class:active={store.activeCategory === cat.name}
            onclick={() => { store.activeCategory = cat.name; store.setCamera('default'); }}
          >
            {cat.name}
            {#if count > 0}<span class="tab-count">{count}</span>{/if}
          </button>
        {/each}
      </div>
      <button class="tabs-arrow tabs-arrow-right" onclick={scrollTabsRight}>›</button>
    </div>

    <!-- Item Grid -->
    <div class="grid">
      {#each getItems() as item (item.key)}
        <button
          class="card"
          class:selected={item.isSelected}
          onclick={() => handleItemClick(item)}
        >
          <div class="card-image">
            <img
              class="card-img"
              src={getClothingImageUrl(item.type, item.id, item.drawable, store.gender)}
              alt={item.label}
              loading="lazy"
              onerror={(e) => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex'; }}
            />
            <div class="card-placeholder" style="display:none">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.15">
                <path d="M20.38 3.46L16 2L12 5.5L8 2L3.62 3.46L2 8.5L5 12L2 15.5L3.62 20.54L8 22L12 18.5L16 22L20.38 20.54L22 15.5L19 12L22 8.5L20.38 3.46Z"/>
              </svg>
            </div>
          </div>
          <div class="card-info">
            <span class="card-label">{item.label}</span>
            {#if item.isSelected}<span class="card-equipped">Equipped</span>{/if}
          </div>
        </button>
      {/each}
    </div>

    <!-- Selected Detail Bar -->
    {#if getSelected()}
      {@const sel = getSelected()}
      <div class="detail-bar">
        <div class="detail-info">
          <span class="detail-label">SELECTED</span>
          <div class="detail-row">
            <span class="detail-name">{sel.label}</span>
          </div>
        </div>
        <div class="detail-controls">
          <div class="control-group">
            <span class="control-label">Drawable</span>
            <div class="control-nav">
              <button class="tex-btn" onclick={() => handleDrawableStep(-1)}>‹</button>
              <input class="drawable-input" type="number" min="0" value={sel.drawable}
                onchange={handleDrawableInput} />
              <button class="tex-btn" onclick={() => handleDrawableStep(1)}>›</button>
            </div>
          </div>
          <div class="control-group">
            <span class="control-label">Texture</span>
            <div class="control-nav">
              <button class="tex-btn" onclick={() => handleTextureChange(-1)}>‹</button>
              <span class="tex-value">{sel.texture} / {sel.maxTexture}</span>
              <button class="tex-btn" onclick={() => handleTextureChange(1)}>›</button>
            </div>
          </div>
        </div>
        <button class="remove-btn" title="Remove item"
          onclick={() => {
            if (sel.type === 'component') store.changeComponent(sel.id, 0, 0);
            else store.changeProp(sel.id, -1, -1);
          }}>✕</button>
      </div>
    {/if}

    {/if}

    <!-- Action Bar -->
    <div class="action-bar">
      {#if screenMode === 'creator'}
        <button class="btn btn-primary" onclick={() => store.save()}>Save Character</button>
        <button class="btn btn-exit" onclick={() => store.exit()}>Cancel</button>
      {:else if screenMode === 'barber'}
        <button class="btn btn-primary" onclick={() => store.save()}>Save</button>
        <button class="btn btn-exit" onclick={() => store.exit()}>Cancel</button>
      {:else if screenMode === 'tattoo'}
        <button class="btn btn-primary" onclick={() => store.save()}>Done</button>
        <button class="btn btn-exit" onclick={() => store.exit()}>Cancel</button>
      {:else if screenMode === 'outfits'}
        <button class="btn btn-primary" onclick={() => store.save()}>Done</button>
        <button class="btn btn-exit" onclick={() => store.exit()}>Close</button>
      {:else}
        <button class="btn btn-primary" onclick={() => store.save()}>Purchase</button>
        <button class="btn btn-outline" onclick={() => store.save()}>Save Outfit</button>
        <button class="btn btn-ghost" onclick={() => store.reset()}>Reset</button>
        <button class="btn btn-exit" onclick={() => store.exit()}>Exit</button>
      {/if}
    </div>
  </div>

  <!-- Camera Controls -->
  <div class="camera-pill">
    {#each [
      { label: 'Face', cam: 'head' },
      { label: 'Body', cam: 'body' },
      { label: 'Legs', cam: 'bottom' },
      { label: 'Full', cam: 'default' },
    ] as { label, cam }}
      <button
        class="cam-btn"
        class:active={store.activeCamera === cam}
        onclick={() => store.setCamera(cam)}
      >
        {#if store.activeCamera === cam}<span class="cam-dot"></span>{/if}
        {label}
      </button>
    {/each}
    <button class="cam-btn reset" onclick={() => store.turnAround()}>Spin</button>
  </div>
</div>
{/if}

<style>
  .app {
    width: 100vw;
    height: 100vh;
    background-size: cover;
    background-position: center;
    display: flex;
    position: relative;
    cursor: default;
  }

  .app:active {
    cursor: grabbing;
  }

  /* ============ PANEL — GLASSMORPHISM ============ */
  .panel {
    width: 440px;
    height: calc(100vh - 40px);
    margin: 20px;
    border-radius: var(--radius-lg);
    background: var(--bg-panel);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }

  .panel-glow {
    height: 2px;
    background: linear-gradient(90deg,
      transparent 0%,
      var(--accent) 25%,
      var(--accent) 75%,
      transparent 100%
    );
    opacity: 0.5;
    flex-shrink: 0;
  }

  /* ============ HEADER ============ */
  .header {
    display: flex;
    justify-content: space-between;
    padding: 20px 20px 16px;
    background: var(--bg-header);
    flex-shrink: 0;
  }

  .title {
    font-size: 24px;
    font-weight: 800;
    letter-spacing: 4px;
    margin-bottom: 6px;
  }

  .location { display: flex; gap: 8px; align-items: center; }
  .store-name { font-size: 16px; font-weight: 600; color: var(--accent); opacity: 0.9; letter-spacing: 0.3px; }
  .store-location { font-size: 15px; color: rgba(170, 170, 175, 1); }

  .header-right { text-align: right; }
  .money-section { margin-bottom: 4px; }
  .money-label { display: block; font-size: 10px; font-weight: 500; color: var(--text-muted); letter-spacing: 1px; }
  .money-value { font-size: 20px; font-weight: 700; }
  .money-value.dim { font-size: 14px; font-weight: 500; color: var(--text-secondary); }

  .divider {
    height: 1px;
    margin: 0 16px;
    background: var(--border);
    flex-shrink: 0;
  }

  /* ============ SECTION NAV ============ */
  .section-nav {
    display: flex;
    gap: 4px;
    padding: 8px 16px;
    flex-shrink: 0;
    overflow-x: auto;
    scroll-behavior: smooth;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .section-nav::-webkit-scrollbar { display: none; }

  .section-btn {
    flex: 1;
    min-width: 60px;
    padding: 10px 0;
    min-height: 38px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 600;
    font-family: var(--font);
    letter-spacing: 0.5px;
    color: var(--text-secondary);
    background: rgba(18, 19, 24, 0.8);
    border: 1px solid rgba(30, 32, 40, 0.4);
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
  }

  .section-btn:hover { color: var(--text-primary); border-color: rgba(60, 65, 78, 0.6); }
  .section-btn.active {
    color: var(--accent);
    background: rgba(0, 40, 36, 0.8);
    border-color: var(--accent-border);
  }

  /* ============ TABS ============ */
  .tabs-wrapper {
    display: flex;
    align-items: center;
    padding: 8px 8px 12px;
    flex-shrink: 0;
    gap: 4px;
  }

  .tabs-arrow {
    width: 32px;
    height: 36px;
    border-radius: 6px;
    background: rgba(18, 19, 24, 0.8);
    border: 1px solid rgba(30, 32, 40, 0.4);
    color: var(--text-secondary);
    font-size: 18px;
    cursor: pointer;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font);
    transition: all 0.15s;
  }
  .tabs-arrow:hover { color: var(--text-primary); border-color: rgba(60, 65, 78, 0.6); }

  .tabs {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    flex: 1;
    min-width: 0;
    scroll-behavior: smooth;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .tabs::-webkit-scrollbar { display: none; }

  .tab {
    padding: 9px 16px;
    min-height: 36px;
    border-radius: var(--radius-pill);
    font-size: 14px;
    font-weight: 500;
    font-family: var(--font);
    color: var(--text-secondary);
    background: rgba(18, 19, 24, 0.8);
    border: 1px solid rgba(35, 38, 48, 0.5);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  }

  .tab:hover { color: var(--text-primary); border-color: rgba(60, 65, 78, 0.6); background: rgba(28, 30, 38, 0.9); box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
  .tab-count {
    font-size: 10px;
    font-weight: 500;
    opacity: 0.5;
    margin-left: 3px;
  }

  .tab.active {
    color: var(--accent);
    font-weight: 600;
    background: rgba(0, 40, 36, 0.8);
    border-color: var(--accent-border);
  }

  /* ============ GRID ============ */
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: 200px;
    gap: 12px;
    padding: 0 16px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  .card {
    background: var(--bg-card);
    border: 1px solid rgba(25, 28, 36, 0.6);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: var(--font);
    min-height: 200px;
  }

  .card:hover {
    background: var(--bg-card-hover);
    border-color: var(--accent-border);
    transform: scale(1.02);
    box-shadow: 0 0 12px var(--accent-glow);
  }

  .card.selected {
    background: var(--bg-card-selected);
    border: 2px solid var(--accent-border);
    box-shadow: 0 0 20px var(--accent-glow), inset 0 0 20px var(--accent-glow);
  }

  .card-image {
    height: 155px;
    background: rgba(20, 22, 28, 0.8);
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .card-placeholder {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
  }

  .card-info {
    padding: 10px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
  .card.selected .card-label { color: var(--text-primary); font-weight: 700; }

  .card-equipped { font-size: 11px; font-weight: 600; color: var(--accent); letter-spacing: 0.5px; }

  /* ============ CLOTHING TOGGLES ============ */
  .clothing-toggles {
    display: flex; gap: 6px; padding: 0 16px 8px; flex-shrink: 0;
  }
  .toggle-btn {
    flex: 1; padding: 6px 0; border-radius: 6px;
    font-size: 11px; font-weight: 500; font-family: var(--font);
    color: var(--text-secondary); background: rgba(18, 19, 24, 0.8);
    border: 1px solid rgba(30, 32, 40, 0.4); cursor: pointer;
    transition: all 0.15s;
  }
  .toggle-btn:hover { color: var(--text-primary); border-color: var(--border-hover); }
  .toggle-btn:active { color: var(--accent); border-color: var(--accent-border); background: var(--accent-dim); }
  .toggle-btn.stripped { color: var(--red); border-color: var(--red-border); background: var(--red-dim); }

  .drawable-input {
    width: 50px; text-align: center; padding: 4px 6px;
    min-height: 32px;
    background: var(--bg-input); border: 1px solid var(--border);
    border-radius: 6px; color: var(--accent); font-size: 16px;
    font-family: var(--font); font-weight: 700; outline: none;
    -moz-appearance: textfield;
  }
  .drawable-input::-webkit-inner-spin-button,
  .drawable-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  .drawable-input:focus { border-color: var(--accent-border); }

  .detail-controls { display: flex; gap: 12px; align-items: center; }
  .control-group { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .control-label { font-size: 9px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; }
  .control-nav { display: flex; align-items: center; gap: 4px; }

  /* ============ DETAIL BAR ============ */
  .detail-bar {
    margin: 12px 16px;
    padding: 14px 18px;
    background: rgba(0, 14, 12, 0.8);
    border: 1px solid var(--accent-border);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    gap: 16px;
    flex-shrink: 0;
  }

  .detail-info { flex: 1; }
  .detail-label { font-size: 11px; font-weight: 700; color: var(--accent); opacity: 0.6; letter-spacing: 2px; }
  .detail-row { display: flex; gap: 12px; align-items: baseline; margin-top: 4px; }
  .detail-name { font-size: 17px; font-weight: 600; }
  .tex-btn {
    width: 32px; height: 32px;
    border-radius: 6px;
    background: rgba(0, 255, 235, 0.1);
    border: 1px solid var(--accent-border);
    color: var(--accent);
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font);
    transition: background 0.15s;
  }
  .tex-btn:hover { background: rgba(0, 255, 235, 0.2); }
  .tex-value { font-size: 18px; font-weight: 700; color: var(--accent); min-width: 55px; }

  .remove-btn {
    width: 36px; height: 36px;
    border-radius: var(--radius-sm);
    background: var(--red-dim);
    border: 1px solid var(--red-border);
    color: var(--red);
    font-size: 16px;
    cursor: pointer;
    font-family: var(--font);
    transition: background 0.15s;
  }
  .remove-btn:hover { background: rgba(255, 80, 80, 0.25); }

  /* ============ ACTION BAR ============ */
  .action-bar {
    display: flex;
    gap: 8px;
    padding: 12px 16px 16px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  .btn {
    padding: 12px 0;
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-weight: 600;
    font-family: var(--font);
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
  }

  .btn-primary {
    flex: 2;
    background: rgba(0, 35, 32, 0.9);
    border-color: var(--accent-border);
    color: var(--accent);
  }
  .btn-primary:hover { background: rgba(0, 50, 45, 0.9); }

  .btn-exit {
    flex: 1;
    background: rgba(40, 20, 20, 0.6);
    border-color: rgba(180, 60, 60, 0.2);
    color: rgba(220, 100, 100, 0.8);
  }
  .btn-exit:hover { background: rgba(60, 20, 20, 0.7); color: var(--red); }

  .btn-outline {
    flex: 1.5;
    background: transparent;
    border-color: var(--accent-border);
    color: var(--accent);
  }
  .btn-outline:hover { background: rgba(0, 255, 235, 0.08); }

  .btn-ghost {
    flex: 1;
    background: rgba(16, 18, 22, 0.8);
    border-color: rgba(40, 42, 50, 0.4);
    color: var(--text-secondary);
  }
  .btn-ghost:hover { color: var(--text-primary); border-color: var(--border-hover); }

  /* ============ CAMERA PILL ============ */
  .camera-pill {
    position: fixed;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
    width: 90px;
    background: rgba(9, 10, 14, 0.88);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border);
    border-radius: 44px;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 18px 0;
    gap: 6px;
  }

  .cam-btn {
    width: 76px;
    padding: 12px 0;
    min-height: 40px;
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 15px;
    font-weight: 500;
    font-family: var(--font);
    cursor: pointer;
    position: relative;
    transition: all 0.2s;
    border-radius: 8px;
  }

  .cam-btn:hover { color: var(--text-primary); background: rgba(255,255,255,0.04); }
  .cam-btn.active { color: var(--accent); font-weight: 600; background: var(--accent-glow); }

  .cam-dot {
    position: absolute;
    left: 4px;
    top: 50%;
    transform: translateY(-50%);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent);
  }

  .cam-btn.reset {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 6px;
    border-top: 1px solid var(--border);
    padding-top: 14px;
  }
  .cam-btn.reset:hover { color: var(--text-secondary); }
</style>
