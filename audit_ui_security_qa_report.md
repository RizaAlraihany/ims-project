# Laporan Audit Aplikasi IMS

## Ringkasan eksekutif

Audit ini meninjau aplikasi dari tiga sudut: UI/UX, keamanan aplikasi, dan strategi pengujian. Stack yang terlihat adalah `React 19 + Vite` di frontend dan `Laravel 13 + Sanctum` di backend.

Kesimpulan utama:

- Fondasi visual aplikasi sudah rapi dan konsisten secara warna, tetapi masih terasa “template-heavy” dan belum sepenuhnya premium untuk produk operasional enterprise.
- Temuan keamanan paling serius ada pada otorisasi backend yang belum ditegakkan secara granular di server, serta penyimpanan bearer token di `localStorage`.
- Pengujian frontend masih terlalu tipis dibanding luas fitur. Backend memiliki cukup banyak feature test, tetapi hampir tidak ada bukti pengujian negatif untuk kontrol akses berbasis role/permission.

## Metode audit

Audit ini berbasis:

- pembacaan struktur kode frontend dan backend
- penelusuran pola rawan keamanan dan kualitas
- verifikasi render halaman login melalui browser lokal
- eksekusi `npm test` pada frontend: 3 file test, 6 test, seluruhnya lulus
- eksekusi `npm run build` pada frontend: lulus

Keterbatasan:

- backend tidak dapat dijalankan penuh di environment audit ini karena `composer` tidak tersedia
- karena itu, verifikasi backend dilakukan dari pembacaan route, controller, request validation, service, seed, dan konfigurasi deploy

---

## Prioritas temuan

### Kritis / tinggi

#### F-SEC-001 — Otorisasi server-side belum ditegakkan untuk aksi sensitif

- Severity: High
- Area: AppSec
- Lokasi utama:
  - `backend/routes/api.php:23-80`
  - `backend/routes/api.php:92-143`
  - `backend/app/Http/Controllers/API/UserController.php:13-74`
  - `backend/app/Http/Controllers/API/RoleController.php:13-48`
  - `backend/app/Http/Controllers/API/SettingController.php:12-39`
  - `backend/app/Http/Controllers/API/TransferController.php:15-107`
  - `backend/app/Http/Controllers/API/StockOpnameController.php:17-88`
  - `backend/app/Http/Requests/API/UserManagementRequest.php:11-31`
  - `backend/app/Http/Requests/API/SettingsUpdateRequest.php:9-23`
  - `backend/app/Http/Requests/API/RolePermissionSyncRequest.php:9-22`

- Bukti:
  - Semua endpoint sensitif hanya dibungkus `auth:sanctum`, tanpa middleware `permission` atau policy yang terlihat di route.
  - Beberapa request class yang mengendalikan operasi administratif mengembalikan `authorize(): true`.
  - Controller administratif seperti user, role permission, settings, transfer state change, dan stock opname approval tidak menunjukkan pemeriksaan permission eksplisit.

- Dampak:
  - User yang sudah login berpotensi melakukan aksi di luar hak akses UI-nya, termasuk mengubah user, permission role, setting, dan state transaksi, jika mereka memanggil API secara langsung.

- Analisis:
  - Frontend memang memiliki guard berbasis permission, misalnya `frontend/src/components/layout/PermissionGuard.jsx:4-24` dan `frontend/src/components/layout/ProtectedRoute.jsx:4-18`, tetapi itu hanya kontrol presentasi.
  - Pada model peran, seed permission sudah didefinisikan jelas di `backend/database/seeders/RolePermissionSeeder.php:15-140`, sehingga ketiadaan enforcement di server menjadi gap yang nyata.

- Rekomendasi:
  - Terapkan otorisasi di backend menggunakan policy, gate, atau middleware permission pada setiap endpoint sensitif.
  - Minimal, kunci endpoint berikut: users, roles, settings, transfer approval/transit/receive/complete/reject, stock opname approve, report export, audit log.
  - Tambahkan test negatif `403 Forbidden` untuk setiap role penting.

- Mitigasi cepat:
  - Prioritaskan `UserController`, `RoleController`, `SettingController`, dan lifecycle transfer karena dampaknya paling tinggi.

---

#### F-SEC-002 — Bearer token disimpan di `localStorage`

- Severity: High
- Area: AppSec
- Lokasi:
  - `frontend/src/store/authStorage.js:1-34`
  - `frontend/src/hooks/AuthProvider.jsx:6-46`
  - `frontend/src/api/axiosClient.js:11-18`

