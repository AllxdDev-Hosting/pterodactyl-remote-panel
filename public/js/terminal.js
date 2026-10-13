/**
 * xterm.js Interactive Console Controller
 * Realtime terminal connected directly to Wings WebSocket daemon.
 */

class TerminalController {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.onSendCommand = options.onSendCommand || (() => {});
    
    this.term = null;
    this.fitAddon = null;
    this.webLinksAddon = null;
    
    // Command history
    this.history = [];
    this.historyIndex = this.history.length;
    
    // Auto scroll state
    this.autoScroll = true;

    this.init();
  }

  init() {
    if (!this.container) return;

    // Terminal instance configuration
    const TerminalClass = window.Terminal;
    if (!TerminalClass) {
      console.error('xterm.js library not loaded');
      return;
    }

    const isCafe = document.body.classList.contains('theme-cafeblend');
    const termTheme = isCafe ? {
      background: '#201610',
      foreground: '#FDF6EC',
      cursor: '#C4956A',
      cursorAccent: '#201610',
      selectionBackground: 'rgba(196, 149, 106, 0.35)',
      black: '#3E2723',
      red: '#EF4444',
      green: '#10B981',
      yellow: '#F59E0B',
      blue: '#C4956A',
      magenta: '#A855F7',
      cyan: '#8B5E3C',
      white: '#FDF6EC',
      brightBlack: '#6B5B52',
      brightRed: '#F87171',
      brightGreen: '#34D399',
      brightYellow: '#FBBF24',
      brightBlue: '#D4A373',
      brightMagenta: '#C084FC',
      brightCyan: '#A06D48',
      brightWhite: '#FFFFFF'
    } : {
      background: '#050811',
      foreground: '#cbd5e1',
      cursor: '#06b6d4',
      cursorAccent: '#050811',
      selectionBackground: 'rgba(59, 130, 246, 0.35)',
      black: '#1e293b',
      red: '#f87171',
      green: '#4ade80',
      yellow: '#facc15',
      blue: '#60a5fa',
      magenta: '#c084fc',
      cyan: '#22d3ee',
      white: '#f8fafc',
      brightBlack: '#475569',
      brightRed: '#ef4444',
      brightGreen: '#22c55e',
      brightYellow: '#eab308',
      brightBlue: '#3b82f6',
      brightMagenta: '#a855f7',
      brightCyan: '#06b6d4',
      brightWhite: '#ffffff'
    };

    this.term = new TerminalClass({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 13,
      fontFamily: "'IBM Plex Mono', 'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      lineHeight: 1.25,
      scrollback: 5000,
      disableStdin: false,
      convertEol: true,
      theme: termTheme
    });

    // Addons
    if (window.FitAddon && window.FitAddon.FitAddon) {
      this.fitAddon = new window.FitAddon.FitAddon();
      this.term.loadAddon(this.fitAddon);
    }

    if (window.WebLinksAddon && window.WebLinksAddon.WebLinksAddon) {
      this.webLinksAddon = new window.WebLinksAddon.WebLinksAddon();
      this.term.loadAddon(this.webLinksAddon);
    }

    // Mount to DOM
    this.term.open(this.container);

    // Initial resize
    setTimeout(() => this.fit(), 100);

    // Window resize listener
    window.addEventListener('resize', () => this.fit());

    // Terminal keystrokes: allow typing directly in terminal or command input
    let currentLineBuffer = '';
    this.term.onData(data => {
      // Enter
      if (data === '\r') {
        const cmd = currentLineBuffer.trim();
        this.term.write('\r\n');
        if (cmd) {
          this.pushHistory(cmd);
          this.onSendCommand(cmd);
        }
        currentLineBuffer = '';
      }
      // Backspace
      else if (data === '\u007F' || data === '\b') {
        if (currentLineBuffer.length > 0) {
          currentLineBuffer = currentLineBuffer.slice(0, -1);
          this.term.write('\b \b');
        }
      }
      // Ctrl+C
      else if (data === '\u0003') {
        this.term.write('^C\r\n');
        currentLineBuffer = '';
      }
      // Printable characters
      else if (data >= ' ' && data <= '~') {
        currentLineBuffer += data;
        this.term.write(data);
      }
    });
  }

  fit() {
    if (this.fitAddon && this.container.offsetParent !== null) {
      try {
        this.fitAddon.fit();
      } catch (e) {
        // Suppress layout race condition
      }
    }
  }

  write(text) {
    if (!this.term) return;
    this.term.write(text);
    if (this.autoScroll) {
      this.term.scrollToBottom();
    }
  }

  writeln(line) {
    if (!this.term) return;
    this.term.writeln(line);
    if (this.autoScroll) {
      this.term.scrollToBottom();
    }
  }

  clear() {
    if (this.term) {
      this.term.clear();
      this.term.writeln('\x1b[90m[Console cleared]\x1b[0m');
    }
  }

  toggleAutoScroll() {
    this.autoScroll = !this.autoScroll;
    if (this.autoScroll && this.term) {
      this.term.scrollToBottom();
    }
    return this.autoScroll;
  }

  pushHistory(cmd) {
    if (!cmd) return;
    // Don't add duplicate of last command
    if (this.history[this.history.length - 1] !== cmd) {
      this.history.push(cmd);
      if (this.history.length > 50) this.history.shift();
    }
    this.historyIndex = this.history.length;
  }

  getPreviousCommand() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      return this.history[this.historyIndex];
    }
    return this.history[0] || '';
  }

  getNextCommand() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      return this.history[this.historyIndex];
    }
    this.historyIndex = this.history.length;
    return '';
  }

  updateTheme(themeName) {
    if (!this.term) return;
    if (themeName === 'cafeblend') {
      this.term.options.theme = {
        background: '#201610',
        foreground: '#FDF6EC',
        cursor: '#C4956A',
        cursorAccent: '#201610',
        selectionBackground: 'rgba(196, 149, 106, 0.35)',
        black: '#3E2723',
        red: '#EF4444',
        green: '#10B981',
        yellow: '#F59E0B',
        blue: '#C4956A',
        magenta: '#A855F7',
        cyan: '#8B5E3C',
        white: '#FDF6EC',
        brightBlack: '#6B5B52',
        brightRed: '#F87171',
        brightGreen: '#34D399',
        brightYellow: '#FBBF24',
        brightBlue: '#D4A373',
        brightMagenta: '#C084FC',
        brightCyan: '#A06D48',
        brightWhite: '#FFFFFF'
      };
    } else {
      this.term.options.theme = {
        background: '#050811',
        foreground: '#cbd5e1',
        cursor: '#06b6d4',
        cursorAccent: '#050811',
        selectionBackground: 'rgba(59, 130, 246, 0.35)',
        black: '#1e293b',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#f8fafc',
        brightBlack: '#475569',
        brightRed: '#ef4444',
        brightGreen: '#22c55e',
        brightYellow: '#eab308',
        brightBlue: '#3b82f6',
        brightMagenta: '#a855f7',
        brightCyan: '#06b6d4',
        brightWhite: '#ffffff'
      };
    }
  }
}

window.TerminalController = TerminalController;
