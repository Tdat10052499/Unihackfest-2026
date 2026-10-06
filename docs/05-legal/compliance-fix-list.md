# Compliance fix list: must-fix before code freeze

**From:** Compliance Lead (Nguyễn Minh Chính, @F4ol4n)
**Date:** 6 Oct 2026 · checked against `main` at `3a1564a` (4 Oct) and the live builds (GitHub Pages `gh-pages` 4 Oct, `unihackfest-2026.vercel.app`)
**Code freeze:** 9 Oct 2026 · **Final:** 10 Oct 2026
**Status:** open. Tick each box when its "Done when" check passes, and name the commit.

> Team rule (from `compliance-lead-tasks.md`): anything a judge or the public can see (app text, README, slides, video, booth) goes past the Compliance Lead first. This list covers what I found in the repo and the live apps on 5–6 Oct. Not legal advice; open legal points go to the expert check.

## How to read this

- **P0**: must be done before the 9 Oct freeze. Each one is a security leak, a false statement in the app, a break of the word table, a gap in our main legal answer ("a Vietnam user never touches crypto"), or a competition rule.
- **P1**: should be done if there is time. Each one makes us safer in Q&A.
- **P2**: known limits. Do not fix now; say them honestly if asked (section G).
- **Owner**: Dev, PO, CL (Compliance Lead), Design, Biz. Change the owner if the team decides otherwise.
- Every item has: **Where** (file:line), **Problem**, **Why it matters**, **Fix** (with the exact new text where it is copy), **Done when**.

## Summary

| ID | P | Owner | Item | Due |
| --- | --- | --- | --- | --- |
| S1 | P0 | Dev | Revoke the Jupiter API key still inside the live mobile build | 6 Oct |
| S2 | P0 | Dev | Lock the Helius key in the live build to our domains | 6 Oct |
| S3 | P0 | Dev + CL | Rotate or disable old keys in git history (Helius, Supabase, Privy) | 7 Oct |
| C1 | P0 | Dev | Accept screen says "A licensed payout partner" | 7 Oct |
| C2 | P0 | Dev | Disclosures promise disputes, but disputes are switched off | 7 Oct |
| C3 | P0 | Dev | Phone hash: missing disclosure, "never stored as plain text" reassures | 7 Oct |
| C4 | P0 | Dev | "paid out in VND" and "VND payout" in Workspace and core labels | 7 Oct |
| C5 | P0 | Dev | Vietnamese "Nhận tiền thành công" banner for every user, labelled USDC | 7 Oct |
| V1 | P0 | Dev | Vietnam view can open `/send`, `/receive`, `/history`, `/scan-qr` by URL | 7 Oct |
| V2 | P0 | Dev | Onboarding: faucet and SOL balance come before consent and residence | 8 Oct |
| P1 | P0 | Dev | Signing out or withdrawing consent deletes the consent log | 7 Oct |
| P2 | P0 | Dev + CL | Consent text does not cover everything we process | 8 Oct |
| P3 | P0 | Dev + CL | Consent screen points to Terms and a Privacy Policy that do not exist | 8 Oct |
| P4 | P0 | Dev | Workspace has no consent step; Google Fonts load before sign-in | 8 Oct |
| R1 | P0 | PO + Dev | README describes the old wallet, not what runs | 8 Oct |
| R2 | P0 | PO | README claims MIT, but there is no LICENSE file | 7 Oct |
| D1 | P0 | CL | "Licensed partner" wording in the research doc and Q&A | 6 Oct |
| D2 | P0 | CL | Q&A answers do not match the current build | 7 Oct |
| D3 | P0 | PO | Decisions D1–D5 not confirmed (deadline 6 Oct) | 6 Oct |
| D4 | P0 | CL + PO | Survey go/no-go result not recorded (deadline 6 Oct) | 6 Oct |
| F1 | P1 | Dev | VND rate has no source; big VND numbers lack "≈" | 8 Oct |
| F2 | P1 | Dev | CSV export has no "estimate / simulated / not tax advice" note | 8 Oct |
| F3 | P1 | Dev | Unused old strings in the bundle: "thanh toán", "Miễn phí", "an toàn", VNPAY → USDC, "earn daily yield" | 8 Oct |
| F4 | P1 | Dev | `/wallet` CSP is Report-Only and allows mainnet, Jupiter, GeckoTerminal | 8 Oct |
| F5 | P1 | Dev | Contract title is public forever; editor gives no warning | 8 Oct |
| F6 | P1 | CL + Dev | Add a PR template and CODEOWNERS so copy changes reach CL | 7 Oct |
| F7 | P1 | CL | Update stale facts in the research doc (bytes, instruction count, "hash only") | 8 Oct |
| F8 | P1 | Design | Design status doc still shows a 0.25% fee and "Network fee free" | 8 Oct |
| F9 | P1 | CL | Review the copy in the separate landing-page repo | 8 Oct |
| F10 | P1 | CL | Log Due and Nium replies (D5); none recorded | 7 Oct |
| F11 | P1 | Dev | Move upgrade authority to Squads at freeze (already planned) | 9 Oct |

