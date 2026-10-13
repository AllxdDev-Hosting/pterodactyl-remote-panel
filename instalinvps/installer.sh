#!/usr/bin/env bash
# ==============================================================================
#  🦅 Pterodactyl Multi-Tool & PLTC Auto Installer by AllxdDev
#  License Protected: "AllxdClint"
#  Target: Pterodactyl Panel (/var/www/pterodactyl)
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
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

PANEL_PATH="/var/www/pterodactyl"
CONFIG_DIR="${PANEL_PATH}/storage/app"
CONFIG_FILE="${CONFIG_DIR}/pltc_allowed_ids.json"
BASE_BLADE="${PANEL_PATH}/resources/views/templates/base.blade.php"
ROUTES_WEB="${PANEL_PATH}/routes/web.php"

# ==============================================================================
#  FUNGSI LISENSI
# ==============================================================================
check_license() {
  clear 2>/dev/null || true
  echo -e "${CYAN}====================================================================${NC}"
  echo -e "${BOLD}${CYAN}     🦅 PTERODACTYL PLTC INSTALLER & MANAGER by AllxdDev           ${NC}"
  echo -e "${CYAN}====================================================================${NC}"
  echo -e "${YELLOW}Untuk melanjutkan, silakan masukkan License Key Anda:${NC}"
  read -rp "🔑 Masukkan License Key: " input_key

  # Bersihkan whitespace
  input_key=$(echo "$input_key" | xargs)

  if [ "$input_key" != "AllxdClint" ]; then
    echo -e "\n${RED}====================================================================${NC}"
    echo -e "${RED}❌ LISENSI TIDAK VALID ATAU SALAH!${NC}"
    echo -e "${YELLOW}Akses ditolak. Lisensi yang valid adalah: ${CYAN}AllxdClint${NC}"
    echo -e "${RED}====================================================================${NC}\n"
    exit 1
  fi

  echo -e "\n${GREEN}✓ Lisensi Terverifikasi! Selamat datang, AllxdDev User.${NC}"
  sleep 1
}

# ==============================================================================
#  FUNGSI INITIALISASI CONFIG ID (ID 1 OTOMATIS)
# ==============================================================================
init_config() {
  mkdir -p "$CONFIG_DIR"
  if [ ! -f "$CONFIG_FILE" ]; then
    echo '[1]' > "$CONFIG_FILE"
    chown -R www-data:www-data "$CONFIG_FILE" 2>/dev/null || true
  else
    ensure_id_1
  fi
}

ensure_id_1() {
  if [ -f "$CONFIG_FILE" ]; then
    python3 -c "
import json
try:
    with open('$CONFIG_FILE', 'r') as f:
        data = json.load(f)
    if not isinstance(data, list): data = [1]
    data = [int(x) for x in data if str(x).isdigit()]
    if 1 not in data: data.insert(0, 1)
    with open('$CONFIG_FILE', 'w') as f:
        json.dump(sorted(list(set(data))), f)
except Exception:
    with open('$CONFIG_FILE', 'w') as f:
        json.dump([1], f)
" 2>/dev/null || true
    chown -R www-data:www-data "$CONFIG_FILE" 2>/dev/null || true
  fi
}

