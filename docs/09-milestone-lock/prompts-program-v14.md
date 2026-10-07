# Program v1.4 to the finish line: Claude Code prompts V0–V8 (D29 lock at hire + G1)

**Owner:** PO (Hồ Du Tuấn Đạt) · **Written:** 7 Oct 2026 · **Base:** `main` at `1b85d94` + `ned-v14-spec.patch` · **Plan:** [`lock-at-hire-plan.md`](lock-at-hire-plan.md) · **Spec:** [`program-spec.md`](program-spec.md) §11
**Cut line:** v1.4 green on devnet by **8 Oct 18:00**; otherwise V8 (rollback). **Freeze:** 9 Oct. **Final:** 10 Oct.

## How to run

- One **new** Claude Code session per prompt, in the repo, in order V0 → V7. V8 only if a step fails and cannot be fixed before the cut line.
- Every prompt follows section 0 of [`prompts-6oct.md`](prompts-6oct.md): work on `main`, `git pull --ff-only origin main` first, no secrets, tests before each push, a progress row in `docs/tong-hop-tien-do.md`.
- **Stop rule:** when a prompt says STOP, the session reports and waits. The next prompt runs only after the PO reads the report.
- **Before V1:** the draft patch must be reachable from the repo. In WSL: `/mnt/c/Users/tdat1/github/ned-v14-program-draft.patch`. Copy it to the repo root if the session cannot read outside the repo.
- **CL review (Chính, `c5fff71`):** `docs/05-legal/pre-pitch-check-7oct.md` §9 approves D29. Its points R-1 to R-8 are built into V1–V6. Its ready copy (§9.3) is used word for word in V6, and its pitch lines (§9.4) in V7.
- These prompts replace L1–L4 of `lock-at-hire-plan.md`:

| Prompt | Replaces |
| --- | --- |
| V1, V2 | L1 |
| V3, V4 | L2 |
| V5, V6 | L3 |
| V7 | L4 |

| Prompt | What | Who must be there | Time [Inference] |
| --- | --- | --- | --- |
| V0 | Pre-flight: toolchain, baseline, v1.3 backup | Dev | 15 min |
| V1 | Apply the draft, build, test, fix | Dev | 1–2 h |
| V2 | Review the diff against the spec, CU, numbers | Dev | 30 min |
| V3 | Devnet upgrade (PO says "go") | Dev + PO | 30 min |
| V4 | IDL on-chain + smoke Runs 1–4 | Dev | 45 min |
| V5 | `@ned/core` v1.4 | Dev | 1–1.5 h |
| V6 | N.E.D Jobs and `/new` UI | Dev | 1.5–2 h |
| V7 | Docs, copy for CL, pitch numbers, final check | Dev + CL | 45 min |
| V8 | Rollback (only if needed) | Dev + PO | 30 min |

---

## V0 · Pre-flight: toolchain, baseline, v1.3 backup

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main: git switch main && git pull --ff-only origin main).
Read: CLAUDE.md, docs/09-milestone-lock/prompts-program-v14.md, lock-at-hire-plan.md (sections 1, 2, 7),
program-spec.md section 11.
Task (no code changes):
1. Record the tool versions in the report:
   - rustc (rust-toolchain.toml pins 1.89.0);
   - cargo build-sbf / solana --version;
   - anchor --version (Cargo.toml uses anchor-lang 1.1.2);
   - node; pnpm.
   If anchor or solana is missing or the wrong version, STOP and list what to install.
2. Baseline on main before any change:
   - cd ned_program && anchor build && cargo test --manifest-path programs/ned-program/Cargo.toml;
   - pnpm install && pnpm -r test (or the per-package test scripts).
   Record the pass counts (expected: program 54 tests; core, wallet and Workspace counts from the last progress row).
3. Back up v1.3:
   - copy ned_program/target/deploy/ned_program.so to ned_program/target/rollback/ned_program-v1.3.so;
   - record its SHA-256 and size;
   - compare it with the deployed program: solana program dump 8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh
     /tmp/devnet.so --url devnet, then sha256 of both (trim trailing zero padding of the dump as the S2 smoke row did,
     or use `npm run jobs:smoke -- --check` in ned-wallet).
   If they differ, STOP: the rollback file would not be the deployed v1.3.
   Make sure target/ is gitignored, so the backup is never committed.
