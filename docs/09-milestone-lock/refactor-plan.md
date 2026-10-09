# Refactor plan: from wallet demo to Milestone Lock (3 → 10 Oct 2026)

> **3 Oct 2026:** the schedule (section 4) and the order of the remaining work are replaced by [`build-plan.md`](build-plan.md). PR4–PR6 content below still applies as the detail for build-plan B3–B5; section 0 "Where we are" is out of date (see `docs/progress-log.md`).

Status: **plan, 3 Oct 2026**, based on a full read of `main` at `dbfe2ea`. It turns [`product-spec.md`](product-spec.md) and [`program-spec.md`](program-spec.md) into an ordered list of pull requests. The owner of each estimate is the developer; the hours are estimates \[Assumption\] for one developer working with an AI coding assistant.

## 0. Summary

**Where we are.**

- Identity (`@username`, phone hash) and devnet USDC send work end to end. Onboarding, Dynamic login and the web deploy also work. The program has 10 tests.
- **None of Milestone Lock exists.** There is no program code, no client code and no screen.
- About 4,600 lines of the app have no importers.
- Swap and xStocks sit on the Home screen.
- Each of these is defined in two to six separate places, with a different value or order in each: the USDC mint, the RPC connection and the USD→VND rate.

**What we do.** Seven pull requests, in this order:

| PR | Content | When |
| --- | --- | --- |
| **PR0** | Foundations: one chain config, bug fixes, a generic send helper, and a spike to check that the Anchor JS coder works with our IDL | 3 Oct |
| **PR1** | Program: split `lib.rs` into modules, then add the 8 P0 Milestone Lock instructions and their tests; deploy to devnet | 3–5 Oct |
| **PR2** | Program: the P1 group (`dispute`, `concede`, cancel pair) | 5–6 Oct, cuttable |
| **PR3** | App: `services/milestone/` (instruction builders, queries, formatting) with unit tests | 4–6 Oct |
| **PR4** | App: hide, delete and adapt. Feature flags, new navigation, Vietnam view, consent screen, Disclosures, copy fixes | 4–5 Oct |
| **PR5** | App: contract screens (list, new, detail with action sheets) | 5–7 Oct |
| **PR6** | Records screen and contract notifications | 7 Oct, cuttable |
| **PR7** | Demo operations: partner wallet, recycle script, README, deploy, security clean-up | 6–8 Oct |

**Code freeze is 9 Oct.**

**Biggest risks:**

1. One developer for about 59 hours of work, or 50 without the cuttable PR2 and PR6 (section 7).
2. The Anchor JS client (0.32) has never been used with this program in the app; PR0 tests this first.
3. **The demo needs a second Google account for Mia**, because each Google account gives exactly one wallet.
4. Old leaked keys still sit in git history and must be rotated before a public pitch.

## 1. Current state (facts from the code)

### 1.1 Program (`ned_program/`)

- **Layout:** one file, `programs/ned-program/src/lib.rs` (478 lines).
- **Identity instructions:** `create_profile`, `link_phone`, `unlink_phone`, `update_username`.
- **Transfer instruction:** `transfer_stablecoin`.
- **Errors:** `NedError` codes 6000–6008, ending with `InvalidAmount`.
- **Tests:** `tests/identity.rs` has 10 LiteSVM tests. They load `target/deploy/ned_program.so`.
  - Its helpers can place raw mint and token accounts at any address.
  - It has no helpers for associated token account (ATA) addresses, for several signers, or for moving the clock.
- **Clashes:** none with the spec. Seeds `fund` and `vault`, and the new type and error names, are all unused.
- **Not available here:** no CI. The Anchor and Solana CLIs are not installed in the cloud workspace; building and deploying happen on the developer's machine.

### 1.2 App (`ned-wallet/`, Expo 57, web first)

**Signing.** `useAuth()` exposes `signTransaction`, `signAndSendTransaction` and `walletAddress`. `signAndSendTransaction` does not wait for confirmation.

**Reusable patterns:**

