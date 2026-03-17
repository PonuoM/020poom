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

    // Status card config with icons & gradients
    const statusConfig = {
      _all:           { icon: '📦', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
      received:       { icon: '📥', gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' },
      inspecting:     { icon: '🔍', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
      waiting_parts:  { icon: '⏳', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
      reconditioning: { icon: '🔧', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
      completed:      { icon: '✅', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
      shipped:        { icon: '🚚', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }
    };

    // Build cards
    function buildCard(key, label, count, isActive) {
      const cfg = statusConfig[key] || statusConfig._all;
      const color = key === '_all' ? '#667eea' : (statusColors[key] || '#999');
      return `<div class="stock-card ${isActive ? 'stock-card--active' : ''}" data-status="${key === '_all' ? '' : key}">
        <div class="stock-card__bar" style="background:${cfg.gradient}"></div>
        <div class="stock-card__body">
          <div class="stock-card__icon">${cfg.icon}</div>
          <div class="stock-card__count" style="color:${color}">${count}</div>
          <div class="stock-card__label">${label}</div>
        </div>
      </div>`;
    }

    const totalCard = buildCard('_all', 'ทั้งหมด', summary.total_items || 0, !currentStatus);
    const statusCards = Object.entries(statusLabels).map(([key, label]) => {
      return buildCard(key, label, byStatus[key] || 0, currentStatus === key);
    }).join('');

    // Inject scoped styles once
    if (!document.getElementById('stockCardStyles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'stockCardStyles';
      styleEl.textContent = `
        .stock-cards-row { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:20px; }
        .stock-card {
          flex:1; min-width:100px; max-width:160px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(.4,0,.2,1);
          position: relative;
        }
        .stock-card:hover {
          transform: translateY(-4px) scale(1.03);
          box-shadow: 0 8px 25px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.06);
        }
        .stock-card--active {
          box-shadow: 0 0 0 2px var(--primary), 0 4px 16px rgba(102,126,234,0.25);
        }
        .stock-card__bar {
          height: 4px;
          width: 100%;
        }
        .stock-card__body {
          padding: 12px 14px 14px;
          text-align: center;
        }
        .stock-card__icon {
          font-size: 1.4rem;
          margin-bottom: 4px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }
        .stock-card__count {
          font-size: 1.6rem;
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -1px;
        }
        .stock-card__label {
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-top: 2px;
          font-weight: 500;
          letter-spacing: 0.2px;
        }
      `;
      document.head.appendChild(styleEl);
    }

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
            <input type="text" id="stockSearch" placeholder="🔎 ค้นหา รหัส/ชื่อ/SN/ใบรับคืน..." 
                   value="${currentSearch}"
                   style="padding:8px 14px;border:1px solid var(--border-color);border-radius:var(--radius-md);
                          background:var(--bg-secondary);color:var(--text-primary);font-size:0.8rem;width:240px;
                          transition:border-color 0.2s,box-shadow 0.2s"
                   onfocus="this.style.borderColor='var(--primary)';this.style.boxShadow='0 0 0 3px rgba(102,126,234,0.15)'"
                   onblur="this.style.borderColor='var(--border-color)';this.style.boxShadow='none'">
          </div>
          ${currentStatus ? `<button class="btn btn-sm" id="clearStatusFilter" style="font-size:0.75rem;padding:4px 10px;border-radius:20px">
            ✕ ${statusLabels[currentStatus] || currentStatus}
          </button>` : ''}
        </div>
      </div>

      <!-- Status summary cards -->
      <div class="stock-cards-row" id="statusCards">
        ${totalCard}
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
                <th>คลังปัจจุบัน</th>
                <th>สถานะ</th>
                <th>คลังปลายทาง</th>
              </tr>
            </thead>
            <tbody>
              ${allItems.length === 0
                ? '<tr><td colspan="13" class="text-center" style="padding:40px;color:var(--text-muted)">ไม่พบรายการ</td></tr>'
                : allItems.map((item, idx) => {
                    const st = item.status || 'received';
                    const color = statusColors[st] || '#999';
                    const label = statusLabels[st] || st;
                    const cls = item.class ? `<span class="badge badge-class">${item.class}</span>` : '-';
                    const curWh = '020';
                    const tgtWh = item.target_warehouse || '-';
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
                      <td><span style="display:inline-flex;align-items:center;gap:4px;font-size:0.72rem;padding:2px 8px;border-radius:10px;background:#10b98120;color:#10b981;font-weight:600">
                        🏭 ${curWh}
                      </span></td>
                      <td><span style="display:inline-flex;align-items:center;gap:4px;font-size:0.72rem;padding:2px 8px;border-radius:10px;background:${color}20;color:${color};font-weight:500">
                        <span style="width:6px;height:6px;border-radius:50%;background:${color}"></span>
                        ${label}
                      </span></td>
                      <td>${tgtWh !== '-' ? '<span style="color:var(--primary);font-weight:600">' + tgtWh + '</span>' : '-'}</td>
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
    document.querySelectorAll('#statusCards .stock-card').forEach(card => {
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
