# Workspace plan: `ned-workspace/` as its own web app (decision D20)

Status: **adopted 3 Oct 2026** by the PO. This plan replaces [`build-plan.md`](build-plan.md) C1–C4: the Workspace no longer lives inside the Expo app.

- `ned-wallet/` is **mobile only**: the Expo app, plus its web build on GitHub Pages used as the phone demo.
- The landing page (C5, `site/`) is unchanged.
- Phases A, B and D are unchanged, except that the B1 content layer is written in the shared core (W0).

## 1. Architecture

```text
Unihackfest-2026/
├── ned_program/          Anchor program (unchanged)
├── packages/ned-core/    NEW · shared TypeScript, no React Native, no React
├── ned-wallet/           Expo app (mobile) · imports @ned/core
├── ned-workspace/        NEW · Vite + React + TypeScript web app (computer) · imports @ned/core
└── site/                 landing page (C5)
```

| Part | Content | Why |
| --- | --- | --- |
| `packages/ned-core` | Moved from `ned-wallet` without behaviour change:<br>• chain config (program ID, USDC mint);<br>• `createConnection(rpcUrl)`;<br>• the IDL and the IDL coder;<br>• `services/milestone/*` (layout, PDA, decode, queries, rules, view, format, client builders, evidence, reference);<br>• `services/chain/{ata,balance,errors,send}`;<br>• `services/identity/{dualPda,resolveCore,format,transactionCost}`.<br>From B1 onward it also holds `content`, `notes` and `keys` (with a storage adapter), and a framework-free action pipeline (`actions.ts`: fresh read → rules → builder → sign → send → confirm, with the signer passed in) | One copy of the byte layout, rules and builders. Two copies would drift: the 708 → 740 change in A2 alone touches five files |
| Configuration | Core reads no `process.env` or `import.meta.env`. Each app calls `configureCore({ rpcUrl, programId?, workspaceOrigin, mobileOrigin })` at start-up | Expo uses `EXPO_PUBLIC_*`; Vite uses `VITE_*` |
| Dependencies | `@solana/web3.js` (1.98.4), `@coral-xyz/anchor` 0.32, `@noble/*` and `bs58` are **peer dependencies** of the core. Each app provides exactly one copy | Two copies of `web3.js` break `instanceof PublicKey` and transaction signing |
| `ned-wallet` | Imports `@ned/core`. Its `services/milestone/index.ts` and `services/chain/*` become re-export shims, so screens and hooks do not change. The React hooks stay in the app and wrap `actions.ts` | Mobile keeps working; the risk is limited to imports |
| `ned-workspace` | Vite SPA:<br>• React Router;<br>• TanStack Query;<br>• Dynamic JS SDK headless (`@dynamic-labs-sdk/client` + `/solana`, the same environment ID as mobile, Google redirect login);<br>• CSS Modules with the token variables from the canvas `Web*` boards;<br>• **Motion for React** (`motion/react`, `LazyMotion` + `domAnimation`) for transitions. The web DOM is exactly what Motion supports (D17) | The Workspace is a desktop web app; no React Native layer, smaller bundle, simpler Vercel deploy |
| Hosting | Vercel project "ned-workspace", Root Directory `ned-workspace`. `/c/:fund` is the invite-link router:<br>• narrow screens → GitHub Pages mobile link, `#k=` kept;<br>• wide screens → the Workspace contract | D16 host rule kept: phones use GitHub Pages, computers use Vercel |

**Monorepo mechanics.**

- **Preferred:** a pnpm workspace at the repo root (`pnpm-workspace.yaml` with `ned-wallet`, `ned-workspace`, `packages/*`).
  - Move `ned-wallet/pnpm-workspace.yaml` settings (`overrides`, `allowBuilds`, `minimumReleaseAgeExclude`) to the root.
  - Let Metro follow the workspace package.
