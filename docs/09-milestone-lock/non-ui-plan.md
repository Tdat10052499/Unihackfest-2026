# Non-UI work plan: everything that does not wait for the new designs (3 → 7 Oct 2026)

Status: **plan, 3 Oct 2026.** The screens are being redesigned, so this file pulls out of [`refactor-plan.md`](refactor-plan.md) every task that does not depend on the new boards, and orders them so the developer can start today. When the designs arrive, the screens (refactor-plan PR5) are built on the hooks and view models defined in section 3. They need no further program or data work.

Specs: [`program-spec.md`](program-spec.md) (program), [`product-spec.md`](product-spec.md) (rules, words, demo). Hours are estimates \[Assumption\].

## 0. Scope

| In this plan (no design needed) | Waits for the designs |
| --- | --- |
| Program: module split, 8 P0 instructions, P1 group, tests, deploy, IDL | Contract screens, Home VN / Intl, Records screen |
| App chain layer: one config, one connection, send helper, error mapping, ATA helper | Onboarding consent and region **screens** (their stores and logic are in this plan) |
| `services/milestone/` (builders, queries, view models, formatting, evidence) | New navigation bar, Home tiles |
| React hooks that screens will call (section 3) | Copy changes on existing screens |
| App plumbing: feature flags, route guards, MWA removal, dead-code deletion, region and consent stores, onboarding step logic, network pin | Visual components (StatusChip, MilestoneCard…) |
| Dev harness screen (plain buttons, dev only) to run every instruction on devnet before the designs land | — |
| Scripts: devnet smoke run, USDC recycle, partner keypair | — |
| Security clean-up, README technical part, test script | — |

## 1. Order of work

Tasks N0–N13. Each task is one commit; group them into pull requests as shown (PR0 = N0–N2, PR1 = N3–N6, PR2 = N7, PR3 = N8–N10, PR4a = N11–N13).

| # | Task | Depends on | Hours | Day |
| --- | --- | --- | --- | --- |
| N0 | Chain config and bug fixes in the app | — | 3 | Fri 3 |
| N1 | Generic send, error mapping, ATA helper | N0 | 2 | Fri 3 |
| N2 | Spike: IDL coder for our types | N0 | 1.5 | Fri 3 |
| N3 | Program: split `lib.rs`, shared test helpers | — | 2 | Fri 3 |
| N4 | Program: `SharedFund` + 8 P0 instructions | N3 | 8 | Sat 4 |
| N5 | Program: P0 tests (program-spec section 8, groups 1–6, 9–15) | N4 | 3 | Sat 4 |
| N6 | Build, deploy to devnet, copy the IDL | N5 | 1.5 | Sun 5 |
| N7 | Program: P1 group + tests (**cuttable as one block**) | N6 | 6 | Mon 6 |
| N8 | `services/milestone/` + unit tests | N2 (draft IDL), N6 (final IDL) | 6 | Sun 5 |
| N9 | React hooks for screens (section 3) | N1, N8 | 3 | Sun 5 |
| N10 | Devnet smoke script + dev harness screen | N6, N9 | 3 | Mon 6 |
| N11 | App plumbing (flags, guards, stores, onboarding logic, deletions) | N0 | 4 | Sat 4 (in between program work) |
| N12 | Demo ops: partner keypair, recycle script, second Google account | N6 | 1.5 | Mon 6 |
| N13 | Security, README technical part, test script | — | 1.5 | Tue 7 |

Total about 47 h, or 41 h without N7. The developer starts the program work (N3–N6) early because it is the longest chain. App tasks fill the gaps while builds and tests run.

## 2. Tasks

### N0 · Chain config and bug fixes (app)