- The best send pattern to copy is `hooks/useOnchainTransfer.ts:21-47`:
  1. `prepareTransactionCost`;
  2. check SOL;
  3. `signTransaction`;
  4. `sendRawTransaction`;
  5. `confirmTransaction({signature, blockhash, lastValidBlockHeight})`;
  6. check `value.err`.
- **Instruction building:** the app builds instructions by hand from the IDL JSON (`services/identity/dualPda.ts:152-174`). Only the discriminator and the account order come from the IDL; the Borsh encoding of arguments is hand-written.
- **Anchor client:** `services/anchorClient.ts` (Anchor 0.32 `Program`) has **no importers**.
- **Error messages:** `describeTxError` in `services/onboarding.ts:94-111` maps program error codes from the IDL, but its fallback text only talks about profiles.

**Duplicated constants:**

| What | Places |
| --- | --- |
| USDC devnet mint | 4: `solanaConnection.ts:8`, `solana.ts:21`, `jupiter/index.ts:16`, `jupiter/core.ts:3` |
| USDC mainnet mint | 3; the one in `jupiter/core.ts:1` is wrong |
| `Connection` objects | 6, with different RPC env-var orders. `anchorClient.ts` alone reads `EXPO_PUBLIC_SOLANA_RPC_URL` |
| USD→VND rate | 3 (25,000 and 25,400), all different from the spec's 26,019.5 |

**Confirmed bugs:**

| # | Bug | Where |
| --- | --- | --- |
| B1 | `getUsdcTokenBalance` adds every SPL and Token-2022 balance as "USDC" when the USDC account is empty | `services/solana.ts:215-300` (also `solanaConnection.ts:133-150`) |
| B2 | Mainnet USDC mint is missing a `q`; its test compares the file with itself | `services/jupiter/core.ts:1`, `jupiter/__tests__/jupiter.test.ts:3` |
| B3 | Profile creation never checks `value.err` after confirmation | `app/(onboarding)/profile.tsx:158-159` |
| B4 | ATA creation uses the non-idempotent instruction; Milestone Lock needs the idempotent one | `services/solana.ts:75-96` |
| B5 | Fake Mobile Wallet Adapter signing (returns unsigned payloads) is mounted around the whole app | `contexts/MwaProvider.tsx:89,107-127`, `app/_layout.tsx:68` |
| B6 | Dev page `poc-dynamic` (airdrop and test buttons) is public in the production web build | `app/_layout.tsx:21` |
| B7 | The persisted network store can say `mainnet-beta` while signing is devnet-only | `stores/useNetworkStore.ts`, `services/p2pTransfer.ts:12` |
| B8 | A real-looking Jupiter key is committed in `.env.example:18`. Old relayer, Helius and Supabase keys remain in git history (`docs/progress-log.md`) | — |

**Navigation:**

- The visible bar is `components/wallet/WalletNav.tsx:9-14`: Home · History · xStocks · Settings.
- The Home tiles are `app/(tabs)/index.tsx:116-129`: RECEIVE · SEND · SWAP · XSTOCKS.
- The onboarding "mode" step writes only `@ned_wallet_mode_v1`. Only `services/onboarding.ts:71` and the Settings card read it, so replacing it is low-risk.

**Copy:**

- About 15 strings on the demo path break the word rules. Examples: "invest" (`welcome.tsx:57`), "pay" (`receive.tsx:56,93`, `SendFlow.tsx:121`, `mode.tsx:32`), "safe" (`settings.tsx:128,277`) and "free" (`fund.tsx:104`).
- Vietnamese is turned off at `services/i18n.ts:40`. Demo-path screens use hard-coded English.

**Tests and tooling:**

- 8 `node --test` files, three npm scripts, no Jest, no CI.
- `history.test.ts` and `amountInput.test.ts` are not run by any script.

**Deploy:** `pnpm run predeploy && pnpm run deploy` publishes to `gh-pages`, with base URL `/Unihackfest-2026`. It is run by hand on the developer's machine.

## 2. Target architecture

