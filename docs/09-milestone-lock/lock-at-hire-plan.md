# Lock at hire (D29): open contracts that freelancers apply to, program v1.4 · the last feature before the final

**Owner:** PO (Hồ Du Tuấn Đạt) · **Decided:** 7 Oct 2026 (evening) · **Base:** `main` at `8617b9e` · **Program:** v1.3 → **v1.4** · Not legal advice.

> **For the team (CL, Dev, Design):** this is the **last feature** of the system. After it, only fixes, copy and the pitch until the final on **10 Oct**. Cut line for v1.4 on devnet: **8 Oct 18:00**. If it is not green by then, the rollback in section 7 applies and the demo uses v1.3 behaviour.

## 1. Decision

A client can **post a contract without naming a freelancer**, and freelancers **apply** to it on N.E.D Jobs. The money is locked when the two sides agree, not when the contract is posted.

| Moment | Today (v1.3, D25) | With D29 (v1.4) |
| --- | --- | --- |
| Client posts | The whole budget is locked at once (`post_job`) | The client chooses: **Lock now** (as today) or **Lock when I hire** (nothing is locked yet) |
| Freelancers apply | They see "Budget locked" | They see **"Budget locked"** or **"Locks when hired"** on the card and the detail page |
| Client selects a freelancer | `create_fund + select_job` (one transaction) | For "Lock when I hire": **`fund_job + create_fund + select_job` in one transaction**. The budget moves from the client into the job vault at the moment of selection. |
| Freelancer accepts | `accept + lock_from_job`; the money moves into the contract | Unchanged. The freelancer **always** sees the budget locked before accepting. |

**The rule for freelancers stays the same: never accept, never start, until the budget is locked.** With D29 the program enforces this for both kinds of listing, because a listing cannot be selected (`select_job`) until its budget is in the job vault.

Also in v1.4: the **G1 fix** from `docs/05-legal/pre-pitch-check-7oct.md` §3. `lock_from_job` also checks `fund.freelancer == job.selected` and the brief hash, so only the selected applicant can be hired with the job's budget.

## 2. Program changes (v1.4)

All changes are backward compatible: every v1.3 listing and every v1.3 client keeps working.

| # | Change | Detail |
| --- | --- | --- |
| P1 | `JobListing.unfunded: u8` | Takes **1 byte from `_reserved`** (offset **544**, then `_reserved: [u8; 31]`). The size stays 576 bytes, so no realloc. **0 = budget locked** (every existing listing reads 0, so v1.3 listings stay funded), **1 = locks when hired**. |
| P2 | New instruction **`post_job_open`** | Same arguments and checks as `post_job`. It creates the listing and an **empty** job vault, sets `unfunded = 1`, and transfers nothing. It emits `JobPosted` with a new field `funded: false`, or a new event `JobPostedOpen`; Dev chooses, the IDL shows it. |
| P3 | New instruction **`fund_job`** | Signer: the business. Allowed only while `state == Open` and `unfunded == 1`. Transfers exactly `job.total` from the business ATA into the job vault (`transfer_checked`), sets `unfunded = 0`, emits `JobFunded { job, total }`. |
| P4 | `select_job` | Adds `require!(job.unfunded == 0, NedError::JobNotFunded)` (new error). The app sends `fund_job` just before `create_fund + select_job` in the same transaction. Its accounts are unchanged. |
| P5 | `withdraw_job` | When `unfunded == 1`: transfers nothing except a donation (if the vault holds any), closes the vault and the listing, and sends the rent to the business. The rules on when it is allowed are unchanged. |
| P6 | `lock_from_job` (G1) | Adds `require!(fund.freelancer == job.selected)` and `require!(fund.brief_hash == job.brief_hash)` (`NedError::JobFundMismatch`). |
| P7 | Program size | Check the new `.so` size against the program data account (668,464 B after the 6 Oct extend). If it does not fit: `solana program extend` (PO approves the SOL in the session). |

**Not changed:** `create_fund`, `accept`, `lock`, the milestone instructions, notes, device keys, D27 rules, the 1,000 USDC cap, the accept window.

**Tests (LiteSVM, new):**
- `post_job_open` moves no tokens and sets `unfunded = 1`.
- `fund_job`: only the business; only once; the exact total; refused when the listing is not Open.
- `select_job` on an unfunded listing fails without `fund_job` and passes with `fund_job + create_fund + select_job` in one transaction.
- Re-select after the accept window does not fund again.
- `withdraw_job` on an unfunded listing moves 0 and closes.
- A v1.3-style listing (`unfunded = 0`) behaves exactly as before.
- **G1:** a recreated contract at the same address for someone other than the selected applicant cannot `lock_from_job`.
- The layout test pins offset 544.
- Re-run the CU table (`g15`) on v1.4.

## 3. Core and app changes

