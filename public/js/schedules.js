/**
 * Schedule Management Controller
 * Automates server power tasks, backup routines, and console commands via cron.
 */

class ScheduleController {
  constructor(api, notify) {
    this.api = api;
    this.notify = notify;
    this.currentServerId = null;
    this.containerEl = document.getElementById('schedules-list-container');
  }

  setServer(serverId) {
    this.currentServerId = serverId;
    this.loadSchedules();
  }

  async loadSchedules() {
    if (!this.currentServerId || !this.containerEl) return;

    this.containerEl.innerHTML = `
      <div class="text-center" style="padding: 2.5rem; color: var(--color-text-muted);">
        <div class="loader-spinner" style="margin: 0 auto 0.75rem auto;"></div>
        Loading automated schedules...
      </div>
    `;

    try {
      const schedules = await this.api.getSchedules(this.currentServerId);
      this.renderSchedules(schedules);
    } catch (err) {
      this.containerEl.innerHTML = `
        <div class="card" style="padding: 1.5rem; color: var(--color-danger); text-align: center;">
          Failed to load schedules: ${err.message}
        </div>
      `;
    }
  }

  renderSchedules(schedules) {
    if (!this.containerEl) return;

    if (!schedules || schedules.length === 0) {
      this.containerEl.innerHTML = `
        <div class="card" style="padding: 2.5rem; text-align: center; color: var(--color-text-muted);">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 0.75rem; opacity: 0.5;">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <p class="font-medium">No automated schedules configured.</p>
          <p class="text-sm mt-1">Create a schedule to automate restarts, backups, or broadcasts.</p>
        </div>
      `;
      return;
    }

    let html = '<div class="grid grid-2 gap-4">';
    schedules.forEach(item => {
      const s = item.attributes || item;
      const cron = s.cron || { minute: '*', hour: '*', day_of_month: '*', month: '*', day_of_week: '*' };
      const cronStr = `${cron.minute} ${cron.hour} ${cron.day_of_month} ${cron.month} ${cron.day_of_week}`;
      const isActive = !!s.is_active;
      const tasks = (s.relationships && s.relationships.tasks && s.relationships.tasks.data) || [];

      html += `
        <div class="card card-hover" style="display: flex; flex-direction: column; gap: 0.75rem;">
          <div class="flex justify-between items-center" style="border-bottom: 1px solid var(--color-border); padding-bottom: 0.5rem;">
            <div class="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span class="font-bold text-white">${s.name}</span>
            </div>
            <span class="badge ${isActive ? 'badge-success' : 'badge-danger'}">
              ${isActive ? 'Active' : 'Disabled'}
            </span>
          </div>

          <div class="text-xs" style="display: grid; grid-template-columns: 80px 1fr; gap: 0.4rem; color: var(--color-text-muted);">
            <div>Cron:</div>
            <div class="font-mono text-cyan">${cronStr}</div>

            <div>Last Run:</div>
            <div class="text-white">${s.last_run_at ? new Date(s.last_run_at).toLocaleString() : 'Never'}</div>

            <div>Next Run:</div>
            <div class="text-white">${s.next_run_at ? new Date(s.next_run_at).toLocaleString() : 'Pending'}</div>

            <div>Tasks:</div>
            <div class="text-white">${tasks.length} task(s) configured</div>
          </div>

          <div class="mt-2 pt-2 flex justify-between items-center" style="border-top: 1px solid var(--color-border);">
            <button class="btn btn-sm btn-ghost text-danger" title="Delete Schedule" onclick="window.scheduleManager.deleteSchedule('${s.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
              Delete
            </button>
            <button class="btn btn-sm btn-primary" onclick="window.scheduleManager.triggerRun('${s.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Run Now
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';

    this.containerEl.innerHTML = html;
  }

  async promptCreate() {
    const name = prompt('Schedule Name (e.g. Daily Restart):');
    if (!name || !name.trim()) return;

    const minute = prompt('Cron Minute (*, 0, */5):', '0') || '*';
    const hour = prompt('Cron Hour (*, 0, 4):', '4') || '*';

    const data = {
      name: name.trim(),
      is_active: true,
      minute,
      hour,
      day_of_month: '*',
      month: '*',
      day_of_week: '*',
      only_when_online: true
    };

    try {
      await this.api.createSchedule(this.currentServerId, data);
      this.notify(`Schedule '${name}' created!`, 'success');
      this.loadSchedules();
    } catch (err) {
      this.notify(`Failed to create schedule: ${err.message}`, 'error');
    }
  }

  async triggerRun(scheduleId) {
    try {
      this.notify('Executing schedule immediately...', 'info');
      await this.api.executeSchedule(this.currentServerId, scheduleId);
      this.notify('Schedule executed successfully!', 'success');
      this.loadSchedules();
    } catch (err) {
      this.notify(`Failed to trigger schedule: ${err.message}`, 'error');
    }
  }

  async deleteSchedule(scheduleId) {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      await this.api.deleteSchedule(this.currentServerId, scheduleId);
      this.notify('Schedule deleted', 'success');
      this.loadSchedules();
    } catch (err) {
      this.notify(`Failed to delete schedule: ${err.message}`, 'error');
    }
  }
}

window.ScheduleController = ScheduleController;