```
ned_program/programs/ned-program/src/
  lib.rs                     declare_id, #[program] (thin: each fn calls a handler)
  constants.rs               identity seeds + FUND_SEED, VAULT_SEED, USDC_MINT, PAYOUT_PARTNERS (cfg mainnet), limits
  errors.rs                  NedError (append only, after InvalidAmount)
  events.rs
  state/{identity.rs, shared_fund.rs}
  instructions/identity.rs   moved as is (no behaviour change)
  instructions/milestone/{create_fund, accept, lock, submit, approve, release_after_review,
                          refund, close, dispute, concede, propose_cancel, accept_cancel}.rs
  instructions/milestone/common.rs   pay_from_vault, settle_if_done, clear_cancel, check_work_window
tests/
  common/mod.rs              setup, send_signed(multi-signer), clock, USDC mint at fixed address, ATA helper, CU log
  identity.rs                unchanged 10 tests
  milestone.rs               program-spec section 8 (15 groups)

ned-wallet/
  constants/chain.ts         ONE place: cluster, program ID, USDC mints, token/ATA programs, DEMO_PAYOUT_PARTNER, USD_VND_RATE + date
  constants/features.ts      FEATURES = { swap:false, xstocks:false, dapps:false, mwa:false, dispute:false, records:true }
  services/chain/
    connection.ts            ONE devnet Connection (env order fixed), used everywhere
    send.ts                  sendAndConfirm(tx, auth): cost preview, sign, send, confirm, value.err, error mapping
    idl.ts                   load IDL + BorshCoder (or hand-written Borsh, see PR0 spike), buildIx(name, accounts, args)
    errors.ts                describeTxError generalised: program error code → English message from IDL
    ata.ts                   ata(mint, owner, allowOffCurve), createAtaIdempotentIx
  services/milestone/
    pda.ts                   fundPda(creator, fundId), vaultPda(fund)
    client.ts                build{CreateFund,Accept,Lock,Submit,Approve,ReleaseAfterReview,Refund,Close,...}Tx
    queries.ts               listFunds(wallet, role) via getProgramAccounts (dataSize 708, discriminator, memcmp 12 / 44), getFund
    model.ts                 decoded SharedFund → view model: per-role status labels (design prompt section 2), next action
    format.ts                USDC base units ↔ display, ≈ VND estimate, deadlines
    evidence.ts              sha256(link) with @noble/hashes
    __tests__/*.test.ts      node --test
  hooks/useChainTime.ts      chain clock (slot → block time, refreshed every 30 s, ticks locally)
  hooks/useFunds.ts          list + refresh + polling while a screen is open
  stores/useRegionStore.ts   per wallet 'vn' | 'intl' (key @ned_region_v1); replaces wallet mode on the demo path
  app/(onboarding)/consent.tsx, region.tsx          (mode.tsx hidden)
  app/(tabs)/index.tsx       Home VN / Intl
  app/contracts/index.tsx, new.tsx, [fund].tsx       actions as bottom sheets on [fund]
  app/records.tsx, app/disclosures.tsx
  components/contracts/      StatusChip, MilestoneCard, Countdown, AmountVND, DestinationCard,
                             FeeBreakdown, VaultProof, RuleList, ActionBanner, DevnetBadge
```

**Five design choices:**

1. **No Anchor `Program` or provider at runtime.** Use the IDL only, through a coder, and keep the existing send pattern. This preserves the cost preview and the `value.err` check, and avoids depending on how Anchor 0.32 handles the 1.1.2 IDL. If the PR0 spike shows `BorshCoder` from `@coral-xyz/anchor` 0.32 fails to encode or decode our types, fall back to hand-written Borsh, as `dualPda.ts` already does. The layout is fixed in the spec, so this is about 2 extra hours.
2. **Hide with flags, delete only what is dead.** Swap, xStocks and the dApp browser stay in the repo behind `constants/features.ts`: their entry points disappear, and their routes redirect home when the flag is off. Modules with no importers are deleted in a separate commit so the diff is easy to review.
3. **Actions as sheets on the contract detail.** One route `contracts/[fund]` holds accept, lock, submit, review, release, refund, close and the P1 sheets. This means fewer routes and no state lost between screens; the design boards map onto sheets.
4. **Region instead of wallet mode.** `useRegionStore` drives the Vietnam view: no USDC balance, amounts in ≈ VND, partner destination pre-selected. The Simple/Crypto mode leaves the demo path; its store stays for the hidden screens.
5. **No backend, as before.** Lists come from `getProgramAccounts` with `memcmp` filters. The partner is a fixed allowlisted address with a recipient reference. Records come from open contracts plus a local cache of releases seen (limitation below).

