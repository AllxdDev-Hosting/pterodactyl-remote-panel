/**
 * File Manager Controller
 * Authentic Pterodactyl dark theme file management:
 * - Breadcrumbs sequence starting with /home/container/
 * - Checkbox multi-select toggling toolbar to Move, Archive, Delete
 * - 3-dots action menu with exact Pterodactyl actions for folders & files
 * - Fast navigation, viewing, editing, uploading, downloading, renaming, permissions (chmod), copy, archive
 */

class FileManagerController {
  constructor(api, notify) {
    this.api = api;
    this.notify = notify;
    this.currentDirectory = '/';
    this.currentServerId = null;
    this.selectedFiles = new Set();
    this.editingFilePath = null;

    this.tableBody = document.getElementById('files-table-body');
    this.breadcrumbsEl = document.getElementById('files-breadcrumbs');

    // Global listener to close context menu on outside click or scroll
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('file-context-menu');
      if (menu && menu.style.display !== 'none' && !e.target.closest('#file-context-menu') && !e.target.closest('.btn-file-dots')) {
        this.closeActionMenu();
      }
    });
    window.addEventListener('scroll', () => this.closeActionMenu(), true);
    window.addEventListener('resize', () => this.closeActionMenu());
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }

  escapeJs(str) {
    if (!str) return '';
    return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  setServer(serverId) {
    this.currentServerId = serverId;
    this.currentDirectory = '/';
    this.selectedFiles.clear();
    this.updateMassActionVisibility();
    this.loadDirectory(this.currentDirectory);
  }

  async loadDirectory(directory = '/') {
    if (!this.currentServerId) return;
    this.currentDirectory = directory;
    this.selectedFiles.clear();
    this.updateMassActionVisibility();
    this.closeActionMenu();
    this.renderBreadcrumbs();

    if (this.tableBody) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center" style="padding: 2.5rem; color: var(--color-text-muted);">
            <div class="loader-spinner" style="margin: 0 auto 0.75rem auto;"></div>
            Loading files...
          </td>
        </tr>
      `;
    }

    try {
      const files = await this.api.listFiles(this.currentServerId, directory);
      this.renderFileList(files);
    } catch (err) {
      if (this.tableBody) {
        this.tableBody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center" style="padding: 2rem; color: var(--color-danger);">
              Failed to load directory: ${this.escapeHtml(err.message)}
            </td>
          </tr>
        `;
      }
    }
  }

  renderBreadcrumbs() {
    if (!this.breadcrumbsEl) return;
    const parts = this.currentDirectory.split('/').filter(Boolean);

    let html = `
      <span class="breadcrumb-item cursor-pointer font-mono" onclick="window.fileManager.loadDirectory('/')" title="Root: /home/container/">
        /home/container/
      </span>
    `;

    if (parts.length > 0) {
      html = `
        <span class="breadcrumb-item cursor-pointer font-mono" onclick="window.fileManager.loadDirectory('/')" title="Root: /home/container/">
          /home/container
        </span>
        <span class="breadcrumb-separator">/</span>
      `;

      let accumulatedPath = '';
      parts.forEach((part, index) => {
        accumulatedPath += '/' + part;
        const pathTarget = accumulatedPath;
        const isLast = index === parts.length - 1;

        if (isLast) {
          html += `<span class="breadcrumb-item active font-mono">${this.escapeHtml(part)}</span>`;
        } else {
          html += `<span class="breadcrumb-item cursor-pointer font-mono" onclick="window.fileManager.loadDirectory('${this.escapeJs(pathTarget)}')">${this.escapeHtml(part)}</span>`;
          html += `<span class="breadcrumb-separator">/</span>`;
        }
      });
    }

    this.breadcrumbsEl.innerHTML = html;
  }

  getFileIcon(file) {
    if (file.is_file === false) {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color: #facc15;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
    }
    const ext = file.name.split('.').pop().toLowerCase();
    if (['json', 'yml', 'yaml', 'toml', 'properties', 'env', 'cfg', 'conf', 'ini'].includes(ext)) {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
    }
    if (['zip', 'tar', 'gz', 'rar'].includes(ext)) {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`;
    }
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
  }

  renderFileList(files) {
    if (!this.tableBody) return;

    if (!files || files.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center" style="padding: 2.5rem; color: var(--color-text-muted);">
            This folder is empty.
          </td>
        </tr>
      `;
      return;
    }

    // Sort folders first, then files alphabetically
    const sorted = [...files].map(f => f.attributes || f).sort((a, b) => {
      if (a.is_file === b.is_file) return a.name.localeCompare(b.name);
      return a.is_file ? 1 : -1;
    });

    let html = '';

    // Up directory row if not at root
    if (this.currentDirectory !== '/') {
      const upPath = this.currentDirectory.split('/').slice(0, -1).join('/') || '/';
      html += `
        <tr class="folder-row cursor-pointer" onclick="window.fileManager.loadDirectory('${this.escapeJs(upPath)}')">
          <td></td>
          <td colspan="4" style="color: var(--color-accent);">
            <div class="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
              <span>.. (Up one directory)</span>
            </div>
          </td>
        </tr>
      `;
    }

    sorted.forEach(file => {
      const isFolder = !file.is_file;
      const sizeStr = isFolder ? '-' : (typeof MonitoringController !== 'undefined' ? MonitoringController.formatBytes(file.size) : `${file.size || 0} B`);
      const modifiedStr = file.modified_at ? new Date(file.modified_at).toLocaleString() : '-';
      const icon = this.getFileIcon(file);
      const isSelected = this.selectedFiles.has(file.name);

      html += `
        <tr class="file-row ${isSelected ? 'row-selected' : ''}">
          <td style="width: 40px; text-align: center;">
            <input type="checkbox" data-filename="${this.escapeHtml(file.name)}" ${isSelected ? 'checked' : ''} onchange="window.fileManager.toggleSelect('${this.escapeJs(file.name)}', this.checked)">
          </td>
          <td class="file-name-cell cursor-pointer" onclick="${isFolder ? `window.fileManager.enterFolder('${this.escapeJs(file.name)}')` : `window.fileManager.openEditor('${this.escapeJs(file.name)}')`}">
            <div class="flex items-center gap-2 file-name-wrapper">
              ${icon}
              <span class="file-name ${isFolder ? 'font-bold' : ''}" title="${this.escapeHtml(file.name)}">${this.escapeHtml(file.name)}</span>
            </div>
          </td>
          <td class="file-size-cell text-muted">${sizeStr}</td>
          <td class="file-date-cell text-muted">${modifiedStr}</td>
          <td class="file-actions-cell text-right" style="width: 50px;">
            <button class="btn btn-sm btn-ghost btn-file-dots" onclick="window.fileManager.openActionMenu(event, '${this.escapeJs(file.name)}', ${isFolder})" title="Actions">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2.2"/>
                <circle cx="12" cy="12" r="2.2"/>
                <circle cx="12" cy="19" r="2.2"/>
              </svg>
            </button>
          </td>
        </tr>
      `;
    });

    this.tableBody.innerHTML = html;
  }

  enterFolder(folderName) {
    const nextPath = this.currentDirectory === '/' ? `/${folderName}` : `${this.currentDirectory}/${folderName}`;
    this.loadDirectory(nextPath);
  }

  toggleSelect(fileName, isChecked) {
    if (isChecked) {
      this.selectedFiles.add(fileName);
    } else {
      this.selectedFiles.delete(fileName);
    }
    this.updateMassActionVisibility();
  }

  toggleSelectAll(isChecked) {
    const checkboxes = document.querySelectorAll('#files-table-body input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.checked = isChecked;
      const fileName = cb.dataset.filename;
      if (fileName) {
        if (isChecked) {
          this.selectedFiles.add(fileName);
        } else {
          this.selectedFiles.delete(fileName);
        }
      }
    });
    this.updateMassActionVisibility();
  }

  updateMassActionVisibility() {
    const defaultActions = document.getElementById('files-default-actions');
    const massActions = document.getElementById('files-mass-actions');
    const selectAllCb = document.getElementById('select-all-files');

    const count = this.selectedFiles.size;
    if (count > 0) {
      if (defaultActions) defaultActions.style.display = 'none';
      if (massActions) massActions.style.display = 'flex';
    } else {
      if (defaultActions) defaultActions.style.display = 'flex';
      if (massActions) massActions.style.display = 'none';
    }

    if (selectAllCb) {
      const allRowCheckboxes = document.querySelectorAll('#files-table-body input[type="checkbox"]');
      if (allRowCheckboxes.length > 0 && count === allRowCheckboxes.length) {
        selectAllCb.checked = true;
        selectAllCb.indeterminate = false;
      } else if (count > 0) {
        selectAllCb.checked = false;
        selectAllCb.indeterminate = true;
      } else {
        selectAllCb.checked = false;
        selectAllCb.indeterminate = false;
      }
    }
  }

  // 3-dots Context Menu Handler
  openActionMenu(event, fileName, isFolder) {
    event.stopPropagation();
    event.preventDefault();

    const menu = document.getElementById('file-context-menu');
    if (!menu) return;

    const escName = this.escapeJs(fileName);

    // Exact actions per user request:
    // Folders: Rename, Move, Permissions, Archive, Delete
    // Files: Rename, Move, Permissions, Copy, Archive, Download, Delete
    let itemsHtml = `
      <button class="file-menu-item" onclick="window.fileManager.closeActionMenu(); window.fileManager.promptRename('${escName}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
        <span>Rename</span>
      </button>
      <button class="file-menu-item" onclick="window.fileManager.closeActionMenu(); window.fileManager.promptMove('${escName}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
        <span>Move</span>
      </button>
      <button class="file-menu-item" onclick="window.fileManager.closeActionMenu(); window.fileManager.promptPermissions('${escName}', ${isFolder ? "'0755'" : "'0644'"})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>Permissions</span>
      </button>
    `;

    if (!isFolder) {
      itemsHtml += `
        <button class="file-menu-item" onclick="window.fileManager.closeActionMenu(); window.fileManager.copySingle('${escName}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span>Copy</span>
        </button>
      `;
    }

    itemsHtml += `
      <button class="file-menu-item" onclick="window.fileManager.closeActionMenu(); window.fileManager.archiveSingle('${escName}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        <span>Archive</span>
      </button>
    `;

    const fileExt = fileName.split('.').pop().toLowerCase();
    const isArchive = !isFolder && (['zip', 'tar', 'gz', 'tgz', 'rar'].includes(fileExt) || fileName.endsWith('.tar.gz'));
    if (isArchive) {
      itemsHtml += `
        <button class="file-menu-item" onclick="window.fileManager.closeActionMenu(); window.fileManager.unarchiveSingle('${escName}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
          <span>Unarchive</span>
        </button>
      `;
    }

    if (!isFolder) {
      itemsHtml += `
        <button class="file-menu-item" onclick="window.fileManager.closeActionMenu(); window.fileManager.downloadFile('${escName}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Download</span>
        </button>
      `;
    }

    itemsHtml += `
      <div class="file-menu-divider"></div>
      <button class="file-menu-item text-danger" onclick="window.fileManager.closeActionMenu(); window.fileManager.deleteSingle('${escName}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        <span>Delete</span>
      </button>
    `;

    menu.innerHTML = itemsHtml;
    menu.style.display = 'flex';

    // Position menu near button
    const btnRect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 150;
    let left = btnRect.right - menuWidth;
    if (left < 10) left = 10;
    let top = btnRect.bottom + 4;
    const estHeight = isFolder ? 180 : 250;
    if (top + estHeight > window.innerHeight) {
      top = Math.max(10, btnRect.top - estHeight - 4);
    }

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  }

  closeActionMenu() {
    const menu = document.getElementById('file-context-menu');
    if (menu) menu.style.display = 'none';
  }

  cleanDirectoryInput(input) {
    if (!input) return '/';
    let clean = input.trim();
    clean = clean.replace(/^\/?home\/container\/?/i, '/');
    clean = clean.replace(/\/+$/, '');
    if (!clean || clean === '') return '/';
    return clean.startsWith('/') ? clean : `/${clean}`;
  }

  resolvePath(dir, file) {
    const cleanDir = (dir || '/').replace(/^\/+|\/+$/g, '');
    return cleanDir ? `${cleanDir}/${file}` : file;
  }

  // Single File Actions
  async promptRename(fileName) {
    const newName = await (window.dialog ? window.dialog.prompt(`Rename '${fileName}' to:`, fileName, 'Rename Item') : prompt(`Rename '${fileName}' to:`, fileName));
    if (!newName || !newName.trim() || newName.trim() === fileName) return;

    try {
      await this.api.renameFile(this.currentServerId, this.currentDirectory, fileName, newName.trim());
      this.notify(`Renamed to '${newName.trim()}'`, 'success');
      this.loadDirectory(this.currentDirectory);
    } catch (err) {
      this.notify(`Failed to rename: ${err.message}`, 'error');
    }
  }

  async promptMove(fileName) {
    const targetDir = await (window.dialog ? window.dialog.prompt(`Move '${fileName}' to directory:`, this.currentDirectory, 'Move Item') : prompt(`Move '${fileName}' to directory:`, this.currentDirectory));
    if (targetDir === null) return;
    const cleanTarget = this.cleanDirectoryInput(targetDir);
    const from = this.resolvePath(this.currentDirectory, fileName);
    const to = this.resolvePath(cleanTarget, fileName);

    try {
      await this.api.renameFile(this.currentServerId, '/', from, to);
      this.notify(`Moved '${fileName}' to '${cleanTarget}'`, 'success');
      this.loadDirectory(this.currentDirectory);
    } catch (err) {
      this.notify(`Failed to move: ${err.message}`, 'error');
    }
  }

  async promptPermissions(fileName, defaultMode = '0644') {
    const mode = await (window.dialog ? window.dialog.prompt(`Change permissions for '${fileName}' (e.g. 0644, 0755):`, defaultMode, 'Permissions') : prompt(`Change permissions for '${fileName}' (e.g. 0644, 0755):`, defaultMode));
    if (!mode || !mode.trim()) return;
    try {
      await this.api.chmodFiles(this.currentServerId, this.currentDirectory, [{ file: fileName, mode: mode.trim() }]);
      this.notify(`Updated permissions of '${fileName}' to ${mode.trim()}`, 'success');
      this.loadDirectory(this.currentDirectory);
    } catch (err) {
      this.notify(`Failed to change permissions: ${err.message}`, 'error');
    }
  }

  async copySingle(fileName) {
    const location = this.currentDirectory === '/' ? `/${fileName}` : `${this.currentDirectory}/${fileName}`;
    try {
      await this.api.copyFile(this.currentServerId, location);
      this.notify(`Copied '${fileName}'`, 'success');
      this.loadDirectory(this.currentDirectory);
    } catch (err) {
      this.notify(`Failed to copy: ${err.message}`, 'error');
    }
  }

  async archiveSingle(fileName) {
    try {
      this.notify(`Archiving '${fileName}'...`, 'info');
      await this.api.compressFiles(this.currentServerId, this.currentDirectory, [fileName]);
      this.notify(`Archived '${fileName}'`, 'success');
      this.loadDirectory(this.currentDirectory);
    } catch (err) {
      this.notify(`Failed to archive: ${err.message}`, 'error');
    }
  }

  async unarchiveSingle(fileName) {
    try {
      this.notify(`Decompressing '${fileName}'...`, 'info');
      await this.api.decompressFile(this.currentServerId, this.currentDirectory, fileName);
      this.notify(`Decompressed '${fileName}' successfully`, 'success');
      this.loadDirectory(this.currentDirectory);
    } catch (err) {
      this.notify(`Failed to decompress: ${err.message}`, 'error');
    }
  }

  async deleteSingle(fileName) {
    const confirmed = await (window.dialog ? window.dialog.confirm(`Are you sure you want to delete '${fileName}'?`, 'Delete Item', true) : confirm(`Are you sure you want to delete '${fileName}'?`));
    if (!confirmed) return;
    try {
      await this.api.deleteFiles(this.currentServerId, this.currentDirectory, [fileName]);
      this.notify(`Deleted '${fileName}'`, 'success');
      this.loadDirectory(this.currentDirectory);
    } catch (err) {
      this.notify(`Failed to delete: ${err.message}`, 'error');
    }
  }

  // Mass Actions
  async promptMassMove() {
    if (this.selectedFiles.size === 0) return;
    const target = await (window.dialog ? window.dialog.prompt(`Move ${this.selectedFiles.size} selected item(s) to directory:`, this.currentDirectory, 'Move Items') : prompt(`Move ${this.selectedFiles.size} selected item(s) to directory:`, this.currentDirectory));
    if (target === null) return;
    const cleanTarget = this.cleanDirectoryInput(target);

    try {
      const filesToMove = Array.from(this.selectedFiles).map(name => {
        return {
          from: this.resolvePath(this.currentDirectory, name),
          to: this.resolvePath(cleanTarget, name)
        };
      });
      await this.api.request(`/servers/${this.currentServerId}/files/rename`, {
        method: 'PUT',
        body: { root: '/', files: filesToMove }
      });
      this.notify(`Moved ${filesToMove.length} item(s) to '${cleanTarget}'`, 'success');
      this.selectedFiles.clear();
      this.updateMassActionVisibility();
      this.loadDirectory(this.currentDirectory);
    } catch (err) {
      this.notify(`Failed to move files: ${err.message}`, 'error');
    }
  }

  async massArchive() {
    if (this.selectedFiles.size === 0) return;
    const files = Array.from(this.selectedFiles);
    try {
      this.notify(`Archiving ${files.length} item(s)...`, 'info');
      await this.api.compressFiles(this.currentServerId, this.currentDirectory, files);
      this.notify(`Archived ${files.length} item(s) successfully`, 'success');
      this.selectedFiles.clear();
      this.updateMassActionVisibility();
      this.loadDirectory(this.currentDirectory);
    } catch (err) {
      this.notify(`Failed to archive files: ${err.message}`, 'error');
    }
  }

  async deleteSelected() {
    if (this.selectedFiles.size === 0) {
      this.notify('No files selected', 'warning');
      return;
    }

    const files = Array.from(this.selectedFiles);
    const confirmed = await (window.dialog ? window.dialog.confirm(`Delete ${files.length} selected item(s)?`, 'Delete Items', true) : confirm(`Delete ${files.length} selected item(s)?`));
    if (!confirmed) return;

    try {
      await this.api.deleteFiles(this.currentServerId, this.currentDirectory, files);
      this.notify(`Deleted ${files.length} item(s)`, 'success');
      this.selectedFiles.clear();
      this.updateMassActionVisibility();
      this.loadDirectory(this.currentDirectory);
    } catch (err) {
      this.notify(`Failed to delete files: ${err.message}`, 'error');
    }
  }

  // Download
  async downloadFile(fileName) {
    const filePath = this.currentDirectory === '/' ? `/${fileName}` : `${this.currentDirectory}/${fileName}`;
    try {
      this.notify(`Preparing download for '${fileName}'...`, 'info');
      let signedUrl = null;
      try {
        signedUrl = await this.api.getDownloadUrl(this.currentServerId, filePath);
      } catch (e) {
        console.warn('Signed download URL failed, attempting direct content download fallback:', e);
      }

      if (signedUrl) {
        window.open(signedUrl, '_blank');
        this.notify(`Download started for '${fileName}'`, 'success');
        return;
      }

      // Content fallback
      const content = await this.api.getFileContents(this.currentServerId, filePath);
      const blob = new Blob([content], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.notify(`Downloaded '${fileName}'`, 'success');
    } catch (err) {
      this.notify(`Download failed: ${err.message}`, 'error');
    }
  }

  // File Editor
  async openEditor(fileName) {
    const filePath = this.currentDirectory === '/' ? `/${fileName}` : `${this.currentDirectory}/${fileName}`;
    this.editingFilePath = filePath;

    const modal = document.getElementById('modal-editor');
    const titleEl = document.getElementById('editor-modal-title');
    const textarea = document.getElementById('editor-content');

    if (titleEl) titleEl.textContent = `Edit File: ${fileName}`;
    if (textarea) textarea.value = 'Loading file contents...';

    if (modal) modal.classList.add('active');

    try {
      const content = await this.api.getFileContents(this.currentServerId, filePath);
      if (textarea) textarea.value = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    } catch (err) {
      this.notify(`Failed to read file: ${err.message}`, 'error');
      if (textarea) textarea.value = `Error loading file:\n${err.message}`;
    }
  }

  async saveEditor() {
    if (!this.editingFilePath || !this.currentServerId) return;
    const textarea = document.getElementById('editor-content');
    const content = textarea ? textarea.value : '';

    try {
      await this.api.saveFileContents(this.currentServerId, this.editingFilePath, content);
      this.notify(`File saved successfully: ${this.editingFilePath}`, 'success');
      this.closeEditor();
      this.loadDirectory(this.currentDirectory);
    } catch (err) {
      this.notify(`Failed to save file: ${err.message}`, 'error');
    }
  }

  closeEditor() {
    const modal = document.getElementById('modal-editor');
    if (modal) modal.classList.remove('active');
    this.editingFilePath = null;
  }

  // Create Folder
  async promptCreateFolder() {
    const folderName = await (window.dialog ? window.dialog.prompt('Enter folder name:', '', 'Create Folder') : prompt('Enter folder name:'));
    if (!folderName || !folderName.trim()) return;

    try {
      await this.api.createFolder(this.currentServerId, this.currentDirectory, folderName.trim());
      this.notify(`Folder '${folderName.trim()}' created`, 'success');
      this.loadDirectory(this.currentDirectory);
    } catch (err) {
      this.notify(`Failed to create folder: ${err.message}`, 'error');
    }
  }

  // Create New File
  async promptNewFile() {
    const fileName = await (window.dialog ? window.dialog.prompt('Enter new file name:', '', 'Create File') : prompt('Enter new file name:'));
    if (!fileName || !fileName.trim()) return;
    const cleanName = fileName.trim();
    const filePath = this.currentDirectory === '/' ? `/${cleanName}` : `${this.currentDirectory}/${cleanName}`;

    try {
      await this.api.saveFileContents(this.currentServerId, filePath, '');
      this.notify(`File '${cleanName}' created`, 'success');
      this.loadDirectory(this.currentDirectory);
      this.openEditor(cleanName);
    } catch (err) {
      this.notify(`Failed to create file: ${err.message}`, 'error');
    }
  }

  promptCreateFile() {
    return this.promptNewFile();
  }

  // Upload
  async handleFileUpload(fileInput) {
    if (!fileInput.files || fileInput.files.length === 0) return;
    const file = fileInput.files[0];

    try {
      this.notify(`Uploading ${file.name}...`, 'info');
      const uploadUrl = await this.api.getUploadUrl(this.currentServerId);

      if (uploadUrl) {
        const parsed = new URL(uploadUrl);
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('Secure Wings upload URL unavailable');
        
        const formData = new FormData();
        formData.append('files', file);

        const targetUrl = uploadUrl.includes('?')
          ? `${uploadUrl}&directory=${encodeURIComponent(this.currentDirectory)}`
          : `${uploadUrl}?directory=${encodeURIComponent(this.currentDirectory)}`;

        try {
          const res = await fetch(targetUrl, {
            method: 'POST',
            body: formData
          });

          if (!res.ok) throw new Error(`Upload returned status ${res.status}`);
          this.notify(`Uploaded '${file.name}' successfully!`, 'success');
          fileInput.value = '';
          this.loadDirectory(this.currentDirectory);
          return;
        } catch (fetchErr) {
          // If browser CORS or network blocked direct Wings upload, fallback for text/code file under 1MB
          if (file.size < 1024 * 1024) {
            const textContent = await file.text();
            const targetPath = this.resolvePath(this.currentDirectory, file.name);
            await this.api.saveFileContents(this.currentServerId, `/${targetPath}`, textContent);
            this.notify(`Uploaded '${file.name}' successfully!`, 'success');
            fileInput.value = '';
            this.loadDirectory(this.currentDirectory);
            return;
          }
          throw fetchErr;
        }
      } else {
        throw new Error('Upstream did not provide a signed upload URL. No file was uploaded.');
      }
    } catch (err) {
      this.notify(`Upload failed: ${err.message}`, 'error');
    }
  }
}

window.FileManagerController = FileManagerController;
