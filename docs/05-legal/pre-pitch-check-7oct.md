# Pre-pitch check and fix requests (7 Oct 2026)

**From:** Compliance Lead (Nguyễn Minh Chính, @F4ol4n) · **Checked against:** `main` at `09b1506`, re-based on `343faa6` · **Final:** **10 Oct 2026** (confirmed) · **Cut line:** 8 Oct 18:00 · **Freeze:** 9 Oct · Not legal advice.

**Team, please read sections 1 and 3–4 before you touch slides or code.** Every item has an owner and a date. Reply in the team chat with the commit when you close one, and I will tick it here.

---

## 1. Verdict

**The story, the program and the pitch agree. Every money invariant holds in the v1.3 code, and the spoken pitch has no banned words. What is not ready: some app text still promises an automatic release, the Vietnam view can show a dollar amount in one notification path, the legal copy has four gaps, and the demo has never run end to end with two accounts on production.**

**Final criteria (from the organisers, confirmed 7 Oct; the team is entered in both tracks):**

| Criterion | Points | What scores it for us |
| --- | ---: | --- |
| Technical Difficulty & Depth | 30 | Live demo + Slide 4: permissionless release and refund, destination fixed at accept, request changes never refunds, encrypted brief with device keys, Funded Jobs |
| Architecture & Smart Contract Quality | 25 | Slide 5: PDAs, invariant `released + refunded + unsettled = total`, 54 tests, 53 errors, 24 events |
| Solana Stack, Composability & Performance | 25 | Slide 6: Token Interface, Circle devnet USDC, Dynamic MPC, compute-unit table (re-measure on v1.3) |
| Build Evidence, Documentation & Reproducibility | 20 | Slide 7 + the repo itself: **README, LICENSE, commands that run for an outsider, deploy record, Explorer links** |

The last criterion is 20 points and judges open the repo first. The stale README is now the single biggest scoring risk (section 4, items O1–O3).

---

## 2. Fixed in this push (CL)

| File | What changed |
| --- | --- |
| `qa-cheatsheet.md` | Final date and criteria; fee "in v1"; Decree 52 as "our reading"; tax answer no longer assumes business income; "nothing is marketed to users in Vietnam" removed; job-board answer names Law 74/2025 and Law 122/2025; new Q12 (how we differ, no "first") and Q13 (who can take the money); Upwork 3–10% client fee; Stripe US vs non-US sender; blank survey row removed; law rows for Decree 340, 284, 330, 333, Law 122 |
| `../08-research/ned-research-and-compliance.md` | P14 applied for real: 7 Oct status block, request changes shipped, "Release now" instead of auto-release, who can read a contract, Contra and Upwork fees, 68% wording, final criteria in the rubric map, new "Vietnam: job board" law table, lawyer questions 7–9, corrections log |
| `../08-research/NED_Market_Analysis_Final.md` | Errata block; Contra fees (were reversed); program v1.3; Decree 284 "organisations"; Decree 52 as the team's reading; no "licensed partner" or "bảo đảm thanh toán" for N.E.D; Payoneer 71%; Escrow.com and Deel lines |
| `../09-milestone-lock/final-pitch.md` | Criteria heading; Slide 1 "theo cách nhóm đọc Nghị định 52"; "không bên nào đổi được"; "tiền đi tới payout partner cho B"; Slide 4 headline and speech (trimmed, adds the request-changes exception, no "không có backend"); Slide 6 "token SPL thật trên devnet, không có giá trị" and the 19.9% CU caveat; Slide 8 "v1 không thu phí" (trimmed); Q&A L1, L4, L5, P1, P2, P5, new P6; must-fix rows 12–13; word table; legal sources |
| `../09-milestone-lock/program-spec.md` | Rule 1.1 no longer says no upgrade key can move funds; test names use "release after review" |
| `../09-milestone-lock/product-spec.md` | Moving devices uses device keys first (D22), invite link as fallback |
| `../09-milestone-lock/system-tracker.md` | Launch work window "24 h [Assumption]" (was "vài giờ"); B-21 Hub v4 is on `main` |
| `cl-review-7oct.md`, `compliance-fix-list.md`, `compliance-fix-list-review.md`, `compliance-lead-tasks.md`, `expert-check-pack.vi.md` | Superseded items marked (disputes off, "not a marketplace", "only the two parties hold the key"); walkthrough uses request changes and Release now; final date confirmed; expert question 12 (public pitches); upgrade authority "before mainnet" |
| `CLAUDE.md`, `docs/README.md` | program-spec v1.3; decision log D1–D28 |