- Bukti:
  - Token diambil dari `localStorage` melalui `getStoredToken()`.
  - Token disimpan ke `localStorage` pada `storeSession()`.
  - Axios menambahkan header `Authorization: Bearer ...` dari token yang disimpan di browser.

- Dampak:
  - Jika terjadi XSS atau injeksi skrip pihak ketiga, access token dapat dicuri dan digunakan untuk mengambil alih sesi pengguna.

- Analisis:
  - Backend sudah memakai Sanctum, tetapi pola yang dipakai di frontend adalah bearer token persisten, bukan cookie `HttpOnly`.
  - Ini memperbesar blast radius bila ada bug XSS atau supply-chain issue di frontend.

- Rekomendasi:
  - Pindahkan sesi ke cookie `HttpOnly` + `SameSite` dengan alur Sanctum SPA yang benar, atau minimal pakai token in-memory dengan masa hidup pendek dan refresh flow yang aman.
  - Jika tetap mempertahankan bearer token, batasi lifetime token, rotasi token, dan tambahkan proteksi XSS/CSP yang ketat.

---

#### F-SEC-003 — Permukaan admin dan pengaturan sistem bisa terekspos ke semua user login

- Severity: High
- Area: AppSec
- Lokasi:
  - `backend/app/Http/Controllers/API/SettingController.php:12-39`
  - `backend/app/Http/Controllers/API/RoleController.php:13-48`
  - `backend/app/Http/Controllers/API/UserController.php:13-74`
  - `backend/database/seeders/DatabaseSeeder.php:400-420`

- Bukti:
  - Endpoint settings mengembalikan seluruh pasangan `key`/`value`.
  - Seeder menunjukkan settings operasional seperti `security.session_timeout_minutes`, `backup.schedule`, `api.rate_limit_per_minute`, dan `api.token_rotation_days`.
  - Tidak terlihat pembatasan role/permission di endpoint tersebut.

- Dampak:
  - Informasi operasional dan konfigurasi sistem dapat dibaca atau diubah oleh user yang seharusnya tidak memiliki akses.

- Rekomendasi:
  - Pisahkan `setting.view` dan `setting.update` sebagai enforcement backend nyata.
  - Kelompokkan settings sensitif dan sembunyikan dari role non-admin.
  - Audit semua endpoint yang bersifat “master/control plane”.

---

### Menengah

#### F-SEC-004 — Login tidak menunjukkan rate limiting eksplisit

- Severity: Medium
- Area: AppSec
- Lokasi:
  - `backend/routes/api.php:21`
  - `backend/routes/api.php:84`
  - `backend/app/Http/Controllers/API/AuthController.php:16-45`
  - `backend/bootstrap/app.php:16-20`

- Bukti:
  - Endpoint login didefinisikan langsung tanpa middleware throttle yang terlihat.
  - `AuthController@login()` tidak menunjukkan pembatasan percobaan.
  - Terdapat setting seeded `api.rate_limit_per_minute`, tetapi tidak terlihat digunakan sebagai kontrol runtime.

- Dampak:
  - Percobaan brute-force atau credential stuffing terhadap endpoint login menjadi lebih mudah.

- Rekomendasi:
  - Tambahkan `throttle` khusus login atau `RateLimiter::for('login', ...)`.
  - Log percobaan gagal dan tambahkan cooldown adaptif per email/IP.

---

#### F-SEC-005 — Tidak terlihat CSP, sementara frontend memuat aset eksternal

- Severity: Medium
- Area: AppSec
- Lokasi:
  - `frontend/src/pages/auth/Login.jsx:99-105`
  - `frontend/index.html:1-12`
  - `deploy/nginx/ims-project.conf:26-29`
  - `deploy/nginx/ims-project.conf:55-57`

- Bukti:
  - Halaman login memuat noise background dari `https://grainy-gradients.vercel.app/noise.svg`.
  - `index.html` tidak memasang meta CSP.
  - Konfigurasi Nginx hanya menambahkan `X-Frame-Options`, `X-Content-Type-Options`, dan `Referrer-Policy`; tidak terlihat `Content-Security-Policy`.

- Dampak:
  - Proteksi defense-in-depth terhadap XSS dan supply-chain injection lebih lemah dari yang seharusnya.

- Rekomendasi:
  - Self-host aset dekoratif atau pindahkan ke asset lokal.
  - Tambahkan CSP di layer Nginx untuk frontend dan backend.
  - Batasi `img-src`, `script-src`, `connect-src`, dan `frame-ancestors`.

