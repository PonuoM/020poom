/* ============================================
   ReconSystem — Main Application
   ============================================ */

/* ── Auth Module ────────────────────────────── */
const Auth = {
  user: null,

  async init() {
    // Check if already logged in
    try {
      const res = await fetch('api/auth.php?action=me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        Auth.user = data.user;
        Auth.showApp();
        return;
      }
    } catch (e) { /* not logged in */ }
    Auth.showLogin();
  },

  showLogin() {
    const overlay = document.getElementById('loginOverlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('visible');
    document.getElementById('appContainer').style.display = 'none';
    Auth.bindLoginForm();
  },

  showApp(showSuccess = false) {
    if (showSuccess) {
      // Show success animation overlay
      const overlay = document.createElement('div');
      overlay.className = 'login-success-overlay';
      overlay.innerHTML = `
        <lottie-player src="assets/Success.json" background="transparent" speed="1" autoplay style="width:160px;height:160px"></lottie-player>
        <div class="success-text">เข้าสู่ระบบสำเร็จ!</div>
      `;
      document.body.appendChild(overlay);
      document.getElementById('loginOverlay').classList.add('hidden');

      setTimeout(() => {
        overlay.style.transition = 'opacity 0.4s ease';
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.remove();
          document.getElementById('appContainer').style.display = '';
          // Update user display
          if (Auth.user) {
            document.getElementById('userDisplayName').textContent = Auth.user.display_name;
            document.getElementById('userAvatar').textContent = (Auth.user.display_name || 'U')[0].toUpperCase();
          }
          document.getElementById('btnLogout').onclick = () => Auth.logout();
          App.init();
        }, 400);
      }, 1800);
      return;
    }

    // Normal show (page reload with existing session)
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('appContainer').style.display = '';
    // Update user display
    if (Auth.user) {
      document.getElementById('userDisplayName').textContent = Auth.user.display_name;
      document.getElementById('userAvatar').textContent = (Auth.user.display_name || 'U')[0].toUpperCase();
    }
    // Bind logout
    document.getElementById('btnLogout').onclick = () => Auth.logout();
    // Init the main app
    App.init();
  },

  bindLoginForm() {
    const form = document.getElementById('loginForm');
    const errorEl = document.getElementById('loginError');

    form.onsubmit = async (e) => {
      e.preventDefault();
      errorEl.textContent = '';
      const btn = document.getElementById('loginBtn');
      btn.disabled = true;
      btn.textContent = 'กำลังเข้าสู่ระบบ...';

      try {
        const res = await fetch('api/auth.php?action=login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: document.getElementById('loginUsername').value.trim(),
            password: document.getElementById('loginPassword').value,
          })
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          errorEl.textContent = data.message || 'เข้าสู่ระบบไม่สำเร็จ';
          btn.disabled = false;
          btn.textContent = 'เข้าสู่ระบบ';
          return;
        }

        Auth.user = data.user;
        Auth.showApp(true);
      } catch (err) {
        errorEl.textContent = 'เกิดข้อผิดพลาด: ' + err.message;
        btn.disabled = false;
        btn.textContent = 'เข้าสู่ระบบ';
      }
    };
  },

  async logout() {
    try {
      await fetch('api/auth.php?action=logout', { method: 'POST' });
    } catch (e) { /* ok */ }
    Auth.user = null;
    location.reload();
  }
};

// Start auth check on page load
document.addEventListener('DOMContentLoaded', () => Auth.init());

const App = {
  currentPage: 'dashboard',
  API_BASE: 'api',

  // ── Initialization ─────────────────────────
  init() {
    this.bindNav();
    this.bindModal();
    this.bindMobileMenu();
    this.bindSidebarToggle();
    this.bindThemeToggle();
    this.updateDate();
    this.handleHash();
    window.addEventListener('hashchange', () => this.handleHash());
    // Initialize tutorial system
    if (typeof Tutorial !== 'undefined') Tutorial.init();
  },

  handleHash() {
    const hash = location.hash.replace('#', '') || 'dashboard';
    this.navigateTo(hash);
  },

  // Scroll position store for back-navigation
  _scrollPositions: {},

  navigateTo(page) {
    // Save scroll position of current page before navigating away
    if (this.currentPage) {
      this._scrollPositions[this.currentPage] = window.scrollY;
    }

    this.currentPage = page;
    const basePage = page.split('/')[0];

    // Update nav highlight
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === basePage);
    });
    // Update nav-group active & auto-open
    document.querySelectorAll('.nav-group').forEach(group => {
      const hasActive = group.querySelector('.nav-item.active') !== null;
      group.classList.toggle('has-active', hasActive);
      if (hasActive && !group.classList.contains('open')) {
        group.classList.add('open');
      }
    });
    // Update title
    const titles = {
      dashboard: 'Dashboard',
      returns: 'รับคืนสินค้า',
      inspection: 'ตรวจสอบสินค้า',
      reconditioning: 'ปรับสภาพ',
      masterRecon: 'รายการรวม',
      approvals: 'รอขออนุมัติ',
      'approval-rounds': 'เอกสารขออนุมัติ',
      transfers: 'รอโอน',
      'transfers-done': 'โอนแล้ว',
      products: 'สินค้า',
      settings: 'ตั้งค่า'
    };
    document.getElementById('pageTitle').textContent = titles[basePage] || basePage;
    // Notify tutorial system of page change
    if (typeof Tutorial !== 'undefined') Tutorial.onPageChange(basePage);
    // Render page
    this.renderPage(page);
  },

  // ── Render Pages ───────────────────────────
  async renderPage(page) {
    const container = document.getElementById('pageContainer');
    container.innerHTML = '<div class="spinner"></div>';
    container.style.animation = 'none';
    container.offsetHeight; // reflow
    container.style.animation = '';

    const parts = page.split('/');
    const basePage = parts[0];
    const subId = parts[1] || null;

    try {
      switch (basePage) {
        case 'dashboard':      await Pages.dashboard(container); break;
        case 'returns':
          if (subId === 'new') {
            await Pages.returnCreate(container);
          } else if (subId) {
            await Pages.returnDetail(container, subId);
          } else {
            await Pages.returns(container);
            // Restore scroll position
            const saved = this._scrollPositions['returns'];
            if (saved) { setTimeout(() => window.scrollTo(0, saved), 50); }
          }
          break;
        case 'inspection':     await Pages.inspection(container); break;
        case 'reconditioning':
          if (subId === 'new') {
            await Pages.reconDetail(container, null);
          } else if (subId) {
            await Pages.reconDetail(container, subId);
          } else {
            await Pages.reconditioning(container);
            const savedRecon = this._scrollPositions['reconditioning'];
            if (savedRecon) { setTimeout(() => window.scrollTo(0, savedRecon), 50); }
          }
          break;
        case 'approvals':
          if (subId === 'new') {
            await Pages.approvalDetail(container, null);
          } else if (subId) {
            await Pages.approvalDetail(container, subId);
          } else {
            await Pages.approvals(container);
            const savedApp = this._scrollPositions['approvals'];
            if (savedApp) { setTimeout(() => window.scrollTo(0, savedApp), 50); }
          }
          break;
        case 'approval-rounds':
          if (parts[1] && parts[2]) {
            await Pages.approvalRoundDetail(container, decodeURIComponent(parts[1]), parts[2]);
          } else {
            await Pages.approvalRounds(container);
          }
          break;
        case 'masterRecon':    await Pages.masterRecon(container); break;
        case 'transfers':      await Pages.transfersPending(container); break;
        case 'transfers-done': await Pages.transfersDone(container); break;
        case 'products':       await Pages.products(container); break;
        case 'settings':       await Pages.settings(container); break;
        default:
          container.innerHTML = `<div class="empty-state"><h3>ไม่พบหน้า</h3></div>`;
      }
    } catch (err) {
      console.error(err);
      container.innerHTML = `<div class="empty-state"><h3>เกิดข้อผิดพลาด</h3><p>${err.message}</p></div>`;
    }
  },

  // ── Navigation ─────────────────────────────
  bindNav() {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const page = el.dataset.page;
        location.hash = page;
      });
    });
  },

  bindMobileMenu() {
    const btn = document.getElementById('mobileToggle');
    const sidebar = document.getElementById('sidebar');
    if (btn) {
      btn.addEventListener('click', () => sidebar.classList.toggle('open'));
    }
    // Close on nav click (mobile)
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => sidebar.classList.remove('open'));
    });
  },

  // ── Sidebar Toggle (Collapsible) ───────────
  bindSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const logo = sidebar.querySelector('.logo');

    // Restore saved state
    if (localStorage.getItem('sidebar-collapsed') === '1') {
      sidebar.classList.add('collapsed');
    }

    // Toggle button click
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed') ? '1' : '0');
      });
    }

    // Click logo to expand when collapsed
    if (logo) {
      logo.addEventListener('click', () => {
        if (sidebar.classList.contains('collapsed')) {
          sidebar.classList.remove('collapsed');
          localStorage.setItem('sidebar-collapsed', '0');
        }
      });
    }

    // ── Nav Group Toggle ──
    document.querySelectorAll('.nav-group-header').forEach(header => {
      header.addEventListener('click', () => {
        // If sidebar is collapsed, expand first
        if (sidebar.classList.contains('collapsed')) {
          sidebar.classList.remove('collapsed');
          localStorage.setItem('sidebar-collapsed', '0');
          // After expanding, open this group
          setTimeout(() => {
            header.parentElement.classList.add('open');
            this._saveGroupStates();
          }, 50);
          return;
        }
        header.parentElement.classList.toggle('open');
        this._saveGroupStates();
      });
    });

    // Restore group open states
    try {
      const saved = JSON.parse(localStorage.getItem('nav-group-states') || '{}');
      document.querySelectorAll('.nav-group').forEach(g => {
        const key = g.dataset.group;
        if (saved[key]) g.classList.add('open');
      });
    } catch(e) {}

    // Click any icon in collapsed sidebar → expand sidebar
    sidebar.addEventListener('click', (e) => {
      if (!sidebar.classList.contains('collapsed')) return;
      const navItem = e.target.closest('.nav-item:not(.nav-sub-item)');
      if (navItem) return; // let normal nav items navigate
      const clickedIcon = e.target.closest('.nav-group-header');
      if (clickedIcon) return; // handled above
    });
  },

  _saveGroupStates() {
    const states = {};
    document.querySelectorAll('.nav-group').forEach(g => {
      states[g.dataset.group] = g.classList.contains('open');
    });
    localStorage.setItem('nav-group-states', JSON.stringify(states));
  },

  // ── Theme Toggle (Dark / Light) ────────────
  bindThemeToggle() {
    const toggleBtn = document.getElementById('themeToggle');
    const html = document.documentElement;

    // Restore saved theme
    const saved = localStorage.getItem('theme') || 'dark';
    if (saved === 'light') {
      html.setAttribute('data-theme', 'light');
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const isDark = !html.hasAttribute('data-theme') || html.getAttribute('data-theme') === 'dark';
        if (isDark) {
          html.setAttribute('data-theme', 'light');
          localStorage.setItem('theme', 'light');
        } else {
          html.removeAttribute('data-theme');
          localStorage.setItem('theme', 'dark');
        }
      });
    }
  },

  // ── Modal ──────────────────────────────────
  bindModal() {
    const overlay = document.getElementById('modalOverlay');
    const closeBtn = document.getElementById('modalClose');
    closeBtn.addEventListener('click', () => this.closeModal());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeModal();
    });
  },

  openModal(title, bodyHTML, footerHTML = '') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modalFooter').innerHTML = footerHTML;
    document.getElementById('modalOverlay').classList.add('show');
  },

  closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
  },

  // ── Custom Confirm Dialog (replaces native confirm) ──
  confirmDialog({ title = 'ยืนยันการดำเนินการ', message = '', type = 'info', confirmText = 'ยืนยัน', cancelText = 'ยกเลิก' } = {}) {
    return new Promise((resolve) => {
      const icons = { danger: '🗑️', warning: '⚠️', success: '✓', info: 'ℹ️' };
      const overlay = document.getElementById('confirmOverlay');
      const iconEl = document.getElementById('confirmIcon');
      const titleEl = document.getElementById('confirmTitle');
      const msgEl = document.getElementById('confirmMessage');
      const okBtn = document.getElementById('confirmOk');
      const cancelBtn = document.getElementById('confirmCancel');

      iconEl.className = 'confirm-icon ' + type;
      iconEl.textContent = icons[type] || 'ℹ️';
      titleEl.textContent = title;
      msgEl.textContent = message;
      okBtn.className = 'btn confirm-btn-ok ' + type;
      okBtn.textContent = confirmText;
      cancelBtn.textContent = cancelText;

      const cleanup = (result) => {
        overlay.classList.remove('show');
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        overlay.onclick = null;
        resolve(result);
      };

      okBtn.onclick = () => cleanup(true);
      cancelBtn.onclick = () => cleanup(false);
      overlay.onclick = (e) => { if (e.target === overlay) cleanup(false); };

      overlay.classList.add('show');
      okBtn.focus();
    });
  },

  // ── Toast ──────────────────────────────────
  toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // ── Date Display ───────────────────────────
  updateDate() {
    const d = new Date();
    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dateDisplay').textContent = d.toLocaleDateString('th-TH', opts);
  },

  // ── API Helper ─────────────────────────────
  async api(endpoint, options = {}) {
    const url = `${this.API_BASE}/${endpoint}`;
    // Auto-stringify body if it's an object (not already a string)
    if (options.body && typeof options.body !== 'string') {
      options.body = JSON.stringify(options.body);
    }
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'API Error');
    return data;
  },

  // ── Status Helpers ─────────────────────────
  statusBadge(status) {
    const labels = {
      received: 'รับคืนแล้ว',
      inspecting: 'กำลังตรวจ',
      waiting_parts: 'รออะไหล่',
      reconditioning: 'กำลังปรับ',
      completed: 'เสร็จแล้ว',
      shipped: 'ส่งคลังแล้ว',
      draft: 'ฉบับร่าง',
      pending: 'รออนุมัติ',
      approved: 'อนุมัติแล้ว',
      rejected: 'ไม่อนุมัติ'
    };
    return `<span class="badge badge-${status}">${labels[status] || status}</span>`;
  },

  escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  /**
   * Smart-suggest approval reasons based on context
   * @param {string} warehouse - target warehouse code (101, 102-2, 105, etc.)
   * @param {string} returnType - ประเภทการรับคืน
   * @param {string} goodCode - product good_code (for product-type detection)
   * @returns {string[]} array of suggested reason strings
   */
  getReasonSuggestions(warehouse, returnType, goodCode) {
    const wh = (warehouse || '').trim();
    const rt = (returnType || '').trim();
    const isShowType = /โชว์|เบิกเปลี่ยนตัวโชว์/.test(rt);
    const isClearance = /เคลียแร้น|เคลียร์แรนท์/.test(rt);
    const isCredit = /เครดิต/.test(rt);
    // Classes D and MD are "demo/display" stock
    const isClassDMD = /^(D|MD)$/i.test(wh) || false;

    // เบิกเปลี่ยนตัวเครดิต → must be described specifically, no preset
    if (isCredit) {
      return [];
    }

    if (wh === '101') {
      if (isShowType && isClassDMD) {
        // Class D/MD + โชว์ → 101
        return ['สภาพโชว์ อุปกรณ์ครบ', 'สภาพเก่า', 'เปลี่ยนคลาส'];
      }
      if (isShowType) {
        // Class A/B + โชว์ → 101
        return ['สภาพโชว์ อุปกรณ์ครบ', 'สภาพเก่า', 'ไม่สามารถโชว์ต่อได้'];
      }
      if (isClearance) {
        return ['รับคืนสินค้าเคลียแร้นท์อุปกรณ์ครบ', 'สภาพโชว์ อุปกรณ์ครบ'];
      }
      // General 101
      return ['สภาพโชว์ อุปกรณ์ครบ', 'สภาพเก่า', 'หลุด POG อุปกรณ์ครบ'];
    }

    if (wh === '102-2') {
      return ['สภาพโชว์ อุปกรณ์ครบ', 'สภาพเก่า', 'เปลี่ยนหน้า อุปกรณ์ครบ'];
    }

    if (wh === '105') {
      return ['สภาพเก่า', 'ไม่สามารถขายได้', 'ไม่สามารถโชว์ต่อได้'];
    }

    // Default
    if (isShowType) {
      return ['สภาพโชว์ อุปกรณ์ครบ', 'สภาพเก่า'];
    }

    return ['อุปกรณ์ครบ'];
  }
};

/* ============================================
   PAGES
   ============================================ */
