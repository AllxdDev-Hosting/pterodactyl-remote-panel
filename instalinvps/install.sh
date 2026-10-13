#!/usr/bin/env bash
# ==============================================================================
#  Script Auto Installer: Pterodactyl Remote Client Panel by AllxdDev
#  Target OS: Ubuntu 22.04 / 24.04 LTS & Debian 11 / 12
# ==============================================================================

set -e

# Dukung eksekusi langsung via pipe atau curl (curl -sSL ... | bash)
if [ ! -t 0 ] && [ -e /dev/tty ]; then
  exec < /dev/tty
fi

# Warna Terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}     🦅 Auto Installer: Pterodactyl Remote Panel by AllxdDev       ${NC}"
echo -e "${CYAN}====================================================================${NC}"

# 1. Cek Root Privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Jalankan script ini sebagai user root! (sudo bash install.sh)${NC}"
  exit 1
fi

echo -e "\nPilih jenis instalasi yang ingin dijalankan:"
echo -e " ${BOLD:-}[1]${NC} Jalankan Pterodactyl All-in-One Multi-Tool (PLTC, Ubah Domain, Migrasi VPS, Backup/Restore)"
echo -e " ${BOLD:-}[2]${NC} Install Pterodactyl Remote Client Panel di VPS ini"
read -rp "Pilihan [1/2] (default: 1): " installer_type
installer_type=${installer_type:-1}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$installer_type" = "1" ]; then
  if [ -f "$SCRIPT_DIR/installer.sh" ]; then
    bash "$SCRIPT_DIR/installer.sh"
    exit 0
  else
    echo -e "${RED}[ERROR] File installer.sh tidak ditemukan!${NC}"
    exit 1
  fi
fi

INSTALL_DIR="/var/www/pterodactyl-panel"

echo -e "\n${YELLOW}[1/7] Memperbarui sistem dan menginstall paket dasar...${NC}"
apt-get update -y
apt-get install -y curl wget git tar ufw nginx certbot python3-certbot-nginx