---

## A. Security (P0)

### S1 · Revoke the Jupiter API key in the live mobile build
- **Where:** key `jup_1b08…` was committed in `ned-wallet/.env.example` on 27 Sep and blanked in `8dacce1` (3 Oct). The live build still has it: branch `gh-pages` (4 Oct), file `_expo/static/js/web/index-f7013d….js`.
- **Problem:** blanking the file did not remove the key from git history or from the deployed bundle. Anyone can read it from the website.
- **Why it matters:** the key is public, so it can be abused under our account. Our compliance register (row 12) says old keys are rotated; that is not true yet. A judge reading the repo can find it.
- **Fix:**
  1. Revoke the key at portal.jup.ag.
  2. Swap and xStocks are hidden (`FEATURES.swap = false`), so the demo does not need Jupiter. Leave `EXPO_PUBLIC_JUPITER_API_KEY` empty for the public build. If you still need it, make a new key and keep it out of git.
  3. Rebuild and redeploy `gh-pages` and the `/wallet` build on Vercel.
- **Done when:** the new bundle contains no `jup_` string (`grep -o 'jup_' <bundle>` is empty), and a request with the old key is rejected.

### S2 · Lock the Helius key in the live build to our domains
- **Where:** the live mobile bundle has the Helius key `api-key=7b80…`. The progress log (open issues) says it "still accepts any website". The same key is used for devnet and mainnet.
- **Problem:** a public key with no domain limit can be used by anyone, which burns our quota and can break the demo on stage (rate limits).
- **Why it matters:** demo reliability. A key every visitor can see is fine only if it is restricted.
- **Fix:** in the Helius dashboard, set allowed domains to `tdat10052499.github.io`, `unihackfest-2026.vercel.app` and `localhost`. Use a separate devnet-only key for the public builds. Leave `EXPO_PUBLIC_HELIUS_MAINNET_URL` out of the public build unless the `.sol` lookup is needed (it is failing anyway, see V1).
- **Done when:** a request to the key from another origin is refused, and the demo still works on both domains.

### S3 · Rotate or disable old keys in git history
- **Where:** `ned-wallet/.env` was committed from 30 Aug to 2 Sep (commits `8b111d6` to `d855af7`) and deleted in `22ab350` (8 Sep). It holds: Helius URLs with key `a62b…`, `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_PRIVY_APP_ID` and `EXPO_PUBLIC_PRIVY_CLIENT_ID`.
- **Problem:** deleting a file does not delete it from history. The repo is public.
- **Why it matters:** same as S1. Supabase is no longer used, so the project is an open leftover.
- **Fix:** revoke the Helius key `a62b…`; pause or delete the Supabase project; delete the Privy app. Do **not** rewrite git history: the rules want real commit history, and rotation is enough.
- **Done when:** each old key is dead. CL ticks register row 12 and writes the date in Compliance Hub.

> No private keys (keypairs, seed phrases) were found in the repo or its history. Scripts load keypairs from `~/.config/solana/`. Keep it that way.

