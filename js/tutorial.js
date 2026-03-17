/* ============================================
   Tutorial / Guided Tour Engine
   ============================================ */

const Tutorial = {
  isActive: false,
  currentStep: 0,
  steps: [],
  elements: {}, // DOM references

  // ── Step Definitions per Page ─────────────
  tours: {
    dashboard: {
      label: 'Dashboard',
      icon: '📊',
      steps: [
        {
          target: '.stats-grid .stat-card:first-child',
          title: '📊 สถิติสินค้ารับคืน',
          desc: 'แสดงจำนวนสินค้ารับคืนทั้งหมดในระบบ — ดูสรุปได้ในทุกสถานะ',
          action: 'look',
          position: 'bottom'
        },
        {
          target: '.stats-grid .stat-card:nth-child(2)',
          title: '🔧 กำลังปรับสภาพ',
          desc: 'จำนวนสินค้าที่อยู่ระหว่างการปรับสภาพ — ตรวจสอบงานค้างได้ที่นี่',
          action: 'look',
          position: 'bottom'
        },
        {
          target: '.stats-grid .stat-card:nth-child(3)',
          title: '✅ ปรับเสร็จแล้ว',
          desc: 'สินค้าที่ปรับสภาพเสร็จเรียบร้อยแล้ว พร้อมส่งคลัง',
          action: 'look',
          position: 'bottom'
        },
        {
          target: '#dashboardTable',
          title: '📋 รายการล่าสุด',
          desc: 'รายการรับคืนสินค้าล่าสุด 10 รายการ — ดูสถานะเลขที่ใบรับคืน สาขา และสถานะปัจจุบัน',
          action: 'look',
          position: 'top'
        },
        {
          target: '.sidebar-nav',
          title: '🧭 เมนูหลัก',
          desc: 'ใช้เมนูด้านซ้ายเพื่อเปลี่ยนหน้า — กดเลือกเมนูที่ต้องการได้เลย',
          action: 'click',
          position: 'right'
        }
      ]
    },

    returns: {
      label: 'รับคืนสินค้า',
      icon: '📦',
      steps: [
        {
          target: '#btnAddReturn',
          title: '➕ เพิ่มใบรับคืน',
          desc: 'กดปุ่มนี้เพื่อสร้างใบรับคืนสินค้าใหม่',
          action: 'click',
          position: 'bottom'
        },
        {
          target: '#btnBulkImport',
          title: '📥 Import Excel',
          desc: 'กดปุ่มนี้เพื่อนำเข้าข้อมูลจากไฟล์ Excel — ระบบจะอ่านข้อมูลและสร้างใบรับคืนให้อัตโนมัติ',
          action: 'click',
          position: 'bottom'
        },
        {
          target: '#searchReturns',
          title: '🔍 ค้นหา',
          desc: 'พิมพ์เลขที่ใบรับคืน, ชื่อสินค้า, หรือชื่อสาขาเพื่อค้นหา',
          action: 'type',
          typeText: 'RN-2025001',
          position: 'bottom'
        },
        {
          target: '#btnDateFilter',
          title: '📅 กรองวันที่',
          desc: 'กดเพื่อเลือกช่วงวันที่ — เลือกได้ว่าจะดูวันนี้ เมื่อวาน หรือกำหนดเอง',
          action: 'click',
          position: 'bottom'
        },
        {
          target: '#btnTypeFilter',
          title: '🏷️ กรองประเภท',
          desc: 'กดเพื่อเลือกประเภทรับคืนที่ต้องการดู — เลือกได้หลายประเภทพร้อมกัน',
          action: 'click',
          position: 'bottom'
        },
        {
          target: '#returnsTable',
          title: '📋 ตารางรายการ',
          desc: 'ดูรายการรับคืนทั้งหมด — กดที่แถวเพื่อดูรายละเอียดและแก้ไข',
          action: 'look',
          position: 'top'
        },
        {
          target: '#inspectAll',
          title: '☑️ สถานะตรวจสอบ',
          desc: 'ติ๊กเพื่อยืนยันตรวจสอบทั้งหมดในหน้านี้ หรือติ๊กทีละรายการ',
          action: 'click',
          position: 'bottom'
        }
      ]
    },

    reconditioning: {
      label: 'ปรับสภาพ',
      icon: '🔧',
      steps: [
        {
          target: '.page-container',
          title: '🔧 หน้าปรับสภาพ',
          desc: 'หน้านี้แสดงรายการสินค้าที่ต้องปรับสภาพ — ดูสถานะและอัพเดทความคืบหน้าได้ที่นี่',
          action: 'look',
          position: 'bottom'
        },
        {
          target: '.sidebar-nav [data-page="reconditioning"]',
          title: '🔧 เมนูปรับสภาพ',
          desc: 'กดเมนูนี้เพื่อเข้าหน้าปรับสภาพได้เสมอ',
          action: 'click',
          position: 'right'
        }
      ]
    },

    masterRecon: {
      label: 'รายการรวม',
      icon: '📑',
      steps: [
        {
          target: '.page-container',
          title: '📑 รายการรวม',
          desc: 'หน้านี้แสดงรายการรวมทั้งหมดของการปรับสภาพ — สรุปข้อมูลจากทุกใบรับคืน',
          action: 'look',
          position: 'bottom'
        }
      ]
    },

    approvals: {
      label: 'ขออนุมัติ',
      icon: '📄',
      steps: [
        {
          target: '.page-container',
          title: '📄 หน้าขออนุมัติ',
          desc: 'สร้างเอกสารขออนุมัติปรับสภาพสินค้า — เลือกรายการที่ต้องการเสนออนุมัติ',
          action: 'look',
          position: 'bottom'
        },
        {
          target: '.sidebar-nav [data-page="approvals"]',
          title: '📄 เมนูขออนุมัติ',
          desc: 'กดเมนูนี้เพื่อเข้าดูเอกสารขออนุมัติ — สร้างใหม่หรือดูสถานะเดิม',
          action: 'click',
          position: 'right'
        }
      ]
    },

    products: {
      label: 'สินค้า',
      icon: '📦',
      steps: [
        {
          target: '.page-container',
          title: '📦 ค้นหาสินค้า',
          desc: 'ค้นหาข้อมูลสินค้าในระบบ — พิมพ์รหัสสินค้า, ชื่อ, หรือ barcode เพื่อค้นหา',
          action: 'look',
          position: 'bottom'
        }
      ]
    },

    settings: {
      label: 'ตั้งค่า',
      icon: '⚙️',
      steps: [
        {
          target: '.page-container',
          title: '⚙️ ตั้งค่าระบบ',
          desc: 'ตั้งค่าต่างๆ ของระบบ เช่น การจัดการผู้ใช้ และค่าเริ่มต้นต่างๆ',
          action: 'look',
          position: 'bottom'
        },
        {
          target: '#themeToggle',
          title: '🌓 เปลี่ยนธีม',
          desc: 'กดที่สวิตช์นี้เพื่อเปลี่ยนระหว่างโหมดมืดและโหมดสว่าง',
          action: 'click',
          position: 'right'
        }
      ]
    },

    // Global tour: first-time overview
    overview: {
      label: 'ภาพรวมระบบ',
      icon: '🎯',
      steps: [
        {
          target: '.sidebar-header .logo',
          title: '🏠 ReconSystem',
          desc: 'ยินดีต้อนรับสู่ระบบจัดการงานปรับสภาพสินค้า! มาดูภาพรวมกันเลย',
          action: 'look',
          position: 'right'
        },
        {
          target: '.sidebar-nav [data-page="dashboard"]',
          title: '📊 Dashboard',
          desc: 'หน้าแรก — ดูสรุปสถิติสินค้ารับคืนทั้งหมดและรายการล่าสุด',
          action: 'click',
          position: 'right'
        },
        {
          target: '.sidebar-nav [data-page="returns"]',
          title: '📦 รับคืนสินค้า',
          desc: 'จัดการใบรับคืนสินค้า — สร้างใหม่, import Excel, ค้นหา, กรอง',
          action: 'click',
          position: 'right'
        },
        {
          target: '.sidebar-nav [data-page="reconditioning"]',
          title: '🔧 ปรับสภาพ',
          desc: 'ดูรายการสินค้าที่ต้องปรับสภาพ — อัพเดทความคืบหน้า',
          action: 'click',
          position: 'right'
        },
        {
          target: '.sidebar-nav [data-page="masterRecon"]',
          title: '📑 รายการรวม',
          desc: 'ดูข้อมูลรวมจากทุกใบรับคืนในตารางเดียว',
          action: 'click',
          position: 'right'
        },
        {
          target: '.sidebar-nav [data-page="approvals"]',
          title: '📄 ขออนุมัติ',
          desc: 'สร้างเอกสารขออนุมัติ — เลือกรายการและส่งเสนออนุมัติ',
          action: 'click',
          position: 'right'
        },
        {
          target: '.sidebar-nav [data-page="products"]',
          title: '📦 สินค้า',
          desc: 'ค้นหาข้อมูลสินค้าในระบบ',
          action: 'click',
          position: 'right'
        },
        {
          target: '.sidebar-nav [data-page="settings"]',
          title: '⚙️ ตั้งค่า',
          desc: 'ตั้งค่าระบบ — จัดการผู้ใช้ และค่าเริ่มต้น',
          action: 'click',
          position: 'right'
        },
        {
          target: '#themeToggle',
          title: '🌓 เปลี่ยนธีม',
          desc: 'กดสวิตช์นี้เพื่อสลับระหว่าง Dark Mode / Light Mode ตามชอบ',
          action: 'click',
          position: 'right'
        },
        {
          target: '#userInfo',
          title: '👤 ข้อมูลผู้ใช้',
          desc: 'แสดงชื่อผู้ใช้ปัจจุบัน — กด "ออก" เพื่อออกจากระบบ',
          action: 'look',
          position: 'right'
        }
      ]
    }
  },

  // ── Initialize ─────────────────────────────
  init() {
    this._createFAB();
    this._createOverlayElements();

    // Check first-time user
    if (!localStorage.getItem('tutorial_seen')) {
      setTimeout(() => this._showWelcome(), 1500);
    }
  },

  // ── Create FAB Button ──────────────────────
  _createFAB() {
    if (document.getElementById('tutorialFab')) return;
    const fab = document.createElement('button');
    fab.id = 'tutorialFab';
    fab.className = 'tutorial-fab';
    fab.innerHTML = `?<span class="tutorial-fab-label">📖 คู่มือการใช้งาน</span>`;
    fab.addEventListener('click', () => this._toggleMenu());
    document.body.appendChild(fab);
  },

  // ── Create Overlay Elements ────────────────
  _createOverlayElements() {
    // Overlay container
    if (!document.getElementById('tutorialOverlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'tutorialOverlay';
      overlay.className = 'tutorial-overlay';
      // Clicking the dark overlay area does NOT close the tutorial
      // User must finish all steps or press the ✕ close button
      overlay.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      document.body.appendChild(overlay);
    }

    // Spotlight element
    if (!document.getElementById('tutorialSpotlight')) {
      const spot = document.createElement('div');
      spot.id = 'tutorialSpotlight';
      spot.className = 'tutorial-spotlight';
      spot.style.display = 'none';
      document.body.appendChild(spot);
    }

    // Tooltip
    if (!document.getElementById('tutorialTooltip')) {
      const tip = document.createElement('div');
      tip.id = 'tutorialTooltip';
      tip.className = 'tutorial-tooltip';
      tip.style.display = 'none';
      document.body.appendChild(tip);
    }

    // Hand pointer
    if (!document.getElementById('tutorialHand')) {
      const hand = document.createElement('div');
      hand.id = 'tutorialHand';
      hand.className = 'tutorial-hand';
      hand.style.display = 'none';
      document.body.appendChild(hand);
    }

    // Ripple effect
    if (!document.getElementById('tutorialRipple')) {
      const ripple = document.createElement('div');
      ripple.id = 'tutorialRipple';
      ripple.className = 'tutorial-ripple';
      ripple.style.display = 'none';
      document.body.appendChild(ripple);
    }

    // Menu
    if (!document.getElementById('tutorialMenu')) {
      const menu = document.createElement('div');
      menu.id = 'tutorialMenu';
      menu.className = 'tutorial-menu';
      document.body.appendChild(menu);
    }
  },

  // ── Show Welcome Modal (first time) ────────
  _showWelcome() {
    const overlay = document.createElement('div');
    overlay.className = 'tutorial-welcome-overlay';
    overlay.id = 'tutorialWelcome';
    overlay.innerHTML = `
      <div class="tutorial-welcome-card">
        <span class="tutorial-welcome-icon">🎯</span>
        <h2>ยินดีต้อนรับ!</h2>
        <p>คุณต้องการดูคู่มือการใช้งานระบบไหม?<br>เราจะพาดูทีละขั้นตอนพร้อม animation สาธิต</p>
        <div class="tutorial-welcome-actions">
          <button class="tutorial-btn tutorial-btn-prev" onclick="Tutorial._dismissWelcome(false)">ข้ามไปก่อน</button>
          <button class="tutorial-btn tutorial-btn-next" onclick="Tutorial._dismissWelcome(true)">🚀 เริ่มเลย!</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  _dismissWelcome(startTour) {
    localStorage.setItem('tutorial_seen', '1');
    const el = document.getElementById('tutorialWelcome');
    if (el) {
      el.style.transition = 'opacity 0.3s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }
    if (startTour) {
      setTimeout(() => this.start('overview'), 400);
    }
  },

  // ── Toggle Menu ────────────────────────────
  _toggleMenu() {
    const menu = document.getElementById('tutorialMenu');
    if (menu.classList.contains('show')) {
      menu.classList.remove('show');
      return;
    }
    this._renderMenu();
    menu.classList.add('show');

    // Close on outside click
    const closeHandler = (e) => {
      if (!menu.contains(e.target) && e.target.id !== 'tutorialFab') {
        menu.classList.remove('show');
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);
  },

  _renderMenu() {
    const menu = document.getElementById('tutorialMenu');
    const currentPage = App.currentPage?.split('/')[0] || 'dashboard';

    let html = `<div class="tutorial-menu-title">📖 เลือกคู่มือ</div>`;

    // Overview tour always first
    html += `
      <button class="tutorial-menu-item" onclick="Tutorial.start('overview')">
        <span class="menu-icon">🎯</span>
        <span class="menu-label">ภาพรวมระบบ</span>
        <span class="menu-steps">${this.tours.overview.steps.length} steps</span>
      </button>
    `;

    // Current page tour (highlighted)
    if (this.tours[currentPage]) {
      const tour = this.tours[currentPage];
      html += `
        <button class="tutorial-menu-item" onclick="Tutorial.start('${currentPage}')" style="background:rgba(108,92,231,0.08)">
          <span class="menu-icon">${tour.icon}</span>
          <span class="menu-label">${tour.label} <small style="opacity:0.5">(หน้าปัจจุบัน)</small></span>
          <span class="menu-steps">${tour.steps.length} steps</span>
        </button>
      `;
    }

    // Other page tours
    Object.entries(this.tours).forEach(([key, tour]) => {
      if (key === 'overview' || key === currentPage) return;
      html += `
        <button class="tutorial-menu-item" onclick="Tutorial.start('${key}')">
          <span class="menu-icon">${tour.icon}</span>
          <span class="menu-label">${tour.label}</span>
          <span class="menu-steps">${tour.steps.length} steps</span>
        </button>
      `;
    });

    menu.innerHTML = html;
  },

  // ── Start Tour ─────────────────────────────
  start(tourName) {
    const tour = this.tours[tourName];
    if (!tour) return;

    // Close menu
    const menu = document.getElementById('tutorialMenu');
    menu.classList.remove('show');

    // If tour is for a specific page, navigate there first
    const pageNames = ['dashboard', 'returns', 'reconditioning', 'masterRecon', 'approvals', 'products', 'settings'];
    if (pageNames.includes(tourName)) {
      const currentPage = App.currentPage?.split('/')[0];
      if (currentPage !== tourName) {
        location.hash = tourName;
        // Wait for page render then start
        setTimeout(() => this._beginTour(tour), 600);
        return;
      }
    }

    this._beginTour(tour);
  },

  _beginTour(tour) {
    this.isActive = true;
    this.steps = tour.steps;
    this.currentStep = 0;

    const overlay = document.getElementById('tutorialOverlay');
    overlay.classList.add('active');

    this._showStep(0);
  },

  // ── Show Step ──────────────────────────────
  _showStep(index) {
    if (index < 0 || index >= this.steps.length) return;

    this.currentStep = index;
    const step = this.steps[index];

    // Find target element
    const el = document.querySelector(step.target);

    if (el) {
      // Scroll into view gently
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Wait for scroll, then position
      setTimeout(() => {
        this._positionSpotlight(el);
        this._positionTooltip(el, step, index);
        this._showAnimation(el, step);
      }, 350);
    } else {
      // If element not found, show tooltip at center
      this._hideSpotlight();
      this._showCenterTooltip(step, index);
      this._hideAnimations();
    }
  },

  // ── Position Spotlight ─────────────────────
  _positionSpotlight(el) {
    const spot = document.getElementById('tutorialSpotlight');
    const rect = el.getBoundingClientRect();
    const pad = 8;
    spot.style.display = 'block';
    spot.style.left = (rect.left - pad) + 'px';
    spot.style.top = (rect.top - pad) + 'px';
    spot.style.width = (rect.width + pad * 2) + 'px';
    spot.style.height = (rect.height + pad * 2) + 'px';
  },

  _hideSpotlight() {
    document.getElementById('tutorialSpotlight').style.display = 'none';
  },

  // ── Position Tooltip ───────────────────────
  _positionTooltip(el, step, index) {
    const tooltip = document.getElementById('tutorialTooltip');
    tooltip.innerHTML = this._buildTooltipHTML(step, index);
    tooltip.style.display = 'block';
    tooltip.setAttribute('data-position', step.position || 'bottom');

    const rect = el.getBoundingClientRect();
    const tipW = 370;
    const tipH = tooltip.offsetHeight;
    const gap = 18;
    let left, top;

    const pos = step.position || 'bottom';

    switch (pos) {
      case 'bottom':
        left = rect.left + rect.width / 2 - tipW / 2;
        top = rect.bottom + gap;
        break;
      case 'top':
        left = rect.left + rect.width / 2 - tipW / 2;
        top = rect.top - tipH - gap;
        break;
      case 'left':
        left = rect.left - tipW - gap;
        top = rect.top + rect.height / 2 - tipH / 2;
        break;
      case 'right':
        left = rect.right + gap;
        top = rect.top + rect.height / 2 - tipH / 2;
        break;
    }

    // Clamp to viewport
    const maxLeft = window.innerWidth - tipW - 12;
    left = Math.max(12, Math.min(left, maxLeft));
    top = Math.max(12, Math.min(top, window.innerHeight - tipH - 12));

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';

    // Re-trigger enter animation
    tooltip.style.animation = 'none';
    tooltip.offsetHeight;
    tooltip.style.animation = '';
  },

  _showCenterTooltip(step, index) {
    const tooltip = document.getElementById('tutorialTooltip');
    tooltip.innerHTML = this._buildTooltipHTML(step, index);
    tooltip.style.display = 'block';
    tooltip.removeAttribute('data-position');

    const tipW = 370;
    const tipH = tooltip.offsetHeight;
    tooltip.style.left = (window.innerWidth / 2 - tipW / 2) + 'px';
    tooltip.style.top = (window.innerHeight / 2 - tipH / 2) + 'px';
  },

  // ── Build Tooltip HTML ─────────────────────
  _buildTooltipHTML(step, index) {
    const total = this.steps.length;
    const isFirst = index === 0;
    const isLast = index === total - 1;

    // Animation area
    let animHTML = '';
    if (step.action === 'type' && step.typeText) {
      animHTML = `
        <div class="tutorial-animation-area">
          <div class="tutorial-typing-demo">
            <span class="tutorial-typing-text" id="tutorialTypingText"></span>
          </div>
          <span style="font-size:12px;opacity:0.5">⌨️ พิมพ์ตรงนี้</span>
        </div>
      `;
    } else if (step.action === 'click') {
      animHTML = `
        <div class="tutorial-animation-area">
          <span class="tutorial-click-indicator">👆 กดตรงนี้</span>
        </div>
      `;
    } else if (step.action === 'scroll') {
      animHTML = `
        <div class="tutorial-animation-area">
          <span class="tutorial-scroll-indicator">
            <span class="tutorial-scroll-arrow">👆</span> เลื่อนดู
          </span>
        </div>
      `;
    }

    // Progress dots
    let dots = '';
    for (let i = 0; i < total; i++) {
      const cls = i < index ? 'done' : i === index ? 'active' : '';
      dots += `<span class="tutorial-dot ${cls}"></span>`;
    }

    return `
      <div class="tutorial-header">
        <span class="tutorial-step-badge">
          ขั้นที่ ${index + 1}/${total}
        </span>
        <button class="tutorial-close-btn" onclick="Tutorial.stop()">✕</button>
      </div>
      <div class="tutorial-body">
        <div class="tutorial-title">${step.title}</div>
        <p class="tutorial-description">${step.desc}</p>
      </div>
      ${animHTML}
      <div class="tutorial-footer">
        <div class="tutorial-progress">${dots}</div>
        <div class="tutorial-nav-buttons">
          ${!isFirst ? '<button class="tutorial-btn tutorial-btn-prev" onclick="Tutorial.prev()">← ก่อนหน้า</button>' : ''}
          ${isLast
            ? '<button class="tutorial-btn tutorial-btn-finish" onclick="Tutorial.stop()">✓ เสร็จสิ้น</button>'
            : '<button class="tutorial-btn tutorial-btn-next" onclick="Tutorial.next()">ถัดไป →</button>'
          }
        </div>
      </div>
    `;
  },

  // ── Show Animations ────────────────────────
  _showAnimation(el, step) {
    this._hideAnimations();
    const rect = el.getBoundingClientRect();

    if (step.action === 'click') {
      // Show hand pointer + ripple
      const hand = document.getElementById('tutorialHand');
      hand.style.display = 'block';
      hand.className = 'tutorial-hand click';
      hand.textContent = '👆';
      hand.style.left = (rect.left + rect.width / 2 - 14) + 'px';
      hand.style.top = (rect.top + rect.height / 2 + 5) + 'px';

      const ripple = document.getElementById('tutorialRipple');
      ripple.style.display = 'block';
      ripple.style.left = (rect.left + rect.width / 2 - 22) + 'px';
      ripple.style.top = (rect.top + rect.height / 2 - 22) + 'px';

    } else if (step.action === 'type') {
      // Show typing hand (waggling)
      const hand = document.getElementById('tutorialHand');
      hand.style.display = 'block';
      hand.className = 'tutorial-hand type';
      hand.textContent = '⌨️';
      hand.style.left = (rect.left + rect.width / 2 - 14) + 'px';
      hand.style.top = (rect.bottom + 4) + 'px';

      // Start typing animation in the tooltip
      if (step.typeText) {
        setTimeout(() => this._animateTyping(step.typeText), 500);
      }
    }
  },

  _hideAnimations() {
    const hand = document.getElementById('tutorialHand');
    const ripple = document.getElementById('tutorialRipple');
    if (hand) hand.style.display = 'none';
    if (ripple) ripple.style.display = 'none';
    // Clear typing interval
    if (this._typingInterval) {
      clearInterval(this._typingInterval);
      this._typingInterval = null;
    }
  },

  // ── Typing Animation ──────────────────────
  _typingInterval: null,

  _animateTyping(text) {
    const el = document.getElementById('tutorialTypingText');
    if (!el) return;

    let i = 0;
    el.textContent = '';

    this._typingInterval = setInterval(() => {
      if (i < text.length) {
        el.textContent += text[i];
        i++;
      } else {
        // Pause then restart
        setTimeout(() => {
          i = 0;
          if (el) el.textContent = '';
        }, 1500);
      }
    }, 100);
  },

  // ── Navigation ─────────────────────────────
  next() {
    if (this.currentStep < this.steps.length - 1) {
      this._showStep(this.currentStep + 1);
    }
  },

  prev() {
    if (this.currentStep > 0) {
      this._showStep(this.currentStep - 1);
    }
  },

  // ── Stop / Close Tour ──────────────────────
  stop() {
    this.isActive = false;
    this._hideAnimations();

    const overlay = document.getElementById('tutorialOverlay');
    if (overlay) overlay.classList.remove('active');

    const spot = document.getElementById('tutorialSpotlight');
    if (spot) spot.style.display = 'none';

    const tooltip = document.getElementById('tutorialTooltip');
    if (tooltip) tooltip.style.display = 'none';
  },

  // ── Page Change Hook ───────────────────────
  onPageChange(page) {
    // If tutorial is active, stop it (user navigated away)
    if (this.isActive) {
      this.stop();
    }
  }
};

// ── Keyboard shortcuts ───────────────────────
document.addEventListener('keydown', (e) => {
  if (!Tutorial.isActive) return;

  if (e.key === 'Escape') {
    Tutorial.stop();
  } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
    Tutorial.next();
  } else if (e.key === 'ArrowLeft') {
    Tutorial.prev();
  }
});
