<img width="2816" height="1536" alt="N.E.D Wallet Banner" src="./assets/images/banner.jpg" />

> A Next-Generation Web3 Smart Wallet on Solana Network

> **Being updated.** The product description, features and screenshots below describe the earlier wallet demo. The current product is **Milestone Lock** (see [`docs/09-milestone-lock/`](docs/09-milestone-lock/README.md)); new text and screenshots come with the redesigned screens. The technical sections from [Status](#status-what-runs-today) down are current.

> **Team docs (VN):** định hướng dự án, 40 màn hình thiết kế và bàn giao kỹ thuật nằm ở [`docs/`](docs/README.md). Đọc trước khi code.

[![Solana Network](https://img.shields.io/badge/Solana-14F195?style=flat&logo=solana&logoColor=white)](https://solana.com/)
[![React Native](https://img.shields.io/badge/React_Native-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Jupiter](https://img.shields.io/badge/Jupiter-C7F284?style=flat&logoColor=black)](https://jup.ag/)
[![Dynamic](https://img.shields.io/badge/Dynamic-4779FE?style=flat&logoColor=white)](https://www.dynamic.xyz/)

**N.E.D Wallet** is a smart Web3 wallet built on the Solana blockchain, focusing on delivering a seamless Web2.5 user experience. It combines a bold Neo-brutalism design language with stablecoin asset management, P2P USDC transfers and real market data from Jupiter — with **no custom backend**: shared data lives on-chain.

---

## Table of Contents

- [Overview](#overview)
- [UI Showcase](#ui-showcase)
- [Features](#features)
- [Status: what runs today](#status-what-runs-today)
- [Repository layout](#repository-layout)
- [Program: build and test](#program-build-and-test)
- [App: install, test and run](#app-install-test-and-run)
- [Deploy the web build (GitHub Pages)](#deploy-the-web-build-github-pages)
- [Environment variables](#environment-variables)
- [Guidelines](#guidelines)

---

## Overview

N.E.D Wallet is a decentralized wallet (web first, Android via EAS) where users can:
- Sign in with Google and get an embedded Solana wallet — no seed phrase.
- Send USDC peer-to-peer to a wallet address, an `@username` or a phone number.
- Swap tokens and explore tokenized stocks (xStocks) with real Jupiter prices *(in progress — Demo mode, not broadcast)*.
- Browse Solana dApps in a built-in dApp Browser.
- Switch between Vietnamese and English.

The application integrates:
- **Solana** (devnet for P2P transfers) and the **`ned_program`** Anchor program for on-chain identity.
- **Dynamic** for Google login and embedded MPC wallets.
- **Helius** RPC for balances, history and incoming-transfer notifications.
- **Jupiter** (mainnet) for swap quotes and xStocks prices; **SNS** for `.sol` names.

---

## UI Showcase

| Home Dashboard | Analytics View | QR Scan & Transfer | Authentication |
| :---: | :---: | :---: | :---: |
| <img src="./assets/images/home.png" width="250" /> | <img src="./assets/images/analytics.png" width="250" /> | <img src="./assets/images/scan.png" width="250" /> | <img src="./assets/images/auth.png" width="250" /> |

---

## Features

### Core Capabilities
- **P2P USDC transfers**: send to an address, `@username` or phone number (identity via on-chain PDAs — Phase 1).
- **Neo-brutalism Design**: thick black borders, hard shadows, vibrant colors and haptic feedback.
- **Stablecoin Management**: USDC-first balance cards and sub-wallet cards stored on-device.
- **dApp Browser**: open Solana dApps in a WebView with an injected wallet bridge and a signing prompt.
- **Multi-language Support (i18n)**: Vietnamese and English.

### User Security
- **Embedded wallet, no seed phrase**: Google login + MPC wallet via Dynamic.
- **No secrets in the app**: every `EXPO_PUBLIC_*` value is public by design; there is no server holding user data.
- **Phone numbers never go on-chain in clear**: only a scrypt hash is used as the PDA key (Phase 1).

> Network fees: users pay devnet SOL for now. Dynamic SVM Gas Sponsorship requires an Enterprise plan — see [`docs/poc-dynamic.md`](docs/poc-dynamic.md).

---

## Status: what runs today

*Updated 3 Oct 2026. Details and test results: [`docs/tong-hop-tien-do.md`](docs/tong-hop-tien-do.md).*

| Part | State |
| --- | --- |
| `ned_program` on **devnet** (`8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh`, Anchor 1.1.2) | Identity (`@username`, optional phone hash) and **Milestone Lock**: `create_fund`, `accept`, `lock`, `submit`, `approve`, `release_after_review`, `refund`, `close`, plus `dispute`, `concede`, `propose_cancel`, `accept_cancel`. 17 instructions; IDL on-chain. Not audited |
| Web app (`ned-wallet/`, Expo SDK 57, web first) | Google sign-in with an embedded Solana wallet (Dynamic), onboarding, on-chain identity lookup, USDC send on devnet |
| Milestone Lock in the app | `services/milestone/` (builders, decoding, rules, labels) and the hooks the screens will use (`useFunds`, `useFund`, `useMilestoneActions`, `useChainTime`, `useRegion`). The contract **screens are being redesigned**; until then a dev-only harness at `/dev/milestone` runs every action |
| Hidden or removed | Swap and xStocks: code kept, routes redirect home (`constants/features.ts`). dApp browser and Mobile Wallet Adapter: removed |
| Backend | None. Shared data lives on-chain; the payout partner is simulated by a team-controlled devnet wallet |

Everything runs on **devnet with test money**. N.E.D holds no funds and charges no fee.

---

## Repository layout

```text
Unihackfest-2026/
├── docs/                    # Product, research, legal (VN/EN). Start with docs/09-milestone-lock/
├── ned_program/             # Anchor program
│   └── programs/ned-program/
│       ├── src/             # lib.rs, constants, errors, events, state/, instructions/{identity,transfer,milestone/}
│       └── tests/           # LiteSVM tests: identity.rs, milestone.rs, helpers.rs, common/
└── ned-wallet/              # Expo app — folder map and data flow: ned-wallet/ARCHITECTURE.md
    ├── app/                 # Expo Router routes ((onboarding), (tabs), send, dev/milestone…)
    ├── constants/           # chain.ts (cluster, program ID, mints, rate), features.ts, design.ts
    ├── hooks/               # Screen hooks, incl. Milestone Lock hooks
    ├── services/            # auth/, chain/ (connection, send, errors, ATA, IDL coder), identity/, milestone/
    ├── stores/              # Zustand stores (region, consent, user, network…)
    ├── idl/                 # ned_program IDL copied from anchor build (do not edit by hand)
    └── scripts/             # devnet scripts (identity, milestone smoke run, USDC recycle)
```

---

## Program: build and test

**Prerequisites:** Rust 1.89 (pinned by `ned_program/rust-toolchain.toml`), Solana CLI 3.x, Anchor CLI **1.1.2** (`avm install 1.1.2 && avm use 1.1.2`).

```bash
cd ned_program
anchor build                                                          # builds target/deploy/ned_program.so and target/idl/
cargo test --manifest-path programs/ned-program/Cargo.toml -- --nocapture
```

The tests run in [LiteSVM](https://github.com/LiteSVM/litesvm) against the built `.so`, so run `anchor build` first. They cover identity (10 tests), Milestone Lock (24 tests: happy paths, the Vietnam payout path, every deadline boundary, attacks, donations, the `released + refunded == total` invariant, account layout, compute units) and the shared test helpers.

**Deploy (owner only, spends devnet SOL).** The upgrade authority is the deploy wallet in `~/.config/solana/id.json`.

1. `solana program show 8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh --url devnet`: if the new `.so` is larger than *Data Length*, run `solana program extend <program id> <extra bytes> --url devnet`.
2. `anchor deploy --provider.cluster devnet --no-idl`
3. If the IDL changed, write it through a buffer, check it, then set it:
   ```bash
   npx @solana-program/program-metadata@0.5.1 create-buffer target/idl/ned_program.json --rpc https://api.devnet.solana.com -k ~/.config/solana/id.json
   npx @solana-program/program-metadata@0.5.1 update idl <program id> --buffer <buffer> --close-buffer --rpc https://api.devnet.solana.com -k ~/.config/solana/id.json
   ```
   (`anchor deploy` without `--no-idl` and `anchor idl upgrade` failed at their last step with Anchor 1.1.2; see `docs/tong-hop-tien-do.md`.)
4. Copy `target/idl/ned_program.json` and the type part of `target/types/ned_program.ts` into `ned-wallet/idl/`.

---

## App: install, test and run

**Prerequisites:** Node.js 22+, pnpm (installs) — `npm run <script>` works for every script below. A **Dynamic** environment ID with Google sign-in, Solana + Solana Devnet and embedded wallets enabled; add your web origin (for example `http://localhost:8081`) to its CORS origins.

```bash
git clone https://github.com/Tdat10052499/Unihackfest-2026.git
cd Unihackfest-2026/ned-wallet
pnpm install
cp .env.example .env          # fill in; see Environment variables
```

| Command | What it does |
| --- | --- |
| `npm test` | All unit tests (`node --test` over `services/**` and `utils/**`): chain helpers, Milestone Lock rules and labels, decoding, builders, identity, formatting |
| `npx tsc --noEmit` | Type check |
| `npm run lint` | ESLint |
| `npm run web` | Dev server on http://localhost:8081 |
| `npm run identity:check` | Read-only identity check: devnet identity records plus a mainnet `.sol` lookup (needs `EXPO_PUBLIC_HELIUS_MAINNET_URL`) |
| `npm run milestone:devnet` | Milestone Lock smoke run on devnet with local keypairs (`-- --refund`, `-- --own-wallet`); needs devnet USDC on the test client |
| `npm run recycle:demo-usdc -- --to <wallet>` | Sends the demo payout partner's devnet USDC back to the client |

Android builds use EAS (`npx eas-cli build --profile development --platform android`); the web build is the main target.

---

## Deploy the web build (GitHub Pages)

```bash
cd ned-wallet
npm run predeploy     # expo export --platform web → dist/, adds 404.html and .nojekyll
npm run deploy        # publishes dist/ to the gh-pages branch
```

The site is served at `https://tdat10052499.github.io/Unihackfest-2026/` (base URL `/Unihackfest-2026`, set in `app.json`). The Dynamic environment must list `https://tdat10052499.github.io` in its CORS origins. Do **not** set `EXPO_PUBLIC_DEV_TOOLS` for the public build.

---

## Environment variables

All live in `ned-wallet/.env` (gitignored); `ned-wallet/.env.example` lists them without values. **Every `EXPO_PUBLIC_*` value is bundled into the public web build: never put a secret in one, and restrict API keys to the deployed domain.**

| Name | Required | Used for |
| --- | --- | --- |
| `EXPO_PUBLIC_DYNAMIC_ENVIRONMENT_ID` | yes | Dynamic login and embedded wallet |
| `EXPO_PUBLIC_HELIUS_DEVNET_URL` | recommended | Devnet RPC (falls back to `EXPO_PUBLIC_SOLANA_DEVNET_RPC`, then the public devnet RPC) |
| `EXPO_PUBLIC_HELIUS_MAINNET_URL` | for `.sol` names | Mainnet read-only RPC for SNS lookups |
| `EXPO_PUBLIC_ANCHOR_PROGRAM_ID` | no | Overrides the program ID from the IDL |
| `EXPO_PUBLIC_JUPITER_API_KEY` | no | Jupiter Tokens API (Swap / xStocks, hidden) |
| `EXPO_PUBLIC_SOLANA_DEVNET_RPC`, `EXPO_PUBLIC_SOLANA_MAINNET_RPC`, `EXPO_PUBLIC_HELIUS_API_KEY` | no | RPC fallbacks |
| `EXPO_PUBLIC_DEV_TOOLS` | no | `1` shows the `/dev/milestone` harness in an exported build |

Keypairs (deploy wallet, demo payout partner, smoke-run test wallets) live in `~/.config/solana/`, never in the repo.

---

## Guidelines

- **Specs first:** product and program rules are in [`docs/09-milestone-lock/`](docs/09-milestone-lock/README.md). If code and a spec disagree, fix one of them in the same change.
- **Words:** follow the word table in [`product-spec.md`](docs/09-milestone-lock/product-spec.md#6-words): never call USDC a "payment"; no "escrow", "safe", "free" or "invest" in the UI.
- **App code:** screens call hooks only (no `@solana/web3.js` or instruction builders in screens); chain constants come from `constants/chain.ts`; money is `bigint` base units, never floats; UI uses `components/design`.
- **Program code:** follow `program-spec.md` exactly; keep the `SharedFund` byte layout (708 bytes, `client` at 12, `freelancer` at 44); run `anchor build && cargo test` before every deploy.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).

---

## License

This project is licensed under the **MIT License**.

---

<div align="center">

**Built with dedication for Unihackfest 2026**

[⬆ Back to Top](#table-of-contents)

</div>