- **Fallback, if Expo export or EAS breaks and cannot be fixed within 1.5 hours:**
  - no root workspace;
  - both apps import the core source through a path alias (`tsconfig` `paths` + Vite `resolve.alias` + Metro `watchFolders` / `extraNodeModules`);
  - peer libraries are resolved from each app's own `node_modules`.
- W0 decides and records which one is used.

## 2. Tasks and order

| Task | Content | Depends on | Hours \[Assumption\] |
| --- | --- | --- | --- |
| **W0** | Create `packages/ned-core`, move the pure modules, shims in `ned-wallet`, monorepo set-up | Nothing (can run now) | 4 |
| **W1** | Scaffold `ned-workspace`:<br>• Vite, router, tokens, Motion, Dynamic login;<br>• layout and wallet panel (signed out and home);<br>• `vercel.json` + security headers → **first Vercel deploy and domain** | W0 | 4 |
| **W2** | Overview (stats, needs your action, contracts table) and a read-only contract page with the invite-link router `/c/:fund` and "Paste the contract link" | W1; A2 for v1.1 accounts | 3 |
| **W3** | Brief editor `/new` | W2, B1 (content in core) | 4 |
| **W4** | Submit and Review with file fingerprints; the wallet panel confirm state; done states | W3 | 5 |
| **W5** | Polish:<br>• keyboard and focus;<br>• Reduce Motion;<br>• bundle and Lighthouse;<br>• "Continue on your phone" QR;<br>• final Vercel deploy | W4 | 2 |

**Order with the rest of `build-plan.md`:**

1. G5 → W0 → W1. This gives the Vercel domain; then G2 and G3.
2. A1 → A2 → B1 (in the core) → B2.
3. W2 → B3 → B4a → B4b.
4. W3 → W4 → (B5) → W5 → D1 → D2.

About 22 hours instead of 16 for C1–C4: a separate app costs about 6 more hours. Cut order, added to `build-plan.md` section 6:

1. W5 polish beyond keyboard and Reduce Motion.
2. W2 Overview: the contracts table only.
3. W4 file fingerprints: links and note only.

## 3. Rules specific to `ned-workspace`

- `build-plan.md` section 10 applies.
- Screens follow `docs/02-design/canvas-v2/Web*.dc.html` and `MotionSurfaces.dc.html`: same tokens, no outlines, the same motion values.
- Motion:
  - only `opacity` and `transform`;
  - no duration over 400 ms;
  - amounts never animate;
  - `MotionConfig reducedMotion="user"`.
- Every signing action goes through the wallet panel's confirm state, then `actions.ts`.
  - If Dynamic shows its own confirmation on the web, our panel becomes a summary with no second Confirm.
- The Vietnam view shows VND only and no client actions (D18). Region comes from the same local setting, asked once in the Workspace if it is missing.
- The content key `K` never appears in logs, errors, analytics or URLs other than the invite link. Clear `#k=` from the address bar after import.
- Desktop first (≥ 1,024 px).
  - Below 900 px, show "Use the N.E.D app on your phone" with a QR to the mobile build.

---

## 4. Prompts

Run each prompt in a new Claude Code session. Attach screenshots of the named boards where it says "I attach".

### W0 · Shared core package

