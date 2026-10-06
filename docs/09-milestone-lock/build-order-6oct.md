# Build order for 6 Oct: every change, step by step

**Owner:** PO (Hồ Du Tuấn Đạt) · **Written:** 6 Oct 2026 · **Builds on:** `main` at `2fb0318`
**Scope:** everything agreed for the freeze, done on 6 Oct, in the order below. No clock times; each step has a **gate**, and the next step waits for it.

| Source | What |
| --- | --- |
| [`funded-jobs-plan.md`](funded-jobs-plan.md) (D25) | Job board with search and filter, program v1.3 (its section 8 schedule is replaced by this file) |
| [`delivery-review-updates.md`](delivery-review-updates.md) (D26) | U1 delivery view, U2 optional files, U3 notifications, U4 review-over release for both, U5 guide, U6 preview check |
| [`review-decision-plan.md`](review-decision-plan.md) (D27) | Accept or Request changes, revisions, split, return, handover |
| [`../05-legal/compliance-fix-list.md`](../05-legal/compliance-fix-list.md) and [`../05-legal/compliance-fix-list-review.md`](../05-legal/compliance-fix-list-review.md) | P0: S1–S3, C1–C5, V1–V2, P1–P4, R1–R2, D1–D4; A1–A12 |

The J, U and K prompts in those files remain the **specs**. The prompts **below** are the ones to paste: they are grouped by file, so two people never edit the same file at once.

## 0. Ground rules

1. **One program upgrade.** Funded Jobs (J1) and the D27 note rules (K1) ship together. There is no second upgrade on 6 Oct.
2. **Ownership.**
   - `packages/ned-core` has one owner (Dev A).
   - In the Workspace, each page has one owner at a time.
   - The mobile app is split into four areas (step 4), and each area has one owner.
3. **Branches.**
   - Program and core: `feat/v13-program` → `feat/core-6oct`.
   - Apps: one branch per step 3x / 4x, each from the latest core branch.
   - Merge order is in step 7.
4. **Feature flags.** `FEATURES.jobs` (Workspace) and `FEATURES.dispute` (mobile and Workspace) let a broken feature ship switched off. Nothing else depends on them.
5. **Copy.**
   - English only. Words from product-spec section 6.
   - Never "payment", "escrow" (in the UI), "safe" or "guaranteed".
   - The Vietnam view shows no USDC or SOL amounts.
   - Every new user-facing text goes past CL (PR template).
6. Every step ends with a row in `docs/tong-hop-tien-do.md` (Vietnamese): branch, commits, tests.

## Step 0 · Owner tasks (PO, before anything is deployed)

| # | Task | Done when |
| --- | --- | --- |
| 0.1 | Revoke the Jupiter key at portal.jup.ag; leave `EXPO_PUBLIC_JUPITER_API_KEY` empty in the public build (S1) | Old key rejected |
| 0.2 | Helius: a devnet-only key restricted to `tdat10052499.github.io`, `unihackfest-2026.vercel.app` and `localhost`; no mainnet URL in public builds (S2) | A request from another origin is refused |
| 0.3 | Kill the old keys: Helius `a62b…`, the Supabase project and the Privy app (S3) | CL ticks register row 12 |
| 0.4 | LICENSE: MIT if every member agrees, otherwise remove the claim from the README (R2) | File committed or claim removed |
| 0.5 | GitHub: turn on "Require review from Code Owners" with one approval for `main` (review A9) | Setting on |
| 0.6 | Faucet: 20 devnet USDC to Mia's address, and to a second business address for the job demo | Balances visible |
| 0.7 | Decision log: confirm D1–D5 (D3); record the survey result (D4); confirm D25, D26, D27 | Rows say "Confirmed 6 Oct" |
| 0.8 | Approve the program upgrade when step 1 asks | Upgrade done |

## Step 1 · Program v1.3, one upgrade (Dev A)

**What**
- Funded Jobs: `JobListing` (576 bytes) and `JobApplication` (364 bytes), plus `post_job`, `post_job_brief`, `apply_job`, `select_job`, `lock_from_job` and `withdraw_job`, as in `funded-jobs-plan.md` section 4.
- D27 note rules: delivery notes on Disputed and Released milestones; review note kind 3 for the client on Submitted and Disputed milestones (`review-decision-plan.md` section 2).

**Gate 1**
- Every test passes, old and new.
- `program-spec.md` has a "v1.3" section.
- The PO approved the upgrade, and it is live on devnet.
- The IDL has been copied to `packages/ned-core/src/idl/`.