---

## B. App copy and the Vietnam view (P0)

Word table: `docs/09-milestone-lock/product-spec.md` §6. Use: lock, release, refund, receive earnings, transfer, record. Never: pay / payment / thanh toán (for USDC), escrow (in UI), ký quỹ, invest, safe / an toàn, guaranteed, first, zero fees. Partner: "candidate payout partners (Due, Nium), simulated in the demo".

### C1 · Accept screen says "A licensed payout partner"
- **Where:** `ned-wallet/app/contracts/[fund]/accept.tsx:119`
- **Now:** "A licensed payout partner converts outside Vietnam and sends VND to your bank. Bank details are collected by the partner, not by N.E.D. Simulated in this demo."
- **Problem:** no partner has been chosen and none has agreed to this route. "Licensed" states as fact something we cannot prove. The partner is a team devnet wallet.
- **Why it matters:** a judge can ask "which licence?" and we have no answer. It also comes close to "licensed Vietnamese crypto partner", which is banned: Vietnam had issued no crypto licence as of 19 Sep 2026.
- **Fix (new text):** "A payout partner converts outside Vietnam and sends VND to your bank. In this demo the partner is simulated (candidates: Due, Nium). Bank details are collected by the partner, not by N.E.D."
- **Done when:** no user-facing string in either app contains "licensed partner" or "licensed payout partner".

### C2 · Disclosures promise disputes, but disputes are switched off
- **Where:** `ned-wallet/app/disclosures.tsx:19`; flag `ned-wallet/constants/features.ts:13` (`dispute: false`)
- **Now:** "Disputes have no neutral arbiter · A client can dispute and keep auto-release paused. Nobody outside the contract decides."
- **Problem:** in this build a client cannot dispute. The disclosure describes a feature users cannot reach.
- **Why it matters:** a disclosure that is false is worse than none. Judges may try it.
- **Fix:** while `FEATURES.dispute` is `false`, use:
  - Title: "No disputes in this demo"
  - Body: "In this version a client cannot open a dispute. If the client does not review before the review deadline, anyone can release the milestone to the freelancer. There is no neutral arbiter."

  If the team turns disputes on before the freeze, keep the old text and tell CL.
- **Done when:** the disclosure matches the flag in the build that is demoed.

### C3 · Phone hash: missing disclosure, and a reassuring line
- **Where:** `ned-wallet/app/(onboarding)/profile.tsx:283`; `ned-wallet/services/identity/phoneKey.ts` (scrypt with a fixed public salt); `ned-wallet/app/disclosures.tsx` (no line about it). `product-spec.md` §9 requires this disclosure, and the old landing page has it.
- **Now:** "Your @username and wallet address are public on Solana. Your phone number is never stored as plain text."
- **Problem:** the on-chain hash of a Vietnamese mobile number can be reversed by trying every possible number (about 5×10⁸). It is personal data, and it stays in transaction history even after `unlink_phone`.
- **Why it matters:** PDP Law 91/2025 and Decree 356/2025. "Never stored as plain text" is technically true but misleading.
- **Fix (recommended):** hide the optional phone field in the demo onboarding (phone linking is not in the demo script). If it stays:
  - profile.tsx: "Your @username and wallet address are public on Solana. If you add a phone number, a hash of it is also public, and it could be worked out from the hash. Leave it empty if you prefer."
  - New disclosure. Title: "Phone hash is public". Body: "If you add a phone number, a scrambled form (hash) of it is stored on Solana and cannot be deleted. Phone numbers have few possible values, so someone could work out the number."
- **Done when:** either the field is hidden, or both texts are live.

### C4 · "paid out in VND" and "VND payout"
- **Where and new text:**

