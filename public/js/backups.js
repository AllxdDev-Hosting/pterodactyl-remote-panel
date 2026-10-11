/**
 * Backup Management Controller
 * Creates, restores, locks, downloads, and deletes server backups.
 */

class BackupController {
  constructor(api, notify) {
    this.api = api;
    this.notify = notify;
    this.currentServerId = null;
    this.containerEl = document.getElementById('backups-list-container');
  }

  setServer(serverId) {
    this.currentServerId = serverId;
    this.loadBackups();
  }

  async loadBackups() {
    if (!this.currentServerId || !this.containerEl) return;

    this.containerEl.innerHTML = `
      <div class="text-center" style="padding: 2.5rem; color: var(--color-text-muted);">
        <div class="loader-spinner" style="margin: 0 auto 0.75rem auto;"></div>
        Loading server backups...
      </div>
    `;

    try {
      const backups = await this.api.getBackups(this.currentServerId);
      this.renderBackups(backups);
    } catch (err) {
      this.containerEl.innerHTML = `
        <div class="card" style="padding: 1.5rem; color: var(--color-danger); text-align: center;">
          Failed to load backups: ${err.message}
        </div>
      `;
    }
  }

  renderBackups(backups) {
    if (!this.containerEl) return;

    if (!backups || backups.length === 0) {
      this.containerEl.innerHTML = `
        <div class="card" style="padding: 2.5rem; text-align: center; color: var(--color-text-muted);">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 0.75rem; opacity: 0.5;">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          <p class="font-medium">No backups created yet.</p>
          <p class="text-sm mt-1">Create a backup to safeguard your server data.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Size</th>
              <th>Status</th>
              <th>Created</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
    `;

    backups.forEach(item => {
      const b = item.attributes || item;
      const sizeStr = MonitoringController.formatBytes(b.bytes);
      const createdStr = b.created_at ? new Date(b.created_at).toLocaleString() : '-';
      const isLocked = !!b.is_locked;
      const isSuccessful = b.is_successful !== false;

      html += `
        <tr>
          <td>
            <div class="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: ${isLocked ? 'var(--color-warning)' : 'var(--color-primary)'};">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              <div>
                <span class="font-bold text-white">${b.name}</span>
                ${isLocked ? '<span class="badge badge-warning text-xs ml-1">Locked</span>' : ''}
                <div class="text-xs text-muted font-mono">${b.uuid}</div>
              </div>
            </div>
          </td>
          <td>${sizeStr}</td>
          <td>
            <span class="badge ${isSuccessful ? 'badge-success' : 'badge-danger'}">
              ${isSuccessful ? 'Completed' : 'Failed'}
            </span>
          </td>
          <td class="text-xs text-muted">${createdStr}</td>
          <td style="text-align: right;">
            <div class="flex items-center gap-1 justify-end">
              <button class="btn btn-sm btn-ghost" title="Download" onclick="window.backupManager.downloadBackup('${b.uuid}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
              <button class="btn btn-sm btn-outline" title="Restore Server" onclick="window.backupManager.restoreBackup('${b.uuid}', '${b.name}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                Restore
              </button>
              <button class="btn btn-sm btn-ghost" title="${isLocked ? 'Unlock' : 'Lock'}" onclick="window.backupManager.toggleLock('${b.uuid}')">
                ${isLocked ? '🔓' : '🔒'}
              </button>
              <button class="btn btn-sm btn-ghost text-danger" title="Delete" onclick="window.backupManager.deleteBackup('${b.uuid}', '${b.name}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    this.containerEl.innerHTML = html;
  }

  async promptCreate() {
    const name = prompt('Backup Name (leave empty for auto):', `Backup-${new Date().toISOString().slice(0, 10)}`);
    if (name === null) return;

    try {
      this.notify('Creating backup, please wait...', 'info');
      await this.api.createBackup(this.currentServerId, name.trim() || 'Manual Backup', '', false);
      this.notify('Backup created successfully!', 'success');
      this.loadBackups();
    } catch (err) {
      this.notify(`Failed to create backup: ${err.message}`, 'error');
    }
  }

  async downloadBackup(uuid) {
    try {
      const url = await this.api.getBackupDownloadUrl(this.currentServerId, uuid);
      if (url) {
        window.open(url, '_blank');
      } else {
        this.notify('Download URL not available', 'error');
      }
    } catch (err) {
      this.notify(`Download failed: ${err.message}`, 'error');
    }
  }

  async restoreBackup(uuid, name) {
    const confirmRestore = confirm(`WARNING: Restoring backup "${name}" will overwrite files on the server.\n\nDo you want to proceed?`);
    if (!confirmRestore) return;

    const truncate = confirm(`Do you want to wipe existing files before restoring?\n(Click Cancel to keep unmatched existing files)`);

    try {
      this.notify('Triggering restore operation...', 'info');
      await this.api.restoreBackup(this.currentServerId, uuid, truncate);
      this.notify('Server restoration queued on daemon!', 'success');
    } catch (err) {
      this.notify(`Restore failed: ${err.message}`, 'error');
    }
  }

  async toggleLock(uuid) {
    try {
      await this.api.toggleBackupLock(this.currentServerId, uuid);
      this.notify('Backup lock status updated', 'success');
      this.loadBackups();
    } catch (err) {
      this.notify(`Failed to update lock: ${err.message}`, 'error');
    }
  }

  async deleteBackup(uuid, name) {
    if (!confirm(`Are you sure you want to delete backup "${name}"?`)) return;

    try {
      await this.api.deleteBackup(this.currentServerId, uuid);
      this.notify('Backup deleted', 'success');
      this.loadBackups();
    } catch (err) {
      this.notify(`Failed to delete backup: ${err.message}`, 'error');
    }
  }
}

window.BackupController = BackupController;
