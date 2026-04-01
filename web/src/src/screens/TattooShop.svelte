<script>
  /** @type {{ store: any }} */
  let { store } = $props();

  const ZONES = [
    { id: 'ZONE_TORSO', label: 'Torso' },
    { id: 'ZONE_HEAD', label: 'Head' },
    { id: 'ZONE_LEFT_ARM', label: 'Left Arm' },
    { id: 'ZONE_RIGHT_ARM', label: 'Right Arm' },
    { id: 'ZONE_LEFT_LEG', label: 'Left Leg' },
    { id: 'ZONE_RIGHT_LEG', label: 'Right Leg' },
  ];

  let activeZone = $state('ZONE_TORSO');
  let expandedTattoo = $state(null);
  let searchQuery = $state('');
  let opacityValues = $state({});

  function getTattooOpacity(tattoo) {
    const key = tattoo.name + activeZone;
    return opacityValues[key] ?? tattoo.opacity ?? 1;
  }

  function setTattooOpacity(tattoo, val) {
    const key = tattoo.name + activeZone;
    opacityValues[key] = parseFloat(val);
  }

  function getTattoos() {
    const items = store.settings?.tattoos?.items;
    if (!items) return [];
    let list = items[activeZone] || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        (t.label || t.name || '').toLowerCase().includes(q) ||
        (t.collection || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  // Group tattoos by collection
  function getGroupedTattoos() {
    const tattoos = getTattoos();
    const groups = {};
    for (const t of tattoos) {
      const col = t.collection || 'Other';
      if (!groups[col]) groups[col] = [];
      groups[col].push(t);
    }
    return Object.entries(groups);
  }

  function isApplied(tattoo) {
    const applied = store.appearance?.tattoos?.[activeZone];
    if (!applied) return false;
    return applied.some(t => t.name === tattoo.name);
  }

  function toggleExpand(tattoo) {
    // Applied tattoos are always expanded, so only toggle unapplied
    if (!isApplied(tattoo)) {
      expandedTattoo = expandedTattoo === tattoo.name ? null : tattoo.name;
    }
  }

  async function handleApply(tattoo) {
    const withOpacity = { ...tattoo, opacity: getTattooOpacity(tattoo) };
    const currentZoneTattoos = [...(store.appearance?.tattoos?.[activeZone] || [])];
    if (!isApplied(tattoo)) {
      currentZoneTattoos.push(withOpacity);
    }
    const updatedTattoos = { ...store.appearance?.tattoos, [activeZone]: currentZoneTattoos };
    await store.applyTattoo(withOpacity, updatedTattoos);
  }

  async function handleRemove(tattoo) {
    // Build updated tattoos with this tattoo filtered out
    const currentZoneTattoos = (store.appearance?.tattoos?.[activeZone] || [])
      .filter(t => t.name !== tattoo.name);
    const updatedTattoos = { ...store.appearance?.tattoos, [activeZone]: currentZoneTattoos };
    await store.deleteTattoo(updatedTattoos);
  }

  async function handlePreview(tattoo) {
    const withOpacity = { ...tattoo, opacity: getTattooOpacity(tattoo) };
    await store.previewTattoo(store.appearance?.tattoos, withOpacity);
  }

  let zoneNavEl;
  function scrollZonesLeft() { if (zoneNavEl) zoneNavEl.scrollLeft -= 100; }
  function scrollZonesRight() { if (zoneNavEl) zoneNavEl.scrollLeft += 100; }
</script>

<div class="tattoo-shop">
  <!-- Zone tabs with scroll arrows -->
  <div class="zone-nav-wrap">
    <button class="nav-arrow" onclick={scrollZonesLeft}>&#8249;</button>
    <div class="zone-tabs" bind:this={zoneNavEl}>
      {#each ZONES as zone}
        <button class="zone-tab" class:active={activeZone === zone.id}
          onclick={() => { activeZone = zone.id; expandedTattoo = null; store.setCamera(zone.id === 'ZONE_HEAD' ? 'head' : zone.id.includes('LEG') ? 'bottom' : 'body'); }}>
          {zone.label}
        </button>
      {/each}
    </div>
    <button class="nav-arrow" onclick={scrollZonesRight}>&#8250;</button>
  </div>

  <p class="section-desc" style="padding: 0 16px 6px;">Select a zone and browse tattoos. Tap a tattoo card to expand and adjust its opacity.</p>

  <!-- Search -->
  <div class="search-wrap" style="padding: 0 16px;">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    <input class="search-input" type="text" placeholder="Search tattoos..."
      bind:value={searchQuery} />
  </div>

  <!-- Tattoo list grouped by collection -->
  <div class="tattoo-list">
    {#each getGroupedTattoos() as [collection, tattoos]}
      <div class="collection-header">{collection}</div>
      {#each tattoos as tattoo (tattoo.name)}
        {@const applied = isApplied(tattoo)}
        {@const expanded = expandedTattoo === tattoo.name || applied}
        <div class="tattoo-item" class:applied class:expanded
          onclick={() => toggleExpand(tattoo)}>
          <div class="tattoo-row">
            <div class="tattoo-info">
              <span class="tattoo-name">{tattoo.label || tattoo.name}</span>
              {#if applied}<span class="applied-badge">Applied</span>{/if}
            </div>
            <div class="tattoo-actions" onclick={(e) => e.stopPropagation()}>
              {#if applied}
                <button class="tat-btn remove" onclick={() => handleRemove(tattoo)}>Remove</button>
              {:else}
                <button class="tat-btn preview" onclick={() => handlePreview(tattoo)}>Preview</button>
                <button class="tat-btn apply" onclick={() => handleApply(tattoo)}>Apply</button>
              {/if}
            </div>
          </div>
          {#if expanded}
            <div class="tattoo-opacity" onclick={(e) => e.stopPropagation()}>
              <label class="opacity-label">
                <span>Opacity</span>
                <span class="opacity-value">{(getTattooOpacity(tattoo) * 100).toFixed(0)}%</span>
              </label>
              <input type="range" class="slider accent" min="0.1" max="1" step="0.1"
                value={getTattooOpacity(tattoo)}
                oninput={(e) => { setTattooOpacity(tattoo, e.target.value); handlePreview(tattoo); }} />
            </div>
          {/if}
        </div>
      {/each}
    {:else}
      <div class="empty-state">
        <p>{searchQuery ? 'No tattoos match your search' : 'No tattoos available for this zone'}</p>
      </div>
    {/each}
  </div>
</div>

<style>
  .tattoo-shop { display: flex; flex-direction: column; flex: 1; min-height: 0; }

  .zone-nav-wrap {
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
  .zone-tabs {
    display: flex; gap: 6px; flex: 1;
    overflow-x: auto;
    scroll-behavior: smooth;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .zone-tabs::-webkit-scrollbar { display: none; }

  .zone-tab {
    padding: 7px 14px; border-radius: var(--radius-pill);
    font-size: 12px; font-weight: 500; font-family: var(--font);
    color: var(--text-secondary); background: rgba(18, 19, 24, 0.8);
    border: 1px solid rgba(30, 32, 40, 0.4); cursor: pointer;
    white-space: nowrap; transition: all 0.2s;
  }
  .zone-tab:hover { color: var(--text-primary); }
  .zone-tab.active { color: var(--accent); font-weight: 600; background: rgba(0, 40, 36, 0.8); border-color: var(--accent-border); }

  .tattoo-list { flex: 1; overflow-y: auto; padding: 0 16px 12px; min-height: 0; }

  .collection-header {
    font-size: 10px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.5px; color: var(--text-muted);
    padding: 10px 0 4px; margin-top: 4px;
    border-bottom: 1px solid var(--border);
  }
  .collection-header:first-child { margin-top: 0; }

  .tattoo-item {
    padding: 10px 12px; margin-bottom: 4px;
    background: var(--bg-card); border: 1px solid rgba(25, 28, 36, 0.6);
    border-radius: var(--radius-sm); transition: all 0.15s; cursor: pointer;
  }
  .tattoo-item:hover { border-color: var(--border-hover); background: var(--bg-card-hover); }
  .tattoo-item.applied { border-color: rgba(0, 255, 235, 0.3); background: rgba(0, 18, 16, 0.6); }
  .tattoo-item.expanded { border-color: var(--border-hover); }

  .tattoo-row { display: flex; justify-content: space-between; align-items: center; }
  .tattoo-name { font-size: 12px; font-weight: 600; color: var(--text-primary); }
  .applied-badge {
    font-size: 9px; font-weight: 600; color: var(--accent);
    background: var(--accent-dim); border: 1px solid var(--accent-border);
    padding: 1px 6px; border-radius: var(--radius-pill); margin-left: 6px;
  }

  .tattoo-actions { display: flex; gap: 4px; }

  .tattoo-opacity {
    display: flex; align-items: center; gap: 8px;
    margin-top: 8px; padding-top: 8px;
    border-top: 1px solid rgba(35, 38, 48, 0.3);
  }
  .opacity-label { display: flex; gap: 6px; font-size: 11px; color: var(--text-secondary); min-width: 90px; }
  .opacity-value { font-size: 11px; font-weight: 600; color: var(--accent); }
  .tattoo-opacity .slider { flex: 1; height: 4px; -webkit-appearance: none; appearance: none; background: rgba(30,32,40,0.8); border-radius: 2px; outline: none; cursor: pointer; }
  .tattoo-opacity .slider::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: var(--accent); border: 2px solid rgba(0,100,90,0.5); cursor: pointer; }

  .tat-btn {
    padding: 4px 8px; border-radius: 6px;
    font-size: 10px; font-weight: 600; font-family: var(--font);
    cursor: pointer; border: 1px solid transparent; transition: all 0.15s;
  }
  .tat-btn.preview { background: rgba(30, 32, 40, 0.8); color: var(--text-secondary); border-color: var(--border); }
  .tat-btn.preview:hover { color: var(--text-primary); }
  .tat-btn.apply { background: var(--accent-dim); color: var(--accent); border-color: var(--accent-border); }
  .tat-btn.apply:hover { background: rgba(0, 255, 235, 0.2); }
  .tat-btn.remove { background: var(--red-dim); color: var(--red); border-color: var(--red-border); }
  .tat-btn.remove:hover { background: rgba(255, 80, 80, 0.25); }

  .empty-state { text-align: center; padding: 40px 16px; color: var(--text-muted); font-size: 13px; }
</style>
