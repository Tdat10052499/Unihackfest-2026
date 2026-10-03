# Claude Code prompts for `build-plan.md`

Run the prompts in order. Each prompt is one session.

- Paste the text in the code block as it is.
- Where a prompt says "I attach", attach the screenshots of the boards named; the board sources are already in `docs/02-thiet-ke/canvas-v2/`.
- Every prompt relies on [`build-plan.md`](build-plan.md) section 10 (rules for every task), so the rules are not repeated in full.

| Order | Prompt | Phase | Run when |
| --- | --- | --- | --- |
| 0 | G (owner checklist) | Gates | Before A2 and C1 |
| 1 | A1 | Program code and tests | 3 Oct |
| 2 | A2 | Devnet upgrade | 4 Oct, after G4 |
| 3 | B1 | Content layer | After A2 |
| 4 | B2 | Light theme and motion | Can run in parallel with B1 |
| 5 | B3 | Navigation, onboarding, settings | After B2 |
| 6 | B4a | Contracts: list, detail, accept, lock | After B1, B3 |
| 7 | B4b | Contracts: new, submit, review, close, invite link | After B4a |
| 8 | B5 | Records and notifications (cuttable) | If ahead of schedule |
| 9 | C1–C4 | **Replaced by [`workspace-plan.md`](workspace-plan.md) W0–W5 (D20)**; the C1–C4 prompts below are kept for reference only | — |
| 10 | C2 | Workspace shell and wallet panel | After C1 |
| 11 | C3 | Brief editor | After C2 |
| 12 | C4 | Submit and review on the web | After C3 |
| 13 | C5 | Landing page (second team member) | From 4 Oct, in parallel |
| 14 | D1 | Two-device end-to-end run | 8 Oct |
| 15 | D2 | Demo operations and deploys | 9 Oct |

---

## 0 · G: owner checklist (not for Claude Code)

1. **G1 – same wallet on another device.**
   - Open the current GitHub Pages build in Chrome on a laptop.
   - Sign in with the Google account used on the iPhone.
   - Compare the address in Settings with the iPhone. It must be identical.
   - Sign a small devnet action (for example open `/dev/milestone` with `EXPO_PUBLIC_DEV_TOOLS`, or a 0.01 USDC Send).
2. **G2 – Dynamic.** In the dashboard, add the Vercel production domain of the Workspace to the allowed origins. Do not use a wildcard.
3. **G3 – Helius.** Rotate the key (open issue 1). Restrict it to the GitHub Pages and Vercel domains.
4. **G4 – old funds.** Runs inside prompt A2: it prints the 708-byte funds and asks you before closing them.
5. **G5 – LICENSE.** Decide: add an MIT file, or remove the MIT line from the README.

---

## 1 · A1: program v1.1 code and tests

