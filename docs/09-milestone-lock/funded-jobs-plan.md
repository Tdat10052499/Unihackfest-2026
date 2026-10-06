# Funded Jobs: build plan for 6 Oct (decision D25)

**Owner:** PO (Hồ Du Tuấn Đạt) · **Written:** 6 Oct 2026, 07:00 · **Builds on:** `main` at `2fb0318` (program v1.2)
**Goal:** a working job board in the demo by the end of 6 Oct, without touching what already works.

Labels follow `CLAUDE.md`: \[Verified\] = read in the code on 6 Oct, \[Assumption\] = a number we chose.

## 1. Idea in one paragraph

A business posts a job and **locks the whole budget in the program when it publishes** ("Budget locked" on every listing, with an Explorer link). Freelancers browse the board and apply with a short pitch. The business selects one applicant: this creates a normal Milestone Lock contract for that person, with the brief and key wraps posted exactly as today. When the freelancer accepts and chooses where the earnings go, the same transaction moves the locked budget from the listing into the contract. From there the existing flow runs unchanged (submit → approve or release after review → refund on a missed deadline).

Positioning for the pitch: **"Milestone Lock is the core. Funded Jobs is how freelancers find work that is already funded."**

## 2. Why this design is safe to build in one day

| Choice | Effect |
| --- | --- |
| New accounts only (`JobListing`, `JobApplication`) | `SharedFund` stays 740 bytes; no existing contract, offset, memcmp filter or screen changes \[Verified: `state/shared_fund.rs`, `layout.ts`\] |
| Selecting = the existing `create_fund` + brief notes + key wraps (`runCreate`), plus one new instruction in the same transaction | Brief encryption, device-key sync (D22) and the invite link are reused as they are |
| Accepting = the existing `accept` + one new instruction `lock_from_job` in the same transaction | The destination is still fixed before any money reaches the contract (rule 1.2); if either step fails, nothing changes |
| The job vault is a program PDA, like the contract vault | N.E.D holds no funds (D4); no fee (D2) |
| Mobile gets **no new screens** | A hired contract appears in the freelancer's contract list as an ordinary invite; `@ned/core` adds `lock_from_job` to `accept` automatically |
| A feature flag `jobs` in the Workspace | If the day runs late, the board is hidden and nothing else is affected (cut line, section 8) |

Rules that stay:

- The Vietnam view never posts a job (D18); it can browse, apply and accept.
- The Vietnam freelancer never holds or receives USDC: accepting with "VND to my bank account" sets the payout partner, as today.
- English UI, words from product-spec section 6. Never "payment", "escrow" (UI), "guaranteed" or "safe".

## 3. Flow

```
Business (Workspace, non-Vietnam view)
  post_job + post_job_brief ──► JobListing: Open · budget in job vault ("Budget locked")
Freelancer (Workspace /jobs, any view)
  apply_job (pitch ≤ 280 bytes, public) ──► JobApplication
Business: Applicants → Select @user
  create_fund (existing) + select_job ──► Contract: Created · JobListing: Selected
  + brief notes (kind 0) + key wraps (kind 2)  (existing runCreate)
Freelancer (mobile app or Workspace wallet panel): the contract invite, as today
  accept (existing) + lock_from_job ──► Contract: Funded · JobListing: Filled
  ──► submit → approve / release_after_review / refund (existing)
No one hired in time ──► withdraw_job: budget back to the business
```

## 4. Program v1.3

Add files `state/job.rs`, `instructions/job/{mod,post_job,post_job_brief,apply_job,select_job,lock_from_job,withdraw_job}.rs`. Do not edit any existing instruction. Program ID unchanged; upgrade on devnet.

### 4.1 Constants (`constants.rs`)

