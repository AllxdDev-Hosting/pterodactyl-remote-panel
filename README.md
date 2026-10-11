# Pterodactyl Remote Control Panel

Sistem remote control mandiri untuk mengelola server **Pterodactyl** langsung dari browser tanpa perlu membuka panel Pterodactyl aslinya.

---

## 🌟 Fitur Utama

1. **Terminal Interaktif Realtime (xterm.js & Wings WebSocket Daemon)**
   - Terhubung langsung ke Wings WebSocket daemon (`/ws`).
   - Dukungan penuh ANSI color, escape codes, keyboard navigation, dan command history (panah Atas/Bawah).
   - FitAddon otomatis menyesuaikan ukuran canvas terminal dengan layar.
   - Command input bar untuk mengirim perintah langsung (`help`, `say`, `list`, `tps`, dll.).

2. **Power Control Remote**
   - **Start**: Menjalankan server yang sedang offline/stopped.
   - **Restart**: Me-reboot server secara langsung dengan stream log Wings realtime.
   - **Stop**: Menghentikan server secara graceful.
   - **Kill**: Force stop / terminasi paksa proses server darurat.

3. **Live Monitoring & Realtime Charts (Chart.js)**
   - Grafik realtime bergeser (sliding window):
     - **CPU Load (%)**
     - **RAM Utilization (MB & %)**
     - **Disk Usage (MB / GB)**
     - **Dual Network Traffic (Rx & Tx KB/s)**
   - Bar meter dan indikator status interaktif di panel terminal dan tab monitoring.

4. **Remote File Manager**
   - Penjelajahan direktori hierarkis (Navigasi breadcrumb dan folder up).
   - Built-in Code Editor Modal: Buka dan edit file konfigurasi (`server.properties`, `.env`, `spigot.yml`, dll.) secara langsung.
   - Download file via proxy streaming.
   - Upload file baru, buat file kosong, buat direktori baru, rename file, dan hapus batch/individual.

5. **Remote Database Manager**
   - Tampilkan seluruh database MySQL/MariaDB yang dialokasikan ke server.
   - Host, port, username, dan nama database.
   - Fitur Reveal/Hide password dan tombol cepat Copy Password.
   - Tombol Rotate / Reset Password database jarak jauh.

6. **Remote Backup Manager**
   - Buat snapshot backup server baru secara remote.
   - Indikator status (Completed, Failed, In-Progress) dan ukuran backup.
   - Download file arsip backup (.tar.gz).
   - Tombol Restore backup dan Lock/Unlock backup dari penghapusan otomatis.

7. **Remote Schedule Manager**
   - Daftar jadwal otomatis (Cron jobs) untuk backup harian, restart berkala, atau command otomatis.
   - Tombol trigger **"Run Now"** untuk mengeksekusi schedule secara langsung.
   - Status badge aktif/non-aktif beserta hitungan task.

8. **Internal Client API & Wings Proxy (Zero CORS & SSL Bypass)**
   - Backend Express 5 bertindak sebagai reverse proxy internal (`/api/proxy/*`).
   - Mencegah error CORS browser saat mengakses domain Pterodactyl yang berbeda.
   - Menghindari pemblokiran sertifikat SSL self-signed pada Wings daemon daemon node.

9. **Built-in Offline Demo Simulator**
   - Siap dipakai seketika tanpa memerlukan server Pterodactyl aktif untuk keperluan presentasi, testing, atau pengembangan.
   - Menyertakan 3 simulasi server realistis:
     - **Minecraft Survival SMP** (PaperMC)
     - **Discord Bot Cluster** (Node.js)
     - **Rust Dedicated Server**
   - Simulasi log daemon Wings realtime, telemetry stats 1-detik, dan command handling.

---

## 🚀 Cara Menjalankan

### 1. Prasyarat
- **Node.js**: v18.0.0 atau lebih baru (Diuji di Node.js v24).
- **NPM**: bawaan Node.js.

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Menjalankan Server
```bash
npm start
```
Server akan aktif di: **`http://localhost:3000`**

### 4. Menjalankan Unit & Integration Test
```bash
npm test
```

---

## ⚙️ Menghubungkan ke Panel Pterodactyl Asli

1. Buka browser di `http://localhost:3000`.
2. Klik tombol **Settings** (ikon gerigi) di pojok kanan atas.
3. Masukkan konfigurasi Pterodactyl Anda:
   - **Panel URL**: URL panel Pterodactyl Anda, contoh: `https://panel.yourdomain.com`
   - **Client API Key**: API Key akun Anda yang berawalan `ptlc_` (didapatkan di Panel Pterodactyl asli → *Account Settings* → *API Credentials*).
   - Hapus centang pada *Enable Demo Simulator (Offline Mode)* jika ingin langsung terhubung ke server asli.
4. Klik **Save & Connect**. Panel akan langsung memuat daftar server Anda, menghubungkan Wings daemon, dan menampilkan terminal serta resource secara realtime.

---

## 📁 Struktur Proyek

```
panel/
├── lib/
│   ├── mockDaemon.js       # Simulator offline untuk Wings daemon, logs, telemetry & REST
│   ├── proxy.js            # Internal Pterodactyl Client API proxy & streaming
│   └── wingsBridge.js      # Bi-directional WebSocket bridge ke Wings daemon
├── public/
│   ├── css/
│   │   ├── style.css       # Tema Cyber Dark, responsive grid, glassmorphism
│   │   └── xterm.css       # Styling resmi xterm.js
│   ├── js/
│   │   ├── api.js          # Client-side API wrapper
│   │   ├── app.js          # Main UI controller & state management
│   │   ├── backups.js      # Remote Backup management module
│   │   ├── database.js     # Remote Database management module
│   │   ├── files.js        # Remote File Manager & code editor modal
│   │   ├── monitoring.js   # Realtime Chart.js graphs controller
│   │   ├── schedules.js    # Remote Schedules & cron trigger controller
│   │   └── terminal.js     # Interactive xterm.js controller & Wings bridge
│   ├── vendor/
│   │   ├── chart.umd.min.js
│   │   ├── xterm-addon-fit.js
│   │   ├── xterm-addon-web-links.js
│   │   └── xterm.js
│   └── index.html          # Single Page Application layout
├── test/
│   └── verify.js           # Automated end-to-end integration test suite
├── package.json
├── server.js               # Entry point Express 5 & WebSocket server
└── README.md
```

---

## 🔒 Keamanan
- Kredensial Client API Key (`ptlc_...`) hanya dikirim melalui header internal dari server proxy ke server Pterodactyl Anda.
- Mengeliminasi CORS issues dan menyembunyikan IP node Wings asli dari browser klien jika diinginkan.