4. Copy the current IDL to ned_program/target/rollback/ned_program-v1.3.json (for V8).
Done when: the report lists versions, baseline counts, the backup path, SHA-256 and the "matches devnet" result; a
progress row "V0 pre-flight" is committed and pushed (docs only).
```

## V1 · Apply the draft, build, test, fix

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main).
Read: program-spec.md section 11 (the target), lock-at-hire-plan.md section 2 (P1–P7 and the test list), the draft
patch ned-v14-program-draft.patch (written in a session that could not build: it was never compiled),
ned_program/programs/ned-program/src/instructions/job/*, state/job.rs, errors.rs, events.rs, lib.rs, tests/jobs.rs,
tests/common/.
Task:
1. git am the draft patch (path in the "How to run" section). If it does not apply, apply it by hand, file by file.
2. anchor build. Fix every compile error. Typical spots:
   - CpiContext::new arguments in fund_job.rs (copy the style of post_job.rs);
   - the post_job_handler signature (the new lock_now argument) in lib.rs;
   - imports of the new events and errors;
   - the PostJobOpen / FundJob instruction structs in tests;
   - Instruction struct-update syntax in tests.
3. cargo test --manifest-path programs/ned-program/Cargo.toml -- --nocapture.
   - Every v1.3 test must pass **unchanged**. Do not edit a v1.3 test to make it pass; if one fails, the program is
     wrong.
   - The 7 v14_* tests must pass. You may fix a v14 test only where its own setup is wrong (for example balances),
     never by weakening the rule it checks.
4. Check by reading the code that:
   - unfunded == 0 keeps every v1.3 path byte for byte (post_job transfers; select, lock_from_job and withdraw as
     before);
   - errors and events were appended at the end (no renumbering);
   - JobListing::SPACE is still 576 (the const assert);
   - fund_job uses transfer_checked and the stored total, never the vault balance.
5. Commit in small conventional commits, the draft first and fixes after (feat(program): …, fix(program): …), then
   push.
Done when: anchor build passes; cargo test shows every test passing (expected 61 = 54 + 7); the .so size is recorded
next to 668,464 B; progress row "V1 program v1.4 built and tested" with the counts; pushed.
STOP if a v1.3 test fails and the cause is not clear within 30 minutes: report and wait.
```

## V2 · Review against the spec, compute units, numbers

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main).
Read: program-spec.md section 11, lock-at-hire-plan.md section 2, docs/05-legal/pre-pitch-check-7oct.md §3 G1 and §5
(compute units), the V1 commits.
Task:
1. Self-review the diff since 1b85d94 against program-spec.md §11, line by line. List any difference and fix either
   the code or the spec in the same commit.
   Also check:
   - fund_job cannot run on a Selected, Filled or Withdrawn listing;
   - select_job's new check comes after the state and select_by checks;
   - a re-select never funds twice;
   - withdraw on an unfunded listing returns a donation, if any, and still closes the vault;
   - G1: lock_from_job fails when fund.freelancer != job.selected even if every other field matches.
   Add a test for any case not covered.
2. Re-measure compute units on v1.4 (the g15 test and the cu() lines of tests/jobs.rs):
   - post_job, post_job_open;
   - fund_job + create_fund + select_job (one transaction);
   - accept + lock_from_job;
   - withdraw_job;
   - the milestone instructions.
   Update the CU table in docs/tong-hop-tien-do.md and program-spec.md, labelled "LiteSVM, v1.4, <date>".
   If any single instruction is above 40,000 CU, say so (the pitch says "dưới 20%" of 200,000).
3. Recount from the source: instructions (lib.rs pub fn), error variants, #[event] structs. Expected 29 / 55 / 26.
   Put the counted numbers in program-spec.md §11.3.
4. Transaction size (CL R-2): build the serialized fund_job + create_fund + select_job transaction in a test, with the
   compute-budget instructions the app adds and the longest title and 5 milestones. Assert it is ≤ 1,232 bytes and
   record the size. If it does not fit:
   - first try an address lookup table in the app;
   - otherwise send fund_job in its own transaction just before create_fund + select_job (select_job still refuses an
     unfunded listing, so the guarantee holds).
   Write the choice in program-spec.md §11.
