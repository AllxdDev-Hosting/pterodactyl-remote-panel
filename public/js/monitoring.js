/**
 * Realtime Monitoring & Metrics Controller
 * Visualizes CPU, RAM, Disk, and Network stats using Chart.js.
 */

class MonitoringController {
  constructor() {
    this.charts = {
      cpu: null,
      memory: null,
      network: null
    };

    this.maxPoints = 35; // 35 seconds sliding window
    this.prevNetwork = { rx: null, tx: null, time: null };

    this.currentStats = {
      cpu: 0,
      memoryBytes: 0,
      memoryLimitBytes: 1073741824,
      diskBytes: 0,
      diskLimitBytes: 10737418240,
      networkRxSec: 0,
      networkTxSec: 0,
      uptime: 0
    };

    this.initCharts();
  }

  static formatBytes(bytes, decimals = 2) {
    if (bytes === 0 || !bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  static formatDuration(ms) {
    if (!ms || ms <= 0) return '0s';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  initCharts() {
    if (!window.Chart) {
      console.error('Chart.js not loaded');
      return;
    }

    const isCafe = document.body.classList.contains('theme-cafeblend');
    const cpuColor = isCafe ? '#8B5E3C' : '#3b82f6';
    const ramColor = isCafe ? '#C4956A' : '#10b981';
    const netRxColor = isCafe ? '#8B5E3C' : '#06b6d4';
    const netTxColor = isCafe ? '#C4956A' : '#8b5cf6';
    const gridColor = isCafe ? 'rgba(139, 94, 60, 0.08)' : 'rgba(255, 255, 255, 0.05)';
    const tickColor = isCafe ? '#8D6E63' : '#64748b';
    const tooltipBg = isCafe ? '#3E2723' : 'rgba(15, 23, 42, 0.9)';
    const tooltipTitle = isCafe ? '#FAF0E1' : '#94a3b8';
    const tooltipBody = isCafe ? '#FFFFFF' : '#f8fafc';
    const tooltipBorder = isCafe ? '#C4956A' : '#1e293b';

    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      elements: {
        point: { radius: 0, hoverRadius: 4 },
        line: { tension: 0.35, borderWidth: 2 }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: tooltipBg,
          titleColor: tooltipTitle,
          bodyColor: tooltipBody,
          borderColor: tooltipBorder,
          borderWidth: 1
        }
      },
      scales: {
        x: {
          display: false
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: tickColor,
            font: { size: 10, family: "'IBM Plex Mono', 'JetBrains Mono', monospace" }
          }
        }
      }
    };

    // 1. CPU Chart
    const cpuCanvas = document.getElementById('chart-cpu');
    if (cpuCanvas) {
      const ctx = cpuCanvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 200);
      gradient.addColorStop(0, isCafe ? 'rgba(139, 94, 60, 0.35)' : 'rgba(59, 130, 246, 0.35)');
      gradient.addColorStop(1, isCafe ? 'rgba(139, 94, 60, 0.0)' : 'rgba(59, 130, 246, 0.0)');

      this.charts.cpu = new window.Chart(cpuCanvas, {
        type: 'line',
        data: {
          labels: Array(this.maxPoints).fill(''),
          datasets: [{
            label: 'CPU Usage (%)',
            data: Array(this.maxPoints).fill(0),
            borderColor: cpuColor,
            backgroundColor: gradient,
            fill: true
          }]
        },
        options: {
          ...commonOptions,
          scales: {
            ...commonOptions.scales,
            y: {
              ...commonOptions.scales.y,
              min: 0,
              ticks: {
                ...commonOptions.scales.y.ticks,
                callback: val => `${val}%`
              }
            }
          }
        }
      });
    }

    // 2. RAM Chart
    const ramCanvas = document.getElementById('chart-ram');
    if (ramCanvas) {
      const ctx = ramCanvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 200);
      gradient.addColorStop(0, isCafe ? 'rgba(196, 149, 106, 0.35)' : 'rgba(16, 185, 129, 0.35)');
      gradient.addColorStop(1, isCafe ? 'rgba(196, 149, 106, 0.0)' : 'rgba(16, 185, 129, 0.0)');

