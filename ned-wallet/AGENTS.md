# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Project context

Before building any feature, read `../docs/README.md` (product direction, the 40 designed screens in `../docs/02-thiet-ke/`, and the technical handoff in `../docs/03-ky-thuat/dev-handoff.md`). Follow the decisions there; never re-propose mini-app platform, Perps or Gacha.

# Architecture (after T0.5)

- No backend: no Supabase, no `ned-hub`, no relayer. Shared data lives on-chain (`ned_program` Dual PDA, SNS) or comes from public APIs (Helius, Jupiter).
- Auth is moving from Privy to Dynamic (Google + embedded Solana MPC wallet) in Phase 1; keep Privy working until T1.4 removes it.
- Web first (GitHub Pages); Android APK via EAS is secondary. Never put secrets in `EXPO_PUBLIC_*`.
- Placeholders with `TODO(T1.x)` (services/profile.ts, services/identity/legacy.ts, contexts/WalletProvider.tsx, poc/) are temporary — see `ARCHITECTURE.md` for the folder map and data flow.
