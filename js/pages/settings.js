/* ============================================
 Settings + user management
 ============================================ */

Pages.settings = async function(container) {
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
};
Pages._renderWarehousesSettings = async function(content) {
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
};
Pages._toggleWarehouse = async function(id, is_active) {
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
};
Pages._renderReturnTypesSettings = async function(content) {
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
};
Pages._renderUsersSettings = async function(content) {
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
};
Pages._toggleUser = async function(id, is_active) {
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
};
  // ── Drag & Drop helper ─────────────────────
Pages._initSortable = function(listId, table) {
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
};
Pages._saveOrder = async function(table, order) {
  try {
    await App.api('settings.php?type=reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, order })
    });
  } catch (e) {
    App.toast('บันทึกลำดับไม่สำเร็จ: ' + e.message, 'error');
  }
};
  // ═══════════════════════════════════════════════════
  // ███  MASTER RECONDITIONING LIST  ████████████████
  // ═══════════════════════════════════════════════════