| Name | Value | Note |
| --- | --- | --- |
| `JOB_SEED` | `b"job"` | PDA `[JOB_SEED, business, job_id.to_le_bytes()]` |
| `JOB_VAULT_SEED` | `b"job_vault"` | Token account `[JOB_VAULT_SEED, job]`, authority = job PDA |
| `JOB_APP_SEED` | `b"job_app"` | PDA `[JOB_APP_SEED, job, freelancer]` (one application per person) |
| `JOB_PITCH_MAX_LEN` | 280 | Bytes of UTF-8; public on-chain |
| `JOB_ACCEPT_WINDOW_SECS` | 120 | Devnet value; launch 48 h \[Assumption\] |
| `JOB_DEADLINE_SLACK_SECS` | 300 | Allowed gap between the template and the absolute deadlines at select time |
| `JOB_CATEGORY_COUNT` | 8 | Must equal the category list in `@ned/core` `jobs/taxonomy.ts` |
| `JOB_SUMMARY_MAX_LEN` | 160 | Bytes of UTF-8; public on-chain |

Reuse `MAX_MILESTONES`, `MAX_CONTRACT_AMOUNT`, `MIN_WORK_WINDOW_SECS`, `MIN_REVIEW_WINDOW_SECS`, `TITLE_MAX_LEN`, `NOTE_MAX_LEN`, `NOTE_MAX_PARTS`, `USDC_MINT`.

### 4.2 Accounts (field order is fixed; offsets include the 8-byte discriminator)

`JobListing`: 576 bytes (6 Oct, updated for search and filter: `category`, `skills` and `summary` added).

| Offset | Field | Type | Note |
| --- | --- | --- | --- |
| 8 | `version` | u8 | 1 |
| 9 | `state` | `JobState` (u8) | `Open`, `Selected`, `Filled`, `Withdrawn`. memcmp "open jobs" |
| 10 | `business` | Pubkey | memcmp "my listings" |
| 42 | `category` | u8 | Index into the category list in `@ned/core` `jobs/taxonomy.ts` (< `JOB_CATEGORY_COUNT`). memcmp "jobs in this category" |
| 43 | `skills` | u64 | Bitmask of up to 64 skills from the same taxonomy; filtered in the browser |
| 51 | `mint` | Pubkey | USDC |
| 83 | `job_id` | u64 | |
| 91 | `created_at` | i64 | Sort "Newest" |
| 99 | `apply_by` | i64 | Last time to apply; sort "Apply by soonest" |
| 107 | `select_by` | i64 | Last time to select; withdraw opens after it |
| 115 | `total` | u64 | Sum of the template amounts; budget filter and sort |
| 123 | `milestone_count` | u8 | 1–5 |
| 124 | `milestones` | `[JobMilestone; 5]` | Each 24 bytes: `amount: u64`, `work_secs: i64` (due this long after select), `review_secs: i64` |
| 244 | `title` | `[u8; 32]` | UTF-8, zero-padded; searched |
| 276 | `summary` | `[u8; 160]` | UTF-8, zero-padded; the card text; searched. Not part of the brief hash |
| 436 | `brief_hash` | `[u8; 32]` | SHA-256 of the canonical brief JSON (same `canonicalBrief` as contracts) |
| 468 | `selected` | Pubkey | Default until `select_job` |
| 500 | `selected_at` | i64 | |
| 508 | `fund` | Pubkey | The contract created at select; memcmp "job of this contract" |
| 540 | `application_count` | u16 | Shown on cards |
| 542 | `bump`, `vault_bump` | u8, u8 | |
| 544 | `_reserved` | `[u8; 32]` | |

Rent for 576 bytes is about 0.0049 SOL, paid by the business and not returned in v1.3 (the listing stays as a record) \[Inference: standard rent formula\].

`JobApplication`: 364 bytes.

| Offset | Field | Type |
| --- | --- | --- |
| 8 | `version` | u8 |
| 9 | `job` | Pubkey (memcmp "applicants of a job") |
| 41 | `freelancer` | Pubkey (memcmp "my applications") |
| 73 | `created_at` | i64 |
| 81 | `pitch_len` | u16 |
| 83 | `pitch` | `[u8; 280]` |
| 363 | `bump` | u8 |

Add `const _: () = assert!(...SPACE == 576 / 364)` as `shared_fund.rs` does.

### 4.3 Instructions

