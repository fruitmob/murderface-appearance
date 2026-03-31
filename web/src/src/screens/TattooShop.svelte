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
  let previewingTattoo = $state(null);

  // Get tattoos for the active zone from settings
  function getTattoos() {
    const items = store.settings?.tattoos?.items;
    if (!items) return [];
    return items[activeZone] || [];
  }

  // Check if a tattoo is currently applied
  function isApplied(tattoo) {
    const applied = store.appearance?.tattoos?.[activeZone];
    if (!applied) return false;
    return applied.some(t => t.name === tattoo.name);
  }

  async function handleApply(tattoo) {
    const currentZoneTattoos = [...(store.appearance?.tattoos?.[activeZone] || [])];
    if (!isApplied(tattoo)) {
      currentZoneTattoos.push(tattoo);
    }
    const updatedTattoos = { ...store.appearance?.tattoos, [activeZone]: currentZoneTattoos };
    await store.applyTattoo(tattoo, updatedTattoos);
  }

  async function handleRemove(tattoo) {
    await store.deleteTattoo(tattoo);
  }

  async function handlePreview(tattoo) {
    previewingTattoo = tattoo;
    await store.previewTattoo(store.appearance?.tattoos, tattoo);
  }
</script>

<div class="tattoo-shop">
  <!-- Zone tabs -->
  <div class="zone-tabs">
    {#each ZONES as zone}
      <button class="zone-tab" class:active={activeZone === zone.id}
        onclick={() => { activeZone = zone.id; store.setCamera(zone.id === 'ZONE_HEAD' ? 'head' : zone.id.includes('LEG') ? 'bottom' : 'body'); }}>
        {zone.label}
      </button>
    {/each}
  </div>

  <!-- Tattoo list -->
  <div class="tattoo-list">
    {#each getTattoos() as tattoo (tattoo.name)}
      {@const applied = isApplied(tattoo)}
      <div class="tattoo-item" class:applied>
        <div class="tattoo-info">
          <span class="tattoo-name">{tattoo.label || tattoo.name}</span>
          <span class="tattoo-collection">{tattoo.collection}</span>
        </div>
        <div class="tattoo-actions">
          {#if applied}
            <button class="tat-btn remove" onclick={() => handleRemove(tattoo)}>Remove</button>
          {:else}
            <button class="tat-btn preview" onclick={() => handlePreview(tattoo)}>Preview</button>
            <button class="tat-btn apply" onclick={() => handleApply(tattoo)}>Apply</button>
          {/if}
        </div>
      </div>
    {:else}
      <div class="empty-state">
        <p>No tattoos available for this zone</p>
      </div>
    {/each}
  </div>
</div>

<style>
  .tattoo-shop { display: flex; flex-direction: column; flex: 1; min-height: 0; }

  .zone-tabs {
    display: flex; gap: 6px; padding: 6px 16px 10px;
    overflow-x: auto; flex-shrink: 0;
    scroll-behavior: smooth;
    mask-image: linear-gradient(to right, black 88%, transparent 100%);
    -webkit-mask-image: linear-gradient(to right, black 88%, transparent 100%);
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

  .tattoo-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 14px; margin-bottom: 6px;
    background: var(--bg-card); border: 1px solid rgba(25, 28, 36, 0.6);
    border-radius: var(--radius-sm); transition: all 0.15s;
  }
  .tattoo-item:hover { border-color: var(--border-hover); background: var(--bg-card-hover); }
  .tattoo-item.applied { border-color: rgba(0, 255, 235, 0.3); background: rgba(0, 18, 16, 0.6); }

  .tattoo-name { font-size: 13px; font-weight: 600; color: var(--text-primary); display: block; }
  .tattoo-collection { font-size: 10px; color: var(--text-muted); margin-top: 2px; display: block; }

  .tattoo-actions { display: flex; gap: 6px; }

  .tat-btn {
    padding: 5px 10px; border-radius: 6px;
    font-size: 11px; font-weight: 600; font-family: var(--font);
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