const Pages = {

  // ── Dashboard ──────────────────────────────
  async dashboard(container) {
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
  },

  // ── Returns (รับคืนสินค้า) ─────────────────
  _returnsData: [],
  _retPage: 1,
  _retPerPage: 50,
  _inspectPending: {},
  _retFilters: { search: '', types: [], completion: '', inspection: '', dateFrom: null, dateTo: null },
  _retViewMode: 'docs',
  _retAllItems: [],

  async returns(container) {
    try {
      const data = await App.api('returns.php');
      Pages._returnsData = data.items || [];
    } catch (e) { console.warn('Returns API:', e); Pages._returnsData = []; }

    Pages._retPage = 1;
    Pages._retViewMode = localStorage.getItem('retViewMode') || 'docs';
    Pages._retAllItems = [];
    Pages._retFilters = { search: '', types: [], completion: '', inspection: '', dateFrom: null, dateTo: null };
    Pages._retRenderView(container);
  },

  _getFilteredReturns() {
    const f = Pages._retFilters;
    return Pages._returnsData.filter(r => {
      if (f.search) { const q = f.search.toLowerCase(); if (![r.receipt_number, r.branch_name, r.return_type, r.return_date].join(' ').toLowerCase().includes(q)) return false; }
      if (f.types.length > 0 && !f.types.includes(r.return_type || '')) return false;
      if (f.completion) {
        const filled = parseInt(r.filled_count) || 0, total = parseInt(r.item_count) || 0;
        const isComplete = total > 0 && filled === total;
        if (f.completion === 'complete' && !isComplete) return false;
        if (f.completion === 'incomplete' && isComplete) return false;
      }
      if (f.inspection) {
        const tot = parseInt(r.item_count) || 0, confirmed = parseInt(r.confirmed_count) || 0;
        const allConfirmed = tot > 0 && confirmed === tot;
        if (f.inspection === 'checked' && !allConfirmed) return false;
        if (f.inspection === 'unchecked' && allConfirmed) return false;
        if (f.inspection === 'partial' && (confirmed === 0 || allConfirmed)) return false;
      }
      if (f.dateFrom && f.dateTo) { if (r.return_date < f.dateFrom || r.return_date > f.dateTo) return false; }
      return true;
    });
  },

  async _retRenderView(container) {
    const f = Pages._retFilters;
    const vm = Pages._retViewMode;
    const hasFilter = !!(f.search || f.types.length > 0 || f.completion || f.inspection || (f.dateFrom && f.dateTo));
    const types = [...new Set(Pages._returnsData.map(r => r.return_type).filter(Boolean))];

    // Date label
    let dateLabel = 'วันที่: ทั้งหมด';
    if (f.dateFrom && f.dateTo) {
      const today = new Date().toISOString().slice(0, 10);
      const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (f.dateFrom === f.dateTo) dateLabel = f.dateFrom === today ? 'วันที่: วันนี้' : f.dateFrom === yest ? 'วันที่: เมื่อวาน' : `วันที่: ${f.dateFrom}`;
      else dateLabel = `วันที่: ${f.dateFrom} — ${f.dateTo}`;
    }
    const typeLabel = f.types.length === 0 ? 'ประเภท: ทั้งหมด' : `ประเภท: ${f.types.length} รายการ`;

    // Toggle button styles
    const activeStyle = 'background:var(--gradient-blue);color:#fff;border:1px solid transparent;font-weight:600';
    const inactiveStyle = 'background:transparent;color:var(--text-secondary);border:1px solid var(--border-color)';


    container.innerHTML = `
      <div class="filter-toolbar">
        <div class="filter-row">
          <!-- Settings Advanced button -->
          <button class="btn-settings-adv" id="btnSettingsAdv">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            ตัวกรองขั้นสูง
            ${hasFilter ? '<span class="filter-dot"></span>' : ''}
          </button>

          <!-- Clear filters (shown when active) -->
          <button class="btn btn-outline btn-sm filter-clear-btn" id="btnClearFilters" title="ล้างตัวกรองทั้งหมด" style="${hasFilter ? '' : 'display:none'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ล้างตัวกรอง
          </button>

          <div style="display:flex;gap:8px;align-items:center;margin-left:auto">
            <div style="display:inline-flex;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.12)">
              <button class="retViewToggle" data-view="docs" style="${vm==='docs' ? activeStyle : inactiveStyle};padding:5px 14px;font-size:0.78rem;cursor:pointer;border-radius:8px 0 0 8px;transition:all .2s">📄 เอกสาร</button>
              <button class="retViewToggle" data-view="items" style="${vm==='items' ? activeStyle : inactiveStyle};padding:5px 14px;font-size:0.78rem;cursor:pointer;border-radius:0 8px 8px 0;transition:all .2s">📦 รายการสินค้า</button>
            </div>
            <span style="font-size:0.82rem;color:var(--text-muted)" id="retTotalCount"></span>
            <button class="btn btn-outline btn-sm" id="btnBulkImport">📥 Import</button>
            <button class="btn btn-primary btn-sm" id="btnAddReturn" style="gap:4px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              เพิ่มใบรับคืน
            </button>
          </div>
        </div>
      </div>

      <!-- Glass Filter Modal -->
      <div class="glass-overlay" id="retFilterOverlay">
        <div class="glass-modal">
          <div class="glass-modal-header">
            <div class="glass-modal-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              ตัวกรองขั้นสูง
            </div>
            <button class="glass-modal-close" id="btnCloseFilter">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Search -->
          <div class="glass-filter-group">
            <label class="glass-filter-label">🔍 ค้นหา</label>
            <input type="text" class="glass-filter-input" id="gfSearch" placeholder="ค้นหาเลขที่, สินค้า, สาขา..." value="${App.escapeHTML(f.search)}">
          </div>

          <!-- Date -->
          <div class="glass-filter-group">
            <label class="glass-filter-label">📅 วันที่</label>
            <div class="glass-preset-chips" id="gfDateChips">
              <span class="glass-chip${!f.dateFrom ? ' active' : ''}" data-preset="all">ทั้งหมด</span>
              <span class="glass-chip" data-preset="today">วันนี้</span>
              <span class="glass-chip" data-preset="yesterday">เมื่อวาน</span>
              <span class="glass-chip" data-preset="7days">7 วัน</span>
              <span class="glass-chip" data-preset="thisMonth">เดือนนี้</span>
              <span class="glass-chip" data-preset="lastMonth">เดือนที่แล้ว</span>
              <span class="glass-chip" data-preset="custom">กำหนดเอง</span>
            </div>
            <div class="glass-date-row" id="gfCustomDate" style="display:none">
              <label>จาก</label>
              <input type="date" class="glass-filter-input" id="gfDateFrom" value="${f.dateFrom || ''}" style="flex:1">
              <label>ถึง</label>
              <input type="date" class="glass-filter-input" id="gfDateTo" value="${f.dateTo || ''}" style="flex:1">
            </div>
          </div>

          <!-- Type + Completion + Inspection in grid -->
          <div class="glass-filter-grid">
            <div class="glass-filter-group">
              <label class="glass-filter-label">📦 ประเภท</label>
              <div class="glass-checkbox-list" id="gfTypeList">
                <label class="glass-checkbox-item"><input type="checkbox" class="gf-type-cb" value="" ${f.types.length === 0 ? 'checked' : ''}> ทั้งหมด</label>
                ${types.map(t => `<label class="glass-checkbox-item"><input type="checkbox" class="gf-type-cb" value="${App.escapeHTML(t)}" ${f.types.includes(t) ? 'checked' : ''}> ${App.escapeHTML(t)}</label>`).join('')}
              </div>
            </div>
            <div>
              <div class="glass-filter-group">
                <label class="glass-filter-label">📊 สถานะข้อมูล</label>
                <div class="glass-dropdown" id="gfCompletion">
                  <button type="button" class="glass-dropdown-trigger" data-value="${f.completion || ''}">
                    <span class="gd-label">${{'':'ทั้งหมด','complete':'✅ ครบ','incomplete':'⚠️ ไม่ครบ'}[f.completion||'']}</span>
                    <svg class="glass-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                  <div class="glass-dropdown-panel">
                    <div class="glass-dropdown-option${!f.completion ? ' selected' : ''}" data-value=""><span class="gd-check">${!f.completion ? '✓' : ''}</span> ทั้งหมด</div>
                    <div class="glass-dropdown-option${f.completion==='complete' ? ' selected' : ''}" data-value="complete"><span class="gd-check">${f.completion==='complete' ? '✓' : ''}</span> ✅ ครบ</div>
                    <div class="glass-dropdown-option${f.completion==='incomplete' ? ' selected' : ''}" data-value="incomplete"><span class="gd-check">${f.completion==='incomplete' ? '✓' : ''}</span> ⚠️ ไม่ครบ</div>
                  </div>
                </div>
              </div>
              <div class="glass-filter-group">
                <label class="glass-filter-label">🔎 ตรวจสอบ</label>
                <div class="glass-dropdown" id="gfInspection">
                  <button type="button" class="glass-dropdown-trigger" data-value="${f.inspection || ''}">
                    <span class="gd-label">${{'':'ทั้งหมด','checked':'✅ ตรวจแล้ว','partial':'🔄 ตรวจบางส่วน','unchecked':'⬜ ยังไม่ตรวจ'}[f.inspection||'']}</span>
                    <svg class="glass-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                  <div class="glass-dropdown-panel">
                    <div class="glass-dropdown-option${!f.inspection ? ' selected' : ''}" data-value=""><span class="gd-check">${!f.inspection ? '✓' : ''}</span> ทั้งหมด</div>
                    <div class="glass-dropdown-option${f.inspection==='checked' ? ' selected' : ''}" data-value="checked"><span class="gd-check">${f.inspection==='checked' ? '✓' : ''}</span> ✅ ตรวจแล้ว</div>
                    <div class="glass-dropdown-option${f.inspection==='partial' ? ' selected' : ''}" data-value="partial"><span class="gd-check">${f.inspection==='partial' ? '✓' : ''}</span> 🔄 ตรวจบางส่วน</div>
                    <div class="glass-dropdown-option${f.inspection==='unchecked' ? ' selected' : ''}" data-value="unchecked"><span class="gd-check">${f.inspection==='unchecked' ? '✓' : ''}</span> ⬜ ยังไม่ตรวจ</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="glass-modal-footer">
            <button class="glass-btn glass-btn-clear" id="gfClear">ล้างตัวกรอง</button>
            <button class="glass-btn glass-btn-apply" id="gfApply">✓ ใช้ตัวกรอง</button>
          </div>
        </div>
      </div>

      <div id="retTableArea"></div>
    `;

    // ── Toolbar event bindings ──
    const overlay = document.getElementById('retFilterOverlay');
    const openModal = () => { overlay.classList.add('open'); };
    const closeModal = () => { overlay.classList.remove('open'); };

    document.getElementById('btnSettingsAdv').addEventListener('click', openModal);
    document.getElementById('btnCloseFilter').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    // Custom glass dropdowns
    document.querySelectorAll('.glass-dropdown').forEach(dd => {
      const trigger = dd.querySelector('.glass-dropdown-trigger');
      const panel = dd.querySelector('.glass-dropdown-panel');
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close other dropdowns first
        document.querySelectorAll('.glass-dropdown-panel.open').forEach(p => { if (p !== panel) { p.classList.remove('open'); p.parentElement.querySelector('.glass-dropdown-trigger').classList.remove('open'); } });
        panel.classList.toggle('open');
        trigger.classList.toggle('open');
      });
      panel.querySelectorAll('.glass-dropdown-option').forEach(opt => {
        opt.addEventListener('click', () => {
          trigger.dataset.value = opt.dataset.value;
          trigger.querySelector('.gd-label').textContent = opt.textContent.trim();
          panel.querySelectorAll('.glass-dropdown-option').forEach(o => { o.classList.remove('selected'); o.querySelector('.gd-check').textContent = ''; });
          opt.classList.add('selected');
          opt.querySelector('.gd-check').textContent = '✓';
          panel.classList.remove('open');
          trigger.classList.remove('open');
        });
      });
    });
    // Close dropdowns on click outside
    document.addEventListener('click', () => { document.querySelectorAll('.glass-dropdown-panel.open').forEach(p => { p.classList.remove('open'); p.parentElement.querySelector('.glass-dropdown-trigger').classList.remove('open'); }); });

    // Date preset chips
    document.getElementById('gfDateChips').querySelectorAll('.glass-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.getElementById('gfDateChips').querySelectorAll('.glass-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const preset = chip.dataset.preset;
        const today = new Date(), fmt = d => d.toISOString().slice(0, 10);
        const customRow = document.getElementById('gfCustomDate');
        if (preset === 'custom') { customRow.style.display = ''; return; }
        customRow.style.display = 'none';
        switch (preset) {
          case 'all': document.getElementById('gfDateFrom').value = ''; document.getElementById('gfDateTo').value = ''; break;
          case 'today': document.getElementById('gfDateFrom').value = document.getElementById('gfDateTo').value = fmt(today); break;
          case 'yesterday': { const y = new Date(today); y.setDate(y.getDate()-1); document.getElementById('gfDateFrom').value = document.getElementById('gfDateTo').value = fmt(y); break; }
          case '7days': { const d7 = new Date(today); d7.setDate(d7.getDate()-6); document.getElementById('gfDateFrom').value = fmt(d7); document.getElementById('gfDateTo').value = fmt(today); break; }
          case 'thisMonth': document.getElementById('gfDateFrom').value = fmt(new Date(today.getFullYear(), today.getMonth(), 1)); document.getElementById('gfDateTo').value = fmt(today); break;
          case 'lastMonth': { const lm = new Date(today.getFullYear(), today.getMonth()-1, 1); document.getElementById('gfDateFrom').value = fmt(lm); document.getElementById('gfDateTo').value = fmt(new Date(today.getFullYear(), today.getMonth(), 0)); break; }
        }
      });
    });

    // Type checkboxes inside modal
    const gfTypeCbs = document.querySelectorAll('.gf-type-cb');
    const gfAllCb = document.querySelector('.gf-type-cb[value=""]');
    gfTypeCbs.forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.value === '') { gfTypeCbs.forEach(c => { if (c !== gfAllCb) c.checked = false; }); gfAllCb.checked = true; }
        else { gfAllCb.checked = false; if (!Array.from(gfTypeCbs).some(c => c.value !== '' && c.checked)) gfAllCb.checked = true; }
      });
    });

    // Apply filters
    document.getElementById('gfApply').addEventListener('click', () => {
      Pages._retFilters.search = document.getElementById('gfSearch').value.trim();
      Pages._retFilters.dateFrom = document.getElementById('gfDateFrom').value || null;
      Pages._retFilters.dateTo = document.getElementById('gfDateTo').value || null;
      Pages._retFilters.types = Array.from(gfTypeCbs).filter(c => c.value !== '' && c.checked).map(c => c.value);
      Pages._retFilters.completion = document.querySelector('#gfCompletion .glass-dropdown-trigger').dataset.value || '';
      Pages._retFilters.inspection = document.querySelector('#gfInspection .glass-dropdown-trigger').dataset.value || '';
      Pages._retPage = 1;
      closeModal();
      Pages._retRenderView(container);
    });

    // Clear filters inside modal
    document.getElementById('gfClear').addEventListener('click', () => {
      Pages._retFilters = { search: '', types: [], completion: '', inspection: '', dateFrom: null, dateTo: null };
      Pages._retPage = 1;
      closeModal();
      Pages._retRenderView(container);
    });

    // Clear filters button (outside modal)
    document.getElementById('btnClearFilters').addEventListener('click', () => {
      Pages._retFilters = { search: '', types: [], completion: '', inspection: '', dateFrom: null, dateTo: null };
      Pages._retPage = 1;
      Pages._retRenderView(container);
    });

    // View toggle
    container.querySelectorAll('.retViewToggle').forEach(btn => {
      btn.addEventListener('click', async () => {
        Pages._retViewMode = btn.dataset.view;
        localStorage.setItem('retViewMode', btn.dataset.view);
        Pages._retPage = 1;
        container.querySelectorAll('.retViewToggle').forEach(b => {
          const isActive = b.dataset.view === Pages._retViewMode;
          const rad = b.dataset.view === 'docs' ? '8px 0 0 8px' : '0 8px 8px 0';
          b.style.cssText = (isActive ? activeStyle : inactiveStyle) + ';padding:5px 14px;font-size:0.78rem;cursor:pointer;border-radius:' + rad + ';transition:all .2s';
        });
        if (Pages._retViewMode === 'items' && Pages._retAllItems.length === 0) {
          try { const d = await App.api('returns.php?all_items=1'); Pages._retAllItems = d.items || []; } catch { Pages._retAllItems = []; }
        }
        Pages._retRenderTable(container);
      });
    });

    // Buttons
    document.getElementById('btnAddReturn').addEventListener('click', () => location.hash = 'returns/new');
    document.getElementById('btnBulkImport').addEventListener('click', () => Pages.showBulkImport());

    // Lazy-load items
    if (vm === 'items' && Pages._retAllItems.length === 0) {
      try { const d = await App.api('returns.php?all_items=1'); Pages._retAllItems = d.items || []; } catch { Pages._retAllItems = []; }
    }

    Pages._retRenderTable(container);

  },

  _retRenderTable(container) {
    const area = document.getElementById('retTableArea');
    if (!area) return;
    if (Pages._retViewMode === 'items') Pages._retRenderItemsTable(area, container);
    else Pages._retRenderDocsTable(area, container);
  },

  _retBuildPageNums(page, totalPages) {
    let pn = ''; const mx = 7;
    let sp = Math.max(1, page - Math.floor(mx/2)), ep = Math.min(totalPages, sp + mx - 1);
    if (ep - sp < mx - 1) sp = Math.max(1, ep - mx + 1);
    if (sp > 1) pn += `<button class="pg-btn" data-pg="1">1</button>`;
    if (sp > 2) pn += `<span class="pg-dots">…</span>`;
    for (let i = sp; i <= ep; i++) pn += `<button class="pg-btn${i===page?' active':''}" data-pg="${i}">${i}</button>`;
    if (ep < totalPages-1) pn += `<span class="pg-dots">…</span>`;
    if (ep < totalPages) pn += `<button class="pg-btn" data-pg="${totalPages}">${totalPages}</button>`;
    return pn;
  },

  _retRenderDocsTable(area, container) {
    const filtered = Pages._getFilteredReturns();
    const total = filtered.length, perPage = Pages._retPerPage;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    if (Pages._retPage > totalPages) Pages._retPage = totalPages;
    const page = Pages._retPage, start = (page - 1) * perPage;
    const pageItems = filtered.slice(start, start + perPage);
    const hasFilter = !!(Pages._retFilters.search || Pages._retFilters.types.length > 0 || Pages._retFilters.completion || Pages._retFilters.inspection || (Pages._retFilters.dateFrom && Pages._retFilters.dateTo));
    const pageNums = Pages._retBuildPageNums(page, totalPages);

    document.getElementById('retTotalCount').textContent = `${total} เอกสาร`;

    area.innerHTML = `
      <div class="card">
        <div class="table-summary-bar">
          <div class="summary-text">ทั้งหมด <strong>${total.toLocaleString()}</strong> รายการ${hasFilter ? ` (กรอง จาก ${Pages._returnsData.length.toLocaleString()})` : ''}</div>
          <div class="per-page-select">
            <label>แสดง</label>
            <select id="retPerPage" class="form-select" style="width:auto">${[25,50,100,250].map(n=>`<option value="${n}"${n===perPage?' selected':''}>${n}</option>`).join('')}</select>
            <label>/ หน้า</label>
          </div>
        </div>
        <div class="table-wrapper" style="max-height:calc(100vh - 340px);overflow-y:auto">
          <table class="data-table" id="returnsTable">
            <thead><tr>
              <th>#</th><th>เลขที่ใบรับคืน</th><th>วันที่</th><th>สาขา/ลูกค้า</th><th>ประเภท</th><th>จำนวนรายการ</th><th>หมายเหตุ</th>
              <th style="text-align:center"><label class="inspect-toggle-header" title="ยืนยันตรวจสอบทั้งหมดในหน้านี้"><input type="checkbox" id="inspectAll"> สถานะตรวจสอบ</label></th>
              <th>จัดการ</th>
            </tr></thead>
            <tbody id="returnsBody">
              ${pageItems.length === 0
                ? '<tr><td colspan="9" class="text-center" style="padding:32px;color:var(--text-muted)">ยังไม่มีใบรับคืน</td></tr>'
                : pageItems.map((r, i) => {
                    const filled = parseInt(r.filled_count) || 0, tot = parseInt(r.item_count) || 0, confirmed = parseInt(r.confirmed_count) || 0;
                    const isComplete = tot > 0 && filled === tot;
                    const verifyBadge = tot === 0 ? '<span class="badge badge-muted">—</span>' : isComplete ? '<span class="badge badge-success">✅ ครบ</span>' : `<span class="badge badge-warning">⚠️ ${filled}/${tot}</span>`;
                    const allConfirmed = tot > 0 && confirmed === tot, noneConfirmed = confirmed === 0;
                    const pending = Pages._inspectPending[r.id];
                    const effectiveChecked = pending === 'confirm' ? true : pending === 'unconfirm' ? false : allConfirmed;
                    let inspectCell;
                    if (tot === 0) inspectCell = '<span class="badge badge-muted">—</span>';
                    else {
                      const isPending = !!pending, cls = effectiveChecked ? 'confirmed' : '', pendingCls = isPending ? ' pending' : '';
                      const label = effectiveChecked ? '✓ ตรวจแล้ว' : (noneConfirmed ? 'ยังไม่ตรวจ' : `${confirmed}/${tot}`);
                      inspectCell = `<label class="inspect-toggle ${cls}${pendingCls}"><input type="checkbox" class="inspect-cb" data-receipt-id="${r.id}" data-orig-confirmed="${allConfirmed?'1':'0'}" ${effectiveChecked?'checked':''}><span class="inspect-label">${label}${isPending?' *':''}</span></label>`;
                    }
                    return `<tr>
                      <td>${start+i+1}</td>
                      <td><strong>${App.escapeHTML(r.receipt_number)}</strong></td>
                      <td>${r.return_date}</td>
                      <td>${App.escapeHTML(r.branch_name||'-')}</td>
                      <td>${App.escapeHTML(r.return_type||'-')}</td>
                      <td>${tot}</td>
                      <td>${verifyBadge}</td>
                      <td style="text-align:center">${inspectCell}</td>
                      <td><button class="btn btn-outline btn-sm" onclick="Pages.viewReturn(${r.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ดู</button></td>
                    </tr>`;
                  }).join('')}
            </tbody>
          </table>
        </div>
        ${totalPages > 1 ? `<div class="pagination-bar" id="retPagination">
          <button class="pg-btn" data-pg="${Math.max(1,page-1)}" ${page===1?'disabled':''}>‹ ก่อน</button>
          ${pageNums}
          <button class="pg-btn" data-pg="${Math.min(totalPages,page+1)}" ${page===totalPages?'disabled':''}>ถัดไป ›</button>
          <span class="pg-info">หน้า ${page}/${totalPages}</span>
        </div>` : ''}
      </div>

      ${(() => {
        const pendingCount = Object.keys(Pages._inspectPending).length;
        if (pendingCount === 0) return '';
        return `<div class="inspect-save-bar" id="inspectSaveBar">
          <div class="inspect-save-info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
            มีการเปลี่ยนแปลง <strong>${pendingCount}</strong> รายการ ยังไม่ได้บันทึก
          </div>
          <div class="inspect-save-actions">
            <button class="btn btn-outline btn-sm" id="btnInspectCancel">ยกเลิก</button>
            <button class="btn btn-primary btn-sm" id="btnInspectSave" style="gap:4px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
              บันทึก
            </button>
          </div>
        </div>`;
      })()}
    `;

    // Table events: inspection checkboxes
    area.querySelectorAll('.inspect-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        const receiptId = parseInt(cb.dataset.receiptId);
        const origConfirmed = cb.dataset.origConfirmed === '1';
        if (cb.checked === origConfirmed) delete Pages._inspectPending[receiptId];
        else Pages._inspectPending[receiptId] = cb.checked ? 'confirm' : 'unconfirm';
        Pages._retRenderTable(container);
      });
    });

    // Inspect all
    const inspectAllCb = document.getElementById('inspectAll');
    if (inspectAllCb) {
      inspectAllCb.addEventListener('change', () => {
        const shouldCheck = inspectAllCb.checked;
        area.querySelectorAll('.inspect-cb').forEach(cb => {
          const receiptId = parseInt(cb.dataset.receiptId);
          const origConfirmed = cb.dataset.origConfirmed === '1';
          if (shouldCheck) { if (!origConfirmed) Pages._inspectPending[receiptId] = 'confirm'; }
          else { if (Pages._inspectPending[receiptId] === 'confirm') delete Pages._inspectPending[receiptId]; }
        });
        Pages._retRenderTable(container);
      });
    }

    // Save bar
    const saveBar = document.getElementById('inspectSaveBar');
    if (saveBar) {
      document.getElementById('btnInspectCancel').addEventListener('click', () => { Pages._inspectPending = {}; Pages._retRenderTable(container); });
      document.getElementById('btnInspectSave').addEventListener('click', async () => {
        const saveBtn = document.getElementById('btnInspectSave');
        saveBtn.disabled = true; saveBtn.innerHTML = '<span class="spinner-sm"></span> กำลังบันทึก...';
        let successCount = 0;
        for (const [rid, action] of Object.entries(Pages._inspectPending)) {
          try {
            await App.api('returns.php', { method: 'PATCH', body: action === 'confirm' ? { confirm_all_receipt: parseInt(rid) } : { unconfirm_all_receipt: parseInt(rid) } });
            const row = Pages._returnsData.find(r => r.id == rid);
            if (row) row.confirmed_count = action === 'confirm' ? (parseInt(row.item_count) || 0) : 0;
            successCount++;
          } catch (err) { console.error('Error saving receipt', rid, err); }
        }
        Pages._inspectPending = {};
        App.toast(`✓ บันทึกสำเร็จ ${successCount} ใบรับคืน`, 'success');
        Pages._retRenderTable(container);
      });
    }

    // Per-page
    document.getElementById('retPerPage')?.addEventListener('change', (e) => {
      Pages._retPerPage = parseInt(e.target.value); Pages._retPage = 1; Pages._retRenderTable(container);
    });
    // Pagination
    document.getElementById('retPagination')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pg]');
      if (!btn || btn.disabled) return;
      Pages._retPage = parseInt(btn.dataset.pg); Pages._retRenderTable(container);
    });
  },

  _retRenderItemsTable(area, container) {
    const items = Pages._retAllItems, f = Pages._retFilters;
    let filtered = items;
    if (f.search) { const q=f.search.toLowerCase(); filtered=filtered.filter(it=>[it.receipt_number,it.good_code,it.good_name,it.branch_name,it.return_type].join(' ').toLowerCase().includes(q)); }
    if (f.types.length > 0) filtered = filtered.filter(it => f.types.includes(it.return_type || ''));
    if (f.completion) {
      if (f.completion === 'complete') filtered = filtered.filter(it => it.sales_conditions);
      else if (f.completion === 'incomplete') filtered = filtered.filter(it => !it.sales_conditions);
    }
    if (f.inspection) {
      if (f.inspection === 'checked') filtered = filtered.filter(it => parseInt(it.is_confirmed));
      else if (f.inspection === 'unchecked') filtered = filtered.filter(it => !parseInt(it.is_confirmed));
    }
    if (f.dateFrom && f.dateTo) filtered = filtered.filter(it => { const d = it.return_date; return d >= f.dateFrom && d <= f.dateTo; });

    const total = filtered.length, perPage = Pages._retPerPage;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    if (Pages._retPage > totalPages) Pages._retPage = totalPages;
    const page = Pages._retPage, start = (page - 1) * perPage;
    const pageItems = filtered.slice(start, start + perPage);
    const hasFilter = !!(f.search || f.types.length > 0 || f.completion || f.inspection || (f.dateFrom && f.dateTo));
    const pageNums = Pages._retBuildPageNums(page, totalPages);

    document.getElementById('retTotalCount').textContent = `${total} รายการ`;

    area.innerHTML = `
      <div class="card">
        <div class="table-wrap" style="overflow-x:auto"><table class="data-table">
          <thead><tr>
            <th>#</th><th>ใบรับคืน</th><th>วันที่</th><th>สาขา</th><th>ประเภท</th>
            <th>รหัสสินค้า</th><th>ชื่อสินค้า</th><th>Class</th><th>SN</th><th>จำนวน</th>
            <th>เงื่อนไข</th><th>สถานะ</th><th>ตรวจสอบ</th>
          </tr></thead>
          <tbody>${pageItems.length === 0
            ? '<tr><td colspan="13" class="text-center" style="padding:40px;color:var(--text-muted)">' + (hasFilter ? 'ไม่พบรายการตามตัวกรอง' : 'ยังไม่มีรายการ') + '</td></tr>'
            : pageItems.map((it, i) => {
              const isConfirmed = parseInt(it.is_confirmed);
              return `<tr style="cursor:pointer" onclick="Pages.viewReturn(${it.receipt_id})">
                <td>${start+i+1}</td>
                <td><strong style="color:var(--primary)">${App.escapeHTML(it.receipt_number||'-')}</strong></td>
                <td style="font-size:0.8rem">${it.return_date||'-'}</td>
                <td style="font-size:0.8rem">${App.escapeHTML(it.branch_name||'-')}</td>
                <td style="font-size:0.78rem">${App.escapeHTML(it.return_type||'-')}</td>
                <td><span class="cell-badge">${App.escapeHTML(it.good_code||'-')}</span></td>
                <td style="font-size:0.82rem">${App.escapeHTML(it.good_name||'-')}</td>
                <td style="text-align:center">${it.class?'<span class="badge badge-class">'+App.escapeHTML(it.class)+'</span>':'-'}</td>
                <td style="font-size:0.78rem">${App.escapeHTML(it.serial_number||'-')}</td>
                <td style="text-align:center">${parseInt(it.quantity)||1}</td>
                <td style="font-size:0.78rem">${it.sales_conditions?'<span class="badge badge-success" style="font-size:0.72rem">'+App.escapeHTML(it.sales_conditions)+'</span>':'<span style="color:var(--text-muted)">—</span>'}</td>
                <td style="font-size:0.78rem">${App.escapeHTML(it.status||'-')}</td>
                <td>${isConfirmed?'<span class="badge" style="background:#10b98122;color:#059669;font-weight:600">✅</span>':'<span class="badge" style="background:#f59e0b22;color:#d97706;font-weight:600">⬜</span>'}</td>
              </tr>`;}).join('')}
          </tbody>
        </table></div>
        ${totalPages > 1 ? `<div class="pagination-bar" id="retPagination">
          <button class="pg-btn" data-pg="${Math.max(1,page-1)}" ${page===1?'disabled':''}>‹ ก่อน</button>
          ${pageNums}
          <button class="pg-btn" data-pg="${Math.min(totalPages,page+1)}" ${page===totalPages?'disabled':''}>ถัดไป ›</button>
          <span class="pg-info">หน้า ${page}/${totalPages}</span>
          <select class="pg-per-page" id="retPerPage"><option value="25" ${perPage===25?'selected':''}>25</option><option value="50" ${perPage===50?'selected':''}>50</option><option value="100" ${perPage===100?'selected':''}>100</option><option value="250" ${perPage===250?'selected':''}>250</option></select>
        </div>` : ''}
      </div>`;

    document.getElementById('retPagination')?.addEventListener('click', (e) => { const btn=e.target.closest('[data-pg]'); if(!btn||btn.disabled)return; Pages._retPage=parseInt(btn.dataset.pg); Pages._retRenderTable(container); });
    document.getElementById('retPerPage')?.addEventListener('change', e => { Pages._retPerPage=parseInt(e.target.value); Pages._retPage=1; Pages._retRenderTable(container); });
  },


  // ══════════════════════════════════════════
  //  BULK IMPORT FROM EXCEL
  // ══════════════════════════════════════════
  showBulkImport() {
    const body = `
      <div class="bulk-import-container">
        <div class="paste-zone" style="margin-bottom:0">
          <div class="paste-zone-header">
            <div class="card-title" style="font-size:0.95rem">📥 Import จากไฟล์ Excel</div>
            <div class="paste-zone-hint">อัปโหลดไฟล์ Excel ที่มีข้อมูลครบ — ระบบจะจัดกลุ่มตามเลขที่รับคืนอัตโนมัติ</div>
          </div>
          <div class="file-drop-zone" id="bulkDropZone" style="margin-top:10px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:36px;height:36px;margin-bottom:8px;opacity:0.4"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg>
            <div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:4px">ลากไฟล์มาวาง หรือ คลิกเลือกไฟล์</div>
            <div style="font-size:0.78rem;color:var(--text-muted)">รองรับ .xlsx, .xls, .csv</div>
            <input type="file" id="bulkFileInput" accept=".xlsx,.xls,.csv" style="display:none">
          </div>
          <div id="bulkFileInfo" class="file-info" style="display:none"></div>
          <div class="paste-col-hint" style="margin-top:8px">⚡ คอลัมน์ที่รองรับ: วันที่รับคืน, เลขที่รับคืน, สาขา/ลูกค้า, ประเภท, คลัง, รหัสสินค้า, ชื่อสินค้า, จำนวน</div>
        </div>

        <!-- Preview area -->
        <div id="bulkPreview" style="display:none;margin-top:16px">
          <div class="flex items-center justify-between mb-12">
            <div class="card-title" style="font-size:0.95rem">📋 ตัวอย่างข้อมูล</div>
            <div id="bulkStats" class="paste-col-hint"></div>
          </div>
          <div class="table-wrapper" style="max-height:400px;overflow-y:auto">
            <table class="data-table" id="bulkPreviewTable">
              <thead>
                <tr>
                  <th style="width:36px">#</th>
                  <th>เลขที่รับคืน</th>
                  <th>วันที่</th>
                  <th>สาขา/ลูกค้า</th>
                  <th>ประเภท</th>
                  <th>คลัง</th>
                  <th>รหัสสินค้า</th>
                  <th>ชื่อสินค้า</th>
                  <th style="width:60px">จำนวน</th>
                </tr>
              </thead>
              <tbody id="bulkPreviewBody"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-outline" onclick="App.closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" id="btnBulkSave" disabled>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
        นำเข้าทั้งหมด
      </button>
    `;

    App.openModal('📥 Import Excel — สร้างหลายเอกสาร', body, footer);

    let parsedReceipts = {}; // grouped data

    const dropZone = document.getElementById('bulkDropZone');
    const fileInput = document.getElementById('bulkFileInput');
    const fileInfoEl = document.getElementById('bulkFileInfo');

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
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

          if (rows.length < 2) {
            App.toast('ไฟล์ว่างหรือมีแค่หัวตาราง', 'error');
            fileInfoEl.innerHTML = `<span>📄 ${App.escapeHTML(file.name)}</span><span class="badge badge-rejected">ไม่มีข้อมูล</span>`;
            return;
          }

          // ── Smart column detection (exclusive: each column claimed once) ──
          const hdr = rows[0].map(h => String(h).toLowerCase().trim());
          const claimed = new Set();
          const detect = (words) => {
            const idx = hdr.findIndex((h, i) => !claimed.has(i) && words.some(w => h.includes(w)));
            if (idx !== -1) claimed.add(idx);
            return idx;
          };

          // Detect in order of specificity (most unique keywords first)
          const colMap = {};
          colMap.receipt  = detect(['เลขที่รับคืน', 'เลขที่เอกสาร', 'เลขที่', 'receipt', 'เอกสาร', 'doc no']);
          colMap.code     = detect(['รหัสสินค้า', 'รหัส', 'code', 'sku', 'barcode', 'item code']);
          colMap.name     = detect(['ชื่อสินค้า', 'ชื่อ', 'name', 'product', 'รายการ', 'สินค้า', 'description']);
          colMap.date     = detect(['วันที่รับคืน', 'วันที่', 'return date', 'date']);
          colMap.branch   = detect(['สาขา', 'ลูกค้า', 'branch', 'customer']);
          colMap.type     = detect(['ประเภท', 'type', 'ประเภทการรับคืน']);
          colMap.warehouse= detect(['คลัง', 'warehouse', 'คลังที่เก็บ', 'store']);
          colMap.qty      = detect(['จำนวน', 'qty', 'quantity', 'pcs', 'amount']);

          // Verify critical columns
          if (colMap.receipt === -1 && colMap.code === -1 && colMap.name === -1) {
            App.toast('ไม่พบคอลัมน์ที่จำเป็น (เลขที่รับคืน, รหัส/ชื่อสินค้า)', 'error');
            fileInfoEl.innerHTML = `<span>📄 ${App.escapeHTML(file.name)}</span><span class="badge badge-rejected">คอลัมน์ไม่ตรง</span>`;
            return;
          }

          const getVal = (row, col) => col >= 0 ? String(row[col] || '').trim() : '';

          // ── Group rows by receipt number ──
          parsedReceipts = {};
          let totalItems = 0;

          for (let r = 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row || row.every(c => !c && c !== 0)) continue;

            const receiptNum = getVal(row, colMap.receipt) || `AUTO-${String(r).padStart(3, '0')}`;
            const code = getVal(row, colMap.code);
            const name = getVal(row, colMap.name);
            if (!code && !name) continue;

            if (!parsedReceipts[receiptNum]) {
              // Parse date
              let dateStr = getVal(row, colMap.date);
              if (dateStr) {
                // Try to convert various date formats to YYYY-MM-DD
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                  dateStr = d.toISOString().split('T')[0];
                }
              } else {
                dateStr = new Date().toISOString().split('T')[0];
              }

              parsedReceipts[receiptNum] = {
                receipt_number: receiptNum,
                return_date: dateStr,
                branch_name: getVal(row, colMap.branch),
                return_type: getVal(row, colMap.type),
                warehouse: getVal(row, colMap.warehouse) || '020',
                items: []
              };
            }

            const rawQty = colMap.qty >= 0 ? row[colMap.qty] : 1;
            parsedReceipts[receiptNum].items.push({
              good_code: code,
              good_name: name,
              quantity: parseInt(rawQty) || 1
            });
            totalItems++;
          }

          const receiptKeys = Object.keys(parsedReceipts);
          if (receiptKeys.length === 0) {
            App.toast('ไม่พบข้อมูลที่นำเข้าได้', 'error');
            fileInfoEl.innerHTML = `<span>📄 ${App.escapeHTML(file.name)}</span><span class="badge badge-rejected">ไม่พบข้อมูล</span>`;
            return;
          }

          // ── Show preview ──
          fileInfoEl.innerHTML = `<span>📄 ${App.escapeHTML(file.name)}</span><span class="badge badge-completed">✓ อ่านสำเร็จ</span>`;

          document.getElementById('bulkPreview').style.display = 'block';
          document.getElementById('bulkStats').textContent = `${receiptKeys.length} เอกสาร · ${totalItems} รายการสินค้า`;

          const previewBody = document.getElementById('bulkPreviewBody');
          let html = '';
          let rowNum = 0;

          receiptKeys.forEach(key => {
            const rec = parsedReceipts[key];
            rec.items.forEach((item, idx) => {
              rowNum++;
              const isFirst = idx === 0;
              html += `<tr${isFirst ? ' style="border-top:2px solid var(--border-color)"' : ''}>
                <td class="text-muted" style="font-size:0.78rem">${rowNum}</td>
                <td>${isFirst ? '<strong>' + App.escapeHTML(rec.receipt_number) + '</strong>' : '<span style="color:var(--text-muted)">↳</span>'}</td>
                <td>${isFirst ? rec.return_date : ''}</td>
                <td>${isFirst ? App.escapeHTML(rec.branch_name || '-') : ''}</td>
                <td>${isFirst ? App.escapeHTML(rec.return_type || '-') : ''}</td>
                <td>${isFirst ? App.escapeHTML(rec.warehouse || '-') : ''}</td>
                <td>${App.escapeHTML(item.good_code)}</td>
                <td>${App.escapeHTML(item.good_name)}</td>
                <td style="text-align:center">${item.quantity}</td>
              </tr>`;
            });
          });

          previewBody.innerHTML = html;

          // Enable save button
          document.getElementById('btnBulkSave').disabled = false;

        } catch (err) {
          console.error('Excel parse error:', err);
          App.toast('ไม่สามารถอ่านไฟล์: ' + err.message, 'error');
          fileInfoEl.innerHTML = `<span>📄 ${App.escapeHTML(file.name)}</span><span class="badge badge-rejected">อ่านไม่ได้</span>`;
        }
      };
      reader.readAsArrayBuffer(file);
    };

    // ── Bulk Save ──
    document.getElementById('btnBulkSave').addEventListener('click', async () => {
      const receipts = Object.values(parsedReceipts);
      if (receipts.length === 0) return;

      const btn = document.getElementById('btnBulkSave');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-sm"></span> กำลังนำเข้า...';

      let successCount = 0;
      let errorCount = 0;

      for (const rec of receipts) {
        try {
          const resp = await fetch('/jobpoom/api/returns.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rec)
          });
          const result = await resp.json();
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            console.warn('Failed:', rec.receipt_number, result);
          }
        } catch (e) {
          errorCount++;
          console.error('Failed:', rec.receipt_number, e);
        }
      }

      if (successCount > 0) {
        const totalItems = receipts.reduce((sum, r) => sum + r.items.length, 0);
        App.toast(`✓ นำเข้า ${successCount} เอกสาร (${totalItems} รายการ) สำเร็จ${errorCount > 0 ? ` — ล้มเหลว ${errorCount}` : ''}`, 'success');
        App.closeModal();
        Pages.returns(document.getElementById('pageContainer'));
      } else {
        App.toast('ไม่สามารถนำเข้าได้ กรุณาลองอีกครั้ง', 'error');
        btn.disabled = false;
        btn.textContent = 'นำเข้าทั้งหมด';
      }
    });
  },

  // ── Return Receipt: Full-page Create ──
  async returnCreate(container) {
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
  },

  showReturnForm(data = null) {
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
  },

  viewReturn(id) {
    location.hash = 'returns/' + id;
  },

  async returnDetail(container, id) {
    let r, items;
    try {
      const data = await App.api(`returns.php?id=${id}`);
      r = data.receipt;
      items = data.items || [];
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><h3>ไม่สามารถโหลดข้อมูล</h3><p>${err.message}</p></div>`;
      return;
    }

    container.innerHTML = `
      <div class="flex items-center gap-12 mb-24">
        <button class="btn btn-outline" id="btnBackToReturns">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
          กลับ
        </button>
        <div style="flex:1">
          <h2 style="font-size:1.15rem;font-weight:700;color:var(--text-white);margin:0">ใบรับคืน: ${App.escapeHTML(r.receipt_number)}</h2>
          <div style="font-size:0.82rem;color:var(--text-muted);margin-top:2px">${r.return_date}</div>
        </div>
        <button class="btn btn-outline" id="btnEditHistory" style="gap:6px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ประวัติแก้ไข
        </button>
      </div>

      <div class="card mb-24" style="padding:20px">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px">
          <div>
            <div class="form-label" style="margin-bottom:4px">เลขที่ใบรับคืน</div>
            <div style="font-weight:600;color:var(--text-white)">${App.escapeHTML(r.receipt_number)}</div>
          </div>
          <div>
            <div class="form-label" style="margin-bottom:4px">วันที่รับคืน</div>
            <div style="color:var(--text-primary)">${r.return_date}</div>
          </div>
          <div>
            <div class="form-label" style="margin-bottom:4px">สาขา/ลูกค้า</div>
            <div style="color:var(--text-primary)">${App.escapeHTML(r.branch_name || '-')}</div>
          </div>
          <div>
            <div class="form-label" style="margin-bottom:4px">ประเภท</div>
            <div style="color:var(--text-primary)">${App.escapeHTML(r.return_type || '-')}</div>
          </div>
          <div>
            <div class="form-label" style="margin-bottom:4px">คลัง</div>
            <div style="color:var(--text-primary)">${App.escapeHTML(r.warehouse || '-')}</div>
          </div>
          <div>
            <div class="form-label" style="margin-bottom:4px">จำนวนรายการ</div>
            <div style="color:var(--text-primary)">${items.length} รายการ</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="flex-wrap:wrap;gap:8px">
          <div>
            <div class="card-title">รายการสินค้า</div>
            <div class="card-subtitle">แก้ไขข้อมูลสินค้าได้โดยตรง — กดยืนยันเมื่อตรวจสอบเรียบร้อยแล้ว</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary" id="btnSaveAll" style="gap:6px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
              บันทึกทั้งหมด
            </button>
          </div>
        </div>
        <div class="table-wrapper" style="overflow-x:auto">
          <table class="excel-table">
            <thead>
              <tr>
                <th style="width:40px;text-align:center">#</th>
                <th style="width:130px">รหัสสินค้า</th>
                <th>ชื่อสินค้า</th>
                <th style="width:70px;text-align:center">Class</th>
                <th style="width:65px;text-align:center">จำนวน</th>
                <th style="width:150px">SN NO.</th>
                <th style="width:90px;text-align:center">สถานะ</th>
                <th style="min-width:250px">เงื่อนไขจากฝ่ายขาย</th>
                <th style="width:80px;text-align:center">ยืนยัน</th>
                <th style="width:44px"></th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it, i) => `
                <tr class="${it.is_confirmed == 1 ? 'row-confirmed' : ''}">
                  <td><div class="cell cell-num">${i + 1}</div></td>
                  <td class="cell-editable">
                    <input class="cell-input item-edit-input" data-item-id="${it.id}" data-field="good_code"
                      data-original="${App.escapeHTML(it.good_code || '')}"
                      value="${App.escapeHTML(it.good_code || '')}" placeholder="รหัส" />
                  </td>
                  <td><div class="cell" id="name-${it.id}">${App.escapeHTML(it.good_name || '-')}</div></td>
                  <td><div class="cell cell-badge" id="class-${it.id}">${it.class ? `<span class="badge badge-class">${App.escapeHTML(it.class)}</span>` : '-'}</div></td>
                  <td><div class="cell cell-num">${parseInt(it.quantity) || 1}</div></td>
                  <td class="cell-editable">
                    <input class="cell-input sn-input" data-item-id="${it.id}" data-field="serial_number"
                      data-original="${App.escapeHTML(it.serial_number || '')}"
                      value="${App.escapeHTML(it.serial_number || '')}" placeholder="SN..." />
                  </td>
                  <td><div class="cell cell-badge">${App.statusBadge(it.status)}</div></td>
                  <td class="cell-editable">
                    <textarea
                      class="condition-input"
                      data-item-id="${it.id}"
                      data-original="${App.escapeHTML(it.sales_conditions || '')}"
                      rows="1"
                      placeholder="กรอกเงื่อนไข..."
                    >${App.escapeHTML(it.sales_conditions || '')}</textarea>
                  </td>
                  <td style="text-align:center">
                    ${it.is_confirmed == 1
                      ? `<span class="badge badge-completed" title="ยืนยันแล้ว" style="cursor:pointer;font-size:0.75rem" data-unconfirm="${it.id}">✓ แล้ว</span>`
                      : `<input type="checkbox" class="confirm-cb" data-item-id="${it.id}" style="width:18px;height:18px;cursor:pointer" />`
                    }
                  </td>
                  <td style="text-align:center">
                    <button class="btn-split-row" data-split-id="${it.id}" title="แยกแถว (สร้าง SN ใหม่)" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--accent-blue-light);font-size:1.1rem;line-height:1">⊕</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // ── Back button ──
    document.getElementById('btnBackToReturns').addEventListener('click', () => {
      location.hash = 'returns';
    });

    // ── Edit History button ──
    document.getElementById('btnEditHistory').addEventListener('click', async () => {
      const itemIds = items.map(it => it.id);
      Pages._showEditHistory(itemIds, r.receipt_number);
    });

    // ── Live preview: lookup product on good_code blur ──
    container.querySelectorAll('.item-edit-input[data-field="good_code"]').forEach(inp => {
      inp.addEventListener('blur', async () => {
        const code = inp.value.trim();
        const itemId = inp.dataset.itemId;
        if (!code) return;
        if (code === inp.dataset.original) return;

        const nameEl = document.getElementById(`name-${itemId}`);
        const classEl = document.getElementById(`class-${itemId}`);

        try {
          const response = await fetch(`api/products.php?code=${encodeURIComponent(code)}`);
          const res = await response.json();

          if (response.ok && res.good_name) {
            if (nameEl) { nameEl.textContent = res.good_name; nameEl.style.color = ''; }
            if (classEl) classEl.innerHTML = res.class
              ? `<span class="badge badge-class">${res.class}</span>`
              : '-';
          } else {
            if (nameEl) { nameEl.textContent = '⚠ ไม่พบรหัสนี้'; nameEl.style.color = 'var(--danger)'; }
            if (classEl) classEl.innerHTML = '-';
          }
        } catch (e) {
          if (nameEl) { nameEl.textContent = '⚠ ไม่พบรหัสนี้'; nameEl.style.color = 'var(--danger)'; }
        }
      });
    });

    // ── Unified Save All: item edits + conditions + confirmations ──
    document.getElementById('btnSaveAll').addEventListener('click', async () => {
      const btn = document.getElementById('btnSaveAll');
      const savePayload = {};

      // 1) Collect changed good_codes
      const codeInputs = document.querySelectorAll('.item-edit-input[data-field="good_code"]');
      const codeUpdates = [];
      codeInputs.forEach(inp => {
        const val = inp.value.trim();
        const orig = inp.dataset.original || '';
        if (val && val !== orig) {
          codeUpdates.push({ id: parseInt(inp.dataset.itemId), good_code: val });
        }
      });
      if (codeUpdates.length) savePayload.update_items = codeUpdates;

      // 2a) Collect changed serial numbers
      const snInputs = document.querySelectorAll('.sn-input');
      const snUpdates = [];
      snInputs.forEach(inp => {
        const val = inp.value.trim();
        const orig = inp.dataset.original || '';
        if (val !== orig) {
          snUpdates.push({ id: parseInt(inp.dataset.itemId), serial_number: val });
        }
      });
      if (snUpdates.length) savePayload.update_serial_numbers = snUpdates;

      // 2) Collect changed conditions
      const condTextareas = document.querySelectorAll('.condition-input');
      const condUpdates = [];
      condTextareas.forEach(ta => {
        const val = ta.value.trim();
        const orig = ta.dataset.original || '';
        if (val !== orig) {
          condUpdates.push({ id: parseInt(ta.dataset.itemId, 10), sales_conditions: val });
        }
      });
      if (condUpdates.length) savePayload.update_conditions = condUpdates;

      // 3) Collect confirmed checkboxes
      const checked = Array.from(document.querySelectorAll('.confirm-cb:checked'));
      const confirmIds = checked.map(cb => parseInt(cb.dataset.itemId));
      if (confirmIds.length) savePayload.confirm_items = confirmIds;

      // Nothing changed?
      if (Object.keys(savePayload).length === 0) {
        App.toast('ไม่มีการเปลี่ยนแปลง', 'info');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-sm"></span> กำลังบันทึก...';

      try {
        const result = await App.api('returns.php', {
          method: 'PATCH',
          body: { save_all: savePayload }
        });
        App.toast(`✓ ${result.message}`, 'success');
        Pages.returnDetail(container, id);
      } catch (err) {
        App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg> บันทึกทั้งหมด';
      }
    });

    // ── Unconfirm (click on "✓ แล้ว" badge) ──
    container.querySelectorAll('[data-unconfirm]').forEach(badge => {
      badge.addEventListener('click', async () => {
        const itemId = parseInt(badge.dataset.unconfirm);
        if (!await App.confirmDialog({ title: 'ยกเลิกการยืนยัน', message: 'ต้องการยกเลิกยืนยันรายการนี้?', type: 'warning', confirmText: 'ยกเลิกยืนยัน' })) return;

        try {
          await App.api('returns.php', {
            method: 'PATCH',
            body: { unconfirm_items: [itemId] }
          });
          App.toast('ยกเลิกยืนยันสำเร็จ', 'success');
          Pages.returnDetail(container, id);
        } catch (err) {
          App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
        }
      });
    });

    // ── Split Row (duplicate item for new SN) ──
    container.querySelectorAll('.btn-split-row').forEach(btn => {
      btn.addEventListener('click', async () => {
        const itemId = parseInt(btn.dataset.splitId);
        if (!await App.confirmDialog({ title: 'แยกแถว', message: 'สร้างรายการใหม่จากสินค้าตัวนี้?\n(ใช้เมื่อ SN ต่างกัน ต้องแยกคนละบรรทัด)', type: 'info', confirmText: '⊕ แยกแถว' })) return;

        try {
          await App.api('returns.php', {
            method: 'PATCH',
            body: { split_item: itemId }
          });
          App.toast('แยกแถวสำเร็จ — กรุณากรอก SN ในแถวใหม่', 'success');
          Pages.returnDetail(container, id);
        } catch (err) {
          App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
        }
      });
    });
  },

  async _showEditHistory(itemIds, receiptNumber) {
    let allLogs = [];
    for (const itemId of itemIds) {
      try {
        const data = await App.api(`edit_logs.php?table=return_items&record_id=${itemId}`);
        if (data.logs && data.logs.length) {
          allLogs = allLogs.concat(data.logs.map(l => ({ ...l, item_id: itemId })));
        }
      } catch (e) { /* skip */ }
    }

    // Sort by date desc
    allLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const fieldLabels = {
      sales_conditions: 'เงื่อนไขฝ่ายขาย',
      status: 'สถานะ',
      good_code: 'รหัสสินค้า',
      good_name: 'ชื่อสินค้า',
      quantity: 'จำนวน',
      assigned_to: 'ผู้รับผิดชอบ',
      serial_number: 'SN NO.',
      notes: 'หมายเหตุ'
    };

    const body = allLogs.length === 0
      ? '<div class="empty-state" style="padding:32px"><p>ยังไม่มีประวัติการแก้ไข</p></div>'
      : `<div class="table-wrapper" style="max-height:400px;overflow-y:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>วันเวลา</th>
                <th>ผู้แก้ไข</th>
                <th>Item ID</th>
                <th>ฟิลด์</th>
                <th>ค่าเดิม</th>
                <th>ค่าใหม่</th>
              </tr>
            </thead>
            <tbody>
              ${allLogs.map(l => `
                <tr>
                  <td style="white-space:nowrap;font-size:0.8rem">${l.created_at}</td>
                  <td>${App.escapeHTML(l.user_name || '-')}</td>
                  <td style="text-align:center">${l.record_id}</td>
                  <td><span class="badge badge-muted">${fieldLabels[l.field_name] || l.field_name}</span></td>
                  <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;color:var(--text-muted)">${App.escapeHTML(l.old_value || '-')}</td>
                  <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;font-weight:600">${App.escapeHTML(l.new_value || '-')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;

    App.openModal(`📋 ประวัติแก้ไข — ${App.escapeHTML(receiptNumber)}`, body);
  },

  // ── Inspection (ตรวจสอบสินค้า) ─────────────
  _inspData: [],
  _inspCauses: [],
  _inspPage: 1,
  _inspPerPage: 50,
  _inspSearch: '',

  async inspection(container) {
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
  },

  _getFilteredInspection() {
    if (!Pages._inspSearch) return Pages._inspData;
    const q = Pages._inspSearch.toLowerCase();
    return Pages._inspData.filter(it =>
      (it.receipt_number || '').toLowerCase().includes(q) ||
      (it.good_code || '').toLowerCase().includes(q) ||
      (it.good_name || '').toLowerCase().includes(q)
    );
  },

  _renderInspection(container) {
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
  },

  showInspectionForm(itemId, causes) {
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
  },

  // ── Reconditioning (ปรับสภาพ) — List + Detail ──────────────
  _reconDocs: [],
  _reconAllItems: [],
  _reconPage: 1,
  _reconPerPage: 50,
  _reconSearch: '',
  _reconViewMode: 'docs', // 'docs' or 'items'

  async reconditioning(container) {
    try {
      const data = await App.api('reconditioning.php');
      Pages._reconDocs = data.documents || [];
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><h3>เกิดข้อผิดพลาด</h3><p>${err.message}</p></div>`;
      return;
    }
    Pages._reconPage = 1;
    Pages._reconViewMode = localStorage.getItem('reconViewMode') || 'docs';
    Pages._reconFilters = { search: '', status: '', dateFrom: null, dateTo: null };
    Pages._reconRenderView(container);
  },

  async _reconRenderView(container) {
    // Render shared toolbar once, then fill table area
    const f = Pages._reconFilters;
    const vm = Pages._reconViewMode;
    const hasFilter = !!(f.search || f.status || (f.dateFrom && f.dateTo));

    // Date label
    let dateLabel = 'วันที่: ทั้งหมด';
    if (f.dateFrom && f.dateTo) {
      const today = new Date().toISOString().slice(0, 10);
      const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (f.dateFrom === f.dateTo) {
        dateLabel = f.dateFrom === today ? 'วันที่: วันนี้' : f.dateFrom === yest ? 'วันที่: เมื่อวาน' : `วันที่: ${f.dateFrom}`;
      } else {
        dateLabel = `วันที่: ${f.dateFrom} — ${f.dateTo}`;
      }
    }

    // Toggle button styles
    const activeStyle = 'background:var(--gradient-blue);color:#fff;border:1px solid transparent;font-weight:600';
    const inactiveStyle = 'background:transparent;color:var(--text-secondary);border:1px solid var(--border-color)';

    container.innerHTML = `
      <div class="page-section">
        <div class="filter-toolbar">
          <div class="filter-row">
            <!-- Settings Advanced button -->
            <button class="btn-settings-adv" id="btnReconSettingsAdv">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              ตัวกรองขั้นสูง
              ${hasFilter ? '<span class="filter-dot"></span>' : ''}
            </button>

            <!-- Clear filters (shown when active) -->
            <button class="btn btn-outline btn-sm filter-clear-btn" id="btnReconClearFilters" title="ล้างตัวกรองทั้งหมด" style="${hasFilter ? '' : 'display:none'}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              ล้างตัวกรอง
            </button>

            <div style="display:flex;gap:8px;align-items:center;margin-left:auto">
              <div style="display:inline-flex;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.12)">
                <button class="reconViewToggle" data-view="docs" style="${vm==='docs' ? activeStyle : inactiveStyle};padding:5px 14px;font-size:0.78rem;cursor:pointer;border-radius:8px 0 0 8px;transition:all .2s">📄 เอกสาร</button>
                <button class="reconViewToggle" data-view="items" style="${vm==='items' ? activeStyle : inactiveStyle};padding:5px 14px;font-size:0.78rem;cursor:pointer;border-radius:0 8px 8px 0;transition:all .2s">📦 รายการสินค้า</button>
              </div>
              <span style="font-size:0.82rem;color:var(--text-muted)" id="reconTotalCount"></span>
              <button class="btn btn-primary btn-sm" id="btnNewReconDoc" style="gap:4px">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M12 5v14M5 12h14"/></svg>
                เพิ่มเอกสาร
              </button>
            </div>
          </div>
        </div>

        <!-- Glass Filter Modal -->
        <div class="glass-overlay" id="reconFilterOverlay">
          <div class="glass-modal">
            <div class="glass-modal-header">
              <div class="glass-modal-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                ตัวกรองขั้นสูง
              </div>
              <button class="glass-modal-close" id="btnReconCloseFilter">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <!-- Search -->
            <div class="glass-filter-group">
              <label class="glass-filter-label">🔍 ค้นหา</label>
              <input type="text" class="glass-filter-input" id="rgfSearch" placeholder="ค้นหาเลขเอกสาร, สินค้า, สาขา..." value="${App.escapeHTML(f.search)}">
            </div>

            <!-- Date -->
            <div class="glass-filter-group">
              <label class="glass-filter-label">📅 วันที่</label>
              <div class="glass-preset-chips" id="rgfDateChips">
                <span class="glass-chip${!f.dateFrom ? ' active' : ''}" data-preset="all">ทั้งหมด</span>
                <span class="glass-chip" data-preset="today">วันนี้</span>
                <span class="glass-chip" data-preset="yesterday">เมื่อวาน</span>
                <span class="glass-chip" data-preset="7days">7 วัน</span>
                <span class="glass-chip" data-preset="thisMonth">เดือนนี้</span>
                <span class="glass-chip" data-preset="lastMonth">เดือนที่แล้ว</span>
                <span class="glass-chip" data-preset="custom">กำหนดเอง</span>
              </div>
              <div class="glass-date-row" id="rgfCustomDate" style="display:none">
                <label>จาก</label>
                <input type="date" class="glass-filter-input" id="rgfDateFrom" value="${f.dateFrom || ''}" style="flex:1">
                <label>ถึง</label>
                <input type="date" class="glass-filter-input" id="rgfDateTo" value="${f.dateTo || ''}" style="flex:1">
              </div>
            </div>

            <!-- Status -->
            <div class="glass-filter-group">
              <label class="glass-filter-label">📊 สถานะ</label>
              <div class="glass-dropdown" id="rgfStatus">
                <button type="button" class="glass-dropdown-trigger" data-value="${f.status || ''}">
                  <span class="gd-label">${{'':'ทั้งหมด','processing':'⏳ กำลังปรับ','partial':'🔄 ปรับบางส่วน','done':'✅ ปรับหมดแล้ว'}[f.status||'']}</span>
                  <svg class="glass-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="glass-dropdown-panel">
                  <div class="glass-dropdown-option${!f.status ? ' selected' : ''}" data-value=""><span class="gd-check">${!f.status ? '✓' : ''}</span> ทั้งหมด</div>
                  <div class="glass-dropdown-option${f.status==='processing' ? ' selected' : ''}" data-value="processing"><span class="gd-check">${f.status==='processing' ? '✓' : ''}</span> ⏳ กำลังปรับ</div>
                  <div class="glass-dropdown-option${f.status==='partial' ? ' selected' : ''}" data-value="partial"><span class="gd-check">${f.status==='partial' ? '✓' : ''}</span> 🔄 ปรับบางส่วน</div>
                  <div class="glass-dropdown-option${f.status==='done' ? ' selected' : ''}" data-value="done"><span class="gd-check">${f.status==='done' ? '✓' : ''}</span> ✅ ปรับหมดแล้ว</div>
                </div>
              </div>
            </div>

            <div class="glass-modal-footer">
              <button class="glass-btn glass-btn-clear" id="rgfClear">ล้างตัวกรอง</button>
              <button class="glass-btn glass-btn-apply" id="rgfApply">✓ ใช้ตัวกรอง</button>
            </div>
          </div>
        </div>

        <div id="reconTableArea"></div>
      </div>
    `;

    // ── Toolbar event bindings ──
    const overlay = document.getElementById('reconFilterOverlay');
    const openModal = () => { overlay.classList.add('open'); };
    const closeModal = () => { overlay.classList.remove('open'); };

    document.getElementById('btnReconSettingsAdv').addEventListener('click', openModal);
    document.getElementById('btnReconCloseFilter').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    // Custom glass dropdowns
    document.querySelectorAll('#reconFilterOverlay .glass-dropdown').forEach(dd => {
      const trigger = dd.querySelector('.glass-dropdown-trigger');
      const panel = dd.querySelector('.glass-dropdown-panel');
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('#reconFilterOverlay .glass-dropdown-panel.open').forEach(p => { if (p !== panel) { p.classList.remove('open'); p.parentElement.querySelector('.glass-dropdown-trigger').classList.remove('open'); } });
        panel.classList.toggle('open');
        trigger.classList.toggle('open');
      });
      panel.querySelectorAll('.glass-dropdown-option').forEach(opt => {
        opt.addEventListener('click', () => {
          trigger.dataset.value = opt.dataset.value;
          trigger.querySelector('.gd-label').textContent = opt.textContent.trim();
          panel.querySelectorAll('.glass-dropdown-option').forEach(o => { o.classList.remove('selected'); o.querySelector('.gd-check').textContent = ''; });
          opt.classList.add('selected');
          opt.querySelector('.gd-check').textContent = '✓';
          panel.classList.remove('open');
          trigger.classList.remove('open');
        });
      });
    });
    document.addEventListener('click', () => { document.querySelectorAll('#reconFilterOverlay .glass-dropdown-panel.open').forEach(p => { p.classList.remove('open'); p.parentElement.querySelector('.glass-dropdown-trigger').classList.remove('open'); }); });

    // Date preset chips
    document.getElementById('rgfDateChips').querySelectorAll('.glass-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.getElementById('rgfDateChips').querySelectorAll('.glass-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const preset = chip.dataset.preset;
        const today = new Date(), fmt = d => d.toISOString().slice(0, 10);
        const customRow = document.getElementById('rgfCustomDate');
        if (preset === 'custom') { customRow.style.display = ''; return; }
        customRow.style.display = 'none';
        switch (preset) {
          case 'all': document.getElementById('rgfDateFrom').value = ''; document.getElementById('rgfDateTo').value = ''; break;
          case 'today': document.getElementById('rgfDateFrom').value = document.getElementById('rgfDateTo').value = fmt(today); break;
          case 'yesterday': { const y = new Date(today); y.setDate(y.getDate()-1); document.getElementById('rgfDateFrom').value = document.getElementById('rgfDateTo').value = fmt(y); break; }
          case '7days': { const d7 = new Date(today); d7.setDate(d7.getDate()-6); document.getElementById('rgfDateFrom').value = fmt(d7); document.getElementById('rgfDateTo').value = fmt(today); break; }
          case 'thisMonth': document.getElementById('rgfDateFrom').value = fmt(new Date(today.getFullYear(), today.getMonth(), 1)); document.getElementById('rgfDateTo').value = fmt(today); break;
          case 'lastMonth': { const lm = new Date(today.getFullYear(), today.getMonth()-1, 1); document.getElementById('rgfDateFrom').value = fmt(lm); document.getElementById('rgfDateTo').value = fmt(new Date(today.getFullYear(), today.getMonth(), 0)); break; }
        }
      });
    });

    // Apply filters
    document.getElementById('rgfApply').addEventListener('click', () => {
      Pages._reconFilters.search = document.getElementById('rgfSearch').value.trim();
      Pages._reconFilters.dateFrom = document.getElementById('rgfDateFrom').value || null;
      Pages._reconFilters.dateTo = document.getElementById('rgfDateTo').value || null;
      Pages._reconFilters.status = document.querySelector('#rgfStatus .glass-dropdown-trigger').dataset.value || '';
      Pages._reconPage = 1;
      closeModal();
      Pages._reconRenderView(container);
    });

    // Clear filters inside modal
    document.getElementById('rgfClear').addEventListener('click', () => {
      Pages._reconFilters = { search: '', status: '', dateFrom: null, dateTo: null };
      Pages._reconPage = 1;
      closeModal();
      Pages._reconRenderView(container);
    });

    // Clear filters button (outside modal)
    document.getElementById('btnReconClearFilters').addEventListener('click', () => {
      Pages._reconFilters = { search: '', status: '', dateFrom: null, dateTo: null };
      Pages._reconPage = 1;
      Pages._reconRenderView(container);
    });

    // View toggle
    container.querySelectorAll('.reconViewToggle').forEach(btn => {
      btn.addEventListener('click', async () => {
        Pages._reconViewMode = btn.dataset.view;
        localStorage.setItem('reconViewMode', btn.dataset.view);
        Pages._reconPage = 1;
        container.querySelectorAll('.reconViewToggle').forEach(b => {
          const isActive = b.dataset.view === Pages._reconViewMode;
          const rad = b.dataset.view === 'docs' ? '8px 0 0 8px' : '0 8px 8px 0';
          b.style.cssText = (isActive ? activeStyle : inactiveStyle) + ';padding:5px 14px;font-size:0.78rem;cursor:pointer;border-radius:' + rad + ';transition:all .2s';
        });
        if (Pages._reconViewMode === 'items' && Pages._reconAllItems.length === 0) {
          try { const d = await App.api('reconditioning.php?master_list=1'); Pages._reconAllItems = d.items || []; } catch { Pages._reconAllItems = []; }
        }
        Pages._reconRenderTable(container);
      });
    });

    // New doc
    document.getElementById('btnNewReconDoc').addEventListener('click', () => App.navigateTo('reconditioning/new'));

    // Lazy-load items if in items view
    if (vm === 'items' && Pages._reconAllItems.length === 0) {
      try { const d = await App.api('reconditioning.php?master_list=1'); Pages._reconAllItems = d.items || []; } catch { Pages._reconAllItems = []; }
    }

    // Render the table area
    Pages._reconRenderTable(container);

  },

  // ── Shared table renderer — fills #reconTableArea only ──
  _reconRenderTable(container) {
    const area = document.getElementById('reconTableArea');
    if (!area) return;
    if (Pages._reconViewMode === 'items') {
      Pages._reconRenderItemsTable(area, container);
    } else {
      Pages._reconRenderDocsTable(area, container);
    }
  },

  _getFilteredReconDocs() {
    const f = Pages._reconFilters;
    return Pages._reconDocs.filter(d => {
      if (f.search) { const q = f.search.toLowerCase(); if (![d.doc_number, d.inspector_name, d.receipt_numbers].join(' ').toLowerCase().includes(q)) return false; }
      if (f.status && d.calc_status !== f.status) return false;
      if (f.dateFrom && f.dateTo) { const dd = (d.created_at || '').slice(0,10); if (dd < f.dateFrom || dd > f.dateTo) return false; }
      return true;
    });
  },

  _reconBuildPageNums(page, totalPages) {
    let pn = ''; const mx = 7;
    let sp = Math.max(1, page - Math.floor(mx/2)), ep = Math.min(totalPages, sp + mx - 1);
    if (ep - sp < mx - 1) sp = Math.max(1, ep - mx + 1);
    if (sp > 1) pn += `<button class="pg-btn" data-pg="1">1</button>`;
    if (sp > 2) pn += `<span class="pg-dots">…</span>`;
    for (let i = sp; i <= ep; i++) pn += `<button class="pg-btn${i===page?' active':''}" data-pg="${i}">${i}</button>`;
    if (ep < totalPages-1) pn += `<span class="pg-dots">…</span>`;
    if (ep < totalPages) pn += `<button class="pg-btn" data-pg="${totalPages}">${totalPages}</button>`;
    return pn;
  },

  _reconRenderDocsTable(area, container) {
    const filtered = Pages._getFilteredReconDocs();
    const total = filtered.length, perPage = Pages._reconPerPage;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    if (Pages._reconPage > totalPages) Pages._reconPage = totalPages;
    const page = Pages._reconPage, start = (page-1)*perPage;
    const pageItems = filtered.slice(start, start+perPage);
    const hasFilter = !!(Pages._reconFilters.search || Pages._reconFilters.status || (Pages._reconFilters.dateFrom && Pages._reconFilters.dateTo));
    const pageNums = Pages._reconBuildPageNums(page, totalPages);
    document.getElementById('reconTotalCount').textContent = `${total} เอกสาร`;

    area.innerHTML = `
      <div class="card">
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>#</th><th>เลขเอกสาร</th><th>วันที่สร้าง</th><th>ผู้บันทึก</th><th>จำนวนรายการ</th><th>สถานะ</th><th style="width:60px"></th></tr></thead>
          <tbody>${pageItems.length===0
            ? '<tr><td colspan="7" class="text-center" style="padding:40px;color:var(--text-muted)">'+(hasFilter?'ไม่พบเอกสารตามตัวกรอง':'ยังไม่มีเอกสารปรับสภาพ')+'</td></tr>'
            : pageItems.map((d,i)=>{
              const sm={processing:{l:'กำลังปรับ',b:'#f59e0b22',c:'#d97706',i:'⏳'},partial:{l:'ปรับบางส่วน',b:'#3b82f622',c:'#2563eb',i:'🔄'},done:{l:'ปรับหมดแล้ว',b:'#10b98122',c:'#059669',i:'✅'}};
              const st=sm[d.calc_status]||sm.processing;
              return `<tr class="clickable-row" data-doc-id="${d.id}" style="cursor:pointer">
                <td>${start+i+1}</td>
                <td><strong style="color:var(--primary)">${App.escapeHTML(d.doc_number)}</strong></td>
                <td>${d.created_at?new Date(d.created_at).toLocaleDateString('th-TH'):'-'}</td>
                <td>${App.escapeHTML(d.inspector_name||'-')}</td>
                <td><span class="badge" style="background:var(--primary);color:#1e1e2e;font-weight:700">${d.item_count||0}</span></td>
                <td><span class="badge" style="background:${st.b};color:${st.c};font-weight:600">${st.i} ${st.l}</span></td>
                <td><button class="btn btn-outline btn-sm" title="ดูรายละเอียด" style="padding:4px 8px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
              </tr>`;}).join('')}
          </tbody>
        </table></div>
        ${totalPages>1?`<div class="pagination-bar" id="reconPagination">
          <button class="pg-btn" data-pg="${Math.max(1,page-1)}" ${page===1?'disabled':''}>‹ ก่อน</button>
          ${pageNums}
          <button class="pg-btn" data-pg="${Math.min(totalPages,page+1)}" ${page===totalPages?'disabled':''}>ถัดไป ›</button>
          <span class="pg-info">หน้า ${page}/${totalPages}</span>
          <select class="pg-per-page" id="reconPerPage"><option value="20" ${perPage===20?'selected':''}>20</option><option value="50" ${perPage===50?'selected':''}>50</option><option value="100" ${perPage===100?'selected':''}>100</option></select>
        </div>`:''}
      </div>`;

    area.querySelectorAll('.clickable-row').forEach(r=>r.addEventListener('click',()=>App.navigateTo('reconditioning/'+r.dataset.docId)));
    area.querySelectorAll('#reconPagination .pg-btn').forEach(b=>b.addEventListener('click',()=>{Pages._reconPage=parseInt(b.dataset.pg);Pages._reconRenderTable(container);}));
    document.getElementById('reconPerPage')?.addEventListener('change',e=>{Pages._reconPerPage=parseInt(e.target.value);Pages._reconPage=1;Pages._reconRenderTable(container);});
  },

  _reconRenderItemsTable(area, container) {
    const items = Pages._reconAllItems, f = Pages._reconFilters;
    let filtered = items;
    if (f.search) { const q=f.search.toLowerCase(); filtered=filtered.filter(it=>[it.doc_number,it.good_code,it.good_name,it.receipt_number,it.branch_name].join(' ').toLowerCase().includes(q)); }
    if (f.status) {
      if (f.status==='processing') filtered=filtered.filter(it=>it.recon_status!=='completed');
      else if (f.status==='partial') filtered=filtered.filter(it=>it.recon_status!=='completed');
      else if (f.status==='done') filtered=filtered.filter(it=>it.recon_status==='completed');
    }
    if (f.dateFrom&&f.dateTo) { filtered=filtered.filter(it=>{const d=(it.doc_created||'').slice(0,10);return d>=f.dateFrom&&d<=f.dateTo;}); }

    const total=filtered.length, perPage=Pages._reconPerPage;
    const totalPages=Math.max(1,Math.ceil(total/perPage));
    if (Pages._reconPage>totalPages) Pages._reconPage=totalPages;
    const page=Pages._reconPage, start=(page-1)*perPage;
    const pageItems=filtered.slice(start,start+perPage);
    const hasFilter=!!(f.search||f.status||(f.dateFrom&&f.dateTo));
    const pageNums=Pages._reconBuildPageNums(page,totalPages);
    document.getElementById('reconTotalCount').textContent=`${total} รายการ`;

    area.innerHTML = `
      <div class="card">
        <div class="table-wrap" style="overflow-x:auto"><table class="data-table">
          <thead><tr><th>#</th><th>เลขเอกสาร</th><th>ใบรับคืน</th><th>สาขา</th><th>ประเภท</th><th>รหัสสินค้า</th><th>ชื่อสินค้า</th><th>Class</th><th>SN</th><th>จำนวน</th><th>คลังปลายทาง</th><th>สาเหตุ</th><th>ผู้ปรับ</th><th>สถานะ</th><th>โอน</th></tr></thead>
          <tbody>${pageItems.length===0
            ? '<tr><td colspan="15" class="text-center" style="padding:40px;color:var(--text-muted)">'+(hasFilter?'ไม่พบรายการตามตัวกรอง':'ยังไม่มีรายการ')+'</td></tr>'
            : pageItems.map((it,i)=>{
              const isDone=it.recon_status==='completed', isTr=parseInt(it.transferred);
              return `<tr style="cursor:pointer" onclick="App.navigateTo('reconditioning/${it.doc_id}')">
                <td>${start+i+1}</td>
                <td><strong style="color:var(--primary)">${App.escapeHTML(it.doc_number||'-')}</strong></td>
                <td style="font-size:0.8rem">${App.escapeHTML(it.receipt_number||'-')}</td>
                <td style="font-size:0.8rem">${App.escapeHTML(it.branch_name||'-')}</td>
                <td style="font-size:0.78rem">${App.escapeHTML(it.return_type||'-')}</td>
                <td><span class="cell-badge">${App.escapeHTML(it.good_code||'-')}</span></td>
                <td style="font-size:0.82rem">${App.escapeHTML(it.good_name||'-')}</td>
                <td style="text-align:center">${it.class?'<span class="badge badge-class">'+App.escapeHTML(it.class)+'</span>':'-'}</td>
                <td style="font-size:0.78rem">${App.escapeHTML(it.serial_number||'-')}</td>
                <td style="text-align:center">${parseInt(it.quantity)||1}</td>
                <td>${it.target_warehouse?'<span style="background:rgba(16,185,129,0.12);color:#10b981;padding:2px 8px;border-radius:8px;font-size:0.78rem;font-weight:500">'+App.escapeHTML(it.target_warehouse)+'</span>':'<span style="color:var(--text-muted)">—</span>'}</td>
                <td style="font-size:0.75rem;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${App.escapeHTML(it.cause_text||'')}">${App.escapeHTML(it.cause_text||'-')}</td>
                <td style="font-size:0.8rem">${App.escapeHTML(it.recon_inspector||'-')}</td>
                <td>${isDone?'<span class="badge" style="background:#10b98122;color:#059669;font-weight:600">✅ เสร็จ</span>':'<span class="badge" style="background:#f59e0b22;color:#d97706;font-weight:600">⏳ ดำเนินการ</span>'}</td>
                <td>${isTr?'<span class="badge" style="background:#3b82f622;color:#2563eb;font-weight:600">🚚</span>':''}</td>
              </tr>`;}).join('')}
          </tbody>
        </table></div>
        ${totalPages>1?`<div class="pagination-bar" id="reconPagination">
          <button class="pg-btn" data-pg="${Math.max(1,page-1)}" ${page===1?'disabled':''}>‹ ก่อน</button>
          ${pageNums}
          <button class="pg-btn" data-pg="${Math.min(totalPages,page+1)}" ${page===totalPages?'disabled':''}>ถัดไป ›</button>
          <span class="pg-info">หน้า ${page}/${totalPages}</span>
          <select class="pg-per-page" id="reconPerPage"><option value="20" ${perPage===20?'selected':''}>20</option><option value="50" ${perPage===50?'selected':''}>50</option><option value="100" ${perPage===100?'selected':''}>100</option></select>
        </div>`:''}
      </div>`;

    area.querySelectorAll('#reconPagination .pg-btn').forEach(b=>b.addEventListener('click',()=>{Pages._reconPage=parseInt(b.dataset.pg);Pages._reconRenderTable(container);}));
    document.getElementById('reconPerPage')?.addEventListener('change',e=>{Pages._reconPerPage=parseInt(e.target.value);Pages._reconPage=1;Pages._reconRenderTable(container);});
  },


  // ── Reconditioning Detail ──────────────────────

  async reconDetail(container, docId) {
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
  },




  _renderReconDetail(container, docId) {
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
  },

  // ── Approvals (ขออนุมัติ) ───────────────────
  _appData: [],
  _appPage: 1,
  _appPerPage: 50,
  _appSearch: '',

  async approvals(container) {
    try {
      const data = await App.api('approvals.php');
      Pages._appData = data.batches || [];
    } catch (e) { console.warn('Approvals API:', e); Pages._appData = []; }

    Pages._appPage = 1;
    Pages._appSearch = '';
    Pages._renderApprovalsList(container);
  },

  _getFilteredApprovals() {
    if (!Pages._appSearch) return Pages._appData;
    const q = Pages._appSearch.toLowerCase();
    return Pages._appData.filter(b =>
      (b.batch_number || '').toLowerCase().includes(q) ||
      (b.batch_type || '').toLowerCase().includes(q) ||
      (b.status || '').toLowerCase().includes(q)
    );
  },