| File | Now | Change to |
| --- | --- | --- |
| `ned-workspace/src/pages/Review.tsx:136` | "Through the payout partner, paid out in VND (simulated)" | "Through the payout partner, sent as VND (simulated)" |
| `ned-workspace/src/pages/Review.tsx:329` | "To the payout partner for {name} · paid out in VND (simulated)" | "To the payout partner for {name} · sent as VND (simulated)" |
| `ned-workspace/src/pages/Review.tsx:160` | "{name} accepted · VND payout" | "{name} accepted · receives VND" |
| `packages/ned-core/src/milestone/view.ts:86` (also shown by `MilestoneCard.tsx:61`) | "Released to payout partner · VND payout simulated in this demo" | "Released to payout partner · VND transfer simulated in this demo" |
| `packages/ned-core/src/actions.ts:332` | "Create your N.E.D profile before choosing a VND payout." | "Create your N.E.D profile before choosing to receive VND." |

- **Why it matters:** "pay" words are banned for this flow. The Review page is on the demo path, so judges will see it.
- **Done when:** `grep -rn -i "paid out\|VND payout"` on the app sources (excluding tests and comments) is empty.

### C5 · Vietnamese "money received" banner for every user, labelled USDC
- **Where:** `ned-wallet/stores/useNotificationStore.ts:126-131`, shown by `components/NotificationInAppBanner.tsx`
- **Now:** "Nhận tiền thành công" / "Bạn đã nhận được {amount} vào ví." with `currency: 'USDC'`, shown in every region. A test-SOL airdrop shows up as dollars.
- **Problem:**
  1. It tells a Vietnam-view user they "received money into the wallet", which contradicts our main legal claim.
  2. The product is English-only (confirmed with the organisers).
  3. A test-SOL airdrop is shown as USDC.
- **Why it matters:** Decree 52/2024 Art. 3(11) and 8(6); decision D18.
- **Fix:**
  - Vietnam view: turn off wallet-transfer banners. The contract notifications (locked, submitted, released) stay.
  - Outside Vietnam: English text "Received {amount} {token}" / "Sent {amount} {token}", using the real token symbol.
- **Done when:** in the Vietnam view, an airdrop or incoming transfer shows no banner. Outside Vietnam, the banner is English with the right token.

### V1 · The Vietnam view can open wallet screens by URL
- **Where:** `ned-wallet/app/send.tsx`, `receive.tsx`, `history.tsx`, `scan-qr.tsx`. None checks the region. Home only hides the buttons.
- **Problem:** a Vietnam-view user who types `/send` can send USDC. `receive.tsx:57` says "Only send USDC, SOL or Solana tokens". `history.tsx:244` shows old demo swaps with "N.E.D fee 0.25%". The send flow runs a **mainnet** `.sol` lookup (`services/identity/sns.ts`). The same screens are reachable inside the Workspace panel (`/wallet`).
- **Why it matters:** "The Vietnam user never holds, receives or sends crypto" is our first Q&A answer. One typed URL breaks it.
- **Fix:** add one guard, for example a `useRegionGuard()` hook or a check in `app/_layout.tsx`. When the region is `vn`, `/send`, `/receive`, `/history` and `/scan-qr` redirect to `/home`. Also remove the "N.E.D fee 0.25%" fallback in `history.tsx:244`.
- **Done when:** signed in with the Vietnam view, typing each URL lands on Home, both on GitHub Pages and inside the Workspace panel.

### V2 · Onboarding: faucet and SOL balance come before consent and residence
- **Where:** `ned-wallet/services/onboarding.ts:83-84`. Order today: welcome → setup → **fund** → consent → profile → residence. `app/(onboarding)/fund.tsx` calls the public devnet faucet with the wallet address and shows a SOL balance.
- **Problem:** we send the wallet address to a third party before asking for consent, and every Vietnam freelancer sees a SOL balance before choosing a residence.
- **Why it matters:** Decree 356/2025 Art. 6 (consent before processing). It also weakens the "no crypto in the Vietnam view" story.
- **Fix:**
  1. Ask for consent first. In `resolveOnboarding`, return `consent` before checking the balance.
  2. On the fund screen, label the balance "Test SOL for network fees on devnet. It has no value." The Disclosures line "Network fees use test SOL" already covers it. Before launch a fee payer covers fees (D8).
- **Done when:** a new wallet sees the consent screen before the fund screen.

---

## C. Consent and personal data (P0)

