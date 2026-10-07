# Review of the compliance fix list and Q&A against the product direction

**From:** PO (Hồ Du Tuấn Đạt), prepared with Claude
**Date:** 6 Oct 2026
**Checked against:** `main` at `2cf55ec`

**Documents reviewed** (Chính's commits of 6 Oct, PR #34):

| Commit(s) | Document |
| --- | --- |
| `9d2a643`, `13df0b3` | [`compliance-fix-list.md`](compliance-fix-list.md) |
| `b1dcce0` | The status update in [`../08-research/ned-research-and-compliance.md`](../08-research/ned-research-and-compliance.md) |
| `43a272d` | [`qa-cheatsheet.md`](qa-cheatsheet.md) and [`expert-check-pack.vi.md`](expert-check-pack.vi.md) |
| `e8287f9` | [`../../.github/CODEOWNERS`](../../.github/CODEOWNERS) and the PR template |

**Status:** for discussion with the Compliance Lead (CL). Nothing here is legal advice. Labels: \[Verified\] = checked in the code or the deployed build on 6 Oct; \[Inference\]; \[Unverified\].

## 1. Verdict

**The fix list fits the product direction and should be adopted.** It defends the two claims the whole product rests on:

- the Vietnam user never touches crypto (D7, D13, D18);
- N.E.D holds no funds and charges no fee (D2, D4).

It also adds two things the build plan missed:

- a region guard on every wallet route (V1);
- a consent step in the Workspace (P4).

Every finding we re-checked in the code is real (section 2).

**Twelve adjustments are needed (section 4).** Three of them change what we would say to judges:

- **A1.** The Q&A says an agreed split "works today". It does not: split is behind the same switched-off flag as disputes.
- **A2.** The Q&A says "we add wallet screening". No screening exists in the code.
- **A4.** "The Vietnam user never touches crypto" needs one precise sentence. A Vietnam-view user still has an embedded wallet, signs `accept` and `submit`, and holds devnet SOL for fees (D8).

## 2. What we re-checked in the code (6 Oct)

| Item | Finding in the fix list | Re-check on `2cf55ec` |
| --- | --- | --- |
| C1 | "A licensed payout partner" on the accept screen | Confirmed: `ned-wallet/app/contracts/[fund]/accept.tsx:119` \[Verified\] |
| C2 | Disclosures describe disputes that are switched off | Confirmed: `FEATURES.dispute: false` (`constants/features.ts:13`), text at `app/disclosures.tsx:19` \[Verified\] |
| C4 | "paid out in VND", "VND payout" | Confirmed in five places:<br>• `Review.tsx:136`, `:160` and `:329`;<br>• core `milestone/view.ts:86`;<br>• core `actions.ts:332`.<br>\[Verified\] |
| C5 | Vietnamese "Nhận tiền thành công" banner | Confirmed: `stores/useNotificationStore.ts:126` \[Verified\] |
| V1 | Vietnam view reaches `/send`, `/receive`, `/history`, `/scan-qr` by URL | Confirmed: none of the four screens checks the region \[Verified\] |
| P1 | Sign-out deletes the consent log | Confirmed: `services/storage.ts:115-118` \[Verified\] |
| R2 | MIT claimed, no LICENSE file | Confirmed: no `LICENSE`, `README.md:241` \[Verified\] |
| F4 | `/wallet` CSP is Report-Only | Confirmed in `ned-workspace/vercel.json` \[Verified\] |
| S1 | Jupiter key still in the live bundle | Confirmed: `jup_` is present in `gh-pages`, file `_expo/static/js/web/index-f7013d….js` \[Verified\] |

Not re-checked here: S2 (Helius dashboard), S3 (old keys in history), the separate landing-page repo (F9).

## 3. Fit with the product direction, item by item

| Fix-list item | Decision it protects | Fit | Note |
| --- | --- | --- | --- |
| S1–S3 keys | Security rule in `CLAUDE.md`; build-plan G3 | ✅ | Same as the open owner tasks G3 and T0.2; owner work, not code |
| C1 "licensed" | Word table (product-spec §6), D5, D9 | ✅ | Use the exact new text |
| C2 disputes | D11 | ✅ but incomplete | See **A1**: the text must also say that split is off |
| C3 phone hash | PDP Law 91/2025 (see 08-research) | ✅ | Hiding the field is right for the demo; see **A5** for the cost |
| C4 "paid out" | Word table | ✅ | Also fix the design boards (**A7**) |
| C5 Vietnamese banner | English-only rule; D18 | ✅ | — |
| V1 route guard | D18; core claim | ✅ **highest priority** | Must also work inside the Workspace extension (`/wallet`, D23), which shares the same routes |
| V2 onboarding order | Consent before processing | ✅ | Go one step further for the Vietnam view (**A4**) |
| P1 consent log | Consent record | ✅ | — |
| P2 consent v2 | D15, D22 (data written on-chain) | ✅ | The text matches what the build writes on 4 Oct |
| P3 Terms / Privacy | Consent quality | ✅ | The fallback (remove the sentence) is acceptable if time runs out |
| P4 Workspace consent | D20, D23 | ✅ | Fits W6: `/wallet` is same-origin, so the consent store is shared |
| R1 README | Competition rules | ✅ | Must also mention D21 (landing page in another repo) |
| R2 LICENSE | Build-plan G5 (open since 3 Oct) | ✅ | PO decision |
| D1–D4 | Decision log, D10 survey | ✅ | D3 and D4 were due 6 Oct; still open |
| F1–F11 | Honesty of numbers and data | ✅ | F5 and F2 also apply to the Workspace (the `/new` editor and the coming Records page, W7) |
| G1–G8 known limits | Honest Q&A | ✅ | G1 should say disputes **and split** are off (A1) |
| Q&A sheet | Pitch | ⚠️ | A1, A2, A3, A4 and A10 change answers |
| Expert-check pack | Open legal points | ✅ | Q6 (signing without holding USDC) is the most important question for our core claim |
| CODEOWNERS + PR template | "Everything public goes past CL" | ✅ | Only enforced after the PO turns on "Require review from Code Owners" (**A9**) |

## 4. Adjustments

### A1 · Split is not available in the demo (Q&A 10, fix-list D2 row 8, C2)

- **Fact:** the flag comment says "P1 group: dispute, concede, propose/accept split. Off until the screens exist." `useMilestoneActions` returns the P1 actions only when `FEATURES.dispute` is on. The split actions appear only in the dev harness `app/dev/milestone.tsx`. \[Verified\]
- **Problem:** Q&A 10 ("an agreed split works today") and the fix-list D2 row for Q8 ("In this demo they can agree a split") claim a feature a judge cannot reach.
- **Change:**
  - Q&A 10 and Q8: "Disputes and a mutual split are built into the program but switched off in this demo app. After the review deadline anyone can release to the freelancer. A neutral reviewer is on the roadmap."
  - C2 disclosure body: "In this version a client cannot open a dispute and the two sides cannot split a milestone in the app. If the client does not review before the review deadline, anyone can release the milestone to the freelancer. There is no neutral arbiter."
- **Product note:** with disputes off, the client's only protection is to review before the deadline. The pitch must say "protection by deadlines", not "protection against bad work". The alternative is to turn the P1 group on (about 6 h of screens \[Assumption\]). We recommend keeping it off before the freeze.

### A2 · Q&A 3 overclaims AML controls

- **Fact:** there is a per-contract cap (`MAX_CONTRACT_AMOUNT` = 1,000 USDC in the program and the core). There is no wallet screening anywhere in the code. \[Verified\]
- **Change:** "The partner does KYC and holds bank details. The program caps each contract at 1,000 USDC. Before launch we would add wallet screening and the red flags from the new AML law. Devnet has no KYC, and we say so."

### A3 · Q&A 9 says "we're not offering a service to anyone"

- **Problem:** both builds are public. Anyone can sign in with Google and use them on devnet. "Not offering a service to anyone" can be shown false in one click.
- **Change:** "It's a public student prototype on devnet: test tokens with no value, no real money can be used, no fee, no payout partner connected. Nothing is sold or marketed to users in Vietnam."

### A4 · Make "the Vietnam user never touches crypto" precise

**Fact.** In the Vietnam view the user:
- has an embedded wallet;
- signs `accept` and `submit` (plus the v1.2 device-key and key-note transactions);
- holds devnet SOL for fees (D8).

V2 only labels the SOL balance.

**Risk.** A judge who sees a SOL balance, or a signature prompt, hears a contradiction.

**Change**
- **App** (with V1/V2), Vietnam view:
  - show no SOL amount anywhere;
  - make the fund step automatic ("Preparing your account…");
  - keep the "Network fees use test SOL" disclosure.
- **Q&A 1, add:** "The Vietnam user never receives, holds or sends USDC through N.E.D. To accept and submit they sign with a login wallet; on devnet the network fee is paid with test SOL, and before launch a fee payer covers it (D8). Whether signing alone counts as 'using' a crypto asset is the first question for our lawyer (expert pack Q6)."

### A5 · Hiding the phone field (C3) removes one way to find a freelancer

- Today a client can find a freelancer by @username, phone or wallet.
- With the phone field hidden in onboarding, new users have no phone link, so the client uses @username.
- This is acceptable for the demo (the demo uses @username). Record it in the progress log, and do not show phone lookup in the pitch.

### A6 · Keep the Terms "not a marketplace" line, and add a Q&A answer for the job-board idea

> **Superseded on 6 Oct by D25:** the PO decided to build Funded Jobs for the demo. The new Terms line and Q&A answer are in [`../09-milestone-lock/funded-jobs-plan.md`](../09-milestone-lock/funded-jobs-plan.md) section 9; the legal point below still stands and goes to the expert-check pack.

The draft Terms say N.E.D "is not a payment service, a bank, an exchange or a marketplace". This matches the current direction (D10: freelancers bring their own clients).

The "Funded Jobs" board discussed on 6 Oct is a roadmap idea only. If it comes up, the answer is:

> "Today N.E.D protects work you already have. A board of jobs with money already locked is a later idea; it needs its own legal review first (e-commerce platform rules and the employment-service licence under Law 74/2025 and Decree 352/2025)."

That legal point is \[Unverified\]: we did not read Decree 352/2025 Art. 19, and the source was not reachable on 6 Oct.

### A7 · The design boards repeat banned wording

The canvas boards and `docs/02-thiet-ke/canvas-v2/` contain banned or vague wording:
- "paid out in VND" in WebReview and the wallet panel confirm state;
- "VND payout simulated" in WebRecords.

They also lack the F5 hint ("Public on Solana. Don't put names or personal details here.") under the contract title.

**New item F12 (Design/PO):** fix the boards, so nobody copies the old wording back into the apps.

### A8 · Order the P0 work by risk, with a cut line

Dev work in the list is about 12–15 hours \[Assumption\]. Order:

1. **V1** and **A4** (core claim). Then **C1–C5** (copy, about 1.5 h).
2. **P1**, then **P2 + P3** (consent v2, Terms and Privacy pages in both apps). Then **P4** (Workspace consent gate; self-hosted fonts).
3. **V2**, then **R1** (README).
4. F-items only if time is left. F2 and F5 first, because they cover data and money statements.

**Cut line on 8 Oct, 18:00:**
- if Terms and Privacy pages are not live, use the P3 fallback sentence;
- if fonts are not self-hosted, keep them but mention Google Fonts in the Privacy notice.

### A9 · CODEOWNERS only works when branch protection requires it

The file is advisory until the repo owner turns on "Require review from Code Owners" for `main`. That is a PO action today.

Note: every app screen path is owned by CL alone. Set the rule to "one approving review", so that CL's absence on 9 Oct does not block a hot-fix.

### A10 · Numbers and laws in the Q&A sheet

- The tax answer (Q5: VND 500 m threshold, 2% or 15%, Law 109/2025) should be read once from the official text before it is printed. Until then, say only: "We give a record, not tax advice; the thresholds are in Law 109/2025."
- The sheet already flags "official PDFs still to open".
- The survey row stays blank until D4 is recorded. If the numbers are below the D10 thresholds, the pitch uses only the sourced figures.

### A11 · Keep the build plan and the fix list in one place

The fix list is now the source of truth for compliance work until 9 Oct. Add one line to `docs/tong-hop-tien-do.md` under open issues:

> "Compliance P0: see `docs/05-legal/compliance-fix-list.md` and this review"

Tick items there with the commit hash, as the list asks.

### A12 · Small wording points

| Point | Change |
| --- | --- |
| C4 replacement "sent as VND" | Good. Use the same verb in the Records CSV note (F2) and the Workspace Records page (W7) |
| F1 rate | The 08-research source is "Wise mid-market, 2 Oct 2026". Use exactly that label in both apps |
| Privacy draft | Add Ably (used by Dynamic, fix-list P2) and Vercel/GitHub Pages logs, so the "where data goes" list is complete |
| Terms item 2 | "lock test USDC per milestone in a Solana program and release it to the freelancer" → add "or refund it to the client after a missed deadline", so it matches the program |

## 5. Decisions needed from the PO today

| # | Decision | Recommendation |
| --- | --- | --- |
| 1 | Disputes and split for the final: on or off? | **Off**; fix the copy as in A1. **Superseded 7 Oct by D27: request changes is on in the Workspace** |
| 2 | Phone field in onboarding | **Hidden** for the demo (C3, A5) |
| 3 | LICENSE | Add an **MIT** file if the whole team agrees (each member is a copyright holder); otherwise remove the claim |
| 4 | D1–D5 | Write "Confirmed 6 Oct" in the decision log |
| 5 | Survey D4 | Record n and both percentages, even if below the threshold |
| 6 | Branch protection | Turn on Code Owners review with a one-approval rule (A9) |
| 7 | Keys S1–S3 | Revoke or rotate today, then redeploy `gh-pages` and Vercel |

## 6. Plan to the freeze

| Date | PO | Dev | CL | Design |
| --- | --- | --- | --- | --- |
| 6 Oct | Decisions 1–7; keys S1–S3 | — | Apply A1, A2, A3, A4, A6, A10 to the Q&A sheet and the fix list | — |
| 7 Oct | Review PRs | V1 + A4, C1–C5, P1, P2 | Review each PR (template) | F12 board wording |
| 8 Oct | README R1 with Dev | P3, P4, V2, then F2, F5; cut line 18:00 | Section H walkthrough on the live builds | Final screenshots for the README |
| 9 Oct | Freeze | Deploy both builds | Sign-off | — |

## 7. What stays as it is

- The product claim, the decision log (D1–D24) and the build already delivered.
- The fix list's priorities, owners and "Done when" checks, with the changes above.
- The known limits (section G), with G1 extended to cover the split.
