# N.E.D Wallet — Strategy v2: "Transparent Hụi" for Vietnamese People Abroad

> **Superseded on 2 Oct 2026 by strategy v3 (Shared Money):** [`../07-strategy-v3/strategy-v3.en.md`](../07-strategy-v3/strategy-v3.en.md). Kept for its market and legal research.

> **Status:** proposal v2. The project owner approved this direction on 1 Oct 2026. Not yet reviewed by a mentor, the Compliance Lead or a lawyer.
> **Supersedes:** [`../archive/05-vietnam-strategy-and-revenue-model.md`](../archive/05-vietnam-strategy-and-revenue-model.md) (v1). V1 is kept as a legal reference.
> **Last updated:** 1 Oct 2026 · **Author:** Ho Du Tuan Dat, with an AI research assistant
> **Vietnamese version:** [`strategy-v2.vi.md`](strategy-v2.vi.md) · **Numbers model:** [`unit_economics.py`](unit_economics.py)

*Hụi* (also *họ*) is the Vietnamese rotating savings and credit association (ROSCA): a group of people pay a fixed amount every period and each member takes the whole pot once. The person who runs it is the *chủ hụi* (organiser). *Giật hụi* means the organiser runs off with the money; *bể hụi* means the circle collapses.

---

## 0. For readers and AI assistants

If you cloned the repo and are using Claude (or another AI assistant) to analyse it, read this section first.

**Labels used in this document:**

| Label | Meaning |
| --- | --- |
| **[Sourced]** | Fact with a source; the link is in section 16 |
| **[Inference]** | Conclusion drawn from facts, not confirmed by an expert |
| **[Assumption]** | A number or condition set for calculation; must be validated |
| **[Unverified]** | Searched for, but no reliable source found |

**Five things to know straight away:**

1. **New positioning:** N.E.D is **the USD wallet for Vietnamese people abroad**. Its main differentiator is **a hụi nobody can run away with**: contributions sit in a smart contract, not with the organiser.
2. **The first market is Vietnamese workers in Japan.** They are the largest foreign-worker group there: 605,906 people, 23.6% (Oct 2025) **[Sourced]**.
3. **In Vietnam, N.E.D does not provide crypto services.** The Vietnam version is a digital hụi ledger, with money moving between members' bank accounts, plus financial education and simulated investing. Reason: Resolution 05/2025, Decree 52/2024 and Decree 284/2026 (section 8).
4. **Transfer price is no longer a big advantage.** Formal Japan → Vietnam channels cost on average 3.70% (USD 200) and 2.05% (USD 500) **[Sourced]**. N.E.D's edge is trust and transparency, not price.
5. **UniHackfest 2026:** the team competes in Best Product & Business and Best Technical Build; the presentation is English-only; the rules have no Best AI Product prize **[Sourced: `../05-legal/compliance-lead-tasks.md`]**. T.E.D (the AI assistant) is therefore deprioritised.

**Related files in the repo:**

- `../archive/01-dinh-huong-du-an.md`: original direction and mentor input (Vietnamese).
- `../tong-hop-tien-do.md`: code progress up to 28 Sep 2026 (Vietnamese).
- `../archive/04-ke-hoach-code.md`: phased code plan (Vietnamese).
- `../05-legal/compliance-lead-tasks.md`: Compliance Lead tasks and decisions confirmed with the organisers.
- `../../ned_program/programs/ned-program/src/lib.rs`: the existing Anchor program (identity).
- `unit_economics.py`: revenue model. Change the assumptions and run `python3 unit_economics.py`.

---

## 1. Executive summary

**Problem.** About 605,906 Vietnamese workers live in Japan, 270,000 Vietnamese in South Korea and 294,000 Vietnamese workers in Taiwan **[Sourced]**. They have to:

- repay recruitment debt: 80% of Vietnamese trainees arrive in Japan in debt, ¥674,000 on average **[Sourced]**;
- send money home every month: about ¥100,000 for a typical trainee **[Sourced]**;
- save through hụi, where organisers running off with the pot is a well-known risk; one case exceeded VND 10 bn **[Sourced]**;
- deal with underground remittance rings and fake remittance services on Facebook, especially before Tết **[Sourced]**.

**Solution.** Three features built on what is already coded (Google login, embedded wallet, on-chain @username/phone identity, USDC transfers):

1. **Transparent hụi:** contribute in USDC. The pot sits in a smart contract, everyone can see on-chain who has paid, and members post a deposit to discourage dropping out.
2. **Send home:** send the hụi payout or wages to family. Recipients in Vietnam get VND through a licensed partner.
3. **Go-home fund:** a USD savings goal that also tracks recruitment debt.

**Why it's different.** Wise, JRF and SBI Remit are cheap but have no hụi. Phantom has USDC but isn't built for Vietnamese users. MoneyFellows digitised ROSCAs in Egypt very successfully (8.5 million users) but isn't in Asia **[Sourced]**. We found no product combining an on-chain hụi with remittance to Vietnam for migrant workers **[Unverified: not finding one doesn't prove there is none]**.

**Revenue.** A hụi service fee (assumed 1%) plus a send-home fee (assumed 1.5%). In the base case, reaching 2% of Vietnamese workers in Japan (12,118 users) gives about **USD 1.6 m revenue** and **USD 616,000 gross profit per year** **[Assumption, section 10]**.

**Biggest risks:**