```text
Task: build-plan.md phase A1 — program v1.1 (brief_hash, non-zero evidence, post_note) with tests. No deploy.
Branch: feat/a1-program-v1-1 (from up-to-date main).
Read first: CLAUDE.md; docs/09-milestone-lock/build-plan.md sections 3 and 10; program-spec.md v1.1 (sections 2, 3.1, 4, 4.1, 5, 6, 8, 9 — the v1.1 changes); README.md decisions D14–D15; ned_program/programs/ned-program/src/** and tests/**.
Do:
1. state/shared_fund.rs: add `brief_hash: [u8; 32]` after `payout_reference`, keep `_reserved: [u8; 32]`; SPACE assert 740; update the header comment (v1.1 grew the account once; from now on only `_reserved`). constants.rs: ACCOUNT_VERSION = 2, NOTE_MAX_LEN = 900, NOTE_MAX_PARTS = 8.
2. create_fund: new last argument `brief_hash: [u8; 32]`; all-zero → InvalidBriefHash; store it; FundCreated gains brief_hash.
3. accept: new last argument `expected_brief_hash: [u8; 32]`; must equal fund.brief_hash → else BriefMismatch (check before any state change).
4. submit: all-zero evidence → InvalidEvidence.
5. New instruction post_note(kind: u8, milestone: u8, part: u8, parts: u8, data: Vec<u8>) in instructions/milestone/post_note.rs exactly as program-spec row 13 and 4.1 (fund read-only, author Signer; kind 0 = brief by client while Created and milestone == 0; kind 1 = delivery by freelancer for a Submitted milestone < milestone_count; otherwise NoteNotAllowed; size/part rules → InvalidNote). No state change; emit NotePosted { fund, author, kind, milestone, part, parts, len }.
6. errors.rs: append after MathOverflow, in this order: InvalidBriefHash, BriefMismatch, InvalidEvidence, InvalidNote, NoteNotAllowed, each with an English #[msg]. Never reorder existing variants.
7. Tests: update every existing call site and helper for the new arguments; layout test (740; offsets 12, 44, 676); add program-spec section 8 tests 16, 17, 18 (including "delivery note in the same transaction right after submit" and "fund bytes unchanged after post_note"). Log compute units for post_note.
Rules: build-plan section 10. Do not touch identity instructions or their error codes. Do not deploy, do not run `anchor idl upgrade`.
Acceptance: `anchor build && cargo test` — all milestone tests (old + new) and the 10 identity tests pass, 0 warnings; program_autofixer (if available) 0 issues. Report the new .so size versus the deployed 475,280 bytes and whether `solana program extend` will be needed.
Finish: commit, push the branch; do not merge yet (A2 merges after deploy). Update docs/tong-hop-tien-do.md.
```

## 2 · A2: devnet upgrade and app layout

```text
Task: build-plan.md phase A2 — upgrade ned_program on devnet to v1.1 and align the app's layout constants and IDL.
Branch: continue feat/a1-program-v1-1.
Read first: build-plan.md sections 2 (G4), 3, 10; program-spec.md section 9; docs/tong-hop-tien-do.md "Thông tin devnet".
Do, stopping for my OK where marked:
1. List program accounts of ned_program with dataSize 708 on devnet (v1 funds): address, state, vault balance, client. Print the table. STOP and ask me what to close/settle; then do only what I approve, using existing scripts (close, refund, recycle) with my keypairs passed as arguments, never stored in the repo.
2. anchor build. If the .so is larger than the allocated program data, show the `solana program extend` command and the SOL cost; STOP for my OK.
3. Upgrade the program (same program ID, deploy wallet from Anchor.toml); then `anchor idl upgrade`. STOP for my OK before each of these two commands.
4. Copy the generated IDL to ned-wallet/idl/ (json + ts). Update ned-wallet/services/milestone/layout.ts (FUND_SIZE 740, OFFSET_BRIEF_HASH 676, NOTE_MAX_LEN, NOTE_MAX_PARTS) and decode.ts (brief_hash). Make the minimum change in services/milestone/client.ts so existing callers still compile: buildCreateFund takes a briefHash (temporary: SHA-256 of the title until B1), buildAccept takes expectedBriefHash (TEMPORARY, smoke script and harness only: read from the fund; B1 replaces it with the hash of the decrypted brief shown to the freelancer, never the fund's value), buildSubmit refuses an all-zero evidence. Update scripts/milestone-devnet.ts accordingly.
5. Run `npm run milestone:devnet` twice (VND path) and once with --refund.
Acceptance: cargo test green; npm test, npx tsc --noEmit, npx expo export --platform web green; smoke runs PASS. Record in docs/tong-hop-tien-do.md: deploy and IDL signatures, program size, extend (if any), smoke results.
Finish: commit, push, fast-forward main (stop if not a fast-forward).
```

## 3 · B1: content layer (brief, delivery, encrypted notes)