**If gate 1 fails:**
- Do not upgrade.
- Set `FEATURES.jobs = false`.
- For D27, keep `FEATURES.dispute = false` and use the "disputes off" text of C2.
- Continue with steps 2–7 without the job and D27 parts.

```
Prompt P1 · Program v1.3
Read CLAUDE.md, docs/09-milestone-lock/build-order-6oct.md (sections 0–1), funded-jobs-plan.md section 4,
review-decision-plan.md section 2, build-plan.md section 10, and ned_program/programs/ned-program/src (lib.rs, constants.rs,
errors.rs, events.rs, state/, instructions/milestone/{create_fund,accept,lock,post_note,common,close}.rs) and tests/milestone.rs.
Task:
1. Funded Jobs exactly as funded-jobs-plan.md section 4 (accounts 576 and 364 bytes with asserts and an offsets test; six new
   instructions in new files; errors and events appended; tests/jobs.rs with every case of section 4.5).
2. post_note: NOTE_KIND_DELIVERY allowed for the freelancer when the milestone is Submitted, Disputed or Released;
   new NOTE_KIND_REVIEW = 3 for the client when Submitted or Disputed; tests of review-decision-plan.md section 2.
3. Do not change any other existing instruction, account or error number. Never weaken a check to pass a test.
4. program-spec.md: add "v1.3" (jobs accounts, offsets, instructions, errors; note kinds table).
5. Copy the IDL (json and ts) to packages/ned-core/src/idl/.
Branch feat/v13-program. Do not deploy: print the build size, whether `solana program extend` is needed, and the exact upgrade
commands for the PO. Done when: cargo test passes; progress row added.
```

## Step 2 · `@ned/core` (Dev A, branch `feat/core-6oct`)

**What**
- **Jobs (J2, J5 core):**
  - the `jobs/` module (layout, pda, decode, queries, brief, actions, rules, taxonomy, search);
  - `runCreate` gains `extraInstructions`;
  - `runSelectJob`, including the close of the previous contract on a re-select;
  - `runAccept` appends `lock_from_job` for a job contract; `runLockFromJob`;
  - Records counts `lock_from_job` as a lock.
- **D27 (K2):** `ReviewDraft`, the optional `stage` on `DeliveryDraft` (left out of the canonical JSON when absent), note kind 3, `readContractContent` with versions and reviews, `runRequestChanges`, `runSendRevision`, `runHandover`, and the view labels.
- **U4:** Release now and Refund now for both roles; "Release opens in {t} if not reviewed" replaces "auto-release".
- **C4:** the two core strings (`view.ts:86`, `actions.ts:332`).
- **U3, first part:** notices move to `milestone/notices.ts`, with every event of the U3 table (including the job events), numbers in and one formatter.
- **F2 (if quick):** a `note` column in the Records CSV.

**Gate 2**
- Core tests pass.
- `typecheck` passes for `ned-wallet` and `ned-workspace` against the new core.
- The exports are listed in the PR, so steps 3 and 4 can start.

```
Prompt P2 · @ned/core for 6 Oct
Read CLAUDE.md, build-order-6oct.md (sections 0 and 2), funded-jobs-plan.md sections 5 and 6.1, review-decision-plan.md
section 3, delivery-review-updates.md sections U3 (event table) and U4, compliance-fix-list.md C4 and F2, and
packages/ned-core/src/{actions.ts,index.ts,milestone/*}.
Task: implement every item of build-order-6oct.md step 2 in packages/ned-core, with unit tests for each (decoders with fixed
bytes, search/filter pure functions and URL round trip, runAccept adds lock_from_job only for a job contract, canonical
delivery JSON unchanged when `stage` is absent, review validation, view labels for both roles in every state, notices).
Keep existing exports working; add new ones. No UI code here.
Branch feat/core-6oct (from feat/v13-program). Done when: core tests pass and both apps typecheck; PR lists the new exports;
progress row added.
```

## Step 3 · Workspace (`ned-workspace`), four parallel parts after gate 2

