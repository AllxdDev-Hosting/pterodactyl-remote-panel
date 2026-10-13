# 🦅 Pterodactyl Remote Client Panel

[![Node.js Version](https://img.shields.io/badge/Node.js-24.x%20LTS-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vercel Ready](https://img.shields.io/badge/Vercel-Serverless%20Ready-black.svg)](https://vercel.com/)
[![Security](https://img.shields.io/badge/Security-AES--256--GCM-red.svg)](#-arsitektur--keamanan)
[![Author](https://img.shields.io/badge/Author-AllxdDev-cyan.svg)](https://github.com/AllxdDev)

**Pterodactyl Remote Client Panel** adalah dashboard web alternatif mandiri (*remote client panel*) berbasis **Node.js Express** dan **Single Page Application (SPA)** yang memungkinkan pengguna mengelola server Pterodactyl mereka secara cepat, aman, dan langsung menggunakan **Personal Client API Key**.

Aplikasi ini didesain dengan arsitektur **Stateless & Zero-Database**, sehingga dapat dijalankan baik di server lokal (Node.js) maupun dideploy langsung ke platform cloud serverless seperti **Vercel** tanpa memerlukan database terpisah.

---

## 📑 Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Arsitektur & Keamanan](#-arsitektur--keamanan)
- [Persyaratan Sistem](#-persyaratan-sistem)
- [Variabel Lingkungan (.env)](#-variabel-lingkungan-env)
- [Instalasi & Penggunaan Lokal](#-instalasi--penggunaan-lokal)
- [Konfigurasi Wings Daemon (Penting untuk WebSocket / Console)](#-konfigurasi-wings-daemon-penting-untuk-websocket--console)
- [Panduan Deploy ke Vercel](#-panduan-deploy-ke-vercel)
- [Struktur Direktori](#-struktur-direktori)
- [Pengujian (Testing)](#-pengujian-testing)
- [Lisensi & Kredit](#-lisensi--kredit)

---

## ✨ Fitur Utama

- **Otentikasi Mandiri per Pengguna**:
  - Login menggunakan **Client API Key** pribadi dari panel utama (menu *Account Settings → API Credentials*).
  - Tidak menyimpan database akun atau kata sandi; hak akses server mengikuti izin akun Pterodactyl masing-masing.
- **Konsol Realtime & Wings WebSocket**:
  - Menghubungkan terminal xterm.js langsung ke daemon Wings via koneksi aman WSS (`wss://`).
  - Eksekusi perintah server instan dan streaming log real-time.
- **Kontrol Daya Server Penuh**:
  - *Start*, *Restart*, *Stop (Graceful)*, dan *Kill (Force Terminate)*.
- **Monitoring Telemetry Live**:
  - Grafik utilisasi CPU, Memory (RAM), Disk Space, dan Network I/O dengan polling statistik aktif.
- **File Manager Lengkap**:
  - Navigasi folder & file server.
  - Editor teks bawaan dengan modal penampil berkas.
  - Pembuatan file baru, pembuatan folder, ganti nama (rename), ubah permissions (chmod), kompres (zip/tar), dan ekstrak (unarchive).
  - Unggah (upload) dan unduh (download) file langsung menggunakan URL bertanda tangan aman (*signed URLs*) dari Wings.
- **Manajemen Database**:
  - Melihat kredensial database server, host koneksi, dan port.
  - Fitur rotasi password database dan pembuatan database baru sesuai batas alokasi.
- **Manajemen Backup**:
  - Membuat cadangan instan dengan opsi ignore rules.
  - Unduh backup via signed URL, restore ke server, mengunci (lock) backup, dan hapus backup.
- **Jadwal Otomatis (Schedules / Cron)**:
  - Membuat dan mengatur tugas cron otomatis (backup rutin, power toggle, perintah konsol).
  - Memicu eksekusi jadwal secara manual (*trigger now*).
- **Alokasi Jaringan & Subuser**:
  - Melihat IP/port alokasi server dan daftar subuser yang memiliki akses ke server.

---

## 🔒 Arsitektur & Keamanan

Aplikasi ini dibangun dengan standar keamanan ketat:

1. **Stateless Session dengan Enkripsi AES-256-GCM**:
   - API Key pengguna dienkripsi menggunakan algoritma `aes-256-gcm` dengan initialization vector (IV) unik dan authentication tag.
   - Disimpan di browser dalam bentuk cookie `HttpOnly`, `SameSite=Strict` dengan masa kedaluwarsa 8 jam.
   - Pada environment produksi (HTTPS / Vercel), cookie otomatis diproteksi dengan flag `Secure` dan prefix `__Host-`.
2. **Perlindungan Terhadap Serangan CSRF**:
   - Semua mutasi HTTP (POST, PUT, DELETE) mewajibkan verifikasi header `X-CSRF-Protection` dan validasi `Origin` / `Sec-Fetch-Site`.
3. **Pencegahan Path Traversal & Reverse Proxy Whitelisting**:
   - Proxy backend hanya meneruskan request ke rute Client API yang telah diizinkan secara eksplisit (`proxyRoute`).
   - Mencegah manipulasi rute ke Application API, domain pihak ketiga, atau path rahasia.
4. **Direct WSS & Signed URLs (Tanpa Beban Server Proxy)**:
   - File biner besar (upload/download) dan koneksi terminal WebSocket dilakukan langsung antara browser pengguna dan daemon Wings, menjaga beban server remote tetap ringan dan bebas limit timeout.

---

## 💻 Persyaratan Sistem

- **Node.js**: Versi `24.x LTS` atau yang lebih baru.
- **NPM**: Versi `10.x` atau yang lebih baru.
- **Panel Pterodactyl**: Akses ke panel Pterodactyl aktif dengan Client API (v1.x).
- **Wings Daemon**: Node Wings dengan sertifikat SSL/TLS valid (`wss://`).

---

## ⚙️ Variabel Lingkungan (.env)

Buat file `.env` di root direktori proyek (gunakan `.env.example` sebagai referensi):

| Variabel | Tipe | Wajib | Keterangan | Default |
| :--- | :--- | :--- | :--- | :--- |
| `SESSION_SECRET` | String | **Ya** | Kunci rahasia minimal 32 byte (64 karakter hex) untuk enkripsi sesi AES-256-GCM. | *Wajib diisi sendiri* |
| `PTERODACTYL_URL` | URL | **Ya** | URL panel Pterodactyl upstream (wajib format HTTPS tanpa slash akhir). | `https://panel.allxddev.com` |
| `PORT` | Number | Tidak | Port listener server Express lokal. | `3000` |

### Cara Membuat `SESSION_SECRET` yang Aman:

Jalankan salah satu perintah berikut di terminal Anda:

**Menggunakan Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Menggunakan PowerShell:**
```powershell
[BitConverter]::ToString([Security.Cryptography.RandomNumberGenerator]::Create().GetBytes(32)).Replace("-","").ToLower()
```

**Menggunakan OpenSSL / Linux Bash:**
```bash
openssl rand -hex 32
```

---

## 🚀 Instalasi & Penggunaan Lokal

1. **Clone repository ini:**
   ```bash
   git clone https://github.com/AllxdDev-Hosting/pterodactyl-remote-panel.git
   cd pterodactyl-remote-panel
   ```

2. **Install dependensi:**
   ```bash
   npm ci
   ```

3. **Konfigurasi file `.env`:**
   Salin file contoh konfigurasi dan edit nilainya:
   ```bash
   cp .env.example .env
   ```
   Isi `SESSION_SECRET` dan sesuaikan `PTERODACTYL_URL` dengan panel Anda.

4. **Jalankan server aplikasi:**
   ```bash
   npm start
   ```
   Atau untuk mode pengembangan:
   ```bash
   node server.js
   ```

5. **Buka di browser:**
   Akses dashboard melalui alamat: `http://localhost:3000`

---

## ⚡ 1-Line cURL Multi-Tool di VPS (Tinggal Tempel di Terminal)

Semua kebutuhan Pterodactyl Panel (Fitur PLTC, Ganti Domain tanpa reinstall, dan Migrasi VPS tanpa hapus data) disatukan dalam **1 URL / 1 Script**:

### 🔹 Via Raw GitHub:
```bash
bash <(curl -sSL https://raw.githubusercontent.com/AllxdDev-Hosting/pterodactyl-remote-panel/main/instalinvps/installer.sh)
```

**Atau menggunakan pipe langsung:**
```bash
curl -sSL https://raw.githubusercontent.com/AllxdDev-Hosting/pterodactyl-remote-panel/main/instalinvps/installer.sh | bash
```

> **🔑 License Key:** `AllxdClint`  
> **📋 Fitur yang Tersedia dalam 1 URL Ini:**
> 1. **Pasang Fitur PLTC ke Dashboard** (Floating 1-Click Copy & ID Whitelist).
> 2. **Manajemen User ID** (User ID 1 otomatis aktif, tambah & hapus ID izin).
> 3. **Ganti / Ubah Domain Panel** (Tanpa reinstall, otomatis update Nginx, SSL Certbot, & Wings).
> 4. **Migrasi VPS (Pindah VPS)** (Export/Import database & file panel utuh tanpa hapus data).
> 5. **Backup & Restore Lengkap** (Database SQL + File panel terarsip aman).
> 6. **Uninstall & Restore Panel Asli**.

---

## ⚡ Konfigurasi Wings Daemon (Penting untuk WebSocket / Console)

Jika saat membuka konsol server muncul error **`WebSocket connection failed: Error 403`** atau **`Daemon: Connecting...`** yang tidak kunjung terhubung, hal tersebut dikarenakan proteksi **CORS / Allowed Origins** pada Wings Daemon.

Secara default, Wings hanya menerima koneksi WebSocket dari domain panel utama. Ikuti langkah berikut untuk mengizinkan panel remote:

1. **Login SSH ke VPS Node Wings** Anda.
2. Buka file konfigurasi Wings:
   ```bash
   sudo nano /etc/pterodactyl/config.yml
   ```
3. Cari bagian konfigurasi **`allowed_origins:`** dan tambahkan origin URL panel remote Anda (misal `http://localhost:3000` atau domain Vercel Anda):
   ```yaml
   allowed_origins:
     - "https://panel.allxddev.com"
     - "http://localhost:3000"
     # Atau gunakan tanda bintang untuk mengizinkan semua domain:
     - "*"
   ```
4. Simpan file (`Ctrl + O`, tekan `Enter`, lalu `Ctrl + X`).
5. **Restart daemon Wings**:
   ```bash
   sudo systemctl restart wings
   ```

> **Catatan Tambahan untuk Cloudflare:**
> - Jika subdomain Node (`node.panel.allxddev.com`) dipasang di Cloudflare, pastikan DNS record-nya diatur ke mode **DNS Only (ikon awan abu-abu)**, bukan Proxied (awan orange), agar port WebSocket `8080` tidak diblokir.
> - Pastikan port 8080 TCP terbuka di firewall VPS: `sudo ufw allow 8080/tcp`.

---

## ☁️ Panduan Deploy ke Vercel

Proyek ini telah dikonfigurasi secara optimal untuk runtime **Vercel Serverless Functions** melalui `vercel.json` dan handler `api/index.js`.

### Langkah-langkah Deploy:

1. **Push repository ke GitHub / GitLab / Bitbucket**.
2. Buka [Vercel Dashboard](https://vercel.com/dashboard) dan pilih **Add New → Project**.
3. Import repository Anda.
4. Pada bagian **Environment Variables**, tambahkan:
   - `SESSION_SECRET` = *(Hasil random 32 byte hex yang dibuat sebelumnya)*
   - `PTERODACTYL_URL` = `https://panel.allxddev.com` *(Ganti dengan panel Anda)*
5. Klik tombol **Deploy**.
6. Setelah deployment selesai, salin URL domain yang diberikan oleh Vercel (contoh: `https://panel-remote.vercel.app`) dan daftarkan ke `allowed_origins` di konfigurasi Wings VPS Anda.

---

## 📂 Struktur Direktori

```text
├── api/
│   └── index.js              # Entry-point Serverless Function untuk deployment Vercel
├── lib/
│   ├── proxy.js              # Handler reverse proxy, filter rute & validasi akun Client API
│   └── session.js            # Modul enkripsi sesi cookie AES-256-GCM stateless
├── public/
│   ├── css/
│   │   ├── style.css         # Styling antarmuka utama dark theme Pterodactyl
│   │   ├── responsive.css    # Penyesuaian layout layar mobile & tablet
│   │   └── xterm.css         # Styling konsol terminal xterm.js
│   ├── js/
│   │   ├── api.js            # Wrapper komunikasi REST Client API & Session
│   │   ├── app.js            # Router SPA, event listener UI, & controller WebSocket
│   │   ├── terminal.js       # Integrasi konsol xterm.js & command history
│   │   ├── monitoring.js     # Chart telemetri (CPU, RAM, Disk, Net)
│   │   ├── files.js          # File manager & in-browser editor
│   │   ├── database.js       # Modul pengelola database server
│   │   ├── backups.js        # Modul cadangan & pemulihan server
│   │   ├── schedules.js      # Pengatur jadwal otomatis (cron)
│   │   └── serverExtra.js    # Utilitas tambahan server
│   ├── vendor/               # Dependensi frontend lokal (xterm, chart.js, dll.)
│   └── index.html            # Antarmuka SPA lengkap dengan logo resmi Pterodactyl
├── test/
│   └── verify.js             # Automated test suite (keamanan, rute proxy, integritas)
├── .env.example              # Template variabel konfigurasi
├── package.json              # Definisi paket & dependensi Node.js
├── server.js                 # HTTP Server Express untuk mode lokal / VPS
├── vercel.json               # Konfigurasi routing serverless Vercel
└── README.md                 # Dokumentasi lengkap proyek
```

---

## 🧪 Pengujian (Testing)

Proyek ini dilengkapi dengan suite pengujian otomatis menyeluruh untuk memastikan keamanan enkripsi, integritas rute proxy, proteksi CSRF, dan validasi sintaks frontend:

```bash
npm test
```

Hasil pengujian mencakup:
- Enkripsi dan dekripsi sesi AES-256-GCM, pengujian tampering, dan rotasi kunci.
- Pencegahan path traversal dan penolakan endpoint Application API.
- Proteksi CSRF, validasi cookie, dan penanganan kegagalan koneksi upstream.
- Validasi sintaks seluruh file JavaScript frontend dan konfigurasi Vercel.

---

## 📜 Lisensi & Kredit

- **Panel Engine**: Dibuat dan dikembangkan oleh [AllxdDev](https://github.com/AllxdDev).
- **Pterodactyl Software**: Hak cipta logo, merek, dan ekosistem Pterodactyl dimiliki oleh [Pterodactyl Software](https://pterodactyl.io/).
- Dilisensikan di bawah lisensi [MIT](LICENSE).