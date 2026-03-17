/* ============================================
 Returns list + filters + glass modal
 ============================================ */


  // ── Returns (รับคืนสินค้า) ─────────────────
Pages._returnsData = [];
Pages._retPage = 1;
Pages._retPerPage = 50;
Pages._inspectPending = {};
Pages._retFilters = { search: '', types: [], completion: '', inspection: '', dateFrom: null, dateTo: null };
Pages._retViewMode = 'docs';
Pages._retAllItems = [];
Pages.returns = async function(container) {
  try {
    const data = await App.api('returns.php');
    Pages._returnsData = data.items || [];
  } catch (e) { console.warn('Returns API:', e); Pages._returnsData = []; }

  Pages._retPage = 1;
  Pages._retViewMode = localStorage.getItem('retViewMode') || 'docs';
  Pages._retAllItems = [];
  Pages._retFilters = { search: '', types: [], completion: '', inspection: '', dateFrom: null, dateTo: null };
  Pages._retRenderView(container);
};
Pages._getFilteredReturns = function() {
  const f = Pages._retFilters;
  return Pages._returnsData.filter(r => {
    if (f.search) { const q = f.search.toLowerCase(); if (![r.receipt_number, r.branch_name, r.return_type, r.return_date].join(' ').toLowerCase().includes(q)) return false; }
    if (f.types.length > 0 && !f.types.includes(r.return_type || '')) return false;
    if (f.completion) {
      const filled = parseInt(r.filled_count) || 0, total = parseInt(r.item_count) || 0;
      const isComplete = total > 0 && filled === total;
      if (f.completion === 'complete' && !isComplete) return false;
      if (f.completion === 'incomplete' && isComplete) return false;
    }
    if (f.inspection) {
      const tot = parseInt(r.item_count) || 0, confirmed = parseInt(r.confirmed_count) || 0;
      const allConfirmed = tot > 0 && confirmed === tot;
      if (f.inspection === 'checked' && !allConfirmed) return false;
      if (f.inspection === 'unchecked' && allConfirmed) return false;
      if (f.inspection === 'partial' && (confirmed === 0 || allConfirmed)) return false;
    }
    if (f.dateFrom && f.dateTo) { if (r.return_date < f.dateFrom || r.return_date > f.dateTo) return false; }
    return true;
  });
};
Pages._retRenderView = async function(container) {
  const f = Pages._retFilters;
  const vm = Pages._retViewMode;
  const hasFilter = !!(f.search || f.types.length > 0 || f.completion || f.inspection || (f.dateFrom && f.dateTo));
  const types = [...new Set(Pages._returnsData.map(r => r.return_type).filter(Boolean))];

  // Date label
  let dateLabel = 'วันที่: ทั้งหมด';
  if (f.dateFrom && f.dateTo) {
    const today = new Date().toISOString().slice(0, 10);
    const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (f.dateFrom === f.dateTo) dateLabel = f.dateFrom === today ? 'วันที่: วันนี้' : f.dateFrom === yest ? 'วันที่: เมื่อวาน' : `วันที่: ${f.dateFrom}`;
    else dateLabel = `วันที่: ${f.dateFrom} — ${f.dateTo}`;
  }
  const typeLabel = f.types.length === 0 ? 'ประเภท: ทั้งหมด' : `ประเภท: ${f.types.length} รายการ`;

  // Toggle button styles
  const activeStyle = 'background:var(--gradient-blue);color:#fff;border:1px solid transparent;font-weight:600';
  const inactiveStyle = 'background:transparent;color:var(--text-secondary);border:1px solid var(--border-color)';


  container.innerHTML = `
    <div class="filter-toolbar">
      <div class="filter-row">
        <!-- Settings Advanced button -->
        <button class="btn-settings-adv" id="btnSettingsAdv">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          ตัวกรองขั้นสูง
          ${hasFilter ? '<span class="filter-dot"></span>' : ''}
        </button>

        <!-- Clear filters (shown when active) -->
        <button class="btn btn-outline btn-sm filter-clear-btn" id="btnClearFilters" title="ล้างตัวกรองทั้งหมด" style="${hasFilter ? '' : 'display:none'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ล้างตัวกรอง
        </button>

        <div style="display:flex;gap:8px;align-items:center;margin-left:auto">
          <div style="display:inline-flex;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.12)">
            <button class="retViewToggle" data-view="docs" style="${vm==='docs' ? activeStyle : inactiveStyle};padding:5px 14px;font-size:0.78rem;cursor:pointer;border-radius:8px 0 0 8px;transition:all .2s">📄 เอกสาร</button>
            <button class="retViewToggle" data-view="items" style="${vm==='items' ? activeStyle : inactiveStyle};padding:5px 14px;font-size:0.78rem;cursor:pointer;border-radius:0 8px 8px 0;transition:all .2s">📦 รายการสินค้า</button>
          </div>
          <span style="font-size:0.82rem;color:var(--text-muted)" id="retTotalCount"></span>
          <button class="btn btn-outline btn-sm" id="btnBulkImport">📥 Import</button>
          <button class="btn btn-primary btn-sm" id="btnAddReturn" style="gap:4px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            เพิ่มใบรับคืน
          </button>
        </div>
      </div>
    </div>

    <!-- Glass Filter Modal -->
    <div class="glass-overlay" id="retFilterOverlay">
      <div class="glass-modal">
        <div class="glass-modal-header">
          <div class="glass-modal-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            ตัวกรองขั้นสูง
          </div>
          <button class="glass-modal-close" id="btnCloseFilter">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Search -->
        <div class="glass-filter-group">
          <label class="glass-filter-label">🔍 ค้นหา</label>
          <input type="text" class="glass-filter-input" id="gfSearch" placeholder="ค้นหาเลขที่, สินค้า, สาขา..." value="${App.escapeHTML(f.search)}">
        </div>

        <!-- Date -->
        <div class="glass-filter-group">
          <label class="glass-filter-label">📅 วันที่</label>
          <div class="glass-preset-chips" id="gfDateChips">
            <span class="glass-chip${!f.dateFrom ? ' active' : ''}" data-preset="all">ทั้งหมด</span>
            <span class="glass-chip" data-preset="today">วันนี้</span>
            <span class="glass-chip" data-preset="yesterday">เมื่อวาน</span>
            <span class="glass-chip" data-preset="7days">7 วัน</span>
            <span class="glass-chip" data-preset="thisMonth">เดือนนี้</span>
            <span class="glass-chip" data-preset="lastMonth">เดือนที่แล้ว</span>
            <span class="glass-chip" data-preset="custom">กำหนดเอง</span>
          </div>
          <div class="glass-date-row" id="gfCustomDate" style="display:none">
            <label>จาก</label>
            <input type="date" class="glass-filter-input" id="gfDateFrom" value="${f.dateFrom || ''}" style="flex:1">
            <label>ถึง</label>
            <input type="date" class="glass-filter-input" id="gfDateTo" value="${f.dateTo || ''}" style="flex:1">
          </div>
        </div>

        <!-- Type + Completion + Inspection in grid -->
        <div class="glass-filter-grid">
          <div class="glass-filter-group">
            <label class="glass-filter-label">📦 ประเภท</label>
            <div class="glass-checkbox-list" id="gfTypeList">
              <label class="glass-checkbox-item"><input type="checkbox" class="gf-type-cb" value="" ${f.types.length === 0 ? 'checked' : ''}> ทั้งหมด</label>
              ${types.map(t => `<label class="glass-checkbox-item"><input type="checkbox" class="gf-type-cb" value="${App.escapeHTML(t)}" ${f.types.includes(t) ? 'checked' : ''}> ${App.escapeHTML(t)}</label>`).join('')}
            </div>
          </div>
          <div>
            <div class="glass-filter-group">
              <label class="glass-filter-label">📊 สถานะข้อมูล</label>
              <div class="glass-dropdown" id="gfCompletion">
                <button type="button" class="glass-dropdown-trigger" data-value="${f.completion || ''}">
                  <span class="gd-label">${{'':'ทั้งหมด','complete':'✅ ครบ','incomplete':'⚠️ ไม่ครบ'}[f.completion||'']}</span>
                  <svg class="glass-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="glass-dropdown-panel">
                  <div class="glass-dropdown-option${!f.completion ? ' selected' : ''}" data-value=""><span class="gd-check">${!f.completion ? '✓' : ''}</span> ทั้งหมด</div>
                  <div class="glass-dropdown-option${f.completion==='complete' ? ' selected' : ''}" data-value="complete"><span class="gd-check">${f.completion==='complete' ? '✓' : ''}</span> ✅ ครบ</div>
                  <div class="glass-dropdown-option${f.completion==='incomplete' ? ' selected' : ''}" data-value="incomplete"><span class="gd-check">${f.completion==='incomplete' ? '✓' : ''}</span> ⚠️ ไม่ครบ</div>
                </div>
              </div>
            </div>
            <div class="glass-filter-group">
              <label class="glass-filter-label">🔎 ตรวจสอบ</label>
              <div class="glass-dropdown" id="gfInspection">
                <button type="button" class="glass-dropdown-trigger" data-value="${f.inspection || ''}">
                  <span class="gd-label">${{'':'ทั้งหมด','checked':'✅ ตรวจแล้ว','partial':'🔄 ตรวจบางส่วน','unchecked':'⬜ ยังไม่ตรวจ'}[f.inspection||'']}</span>
                  <svg class="glass-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="glass-dropdown-panel">
                  <div class="glass-dropdown-option${!f.inspection ? ' selected' : ''}" data-value=""><span class="gd-check">${!f.inspection ? '✓' : ''}</span> ทั้งหมด</div>
                  <div class="glass-dropdown-option${f.inspection==='checked' ? ' selected' : ''}" data-value="checked"><span class="gd-check">${f.inspection==='checked' ? '✓' : ''}</span> ✅ ตรวจแล้ว</div>
                  <div class="glass-dropdown-option${f.inspection==='partial' ? ' selected' : ''}" data-value="partial"><span class="gd-check">${f.inspection==='partial' ? '✓' : ''}</span> 🔄 ตรวจบางส่วน</div>
                  <div class="glass-dropdown-option${f.inspection==='unchecked' ? ' selected' : ''}" data-value="unchecked"><span class="gd-check">${f.inspection==='unchecked' ? '✓' : ''}</span> ⬜ ยังไม่ตรวจ</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-modal-footer">
          <button class="glass-btn glass-btn-clear" id="gfClear">ล้างตัวกรอง</button>
          <button class="glass-btn glass-btn-apply" id="gfApply">✓ ใช้ตัวกรอง</button>
        </div>
      </div>
    </div>

    <div id="retTableArea"></div>
  `;

  // ── Toolbar event bindings ──
  const overlay = document.getElementById('retFilterOverlay');
  const openModal = () => { overlay.classList.add('open'); };
  const closeModal = () => { overlay.classList.remove('open'); };

  document.getElementById('btnSettingsAdv').addEventListener('click', openModal);
  document.getElementById('btnCloseFilter').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  // Custom glass dropdowns
  document.querySelectorAll('.glass-dropdown').forEach(dd => {
    const trigger = dd.querySelector('.glass-dropdown-trigger');
    const panel = dd.querySelector('.glass-dropdown-panel');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close other dropdowns first
      document.querySelectorAll('.glass-dropdown-panel.open').forEach(p => { if (p !== panel) { p.classList.remove('open'); p.parentElement.querySelector('.glass-dropdown-trigger').classList.remove('open'); } });
      panel.classList.toggle('open');
      trigger.classList.toggle('open');
    });
    panel.querySelectorAll('.glass-dropdown-option').forEach(opt => {
      opt.addEventListener('click', () => {
        trigger.dataset.value = opt.dataset.value;
        trigger.querySelector('.gd-label').textContent = opt.textContent.trim();
        panel.querySelectorAll('.glass-dropdown-option').forEach(o => { o.classList.remove('selected'); o.querySelector('.gd-check').textContent = ''; });
        opt.classList.add('selected');
        opt.querySelector('.gd-check').textContent = '✓';
        panel.classList.remove('open');
        trigger.classList.remove('open');
      });
    });
  });
  // Close dropdowns on click outside
  document.addEventListener('click', () => { document.querySelectorAll('.glass-dropdown-panel.open').forEach(p => { p.classList.remove('open'); p.parentElement.querySelector('.glass-dropdown-trigger').classList.remove('open'); }); });

  // Date preset chips
  document.getElementById('gfDateChips').querySelectorAll('.glass-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.getElementById('gfDateChips').querySelectorAll('.glass-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const preset = chip.dataset.preset;
      const today = new Date(), fmt = d => d.toISOString().slice(0, 10);
      const customRow = document.getElementById('gfCustomDate');
      if (preset === 'custom') { customRow.style.display = ''; return; }
      customRow.style.display = 'none';
      switch (preset) {
        case 'all': document.getElementById('gfDateFrom').value = ''; document.getElementById('gfDateTo').value = ''; break;
        case 'today': document.getElementById('gfDateFrom').value = document.getElementById('gfDateTo').value = fmt(today); break;
        case 'yesterday': { const y = new Date(today); y.setDate(y.getDate()-1); document.getElementById('gfDateFrom').value = document.getElementById('gfDateTo').value = fmt(y); break; }
        case '7days': { const d7 = new Date(today); d7.setDate(d7.getDate()-6); document.getElementById('gfDateFrom').value = fmt(d7); document.getElementById('gfDateTo').value = fmt(today); break; }
        case 'thisMonth': document.getElementById('gfDateFrom').value = fmt(new Date(today.getFullYear(), today.getMonth(), 1)); document.getElementById('gfDateTo').value = fmt(today); break;
        case 'lastMonth': { const lm = new Date(today.getFullYear(), today.getMonth()-1, 1); document.getElementById('gfDateFrom').value = fmt(lm); document.getElementById('gfDateTo').value = fmt(new Date(today.getFullYear(), today.getMonth(), 0)); break; }
      }
    });
  });

  // Type checkboxes inside modal
  const gfTypeCbs = document.querySelectorAll('.gf-type-cb');
  const gfAllCb = document.querySelector('.gf-type-cb[value=""]');
  gfTypeCbs.forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.value === '') { gfTypeCbs.forEach(c => { if (c !== gfAllCb) c.checked = false; }); gfAllCb.checked = true; }
      else { gfAllCb.checked = false; if (!Array.from(gfTypeCbs).some(c => c.value !== '' && c.checked)) gfAllCb.checked = true; }
    });
  });

  // Apply filters
  document.getElementById('gfApply').addEventListener('click', () => {
    Pages._retFilters.search = document.getElementById('gfSearch').value.trim();
    Pages._retFilters.dateFrom = document.getElementById('gfDateFrom').value || null;
    Pages._retFilters.dateTo = document.getElementById('gfDateTo').value || null;
    Pages._retFilters.types = Array.from(gfTypeCbs).filter(c => c.value !== '' && c.checked).map(c => c.value);
    Pages._retFilters.completion = document.querySelector('#gfCompletion .glass-dropdown-trigger').dataset.value || '';
    Pages._retFilters.inspection = document.querySelector('#gfInspection .glass-dropdown-trigger').dataset.value || '';
    Pages._retPage = 1;
    closeModal();
    Pages._retRenderView(container);
  });

  // Clear filters inside modal
  document.getElementById('gfClear').addEventListener('click', () => {
    Pages._retFilters = { search: '', types: [], completion: '', inspection: '', dateFrom: null, dateTo: null };
    Pages._retPage = 1;
    closeModal();
    Pages._retRenderView(container);
  });

  // Clear filters button (outside modal)
  document.getElementById('btnClearFilters').addEventListener('click', () => {
    Pages._retFilters = { search: '', types: [], completion: '', inspection: '', dateFrom: null, dateTo: null };
    Pages._retPage = 1;
    Pages._retRenderView(container);
  });

  // View toggle
  container.querySelectorAll('.retViewToggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      Pages._retViewMode = btn.dataset.view;
      localStorage.setItem('retViewMode', btn.dataset.view);
      Pages._retPage = 1;
      container.querySelectorAll('.retViewToggle').forEach(b => {
        const isActive = b.dataset.view === Pages._retViewMode;
        const rad = b.dataset.view === 'docs' ? '8px 0 0 8px' : '0 8px 8px 0';
        b.style.cssText = (isActive ? activeStyle : inactiveStyle) + ';padding:5px 14px;font-size:0.78rem;cursor:pointer;border-radius:' + rad + ';transition:all .2s';
      });
      if (Pages._retViewMode === 'items' && Pages._retAllItems.length === 0) {
        try { const d = await App.api('returns.php?all_items=1'); Pages._retAllItems = d.items || []; } catch { Pages._retAllItems = []; }
      }
      Pages._retRenderTable(container);
    });
  });

  // Buttons
  document.getElementById('btnAddReturn').addEventListener('click', () => location.hash = 'returns/new');
  document.getElementById('btnBulkImport').addEventListener('click', () => Pages.showBulkImport());

  // Lazy-load items
  if (vm === 'items' && Pages._retAllItems.length === 0) {
    try { const d = await App.api('returns.php?all_items=1'); Pages._retAllItems = d.items || []; } catch { Pages._retAllItems = []; }
  }

  Pages._retRenderTable(container);

};
Pages._retRenderTable = function(container) {
  const area = document.getElementById('retTableArea');
  if (!area) return;
  if (Pages._retViewMode === 'items') Pages._retRenderItemsTable(area, container);
  else Pages._retRenderDocsTable(area, container);
};
Pages._retBuildPageNums = function(page, totalPages) {
  let pn = ''; const mx = 7;
  let sp = Math.max(1, page - Math.floor(mx/2)), ep = Math.min(totalPages, sp + mx - 1);
  if (ep - sp < mx - 1) sp = Math.max(1, ep - mx + 1);
  if (sp > 1) pn += `<button class="pg-btn" data-pg="1">1</button>`;
  if (sp > 2) pn += `<span class="pg-dots">…</span>`;
  for (let i = sp; i <= ep; i++) pn += `<button class="pg-btn${i===page?' active':''}" data-pg="${i}">${i}</button>`;
  if (ep < totalPages-1) pn += `<span class="pg-dots">…</span>`;
  if (ep < totalPages) pn += `<button class="pg-btn" data-pg="${totalPages}">${totalPages}</button>`;
  return pn;
};
Pages._retRenderDocsTable = function(area, container) {
  const filtered = Pages._getFilteredReturns();
  const total = filtered.length, perPage = Pages._retPerPage;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (Pages._retPage > totalPages) Pages._retPage = totalPages;
  const page = Pages._retPage, start = (page - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);
  const hasFilter = !!(Pages._retFilters.search || Pages._retFilters.types.length > 0 || Pages._retFilters.completion || Pages._retFilters.inspection || (Pages._retFilters.dateFrom && Pages._retFilters.dateTo));
  const pageNums = Pages._retBuildPageNums(page, totalPages);

  document.getElementById('retTotalCount').textContent = `${total} เอกสาร`;

  area.innerHTML = `
    <div class="card">
      <div class="table-summary-bar">
        <div class="summary-text">ทั้งหมด <strong>${total.toLocaleString()}</strong> รายการ${hasFilter ? ` (กรอง จาก ${Pages._returnsData.length.toLocaleString()})` : ''}</div>
        <div class="per-page-select">
          <label>แสดง</label>
          <select id="retPerPage" class="form-select" style="width:auto">${[25,50,100,250].map(n=>`<option value="${n}"${n===perPage?' selected':''}>${n}</option>`).join('')}</select>
          <label>/ หน้า</label>
        </div>
      </div>
      <div class="table-wrapper" style="max-height:calc(100vh - 340px);overflow-y:auto">
        <table class="data-table" id="returnsTable">
          <thead><tr>
            <th>#</th><th>เลขที่ใบรับคืน</th><th>วันที่</th><th>สาขา/ลูกค้า</th><th>ประเภท</th><th>จำนวนรายการ</th><th>หมายเหตุ</th>
            <th style="text-align:center"><label class="inspect-toggle-header" title="ยืนยันตรวจสอบทั้งหมดในหน้านี้"><input type="checkbox" id="inspectAll"> สถานะตรวจสอบ</label></th>
            <th>จัดการ</th>
          </tr></thead>
          <tbody id="returnsBody">
            ${pageItems.length === 0
              ? '<tr><td colspan="9" class="text-center" style="padding:32px;color:var(--text-muted)">ยังไม่มีใบรับคืน</td></tr>'
              : pageItems.map((r, i) => {
                  const filled = parseInt(r.filled_count) || 0, tot = parseInt(r.item_count) || 0, confirmed = parseInt(r.confirmed_count) || 0;
                  const isComplete = tot > 0 && filled === tot;
                  const verifyBadge = tot === 0 ? '<span class="badge badge-muted">—</span>' : isComplete ? '<span class="badge badge-success">✅ ครบ</span>' : `<span class="badge badge-warning">⚠️ ${filled}/${tot}</span>`;
                  const allConfirmed = tot > 0 && confirmed === tot, noneConfirmed = confirmed === 0;
                  const pending = Pages._inspectPending[r.id];
                  const effectiveChecked = pending === 'confirm' ? true : pending === 'unconfirm' ? false : allConfirmed;
                  let inspectCell;
                  if (tot === 0) inspectCell = '<span class="badge badge-muted">—</span>';
                  else {
                    const isPending = !!pending, cls = effectiveChecked ? 'confirmed' : '', pendingCls = isPending ? ' pending' : '';
                    const label = effectiveChecked ? '✓ ตรวจแล้ว' : (noneConfirmed ? 'ยังไม่ตรวจ' : `${confirmed}/${tot}`);
                    inspectCell = `<label class="inspect-toggle ${cls}${pendingCls}"><input type="checkbox" class="inspect-cb" data-receipt-id="${r.id}" data-orig-confirmed="${allConfirmed?'1':'0'}" ${effectiveChecked?'checked':''}><span class="inspect-label">${label}${isPending?' *':''}</span></label>`;
                  }
                  return `<tr>
                    <td>${start+i+1}</td>
                    <td><strong>${App.escapeHTML(r.receipt_number)}</strong></td>
                    <td>${r.return_date}</td>
                    <td>${App.escapeHTML(r.branch_name||'-')}</td>
                    <td>${App.escapeHTML(r.return_type||'-')}</td>
                    <td>${tot}</td>
                    <td>${verifyBadge}</td>
                    <td style="text-align:center">${inspectCell}</td>
                    <td><button class="btn btn-outline btn-sm" onclick="Pages.viewReturn(${r.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ดู</button></td>
                  </tr>`;
                }).join('')}
          </tbody>
        </table>
      </div>
      ${totalPages > 1 ? `<div class="pagination-bar" id="retPagination">
        <button class="pg-btn" data-pg="${Math.max(1,page-1)}" ${page===1?'disabled':''}>‹ ก่อน</button>
        ${pageNums}
        <button class="pg-btn" data-pg="${Math.min(totalPages,page+1)}" ${page===totalPages?'disabled':''}>ถัดไป ›</button>
        <span class="pg-info">หน้า ${page}/${totalPages}</span>
      </div>` : ''}
    </div>

    ${(() => {
      const pendingCount = Object.keys(Pages._inspectPending).length;
      if (pendingCount === 0) return '';
      return `<div class="inspect-save-bar" id="inspectSaveBar">
        <div class="inspect-save-info">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
          มีการเปลี่ยนแปลง <strong>${pendingCount}</strong> รายการ ยังไม่ได้บันทึก
        </div>
        <div class="inspect-save-actions">
          <button class="btn btn-outline btn-sm" id="btnInspectCancel">ยกเลิก</button>
          <button class="btn btn-primary btn-sm" id="btnInspectSave" style="gap:4px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
            บันทึก
          </button>
        </div>
      </div>`;
    })()}
  `;

  // Table events: inspection checkboxes
  area.querySelectorAll('.inspect-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const receiptId = parseInt(cb.dataset.receiptId);
      const origConfirmed = cb.dataset.origConfirmed === '1';
      if (cb.checked === origConfirmed) delete Pages._inspectPending[receiptId];
      else Pages._inspectPending[receiptId] = cb.checked ? 'confirm' : 'unconfirm';
      Pages._retRenderTable(container);
    });
  });

  // Inspect all
  const inspectAllCb = document.getElementById('inspectAll');
  if (inspectAllCb) {
    inspectAllCb.addEventListener('change', () => {
      const shouldCheck = inspectAllCb.checked;
      area.querySelectorAll('.inspect-cb').forEach(cb => {
        const receiptId = parseInt(cb.dataset.receiptId);
        const origConfirmed = cb.dataset.origConfirmed === '1';
        if (shouldCheck) { if (!origConfirmed) Pages._inspectPending[receiptId] = 'confirm'; }
        else { if (Pages._inspectPending[receiptId] === 'confirm') delete Pages._inspectPending[receiptId]; }
      });
      Pages._retRenderTable(container);
    });
  }

  // Save bar
  const saveBar = document.getElementById('inspectSaveBar');
  if (saveBar) {
    document.getElementById('btnInspectCancel').addEventListener('click', () => { Pages._inspectPending = {}; Pages._retRenderTable(container); });
    document.getElementById('btnInspectSave').addEventListener('click', async () => {
      const saveBtn = document.getElementById('btnInspectSave');
      saveBtn.disabled = true; saveBtn.innerHTML = '<span class="spinner-sm"></span> กำลังบันทึก...';
      let successCount = 0;
      for (const [rid, action] of Object.entries(Pages._inspectPending)) {
        try {
          await App.api('returns.php', { method: 'PATCH', body: action === 'confirm' ? { confirm_all_receipt: parseInt(rid) } : { unconfirm_all_receipt: parseInt(rid) } });
          const row = Pages._returnsData.find(r => r.id == rid);
          if (row) row.confirmed_count = action === 'confirm' ? (parseInt(row.item_count) || 0) : 0;
          successCount++;
        } catch (err) { console.error('Error saving receipt', rid, err); }
      }
      Pages._inspectPending = {};
      App.toast(`✓ บันทึกสำเร็จ ${successCount} ใบรับคืน`, 'success');
      Pages._retRenderTable(container);
    });
  }

  // Per-page
  document.getElementById('retPerPage')?.addEventListener('change', (e) => {
    Pages._retPerPage = parseInt(e.target.value); Pages._retPage = 1; Pages._retRenderTable(container);
  });
  // Pagination
  document.getElementById('retPagination')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pg]');
    if (!btn || btn.disabled) return;
    Pages._retPage = parseInt(btn.dataset.pg); Pages._retRenderTable(container);
  });
};
Pages._retRenderItemsTable = function(area, container) {
  const items = Pages._retAllItems, f = Pages._retFilters;
  let filtered = items;
  if (f.search) { const q=f.search.toLowerCase(); filtered=filtered.filter(it=>[it.receipt_number,it.good_code,it.good_name,it.branch_name,it.return_type].join(' ').toLowerCase().includes(q)); }
  if (f.types.length > 0) filtered = filtered.filter(it => f.types.includes(it.return_type || ''));
  if (f.completion) {
    if (f.completion === 'complete') filtered = filtered.filter(it => it.sales_conditions);
    else if (f.completion === 'incomplete') filtered = filtered.filter(it => !it.sales_conditions);
  }
  if (f.inspection) {
    if (f.inspection === 'checked') filtered = filtered.filter(it => parseInt(it.is_confirmed));
    else if (f.inspection === 'unchecked') filtered = filtered.filter(it => !parseInt(it.is_confirmed));
  }
  if (f.dateFrom && f.dateTo) filtered = filtered.filter(it => { const d = it.return_date; return d >= f.dateFrom && d <= f.dateTo; });

  const total = filtered.length, perPage = Pages._retPerPage;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (Pages._retPage > totalPages) Pages._retPage = totalPages;
  const page = Pages._retPage, start = (page - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);
  const hasFilter = !!(f.search || f.types.length > 0 || f.completion || f.inspection || (f.dateFrom && f.dateTo));
  const pageNums = Pages._retBuildPageNums(page, totalPages);

  document.getElementById('retTotalCount').textContent = `${total} รายการ`;

  area.innerHTML = `
    <div class="card">
      <div class="table-wrap" style="overflow-x:auto"><table class="data-table">
        <thead><tr>
          <th>#</th><th>ใบรับคืน</th><th>วันที่</th><th>สาขา</th><th>ประเภท</th>
          <th>รหัสสินค้า</th><th>ชื่อสินค้า</th><th>Class</th><th>SN</th><th>จำนวน</th>
          <th>เงื่อนไข</th><th>สถานะ</th><th>ตรวจสอบ</th>
        </tr></thead>
        <tbody>${pageItems.length === 0
          ? '<tr><td colspan="13" class="text-center" style="padding:40px;color:var(--text-muted)">' + (hasFilter ? 'ไม่พบรายการตามตัวกรอง' : 'ยังไม่มีรายการ') + '</td></tr>'
          : pageItems.map((it, i) => {
            const isConfirmed = parseInt(it.is_confirmed);
            return `<tr style="cursor:pointer" onclick="Pages.viewReturn(${it.receipt_id})">
              <td>${start+i+1}</td>
              <td><strong style="color:var(--primary)">${App.escapeHTML(it.receipt_number||'-')}</strong></td>
              <td style="font-size:0.8rem">${it.return_date||'-'}</td>
              <td style="font-size:0.8rem">${App.escapeHTML(it.branch_name||'-')}</td>
              <td style="font-size:0.78rem">${App.escapeHTML(it.return_type||'-')}</td>
              <td><span class="cell-badge">${App.escapeHTML(it.good_code||'-')}</span></td>
              <td style="font-size:0.82rem">${App.escapeHTML(it.good_name||'-')}</td>
              <td style="text-align:center">${it.class?'<span class="badge badge-class">'+App.escapeHTML(it.class)+'</span>':'-'}</td>
              <td style="font-size:0.78rem">${App.escapeHTML(it.serial_number||'-')}</td>
              <td style="text-align:center">${parseInt(it.quantity)||1}</td>
              <td style="font-size:0.78rem">${it.sales_conditions?'<span class="badge badge-success" style="font-size:0.72rem">'+App.escapeHTML(it.sales_conditions)+'</span>':'<span style="color:var(--text-muted)">—</span>'}</td>
              <td style="font-size:0.78rem">${App.escapeHTML(it.status||'-')}</td>
              <td>${isConfirmed?'<span class="badge" style="background:#10b98122;color:#059669;font-weight:600">✅</span>':'<span class="badge" style="background:#f59e0b22;color:#d97706;font-weight:600">⬜</span>'}</td>
            </tr>`;}).join('')}
        </tbody>
      </table></div>
      ${totalPages > 1 ? `<div class="pagination-bar" id="retPagination">
        <button class="pg-btn" data-pg="${Math.max(1,page-1)}" ${page===1?'disabled':''}>‹ ก่อน</button>
        ${pageNums}
        <button class="pg-btn" data-pg="${Math.min(totalPages,page+1)}" ${page===totalPages?'disabled':''}>ถัดไป ›</button>
        <span class="pg-info">หน้า ${page}/${totalPages}</span>
        <select class="pg-per-page" id="retPerPage"><option value="25" ${perPage===25?'selected':''}>25</option><option value="50" ${perPage===50?'selected':''}>50</option><option value="100" ${perPage===100?'selected':''}>100</option><option value="250" ${perPage===250?'selected':''}>250</option></select>
      </div>` : ''}
    </div>`;

  document.getElementById('retPagination')?.addEventListener('click', (e) => { const btn=e.target.closest('[data-pg]'); if(!btn||btn.disabled)return; Pages._retPage=parseInt(btn.dataset.pg); Pages._retRenderTable(container); });
  document.getElementById('retPerPage')?.addEventListener('change', e => { Pages._retPerPage=parseInt(e.target.value); Pages._retPage=1; Pages._retRenderTable(container); });
};
  // ══════════════════════════════════════════
  //  BULK IMPORT FROM EXCEL
  // ══════════════════════════════════════════
