// ===== Nexora CheckSheet App — Exact Flow =====
const App = {
  currentUser: null,
  token: null,
  currentPage: 'login',
  currentView: null,
  _sheetData: [],
  pdiRollCount: 1,
  _ipEntryCount: 1,
  _tpSampleCount: 5,
  _lmEntryCount: 2,
  _tableCategory: null,
  _verifiedUsers: [],

  init() {
    this.token = localStorage.getItem('token');
    this.currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    if (this.token && this.currentUser) this.navigate('dashboard');
    else this.navigate('login');
  },

  navigate(page, data) {
    this.currentPage = page;
    this.currentView = data || null;
    this.render();
  },

  refreshIcons() { setTimeout(() => { try { lucide.createIcons(); } catch(e) {} }, 30); },

  async api(url, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  // Holds the record currently shown in dedicated document view (record-specific download)
  _viewRecord: null,

  render() {
    const app = document.getElementById('app');
    switch (this.currentPage) {
      case 'login': app.innerHTML = this.renderLogin(); break;
      case 'dashboard': app.innerHTML = this.renderDashboard(); this.loadDashboardRecent(); break;
      case 'form': app.innerHTML = this.renderForm(); this.loadFormUsers(); break;
      case 'tables': app.innerHTML = this.renderTables(); break;
      case 'table-view': app.innerHTML = this.renderTableView(); this.loadTableView(); break;
      case 'view-document': app.innerHTML = this.renderViewDocument(); break;
      case 'admin': app.innerHTML = this.renderAdmin(); this.loadAdmin(); break;
      default: app.innerHTML = this.renderLogin();
    }
    this.refreshIcons();
  },

  getTypeLabel(t) { return { pdi:'PDI — Predispatch', inprocess:'Inprocess — Fabric', tape:'Tape Plant — Extruder', lamination:'Lamination — GSM/COF' }[t] || t; },
  getTypeIcon(t) { return { pdi:'package', inprocess:'factory', tape:'cog', lamination:'ruler' }[t] || 'file-text'; },

  // ===== Header =====
  renderHeader() {
    if (!this.currentUser) return '';
    const initials = this.currentUser.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
    return `<header class="header">
      <div class="header-left"><div class="header-brand"><div class="header-brand-icon"><i data-lucide="clipboard-check"></i></div><span class="header-brand-name">Nexora CheckSheet</span></div></div>
      <div class="header-right">
        ${this.currentUser.role==='admin'?'<button class="btn btn-ghost btn-sm" onclick="App.navigate(\'admin\')"><i data-lucide="settings"></i> Admin</button>':''}
        <div class="user-chip"><div class="user-avatar">${initials}</div><div class="user-details"><span class="user-name">${this.currentUser.name}</span><span class="user-role">${this.currentUser.employee_id} &middot; ${this.currentUser.role}</span></div></div>
        <button class="btn btn-ghost btn-sm" onclick="App.logout()"><i data-lucide="log-out"></i></button>
      </div></header>`;
  },

  // ===== Login =====
  renderLogin() {
    return `<div class="auth-wrapper"><div class="auth-left">
      <div class="auth-brand"><div class="auth-brand-icon"><i data-lucide="clipboard-check"></i></div><span class="auth-brand-text">Nexora CheckSheet</span></div>
      <h1>Quality Inspection<br><span>Management System</span></h1>
      <p>Standardized check sheet management for manufacturing quality control. Streamline your inspection workflows.</p>
      <div class="auth-features">
        <div class="auth-feature"><div class="auth-feature-icon"><i data-lucide="shield-check"></i></div><span>Role-based access with admin verification</span></div>
        <div class="auth-feature"><div class="auth-feature-icon"><i data-lucide="file-text"></i></div><span>4 category-specific inspection forms</span></div>
        <div class="auth-feature"><div class="auth-feature-icon"><i data-lucide="bar-chart-3"></i></div><span>Real-time tracking with A4 printable reports</span></div>
        <div class="auth-feature"><div class="auth-feature-icon"><i data-lucide="database"></i></div><span>Persistent SQL database storage</span></div>
      </div></div>
      <div class="auth-right"><div class="auth-card"><h2>Welcome back</h2><p class="subtitle">Sign in to your inspection account</p>
        <div class="auth-tabs"><button class="auth-tab active" onclick="App.switchAuthTab('login')">Sign In</button><button class="auth-tab" onclick="App.switchAuthTab('register')">Create Account</button></div>
        <div id="auth-alert"></div>
        <div id="auth-form-login"><form onsubmit="App.handleLogin(event)"><div class="form-group"><label>Employee ID</label><input type="text" id="login-empid" placeholder="Enter your employee ID" required></div><div class="form-group"><label>Password</label><input type="password" id="login-pass" placeholder="Enter your password" required></div><button type="submit" class="btn btn-primary btn-block btn-lg" style="margin-top:4px"><i data-lucide="log-in"></i> Sign In</button></form>
          <div style="margin-top:20px;padding:14px;background:var(--gray-50);border-radius:var(--radius);border:1px solid var(--gray-200)"><div style="font-size:0.75rem;font-weight:600;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Demo Credentials</div><div style="font-size:0.8125rem;color:var(--gray-700)"><strong>Admin:</strong> ADMIN001 / admin123</div><div style="font-size:0.8125rem;color:var(--gray-700)"><strong>Inspector:</strong> EMP001 / test123</div></div></div>
        <div id="auth-form-register" style="display:none"><form onsubmit="App.handleRegister(event)"><div class="form-row"><div class="form-group"><label>Employee ID</label><input type="text" id="reg-empid" placeholder="e.g. EMP002" required></div><div class="form-group"><label>Full Name</label><input type="text" id="reg-name" placeholder="Your full name" required></div></div><div class="form-group"><label>Email</label><input type="email" id="reg-email" placeholder="you@nexora.com" required></div><div class="form-group"><label>Password</label><input type="password" id="reg-pass" placeholder="Minimum 6 characters" required minlength="6"></div><button type="submit" class="btn btn-primary btn-block btn-lg" style="margin-top:4px"><i data-lucide="user-plus"></i> Create Account</button></form><p style="text-align:center;margin-top:16px;font-size:0.8125rem;color:var(--gray-500)"><i data-lucide="info" style="width:14px;height:14px;display:inline;vertical-align:-2px"></i> Admin approval required</p></div>
      </div></div></div>`;
  },

  switchAuthTab(tab) { document.querySelectorAll('.auth-tab').forEach(t=>t.classList.remove('active')); event.target.classList.add('active'); document.getElementById('auth-form-login').style.display=tab==='login'?'block':'none'; document.getElementById('auth-form-register').style.display=tab==='register'?'block':'none'; document.getElementById('auth-alert').innerHTML=''; },

  showAuthAlert(msg,type='error') { document.getElementById('auth-alert').innerHTML=`<div class="alert alert-${type}"><i data-lucide="${type==='success'?'check-circle':'alert-circle'}"></i>${msg}</div>`; this.refreshIcons(); },

  async handleLogin(e) { e.preventDefault(); try { const d=await this.api('/api/auth/login',{method:'POST',body:JSON.stringify({employee_id:document.getElementById('login-empid').value,password:document.getElementById('login-pass').value})}); this.token=d.token; this.currentUser=d.user; localStorage.setItem('token',d.token); localStorage.setItem('user',JSON.stringify(d.user)); this.navigate('dashboard'); } catch(err) { this.showAuthAlert(err.message); } },

  async handleRegister(e) { e.preventDefault(); try { const d=await this.api('/api/auth/register',{method:'POST',body:JSON.stringify({employee_id:document.getElementById('reg-empid').value,name:document.getElementById('reg-name').value,email:document.getElementById('reg-email').value,password:document.getElementById('reg-pass').value})}); this.showAuthAlert(d.message,'success'); setTimeout(()=>{document.querySelector('.auth-tab').click();document.getElementById('auth-alert').innerHTML='';},2500); } catch(err) { this.showAuthAlert(err.message); } },

  logout() { this.token=null; this.currentUser=null; localStorage.removeItem('token'); localStorage.removeItem('user'); this.navigate('login'); },

  // ============================================================
  // ===== DASHBOARD — 4 Categories + Tables Option =====
  // ============================================================
  renderDashboard() {
    return `${this.renderHeader()}<main class="main-content">
      <div class="page-header"><h2>Quality Inspection Dashboard</h2><p>Select an inspection category to start entering data, or view submitted records.</p></div>

      <div class="section-header"><h3><i data-lucide="layout-grid"></i> Inspection Categories</h3></div>
      <div class="topics-grid">
        <div class="topic-card pdi" onclick="App.navigate('form','pdi')"><div class="topic-card-top"><div class="topic-card-icon"><i data-lucide="package"></i></div><span class="topic-card-badge">TF/QAD</span></div><h3>Predispatch Inspection (PDI)</h3><p>Roofing Underlayment & Coated Fabric pre-dispatch quality checks.</p><div class="topic-card-arrow"><i data-lucide="arrow-right"></i></div></div>
        <div class="topic-card inprocess" onclick="App.navigate('form','inprocess')"><div class="topic-card-top"><div class="topic-card-icon"><i data-lucide="factory"></i></div><span class="topic-card-badge">TF/QAD/15</span></div><h3>Inprocess Inspection — Fabric</h3><p>Fabric in-process quality checks including mesh, breaking strength, GSM.</p><div class="topic-card-arrow"><i data-lucide="arrow-right"></i></div></div>
        <div class="topic-card tape" onclick="App.navigate('form','tape')"><div class="topic-card-top"><div class="topic-card-icon"><i data-lucide="cog"></i></div><span class="topic-card-badge">TF/QAD/14</span></div><h3>Tape Plant — Extruder</h3><p>FSA/Inprocess inspection for extruder operations and machine parameters.</p><div class="topic-card-arrow"><i data-lucide="arrow-right"></i></div></div>
        <div class="topic-card lamination" onclick="App.navigate('form','lamination')"><div class="topic-card-top"><div class="topic-card-icon"><i data-lucide="ruler"></i></div><span class="topic-card-badge">TF/QAD/11</span></div><h3>Lamination — GSM & Tear/COF</h3><p>Die GSM, tear strength, COF, and peel strength inspection.</p><div class="topic-card-arrow"><i data-lucide="arrow-right"></i></div></div>
      </div>

      <div class="section-header" style="margin-top:12px"><h3><i data-lucide="table"></i> Submitted Data</h3></div>
      <div class="topics-grid">
        <div class="topic-card" style="border-color:var(--success);background:var(--success-light)" onclick="App.navigate('tables')"><div class="topic-card-top"><div class="topic-card-icon" style="background:#dcfce7;color:#16a34a"><i data-lucide="table"></i></div><span class="topic-card-badge" style="background:#dcfce7;color:#16a34a">TABLES</span></div><h3>View Submitted Records</h3><p>Browse all submitted inspection records by category in table format.</p><div class="topic-card-arrow"><i data-lucide="arrow-right"></i></div></div>
      </div>

      <div class="card" style="margin-top:24px">
        <div class="card-header"><h2><i data-lucide="clock"></i> Recent Submissions</h2><span style="font-size:0.75rem;color:var(--gray-500)">Latest 10 records across your accessible categories</span></div>
        <div id="dashboard-recent" class="loading"><div class="spinner"></div><div style="font-size:0.8125rem;color:var(--gray-500);margin-top:8px">Loading recent submissions…</div></div>
      </div>
    </main>`;
  },

  async loadDashboardRecent() {
    const container = document.getElementById('dashboard-recent');
    if (!container) return;
    try {
      // all-inspections respects role (admin=all, inspector=own); recent 10
      const all = await this.api('/api/inspections/all-inspections');
      if (!all.length) { container.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i data-lucide="inbox"></i></div><h3>No submissions yet</h3><p>Fill a category form to see recent submissions here.</p></div>`; this.refreshIcons(); return; }
      const recent = all.slice(0, 10);
      const escDash = (v) => (v===undefined||v===null||v===''? '—' : esc(v));
      let html = `<div class="table-wrap"><table class="data-table"><thead><tr><th>Date & Time</th><th>Employee ID</th><th>Employee Name</th><th>Category</th><th>Roll No.</th><th style="text-align:right">View</th></tr></thead><tbody>`;
      recent.forEach(rec => {
        const f = rec.form_data || {};
        const cat = rec.inspection_type;
        const catLabel = this.getTypeLabel(cat);
        // date & time from created_at
        let dt = rec.created_at ? new Date(rec.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true }) : '—';
        const empId = esc(rec.user_emp_id || rec.employee_id || this.currentUser.employee_id);
        const empName = esc(rec.user_name || rec.user_name || this.currentUser.name);
        // Roll No extraction per category — first roll/entry
        let rollNo = '—';
        if (cat === 'pdi') rollNo = esc(f.rolls?.[0]?.roll_number || f.roll_number || rec.id);
        else if (cat === 'inprocess') rollNo = esc(f.rows?.[0]?.loom || f.rows?.[0]?.roll_no || rec.id);
        else if (cat === 'tape') rollNo = esc(f.samples?.[0] ? (f.plant_no ? f.plant_no + ' / S1' : 'Sample 1') : (f.plant_no || '—'));
        else if (cat === 'lamination') rollNo = esc(f.rows?.[0]?.roll_no || rec.id);
        else rollNo = '#' + rec.id;
        const badgeClass = cat === 'pdi' ? 'pdi' : cat === 'inprocess' ? 'inprocess' : cat === 'tape' ? 'tape' : 'lamination';
        html += `<tr><td style="white-space:nowrap">${dt}</td><td><span style="font-family:var(--font-mono);font-weight:600">${empId}</span></td><td>${empName}</td><td><span class="table-type-icon ${badgeClass}" style="width:28px;height:28px;display:inline-flex;vertical-align:middle;margin-right:6px"><i data-lucide="${this.getTypeIcon(cat)}"></i></span>${catLabel}</td><td><span style="font-family:var(--font-mono);font-weight:600;color:var(--primary-accent)">${rollNo}</span></td><td style="text-align:right"><button class="btn btn-primary btn-xs" onclick="App.viewA4Report(${rec.id})"><i data-lucide="eye"></i> View</button></td></tr>`;
      });
      html += `</tbody></table></div><div style="padding:10px 16px;font-size:0.75rem;color:var(--gray-500);background:var(--gray-25);border-top:1px solid var(--gray-100);display:flex;justify-content:space-between;align-items:center"><span>Showing <strong>${recent.length}</strong> of <strong>${all.length}</strong> submissions</span><button class="btn btn-ghost btn-xs" onclick="App.navigate('tables')"><i data-lucide="table"></i> View All Tables</button></div>`;
      container.innerHTML = html;
      this.refreshIcons();
    } catch (err) {
      container.innerHTML = `<div class="alert alert-error"><i data-lucide="alert-circle"></i> ${esc(err.message)}</div>`;
      this.refreshIcons();
    }
  },

  // ============================================================
  // ===== FORM PAGE — Submit & Stay =====
  // ============================================================

  // Load verified users for signature dropdowns (async after render)
  async loadFormUsers() {
    try {
      const users = await this.api('/api/auth/verified-users');
      this._verifiedUsers = users;
      // Re-populate all signature selects on the form
      document.querySelectorAll('.sig-select').forEach(sel => {
        const field = sel.getAttribute('data-sig-field');
        const currentVal = sel.value;
        sel.innerHTML = users.map(u =>
          `<option value="${u.name}"${u.name === currentVal ? ' selected' : ''}>${u.name} (${u.role || u.employee_id})</option>`
        ).join('');
        if (currentVal && !users.find(u => u.name === currentVal)) {
          const opt = document.createElement('option');
          opt.value = currentVal; opt.textContent = currentVal;
          sel.prepend(opt);
        }
      });
    } catch (err) {
      console.warn('Could not load verified users:', err.message);
    }
  },

  renderForm() {
    const type = this.currentView;
    const formMap = { pdi:'renderPDIForm', inprocess:'renderInprocessForm', tape:'renderTapeForm', lamination:'renderLaminationForm' };
    const renderer = formMap[type];
    if (!renderer) return `${this.renderHeader()}<main class="main-content"><div class="alert alert-error">Unknown form category: ${esc(type)}</div></main>`;
    return `${this.renderHeader()}<main class="main-content"><button class="back-btn" onclick="App.navigate('dashboard')"><i data-lucide="arrow-left"></i> Back to Dashboard</button><div class="form-container"><div class="form-header"><h2><i data-lucide="${this.getTypeIcon(type)}"></i> ${this.getTypeLabel(type)} Inspection</h2></div><form id="inspection-form" onsubmit="App.handleSubmit(event,'${type}')"><div class="form-body"><div id="form-alert"></div>${FormRenderers[renderer](this.currentUser, this._verifiedUsers)}</div><div class="form-footer"><button type="button" class="btn btn-outline" onclick="App.navigate('dashboard')">Cancel</button><button type="submit" class="btn btn-primary btn-lg"><i data-lucide="send"></i> Submit Inspection</button></div></form></div></main>`;
  },

  async handleSubmit(e, type) {
    e.preventDefault();
    const collectorMap = { pdi:'collectPDI', inprocess:'collectInprocess', tape:'collectTapePlant', lamination:'collectLamination' };
    const collector = collectorMap[type];
    if (!collector) { document.getElementById('form-alert').innerHTML = `<div class="alert alert-error">Unknown category: ${esc(type)}</div>`; return; }
    const data = FormCollectors[collector]();
    try {
      await this.api('/api/inspections/submit', { method:'POST', body:JSON.stringify({ inspection_type:type, form_data:data, remarks:data.observation||data.remarks||'', inspected_by:data.inspected_by||data.prepared_by||data.checked_by||this.currentUser.name, approved_by:data.approved_by||data.verified_by||'' }) });
      // Show success message and stay on form
      const alert = document.getElementById('form-alert');
      alert.innerHTML = `<div class="alert alert-success" style="margin-bottom:0"><i data-lucide="check-circle"></i> Submitted Successfully! Record saved. You can enter another record.</div>`;
      this.refreshIcons();
      // Scroll to top of form
      window.scrollTo({top:0,behavior:'smooth'});
      // Reset form after 2 seconds — keep locked signature fields on current user
      setTimeout(() => {
        document.getElementById('inspection-form').reset();
        // Re-lock signature fields to current user (reset would clear readonly values to HTML default, but ensure)
        const sigIds = ['pdi-inspected-by','pdi-approved-by','ip-prepared','ip-verified','ip-approved','tp-prepared','tp-checked','lm-checked','lm-approved'];
        sigIds.forEach(id => { const el=document.getElementById(id); if (el) el.value = this.currentUser?.name || ''; });
        alert.innerHTML = '';
        this.refreshIcons();
      }, 2000);
    } catch(err) {
      document.getElementById('form-alert').innerHTML = `<div class="alert alert-error"><i data-lucide="alert-circle"></i>${err.message}</div>`;
      this.refreshIcons();
    }
  },

  // ============================================================
  // ===== TABLES PAGE — 4 Category Cards =====
  // ============================================================
  renderTables() {
    return `${this.renderHeader()}<main class="main-content"><button class="back-btn" onclick="App.navigate('dashboard')"><i data-lucide="arrow-left"></i> Back to Dashboard</button>
      <div class="page-header"><h2>Submitted Data</h2><p>Select a category to view all submitted inspection records in table format.</p></div>
      <div class="topics-grid">
        <div class="topic-card pdi" onclick="App.openTable('pdi')"><div class="topic-card-top"><div class="topic-card-icon"><i data-lucide="package"></i></div><span class="topic-card-badge">TF/QAD</span></div><h3>Predispatch Inspection (PDI)</h3><p>View all PDI submitted records.</p><div class="topic-card-arrow"><i data-lucide="arrow-right"></i></div></div>
        <div class="topic-card inprocess" onclick="App.openTable('inprocess')"><div class="topic-card-top"><div class="topic-card-icon"><i data-lucide="factory"></i></div><span class="topic-card-badge">TF/QAD/15</span></div><h3>Inprocess Inspection — Fabric</h3><p>View all Inprocess submitted records.</p><div class="topic-card-arrow"><i data-lucide="arrow-right"></i></div></div>
        <div class="topic-card tape" onclick="App.openTable('tape')"><div class="topic-card-top"><div class="topic-card-icon"><i data-lucide="cog"></i></div><span class="topic-card-badge">TF/QAD/14</span></div><h3>Tape Plant — Extruder</h3><p>View all Tape Plant submitted records.</p><div class="topic-card-arrow"><i data-lucide="arrow-right"></i></div></div>
        <div class="topic-card lamination" onclick="App.openTable('lamination')"><div class="topic-card-top"><div class="topic-card-icon"><i data-lucide="ruler"></i></div><span class="topic-card-badge">TF/QAD/11</span></div><h3>Lamination — GSM & Tear/COF</h3><p>View all Lamination submitted records.</p><div class="topic-card-arrow"><i data-lucide="arrow-right"></i></div></div>
      </div></main>`;
  },

  openTable(category) {
    this._tableCategory = category;
    this.navigate('table-view', category);
  },

  // ============================================================
  // ===== TABLE VIEW — Records for selected category =====
  // ============================================================
  renderTableView() {
    const cat = this.currentView || this._tableCategory;
    return `${this.renderHeader()}<main class="main-content"><button class="back-btn" onclick="App.navigate('tables')"><i data-lucide="arrow-left"></i> Back to Tables</button>
      <div class="card"><div class="card-header"><h2><i data-lucide="${this.getTypeIcon(cat)}"></i> ${this.getTypeLabel(cat)} — Records</h2></div><div id="table-view-content" class="loading"><div class="spinner"></div></div></div></main>`;
  },

  async loadTableView() {
    const cat = this.currentView || this._tableCategory;
    try {
      const all = await this.api('/api/inspections/my-inspections');
      const filtered = all.filter(i => i.inspection_type === cat);
      this._sheetData = filtered;
      const container = document.getElementById('table-view-content');
      if (!filtered.length) { container.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i data-lucide="inbox"></i></div><h3>No records yet</h3><p>No ${this.getTypeLabel(cat)} records found.</p></div>`; this.refreshIcons(); return; }

      // Build category-specific aggregated roll data table — all rolls of this category in ONE table
      let html = `<div style="padding:14px 16px;background:var(--gray-50);border-bottom:1px solid var(--gray-200);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <span style="font-size:0.8125rem;color:var(--gray-600)"><strong style="color:var(--gray-900)">${filtered.length}</strong> record(s) &middot; ${this.getTypeLabel(cat)}</span>
        <span style="font-size:0.75rem;color:var(--gray-500)">All roll data for this category shown below — each row is one roll/sample/entry. Click <strong>View</strong> to open that roll's parent record as A4 document (record-specific download).</span>
      </div>`;

      const escDash = (v) => (v===undefined||v===null||v===''? '—' : esc(v));

      if (cat === 'pdi') {
        html += `<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Date</th><th>W/O</th><th>Customer</th><th>Roll No</th><th>Weight</th><th>Width</th><th>GSM</th><th>Dia</th><th>Thickness</th><th>Label</th><th>Print</th><th>Core</th><th>Result</th><th style="text-align:right">View</th></tr></thead><tbody>`;
        let totalRolls = 0;
        filtered.forEach(rec => {
          const f = rec.form_data || {};
          const date = esc(f.date || new Date(rec.created_at).toLocaleDateString());
          const wo = esc(f.wo_no); const cust = esc(f.customer); const result = esc(f.result);
          const rolls = Array.isArray(f.rolls) && f.rolls.length ? f.rolls : [{ _empty:true }];
          rolls.forEach(r => {
            totalRolls++;
            if (r._empty) {
              html += `<tr><td><span style="font-family:var(--font-mono);font-weight:600;color:var(--primary-accent)">#${rec.id}</span></td><td>${date}</td><td>${wo}</td><td>${cust}</td><td colspan="8" style="text-align:center;color:var(--gray-400)">No roll data</td><td>${result}</td><td style="text-align:right"><button class="btn btn-primary btn-xs" onclick="App.viewA4Report(${rec.id})"><i data-lucide="eye"></i> View</button></td></tr>`;
            } else {
              html += `<tr><td><span style="font-family:var(--font-mono);font-weight:600;color:var(--primary-accent)">#${rec.id}</span></td><td>${date}</td><td>${wo}</td><td>${cust}</td><td>${esc(r.roll_number)}</td><td>${esc(r.roll_weight)}</td><td>${esc(r.width)}</td><td>${esc(r.avg_gsm)}</td><td>${esc(r.dia)}</td><td>${esc(r.thickness)}</td><td>${esc(r.label_ok)}</td><td>${esc(r.print_ok)}</td><td>${esc(r.paper_core)}</td><td>${result}</td><td style="text-align:right"><button class="btn btn-primary btn-xs" onclick="App.viewA4Report(${rec.id})"><i data-lucide="eye"></i> View</button></td></tr>`;
            }
          });
        });
        html += `</tbody></table></div><div style="padding:10px 16px;font-size:0.75rem;color:var(--gray-500);background:var(--gray-25);border-top:1px solid var(--gray-100)">Total: <strong>${totalRolls}</strong> roll(s) from <strong>${filtered.length}</strong> record(s) of this category in one combined table.</div>`;
      } else if (cat === 'inprocess') {
        html += `<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Date</th><th>Shift</th><th>Loom/Roll</th><th>W/O</th><th>Fabric Code</th><th>Width</th><th>Mesh</th><th>Warp</th><th>Weft</th><th>GSM Req</th><th>GSM Act</th><th>Colour</th><th style="text-align:right">View</th></tr></thead><tbody>`;
        let total = 0;
        filtered.forEach(rec => {
          const f = rec.form_data || {};
          const date = esc(f.date || new Date(rec.created_at).toLocaleDateString());
          const shift = esc(f.shift);
          const rows = Array.isArray(f.rows) && f.rows.length ? f.rows : [{_empty:true}];
          rows.forEach(r => {
            total++;
            if (r._empty) html += `<tr><td><span style="font-family:var(--font-mono);font-weight:600;color:var(--primary-accent)">#${rec.id}</span></td><td>${date}</td><td>${shift}</td><td colspan="10" style="text-align:center;color:var(--gray-400)">No entry data</td><td style="text-align:right"><button class="btn btn-primary btn-xs" onclick="App.viewA4Report(${rec.id})"><i data-lucide="eye"></i> View</button></td></tr>`;
            else html += `<tr><td><span style="font-family:var(--font-mono);font-weight:600;color:var(--primary-accent)">#${rec.id}</span></td><td>${date}</td><td>${shift}</td><td>${esc(r.loom)}</td><td>${esc(r.wo)}</td><td>${esc(r.fabric_code)}</td><td>${esc(r.width)}</td><td>${esc(r.mesh)}</td><td>${esc(r.warp_strength)}</td><td>${esc(r.weft_strength)}</td><td>${esc(r.gsm_required)}</td><td>${esc(r.gsm_actual)}</td><td>${esc(r.colour_code)}</td><td style="text-align:right"><button class="btn btn-primary btn-xs" onclick="App.viewA4Report(${rec.id})"><i data-lucide="eye"></i> View</button></td></tr>`;
          });
        });
        html += `</tbody></table></div><div style="padding:10px 16px;font-size:0.75rem;color:var(--gray-500);background:var(--gray-25);border-top:1px solid var(--gray-100)">Total: <strong>${total}</strong> entries from <strong>${filtered.length}</strong> record(s).</div>`;
      } else if (cat === 'tape') {
        html += `<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Date</th><th>Plant</th><th>PP Grade</th><th>Sample #</th><th>Denier</th><th>Width (mm)</th><th>Strength</th><th>Elongation</th><th>Technician</th><th style="text-align:right">View</th></tr></thead><tbody>`;
        let total = 0;
        filtered.forEach(rec => {
          const f = rec.form_data || {};
          const date = esc(f.date || new Date(rec.created_at).toLocaleDateString());
          const plant = esc(f.plant_no); const pp = esc(f.pp_grade); const tech = esc(f.technician);
          const samples = Array.isArray(f.samples) && f.samples.length ? f.samples : [{_empty:true}];
          samples.forEach((s, idx) => {
            total++;
            if (s._empty) html += `<tr><td><span style="font-family:var(--font-mono);font-weight:600;color:var(--primary-accent)">#${rec.id}</span></td><td>${date}</td><td>${plant}</td><td>${pp}</td><td>—</td><td colspan="4" style="text-align:center;color:var(--gray-400)">No sample data</td><td>${tech}</td><td style="text-align:right"><button class="btn btn-primary btn-xs" onclick="App.viewA4Report(${rec.id})"><i data-lucide="eye"></i> View</button></td></tr>`;
            else html += `<tr><td><span style="font-family:var(--font-mono);font-weight:600;color:var(--primary-accent)">#${rec.id}</span></td><td>${date}</td><td>${plant}</td><td>${pp}</td><td>${idx+1}</td><td>${esc(s.denier)}</td><td>${esc(s.width)}</td><td>${esc(s.strength)}</td><td>${esc(s.elongation)}</td><td>${tech}</td><td style="text-align:right"><button class="btn btn-primary btn-xs" onclick="App.viewA4Report(${rec.id})"><i data-lucide="eye"></i> View</button></td></tr>`;
          });
        });
        html += `</tbody></table></div><div style="padding:10px 16px;font-size:0.75rem;color:var(--gray-500);background:var(--gray-25);border-top:1px solid var(--gray-100)">Total: <strong>${total}</strong> samples from <strong>${filtered.length}</strong> record(s).</div>`;
      } else if (cat === 'lamination') {
        html += `<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Date</th><th>Shift</th><th>Roll No</th><th>Customer</th><th>Thick</th><th>Req GSM</th><th>Avg GSM</th><th>Peel</th><th>Warp Tear</th><th>Weft Tear</th><th>COF K</th><th>COF S</th><th style="text-align:right">View</th></tr></thead><tbody>`;
        let total = 0;
        filtered.forEach(rec => {
          const f = rec.form_data || {};
          const date = esc(f.date || new Date(rec.created_at).toLocaleDateString());
          const shift = esc(f.shift);
          const rows = Array.isArray(f.rows) && f.rows.length ? f.rows : [{_empty:true}];
          rows.forEach(r => {
            total++;
            if (r._empty) html += `<tr><td><span style="font-family:var(--font-mono);font-weight:600;color:var(--primary-accent)">#${rec.id}</span></td><td>${date}</td><td>${shift}</td><td colspan="10" style="text-align:center;color:var(--gray-400)">No roll data</td><td style="text-align:right"><button class="btn btn-primary btn-xs" onclick="App.viewA4Report(${rec.id})"><i data-lucide="eye"></i> View</button></td></tr>`;
            else html += `<tr><td><span style="font-family:var(--font-mono);font-weight:600;color:var(--primary-accent)">#${rec.id}</span></td><td>${date}</td><td>${shift}</td><td>${esc(r.roll_no)}</td><td>${esc(r.customer)}</td><td>${esc(r.thickness)}</td><td>${esc(r.req_gsm)}</td><td>${esc(r.avg_gsm)}</td><td>${esc(r.peel_strength)}</td><td>${esc(r.warp_tear)}</td><td>${esc(r.weft_tear)}</td><td>${esc(r.cof_kinetic)}</td><td>${esc(r.cof_static)}</td><td style="text-align:right"><button class="btn btn-primary btn-xs" onclick="App.viewA4Report(${rec.id})"><i data-lucide="eye"></i> View</button></td></tr>`;
          });
        });
        html += `</tbody></table></div><div style="padding:10px 16px;font-size:0.75rem;color:var(--gray-500);background:var(--gray-25);border-top:1px solid var(--gray-100)">Total: <strong>${total}</strong> roll(s) from <strong>${filtered.length}</strong> record(s).</div>`;
      } else {
        let html2 = `<div class="table-wrap"><table class="data-table"><thead><tr><th style="width:60px">ID</th><th>Date</th><th>Inspector</th><th>Status</th><th style="text-align:right">View</th></tr></thead><tbody>`;
        filtered.forEach(i => {
          const f = i.form_data || {}; const date = esc(f.date || new Date(i.created_at).toLocaleDateString()); const by = esc(i.inspected_by || f.inspected_by || i.user_name);
          html2 += `<tr><td><span style="font-family:var(--font-mono);font-weight:600;color:var(--primary-accent)">#${i.id}</span></td><td>${date}</td><td>${by}</td><td><span class="badge badge-${i.status}">${i.status}</span></td><td style="text-align:right"><button class="btn btn-primary btn-xs" onclick="App.viewA4Report(${i.id})"><i data-lucide="eye"></i> View</button></td></tr>`;
        });
        html2 += '</tbody></table></div>';
        html += html2;
      }

      container.innerHTML = html;
      this.refreshIcons();
    } catch(err) { document.getElementById('table-view-content').innerHTML = `<div class="alert alert-error"><i data-lucide="alert-circle"></i>${err.message}</div>`; this.refreshIcons(); }
  },

  // ============================================================
  // ===== A4 REPORT — Full Page Document =====
  // ============================================================
  // Workflow: Table → View (dedicated A4 page) → Download (single record only)
  async viewA4Report(id) {
    try {
      const data = await this.api(`/api/inspections/${id}`);
      // Store the single record id for record-specific download logic: Selected Record ID → Fetch → Generate A4 → Download
      this._viewRecord = data;
      this.navigate('view-document', data);
    } catch(err) { alert(err.message); }
  },

  // Helper to build A4 HTML for exactly one record (no global data included)
  buildA4Content(data) {
    const type = data.inspection_type;
    // Recursively escape all string values in form_data for XSS safety
    const sanitizeObj = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(sanitizeObj);
      const safe = {};
      for (const [k, v] of Object.entries(obj)) {
        safe[k] = typeof v === 'string' ? esc(v) : (v && typeof v === 'object' ? sanitizeObj(v) : v);
      }
      return safe;
    };
    const f = sanitizeObj(data.form_data);
    let content = '';

    if (type === 'pdi') {
      content = `<div class="a4-header"><div class="a4-logo-row"><div class="a4-logo-icon"><i data-lucide="clipboard-check"></i></div><div><h1>Predispatch Inspection Report (PDI)</h1><div class="a4-subtitle">Roofing Underlayment & Coated Fabric</div></div></div><div class="a4-doc-meta">Record #${data.id} &middot; TF/QAD</div></div>
        <table class="a4-table"><thead><tr><th>Field</th><th>Value</th><th>Field</th><th>Value</th></tr></thead><tbody>
          <tr><td>Date</td><td>${f.date||'—'}</td><td>W/O No.</td><td>${f.wo_no||'—'}</td></tr>
          <tr><td>Customer</td><td>${f.customer||'—'}</td><td>PO No.</td><td>${f.po_no||'—'}</td></tr>
          <tr><td>Color</td><td>${f.color||'—'}</td><td>Qty Dispatch</td><td>${f.qty_dispatch||'—'}</td></tr>
          <tr><td>Total Pallets</td><td>${f.total_pallets||'—'}</td><td>Result</td><td><strong>${f.result||'—'}</strong></td></tr>
        </tbody></table>
        ${f.rolls?.length?`<div class="a4-section-title">Roll Inspection Data</div><table class="a4-table"><thead><tr><th>Roll No</th><th>Weight</th><th>Width</th><th>GSM</th><th>Dia</th><th>Thickness</th><th>Label</th><th>Print</th><th>Core</th></tr></thead><tbody>${f.rolls.map(r=>`<tr><td>${r.roll_number}</td><td>${r.roll_weight}kg</td><td>${r.width}CM</td><td>${r.avg_gsm}</td><td>${r.dia}"</td><td>${r.thickness}</td><td>${r.label_ok}</td><td>${r.print_ok}</td><td>${r.paper_core}</td></tr>`).join('')}</tbody></table>`:''}
        ${f.observation?`<div class="a4-box"><div class="a4-box-title">Observation</div><div class="a4-box-content">${f.observation}</div></div>`:''}
        <div class="a4-signatures"><div class="a4-sig-box"><div class="a4-sig-name">${f.inspected_by||'—'}</div><div class="a4-sig-label">Inspected By</div></div><div class="a4-sig-box"><div class="a4-sig-name">${f.approved_by||'—'}</div><div class="a4-sig-label">Approved By</div></div></div>`;
    } else if (type === 'inprocess') {
      content = `<div class="a4-header"><div class="a4-logo-row"><div class="a4-logo-icon"><i data-lucide="clipboard-check"></i></div><div><h1>Inprocess Inspection Report</h1><div class="a4-subtitle">Fabric Inprocess Quality Check</div></div></div><div class="a4-doc-meta">Record #${data.id} &middot; TF/QAD/15</div></div>
        <table class="a4-table"><thead><tr><th>Field</th><th>Value</th><th>Field</th><th>Value</th></tr></thead><tbody>
          <tr><td>Date</td><td>${f.date||'—'}</td><td>Shift</td><td>${f.shift||'—'}</td></tr>
          <tr><td>Doc Reference</td><td>${f.doc_ref||'—'}</td><td>Result</td><td><strong>${f.result||'Accepted'}</strong></td></tr>
        </tbody></table>
        ${f.rows?.length?`<div class="a4-section-title">Fabric Data</div><table class="a4-table"><thead><tr><th>Loom</th><th>W/O</th><th>Code</th><th>Width</th><th>Mesh</th><th>Warp</th><th>Weft</th><th>GSM</th><th>Colour</th></tr></thead><tbody>${f.rows.filter(r=>r.loom||r.wo).map(r=>`<tr><td>${r.loom}</td><td>${r.wo}</td><td>${r.fabric_code}</td><td>${r.width}</td><td>${r.mesh}</td><td>${r.warp_strength}</td><td>${r.weft_strength}</td><td>${r.gsm_actual}</td><td>${r.colour_code}</td></tr>`).join('')}</tbody></table>`:''}
        <div class="a4-signatures"><div class="a4-sig-box"><div class="a4-sig-name">${f.prepared_by||'—'}</div><div class="a4-sig-label">Prepared By</div></div><div class="a4-sig-box"><div class="a4-sig-name">${f.verified_by||'—'}</div><div class="a4-sig-label">Verified By</div></div><div class="a4-sig-box"><div class="a4-sig-name">${f.approved_by||'—'}</div><div class="a4-sig-label">Approved By</div></div></div>`;
    } else if (type === 'tape') {
      content = `<div class="a4-header"><div class="a4-logo-row"><div class="a4-logo-icon"><i data-lucide="clipboard-check"></i></div><div><h1>Tape Plant — Extruder Inspection</h1><div class="a4-subtitle">FSA/Inprocess Inspection Report</div></div></div><div class="a4-doc-meta">Record #${data.id} &middot; TF/QAD/14</div></div>
        <table class="a4-table"><thead><tr><th>Field</th><th>Value</th><th>Field</th><th>Value</th></tr></thead><tbody>
          <tr><td>Plant No.</td><td>${f.plant_no||'—'}</td><td>Date</td><td>${f.date||'—'}</td></tr>
          <tr><td>PP Grade</td><td>${f.pp_grade||'—'}</td><td>UV Grade</td><td>${f.uv_grade||'—'}</td></tr>
          <tr><td>Technician</td><td>${f.technician||'—'}</td><td>Result</td><td><strong>${f.result||'Accepted'}</strong></td></tr>
        </tbody></table>
        ${f.samples?.length?`<div class="a4-section-title">Extruder Sample Data</div><table class="a4-table"><thead><tr><th>#</th><th>Denier</th><th>Width (mm)</th><th>Strength (kgf)</th><th>Elongation (%)</th></tr></thead><tbody>${f.samples.filter(s=>s.denier).map((s,i)=>`<tr><td>${i+1}</td><td>${s.denier}</td><td>${s.width}</td><td>${s.strength}</td><td>${s.elongation}</td></tr>`).join('')}</tbody></table>`:''}
        ${f.machine?`<div class="a4-section-title">Machine Parameters</div><table class="a4-table"><thead><tr><th>Field</th><th>Value</th><th>Field</th><th>Value</th></tr></thead><tbody>
          <tr><td>Speed</td><td>${f.machine.speed||'—'}</td><td>Temperature</td><td>${f.machine.temp||'—'}</td></tr>
          <tr><td>Screw RPM</td><td>${f.machine.screw_rpm||'—'}</td><td>Godet-I</td><td>${f.machine.godet1||'—'}</td></tr>
          <tr><td>Barrel</td><td>${f.machine.barrel||'—'}</td><td>Die</td><td>${f.machine.die||'—'}</td></tr>
          <tr><td>Stretch Ratio</td><td>${f.machine.stretch_ratio||'—'}</td><td>Annealing %</td><td>${f.machine.anneal_pct||'—'}</td></tr>
        </tbody></table>`:''}
        <div class="a4-signatures"><div class="a4-sig-box"><div class="a4-sig-name">${f.prepared_by||'—'}</div><div class="a4-sig-label">Prepared By</div></div><div class="a4-sig-box"><div class="a4-sig-name">${f.checked_by||'—'}</div><div class="a4-sig-label">Checked By</div></div></div>`;
    } else if (type === 'lamination') {
      content = `<div class="a4-header"><div class="a4-logo-row"><div class="a4-logo-icon"><i data-lucide="clipboard-check"></i></div><div><h1>Lamination Inspection Report</h1><div class="a4-subtitle">Die GSM & Tear/COF/Peel Strength</div></div></div><div class="a4-doc-meta">Record #${data.id} &middot; TF/QAD/11</div></div>
        <table class="a4-table"><thead><tr><th>Field</th><th>Value</th><th>Field</th><th>Value</th></tr></thead><tbody>
          <tr><td>Date</td><td>${f.date||'—'}</td><td>Shift</td><td>${f.shift||'—'}</td></tr>
          <tr><td>Doc Reference</td><td>${f.doc_ref||'—'}</td><td>Result</td><td><strong>${f.result||'Accepted'}</strong></td></tr>
        </tbody></table>
        ${f.rows?.length?`<div class="a4-section-title">Roll Data</div><table class="a4-table"><thead><tr><th>Roll</th><th>Customer</th><th>Thick</th><th>GSM</th><th>Peel</th><th>Warp Tear</th><th>Weft Tear</th><th>COF(K)</th><th>COF(S)</th></tr></thead><tbody>${f.rows.filter(r=>r.roll_no).map(r=>`<tr><td>${r.roll_no}</td><td>${r.customer}</td><td>${r.thickness}</td><td>${r.avg_gsm}</td><td>${r.peel_strength}</td><td>${r.warp_tear}</td><td>${r.weft_tear}</td><td>${r.cof_kinetic}</td><td>${r.cof_static}</td></tr>`).join('')}</tbody></table>`:''}
        <div class="a4-signatures"><div class="a4-sig-box"><div class="a4-sig-name">${f.checked_by||'—'}</div><div class="a4-sig-label">Checked By</div></div><div class="a4-sig-box"><div class="a4-sig-name">${f.approved_by||'—'}</div><div class="a4-sig-label">Approved By</div></div></div>`;
    } else {
      content = `<div class="a4-header"><div class="a4-logo-row"><div class="a4-logo-icon"><i data-lucide="clipboard-check"></i></div><div><h1>${this.getTypeLabel(type)} Inspection Report</h1></div></div><div class="a4-doc-meta">Record #${data.id}</div></div>
        <table class="a4-table"><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${Object.entries(f).filter(([,v])=>typeof v!=='object'&&v).map(([k,v])=>`<tr><td>${k.replace(/_/g,' ')}</td><td>${v}</td></tr>`).join('')}</tbody></table>
        <div class="a4-signatures"><div class="a4-sig-box"><div class="a4-sig-name">${data.inspected_by||'—'}</div><div class="a4-sig-label">Inspected By</div></div><div class="a4-sig-box"><div class="a4-sig-name">${data.approved_by||'—'}</div><div class="a4-sig-label">Approved By</div></div></div>`;
    }

    content += `<div class="a4-footer">Generated by Nexora CheckSheet &middot; ${new Date().toLocaleString()} &middot; Employee: ${data.user_name} (${data.user_emp_id})</div>`;
    return content;
  },

  // Dedicated document view page — shows ONLY the selected record as professional A4 document
  // Flow: Selected Record ID → Fetch Specific Record → Generate A4 Document → Download (single record)
  renderViewDocument() {
    const data = this.currentView || this._viewRecord;
    if (!data || !data.id) {
      return `${this.renderHeader()}<main class="main-content"><div class="alert alert-error"><i data-lucide="alert-circle"></i> No record selected. Please go to Table → Select a category → View a record.</div><button class="back-btn" onclick="App.navigate('tables')"><i data-lucide="arrow-left"></i> Back to Tables</button></main>`;
    }
    const cat = data.inspection_type;
    const docTitle = this.getTypeLabel(cat);
    const a4Content = this.buildA4Content(data);
    return `${this.renderHeader()}<main class="main-content view-document-page">
      <button class="back-btn no-print" onclick="App.navigate('table-view', App._tableCategory)"><i data-lucide="arrow-left"></i> Back to ${docTitle} Records</button>
      <div class="page-header no-print" style="margin-bottom:18px">
        <h2><i data-lucide="file-text"></i> Document View — Record #${data.id}</h2>
        <p>${docTitle} &middot; Category: ${cat.toUpperCase()} &middot; View-only A4 document for this single record</p>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-bottom:16px" class="no-print">
        <button class="btn btn-outline btn-sm" onclick="App.navigate('table-view', App._tableCategory)"><i data-lucide="arrow-left"></i> Back</button>
        <button class="btn btn-primary" onclick="App.downloadCurrentDocument()"><i data-lucide="download"></i> Download Document</button>
      </div>
      <div id="a4-print-root" class="a4-container" style="margin:0 auto;max-height:none;overflow:visible;box-shadow:var(--shadow-md)">
        <div class="a4-page">${a4Content}</div>
      </div>
      <div class="a4-toolbar no-print" style="margin-top:16px;justify-content:center;border-radius:var(--radius-lg);border:1px solid var(--gray-200);background:var(--gray-50);padding:14px">
        <button class="btn btn-primary" onclick="App.downloadCurrentDocument()"><i data-lucide="download"></i> Download Document</button>
        <span style="font-size:0.8125rem;color:var(--gray-500);margin-left:12px">Downloads ONLY Record #${data.id} — current document</span>
      </div>
    </main>`;
  },

  // Legacy overlay path removed — now uses dedicated view-document page
  // Kept for backward compat if called directly
  renderA4Page(data) {
    this._viewRecord = data;
    this.navigate('view-document', data);
  },

  // Record-specific download: ONLY the currently viewed record (ID from view-document)
  downloadCurrentDocument() {
    const data = this.currentView || this._viewRecord;
    if (!data) { alert('No document to download.'); return; }
    // Preserve A4 layout: use browser print to PDF — content is single record only
    window.print();
  },

  // Legacy alias
  downloadA4() { this.downloadCurrentDocument(); },

  // ============================================================
  // ===== FORM ADD-ENTRY HELPERS (delegates to FormRenderers in forms.js) =====
  // ============================================================

  // --- PDI (form rendering delegated to FormRenderers) ---
  _pdiFormRemoved() {
    return `<div class="form-section"><div class="form-section-title"><i data-lucide="info"></i> General Information</div><div class="form-section-grid">
      <div class="form-group"><label>Date of Inspection</label><input type="date" id="pdi-date" required></div>
      <div class="form-group"><label>Work Order No.</label><input type="text" id="pdi-wo" placeholder="W72600095" required></div>
      <div class="form-group"><label>Customer</label><input type="text" id="pdi-customer" placeholder="Polyglass" required></div>
      <div class="form-group"><label>PO Number</label><input type="text" id="pdi-po"></div>
      <div class="form-group"><label>Color</label><input type="text" id="pdi-color" placeholder="Black and Green"></div>
      <div class="form-group"><label>Qty Dispatch</label><input type="text" id="pdi-qty" placeholder="48 Rolls"></div>
    </div></div>
    <div class="form-section"><div class="form-section-title"><i data-lucide="list"></i> Roll Inspection Details</div><div id="pdi-rolls">${this._pdiRollHTML(1)}</div><button type="button" class="btn btn-outline btn-sm" style="margin-top:14px" onclick="App.addPDIRoll()"><i data-lucide="plus"></i> Add Another Roll</button></div>
    <div class="form-section"><div class="form-section-title"><i data-lucide="check-square"></i> Requirements</div><div class="form-section-grid">
      <div class="form-group"><label>Weight Range (kg)</label><input type="text" id="pdi-req-weight" placeholder="296.8-405.1"></div>
      <div class="form-group"><label>Width Range (CM)</label><input type="text" id="pdi-req-width" placeholder="99.5-101"></div>
      <div class="form-group"><label>GSM Range</label><input type="text" id="pdi-req-gsm" placeholder="152-168"></div>
      <div class="form-group"><label>Dia Range (inch)</label><input type="text" id="pdi-req-dia" placeholder="33.7-38.2"></div>
      <div class="form-group"><label>Thickness Range (mils)</label><input type="text" id="pdi-req-thickness" placeholder="12 to 14"></div>
      <div class="form-group"><label>Pallet Size</label><input type="text" id="pdi-req-pallet" placeholder="900*900*130 cm"></div>
    </div></div>
    <div class="form-section"><div class="form-section-title"><i data-lucide="clipboard-list"></i> Result & Observation</div><div class="form-section-grid">
      <div class="form-group"><label>Result</label><select id="pdi-result"><option value="Accepted">Accepted</option><option value="Accepted under Deviation">Accepted under Deviation</option><option value="Rejected">Rejected</option></select></div>
      <div class="form-group"><label>No. of Deviations</label><input type="number" id="pdi-deviations" placeholder="0"></div>
    </div><div class="form-group"><label>Observation</label><textarea id="pdi-observation" rows="3" placeholder="Enter observations..."></textarea></div></div>
    <div class="form-section"><div class="form-section-title"><i data-lucide="pen-tool"></i> Signatures</div><div class="form-section-grid">
      <div class="form-group"><label>Inspected By</label><input type="text" id="pdi-inspected-by" value="${this.currentUser?.name||''}" readonly tabindex="-1" style="background:var(--gray-50);cursor:not-allowed"></div>
      <div class="form-group"><label>Approved By</label><input type="text" id="pdi-approved-by" value="${this.currentUser?.name||''}" readonly tabindex="-1" style="background:var(--gray-50);cursor:not-allowed"></div>
    </div><p style="font-size:0.75rem;color:var(--gray-500);margin-top:8px"><i data-lucide="lock" style="width:12px;height:12px;display:inline;vertical-align:-1px"></i> Auto-filled with logged-in user &amp; locked — cannot be edited</p></div>`;
  },

  _pdiRollHTML(n) {
    return `<div class="form-entry-card" data-index="${n}"><div class="form-entry-header"><i data-lucide="package"></i> Roll ${n}<button type="button" class="btn btn-danger btn-xs" onclick="this.closest('.form-entry-card').remove()"><i data-lucide="trash-2"></i> Remove</button></div><div class="form-section-grid">
      <div class="form-group"><label>Roll Number</label><input type="text" class="pdi-roll-no" placeholder="H26-05-G88A"></div>
      <div class="form-group"><label>Roll Weight (kg)</label><input type="number" step="0.1" class="pdi-roll-weight"></div>
      <div class="form-group"><label>Width (CM)</label><input type="number" step="0.1" class="pdi-roll-width"></div>
      <div class="form-group"><label>Average GSM</label><input type="number" step="0.1" class="pdi-roll-gsm"></div>
      <div class="form-group"><label>Dia of Roll (inch)</label><input type="number" step="0.01" class="pdi-roll-dia"></div>
      <div class="form-group"><label>Thickness (mils)</label><input type="text" class="pdi-roll-thickness" placeholder="12.5-14.5"></div>
      <div class="form-group"><label>Label Verification</label><select class="pdi-roll-label"><option>OK</option><option>Not OK</option></select></div>
      <div class="form-group"><label>Print Matter</label><select class="pdi-roll-print"><option>OK</option><option>Not OK</option></select></div>
      <div class="form-group"><label>Paper Core</label><input type="text" class="pdi-roll-core" placeholder="1015*15"></div>
    </div></div>`;
  },

  addPDIRoll() { this.pdiRollCount++; const c=document.getElementById('pdi-rolls'); const w=document.createElement('div'); w.innerHTML=FormRenderers._pdiRollHTML(this.pdiRollCount); c.appendChild(w.firstElementChild); this.refreshIcons(); },

  // --- Inprocess ---
  renderInprocessForm() {
    return `<div class="form-section"><div class="form-section-title"><i data-lucide="info"></i> General</div><div class="form-section-grid">
      <div class="form-group"><label>Date</label><input type="date" id="ip-date" required></div>
      <div class="form-group"><label>Shift</label><select id="ip-shift"><option>Morning</option><option>Afternoon</option><option>Night</option></select></div>
      <div class="form-group"><label>Doc Reference</label><input type="text" id="ip-docref" value="TF/QAD/15 Rev 00"></div>
    </div></div>
    <div class="form-section" id="ip-entries"><div class="form-section-title"><i data-lucide="list"></i> Fabric Inspection Entries</div>
      ${[1].map(n=>this._inprocessEntryHTML(n)).join('')}
      <button type="button" class="btn btn-outline btn-sm" style="margin-top:14px" onclick="App.addInprocessEntry()"><i data-lucide="plus"></i> Add Another Entry</button>
    </div>
    <div class="form-section"><div class="form-section-title"><i data-lucide="pen-tool"></i> Signatures</div><div class="form-section-grid">
      <div class="form-group"><label>Prepared By</label><input type="text" id="ip-prepared" value="${this.currentUser?.name||''}" readonly tabindex="-1" style="background:var(--gray-50);cursor:not-allowed"></div>
      <div class="form-group"><label>Verified By</label><input type="text" id="ip-verified" value="${this.currentUser?.name||''}" readonly tabindex="-1" style="background:var(--gray-50);cursor:not-allowed"></div>
      <div class="form-group"><label>Approved By</label><input type="text" id="ip-approved" value="${this.currentUser?.name||''}" readonly tabindex="-1" style="background:var(--gray-50);cursor:not-allowed"></div>
    </div><p style="font-size:0.75rem;color:var(--gray-500);margin-top:8px"><i data-lucide="lock" style="width:12px;height:12px;display:inline;vertical-align:-1px"></i> Auto-filled with logged-in user &amp; locked — cannot be edited</p></div>`;
  },

  _inprocessEntryHTML(n) {
    return `<div class="form-entry-card" data-entry="${n}"><div class="form-entry-header"><i data-lucide="factory"></i> Entry ${n}<button type="button" class="btn btn-danger btn-xs" onclick="this.closest('.form-entry-card').remove()"><i data-lucide="trash-2"></i> Remove</button></div><div class="form-section-grid">
      <div class="form-group"><label>Loom / Roll No.</label><input type="text" class="ip-loom" placeholder="Loom or Roll identifier"></div>
      <div class="form-group"><label>Work Order (W/O)</label><input type="text" class="ip-wo" placeholder="W72600098"></div>
      <div class="form-group"><label>Particulars</label><select class="ip-particulars"><option>Standard</option><option>Actual</option></select></div>
      <div class="form-group"><label>Fabric Code</label><input type="text" class="ip-fcode" placeholder="e.g. RF-001"></div>
      <div class="form-group"><label>Width (CM)</label><input type="number" step="0.1" class="ip-width" placeholder="100.5"></div>
      <div class="form-group"><label>Mesh</label><input type="text" class="ip-mesh" placeholder="e.g. 10x10"></div>
      <div class="form-group"><label>Warp Strength (kgf)</label><input type="number" step="0.1" class="ip-warp-str" placeholder="120"></div>
      <div class="form-group"><label>Weft Strength (kgf)</label><input type="number" step="0.1" class="ip-weft-str" placeholder="95"></div>
      <div class="form-group"><label>GSM Required</label><input type="number" step="0.1" class="ip-gsm-req" placeholder="160"></div>
      <div class="form-group"><label>GSM Actual</label><input type="number" step="0.1" class="ip-gsm-act" placeholder="162"></div>
      <div class="form-group"><label>Colour Code</label><input type="text" class="ip-colour" placeholder="Black"></div>
      <div class="form-group"><label>Remarks</label><input type="text" class="ip-remarks" placeholder="Any observations"></div>
    </div></div>`;
  },

  addInprocessEntry() { this._ipEntryCount++; const c=document.getElementById('ip-entries'); const w=document.createElement('div'); w.innerHTML=FormRenderers._inprocessEntryHTML(this._ipEntryCount); c.appendChild(w.firstElementChild); this.refreshIcons(); },

  // --- Tape Plant ---
  renderTapeForm() {
    return `<div class="form-section"><div class="form-section-title"><i data-lucide="info"></i> General</div><div class="form-section-grid">
      <div class="form-group"><label>Plant No.</label><input type="text" id="tp-plant" required></div>
      <div class="form-group"><label>Date</label><input type="date" id="tp-date" required></div>
      <div class="form-group"><label>PP Grade</label><input type="text" id="tp-pp-grade"></div>
      <div class="form-group"><label>PP Lot No.</label><input type="text" id="tp-pp-lot"></div>
      <div class="form-group"><label>UV Grade</label><input type="text" id="tp-uv-grade"></div>
      <div class="form-group"><label>Technician</label><input type="text" id="tp-technician"></div>
    </div></div>
    <div class="form-section" id="tp-samples"><div class="form-section-title"><i data-lucide="list"></i> Extruder Sample Data</div>
      ${[1,2,3,4,5].map(n=>this._tapeSampleHTML(n)).join('')}
      <button type="button" class="btn btn-outline btn-sm" style="margin-top:14px" onclick="App.addTapeSample()"><i data-lucide="plus"></i> Add Another Sample</button>
    </div>
    <div class="form-section"><div class="form-section-title"><i data-lucide="settings"></i> Machine Parameters</div><div class="form-section-grid">
      <div class="form-group"><label>Speed</label><input type="text" id="tp-speed"></div>
      <div class="form-group"><label>Temperature</label><input type="text" id="tp-temp"></div>
      <div class="form-group"><label>Screw RPM</label><input type="number" id="tp-screw-rpm"></div>
      <div class="form-group"><label>Godet-I</label><input type="text" id="tp-godet1"></div>
      <div class="form-group"><label>Barrel</label><input type="text" id="tp-barrel"></div>
      <div class="form-group"><label>Die</label><input type="text" id="tp-die"></div>
      <div class="form-group"><label>Stretch Ratio</label><input type="text" id="tp-stretch"></div>
      <div class="form-group"><label>Annealing %</label><input type="text" id="tp-anneal-pct"></div>
    </div></div>
    <div class="form-section"><div class="form-section-title"><i data-lucide="pen-tool"></i> Signatures</div><div class="form-section-grid">
      <div class="form-group"><label>Prepared By</label><input type="text" id="tp-prepared" value="${this.currentUser?.name||''}" readonly tabindex="-1" style="background:var(--gray-50);cursor:not-allowed"></div>
      <div class="form-group"><label>Checked By</label><input type="text" id="tp-checked" value="${this.currentUser?.name||''}" readonly tabindex="-1" style="background:var(--gray-50);cursor:not-allowed"></div>
    </div><p style="font-size:0.75rem;color:var(--gray-500);margin-top:8px"><i data-lucide="lock" style="width:12px;height:12px;display:inline;vertical-align:-1px"></i> Auto-filled with logged-in user &amp; locked — cannot be edited</p></div>`;
  },

  _tapeSampleHTML(n) {
    return `<div class="form-entry-card" data-sample="${n}"><div class="form-entry-header"><i data-lucide="hash"></i> Sample ${n}<button type="button" class="btn btn-danger btn-xs" onclick="this.closest('.form-entry-card').remove()"><i data-lucide="trash-2"></i> Remove</button></div><div class="form-section-grid">
      <div class="form-group"><label>Denier</label><input type="number" step="0.1" class="tp-denier" placeholder="1500"></div>
      <div class="form-group"><label>Width (mm)</label><input type="number" step="0.1" class="tp-width" placeholder="25"></div>
      <div class="form-group"><label>Strength (kgf)</label><input type="number" step="0.1" class="tp-strength" placeholder="18"></div>
      <div class="form-group"><label>Elongation (%)</label><input type="number" step="0.1" class="tp-elongation" placeholder="12"></div>
    </div></div>`;
  },

  addTapeSample() { this._tpSampleCount++; const c=document.getElementById('tp-samples'); const w=document.createElement('div'); w.innerHTML=FormRenderers._tapeSampleHTML(this._tpSampleCount); c.appendChild(w.firstElementChild); this.refreshIcons(); },

  // --- Lamination ---
  renderLaminationForm() {
    return `<div class="form-section"><div class="form-section-title"><i data-lucide="info"></i> General</div><div class="form-section-grid">
      <div class="form-group"><label>Date</label><input type="date" id="lm-date" required></div>
      <div class="form-group"><label>Shift</label><select id="lm-shift"><option>Morning</option><option>Afternoon</option><option>Night</option></select></div>
      <div class="form-group"><label>Doc Reference</label><input type="text" id="lm-docref" value="TF/QAD/11 REV:01"></div>
    </div></div>
    <div class="form-section" id="lm-entries"><div class="form-section-title"><i data-lucide="list"></i> Roll Inspection Entries</div>
      ${[1,2].map(n=>this._laminationEntryHTML(n)).join('')}
      <button type="button" class="btn btn-outline btn-sm" style="margin-top:14px" onclick="App.addLaminationEntry()"><i data-lucide="plus"></i> Add Another Roll</button>
    </div>
    <div class="form-section"><div class="form-section-title"><i data-lucide="pen-tool"></i> Signatures</div><div class="form-section-grid">
      <div class="form-group"><label>Checked By</label><input type="text" id="lm-checked" value="${this.currentUser?.name||''}" readonly tabindex="-1" style="background:var(--gray-50);cursor:not-allowed"></div>
      <div class="form-group"><label>Approved By</label><input type="text" id="lm-approved" value="${this.currentUser?.name||''}" readonly tabindex="-1" style="background:var(--gray-50);cursor:not-allowed"></div>
    </div><p style="font-size:0.75rem;color:var(--gray-500);margin-top:8px"><i data-lucide="lock" style="width:12px;height:12px;display:inline;vertical-align:-1px"></i> Auto-filled with logged-in user &amp; locked — cannot be edited</p></div>`;
  },

  _laminationEntryHTML(n) {
    return `<div class="form-entry-card" data-roll="${n}"><div class="form-entry-header"><i data-lucide="package"></i> Roll ${n}<button type="button" class="btn btn-danger btn-xs" onclick="this.closest('.form-entry-card').remove()"><i data-lucide="trash-2"></i> Remove</button></div>
      <div class="form-section-grid">
        <div class="form-group"><label>Roll No.</label><input type="text" class="lm-roll" placeholder="H26-08-G001"></div>
        <div class="form-group"><label>Customer</label><input type="text" class="lm-customer" placeholder="Customer name"></div>
        <div class="form-group"><label>Thickness (mm)</label><input type="text" class="lm-thickness" placeholder="0.5"></div>
        <div class="form-group"><label>Required GSM</label><input type="number" step="0.1" class="lm-req-gsm" placeholder="160"></div>
      </div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--gray-200)"><div style="font-size:0.75rem;font-weight:600;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">GSM Readings (4 Points)</div><div class="form-section-grid">
        <div class="form-group"><label>GSM Point 1</label><input type="number" step="0.1" class="lm-gsm1" placeholder="158"></div>
        <div class="form-group"><label>GSM Point 2</label><input type="number" step="0.1" class="lm-gsm2" placeholder="162"></div>
        <div class="form-group"><label>GSM Point 3</label><input type="number" step="0.1" class="lm-gsm3" placeholder="160"></div>
        <div class="form-group"><label>GSM Point 4</label><input type="number" step="0.1" class="lm-gsm4" placeholder="161"></div>
        <div class="form-group"><label>Average GSM</label><input type="number" step="0.1" class="lm-avg-gsm" placeholder="160.3"></div>
      </div></div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--gray-200)"><div style="font-size:0.75rem;font-weight:600;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Strength & COF</div><div class="form-section-grid">
        <div class="form-group"><label>Peel Strength (N/cm)</label><input type="number" step="0.1" class="lm-peel" placeholder="12"></div>
        <div class="form-group"><label>Warp Tear (N)</label><input type="number" step="0.1" class="lm-warp-tear" placeholder="45"></div>
        <div class="form-group"><label>Weft Tear (N)</label><input type="number" step="0.1" class="lm-weft-tear" placeholder="40"></div>
        <div class="form-group"><label>COF — Kinetic</label><input type="number" step="0.01" class="lm-cof-kin" placeholder="0.35"></div>
        <div class="form-group"><label>COF — Static</label><input type="number" step="0.01" class="lm-cof-stat" placeholder="0.42"></div>
      </div></div>
    </div>`;
  },

  addLaminationEntry() { this._lmEntryCount++; const c=document.getElementById('lm-entries'); const w=document.createElement('div'); w.innerHTML=FormRenderers._laminationEntryHTML(this._lmEntryCount); c.appendChild(w.firstElementChild); this.refreshIcons(); }, 

  // ============================================================
  // ===== COLLECTORS — 4 Categories Only =====
  // ============================================================

  collectPDI() {
    const rolls=[]; document.querySelectorAll('#pdi-rolls .form-entry-card').forEach(e=>{rolls.push({roll_number:gq(e,'.pdi-roll-no'),roll_weight:gq(e,'.pdi-roll-weight'),width:gq(e,'.pdi-roll-width'),avg_gsm:gq(e,'.pdi-roll-gsm'),dia:gq(e,'.pdi-roll-dia'),thickness:gq(e,'.pdi-roll-thickness'),label_ok:gq(e,'.pdi-roll-label'),print_ok:gq(e,'.pdi-roll-print'),paper_core:gq(e,'.pdi-roll-core')});});
    return {date:gv('pdi-date'),wo_no:gv('pdi-wo'),customer:gv('pdi-customer'),po_no:gv('pdi-po'),color:gv('pdi-color'),qty_dispatch:gv('pdi-qty'),requirements:{weight:gv('pdi-req-weight'),width:gv('pdi-req-width'),gsm:gv('pdi-req-gsm'),dia:gv('pdi-req-dia'),thickness:gv('pdi-req-thickness'),pallet:gv('pdi-req-pallet')},rolls,result:gv('pdi-result'),deviations:gv('pdi-deviations'),observation:gv('pdi-observation'),inspected_by:gv('pdi-inspected-by'),approved_by:gv('pdi-approved-by')};
  },

  collectInprocess() {
    const rows=[]; document.querySelectorAll('#ip-entries .form-entry-card').forEach(card=>{rows.push({loom:gq(card,'.ip-loom'),wo:gq(card,'.ip-wo'),particulars:gq(card,'.ip-particulars'),fabric_code:gq(card,'.ip-fcode'),width:gq(card,'.ip-width'),mesh:gq(card,'.ip-mesh'),warp_strength:gq(card,'.ip-warp-str'),weft_strength:gq(card,'.ip-weft-str'),gsm_required:gq(card,'.ip-gsm-req'),gsm_actual:gq(card,'.ip-gsm-act'),colour_code:gq(card,'.ip-colour'),remarks:gq(card,'.ip-remarks')});});
    return {date:gv('ip-date'),shift:gv('ip-shift'),doc_ref:gv('ip-docref'),rows,prepared_by:gv('ip-prepared'),verified_by:gv('ip-verified'),approved_by:gv('ip-approved')};
  },

  collectTapePlant() {
    const samples=[]; document.querySelectorAll('#tp-samples .form-entry-card').forEach(card=>{samples.push({denier:gq(card,'.tp-denier'),width:gq(card,'.tp-width'),strength:gq(card,'.tp-strength'),elongation:gq(card,'.tp-elongation')});});
    return {plant_no:gv('tp-plant'),date:gv('tp-date'),pp_grade:gv('tp-pp-grade'),uv_grade:gv('tp-uv-grade'),technician:gv('tp-technician'),samples,machine:{speed:gv('tp-speed'),temp:gv('tp-temp'),screw_rpm:gv('tp-screw-rpm'),godet1:gv('tp-godet1'),barrel:gv('tp-barrel'),die:gv('tp-die'),stretch_ratio:gv('tp-stretch'),anneal_pct:gv('tp-anneal-pct')},prepared_by:gv('tp-prepared'),checked_by:gv('tp-checked')};
  },

  collectLamination() {
    const rows=[]; document.querySelectorAll('#lm-entries .form-entry-card').forEach(card=>{rows.push({roll_no:gq(card,'.lm-roll'),customer:gq(card,'.lm-customer'),thickness:gq(card,'.lm-thickness'),req_gsm:gq(card,'.lm-req-gsm'),gsm_values:[1,2,3,4].map(n=>gq(card,`.lm-gsm${n}`)).filter(Boolean),avg_gsm:gq(card,'.lm-avg-gsm'),peel_strength:gq(card,'.lm-peel'),warp_tear:gq(card,'.lm-warp-tear'),weft_tear:gq(card,'.lm-weft-tear'),cof_kinetic:gq(card,'.lm-cof-kin'),cof_static:gq(card,'.lm-cof-stat')});});
    return {date:gv('lm-date'),shift:gv('lm-shift'),doc_ref:gv('lm-docref'),rows,checked_by:gv('lm-checked'),approved_by:gv('lm-approved')};
  },

  // ============================================================
  // ===== ADMIN =====
  // ============================================================
  renderAdmin() {
    if (!this.currentUser||this.currentUser.role!=='admin') return `${this.renderHeader()}<main class="main-content"><div class="alert alert-error"><i data-lucide="lock"></i> Admin only.</div></main>`;
    return `${this.renderHeader()}<main class="main-content"><button class="back-btn" onclick="App.navigate('dashboard')"><i data-lucide="arrow-left"></i> Back</button><div class="page-header"><h2>Admin Panel</h2><p>Manage users and inspections.</p></div>
      <div class="admin-section"><h3><i data-lucide="shield-alert"></i> Pending Verifications</h3><div id="pending-users" class="loading"><div class="spinner"></div></div></div>
      <div class="admin-section"><h3><i data-lucide="users"></i> All Users</h3><div id="all-users" class="loading"><div class="spinner"></div></div></div></main>`;
  },

  async loadAdmin() {
    try {
      const pending = await this.api('/api/auth/pending-users');
      document.getElementById('pending-users').innerHTML = pending.length===0?'<div class="alert alert-success"><i data-lucide="check-circle"></i> No pending registrations.</div>':`<div class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Actions</th></tr></thead><tbody>${pending.map(u=>`<tr><td><strong>${u.employee_id}</strong></td><td>${u.name}</td><td>${u.email}</td><td style="display:flex;gap:6px"><button class="btn btn-success btn-xs" onclick="App.verifyUser(${u.id})"><i data-lucide="check"></i> Approve</button><button class="btn btn-danger btn-xs" onclick="App.rejectUser(${u.id})"><i data-lucide="x"></i></button></td></tr>`).join('')}</tbody></table></div></div>`;
      const users = await this.api('/api/auth/all-users');
      document.getElementById('all-users').innerHTML = `<div class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Status</th></tr></thead><tbody>${users.map(u=>`<tr><td><strong>${u.employee_id}</strong></td><td>${u.name}</td><td><span class="badge badge-${u.role==='admin'?'admin':'submitted'}">${u.role}</span></td><td><span class="badge badge-${u.is_verified?'verified':'pending'}">${u.is_verified?'Verified':'Pending'}</span></td></tr>`).join('')}</tbody></table></div></div>`;
      this.refreshIcons();
    } catch(err) { document.getElementById('pending-users').innerHTML=`<div class="alert alert-error">${err.message}</div>`; this.refreshIcons(); }
  },

  async verifyUser(id) { try { await this.api(`/api/auth/verify-user/${id}`,{method:'POST'}); this.loadAdmin(); } catch(e) { alert(e.message); } },
  async rejectUser(id) { if(!confirm('Remove?'))return; try { await this.api(`/api/auth/reject-user/${id}`,{method:'POST'}); this.loadAdmin(); } catch(e) { alert(e.message); } }
};

// Form helpers delegated to utils.js and forms.js
document.addEventListener('DOMContentLoaded', () => App.init());