```text
Task: build-plan.md phase B1 — brief and delivery content (write content.ts, keys.ts, notes.ts and the action changes in packages/ned-core after W0; ned-wallet keeps shims): canonical JSON, hashes, XChaCha20-Poly1305 notes via post_note, per-contract key in the invite link, useContractContent hook.
Branch: feat/b1-content-layer.
Read first: build-plan.md sections 4 (B1) and 10; product-spec.md section 5.1; program-spec.md row 13 and section 4.1 (post_note); non-ui-plan.md sections 3 and 3.1 (the amended interface); services/milestone/*, hooks/useMilestoneActions.ts, services/chain/send.ts.
Do:
1. Add @noble/ciphers (same author family as @noble/hashes, already used). No other new dependency without asking.
2. services/milestone/content.ts: Brief, Delivery types (non-ui-plan 3.1), canonical serialisers with fixed key order and trimmed strings, limits (scope ≤ 1,500 chars, ≤ 5 references, ≤ 6 criteria per milestone, ≤ 5 links, ≤ 10 files, note ≤ 500), briefHash(), deliveryEvidence() (SHA-256 bytes).
3. services/milestone/keys.ts: generate a 32-byte key (crypto.getRandomValues), store per wallet in AsyncStorage `@ned_contract_keys_v1:<wallet>` (map fund → base64url key), inviteLink(fund, key) always on WORKSPACE_ORIGIN (falls back to MOBILE_ORIGIN while EXPO_PUBLIC_WORKSPACE_ORIGIN is unset) using constants/hosts.ts (create it: MOBILE_ORIGIN default https://tdat10052499.github.io/Unihackfest-2026, WORKSPACE_ORIGIN from EXPO_PUBLIC_WORKSPACE_ORIGIN), importKeyFromFragment(fragmentOrPastedLink).
4. services/milestone/notes.ts: encryptNote/decryptNote (byte 0 version=1, 4-byte random set ID, 24-byte nonce, ciphertext; AEAD associated data = fund pubkey ‖ kind ‖ milestone ‖ setId ‖ part ‖ parts), splitParts(≤ 900 bytes), buildPostNote(...) via the IDL coder, fetchNotes(fund): getSignaturesForAddress(fund) + getTransaction; skip transactions with meta.err; accept only ned_program post_note instructions whose author is the client (brief) or the freelancer (delivery); group by kind/milestone/setId; join parts; a set is shown as valid only if its plaintext hash equals the on-chain brief_hash / evidence — never pick "the newest".
5. client.ts: buildCreateFund(briefHash) plus brief note transactions; buildAccept(expectedBriefHash); buildSubmit(evidence) + delivery note in the same transaction if the serialized tx ≤ 1,232 bytes, else a second transaction. Keep evidenceHash(link) only for v1 funds' display.
6. hooks/useContractContent.ts and the useMilestoneActions changes exactly as non-ui-plan 3.1 (create returns inviteLink; accept passes SHA-256 of the decrypted brief that the screen showed — never fund.brief_hash — and refuses unless contentStatus === 'ok'; submit takes DeliveryDraft). Update the /dev/milestone harness to use them.
7. Unit tests (node --test): canonical order stability, hash vectors, encrypt/decrypt round trip, tamper → throws, wrong key → throws, part split/join at 899/900/901 bytes, invite link encode/import, tx size decision, a failed-transaction note and a stranger's note are ignored, a second note set with a different hash shows as "does not match".
Rules: build-plan section 10; never log or send the key anywhere except the invite link; the key never goes to analytics, notifications or errors.
Acceptance: npm test, npx tsc --noEmit, npx expo export --platform web; then one devnet run via the harness: create with a brief → accept with matching hash → lock → submit with a 2-link delivery → client sees "matches". Report tx sizes and the number of signatures per action.
Finish: update non-ui-plan 3.1 if types changed; commit, push, fast-forward main.
```

## 4 · B2: light theme, no outlines, motion

