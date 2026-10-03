# Build plan: program change → mobile wallet → web Workspace (3 → 9 Oct 2026)

Status: **adopted 3 Oct 2026** by the PO. This plan replaces the schedule in [`refactor-plan.md`](refactor-plan.md) section 4 for everything not yet built. PR0–PR3, N0–N13 and PR7 items already in `main` (`b267b4f`) stay as they are; their facts are in [`../tong-hop-tien-do.md`](../tong-hop-tien-do.md) "Milestone Lock — progress". Decisions D14–D19 behind this plan are in [`README.md`](README.md#decision-log). Prompts for each task: [`prompts-build.md`](prompts-build.md).

## 0. Summary

**Where we are (3 Oct, `main` = `b267b4f`).**

- The program has all 12 Milestone Lock instructions; they are deployed on devnet.
  - Tests: milestone 24/24, identity 10/10.
  - `SharedFund` is 708 bytes.
- The app side is done:
  - `services/milestone` and the hooks;
  - `/dev/milestone` harness;
  - region and consent stores;
  - devnet smoke run passes; 91 app tests pass.
- **No product screen uses Milestone Lock yet.**
  - The app is still on the dark theme (`constants/design.ts`).
  - Swap and xStocks tiles are still visible.
- The design canvas is final:
  - mobile boards;
  - the web Workspace boards;
  - the Motion & surfaces board.

**What we build, in order.**

| Phase | Content | Hours \[Assumption\] |
| --- | --- | --- |
| **G · Gates** | Owner checks before code: same wallet on a second device, Dynamic and Helius domain lists, old devnet funds closed | 1.5 (owner) |
| **A · Program** | `brief_hash`, non-zero evidence, `post_note`; tests; devnet upgrade; IDL to the app | 6 |
| **B · Mobile wallet** | Content layer (brief and delivery, encrypted notes), light theme + motion, navigation and onboarding, contract screens, records | 32 |
| **C · Web** | `ned-workspace/` app ([`workspace-plan.md`](workspace-plan.md) W0–W5: shared core, Vite app, wallet panel, brief editor, submit, review, invite-link router, Vercel) and the landing page (C5) | 26 |
| **D · Hardening** | Two-device end-to-end run, demo operations, README, deploys, backup video | 6 |

That is about 65 hours for one developer in six days.

- To fit, the landing page (C5) goes to a second team member, and the cut order in section 6 applies from 7 Oct.
- **Never cut:**
  - phase A;
  - accept, lock, submit and approve on the phone;
  - Workspace submit and review;
  - the Vietnam view rules.

## 1. What this plan adds that the earlier plans did not have

| Gap | Where it is handled |
| --- | --- |
| No written brief: nothing on-chain says what work was agreed | A1 `brief_hash`; B1 brief content; C3 brief editor |
| Delivery was one link; files and notes had no channel to the client | A1 `post_note`; B1 delivery content; C4 |
| An all-zero `evidence` was accepted | A1 |
| The app is dark; the design is light, with no outlines and with motion | B2 |
| The web Workspace and landing page did not exist | C1–C5 |
| Two hosts mean two origins: separate logins, separate local storage, two domain lists | G, C1 (invite-link router), D1 |
| The Vietnam view could still reach client actions | B3, B4, C3 (`useRegion` guard) |
| Open issue 3 (label after the review deadline) | B4 copy: client "Review time is over · anyone can release", freelancer "Ready to release" |
| Open issue 5 (TODO N11 bridge) | B3 removes it |
| Security headers for the signing page | C1 (`vercel.json` headers) |

## 2. Phase G · Gates (owner, before A2 and C1)

| # | Check | Pass criterion | If it fails |
| --- | --- | --- | --- |
| G1 | Sign in on a laptop browser with the Google account used on the iPhone | Same `walletAddress`, and a 0-value devnet signing works | Enable Dynamic's backup and restore for embedded wallets before C2; the Workspace waits |
| G2 | Dynamic dashboard: add the Vercel production domain(s) to the allowed origins | Login works on the Vercel preview of C1 | Dynamic advises explicit domains, no wildcards: preview URLs other than production will not log in |
| G3 | Helius key: add the Vercel domain to its domain restriction (key rotation, open issue 1) | RPC calls succeed from Vercel | Fall back to the public devnet RPC for the demo |
| G4 | Before the program upgrade: list `SharedFund` accounts of 708 bytes on devnet; settle and close them, or recycle their USDC | Zero 708-byte funds left (the A2 prompt prints the list) | Old funds stay readable only by the old client code; their USDC is stuck |
| G5 | LICENSE decision (open issue 2) | MIT file added, or the MIT claim removed | — |

## 3. Phase A · Program (one PR, deploy once)

Specification: [`program-spec.md`](program-spec.md) v1.1 (sections 2, 3.1, 4, 4.1, 5, 6, 8, 9 amended on 3 Oct).

### A1 · Code and tests (about 4 h)

| Change | Files |
| --- | --- |
| `SharedFund.brief_hash: [u8; 32]` after `payout_reference`. `_reserved` stays 32 bytes, so the account is **740** bytes. `ACCOUNT_VERSION = 2`. Offsets 12 and 44 do not move | `state/shared_fund.rs`, `constants.rs` |
| `create_fund(…, brief_hash)`: an all-zero hash fails with `InvalidBriefHash`. `FundCreated` gains `brief_hash` | `instructions/milestone/create_fund.rs`, `events.rs`, `lib.rs` |
| `accept(…, expected_brief_hash)`: if it differs from the stored hash, fail with `BriefMismatch` | `accept.rs`, `lib.rs` |
| `submit`: an all-zero evidence fails with `InvalidEvidence` | `submit.rs` |
| New `post_note(kind, milestone, part, parts, data)`. No state change; emits `NotePosted`. Rules:<br>• Brief notes (`kind = 0`) come from the client only, while the fund is `Created`, with `milestone = 0`.<br>• Delivery notes (`kind = 1`) come from the freelancer only, for a milestone that is `Submitted`.<br>• `1 ≤ data.len() ≤ 900`.<br>• `part < parts ≤ 8`. | `instructions/milestone/post_note.rs`, `mod.rs`, `lib.rs` |
| New errors, appended after `MathOverflow` in this order: `InvalidBriefHash`, `BriefMismatch`, `InvalidEvidence`, `InvalidNote`, `NoteNotAllowed` | `errors.rs` |
| Tests: the layout test is 740; tests 16–18 of program-spec section 8 | `tests/milestone.rs`, `tests/common/mod.rs` |

### A2 · Deploy (about 2 h)

1. Run G4.
2. `anchor build`.
3. Run `solana program extend` if the `.so` grew.
4. Upgrade the program.
5. `anchor idl upgrade`.
6. Copy the IDL to `ned-wallet/idl/`.
7. Update `services/milestone/layout.ts`:
   - `FUND_SIZE = 740`;
   - `OFFSET_BRIEF_HASH = 676`.
8. Run `milestone:devnet` twice.
9. Record the signature, program size and IDL account in `tong-hop-tien-do.md`.

## 4. Phase B · Mobile wallet (Expo app; screens follow the canvas boards)

### B1 · Content layer: brief, delivery, encrypted notes (about 5 h)

**Model.** Each contract has a random 32-byte content key `K`, made by the client's app.

- Brief and delivery are canonical JSON (fixed key order).
  - `brief_hash = SHA-256(brief JSON)`.
  - `evidence = SHA-256(delivery JSON)`.
- Each note is encrypted with XChaCha20-Poly1305 (`@noble/ciphers`) and stored as `post_note` data:
  - byte 0: version;
  - 4-byte set ID;
  - 24-byte nonce;
  - ciphertext (associated data as in `notes.ts` below).
  - Notes are split into parts of up to 900 bytes.
- `K` travels **only** in the invite-link fragment: `…/c/<fund>#k=<base64url>`.
  - Browsers do not send the part after `#` to a server.
  - The app keeps `K` per wallet in local storage (`@ned_contract_keys_v1:<wallet>`).
  - A device without `K` still shows the money state and the on-chain hashes, plus the message "Open the contract link on this device to read the brief".

**Files.**

| File | Content |
| --- | --- |
| `services/milestone/content.ts` | `Brief` and `Delivery` types; `canonicalBrief` and `canonicalDelivery`; `briefHash` and `deliveryEvidence`; limits: scope ≤ 1,500 characters, note ≤ 500 characters, ≤ 5 references, ≤ 6 criteria per milestone, ≤ 5 links, ≤ 10 files |
| `services/milestone/notes.ts` | `encryptNote` / `decryptNote`, `splitParts`, `buildPostNote`, `fetchNotes(fund)` (`getSignaturesForAddress` + `getTransaction` + IDL decode). Integrity rules:<br>• Skip failed transactions (`meta.err`).<br>• Check the program ID and the author: client for briefs, freelancer for deliveries.<br>• Group parts by a random 4-byte set ID.<br>• Associated data = `fund ‖ kind ‖ milestone ‖ setId ‖ part ‖ parts`.<br>• Show only the set whose plaintext hash equals the on-chain hash; any other set is "does not match", never the newest by default |
| `services/milestone/keys.ts` | Generate, store and read `K`; `inviteLink(fund, K)` always on `WORKSPACE_ORIGIN` (the C1 router sends phones to GitHub Pages; before C1 exists it falls back to `MOBILE_ORIGIN`); `importKeyFromFragment(fragment)` |
| `constants/hosts.ts` | `MOBILE_ORIGIN`, `WORKSPACE_ORIGIN` from env with defaults (C1 adds `isWorkspaceHost()`) |
| `services/milestone/evidence.ts` | Replace `evidenceHash(link)` by `deliveryEvidence` (after G4 no 708-byte fund is read: `decode.ts` and `queries.ts` filter on `FUND_SIZE`) |
| `services/milestone/client.ts` | `buildCreateFund` takes `briefHash`; `buildAccept` takes `expectedBriefHash`; `buildSubmit` takes `evidence` and adds the delivery note. Same transaction if it fits in 1,232 bytes, otherwise a second transaction |
| `hooks/useContractContent.ts` (new) | `{ brief, contentStatus: 'ok' \| 'mismatch' \| 'noKey' \| 'missing' \| 'loading', deliveries, hasKey, inviteLink, importKey }` |
| `hooks/useMilestoneActions.ts` | `create(draft)` with `draft.brief`; returns `inviteLink`. `submit(index, delivery)`. `accept` passes the SHA-256 of the **decrypted brief shown to the freelancer** as `expected_brief_hash`, never the value read from the fund (a client could close a `Created` fund and recreate it with another hash), and refuses unless `contentStatus === 'ok'` |
| [`non-ui-plan.md`](non-ui-plan.md) section 3 | Interface amended (marked "3 Oct, build-plan B1") |

### B2 · Light theme, no outlines, motion (about 5 h)

- **`constants/design.ts`:** light tokens from the canvas Main board:
  - ground `#F4F4F6`, card `#FFFFFF`, ink `#111116`;
  - caption `#5E5E6A`, accent `#7B2FBE`, tint `#F2EAFB`;
  - divider `#F0F0F3`, used only between list rows;
  - shadow S1 and S-accent.
  - Remove the `border` token from components.
- **`constants/motion.ts`:** the token table of the Motion & surfaces board:
  - press 160 ms; enter 200 + 360 ms; stagger 40 ms, at most 5 items;
  - state change 320 ms; popover 200 ms; sheet 360 ms; field focus 180 ms;
  - curves `(.2,0,0,1)` and `(.16,1,.3,1)`.
- **`components/design`:**
  - `Card` and `ListRow` lose their borders;
  - `Button` and pressable rows scale to 0.98 with a Reanimated 4 CSS transition;
  - `Screen` content uses `FadeInDown` with stagger;
  - `Sheet` uses `SlideInDown` and a backdrop fade;
  - `Field` gets a filled background and a focus halo, and an error tint instead of a red border.
- **Rules:**
  - only opacity and transform move;
  - nothing lasts longer than 400 ms;
  - amounts never animate;
  - Reduce Motion turns everything into instant changes.
  - Check that `npx expo export --platform web` and the bundle size still pass.

### B3 · Navigation, onboarding, settings (refactor-plan PR4, about 5 h)

- **`WalletNav`:** Home · Contracts · Records · Settings. Remove the Swap and xStocks tiles and the tab (open issue 7).
- **Onboarding:** welcome → setup → (fund) → consent → profile (with the generated avatar) → residence → home.
  - Remove the TODO(N11 bridge) and set `CONSENT_SCREEN_READY = true` (open issue 5).
- **Settings:**
  - "I live in Vietnam" switch, display currency, consent, Disclosures, DEVNET badge;
  - copy fixes as listed in refactor-plan PR4.
- **`components/Avatar`:** the canvas algorithm (FNV-1a + murmur3 finaliser, 8 palettes × 6 patterns × 4 rotations). The seed is the wallet address.
- **Home:** greeting by time of day, flag icons, the new quick-action tiles:
  - Vietnam view: "Share @user" and "Records";
  - international view: New contract, Receive, Send.

### B4 · Contract screens (refactor-plan PR5 + content, about 14 h)

Routes `app/contracts/index.tsx`, `new.tsx`, `[fund].tsx`, plus the sheets, exactly as the boards.

**List and detail**
- Each detail screen shows the **Brief** card (scope, criteria, fingerprint check). Each milestone shows its **Delivery** card when one exists.
- `app/c/[fund].tsx` opens an invite link:
  - imports `K` from `#k=`;
  - then routes to `contracts/[fund]`.

**Create and accept**
- `new.tsx`, step 2: scope, references, and "Done when" criteria for each milestone (the mobile version of C3).
- `new.tsx`, final step: a share sheet with the invite link and a QR code.
- Accept sheet: shows the brief and "Brief matches ✓" before the slide.

**Submit and review**
- Submit sheet (phone): links + note only; no file fingerprints.
- Review sheet: shows the delivery; "Matches what was submitted ✓" is computed from the decrypted note against the on-chain evidence.

**Vietnam view and copy**
- No client actions and no "New contract" entry (D18).
- Open issue 3 labels as in section 1.
- P1 sheets only when `FEATURES.dispute` is on.

### B5 · Records and notifications (refactor-plan PR6, about 3 h, cuttable)

As refactor-plan PR6. In the Vietnam view, records are in ≈ VND.

## 5. Phase C · Web

> **3 Oct 2026 (D20):** C1–C4 are replaced by [`workspace-plan.md`](workspace-plan.md) W0–W5. The Workspace is its own app, `ned-workspace/`, and shared code moves to `packages/ned-core`. C1–C4 below are kept only as the feature list. C5 (landing page) is unchanged.

### C1 · Hosting and routing (about 3 h)

- **Base URL:**
  - `app.config.ts` reads `EXPO_BASE_URL` (default `/Unihackfest-2026` for GitHub Pages). Vercel builds with `EXPO_BASE_URL=""`.
  - Test both builds; whether Expo accepts an empty base URL is not verified \[Unverified\].
- **`vercel.json` in `ned-wallet/`** (Vercel project 2 "Workspace", Root Directory `ned-wallet`):
  - `buildCommand: expo export -p web`, `outputDirectory: dist`;
  - SPA rewrite to `/` (Expo docs);
  - `headers`: `Content-Security-Policy` (self, Dynamic, Helius, Solana RPC, Google Fonts), `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`. These cannot be set on GitHub Pages.
- **One rule per device type:**
  - phones use GitHub Pages;
  - computers use Vercel.
- **Invite-link router:** `app/c/[fund].tsx` on Vercel decides **before** importing the key or clearing `#k=`:
  - narrow screen → redirect to the GitHub Pages `/c/<fund>`, keeping `#k=…`;
  - wide screen → `/workspace/c/<fund>`.
- **Workspace QR:** "Continue on your phone" encodes the GitHub Pages link with the key.
- **`constants/hosts.ts`** (made in B1): add `isWorkspaceHost()`.

### C2 · Workspace shell and wallet panel (about 4 h)

- **`app/workspace/_layout.tsx`:** top bar (logo, DEVNET badge, wallet button) and content limited to 1,280 px. Below 900 px it shows "Use the N.E.D app on your phone" with the QR.
- **`components/workspace/WalletPanel.tsx`:** the panel from the boards.
  - States: signed out ("Continue with Google" → Dynamic login), home, confirm request.
  - Popover motion; Escape and outside click close it; focus stays inside while open.
  - Every signing action goes through `WalletPanel.confirm()`, then `useMilestoneActions`.
- **`app/workspace/index.tsx`:** Overview with stats, needs-your-action and the contracts table, from `useFunds`.
- **Sign-in screen** for signed-out visitors.

### C3 · Brief editor (about 4 h)

`app/workspace/new.tsx` follows the WebContractNew board:

- freelancer chip, title (32 bytes), scope, references;
- milestone cards: amount, submit-by, review time, "Done when";
- a live brief fingerprint;
- "Create contract" → confirm → created state with the invite link, copy button and QR.

In the Vietnam view the page shows the block message.

### C4 · Submit and review (about 5 h)

- **`app/workspace/c/[fund]/index.tsx`:** redirects to `submit` or `review` by role and milestone state; without the key it shows "Paste the contract link".
- **`app/workspace/c/[fund]/submit.tsx`:**
  - links, with a "Fixed version" hint for Figma version / Git commit URLs;
  - file drop: SHA-256 is computed in the browser with `crypto.subtle`; files over 200 MB are refused; nothing is uploaded;
  - note, self-check, the delivery fingerprint, and the deadline from chain time.
- **`app/workspace/c/[fund]/review.tsx`:**
  - delivery with links, files and note;
  - "On time" from `submitted_at`;
  - fingerprint match or mismatch;
  - "Drop a file to compare";
  - criteria ticks (local only), timeline, Release, Dispute (P1).

### C5 · Landing page (about 4 h, second team member)

`site/` is static HTML/CSS, or Vite + React with Motion for React (`motion/react`) if the team prefers. It is Vercel project 1 (Root Directory `site`).

**Content**
- Product line, using product-spec section 6 words.
- "Try the mobile demo":
  - QR → `/m`, which redirects to the GitHub Pages URL through `redirects` in `site/vercel.json`, so the printed QR survives a host change;
  - plus a plain link.
- "Open Workspace" → Vercel project 2.
- The 2-minute judge path; the devnet and simulated-partner disclosures.

**Rules**
- No login, no wallet code, no "payment" wording.

## 6. Schedule and cut order

| Date | Developer | Second member | PO / CL |
| --- | --- | --- | --- |
| 3 Oct (evening) | A1 | — | G1, G2, G5 |
| 4 Oct | A2, B1, B2 | C5 structure and copy | G3, G4; copy review B3 |
| 5 Oct | B3, B4 (list, detail, accept, lock) | C5 build | Second Google account for Mia ready |
| 6 Oct | B4 (new, submit, review, close) | C5 deploy | Two-device check of B4 |
| 7 Oct | C1, C2, C3 · (B5 if ahead) | QR and links final | Wording pass on all screens |
| 8 Oct | C4, D1 | Backup video script | Rehearsal × 2 |
| 9 Oct | **Freeze**: D2, both deploys, backup video | — | Compliance sign-off |

**Cut order (from 7 Oct, one at a time):**

1. B5 Records and notifications.
2. P1 sheets (dispute, split).
3. File fingerprints in C4 (links + note only).
4. Workspace Overview page (contracts table only).
5. Landing page motion: static page only.
6. Mobile "New contract" (create in the Workspace only).

## 7. Phase D · Hardening

- **D1 · End-to-end** (about 3 h). Two devices, two Google accounts:
  1. Mia creates on a laptop (Vercel).
  2. Vinh opens the invite link on the iPhone (GitHub Pages) and accepts VND.
  3. Mia locks on her phone.
  4. Vinh opens the same invite link on his laptop (this gives the laptop the key), then submits there (Vercel).
  5. Mia reviews on the laptop and releases.
  6. Close.
  7. Run once more with release after the review deadline (1-minute review).

  Fix only what fails.
- **D2 · Demo operations** (about 3 h):
  - recycle USDC; prepared contract B;
  - README "what runs";
  - deploy GitHub Pages and both Vercel projects;
  - record the URLs, program signature and compute-unit table in `tong-hop-tien-do.md`;
  - 2-minute backup video.

## 8. Testing per phase

| Phase | Gate |
| --- | --- |
| A | `anchor build && cargo test`: milestone tests (24 + the new ones) and the 10 identity tests; 0 warnings; devnet smoke twice |
| B | `npm test`, `npx tsc --noEmit`, `npx expo export --platform web`; new unit tests for `content`, `notes` (round trip, tampering, size split), `keys` and the invite link; manual check on iPhone Safari |
| C | Both builds (GitHub Pages base URL and Vercel root); login on Vercel; headers checked with `curl -I`; invite-link router on phone and laptop; file hash matches `sha256sum` |
| D | Demo script twice in a row on the deployed builds with no manual fix |

## 9. Risks

| Risk | Effect | Mitigation |
| --- | --- | --- |
| G1 fails: a new device gets a different wallet | The Workspace cannot sign for the same user | Turn on Dynamic backup and restore; or demo the Workspace with read-only + submit from the same browser profile |
| Embedded-wallet confirmations stack (Dynamic prompt + our panel) | Two confirmations per action | Keep our panel as a summary; if Dynamic shows its own prompt, skip ours on that platform |
| Brief longer than 900 bytes needs several `post_note` transactions | More signatures, more fees | Limits in B1; a typical brief fits in 1–2 parts |
| Invite link (with `K`) is shared further | Anyone with it can read the brief and delivery (never move money) | Disclose; do not post invite links publicly |
| Two origins | Separate sessions and key storage | One host per device type; invite links always on the Workspace host with the C1 router; "Copy contract link" on the detail screen and "Paste contract link" in the Workspace move the key between devices |
| "Matches ✓" is read as "the work is good" | It only proves the delivery note equals the on-chain evidence, not that the content behind a link is unchanged | Copy: "Same delivery that was submitted"; prefer fixed-version links |
| P1 dispute is cut | A freelancer can submit a non-zero evidence with a bad or missing delivery and still be released after the review deadline | Keep P1 if at all possible; otherwise disclose it and set long review times |
| One developer, about 65 hours | Late screens | Second member on C5; cut order from 7 Oct |
| Old 708-byte funds after the upgrade | Unreadable funds, stuck USDC | G4 before A2 |

## 10. Rules for every task (each prompt refers to this section)

1. **Read first:** `CLAUDE.md` (read order), this file (the task's section and sections 8–10), the specs named in the task, and the design boards in [`../02-thiet-ke/canvas-v2/`](../02-thiet-ke/canvas-v2/README.md) for any screen.
2. **Branches:** one branch per task, from an up-to-date `main`. Exception: A1 and A2 share one branch, because the merge waits for the devnet upgrade.
   - Small commits with conventional messages.
   - Push the branch.
   - Fast-forward `main` only when the phase gate in section 8 passes and `main` is a fast-forward; otherwise stop and report.
3. **Ask before acting:** no deploy, program upgrade, SOL or USDC spending, dashboard change (Dynamic, Helius, Vercel) or key handling unless the task says so.
   - Never commit keys, keypairs or `.env`.
   - Never weaken a program check to make a test pass.
4. **Copy and product rules:**
   - English UI.
   - Words from product-spec section 6; never "payment".
   - The Vietnam view shows no USDC balance and no client action (D18).
   - Disclosures and the DEVNET badge stay on money screens.
5. **Code boundaries:**
   - Screens use only the hooks of non-ui-plan section 3 / 3.1 and `components/design`.
   - No `@solana/web3.js`, `services/milestone/client` or `services/chain` imports in a screen.
   - Motion only through `constants/motion.ts` (D17).
6. **When spec and code disagree:** fix both in the same PR, or stop and ask.
7. **When a task ends:**
   - Add a row to "Milestone Lock — progress" in `docs/tong-hop-tien-do.md` (Vietnamese): task, branch, commits, test results.
   - List new open issues there.
   - Then give the PO the manual test steps for what changed.
