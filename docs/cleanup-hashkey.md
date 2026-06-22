# Cleanup: Remove All HashKey Chain References

> Migrate from HashKey Chain + HSP to pure T3N architecture.

## Rationale

- T3N is a self-contained TEE network — all execution, token transfers, and settlement happen inside secure enclaves
- No need to post transactions to HashKey Chain (`chain_id: 177`)
- HSP (HashKey Settlement Protocol) is a fiat-to-crypto rail that settles on HashKey — also obsolete
- `lib/hashkey.ts`, `lib/thia-term-contract.ts`, `contracts/ThiaTermPayments.sol` already have zero imports

---

## Phase 1 — Delete Dead Files

| File | Lines | Notes |
|------|-------|-------|
| `lib/hashkey.ts` | 136 | Zero imports. Superseded by `lib/chains.ts` (which itself will be cleaned in Phase 3). |
| `lib/thia-term-contract.ts` | 43 | Zero imports. T3N handles payments now. |
| `contracts/ThiaTermPayments.sol` | 48 | Solidity contract — no runtime calls. |

## Phase 2 — Remove HSP (HashKey Settlement Protocol)

HSP is a fiat-to-crypto on-ramp that settles on HashKey Chain. Since T3N handles everything in TEE, HSP adds complexity with no benefit. T3N WASM contracts can do outbound HTTP to Stripe/PayPal directly.

### Delete files

| File | Lines | Dependents |
|------|-------|------------|
| `lib/hsp-client.ts` | 217 | 4 API routes |
| `app/api/webhooks/hsp/route.ts` | ~130 | — |

### Modify files — strip HSP logic

| File | What to do |
|------|------------|
| `app/api/payment-links/route.ts` | Remove HSP mandate creation. Simplify to just store payment link + generate URL. |
| `app/api/invoices/route.ts` | Remove HSP mandate creation. Simplify to just store invoice. |
| `app/api/agents/pay/route.ts` | Remove HSP multi-pay mandate. Keep only the T3N `executeAndDecode` call via `agent-wallet.ts`. |
| `app/api/payroll/route.ts` | Remove `network: "hashkey"` default. |

### Impact on UI

- `components/payment-links-module.tsx` — remove `USDC (HashKey)` / `USDT (HashKey)` select options
- `components/payment-flow.tsx` → `app/l/[code]/page.tsx` — remove "Pay via HashKey HSP" UI block

## Phase 3 — Replace "HashKey Chain" Branding

### Pages

| File | Line(s) | Current → Replace |
|------|---------|-------------------|
| `app/layout.tsx` | 30 | `"built natively on HashKey Chain"` → `"powered by T3N"` |
| `app/login/page.tsx` | 132 | `"Now live on HashKey Chain"` → `"Powered by T3N"` |
| `app/android/page.tsx` | 122 | `"Built on HashKey Chain"` → `"Powered by T3N"` |

### Dashboard Components

| File | Lines | Change |
|------|-------|--------|
| `components/dashboard-overview.tsx` | 157 | `"Connect to receive funds on HashKey Chain."` → `"Connect your T3N wallet to receive payments."` |
| `components/dashboard-overview.tsx` | 376 | `"HashKey Testnet · Live"` → `"T3N Testnet · Live"` |
| `components/agent-payment-widget.tsx` | 53, 161, 173 | Replace `"on HashKey"` / `"on HashKey Chain"` → `"via T3N"` |
| `components/ai-invoice-module.tsx` | 48-49 | Remove `"hashkey-testnet": "HashKey Testnet"` and `"hashkey": "HashKey Chain"` from network labels |
| `components/ai-invoice-module.tsx` | 863 | `"Verified on HashKey Chain"` → `"Verified via T3N"` |
| `components/settings-module.tsx` | 48 | `"HashKey Chain settings"` → `"T3N settings"` |

### AI Chat System Prompt

| File | Lines | Change |
|------|-------|--------|
| `app/api/ai/chat/route.ts` | 26, 35, 36, 39 | Replace all "on HashKey Chain" / "HashKey Chain integration" → "via T3N" / "T3N integration" |

## Phase 4 — Prisma Schema

| File | Line | Change |
|------|------|--------|
| `prisma/schema.prisma` | 88 | `@default("hashkey_testnet")` → `@default("t3n_testnet")` or remove default |

(Requires DB migration: `npx prisma migrate dev` after change.)

## Phase 5 — Chain Config

| File | Change |
|------|--------|
| `lib/chains.ts` | Remove `hashkey-testnet` and `hashkey` entries. Change `DEFAULT_CHAIN_KEY`. Add a single `t3n` entry or leave minimal config. |

Check 3 importing components still compile (dashboard-overview, payment-links-module, ai-invoice-module).

## Phase 6 — Environment & Docs

| File | Change |
|------|--------|
| `.env.example` | Remove HashKey Chain section (RPC URLs, contract addresses) and HSP section (`HSP_*`). Keep `T3N_API_KEY`, `T3N_ENVIRONMENT`. |
| `README.md` | Update mermaid diagram (remove HSP box, simplify chain layer), remove HSP feature table, update env vars table, remove HashKey/HSP links. |
| `AGENTS.md` | Remove HSP mention (line 25, 34), remove Solidity contract mention (line 56), update blockchain section. |
| `CLAUDE.md` | Remove HSP section (lines 165-175) and related references. |

---

## Order of Execution

1. Delete dead files (Phase 1) — no dependents
2. Delete `lib/hsp-client.ts` + webhook route (Phase 2)
3. Modify 4 API routes (Phase 2) — remove HSP logic
4. Update prisma schema (Phase 4) + run migration
5. Clean `lib/chains.ts` (Phase 5)
6. Update all UI components + pages (Phase 3)
7. Update AI chat system prompt (Phase 3)
8. Update docs + env (Phase 6)
9. Verify: `pnpm build && pnpm typecheck && pnpm lint`

## Risk / Mitigation

| Risk | Mitigation |
|------|------------|
| HSP routes used by existing payment links | HSP already returns null when unconfigured — no data loss. Payment links still work as URL-based. |
| chain_id 177 in old DB records | Old records keep their value; only default changes forward. |
| Breaking import in components | Chains.ts cleanup — verify all 3 importing components still compile. |
| Build failure | Run `typecheck` separately from build (build ignores TS errors). Fix any import errors. |