### P1 · Signing out or withdrawing consent deletes the consent log
- **Where:** `ned-wallet/services/storage.ts:116-119` (`executeHardReset` removes `@ned_consent_v1` and empties the consent store), called on every sign-out. `ned-wallet/app/settings.tsx:75-79` withdraws consent, then signs out. `stores/useConsentStore.ts` promises "the record is kept as a log".
- **Problem:** the time, scope and version of consent, and of the withdrawal, are erased on every ordinary sign-out.
- **Why it matters:** Decree 356/2025 Art. 6 requires us to be able to show consent was given. Our own code comment says the log is kept.
- **Fix:** keep `@ned_consent_v1` on sign-out. Remove it from `executeHardReset`, and keep `useConsentStore` state. `getConsent()` already ignores withdrawn or old-version records, so nothing else changes. Only an explicit "Delete all data on this device" action (if added) should clear it.
- **Done when:** accept → sign out → sign in shows the same `acceptedAt`. Withdraw → sign in shows the record with `withdrawnAt` set, and the consent screen appears again.

### P2 · Consent text does not cover everything we process
- **Where:** `ned-wallet/app/(onboarding)/consent.tsx:13` (`CONSENT_SCOPE`), rows at `:32-37`, checkbox text at `:70-71`
- **Problem:** the scope lists name, email, wallet address and Dynamic. We also process: @username (public, on-chain), an optional phone hash (on-chain), device public keys (on-chain, D22), encrypted brief and delivery (on-chain, permanent), contract titles (public), and RPC calls through Helius. Ably is used through Dynamic.
- **Why it matters:** consent must be specific (Decree 356/2025). Data on a blockchain cannot be erased, and users must know that before they agree.
- **Fix:**
  - Bump `CONSENT_VERSION` to 2, so everyone sees the new text once.
  - Add rows: "Username · public on Solana", "Phone number hash · optional, public on Solana", "Device key · public key on Solana", "Blockchain data · read through Helius (US)".
  - Scope array: `['google-account-name','email','wallet-address','login-provider-dynamic-us','username-onchain','phone-hash-onchain-optional','device-key-onchain','encrypted-contract-content-onchain','rpc-helius-us']`
  - New checkbox text:

    > I agree that N.E.D processes my Google account name, email and wallet address to run my account, that my login is handled by Dynamic in the United States, and that blockchain data is read through Helius. I understand that my @username, wallet address, device key, contract titles and encrypted contract content are written to Solana, where they are public or permanent and cannot be deleted. If I add a phone number, a hash of it is written there too. I can withdraw consent in Settings.

- **Done when:** the new text is live and the stored record shows version 2 with the new scope.

### P3 · The consent screen points to Terms and a Privacy Policy that do not exist
- **Where:** `ned-wallet/app/(onboarding)/consent.tsx:75-79`: "You can read the Terms, Privacy Policy and Disclosures before you agree." Only Disclosures is a link. No Terms or Privacy page exists in either app.
- **Problem:** we refer users to documents that are not there.
- **Why it matters:** a consent based on missing information is weak. This is also task-list Step 6 (due 5 Oct).
- **Fix:** add two short screens (`/privacy`, `/terms`) using the drafts in **Appendix 1 and 2**. Link them from the consent screen, Settings and the Workspace sign-in page. If that cannot be done by 8 Oct, change the sentence to "You can read the Disclosures before you agree." and remove the reference.
- **Done when:** every document named on the consent screen opens.

### P4 · The Workspace has no consent step; Google Fonts load before sign-in
- **Where:** `ned-workspace/src/App.tsx` (no consent gate); `ned-workspace/index.html:10-14` (fonts.googleapis.com); `ned-workspace/vercel.json` CSP allows Google Fonts.
- **Problem:** a client who uses only the computer never sees the consent screen. Every visitor's IP address goes to Google before any consent.
- **Why it matters:** clients are users too, and Decree 356/2025 applies to processing by N.E.D.
- **Fix:**
  1. After sign-in, the Workspace reads the same consent store. `/wallet` is same-origin, so `@ned_consent_v1` is in the same localStorage. If there is no valid consent, open the wallet panel at `/consent` and block actions until it is given.
  2. Self-host the three fonts (put the `woff2` files in `ned-workspace/public/fonts/`) and remove Google from `index.html` and the CSP.
