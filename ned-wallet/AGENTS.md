# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Project context

Before building any feature, read `../docs/09-milestone-lock/` (current product: Milestone Lock; `product-spec.md` for screens and words, `program-spec.md` for the on-chain account layout and instructions), then `../docs/README.md` and the screen designs in `../docs/02-thiet-ke/canvas-v2/`. Never re-propose mini-app platform, Perps or Gacha. Swap, xStocks, Earn, the dApp browser and the Simple/Crypto wallet mode were removed from the code on 9 Oct 2026; do not bring them back. `../docs/archive/` is history only.

# Architecture (after T0.5)

- No backend: no Supabase, no `ned-hub`, no relayer. Shared data lives on-chain (`ned_program` Dual PDA, SNS) or comes from public APIs (Helius).
- Auth is Dynamic (Google + embedded Solana MPC wallet). Screens use `useAuth()` from `services/auth` only — never import `@dynamic-labs-sdk/*` elsewhere. No gas sponsorship: users pay devnet fees.
- Web first (GitHub Pages); Android APK via EAS is secondary. Never put secrets in `EXPO_PUBLIC_*`.
- Identity lookup is on-chain through `services/identity/resolve.ts`; do not reintroduce local profile lookup or legacy PDA helpers.