---

## 3. Requests for Dev (code and UI text)

Legal copy has one source: `packages/ned-core/src/legal/copy.ts`. Changing it breaks `legal/__tests__/copy.test.ts` where a string is asserted (for example the `[team email]` placeholder), so update the test in the same commit and run `pnpm test` before you push.

### High: before 8 Oct 18:00

| # | Where | Now | Change to |
| --- | --- | --- | --- |
| D1 | `ned-wallet/app/contracts/[fund]/submit.tsx:80`, `index.tsx:222, 273, 275`, `contracts/new.tsx:388`, `components/contracts/ui.tsx:92` | "Released automatically when the review time ends…" (6 places; D26 bans it, and it is wrong: someone has to press Release now, and a change request stops it) | "Released when {other} approves. If {other} does not review or request changes before the review deadline, anyone can release it (Release now)." Adjust per screen (client side: "You accept, or anyone can release it after the review deadline unless you request changes.") |
| D2 | `ned-wallet/stores/useNotificationStore.ts:101-142`, `ned-wallet/services/solana.ts:485, 506` | On-chain history sync runs for every region and prices SOL at $150 labelled `USDC`, so the test-SOL airdrop of the Vietnam fund step can show as "+$150.00" with "USDC"; `/notification-detail` is not in `VN_BLOCKED_ROUTES` (`services/regionGuard.ts:7`) | Skip the sync unless region is `intl`; add `/notification-detail` to `VN_BLOCKED_ROUTES`; remove the `* 150` SOL price everywhere. Breaks invariant I1 today |
| D3 | `copy.ts:29` (Privacy), `copy.ts:106`, `ned-workspace/src/pages/Submit.tsx:735` | "only the two parties hold the key", "Only you and {other} can read them" | "Briefs and deliveries are encrypted. N.E.D has no key; anyone holding the contract link can read them." |
| D4 | `copy.ts:193` (Disclosures "Public on-chain") | Says the brief is stored encrypted | Add: "Job titles, summaries, briefs and pitches on N.E.D Jobs are public plain text on Solana, permanently." (job briefs are posted in plain text: `packages/ned-core/src/jobs/brief.ts:1-4`) |
| D5 | `copy.ts:27` (Privacy, phone) | "only a hash goes on Solana. The number itself stays on your device." | Add: "The hash can be reversed by trying every Vietnamese number, so treat a linked number as public." |
| D6 | `copy.ts:202` `TEAM_EMAIL` | `'[team email]'` on the live `/jobs/legal` | A real team address (PO gives it by 8 Oct 12:00); update the core test |
| D7 | `ned-workspace/src/jobs/pages/Applicants.tsx:51` | "Only the business that posted this job can see its applicants" (false: applications are public on Solana) | "Only the business that posted this job can select here. Applications are public on Solana." |

### Medium: before 8 Oct 18:00 if possible

