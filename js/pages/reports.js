/* ============================================
   ส่งออกรายงาน — Export Reports
   Progressive columns per status
   ============================================ */

Pages.reports = async function(container) {
  const API = 'api/reports.php';

  // Status flow with progressive column levels
  const statusFlow = [
    { key: 'all',            label: 'สต๊อคคงเหลือ (ทั้งหมด)', icon: '📦', color: '#667eea', level: 7 },
    { key: 'received',       label: 'รับแล้ว',                 icon: '📥', color: '#64748b', level: 1 },
    { key: 'wait_inspect',   label: 'รอตรวจ',                  icon: '🔍', color: '#f59e0b', level: 2 },
    { key: 'reconditioning', label: 'ปรับสภาพ',                icon: '🔧', color: '#3b82f6', level: 3 },
    { key: 'wait_approval',  label: 'รอขออนุมัติ',             icon: '📋', color: '#f97316', level: 4 },
    { key: 'wait_transfer',  label: 'รอโอน',                   icon: '⏳', color: '#8b5cf6', level: 5 },
    { key: 'transferred',    label: 'โอนแล้ว',                 icon: '✅', color: '#10b981', level: 6 },
  ];

  const statusMap = {};
  statusFlow.forEach(s => { statusMap[s.key] = s; });

  // All columns in progressive order
  const allColumns = [
    // Level 1: รับแล้ว — basic
    { key: 'receipt_number',   label: 'ใบรับคืน',      level: 1, get: r => r.receipt_number || '-' },
    { key: 'return_date',      label: 'วันที่รับ',      level: 1, get: r => r.return_date || '-' },
    { key: 'branch_name',      label: 'สาขา',          level: 1, get: r => r.branch_name || '-' },
    { key: 'return_type',      label: 'ประเภทรับคืน',   level: 1, get: r => r.return_type || '-' },
    { key: 'good_code',        label: 'รหัสสินค้า',     level: 1, get: r => r.good_code || '-' },
    { key: 'good_name',        label: 'ชื่อสินค้า',     level: 1, get: r => r.good_name || '-' },
    { key: 'class',            label: 'Class',          level: 1, get: r => r.class || '-' },
    { key: 'serial_number',    label: 'SN',             level: 1, get: r => r.serial_number || '-' },
    { key: 'quantity',         label: 'จำนวน',          level: 1, get: r => r.quantity || 1 },
    // Level 2: รอตรวจ — inspection
    { key: 'inspector_name',   label: 'ผู้ตรวจ',        level: 2, get: r => r.inspector_name || '-' },
    { key: 'inspection_date',  label: 'วันที่ตรวจ',     level: 2, get: r => r.inspection_date || '-' },
    { key: 'cause_text',       label: 'สาเหตุ',        level: 2, get: r => r.cause_text || '-' },
    { key: 'inspection_result',label: 'ผลตรวจ',        level: 2, get: r => r.inspection_result || '-' },
    // Level 3: ปรับสภาพ — reconditioning
    { key: 'assigned_to',     label: 'ผู้รับผิดชอบ',    level: 3, get: r => r.assigned_to || '-' },
    { key: 'recon_status',    label: 'สถานะปรับสภาพ',   level: 3, get: r => r.recon_status || '-' },
    { key: 'recon_serial',    label: 'SN ใหม่',         level: 3, get: r => r.recon_serial || '-' },
    // Level 4: รอขออนุมัติ — target + approval
    { key: 'target_warehouse',label: 'คลังปลายทาง',     level: 4, get: r => r.target_warehouse || '-' },
    { key: 'batch_number',    label: 'เลขชุดอนุมัติ',    level: 4, get: r => r.batch_number || '-' },
    { key: 'batch_status',    label: 'สถานะอนุมัติ',     level: 4, get: r => r.batch_status || '-' },
    { key: 'sales_reason',    label: 'เหตุผลฝ่ายขาย',   level: 4, get: r => r.sales_reason || '-' },
    { key: 'team_reason',     label: 'เหตุผลทีม',       level: 4, get: r => r.team_reason || '-' },
    // Level 5: รอโอน
    { key: 'recon_doc_number',label: 'เลข RTV',          level: 5, get: r => r.recon_doc_number || '-' },
    { key: 'approved_date',   label: 'วันที่อนุมัติ',    level: 5, get: r => r.approved_date || '-' },
    { key: 'approved_by',     label: 'ผู้อนุมัติ',       level: 5, get: r => r.approved_by || '-' },
    // Level 6: โอนแล้ว
    { key: 'transferred_date',label: 'วันที่โอน',        level: 6, get: r => r.transferred_date || '-' },
    // Level 7: สต๊อคคงเหลือ (all) — extra
    { key: 'current_warehouse',label: 'คลังปัจจุบัน',    level: 7, get: r => r.current_warehouse || '020' },
    { key: 'stock_status_label',label: 'สถานะปัจจุบัน',  level: 7, get: r => {
        const st = statusMap[r.stock_status];
        return st ? st.label : r.stock_status || '-';
      }
    },
  ];

  let currentStatus = 'all';

  // Inject styles
  if (!document.getElementById('reportStyles')) {
    const style = document.createElement('style');
    style.id = 'reportStyles';
    style.textContent = `
      .report-status-grid {
        display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px;
      }
      .report-status-pill {
        display: flex; align-items: center; gap: 6px;
        padding: 8px 16px; border-radius: 10px;
        font-size: 0.78rem; font-weight: 500;
        cursor: pointer; transition: all 0.2s;
        border: 1.5px solid var(--border-color);
        background: var(--bg-secondary);
        color: var(--text-secondary);
      }
      .report-status-pill:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
      .report-status-pill.active { color: #fff; border-color: transparent; font-weight: 600; }
      .report-status-pill .pill-cnt {
        font-weight: 700; font-size: 0.72rem;
        background: rgba(255,255,255,0.2); padding: 1px 7px; border-radius: 8px;
      }
      .report-export-bar {
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px; margin-bottom: 14px; flex-wrap: wrap;
      }
      .report-export-bar .info { font-size: 0.78rem; color: var(--text-muted); }
      .report-export-bar .info strong { color: var(--text-primary); }
      .btn-export {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 8px 20px; border-radius: 10px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: #fff; font-weight: 600; font-size: 0.82rem;
        border: none; cursor: pointer; transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(16,185,129,0.3);
      }
      .btn-export:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(16,185,129,0.4); }
      .report-table-wrap {
        overflow-x: auto; max-height: calc(100vh - 380px); overflow-y: auto;
        border-radius: 10px; border: 1px solid var(--border-color);
      }
      .report-table {
        font-size: 0.7rem; white-space: nowrap; border-collapse: collapse; width: 100%;
      }
      .report-table th {
        position: sticky; top: 0; z-index: 2;
        background: var(--bg-secondary); padding: 8px 10px;
        font-weight: 600; font-size: 0.68rem; text-align: left;
        border-bottom: 2px solid var(--border-color);
        color: var(--text-secondary);
      }
      .report-table td {
        padding: 6px 10px; border-bottom: 1px solid var(--border-color);
        color: var(--text-primary);
      }
      .report-table tbody tr:hover { background: var(--bg-glass); }
      .report-col-badge {
        display: inline-block; font-size: 0.6rem; padding: 1px 5px;
        border-radius: 6px; margin-left: 4px; font-weight: 600;
      }
    `;
    document.head.appendChild(style);
  }

  // Fetch data
  async function fetchData() {
    const url = API + '?status=' + encodeURIComponent(currentStatus);
    const res = await fetch(url);
    return await res.json();
  }

  // Get columns for current level
  function getColumns(level) {
    return allColumns.filter(c => c.level <= level);
  }

  // CSV export
  function exportCSV(items, columns, filename) {
    const BOM = '\uFEFF';
    const headers = columns.map(c => c.label);
    const rows = items.map(item => columns.map(c => {
      let val = String(c.get(item));
      // Escape quotes
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    }));

    const csv = BOM + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Render
  async function render() {
    const data = await fetchData();
    const items = data.items || [];
    const total = data.total || 0;

    const currentDef = statusMap[currentStatus] || statusFlow[0];
    const level = currentDef.level;
    const columns = getColumns(level);

    // Count ALL items per status (for pills)
    // We need unfiltered counts — fetch 'all' separately if filtered
    let allCounts = data.by_status || {};
    let totalAll = 0;
    Object.values(allCounts).forEach(c => totalAll += c);

    container.innerHTML = `
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px">
        <div>
          <h2 style="margin:0;font-size:1.05rem;color:var(--text-primary);font-weight:700">
            📊 ส่งออกรายงาน
          </h2>
          <p style="margin:4px 0 0;font-size:0.78rem;color:var(--text-muted)">เลือกสถานะเพื่อดูรายงานและส่งออก CSV</p>
        </div>
      </div>

      <!-- Status Pills -->
      <div class="report-status-grid" id="reportStatusGrid">
        ${statusFlow.map(s => {
          const count = s.key === 'all' ? totalAll : (allCounts[s.key] || 0);
          const isActive = currentStatus === s.key;
          return `<div class="report-status-pill ${isActive ? 'active' : ''}" data-status="${s.key}"
                       style="${isActive ? 'background:' + s.color + ';border-color:transparent' : ''}">
            <span>${s.icon}</span>
            <span>${s.label}</span>
            <span class="pill-cnt">${count}</span>
          </div>`;
        }).join('')}
      </div>

      <!-- Export bar -->
      <div class="report-export-bar">
        <div class="info">
          ${currentDef.icon} <strong>${currentDef.label}</strong> —
          <strong>${items.length}</strong> รายการ,
          <strong>${columns.length}</strong> คอลัมน์
        </div>
        <button class="btn-export" id="btnExportCSV">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          ส่งออก CSV
        </button>
      </div>

      <!-- Table preview -->
      <div class="report-table-wrap">
        <table class="report-table" id="reportTable">
          <thead>
            <tr>
              <th>#</th>
              ${columns.map(c => {
                const levelColors = {
                  1: '#64748b', 2: '#f59e0b', 3: '#3b82f6',
                  4: '#f97316', 5: '#8b5cf6', 6: '#10b981', 7: '#667eea'
                };
                const lc = levelColors[c.level] || '#999';
                return `<th>${c.label}${c.level > 1 ? '<span class="report-col-badge" style="background:' + lc + '20;color:' + lc + '">L' + c.level + '</span>' : ''}</th>`;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${items.length === 0
              ? '<tr><td colspan="' + (columns.length + 1) + '" style="text-align:center;padding:40px;color:var(--text-muted)">ไม่พบรายการ</td></tr>'
              : items.map((item, idx) => `<tr>
                  <td>${idx + 1}</td>
                  ${columns.map(c => `<td>${escHtml(String(c.get(item)))}</td>`).join('')}
                </tr>`).join('')
            }
          </tbody>
        </table>
      </div>
    `;

    // Events
    document.querySelectorAll('#reportStatusGrid .report-status-pill').forEach(el => {
      el.addEventListener('click', () => {
        currentStatus = el.dataset.status;
        render();
      });
    });

    document.getElementById('btnExportCSV')?.addEventListener('click', () => {
      const statusLabel = currentDef.label.replace(/[^a-zA-Zก-๙0-9]/g, '_');
      const date = new Date().toISOString().slice(0, 10);
      exportCSV(items, columns, `report_${statusLabel}_${date}.csv`);
      if (window.App && App.toast) App.toast('ส่งออก CSV สำเร็จ (' + items.length + ' รายการ)', 'success');
    });
  }

  function escHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  await render();
};
