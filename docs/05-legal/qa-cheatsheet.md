# Q&A cheat sheet (Compliance Lead)

UniHackFest 2026 final, **10 Oct 2026** (confirmed; team entered in both tracks) · build: `main`, program v1.4 on devnet (Milestone Lock + N.E.D Jobs with lock at hire (D29) + request changes) · last checked 7 Oct 2026 (V7) · not legal advice.

**On stage, answer in Vietnamese:** the Vietnamese answers to say out loud are in [`../09-milestone-lock/final-pitch.md`](../09-milestone-lock/final-pitch.md) §4. This sheet is the English reference behind them. If the two differ, final-pitch.md wins. Background: [`../08-research/ned-research-and-compliance.md`](../08-research/ned-research-and-compliance.md). Full pre-pitch check and fix list: [`pre-pitch-check-7oct.md`](pre-pitch-check-7oct.md).

**Final criteria (organisers, confirmed 7 Oct):** Technical Difficulty & Depth (30) · Architecture & Smart Contract Quality (25) · Solana Stack, Composability & Performance (25) · Build Evidence, Documentation & Reproducibility (20). Answers that point to a file, a test or an Explorer link score on the last criterion.

> **One sentence:** A foreign client locks USDC for each milestone before work starts. The client accepts and releases it; if the client does not review in time, anyone can press Release now. Release goes to the freelancer's own wallet or, for a freelancer in Vietnam, to a payout partner abroad that would send VND to their bank (simulated in the demo). **The Vietnam user never receives, holds or sends USDC through N.E.D. N.E.D holds no funds and charges no fee in v1.**

## Questions the Compliance Lead answers

1. **Is this legal in Vietnam?** "In our reading, crypto is not on the list of lawful payment instruments in Vietnam (Decree 52/2024, Art. 3(10)–(11); ban in Art. 8(6)). So our Vietnamese user never receives crypto. The client locks USDC abroad, and a payout partner abroad would send VND by bank transfer. Today the partner is simulated; the candidates are Due and Nium. We hold no funds. The Vietnam user only signs accept and submit with a login wallet; on devnet the network fee is test SOL, and before launch a fee payer covers it. Before real money moves, a lawyer must confirm our software is not a crypto-asset service under Decree 284/2026, and whether signing alone counts as using a crypto asset."
2. **Who holds the money?** "A vault owned by the program. No instruction lets N.E.D move locked funds; the rules written at creation decide release or refund. Until the final, our deploy wallet can still upgrade the program to fix bugs, and the app's Disclosures say so. Before mainnet that goes to a Squads multisig or the program is made unchangeable."
3. **KYC / AML?** "KYC and bank details would sit with the payout partner, never with us. The program caps each contract at 1,000 USDC. Devnet has no KYC, and we say so. Wallet screening and the red flags of the new AML law are on the roadmap, not built."
4. **Personal data?** "Login via Dynamic (US) with explicit consent. Bank data only at the partner. Public on Solana: addresses, usernames, contract titles, fingerprints, device public keys, and job listings and pitches. Contract briefs and deliveries are encrypted; the key is on the parties' registered devices and in the contract link, never with N.E.D. Job listings, job briefs and pitches are public and permanent, and the app warns people not to put personal data in them. A linked phone number is stored as a hash, which can be reversed by trying every number, so we treat it as public."
5. **Tax?** "Law 109/2025, Art. 7(1) sets a VND 500 m yearly threshold for individuals with business revenue, from the 2026 tax period. Whether freelance service income from abroad is classed as business revenue is a question for our tax expert. We give a record to export, not tax advice." Do not quote the rates above the threshold on stage.
6. **Can a Vietnam user switch to the USDC view?** "In the demo residence is self-declared. At launch the partner's KYC decides who uses the VND path, and the app follows it."
7. **Can N.E.D read contracts?** "No. Content is encrypted on the users' devices and N.E.D never holds the key. Anyone the parties give the contract link to can read it, and the app says so."
8. **Audited? Mainnet?** "Neither. Devnet, test money. An audit, a partner sandbox and a legal opinion come first."
9. **Isn't pitching this "marketing a crypto service"?** (Decree 284/2026 Art. 7(4) also covers advertising.) "It is a public student prototype on devnet: test tokens with no value, no fee, no payout partner connected, and nobody is invited to use it with real money. We show no exchange links, referrals or sign-up calls."
10. **Client never reviews / they disagree?** "If the client does not review before the review deadline, anyone can press Release now and the freelancer receives the earnings. If the client requests changes before that deadline, the amount stays locked until both agree: the client accepts a revised version, the freelancer returns it, or both agree a split. There is no neutral arbiter yet; that is on the roadmap."
11. **Is this a job marketplace?** "N.E.D Jobs is a listing and matching tool: businesses post jobs and lock the budget at posting or when they hire, always before the freelancer accepts, and choose freelancers themselves. N.E.D does not select, vet or employ anyone, is not a party to the work, and takes no fee in v1. Before a real launch we will check with a lawyer whether it needs an employment-services licence (Law 74/2025, Art. 27; Decree 352/2025) or e-commerce platform registration (Law 122/2025; Decree 248/2026)." Do not say the board is outside these laws. Avoid "tuyển dụng" for what N.E.D does.
12. **How is this different from other lock or escrow tools?** "Other projects also release funds when a client stays silent. What we add: a freelancer in Vietnam never holds USDC because release can only go to an allowlisted payout partner fixed at accept; request changes never refunds; the brief and delivery are encrypted with a fingerprint on Solana; and on N.E.D Jobs the budget is locked before the freelancer accepts, at posting or at selection." *(7 Oct, V7: was "before anyone applies", no longer true for listings that lock when hired, D29)* Never say "first" or "only".
13. **Can N.E.D or anyone take the money?** "No instruction lets N.E.D, the client or the freelancer take locked USDC alone; every outflow follows the rules fixed at creation and accept. The upgrade authority is still our deploy wallet until after the final, and we disclose it." Never say "no one can ever move the funds".
14. **What if a business posts a job with no money?** (PO answers; final-pitch P8) "The card says 'Locks when hired'. The program refuses to select anyone until the budget is in the vault (`select_job` fails with `JobNotFunded`), so a freelancer never accepts a job with no money behind it." Never say "every job is funded".

