# 🛒 POS Toko Grosir Tri Jaya

> Sistem Point of Sale berbasis web untuk Toko Grosir Tri Jaya — menggantikan pencatatan manual dengan sistem digital terintegrasi.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000?logo=vercel)

---

## 📋 Tentang Proyek

**POS Grosir Tri Jaya** adalah aplikasi kasir digital full-stack yang dirancang khusus untuk toko grosir. Fitur unggulannya adalah **harga grosir bertingkat otomatis** — sistem secara cerdas menerapkan harga eceran atau grosir berdasarkan jumlah pembelian per produk tanpa intervensi manual kasir.

### Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 🏪 **Kasir Digital** | Scan barcode (kamera/USB), search produk, grid produk populer |
| 💰 **Harga Grosir Otomatis** | Eceran (1-11 pcs) vs Grosir (≥12 pcs) per produk |
| 📦 **Manajemen Stok** | Auto-deduct saat jual, auto-increment saat restock, alert stok rendah |
| 📊 **Dashboard & Laporan** | Grafik pendapatan, top produk, export PDF/Excel |
| 🧾 **Struk Digital** | Print thermal 80mm + kirim via WhatsApp |
| 👥 **Multi-Role** | Admin, Kasir, Gudang — akses sesuai tanggung jawab |
| 📱 **Mobile-First** | Responsive 360px-1920px, PWA-ready |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 14** (App Router, Server Components) |
| Language | **TypeScript** |
| UI | **shadcn/ui** + **Tailwind CSS** |
| Database | **Neon PostgreSQL** (Serverless) |
| ORM | **Prisma** |
| Auth | **NextAuth.js v5** (Credentials) |
| State | **Zustand** (Cart + localStorage) |
| Scanner | **html5-qrcode** (Camera + USB) |
| Charts | **Recharts** |
| Export | **jsPDF** + **SheetJS** (xlsx) |
| Testing | **Vitest** + **fast-check** (PBT) |
| Deploy | **Vercel** |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- PostgreSQL database (recommended: [Neon](https://neon.tech))

### 1. Clone & Install

```bash
git clone <repository-url>
cd TOKO-TRIJAYA
pnpm install
```

### 2. Setup Environment

Buat file `.env.local`:

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="generate-random-secret-32-chars"
NEXTAUTH_URL="http://localhost:3000"
```

Buat file `.env` (untuk Prisma CLI):

```env
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
DIRECT_URL="postgresql://user:password@host-direct.neon.tech/dbname?sslmode=require"
```

### 3. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed data awal (users, products, suppliers)
npx tsx prisma/seed.ts
```

### 4. Run Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

---

## 🔐 Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@trijaya.com | admin123 |
| **Kasir** | kasir@trijaya.com | kasir123 |
| **Gudang** | gudang@trijaya.com | gudang123 |

---

## 📱 Halaman & Fitur

### Kasir (`/kasir`)
- Scan barcode via kamera HP/laptop atau USB scanner
- Cari produk by nama (autocomplete)
- Grid produk populer + semua produk
- Keranjang real-time dengan harga grosir otomatis
- Checkout: Cash / QRIS / Transfer
- Struk digital: Print nota + Kirim WhatsApp

### Dashboard (`/dashboard`) — Admin Only
- KPI cards: pendapatan hari ini, jumlah transaksi, metode bayar
- Grafik pendapatan 7/30 hari (Recharts)
- Top 10 produk terlaris
- Alert stok rendah

### Laporan (`/laporan`) — Admin Only
- Filter: harian, mingguan, bulanan, custom
- Tabel transaksi lengkap
- Export PDF (jsPDF) & Excel (SheetJS)

### Produk (`/produk`) — Admin Only
- CRUD produk: nama, barcode, harga eceran/grosir, stok, kategori
- Scan barcode untuk input
- Validasi harga: retail > purchase, wholesale > purchase

### Stok (`/stok`) — Admin & Gudang
- Form restock: scan/search produk → input qty → pilih supplier
- Riwayat stok masuk dengan filter tanggal

### Supplier (`/supplier`) — Admin & Gudang
- CRUD data supplier

### Transaksi (`/transaksi`) — Admin & Kasir
- Riwayat transaksi dengan filter tanggal/status
- Cetak ulang struk
- Void transaksi (Admin only)

---

## 🏗️ Struktur Project

```
src/
├── app/
│   ├── (auth)/login/          # Halaman login
│   ├── (dashboard)/           # Halaman dengan sidebar
│   │   ├── kasir/             # POS / Kasir
│   │   ├── dashboard/         # Dashboard Admin
│   │   ├── produk/            # Manajemen Produk
│   │   ├── transaksi/         # Riwayat Transaksi
│   │   ├── laporan/           # Laporan & Export
│   │   ├── stok/              # Restock Produk
│   │   ├── supplier/          # Manajemen Supplier
│   │   └── layout.tsx         # App shell + sidebar
│   └── api/
│       ├── auth/[...nextauth] # Auth endpoints
│       ├── products/          # CRUD + barcode + popular
│       ├── transactions/      # Checkout + history + void
│       ├── dashboard/stats/   # Dashboard aggregations
│       ├── reports/export/    # Report data
│       ├── suppliers/         # CRUD supplier
│       ├── stock-logs/        # Stock movement history
│       └── users/             # User management
├── components/
│   ├── kasir/                 # Barcode scanner, cart, receipt, checkout
│   ├── ui/                    # shadcn/ui components
│   └── providers.tsx          # SessionProvider
├── lib/
│   ├── auth.ts                # NextAuth config
│   ├── prisma.ts              # Prisma client singleton
│   ├── utils/                 # Pricing engine, stock manager, role guard
│   └── validations/           # Zod schemas
├── stores/
│   └── cart-store.ts          # Zustand cart + localStorage
├── hooks/
│   └── use-usb-scanner.ts    # USB barcode scanner detection
└── __tests__/
    ├── unit/                  # Unit tests
    └── properties/            # Property-based tests (fast-check)
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
pnpm test:coverage

# Property-based tests only
pnpm test:properties

# Unit tests only
pnpm test:unit
```

**199 tests** total:
- 141 unit tests
- 58 property-based tests (fast-check)

---

## 📦 Database Schema

```
User ──┐
       ├── Transaction ──── TransactionItem ──── Product
       └── StockLog ────────────────────────────── ↑
                                                   │
Supplier ──────────────────────────────────────────┘
```

6 models: `User`, `Product`, `Transaction`, `TransactionItem`, `Supplier`, `StockLog`

---

## 🚢 Deployment (Vercel)

1. Push ke GitHub
2. Connect repo di [vercel.com](https://vercel.com)
3. Set environment variables:
   - `DATABASE_URL` (Neon pooler URL + `&pgbouncer=true`)
   - `DIRECT_URL` (Neon direct URL)
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (production domain)
4. Deploy otomatis setiap push ke `main`

---

## 📖 Scripts

| Script | Deskripsi |
|--------|-----------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production |
| `npm test` | Run all tests |
| `pnpm prisma:seed` | Seed database |
| `npx prisma studio` | Database GUI |
| `npx prisma migrate dev` | Run migrations |

---

## 🎨 Brand

| Element | Value |
|---------|-------|
| Primary Color | `#2BBCB3` (Teal) |
| Secondary Color | `#1E6CB5` (Blue) |
| Font | Inter |
| Logo | Shopping Cart icon |
| Tagline | "Solusi Belanja Lengkap & Hemat" |

---

## 👨‍💻 Dibuat Untuk

**Mata Kuliah:** Pemrograman Web Lanjut — Semester 6

**Studi Kasus:** Digitalisasi operasional Toko Grosir Tri Jaya

---

## 📄 Lisensi

Private — Tugas Kuliah
