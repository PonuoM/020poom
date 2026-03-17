/* ============================================
 Dashboard
 ============================================ */

Pages.dashboard = async function(container) {
  let stats = { total_items: 0, received: 0, reconditioning: 0, completed: 0, shipped: 0, waiting_parts: 0 };
  let recentItems = [];
  try {
    const data = await App.api('dashboard.php');
    stats = data.stats || stats;
    recentItems = data.recent || [];
  } catch (e) { console.warn('Dashboard API:', e); }

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card blue">
        <div class="stat-icon blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
        </div>
        <div class="stat-value">${stats.total_items}</div>
        <div class="stat-label">สินค้ารับคืนทั้งหมด</div>
      </div>
      <div class="stat-card yellow">
        <div class="stat-icon yellow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
        </div>
        <div class="stat-value">${stats.reconditioning}</div>
        <div class="stat-label">กำลังปรับสภาพ</div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div class="stat-value">${stats.completed}</div>
        <div class="stat-label">ปรับเสร็จแล้ว</div>
      </div>
      <div class="stat-card purple">
        <div class="stat-icon purple">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="23 7 16 12 16 2 23 7"/></svg>
        </div>
        <div class="stat-value">${stats.shipped}</div>
        <div class="stat-label">ส่งคลังแล้ว</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">รายการล่าสุด</div>
          <div class="card-subtitle">สินค้ารับคืนล่าสุด 10 รายการ</div>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="data-table" id="dashboardTable">
          <thead>
            <tr>
              <th>เลขที่รับคืน</th>
              <th>สินค้า</th>
              <th>สาขา</th>
              <th>วันที่</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            ${recentItems.length === 0
              ? '<tr><td colspan="5" class="text-center" style="padding:32px;color:var(--text-muted)">ยังไม่มีข้อมูล — เริ่มเพิ่มรายการรับคืนสินค้า</td></tr>'
              : recentItems.map(r => `
                <tr>
                  <td><strong>${App.escapeHTML(r.receipt_number)}</strong></td>
                  <td>${App.escapeHTML(r.good_name || r.good_code || '-')}</td>
                  <td>${App.escapeHTML(r.branch_name || '-')}</td>
                  <td>${r.return_date || '-'}</td>
                  <td>${App.statusBadge(r.status)}</td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
};