- **Done when:** a new wallet signing in on the Workspace must agree before creating a contract, and the network tab shows no request to Google.

---

## D. Repo and competition rules (P0)

### R1 · The README describes the old wallet, not what runs
- **Where:** `README.md`: tagline "A Next-Generation Web3 Smart Wallet" (`:3`); intro (Neo-brutalism, Jupiter, `:15`); Overview (swap, xStocks, dApp browser, P2P by phone, `:38-49`); UI Showcase screenshots of the old app (`:57`); Features (`:65-68`); Jupiter badge (`:12`); "17 instructions" (the program has 21); "the contract screens are being redesigned… dev-only harness" (they exist now).
- **Problem:** the rules require a public repo whose README matches what runs. Judges read the README first.
- **Why it matters:** this can cost points, or be treated as misleading.
- **Fix:**
  - Rewrite the top half around Milestone Lock, using the one-liner from `product-spec.md` §1 (with C1 wording).
  - Add real screenshots of the contract screens, the Workspace and the Vietnam view.
  - List the live links and add a "Known limits" box (copy section G below).
  - Remove the Jupiter badge and the old features.
  - Update the Status table: program v1.2, 21 instructions, 43 tests, Workspace live.
  - Keep the technical sections, which are current.
- **Done when:** CL reads the README against the live app and every claim is true or marked "roadmap".

### R2 · The README claims MIT, but there is no LICENSE file
- **Where:** `README.md:241`; no `LICENSE` in the repo root
- **Fix:** the team decides. Either add a standard MIT `LICENSE` file (year 2026, team name), or remove the claim.
- **Done when:** the claim and the file agree.

---

## E. Pitch, Q&A and docs (P0)

### D1 · "Licensed partner" wording in the research doc and Q&A (owner: CL)
- **Where:** `docs/08-research/ned-research-and-compliance.md`: WH table lines 35 and 39, flow diagram line 50, parties table line 67, Judge Q&A 1. Also `docs/09-milestone-lock/product-spec.md:7` (PO).
- **Fix:** "payout partner (candidates: Due, Nium; simulated in the demo)". New Q&A 1 answer:

  > "In Vietnam crypto is not a lawful payment instrument under Decree 52/2024. That is why our Vietnamese user never receives crypto: the client locks USDC abroad, and a payout partner abroad would send VND by bank transfer. In this demo the partner is simulated; our candidates are Due and Nium. We hold no funds. Before real money moves, a lawyer must confirm that our software is not a crypto-asset service under Decree 284/2026."

### D2 · The Q&A answers do not match the current build (owner: CL)
| Q | Now says | Change to |
| --- | --- | --- |
| 2 Who holds the money? | "No N.E.D key can move it." | "The program does. No N.E.D key can move locked funds. Until the freeze the team can still upgrade the program; on 9 Oct the upgrade authority moves to a multisig." |
| 4 Personal data | addresses and hashes only | Add: "Briefs and deliveries are stored encrypted on Solana; only the two parties hold the key. Contract titles and device public keys are public." |
| 7 Client never reviews | "unless the client opened a dispute in time" | "After the review deadline anyone can release it to the freelancer. Disputes are switched off in this demo." (unless disputes are turned on) |
| 8 They disagree | "Funds stay locked; mutual cancel…" | "In this demo they can agree a split with a mutual cancel. A neutral reviewer is on the roadmap." |
| New: Can a Vietnam user switch the view? | — | "Residence is self-declared in the demo. At launch the payout partner's KYC decides who uses the VND path." |

### D3 · Decisions D1–D5 not confirmed (owner: PO, due 6 Oct)
`docs/09-milestone-lock/README.md` says the team may override D1–D5 "by 6 Oct". No confirmation is recorded. Write "Confirmed 6 Oct" (or the change) in the decision log, so the pitch, the app and the Q&A use the same rules.

