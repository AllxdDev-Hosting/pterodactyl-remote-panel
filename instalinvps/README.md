# 🚀 Installer & Manager Pterodactyl by AllxdDev

Folder ini berisi skrip otomatis untuk **Pterodactyl Panel** dan **Remote Client Panel** by AllxdDev, dilengkapi dengan proteksi lisensi dan kontrol hak akses User ID.

---

## ⚡ 1-Line Command (Tinggal Copy-Paste ke Terminal VPS)

Cukup salin dan tempel salah satu baris perintah berikut di terminal SSH VPS Pterodactyl Anda:

### 🔹 Pilihan 1: Via Raw GitHub (Rekomendasi Utama)

```bash
bash <(curl -sSL https://raw.githubusercontent.com/AllxdDev-Hosting/pterodactyl-remote-panel/main/instalinvps/installer.sh)
```

Atau jika menggunakan pipe langsung:

```bash
curl -sSL https://raw.githubusercontent.com/AllxdDev-Hosting/pterodactyl-remote-panel/main/instalinvps/installer.sh | bash
```

---

### 🔹 Pilihan 2: Via Domain Panel Anda Sendiri (Jika Panel Remote Sudah Aktif)

Panel Remote AllxdDev ini sudah otomatis menyediakan endpoint skrip bash:

```bash
bash <(curl -sSL https://domain-panel-anda.com/installer.sh)
```

---

## 🔑 Lisensi Installer

Saat menjalankan `installer.sh`, Anda akan diminta memasukkan License Key:

```text
AllxdClint
```

---

## ⚡ Fitur Utama All-in-One Multi-Tool (`installer.sh`)

Semua fitur berikut tergabung dalam **1 URL / 1 Script** tanpa perlu install terpisah:

1. **📦 Pasang / Install Fitur PLTC ke Pterodactyl Panel**:
   - Memasang tombol mengambang (_floating button_) **`🔑 Salin PLTC`** dan dialog modal modern langsung di dashboard Pterodactyl pengguna (`resources/views/templates/base.blade.php`).
   - Menyediakan endpoint otomatis `/allxd/pltc-action` untuk mengambil dan men-generate Client API Key tanpa ribet.
   - Fitur **1-Click Copy** untuk langsung menyalin token ke clipboard.
   - Pilihan **🔄 Buat Kunci Baru** untuk me-refresh API Key secara instan.

2. **👑 Pembatasan Hak Akses Khusus ID (Security)**:
   - **User ID 1 (Owner)**: Otomatis selalu diizinkan melihat dan menyalin PLTC secara default.
   - **User ID Lain**: Tombol dan modal PLTC **tidak akan tampil sama sekali** di akun user biasa kecuali jika ID mereka telah didaftarkan melalui menu **Tambah User ID**.

3. **➕ Tambah User ID (Add ID)**:
   - Menambahkan ID pengguna baru ke daftar izin akses PLTC.

4. **➖ Hapus User ID (Delete ID)**:
   - Menghapus ID pengguna dari daftar izin (User ID 1 dilindungi dan tidak dapat dihapus).

5. **📋 Lihat Daftar User ID (List ID)**:
   - Menampilkan seluruh ID pengguna yang saat ini diizinkan melihat/menyalin PLTC.