# ==============================================================================
#  FUNGSI MANAJEMEN USER ID
# ==============================================================================
add_id() {
  init_config
  echo -e "\n${CYAN}====================================================================${NC}"
  echo -e "${BOLD}${YELLOW}                   ➕ TAMBAH USER ID IZIN PLTC                     ${NC}"
  echo -e "${CYAN}====================================================================${NC}"
  echo -e "Catatan: ${GREEN}User ID 1 (Owner)${NC} sudah otomatis selalu diizinkan."
  read -rp "Masukkan User ID Pterodactyl yang ingin diizinkan (contoh: 2): " new_id

  if ! [[ "$new_id" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}❌ Input harus berupa angka ID pengguna yang valid!${NC}"
    return
  fi

  python3 -c "
import json
file_path = '$CONFIG_FILE'
try:
    with open(file_path, 'r') as f:
        ids = json.load(f)
except:
    ids = [1]
if $new_id in ids:
    print('EXISTS')
else:
    ids.append($new_id)
    if 1 not in ids: ids.insert(0, 1)
    with open(file_path, 'w') as f:
        json.dump(sorted(list(set(ids))), f)
    print('SUCCESS')
" | while read -r res; do
    if [ "$res" = "EXISTS" ]; then
      echo -e "${YELLOW}⚠️ User ID $new_id sudah terdaftar dalam daftar izin!${NC}"
    elif [ "$res" = "SUCCESS" ]; then
      echo -e "${GREEN}✓ Berhasil menambahkan User ID $new_id ke daftar izin PLTC!${NC}"
    fi
  done
  chown -R www-data:www-data "$CONFIG_FILE" 2>/dev/null || true
}

delete_id() {
  init_config
  echo -e "\n${CYAN}====================================================================${NC}"
  echo -e "${BOLD}${RED}                   ➖ HAPUS USER ID IZIN PLTC                      ${NC}"
  echo -e "${CYAN}====================================================================${NC}"
  list_ids_inline
  echo ""
  read -rp "Masukkan User ID yang ingin dihapus: " del_id

  if ! [[ "$del_id" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}❌ Input harus berupa angka ID pengguna yang valid!${NC}"
    return
  fi

  if [ "$del_id" -eq 1 ]; then
    echo -e "${RED}❌ User ID 1 adalah ID Utama / Owner dan TIDAK BISA dihapus!${NC}"
    return
  fi

  python3 -c "
import json
file_path = '$CONFIG_FILE'
try:
    with open(file_path, 'r') as f:
        ids = json.load(f)
except:
    ids = [1]
if $del_id not in ids:
    print('NOT_FOUND')
else:
    ids = [x for x in ids if x != $del_id]
    if 1 not in ids: ids.insert(0, 1)
    with open(file_path, 'w') as f:
        json.dump(sorted(list(set(ids))), f)
    print('DELETED')
" | while read -r res; do
    if [ "$res" = "NOT_FOUND" ]; then
      echo -e "${RED}❌ User ID $del_id tidak ditemukan dalam daftar izin!${NC}"
    elif [ "$res" = "DELETED" ]; then
      echo -e "${GREEN}✓ User ID $del_id berhasil dihapus dari daftar izin PLTC.${NC}"
    fi
  done
  chown -R www-data:www-data "$CONFIG_FILE" 2>/dev/null || true
}

list_ids() {
  init_config
  echo -e "\n${CYAN}====================================================================${NC}"
  echo -e "${BOLD}${CYAN}      📋 DAFTAR USER ID YANG DIIZINKAN MELIHAT / SALIN PLTC        ${NC}"
  echo -e "${CYAN}====================================================================${NC}"
  python3 -c "
import json
try:
    with open('$CONFIG_FILE', 'r') as f:
        ids = json.load(f)
except:
    ids = [1]
if 1 not in ids: ids.insert(0, 1)
for i in sorted(list(set(ids))):
    if i == 1:
        print(f'  👑 User ID {i} : Owner Panel (Otomatis & Permanen)')
    else:
        print(f'  👤 User ID {i} : User Diizinkan (Bisa Salin / Lihat PLTC)')
"
  echo -e "${CYAN}====================================================================${NC}"
}

list_ids_inline() {
  echo -e "${YELLOW}Daftar ID saat ini:${NC}"
  python3 -c "
import json
try:
    with open('$CONFIG_FILE', 'r') as f:
        ids = json.load(f)
except:
    ids = [1]
if 1 not in ids: ids.insert(0, 1)
print(', '.join([f'ID {i}' + (' (Owner)' if i == 1 else '') for i in sorted(list(set(ids)))]))
"
}

# ==============================================================================
#  FUNGSI INSTALL FITUR PLTC KE PTERODACTYL PANEL
# ==============================================================================
install_pltc() {
  echo -e "\n${CYAN}====================================================================${NC}"
  echo -e "${BOLD}${GREEN}          📦 MEMASANG FITUR PLTC KE PTERODACTYL PANEL              ${NC}"
  echo -e "${CYAN}====================================================================${NC}"

  # Cek direktori Pterodactyl
  if [ ! -d "$PANEL_PATH" ] || [ ! -f "$BASE_BLADE" ]; then
    echo -e "${YELLOW}Direktori Pterodactyl tidak ditemukan di ${PANEL_PATH}.${NC}"
    read -rp "Masukkan path direktori Pterodactyl Anda (default: /var/www/pterodactyl): " CUSTOM_PATH
    PANEL_PATH=${CUSTOM_PATH:-/var/www/pterodactyl}
    CONFIG_DIR="${PANEL_PATH}/storage/app"
    CONFIG_FILE="${CONFIG_DIR}/pltc_allowed_ids.json"
    BASE_BLADE="${PANEL_PATH}/resources/views/templates/base.blade.php"
    ROUTES_WEB="${PANEL_PATH}/routes/web.php"
  fi

  if [ ! -f "$BASE_BLADE" ]; then
    echo -e "${RED}[ERROR] File ${BASE_BLADE} tidak ditemukan! Pastikan Pterodactyl sudah terpasang.${NC}"
    return 1
  fi

  init_config

  # 1. Backup file asli jika belum pernah dibackup
  if [ ! -f "${BASE_BLADE}.bak_allxd" ]; then
    cp "$BASE_BLADE" "${BASE_BLADE}.bak_allxd"
    echo -e "${GREEN}✓ Backup template dibuat: ${BASE_BLADE}.bak_allxd${NC}"
  fi

  if [ -f "$ROUTES_WEB" ] && [ ! -f "${ROUTES_WEB}.bak_allxd" ]; then
    cp "$ROUTES_WEB" "${ROUTES_WEB}.bak_allxd"
    echo -e "${GREEN}✓ Backup routes dibuat: ${ROUTES_WEB}.bak_allxd${NC}"
  fi

  # 2. Hapus versi lama jika sebelumnya sudah terpasang
  sed -i '/{{-- ALLXDDEV_PLTC_START --}}/,/{{-- ALLXDDEV_PLTC_END --}}/d' "$BASE_BLADE"
  if [ -f "$ROUTES_WEB" ]; then
    sed -i '/\/\/ ALLXDDEV_PLTC_START/,/\/\/ ALLXDDEV_PLTC_END/d' "$ROUTES_WEB"
  fi

  # 3. Inject Route API Handler ke routes/web.php
  if [ -f "$ROUTES_WEB" ]; then
    cat << 'EOF' >> "$ROUTES_WEB"

// ALLXDDEV_PLTC_START
Route::middleware(['web', 'auth'])->group(function () {
    Route::post('/allxd/pltc-action', function () {
        $allowedFile = storage_path('app/pltc_allowed_ids.json');
        $allowed = [1];
        if (file_exists($allowedFile)) {
            $dec = json_decode(file_get_contents($allowedFile), true);
            if (is_array($dec)) {
                $allowed = array_unique(array_merge([1], array_map('intval', $dec)));
            }
        }
        $user = Auth::user();
        if (!in_array((int)$user->id, $allowed)) {
            return response()->json(['error' => 'Akses PLTC dibatasi. ID Anda tidak terdaftar.'], 403);
        }

        try {
            $forceNew = request()->input('new') == '1';
            $apiKey = \Pterodactyl\Models\ApiKey::where('user_id', $user->id)
                ->where('key_type', \Pterodactyl\Models\ApiKey::TYPE_ACCOUNT)
                ->first();

            if ($forceNew || !$apiKey) {
                $tokenService = app(\Pterodactyl\Services\ApiKeys\ApiKeyCreationService::class);
                $key = $tokenService->handle([
                    'user_id' => $user->id,
                    'key_type' => \Pterodactyl\Models\ApiKey::TYPE_ACCOUNT,
                    'memo' => 'PLTC Dashboard AllxdDev',
                    'allowed_ips' => [],
                ]);
                return response()->json([
                    'success' => true,
                    'token' => $key->secretToken,
                    'identifier' => $key->identifier,
                    'is_new' => true,
                    'user_id' => $user->id,
                    'username' => $user->username
                ]);
            }

            return response()->json([
                'success' => true,
                'identifier' => $apiKey->identifier,
                'is_new' => false,
                'user_id' => $user->id,
                'username' => $user->username
            ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    });
});
// ALLXDDEV_PLTC_END
EOF
    echo -e "${GREEN}✓ Injeksi route /allxd/pltc-action ke routes/web.php berhasil.${NC}"
  fi

  # 4. Inject Widget UI ke resources/views/templates/base.blade.php
  # Disisipkan sebelum </body>
  cat << 'EOF' > /tmp/pltc_snippet.blade.php

{{-- ALLXDDEV_PLTC_START --}}
@if(Auth::check())
@php
    $allxdConfig = storage_path('app/pltc_allowed_ids.json');
    $allxdAllowed = [1];
    if (file_exists($allxdConfig)) {
        $allxdDecoded = json_decode(file_get_contents($allxdConfig), true);
        if (is_array($allxdDecoded)) {
            $allxdAllowed = array_unique(array_merge([1], array_map('intval', $allxdDecoded)));
        }
    }
    $allxdIsAllowed = in_array((int)Auth::user()->id, $allxdAllowed);
@endphp
@if($allxdIsAllowed)
<style>
  .allxd-pltc-badge {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #1e293b, #0f172a);
    color: #f8fafc;
    border: 1px solid #38bdf8;
    box-shadow: 0 10px 25px -5px rgba(56, 189, 248, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
    padding: 10px 16px;
    border-radius: 9999px;
    font-family: 'Inter', -apple-system, sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .allxd-pltc-badge:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 14px 30px -4px rgba(56, 189, 248, 0.45);
    background: #0284c7;
  }
  .allxd-pltc-modal {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 1000000;
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(8px);
    align-items: center;
    justify-content: center;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  .allxd-pltc-modal.active { display: flex; }
  .allxd-pltc-card {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 16px;
    max-width: 480px;
    width: 90%;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7);
    padding: 24px;
    color: #f8fafc;
    position: relative;
  }
  .allxd-input-wrap {
    display: flex;
    gap: 8px;
    margin: 16px 0;
  }
  .allxd-input {
    flex: 1;
    background: #020617;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 10px 12px;
    color: #38bdf8;
    font-family: monospace;
    font-size: 13px;
    outline: none;
  }
  .allxd-btn {
    padding: 10px 16px;
    border-radius: 8px;
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: background 0.15s;
  }
  .allxd-btn-primary { background: #0284c7; color: white; }
  .allxd-btn-primary:hover { background: #0369a1; }
  .allxd-btn-outline { background: transparent; border: 1px solid #475569; color: #cbd5e1; }
  .allxd-btn-outline:hover { background: #1e293b; color: white; }
  .allxd-toast {
    position: fixed;
    top: 24px;
    right: 24px;
    background: #10b981;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
    z-index: 1000001;
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.25s ease;
  }
  .allxd-toast.show { opacity: 1; transform: translateY(0); }
</style>

<!-- Floating Button PLTC (Hanya ID 1 atau ID Izin) -->
<div id="allxd-btn-open-pltc" class="allxd-pltc-badge" title="Klik untuk melihat dan menyalin PLTC">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <path d="M21 2l-2 2m-1-1l-3 3m2-2l-2 2m-2-2l-3 3m2-2l-2 2M3 21l9-9m0 0l-3-3m3 3l3 3"/>
  </svg>
  <span>🔑 Salin PLTC</span>
  <span style="font-size: 10px; background: rgba(56,189,248,0.2); color: #38bdf8; padding: 2px 6px; border-radius: 6px;">ID {{ Auth::user()->id }}</span>
</div>

<!-- Modal Dialog PLTC -->
<div id="allxd-pltc-modal" class="allxd-pltc-modal">
  <div class="allxd-pltc-card">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:18px;">🔑</span>
        <h3 style="margin:0; font-size:16px; font-weight:700;">Personal Client Token (PLTC)</h3>
      </div>
      <button id="allxd-btn-close-modal" style="background:transparent; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">✕</button>
    </div>
    
    <div style="font-size:12px; color:#94a3b8; line-height:1.5;">
      PLTC adalah API Key Client untuk akun <b style="color:#fff;">{{ Auth::user()->username }}</b> (User ID: <b style="color:#38bdf8;">{{ Auth::user()->id }}</b>). Fitur ini aktif khusus untuk ID yang diizinkan oleh <b style="color:#38bdf8;">AllxdDev</b>.
    </div>

    <div class="allxd-input-wrap">
      <input type="text" id="allxd-pltc-val" class="allxd-input" placeholder="Mengambil PLTC..." readonly />
      <button id="allxd-btn-copy" class="allxd-btn allxd-btn-primary" type="button">📋 Salin</button>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
      <button id="allxd-btn-new-key" class="allxd-btn allxd-btn-outline" type="button" style="font-size:12px;">🔄 Buat Kunci Baru</button>
      <div style="font-size:11px; color:#64748b;">AllxdClient • Authorized</div>
    </div>
  </div>
</div>

<div id="allxd-pltc-toast" class="allxd-toast">✓ PLTC Berhasil Disalin!</div>

<script>
(function() {
  const btnOpen = document.getElementById('allxd-btn-open-pltc');
  const btnClose = document.getElementById('allxd-btn-close-modal');
  const modal = document.getElementById('allxd-pltc-modal');
  const inputVal = document.getElementById('allxd-pltc-val');
  const btnCopy = document.getElementById('allxd-btn-copy');
  const btnNew = document.getElementById('allxd-btn-new-key');
  const toast = document.getElementById('allxd-pltc-toast');

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
  }

  async function fetchPltc(forceNew = false) {
    inputVal.value = 'Memuat PLTC token...';
    const cached = !forceNew ? localStorage.getItem('allxd_pltc_key') : null;
    if (cached) {
      inputVal.value = cached;
      return;
    }

    try {
      const res = await fetch('/allxd/pltc-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken()
        },
        body: JSON.stringify({ new: forceNew ? '1' : '0' })
      });
      const data = await res.json();
      if (data.token) {
        inputVal.value = data.token;
        localStorage.setItem('allxd_pltc_key', data.token);
      } else if (data.identifier) {
        inputVal.value = data.identifier;
      } else {
        inputVal.value = data.error || 'Gagal memuat PLTC.';
      }
    } catch (e) {
      inputVal.value = 'Error menghubungkan server.';
    }
  }

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      modal.classList.add('active');
      fetchPltc(false);
    });
  }

  if (btnClose) btnClose.addEventListener('click', () => modal.classList.remove('active'));
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      if (!inputVal.value || inputVal.value.includes('Memuat') || inputVal.value.includes('Gagal')) return;
      navigator.clipboard.writeText(inputVal.value).then(() => {
        showToast('✓ PLTC Berhasil Disalin ke Clipboard!');
      }).catch(() => {
        inputVal.select();
        document.execCommand('copy');
        showToast('✓ PLTC Berhasil Disalin!');
      });
    });
  }

  if (btnNew) {
    btnNew.addEventListener('click', () => {
      if (confirm('Buat API Key PLTC baru untuk akun Anda?')) {
        localStorage.removeItem('allxd_pltc_key');
        fetchPltc(true);
      }
    });
  }
})();
</script>
@endif
@endif
{{-- ALLXDDEV_PLTC_END --}}
EOF

  # Sisipkan sebelum tag </body> di base.blade.php
  if grep -q "</body>" "$BASE_BLADE"; then
    python3 -c "
with open('$BASE_BLADE', 'r') as f:
    content = f.read()
with open('/tmp/pltc_snippet.blade.php', 'r') as f:
    snippet = f.read()
if '</body>' in content:
    new_content = content.replace('</body>', snippet + '\n</body>')
    with open('$BASE_BLADE', 'w') as f:
        f.write(new_content)
    print('SUCCESS')
else:
    print('FAIL')
"
  else
    cat /tmp/pltc_snippet.blade.php >> "$BASE_BLADE"
  fi
  rm -f /tmp/pltc_snippet.blade.php

  # 5. Clear Cache Pterodactyl View & Route
  cd "$PANEL_PATH"
  php artisan view:clear 2>/dev/null || true
  php artisan route:clear 2>/dev/null || true
  php artisan config:clear 2>/dev/null || true
  chown -R www-data:www-data "$PANEL_PATH" 2>/dev/null || true

  echo -e "\n${GREEN}====================================================================${NC}"
  echo -e "${GREEN}  🎉 FITUR PLTC BERHASIL TERPASANG DI PTERODACTYL PANEL!           ${NC}"
  echo -e "${GREEN}====================================================================${NC}"
  echo -e "• Fitur hanya akan tampil untuk ${CYAN}User ID 1 (Owner)${NC} dan ID yang didaftarkan."
  echo -e "• Gunakan menu ${YELLOW}[2] Tambah ID${NC} untuk menambahkan user lain yang diizinkan."
  echo -e "• Gunakan menu ${YELLOW}[3] Hapus ID${NC} untuk mencabut izin akses."
  echo -e "${GREEN}====================================================================${NC}\n"
}

# ==============================================================================
#  FUNGSI UNINSTALL PLTC (RESTORE ORIGINAL PANEL)
# ==============================================================================
uninstall_pltc() {
  echo -e "\n${CYAN}====================================================================${NC}"
  echo -e "${BOLD}${RED}             🗑️ UNINSTALL FITUR PLTC DARI PTERODACTYL             ${NC}"
  echo -e "${CYAN}====================================================================${NC}"
  read -rp "Apakah Anda yakin ingin mencopot fitur PLTC dan merestore panel asli? (y/n): " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Proses uninstall dibatalkan.${NC}"
    return
  fi

  # Restore base.blade.php jika ada backup
  if [ -f "${BASE_BLADE}.bak_allxd" ]; then
    cp "${BASE_BLADE}.bak_allxd" "$BASE_BLADE"
    echo -e "${GREEN}✓ File ${BASE_BLADE} dikembalikan dari backup.${NC}"
  else
    sed -i '/{{-- ALLXDDEV_PLTC_START --}}/,/{{-- ALLXDDEV_PLTC_END --}}/d' "$BASE_BLADE" 2>/dev/null || true
    echo -e "${GREEN}✓ Tag PLTC dibersihkan dari ${BASE_BLADE}.${NC}"
  fi

  # Restore routes/web.php jika ada backup
  if [ -f "${ROUTES_WEB}.bak_allxd" ]; then
    cp "${ROUTES_WEB}.bak_allxd" "$ROUTES_WEB"
    echo -e "${GREEN}✓ File ${ROUTES_WEB} dikembalikan dari backup.${NC}"
  else
    sed -i '/\/\/ ALLXDDEV_PLTC_START/,/\/\/ ALLXDDEV_PLTC_END/d' "$ROUTES_WEB" 2>/dev/null || true
    echo -e "${GREEN}✓ Route PLTC dibersihkan dari ${ROUTES_WEB}.${NC}"
  fi

  # Hapus file konfigurasi
  rm -f "$CONFIG_FILE"

  # Clear Cache
  if [ -d "$PANEL_PATH" ]; then
    cd "$PANEL_PATH"
    php artisan view:clear 2>/dev/null || true
    php artisan route:clear 2>/dev/null || true
    php artisan config:clear 2>/dev/null || true
    chown -R www-data:www-data "$PANEL_PATH" 2>/dev/null || true
  fi

  echo -e "\n${GREEN}====================================================================${NC}"
  echo -e "${GREEN}  ✓ Fitur PLTC berhasil dicopot total dan panel dipulihkan!         ${NC}"
  echo -e "${GREEN}====================================================================${NC}\n"
}

# ==============================================================================
#  FUNGSI BANTUAN PARSER .ENV
# ==============================================================================
get_env_val() {
  local key="$1"
  local env_file="${PANEL_PATH}/.env"
  if [ ! -f "$env_file" ]; then
    echo ""
    return
  fi
  python3 -c "
import sys
try:
    with open('$env_file', 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'): continue
            if '=' in line:
                k, v = line.split('=', 1)
                if k.strip() == '$key':
                    print(v.strip().strip('\"').strip('\''))
                    sys.exit(0)
except:
    pass
" 2>/dev/null || true
}

# ==============================================================================
#  FUNGSI UBAH / GANTI DOMAIN PTERODACTYL (TANPA REINSTALL)
# ==============================================================================
change_domain() {
  echo -e "\n${CYAN}====================================================================${NC}"
  echo -e "${BOLD}${YELLOW}         🌐 GANTI / UBAH DOMAIN PANEL PTERODACTYL                  ${NC}"
  echo -e "${CYAN}====================================================================${NC}"

  if [ ! -d "$PANEL_PATH" ] || [ ! -f "${PANEL_PATH}/.env" ]; then
    echo -e "${YELLOW}Pterodactyl tidak ditemukan di ${PANEL_PATH}.${NC}"
    read -rp "Masukkan path folder Pterodactyl Anda (default: /var/www/pterodactyl): " CUSTOM_PATH
    PANEL_PATH=${CUSTOM_PATH:-/var/www/pterodactyl}
  fi

  if [ ! -f "${PANEL_PATH}/.env" ]; then
    echo -e "${RED}[ERROR] File .env tidak ditemukan di ${PANEL_PATH}! Pastikan Pterodactyl terpasang.${NC}"
    return 1
  fi

  local current_url=$(get_env_val "APP_URL")
  echo -e "Domain saat ini : ${CYAN}${current_url:-Belum disetel}${NC}"
  echo ""
  read -rp "Masukkan Domain Baru (contoh: panel.domainbaru.com): " NEW_DOMAIN
  NEW_DOMAIN=$(echo "$NEW_DOMAIN" | sed -e 's|^https://||' -e 's|^http://||' -e 's|/$||' | xargs)

  if [ -z "$NEW_DOMAIN" ]; then
    echo -e "${RED}❌ Domain baru tidak boleh kosong!${NC}"
    return 1
  fi

  read -rp "Gunakan protokol [1: HTTPS (rekomendasi), 2: HTTP] (default: 1): " proto_choice
  local PROTO="https"
  if [ "$proto_choice" = "2" ]; then
    PROTO="http"
  fi
  local NEW_URL="${PROTO}://${NEW_DOMAIN}"

  echo -e "\n${YELLOW}Memproses penggantian domain ke: ${CYAN}${NEW_URL}${NC}..."

  # 1. Backup .env
  cp "${PANEL_PATH}/.env" "${PANEL_PATH}/.env.bak_domain_$(date +%s)"

  # 2. Update APP_URL di .env
  python3 -c "
env_path = '${PANEL_PATH}/.env'
with open(env_path, 'r') as f:
    lines = f.readlines()
new_lines = []
found = False
for line in lines:
    if line.strip().startswith('APP_URL='):
        new_lines.append(f'APP_URL=${NEW_URL}\n')
        found = True
    else:
        new_lines.append(line)
if not found:
    new_lines.append(f'APP_URL=${NEW_URL}\n')
with open(env_path, 'w') as f:
    f.writelines(new_lines)
"
  echo -e "${GREEN}✓ File .env diperbarui (APP_URL=${NEW_URL}).${NC}"

  # 3. Update Nginx Server Block
  local nginx_updated=false
  for conf in /etc/nginx/sites-available/* /etc/nginx/conf.d/*; do
    if [ -f "$conf" ] && grep -q "pterodactyl" "$conf" 2>/dev/null; then
      cp "$conf" "${conf}.bak_domain_$(date +%s)"
      sed -i -E "s/server_name\s+[^;]+;/server_name ${NEW_DOMAIN};/g" "$conf"
      echo -e "${GREEN}✓ Konfigurasi Nginx diperbarui: $conf${NC}"
      nginx_updated=true
      break
    fi
  done

  if [ "$nginx_updated" = false ]; then
    for conf in /etc/nginx/sites-available/* /etc/nginx/conf.d/*; do
      if [ -f "$conf" ] && grep -q "/var/www/pterodactyl" "$conf" 2>/dev/null; then
        cp "$conf" "${conf}.bak_domain_$(date +%s)"
        sed -i -E "s/server_name\s+[^;]+;/server_name ${NEW_DOMAIN};/g" "$conf"
        echo -e "${GREEN}✓ Konfigurasi Nginx diperbarui: $conf${NC}"
        nginx_updated=true
        break
      fi
    done
  fi

  if nginx -t 2>/dev/null; then
    systemctl reload nginx 2>/dev/null || true
    echo -e "${GREEN}✓ Nginx reload sukses.${NC}"
  else
    echo -e "${YELLOW}⚠️ Nginx reload perlu diperiksa manual.${NC}"
  fi

  # 4. Tawarkan Pasang SSL Otomatis
  if [ "$PROTO" = "https" ] && command -v certbot >/dev/null 2>&1; then
    read -rp "Ingin menerbitkan sertifikat SSL gratis (Certbot / Let's Encrypt)? (y/n) (default: y): " issue_ssl
    issue_ssl=${issue_ssl:-y}
    if [[ "$issue_ssl" =~ ^[Yy]$ ]]; then
      echo -e "${YELLOW}Menerbitkan SSL untuk ${NEW_DOMAIN}...${NC}"
      certbot --nginx -d "$NEW_DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email 2>/dev/null || {
        echo -e "${YELLOW}⚠️ Pastikan DNS Record A domain ${NEW_DOMAIN} sudah mengarah ke IP server ini.${NC}"
      }
      systemctl reload nginx 2>/dev/null || true
    fi
  fi

  # 5. Update Wings allowed_origins jika ada di host ini
  local wings_conf="/etc/pterodactyl/config.yml"
  if [ -f "$wings_conf" ]; then
    python3 -c "
wings_file = '$wings_conf'
new_origin = '$NEW_URL'
try:
    with open(wings_file, 'r') as f:
        content = f.read()
    if new_origin not in content and 'allowed_origins:' in content:
        content = content.replace('allowed_origins:', f'allowed_origins:\n  - \"{new_origin}\"')
        with open(wings_file, 'w') as f:
            f.write(content)
        print('ADDED')
except:
    pass
" | while read -r res; do
      if [ "$res" = "ADDED" ]; then
        echo -e "${GREEN}✓ Origin ${NEW_URL} ditambahkan ke Wings (/etc/pterodactyl/config.yml).${NC}"
        systemctl restart wings 2>/dev/null || true
      fi
    done
  fi

  # 6. Clear Cache
  cd "$PANEL_PATH"
  php artisan view:clear 2>/dev/null || true
  php artisan config:clear 2>/dev/null || true
  php artisan route:clear 2>/dev/null || true
  php artisan cache:clear 2>/dev/null || true
  systemctl restart pteroq 2>/dev/null || true

  echo -e "\n${GREEN}====================================================================${NC}"
  echo -e "${GREEN}  🎉 DOMAIN PTERODACTYL BERHASIL DIUBAH!                           ${NC}"
  echo -e "${GREEN}====================================================================${NC}"
  echo -e "• Domain Baru : ${CYAN}${NEW_URL}${NC}"
  echo -e "• Data & Server : ${GREEN}100% AMAN (Tanpa kehilangan data sedikitpun)${NC}"
  echo -e "${GREEN}====================================================================${NC}\n"
}

# ==============================================================================
#  FUNGSI BACKUP LENGKAP PTERODACTYL (DATABASE & FILE)
# ==============================================================================
backup_panel() {
  echo -e "\n${CYAN}====================================================================${NC}"
  echo -e "${BOLD}${YELLOW}         📦 BACKUP LENGKAP PTERODACTYL PANEL                      ${NC}"
  echo -e "${CYAN}====================================================================${NC}"

  if [ ! -d "$PANEL_PATH" ] || [ ! -f "${PANEL_PATH}/.env" ]; then
    echo -e "${RED}[ERROR] Pterodactyl tidak ditemukan di ${PANEL_PATH}!${NC}"
    return 1
  fi

  local TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  local BACKUP_DIR="/var/ptero_backups"
  local WORK_DIR="/tmp/ptero_pkg_${TIMESTAMP}"
  local ARCHIVE_NAME="pterodactyl_backup_${TIMESTAMP}.tar.gz"
  local DEST_ARCHIVE="${BACKUP_DIR}/${ARCHIVE_NAME}"

  mkdir -p "$BACKUP_DIR"
  mkdir -p "$WORK_DIR"

  echo -e "${YELLOW}[1/4] Menghentikan antrian queue worker (pteroq)...${NC}"
  systemctl stop pteroq 2>/dev/null || true

  # Ambil kredensial DB
  local DB_HOST=$(get_env_val "DB_HOST")
  local DB_PORT=$(get_env_val "DB_PORT")
  local DB_NAME=$(get_env_val "DB_DATABASE")
  local DB_USER=$(get_env_val "DB_USERNAME")
  local DB_PASS=$(get_env_val "DB_PASSWORD")

  DB_HOST=${DB_HOST:-127.0.0.1}
  DB_PORT=${DB_PORT:-3306}

  echo -e "${YELLOW}[2/4] Melakukan dump database MySQL (${DB_NAME:-panel})...${NC}"
  if [ -n "$DB_PASS" ]; then
    mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "${WORK_DIR}/database.sql" 2>/dev/null || \
    mysqldump "$DB_NAME" > "${WORK_DIR}/database.sql" 2>/dev/null || true
  else
    mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" > "${WORK_DIR}/database.sql" 2>/dev/null || \
    mysqldump "$DB_NAME" > "${WORK_DIR}/database.sql" 2>/dev/null || true
  fi

  if [ ! -s "${WORK_DIR}/database.sql" ]; then
    echo -e "${YELLOW}Mencoba dump database dengan root lokal...${NC}"
    mysqldump "$DB_NAME" > "${WORK_DIR}/database.sql" 2>/dev/null || true
  fi

  if [ ! -s "${WORK_DIR}/database.sql" ]; then
    echo -e "${RED}❌ Gagal mendump database! Pastikan service MySQL/MariaDB berjalan.${NC}"
    systemctl start pteroq 2>/dev/null || true
    rm -rf "$WORK_DIR"
    return 1
  fi
  echo -e "${GREEN}✓ Database berhasil diekspor (${WORK_DIR}/database.sql)${NC}"

  echo -e "${YELLOW}[3/4] Mengarsipkan berkas panel Pterodactyl (/var/www/pterodactyl)...${NC}"
  # Salin config nginx jika ada
  for conf in /etc/nginx/sites-available/* /etc/nginx/conf.d/*; do
    if [ -f "$conf" ] && grep -q "pterodactyl" "$conf" 2>/dev/null; then
      cp "$conf" "${WORK_DIR}/nginx_pterodactyl.conf"
      break
    fi
  done

  # Salin config Wings jika ada
  if [ -f "/etc/pterodactyl/config.yml" ]; then
    cp "/etc/pterodactyl/config.yml" "${WORK_DIR}/wings_config.yml"
  fi

  # Simpan metadata
  cat << EOF > "${WORK_DIR}/meta.info"
TIMESTAMP=${TIMESTAMP}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
APP_URL=$(get_env_val "APP_URL")
EOF

  tar -czf "${WORK_DIR}/ptero_files.tar.gz" \
    --exclude="storage/logs/*.log" \
    --exclude="storage/framework/cache/data/*" \
    -C /var/www pterodactyl

  echo -e "${YELLOW}[4/4] Mengompresi paket backup lengkap...${NC}"
  tar -czf "$DEST_ARCHIVE" -C "$WORK_DIR" .
  rm -rf "$WORK_DIR"

  systemctl start pteroq 2>/dev/null || true

  local FILE_SIZE=$(du -h "$DEST_ARCHIVE" | cut -f1)
  echo -e "\n${GREEN}====================================================================${NC}"
  echo -e "${GREEN}  🎉 BACKUP PTERODACTYL LENGKAP SELESAI!                            ${NC}"
  echo -e "${GREEN}====================================================================${NC}"
  echo -e "• Lokasi File : ${CYAN}${DEST_ARCHIVE}${NC}"
  echo -e "• Ukuran File : ${YELLOW}${FILE_SIZE}${NC}"
  echo -e "• Berkas      : Database SQL, .env, Kunci Enkripsi, File Panel, Nginx"
  echo -e "${GREEN}====================================================================${NC}\n"
  ARCHIVE_LAST_NAME="$ARCHIVE_NAME"
}

# ==============================================================================
#  FUNGSI RESTORE PTERODACTYL DARI BACKUP (PULIHKAN SEMUA DATA)
# ==============================================================================
restore_panel() {
  echo -e "\n${CYAN}====================================================================${NC}"
  echo -e "${BOLD}${YELLOW}         ♻️ RESTORE / PULIHKAN PTERODACTYL PANEL                   ${NC}"
  echo -e "${CYAN}====================================================================${NC}"
  echo -e "Masukkan sumber file backup (.tar.gz):"
  echo -e "  - Path lokal (contoh: /var/ptero_backups/pterodactyl_backup.tar.gz)"
  echo -e "  - Atau link URL download (contoh: http://ip-vps-lama:8888/backup.tar.gz)"
  read -rp "Sumber backup: " BACKUP_SRC
  BACKUP_SRC=$(echo "$BACKUP_SRC" | xargs)

  if [ -z "$BACKUP_SRC" ]; then
    echo -e "${RED}❌ Sumber backup tidak boleh kosong!${NC}"
    return 1
  fi

  local LOCAL_FILE="$BACKUP_SRC"
  local TEMP_DOWNLOAD=false

  if [[ "$BACKUP_SRC" =~ ^https?:// ]]; then
    echo -e "${YELLOW}Mengunduh berkas backup dari URL...${NC}"
    LOCAL_FILE="/tmp/downloaded_ptero_backup_$$.tar.gz"
    if ! curl -fsSL -o "$LOCAL_FILE" "$BACKUP_SRC" && ! wget -q -O "$LOCAL_FILE" "$BACKUP_SRC"; then
      echo -e "${RED}❌ Gagal mengunduh file dari URL: ${BACKUP_SRC}${NC}"
      return 1
    fi
    TEMP_DOWNLOAD=true
  fi

  if [ ! -f "$LOCAL_FILE" ]; then
    echo -e "${RED}❌ File backup ${LOCAL_FILE} tidak ditemukan!${NC}"
    return 1
  fi

  read -rp "Peringatan: Berkas panel dan database akan dipulihkan dari backup. Lanjutkan? (y/n): " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Restore dibatalkan.${NC}"
    [ "$TEMP_DOWNLOAD" = true ] && rm -f "$LOCAL_FILE"
    return
  fi

  local EXTRACT_DIR="/tmp/ptero_restore_$$"
  mkdir -p "$EXTRACT_DIR"

  echo -e "${YELLOW}[1/5] Mengekstrak paket backup...${NC}"
  tar -xzf "$LOCAL_FILE" -C "$EXTRACT_DIR"

  if [ ! -f "${EXTRACT_DIR}/database.sql" ] || [ ! -f "${EXTRACT_DIR}/ptero_files.tar.gz" ]; then
    echo -e "${RED}❌ Format paket backup tidak valid atau file rusak!${NC}"
    rm -rf "$EXTRACT_DIR"
    [ "$TEMP_DOWNLOAD" = true ] && rm -f "$LOCAL_FILE"
    return 1
  fi

  echo -e "${YELLOW}[2/5] Memulihkan berkas panel ke /var/www/pterodactyl...${NC}"
  systemctl stop pteroq 2>/dev/null || true
  mkdir -p /var/www
  tar -xzf "${EXTRACT_DIR}/ptero_files.tar.gz" -C /var/www

  # Ambil kredensial database dari .env yang dipulihkan
  local DB_HOST=$(get_env_val "DB_HOST")
  local DB_PORT=$(get_env_val "DB_PORT")
  local DB_NAME=$(get_env_val "DB_DATABASE")
  local DB_USER=$(get_env_val "DB_USERNAME")
  local DB_PASS=$(get_env_val "DB_PASSWORD")

  DB_HOST=${DB_HOST:-127.0.0.1}
  DB_PORT=${DB_PORT:-3306}
  DB_NAME=${DB_NAME:-panel}
  DB_USER=${DB_USER:-pterodactyl}

  echo -e "${YELLOW}[3/5] Mengonfigurasi dan mengimpor database MySQL (${DB_NAME})...${NC}"
  # Pastikan DB & User tersedia di MySQL
  if [ -n "$DB_PASS" ]; then
    mysql -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`; CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}'; CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}'; GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1'; GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost'; FLUSH PRIVILEGES;" 2>/dev/null || true
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "${EXTRACT_DIR}/database.sql" 2>/dev/null || \
    mysql "$DB_NAME" < "${EXTRACT_DIR}/database.sql" 2>/dev/null || {
      mysql "$DB_NAME" < "${EXTRACT_DIR}/database.sql"
    }
  else
    mysql "$DB_NAME" < "${EXTRACT_DIR}/database.sql" 2>/dev/null || true
  fi
  echo -e "${GREEN}✓ Database berhasil diimpor & dipulihkan.${NC}"

  echo -e "${YELLOW}[4/5] Mengatur hak akses & service...${NC}"
  chown -R www-data:www-data "$PANEL_PATH"
  chmod -R 755 "$PANEL_PATH/storage" "$PANEL_PATH/bootstrap/cache"

  # Pulihkan Nginx jika ada
  if [ -f "${EXTRACT_DIR}/nginx_pterodactyl.conf" ] && [ -d "/etc/nginx/sites-available" ]; then
    if [ ! -f "/etc/nginx/sites-available/pterodactyl.conf" ]; then
      cp "${EXTRACT_DIR}/nginx_pterodactyl.conf" /etc/nginx/sites-available/pterodactyl.conf
      ln -sf /etc/nginx/sites-available/pterodactyl.conf /etc/nginx/sites-enabled/pterodactyl.conf 2>/dev/null || true
      nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || true
    fi
  fi

  # Pasang systemd pteroq jika belum ada
  if [ ! -f "/etc/systemd/system/pteroq.service" ]; then
    cat << 'EOF' > /etc/systemd/system/pteroq.service
[Unit]
Description=Pterodactyl Queue Worker
After=redis-server.service

[Service]
User=www-data
Group=www-data
Restart=always
ExecStart=/usr/bin/php /var/www/pterodactyl/artisan queue:work --queue=high,standard,low --sleep=3 --tries=3
StartLimitInterval=180
StartLimitBurst=30

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload 2>/dev/null || true
    systemctl enable --now pteroq 2>/dev/null || true
  fi

  echo -e "${YELLOW}[5/5] Membersihkan cache Laravel & menyalakan kembali queue...${NC}"
  cd "$PANEL_PATH"
  php artisan view:clear 2>/dev/null || true
  php artisan config:clear 2>/dev/null || true
  php artisan route:clear 2>/dev/null || true
  php artisan cache:clear 2>/dev/null || true
  php artisan queue:restart 2>/dev/null || true
  systemctl start pteroq 2>/dev/null || true
  systemctl reload nginx 2>/dev/null || true

  rm -rf "$EXTRACT_DIR"
  [ "$TEMP_DOWNLOAD" = true ] && rm -f "$LOCAL_FILE"

  local APP_URL=$(get_env_val "APP_URL")
  echo -e "\n${GREEN}====================================================================${NC}"
  echo -e "${GREEN}  🎉 RESTORE PTERODACTYL PANEL SELESAI TOTAL!                      ${NC}"
  echo -e "${GREEN}====================================================================${NC}"
  echo -e "• URL Panel : ${CYAN}${APP_URL:-http://IP-VPS}${NC}"
  echo -e "• Semua data pengguna, server, node, dan database 100% AMAN & UTUH!"
  echo -e "${GREEN}====================================================================${NC}\n"
}

# ==============================================================================
#  FUNGSI MIGRASI VPS (VPS LAMA -> VPS BARU)
# ==============================================================================
migrate_vps() {
  echo -e "\n${CYAN}====================================================================${NC}"
  echo -e "${BOLD}${CYAN}      🚀 MIGRASI PTERODACTYL DARI VPS LAMA KE VPS BARU             ${NC}"
  echo -e "${CYAN}====================================================================${NC}"
  echo -e "Pilih mode migrasi:"
  echo -e " ${BOLD}[1]${NC} ${GREEN}Export Data di VPS Lama (Buat Paket Pindah & Web Download)${NC}"
  echo -e " ${BOLD}[2]${NC} ${CYAN}Import / Restore Data di VPS Baru (Tinggal Masukkan Sumber)${NC}"
  echo -e " ${BOLD}[3]${NC} ${YELLOW}Transfer Langsung ke VPS Baru via SCP (Live VPS to VPS)${NC}"
  echo -e " ${BOLD}[0]${NC} Kembali ke Menu Utama"
  echo -e "${CYAN}--------------------------------------------------------------------${NC}"
  read -rp "Pilihan mode [0-3]: " mig_mode

  case "$mig_mode" in
    1)
      backup_panel
      echo -e "${YELLOW}Ingin membuka server download sementara di port 8888 agar mudah di-wget dari VPS Baru? (y/n): ${NC}"
      read -rp "Buka HTTP server? [y/N]: " open_http
      if [[ "$open_http" =~ ^[Yy]$ ]]; then
        local IP_SERVER=$(curl -s4 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
        echo -e "\n${GREEN}✓ HTTP Server berjalan di port 8888!${NC}"
        echo -e "Di VPS Baru, jalankan menu ${CYAN}[8] Restore Panel${NC} dan masukkan URL:"
        echo -e "${CYAN}http://${IP_SERVER}:8888/${ARCHIVE_LAST_NAME}${NC}\n"
        echo -e "${YELLOW}Tekan Ctrl+C jika file sudah selesai diunduh di VPS Baru untuk menutup server.${NC}"
        cd /var/ptero_backups && python3 -m http.server 8888
      fi
      ;;
    2)
      restore_panel
      ;;
    3)
      echo -e "\n${YELLOW}=== Transfer Langsung VPS Lama -> VPS Baru ===${NC}"
      read -rp "Masukkan IP VPS Baru: " TARGET_IP
      read -rp "Masukkan Port SSH VPS Baru (default: 22): " TARGET_PORT
      TARGET_PORT=${TARGET_PORT:-22}
      read -rp "Masukkan User SSH VPS Baru (default: root): " TARGET_USER
      TARGET_USER=${TARGET_USER:-root}

      if [ -z "$TARGET_IP" ]; then
        echo -e "${RED}❌ IP VPS Baru tidak boleh kosong!${NC}"
        return 1
      fi

      echo -e "\n${YELLOW}Menyiapkan arsip migrasi lokal...${NC}"
      backup_panel

      local LATEST_BACKUP=$(ls -t /var/ptero_backups/pterodactyl_backup_*.tar.gz 2>/dev/null | head -n1)
      if [ -z "$LATEST_BACKUP" ] || [ ! -f "$LATEST_BACKUP" ]; then
        echo -e "${RED}❌ Berkas backup tidak ditemukan!${NC}"
        return 1
      fi

      echo -e "\n${YELLOW}Mengirim berkas backup ke ${TARGET_USER}@${TARGET_IP}...${NC}"
      scp -P "$TARGET_PORT" "$LATEST_BACKUP" "${TARGET_USER}@${TARGET_IP}:/var/pterodactyl_migration_package.tar.gz"

      echo -e "\n${GREEN}====================================================================${NC}"
      echo -e "${GREEN}  ✓ Berkas backup berhasil ditransfer ke VPS Baru!                  ${NC}"
      echo -e "${GREEN}====================================================================${NC}"
      echo -e "Di VPS Baru, buka skrip ini lagi lalu pilih menu ${CYAN}[8] Restore Panel${NC}"
      echo -e "dan masukkan path: ${YELLOW}/var/pterodactyl_migration_package.tar.gz${NC}"
      echo -e "${GREEN}====================================================================${NC}\n"
      ;;
    0)
      return
      ;;
    *)
      echo -e "${RED}Pilihan tidak valid.${NC}"
      ;;
  esac
}

# ==============================================================================
#  SUITE PROTEKSI ANTI-RUSUH PTERODACTYL (INTEGRASI ALLXDDEV/ANTIRUSUH)
# ==============================================================================
ANTIRUSUH_BACKUP_DIR="/var/ptero_antirusuh_backups"

backup_antirusuh_target() {
  local TARGET="$1"
  mkdir -p "$ANTIRUSUH_BACKUP_DIR"
  local FNAME
  FNAME=$(basename "$TARGET")
  local BACKUP_ORIG="${ANTIRUSUH_BACKUP_DIR}/${FNAME}.orig"
  local TIMESTAMP
  TIMESTAMP=$(date -u +"%Y-%m-%d-%H-%M-%S")
  local BACKUP_TIMESTAMP="${TARGET}.bak_${TIMESTAMP}"

  if [ -f "$TARGET" ]; then
    if [ ! -f "$BACKUP_ORIG" ]; then
      cp "$TARGET" "$BACKUP_ORIG"
      echo -e "📦 Backup file asli disimpan ke ${CYAN}${BACKUP_ORIG}${NC}"
    fi
    cp "$TARGET" "$BACKUP_TIMESTAMP"
    echo -e "🗂️ Backup timestamp dibuat di ${CYAN}${BACKUP_TIMESTAMP}${NC}"
  fi
}

check_single_status() {
  local TARGET="$1"
  if [ ! -f "$TARGET" ]; then
    echo -e "${RED}[TIDAK ADA FILE]${NC}"
  elif grep -q "Protect by AllxdDev\|Protect By AllxdDev\|AllxdDev\|ProtectVeyora" "$TARGET" 2>/dev/null; then
    echo -e "${GREEN}[AKTIF - TERPROTEKSI]${NC}"
  else
    echo -e "${YELLOW}[BELUM TERPASANG]${NC}"
  fi
}


# --- Modul 1: Anti Delete Server (ServerDeletionService) ---
install_protect_1() {
  local TARGET="/var/www/pterodactyl/app/Services/Servers/ServerDeletionService.php"
  echo -e "\n${YELLOW}▶ Memasang Proteksi [1/11]: Anti Delete Server (ServerDeletionService)...${NC}"
  backup_antirusuh_target "$TARGET"
  mkdir -p "$(dirname "$TARGET")"
  chmod 755 "$(dirname "$TARGET")"

  cat > "$TARGET" << 'EOF'
<?php

namespace Pterodactyl\Services\Servers;

use Illuminate\Support\Facades\Auth;
use Pterodactyl\Exceptions\DisplayException;
use Illuminate\Http\Response;
use Pterodactyl\Models\Server;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\ConnectionInterface;
use Pterodactyl\Repositories\Wings\DaemonServerRepository;
use Pterodactyl\Services\Databases\DatabaseManagementService;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

class ServerDeletionService
{
    protected bool $force = false;

    /**
     * ServerDeletionService constructor.
     */
    public function __construct(
        private ConnectionInterface $connection,
        private DaemonServerRepository $daemonServerRepository,
        private DatabaseManagementService $databaseManagementService
    ) {
    }

    /**
     * Set if the server should be forcibly deleted from the panel (ignoring daemon errors) or not.
     */
    public function withForce(bool $bool = true): self
    {
        $this->force = $bool;
        return $this;
    }

    /**
     * Delete a server from the panel and remove any associated databases from hosts.
     *
     * @throws \Throwable
     * @throws \Pterodactyl\Exceptions\DisplayException
     */
    public function handle(Server $server): void
    {
        $user = Auth::user();

        // 🔒 Proteksi: hanya Admin ID = 1 boleh menghapus server siapa saja.
        // Selain itu, user biasa hanya boleh menghapus server MILIKNYA SENDIRI.
        // Jika tidak ada informasi pemilik dan pengguna bukan admin, tolak.
        if ($user) {
            if ($user->id !== 1) {
                // Coba deteksi owner dengan beberapa fallback yang umum.
                $ownerId = $server->owner_id
                    ?? $server->user_id
                    ?? ($server->owner?->id ?? null)
                    ?? ($server->user?->id ?? null);

                if ($ownerId === null) {
                    // Tidak jelas siapa pemiliknya — jangan izinkan pengguna biasa menghapus.
                    throw new DisplayException('Akses ditolak: informasi pemilik server tidak tersedia.');
                }

                if ($ownerId !== $user->id) {
                    throw new DisplayException('❌YAAA GA BISA YA LU BUKAN ADMIN ID 1 TOLOL - Protect by AllxdDev');
                }
            }
            // jika $user->id === 1, lanjutkan (admin super)
        }
        // Jika tidak ada $user (mis. CLI/background job), biarkan proses berjalan.

        try {
            $this->daemonServerRepository->setServer($server)->delete();
        } catch (DaemonConnectionException $exception) {
            // Abaikan error 404, tapi lempar error lain jika tidak mode force
            if (!$this->force && $exception->getStatusCode() !== Response::HTTP_NOT_FOUND) {
                throw $exception;
            }

            Log::warning($exception);
        }

        $this->connection->transaction(function () use ($server) {
            foreach ($server->databases as $database) {
                try {
                    $this->databaseManagementService->delete($database);
                } catch (\Exception $exception) {
                    if (!$this->force) {
                        throw $exception;
                    }

                    // Jika gagal delete database di host, tetap hapus dari panel
                    $database->delete();
                    Log::warning($exception);
                }
            }

            $server->delete();
        });
    }
}
EOF

  chmod 644 "$TARGET"
  echo -e "${GREEN}✓ [1/11] Anti Delete Server (ServerDeletionService) BERHASIL DIPASANG!${NC}"
}


# --- Modul 2: Anti Hapus & Ubah Data User (UserController) ---
install_protect_2() {
  local TARGET="/var/www/pterodactyl/app/Http/Controllers/Admin/UserController.php"
  echo -e "\n${YELLOW}▶ Memasang Proteksi [2/11]: Anti Hapus & Ubah Data User (UserController)...${NC}"
  backup_antirusuh_target "$TARGET"
  mkdir -p "$(dirname "$TARGET")"
  chmod 755 "$(dirname "$TARGET")"

  cat > "$TARGET" << 'EOF'
<?php

namespace Pterodactyl\Http\Controllers\Admin;

use Illuminate\View\View;
use Illuminate\Http\Request;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Model;
use Illuminate\Support\Collection;
use Illuminate\Http\RedirectResponse;
use Prologue\Alerts\AlertsMessageBag;
use Spatie\QueryBuilder\QueryBuilder;
use Illuminate\View\Factory as ViewFactory;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Http\Controllers\Controller;
use Illuminate\Contracts\Translation\Translator;
use Pterodactyl\Services\Users\UserUpdateService;
use Pterodactyl\Traits\Helpers\AvailableLanguages;
use Pterodactyl\Services\Users\UserCreationService;
use Pterodactyl\Services\Users\UserDeletionService;
use Pterodactyl\Http\Requests\Admin\UserFormRequest;
use Pterodactyl\Http\Requests\Admin\NewUserFormRequest;
use Pterodactyl\Contracts\Repository\UserRepositoryInterface;
class UserController extends Controller
{
    use AvailableLanguages;

    /**
     * UserController constructor.
     */
    public function __construct(
        protected AlertsMessageBag $alert,
        protected UserCreationService $creationService,
        protected UserDeletionService $deletionService,
        protected Translator $translator,
        protected UserUpdateService $updateService,
        protected UserRepositoryInterface $repository,
        protected ViewFactory $view
    ) {
    }

    /**
     * Display user index page.
     */
    public function index(Request $request): View
    {
        $users = QueryBuilder::for(
            User::query()->select('users.*')
                ->selectRaw('COUNT(DISTINCT(subusers.id)) as subuser_of_count')
                ->selectRaw('COUNT(DISTINCT(servers.id)) as servers_count')
                ->leftJoin('subusers', 'subusers.user_id', '=', 'users.id')
                ->leftJoin('servers', 'servers.owner_id', '=', 'users.id')
                ->groupBy('users.id')
        )
            ->allowedFilters(['username', 'email', 'uuid'])
            ->allowedSorts(['id', 'uuid'])
            ->paginate(50);

        return $this->view->make('admin.users.index', ['users' => $users]);
    }

    /**
     * Display new user page.
     */
    public function create(): View
    {
        return $this->view->make('admin.users.new', [
            'languages' => $this->getAvailableLanguages(true),
        ]);
    }

    /**
     * Display user view page.
     */
    public function view(User $user): View
    {
        return $this->view->make('admin.users.view', [
            'user' => $user,
            'languages' => $this->getAvailableLanguages(true),
        ]);
    }

    /**
     * Delete a user from the system.
     *
     * @throws Exception
     * @throws PterodactylExceptionsDisplayException
     */
    public function delete(Request $request, User $user): RedirectResponse
    {
        // === FITUR TAMBAHAN: Proteksi hapus user ===
        if ($request->user()->id !== 1) {
            throw new DisplayException("❌ YAA TOLOL KAN LU BUKAN ADMIN ID 1 - Protect by AllxdDev");
        }
        // ============================================

        if ($request->user()->id === $user->id) {
            throw new DisplayException($this->translator->get('admin/user.exceptions.user_has_servers'));
        }

        $this->deletionService->handle($user);

        return redirect()->route('admin.users');
    }

    /**
     * Create a user.
     *
     * @throws Exception
     * @throws Throwable
     */
    public function store(NewUserFormRequest $request): RedirectResponse
    {
        $user = $this->creationService->handle($request->normalize());
        $this->alert->success($this->translator->get('admin/user.notices.account_created'))->flash();

        return redirect()->route('admin.users.view', $user->id);
    }

    /**
     * Update a user on the system.
     *
     * @throws PterodactylExceptionsModelDataValidationException
     * @throws PterodactylExceptionsRepositoryRecordNotFoundException
     */
    public function update(UserFormRequest $request, User $user): RedirectResponse
    {
        // === FITUR TAMBAHAN: Proteksi ubah data penting ===
        $restrictedFields = ['email', 'first_name', 'last_name', 'password'];

        foreach ($restrictedFields as $field) {
            if ($request->filled($field) && $request->user()->id !== 1) {
                throw new DisplayException("⚠️ Data can only be changed with administrator ID 1. - ProtectVeyora");
            }
        }

        // Cegah turunkan level admin ke user biasa
        if ($user->root_admin && $request->user()->id !== 1) {
            throw new DisplayException("🚫 YA GA BISA LAH TOLOL LU BUKAN ADMIN ID 1 - Protect by AllxdDev");
        }
        // ====================================================

        $this->updateService
            ->setUserLevel(User::USER_LEVEL_ADMIN)
            ->handle($user, $request->normalize());

        $this->alert->success(trans('admin/user.notices.account_updated'))->flash();

        return redirect()->route('admin.users.view', $user->id);
    }

    /**
     * Get a JSON response of users on the system.
     */
    public function json(Request $request): Model|Collection
    {
        $users = QueryBuilder::for(User::query())->allowedFilters(['email'])->paginate(25);

        // Handle single user requests.
        if ($request->query('user_id')) {
            $user = User::query()->findOrFail($request->input('user_id'));
            $user->md5 = md5(strtolower($user->email));

            return $user;
        }

        return $users->map(function ($item) {
            $item->md5 = md5(strtolower($item->email));

            return $item;
        });
    }
}
EOF

  chmod 644 "$TARGET"
  echo -e "${GREEN}✓ [2/11] Anti Hapus & Ubah Data User (UserController) BERHASIL DIPASANG!${NC}"
}


# --- Modul 3: Anti Akses & Hapus Location (LocationController) ---
install_protect_3() {
  local TARGET="/var/www/pterodactyl/app/Http/Controllers/Admin/LocationController.php"
  echo -e "\n${YELLOW}▶ Memasang Proteksi [3/11]: Anti Akses & Hapus Location (LocationController)...${NC}"
  backup_antirusuh_target "$TARGET"
  mkdir -p "$(dirname "$TARGET")"
  chmod 755 "$(dirname "$TARGET")"

  cat > "$TARGET" << 'EOF'
<?php

namespace Pterodactyl\Http\Controllers\Admin;

use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Pterodactyl\Models\Location;
use Prologue\Alerts\AlertsMessageBag;
use Illuminate\View\Factory as ViewFactory;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Http\Requests\Admin\LocationFormRequest;
use Pterodactyl\Services\Locations\LocationUpdateService;
use Pterodactyl\Services\Locations\LocationCreationService;
use Pterodactyl\Services\Locations\LocationDeletionService;
use Pterodactyl\Contracts\Repository\LocationRepositoryInterface;

class LocationController extends Controller
{
    /**
     * LocationController constructor.
     */
    public function __construct(
        protected AlertsMessageBag $alert,
        protected LocationCreationService $creationService,
        protected LocationDeletionService $deletionService,
        protected LocationRepositoryInterface $repository,
        protected LocationUpdateService $updateService,
        protected ViewFactory $view
    ) {
    }

    /**
     * Return the location overview page.
     */
    public function index(): View
    {
        // 🔒 Cegah akses selain admin ID 1
        $user = Auth::user();
        if (!$user || $user->id !== 1) {
            abort(403, 'Akses ditolak protect by AllxdDev');
        }

        return $this->view->make('admin.locations.index', [
            'locations' => $this->repository->getAllWithDetails(),
        ]);
    }

    /**
     * Return the location view page.
     *
     * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
     */
    public function view(int $id): View
    {
        // 🔒 Cegah akses selain admin ID 1
        $user = Auth::user();
        if (!$user || $user->id !== 1) {
            abort(403, 'BOCAH TOLOL NGINTIP NGINTIP PROTECT BY AllxdDev');
        }

        return $this->view->make('admin.locations.view', [
            'location' => $this->repository->getWithNodes($id),
        ]);
    }

    /**
     * Handle request to create new location.
     *
     * @throws \Throwable
     */
    public function create(LocationFormRequest $request): RedirectResponse
    {
        // 🔒 Cegah akses selain admin ID 1
        $user = Auth::user();
        if (!$user || $user->id !== 1) {
            abort(403, 'BOCAH TOLOL NGINTIP NGINTIP PROTECT BY AllxdDev');
        }

        $location = $this->creationService->handle($request->normalize());
        $this->alert->success('Location was created successfully.')->flash();

        return redirect()->route('admin.locations.view', $location->id);
    }

    /**
     * Handle request to update or delete location.
     *
     * @throws \Throwable
     */
    public function update(LocationFormRequest $request, Location $location): RedirectResponse
    {
        // 🔒 Cegah akses selain admin ID 1
        $user = Auth::user();
        if (!$user || $user->id !== 1) {
            abort(403, 'BOCAH TOLOL NGINTIP NGINTIP PROTECT BY AllxdDev');
        }

        if ($request->input('action') === 'delete') {
            return $this->delete($location);
        }

        $this->updateService->handle($location->id, $request->normalize());
        $this->alert->success('Location was updated successfully.')->flash();

        return redirect()->route('admin.locations.view', $location->id);
    }

    /**
     * Delete a location from the system.
     *
     * @throws \Exception
     * @throws \Pterodactyl\Exceptions\DisplayException
     */
    public function delete(Location $location): RedirectResponse
    {
        // 🔒 Cegah akses selain admin ID 1
        $user = Auth::user();
        if (!$user || $user->id !== 1) {
            abort(403, 'BOCAH TOLOL NGINTIP NGINTIP PROTECT BY AllxdDev');
        }

        try {
            $this->deletionService->handle($location->id);
            return redirect()->route('admin.locations');
        } catch (DisplayException $ex) {
            $this->alert->danger($ex->getMessage())->flash();
        }

        return redirect()->route('admin.locations.view', $location->id);
    }
}
EOF

  chmod 644 "$TARGET"
  echo -e "${GREEN}✓ [3/11] Anti Akses & Hapus Location (LocationController) BERHASIL DIPASANG!${NC}"
}


# --- Modul 4: Anti Akses Nodes (Nodes/NodeController) ---
install_protect_4() {
  local TARGET="/var/www/pterodactyl/app/Http/Controllers/Admin/Nodes/NodeController.php"
  echo -e "\n${YELLOW}▶ Memasang Proteksi [4/11]: Anti Akses Nodes (Nodes/NodeController)...${NC}"
  backup_antirusuh_target "$TARGET"
  mkdir -p "$(dirname "$TARGET")"
  chmod 755 "$(dirname "$TARGET")"

  cat > "$TARGET" << 'EOF'
<?php

namespace Pterodactyl\Http\Controllers\Admin\Nodes;

use Illuminate\View\View;
use Illuminate\Http\Request;
use Pterodactyl\Models\Node;
use Spatie\QueryBuilder\QueryBuilder;
use Pterodactyl\Http\Controllers\Controller;
use Illuminate\Contracts\View\Factory as ViewFactory;
use Illuminate\Support\Facades\Auth; // ✅ tambahan untuk ambil user login

class NodeController extends Controller
{
    /**
     * NodeController constructor.
     */
    public function __construct(private ViewFactory $view)
    {
    }

    /**
     * Returns a listing of nodes on the system.
     */
    public function index(Request $request): View
    {
        // === 🔒 FITUR TAMBAHAN: Anti akses selain admin ID 1 ===
        $user = Auth::user();
        if (!$user || $user->id !== 1) {
            abort(403, '🚫 YAA GA BISA YA, LAIN KALI TAU DIRI YA TOLOL - Protect By AllxdDev');
        }
        // ======================================================

        $nodes = QueryBuilder::for(
            Node::query()->with('location')->withCount('servers')
        )
            ->allowedFilters(['uuid', 'name'])
            ->allowedSorts(['id'])
            ->paginate(25);

        return $this->view->make('admin.nodes.index', ['nodes' => $nodes]);
    }
}
EOF

  chmod 644 "$TARGET"
  echo -e "${GREEN}✓ [4/11] Anti Akses Nodes (Nodes/NodeController) BERHASIL DIPASANG!${NC}"
}


# --- Modul 5: Anti Akses & Ubah Nest (Nests/NestController) ---
install_protect_5() {
  local TARGET="/var/www/pterodactyl/app/Http/Controllers/Admin/Nests/NestController.php"
  echo -e "\n${YELLOW}▶ Memasang Proteksi [5/11]: Anti Akses & Ubah Nest (Nests/NestController)...${NC}"
  backup_antirusuh_target "$TARGET"
  mkdir -p "$(dirname "$TARGET")"
  chmod 755 "$(dirname "$TARGET")"

  cat > "$TARGET" << 'EOF'
<?php

namespace Pterodactyl\Http\Controllers\Admin\Nests;

use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;
use Prologue\Alerts\AlertsMessageBag;
use Illuminate\View\Factory as ViewFactory;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Services\Nests\NestUpdateService;
use Pterodactyl\Services\Nests\NestCreationService;
use Pterodactyl\Services\Nests\NestDeletionService;
use Pterodactyl\Contracts\Repository\NestRepositoryInterface;
use Pterodactyl\Http\Requests\Admin\Nest\StoreNestFormRequest;
use Illuminate\Support\Facades\Auth; // ✅ Tambahan

class NestController extends Controller
{
    /**
     * NestController constructor.
     */
    public function __construct(
        protected AlertsMessageBag $alert,
        protected NestCreationService $nestCreationService,
        protected NestDeletionService $nestDeletionService,
        protected NestRepositoryInterface $repository,
        protected NestUpdateService $nestUpdateService,
        protected ViewFactory $view
    ) {
    }

    /**
     * Render nest listing page.
     *
     * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
     */
    public function index(): View
    {
        // 🔒 Proteksi: hanya user ID 1 (superadmin) yang bisa akses menu Nest
        $user = Auth::user();
        if (!$user || $user->id !== 1) {
            abort(403, '🚫 YAA GA BISA YA, LAIN KALI TAU DIRI YA TOLOLl - Protect By AllxdDev');
        }

        return $this->view->make('admin.nests.index', [
            'nests' => $this->repository->getWithCounts(),
        ]);
    }

    /**
     * Render nest creation page.
     */
    public function create(): View
    {
        return $this->view->make('admin.nests.new');
    }

    /**
     * Handle the storage of a new nest.
     *
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     */
    public function store(StoreNestFormRequest $request): RedirectResponse
    {
        $nest = $this->nestCreationService->handle($request->normalize());
        $this->alert->success(trans('admin/nests.notices.created', ['name' => htmlspecialchars($nest->name)]))->flash();

        return redirect()->route('admin.nests.view', $nest->id);
    }

    /**
     * Return details about a nest including all the eggs and servers per egg.
     *
     * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
     */
    public function view(int $nest): View
    {
        return $this->view->make('admin.nests.view', [
            'nest' => $this->repository->getWithEggServers($nest),
        ]);
    }

    /**
     * Handle request to update a nest.
     *
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
     */
    public function update(StoreNestFormRequest $request, int $nest): RedirectResponse
    {
        $this->nestUpdateService->handle($nest, $request->normalize());
        $this->alert->success(trans('admin/nests.notices.updated'))->flash();

        return redirect()->route('admin.nests.view', $nest);
    }

    /**
     * Handle request to delete a nest.
     *
     * @throws \Pterodactyl\Exceptions\Service\HasActiveServersException
     */
    public function destroy(int $nest): RedirectResponse
    {
        $this->nestDeletionService->handle($nest);
        $this->alert->success(trans('admin/nests.notices.deleted'))->flash();

        return redirect()->route('admin.nests');
    }
}
EOF

  chmod 644 "$TARGET"
  echo -e "${GREEN}✓ [5/11] Anti Akses & Ubah Nest (Nests/NestController) BERHASIL DIPASANG!${NC}"
}


# --- Modul 6: Anti Akses Settings Panel (Settings/IndexController) ---
install_protect_6() {
  local TARGET="/var/www/pterodactyl/app/Http/Controllers/Admin/Settings/IndexController.php"
  echo -e "\n${YELLOW}▶ Memasang Proteksi [6/11]: Anti Akses Settings Panel (Settings/IndexController)...${NC}"
  backup_antirusuh_target "$TARGET"
  mkdir -p "$(dirname "$TARGET")"
  chmod 755 "$(dirname "$TARGET")"

  cat > "$TARGET" << 'EOF'
<?php

namespace Pterodactyl\Http\Controllers\Admin\Settings;

use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Prologue\Alerts\AlertsMessageBag;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\View\Factory as ViewFactory;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Traits\Helpers\AvailableLanguages;
use Pterodactyl\Services\Helpers\SoftwareVersionService;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;
use Pterodactyl\Http\Requests\Admin\Settings\BaseSettingsFormRequest;

class IndexController extends Controller
{
    use AvailableLanguages;

    /**
     * IndexController constructor.
     */
    public function __construct(
        private AlertsMessageBag $alert,
        private Kernel $kernel,
        private SettingsRepositoryInterface $settings,
        private SoftwareVersionService $versionService,
        private ViewFactory $view
    ) {
    }

    /**
     * Render the UI for basic Panel settings.
     */
    public function index(): View
    {
        // 🔒 Anti akses menu Settings selain user ID 1
        $user = Auth::user();
        if (!$user || $user->id !== 1) {
            abort(403, '❌ YAA GA BISA YA, LAIN KALI TAU DIRI YA TOLOLl - Protect By AllxdDev');
        }

        return $this->view->make('admin.settings.index', [
            'version' => $this->versionService,
            'languages' => $this->getAvailableLanguages(true),
        ]);
    }

    /**
     * Handle settings update.
     *
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
     */
    public function update(BaseSettingsFormRequest $request): RedirectResponse
    {
        // 🔒 Anti akses update settings selain user ID 1
        $user = Auth::user();
        if (!$user || $user->id !== 1) {
            abort(403, '❌ YAA GA BISA YA, LAIN KALI TAU DIRI YA TOLOLl - Protect By AllxdDev');
        }

        foreach ($request->normalize() as $key => $value) {
            $this->settings->set('settings::' . $key, $value);
        }

        $this->kernel->call('queue:restart');
        $this->alert->success(
            'Panel settings have been updated successfully and the queue worker was restarted to apply these changes.'
        )->flash();

        return redirect()->route('admin.settings');
    }
}
EOF

  chmod 644 "$TARGET"
  echo -e "${GREEN}✓ [6/11] Anti Akses Settings Panel (Settings/IndexController) BERHASIL DIPASANG!${NC}"
}


# --- Modul 7: Proteksi Client File Controller (FileController) ---
install_protect_7() {
  local TARGET="/var/www/pterodactyl/app/Http/Controllers/Api/Client/Servers/FileController.php"
  echo -e "\n${YELLOW}▶ Memasang Proteksi [7/11]: Proteksi Client File Controller (FileController)...${NC}"
  backup_antirusuh_target "$TARGET"
  mkdir -p "$(dirname "$TARGET")"
  chmod 755 "$(dirname "$TARGET")"

  cat > "$TARGET" << 'EOF'
<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Carbon\CarbonImmutable;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Models\Server;
use Pterodactyl\Facades\Activity;
use Pterodactyl\Services\Nodes\NodeJWTService;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;
use Pterodactyl\Transformers\Api\Client\FileObjectTransformer;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Http\Requests\Api\Client\Servers\Files\CopyFileRequest;
use Pterodactyl\Http\Requests\Api\Client\Servers\Files\PullFileRequest;
use Pterodactyl\Http\Requests\Api\Client\Servers\Files\ListFilesRequest;
use Pterodactyl\Http\Requests\Api\Client\Servers\Files\ChmodFilesRequest;
use Pterodactyl\Http\Requests\Api\Client\Servers\Files\DeleteFileRequest;
use Pterodactyl\Http\Requests\Api\Client\Servers\Files\RenameFileRequest;
use Pterodactyl\Http\Requests\Api\Client\Servers\Files\CreateFolderRequest;
use Pterodactyl\Http\Requests\Api\Client\Servers\Files\CompressFilesRequest;
use Pterodactyl\Http\Requests\Api\Client\Servers\Files\DecompressFilesRequest;
use Pterodactyl\Http\Requests\Api\Client\Servers\Files\GetFileContentsRequest;
use Pterodactyl\Http\Requests\Api\Client\Servers\Files\WriteFileContentRequest;

class FileController extends ClientApiController
{
    public function __construct(
        private NodeJWTService $jwtService,
        private DaemonFileRepository $fileRepository
    ) {
        parent::__construct();
    }

    /**
     * 🔒 Fungsi tambahan: Cegah akses server orang lain.
     */
    private function checkServerAccess($request, Server $server)
    {
        $user = $request->user();

        // Admin (user id = 1) bebas akses semua
        if ($user->id === 1) {
            return;
        }

        // Jika server bukan milik user, tolak akses
        if ($server->owner_id !== $user->id) {
            abort(403, 'Anda tidak memiliki akses ke server ini - Protect By AllxdDev');
        }
    }

    public function directory(ListFilesRequest $request, Server $server): array
    {
        $this->checkServerAccess($request, $server);

        $contents = $this->fileRepository
            ->setServer($server)
            ->getDirectory($request->get('directory') ?? '/');

        return $this->fractal->collection($contents)
            ->transformWith($this->getTransformer(FileObjectTransformer::class))
            ->toArray();
    }

    public function contents(GetFileContentsRequest $request, Server $server): Response
    {
        $this->checkServerAccess($request, $server);

        $response = $this->fileRepository->setServer($server)->getContent(
            $request->get('file'),
            config('pterodactyl.files.max_edit_size')
        );

        Activity::event('server:file.read')->property('file', $request->get('file'))->log();

        return new Response($response, Response::HTTP_OK, ['Content-Type' => 'text/plain']);
    }

    public function download(GetFileContentsRequest $request, Server $server): array
    {
        $this->checkServerAccess($request, $server);

        $token = $this->jwtService
            ->setExpiresAt(CarbonImmutable::now()->addMinutes(15))
            ->setUser($request->user())
            ->setClaims([
                'file_path' => rawurldecode($request->get('file')),
                'server_uuid' => $server->uuid,
            ])
            ->handle($server->node, $request->user()->id . $server->uuid);

        Activity::event('server:file.download')->property('file', $request->get('file'))->log();

        return [
            'object' => 'signed_url',
            'attributes' => [
                'url' => sprintf(
                    '%s/download/file?token=%s',
                    $server->node->getConnectionAddress(),
                    $token->toString()
                ),
            ],
        ];
    }

    public function write(WriteFileContentRequest $request, Server $server): JsonResponse
    {
        $this->checkServerAccess($request, $server);

        $this->fileRepository->setServer($server)->putContent($request->get('file'), $request->getContent());

        Activity::event('server:file.write')->property('file', $request->get('file'))->log();

        return new JsonResponse([], Response::HTTP_NO_CONTENT);
    }

    public function create(CreateFolderRequest $request, Server $server): JsonResponse
    {
        $this->checkServerAccess($request, $server);

        $this->fileRepository
            ->setServer($server)
            ->createDirectory($request->input('name'), $request->input('root', '/'));

        Activity::event('server:file.create-directory')
            ->property('name', $request->input('name'))
            ->property('directory', $request->input('root'))
            ->log();

        return new JsonResponse([], Response::HTTP_NO_CONTENT);
    }

    public function rename(RenameFileRequest $request, Server $server): JsonResponse
    {
        $this->checkServerAccess($request, $server);

        $this->fileRepository
            ->setServer($server)
            ->renameFiles($request->input('root'), $request->input('files'));

        Activity::event('server:file.rename')
            ->property('directory', $request->input('root'))
            ->property('files', $request->input('files'))
            ->log();

        return new JsonResponse([], Response::HTTP_NO_CONTENT);
    }

    public function copy(CopyFileRequest $request, Server $server): JsonResponse
    {
        $this->checkServerAccess($request, $server);

        $this->fileRepository
            ->setServer($server)
            ->copyFile($request->input('location'));

        Activity::event('server:file.copy')->property('file', $request->input('location'))->log();

        return new JsonResponse([], Response::HTTP_NO_CONTENT);
    }

    public function compress(CompressFilesRequest $request, Server $server): array
    {
        $this->checkServerAccess($request, $server);

        $file = $this->fileRepository->setServer($server)->compressFiles(
            $request->input('root'),
            $request->input('files')
        );

        Activity::event('server:file.compress')
            ->property('directory', $request->input('root'))
            ->property('files', $request->input('files'))
            ->log();

        return $this->fractal->item($file)
            ->transformWith($this->getTransformer(FileObjectTransformer::class))
            ->toArray();
    }

    public function decompress(DecompressFilesRequest $request, Server $server): JsonResponse
    {
        $this->checkServerAccess($request, $server);

        set_time_limit(300);

        $this->fileRepository->setServer($server)->decompressFile(
            $request->input('root'),
            $request->input('file')
        );

        Activity::event('server:file.decompress')
            ->property('directory', $request->input('root'))
            ->property('files', $request->input('file'))
            ->log();

        return new JsonResponse([], JsonResponse::HTTP_NO_CONTENT);
    }

    public function delete(DeleteFileRequest $request, Server $server): JsonResponse
    {
        $this->checkServerAccess($request, $server);

        $this->fileRepository->setServer($server)->deleteFiles(
            $request->input('root'),
            $request->input('files')
        );

        Activity::event('server:file.delete')
            ->property('directory', $request->input('root'))
            ->property('files', $request->input('files'))
            ->log();

        return new JsonResponse([], Response::HTTP_NO_CONTENT);
    }

    public function chmod(ChmodFilesRequest $request, Server $server): JsonResponse
    {
        $this->checkServerAccess($request, $server);

        $this->fileRepository->setServer($server)->chmodFiles(
            $request->input('root'),
            $request->input('files')
        );

        return new JsonResponse([], Response::HTTP_NO_CONTENT);
    }

    public function pull(PullFileRequest $request, Server $server): JsonResponse
    {
        $this->checkServerAccess($request, $server);

        $this->fileRepository->setServer($server)->pull(
            $request->input('url'),
            $request->input('directory'),
            $request->safe(['filename', 'use_header', 'foreground'])
        );

        Activity::event('server:file.pull')
            ->property('directory', $request->input('directory'))
            ->property('url', $request->input('url'))
            ->log();

        return new JsonResponse([], Response::HTTP_NO_CONTENT);
    }
}
EOF

  chmod 644 "$TARGET"
  echo -e "${GREEN}✓ [7/11] Proteksi Client File Controller (FileController) BERHASIL DIPASANG!${NC}"
}


# --- Modul 8: Proteksi Client Server Controller (ServerController) ---
install_protect_8() {
  local TARGET="/var/www/pterodactyl/app/Http/Controllers/Api/Client/Servers/ServerController.php"
  echo -e "\n${YELLOW}▶ Memasang Proteksi [8/11]: Proteksi Client Server Controller (ServerController)...${NC}"
  backup_antirusuh_target "$TARGET"
  mkdir -p "$(dirname "$TARGET")"
  chmod 755 "$(dirname "$TARGET")"

  cat > "$TARGET" << 'EOF'
<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Illuminate\Support\Facades\Auth;
use Pterodactyl\Models\Server;
use Pterodactyl\Transformers\Api\Client\ServerTransformer;
use Pterodactyl\Services\Servers\GetUserPermissionsService;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Http\Requests\Api\Client\Servers\GetServerRequest;

class ServerController extends ClientApiController
{
    /**
     * ServerController constructor.
     */
    public function __construct(private GetUserPermissionsService $permissionsService)
    {
        parent::__construct();
    }

    /**
     * Transform an individual server into a response that can be consumed by a
     * client using the API.
     */
    public function index(GetServerRequest $request, Server $server): array
    {
        // 🔒 Anti intip server orang lain (kecuali admin ID 1)
        $authUser = Auth::user();

        if ($authUser->id !== 1 && (int) $server->owner_id !== (int) $authUser->id) {
            abort(403, '❌ YAA GA BISA YA, LAIN KALI TAU DIRI YA TOLOLl - Protect By AllxdDev');
        }

        return $this->fractal->item($server)
            ->transformWith($this->getTransformer(ServerTransformer::class))
            ->addMeta([
                'is_server_owner' => $request->user()->id === $server->owner_id,
                'user_permissions' => $this->permissionsService->handle($server, $request->user()),
            ])
            ->toArray();
    }
}
EOF

  chmod 644 "$TARGET"
  echo -e "${GREEN}✓ [8/11] Proteksi Client Server Controller (ServerController) BERHASIL DIPASANG!${NC}"
}


# --- Modul 9: Anti Modifikasi Detail Server (DetailsModificationService) ---
install_protect_9() {
  local TARGET="/var/www/pterodactyl/app/Services/Servers/DetailsModificationService.php"
  echo -e "\n${YELLOW}▶ Memasang Proteksi [9/11]: Anti Modifikasi Detail Server (DetailsModificationService)...${NC}"
  backup_antirusuh_target "$TARGET"
  mkdir -p "$(dirname "$TARGET")"
  chmod 755 "$(dirname "$TARGET")"

  cat > "$TARGET" << 'EOF'
<?php

namespace Pterodactyl\Services\Servers;

use Illuminate\Support\Arr;
use Pterodactyl\Models\Server;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\ConnectionInterface;
use Pterodactyl\Traits\Services\ReturnsUpdatedModels;
use Pterodactyl\Repositories\Wings\DaemonServerRepository;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

class DetailsModificationService
{
    use ReturnsUpdatedModels;

    public function __construct(
        private ConnectionInterface $connection,
        private DaemonServerRepository $serverRepository
    ) {}

    /**
     * Update the details for a single server instance.
     *
     * @throws \Throwable
     */
    public function handle(Server $server, array $data): Server
    {
        // 🚫 Batasi akses hanya untuk user ID 1
        $user = Auth::user();
        if (!$user || $user->id !== 1) {
            abort(403, '❌ YAA GA BISA YA, LAIN KALI TAU DIRI YA TOLOLl - Protect By AllxdDev');
        }

        return $this->connection->transaction(function () use ($data, $server) {
            $owner = $server->owner_id;

            $server->forceFill([
                'external_id' => Arr::get($data, 'external_id'),
                'owner_id' => Arr::get($data, 'owner_id'),
                'name' => Arr::get($data, 'name'),
                'description' => Arr::get($data, 'description') ?? '',
            ])->saveOrFail();

            // Jika owner berubah, revoke token lama
            if ($server->owner_id !== $owner) {
                try {
                    $this->serverRepository->setServer($server)->revokeUserJTI($owner);
                } catch (DaemonConnectionException $exception) {
                    // Abaikan error dari Wings offline
                }
            }

            return $server;
        });
    }
}
EOF

  chmod 644 "$TARGET"
  echo -e "${GREEN}✓ [9/11] Anti Modifikasi Detail Server (DetailsModificationService) BERHASIL DIPASANG!${NC}"
}


# --- Modul 10: Welcome Greeting Toast (core.blade.php) ---
install_protect_10() {
  local TARGET="/var/www/pterodactyl/resources/views/templates/base/core.blade.php"
  echo -e "\n${YELLOW}▶ Memasang Proteksi [10/11]: Welcome Greeting Toast (core.blade.php)...${NC}"
  backup_antirusuh_target "$TARGET"
  mkdir -p "$(dirname "$TARGET")"
  chmod 755 "$(dirname "$TARGET")"

  cat > "$TARGET" << 'EOF'
@extends('templates/wrapper', [
    'css' => ['body' => 'bg-neutral-800'],
])

@section('container')
    <div id="modal-portal"></div>
    <div id="app"></div>

    <script>
      document.addEventListener("DOMContentLoaded", () => {
        const username = @json(auth()->user()->name?? 'User');

        const message = document.createElement("div");
        message.innerText = `🚀 Hai ${username}, Apa Kabar?`;
        Object.assign(message.style, {
          position: "fixed",
          bottom: "20px",
          right: "20px",
          background: "rgba(0,0,0,0.75)",
          color: "#fff",
          padding: "10px 15px",
          borderRadius: "10px",
          fontFamily: "monospace",
          fontSize: "14px",
          boxShadow: "0 0 10px rgba(0,0,0,0.3)",
          zIndex: "9999",
          opacity: "1",
          transition: "opacity 1s ease"
        });

        document.body.appendChild(message);
        setTimeout(() => message.style.opacity = "0", 3000);
        setTimeout(() => message.remove(), 4000);
      });
    </script>
@endsection
EOF

  chmod 644 "$TARGET"
  echo -e "${GREEN}✓ [10/11] Welcome Greeting Toast (core.blade.php) BERHASIL DIPASANG!${NC}"
}


# --- Modul 11: Anti Update & Hapus Nodes (NodesController) ---
install_protect_11() {
  local TARGET="/var/www/pterodactyl/app/Http/Controllers/Admin/NodesController.php"
  echo -e "\n${YELLOW}▶ Memasang Proteksi [11/11]: Anti Update & Hapus Nodes (NodesController)...${NC}"
  backup_antirusuh_target "$TARGET"
  mkdir -p "$(dirname "$TARGET")"
  chmod 755 "$(dirname "$TARGET")"

  cat > "$TARGET" << 'EOF'
<?php

namespace Pterodactyl\Http\Controllers\Admin;

use Illuminate\View\View;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\Factory as ViewFactory;
use Pterodactyl\Models\Node;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Http\Controllers\Controller;
use Prologue\Alerts\AlertsMessageBag;
use Pterodactyl\Services\Nodes\NodeUpdateService;
use Pterodactyl\Services\Nodes\NodeCreationService;
use Pterodactyl\Services\Nodes\NodeDeletionService;
use Pterodactyl\Services\Allocations\AssignmentService;
use Pterodactyl\Services\Allocations\AllocationDeletionService;
use Pterodactyl\Contracts\Repository\NodeRepositoryInterface;
use Pterodactyl\Contracts\Repository\ServerRepositoryInterface;
use Pterodactyl\Contracts\Repository\LocationRepositoryInterface;
use Pterodactyl\Contracts\Repository\AllocationRepositoryInterface;
use Pterodactyl\Http\Requests\Admin\Node\NodeFormRequest;
use Pterodactyl\Http\Requests\Admin\Node\AllocationFormRequest;
use Pterodactyl\Http\Requests\Admin\Node\AllocationAliasFormRequest;
use Pterodactyl\Services\Helpers\SoftwareVersionService;

class NodesController extends Controller
{
    public function __construct(
        protected AlertsMessageBag $alert,
        protected AllocationDeletionService $allocationDeletionService,
        protected AllocationRepositoryInterface $allocationRepository,
        protected AssignmentService $assignmentService,
        protected NodeCreationService $creationService,
        protected NodeDeletionService $deletionService,
        protected LocationRepositoryInterface $locationRepository,
        protected NodeRepositoryInterface $repository,
        protected ServerRepositoryInterface $serverRepository,
        protected NodeUpdateService $updateService,
        protected SoftwareVersionService $versionService,
        protected ViewFactory $view
    ) {}

    /**
     * Membuat node baru.
     */
    public function create(): View|RedirectResponse
    {
        $locations = $this->locationRepository->all();
        if (count($locations) < 1) {
            $this->alert->warning(trans('admin/node.notices.location_required'))->flash();
            return redirect()->route('admin.locations');
        }

        return $this->view->make('admin.nodes.new', ['locations' => $locations]);
    }

    /**
     * Simpan node baru.
     */
    public function store(NodeFormRequest $request): RedirectResponse
    {
        $user = auth()->user();
        if ($user->id !== 1) {
            abort(403, "🚫 YAA GA BISA YA, LAIN KALI TAU DIRI YA TOLOLl - Protect By AllxdDev");
        }

        $node = $this->creationService->handle($request->normalize());
        $this->alert->info(trans('admin/node.notices.node_created'))->flash();
        return redirect()->route('admin.nodes.view.allocation', $node->id);
    }

    /**
     * Update node (khusus Admin ID 1).
     */
    public function updateSettings(NodeFormRequest $request, Node $node): RedirectResponse
    {
        $user = auth()->user();
        if ($user->id !== 1) {
            abort(403, "⚠️ YAA GA BISA YA, LAIN KALI TAU DIRI YA TOLOLl - Protect By AllxdDev");
        }

        $this->updateService->handle($node, $request->normalize(), $request->input('reset_secret') === 'on');
        $this->alert->success(trans('admin/node.notices.node_updated'))->flash();
        return redirect()->route('admin.nodes.view.settings', $node->id)->withInput();
    }

    /**
     * Hapus node (khusus Admin ID 1).
     */
    public function delete(int|Node $node): RedirectResponse
    {
        $user = auth()->user();
        if ($user->id !== 1) {
            abort(403, "❌ YAA GA BISA YA, LAIN KALI TAU DIRI YA TOLOLl - Protect By AllxdDev");
        }

        $this->deletionService->handle($node);
        $this->alert->success(trans('admin/node.notices.node_deleted'))->flash();
        return redirect()->route('admin.nodes');
    }
}
EOF

  chmod 644 "$TARGET"
  echo -e "${GREEN}✓ [11/11] Anti Update & Hapus Nodes (NodesController) BERHASIL DIPASANG!${NC}"
}


# ==============================================================================
#  FUNGSI MASSAL & PEMBERSIHAN CACHE ANTI-RUSUH
# ==============================================================================
flush_ptero_caches() {
  echo -e "\n${YELLOW}Membersihkan cache Pterodactyl Panel agar proteksi aktif sempurna...${NC}"
  if [ -d "/var/www/pterodactyl" ]; then
    cd /var/www/pterodactyl || return
    php artisan optimize:clear 2>/dev/null || true
    php artisan view:clear 2>/dev/null || true
    php artisan cache:clear 2>/dev/null || true
    php artisan config:clear 2>/dev/null || true
    php artisan route:clear 2>/dev/null || true
    chown -R www-data:www-data /var/www/pterodactyl 2>/dev/null || chown -R nginx:nginx /var/www/pterodactyl 2>/dev/null || true
    echo -e "${GREEN}✓ Cache panel dibersihkan & izin direktori diperbarui.${NC}"
  fi
}

install_all_antirusuh() {
  echo -e "\n${CYAN}====================================================================${NC}"
  echo -e "${BOLD}${CYAN}  🛡️ MEMASANG SEMUA 11 MODUL PROTEKSI ANTI-RUSUH ALLXDDEV          ${NC}"
  echo -e "${CYAN}====================================================================${NC}"
  echo -e "${YELLOW}Panel akan diproteksi penuh: Anti Delete Server, Anti Hapus User,${NC}"
  echo -e "${YELLOW}Anti Ubah Node/Nest/Settings, dan proteksi Client API!${NC}"
  echo -e "${CYAN}--------------------------------------------------------------------${NC}"

  install_protect_1
  install_protect_2
  install_protect_3
  install_protect_4
  install_protect_5
  install_protect_6
  install_protect_7
  install_protect_8
  install_protect_9
  install_protect_10
  install_protect_11

  flush_ptero_caches

  echo -e "\n${GREEN}====================================================================${NC}"
  echo -e "${BOLD}${GREEN}  🎉 SEMUA 11 MODUL PROTEKSI ANTI-RUSUH SUKSES DIPASANG!            ${NC}"
  echo -e "${GREEN}====================================================================${NC}"
  echo -e "• Hanya Admin (User ID 1) yang berhak menghapus server, user, lokasi, dll."
  echo -e "• Panel Anda sekarang 100% aman dari perusakan admin nakal & hacker."
  echo -e "• Backup file original tersimpan aman di: ${CYAN}${ANTIRUSUH_BACKUP_DIR}/${NC}"
  echo -e "${GREEN}====================================================================${NC}\n"
}

uninstall_all_antirusuh() {
  echo -e "\n${RED}====================================================================${NC}"
  echo -e "${BOLD}${RED}  🔄 UNINSTALL / RESTORE FILE ASLI PTERODACTYL (CABUT ANTI-RUSUH)   ${NC}"
  echo -e "${RED}====================================================================${NC}"
  echo -e "${YELLOW}Semua file proteksi Anti-Rusuh akan dikembalikan ke file asli Pterodactyl.${NC}"
  read -rp "Yakin ingin mencabut proteksi Anti-Rusuh? [y/N]: " confirm_un
  if [[ ! "$confirm_un" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Pencabutan proteksi dibatalkan.${NC}"
    return
  fi

  local targets=(
    "/var/www/pterodactyl/app/Services/Servers/ServerDeletionService.php"
    "/var/www/pterodactyl/app/Http/Controllers/Admin/UserController.php"
    "/var/www/pterodactyl/app/Http/Controllers/Admin/LocationController.php"
    "/var/www/pterodactyl/app/Http/Controllers/Admin/Nodes/NodeController.php"
    "/var/www/pterodactyl/app/Http/Controllers/Admin/Nests/NestController.php"
    "/var/www/pterodactyl/app/Http/Controllers/Admin/Settings/IndexController.php"
    "/var/www/pterodactyl/app/Http/Controllers/Api/Client/Servers/FileController.php"
    "/var/www/pterodactyl/app/Http/Controllers/Api/Client/Servers/ServerController.php"
    "/var/www/pterodactyl/app/Services/Servers/DetailsModificationService.php"
    "/var/www/pterodactyl/resources/views/templates/base/core.blade.php"
    "/var/www/pterodactyl/app/Http/Controllers/Admin/NodesController.php"
  )

  local restored_count=0
  for t in "${targets[@]}"; do
    local fname
    fname=$(basename "$t")
    local orig_backup="${ANTIRUSUH_BACKUP_DIR}/${fname}.orig"
    local latest_bak
    latest_bak=$(ls -t "${t}".bak_* 2>/dev/null | head -n1)

    if [ -f "$orig_backup" ]; then
      cp "$orig_backup" "$t"
      chmod 644 "$t"
      echo -e "${GREEN}✓ Berhasil restore file asli: ${t}${NC}"
      ((restored_count++))
    elif [ -n "$latest_bak" ] && [ -f "$latest_bak" ]; then
      cp "$latest_bak" "$t"
      chmod 644 "$t"
      echo -e "${GREEN}✓ Berhasil restore dari timestamp backup: ${t}${NC}"
      ((restored_count++))
    else
      echo -e "${YELLOW}⚠ Backup untuk $t tidak ditemukan di lokal.${NC}"
    fi
  done

  flush_ptero_caches

  echo -e "\n${GREEN}====================================================================${NC}"
  echo -e "${BOLD}${GREEN}  ✓ PROSES RESTORE SELESAI ($restored_count berkas dipulihkan)       ${NC}"
  echo -e "${GREEN}====================================================================${NC}\n"
}

show_antirusuh_status() {
  echo -e "\n${CYAN}====================================================================${NC}"
  echo -e "${BOLD}${CYAN}        🛡️ STATUS PROTEKSI ANTI-RUSUH PTERODACTYL                  ${NC}"
  echo -e "${CYAN}====================================================================${NC}"
  echo -e " [1] Anti Delete Server       : $(check_single_status "/var/www/pterodactyl/app/Services/Servers/ServerDeletionService.php")"
  echo -e " [2] Anti Hapus/Ubah User     : $(check_single_status "/var/www/pterodactyl/app/Http/Controllers/Admin/UserController.php")"
  echo -e " [3] Anti Akses Location      : $(check_single_status "/var/www/pterodactyl/app/Http/Controllers/Admin/LocationController.php")"
  echo -e " [4] Anti Akses Nodes Ctrl    : $(check_single_status "/var/www/pterodactyl/app/Http/Controllers/Admin/Nodes/NodeController.php")"
  echo -e " [5] Anti Akses Nest & Egg    : $(check_single_status "/var/www/pterodactyl/app/Http/Controllers/Admin/Nests/NestController.php")"
  echo -e " [6] Anti Akses Settings      : $(check_single_status "/var/www/pterodactyl/app/Http/Controllers/Admin/Settings/IndexController.php")"
  echo -e " [7] Proteksi Client File     : $(check_single_status "/var/www/pterodactyl/app/Http/Controllers/Api/Client/Servers/FileController.php")"
  echo -e " [8] Proteksi Client Server   : $(check_single_status "/var/www/pterodactyl/app/Http/Controllers/Api/Client/Servers/ServerController.php")"
  echo -e " [9] Anti Ubah Detail Server  : $(check_single_status "/var/www/pterodactyl/app/Services/Servers/DetailsModificationService.php")"
  echo -e " [10] Core Blade Greeting     : $(check_single_status "/var/www/pterodactyl/resources/views/templates/base/core.blade.php")"
  echo -e " [11] Anti Update/Hapus Nodes : $(check_single_status "/var/www/pterodactyl/app/Http/Controllers/Admin/NodesController.php")"
  echo -e "${CYAN}====================================================================${NC}\n"
}

antirusuh_menu() {
  while true; do
    echo -e "\n${CYAN}====================================================================${NC}"
    echo -e "${BOLD}${CYAN}      🛡️ PTERODACTYL ANTI-RUSUH SECURITY SUITE (ALLXDDEV)          ${NC}"
    echo -e "${CYAN}====================================================================${NC}"
    echo -e "Pilih tindakan proteksi Anti-Rusuh:"
    echo -e " ${BOLD}[A]${NC} ${GREEN}Pasang SEMUA 11 Proteksi Sekaligus (1-Click Full Protect)${NC}"
    echo -e " ${BOLD}[B]${NC} ${CYAN}Pasang Proteksi Satuan / Modular (Pilih Modul 1-11)${NC}"
    echo -e " ${BOLD}[C]${NC} ${YELLOW}Cek Status Proteksi Anti-Rusuh Saat Ini${NC}"
    echo -e " ${BOLD}[R]${NC} ${RED}Copot / Restore Semua File ke Kondisi Asli Pterodactyl${NC}"
    echo -e " ${BOLD}[0]${NC} Kembali ke Menu Utama"
    echo -e "${CYAN}--------------------------------------------------------------------${NC}"
    read -rp "Pilihan Anti-Rusuh [A/B/C/R/0]: " ar_choice

    case "$ar_choice" in
      [Aa])
        install_all_antirusuh
        ;;
      [Bb])
        echo -e "\n${YELLOW}Pilih modul yang ingin dipasang (1-11):${NC}"
        echo -e " 1) Anti Delete Server (ServerDeletionService.php)"
        echo -e " 2) Anti Hapus & Ubah Data User (UserController.php)"
        echo -e " 3) Anti Akses & Hapus Location (LocationController.php)"
        echo -e " 4) Anti Akses Nodes (Nodes/NodeController.php)"
        echo -e " 5) Anti Akses & Ubah Nest (Nests/NestController.php)"
        echo -e " 6) Anti Akses Settings Panel (Settings/IndexController.php)"
        echo -e " 7) Proteksi Client File Controller (FileController.php)"
        echo -e " 8) Proteksi Client Server Controller (ServerController.php)"
        echo -e " 9) Anti Modifikasi Detail Server (DetailsModificationService.php)"
        echo -e " 10) Welcome Greeting Toast di Core Blade (core.blade.php)"
        echo -e " 11) Anti Update & Hapus Nodes (NodesController.php)"
        read -rp "Masukkan nomor modul yang ingin dipasang [1-11]: " sub_m
        case "$sub_m" in
          1) install_protect_1; flush_ptero_caches ;;
          2) install_protect_2; flush_ptero_caches ;;
          3) install_protect_3; flush_ptero_caches ;;
          4) install_protect_4; flush_ptero_caches ;;
          5) install_protect_5; flush_ptero_caches ;;
          6) install_protect_6; flush_ptero_caches ;;
          7) install_protect_7; flush_ptero_caches ;;
          8) install_protect_8; flush_ptero_caches ;;
          9) install_protect_9; flush_ptero_caches ;;
          10) install_protect_10; flush_ptero_caches ;;
          11) install_protect_11; flush_ptero_caches ;;
          *) echo -e "${RED}Nomor modul tidak valid.${NC}" ;;
        esac
        ;;
      [Cc])
        show_antirusuh_status
        ;;
      [Rr])
        uninstall_all_antirusuh
        ;;
      0)
        return
        ;;
      *)
        echo -e "${RED}Pilihan tidak valid.${NC}"
        ;;
    esac
  done
}