- The legal status of an on-chain hụi in Japan is unclear. Remittance law and the Mujin Business Act (無尽業法) may apply **[Unverified]**.
- There is no data yet on how widespread hụi is among Vietnamese abroad.

---

## 2. What changed from v1

| Item | v1 (file `05-…`, 1 Oct 2026) | v2 (this document) |
| --- | --- | --- |
| Differentiator | "Send money home by phone number" | **"A hụi nobody can run away with"** plus send home |
| First customers | Vietnamese abroad in general | **Vietnamese workers in Japan** (technical intern trainees, specified skilled workers) |
| Market fee assumption | 5–7% via SWIFT | **Correction:** Japan → VN 3.70% / 2.05%; Korea → VN 5.15%; USA → VN 5.27% (World Bank, Q3 2025) |
| Main revenue | Transfer fee | Hụi service fee plus send-home fee |
| Vietnam version | Receive VND through a partner, simulated investing | Adds a **digital hụi ledger** (Decree 19/2019), B2B technology sales, Da Nang sandbox, NDAChain |
| T.E.D (AI) | Plans money sent home | **Deprioritised**, since the rules have no Best AI Product prize |
| Hackathon | Tracks unclear | Best Product & Business and Best Technical Build; the hụi Anchor program is the main technical highlight |

---

## 3. Market data

### 3.1. Vietnamese people abroad

| Country / group | Figure | Note |
| --- | --- | --- |
| Total | 6+ million Vietnamese abroad in 130+ countries; nearly 900,000 contract workers (end-2025) | **[Sourced]** VietnamNet Sep 2025; Người Lao Động Jun 2026 |
| **Japan, residents** | 681,100, second-largest foreign nationality (end-2025) | **[Sourced]** Immigration Services Agency of Japan |
| **Japan, workers** | **605,906, the largest group, 23.6% of 2.57 million foreign workers** (Oct 2025) | **[Sourced]** Ministry of Health, Labour and Welfare, via nippon.com |
| Japan, specified skilled workers | Vietnamese are 44.2% of 336,196 (Jun 2025) | **[Sourced]** Japan Times |
| Japan, technical intern trainees | Vietnamese are 40.6% (Oct 2024) | **[Sourced]** OTIT, via YOLO Japan |
| South Korea | About 270,000, plus about 100,000 students (the largest nationality) | **[Sourced]** Korea Times Dec 2025 |
| Taiwan | About 294,000 workers (Mar 2026) | **[Secondary source]** check against Taiwan's Ministry of Labor statistics |
| USA | About 2.3 million Vietnamese Americans | **[Sourced]** Pew 2025 |
| Australia | 326,630 born in Vietnam (Jun 2025) | **[Sourced]** ABS |
| Students abroad | About 250,000 | **[Sourced]** Ministry of Education and Training, via VTC News Sep 2025 |

### 3.2. Remittances

- **Nationwide:** about USD 16 bn a year **[Sourced]**.
- **Ho Chi Minh City, 2025:** USD 10.34 bn, up 8.3%. By sending region: Asia 48.9%, Americas 31.9%, Europe 8.9%, Oceania 8.6%. 71.8% went through remittance companies **[Sourced]**.
- **Contract workers:** send about USD 6.5–7 bn a year. Taiwan alone was projected at about USD 2.8 bn for 2025 **[Sourced]**.

### 3.3. Cost of sending (World Bank, Q3 2025)

| Corridor | Average | Selected providers |
| --- | --- | --- |
| **Japan → VN** | **3.70% (USD 200), 2.05% (USD 500)** | JRF ~2.2%, Wise 2.74%, Seven Bank 2.95%, Japan Post Bank ~20% |
| Korea → VN | 5.15% | Woori Bank 2.01%, MoneyGram 2.91%, IBK/Shinhan 3.08% |
| USA → VN | 5.27% | Wise 1.61%, Ria 2.1%, Western Union 4.3–5.8% |
| Taiwan → VN | No data | — |

**[Inference]** People still use underground remittance even though formal channels are cheap. That suggests convenience, opening hours and trust matter as much as price. Competing on price alone will not win.

### 3.4. Specific pain points

| Pain point | Evidence | Source |
| --- | --- | --- |
| Recruitment debt | 80% of Vietnamese trainees arrive in Japan in debt, ¥674,000 on average; fees average ¥656,000, the highest of any nationality | **[Sourced]** Immigration Services Agency survey 2021–22 |
| Regular remittance | About ¥100,000 a month; the weak yen has eroded its value | **[Sourced]** nippon.com Oct 2024 |
| Underground remittance | Hyogo: about ¥18 m (2022–24); another ring about ¥460 m (2017–18) | **[Sourced]** Sun TV, TokyoReporter |
| Remittance scams | Fake remitters on Facebook took ¥850,000 and ¥500,000 from individual trainees | **[Sourced]** Kokoro/VAIJ Jan 2022 |
| Organisers running off, circles collapsing | Online hụi with fake members and forged receipts; one case over VND 10 bn | **[Sourced]** VTV Nov 2024 |
| Hụi among Vietnamese abroad | No data | **[Unverified]**: must be tested in interviews (section 12) |

---

## 4. Positioning and target customers

### 4.1. Positioning statement

> **N.E.D — the savings circle nobody can run away with. Save together, send home, built for Vietnamese workers abroad.**

### 4.2. Target user (illustrative persona **[Assumption]**)

**Minh, 24, a mechanical-engineering trainee in Aichi Prefecture:**