| Part | Owner | Files | Items |
| --- | --- | --- | --- |
| 3a Jobs | Dev B | `pages/Jobs*.tsx`, `WorkspaceNav.tsx`, `config.ts` | J3, J4, J5 UI: board with search, filters and sort; job detail and apply; post a job (one page, three sections); my listings and withdraw; applicants and select; `FEATURES.jobs` |
| 3b Contract page | Dev A | `pages/Contract.tsx`, `Overview.tsx`, `WalletPanel.tsx` | U1 delivery line per milestone; U4 Release now / Refund now for both; job contracts: hide Lock, show "Move locked budget"; D27 banners (changes requested, revised version, handover) and the split / return / accept-split buttons opening the wallet panel or the sheets |
| 3c Review page | Dev B (after 3a) | `pages/Review.tsx` | U1 side by side; U2 optional file check; D27 Accept & release / Request changes sheet, version switcher, "Final files" check; C4 strings |
| 3d Submit page | Dev A (after 3b) | `pages/Submit.tsx`, `lib/delivery.ts`, new `lib/preview.ts` | U5 guide sheet and ticks; U6 work type, preview checks, watermark tool, link checks; D27 revision and handover modes; files "(optional)" (U2) |
| 3e Shell and consent | whoever is free | `TopBar.tsx`, `App.tsx`, `index.html`, `vercel.json`, `public/fonts/`, `pages/NewContract.tsx`, `pages/SignIn.tsx` | U3 bell; P4 consent gate (opens the panel at `/consent`) and self-hosted fonts; P3 links to `/terms` and `/privacy` on sign-in; F5 hint under the title in `/new`; F4 enforce the `/wallet` CSP and drop the mainnet, Jupiter and GeckoTerminal hosts |

**Gate 3**
- Each part's tests and build pass.
- Screenshots are in each PR, for both views where relevant.

```
Prompt P3a · Workspace jobs
Read CLAUDE.md, build-order-6oct.md (sections 0 and 3), funded-jobs-plan.md sections 2, 3, 6, 6.1, 6.2 and 7,
workspace-plan.md, and ned-workspace/src/{App.tsx,config.ts,components/WorkspaceNav.tsx,pages/NewContract.tsx,lib/newContract.ts,
hooks/*}. Use only the @ned/core jobs exports from step 2.
Task: part 3a of build-order-6oct.md step 3. Filters live in the URL query; nothing is stored. The Vietnam view never sees
"Post a job" or "My listings". Same surfaces and motion as the rest of the Workspace.
Branch feat/ws-jobs. Done when: tests and build pass; a job can be posted, applied to, selected and withdrawn on devnet;
screenshots of the board (both views), job detail, post, applicants.
```

```
Prompt P3b+P3d · Workspace contract and submit (one person, in this order)
Read CLAUDE.md, build-order-6oct.md (sections 0 and 3), delivery-review-updates.md U1, U2, U4, U5, U6,
review-decision-plan.md sections 1, 4, and ned-workspace/src/{pages/Contract.tsx,pages/Overview.tsx,components/WalletPanel.tsx,
pages/Submit.tsx,lib/delivery.ts,components/FileDrop.tsx}.
Task: part 3b, then part 3d of build-order-6oct.md step 3, with the exact copy of those documents. preview.ts is pure and
unit-tested (format, size, marker read/write, addWatermark). Submit stays disabled for Design until the preview checks pass or
the override is ticked; the U5 ticks never block.
Branch feat/ws-contract-submit. Done when: tests and build pass; screenshots of each contract state for client and freelancer,
each Submit warning, the watermarked output, revision and handover modes.
```

```
Prompt P3c · Workspace review
Read CLAUDE.md, build-order-6oct.md (sections 0 and 3), delivery-review-updates.md U1 and U2, review-decision-plan.md
sections 1 and 4, compliance-fix-list.md C4, and ned-workspace/src/pages/Review.tsx.
Task: part 3c of build-order-6oct.md step 3: side-by-side review, optional file check, Accept & release and Request changes
(at least one unmet point; reason up to 500 characters; the exact info line), version switcher for revisions, "Final files"
check after release, C4 strings. No Reject or Refund button.
Branch feat/ws-review. Done when: tests and build pass; screenshots of review, the request sheet, a revised version, final files.
```

```
Prompt P3e · Workspace shell and consent
Read CLAUDE.md, build-order-6oct.md (sections 0 and 3), compliance-fix-list.md P3, P4, F4, F5, delivery-review-updates.md U3,
and ned-workspace/src/{App.tsx,components/TopBar.tsx,pages/SignIn.tsx,pages/NewContract.tsx}, index.html, vercel.json.
Task: part 3e of build-order-6oct.md step 3. The bell polls the chain every 30 s and on focus, using the step 2 notices; "seen"
is per browser only. The consent gate reads the same @ned_consent_v1 record as the mobile build (same origin).
Branch feat/ws-shell. Done when: tests and build pass; a new wallet must consent before creating a contract; the network tab
shows no request to Google; the CSP is enforced and the panel still works.
```