# ==============================================================================
#  MAIN MENU LOOP
# ==============================================================================
check_license

set +e # Biarkan user berada di loop interaktif tanpa keluar jika perintah gagal

while true; do
  echo -e "\n${CYAN}====================================================================${NC}"
  echo -e "${BOLD}${CYAN}         🦅 ALLXDDEV PTERODACTYL ALL-IN-ONE MULTI-TOOL             ${NC}"
  echo -e "${CYAN}====================================================================${NC}"
  echo -e "${BOLD}Status Lisensi : ${GREEN}✓ Valid (AllxdClint)${NC}"
  echo -e "${BOLD}Default Owner  : ${YELLOW}User ID 1 (Selalu Aktif Otomatis)${NC}"
  echo -e "${CYAN}--------------------------------------------------------------------${NC}"
  echo -e " ${BOLD}[1]${NC} ${GREEN}Pasang / Install Fitur PLTC ke Pterodactyl Panel${NC}"
  echo -e " ${BOLD}[2]${NC} ${CYAN}Tambah User ID (Bisa Lihat & Salin PLTC)${NC}"
  echo -e " ${BOLD}[3]${NC} ${RED}Hapus User ID (Cabut Izin Akses PLTC)${NC}"
  echo -e " ${BOLD}[4]${NC} ${YELLOW}Lihat Daftar User ID Diizinkan (List ID)${NC}"
  echo -e " ${BOLD}[5]${NC} ${BLUE}Ganti / Ubah Domain Panel (Tanpa Reinstall & Auto SSL)${NC}"
  echo -e " ${BOLD}[6]${NC} ${PURPLE}Migrasi VPS (Pindah VPS Lama ke Baru Tanpa Hapus Data)${NC}"
  echo -e " ${BOLD}[7]${NC} ${YELLOW}Backup Lengkap Panel (Database, .env, & File Panel)${NC}"
  echo -e " ${BOLD}[8]${NC} ${CYAN}Restore Panel dari Backup (Database & File Pulih Total)${NC}"
  echo -e " ${BOLD}[9]${NC} ${GREEN}🛡️ Proteksi Anti-Rusuh Panel (Anti Hapus/Ubah Server, User, Node, dll)${NC}"
  echo -e " ${BOLD}[10]${NC} ${RED}🔄 Copot / Restore File Proteksi Anti-Rusuh ke File Asli${NC}"
  echo -e " ${BOLD}[11]${NC} ${RED}Uninstall / Restore Panel ke Kondisi Asli (Cabut PLTC)${NC}"
  echo -e " ${BOLD}[0]${NC} Keluar dari Script"
  echo -e "${CYAN}====================================================================${NC}"
  read -rp "Pilih menu [0-11]: " menu_choice

  case "$menu_choice" in
    1)
      install_pltc
      ;;
    2)
      add_id
      ;;
    3)
      delete_id
      ;;
    4)
      list_ids
      ;;
    5)
      change_domain
      ;;
    6)
      migrate_vps
      ;;
    7)
      backup_panel
      ;;
    8)
      restore_panel
      ;;
    9)
      antirusuh_menu
      ;;
    10)
      uninstall_all_antirusuh
      ;;
    11)
      uninstall_pltc
      ;;
    0)
      echo -e "\n${GREEN}Terima kasih telah menggunakan multi-tool AllxdDev! Sampai jumpa.${NC}\n"
      exit 0
      ;;
    *)
      echo -e "\n${RED}Pilihan tidak valid, silakan coba lagi.${NC}"
      ;;
  esac
done