- About ¥650,000 of recruitment debt. Sends his mother about ¥100,000 a month.
- In a hụi with 9 co-workers, ¥30,000 each per month, run by the team leader.
- Has heard of an organiser who disappeared with the pot.

Minh needs three things: a hụi nobody can steal, a fast and cheap way to send money home, and a clear view of when his debt will be paid off and when he can afford to go home.

### 4.3. Expansion order

| Phase | Market | Reason |
| --- | --- | --- |
| 1 | **Japan** | Largest worker group; USDC is legally available through SBI VC Trade (since Mar 2025) **[Sourced]** |
| 2 | South Korea | Large Vietnamese community, but the stablecoin law has stalled; not expected before 2027 **[Sourced]** |
| 3 | Taiwan | Large flows (~USD 2.8 bn), but the Virtual Asset Service Act takes effect Q1 2027 at the earliest and unlicensed operation can mean up to 7 years in prison **[Sourced]**; high risk |
| Later | USA, Australia, Europe | Long-established communities; high licensing cost |

---

## 5. Product

### 5.1. Transparent hụi (international version)

**Type at launch:** **zero-interest hụi only**, with a fixed or randomly drawn payout order. No bidding (interest-bearing) hụi, to avoid being treated as lending **[Inference]**.

**User flow:**

```text
1. Create        The organiser chooses: members (≤ 12), contribution (USDC per round),
                 period (monthly), order (fixed / random draw), deposit size.
2. Invite        Invite by @username or phone number (existing on-chain identity).
3. Join          Each member puts a deposit (e.g. one round's contribution) into the circle vault.
4. Each round    Members contribute USDC to the vault. Who has paid is visible on-chain.
5. Payout        When the round ends, the program sends the whole pot to that round's recipient.
                 The recipient chooses: keep USDC / "Send home" / move to the "Go-home fund".
6. Late payment  If someone doesn't pay, their deposit covers the pot; the late payment is recorded on-chain.
7. End           After the last round, members in good standing get their deposit back.
```

**What changes compared with a traditional hụi:**

| Risk | Traditional hụi | N.E.D hụi |
| --- | --- | --- |
| Organiser runs off (giật hụi) | The biggest risk | **Not possible**: money sits in a program-controlled vault the organiser cannot withdraw from |
| Fake members, forged receipts | Happens | Every member is a wallet with an @username; every contribution has a transaction signature |
| Member takes the pot early, then stops paying | Big risk | **Still a risk**. Reduced by deposits, on-chain reputation and circles among people who know each other. MoneyFellows also has to cover empty slots in about 7–8% of circles **[Sourced]** |
| Disputes over who paid | Common | Public, tamper-proof history |

**[Inference]** The smart contract stops the organiser from running off, but it does **not fully** stop a member who takes the pot early from walking away. The pitch must say so. Do not promise "no risk".

**Anchor program design (proposed, added to `ned_program`):**

| Account | Seeds | Contents |
| --- | --- | --- |
| `Circle` | `[b"circle", creator, circle_id]` | creator, USDC mint, contribution, member cap, period (seconds), start time, current round, payout order, deposit size, state |
| Vault | ATA of the `Circle` PDA | Holds contributions and deposits |
| `Member` | `[b"member", circle, wallet]` | rounds paid (bitmap), remaining deposit, has received payout, late count |

| Instruction | What it does |
| --- | --- |
| `create_circle` | Creates the circle and its vault |
| `join_circle` | Posts the deposit, creates `Member` |
| `contribute(round)` | Pays USDC for round `round` |
| `payout(round)` | Callable by anyone after the round deadline. Sends the pot to the recipient; covers any shortfall from the defaulter's deposit |
| `close_circle` | Returns deposits, closes accounts, refunds rent |

### 5.2. Send home

- Reuses `components/SendFlow.tsx` and the existing identity system.
- **Recipients in Vietnam receive VND into their bank account** through a partner licensed by the State Bank to receive and pay out foreign currency (Decree 89/2016, Circular 34/2015) **[Inference: no partner yet]**.
- **Wording:** use "send home" and "receive money"; never "payment" (Decree 52/2024).

### 5.3. Go-home fund

- A USD savings goal, e.g. "Go home in April 2028 with USD 8,000", together with tracking of the remaining recruitment debt.
- xStocks investing is only switched on in countries where it is allowed, and only when the user opts in. No specific tickers are suggested.

### 5.4. T.E.D (deprioritised)

- Its only remaining role is a rule-based money splitter: how much to send home, contribute to hụi and keep.
- Not built before 10 Oct, since the rules have no Best AI Product prize.

---

## 6. Competition

| Product | Hụi | Send to VN | Built for Vietnamese | On-chain transparency | Note |
| --- | --- | --- | --- | --- | --- |
| JRF, SBI Remit, Wise, Seven Bank | No | Yes, ~2–3% | Partly | No | Cheap, trusted; SBI Remit uses XRP behind the scenes **[Sourced]** |
| Underground remitters, Facebook groups | No | Yes | Yes | No | Convenient, but legal and scam risk |
| Hụi run in Zalo/Facebook groups | Yes | No | Yes | No | Relies entirely on personal trust |
| MoneyFellows (Egypt) | Yes, in fiat | No | No | No | 8.5 m users, USD 60 m+ raised **[Sourced]** |
| Phantom | No | No | No | — | Phantom Cash, @username, xStocks |
| Bitget Wallet + VietQR | No | Stablecoin spending in VN | Partly | — | Trader-oriented; legal risk in VN |
| Hanpass + Finger (Korea) | No | Stablecoin pilot (Jun 2026), no VN corridor named | No | — | **[Sourced]** |
| "Hụi On-Chain" (Solana demo) | Yes | No | Yes | Yes | Looks like a hackathon project; no users **[Sourced]** |
| **N.E.D v2** | **Yes** | **Yes** | **Yes** | **Yes** | Combines all four |

