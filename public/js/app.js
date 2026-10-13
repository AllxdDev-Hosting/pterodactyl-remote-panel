/**
 * Main Application Orchestrator
 * Connects Multi-View Routing, Authentication, User Server List Dashboard,
 * Pterodactyl Server Console, Wings WebSocket Daemon, and Administration Area.
 */

class App {
  constructor() {
    this.api = API;
    this.currentServer = null;
    this.servers = [];
    this.currentView = 'login'; // 'login' | 'servers' | 'server' | 'admin'
    this.currentFilter = 'all';
    this.searchQuery = '';

    this.ws = null;
    this.wsReconnectTimer = null;
    this.wsToken = null;

    // Sub-controllers
    this.terminal = null;
    this.monitoring = null;
    this.files = null;
    this.database = null;
    this.backups = null;
    this.schedules = null;
    this.serverExtra = null;
    this.admin = null;

    this.activeTab = 'console';
    this.init();
  }

  // Toast Notification System
  notify(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ'}</span>
      <span class="toast-message">${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  async init() {
    // 1. Initialize Sub-Controllers
    this.terminal = new TerminalController('terminal-screen', {
      onSendCommand: cmd => this.sendCommand(cmd)
    });

    this.monitoring = new MonitoringController();
    this.files = new FileManagerController(this.api, (m, t) => this.notify(m, t));
    this.database = new DatabaseController(this.api, (m, t) => this.notify(m, t));
    this.backups = new BackupController(this.api, (m, t) => this.notify(m, t));
    this.schedules = new ScheduleController(this.api, (m, t) => this.notify(m, t));

    if (window.ServerExtraController) {
      this.serverExtra = new window.ServerExtraController(this.api, (m, t) => this.notify(m, t));
      window.serverExtraManager = this.serverExtra;
    }

    if (window.AdminController) {
      this.admin = new window.AdminController(this.api, (m, t) => this.notify(m, t));
      window.adminManager = this.admin;
    }

    // Expose controllers to window
    window.fileManager = this.files;
    window.databaseManager = this.database;
    window.backupManager = this.backups;
    window.scheduleManager = this.schedules;
    window.terminal = this.terminal;
    window.app = this;

    // 2. Setup DOM Event Listeners
    this.setupEventListeners();

    // 3. Check Authentication & Initial View Routing
    try { await this.api.initAuth(); }
    catch (err) { this.notify(err.message, 'error'); }
    if (this.api.isAuthenticated()) {
      this.updateUserNav();
      await this.loadServers();
      this.showView('servers');
    } else {
      this.showView('login');
    }
  }

  // Multi-View Navigation Router
  showView(viewName) {
    if (viewName === 'admin') {
      this.notify('Global Application API administration is unsupported. Use the original panel.', 'warning');
      return;
    }
    if (viewName !== 'server') this.disconnectWebSocket();
    this.currentView = viewName;

    // Hide all views and show target view
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.remove('active');
    });

    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
      targetView.classList.add('active');
    }

    // Navbar visibility
    const navbar = document.getElementById('app-navbar');
    if (navbar) {
      if (viewName === 'login') {
        navbar.classList.add('hidden');
        navbar.style.display = 'none';
      } else {
        navbar.classList.remove('hidden');
        navbar.style.display = 'flex';
      }
    }

    // Search input visibility: only show in servers list view
    const searchWrap = document.getElementById('header-search-wrap');
    if (searchWrap) {
      searchWrap.style.display = viewName === 'servers' ? 'block' : 'none';
    }

    // Admin toggle button in navbar
    const btnOpenAdmin = document.getElementById('btn-open-admin');
    if (btnOpenAdmin) {
      if (this.api.isAdmin()) {
        btnOpenAdmin.style.display = 'inline-flex';
        btnOpenAdmin.classList.toggle('active', viewName === 'admin');
      } else {
        btnOpenAdmin.style.display = 'none';
      }
    }

