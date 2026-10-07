# Pre-pitch check and fix requests (7 Oct 2026)

**From:** Compliance Lead (Nguyễn Minh Chính, @F4ol4n) · **Checked against:** `main` at `09b1506`, re-based on `343faa6` · **Final:** **10 Oct 2026** (confirmed) · **Cut line:** 8 Oct 18:00 · **Freeze:** 9 Oct · Not legal advice.

> **Status, 7 Oct (evening), `main` at `1b85d94`: sections 3, 4 and 8 are still open (no code commit since `b7ca253`). New section 9 is the CL review of D29 (Lock at hire, program v1.4) with copy ready to paste for L1–L4 and N1–N3. Dev: section 8 (F-1 first), section 3, then section 9 alongside L1–L4.**

> **Update, 7 Oct (V7):** program v1.4 is live on devnet (V3 upgrade, V4 IDL on-chain and smoke Runs 1–4 green). Section 9.4 was applied after V4 was green, in `final-pitch.md`, `qa-cheatsheet.md`, `expert-check-pack.vi.md` and `ned-research-and-compliance.md`. G1 is **fixed in v1.4 (V1, V3)**.

**Team, please read sections 1 and 3–4 before you touch slides or code.** Every item has an owner and a date. Reply in the team chat with the commit when you close one, and I will tick it here.

---

## 1. Verdict

**The story, the program and the pitch agree. Every money invariant holds in the v1.3 code, and the spoken pitch has no banned words. What is not ready: some app text still promises an automatic release, the Vietnam view can show a dollar amount in one notification path, the legal copy has four gaps, and the demo has never run end to end with two accounts on production.**

**Final criteria (from the organisers, confirmed 7 Oct; the team is entered in both tracks):**

| Criterion | Points | What scores it for us |
| --- | ---: | --- |
| Technical Difficulty & Depth | 30 | Live demo + Slide 4: permissionless release and refund, destination fixed at accept, request changes never refunds, encrypted brief with device keys, Funded Jobs |
| Architecture & Smart Contract Quality | 25 | Slide 5: PDAs, invariant `released + refunded + unsettled = total`, 54 tests, 53 errors, 24 events (7 Oct, V7: v1.4 is 67 tests, 55 errors, 26 events) |
| Solana Stack, Composability & Performance | 25 | Slide 6: Token Interface, Circle devnet USDC, Dynamic MPC, compute-unit table (re-measure on v1.3; done on v1.4 in V2: top 49,173, "dưới 25%") |
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
| D3 | `copy.ts:29` (Privacy), `copy.ts:106`, `ned-workspace/src/pages/Submit.tsx:842` (was 735 before F2) | "only the two parties hold the key", "Only you and {other} can read them" | "Briefs and deliveries are encrypted. N.E.D has no key; anyone holding the contract link can read them." |
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
| G1 (Medium) · **fixed in v1.4 (V1, V3)**: `lock_from_job` now also requires `fund.freelancer == job.selected` and `fund.brief_hash == job.brief_hash` (`JobFundMismatch`) | `lock_from_job` checks only `job.fund == fund`. A business can select applicant A, close that contract, recreate it at the same `fund_id` for someone else and lock the job budget into it (`instructions/job/lock_from_job.rs:20-24`). No third party loses money, but "only applicants are hired" is not enforced | Either add `require!(fund.freelancer == job.selected)` plus the brief-hash check and re-run the tests, or **do not say "only applicants can be hired"** on stage. Your call, Dev and PO; tell me which |
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
- Compute units: ~~the top figure is 39,781 of 200,000 (19.9%). If the v1.3 re-measure passes 40,000, change "dưới 20%" to "dưới 25%" or quote the top figure.~~ **v1.4 (LiteSVM, 7 Oct, 10 runs):** the top single instruction is `post_job` at 49,173 of 200,000 (24.6%), so say **"dưới 25%"** (see 10.1 A-2).

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
| 8 Oct 18:00 | D1–D7 merged and deployed; G1 decision (done: fixed in v1.4, V1 and V3) | Dev |
| 8 Oct | O1–O3 | PO + Dev |
| 9 Oct | CL reads every slide, the backup video, the live `/jobs/legal` and booth text against this file; walkthrough on the live app (`compliance-lead-tasks.md` Step 8) | CL |
| 9 Oct | O4–O8 | PO + Dev |
| 10 Oct | Final. Legal questions in Q&A come to CL | All |

---

## 8. Re-check after F2 (7 Oct, later; `main` at `b7ca253`)

Checked again after the final-files commits F1–F2 (`7649cdb` … `0b808d1`) and the tracker update `1e446ad`. Code line numbers below are on `b7ca253` (unchanged in `1e446ad`).