**[Inference]** N.E.D's advantage is not any single feature but **the combination**, built for one community. That combination is technically easy to copy. To keep it, N.E.D has to go deep into the community: Vietnamese associations, unions, and the agencies that send workers abroad.

---

## 7. Vietnam version

### 7.1. Principle

> In Vietnam, N.E.D **holds no funds, provides no crypto-asset services and gives no investment recommendations**. Domestic users only see VND and information.

### 7.2. Lawful options

| Option | How it works | Legal basis | Feasibility | Risk |
| --- | --- | --- | --- | --- |
| **A. Digital hụi ledger** | Record-keeping, reminders, payment history; money moves directly between members' bank accounts (VietQR); N.E.D holds no funds | Decree 19/2019/ND-CP, still in force: the organiser must be an individual aged 18+ (Arts 5–6); an organiser's commission may be agreed (Art. 8); the commune must be notified if a round is VND 100 m or more (Art. 14); interest capped at 20%/year (Art. 21) | Medium | A company cannot be the organiser; no matching strangers; no precedent for a software-only app **[Unverified]** |
| **B. Financial education and simulated investing** | Reuse Demo mode; target students; link out to licensed securities firms under an advertising contract | Precedents of virtual trading contests (KIS, RongViet Invest 2026 with 32 universities); Circular 121/2020 Art. 13 | High | No ticker recommendations; no account opening inside the app; no promotion of unlicensed crypto exchanges (Decree 284/2026 Art. 7(4)) |
| **C. Selling technology (B2B)** | Sell the embedded wallet, @username transfers, identity and **hụi module** to banks, e-wallets and licensed crypto exchanges | Resolution 05/2025 Art. 15(2)(p): licensed providers may use third parties but remain liable | Medium–high | Long sales cycles; needs a company, a security audit, possibly ISO 27001 |
| **D. Da Nang sandbox** | Apply to test one narrow use case | Resolution 136/2024/QH15; Basal Pay precedent (Decision 1181/QĐ-UBND, Aug 2025, 36-month test, three-tier KYC, Travel Rule) | Medium | Discretionary; needs a Da Nang company; heavy AML requirements |
| **E. Identity via NDAChain or NDA DID** | Replace the on-chain phone hash with national identity | NDAChain launched Jul 2025, linked to VNeID | Medium | No public developer programme found **[Unverified]** |
| **F. International Financial Centre** | Watch only | Resolution 222/2025/QH15; Decrees 323–330/2025; Da Nang issued 12 membership certificates (Mar 2026) | Low | Pilots target institutional investors; no digital-asset sandbox rulebook yet |

### 7.3. One brand, two implementations

| | International | Vietnam |
| --- | --- | --- |
| Hụi | Contribute in USDC, money held in a smart contract | Digital hụi ledger, money moves between bank accounts (A) |
| Transfers | Send home | Receive VND through a remittance partner |
| Personal finance | Go-home fund, xStocks where allowed | Financial education, simulated investing (B) |
| Revenue | Hụi fee, send-home fee, 0.25% swap fee | Premium plan for hụi organisers, advertising fees from securities firms, B2B (C) |

---

## 8. Legal

### 8.1. Vietnam (summary; the full register of 42 documents is in the team's research documents)

| Document | Impact |
| --- | --- |
| Resolution 05/2025/NQ-CP; Decree 284/2026/ND-CP | No crypto swaps or trading for domestic users |
| Decree 52/2024/ND-CP; Criminal Code Art. 206 | USDC must not be used as a means of payment |
| Decree 89/2016/ND-CP; Circular 34/2015/TT-NHNN | The lawful route for remittance recipients |
| Decree 135/2015/ND-CP | No xStocks for domestic users |
| Law on Securities 54/2019, Art. 4(32) | T.E.D must not recommend securities |
| Law 91/2025/QH15; Decree 356/2025/ND-CP | Personal data, cross-border transfer, on-chain phone hash |
| Law 116/2025/QH15; Decree 333/2026/ND-CP | Data stored in Vietnam, user verification |
| Law 23/2026/QH16 (from 1 Dec 2026) | AML for crypto-asset services |
| **Decree 19/2019/ND-CP** | **Rules for the digital hụi ledger** |

### 8.2. Japan (first market)

| Issue | Status | Risk |
| --- | --- | --- |
| USDC for retail users | SBI VC Trade allowed to sell USDC from 26 Mar 2025; ¥1 m cap per transaction; Ethereum only at launch **[Sourced]** | Medium: N.E.D runs on Solana, so a bridge or another source is needed |
| Self-custody wallet | Probably low risk if it holds no funds and handles no fiat **[Inference]** | Needs a lawyer |
| Unregistered foreign exchanges | The Financial Services Agency (FSA) had app stores remove Bybit, KuCoin, Bitget, MEXC and LBank (Feb 2025) **[Sourced]** | High if the app offers swaps or on-ramps |
| Hụi as a business | May fall under the **Mujin Business Act (無尽業法)**, an old law on commercial ROSCAs, or under remittance law **[Unverified]** | **High — the first question for a Japanese lawyer** |
| Cross-border remittance | May require registration as a funds-transfer provider, or a partnership with a registered one (JRF, SBI Remit…) **[Unverified]** | High |