// === APPROVAL ROUNDS ===

  async approvalRounds(container) {
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
  },

  async approvalRoundDetail(container, warehouse, round) {
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
  },

  _printApprovalRoundDoc(items, batches, warehouse, wName, round) {
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
  },

    _renderApprovalsList(container) {
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
  },

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
  },

_updateCombinedPrintBtn() {
    const checked = document.querySelectorAll('.batch-select-cb:checked');
    const btn = document.getElementById('btnPrintCombined');
    if (btn) {
      btn.style.display = checked.length > 0 ? 'inline-flex' : 'none';
      btn.textContent = '';
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 🖨️ พิมพ์เอกสารรวม (' + checked.length + ')';
    }
  },

  // ── Approval Detail (matches reconditioning format) ──
  async approvalDetail(container, batchId) {
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
  },

  _renderPendingItems(items, existingIds = new Set(), isNewDoc = false, disabledWarehouseSet = new Set()) {
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
  },


  // ── Transfers Pending (รอโอน) ──────────────────────
  async transfersPending(container) {
    let allItems = [];
    let whSummary = [];
    let filterWh = '';

    const load = async () => {
      try {
        const url = 'transfers.php' + (filterWh ? `?warehouse=${encodeURIComponent(filterWh)}` : '');
        const data = await App.api(url);
        allItems = (data.items || []).filter(it => !parseInt(it.transferred));
        whSummary = data.warehouse_summary || [];
      } catch (err) {
        console.warn('Transfers API:', err);
        allItems = [];
        whSummary = [];
      }
    };

    await load();

    const render = () => {
      container.innerHTML = `
        <div class="page-section">
          <div class="flex items-center justify-between mb-24" style="flex-wrap:wrap;gap:12px">
            <div>
              <div class="card-title">รอโอน</div>
              <div class="card-subtitle">รายการรอโอนจากคลัง 020 ไปคลังปลายทาง</div>
            </div>
            <div class="flex gap-8 items-center">
              <select id="filterWh" class="form-select" style="max-width:220px;font-size:0.85rem">
                <option value="">ทุกคลัง</option>
                ${whSummary.map(w => `<option value="${App.escapeHTML(w.code)}" ${filterWh===w.code?'selected':''}>${App.escapeHTML(w.code)} — ${App.escapeHTML(w.name)} (${w.pending} รอโอน)</option>`).join('')}
              </select>
              <button class="btn btn-primary" id="btnTransferChecked" style="gap:5px;display:none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/></svg>
                โอนที่เลือก
              </button>
            </div>
          </div>

          <!-- Warehouse Summary Cards -->
          ${whSummary.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:20px">
            ${whSummary.map(w => `
              <div class="card" style="flex:1;min-width:180px;padding:14px 18px;cursor:pointer;border-left:4px solid ${w.pending > 0 ? '#f59e0b' : '#10b981'}" onclick="document.getElementById('filterWh').value='${App.escapeHTML(w.code)}';document.getElementById('filterWh').dispatchEvent(new Event('change'))">
                <div style="font-weight:600;font-size:0.9rem;margin-bottom:4px">${App.escapeHTML(w.code)} — ${App.escapeHTML(w.name)}</div>
                <div style="display:flex;gap:12px;font-size:0.8rem;color:var(--text-muted)">
                  <span>รอโอน: <strong style="color:#f59e0b">${w.pending}</strong></span>
                  <span>โอนแล้ว: <strong style="color:#10b981">${w.transferred}</strong></span>
                  <span>รวม: ${w.total}</span>
                </div>
              </div>
            `).join('')}
          </div>` : ''}

          <div class="card">
            <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--border)">
              <h3 style="margin:0;font-size:0.95rem;color:#f59e0b">⏳ รอโอน (${allItems.length} รายการ)</h3>
            </div>
            <div class="table-wrapper" style="overflow-y:auto">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width:36px"><input type="checkbox" id="cbTransferAll" style="width:16px;height:16px;cursor:pointer"></th>
                    <th>#</th>
                    <th>ใบรับคืน</th>
                    <th>ประเภทรับคืน</th>
                    <th>สาขา</th>
                    <th>รหัสสินค้า</th>
                    <th>ชื่อสินค้า</th>
                    <th>Class</th>
                    <th>SN</th>
                    <th>จำนวน</th>
                    <th>คลังปลายทาง</th>
                    <th>เลข RTV</th>
                    <th>เลขอนุมัติ</th>
                    <th>เหตุผล</th>
                  </tr>
                </thead>
                <tbody>
                  ${allItems.length === 0
                    ? '<tr><td colspan="14" class="text-center" style="padding:24px;color:var(--text-muted)">🎉 ไม่มีรายการรอโอน</td></tr>'
                    : allItems.map((it, i) => `
                    <tr>
                      <td style="text-align:center"><input type="checkbox" class="transfer-cb" data-recon-id="${it.recon_id}" style="width:16px;height:16px;cursor:pointer"></td>
                      <td>${i+1}</td>
                      <td><span class="cell-badge">${App.escapeHTML(it.receipt_number||'-')}</span></td>
                      <td style="font-size:0.78rem">${App.escapeHTML(it.return_type||'-')}</td>
                      <td style="font-size:0.78rem">${App.escapeHTML(it.branch_name||'-')}</td>
                      <td><span class="cell-badge">${App.escapeHTML(it.good_code||'-')}</span></td>
                      <td style="font-size:0.82rem">${App.escapeHTML(it.good_name||'-')}</td>
                      <td style="text-align:center">${it.class ? '<span class="badge badge-class">'+App.escapeHTML(it.class)+'</span>' : '-'}</td>
                      <td style="font-size:0.78rem">${App.escapeHTML(it.serial_number||'-')}</td>
                      <td style="text-align:center">${parseInt(it.quantity)||1}</td>
                      <td><span style="background:rgba(245,158,11,0.12);color:#f59e0b;padding:2px 8px;border-radius:8px;font-size:0.78rem;font-weight:500">${App.escapeHTML(it.target_warehouse||'')} ${App.escapeHTML(it.warehouse_name||'')}</span></td>
                      <td>${it.recon_doc_number ? '<a href="#reconditioning/'+it.recon_doc_id+'" class="cell-badge" style="cursor:pointer;color:var(--primary);text-decoration:underline" title="ดูรายละเอียดเอกสารปรับสภาพ">'+App.escapeHTML(it.recon_doc_number)+'</a>' : '<span style="color:var(--text-muted)">-</span>'}</td>
                      <td>${it.batch_number ? '<a href="#approvals/'+it.batch_id+'" class="cell-badge" style="cursor:pointer;color:#10b981;text-decoration:underline" title="ดูรายละเอียดชุดอนุมัติ">'+App.escapeHTML(it.batch_number)+'</a>' : '<span style="color:var(--text-muted)">-</span>'}</td>
                      <td style="font-size:0.75rem">${App.escapeHTML(it.cause_text||'-')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // ── Event bindings ──
      document.getElementById('filterWh')?.addEventListener('change', async (e) => {
        filterWh = e.target.value;
        await load();
        render();
      });

      document.getElementById('cbTransferAll')?.addEventListener('change', (e) => {
        document.querySelectorAll('.transfer-cb').forEach(cb => cb.checked = e.target.checked);
        updateTransferBtn();
      });

      container.querySelectorAll('.transfer-cb').forEach(cb => {
        cb.addEventListener('change', updateTransferBtn);
      });

      // Transfer button
      document.getElementById('btnTransferChecked')?.addEventListener('click', async () => {
        const checked = Array.from(document.querySelectorAll('.transfer-cb:checked'));
        if (checked.length === 0) return;
        const reconIds = checked.map(cb => parseInt(cb.dataset.reconId));

        if (!await App.confirmDialog({
          title: 'ยืนยันการโอน',
          message: 'โอน ' + reconIds.length + ' รายการ ออกจากคลัง 020 ไปคลังปลายทาง?',
          type: 'success',
          confirmText: '✓ โอนเลย (' + reconIds.length + ')'
        })) return;

        try {
          await App.api('transfers.php', { method: 'PUT', body: { action: 'mark_transferred', recon_ids: reconIds } });
          App.toast('โอนสำเร็จ ' + reconIds.length + ' รายการ', 'success');
          await load();
          render();
        } catch (err) { App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error'); }
      });
    };

    const updateTransferBtn = () => {
      const checked = document.querySelectorAll('.transfer-cb:checked');
      const btn = document.getElementById('btnTransferChecked');
      if (btn) {
        btn.style.display = checked.length > 0 ? 'inline-flex' : 'none';
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/></svg> โอนที่เลือก (' + checked.length + ')';
      }
    };

    render();
  },

  // ── Transfers Done (โอนแล้ว) ──────────────────────
  async transfersDone(container) {
    let allItems = [];
    let filterWh = '';

    const load = async () => {
      try {
        const url = 'transfers.php' + (filterWh ? `?warehouse=${encodeURIComponent(filterWh)}` : '');
        const data = await App.api(url);
        allItems = (data.items || []).filter(it => parseInt(it.transferred));
      } catch (err) {
        console.warn('Transfers API:', err);
        allItems = [];
      }
    };

    await load();

    // Get unique warehouse list from items
    const whList = [...new Map(allItems.map(it => [it.target_warehouse, { code: it.target_warehouse, name: it.warehouse_name }])).values()];

    const render = () => {
      const filtered = filterWh ? allItems.filter(it => it.target_warehouse === filterWh) : allItems;
      const fmtDate = (d) => { if (!d) return '-'; const ds = String(d).split(' ')[0]; return new Date(ds + 'T00:00:00').toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }); };

      container.innerHTML = `
        <div class="page-section">
          <div class="flex items-center justify-between mb-24" style="flex-wrap:wrap;gap:12px">
            <div>
              <div class="card-title">โอนแล้ว</div>
              <div class="card-subtitle">รายการที่โอนจากคลัง 020 ไปคลังปลายทางเรียบร้อยแล้ว</div>
            </div>
            <div class="flex gap-8 items-center">
              <select id="filterWhDone" class="form-select" style="max-width:220px;font-size:0.85rem">
                <option value="">ทุกคลัง (${allItems.length})</option>
                ${whList.map(w => `<option value="${App.escapeHTML(w.code)}" ${filterWh===w.code?'selected':''}>${App.escapeHTML(w.code)} — ${App.escapeHTML(w.name||w.code)}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="card">
            <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--border)">
              <h3 style="margin:0;font-size:0.95rem;color:#10b981">✅ โอนแล้ว (${filtered.length} รายการ)</h3>
            </div>
            <div class="table-wrapper" style="overflow-y:auto">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ใบรับคืน</th>
                    <th>ประเภทรับคืน</th>
                    <th>สาขา</th>
                    <th>รหัสสินค้า</th>
                    <th>ชื่อสินค้า</th>
                    <th>Class</th>
                    <th>SN</th>
                    <th>จำนวน</th>
                    <th>คลังปลายทาง</th>
                    <th>เลข RTV</th>
                    <th>วันที่โอน</th>
                    <th style="width:80px"></th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered.length === 0
                    ? '<tr><td colspan="13" class="text-center" style="padding:24px;color:var(--text-muted)">ยังไม่มีรายการโอน</td></tr>'
                    : filtered.map((it, i) => `
                    <tr>
                      <td>${i+1}</td>
                      <td><span class="cell-badge">${App.escapeHTML(it.receipt_number||'-')}</span></td>
                      <td style="font-size:0.78rem">${App.escapeHTML(it.return_type||'-')}</td>
                      <td style="font-size:0.78rem">${App.escapeHTML(it.branch_name||'-')}</td>
                      <td><span class="cell-badge">${App.escapeHTML(it.good_code||'-')}</span></td>
                      <td style="font-size:0.82rem">${App.escapeHTML(it.good_name||'-')}</td>
                      <td style="text-align:center">${it.class ? '<span class="badge badge-class">'+App.escapeHTML(it.class)+'</span>' : '-'}</td>
                      <td style="font-size:0.78rem">${App.escapeHTML(it.serial_number||'-')}</td>
                      <td style="text-align:center">${parseInt(it.quantity)||1}</td>
                      <td><span style="background:rgba(16,185,129,0.12);color:#10b981;padding:2px 8px;border-radius:8px;font-size:0.78rem;font-weight:500">${App.escapeHTML(it.target_warehouse||'')} ${App.escapeHTML(it.warehouse_name||'')}</span></td>
                      <td>${it.recon_doc_number ? '<a href="#reconditioning/'+it.recon_doc_id+'" class="cell-badge" style="cursor:pointer;color:var(--primary);text-decoration:underline">'+App.escapeHTML(it.recon_doc_number)+'</a>' : '-'}</td>
                      <td style="font-size:0.8rem;color:var(--text-muted)">${fmtDate(it.transferred_date)}</td>
                      <td><button class="btn btn-outline btn-sm undo-transfer" data-recon-id="${it.recon_id}" style="font-size:0.7rem;padding:2px 8px;white-space:nowrap">↩ ยกเลิก</button></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // ── Event bindings ──
      document.getElementById('filterWhDone')?.addEventListener('change', (e) => {
        filterWh = e.target.value;
        render();
      });

      // Undo transfer buttons
      container.querySelectorAll('.undo-transfer').forEach(btn => {
        btn.addEventListener('click', async () => {
          const reconId = parseInt(btn.dataset.reconId);
          if (!await App.confirmDialog({
            title: 'ยกเลิกการโอน',
            message: 'ต้องการยกเลิกโอนรายการนี้กลับเป็น "รอโอน" หรือไม่?\nรายการจะกลับไปสามารถเปลี่ยนคลังปลายทางได้อีกครั้ง',
            type: 'warning',
            confirmText: '⟲ ยกเลิกการโอน'
          })) return;
          try {
            await App.api('transfers.php', { method: 'PUT', body: { action: 'unmark_transferred', recon_ids: [reconId] } });
            App.toast('⟲ ยกเลิกการโอนสำเร็จ', 'success');
            await load();
            render();
          } catch (err) { App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error'); }
        });
      });
    };

    render();
  },


  // ── Products (สินค้า) ──────────────────────
  _productsData: [],
  _prodPage: 1,
  _prodPerPage: 50,
  _prodSearch: '',

  async products(container) {
    try {
      const data = await App.api('products.php');
      Pages._productsData = data.products || [];
    } catch (e) { console.warn('Products API:', e); Pages._productsData = []; }

    Pages._prodPage = 1;
    Pages._prodSearch = '';
    Pages._prodClassFilter = new Set();
    Pages._renderProducts(container);
  },

  _getFilteredProducts() {
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
  },

  _renderProducts(container) {
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
  },

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
  },

  _getProductType(code) {
    const prefix = String(code).replace(/[^0-9\-]/g, '').substring(0, 2);
    return Pages._productTypeMap[prefix] || null;
  },

  _showAddProductForm() {
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
  },

  showProductImport() {
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
  },

  // ── Settings (ตั้งค่า) ───────────────────────
  _settingsTab: 'warehouses',

  async settings(container) {
    container.innerHTML = `
      <div class="settings-tabs">
        <button class="settings-tab${Pages._settingsTab === 'warehouses' ? ' active' : ''}" data-tab="warehouses">🏭 คลังสินค้า</button>
        <button class="settings-tab${Pages._settingsTab === 'return_types' ? ' active' : ''}" data-tab="return_types">📦 ประเภทรับคืน</button>
        <button class="settings-tab${Pages._settingsTab === 'users' ? ' active' : ''}" data-tab="users">👥 ผู้ใช้งาน</button>
      </div>
      <div id="settingsContent"><div class="spinner"></div></div>
    `;
    container.querySelectorAll('.settings-tab').forEach(btn => {
      btn.onclick = () => {
        Pages._settingsTab = btn.dataset.tab;
        Pages.settings(container);
      };
    });
    const content = container.querySelector('#settingsContent');
    switch (Pages._settingsTab) {
      case 'warehouses': await Pages._renderWarehousesSettings(content); break;
      case 'return_types': await Pages._renderReturnTypesSettings(content); break;
      case 'users': await Pages._renderUsersSettings(content); break;
    }
  },

  async _renderWarehousesSettings(content) {
    let warehouses = [];
    try {
      const data = await App.api('settings.php?type=warehouses');
      warehouses = data.warehouses || [];
    } catch (e) { console.warn(e); }

    content.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <h3 style="margin:0 0 12px;font-size:1rem">เพิ่มคลังใหม่</h3>
        <div class="settings-inline-form" id="addWarehouseForm">
          <div class="form-group">
            <label>รหัสคลัง</label>
            <input type="text" id="newWhCode" placeholder="e.g. 001">
          </div>
          <div class="form-group" style="flex:2">
            <label>ชื่อคลัง</label>
            <input type="text" id="newWhName" placeholder="e.g. คลังตัวดี">
          </div>
          <button class="btn btn-primary btn-sm" id="btnAddWh">เพิ่ม</button>
        </div>
      </div>
      <div class="card">
        <h3 style="margin:0 0 4px;font-size:1rem">ลำดับความสำคัญ (ลากเพื่อจัดลำดับ)</h3>
        <p style="margin:0 0 12px;font-size:0.8rem;color:var(--text-muted)">ลำดับ 1 = สำคัญสูงสุด · ใช้กำหนดว่าต้องขออนุมัติหรือไม่</p>
        <ul class="sortable-list" id="warehouseList">
          ${warehouses.map((w, i) => `
            <li class="sortable-item" draggable="true" data-id="${w.id}">
              <div class="sortable-handle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01"/></svg>
              </div>
              <div class="sortable-rank">${i + 1}</div>
              <div class="sortable-content">
                <div class="sortable-title">${App.escapeHTML(w.name)}</div>
                <div class="sortable-subtitle">รหัส: ${App.escapeHTML(w.code)}</div>
              </div>
              <span class="sortable-badge ${w.is_active ? 'active' : 'inactive'}">${w.is_active ? 'Active' : 'Inactive'}</span>
              <button class="btn btn-outline btn-sm" onclick="Pages._toggleWarehouse(${w.id}, ${w.is_active ? 0 : 1})">
                ${w.is_active ? 'ปิด' : 'เปิด'}
              </button>
            </li>
          `).join('')}
        </ul>
      </div>
    `;

    // Add warehouse
    document.getElementById('btnAddWh').onclick = async () => {
      const code = document.getElementById('newWhCode').value.trim();
      const name = document.getElementById('newWhName').value.trim();
      if (!code || !name) return App.toast('กรุณากรอกข้อมูลให้ครบ', 'warning');
      try {
        await App.api('settings.php?type=warehouses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', code, name })
        });
        App.toast('✓ เพิ่มคลังสำเร็จ', 'success');
        Pages._renderWarehousesSettings(content);
      } catch (e) { App.toast('ผิดพลาด: ' + e.message, 'error'); }
    };

    // Drag & drop
    Pages._initSortable('warehouseList', 'warehouses');
  },

  async _toggleWarehouse(id, is_active) {
    try {
      await App.api('settings.php?type=warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id, is_active })
      });
      App.toast('✓ อัปเดตสำเร็จ', 'success');
      const content = document.getElementById('settingsContent');
      if (content) Pages._renderWarehousesSettings(content);
    } catch (e) { App.toast('ผิดพลาด: ' + e.message, 'error'); }
  },

  async _renderReturnTypesSettings(content) {
    let types = [], warehouses = [];
    try {
      const [tData, wData] = await Promise.all([
        App.api('settings.php?type=return_types'),
        App.api('settings.php?type=warehouses')
      ]);
      types = tData.return_types || [];
      warehouses = wData.warehouses || [];
    } catch (e) { console.warn(e); }

    const catLabel = c => c === 'exchange' ? '🔄 เบิกเปลี่ยน' : '📥 รับคืน';

    content.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <h3 style="margin:0 0 12px;font-size:1rem">เพิ่มประเภทใหม่</h3>
        <div class="settings-inline-form" id="addReturnTypeForm">
          <div class="form-group" style="flex:2">
            <label>ชื่อประเภท</label>
            <input type="text" id="newRtName" placeholder="e.g. รับคืนเครดิต">
          </div>
          <div class="form-group">
            <label>หมวด</label>
            <select id="newRtCategory">
              <option value="return">รับคืน</option>
              <option value="exchange">เบิกเปลี่ยน</option>
            </select>
          </div>
          <div class="form-group">
            <label>คลังตั้งต้น</label>
            <select id="newRtWarehouse">
              <option value="">- เลือก -</option>
              ${warehouses.filter(w => w.is_active).map(w => `<option value="${w.id}">${w.code} - ${App.escapeHTML(w.name)}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-primary btn-sm" id="btnAddRt">เพิ่ม</button>
        </div>
      </div>
      <div class="card">
        <h3 style="margin:0 0 4px;font-size:1rem">ลำดับความสำคัญ (ลากเพื่อจัดลำดับ)</h3>
        <p style="margin:0 0 12px;font-size:0.8rem;color:var(--text-muted)">ลำดับ 1 = สำคัญสูงสุด · ใช้กำหนดว่าต้องขออนุมัติหรือไม่</p>
        <ul class="sortable-list" id="returnTypeList">
          ${types.map((rt, i) => `
            <li class="sortable-item" draggable="true" data-id="${rt.id}">
              <div class="sortable-handle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01"/></svg>
              </div>
              <div class="sortable-rank">${i + 1}</div>
              <div class="sortable-content">
                <div class="sortable-title">${App.escapeHTML(rt.name)}</div>
                <div class="sortable-subtitle">${catLabel(rt.category)} · คลังตั้งต้น: ${rt.warehouse_code ? rt.warehouse_code + ' - ' + App.escapeHTML(rt.warehouse_name || '') : '-'}</div>
              </div>
              <span class="sortable-badge ${rt.is_active ? 'active' : 'inactive'}">${rt.is_active ? 'Active' : 'Inactive'}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;

    // Add return type
    document.getElementById('btnAddRt').onclick = async () => {
      const name = document.getElementById('newRtName').value.trim();
      const category = document.getElementById('newRtCategory').value;
      const whId = document.getElementById('newRtWarehouse').value;
      if (!name) return App.toast('กรุณากรอกชื่อประเภท', 'warning');
      try {
        await App.api('settings.php?type=return_types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', name, category, default_warehouse_id: whId || null })
        });
        App.toast('✓ เพิ่มประเภทสำเร็จ', 'success');
        Pages._renderReturnTypesSettings(content);
      } catch (e) { App.toast('ผิดพลาด: ' + e.message, 'error'); }
    };

    Pages._initSortable('returnTypeList', 'return_types');
  },

  async _renderUsersSettings(content) {
    let users = [];
    try {
      const data = await App.api('users.php');
      users = data.users || [];
    } catch (e) { console.warn(e); }

    const isAdmin = Auth.user && Auth.user.role === 'admin';

    content.innerHTML = `
      ${isAdmin ? `
      <div class="card" style="margin-bottom:16px">
        <h3 style="margin:0 0 12px;font-size:1rem">เพิ่มผู้ใช้ใหม่</h3>
        <div class="settings-inline-form">
          <div class="form-group">
            <label>Username</label>
            <input type="text" id="newUserName" placeholder="username">
          </div>
          <div class="form-group">
            <label>ชื่อที่แสดง</label>
            <input type="text" id="newUserDisplay" placeholder="ชื่อ-สกุล">
          </div>
          <div class="form-group">
            <label>รหัสผ่าน</label>
            <input type="password" id="newUserPass" placeholder="password">
          </div>
          <div class="form-group" style="flex:0.5">
            <label>Role</label>
            <select id="newUserRole">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button class="btn btn-primary btn-sm" id="btnAddUser">เพิ่ม</button>
        </div>
      </div>` : ''}
      <div class="card">
        <h3 style="margin:0 0 12px;font-size:1rem">รายชื่อผู้ใช้งาน</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Username</th>
                <th>ชื่อที่แสดง</th>
                <th>Role</th>
                <th>สถานะ</th>
                <th>Login ล่าสุด</th>
                ${isAdmin ? '<th>จัดการ</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${users.map((u, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td><strong>${App.escapeHTML(u.username)}</strong></td>
                  <td>${App.escapeHTML(u.display_name)}</td>
                  <td><span class="badge ${u.role === 'admin' ? 'badge-primary' : 'badge-muted'}">${u.role}</span></td>
                  <td><span class="sortable-badge ${u.is_active ? 'active' : 'inactive'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>${u.last_login || '-'}</td>
                  ${isAdmin ? `<td>
                    <button class="btn btn-outline btn-sm" onclick="Pages._toggleUser(${u.id}, ${u.is_active ? 0 : 1})">
                      ${u.is_active ? 'ปิด' : 'เปิด'}
                    </button>
                  </td>` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    if (isAdmin) {
      document.getElementById('btnAddUser').onclick = async () => {
        const username = document.getElementById('newUserName').value.trim();
        const display_name = document.getElementById('newUserDisplay').value.trim();
        const password = document.getElementById('newUserPass').value;
        const role = document.getElementById('newUserRole').value;
        if (!username || !display_name || !password) return App.toast('กรุณากรอกข้อมูลให้ครบ', 'warning');
        try {
          await App.api('users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, display_name, role })
          });
          App.toast('✓ เพิ่มผู้ใช้สำเร็จ', 'success');
          Pages._renderUsersSettings(content);
        } catch (e) { App.toast('ผิดพลาด: ' + e.message, 'error'); }
      };
    }
  },

  async _toggleUser(id, is_active) {
    try {
      await App.api('users.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active })
      });
      App.toast('✓ อัปเดตสำเร็จ', 'success');
      const content = document.getElementById('settingsContent');
      if (content) Pages._renderUsersSettings(content);
    } catch (e) { App.toast('ผิดพลาด: ' + e.message, 'error'); }
  },

  // ── Drag & Drop helper ─────────────────────
  _initSortable(listId, table) {
    const list = document.getElementById(listId);
    if (!list) return;
    let dragItem = null;

    list.querySelectorAll('.sortable-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        dragItem = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        list.querySelectorAll('.sortable-item').forEach(el => el.classList.remove('drag-over'));
        dragItem = null;
        // Save new order
        const order = [...list.querySelectorAll('.sortable-item')].map(el => parseInt(el.dataset.id));
        Pages._saveOrder(table, order);
        // Update rank numbers
        list.querySelectorAll('.sortable-rank').forEach((el, i) => el.textContent = i + 1);
      });
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (item !== dragItem) {
          item.classList.add('drag-over');
          const rect = item.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (e.clientY < midY) {
            list.insertBefore(dragItem, item);
          } else {
            list.insertBefore(dragItem, item.nextSibling);
          }
        }
      });
      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });
    });
  },

  async _saveOrder(table, order) {
    try {
      await App.api('settings.php?type=reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, order })
      });
    } catch (e) {
      App.toast('บันทึกลำดับไม่สำเร็จ: ' + e.message, 'error');
    }
  },

  // ═══════════════════════════════════════════════════
  // ███  MASTER RECONDITIONING LIST  ████████████████
  // ═══════════════════════════════════════════════════
  async masterRecon(container) {
    let items = [];
    let warehouses = [];
    try {
      const [itemsRes, whRes] = await Promise.all([
        App.api('reconditioning.php?master_list=1'),
        App.api('reconditioning.php?warehouses=1'),
      ]);
      items = itemsRes.items || [];
      warehouses = (whRes.warehouses || []).filter(w => w.code !== '020');
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><h3>เกิดข้อผิดพลาด</h3><p>${err.message}</p></div>`;
      return;
    }

    const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-';

    // Build warehouse column headers
    const whHeaders = warehouses.map(w =>
      `<th class="ml-wh-th" title="${App.escapeHTML(w.name)}">${App.escapeHTML(w.code)}</th>`
    ).join('');

    // Build warehouse filter options — only show warehouses that have items, with counts
    const whCounts = {};
    items.forEach(r => {
      const tw = r.target_warehouse;
      if (tw) {
        if (!whCounts[tw]) whCounts[tw] = { code: tw, name: '', count: 0 };
        whCounts[tw].count++;
      }
    });
    warehouses.forEach(w => { if (whCounts[w.code]) whCounts[w.code].name = w.name; });
    const noWhCount = items.filter(r => !r.target_warehouse).length;
    const whOptions = Object.values(whCounts).sort((a,b) => b.count - a.count)
      .map(w => `<option value="${App.escapeHTML(w.code)}">${App.escapeHTML(w.code)} — ${App.escapeHTML(w.name)} (${w.count})</option>`).join('');

    const selectStyle = 'font-size:0.82rem;padding:7px 12px;border:1px solid var(--border-color);border-radius:10px;background:var(--bg-card);color:var(--text-primary);cursor:pointer;outline:none;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23888\' stroke-width=\'2\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:30px';

    container.innerHTML = `
    <div class="ml-controls" style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">
      <div style="display:flex;flex:1;min-width:200px;gap:0">
        <input id="mlSearch" type="text" placeholder="🔍 ค้นหา รหัส/ชื่อ/เอกสาร/สาขา..." style="flex:1;padding:7px 12px;border:1px solid var(--border-color);border-radius:10px 0 0 10px;font-size:0.82rem;background:var(--bg-card)">
        <button id="mlSearchBtn" class="btn btn-primary" style="border-radius:0 10px 10px 0;padding:7px 14px;font-size:0.78rem;white-space:nowrap">ค้นหา</button>
        <button id="mlClearBtn" class="btn btn-outline" style="border-radius:10px;padding:7px 10px;font-size:0.78rem;margin-left:6px;display:none;white-space:nowrap">✕ ล้าง</button>
      </div>
      <div class="glass-dropdown down" id="mlFilterWh" style="min-width:180px;width:auto;flex:0 0 auto">
        <button type="button" class="glass-dropdown-trigger" data-value="" style="padding:7px 14px;font-size:0.82rem;border-radius:10px;background:var(--bg-card);border:1px solid var(--border-color);color:var(--text-primary)">
          <span class="gd-label">โอนไปยังคลัง..</span>
          <svg class="glass-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="glass-dropdown-panel">
          <div class="glass-dropdown-option selected" data-value=""><span class="gd-check">✓</span> ทั้งหมด</div>
          ${noWhCount > 0 ? `<div class="glass-dropdown-option" data-value="_none"><span class="gd-check"></span> ⚠ ยังไม่ระบุคลัง (${noWhCount})</div>` : ''}
          ${Object.values(whCounts).sort((a,b) => b.count - a.count).map(w => `<div class="glass-dropdown-option" data-value="${App.escapeHTML(w.code)}"><span class="gd-check"></span> ${App.escapeHTML(w.code)} — ${App.escapeHTML(w.name)} (${w.count})</div>`).join('')}
        </div>
      </div>
      <div class="glass-dropdown down" id="mlFilterStatus" style="min-width:160px;width:auto;flex:0 0 auto">
        <button type="button" class="glass-dropdown-trigger" data-value="" style="padding:7px 14px;font-size:0.82rem;border-radius:10px;background:var(--bg-card);border:1px solid var(--border-color);color:var(--text-primary)">
          <span class="gd-label">สถานะทั้งหมด</span>
          <svg class="glass-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="glass-dropdown-panel">
          <div class="glass-dropdown-option selected" data-value=""><span class="gd-check">✓</span> สถานะทั้งหมด</div>
          <div class="glass-dropdown-option" data-value="pending"><span class="gd-check"></span> ⏳ รอดำเนินการ</div>
          <div class="glass-dropdown-option" data-value="completed"><span class="gd-check"></span> ✅ เสร็จแล้ว</div>
          <div class="glass-dropdown-option" data-value="transferred"><span class="gd-check"></span> 🚚 โอนแล้ว</div>
        </div>
      </div>
      <span style="font-size:0.75rem;color:var(--text-muted);white-space:nowrap" id="mlCount">${items.length} รายการ</span>
    </div>
    <div class="ml-table-wrap" style="overflow:auto;max-height:calc(100vh - 160px);border:1px solid var(--border-color);border-radius:8px">
      <table class="ml-table" style="width:max-content;min-width:100%;border-collapse:collapse;font-size:0.75rem">
        <thead>
          <tr style="position:sticky;top:0;z-index:5">
            <th class="ml-th" style="min-width:30px">#</th>
            <th class="ml-th" style="min-width:120px">เลขที่เอกสาร</th>
            <th class="ml-th" style="min-width:70px">วันที่ส่งคืน</th>
            <th class="ml-th" style="min-width:70px">วันที่รับเข้า</th>
            <th class="ml-th" style="min-width:70px">วันที่ส่งปรับ</th>
            <th class="ml-th" style="min-width:100px">เลขใบรับคืน</th>
            <th class="ml-th" style="min-width:100px">สาขา/ลูกค้า</th>
            <th class="ml-th" style="min-width:80px">ประเภท</th>
            <th class="ml-th" style="min-width:80px">รหัสสินค้า</th>
            <th class="ml-th" style="min-width:140px">รายการสินค้า</th>
            ${whHeaders}
            <th class="ml-th" style="min-width:120px">ข้อมูลถอดอะไหล่</th>
            <th class="ml-th" style="min-width:120px">สาเหตุ</th>
            <th class="ml-th" style="min-width:80px">ผู้ปรับ</th>
          </tr>
        </thead>
        <tbody id="mlBody">
          ${items.map((r, i) => Pages._masterReconRow(r, i, warehouses)).join('')}
        </tbody>
      </table>
    </div>`;

    // ── Inject styles ──
    if (!document.getElementById('mlStyles')) {
      const sty = document.createElement('style');
      sty.id = 'mlStyles';
      sty.textContent = `
        .ml-table-wrap { overflow-x:auto!important;overflow-y:auto;-webkit-overflow-scrolling:touch;width:100% }
        .ml-table-wrap::-webkit-scrollbar { height:10px }
        .ml-table-wrap::-webkit-scrollbar-track { background:var(--bg-input);border-radius:5px }
        .ml-table-wrap::-webkit-scrollbar-thumb { background:var(--accent-blue);border-radius:5px }
        .ml-table-wrap::-webkit-scrollbar-thumb:hover { background:var(--accent-blue-light) }

        .ml-th { background:var(--bg-table-header);color:var(--text-white);padding:6px 8px;text-align:center;font-weight:600;white-space:nowrap;border:1px solid var(--border-color);font-size:0.72rem }
        .ml-wh-th { background:#0d9488;color:#fff;padding:6px 4px;text-align:center;font-weight:600;white-space:nowrap;border:1px solid rgba(255,255,255,0.15);font-size:0.7rem;min-width:40px }
        [data-theme="light"] .ml-wh-th { background:#0f766e }

        .ml-td { padding:4px 6px;border:1px solid var(--border-color);white-space:nowrap;vertical-align:middle;color:var(--text-primary) }
        .ml-td a { color:var(--accent-blue-light);text-decoration:none;font-weight:500 }
        [data-theme="light"] .ml-td a { color:var(--accent-blue) }
        .ml-td-wrap { padding:4px 6px;border:1px solid var(--border-color);vertical-align:middle;min-width:100px;color:var(--text-primary) }

        .ml-wh-td { text-align:center;padding:4px 2px;border:1px solid var(--border-color);cursor:pointer;vertical-align:middle;background:var(--bg-card) }
        .ml-wh-td:hover { background:var(--accent-green-bg) }
        .ml-wh-td.active { background:var(--accent-green-bg) }

        .ml-radio { width:16px;height:16px;cursor:pointer;accent-color:#059669 }

        .ml-inline-input { border:none;border-bottom:1px dashed var(--border-color);background:transparent;width:100%;font-size:0.75rem;padding:2px 4px;outline:none;color:var(--text-primary) }
        .ml-inline-input::placeholder { color:var(--text-muted) }
        .ml-inline-input:focus { border-bottom-color:var(--accent-blue);background:var(--bg-input) }

        .ml-table { background:var(--bg-card) }
        .ml-table tbody tr { background:var(--bg-card) }
        .ml-table tbody tr:nth-child(even) { background:var(--bg-card-hover) }
        .ml-table tbody tr:hover { background:var(--bg-row-hover) }

        /* Transferred / Locked styles */
        tr.ml-transferred { background:#f0fdf4 !important; opacity:0.7 }
        tr.ml-transferred:hover { opacity:0.85 }
        .ml-wh-td.locked { cursor:not-allowed }
        .ml-wh-td.locked .ml-radio { cursor:not-allowed; pointer-events:none }
        .ml-inline-input:disabled { opacity:0.5; cursor:not-allowed; border-bottom-style:solid; border-bottom-color:transparent }
      `;
      document.head.appendChild(sty);
    }

    // ── Resize table wrap on sidebar toggle ──
    const setWrapWidth = () => {
      const sb = document.querySelector('.sidebar');
      const collapsed = sb?.classList.contains('collapsed');
      const sidebarW = collapsed ? 70 : 260;
      const wrap = container.querySelector('.ml-table-wrap');
      if (wrap) wrap.style.maxWidth = `calc(100vw - ${sidebarW}px - 60px)`;
    };
    setWrapWidth();
    const sbToggle = document.getElementById('sidebarToggle');
    if (sbToggle) sbToggle.addEventListener('click', () => setTimeout(setWrapWidth, 450));

    // ── Search / Filter ──
    const searchInput = container.querySelector('#mlSearch');
    const searchBtn = container.querySelector('#mlSearchBtn');
    const clearBtn = container.querySelector('#mlClearBtn');
    const filterWhDd = container.querySelector('#mlFilterWh');
    const filterStatusDd = container.querySelector('#mlFilterStatus');
    const countEl = container.querySelector('#mlCount');

    let searchQuery = '';

    const filterRows = () => {
      const q = searchQuery.toLowerCase();
      const whFilter = filterWhDd.querySelector('.glass-dropdown-trigger').dataset.value;
      const statusFilter = filterStatusDd.querySelector('.glass-dropdown-trigger').dataset.value;
      let visible = 0;

      container.querySelectorAll('#mlBody tr').forEach(tr => {
        const text = tr.textContent.toLowerCase();
        const status = tr.dataset.status || 'pending';
        const transferred = tr.dataset.transferred === '1';

        // Search match
        const matchSearch = !q || text.includes(q);

        // Warehouse match
        let matchWh = true;
        if (whFilter === '_none') {
          // Show rows with no warehouse selected
          const hasWh = tr.querySelector('.ml-wh-td.active');
          matchWh = !hasWh;
        } else if (whFilter) {
          const radio = tr.querySelector(`.ml-wh-radio[value="${whFilter}"]`);
          matchWh = radio && radio.checked;
        }

        // Status match
        let matchStatus = true;
        if (statusFilter === 'pending') {
          matchStatus = status === 'pending';
        } else if (statusFilter === 'completed') {
          matchStatus = status === 'completed' && !transferred;
        } else if (statusFilter === 'transferred') {
          matchStatus = transferred;
        }

        const show = matchSearch && matchWh && matchStatus;
        tr.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      countEl.textContent = `${visible} รายการ`;
    };

    // Search button click
    searchBtn.addEventListener('click', () => {
      searchQuery = searchInput.value;
      clearBtn.style.display = searchQuery ? 'inline-flex' : 'none';
      filterRows();
    });

    // Enter key triggers search
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        searchBtn.click();
      }
    });

    // Clear button
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearBtn.style.display = 'none';
      filterRows();
    });

    // Glass dropdown interactive behavior
    container.querySelectorAll('.ml-controls .glass-dropdown').forEach(dd => {
      const trigger = dd.querySelector('.glass-dropdown-trigger');
      const panel = dd.querySelector('.glass-dropdown-panel');
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        container.querySelectorAll('.ml-controls .glass-dropdown-panel.open').forEach(p => { if (p !== panel) { p.classList.remove('open'); p.parentElement.querySelector('.glass-dropdown-trigger').classList.remove('open'); } });
        panel.classList.toggle('open');
        trigger.classList.toggle('open');
      });
      panel.querySelectorAll('.glass-dropdown-option').forEach(opt => {
        opt.addEventListener('click', () => {
          trigger.dataset.value = opt.dataset.value;
          trigger.querySelector('.gd-label').textContent = opt.textContent.trim();
          panel.querySelectorAll('.glass-dropdown-option').forEach(o => { o.classList.remove('selected'); o.querySelector('.gd-check').textContent = ''; });
          opt.classList.add('selected');
          opt.querySelector('.gd-check').textContent = '✓';
          panel.classList.remove('open');
          trigger.classList.remove('open');
          filterRows();
        });
      });
    });
    document.addEventListener('click', () => { container.querySelectorAll('.ml-controls .glass-dropdown-panel.open').forEach(p => { p.classList.remove('open'); p.parentElement.querySelector('.glass-dropdown-trigger').classList.remove('open'); }); });

    // ── Warehouse radio clicks ──
    container.querySelectorAll('.ml-wh-radio').forEach(radio => {
      radio.addEventListener('change', async () => {
        const tr = radio.closest('tr');
        if (tr.dataset.transferred === '1') {
          App.toast('🔒 รายการนี้โอนแล้ว — ต้องยกเลิกโอนก่อนถึงจะเปลี่ยนคลังได้', 'error');
          radio.checked = false;
          return;
        }
        const reconId = radio.dataset.reconId;
        const code = radio.value;
        const needsReason = ['105', '109'].includes(code);
        try {
          await App.api('reconditioning.php', {
            method: 'PUT',
            body: { id: parseInt(reconId), target_warehouse: code, status: 'completed' }
          });
          // Update row visual
          const tr = radio.closest('tr');
          tr.dataset.status = 'completed';
          // Re-apply filter so completed items hide if pending-only is checked
          filterRows();
          App.toast('✓ บันทึกคลัง ' + code, 'success');
        } catch (err) {
          App.toast('ผิดพลาด: ' + err.message, 'error');
          radio.checked = false;
        }
      });
    });

    // ── Inline editable fields (blur to save) ──
    container.querySelectorAll('.ml-inline-input').forEach(inp => {
      let original = inp.value;
      inp.addEventListener('focus', () => { original = inp.value; });
      inp.addEventListener('blur', async () => {
        if (inp.value === original) return;
        const reconId = inp.dataset.reconId;
        const field = inp.dataset.field;
        try {
          await App.api('reconditioning.php', {
            method: 'PUT',
            body: { id: parseInt(reconId), [field]: inp.value.trim() || null }
          });
          original = inp.value;
          App.toast('✓ บันทึกแล้ว', 'success');
        } catch (err) {
          App.toast('ผิดพลาด: ' + err.message, 'error');
          inp.value = original;
        }
      });
    });
  },

  _masterReconRow(r, i, warehouses) {
    const tw = r.target_warehouse || '';
    const isTransferred = parseInt(r.transferred) === 1;
    const radioName = 'wh_' + r.recon_id;
    const disabledAttr = isTransferred ? ' disabled' : '';
    const whCells = warehouses.map(w => {
      const checked = tw === w.code ? ' checked' : '';
      return `<td class="ml-wh-td${checked ? ' active' : ''}${isTransferred ? ' locked' : ''}">
        <input type="radio" name="${radioName}" value="${App.escapeHTML(w.code)}" class="ml-radio ml-wh-radio" data-recon-id="${r.recon_id}"${checked}${disabledAttr}>
      </td>`;
    }).join('');

    const fmtDate = (d) => { if (!d) return '-'; const ds = String(d).split(' ')[0]; return new Date(ds + 'T00:00:00').toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' }); };
    const trClass = isTransferred ? ' class="ml-transferred"' : '';

    return `<tr data-recon-id="${r.recon_id}" data-status="${r.recon_status || 'pending'}" data-transferred="${isTransferred ? '1' : '0'}"${trClass}>
      <td class="ml-td" style="text-align:center;color:var(--text-muted)">${i + 1}</td>
      <td class="ml-td"><a href="#reconditioning/${r.doc_id}">${App.escapeHTML(r.doc_number || '-')}</a></td>
      <td class="ml-td" style="text-align:center">${fmtDate(r.doc_return_date)}</td>
      <td class="ml-td" style="text-align:center">${fmtDate(r.return_date)}</td>
      <td class="ml-td" style="text-align:center">${fmtDate(r.doc_created)}</td>
      <td class="ml-td">${App.escapeHTML(r.receipt_number || '-')}</td>
      <td class="ml-td">${App.escapeHTML(r.branch_name || '-')}</td>
      <td class="ml-td">${App.escapeHTML(r.return_type || '-')}</td>
      <td class="ml-td" style="font-weight:500">${App.escapeHTML(r.good_code || '-')}</td>
      <td class="ml-td">${App.escapeHTML(r.good_name || '-')}</td>
      ${whCells}
      <td class="ml-td-wrap"><input class="ml-inline-input" data-recon-id="${r.recon_id}" data-field="parts_info" value="${App.escapeHTML(r.parts_info || '')}" placeholder="—"${disabledAttr}></td>
      <td class="ml-td-wrap"><input class="ml-inline-input" data-recon-id="${r.recon_id}" data-field="cause_text" value="${App.escapeHTML(r.cause_text || '')}" placeholder="—"${disabledAttr}></td>
      <td class="ml-td-wrap"><input class="ml-inline-input" data-recon-id="${r.recon_id}" data-field="inspector_name" value="${App.escapeHTML(r.recon_inspector || '')}" placeholder="—"${disabledAttr}></td>
    </tr>`;
  }
};

// (Auth.init() handles startup via DOMContentLoaded)
