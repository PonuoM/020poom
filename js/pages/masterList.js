/* ============================================
 Master reconditioning list
 ============================================ */

Pages.masterRecon = async function(container) {
  let items = [];
  let warehouses = [];
  try {
    const [itemsRes, whRes] = await Promise.all([
      App.api('reconditioning.php?master_list=1'),
      App.api('reconditioning.php?warehouses=1'),
    ]);
    items = itemsRes.items || [];
    warehouses = (whRes.warehouses || []).filter(w => w.code !== '020');
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><h3>เกิดข้อผิดพลาด</h3><p>${err.message}</p></div>`;
    return;
  }

  const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-';

  // Build warehouse column headers
  const whHeaders = warehouses.map(w =>
    `<th class="ml-wh-th" title="${App.escapeHTML(w.name)}">${App.escapeHTML(w.code)}</th>`
  ).join('');

  // Build warehouse filter options — only show warehouses that have items, with counts
  const whCounts = {};
  items.forEach(r => {
    const tw = r.target_warehouse;
    if (tw) {
      if (!whCounts[tw]) whCounts[tw] = { code: tw, name: '', count: 0 };
      whCounts[tw].count++;
    }
  });
  warehouses.forEach(w => { if (whCounts[w.code]) whCounts[w.code].name = w.name; });
  const noWhCount = items.filter(r => !r.target_warehouse).length;
  const whOptions = Object.values(whCounts).sort((a,b) => b.count - a.count)
    .map(w => `<option value="${App.escapeHTML(w.code)}">${App.escapeHTML(w.code)} — ${App.escapeHTML(w.name)} (${w.count})</option>`).join('');

  const selectStyle = 'font-size:0.82rem;padding:7px 12px;border:1px solid var(--border-color);border-radius:10px;background:var(--bg-card);color:var(--text-primary);cursor:pointer;outline:none;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23888\' stroke-width=\'2\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:30px';

  container.innerHTML = `
  <div class="ml-controls" style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">
    <div style="display:flex;flex:1;min-width:200px;gap:0">
      <input id="mlSearch" type="text" placeholder="🔍 ค้นหา รหัส/ชื่อ/เอกสาร/สาขา..." style="flex:1;padding:7px 12px;border:1px solid var(--border-color);border-radius:10px 0 0 10px;font-size:0.82rem;background:var(--bg-card)">
      <button id="mlSearchBtn" class="btn btn-primary" style="border-radius:0 10px 10px 0;padding:7px 14px;font-size:0.78rem;white-space:nowrap">ค้นหา</button>
      <button id="mlClearBtn" class="btn btn-outline" style="border-radius:10px;padding:7px 10px;font-size:0.78rem;margin-left:6px;display:none;white-space:nowrap">✕ ล้าง</button>
    </div>
    <div class="glass-dropdown down" id="mlFilterWh" style="min-width:180px;width:auto;flex:0 0 auto">
      <button type="button" class="glass-dropdown-trigger" data-value="" style="padding:7px 14px;font-size:0.82rem;border-radius:10px;background:var(--bg-card);border:1px solid var(--border-color);color:var(--text-primary)">
        <span class="gd-label">โอนไปยังคลัง..</span>
        <svg class="glass-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="glass-dropdown-panel">
        <div class="glass-dropdown-option selected" data-value=""><span class="gd-check">✓</span> ทั้งหมด</div>
        ${noWhCount > 0 ? `<div class="glass-dropdown-option" data-value="_none"><span class="gd-check"></span> ⚠ ยังไม่ระบุคลัง (${noWhCount})</div>` : ''}
        ${Object.values(whCounts).sort((a,b) => b.count - a.count).map(w => `<div class="glass-dropdown-option" data-value="${App.escapeHTML(w.code)}"><span class="gd-check"></span> ${App.escapeHTML(w.code)} — ${App.escapeHTML(w.name)} (${w.count})</div>`).join('')}
      </div>
    </div>
    <div class="glass-dropdown down" id="mlFilterStatus" style="min-width:160px;width:auto;flex:0 0 auto">
      <button type="button" class="glass-dropdown-trigger" data-value="" style="padding:7px 14px;font-size:0.82rem;border-radius:10px;background:var(--bg-card);border:1px solid var(--border-color);color:var(--text-primary)">
        <span class="gd-label">สถานะทั้งหมด</span>
        <svg class="glass-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="glass-dropdown-panel">
        <div class="glass-dropdown-option selected" data-value=""><span class="gd-check">✓</span> สถานะทั้งหมด</div>
        <div class="glass-dropdown-option" data-value="pending"><span class="gd-check"></span> ⏳ รอดำเนินการ</div>
        <div class="glass-dropdown-option" data-value="completed"><span class="gd-check"></span> ✅ เสร็จแล้ว</div>
        <div class="glass-dropdown-option" data-value="transferred"><span class="gd-check"></span> 🚚 โอนแล้ว</div>
      </div>
    </div>
    <span style="font-size:0.75rem;color:var(--text-muted);white-space:nowrap" id="mlCount">${items.length} รายการ</span>
  </div>
  <div class="ml-table-wrap" style="overflow:auto;max-height:calc(100vh - 160px);border:1px solid var(--border-color);border-radius:8px">
    <table class="ml-table" style="width:max-content;min-width:100%;border-collapse:collapse;font-size:0.75rem">
      <thead>
        <tr style="position:sticky;top:0;z-index:5">
          <th class="ml-th" style="min-width:30px">#</th>
          <th class="ml-th" style="min-width:120px">เลขที่เอกสาร</th>
          <th class="ml-th" style="min-width:70px">วันที่ส่งคืน</th>
          <th class="ml-th" style="min-width:70px">วันที่รับเข้า</th>
          <th class="ml-th" style="min-width:70px">วันที่ส่งปรับ</th>
          <th class="ml-th" style="min-width:100px">เลขใบรับคืน</th>
          <th class="ml-th" style="min-width:100px">สาขา/ลูกค้า</th>
          <th class="ml-th" style="min-width:80px">ประเภท</th>
          <th class="ml-th" style="min-width:80px">รหัสสินค้า</th>
          <th class="ml-th" style="min-width:140px">รายการสินค้า</th>
          ${whHeaders}
          <th class="ml-th" style="min-width:120px">ข้อมูลถอดอะไหล่</th>
          <th class="ml-th" style="min-width:120px">สาเหตุ</th>
          <th class="ml-th" style="min-width:80px">ผู้ปรับ</th>
        </tr>
      </thead>
      <tbody id="mlBody">
        ${items.map((r, i) => Pages._masterReconRow(r, i, warehouses)).join('')}
      </tbody>
    </table>
  </div>`;

  // ── Inject styles ──
  if (!document.getElementById('mlStyles')) {
    const sty = document.createElement('style');
    sty.id = 'mlStyles';
    sty.textContent = `
      .ml-table-wrap { overflow-x:auto!important;overflow-y:auto;-webkit-overflow-scrolling:touch;width:100% }
      .ml-table-wrap::-webkit-scrollbar { height:10px }
      .ml-table-wrap::-webkit-scrollbar-track { background:var(--bg-input);border-radius:5px }
      .ml-table-wrap::-webkit-scrollbar-thumb { background:var(--accent-blue);border-radius:5px }
      .ml-table-wrap::-webkit-scrollbar-thumb:hover { background:var(--accent-blue-light) }

      .ml-th { background:var(--bg-table-header);color:var(--text-white);padding:6px 8px;text-align:center;font-weight:600;white-space:nowrap;border:1px solid var(--border-color);font-size:0.72rem }
      .ml-wh-th { background:#0d9488;color:#fff;padding:6px 4px;text-align:center;font-weight:600;white-space:nowrap;border:1px solid rgba(255,255,255,0.15);font-size:0.7rem;min-width:40px }
      [data-theme="light"] .ml-wh-th { background:#0f766e }

      .ml-td { padding:4px 6px;border:1px solid var(--border-color);white-space:nowrap;vertical-align:middle;color:var(--text-primary) }
      .ml-td a { color:var(--accent-blue-light);text-decoration:none;font-weight:500 }
      [data-theme="light"] .ml-td a { color:var(--accent-blue) }
      .ml-td-wrap { padding:4px 6px;border:1px solid var(--border-color);vertical-align:middle;min-width:100px;color:var(--text-primary) }

      .ml-wh-td { text-align:center;padding:4px 2px;border:1px solid var(--border-color);cursor:pointer;vertical-align:middle;background:var(--bg-card) }
      .ml-wh-td:hover { background:var(--accent-green-bg) }
      .ml-wh-td.active { background:var(--accent-green-bg) }

      .ml-radio { width:16px;height:16px;cursor:pointer;accent-color:#059669 }

      .ml-inline-input { border:none;border-bottom:1px dashed var(--border-color);background:transparent;width:100%;font-size:0.75rem;padding:2px 4px;outline:none;color:var(--text-primary) }
      .ml-inline-input::placeholder { color:var(--text-muted) }
      .ml-inline-input:focus { border-bottom-color:var(--accent-blue);background:var(--bg-input) }

      .ml-table { background:var(--bg-card) }
      .ml-table tbody tr { background:var(--bg-card) }
      .ml-table tbody tr:nth-child(even) { background:var(--bg-card-hover) }
      .ml-table tbody tr:hover { background:var(--bg-row-hover) }

      /* Transferred / Locked styles */
      tr.ml-transferred { background:#f0fdf4 !important; opacity:0.7 }
      tr.ml-transferred:hover { opacity:0.85 }
      .ml-wh-td.locked { cursor:not-allowed }
      .ml-wh-td.locked .ml-radio { cursor:not-allowed; pointer-events:none }
      .ml-inline-input:disabled { opacity:0.5; cursor:not-allowed; border-bottom-style:solid; border-bottom-color:transparent }
    `;
    document.head.appendChild(sty);
  }

  // ── Resize table wrap on sidebar toggle ──
  const setWrapWidth = () => {
    const sb = document.querySelector('.sidebar');
    const collapsed = sb?.classList.contains('collapsed');
    const sidebarW = collapsed ? 70 : 260;
    const wrap = container.querySelector('.ml-table-wrap');
    if (wrap) wrap.style.maxWidth = `calc(100vw - ${sidebarW}px - 60px)`;
  };
  setWrapWidth();
  const sbToggle = document.getElementById('sidebarToggle');
  if (sbToggle) sbToggle.addEventListener('click', () => setTimeout(setWrapWidth, 450));

  // ── Search / Filter ──
  const searchInput = container.querySelector('#mlSearch');
  const searchBtn = container.querySelector('#mlSearchBtn');
  const clearBtn = container.querySelector('#mlClearBtn');
  const filterWhDd = container.querySelector('#mlFilterWh');
  const filterStatusDd = container.querySelector('#mlFilterStatus');
  const countEl = container.querySelector('#mlCount');

  let searchQuery = '';

  const filterRows = () => {
    const q = searchQuery.toLowerCase();
    const whFilter = filterWhDd.querySelector('.glass-dropdown-trigger').dataset.value;
    const statusFilter = filterStatusDd.querySelector('.glass-dropdown-trigger').dataset.value;
    let visible = 0;

    container.querySelectorAll('#mlBody tr').forEach(tr => {
      const text = tr.textContent.toLowerCase();
      const status = tr.dataset.status || 'pending';
      const transferred = tr.dataset.transferred === '1';

      // Search match
      const matchSearch = !q || text.includes(q);

      // Warehouse match
      let matchWh = true;
      if (whFilter === '_none') {
        // Show rows with no warehouse selected
        const hasWh = tr.querySelector('.ml-wh-td.active');
        matchWh = !hasWh;
      } else if (whFilter) {
        const radio = tr.querySelector(`.ml-wh-radio[value="${whFilter}"]`);
        matchWh = radio && radio.checked;
      }

      // Status match
      let matchStatus = true;
      if (statusFilter === 'pending') {
        matchStatus = status === 'pending';
      } else if (statusFilter === 'completed') {
        matchStatus = status === 'completed' && !transferred;
      } else if (statusFilter === 'transferred') {
        matchStatus = transferred;
      }

      const show = matchSearch && matchWh && matchStatus;
      tr.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    countEl.textContent = `${visible} รายการ`;
  };

  // Search button click
  searchBtn.addEventListener('click', () => {
    searchQuery = searchInput.value;
    clearBtn.style.display = searchQuery ? 'inline-flex' : 'none';
    filterRows();
  });

  // Enter key triggers search
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchBtn.click();
    }
  });

  // Clear button
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearBtn.style.display = 'none';
    filterRows();
  });

  // Glass dropdown interactive behavior
  container.querySelectorAll('.ml-controls .glass-dropdown').forEach(dd => {
    const trigger = dd.querySelector('.glass-dropdown-trigger');
    const panel = dd.querySelector('.glass-dropdown-panel');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      container.querySelectorAll('.ml-controls .glass-dropdown-panel.open').forEach(p => { if (p !== panel) { p.classList.remove('open'); p.parentElement.querySelector('.glass-dropdown-trigger').classList.remove('open'); } });
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
        filterRows();
      });
    });
  });
  document.addEventListener('click', () => { container.querySelectorAll('.ml-controls .glass-dropdown-panel.open').forEach(p => { p.classList.remove('open'); p.parentElement.querySelector('.glass-dropdown-trigger').classList.remove('open'); }); });

  // ── Warehouse radio clicks ──
  container.querySelectorAll('.ml-wh-radio').forEach(radio => {
    radio.addEventListener('change', async () => {
      const tr = radio.closest('tr');
      if (tr.dataset.transferred === '1') {
        App.toast('🔒 รายการนี้โอนแล้ว — ต้องยกเลิกโอนก่อนถึงจะเปลี่ยนคลังได้', 'error');
        radio.checked = false;
        return;
      }
      const reconId = radio.dataset.reconId;
      const code = radio.value;
      const needsReason = ['105', '109'].includes(code);
      try {
        await App.api('reconditioning.php', {
          method: 'PUT',
          body: { id: parseInt(reconId), target_warehouse: code, status: 'completed' }
        });
        // Update row visual
        const tr = radio.closest('tr');
        tr.dataset.status = 'completed';
        // Re-apply filter so completed items hide if pending-only is checked
        filterRows();
        App.toast('✓ บันทึกคลัง ' + code, 'success');
      } catch (err) {
        App.toast('ผิดพลาด: ' + err.message, 'error');
        radio.checked = false;
      }
    });
  });

  // ── Inline editable fields (blur to save) ──
  container.querySelectorAll('.ml-inline-input').forEach(inp => {
    let original = inp.value;
    inp.addEventListener('focus', () => { original = inp.value; });
    inp.addEventListener('blur', async () => {
      if (inp.value === original) return;
      const reconId = inp.dataset.reconId;
      const field = inp.dataset.field;
      try {
        await App.api('reconditioning.php', {
          method: 'PUT',
          body: { id: parseInt(reconId), [field]: inp.value.trim() || null }
        });
        original = inp.value;
        App.toast('✓ บันทึกแล้ว', 'success');
      } catch (err) {
        App.toast('ผิดพลาด: ' + err.message, 'error');
        inp.value = original;
      }
    });
  });
};
Pages._masterReconRow = function(r, i, warehouses) {
  const tw = r.target_warehouse || '';
  const isTransferred = parseInt(r.transferred) === 1;
  const radioName = 'wh_' + r.recon_id;
  const disabledAttr = isTransferred ? ' disabled' : '';
  const whCells = warehouses.map(w => {
    const checked = tw === w.code ? ' checked' : '';
    return `<td class="ml-wh-td${checked ? ' active' : ''}${isTransferred ? ' locked' : ''}">
      <input type="radio" name="${radioName}" value="${App.escapeHTML(w.code)}" class="ml-radio ml-wh-radio" data-recon-id="${r.recon_id}"${checked}${disabledAttr}>
    </td>`;
  }).join('');

  const fmtDate = (d) => { if (!d) return '-'; const ds = String(d).split(' ')[0]; return new Date(ds + 'T00:00:00').toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' }); };
  const trClass = isTransferred ? ' class="ml-transferred"' : '';

  return `<tr data-recon-id="${r.recon_id}" data-status="${r.recon_status || 'pending'}" data-transferred="${isTransferred ? '1' : '0'}"${trClass}>
    <td class="ml-td" style="text-align:center;color:var(--text-muted)">${i + 1}</td>
    <td class="ml-td"><a href="#reconditioning/${r.doc_id}">${App.escapeHTML(r.doc_number || '-')}</a></td>
    <td class="ml-td" style="text-align:center">${fmtDate(r.doc_return_date)}</td>
    <td class="ml-td" style="text-align:center">${fmtDate(r.return_date)}</td>
    <td class="ml-td" style="text-align:center">${fmtDate(r.doc_created)}</td>
    <td class="ml-td">${App.escapeHTML(r.receipt_number || '-')}</td>
    <td class="ml-td">${App.escapeHTML(r.branch_name || '-')}</td>
    <td class="ml-td">${App.escapeHTML(r.return_type || '-')}</td>
    <td class="ml-td" style="font-weight:500">${App.escapeHTML(r.good_code || '-')}</td>
    <td class="ml-td">${App.escapeHTML(r.good_name || '-')}</td>
    ${whCells}
    <td class="ml-td-wrap"><input class="ml-inline-input" data-recon-id="${r.recon_id}" data-field="parts_info" value="${App.escapeHTML(r.parts_info || '')}" placeholder="—"${disabledAttr}></td>
    <td class="ml-td-wrap"><input class="ml-inline-input" data-recon-id="${r.recon_id}" data-field="cause_text" value="${App.escapeHTML(r.cause_text || '')}" placeholder="—"${disabledAttr}></td>
    <td class="ml-td-wrap"><input class="ml-inline-input" data-recon-id="${r.recon_id}" data-field="inspector_name" value="${App.escapeHTML(r.recon_inspector || '')}" placeholder="—"${disabledAttr}></td>
  </tr>`;
  }
};

// (Auth.init() handles startup via DOMContentLoaded)
