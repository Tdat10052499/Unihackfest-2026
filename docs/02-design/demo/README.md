# Demo: N.E.D user flows (8 Oct 2026)

Screenshots from the two live apps on `main` (`ea92659`), with the D30 flags on (`EXPO_PUBLIC_FEATURE_ACCOUNT_ROLES=true`, `VITE_FEATURE_ACCOUNT_ROLES=true`):

- **Phone wallet** (`ned-wallet`), 390 × 844.
- **Workspace and N.E.D Jobs on a computer** (`ned-workspace`), 1280 × 800.

The automated suite of 55 scenarios for the new part (D30) is in [`../test/README.md`](../test/README.md).

## How the screenshots were made (read first)

- **No real Google sign-in.** The wallet runs in preview mode, acting as an existing wallet. The Workspace uses the dev mode `?previewWallet=`. The account state (role, country, agreement) is set up on the device in advance.
- **No transactions are signed.** Preview mode cannot sign, so the "create contract", "lock", "submit" and "release" steps stop at the confirmation screen just before signing.
- **The data after creation is real Solana devnet data.** The contract "Landing page design" (`Ff9h…GNc`) between the client wallet `BT9c…RT7B` and the freelancer wallet `EcpC…rA4y`; the finished contract "D1 review timeout"; the listing "E2E job · apply here" of the business `4b1d…4EY3`. The contract brief is encrypted and the capturing machine has no key, so it shows "This device cannot open the brief yet". That is the correct behaviour.
- **The red notice at the bottom of the phone screenshots** is the Dynamic sign-in SDK failing to connect from the capturing machine, not an app bug. No email address appears in any screenshot.

---

## A. A freelancer in Vietnam signs up (phone)

Flow: Welcome → role → country → agreement → (SOL for fees, funded in the background) → profile → Home. The step bar has **4 parts**.

| # | Screen | What the user does / sees |
| --- | --- | --- |
| A1 | ![](A1-welcome.png) | **Welcome**: taps "Continue with Google". The wallet is created automatically (Dynamic MPC), with no seed phrase. |
| A2 | ![](A2-role-freelancer.png) | **Step 1/4 · How will you use N.E.D?** Picks "I do the work" (Freelancer). Note: people who live in Vietnam can only join as freelancers. |
| A3 | ![](A3-country-vietnam.png) | **Step 2/4 · Where do you live now?** Searches "viet" and picks Vietnam. Note: amounts show in VND (estimated), earnings go to a bank account through the payout partner, and no crypto balance is shown. |
| A4 | ![](A4-agreement-freelancer.png) | **Step 3/4 · The N.E.D Agreement**: the "As a freelancer" card (rights / duties), the "What N.E.D does and does not do" card, then 3 checkboxes. "Agree and continue" turns on only when all 3 are ticked. Agree writes consent v3, the profile, the agreement (with the hash of the exact text shown) and the money view to the device. |
| A5 | ![](A5-profile.png) | **Step 4/4 · Create your profile**: picks an @username (and a phone number if wanted). One `create_profile` transaction is written to Solana; the user pays the devnet fee. |
| A6 | ![](A6-home-vietnam.png) | **Home, Vietnam view**: money locked for them (≈ VND), contracts, a button to share the @username with clients. No USDC or SOL. |
| A7 | ![](A7-settings-vietnam.png) | **Settings → Your account**: "Also work" on; "Also hire" locked ("Not available for people who live in Vietnam."); Where you live = Vietnam; Agreement version 1. |

## B. A business client in Singapore signs up (phone)

Flow: role (business) → country → **About your business** → agreement → profile → Home. The step bar has **5 parts**.

| # | Screen | What the user does / sees |
| --- | --- | --- |
| B1 | ![](B1-role-business.png) | Picks "I hire for a business" (Client · business). The step bar switches to 5 parts. |
| B2 | ![](B2-country-singapore.png) | Picks Singapore: sees USDC and receives money in the N.E.D wallet. |
| B3 | ![](B3-business-form.png) | **About your business**: company name, place of registration (cannot be Vietnam), size, industry, website, job title, registration number (stored on the device only, never written to Solana). Everything is **self-declared**; N.E.D does not check it. |
| B4 | ![](B4-agreement-business.png) | The agreement has the "As a client" and "For your business" cards, plus a "Job posting rules" link. |
| B5 | ![](B5-home-client.png) | **Client Home**: USDC balance, "New contract", Receive, Send. |
| B6 | ![](B6-settings-business.png) | Settings → Your account: "Lumen Studio Pte. Ltd. · self-declared", Agreement "Version 1 · 8 Oct 2026". Tapping Agreement shows the text agreed to again, or "Withdraw and sign out". |

## C. A client creates a contract (phone)

| # | Screen | What the user does / sees |
| --- | --- | --- |
| C1 | ![](C1-new-contract-recipient.png) | **New contract 1/3**: enters the freelancer's @username or wallet address and taps "Find". The app looks it up on chain; a contract with yourself is not possible. |
| C2 | ![](C2-new-contract-milestones.png) | **2/3**: title (public on Solana), brief (encrypted), and for each milestone a name, a USDC amount, a submission deadline, a review period and "done when" points. |
| C3 | ![](C3-new-contract-review.png) | **3/3 · Review**: total to lock, brief fingerprint, fees (N.E.D charges no fee in the pilot; network fee ~0.000005 SOL), "What happens next". "Slide to create" signs the `create_fund` transaction. |

