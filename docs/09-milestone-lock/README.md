# 09 Milestone Lock: the single source of truth for building

**Current product direction (2 Oct 2026).** This folder replaces the product parts of `07-strategy-v3/` and `08-research/` wherever they disagree. Research, market data and legal reasoning stay in [`../08-research/ned-research-and-compliance.md`](../08-research/ned-research-and-compliance.md).

| File | What it is | Who reads it |
| --- | --- | --- |
| [`product-spec.md`](product-spec.md) | Product, flow, Vietnam path, screens, words, demo, cut order, disclosures | Everyone |
| [`program-spec.md`](program-spec.md) | Anchor accounts, byte offsets, instructions, events, errors, tests, deploy | Developers |
| [`unit_economics.py`](unit_economics.py) | Fee and revenue illustration; run `python3 unit_economics.py` | Biz, pitch |
| [`non-ui-plan.md`](non-ui-plan.md) | Tasks N0–N13 that do not wait for the redesign (program, chain layer, `services/milestone`, hooks, plumbing, scripts, security) and the frozen hook interface for the screens | Developers |
| [`refactor-plan.md`](refactor-plan.md) | Current code state, target architecture, PR0–PR7 with files and hours, schedule to 10 Oct, risks | Developers, PO |
| [`build-plan.md`](build-plan.md) | **Current build order (3 Oct):** gates G, program v1.1 (A), mobile wallet (B), web Workspace and landing (C), hardening (D); schedule and cut order to the 9 Oct freeze | Developers, PO |
| [`prompts-build.md`](prompts-build.md) | One Claude Code prompt per build-plan task (A1 → D2) and the owner checklist G | Developer, PO |

**In one line:** a foreign client locks USDC per milestone in `ned_program`; on approval or after the review deadline it goes to the freelancer's own wallet (international) or to a payout partner that pays VND to a Vietnamese bank account (Vietnam, partner simulated in the demo). N.E.D holds nothing and charges nothing in v1.

## Decision log

Adopted on 2 Oct 2026 to remove the contradictions below, so coding can start. The team may override any decision by **6 Oct**; the last column says what code would change.

