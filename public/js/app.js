/**
 * Main Application Orchestrator
 * Connects Terminal, Monitoring, File Manager, Backups, Databases, and Wings WebSocket.
 */

class App {
  constructor() {
    this.api = API;
    this.currentServer = null;
    this.servers = [];
    this.ws = null;
    this.wsReconnectTimer = null;
    this.wsToken = null;

    // Controllers
    this.terminal = null;
    this.monitoring = null;
    this.files = null;
    this.database = null;
    this.backups = null;
    this.schedules = null;

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
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  init() {
    // 1. Initialize Sub-Controllers
    this.terminal = new TerminalController('terminal-screen', {
      onSendCommand: cmd => this.sendCommand(cmd)
    });

    this.monitoring = new MonitoringController();
    this.files = new FileManagerController(this.api, (m, t) => this.notify(m, t));
    this.database = new DatabaseController(this.api, (m, t) => this.notify(m, t));
    this.backups = new BackupController(this.api, (m, t) => this.notify(m, t));
    this.schedules = new ScheduleController(this.api, (m, t) => this.notify(m, t));

    // Expose controllers to window for HTML onclick attributes
    window.fileManager = this.files;
    window.databaseManager = this.database;
    window.backupManager = this.backups;
    window.scheduleManager = this.schedules;
    window.terminal = this.terminal;
    window.app = this;

    // 2. Setup DOM Event Listeners
    this.setupEventListeners();

    // 3. Load initial configuration and servers
    this.loadInitialData();
  }

  setupEventListeners() {
    // Server Selector Change
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

      // Up and Down keys for history navigation
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

    // Tab Navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
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

    // Settings Modal
    const btnSettings = document.getElementById('btn-open-settings');
    const modalSettings = document.getElementById('modal-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const formSettings = document.getElementById('settings-form');

    if (btnSettings && modalSettings) {
      btnSettings.addEventListener('click', () => {
        document.getElementById('input-panel-url').value = this.api.config.panelUrl;
        document.getElementById('input-api-key').value = this.api.config.apiKey;
        document.getElementById('input-demo-mode').checked = this.api.config.isDemo;
        modalSettings.classList.add('active');
      });
    }

    if (btnCloseSettings && modalSettings) {
      btnCloseSettings.addEventListener('click', () => modalSettings.classList.remove('active'));
    }

    if (formSettings) {
      formSettings.addEventListener('submit', e => {
        e.preventDefault();
        const url = document.getElementById('input-panel-url').value;
        const key = document.getElementById('input-api-key').value;
        const demo = document.getElementById('input-demo-mode').checked;

        this.api.saveConfig(url, key, demo);
        modalSettings.classList.remove('active');
        this.notify('Panel settings saved! Reconnecting...', 'success');
        this.loadInitialData();
      });
    }

    // File Manager actions
    const fileUploadInput = document.getElementById('file-upload-input');
    if (fileUploadInput) {
      fileUploadInput.addEventListener('change', () => this.files.handleFileUpload(fileUploadInput));
    }
  }

  switchTab(tabName) {
    this.activeTab = tabName;

    // Update tab bar buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
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
    }
  }

  async loadInitialData() {
    this.updateHeaderBadge();
    const select = document.getElementById('server-select');
    if (select) {
      select.innerHTML = '<option value="">Loading servers...</option>';
    }

    try {
      this.servers = await this.api.getServers();
      this.populateServerSelect();

      if (this.servers.length > 0) {
        this.selectServer(this.servers[0]);
      } else {
        this.notify('No servers found on panel', 'warning');
        if (select) select.innerHTML = '<option value="">No servers available</option>';
      }
    } catch (err) {
      this.notify(`Failed to fetch servers: ${err.message}`, 'error');
      if (select) select.innerHTML = '<option value="">Connection error</option>';
    }
  }

  updateHeaderBadge() {
    const badge = document.getElementById('header-mode-badge');
    if (badge) {
      if (this.api.config.isDemo) {
        badge.textContent = 'DEMO SIMULATOR';
        badge.className = 'badge badge-warning';
      } else {
        badge.textContent = 'LIVE PANEL';
        badge.className = 'badge badge-success';
      }
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

  selectServer(serverItem) {
    const s = serverItem.attributes || serverItem;
    this.currentServer = s;

    // Update Header Server Details
    const nameEl = document.getElementById('current-server-name');
    const idEl = document.getElementById('current-server-id');
    const nodeEl = document.getElementById('current-server-node');
    if (nameEl) nameEl.textContent = s.name;
    if (idEl) idEl.textContent = s.identifier;
    if (nodeEl) nodeEl.textContent = s.node || 'Daemon Node';

    // Update limits in monitoring
    const limits = s.limits || {};
    this.monitoring.setServerLimits(limits.memory, limits.disk);

    // Notify Sub-controllers
    this.files.setServer(s.identifier);
    this.database.setServer(s.identifier);
    this.backups.setServer(s.identifier);
    this.schedules.setServer(s.identifier);

    // Reset and Connect WebSocket
    this.connectWebSocket(s.identifier);
  }

  // Wings WebSocket Connection
  connectWebSocket(serverId) {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    clearTimeout(this.wsReconnectTimer);

    this.terminal.clear();
    this.terminal.writeln(`\x1b[36m[*] Initializing Wings WebSocket connection for server [${serverId}]...\x1b[0m`);
    this.setConnectionStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?server=${serverId}&demo=${this.api.config.isDemo}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        this.setConnectionStatus('connected');
        this.terminal.writeln('\x1b[32m[✓] Connected to Wings daemon bridge!\x1b[0m\r\n');

        // Authenticate with daemon
        if (!this.api.config.isDemo) {
          try {
            const creds = await this.api.getWebsocketCredentials(serverId);
            if (creds && creds.token) {
              this.wsToken = creds.token;
              this.sendWsPacket('auth', [this.wsToken]);
            }
          } catch (e) {
            this.terminal.writeln(`\x1b[31m[!] Failed to get WebSocket token from panel: ${e.message}\x1b[0m`);
          }
        } else {
          // Send mock auth
          this.sendWsPacket('auth', ['demo_token']);
        }

        // Request initial logs
        this.sendWsPacket('send logs', null);
      };

      this.ws.onmessage = evt => {
        try {
          const packet = JSON.parse(evt.data);
          this.handleWsPacket(packet);
        } catch (e) {
          this.terminal.write(evt.data);
        }
      };

      this.ws.onerror = err => {
        console.error('WebSocket error:', err);
        this.setConnectionStatus('error');
      };

      this.ws.onclose = e => {
        this.setConnectionStatus('disconnected');
        this.terminal.writeln(`\r\n\x1b[33m[!] Disconnected from Wings daemon (code: ${e.code}). Reconnecting in 4s...\x1b[0m`);
        this.wsReconnectTimer = setTimeout(() => {
          if (this.currentServer && this.currentServer.identifier === serverId) {
            this.connectWebSocket(serverId);
          }
        }, 4000);
      };
    } catch (err) {
      this.terminal.writeln(`\x1b[31m[!] Failed to create WebSocket: ${err.message}\x1b[0m`);
      this.setConnectionStatus('error');
    }
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
        this.refreshWsToken();
        break;

      case 'token expired':
        this.refreshWsToken();
        break;
    }
  }

  async refreshWsToken() {
    if (this.api.config.isDemo || !this.currentServer) return;
    try {
      const creds = await this.api.getWebsocketCredentials(this.currentServer.identifier);
      if (creds && creds.token) {
        this.wsToken = creds.token;
        this.sendWsPacket('auth', [this.wsToken]);
      }
    } catch (e) {
      console.error('Failed to refresh daemon token:', e);
    }
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

    // Send through WebSocket for instant daemon response
    this.sendWsPacket('set state', [signal]);

    // Also call REST API proxy
    try {
      await this.api.sendPowerAction(this.currentServer.identifier, signal);
    } catch (err) {
      console.warn('REST power action note:', err.message);
    }
  }

  // Send Command
  async sendCommand(command) {
    if (!this.currentServer) return;

    // Send over WebSocket daemon
    this.sendWsPacket('send command', [command]);

    // Also call REST API
    try {
      await this.api.sendCommand(this.currentServer.identifier, command);
    } catch (err) {
      // WS already handled
    }
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