### 8.1 Status of the requests above

| Item | Status | Evidence on `main` |
| --- | --- | --- |
| D1 "released automatically" (wallet, 6 places) | **Open** | `ned-wallet/app/contracts/[fund]/submit.tsx:80`, `index.tsx:222, 273, 275`, `contracts/new.tsx:388`, `components/contracts/ui.tsx:92` |
| D2 Vietnam-view notification leak | **Open** | `ned-wallet/services/solana.ts:485, 506` (`* 150`); `/notification-detail` not in `services/regionGuard.ts:7` |
| D3 "only the two parties / Only you and {other}" | **Open** | `copy.ts:29, 106`; `ned-workspace/src/pages/Submit.tsx:842` |
| D4 job content public · D5 phone hash · D15 partners and residence | **Open** | lines not added to `copy.ts` |
| D6 `[team email]` | **Open** | `copy.ts:202` |
| D7 Applicants privacy line | **Open** | `ned-workspace/src/jobs/pages/Applicants.tsx:51` |
| D8–D10 Jobs wording | **Open** | `JobDetail.tsx:410`, `Overview.tsx:38-44, 60`, `JobsLayout.tsx:41-48` |
| D13 welcome consent line | **Open** | `ned-wallet/app/(onboarding)/welcome.tsx:78` |
| D16 `amount_usdc` in Vietnam CSV | **Open** | `packages/ned-core/src/milestone/records.ts:325` |
| G1 `lock_from_job` applicant check | ~~Open, decision needed~~ **Fixed in v1.4 (V1, V3)**, 7 Oct | `lock_from_job` requires `fund.freelancer == job.selected` and the brief hash (`JobFundMismatch`) |
| O1 README · O2 LICENSE · O3 Anchor CLI pin | **Open** | `README.md:81, 85` ("Updated 3 Oct", "17 instructions"); no `LICENSE`; `Anchor.toml` `[toolchain]` empty |

### 8.2 New findings in F1–F2 (final files)

The new copy has no banned words and no Vietnamese text. No new screen shows USDC or SOL in the Vietnam view. D27 is unchanged: release, Release now and "request changes never refunds" behave as before. Problems:

| # | Severity | Where | Issue | Fix | Owner |
| --- | --- | --- | --- | --- | --- |
| F-1 | **High** | `ned-wallet/app/contracts/[fund]/submit.tsx:40-41`; rule `packages/ned-core/src/milestone/content.ts:239`; `actions.ts:387` | The phone app builds the delivery with `files: []` and no final files, and `validateDelivery` now requires a final-file list unless a link is a fixed version. **A Drive link cannot be submitted from the phone app** ("List the final files…"). Judges may try the phone (final-pitch §5 row 6) | Before the freeze: either a final-file picker on mobile, or a clear line on the mobile Submit screen "Submit from the Workspace on a computer to list your final files" (and keep the button disabled with that reason), or relax the rule for mobile. Add a test | Dev, 8 Oct 18:00 |
| F-2 | Medium | `ned-workspace/src/components/FinalFilesCard.tsx:196-198`; `packages/ned-core/src/milestone/content.ts` `compareHandover` | Chips "Same as promised / Missing / Extra" compare the fingerprints **the freelancer hashed** at hand-over with the promised list. Nothing checks what is behind the link, but the client will read it as a checked result | Heading "As listed by {name} at hand-over"; chip "Listed by {name}: same fingerprint"; line "This is {name}'s own list. Check your download below to compare the files you received." | Dev |
| F-3 | Medium | `FinalFilesCard.tsx:167-169` | "Handed over {time} · for Version n" in success green; it only means a link was posted | "Hand-over link shared {time} · for Version n", neutral colour | Dev |
| F-4 | Medium | `ned-workspace/src/lib/finalFiles.ts:72` | Bell "Final files received · milestone n" fires on any note after release, without reading it | "Final files shared · milestone n" | Dev |
| F-5 | Medium | `ned-workspace/src/pages/Review.tsx:455`; `ned-wallet/app/contracts/[fund]/review.tsx:164` | Card title "What you will receive after release" reads as a promise (and is wrong when the freelancer views it) | Client: "Final files {name} promises to hand over after release"; freelancer: "Final files you promised" | Dev |
| F-6 | Medium | `Submit.tsx:70` (hand-over link hint); Disclosures `copy.ts:191` | The hand-over link sits in a note that anyone with the contract link can decrypt; not disclosed | Hint: "Anyone with this link, or with the contract link, can download the files." Disclosures: "…the brief, the delivery **and the final-file links**…" | Dev + CL |
| F-7 | Medium | `copy.ts:116-118`; `packages/ned-core/src/milestone/links.ts:15` | A fixed-version link (Figma version, GitHub commit) makes the final-file list optional ("Your fixed version link is the final work"). That hands the final work over **before** release, against the soft rule "finals leave only after release" and the GUIDE | PO + CL decide: exempt fixed-version links only as preview, or say in the GUIDE "A fixed-version link given before release is treated as the final work" | PO + CL |
| F-8 | Low | `Submit.tsx:68` | "{client} sees only their names, sizes and fingerprints until the money is released" (implies automatic reveal; "only the client" is untrue) | "Keep these files. Before release, only their names, sizes and fingerprints are shared. You hand the files over after release." | Dev |
| F-9 | Low | `Submit.tsx:73` FILES_HINT | "we keep only a fingerprint so {name} can check they match" (Review no longer checks preview files; "we keep" overclaims) | "Fingerprints of the preview files, saved in the encrypted delivery. The files stay on your computer." | Dev |
| F-10 | Low | `Contract.tsx:632`; `finalFiles.ts:77`; `Contract.tsx:304` | "{other} shares the final files after release" stated as fact; bell "…are due"; freelancer sees "Late" without "reminder only" | "{other} can now hand over the final files; N.E.D cannot make them."; "Reminder: hand over the final files for milestone n"; add "The time is a reminder only" for the freelancer too | Dev |
| F-11 | Low | `copy.ts:42` | Privacy covers "Load preview" only; the new **Download** button also contacts the file host | "If you press Load preview or Download…" | CL + Dev |
| F-12 | Low | `FinalFilesCard.tsx:241`; `handover.ts:55` | RECEIPT_LINE "Built on the client's device" is also shown to the freelancer | "Built on this device" | Dev |
| F-13 | Low | `Contract.tsx:268-289` | CLOSE_WARNING with "You" reads "You has not handed over…" (latent) | Fix grammar | Dev |
| F-14 | Low | `ned-workspace/src/pages/__tests__/f2.test.tsx` | Every F2 test renders with `vn={false}` | Add Contract, Files and Review cases with `vn={true}` asserting no `/USDC\|SOL/` | Dev |

