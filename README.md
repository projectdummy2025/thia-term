# Thia-Term

On-chain invoicing and agent payments platform on HashKey Chain, integrating Terminal 3 ADK.

## Quick start

```bash
cp .env.example .env.local   # fill in required values
npx prisma db push
npm run dev
```

## Commands

| Command | Action |
|---------|--------|
| `npm run dev` | next dev |
| `npm run build` | prisma generate && next build |
| `npm run typecheck` | tsc --noEmit |
| `npm run lint` | next lint |

## Stack

- Next.js 14 App Router, TypeScript, Tailwind CSS
- PostgreSQL (Supabase) via Prisma ORM
- NextAuth.js (Google OAuth, credentials, SIWE)
- HashKey Chain (Chain ID 177) — Viem, wagmi v2, RainbowKit
- Terminal 3 ADK (`@terminal3/t3n-sdk`)
- Anthropic Claude AI agents with BIP-32 derived wallets

## Env

Requires `DATABASE_URL` + `DIRECT_URL` (PostgreSQL), `DEPLOYER_MNEMONIC` (BIP-39), `WALLET_ENCRYPTION_KEY` (64-char hex). HSP and AI keys are optional. See `.env.example`.

## Structure

- `app/api/` — API routes
- `components/` — UI components (shadcn/ui in `components/ui/`)
- `lib/` — core logic (Prisma, auth, HSP client, AI engine, wallet crypto)
- `prisma/schema.prisma` — database schema
- `contracts/` — Solidity contracts
- `CONTEXT.md` — Terminal 3 bounty reference