**If unsure:** "That's on our list for the lawyer. What we know today is …" Never guess an article number.

## Words

| Say | Never say |
| --- | --- |
| lock, release, refund, receive earnings, request changes, Release now, transfer, record | pay / payment / thanh toán (for USDC), escrow (in the UI), ký quỹ, invest, safe, guaranteed, scam-free, tax-compliant, **auto-release**, "not a payment service", "we're not offering a service", "we screen wallets", "no one can move the funds", "không có backend", "token thật" (say "token SPL trên devnet, không có giá trị"), "tuyển dụng" for N.E.D |
| "payout partner, simulated; candidates Due and Nium" | "our partner", "licensed partner", "licensed Vietnamese crypto partner" |
| "devnet, test money" | "first", "zero fees", "cheaper than Wise", "Deel/Payoneer have no stablecoins", an exact time to VND, "the Vietnam user never touches crypto" |

## Numbers (always say the year)

| Fact | Source |
| --- | --- |
| 68% of freelancers in Vietnam had experienced not being paid (highest of 4 SEA markets) | PayPal survey, fieldwork Oct 2017, published Mar 2018; n = 1,602 freelancers and "freelance considerers" across SG, ID, VN, PH |
| 85% of contractors paid late at least sometimes | Remote, Feb 2025, global |
| Platform cost on US$1,000 | Upwork: client 3–10% + contract initiation fee (Basic plan 3–5%), freelancer 0–15%; Fiverr: buyer 5.5%, seller 20% |
| N.E.D planned fee | 1% from the client, **nothing charged in v1** |
| Partner fee reference | ≈ US$21.50 on US$1,000 for a US sender (Stripe Global Payouts: US$1.50 + 1% cross-border + 1% FX); ≈ US$31.50 for a non-US sender (2% FX). **Not cheaper than Wise**: we sell protection |
| USDC on Solana | ≈ US$7.2 bn (DefiLlama, 7 Oct 2026) |
| Vietnam crypto adoption | 4th of 151 (Chainalysis, Sep 2025) |
| Demo amount | 20 devnet USDC ≈ 520,000 VND (rate in the app: 26,019.5, 2 Oct; Wise 25,990 on 7 Oct) |
| Program (v1.4, 7 Oct) | 29 instructions, 55 error codes, 26 events, 67 tests (`cargo test`; 62 run the program in LiteSVM). v1.3 was 27 / 53 / 24 / 54 |
| Compute units | Every measured instruction uses **under 25%** of the default 200,000 CU ("dưới 25%"); highest `post_job` 49,173 (24.6%). LiteSVM, v1.4, 7 Oct 2026, 10 runs. Never "under 20%" (39,781 was an old figure) |
| Select transaction | `fund_job + create_fund + select_job` in one transaction: 789 bytes of 1,232 with 5 milestones and two compute-budget instructions; no lookup table |
| Size of the freelancer market in Vietnam | No official count exists (ILO and GSO pilot survey, 2023). Never say "2 million freelancers" |
| Our survey | No result recorded: do not mention a team survey on stage |