| Instruction | Signer(s) | Checks | Effect |
| --- | --- | --- | --- |
| `post_job(job_id, title, summary, category, skills, milestones: Vec<JobMilestoneInput>, brief_hash, apply_by, select_by)` | `business`, `payer` | brief hash non-zero; `category < JOB_CATEGORY_COUNT`; summary 1–160 bytes; 1–5 milestones; each amount > 0, `work_secs ≥ MIN_WORK_WINDOW_SECS`, `review_secs ≥ MIN_REVIEW_WINDOW_SECS`; total ≤ `MAX_CONTRACT_AMOUNT`; title ≤ 32 bytes; `now < apply_by ≤ select_by` | Init listing + job vault; `transfer_checked` total from the business ATA to the job vault; state `Open`; event `JobPosted` |
| `post_job_brief(part, parts, data)` | `business` | state `Open`; `1 ≤ data.len() ≤ NOTE_MAX_LEN`; `part < parts ≤ NOTE_MAX_PARTS` | No state change; event `JobBriefPosted`. The app reads the **plain-text** brief back from the transaction, like `post_note` |
| `apply_job(pitch: String)` | `freelancer` (pays rent) | state `Open`; `now ≤ apply_by`; freelancer ≠ business; pitch ≤ 280 bytes | Init `JobApplication` (a second application by the same person fails at init); `application_count += 1`; event `JobApplied` |
| `select_job()` | `business` | Listing `Open`, or `Selected` with `now > selected_at + JOB_ACCEPT_WINDOW_SECS`; `now ≤ select_by`. `fund`: state `Created`, `client == business`, `mint == listing.mint`, `brief_hash == listing.brief_hash`, same milestone count; per milestone same amount, `review_by − submit_by == review_secs`, `submit_by ≥ now + work_secs − JOB_DEADLINE_SLACK_SECS`. `application` = PDA `[JOB_APP_SEED, job, fund.freelancer]` exists | `selected = fund.freelancer`, `selected_at = now`, `fund = fund.key()`, state `Selected`; event `JobSelected`. Sent **in the same transaction, after `create_fund`** |
| `lock_from_job()` | anyone (the freelancer in practice) | Listing `Selected`; `fund == listing.fund`; fund state `Accepted`; `fund.total == listing.total`; `check_work_window(used(fund), now)` | Job vault → contract vault (the stored total, signed by the job PDA); fund state `Funded`; listing state `Filled`; any balance above the total (a donation) → business ATA; close the empty job vault, rent → business; emit the **existing** `FundLocked` and `JobFilled`. Sent **in the same transaction, after `accept`** |
| `withdraw_job()` | `business` | Listing `Open` with `application_count == 0` (any time); or `Open` with `now > select_by`; or `Selected` with `now > select_by` and `now > selected_at + JOB_ACCEPT_WINDOW_SECS` | Stored total, then any donation above it → business ATA; close the job vault; state `Withdrawn`; event `JobWithdrawn`. The listing account stays for the record |

A contract created at select but never accepted stays `Created` or `Accepted`; the business closes it with the existing `close`. On a re-select the app sends `close` for the previous contract in the same transaction as the new `create_fund` + `select_job`, so the first applicant cannot accept a contract that will never be funded.

If a job contract is `Accepted` but not `Funded` (for example, accepted from an old cached build without `lock_from_job`), anyone can send `lock_from_job` alone while the listing is `Selected`. The Contract page shows **Move locked budget** in that case and never shows the normal **Lock** button for a job contract, so the business cannot lock the amount twice.

### 4.4 Errors (append to `errors.rs`, never renumber)

`JobNotOpen`, `ApplyClosed`, `SelectClosed`, `AcceptWindowOpen`, `JobFundMismatch`, `NotSelected`, `WithdrawTooEarly`, `PitchTooLong`, `InvalidJobDeadlines`, `InvalidCategory`, `SummaryTooLong`.

### 4.5 Tests (`tests/jobs.rs`, same harness as `tests/milestone.rs`)

