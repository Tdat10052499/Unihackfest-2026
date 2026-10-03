# @ned/core

Shared TypeScript for N.E.D: used by `ned-wallet` (Expo, mobile) and, from W1, `ned-workspace` (Vite web app). No React, no React Native, no env reads. Plan: [`docs/09-milestone-lock/workspace-plan.md`](../../docs/09-milestone-lock/workspace-plan.md) (decision D20).

## What is in it

| Path | Content |
| --- | --- |
| `src/config.ts` | `configureCore({ rpcUrl, programId?, workspaceOrigin?, mobileOrigin? })` and getters (`getConnection`, `getProgramId`, `getRpcUrl`, `getWorkspaceOrigin`, `getMobileOrigin`) |
| `src/constants.ts` | Cluster, IDL program ID, USDC mints, token / ATA program IDs, `DEMO_PAYOUT_PARTNER`, `USD_VND_RATE` |
| `src/idl/` | `ned_program` IDL (JSON + types), copied from `anchor build` |
| `src/chain/` | `createConnection`, IDL coder, ATA helpers, USDC balance, error mapping, `sendAndConfirm` |
| `src/milestone/` | Layout, PDAs, decode, builders, queries, rules, view (labels), format, evidence, payout reference |
| `src/identity/` | Identity PDAs and builders (`dualPda`), recipient resolver core, phone format helpers, transaction cost |
| `src/utils/amountInput.ts` | Amount input sanitising (used by `format.ts`) |
| `src/actions.ts` | Framework-free action pipeline: fresh fund read → rules check → builder → injected signer → send → confirm. Apps wrap it in their own hooks |

Import with subpaths, for example `@ned/core/milestone/view.ts`, or everything from `@ned/core/index.ts`. Peer dependencies (`@solana/web3.js` 1.98.4, `@coral-xyz/anchor`, `@noble/hashes`, `bs58`, `buffer`) come from each app, so each app bundles exactly one copy of `web3.js`.

## Start-up

Each app calls `configureCore` once, before anything reads the program ID or the connection. In `ned-wallet` that is `services/coreInit.ts`, imported first by `app/_layout.tsx` and by every re-export shim (`constants/chain.ts`, `services/chain/*`, `services/milestone/*`, the moved `services/identity/*`, `utils/amountInput.ts`, `idl/ned_program.ts`).

## Tests

```bash
cd packages/ned-core && node --test "src/**/*.test.ts"     # 72 tests
cd ned-wallet && npm test                                   # 19 tests (app-only modules)
npm test                                                    # from the repo root: both
```

## Monorepo mechanics (decided in W0, 3 Oct 2026)

**Root pnpm workspace** (`pnpm-workspace.yaml` at the repo root: `ned-wallet`, `packages/*`), the preferred option of workspace-plan section 1.

- `ned-wallet/pnpm-workspace.yaml` settings moved to the root unchanged: `overrides` (`@solana/web3.js` 1.98.4), `allowBuilds`, `minimumReleaseAgeExclude`.
- The lockfile moved to the root with its importer re-keyed from `.` to `ned-wallet`; `pnpm install` from the root resolved the same versions (no download), and only one `@solana/web3.js` exists in `node_modules/.pnpm`.
- Metro follows the workspace symlink (`ned-wallet/node_modules/@ned/core → packages/ned-core`) with Expo's default monorepo support; no `metro.config.js` change was needed.
- It worked on the first try (about 3 minutes), so the path-alias fallback was not needed.
- **Install from the repo root** (`pnpm install`), not from `ned-wallet/`.
- **ts-node scripts** in `ned-wallet/scripts/` run with `ned-wallet/tsconfig.scripts.json`: its `moduleTypes` makes ts-node compile this `"type": "module"` package as CommonJS (otherwise `ERR_REQUIRE_ESM`).
- **Not verified yet:** an EAS (Android) build from the monorepo.

## Known gaps

- No standalone type check for this package: `tsc` here needs `@types/node` (Buffer typings) as a dev dependency. The code is type-checked through `ned-wallet` (`npx tsc --noEmit`). Add it in W1, when `ned-workspace` imports the core.
