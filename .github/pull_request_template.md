## What changed

<!-- One or two lines. Link the task (e.g. fix-list item C1, build-plan B4). -->

## How I checked it

<!-- Commands run (tests, build), screens opened, devnet transaction links. -->

## Compliance check (tick or write N/A)

- [ ] **No user-facing text changed**, or every changed string follows the word table in `docs/09-milestone-lock/product-spec.md` §6: *lock, release, refund, receive earnings, transfer, record*; never *pay/payment/thanh toán, escrow (UI), ký quỹ, invest, safe/an toàn, guaranteed, first, zero fees, licensed partner*.
- [ ] The payout partner is described as **simulated** (candidates: Due, Nium) wherever it appears.
- [ ] The **Vietnam view** still shows no USDC balance, no send/receive/swap, and VND only as "≈ … VND (estimate)".
- [ ] **No secrets** added (API keys, keypairs, `.env`); public `EXPO_PUBLIC_*` / `VITE_*` values are restricted to our domains.
- [ ] **Personal data:** nothing new is written on-chain or sent to a third party, or the consent text and Disclosures were updated with the Compliance Lead.
- [ ] Disclosures screen still matches what this build does (devnet, no KYC, not audited, partner simulated, disputes on/off, Circle freeze, not advice).
- [ ] Compliance Lead (@F4ol4n) asked to review if any box above is not N/A.
