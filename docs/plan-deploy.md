# Deployment Plan — Thia-Term (Free Tier)

## Stack
| Platform | Layanan | Biaya |
|----------|---------|-------|
| **Vercel** | Hobby — Next.js hosting, 100 GB bandwidth | $0 |
| **Neon** | Free — PostgreSQL 0.5 GB, 100h compute/bln | $0 |
| **T3N** | Testnet — WASM settlement | $0 |
| **Domain** | `thia-term.vercel.app` | $0 |

## Prerequisites

1. GitHub repo terhubung ke Vercel
2. Akun Neon (login with GitHub)
3. Semua env var di Vercel dashboard

---

## Setup Steps

### 1. Init Prisma Migrations

```bash
npx prisma migrate dev --name init
```

### 2. Fix `.gitignore`

Baris `/prisma` nge-ignore seluruh folder prisma (termasuk migrations). Ganti jadi:

```
/prisma/migrations/
```

biar `prisma/schema.prisma` tetap ke-track, cuma migrations folder yang di-ignore (optional — kamu mungkin mau commit migrations juga).

### 3. Fix `next.config.js`

Tambah `serverExternalPackages` biar WASM T3N ga dirusak Next.js bundler:

```js
serverExternalPackages: ["@terminal3/t3n-sdk", "@bytecodealliance/preview2-shim"],
```

Letakkan di object `nextConfig`.

### 4. Commit & Push

```bash
git add .
git commit -m "chore: prepare deployment config"
git push
```

### 5. Vercel — Import Project

1. Buka [vercel.com/new](https://vercel.com/new)
2. Import repo GitHub `thia-term`
3. Framework: **Next.js** (auto-detect)
4. Build Command: `prisma generate && next build` (auto-detect dari package.json)
5. Set **Environment Variables** (15+ vars — lihat `.env.example`)

### 6. Neon — Database

1. Buka [neon.tech](https://neon.tech)
2. Create project → pilih region terdekat
3. Dapet 2 URL:
   - `DATABASE_URL` → pooled (`postgresql://...?sslmode=require&pooled=true&port=6543`)
   - `DIRECT_URL` → direct (`postgresql://...?sslmode=require&port=5432`)
4. Set kedua URL itu di Vercel env vars

### 7. Post-Deploy — Run Migrations

Setelah deploy pertama, jalanin:

```bash
npx prisma migrate deploy
```

Atau tambahin script di Vercel **Post-Deploy Hook**:

```
prisma migrate deploy
```

### 8. Verify

- Buka `https://thia-term.vercel.app`
- Coba login (Google / email)
- Cek `/api/t3n-usage` — harus return usage data

---

## Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| WASM cold start lambat (~3-5s) | Cache T3N client di global, masih aman di Hobby 10s limit |
| Neon compute hours habis | 100h/bln ~ 3.3h/hari — cukup buat dev & testing |
| Vercel build timeout 45m | Build ~1m — aman |
| T3N API key berubah | Set di Vercel env vars, redeploy |

## Env Vars Required

```
DATABASE_URL          # Neon pooled
DIRECT_URL            # Neon direct  
NEXTAUTH_SECRET
NEXTAUTH_URL          # https://thia-term.vercel.app
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
NEXT_PUBLIC_APP_URL   # https://thia-term.vercel.app
DEPLOYER_MNEMONIC
WALLET_ENCRYPTION_KEY # 64-char hex
T3N_API_KEY
T3N_ENVIRONMENT       # testnet
T3N_DID
# HSP_* — optional
# MOONSHOT_API_KEY / ANTHROPIC_API_KEY — optional
```
