/* ============================================
 Approval rounds + detail
 ============================================ */

Pages.approvals = async function(container) {
  try {
    const data = await App.api('approvals.php');
    Pages._appData = data.batches || [];
  } catch (e) { console.warn('Approvals API:', e); Pages._appData = []; }

  Pages._appPage = 1;
  Pages._appSearch = '';
  Pages._renderApprovalsList(container);
};
Pages._getFilteredApprovals = function() {
  if (!Pages._appSearch) return Pages._appData;
  const q = Pages._appSearch.toLowerCase();
  return Pages._appData.filter(b =>
    (b.batch_number || '').toLowerCase().includes(q) ||
    (b.batch_type || '').toLowerCase().includes(q) ||
    (b.status || '').toLowerCase().includes(q)
  );
};
// === APPROVAL ROUNDS ===

Pages.approvalRounds = async function(container) {
  container.innerHTML = '<div style="text-align:center;padding:60px"><div class="spinner"></div><div style="margin-top:12px;color:var(--text-muted)">กำลังโหลดข้อมูล...</div></div>';
  try {
    const data = await App.api('approvals.php');
    const batches = data.batches || data;

    // Group by warehouse+round, only those with a round
    const assigned = batches.filter(b => b.submission_round);
    const groups = {};
    assigned.forEach(b => {
      const key = b.batch_type + '|' + b.submission_round;
      if (!groups[key]) {
        groups[key] = {
          warehouse: b.batch_type,
          warehouse_name: b.warehouse_name || b.batch_type,
          round: b.submission_round,
          batches: [],
          total_items: 0,
          statuses: new Set()
        };
      }
      groups[key].batches.push(b);
      groups[key].total_items += parseInt(b.item_count) || 0;
      groups[key].statuses.add(b.status);
    });

    const groupList = Object.values(groups).sort((a, b) => {
      if (a.warehouse !== b.warehouse) return a.warehouse.localeCompare(b.warehouse);
      return a.round - b.round;
    });

    const statusMap = {
      draft:    { label: '\u0e41\u0e1a\u0e1a\u0e23\u0e48\u0e32\u0e07', color: '#9ca3af', bg: 'var(--bg-input)' },
      pending:  { label: '\u0e23\u0e2d\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
      approved: { label: '\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e41\u0e25\u0e49\u0e27', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
      rejected: { label: '\u0e44\u0e21\u0e48\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
    };

    const getGroupStatus = (g) => {
      const arr = [...g.statuses];
      if (arr.length === 1) return statusMap[arr[0]] || statusMap.draft;
      if (arr.includes('rejected')) return statusMap.rejected;
      if (arr.includes('approved') && arr.includes('pending')) return { label: '\u0e1a\u0e32\u0e07\u0e2a\u0e48\u0e27\u0e19', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
      return statusMap.pending;
    };

    const rows = groupList.map((g, idx) => {
      const st = getGroupStatus(g);
      return '<tr style="cursor:pointer" data-wh="'+App.escapeHTML(g.warehouse)+'" data-round="'+g.round+'">'
        + '<td style="text-align:center;color:var(--text-muted)">'+(idx+1)+'</td>'
        + '<td><span style="display:inline-flex;align-items:center;gap:8px"><span style="display:inline-flex;align-items:center;justify-content:center;min-width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:700;font-size:0.8rem;padding:0 8px">'+g.round+'</span><span style="font-weight:600;color:var(--text-main)">\u0e04\u0e23\u0e31\u0e49\u0e07\u0e17\u0e35\u0e48 '+g.round+'</span></span></td>'
        + '<td>'+App.escapeHTML(g.warehouse)+' '+App.escapeHTML(g.warehouse_name)+'</td>'
        + '<td style="text-align:center"><span style="background:var(--accent-blue-bg);color:var(--accent-blue-light);padding:2px 10px;border-radius:12px;font-weight:600">'+g.batches.length+'</span></td>'
        + '<td style="text-align:center"><span style="background:var(--accent-blue-bg);color:var(--accent-blue-light);padding:2px 10px;border-radius:12px;font-weight:600">'+g.total_items+'</span></td>'
        + '<td><span style="background:'+st.bg+';color:'+st.color+';padding:3px 10px;border-radius:12px;font-size:0.78rem;font-weight:500">'+st.label+'</span></td>'
        + '<td style="color:var(--text-muted)">'+App.escapeHTML(g.batches[0].approved_by || '-')+'</td>'
        + '</tr>';
    }).join('');

    const emptyMsg = groupList.length === 0
      ? '<tr><td colspan="7" style="text-align:center;padding:48px;color:var(--text-muted)">\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e01\u0e25\u0e38\u0e48\u0e21\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e02\u0e2d\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34</td></tr>'
      : '';

    container.innerHTML = `
      <div class="flex items-center justify-between mb-24" style="flex-wrap:wrap;gap:12px">
        <div>
          <div class="card-title">\u0e01\u0e25\u0e38\u0e48\u0e21\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e02\u0e2d\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34</div>
          <div class="card-subtitle">\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e01\u0e25\u0e38\u0e48\u0e21\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e17\u0e35\u0e48\u0e2a\u0e48\u0e07\u0e02\u0e2d\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e41\u0e25\u0e49\u0e27 \u0e41\u0e22\u0e01\u0e15\u0e32\u0e21\u0e04\u0e25\u0e31\u0e07\u0e41\u0e25\u0e30\u0e04\u0e23\u0e31\u0e49\u0e07\u0e17\u0e35\u0e48</div>
        </div>
      </div>

      <div class="card" style="overflow:visible">
        <div class="table-wrapper" style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:40px">#</th>
                <th>\u0e04\u0e23\u0e31\u0e49\u0e07\u0e17\u0e35\u0e48</th>
                <th>\u0e04\u0e25\u0e31\u0e07\u0e1b\u0e25\u0e32\u0e22\u0e17\u0e32\u0e07</th>
                <th style="text-align:center">\u0e08\u0e33\u0e19\u0e27\u0e19\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23</th>
                <th style="text-align:center">\u0e08\u0e33\u0e19\u0e27\u0e19\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32</th>
                <th>\u0e2a\u0e16\u0e32\u0e19\u0e30</th>
                <th>\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e42\u0e14\u0e22</th>
              </tr>
            </thead>
            <tbody>
              ${rows || emptyMsg}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Row click => go to round detail
    container.querySelectorAll('tr[data-round]').forEach(row => {
      row.addEventListener('click', () => {
        location.hash = '#approval-rounds/' + row.dataset.wh + '/' + row.dataset.round;
      });
    });

  } catch (err) {
    container.innerHTML = '<div class="card" style="padding:32px;text-align:center;color:var(--text-muted)">\u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14: ' + App.escapeHTML(err.message || '') + '</div>';
  }
};
Pages.approvalRoundDetail = async function(container, warehouse, round) {
  container.innerHTML = '<div style="text-align:center;padding:60px"><div class="spinner"></div><div style="margin-top:12px;color:var(--text-muted)">\u0e01\u0e33\u0e25\u0e31\u0e07\u0e42\u0e2b\u0e25\u0e14\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25...</div></div>';
  try {
    const data = await App.api('approvals.php?action=round_detail&warehouse=' + encodeURIComponent(warehouse) + '&round=' + round);
    const items = data.items || [];
    const batches = data.batches || [];

    const statusMap = {
      draft:    { label: '\u0e41\u0e1a\u0e1a\u0e23\u0e48\u0e32\u0e07', color: '#9ca3af', bg: 'var(--bg-input)' },
      pending:  { label: '\u0e23\u0e2d\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
      approved: { label: '\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e41\u0e25\u0e49\u0e27', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
      rejected: { label: '\u0e44\u0e21\u0e48\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
    };

    const overallStatus = data.overall_status || 'draft';
    const isFinalized = overallStatus === 'approved' || overallStatus === 'rejected';
    const wName = data.warehouse_name || warehouse;

    const tableRows = items.map((item, idx) => {
      const combinedReason = [item.sales_reason, item.team_reason, item.cause_text].filter(Boolean).join(' / ') || '-';
      const whCode = item.target_warehouse || '-';
      return '<tr>'
        + '<td style="text-align:center;color:var(--text-muted)">'+(idx+1)+'</td>'
        + '<td style="font-weight:600">'+App.escapeHTML(item.receipt_number || '-')+'</td>'
        + '<td>'+App.escapeHTML(item.branch_name || '-')+'</td>'
        + '<td>'+App.escapeHTML(item.return_type || '-')+'</td>'
        + '<td>'+App.escapeHTML(item.class || '-')+'</td>'
        + '<td><code style="font-size:0.82rem">'+App.escapeHTML(item.good_code || '-')+'</code></td>'
        + '<td>'+App.escapeHTML(item.good_name || '-')+'</td>'
        + '<td style="text-align:center"><span style="background:var(--accent-blue-bg);color:var(--accent-blue-light);padding:2px 10px;border-radius:12px;font-weight:600">'+(parseInt(item.quantity)||1)+'</span></td>'
        + '<td style="font-size:0.8rem;max-width:200px">'+App.escapeHTML(combinedReason)+'</td>'
        + '<td >'+App.escapeHTML(whCode)+'</td>'
        + '<td><span style="color:var(--accent-blue-light);font-weight:600;font-size:0.82rem">'+App.escapeHTML(item.batch_number || '-')+'</span></td>'
        + '</tr>';
    }).join('');

    const emptyMsg = items.length === 0
      ? '<tr><td colspan="11" style="text-align:center;padding:48px;color:var(--text-muted)">\u0e44\u0e21\u0e48\u0e21\u0e35\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32</td></tr>'
      : '';

    const st = statusMap[overallStatus] || statusMap.draft;

    container.innerHTML = `
      <div class="flex items-center justify-between mb-24" style="flex-wrap:wrap;gap:12px">
        <div>
          <div class="card-title" style="display:flex;align-items:center;gap:10px">
            <button id="btnBackRounds" class="btn btn-outline" style="padding:6px 10px;min-width:0" title="\u0e01\u0e25\u0e31\u0e1a">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            \u0e02\u0e2d\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e04\u0e25\u0e31\u0e07 ${App.escapeHTML(warehouse)} \u0e04\u0e23\u0e31\u0e49\u0e07\u0e17\u0e35\u0e48 ${round}
          </div>
          <div class="card-subtitle">\u0e04\u0e25\u0e31\u0e07 ${App.escapeHTML(warehouse)} ${App.escapeHTML(wName)} \u00b7 ${items.length} \u0e23\u0e32\u0e22\u0e01\u0e32\u0e23 \u00b7 ${batches.length} \u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23</div>
        </div>
        <div class="flex gap-8 items-center" style="flex-wrap:wrap">
          <span style="background:${st.bg};color:${st.color};padding:5px 14px;border-radius:12px;font-size:0.82rem;font-weight:600">${st.label}</span>
          <button id="btnPrintRound" class="btn btn-outline" style="gap:6px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              \u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23
            </button>
          ${!isFinalized ? `
            <button id="btnRejectRound" class="btn" style="gap:6px;background:linear-gradient(135deg,#ef4444,#f97316);color:#fff">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              \u0e44\u0e21\u0e48\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34
            </button>
            <button id="btnApproveRound" class="btn" style="gap:6px;background:linear-gradient(135deg,#10b981,#34d399);color:#fff">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="20 6 9 17 4 12"/></svg>
              \u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14
            </button>
          ` : ''}
        </div>
      </div>

      <div class="card" style="overflow:visible">
        <div class="table-wrapper" style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:35px">#</th>
                <th>\u0e40\u0e25\u0e02\u0e17\u0e35\u0e48\u0e43\u0e1a\u0e23\u0e31\u0e1a\u0e04\u0e37\u0e19</th>
                <th>\u0e2a\u0e32\u0e02\u0e32/\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32</th>
                <th>\u0e40\u0e04\u0e2a\u0e23\u0e31\u0e1a\u0e04\u0e37\u0e19</th>
                <th>Class</th>
                <th>\u0e23\u0e2b\u0e31\u0e2a\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32</th>
                <th>\u0e0a\u0e37\u0e48\u0e2d\u0e23\u0e38\u0e48\u0e19\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32</th>
                <th style="text-align:center">\u0e08\u0e33\u0e19\u0e27\u0e19</th>
                <th>\u0e40\u0e2b\u0e15\u0e38\u0e1c\u0e25</th>
                <th>\u0e04\u0e25\u0e31\u0e07\u0e1b\u0e25\u0e32\u0e22\u0e17\u0e32\u0e07</th>
                <th>\u0e40\u0e25\u0e02\u0e23\u0e2d\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows || emptyMsg}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Back button
    document.getElementById('btnBackRounds').addEventListener('click', () => {
      location.hash = '#approval-rounds';
    });

    // Approve round
    document.getElementById('btnApproveRound')?.addEventListener('click', async () => {
      if (!confirm('\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14 ' + items.length + ' \u0e23\u0e32\u0e22\u0e01\u0e32\u0e23 \u0e04\u0e25\u0e31\u0e07 ' + warehouse + ' \u0e04\u0e23\u0e31\u0e49\u0e07\u0e17\u0e35\u0e48 ' + round + '?')) return;
      try {
        await App.api('approvals.php?action=approve_round', {
          method: 'POST',
          body: JSON.stringify({ warehouse_code: warehouse, round_number: parseInt(round) })
        });
        App.toast('\u2705 \u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22\u0e41\u0e25\u0e49\u0e27!', 'success');
        await Pages.approvalRoundDetail(container, warehouse, round);
      } catch (err) {
        App.toast('\u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14: ' + (err.message || err), 'error');
      }
    });

    // Reject round
    document.getElementById('btnRejectRound')?.addEventListener('click', async () => {
      if (!confirm('\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e44\u0e21\u0e48\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14 ' + items.length + ' \u0e23\u0e32\u0e22\u0e01\u0e32\u0e23?')) return;
      try {
        await App.api('approvals.php?action=reject_round', {
          method: 'POST',
          body: JSON.stringify({ warehouse_code: warehouse, round_number: parseInt(round) })
        });
        App.toast('\u274c \u0e44\u0e21\u0e48\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22\u0e41\u0e25\u0e49\u0e27', 'success');
        await Pages.approvalRoundDetail(container, warehouse, round);
      } catch (err) {
        App.toast('\u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14: ' + (err.message || err), 'error');
      }
    });

    // Print document
    document.getElementById('btnPrintRound')?.addEventListener('click', () => {
      Pages._printApprovalRoundDoc(items, batches, warehouse, wName, round);
    });

  } catch (err) {
    container.innerHTML = '<div class="card" style="padding:32px;text-align:center;color:var(--text-muted)">\u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14: ' + App.escapeHTML(err.message || '') + '</div>';
  }
};
Pages._printApprovalRoundDoc = function(items, batches, warehouse, wName, round) {
  // Thai month names
  const thaiMonths = ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const now = new Date();
  const thaiYear = now.getFullYear() + 543;
  const thaiMonth = thaiMonths[now.getMonth() + 1];

  // Calculate total quantity
  const totalQty = items.reduce((sum, it) => sum + (parseInt(it.quantity) || 1), 0);

  // Build table rows
  const rows = items.map((item, idx) => {
    const combinedReason = [item.sales_reason, item.team_reason, item.cause_text].filter(Boolean).join(' / ') || '';
    const esc = (s) => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<tr>
      <td>${esc(item.receipt_number || '')}</td>
      <td>${esc(item.branch_name || '')}</td>
      <td>${esc(item.return_type || '')}</td>
      <td style="text-align:center">${esc(item.class || '')}</td>
      <td>${esc(item.good_code || '')}</td>
      <td>${esc(item.good_name || '')}</td>
      <td style="text-align:center">${parseInt(item.quantity) || 1}</td>
      <td style="font-size:8pt">${esc(combinedReason)}</td>
      <td style="text-align:center">${esc(item.target_warehouse || '')}</td>
      <td>${esc(item.batch_number || '')}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>ขออนุมัติ โอนเข้าคลัง ${warehouse} ครั้งที่ ${round}</title>
<style>
  @page {
  size: A4 landscape;
  margin: 12mm 10mm 15mm 10mm;
  }
  * { box-sizing: border-box; margin:0; padding:0; }
  body {
  font-family: 'Sarabun', 'TH SarabunPSK', 'Tahoma', sans-serif;
  font-size: 11pt;
  color: #000;
  }
  .doc-title {
  text-align: center;
  font-size: 14pt;
  font-weight: bold;
  margin-bottom: 8px;
  padding-top: 4px;
  }
  table.doc-table {
  width: 100%;
  border-collapse: collapse;
  page-break-inside: auto;
  }
  table.doc-table th, table.doc-table td {
  border: 1px solid #000;
  padding: 3px 5px;
  vertical-align: top;
  font-size: 10pt;
  }
  table.doc-table th {
  background: #e8e8e8;
  font-weight: bold;
  text-align: center;
  white-space: nowrap;
  }
  table.doc-table tr { page-break-inside: avoid; }
  .total-row td {
  font-weight: bold;
  text-align: center;
  border: 1px solid #000;
  padding: 3px 5px;
  }
  .signatures {
  page-break-inside: avoid;
  margin-top: 30px;
  display: flex;
  justify-content: space-around;
  }
  .sig-box {
  text-align: center;
  width: 280px;
  }
  .sig-line {
  border-bottom: 1px dotted #000;
  width: 220px;
  height: 50px;
  margin: 0 auto;
  }
  .sig-label {
  font-size: 12pt;
  font-weight: bold;
  margin-top: 4px;
  }
  @media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="doc-title">
  ขออนุมัติ โอนเข้าคลัง ${wName}(${warehouse}) ครั้งที่ ${round} ประจำเดือน ${thaiMonth} ${thaiYear}
  </div>

  <table class="doc-table">
  <thead>
    <tr>
      <th>เลขที่ใบรับ</th>
      <th>สาขา/ลูกค้า</th>
      <th>เคสรับคืน</th>
      <th>Class</th>
      <th>รหัสสินค้า</th>
      <th>ชื่อรุ่นสินค้า</th>
      <th>จำนวน</th>
      <th>เหตุผลฝ่ายขาย+ทีมปรับสภาพ</th>
      <th>ปรับได้</th>
      <th>เลขขออนุมัติ</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    <tr class="total-row">
      <td colspan="6" style="text-align:right; font-weight:bold">รวม</td>
      <td style="text-align:center; font-weight:bold">${totalQty}</td>
      <td colspan="3"></td>
    </tr>
  </tbody>
  </table>

  <div class="signatures">
  <div class="sig-box">
    <div class="sig-line"></div>
    <div class="sig-label">ผู้ตรวจสอบ (แผนกรับคืน)</div>
  </div>
  <div class="sig-box">
    <div class="sig-line"></div>
    <div class="sig-label">ผู้ตรวจสอบ (แผนกคิวซี)</div>
  </div>
  </div>

</body>
</html>`;

  const printWin = window.open('', '_blank');
  printWin.document.write(html);
  printWin.document.close();
  printWin.onload = () => {
    setTimeout(() => { printWin.print(); }, 500);
  };
};
Pages._renderApprovalsList = function(container) {
  const allData = Pages._appData;
  const searchQ = Pages._appSearch.toLowerCase();

  const filtered = searchQ
    ? allData.filter(b =>
        (b.batch_number || '').toLowerCase().includes(searchQ) ||
        (b.batch_type || '').toLowerCase().includes(searchQ) ||
        (b.warehouse_name || '').toLowerCase().includes(searchQ) ||
        (b.status || '').toLowerCase().includes(searchQ) ||
        (b.submission_round ? ('\u0e04\u0e23\u0e31\u0e49\u0e07\u0e17\u0e35\u0e48 ' + b.submission_round).includes(searchQ) : false)
      )
    : allData;

  // Sort: assigned rounds first (ascending), then unassigned
  const sorted = [...filtered].sort((a, b) => {
    const ra = a.submission_round || 99999;
    const rb = b.submission_round || 99999;
    if (ra !== rb) return ra - rb;
    return (a.batch_number || '').localeCompare(b.batch_number || '');
  });

  const statusMap = {
    draft:    { label: '\u0e41\u0e1a\u0e1a\u0e23\u0e48\u0e32\u0e07',    color: '#9ca3af', bg: 'var(--bg-input)' },
    pending:  { label: '\u0e23\u0e2d\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    approved: { label: '\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e41\u0e25\u0e49\u0e27', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    rejected: { label: '\u0e44\u0e21\u0e48\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
  };

  const totalBatches = filtered.length;
  const totalRounds = [...new Set(filtered.filter(b => b.submission_round).map(b => b.submission_round + '-' + b.batch_type))].length;
  const approvedCount = filtered.filter(b => b.status === 'approved').length;
  const pendingCount  = filtered.filter(b => b.status === 'pending').length;
  const unassignedCount = filtered.filter(b => !b.submission_round).length;

  // Build table rows (no checkboxes)
  const tableRows = sorted.map((b, idx) => {
    const st = statusMap[b.status] || statusMap.draft;
    const fmtDate = b.batch_date ? new Date(b.batch_date + 'T00:00:00').toLocaleDateString('th-TH', {day:'2-digit',month:'short',year:'numeric'}) : '-';
    const whLabel = b.warehouse_name ? App.escapeHTML(b.batch_type) + ' ' + App.escapeHTML(b.warehouse_name) : App.escapeHTML(b.batch_type || '-');
    const roundBadge = b.submission_round
      ? '<span style="display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:700;font-size:0.82rem;padding:0 8px">' + b.submission_round + '</span>'
      : '<span style="color:var(--text-muted);font-size:0.82rem">\u2014</span>';

    return '<tr style="cursor:pointer" data-batch-id="'+b.id+'">'
      + '<td style="text-align:center;color:var(--text-muted)">'+(idx+1)+'</td>'
      + '<td><a href="#approvals/'+b.id+'" style="color:var(--accent-blue-light);font-weight:600;text-decoration:none" onclick="event.stopPropagation()">'+App.escapeHTML(b.batch_number)+'</a></td>'
      + '<td>'+whLabel+'</td>'
      + '<td>'+fmtDate+'</td>'
      + '<td style="text-align:center"><span style="background:var(--accent-blue-bg);color:var(--accent-blue-light);padding:2px 10px;border-radius:12px;font-weight:600">'+(parseInt(b.item_count)||0)+'</span></td>'
      + '<td><span style="background:'+st.bg+';color:'+st.color+';padding:3px 10px;border-radius:12px;font-size:0.78rem;font-weight:500">'+st.label+'</span></td>'
      + '<td style="text-align:center">'+roundBadge+'</td>'
      + '<td style="color:var(--text-muted)">'+App.escapeHTML(b.approved_by || '-')+'</td>'
      + '</tr>';
  }).join('');

  const emptyMsg = totalBatches === 0
    ? '<tr><td colspan="8" style="text-align:center;padding:48px;color:var(--text-muted)">\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e0a\u0e38\u0e14\u0e02\u0e2d\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34</td></tr>'
    : '';

  container.innerHTML = `
    <div class="flex items-center justify-between mb-24" style="flex-wrap:wrap;gap:12px">
      <div>
        <div class="card-title">\u0e0a\u0e38\u0e14\u0e02\u0e2d\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34</div>
        <div class="card-subtitle">\u0e23\u0e27\u0e21\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23 (\u0e1e\u0e32\u0e40\u0e25\u0e17) \u0e40\u0e1b\u0e47\u0e19\u0e04\u0e23\u0e31\u0e49\u0e07\u0e17\u0e35\u0e48\u0e02\u0e2d\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34</div>
      </div>
      <div class="flex gap-8 items-center" style="flex-wrap:wrap">
        <div class="search-bar" style="margin:0;max-width:260px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" id="searchApprovals" placeholder="\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e40\u0e25\u0e02\u0e17\u0e35\u0e48\u0e0a\u0e38\u0e14 / \u0e04\u0e25\u0e31\u0e07..." value="${App.escapeHTML(Pages._appSearch)}">
        </div>
        ${unassignedCount > 0 ? `<button class="btn" id="btnOrganizeApprovals" style="gap:6px;background:linear-gradient(135deg,#f59e0b,#f97316);color:#fff">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>
          \u0e08\u0e31\u0e14\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34 <span style="background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:8px;font-size:0.75rem;margin-left:2px">${unassignedCount}</span>
        </button>` : ''}
        <a href="#approvals/new" class="btn btn-primary" style="text-decoration:none;gap:6px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          \u0e2a\u0e23\u0e49\u0e32\u0e07\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23
        </a>
      </div>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px 20px;flex:1;min-width:120px;text-align:center">
        <div style="font-size:1.5rem;font-weight:700;color:var(--text-main)">${totalBatches}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px 20px;flex:1;min-width:120px;text-align:center">
        <div style="font-size:1.5rem;font-weight:700;color:var(--primary)">${totalRounds}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">\u0e04\u0e23\u0e31\u0e49\u0e07\u0e17\u0e35\u0e48\u0e02\u0e2d\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px 20px;flex:1;min-width:120px;text-align:center">
        <div style="font-size:1.5rem;font-weight:700;color:#10b981">${approvedCount}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e41\u0e25\u0e49\u0e27</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px 20px;flex:1;min-width:120px;text-align:center">
        <div style="font-size:1.5rem;font-weight:700;color:#f59e0b">${pendingCount}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">\u0e23\u0e2d\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34</div>
      </div>
    </div>

    <div class="card" style="overflow:visible">
      <div class="table-wrapper" style="overflow-x:auto">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:40px">#</th>
              <th>\u0e40\u0e25\u0e02\u0e17\u0e35\u0e48\u0e0a\u0e38\u0e14</th>
              <th>\u0e04\u0e25\u0e31\u0e07\u0e1b\u0e25\u0e32\u0e22\u0e17\u0e32\u0e07</th>
              <th>\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48</th>
              <th style="text-align:center">\u0e08\u0e33\u0e19\u0e27\u0e19</th>
              <th>\u0e2a\u0e16\u0e32\u0e19\u0e30</th>
              <th style="text-align:center">\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e04\u0e23\u0e31\u0e49\u0e07\u0e17\u0e35\u0e48</th>
              <th>\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e42\u0e14\u0e22</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || emptyMsg}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // == Table row click => navigate ==
  container.querySelectorAll('tr[data-batch-id]').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      location.hash = '#approvals/' + row.dataset.batchId;
    });
  });

  // == Search ==
  const searchInput = document.getElementById('searchApprovals');
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      Pages._appSearch = searchInput.value.trim();
      Pages._appPage = 1;
      Pages._renderApprovalsList(container);
    }, 300);
  });

  // == Organize Approvals button => open sub-page ==
  document.getElementById('btnOrganizeApprovals')?.addEventListener('click', () => {
    Pages._renderOrganizeApprovals(container);
  });
};
_renderOrganizeApprovals(container) {
  const allData = Pages._appData;
  const unassigned = allData.filter(b => !b.submission_round);

  // Get unique warehouse codes from unassigned batches
  const warehouseCodes = [...new Set(unassigned.map(b => b.batch_type))].sort();
  const selectedWh = Pages._organizeWhFilter || warehouseCodes[0] || '';
  Pages._organizeWhFilter = selectedWh;

  // Filter by selected warehouse
  const filteredBatches = selectedWh ? unassigned.filter(b => b.batch_type === selectedWh) : unassigned;

  // Get next round number for this warehouse
  const allForWh = allData.filter(b => b.batch_type === selectedWh && b.submission_round);
  const maxRound = allForWh.reduce((mx, b) => Math.max(mx, b.submission_round || 0), 0);
  const nextRound = maxRound + 1;

  // Get warehouse name
  const whSample = unassigned.find(b => b.batch_type === selectedWh);
  const whName = whSample ? (whSample.warehouse_name || selectedWh) : selectedWh;

  const statusMap = {
    draft:    { label: '\u0e41\u0e1a\u0e1a\u0e23\u0e48\u0e32\u0e07',    color: '#9ca3af', bg: 'var(--bg-input)' },
    pending:  { label: '\u0e23\u0e2d\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    approved: { label: '\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e41\u0e25\u0e49\u0e27', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    rejected: { label: '\u0e44\u0e21\u0e48\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
  };

  // Warehouse tabs
  const tabsHTML = warehouseCodes.map(wh => {
    const count = unassigned.filter(b => b.batch_type === wh).length;
    const whNameLabel = unassigned.find(b => b.batch_type === wh)?.warehouse_name || wh;
    const isActive = wh === selectedWh;
    return `<button class="btn ${isActive ? '' : 'btn-outline'} wh-tab-btn" data-wh="${App.escapeHTML(wh)}" style="gap:4px;${isActive ? 'background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-color:transparent' : ''}">
      ${App.escapeHTML(wh)} ${App.escapeHTML(whNameLabel)}
      <span style="background:${isActive ? 'rgba(255,255,255,0.2)' : 'var(--accent-blue-bg)'};padding:2px 8px;border-radius:8px;font-size:0.72rem;font-weight:700">${count}</span>
    </button>`;
  }).join('');

  // Table rows with checkboxes
  const tableRows = filteredBatches.map((b, idx) => {
    const st = statusMap[b.status] || statusMap.draft;
    const fmtDate = b.batch_date ? new Date(b.batch_date + 'T00:00:00').toLocaleDateString('th-TH', {day:'2-digit',month:'short',year:'numeric'}) : '-';
    return '<tr style="cursor:pointer" data-batch-id="'+b.id+'">'
      + '<td style="text-align:center" onclick="event.stopPropagation()"><input type="checkbox" class="org-batch-cb" data-batch-id="'+b.id+'" data-batch-number="'+App.escapeHTML(b.batch_number||'')+'" style="width:16px;height:16px;cursor:pointer"></td>'
      + '<td style="text-align:center;color:var(--text-muted)">'+(idx+1)+'</td>'
      + '<td><a href="#approvals/'+b.id+'" style="color:var(--accent-blue-light);font-weight:600;text-decoration:none" onclick="event.stopPropagation()">'+App.escapeHTML(b.batch_number)+'</a></td>'
      + '<td>'+fmtDate+'</td>'
      + '<td style="text-align:center"><span style="background:var(--accent-blue-bg);color:var(--accent-blue-light);padding:2px 10px;border-radius:12px;font-weight:600">'+(parseInt(b.item_count)||0)+'</span></td>'
      + '<td><span style="background:'+st.bg+';color:'+st.color+';padding:3px 10px;border-radius:12px;font-size:0.78rem;font-weight:500">'+st.label+'</span></td>'
      + '</tr>';
  }).join('');

  const emptyMsg = filteredBatches.length === 0
    ? '<tr><td colspan="6" style="text-align:center;padding:48px;color:var(--text-muted)">\u0e44\u0e21\u0e48\u0e21\u0e35\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e17\u0e35\u0e48\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e08\u0e31\u0e14\u0e01\u0e25\u0e38\u0e48\u0e21\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e04\u0e25\u0e31\u0e07\u0e19\u0e35\u0e49</td></tr>'
    : '';

  container.innerHTML = `
    <div class="flex items-center justify-between mb-24" style="flex-wrap:wrap;gap:12px">
      <div>
        <div class="card-title" style="display:flex;align-items:center;gap:10px">
          <button id="btnBackToList" class="btn btn-outline" style="padding:6px 10px;min-width:0" title="\u0e01\u0e25\u0e31\u0e1a">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          \u0e08\u0e31\u0e14\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34
        </div>
        <div class="card-subtitle">\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e04\u0e25\u0e31\u0e07\u0e1b\u0e25\u0e32\u0e22\u0e17\u0e32\u0e07 \u0e41\u0e25\u0e49\u0e27\u0e15\u0e34\u0e4a\u0e01\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e17\u0e35\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e08\u0e31\u0e14\u0e01\u0e25\u0e38\u0e48\u0e21\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34</div>
      </div>
      <div class="flex gap-8 items-center" style="flex-wrap:wrap">
        <button class="btn" id="btnAssignRoundOrg" style="gap:6px;display:none;background:linear-gradient(135deg,#10b981,#34d399);color:#fff">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="20 6 9 17 4 12"/></svg>
          <span>\u0e08\u0e31\u0e14\u0e01\u0e25\u0e38\u0e48\u0e21\u0e04\u0e23\u0e31\u0e49\u0e07\u0e17\u0e35\u0e48...</span>
        </button>
      </div>
    </div>

    <!-- Warehouse tabs -->
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;padding-bottom:12px;border-bottom:1px solid var(--border)">
      ${tabsHTML}
    </div>

    <!-- Info banner -->
    <div style="background:linear-gradient(135deg,rgba(99,102,241,0.06),rgba(139,92,246,0.04));border:1px solid rgba(99,102,241,0.15);border-radius:12px;padding:14px 20px;margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" style="width:22px;height:22px"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21V13h6v8"/><path d="M3 8h18"/><path d="M7 8v4M12 8v4M17 8v4"/></svg>
      </div>
      <div style="flex:1;min-width:200px">
        <div style="font-weight:600;color:var(--text-main)">\u0e04\u0e25\u0e31\u0e07 ${App.escapeHTML(selectedWh)} ${App.escapeHTML(whName)}</div>
        <div style="font-size:0.78rem;color:var(--text-muted)">\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e23\u0e2d\u0e08\u0e31\u0e14\u0e01\u0e25\u0e38\u0e48\u0e21 ${filteredBatches.length} \u0e23\u0e32\u0e22\u0e01\u0e32\u0e23 \u00b7 \u0e04\u0e23\u0e31\u0e49\u0e07\u0e17\u0e35\u0e48\u0e16\u0e31\u0e14\u0e44\u0e1b: <span style="font-weight:700;color:var(--primary)">${nextRound}</span></div>
      </div>
    </div>

    <div class="card" style="overflow:visible">
      <div class="table-wrapper" style="overflow-x:auto">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:36px"><input type="checkbox" id="cbOrgSelectAll" style="width:16px;height:16px;cursor:pointer"></th>
              <th style="width:40px">#</th>
              <th>\u0e40\u0e25\u0e02\u0e17\u0e35\u0e48\u0e0a\u0e38\u0e14</th>
              <th>\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48</th>
              <th style="text-align:center">\u0e08\u0e33\u0e19\u0e27\u0e19</th>
              <th>\u0e2a\u0e16\u0e32\u0e19\u0e30</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || emptyMsg}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Assign Round Modal -->
    <div id="assignRoundModal" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);align-items:center;justify-content:center">
      <div style="background:var(--bg-card);border-radius:20px;padding:32px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);border:1px solid var(--border);animation:fadeInScale 0.25s ease-out">
        <div style="text-align:center;margin-bottom:20px">
          <div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:1.5rem">\ud83d\udce6</div>
          <div style="font-size:1.15rem;font-weight:700;color:var(--text-main)">\u0e08\u0e31\u0e14\u0e01\u0e25\u0e38\u0e48\u0e21\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34 \u0e04\u0e25\u0e31\u0e07 ${App.escapeHTML(selectedWh)}</div>
          <div id="assignRoundDocList" style="font-size:0.82rem;color:var(--text-muted);margin-top:6px"></div>
        </div>
        <div style="margin-bottom:20px">
          <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px">\u0e04\u0e23\u0e31\u0e49\u0e07\u0e17\u0e35\u0e48</label>
          <input type="number" id="assignRoundInput" min="1" value="${nextRound}" style="width:100%;padding:12px 16px;border-radius:12px;border:2px solid var(--border);background:var(--bg-input);color:var(--text-main);font-size:1.2rem;font-weight:700;text-align:center;outline:none;transition:border-color 0.2s" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'">
        </div>
        <div style="display:flex;gap:10px">
          <button id="assignRoundCancel" class="btn btn-outline" style="flex:1;padding:10px">\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01</button>
          <button id="assignRoundConfirm" class="btn btn-primary" style="flex:1;padding:10px;gap:6px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="20 6 9 17 4 12"/></svg>
            \u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e08\u0e31\u0e14\u0e01\u0e25\u0e38\u0e48\u0e21
          </button>
        </div>
      </div>
    </div>
  `;

  // == Back button ==
  document.getElementById('btnBackToList').addEventListener('click', () => {
    Pages._renderApprovalsList(container);
  });

  // == Warehouse tabs ==
  container.querySelectorAll('.wh-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      Pages._organizeWhFilter = btn.dataset.wh;
      Pages._renderOrganizeApprovals(container);
    });
  });

  // == Table row click ==
  container.querySelectorAll('tr[data-batch-id]').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('a') || e.target.closest('input')) return;
      location.hash = '#approvals/' + row.dataset.batchId;
    });
  });

  // == Select All ==
  const cbAll = document.getElementById('cbOrgSelectAll');
  const updateBtn = () => {
    const btn = document.getElementById('btnAssignRoundOrg');
    if (!btn) return;
    const cnt = document.querySelectorAll('.org-batch-cb:checked').length;
    btn.style.display = cnt > 0 ? 'inline-flex' : 'none';
    const span = btn.querySelector('span');
    if (span) span.textContent = '\u0e08\u0e31\u0e14\u0e01\u0e25\u0e38\u0e48\u0e21\u0e04\u0e23\u0e31\u0e49\u0e07\u0e17\u0e35\u0e48 ' + nextRound + ' (' + cnt + ' \u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23)';
  };

  if (cbAll) {
    cbAll.addEventListener('change', () => {
      container.querySelectorAll('.org-batch-cb').forEach(cb => cb.checked = cbAll.checked);
      updateBtn();
    });
  }

  container.querySelectorAll('.org-batch-cb').forEach(cb => {
    cb.addEventListener('change', updateBtn);
  });

  // == Assign Round ==
  const btnAssign = document.getElementById('btnAssignRoundOrg');
  const assignModal = document.getElementById('assignRoundModal');
  if (btnAssign && assignModal) {
    btnAssign.addEventListener('click', () => {
      const checkedCbs = Array.from(document.querySelectorAll('.org-batch-cb:checked'));
      if (checkedCbs.length === 0) return;

      const docListHTML = checkedCbs.map(cb => '<span style="display:inline-block;background:var(--accent-blue-bg);color:var(--accent-blue-light);padding:2px 8px;border-radius:8px;font-size:0.75rem;font-weight:600;margin:2px">' + App.escapeHTML(cb.dataset.batchNumber) + '</span>').join('');
      document.getElementById('assignRoundDocList').innerHTML = '\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e17\u0e35\u0e48\u0e40\u0e25\u0e37\u0e2d\u0e01 ' + checkedCbs.length + ' \u0e23\u0e32\u0e22\u0e01\u0e32\u0e23<br>' + docListHTML;
      document.getElementById('assignRoundInput').value = nextRound;

      assignModal.style.display = 'flex';
      setTimeout(() => document.getElementById('assignRoundInput').focus(), 100);
    });

    document.getElementById('assignRoundCancel').addEventListener('click', () => assignModal.style.display = 'none');
    assignModal.addEventListener('click', (e) => { if (e.target === assignModal) assignModal.style.display = 'none'; });

    document.getElementById('assignRoundConfirm').addEventListener('click', async () => {
      const roundNum = parseInt(document.getElementById('assignRoundInput').value);
      if (!roundNum || roundNum < 1) { App.toast('\u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e30\u0e1a\u0e38\u0e04\u0e23\u0e31\u0e49\u0e07\u0e17\u0e35\u0e48\u0e43\u0e2b\u0e49\u0e16\u0e39\u0e01\u0e15\u0e49\u0e2d\u0e07', 'error'); return; }

      const checkedCbs = Array.from(document.querySelectorAll('.org-batch-cb:checked'));
      const batchIds = checkedCbs.map(cb => parseInt(cb.dataset.batchId));
      const confirmBtn = document.getElementById('assignRoundConfirm');

      try {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="spinner-sm"></span> \u0e01\u0e33\u0e25\u0e31\u0e07\u0e08\u0e31\u0e14\u0e01\u0e25\u0e38\u0e48\u0e21...';
        await App.api('approvals.php?action=assign_round', {
          method: 'POST',
          body: JSON.stringify({ batch_ids: batchIds, round_number: roundNum, warehouse_code: selectedWh })
        });
        assignModal.style.display = 'none';
        App.toast('\u2705 \u0e08\u0e31\u0e14\u0e01\u0e25\u0e38\u0e48\u0e21\u0e04\u0e25\u0e31\u0e07 ' + selectedWh + ' \u0e04\u0e23\u0e31\u0e49\u0e07\u0e17\u0e35\u0e48 ' + roundNum + ' \u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08 (' + batchIds.length + ' \u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23)', 'success');
        const refreshData = await App.api('approvals.php');
        Pages._appData = refreshData.batches || refreshData;
        Pages._renderOrganizeApprovals(container);
      } catch (err) {
        App.toast('\u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14: ' + (err.message || err), 'error');
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="20 6 9 17 4 12"/></svg> \u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e08\u0e31\u0e14\u0e01\u0e25\u0e38\u0e48\u0e21';
      }
    });
  }
};
_updateCombinedPrintBtn() {
  const checked = document.querySelectorAll('.batch-select-cb:checked');
  const btn = document.getElementById('btnPrintCombined');
  if (btn) {
    btn.style.display = checked.length > 0 ? 'inline-flex' : 'none';
    btn.textContent = '';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 🖨️ พิมพ์เอกสารรวม (' + checked.length + ')';
  }
};
  // ── Approval Detail (matches reconditioning format) ──