- Catatan:
  - Ini bukan bukti XSS aktif, tetapi baseline hardening modern masih kurang.

---

#### F-SEC-006 — Kredensial demo diprefill di form login

- Severity: Medium
- Area: AppSec / UI
- Lokasi:
  - `frontend/src/pages/auth/Login.jsx:16-20`
  - `backend/database/seeders/DatabaseSeeder.php:41-72`

- Bukti:
  - Form login otomatis memuat `admin@ims.test` dan `password`.
  - Seeder juga membuat akun demo dengan password `password`.

- Dampak:
  - Pada environment yang salah konfigurasi, ini meningkatkan risiko akses tidak sah.
  - Dari sisi UX, ini juga menurunkan persepsi keamanan dan profesionalisme bila tampil di environment non-demo.

- Rekomendasi:
  - Prefill hanya aktif di mode demo/dev.
  - Tambahkan banner eksplisit “demo only”.
  - Pastikan seeder demo tidak dipakai di production.

---

## Audit visual dan UI/UX

### Temuan visual utama

#### F-UX-001 — Navigasi mobile tampak belum selesai

- Severity: High
- Lokasi:
  - `frontend/src/components/layout/TopHeader.jsx:91-99`
  - `frontend/src/components/layout/BottomNav.jsx:6-35`

- Bukti:
  - Tombol menu mobile di header tidak memiliki `onClick`, sehingga secara implementasi tampak tidak membuka sidebar atau drawer apa pun.
  - Bottom navigation hanya memiliki 4 item dan tidak mencakup area penting seperti report, audit, opname, atau settings.

- Dampak:
  - Pengguna mobile berisiko kehilangan akses ke navigasi utama.
  - Discoverability fitur penting menurun drastis di perangkat kecil.

- Rekomendasi:
  - Jadikan tombol menu mobile benar-benar membuka nav drawer.
  - Tambahkan struktur navigasi mobile yang mencakup report, stock opname, audit, dan settings.
  - Pastikan semua entry point fitur kritikal tersedia di mobile.

---

#### F-UX-002 — Beberapa navigasi memakai anchor biasa, bukan routing SPA

- Severity: Medium
- Lokasi:
  - `frontend/src/pages/dashboard/Dashboard.jsx:273`
  - `frontend/src/pages/dashboard/Dashboard.jsx:319`
  - `frontend/src/pages/dashboard/Dashboard.jsx:331`

- Bukti:
  - Link dashboard ke inventory dan audit menggunakan `<a href="/...">`, bukan `Link`/`NavLink`.

- Dampak:
  - Perpindahan halaman bisa menyebabkan full page reload.
  - State lokal, query, dan nuansa navigasi SPA menjadi kurang halus.

- Rekomendasi:
  - Ganti dengan `Link` dari `react-router-dom`.
  - Pertahankan history dan transisi aplikasi secara konsisten.

---

#### F-UX-003 — Dashboard terlalu card-heavy dan belum terasa premium

- Severity: Medium
- Lokasi:
  - `frontend/src/pages/dashboard/Dashboard.jsx:135-236`
  - `frontend/src/index.css:100-126`
  - `frontend/src/components/layout/MainLayout.jsx:320-324`

- Bukti:
  - Dashboard menggunakan deretan kartu KPI yang pola visualnya sangat seragam dan repetitif.
  - Banyak area masih mengandalkan kotak putih + border + radius besar sebagai pola utama.

- Dampak:
  - Tampilan terasa aman dan rapi, tetapi belum memiliki hierarki visual yang kuat.
  - First impression lebih dekat ke dashboard template daripada produk operasional premium.

- Rekomendasi:
  - Kurangi jumlah card treatment yang tidak perlu.
  - Buat satu area fokus utama di viewport pertama: misalnya status operasional hari ini + alert kritikal.
  - Gunakan perbedaan skala, alignment, dan density, bukan hanya pengulangan kartu.
  - Perjelas prioritas visual antara KPI, chart, dan daftar aktivitas.

---

#### F-UX-004 — Branding masih generik dan kurang matang

- Severity: Medium
- Lokasi:
  - `frontend/index.html:7`
  - `frontend/src/index.css:11-24`
  - `frontend/src/components/layout/MainLayout.jsx:283-285`

- Bukti:
  - Judul HTML masih `frontend`.
  - Tipografi masih memakai `Inter` generik.
  - Brand surface internal sudah punya nama `IMS Pro`, tetapi shell aplikasi dan metadata belum konsisten.