**[Inference] Ways to lower the risk in Japan:**

- N.E.D handles no yen. Users buy USDC themselves on a registered exchange and move it into their self-custody wallet.
- Each hụi is a smart contract the members create themselves; N.E.D only provides software.
- The VND payout in Vietnam is handled by a licensed partner.

---

## 9. Scoring against hackathon criteria

Based on Colosseum's guidance and the winner lists collected **[Sourced]**:

| Criterion | N.E.D v1 | N.E.D v2 |
| --- | --- | --- |
| Narrow customer group, specific place | Weak | **Strong**: Vietnamese workers in Japan |
| "Couldn't exist without crypto" | Weak: a wallet like Phantom | **Strong**: contributions held in a smart contract replace the organiser's custody role |
| Demo with an "aha moment" | Swap demo | The pot moves to the recipient automatically and the organiser can't withdraw it |
| Evidence of talking to users | None | Interview plan in section 12 |
| Business model | Swap fee | Hụi fee plus send-home fee, with a numbers model |
| Winning precedents | — | KinnectFi (Filipino diaspora, Frontier 2026), Credible (India remittance, Cypherpunk 2025) |

---

## 10. Revenue model and numbers

### 10.1. Revenue sources

| Phase | Source | Mechanism | Confidence |
| --- | --- | --- | --- |
| 1 | **Hụi service fee** | Assumed 1% of contributions, charged on contribution | Precedent exists (MoneyFellows); fee level not validated |
| 1 | **Send-home fee** | Assumed 1.5%, below the Japan → VN average of 2.05–3.70% | Real costs need quotes |
| 2 | 0.25% swap and xStocks fee | Only where allowed | Already built (Demo mode) |
| 2 | Premium plan for hụi organisers (Vietnam version) | Monthly subscription | **[Assumption]** |
| In parallel | B2B technology sales | License the hụi module and identity to banks and e-wallets | Demand not validated |

### 10.2. Assumptions (values in `unit_economics.py`)

| Variable | Value | Type |
| --- | --- | --- |
| Vietnamese workers in Japan | 605,906 | **[Sourced]** |
| Remittances by contract workers (all countries) | USD 6.5 bn/year | **[Sourced]**, low end |
| Exchange rate | 150 JPY/USD | **[Assumption]**, update before use |
| Amount sent home per month | ¥100,000 (~USD 667) | **[Sourced: typical trainee]** used as an assumption |
| Share of users who join a hụi | 50% | **[Assumption]** |
| Hụi contribution | USD 200/month | **[Assumption]** |
| Send-home fee / cost | 1.5% / 1.0% | **[Assumption]** |
| Hụi fee / cost | 1.0% / 0.1% | **[Assumption]** |
| Adoption after ~3 years | 0.5% / 2% / 5% | **[Assumption]** |

### 10.3. Results

**Per active user per year:** about USD 8,000 sent home and about USD 1,200 contributed to hụi (after applying the participation rate). Revenue **USD 132**, gross profit **USD 50.80**.

```text
Revenue per user/year      = 8,000 × 1.5% + 1,200 × 1% = 120 + 12 = USD 132
Gross profit per user/year = 8,000 × (1.5% − 1.0%) + 1,200 × (1% − 0.1%) = 40 + 10.8 = USD 50.8
```

| Scenario | Users | Sent home/year | vs contract-worker remittances | Revenue/year | Gross profit/year |
| --- | --- | --- | --- | --- | --- |
| Conservative (0.5%) | 3,030 | USD 24.2 m | 0.37% | **USD 400,000** | **USD 154,000** |
| Base (2%) | 12,118 | USD 96.9 m | 1.49% | **USD 1.60 m** | **USD 616,000** |
| Ambitious (5%) | 30,295 | USD 242.4 m | 3.73% | **USD 4.00 m** | **USD 1.54 m** |

> The "vs contract-worker remittances" column compares against flows from **all** contract workers in **all** countries, only as a sanity check on scale. It is not a market share of the Japan corridor.

### 10.4. Sensitivity: gross profit (USD/year), base case

| Send-home fee / cost | 0.7% | 1.0% | 1.3% |
| --- | --- | --- | --- |
| **1.0%** | 421,706 | 130,874 | **−159,958** |
| **1.5%** | 906,426 | 615,594 | 324,762 |
| **2.0%** | 1,391,146 | 1,100,314 | 809,482 |

**Interpretation:**

- **The per-transaction cost decides whether the project is profitable.** A 1% fee with a 1.3% cost loses money. The first job after the competition is to get real quotes for each item in table 10.5.
- The hụi fee contributes little (about USD 12 per user per year) but it is **the reason users stay** and the differentiator.
- **Fixed costs are not included**: lawyers, Japanese licensing, staff, smart-contract audits. This is the biggest unknown.

### 10.5. Per-transaction costs (template to fill in)

