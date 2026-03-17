/* ============================================
 Reconditioning list + glass modal
 ============================================ */

Pages.reconditioning = async function(container) {
  try {
    const data = await App.api('reconditioning.php');
    Pages._reconDocs = data.documents || [];
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><h3>เกิดข้อผิดพลาด</h3><p>${err.message}</p></div>`;
    return;
  }
  Pages._reconPage = 1;
  Pages._reconViewMode = localStorage.getItem('reconViewMode') || 'docs';
  Pages._reconFilters = { search: '', status: '', dateFrom: null, dateTo: null };
  Pages._reconRenderView(container);
};
Pages._reconRenderView = async function(container) {
  // Render shared toolbar once, then fill table area
  const f = Pages._reconFilters;
  const vm = Pages._reconViewMode;
  const hasFilter = !!(f.search || f.status || (f.dateFrom && f.dateTo));

  // Date label
  let dateLabel = 'วันที่: ทั้งหมด';
  if (f.dateFrom && f.dateTo) {
    const today = new Date().toISOString().slice(0, 10);
    const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (f.dateFrom === f.dateTo) {
      dateLabel = f.dateFrom === today ? 'วันที่: วันนี้' : f.dateFrom === yest ? 'วันที่: เมื่อวาน' : `วันที่: ${f.dateFrom}`;
    } else {
      dateLabel = `วันที่: ${f.dateFrom} — ${f.dateTo}`;
    }
  }

  // Toggle button styles
  const activeStyle = 'background:var(--gradient-blue);color:#fff;border:1px solid transparent;font-weight:600';
  const inactiveStyle = 'background:transparent;color:var(--text-secondary);border:1px solid var(--border-color)';

  container.innerHTML = `
    <div class="page-section">
      <div class="filter-toolbar">
        <div class="filter-row">
          <!-- Settings Advanced button -->
          <button class="btn-settings-adv" id="btnReconSettingsAdv">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            ตัวกรองขั้นสูง
            ${hasFilter ? '<span class="filter-dot"></span>' : ''}
          </button>

          <!-- Clear filters (shown when active) -->
          <button class="btn btn-outline btn-sm filter-clear-btn" id="btnReconClearFilters" title="ล้างตัวกรองทั้งหมด" style="${hasFilter ? '' : 'display:none'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ล้างตัวกรอง
          </button>

          <div style="display:flex;gap:8px;align-items:center;margin-left:auto">
            <div style="display:inline-flex;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.12)">
              <button class="reconViewToggle" data-view="docs" style="${vm==='docs' ? activeStyle : inactiveStyle};padding:5px 14px;font-size:0.78rem;cursor:pointer;border-radius:8px 0 0 8px;transition:all .2s">📄 เอกสาร</button>
              <button class="reconViewToggle" data-view="items" style="${vm==='items' ? activeStyle : inactiveStyle};padding:5px 14px;font-size:0.78rem;cursor:pointer;border-radius:0 8px 8px 0;transition:all .2s">📦 รายการสินค้า</button>
            </div>
            <span style="font-size:0.82rem;color:var(--text-muted)" id="reconTotalCount"></span>
            <button class="btn btn-primary btn-sm" id="btnNewReconDoc" style="gap:4px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M12 5v14M5 12h14"/></svg>
              เพิ่มเอกสาร
            </button>
          </div>
        </div>
      </div>

      <!-- Glass Filter Modal -->
      <div class="glass-overlay" id="reconFilterOverlay">
        <div class="glass-modal">
          <div class="glass-modal-header">
            <div class="glass-modal-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              ตัวกรองขั้นสูง
            </div>
            <button class="glass-modal-close" id="btnReconCloseFilter">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Search -->
          <div class="glass-filter-group">
            <label class="glass-filter-label">🔍 ค้นหา</label>
            <input type="text" class="glass-filter-input" id="rgfSearch" placeholder="ค้นหาเลขเอกสาร, สินค้า, สาขา..." value="${App.escapeHTML(f.search)}">
          </div>

          <!-- Date -->
          <div class="glass-filter-group">
            <label class="glass-filter-label">📅 วันที่</label>
            <div class="glass-preset-chips" id="rgfDateChips">
              <span class="glass-chip${!f.dateFrom ? ' active' : ''}" data-preset="all">ทั้งหมด</span>
              <span class="glass-chip" data-preset="today">วันนี้</span>
              <span class="glass-chip" data-preset="yesterday">เมื่อวาน</span>
              <span class="glass-chip" data-preset="7days">7 วัน</span>
              <span class="glass-chip" data-preset="thisMonth">เดือนนี้</span>
              <span class="glass-chip" data-preset="lastMonth">เดือนที่แล้ว</span>
              <span class="glass-chip" data-preset="custom">กำหนดเอง</span>
            </div>
            <div class="glass-date-row" id="rgfCustomDate" style="display:none">
              <label>จาก</label>
              <input type="date" class="glass-filter-input" id="rgfDateFrom" value="${f.dateFrom || ''}" style="flex:1">
              <label>ถึง</label>
              <input type="date" class="glass-filter-input" id="rgfDateTo" value="${f.dateTo || ''}" style="flex:1">
            </div>
          </div>

          <!-- Status -->
          <div class="glass-filter-group">
            <label class="glass-filter-label">📊 สถานะ</label>
            <div class="glass-dropdown" id="rgfStatus">
              <button type="button" class="glass-dropdown-trigger" data-value="${f.status || ''}">
                <span class="gd-label">${{'':'ทั้งหมด','processing':'⏳ กำลังปรับ','partial':'🔄 ปรับบางส่วน','done':'✅ ปรับหมดแล้ว'}[f.status||'']}</span>
                <svg class="glass-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="glass-dropdown-panel">
                <div class="glass-dropdown-option${!f.status ? ' selected' : ''}" data-value=""><span class="gd-check">${!f.status ? '✓' : ''}</span> ทั้งหมด</div>
                <div class="glass-dropdown-option${f.status==='processing' ? ' selected' : ''}" data-value="processing"><span class="gd-check">${f.status==='processing' ? '✓' : ''}</span> ⏳ กำลังปรับ</div>
                <div class="glass-dropdown-option${f.status==='partial' ? ' selected' : ''}" data-value="partial"><span class="gd-check">${f.status==='partial' ? '✓' : ''}</span> 🔄 ปรับบางส่วน</div>
                <div class="glass-dropdown-option${f.status==='done' ? ' selected' : ''}" data-value="done"><span class="gd-check">${f.status==='done' ? '✓' : ''}</span> ✅ ปรับหมดแล้ว</div>
              </div>
            </div>
          </div>

          <div class="glass-modal-footer">
            <button class="glass-btn glass-btn-clear" id="rgfClear">ล้างตัวกรอง</button>
            <button class="glass-btn glass-btn-apply" id="rgfApply">✓ ใช้ตัวกรอง</button>
          </div>
        </div>
      </div>

      <div id="reconTableArea"></div>
    </div>
  `;

  // ── Toolbar event bindings ──
  const overlay = document.getElementById('reconFilterOverlay');
  const openModal = () => { overlay.classList.add('open'); };
  const closeModal = () => { overlay.classList.remove('open'); };

  document.getElementById('btnReconSettingsAdv').addEventListener('click', openModal);
  document.getElementById('btnReconCloseFilter').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  // Custom glass dropdowns
  document.querySelectorAll('#reconFilterOverlay .glass-dropdown').forEach(dd => {
    const trigger = dd.querySelector('.glass-dropdown-trigger');
    const panel = dd.querySelector('.glass-dropdown-panel');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('#reconFilterOverlay .glass-dropdown-panel.open').forEach(p => { if (p !== panel) { p.classList.remove('open'); p.parentElement.querySelector('.glass-dropdown-trigger').classList.remove('open'); } });
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
  document.addEventListener('click', () => { document.querySelectorAll('#reconFilterOverlay .glass-dropdown-panel.open').forEach(p => { p.classList.remove('open'); p.parentElement.querySelector('.glass-dropdown-trigger').classList.remove('open'); }); });

  // Date preset chips
  document.getElementById('rgfDateChips').querySelectorAll('.glass-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.getElementById('rgfDateChips').querySelectorAll('.glass-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const preset = chip.dataset.preset;
      const today = new Date(), fmt = d => d.toISOString().slice(0, 10);
      const customRow = document.getElementById('rgfCustomDate');
      if (preset === 'custom') { customRow.style.display = ''; return; }
      customRow.style.display = 'none';
      switch (preset) {
        case 'all': document.getElementById('rgfDateFrom').value = ''; document.getElementById('rgfDateTo').value = ''; break;
        case 'today': document.getElementById('rgfDateFrom').value = document.getElementById('rgfDateTo').value = fmt(today); break;
        case 'yesterday': { const y = new Date(today); y.setDate(y.getDate()-1); document.getElementById('rgfDateFrom').value = document.getElementById('rgfDateTo').value = fmt(y); break; }
        case '7days': { const d7 = new Date(today); d7.setDate(d7.getDate()-6); document.getElementById('rgfDateFrom').value = fmt(d7); document.getElementById('rgfDateTo').value = fmt(today); break; }
        case 'thisMonth': document.getElementById('rgfDateFrom').value = fmt(new Date(today.getFullYear(), today.getMonth(), 1)); document.getElementById('rgfDateTo').value = fmt(today); break;
        case 'lastMonth': { const lm = new Date(today.getFullYear(), today.getMonth()-1, 1); document.getElementById('rgfDateFrom').value = fmt(lm); document.getElementById('rgfDateTo').value = fmt(new Date(today.getFullYear(), today.getMonth(), 0)); break; }
      }
    });
  });

  // Apply filters
  document.getElementById('rgfApply').addEventListener('click', () => {
    Pages._reconFilters.search = document.getElementById('rgfSearch').value.trim();
    Pages._reconFilters.dateFrom = document.getElementById('rgfDateFrom').value || null;
    Pages._reconFilters.dateTo = document.getElementById('rgfDateTo').value || null;
    Pages._reconFilters.status = document.querySelector('#rgfStatus .glass-dropdown-trigger').dataset.value || '';
    Pages._reconPage = 1;
    closeModal();
    Pages._reconRenderView(container);
  });

  // Clear filters inside modal
  document.getElementById('rgfClear').addEventListener('click', () => {
    Pages._reconFilters = { search: '', status: '', dateFrom: null, dateTo: null };
    Pages._reconPage = 1;
    closeModal();
    Pages._reconRenderView(container);
  });

  // Clear filters button (outside modal)
  document.getElementById('btnReconClearFilters').addEventListener('click', () => {
    Pages._reconFilters = { search: '', status: '', dateFrom: null, dateTo: null };
    Pages._reconPage = 1;
    Pages._reconRenderView(container);
  });

  // View toggle
  container.querySelectorAll('.reconViewToggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      Pages._reconViewMode = btn.dataset.view;
      localStorage.setItem('reconViewMode', btn.dataset.view);
      Pages._reconPage = 1;
      container.querySelectorAll('.reconViewToggle').forEach(b => {
        const isActive = b.dataset.view === Pages._reconViewMode;
        const rad = b.dataset.view === 'docs' ? '8px 0 0 8px' : '0 8px 8px 0';
        b.style.cssText = (isActive ? activeStyle : inactiveStyle) + ';padding:5px 14px;font-size:0.78rem;cursor:pointer;border-radius:' + rad + ';transition:all .2s';
      });
      if (Pages._reconViewMode === 'items' && Pages._reconAllItems.length === 0) {
        try { const d = await App.api('reconditioning.php?master_list=1'); Pages._reconAllItems = d.items || []; } catch { Pages._reconAllItems = []; }
      }
      Pages._reconRenderTable(container);
    });
  });

  // New doc
  document.getElementById('btnNewReconDoc').addEventListener('click', () => App.navigateTo('reconditioning/new'));

  // Lazy-load items if in items view
  if (vm === 'items' && Pages._reconAllItems.length === 0) {
    try { const d = await App.api('reconditioning.php?master_list=1'); Pages._reconAllItems = d.items || []; } catch { Pages._reconAllItems = []; }
  }

  // Render the table area
  Pages._reconRenderTable(container);

};
  // ── Shared table renderer — fills #reconTableArea only ──
Pages._reconRenderTable = function(container) {
  const area = document.getElementById('reconTableArea');
  if (!area) return;
  if (Pages._reconViewMode === 'items') {
    Pages._reconRenderItemsTable(area, container);
  } else {
    Pages._reconRenderDocsTable(area, container);
  }
};
Pages._getFilteredReconDocs = function() {
  const f = Pages._reconFilters;
  return Pages._reconDocs.filter(d => {
    if (f.search) { const q = f.search.toLowerCase(); if (![d.doc_number, d.inspector_name, d.receipt_numbers].join(' ').toLowerCase().includes(q)) return false; }
    if (f.status && d.calc_status !== f.status) return false;
    if (f.dateFrom && f.dateTo) { const dd = (d.created_at || '').slice(0,10); if (dd < f.dateFrom || dd > f.dateTo) return false; }
    return true;
  });
};
Pages._reconBuildPageNums = function(page, totalPages) {
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
Pages._reconRenderDocsTable = function(area, container) {
  const filtered = Pages._getFilteredReconDocs();
  const total = filtered.length, perPage = Pages._reconPerPage;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (Pages._reconPage > totalPages) Pages._reconPage = totalPages;
  const page = Pages._reconPage, start = (page-1)*perPage;
  const pageItems = filtered.slice(start, start+perPage);
  const hasFilter = !!(Pages._reconFilters.search || Pages._reconFilters.status || (Pages._reconFilters.dateFrom && Pages._reconFilters.dateTo));
  const pageNums = Pages._reconBuildPageNums(page, totalPages);
  document.getElementById('reconTotalCount').textContent = `${total} เอกสาร`;

  area.innerHTML = `
    <div class="card">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>#</th><th>เลขเอกสาร</th><th>วันที่สร้าง</th><th>ผู้บันทึก</th><th>จำนวนรายการ</th><th>สถานะ</th><th style="width:60px"></th></tr></thead>
        <tbody>${pageItems.length===0
          ? '<tr><td colspan="7" class="text-center" style="padding:40px;color:var(--text-muted)">'+(hasFilter?'ไม่พบเอกสารตามตัวกรอง':'ยังไม่มีเอกสารปรับสภาพ')+'</td></tr>'
          : pageItems.map((d,i)=>{
            const sm={processing:{l:'กำลังปรับ',b:'#f59e0b22',c:'#d97706',i:'⏳'},partial:{l:'ปรับบางส่วน',b:'#3b82f622',c:'#2563eb',i:'🔄'},done:{l:'ปรับหมดแล้ว',b:'#10b98122',c:'#059669',i:'✅'}};
            const st=sm[d.calc_status]||sm.processing;
            return `<tr class="clickable-row" data-doc-id="${d.id}" style="cursor:pointer">
              <td>${start+i+1}</td>
              <td><strong style="color:var(--primary)">${App.escapeHTML(d.doc_number)}</strong></td>
              <td>${d.created_at?new Date(d.created_at).toLocaleDateString('th-TH'):'-'}</td>
              <td>${App.escapeHTML(d.inspector_name||'-')}</td>
              <td><span class="badge" style="background:var(--primary);color:#1e1e2e;font-weight:700">${d.item_count||0}</span></td>
              <td><span class="badge" style="background:${st.b};color:${st.c};font-weight:600">${st.i} ${st.l}</span></td>
              <td><button class="btn btn-outline btn-sm" title="ดูรายละเอียด" style="padding:4px 8px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
            </tr>`;}).join('')}
        </tbody>
      </table></div>
      ${totalPages>1?`<div class="pagination-bar" id="reconPagination">
        <button class="pg-btn" data-pg="${Math.max(1,page-1)}" ${page===1?'disabled':''}>‹ ก่อน</button>
        ${pageNums}
        <button class="pg-btn" data-pg="${Math.min(totalPages,page+1)}" ${page===totalPages?'disabled':''}>ถัดไป ›</button>
        <span class="pg-info">หน้า ${page}/${totalPages}</span>
        <select class="pg-per-page" id="reconPerPage"><option value="20" ${perPage===20?'selected':''}>20</option><option value="50" ${perPage===50?'selected':''}>50</option><option value="100" ${perPage===100?'selected':''}>100</option></select>
      </div>`:''}
    </div>`;

  area.querySelectorAll('.clickable-row').forEach(r=>r.addEventListener('click',()=>App.navigateTo('reconditioning/'+r.dataset.docId)));
  area.querySelectorAll('#reconPagination .pg-btn').forEach(b=>b.addEventListener('click',()=>{Pages._reconPage=parseInt(b.dataset.pg);Pages._reconRenderTable(container);}));
  document.getElementById('reconPerPage')?.addEventListener('change',e=>{Pages._reconPerPage=parseInt(e.target.value);Pages._reconPage=1;Pages._reconRenderTable(container);});
};
Pages._reconRenderItemsTable = function(area, container) {
  const items = Pages._reconAllItems, f = Pages._reconFilters;
  let filtered = items;
  if (f.search) { const q=f.search.toLowerCase(); filtered=filtered.filter(it=>[it.doc_number,it.good_code,it.good_name,it.receipt_number,it.branch_name].join(' ').toLowerCase().includes(q)); }
  if (f.status) {
    if (f.status==='processing') filtered=filtered.filter(it=>it.recon_status!=='completed');
    else if (f.status==='partial') filtered=filtered.filter(it=>it.recon_status!=='completed');
    else if (f.status==='done') filtered=filtered.filter(it=>it.recon_status==='completed');
  }
  if (f.dateFrom&&f.dateTo) { filtered=filtered.filter(it=>{const d=(it.doc_created||'').slice(0,10);return d>=f.dateFrom&&d<=f.dateTo;}); }

  const total=filtered.length, perPage=Pages._reconPerPage;
  const totalPages=Math.max(1,Math.ceil(total/perPage));
  if (Pages._reconPage>totalPages) Pages._reconPage=totalPages;
  const page=Pages._reconPage, start=(page-1)*perPage;
  const pageItems=filtered.slice(start,start+perPage);
  const hasFilter=!!(f.search||f.status||(f.dateFrom&&f.dateTo));
  const pageNums=Pages._reconBuildPageNums(page,totalPages);
  document.getElementById('reconTotalCount').textContent=`${total} รายการ`;

  area.innerHTML = `
    <div class="card">
      <div class="table-wrap" style="overflow-x:auto"><table class="data-table">
        <thead><tr><th>#</th><th>เลขเอกสาร</th><th>ใบรับคืน</th><th>สาขา</th><th>ประเภท</th><th>รหัสสินค้า</th><th>ชื่อสินค้า</th><th>Class</th><th>SN</th><th>จำนวน</th><th>คลังปลายทาง</th><th>สาเหตุ</th><th>ผู้ปรับ</th><th>สถานะ</th><th>โอน</th></tr></thead>
        <tbody>${pageItems.length===0
          ? '<tr><td colspan="15" class="text-center" style="padding:40px;color:var(--text-muted)">'+(hasFilter?'ไม่พบรายการตามตัวกรอง':'ยังไม่มีรายการ')+'</td></tr>'
          : pageItems.map((it,i)=>{
            const isDone=it.recon_status==='completed', isTr=parseInt(it.transferred);
            return `<tr style="cursor:pointer" onclick="App.navigateTo('reconditioning/${it.doc_id}')">
              <td>${start+i+1}</td>
              <td><strong style="color:var(--primary)">${App.escapeHTML(it.doc_number||'-')}</strong></td>
              <td style="font-size:0.8rem">${App.escapeHTML(it.receipt_number||'-')}</td>
              <td style="font-size:0.8rem">${App.escapeHTML(it.branch_name||'-')}</td>
              <td style="font-size:0.78rem">${App.escapeHTML(it.return_type||'-')}</td>
              <td><span class="cell-badge">${App.escapeHTML(it.good_code||'-')}</span></td>
              <td style="font-size:0.82rem">${App.escapeHTML(it.good_name||'-')}</td>
              <td style="text-align:center">${it.class?'<span class="badge badge-class">'+App.escapeHTML(it.class)+'</span>':'-'}</td>
              <td style="font-size:0.78rem">${App.escapeHTML(it.serial_number||'-')}</td>
              <td style="text-align:center">${parseInt(it.quantity)||1}</td>
              <td>${it.target_warehouse?'<span style="background:rgba(16,185,129,0.12);color:#10b981;padding:2px 8px;border-radius:8px;font-size:0.78rem;font-weight:500">'+App.escapeHTML(it.target_warehouse)+'</span>':'<span style="color:var(--text-muted)">—</span>'}</td>
              <td style="font-size:0.75rem;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${App.escapeHTML(it.cause_text||'')}">${App.escapeHTML(it.cause_text||'-')}</td>
              <td style="font-size:0.8rem">${App.escapeHTML(it.recon_inspector||'-')}</td>
              <td>${isDone?'<span class="badge" style="background:#10b98122;color:#059669;font-weight:600">✅ เสร็จ</span>':'<span class="badge" style="background:#f59e0b22;color:#d97706;font-weight:600">⏳ ดำเนินการ</span>'}</td>
              <td>${isTr?'<span class="badge" style="background:#3b82f622;color:#2563eb;font-weight:600">🚚</span>':''}</td>
            </tr>`;}).join('')}
        </tbody>
      </table></div>
      ${totalPages>1?`<div class="pagination-bar" id="reconPagination">
        <button class="pg-btn" data-pg="${Math.max(1,page-1)}" ${page===1?'disabled':''}>‹ ก่อน</button>
        ${pageNums}
        <button class="pg-btn" data-pg="${Math.min(totalPages,page+1)}" ${page===totalPages?'disabled':''}>ถัดไป ›</button>
        <span class="pg-info">หน้า ${page}/${totalPages}</span>
        <select class="pg-per-page" id="reconPerPage"><option value="20" ${perPage===20?'selected':''}>20</option><option value="50" ${perPage===50?'selected':''}>50</option><option value="100" ${perPage===100?'selected':''}>100</option></select>
      </div>`:''}
    </div>`;

  area.querySelectorAll('#reconPagination .pg-btn').forEach(b=>b.addEventListener('click',()=>{Pages._reconPage=parseInt(b.dataset.pg);Pages._reconRenderTable(container);}));
  document.getElementById('reconPerPage')?.addEventListener('change',e=>{Pages._reconPerPage=parseInt(e.target.value);Pages._reconPage=1;Pages._reconRenderTable(container);});
};
  // ── Reconditioning Detail ──────────────────────

