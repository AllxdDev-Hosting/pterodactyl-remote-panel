/**
 * File Manager Controller
 * Full remote file management: browse, edit, upload, download, rename, delete, compress.
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
  }

  setServer(serverId) {
    this.currentServerId = serverId;
    this.currentDirectory = '/';
    this.selectedFiles.clear();
    this.loadDirectory(this.currentDirectory);
  }

  async loadDirectory(directory = '/') {
    if (!this.currentServerId) return;
    this.currentDirectory = directory;
    this.selectedFiles.clear();
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
              Failed to load directory: ${err.message}
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
      <span class="breadcrumb-item" onclick="window.fileManager.loadDirectory('/')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
        /
      </span>
    `;

    let accumulatedPath = '';
    parts.forEach((part, index) => {
      accumulatedPath += '/' + part;
      const pathTarget = accumulatedPath;
      const isLast = index === parts.length - 1;

      html += `<span class="breadcrumb-separator">/</span>`;
      if (isLast) {
        html += `<span class="breadcrumb-item active">${part}</span>`;
      } else {
        html += `<span class="breadcrumb-item" onclick="window.fileManager.loadDirectory('${pathTarget}')">${part}</span>`;
      }
    });

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

    // Up directory button if not at root
    if (this.currentDirectory !== '/') {
      const upPath = this.currentDirectory.split('/').slice(0, -1).join('/') || '/';
      html += `
        <tr class="folder-row cursor-pointer" onclick="window.fileManager.loadDirectory('${upPath}')">
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
      const sizeStr = isFolder ? '-' : MonitoringController.formatBytes(file.size);
      const modifiedStr = file.modified_at ? new Date(file.modified_at).toLocaleString() : '-';
      const icon = this.getFileIcon(file);

      html += `
        <tr class="file-row">
          <td style="width: 40px; text-align: center;">
            <input type="checkbox" onchange="window.fileManager.toggleSelect('${file.name}', this.checked)">
          </td>
          <td class="file-name-cell cursor-pointer" onclick="${isFolder ? `window.fileManager.enterFolder('${file.name}')` : `window.fileManager.openEditor('${file.name}')`}">
            <div class="flex items-center gap-2">
              ${icon}
              <span class="file-name ${isFolder ? 'font-bold' : ''}">${file.name}</span>
            </div>
          </td>
          <td class="file-size-cell">${sizeStr}</td>
          <td class="file-date-cell">${modifiedStr}</td>
          <td class="file-actions-cell text-right">
            <div class="dropdown-actions flex gap-1 justify-end">
              ${!isFolder ? `
                <button class="btn btn-sm btn-ghost" title="Edit File" onclick="window.fileManager.openEditor('${file.name}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
                <button class="btn btn-sm btn-ghost" title="Download" onclick="window.fileManager.downloadFile('${file.name}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
              ` : ''}
              <button class="btn btn-sm btn-ghost" title="Rename" onclick="window.fileManager.promptRename('${file.name}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              </button>
              <button class="btn btn-sm btn-ghost text-danger" title="Delete" onclick="window.fileManager.deleteSingle('${file.name}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
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

  // Create folder
  async promptCreateFolder() {
    const folderName = prompt('Enter folder name:');
    if (!folderName || !folderName.trim()) return;

    try {
      await this.api.createFolder(this.currentServerId, this.currentDirectory, folderName.trim());
      this.notify(`Folder '${folderName}' created`, 'success');
      this.loadDirectory(this.currentDirectory);
    } catch (err) {
      this.notify(`Failed to create folder: ${err.message}`, 'error');
    }
  }

  // Create new file
  async promptCreateFile() {
    const fileName = prompt('Enter new file name:');
    if (!fileName || !fileName.trim()) return;

    const filePath = this.currentDirectory === '/' ? `/${fileName.trim()}` : `${this.currentDirectory}/${fileName.trim()}`;
    try {
      await this.api.saveFileContents(this.currentServerId, filePath, '');
      this.notify(`File '${fileName}' created`, 'success');
      this.loadDirectory(this.currentDirectory);
      this.openEditor(fileName.trim());
    } catch (err) {
      this.notify(`Failed to create file: ${err.message}`, 'error');
    }
  }

  // Rename
  async promptRename(oldName) {
    const newName = prompt(`Rename '${oldName}' to:`, oldName);
    if (!newName || newName.trim() === oldName) return;

    try {
      await this.api.renameFile(this.currentServerId, this.currentDirectory, oldName, newName.trim());
      this.notify(`Renamed to '${newName}'`, 'success');
      this.loadDirectory(this.currentDirectory);
    } catch (err) {
      this.notify(`Failed to rename: ${err.message}`, 'error');
    }
  }

  // Delete
  async deleteSingle(fileName) {
    if (!confirm(`Are you sure you want to delete '${fileName}'?`)) return;

    try {
      await this.api.deleteFiles(this.currentServerId, this.currentDirectory, [fileName]);
      this.notify(`Deleted '${fileName}'`, 'success');
      this.loadDirectory(this.currentDirectory);
    } catch (err) {
      this.notify(`Failed to delete: ${err.message}`, 'error');
    }
  }

  async deleteSelected() {
    if (this.selectedFiles.size === 0) {
      this.notify('No files selected', 'warning');
      return;
    }

    const files = Array.from(this.selectedFiles);
    if (!confirm(`Delete ${files.length} selected item(s)?`)) return;

    try {
      await this.api.deleteFiles(this.currentServerId, this.currentDirectory, files);
      this.notify(`Deleted ${files.length} item(s)`, 'success');
      this.loadDirectory(this.currentDirectory);
    } catch (err) {
      this.notify(`Failed to delete files: ${err.message}`, 'error');
    }
  }

  // Download
  async downloadFile(fileName) {
    const filePath = this.currentDirectory === '/' ? `/${fileName}` : `${this.currentDirectory}/${fileName}`;
    try {
      const url = await this.api.getDownloadUrl(this.currentServerId, filePath);
      if (url) {
        window.open(url, '_blank');
      } else {
        this.notify('Download URL not available', 'error');
      }
    } catch (err) {
      this.notify(`Download failed: ${err.message}`, 'error');
    }
  }

  // Upload
  async handleFileUpload(fileInput) {
    if (!fileInput.files || fileInput.files.length === 0) return;
    const file = fileInput.files[0];

    try {
      this.notify(`Uploading ${file.name}...`, 'info');
      const uploadUrl = await this.api.getUploadUrl(this.currentServerId);
      
      if (uploadUrl) {
        // Upload via Pterodactyl daemon upload URL
        const formData = new FormData();
        formData.append('files', file);

        const targetUrl = uploadUrl.includes('?') 
          ? `${uploadUrl}&directory=${encodeURIComponent(this.currentDirectory)}`
          : `${uploadUrl}?directory=${encodeURIComponent(this.currentDirectory)}`;

        const res = await fetch(targetUrl, {
          method: 'POST',
          body: formData
        });

        if (!res.ok) throw new Error(`Upload returned status ${res.status}`);
      } else {
        // Fallback write file directly
        const text = await file.text();
        const filePath = this.currentDirectory === '/' ? `/${file.name}` : `${this.currentDirectory}/${file.name}`;
        await this.api.saveFileContents(this.currentServerId, filePath, text);
      }

      this.notify(`Uploaded '${file.name}' successfully!`, 'success');
      fileInput.value = '';
      this.loadDirectory(this.currentDirectory);
    } catch (err) {
      this.notify(`Upload failed: ${err.message}`, 'error');
    }
  }
}

window.FileManagerController = FileManagerController;