# 2. Install Node.js 24 LTS
echo -e "\n${YELLOW}[2/7] Menginstall Node.js 24 LTS...${NC}"
if ! command -v node >/dev/null 2>&1 || [[ $(node -v | cut -d'.' -f1 | sed 's/v//') -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
echo -e "${GREEN}✓ Node.js $(node -v) & NPM $(npm -v) berhasil disiapkan.${NC}"

# 3. Input Pengaturan Domain & Panel
echo -e "\n${YELLOW}[3/7] Pengaturan Konfigurasi Panel${NC}"
read -rp "Masukkan Domain untuk Panel Remote (contoh: panel-remote.domain.com): " PANEL_DOMAIN
read -rp "Masukkan URL Panel Pterodactyl Utama (contoh: https://panel.allxddev.com): " UPSTREAM_URL
read -rp "Masukkan Port lokal yang diinginkan (default: 3000): " PANEL_PORT
PANEL_PORT=${PANEL_PORT:-3000}

if [ -z "$PANEL_DOMAIN" ] || [ -z "$UPSTREAM_URL" ]; then
  echo -e "${RED}[ERROR] Domain dan Upstream URL tidak boleh kosong!${NC}"
  exit 1
fi

# Hapus trailing slash jika ada
UPSTREAM_URL="${UPSTREAM_URL%/}"

# 4. Salin / Pindahkan Berkas ke /var/www/pterodactyl-panel
echo -e "\n${YELLOW}[4/7] Menyiapkan direktori aplikasi di ${INSTALL_DIR}...${NC}"
mkdir -p "$INSTALL_DIR"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Jika dijalankan dari dalam repo, salin file ke direktori target
if [ -f "$SCRIPT_DIR/server.js" ]; then
  cp -r "$SCRIPT_DIR"/* "$INSTALL_DIR/"
  cp -r "$SCRIPT_DIR"/.* "$INSTALL_DIR/" 2>/dev/null || true
  # Hapus file .git jika ada di folder target
  rm -rf "$INSTALL_DIR/.git"
else
  echo -e "${RED}[ERROR] File project tidak ditemukan di $SCRIPT_DIR${NC}"
  exit 1
fi

cd "$INSTALL_DIR"

# Install dependensi Node.js
echo -e "\n${YELLOW}[5/7] Menginstall dependensi proyek (npm ci)...${NC}"
npm ci --omit=dev

# Generate SESSION_SECRET 32-byte hex
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

cat <<EOF > "$INSTALL_DIR/.env"
SESSION_SECRET=${SESSION_SECRET}
PTERODACTYL_URL=${UPSTREAM_URL}
PORT=${PANEL_PORT}
EOF

# Perizinan Folder
chown -R www-data:www-data "$INSTALL_DIR"
chmod -R 755 "$INSTALL_DIR"

# 5. Konfigurasi Systemd Service
echo -e "\n${YELLOW}[6/7] Membuat Systemd Service...${NC}"
cat <<EOF > /etc/systemd/system/pterodactyl-remote-panel.service
[Unit]
Description=Pterodactyl Remote Client Panel by AllxdDev
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/.env
ExecStart=$(which node) ${INSTALL_DIR}/server.js
Restart=always
RestartSec=5
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=pt-remote-panel

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable pterodactyl-remote-panel
systemctl restart pterodactyl-remote-panel

# 6. Konfigurasi Nginx & SSL
echo -e "\n${YELLOW}[7/7] Menyiapkan Nginx Reverse Proxy...${NC}"
cat <<EOF > /etc/nginx/sites-available/pterodactyl-remote-panel.conf
server {
    listen 80;
    server_name ${PANEL_DOMAIN};

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:${PANEL_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/pterodactyl-remote-panel.conf /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Firewall Setup
if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
fi

# Tanyakan install SSL otomatis
echo -e "\n${CYAN}Apakah Anda ingin menginstall SSL Let's Encrypt secara otomatis sekarang? (y/n)${NC}"
read -rp "Pilihan (default: y): " INSTALL_SSL
INSTALL_SSL=${INSTALL_SSL:-y}

if [[ "$INSTALL_SSL" =~ ^[Yy]$ ]]; then
  echo -e "\n${YELLOW}Membuat sertifikat SSL Certbot...${NC}"
  certbot --nginx -d "$PANEL_DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email || {
    echo -e "${YELLOW}[PERINGATAN] Certbot gagal otomatis. Pastikan DNS domain $PANEL_DOMAIN sudah mengarah ke IP VPS ini.${NC}"
  }
fi

echo -e "\n${GREEN}====================================================================${NC}"
echo -e "${GREEN}   🎉 Instalasi Pterodactyl Remote Panel Berhasil Selesai!         ${NC}"
echo -e "${GREEN}====================================================================${NC}"
echo -e "Alamat Panel    : ${CYAN}http://${PANEL_DOMAIN}${NC} (atau https jika SSL aktif)"
echo -e "Upstream Panel  : ${CYAN}${UPSTREAM_URL}${NC}"
echo -e "Status Service  : ${CYAN}systemctl status pterodactyl-remote-panel${NC}"
echo -e "Log Aplikasi    : ${CYAN}journalctl -u pterodactyl-remote-panel -f${NC}"
echo -e "\n${YELLOW}PENTING untuk Wings Console (WebSocket):${NC}"
echo -e "Tambahkan domain ${CYAN}https://${PANEL_DOMAIN}${NC} ke dalam file ${CYAN}/etc/pterodactyl/config.yml${NC} di VPS Node Wings Anda pada bagian ${CYAN}allowed_origins:${NC}, lalu jalankan ${CYAN}systemctl restart wings${NC}."
echo -e "${GREEN}====================================================================${NC}\n"