1. Happy path: post → brief → apply ×2 → select B → accept (PayoutPartner) + lock_from_job → submit → approve; partner receives the amount; listing `Filled`; job vault closed.
2. `post_job` refuses: category 8, an empty or 161-byte summary, zero hash, 0 or 6 milestones, total over the cap, `apply_by > select_by`, short work window.
3. `apply_job` refuses: after `apply_by`, the business itself, a second application, a 281-byte pitch.
4. `select_job` refuses: a non-applicant, a fund with another amount / brief hash / shorter review window, a re-select inside the accept window; allows a re-select after it.
5. `lock_from_job` refuses: a fund that is not `listing.fund`, a fund still `Created`; and an `accept` + `lock_from_job` transaction where the lock fails leaves the fund `Created` (atomic).
6. `withdraw_job`: allowed at once with no applicants; refused before `select_by` with applicants; refused inside the accept window; allowed after; the business gets the full total back.
7. All existing tests still pass unchanged.

### 4.6 Deploy

Build, then `solana program show` to compare the binary size with the program account; run `solana program extend` if needed before `anchor upgrade`. The PO approves the upgrade (build-plan section 10, rule 3). Copy the new IDL into `packages/ned-core/src/idl/` in the same PR.

## 5. `@ned/core`

New folder `packages/ned-core/src/jobs/` (export from `index.ts`):

| File | Content |
| --- | --- |
| `layout.ts`, `pda.ts`, `decode.ts` | Sizes and offsets of section 4.2; `jobPda`, `jobVaultPda`, `jobAppPda`; decoders via the IDL coder |
| `queries.ts` | `listOpenJobs({ category? })` (memcmp discriminator + state `Open` at 9, plus `category` at 42 when given); `listMyJobs(business)` (10); `listApplicants(job)` (9); `listMyApplications(freelancer)` (41); `jobForFund(fund)` (508) |
| `brief.ts` | `buildJobBriefTxs` (plain-text parts of `canonicalBrief`), `fetchJobBrief(job)` with `getSignaturesForAddress(job)`, skips failed transactions, joins parts, checks the hash → status `ok` / `mismatch` / `missing` |
| `actions.ts` | `runPostJob(env, draft)`: validate, `post_job`, then the brief parts. `runApplyJob(env, job, pitch)`. `runSelectJob(env, job, freelancer)`: reads the listing and its public brief, builds absolute deadlines (`submit_by = now + work_secs`, `review_by = submit_by + review_secs`), then calls `runCreate` with one extra instruction `select_job` after `create_fund`. `runWithdrawJob(env, job)` |
| `taxonomy.ts` | 8 categories and up to 64 skills (section 6.1). Append only: never reorder or reuse an index, because listings store the numbers |
| `search.ts` | `filterJobs(jobs, filters)` and `sortJobs` (pure functions, unit-tested): text match on title + summary (case- and accent-insensitive), skills (any selected), budget range, max duration, milestone count, "Apply by within", hide jobs I applied to; `filtersFromQuery` / `filtersToQuery` for the URL |
| `rules.ts` | `canApply`, `canSelect`, `canWithdraw`, mirrored from section 4.3, for disabling buttons |

Changes to existing files (small):

- `actions.ts` `runCreate`: accept an optional `extraInstructions` argument appended after `create_fund`; check `txSize` stays ≤ 1232 bytes.
- `actions.ts` `runAccept`: after building `accept`, call `jobForFund(fund)`; if a `Selected` listing points to this fund, append `lock_from_job`. This is what makes the mobile app work with no new screens.
- `records.ts` / history readers: treat `lock_from_job` like `lock`, so Records shows the lock step.
- Tests: decoders against fixed bytes, queries with a mocked connection, `runAccept` adds `lock_from_job` only for a job contract.

## 6. Workspace screens (`ned-workspace`, behind `FEATURES.jobs`)

> **Updated by D28 (6 Oct):** the job board is its own site, "N.E.D Jobs", with its own layout inside `ned-workspace`: `/jobs` is the Overview (hub landing) and `/jobs/find` is the list with filters; the profile menu opens the wallet or goes to the Workspace. Boards: `WebJobs`, `WebJobsFind`. Prompts: [`prompts-6oct.md`](prompts-6oct.md) S5–S6.