Never call either check "verified": the hand-over list is the freelancer's own; "Check your download" compares the client's downloaded files with the accepted version's list (accurate as written, `FinalFilesCard.tsx:23-27, 207`).

### 8.3 Demo and pitch impact

- **Submit step (1:30) now needs one more pick:** B must list at least one final file that differs from the preview, or Submit stays disabled (`Submit.tsx:601-631`). Put a small final file (for example `landing-final.png`) on B's laptop, use it for contract B prep too, and re-time the step. Added to `final-pitch.md` §5 row 13.
- **Review (1:45):** the new "will receive" card pushes **Accept & release** down by about 270 px at 960 px width. Rehearse the scroll at the 900 px demo width.
- **F3 docs** (PO with CL): `README.md:61`; `review-decision-plan.md:29, 96-97, 130-132, 147, 155, 157`; `system-tracker.md` was already updated in `1e446ad` (workflow, timers, notices, B-23); still missing there: a §10 data row (final-file links, receipt, notice store), the mobile Submit limit (F-1), and the notice text once F-4 and F-10 change (rows "Final files due", "Final files received"); `product-spec.md:26`; `copy.ts:118` and a Disclosures line "N.E.D cannot make anyone hand over final files"; `qa-cheatsheet.md` limits line; `final-pitch.md` §4 Q&A line. CL reviews the copy before the push.
- On stage say "so khớp fingerprint với danh sách đã hứa" and "nhắc nhở", never "xác minh file", "bắt buộc" or "đảm bảo".

### 8.4 Order of work for Dev (by 8 Oct 18:00)

1. F-1 (mobile Submit dead end).
2. D1, D2 (wording the judges will see; Vietnam-view leak).
3. D3, D6, D7, F-6 (privacy lines; real team email from PO by 12:00).
4. F-2 to F-5 (final-files wording).
5. ~~G1 decision with PO~~ (G1 fixed in v1.4, V1 and V3), then the Medium rows of section 3.

Reply in the team chat with the commit for each item; CL re-checks on 8 Oct evening and signs off on 9 Oct.

---

## 9. D29 Lock at hire (program v1.4): CL review and ready copy

Reviewed: `docs/09-milestone-lock/lock-at-hire-plan.md`, `prompts-open-contract.md`, the D25/D29 rows of the decision log and the tracker notice, against the v1.3 code and copy on `main` `1b85d94`. Not legal advice.

### 9.1 Verdict

**CL agrees with D29.** The freelancer's rule "never accept before the budget is locked" stays true and becomes a program rule (`select_job` refuses an unfunded listing), and the G1 fix (P6) closes the open item in section 3. Nothing in D29 changes the Vietnam path, D27, the fee position or the custody position: the budget still moves only by program rules, and N.E.D signs nothing.

