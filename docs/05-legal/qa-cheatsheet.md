# Q&A cheat sheet (Compliance Lead)

UniHackFest 2026 final, ~10 Oct · build: `main`, program v1.3 on devnet (Milestone Lock + Funded Jobs + request changes) · last checked 7 Oct 2026 · not legal advice.

**On stage, answer in Vietnamese:** the Vietnamese answers to say out loud are in [`../09-milestone-lock/final-pitch.md`](../09-milestone-lock/final-pitch.md) §4. This sheet is the English reference behind them. If the two differ, final-pitch.md wins. Background: [`../08-research/ned-research-and-compliance.md`](../08-research/ned-research-and-compliance.md).

> **One sentence:** A foreign client locks USDC for each milestone before work starts. The client accepts and releases it; if the client does not review in time, anyone can press Release now. Release goes to the freelancer's own wallet or, for a freelancer in Vietnam, to a payout partner abroad that would send VND to their bank (simulated in the demo). **The Vietnam user never receives, holds or sends USDC through N.E.D. N.E.D holds no funds and charges no fee.**

## Questions the Compliance Lead answers

1. **Is this legal in Vietnam?** "Crypto is not on the list of lawful payment instruments in Vietnam (Decree 52/2024, Art. 3(10)–(11); ban in Art. 8(6)). So our Vietnamese user never receives crypto. The client locks USDC abroad, and a payout partner abroad would send VND by bank transfer. Today the partner is simulated; the candidates are Due and Nium. We hold no funds. The Vietnam user only signs accept and submit with a login wallet; on devnet the network fee is test SOL, and before launch a fee payer covers it. Before real money moves, a lawyer must confirm our software is not a crypto-asset service under Decree 284/2026, and whether signing alone counts as using a crypto asset."
2. **Who holds the money?** "A vault owned by the program. No instruction lets N.E.D move locked funds; the rules written at creation decide release or refund. Until the final, our deploy wallet can still upgrade the program to fix bugs, and the app's Disclosures say so. Before mainnet that goes to a Squads multisig or the program is made unchangeable."
3. **KYC / AML?** "KYC and bank details would sit with the payout partner, never with us. The program caps each contract at 1,000 USDC. Devnet has no KYC, and we say so. Wallet screening and the red flags of the new AML law are on the roadmap, not built."
4. **Personal data?** "Login via Dynamic (US) with explicit consent. Bank data only at the partner. Public on Solana: addresses, usernames, contract titles, fingerprints, device public keys, and job listings and pitches. Contract briefs and deliveries are encrypted; the key is on the parties' registered devices and in the contract link, never with N.E.D. The app warns people not to put personal data in titles, listings or pitches."
5. **Tax?** "Business revenue up to VND 500 m a year is not subject to PIT (Law 109/2025, Art. 7(1), from 1 Jul 2026). Above that it is 2% of the excess for services, or 15% of profit. We give a record to export, not tax advice."
6. **Can a Vietnam user switch to the USDC view?** "In the demo residence is self-declared. At launch the partner's KYC decides who uses the VND path, and the app follows it."
7. **Can N.E.D read contracts?** "No. Content is encrypted on the users' devices and N.E.D never holds the key. Anyone the parties give the contract link to can read it, and the app says so."
8. **Audited? Mainnet?** "Neither. Devnet, test money. An audit, a partner sandbox and a legal opinion come first."
9. **Isn't pitching this "marketing a crypto service"?** (Decree 284/2026 Art. 7(4) also covers advertising.) "It is a public student prototype on devnet: test tokens, no fee, no payout partner connected, and nothing is marketed to users in Vietnam."
10. **Client never reviews / they disagree?** "If the client does not review before the review deadline, anyone can press Release now and the freelancer receives the earnings. If the client requests changes before that deadline, the amount stays locked until both agree: the client accepts a revised version, the freelancer returns it, or both agree a split. There is no neutral arbiter yet; that is on the roadmap."
11. **Is this a job marketplace?** "Businesses post funded jobs and choose freelancers themselves. N.E.D does not select, vet or employ anyone, is not a party to the work, and takes no fee." Do not say the board is outside employment-services law (Law 74/2025, Art. 27–28); that question is open with our expert.