## 3. Pull requests in order

Every PR must:

- keep the identity tests green;
- run its new tests;
- be reviewed for wording by the Compliance Lead when it changes UI text;
- update `docs/progress-log.md` when merged.

### PR0 · Foundations and spike (3 Oct, about 5 h)

| Step | Files | Done when |
| --- | --- | --- |
| One chain config | new `constants/chain.ts`; replace the duplicates in `solana.ts`, `solanaConnection.ts`, `jupiter/index.ts`, `anchorClient.ts`, `p2pTransfer.ts`; delete `jupiter/core.ts` and point its test at `jupiter/index.ts` | `grep` finds one definition each of the USDC mints and program ID; B2 fixed |
| One connection | new `services/chain/connection.ts`; `solana.ts`, `resolve.ts` and `anchorClient` import it | one env-var order, documented in `.env.example` |
| Fix B1 | `getUsdcTokenBalance` and `fetchUsdcBalance` read only the USDC ATA, in integer base units | unit test with a fake connection: empty USDC account plus another token gives 0 |
| Generic send | new `services/chain/send.ts` (from `useOnchainTransfer`), `services/chain/errors.ts` (from `describeTxError`); `useOnchainTransfer` and `profile.tsx` use it | B3 fixed: a failed transaction shows an error |
| ATA helper | `services/chain/ata.ts` with `createAtaIdempotentIx` (data `[1]`) | B4 covered |
| **Spike** | `services/chain/idl.ts`: encode a sample `create_fund` (String, Vec of structs, u64, Pubkey) and decode a 708-byte buffer with `BorshCoder`, using a draft IDL written from the spec | a test passes; otherwise switch to hand-written Borsh and record the result in this file |
| Test script | `package.json`: `"test"` runs all `node --test` files, including `history` and `amountInput` | `node --test` runs everything green |

### PR1 · Program P0 (3–5 Oct, about 14 h)

| Step | Done when |
| --- | --- |
| Split `lib.rs` into the layout of section 2. **No change to identity behaviour**; keep the `pub use` re-exports the tests rely on | 10 identity tests pass unchanged |
| Move the test helpers to `tests/common/mod.rs`; add `send_signed` (several signers), `set_clock`, USDC mint at the fixed address, ATA derivation, compute-unit log | helpers used by both test files |
| `SharedFund`, `Milestone`, enums, constants, errors and events exactly as in the program spec, sections 2–6 | layout test: size 708, `client` at offset 12, `freelancer` at offset 44 |
| `create_fund`, `accept`, `lock`, `submit`, `approve`, `release_after_review`, `refund`, `close` | program spec section 8, tests 1–6 and 9–15, pass |
| Generate `DEMO_PAYOUT_PARTNER` (keypair stays outside the repo) and put its public key in `PAYOUT_PARTNERS` | Vietnam-path test uses the real public key |
| Build, copy the IDL (JSON and `.ts`), deploy to devnet. Run `solana program show` first, and `solana program extend` if needed (the deploy wallet has about 8.5 devnet SOL); upgrade the IDL | deploy signature, program size and upgrade authority recorded in `progress-log.md` |

### PR2 · Program P1 group (5–6 Oct, about 6 h, cut as one block)

Add `dispute`, `concede`, `propose_cancel` and `accept_cancel`, and clear the cancel proposal on every status change. Program spec tests 7, 8 and the cancel half of 13 must pass. If PR1 is late on 5 Oct evening, skip this PR. The status values stay in the account and the app shows no dispute buttons.

### PR3 · App services (4–6 Oct, about 7 h; can start from the draft IDL)

