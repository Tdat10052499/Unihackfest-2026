# Compliance review of H4–H5 and open problems (7 Oct 2026)

**Owner:** Compliance Lead (Nguyễn Minh Chính, @F4ol4n) · **Checked against:** `main` at `ad1f01d` (H4 Legal page, H5 restyle and QA) · **Not legal advice.**

**Status:** the shared legal copy is fixed and pushed (section 1). Section 2 lists what still needs the PO or a developer, with an owner and a date. The freeze is **8 Oct 18:00**.

---

## 1. Fixed in this commit (CL)

Tests after the change: core 152/152, wallet 38/38, Workspace node 19/19, Vitest 83/83 (1 new). `tsc` is clean in both apps, and the Workspace build passes.

| # | Where | Was | Now | Why |
| --- | --- | --- | --- | --- |
| F1 | Terms, "What N.E.D is not" (`packages/ned-core/src/legal/copy.ts`) | "It is not a payment service, a bank or an exchange." The board proposed "not a bank, an exchange or a money-transfer service" | "It is not a bank or an exchange, and no one at N.E.D can move locked funds." | Both earlier versions name a regulated service category ("payment", "money-transfer"). A judge then compares us to it (Decree 52/2024 Art. 8(7), intermediary payment). The new line states a fact we can prove: invariant I2 and the vault PDA. Closes the H4 open question |
| F2 | Terms, "Vietnam" | "…never hold crypto" | "They never receive, hold or send USDC through N.E.D, and they cannot post jobs or lock funds. They sign their own actions with their login wallet; in this demo the network fee for each action is paid in test SOL." | A4: a Vietnam-view wallet signs, and it holds devnet SOL for fees (D8). "Never hold crypto" is not true |
| F3 | Disclosures, "Network fees use test SOL" | "Each action costs about 0.000005 test SOL on devnet." | "Each action you sign has a small network fee, paid in test SOL on devnet, which has no value." | A4: no SOL amount in the Vietnam view. `/jobs/legal` is shown to every view |
| F4 | Job posting rules, "Lock the whole budget to post" | No line about who can post | Adds "Posting is open to businesses outside Vietnam. The Vietnam view cannot post jobs or lock funds." | I10, D18, D25 |
| F5 | Job posting rules, "Lawful work only" | No line about review | Adds "N.E.D does not review or approve listings before they appear. Check a listing and its business record yourself before you apply." | I11: we must not imply moderation or vetting we don't do (the job-board legal question, expert pack Q6) |
| F6 | Job posting rules, "Selecting and accepting" | "The applicant accepts within 48 hours (2 minutes on devnet)" | "…has 2 minutes to accept on devnet (48 hours planned for launch)" | 48 h is a launch [Assumption] (`JOB_ACCEPT_WINDOW_SECS` = 120 s). State what runs today first |
| F7 | Versions | Terms "pilot version 1 · 6 Oct"; `LEGAL_VERSION_LINE` and the `/jobs/legal` intro "6 Oct"; Disclosures "Version 1.0.0" | Terms 1.1 · 7 Oct; legal version line and intro 1.1 · 7 Oct; Disclosures 1.1.0 | Disclosures and Job posting rules were added on 7 Oct. The Privacy notice is unchanged (it stays at 6 Oct), so **no new consent is needed** |
| F8 | Phone app Disclosures (`ned-wallet/app/disclosures.tsx`) | Disputes line followed the phone app's `FEATURES.dispute` (off), so it read "No disputes in this demo" | Always "No neutral arbiter" (`DISPUTES_LIVE = true`) | **S-1 interim fix.** Request changes is live in the program and in the Workspace for the same contracts, and the phone app runs inside the Workspace at `/wallet`. One user could see two disclosures that contradict each other. A disclosure describes the system, not one app's screens |
| F9 | Workspace confirm sheets in the Vietnam view: Release now, Refund now, Move locked budget, Return to client, splits (`hooks/contractActions.ts`); Submit and revision (`pages/Submit.tsx`); Apply (`jobs/pages/JobDetail.tsx`) | "~0.000005 SOL", "0.00xx SOL" rent, and amounts in USDC (for example "This refunds milestone 1 (8.00 USDC)…") | Fee "Test SOL on devnet · it has no value"; rent "Test SOL on devnet"; amounts "≈ … VND (estimate)" | A4 and the Vietnam-view rule (no USDC or SOL amounts). The phone app already did this (`components/contracts/ui.tsx`); the Workspace did not. New Vitest test guards it |
| F10 | N.E.D Jobs Overview, Vietnam view (`jobs/pages/Overview.tsx`) | "Choose VND to your bank when you accept, and never hold crypto." | "…and the locked amount never passes through your wallet." | A4, and it keeps the "no USDC word in the Vietnam view" rule |

