/**
 * Controller for Server Sub-tabs:
 * - Subusers (Server Access)
 * - Network (Allocations)
 * - Startup (Startup arguments & Docker image)
 * - Settings (Rename, Reinstall, SFTP details)
 */

class ServerExtraController {
  constructor(api, notify) {
    this.api = api;
    this.notify = notify;
    this.serverId = null;
    this.currentServer = null;
    this.setupListeners();
  }

  escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  setServer(serverIdOrObj, serverObj) {
    if (serverIdOrObj && typeof serverIdOrObj === 'object') {
      const s = serverIdOrObj.attributes || serverIdOrObj;
      this.serverId = s.identifier;
      this.currentServer = s;
    } else {
      this.serverId = serverIdOrObj;
      this.currentServer = serverObj ? (serverObj.attributes || serverObj) : null;
    }
  }

  setupListeners() {
    // Rename Form
    const renameForm = document.getElementById('server-rename-form');
    if (renameForm) {
      renameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('input-server-newname').value.trim();
        if (!newName || !this.serverId) return;

        try {
          await this.api.renameServer(this.serverId, newName);
          this.notify(`Server renamed to "${newName}"`, 'success');
          // Update title on UI
          const nameEl = document.getElementById('current-server-name');
          const breadNameEl = document.getElementById('breadcrumb-server-name');
          if (nameEl) nameEl.textContent = newName;
          if (breadNameEl) breadNameEl.textContent = newName;
          if (this.currentServer) this.currentServer.name = newName;
        } catch (err) {
          this.notify(`Failed to rename server: ${err.message}`, 'error');
        }
      });
    }

    // Reinstall Button
    const btnReinstall = document.getElementById('btn-reinstall-server');
    if (btnReinstall) {
      btnReinstall.addEventListener('click', async () => {
        const confirmed = await (window.dialog ? window.dialog.confirm('Are you sure you want to reinstall this server? This will re-run the installation script.', 'Reinstall Server', true) : confirm('Are you sure you want to reinstall this server? This will re-run the installation script.'));
        if (!confirmed) {
          return;
        }
        try {
          await this.api.reinstallServer(this.serverId);
          this.notify('Server reinstallation triggered!', 'warning');
        } catch (err) {
          this.notify(`Reinstallation failed: ${err.message}`, 'error');
        }
      });
    }
  }

  async loadSubusers() {
    const container = document.getElementById('subusers-list-container');
    if (!container || !this.serverId) return;

    container.innerHTML = '<div class="text-center p-4 text-muted">Loading subusers...</div>';
    try {
      const users = await this.api.getSubusers(this.serverId);
      if (!users || users.length === 0) {
        container.innerHTML = `
          <div class="card p-6 text-center text-muted">
            <p>No subusers configured for this server.</p>
            <p class="text-xs mt-1">You can grant subusers granular permissions to console, files, databases, or power control.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = users.map(u => {
        const attrs = u.attributes || u;
        return `
          <div class="card p-4 mb-3 flex justify-between items-center">
            <div class="flex items-center gap-3">
              <img src="${attrs.image || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + attrs.username}" style="width: 38px; height: 38px; border-radius: 50%;">
              <div>
                <div class="font-bold text-white">${attrs.username}</div>
                <div class="text-xs text-muted font-mono">${attrs.email}</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="badge badge-outline text-xs">${(attrs.permissions || []).length} Permissions</span>
              <span class="badge ${attrs['2fa_enabled'] ? 'badge-success' : 'badge-secondary'} text-xs">${attrs['2fa_enabled'] ? '2FA Active' : 'No 2FA'}</span>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      container.innerHTML = `<div class="card p-4 text-danger">Failed to load subusers: ${e.message}</div>`;
    }
  }

  async loadAllocations() {
    const container = document.getElementById('allocations-list-container');
    if (!container || !this.serverId) return;

    container.innerHTML = '<div class="text-center p-4 text-muted">Loading allocations...</div>';
    try {
      const allocs = await this.api.getAllocations(this.serverId);
      if (!allocs || allocs.length === 0) {
        container.innerHTML = '<div class="card p-4 text-muted">No allocations found.</div>';
        return;
      }

      container.innerHTML = allocs.map(a => {
        const att = a.attributes || a;
        const displayIp = att.alias || att.ip;
        return `
          <div class="card p-4 mb-3 flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="status-dot dot-running"></div>
              <div>
                <div class="font-mono font-bold text-white">${displayIp}:${att.port}</div>
                <div class="text-xs text-muted">${att.notes || 'Default server allocation'}</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              ${att.is_default ? '<span class="badge badge-primary text-xs">PRIMARY</span>' : '<span class="badge badge-outline text-xs">ADDITIONAL</span>'}
              <button class="btn btn-sm btn-ghost" onclick="navigator.clipboard.writeText('${displayIp}:${att.port}'); window.app.notify('Copied to clipboard!', 'info')">
                Copy
              </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      container.innerHTML = `<div class="card p-4 text-danger">Failed to load allocations: ${e.message}</div>`;
    }
  }

  async loadStartup() {
    const container = document.getElementById('startup-container');
    if (!container || !this.serverId) return;

    container.innerHTML = '<div class="text-center p-4 text-muted">Loading startup parameters...</div>';
    try {
      const data = await this.api.getStartup(this.serverId);
      if (!data) {
        container.innerHTML = '<div class="card p-4 text-muted">Startup configuration not available.</div>';
        return;
      }

      const rawCommand = data.raw_startup_command || data.startup_command || 'Unavailable';
      const dockerImage = this.currentServer?.docker_image || 'Unavailable';
      const variables = data.variables || [];

      container.innerHTML = `
        <div class="card mb-4 p-4">
          <div class="text-xs uppercase font-bold text-muted mb-2">Startup Command</div>
          <div class="font-mono text-xs bg-dark p-3 rounded border border-slate-700 text-cyan break-all">
            ${this.escapeHtml(rawCommand)}
          </div>
          <div class="text-xs text-muted mt-2">
            Docker Container: <code class="text-slate-300">${this.escapeHtml(dockerImage)}</code>
          </div>
        </div>

        <div class="flex justify-between items-center mb-3">
          <h3 class="text-md font-bold">Service Variables</h3>
          <span class="text-xs text-muted">${variables.length} configuration variable${variables.length === 1 ? '' : 's'}</span>
        </div>

        <div class="grid gap-3" id="startup-variables-list">
          ${variables.map(v => {
            const isEditable = v.is_editable !== false;
            const currentVal = v.server_value ?? v.default_value ?? '';
            const keySafe = this.escapeHtml(v.env_variable);
            return `
              <div class="card p-4">
                <div class="flex justify-between items-center mb-1">
                  <span class="font-bold text-sm text-white">${this.escapeHtml(v.name)}</span>
                  <div class="flex items-center gap-2">
                    ${!isEditable ? '<span class="text-xs" style="background: rgba(148, 163, 184, 0.1); color: #94a3b8; padding: 2px 8px; border-radius: 4px; font-weight: 600;">Read Only</span>' : ''}
                    <code class="text-xs text-cyan font-mono">${keySafe}</code>
                  </div>
                </div>
                <div class="text-xs text-muted mb-3">${this.escapeHtml(v.description || '')}</div>
                ${isEditable ? `
                  <form class="flex gap-2 items-center startup-var-form" data-key="${keySafe}">
                    <input type="text" class="form-input text-xs font-mono flex-1 var-input" value="${this.escapeHtml(currentVal)}" placeholder="${this.escapeHtml(v.default_value || '')}">
                    <button type="submit" class="btn btn-sm btn-primary btn-save-var">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                      Save
                    </button>
                  </form>
                ` : `
                  <input type="text" class="form-input text-xs font-mono" value="${this.escapeHtml(currentVal)}" disabled title="This variable is locked by server administrator">
                `}
                ${v.rules ? `<div class="text-xs text-muted mt-2 font-mono" style="font-size: 0.7rem; opacity: 0.7;">Rules: ${this.escapeHtml(v.rules)}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;

      // Attach submit handlers for editable variables
      container.querySelectorAll('.startup-var-form').forEach(form => {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const key = form.dataset.key;
          const input = form.querySelector('.var-input');
          const btn = form.querySelector('.btn-save-var');
          const val = input ? input.value : '';

          const originalBtnHtml = btn.innerHTML;
          btn.disabled = true;
          btn.textContent = 'Saving...';

          try {
            await this.api.updateStartupVariable(this.serverId, key, val);
            this.notify(`Variable "${key}" updated successfully!`, 'success');
            btn.innerHTML = 'Saved ✓';
            setTimeout(() => {
              btn.innerHTML = originalBtnHtml;
              btn.disabled = false;
            }, 2000);
          } catch (err) {
            this.notify(`Failed to update ${key}: ${err.message}`, 'error');
            btn.innerHTML = originalBtnHtml;
            btn.disabled = false;
          }
        });
      });

    } catch (e) {
      container.innerHTML = `<div class="card p-4 text-danger">Failed to load startup: ${e.message}</div>`;
    }
  }

  loadSettings() {
    if (!this.currentServer) return;
    const nameInput = document.getElementById('input-server-newname');
    if (nameInput) nameInput.value = this.currentServer.name || '';
  }
}

window.ServerExtraController = ServerExtraController;