5. Run clippy on the program (cargo clippy --manifest-path …); fix warnings in the new code only.
Done when: review notes, CU table and counts are committed; tests still all pass; pushed.
```

## V3 · Devnet upgrade (needs the PO's "go")

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main). Deploying is allowed in this prompt only after
the PO types "go" in this session. Never print or commit a keypair.
Read: lock-at-hire-plan.md sections 2 (P7) and 7, the S2 smoke row and the "Thông tin devnet" table in
docs/tong-hop-tien-do.md, the V0 and V1 progress rows.
Task:
1. Show the PO:
   - solana program show 8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh --url devnet (authority, data length, last slot);
   - the new .so size from V1;
   - whether `solana program extend` is needed, and the SOL it costs;
   - the deploy wallet's devnet SOL balance.
   STOP and wait for "go".
2. After "go":
   - extend if needed;
   - solana program deploy target/deploy/ned_program.so --program-id
     8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh --url devnet (using the wallet in Anchor.toml);
   - record the signature.
3. Check that the deployed binary equals the local build, as V0 did. If it differs, STOP.
4. Old listings: decode two v1.3 listings from devnet (for example the S2 smoke jobs) and confirm unfunded reads 0.
Done when: the upgrade signature, the program show output (after) and the binary check are in a progress row
"V3 devnet v1.4"; pushed.
If the deploy fails: STOP, report the error, do not retry more than twice. The PO decides between a fix and V8.
```

## V4 · IDL on-chain and the smoke runs

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main).
Read: docs/tong-hop-tien-do.md (IDL upload with program-metadata; the S2 smoke row), ned-wallet/scripts/jobs-smoke.ts,
lock-at-hire-plan.md section 2.
Task:
1. IDL:
   - copy target/idl/ned_program.json and target/types/ned_program.ts to packages/ned-core/src/idl/ and
     ned-wallet/idl/;
   - upload the IDL on-chain the way that worked before:
     npx @solana-program/program-metadata@0.5.1 (create-buffer → compare → update idl --buffer … --close-buffer);
   - fetch it back and diff it against target/idl.
2. jobs-smoke.ts: keep Run 1 (post → apply → select → accept + lock_from_job → submit → approve) and Run 2 (post →
   withdraw). Add:
   - Run 3, lock at hire: post_job_open (0.1 USDC) → apply → fund_job + create_fund + select_job (one tx) →
     accept (VND path) + lock_from_job → submit → approve to the demo payout partner;
   - Run 4: post_job_open → withdraw with nothing locked (0 back, vault closed).
   Use the throwaway keys in ned-wallet/.smoke-keys/ (gitignored) as before. The script never moves USDC from team or
   demo wallets. If SOL or USDC is short, it prints the addresses and stops: ask the PO to fund them (Circle faucet).
3. npm run jobs:smoke (and -- --check). Runs 1–4 must be green.
4. Update the "Thông tin devnet" table in docs/tong-hop-tien-do.md: v1.4, upgrade signature, data length, IDL
   account, smoke transaction links (Explorer, devnet).
