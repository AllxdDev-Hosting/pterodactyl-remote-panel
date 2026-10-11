/**
 * Pterodactyl Client API Client (Internal Proxy Wrapper)
 * Connects directly to backend proxy, providing full server management.
 */

const API = {
  // Config state
  config: {
    panelUrl: localStorage.getItem('pt_panel_url') || 'demo',
    apiKey: localStorage.getItem('pt_api_key') || 'ptlc_demo_placeholder_token',
    isDemo: localStorage.getItem('pt_demo_mode') !== 'false'
  },

  saveConfig(panelUrl, apiKey, isDemo) {
    this.config.panelUrl = panelUrl.trim();
    this.config.apiKey = apiKey.trim();
    this.config.isDemo = !!isDemo;

    localStorage.setItem('pt_panel_url', this.config.panelUrl);
    localStorage.setItem('pt_api_key', this.config.apiKey);
    localStorage.setItem('pt_demo_mode', String(this.config.isDemo));
  },

  async request(path, options = {}) {
    const url = `/api/proxy${path}`;
    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'x-panel-url': this.config.isDemo ? 'demo' : this.config.panelUrl,
      'x-api-key': this.config.apiKey,
      ...(options.headers || {})
    };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers
      });

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
      method: 'POST',
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
  }
};