| # | Where | Change |
| --- | --- | --- |
| D8 | `ned-workspace/src/jobs/pages/Overview.tsx:60`, `JobDetail.tsx:410` | "…or anyone can release it once the review time ends (unless the client requested changes)." |
| D9 | `Overview.tsx:38-44` | Title "Work with the budget already locked"; sub "…Each milestone is released when the client accepts it, or anyone can release it after the review deadline." Vietnam sub adds "VND transfer simulated in this demo." No "you receive your earnings" promise |
| D10 | `ned-workspace/src/jobs/JobsLayout.tsx:41-48`, `copy.ts:66` | "and no N.E.D fee in this pilot"; "charges no fee in this pilot"; "N.E.D runs no database" instead of "N.E.D stores nothing" (hosting logs and on-device data exist) |
| D11 | Apply confirm note (`JobDetail.tsx` around the apply sheet) | "Your wallet, @username, pitch, and whether you were selected are public and permanent on Solana." |
| D12 | `ned-wallet/app/(onboarding)/consent.tsx:13-27`, `copy.ts:45` | Consent covers N.E.D Jobs (listings, applications, public pitch linked to the wallet), the residence choice, hosting logs (Vercel, GitHub), preview sites; "public **and** permanent"; then bump `CONSENT_VERSION` (CL decides with PO; both stage accounts must re-consent before the demo) |
| D13 | `ned-wallet/app/(onboarding)/welcome.tsx:78` | "By continuing you agree to the Terms. Read the Privacy notice; we ask for your consent next." (PDP Law: silence or continuing is not consent) |
| D14 | Privacy notice in `copy.ts:18-58` | Add: cross-border transfer (Dynamic, Helius, Vercel, GitHub in the US; Solana nodes worldwide); retention for off-chain logs and on-device data; rights to access, correct, delete, restrict, object and complain; "18+ only"; residence is self-declared; purpose of the phone number |
| D15 | Disclosures `copy.ts:185` | Partner line names the candidates: "Candidates: Due, Nium." Add a line: "Residence is self-declared; N.E.D does not check it." |
| D16 | `packages/ned-core/src/milestone/records.ts:322` | Drop the `amount_usdc` column when exporting from the Vietnam view |
| D17 | `ned-wallet/app/settings.tsx:59-62` | Confirm before switching residence: "Only turn this off if you live outside Vietnam." |

### Low: after the freeze is fine

- `ned-wallet/app/(onboarding)/setup.tsx:68, 138`: "Creating your wallet"; "Your key is managed by Dynamic (MPC). No recovery phrase to write down."
- `packages/ned-core/src/milestone/notices.ts:53`: "Milestone {n} released to payout partner".
- `JobDetail.tsx:37`: "Brief matches its fingerprint on Solana" (drop "verified").
- Region guards on `/contracts/[fund]/lock`, `/review`, `/close`; Vietnam check on Applicants Select.
- Vietnamese strings inside the English product: `solana.ts` transaction titles ("Nhận tiền", "Nạp tiền", "Phí mạng"…), `useNotificationStore.ts:106-139`, `anchorClient.ts:38, 42`.
- Delete unused locale keys with "payment", "deposit", "yield", "Free" in `ned-wallet/locales/en.json` and `vi.json`; keep Swap and xStocks flagged off.

### Program (no change needed before the final, but do not overclaim)

| # | Finding | Action |
| --- | --- | --- |
| G1 (Medium) | `lock_from_job` checks only `job.fund == fund`. A business can select applicant A, close that contract, recreate it at the same `fund_id` for someone else and lock the job budget into it (`instructions/job/lock_from_job.rs:20-24`). No third party loses money, but "only applicants are hired" is not enforced | Either add `require!(fund.freelancer == job.selected)` plus the brief-hash check and re-run the tests, or **do not say "only applicants can be hired"** on stage. Your call, Dev and PO; tell me which |
| G2 (Low) | `select_by` has no upper bound (`post_job.rs:31`); plain `lock` still works on a job contract (UI-only guard); `lock_from_job` fails if the business closed its USDC account; some tests assert only that an error happened | After the final |
| G3 | `VITE_PROGRAM_ID` can override the program ID (`ned-workspace/src/config.ts:27`) | Check it is empty or `8azx…X5Wh` in Vercel |

---

## 4. Requests for PO and Dev (pitch, demo, reproducibility)

