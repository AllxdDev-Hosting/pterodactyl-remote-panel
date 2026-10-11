/**
 * Database Management Controller
 * Remote MySQL/MariaDB database provisioning and credential access.
 */

class DatabaseController {
  constructor(api, notify) {
    this.api = api;
    this.notify = notify;
    this.currentServerId = null;
    this.containerEl = document.getElementById('database-list-container');
  }

  setServer(serverId) {
    this.currentServerId = serverId;
    this.loadDatabases();
  }

  async loadDatabases() {
    if (!this.currentServerId || !this.containerEl) return;

    this.containerEl.innerHTML = `
      <div class="text-center" style="padding: 2.5rem; color: var(--color-text-muted);">
        <div class="loader-spinner" style="margin: 0 auto 0.75rem auto;"></div>
        Loading database credentials...
      </div>
    `;

    try {
      const dbs = await this.api.getDatabases(this.currentServerId);
      this.renderDatabases(dbs);
    } catch (err) {
      this.containerEl.innerHTML = `
        <div class="card" style="padding: 1.5rem; color: var(--color-danger); text-align: center;">
          Failed to load databases: ${err.message}
        </div>
      `;
    }
  }

  renderDatabases(dbs) {
    if (!this.containerEl) return;

    if (!dbs || dbs.length === 0) {
      this.containerEl.innerHTML = `
        <div class="card" style="padding: 2.5rem; text-align: center; color: var(--color-text-muted);">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 0.75rem; opacity: 0.5;">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
          </svg>
          <p class="font-medium">No databases configured for this server.</p>
          <p class="text-sm mt-1">Click "New Database" above to provision an instance.</p>
        </div>
      `;
      return;
    }

    let html = '<div class="grid grid-2 gap-4">';
    dbs.forEach(item => {
      const db = item.attributes || item;
      const host = (db.host && db.host.address) || '127.0.0.1';
      const port = (db.host && db.host.port) || 3306;
      const endpoint = `${host}:${port}`;
      const password = (db.relationships && db.relationships.password && db.relationships.password.attributes && db.relationships.password.attributes.password) || db.password || '••••••••';

      html += `
        <div class="card card-hover" style="display: flex; flex-direction: column; gap: 0.75rem;">
          <div class="flex justify-between items-center" style="border-bottom: 1px solid var(--color-border); padding-bottom: 0.5rem;">
            <div class="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
              <span class="font-bold text-white">${db.name}</span>
            </div>
            <button class="btn btn-sm btn-ghost text-danger" title="Delete Database" onclick="window.databaseManager.deleteDb('${db.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
            </button>
          </div>

          <div class="text-xs" style="display: grid; grid-template-columns: 80px 1fr; gap: 0.5rem; color: var(--color-text-muted);">
            <div>Endpoint:</div>
            <div class="font-mono text-white">${endpoint}</div>

            <div>Database:</div>
            <div class="font-mono text-white">${db.name}</div>

            <div>Username:</div>
            <div class="font-mono text-white">${db.username}</div>

            <div>Connections:</div>
            <div class="font-mono text-white">${db.connections_from || '%'}</div>

            <div>Password:</div>
            <div class="flex items-center gap-2">
              <input type="password" readonly value="${password}" id="db-pass-${db.id}" class="form-input" style="padding: 0.2rem 0.4rem; font-size: 0.75rem; height: auto;">
              <button class="btn btn-sm btn-ghost" onclick="window.databaseManager.togglePassword('${db.id}')">👁</button>
              <button class="btn btn-sm btn-ghost" onclick="window.databaseManager.copyPassword('${password}')">📋</button>
            </div>
          </div>

          <div class="mt-2 pt-2 flex justify-end" style="border-top: 1px solid var(--color-border);">
            <button class="btn btn-sm btn-outline" onclick="window.databaseManager.rotatePassword('${db.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              Rotate Password
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';

    this.containerEl.innerHTML = html;
  }

  togglePassword(id) {
    const el = document.getElementById(`db-pass-${id}`);
    if (el) {
      el.type = el.type === 'password' ? 'text' : 'password';
    }
  }

  copyPassword(pass) {
    navigator.clipboard.writeText(pass);
    this.notify('Password copied to clipboard', 'info');
  }

  async promptCreate() {
    const name = prompt('Enter database name (e.g. s1_data):');
    if (!name || !name.trim()) return;

    try {
      await this.api.createDatabase(this.currentServerId, name.trim(), '%');
      this.notify(`Database '${name}' created!`, 'success');
      this.loadDatabases();
    } catch (err) {
      this.notify(`Failed to create database: ${err.message}`, 'error');
    }
  }

  async rotatePassword(id) {
    if (!confirm('Are you sure you want to rotate this database password? Any active connection will need updating.')) return;

    try {
      await this.api.rotateDatabasePassword(this.currentServerId, id);
      this.notify('Password rotated successfully', 'success');
      this.loadDatabases();
    } catch (err) {
      this.notify(`Failed to rotate password: ${err.message}`, 'error');
    }
  }

  async deleteDb(id) {
    if (!confirm('Are you sure you want to permanently delete this database? All data will be lost.')) return;

    try {
      await this.api.deleteDatabase(this.currentServerId, id);
      this.notify('Database deleted', 'success');
      this.loadDatabases();
    } catch (err) {
      this.notify(`Failed to delete database: ${err.message}`, 'error');
    }
  }
}

window.DatabaseController = DatabaseController;