- Dampak:
  - Produk terasa seperti masih tahap internal/dev.
  - Persepsi kualitas turun meskipun komponen sudah cukup rapi.

- Rekomendasi:
  - Ganti title dokumen dengan nama produk yang benar.
  - Naikkan kualitas sistem tipografi: display font untuk heading atau setidaknya pairing yang lebih khas.
  - Konsistenkan tone brand di login, header, favicon, dan metadata.

---

#### F-UX-005 — Error state masih fungsional, tetapi kurang memberi arah

- Severity: Low
- Lokasi:
  - `frontend/src/pages/auth/Login.jsx:83-87`
  - hasil render aktual pada halaman login menunjukkan pesan `Login gagal. Periksa koneksi API.`

- Bukti:
  - Saat API tidak tersedia, user hanya menerima error text sederhana tanpa opsi lanjut.

- Dampak:
  - Dalam kondisi outage, pengalaman terasa mentok.

- Rekomendasi:
  - Tambahkan state kosong/error yang lebih membantu: status API, tombol retry, dan petunjuk singkat.

---

## Rekomendasi desain konkret

- Kurangi dominasi kartu putih ber-border pada dashboard; jadikan hanya area yang benar-benar interaktif sebagai card.
- Ubah viewport pertama dashboard menjadi satu fokus operasional utama, misalnya “critical stock & pending transfers”.
- Perkuat hierarki teks: heading lebih khas, subheading lebih pendek, label KPI lebih tenang.
- Selesaikan mobile navigation terlebih dahulu; ini gap UX paling nyata.
- Ganti semua navigasi internal ke router link agar alurnya terasa lebih native.
- Rapikan metadata dan branding: title, favicon, nama aplikasi, dan gaya tipografi.
- Hapus prefill kredensial dari login production dan ubah panel kanan login agar lebih informatif daripada sekadar dekoratif.

---

## Audit strategi pengujian

### Kondisi saat ini

- Frontend:
  - hanya ada 3 file test:
    - `frontend/src/components/layout/ProtectedRoute.test.jsx`
    - `frontend/src/api/axiosClient.test.js`
    - `frontend/src/pages/inventory/StockMovementForm.test.jsx`
  - total test yang dieksekusi: 6, seluruhnya lulus
  - tidak terlihat suite E2E yang aktif

- Backend:
  - terdapat banyak feature test untuk domain utama
  - namun pencarian tidak menunjukkan test negatif yang jelas untuk `403 Forbidden` atau enforcement permission

### Gap pengujian utama

#### F-QA-001 — Tidak ada bukti pengujian role/permission yang benar-benar melindungi backend

- Severity: High
- Bukti:
  - Pencarian di `backend/tests` tidak menunjukkan `assertForbidden` atau pola pengujian penolakan akses.
  - Justru controller sensitif tidak menunjukkan enforcement backend yang kuat.

- Dampak:
  - Sistem bisa “tampak aman di UI”, tetapi gagal total ketika API dipanggil langsung.

- Rekomendasi:
  - Tambahkan negative authorization tests untuk setiap role penting.

---

#### F-QA-002 — Frontend belum memiliki E2E untuk alur bisnis lintas layar

- Severity: High
- Bukti:
  - Tidak ada konfigurasi Playwright/Cypress yang digunakan aktif dalam repo.
  - Padahal aplikasi memiliki banyak flow kompleks: login, transfer, stock opname, report, notification, mobile nav.

- Dampak:
  - Regresi integrasi dan bug alur pengguna akan sulit tertangkap.

- Rekomendasi:
  - Tambahkan Playwright E2E untuk happy path dan permission path utama.

---

#### F-QA-003 — Error handling dan outage scenarios belum terlihat diuji

- Severity: Medium
- Bukti:
  - Pada login, error hanya diuji secara runtime manual saat API tidak tersedia.
  - Tidak terlihat test UI untuk API timeout, 500 error, empty state, atau network failure.

- Rekomendasi:
  - Uji API failure state pada login, dashboard, report, notifications, dan settings.

---

## Rencana pengujian yang disarankan

### 1. Login dan sesi

#### Positive cases

- User valid dapat login dan diarahkan ke dashboard.
- User valid dapat refresh halaman dan tetap tersesi.
- Logout menghapus sesi dan mengarahkan kembali ke login.

#### Negative cases

- Email salah.
- Password salah.
- Akun nonaktif.
- Token kedaluwarsa saat membuka halaman terlindungi.
- API login timeout atau `500`.

#### Edge cases

