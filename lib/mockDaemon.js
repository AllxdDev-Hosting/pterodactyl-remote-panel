/**
 * Mock Pterodactyl Wings Daemon & Client API Provider
 * Provides realistic simulation for testing, live preview, and demo mode.
 */

const mockServers = [
  {
    object: 'server',
    attributes: {
      server_owner: true,
      identifier: 'b3c8f10a',
      uuid: 'b3c8f10a-6f91-4cf1-8a9d-16f5c88d2231',
      name: 'Minecraft Survival SMP',
      node: 'Node-01-SG',
      description: 'Paper 1.20.4 High Performance SMP Server',
      is_suspended: false,
      is_installing: false,
      limits: {
        memory: 4096,
        swap: 0,
        disk: 20480,
        io: 500,
        cpu: 250
      },
      feature_limits: {
        databases: 3,
        allocations: 2,
        backups: 5
      },
      sftp_details: {
        ip: '149.28.152.10',
        port: 2022
      },
      relationships: {
        allocations: {
          data: [
            {
              object: 'server_allocation',
              attributes: {
                id: 1,
                ip: '149.28.152.10',
                alias: 'play.minecraftsmp.net',
                port: 25565,
                notes: 'Primary Allocation',
                is_default: true
              }
            }
          ]
        }
      }
    }
  },
  {
    object: 'server',
    attributes: {
      server_owner: true,
      identifier: '7d2e9a41',
      uuid: '7d2e9a41-2c18-4dfb-a712-8823158b0932',
      name: 'Discord Bot Cluster',
      node: 'Node-02-US',
      description: 'Node.js 20 Production Bot & Webhook Service',
      is_suspended: false,
      is_installing: false,
      limits: {
        memory: 1024,
        swap: 0,
        disk: 5120,
        io: 500,
        cpu: 100
      },
      feature_limits: {
        databases: 1,
        allocations: 1,
        backups: 2
      },
      sftp_details: {
        ip: '108.61.200.44',
        port: 2022
      },
      relationships: {
        allocations: {
          data: [
            {
              object: 'server_allocation',
              attributes: {
                id: 2,
                ip: '108.61.200.44',
                alias: 'bot.panel.internal',
                port: 8080,
                notes: 'API Port',
                is_default: true
              }
            }
          ]
        }
      }
    }
  },
  {
    object: 'server',
    attributes: {
      server_owner: true,
      identifier: 'e41b9c8f',
      uuid: 'e41b9c8f-39ad-4f51-b01c-6d5543c70129',
      name: 'Rust Dedicated Server',
      node: 'Node-03-EU',
      description: 'Rust Vanilla 2x Procedural Map',
      is_suspended: false,
      is_installing: false,
      limits: {
        memory: 8192,
        swap: 0,
        disk: 30720,
        io: 800,
        cpu: 400
      },
      feature_limits: {
        databases: 2,
        allocations: 2,
        backups: 3
      },
      sftp_details: {
        ip: '194.163.140.22',
        port: 2022
      },
      relationships: {
        allocations: {
          data: [
            {
              object: 'server_allocation',
              attributes: {
                id: 3,
                ip: '194.163.140.22',
                alias: 'rust.gamehost.eu',
                port: 28015,
                notes: 'Game Port',
                is_default: true
              }
            }
          ]
        }
      }
    }
  }
];

