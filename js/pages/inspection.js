/* ============================================
 Inspection page
 ============================================ */

Pages.inspection = async function(container) {
  try {
    const data = await App.api('returns.php?status=received,inspecting');
    Pages._inspData = data.items || [];
  } catch (e) { console.warn('Inspection items:', e); Pages._inspData = []; }
  try {
    const data = await App.api('causes.php');
    Pages._inspCauses = data.categories || [];
  } catch (e) { console.warn('Causes:', e); Pages._inspCauses = []; }

  Pages._inspPage = 1;
  Pages._inspSearch = '';
  Pages._renderInspection(container);
};
Pages._getFilteredInspection = function() {
  if (!Pages._inspSearch) return Pages._inspData;
  const q = Pages._inspSearch.toLowerCase();
  return Pages._inspData.filter(it =>
    (it.receipt_number || '').toLowerCase().includes(q) ||
    (it.good_code || '').toLowerCase().includes(q) ||
    (it.good_name || '').toLowerCase().includes(q)
  );
};
Pages._renderInspection = function(container) {
  const filtered = Pages._getFilteredInspection();
  const total = filtered.length;
  const perPage = Pages._inspPerPage;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (Pages._inspPage > totalPages) Pages._inspPage = totalPages;
  const page = Pages._inspPage;
  const start = (page - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);
  const causes = Pages._inspCauses;

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
      <div>
        <div class="card-title">รายการรอตรวจสอบ</div>
        <div class="card-subtitle">เลือกรายการเพื่อบันทึกผลตรวจสอบ</div>
      </div>
      <div class="search-bar" style="margin:0;max-width:300px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" id="searchInspection" placeholder="ค้นหาเลขที่, รหัสสินค้า..." value="${App.escapeHTML(Pages._inspSearch)}">
      </div>
    </div>

    <div class="card">
      <div class="table-summary-bar">
        <div class="summary-text">
          ทั้งหมด <strong>${total.toLocaleString()}</strong> รายการ
          ${Pages._inspSearch ? ` (กรอง จาก ${Pages._inspData.length.toLocaleString()})` : ''}
        </div>
        <div class="per-page-select">
          <label>แสดง</label>
          <select id="inspPerPage" class="form-select">
            ${[25,50,100,250].map(n => `<option value="${n}"${n === perPage ? ' selected' : ''}>${n}</option>`).join('')}
          </select>
          <label>/ หน้า</label>
        </div>
      </div>
      <div class="table-wrapper" style="max-height:calc(100vh - 300px);overflow-y:auto">
        <table class="data-table">
          <thead>
            <tr><th>#</th><th>เลขที่รับคืน</th><th>รหัสสินค้า</th><th>ชื่อสินค้า</th><th>Class</th><th>สถานะ</th><th>ตรวจสอบ</th></tr>
          </thead>
          <tbody>
            ${pageItems.length === 0
              ? '<tr><td colspan="7" class="text-center" style="padding:32px;color:var(--text-muted)">ไม่มีสินค้ารอตรวจสอบ</td></tr>'
              : pageItems.map((it, i) => `
                <tr>
                  <td>${start + i + 1}</td>
                  <td>${App.escapeHTML(it.receipt_number || '-')}</td>
                  <td>${App.escapeHTML(it.good_code || '-')}</td>
                  <td>${App.escapeHTML(it.good_name || '-')}</td>
                  <td>${it.class ? `<span class="badge" style="font-size:0.72rem;background:var(--primary);color:#fff">${App.escapeHTML(it.class)}</span>` : '<span style="color:var(--text-muted)">-</span>'}</td>
                  <td>${App.statusBadge(it.status)}</td>
                  <td>
                    <button class="btn btn-primary btn-sm" onclick="Pages.showInspectionForm(${it.id}, ${JSON.stringify(causes).replace(/"/g, '&quot;')})">
                      ตรวจสอบ
                    </button>
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
      ${totalPages > 1 ? `
      <div class="pagination-bar" id="inspPagination">
        <button class="pg-btn" data-pg="${Math.max(1, page - 1)}" ${page === 1 ? 'disabled' : ''}>‹ ก่อน</button>
        ${pageNums}
        <button class="pg-btn" data-pg="${Math.min(totalPages, page + 1)}" ${page === totalPages ? 'disabled' : ''}>ถัดไป ›</button>
        <span class="pg-info">หน้า ${page} / ${totalPages}</span>
      </div>
      ` : ''}
    </div>
  `;

  // Search
  const searchInput = document.getElementById('searchInspection');
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      Pages._inspSearch = searchInput.value.trim();
      Pages._inspPage = 1;
      Pages._renderInspection(container);
    }, 300);
  });

  // Per-page selector
  document.getElementById('inspPerPage').addEventListener('change', (e) => {
    Pages._inspPerPage = parseInt(e.target.value);
    Pages._inspPage = 1;
    Pages._renderInspection(container);
  });

  // Pagination clicks
  const pgBar = document.getElementById('inspPagination');
  if (pgBar) {
    pgBar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pg]');
      if (!btn || btn.disabled) return;
      Pages._inspPage = parseInt(btn.dataset.pg);
      Pages._renderInspection(container);
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
};
Pages.showInspectionForm = function(itemId, causes) {
  let causesHTML = '';
  if (Array.isArray(causes)) {
    causes.forEach(cat => {
      causesHTML += `<div class="cause-category">
        <div class="cause-category-title">${App.escapeHTML(cat.name)}</div>
        <div class="checkbox-group">
          ${(cat.options || []).map(opt => `
            <label class="checkbox-chip" data-cause-id="${opt.id}">
              <input type="checkbox" value="${opt.id}">
              <span class="chip-check"></span>
              ${App.escapeHTML(opt.label)}
            </label>
          `).join('')}
        </div>
      </div>`;
    });
  }

  const body = `
    <form id="inspectionForm">
      <input type="hidden" name="item_id" value="${itemId}">
      <div class="form-group">
        <label class="form-label">ผู้ตรวจสอบ</label>
        <input class="form-input" name="inspector_name" placeholder="ชื่อผู้ตรวจ">
      </div>
      <div class="form-group">
        <label class="form-label">ข้อมูลจากการตรวจ (เลือกสาเหตุ)</label>
        ${causesHTML}
      </div>
      <div class="form-group">
        <label class="form-label">หมายเหตุเพิ่มเติม</label>
        <textarea class="form-textarea" name="extra_notes" rows="2" placeholder="รายละเอียดเพิ่มเติม..."></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">ผลการตรวจ *</label>
        <select class="form-select" name="result" required>
          <option value="">-- เลือกผลตรวจ --</option>
          <option value="repairable">ปรับสภาพได้</option>
          <option value="show_unit">ตัวโชว์ (102-2)</option>
          <option value="donate">บริจาค (105)</option>
          <option value="wait_parts">รออะไหล่</option>
          <option value="other">อื่นๆ</option>
        </select>
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-outline" onclick="App.closeModal()">ยกเลิก</button>
    <button class="btn btn-success" id="btnSaveInspection">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
      บันทึกผลตรวจ
    </button>
  `;

  App.openModal('บันทึกผลตรวจสอบ', body, footer);

  // Chip toggle behavior
  document.querySelectorAll('.checkbox-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cb = chip.querySelector('input[type="checkbox"]');
      cb.checked = !cb.checked;
      chip.classList.toggle('selected', cb.checked);
    });
  });

  document.getElementById('btnSaveInspection').addEventListener('click', async () => {
    const form = document.getElementById('inspectionForm');
    const fd = new FormData(form);
    const selectedCauses = [];
    document.querySelectorAll('.checkbox-chip.selected input').forEach(cb => {
      selectedCauses.push(parseInt(cb.value));
    });

    const result = fd.get('result');
    if (!result) {
      App.toast('กรุณาเลือกผลการตรวจ', 'error');
      return;
    }

    try {
      await App.api('inspections.php', {
        method: 'POST',
        body: {
          item_id: parseInt(fd.get('item_id')),
          inspector_name: fd.get('inspector_name'),
          cause_ids: selectedCauses,
          extra_notes: fd.get('extra_notes'),
          result: result
        }
      });
      App.toast('บันทึกผลตรวจสอบสำเร็จ', 'success');
      App.closeModal();
      Pages.inspection(document.getElementById('pageContainer'));
    } catch (err) {
      App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
  });
};
  // ── Reconditioning (ปรับสภาพ) — List + Detail ──────────────
Pages._reconDocs = [];
Pages._reconAllItems = [];
Pages._reconPage = 1;
Pages._reconPerPage = 50;
Pages._reconSearch = '';
  _reconViewMode: 'docs', // 'docs' or 'items'