| Route | Who | Content |
| --- | --- | --- |
| `/jobs` | Everyone, signed in | Search box, category tabs, filter panel and sort (section 6.1). Tabs **Open jobs** / **My applications** (and **My listings** for non-Vietnam view). Card: title, summary, category and up to 3 skill chips, applicant count, total (USDC; ≈ VND estimate in the Vietnam view), milestone count, "Apply by" countdown, chip **Budget locked** linking the job vault on Explorer, business @username |
| `/jobs/:job` | Everyone | Public brief with "Brief verified" (hash check) or a warning; milestone template ("Due 3 days after you're selected"); deadlines; Apply form with the pitch and the line "Public on Solana. Don't put names or personal details here."; my status |
| `/jobs/new` | Non-Vietnam view only | One page, three short sections (section 6.2). Reuse the `NewContract` editor without the freelancer field; add category, skills, summary, work days per milestone, "Apply by", "Select by". Last step **Lock budget & publish** (one wallet confirmation for `post_job`, then the brief parts) |
| `/jobs/:job/applicants` | The business | Applicants: @username, pitch, applied time, a short track record (contracts settled as freelancer, from `listFunds`). **Select** → confirmation sheet → `runSelectJob`; then a link to the new contract |
| — | The business | On `/jobs` My listings: state chip (Open / Selected / Filled / Withdrawn) and **Withdraw budget** when `canWithdraw` |

### 6.1 Search and filter (no off-chain data)

Every value a freelancer searches or filters on is stored **in the listing account**, so one `getProgramAccounts` call returns everything the board needs. No server, no database, no search index.

| Control | Where it runs | Source field |
| --- | --- | --- |
| Category tabs: All · Design · Development · Writing & Translation · Marketing · Video & Animation · Data & AI · Admin & Support · Other | RPC (memcmp at offset 42) | `category` |
| Search box ("Search jobs") | Browser | `title` + `summary`, case- and accent-insensitive |
| Skills (multi-select chips within the category) | Browser | `skills` bitmask, "any of the selected" |
| Budget (min–max, in USDC; the Vietnam view shows the ≈ VND range) | Browser | `total` |
| Duration ("Up to 1 week / 2 weeks / 1 month") | Browser | longest `work_secs` |
| Milestones (1 / 2–3 / 4–5) | Browser | `milestone_count` |
| "Apply by within 24 h" | Browser | `apply_by` |
| "Hide jobs I applied to" | Browser + RPC (my applications, memcmp at 41) | `JobApplication` |
| Sort: Newest · Apply by soonest · Budget high to low | Browser | `created_at`, `apply_by`, `total` |

- **The URL holds the filters** (`/jobs?q=logo&cat=design&skills=figma,branding&min=10&max=100&sort=new`): shareable, bookmarkable, and nothing is saved anywhere.
- Results update as the user types (debounce 150 ms); the list refreshes from the chain every 30 s and on focus.
- Empty result: "No open jobs match these filters." with **Clear filters**.
- Scale: loading every open listing into the browser works for hundreds to about two thousand listings \[Inference\]; past that, an indexer reads the same accounts (roadmap phase 3), and the board code keeps the same filters.

**Taxonomy (`@ned/core` `jobs/taxonomy.ts`)**: 8 categories (indices 0–7, as listed above) and about 40 skills to start, grouped by category (for example Design: Logo & brand, UI/UX, Illustration, Figma; Development: Web front end, Back end, Mobile, Solana programs; Writing & Translation: English ↔ Vietnamese, Copywriting, Technical writing). Append only.

### 6.2 Keep it simple

| Who | Steps | Rules |
| --- | --- | --- |
| Business: post | **1 page, 3 sections**, one wallet confirmation: **About the job** (title, category, skills, summary with a 160-byte counter) → **Work** (milestones: name, amount, "Due N days after you select someone", review days, done-when points) → **Timing** (Apply by and Select by, with presets 3 / 7 / 14 days). A sticky bar shows "Lock 10 USDC & publish" | The amount on the button is the amount that leaves the wallet. Under the summary: "Public on Solana. Don't put names or personal details here." |
| Freelancer: find and apply | **Board → job → Apply**: 2 clicks and one wallet confirmation | The Apply box stays on the job page (no new page); after applying, the card shows **Applied** |
| Business: hire | **Applicants → Select → confirm** | The confirmation states the contract that will be created and "The budget moves into the contract when they accept" |
| Both | Status always in one chip: Open · Applied · Selected · Hired · Closed | Wallet confirmations only where money or a record changes |