```text
Task: build-plan.md phase B2 — move the app to the light "Modern Minimal v2" tokens, remove outlines, add the motion system.
Branch: feat/b2-theme-motion.
Read first: build-plan.md sections 4 (B2) and 10; docs/02-thiet-ke/canvas-v2/README.md, Main.dc.html, MotionSurfaces.dc.html, MilestoneComponents.dc.html; README.md D17; constants/design.ts; components/design/*.
Do:
1. constants/design.ts: light tokens from Main.dc.html (ground #F4F4F6, card #FFFFFF, ink #111116, caption #5E5E6A, accent #7B2FBE, link #6A22B0, tint #F2EAFB, divider #F0F0F3, status tints) and shadows S1 / S-accent from MotionSurfaces.dc.html (iOS shadow props + Android elevation + web boxShadow). Keep old token names as aliases only where needed to avoid breaking screens in this PR; mark them deprecated.
2. constants/motion.ts: durations and curves from the MotionSurfaces token table (press 160, hover 200, enter 200 + 360 with 40 ms stagger max 5, state change 320, popover 200, sheet 360, focus 180; cubicBezier(0.2,0,0,1) and Easing.bezier(0.16,1,0.3,1)); a useReducedMotion guard.
3. components/design: Card/ListRow without borders (shadow or tonal fill as in the boards), list dividers only between rows (#F0F0F3); Button and Pressable rows scale to 0.98 with a Reanimated 4 CSS transition; Screen content enters with FadeInDown + stagger; new Sheet (SlideInDown + backdrop fade) and Field (filled, focus halo, error tint, no border) primitives; Popover for later C2.
4. Only opacity and transform animate; amounts never animate; Reduce Motion → no animation.
Rules: build-plan section 10; no screen redesign in this PR beyond what the primitives change.
Acceptance: npm test, npx tsc --noEmit, npx expo export --platform web; report the web bundle size before/after; screenshots (Chromium 390×844) of Home, Settings and /dev/milestone with no clipped text; a grep showing no `borderWidth`/`border:` left in components/design except radio/switch controls.
Finish: commit, push, fast-forward main.
```

## 5 · B3: navigation, onboarding, settings, Home

```text
Task: build-plan.md phase B3 (refactor-plan PR4 adapt list) — WalletNav, onboarding order, Settings, Avatar, Home (both views), remove Swap/xStocks entry points and the N11 bridge.
Branch: feat/b3-nav-onboarding.
Read first: build-plan.md sections 4 (B3) and 10; refactor-plan.md PR4; product-spec sections 4, 6, 9; docs/tong-hop-tien-do.md open issues 5 and 7; boards Onb*.dc.html, HomeVN/HomeIntl.dc.html, Settings*.dc.html, Disclosures.dc.html, Avatar*.dc.html, Receive/Send*.dc.html. I attach screenshots of HomeVN, HomeIntl, OnbProfile, OnbResidence, Settings.
Do:
1. WalletNav: Home · Contracts · Records · Settings; remove the SWAP/XSTOCKS tiles and tab (routes stay behind FEATURES flags).
2. Onboarding: welcome → setup → (fund) → consent → profile (with generated avatar) → residence → home; set CONSENT_SCREEN_READY = true and delete the TODO(N11 bridge) path.
3. Avatar: port the algorithm of Avatar.dc.html exactly (FNV-1a + murmur3 finaliser, 8 palettes × 6 patterns × 4 rotations) as pure code in packages/ned-core/avatar.ts (shared with ned-workspace; if W1 already added it, reuse it) with a node --test unit test; components/Avatar renders it with react-native-svg; seed = wallet address.
4. Home: greeting by time of day + name; Vietnam view (flag, "Locked for you ≈ VND", received this month, Share @user / Records tiles, needs-your-action, contracts); international view (flag, USDC balance, New contract / Receive / Send tiles). Data from useFunds and existing balance hooks; Home must not show USDC in the Vietnam view.
5. Settings and Disclosures as the boards (I live in Vietnam, display currency, consent view/withdraw, DEVNET badge); add the D15 disclosure line about invite links.
6. Copy fixes listed in refactor-plan PR4.
Rules: build-plan section 10.
Acceptance: npm test, tsc, web export; the N11 web checklist (sign-in, returning user, new user to Home, Send, /swap and /xstocks redirect to Home) passes in Chromium; screenshots of both Home views.
Finish: commit, push, fast-forward main; close open issues 5 and 7 in tong-hop-tien-do.md.
```