Pages.approvalDetail = async function(container, batchId) {
  const isNew = !batchId;
  let batch = null;
  let items = [];
  let warehouses = [];
  let receiptList = [];

  try {
    const whData = await App.api('approvals.php?action=warehouses');
    warehouses = whData.warehouses || [];
  } catch (e) { warehouses = []; }

  // For new docs: no default warehouse (user must pick one)
  // For existing docs: use the batch's warehouse type
  const defaultWarehouse = isNew ? '' : (batch?.batch_type || '');
  try {
    const rlUrl = 'approvals.php?action=receipt_list' + (defaultWarehouse ? `&warehouse=${encodeURIComponent(defaultWarehouse)}` : '');
    const rlData = await App.api(rlUrl);
    receiptList = rlData.receipts || [];
  } catch (e) { receiptList = []; }

  if (!isNew) {
    try {
      const data = await App.api(`approvals.php?batch_detail=${batchId}`);
      batch = data.batch;
      items = data.items || [];
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><h3>ไม่พบเอกสาร</h3></div>`;
      return;
    }
  }

  const statusMap = {
    draft: { label: 'แบบร่าง', color: 'var(--text-muted)', bg: 'var(--bg-input)' },
    pending: { label: 'รออนุมัติ', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    approved: { label: 'อนุมัติแล้ว', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    rejected: { label: 'ไม่อนุมัติ', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
  };

  const today = new Date().toISOString().slice(0, 10);
  const fmtDate = (d) => d ? new Date(d.split(' ')[0] + 'T00:00:00').toLocaleDateString('th-TH', {day:'2-digit',month:'2-digit',year:'numeric'}) : '-';

  // ── Header table (form or read-only) ──
  const headerHTML = isNew ? `
    <table class="recon-doc-header-table">
      <tbody>
        <tr>
          <td class="rdh-label">เลขที่เอกสารขออนุมัติ *</td>
          <td class="rdh-value">
            <div style="display:flex;gap:6px;align-items:center">
              <input class="form-input" id="appDocNumber" placeholder="เช่น A25690001" required style="max-width:280px">
              <button class="btn btn-outline btn-sm" id="btnAutoAppNumber" type="button" style="white-space:nowrap;gap:4px">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                สร้างอัตโนมัติ
              </button>
            </div>
          </td>
          <td class="rdh-label">วันที่เอกสาร *</td>
          <td class="rdh-value"><input class="form-input" id="appDocDate" type="date" value="${today}" required style="max-width:200px"></td>
        </tr>
        <tr>
          <td class="rdh-label">คลังปลายทาง *</td>
          <td class="rdh-value">
            <select class="form-select" id="appWarehouse" required style="max-width:380px">
              <option value="">เลือกคลังปลายทาง...</option>
              ${warehouses.map(w => `<option value="${App.escapeHTML(w.code)}">${App.escapeHTML(w.code)} — ${App.escapeHTML(w.name)} (${w.pending_count} รายการ)</option>`).join('')}
            </select>
          </td>
          <td class="rdh-label"></td>
          <td class="rdh-value"></td>
        </tr>
        <tr>
          <td class="rdh-label">หมายเหตุ</td>
          <td class="rdh-value" colspan="3"><textarea class="form-textarea" id="appNotes" rows="2" placeholder="หมายเหตุ..." style="width:100%"></textarea></td>
        </tr>
      </tbody>
    </table>
  ` : `
    <table class="recon-doc-header-table">
      <tbody>
        <tr>
          <td class="rdh-label">เลขที่เอกสารขออนุมัติ</td>
          <td class="rdh-value"><strong style="font-size:1.05rem;color:var(--primary)">${App.escapeHTML(batch.batch_number)}</strong></td>
          <td class="rdh-label">วันที่เอกสาร</td>
          <td class="rdh-value">${fmtDate(batch.batch_date)}</td>
        </tr>
        <tr>
          <td class="rdh-label">คลังปลายทาง</td>
          <td class="rdh-value"><span style="font-weight:600">${App.escapeHTML(batch.batch_type || '-')}</span></td>
          <td class="rdh-label">สถานะ</td>
          <td class="rdh-value">
            <span style="background:${(statusMap[batch.status] || statusMap.draft).bg};color:${(statusMap[batch.status] || statusMap.draft).color};padding:3px 12px;border-radius:12px;font-size:0.85rem;font-weight:500">${(statusMap[batch.status] || statusMap.draft).label}</span>
          </td>
        </tr>
        ${batch.approved_by ? `<tr><td class="rdh-label">อนุมัติโดย</td><td class="rdh-value">${App.escapeHTML(batch.approved_by)}</td><td class="rdh-label">วันที่อนุมัติ</td><td class="rdh-value">${fmtDate(batch.approved_date)}</td></tr>` : ''}
        <tr>
          <td class="rdh-label">หมายเหตุ</td>
          <td class="rdh-value" colspan="3" style="color:var(--text-muted)">${App.escapeHTML(batch?.notes || '—')}</td>
        </tr>
      </tbody>
    </table>
  `;

  const canEdit = isNew || batch?.status === 'draft';

  // ── receiptsMap for combo dropdowns ──
  const receiptsMap = Object.fromEntries(receiptList.map(r => [r.receipt_number, r]));
  const receiptNumbers = receiptList.map(r => r.receipt_number);

  // ── Items table HTML (Excel-style, used for both create and detail) ──
  const itemsTableHTML = `
    <div class="card" style="margin-bottom:20px">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:8px">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="width:18px;height:18px"><path d="M12 5v14M5 12h14"/></svg>
          <h3 style="margin:0;font-size:0.95rem">รายการสินค้า</h3>
          ${!isNew ? `<span style="font-size:0.8rem;color:var(--text-muted)">${items.length} รายการ</span>` : ''}
        </div>
        ${canEdit ? `<div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-outline" id="btnAppAddRow" style="gap:5px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M12 5v14M5 12h14"/></svg>
            เพิ่มแถว
          </button>
          <button class="btn btn-sm btn-primary" id="btnAppMultiSelect" style="gap:5px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            เลือกหลายรายการ
          </button>
        </div>` : ''}
      </div>
      <div class="app-items-scroll" style="max-height:380px;overflow-y:auto;overflow-x:auto;position:relative">
        <table class="recon-inline-table" id="appInlineTable">
          <thead>
            <tr>
              ${batch?.status === 'pending' ? '<th style="width:36px;text-align:center"><input type="checkbox" id="cbApproveAll" checked title="เลือกทั้งหมด" style="width:16px;height:16px;cursor:pointer"></th>' : ''}
              <th style="width:36px;text-align:center">No.</th>
              <th style="width:160px">เลขที่รับคืน</th>
              <th style="width:80px">สาขา</th>
              <th style="width:100px">ประเภทคืน</th>
              <th style="width:120px">รหัสสินค้า</th>
              <th style="min-width:160px">ชื่อสินค้า</th>
              <th style="width:70px;text-align:center">คลาส</th>
              <th style="width:100px;text-align:center">คลังปลายทาง</th>
              <th style="width:140px;text-align:center">เลขใบปรับ (อ้างอิง)</th>
              <th style="min-width:220px">หมายเหตุขออนุมัติ</th>
              ${canEdit ? '<th style="width:36px"></th>' : ''}
            </tr>
          </thead>
          <tbody id="appInlineBody">
            ${items.map((it, i) => {
              const reasonSuggestions = App.getReasonSuggestions(it.target_warehouse, it.return_type, it.good_code);
              return `
            <tr class="recon-saved-row" data-recon-id="${it.recon_id}" data-approval-item-id="${it.approval_item_id}">
              ${batch?.status === 'pending' ? '<td style="text-align:center"><input type="checkbox" class="approve-item-cb" data-approval-item-id="'+it.approval_item_id+'" checked style="width:16px;height:16px;cursor:pointer"></td>' : ''}
              <td class="cell-num" style="text-align:center">${i + 1}</td>
              <td><span class="cell-badge">${App.escapeHTML(it.receipt_number || '-')}</span></td>
              <td style="font-size:0.78rem">${App.escapeHTML(it.branch_name || '-')}</td>
              <td style="font-size:0.78rem">${App.escapeHTML(it.return_type || '-')}</td>
              <td><span class="cell-badge">${App.escapeHTML(it.good_code || '-')}</span></td>
              <td style="font-size:0.82rem">${App.escapeHTML(it.good_name || '-')}</td>
              <td style="text-align:center;font-size:0.78rem;font-weight:500">${App.escapeHTML(it.class || '-')}</td>
              <td style="text-align:center"><span style="background:rgba(239,68,68,0.1);color:#ef4444;padding:2px 8px;border-radius:8px;font-size:0.78rem">${App.escapeHTML(it.target_warehouse || '')} ${App.escapeHTML(it.warehouse_name || '')}</span></td>
              <td style="text-align:center;font-size:0.78rem;color:var(--text-muted)">${App.escapeHTML(it.recon_doc_number || '-')}</td>
              <td style="vertical-align:top;padding:4px 6px">
                ${canEdit ? `<div class="reason-suggest-pills" style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:3px">
                  ${reasonSuggestions.map(s => `<button type="button" class="reason-pill" data-reason="${App.escapeHTML(s)}" style="font-size:0.7rem;padding:1px 7px;border-radius:10px;border:1px solid var(--primary);background:rgba(102,126,234,0.08);color:var(--primary);cursor:pointer;white-space:nowrap">${App.escapeHTML(s)}</button>`).join('')}
                </div>
                <textarea data-role="reason" rows="2" style="width:100%;font-size:0.78rem;border:1px solid var(--border);border-radius:6px;padding:4px 6px;resize:vertical;font-family:inherit;background:var(--bg-primary)" placeholder="ระบุหมายเหตุ...">${App.escapeHTML(it.sales_reason || '')}</textarea>` : `<span style="font-size:0.78rem">${App.escapeHTML(it.sales_reason || '-')}</span>`}
              </td>
              ${canEdit ? `<td style="text-align:center;vertical-align:middle">
                <button class="btn-icon-danger" data-del-approval-item="${it.approval_item_id}" title="ลบ" style="display:inline-flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;padding:0">
                  <lottie-player src="assets/icons8-delete.json" background="transparent" speed="1" style="width:20px;height:20px" hover></lottie-player>
                </button>
              </td>` : ''}
            </tr>`}).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  container.innerHTML = `
    <div class="page-section">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" id="btnBackApprovals" style="gap:6px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          กลับรายการเอกสาร
        </button>
        <div style="display:flex;gap:8px;align-items:center">
          ${isNew ? `<button class="btn" style="background:#10b981;color:#fff;gap:6px" id="btnSaveApprovalDoc">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            สร้างและส่งอนุมัติ
          </button>` : ''}
          ${!isNew && batch?.status === 'pending' ? `
            <button class="btn" style="background:#10b981;color:#fff" id="btnApprove" onclick="window._appHandlers?.approve()">✓ อนุมัติ</button>
            <button class="btn" style="background:#ef4444;color:#fff" id="btnReject" onclick="window._appHandlers?.reject()">✗ ไม่อนุมัติ</button>
          ` : ''}
          ${!isNew ? `<button class="btn btn-outline" style="gap:5px" id="btnPrintApproval" onclick="window._appHandlers?.printDoc()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            🖨️ พิมพ์เอกสาร
          </button>` : ''}
          ${!isNew ? `<button class="btn btn-outline" style="color:#ef4444;border-color:#ef4444;gap:5px" id="btnDeleteBatch" title="ลบเอกสารนี้" onclick="window._appHandlers?.deleteBatch()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            ลบเอกสาร
          </button>` : ''}
        </div>
      </div>

      <div class="card" style="margin-bottom:20px">
        <div class="card-body" style="padding:0">
          ${headerHTML}
        </div>
      </div>

      ${itemsTableHTML}
    </div>
  `;

  // ── Back button (browser history) ──
  document.getElementById('btnBackApprovals')?.addEventListener('click', () => {
    if (window.history.length > 1) { history.back(); } else { location.hash = '#approvals'; }
  });

  // ── Register global handlers for approve/reject/delete (inline onclick) ──
  window._appHandlers = {
    approve: async () => {
      const allCbs = Array.from(document.querySelectorAll('.approve-item-cb'));
      const checkedIds = allCbs.filter(cb => cb.checked).map(cb => parseInt(cb.dataset.approvalItemId));
      const uncheckedIds = allCbs.filter(cb => !cb.checked).map(cb => parseInt(cb.dataset.approvalItemId));
      const totalItems = allCbs.length;

      if (checkedIds.length === 0) {
        App.toast('กรุณาเลือกรายการที่ต้องการอนุมัติ', 'info');
        return;
      }

      const msg = uncheckedIds.length > 0
        ? `อนุมัติ ${checkedIds.length}/${totalItems} รายการ (ไม่อนุมัติ ${uncheckedIds.length} รายการ จะถูกนำออก)`
        : `อนุมัติทั้งหมด ${totalItems} รายการ?`;

      if (!await App.confirmDialog({ title: 'อนุมัติเอกสาร', message: msg, type: 'success', confirmText: `✓ อนุมัติ (${checkedIds.length})` })) return;

      try {
        // Remove unchecked items first
        for (const itemId of uncheckedIds) {
          await App.api('approvals.php', { method: 'DELETE', body: { approval_item_id: itemId } });
        }
        // Approve the batch
        await App.api('approvals.php', { method: 'PUT', body: { id: batch.id, status: 'approved' } });
        App.toast(`อนุมัติ ${checkedIds.length} รายการสำเร็จ`, 'success');
        await Pages.approvalDetail(container, batchId);
      } catch (err) { App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error'); }
    },
    reject: async () => {
      if (!await App.confirmDialog({ title: 'ไม่อนุมัติเอกสาร', message: `ต้องการปฏิเสธเอกสาร ${batch?.batch_number || ''} ?`, type: 'warning', confirmText: '✗ ไม่อนุมัติ' })) return;
      try {
        await App.api('approvals.php', { method: 'PUT', body: { id: batch.id, status: 'rejected' } });
        App.toast('ปฏิเสธสำเร็จ', 'success');
        await Pages.approvalDetail(container, batchId);
      } catch (err) { App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error'); }
    },
    deleteBatch: async () => {
      if (!await App.confirmDialog({ title: 'ลบเอกสาร', message: `ลบเอกสาร ${batch?.batch_number || ''} ทั้งหมด?\nรายการทั้งหมด ${items.length} รายการจะถูกปลดออก\nสามารถนำไปใส่เอกสารใหม่ได้`, type: 'danger', confirmText: '🗑️ ลบเอกสาร' })) return;
      try {
        await App.api('approvals.php?action=delete_batch', { method: 'DELETE', body: { batch_id: batch.id } });
        App.toast('ลบเอกสารสำเร็จ — รายการทั้งหมดพร้อมใช้งานใหม่', 'success');
        location.hash = '#approvals';
      } catch (err) { App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error'); }
    },
    printDoc: () => {
      if (!batch || items.length === 0) {
        App.toast('ไม่มีรายการให้พิมพ์', 'error');
        return;
      }
      // Build warehouse label
      const whCode = batch.batch_type || '';
      const whNames = { '101': 'เคลียร์แรนท์', '102-2': 'ตัวโชว์', '105': 'บริจาค' };
      const whLabel = whNames[whCode] || whCode;
      // Build date label in Thai
      const bDate = batch.batch_date ? new Date(batch.batch_date + 'T00:00:00') : new Date();
      const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
      const monthName = thaiMonths[bDate.getMonth()];
      const buddhistYear = bDate.getFullYear() + 543;
      // Extract batch sequence from batch_number (e.g. A25690063 → try notes or default)
      const batchSeq = batch.notes || '';
      const docTitle = `ขออนุมัติ โอนเข้าคลัง ${whLabel}(${whCode}) ประจำเดือน ${monthName} ${buddhistYear}`;

      const esc = (s) => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

      const totalQty = items.reduce((sum, it) => sum + (parseInt(it.quantity) || 1), 0);

      const printHTML = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>${esc(docTitle)}</title>
  <style>
  @page { size: A4 landscape; margin: 12mm 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cordia New', 'TH SarabunPSK', 'Tahoma', sans-serif; font-size: 14px; color: #000; background: #fff; }
  .print-header { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 8px; }
  .print-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 12px; }
  .print-table th, .print-table td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
  .print-table th { background: #e8e8e8; font-weight: bold; text-align: center; white-space: nowrap; }
  .print-table td.center { text-align: center; }
  .print-table td.num { text-align: center; }
  .total-row { text-align: center; font-weight: bold; margin: 12px 0; font-size: 16px; }
  .signature-section { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 40px; }
  .signature-box { text-align: center; width: 300px; }
  .signature-line { border-top: 1px dotted #000; margin-top: 50px; padding-top: 4px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="print-header">${esc(docTitle)}</div>
  <table class="print-table">
  <thead>
    <tr>
      <th>เลขที่ใบรับคืน</th>
      <th>สาขา/ลูกค้า</th>
      <th>เอกสารคืน</th>
      <th>Class</th>
      <th>รหัสสินค้า</th>
      <th>ชื่อรุ่นสินค้า</th>
      <th>จำนวน</th>
      <th>เหตุผลฝ่ายขาย+ทีมปรับสภาพ</th>
      <th>คลังปลายทาง</th>
      <th>เลขอนุมัติ</th>
    </tr>
  </thead>
  <tbody>
    ${items.map(it => `
    <tr>
      <td>${esc(it.receipt_number || '-')}</td>
      <td>${esc(it.branch_name || '-')}</td>
      <td>${esc(it.return_type || '-')}</td>
      <td class="center">${esc(it.class || '-')}</td>
      <td>${esc(it.good_code || '-')}</td>
      <td>${esc(it.good_name || '-')}</td>
      <td class="num">${parseInt(it.quantity) || 1}</td>
      <td>${esc(it.sales_reason || it.cause_text || '-')}</td>
      <td class="center">${esc(whCode)}</td>
      <td class="center">${esc(batch.batch_number)}</td>
    </tr>`).join('')}
  </tbody>
  </table>
  <div class="total-row">${totalQty}</div>
  <div class="signature-section">
  <div class="signature-box">
    <div class="signature-line">ผู้ตรวจสอบ (แผนกรับคืน)</div>
  </div>
  <div class="signature-box">
    <div class="signature-line">ผู้ตรวจสอบ (แผนกคิวซี)</div>
  </div>
  </div>
</body>
</html>`;

      const printWin = window.open('', '_blank', 'width=1100,height=700');
      printWin.document.write(printHTML);
      printWin.document.close();
      printWin.onload = () => {
        printWin.focus();
        printWin.print();
      };
    }
  };

  // ── Helpers: combo builder (fixed positioning to avoid overflow clipping) ──
  const buildCombo = (input, dropdown, options, onSelect) => {
    let highlighted = -1;
    const positionDropdown = () => {
      const rect = input.getBoundingClientRect();
      dropdown.style.position = 'fixed';
      dropdown.style.left = rect.left + 'px';
      dropdown.style.top = rect.bottom + 'px';
      dropdown.style.width = rect.width + 'px';
      dropdown.style.zIndex = '9999';
      dropdown.style.maxHeight = '200px';
      dropdown.style.overflowY = 'auto';
      dropdown.style.background = 'var(--bg-card, #fff)';
      dropdown.style.border = '1px solid var(--border, #ddd)';
      dropdown.style.borderRadius = '6px';
      dropdown.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    };
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
      positionDropdown();
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
      if (e.key === 'ArrowDown') { e.preventDefault(); highlighted = Math.min(highlighted + 1, items.length - 1); items.forEach((el, i) => el.classList.toggle('highlighted', i === highlighted)); if (items[highlighted]) items[highlighted].scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlighted = Math.max(highlighted - 1, 0); items.forEach((el, i) => el.classList.toggle('highlighted', i === highlighted)); if (items[highlighted]) items[highlighted].scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlighted >= 0 && items[highlighted]) { items[highlighted].dispatchEvent(new Event('mousedown')); }
        else if (items.length === 1) { items[0].dispatchEvent(new Event('mousedown')); }
      }
      else if (e.key === 'Escape') { dropdown.classList.remove('open'); input.blur(); }
    });
    // Move dropdown to body so it's not clipped by overflow:auto parents
    document.body.appendChild(dropdown);
    return { render, setOptions: (newOpts) => { options.length = 0; options.push(...newOpts); } };
  };

  // ── Add editable row (hybrid: receipt → product combo) ──
  const addEditRow = () => {
    const rowIdx = document.querySelectorAll('#appInlineBody tr').length + 1;
    const tr = document.createElement('tr');
    tr.className = 'recon-edit-row';
    tr.innerHTML = `
      <td class="cell-num" style="text-align:center;color:var(--text-muted)">${rowIdx}</td>
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
        <input type="hidden" data-role="recon-id">
      </td>
      <td class="rit-info cell-text" data-role="name">—</td>
      <td class="rit-info cell-text" data-role="warehouse" style="text-align:center;font-size:0.78rem">—</td>
      <td class="rit-info cell-text" data-role="recon-doc" style="text-align:center;font-size:0.78rem;color:var(--text-muted)">—</td>
      <td style="vertical-align:top;padding:4px 6px" data-role="reason-cell">
        <textarea data-role="reason" rows="2" style="width:100%;min-width:180px;font-size:0.78rem;border:1px solid var(--border);border-radius:6px;padding:4px 6px;resize:vertical;font-family:inherit;background:var(--bg-primary)" placeholder="ระบุหมายเหตุ..."></textarea>
      </td>
      <td style="text-align:center;vertical-align:middle">
        <button class="btn-icon-danger app-cancel-row" title="ยกเลิกแถวนี้" style="display:inline-flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;padding:0">
          <lottie-player src="assets/icons8-delete.json" background="transparent" speed="1" style="width:20px;height:20px" hover></lottie-player>
        </button>
      </td>
    `;
    document.getElementById('appInlineBody').appendChild(tr);
    bindEditRow(tr);
    tr.querySelector('[data-role="receipt"]').focus();
  };

  const bindEditRow = (tr) => {
    const receiptInput = tr.querySelector('[data-role="receipt"]');
    const receiptIdHid = tr.querySelector('[data-role="receipt-id"]');
    const receiptDD = tr.querySelector('[data-role="receipt-dropdown"]');
    const productInput = tr.querySelector('[data-role="product-search"]');
    const productHid = tr.querySelector('[data-role="product"]');
    const reconIdHid = tr.querySelector('[data-role="recon-id"]');
    const productDD = tr.querySelector('[data-role="product-dropdown"]');
    const cellName = tr.querySelector('[data-role="name"]');
    const cellBranch = tr.querySelector('[data-role="branch"]');
    const cellRetType = tr.querySelector('[data-role="return-type"]');
    const cellWarehouse = tr.querySelector('[data-role="warehouse"]');
    const cellReconDoc = tr.querySelector('[data-role="recon-doc"]');

    // Receipt combobox — dynamically filter out receipts already selected in other rows
    const getAvailableReceipts = () => {
      // Collect receipt numbers already chosen in OTHER rows
      const usedReceiptNumbers = new Set();
      document.querySelectorAll('#appInlineBody tr').forEach(otherTr => {
        if (otherTr === tr) return;
        const rInput = otherTr.querySelector('[data-role="receipt"]');
        const rIdHid = otherTr.querySelector('[data-role="receipt-id"]');
        // Only count as "used" if the receipt was actually selected (has an ID)
        if (rInput && rIdHid && rIdHid.value) {
          const rn = rInput.value.trim();
          if (rn) usedReceiptNumbers.add(rn);
        }
      });

      // Also collect used recon_ids for partial-receipt filtering
      const usedReconIds = new Set();
      document.querySelectorAll('#appInlineBody tr').forEach(otherTr => {
        if (otherTr === tr) return;
        const rid = otherTr.querySelector('[data-role="recon-id"]')?.value || otherTr.dataset?.reconId;
        if (rid) usedReconIds.add(String(rid));
      });

      return receiptNumbers.filter(n => {
        const receipt = receiptsMap[n];
        // If receipt has recon_ids info, check if ALL items are used
        if (receipt?.recon_ids) {
          const ids = String(receipt.recon_ids).split(',');
          if (ids.every(id => usedReconIds.has(id.trim()))) return false;
        }
        // If this receipt number is already selected in another row, hide it
        // (unless it has multiple items — check via recon_ids)
        if (usedReceiptNumbers.has(n)) {
          // If receipt has multiple recon_ids, keep it if some are still available
          if (receipt?.recon_ids) {
            const ids = String(receipt.recon_ids).split(',');
            return ids.some(id => !usedReconIds.has(id.trim()));
          }
          return false; // single item or no data, hide it
        }
        return true;
      });
    };
    const receiptOptions = getAvailableReceipts().map(n => ({ value: n, label: n, selected: false }));
    const receiptCombo = buildCombo(receiptInput, receiptDD, receiptOptions, async (opt) => {
      const receipt = receiptsMap[opt.value];
      const rid = receipt?.id || '';
      receiptIdHid.value = rid || '';
      if (cellBranch) cellBranch.textContent = receipt?.branch_name || '—';
      if (cellRetType) cellRetType.textContent = receipt?.return_type || '—';
      if (!rid) return;
      productInput.value = '';
      productInput.placeholder = 'กำลังโหลด...';
      productHid.value = '';
      reconIdHid.value = '';
      try {
        const selWarehouse = isNew ? document.getElementById('appWarehouse')?.value : (batch?.batch_type || '');
        const data = await App.api(`approvals.php?action=receipt_items&receipt_id=${rid}${selWarehouse ? '&warehouse=' + encodeURIComponent(selWarehouse) : ''}`);
        const its = data.items || [];
        tr._receiptItems = its;
        if (its.length === 0) {
          productInput.placeholder = 'ไม่มีสินค้าที่รอขออนุมัติ';
          productInput.disabled = true;
          productCombo.setOptions([]);
        } else {
          productInput.disabled = false;
          // Collect already-used recon_ids to filter out duplicates
          const usedReconIds = new Set();
          document.querySelectorAll('#appInlineBody tr').forEach(otherTr => {
            if (otherTr === tr) return;
            const rid = otherTr.querySelector('[data-role="recon-id"]')?.value || otherTr.dataset?.reconId;
            if (rid) usedReconIds.add(String(rid));
          });
          const availableIts = its.filter(it => !usedReconIds.has(String(it.recon_id)));
          const pOpts = availableIts.map(it => ({ value: it.recon_id, label: it.good_code, selected: false, _item: it }));
          productCombo.setOptions(pOpts);
          if (availableIts.length === 0) {
            productInput.placeholder = 'สินค้าทั้งหมดถูกเลือกแล้ว';
            productInput.disabled = true;
          } else if (availableIts.length === 1) {
            productInput.value = pOpts[0].label;
            productHid.value = availableIts[0].good_code;
            reconIdHid.value = availableIts[0].recon_id;
            fillInfo(availableIts[0]);
          } else {
            productInput.placeholder = 'พิมพ์ค้นหาสินค้า...';
            [cellName, cellWarehouse, cellReconDoc].forEach(c => c.textContent = '—');
          }
        }
      } catch {
        productInput.placeholder = 'เกิดข้อผิดพลาด';
      }
    });

    // Refresh receipt options on focus to filter out fully-used receipts
    receiptInput.addEventListener('focus', () => {
      const freshOpts = getAvailableReceipts().map(n => ({ value: n, label: n, selected: false }));
      receiptCombo.setOptions(freshOpts);
    });

    // Product combobox
    const productCombo = buildCombo(productInput, productDD, [], (opt) => {
      const selectedReconId = String(opt.value);
      // ── Duplicate check: prevent selecting same recon_id already in table ──
      const usedReconIds = new Set();
      document.querySelectorAll('#appInlineBody tr').forEach(otherTr => {
        if (otherTr === tr) return; // skip self
        const rid = otherTr.querySelector('[data-role="recon-id"]')?.value || otherTr.dataset?.reconId;
        if (rid) usedReconIds.add(String(rid));
      });
      if (usedReconIds.has(selectedReconId)) {
        App.toast('รายการนี้ถูกเลือกไปแล้วในแถวอื่น', 'error');
        productInput.value = '';
        productHid.value = '';
        reconIdHid.value = '';
        return;
      }
      productHid.value = opt.value;
      reconIdHid.value = opt.value;
      const it = (tr._receiptItems || []).find(x => x.recon_id == opt.value);
      if (it) fillInfo(it);
    });

    const fillInfo = (it) => {
      cellName.textContent = it.good_name || '—';
      cellWarehouse.innerHTML = it.target_warehouse
        ? `<span style="background:rgba(239,68,68,0.1);color:#ef4444;padding:2px 8px;border-radius:8px;font-size:0.78rem">${App.escapeHTML(it.target_warehouse)} ${App.escapeHTML(it.warehouse_name || '')}</span>`
        : '—';
      cellReconDoc.textContent = it.recon_doc_number || it.doc_number || '—';
      // Auto-fill reason with suggestions
      const suggestions = App.getReasonSuggestions(it.target_warehouse, it.return_type || cellRetType?.textContent, it.good_code);
      const reasonTextarea = tr.querySelector('[data-role="reason"]');
      if (reasonTextarea && suggestions.length > 0) {
        reasonTextarea.value = suggestions.join('/');
      }
    };

    tr.querySelector('.app-cancel-row').addEventListener('click', () => tr.remove());
  };

  // ── Bind buttons ──
  document.getElementById('btnAppAddRow')?.addEventListener('click', addEditRow);

  // ── Delegated click handler for reason suggestion pills ──
  document.getElementById('appInlineTable')?.addEventListener('click', (e) => {
    const pill = e.target.closest('.reason-pill');
    if (!pill) return;
    e.preventDefault();
    const reason = pill.dataset.reason;
    const row = pill.closest('tr');
    const textarea = row?.querySelector('[data-role="reason"]');
    if (textarea && reason) {
      const current = textarea.value.trim();
      if (current) {
        // Append with / separator (convention)
        if (!current.includes(reason)) {
          textarea.value = current + '/' + reason;
        }
      } else {
        textarea.value = reason;
      }
      textarea.focus();
    }
  });

  // ── Multi-select modal ──
  document.getElementById('btnAppMultiSelect')?.addEventListener('click', async () => {
    try {
      const selWh = isNew ? document.getElementById('appWarehouse')?.value : batch?.batch_type;
      if (!selWh) {
        App.toast('กรุณาเลือกคลังปลายทางก่อน', 'error');
        document.getElementById('appWarehouse')?.focus();
        return;
      }
      const pendingData = await App.api('approvals.php?pending_items=1');
      const pending = pendingData.items || [];

      // Collect existing recon_ids from the inline table
      const existingIds = new Set();
      document.querySelectorAll('#appInlineBody tr').forEach(tr => {
        // Edit rows use data-role="recon-id" hidden input; saved rows use data-recon-id attribute
        const rid = tr.querySelector('[data-role="recon-id"]')?.value || tr.dataset?.reconId;
        if (rid) existingIds.add(String(rid));
      });

      const matching = selWh ? pending.filter(p => p.target_warehouse === selWh) : pending;
      const allPending = pending;

      const body = `
        <div style="margin-bottom:12px;display:flex;gap:8px;align-items:center">
          <label style="font-size:0.85rem;color:var(--text-secondary)">
            <input type="checkbox" id="showAllPending" style="margin-right:6px">แสดงทุกคลัง (ดูอย่างเดียว)
          </label>
          <span style="color:var(--text-muted);font-size:0.8rem">ตรงคลัง ${selWh || 'ทั้งหมด'}: ${matching.length} | ทั้งหมด: ${allPending.length}</span>
        </div>
        <div style="max-height:400px;overflow-y:auto" id="pendingItemsList">
          ${Pages._renderPendingItems(matching, existingIds, isNew)}
        </div>
      `;
      const footer = `
        <button class="btn btn-outline" onclick="App.closeModal()">ยกเลิก</button>
        <button class="btn btn-primary" id="btnConfirmAdd">เพิ่มรายการที่เลือก</button>
      `;
      App.openModal('เลือกรายการที่ต้องขออนุมัติ', body, footer);

      setTimeout(() => {
        document.getElementById('chkAllPending')?.addEventListener('change', (e) => {
          document.querySelectorAll('.pending-item-chk:not(:disabled)').forEach(c => c.checked = e.target.checked);
        });
      }, 100);

      document.getElementById('showAllPending')?.addEventListener('change', (e) => {
        // When "show all" is checked, render ALL items but non-matching warehouses are disabled
        const itemsToShow = e.target.checked ? allPending : matching;
        const disabledWarehouseSet = selWh ? new Set(allPending.filter(p => p.target_warehouse !== selWh).map(p => String(p.recon_id))) : new Set();
        document.getElementById('pendingItemsList').innerHTML = Pages._renderPendingItems(itemsToShow, existingIds, isNew, disabledWarehouseSet);
        setTimeout(() => {
          document.getElementById('chkAllPending')?.addEventListener('change', (ev) => {
            document.querySelectorAll('.pending-item-chk:not(:disabled)').forEach(c => c.checked = ev.target.checked);
          });
        }, 50);
      });

      document.getElementById('btnConfirmAdd')?.addEventListener('click', async () => {
        const checked = document.querySelectorAll('.pending-item-chk:checked');
        // _renderPendingItems columns: [0]=checkbox, [1]=เลขที่ปรับ, [2]=ใบรับคืน, [3]=รหัส, [4]=ชื่อสินค้า, [5]=คลัง
        const selected = Array.from(checked).map(c => {
          const tr = c.closest('tr');
          const reconId = parseInt(c.value);
          // Find the full item data from pending array to get branch_name, return_type
          const fullItem = pending.find(p => p.recon_id == reconId) || {};
          return {
            recon_id: reconId,
            recon_doc_number: tr?.children[1]?.textContent?.trim() || '',
            receipt_number: tr?.children[2]?.textContent?.trim() || '',
            good_code: tr?.children[3]?.textContent?.trim() || '',
            good_name: (tr?.children[4]?.textContent?.trim() || '').replace(/\u2713.*$/, '').trim(),
            target_warehouse: fullItem.target_warehouse || '',
            item_class: fullItem.class || '',
            branch_name: fullItem.branch_name || '',
            return_type: fullItem.return_type || ''
          };
        });
        if (selected.length === 0) { App.toast('กรุณาเลือกรายการ', 'error'); return; }

        // Validate warehouse match
        if (selWh) {
          const mismatch = selected.filter(s => s.target_warehouse && s.target_warehouse !== selWh);
          if (mismatch.length > 0) {
            App.toast(`ไม่สามารถเพิ่มรายการที่คลังไม่ตรงกับหัวเอกสาร (${selWh})`, 'error');
            return;
          }
        }

        if (!isNew && batchId) {
          // Detail mode: add items via API
          try {
            await App.api('approvals.php?action=add_items', { method: 'POST', body: { batch_id: batch.id, recon_ids: selected.map(s => s.recon_id) } });
            App.toast(`เพิ่ม ${selected.length} รายการสำเร็จ`, 'success');
            App.closeModal();
            await Pages.approvalDetail(container, batchId);
          } catch (err) { App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error'); }
        } else {
          // Create mode: add as saved rows in the table
          const tbody = document.getElementById('appInlineBody');
          selected.forEach(s => {
            const rowIdx = tbody.querySelectorAll('tr').length + 1;
            const tr = document.createElement('tr');
            tr.className = 'recon-saved-row';
            tr.dataset.reconId = s.recon_id;
            const multiReasonSuggestions = App.getReasonSuggestions(s.target_warehouse, s.return_type, s.good_code);
            tr.innerHTML = `
              <td class="cell-num" style="text-align:center">${rowIdx}</td>
              <td><span class="cell-badge">${App.escapeHTML(s.receipt_number)}</span></td>
              <td style="font-size:0.78rem">${App.escapeHTML(s.branch_name || '-')}</td>
              <td style="font-size:0.78rem">${App.escapeHTML(s.return_type || '-')}</td>
              <td><span class="cell-badge">${App.escapeHTML(s.good_code)}</span></td>
              <td style="font-size:0.82rem">${App.escapeHTML(s.good_name)}</td>
              <td style="text-align:center;font-size:0.78rem;font-weight:500">${App.escapeHTML(s.item_class || '-')}</td>
              <td style="text-align:center"><span style="background:rgba(239,68,68,0.1);color:#ef4444;padding:2px 8px;border-radius:8px;font-size:0.78rem">${App.escapeHTML(s.target_warehouse)}</span></td>
              <td style="text-align:center;font-size:0.78rem;color:var(--text-muted)">${App.escapeHTML(s.recon_doc_number || s.doc_number || '-')}</td>
              <td style="vertical-align:top;padding:4px 6px">
                <textarea data-role="reason" rows="2" style="width:100%;min-width:180px;font-size:0.78rem;border:1px solid var(--border);border-radius:6px;padding:4px 6px;resize:vertical;font-family:inherit;background:var(--bg-primary)" placeholder="ระบุหมายเหตุ...">${App.escapeHTML(multiReasonSuggestions.join('/'))}</textarea>
              </td>
              <td style="text-align:center;vertical-align:middle">
                <button class="btn-icon-danger" title="ลบ" style="display:inline-flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;padding:0"
                  onclick="this.closest('tr').remove()">
                  <lottie-player src="assets/icons8-delete.json" background="transparent" speed="1" style="width:20px;height:20px" hover></lottie-player>
                </button>
              </td>
            `;
            tbody.appendChild(tr);
          });
          App.toast(`เพิ่ม ${selected.length} รายการ`, 'success');
          App.closeModal();
        }
      });
    } catch (err) { App.toast('ไม่สามารถโหลดรายการได้: ' + err.message, 'error'); }
  });

  // ── New: Auto-generate doc number ──
  if (isNew) {
    document.getElementById('btnAutoAppNumber')?.addEventListener('click', async () => {
      try {
        const data = await App.api('approvals.php?action=next_number');
        document.getElementById('appDocNumber').value = data.next_number;
        App.toast('สร้างเลขอัตโนมัติ: ' + data.next_number, 'success');
      } catch (err) {
        App.toast('ไม่สามารถสร้างเลขอัตโนมัติได้', 'error');
      }
    });

    // When warehouse changes, re-fetch receipt list filtered by new warehouse
    document.getElementById('appWarehouse')?.addEventListener('change', async (e) => {
      const wh = e.target.value;
      try {
        const rlUrl = 'approvals.php?action=receipt_list' + (wh ? `&warehouse=${encodeURIComponent(wh)}` : '');
        const rlData = await App.api(rlUrl);
        receiptList = rlData.receipts || [];
        // Rebuild receipt lookup
        Object.keys(receiptsMap).forEach(k => delete receiptsMap[k]);
        receiptNumbers.length = 0;
        receiptList.forEach(r => {
          receiptsMap[r.receipt_number] = r;
          receiptNumbers.push(r.receipt_number);
        });
        // Clear existing edit rows (their options are stale)
        document.querySelectorAll('#appInlineBody tr.recon-edit-row').forEach(tr => tr.remove());
        App.toast(`โหลดใบรับคืนสำหรับคลัง ${wh} (${receiptList.length} ใบ)`, 'info');
      } catch (err) { console.warn('Failed to reload receipt list', err); }
    });

    // Save document + items
    document.getElementById('btnSaveApprovalDoc')?.addEventListener('click', async () => {
      const docNumber = document.getElementById('appDocNumber').value.trim();
      const docDate = document.getElementById('appDocDate').value;
      const warehouse = document.getElementById('appWarehouse').value;
      const notes = document.getElementById('appNotes').value.trim();

      if (!docNumber || !warehouse) {
        App.toast('กรุณากรอกเลขที่เอกสารและเลือกคลัง', 'error');
        return;
      }

      // Collect recon_ids and per-item reasons
      const reconIds = [];
      const reasons = {};
      document.querySelectorAll('#appInlineBody tr').forEach(tr => {
        let rid = tr.dataset.reconId;
        if (!rid) {
          rid = tr.querySelector('[data-role="recon-id"]')?.value;
        }
        if (rid) {
          reconIds.push(parseInt(rid));
          const reasonEl = tr.querySelector('[data-role="reason"]');
          if (reasonEl) reasons[rid] = reasonEl.value.trim();
        }
      });

      // Validate: require reason for all items
      const missingReasons = reconIds.filter(rid => !reasons[rid]);
      if (missingReasons.length > 0) {
        App.toast(`กรุณาใส่หมายเหตุให้ครบทุกรายการ (ยังขาด ${missingReasons.length} รายการ)`, 'error');
        const firstEmpty = document.querySelector('#appInlineBody tr [data-role="reason"]');
        if (firstEmpty && !firstEmpty.value.trim()) firstEmpty.focus();
        return;
      }

      // Validate: no duplicate recon_ids
      const uniqueIds = [...new Set(reconIds)];
      if (uniqueIds.length < reconIds.length) {
        App.toast(`พบรายการซ้ำ ${reconIds.length - uniqueIds.length} รายการ กรุณาลบรายการที่ซ้ำออก`, 'error');
        return;
      }

      try {
        const result = await App.api('approvals.php', {
          method: 'POST',
          body: {
            batch_number: docNumber,
            batch_type: warehouse,
            batch_date: docDate,
            notes: notes || null,
            recon_ids: reconIds,
            reasons: reasons
          }
        });
        App.toast(`สร้างเอกสารสำเร็จ${reconIds.length > 0 ? ` พร้อมเพิ่ม ${reconIds.length} รายการ` : ''}`, 'success');
        location.hash = '#approvals';
      } catch (err) {
        App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      }
    });
    return;
  }

  // ── Detail mode handlers ──
  if (canEdit) {
    // Submit for approval
    document.getElementById('btnSubmitApproval')?.addEventListener('click', async () => {
      if (items.length === 0) { App.toast('ต้องมีรายการอย่างน้อย 1 รายการ', 'error'); return; }
      if (!await App.confirmDialog({ title: 'ส่งขออนุมัติ', message: 'ส่งเอกสารนี้เพื่อขออนุมัติ?', type: 'info', confirmText: 'ส่งขออนุมัติ' })) return;
      try {
        await App.api('approvals.php', { method: 'PUT', body: { id: batch.id, status: 'pending' } });
        App.toast('ส่งขออนุมัติสำเร็จ', 'success');
        location.hash = '#approvals';
      } catch (err) { App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error'); }
    });

    // Delete items
    container.querySelectorAll('[data-del-approval-item]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!await App.confirmDialog({ title: 'ลบรายการ', message: 'ต้องการลบรายการนี้?', type: 'danger', confirmText: 'ลบ' })) return;
        try {
          await App.api('approvals.php', { method: 'DELETE', body: { approval_item_id: parseInt(btn.dataset.delApprovalItem) } });
          App.toast('ลบรายการสำเร็จ', 'success');
          await Pages.approvalDetail(container, batchId);
        } catch (err) { App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error'); }
      });
    });
  }

  // Approve / Reject — handlers registered via window._appHandlers above
};
Pages._renderPendingItems = function(items, existingIds = new Set(), isNewDoc = false, disabledWarehouseSet = new Set()) {
  // For new docs: completely filter out already-added items
  // For existing docs: keep them but show as disabled
  const displayItems = isNewDoc ? items.filter(p => !existingIds.has(String(p.recon_id))) : items;
  if (displayItems.length === 0) {
    return '<div style="text-align:center;padding:24px;color:var(--text-muted)">ไม่มีรายการที่ต้องขออนุมัติ</div>';
  }
  return `
    <table class="data-table" style="font-size:0.82rem">
      <thead>
        <tr><th style="width:30px"><input type="checkbox" id="chkAllPending"></th><th>เลขที่ปรับ</th><th>ใบรับคืน</th><th>รหัส</th><th>ชื่อสินค้า</th><th>คลาส</th><th>คลัง</th></tr>
      </thead>
      <tbody>
        ${displayItems.map(p => {
          const isDup = existingIds.has(String(p.recon_id));
          const isWhMismatch = disabledWarehouseSet.has(String(p.recon_id));
          const isDisabled = isDup || isWhMismatch;
          let badge = '';
          if (isDup) badge = ' <span style="color:#f59e0b;font-size:0.72rem;font-weight:600">✓ อยู่ในรายการแล้ว</span>';
          else if (isWhMismatch) badge = ' <span style="color:#f59e0b;font-size:0.72rem;font-weight:600">⚠ คลังไม่ตรง</span>';
          return `
          <tr style="${isDisabled ? 'opacity:0.45;background:var(--bg-body,#f5f5f5)' : ''}">
            <td><input type="checkbox" class="pending-item-chk" value="${p.recon_id}" ${isDisabled ? 'disabled title="' + (isDup ? 'อยู่ในรายการแล้ว' : 'คลังปลายทางไม่ตรงกับหัวเอกสาร') + '"' : ''}></td>
            <td>${App.escapeHTML(p.doc_number || '-')}</td>
            <td>${App.escapeHTML(p.receipt_number || '-')}</td>
            <td style="font-weight:600">${App.escapeHTML(p.good_code || '-')}</td>
            <td>${App.escapeHTML(p.good_name || '-')}${badge}</td>
            <td style="font-size:0.78rem">${App.escapeHTML(p.class || '-')}</td>
            <td><span style="background:rgba(239,68,68,0.1);color:#ef4444;padding:1px 6px;border-radius:6px;font-size:0.75rem">${App.escapeHTML(p.target_warehouse || '')} ${App.escapeHTML(p.warehouse_name || '')}</span></td>
          </tr>
        `;
        }).join('')}
      </tbody>
    </table>
  `;
};