### D4 · Survey go/no-go not recorded (owner: CL + PO, due 6 Oct)
D10 thresholds: go if ≥ 30% have lost money to a client and ≥ 30% say clients would lock money. Record the sample size and both numbers in `docs/tong-hop-tien-do.md` and the Hub. If below the threshold, the pitch uses only the sourced figures (68%, 2017; 85%, 2025) and calls Milestone Lock the technical demo.

---

## F. Should fix if there is time (P1)

| ID | Where | Problem → Fix |
| --- | --- | --- |
| F1 | `packages/ned-core/src/constants.ts:31-32` (rate 26,019.5, 2 Oct); hero numbers in `ned-wallet/app/(tabs)/index.tsx` and `ned-workspace/src/components/WalletPanel.tsx` | The rate has no source, and big VND numbers lack "≈". → Show "Wise mid-market rate, 2 Oct 2026" wherever "rate of 2 Oct" appears; prefix hero amounts with "≈". |
| F2 | `packages/ned-core/src/milestone/records.ts:267-303` | The CSV could be shown as proof of income, but it carries no warning. → Add a `note` column with "devnet test money; VND is an estimate at the 2 Oct rate; payout partner simulated; not tax advice". Name the file `ned-records-devnet.csv`. |
| F3 | `ned-wallet/locales/en.json`, `vi.json` (loaded by `services/i18n.ts`; only `activities.*` is used) | Unused old strings in the public bundle and repo: "thanh toán", "Miễn phí", "an toàn", "Instant & Free", a VNPAY → USDC on-ramp, "earn daily yield". → Delete every unused key. The hidden xStocks copy ("Amount to invest", `NED_FEE_BPS = 25`) stays hidden. Never demo it. |
| F4 | `ned-workspace/vercel.json` (`/wallet` headers) | CSP is Report-Only and `connect-src` allows `mainnet.helius-rpc.com`, `api.jup.ag`, `api.geckoterminal.com`. → Enforce it, and remove the three hosts if S1/S2 drop them. |
| F5 | Workspace `/new` editor and mobile new-contract step | The contract title (≤ 32 bytes) is public on Solana forever. → Add a hint under the field: "Public on Solana. Don't put names or personal details here." |
| F6 | new `.github/pull_request_template.md`, `.github/CODEOWNERS` | Copy changes reach `main` with no CL check. → The PR template gets a box: "User-facing text follows product-spec §6 and CL has reviewed". CODEOWNERS gives @F4ol4n review on `ned-wallet/app/**`, `ned-wallet/components/**`, `ned-workspace/src/pages/**`, `packages/ned-core/src/milestone/view.ts`, `README.md`, `docs/05-legal/**`. |
| F7 | `docs/08-research/ned-research-and-compliance.md` | Stale facts: 708 → 740 bytes (lines 95, 385); "twelve instructions" (line 93) → 13 Milestone Lock instructions incl. `post_note`, plus 3 device-key instructions (21 in the whole program); "contract terms: hash only, never the file" (line 365) → encrypted content on-chain (D15, D22); the bottom line's "zero lines of program code" (line 9) is outdated. CL updates. |
| F8 | `docs/02-thiet-ke/trang-thai-thiet-ke.md` §6/§8 | Still says "N.E.D fee 0.25%" and "Network fee free". → Add a "superseded for fees: no fee in v1 (D2)" banner. |
| F9 | landing-page repo (D21) | Not covered by this review. → Send CL the text and the link before it goes public. |
| F10 | Compliance Hub | No Due or Nium reply is logged (D5). → PO forwards replies; CL logs them. If none, the pitch says "partners contacted 2 Oct, no reply yet". |
| F11 | program upgrade authority | Planned for 9 Oct (spec §7). → Do it after the last deploy and record the multisig address in the README. |

Optional clarity: `ned-wallet/app/disclosures.tsx:17` "No licensed partner is connected in this demo." → "No payout partner is connected in this demo." (true either way, but simpler).

---

## G. Known limits: do not fix now, say them if asked (P2)