```text
Task: workspace-plan.md W0 — create packages/ned-core with the pure TypeScript shared by the mobile app and the new Workspace; ned-wallet keeps working unchanged through re-export shims.
Branch: feat/w0-ned-core (from up-to-date main).
Read first: CLAUDE.md; docs/09-milestone-lock/workspace-plan.md sections 1–3; build-plan.md section 10; ned-wallet/ARCHITECTURE.md and AGENTS.md; ned-wallet/package.json, pnpm-workspace.yaml, metro.config.js, tsconfig.json; every file you move.
Do:
1. Decide the monorepo mechanics (workspace-plan section 1): try the root pnpm workspace first (move overrides/allowBuilds/minimumReleaseAgeExclude to the root, keep the @solana/web3.js 1.98.4 override). Run `npx expo export --platform web` and `npx tsc --noEmit` in ned-wallet. If it cannot be made green within 1.5 h, switch to the path-alias fallback. Record the choice and why in packages/ned-core/README.md.
2. packages/ned-core (name @ned/core, "type": "module", TS source exported directly, no build step unless the chosen mechanics need one): move without behaviour change constants/chain.ts (minus env reads), idl/ned_program.json + .ts, services/chain/{connection→createConnection, idl, ata, balance, errors, send}, services/milestone/*, services/identity/{dualPda, resolveCore, format, transactionCost}, utils/amountInput.ts if format.ts needs it. Add configureCore({ rpcUrl, programId?, workspaceOrigin?, mobileOrigin? }) and getters; remove every process.env read from moved code. Peer deps: @solana/web3.js, @coral-xyz/anchor, @noble/hashes, bs58, buffer.
3. Add core/actions.ts: the framework-free pipeline now inlined in hooks/useMilestoneActions.ts (fresh fund read → rules check → builder → sign via an injected signer(tx) → send → confirm → result), so both apps' hooks become thin wrappers. Keep error sentences from describeTxError.
4. ned-wallet: leave re-export shims at the old paths (services/milestone/index.ts, services/chain/*.ts, constants/chain.ts, services/identity/* moved parts) so no screen or hook import changes; call configureCore(...) in app/_layout.tsx (or the earliest init file) from EXPO_PUBLIC_* values; useMilestoneActions uses core/actions.ts.
5. Move the moved modules' tests to packages/ned-core (node --test) and keep ned-wallet's npm test running the remaining ones; add a root script or document how to run both.
Rules: build-plan section 10; no logic change (a pure move + configuration injection); one copy of @solana/web3.js per app bundle (prove it: list resolved paths, or check the web bundle contains one copy).
Acceptance: core tests + ned-wallet npm test all pass (same count as before: 91 total split across both); ned-wallet tsc and `npx expo export --platform web` green; `npm run milestone:devnet` still PASS; the GitHub Pages deploy command unchanged. Report the diff size and any import you could not keep stable.
Finish: commit in small steps, push, fast-forward main; update docs/progress-log.md and ned-wallet/ARCHITECTURE.md (new package).
```

### W1 · Scaffold `ned-workspace`, login, wallet panel, first Vercel deploy