## 6 · B4a: contracts list, detail, accept, lock

```text
Task: build-plan.md phase B4 part 1 — app/contracts/index.tsx and app/contracts/[fund].tsx with the Brief card, the accept sheet (brief check + destination) and the lock sheet.
Branch: feat/b4a-contracts-detail.
Read first: build-plan.md sections 1, 4 (B4) and 10; product-spec sections 3, 4, 5, 5.1, 6; non-ui-plan 3 and 3.1; boards ContractsList, ContractDetail (all tweaks) and its wrappers, ContractAccept, ContractLock, ContractLocked(VN), MilestoneComponents. I attach screenshots of ContractDetail in the states created, accepted, locked, review passed.
Do:
1. contracts/index.tsx: As freelancer / As client, filters, status chips, empty states, avatars.
2. contracts/[fund].tsx: role-aware detail exactly as ContractDetail.dc.html, plus a "Copy contract link" row for both parties (moves the key to another device; warn that anyone with the link can read the brief): "Next ·" banner, hero with vault proof + Explorer, destination row, Brief card (scope, references, per-milestone "Done when", fingerprint status from useContractContent: ok / mismatch / noKey with "Open the contract link on this device"), milestone timeline with chain-time countdowns, context action button. Labels for open issue 3: client "Review time is over · anyone can release", freelancer "Ready to release".
3. Accept sheet: shows the brief first; "Brief matches ✓" required; USDC option hidden in the Vietnam view (note "You live in Vietnam, so earnings arrive in VND only"); slide to accept.
4. Lock sheet: balance check, faucet link, itemised fees, slide to lock; Locked result screen (client) and mirror (Vinh).
5. Release now / Refund now for anyone, Close (sheets from the boards).
6. Motion: Screen enter, sheet, state change from constants/motion.ts.
Rules: build-plan section 10; screens use hooks only; P1 sheets only when FEATURES.dispute.
Acceptance: npm test, tsc, web export; with two browsers (Mia desktop Chrome, Vinh iPhone Safari): create via /dev/milestone → Vinh opens the detail, reads the brief, accepts VND → Mia locks; screenshots of each state at 390×844.
Finish: commit, push, fast-forward main.
```

## 7 · B4b: new contract, submit, review, invite link

```text
Task: build-plan.md phase B4 part 2 — app/contracts/new.tsx (3 steps with brief), submit sheet (links + note), review sheet (delivery + match), app/c/[fund].tsx invite route, share sheet with link + QR.
Branch: feat/b4b-contracts-flow.
Read first: build-plan.md sections 4 (B4), 5 (C1 router rule) and 10; product-spec 3, 5.1; non-ui-plan 3.1; boards ContractNew1Freelancer, ContractNew2Milestones, ContractNew3Review, ContractCreated, MilestoneSubmit(ted), MilestoneReview, MilestoneReleased(VN/B). I attach screenshots of the 3 New-contract steps and the review sheet.
Do:
1. new.tsx: step 1 freelancer (resolveRecipient fresh), step 2 job + milestones + brief (scope, references, "Done when" per milestone, limits from content.ts), step 3 review with itemised fees and brief fingerprint; slide to create; ContractCreated with invite link (copy) and QR (react-native-qrcode-svg). Hidden in the Vietnam view (D18).
2. Submit sheet: links (fixed-version hint), note, self-check of criteria (local only), delivery fingerprint, deadline from chain time; slide to submit; result screen.
3. Review sheet: delivery (links, note, file fingerprints if any), "On time" from submitted_at, "Same delivery that was submitted ✓" / "Does not match what was submitted" (it proves the note equals the on-chain evidence, not that linked content is unchanged), countdown, slide to release; Dispute only with FEATURES.dispute.
4. app/c/[fund].tsx: first decide the destination (C1 will add: on the Workspace host, narrow → redirect to MOBILE_ORIGIN keeping #k=, wide → /workspace/c/[fund]; leave one function routeInvite() with a TODO), and only on the final host import the key, clear the fragment (history.replaceState on web) and route to contracts/[fund].
Rules: build-plan section 10; the key never appears in logs, notifications or error messages.
Acceptance: npm test, tsc, web export; full two-browser cycle on devnet: Mia creates with a brief on the phone → sends the invite link → Vinh opens it, accepts VND → Mia locks → Vinh submits 2 links + note → Mia sees "matches" and releases → close. Also: open the detail on a device without the key → noKey message, money actions still work.
Finish: commit, push, fast-forward main.
```