    // Perform view-specific initializations
    if (viewName === 'servers') {
      this.renderServerCards();
    } else if (viewName === 'server') {
      if (this.currentServer) {
        setTimeout(() => {
          if (this.activeTab === 'console') this.terminal.fit();
          if (this.activeTab === 'monitoring') this.monitoring.resize();
        }, 100);
      }
    } else if (viewName === 'admin') {
      if (this.admin) {
        this.admin.init();
      }
    }
  }

  // Update navbar user profile
  updateUserNav() {
    const user = this.api.getAuth();
    if (!user) return;

    const nameEl = document.getElementById('nav-user-name');
    const avatarEl = document.getElementById('nav-user-avatar');
    const roleEl = document.getElementById('nav-user-role');

    if (nameEl) nameEl.textContent = user.username || user.name || 'User';
    if (avatarEl) {
      if (avatarEl.tagName === 'IMG') {
        avatarEl.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(user.username || user.name || 'admin')}`;
      } else {
        avatarEl.textContent = (user.username || user.name || 'U').charAt(0).toUpperCase();
      }
    }
    if (roleEl) {
      if (user.role === 'admin') {
        roleEl.textContent = 'Root Admin';
        roleEl.className = 'nav-user-role role-admin';
      } else {
        roleEl.textContent = 'Client';
        roleEl.className = 'nav-user-role role-user';
      }
    }

    const dropName = document.getElementById('dropdown-user-name');
    const dropRole = document.getElementById('dropdown-user-role');
    if (dropName) dropName.textContent = user.username || user.name || 'User';
    if (dropRole) dropRole.textContent = user.role === 'admin' ? 'Root Administrator' : 'Client Account';

    const btnOpenAdmin = document.getElementById('btn-open-admin');
    if (btnOpenAdmin) {
      btnOpenAdmin.style.display = user.role === 'admin' ? 'inline-flex' : 'none';
    }
  }

  setupEventListeners() {
    // Ensure CafeBlend theme class is removed and purged
    document.body.classList.remove('theme-cafeblend');
    try { localStorage.removeItem('pt_theme'); } catch (_) {}

    // Brand Link click -> Return to servers list
    const brandLink = document.getElementById('brand-link');
    if (brandLink) {
      brandLink.addEventListener('click', e => {
        e.preventDefault();
        if (this.api.isAuthenticated()) {
          this.showView('servers');
        }
      });
    }

    // Breadcrumb Back button -> Return to servers list
    const btnBack = document.getElementById('btn-back-to-servers');
    if (btnBack) {
      btnBack.addEventListener('click', e => {
        e.preventDefault();
        this.showView('servers');
      });
    }

    // User Profile Dropdown Toggle
    const userBtn = document.getElementById('nav-user-btn');
    const userMenu = document.getElementById('user-dropdown-menu');
    const userMenuWrap = document.getElementById('user-menu-wrap');

    if (userBtn && userMenu) {
      userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = userMenu.style.display === 'none' || !userMenu.style.display;
        userMenu.style.display = isHidden ? 'flex' : 'none';
        userBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
        if (userMenuWrap) userMenuWrap.classList.toggle('open', isHidden);
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('#user-menu-wrap')) {
          userMenu.style.display = 'none';
          userBtn.setAttribute('aria-expanded', 'false');
          if (userMenuWrap) userMenuWrap.classList.remove('open');
        }
      });
    }

    // Admin toggle button in Navbar
    const btnOpenAdmin = document.getElementById('btn-open-admin');
    if (btnOpenAdmin) {
      btnOpenAdmin.addEventListener('click', () => {
        if (this.currentView === 'admin') {
          this.showView(this.currentServer ? 'server' : 'servers');
        } else {
          this.showView('admin');
        }
      });
    }

    // Admin Exit button
    const btnAdminExit = document.getElementById('btn-admin-exit');
    if (btnAdminExit) {
      btnAdminExit.addEventListener('click', () => {
        this.showView(this.currentServer ? 'server' : 'servers');
      });
    }

    // Auth Listeners
    this.setupAuthListeners();

    // Server List Listeners
    this.setupServerListListeners();

    // Server Console & Subtabs Listeners
    this.setupServerConsoleListeners();

    const modalSettings = document.getElementById('modal-settings');
    const closeSettings = () => { if (modalSettings) modalSettings.classList.remove('active'); };
    document.getElementById('settings-modal-close')?.addEventListener('click', closeSettings);
    document.getElementById('settings-modal-btn-close')?.addEventListener('click', closeSettings);
    modalSettings?.addEventListener('click', (e) => {
      if (e.target === modalSettings) closeSettings();
    });

    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
      if (userMenu) userMenu.style.display = 'none';
      if (userMenuWrap) userMenuWrap.classList.remove('open');
      const user = this.api.getAuth() || {};
      const elUser = document.getElementById('settings-username');
      const elEmail = document.getElementById('settings-email');
      const elRole = document.getElementById('settings-role');
      if (elUser) elUser.textContent = user.username || user.name || 'User';
      if (elEmail) elEmail.textContent = user.email || 'Not configured';
      if (elRole) elRole.textContent = user.role === 'admin' ? 'Root Administrator' : 'Client Account';
      if (modalSettings) modalSettings.classList.add('active');
    });
    window.addEventListener('session-expired', () => {
      this.clearSessionView();
      this.notify('Session expired. Sign in again.', 'error');
    });
    window.addEventListener('pagehide', () => this.disconnectWebSocket());

    // Global Notification Event Listener
    window.addEventListener('notify', e => {
      this.notify(e.detail.message, e.detail.type);
    });
  }

  setupAuthListeners() {
    const formRemote = document.getElementById('form-login-remote');

    // Remote Form Submit
    if (formRemote) {
      formRemote.addEventListener('submit', async e => {
        e.preventDefault();
        const keyInput = document.getElementById('login-panel-key');
        const key = keyInput ? keyInput.value.trim() : '';
        keyInput.value = '';
        if (!key) {
          this.notify('Please provide your personal Client API key', 'error');
          return;
        }

        const btn = formRemote.querySelector('button[type="submit"]');
        const origText = btn ? btn.innerHTML : '';
        if (btn) {
          btn.innerHTML = 'Connecting...';
          btn.disabled = true;
        }

        try {
          await this.api.login(key);
          this.updateUserNav();
          await this.loadServers();
          this.notify('Connected to remote Pterodactyl panel!', 'success');
          this.showView('servers');
        } catch (err) {
          this.notify(`Remote connection error: ${err.message}`, 'error');
        } finally {
          if (btn) {
            btn.innerHTML = origText;
            btn.disabled = false;
          }
        }
      });
    }

    // Logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        try {
          await this.api.logout();
          this.clearSessionView();
          this.notify('Signed out successfully', 'info');
        } catch (err) { this.notify(err.message, 'error'); }
      });
    }
  }

  clearSessionView() {
    this.currentServer = null;
    this.servers = [];
    this.terminal.clear();
    this.terminal.history = [];
    this.showView('login');
  }

  setupServerListListeners() {
    // Filter Buttons (All, Running, Offline)
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.getAttribute('data-filter') || 'all';
        this.renderServerCards();
      });
    });

    // Search input
    const searchInput = document.getElementById('server-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderServerCards();
      });
    }

    // Refresh Server List
    const btnRefresh = document.getElementById('btn-refresh-servers');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', async () => {
        btnRefresh.classList.add('spinning');
        await this.loadServers();
        btnRefresh.classList.remove('spinning');
        this.notify('Server list refreshed', 'info');
      });
    }
  }

  setupServerConsoleListeners() {
    // Server Selector Change in header
    const serverSelect = document.getElementById('server-select');
    if (serverSelect) {
      serverSelect.addEventListener('change', e => {
        const sId = e.target.value;
        const s = this.servers.find(srv => (srv.attributes ? srv.attributes.identifier : srv.identifier) === sId);
        if (s) this.selectServer(s);
      });
    }

    // Power Buttons
    document.querySelectorAll('[data-power-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-power-action');
        this.sendPowerAction(action);
      });
    });

    // Console Command Input
    const cmdForm = document.getElementById('terminal-input-form');
    const cmdInput = document.getElementById('terminal-command-input');
    if (cmdForm && cmdInput) {
      cmdForm.addEventListener('submit', e => {
        e.preventDefault();
        const cmd = cmdInput.value.trim();
        if (cmd) {
          this.terminal.pushHistory(cmd);
          this.sendCommand(cmd);
          cmdInput.value = '';
        }
      });

      cmdInput.addEventListener('keydown', e => {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          cmdInput.value = this.terminal.getPreviousCommand();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          cmdInput.value = this.terminal.getNextCommand();
        }
      });
    }

    // Tab Navigation inside Server View
    document.querySelectorAll('.pt-sub-tab, .nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabTarget = tab.getAttribute('data-tab');
        this.switchTab(tabTarget);
      });
    });

    // Console Controls
    const btnClear = document.getElementById('btn-clear-console');
    if (btnClear) btnClear.addEventListener('click', () => this.terminal.clear());

    const btnScroll = document.getElementById('btn-autoscroll');
    if (btnScroll) {
      btnScroll.addEventListener('click', () => {
        const isAuto = this.terminal.toggleAutoScroll();
        btnScroll.classList.toggle('active', isAuto);
        btnScroll.textContent = isAuto ? 'Auto-scroll: ON' : 'Auto-scroll: OFF';
      });
    }

    // File Manager actions
    const fileUploadInput = document.getElementById('file-upload-input');
    if (fileUploadInput) {
      fileUploadInput.addEventListener('change', () => this.files.handleFileUpload(fileUploadInput));
    }
  }

  async loadServers() {
    this.updateHeaderBadge();
    try {
      this.servers = await this.api.getServers();
      this.populateServerSelect();
      this.renderServerCards();

      // If in server view or has no server selected, select first
      if (this.servers.length > 0 && !this.currentServer) {
        this.currentServer = this.servers[0].attributes || this.servers[0];
      }
    } catch (err) {
      this.notify(`Failed to fetch servers: ${err.message}`, 'error');
    }
  }

  updateHeaderBadge() {
    const badge = document.getElementById('header-mode-badge');
    if (badge) {
      badge.remove();
    }
  }

  populateServerSelect() {
    const select = document.getElementById('server-select');
    if (!select) return;

    select.innerHTML = '';
    this.servers.forEach(item => {
      const s = item.attributes || item;
      const opt = document.createElement('option');
      opt.value = s.identifier;
      opt.textContent = `${s.name} (${s.identifier})`;
      select.appendChild(opt);
    });
  }

  // Render authentic Pterodactyl server cards
  renderServerCards() {
    const grid = document.getElementById('servers-cards-grid');
    const countEl = document.getElementById('server-list-count');
    if (!grid) return;

    const filtered = this.servers.filter(item => {
      const s = item.attributes || item;
      const status = (s.status || 'unknown').toLowerCase();

      if (this.currentFilter === 'running' && status !== 'running' && status !== 'starting') return false;
      if (this.currentFilter === 'offline' && status !== 'offline' && status !== 'stopping') return false;

      if (this.searchQuery) {
        const name = (s.name || '').toLowerCase();
        const id = (s.identifier || '').toLowerCase();
        const node = (s.node || '').toLowerCase();
        const desc = (s.description || '').toLowerCase();
        return name.includes(this.searchQuery) || id.includes(this.searchQuery) || node.includes(this.searchQuery) || desc.includes(this.searchQuery);
      }

      return true;
    });

    if (countEl) {
      countEl.textContent = `Showing ${filtered.length} of ${this.servers.length} server${this.servers.length === 1 ? '' : 's'} you have access to.`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-servers-card" style="grid-column: 1 / -1;">
          <div class="empty-icon" style="margin-bottom: 0.75rem;">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto; color: var(--text-muted);"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div class="empty-title" style="font-size: 1.1rem; font-weight: 600; color: #fff;">No servers found</div>
          <p class="empty-desc" style="color: #64748b; font-size: 0.875rem;">There are no servers matching your current filter criteria or search query.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(item => {
      const s = item.attributes || item;
      const limits = s.limits || {};
      const status = (s.status || 'unknown').toLowerCase();
      const statusClass = status === 'running' ? 'status-running' : status === 'starting' ? 'status-starting' : 'status-offline';
      const statusText = s.is_suspended ? 'SUSPENDED' : status.toUpperCase();

      const eggName = s.egg_name || (s.description ? s.description.split(' ')[0] : 'Server');

      const cpuUsage = 'Open console for live usage';
      const cpuPercent = 0;
      const ramUsage = limits.memory == null ? 'Unknown' : `Limit: ${limits.memory} MB`;
      const ramPercent = 0;
      const diskUsage = limits.disk == null ? 'Unknown' : `Limit: ${limits.disk} MB`;
      const diskPercent = 0;

      const primaryAlloc = (s.relationships && s.relationships.allocations && s.relationships.allocations.data && s.relationships.allocations.data[0]) 
        ? `${s.relationships.allocations.data[0].attributes.alias || s.relationships.allocations.data[0].attributes.ip}:${s.relationships.allocations.data[0].attributes.port}`
        : 'Unavailable';

      return `
        <div class="pterodactyl-server-card" data-server-id="${s.identifier}">
          <div class="server-card-header">
            <div class="server-card-info">
              <h3 class="server-card-title">${this.escapeHtml(s.name)}</h3>
              <div class="server-card-meta">
                <span class="server-egg-badge">${this.escapeHtml(eggName)}</span>
                <span class="server-node-badge">${this.escapeHtml(s.node || 'Daemon Node')}</span>
              </div>
            </div>
            <div class="server-status-indicator ${statusClass}">
              <span class="status-circle"></span>
              <span class="status-label">${statusText}</span>
            </div>
          </div>

          <div class="server-address-row">
            <span class="server-address-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </span>
            <code class="server-address-text">${primaryAlloc}</code>
            <button class="btn-copy-address" data-copy="${primaryAlloc}" title="Copy Address">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>

          <div class="server-gauges-grid">
            <div class="server-gauge-item">
              <div class="gauge-label">
                <span>CPU Load</span>
                <span class="gauge-val">${cpuUsage}</span>
              </div>
              <div class="gauge-bar-track">
                <div class="gauge-bar-fill fill-cpu" style="width: ${cpuPercent}%"></div>
              </div>
            </div>

            <div class="server-gauge-item">
              <div class="gauge-label">
                <span>Memory</span>
                <span class="gauge-val">${ramUsage}</span>
              </div>
              <div class="gauge-bar-track">
                <div class="gauge-bar-fill fill-ram" style="width: ${ramPercent}%"></div>
              </div>
            </div>

            <div class="server-gauge-item">
              <div class="gauge-label">
                <span>Disk</span>
                <span class="gauge-val">${diskUsage}</span>
              </div>
              <div class="gauge-bar-track">
                <div class="gauge-bar-fill fill-disk" style="width: ${diskPercent}%"></div>
              </div>
            </div>
          </div>

          <div class="server-card-footer">
            <span class="server-id-tag">ID: <code>${s.identifier}</code></span>
            <button class="btn-manage-server" data-server-id="${s.identifier}">
              Manage Server <span class="arrow">→</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach card click handlers
    grid.querySelectorAll('.pterodactyl-server-card').forEach(card => {
      card.addEventListener('click', e => {
        const copyBtn = e.target.closest('.btn-copy-address');
        if (copyBtn) {
          e.stopPropagation();
          const text = copyBtn.getAttribute('data-copy');
          navigator.clipboard.writeText(text);
          this.notify('Address copied to clipboard: ' + text, 'info');
          return;
        }

        const id = card.getAttribute('data-server-id');
        const selected = this.servers.find(s => {
          const item = s.attributes || s;
          return item.identifier === id;
        });

        if (selected) {
          this.selectServer(selected);
          this.showView('server');
        }
      });
    });
  }

  selectServer(serverItem) {
    const s = serverItem.attributes || serverItem;
    this.currentServer = s;

    // Update Header Server Details & Breadcrumbs
    const nameEl = document.getElementById('current-server-name');
    const idEl = document.getElementById('current-server-id');
    const nodeEl = document.getElementById('current-server-node');
    const bcName = document.getElementById('breadcrumb-server-name');
    const bcId = document.getElementById('breadcrumb-server-id');

    if (nameEl) nameEl.textContent = s.name;
    if (idEl) idEl.textContent = s.identifier;
    if (nodeEl) nodeEl.textContent = s.node || 'Daemon Node';
    if (bcName) bcName.textContent = s.name;
    if (bcId) bcId.textContent = `(${s.identifier})`;

    // Sync select dropdown
    const select = document.getElementById('server-select');
    if (select) select.value = s.identifier;

    // Update limits in monitoring
    const limits = s.limits || {};
    this.monitoring.setServerLimits(limits.memory, limits.disk);

    // Notify Sub-controllers
    this.files.setServer(s.identifier);
    this.database.setServer(s.identifier);
    this.backups.setServer(s.identifier);
    this.schedules.setServer(s.identifier);

    if (this.serverExtra) {
      this.serverExtra.setServer(s.identifier, s);
    }

    // Default to console tab
    this.switchTab('console');

    // Reset and Connect WebSocket
    this.connectWebSocket(s.identifier);
  }

  switchTab(tabName) {
    this.activeTab = tabName;

    // Update tab bar buttons
    document.querySelectorAll('.pt-sub-tab, .nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });

    // Update tab content panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-${tabName}`);
    });

    // Resize or trigger specific tab controllers
    if (tabName === 'console') {
      setTimeout(() => this.terminal.fit(), 80);
    } else if (tabName === 'monitoring') {
      setTimeout(() => this.monitoring.resize(), 80);
    } else if (tabName === 'files') {
      if (this.currentServer) this.files.loadDirectory(this.files.currentDirectory || '/');
    } else if (tabName === 'databases') {
      if (this.currentServer) this.database.loadDatabases();
    } else if (tabName === 'backups') {
      if (this.currentServer) this.backups.loadBackups();
    } else if (tabName === 'schedules') {
      if (this.currentServer) this.schedules.loadSchedules();
    } else if (tabName === 'users') {
      if (this.serverExtra) this.serverExtra.loadSubusers();
    } else if (tabName === 'network') {
      if (this.serverExtra) this.serverExtra.loadAllocations();
    } else if (tabName === 'startup') {
      if (this.serverExtra) this.serverExtra.loadStartup();
    } else if (tabName === 'settings') {
      if (this.serverExtra) this.serverExtra.loadSettings();
    }
  }

  // Wings WebSocket Connection
  disconnectWebSocket() {
    this.wsGeneration = (this.wsGeneration || 0) + 1;
    clearTimeout(this.wsReconnectTimer);
    clearTimeout(this.wsAuthTimer);
    this.wsToken = null;
    this.wsRefreshing = false;
    if (this.ws) {
      this.ws.onopen = this.ws.onmessage = this.ws.onerror = this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }
  async connectWebSocket(serverId) {
    this.disconnectWebSocket();
    const generation = this.wsGeneration;
    this.terminal.clear();
    this.setConnectionStatus('connecting');
    try {
      const creds = await this.api.getWebsocketCredentials(serverId);
      if (generation !== this.wsGeneration) return;
      const url = new URL(creds?.socket);
      if (url.protocol !== 'wss:' || url.username || url.password || !creds.token) throw new Error('Secure Wings WSS is unavailable. Configure upstream TLS and allowed origins.');
      const ws = this.ws = new WebSocket(url.href);
      this.wsToken = creds.token;
      this.wsAuthTimer = setTimeout(() => {
        if (generation === this.wsGeneration) this.failWebSocket('Wings connection/authentication timed out. Check WSS and allowed origins.');
      }, 15000);
      ws.onopen = () => this.sendWsPacket('auth', [this.wsToken]);
      ws.onmessage = evt => {
        if (generation !== this.wsGeneration) return;
        try { this.handleWsPacket(JSON.parse(evt.data)); }
        catch { this.failWebSocket('Invalid Wings protocol response'); }
      };
      ws.onerror = () => this.failWebSocket('Wings WSS failed. Check certificate, reachability and allowed origins.');
      ws.onclose = () => {
        clearTimeout(this.wsAuthTimer);
        this.setConnectionStatus('disconnected');
        this.terminal.writeln('Wings disconnected. Retrying with fresh authorization in 4 seconds.');
        this.wsReconnectTimer = setTimeout(() => {
          if (generation === this.wsGeneration && this.api.isAuthenticated() && this.currentView === 'server') this.connectWebSocket(serverId);
        }, 4000);
      };
    } catch (err) {
      if (generation === this.wsGeneration) this.failWebSocket(err.message);
    }
  }
  failWebSocket(message) {
    this.disconnectWebSocket();
    this.setConnectionStatus('error');
    this.terminal.writeln(message);
    this.notify(message, 'error', 8000);
  }

  sendWsPacket(event, args) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, args }));
    }
  }

  handleWsPacket(packet) {
    const { event, args } = packet;

    switch (event) {
      case 'auth success':
        clearTimeout(this.wsAuthTimer);
        this.setConnectionStatus('connected');
        this.sendWsPacket('send logs', []);
        this.sendWsPacket('send stats', []);
        this.terminal.writeln('\x1b[32m[✓] Daemon Authentication verified.\x1b[0m\r\n');
        break;

      case 'status':
        this.updateServerState(args[0]);
        break;

      case 'console output':
        if (args && args[0]) {
          this.terminal.write(args[0] + '\r\n');
        }
        break;

      case 'stats':
        if (args && args[0]) {
          try {
            const stats = typeof args[0] === 'string' ? JSON.parse(args[0]) : args[0];
            this.monitoring.processStats(stats);
            if (stats.state) {
              this.updateServerState(stats.state);
            }
          } catch (e) {
            // Non-JSON stats
          }
        }
        break;

      case 'daemon message':
        if (args && args[0]) {
          this.terminal.writeln(`\x1b[90m[DAEMON] ${args[0]}\x1b[0m`);
        }
        break;

      case 'token expiring':
      case 'token expired':
        this.refreshWsToken();
        break;
      case 'jwt error':
      case 'daemon error':
        this.failWebSocket('Wings rejected authentication or the requested operation. Reopen the server to retry.');
        break;
    }
  }

  async refreshWsToken() {
    if (!this.currentServer || this.wsRefreshing) return;
    const generation = this.wsGeneration;
    const ws = this.ws;
    this.wsRefreshing = true;
    try {
      const creds = await this.api.getWebsocketCredentials(this.currentServer.identifier);
      if (generation !== this.wsGeneration) return;
      if (!creds?.token || new URL(creds.socket).href !== ws.url) throw new Error('Wings endpoint changed; reopen the server');
      this.wsToken = creds.token;
      this.sendWsPacket('auth', [this.wsToken]);
      clearTimeout(this.wsAuthTimer);
      this.wsAuthTimer = setTimeout(() => this.failWebSocket('Wings token renewal timed out'), 15000);
    } catch (e) {
      if (generation === this.wsGeneration) this.failWebSocket(`Wings authorization renewal failed: ${e.message}`);
    } finally { if (generation === this.wsGeneration) this.wsRefreshing = false; }
  }

  updateServerState(state) {
    const badge = document.getElementById('server-state-badge');
    const dot = document.getElementById('server-state-dot');
    if (!badge) return;

    badge.className = 'badge';
    if (dot) dot.className = 'status-dot';

    const normalizedState = (state || 'offline').toLowerCase();
    switch (normalizedState) {
      case 'running':
        badge.classList.add('badge-success');
        badge.textContent = 'RUNNING';
        if (dot) dot.classList.add('dot-running');
        break;
      case 'starting':
        badge.classList.add('badge-warning');
        badge.textContent = 'STARTING';
        if (dot) dot.classList.add('dot-starting');
        break;
      case 'stopping':
        badge.classList.add('badge-danger');
        badge.textContent = 'STOPPING';
        if (dot) dot.classList.add('dot-stopping');
        break;
      case 'offline':
      default:
        badge.classList.add('badge-offline');
        badge.textContent = 'OFFLINE';
        if (dot) dot.classList.add('dot-offline');
        break;
    }

    // Toggle power buttons enabled state
    const btnStart = document.querySelector('[data-power-action="start"]');
    const btnRestart = document.querySelector('[data-power-action="restart"]');
    const btnStop = document.querySelector('[data-power-action="stop"]');
    const btnKill = document.querySelector('[data-power-action="kill"]');

    if (btnStart) btnStart.disabled = normalizedState === 'running' || normalizedState === 'starting';
    if (btnRestart) btnRestart.disabled = normalizedState === 'offline';
    if (btnStop) btnStop.disabled = normalizedState === 'offline';
    if (btnKill) btnKill.disabled = normalizedState === 'offline';
  }

  setConnectionStatus(status) {
    const el = document.getElementById('ws-connection-status');
    if (!el) return;

    switch (status) {
      case 'connected':
        el.className = 'badge badge-success text-xs';
        el.textContent = 'Daemon: Connected';
        break;
      case 'connecting':
        el.className = 'badge badge-warning text-xs';
        el.textContent = 'Daemon: Connecting...';
        break;
      case 'disconnected':
      case 'error':
        el.className = 'badge badge-danger text-xs';
        el.textContent = 'Daemon: Offline';
        break;
    }
  }

  // Power controls
  async sendPowerAction(signal) {
    if (!this.currentServer) return;
    this.notify(`Sending power signal: ${signal.toUpperCase()}`, 'info');

    try {
      await this.api.sendPowerAction(this.currentServer.identifier, signal);
    } catch (err) {
      this.notify(`Power action failed: ${err.message}`, 'error');
    }
  }

  // Send Command
  async sendCommand(command) {
    if (!this.currentServer) return;

    try {
      await this.api.sendCommand(this.currentServer.identifier, command);
    } catch (err) {
      this.notify(`Command failed: ${err.message}`, 'error');
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.ptApp = new App();
});
