/* ============================================
 Recon detail + warehouse assignment
 ============================================ */

Pages.reconDetail = async function(container, docId) {
  // docId === null → create mode
  const isNew = !docId;
  if (isNew) {
    // Create mode: no API calls needed yet
    Pages._reconDoc = null;
    Pages._reconItems = [];
    try {
      const [receiptsRes, inspectorsRes, whRes] = await Promise.all([
        App.api('reconditioning.php?available_receipts=1'),
        App.api('reconditioning.php?inspectors=1'),
        App.api('reconditioning.php?warehouses=1'),
      ]);
      Pages._reconReceipts = receiptsRes.receipts || [];
      Pages._reconInspectors = inspectorsRes.inspectors || [];
      Pages._reconWarehouses = whRes.warehouses || [];
    } catch { Pages._reconReceipts = []; Pages._reconInspectors = []; Pages._reconWarehouses = []; }
    Pages._renderReconDetail(container, null);
    return;
  }
  try {
    const [docRes, receiptsRes, inspectorsRes, whRes] = await Promise.all([
      App.api(`reconditioning.php?doc_id=${docId}`),
      App.api('reconditioning.php?available_receipts=1'),
      App.api('reconditioning.php?inspectors=1'),
      App.api('reconditioning.php?warehouses=1'),
    ]);
    Pages._reconDoc = docRes.document;
    Pages._reconItems = docRes.items || [];
    Pages._reconReceipts = receiptsRes.receipts || [];
    Pages._reconInspectors = inspectorsRes.inspectors || [];
    Pages._reconWarehouses = whRes.warehouses || [];
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><h3>เกิดข้อผิดพลาด</h3><p>${err.message}</p></div>`;
    return;
  }
  Pages._renderReconDetail(container, docId);
};
Pages._renderReconDetail = function(container, docId) {
  const doc   = Pages._reconDoc;  // null in create mode
  const items = Pages._reconItems;
  const receipts = Pages._reconReceipts;
  const isNew = !docId;

  // receiptsMap: receipt_number → receipt object
  const receiptsMap = Object.fromEntries((receipts || []).map(r => [r.receipt_number, r]));
  const receiptNumbers = (receipts || []).map(r => r.receipt_number);

  const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('th-TH', {day:'2-digit',month:'2-digit',year:'numeric'}) : '-';
  const today = new Date().toISOString().slice(0, 10);

  // ── Header: editable in create, read-only in edit ──
  const headerHTML = isNew ? `
    <table class="recon-doc-header-table">
      <tbody>
        <tr>
          <td class="rdh-label">เลขที่เอกสารปรับสภาพ *</td>
          <td class="rdh-value">
            <div style="display:flex;gap:6px;align-items:center">
              <input class="form-input" id="reconDocNumber" placeholder="เช่น RTV2569-00001" required autofocus style="max-width:280px">
              <button class="btn btn-outline btn-sm" id="btnAutoDocNumber" type="button" style="white-space:nowrap;gap:4px">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                สร้างอัตโนมัติ
              </button>
            </div>
          </td>
          <td class="rdh-label">วันที่เอกสาร *</td>
          <td class="rdh-value"><input class="form-input" id="reconDocDate" type="date" value="${today}" required style="max-width:200px"></td>
        </tr>
        <tr>
          <td class="rdh-label">ผู้บันทึก</td>
          <td class="rdh-value"><input class="form-input" id="reconInspector" value="${App.escapeHTML(Auth.user?.display_name || '')}" readonly style="max-width:320px;background:var(--bg-main);cursor:default"></td>
          <td class="rdh-label"></td>
          <td class="rdh-value"></td>
        </tr>
        <tr>
          <td class="rdh-label">หมายเหตุ</td>
          <td class="rdh-value" colspan="3"><textarea class="form-textarea" id="reconNotes" rows="2" placeholder="หมายเหตุ..." style="width:100%"></textarea></td>
        </tr>
      </tbody>
    </table>
  ` : `
    <table class="recon-doc-header-table">
      <tbody>
        <tr>
          <td class="rdh-label">เลขที่เอกสารปรับสภาพ</td>
          <td class="rdh-value"><strong style="font-size:1.05rem;color:var(--primary)">${App.escapeHTML(doc.doc_number)}</strong></td>
          <td class="rdh-label">วันที่เอกสาร</td>
          <td class="rdh-value">${fmtDate(doc.doc_date)}</td>
        </tr>
        <tr>
          <td class="rdh-label">ผู้บันทึก</td>
          <td class="rdh-value">${App.escapeHTML(doc.inspector_name || '—')}</td>
          <td class="rdh-label"></td>
          <td class="rdh-value"></td>
        </tr>
        <tr>
          <td class="rdh-label">หมายเหตุ</td>
          <td class="rdh-value" colspan="3" style="color:var(--text-muted)">${App.escapeHTML(doc.notes || '—')}</td>
        </tr>
      </tbody>
    </table>
  `;

  container.innerHTML = `
    <div class="page-section">

      <!-- ── Top bar ─────────────────────────── -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" id="btnBackRecon" style="gap:6px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          กลับรายการเอกสาร
        </button>
        <div style="display:flex;gap:8px;align-items:center">
          ${isNew ? '' : `<span style="font-size:0.8rem;color:var(--text-muted)">${items.length} รายการในเอกสาร</span>`}
          <button class="btn btn-primary" id="btnSaveReconDoc" style="gap:6px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            ${isNew ? 'สร้างเอกสาร' : 'บันทึก'}
          </button>
          ${!isNew ? `<button class="btn btn-outline" style="gap:5px" id="btnPrintRTV" onclick="window._reconHandlers?.printRTV()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            🖨️ ปริ้นเอกสาร RTV
          </button>
          <button class="btn btn-outline" style="gap:5px" id="btnPrintLabels" onclick="window._reconHandlers?.printLabels()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>
            🏷️ ปริ้น Label
          </button>` : ''}
        </div>
      </div>

      <!-- ── Document Header Card (SO-style) ── -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-body" style="padding:0">
          ${headerHTML}
        </div>
      </div>

      <!-- ── Items Table ── -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:8px">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="width:18px;height:18px"><path d="M12 5v14M5 12h14"/></svg>
            <h3 style="margin:0;font-size:0.95rem">รายการสินค้า</h3>
          </div>
          <button class="btn btn-sm btn-outline" id="btnAddReconRow" style="gap:5px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M12 5v14M5 12h14"/></svg>
            เพิ่มแถว
          </button>
        </div>

        <!-- Inline entry table -->
        <div style="max-height:380px;overflow-y:auto;position:relative">
          <table class="recon-inline-table" id="reconInlineTable">
            <thead>
              <tr>
                <th style="width:36px">No.</th>
                <th style="width:160px">เลขที่รับคืน</th>
                <th style="width:100px">สาขา</th>
                <th style="width:100px">ประเภท</th>
                <th style="width:120px">รหัสสินค้า</th>
                <th style="min-width:180px">ชื่อสินค้า</th>
                <th style="width:120px">SN NO.</th>
                <th style="width:55px">จำนวน</th>
                <th style="width:50px">คลาส</th>
                <th style="width:140px">คลังปลายทาง</th>
                <th style="min-width:160px">เหตุผล</th>
                <th style="width:60px">สถานะ</th>
                <th style="width:36px"></th>
              </tr>
            </thead>
            <tbody id="reconInlineBody">
              <!-- saved items -->
              ${items.map((r, i) => {
                const warehouses = Pages._reconWarehouses || [];
                const whMap = Object.fromEntries(warehouses.map(w => [w.code, w.name]));
                const needsReason = ['105', '109'];
                const tw = r.target_warehouse || '';
                const isDone = r.status === 'completed';
                const whLabel = whMap[tw] || tw;
                return `
                <tr class="recon-saved-row" data-id="${r.id}" data-status="${r.status || 'pending'}">
                  <td class="cell-num">${i + 1}</td>
                  <td><span class="cell-badge">${App.escapeHTML(r.receipt_number || '-')}</span></td>
                  <td style="font-size:0.78rem">${App.escapeHTML(r.branch_name || '-')}</td>
                  <td style="font-size:0.78rem">${App.escapeHTML(r.return_type || '-')}</td>
                  <td><span class="cell-badge">${App.escapeHTML(r.good_code || '-')}</span></td>
                  <td style="font-size:0.82rem">${App.escapeHTML(r.good_name || '-')}</td>
                  <td style="font-size:0.78rem;color:var(--text-muted)">${App.escapeHTML(r.serial_number || '-')}</td>
                  <td class="cell-num">${r.quantity || '-'}</td>
                  <td class="cell-num">${r.class ? '<span class="badge badge-class">' + App.escapeHTML(r.class) + '</span>' : '-'}</td>
                  <td style="position:relative">
                    ${isDone
                      ? '<span style="font-size:0.78rem;font-weight:600;color:' + (needsReason.includes(tw) ? '#dc2626' : '#059669') + '">' + App.escapeHTML(whLabel) + '</span>'
                      : '<input class="recon-wh-input" data-recon-id="' + r.id + '" type="text" placeholder="พิมพ์รหัส/ชื่อ..." value="' + (tw ? App.escapeHTML(tw + ' - ' + whLabel) : '') + '" autocomplete="off" style="font-size:0.78rem;padding:3px 6px;border:1px solid var(--border-color);border-radius:4px;width:100%;box-sizing:border-box;background:transparent">'
                        + '<input type="hidden" class="recon-wh-val" data-recon-id="' + r.id + '" value="' + App.escapeHTML(tw) + '">'
                        + '<div class="recon-wh-dropdown" data-recon-id="' + r.id + '" style="display:none;position:absolute;left:0;right:0;top:100%;z-index:20;background:var(--bg-card);border:1px solid var(--border-color);border-radius:6px;max-height:200px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.12)"></div>'
                    }
                  </td>
                  <td>
                    ${isDone
                      ? '<span style="font-size:0.75rem;color:var(--text-muted)">' + App.escapeHTML(r.cause_text || '—') + '</span>'
                      : '<input class="recon-reason-input" data-recon-id="' + r.id + '" placeholder="เหตุผล..." value="' + App.escapeHTML(r.cause_text || '') + '" style="font-size:0.78rem;padding:3px 6px;border:1px solid var(--border-color);border-radius:4px;width:100%;display:' + (needsReason.includes(tw) ? 'block' : 'none') + '">'
                    }
                  </td>
                  <td style="text-align:center">
                    ${isDone
                      ? '<span style="font-size:1rem" title="ปรับสภาพเสร็จ">✅</span>'
                      : '<button class="recon-confirm-btn" data-recon-id="' + r.id + '" title="ยืนยันคลังปลายทาง" style="background:#059669;color:#fff;border:none;border-radius:4px;padding:2px 8px;font-size:0.72rem;cursor:pointer;white-space:nowrap" disabled>✓</button>'
                    }
                  </td>
                  <td style="text-align:center;vertical-align:middle">
                    <button class="btn-icon-danger" data-del-recon="${r.id}" title="ลบ" style="display:inline-flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;padding:0">
                      <lottie-player src="assets/icons8-delete.json" background="transparent" speed="1" style="width:20px;height:20px" hover></lottie-player>
                    </button>
                  </td>
                </tr>`;
              }).join('')}
              <!-- new-entry row will be injected here -->
            </tbody>
          </table>
        </div>


      </div>

    </div>
  `;

  // ── Print Handlers ──
  window._reconHandlers = {
    printRTV: () => {
      if (!doc || items.length === 0) { App.toast('ไม่มีรายการให้พิมพ์', 'error'); return; }
      const esc = (s) => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      const docDate = doc.doc_date ? new Date(doc.doc_date+'T00:00:00').toLocaleDateString('th-TH',{day:'2-digit',month:'2-digit',year:'numeric'}) : '-';
      const totalQty = items.reduce((s,it) => s + (parseInt(it.quantity)||1), 0);
      const whCodes = ['001','101','102-2','109'];
      const printHTML = `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>เอกสารส่งมอบสินค้าคลัง020 ${esc(doc.doc_number)}</title>
<style>
  @page{size:A4 landscape;margin:10mm 8mm}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Cordia New','TH SarabunPSK','Tahoma',sans-serif;font-size:13px;color:#000;background:#fff}
  .hdr{text-align:center;font-size:16px;font-weight:bold;margin-bottom:2px}
  .sub-hdr{display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;padding:0 4px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border:1px solid #000;padding:3px 5px;vertical-align:top}
  th{background:#e8e8e8;text-align:center;white-space:nowrap;font-weight:bold}
  .c{text-align:center} .n{text-align:center}
  .wh-col{width:28px;text-align:center;font-size:10px}
  .total{text-align:center;font-weight:bold;font-size:14px;margin:8px 0}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
  <div class="hdr">เอกสารส่งมอบสินค้าคลัง020 เพื่อปรับสภาพ(QC) &nbsp;&nbsp;&nbsp; ${esc(doc.doc_number)}</div>
  <div class="sub-hdr"><span>ลำดับวันที่: ${docDate}</span><span>วันที่ส่งคืน: ___________</span></div>
  <table>
  <thead>
    <tr>
      <th rowspan="2" style="width:24px">ลำดับ</th>
      <th rowspan="2">เลขที่ใบรับคืน</th>
      <th colspan="2">รายการสินค้าที่ปรับสภาพ</th>
      <th rowspan="2">จำนวน</th>
      <th colspan="${whCodes.length}">ผลสรุป</th>
      <th rowspan="2">เอกสาร/เหรีย</th>
      <th rowspan="2">ผู้ปรับ</th>
      <th rowspan="2">เหตุผลฝ่ายขาย/ข้อมูลจากการตรวจ</th>
      <th rowspan="2">Class</th>
      <th rowspan="2">SN NO(หมายเลขเครื่อง)</th>
    </tr>
    <tr>
      <th>รหัสสินค้า</th>
      <th>ชื่อรุ่นสินค้า</th>
      ${whCodes.map(c => '<th class="wh-col">'+esc(c)+'</th>').join('')}
    </tr>
  </thead>
  <tbody>
    ${items.map((it, i) => {
      const tw = it.target_warehouse || '';
      return '<tr>' +
        '<td class="c">'+(i+1)+'</td>' +
        '<td>'+esc(it.receipt_number||'-')+'</td>' +
        '<td>'+esc(it.good_code||'-')+'</td>' +
        '<td>'+esc(it.good_name||'-')+'</td>' +
        '<td class="n">'+(parseInt(it.quantity)||1)+'</td>' +
        whCodes.map(c => '<td class="wh-col">'+(tw===c?'\\u2713':'')+'</td>').join('') +
        '<td></td>' +
        '<td></td>' +
        '<td style="font-size:11px">'+esc(it.cause_text||it.sales_reason||'-')+'</td>' +
        '<td class="c">'+esc(it.class||'-')+'</td>' +
        '<td>'+esc(it.serial_number||'')+'</td>' +
      '</tr>';
    }).join('')}
  </tbody>
  </table>
  <div class="total">รวม: ${totalQty} รายการ</div>
</body></html>`;
      const w = window.open('','_blank','width=1100,height=700');
      w.document.write(printHTML); w.document.close();
      w.onload = () => { w.focus(); w.print(); };
    },
    printLabels: () => {
      if (!doc || items.length === 0) { App.toast('ไม่มีรายการให้พิมพ์', 'error'); return; }
      const esc = (s) => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const whCodes = ['001','101','102-2','109'];
      const labelsHTML = `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>Labels - ${esc(doc.doc_number)}</title>
<style>
  @page{size:A4 portrait;margin:8mm}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Cordia New','TH SarabunPSK','Tahoma',sans-serif;font-size:12px;color:#000;background:#fff}
  .labels-grid{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-start}
  .label{width:48%;border:1.5px solid #000;border-radius:4px;padding:6px 8px;page-break-inside:avoid;font-size:11px;line-height:1.4}
  .label-title{font-weight:bold;font-size:12px;border-bottom:1px solid #999;margin-bottom:3px;padding-bottom:2px}
  .label-row{display:flex;justify-content:space-between}
  .label-field{margin-bottom:2px}
  .label-field b{font-weight:bold}
  .wh-checks{display:flex;gap:8px;margin-top:4px;padding-top:3px;border-top:1px dashed #999}
  .wh-check{display:flex;align-items:center;gap:2px;font-size:11px}
  .wh-box{width:12px;height:12px;border:1.5px solid #000;display:inline-block}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
  <div class="labels-grid">
  ${items.map(it => `
    <div class="label">
      <div class="label-title">${esc(doc.doc_number)} #${esc(it.good_code||'-')}</div>
      <div class="label-row">
        <div class="label-field"><b>รุ่น:</b> ${esc(it.good_name||'-')}</div>
      </div>
      <div class="label-row">
        <div class="label-field"><b>ใบรับคืน:</b> ${esc(it.receipt_number||'-')}</div>
        <div class="label-field"><b>Class:</b> ${esc(it.class||'-')}</div>
      </div>
      <div class="label-row">
        <div class="label-field"><b>ประเภท:</b> ${esc(it.return_type||'-')}</div>
        <div class="label-field"><b>สาขา:</b> ${esc(it.branch_name||'-')}</div>
      </div>
      <div class="label-field"><b>SN:</b> ${esc(it.serial_number||'___________')}</div>
      <div class="wh-checks">
        ${whCodes.map(c => '<span class="wh-check"><span class="wh-box"></span>'+esc(c)+'</span>').join('')}
      </div>
    </div>
  `).join('')}
  </div>
</body></html>`;
      const w = window.open('','_blank','width=900,height=700');
      w.document.write(labelsHTML); w.document.close();
      w.onload = () => { w.focus(); w.print(); };
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────

  // Build a new editable row and append to tbody
  const addEditRow = () => {
    const rowIdx = document.querySelectorAll('#reconInlineBody tr').length + 1;
    const tr = document.createElement('tr');
    tr.className = 'recon-edit-row';
    tr.innerHTML = `
      <td class="cell-num" style="color:var(--text-muted)">${rowIdx}</td>
      <td>
        <div class="rit-combo" data-role="receipt-combo">
          <input class="rit-combo-input" type="text" placeholder="พิมพ์เลขรับคืน..." autocomplete="off" data-role="receipt">
          <svg class="rit-combo-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
          <div class="rit-combo-dropdown" data-role="receipt-dropdown"></div>
        </div>
        <input type="hidden" data-role="receipt-id">
      </td>
      <td class="rit-info cell-text" data-role="branch" style="font-size:0.78rem">—</td>
      <td class="rit-info cell-text" data-role="return-type" style="font-size:0.78rem">—</td>
      <td>
        <div class="rit-combo" data-role="product-combo">
          <input class="rit-combo-input" type="text" placeholder="— เลือกใบคืนก่อน —" autocomplete="off" data-role="product-search" disabled>
          <svg class="rit-combo-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
          <div class="rit-combo-dropdown" data-role="product-dropdown"></div>
        </div>
        <input type="hidden" data-role="product">
      </td>
      <td class="rit-info cell-text" data-role="name">—</td>
      <td class="rit-info cell-text" data-role="sn" style="font-size:0.75rem;text-align:center;color:var(--text-muted)">—</td>
      <td class="rit-info cell-num" data-role="qty">—</td>
      <td class="rit-info cell-num" data-role="class">—</td>
      <td style="color:var(--text-muted);font-size:0.75rem;text-align:center">—</td>
      <td style="color:var(--text-muted);font-size:0.75rem;text-align:center">—</td>
      <td style="color:var(--text-muted);font-size:0.75rem;text-align:center">—</td>
      <td style="text-align:center;vertical-align:middle">
        <button class="btn-icon-danger recon-cancel-row" title="ยกเลิกแถวนี้" style="display:inline-flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;padding:0">
          <lottie-player src="assets/icons8-delete.json" background="transparent" speed="1" style="width:20px;height:20px" hover></lottie-player>
        </button>
      </td>
    `;
    document.getElementById('reconInlineBody').appendChild(tr);
    bindEditRow(tr);
    tr.querySelector('[data-role="receipt"]').focus();
  };

  const bindEditRow = (tr) => {
    const receiptInput  = tr.querySelector('[data-role="receipt"]');
    const receiptIdHid  = tr.querySelector('[data-role="receipt-id"]');
    const receiptDD     = tr.querySelector('[data-role="receipt-dropdown"]');
    const productInput  = tr.querySelector('[data-role="product-search"]');
    const productHid    = tr.querySelector('[data-role="product"]');
    const productDD     = tr.querySelector('[data-role="product-dropdown"]');
    const cellName      = tr.querySelector('[data-role="name"]');
    const cellSn        = tr.querySelector('[data-role="sn"]');
    const cellQty       = tr.querySelector('[data-role="qty"]');
    const cellClass     = tr.querySelector('[data-role="class"]');
    const cellBranch    = tr.querySelector('[data-role="branch"]');
    const cellRetType   = tr.querySelector('[data-role="return-type"]');

    // ── Helper: build combobox ──
    const buildCombo = (input, dropdown, options, onSelect) => {
      let highlighted = -1;
      const render = (filter = '') => {
        const q = filter.toLowerCase();
        const filtered = options.filter(o => o.label.toLowerCase().includes(q));
        if (filtered.length === 0) {
          dropdown.innerHTML = '<div class="rit-combo-empty">ไม่พบรายการ</div>';
        } else {
          dropdown.innerHTML = filtered.map((o, i) =>
            `<div class="rit-combo-option${o.selected ? ' selected' : ''}" data-idx="${i}" data-value="${App.escapeHTML(String(o.value))}">${App.escapeHTML(o.label)}</div>`
          ).join('');
        }
        dropdown.classList.add('open');
        highlighted = -1;
        dropdown.querySelectorAll('.rit-combo-option').forEach(el => {
          el.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const opt = options.find(o => String(o.value) === el.dataset.value);
            if (opt) { input.value = opt.label; onSelect(opt); }
            dropdown.classList.remove('open');
          });
        });
      };

      input.addEventListener('input', () => render(input.value));
      input.addEventListener('click', () => { if (!dropdown.classList.contains('open')) render(input.value); });
      input.addEventListener('blur', () => setTimeout(() => dropdown.classList.remove('open'), 150));
      input.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.rit-combo-option');
        if (e.key === 'ArrowDown') { e.preventDefault(); highlighted = Math.min(highlighted + 1, items.length - 1); items.forEach((el, i) => el.classList.toggle('highlighted', i === highlighted)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); highlighted = Math.max(highlighted - 1, 0); items.forEach((el, i) => el.classList.toggle('highlighted', i === highlighted)); }
        else if (e.key === 'Enter') {
          e.preventDefault();
          if (highlighted >= 0 && items[highlighted]) { items[highlighted].dispatchEvent(new Event('mousedown')); }
          else if (items.length === 1) { items[0].dispatchEvent(new Event('mousedown')); }
        }
        else if (e.key === 'Escape') { dropdown.classList.remove('open'); input.blur(); }
      });
      return { render, setOptions: (newOpts) => { options.length = 0; options.push(...newOpts); } };
    };

    // ── Receipt combobox — filter out fully-used receipts ──
    const getAvailableReceipts = () => {
      // Count how many times each receipt number is selected in OTHER rows
      const usedCount = {};
      document.querySelectorAll('.recon-edit-row').forEach(otherTr => {
        if (otherTr === tr) return;
        const rInput = otherTr.querySelector('[data-role="receipt"]');
        const rIdHid = otherTr.querySelector('[data-role="receipt-id"]');
        if (rInput && rIdHid && rIdHid.value) {
          const rn = rInput.value.trim();
          if (rn) usedCount[rn] = (usedCount[rn] || 0) + 1;
        }
      });
      return receiptNumbers.filter(n => {
        const receipt = receiptsMap[n];
        const remaining = parseInt(receipt?.remaining_items) || 1;
        const used = usedCount[n] || 0;
        return used < remaining; // still has available items
      });
    };
    const receiptOptions = getAvailableReceipts().map(n => ({ value: n, label: n, selected: false }));
    const receiptCombo = buildCombo(receiptInput, receiptDD, receiptOptions, async (opt) => {
      const receipt = receiptsMap[opt.value];
      const rid = receipt?.id || '';
      receiptIdHid.value = rid || '';
      // Fill branch and return type
      if (cellBranch) cellBranch.textContent = receipt?.branch_name || '—';
      if (cellRetType) cellRetType.textContent = receipt?.return_type || '—';
      if (!rid) return;
      productInput.value = '';
      productInput.placeholder = 'กำลังโหลด...';
      productHid.value = '';
      try {
        const data = await App.api(`reconditioning.php?receipt_items=${rid}`);
        const its = data.items || [];
        tr._receiptItems = its;
        if (its.length === 0) {
          productInput.placeholder = 'ไม่มีสินค้าที่ยังไม่ปรับ';
          productInput.disabled = true;
          productCombo.setOptions([]);
        } else {
          productInput.disabled = false;
          const pOpts = its.map(it => ({ value: it.id, label: it.good_code, selected: false, _item: it }));
          productCombo.setOptions(pOpts);
          if (its.length === 1) {
            productInput.value = pOpts[0].label;
            productHid.value = its[0].id;
            fillInfo(its[0]);
          } else {
            productInput.placeholder = 'พิมพ์ค้นหาสินค้า...';
            [cellName, cellQty, cellClass].forEach(c => c.textContent = '—');
          }
        }
      } catch {
        productInput.placeholder = 'เกิดข้อผิดพลาด';
      }
    });

    // Refresh receipt options on focus to filter out already-selected receipts
    receiptInput.addEventListener('focus', () => {
      const freshOpts = getAvailableReceipts().map(n => ({ value: n, label: n, selected: false }));
      receiptCombo.setOptions(freshOpts);
    });

    // ── Product combobox ──
    const productCombo = buildCombo(productInput, productDD, [], (opt) => {
      productHid.value = opt.value;
      const it = (tr._receiptItems || []).find(x => x.id === parseInt(opt.value));
      if (it) fillInfo(it);
    });

    const fillInfo = (it) => {
      cellName.textContent  = it.good_name || '—';
      cellSn.textContent    = it.serial_number || '—';
      cellQty.textContent   = it.quantity  || '—';
      cellClass.innerHTML   = it.class ? `<span class="badge badge-class">${App.escapeHTML(it.class)}</span>` : '—';
    };

    tr.querySelector('.recon-cancel-row').addEventListener('click', () => tr.remove());
  };

  // ── Warehouse combobox handlers (for saved rows) ──
  const warehouseList = (Pages._reconWarehouses || []).filter(w => w.code !== '020');
  const allWhInputs = [...container.querySelectorAll('.recon-wh-input')];

  allWhInputs.forEach((inp, idx) => {
    const reconId = inp.dataset.reconId;
    const hidVal = container.querySelector(`.recon-wh-val[data-recon-id="${reconId}"]`);
    const dd = container.querySelector(`.recon-wh-dropdown[data-recon-id="${reconId}"]`);
    const reasonInput = container.querySelector(`.recon-reason-input[data-recon-id="${reconId}"]`);
    const confirmBtn = container.querySelector(`.recon-confirm-btn[data-recon-id="${reconId}"]`);
    let highlighted = -1;

    const renderDD = (filter = '') => {
      const q = filter.toLowerCase();
      const filtered = warehouseList.filter(w =>
        w.code.toLowerCase().includes(q) || w.name.toLowerCase().includes(q)
      );
      if (filtered.length === 0) {
        dd.innerHTML = '<div style="padding:8px 12px;color:var(--text-muted);font-size:0.78rem">ไม่พบคลัง</div>';
      } else {
        dd.innerHTML = filtered.map((w, i) =>
          '<div class="recon-wh-opt" data-code="' + App.escapeHTML(w.code) + '" style="padding:6px 12px;font-size:0.78rem;cursor:pointer;border-bottom:1px solid var(--border-color)">'
          + App.escapeHTML(w.code + ' - ' + w.name) + '</div>'
        ).join('');
      }
      dd.style.display = 'block';
      highlighted = -1;
      // bind clicks
      dd.querySelectorAll('.recon-wh-opt').forEach(el => {
        el.addEventListener('mousedown', (e) => {
          e.preventDefault();
          selectWH(el.dataset.code);
        });
        el.addEventListener('mouseenter', () => {
          dd.querySelectorAll('.recon-wh-opt').forEach(o => o.style.background = '');
          el.style.background = 'var(--primary-light, #ede9fe)';
        });
        el.addEventListener('mouseleave', () => { el.style.background = ''; });
      });
    };

    const selectWH = (code) => {
      const w = warehouseList.find(x => x.code === code);
      if (w) {
        inp.value = w.code + ' - ' + w.name;
        hidVal.value = w.code;
        dd.style.display = 'none';
        // Show/hide reason
        if (reasonInput) reasonInput.style.display = ['105', '109'].includes(w.code) ? 'block' : 'none';
        if (confirmBtn) confirmBtn.disabled = false;
      }
    };

    inp.addEventListener('focus', () => renderDD(inp.value));
    inp.addEventListener('click', () => { if (dd.style.display === 'none') renderDD(inp.value); });
    inp.addEventListener('input', () => {
      hidVal.value = '';
      if (confirmBtn) confirmBtn.disabled = true;
      renderDD(inp.value);
    });
    inp.addEventListener('blur', () => setTimeout(() => { dd.style.display = 'none'; }, 150));
    inp.addEventListener('keydown', (e) => {
      const opts = dd.querySelectorAll('.recon-wh-opt');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (dd.style.display === 'none' || opts.length === 0) {
          // Jump to next row's warehouse input
          if (allWhInputs[idx + 1]) allWhInputs[idx + 1].focus();
          return;
        }
        highlighted = Math.min(highlighted + 1, opts.length - 1);
        opts.forEach((o, i) => o.style.background = i === highlighted ? 'var(--primary-light, #ede9fe)' : '');
        opts[highlighted]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (dd.style.display === 'none' || opts.length === 0) {
          if (allWhInputs[idx - 1]) allWhInputs[idx - 1].focus();
          return;
        }
        highlighted = Math.max(highlighted - 1, 0);
        opts.forEach((o, i) => o.style.background = i === highlighted ? 'var(--primary-light, #ede9fe)' : '');
        opts[highlighted]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlighted >= 0 && opts[highlighted]) {
          selectWH(opts[highlighted].dataset.code);
        } else if (opts.length === 1) {
          selectWH(opts[0].dataset.code);
        }
      } else if (e.key === 'Escape') {
        dd.style.display = 'none';
        inp.blur();
      }
    });
  });

  container.querySelectorAll('.recon-confirm-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const reconId = btn.dataset.reconId;
      const hidVal = container.querySelector(`.recon-wh-val[data-recon-id="${reconId}"]`);
      const reasonInput = container.querySelector(`.recon-reason-input[data-recon-id="${reconId}"]`);
      const wh = hidVal?.value;
      if (!wh) { App.toast('กรุณาเลือกคลังปลายทาง', 'error'); return; }
      if (['105', '109'].includes(wh) && !(reasonInput?.value?.trim())) {
        App.toast('กรุณาระบุเหตุผลสำหรับคลัง ' + (wh === '105' ? 'ทำลาย' : 'บริจาค'), 'error');
        reasonInput?.focus();
        return;
      }
      btn.disabled = true;
      btn.textContent = '...';
      try {
        await App.api('reconditioning.php', {
          method: 'PUT',
          body: {
            id: parseInt(reconId),
            target_warehouse: wh,
            cause_text: reasonInput?.value?.trim() || null,
            status: 'completed'
          }
        });
        App.toast('✓ บันทึกคลังปลายทางสำเร็จ', 'success');
        // Reload to refresh the view
        App.navigateTo('reconditioning/' + docId);
      } catch (err) {
        App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
        btn.disabled = false;
        btn.textContent = '✓';
      }
    });
  });

  const saveRow = async (tr) => {
    const receiptIdHid = tr.querySelector('[data-role="receipt-id"]');
    const productSel   = tr.querySelector('input[data-role="product"]');
    const rid  = receiptIdHid.value;
    const pid  = productSel.value;
    if (!rid)  { App.toast('กรุณาระบุเลขรับคืน', 'error'); return; }
    if (!pid)  { App.toast('กรุณาเลือกรหัสสินค้า', 'error'); return; }

    tr.style.opacity = '0.5';
    try {
      await App.api('reconditioning.php', {
        method: 'POST',
        body: { action: 'add_item', recon_doc_id: docId, item_id: parseInt(pid), target_warehouse: '020' }
      });
      App.toast('✓ เพิ่มรายการสำเร็จ', 'success');
      await Pages.reconDetail(container, docId);
    } catch (err) {
      App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      tr.style.opacity = '1';
    }
  };

  // ── Bind ──────────────────────────────────────────────────────────

  document.getElementById('btnBackRecon').addEventListener('click', () => {
    App.navigateTo('reconditioning');
  });

  // Auto-generate doc number button
  if (isNew) {
    const btnAuto = document.getElementById('btnAutoDocNumber');
    if (btnAuto) btnAuto.addEventListener('click', async () => {
      btnAuto.disabled = true;
      btnAuto.textContent = 'กำลังสร้าง...';
      try {
        const res = await App.api('reconditioning.php?next_doc_number=1');
        document.getElementById('reconDocNumber').value = res.next_doc_number;
        App.toast('✓ สร้างเลขเอกสารอัตโนมัติ', 'success');
      } catch (err) {
        App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      }
      btnAuto.disabled = false;
      btnAuto.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg> สร้างอัตโนมัติ`;
    });
  }

  // Save button — create or update
  document.getElementById('btnSaveReconDoc').addEventListener('click', async () => {
    const btn = document.getElementById('btnSaveReconDoc');
    if (isNew) {
      // Create mode
      const docNumber = document.getElementById('reconDocNumber')?.value?.trim();
      const docDate   = document.getElementById('reconDocDate')?.value?.trim();
      if (!docNumber) { App.toast('กรุณาระบุเลขเอกสาร', 'error'); return; }
      if (!docDate)   { App.toast('กรุณาระบุวันที่เอกสาร', 'error'); return; }

      btn.disabled = true;
      btn.textContent = 'กำลังสร้าง...';
      try {
        const res = await App.api('reconditioning.php', {
          method: 'POST',
          body: {
            action: 'create_document',
            doc_number: docNumber,
            doc_date: docDate,
            inspector_name: document.getElementById('reconInspector')?.value?.trim() || null,
            notes: document.getElementById('reconNotes')?.value?.trim() || null,
          }
        });
        // Now add any pending items from edit rows
        const pendingRows = document.querySelectorAll('.recon-edit-row');
        let addedCount = 0;
        for (const row of pendingRows) {
          const pid = row.querySelector('[data-role="product"]')?.value;
          if (!pid) continue;
          try {
            await App.api('reconditioning.php', {
              method: 'POST',
              body: { action: 'add_item', recon_doc_id: res.id, item_id: parseInt(pid), target_warehouse: '020' }
            });
            addedCount++;
          } catch {}
        }
        App.toast(`✓ สร้างเอกสารสำเร็จ${addedCount ? ` (เพิ่ม ${addedCount} รายการ)` : ''}`, 'success');
        App.navigateTo('reconditioning/' + res.id);
      } catch (err) {
        App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> สร้างเอกสาร`;
      }
    } else {
      // Edit mode — add pending items + update header
      btn.disabled = true;
      btn.textContent = 'กำลังบันทึก...';
      try {
        // Update document header (notes)
        const notesEl = document.getElementById('reconNotes');
        if (notesEl) {
          await App.api('reconditioning.php', {
            method: 'PUT',
            body: { update_doc: true, id: docId, notes: notesEl.value.trim() || null }
          });
        }

        // Add any pending items from edit rows
        const pendingRows = document.querySelectorAll('.recon-edit-row');
        let addedCount = 0;
        for (const row of pendingRows) {
          const pid = row.querySelector('[data-role="product"]')?.value;
          if (!pid) continue;
          try {
            await App.api('reconditioning.php', {
              method: 'POST',
              body: { action: 'add_item', recon_doc_id: docId, item_id: parseInt(pid), target_warehouse: '020' }
            });
            addedCount++;
          } catch {}
        }

        App.toast(`✓ บันทึกสำเร็จ${addedCount ? ` (เพิ่ม ${addedCount} รายการ)` : ''}`, 'success');
        // Reload the page to reflect changes
        App.navigateTo('reconditioning/' + docId);
      } catch (err) {
        App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> บันทึก`;
      }
    }
  });

  {
    const addBtn = document.getElementById('btnAddReconRow');
    if (addBtn) addBtn.addEventListener('click', addEditRow);

    // Pre-create empty rows (fill up to 10 total rows)
    const existingRows = items.length;
    const emptyToCreate = Math.max(10 - existingRows, 0);
    for (let i = 0; i < emptyToCreate; i++) addEditRow();

    // Focus first row's receipt input
    const firstInput = document.querySelector('#reconInlineBody .recon-edit-row [data-role="receipt"]');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);

    // Delete saved items
    container.querySelectorAll('[data-del-recon]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!await App.confirmDialog({ title: 'ลบรายการ', message: 'ต้องการลบรายการนี้ออกจากเอกสาร?', type: 'danger', confirmText: 'ลบรายการ' })) return;
        try {
          await App.api('reconditioning.php', { method: 'DELETE', body: { id: parseInt(btn.dataset.delRecon) } });
          App.toast('✓ ลบรายการสำเร็จ', 'success');
          await Pages.reconDetail(container, docId);
        } catch (err) { App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error'); }
      });
    });

    // Enter key → save edit row
    container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const editRow = e.target.closest('.recon-edit-row');
        if (editRow && editRow.querySelector('[data-role="product"]').value) {
          saveRow(editRow);
        }
      }
    });
  }
};
  // ── Approvals (ขออนุมัติ) ───────────────────
Pages._appData = [];
Pages._appPage = 1;
Pages._appPerPage = 50;
Pages._appSearch = '';