**After creation** (a real wallet signs at step C3), the app shows "Contract created" with an invite link (holding the brief's decryption key) to send to the freelancer. The freelancer opens the link → **Accept** and picks where to receive (USDC to the wallet, or VND through the payout partner) → the client **Locks** (USDC into the program's vault) → the freelancer works and **Submits** → the client **Reviews**: accept to release, or request changes. After the review deadline **anyone can tap Release now** for the freelancer; after the submission deadline with nothing submitted, **Refund now** returns the money to the client.

## D. The contract after creation: real devnet data (phone)

| # | Screen | What it shows |
| --- | --- | --- |
| D1 | ![](D1-contracts-client.png) | **The client's contract list** (As client / As freelancer tabs, Active filter). |
| D2 | ![](D2-contract-client.png) | **Detail, client side**: "Locked · work in progress", the amount locked, where the freelancer receives (VND through the payout partner, simulated), "Held by the program, not by N.E.D" and an Explorer link. The submission deadline has passed here, so **Refund now** shows (anyone can do it). |
| D3 | ![](D3-contract-freelancer.png) | **The same contract, Vietnam freelancer side**: amounts in ≈ VND, no USDC. |
| D4 | ![](D4-submit-freelancer.png) | **Submit milestone** (freelancer): preview link, note, list of final files and fingerprint. |
| D5 | ![](D5-review-client.png) | **Review** (client): view the submission, accept and release, or request changes (the money stays locked; no automatic refund). |
| D6 | ![](D6-settled-freelancer.png) | **A finished (Settled) contract**. |
| D7 | ![](D7-records-freelancer.png) | **Records**: history of what the freelancer has received, read from the chain. |

## E. Workspace on a computer

| # | Screen | What it shows |
| --- | --- | --- |
| E1 | ![](E1-sign-in.png) | **Sign in with N.E.D Wallet** (the same Google account as on the phone). |
| E2 | ![](E2-overview-client.png) | **Client overview**: figures, to-dos, contract table, "New contract". The avatar opens the wallet panel (the phone app itself, embedded in the page). |
| E3 | ![](E3-new-contract-editor.png) | **Writing a contract on a computer** (wider brief editor); Create makes the wallet panel ask for a signature. |
| E4 | ![](E4-contract-client.png) | **Contract page, client side**: milestones, status, next step. |
| E5 | ![](E5-overview-freelancer.png) | **Overview of a Vietnam freelancer**: ≈ VND, a button to share the @username, no New contract. |
| E6 | ![](E6-contract-freelancer.png) | **Contract page, freelancer side**. |
| E7 | ![](E7-submit-freelancer.png) | **Submitting a milestone on a computer**, with the "Before you submit" guide (share a preview, keep the source files until release). |
| E8 | ![](E8-review-client.png) | **Client review on a computer**. |

## F. N.E.D Jobs (computer)

| # | Screen | What it shows |
| --- | --- | --- |
| F1 | ![](F1-jobs-overview-guest.png) | **Overview** for a signed-out visitor. |
| F2 | ![](F2-jobs-find.png) | **Find jobs**: search, filters, "Budget locked" or "Locks when hired" chips. |
| F3 | ![](F3-job-detail-apply.png) | **Job detail**: the freelancer writes a (public) pitch and applies. Nothing is locked from the freelancer's wallet. |
| F4 | ![](F4-post-job.png) | **Post a job** (business): "Lock now" or "Lock when I hire"; the preview card says "Lumen Studio Pte. Ltd. · Business · self-declared". |
| F5 | ![](F5-applicants.png) | **Applicants** (business): applicant list, pitches, track record from the chain, Select. Selecting someone creates the contract (and locks the budget if the listing locks when hiring). |
| F6 | ![](F6-job-filled.png) | **A filled job**. |

## G. Role gates

The new gate screens (a freelancer opening `/new`, someone in Vietnam opening `/jobs/new`, a client-only user meeting "Also work", a country change blocked while client contracts are open…) are in [`../test/`](../test/README.md), scenarios W29–W39 and S04–S16.

---

## What needs a real person (Google sign-in, signing transactions)

On a Vercel preview with the flags on, or locally with both flags on:

1. A new Google account, freelancer in Vietnam: A1 → A7, then create the @username (signs a transaction).
2. Another new Google account, business in Singapore: B1 → B6.
3. The business creates a contract for the freelancer's @username (C1 → C3, "Slide to create"). Send the invite link → the freelancer Accepts (picks VND) → the client Locks → the freelancer Submits → the client Reviews and releases.
4. The business posts a job → the freelancer Applies → the business Selects → the freelancer Accepts.
5. Old demo accounts (Mia, Vinh): see the update flow **once**; their old contracts are still there.

## Found while capturing (not part of D30)

- **A job page wrongly says "This job does not exist" when the devnet RPC is rate-limited (error 429).** `useJob` (`ned-workspace/src/jobs/hooks.ts:77`) catches every error and returns "no job". Reloading after a few seconds shows the page correctly (F3, F5 and F6 were all captured again). It could affect the demo if the RPC is slow. Proposal after the final: tell "does not exist" apart from "could not be read yet, try again".
- The line "The public brief is missing or does not match" on the Applicants screen (F5) may have the same cause (reading the brief hit a 429); check again when the RPC is not congested.
