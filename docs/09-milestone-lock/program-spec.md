# Milestone Lock: program specification (v1.3, build target for 10 Oct 2026)

Status: **build spec, frozen for coding on 3 Oct 2026** (reviewed on 2–3 Oct; fixes R1–R12 in [`README.md`](README.md#review-fixes-3-oct)). **v1.1 amendment (3 Oct, decision D14):** `brief_hash`, non-zero evidence and `post_note`; sections 2, 3.1, 4, 4.1, 5, 6, 8 and 9 changed; build order in [`build-plan.md`](build-plan.md) phase A. **v1.2 amendment (4 Oct, decision D22, [`key-sync-plan.md`](key-sync-plan.md) Plan C):** `DeviceKeys` account (3.5), `init_device_keys` / `add_device_key` / `remove_device_key`, `post_note` kind 2 (key); sections 2, 3.5, 4, 4.1, 5, 6, 8 changed. No change to `SharedFund` (still 740 bytes). **v1.3 amendment (6 Oct, decisions D25 and D27):** Funded Jobs (`JobListing`, `JobApplication`, six `job` instructions) and the D27 note rules (delivery notes also on `Disputed` and `Released`, new kind 3 review); see [section 10](#10-v13-funded-jobs-and-d27-notes) and row 13 of section 4. `SharedFund` unchanged. Product rules are in [`product-spec.md`](product-spec.md); the decisions behind them are in [`README.md`](README.md#decision-log). If code and this file disagree, fix one of them in the same pull request.

Scope: add Milestone Lock to the existing Anchor program `ned_program` (`ned_program/programs/ned-program/src/lib.rs`, program ID `8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh`, Anchor 1.1.2, Rust 1.89). The identity instructions, accounts and error codes stay unchanged.

## 1. Rules the program enforces

1. Money moves only by the rules in this file. No instruction lets N.E.D, an admin or an arbiter move funds out of a vault; there is no admin or arbiter key. The upgrade authority (deploy wallet until after the final, section 7) could replace the program, and the app discloses it (7 Oct: was "no … upgrade key can move funds").
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

### 3.5 `DeviceKeys`, PDA `[b"device_keys", wallet]` (v1.2)

`wallet: Pubkey` · `count: u8` · `keys: [[u8; 32]; MAX_DEVICE_KEYS = 5]` (X25519 public keys; `keys[..count]` in use, the rest zero) · `bump: u8`. Size `8 + 32 + 1 + 160 + 1 = 202` bytes, rent paid by the wallet. Only the wallet can change it (`seeds` + `has_one = wallet`). The private keys never leave the devices; see [`key-sync-plan.md`](key-sync-plan.md).

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
| 13 | `post_note(kind: u8, milestone: u8, part: u8, parts: u8, data: Vec<u8>)` | `author` | `kind = 0` (brief): author = `client`, state `Created`, `milestone = 0`. `kind = 1` (delivery): author = `freelancer`, `milestone < milestone_count`, status `Submitted`, `Disputed` or `Released` (v1.3, D27). `kind = 2` (key, v1.2): author = `client` or `freelancer`, any state, `milestone = 0`. `kind = 3` (review, v1.3, D27): author = `client`, `milestone < milestone_count`, status `Submitted` or `Disputed`. Otherwise `NoteNotAllowed`. `1 <= data.len() <= NOTE_MAX_LEN`, `part < parts <= NOTE_MAX_PARTS` (`InvalidNote`) | no state change; `NotePosted`. `data` is ciphertext made by the app (XChaCha20-Poly1305; from v1.2 the contract key also travels as per-device wraps in kind 2 notes); the program never reads it | P0 |
| 14 | `init_device_keys()` (v1.2) | `wallet` | creates `DeviceKeys` for the signer (fails if it exists) | empty list; sent with the first `add_device_key` | P0 |
| 15 | `add_device_key(key: [u8; 32])` (v1.2) | `wallet` | `key != 0` (`InvalidDeviceKey`); already listed → no change, no error; `count < MAX_DEVICE_KEYS` (`DeviceKeysFull`) | appends; `DeviceKeyAdded` | P0 |
| 16 | `remove_device_key(key: [u8; 32])` (v1.2) | `wallet` | key listed (`DeviceKeyNotFound`) | last key moves into the gap; `DeviceKeyRemoved` | P0 |

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

**v1.2:** appended after `NoteNotAllowed`: `DeviceKeysFull` · `DeviceKeyNotFound` · `InvalidDeviceKey`.

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
3. **Release after review:** submit, then `release_after_review` at `review_by` (fails) and `review_by + 1` (succeeds), signed by a third wallet
4. **Refund:** no submit; `refund` at `submit_by` (fails) and `submit_by + 1` (succeeds); goes to the client
5. **Submit boundary:** at `submit_by` (succeeds) and `submit_by + 1` (fails)
6. **Unused slots:** in a 2-milestone fund, every per-index instruction with index 2–4 fails with `MilestoneIndexOutOfRange`; the fund settles after 2 milestones
7. **Dispute (request changes):** before `review_by` it blocks release after review; `approve` still works; `concede` refunds; dispute after `review_by` fails
8. **Cancel:** client proposes, freelancer accepts; the split and `released` / `refunded` match; the proposer cannot accept their own proposal; an amount above unsettled fails; a changed proposal fails with `CancelProposalChanged`; a proposal is cleared after a release
9. **Order and windows:** `lock` before `accept` fails; `accept` twice fails; `accept` by a non-freelancer fails; `accept` and `lock` inside the last `MIN_WORK_WINDOW_SECS` before the first `submit_by` fail
10. **`create_fund` validation:** 0 or 6 milestones, amount 0, sum above cap, deadline inside the work window, review window 59 s, freelancer == client, title 33 bytes, wrong mint
11. **Attacks:** wrong vault, wrong mint, attacker destination ATA, attacker as client in `approve`, double release, refund after release
12. **Donation:** extra tokens sent to the vault do not change payouts and go to the client on `close`
13. **Invariant:** full 3-milestone cycles (approve + release after review + refund, and approve + cancel) end with `released + refunded == total`
14. **Layout:** `8 + SharedFund::INIT_SPACE == 740`; `client` at offset 12, `freelancer` at 44, `brief_hash` at 676
15. **Compute units:** logged for every instruction (table for the deck)
16. **Brief (v1.1):** `create_fund` with an all-zero `brief_hash` fails with `InvalidBriefHash`; the stored hash equals the argument and `FundCreated` carries it; `accept` with a different `expected_brief_hash` fails with `BriefMismatch`, with the same one succeeds
17. **Evidence (v1.1):** `submit` with all-zero evidence fails with `InvalidEvidence`
18. **Notes (v1.1):** client posts a brief note while `Created` (succeeds) and after `accept` (fails, `NoteNotAllowed`); freelancer posts a brief note (fails); freelancer posts a delivery note for a `Submitted` milestone (succeeds) and for a `Pending` one (fails); a third wallet fails; empty data, 901 bytes, `part >= parts` and `parts = 9` fail with `InvalidNote`; a delivery note in the same transaction right after `submit` succeeds; the fund account is unchanged byte for byte

19. **Key notes (v1.2):** client and freelancer post kind 2 while `Created`, after `accept`, after `lock` and when `Settled`; `milestone ≠ 0` fails; a third wallet fails (`NoteNotAllowed`); the fund bytes do not change
20. **Device keys (v1.2):** init + add in one transaction; init twice fails; the same key again changes nothing; zero key fails; full at 5 (`DeviceKeysFull`); remove moves the last key into the gap; unknown key fails (`DeviceKeyNotFound`); another wallet cannot change the list

Keep the existing 10 identity tests green.

## 9. Deploy

0. **v1.1 upgrade only:** list program accounts of 708 bytes (v1 funds) and settle/close them first; v1 accounts cannot be read by the v1.1 program (`build-plan.md` G4).
1. `anchor build`, then copy the regenerated IDL to `packages/ned-core/src/idl/` (json + ts; never edit it by hand; `ned-wallet/idl/` is a re-export shim since W0); update `packages/ned-core/src/milestone/layout.ts` (`FUND_SIZE = 740`, `OFFSET_BRIEF_HASH = 676`) in the same PR. Upload the IDL with `@solana-program/program-metadata` (create-buffer → fetch-buffer and compare → `update idl --buffer … --close-buffer`, simulated first); `anchor idl upgrade` failed at its last step on 2 Oct (see `docs/tong-hop-tien-do.md`).
2. Upgrade the existing devnet program ID. If the program grows past its allocated size, first run `solana program extend 8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh <bytes>`.
3. Record the deploy signature and program size in `docs/tong-hop-tien-do.md`.

## 10. v1.3: Funded Jobs and D27 notes

Added on 6 Oct 2026 (decisions D25 and D27; design in [`funded-jobs-plan.md`](funded-jobs-plan.md) section 4 and [`review-decision-plan.md`](review-decision-plan.md) section 2). New accounts and instructions only; the only change to an existing instruction is the `post_note` rule in 10.6. Code: `state/job.rs`, `instructions/job/`, tests `tests/jobs.rs`.

### 10.1 Constants

| Name | Value | Note |
| --- | --- | --- |
| `JOB_SEED` | `b"job"` | Listing PDA `[JOB_SEED, business, job_id.to_le_bytes()]` |
| `JOB_VAULT_SEED` | `b"job_vault"` | Token account `[JOB_VAULT_SEED, job]`, authority = the listing PDA |
| `JOB_APP_SEED` | `b"job_app"` | Application PDA `[JOB_APP_SEED, job, freelancer]` (one per person) |
| `JOB_PITCH_MAX_LEN` | `280` | Bytes of UTF-8, public on-chain |
| `JOB_SUMMARY_MAX_LEN` | `160` | Bytes of UTF-8, public on-chain |
| `JOB_CATEGORY_COUNT` | `8` | Must equal the list in `@ned/core` `jobs/taxonomy.ts` |
| `JOB_ACCEPT_WINDOW_SECS` | `120` | Devnet value; launch 48 h \[Assumption\] |
| `JOB_DEADLINE_SLACK_SECS` | `300` | Allowed gap between template and absolute deadlines at select time |
| `JOB_VERSION` | `1` | |
| `NOTE_KIND_REVIEW` | `3` | See 10.6 |

### 10.2 Accounts (offsets include the 8-byte discriminator; checked by `layout_every_offset_of_job_listing_and_application`)

`JobListing`, 576 bytes (compile-time assert): `version` u8 @8 · `state` u8 @9 (`Open` 0, `Selected` 1, `Filled` 2, `Withdrawn` 3) · `business` @10 · `category` u8 @42 · `skills` u64 @43 · `mint` @51 · `job_id` u64 @83 · `created_at` i64 @91 · `apply_by` i64 @99 · `select_by` i64 @107 · `total` u64 @115 · `milestone_count` u8 @123 · `milestones` `[JobMilestone; 5]` @124 (24 bytes each: `amount` u64, `work_secs` i64, `review_secs` i64) · `title` `[u8; 32]` @244 · `summary` `[u8; 160]` @276 · `brief_hash` @436 · `selected` @468 · `selected_at` i64 @500 · `fund` @508 · `application_count` u16 @540 · `bump` @542 · `vault_bump` @543 · `_reserved` `[u8; 32]` @544.

`JobApplication`, 364 bytes (compile-time assert): `version` u8 @8 · `job` @9 · `freelancer` @41 · `created_at` i64 @73 · `pitch_len` u16 @81 · `pitch` `[u8; 280]` @83 · `bump` @363.

The listing stays after `Filled` or `Withdrawn` as the record; its rent (about 0.0049 SOL) is not returned in v1.3 \[Inference: standard rent formula\].

### 10.3 Instructions

| # | Instruction | Signer | Pre-conditions | Effect |
| --- | --- | --- | --- | --- |
| 17 | `post_job(job_id, title, summary, category, skills, milestones: Vec<JobMilestoneInput>, brief_hash, apply_by, select_by)` | `business`, `payer` | `brief_hash` non-zero (`InvalidBriefHash`); `category < 8` (`InvalidCategory`); summary 1–160 bytes (`SummaryTooLong`); title ≤ 32 (`TitleTooLong`); 1–5 milestones (`InvalidMilestoneCount`); `now < apply_by ≤ select_by` (`InvalidJobDeadlines`); each amount > 0 (`InvalidAmount`), `work_secs ≥ MIN_WORK_WINDOW_SECS` (`WorkWindowTooShort`), `review_secs ≥ MIN_REVIEW_WINDOW_SECS` (`ReviewWindowTooShort`); checked total ≤ `MAX_CONTRACT_AMOUNT` (`AmountTooLarge`) | Init listing + job vault; `transfer_checked(total)` business ATA → job vault; `Open`; `JobPosted` |
| 18 | `post_job_brief(part, parts, data)` | `business` | `Open` (`JobNotOpen`); `1 ≤ len ≤ NOTE_MAX_LEN`, `part < parts ≤ NOTE_MAX_PARTS` (`InvalidNote`) | No state change; `JobBriefPosted`. The plain-text brief is read back from the transaction |
| 19 | `apply_job(pitch)` | `freelancer` (pays rent) | `Open` (`JobNotOpen`); `now ≤ apply_by` (`ApplyClosed`); freelancer ≠ business (`SameParty`); pitch ≤ 280 (`PitchTooLong`) | Init application (a second one fails at init); `application_count += 1`; `JobApplied` |
| 20 | `select_job()` | `business` | Listing `Open`, or `Selected` and `now > selected_at + JOB_ACCEPT_WINDOW_SECS` (`AcceptWindowOpen`); else `JobNotOpen`; `now ≤ select_by` (`SelectClosed`). Fund `Created`, `client == business`, same mint, brief hash and milestone count; per milestone same amount, `review_by − submit_by == review_secs`, `submit_by ≥ now + work_secs − JOB_DEADLINE_SLACK_SECS` (all `JobFundMismatch`). The application PDA for `fund.freelancer` must exist (account load fails otherwise) | `selected`, `selected_at`, `fund`; `Selected`; `JobSelected`. Same transaction, after `create_fund` |
| 21 | `lock_from_job()` | anyone | Listing `Selected` and `fund == listing.fund` (`NotSelected`); fund `Accepted` (`InvalidFundState`); `fund.total == listing.total` (`JobFundMismatch`); `check_work_window` | Stored `total` → contract vault; fund `Funded`; listing `Filled`; any balance above `total` (a donation) → business ATA; close job vault, rent → business; existing `FundLocked` + `JobFilled`. Same transaction, after `accept` |
| 22 | `withdraw_job()` | `business` | `Open` with `application_count == 0`, or `Open` with `now > select_by`, or `Selected` with `now > select_by` and the accept window over (`WithdrawTooEarly`); `Filled` / `Withdrawn` → `JobNotOpen` | Stored `total` + any donation → business ATA; close job vault; `Withdrawn`; `JobWithdrawn` |

Transfers always use the stored `total`, never `job_vault.amount`; the extra step for a donation stops a small USDC gift to the job vault from blocking the close of the job vault.

### 10.4 Events (appended)

`JobPosted { job, business, job_id, category, total, apply_by, select_by, brief_hash }` · `JobBriefPosted { job, part, parts, len }` · `JobApplied { job, freelancer, application_count }` · `JobSelected { job, fund, freelancer }` · `JobFilled { job, fund, amount }` · `JobWithdrawn { job, amount }`. `lock_from_job` also emits the existing `FundLocked`.

### 10.5 Errors (appended after `InvalidDeviceKey`, never renumber)

`JobNotOpen` · `ApplyClosed` · `SelectClosed` · `AcceptWindowOpen` · `JobFundMismatch` · `NotSelected` · `WithdrawTooEarly` · `PitchTooLong` · `InvalidJobDeadlines` · `InvalidCategory` · `SummaryTooLong`

### 10.6 Note kinds (`post_note`)

| Kind | Name | Author | Allowed when | `milestone` | Since |
| --- | --- | --- | --- | --- | --- |
| 0 | brief | client | fund `Created` | 0 | v1.1 |
| 1 | delivery | freelancer | milestone `Submitted`, `Disputed` or `Released` | `< milestone_count` | v1.1; `Disputed`, `Released` added in v1.3 (D27) |
| 2 | key | client or freelancer | any state | 0 | v1.2 |
| 3 | review | client | milestone `Submitted` or `Disputed` | `< milestone_count` | v1.3 (D27) |

Anything else fails with `NoteNotAllowed`.

### 10.7 Tests (`tests/jobs.rs`)

Offsets of both accounts; the happy path (post → brief → apply ×2 → `create_fund` + `select_job` → `accept` (PayoutPartner) + `lock_from_job` → submit → approve, partner paid, listing `Filled`, job vault closed); every refusal of funded-jobs-plan 4.5 items 2–6; a donation to the job vault is returned and does not block the lock; D27: review note refused for the freelancer and on `Pending` / `Released`, delivery note refused on `Pending` / `Refunded` and accepted on `Disputed` / `Released`. All earlier tests unchanged.

### 10.8 Deploy

Same procedure as section 9. The v1.3 binary is larger than the v1.2 program account: extend first (numbers in `docs/tong-hop-tien-do.md`, S1 row), then upgrade. The PO runs it.

## 11. v1.4: Lock at hire (D29) and the G1 check

**Status (7 Oct, V4):** **deployed on devnet.** Built and tested locally (V1: `anchor build` clean, no fix needed; V2: self-review, 67/67 tests pass). V3: upgraded on devnet, tx `4u1Gcc2vfDbQB4PiKgj2bfNrKCfTCaWb2kvz92VwjB7E5y2vSrtvpcVrHz1tKdv2mGwBF8xVe95s9J9XQnjSEdwg` (program data 688,464 B after a 20,000 B extend; the binary on devnet equals the local build). V4: IDL on-chain (metadata `AMX7B6rjAhcdKzZ8N2Xw3uDcjCRrGonWuXxJ5DMiKK8H`, tx `2AsdDUbnd74AxzjUDnVL4usVQBbspZ3DB2v3dwBaRZ3HrkNcdKAgEbocCgE9XDDEB2tvtiTyAcAmSauoFwMnuCC7`) and smoke Runs 1–4 green (Run 3 lock at hire, Run 4 open → withdraw with 0 back). 29 instructions, 55 errors, 26 events (11.3). Backward compatible with v1.3. *(Was, V2: "Not deployed yet (V3).")*

### 11.1 Account change

`JobListing`, 576 bytes, unchanged size:

| Offset | Field | Note |
| --- | --- | --- |
| 544 | `unfunded: u8` | 1 = "locks when hired" (`post_job_open`, nothing locked); 0 = budget in the job vault. Taken from `_reserved`, so every v1.3 listing reads 0 (funded) |
| 545..576 | `_reserved: [u8; 31]` | — |

### 11.2 Instructions

| Instruction | Signer | Rules | Effect |
| --- | --- | --- | --- |
| `post_job_open` (new) | business (+ payer) | Same arguments, accounts and checks as `post_job` | Listing + empty job vault, `unfunded = 1`, no transfer; event `JobPostedOpen` |
| `fund_job` (new) | business (`has_one = business`) | `state == Open` (`JobNotOpen`), `unfunded == 1` (`JobAlreadyFunded`), `now <= select_by` (`SelectClosed`). On a `Filled` or `Withdrawn` listing the job vault is already closed, so Anchor refuses the account before the handler runs | `transfer_checked` of exactly the stored `total` (never the vault balance) from the business ATA to the job vault; `unfunded = 0`; event `JobFunded` |
| `select_job` (changed) | business | Adds `unfunded == 0` (`JobNotFunded`), **after** the state and `select_by` checks (so a closed or late listing still reports `JobNotOpen` / `SelectClosed`) | The app sends `fund_job + create_fund + select_job` in one transaction for an unfunded listing. A re-select (after the accept window) finds `unfunded == 0` and sends no `fund_job`, so the budget is never locked twice |
| `withdraw_job` (changed) | business | Same rules | When `unfunded == 1`: `amount = 0`, any donation in the job vault goes to the business, the job vault is closed (rent to the business), the listing stays as `Withdrawn` (as in v1.3, it is not closed); event `JobWithdrawn { amount: 0 }`. v1.3 path unchanged |
| `lock_from_job` (changed, G1) | anyone | Adds `fund.freelancer == job.selected` and `fund.brief_hash == job.brief_hash` (`JobFundMismatch`) | A contract closed and recreated at `job.fund` for someone else cannot take the budget |

### 11.3 Events and errors (appended, never renumber)

- **Events:** `JobPostedOpen { job, business, job_id, category, total, apply_by, select_by, brief_hash }` (`total` is the planned budget) · `JobFunded { job, total }`.
- **Errors:** after `SummaryTooLong`: `JobNotFunded`, `JobAlreadyFunded`.
- **Counts (counted from the source on 7 Oct, V2; the built IDL gives the same):** v1.3 had 27 instructions, 53 errors and 24 events. v1.4 has **29 instructions** (`pub fn` in the `#[program]` module of `lib.rs`), **55 error variants** (`NedError` in `errors.rs`) and **26 events** (`#[event]` structs in `events.rs`). No new error for G1: it reuses `JobFundMismatch`. Tests: **67** (lib 1, helpers 4, identity 10, jobs 23, milestone 29). Update the pitch numbers only after V3 is green on devnet.

### 11.4 Tests (`tests/jobs.rs`, new)

`v14_post_job_open_locks_nothing_and_sets_unfunded` (offset 544) · `v14_post_job_keeps_v13_behaviour` · `v14_select_needs_the_budget_locked_in_the_same_transaction` (CU of the 3-instruction transaction) · `v14_fund_job_rules` (only the business, exact total, once, balance too low, after select_by) · `v14_reselect_does_not_lock_again` · `v14_withdraw_an_unfunded_listing_moves_nothing` · `v14_g1_a_recreated_contract_for_someone_else_cannot_take_the_budget`. All v1.3 tests must still pass unchanged.

Added in the V2 self-review: `v14_fund_job_refused_on_filled_and_withdrawn_listings` · `v14_withdraw_an_unfunded_listing_returns_a_donation_and_closes_the_vault` · `v14_select_on_an_unfunded_listing_checks_state_and_select_by_first` · `v14_g1_a_recreated_contract_with_another_brief_cannot_take_the_budget` (same freelancer, other brief) · `v14_fund_create_select_transaction_fits_1232_bytes` (CL R-2) · `v14_compute_units_per_job_instruction` (CU per instruction from the program logs).

### 11.5 Measurements (LiteSVM, v1.4, 7 Oct 2026)

**Compute units per instruction.** Ten runs of `cargo test -- --nocapture --test-threads=1`, lowest–highest. The spread comes from the test keypairs, which are random on every run: each extra try of the PDA bump search (`init`, ATA constraints) costs 1,500 CU. For a given address the cost is fixed. Below, "job tx" means the instruction is measured inside that transaction from the program logs (`cu_each`).

| Instruction | CU (lowest–highest) |
| --- | ---: |
| `post_job` (2 milestones, locks the budget) | 34,173–49,173 |
| `post_job_open` (2 milestones, locks nothing) | 26,120–36,620 |
| `post_job_brief` (900 bytes) | 3,937 |
| `apply_job` | 12,904–20,404 |
| `fund_job` | 21,154–24,154 |
| `create_fund` (2 milestones, job tx) | 24,060–37,560 |
| `select_job` | 12,105 |
| `accept` | 7,925–7,996 |
| `lock_from_job` | 37,545–45,045 |
| `withdraw_job` (funded / unfunded) | 26,148–33,648 / 18,046–24,046 |
| `create_fund` (3 milestones) | 24,142–33,142 |
| `lock` | 22,482–28,482 |
| `submit` | 7,774–7,781 |
| `approve` | 22,907–31,938 |
| `release_after_review` | 23,077–32,108 |
| `refund` | 22,765–28,765 |
| `close` | 17,030–23,030 |
| `dispute` · `propose_cancel` | 7,686 · 7,583 |
| `concede` | 22,842–34,842 |
| `accept_cancel` | 35,515–43,015 |
| `post_note` (900 bytes) | 4,612–4,626 |
| `init_device_keys + add_device_key` (one tx) | 11,554–16,054 |

Transactions: `fund_job + create_fund + select_job` 57,319–67,819 (2 milestones), 57,985–71,485 (5 milestones); `create_fund + select_job` 36,165–40,665; `accept + lock_from_job` 45,470–51,487.

**Above 40,000 CU in some runs:** `post_job` (up to 49,173, 24.6% of 200,000), `lock_from_job` (up to 45,045) and `accept_cancel` (up to 43,015). The lowest value of every instruction is under 40,000 (the top lowest is `lock_from_job`, 37,545 = 18.8%). So "dưới 20%" is not safe for the pitch; "dưới 25%" holds for every value measured. CL decides the wording (pre-pitch-check §5).

**v1.4 against v1.3** (the same tests on the v1.3 binary from `target/rollback/`, 8 runs, lowest): the v1.3 paths cost at most about 80 CU more on v1.4 (`accept + lock_from_job` 45,393 → 45,470 for the G1 checks; `create_fund + select_job` 36,109 → 36,165; `withdraw_job` 26,096 → 26,148). The values above 40,000 were already there in v1.3. The old 39,781 figure was an earlier `accept_cancel` measurement, and the job instructions had only been measured on devnet.

**Transaction size (CL R-2).** `fund_job + create_fund + select_job` with a 32-byte title (the limit) and 5 milestones is **737 bytes**. With `SetComputeUnitLimit` and `SetComputeUnitPrice` added it is **789 bytes**, against Solana's 1,232. The app adds no compute-budget instruction today (`packages/ned-core` has none), so 789 is the case where a wallet adds both. **Choice:** one transaction, no address lookup table, no split. That leaves 443 bytes of headroom. The app already checks `txSize <= 1,232` before sending (`runCreate`).

### 11.6 Deploy

Prompt L2, only after the PO's go. Steps:
1. Save the v1.3 `.so` and its SHA-256 for rollback.
2. Check the data size (668,464 B) and extend if needed.
3. Upgrade.
4. Check that the binary on devnet equals the local build.
5. Upload the IDL with program-metadata.
6. Run smoke Runs 1–4.