1. **New `ned-wallet/constants/chain.ts`.** This is the only place that defines:
   - `CLUSTER = 'devnet'`
   - `PROGRAM_ID` (from the IDL address, overridable by `EXPO_PUBLIC_ANCHOR_PROGRAM_ID`)
   - `USDC_DEVNET_MINT` and `USDC_MAINNET_MINT` (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`)
   - `TOKEN_PROGRAM_ID`, `TOKEN_2022_PROGRAM_ID`, `ATA_PROGRAM_ID`
   - `DEMO_PAYOUT_PARTNER` (placeholder until N12)
   - `USD_VND_RATE = 26_019.5`, `USD_VND_RATE_DATE = '2026-10-02'`
2. **Replace the duplicates and delete `services/jupiter/core.ts`.**

   | File | Line(s) |
   | --- | --- |
   | `services/solana.ts` | 21–28 |
   | `services/solanaConnection.ts` | 8–12 |
   | `services/jupiter/index.ts` | 7, 16 |
   | `services/anchorClient.ts` | 25 |
   | `services/p2pTransfer.ts` | 2 |
   | `services/jupiter/core.ts` | delete; point `services/jupiter/__tests__/jupiter.test.ts:3` at `jupiter/index.ts` |
3. **New `services/chain/connection.ts`.** One devnet `Connection`, commitment `confirmed`. Env order: `EXPO_PUBLIC_HELIUS_DEVNET_URL` → `EXPO_PUBLIC_SOLANA_DEVNET_RPC` → public devnet. These files import it:
   - `solana.ts` (`solanaConnection` re-exports it)
   - `identity/resolve.ts:9`
   - `anchorClient.ts`
   - `solanaConnection.ts` (`getHeliusConnection('devnet')`)

   Document the order in `.env.example`; drop `EXPO_PUBLIC_SOLANA_RPC_URL`.
4. **Fix B1.** `getUsdcTokenBalance` (`services/solana.ts:215-300`) and `fetchUsdcBalance` (`solanaConnection.ts:133-150`) read only the USDC ATA and return integer base units as `bigint`, plus a display helper. Delete the fallback that adds every SPL and Token-2022 balance.
5. **Fix B7.** `stores/useNetworkStore.ts` always resolves to devnet for this build: ignore a persisted `mainnet-beta`.

**Done when:**

- `grep -rn "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU\|EPjFWdd5Auf" ned-wallet --include=*.ts*` (excluding `node_modules`) shows only `constants/chain.ts`.
- A test with a fake connection proves "empty USDC account + another token → 0".

### N1 · Generic send, error mapping, ATA helper

- **`services/chain/send.ts`:** `sendAndConfirm(tx, { walletAddress, signTransaction }, { rent?, onStatus? })`. It is the flow of `hooks/useOnchainTransfer.ts:21-47` made generic:
  1. `prepareTransactionCost`
  2. SOL check
  3. `signTransaction`
  4. `sendRawTransaction`
  5. `confirmTransaction({signature, blockhash, lastValidBlockHeight})`
  6. throw if `value.err`

  It returns `{ signature, fee, rent }`, and a `busy` guard blocks a double submit. `useOnchainTransfer` and `app/(onboarding)/profile.tsx:158-159` move to it, which fixes B3.
- **`services/chain/errors.ts`:** `describeTxError(err, context)`. It generalises `services/onboarding.ts:94-111`:
  - it maps codes to names with the IDL error table, and names to English messages through one table covering identity and milestone errors;
  - it has a fallback per context (`'profile' | 'contract' | 'transfer'`).

  `onboarding.ts` re-exports it so existing callers keep working.
- **`services/chain/ata.ts`:** `ata(mint, owner, { allowOwnerOffCurve })` and `createAtaIdempotentIx(payer, owner, mint)` (data `[1]`). This covers B4. Keep the old non-idempotent builder only where Send uses it.

**Done when:** Send and profile creation still work on devnet. A forced failure (for example an amount above the balance) shows the mapped message.

### N2 · Spike: the IDL coder

Write a draft IDL fragment for `create_fund` and `SharedFund` by hand from program-spec sections 3–4, as a test fixture. Then use `BorshCoder` from `@coral-xyz/anchor` 0.32 (already a dependency) to:

1. encode `create_fund(fund_id: u64, freelancer: Pubkey, title: String, milestones: Vec<MilestoneInput>)`;
2. decode a 708-byte `SharedFund` buffer built in the test.

**Result decides N8:**

- **If both round-trip:** `services/chain/idl.ts` uses the coder.
- **If not:** write Borsh by hand, extending the existing `borshString` pattern in `services/identity/dualPda.ts`, which adds about 2 h. Write the result into this file.

**Result (2 Oct 2026): `BorshCoder` works; N8 uses it. No hand-written Borsh is needed.**

- **Fixture.** `ned-wallet/services/chain/__tests__/fixtures/milestone-draft-idl.json` is a hand-written draft in the Anchor 1.x IDL format (spec 0.1.0). It contains `create_fund`, `accept`, `SharedFund`, `Milestone`, `MilestoneInput` and the four enums. Its discriminators are `sha256("global:<ix>")[0..8]` and `sha256("account:SharedFund")[0..8]`, the same method that produces the deployed identity IDL. Replace it with the generated IDL after N6.
- **What the tests prove** (`services/chain/__tests__/idl.test.ts`, 9 tests, all pass under `node --test`):
  - `create_fund` encodes byte for byte the same as a hand-computed Borsh buffer, including multi-byte UTF-8, u64 max and negative i64.
  - A 708-byte `SharedFund` built from section 3.1 decodes field by field, with `client` at offset 12 and `freelancer` at 44. Decoding it and encoding it again gives the same 708 bytes, and `coder.accounts.size('SharedFund') === 708`.
  - Every `PayoutKind` and `MilestoneStatus` variant round-trips, and a wrong discriminator is rejected.
- **`services/chain/idl.ts` API:** `loadCoder`, `encodeIx`, `decodeAccount`, `buildIx` (account order and flags taken from the IDL), plus `toBN` / `fromBN`.
- **Conventions that N8 must follow** \[Verified in the tests\]:
  - Field and arg names keep the IDL's snake_case (`fund_id`, `payout_kind`).
  - Enum values are `{ VariantName: {} }` with the IDL's PascalCase name (`{ OwnWallet: {} }`); a camelCase variant name is rejected.
  - Integers are `BN`; `decode.ts` converts them to `bigint` with `fromBN`.
- **`BN` import.** Node's ESM loader exposes Anchor's `BN` only on the CommonJS `default`, so `idl.ts` reads `anchor.BN ?? anchor.default.BN`.
- **Web check.** A temporary import of `idl.ts` into the web bundle (not committed) loaded in headless Chromium. `BN` was defined and `accept` encoded to 73 bytes, the same as in Node. Anchor's browser build adds about 172 KB to the main web bundle (10.29 → 10.46 MB, uncompressed).
- **Not yet tested:** the Android/Hermes bundle.

### N3 · Program module split and test helpers

- Move the code into this layout:
  - `src/{constants.rs, errors.rs, events.rs, state/identity.rs, instructions/identity.rs}`
  - `lib.rs` keeps `declare_id!`, the module declarations, `pub use` re-exports (`NameRecord`, `PhoneRecord`, `ReverseRecord` and the seeds, which the tests import from the crate root) and a thin `#[program]`.
- **No behaviour change.** The manual `create_pda` helper stays with identity.
- Move the test helpers from `tests/identity.rs` to `tests/common/mod.rs`, and add:
  - `send_signed(svm, ixs, payer, extra_signers)`
  - `set_clock(svm, unix_ts)` using `svm.set_sysvar::<Clock>`
  - `put_usdc_mint(svm)` at the fixed devnet address (reuse `mint_data` and `put_token_program_account`)
  - `ata(owner, mint)` derivation and `put_token_account(svm, owner, amount)`
  - `cu(meta)` to log compute units

**Done when:** `anchor build && cargo test` shows the 10 identity tests green, unchanged.

### N4 · `SharedFund` and the 8 P0 instructions

Follow program-spec sections 1–7 exactly. Files:

- `state/shared_fund.rs`: `SharedFund`, `Milestone`, `MilestoneInput`, enums, `#[derive(InitSpace)]`, all `Box`ed in the account structs.
- `instructions/milestone/`:
  - `create_fund.rs`, `accept.rs`, `lock.rs`, `submit.rs`, `approve.rs`, `release_after_review.rs`, `refund.rs`, `close.rs`
  - `common.rs` with:
    - `pay_from_vault(...)`: PDA-signed `transfer_checked`
    - `settle_if_done(&mut fund)`
    - `clear_cancel(&mut fund)`
    - `check_work_window(&fund, now)`
    - `index_ok(&fund, i)`
    - `unsettled(&fund)`
- `constants.rs`:
  - `USDC_MINT` as `pubkey!(...)`
  - `PAYOUT_PARTNERS` behind `#[cfg(not(feature = "mainnet"))]`; the mainnet list is empty
  - the limits from program-spec section 2
- `errors.rs`: append the new variants **after** `InvalidAmount`.
- Handler names must be unique (`create_fund_handler`…), or called by path, to avoid ambiguous glob re-exports.

**Done when:** it compiles, and the IDL contains the 8 instructions, `SharedFund` and the new errors with codes from 6009.

### N5 · P0 tests

Write `tests/milestone.rs` covering program-spec section 8:

- groups 1–6 and 9–15;
- for group 13, the approve + auto-release + refund half.

Use the real `DEMO_PAYOUT_PARTNER` public key, or the placeholder until N12; receiving needs no private key. Record the compute units per instruction in a table in `docs/tong-hop-tien-do.md`.

**Done when:** all P0 tests and the 10 identity tests pass.

### N6 · Deploy and IDL

1. Check the program: `solana program show 8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh`. Note the data length and the upgrade authority (expected: deploy wallet `FSyU…QuQ`).
2. If the new `.so` is larger than the data length, extend first: `solana program extend 8azx4Hdo… <extra bytes>`.
3. Deploy: `anchor deploy --provider.cluster devnet`.
4. Upgrade the IDL: `anchor idl upgrade -f target/idl/ned_program.json --provider.cluster devnet`.
5. Copy the IDL into the app: `target/idl/ned_program.json` → `ned-wallet/idl/ned_program.json`, and `target/types/ned_program.ts` → `ned-wallet/idl/ned_program.ts`, keeping its header and footer.
6. Record the deploy signature, program size and authority in `docs/tong-hop-tien-do.md`.

**Done when:** `scripts/identity-readonly.ts` still passes against devnet, which shows identity was not broken by the upgrade.

### N7 · P1 group (cuttable)

`dispute`, `concede`, `propose_cancel`, `accept_cancel` with `expected_*` arguments. Clear the proposal on every status change. Tests: groups 7, 8 and the cancel half of 13. Redeploy and copy the IDL again.

**Cut rule:** if N6 is not done by Sunday 5 Oct evening, skip N7. The app keeps `FEATURES.dispute = false`.

### N8 · `services/milestone/`

| File | Exports |
| --- | --- |
| `pda.ts` | `fundPda(creator, fundId: bigint)`, `vaultPda(fund)` |
| `layout.ts` | Constants `FUND_SIZE = 708`, `OFFSET_CLIENT = 12`, `OFFSET_FREELANCER = 44`, enums mirroring the program |
| `decode.ts` | `decodeFund(pubkey, data) → FundAccount` (typed, amounts as `bigint`, only `0..milestone_count`) |
| `client.ts` | One builder per instruction, each returning `{ tx: Transaction, rent: number }`: `buildCreateFund`, `buildAccept`, `buildLock`, `buildSubmit`, `buildApprove`, `buildReleaseAfterReview`, `buildRefund`, `buildClose` (+ P1 builders). Idempotent ATA instructions are added where program-spec 4.1 needs them. `buildCreateFund` picks `fundId = BigInt(Date.now())` |
| `queries.ts` | `listFunds(wallet, role)` via `getProgramAccounts` (filters: `dataSize`, discriminator at 0, `memcmp` at 12 or 44); `getFund(pubkey)`; `getChainNow()` |
| `rules.ts` | Pure functions copying the program's checks: `canAccept`, `canLock`, `canSubmit`, `canApprove`, `canReleaseAfterReview`, `canRefund`, `canClose`, `canDispute`, `canConcede`, `unsettled`, `workWindowOk`, `validateDraft(draft)` (for the create form) |
| `view.ts` | `toFundView(fund, me, region, now) → FundView` (section 3): role, labels from the design prompt section 2, chip tone, amounts (USDC and ≈ VND), destination label, per-milestone views, `nextAction`, `needsMyAction` |
| `format.ts` | `usdcFromUnits`, `unitsFromUsdc` (BigInt-safe, reuse `utils/amountInput.ts`), `vndEstimate(units)` → "≈ 520,000 VND (estimate)", `formatDeadline`, `formatCountdown` |
| `evidence.ts` | `evidenceHash(link) → Uint8Array(32)` with `@noble/hashes/sha256` (normalise: trim; no lower-casing); `matchesEvidence(link, hash)`; `shortHash(hash)` |
| `reference.ts` | `payoutReference(recipientId)` = SHA-256 of a UTF-8 string (demo: `demo-<username>-001`) |
| `__tests__/*.test.ts` | `rules` (every boundary from program-spec 3.4: t−1, t, t+1), `view` (every state × role × region), `decode` (a fixture built from the layout), `pda`, `format`, `evidence` |

Rule: `rules.ts` must match the program. When a rule changes, change the Rust handler, `rules.ts` and both tests in the same PR.

### N9 · Hooks for screens (the contract with the UI work)

See section 3. File locations:

- `hooks/useChainTime.ts`
- `hooks/useFunds.ts`
- `hooks/useFund.ts`
- `hooks/useMilestoneActions.ts`
- `hooks/useRegion.ts`

They are built on `services/chain/send.ts` and `services/milestone/*`. Screens never import `@solana/web3.js` or the builders directly.

### N10 · Devnet smoke script and dev harness

- **`ned-wallet/scripts/milestone-devnet.ts`** (ts-node like `identity-devnet.ts`). It uses local keypairs only: client, freelancer and the partner public key. It runs:
  1. create (2 milestones × 1 USDC, a 60 s review window)
  2. accept (VND path)
  3. lock
  4. submit 0, then approve 0
  5. submit 1, wait 61 s, then `release_after_review` 1
  6. close

  It prints the signatures and the compute units. Add a `--refund` variant that skips the submit and refunds after the deadline. Add an npm script `milestone:devnet`.
- **`app/dev/milestone.tsx`**: an unstyled list of buttons that calls each action hook on a fund ID typed in. It shows only in `__DEV__` builds, or when `EXPO_PUBLIC_DEV_TOOLS=1`; it is not linked from the UI and the route guard hides it otherwise. Use it to test Dynamic signing on web and iPhone Safari before the designs land.

**Done when:** the script runs green twice on devnet. With two signed-in browsers, the harness completes create → accept → lock → submit → approve.

### N11 · App plumbing (no visual change)

| Change | Files |
| --- | --- |
| `constants/features.ts`: `FEATURES = { swap: false, xstocks: false, dapps: false, mwa: false, dispute: false, records: true, devTools: __DEV__ }` | new |
| Hidden routes redirect home when their flag is off (keep the code). Keep the `/swap` route name: `services/jupiter/index.ts:37` checks it | `app/swap.tsx`, `app/xstocks/_layout.tsx` (new, guards the folder) |
| Remove `MwaProvider` from the root (B5) | `app/_layout.tsx:10,68,86` |
| Remove `poc-dynamic` from `PUBLIC_SEGMENTS` and delete the page (B6). Add an onboarding-complete guard: a signed-in user without a ReverseRecord or region is sent to `/setup` instead of deep links | `app/_layout.tsx:21-34` |
| `stores/useRegionStore.ts`: per wallet `'vn' \| 'intl'`, key `@ned_region_v1`, hydration helper like `useWalletModeStore` | new |
| `stores/useConsentStore.ts`: per wallet `{ acceptedAt, scope, version }` and `withdraw()`, key `@ned_consent_v1` (Decree 356/2025 Art. 6 log) | new |
| Onboarding decision: the steps become `fund \| consent \| profile \| region \| home` | `services/onboarding.ts:65-75` |
| `executeHardReset` also clears the region and consent keys | `services/storage.ts:284` |
| Delete dead modules (refactor-plan PR4 list) in one commit, then run `npx tsc --noEmit` and `npx expo export --platform web` | see refactor-plan |
| Remove `getJwt` from `useAuth` (no consumers) | `services/auth/AuthProvider.tsx:232` |

The **screens** for consent and region come with the designs. Until then, `mode.tsx` stays the step after the profile and also writes the region (`simple` → `vn` is a temporary mapping), so onboarding keeps working.

### N12 · Demo operations

- Generate `DEMO_PAYOUT_PARTNER` with `solana-keygen new -o ~/.config/solana/ned-demo-partner.json`, outside the repo. Put its public key in `constants.rs` (`PAYOUT_PARTNERS`) and in `constants/chain.ts`, then redeploy (N6). Create its USDC ATA once.
- **`scripts/recycle-demo-usdc.ts --keypair <path> --to <mia>`:** sends the partner wallet's USDC back to Mia.
- **Second Google account for Mia (client):** create her profile on devnet; fund devnet SOL; claim faucet USDC on 7 and 8 Oct (20 per 2 h; 30 needed on the day).

### N13 · Security, README, tests

- **Keys:**
  - blank `EXPO_PUBLIC_JUPITER_API_KEY` in `.env.example:18` (B8);
  - the owner rotates the old relayer, Helius and Supabase keys and drains the relayer wallet (`docs/tong-hop-tien-do.md`);
  - restrict the Helius key to the GitHub Pages domain.
- **`package.json`:** `"test": "node --test \"services/**/*.test.ts\" \"utils/**/*.test.ts\""` (quoted, so Node expands the globs, including `services/__tests__`), so every test runs, including `history` and `amountInput`. Remove `deploy:web` and `scripts/deploy-web.js` (old Vercel deploy).
- **README technical part:** what runs; how to build the program and run the tests; how to deploy; environment variables. The product description and screenshots wait for the designs. Add a LICENSE file or remove the MIT claim (owner decides).

## 3. Interface for the screens (frozen with N9)

The screens built after the designs use only these. Types are in `services/milestone/view.ts`.

```ts
type Role = 'client' | 'freelancer';
type Region = 'vn' | 'intl';
type ChipTone = 'info' | 'accent' | 'warning' | 'success' | 'neutral';
type ActionKind = 'accept' | 'lock' | 'submit' | 'approve' | 'releaseNow' | 'refundNow'
                | 'close' | 'dispute' | 'concede' | 'proposeSplit' | 'acceptSplit';

interface MilestoneView {
  index: number;
  amountUnits: bigint; amountLabel: string;      // "10.00 USDC" or "≈ 260,000 VND (estimate)"
  submitBy: number; reviewBy: number;            // unix seconds, chain time
  status: 'pending' | 'submitted' | 'disputed' | 'released' | 'refunded' | 'cancelled';
  statusLabel: string; tone: ChipTone;           // per role, design prompt section 2
  countdown?: { to: number; label: string };     // e.g. "auto-release in 0:42"
  actions: ActionKind[];                         // what *this* user may do now (rules.ts)
  evidence?: string;                             // short hash
}

interface FundView {
  address: string; title: string; role: Role; region: Region;
  counterparty: { wallet: string; username?: string };
  totalLabel: string; lockedLabel: string;
  destination: { kind: 'ownWallet' | 'payoutPartner'; label: string; simulated: boolean } | null;
  state: 'created' | 'accepted' | 'funded' | 'settled';
  statusLabel: string; tone: ChipTone;
  milestones: MilestoneView[];
  nextAction?: { kind: ActionKind; milestone?: number; label: string };
  needsMyAction: boolean;
  tooLate: boolean;                              // work window passed before lock
  explorerUrl: string; vaultExplorerUrl: string;
  // added in N8 (2 Oct 2026): fund-level actions had no field, and acceptSplit needs the proposal
  actions: ActionKind[];                         // fund-level: accept, lock, close, proposeSplit, acceptSplit
  split?: { proposedByMe: boolean; toFreelancerUnits: bigint; toFreelancerLabel: string; toClientLabel: string }; // P1 only
}

// hooks
useChainTime(): number                                        // unix seconds, chain-based, ticks every second
useFunds(role?: Role): { funds: FundView[]; loading: boolean; error?: string; refresh(): Promise<void> }
useFund(address: string): { fund?: FundView; raw?: FundAccount; loading: boolean; refresh(): Promise<void> }
useRegion(): { region: Region | null; setRegion(r: Region): void }
useMilestoneActions(address?: string): {
  create(draft: ContractDraft): Promise<{ signature: string; fund: string }>;
  accept(choice: 'ownWallet' | 'payoutPartner'): Promise<{ signature: string }>;
  lock(): Promise<{ signature: string }>;
  submit(index: number, link: string): Promise<{ signature: string; evidence: string }>;
  approve(index: number): Promise<{ signature: string }>;
  releaseNow(index: number): Promise<{ signature: string }>;
  refundNow(index: number): Promise<{ signature: string }>;
  close(): Promise<{ signature: string }>;
  // P1, present only when FEATURES.dispute
  dispute?(index: number): Promise<{ signature: string }>;
  concede?(index: number): Promise<{ signature: string }>;
  proposeSplit?(toFreelancerUnits: bigint): Promise<{ signature: string }>;
  acceptSplit?(): Promise<{ signature: string }>;
  busy: boolean; status: string; error?: string;  // status: "Confirm in your wallet…", "Waiting for confirmation…"
  preview(kind: ActionKind, index?: number): Promise<{ feeLamports: number; rentLamports: number }>; // for FeeBreakdown
}

interface ContractDraft {
  freelancer: string;            // resolved wallet (resolveRecipient with fresh: true)
  title: string;                 // ≤ 32 bytes
  milestones: { amountUsdc: string; submitBy: number; reviewSeconds: number }[];
}
// validateDraft(draft, now, client?) → { ok: boolean; errors: { field: string; message: string }[] }  (client enables the same-party check)
// toFundView(fund, me, region, now, { names?, p1? }) → FundView  (names: wallet → "@username"; p1 defaults to FEATURES.dispute)
```

After every action the hooks refresh the affected fund. Errors are English sentences from `describeTxError(err, 'contract')`.

### 3.1 Amendment (3 Oct 2026, `build-plan.md` B1)

Additions only; nothing above is removed. B1 implements them and adjusts the types if the code needs it (announce any change).

```ts
interface BriefDraft {
  scope: string;                                  // ≤ 1,500 characters
  references: string[];                           // ≤ 5 URLs
  milestones: { name: string; criteria: string[] }[]; // same length as ContractDraft.milestones; ≤ 6 criteria each
}
interface DeliveryDraft {
  links: string[];                                // ≤ 5
  files: { name: string; size: number; sha256: string }[]; // ≤ 10; hashed on the device, never uploaded
  note: string;                                   // ≤ 500 characters
}
// ContractDraft gains: brief: BriefDraft
// MilestoneView gains: name?: string; criteria?: string[]; delivery?: { content?: DeliveryDraft; matches?: boolean; submittedAt: number; onTime: boolean }
// FundView gains: briefHash: string (short); contentStatus: 'ok' | 'mismatch' | 'noKey' | 'missing' | 'loading'; inviteLink?: string

useMilestoneActions(address?) changes:
  create(draft): Promise<{ signature: string; fund: string; inviteLink: string }>;   // posts the brief note(s)
  accept(choice): Promise<{ signature: string }>;          // passes SHA-256 of the decrypted brief shown (never fund.brief_hash); refuses unless contentStatus === 'ok'
  submit(index, delivery: DeliveryDraft): Promise<{ signature: string; evidence: string }>; // submit + delivery note

useContractContent(address: string): {
  brief?: Brief; contentStatus: 'ok' | 'mismatch' | 'noKey' | 'missing' | 'loading';
  deliveries: Record<number, { content?: DeliveryDraft; matches: boolean }>;
  hasKey: boolean; inviteLink?: string; importKey(fragmentOrLink: string): boolean; refresh(): Promise<void>; // accepts '#k=…' or a pasted contract link
}
```

**As built in B1 (3 Oct 2026). Changes to the block above, announced here:**

- **Where the code lives.** `content.ts`, `keys.ts` and `notes.ts` are in `packages/ned-core/src/milestone/` (W0), with re-export shims in `ned-wallet/services/milestone/`. `ned-wallet/constants/hosts.ts` exports `MOBILE_ORIGIN` and `WORKSPACE_ORIGIN` from the core config.
- **The hashed brief includes the on-chain title.** `brief_hash = SHA-256(canonicalBrief(title, BriefDraft))`, canonical JSON `{"v":1,"title","scope","references","milestones":[{"name","criteria"}]}`. Strings are trimmed and NFC-normalised, and empty list entries are dropped. The delivery is `{"v":1,"links","files":[{"name","size","sha256"}],"note"}`. A brief cannot be reused under another title.
- **Extra limits** \[Assumption, not in build-plan B1\]: milestone name ≤ 80 characters, criterion ≤ 200, URL ≤ 500, file name ≤ 200. Links and references must start with `http(s)://`. A note may use at most 8 parts × 855 plaintext bytes; longer briefs are refused with a sentence.
- **`useContractContent.importKey(fragmentOrLink)` returns `Promise<boolean>`** (key storage is asynchronous), not `boolean`. A link of another contract returns `false` and never overwrites this contract's key.
- **`useMilestoneActions` adds `postBrief(brief: BriefDraft)`.** `create` posts the brief after `create_fund`; if a brief transaction fails, the contract exists without a brief (`contentStatus: 'missing'`) and the client posts it again with `postBrief`, which checks the hash against `brief_hash`.
- **`accept` uses the brief this device showed.** The hash comes from what `useContractContent` last read for this wallet and contract. A screen must have shown the brief (status `'ok'`), or `accept` refuses.
- **`FundView.contentStatus` comes from `ViewOptions.content`.** `useFund` does not decrypt, so its `contentStatus` is `'loading'`. Screens that need content call `useContractContent` and pass `{ content, inviteLink }` to `toFundView`; the B4 screens do this.
- **Wallet signatures per action** (devnet, 3 Oct): `create` = 1 + one per brief part (2 for a typical brief); `accept` 1; `submit` 1, because the delivery note rides in the submit transaction (submit + a full 900-byte part = 1,166 bytes ≤ 1,232).

## 4. Checks before the screens start

- [ ] `anchor build && cargo test`: all P0 tests and the 10 identity tests pass
- [ ] Devnet program upgraded; IDL copied to the app; size, authority and signature recorded
- [ ] `npm test` (all `node --test`), `npx tsc --noEmit` and `npx expo export --platform web` succeed
- [ ] `milestone:devnet` runs green twice; the dev harness completes the cycle with two signed-in browsers (desktop Chrome and iPhone Safari)
- [ ] One definition of each mint, program ID and connection; B1–B8 fixed or (B8 rotation) handed to the owner
- [ ] Section 3 interface unchanged since N9, or changes announced to whoever builds the screens
