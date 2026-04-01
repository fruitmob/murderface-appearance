<script>
  import { fetchNui } from '../lib/nui.js';

  /** @type {{ store: any }} */
  let { store } = $props();

  let outfits = $state([]);
  let loading = $state(true);
  let showSaveModal = $state(false);
  let outfitName = $state('');
  let importCode = $state('');
  let showImportModal = $state(false);
  let activeOutfitId = $state(null);
  let searchQuery = $state('');
  let confirmDeleteId = $state(null);
  let renamingId = $state(null);
  let renameValue = $state('');

  const isDev = !window.GetParentResourceName;

  $effect(() => {
    loadOutfits();
  });

  async function loadOutfits() {
    loading = true;
    if (isDev) {
      outfits = [
        { id: 1, name: 'Casual Friday', model: 'mp_m_freemode_01' },
        { id: 2, name: 'Business Meeting', model: 'mp_m_freemode_01' },
        { id: 3, name: 'Beach Day', model: 'mp_f_freemode_01' },
      ];
    } else {
      try {
        const result = await fetchNui('illenium-appearance:getOutfits');
        outfits = result || [];
      } catch { outfits = []; }
    }
    loading = false;
  }

  function filteredOutfits() {
    if (!searchQuery.trim()) return outfits;
    const q = searchQuery.toLowerCase();
    return outfits.filter(o => o.name.toLowerCase().includes(q));
  }

  async function wearOutfit(outfit) {
    activeOutfitId = outfit.id;
    await store.wearClothes(outfit, 'head');
    await store.wearClothes(outfit, 'body');
    await store.wearClothes(outfit, 'bottom');
  }

  async function deleteOutfit(id) {
    if (confirmDeleteId !== id) {
      confirmDeleteId = id;
      setTimeout(() => { if (confirmDeleteId === id) confirmDeleteId = null; }, 3000);
      return;
    }
    confirmDeleteId = null;
    if (isDev) {
      outfits = outfits.filter(o => o.id !== id);
    } else {
      await fetchNui('illenium-appearance:deleteOutfit', id);
      await loadOutfits();
    }
    if (activeOutfitId === id) activeOutfitId = null;
  }

  function startRename(outfit) {
    renamingId = outfit.id;
    renameValue = outfit.name;
  }

  function confirmRename(outfit) {
    if (!renameValue.trim()) { renamingId = null; return; }
    outfit.name = renameValue.trim();
    outfits = [...outfits]; // trigger reactivity
    renamingId = null;
    // In production, persist rename via NUI
    if (!isDev) {
      fetchNui('illenium-appearance:renameOutfit', { id: outfit.id, name: outfit.name });
    }
  }

  async function saveOutfit() {
    if (!outfitName.trim()) return;
    if (isDev) {
      outfits = [...outfits, { id: Date.now(), name: outfitName, model: 'mp_m_freemode_01' }];
    } else {
      await fetchNui('illenium-appearance:saveOutfit', {
        name: outfitName,
        model: store.appearance?.model,
        components: store.appearance?.components,
        props: store.appearance?.props,
      });
      await loadOutfits();
    }
    outfitName = '';
    showSaveModal = false;
  }

  async function generateCode(outfitId) {
    if (isDev) { alert('Code: ABCD123456'); return; }
    const code = await fetchNui('illenium-appearance:generateOutfitCode', outfitId);
    if (code) alert(`Outfit Code: ${code}`);
  }

  async function importOutfit() {
    if (!importCode.trim() || !outfitName.trim()) return;
    if (!isDev) {
      await fetchNui('illenium-appearance:importOutfitCode', { name: outfitName, code: importCode });
      await loadOutfits();
    }
    importCode = '';
    outfitName = '';
    showImportModal = false;
  }
</script>