## Step 4 · Mobile app (`ned-wallet`), four parallel parts after gate 2

The Workspace wallet panel is this build (D23), so every fix here also fixes the panel.

| Part | Files | Items |
| --- | --- | --- |
| 4a Vietnam view and money copy | `app/_layout.tsx` or a `useRegionGuard()`, `app/{send,receive,history,scan-qr}.tsx`, `services/onboarding.ts`, `app/(onboarding)/{fund,profile}.tsx`, `app/contracts/[fund]/accept.tsx` | V1 route guard (also inside `/wallet`), and remove the "N.E.D fee 0.25%" fallback in `history.tsx`; A4: no SOL amount anywhere in the Vietnam view, with the fund step running silently ("Preparing your account…"); V2: consent before fund; C1 new accept text; C3: hide the phone field |
| 4b Consent and legal | `services/storage.ts`, `stores/useConsentStore.ts`, `app/(onboarding)/consent.tsx`, new `app/terms.tsx` and `app/privacy.tsx`, `app/disclosures.tsx`, `app/settings.tsx` | P1: keep the consent log on sign-out; P2: consent v2 (scope, rows, exact checkbox text); P3: Terms and Privacy pages from the appendices, with the marketplace line of `funded-jobs-plan.md` section 9; C2: the disputes-on disclosure of `review-decision-plan.md` section 4 (or the off text if D27 is off); Help entry for the U5 guide |
| 4c Notifications | `stores/useNotificationStore.ts`, `components/{NotificationInAppBanner,NotificationModal,GlobalNotificationManager}.tsx`, `hooks/useContractWatch.ts`, `services/milestone/notices.ts` | U3 redesign with `components/design` and `constants/motion`; English only (C5); no transfer or USDC notice in the Vietnam view; numbers in, fix "+$NaN"; every event from the core notices |
| 4d Contract screens | `app/contracts/[fund]/{index,review,submit}.tsx`, `components/contracts/*`, `constants/features.ts` | D27: Request changes on review; changes-requested actions (send revised version, propose split, return to client); accept-split sheet; handover; `FEATURES.dispute = true`. U1: the delivery line per milestone and "Checking the delivery…". U5: the guide sheet and ticks. U6: link checks and the Design note ("Use the Workspace on a computer to check a design preview") |

**Gate 4**
- Tests and the web build pass.
- `grep -o 'jup_'` on the new bundle is empty (S1).
- Screenshots of both views.

```
Prompt P4a · Mobile: Vietnam view and money copy
Read CLAUDE.md, build-order-6oct.md (sections 0 and 4), compliance-fix-list.md V1, V2, C1, C3, compliance-fix-list-review.md
A4, and the files of part 4a. Task: part 4a exactly as listed, with the exact texts of the fix list. The guard must also work
when the build runs inside the Workspace at /wallet.
Branch feat/m-vn-view. Done when: in the Vietnam view each of /send, /receive, /history, /scan-qr lands on Home (GitHub Pages
and /wallet); no SOL or USDC amount is visible in the Vietnam view; a new wallet sees consent before fund; tests pass.
```

```
Prompt P4b · Mobile: consent and legal pages
Read CLAUDE.md, build-order-6oct.md (sections 0 and 4), compliance-fix-list.md P1, P2, P3, C2 and appendices 1–2,
funded-jobs-plan.md section 9, review-decision-plan.md section 4, delivery-review-updates.md U5, and the files of part 4b.
Task: part 4b exactly as listed. CONSENT_VERSION becomes 2. Terms item 2 adds "or refund it to the client after a missed
deadline" (compliance review A12). Privacy lists Ably (through Dynamic) and Vercel / GitHub Pages logs (A12).
Branch feat/m-consent. Done when: accept → sign out → sign in keeps acceptedAt; withdraw keeps the record with withdrawnAt;
/terms and /privacy open from consent and Settings; the disclosure matches FEATURES.dispute; tests pass.
```

```
Prompt P4c · Mobile: notifications
Read CLAUDE.md, build-order-6oct.md (sections 0 and 4), delivery-review-updates.md U3, compliance-fix-list.md C5,
ned-wallet/constants/{design,motion}.ts and the files of part 4c. Task: part 4c, using the notices from @ned/core (step 2).
Branch feat/m-notifications. Done when: banner and modal use the design system with no borders; all strings English; Vietnam
view shows contract notices only (≈ VND); amounts render correctly; tests pass; screenshots of both views.
```