| Module | Content | Tests |
| --- | --- | --- |
| `pda.ts` | `fundPda(creator, fundId)`, `vaultPda(fund)` | matches seeds from a program test vector |
| `client.ts` | One builder per instruction. It returns an unsigned `Transaction` with an idempotent ATA instruction where needed (`lock`: client ATA; `approve` and `release`: destination ATA; `refund`, `close`, `concede`: client ATA) | account order equals the IDL |
| `queries.ts` | `listFunds(wallet, 'client' \| 'freelancer')`: filters `dataSize = 708`, discriminator at offset 0, wallet at 12 or 44. `getFund(pubkey)` | decode a recorded devnet account |
| `model.ts` | Status per role and view (labels from the design prompt section 2); next action per role; "needs your action" list; work-window and deadline checks matching program spec 3.4 | table-driven tests for every state |
| `format.ts` | USDC base units; `≈ 520,000 VND (estimate)` from `USD_VND_RATE` and its date; deadlines | yes |
| `evidence.ts` | SHA-256 of a link; check whether a pasted link matches | yes |
| `hooks/useChainTime.ts`, `hooks/useFunds.ts` | chain clock; list with refresh and polling (8 s while a contract screen is open, like `useNotificationSync`) | manual |

### PR4 · Hide, delete, adapt (4–5 Oct, about 6 h)

**Hide** (code stays; entry points removed; routes redirect when the flag is off):

- `app/swap.tsx`, `app/xstocks/*`, `services/jupiter/*`, `services/xstocks*`, `services/demoLedger*`, `stores/useXStocksStore.ts`, `components/xstocks/*`, `scripts/xstocks-diagnose.ts`;
- demo-swap entries in `app/history.tsx:20,76,137-143,243-247`;
- Home tiles and rows: `app/(tabs)/index.tsx:20,29,68-73,123-128,190,284-323`;
- `app/(onboarding)/mode.tsx` and the wallet-mode card in `app/settings.tsx:201-220`.

**Delete** (no importers, or template leftovers):

- `app/modal.tsx`, `app/login.tsx`;
- `app/(tabs)/card.tsx`, `app/(tabs)/overview.tsx`;
- `app/(tabs)/transfer-hub.tsx` and `app/transfer-hub.tsx`;
- `app/(tabs)/miniapps.tsx` and `app/mini-app.tsx`;
- `hooks/useWeb3Bridge.ts`, `components/MiniAppSignatureModal.tsx`, `constants/mockDAppHtml.ts`;
- `contexts/MwaProvider.tsx`, `components/mwa/*`, `services/mwa/*`;
- `components/DepositModal.tsx`, `components/PhoneLinkingModal.tsx`;
- the neo components: `components/neo/AddStablecoinModal.tsx`, `AddSubWalletModal.tsx`, `NeoBalanceCard.tsx`, `NeoPhysicalWalletCard.tsx`, `NeoSwapModal.tsx`. Then delete `NeoButton`, `NeoCard` and `tokens` if nothing else imports them;
- `components/SendModal.tsx`, `components/TransactionReceiptModal.tsx` (only used by transfer-hub);
- hooks `useSubWallets.ts`, `useTimeOfDay.ts`, `useUsdcBalance.ts`, `useOnchainBalance.ts`;
- `stores/useWalletCardsStore.ts` (after removing its uses in `storage.ts` and `useUserStore.ts`);
- the template components `themed-*`, `ui/*`, `external-link`, `haptic-tab`, `hooks/use-color-scheme*`, `hooks/use-theme-color`, `constants/theme.ts`;
- `scripts/deploy-web.js` and the `deploy:web` script (old Vercel deploy);
- the dead exports listed in `services/storage.ts`, `solana.ts` (`formatFiatBalance`, `getAccountDisplayBalance`) and `useAuth().getJwt`.

Run the type check (`tsc --noEmit`) and the web export after the deletions.

**Adapt:**

