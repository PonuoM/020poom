/* ============================================
 Return detail view
 ============================================ */

Pages.returnDetail = async function(container, id) {
  let r, items;
  try {
    const data = await App.api(`returns.php?id=${id}`);
    r = data.receipt;
    items = data.items || [];
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><h3>ไม่สามารถโหลดข้อมูล</h3><p>${err.message}</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="flex items-center gap-12 mb-24">
      <button class="btn btn-outline" id="btnBackToReturns">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
        กลับ
      </button>
      <div style="flex:1">
        <h2 style="font-size:1.15rem;font-weight:700;color:var(--text-white);margin:0">ใบรับคืน: ${App.escapeHTML(r.receipt_number)}</h2>
        <div style="font-size:0.82rem;color:var(--text-muted);margin-top:2px">${r.return_date}</div>
      </div>
      <button class="btn btn-outline" id="btnEditHistory" style="gap:6px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ประวัติแก้ไข
      </button>
    </div>

    <div class="card mb-24" style="padding:20px">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px">
        <div>
          <div class="form-label" style="margin-bottom:4px">เลขที่ใบรับคืน</div>
          <div style="font-weight:600;color:var(--text-white)">${App.escapeHTML(r.receipt_number)}</div>
        </div>
        <div>
          <div class="form-label" style="margin-bottom:4px">วันที่รับคืน</div>
          <div style="color:var(--text-primary)">${r.return_date}</div>
        </div>
        <div>
          <div class="form-label" style="margin-bottom:4px">สาขา/ลูกค้า</div>
          <div style="color:var(--text-primary)">${App.escapeHTML(r.branch_name || '-')}</div>
        </div>
        <div>
          <div class="form-label" style="margin-bottom:4px">ประเภท</div>
          <div style="color:var(--text-primary)">${App.escapeHTML(r.return_type || '-')}</div>
        </div>
        <div>
          <div class="form-label" style="margin-bottom:4px">คลัง</div>
          <div style="color:var(--text-primary)">${App.escapeHTML(r.warehouse || '-')}</div>
        </div>
        <div>
          <div class="form-label" style="margin-bottom:4px">จำนวนรายการ</div>
          <div style="color:var(--text-primary)">${items.length} รายการ</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header" style="flex-wrap:wrap;gap:8px">
        <div>
          <div class="card-title">รายการสินค้า</div>
          <div class="card-subtitle">แก้ไขข้อมูลสินค้าได้โดยตรง — กดยืนยันเมื่อตรวจสอบเรียบร้อยแล้ว</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" id="btnSaveAll" style="gap:6px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
            บันทึกทั้งหมด
          </button>
        </div>
      </div>
      <div class="table-wrapper" style="overflow-x:auto">
        <table class="excel-table">
          <thead>
            <tr>
              <th style="width:40px;text-align:center">#</th>
              <th style="width:130px">รหัสสินค้า</th>
              <th>ชื่อสินค้า</th>
              <th style="width:70px;text-align:center">Class</th>
              <th style="width:65px;text-align:center">จำนวน</th>
              <th style="width:150px">SN NO.</th>
              <th style="width:90px;text-align:center">สถานะ</th>
              <th style="min-width:250px">เงื่อนไขจากฝ่ายขาย</th>
              <th style="width:80px;text-align:center">ยืนยัน</th>
              <th style="width:44px"></th>
            </tr>
          </thead>
          <tbody>
            ${items.map((it, i) => `
              <tr class="${it.is_confirmed == 1 ? 'row-confirmed' : ''}">
                <td><div class="cell cell-num">${i + 1}</div></td>
                <td class="cell-editable">
                  <input class="cell-input item-edit-input" data-item-id="${it.id}" data-field="good_code"
                    data-original="${App.escapeHTML(it.good_code || '')}"
                    value="${App.escapeHTML(it.good_code || '')}" placeholder="รหัส" />
                </td>
                <td><div class="cell" id="name-${it.id}">${App.escapeHTML(it.good_name || '-')}</div></td>
                <td><div class="cell cell-badge" id="class-${it.id}">${it.class ? `<span class="badge badge-class">${App.escapeHTML(it.class)}</span>` : '-'}</div></td>
                <td><div class="cell cell-num">${parseInt(it.quantity) || 1}</div></td>
                <td class="cell-editable">
                  <input class="cell-input sn-input" data-item-id="${it.id}" data-field="serial_number"
                    data-original="${App.escapeHTML(it.serial_number || '')}"
                    value="${App.escapeHTML(it.serial_number || '')}" placeholder="SN..." />
                </td>
                <td><div class="cell cell-badge">${App.statusBadge(it.status)}</div></td>
                <td class="cell-editable">
                  <textarea
                    class="condition-input"
                    data-item-id="${it.id}"
                    data-original="${App.escapeHTML(it.sales_conditions || '')}"
                    rows="1"
                    placeholder="กรอกเงื่อนไข..."
                  >${App.escapeHTML(it.sales_conditions || '')}</textarea>
                </td>
                <td style="text-align:center">
                  ${it.is_confirmed == 1
                    ? `<span class="badge badge-completed" title="ยืนยันแล้ว" style="cursor:pointer;font-size:0.75rem" data-unconfirm="${it.id}">✓ แล้ว</span>`
                    : `<input type="checkbox" class="confirm-cb" data-item-id="${it.id}" style="width:18px;height:18px;cursor:pointer" />`
                  }
                </td>
                <td style="text-align:center">
                  <button class="btn-split-row" data-split-id="${it.id}" title="แยกแถว (สร้าง SN ใหม่)" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--accent-blue-light);font-size:1.1rem;line-height:1">⊕</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // ── Back button ──
  document.getElementById('btnBackToReturns').addEventListener('click', () => {
    location.hash = 'returns';
  });

  // ── Edit History button ──
  document.getElementById('btnEditHistory').addEventListener('click', async () => {
    const itemIds = items.map(it => it.id);
    Pages._showEditHistory(itemIds, r.receipt_number);
  });

  // ── Live preview: lookup product on good_code blur ──
  container.querySelectorAll('.item-edit-input[data-field="good_code"]').forEach(inp => {
    inp.addEventListener('blur', async () => {
      const code = inp.value.trim();
      const itemId = inp.dataset.itemId;
      if (!code) return;
      if (code === inp.dataset.original) return;

      const nameEl = document.getElementById(`name-${itemId}`);
      const classEl = document.getElementById(`class-${itemId}`);

      try {
        const response = await fetch(`api/products.php?code=${encodeURIComponent(code)}`);
        const res = await response.json();

        if (response.ok && res.good_name) {
          if (nameEl) { nameEl.textContent = res.good_name; nameEl.style.color = ''; }
          if (classEl) classEl.innerHTML = res.class
            ? `<span class="badge badge-class">${res.class}</span>`
            : '-';
        } else {
          if (nameEl) { nameEl.textContent = '⚠ ไม่พบรหัสนี้'; nameEl.style.color = 'var(--danger)'; }
          if (classEl) classEl.innerHTML = '-';
        }
      } catch (e) {
        if (nameEl) { nameEl.textContent = '⚠ ไม่พบรหัสนี้'; nameEl.style.color = 'var(--danger)'; }
      }
    });
  });

  // ── Unified Save All: item edits + conditions + confirmations ──
  document.getElementById('btnSaveAll').addEventListener('click', async () => {
    const btn = document.getElementById('btnSaveAll');
    const savePayload = {};

    // 1) Collect changed good_codes
    const codeInputs = document.querySelectorAll('.item-edit-input[data-field="good_code"]');
    const codeUpdates = [];
    codeInputs.forEach(inp => {
      const val = inp.value.trim();
      const orig = inp.dataset.original || '';
      if (val && val !== orig) {
        codeUpdates.push({ id: parseInt(inp.dataset.itemId), good_code: val });
      }
    });
    if (codeUpdates.length) savePayload.update_items = codeUpdates;

    // 2a) Collect changed serial numbers
    const snInputs = document.querySelectorAll('.sn-input');
    const snUpdates = [];
    snInputs.forEach(inp => {
      const val = inp.value.trim();
      const orig = inp.dataset.original || '';
      if (val !== orig) {
        snUpdates.push({ id: parseInt(inp.dataset.itemId), serial_number: val });
      }
    });
    if (snUpdates.length) savePayload.update_serial_numbers = snUpdates;

    // 2) Collect changed conditions
    const condTextareas = document.querySelectorAll('.condition-input');
    const condUpdates = [];
    condTextareas.forEach(ta => {
      const val = ta.value.trim();
      const orig = ta.dataset.original || '';
      if (val !== orig) {
        condUpdates.push({ id: parseInt(ta.dataset.itemId, 10), sales_conditions: val });
      }
    });
    if (condUpdates.length) savePayload.update_conditions = condUpdates;

    // 3) Collect confirmed checkboxes
    const checked = Array.from(document.querySelectorAll('.confirm-cb:checked'));
    const confirmIds = checked.map(cb => parseInt(cb.dataset.itemId));
    if (confirmIds.length) savePayload.confirm_items = confirmIds;

    // Nothing changed?
    if (Object.keys(savePayload).length === 0) {
      App.toast('ไม่มีการเปลี่ยนแปลง', 'info');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-sm"></span> กำลังบันทึก...';

    try {
      const result = await App.api('returns.php', {
        method: 'PATCH',
        body: { save_all: savePayload }
      });
      App.toast(`✓ ${result.message}`, 'success');
      Pages.returnDetail(container, id);
    } catch (err) {
      App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg> บันทึกทั้งหมด';
    }
  });

  // ── Unconfirm (click on "✓ แล้ว" badge) ──
  container.querySelectorAll('[data-unconfirm]').forEach(badge => {
    badge.addEventListener('click', async () => {
      const itemId = parseInt(badge.dataset.unconfirm);
      if (!await App.confirmDialog({ title: 'ยกเลิกการยืนยัน', message: 'ต้องการยกเลิกยืนยันรายการนี้?', type: 'warning', confirmText: 'ยกเลิกยืนยัน' })) return;

      try {
        await App.api('returns.php', {
          method: 'PATCH',
          body: { unconfirm_items: [itemId] }
        });
        App.toast('ยกเลิกยืนยันสำเร็จ', 'success');
        Pages.returnDetail(container, id);
      } catch (err) {
        App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      }
    });
  });

  // ── Split Row (duplicate item for new SN) ──
  container.querySelectorAll('.btn-split-row').forEach(btn => {
    btn.addEventListener('click', async () => {
      const itemId = parseInt(btn.dataset.splitId);
      if (!await App.confirmDialog({ title: 'แยกแถว', message: 'สร้างรายการใหม่จากสินค้าตัวนี้?\n(ใช้เมื่อ SN ต่างกัน ต้องแยกคนละบรรทัด)', type: 'info', confirmText: '⊕ แยกแถว' })) return;

      try {
        await App.api('returns.php', {
          method: 'PATCH',
          body: { split_item: itemId }
        });
        App.toast('แยกแถวสำเร็จ — กรุณากรอก SN ในแถวใหม่', 'success');
        Pages.returnDetail(container, id);
      } catch (err) {
        App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      }
    });
  });
};
Pages._showEditHistory = async function(itemIds, receiptNumber) {
  let allLogs = [];
  for (const itemId of itemIds) {
    try {
      const data = await App.api(`edit_logs.php?table=return_items&record_id=${itemId}`);
      if (data.logs && data.logs.length) {
        allLogs = allLogs.concat(data.logs.map(l => ({ ...l, item_id: itemId })));
      }
    } catch (e) { /* skip */ }
  }

  // Sort by date desc
  allLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const fieldLabels = {
    sales_conditions: 'เงื่อนไขฝ่ายขาย',
    status: 'สถานะ',
    good_code: 'รหัสสินค้า',
    good_name: 'ชื่อสินค้า',
    quantity: 'จำนวน',
    assigned_to: 'ผู้รับผิดชอบ',
    serial_number: 'SN NO.',
    notes: 'หมายเหตุ'
  };

  const body = allLogs.length === 0
    ? '<div class="empty-state" style="padding:32px"><p>ยังไม่มีประวัติการแก้ไข</p></div>'
    : `<div class="table-wrapper" style="max-height:400px;overflow-y:auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>วันเวลา</th>
              <th>ผู้แก้ไข</th>
              <th>Item ID</th>
              <th>ฟิลด์</th>
              <th>ค่าเดิม</th>
              <th>ค่าใหม่</th>
            </tr>
          </thead>
          <tbody>
            ${allLogs.map(l => `
              <tr>
                <td style="white-space:nowrap;font-size:0.8rem">${l.created_at}</td>
                <td>${App.escapeHTML(l.user_name || '-')}</td>
                <td style="text-align:center">${l.record_id}</td>
                <td><span class="badge badge-muted">${fieldLabels[l.field_name] || l.field_name}</span></td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;color:var(--text-muted)">${App.escapeHTML(l.old_value || '-')}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;font-weight:600">${App.escapeHTML(l.new_value || '-')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;

  App.openModal(`📋 ประวัติแก้ไข — ${App.escapeHTML(receiptNumber)}`, body);
};
  // ── Inspection (ตรวจสอบสินค้า) ─────────────
Pages._inspData = [];
Pages._inspCauses = [];
Pages._inspPage = 1;
Pages._inspPerPage = 50;
Pages._inspSearch = '';