# Milestone Lock: product and app specification (v1)

Status: **build spec, frozen for coding on 3 Oct 2026** (review fixes R1–R12 in [`README.md`](README.md#review-fixes-3-oct)). Program details are in [`program-spec.md`](program-spec.md). Research and legal reasoning are in [`../08-research/ned-research-and-compliance.md`](../08-research/ned-research-and-compliance.md). Labels: **\[Verified\]** opened at source · **\[Inference\]** our reasoning · **\[Assumption\]** planning value to test · **\[Unverified\]** not confirmed.

## 1. The product in one sentence

**A foreign client locks USDC per milestone in a Solana program before work starts; when the client accepts a milestone, or anyone presses Release now after the review deadline (unless the client requested changes in time), the program releases it to the destination the freelancer chose: their own wallet abroad, or a payout partner (candidates: Due, Nium; simulated in the demo) that would pay a freelancer in Vietnam in VND.**

Pitch line: *"Freelancers receive their earnings, locked by code."*

## 2. Parties

| Party | Does | Holds or receives crypto? |
| --- | --- | --- |
| **Client** (outside Vietnam) | Creates the contract, locks USDC, approves, may dispute | Yes, USDC on Solana, under the client's own law |
| **International freelancer** (outside Vietnam, including Vietnamese abroad) | Accepts, chooses own wallet, submits | Yes, USDC in their N.E.D wallet, only where stablecoins are lawful for them |
| **Freelancer in Vietnam** | Accepts, chooses VND payout, submits, may concede a dispute | **No USDC at any step.** Signs `accept` and `submit` with the embedded login key; see 4.3 on network fees |
| **Payout partner** (candidates: Due, Nium; **simulated in the demo** by a team-controlled devnet wallet on the program's allowlist) | Receives USDC at its own address, converts outside Vietnam, pays VND via NAPAS | Yes, within its licences |
| **N.E.D** | App and program | Holds no funds, converts nothing, charges no fee in v1 |

## 3. Flow

1. **Create (client).** The client enters the freelancer's @username, a title (≤ 32 bytes, no personal data), 1–5 milestones with a USDC amount, a submission deadline and a review deadline each, and a **brief**: what is needed, references, and "Done when" criteria per milestone. The brief's SHA-256 is stored on-chain (`brief_hash`); the brief itself travels encrypted (section 5.1). The client sends the freelancer an **invite link** that carries the key. Freelancer-created proposals are on the roadmap.
2. **Accept and choose where earnings go (freelancer).** "USDC to my N.E.D wallet" (international) or "VND to my Vietnamese bank account through a payout partner" (Vietnam). The freelancer never types an address: the app fills in their own wallet, or the allowlisted partner address plus a recipient reference (demo: SHA-256 of a made-up recipient ID such as `demo-vinh-001`; at launch, the ID the partner issues after KYC). The destination is written on-chain and cannot change afterwards. The freelancer reads the brief first; `accept` carries the brief hash they saw, so it fails if the brief differs.
3. **Lock (client).** The client sees the destination type and locks the full amount. The freelancer sees "Locked" before starting work.
4. **Submit (freelancer).** Marks a milestone delivered, before its deadline (the program checks chain time). The delivery is links (prefer fixed versions: a Figma version, a Git commit), file fingerprints (files stay on the freelancer's computer and are shared through the links) and a note. The SHA-256 of the delivery is the on-chain evidence; the delivery itself goes to the client as an encrypted note. The client sees "On time", the delivery, and whether it still matches the evidence.
5. **Accept & release (client), or Release now.** The client's approval releases that milestone. If the client does nothing by the review deadline, anyone can press Release now, unless the client requested changes in time. Nothing releases by itself (D26).

| Situation | Rule | Status |
| --- | --- | --- |
| Freelancer misses the submission deadline | Anyone can refund that milestone to the client | Fixed |
| Client does not review by the review deadline | Anyone can release it to the destination, unless disputed in time | Fixed (decision D1) |
| Client requests changes (`dispute` + review note, before the review deadline) | Release now stops and the amount stays locked; no deadline runs. The milestone settles when the client accepts a revised version, the freelancer returns it (`concede`, refund to the client), or both agree a split (`propose_cancel` / `accept_cancel`) | Shipped (D27) in the Workspace; the phone app cannot respond yet (S-1). No neutral arbiter in v1: a client can hold the amount by requesting changes, and the freelancer can then revise, negotiate or return it. Say so |
| Client wants to cancel before delivery | Only with the freelancer's agreement (same cancel pair) | P1 |
| Nobody locked yet | Client can close the contract; rent returned | Fixed |
| Too little time left | `accept` and `lock` fail if less than the minimum work window (60 s on devnet, 24 h at launch \[Assumption\]) remains before the first submission deadline; the client closes and creates a new contract | Fixed |

## 4. Vietnam path

### 4.1 What the Vietnam freelancer sees

- Amounts as **"≈ 520,000 VND (estimate)"** next to USD (20 USDC in the demo). Use a fixed rate constant `DEMO_USD_VND_RATE` with its date (26,019.5 VND on 2 Oct 2026, Wise mid-market \[Verified in 08-research\]). Update the constant on demo day; no backend.
- After release, a status line: **"Released to payout partner · VND transfer simulated in this demo"**. Do not fake timed "processing" or "received" steps.
- No USDC balance, swap, xStocks, Earn or dApp browser. Contract screens and income record only.

### 4.2 How the app knows the user is in Vietnam

A local setting "I live in Vietnam" (default on) chosen in onboarding and in Settings, stored on the device. It selects the Vietnam view and pre-selects the VND destination in `accept`. Before launch this becomes the payout partner's KYC result \[Inference\].

### 4.3 Network fees (known gap, disclosed)

Solana needs a fee payer for every transaction. In the devnet demo, every user pays fees with **devnet test SOL**, which has no value (current architecture: no gas sponsorship, `ned-wallet/ARCHITECTURE.md`). **Before launch**, Vietnam users must not hold SOL: a fee payer (for example the Solana Foundation's Kora relayer) covers `accept` and `submit`. `create_fund` already separates `payer` from `client` for this. This needs a small server, so it is a launch item, not a demo item (decision D4).

Disclosure line: *"Demo on devnet: network fees use test SOL. Before launch, Vietnam users will hold no crypto, not even for fees."*

## 5. App screens (Expo, web first)

| Route | Who | Content | P |
| --- | --- | --- | --- |
| `app/contracts/index.tsx` | both | Two lists, "As client" and "As freelancer", from `getProgramAccounts` with discriminator + `memcmp` at offset 12 or 44; status chips | P0 |
| `app/contracts/new.tsx` | client | Freelancer @username (existing `services/identity/resolve.ts`), title, milestones, deadlines; review summary; sends `create_fund` | P0 |
| `app/contracts/[fund].tsx` | both | Role-aware detail: amounts, destination type, per-milestone status and chain-time countdown, action buttons (accept, lock, submit, approve, release, refund, close; dispute and cancel if P1 is done), explorer links | P0 |
| `app/contracts/accept.tsx` (or a sheet on the detail screen) | freelancer | Choose "USDC to my wallet" or "VND to my bank (payout partner, simulated)"; the app passes the freelancer's own address or `DEMO_PAYOUT_PARTNER`; Vietnam view pre-selects VND | P0 |
| Home entry point | both | "Contracts" card on Home; hide Swap, xStocks, Earn, dApps from the demo path | P1 |
| `app/c/[fund].tsx` | both | Invite link: imports the content key from `#k=…`, then opens the contract (mobile) or the Workspace (computer) | P0 |
| `app/workspace/*` | both, computer | Web Workspace (`build-plan.md` phase C): wallet panel, brief editor, submit with file fingerprints, review | P0 |

Code layout: `services/milestone/` with `pda.ts` (seeds), `client.ts` (Anchor builders from the IDL), `queries.ts` (memcmp lists, decoding), `format.ts` (USDC base units ↔ display, VND estimate), `evidence.ts` (SHA-256). Screens use `useAuth()` only (rule in `ned-wallet/AGENTS.md`). Keep the demo payout-partner address in `constants/` as `DEMO_PAYOUT_PARTNER`, equal to the program's `PAYOUT_PARTNERS` entry, with a comment saying it is a team-controlled devnet wallet. Open a contract by deep link `app/contracts/[fund]` (used for the prepared demo contract).

**Fix first (P0):**

- `services/solana.ts` `getUsdcTokenBalance` (around lines 246–262) adds every SPL token into the "USDC" balance when the USDC account is empty. Read only the USDC ATA.
- `services/jupiter/core.ts:1` has a mainnet USDC address missing a `q`. Keep one USDC constant module and import it everywhere.

### 5.2 Account screens (D30, behind `FEATURES.accountRoles`, off until R9)

Design: `roles-and-agreement-plan.md`; build: `roles-and-agreement-build.md`; boards: `../02-design/canvas-v2/` ("D30" heading); copy: `packages/ned-core/src/account/copy.ts` and `legal/agreement.ts` (copy deck, draft for CL review). Renders: `../02-design/screenshots/d30/`.

| Route | Who | Content | Step |
| --- | --- | --- | --- |
| `app/(onboarding)/role` | new or existing wallet | **How will you use N.E.D?** Freelancer · Client · Client (business). `?update=1`: update notice, no Back, preselected from the money view and the wallet's history | 1 / 4 (business 1 / 5) |
| `app/(onboarding)/country` | everyone | **Where do you live now?** Search list, "not your nationality". Vietnam with a client role opens "Join as a freelancer?". `?edit=1` from Settings: confirm sheet, or blocked while client work is open (closes D17) | 2 / 4 |
| `app/(onboarding)/business` | client (business) | **About your business**, self-declared; registered in Vietnam is refused. `?edit=1` from Settings | 3 / 5 |
| `app/(onboarding)/agreement` | everyone | **The N.E.D Agreement**: role cards, "What N.E.D does and does not do", three unticked boxes; records consent v3, profile, agreement hash and region on the device | 3 / 4 (business 4 / 5) |
| `app/settings` → **Your account** | everyone | Also work / Also hire (one role stays on; no client role in Vietnam), Where you live, Business (`… · self-declared`), Agreement (view, withdraw and sign out) | — |
| Workspace `AccountPrompt`, role gates | computer | "Finish setting up your account" opens the wallet at `/role`; client actions refused with the gate line and Open settings / Also work; `/new` and `/jobs/new` show the gate card | — |

Gates are UI only: the program does not know anyone's role or residence. Country, role and business details stay on the device (`@ned_account_v1`); the registration number never leaves it.

### 5.1 Brief and delivery content (decision D15)

- No backend (D4): content is stored as `post_note` ciphertext in transactions that reference the fund; only hashes are in the account.
- Each contract has a random content key made by the client's app. It travels in the invite-link fragment (`#k=`), which browsers do not send to servers, and, since D22, as wraps for every registered device of both parties. N.E.D never has the key. Anyone holding the link can read the brief and the delivery, never move money. Say so in Disclosures.
- A device without the key (not yet registered, so no wrap for it) shows the money state and the hashes, and asks the user to register the device or open the invite link on it (7 Oct, D22).
- To move to another device, a party signs in there and registers the device; the contract key is then wrapped for it (D22). "Copy contract link" on the contract screen, or pasting the link in the Workspace, still works as a fallback. "Same delivery that was submitted ✓" proves only that the delivery note equals the on-chain evidence, not that the content behind a link is unchanged; ask freelancers for fixed-version links.
- The Vietnam view never shows "New contract" or client actions (decision D18).

## 6. Words

This table replaces `07-strategy-v3` §11.3 and the word lists in `08-research`.

| Use | Never |
| --- | --- |
| lock, release, refund, receive earnings, request changes, Release now, transfer, record, contract, milestone | pay / payment / thanh toán (for USDC), escrow (in UI), ký quỹ, deposit, invest, yield, interest, safe / an toàn, guaranteed, scam-free, tax-compliant, first, zero fees, credit score, auto-release (D26), "not a payment service" |
| "candidate payout partners (Due, Nium), simulated in the demo" | "our partner", "licensed partner", "licensed Vietnamese crypto partner" |
| "no instruction lets N.E.D move locked funds" | "nobody can move the funds" (the deploy wallet still holds the upgrade authority) |
| "the Vietnam user never receives, holds or sends USDC" | "the Vietnam user never touches crypto" (A4) |
| "devnet, test money" | any live-money claim |
| D30: "self-declared" (every business name and the residence), "Business · self-declared" | "verified" (user or business), "trusted client", "vetted" |
| D30: "Also hire (client)", "Also work (freelancer)", "Your account", "Where you live" (not nationality) | "account type", "hire staff" |
| D30: "software; the money sits in a vault owned by the Solana program, not by N.E.D" | "intermediary", "trung gian", "escrow agent", "N.E.D holds your money" |
| D30: "locked in the program before work starts", "released by the deadlines written into the contract" | "guaranteed payment", "safe", "protected" |
| D30: "client", "freelancer", "contract", "milestone" | "employer", "employee", "salary", "hire staff" (Law 74/2025, lawyer question 7) |
| "N.E.D" (the product), "the N.E.D app" (the phone app), "your N.E.D wallet" (the user's own embedded wallet) | "N.E.D Wallet" as a product name (9 Oct 2026) |

The word "escrow" may appear only in technical docs and in answers to judges who use it first.

## 7. Demo script (under 2 minutes, two browsers)

> **7 Oct:** the stage version is [`final-pitch.md`](final-pitch.md) §2–3 (Person A / Person B, Vietnamese script, Workspace for both roles, accept and lock in the wallet panel). The steps below are the original plan and keep the setup facts.

Amounts are small because the Circle faucet gives 20 devnet USDC per address every 2 hours \[Verified in 08-research\].

1. Mia (client, Singapore) creates "Landing page design": 2 milestones × 10 USDC.
2. Vinh (freelancer, Vietnam view) accepts and chooses "VND to my bank account".
3. Mia locks 20 devnet USDC; Vinh's screen shows "≈ 520,000 VND locked (estimate)".
4. Vinh submits milestone 1; Mia accepts and releases; the status shows "Released to payout partner · VND transfer simulated in this demo".
5. Open contract B by deep link. The team prepared it **in the app, with Mia's and Vinh's own logins**, 15 minutes before the pitch: 1 milestone × 10 USDC, submission deadline **create time + 5 minutes** (so `accept` and `lock` still have the 60 s work window), review deadline 60 s after that. Vinh accepted, Mia locked, Vinh submitted. Its review deadline has passed, so anyone presses Release now.
6. Open the explorer: the vault is owned by the program, not by N.E.D.

The embedded logins cannot be scripted, so no script signs as Mia or Vinh. Script in `ned-wallet/scripts/`: `recycle-demo-usdc` sends the USDC that reached `DEMO_PAYOUT_PARTNER` back to Mia's address (the partner keypair is a local file, outside the repo). Mia needs **30 USDC** on stage day (10 for contract B, then 20 for contract A): two faucet claims at least 2 hours apart the day before, or recycled USDC. Give Vinh devnet SOL. Rehearse the 15-minute preparation of contract B at least once.

## 8. Cut order

Cut in this order if late: Blink link → the P1 group `dispute`, `concede`, `propose_cancel`, `accept_cancel` (cut all four together; keep the status values in the account) → Vietnamese-language UI → income record → Home card. **Never cut:** `create_fund`, `accept`, `lock`, `submit`, `approve`, `release_after_review`, `refund`, `close`, their tests, and the Vietnam view in ≈ VND.

## 9. Disclosures (app footer, deck, booth)

Devnet, test money only · no KYC yet · no neutral arbiter: a request for changes keeps the amount locked until both sides agree · the team's deploy wallet can still upgrade the program until the final · in the Vietnam path the freelancer relies on the payout partner after release · phone numbers not OTP-verified and the phone hash can be brute-forced · program not audited · payout partner simulated · network fees use test SOL · Circle can freeze USDC addresses · not legal, tax or financial advice.
