# IMS Project - Inventory Management System Multi-Gudang

IMS Project adalah aplikasi inventory multi-gudang berbasis React dan Laravel untuk mengelola produk, gudang, stok, mutasi barang, transfer antar gudang, stock opname, audit trail, dan laporan operasional.

Project ini dibuat sebagai portfolio fullstack enterprise dashboard dengan arsitektur frontend dan backend terpisah:

```text
ims-project/
+-- frontend/   # React + Vite dashboard
+-- backend/    # Laravel REST API
+-- deploy/     # Deployment assets
+-- scripts/    # Utility scripts
+-- docker-compose.yml
```

## Fitur Utama

- Authentication dan session-based login dengan Laravel Sanctum.
- Role Based Access Control untuk Super Admin, Admin Gudang, Operator, dan Auditor.
- Master data produk, kategori, satuan, gudang, dan kontak bisnis.
- Dashboard operasional dengan KPI, grafik, low-stock alert, dan aktivitas terbaru.
- Inventory overview, stock card, barang masuk, barang keluar, dan scanner barcode/QR.
- Transfer antar gudang dengan validasi stok dan lifecycle approval.
- Stock opname untuk pencatatan physical count dan adjustment.
- Audit trail untuk aktivitas sistem.
- Reporting untuk stock, movement, transfer, dan opname.

## Tech Stack

### Frontend

- React 19
- Vite 8
- Tailwind CSS
- React Router
- TanStack Query
- TanStack Table
- React Hook Form
- Zod
- Axios
- Vitest

### Backend

- Laravel 13.x
- PHP 8.3+
- Laravel Sanctum
- MySQL 8.4
- Redis
- PHPUnit

### Infrastruktur Lokal

- Docker Compose untuk MySQL dan Redis.
- Backend berjalan di `http://localhost:8000`.
- Frontend berjalan di `http://localhost:5173`.
- API base URL: `http://localhost:8000/api/v1`.

## Prasyarat

- PHP 8.3 atau lebih baru
- Composer
- Node.js dan npm
- Docker Desktop
- Git

## Setup Lokal

### 1. Clone repository

```bash
git clone https://github.com/RizaAlraihany/ims-project.git
cd ims-project
```

### 2. Jalankan database dan Redis

```bash
docker compose up -d mysql redis
```

Default service lokal:

```text
DB_DATABASE=ims_project
DB_USERNAME=ims_user
DB_PASSWORD=ims_secret
REDIS_HOST=127.0.0.1
```

### 3. Setup backend

```bash
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Backend akan tersedia di:

```text
http://localhost:8000
```

### 4. Setup frontend

Buka terminal baru:

```bash
cd frontend
npm install
npm run dev
```

Frontend akan tersedia di:

```text
http://localhost:5173
```

Untuk production build:

```bash
npm run build
```

## Akun Demo

Seeder menyediakan akun demo berikut:

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `admin@ims.test` | `password` |
| Admin Gudang | `manager@ims.test` | `password` |
| Operator | `staff@ims.test` | `password` |

## Environment

Frontend menggunakan:

```text
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Backend menggunakan konfigurasi utama:

```text
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
SANCTUM_STATEFUL_DOMAINS=localhost,localhost:5173,127.0.0.1,127.0.0.1:5173,127.0.0.1:8000,::1
SESSION_DRIVER=database
QUEUE_CONNECTION=redis
CACHE_STORE=redis
```

Gunakan `backend/.env.production.example` dan `frontend/.env.production.example` sebagai referensi konfigurasi production.

## API

API mengikuti prefix:

```text
/api/v1
```

Format response sukses:

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

Format response error:

```json
{
  "success": false,
  "message": "Error",
  "errors": {}
}
```

## Modul API Utama

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /products`
- `GET /warehouses`
- `GET /inventory`
- `GET /inventory/stock-card`
- `POST /stock-in`
- `POST /stock-out`
- `GET /transfers`
- `POST /transfers`
- `GET /stock-opnames`
- `POST /stock-opnames`
- `GET /reports/stocks`
- `GET /reports/movements`
- `GET /reports/transfers`
- `GET /reports/opnames`
- `GET /audit-logs`
- `GET /notifications`

## Aturan Inventory

- Stok tidak boleh negatif.
- Transfer tidak boleh melebihi stok tersedia.
- Gudang asal dan tujuan transfer tidak boleh sama.
- Semua mutasi stok wajib tercatat di `stock_movements`.
- `stock_movements` menjadi source of truth untuk histori stok.
- Mutasi inventory harus dijalankan melalui service layer dan database transaction.

## Testing dan Quality Check

Backend:

```bash
cd backend
php artisan test
```

Frontend:

```bash
cd frontend
npm run lint
npm run test
npm run build
```

## Deployment Notes

- Pastikan `APP_DEBUG=false` di production.
- Gunakan HTTPS untuk frontend dan backend.
- Set `SESSION_SECURE_COOKIE=true` dan domain Sanctum sesuai domain production.
- Gunakan Redis untuk session, cache, dan queue production.
- Isi credential storage/cloud sesuai environment deployment.

## Struktur Dokumentasi

Dokumen project utama berada di folder `docs/`:

- `01_PROJECT_BRIEF.md`
- `02_DATABASE_SCHEMA.md`
- `03_API_CONTRACT.md`
- `04_UI_SPEC.md`

## Lisensi

Project ini dibuat sebagai portfolio dan dapat disesuaikan sesuai kebutuhan pemilik repository.