| Item | Paid to | Value | How to get the number |
| --- | --- | --- | --- |
| Buy USDC with yen | Registered exchange (e.g. SBI VC Trade) | ? | Published fee schedule |
| Bridge Ethereum → Solana (if needed) | Bridge service | ? | Measure in practice |
| Solana network fee | Network | ~0.000005 SOL/transaction | Measured on devnet (`../archive/poc-dynamic.md`); re-measure on mainnet |
| Convert USDC → USD | Off-ramp partner | ? | Quote |
| VND payout in Vietnam | Remittance company or bank | ? | Negotiation |
| KYC | KYC provider | ? | Quote |

---

## 11. Roadmap

### 11.1. Up to UniHackfest (1 Oct → 10 Oct 2026)

Nine days left, one developer. Hour estimates are **[Assumption]**.

| Date | Developer | Other members |
| --- | --- | --- |
| 1–2 Oct | Design the `Circle` / `Member` Anchor accounts; write `create_circle`, `join_circle` | Rewrite the pitch deck in English; post calls for interviewees in Vietnamese groups in Japan |
| 3–4 Oct | `contribute`, `payout`, `close_circle`; LiteSVM tests; deploy to devnet | Interview 10–15 people (section 12); Compliance Lead reviews wording |
| 5–6 Oct | Screens: circle list, create/join, circle detail (who has paid), contribute (slide to confirm), payout result with a "Send home" button | Turn interview results into slides |
| 7 Oct | Seed a demo circle with 4–5 devnet wallets; International/Vietnam region switch | Get mentor and lawyer input via the Compliance Lead's list |
| 8 Oct | Bug fixes, end-to-end testing | Legal Q&A rehearsal |
| 9 Oct | **Code freeze**; record a backup video | Compliance sign-off |
| 10 Oct | Pitch | |

**Estimate:** Anchor program ~14–18 h, UI ~12–16 h, integration and testing ~6–8 h, total ~32–42 h.

**What to cut first if late:**

1. Drop `close_circle` and deposit slashing; only record late payments.
2. Drop the random draw; use a fixed order only.
3. Make the "Go-home fund" screen static.
4. Don't build T.E.D, the dApp Browser or Earn.

**Do not cut:** create circle, contribute, payout, and showing on-chain who has paid.

### 11.2. After the competition

| When | Goal | Key work |
| --- | --- | --- |
| Q4 2026 | Validate | 30–50 interviews; Japanese lawyer on hụi (Mujin Act) and remittance; Vietnamese lawyer on the digital hụi ledger; cost quotes; decide whether to incorporate |
| Q1 2027 | Closed pilot | Smart-contract audit; 5–10 hụi circles of people who know each other on mainnet with small amounts; contact payout partners in Vietnam |
| Q2–Q3 2027 | Japan launch | Send home through a partner; digital hụi ledger in Vietnam; first B2B sales attempts |
| 2027 onwards | Expand | Korea and Taiwan once the law is clear; Da Nang sandbox; connect to licensed exchanges |

---

## 12. Validation plan

### 12.1. Interviews

- **Who:** 10–15 people before 8 Oct, 30–50 people in Q4 2026. Vietnamese workers in Japan, Korea and Taiwan, plus their family members in Vietnam.
- **Where to find them:** Facebook/Zalo groups of Vietnamese in Japan, student groups, people the team already knows.

**Questions:**

1. How much do you send home each month? Through which channel? Why that one?
2. Have you joined a hụi in the past two years? How many members, how much per round?
3. Have you or someone you know lost money to an organiser running off or a circle collapsing?
4. If hụi money were held safely so nobody could take it, would you pay about 1%?
5. Have you ever used USDC or crypto? What puts you off?
6. Do you still owe recruitment debt? When do you plan to go home?

### 12.2. Thresholds to continue (proposed **[Assumption]**)

| Metric | Threshold |
| --- | --- |
| Joined a hụi in the past 2 years | ≥ 40% of interviewees |
| Know of or experienced an organiser running off or a collapse | ≥ 30% |
| Willing to pay about 1% for a safe hụi | ≥ 30% |
| Put off by crypto | Record it to design onboarding; not a stop condition |

If the first two metrics are not met, go back to the v1 "send home" direction and treat hụi as a secondary feature.

### 12.3. Pilot metrics

- Number of active circles.
- Share of contributions paid on time.
- Share of members who drop out after receiving the pot.
- Share of payouts sent home.
- Amount sent home per user per month.

---

## 13. Pitching at UniHackfest

- **Tracks:** Best Product & Business and Best Technical Build. English-only presentation **[Sourced: `../05-legal/compliance-lead-tasks.md`]**.
- **Storyline (about 3 minutes):**
  1. Minh and 605,906 Vietnamese workers in Japan.
  2. Recruitment debt, sending money home, hụi and organisers running off.
  3. Demo: create a circle, wallets contribute, the pot moves automatically, "Send home".
  4. Why blockchain: the organiser never holds the money.
  5. Two versions, two legal frameworks.
  6. Revenue model and sensitivity.
  7. Roadmap and what still needs validating.
- **Technical highlights for Best Technical Build:**
  - Hụi Anchor program with a PDA-controlled vault.
  - On-chain @username/phone identity already in place.
  - LiteSVM tests.
  - Google login and embedded MPC wallet.
- **Follow the Compliance Lead's rules:**
  - No "invest now", "no fees" or "no risk".
  - State clearly that it runs in Demo mode on devnet.
  - Name the known gaps: no KYC yet, phone numbers not OTP-verified, fees simulated, no licensed partner yet.

---

