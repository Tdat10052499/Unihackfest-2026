# New contract with an optional freelancer and a work tag: Claude Code prompts N1–N3

**Owner:** PO (Hồ Du Tuấn Đạt) · **Written:** 7 Oct 2026 · **Base:** `main` at `1e446ad` · **Builds on:** D25 (Funded Jobs), D28 (Jobs site)

> **Status 7 Oct (after V7): deferred until after the final (PO).** Feature freeze started with V7, so N1–N3 are **roadmap**, not built. Why: three prompts (3–4 h), a new public-brief path that needs CL's tick box (pre-pitch-check §9.3 item 11) and a Workspace redeploy, for a flow the demo does not need: open listings already work from `/jobs/new` with Lock now / Lock when I hire (v1.4). On stage, say open listings are posted from **/jobs/new**; "New contract can publish to N.E.D Jobs" is roadmap. Run N1–N3 unchanged after the final.

> **Update 7 Oct (evening), D29:** the PO decided to change the program so an open contract can lock **now** or **when the client hires** (program v1.4). Run L1–L4 of [`lock-at-hire-plan.md`](lock-at-hire-plan.md) first, then N1–N3 with the changes in its section 5. Decision 5 below becomes "locked at publish or at hire, always before the freelancer accepts".

## Why

On the Workspace "New contract" page (`/new`), the client must pick a freelancer first. `buildDraft` returns null and `validateForm` says "Choose the freelancer first." when the field is empty (`ned-workspace/src/lib/newContract.ts:71–85`). The PO wants:

1. The freelancer field to be **optional**.
2. A contract created **without a freelancer** to appear in the community hub's list (N.E.D Jobs).
3. A **tag** on every new contract, naming the kind of work it is.

## Decisions (PO, 7 Oct)

| # | Decision | Reason |
| --- | --- | --- |
| 1 | `/new` has one form. **Freelancer is optional.** | One place to start work |
| 2 | **Freelancer chosen → private contract** (`create_fund`, as today). It is **not** listed in the hub. | The brief is encrypted (I9). A listing would make the title and tag public. |
| 3 | **Freelancer left empty → open contract**, published as a Funded Job (`post_job`). It is listed in the hub with its tag, and freelancers apply. | The program already has this path (v1.3). **No program change before the freeze.** |
| 4 | **Every new contract has a tag:** one **field** (the 8 categories of `jobs/taxonomy.ts`, required) and up to **3 skills** (optional). | Same taxonomy as the hub filters |
| 5 | **Open contract = budget locked at publish.** Deadlines are "N days after selection" (not dates), and there is an apply-by and a select-by. | D25: funded first. The program needs these (`post_job`). |
| 6 | **Open contract = public brief.** The form says so before publishing and blocks nothing; the existing "Public on Solana" hints apply. | Job briefs are public (D25) |
| 7 | **Vietnam view** cannot create either kind (I10, unchanged). | — |

Where the tag is kept:
- **Open contract:** in the job listing (`category`, `skills`), so the hub filters by it.
- **Private contract:** in the encrypted brief (new optional `tag` field), so only the two parties see it. It is shown on the contract page and used to filter the Workspace list.

**Not changing:** program, `create_fund`, `post_job`, select and accept, D27 review, R/F rules (preview link, done-when, promised final files).

## How to run

One new Claude Code session per prompt, in order N1 → N3. Each follows section 0 of [`prompts-6oct.md`](prompts-6oct.md): work on `main`, pull first, tests before each push, no secrets, English UI, the word table, a progress row in `docs/tong-hop-tien-do.md`.

---

## N1 · Core: tag in the private brief, one draft for both kinds

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main: git switch main && git pull --ff-only origin main).
Read: docs/09-milestone-lock/prompts-open-contract.md (Why, Decisions), funded-jobs-plan.md sections 4–6,
packages/ned-core/src/milestone/content.ts (BriefDraft, validateBrief, canonical JSON), packages/ned-core/src/jobs/
{rules.ts,taxonomy.ts,actions.ts}, ned-workspace/src/lib/newContract.ts and their tests.
Task (packages/ned-core, plus the pure helpers in ned-workspace/src/lib/newContract.ts):
1. BriefDraft gets an optional `tag: { category: number; skills: number[] }`.
   - Canonical JSON includes `tag` only when present, so every existing brief keeps its JSON and its on-chain
     brief_hash (pin an old brief + its SHA-256 in a test).
   - Job briefs never carry `tag`: the listing already holds category and skills.
   - validateBrief: when `tag` is present, the category must be 0..7 and there can be at most 3 skills, all valid in
     taxonomy.ts.
2. ned-workspace/src/lib/newContract.ts:
   - The form gets `category: number | null`, `skills: number[]`, and the open-contract fields `applyBy`, `selectBy`,
     and per milestone `dueDays` (used only when there is no freelancer). Also a derived `kind: 'private' | 'open'`
     (freelancer chosen or not).
   - validateForm:
     - always: "Choose the field of work." when category is null;
     - private: as today, without "Choose the freelancer first." (an empty freelancer now means 'open');
     - open: the validateJobDraft rules (summary, apply-by ≤ select-by, due days ≥ the minimum work window, budget
       ≤ 1,000 USDC), plus the R1 done-when rule.
   - buildDraft returns { kind: 'private', draft: create_fund draft + brief with tag } or { kind: 'open',
     draft: JobDraft }.
     - Map milestone amount, review window and criteria. Use `dueDays * 86400` as workSecs.
     - Job summary: a new 160-byte "Short summary" field (open only).
   - Unit tests for both kinds and for switching between them (values the user typed are kept).