Done when: Runs 1–4 green with Explorer links in the progress row "V4 smoke v1.4"; the IDL in core and wallet equals the
build; pushed.
```

## V5 · `@ned/core` v1.4

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main).
Read: lock-at-hire-plan.md section 3, program-spec.md section 11, packages/ned-core/src/jobs/{layout.ts,decode.ts,
queries.ts,actions.ts,rules.ts,events.ts,index.ts} and their tests, packages/ned-core/src/actions.ts (runCreate,
runAccept), the IDL from V4.
Task:
1. layout.ts: JOB_OFFSET_UNFUNDED = 544. decode.ts: `unfunded: boolean` on the decoded listing.
   - Decode test for a v1.3 listing (byte 0 → false) and an open one (1 → true).
2. queries.ts: an optional "funded only" memcmp (offset 544, byte 0). Default off.
3. events.ts: decode JobPostedOpen and JobFunded, for the bell and the history.
4. actions.ts:
   - runPostJob(env, draft, region, onBriefPart, { lockNow = true }) → post_job or post_job_open. The Vietnam view
     is still refused.
   - runSelectJob: when the listing is unfunded, put fund_job first in the same transaction (fund_job + create_fund +
     select_job; a re-select also closes the previous contract as today).
     - Before sending, check the business's USDC balance ≥ total, and return a clear error:
       "You need X USDC to lock this budget when you select."
   - runAccept is unchanged (accept + lock_from_job).
   - runWithdrawJob is unchanged (the program returns 0 for an unfunded listing).
5. rules.ts:
   - canFundJob;
   - "funded" helpers for the UI;
   - the select rule now also needs "funded or will fund in this transaction" (no UI path may send select_job alone
     for an unfunded listing).
6. FEATURES.lockAtHire: a core-level default `true`, overridable by each app.
Tests: every new branch above, including the transaction instruction order for funded vs unfunded select, the balance
error and the decode of both kinds. All existing core tests pass.
Done when: core tests and typecheck pass; ned-wallet and ned-workspace typecheck; progress row "V5 core v1.4"; pushed.
```