Client-only and business-only sheets (Review, New contract, Post job, Applicants) still show "~0.000005 SOL". That is fine: the Vietnam view cannot open them.

---

## 2. Still open: needs the PO or a developer

| # | Problem | Risk | What to do | Owner | By |
| --- | --- | --- | --- | --- | --- |
| P1 | **README is the old wallet README** (Neo-brutalism, Jupiter, swap; "24 milestone tests"; "updated 3 Oct") | Track 2 criterion "Build Evidence, Documentation & Reproducibility" (20 points). Judges open the repo first | Rewrite in English: what Milestone Lock is, live links, program ID, how to build and test (54/54), `npm run jobs:smoke`, compute-unit table, limits and disclosures. Send it to the CL to check | PO + Dev | **8 Oct** |
| P2 | **No LICENSE file**, but the README says MIT | Same criterion; a false claim in the repo | Add `LICENSE` (MIT) or remove the claim | PO | 8 Oct |
| P3 | **"[team email]" shows on the live Legal page** (Job posting rules and the side note) | Looks unfinished; the only contact route for listing problems is missing | Give a real team address (for example a team Gmail). Put it in `TEAM_EMAIL` (`copy.ts`) and update the core test that expects the placeholder | PO | 8 Oct 12:00 |
| P4 | **S-1, phone app side:** the disclosure is now correct (F8). But a freelancer on the phone app still has no buttons for a Disputed milestone: no "Send revised version", "Return to client" or split. A client on the phone cannot request changes | A judge who tries the phone app sees "Changes requested" with nothing to press | Either finish S13 and set `FEATURES.dispute = true` in `ned-wallet`, or (fallback) show "Open this contract in the Workspace to respond" on a Disputed milestone. Demo the request-changes flow on the Workspace only (final-pitch.md, runbook) | Dev (decision: PO, tracker Q4) | 8 Oct 18:00 |
| P5 | Phone app wallet notifications still carry "0.000005 SOL" and transfer banners (`stores/useNotificationStore.ts`, `notification-detail.tsx`) | A4 / C5 if a Vietnam-view user sees them | Finish S12: no wallet transfer banner in the Vietnam view, and no SOL amount in it | Dev | 8 Oct |
| P6 | PR #41 (system tracker) is still open, but its content is on `main` (with the PO review) | Confusing history; the PO rule is "no pull requests" | Closed with a comment (CL, 7 Oct) | CL | done |
| P7 | Tracker decisions Q1–Q4 (accountability layer, thresholds, 72 h review default, S-1 path) | Pitch and roadmap slide wording depend on them | PO answers in `system-tracker.md` section 13 | PO | 8 Oct |
| P8 | Job board legal question (Law 74/2025, Decree 352/2025, e-commerce platform rules) is [Unverified] | Judge question "is this a job marketplace?" | Answer as in final-pitch.md L4. CL adds the question to the expert pack and asks the expert | CL | 8 Oct |
| P9 | Organisers' language rule (pitch Vietnamese only, product English) has no saved proof | Dispute on the day | Save the message in Hub Tab 10 Evidence | CL | today |
| P10 | Compliance Hub Google Doc is still viewable by anyone with the link | Internal notes are public | Share → Restricted, team only | CL | today |

---

## 3. Notes for developers

- **Legal copy has one source:** `packages/ned-core/src/legal/copy.ts`. Any change to it, or to a confirm sheet a Vietnam-view user can open, needs a CL check (PR template box, CODEOWNERS).
- **Vietnam view, three checks before you push:**
  1. No "USDC" and no SOL amount on the screen.
  2. Amounts read "≈ … VND (estimate)".
  3. No send, receive, swap, post job or lock.
- **Words:** follow the word table in `docs/09-milestone-lock/product-spec.md` §6. Do not name a regulated service category to say what N.E.D is not ("payment service", "money-transfer service", "escrow"). Say what the code does instead.
- **The pitch is in Vietnamese** (organisers, 7 Oct); the app, the README and every UI string stay in English. Script: `docs/09-milestone-lock/final-pitch.md`.
