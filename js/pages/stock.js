/* ============================================
   สต๊อคคงเหลือ — Full Lifecycle
   ============================================ */

Pages.stock = async function(container) {
  const API = 'api/stock.php';

  // 6-step lifecycle
  const statusFlow = [
    { key: 'received',       label: 'รับแล้ว',        icon: '📥', color: '#64748b' },
    { key: 'wait_inspect',   label: 'รอตรวจ',         icon: '🔍', color: '#f59e0b' },
    { key: 'reconditioning', label: 'ปรับสภาพ',       icon: '🔧', color: '#3b82f6' },
    { key: 'wait_approval',  label: 'รอขออนุมัติ',    icon: '📋', color: '#f97316' },
    { key: 'wait_transfer',  label: 'รอโอน',          icon: '⏳', color: '#8b5cf6' },
    { key: 'transferred',    label: 'โอนแล้ว',        icon: '✅', color: '#10b981' }
  ];

  const statusMap = {};
  statusFlow.forEach(s => { statusMap[s.key] = s; });

  let currentSearch = '';
  let currentStatus = '';

  // ── Fetch ──
  async function fetchData() {
    const params = new URLSearchParams();
    if (currentSearch) params.set('search', currentSearch);
    if (currentStatus) params.set('status', currentStatus);
    const url = API + (params.toString() ? '?' + params.toString() : '');
    const res = await fetch(url);
    return await res.json();
  }

  // ── Inject styles once ──
  if (!document.getElementById('stockPageStyles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'stockPageStyles';
    styleEl.textContent = `
      /* ── Pill Bar ── */
      .stock-pill-bar {
        display: flex; align-items: center; gap: 0;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 4px;
        overflow-x: auto;
        margin-bottom: 18px;
      }
      .stock-pill-bar__all {
        display: flex; align-items: center; gap: 6px;
        padding: 6px 14px;
        border-radius: 9px;
        font-size: 0.78rem; font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
        color: var(--text-secondary);
        margin-right: 2px;
      }
      .stock-pill-bar__all:hover { background: var(--bg-glass); }
      .stock-pill-bar__all.active { background: var(--primary); color: #fff; }
      .stock-pill-bar__all .pill-count {
        background: rgba(255,255,255,0.2); padding: 1px 7px; border-radius: 8px;
        font-size: 0.7rem;
      }
      .stock-pill-bar__all.active .pill-count { background: rgba(255,255,255,0.3); }

      .stock-pill {
        display: flex; align-items: center; gap: 5px;
        padding: 6px 12px;
        border-radius: 9px;
        font-size: 0.75rem; font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
        color: var(--text-muted);
        position: relative;
      }
      .stock-pill:hover { background: var(--bg-glass); }
      .stock-pill.active { color: #fff; font-weight: 600; }
      .stock-pill .pill-count {
        font-weight: 700; font-size: 0.72rem;
      }
      .stock-pill .pill-arrow {
        color: var(--border-color); font-size: 0.6rem; margin: 0 2px;
      }

      /* ── Summary strip ── */
      .stock-summary-strip {
        display: flex; align-items: center; gap: 16px;
        font-size: 0.78rem; color: var(--text-muted);
        margin-bottom: 14px; flex-wrap: wrap;
      }
      .stock-summary-strip strong { color: var(--text-primary); }
      .stock-summary-strip .stock-wh-badge {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 2px 10px; border-radius: 8px;
        background: rgba(16,185,129,0.1); color: #10b981;
        font-weight: 600; font-size: 0.75rem;
      }
    `;
    document.head.appendChild(styleEl);
  }

  // ── Render ──
  async function render() {
    const data = await fetchData();
    const allItems = data.items || [];
    const summary = data.summary || {};
    const byStatus = summary.by_status || {};

    // Get total counts for each status (unfiltered)
    // We use ALL statuses from summary to show counts in pills
    const totalAll = summary.total_items || 0;

    // Build pill bar
    const pillsHtml = statusFlow.map((s, i) => {
      const count = byStatus[s.key] || 0;
      const isActive = currentStatus === s.key;
      const arrow = i < statusFlow.length - 1 ? '<span class="pill-arrow">›</span>' : '';
      return `<div class="stock-pill ${isActive ? 'active' : ''}" data-status="${s.key}"
                   style="${isActive ? 'background:' + s.color : ''}">
        <span>${s.icon}</span>
        <span>${s.label}</span>
        <span class="pill-count" style="color:${isActive ? '#fff' : s.color}">${count}</span>
      </div>${arrow}`;
    }).join('');

    container.innerHTML = `
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">
        <div>
          <h2 style="margin:0;font-size:1.05rem;color:var(--text-primary);font-weight:700">
            📦 สต๊อคคงเหลือ
          </h2>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <input type="text" id="stockSearch" placeholder="🔎 ค้นหา รหัส/ชื่อ/SN/ใบรับคืน..."
                 value="${currentSearch}"
                 style="padding:7px 14px;border:1px solid var(--border-color);border-radius:10px;
                        background:var(--bg-secondary);color:var(--text-primary);font-size:0.8rem;width:240px;
                        transition:border-color 0.2s,box-shadow 0.2s"
                 onfocus="this.style.borderColor='var(--primary)';this.style.boxShadow='0 0 0 3px rgba(102,126,234,0.15)'"
                 onblur="this.style.borderColor='var(--border-color)';this.style.boxShadow='none'">
        </div>
      </div>

      <!-- Pill Bar + Summary -->
      <div class="stock-pill-bar" id="stockPillBar">
        <div class="stock-pill-bar__all ${!currentStatus ? 'active' : ''}" data-status="">
          <span>ทั้งหมด</span>
          <span class="pill-count">${totalAll}</span>
        </div>
        ${pillsHtml}
        ${currentStatus ? `<button class="btn btn-sm" id="clearStatusFilter"
          style="font-size:0.72rem;padding:3px 10px;border-radius:16px;margin-left:4px;
                 background:${(statusMap[currentStatus]||{}).color || '#999'}20;
                 color:${(statusMap[currentStatus]||{}).color || '#999'};border:1px solid ${(statusMap[currentStatus]||{}).color || '#999'}40">
          ✕ ${(statusMap[currentStatus]||{}).label || currentStatus}
        </button>` : ''}
        <div style="margin-left:auto;display:flex;align-items:center;gap:12px;font-size:0.75rem;color:var(--text-muted);white-space:nowrap;padding-right:4px">
          <span>รวม <strong style="color:var(--text-primary)">${summary.total_items || 0}</strong> รายการ</span>
          <span>จำนวน <strong style="color:var(--text-primary)">${summary.total_qty || 0}</strong> ชิ้น</span>
          <span class="stock-wh-badge">🏭 คลัง 020</span>
        </div>
      </div>

      <!-- Data table -->
      <div class="card">
        <div class="table-wrap compact-scroll" style="overflow-x:auto;max-height:calc(100vh - 340px);overflow-y:auto">
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
                    const st = statusMap[item.stock_status] || statusFlow[0];
                    const cls = item.class ? `<span class="badge badge-class">${item.class}</span>` : '-';
                    const curWh = item.current_warehouse || '020';
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
                      <td><span style="display:inline-flex;align-items:center;gap:3px;font-size:0.72rem;padding:2px 8px;border-radius:8px;
                                       background:${curWh === '020' ? '#10b98115' : '#3b82f615'};
                                       color:${curWh === '020' ? '#10b981' : '#3b82f6'};font-weight:600">
                        🏭 ${curWh}
                      </span></td>
                      <td><span style="display:inline-flex;align-items:center;gap:4px;font-size:0.72rem;padding:2px 8px;border-radius:10px;background:${st.color}18;color:${st.color};font-weight:500">
                        <span style="width:6px;height:6px;border-radius:50%;background:${st.color}"></span>
                        ${st.label}
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

    // ── Events ──
    const searchInput = document.getElementById('stockSearch');
    let searchTimer = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        currentSearch = searchInput.value.trim();
        render();
      }, 400);
    });

    // Pill clicks
    document.querySelectorAll('#stockPillBar .stock-pill, #stockPillBar .stock-pill-bar__all').forEach(el => {
      el.addEventListener('click', () => {
        currentStatus = el.dataset.status || '';
        render();
      });
    });

    // Clear filter
    const clearBtn = document.getElementById('clearStatusFilter');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        currentStatus = '';
        render();
      });
    }
  }

  await render();
};