<div class="outfit-menu">
  <!-- Top actions -->
  <div class="outfit-actions-top">
    <button class="outfit-action-btn save" onclick={() => showSaveModal = true}>
      + Save Current
    </button>
    <button class="outfit-action-btn import" onclick={() => showImportModal = true}>
      Import Code
    </button>
  </div>

  <p class="section-desc" style="padding: 0 16px 6px;">Save, load, and share your outfits.</p>

  <!-- Search (show when 4+ outfits) -->
  {#if outfits.length >= 4}
    <div class="search-wrap" style="padding: 0 16px 8px;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input class="search-input" type="text" placeholder="Search outfits..."
        bind:value={searchQuery} />
    </div>
  {/if}

  <!-- Outfit count -->
  {#if !loading && outfits.length > 0}
    <div class="outfit-count">{outfits.length} Saved Outfit{outfits.length !== 1 ? 's' : ''}</div>
  {/if}

  <!-- Outfit list -->
  <div class="outfit-list">
    {#if loading}
      <div class="empty-state">Loading outfits...</div>
    {:else if outfits.length === 0}
      <div class="empty-state">
        <p>No saved outfits</p>
        <p class="empty-hint">Save your current look to access it later</p>
      </div>
    {:else}
      {#each filteredOutfits() as outfit (outfit.id)}
        <div class="outfit-card" class:active={activeOutfitId === outfit.id}>
          <div class="outfit-info">
            {#if renamingId === outfit.id}
              <input class="rename-input" type="text" bind:value={renameValue}
                onkeydown={(e) => { if (e.key === 'Enter') confirmRename(outfit); if (e.key === 'Escape') renamingId = null; }}
                onclick={(e) => e.stopPropagation()} />
            {:else}
              <span class="outfit-name">
                {outfit.name}
                {#if activeOutfitId === outfit.id}
                  <span class="wearing-badge">Wearing</span>
                {/if}
              </span>
              <span class="outfit-model">
                {outfit.model === 'mp_f_freemode_01' ? 'Female' : 'Male'}
                <button class="rename-btn" onclick={() => startRename(outfit)} title="Rename">&#9998;</button>
              </span>
            {/if}
          </div>
          <div class="outfit-btns">
            {#if renamingId === outfit.id}
              <button class="o-btn wear" onclick={() => confirmRename(outfit)}>Save</button>
              <button class="o-btn share" onclick={() => renamingId = null}>Cancel</button>
            {:else}
              <button class="o-btn wear" onclick={() => wearOutfit(outfit)}>Wear</button>
              <button class="o-btn share" onclick={() => generateCode(outfit.id)}>Share</button>
              <button class="o-btn delete" class:confirming={confirmDeleteId === outfit.id}
                onclick={() => deleteOutfit(outfit.id)}>
                {confirmDeleteId === outfit.id ? 'Delete?' : 'Del'}
              </button>
            {/if}
          </div>
        </div>
      {/each}
      {#if searchQuery && filteredOutfits().length === 0}
        <div class="empty-state">No outfits match "{searchQuery}"</div>
      {/if}
    {/if}
  </div>

  <!-- Save Modal -->
  {#if showSaveModal}
    <div class="modal-overlay" onclick={() => showSaveModal = false}>
      <div class="modal" onclick={(e) => e.stopPropagation()}>
        <h3 class="modal-title">Save Outfit</h3>
        <input class="modal-input" type="text" placeholder="Outfit name..."
          bind:value={outfitName}
          onkeydown={(e) => e.key === 'Enter' && saveOutfit()} />
        <div class="modal-actions">
          <button class="modal-btn primary" onclick={saveOutfit}>Save</button>
          <button class="modal-btn cancel" onclick={() => showSaveModal = false}>Cancel</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Import Modal -->
  {#if showImportModal}
    <div class="modal-overlay" onclick={() => showImportModal = false}>
      <div class="modal" onclick={(e) => e.stopPropagation()}>
        <h3 class="modal-title">Import Outfit</h3>
        <input class="modal-input" type="text" placeholder="Outfit name..."
          bind:value={outfitName} />
        <input class="modal-input" type="text" placeholder="Paste outfit code..."
          bind:value={importCode}
          onkeydown={(e) => e.key === 'Enter' && importOutfit()} />
        <div class="modal-actions">
          <button class="modal-btn primary" onclick={importOutfit}>Import</button>
          <button class="modal-btn cancel" onclick={() => showImportModal = false}>Cancel</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .outfit-menu { display: flex; flex-direction: column; flex: 1; min-height: 0; }

  .outfit-actions-top {
    display: flex; gap: 8px; padding: 8px 16px 12px; flex-shrink: 0;
  }

  .outfit-action-btn {
    flex: 1; padding: 10px; border-radius: var(--radius-sm);
    font-size: 13px; font-weight: 600; font-family: var(--font);
    cursor: pointer; transition: all 0.15s; border: 1px solid transparent;
  }
  .outfit-action-btn.save { background: var(--accent-dim); color: var(--accent); border-color: var(--accent-border); }
  .outfit-action-btn.save:hover { background: rgba(0, 255, 235, 0.2); }
  .outfit-action-btn.import { background: rgba(30, 32, 40, 0.8); color: var(--text-secondary); border-color: var(--border); }
  .outfit-action-btn.import:hover { color: var(--text-primary); }

  .outfit-count {
    padding: 0 16px 6px; font-size: 11px; font-weight: 500;
    color: var(--text-muted); flex-shrink: 0;
  }

  .outfit-list { flex: 1; overflow-y: auto; padding: 0 16px 12px; min-height: 0; }

  .outfit-card {
    display: flex; justify-content: space-between; align-items: center;
    padding: 14px 16px; margin-bottom: 8px;
    background: var(--bg-card); border: 1px solid rgba(25, 28, 36, 0.6);
    border-radius: var(--radius-md); transition: all 0.15s;
  }
  .outfit-card:hover { border-color: var(--border-hover); background: var(--bg-card-hover); }
  .outfit-card.active {
    border-color: rgba(0, 255, 235, 0.3); background: rgba(0, 18, 16, 0.6);
    border-left: 3px solid var(--accent);
  }

  .outfit-name { font-size: 14px; font-weight: 600; color: var(--text-primary); display: block; }
  .outfit-model { font-size: 11px; color: var(--text-muted); margin-top: 3px; display: flex; align-items: center; gap: 6px; }

  .wearing-badge {
    font-size: 9px; font-weight: 600; color: var(--accent);
    background: var(--accent-dim); border: 1px solid var(--accent-border);
    padding: 1px 6px; border-radius: var(--radius-pill); margin-left: 6px;
  }

  .rename-btn {
    background: none; border: none; color: var(--text-muted);
    cursor: pointer; font-size: 12px; padding: 0; opacity: 0;
    transition: opacity 0.15s;
  }
  .outfit-card:hover .rename-btn { opacity: 0.6; }
  .rename-btn:hover { opacity: 1; color: var(--accent); }

  .rename-input {
    width: 100%; padding: 4px 8px;
    background: var(--bg-input); border: 1px solid var(--accent-border);
    border-radius: 4px; color: var(--text-primary);
    font-size: 13px; font-family: var(--font); outline: none;
  }

  .outfit-btns { display: flex; gap: 6px; }
  .o-btn {
    padding: 6px 10px; border-radius: 6px;
    font-size: 11px; font-weight: 600; font-family: var(--font);
    cursor: pointer; border: 1px solid transparent; transition: all 0.15s;
  }
  .o-btn.wear { background: rgba(0, 180, 165, 0.25); color: var(--accent); border-color: var(--accent-border); font-weight: 700; }
  .o-btn.wear:hover { background: rgba(0, 200, 180, 0.35); }
  .o-btn.share { background: rgba(30, 32, 40, 0.8); color: var(--text-secondary); border-color: var(--border); }
  .o-btn.share:hover { color: var(--text-primary); }
  .o-btn.delete { background: var(--red-dim); color: var(--red); border-color: var(--red-border); }
  .o-btn.delete:hover { background: rgba(255, 80, 80, 0.25); }
  .o-btn.delete.confirming { background: rgba(255, 40, 40, 0.4); border-color: var(--red); animation: pulse-red 0.6s ease-in-out; }
  @keyframes pulse-red { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }

  .empty-state { text-align: center; padding: 40px 16px; color: var(--text-muted); font-size: 14px; }
  .empty-hint { font-size: 12px; margin-top: 8px; opacity: 0.6; }

  /* ---- MODALS ---- */
  .modal-overlay {
    position: absolute; inset: 0; z-index: 10;
    background: rgba(0, 0, 0, 0.6);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(4px);
  }

  .modal {
    width: 320px; padding: 24px;
    background: rgba(14, 16, 22, 0.98);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
  }

  .modal-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 16px; }

  .modal-input {
    width: 100%; padding: 10px 12px; margin-bottom: 10px;
    background: var(--bg-input); border: 1px solid var(--border);
    border-radius: var(--radius-sm); color: var(--text-primary);
    font-size: 14px; font-family: var(--font); outline: none;
    box-sizing: border-box;
  }
  .modal-input:focus { border-color: var(--accent-border); }
  .modal-input::placeholder { color: var(--text-muted); }

  .modal-actions { display: flex; gap: 8px; margin-top: 16px; }
  .modal-btn {
    flex: 1; padding: 10px; border-radius: var(--radius-sm);
    font-size: 14px; font-weight: 600; font-family: var(--font);
    cursor: pointer; border: 1px solid transparent; transition: all 0.15s;
  }
  .modal-btn.primary { background: var(--accent-dim); color: var(--accent); border-color: var(--accent-border); }
  .modal-btn.primary:hover { background: rgba(0, 255, 235, 0.2); }
  .modal-btn.cancel { background: rgba(30, 32, 40, 0.8); color: var(--text-secondary); border-color: var(--border); }
</style>