1. **Disputes have no timeout** (once switched on): a disputed milestone settles only by approve, `concede` or an agreed split, so a client can hold money. Roadmap: a timeout or a named reviewer.
2. **Phone link has no OTP:** anyone can link someone else's number to their wallet (already disclosed: "Phone numbers are not verified").
3. **Residence is self-declared:** the Vietnam view is a user choice. At launch, partner KYC decides.
4. **Encrypted content is permanent:** if a contract link leaks, its brief and delivery can be read forever.
5. **`payout_reference`** is a pseudonymous ID on-chain. The partner maps it to a person.
6. **Circle can freeze USDC:** a frozen account can block one milestone's release or refund (disclosed).
7. **Program notes and device keys:** `post_note` has no limit (spam is possible), and `DeviceKeys` has no close instruction. Both are low risk on devnet.
8. **Not audited, no KYC, devnet test money, payout partner simulated** (all disclosed).

---

## H. Sign-off (CL, 9 Oct)

- [ ] S1–S3 done (keys dead), register row 12 ticked
- [ ] C1–C5, V1–V2 live in both builds
- [ ] P1–P4 live; Terms and Privacy pages open
- [ ] R1–R2 done; README read against the live app
- [ ] D1–D4 done; Q&A sheet printed
- [ ] Walkthrough on the live app: sign up → create (client) → accept and choose VND (Vietnam view) → lock → submit → approve → auto-release → refund, with no banned word on any screen
- [ ] Team message sent: "Compliance sign-off done. Known limits: section G. Legal questions in Q&A come to me."

---

## Appendix 1 · Privacy notice (draft for `/privacy`, devnet pilot)

**N.E.D privacy notice · pilot version 1 · 6 Oct 2026**

N.E.D is a student project for UniHackFest 2026. It runs on Solana devnet with test money.

**What we process and why**
- **Google account name and email,** to sign you in. Login is run by Dynamic (United States).
- **Wallet address,** to run your account and your contracts.
- **@username,** so the other party can find you.
- **Phone number** (optional): only a hash goes on Solana. The number itself stays on your device.
- **Device key:** a public key on Solana, so your contracts open on your other devices.
- **Contract data:** titles, amounts and deadlines are public on Solana. Briefs and deliveries are encrypted, and only the two parties hold the key.
- **Bank details and ID: never processed by N.E.D.** In a real launch, a payout partner would collect them in its own flow. In this demo the partner is simulated.

**Where data goes:** Dynamic (login, United States), Helius (blockchain data, United States), Vercel and GitHub Pages (hosting), Solana devnet (public blockchain).

**Data on Solana is public or permanent** and cannot be deleted by anyone, including N.E.D.

**Your choices:** you can withdraw consent in Settings, and N.E.D then stops running your account. Data stored on your device is removed when you clear the app's data. We keep a record of when you gave or withdrew consent.

**Contact:** [team email]. This notice follows Personal Data Protection Law 91/2025 and Decree 356/2025 as we understand them. It has not been reviewed by a lawyer yet.

## Appendix 2 · Terms of use (draft for `/terms`, devnet pilot)

**N.E.D terms of use · pilot version 1 · 6 Oct 2026**

1. **Pilot only.** N.E.D runs on Solana devnet with test tokens that have no value. Do not send real money.
2. **What N.E.D is.** Software that lets a client lock test USDC per milestone in a Solana program and release it to the freelancer. N.E.D holds no funds, converts nothing and charges no fee.
3. **What N.E.D is not.** It is not a payment service, a bank, an exchange or a marketplace. It gives no legal, tax or financial advice.
4. **Vietnam.** Users who choose the Vietnam view see amounts in VND as estimates and never hold crypto. The payout partner is simulated in this demo; no VND is sent.
5. **Your keys, your actions.** Transactions you sign cannot be reversed. Release and refund follow the deadlines written into the contract.
6. **No warranty.** The program has not been audited. Use the pilot at your own risk.
7. **Changes.** These terms may change before any launch. A real launch needs a legal review and new terms.
