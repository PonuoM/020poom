/* ============================================
 Pending + done transfers
 ============================================ */

Pages.transfersPending = async function(container) {
  let allItems = [];
  let whSummary = [];
  let filterWh = '';

  const load = async () => {
    try {
      const url = 'transfers.php' + (filterWh ? `?warehouse=${encodeURIComponent(filterWh)}` : '');
      const data = await App.api(url);
      allItems = (data.items || []).filter(it => !parseInt(it.transferred));
      whSummary = data.warehouse_summary || [];
    } catch (err) {
      console.warn('Transfers API:', err);
      allItems = [];
      whSummary = [];
    }
  };

  await load();

  const render = () => {
    container.innerHTML = `
      <div class="page-section">
        <div class="flex items-center justify-between mb-24" style="flex-wrap:wrap;gap:12px">
          <div>
            <div class="card-title">รอโอน</div>
            <div class="card-subtitle">รายการรอโอนจากคลัง 020 ไปคลังปลายทาง</div>
          </div>
          <div class="flex gap-8 items-center">
            <select id="filterWh" class="form-select" style="max-width:220px;font-size:0.85rem">
              <option value="">ทุกคลัง</option>
              ${whSummary.map(w => `<option value="${App.escapeHTML(w.code)}" ${filterWh===w.code?'selected':''}>${App.escapeHTML(w.code)} — ${App.escapeHTML(w.name)} (${w.pending} รอโอน)</option>`).join('')}
            </select>
            <button class="btn btn-primary" id="btnTransferChecked" style="gap:5px;display:none">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/></svg>
              โอนที่เลือก
            </button>
          </div>
        </div>

        <!-- Warehouse Summary Cards -->
        ${whSummary.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:20px">
          ${whSummary.map(w => `
            <div class="card" style="flex:1;min-width:180px;padding:14px 18px;cursor:pointer;border-left:4px solid ${w.pending > 0 ? '#f59e0b' : '#10b981'}" onclick="document.getElementById('filterWh').value='${App.escapeHTML(w.code)}';document.getElementById('filterWh').dispatchEvent(new Event('change'))">
              <div style="font-weight:600;font-size:0.9rem;margin-bottom:4px">${App.escapeHTML(w.code)} — ${App.escapeHTML(w.name)}</div>
              <div style="display:flex;gap:12px;font-size:0.8rem;color:var(--text-muted)">
                <span>รอโอน: <strong style="color:#f59e0b">${w.pending}</strong></span>
                <span>โอนแล้ว: <strong style="color:#10b981">${w.transferred}</strong></span>
                <span>รวม: ${w.total}</span>
              </div>
            </div>
          `).join('')}
        </div>` : ''}

        <div class="card">
          <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--border)">
            <h3 style="margin:0;font-size:0.95rem;color:#f59e0b">⏳ รอโอน (${allItems.length} รายการ)</h3>
          </div>
          <div class="table-wrapper" style="overflow-x:auto;overflow-y:auto">
            <table class="data-table" style="font-size:0.72rem;white-space:nowrap">
              <thead>
                <tr>
                  <th style="width:36px"><input type="checkbox" id="cbTransferAll" style="width:16px;height:16px;cursor:pointer"></th>
                  <th>#</th>
                  <th>ใบรับคืน</th>
                  <th>ประเภทรับคืน</th>
                  <th>สาขา</th>
                  <th>รหัสสินค้า</th>
                  <th>ชื่อสินค้า</th>
                  <th>Class</th>
                  <th>SN</th>
                  <th>จำนวน</th>
                  <th>คลังปลายทาง</th>
                  <th>เลข RTV</th>
                  <th>เลขอนุมัติ</th>
                  <th>เหตุผล</th>
                </tr>
              </thead>
              <tbody>
                ${allItems.length === 0
                  ? '<tr><td colspan="14" class="text-center" style="padding:24px;color:var(--text-muted)">🎉 ไม่มีรายการรอโอน</td></tr>'
                  : allItems.map((it, i) => `
                  <tr>
                    <td style="text-align:center"><input type="checkbox" class="transfer-cb" data-recon-id="${it.recon_id}" style="width:16px;height:16px;cursor:pointer"></td>
                    <td>${i+1}</td>
                    <td><span class="cell-badge">${App.escapeHTML(it.receipt_number||'-')}</span></td>
                    <td>${App.escapeHTML(it.return_type||'-')}</td>
                    <td>${App.escapeHTML(it.branch_name||'-')}</td>
                    <td><span class="cell-badge">${App.escapeHTML(it.good_code||'-')}</span></td>
                    <td>${App.escapeHTML(it.good_name||'-')}</td>
                    <td style="text-align:center">${it.class ? '<span class="badge badge-class">'+App.escapeHTML(it.class)+'</span>' : '-'}</td>
                    <td>${App.escapeHTML(it.serial_number||'-')}</td>
                    <td style="text-align:center">${parseInt(it.quantity)||1}</td>
                    <td><span style="background:rgba(245,158,11,0.12);color:#f59e0b;padding:2px 8px;border-radius:8px;font-size:0.7rem;font-weight:500">${App.escapeHTML(it.target_warehouse||'')} ${App.escapeHTML(it.warehouse_name||'')}</span></td>
                    <td>${it.recon_doc_number ? '<a href="#reconditioning/'+it.recon_doc_id+'" class="cell-badge" style="cursor:pointer;color:var(--primary);text-decoration:underline" title="ดูรายละเอียดเอกสารปรับสภาพ">'+App.escapeHTML(it.recon_doc_number)+'</a>' : '<span style="color:var(--text-muted)">-</span>'}</td>
                    <td>${it.batch_number ? '<a href="#approvals/'+it.batch_id+'" class="cell-badge" style="cursor:pointer;color:#10b981;text-decoration:underline" title="ดูรายละเอียดชุดอนุมัติ">'+App.escapeHTML(it.batch_number)+'</a>' : '<span style="color:var(--text-muted)">-</span>'}</td>
                    <td>${App.escapeHTML(it.cause_text||'-')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // ── Event bindings ──
    document.getElementById('filterWh')?.addEventListener('change', async (e) => {
      filterWh = e.target.value;
      await load();
      render();
    });

    document.getElementById('cbTransferAll')?.addEventListener('change', (e) => {
      document.querySelectorAll('.transfer-cb').forEach(cb => cb.checked = e.target.checked);
      updateTransferBtn();
    });

    container.querySelectorAll('.transfer-cb').forEach(cb => {
      cb.addEventListener('change', updateTransferBtn);
    });

    // Transfer button
    document.getElementById('btnTransferChecked')?.addEventListener('click', async () => {
      const checked = Array.from(document.querySelectorAll('.transfer-cb:checked'));
      if (checked.length === 0) return;
      const reconIds = checked.map(cb => parseInt(cb.dataset.reconId));

      if (!await App.confirmDialog({
        title: 'ยืนยันการโอน',
        message: 'โอน ' + reconIds.length + ' รายการ ออกจากคลัง 020 ไปคลังปลายทาง?',
        type: 'success',
        confirmText: '✓ โอนเลย (' + reconIds.length + ')'
      })) return;

      try {
        await App.api('transfers.php', { method: 'PUT', body: { action: 'mark_transferred', recon_ids: reconIds } });
        App.toast('โอนสำเร็จ ' + reconIds.length + ' รายการ', 'success');
        await load();
        render();
      } catch (err) { App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error'); }
    });
  };

  const updateTransferBtn = () => {
    const checked = document.querySelectorAll('.transfer-cb:checked');
    const btn = document.getElementById('btnTransferChecked');
    if (btn) {
      btn.style.display = checked.length > 0 ? 'inline-flex' : 'none';
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/></svg> โอนที่เลือก (' + checked.length + ')';
    }
  };

  render();
};
  // ── Transfers Done (โอนแล้ว) ──────────────────────
Pages.transfersDone = async function(container) {
  let allItems = [];
  let filterWh = '';

  const load = async () => {
    try {
      const url = 'transfers.php' + (filterWh ? `?warehouse=${encodeURIComponent(filterWh)}` : '');
      const data = await App.api(url);
      allItems = (data.items || []).filter(it => parseInt(it.transferred));
    } catch (err) {
      console.warn('Transfers API:', err);
      allItems = [];
    }
  };

  await load();

  // Get unique warehouse list from items
  const whList = [...new Map(allItems.map(it => [it.target_warehouse, { code: it.target_warehouse, name: it.warehouse_name }])).values()];

  const render = () => {
    const filtered = filterWh ? allItems.filter(it => it.target_warehouse === filterWh) : allItems;
    const fmtDate = (d) => { if (!d) return '-'; const ds = String(d).split(' ')[0]; return new Date(ds + 'T00:00:00').toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }); };

    container.innerHTML = `
      <div class="page-section">
        <div class="flex items-center justify-between mb-24" style="flex-wrap:wrap;gap:12px">
          <div>
            <div class="card-title">โอนแล้ว</div>
            <div class="card-subtitle">รายการที่โอนจากคลัง 020 ไปคลังปลายทางเรียบร้อยแล้ว</div>
          </div>
          <div class="flex gap-8 items-center">
            <select id="filterWhDone" class="form-select" style="max-width:220px;font-size:0.85rem">
              <option value="">ทุกคลัง (${allItems.length})</option>
              ${whList.map(w => `<option value="${App.escapeHTML(w.code)}" ${filterWh===w.code?'selected':''}>${App.escapeHTML(w.code)} — ${App.escapeHTML(w.name||w.code)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--border)">
            <h3 style="margin:0;font-size:0.95rem;color:#10b981">✅ โอนแล้ว (${filtered.length} รายการ)</h3>
          </div>
          <div class="table-wrapper" style="overflow-x:auto;overflow-y:auto">
            <table class="data-table" style="font-size:0.72rem;white-space:nowrap">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ใบรับคืน</th>
                  <th>ประเภทรับคืน</th>
                  <th>สาขา</th>
                  <th>รหัสสินค้า</th>
                  <th>ชื่อสินค้า</th>
                  <th>Class</th>
                  <th>SN</th>
                  <th>จำนวน</th>
                  <th>คลังปลายทาง</th>
                  <th>เลข RTV</th>
                  <th>วันที่โอน</th>
                  <th style="width:80px"></th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0
                  ? '<tr><td colspan="13" class="text-center" style="padding:24px;color:var(--text-muted)">ยังไม่มีรายการโอน</td></tr>'
                  : filtered.map((it, i) => `
                  <tr>
                    <td>${i+1}</td>
                    <td><span class="cell-badge">${App.escapeHTML(it.receipt_number||'-')}</span></td>
                    <td>${App.escapeHTML(it.return_type||'-')}</td>
                    <td>${App.escapeHTML(it.branch_name||'-')}</td>
                    <td><span class="cell-badge">${App.escapeHTML(it.good_code||'-')}</span></td>
                    <td>${App.escapeHTML(it.good_name||'-')}</td>
                    <td style="text-align:center">${it.class ? '<span class="badge badge-class">'+App.escapeHTML(it.class)+'</span>' : '-'}</td>
                    <td>${App.escapeHTML(it.serial_number||'-')}</td>
                    <td style="text-align:center">${parseInt(it.quantity)||1}</td>
                    <td><span style="background:rgba(16,185,129,0.12);color:#10b981;padding:2px 8px;border-radius:8px;font-size:0.7rem;font-weight:500">${App.escapeHTML(it.target_warehouse||'')} ${App.escapeHTML(it.warehouse_name||'')}</span></td>
                    <td>${it.recon_doc_number ? '<a href="#reconditioning/'+it.recon_doc_id+'" class="cell-badge" style="cursor:pointer;color:var(--primary);text-decoration:underline">'+App.escapeHTML(it.recon_doc_number)+'</a>' : '-'}</td>
                    <td style="color:var(--text-muted)">${fmtDate(it.transferred_date)}</td>
                    <td><button class="btn btn-outline btn-sm undo-transfer" data-recon-id="${it.recon_id}" style="font-size:0.7rem;padding:2px 8px;white-space:nowrap">↩ ยกเลิก</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // ── Event bindings ──
    document.getElementById('filterWhDone')?.addEventListener('change', (e) => {
      filterWh = e.target.value;
      render();
    });

    // Undo transfer buttons
    container.querySelectorAll('.undo-transfer').forEach(btn => {
      btn.addEventListener('click', async () => {
        const reconId = parseInt(btn.dataset.reconId);
        if (!await App.confirmDialog({
          title: 'ยกเลิกการโอน',
          message: 'ต้องการยกเลิกโอนรายการนี้กลับเป็น "รอโอน" หรือไม่?\nรายการจะกลับไปสามารถเปลี่ยนคลังปลายทางได้อีกครั้ง',
          type: 'warning',
          confirmText: '⟲ ยกเลิกการโอน'
        })) return;
        try {
          await App.api('transfers.php', { method: 'PUT', body: { action: 'unmark_transferred', recon_ids: [reconId] } });
          App.toast('⟲ ยกเลิกการโอนสำเร็จ', 'success');
          await load();
          render();
        } catch (err) { App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error'); }
      });
    });
  };

  render();
};
  // ── Products (สินค้า) ──────────────────────
Pages._productsData = [];
Pages._prodPage = 1;
Pages._prodPerPage = 50;
Pages._prodSearch = '';