Add **Jobs** to `WorkspaceNav`. Motion and surfaces as in the rest of the Workspace (no borders, shadow S1, tokens from `motion.ts`). The selected freelancer sees the contract in **Contracts** and in the wallet panel, as for any invite.

Mobile (`ned-wallet`): no new screens. Optional, if time is left: a "Find funded jobs" row on Home that opens `https://unihackfest-2026.vercel.app/jobs`.

## 7. Demo addition (about 60 seconds, before the existing demo)

Faucet limit: 20 devnet USDC per address every 2 hours \[Verified in 08-research\]. Use a job of 2 × 5 USDC, and fund Mia's address in the morning.

1. Mia (Workspace) posts "Logo refresh", 2 milestones × 5 USDC → **Lock budget & publish** → the card shows **Budget locked**; open Explorer: the job vault is owned by the program.
2. Vinh (second browser, Vietnam view) opens **Jobs**, reads the verified brief, applies.
3. Mia opens **Applicants** → selects @vinh.
4. Vinh (mobile web app) opens the new contract → **Accept** with "VND to my bank account" → the contract is **Funded** at once.
5. Continue with the existing demo (submit → approve → release).

## 8. Schedule for today, owners and cut line

> **Superseded on 6 Oct** by [`build-order-6oct.md`](build-order-6oct.md): every change ships today in gated steps, without clock times. The table below is kept for reference.

| Time | Dev A (program + core) | Dev B (Workspace) | PO / CL / Design |
| --- | --- | --- | --- |
| 07:30 | Read this plan | Read this plan | PO confirms D25; rotate keys S1–S3 (compliance review decision 7) |
| 08:00–11:30 | **J1** program + tests | **J3** board, detail, apply against mocked `@ned/core` types | Design: 3 job screens on the canvas; CL: Terms/Q&A lines (section 9) |
| 11:30–12:00 | **J1** devnet upgrade (PO approves) | **J3** continue | — |
| 12:00–14:00 | **J2** `@ned/core` jobs | **J4** post a job, my listings, withdraw | — |
| 14:00–16:00 | **J5** select (core `runCreate` extra ix, `runAccept` lock) | **J5** applicants screen and select sheet | — |
| 16:00–18:00 | **J6** end-to-end on devnet with two logins; Records check | **J6** same | PO runs section 7 twice |
| 18:00–19:00 | Deploy Vercel and `gh-pages` | Fixes | Screenshots for the README and the deck |

**Cut lines**

- **12:30:** program tests not green, or the upgrade not done → stop program work; keep `FEATURES.jobs = false`; pitch Funded Jobs as a roadmap slide with the canvas screens. The rest of today's work is not merged.
- **18:00:** section 7 does not pass twice in a row → `FEATURES.jobs = false` in the deployed build.
- Tomorrow's compliance P0 work (compliance review section 6) does not move. Funded Jobs never takes time from V1, C1–C5 or P1–P3.

## 9. Documents to update today

| Document | Change | Owner |
| --- | --- | --- |
| `README.md` (this folder) | D25 (done in this PR) | PO |
| `program-spec.md` | Section "v1.3 Funded Jobs" from section 4 | Dev A, in J1 |
| `docs/05-legal/compliance-fix-list.md` Terms draft | Replace "not … a marketplace" with: "N.E.D shows job listings that businesses post with a budget locked in the program. N.E.D does not choose, vet or employ anyone and is not a party to the work." | CL |
| `docs/05-legal/qa-cheatsheet.md` | New answer: "Is this a job marketplace?" → "Businesses post jobs with the budget already locked. We don't match, vet or employ anyone, and we take no fee. It runs on devnet with test tokens." | CL |
| `docs/05-legal/compliance-fix-list-review.md` A6 | Marked superseded by D25 (done in this PR) | PO |
| `docs/tong-hop-tien-do.md` | One row per task J1–J6 | Each dev |
| Canvas | Boards WebJobs, WebJobDetail, WebJobApplicants | Design |