```text
Task: workspace-plan.md W1 — create ned-workspace (Vite + React + TypeScript) with routing, design tokens, Motion, Dynamic Google login, the top bar and wallet panel (signed out + home), and the Vercel config, so the first deploy gives us the production domain.
Branch: feat/w1-workspace-scaffold.
Read first: CLAUDE.md; workspace-plan.md sections 1–3; build-plan.md section 10; README.md D16–D20; packages/ned-core/README.md; ned-wallet/services/auth/* (how the Dynamic JS SDK headless is set up: client creation, Solana extension, web social redirect flow, signTransaction); docs/archive/poc-dynamic.md; boards docs/02-design/canvas-v2/WebSignIn, WebWorkspace, WebWalletPanel, MotionSurfaces, Main, Avatar. I attach screenshots of WebSignIn and WebWorkspace with the panel open.
Do:
1. ned-workspace/: Vite React-TS app in the monorepo (W0 mechanics), depends on @ned/core, @dynamic-labs-sdk/client + /solana (same versions as ned-wallet), react-router, @tanstack/react-query, motion, react-qr-code (or another tiny QR lib — ask if you want something else). Buffer polyfill for web3.js/anchor done the minimal way.
2. src/styles/tokens.css: CSS variables from the boards (ground #F4F4F6, card #FFFFFF, ink #111116, caption #5E5E6A, accent #7B2FBE, link #6A22B0, tint #F2EAFB, divider #F0F0F3, status tints, shadows S1/S-accent, radii, Space Grotesk / Inter / Space Mono). No borders around components. src/motion.ts: the MotionSurfaces token table for Motion (durations, cubic-bezier curves, stagger 40 ms max 5); LazyMotion + domAnimation; MotionConfig reducedMotion="user".
3. src/auth/: AuthProvider + useAuth with the same shape as mobile ({ status, walletAddress, login, logout, signTransaction }), Google social redirect login, same EXPO environment ID passed as VITE_DYNAMIC_ENVIRONMENT_ID. configureCore() at start from VITE_* env (VITE_HELIUS_DEVNET_URL, VITE_PROGRAM_ID optional, VITE_MOBILE_ORIGIN, VITE_WORKSPACE_ORIGIN). .env.example with names only.
4. Layout: top bar (logo, DEVNET badge, wallet button with Avatar from packages/ned-core/avatar.ts — port Avatar.dc.html there if B3 has not done it yet; render as SVG), content max 1,280 px; < 900 px → "Use the N.E.D app on your phone" + QR to VITE_MOBILE_ORIGIN.
5. WalletPanel: signed out (Continue with Google), home (balance or ≈ VND per region, needs your action placeholder, quick actions, Open the full wallet → mobile origin, Sign out); popover animation from the top-right, Escape/outside click close, focus trap, aria-expanded. The confirm state comes in W4 (leave the API: confirm(request) → Promise<boolean>).
6. Routes: / (Overview placeholder "Your contracts" using a read of useFunds-equivalent built on core queries — a simple list is enough here), /sign-in, * → /.
7. ned-workspace/vercel.json: framework vite, SPA rewrite to /index.html, headers (Content-Security-Policy listing every host really used: Dynamic API/auth, Helius + Solana devnet RPC https/wss, Google Fonts; frame-ancestors 'none'; start as Report-Only if unsure and say so), X-Frame-Options DENY, Referrer-Policy no-referrer.
Rules: build-plan section 10; workspace-plan section 3; do not create the Vercel project or touch dashboards.
Acceptance: `pnpm --filter ned-workspace build` and typecheck green; ned-wallet and core tests still green; `vite preview` locally: Google login (localhost must be in the Dynamic sandbox allowed origins — tell me if it is not), the wallet address equals the phone's, the panel opens/closes with motion and with Reduce Motion on; Lighthouse desktop performance and accessibility ≥ 90. Then give me: the exact Vercel project settings (Root Directory ned-workspace, framework Vite, install/build commands for the monorepo, env var names) and the domains I must add in Dynamic and Helius.
Finish: commit, push, fast-forward main; progress-log.md row.
```

### W2 · Overview, contract page, invite-link router

```text
Task: workspace-plan.md W2 — Overview (stats, needs your action, contracts table), read-only contract page, the /c/:fund invite-link router and "Paste the contract link".
Branch: feat/w2-workspace-overview.
Read first: workspace-plan.md sections 1–3; build-plan.md sections 4 (B1 model) and 10; product-spec 4, 5.1, 6; non-ui-plan 3 and 3.1; boards WebWorkspace (who = mia / vinh), ContractDetail (for states and labels). I attach screenshots of WebWorkspace in both views.
Do:
1. hooks in ned-workspace/src/hooks: useFunds, useFund, useChainTime, useRegion, useContractContent — thin wrappers over @ned/core (queries, view, content/notes/keys once B1 is merged; until then contentStatus = 'missing').
2. / Overview exactly as WebWorkspace.dc.html: greeting, three stat cards, needs-your-action cards, contracts table (overflow-x on narrow widths), avatars; Vietnam view in ≈ VND with no "New contract".
3. /c/:fund: decide BEFORE importing the key or clearing the fragment — width < 900 → location.replace(MOBILE_ORIGIN + '/c/' + fund + location.hash); else import #k= into key storage (localStorage adapter, per wallet), clear the hash with history.replaceState, then go to /contract/:fund.
4. /contract/:fund: read-only summary (state, destination, milestones with chain-time countdowns, brief status: ok / mismatch / noKey with "Paste the contract link" input that accepts a full link or #k=…), and the role-based next step button linking to /contract/:fund/submit or /review (pages come in W4).
5. Page transitions with Motion (AnimatePresence, fade + 10 px rise, stagger ≤ 5).
Acceptance: build + typecheck + tests; on the Vercel preview with Mia and Vinh accounts: both lists correct, an invite link opened on the laptop lands on the contract with the key imported and the hash cleared, the same link on the iPhone goes to GitHub Pages with #k= intact.
Finish: commit, push, fast-forward main; progress-log.md row.
```