6. **🌐 Ganti / Ubah Domain Panel (Tanpa Reinstall)**:
   - Mengubah domain Pterodactyl tanpa perlu menginstal ulang panel dari awal.
   - Otomatis memperbarui `APP_URL` di `.env`, blok `server_name` Nginx, konfigurasi `allowed_origins` Wings, dan menerbitkan sertifikat SSL gratis (Let's Encrypt / Certbot).
   - Seluruh server, database, dan data pengguna tetap aman 100%.

7. **🚀 Migrasi VPS (Pindah VPS Tanpa Hapus / Ubah Data)**:
   - **Export di VPS Lama**: Mendump database MySQL secara otomatis, mengarsipkan seluruh `/var/www/pterodactyl` (termasuk `.env`, encryption key, storage, OAuth), konfigurasi Nginx, dan Wings.
   - **Direct Transfer via SCP**: Mengirim arsip migrasi langsung dari VPS Lama ke VPS Baru hanya dengan memasukkan IP & Port SSH VPS Baru.
   - **Web Download Server**: Opsi menjalankan HTTP server sementara di port `8888` agar file backup mudah di-`wget` dari VPS baru.
   - **Import / Restore di VPS Baru**: Mengimpor database, menyesuaikan user MySQL otomatis sesuai `.env`, mengatur hak akses `www-data`, mengaktifkan queue worker `pteroq`, dan membersihkan cache. Semua data, server, node, dan pengguna pulih identik 100%.

8. **📦 Backup Lengkap Panel**:
   - Mencadangkan database SQL, berkas konfigurasi `.env`, dan seluruh file panel ke arsip `.tar.gz` di `/var/ptero_backups/`.

9. **♻️ Restore Panel dari Backup**:
   - Memulihkan panel secara utuh dari file lokal maupun tautan URL download.

10. **🛡️ Proteksi Anti-Rusuh Pterodactyl (Fleksibel & Granular)**:
   - **Fitur Pasang Proteksi**:
     - **Pasang SEMUA 11 Modul Sekaligus**: 1-Click instalasi proteksi menyeluruh.
     - **Pasang SEMUA KECUALI Modul Tertentu**: Pasang seluruh proteksi namun dapat mengecualikan modul tertentu yang tidak diinginkan (contoh: kecualikan modul 10 greeting toast).
     - **Pasang Salah Satu / Beberapa Modul Pilihan**: Pilih secara spesifik hanya modul yang ingin dipasang (contoh: hanya modul 1 dan 2).
   - **Fitur Copot / Delete / Restore ke File Asli**:
     - **Copot SEMUA Proteksi**: Kembalikan seluruh 11 berkas panel ke file asli Pterodactyl.
     - **Copot SEMUA KECUALI Modul Tertentu**: Restore seluruh file ke asli namun modul tertentu tetap dipertahankan terpasang.
     - **Copot Salah Satu / Pilihan Tertentu Saja**: Hapus proteksi pada modul tertentu saja tanpa menyentuh modul lainnya.
   - **11 Modul Proteksi**:
     - **Modul 1**: Anti Delete Server (`ServerDeletionService.php`) — Mengunci penghapusan server hanya untuk Admin User ID 1.
     - **Modul 2**: Anti Hapus & Ubah Data User (`UserController.php`) — Mencegah hacker/admin nakal mengubah email, password, root admin, atau menghapus user.
     - **Modul 3**: Anti Akses & Hapus Location (`LocationController.php`) — Melindungi lokasi node dari intipan & penghapusan.
     - **Modul 4 & 11**: Anti Akses, Ubah & Hapus Nodes (`NodeController.php` & `NodesController.php`) — Melindungi konfigurasi node server.
     - **Modul 5**: Anti Akses & Ubah Nest/Egg (`NestController.php`) — Mengamankan konfigurasi egg dan nest.
     - **Modul 6**: Anti Akses Settings Panel (`IndexController.php`) — Mengunci menu pengaturan panel agar tidak bisa diubah sembarangan.
     - **Modul 7 & 8**: Proteksi Client File & Server API Controller — Melindungi akses file dan kontrol server dari sisi Client API.
     - **Modul 9**: Anti Modifikasi Detail Server (`DetailsModificationService.php`) — Mengunci perubahan nama dan rincian server hanya untuk Admin ID 1.
     - **Modul 10**: Floating Welcome Notification (`core.blade.php`) — Notifikasi sambutan modern di dashboard.
   - Dilengkapi sistem auto-backup ke `/var/ptero_antirusuh_backups/` dan pembersihan cache otomatis (`artisan optimize:clear`).

11. **🔄 Menu Cepat Copot / Restore Proteksi Anti-Rusuh**:
   - Menu akses cepat untuk merestore proteksi (Semua, dengan Pengecualian, atau Modul Pilihan) langsung ke file asli Pterodactyl.

12. **🗑️ Uninstall / Restore Panel Asli (Cabut PLTC)**:
   - Menghapus seluruh modifikasi PLTC dan mengembalikan file Blade serta Route Pterodactyl ke kondisi semula secara bersih.

---

## 💻 Cara Menjalankan di VPS Pterodactyl

1. Masuk ke direktori `instalinvps`:
   ```bash
   cd instalinvps
   ```
2. Berikan izin eksekusi pada skrip:
   ```bash
   chmod +x installer.sh install.sh
   ```
3. Jalankan installer:
   ```bash
   sudo ./installer.sh
   ```
4. Masukkan lisensi: **`AllxdClint`**
5. Pilih menu yang diinginkan:
   - **`[1]`** untuk memasang fitur PLTC ke Pterodactyl Panel.
   - **`[2]`** untuk menambahkan ID user baru.
   - **`[3]`** untuk menghapus ID user dari daftar izin.
   - **`[4]`** untuk melihat daftar ID yang diizinkan.
   - **`[5]`** untuk mencopot/uninstall fitur dan merestore panel.
   - **`[0]`** untuk keluar.

---

## 🌐 Menjalankan Remote Client Panel Standalone di VPS

Jika Anda juga ingin memasang **Remote Client Panel** (Node.js Express) di VPS yang sama atau terpisah:

```bash
sudo ./install.sh
```

Pilih opsi `[2]` untuk menginstal runtime Node.js 24, Systemd Service, Nginx Reverse Proxy, dan SSL Certbot secara otomatis.
