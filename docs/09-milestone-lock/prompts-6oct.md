# Claude Code prompts for 6 Oct, run one after another (S0–S16)

**Owner:** PO (Hồ Du Tuấn Đạt) · **Written:** 6 Oct 2026 · **Base:** `main` at `4b64b21` plus the D27/D28 docs

**How to use**
- Open a **new** Claude Code session in the repo for each step, and paste one prompt.
- Wait until it reports "Done when" met (or a stop) before the next step.
- Between steps, read the report, run the manual checks it lists, and do any owner task it names.

**Sources:**

| Topic | Document |
| --- | --- |
| Order and gates | [`build-order-6oct.md`](build-order-6oct.md) |
| Specs | [`funded-jobs-plan.md`](funded-jobs-plan.md) (D25), [`delivery-review-updates.md`](delivery-review-updates.md) (D26), [`review-decision-plan.md`](review-decision-plan.md) (D27), D28 in [`README.md`](README.md) |
| Compliance | [`../05-legal/compliance-fix-list.md`](../05-legal/compliance-fix-list.md), [`../05-legal/compliance-fix-list-review.md`](../05-legal/compliance-fix-list-review.md) |
| Screens | [`../02-thiet-ke/canvas-v2/`](../02-thiet-ke/canvas-v2/README.md) |

> **Update 7 Oct (hub v4):** the community hub was redesigned (canvas version 113). The S5/S6 code stays; its visuals are updated by **H1–H5 in [`prompts-hub-v4.md`](prompts-hub-v4.md)**, which also adds the Legal page. Appendix H below is **superseded** by appendix V of that file and kept for reference.

## 0. Rules every prompt refers to

Each prompt starts with "Follow prompts-6oct.md section 0". Those rules:

1. **Read first.**
   - `CLAUDE.md`.
   - `build-plan.md` section 10.
   - The documents the step names.
   - For any screen, the `.dc.html` boards it names. Inline styles there are the exact values; copy is final English.
   - Rebuild screens with the app's own components. Never paste board HTML or sample data into the app.
2. **Branch.** *(Changed 7 Oct by the PO: no branches, no pull requests.)*
   - Work directly on `main`: `git switch main && git pull --ff-only origin main` before the step.
   - Make one or more small conventional commits per step; run the tests, then push to `main` after each step.
   - Never force-push `main`. `release/6oct` was merged in PR #40 and is no longer used.
3. **Never do these.**
   - Commit keys, keypairs or `.env`.
   - Weaken a program check to make a test pass.
   - Deploy, upgrade the program, spend SOL/USDC, or change a dashboard (Dynamic, Helius, Vercel), unless the step says so.
4. **Copy.**
   - English only, words from `product-spec.md` section 6.
   - Never "payment", "pay" (for USDC), "escrow" (UI), "safe", "guaranteed" or "licensed partner".
   - The Vietnam view shows no USDC or SOL amount (≈ VND only) and never posts a job.
5. **Code boundaries.**
   - Screens use hooks and `@ned/core` exports, never raw `@solana/web3.js`.
   - Motion only through the motion tokens (`constants/motion.ts` in `ned-wallet`; `src/motion.ts` in `ned-workspace`).
   - No borders on surfaces; shadow S1.
6. **Flags.**
   - New features sit behind `FEATURES.jobs` (Workspace) and `FEATURES.dispute` (mobile and Workspace).
   - A broken feature ships switched off.
7. **When spec and code disagree,** fix both in the same commit, or stop and ask.
8. **End of every step.**
   - Run typecheck, lint and tests for every package you touched, and fix failures you caused.
   - Add a row to "Milestone Lock — progress" in `docs/tong-hop-tien-do.md` (Vietnamese): step, commits, test results, open issues.
   - Finish with a short report: what changed, test results, the manual checks for the PO, anything left undone.

---

## S0 · Baseline and branch

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0.
Task: prepare the work for today.
1. git switch main && git pull. Create and push branch release/6oct.
2. Install dependencies for the monorepo. Run, and record the results of: cargo test in ned_program; tests and typecheck in
   packages/ned-core, ned-wallet, ned-workspace; the web builds of ned-wallet and ned-workspace.
3. Do not fix anything yet. Report the baseline: what passes, what already fails (with the first error of each), tool
   versions (anchor, solana, node, pnpm/npm).
4. Check that docs/09-milestone-lock/{funded-jobs-plan,delivery-review-updates,review-decision-plan,build-order-6oct,
   prompts-6oct}.md and the boards WebJobs, WebJobsFind, WebJobDetail, WebJobPost, WebJobApplicants exist in
   docs/02-thiet-ke/canvas-v2/. Report anything missing.
Done when: release/6oct exists on origin and the baseline report is written in the progress log.
```

**Owner tasks before S1** (build-order step 0):
- Revoke or rotate the keys S1–S3.
- Fund the demo addresses from the faucet.
- Confirm D25–D28.

## S1 · Program v1.3 (jobs + D27 note rules)

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0.
Read: funded-jobs-plan.md section 4 (all), review-decision-plan.md section 2, program-spec.md, and
ned_program/programs/ned-program/src (lib.rs, constants.rs, errors.rs, events.rs, state/, instructions/milestone/
{create_fund,accept,lock,post_note,common,close}.rs) and tests/milestone.rs.
Task:
1. Funded Jobs exactly as funded-jobs-plan.md section 4: state/job.rs with JobListing (576 bytes) and JobApplication (364
   bytes), compile-time size asserts and a test that checks every offset of section 4.2; new files instructions/job/
   {mod,post_job,post_job_brief,apply_job,select_job,lock_from_job,withdraw_job}.rs; constants of 4.1; errors and events
   appended at the end (never renumber); register in lib.rs under "4. FUNDED JOBS".
2. select_job must work in the same transaction after create_fund, and lock_from_job in the same transaction after accept.
   Reuse common.rs (used, check_work_window). Transfers use stored amounts, never vault.amount.
3. post_note (D27): NOTE_KIND_DELIVERY allowed for the freelancer when the milestone is Submitted, Disputed or Released;
   new NOTE_KIND_REVIEW = 3 for the client when Submitted or Disputed. No other change to existing instructions.
4. tests/jobs.rs with every case of funded-jobs-plan.md section 4.5, plus the note tests of review-decision-plan.md
   section 2. All existing tests must still pass unchanged.
5. program-spec.md: add section "v1.3" (accounts, offsets, instructions, errors, events, note kinds table).
6. Copy the new IDL (json and ts) to packages/ned-core/src/idl/.
Do NOT deploy. At the end print: binary size vs the current program account size, whether `solana program extend` is
needed (with the exact byte count), and the exact upgrade commands for the PO.
Done when: cargo test passes (old and new), program-spec updated, IDL copied, commits pushed, report written.
```