What D29 does change is **what we may say about the board**. Today the app, the Terms and the pitch say every listing is funded. With v1.4 that is false for "Locks when hired" listings. Every line in 9.3 and 9.4 must change in the same release as v1.4 (and stay as it is if the rollback in plan §7 is used).

### 9.2 Points for L1–L3 (program and core)

| # | Point | Why | Suggested |
| --- | --- | --- | --- |
| R-1 | P2 event: prefer a **new `JobPostedOpen` event** over adding `funded` to `JobPosted` | Plan L1 asks to keep v1.3 "byte for byte" for funded listings; changing `JobPosted` changes its layout for every listing. No TypeScript code reads `JobPosted` today (checked), so either works, but the new event keeps the v1.3 log format unchanged | `JobPostedOpen { job, business, job_id, category, total, apply_by, select_by, brief_hash }` |
| R-2 | Size of the select transaction | `fund_job + create_fund + select_job` in one transaction adds the business ATA, job vault, mint and token program to an already large transaction (plus compute-budget instructions). Solana's limit is 1,232 bytes | Measure the serialized size in the L3 test and in smoke Run 3; if it is close, use an address lookup table or move `fund_job` into a separate transaction **only if** `select_job` still refuses unfunded listings (the guarantee stays) |
| R-3 | CU | The table on Slide 6 needs the new transaction | Add `fund_job + create_fund + select_job` and `post_job_open` to `g15`; quote the highest value |
| R-4 | Counts for the pitch | Slides 5 and 7 quote 27 instructions, 53 errors, 24 events, 54 tests | After L1, write the new counts (expected 29 instructions; errors +2: `JobNotFunded`, `JobFundMismatch`; events +1 or +2; tests) in the progress row so CL can update the slides from one place. **Correction (7 Oct, V7):** the new errors are `JobNotFunded` and `JobAlreadyFunded`; G1 reuses the existing `JobFundMismatch` (see 10.2). Final v1.4 counts: 29 instructions, 55 errors, 26 events, 67 tests |
| R-5 | G1 test | Plan lists it | Keep the exact attack: select A → close → recreate at the same `fund_id` for B → `accept + lock_from_job` fails with `JobFundMismatch` |
| R-6 | Applicants on unfunded listings | A freelancer's pitch, wallet and @username become public and permanent for a listing that may never be funded | Apply-sheet notice (9.3, item 7). No program change |
| R-7 | "Funded only" filter default | Plan: off by default | CL is fine with off, **if** the chip "Locks when hired" is on every unfunded card and on the detail page, and funded listings sort first (plan §3) |
| R-8 | Default choice in `/new` and `/jobs/new` | Plan: default "Lock when I hire" (PO's intent) | PO's call. CL note: the board's headline promise is "budget locked before you accept", which holds either way; only Overview and Find wording must change (9.3). If the default stays "Lock when I hire", Overview stats must count only funded listings as "locked" (plan §3 already says so) |

### 9.3 App and legal copy (English, ready to paste; L3, L4, N2)

Legal copy goes to CL before the push, as plan L4 says. These are the CL-approved texts:

1. **Terms, "What N.E.D is not"** (`packages/ned-core/src/legal/copy.ts:72`): replace "N.E.D shows job listings that businesses post with a budget locked in the program." with
   > "N.E.D shows job listings that businesses post. A listing's budget is locked in the program either when it is posted or when the business selects a freelancer, and always before the freelancer accepts."
2. **Job posting rules, first section** (`copy.ts:207-213`): title "Lock the whole budget to post" → **"Lock the budget now or when you hire"**; body:
   > "Choose Lock now to lock the whole budget when you post, or Lock when I hire to lock it when you select a freelancer. Either way the budget is in the program before the freelancer can accept, and it moves into the contract when they accept."
   > "Listings marked Locks when hired have no money locked until you select someone. N.E.D does not check that you can lock the budget; if you cannot, you cannot select."
   > "Posting is open to businesses outside Vietnam. The Vietnam view cannot post jobs or lock funds."
   > "With no applicants you can withdraw a listing at any time; nothing is returned for a listing that locks when you hire, because nothing was locked. Once someone has applied, a locked budget stays locked until the select-by date, and until the accept window of a selected applicant has passed."
3. **Disclosures, new line** (`copy.ts` `disclosureItems`, after `public`): `{ id: 'unfunded', title: 'Some listings lock only when they hire', body: 'Listings marked Locks when hired have no locked budget until the business selects someone. Your application and pitch are public even if the listing is never funded.' }`. The Disclosures count in `cl-review-7oct.md` P15 (13 lines) becomes 14.
4. **Overview** (`ned-workspace/src/jobs/pages/Overview.tsx:38-44`): title "Work that is already funded" → **"Work with the budget locked before you start"**; sub (international): "Every job here locks its full budget on Solana before you can accept: at posting, or when the business selects you. Each milestone is released when the client accepts it, or anyone can release it after the review deadline." Vietnam sub: same, ending "VND transfer simulated in this demo." (This also closes D9.)
5. **Overview, client card** (`Overview.tsx:49`): "Post a job with its whole budget locked, pick one applicant, …" → "Post a job, lock its budget now or when you hire, pick one applicant, and release each milestone after you accept the work."
6. **Find jobs heading** (`ned-workspace/src/jobs/pages/Find.tsx:170`, test `find.test.tsx:80`): "Find jobs, already funded" → **"Find jobs, locked before you accept"**. If the title must stay short: "Find jobs".
7. **Apply sheet** (`JobDetail.tsx`, apply confirm), on an unfunded listing: "This listing locks its budget only when the business selects someone. Your pitch, wallet and @username are public on Solana even if it is never funded."
8. **JobCard** (`ned-workspace/src/jobs/components/JobCard.tsx:132, 147, 168`): the aria-label and the chip follow the listing kind: "budget locked" / "locks when hired". Vietnam view: "Estimate · budget locked" / "Estimate · locks when hired" (no USDC or SOL).
9. **Chip hint** (plan §3): keep "The budget is locked when the business selects someone, before you accept." CL approves.
10. **PostJob and `/new` confirm sheet** (plan §3, N2): keep "Nothing is locked now. When you select a freelancer, X USDC is locked in the same step." Add for the international view only: "If your balance is too low at that moment, you cannot select."
11. **Open contract from `/new` (N2, privacy):** prompts-open-contract Decision 6 says the public-brief notice "blocks nothing". CL asks for **one confirm row** in the publish sheet, not a new screen: "Public on Solana forever: title, summary, brief and budget. I have removed personal data." with a tick box that enables **Publish**. Reason: leaving one field empty turns a private, encrypted brief into public content, and PDP Law 91/2025 does not treat silence as consent.
12. **Select sheet** (Applicants): "Select @x and lock X USDC" is fine. Keep USDC there (client view only; the Vietnam view cannot select).

### 9.4 Pitch, Q&A and docs (Vietnamese; CL applies after L1–L2 are green on devnet)

CL will apply these once smoke Runs 1–4 are green. If the rollback is used, none of them change.

- **Slide 4, problem 3** (`final-pitch.md:103`): "**Funded Jobs, nguyên tử.** *Ngân sách bị khoá ngay lúc đăng job · …*" → "**Job board, tiền khoá trước khi accept.** *Khoá lúc đăng, hoặc ngay lúc chọn người (`fund_job + create_fund + select_job` trong một transaction) · `accept + lock_from_job` cũng là một transaction*".
- **Slide 4 speech** (`final-pitch.md:106`), replace the "Ba: Funded Jobs: …" sentence with: "Ba: job board: ngân sách khoá lúc đăng, hoặc ngay lúc chọn người trong cùng một transaction; program không cho chọn người khi tiền chưa vào vault, nên freelancer không bao giờ accept việc chưa có tiền." (same length).
- **Slides 5–7:** instruction, error, event and test counts and the CU table from R-3/R-4.
- **Q&A, new (PO answers):** "Doanh nghiệp đăng job không có tiền thì sao?" → "Thẻ job ghi rõ 'Locks when hired'. Program không cho chọn người khi tiền chưa vào vault, nên freelancer không bao giờ accept một việc chưa có tiền." (as plan §6).
- **`qa-cheatsheet.md` Q11:** "businesses post jobs with the budget locked" → "businesses post jobs and lock the budget at posting or when they hire, always before the freelancer accepts".
- **`expert-check-pack.vi.md` Q10:** "kèm ngân sách đã khoá" → "ngân sách khoá lúc đăng hoặc lúc chọn người". Note for the expert: listings without money look more like an ordinary job board, so the Law 74/2025 Art. 27 question matters more, not less.
- **`ned-research-and-compliance.md`** 7 Oct status block: add v1.4 and D29.
- **Word use:** keep "Funded Jobs" only for listings with a locked budget; call the board "N.E.D Jobs". Never say "every job is funded".

### 9.5 Still open from sections 3 and 8

No code commit since `b7ca253`, so D1–D17, F-1 to F-14 and O1–O3 are unchanged. G1 moves into v1.4 (P6): CL will mark it fixed when L1–L2 are green.

**7 Oct (V7):** G1 is **fixed in v1.4 (V1, V3)**. V4 smoke Runs 1–4 are green, so section 9.4 has been applied.

---

## 10. PO sign-off and feedback (7 Oct, evening; `main` at `6ee564e`)

**From:** PO (Hồ Du Tuấn Đạt). **Status:** sections 1–9 are **accepted**. The pitch team can build the slides and the speaker script from `final-pitch.md`, with the changes below. The section 9.4 lines are applied after V3–V4 are green on devnet.

### 10.1 Already applied in this commit

| # | Change | Where |
| --- | --- | --- |
| A-1 | **New name and logo:** ~~"N.E.D · Network of Employment Deals"~~ → **"N.E.D · No Empty Deals"** (PO decision in §12). The product has two parts, **Milestone Lock** (contracts) and **N.E.D Jobs** (job board). Logo files: `assets/images/ned-logo.png` (square) and `ned-logo-banner.png` (wide). Slide 2 speech now starts "N.E.D, Network of Employment Deals. Với Milestone Lock, …" | `final-pitch.md` header and Slide 2 |
| A-2 | **Compute units re-measured on v1.4 (V2):** the Slide 6 table now shows LiteSVM ranges from 10 runs. "dưới 20%" became **"dưới 25%"**. The highest is `post_job` at 49,173 (24.6%). Values above 40,000 already existed in v1.3, so the old line was not true. This answers the question in §5, so the CL does not need to decide it. | `final-pitch.md` Slide 6, `README.md` |
| A-3 | **O1 README done** (`552c9da`) and refreshed with the V2 numbers: 67 tests, CU ranges, 789-byte select transaction. CL: please review the README copy; it is in your CODEOWNERS paths. | `README.md`, `final-pitch.md` §5 row 1 |

### 10.2 Corrections to section 9

- **R-4:** `JobFundMismatch` is **not** a new error; it exists since v1.3. The new errors are `JobNotFunded` and `JobAlreadyFunded`. Source count after V2: **29 instructions, 55 errors, 26 events, 67 tests**:
  - lib 1, helpers 4, identity 10, jobs 23, milestone 29;
  - the LiteSVM tests on the program are 62 (identity, jobs and milestone).
- **R-2:** measured. `fund_job + create_fund + select_job` with 5 milestones and two compute-budget instructions is **789 bytes** out of 1,232. One transaction, no lookup table.
- **§9.3 item 6:** "Find jobs, locked before you accept" reads as if the jobs were locked. Use **"Find jobs · budget locked before you accept"**, or just "Find jobs".
- **§9.3 item 11:** accepted. V6 adds a test that **Publish stays disabled until the box is ticked**.

### 10.3 Numbers on the slides: which set to use

| If, at 8 Oct 18:00, … | Slides 5–7 say | Slide 4 says |
| --- | --- | --- |
| V3–V4 are green (v1.4 on devnet, smoke Runs 1–4) | 29 instructions · 55 errors · 26 events · 67 tests (62 LiteSVM) | §9.4 line: locked at posting or at selection, always before accept |
| Not green (rollback V8) | 27 · 53 · 24 · 54 tests (49 LiteSVM) | v1.3 line: budget locked when the job is posted |

The CU table (A-2) is true for both sets: v1.4 adds at most about 80 CU.

### 10.4 Pitch and demo

1. **Funded path in the live demo:** keep it. Show lock at hire **as evidence, not live**: the Explorer links of smoke Run 3 on Slide 4, plus a 10–15 s clip in the backup video (O6). This adds no demo risk.
2. **Submit step (1:30):** keep the prepared final file on B's laptop (§8.3). Rehearse the Review scroll at 900 px.
3. **Track and criteria:** resolved by §1 (the organisers confirmed the four final criteria for both tracks), so no business-model slide is added.
4. **Words on stage:** say "so khớp fingerprint", "nhắc nhở", "khoá trước khi accept". Never say "xác minh file", "bắt buộc bàn giao", "mọi job đều có tiền".

### 10.5 Order of work for 8 Oct (PO decision)

| When | Work | Owner |
| --- | --- | --- |
| Morning | V3 (devnet upgrade: extend ≥ 14,576 B, PO "go") → V4 (IDL, smoke Runs 1–4) | Dev + PO |
| Between the V steps | F-1 (mobile Submit dead end), D2 (Vietnam-view "+$150 USDC"), D1 ("released automatically") | Dev |
| Before 12:00 | D6 team email; O2 LICENSE decision (MIT or no license; the README currently says "no license file yet") | PO |
| Afternoon | V5 → V6 (with the §9.3 copy) → V7 (legal copy with CL ok, §9.4 pitch lines, final check) | Dev + CL |
| By 18:00 | D3, D7, F-2 to F-6 in one wording commit | Dev |
| Evening | CL re-check; two timed rehearsals with the final numbers (O8) | CL + presenters |

Items not listed (other Medium and Low rows of §3, F-7 to F-14 except as above, G2) wait until after the freeze.

### 10.6 Sign-off

| Item | Decision |
| --- | --- |
| Sections 1–9 of this file | Accepted (PO, 7 Oct) |
| D29 lock at hire | Go, with the rollback V8 at 8 Oct 18:00 |
| Pitch content | Go: build slides from `final-pitch.md` + §10.3 |
| Final sign-off | CL on 9 Oct after the walkthrough on the live app (§7) |

---

## 11. CL reply to the PO sign-off: the product name and the README (7 Oct, evening; `main` at `b33940b`)

**To:** PO (Hồ Du Tuấn Đạt). **From:** CL. Thank you for the sign-off in section 10. CL accepts the corrections in 10.2 (R-4 error names and counts, R-2 measured at 789 bytes, the Find heading, the test for the confirm box) and the number sets in 10.3. One item needs a PO decision before the slides are designed: the name.

### 11.1 Decision needed: "Employment" in the product name

**Problem.** The new expansion "Network of Employment Deals" (README, `final-pitch.md` header and Slide 2 speech, both logo files) says the opposite of our legal position:

- The Terms say N.E.D "does not choose, vet or employ anyone and is not a party to the work" (`packages/ned-core/src/legal/copy.ts:72`).
- Our stage line for N.E.D Jobs is "nơi đăng việc; N.E.D không chọn, không thẩm định, không tuyển ai" (§6, `final-pitch.md` L4).
- Contracts are for **deliverables per milestone**, not employment. That is the line that keeps us away from disguised employment (Labour Code 2019 Art. 13(1)).
- Law 74/2025 Art. 27 says online **employment-service** business needs a licence. Whether N.E.D Jobs is in scope is our main open job-board question (expert question 10). A name that says "Employment" invites a judge or a lawyer to answer "yes" for us.

On stage, Slide 2 would open with "Network of Employment Deals" and Q&A L4 would then say "N.E.D không tuyển dụng ai". Judges will notice the contradiction.

**CL recommendation.** Keep the letters **N.E.D** and the logo mark; change only the words under it. Options, best first:

| Option | Why |
| --- | --- |
| **A. N.E.D · No Empty Deals** | Says the product's idea in three words: the money is locked before the work starts. No regulated word in it. Easy to say in a Vietnamese pitch: "N.E.D, No Empty Deals: tiền được khoá trước khi bắt đầu làm." Do not turn it into "every deal is funded": a private contract is accepted before the client locks, and a "Locks when hired" listing has no money until selection |
| B. N.E.D · Network of Earned Deliverables | Keeps "Network"; "deliverables" matches milestone contracts |
| C. N.E.D, with the line "Milestone Lock · N.E.D Jobs" under it | No expansion at all |

Avoid in any new name: employment, employ, hire/hiring as the main word, recruit, job agency, escrow, pay/payment, safe, guaranteed.

**What changes if the PO picks A, B or C** (no app code uses the name; checked with `grep`):

1. Both logo files (`assets/images/ned-logo.png`, `ned-logo-banner.png`): new text line under "N.E.D" (Design).
2. `README.md:3` (alt text) and `README.md:5` (title).
3. `final-pitch.md:1`, `:3` and Slide 2 speech (`:74`). For option A, Slide 2 speech: "N.E.D, No Empty Deals. Với Milestone Lock, người A khoá USDC cho từng milestone trước khi bắt đầu làm, …" (rest unchanged).
4. Section 10.1 A-1 of this file.

**If the PO keeps "Network of Employment Deals",** add this Q&A line (CL answers) to `final-pitch.md` §4 and `qa-cheatsheet.md`:

> **L6. Tên có chữ "Employment", vậy N.E.D có phải dịch vụ việc làm không?** "Không. 'Deals' ở đây là hợp đồng giao sản phẩm theo milestone giữa hai bên. N.E.D không tuyển dụng, không chọn người, không thẩm định và không phải một bên của hợp đồng. Trước khi ra mắt thật, nhóm sẽ hỏi luật sư về Luật Việc làm 74/2025." *(No. The "deals" are milestone contracts for deliverables between two parties. N.E.D does not hire, select or vet anyone and is not a party. Before a real launch we will ask a lawyer about Law 74/2025.)*

Also add to the expert pack Q10: "Tên sản phẩm có chữ 'Employment Deals'; điều này có ảnh hưởng đến cách cơ quan quản lý nhìn nhận không?"

### 11.2 README review (CL, applied in this commit)

The README is accurate and honest, and its limits section is good (team-controlled partner address, upgrade authority, no arbiter, final files not enforced). CL changed three lines:

| Where | Was | Now | Why |
| --- | --- | --- | --- |
| `README.md:95` | "Nobody takes the money alone" | "No party takes the money alone" | Word table: never "nobody can move the funds" (upgrade authority); matches the pitch fix "không bên nào" |
| `README.md:152` (Wallet app) | "Request changes, revised versions and splits are Workspace only" | adds "and submitting with a list of final files" | True until F-1 is fixed; remove it then |
| Limits and disclosures | — | Two lines: phone numbers not verified and the hash reversible; Circle can freeze USDC | Both are in the app's Disclosures; the README should not say less than the app |

Still to update in the README after V3–V4: the Status table (v1.4 on devnet) and, after D2 is fixed, nothing else. Until D2 is fixed, "Their screens show … no USDC" (`README.md:49`) is true for every screen except one notification path; CL accepts it as the design statement.

### 11.3 Nothing else blocks the slides

Slides 1, 2 (except the name), 5, 7 and 8 can be built now from `final-pitch.md` and §10.3. Slides 3, 4 and 6 follow the number set in §10.3 once V3–V4 are known.

---

## 12. PO reply to section 11: name decided, v1.4 is live, go for all slides (7 Oct, late; `main` at `9533198`)

**From:** PO. **To:** CL.

### 12.1 Name: option A, "N.E.D · No Empty Deals"

The PO accepts the CL recommendation. "Network of Employment Deals" is dropped because it contradicts "N.E.D does not employ anyone" and the Law 74/2025 position. Applied in this commit:

| File | Change |
| --- | --- |
| `assets/images/ned-logo.png`, `ned-logo-banner.png` | The line under "N.E.D" now reads **No Empty Deals**. The mark and "N.E.D" are unchanged. Layout set by the PO: the "N" of "No" starts at the left edge of the mark, and the last "s" of "Deals" ends at the right edge of the "D" in N.E.D, with letter spacing filling the width. The line is Inter 400, with a cap height about 55% of N.E.D's, so it stays clearly smaller. Design may refine it under the same file names, keeping this layout |
| `README.md` | Title and image alt text |
| `final-pitch.md` | Title, the name note at the top, Slide 2 speech ("N.E.D, No Empty Deals. Với Milestone Lock, …"), plus the CL caution under Slide 2: say "tiền được khoá trước khi bắt đầu làm", never "mọi deal đều có tiền" |
| §10.1 A-1 | Marked as replaced by this decision |

L6 and the extra expert question in §11.1 are not needed, because the name no longer says "Employment".

### 12.2 v1.4 is live: use the v1.4 number set (§10.3, first row)

Dev ran V3–V7 on 7 Oct (progress rows V3–V7 in `docs/tong-hop-tien-do.md`):

- **V3:** program extended by 20,000 B and upgraded on devnet; the deployed binary equals the build.
- **V4:** IDL v1.4 on-chain; smoke Runs 1–4 green.
- **V5–V6:** core and N.E.D Jobs UI: "Lock now / Lock when I hire", the chips, "Funded only", Select and lock.
- **V7:** pitch §9.4 lines, Q&A P8, numbers 29 / 55 / 26 and 67 tests, CU "dưới 25%", tracker, G1 marked fixed (`481f719`); legal copy §9.3 items 1–3 (`3cafdc7`).

So Slides 3, 4 and 6 can be built now with the v1.4 set. **Nothing blocks any slide.**

### 12.3 One check for the CL

The V7 row records "CL ok (PO xác nhận trong phiên)" for the legal copy commit `3cafdc7`. The PO confirmed it on the basis of the CL-approved texts in §9.3. **CL, please check `3cafdc7` against §9.3 items 1–3** (Terms, Job posting rules, the new Disclosures line) and confirm in the team chat, or note any difference here. The rule in `compliance-lead-tasks.md` is that the CL reviews what users and judges see.

### 12.4 Not built, so not in the pitch or the demo

- **`/new` open contract (N1–N3), with §9.3 item 11:** not built. On stage, open listings are posted only from **/jobs/new**. Do not say that New contract can publish to N.E.D Jobs.
- **Still open for 8 Oct** (§10.5):
  - F-1, mobile Submit dead end: the pitch already says final-file submit is Workspace only;
  - D1, D2, D3, D7, F-2 to F-6;
  - D6, the team email (PO);
  - O2, the license decision (PO).

### 12.5 Confirmation

| Item | Status |
| --- | --- |
| Section 11 (name, README review) | Accepted; name = option A |
| Slides 1–8 and the speaker script | **Go**, from `final-pitch.md` with the v1.4 number set |
| Final CL sign-off | 9 Oct walkthrough on the live app (§7), unchanged |