- **Core (`packages/ned-core/src/jobs/`):**
  - decode `unfunded` (offset 544);
  - memcmp filter "Funded only" (`unfunded == 0`);
  - `runPostJob(…, { lockNow })` → `post_job` or `post_job_open`;
  - `runSelectJob` prepends `fund_job` when the listing is unfunded, checks the USDC balance first and shows a clear error;
  - IDL v1.4 copied to core and the wallet.
- **Hub (N.E.D Jobs):**
  - Card and detail page: chip **"Budget locked"** (green) or **"Locks when hired"** (neutral) with the hint "The budget is locked when the business selects someone, before you accept."
  - Find jobs: a **"Funded only"** switch in the Filters sheet, off by default, kept in the URL. Funded listings sort first in "Newest".
  - Overview stats: "locked" counts only funded listings.
- **New contract (`/new`, prompts N1–N3) and `/jobs/new`:** with the freelancer empty, a choice "**Lock now**" / "**Lock when I hire**", default "Lock when I hire", the PO's intent. The confirm sheet says which: "Nothing is locked now. When you select a freelancer, X USDC is locked in the same step."
- **Applicants → Select:** the sheet shows "Select @x and lock X USDC" and the balance after.
- **Vietnam view:** unchanged (cannot post; sees ≈ VND and both chips).

## 4. Order of work (Claude Code prompts)

Each prompt follows section 0 of [`prompts-6oct.md`](prompts-6oct.md): work on `main`, pull first, tests before each push. Run L1 → L4, then N1 → N3 from [`prompts-open-contract.md`](prompts-open-contract.md), with section 5 below applied.