3. No new on-chain fields, no new instruction.
Done when: core and Workspace unit tests and typecheck pass; old briefs keep their hash; progress row; pushed.
```

## N2 · Workspace: one New contract form, optional freelancer, tag picker, publish to the hub

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main).
Read: prompts-open-contract.md, the N1 exports, ned-workspace/src/pages/NewContract.tsx (and its styles),
src/jobs/pages/PostJob.tsx (the existing job form: tag picker, summary, apply-by/select-by presets, lock and publish,
brief parts progress), src/jobs/components (Chip, pills), src/pages/{Contracts.tsx,Contract.tsx}, src/jobs/pages/
{Find.tsx,Overview.tsx}, the hub v4 boards for chip styles.
Task:
1. Freelancer field on /new:
   - Label "Freelancer (optional)".
   - Hint under the empty field: "Leave empty to publish an open contract on N.E.D Jobs. Freelancers apply and you
     choose one."
   - A small segmented status above the form reads "Private contract with @x" or "Open contract · listed on N.E.D
     Jobs", and changes as the field is filled or cleared.
2. Tag section ("What kind of work is this?"), for both kinds, placed after the title:
   - Field: the 8 category tiles or pills, one required, with the hub's category colours and icons.
   - Skills: up to 3 pills from that field's skills, optional.
   - Reuse PostJob's components; do not copy them.
3. Open contract only (freelancer empty), shown with the same motion tokens:
   - "Short summary for the job card" (160 bytes, counter).
   - Per milestone, "Due N days after you choose the freelancer" replaces the date picker.
   - Apply-by and select-by presets, as in PostJob, with the withdraw rule line.
   - The public-brief notice above the summary: "Open contracts are public on Solana: title, summary, brief,
     milestones and budget. Don't put names or personal details here."
   - The live preview on the right switches to the job card (as on /jobs/find).
4. Create button and confirm sheet:
   - Private: "Create contract" → runCreate (as today). Then the contract page, and the tag chip on that page.
   - Open: "Lock X USDC & publish" (purple) → runPostJob, with the brief parts progress and retry from PostJob. Then
     /jobs/:job with "Published on N.E.D Jobs" and the Explorer link.
   - The sheet says which kind it is and, for open, "The budget is locked now. You get it back if you withdraw (no
     applicants, or after the select-by date)."
5. Hub list: nothing new is needed for listing, since an open contract is a Funded Job. Check that it shows at once on
   /jobs/find (Open jobs, filtered by its tag), on /jobs Overview counts, and under "My listings" for the client.
6. /jobs/new (PostJob) stays as the hub's own entry. Its "Post a job" button may link to /new with the freelancer empty.
   Do not keep two diverging forms: the shared parts become components used by both.
7. Workspace contracts list (/contracts):
   - Show the tag chip for private contracts whose brief this device can read.
   - Add a "Field" filter (local, from readable briefs).
   - Open contracts the client posted show in a section "Open on N.E.D Jobs", linking to /jobs/:job and its
     applicants.
8. Vietnam view: /new keeps today's message; no change.
Copy: English only, the word table ("lock", "release"; never "pay", "escrow", "safe", "guaranteed").
Tests:
- the form creates a private contract with a freelancer, and publishes an open one without;
- switching keeps the typed values;
- the tag is required;
- open publishes call runPostJob with the mapped workSecs;
- the private brief JSON contains the tag;
- an open contract appears in Find jobs filtered by its field;
- the contracts list shows tag chips and the open section;
- existing NewContract and PostJob tests still pass.
Done when: tests, typecheck, lint and build pass; screenshots desktop and 390 px (private with tag, open with tag, the
confirm sheets, the published job in Find jobs, /contracts with the open section); progress row; pushed.
```

## N3 · Docs, copy review and an end-to-end check

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main).
Read: prompts-open-contract.md, README.md (decision log), funded-jobs-plan.md, system-tracker.md (3.1, 4.1, 4.2, 12),
product-spec.md section 6, final-pitch.md (demo), packages/ned-core/src/legal/copy.ts (Job posting rules).
Task:
1. Decision log: add D29 "New contract with an optional freelancer" (7 Oct, PO) with the Decisions table of
   prompts-open-contract.md.
   If D29 is already used (for example by the accountability layer, tracker Q1), take the next free number and say so
   in the report.
2. system-tracker.md:
   - 4.1 step 1: freelancer optional, tag required.
   - 4.2 step 1: an open contract from /new is the same as a job from /jobs/new.
   - New scenario rows:
     - "client publishes an open contract with personal data in the brief": public-brief notice;
     - "client leaves the freelancer empty by mistake": the status line and the confirm sheet name the kind.
   - Build tracker row for N1–N3.
3. funded-jobs-plan.md: note that /new is a second entry to post_job (no program change).
4. Job posting rules (legal/copy.ts), CL to review before the push: one line, "An open contract made from New contract
   is a job listing and follows these rules."
5. End-to-end on devnet (or the exact clicks for the PO):
   1. private contract with a tag;
   2. open contract with a tag;
   3. it shows on /jobs/find under its field;
   4. a second login applies;
   5. select, then accept in the wallet panel;
   6. the contract runs as in tracker 4.1 (submit with preview and promised files).
Done when: docs updated, the CL check noted, the e2e run or click list in the progress row with screenshots; pushed.
```

---

## Limits

- **Budget:** an open contract locks the whole budget at publish. A client who does not want that should name the freelancer.
- **Public content:** an open contract's title, summary, brief and budget are public for good (D25). The form says so before publishing.
- **Hub listing:** private contracts are never listed in the hub. Showing them (for example as "Hired") needs a public index or a program change, and would expose titles and tags (I9). This is roadmap, not before the freeze.
- **Tags on private contracts:** visible only on devices that can read the brief.