Pages.showBulkImport = function() {
  const body = `
    <div class="bulk-import-container">
      <div class="paste-zone" style="margin-bottom:0">
        <div class="paste-zone-header">
          <div class="card-title" style="font-size:0.95rem">📥 Import จากไฟล์ Excel</div>
          <div class="paste-zone-hint">อัปโหลดไฟล์ Excel ที่มีข้อมูลครบ — ระบบจะจัดกลุ่มตามเลขที่รับคืนอัตโนมัติ</div>
        </div>
        <div class="file-drop-zone" id="bulkDropZone" style="margin-top:10px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:36px;height:36px;margin-bottom:8px;opacity:0.4"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg>
          <div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:4px">ลากไฟล์มาวาง หรือ คลิกเลือกไฟล์</div>
          <div style="font-size:0.78rem;color:var(--text-muted)">รองรับ .xlsx, .xls, .csv</div>
          <input type="file" id="bulkFileInput" accept=".xlsx,.xls,.csv" style="display:none">
        </div>
        <div id="bulkFileInfo" class="file-info" style="display:none"></div>
        <div class="paste-col-hint" style="margin-top:8px">⚡ คอลัมน์ที่รองรับ: วันที่รับคืน, เลขที่รับคืน, สาขา/ลูกค้า, ประเภท, คลัง, รหัสสินค้า, ชื่อสินค้า, จำนวน</div>
      </div>

      <!-- Preview area -->
      <div id="bulkPreview" style="display:none;margin-top:16px">
        <div class="flex items-center justify-between mb-12">
          <div class="card-title" style="font-size:0.95rem">📋 ตัวอย่างข้อมูล</div>
          <div id="bulkStats" class="paste-col-hint"></div>
        </div>
        <div class="table-wrapper" style="max-height:400px;overflow-y:auto">
          <table class="data-table" id="bulkPreviewTable">
            <thead>
              <tr>
                <th style="width:36px">#</th>
                <th>เลขที่รับคืน</th>
                <th>วันที่</th>
                <th>สาขา/ลูกค้า</th>
                <th>ประเภท</th>
                <th>คลัง</th>
                <th>รหัสสินค้า</th>
                <th>ชื่อสินค้า</th>
                <th style="width:60px">จำนวน</th>
              </tr>
            </thead>
            <tbody id="bulkPreviewBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-outline" onclick="App.closeModal()">ยกเลิก</button>
    <button class="btn btn-primary" id="btnBulkSave" disabled>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
      นำเข้าทั้งหมด
    </button>
  `;

  App.openModal('📥 Import Excel — สร้างหลายเอกสาร', body, footer);

  let parsedReceipts = {}; // grouped data

  const dropZone = document.getElementById('bulkDropZone');
  const fileInput = document.getElementById('bulkFileInput');
  const fileInfoEl = document.getElementById('bulkFileInfo');

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) processFile(fileInput.files[0]); });

  const processFile = (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      App.toast('รองรับเฉพาะ .xlsx, .xls, .csv', 'error');
      return;
    }

    fileInfoEl.style.display = 'flex';
    fileInfoEl.innerHTML = `<span>📄 ${App.escapeHTML(file.name)} (${(file.size / 1024).toFixed(1)} KB)</span><span class="badge badge-inspecting">กำลังอ่าน...</span>`;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

        if (rows.length < 2) {
          App.toast('ไฟล์ว่างหรือมีแค่หัวตาราง', 'error');
          fileInfoEl.innerHTML = `<span>📄 ${App.escapeHTML(file.name)}</span><span class="badge badge-rejected">ไม่มีข้อมูล</span>`;
          return;
        }

        // ── Smart column detection (exclusive: each column claimed once) ──
        const hdr = rows[0].map(h => String(h).toLowerCase().trim());
        const claimed = new Set();
        const detect = (words) => {
          const idx = hdr.findIndex((h, i) => !claimed.has(i) && words.some(w => h.includes(w)));
          if (idx !== -1) claimed.add(idx);
          return idx;
        };

        // Detect in order of specificity (most unique keywords first)
        const colMap = {};
        colMap.receipt  = detect(['เลขที่รับคืน', 'เลขที่เอกสาร', 'เลขที่', 'receipt', 'เอกสาร', 'doc no']);
        colMap.code     = detect(['รหัสสินค้า', 'รหัส', 'code', 'sku', 'barcode', 'item code']);
        colMap.name     = detect(['ชื่อสินค้า', 'ชื่อ', 'name', 'product', 'รายการ', 'สินค้า', 'description']);
        colMap.date     = detect(['วันที่รับคืน', 'วันที่', 'return date', 'date']);
        colMap.branch   = detect(['สาขา', 'ลูกค้า', 'branch', 'customer']);
        colMap.type     = detect(['ประเภท', 'type', 'ประเภทการรับคืน']);
        colMap.warehouse= detect(['คลัง', 'warehouse', 'คลังที่เก็บ', 'store']);
        colMap.qty      = detect(['จำนวน', 'qty', 'quantity', 'pcs', 'amount']);

        // Verify critical columns
        if (colMap.receipt === -1 && colMap.code === -1 && colMap.name === -1) {
          App.toast('ไม่พบคอลัมน์ที่จำเป็น (เลขที่รับคืน, รหัส/ชื่อสินค้า)', 'error');
          fileInfoEl.innerHTML = `<span>📄 ${App.escapeHTML(file.name)}</span><span class="badge badge-rejected">คอลัมน์ไม่ตรง</span>`;
          return;
        }

        const getVal = (row, col) => col >= 0 ? String(row[col] || '').trim() : '';

        // ── Group rows by receipt number ──
        parsedReceipts = {};
        let totalItems = 0;

        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.every(c => !c && c !== 0)) continue;

          const receiptNum = getVal(row, colMap.receipt) || `AUTO-${String(r).padStart(3, '0')}`;
          const code = getVal(row, colMap.code);
          const name = getVal(row, colMap.name);
          if (!code && !name) continue;

          if (!parsedReceipts[receiptNum]) {
            // Parse date
            let dateStr = getVal(row, colMap.date);
            if (dateStr) {
              // Try to convert various date formats to YYYY-MM-DD
              const d = new Date(dateStr);
              if (!isNaN(d.getTime())) {
                dateStr = d.toISOString().split('T')[0];
              }
            } else {
              dateStr = new Date().toISOString().split('T')[0];
            }

            parsedReceipts[receiptNum] = {
              receipt_number: receiptNum,
              return_date: dateStr,
              branch_name: getVal(row, colMap.branch),
              return_type: getVal(row, colMap.type),
              warehouse: getVal(row, colMap.warehouse) || '020',
              items: []
            };
          }

          const rawQty = colMap.qty >= 0 ? row[colMap.qty] : 1;
          parsedReceipts[receiptNum].items.push({
            good_code: code,
            good_name: name,
            quantity: parseInt(rawQty) || 1
          });
          totalItems++;
        }

        const receiptKeys = Object.keys(parsedReceipts);
        if (receiptKeys.length === 0) {
          App.toast('ไม่พบข้อมูลที่นำเข้าได้', 'error');
          fileInfoEl.innerHTML = `<span>📄 ${App.escapeHTML(file.name)}</span><span class="badge badge-rejected">ไม่พบข้อมูล</span>`;
          return;
        }

        // ── Show preview ──
        fileInfoEl.innerHTML = `<span>📄 ${App.escapeHTML(file.name)}</span><span class="badge badge-completed">✓ อ่านสำเร็จ</span>`;

        document.getElementById('bulkPreview').style.display = 'block';
        document.getElementById('bulkStats').textContent = `${receiptKeys.length} เอกสาร · ${totalItems} รายการสินค้า`;

        const previewBody = document.getElementById('bulkPreviewBody');
        let html = '';
        let rowNum = 0;

        receiptKeys.forEach(key => {
          const rec = parsedReceipts[key];
          rec.items.forEach((item, idx) => {
            rowNum++;
            const isFirst = idx === 0;
            html += `<tr${isFirst ? ' style="border-top:2px solid var(--border-color)"' : ''}>
              <td class="text-muted" style="font-size:0.78rem">${rowNum}</td>
              <td>${isFirst ? '<strong>' + App.escapeHTML(rec.receipt_number) + '</strong>' : '<span style="color:var(--text-muted)">↳</span>'}</td>
              <td>${isFirst ? rec.return_date : ''}</td>
              <td>${isFirst ? App.escapeHTML(rec.branch_name || '-') : ''}</td>
              <td>${isFirst ? App.escapeHTML(rec.return_type || '-') : ''}</td>
              <td>${isFirst ? App.escapeHTML(rec.warehouse || '-') : ''}</td>
              <td>${App.escapeHTML(item.good_code)}</td>
              <td>${App.escapeHTML(item.good_name)}</td>
              <td style="text-align:center">${item.quantity}</td>
            </tr>`;
          });
        });

        previewBody.innerHTML = html;

        // Enable save button
        document.getElementById('btnBulkSave').disabled = false;

      } catch (err) {
        console.error('Excel parse error:', err);
        App.toast('ไม่สามารถอ่านไฟล์: ' + err.message, 'error');
        fileInfoEl.innerHTML = `<span>📄 ${App.escapeHTML(file.name)}</span><span class="badge badge-rejected">อ่านไม่ได้</span>`;
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Bulk Save ──
  document.getElementById('btnBulkSave').addEventListener('click', async () => {
    const receipts = Object.values(parsedReceipts);
    if (receipts.length === 0) return;

    const btn = document.getElementById('btnBulkSave');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-sm"></span> กำลังนำเข้า...';

    let successCount = 0;
    let errorCount = 0;

    for (const rec of receipts) {
      try {
        const resp = await fetch('/jobpoom/api/returns.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rec)
        });
        const result = await resp.json();
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          console.warn('Failed:', rec.receipt_number, result);
        }
      } catch (e) {
        errorCount++;
        console.error('Failed:', rec.receipt_number, e);
      }
    }

    if (successCount > 0) {
      const totalItems = receipts.reduce((sum, r) => sum + r.items.length, 0);
      App.toast(`✓ นำเข้า ${successCount} เอกสาร (${totalItems} รายการ) สำเร็จ${errorCount > 0 ? ` — ล้มเหลว ${errorCount}` : ''}`, 'success');
      App.closeModal();
      Pages.returns(document.getElementById('pageContainer'));
    } else {
      App.toast('ไม่สามารถนำเข้าได้ กรุณาลองอีกครั้ง', 'error');
      btn.disabled = false;
      btn.textContent = 'นำเข้าทั้งหมด';
    }
  });
};
  // ── Return Receipt: Full-page Create ──