```
Prompt P4d · Mobile: contract screens
Read CLAUDE.md, build-order-6oct.md (sections 0 and 4), review-decision-plan.md (all), delivery-review-updates.md U1, U5, U6,
and the files of part 4d. Task: part 4d with the exact copy of those documents; Request changes needs at least one unmet
point; the split sheet says it settles every open milestone; Return to client asks for confirmation.
Branch feat/m-contract. Done when: tests pass; screenshots of review, changes requested (both sides), split, return, handover.
```

## Step 5 · Docs, copy and design (PO, CL, Design; parallel with steps 1–4)

| # | Owner | Task |
| --- | --- | --- |
| 5.1 | CL | Q&A sheet: A1 in its disputes-on version (`review-decision-plan.md` section 4), A2 (no wallet screening yet), A3 (public devnet prototype), A4 (the precise "never touches crypto" line), A10 (tax wording), new answers for "Is this a job marketplace?" and "Can a client copy the work and refuse?" |
| 5.2 | CL | Fix list: C2 uses the disputes-on text; tick each item with its commit hash as PRs merge |
| 5.3 | PO | Decision log D11: "so funds never freeze" → "a disputed milestone stays locked until both sides agree" |
| 5.4 | PO + Dev | README (R1): what runs now (program v1.3, Workspace, mobile), live links, how to run, D21 (landing repo), license line |
| 5.5 | CL | Expert-check pack: add "job board with locked budgets" (Law 74/2025, Decree 352/2025, e-commerce rules) |
| 5.6 | Design | Canvas boards: Jobs, Job detail, Post a job, Applicants, Review with Request changes, Submit with preview check, Notifications; fix "paid out in VND" and "VND payout simulated" wording (review A7) |
| 5.7 | PO | Demo script in `product-spec.md` section 7: add the job steps (`funded-jobs-plan.md` section 7) and one Request changes → revised version → accept loop |

## Step 6 · Test everything together (devnet, two logins, one in the Vietnam view)

Run each scenario on preview deploys of the merged branches. Each must pass twice.

| # | Scenario | Expected |
| --- | --- | --- |
| T1 | Post a job (2 × 5 USDC) → apply → select → accept with VND | Listing shows Budget locked; the contract is Funded at accept; the listing is Filled |
| T2 | Post a job with no applicant → withdraw | The business gets 10 USDC back |
| T3 | Search and filter | Category, skills, budget, text and sort narrow the list; the URL reproduces the view |
| T4 | Submit (Design) without a watermark | Warning; Add watermark produces a file that passes; the override tick works |
| T5 | Review → Accept & release | Released; both see it; the notification arrives |
| T6 | Review → Request changes → revised version → accept | Disputed, then Released; the versions show in order |
| T7 | Request changes → split | Both settle as agreed; every open milestone ends |
| T8 | Request changes → return to client | Refunded to the client |
| T9 | No review before the deadline | Both see Release now; either side releases; "Released after the review deadline" |
| T10 | No submission before the deadline | Both see it; Refund now works |
| T11 | Handover after release | The client's file check matches the committed fingerprint |
| T12 | Vietnam view: type `/send`, `/receive`, `/history`, `/scan-qr` (app and `/wallet`) | Lands on Home; no USDC or SOL amount anywhere |
| T13 | Consent: accept, sign out, sign in; new wallet on the Workspace | Record kept; the Workspace asks for consent first; no Google request |
| T14 | Records (both apps) | Lock, releases, refunds and the job lock appear |
| T15 | Wording sweep | `grep -rni "paid out\|VND payout\|licensed partner\|payment\|auto-release"` on app sources is empty |

**If a scenario fails:**
- Fix it if the fix is small.
- Otherwise switch off the flag of that feature (`jobs` or `dispute`), and run T12–T15 again.
- If `dispute` goes off, the C2 disclosure and the Q&A use the "off" versions.

## Step 7 · Merge and deploy

1. Merge into `main` in this order:
   - `feat/v13-program`
   - `feat/core-6oct`
   - the Workspace branches (3a, 3b+3d, 3c, 3e)
   - the mobile branches (4a, 4b, 4c, 4d)

   Rebase each branch on `main` before merging; CODEOWNERS review by CL.
2. Build `ned-wallet` for GitHub Pages, and check that the bundle has no `jup_` string. Deploy `gh-pages`.
3. Deploy the Workspace on Vercel. The `/wallet` panel takes the new mobile build.
4. On the live sites, run T1, T5, T6, T9 and T12 once.
5. CL runs the sign-off of compliance fix list section H, and ticks the items.
6. Progress log: one row per step, plus the open issues.