### W3 · Brief editor

```text
Task: workspace-plan.md W3 — /new brief editor following WebContractNew.dc.html.
Branch: feat/w3-brief-editor.
Read first: workspace-plan.md 2–3; build-plan.md 4 (B1), 10; product-spec 3, 5.1; non-ui-plan 3.1; board WebContractNew (tweaks who = mia, who = vinh, created = true); packages/ned-core content.ts, keys.ts, actions.ts, rules.ts. I attach screenshots.
Do: freelancer chip (@username → wallet with a fresh on-chain read via core dualPda/resolveCore; ned-wallet's resolve.ts stays mobile-only because of AsyncStorage), title with 32-byte counter, scope, references, milestone cards (amount, submit-by, review time incl. "1 min (devnet demo)", "Done when" list with add/remove), live brief fingerprint (core briefHash), summary aside and rule list, validation identical to mobile (core rules + content limits), Create → WalletPanel.confirm (summary) → actions.create → created state with invite link (copy), QR for the phone, fingerprint. Vietnam view: the block message (D18). Motion: add/remove of milestone and criterion rows with layout animation (transform only), state change 320 ms.
Acceptance: build + typecheck + tests; create a 2-milestone contract with criteria on devnet from the Vercel preview; the invite link opened on the iPhone shows the brief with "Brief matches ✓" on mobile (after B4a).
Finish: commit, push, fast-forward main; progress-log.md row.
```

### W4 · Submit, review, confirm panel

```text
Task: workspace-plan.md W4 — /contract/:fund/submit and /contract/:fund/review following WebSubmit.dc.html and WebReview.dc.html, plus the wallet panel confirm state.
Branch: feat/w4-submit-review.
Read first: workspace-plan.md 2–3; build-plan.md 9 (risks) and 10; non-ui-plan 3.1; boards WebSubmit, WebReview (tweaks done, delivery = changed), WebWalletPanel (mode sign, action create/submit/approve). I attach screenshots.
Do:
1. WalletPanel confirm state: request summary rows, note, Cancel / Confirm; fixed position with backdrop fade; returns the user's choice. If Dynamic shows its own confirmation on web, make ours a summary with a single "Continue" and report it.
2. Submit: links with the "Fixed version" hint (Figma version-id, Git commit / tree/<sha> / blob/<sha>), file drop + picker hashed with crypto.subtle.digest('SHA-256') (refuse > 200 MB, progress for > 20 MB, nothing uploaded), note (≤ 500), self-check of the brief criteria (local only), live delivery fingerprint (core deliveryEvidence), deadline from chain time with "How on-time is decided", Submit → confirm → actions.submit(index, delivery) → done state. Vietnam view: ≈ VND only.
3. Review: delivery (links open with rel="noopener noreferrer", files with fingerprints, note), "On time" from submitted_at vs submit_by, integrity block ("Same delivery that was submitted ✓" / changed), "Drop a file to compare" (local hash vs listed fingerprint), criteria ticks (local), timeline, auto-release countdown, Release → confirm → actions.approve; Dispute only with the P1 flag.
Acceptance: build + typecheck + tests; devnet run: Vinh opens the invite link on his laptop and submits 2 links + 1 file → Mia reviews on her laptop: matches; the same file → "Same file ✓", another file → "Different file"; release; the iPhone (Vinh) shows Released in the VN view.
Finish: commit, push, fast-forward main; progress-log.md row.
```