| # | Decision | Why | Code impact if changed |
| --- | --- | --- | --- |
| D1 | If the client does not review by the review deadline, anyone can release, unless the client disputed in time | Protects the freelancer; Upwork (14 days) and Escrow.com do the same (08-research) | Remove `release_after_review` |
| D2 | Fee planned at 1% from the client at release; **no fee charged and no fee code in v1** | Decree 284/2026 Art. 7(4) risk until a lawyer answers (08-research) | Add a fee field via `_reserved` |
| D3 | Rotating Fund and Group Goal: roadmap slide only | One working demo beats two half-built ones | None (`kind` field reserved) |
| D4 | No backend for 10 Oct: the payout partner is a team-controlled devnet address. A small server (partner API and fee payer) comes after the final | Keeps the no-backend architecture (`ned-wallet/ARCHITECTURE.md`) | — |
| D5 | Partner follow-up: PO (Tuấn Đạt) sent the first questions to Due and Nium on 2 Oct; CL (Chính) logs every reply in Compliance Hub | One owner per step | — |
| D6 | **The client creates; the freelancer accepts and chooses the destination** (new instruction `accept`). Freelancer-created proposals are roadmap | Earlier docs said "either side creates" but had no step for choosing the destination | Add a `propose` path later |
| D7 | **`freelancer` (signer) and `payout_destination` (where money goes) are separate fields** | The 08-research design put the partner address in `freelancer`, so the Vietnam freelancer could not sign `submit` | — |
| D8 | The Vietnam freelancer signs `accept` and `submit` with the embedded login key; demo fees use devnet test SOL; before launch a fee payer covers them | Every Solana transaction needs a fee payer; "no crypto at any step" must hold at launch | `create_fund` already has a separate `payer` |
| D9 | Target payout design: **A, client-side partner account**. Design B (freelancer's own partner account) is not used. On-chain, v1 releases to the partner's allowlisted address with a 32-byte `payout_reference` naming the recipient (D13). If a partner can only match deposits by one address per recipient, switch to partner attestations (roadmap) | In design B the freelancer may own USDC for a moment (08-research, payout partners) | Unverified until Due/Nium reply |
| D10 | Customer: freelancers with foreign clients (in Vietnam, plus abroad). The 6 Oct survey is a go/no-go on demand (≥ 30% lost money, ≥ 30% say clients would lock), not a segment choice | Direction chosen by PO on 2 Oct | — |
| D11 | Disputes have no neutral arbiter in v1. A disputed milestone settles by client approval, freelancer `concede` or an agreed split, so funds never freeze; a client can still block auto-release, and we say so | Arbiter design needs legal review | Add `arbiter` via `_reserved` |
| D13 | The Vietnam destination must be on the program's payout-partner allowlist (`PAYOUT_PARTNERS`; devnet: one team wallet), plus a `payout_reference` (hash of the partner's recipient ID). The freelancer never types an address | Stops a client from substituting an address it controls; tells the partner whom to pay | Production: partner list behind the `mainnet` feature, or attestations |
| D12 | Words: [`product-spec.md` section 6](product-spec.md#6-words) replaces `07-strategy-v3` §11.3 | One table | — |
| D14 | Program v1.1 (3 Oct): `brief_hash` in `SharedFund` (740 bytes), `accept` confirms it, `submit` rejects all-zero evidence, new `post_note` | Without it nothing on-chain says what work was agreed, and a delivery cannot reach the client without a backend | Drop phase A of `build-plan.md`; brief and delivery become off-chain only |
| D15 | Brief and delivery travel as encrypted `post_note` data; the key is only in the invite-link fragment `#k=`; only hashes sit in the account | No backend (D4); content is not public | Encrypted off-chain storage after the final (needs a server) |
| D16 | One Expo app. Phones use the GitHub Pages build; computers use the Vercel build (`/workspace`); the landing page is a separate Vercel project (`site/`) | Keeps one codebase and the existing mobile demo link | Two origins mean two logins and two key stores: invite-link router and QR in `build-plan.md` C1 |
| D17 | Light theme, no outlines (tone and soft shadow), motion tokens of the canvas "Motion & surfaces" board; Reanimated 4 in the app, Motion for React only on the landing page | Canvas approved 3 Oct; Motion animates DOM elements only | Token files `constants/design.ts`, `constants/motion.ts` |
| D18 | The Vietnam view never offers "New contract" or client actions | A Vietnam resident locking USDC would hold a crypto asset (C10) | Remove the guard in `useRegion` checks |
| D19 | The landing page is built by a second team member; cut order in `build-plan.md` section 6 applies from 7 Oct | About 65 hours of work for one developer | — |

## Review fixes (3 Oct)

An independent review of the 2 Oct spec found these; a second review on 3 Oct checked the fixes, and the remaining gaps were closed the same day (payout reference for design A, vault bump at init, contract B timing, last 08-research mismatches).

| # | Finding | Fix |
| --- | --- | --- |
| R1 | A cancel proposal could be swapped or go stale before `accept_cancel` | `accept_cancel(expected_freelancer_amount, expected_unsettled)`; re-check; proposal cleared on every status change |
| R2 | `accept_cancel` did not update `released` / `refunded` | Both updated; invariant `released + refunded + unsettled == total` |
| R3 | Design A let the client supply a Vietnam destination it controls | Payout-partner allowlist (D13); freelancer never types an address |
| R4 | Zeroed unused milestone slots looked like Pending milestones | `index < milestone_count` everywhere; loops over used slots only |
| R5 | A dispute could freeze funds forever | `concede` by the freelancer (D11); disclosure |
| R6 | A late `lock` or `accept` could leave no time to work | `MIN_WORK_WINDOW_SECS` checked in `create_fund`, `accept`, `lock` |
| R7–R10 | 08-research still differed on destination timing, states, fee, words, cut order, Squads timing, USDC typo priority | 08-research edited to match |
| R11 | Demo needed 200 USDC and a script signing with embedded logins | 2 × 10 USDC; contract B prepared in the app; recycle script |
| R12 | Undefined `MilestoneInput`, vault given as an ATA, no per-instruction account lists, stack size | Defined in program-spec 3.1, 3.2, 4.1; `Box` |

## Contradictions resolved

| # | Contradiction | Where | Resolution |
| --- | --- | --- | --- |
| C1 | Partner address stored in `freelancer`, but `submit` needs the freelancer's signature | `08-research/ned-research-and-compliance.md`, core system | D7; fixed in the research doc |
| C2 | "No crypto at any step" vs the Vietnam freelancer paying SOL fees | Artifact, 08-research | D8; disclosure added |
| C3 | "Either side creates; the other confirms and chooses a destination", with no instruction for it | 08-research, artifact | D6 |
| C4 | Milestone Lock "roadmap only, do not show escrow" vs Milestone Lock as the main demo | `legal-brief.md`, `customer-demographic.md`, `competitor-comparison.md` vs `ned-research-and-compliance.md` | Old files marked superseded; the Vietnam path (VND only) is what makes the demo possible |
| C5 | Rotating Fund demo and segment A | `evaluation-and-plan.md`, `07-strategy-v3/` | Marked superseded; D3, D10 |
| C6 | "Vietnam version = ledger and reminder tool only" | `07-strategy-v3` §0, §10 | Superseded by the VND payout path |
| C7 | "Swap P0, fee 0.25%" as fixed principles | `docs/README.md`, `01`, `03`, `04` | Marked superseded for product direction; Swap and xStocks hidden from the demo path |
| C8 | Stripe reference fee "US$1.50 + 0.25% + 0.5% ≈ US$9" | 08-research | Vietnam is 1.00% cross-border + 1% FX (US senders): **≈ US$21.50 on US$1,000** \[Verified, Stripe pricing, 2 Oct 2026\] |
| C9 | "Outreach after 10 Oct" vs emails already sent | 08-research | Sent 2 Oct (D5) |
| C10 | Receiving USDC as wages: "grey zone" (artifact) vs "Prohibited \[Verified\]" (08-research) | Both | The text of Decree 52/2024 Art. 3(11) and 8(6) is verified; applying it to a recipient is \[Inference\]. We act as if it is prohibited |
| C11 | Pitch line "freelancers get paid safely" breaks the word rules | Artifact | "Freelancers receive their earnings, locked by code" |
| C12 | Read order for AI assistants points to v3 | `CLAUDE.md`, `docs/README.md` | Updated to this folder |
| C13 | Revenue model is Shared Money segment A | `07-strategy-v3/unit_economics.py` | New `unit_economics.py` here |

## What the numbers say (for Biz)

On a US$1,000 milestone the client would pay N.E.D US$10 at the planned 1%, once fees start (none in v1, D2). The Vietnam payout itself costs about **US$21.50** at Stripe's public prices; Due and Nium prices are not public. The Vietnam path is therefore **not** cheaper than Wise for plain transfers. The pitch sells protection (money locked before work starts, refund by deadline) against platform fees of 5–25%, never "cheapest".

## Questions still open (not blocking code)

1. Lawyer questions 1–5 in `08-research` (legal section), plus: **6.** Does a Vietnam resident signing on-chain `accept` and `submit` messages, without holding USDC, count as using a crypto asset?
2. Due and Nium (follow-up to the 2 Oct emails): can a deposit to one address be matched to a recipient by a reference, or is one address per recipient required (design A); is a payout instruction irrevocable once USDC arrives; startup eligibility; prices.
3. Survey result on 6 Oct (D10 thresholds).