// In-memory mock storage for files, databases, backups, schedules
const mockStorage = {
  // Files structure per server identifier
  files: {
    'b3c8f10a': {
      '/': [
        { name: 'config', mode: 'drwxr-xr-x', size: 4096, is_file: false, is_symlink: false, mimetype: 'inode/directory', modified_at: new Date(Date.now() - 3600000).toISOString() },
        { name: 'plugins', mode: 'drwxr-xr-x', size: 4096, is_file: false, is_symlink: false, mimetype: 'inode/directory', modified_at: new Date(Date.now() - 7200000).toISOString() },
        { name: 'world', mode: 'drwxr-xr-x', size: 16384, is_file: false, is_symlink: false, mimetype: 'inode/directory', modified_at: new Date(Date.now() - 1800000).toISOString() },
        { name: 'server.properties', mode: '-rw-r--r--', size: 1240, is_file: true, is_symlink: false, mimetype: 'text/plain', modified_at: new Date(Date.now() - 900000).toISOString() },
        { name: 'eula.txt', mode: '-rw-r--r--', size: 24, is_file: true, is_symlink: false, mimetype: 'text/plain', modified_at: new Date(Date.now() - 86400000).toISOString() },
        { name: 'paper.yml', mode: '-rw-r--r--', size: 4890, is_file: true, is_symlink: false, mimetype: 'text/yaml', modified_at: new Date(Date.now() - 3600000).toISOString() },
        { name: 'ops.json', mode: '-rw-r--r--', size: 182, is_file: true, is_symlink: false, mimetype: 'application/json', modified_at: new Date(Date.now() - 400000).toISOString() },
        { name: 'whitelist.json', mode: '-rw-r--r--', size: 2, is_file: true, is_symlink: false, mimetype: 'application/json', modified_at: new Date(Date.now() - 10000000).toISOString() },
        { name: 'server.jar', mode: '-rwxr-xr-x', size: 48234496, is_file: true, is_symlink: false, mimetype: 'application/java-archive', modified_at: new Date(Date.now() - 86400000).toISOString() }
      ],
      '/config': [
        { name: 'paper-global.yml', mode: '-rw-r--r--', size: 2340, is_file: true, is_symlink: false, mimetype: 'text/yaml', modified_at: new Date(Date.now() - 3600000).toISOString() },
        { name: 'paper-world-defaults.yml', mode: '-rw-r--r--', size: 3100, is_file: true, is_symlink: false, mimetype: 'text/yaml', modified_at: new Date(Date.now() - 3600000).toISOString() }
      ],
      '/plugins': [
        { name: 'EssentialsX.jar', mode: '-rw-r--r--', size: 2450000, is_file: true, is_symlink: false, mimetype: 'application/java-archive', modified_at: new Date(Date.now() - 7200000).toISOString() },
        { name: 'CoreProtect.jar', mode: '-rw-r--r--', size: 1840000, is_file: true, is_symlink: false, mimetype: 'application/java-archive', modified_at: new Date(Date.now() - 7200000).toISOString() },
        { name: 'LuckPerms.jar', mode: '-rw-r--r--', size: 3120000, is_file: true, is_symlink: false, mimetype: 'application/java-archive', modified_at: new Date(Date.now() - 7200000).toISOString() }
      ]
    },
    '7d2e9a41': {
      '/': [
        { name: 'src', mode: 'drwxr-xr-x', size: 4096, is_file: false, is_symlink: false, mimetype: 'inode/directory', modified_at: new Date(Date.now() - 100000).toISOString() },
        { name: 'package.json', mode: '-rw-r--r--', size: 840, is_file: true, is_symlink: false, mimetype: 'application/json', modified_at: new Date(Date.now() - 200000).toISOString() },
        { name: '.env', mode: '-rw-r--r--', size: 320, is_file: true, is_symlink: false, mimetype: 'text/plain', modified_at: new Date(Date.now() - 500000).toISOString() },
        { name: 'index.js', mode: '-rw-r--r--', size: 1980, is_file: true, is_symlink: false, mimetype: 'text/javascript', modified_at: new Date(Date.now() - 100000).toISOString() }
      ],
      '/src': [
        { name: 'commands.js', mode: '-rw-r--r--', size: 3200, is_file: true, is_symlink: false, mimetype: 'text/javascript', modified_at: new Date(Date.now() - 100000).toISOString() },
        { name: 'events.js', mode: '-rw-r--r--', size: 2100, is_file: true, is_symlink: false, mimetype: 'text/javascript', modified_at: new Date(Date.now() - 100000).toISOString() }
      ]
    }
  },

  fileContents: {
    '/server.properties': `# Minecraft server properties
server-port=25565
motd=\\u00A7aMinecraft Survival SMP \\u00A77| \\u00A7bSeason 4
gamemode=survival
difficulty=hard
max-players=20
pvp=true
enable-command-block=true
white-list=false
online-mode=true
view-distance=10
simulation-distance=8
level-name=world`,
    '/eula.txt': `eula=true\n`,
    '/ops.json': `[\n  {\n    "uuid": "4566e69f-c907-48ee-8d71-d7ba5aa00d20",\n    "name": "Admin",\n    "level": 4,\n    "bypassesPlayerLimit": true\n  }\n]`,
    '/package.json': `{\n  "name": "pterodactyl-discord-bot",\n  "version": "1.0.0",\n  "main": "index.js",\n  "scripts": {\n    "start": "node index.js"\n  },\n  "dependencies": {\n    "discord.js": "^14.14.1",\n    "dotenv": "^16.4.5"\n  }\n}`,
    '/.env': `DISCORD_TOKEN=MTE5OTg3NjU0MzIx.DemoBotToken.SamplePlaceholder\nCLIENT_ID=119987654321098765\nPREFIX=!\nNODE_ENV=production`
  },

  databases: {
    'b3c8f10a': [
      {
        object: 'server_database',
        attributes: {
          id: 's1_coreprotect',
          name: 's1_coreprotect',
          username: 'u1_coreprotect',
          host: { address: '149.28.152.10', port: 3306 },
          relationships: {
            password: {
              attributes: { password: 'Secr3t_Db_P@ssw0rd_982' }
            }
          }
        }
      },
      {
        object: 'server_database',
        attributes: {
          id: 's1_luckperms',
          name: 's1_luckperms',
          username: 'u1_luckperms',
          host: { address: '149.28.152.10', port: 3306 },
          relationships: {
            password: {
              attributes: { password: 'Lp_Mypassw0rd_2026' }
            }
          }
        }
      }
    ],
    '7d2e9a41': [
      {
        object: 'server_database',
        attributes: {
          id: 's2_botdb',
          name: 's2_botdb',
          username: 'u2_botuser',
          host: { address: '108.61.200.44', port: 3306 },
          relationships: {
            password: {
              attributes: { password: 'Discord_Bot_Db_Pass_77' }
            }
          }
        }
      }
    ]
  },

  backups: {
    'b3c8f10a': [
      {
        object: 'server_backup',
        attributes: {
          uuid: 'a89c201e-453b-419a-9e51-0bf232f31920',
          name: 'Automatic Daily Backup',
          ignored_files: ['*.log', 'cache/*'],
          sha256_hash: '9f83c2794348a47f426e2e50ef77732d8471c8907865c029a14de8e7bb0e9221',
          bytes: 482914820,
          created_at: new Date(Date.now() - 43200000).toISOString(),
          completed_at: new Date(Date.now() - 43100000).toISOString(),
          is_successful: true,
          is_locked: true
        }
      },
      {
        object: 'server_backup',
        attributes: {
          uuid: 'c52b11ef-712d-4889-8d55-12cf1902ba91',
          name: 'Pre-Update Backup 1.20.4',
          ignored_files: [],
          sha256_hash: '3f23a41b2c45e6d78a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f',
          bytes: 471200190,
          created_at: new Date(Date.now() - 172800000).toISOString(),
          completed_at: new Date(Date.now() - 172700000).toISOString(),
          is_successful: true,
          is_locked: false
        }
      }
    ],
    '7d2e9a41': [
      {
        object: 'server_backup',
        attributes: {
          uuid: 'f1023ba9-58a1-42e1-88fc-9102ca1239aa',
          name: 'Initial Deploy Snapshot',
          ignored_files: ['node_modules/*'],
          sha256_hash: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
          bytes: 1420950,
          created_at: new Date(Date.now() - 259200000).toISOString(),
          completed_at: new Date(Date.now() - 259190000).toISOString(),
          is_successful: true,
          is_locked: true
        }
      }
    ]
  },

  schedules: {
    'b3c8f10a': [
      {
        object: 'server_schedule',
        attributes: {
          id: 1,
          name: 'Daily Server Restart & Memory Flush',
          cron: {
            minute: '0',
            hour: '4',
            day_of_month: '*',
            month: '*',
            day_of_week: '*'
          },
          is_active: true,
          is_processing: false,
          last_run_at: new Date(Date.now() - 36000000).toISOString(),
          next_run_at: new Date(Date.now() + 50400000).toISOString(),
          created_at: new Date(Date.now() - 604800000).toISOString(),
          updated_at: new Date(Date.now() - 604800000).toISOString(),
          relationships: {
            tasks: {
              data: [
                {
                  object: 'schedule_task',
                  attributes: {
                    id: 101,
                    sequence_id: 1,
                    action: 'command',
                    payload: 'say §c[Server] Daily scheduled reboot in 60 seconds!',
                    time_offset: 0,
                    is_queued: false
                  }
                },
                {
                  object: 'schedule_task',
                  attributes: {
                    id: 102,
                    sequence_id: 2,
                    action: 'power',
                    payload: 'restart',
                    time_offset: 60,
                    is_queued: false
                  }
                }
              ]
            }
          }
        }
      },
      {
        object: 'server_schedule',
        attributes: {
          id: 2,
          name: 'Automated 12h World Backup',
          cron: {
            minute: '30',
            hour: '*/12',
            day_of_month: '*',
            month: '*',
            day_of_week: '*'
          },
          is_active: true,
          is_processing: false,
          last_run_at: new Date(Date.now() - 18000000).toISOString(),
          next_run_at: new Date(Date.now() + 25200000).toISOString(),
          created_at: new Date(Date.now() - 604800000).toISOString(),
          updated_at: new Date(Date.now() - 604800000).toISOString(),
          relationships: {
            tasks: {
              data: [
                {
                  object: 'schedule_task',
                  attributes: {
                    id: 201,
                    sequence_id: 1,
                    action: 'backup',
                    payload: '',
                    time_offset: 0,
                    is_queued: false
                  }
                }
              ]
            }
          }
        }
      }
    ],
    '7d2e9a41': [
      {
        object: 'server_schedule',
        attributes: {
          id: 3,
          name: 'Keepalive Ping & Healthcheck',
          cron: {
            minute: '*/30',
            hour: '*',
            day_of_month: '*',
            month: '*',
            day_of_week: '*'
          },
          is_active: true,
          is_processing: false,
          last_run_at: new Date(Date.now() - 900000).toISOString(),
          next_run_at: new Date(Date.now() + 900000).toISOString(),
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString(),
          relationships: {
            tasks: {
              data: []
            }
          }
        }
      }
    ]
  }
};