## 14. Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| On-chain hụi in Japan falls under the Mujin Act or remittance law | Medium–high | Cannot launch in Japan | Ask a Japanese lawyer first; N.E.D only provides software; consider another market |
| Members take the pot and stop paying | High | Loss of trust | Deposits, on-chain reputation, circles of people who know each other, contribution caps |
| Smart-contract bug | Medium | Loss of funds | Audit before mainnet; low contribution caps at first |
| Users are wary of crypto | High | Hard onboarding | Hide the word "crypto", show USD; Google login |
| Hụi is less common than expected | Unknown | Loss of differentiation | Validate in section 12; fall back to "send home" |
| Transaction costs exceed fees | Medium | Losses | Get quotes before setting prices (section 10.4) |
| Large competitors copy it | Medium | Loss of edge | Go deep on community and partnerships |
| The Vietnamese digital hụi ledger is treated as organising a hụi | Medium | Vietnam version must change | Users are the organisers; N.E.D holds no funds and takes no organiser commission |

---

## 15. Unverified points and open questions

### 15.1. Unverified

- How common hụi is among Vietnamese in Japan, Korea and Taiwan.
- Whether Japan's Mujin Business Act (無尽業法) and remittance law apply to an on-chain hụi.
- Whether a self-custody wallet with in-app swaps needs a licence in Japan.
- Whether licensed Japanese exchanges offer USDC on Solana, or a bridge is needed.
- Whether Vietnamese remittance companies accept funds converted from stablecoins.
- Whether a software-only hụi app is lawful under Decree 19/2019.
- The number of Vietnamese workers in Taiwan (currently a secondary source).
- NDAChain's developer programme.
- We found no on-chain hụi product for Vietnamese abroad; this needs further checking.

### 15.2. Open questions for the team

1. Do we keep xStocks and swaps in the pitch, or focus only on hụi and send home?
2. What deposit is reasonable: one round, two rounds, or based on reputation?
3. Payout order: fixed, random draw or reputation-based?
4. Who on the team handles interviews and outreach to Vietnamese communities in Japan?
5. Will the team incorporate after the competition? Where?

---

## 16. References

### Market and users

- Vietnamese workers in Japan (Ministry of Health, Labour and Welfare): https://www.nippon.com/ja/japan-data/h02693/
- Foreign residents in Japan (Immigration Services Agency): https://www.moj.go.jp/isa/publications/press/13_00062.html
- Specified skilled workers: https://www.japantimes.co.jp/news/2025/09/30/japan/japan-skilled-foreign-workers/
- Technical intern trainees (OTIT): https://www.yolo-japan.co.jp/yolo-work/15321
- Vietnamese in Korea: https://www.koreatimes.co.kr/southkorea/globalcommunity/20251219/vietnam-leads-surge-as-koreas-foreign-resident-population-hits-record-high
- Workers in Taiwan (secondary source): https://taiwan.md/en/society/migrant-workers-in-taiwan/
- Vietnamese Americans (Pew): https://www.pewresearch.org/race-and-ethnicity/fact-sheet/asian-americans-vietnamese-in-the-u-s/
- Vietnam-born residents of Australia (ABS): https://www.abs.gov.au/statistics/people/population/australias-population-country-birth/latest-release
- 6+ million Vietnamese abroad, USD 16 bn remittances: https://vietnamnet.vn/hon-6-trieu-nguoi-viet-o-nuoc-ngoai-gui-ve-16-ty-usd-kieu-hoi-2441569.html
- Nearly 900,000 contract workers: https://tuoitre.vn/nld/gan-900000-lao-dong-viet-dang-lam-viec-o-nuoc-nao-196260608211624841.htm
- Ho Chi Minh City remittances 2025: https://en.vneconomy.vn/remittances-to-hcm-city-top-1034-bln-in-2025.htm
- Workers send home USD 7 bn a year: https://e.vnexpress.net/news/news/vietnamese-workers-abroad-send-7b-home-annually-4958305.html
- Students abroad: https://vtcnews.vn/gan-250-000-nguoi-viet-dang-hoc-tap-o-nuoc-ngoai-ar966260.html
- Japan → VN remittance prices (World Bank): https://remittanceprices.worldbank.org/corridor/Japan/Vietnam
- Korea → VN remittance prices: https://remittanceprices.worldbank.org/corridor/KR/VN
- USA → VN remittance prices: https://remittanceprices.worldbank.org/corridor/United-States/Vietnam
- Trainee recruitment debt: https://www.nippon.com/en/japan-data/h01411/
- Amount sent home, weak yen: https://www.nippon.com/en/in-depth/d01054/
- Underground remittance in Hyogo: https://www.sun-tv.co.jp/suntvnews/news/2024/05/29/78646/
- Underground bank ring: https://www.tokyoreporter.com/crime/vietnamese-nationals-accused-of-running-underground-bank/
- Remittance scams: https://www.kokoro-vj.org/vi/post_16003
- Online hụi risks (VTV): https://vtv.vn/xa-hoi/rui-ro-tu-nhung-hoi-nhom-choi-hui-ho-tren-mang-xa-hoi-20241117201532831.htm
- Hụi in Vietnam (Vietcetera): https://vietcetera.com/onboardy/choi-hui-kieu-tiet-kiem-an-toan-hay-tiem-tang-nguy-hiem

### Competitors and precedents