## 8 · B5: records and notifications (cuttable)

```text
Task: build-plan.md phase B5 = refactor-plan PR6 — app/records.tsx and contract notifications.
Branch: feat/b5-records.
Read first: refactor-plan.md PR6; build-plan section 10; boards Records.dc.html, RecordsIntl.dc.html.
Do: records grouped by month (≈ VND in the Vietnam view, USDC otherwise), CSV export, disclaimer; local cache @ned_records_v1:<wallet>; notifications for new contract, locked, submitted, released via useNotificationStore + triggerBanner (no key or brief text in notifications).
Acceptance: npm test, tsc, web export; records show the release from the B4b cycle.
Finish: commit, push, fast-forward main.
```

## 9 · C1: hosting, base URL, invite-link router, headers

> **Do not run (3 Oct 2026):** replaced by D20 / workspace-plan W1–W2. C1 was closed on the mobile side only; see build-plan C1.

```text
Task: build-plan.md phase C1 — build the same Expo app for GitHub Pages (base /Unihackfest-2026) and Vercel (root), add the invite-link router and security headers.
Branch: feat/c1-hosting.
Read first: build-plan.md sections 5 (C1), 8, 10; README.md D16; ned-wallet/app.json, package.json scripts (predeploy/deploy), app/+html.tsx, services/chain/connection.ts.
Do:
1. app.config.ts that reads app.json and sets experiments.baseUrl from EXPO_BASE_URL (default "/Unihackfest-2026"). Verify that an empty value builds and serves correctly at the root; if Expo rejects "", find the supported way and document it.
2. ned-wallet/vercel.json: buildCommand "EXPO_BASE_URL= npx expo export -p web" (or the env set in the Vercel project), outputDirectory "dist", framework null, cleanUrls, SPA rewrite to "/", headers: Content-Security-Policy (default-src 'self'; connect-src self, the Dynamic API hosts, Helius and Solana devnet RPC (https + wss); script-src as Expo web needs; style/font from Google Fonts; img self data blob; frame-ancestors 'none'), X-Frame-Options DENY, Referrer-Policy no-referrer, Permissions-Policy camera=(self) only if the QR scanner needs it. List the hosts you allowed and why.
3. constants/hosts.ts (from B1): MOBILE_ORIGIN, WORKSPACE_ORIGIN, isWorkspaceHost(). app/c/[fund].tsx: on the Workspace host and width < 900 → redirect to MOBILE_ORIGIN/c/<fund> keeping #k=; width ≥ 900 → /workspace/c/<fund>.
4. Keep `npm run deploy` (GitHub Pages) unchanged in behaviour. Add `npm run build:vercel` for a local check.
Rules: build-plan section 10; do not create the Vercel project or change dashboards — give me the exact Vercel settings (Root Directory ned-wallet, env vars by name) and the Dynamic/Helius domains to add.
Acceptance: both builds export; serve each locally (npx serve dist and a /Unihackfest-2026 subpath) and show that deep links /contracts/<fund> and /c/<fund>#k=… load; `curl -I` output of the Vercel preview with the headers (after I connect the project); login works on the Vercel preview.
Finish: commit, push, fast-forward main.
```

## 10 · C2: Workspace shell and wallet panel

