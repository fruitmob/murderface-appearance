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

  // Mock outfits for dev
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
        { id: 3, name: 'Beach Day', model: 'mp_m_freemode_01' },
      ];
    } else {
      try {
        const result = await fetchNui('illenium-appearance:getOutfits');
        outfits = result || [];
      } catch { outfits = []; }
    }
    loading = false;
  }

  async function wearOutfit(outfit) {
    await store.wearClothes(outfit, 'head');
    await store.wearClothes(outfit, 'body');
    await store.wearClothes(outfit, 'bottom');
  }

  async function deleteOutfit(id) {
    if (isDev) {
      outfits = outfits.filter(o => o.id !== id);
    } else {
      await fetchNui('illenium-appearance:deleteOutfit', id);
      await loadOutfits();
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
      {#each outfits as outfit (outfit.id)}
        <div class="outfit-card">
          <div class="outfit-info">
            <span class="outfit-name">{outfit.name}</span>
            <span class="outfit-model">{outfit.model === 'mp_f_freemode_01' ? 'Female' : 'Male'}</span>
          </div>
          <div class="outfit-btns">
            <button class="o-btn wear" onclick={() => wearOutfit(outfit)}>Wear</button>
            <button class="o-btn share" onclick={() => generateCode(outfit.id)}>Share</button>
            <button class="o-btn delete" onclick={() => deleteOutfit(outfit.id)}>Del</button>
          </div>
        </div>
      {/each}
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
    padding: 0 16px 6px;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .outfit-list { flex: 1; overflow-y: auto; padding: 0 16px 12px; min-height: 0; }

  .outfit-card {
    display: flex; justify-content: space-between; align-items: center;
    padding: 14px 16px; margin-bottom: 8px;
    background: var(--bg-card); border: 1px solid rgba(25, 28, 36, 0.6);
    border-radius: var(--radius-md); transition: all 0.15s;
  }
  .outfit-card:hover { border-color: var(--border-hover); background: var(--bg-card-hover); }

  .outfit-name { font-size: 14px; font-weight: 600; color: var(--text-primary); display: block; }
  .outfit-model { font-size: 11px; color: var(--text-muted); margin-top: 3px; display: block; }

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
