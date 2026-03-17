/* ============================================
 Create return receipt
 ============================================ */

Pages.returnCreate = async function(container) {
  const today = new Date().toISOString().slice(0, 10);

  // Fetch return types from DB
  let returnTypes = [];
  try {
    const rtData = await App.api('settings.php?type=return_types');
    returnTypes = rtData.return_types || [];
  } catch (e) { returnTypes = []; }

  container.innerHTML = `
    <div class="page-section">

      <!-- Top bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" id="btnBackReturnList" style="gap:6px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          กลับรายการ
        </button>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-primary" id="btnSaveReturnPage" style="gap:6px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            สร้างใบรับคืน
          </button>
        </div>
      </div>

      <!-- Document Header Card -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-body" style="padding:0">
          <table class="recon-doc-header-table">
            <tbody>
              <tr>
                <td class="rdh-label">เลขที่ใบรับคืน *</td>
                <td class="rdh-value">
                  <input class="form-input" id="retReceiptNumber" placeholder="เช่น RT8608-0001" required style="max-width:280px">
                </td>
                <td class="rdh-label">วันที่รับคืน *</td>
                <td class="rdh-value"><input class="form-input" id="retReturnDate" type="date" value="${today}" required style="max-width:200px"></td>
              </tr>
              <tr>
                <td class="rdh-label">สาขา/ลูกค้า</td>
                <td class="rdh-value">
                  <input class="form-input" id="retBranchName" placeholder="ชื่อสาขาหรือลูกค้า" style="max-width:320px">
                </td>
                <td class="rdh-label">ประเภทการรับคืน</td>
                <td class="rdh-value">
                  <select class="form-select" id="retReturnType" style="max-width:220px">
                    <option value="">-- เลือก --</option>
                    ${returnTypes.map(rt => `<option value="${App.escapeHTML(rt.name || rt.type_name || '')}">${App.escapeHTML(rt.name || rt.type_name || '')}</option>`).join('')}
                  </select>
                </td>
              </tr>
              <tr>
                <td class="rdh-label">คลังที่เก็บ</td>
                <td class="rdh-value">
                  <input class="form-input" id="retWarehouse" value="020" style="max-width:280px">
                </td>
                <td class="rdh-label">หมายเหตุ</td>
                <td class="rdh-value"><textarea class="form-textarea" id="retNotes" rows="2" placeholder="หมายเหตุ..." style="width:100%"></textarea></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Items Table (Excel-style) -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:8px">
            <h3 style="margin:0;font-size:0.92rem">รายการสินค้า</h3>
            <span id="retItemCountBadge" class="badge badge-received" style="margin-left:4px;font-size:0.72rem">0</span>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-outline" id="retBtnClearItems" style="color:var(--accent-red);font-size:0.78rem">ล้างทั้งหมด</button>
            <button class="btn btn-sm btn-outline" id="retBtnAddItemRow" style="font-size:0.78rem">+ เพิ่มแถว</button>
          </div>
        </div>
        <div style="overflow-x:auto">
          <table class="recon-inline-table" id="retItemsTable" style="border-collapse:collapse;width:100%">
            <thead>
              <tr>
                <th style="width:36px;text-align:center;padding:6px 4px">No.</th>
                <th style="width:150px;padding:6px 4px">รหัสสินค้า</th>
                <th style="min-width:200px;padding:6px 4px">ชื่อสินค้า</th>
                <th style="width:80px;text-align:center;padding:6px 4px">คลาส</th>
                <th style="width:70px;text-align:center;padding:6px 4px">จำนวน</th>
                <th style="width:36px;padding:6px 4px"></th>
              </tr>
            </thead>
            <tbody id="retItemsBody"></tbody>
          </table>
        </div>
      </div>

    </div>
  `;

  // ── Back button (browser history) ──
  document.getElementById('btnBackReturnList').addEventListener('click', () => {
    if (window.history.length > 1) { history.back(); } else { location.hash = 'returns'; }
  });

  // ── Item table management ──
  const itemsBody = document.getElementById('retItemsBody');
  const countBadge = document.getElementById('retItemCountBadge');
  let _lookupTimers = {};

  const updateCount = () => {
    countBadge.textContent = itemsBody.querySelectorAll('tr').length;
  };

  const addItemRow = (code = '', name = '', cls = '', qty = 1) => {
    const tr = document.createElement('tr');
    const rowNum = itemsBody.children.length + 1;
    const rowId = 'rr_' + Date.now() + '_' + rowNum;
    tr.innerHTML = `
      <td class="cell-num" style="text-align:center;padding:3px 4px;font-size:0.78rem">${rowNum}</td>
      <td style="padding:0"><input class="cell-input" data-col="code" value="${App.escapeHTML(code)}" placeholder="รหัส" style="width:100%;font-size:0.82rem;padding:5px 6px;border:none;border-right:1px solid var(--border);background:transparent;outline:none"></td>
      <td style="padding:0"><input class="cell-input" data-col="name" value="${App.escapeHTML(name)}" placeholder="(อัตโนมัติ)" style="width:100%;font-size:0.82rem;padding:5px 6px;border:none;border-right:1px solid var(--border);background:var(--bg-body);color:var(--text-muted);outline:none" readonly tabindex="-1"></td>
      <td style="text-align:center;padding:3px 4px;border-right:1px solid var(--border)"><span class="cell-class" style="font-size:0.78rem;font-weight:500">${App.escapeHTML(cls) || '-'}</span></td>
      <td style="padding:0"><input class="cell-input" data-col="qty" value="${qty}" style="text-align:center;width:100%;font-size:0.82rem;padding:5px 6px;border:none;border-right:1px solid var(--border);background:transparent;outline:none;-moz-appearance:textfield" inputmode="numeric"></td>
      <td style="text-align:center;padding:2px">
        <button class="btn-icon-danger" title="ลบ" style="display:inline-flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;padding:0"
          onclick="this.closest('tr').remove()">
          <lottie-player src="assets/icons8-delete.json" background="transparent" speed="1" style="width:18px;height:18px" hover></lottie-player>
        </button>
      </td>
    `;

    // Auto-lookup on code input (debounced)
    const codeInput = tr.querySelector('[data-col="code"]');
    const nameInput = tr.querySelector('[data-col="name"]');
    const classSpan = tr.querySelector('.cell-class');

    codeInput.addEventListener('input', () => {
      clearTimeout(_lookupTimers[rowId]);
      const val = codeInput.value.trim();
      if (!val) { nameInput.value = ''; classSpan.textContent = '-'; return; }
      _lookupTimers[rowId] = setTimeout(async () => {
        try {
          const p = await App.api('products.php?code=' + encodeURIComponent(val));
          nameInput.value = p.good_name || '';
          classSpan.textContent = p.class || '-';
        } catch (e) {
          nameInput.value = '';
          classSpan.textContent = '-';
        }
      }, 400);
    });

    // If code is pre-filled, trigger lookup
    if (code && !name) {
      (async () => {
        try {
          const p = await App.api('products.php?code=' + encodeURIComponent(code));
          nameInput.value = p.good_name || '';
          classSpan.textContent = p.class || '-';
        } catch (e) { /* skip */ }
      })();
    }

    itemsBody.appendChild(tr);
    updateCount();
    return tr;
  };

  // Start with 1 empty row
  addItemRow();

  // ── Add / Clear rows ──
  document.getElementById('retBtnAddItemRow').addEventListener('click', () => {
    const tr = addItemRow();
    setTimeout(() => tr.querySelector('[data-col="code"]')?.focus(), 50);
  });

  document.getElementById('retBtnClearItems').addEventListener('click', async () => {
    if (itemsBody.children.length === 0) return;
    const ok = await App.confirmDialog({ title: 'ล้างรายการทั้งหมด', message: 'ต้องการลบรายการสินค้าทั้งหมดออก?', type: 'danger', confirmText: 'ล้างทั้งหมด' });
    if (ok) { itemsBody.innerHTML = ''; updateCount(); }
  });

  // ── Enter key → next row ──
  itemsBody.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentTr = e.target.closest('tr');
      const nextTr = currentTr?.nextElementSibling;
      if (nextTr) {
        nextTr.querySelector('[data-col="code"]')?.focus();
      } else {
        const tr = addItemRow();
        setTimeout(() => tr.querySelector('[data-col="code"]')?.focus(), 50);
      }
    }
  });

  // ── Save ──
  document.getElementById('btnSaveReturnPage').addEventListener('click', async () => {
    const receipt = {
      receipt_number: document.getElementById('retReceiptNumber').value.trim(),
      return_date: document.getElementById('retReturnDate').value,
      branch_name: document.getElementById('retBranchName').value.trim(),
      return_type: document.getElementById('retReturnType').value,
      warehouse: document.getElementById('retWarehouse').value.trim() || '020',
      notes: document.getElementById('retNotes').value.trim(),
      items: []
    };

    if (!receipt.receipt_number || !receipt.return_date) {
      App.toast('กรุณากรอกเลขที่ใบรับคืนและวันที่', 'error');
      return;
    }

    itemsBody.querySelectorAll('tr').forEach(tr => {
      const code = tr.querySelector('[data-col="code"]')?.value?.trim() || '';
      const name = tr.querySelector('[data-col="name"]')?.value?.trim() || '';
      const qty = parseInt(tr.querySelector('[data-col="qty"]')?.value) || 1;
      if (code || name) {
        receipt.items.push({ good_code: code, good_name: name, quantity: qty });
      }
    });

    if (receipt.items.length === 0) {
      App.toast('กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ', 'error');
      return;
    }

    try {
      const result = await App.api('returns.php', { method: 'POST', body: receipt });
      App.toast(`บันทึกใบรับคืน ${receipt.items.length} รายการสำเร็จ`, 'success');
      if (result.id) {
        location.hash = 'returns/' + result.id;
      } else {
        location.hash = 'returns';
      }
    } catch (err) {
      App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
  });
};
Pages.showReturnForm = function(data = null) {
  const isEdit = !!data;
  const body = `
    <form id="returnForm">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">เลขที่ใบรับคืน *</label>
          <input class="form-input" name="receipt_number" value="${data?.receipt_number || ''}" required>
        </div>
        <div class="form-group">
          <label class="form-label">วันที่รับคืน *</label>
          <input class="form-input" type="date" name="return_date" value="${data?.return_date || new Date().toISOString().split('T')[0]}" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">สาขา/ลูกค้า</label>
          <input class="form-input" name="branch_name" value="${data?.branch_name || ''}" placeholder="ชื่อสาขาหรือลูกค้า">
        </div>
        <div class="form-group">
          <label class="form-label">ประเภทการรับคืน</label>
          <select class="form-select" name="return_type">
            <option value="">-- เลือก --</option>
            <option value="เคลียร์แรนท์" ${data?.return_type === 'เคลียร์แรนท์' ? 'selected' : ''}>เคลียร์แรนท์</option>
            <option value="ตัวโชว์" ${data?.return_type === 'ตัวโชว์' ? 'selected' : ''}>ตัวโชว์</option>
            <option value="ชำรุด" ${data?.return_type === 'ชำรุด' ? 'selected' : ''}>ชำรุด</option>
            <option value="อื่นๆ" ${data?.return_type === 'อื่นๆ' ? 'selected' : ''}>อื่นๆ</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">คลังที่เก็บ</label>
          <input class="form-input" name="warehouse" value="${data?.warehouse || ''}" placeholder="เช่น คลังปรับสภาพ">
        </div>
        <div class="form-group">
          <label class="form-label">เลขที่เอกสาร</label>
          <input class="form-input" name="document_number" value="${data?.document_number || ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">หมายเหตุ</label>
        <textarea class="form-textarea" name="notes" rows="2">${data?.notes || ''}</textarea>
      </div>

      <hr style="border:none;border-top:1px solid var(--border-color);margin:20px 0">

      <!-- ===== IMPORT ZONE ===== -->
      <div class="paste-zone" id="pasteZone">
        <div class="paste-zone-header">
          <div class="card-title" style="font-size:0.95rem">📥 นำเข้ารายการสินค้า</div>
          <div class="paste-zone-hint">เลือกวิธีนำเข้า: อัปโหลดไฟล์ Excel หรือ Copy-Paste</div>
        </div>

        <!-- Import Method Tabs -->
        <div class="import-tabs">
          <button type="button" class="import-tab active" data-tab="file">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            📁 Import ไฟล์ Excel
          </button>
          <button type="button" class="import-tab" data-tab="paste">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
            📋 Copy-Paste
          </button>
        </div>

        <!-- Tab: File Upload -->
        <div class="import-panel active" id="panelFile">
          <div class="file-drop-zone" id="fileDropZone">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:36px;height:36px;margin-bottom:8px;opacity:0.4"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg>
            <div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:4px">ลากไฟล์มาวาง หรือ คลิกเลือกไฟล์</div>
            <div style="font-size:0.78rem;color:var(--text-muted)">รองรับ .xlsx, .xls, .csv</div>
            <input type="file" id="excelFileInput" accept=".xlsx,.xls,.csv" style="display:none">
          </div>
          <div id="fileInfo" class="file-info" style="display:none"></div>
          <div class="paste-col-hint" style="margin-top:8px">⚡ ระบบจะอ่านข้อมูลจาก Sheet แรก — ตรวจจับ คอลัมน์ รหัส/ชื่อ/จำนวน อัตโนมัติ</div>
        </div>

        <!-- Tab: Paste -->
        <div class="import-panel" id="panelPaste">
          <textarea id="pasteInput" class="paste-textarea" rows="4"
            placeholder="Copy ข้อมูลจาก Excel แล้ววางที่นี่...&#10;&#10;ตัวอย่าง (Tab คั่น):&#10;รหัสสินค้า    ชื่อสินค้า    จำนวน&#10;SINK-001    ซิงค์สแตนเลส    2&#10;TAP-005     ก๊อกน้ำ       1"></textarea>
          <div class="paste-actions">
            <button type="button" class="btn btn-outline btn-sm" id="btnParsePaste">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>
              นำเข้าข้อมูล
            </button>
            <span class="paste-col-hint">⚡ รองรับ: รหัสสินค้า → ชื่อสินค้า → จำนวน (Tab หรือ | คั่น)</span>
          </div>
        </div>
      </div>

      <!-- ===== ITEMS TABLE ===== -->
      <div class="items-section">
        <div class="flex items-center justify-between mb-12">
          <div class="card-title" style="font-size:0.95rem">รายการสินค้า <span id="itemCountBadge" class="badge badge-received" style="margin-left:6px">0</span></div>
          <div class="flex gap-8">
            <button type="button" class="btn btn-outline btn-sm" id="btnClearItems" style="color:var(--accent-red)">ล้างทั้งหมด</button>
            <button type="button" class="btn btn-outline btn-sm" id="btnAddItemRow">+ เพิ่มแถว</button>
          </div>
        </div>
        <div class="table-wrapper" style="max-height:350px;overflow-y:auto">
          <table class="data-table items-edit-table" id="itemsTable">
            <thead>
              <tr>
                <th style="width:36px">#</th>
                <th style="width:150px">รหัสสินค้า</th>
                <th>ชื่อสินค้า</th>
                <th style="width:80px">จำนวน</th>
                <th style="width:40px"></th>
              </tr>
            </thead>
            <tbody id="itemsBody"></tbody>
          </table>
        </div>
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-outline" onclick="App.closeModal()">ยกเลิก</button>
    <button class="btn btn-primary" id="btnSaveReturn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
      บันทึก
    </button>
  `;

  App.openModal(isEdit ? 'แก้ไขใบรับคืน' : 'เพิ่มใบรับคืนสินค้า', body, footer);

  // ── Item Table Management ──
  const itemsBody = document.getElementById('itemsBody');
  const countBadge = document.getElementById('itemCountBadge');

  const updateCount = () => {
    const rows = itemsBody.querySelectorAll('tr');
    countBadge.textContent = rows.length;
  };

  const addItemToTable = (code = '', name = '', qty = 1) => {
    const tr = document.createElement('tr');
    const rowNum = itemsBody.children.length + 1;
    tr.innerHTML = `
      <td class="row-num">${rowNum}</td>
      <td><input class="cell-input" data-col="code" value="${App.escapeHTML(code)}" placeholder="รหัส"></td>
      <td><input class="cell-input" data-col="name" value="${App.escapeHTML(name)}" placeholder="ชื่อสินค้า"></td>
      <td><input class="cell-input cell-input-num" data-col="qty" type="number" value="${parseInt(qty) || 1}" min="1"></td>
      <td><button type="button" class="btn-icon-delete" title="ลบ">✕</button></td>
    `;
    tr.querySelector('.btn-icon-delete').addEventListener('click', () => {
      tr.remove();
      renumberRows();
      updateCount();
    });

    // Support Tab from qty to next row code
    const qtyInput = tr.querySelector('[data-col="qty"]');
    qtyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && !e.shiftKey) {
        const next = tr.nextElementSibling;
        if (!next) {
          e.preventDefault();
          addItemToTable();
          setTimeout(() => {
            const lastRow = itemsBody.lastElementChild;
            if (lastRow) lastRow.querySelector('[data-col="code"]')?.focus();
          }, 50);
        }
      }
    });

    // Also support paste within any cell to detect multi-line paste
    tr.querySelectorAll('.cell-input').forEach(input => {
      input.addEventListener('paste', (e) => {
        const pasted = (e.clipboardData || window.clipboardData).getData('text');
        if (pasted.includes('\t') || pasted.includes('\n')) {
          e.preventDefault();
          parsePastedData(pasted);
        }
      });
    });

    itemsBody.appendChild(tr);
    updateCount();
  };

  const renumberRows = () => {
    itemsBody.querySelectorAll('tr').forEach((tr, i) => {
      tr.querySelector('.row-num').textContent = i + 1;
    });
  };

  // ── Paste Parser ──
  const parsePastedData = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    let addedCount = 0;

    lines.forEach(line => {
      // Split by tab, pipe, or multiple spaces (4+)
      let cols = line.split('\t');
      if (cols.length < 2) cols = line.split('|').map(c => c.trim());
      if (cols.length < 2) cols = line.split(/\s{4,}/);

      if (cols.length >= 1) {
        let code = '', name = '', qty = 1;

        if (cols.length >= 3) {
          // 3+ columns: code, name, qty
          code = cols[0].trim();
          name = cols[1].trim();
          const parsedQty = parseInt(cols[2].trim());
          qty = isNaN(parsedQty) || parsedQty < 1 ? 1 : parsedQty;
        } else if (cols.length === 2) {
          // 2 columns: could be code+name or name+qty
          const maybeQty = parseInt(cols[1].trim());
          if (!isNaN(maybeQty) && maybeQty > 0 && cols[1].trim().length <= 6) {
            // second col is qty
            code = cols[0].trim();
            qty = maybeQty;
          } else {
            code = cols[0].trim();
            name = cols[1].trim();
          }
        } else {
          // single column — treat as product name
          name = cols[0].trim();
        }

        // Skip if it looks like a header
        const skipWords = ['รหัส', 'ชื่อ', 'จำนวน', 'สินค้า', 'code', 'name', 'qty', 'product', 'ลำดับ', 'no.', '#'];
        const lower = (code + name).toLowerCase();
        if (skipWords.some(w => lower.includes(w)) && addedCount === 0) return;

        if (code || name) {
          addItemToTable(code, name, qty);
          addedCount++;
        }
      }
    });

    if (addedCount > 0) {
      App.toast(`นำเข้า ${addedCount} รายการสำเร็จ`, 'success');
    } else {
      App.toast('ไม่พบข้อมูลที่นำเข้าได้', 'error');
    }

    // Clear paste input
    document.getElementById('pasteInput').value = '';
  };

  // ── Event Bindings ──
  document.getElementById('btnParsePaste').addEventListener('click', () => {
    const text = document.getElementById('pasteInput').value;
    if (!text.trim()) {
      App.toast('กรุณาวางข้อมูลก่อน', 'error');
      return;
    }
    parsePastedData(text);
  });

  // Auto-parse on paste into the paste textarea
  document.getElementById('pasteInput').addEventListener('paste', (e) => {
    setTimeout(() => {
      const text = document.getElementById('pasteInput').value;
      if (text.trim()) parsePastedData(text);
    }, 100);
  });

  // ── Tab Switching ──
  document.querySelectorAll('.import-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.import-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.import-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = tab.dataset.tab === 'file' ? 'panelFile' : 'panelPaste';
      document.getElementById(panel).classList.add('active');
    });
  });

  // ── Excel File Import ──
  const fileInput = document.getElementById('excelFileInput');
  const dropZone = document.getElementById('fileDropZone');
  const fileInfoEl = document.getElementById('fileInfo');

  // Click to browse
  dropZone.addEventListener('click', () => fileInput.click());

  // Drag & Drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processExcelFile(file);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) processExcelFile(fileInput.files[0]);
  });

  const processExcelFile = (file) => {
    const validExts = ['.xlsx', '.xls', '.csv'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!validExts.includes(ext)) {
      App.toast('รองรับเฉพาะไฟล์ .xlsx, .xls, .csv', 'error');
      return;
    }

    fileInfoEl.style.display = 'flex';
    fileInfoEl.innerHTML = `
      <span>📄 ${App.escapeHTML(file.name)} (${(file.size / 1024).toFixed(1)} KB)</span>
      <span class="badge badge-inspecting">กำลังอ่าน...</span>
    `;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (rows.length === 0) {
          App.toast('ไฟล์ว่างเปล่า', 'error');
          fileInfoEl.innerHTML = `<span>📄 ${App.escapeHTML(file.name)}</span><span class="badge badge-rejected">ไม่มีข้อมูล</span>`;
          return;
        }

        // Smart column detection: find code, name, qty columns
        const headerRow = rows[0].map(h => String(h).toLowerCase().trim());
        let colCode = -1, colName = -1, colQty = -1;
        let dataStartRow = 0;

        // Try to detect header row
        const codeWords = ['รหัส', 'code', 'sku', 'รหัสสินค้า', 'item code', 'product code', 'barcode'];
        const nameWords = ['ชื่อ', 'name', 'สินค้า', 'รายการ', 'ชื่อสินค้า', 'product', 'description', 'item', 'รายละเอียด'];
        const qtyWords = ['จำนวน', 'qty', 'quantity', 'จน.', 'จำนวน(ชิ้น)', 'pcs', 'หน่วย', 'amount'];

        headerRow.forEach((h, i) => {
          if (colCode === -1 && codeWords.some(w => h.includes(w))) colCode = i;
          if (colName === -1 && nameWords.some(w => h.includes(w))) colName = i;
          if (colQty === -1 && qtyWords.some(w => h.includes(w))) colQty = i;
        });

        // If found headers, data starts from row 1
        if (colCode !== -1 || colName !== -1) {
          dataStartRow = 1;
        } else {
          // No header detected — assume first 2-3 columns: code, name, qty
          dataStartRow = 0;
          if (rows[0].length >= 3) {
            colCode = 0; colName = 1; colQty = 2;
          } else if (rows[0].length === 2) {
            colCode = 0; colName = 1;
          } else {
            colName = 0;
          }
        }

        // Fill missing column indices with best guesses
        if (colCode === -1 && colName !== -1) {
          // Look for a column that might have codes (short alphanumeric values)
          for (let i = 0; i < headerRow.length; i++) {
            if (i !== colName && i !== colQty) { colCode = i; break; }
          }
        }
        if (colName === -1 && colCode !== -1) {
          for (let i = 0; i < headerRow.length; i++) {
            if (i !== colCode && i !== colQty) { colName = i; break; }
          }
        }

        let addedCount = 0;
        for (let r = dataStartRow; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.every(c => !c && c !== 0)) continue; // skip empty rows

          const code = colCode >= 0 ? String(row[colCode] || '').trim() : '';
          const name = colName >= 0 ? String(row[colName] || '').trim() : '';
          const rawQty = colQty >= 0 ? row[colQty] : 1;
          const qty = parseInt(rawQty) || 1;

          if (code || name) {
            addItemToTable(code, name, qty);
            addedCount++;
          }
        }

        if (addedCount > 0) {
          App.toast(`นำเข้า ${addedCount} รายการจาก ${App.escapeHTML(file.name)} สำเร็จ`, 'success');
          fileInfoEl.innerHTML = `
            <span>📄 ${App.escapeHTML(file.name)}</span>
            <span class="badge badge-completed">✓ ${addedCount} รายการ</span>
          `;
        } else {
          App.toast('ไม่พบข้อมูลสินค้าในไฟล์', 'error');
          fileInfoEl.innerHTML = `<span>📄 ${App.escapeHTML(file.name)}</span><span class="badge badge-rejected">ไม่พบข้อมูล</span>`;
        }
      } catch (err) {
        console.error('Excel parse error:', err);
        App.toast('ไม่สามารถอ่านไฟล์ Excel: ' + err.message, 'error');
        fileInfoEl.innerHTML = `<span>📄 ${App.escapeHTML(file.name)}</span><span class="badge badge-rejected">อ่านไม่ได้</span>`;
      }
    };
    reader.readAsArrayBuffer(file);
  };

  document.getElementById('btnAddItemRow').addEventListener('click', () => {
    addItemToTable();
    setTimeout(() => {
      const lastRow = itemsBody.lastElementChild;
      if (lastRow) lastRow.querySelector('[data-col="code"]')?.focus();
    }, 50);
  });

  document.getElementById('btnClearItems').addEventListener('click', async () => {
    if (itemsBody.children.length === 0) return;
    const ok = await App.confirmDialog({ title: 'ล้างรายการทั้งหมด', message: 'ต้องการลบรายการสินค้าทั้งหมดออก?', type: 'danger', confirmText: 'ล้างทั้งหมด' });
    if (ok) {
      itemsBody.innerHTML = '';
      updateCount();
    }
  });

  // Start with 1 empty row
  addItemToTable();

  // ── Save ──
  document.getElementById('btnSaveReturn').addEventListener('click', async () => {
    const form = document.getElementById('returnForm');
    const fd = new FormData(form);
    const receipt = {
      receipt_number: fd.get('receipt_number'),
      return_date: fd.get('return_date'),
      branch_name: fd.get('branch_name'),
      return_type: fd.get('return_type'),
      warehouse: fd.get('warehouse'),
      document_number: fd.get('document_number'),
      notes: fd.get('notes'),
      items: []
    };

    if (!receipt.receipt_number || !receipt.return_date) {
      App.toast('กรุณากรอกเลขที่ใบรับคืนและวันที่', 'error');
      return;
    }

    // Collect items from the table
    itemsBody.querySelectorAll('tr').forEach(tr => {
      const code = tr.querySelector('[data-col="code"]')?.value?.trim() || '';
      const name = tr.querySelector('[data-col="name"]')?.value?.trim() || '';
      const qty = parseInt(tr.querySelector('[data-col="qty"]')?.value) || 1;
      if (code || name) {
        receipt.items.push({ good_code: code, good_name: name, quantity: qty });
      }
    });

    if (receipt.items.length === 0) {
      App.toast('กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ', 'error');
      return;
    }

    try {
      await App.api('returns.php', { method: 'POST', body: receipt });
      App.toast(`บันทึกใบรับคืน ${receipt.items.length} รายการสำเร็จ`, 'success');
      App.closeModal();
      Pages.returns(document.getElementById('pageContainer'));
    } catch (err) {
      App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
  });
};
Pages.viewReturn = function(id) {
  location.hash = 'returns/' + id;
};