| Item | Change |
| --- | --- |
| `app/_layout.tsx` | Remove `MwaProvider` (B5); remove `poc-dynamic` from `PUBLIC_SEGMENTS`, or delete the page (B6); register `contracts/*`, `records` and `disclosures`; add an onboarding-complete check so deep links do not skip the profile |
| Navigation | `WalletNav`: Home · Contracts · Records · Settings |
| Onboarding | welcome → setup → (fund) → **consent** → profile → **region** → home. `services/onboarding.ts:71` checks region instead of mode. Store a consent log locally (`@ned_consent_v1`: time, scope, wallet; Decree 356/2025 Art. 6). New copy as in the design prompt |
| Settings | "I live in Vietnam" switch, Display currency, Consent (view or withdraw), Disclosures, DEVNET badge; copy fixes at lines 128, 151, 277, 285 |
| Copy fixes | `welcome.tsx:15,57`, `fund.tsx:104`, `services/onboarding.ts:108`, `receive.tsx:56,93`, `SendFlow.tsx:121`; itemised fee lines instead of "free" |
| Network | Pin devnet for the demo (B7): ignore a persisted `mainnet-beta` value, or reset it |
| `executeHardReset` | Also clears the region and consent keys |

### PR5 · Contract screens (5–7 Oct, about 14 h)