### L1 · Program v1.4

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main).
Read: docs/09-milestone-lock/lock-at-hire-plan.md (sections 1, 2, 7), program-spec.md (v1.3 sections 10–11), funded-jobs-plan.md
section 4, docs/05-legal/pre-pitch-check-7oct.md §3 G1, ned_program/programs/ned-program/src/{state/job.rs,
instructions/job/*,errors.rs,events.rs,lib.rs} and tests/jobs.rs.
Task:
1. Implement P1–P6 of lock-at-hire-plan.md section 2, with the tests listed there. Keep v1.3 behaviour byte for byte
   for unfunded == 0.
2. Before any change, save the current v1.3 build:
   - copy target/deploy/ned_program.so to target/rollback/ned_program-v1.3.so (gitignored);
   - write its SHA-256 into the progress row.
3. anchor build; cargo test; record the new .so size against 668,464 B.
4. program-spec.md: a v1.4 section (layout byte 544, the two new instructions, the new error, the new event, G1, the
   tests, CU).
Do not deploy in this step.
Done when: all tests pass (old and new); the spec is updated; progress row with test counts and .so size; pushed.
```

### L2 · Devnet upgrade and smoke

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main). Deploying is allowed in this step only when the
PO says "go" in the session.
Read: lock-at-hire-plan.md sections 2 and 7, the S2 smoke row in docs/tong-hop-tien-do.md, ned-wallet/scripts/jobs-smoke.ts.
Task:
1. `solana program show 8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh --url devnet`: check the authority and the data
   size. If extend is needed, report the SOL cost and wait for the PO's go.
2. After the go, upgrade.
   - Check that the deployed binary equals the local build.
   - Re-upload the IDL with program-metadata, as on 6 Oct, then copy it to packages/ned-core/src/idl/ and
     ned-wallet/idl/.
3. jobs:smoke gets Run 3, an open listing:
   post_job_open → apply → fund_job + create_fund + select_job (one tx) → accept + lock_from_job → submit → approve.
   It also gets Run 4: post_job_open → withdraw with nothing locked.
   Runs 1–2 (v1.3 listings) must still pass.
4. Update the "Thông tin devnet" table in docs/tong-hop-tien-do.md (v1.4, authority, data size, IDL).
Done when: smoke Runs 1–4 green on devnet with transaction links in the progress row; pushed.
If anything fails and cannot be fixed by 8 Oct 18:00: run the rollback (section 7) and report.
```

### L3 · Core and N.E.D Jobs

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main).
Read: lock-at-hire-plan.md section 3, packages/ned-core/src/jobs/*, ned-workspace/src/jobs/* (Find, Overview, JobDetail,
Applicants, PostJob, components/JobCard), the F2 and R2 tests.
Task:
- Section 3 of the plan: decode, the filter, runPostJob lockNow, runSelectJob with fund_job and the balance check, the
  chips, "Funded only", the Select sheet and the PostJob choice.
- Everything behind FEATURES.lockAtHire (default true; VITE_FEATURE_LOCK_AT_HIRE=false hides the choice and posts
  as v1.3).
Tests:
- decode both kinds;
- the filter;
- the select transaction has fund_job first only when unfunded;
- the chips and the hint;
- the flag off restores v1.3 UI;
- the Vietnam view still has no USDC or SOL.
Done when: tests, typecheck, lint, build pass; screenshots of both chips, the Filters switch, the Select sheet,
PostJob with the choice; progress row; pushed.
```

### L4 · Docs and copy for CL

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main).
Read: lock-at-hire-plan.md section 6, README.md D25 and D29, funded-jobs-plan.md, system-tracker.md (3.1, 4.2, 6B, 12),
packages/ned-core/src/legal/copy.ts (Job posting rules, Disclosures), final-pitch.md, docs/05-legal/qa-cheatsheet.md.
Task:
- Apply section 6 of the plan to these documents.
- Legal copy changes go to the CL before the push (reply in the team chat with the commit).
Done when: the docs and copy are updated and the CL check is noted in the progress row; pushed.
```

## 5. Changes to prompts N1–N3 (open contract from `/new`)

- **N1 `buildDraft` (open kind):** returns `{ kind: 'open', draft: JobDraft, lockNow: boolean }`. Default `lockNow = false` when `FEATURES.lockAtHire` is on.
- **N2:**
  - The open-contract section gets the "Lock now / Lock when I hire" choice.
  - The button reads "Publish" (Lock when I hire) or "Lock X USDC & publish" (Lock now).
  - Decision 5 of prompts-open-contract.md becomes "budget locked at publish **or** at hire; always before the freelancer accepts".
- **N3:** D29 is this decision; do not create a second number for it.

## 6. What changes for the pitch, the legal copy and the tracker (CL)

| Where | Now | Change |
| --- | --- | --- |
| `final-pitch.md` Slide 4, problem 3 | "Budget khoá ngay khi đăng job" | "Budget luôn được khoá **trước khi** freelancer accept: khoá lúc đăng, hoặc khoá ngay lúc chọn người (`fund_job + create_fund + select_job` trong một transaction)" |
| `final-pitch.md` Q&A (new) | — | "Doanh nghiệp đăng job không có tiền thì sao?" → "Thẻ job ghi rõ 'Locks when hired'. Program không cho chọn người khi tiền chưa vào vault, nên freelancer không bao giờ accept một công việc chưa có tiền." |
| `copy.ts` Job posting rules | Budget locked at posting | Two kinds of listing; "Locks when hired" listings have no money until selection; N.E.D does not check that a business can lock |
| `copy.ts` Disclosures | — | "Listings marked 'Locks when hired' have no locked budget until the business selects someone." |
| Hub copy (Overview "Funded first…", chips) | "Funded first" | Keep "Funded first" only for the **contract** ("the budget is locked before work starts"), not for every listing |
| `system-tracker.md` | v1.3 | 3.1 lifecycle with `post_job_open` and `fund_job`; 4.2 both kinds; 6B C-8 (spam: listings that lock only at hire cost only rent; mitigations: chip, "Funded only" filter, the business record); I-rows: "the freelancer never accepts before the budget is locked" (enforced by `select_job`); 12 build rows L1–L4; 13 Q-row closed |
| `README.md` | D25 | D29 row (added in this commit); D25 marked "amended by D29" |
| `pre-pitch-check-7oct.md` | G1 open | G1 → fixed in v1.4 (P6) once L1–L2 are green |

## 7. Rollback (if v1.4 is not green by 8 Oct 18:00)

1. **Program:** redeploy `target/rollback/ned_program-v1.3.so` (the SHA-256 is in the L1 progress row) with the same upgrade authority. Then check binary = v1.3 and re-upload the IDL v1.3. v1.3 listings never used byte 544, so they are unaffected.
2. **App:** `VITE_FEATURE_LOCK_AT_HIRE=false` on Vercel. The choice disappears, posting works as v1.3, and the "Locks when hired" chip never shows.
3. **Pitch:** keep the v1.3 wording (budget locked at posting). Lock at hire goes on the roadmap slide.
4. **Unfunded listings left on devnet:** the business withdraws them (P5). If the program was rolled back first, v1.3 `withdraw_job` would try to move `total` from an empty vault and fail, so **withdraw every unfunded listing before rolling back**.

## 8. Risks

| Risk | Mitigation |
| --- | --- |
| Program upgrade one day before the freeze | Backward compatible; all old tests plus the new ones; smoke Runs 1–4; rollback above |
| Spam listings (only rent is spent) | Clear chip, "Funded only" filter, listings that lock at hire sort after funded ones; record of withdrawn listings is roadmap |
| A business cannot lock at selection (balance too low) | `runSelectJob` checks the balance first; the transaction is atomic, so nothing half happens |
| Demo time | Demo can keep the funded path; the open path is shown with smoke-run Explorer links (O6 in `pre-pitch-check-7oct.md`) |