| # | Item | Owner | By |
| --- | --- | --- | --- |
| O1 | **README rewrite** (still the old wallet README: "17 instructions", "24 tests", "708 bytes", "updated 3 Oct"). Needs: what Milestone Lock and N.E.D Jobs are, live links, program ID, v1.3 numbers (27 / 53 / 24 / 54), exact build and test commands, compute-unit table, limits and disclosures | PO + Dev | 8 Oct |
| O2 | **LICENSE** file (README claims MIT) or remove the claim | PO | 8 Oct |
| O3 | Reproducibility: pin the Anchor CLI version in `Anchor.toml` `[toolchain]`; `jobs:smoke --skip-binary-check`; re-upload IDL v1.3 before saying "IDL on-chain"; re-measure CU on v1.3; run `pnpm install && pnpm test` and `cargo test` on the final commit and record the result | Dev | 8 Oct |
| O4 | `solana program show 8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh --url devnet` on 9 Oct: confirm v1.3 and the upgrade authority; update the stale "Thông tin devnet" table in `tong-hop-tien-do.md` (still v1.1) | Dev | 9 Oct |
| O5 | Runbook gaps (`final-pitch.md` §3): each window ≥ 900 px wide or the phone gate appears (two laptops, or test the projector); decide how B opens contract A (copy the invite link, or wait about 8 s for key sync) and rehearse it; Person A needs **≥ 40 devnet USDC** because every rehearsal leaves M2 locked; both stage accounts re-consent (v2) and register a device key in the exact stage browser profile (max 5 per user) | PO | 9 Oct |
| O6 | Funded Jobs is claimed on Slide 4 but not shown live. Show it as evidence: Explorer links from a `jobs:smoke` run on a slide, or a 15 s clip in the backup video | PO | 9 Oct |
| O7 | R3 two-account test on production (`review-preview-e2e.md`) and the backup video (60–90 s) | PO | 9 Oct |
| O8 | Two timed rehearsals with the new Slide 4 and Slide 8 text | PO + presenters | 9 Oct |
| O9 | Rotate the leaked keys and check the Helius key still works from the Vercel origin | PO | now |

---

## 5. Numbers and words for the slides

- **Use only the numbers in `final-pitch.md` §7 and `qa-cheatsheet.md` "Numbers".** Say the year for 68% (PayPal, 2017, 4 countries, includes people considering freelancing).
- **Never on a slide:** "2 triệu freelancer", a TAM built from US$11.5 bn (that is company revenue), "first", "only", "an toàn", "đảm bảo", "escrow", "thanh toán" for USDC, "auto-release", "không ai di chuyển được tiền", "không có backend", "token thật", "không bao giờ thu phí", "đối tác được cấp phép".
- Another devnet project (Stillpaid) also releases on client silence. Expect "how are you different?" (answer P6).
- Compute units: the top figure is 39,781 of 200,000 (19.9%). If the v1.3 re-measure passes 40,000, change "dưới 20%" to "dưới 25%" or quote the top figure.

---

## 6. Legal position for N.E.D Jobs (new, 7 Oct)

- **Law on Employment 74/2025, Art. 27** (in force 1 Jan 2026): online employment-service business may only be done by an enterprise with an employment-service licence (Decree 352/2025). Whether a free board for freelance **service** contracts counts: [Unverified], expert question 10.
- **Law on E-commerce 122/2025 + Decree 248/2026** (in force 1 Jul 2026): an intermediary platform includes services; a foreign platform with a Vietnamese interface must register with MOIT. [Unverified] whether N.E.D Jobs is in scope.
- **Crypto:** no provider licensed under Resolution 05/2025 as of 6 Oct 2026; FATF's next plenary is 26–30 Oct, after the final.
- **On stage:** "N.E.D Jobs là nơi đăng việc; doanh nghiệp tự chọn người. N.E.D không chọn, không thẩm định, không tuyển ai và không phải một bên. Trước khi ra mắt thật, nhóm sẽ hỏi luật sư về giấy phép dịch vụ việc làm và đăng ký sàn thương mại điện tử." Sources in `../08-research/ned-research-and-compliance.md` ("Vietnam: job board").
- Organiser rules to respect: devnet and test wallets only; no exchange QR codes, referral or affiliate links; no investment-solicitation wording; a fabricated demo can disqualify, so always say **"payout partner mô phỏng"**.

---

## 7. Sign-off schedule

| When | What | Who |
| --- | --- | --- |
| 8 Oct 12:00 | Team email (D6) | PO |
| 8 Oct 18:00 | D1–D7 merged and deployed; G1 decision | Dev |
| 8 Oct | O1–O3 | PO + Dev |
| 9 Oct | CL reads every slide, the backup video, the live `/jobs/legal` and booth text against this file; walkthrough on the live app (`compliance-lead-tasks.md` Step 8) | CL |
| 9 Oct | O4–O8 | PO + Dev |
| 10 Oct | Final. Legal questions in Q&A come to CL | All |