**If unsure:** "That's on our list for the lawyer. What we know today is …" Never guess an article number.

## Words

| Say | Never say |
| --- | --- |
| lock, release, refund, receive earnings, request changes, Release now, transfer, record | pay / payment / thanh toán (for USDC), escrow (in the UI), ký quỹ, invest, safe, guaranteed, scam-free, tax-compliant, **auto-release**, "not a payment service", "we're not offering a service", "we screen wallets", "no one can move the funds" |
| "payout partner, simulated; candidates Due and Nium" | "our partner", "licensed partner", "licensed Vietnamese crypto partner" |
| "devnet, test money" | "first", "zero fees", "cheaper than Wise", "Deel/Payoneer have no stablecoins", an exact time to VND, "the Vietnam user never touches crypto" |

## Numbers (always say the year)

| Fact | Source |
| --- | --- |
| 68% of freelancers in Vietnam had experienced not being paid (highest of 4 SEA markets) | PayPal survey, fieldwork Oct 2017, published Mar 2018; n = 1,602 freelancers and "freelance considerers" across SG, ID, VN, PH |
| 85% of contractors paid late at least sometimes | Remote, Feb 2025, global |
| Platform cost on US$1,000 | Upwork client 5% + freelancer 0–15%; Fiverr 5.5% + 20% |
| N.E.D planned fee | 1% from the client, **nothing charged in v1** |
| Partner fee reference | ≈ US$21.50 on US$1,000 (Stripe public rate). **Not cheaper than Wise**: we sell protection |
| USDC on Solana | ≈ US$7.2 bn (DefiLlama, 7 Oct 2026) |
| Vietnam crypto adoption | 4th of 151 (Chainalysis, Sep 2025) |
| Demo amount | 20 devnet USDC ≈ 520,000 VND (rate in the app: 26,019.5, 2 Oct; Wise 25,990 on 7 Oct) |
| Program | 27 instructions, 53 error codes, 24 events, 54 tests (`cargo test`) |
| Our survey | n = ___ · not paid ___% · would lock ___% (fill after the go/no-go) |

## Laws (checked 6–7 Oct 2026 against legal databases; official PDFs still to open)

| Text | What to say |
| --- | --- |
| Decree 52/2024 | Art. 3(10) lists lawful non-cash instruments; Art. 3(11): anything else is unlawful. Art. 8(6): ban on issuing, supplying or using one. The decree does not name crypto; "crypto is not on the list" is our reading. In force 1 Jul 2024 |
| Decree 340/2025 | Fines for unlawful payment instruments: VND 150–200 m for individuals, double for organisations (Art. 5(3)(a)). In force 9 Feb 2026. **Do not quote Art. 30(6)(d) on stage** until the official text is opened |
| Decree 284/2026 | Art. 7(4): providing, *or advertising*, a crypto-asset service without a licence: organisations 180–200 m, individuals 90–100 m. In force 1 Sep 2026 |
| Resolution 05/2025 | Crypto pilot (9 Sep 2025, 5 years); custody = receiving, storing and transferring crypto for customers; settlement in VND |
| PDP Law 91/2025 + Decree 356/2025 | Explicit consent, no implied consent; bank data is sensitive. In force 1 Jan 2026 |
| Law 74/2025 + Decree 352/2025 | Employment services (incl. online job placement) need a licence. Whether our job board counts is **[Unverified]**: expert question |

## Known limits (admit them)

Devnet only · no KYC · not audited · partner simulated · phone not OTP-verified · residence self-declared · no neutral arbiter (requested changes keep the amount locked until both agree) · Circle can freeze USDC · on-chain data is permanent · upgrade authority on the deploy wallet until the final · the phone app cannot yet respond to a change request (use the Workspace).

## Public posts and booth (Decree 284 Art. 7(4))

Describe N.E.D as a **student prototype on devnet with test money**. No "sign up now", no "start receiving USDC", no posts aimed at users in Vietnam, no exchange or referral links. Send every post and booth text to the Compliance Lead first.
