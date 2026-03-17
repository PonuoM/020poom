/* ============================================
   สต๊อคคงเหลือ คลัง 020
   ============================================ */

Pages.stock = async function(container) {
  const API = 'api/stock.php';

  // Status labels
  const statusLabels = {
    received: 'รับแล้ว',
    inspecting: 'กำลังตรวจ',
    waiting_parts: 'รออะไหล่',
    reconditioning: 'ปรับสภาพ',
    completed: 'เสร็จแล้ว',
    shipped: 'ส่งแล้ว'
  };
  const statusColors = {
    received: '#64748b',
    inspecting: '#f59e0b',
    waiting_parts: '#ef4444',
    reconditioning: '#3b82f6',
    completed: '#10b981',
    shipped: '#8b5cf6'
  };

  let allItems = [];
  let currentSearch = '';
  let currentStatus = '';

  // ── Fetch data ──
  async function fetchData() {
    const params = new URLSearchParams();
    if (currentSearch) params.set('search', currentSearch);
    if (currentStatus) params.set('status', currentStatus);
    const url = API + (params.toString() ? '?' + params.toString() : '');
    const res = await fetch(url);
    return await res.json();
  }

  // ── Render ──
  async function render() {
    const data = await fetchData();
    allItems = data.items || [];
    const summary = data.summary || {};
    const byStatus = summary.by_status || {};

    // Status cards
    const statusCards = Object.entries(statusLabels).map(([key, label]) => {
      const count = byStatus[key] || 0;
      const color = statusColors[key] || '#999';
      return `<div class="stat-card" style="border-left:3px solid ${color};cursor:pointer" data-status="${key}">
        <div class="stat-value" style="color:${color}">${count}</div>
        <div class="stat-label">${label}</div>
      </div>`;
    }).join('');

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px">
        <div>
          <h2 style="margin:0;font-size:1rem;color:var(--text-secondary)">
            📦 สต๊อคคงเหลือ คลัง 020
          </h2>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">
            รวม <strong>${summary.total_items || 0}</strong> รายการ · จำนวน <strong>${summary.total_qty || 0}</strong> ชิ้น
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <div class="search-box" style="position:relative">
            <input type="text" id="stockSearch" placeholder="ค้นหา รหัส/ชื่อ/SN/ใบรับคืน..." 
                   value="${currentSearch}"
                   style="padding:6px 12px;border:1px solid var(--border-color);border-radius:var(--radius-md);
                          background:var(--bg-primary);color:var(--text-primary);font-size:0.8rem;width:220px">
          </div>
          ${currentStatus ? `<button class="btn btn-sm" id="clearStatusFilter" style="font-size:0.75rem;padding:4px 10px">
            ✕ ${statusLabels[currentStatus] || currentStatus}
          </button>` : ''}
        </div>
      </div>

      <!-- Status summary cards -->
      <div class="stats-row" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px" id="statusCards">
        <div class="stat-card" style="border-left:3px solid var(--primary);cursor:pointer;${!currentStatus ? 'background:var(--bg-glass)' : ''}" data-status="">
          <div class="stat-value" style="color:var(--primary)">${summary.total_items || 0}</div>
          <div class="stat-label">ทั้งหมด</div>
        </div>
        ${statusCards}
      </div>

      <!-- Data table -->
      <div class="card">
        <div class="table-wrap compact-scroll" style="overflow-x:auto;max-height:calc(100vh - 320px);overflow-y:auto">
          <table class="data-table compact-table" id="stockTable">
            <thead>
              <tr>
                <th>#</th>
                <th>ใบรับคืน</th>
                <th>วันที่</th>
                <th>สาขา</th>
                <th>ประเภท</th>
                <th>รหัสสินค้า</th>
                <th>ชื่อสินค้า</th>
                <th>Class</th>
                <th>SN</th>
                <th>จำนวน</th>
                <th>สถานะ</th>
                <th>คลังปลายทาง</th>
              </tr>
            </thead>
            <tbody>
              ${allItems.length === 0
                ? '<tr><td colspan="12" class="text-center" style="padding:40px;color:var(--text-muted)">ไม่พบรายการ</td></tr>'
                : allItems.map((item, idx) => {
                    const st = item.status || 'received';
                    const color = statusColors[st] || '#999';
                    const label = statusLabels[st] || st;
                    const cls = item.class ? `<span class="badge badge-class">${item.class}</span>` : '-';
                    const wh = item.target_warehouse || '-';
                    return `<tr>
                      <td>${idx + 1}</td>
                      <td><strong>${item.receipt_number || '-'}</strong></td>
                      <td>${item.return_date || '-'}</td>
                      <td>${item.branch_name || '-'}</td>
                      <td>${item.return_type || '-'}</td>
                      <td>${item.good_code || '-'}</td>
                      <td>${item.good_name || '-'}</td>
                      <td class="text-center">${cls}</td>
                      <td>${item.serial_number || '-'}</td>
                      <td class="text-center">${item.quantity}</td>
                      <td><span style="display:inline-flex;align-items:center;gap:4px;font-size:0.72rem;padding:2px 8px;border-radius:10px;background:${color}20;color:${color};font-weight:500">
                        <span style="width:6px;height:6px;border-radius:50%;background:${color}"></span>
                        ${label}
                      </span></td>
                      <td>${wh !== '-' ? '<span style="color:var(--primary);font-weight:600">' + wh + '</span>' : '-'}</td>
                    </tr>`;
                  }).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    // ── Bind events ──
    // Search
    const searchInput = document.getElementById('stockSearch');
    let searchTimer = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        currentSearch = searchInput.value.trim();
        render();
      }, 400);
    });

    // Status card click
    document.querySelectorAll('#statusCards .stat-card').forEach(card => {
      card.addEventListener('click', () => {
        const st = card.dataset.status;
        currentStatus = st || '';
        render();
      });
    });

    // Clear status filter
    const clearBtn = document.getElementById('clearStatusFilter');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        currentStatus = '';
        render();
      });
    }
  }

  // Initial render
  await render();
};
