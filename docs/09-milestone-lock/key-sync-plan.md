# Key sync: read the brief on every device without pasting a link (proposal, 4 Oct 2026)

Status: **proposal, waiting for PO approval.** If adopted it becomes decision D22 and replaces the "key only in the invite link" part of D15.

## 1. Problem

D15 puts the contract key `K` only in the invite-link fragment `#k=`. A device that never opened that link cannot read the brief or the deliveries; the user must paste the link. The D1 run on 4 Oct showed this is the worst part of the experience: a freelancer who opens a contract from the Contracts list, a notification or another device sees "Open the contract link on this device…".

**Goal.** Any device signed in with the same Google account (same wallet) reads the brief and deliveries with no link and no paste. The invite link stays as the way to tell someone about a contract and as a fallback.

**Unchanged.** No backend (D4). The brief and deliveries stay encrypted; only hashes and ciphertext go on-chain. N.E.D never sees `K`.

## 2. Design

### 2.1 Wallet content key (one per wallet)

- Each wallet gets an X25519 key pair, the **wallet content key** (WCK).
- **Plan A (deterministic):** the app asks the wallet to sign one fixed message: `N.E.D content key v1 · This signature unlocks your private contract briefs. Sign it only in the N.E.D app.` Then `seed = SHA-256("ned-wck-v1" ‖ signature)` and the X25519 private key = `seed`. The same wallet on any device signs the same message, gets the same signature and therefore the same WCK, with nothing stored anywhere. **This works only if the Dynamic embedded wallet's `signMessage` returns the same signature every time** (standard Ed25519 does; threshold/MPC signers may not). Spike S0 checks this first.
- **Plan B (if signatures are not repeatable):** the first device creates a random WCK and keeps it on the device. A new device gets it **once** by scanning a "Pair this device" QR from a device that has it. Pairing happens once per device, not once per contract.
- The private WCK is cached on the device like `K` today (AsyncStorage / localStorage, per wallet). It never goes on-chain, in a URL, a log or an error.

### 2.2 Registry on-chain (program change)

- New account `ContentKey`, PDA `["content_key", wallet]`: `{ wallet, x25519_public: [u8; 32], version: u8, bump }` (about 75 bytes; rent ≈ 0.0014 SOL, paid once by the wallet).
- New instruction `set_content_key(x25519_public)`: signer = `wallet`; creates the account or updates it (re-key).
- The app registers silently after sign-in (one signature + one small transaction), and again only if the derived key changes.

### 2.3 Key wraps (program change)

- `post_note` gets `kind = 2` (**key**):
  - author is the client or the freelancer of the fund;
  - any state except closed;
  - `milestone = 0`, same size rules (`data ≤ 900` bytes, `parts ≤ 8`).
- `data` is a list of wraps. One wrap = `recipient (32) ‖ ephemeral X25519 public (32) ‖ nonce (24) ‖ XChaCha20-Poly1305(K) (48)` = 136 bytes, so 6 wraps fit in one part.
  - The wrap key is `HKDF-SHA256(X25519(ephemeral, recipient WCK), "ned-key-wrap-v1" ‖ fund ‖ recipient)`.
  - The AD is the fund address, so a wrap cannot be replayed onto another contract.
- **At `create_fund`**, the client's app adds one key note with wraps for the client's own WCK and the freelancer's WCK (when the freelancer has registered).
- A freelancer who got `K` from a link (not registered yet at create time) posts a wrap for their own WCK after reading the brief, so their other devices read it too.

### 2.4 Reading

1. Open a contract. If `K` is not on the device, look for key notes.
2. Find a wrap addressed to my wallet and unwrap it with my WCK; this signs the fixed message once per device in Plan A.
3. Save `K` on the device, then read the brief and deliveries as today, with the same hash checks (`brief_hash`, evidence).
4. Only if nothing unwraps: show the existing "Open with the contract link" fallback.

### 2.5 Security notes [Inference: needs review]

- Anyone who can make the wallet sign the fixed message can derive the WCK. The message names N.E.D and tells the user to sign it only in N.E.D. A phishing site could still ask for the same signature; the damage is limited to reading briefs (no money moves). Plan B avoids this risk.
- The wraps are public ciphertext. Without the recipient's WCK they reveal only who is a recipient (wallets that are already public parties of the fund).
- `K` stays per contract, so a leaked `K` exposes one contract only.

## 3. Work plan

| Step | Content | Needs | Estimate |
| --- | --- | --- | --- |
| **S0 · Spike** | Workspace-only check page `/key-check` (signed in): signs the fixed message twice (and once on the phone app), shows whether the signatures match and whether Dynamic showed its own prompt. Decides Plan A or B | PO runs it once with the Google account; deploy of the Workspace | 1 h |
| **P1 · Program v1.2** | `ContentKey` account + `set_content_key`; `post_note` kind 2; LiteSVM tests; IDL; core layout | **devnet program upgrade (PO approval)**; deploy wallet SOL | 3–4 h |
| **P2 · Core** | WCK derivation (Plan A) or storage + pairing (Plan B); wrap/unwrap; registry read/write; `readContractContent` unwraps; `runCreate` adds the key note; tests | `@noble/curves` as a direct dependency (already installed through web3.js; **PO approval** for the package.json change) | 3 h |
| **P3 · Apps** | Silent registration after sign-in (both apps); auto-unwrap on the contract pages; freelancer self-wrap after a link; fallback copy; Workspace `signMessage` | — | 4 h |
| **P4 · D1 again** | Run 1 and run 2 again; the brief must show with no paste on every device | PO | 1 h |

About 1.5 days. **Freeze is 9 Oct.** Cut line: if P1–P3 are not green by 7 Oct evening, ship D15 as is with the quick fixes (one-tap "Open with the contract link" from the clipboard, a "Open on another device" QR) and keep this for after the demo.

## 4. Documents to update when adopted

- `README.md` decision log: D22, plus a note on D15;
- `program-spec.md` v1.2: account, instruction, note kind, errors, tests;
- `build-plan.md` (new phase), `product-spec.md` (flow wording), `non-ui-plan.md` 3.1 (`ContractContent` gets the key source);
- `docs/tong-hop-tien-do.md`.