Legal status: not reviewed. Law 74/2025 and Decree 352/2025 (employment services) and the e-commerce platform rules may apply to a public job board \[Unverified\]. The PO accepted this for the devnet demo on 6 Oct; it goes to the expert-check pack as a new question.

## 10. Prompts (Claude Code)

Each prompt follows `build-plan.md` section 10 (rules for every task). Paste one prompt per session.

### J1 · Program v1.3 Funded Jobs (Dev A)

```
Read CLAUDE.md, docs/09-milestone-lock/funded-jobs-plan.md (all), build-plan.md section 10, and
ned_program/programs/ned-program/src (lib.rs, state/shared_fund.rs, instructions/milestone/{create_fund,accept,lock,post_note,common,close}.rs,
constants.rs, errors.rs, events.rs) and tests/milestone.rs.

Task: add Funded Jobs to ned_program exactly as funded-jobs-plan.md section 4 says.
- New files only: state/job.rs, instructions/job/*.rs; register them in mod.rs files and lib.rs (new section "4. FUNDED JOBS").
- Do not change any existing instruction, account, error number or event. Append errors and events at the end.
- post_job takes title, summary, category and skills as in section 4.3. Account sizes 576 and 364 with compile-time asserts; offsets as in section 4.2 (write a test that checks them).
- select_job and lock_from_job must work inside the same transaction as create_fund / accept.
- Reuse common.rs helpers (used, check_work_window). Never use vault.amount for transfers.
- Tests: tests/jobs.rs with every case of section 4.5; run the whole suite.
- Add a section "v1.3 Funded Jobs" to docs/09-milestone-lock/program-spec.md (accounts, offsets, instructions, errors).
- Copy the new IDL to packages/ned-core/src/idl/ (json and ts).
Branch: feat/jobs-program. Do not deploy: when tests pass, print the build size and the exact upgrade commands for the PO.
Done when: cargo test passes (old and new), program-spec updated, IDL copied, progress row added.
```

### J2 · `@ned/core` jobs module (Dev A)

```
Read CLAUDE.md, funded-jobs-plan.md sections 4–5, packages/ned-core/src/{actions.ts,milestone/client.ts,milestone/notes.ts,
milestone/queries.ts,milestone/content.ts,milestone/decode.ts,milestone/layout.ts,milestone/pda.ts,milestone/records.ts}.

Task: add packages/ned-core/src/jobs/ (layout, pda, decode, queries, brief, actions, rules, taxonomy, search) as in section 5 and 6.1, exported from index.ts.
- search.ts is pure and fully unit-tested (text, skills, budget, duration, milestones, apply-by, hide-applied, sorts, URL round trip).
- The job brief is plain text: canonicalBrief(title, draft) split into NOTE_MAX_LEN parts with post_job_brief; fetchJobBrief reads
  them back like fetchNotes (skip failed transactions, latest complete set wins) and checks the hash against the listing.
- runPostJob validates like rules.validateDraft (no freelancer field) and refuses in the Vietnam view (pass region in).
- Unit tests for decoders (fixed bytes), queries (mocked connection), rules, and brief round trip.
Do not change existing exports yet (that is J5).
Branch: feat/jobs-core (from feat/jobs-program). Done when: pnpm test and typecheck pass for ned-core, ned-wallet and ned-workspace.
```

### J3 · Workspace: board, job detail, apply (Dev B)

