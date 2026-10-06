# Q&A cheat sheet (Compliance Lead)

UniHackFest 2026 final, 10 Oct · build of 4 Oct (program v1.2, devnet) · last checked 6 Oct 2026 · not legal advice. Full answers: [`../08-research/ned-research-and-compliance.md`](../08-research/ned-research-and-compliance.md) (Q&A 1–16). Fixes: [`compliance-fix-list.md`](compliance-fix-list.md).

> **One sentence:** A foreign client locks USDC for each milestone before work starts. Approval or the review deadline releases it to the freelancer's own wallet, or, for a freelancer in Vietnam, to a payout partner abroad that would send VND to their bank. **The Vietnam user never touches crypto. N.E.D holds no funds and charges no fee.**

## Questions the Compliance Lead answers

1. **Is this legal in Vietnam?** "Crypto isn't a lawful payment instrument in Vietnam (Decree 52/2024, Art. 8(6)). So our Vietnamese user never receives crypto: the client locks USDC abroad, and a payout partner abroad would send VND by bank transfer. Today the partner is simulated; candidates are Due and Nium. We hold no funds. Before real money moves, a lawyer must confirm our software isn't a crypto-asset service under Decree 284/2026."
2. **Who holds the money?** "The program. No N.E.D key can move locked funds; deadlines written at creation decide release or refund. Until the final our deploy wallet can still upgrade the program to fix bugs; before mainnet that goes to a multisig or the program is frozen."
3. **KYC / AML?** "The partner does KYC and holds bank details. We add per-contract caps, wallet screening and the red flags from the new AML law. Devnet has no KYC, and we say so."
4. **Personal data?** "Login via Dynamic (US) with explicit consent. Bank data only at the partner. On-chain: addresses, usernames, titles, hashes and device keys are public; briefs and deliveries are encrypted, and only the two parties hold the key. The phone hash can be brute-forced today, so OTP and an off-chain keyed hash come before launch."
5. **Tax?** "Up to VND 500 m a year of business revenue is PIT-free (Law 109/2025, Art. 7); above that, 2% of the excess for services, or 15% of profit. We give a record, not tax advice."
6. **Can a Vietnam user switch to USDC?** "In the demo residence is self-declared. At launch the partner's KYC decides who uses the VND path."
7. **Can N.E.D read contracts?** "No. Content is encrypted on the users' devices; we never hold the key."
8. **Audited? Mainnet?** "Neither. Devnet, test money. Audit, partner sandbox and legal opinion come first."
9. **Isn't pitching this "marketing a crypto service"?** (Decree 284/2026 Art. 7(4) also covers advertising.) "It's a student prototype on devnet with test money. We're not offering a service to anyone, nothing is live, and nothing is charged."
10. **Client never reviews / they disagree?** "After the review deadline anyone can release to the freelancer. Disputes are off in this demo; an agreed split works today; a neutral reviewer is on the roadmap."

**If unsure:** "That's on our list for the lawyer. What we know today is …" Never guess an article number.

## Words

| Say | Never say |
| --- | --- |
| lock, release, refund, receive earnings, transfer, record | pay / payment / thanh toán (for USDC), escrow (in the UI), ký quỹ, invest, safe, guaranteed, scam-free, tax-compliant |
| "payout partner, simulated; candidates Due and Nium" | "our partner", "licensed partner", "licensed Vietnamese crypto partner" |
| "devnet, test money" | "first", "zero fees", "cheaper than Wise", "Deel/Payoneer have no stablecoins", an exact time to VND |

## Numbers (always say the year)

| Fact | Source |
| --- | --- |
| 68% of Vietnamese freelancers not paid at least once | PayPal survey, **2017**, n = 1,602, 4 markets |
| 85% of contractors paid late at least sometimes | Remote, Feb 2025, global |
| Platform cost on US$1,000 | Upwork client 5% + freelancer 0–15%; Fiverr 5.5% + 20% |
| N.E.D planned fee | 1% from the client, **nothing charged in v1** |
| Partner fee reference | ≈ US$21.50 on US$1,000 (Stripe public rate). **Not cheaper than Wise**: we sell protection |
| USDC on Solana | ≈ US$7.2 bn, 9.7% of USDC (read 2 Oct 2026) |
| Vietnam crypto adoption | 4th of 151 (Chainalysis, Sep 2025) |
| Demo amount | 20 devnet USDC ≈ 520,000 VND (rate 26,019.5, 2 Oct) |
| Our survey | n = ___ · not paid ___% · would lock ___% (fill after the go/no-go) |

## Laws (checked 6 Oct 2026 against legal databases; official PDFs still to open)

| Text | What to say |
| --- | --- |
| Decree 52/2024 | Art. 3(11): an "unlawful payment instrument" is any instrument outside the licensed list in Art. 3(10). Art. 8(6): ban on issuing, supplying or using one. In force 1 Jul 2024 |
| Decree 340/2025 | Art. 30(6)(d): VND 150–200 m; organisations pay double (Art. 5(3)(a)) |
| Decree 284/2026 | Art. 7(4): providing, *or advertising or marketing*, a crypto-asset service without a licence: organisations 180–200 m, individuals 90–100 m. In force 1 Sep 2026 |
| Resolution 05/2025 | Crypto pilot; custody = receiving, storing and transferring crypto for customers; settlement in VND |
| PDP Law 91/2025 + Decree 356/2025 | Explicit consent, no implied consent; bank data is sensitive |

## Known limits (admit them)

Devnet only · no KYC · not audited · partner simulated · phone not OTP-verified · residence self-declared · no neutral arbiter · Circle can freeze USDC · on-chain data is permanent · upgrade authority on the deploy wallet until the final.

## Public posts and booth (Decree 284 Art. 7(4))

Describe N.E.D as a **student prototype on devnet with test money**. No "sign up now", no "start receiving USDC", no posts aimed at users in Vietnam, no exchange or referral links. Send every post and booth text to the Compliance Lead first.