| Route or sheet | Content (design prompt section 5) | P |
| --- | --- | --- |
| `contracts/index.tsx` | As freelancer / As client; filters; status chips; empty states | P0 |
| `contracts/new.tsx` | Three steps (freelancer by `resolveRecipient` with `fresh: true` before signing; job and milestones with the validation rules of program spec 3.4; review with itemised fees), slide to create, then a share sheet with the link and QR code | P0 |
| `contracts/[fund].tsx` | Role-aware detail; destination row; vault proof with an Explorer link; milestone timeline with countdowns; context action button | P0 |
| Sheets on the detail | Accept and choose the destination (the app passes the freelancer's own address, or `DEMO_PAYOUT_PARTNER` plus the reference); Lock (balance check, faucet link); Submit (link → fingerprint); Review (paste link, "Matches ✓", approve); Release now / Refund now for anyone; Close | P0 |
| P1 sheets | Dispute, concede, propose split, accept split; shown only when `FEATURES.dispute` is on | P1 |
| Home | Vietnam view (locked ≈ VND, received this month, needs-your-action, contract preview) and international view (USDC balance, locked, actions) | P0 |

Use the `@/components/design` primitives (`Screen`, `Header`, `Card`, `ListRow`, `InfoRow`, `Badge`, `Notice`, `Button`), plus `SlideConfirm` and `AmountKeypad`. Do not use the neo components.

### PR6 · Records and notifications (7 Oct, about 3 h, cuttable)

- **`app/records.tsx`:** releases grouped by month, in ≈ VND for the Vietnam view and USDC for the international view, with a CSV export and the disclaimer.
- **Source:** a local cache (`@ned_records_v1:<wallet>`), brought up to date from the chain (`@ned/core` `syncRecords`, built in B5 on 3 Oct):
  - open contracts: when a milestone shows as released, that contract's transactions give the date, the release transaction and the amount;
  - the wallet's own history: the freelancer signs `accept`, so its signatures list every contract it joined, **including contracts closed on another device**. Each closed contract is read once.
- **Limitation:** the first scan reads the newest 100 signatures of the wallet (about 13 s on devnet with Helius), and later scans read only newer ones. A contract accepted before those 100 is missing. Launch would read program events from an indexer.
- **Notifications:** contract changes (new contract, locked, submitted, released) go through `useNotificationStore.addNotification` and `triggerBanner`.

### PR7 · Demo operations and clean-up (6–8 Oct, about 4 h)

- `scripts/recycle-demo-usdc.ts`: sends USDC from `DEMO_PAYOUT_PARTNER` back to Mia. It reads the keypair path from an argument and never stores it in the repo.
- `scripts/milestone-devnet.ts`: a smoke run of the full cycle with local keypairs, for testing only.
- **Two Google accounts:** Mia (client) needs a second Google account, so the demo has two wallets. Create her profile on devnet by 6 Oct.
- **Security (B8):**
  - blank the Jupiter key in `.env.example`;
  - rotate the old relayer, Helius and Supabase keys and drain the relayer wallet (owner action);
  - restrict the Helius key by domain.
- **README:** rewrite for Milestone Lock (what runs, how to test, disclosures). Add a LICENSE file or remove the MIT claim. Replace old screenshots.
- **Web deploy:** check on iPhone Safari and desktop Chrome with two accounts; record the compute-unit table for the deck.

## 4. Schedule

| Date | Developer | Design (Ngân, Đan) | CL (Chính) | Biz (Thành Đạt) |
| --- | --- | --- | --- | --- |
| Fri 3 Oct | PR0; start PR1 (split + account) | Redesign boards A–C from the design prompt | Review copy list in PR4 | Demo data and second Google account for Mia |
| Sat 4 Oct | PR1 instructions + tests; PR4 | Boards D–F (contract flows) | Survey running; consent text final | Unit-economics slide |
| Sun 5 Oct | PR1 deploy; PR3; start PR5 | Boards G–J; component sheet | Interviews | — |
| Mon 6 Oct | PR5 (list, new, detail); PR2 if PR1 is done | Hand-off; review the first screens | Survey go/no-go with PO | Deck draft |
| Tue 7 Oct | PR5 sheets; PR6 | UI review on device | Legal clinic questions | — |
| Wed 8 Oct | Bug fixes; PR7; full rehearsal of the demo on devnet | Final polish | Q&A drill | Rehearse numbers |
| Thu 9 Oct | **Code freeze**; backup video; deploy | — | **Compliance sign-off** | Send slides |
| Fri 10 Oct | Final | Booth | Q&A | Q&A |

**Cut order** (same as product spec section 8):

1. Blink link.
2. PR2 and its sheets.
3. Vietnamese UI.
4. PR6.
5. Home card details.

**Never cut:**

- the 8 P0 instructions and their tests;
- the contract list, new, detail and P0 sheets;
- the Vietnam view in ≈ VND.

## 5. Testing

| Layer | How | When |
| --- | --- | --- |
| Program | LiteSVM, program spec section 8 plus the 10 identity tests: `anchor build && cargo test` | every program PR |
| Services | `node --test` (new `test` script) for pda, model, format, evidence, the chain config and the balance fix | every app PR |
| Type and build | `tsc --noEmit`, `npx expo export --platform web` | every app PR |
| Devnet | `scripts/milestone-devnet.ts` full cycle; then a manual run with two browsers and two Google accounts following product spec section 7 | after PR1 deploy, then daily from 7 Oct |
| Wording | Compliance Lead checks every screen against product spec section 6 | PR4, PR5, 8 Oct |

## 6. Definition of done for code freeze (9 Oct)

- [ ] Demo script (product spec section 7) runs twice in a row on the deployed web build, with no manual fixes
- [ ] All P0 program tests and the 10 identity tests pass; the compute-unit table is recorded
- [ ] No Swap, xStocks or dApps entry point; no USDC balance in the Vietnam view; no banned words on the demo path
- [ ] Disclosures, consent, the DEVNET badge and itemised fees are on every money screen
- [ ] README matches what runs; deploy signature, program size and upgrade authority are recorded
- [ ] Old keys rotated (owner)

## 7. Risks

| Risk | Effect | Mitigation |
| --- | --- | --- |
| About 59 h of planned work (PR0–PR7) for one developer in 6 days | Late screens | Cut order above; P1 and Records are designed to drop cleanly; screens reuse the design primitives; the AI assistant writes tests from the spec |
| Anchor JS 0.32 coder does not match the 1.1.2 IDL | No client | PR0 spike on day 1; hand-written Borsh fallback (+2 h) |
| Program grows past its allocated size | Deploy fails | `solana program show` first; extend with the deploy wallet's devnet SOL |
| `getProgramAccounts` slow or rate-limited on devnet RPC | Empty lists | `dataSize` + `memcmp` filters; Helius devnet URL; cache the last list |
| Only one Google account | No second wallet for the demo | Second account for Mia by 6 Oct (Biz) |
| Faucet limits (20 USDC per 2 h) | Not enough test USDC | Claims on 7 and 8 Oct; the recycle script |
| Dynamic signing differences on iPhone Safari | Demo device fails | Test on Safari from 6 Oct; desktop Chrome as backup; backup video |
| Leaked keys in git history | Reputational risk with a public repo | Rotate before the final (owner) |