## Laws (checked 6–7 Oct 2026 against legal databases; official PDFs still to open)

| Text | What to say |
| --- | --- |
| Decree 52/2024 | Art. 3(10) lists lawful non-cash instruments; Art. 3(11): anything else is unlawful. Art. 8(6): ban on issuing, supplying or using one. The decree does not name crypto; "crypto is not on the list" is our reading. In force 1 Jul 2024 |
| Decree 340/2025 | Fines for unlawful payment instruments: VND 150–200 m for individuals (Art. 30(6)(d), read in a legal database), double for organisations (Art. 5(3)(a) is the doubling rule only). In force 9 Feb 2026. **Do not quote the article or the amount on stage** until the official text is opened |
| Decree 284/2026 | Art. 7(4): providing, *or advertising*, a crypto-asset service without a licence: organisations 180–200 m, individuals half (90–100 m). Individuals trading outside licensed providers: 30–50 m, not enforced until 6 months after the first licence (Ministry of Finance guidance). In force 1 Sep 2026. No provider licensed as of 6 Oct 2026 |
| Resolution 05/2025 | Crypto pilot (9 Sep 2025, 5 years); custody = receiving, storing and transferring crypto for customers; settlement in VND |
| PDP Law 91/2025 + Decree 356/2025 | Explicit consent, no implied consent; bank data is sensitive. In force 1 Jan 2026 |
| Law 74/2025 + Decree 352/2025 | Art. 27: online employment-service business only by an enterprise with an employment-service licence. In force 1 Jan 2026. Whether a free board for freelance service contracts counts is **[Unverified]**: expert question |
| Law 122/2025 + Decree 248/2026 | E-commerce: an intermediary platform lets others offer goods **or services**; a foreign platform with a Vietnamese interface must register with MOIT. In force 1 Jul 2026. Whether N.E.D Jobs is in scope is **[Unverified]** |
| Decree 330/2026 · Decree 333/2026 | Personal-data fines up to VND 3 bn (individuals half), from 19 Aug 2026 · account verification by Vietnamese phone number or ID for services in Vietnam (Art. 16); whether N.E.D is in scope is **[Unverified]** |

## Known limits (admit them)

Devnet only · no KYC · not audited · partner simulated · phone not OTP-verified · residence self-declared · job listings, briefs and pitches public · phone hash reversible · no neutral arbiter (requested changes keep the amount locked until both agree) · Circle can freeze USDC · on-chain data is permanent · upgrade authority on the deploy wallet until the final · the phone app cannot yet respond to a change request (use the Workspace).

## Public posts and booth (Decree 284 Art. 7(4))

Describe N.E.D as a **student prototype on devnet with test money**. No "sign up now", no "start receiving USDC", no posts aimed at users in Vietnam, no exchange or referral links. Send every post and booth text to the Compliance Lead first.