// Global simulated server states
const serverStates = {
  'b3c8f10a': {
    status: 'running',
    cpu: 18.4,
    memoryBytes: 1845493760, // ~1.72 GB
    memoryLimitBytes: 4294967296, // 4 GB
    diskBytes: 8521094800, // ~7.93 GB
    networkRx: 142095000,
    networkTx: 289410300,
    uptime: 142850000,
    players: ['Steve', 'Alex', 'Notch']
  },
  '7d2e9a41': {
    status: 'running',
    cpu: 3.2,
    memoryBytes: 154140672, // ~147 MB
    memoryLimitBytes: 1073741824, // 1 GB
    diskBytes: 284102900,
    networkRx: 5219400,
    networkTx: 8941200,
    uptime: 384910000,
    players: []
  },
  'e41b9c8f': {
    status: 'running',
    cpu: 32.8,
    memoryBytes: 4294967296, // 4 GB
    memoryLimitBytes: 8589934592, // 8 GB
    diskBytes: 12419842000,
    networkRx: 452914800,
    networkTx: 812940200,
    uptime: 89201000,
    players: []
  }
};

/**
 * Handle Mock HTTP Client API requests
 */
function handleMockApi(req, res) {
  const method = req.method;
  let urlPath = req.originalUrl ? req.originalUrl.replace(/^\/api\/proxy/, '').split('?')[0] : req.path;
  if (!urlPath.startsWith('/')) urlPath = '/' + urlPath;
  urlPath = urlPath.replace(/^\/api\/client/, '');
  if (!urlPath) urlPath = '/';

  // 1. GET / or /servers -> List servers
  if (method === 'GET' && (urlPath === '/' || urlPath === '/servers')) {
    return res.json({
      object: 'list',
      data: mockServers
    });
  }

  // Extract server identifier: /servers/:id/... or /:id/...
  const match = urlPath.match(/^(?:\/servers)?\/([^\/]+)(.*)/);
  if (!match) {
    return res.status(404).json({ error: 'Endpoint not found in demo mode' });
  }

  const serverId = match[1];
  const subPath = match[2] || '';
  const server = mockServers.find(s => s.attributes.identifier === serverId || s.attributes.uuid === serverId) || mockServers[0];
  const id = server.attributes.identifier;
  const state = serverStates[id] || (serverStates[id] = { status: 'running', cpu: 15, memoryBytes: 1073741824, memoryLimitBytes: server.attributes.limits.memory * 1024 * 1024, diskBytes: 1000000000, networkRx: 100000, networkTx: 200000, uptime: 10000 });

  // 2. GET /api/client/servers/:id -> Server details
  if (method === 'GET' && (subPath === '' || subPath === '/')) {
    return res.json({
      object: 'server',
      attributes: server.attributes
    });
  }

  // 3. GET /api/client/servers/:id/websocket -> Wings WebSocket token & socket URL
  if (method === 'GET' && subPath === '/websocket') {
    return res.json({
      data: {
        token: `demo-jwt-token-for-${id}`,
        socket: `ws://localhost:3000/ws?demo=true&serverId=${id}`
      }
    });
  }

  // 4. GET /api/client/servers/:id/resources -> Realtime resource stats
  if (method === 'GET' && subPath === '/resources') {
    return res.json({
      object: 'stats',
      attributes: {
        current_state: state.status,
        is_suspended: false,
        resources: {
          memory_bytes: state.status === 'offline' ? 0 : state.memoryBytes,
          cpu_absolute: state.status === 'offline' ? 0 : state.cpu,
          disk_bytes: state.diskBytes,
          network_rx_bytes: state.networkRx,
          network_tx_bytes: state.networkTx,
          uptime: state.status === 'offline' ? 0 : state.uptime
        }
      }
    });
  }

  // 5. POST /api/client/servers/:id/power -> Power actions
  if (method === 'POST' && subPath === '/power') {
    const signal = req.body && req.body.signal;
    if (signal === 'start') {
      state.status = 'running';
    } else if (signal === 'stop') {
      state.status = 'stopping';
      setTimeout(() => { state.status = 'offline'; }, 2000);
    } else if (signal === 'restart') {
      state.status = 'stopping';
      setTimeout(() => { state.status = 'running'; }, 3000);
    } else if (signal === 'kill') {
      state.status = 'offline';
    }
    return res.status(204).send();
  }

  // 6. POST /api/client/servers/:id/command -> Send command
  if (method === 'POST' && subPath === '/command') {
    return res.status(204).send();
  }

  // 7. FILE MANAGER ENDPOINTS
  if (subPath.startsWith('/files')) {
    const fileAction = subPath.replace('/files', '');

    // GET /files/list?directory=...
    if (method === 'GET' && (fileAction === '/list' || fileAction === '')) {
      const dir = (req.query.directory || '/').replace(/\/+$/, '') || '/';
      const serverFiles = mockStorage.files[id] || (mockStorage.files[id] = { '/': [] });
      const filesInDir = serverFiles[dir] || [];
      return res.json({
        object: 'list',
        data: filesInDir.map(f => ({
          object: 'file_object',
          attributes: f
        }))
      });
    }

    // GET /files/contents?file=...
    if (method === 'GET' && fileAction === '/contents') {
      const filePath = req.query.file || '';
      const content = mockStorage.fileContents[filePath] || `# File: ${filePath}\n# Managed via Pterodactyl Remote Panel\n# Demo Content for testing.\n`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(content);
    }

    // POST /files/write?file=...
    if (method === 'POST' && fileAction === '/write') {
      const filePath = req.query.file || '';
      let bodyData = '';
      if (typeof req.body === 'string') {
        bodyData = req.body;
      } else if (req.body && req.body.content !== undefined) {
        bodyData = req.body.content;
      } else {
        bodyData = JSON.stringify(req.body, null, 2);
      }
      mockStorage.fileContents[filePath] = bodyData;
      return res.status(204).send();
    }

    // POST /files/rename
    if (method === 'POST' && fileAction === '/rename') {
      const { root = '/', files = [] } = req.body || {};
      const serverFiles = mockStorage.files[id] && mockStorage.files[id][root];
      if (serverFiles && Array.isArray(files)) {
        files.forEach(({ from, to }) => {
          const item = serverFiles.find(f => f.name === from);
          if (item) item.name = to;
        });
      }
      return res.status(204).send();
    }

    // POST /files/create-folder
    if (method === 'POST' && fileAction === '/create-folder') {
      const { root = '/', name = 'new_folder' } = req.body || {};
      if (!mockStorage.files[id]) mockStorage.files[id] = {};
      if (!mockStorage.files[id][root]) mockStorage.files[id][root] = [];
      mockStorage.files[id][root].push({
        name,
        mode: 'drwxr-xr-x',
        size: 4096,
        is_file: false,
        is_symlink: false,
        mimetype: 'inode/directory',
        modified_at: new Date().toISOString()
      });
      return res.status(204).send();
    }

    // POST /files/delete
    if (method === 'POST' && fileAction === '/delete') {
      const { root = '/', files = [] } = req.body || {};
      if (mockStorage.files[id] && mockStorage.files[id][root]) {
        mockStorage.files[id][root] = mockStorage.files[id][root].filter(f => !files.includes(f.name));
      }
      return res.status(204).send();
    }

    // GET /files/download?file=...
    if (method === 'GET' && fileAction === '/download') {
      const filePath = req.query.file || '';
      return res.json({
        object: 'signed_url',
        attributes: {
          url: `/api/proxy/files/contents?file=${encodeURIComponent(filePath)}&demo=true`
        }
      });
    }

    // GET /files/upload
    if (method === 'GET' && fileAction === '/upload') {
      return res.json({
        object: 'signed_url',
        attributes: {
          url: `/api/upload-proxy?demo=true&serverId=${id}`
        }
      });
    }

    // POST /files/compress
    if (method === 'POST' && fileAction === '/compress') {
      const { root = '/', files = [] } = req.body || {};
      if (!mockStorage.files[id]) mockStorage.files[id] = {};
      if (!mockStorage.files[id][root]) mockStorage.files[id][root] = [];
      const archiveName = `archive-${Date.now()}.tar.gz`;
      mockStorage.files[id][root].push({
        name: archiveName,
        mode: '-rw-r--r--',
        size: 1048576,
        is_file: true,
        is_symlink: false,
        mimetype: 'application/gzip',
        modified_at: new Date().toISOString()
      });
      return res.json({
        object: 'file_object',
        attributes: { name: archiveName }
      });
    }

    // POST /files/decompress
    if (method === 'POST' && fileAction === '/decompress') {
      return res.status(204).send();
    }
  }

  // 8. DATABASE ENDPOINTS
  if (subPath.startsWith('/databases')) {
    const dbAction = subPath.replace('/databases', '');
    const serverDbs = mockStorage.databases[id] || (mockStorage.databases[id] = []);

    // GET /databases
    if (method === 'GET' && (dbAction === '' || dbAction === '/')) {
      return res.json({
        object: 'list',
        data: serverDbs
      });
    }

    // POST /databases -> create database
    if (method === 'POST' && (dbAction === '' || dbAction === '/')) {
      const { database = 'new_db', remote = '%' } = req.body || {};
      const newDb = {
        object: 'server_database',
        attributes: {
          id: `s_${Date.now()}`,
          name: `${id.slice(0, 4)}_${database}`,
          username: `u_${id.slice(0, 4)}_${Math.random().toString(36).substring(2, 6)}`,
          host: { address: server.attributes.sftp_details.ip, port: 3306 },
          relationships: {
            password: {
              attributes: { password: `Pass_${Math.random().toString(36).substring(2, 10)}_#` }
            }
          }
        }
      };
      serverDbs.push(newDb);
      return res.json(newDb);
    }

    // POST /databases/:dbId/rotate-password
    const rotateMatch = dbAction.match(/^\/([^\/]+)\/rotate-password$/);
    if (method === 'POST' && rotateMatch) {
      const dbId = rotateMatch[1];
      const dbItem = serverDbs.find(d => d.attributes.id === dbId);
      if (dbItem) {
        dbItem.attributes.relationships.password.attributes.password = `Rotated_${Math.random().toString(36).substring(2, 10)}_!`;
        return res.json(dbItem);
      }
      return res.status(404).json({ error: 'Database not found' });
    }

    // DELETE /databases/:dbId
    const deleteMatch = dbAction.match(/^\/([^\/]+)$/);
    if (method === 'DELETE' && deleteMatch) {
      const dbId = deleteMatch[1];
      const idx = serverDbs.findIndex(d => d.attributes.id === dbId);
      if (idx !== -1) serverDbs.splice(idx, 1);
      return res.status(204).send();
    }
  }

  // 9. BACKUP ENDPOINTS
  if (subPath.startsWith('/backups')) {
    const backupAction = subPath.replace('/backups', '');
    const serverBackups = mockStorage.backups[id] || (mockStorage.backups[id] = []);

    // GET /backups
    if (method === 'GET' && (backupAction === '' || backupAction === '/')) {
      return res.json({
        object: 'list',
        data: serverBackups
      });
    }

    // POST /backups -> create backup
    if (method === 'POST' && (backupAction === '' || backupAction === '/')) {
      const { name = `Backup-${new Date().toLocaleDateString()}`, is_locked = false, ignored = '' } = req.body || {};
      const newBackup = {
        object: 'server_backup',
        attributes: {
          uuid: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          name,
          ignored_files: ignored ? ignored.split('\n').filter(Boolean) : [],
          sha256_hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
          bytes: 495810200,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          is_successful: true,
          is_locked: !!is_locked
        }
      };
      serverBackups.unshift(newBackup);
      return res.json(newBackup);
    }

    // GET /backups/:uuid/download
    const dlMatch = backupAction.match(/^\/([^\/]+)\/download$/);
    if (method === 'GET' && dlMatch) {
      return res.json({
        object: 'signed_url',
        attributes: {
          url: `https://mock-wings.domain/download/backup/${dlMatch[1]}.tar.gz`
        }
      });
    }

    // POST /backups/:uuid/restore
    const restoreMatch = backupAction.match(/^\/([^\/]+)\/restore$/);
    if (method === 'POST' && restoreMatch) {
      return res.status(204).send();
    }

    // POST /backups/:uuid/lock
    const lockMatch = backupAction.match(/^\/([^\/]+)\/lock$/);
    if (method === 'POST' && lockMatch) {
      const b = serverBackups.find(x => x.attributes.uuid === lockMatch[1]);
      if (b) {
        b.attributes.is_locked = !b.attributes.is_locked;
        return res.json(b);
      }
      return res.status(404).json({ error: 'Backup not found' });
    }

    // DELETE /backups/:uuid
    const delMatch = backupAction.match(/^\/([^\/]+)$/);
    if (method === 'DELETE' && delMatch) {
      const idx = serverBackups.findIndex(x => x.attributes.uuid === delMatch[1]);
      if (idx !== -1) serverBackups.splice(idx, 1);
      return res.status(204).send();
    }
  }

  // 10. SCHEDULE ENDPOINTS
  if (subPath.startsWith('/schedules')) {
    const schedAction = subPath.replace('/schedules', '');
    const serverScheds = mockStorage.schedules[id] || (mockStorage.schedules[id] = []);

    // GET /schedules
    if (method === 'GET' && (schedAction === '' || schedAction === '/')) {
      return res.json({
        object: 'list',
        data: serverScheds
      });
    }

    // POST /schedules -> create schedule
    if (method === 'POST' && (schedAction === '' || schedAction === '/')) {
      const { name = 'New Schedule', cron = {}, is_active = true } = req.body || {};
      const newSched = {
        object: 'server_schedule',
        attributes: {
          id: Date.now(),
          name,
          cron: {
            minute: cron.minute || '0',
            hour: cron.hour || '*',
            day_of_month: cron.day_of_month || '*',
            month: cron.month || '*',
            day_of_week: cron.day_of_week || '*'
          },
          is_active: is_active !== false,
          is_processing: false,
          last_run_at: null,
          next_run_at: new Date(Date.now() + 3600000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          relationships: {
            tasks: { data: [] }
          }
        }
      };
      serverScheds.push(newSched);
      return res.json(newSched);
    }

    // POST /schedules/:id/execute
    const execMatch = schedAction.match(/^\/([^\/]+)\/execute$/);
    if (method === 'POST' && execMatch) {
      const s = serverScheds.find(x => String(x.attributes.id) === execMatch[1]);
      if (s) {
        s.attributes.last_run_at = new Date().toISOString();
        return res.status(204).send();
      }
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // POST /schedules/:id/tasks
    const taskMatch = schedAction.match(/^\/([^\/]+)\/tasks$/);
    if (method === 'POST' && taskMatch) {
      const s = serverScheds.find(x => String(x.attributes.id) === taskMatch[1]);
      if (s) {
        const { action = 'command', payload = '', time_offset = 0 } = req.body || {};
        const newTask = {
          object: 'schedule_task',
          attributes: {
            id: Date.now(),
            sequence_id: (s.attributes.relationships.tasks.data.length + 1),
            action,
            payload,
            time_offset,
            is_queued: false
          }
        };
        s.attributes.relationships.tasks.data.push(newTask);
        return res.json(newTask);
      }
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // DELETE /schedules/:id
    const delMatch = schedAction.match(/^\/([^\/]+)$/);
    if (method === 'DELETE' && delMatch) {
      const idx = serverScheds.findIndex(x => String(x.attributes.id) === delMatch[1]);
      if (idx !== -1) serverScheds.splice(idx, 1);
      return res.status(204).send();
    }
  }

  return res.status(404).json({ error: 'Mock endpoint not implemented' });
}

/**
 * Handle Simulated Wings WebSocket connection for Demo Mode
 */
function handleMockWebSocket(ws, serverId = 'b3c8f10a') {
  const server = mockServers.find(s => s.attributes.identifier === serverId) || mockServers[0];
  const id = server.attributes.identifier;
  const state = serverStates[id] || (serverStates[id] = { status: 'running', cpu: 18.2, memoryBytes: 1800000000, memoryLimitBytes: server.attributes.limits.memory * 1024 * 1024, diskBytes: 8500000000, networkRx: 1000000, networkTx: 2000000, uptime: 100000 });

  let statsInterval = null;

  function sendEvent(event, args = []) {
    if (ws.readyState === 1 /* OPEN */) {
      ws.send(JSON.stringify({ event, args }));
    }
  }

  function sendConsole(line) {
    sendEvent('console output', [`${line}\r\n`]);
  }

  function emitBootSequence() {
    state.status = 'starting';
    sendEvent('status', ['starting']);
    sendConsole('\x1b[36m[Pterodactyl Daemon]\x1b[0m Checking server disk space and dependencies...');
    sendConsole('\x1b[36m[Pterodactyl Daemon]\x1b[0m Initializing container environment (Java 17 OpenJDK)...');
    
    setTimeout(() => {
      sendConsole('\x1b[32m[Server thread/INFO]\x1b[0m: Starting minecraft server version 1.20.4 (Paper git-Paper-497)');
      sendConsole('\x1b[32m[Server thread/INFO]\x1b[0m: Loading properties and eula.txt');
      sendConsole('\x1b[32m[Server thread/INFO]\x1b[0m: Default game type: SURVIVAL');
      sendConsole('\x1b[33m[Server thread/INFO]\x1b[0m: [EssentialsX] Enabling EssentialsX v2.20.1');
      sendConsole('\x1b[33m[Server thread/INFO]\x1b[0m: [LuckPerms] Enabling LuckPerms v5.4.102');
      sendConsole('\x1b[33m[Server thread/INFO]\x1b[0m: [CoreProtect] Enabling CoreProtect v22.2');
    }, 800);

    setTimeout(() => {
      sendConsole('\x1b[32m[Server thread/INFO]\x1b[0m: Preparing level "world"');
      sendConsole('\x1b[32m[Server thread/INFO]\x1b[0m: Preparing spawn area: 100%');
      sendConsole('\x1b[1;32m[Server thread/INFO]\x1b[0m: \x1b[1mDone (3.842s)! For help, type "help"\x1b[0m');
      state.status = 'running';
      sendEvent('status', ['running']);
    }, 2200);
  }

  function emitShutdownSequence() {
    state.status = 'stopping';
    sendEvent('status', ['stopping']);
    sendConsole('\x1b[33m[Server thread/INFO]\x1b[0m: Stopping server...');
    sendConsole('\x1b[33m[Server thread/INFO]\x1b[0m: Saving players...');
    sendConsole('\x1b[33m[Server thread/INFO]\x1b[0m: Saving worlds...');
    sendConsole('\x1b[33m[Server thread/INFO]\x1b[0m: Disabling plugins (LuckPerms, EssentialsX, CoreProtect)...');
    
    setTimeout(() => {
      sendConsole('\x1b[31m[Server thread/INFO]\x1b[0m: Server shutdown complete.');
      sendConsole('\x1b[36m[Pterodactyl Daemon]\x1b[0m Server process stopped with exit code 0.');
      state.status = 'offline';
      sendEvent('status', ['offline']);
    }, 1500);
  }

  function startStatsEmitter() {
    if (statsInterval) clearInterval(statsInterval);
    statsInterval = setInterval(() => {
      if (ws.readyState !== 1) {
        clearInterval(statsInterval);
        return;
      }
      
      if (state.status === 'running') {
        // Natural fluctuations
        const cpuVariation = (Math.random() * 6 - 3);
        state.cpu = Math.max(2.1, Math.min(195.0, +(state.cpu + cpuVariation).toFixed(1)));
        
        const memVariation = Math.floor(Math.random() * 8000000 - 4000000);
        state.memoryBytes = Math.max(400000000, Math.min(state.memoryLimitBytes * 0.95, state.memoryBytes + memVariation));
        
        state.networkRx += Math.floor(Math.random() * 45000 + 5000);
        state.networkTx += Math.floor(Math.random() * 90000 + 10000);
        state.uptime += 1000;
      }

      const statsPayload = {
        memory_bytes: state.status === 'running' ? state.memoryBytes : 0,
        memory_limit_bytes: state.memoryLimitBytes,
        cpu_absolute: state.status === 'running' ? state.cpu : 0,
        network: {
          rx_bytes: state.networkRx,
          tx_bytes: state.networkTx
        },
        state: state.status,
        disk_bytes: state.diskBytes
      };

      sendEvent('stats', [JSON.stringify(statsPayload)]);
    }, 1000);
  }

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const event = msg.event;
      const args = msg.args || [];

      // Auth handshake
      if (event === 'auth') {
        sendEvent('auth success');
        sendEvent('status', [state.status]);
        
        // Initial console banner & logs
        sendConsole('\x1b[1;36m=====================================================\x1b[0m');
        sendConsole(`\x1b[1;32m Connected to Wings Daemon (Virtual Node: ${server.attributes.node})\x1b[0m`);
        sendConsole(`\x1b[37m Server: ${server.attributes.name} [${id}]\x1b[0m`);
        sendConsole(`\x1b[37m Mode: Realtime WebSocket Console (xterm.js)\x1b[0m`);
        sendConsole('\x1b[1;36m=====================================================\x1b[0m');
        sendConsole(`[Server] Current status: \x1b[1;32m${state.status.toUpperCase()}\x1b[0m`);
        if (state.status === 'running') {
          sendConsole('[Server] Type \x1b[33mhelp\x1b[0m for available in-game commands.');
        }

        startStatsEmitter();
      }

      // Request logs
      if (event === 'send logs') {
        sendConsole('\x1b[90m[Server thread/INFO]: [Previous log history cached]\x1b[0m');
        sendConsole('\x1b[32m[Server thread/INFO]: Server is running with TPS: 20.0 (1m), 20.0 (5m)\x1b[0m');
      }

      // Send Command
      if (event === 'send command') {
        const cmd = (args[0] || '').trim();
        if (!cmd) return;

        sendConsole(`\x1b[37m> ${cmd}\x1b[0m`);

        if (state.status !== 'running') {
          sendConsole('\x1b[31m[Server Error]: Server is not running. Cannot process commands.\x1b[0m');
          return;
        }

        const lower = cmd.toLowerCase();
        if (lower === 'help') {
          sendConsole('\x1b[33m--- Available Commands ---\x1b[0m');
          sendConsole(' \x1b[36msay <message>\x1b[0m  - Broadcast a message to the server');
          sendConsole(' \x1b[36mlist\x1b[0m           - Show online players');
          sendConsole(' \x1b[36mtps\x1b[0m            - Show current server ticks per second');
          sendConsole(' \x1b[36mop <user>\x1b[0m      - Grant operator permissions');
          sendConsole(' \x1b[36mstatus\x1b[0m         - Display memory & JVM health');
          sendConsole(' \x1b[36mstop\x1b[0m           - Gracefully stop the server');
          sendConsole(' \x1b[36mrestart\x1b[0m        - Reboot server instance');
        } else if (lower.startsWith('say ')) {
          const text = cmd.substring(4);
          sendConsole(`\x1b[35m[Server thread/INFO] [Server]: ${text}\x1b[0m`);
        } else if (lower === 'list') {
          sendConsole(`\x1b[32m[Server thread/INFO]: There are 3 of a max 20 players online:\x1b[0m`);
          sendConsole('\x1b[37mSteve, Alex, Notch\x1b[0m');
        } else if (lower === 'tps') {
          sendConsole('\x1b[32m[Server thread/INFO]: TPS from last 1m, 5m, 15m: 20.0, 20.0, 20.0\x1b[0m');
          sendConsole(`\x1b[32m[Server thread/INFO]: MSPT: 14.2ms / Tick (Healthy)\x1b[0m`);
        } else if (lower.startsWith('op ')) {
          const user = cmd.substring(3).trim();
          sendConsole(`\x1b[32m[Server thread/INFO]: Made ${user} a server operator\x1b[0m`);
        } else if (lower === 'status') {
          const usedMb = Math.round(state.memoryBytes / 1024 / 1024);
          const maxMb = Math.round(state.memoryLimitBytes / 1024 / 1024);
          sendConsole(`\x1b[36m[System Status]\x1b[0m Memory: ${usedMb}MB / ${maxMb}MB | CPU: ${state.cpu}% | Disk: 8.5GB`);
        } else if (lower === 'stop') {
          emitShutdownSequence();
        } else if (lower === 'restart') {
          emitShutdownSequence();
          setTimeout(() => emitBootSequence(), 2500);
        } else {
          sendConsole(`\x1b[32m[Server thread/INFO]: Executed command: "${cmd}"\x1b[0m`);
        }
      }

      // Set State (Power Action)
      if (event === 'set state') {
        const signal = args[0];
        if (signal === 'start') {
          if (state.status === 'running') {
            sendConsole('\x1b[33m[Pterodactyl Daemon]\x1b[0m Server is already running.');
          } else {
            emitBootSequence();
          }
        } else if (signal === 'stop') {
          if (state.status === 'offline') {
            sendConsole('\x1b[33m[Pterodactyl Daemon]\x1b[0m Server is already offline.');
          } else {
            emitShutdownSequence();
          }
        } else if (signal === 'restart') {
          if (state.status === 'running') {
            emitShutdownSequence();
            setTimeout(() => emitBootSequence(), 2500);
          } else {
            emitBootSequence();
          }
        } else if (signal === 'kill') {
          state.status = 'offline';
          sendEvent('status', ['offline']);
          sendConsole('\x1b[1;31m[Pterodactyl Daemon] SIGKILL sent! Process forcefully terminated.\x1b[0m');
        }
      }
    } catch (e) {
      console.error('Error parsing mock WS message:', e);
    }
  });

  ws.on('close', () => {
    if (statsInterval) clearInterval(statsInterval);
  });
}

module.exports = {
  mockServers,
  handleMockApi,
  handleMockWebSocket
};
