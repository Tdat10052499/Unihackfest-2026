# Milestone Lock: program specification (v1.1, build target for 10 Oct 2026)

Status: **build spec, frozen for coding on 3 Oct 2026** (reviewed on 2–3 Oct; fixes R1–R12 in [`README.md`](README.md#review-fixes-3-oct)). **v1.1 amendment (3 Oct, decision D14):** `brief_hash`, non-zero evidence and `post_note`; sections 2, 3.1, 4, 4.1, 5, 6, 8 and 9 changed; build order in [`build-plan.md`](build-plan.md) phase A. Product rules are in [`product-spec.md`](product-spec.md); the decisions behind them are in [`README.md`](README.md#decision-log). If code and this file disagree, fix one of them in the same pull request.

Scope: add Milestone Lock to the existing Anchor program `ned_program` (`ned_program/programs/ned-program/src/lib.rs`, program ID `8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh`, Anchor 1.1.2, Rust 1.89). The identity instructions, accounts and error codes stay unchanged.

## 1. Rules the program enforces

1. Money moves only by the rules in this file. No N.E.D, admin, arbiter or upgrade key can move funds out of a vault.
2. **Destination fixed before lock.** The freelancer sets the payout destination in `accept`; nothing can change it afterwards, and `lock` is only possible after `accept`. Every release goes to the associated token account (ATA) of `payout_destination`.
3. **The signer and the destination are different fields.** `freelancer` is the wallet that signs `accept`, `submit` and `concede`. `payout_destination` is where money goes:
   - the freelancer's own wallet (`OwnWallet`, international path);
   - an address on the program's payout-partner allowlist (`PayoutPartner`, Vietnam path), together with a 32-byte `payout_reference` that tells the partner which recipient a release belongs to.

   The allowlist stops a client from handing the freelancer an address the client controls. The reference is a hash of the recipient ID issued by the partner; it is never a name, bank account or other personal data.
4. Payouts use stored amounts, never `vault.amount`.
5. Only milestone slots `0..milestone_count` exist. Every loop, sum, minimum and "all terminal" check covers only those slots. Every per-index instruction requires `index < milestone_count`.
6. No fee logic in v1. N.E.D charges nothing during the competition (legal guard, [`README.md`](README.md#decision-log) D2).

## 2. Constants

| Name | Value | Note |
| --- | --- | --- |
| `FUND_SEED` | `b"fund"` | |
| `VAULT_SEED` | `b"vault"` | |
| `USDC_MINT` | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` | Circle devnet USDC, 6 decimals. Mainnet (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`) only behind a `mainnet` cargo feature, after audit |
| `PAYOUT_PARTNERS` | `[DEMO_PAYOUT_PARTNER]` | Devnet: one team-controlled wallet. Generate the keypair before the first build and keep it outside the repo; put only its public key here and in `ned-wallet/constants/`. Gated behind the `mainnet` cargo feature like `USDC_MINT`: the mainnet list stays empty until a partner signs up. If a partner requires one address per recipient instead of a reference, use partner attestations (roadmap) |
| `MAX_MILESTONES` | `5` | |
| `MAX_CONTRACT_AMOUNT` | `1_000_000_000` (1,000 USDC) | Demo cap, AML control \[Assumption\] |
| `MIN_WORK_WINDOW_SECS` | `60` | Time the freelancer has between lock and the first submission deadline. Devnet value; launch 24 h (`86_400`) \[Assumption\] |
| `MIN_REVIEW_WINDOW_SECS` | `60` | Devnet value; launch 72 h (`259_200`) \[Assumption\] |
| `TITLE_MAX_LEN` | `32` bytes UTF-8 | No personal data in titles (stored on-chain, public) |
| `ACCOUNT_VERSION` | `2` | `1` = the 708-byte layout deployed on 2–3 Oct (no `brief_hash`) |
| `NOTE_MAX_LEN` | `900` bytes | `post_note` data per transaction part |
| `NOTE_MAX_PARTS` | `8` | |

## 3. Accounts and types

### 3.1 `SharedFund`, PDA `[FUND_SEED, creator, fund_id.to_le_bytes()]`

The name stays `SharedFund` so Rotating Fund and Group Goal can reuse it later through `kind`. v1 accepts only `kind = Milestone`, and the creator must be the client.

Field order is fixed: the app filters with `getProgramAccounts` + `memcmp` at the offsets below. Do not reorder fields. v1.1 inserted `brief_hash` before `_reserved` and grew the account to 740 bytes (allowed once, before launch, with every v1 fund closed first); from v1.1 on, add new fields only by using `_reserved`.

| Offset | Field | Type | Meaning |
| ---: | --- | --- | --- |
| 0 | discriminator | `[u8; 8]` | Anchor |
| 8 | `version` | `u8` | `ACCOUNT_VERSION` |
| 9 | `kind` | `FundKind` (u8) | `Milestone = 0` |
| 10 | `state` | `FundState` (u8) | see 3.3 |
| 11 | `payout_kind` | `PayoutKind` (u8) | `Unset = 0`, `OwnWallet = 1`, `PayoutPartner = 2` |
| 12 | `client` | `Pubkey` | **memcmp filter "as client"** |
| 44 | `freelancer` | `Pubkey` | **memcmp filter "as freelancer"** |
| 76 | `creator` | `Pubkey` | PDA seed; equals `client` in v1 |
| 108 | `rent_payer` | `Pubkey` | receives the rent of the fund and the vault on `close` |
| 140 | `payout_destination` | `Pubkey` | a wallet (ATA owner), never a token account; `Pubkey::default()` until `accept` |
| 172 | `mint` | `Pubkey` | equals `USDC_MINT` |
| 204 | `fund_id` | `u64` | chosen by the app (current time in ms) |
| 212 | `created_at` | `i64` | chain time |
| 220 | `total` | `u64` | sum of milestone amounts |
| 228 | `released` | `u64` | sent to the destination so far |
| 236 | `refunded` | `u64` | returned to the client so far |
| 244 | `milestone_count` | `u8` | 1–5 |
| 245 | `milestones` | `[Milestone; 5]` | 65 bytes each; slots ≥ `milestone_count` stay zeroed and are ignored |
| 570 | `cancel_proposer` | `Pubkey` | `default` = no proposal |
| 602 | `cancel_freelancer_amount` | `u64` | proposed amount to the destination |
| 610 | `title` | `[u8; 32]` | UTF-8, zero-padded |
| 642 | `bump` | `u8` | |
| 643 | `vault_bump` | `u8` | |
| 644 | `payout_reference` | `[u8; 32]` | `PayoutPartner` only: hash of the partner's recipient ID; zero for `OwnWallet` |
| 676 | `brief_hash` | `[u8; 32]` | SHA-256 of the canonical brief JSON (app-side, `build-plan.md` B1); never all zero |
| 708 | `_reserved` | `[u8; 32]` | |
| **740** | **total size** | | `8 + INIT_SPACE`; assert it in a test. v1 accounts were 708 bytes (close them before the upgrade, `build-plan.md` G4) |

`Milestone` (65 bytes): `amount: u64` · `submit_by: i64` · `review_by: i64` · `submitted_at: i64` (0 until submitted) · `evidence: [u8; 32]` (SHA-256 of the canonical delivery JSON: links, file fingerprints and note; computed by the app; never all zero) · `status: MilestoneStatus` (u8).

`MilestoneInput` (instruction argument, 24 bytes): `amount: u64` · `submit_by: i64` · `review_by: i64`.

Use fixed-size arrays and `Pubkey::default()` instead of `Vec` or `Option`, so that the offsets never move. All enums are unit enums (1 byte). Wrap the fund in `Box<Account<'info, SharedFund>>` and every token or mint account in `Box<InterfaceAccount<...>>` to stay inside the stack frame.

### 3.2 Vault, token account PDA `[VAULT_SEED, fund.key()]`

A seeded token account, **not** an ATA: `token::mint = mint`, `token::authority = fund`, `token::token_program = token_program`, `seeds = [VAULT_SEED, fund.key().as_ref()]`, `bump = fund.vault_bump` (plain `bump` in `create_fund`, see 4.1). Created in `create_fund`, emptied and closed in `close`.

### 3.3 States

`FundState`: `Created = 0` → `Accepted = 1` → `Funded = 2` → `Settled = 3`. The account is deleted on `close`, so there is no Closed state.

`MilestoneStatus`: `Pending = 0`, `Submitted = 1`, `Disputed = 2`, `Released = 3`, `Refunded = 4`, `Cancelled = 5`.

A milestone is **terminal** when it is Released, Refunded or Cancelled. The fund becomes `Settled` as soon as every milestone in `0..milestone_count` is terminal. **Unsettled** = the sum of the amounts of milestones that are not terminal.

Invariant: `released + refunded + unsettled == total` at all times, so `released + refunded == total` once the fund is `Settled`.

**Any milestone status change clears a pending cancel proposal** (`cancel_proposer = default`, `cancel_freelancer_amount = 0`).

### 3.4 Time

All times are `Clock::get()?.unix_timestamp`. One boundary convention everywhere: **"a deadline has passed" means `now > deadline`.**

- `submit` is allowed while `now <= submit_by`.
- `dispute` is allowed while `now <= review_by`.
- `refund` is allowed once `now > submit_by`.
- `release_after_review` is allowed once `now > review_by`.

The work window is protected at three points. `create_fund`, `accept` and `lock` each require `now + MIN_WORK_WINDOW_SECS <= min(submit_by)`, taken over `0..milestone_count`. A contract that has run out of time can only be closed.

## 4. Instructions

Priority **P0** = never cut, **P1** = cut if late, as a group: `dispute`, `concede`, `propose_cancel` and `accept_cancel` ship together or not at all. The order is in [`product-spec.md`](product-spec.md#8-cut-order).

| # | Instruction | Signer | Pre-conditions (besides 1.5) | Effect | P |
| --- | --- | --- | --- | --- | --- |
| 1 | `create_fund(fund_id: u64, freelancer: Pubkey, title: String, milestones: Vec<MilestoneInput>, brief_hash: [u8; 32])` | `client` (= creator) and `payer` (rent; may be the same key) | `brief_hash` not all zero (`InvalidBriefHash`); 1–5 milestones; each `amount > 0`; checked sum ≤ `MAX_CONTRACT_AMOUNT`; each `review_by - submit_by >= MIN_REVIEW_WINDOW_SECS`; work window (3.4); `freelancer ≠ client`, `≠ default`; `title.len() <= 32` | init fund + vault; store `brief_hash`; state `Created`; `rent_payer = payer` | P0 |
| 2 | `accept(payout_kind: PayoutKind, payout_destination: Pubkey, payout_reference: [u8; 32], expected_brief_hash: [u8; 32])` | `freelancer` | state `Created`; `expected_brief_hash == fund.brief_hash` (`BriefMismatch`): the freelancer agrees to the brief they read; work window; `OwnWallet` → destination == freelancer and reference all zero; `PayoutPartner` → destination ∈ `PAYOUT_PARTNERS` and reference not all zero; `Unset` rejected | store kind, destination, reference; state `Accepted` | P0 |
| 3 | `lock()` | `client` | state `Accepted`; work window | `transfer_checked(total)` from the client ATA to the vault; state `Funded` | P0 |
| 4 | `submit(index: u8, evidence: [u8; 32])` | `freelancer` | state `Funded`; status `Pending`; `now <= submit_by`; `evidence` not all zero (`InvalidEvidence`) | status `Submitted`; `submitted_at = now` | P0 |
| 5 | `approve(index: u8)` | `client` | state `Funded`; status `Submitted` or `Disputed` | status `Released`; vault → destination ATA; `released += amount` | P0 |
| 6 | `release_after_review(index: u8)` | `caller` (anyone, `Signer`) | state `Funded`; status `Submitted` (not `Disputed`); `now > review_by` | same as `approve`, event `by_timeout = true` | P0 |
| 7 | `refund(index: u8)` | `caller` (anyone, `Signer`) | state `Funded`; status `Pending`; `now > submit_by` | status `Refunded`; vault → client ATA; `refunded += amount` | P0 |
| 8 | `close()` | `creator` | state `Created` or `Accepted` (never funded), or `Settled` | any leftover vault balance (donations) → client ATA; close the vault by CPI, then the fund (`close = rent_payer`); rent → `rent_payer` | P0 |
| 9 | `dispute(index: u8)` | `client` | state `Funded`; status `Submitted`; `now <= review_by` | status `Disputed` (blocks `release_after_review`) | P1 |
| 10 | `concede(index: u8)` | `freelancer` | state `Funded`; status `Disputed` | status `Refunded`; vault → client ATA; `refunded += amount`. A disputed milestone can therefore always be settled by either side | P1 |
| 11 | `propose_cancel(freelancer_amount: u64)` | `client` or `freelancer` (`NotAParty` otherwise) | state `Funded`; `freelancer_amount <= unsettled` | store proposer + amount; overwrites an earlier proposal | P1 |
| 12 | `accept_cancel(expected_freelancer_amount: u64, expected_unsettled: u64)` | the other party | state `Funded`; a proposal exists; signer ≠ proposer; both `expected_*` equal the current values; `freelancer_amount <= unsettled` re-checked | `freelancer_amount` → destination ATA; `unsettled - freelancer_amount` → client ATA; `released += freelancer_amount`; `refunded += unsettled - freelancer_amount`; non-terminal milestones → `Cancelled`; clear the proposal; state `Settled` | P1 |
| 13 | `post_note(kind: u8, milestone: u8, part: u8, parts: u8, data: Vec<u8>)` | `author` | `kind = 0` (brief): author = `client`, state `Created`, `milestone = 0`. `kind = 1` (delivery): author = `freelancer`, `milestone < milestone_count`, status `Submitted`. Otherwise `NoteNotAllowed`. `1 <= data.len() <= NOTE_MAX_LEN`, `part < parts <= NOTE_MAX_PARTS` (`InvalidNote`) | no state change; `NotePosted`. `data` is ciphertext made by the app (XChaCha20-Poly1305, key only in the invite link); the program never reads it | P0 |

After every instruction that changes a milestone status, set the fund to `Settled` if all milestones in `0..milestone_count` are terminal.

### 4.1 Accounts per instruction

Except in `create_fund`: `fund` is `mut`, `Box<Account<SharedFund>>`, checked with `seeds = [FUND_SEED, fund.creator.as_ref(), &fund.fund_id.to_le_bytes()]` and `bump = fund.bump`; `vault` is as in 3.2 with `bump = fund.vault_bump`. In `create_fund` both use plain `bump` (the fund's seeds use `client` and the `fund_id` argument), and the handler stores `ctx.bumps.fund` and `ctx.bumps.vault`. `mint` is always `address = USDC_MINT` and `== fund.mint`.

| Instruction | Accounts besides `fund` |
| --- | --- |
| `create_fund` | `client` (Signer), `payer` (Signer, mut), `fund` (init, `payer = payer`, space 740, seeds use `client`), `vault` (init, `payer = payer`), `mint`, `token_program`, `system_program` |
| `accept` | `freelancer` (Signer; `has_one = freelancer`) |
| `lock` | `client` (Signer; `has_one = client`), `client_token` (mut, `associated_token::mint = mint`, `associated_token::authority = client`), `vault`, `mint`, `token_program` |
| `submit` | `freelancer` (Signer; `has_one = freelancer`) |
| `approve` | `client` (Signer; `has_one = client`), `destination` (`UncheckedAccount`, `address = fund.payout_destination`), `destination_token` (mut, `associated_token::mint = mint`, `associated_token::authority = destination`), `vault`, `mint`, `token_program` |
| `release_after_review` | `caller` (Signer), then the same as `approve` minus `client` |
| `refund` | `caller` (Signer), `client` (`UncheckedAccount`, `address = fund.client`), `client_token` (as in `lock`), `vault`, `mint`, `token_program` |
| `close` | `creator` (Signer; `has_one = creator`), `rent_payer` (mut, `address = fund.rent_payer`), `client` (`UncheckedAccount`, `address = fund.client`), `client_token`, `vault`, `mint`, `token_program` |
| `dispute` | `client` (Signer; `has_one = client`) |
| `concede` | `freelancer` (Signer; `has_one = freelancer`), `client`, `client_token`, `vault`, `mint`, `token_program` |
| `propose_cancel` | `signer` (Signer; must equal `fund.client` or `fund.freelancer`) |
| `accept_cancel` | `signer` (Signer), `destination`, `destination_token`, `client`, `client_token`, `vault`, `mint`, `token_program` |
| `post_note` | `author` (Signer; must equal `fund.client` or `fund.freelancer` as the kind requires). `fund` is read-only here; it is listed so that notes can be found with `getSignaturesForAddress(fund)` |

The program does **not** create ATAs (no `init_if_needed`). The app adds `createAssociatedTokenAccountIdempotent` to the same transaction when needed; the transaction's fee payer pays for it.

**Order inside each handler:** validate → update state and amounts (checked math) → CPI `transfer_checked` with fund-PDA signer seeds → `emit!`.

## 5. Events

`FundCreated { fund, client, freelancer, total, milestone_count, brief_hash }` · `FundAccepted { fund, payout_kind, payout_destination, payout_reference }` · `FundLocked { fund, amount }` · `MilestoneSubmitted { fund, index, evidence }` · `MilestoneReleased { fund, index, amount, destination, payout_reference, by_timeout, caller }` (the partner matches a deposit to a recipient by this event) · `MilestoneRefunded { fund, index, amount, caller, conceded }` · `MilestoneDisputed { fund, index }` · `CancelProposed { fund, proposer, freelancer_amount }` · `FundCancelled { fund, to_destination, to_client }` · `FundClosed { fund, leftover_to_client }` · `NotePosted { fund, author, kind, milestone, part, parts, len }` (v1.1)

## 6. Errors

Append to the existing `NedError` **after** `InvalidAmount`, and never reorder existing variants (the app maps the codes). Reuse `InvalidAmount` for an amount of 0.

`InvalidMilestoneCount` · `AmountTooLarge` · `InvalidDeadline` · `ReviewWindowTooShort` · `WorkWindowTooShort` · `SameParty` · `InvalidFreelancer` · `TitleTooLong` · `InvalidMint` · `InvalidFundState` · `InvalidPayoutKind` · `InvalidPayoutDestination` · `PayoutPartnerNotAllowed` · `InvalidPayoutReference` · `MilestoneIndexOutOfRange` · `InvalidMilestoneStatus` · `DeadlinePassed` · `DeadlineNotReached` · `NotAParty` · `NoCancelProposal` · `CannotAcceptOwnProposal` · `CancelAmountTooLarge` · `CancelProposalChanged` · `FundNotClosable` · `MathOverflow` · then, appended in v1.1 after `MathOverflow`: `InvalidBriefHash` · `BriefMismatch` · `InvalidEvidence` · `InvalidNote` · `NoteNotAllowed`

Every error gets an English `#[msg]` sentence, which the app shows as is (English-only rule).

## 7. Security checklist (sources in `08-research`)

- [ ] `transfer_checked` with Interface types; mint pinned by `address = USDC_MINT`
- [ ] Constraints as in 4.1; `Signer` on every role; stored bumps; no `init_if_needed`
- [ ] Pay from stored amounts, never `vault.amount` (a donation must not change payouts)
- [ ] `index < milestone_count` everywhere; loops over `0..milestone_count` only
- [ ] State change before every CPI; `checked_add` / `checked_sub` (`overflow-checks = true` is already on in the workspace)
- [ ] `Clock` time only; boundaries as in 3.4; the app shows countdowns from chain time
- [ ] Cancel proposal cleared on every status change; `accept_cancel` checks the expected values
- [ ] `emit!` on every state change
- [ ] Close the vault with a `close_account` CPI only after it is empty
- [ ] No admin or arbiter key. Upgrade authority stays with the deploy wallet through 10 Oct, so bugs can be fixed on the day. Move it to a Squads multisig, or make the program immutable, before mainnet (roadmap)
- [ ] Disclose that Circle can freeze USDC addresses, including a vault; one vault per contract limits the damage

## 8. Tests (LiteSVM, next to `tests/identity.rs`)

Move the clock with `svm.set_sysvar::<Clock>()`. Create the devnet USDC mint at its fixed address with `svm.set_account`, Test the Vietnam path against the real `DEMO_PAYOUT_PARTNER` public key (receiving needs no private key), so the tests check the allowlist that is deployed; no test-only feature.

1. **Happy path, 2 milestones:** create → accept(OwnWallet) → lock → submit 0 → approve 0 → submit 1 → approve 1 → `Settled` → close; balances and rent returned
2. **Vietnam path:** accept(PayoutPartner, allowlisted, reference) → release reaches the partner ATA and the event carries the reference; the freelancer signs `submit`; a non-allowlisted address fails with `PayoutPartnerNotAllowed`; a zero reference fails with `InvalidPayoutReference`
3. **Auto-release:** submit, then `release_after_review` at `review_by` (fails) and `review_by + 1` (succeeds), signed by a third wallet
4. **Refund:** no submit; `refund` at `submit_by` (fails) and `submit_by + 1` (succeeds); goes to the client
5. **Submit boundary:** at `submit_by` (succeeds) and `submit_by + 1` (fails)
6. **Unused slots:** in a 2-milestone fund, every per-index instruction with index 2–4 fails with `MilestoneIndexOutOfRange`; the fund settles after 2 milestones
7. **Dispute:** before `review_by` it blocks auto-release; `approve` still works; `concede` refunds; dispute after `review_by` fails
8. **Cancel:** client proposes, freelancer accepts; the split and `released` / `refunded` match; the proposer cannot accept their own proposal; an amount above unsettled fails; a changed proposal fails with `CancelProposalChanged`; a proposal is cleared after a release
9. **Order and windows:** `lock` before `accept` fails; `accept` twice fails; `accept` by a non-freelancer fails; `accept` and `lock` inside the last `MIN_WORK_WINDOW_SECS` before the first `submit_by` fail
10. **`create_fund` validation:** 0 or 6 milestones, amount 0, sum above cap, deadline inside the work window, review window 59 s, freelancer == client, title 33 bytes, wrong mint
11. **Attacks:** wrong vault, wrong mint, attacker destination ATA, attacker as client in `approve`, double release, refund after release
12. **Donation:** extra tokens sent to the vault do not change payouts and go to the client on `close`
13. **Invariant:** full 3-milestone cycles (approve + auto-release + refund, and approve + cancel) end with `released + refunded == total`
14. **Layout:** `8 + SharedFund::INIT_SPACE == 740`; `client` at offset 12, `freelancer` at 44, `brief_hash` at 676
15. **Compute units:** logged for every instruction (table for the deck)
16. **Brief (v1.1):** `create_fund` with an all-zero `brief_hash` fails with `InvalidBriefHash`; the stored hash equals the argument and `FundCreated` carries it; `accept` with a different `expected_brief_hash` fails with `BriefMismatch`, with the same one succeeds
17. **Evidence (v1.1):** `submit` with all-zero evidence fails with `InvalidEvidence`
18. **Notes (v1.1):** client posts a brief note while `Created` (succeeds) and after `accept` (fails, `NoteNotAllowed`); freelancer posts a brief note (fails); freelancer posts a delivery note for a `Submitted` milestone (succeeds) and for a `Pending` one (fails); a third wallet fails; empty data, 901 bytes, `part >= parts` and `parts = 9` fail with `InvalidNote`; a delivery note in the same transaction right after `submit` succeeds; the fund account is unchanged byte for byte

Keep the existing 10 identity tests green.

## 9. Deploy

0. **v1.1 upgrade only:** list program accounts of 708 bytes (v1 funds) and settle/close them first; v1 accounts cannot be read by the v1.1 program (`build-plan.md` G4).
1. `anchor build`, then copy the regenerated IDL to `packages/ned-core/src/idl/` (json + ts; never edit it by hand; `ned-wallet/idl/` is a re-export shim since W0); update `packages/ned-core/src/milestone/layout.ts` (`FUND_SIZE = 740`, `OFFSET_BRIEF_HASH = 676`) in the same PR. Upload the IDL with `@solana-program/program-metadata` (create-buffer → fetch-buffer and compare → `update idl --buffer … --close-buffer`, simulated first); `anchor idl upgrade` failed at its last step on 2 Oct (see `docs/tong-hop-tien-do.md`).
2. Upgrade the existing devnet program ID. If the program grows past its allocated size, first run `solana program extend 8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh <bytes>`.
3. Record the deploy signature and program size in `docs/tong-hop-tien-do.md`.
