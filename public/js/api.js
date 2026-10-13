/**
 * Pterodactyl Client API Client (Internal Proxy Wrapper)
 * Connects directly to backend proxy, providing full server management.
 */

// Universal Dialog System (Modal Prompt & Confirm replacement for webview compatibility)
window.dialog = {
  prompt(message, defaultValue = '', title = 'Action Required') {
    return new Promise((resolve) => {
      const modal = document.getElementById('modal-dialog');
      if (!modal) {
        try { resolve(window.prompt ? window.prompt(message, defaultValue) : defaultValue); }
        catch (_) { resolve(defaultValue); }
        return;
      }
      const titleEl = document.getElementById('dialog-title');
      const msgEl = document.getElementById('dialog-message');
      const inputGroup = document.getElementById('dialog-input-group');
      const input = document.getElementById('dialog-input');
      const form = document.getElementById('dialog-form');
      const btnCancel = document.getElementById('dialog-btn-cancel');
      const btnClose = document.getElementById('dialog-btn-close');
      const btnConfirm = document.getElementById('dialog-btn-confirm');

      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = message;
      if (inputGroup) inputGroup.style.display = 'block';
      if (input) input.value = defaultValue ?? '';
      if (btnConfirm) {
        btnConfirm.className = 'btn btn-primary btn-sm';
        btnConfirm.textContent = 'Submit';
      }

      let resolved = false;
      const cleanup = (val) => {
        if (resolved) return;
        resolved = true;
        modal.classList.remove('active');
        if (form) form.onsubmit = null;
        if (btnCancel) btnCancel.onclick = null;
        if (btnClose) btnClose.onclick = null;
        resolve(val);
      };

      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          cleanup(input ? input.value : '');
        };
      }

      if (btnCancel) btnCancel.onclick = () => cleanup(null);
      if (btnClose) btnClose.onclick = () => cleanup(null);

      modal.classList.add('active');
      setTimeout(() => {
        if (input) {
          input.focus();
          input.select();
        }
      }, 50);
    });
  },

  confirm(message, title = 'Confirm Action', isDanger = false) {
    return new Promise((resolve) => {
      const modal = document.getElementById('modal-dialog');
      if (!modal) {
        try { resolve(window.confirm ? window.confirm(message) : true); }
        catch (_) { resolve(true); }
        return;
      }
      const titleEl = document.getElementById('dialog-title');
      const msgEl = document.getElementById('dialog-message');
      const inputGroup = document.getElementById('dialog-input-group');
      const form = document.getElementById('dialog-form');
      const btnCancel = document.getElementById('dialog-btn-cancel');
      const btnClose = document.getElementById('dialog-btn-close');
      const btnConfirm = document.getElementById('dialog-btn-confirm');

      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = message;
      if (inputGroup) inputGroup.style.display = 'none';
      if (btnConfirm) {
        btnConfirm.className = isDanger ? 'btn btn-danger btn-sm' : 'btn btn-primary btn-sm';
        btnConfirm.textContent = isDanger ? 'Delete' : 'Confirm';
      }

      let resolved = false;
      const cleanup = (val) => {
        if (resolved) return;
        resolved = true;
        modal.classList.remove('active');
        if (form) form.onsubmit = null;
        if (btnCancel) btnCancel.onclick = null;
        if (btnClose) btnClose.onclick = null;
        resolve(val);
      };

      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          cleanup(true);
        };
      }

      if (btnCancel) btnCancel.onclick = () => cleanup(false);
      if (btnClose) btnClose.onclick = () => cleanup(false);

      modal.classList.add('active');
      setTimeout(() => {
        if (btnConfirm) btnConfirm.focus();
      }, 50);
    });
  }
};

try {
  // Safe prompt/confirm shims for environments that throw "prompt() is not supported"
  window.prompt = (msg, def) => {
    console.warn('Native prompt() called; please use window.dialog.prompt() instead');
    return def ?? '';
  };
} catch (_) {}