### W5 · Polish and production deploy

```text
Task: workspace-plan.md W5 — accessibility, Reduce Motion, performance, final production deploy of ned-workspace.
Branch: chore/w5-workspace-polish.
Read first: workspace-plan.md 3; build-plan.md 8, 10.
Do: keyboard pass on every page (Tab order, focus-visible ring, Escape closes panel/sheets, focus returns to the trigger); Reduce Motion verified; bundle report (keep the initial JS reasonable; lazy-load the editor/submit/review routes); CSP switched from Report-Only to enforcing once no violations remain; Lighthouse desktop ≥ 90 for performance and accessibility on /, /new, /contract/:fund/review; README section for ned-workspace (how to run, env names, deploy). Ask me before the production deploy.
Acceptance: the D1 end-to-end run passes on the production URL; results recorded in docs/progress-log.md.
Finish: commit, push, fast-forward main.
```

---

## 5. Additions (4 Oct 2026): wallet extension (W6) and Records page (W7)

Decisions D23 and D24 in [`README.md`](README.md#decision-log). Boards: `WebWalletPanel.dc.html`, `WebExtensionGallery.dc.html` and `WebRecords.dc.html` in [`../02-design/canvas-v2/`](../02-design/canvas-v2/README.md) (canvas version 104).

### 5.1 W6 · The wallet panel becomes an extension that **is** the mobile app

**What the PO asked for.** The panel that drops down from @handle works like a wallet extension. When signed in, its content is identical to the mobile app, with every page and feature.

**Design (board).**

- Extension header: Back (when not on a tab root), N.E.D mark, avatar + @handle, "Devnet · short address", Open in full view, Close.
- Body: the mobile screens themselves.
- A tap that leads to another app screen stays inside the panel; the bottom tabs return to their root screens.
- Signed out and "confirm a web action" keep their own states.

**Build (recommended): the mobile web build in a same-origin iframe.**

| Item | Decision |
| --- | --- |
| Where the mobile app comes from | Vercel builds `ned-wallet` for the web with base URL `/wallet` and copies it to `ned-workspace/dist/wallet/`. Same origin as the Workspace. GitHub Pages (phones) is unchanged |
| Why same origin | One origin means one `localStorage`, so both apps share:<br>• the Dynamic session (same headless SDK, same environment ID);<br>• the contract-key store (`@ned_contract_keys_v1:<wallet>`, same key in both apps);<br>• very likely the device key (D22).<br>No second Google login inside the panel \[Inference: W6 proves it on the Vercel preview\] |
| Panel shell (React, in `ned-workspace`) | Header as the board. `<iframe src="/wallet/…">` 390 px wide; height `min(780px, 100vh - 96px)`.<br>• Mounted on first open, then kept mounted (hidden) so the app keeps its state.<br>• Back = `iframe.contentWindow.history.back()`.<br>• Expand = open `/wallet/<current path>` in a new tab.<br>• Deep links (`openWalletAt('/settings')`, `/contracts/<fund>`) set the iframe location |
| Embedded mode in `ned-wallet` | Detects `window.top !== window.self`:<br>• no "open in app" prompts;<br>• no page-level scroll lock;<br>• posts its current route to the parent with `postMessage` (same origin only, origin checked), so Back and Expand know where it is |
| Headers | The global rule keeps `X-Frame-Options: DENY` and `frame-ancestors 'none'` for every path **except** `/wallet/*`. `/wallet/*` gets `X-Frame-Options: SAMEORIGIN` and its own CSP with `frame-ancestors 'self'` (Report-Only first, enforce once clean). The Workspace CSP already allows `frame-src 'self'` |
| Web actions | Create, Submit and Release started on a Workspace page keep the Workspace confirm state (W3/W4). Actions inside the panel use the mobile app's own slide-to-confirm |
| Region and consent | Shared through the same storage keys, so the user is not asked twice. If the keys differ, align them in W6 |

**Fallback, if the session or the device key is not shared and cannot be fixed within 2 hours:**

- the panel shows "Open N.E.D Wallet", which opens the GitHub Pages mobile build in a 390 × 844 popup window (`window.open`);
- one more Google sign-in on that origin.

**Risks.**

| Risk | Mitigation |
| --- | --- |
| Two Dynamic SDK instances on one origin refresh the same session | Load the iframe only when the panel opens. If token refresh races appear, the iframe app becomes the single signer and the Workspace asks it to sign through `postMessage` |
| Bigger Vercel build (Expo export) | Separate cache; check the build time stays inside the plan limit |
| Embedded app registers itself as another device (D22) | Prefer sharing the Workspace device key. If not possible, accept one extra `DeviceKeys` entry and say so in the progress log |

### 5.2 W7 · Records page in the Workspace

`/records`, following `WebRecords.dc.html`. It does not link to mobile screens; Settings opens the extension at Settings.

**International view (client)**
- Stats:
  - contracts created;
  - locked now;
  - released;
  - refunded to you.
- **By contract:** one card per contract with its milestones and a history timeline (created, accepted, locked, submitted, review over, released, refunded, closed).
- **All activity:** one table with filters by event, a period selector and CSV export.

**Vietnam view (freelancer)**
- Same structure, from the freelancer's side.
- ≈ VND only.
- The simulated-payout disclaimer.

**Data (core).**
- `@ned/core/milestone/history.ts`:
  - collect fund addresses from the open funds (memcmp) plus the wallet's own transactions (`create_fund` as client, `accept` as freelancer);
  - for each fund, read **its** signatures (`getSignaturesForAddress(fund)` also works after `close`) and decode the program events with the IDL.
  - This includes events signed by others: the freelancer's `submit`, and `release_after_review` / `refund` by anyone.
- Cache per wallet in the existing records cache; refresh incrementally from the newest known signature.
- The mobile Records screen can use the same history for the client side (today `RecordsIntl` shows releases only).

### 5.3 Order and hours

| Task | Depends on | Hours \[Assumption\] |
| --- | --- | --- |
| W6 | W5 (done), D22 (done) | 5 |
| W7 | W5 | 4 |
| (optional) mobile Records for clients from the same history | W7 | 1.5 |

Run W7 first if time is short. W6 has the higher risk: session sharing must be proven before the rest of W6 is built.

### W6 · Prompt

```text
Task: workspace-plan.md section 5.1 (W6) — the wallet panel becomes an extension whose signed-in body is the real mobile app: the ned-wallet web build served at /wallet on the Workspace origin and shown in a same-origin iframe.
Branch: feat/w6-wallet-extension (from up-to-date main).
Read first: CLAUDE.md; workspace-plan.md sections 1, 3 and 5; README.md D20–D24; key-sync-plan.md (device keys); ned-workspace/src/components/WalletPanel.tsx, WalletPanelContext.tsx, TopBar.tsx, vercel.json, src/auth/*; ned-wallet/app.json, package.json (export/deploy scripts), app/_layout.tsx, services/auth/*, the storage keys used for session, contract keys, device keys, region and consent; docs/02-design/canvas-v2/WebWalletPanel.dc.html and WebExtensionGallery.dc.html. I attach screenshots of the gallery.
Do, in this order, stopping after step 1 if it fails:
1. Spike (≤ 2 h): build ned-wallet for the web with base URL /wallet (add app.config.ts reading EXPO_BASE_URL, default "/Unihackfest-2026" so GitHub Pages is unchanged), copy it to ned-workspace/dist/wallet, serve both from one origin locally, sign in on the Workspace and open /wallet in an iframe. Report: is the iframe app signed in without a second login? Same wallet? Contract keys visible? Device key reused or a new DeviceKeys entry? Region/consent asked again? If the session is not shared, try aligning storage keys; if still not shared, STOP and tell me (fallback: popup window to the GitHub Pages build, workspace-plan 5.1).
2. Build: the Vercel install/build for ned-workspace also builds ned-wallet web (/wallet) and copies it into dist/wallet; keep the build time reasonable and report it. Keep `npm run deploy` (GitHub Pages) unchanged.
3. vercel.json: rewrite /wallet/(.*) to /wallet/index.html before the catch-all; global security headers apply to every path except /wallet/*; /wallet/* gets X-Frame-Options SAMEORIGIN and a CSP (Report-Only first) with frame-ancestors 'self' and every host the mobile app calls.
4. ned-wallet embedded mode: when window.top !== window.self, hide prompts that make no sense in a panel, and post { type: 'ned-route', path } to window.parent on every route change (targetOrigin = location.origin); ignore messages from other origins.
5. WalletPanel: signed-in state = extension header (Back when not a tab root, avatar, @handle, Devnet · short address, Open in full view, Close) + the iframe (390 px wide, height min(780px, 100vh − 96px)), mounted on first open and kept mounted; openWalletAt(path) in WalletPanelContext; Workspace "Settings" nav and "Release now" rows call it. Signed out and confirm states stay. Motion from motion.ts; Escape/focus behaviour unchanged.
Rules: build-plan section 10; workspace-plan section 3; no change to signing logic; never post keys or tokens through postMessage.
Acceptance: workspace + wallet tests, typechecks, both builds; on the Vercel preview: one Google login, open the panel → mobile Home signed in (no second login), Contracts → a contract → Back, Settings deep link, a Send and a Submit done inside the panel, the same wallet and keys as the Workspace; headers checked with curl -I for / and /wallet/; GitHub Pages build unchanged. Report bundle/initial-load impact (the iframe must not load before the panel opens).
Finish: commit in small steps, push, fast-forward main; progress-log.md row with the spike results.
```

### W7 · Prompt

```text
Task: workspace-plan.md section 5.2 (W7) — /records in the Workspace following WebRecords.dc.html, from a new chain history in @ned/core.
Branch: feat/w7-workspace-records.
Read first: CLAUDE.md; workspace-plan.md sections 3 and 5.2; README.md D24; packages/ned-core/src/milestone/records.ts, events.ts, queries.ts, view.ts, format.ts; ned-wallet Records screen (B5); docs/02-design/canvas-v2/WebRecords.dc.html (tweaks who = mia / vinh, view = contract / activity). I attach screenshots of both views.
Do:
1. packages/ned-core/src/milestone/history.ts: fund addresses = open funds where the wallet is client or freelancer + funds from the wallet's own create_fund / accept transactions; for each fund read getSignaturesForAddress(fund) (works after close) and decode program events with the IDL (FundCreated, FundAccepted, FundLocked, MilestoneSubmitted, MilestoneReleased, MilestoneRefunded, MilestoneDisputed, FundCancelled, FundClosed, NotePosted ignored); return per-contract timelines + a flat activity list with time, kind, milestone, amount units, actor, signature. Incremental cache per wallet in the existing records cache (newest signature per fund). Unit tests with recorded transaction fixtures.
2. ned-workspace /records page exactly as the board: stats, By contract (expand/collapse cards with milestones + history), All activity (filters by event, period selector, Explorer link per row), CSV export (core recordsCsv extended), footer disclaimer; Vietnam view in ≈ VND only, from the freelancer's side; link in WorkspaceNav; Overview "History" link to /records.
3. Optional if time: ned-wallet Records uses the same history for clients (Mia sees her created contracts and milestone steps, not an empty list).
Rules: build-plan section 10; RPC calls batched and cached (no request per row on every render); amounts never animate.
Acceptance: tests, typechecks, builds; with Mia's account the page shows the open contracts and one closed contract with every step, numbers equal to the chain (spot-check 3 signatures on Explorer); Vinh's view shows only VND; CSV opens in a spreadsheet.
Finish: commit, push, fast-forward main; progress-log.md row.
```
