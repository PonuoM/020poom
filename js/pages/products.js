/* ============================================
 Product catalog
 ============================================ */

Pages.products = async function(container) {
  try {
    const data = await App.api('products.php');
    Pages._productsData = data.products || [];
  } catch (e) { console.warn('Products API:', e); Pages._productsData = []; }

  Pages._prodPage = 1;
  Pages._prodSearch = '';
  Pages._prodClassFilter = new Set();
  Pages._renderProducts(container);
};
Pages._getFilteredProducts = function() {
  let data = Pages._productsData;
  // Class filter
  if (Pages._prodClassFilter && Pages._prodClassFilter.size > 0) {
    data = data.filter(p => Pages._prodClassFilter.has(p.class || ''));
  }
  // Text search
  if (Pages._prodSearch) {
    const q = Pages._prodSearch.toLowerCase();
    data = data.filter(p =>
      (p.good_code || '').toLowerCase().includes(q) ||
      (p.good_name || '').toLowerCase().includes(q) ||
      (p.product_type || '').toLowerCase().includes(q)
    );
  }
  return data;
};
Pages._renderProducts = function(container) {
  const filtered = Pages._getFilteredProducts();
  const total = filtered.length;
  const perPage = Pages._prodPerPage;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (Pages._prodPage > totalPages) Pages._prodPage = totalPages;
  const page = Pages._prodPage;
  const start = (page - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);

  // Build pagination numbers
  let pageNums = '';
  const maxButtons = 7;
  let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage < maxButtons - 1) startPage = Math.max(1, endPage - maxButtons + 1);

  if (startPage > 1) pageNums += `<button class="pg-btn" data-pg="1">1</button>`;
  if (startPage > 2) pageNums += `<span class="pg-dots">…</span>`;
  for (let i = startPage; i <= endPage; i++) {
    pageNums += `<button class="pg-btn${i === page ? ' active' : ''}" data-pg="${i}">${i}</button>`;
  }
  if (endPage < totalPages - 1) pageNums += `<span class="pg-dots">…</span>`;
  if (endPage < totalPages) pageNums += `<button class="pg-btn" data-pg="${totalPages}">${totalPages}</button>`;

  container.innerHTML = `
    <div class="flex items-center justify-between mb-24" style="flex-wrap:wrap;gap:12px">
      <div class="search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" id="searchProducts" placeholder="ค้นหารหัสสินค้า, ชื่อ..." value="${App.escapeHTML(Pages._prodSearch)}">
      </div>
      <div class="flex gap-8">
        <button class="btn btn-outline" id="btnImportProducts">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg>
          📥 Import Excel
        </button>
        <button class="btn btn-primary" id="btnAddProduct">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          เพิ่มสินค้า
        </button>
      </div>
    </div>

    <div class="flex items-center gap-8" style="margin-bottom:16px;flex-wrap:wrap">
      <span style="font-size:0.82rem;color:var(--text-muted);font-weight:600">กรอง Class:</span>
      <div id="classFilterBtns" class="flex gap-4" style="flex-wrap:wrap">
        ${(() => {
          const classes = [...new Set(Pages._productsData.map(p => p.class).filter(Boolean))].sort();
          return classes.map(c => `<button class="btn btn-sm class-filter-btn${Pages._prodClassFilter.has(c) ? ' active' : ''}" data-class="${c}">${c}</button>`).join('');
        })()}
      </div>
      <button class="btn btn-sm btn-ghost" id="btnClearClassFilter" style="font-size:0.78rem;color:var(--text-muted)${Pages._prodClassFilter.size === 0 ? ';display:none' : ''}">✕ ล้างตัวกรอง</button>
    </div>

    <div class="card">
      <div class="flex items-center justify-between" style="padding:12px 16px;border-bottom:1px solid var(--border-color);flex-wrap:wrap;gap:8px">
        <div style="font-size:0.82rem;color:var(--text-secondary)">
          ทั้งหมด <strong style="color:var(--text-primary)">${total.toLocaleString()}</strong> รายการ
          ${Pages._prodSearch ? ` (กรอง จาก ${Pages._productsData.length.toLocaleString()})` : ''}
        </div>
        <div class="flex items-center gap-8">
          <label style="font-size:0.8rem;color:var(--text-muted)">แสดง</label>
          <select id="prodPerPage" class="form-select" style="width:auto;padding:4px 8px;font-size:0.82rem;min-width:70px">
            ${[50,100,250,500,1000].map(n => `<option value="${n}"${n === perPage ? ' selected' : ''}>${n}</option>`).join('')}
          </select>
          <label style="font-size:0.8rem;color:var(--text-muted)">/ หน้า</label>
        </div>
      </div>
      <div class="table-wrapper" style="max-height:calc(100vh - 300px);overflow-y:auto">
        <table class="data-table" id="productsTable">
          <thead>
            <tr><th>#</th><th>รหัสสินค้า</th><th>ชื่อสินค้า</th><th>ประเภท</th><th>Class</th><th>ราคากลาง</th></tr>
          </thead>
          <tbody id="productsBody">
            ${pageItems.length === 0
              ? '<tr><td colspan="6" class="text-center" style="padding:32px;color:var(--text-muted)">ไม่พบข้อมูลสินค้า</td></tr>'
              : pageItems.map((p, i) => `
                <tr>
                  <td>${start + i + 1}</td>
                  <td><strong>${App.escapeHTML(p.good_code)}</strong></td>
                  <td>${App.escapeHTML(p.good_name)}</td>
                  <td>${p.product_type ? `<span class="badge badge-inspecting" style="font-size:0.72rem">${App.escapeHTML(p.product_type)}</span>` : '-'}</td>
                  <td>${p.class ? `<span class="badge badge-${p.class === 'A' ? 'completed' : p.class === 'B' ? 'reconditioning' : p.class === 'C' ? 'inspecting' : 'received'}">${p.class}</span>` : '-'}</td>
                  <td>${p.base_price ? Number(p.base_price).toLocaleString('th-TH') : '-'}</td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
      ${totalPages > 1 ? `
      <div class="pagination-bar" id="prodPagination">
        <button class="pg-btn" data-pg="${Math.max(1, page - 1)}" ${page === 1 ? 'disabled' : ''}>‹ ก่อน</button>
        ${pageNums}
        <button class="pg-btn" data-pg="${Math.min(totalPages, page + 1)}" ${page === totalPages ? 'disabled' : ''}>ถัดไป ›</button>
        <span class="pg-info">หน้า ${page} / ${totalPages}</span>
      </div>
      ` : ''}
    </div>
  `;

  // ── Event Bindings ──
  document.getElementById('btnAddProduct').addEventListener('click', () => Pages._showAddProductForm());
  document.getElementById('btnImportProducts').addEventListener('click', () => Pages.showProductImport());

  // Search
  const searchInput = document.getElementById('searchProducts');
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      Pages._prodSearch = searchInput.value.trim();
      Pages._prodPage = 1;
      Pages._renderProducts(container);
    }, 300);
  });

  // Class filter toggle buttons
  document.getElementById('classFilterBtns').addEventListener('click', (e) => {
    const btn = e.target.closest('.class-filter-btn');
    if (!btn) return;
    const cls = btn.dataset.class;
    if (Pages._prodClassFilter.has(cls)) {
      Pages._prodClassFilter.delete(cls);
    } else {
      Pages._prodClassFilter.add(cls);
    }
    Pages._prodPage = 1;
    Pages._renderProducts(container);
  });

  // Clear class filter
  document.getElementById('btnClearClassFilter').addEventListener('click', () => {
    Pages._prodClassFilter.clear();
    Pages._prodPage = 1;
    Pages._renderProducts(container);
  });

  // Per-page selector
  document.getElementById('prodPerPage').addEventListener('change', (e) => {
    Pages._prodPerPage = parseInt(e.target.value);
    Pages._prodPage = 1;
    Pages._renderProducts(container);
  });

  // Pagination clicks
  const pgBar = document.getElementById('prodPagination');
  if (pgBar) {
    pgBar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pg]');
      if (!btn || btn.disabled) return;
      Pages._prodPage = parseInt(btn.dataset.pg);
      Pages._renderProducts(container);
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
};
  // ══════════════════════════════════════════
  //  PRODUCT TYPE MAP & IMPORT
  // ══════════════════════════════════════════
  _productTypeMap: {
  '00': 'GLEM',
  '01': 'Washing Machine',
  '02': 'Vacuum Cleaner',
  '03': 'Hood',
  '04': 'Hob',
  '05': 'FreeStanding',
  '06': 'TableTop',
  '07': 'Oven',
  '08': 'Cooler & Fridge',
  '09': 'Sink & Accessories',
  '10': 'Water Heater',
  '11': 'Miscellaneous',
  '14': 'Sink Set',
  '15': 'Appliance Set',
  '16': 'Grille & Accessories',
  '17': 'Flexible Duct',
  '18': 'Connector',
  '19': 'Fragrance ELICA',
  '20': 'Gas Regulator & Accessories',
  '90': 'Special (Uncategorized)',
  '99': 'Special (Custom)'
};
Pages._getProductType = function(code) {
  const prefix = String(code).replace(/[^0-9\-]/g, '').substring(0, 2);
  return Pages._productTypeMap[prefix] || null;
};
Pages._showAddProductForm = function() {
  const body = `
    <form id="productForm">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">รหัสสินค้า *</label>
          <input class="form-input" name="good_code" required>
        </div>
        <div class="form-group">
          <label class="form-label">ชื่อสินค้า *</label>
          <input class="form-input" name="good_name" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Class</label>
          <select class="form-select" name="class">
            <option value="">-- ไม่ระบุ --</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">ราคากลาง</label>
          <input class="form-input" type="number" name="base_price" step="0.01" placeholder="0.00">
        </div>
      </div>
    </form>
  `;
  const footer = `
    <button class="btn btn-outline" onclick="App.closeModal()">ยกเลิก</button>
    <button class="btn btn-primary" id="btnSaveProduct">บันทึก</button>
  `;
  App.openModal('เพิ่มสินค้า', body, footer);

  document.getElementById('btnSaveProduct').addEventListener('click', async () => {
    const form = document.getElementById('productForm');
    const fd = new FormData(form);
    if (!fd.get('good_code') || !fd.get('good_name')) {
      App.toast('กรุณากรอกรหัสและชื่อสินค้า', 'error');
      return;
    }
    try {
      const code = fd.get('good_code');
      await App.api('products.php', {
        method: 'POST',
        body: {
          good_code: code,
          good_name: fd.get('good_name'),
          product_type: Pages._getProductType(code),
          class: fd.get('class') || null,
          base_price: fd.get('base_price') ? parseFloat(fd.get('base_price')) : 0
        }
      });
      App.toast('เพิ่มสินค้าสำเร็จ', 'success');
      App.closeModal();
      Pages.products(document.getElementById('pageContainer'));
    } catch (err) {
      App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
  });
};
Pages.showProductImport = function() {
  const typeEntries = Object.entries(Pages._productTypeMap).map(([k, v]) => `<tr><td style="font-family:monospace;font-weight:bold">${k}xx</td><td>${v}</td></tr>`).join('');

  const body = `
    <div class="bulk-import-container">
      <div class="paste-zone" style="margin-bottom:0">
        <div class="paste-zone-header">
          <div class="card-title" style="font-size:0.95rem">📥 Import สินค้าจาก Excel</div>
          <div class="paste-zone-hint">อัปโหลดไฟล์ Excel ที่มีคอลัมน์ <strong>รหัสสินค้า</strong>, <strong>ชื่อสินค้า</strong> และ <strong>Class</strong> — ระบบจะกำหนดประเภทจากรหัสอัตโนมัติ (Class จะคงค่าเดิมถ้าไม่ระบุ)</div>
        </div>
        <div class="file-drop-zone" id="prodDropZone" style="margin-top:10px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:36px;height:36px;margin-bottom:8px;opacity:0.4"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg>
          <div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:4px">ลากไฟล์มาวาง หรือ คลิกเลือกไฟล์</div>
          <div style="font-size:0.78rem;color:var(--text-muted)">รองรับ .xlsx, .xls, .csv</div>
          <input type="file" id="prodFileInput" accept=".xlsx,.xls,.csv" style="display:none">
        </div>
        <div id="prodFileInfo" class="file-info" style="display:none"></div>
        <details style="margin-top:10px">
          <summary style="cursor:pointer;color:var(--text-secondary);font-size:0.82rem">📖 ตารางรหัสประเภทสินค้า</summary>
          <div class="table-wrapper" style="max-height:200px;overflow-y:auto;margin-top:6px">
            <table class="data-table" style="font-size:0.8rem">
              <thead><tr><th>รหัสนำหน้า</th><th>ประเภท</th></tr></thead>
              <tbody>${typeEntries}</tbody>
            </table>
          </div>
        </details>
      </div>

      <div id="prodPreview" style="display:none;margin-top:16px">
        <div class="flex items-center justify-between mb-12">
          <div class="card-title" style="font-size:0.95rem">📋 ตัวอย่างข้อมูล</div>
          <div id="prodStats" class="paste-col-hint"></div>
        </div>
        <div class="table-wrapper" style="max-height:400px;overflow-y:auto">
          <table class="data-table" id="prodPreviewTable">
            <thead><tr><th style="width:36px">#</th><th>รหัสสินค้า</th><th>ชื่อสินค้า</th><th>Class</th><th>ประเภท (Auto)</th></tr></thead>
            <tbody id="prodPreviewBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-outline" onclick="App.closeModal()">ยกเลิก</button>
    <button class="btn btn-primary" id="btnProdSave" disabled>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
      นำเข้าทั้งหมด
    </button>
  `;

  App.openModal('📥 Import สินค้า', body, footer);

  let parsedProducts = [];

  const dropZone = document.getElementById('prodDropZone');
  const fileInput = document.getElementById('prodFileInput');
  const fileInfoEl = document.getElementById('prodFileInfo');

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
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

        if (rows.length < 2) {
          App.toast('ไฟล์ว่างหรือมีแค่หัวตาราง', 'error');
          fileInfoEl.innerHTML = `<span>📄 ${App.escapeHTML(file.name)}</span><span class="badge badge-rejected">ไม่มีข้อมูล</span>`;
          return;
        }

        // Smart column detection (exclusive)
        const hdr = rows[0].map(h => String(h).toLowerCase().trim());
        const claimed = new Set();
        const detect = (words) => {
          const idx = hdr.findIndex((h, i) => !claimed.has(i) && words.some(w => h.includes(w)));
          if (idx !== -1) claimed.add(idx);
          return idx;
        };

        let colCode = detect(['รหัสสินค้า', 'รหัส', 'code', 'sku', 'barcode', 'item code']);
        let colName = detect(['ชื่อสินค้า', 'ชื่อ', 'name', 'product', 'description', 'รายการ']);
        let colClass = detect(['class', 'คลาส', 'เกรด', 'grade']);

        // Fallback: first 2 columns
        if (colCode === -1 && colName === -1) {
          colCode = 0; colName = rows[0].length > 1 ? 1 : -1;
        }

        if (colCode === -1) {
          App.toast('ไม่พบคอลัมน์รหัสสินค้า', 'error');
          fileInfoEl.innerHTML = `<span>📄 ${App.escapeHTML(file.name)}</span><span class="badge badge-rejected">คอลัมน์ไม่ตรง</span>`;
          return;
        }

        // Parse rows
        parsedProducts = [];
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          const code = String(row[colCode] || '').trim();
          if (!code || !/\d/.test(code)) continue; // skip empty or header-like rows

          const name = colName >= 0 ? String(row[colName] || '').trim() : '';
          const cls = colClass >= 0 ? String(row[colClass] || '').trim().toUpperCase() : '';
          const type = Pages._getProductType(code);

          parsedProducts.push({ good_code: code, good_name: name, class: cls || null, product_type: type });
        }

        if (parsedProducts.length === 0) {
          App.toast('ไม่พบข้อมูลสินค้า', 'error');
          fileInfoEl.innerHTML = `<span>📄 ${App.escapeHTML(file.name)}</span><span class="badge badge-rejected">ไม่พบข้อมูล</span>`;
          return;
        }

        // Show preview
        fileInfoEl.innerHTML = `<span>📄 ${App.escapeHTML(file.name)}</span><span class="badge badge-completed">✓ อ่านสำเร็จ</span>`;
        document.getElementById('prodPreview').style.display = 'block';
        document.getElementById('prodStats').textContent = `${parsedProducts.length} รายการสินค้า`;

        const previewBody = document.getElementById('prodPreviewBody');
        previewBody.innerHTML = parsedProducts.map((p, i) => `
          <tr>
            <td class="text-muted" style="font-size:0.78rem">${i + 1}</td>
            <td><strong>${App.escapeHTML(p.good_code)}</strong></td>
            <td>${App.escapeHTML(p.good_name)}</td>
            <td>${p.class ? `<span class="badge" style="font-size:0.72rem;background:var(--primary);color:#fff">${App.escapeHTML(p.class)}</span>` : '<span style="color:var(--text-muted)">-</span>'}</td>
            <td>${p.product_type ? `<span class="badge badge-inspecting" style="font-size:0.72rem">${App.escapeHTML(p.product_type)}</span>` : '<span style="color:var(--text-muted)">-</span>'}</td>
          </tr>
        `).join('');

        document.getElementById('btnProdSave').disabled = false;

      } catch (err) {
        console.error('Excel parse error:', err);
        App.toast('ไม่สามารถอ่านไฟล์: ' + err.message, 'error');
        fileInfoEl.innerHTML = `<span>📄 ${App.escapeHTML(file.name)}</span><span class="badge badge-rejected">อ่านไม่ได้</span>`;
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Save ──
  document.getElementById('btnProdSave').addEventListener('click', async () => {
    if (parsedProducts.length === 0) return;

    const btn = document.getElementById('btnProdSave');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-sm"></span> กำลังนำเข้า...';

    try {
      const result = await App.api('products.php', {
        method: 'POST',
        body: { bulk: parsedProducts }
      });

      App.toast(`✓ ${result.message}`, 'success');
      App.closeModal();
      Pages.products(document.getElementById('pageContainer'));
    } catch (err) {
      App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'นำเข้าทั้งหมด';
    }
  });
};
  // ── Settings (ตั้งค่า) ───────────────────────
Pages._settingsTab = 'warehouses';