const API = {
  user: null,
  async initAuth() {
    for (const storage of [localStorage, sessionStorage]) {
      for (const key of ['pt_panel_url', 'pt_api_key', 'pt_demo_mode', 'pt_user_session', 'pt_active_server', 'pt_cmd_history']) storage.removeItem(key);
    }
    const res = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' });
    if (res.status === 401) { this.user = null; return; }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Session verification failed');
    this.user = data.user;
  },
  isAuthenticated() {
    return !!this.user;
  },
  getAuth() {
    return this.user;
  },
  isAdmin() { return false; },
  async login(apiKey) {
    this.user = null;
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' },
      body: JSON.stringify({ apiKey })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Authentication failed');
    }

    this.user = data.user;
    return data.user;
  },

  async logout() {
    const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Protection': '1' } });
    if (!res.ok) throw new Error('Sign-out failed. Please retry.');
    this.user = null;
  },

  async request(path, options = {}) {
    const url = `/api/proxy${path}`;
    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'X-CSRF-Protection': '1',
      ...(options.headers || {})
    };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    try {
      const res = await fetch(url, {
        ...options,
        credentials: 'same-origin',
        cache: 'no-store',
        headers
      });
      if (res.status === 401) {
        this.user = null;
        window.dispatchEvent(new Event('session-expired'));
      }

      if (res.status === 204) {
        return null;
      }

      const contentType = res.headers.get('content-type') || '';
      let data = null;

      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      if (!res.ok) {
        const errorMsg = (data && data.errors && data.errors[0] && data.errors[0].detail)
          || (data && data.message)
          || `HTTP error ${res.status}: ${res.statusText}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.error(`API Request Error [${options.method || 'GET'} ${path}]:`, err);
      throw err;
    }
  },

  // Admin API Requests
  async adminRequest(path, options = {}) {
    throw new Error('Global Application API administration is unsupported. Use the original panel.');
  },

  // 1. Servers List & Details
  async getServers() {
    const res = await this.request('/servers');
    return res && res.data ? res.data : [];
  },

  async getServerDetails(serverId) {
    const res = await this.request(`/servers/${serverId}`);
    return res && res.attributes ? res.attributes : null;
  },

  async getServerResources(serverId) {
    const res = await this.request(`/servers/${serverId}/resources`);
    return res && res.attributes ? res.attributes : null;
  },

  async getWebsocketCredentials(serverId) {
    const res = await this.request(`/servers/${serverId}/websocket`);
    return res && res.data ? res.data : null;
  },

  // 2. Power Controls
  async sendPowerAction(serverId, signal) {
    // signal: 'start' | 'stop' | 'restart' | 'kill'
    return await this.request(`/servers/${serverId}/power`, {
      method: 'POST',
      body: { signal }
    });
  },

  // 3. Send Console Command
  async sendCommand(serverId, command) {
    return await this.request(`/servers/${serverId}/command`, {
      method: 'POST',
      body: { command }
    });
  },

  // 4. File Manager
  async listFiles(serverId, directory = '/') {
    const query = encodeURIComponent(directory);
    const res = await this.request(`/servers/${serverId}/files/list?directory=${query}`);
    return res && res.data ? res.data : [];
  },

  async getFileContents(serverId, filePath) {
    const query = encodeURIComponent(filePath);
    return await this.request(`/servers/${serverId}/files/contents?file=${query}`);
  },

  async saveFileContents(serverId, filePath, content) {
    const query = encodeURIComponent(filePath);
    return await this.request(`/servers/${serverId}/files/write?file=${query}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: content
    });
  },

  async createFolder(serverId, root, name) {
    return await this.request(`/servers/${serverId}/files/create-folder`, {
      method: 'POST',
      body: { root, name }
    });
  },

  async renameFile(serverId, root, from, to) {
    return await this.request(`/servers/${serverId}/files/rename`, {
      method: 'PUT',
      body: { root, files: [{ from, to }] }
    });
  },

  async deleteFiles(serverId, root, files) {
    return await this.request(`/servers/${serverId}/files/delete`, {
      method: 'POST',
      body: { root, files }
    });
  },

  async compressFiles(serverId, root, files) {
    return await this.request(`/servers/${serverId}/files/compress`, {
      method: 'POST',
      body: { root, files }
    });
  },

  async copyFile(serverId, location) {
    return await this.request(`/servers/${serverId}/files/copy`, {
      method: 'POST',
      body: { location }
    });
  },

  async chmodFiles(serverId, root, files) {
    return await this.request(`/servers/${serverId}/files/chmod`, {
      method: 'POST',
      body: { root, files }
    });
  },

  async decompressFile(serverId, root, file) {
    return await this.request(`/servers/${serverId}/files/decompress`, {
      method: 'POST',
      body: { root, file }
    });
  },

  async getDownloadUrl(serverId, filePath) {
    const query = encodeURIComponent(filePath);
    const res = await this.request(`/servers/${serverId}/files/download?file=${query}`);
    return res && res.attributes && res.attributes.url ? res.attributes.url : null;
  },

  async getUploadUrl(serverId) {
    const res = await this.request(`/servers/${serverId}/files/upload`);
    return res && res.attributes && res.attributes.url ? res.attributes.url : null;
  },

  // 5. Database Manager
  async getDatabases(serverId) {
    const res = await this.request(`/servers/${serverId}/databases?include=password`);
    return res && res.data ? res.data : [];
  },

  async createDatabase(serverId, database, remote = '%') {
    return await this.request(`/servers/${serverId}/databases`, {
      method: 'POST',
      body: { database, remote }
    });
  },

  async rotateDatabasePassword(serverId, dbId) {
    return await this.request(`/servers/${serverId}/databases/${dbId}/rotate-password`, {
      method: 'POST'
    });
  },

  async deleteDatabase(serverId, dbId) {
    return await this.request(`/servers/${serverId}/databases/${dbId}`, {
      method: 'DELETE'
    });
  },

  // 6. Backup Manager
  async getBackups(serverId) {
    const res = await this.request(`/servers/${serverId}/backups`);
    return res && res.data ? res.data : [];
  },

  async createBackup(serverId, name, ignored = '', isLocked = false) {
    return await this.request(`/servers/${serverId}/backups`, {
      method: 'POST',
      body: { name, ignored, is_locked: isLocked }
    });
  },

  async getBackupDownloadUrl(serverId, backupUuid) {
    const res = await this.request(`/servers/${serverId}/backups/${backupUuid}/download`);
    return res && res.attributes && res.attributes.url ? res.attributes.url : null;
  },

  async restoreBackup(serverId, backupUuid, truncate = false) {
    return await this.request(`/servers/${serverId}/backups/${backupUuid}/restore`, {
      method: 'POST',
      body: { truncate_directory: truncate }
    });
  },

  async toggleBackupLock(serverId, backupUuid) {
    return await this.request(`/servers/${serverId}/backups/${backupUuid}/lock`, {
      method: 'POST'
    });
  },

  async deleteBackup(serverId, backupUuid) {
    return await this.request(`/servers/${serverId}/backups/${backupUuid}`, {
      method: 'DELETE'
    });
  },

  // 7. Schedule Manager
  async getSchedules(serverId) {
    const res = await this.request(`/servers/${serverId}/schedules`);
    return res && res.data ? res.data : [];
  },

  async createSchedule(serverId, scheduleData) {
    return await this.request(`/servers/${serverId}/schedules`, {
      method: 'POST',
      body: scheduleData
    });
  },

  async executeSchedule(serverId, scheduleId) {
    return await this.request(`/servers/${serverId}/schedules/${scheduleId}/execute`, {
      method: 'POST'
    });
  },

  async createScheduleTask(serverId, scheduleId, taskData) {
    return await this.request(`/servers/${serverId}/schedules/${scheduleId}/tasks`, {
      method: 'POST',
      body: taskData
    });
  },

  async deleteSchedule(serverId, scheduleId) {
    return await this.request(`/servers/${serverId}/schedules/${scheduleId}`, {
      method: 'DELETE'
    });
  },

  // 8. Subusers
  async getSubusers(serverId) {
    const res = await this.request(`/servers/${serverId}/users`);
    return res && res.data ? res.data : [];
  },

  // 9. Allocations
  async getAllocations(serverId) {
    const res = await this.request(`/servers/${serverId}/network/allocations`);
    return res && res.data ? res.data : [];
  },

  // 10. Startup
  async getStartup(serverId) {
    const res = await this.request(`/servers/${serverId}/startup`);
    return { ...res.meta, variables: (res.data || []).map(v => v.attributes) };
  },

  async updateStartupVariable(serverId, key, value) {
    return await this.request(`/servers/${serverId}/startup/variable`, {
      method: 'PUT',
      body: { key, value }
    });
  },

  async updateDockerImage(serverId, dockerImage) {
    return await this.request(`/servers/${serverId}/settings/docker-image`, {
      method: 'PUT',
      body: { docker_image: dockerImage }
    });
  },

  // 11. Settings
  async renameServer(serverId, name) {
    return await this.request(`/servers/${serverId}/settings/rename`, {
      method: 'POST',
      body: { name }
    });
  },

  async reinstallServer(serverId) {
    return await this.request(`/servers/${serverId}/settings/reinstall`, {
      method: 'POST'
    });
  },

  // 12. Administration Area Calls
  async getAdminOverview() {
    return await this.adminRequest('/overview');
  },

  async getAdminServers() {
    return await this.adminRequest('/servers');
  },

  async toggleSuspendServer(serverId) {
    return await this.adminRequest(`/servers/${serverId}/suspend`, {
      method: 'POST'
    });
  },

  async getAdminNodes() {
    return await this.adminRequest('/nodes');
  },

  async getAdminUsers() {
    return await this.adminRequest('/users');
  },

  async createAdminUser(userData) {
    return await this.adminRequest('/users', {
      method: 'POST',
      body: userData
    });
  },

  async getAdminLogs() {
    return await this.adminRequest('/logs');
  }
};