## V6 · N.E.D Jobs and `/new` UI

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main).
Read: lock-at-hire-plan.md sections 3 and 5, prompts-open-contract.md (N1–N3) with the D29 note,
ned-workspace/src/jobs/** (PostJob, Find, Overview, JobDetail, Applicants, components/JobCard), src/pages/NewContract.tsx,
src/config.ts, the hub v4 boards for chip styles, the V5 exports.
Task:
1. FEATURES.lockAtHire in ned-workspace/src/config.ts. It defaults to true; VITE_FEATURE_LOCK_AT_HIRE=false hides every
   v1.4 control and the app behaves as v1.3.
2. Post a job (/jobs/new) and, if N1–N3 are done, the open-contract part of /new:
   - a choice "When is the budget locked?":
     - **Lock when I hire** (default): "Nothing is locked now. When you select a freelancer, X USDC is locked in the
       same step.";
     - **Lock now**: "X USDC is locked now and shows as Budget locked.";
   - the button reads "Publish" or "Lock X USDC & publish";
   - the confirm sheet repeats the choice.
3. Job card, Job detail, Overview featured cards:
   - chip "Budget locked" (success colours) or "Locks when hired" (neutral);
   - the detail page adds "The budget is locked when the business selects someone, before you can accept.";
   - Apply stays available for both.
4. Find jobs:
   - a "Funded only" switch in the Filters sheet, kept in the URL (funded=1), default off, with a removable chip;
   - "Newest" sorts funded listings first within the same day.
5. Overview stats: "locked in open jobs" counts funded listings only; a small line "+N jobs that lock when hired".
6. Applicants → Select (unfunded listing):
   - the sheet title is "Select @x and lock X USDC";
   - it shows the balance after, the three bullets, and the balance error from V5;
   - after success: "Budget locked · waiting for @x to accept".
7. Notifications (bell):
   - business: "Budget locked for {job}" on JobFunded;
   - nothing new for the freelancer, who already gets "You were selected".
8. Vietnam view: cannot post (unchanged); sees the chips; ≈ VND only, no USDC or SOL.
Copy:
- Use docs/05-legal/pre-pitch-check-7oct.md §9.3 word for word: items 4–12 for the app, including the apply-sheet
  notice on unfunded listings (7), the JobCard labels (8), and the publish-sheet tick box for an open contract from
  /new (11). Items 1–3 (legal copy) are applied in V7.
- English, the word table ("lock", "release"; never "pay", "escrow", "safe", "guaranteed").
Tests:
- both posting modes call the right core action;
- the chips;
- the filter and its URL;
- the Select sheet text and the balance error;
- the flag off restores the v1.3 UI;
- Vietnam-view cases assert no /USDC|SOL/;
- every existing Workspace test still passes.
Done when: tests, typecheck, lint, build pass; screenshots desktop and 390 px of both posting modes, both chips, Funded
only, the Select sheet; progress row "V6 UI v1.4"; pushed.
```

## V7 · Docs, copy for CL, pitch numbers, final check

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main).
Read: lock-at-hire-plan.md section 6, README.md (D25, D29), funded-jobs-plan.md, system-tracker.md (1, 3.1, 4.2, 6B,
9, 12, 13), packages/ned-core/src/legal/copy.ts (Job posting rules, Disclosures), final-pitch.md (slides 4–7, Q&A),
docs/05-legal/qa-cheatsheet.md, docs/05-legal/pre-pitch-check-7oct.md (G1), README.md at the repo root.
Task:
1. Apply lock-at-hire-plan.md section 6 and docs/05-legal/pre-pitch-check-7oct.md §9.3 items 1–3 (Terms, Job posting
   rules, the new Disclosures line) and §9.4 (Vietnamese pitch and Q&A lines, qa-cheatsheet Q11, expert pack Q10,
   research status block). Apply §9.4 only after V4 is green. This includes:
   - tracker 3.1 lifecycle with post_job_open and fund_job;
   - tracker 4.2, both kinds;
   - tracker 6B C-8 spam and its mitigations;
   - a new invariant "the freelancer never accepts before the budget is locked (select_job requires it)";
   - build rows V0–V7 and Q9 closed.
2. Legal copy in copy.ts (Job posting rules: two kinds of listing; Disclosures: "Listings marked 'Locks when hired'
   have no locked budget until the business selects someone."):
   - update the copy tests in the same commit;
   - CL reviews before the push: post the commit in the team chat and wait for "ok".
3. Numbers everywhere they appear (pitch slide 5, program-spec, README, qa-cheatsheet):
   - 29 instructions, 55 errors, 26 events;
   - the V1 test count;
   - the V2 CU figures.
   Mark G1 "fixed in v1.4 (V1, V3)" in pre-pitch-check-7oct.md.
4. Final check on main:
   - cargo test, pnpm -r test, both web builds;
   - npm run jobs:smoke -- --check (binary = build, IDL = build);
   - record all results.
Done when: docs and copy updated with the CL ok noted; the final check results are in the progress row "V7 v1.4 done";
pushed. From here on only fixes and copy until the final (feature freeze).
```

## V8 · Rollback to v1.3 (only if V1–V4 cannot be green by 8 Oct 18:00)

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main). Deploying is allowed only after the PO types
"go" in this session.
Read: lock-at-hire-plan.md section 7, the V0 progress row (backup path and SHA-256).
Task:
1. If v1.4 is on devnet:
   a. List every listing with unfunded == 1 (memcmp offset 544). Withdraw each one while v1.4 is still deployed (v1.3
      withdraw would try to move the stored total from an empty vault). Use the business keys you have; list any you
      cannot withdraw for the PO.
   b. Show the PO the plan and STOP for "go".
   c. Redeploy target/rollback/ned_program-v1.3.so. Check that the binary on devnet equals the backup SHA-256.
   d. Re-upload the v1.3 IDL (target/rollback/ned_program-v1.3.json) with program-metadata.
2. In the code:
   - git revert the v1.4 program commits (not a force-push);
   - restore the v1.3 IDL in core and the wallet;
   - set VITE_FEATURE_LOCK_AT_HIRE=false in Vercel (or the core default to false).
3. Run the v1.3 smoke (Runs 1–2) and the test suites.
4. Docs:
   - D29 status "postponed after the final" in README.md and system-tracker.md;
   - pitch slide 4 keeps "budget locked at posting";
   - lock at hire goes on the roadmap slide.
Done when: devnet runs v1.3 (binary check), smoke Runs 1–2 green, the app shows v1.3 behaviour, docs updated; progress
row "V8 rollback"; pushed.
```

---

## Checklist for the PO

- [ ] V0: tool versions OK; the v1.3 backup SHA-256 matches devnet.
- [ ] V1: all tests pass (expected 61).
- [ ] V2: CU and counts updated.
- [ ] V3: "go" given; upgrade signature recorded; binary = build.
- [ ] V4: smoke Runs 1–4 green; IDL on-chain = build.
- [ ] V5–V6: app tests green; screenshots checked.
- [ ] V7: CL ok on copy; final check green.
- [ ] Rehearsal: the demo still uses the funded path. Lock at hire is shown with the Run 3 Explorer links (O6 in `pre-pitch-check-7oct.md`).