```text
Task: build-plan.md phase C2 — /workspace layout, WalletPanel (signed out, home, confirm), sign-in screen, Overview.
Branch: feat/c2-workspace-shell.
Read first: build-plan.md sections 5 (C2), 9 (risks: double confirmation), 10; boards WebSignIn, WebWorkspace, WebWalletPanel, MotionSurfaces. I attach screenshots of these three web boards (panel open and closed).
Do:
1. app/workspace/_layout.tsx: top bar (logo, DEVNET badge, wallet button with avatar + @handle + region line), max width 1280, below 900 px a "Use the N.E.D app on your phone" screen with a QR to MOBILE_ORIGIN.
2. components/workspace/WalletPanel.tsx: the board's three states; popover motion from constants/motion.ts; Escape and outside click close; focus trapped while open; region rules (Vietnam view: VND only, no New contract). Expose a confirm(request) API that returns a promise; every signing action in the Workspace calls confirm() first, then useMilestoneActions. If Dynamic shows its own confirmation for the embedded wallet on web, report it and make our panel a summary only (no second Confirm).
3. Signed-out visitors see WebSignIn (Continue with Google → Dynamic login).
4. app/workspace/index.tsx: Overview (stats, needs your action, contracts table) from useFunds; rows link to /workspace/c/<fund>. A contract without the key on this browser shows "Paste the contract link" (useContractContent.importKey accepts a pasted link).
Rules: build-plan section 10; desktop only needs keyboard support (Tab order, focus-visible ring).
Acceptance: tsc, tests, web export; on the Vercel preview: sign in with Mia, panel shows the same address as her phone (G1), Overview lists her contracts; screenshots at 1440 and 1024 widths.
Finish: commit, push, fast-forward main.
```

## 11 · C3: brief editor

```text
Task: build-plan.md phase C3 — app/workspace/new.tsx following WebContractNew.dc.html.
Branch: feat/c3-brief-editor.
Read first: build-plan.md sections 5 (C3), 10; product-spec 3, 5.1; non-ui-plan 3.1; board WebContractNew.dc.html (both tweaks: who = mia, who = vinh; created = true). I attach screenshots.
Do: freelancer chip (resolveRecipient fresh), title with 32-byte counter, scope, references (add/remove), milestone cards (amount, submit-by datetime, review time incl. "1 min (devnet demo)", "Done when" list), live brief fingerprint (content.ts), summary aside with the rule list, Create → WalletPanel.confirm → actions.create → created state with invite link (copy), QR for the phone, brief fingerprint. Vietnam view shows the block message (D18). Validation messages identical to the mobile ones (rules.ts + content.ts limits).
Acceptance: tsc, tests, web export; create a 2-milestone contract with criteria on devnet from the Vercel preview; open the invite link on the iPhone → mobile detail shows the brief with "matches".
Finish: commit, push, fast-forward main.
```

## 12 · C4: submit and review on the web

```text
Task: build-plan.md phase C4 — app/workspace/c/[fund]/submit.tsx and review.tsx following WebSubmit.dc.html and WebReview.dc.html.
Branch: feat/c4-submit-review.
Read first: build-plan.md sections 5 (C4), 10; non-ui-plan 3.1; boards WebSubmit and WebReview (tweaks: done, delivery = changed). I attach screenshots.
Do:
0. app/workspace/c/[fund]/index.tsx: redirect to submit (freelancer, a Pending milestone) or review (client, a Submitted milestone), else a read-only summary; without the key show "Paste the contract link".
1. Submit: links with the "Fixed version" hint (Figma version-id, Git commit or tree/<sha>, blob/<sha>), file drop + picker hashed in the browser with crypto.subtle.digest('SHA-256') (refuse > 200 MB, show progress for > 20 MB, nothing uploaded), note, self-check of the brief criteria (local), live delivery fingerprint, deadline + "How on-time is decided", Submit → WalletPanel.confirm → actions.submit(index, delivery) → done state. Vietnam view: amounts in ≈ VND only.
2. Review: delivery (links open in a new tab with rel=noopener, files with fingerprints, note), "On time" from submitted_at vs submit_by, integrity block (matches / changed), "Drop a file to compare" (hash locally, compare to the listed fingerprint), criteria ticks (local), timeline, countdown, Release → confirm → approve; Dispute only with FEATURES.dispute.
Acceptance: tsc, tests, web export; on devnet: Vinh opens the invite link on his laptop, then submits there with 2 links + 1 file → Mia reviews on her laptop: "matches", file drop shows "Same file ✓" for the same file and "Different file" for another; release; the iPhone (Vinh) shows Released (VN view).
Finish: commit, push, fast-forward main.
```

