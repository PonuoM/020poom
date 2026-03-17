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
      stock: 'สต๊อคคงเหลือ',
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
        case 'stock':          await Pages.stock(container); break;
        case 'reports':        await Pages.reports(container); break;
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

/* ── Pages container (populated by js/pages/*.js modules) ── */
const Pages = {};