**Owner task after S1:**
- Run the printed upgrade commands on devnet.
- Check them with `solana program show <id>`.
- Tell S2 that v1.3 is live.

**If S1 fails its gate** (build-order step 1):
- Set `FEATURES.jobs = false` and `FEATURES.dispute = false`.
- Skip S3 and S6, and skip the D27 parts of S4, S7, S8 and S13.

## S2 · Devnet smoke test of v1.3

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0.
Context: program v1.3 is now upgraded on devnet (PO confirmed).
Task: add ned_program/scripts/jobs-smoke.ts (or the repo's existing script folder) that, with throwaway devnet keypairs
generated at run time and kept in a gitignored folder (never the team or demo keys), runs: post_job (1 milestone, small
amount) → post_job_brief → apply_job → create_fund + select_job → accept + lock_from_job → submit → approve; then a second
job → withdraw_job with no applicants. Fund the throwaway keys from the faucets only if the PO approves in this session;
otherwise print the addresses to fund and stop.
Print each signature with an Explorer link and the final account states.
Done when: the script runs green once on devnet (or stops with the addresses to fund), and the IDL in packages/ned-core
matches the deployed program (anchor idl fetch or a byte compare).
```

## S3 · `@ned/core`: jobs module

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0.
Read: funded-jobs-plan.md sections 4–6.1, packages/ned-core/src/{actions.ts,index.ts,milestone/{client,notes,queries,
content,decode,layout,pda,records}.ts}.
Task: add packages/ned-core/src/jobs/ with layout.ts, pda.ts, decode.ts, queries.ts, brief.ts, actions.ts, rules.ts,
taxonomy.ts and search.ts exactly as funded-jobs-plan.md section 5 and 6.1, exported from index.ts:
- queries: listOpenJobs({category?}) (memcmp discriminator + state Open at 9, category at 42), listMyJobs(business) (10),
  listApplicants(job) (9), listMyApplications(freelancer) (41), jobForFund(fund) (508).
- brief: plain-text canonicalBrief split into post_job_brief parts; fetchJobBrief reads them back (skip failed
  transactions, latest complete set wins) and returns ok / mismatch / missing against the listing's brief_hash.
- actions: runPostJob (refuses in the Vietnam view), runApplyJob (pitch ≤ 280 bytes), runWithdrawJob. runSelectJob comes in S4.
- taxonomy: 8 categories (indices 0–7) and the skills list, append-only.
- search: pure filterJobs / sortJobs and filtersToQuery / filtersFromQuery for the URL.
Unit tests: decoders on fixed bytes, every query filter with a mocked connection, brief round trip, rules, search and URL
round trip.
Done when: ned-core tests pass and ned-wallet and ned-workspace still typecheck.
```

## S4 · `@ned/core`: select and accept wiring, D27, U4, C4, notices

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0.
Read: funded-jobs-plan.md sections 3 and 5, review-decision-plan.md sections 1 and 3, delivery-review-updates.md U3 (event
table) and U4, compliance-fix-list.md C4 and F2, packages/ned-core/src/{actions.ts,milestone/{view,rules,notes,content,
records}.ts}, ned-wallet/services/milestone/notices.ts.
Task:
1. Jobs wiring: runCreate accepts extraInstructions appended after create_fund (keep the 1232-byte check; if a re-select
   must also close the previous contract and it does not fit, send close first); runSelectJob (absolute deadlines from
   the chain time; the brief from fetchJobBrief must be 'ok'); runAccept appends lock_from_job when jobForFund returns a
   Selected listing for this fund; runLockFromJob alone; records/history treat lock_from_job as the lock step.
2. D27: ReviewDraft + canonicalReview + validateReview; optional `stage` on DeliveryDraft left OUT of the canonical JSON
   when absent (test that the evidence hash of an existing delivery is unchanged); note kind 3; readContractContent
   returns per milestone the ordered deliveries (first, revisions, handover) and reviews, counting a note only when its
   author matches the role; runRequestChanges (dispute + review note, retry for the note), runSendRevision, runHandover;
   view.ts labels and the Disputed status line of review-decision-plan.md section 3.
3. U4 in view.ts: Release now / Refund now for both roles with the exact copy; replace "auto-release in" with
   "Release opens in {t} if not reviewed".
4. C4: view.ts:86 and actions.ts:332 strings.
5. U3 part 1: move notices to packages/ned-core/src/milestone/notices.ts with every event of the U3 table (job events
   included), numbers in, one formatter; keep a re-export where ned-wallet imports them today.
6. F2: a `note` column in the Records CSV ("devnet test money; VND is an estimate at the 2 Oct rate; payout partner
   simulated; not tax advice").
Tests for each item.
Done when: ned-core tests pass; ned-wallet and ned-workspace typecheck; the report lists every new export.
```

## S5 · Workspace: the Jobs site shell, Overview and Find jobs (D28)

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0.
Read: README.md D28, funded-jobs-plan.md sections 2, 6, 6.1, 6.2, workspace-plan.md, the boards
docs/02-thiet-ke/canvas-v2/{WebJobs,WebJobsFind}.dc.html, and ned-workspace/src/{App.tsx,config.ts,motion.ts,
components/{Layout,TopBar,WorkspaceNav,WalletExtension,WalletPanel,WalletPanelContext}.tsx,hooks/*}.
Task:
1. FEATURES.jobs in ned-workspace/src/config.ts (default true; env override).
2. A separate route tree with its own layout: ned-workspace/src/jobs/JobsLayout.tsx (navbar exactly as the boards: logo
   "N.E.D Jobs" → /jobs, tabs Overview (/jobs) and Find jobs (/jobs/find), Devnet chip, "Post a job" for non-Vietnam
   view, profile button). The profile button opens a menu: header (@handle, view), "Open wallet" (opens the existing
   wallet extension panel, D23) and "Go to Workspace" (→ /). Signed out: the button reads "Sign in" and goes to
   /sign-in?next=<current path>. Footer as the boards.
3. /jobs = Overview (WebJobs board): hero with keyword + category search (submits to /jobs/find with the query in the
   URL), popular skills, the 3-step band (freelancer vs client copy), category tiles with live counts, Featured jobs =
   the 6 newest open listings (first card dark), "Find more jobs", the "Funded before anyone applies" section. Numbers on
   the page come only from the chain (sum of open budgets, open count, applications); no invented figures.
4. /jobs/find = Find jobs (WebJobsFind board): category chips with counts, tabs Open jobs / My applications / My
   listings (My listings hidden in the Vietnam view; the two "My" tabs need sign-in), the filter bar (search, category,
   skill, budget, time to deliver, milestones, sort, "Apply by within 24 h", "Hide jobs I applied to", Clear, Copy link),
   grid of 9 with "Show all". All filters live in the URL via filtersToQuery / filtersFromQuery; nothing is stored.
5. Overview and Find jobs work signed out (read-only chain reads). Routes /jobs/find and /jobs/new are declared before
   /jobs/:job.
6. In the Workspace sidebar, the existing nav gets "Jobs" → /jobs (as on the WebWorkspace board).
Vietnam view: amounts "≈ … VND (estimate)" with "$… · estimate" under, no Post a job, no My listings.
Done when: tests and build pass; the PR screenshots show Overview and Find jobs signed out, as @mia and as the Vietnam
view; the URL of a filtered search reopens the same results.
```

## S6 · Workspace: job detail and apply, post a job, applicants and select

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0.
Read: funded-jobs-plan.md sections 3, 4.3, 6, 6.2 and 7, the boards docs/02-thiet-ke/canvas-v2/{WebJobDetail,WebJobPost,
WebJobApplicants}.dc.html, and ned-workspace/src/{pages/NewContract.tsx,lib/newContract.ts,jobs/*}.
Task (inside JobsLayout from S5):
1. /jobs/:job (WebJobDetail): categories and skills, verified brief badge (or the warning when fetchJobBrief is not ok),
   scope and references, milestones with "Due N days after you are selected" and done-when points, "Budget locked" card
   with the job vault on Explorer, the business record (counted from contracts on Solana; "Not a rating"), the sticky
   Apply card: budget, deadlines, applicants, pitch with a live 280-byte counter and the public-on-Solana line, Apply →
   runApplyJob; states Applied and Selected ("Review & accept in wallet" opens the wallet panel at the contract).
2. /jobs/new (WebJobPost; non-Vietnam view only, else redirect to /jobs/find): one page, three sections (About the job:
   title with 32-byte counter and the F5 hint, category, up to 3 skills, summary with 160-byte counter, scope; Work: 1–5
   milestones with name, amount, due days, review days, done-when points; Timing: apply-by and select-by presets with the
   withdraw rule). Live card preview, problem list, sticky bar "Lock X USDC & publish" with balance after → runPostJob,
   progress for the brief parts and a retry. Published state with "Go to my listing" and Explorer.
3. /jobs/:job/applicants (WebJobApplicants; the business only): header with state and "Budget locked", Withdraw budget
   disabled with the reason until rules.canWithdraw, applicants sorted Newest / Most contracts completed, each with pitch
   and track record facts; Select → confirmation sheet with the absolute deadlines and the three bullets → runSelectJob;
   then "Waiting for @x to accept" with a countdown, then "Hired". Re-select is offered when the accept window passed.
Done when: on devnet with two logins a job can be posted, applied to, selected and accepted (the contract shows Funded at
accept) and a second job withdrawn; tests and build pass; screenshots of every state.
```

## S7 · Workspace: contract page and review (U1, U2, U4, D27, C4)

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0.
Read: delivery-review-updates.md U1, U2 and U4, review-decision-plan.md sections 1 and 4, compliance-fix-list.md C4,
the boards WebReview and WebWorkspace, and ned-workspace/src/pages/{Contract,Overview,Review}.tsx,
components/WalletPanel.tsx.
Task:
1. Contract page: a Delivery line per submitted milestone (also after release or refund) with "View delivery"; Release
   now / Refund now for BOTH parties when allowed (opens the wallet panel at the confirm sheet); for a job contract hide
   Lock and show "Move locked budget" (runLockFromJob) when Accepted and the listing is Selected; D27 banners (changes
   requested, revised version, final files) with Propose a split / Accept split / Return to client for the right role.
2. Review page: side by side "What to check" (done-when points, local ticks) and "What {name} delivered" (link cards with
   the Fixed version badge, note, files in a collapsed "Optional · Check a file you received" row, integrity line);
   version switcher for revisions; buttons Accept & release and Request changes ONLY (no Reject or Refund); the Request
   changes sheet (at least one unmet point, reason up to 500 characters, the exact info line) → runRequestChanges; the
   bottom line with the review deadline; after release a "Final files" block that checks dropped files against the
   committed fingerprints; C4 strings.
3. FEATURES.dispute gates every D27 control; with it off, the page behaves as today plus U1, U2, U4.
Done when: tests and build pass; screenshots of each contract state for client and freelancer, the request sheet, a
revised version and final files.
```

## S8 · Workspace: submit (U5, U6, D27 revision and handover)

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0.
Read: delivery-review-updates.md U2, U5 and U6, review-decision-plan.md section 4, the board WebSubmit, and
ned-workspace/src/{pages/Submit.tsx,lib/delivery.ts,components/FileDrop.tsx}.
Task:
1. Work type picker at the top (Design, Writing & translation, Code, Video, Other); pre-filled from the job category when
   the contract came from a job. Local only.
2. ned-workspace/src/lib/preview.ts, pure and unit-tested with small fixture images: source-format check, size check,
   PNG tEXt / JPEG COM marker read and write ("NED-Preview: v1 <fund>"), addWatermark(file, title, fund) → Blob (long side
   1200 px, diagonal tiled "PREVIEW · {title} · not for use" at 18% opacity, corner badge "N.E.D preview", then the
   marker).
3. For Design: the three checks with the exact U6 messages, "Add watermark" downloads "<name>-preview.png", Submit
   disabled until the checks pass or the override tick is ticked. Link checks of U6 for every type, no network calls.
4. The "Before you submit" sheet (U5 copy + the U6 Drive guide and per-type table), linked at the top; the three optional
   ticks above Submit (never blocking); "Files (optional)" with the U2 hint.
5. D27 modes: "Send revised version" (stage revision, Disputed milestone) and "Hand over final files" (stage handover,
   Released milestone), each with its own title and copy.
Done when: tests and build pass; screenshots of each warning, the watermarked output, the override, revision and handover.
```

## S9 · Workspace: shell, consent and security headers

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0.
Read: compliance-fix-list.md P3, P4, F4 and F5, delivery-review-updates.md U3, and ned-workspace/{index.html,vercel.json,
src/App.tsx,src/components/TopBar.tsx,src/pages/{SignIn,NewContract}.tsx}.
Task:
1. U3 web: a bell in TopBar (Workspace) and in JobsLayout, listing the core notices for the signed-in wallet, polled every
   30 s and on focus; "seen" kept per browser only.
2. P4: after sign-in, read the same @ned_consent_v1 record as the mobile build; without valid consent open the wallet
   panel at /consent and block contract and job actions until given. Self-host the three fonts in public/fonts and remove
   Google Fonts from index.html and the CSP.
3. P3: links to /terms and /privacy on the sign-in page and in both footers (pages come from the mobile build in S11).
4. F5: the public-on-Solana hint under the title in /new (contracts).
5. F4: enforce the /wallet CSP and drop mainnet Helius, api.jup.ag and api.geckoterminal.com from connect-src; check the
   panel still works.
Done when: tests and build pass; a new wallet must consent before creating a contract or applying; the network tab shows
no Google request; the CSP is enforced.
```

## S10 · Mobile: Vietnam view and money copy

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0.
Read: compliance-fix-list.md V1, V2, C1 and C3, compliance-fix-list-review.md A4, and ned-wallet/{app/_layout.tsx,app/
{send,receive,history,scan-qr}.tsx,services/onboarding.ts,app/(onboarding)/{fund,profile}.tsx,app/contracts/[fund]/
accept.tsx}.
Task:
1. V1: one region guard (hook or layout check): in the Vietnam view /send, /receive, /history and /scan-qr redirect to
   /home, on GitHub Pages and inside the Workspace at /wallet. Remove the "N.E.D fee 0.25%" fallback in history.tsx.
2. A4: no SOL or USDC amount anywhere in the Vietnam view; the fund step runs silently ("Preparing your account…") and the
   "Network fees use test SOL" disclosure stays.
3. V2: consent before the fund step in resolveOnboarding.
4. C1: the new accept text exactly. C3: hide the optional phone field in onboarding.
Done when: tests and the web build pass; each typed URL lands on Home in the Vietnam view (both hosts); a new wallet sees
consent before fund; `grep -rn "licensed" ned-wallet/app` shows no user-facing hit.
```

## S11 · Mobile: consent, Terms, Privacy, disclosures

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0.
Read: compliance-fix-list.md P1, P2, P3, C2 and appendices 1–2, compliance-fix-list-review.md A12,
funded-jobs-plan.md section 9, review-decision-plan.md section 4, delivery-review-updates.md U5, and ned-wallet/
{services/storage.ts,stores/useConsentStore.ts,app/(onboarding)/consent.tsx,app/disclosures.tsx,app/settings.tsx}.
Task:
1. P1: keep @ned_consent_v1 on sign-out (remove it from executeHardReset; keep the store state).
2. P2: CONSENT_VERSION 2, the scope array, the new rows and the exact checkbox text.
3. P3: app/terms.tsx and app/privacy.tsx from the appendices, with: Terms "not a marketplace" line replaced by the
   funded-jobs-plan.md section 9 line; Terms item 2 adds "or refund it to the client after a missed deadline"; Privacy
   lists Ably (through Dynamic) and Vercel / GitHub Pages logs. Link them from consent and Settings.
4. C2: the disclosure matches FEATURES.dispute: the disputes-on text of review-decision-plan.md section 4 when on, the
   "No disputes in this demo" text when off.
5. Settings › Help: the "Before you submit" guide (U5 + U6 Drive guide).
Done when: accept → sign out → sign in keeps acceptedAt; withdraw keeps the record with withdrawnAt; /terms and /privacy
open from consent, Settings and the Workspace footers; tests pass.
```

## S12 · Mobile: notifications (U3, C5)

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0.
Read: delivery-review-updates.md U3, compliance-fix-list.md C5, ned-wallet/constants/{design,motion}.ts, and ned-wallet/
{stores/useNotificationStore.ts,components/{NotificationInAppBanner,NotificationModal,GlobalNotificationManager}.tsx,
hooks/useContractWatch.ts}.
Task: rebuild the banner and the modal with components/design and the motion tokens (no borders, shadow S1, 4 s auto-hide,
swipe up, reduced motion); English only (remove every Vietnamese string, C5); use the core notices from S4 for every
milestone and job event; numbers in and one formatter (fix "+$NaN"); in the Vietnam view no transfer or USDC notice,
contract notices in ≈ VND; modal empty state "Contract updates, transfers and alerts show up here.", grouped Today / Earlier.
Done when: tests pass; screenshots of banner and modal in both views.
```

## S13 · Mobile: contract screens (D27, U1, U5, U6)

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0.
Read: review-decision-plan.md (all), delivery-review-updates.md U1, U5 and U6, the boards DisputeSheet,
DisputeSheetConcede, SplitPropose, SplitAccept, SplitReleased, ContractDetailMiaDisputed, ContractDetailVinhDisputed,
MilestoneReview and MilestoneSubmit, and ned-wallet/{app/contracts/[fund]/{index,review,submit}.tsx,components/contracts/*,
constants/features.ts}.
Task:
1. FEATURES.dispute = true. Review: Accept & release and Request changes (sheet: at least one unmet point, reason up to
   500 characters, exact info line). Changes requested, client and freelancer views with the exact labels; freelancer
   actions Send revised version, Propose a split, Return to client (confirmation "This refunds milestone {n} ({amount})
   to {client}. You can't undo it."); Accept split sheet stating that a split settles every open milestone; Hand over
   final files after release.
2. U1: the Delivery line per milestone and "Checking the delivery…" while the fingerprint check runs.
3. U5: the guide sheet and the three optional ticks on Submit. U6: link checks and, for Design, the note "Use the
   Workspace on a computer to check a design preview".
Done when: tests and the web build pass; screenshots of review, changes requested (both sides), split, return, handover;
the same screens work inside the Workspace wallet panel.
```

## S14 · Docs and copy

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0.
Read: build-order-6oct.md step 5, review-decision-plan.md section 4, funded-jobs-plan.md sections 7 and 9,
compliance-fix-list-review.md A1–A4, A10, docs/05-legal/qa-cheatsheet.md, README.md (repo root), product-spec.md section 7.
Task (documents only; CL reviews them):
1. qa-cheatsheet.md: A1 in its disputes-on version, A2, A3, A4, A10, and new answers "Is this a job marketplace?" and
   "Can a client copy the work and refuse?" (Request changes never refunds; previews before release; final files after).
2. Decision log D11: "so funds never freeze" → "a disputed milestone stays locked until both sides agree".
3. Root README (R1): what runs now (program v1.3, Workspace, N.E.D Jobs, mobile web build), live links, how to run each
   package, landing page in its own repo (D21), the license line as decided.
4. expert-check-pack.vi.md: new question on the job board (Law 74/2025, Decree 352/2025, e-commerce rules).
5. product-spec.md section 7: add the job steps (funded-jobs-plan.md section 7) and one Request changes → revised version
   → accept loop.
Done when: every changed sentence follows the word table; links resolve; progress row added.
```

## S15 · Test everything together (T1–T15)

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0.
Read: build-order-6oct.md step 6 (scenarios T1–T15).
Task: deploy preview builds of main (Vercel preview for ned-workspace with the /wallet build; no production
deploy) only if the PO approves in this session; otherwise run both apps locally against devnet. Prepare a checklist file
docs/09-milestone-lock/test-run-6oct.md with T1–T15, steps, expected result and a column for the result. Run T3, T14 and
T15 yourself (filters, Records, wording grep) and fill them in. For the scenarios that need two human logins, list the
exact clicks for the PO. Fix small failures you find (one commit each); for anything big, propose switching the flag off
(jobs or dispute) and what the disclosure and Q&A must then say.
Done when: test-run-6oct.md exists with T3, T14, T15 filled and every fix committed; the PO has the click list for the rest.
```

**Owner task:** run the two-login scenarios twice and fill in `test-run-6oct.md`. If a scenario fails and cannot be fixed, switch its flag off (build-order step 6).

## S16 · Release check and deploy

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0.
Context: the PO confirms T1–T15 passed twice (or names the flags to switch off).
Task:
1. Apply any flag the PO named, with the matching disclosure and Q&A text.
2. On main (no pull request, section 0 rule 2): run every test and both builds, and write a release summary per step
   (S1–S15) with the test-run file in docs/09-milestone-lock/release-6oct.md; ask CL to review that summary and main.
3. After CL approves and the PO says go: build ned-wallet for GitHub Pages and check `grep -o 'jup_'` on the bundle
   is empty; deploy gh-pages; deploy the Workspace on Vercel (production). Run T1, T5, T6, T9 and T12 once on the live
   sites and report.
Do not deploy before the PO says go in this session.
Done when: main has the merge, both live sites show the new build, the live checks pass, and the progress log has the
final row.
```

## Appendix H · N.E.D Jobs hub spec (taken from the WebJobs and WebJobsFind boards)

> **Superseded (7 Oct):** replaced by appendix V of [`prompts-hub-v4.md`](prompts-hub-v4.md) (canvas version 113). Kept for reference; where they differ, appendix V wins.

Added on 6 Oct 2026 for S5. The S5 prompt referred to this appendix before it existed; the PO chose to take it from
the boards `docs/02-thiet-ke/canvas-v2/WebJobs.dc.html` and `WebJobsFind.dc.html`. If a board and this appendix
disagree, fix both. Code: `ned-workspace/src/jobs/` (`hub.module.css`, `JobsLayout.tsx`, `ProfileMenu.tsx`,
`components/`). Screenshots: `docs/02-thiet-ke/screenshots/s5-jobs-shell/`.

**H.1 Colours.** Ink `#16161C`, ink-2 `#3F3F49`, ink-3 `#4B4B57`, caption `#5E5E6A`, muted `#8A8A96`. Page `#FFFFFF`;
lavender (header, hero) `#EFE6FB` with `#DCC9F7` / `#D0B7F3` for the hero circles; peach band `#FFE4CF` (its caption
`#5C4636`); cream section `#FFF1E6`; soft `#F6F4F9`; row line `#F0F0F3`. Dark (featured card, footer) `#16161C`, footer
line `#2A2A33`, footer text `#D7D7DE`, footer caption `#A9A9B4`. Purple `#7B2FBE` (hover and ink `#6A22B0`). Chip tones
(background / ink): info `#EEEFFE`/`#3730A3`, purple `#F2EAFB`/`#6A22B0`, success `#E7F6EC`/`#127A3A`, neutral
`#EFEFF3`/`#4B4B57`, warning `#FFF5E1`/`#8A5300`. Category ink / tint, in taxonomy order: Design `#7B2FBE`/`#F2EAFB`,
Development `#C2410C`/`#FFE4CF`, Writing & Translation `#127A3A`/`#E7F6EC`, Marketing `#B4235A`/`#FCE7EF`, Video &
Animation `#3730A3`/`#EEEFFE`, Data & AI `#0E7490`/`#E0F4F8`, Admin & Support `#8A5300`/`#FFF5E1`, Other
`#4B4B57`/`#EFEFF3`.

**H.2 Radii and shadows.** Chips 9999 px, buttons 12 px (small 10 px), category tiles 18 px, cards 20 px, bands 24 px,
menu 18 px. No borders on surfaces: card shadow `0 1px 2px rgba(17,17,22,.04), 0 6px 16px -6px rgba(17,17,22,.10)`;
featured dark card `0 18px 36px -18px rgba(17,17,22,.55)`; menu `0 2px 6px rgba(17,17,22,.06), 0 24px 48px -20px
rgba(17,17,22,.35)`; search box `0 2px 4px rgba(17,17,22,.04), 0 18px 40px -18px rgba(76,23,130,.35)`. The outline
button is an inset 1.5 px ink shadow, not a border.

**H.3 Type and spacing.** Space Grotesk for headings (h1 `clamp(40px, 5.4vw, 64px)`, -2 px tracking; h2 34 px, -1 px;
card title 19 px), Inter for text (15 px body, 13–12 px small), Space Mono for amounts (20 px on cards). Content width
1,200 px with a 24 px gutter; grid gap 16 px (cards) and 14 px (tiles); sections 56–80 px apart.

**H.4 Motion.** The `src/motion.ts` curves (`cubic-bezier(.2,0,0,1)`, out `cubic-bezier(.16,1,.3,1)`). Hub-only:
*float* (decoration, 6 px up and down over 6 s; the second variant 7 s with a 1.2 s delay) and *lift* (hover on cards
−3 px, on tiles −2 px, 220 ms, with a deeper shadow). The menu pops in over 200 ms (scale .97 → 1, 6 px drop).
Everything stops under `prefers-reduced-motion`.

**H.5 Navbar.** Lavender bar, 1,200 px wide: dark "N.E.D" mark + "Jobs" → `/jobs`; tabs **Overview** (`/jobs`) and
**Find jobs** (`/jobs/find`), the active tab in purple ink with a 2 px purple underline; spacer; white "Devnet · test
money" chip; **Post a job** (purple, arrow-up icon → `/jobs/new`) only for a signed-in wallet outside the Vietnam view;
the profile button (white pill: avatar 34 px, @handle, view line, chevron). Signed out, the button reads **Sign in** →
`/sign-in?next=<path and query>` (only a path on this site is followed after sign-in).

**H.6 Profile menu.** 290 px, under the button: header (avatar 40 px, @handle, "Vietnam view · VND" or "USDC wallet");
**Open wallet** ("The N.E.D Wallet, as on your phone"; opens the wallet extension of D23); **Go to Workspace**
("Contracts, milestones and records", → `/`, external-arrow icon). Escape and a click outside close it and focus
returns to the button; arrow keys, Home and End move between the items.

**H.7 Steps band.** Peach band, 24 px radius, two black swirls at the sides, three steps with a ringed icon.
Freelancer (also every Vietnam view): Find a funded job / Budget locked, checkable on Explorer · Apply with a short
pitch / Public, up to 280 bytes · Accept and deliver / Receive VND per milestone. Client: Post and lock the budget / One
page, three short steps · Pick one applicant / That creates the contract · Release per milestone / After you accept
the work.

**H.8 Category tile.** White, 18 px radius, icon 44 px on the category tint, label 15 px, count line ("No open jobs
yet", "1 open job", "N open jobs"); selected = 2 px inset purple ring; one link to Find jobs with `cat=<id>`.

**H.9 Job card.** One link to `/jobs/:job`, 22 px padding, 14 px gap: title (+ "Applied" info chip or "Your job"
purple chip); meta row (category, time to deliver, milestones); up to 3 skill chips; amount (Space Mono 20 px; "≈ …
VND (estimate)" with "$… · estimate" under it in the Vietnam view) and the green **Budget locked** chip; footer above a
hair line: business avatar and @handle, "Apply by {date} · N applicants" ("Applications closed" after the date), call
to action ("Apply now", "View" or "Manage"; outlined, white on the dark card). The first card of Featured jobs is the
dark variant.

**H.10 Buttons.** Dark = browse or navigate ("Search", "Find more jobs"); purple = an action that goes to the wallet
("Post a job", "Apply", "Lock budget & publish"); outline = secondary ("See your records").

**H.11 Footer.** Dark: purple "N.E.D" mark + "Jobs" and the line "Jobs with budgets locked on Solana. N.E.D does not
choose, vet or employ anyone, holds no funds and charges no fee in this version."; columns Jobs (Find jobs; Post a job
outside the Vietnam view), Workspace (Overview; Records when signed in), Legal (Disclosures; Terms and Privacy come in
S9); a note line. Vietnam view: "Devnet demo with test money. Listings, budgets and applications are read from Solana;
N.E.D stores nothing. VND amounts are estimates at 26,019.5 VND per USD (2 Oct 2026); the payout partner is simulated.
Your pitch is public on Solana." Otherwise: "Devnet demo with test money. Listings, budgets and applications are read
from Solana; N.E.D stores nothing. Filters live in the page address, so a search can be shared."

**Numbering note (6 Oct).** The S5b prompt cites the hero as H.7, category tiles as H.8, featured jobs as H.9 and the
"Funded before anyone applies" section as H.10. In this appendix those are H.12 (hero), H.8 (tile), H.9 (card) and
H.14 (why); H.7 is the steps band and H.10 the buttons. The content is the same; only the numbers differ.

**H.12 Overview hero.** Lavender section. Eyebrow chip (lock icon) "Every budget is locked before the job is posted".
Headline and sub-line: freelancer copy for every Vietnam view and for visitors who are signed out — "Find work that is
already funded" / "Every job here has its full budget locked on Solana before it is posted. Apply with a short pitch;
if you are hired, you receive VND milestone by milestone."; client copy (signed in, outside the Vietnam view) — "Hire for
work you can fund today" / "Browse what others post, or post your own job with its budget locked. Pick one applicant and
the contract is created for you." Search capsule: Keyword (placeholder "Logo, Framer, translation…"), Category (All
categories + the 8), dark Search → `/jobs/find?<filtersToQuery({ q, cat })>`. "Popular:" Logo & brand, Figma, English ↔
Vietnamese, Solana programs → `/jobs/find?skills=<id>` (the core query key is `skills`). Illustration (decorative,
hidden from screen readers): two lavender circles, two white curves, four floating category icons, the newest open
listing as a tilted card (business, Budget locked, title, "category · N milestones · up to <time>", amount, Apply);
the "<sum> locked in N open jobs" card with one bar per open listing (newest 24; height = budget relative to the
largest; purple for the top half); "N applications on open jobs". With no open listing the tilted card reads "No open
jobs yet / The newest open job shows here." Every number comes from `listOpenJobs` (state Open only).

**H.13 Overview sections.** The steps band (H.7) overlaps the hero by 28 px. "Choose your field" / "Open jobs with
locked budgets, by category." with the 8 tiles (H.8). "Featured jobs" on cream / "The newest jobs, each with its budget
already locked. Find jobs lists every job, with filters." — the 6 newest open listings (H.9, first one dark), then dark
"Find more jobs" → `/jobs/find`. Loading: 6 skeleton cards (the first dark). Error: "Couldn't read jobs from Solana. Try
again." with Retry. Empty: "No open jobs yet" — client: "Post the first one: lock a budget and publish it." with Post a
job; otherwise "New jobs show up here as soon as a business locks a budget."

**H.14 "Funded before anyone applies".** Illustration "Your contract" with two rows (1 · First milestone — Released;
2 · Final files — Locked; no amounts) and the badge "Checkable on Solana Explorer". Text: "A business can only post a
job by locking its whole budget in the program. When it hires you, that budget moves into your contract and is
released milestone by milestone after the work is accepted." Reasons: Budget locked first · Track record from Solana ·
No fee from N.E.D · Release only accepted work (Vietnam view: Receive earnings in VND). Buttons: client "Post a job" →
`/jobs/new`, otherwise "Browse open jobs" → `/jobs/find`; outline "See your records" opens the wallet extension at
`/records` (the Workspace has no `/records` page; signed out it goes to `/sign-in?next=/jobs`).

**H.15 Find jobs.** (The S5c prompt calls this H.13.) Lavender title band: h1 "Find jobs", sub-line "Every job here has
its whole budget locked on Solana. Filter by field, skill, budget and time to deliver.", category chips All + the 8
with live counts (the open jobs that pass every other filter; the selected chip is dark). Heading row: "Open jobs" or
"<Category> jobs" / "Every budget below is already locked on Solana."; "My applications" / "Where each of your
applications stands."; "My listings" / "Jobs you posted and what happened to each budget."; tabs Open jobs · My
applications · My listings with counts (My listings hidden in the Vietnam view; signed out, the two My tabs show "Sign
in to see your applications / listings" with Sign in → `/sign-in?next=<this URL>`). Filter bar (white, 18 px radius):
search "Search title, summary, skills" (writes `q` to the URL 150 ms after typing), Category, Skill (the category's
skills), Budget (Under 20 USDC · 20 – 50 USDC · Over 50 USDC; Vietnam view: Under ≈ 520,000 VND · ≈ 520,000 – 1,301,000
VND · Over ≈ 1,301,000 VND; stored as `min`/`max` in whole USDC), Time to deliver (Up to 1 week / 2 weeks / 1 month),
Milestones (1 / 2–3 / 4–5), Sort (Newest · Apply by soonest · Budget: high to low); ticks "Apply by within 24 h" and
"Hide jobs I applied to"; the count "N open jobs" (+ " match" when a filter is on); Clear (keeps the sort); Copy link
("Link copied"). Results: job cards (H.9, the first dark), 9 at a time, "Show all N jobs" / "Show fewer jobs". No
match: "No open jobs match these filters." / "Try another category or a wider budget." (or, with no open job at all,
"No job is open right now. New jobs show up here as soon as a business locks a budget.") and Clear filters. URL:
`filtersToQuery` order plus `tab=applied|listings`; nothing is stored.
Rows (avatar, title, meta, amount with its second line, status chip, action): My applications — Selected · accept now
(success; "Review & accept" purple → the contract), Applied (info; View job), Not selected yet (another applicant is
selected), Not selected (filled by someone else), Hired (purple; Open contract), Closed (withdrawn). My listings — Open
(success; "N applicants · select by … · posted …", "locked in the job", Review applicants, purple when there are
applicants), Selected (info; "Selected @x · accept by …"), Filled (purple; "Hired @x · contract created", "moved into the
contract", Open contract), Withdrawn (neutral; "budget returned", "returned to you", View record → the listing). Empty:
"You haven't applied to a job yet." / "Every open job shows its locked budget, so the money is there before you apply."
and "You haven't posted a job yet." / "Post a job: lock its budget and publish it."

**H.16 Job detail (`/jobs/:job`, WebJobDetail).** Page background `#F7F4FB`; a dark pill "All jobs" back link. Main
column: category chip and skill chips; title; summary; business avatar and handle "· posted {date}"; brief chip
"Brief verified · matches its fingerprint on Solana" (warning when not: "The public brief does not match its
fingerprint on Solana. Don't apply until the business saves it again." or "The public brief is not on Solana yet.");
Scope (+ reference links); Milestones ("Each milestone is released after the client accepts it"; per milestone the
brief name, "Due N days after you are selected · N days to review" — minutes or hours for devnet windows — amount,
Done when points); "Budget locked" card (amount, "Locked in a program vault on Solana when the job was posted. It
moves into your contract when you accept. It goes back to {business} only if nobody is hired.", View the vault on
Explorer); "{business} on N.E.D" facts counted from its SharedFund accounts as client (contracts with a released
milestone, milestones submitted to them, milestones still locked by a request, first contract) and "Counted from
contracts on Solana. Not a rating." (the board's "Reviewed before the deadline" needs transaction history and is left
out). Sticky aside: Budget, Apply by "{date} · N days left", Client selects by, "If selected, accept within 48 h (2 min
on devnet)", Applicants; then one state: the pitch box ("Why you fit this job, and one link to similar work.", live
"N / 280" byte counter, "Public on Solana. Don't put names or personal details here.", purple Apply → wallet confirm →
runApplyJob, payout note per view, "One wallet confirmation; the network fee is test SOL on devnet.") · "Applied ·
{date}" with the pitch · "You were selected" with "Review & accept in wallet" (opens the wallet extension at the
contract) · "You're hired" with Open contract · Not selected · "This is your job" with Review applicants · signed out
"Sign in to apply" · "Applications are closed". "How it works": Apply · Get selected · Accept · Submit each milestone ·
Released, the reached steps filled. Applying first registers this computer's device key (D22).

**H.17 Post a job (`/jobs/new`, WebJobPost).** Outside the Vietnam view only (the Vietnam view goes to `/jobs/find`;
signed out to sign-in). "Post a job" / "Freelancers see your job with its budget already locked. You pick one applicant;
that creates the contract." Three numbered cards: 1 About the job (Title with "N / 32" and the public hint; Category
pills; Skills "pick up to 3"; Summary "shown on the job card" with "N / 160"; Scope; Reference links, one https link per
line, optional); 2 Work (Milestone N with Name, Amount (USDC), Due (days after you select), Days to review, Done when
one point per line; Remove; Add a milestone; "1 to 5 milestones · up to 1,000 USDC per job in this demo. Write done-when
points someone else could check."); 3 Timing (Applications close in 3 / 7 / 14 days; You select someone within the
apply days, +2, +4; "Apply by {date} · select by {date}. With no applicants you can withdraw the budget at any time.
Once someone has applied, the budget stays locked until the select-by date, so applicants know it's there."). Aside:
"How freelancers will see it" (the live job card) and the problem list. Sticky bar: "{amount} leaves your wallet now and
waits in the job's vault · balance after: {balance}. Your wallet asks twice: to lock the budget, then to save the public
brief." + purple "Lock {amount} & publish" → wallet confirm → runPostJob ("Saving the public brief · 1 of N"); a failed
brief shows "Save the brief again" (runPostJobBrief). Published: "Published · {amount} locked" + "Your job is on the
board. Applications appear under My listings; you can select someone until {date}." + Go to my listing + View on
Explorer.

**H.18 Applicants (`/jobs/:job/applicants`, WebJobApplicants).** Business only (others: "Only the business that posted
this job can see its applicants"). Dark pill "My listings". Header: state chip (Open · select by {date} / Selected ·
waiting to accept / accept time over / Filled / Withdrawn), "Budget locked · {amount}" chip, title, "{N} milestones ·
applications close(d) {date} · select by {date}", View public listing, Withdraw budget (disabled until
rules.canWithdraw) with its reason line ("Withdraw opens after {select by} if you hire no one. People applied because
the budget is locked, so it stays until then." etc.). Banners: "Waiting for {x} to accept · {countdown} left" + "The
contract is created. When {x} accepts, the {amount} moves into it and work starts. If the time runs out, you can select
someone else." + Open contract; "{x} didn't accept in time" (re-select); "Hired {x} · {amount} moved into the contract" +
"The listing is filled. Other applicants now see "Not selected"." Applicants ("Applicants · N", Sort Newest first / Most
contracts completed): avatar, handle, "applied {date}", tag Selected / Hired / Not selected, pitch, track-record facts
(N contracts completed, X of Y submitted on time, N refunds, Worked with you before, or New on N.E.D), Select (purple).
Footer line: "Track records are counted from contracts on Solana, not ratings. Pitches are public. N.E.D does not vet or
rank applicants." Select sheet: "Select {x}?" / "This creates a contract with your brief and these deadlines, counted
from now:" with each milestone's submit-by and review-by, then the three bullets (budget moves at accept; accept within
48 h (2 min on devnet); the wallet confirms the contract, its encrypted brief and the contract key for both) and Cancel
/ "Create contract & select" → runSelectJob.