      this.charts.memory = new window.Chart(ramCanvas, {
        type: 'line',
        data: {
          labels: Array(this.maxPoints).fill(''),
          datasets: [{
            label: 'Memory (MB)',
            data: Array(this.maxPoints).fill(0),
            borderColor: ramColor,
            backgroundColor: gradient,
            fill: true
          }]
        },
        options: {
          ...commonOptions,
          scales: {
            ...commonOptions.scales,
            y: {
              ...commonOptions.scales.y,
              min: 0,
              ticks: {
                ...commonOptions.scales.y.ticks,
                callback: val => `${Math.round(val)} MB`
              }
            }
          }
        }
      });
    }

    // 3. Network Chart (Rx & Tx)
    const netCanvas = document.getElementById('chart-network');
    if (netCanvas) {
      this.charts.network = new window.Chart(netCanvas, {
        type: 'line',
        data: {
          labels: Array(this.maxPoints).fill(''),
          datasets: [
            {
              label: 'Inbound Rx (KB/s)',
              data: Array(this.maxPoints).fill(0),
              borderColor: netRxColor,
              backgroundColor: 'transparent',
              borderWidth: 2
            },
            {
              label: 'Outbound Tx (KB/s)',
              data: Array(this.maxPoints).fill(0),
              borderColor: netTxColor,
              backgroundColor: 'transparent',
              borderWidth: 2
            }
          ]
        },
        options: {
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            legend: {
              display: true,
              labels: {
                color: tickColor,
                boxWidth: 12,
                font: { size: 11 }
              }
            }
          },
          scales: {
            ...commonOptions.scales,
            y: {
              ...commonOptions.scales.y,
              min: 0,
              ticks: {
                ...commonOptions.scales.y.ticks,
                callback: val => `${Math.round(val)} KB/s`
              }
            }
          }
        }
      });
    }
  }

  updateTheme(themeName) {
    if (this.charts.cpu) this.charts.cpu.destroy();
    if (this.charts.memory) this.charts.memory.destroy();
    if (this.charts.network) this.charts.network.destroy();
    this.initCharts();
  }

  setServerLimits(memoryMb, diskMb) {
    if (memoryMb) {
      this.currentStats.memoryLimitBytes = memoryMb * 1024 * 1024;
      if (this.charts.memory) {
        this.charts.memory.options.scales.y.max = memoryMb;
        this.charts.memory.update('none');
      }
    }
    if (diskMb) {
      this.currentStats.diskLimitBytes = diskMb * 1024 * 1024;
    }
  }

  processStats(stats) {
    if (!stats) return;

    const cpu = +(stats.cpu_absolute || 0).toFixed(1);
    const memoryBytes = stats.memory_bytes || 0;
    const memoryLimit = stats.memory_limit_bytes || this.currentStats.memoryLimitBytes;
    const diskBytes = stats.disk_bytes || 0;
    const uptimeMs = stats.uptime || 0;

    // Calculate network rate
    const now = Date.now();
    let rxRateKbs = 0;
    let txRateKbs = 0;

    if (stats.network) {
      const rx = stats.network.rx_bytes || 0;
      const tx = stats.network.tx_bytes || 0;

      if (this.prevNetwork.rx !== null && this.prevNetwork.time !== null) {
        const timeSec = (now - this.prevNetwork.time) / 1000;
        if (timeSec > 0) {
          rxRateKbs = Math.max(0, (rx - this.prevNetwork.rx) / 1024 / timeSec);
          txRateKbs = Math.max(0, (tx - this.prevNetwork.tx) / 1024 / timeSec);
        }
      }

      this.prevNetwork = { rx, tx, time: now };
    }

    this.currentStats = {
      cpu,
      memoryBytes,
      memoryLimitBytes: memoryLimit,
      diskBytes,
      networkRxSec: rxRateKbs,
      networkTxSec: txRateKbs,
      uptime: uptimeMs
    };

    // Update charts
    this.pushChartData(cpu, memoryBytes / 1024 / 1024, rxRateKbs, txRateKbs);

    // Update DOM indicators
    this.updateDomCards();
  }

  pushChartData(cpu, memoryMb, rxKbs, txKbs) {
    if (this.charts.cpu) {
      const ds = this.charts.cpu.data.datasets[0].data;
      ds.shift();
      ds.push(cpu);
      this.charts.cpu.update('none');
    }

    if (this.charts.memory) {
      const ds = this.charts.memory.data.datasets[0].data;
      ds.shift();
      ds.push(memoryMb);
      this.charts.memory.update('none');
    }

    if (this.charts.network) {
      const dsRx = this.charts.network.data.datasets[0].data;
      const dsTx = this.charts.network.data.datasets[1].data;
      dsRx.shift();
      dsRx.push(rxKbs);
      dsTx.shift();
      dsTx.push(txKbs);
      this.charts.network.update('none');
    }
  }

  updateDomCards() {
    const s = this.currentStats;

    // CPU Card
    const elCpuVal = document.getElementById('stat-cpu-val');
    const elCpuFill = document.getElementById('stat-cpu-fill');
    const elChartCpuVal = document.getElementById('chart-cpu-val');
    if (elCpuVal) elCpuVal.textContent = `${s.cpu}%`;
    if (elChartCpuVal) elChartCpuVal.textContent = `${s.cpu}%`;
    if (elCpuFill) elCpuFill.style.width = `${Math.min(100, s.cpu)}%`;

    // Memory Card
    const elRamVal = document.getElementById('stat-ram-val');
    const elRamSub = document.getElementById('stat-ram-sub');
    const elRamFill = document.getElementById('stat-ram-fill');
    const elChartRamVal = document.getElementById('chart-ram-val');
    const ramHuman = MonitoringController.formatBytes(s.memoryBytes);
    const ramLimitHuman = MonitoringController.formatBytes(s.memoryLimitBytes);
    const ramPct = s.memoryLimitBytes > 0 ? ((s.memoryBytes / s.memoryLimitBytes) * 100).toFixed(1) : 0;

    if (elRamVal) elRamVal.textContent = ramHuman;
    if (elChartRamVal) elChartRamVal.textContent = `${ramHuman} / ${ramLimitHuman} (${ramPct}%)`;
    if (elRamSub) elRamSub.textContent = `Limit: ${ramLimitHuman} (${ramPct}%)`;
    if (elRamFill) elRamFill.style.width = `${Math.min(100, ramPct)}%`;

    // Disk Card
    const elDiskVal = document.getElementById('stat-disk-val');
    const elDiskSub = document.getElementById('stat-disk-sub');
    const elDiskFill = document.getElementById('stat-disk-fill');
    const diskHuman = MonitoringController.formatBytes(s.diskBytes);
    const diskLimitHuman = MonitoringController.formatBytes(s.diskLimitBytes || 10737418240);
    const diskPct = s.diskLimitBytes > 0 ? ((s.diskBytes / s.diskLimitBytes) * 100).toFixed(1) : 0;

    if (elDiskVal) elDiskVal.textContent = diskHuman;
    if (elDiskSub) elDiskSub.textContent = `Total: ${diskLimitHuman}`;
    if (elDiskFill) elDiskFill.style.width = `${Math.min(100, diskPct)}%`;

    // Network Card
    const elNetVal = document.getElementById('stat-net-val');
    const elNetSub = document.getElementById('stat-net-sub');
    const elChartNetVal = document.getElementById('chart-net-val');
    const rxText = `${s.networkRxSec.toFixed(1)} KB/s`;
    const txText = `${s.networkTxSec.toFixed(1)} KB/s`;

    if (elNetVal) elNetVal.textContent = rxText;
    if (elNetSub) elNetSub.textContent = `↑ ${txText} | ↓ ${rxText}`;
    if (elChartNetVal) elChartNetVal.textContent = `In: ${rxText} | Out: ${txText}`;

    // Uptime
    const elUptime = document.getElementById('server-uptime');
    if (elUptime) elUptime.textContent = MonitoringController.formatDuration(s.uptime);
  }

  resize() {
    Object.values(this.charts).forEach(c => c && c.resize());
  }
}

window.MonitoringController = MonitoringController;