- MoneyFellows: https://techcrunch.com/2025/05/04/moneyfellows-raises-13m-to-take-its-group-savings-model-outside-egypt
- Esusu: https://www.cnbc.com/2025/12/11/esusu-funding-renters-credit-scores.html
- "Hụi On-Chain" (demo): https://hui-mu.vercel.app/
- SBI Remit and Vietnam: https://www.remit.co.jp/en/kaigaisoukin/information/release20230906/
- Bitget Wallet and VietQR: https://thepaypers.com/crypto-web3-and-cbdc/news/bitget-wallet-rolls-out-national-qr-payment-support-goes-live-in-vietnam
- Hanpass and Finger: https://finance.biggo.com/news/d9348689-f4de-4cc2-a876-a7fb74b378c9
- Vietnam's stablecoin economy (CoinShares): https://coinshares.com/insights/the-node/por-iced-coffee-and-invisible-dollars-inside-vietnams-stablecoin-economy/
- Colosseum Frontier 2026: https://blog.colosseum.com/announcing-the-winners-of-the-solana-frontier-hackathon/
- Colosseum Cypherpunk 2025: https://blog.colosseum.com/announcing-the-winners-of-the-solana-cypherpunk-hackathon/
- How to win a Colosseum hackathon: https://blog.colosseum.com/how-to-win-a-colosseum-hackathon/

### International law

- Stablecoins in Japan: https://www.curvegrid.com/blog/2026-02-24-japan%E2%80%99s-stablecoin-moment-the-new-licensing-regime-what-came-before-and-what-comes-next
- SBI VC Trade launches USDC: https://cointelegraph.com/news/sbi-vc-trade-usdc-launch-japan-stablecoin-regulation
- Japan removes unregistered exchange apps: https://beincrypto.com/japan-bans-five-crypto-exchanges/
- Korea stablecoin law: https://blog.chakwon.com/2026/04/17/korea-digital-asset-basic-act-stablecoin-sto-split/
- Taiwan Virtual Asset Service Act: https://www.trmlabs.com/resources/blog/unpacking-taiwans-virtual-asset-service-act-what-crypto-and-stablecoin-issuers-need-to-know

### Vietnamese law

- Decree 19/2019/ND-CP on họ, hụi, biêu, phường: https://thuvienphapluat.vn/van-ban/Tien-te-Ngan-hang/Nghi-dinh-19-2019-ND-CP-quy-dinh-ve-ho-hui-bieu-phuong-386324.aspx
- Resolution 05/2025/NQ-CP: https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-quyet-so-5-2025-nq-cp-ve-trien-khai-thi-diem-thi-truong-tai-san-ma-hoa-tai-viet-nam-119250909184045221.htm
- Decree 284/2026/ND-CP: https://luatvietnam.vn/tin-van-ban-moi/tu-01-9-2026-cung-cap-dich-vu-tai-san-ma-hoa-chua-duoc-cap-phep-bi-phat-den-200-trieu-dong-186-110675-article.html
- Resolution 222/2025/QH15 (International Financial Centre): https://thuvienphapluat.vn/van-ban/Tai-chinh-nha-nuoc/Nghi-quyet-222-2025-QH15-Trung-tam-tai-chinh-quoc-te-tai-Viet-Nam-663581.aspx
- International Financial Centre decrees (Baker McKenzie): https://www.bakermckenzie.com/-/media/files/insight/publications/2026/01/vietnam-international-financial-center-opens.pdf
- Da Nang IFC issues 12 certificates: https://dttc.sggp.org.vn/trung-tam-tai-chinh-quoc-te-da-nang-cap-12-chung-nhan-thanh-vien-cho-nha-dau-tu-post132418.html
- Resolution 136/2024/QH15 (Da Nang): https://luatvietnam.vn/chinh-sach/nghi-quyet-136-2024-qh15-cua-quoc-hoi-ve-to-chuc-chinh-quyen-do-thi-va-thi-diem-co-che-chinh-sach-dac-thu-phat-trien-thanh-pho-da-nang-360463-d1.html
- Basal Pay, Da Nang sandbox: https://www.lntpartners.com/legal-briefing/the-first-blockchain-payment-solution-approved-for-trial-how-does-da-nangs-international-financial-center-differ-from-the-rest-of-vietnam
- Decree 353/2025/ND-CP (sandbox under Law 71/2025): https://luatvietnam.vn/cong-nghiep/nghi-dinh-353-2025-nd-cp-quy-dinh-chi-tiet-luat-cong-nghiep-cong-nghe-so-423495-d1.html
- NDAChain: https://tuoitre.vn/viet-nam-co-nen-tang-blockchain-quoc-gia-xuyen-suot-tu-trung-uong-den-dia-phuong-2025101317482419.htm
- Circular 121/2020/TT-BTC: https://thuvienphapluat.vn/van-ban/Doanh-nghiep/Thong-tu-121-2020-TT-BTC-huong-dan-hoat-dong-cua-cong-ty-chung-khoan-453690.aspx
- RongViet Invest 2026: https://vietstock.vn/2026/09/rongviet-invest-2026-lan-toa-suc-nong-den-sinh-vien-32-truong-dai-hoc-830-1494966.htm
- Other documents (Decree 52/2024, Decree 89/2016, Decree 135/2015, Law 91/2025, Law 116/2025, Law 23/2026…): see section 11 of [`../archive/05-vietnam-strategy-and-revenue-model.md`](../archive/05-vietnam-strategy-and-revenue-model.md)

---

*This is research, not legal or financial advice. Every number labelled [Assumption] must be validated before it is used to make decisions.*