## 13 · C5: landing page (second team member)

```text
Task: build-plan.md phase C5 — static landing page in site/ for Vercel project 1.
Branch: feat/c5-landing.
Read first: build-plan.md sections 5 (C5), 10; product-spec sections 1, 6, 7, 9 (words, demo, disclosures); README.md D16–D17; boards WebSignIn.dc.html (hero tone) and MotionSurfaces.dc.html (motion and surfaces).
Do: site/index.html (+ css, or Vite + React with Motion for React `motion/react` if you choose React; nothing else), sections: hero with the product line, "Try the mobile demo" (QR image generated at build time pointing to https://<landing-domain>/m, plus a plain link), "Open Workspace" button (WORKSPACE URL from an env or a constant), how it works in 3 steps, the 2-minute judge path, disclosures (devnet test money, payout partner simulated, N.E.D holds no funds and charges no fee in the pilot). site/vercel.json: redirect /m → the GitHub Pages URL (302), security headers. Light theme, no outlines, motion only opacity/transform ≤ 400 ms, prefers-reduced-motion respected, Lighthouse performance and accessibility ≥ 90 on mobile.
Rules: build-plan section 10; English only; never "payment"; no login, no wallet code, no analytics without asking.
Acceptance: open locally and on the Vercel preview; QR scanned with an iPhone opens the mobile demo; report Lighthouse scores.
Finish: commit, push, fast-forward main.
```

## 14 · D1: two-device end-to-end run

```text
Task: build-plan.md phase D1 — run the full demo on the deployed builds and fix only what fails.
Branch: fix/d1-e2e (only if something must change).
Read first: build-plan.md sections 7, 8, 10; product-spec section 7; docs/tong-hop-tien-do.md open issues.
Do: write the step list for me first (who, which device, which URL, expected screen and on-chain result), then guide me step by step: 1) Mia creates on her laptop (Vercel) with a brief; 2) Vinh opens the invite link on the iPhone (GitHub Pages) and accepts VND; 3) Mia locks on her phone; 4) Vinh opens the same invite link on his laptop (gives the laptop the key), then submits there (Vercel) with links + a file; 5) Mia reviews on her laptop and releases; 6) close; 7) repeat with a 1-minute review and release after review (anyone). After each step, check the chain state with a read-only script and report. Collect every defect with a screenshot; fix them in small commits; re-run the failed steps.
Acceptance: two consecutive clean runs; results and URLs recorded in docs/tong-hop-tien-do.md.
```

## 15 · D2: demo operations and deploys

```text
Task: build-plan.md phase D2 — demo operations, README, deploys, records.
Branch: chore/d2-demo-ops.
Read first: build-plan.md sections 6, 7, 10; refactor-plan PR7; docs/tong-hop-tien-do.md (devnet facts, open issues).
Do: recycle demo USDC (scripts/recycle-demo-usdc.ts, keypair path as an argument); prepare contract B with a 1-minute review so "Release now" is ready on stage; README "what runs" for mobile (GitHub Pages), Workspace (Vercel), landing (Vercel), program v1.1 facts; deploy GitHub Pages (`npm run deploy`) and confirm both Vercel production deploys; record URLs, program signature, size, IDL account and the compute-unit table in docs/tong-hop-tien-do.md; write the 2-minute backup video shot list. Ask me before any spending or deploy step.
Acceptance: the demo script runs from the landing page QR and the Workspace link with no manual fixes.
Finish: commit, push, fast-forward main.
```