- Form submit ganda saat loading.
- Token di storage korup atau JSON user rusak.
- User login tetapi permission array kosong.

#### Automation

- Unit: util auth storage dan parser error
- Integration: `AuthProvider`, `ProtectedRoute`, login form
- E2E: login, refresh, logout, redirect after session expiry

---

### 2. User/role/settings admin

#### Positive cases

- Super admin dapat melihat users, roles, permissions, settings.
- Super admin dapat update permission role dan update setting.

#### Negative cases

- Operator tidak boleh melihat users/settings.
- Auditor tidak boleh mengubah role permission.
- User biasa tidak boleh menghapus user.

#### Edge cases

- Request langsung ke endpoint admin lewat API client tanpa akses UI.
- Payload update setting berisi key tak dikenal atau duplikat.
- Perubahan role user aktif sendiri saat sedang login.

#### Automation

- Backend integration/feature tests wajib dengan `assertForbidden`
- E2E untuk jalur admin inti

---

### 3. Transfer stock lifecycle

#### Positive cases

- User berwenang membuat transfer valid.
- Approver berwenang meng-approve transfer.
- Transfer bisa masuk transit, receive, lalu complete.

#### Negative cases

- Warehouse asal dan tujuan sama.
- Quantity nol atau negatif.
- Product duplikat dalam item transfer.
- User tanpa permission mencoba approve/reject/complete.

#### Edge cases

- Double submit pada create transfer.
- Dua user mengubah transfer yang sama hampir bersamaan.
- Transfer diterima saat status belum transit.
- Transfer diselesaikan dua kali.

#### Automation

- Backend feature tests untuk state machine
- E2E untuk create -> approve -> receive -> complete

---

### 4. Stock opname

#### Positive cases

- User membuat sesi opname.
- User menyimpan item hitung.
- Approver menyetujui opname dan stok tersesuaikan.

#### Negative cases

- Product tidak ada.
- Physical qty negatif.
- User tanpa permission mencoba approve.

#### Edge cases

- Dua user mengedit item opname yang sama.
- Approve saat belum ada item.
- Approve dua kali.

#### Automation

- Backend feature tests untuk constraint dan race-like transition
- E2E untuk alur create -> count -> approve

---

### 5. Reporting dan export

#### Positive cases

- Filter warehouse, category, status, date range menghasilkan data benar.
- Export CSV menghasilkan kolom sesuai jenis report.
- Print/PDF membuka tampilan cetak yang benar.

#### Negative cases

- Filter kombinasi yang tidak valid.
- Export ketika data kosong.
- API reports gagal saat export.

#### Edge cases

- Dataset besar mendekati `per_page: 1000`.
- Karakter khusus pada data CSV.
- Pagination di halaman terakhir lalu filter berubah.

#### Automation

- Unit: formatter CSV
- Integration: filter state + query params
- E2E: report filter + export CSV + print flow

---

### 6. Mobile navigation dan layout

#### Positive cases

- Semua menu utama bisa diakses pada mobile.
- Bottom nav dan header tidak menutupi CTA penting.

#### Negative cases

- Tombol menu mobile tidak merespons.
- User terjebak karena route penting tidak tersedia di mobile nav.

#### Edge cases

- Device kecil dengan keyboard terbuka.
- Landscape mode.
- Scroll panjang dengan sticky header + bottom nav.

#### Automation

- E2E viewport mobile wajib

---

## Urutan perbaikan yang disarankan

1. Terapkan otorisasi backend berbasis permission untuk endpoint sensitif.
2. Migrasikan auth dari bearer token di `localStorage` ke model sesi yang lebih aman.
3. Tambahkan rate limiting login.
4. Selesaikan mobile navigation dan hilangkan link internal berbasis anchor.
5. Tambahkan E2E untuk alur login, transfer, stock opname, settings, dan reports.
6. Perkuat UI dashboard agar lebih fokus dan kurang template-like.
7. Tambahkan CSP dan hilangkan aset eksternal yang tidak perlu.

## Penutup

Secara umum, aplikasi ini sudah memiliki struktur domain yang cukup matang dan visual baseline yang rapi. Namun, gap terbesar ada pada keamanan otorisasi backend dan cakupan pengujian terhadap alur hak akses serta flow bisnis lintas halaman.

Jika dilanjutkan, tahap paling bernilai adalah:

- memperbaiki temuan `F-SEC-001` dan `F-SEC-002` terlebih dahulu
- lalu membuat test negatif permission dan suite E2E inti
- setelah itu merapikan pengalaman mobile dan hierarki visual dashboard