```
Read CLAUDE.md, funded-jobs-plan.md sections 2, 6 and 7, workspace-plan.md, build-plan.md section 10,
ned-workspace/src/{App.tsx,components/WorkspaceNav.tsx,pages/Contracts.tsx,pages/Contract.tsx,hooks/queries.ts,hooks/region.ts,motion.ts}.

Task: add FEATURES.jobs (default true in dev, read from config) and the routes /jobs and /jobs/:job.
- /jobs: search box, category tabs, filter panel (a sheet on narrow screens) and sort exactly as section 6.1; filters live in the URL
  query, nothing is stored. Tabs Open jobs / My applications / My listings (My listings hidden in the Vietnam view). Cards per section 6.
- /jobs/:job: public brief with "Brief verified" or a warning, milestone template, deadlines, Apply form (pitch ≤ 280 bytes, counter,
  the line "Public on Solana. Don't put names or personal details here."), my status.
- Until J2 lands, code against the jobs/ types from the plan with a local mock; switch to @ned/core when it is merged.
- Vietnam view: amounts as "≈ … VND (estimate)", never a USDC balance; Disclosures and DEVNET badge stay.
- Same surfaces and motion as the rest of the Workspace (no borders, shadow S1, motion.ts tokens). Words: product-spec section 6.
Branch: feat/jobs-web. Done when: typecheck, tests and build pass; screenshots of both views in the PR.
```

### J4 · Workspace: post a job, my listings, withdraw (Dev B)

```
Read funded-jobs-plan.md sections 4.3 and 6, ned-workspace/src/pages/NewContract.tsx and lib/newContract.ts.

Task: /jobs/new (non-Vietnam view only; redirect the Vietnam view to /jobs) as one page with the three sections of section 6.2,
reusing the NewContract editor without the freelancer field, plus category, skills, summary (160-byte counter), work days per
milestone, Apply by, Select by. Final step "Lock budget & publish" → runPostJob, with progress for the
brief parts and a retry for a failed brief part. My listings tab: state chips, applicant count, "Withdraw budget" when
rules.canWithdraw, with a confirmation sheet that states the amount going back.
Branch: feat/jobs-web. Done when: a job can be posted and withdrawn on devnet from the Workspace; tests and build pass.
```

### J5 · Select and accept (Dev A + Dev B)

```
Read funded-jobs-plan.md sections 3, 4.3 and 5, packages/ned-core/src/actions.ts (runCreate, runAccept, runShareKey).

Core (Dev A):
- runCreate: optional extraInstructions appended after create_fund; keep the 1232-byte limit check.
- runSelectJob as in section 5 (absolute deadlines from the chain time, brief from fetchJobBrief, must be 'ok').
- runAccept: append lock_from_job when jobForFund(fund) returns a Selected listing for this fund.
- runSelectJob on a re-select: prepend close(previous fund) in the same transaction (check the 1232-byte limit; if it does not fit, send close first).
- runLockFromJob(env, fund): lock_from_job alone, for a job contract that is Accepted but not Funded.
- records/history: lock_from_job counts as the lock step.
- Tests for all three.
Workspace (Dev B):
- /jobs/:job/applicants: list, track record (settled contracts as freelancer), Select → sheet → runSelectJob → link to the contract.
- Contract page (Workspace) and the shared contract view: for a job contract, hide Lock; show "Move locked budget" (runLockFromJob) when Accepted and the listing is Selected.
Mobile: no screen change; rebuild and check that accepting a job contract on the web build of ned-wallet shows Funded at once.
Branch: feat/jobs-select. Done when: section 7 steps 1–4 pass on devnet with two real logins.
```

### J6 · End-to-end, deploy, docs (Dev A + Dev B)

```
Run funded-jobs-plan.md section 7 twice on devnet with two logins (one Vietnam view). Check Records on both sides, the Explorer
links, and that withdraw works on a second job with no applicants. Fix only what blocks the demo.
Then merge feat/jobs-* to main (fast-forward or PR), deploy the Workspace (Vercel) and ned-wallet (gh-pages) after the PO says go.
Update docs/tong-hop-tien-do.md (rows J1–J6, open issues). If section 7 fails at 18:00, set FEATURES.jobs = false and deploy that.
```

## 11. Limits

- Applications and pitches are public on-chain; a private (encrypted) pitch is roadmap.
- No search index: `getProgramAccounts` is fine for tens of listings, not thousands (an indexer is phase 3 of the roadmap).
- No moderation tools beyond withdraw; a report button is roadmap.
- Track record is a count of settled contracts, not a rating.
- Applicants pay a small rent for their application account (devnet SOL); closing applications is roadmap.
- Time estimates in section 8 are \[Assumption\] and depend on two developers working in parallel.
