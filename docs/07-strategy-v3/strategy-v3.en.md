# N.E.D Wallet — Strategy v3: Shared Money

> **Superseded on 2 Oct 2026** by [`../09-milestone-lock/`](../09-milestone-lock/README.md). The team chose one template (Milestone Lock) and one customer (freelancers with foreign clients); Rotating Fund and Group Goal are roadmap only; in Vietnam the freelancer receives VND through a payout partner, which replaces the "ledger and reminder tool" Vietnam version in sections 0 and 10. The word table in §11.3 is replaced by `09-milestone-lock/product-spec.md` section 6, and `unit_economics.py` here by the one in `09-milestone-lock/`. Kept for its market and legal research.

> **Status:** proposal v3, 2 Oct 2026. Combines strategy v2 with the Compliance Lead's target-customer and USP proposal (2 Oct 2026). Not yet reviewed by a mentor, the Compliance Lead or a lawyer. The team decides the first customer segment on **6 Oct 2026** after the survey (section 14).
> **Supersedes:** [`../06-strategy-v2/`](../06-strategy-v2/README.md) (v2) and [`../05-vietnam-strategy-and-revenue-model.md`](../05-vietnam-strategy-and-revenue-model.md) (v1). Both are kept for reference.
> **Author:** Ho Du Tuan Dat, with an AI research assistant · **Numbers model:** [`unit_economics.py`](unit_economics.py)

---

## 0. For readers and AI assistants

Read this section first if you are analysing the repo with Claude or another AI assistant.

**Labels:**

| Label | Meaning |
| --- | --- |
| **[Sourced]** | Fact with a source in section 19 |
| **[Inference]** | Conclusion drawn from facts; not confirmed by an expert |
| **[Assumption]** | A number or condition chosen for planning; must be validated |
| **[Unverified]** | Searched for, but no reliable source found |

**Six things to know straight away:**

1. **Positioning:** N.E.D is a stablecoin wallet whose differentiator is **Shared Money**: money several people put together is held in a smart contract under rules they agreed on, instead of by a person in the middle.
2. **One mechanism, three templates:** **Rotating Fund**, **Milestone Lock** and **Group Goal**. All run on one Anchor program.
3. **Naming rule:** product copy, pitch and app never use the traditional Vietnamese names for rotating savings groups. Use the terms in section 11.3.
4. **The first customer segment is decided by data on 6 Oct.** The candidates are Vietnamese workers abroad (segment A) or freelancers with foreign clients (segment B). The product core is the same for both.
5. **In Vietnam, N.E.D holds no money and provides no crypto services.** The Vietnam version is a ledger and reminder tool plus financial education. Reasons: Resolution 05/2025, Decree 52/2024, Decree 284/2026 (section 11).
6. **UniHackfest 2026:** tracks are Best Product & Business and Best Technical Build; English only; no Best AI Product prize **[Sourced: `../05-legal/compliance-lead-tasks.md`]**.

**Related files:**

| File | Why |
| --- | --- |
| `../05-legal/compliance-lead-tasks.md` | Competition decisions and wording rules |
| `../06-strategy-v2/strategy-v2.en.md` | Detailed market data and Vietnamese legal research (v2) |
| `../tong-hop-tien-do.md` | What is already built (Vietnamese) |
| `../../ned_program/programs/ned-program/src/lib.rs` | Existing Anchor program (identity) |
| `unit_economics.py` | Revenue model; edit the assumptions and run `python3 unit_economics.py` |

---

## 1. Executive summary

**The problem.** A plain crypto wallet cannot stand out on personal features. Phantom already has @username transfers, a dollar balance and tokenized stocks; Bitget Wallet has 90+ million users and VietQR spending; MiniPay sends by phone number **[Sourced]**.

What a wallet *can* do that a bank app cannot is **hold money that belongs to several people, under rules enforced by code**. Today that money is held by a trusted person:

- the co-worker who collects everyone's monthly contribution in a savings group;
- the client who promises to pay a freelancer later;
- the friend who keeps the group's trip fund.

That person can disappear, keep wrong records or change their mind. Collapsed or stolen group-savings schemes in Vietnam have exceeded VND 10 bn in a single case **[Sourced]**, and freelancers report clients who vanish or reverse payments **[Sourced: Compliance Lead research]**.

**The product.** N.E.D keeps the wallet it already has and adds **Shared Money**:

| Template | What it does | Who it is for |
| --- | --- | --- |
| **Rotating Fund** | Members contribute the same amount each period; each period one member receives the whole pot | Groups of co-workers who save together |
| **Milestone Lock** | A client locks money up front; it is released per approved milestone or refunded after a deadline | Freelancers and their clients |
| **Group Goal** | People contribute towards a target; released to a named recipient when met, refunded if not | Families, friends, teams |

A trust layer sits on top: contribution history linked to @username, receiver checks that show on-chain facts, and an income statement.

**Why now.**

- Vietnamese are the largest foreign-worker group in Japan (605,906, 23.6%, Oct 2025) **[Sourced]**.
- About 17 million Vietnamese hold crypto, and Vietnam ranked 4th worldwide for adoption in 2025 **[Sourced]**.
- MoneyFellows proved digital rotating savings can reach 8.5 million users in Egypt **[Sourced]**.

**Revenue.** A service fee on Shared Money contributions plus a send-home fee. Base case for segment A (2% of Vietnamese workers in Japan): about **USD 1.6 m revenue and USD 616,000 gross profit per year** **[Assumption, section 12]**.

**Biggest open questions:**

- Whether running group funds as a service falls under remittance law or Japan's Mujin Business Act (無尽業法) **[Unverified]**.
- Whether enough target users already save in groups or lock client money to change wallets **[Unverified]**.

---

## 2. Why Shared Money is the right core for a pure wallet

| Argument | Evidence |
| --- | --- |
| Personal wallet features are commodities | Phantom, Bitget Wallet, MiniPay, Jupiter Mobile already offer them **[Sourced]** |
| Shared money is where people still rely on a trusted middleman, and a smart contract can replace that middleman | The organiser of a savings group, or an unpaid client, is the point of failure; a program-controlled account removes the organiser's ability to withdraw |
| It meets the judges' "couldn't exist without crypto" test | Colosseum's guidance asks for ideas that "enable new markets that couldn't exist without crypto" **[Sourced]** |
| It grows by itself | Every Rotating Fund invites 2–12 people; every Milestone Lock brings in a client **[Inference]** |
| It builds a lasting advantage | On-time contribution and delivered-milestone history accumulates against each @username **[Inference]** |
| It reuses what is built | Google login, embedded wallet, on-chain @username/phone identity, USDC transfers and history are done (`../tong-hop-tien-do.md`) |

---

## 3. Options considered

Scores 1–5 are **the author's judgement**, not measurements.

| Criterion | Web2.5 wallet (current) | v1: Send home | v2: Rotating savings only | Compliance Lead: freelancer escrow | **v3: Shared Money** |
| --- | --- | --- | --- | --- | --- |
| Uniqueness | 1 | 2 | 4 | 3 | **4** |
| "Needs crypto" | 1 | 2 | 5 | 4 | **5** |
| Grows by itself | 1 | 2 | 4 | 3 | **4** |
| Legal fit in Vietnam | 2 | 3 | 3 | 1 | **3** |
| Can be validated by 6 Oct | — | 2 | 2 | 4 | **4** |
| Can be built by 9 Oct | — | 4 | 3 | 2 | **3** |
| Revenue | 2 | 2 | 3 | 3 | **3** |

---

## 4. Product architecture

```text
┌──────────────────────────────────────────────────────────────┐
│ Layer 3 · TRUST                                              │
│  Contribution history · Receiver check (facts only) ·        │
│  Income statement                                            │
├──────────────────────────────────────────────────────────────┤
│ Layer 2 · SHARED MONEY  ← the differentiator                 │
│  One Anchor program, several templates:                      │
│   • Rotating Fund   • Milestone Lock   • Group Goal          │
│   • Send & Claim (roadmap)                                   │
├──────────────────────────────────────────────────────────────┤
│ Layer 1 · PERSONAL WALLET (built)                            │
│  Google login · embedded MPC wallet · @username/phone ·      │
│  send USDC · history · swap and xStocks only where allowed   │
└──────────────────────────────────────────────────────────────┘
```

**How earlier ideas map onto v3:**

| Idea | Source | Layer | By 9 Oct? |
| --- | --- | --- | --- |
| Rotating savings with a program-held pot | v2 | 2 (Rotating Fund) | **Yes, the core demo** |
| Locked client payment | Compliance Lead, USP 1 | 2 (Milestone Lock) | If time allows after 6 Oct; otherwise roadmap |
| Send to a phone number, claim later | Compliance Lead, USP 2 | 2 (Send & Claim) | **No**: needs OTP, which needs a backend and reverses the no-backend decision (Gate D0) |
| Receiver check | Compliance Lead, USP 3 | 3 | **Yes**: app work, facts only |
| Tax-ready income statement | Compliance Lead, USP 4 | 3 | Simple CSV/PDF export from history |
| Send home | v1, v2 | 1, triggered from a payout | Yes, reuse `SendFlow` |
| T.E.D, xStocks, swap | Earlier plans | 1 | Keep in Demo mode; not part of the pitch's core |

---

## 5. Templates in detail

### 5.1. Rotating Fund

**What it is.** A small group agrees to contribute a fixed amount every period. Each period, one member receives everything contributed in that period, in an agreed order. After N periods everyone has paid N × amount and received N × amount once. **No interest** is charged or paid.

| Parameter | At launch |
| --- | --- |
| Members | 2–12 |
| Contribution | Fixed amount in USDC |
| Period | Weekly or monthly |
| Order | Fixed (agreed up front) or random draw on-chain |
| Security amount | e.g. one period's contribution, paid when joining |
| Contribution cap | Low cap during the pilot **[Assumption]** |

**Flow:**

```text
1. Create     Creator sets members, amount, period, order type, security amount.
2. Invite     Invite by @username or phone number (existing on-chain identity).
3. Join       Each member pays the security amount into the fund's program-controlled account.
4. Contribute Every period, members contribute. Who has paid is visible on-chain.
5. Release    After the period deadline, anyone can trigger the release; the program sends
              the period's pot to that period's recipient. The recipient chooses:
              keep USDC / "Send home" / move to a personal goal.
6. Shortfall  If someone hasn't paid, their security amount covers the gap and the late
              payment is recorded in their contribution history.
7. Close      After the last period, members in good standing get their security amount back.
```

**What changes for users:**

| Risk | Group savings held by a person | N.E.D Rotating Fund |
| --- | --- | --- |
| Organiser disappears with the money | The biggest risk | **Not possible**: the creator has no withdrawal right over the program-controlled account |
| Fake members, forged receipts | Happens | Every member is a wallet with an @username; every contribution has a transaction signature |
| A member receives early, then stops paying | Big risk | **Still a risk.** Reduced by the security amount, contribution history, groups of people who know each other and contribution caps. MoneyFellows also has to fill empty slots in about 7–8% of its groups **[Sourced]** |
| Disputes over who paid | Common | Public, tamper-proof history |

**[Inference]** The program removes the organiser's power over the money. It does **not** fully remove the risk of a member who receives early and then walks away. Never present Rotating Fund as risk-free.

### 5.2. Milestone Lock

**What it is.** A client locks the money for a job before work starts. Each milestone is released to the freelancer when the client approves it. If the freelancer misses a deadline, the unreleased amount goes back to the client.

| Step | Who | What the program does |
| --- | --- | --- |
| Create | Freelancer or client | Records milestones, amount per milestone, deadlines |
| Lock | Client | Receives USDC into the program-controlled account |
| Submit | Freelancer | Records the submission time |
| Approve | Client | Releases that milestone to the freelancer |
| Approval deadline passes | — | **Open design question:** auto-release, or move to dispute |
| Delivery deadline passes | — | Refunds that milestone to the client |

**Limits:**

- Code cannot judge the quality of work. A dispute step (a third party both sides choose) must be designed before launch; until then it is roadmap.
- Upwork and Fiverr already offer escrow for jobs on their platforms. The gap is jobs arranged **off** those platforms, whose size is unknown **[Unverified]**.
- The client must be willing to lock USDC through a wallet. This is the riskiest assumption for this template and must be asked in the survey.

### 5.3. Group Goal

- Several people contribute towards a target by a deadline, for a named recipient.
- If the target is met and enough members approve, the money goes to the recipient; otherwise each contribution is refunded.
- Example: friends fund a flight home for Tết for one co-worker.
- Planned after 10 Oct.

### 5.4. Send & Claim (roadmap)

- Send to a Vietnamese phone number; the recipient claims later after verifying the number.
- **Not before 10 Oct:** it needs OTP (a backend and an SMS provider) and it holds money for someone not yet identified, a legal question listed in section 11.

---

## 6. Technical design

### 6.1. Anchor program (added to `ned_program`)

| Account | Seeds | Contents |
| --- | --- | --- |
| `SharedFund` | `[b"fund", creator, fund_id]` | `kind` (`Rotating` / `Milestone` / `Goal`), mint (USDC), rules (amounts, periods or milestones, deadlines, security amount, member cap, order), current period, state |
| Fund token account | ATA owned by the `SharedFund` PDA | Holds USDC |
| `Participant` | `[b"participant", fund, wallet]` | role (member / client / freelancer / recipient), periods paid (bitmap), remaining security amount, has received, late count |

| Instruction | Used by | Notes |
| --- | --- | --- |
| `create_fund` | All | Validates rules per `kind` |
| `join` | Rotating, Goal | Pays the security amount (Rotating) and creates `Participant` |
| `contribute` | Rotating, Goal; `lock` alias for Milestone | Transfers USDC into the fund account |
| `release` | All | Rotating: after the period deadline, to that period's recipient. Milestone: on client approval. Goal: when the target and approvals are met |
| `refund` | Milestone, Goal | After the relevant deadline |
| `close` | All | Returns remaining security amounts, closes accounts, refunds rent |

**Design rules:**

- No instruction lets the creator or N.E.D move funds except through `release` or `refund` under the fund's rules.
- `release` and `refund` are permissionless where the condition is purely time-based, so the fund never depends on one person pressing a button.
- Contribution caps at the program level during the pilot.
- LiteSVM tests for every `kind` (the existing identity program already uses LiteSVM).
- External audit before mainnet.

### 6.2. App screens

| Screen | Content | Reuses |
| --- | --- | --- |
| Shared Money list | Active funds, next contribution due, next release | DesignKit |
| Create fund | Template picker, then the rules form | DesignKit forms |
| Fund detail | Members (@username), who has paid this period, release schedule, history | Identity resolver |
| Contribute / Lock | Amount, network fee, slide to confirm | `SlideConfirm`, `AmountKeypad` |
| Release result | Amount received; buttons "Keep", "Send home" | `SendFlow` |
| Receiver check | On-chain facts about a recipient (account age, number of transfers, linked @username) | History service |
| Income statement | Received transfers by month, export CSV/PDF | History service |

---

## 7. Target customers and the 6 Oct decision

The product core is the same for both segments. The survey decides **which story we pitch and which template we demo first**.

| | Segment A: Vietnamese workers abroad | Segment B: freelancers with foreign clients |
| --- | --- | --- |
| Who | Technical intern trainees and specified skilled workers, starting with Japan; then Korea and Taiwan | Vietnamese freelancers and remote workers, roughly 22–35, paid in USD or stablecoins (Compliance Lead proposal) |
| Main template | Rotating Fund, then "Send home" | Milestone Lock, plus the income statement |
| Size | 605,906 Vietnamese workers in Japan **[Sourced]**; ~270,000 Vietnamese in Korea **[Sourced]**; ~294,000 workers in Taiwan **[Secondary source]** | ~17 million Vietnamese hold crypto **[Sourced]**; freelancer niche size unknown **[Unverified]** |
| Reach | Facebook/Zalo groups of Vietnamese in Japan; harder to reach before 6 Oct | Facebook freelancer groups (500,000+ members), Telegram, Upwork/Fiverr **[Sourced: Compliance Lead research]**; easy to reach now |
| Legal | Must ask a Japanese lawyer (Mujin Act, remittance) | High risk in Vietnam: holding money for others (Resolution 05/2025, Decree 52/2024). Lower if the freelancer or the client is outside Vietnam |
| Choose it if | ≥ 40% save in groups **and** ≥ 30% know of a group where the money was lost | ≥ 30% have lost money to a client **and** clients would lock money through a wallet |

**[Inference]** If segment B wins, target **freelancers who live outside Vietnam**, or make the **foreign client** the side that locks money, so that funds are not held for a party in Vietnam.

---

## 8. Market data

### 8.1. Segment A

| Item | Figure | Source |
| --- | --- | --- |
| Vietnamese workers in Japan | **605,906, the largest group, 23.6%** (Oct 2025) | **[Sourced]** MHLW via nippon.com |
| Vietnamese residents in Japan | 681,100 (end-2025) | **[Sourced]** Immigration Services Agency |
| Specified skilled workers | Vietnamese are 44.2% of 336,196 (Jun 2025) | **[Sourced]** Japan Times |
| Contract workers abroad | Nearly 900,000 (end-2025) | **[Sourced]** Người Lao Động |
| Remittances by contract workers | USD 6.5–7 bn a year | **[Sourced]** VnExpress International |
| Remittances to Vietnam | About USD 16 bn a year | **[Sourced]** VietnamNet |
| Typical monthly amount sent home | About ¥100,000 | **[Sourced]** nippon.com |
| Recruitment debt | 80% of Vietnamese trainees arrive in debt, ¥674,000 on average | **[Sourced]** nippon.com, Immigration Services Agency survey |
| Underground remittance | Cases of ¥18 m (Hyogo, 2022–24) and ¥460 m (2017–18) | **[Sourced]** Sun TV, TokyoReporter |

### 8.2. Segment B

| Item | Figure | Source |
| --- | --- | --- |
| Crypto holders in Vietnam | About 17 million | **[Sourced]** Government portal, Jan 2026 |
| Adoption ranking | 4th worldwide (2025) | **[Sourced]** Chainalysis |
| Share of money from abroad arriving as stablecoins | About 7.8% | **[Sourced, secondary estimate]** Tiger Research |
| Typical jobs | Design, content, translation, programming, ads, Web3 | **[Sourced: Compliance Lead research]** |
| Age, location | Mostly 22–35; Hanoi, Ho Chi Minh City, Da Nang | **[Inference] / [Assumption]** |

### 8.3. Cost of sending money (World Bank, Q3 2025)

| Corridor | Average | Selected providers |
| --- | --- | --- |
| Japan → Vietnam | 3.70% (USD 200), 2.05% (USD 500) | JRF ~2.2%, Wise 2.74%, Seven Bank 2.95% |
| Korea → Vietnam | 5.15% | Woori Bank 2.01% |
| USA → Vietnam | 5.27% | Wise 1.61% |

**[Inference]** Formal channels are already cheap, yet underground remittance persists. Trust and convenience matter as much as price, so N.E.D should not compete on price alone.

---

## 9. Competition

| Product | Group funds held by code | Milestone payments | Send to Vietnam | Built for Vietnamese |
| --- | --- | --- | --- | --- |
| JRF, SBI Remit, Wise | No | No | Yes, ~2–3% | Partly |
| Groups run in Zalo/Facebook | Held by a person | No | No | Yes |
| MoneyFellows (Egypt) | Fiat, held by the company | No | No | No |
| Upwork, Fiverr | No | Yes, on-platform only | Via payouts | No |
| Phantom | No | No | No | No |
| Bitget Wallet + VietQR | No | No | Spending in VN | Partly |
| On-chain rotating-savings demo on Solana ([link](https://hui-mu.vercel.app/)) | Yes | No | No | Yes; no users found |
| **N.E.D v3** | **Yes** | **Yes (planned)** | **Yes** | **Yes** |

**[Inference]** No single feature is unique; the combination for one community is. It can be copied technically, so the lasting edge has to come from community depth: associations, unions, sending agencies, freelancer groups.

---

## 10. Vietnam version

**Principle:** in Vietnam, N.E.D **holds no money, provides no crypto-asset service and gives no investment recommendations**. Domestic users see VND and information only.

| Option | How it works | Legal basis | Feasibility |
| --- | --- | --- | --- |
| **A. Shared Money ledger** | Records, reminders and history for group funds; money moves directly between members' bank accounts (VietQR); N.E.D never holds it | Decree 19/2019/ND-CP on rotating savings and credit groups ([text](https://thuvienphapluat.vn/van-ban/Tien-te-Ngan-hang/Nghi-dinh-19-2019-ND-CP-quy-dinh-ve-ho-hui-bieu-phuong-386324.aspx)): the organiser must be an individual aged 18+ (Arts 5–6); an organiser's fee may be agreed (Art. 8); notify the commune if a period's total is VND 100 m or more (Art. 14); interest capped at 20%/year (Art. 21) | Medium. A company cannot be the organiser; no precedent for a software-only tool **[Unverified]** |
| **B. Financial education and simulated investing** | Reuse Demo mode; link out to licensed securities firms under an advertising contract | Virtual trading contests are common (KIS, RongViet Invest 2026 across 32 universities); Circular 121/2020 Art. 13 | High |
| **C. B2B technology** | License the Shared Money program, identity and onboarding to banks, e-wallets or licensed crypto exchanges | Resolution 05/2025 Art. 15(2)(p): licensed providers may use third parties but stay liable | Medium–high |
| **D. Da Nang sandbox** | Apply to test one narrow use case | Resolution 136/2024/QH15; precedent: Basal Pay (Decision 1181/QĐ-UBND, Aug 2025) | Medium |
| **E. National identity** | Use NDAChain / NDA DID instead of an on-chain phone hash | NDAChain launched Jul 2025, linked to VNeID | Medium; no public developer programme found **[Unverified]** |
| **F. International Financial Centre** | Watch only | Resolution 222/2025/QH15; Decrees 323–330/2025 | Low for now |

**Milestone Lock is not offered in the Vietnam version** [Inference]: holding money for another party is the riskiest activity under Resolution 05/2025 and Decree 52/2024.

---

## 11. Legal

### 11.1. Vietnam (summary)

| Document | Impact |
| --- | --- |
| Resolution 05/2025/NQ-CP; Decree 284/2026/ND-CP | No crypto swaps, trading or custody for domestic users; unlicensed services fined VND 180–200 m |
| Decree 52/2024/ND-CP; Criminal Code Art. 206 | USDC must not be used as a means of payment |
| Decree 89/2016/ND-CP; Circular 34/2015/TT-NHNN | The lawful route for receiving money from abroad |
| Decree 135/2015/ND-CP | No xStocks for domestic users |
| Law on Securities 54/2019, Art. 4(32) | No securities recommendations |
| Law 91/2025/QH15; Decree 356/2025/ND-CP | Personal data, cross-border transfer, the on-chain phone hash |
| Law 116/2025/QH15; Decree 333/2026/ND-CP | Data localisation, user verification |
| Law 23/2026/QH16 (from 1 Dec 2026) | AML duties for crypto-asset services |
| Decree 19/2019/ND-CP | Rules for the Shared Money ledger (option A) |
| Decree 94/2025/ND-CP | Credit scoring needs a sandbox, so show "contribution history", never a "score" |

**Renaming does not change the legal analysis** [Inference]. Regulators look at what a product does, not what it is called. A Rotating Fund is still a rotating savings group under Decree 19/2019 in Vietnam, and possibly under the Mujin Business Act in Japan.

### 11.2. Japan (segment A)

| Issue | Status | Risk |
| --- | --- | --- |
| USDC for retail users | SBI VC Trade sells USDC since 26 Mar 2025; ¥1 m per transaction; Ethereum only at launch **[Sourced]** | Medium: N.E.D runs on Solana |
| Self-custody wallet | Probably low risk if N.E.D holds no funds and handles no yen **[Inference]** | Lawyer needed |
| Unregistered exchanges | The FSA had app stores remove five offshore exchanges (Feb 2025) **[Sourced]** | High if swaps or on-ramps are offered |
| Running group funds as a service | May fall under the **Mujin Business Act (無尽業法)** or remittance law **[Unverified]** | **High — first question for a Japanese lawyer** |
| Cross-border transfers | May require funds-transfer registration, or a partnership with a registered provider **[Unverified]** | High |

### 11.3. Terminology (for app copy, pitch and docs)

| Avoid | Why | Use |
| --- | --- | --- |
| Traditional Vietnamese names for rotating savings groups, and words for their organiser or payout | Team decision (2 Oct 2026); negative associations with fraud | Rotating Fund, creator, receive your turn |
| "pay", "payment", "thanh toán" | Decree 52/2024 | contribute, send, transfer, release |
| "deposit", "tiền gửi" | Sounds like bank deposit-taking | security amount |
| "escrow", "ký quỹ" | In Vietnamese civil law *ký quỹ* refers to a blocked account at a credit institution (Civil Code Art. 330) **[Unverified reading]** | Milestone Lock, locked amount |
| "interest", "yield", "invest", "earn" | Lending or investment connotations | (do not use) |
| "safe", "risk-free", "scam-free", "guaranteed" | Overclaiming | "The creator cannot withdraw the money" (a technical fact) |
| "credit score", "rating" | Decree 94/2025 | contribution history |
| "pool", "vault" in user-facing copy | DeFi investment connotations | fund (keep "vault" for technical docs only) |

---

## 12. Revenue model and numbers

### 12.1. Revenue sources

| Phase | Source | Mechanism | Confidence |
| --- | --- | --- | --- |
| 1 | **Shared Money service fee** | Assumed 1% of contributions or locked amounts | Precedent (MoneyFellows); level not validated |
| 1 | **Send-home fee** | Assumed 1.5%, below the Japan → VN average of 2.05–3.70% | Costs need quotes |
| 2 | 0.25% swap and xStocks fee | Only where allowed | Built in Demo mode |
| 2 | Premium plan for fund creators (Vietnam ledger) | Monthly subscription | **[Assumption]** |
| In parallel | B2B licensing | Shared Money program and identity for banks and e-wallets | Demand not validated |

### 12.2. Assumptions (values in `unit_economics.py`)

| Variable | Value | Type |
| --- | --- | --- |
| Vietnamese workers in Japan | 605,906 | **[Sourced]** |
| Contract-worker remittances, all countries | USD 6.5 bn/year | **[Sourced]**, low end |
| Exchange rate | 150 JPY/USD | **[Assumption]**; update before use |
| Sent home per month | ¥100,000 (~USD 667) | **[Sourced: typical trainee]**, used as assumption |
| Share of users in a Rotating Fund | 50% | **[Assumption]** |
| Rotating Fund contribution | USD 200/month | **[Assumption]** |
| Share of users using Milestone Lock (segment A) | 0% | **[Assumption]**; set above 0 for segment B |
| Send-home fee / cost | 1.5% / 1.0% | **[Assumption]** |
| Shared Money fee / cost | 1.0% / 0.1% | **[Assumption]** |
| Adoption after ~3 years | 0.5% / 2% / 5% | **[Assumption]** |

### 12.3. Results (segment A)

Per active user per year: USD 8,000 sent home, USD 1,200 contributed to Rotating Funds (after participation). **Revenue USD 132, gross profit USD 50.80.**

```text
Revenue per user/year      = 8,000 × 1.5% + 1,200 × 1% = 120 + 12 = USD 132
Gross profit per user/year = 8,000 × (1.5% − 1.0%) + 1,200 × (1% − 0.1%) = 40 + 10.8 = USD 50.8
```

| Scenario | Users | Sent home/year | vs contract-worker remittances | Revenue/year | Gross profit/year |
| --- | --- | --- | --- | --- | --- |
| Conservative (0.5%) | 3,030 | USD 24.2 m | 0.37% | **USD 400,000** | **USD 154,000** |
| Base (2%) | 12,118 | USD 96.9 m | 1.49% | **USD 1.60 m** | **USD 616,000** |
| Ambitious (5%) | 30,295 | USD 242.4 m | 3.73% | **USD 4.00 m** | **USD 1.54 m** |

The comparison column uses flows from all contract workers in all countries, as a sanity check only; it is not a share of the Japan corridor.

### 12.4. Sensitivity: gross profit (USD/year), base case

| Send-home fee / cost | 0.7% | 1.0% | 1.3% |
| --- | --- | --- | --- |
| **1.0%** | 421,706 | 130,874 | **−159,958** |
| **1.5%** | 906,426 | 615,594 | 324,762 |
| **2.0%** | 1,391,146 | 1,100,314 | 809,482 |

### 12.5. Segment B illustration

If a freelancer locks USD 500 of client money per month through Milestone Lock at a 1% fee and 0.1% cost:

```text
Revenue = 500 × 12 × 1% = USD 60/year   ·   Gross profit = 500 × 12 × 0.9% = USD 54/year
```

These numbers are **illustrations** only. The size of the segment is unknown, so no scenario table is given for segment B. To model it, set `MILESTONE_PARTICIPATION` above 0 in `unit_economics.py`.

**Interpretation:**

- Per-transaction cost decides profitability. A 1% fee against a 1.3% cost loses money. Getting real cost quotes is the first job after the competition.
- The Shared Money fee is small per user but is what keeps users coming back.
- Fixed costs (lawyers, Japanese licensing, audits, staff) are not included and are the biggest unknown.

---

## 13. Roadmap

### 13.1. 2 Oct → 10 Oct 2026

One developer, eight days. Hour estimates are **[Assumption]**.

| Date | Developer | Other members |
| --- | --- | --- |
| 2–3 Oct | `SharedFund` / `Participant` accounts with `kind`; `create_fund`, `join`, `contribute` for Rotating Fund | Run the survey (section 14); rewrite the deck in English around Shared Money |
| 4–5 Oct | `release`, `close`, shortfall from the security amount; LiteSVM tests; deploy to devnet | Interviews; Compliance Lead reviews wording against section 11.3 |
| 6 Oct | **Segment decision.** Screens: list, create, fund detail | Summarise survey results into slides |
| 7 Oct | Contribute (slide to confirm), release result with "Send home"; receiver check; seed a demo fund with 4–5 devnet wallets | Mentor and lawyer questions via the Compliance Lead |
| 8 Oct | If segment B or time allows: Milestone Lock `lock`, `release`, `refund`. Otherwise bug fixes and an income-statement export | Legal Q&A rehearsal |
| 9 Oct | **Code freeze**; backup video | Compliance sign-off |
| 10 Oct | Pitch | |

**Estimate:**

| Work | Hours |
| --- | --- |
| Program with `kind` and the Rotating Fund | ~16–22 h |
| App screens | ~12–16 h |
| Receiver check and income statement | ~6–8 h |
| Milestone Lock (optional) | ~8–12 h |

**Cut order if late:**

1. Milestone Lock.
2. Random-draw order.
3. Income-statement export.
4. Shortfall cover from the security amount (record lateness only).

**Never cut:** create, contribute, release, and showing on-chain who has paid.

**Not before 10 Oct:** OTP, Send & Claim, T.E.D, dApp Browser, Earn, user-created templates.

### 13.2. After the competition

| When | Goal | Key work |
| --- | --- | --- |
| Q4 2026 | Validate | 30–50 interviews in the chosen segment; Japanese lawyer (Mujin Act, remittance); Vietnamese lawyer (ledger, Milestone Lock); cost quotes; decide whether to incorporate |
| Q1 2027 | Closed pilot | Audit; 5–10 funds among people who know each other on mainnet with low caps; contact payout partners in Vietnam |
| Q2–Q3 2027 | Launch | First market; Vietnam ledger; first B2B conversations |
| 2027+ | Expand | Milestone dispute step, Group Goal, Send & Claim; Korea and Taiwan once rules are clear |

---

## 14. Validation

### 14.1. Survey (run by the Compliance Lead, results by 6 Oct)

Ask about **behaviour**, without naming any scheme, so answers are not biased.

**For everyone:**

1. Where do you live and work now? Are you paid by an employer, by clients, or both?
2. How much do you send to family each month, through which channel, and why that one?
3. Have you ever used USDC, USDT or any crypto? What puts you off?

**Segment A (working abroad):**

4. In the past two years, have you put money into a group where everyone pays the same amount each month and one person receives the whole amount each month?
5. How many people were in it, and how much per month?
6. Who held the money? Have you, or someone you know, lost money in such a group?
7. If the money were held so that nobody, including the person who set it up, could take it, would you pay about 1% of what you put in?

**Segment B (freelancers):**

8. Have you lost money to a client who did not pay or reversed a payment? How much, how often?
9. What share of your work comes from clients outside Upwork or Fiverr?
10. Would your clients agree to lock the job's money in a wallet before you start? Have you ever asked?
11. Do you need proof of income (tax, visa, loan)? How do you get it today?

### 14.2. Decision thresholds (proposed **[Assumption]**)

| Segment | Metric | Threshold |
| --- | --- | --- |
| A | Saved in a group in the past two years | ≥ 40% |
| A | Knows of a group where money was lost | ≥ 30% |
| A | Would pay ~1% | ≥ 30% |
| B | Has lost money to a client | ≥ 30% |
| B | Clients would lock money through a wallet | ≥ 30% (asked or estimated) |
| Both | Wary of crypto | Recorded to design onboarding, not a stop condition |

Pick the segment that passes more thresholds. If neither passes, keep Shared Money as the technical demo and pitch v1's "send home" story.

### 14.3. Pilot metrics

- Active funds.
- On-time contribution rate.
- Share of members who stop after receiving.
- Share of releases sent home.
- Milestone dispute rate.
- Amount sent home per user per month.

---

## 15. Pitch at UniHackfest

**Line:** *"N.E.D — shared money, held by rules, not by a middleman."*

**Storyline (about 3 minutes, segment A version):**

1. 605,906 Vietnamese work in Japan. Many save together with co-workers, and one person holds the cash. *(Use the survey figure for "many" once it is available.)*
2. When that person disappears, everyone loses. The same happens to freelancers whose clients vanish.
3. **Demo:** create a Rotating Fund, four wallets contribute, the period's pot moves to the recipient automatically, the recipient taps "Send home". Then show the receiver check.
4. **Why blockchain:** the creator never holds the money.
5. **Two versions:** international and Vietnam, each within its own law.
6. **Business model and sensitivity table.**
7. **Roadmap:** Milestone Lock, Group Goal, Send & Claim.

**For Best Technical Build:** one program, several templates, PDA-controlled fund accounts, permissionless time-based release, LiteSVM tests, on-chain identity already live, Google login with an embedded MPC wallet.

**Compliance:**

- Follow section 11.3.
- State Demo mode and devnet.
- Name the known gaps: no KYC, phone numbers not OTP-verified, fees simulated, no licensed partner yet, no audit yet.

---

## 16. Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Group funds as a service fall under the Mujin Act or remittance law in Japan | Medium–high | Cannot launch Rotating Fund there | Ask a Japanese lawyer first; software-only role; consider segment B or another market |
| A member receives early, then stops paying | High | Loss of trust | Security amount, history, known groups, caps |
| Milestone disputes about quality | High | Users blame N.E.D | Design a dispute step before launch; roadmap until then |
| Smart-contract bug | Medium | Loss of funds | Tests, audit, caps |
| Users wary of crypto | High | Hard onboarding | Show USD, hide jargon, Google login |
| Target behaviour less common than expected | Unknown | Weak differentiation | Survey and thresholds (section 14) |
| Costs above fees | Medium | Losses | Quotes before pricing (section 12.4) |
| Scope grows into a platform | Medium | Conflicts with the mentor's rejection of a mini-app platform; delays | Only N.E.D-made templates; no third-party templates |
| The Vietnam ledger is treated as organising a group | Medium | Vietnam version must change | Users are the organisers; N.E.D holds no money and takes no organiser fee |

---

## 17. Unverified points and open questions

### 17.1. Unverified

- How many target users already save in groups or work with off-platform clients.
- Whether Japan's Mujin Business Act and remittance law apply to Shared Money.
- Whether a self-custody wallet with swaps needs a licence in Japan.
- USDC on Solana through a registered Japanese exchange, or a bridge.
- Whether Vietnamese remittance companies accept funds converted from stablecoins.
- Whether a software-only ledger is lawful under Decree 19/2019.
- Whether Circular 32/2026 (0.1% tax) covers self-custody wallets (Compliance Lead question).
- The reading of Civil Code Art. 330 on *ký quỹ*.
- The Taiwan worker figure (secondary source).
- NDAChain's developer programme.

### 17.2. Open questions for the team

1. Security amount: one period, two periods or history-based?
2. Order: fixed, random draw or history-based?
3. Milestone Lock: auto-release after the approval deadline, or a dispute step?
4. Keep xStocks and swap in the pitch at all?
5. Who owns outreach to the chosen segment after 6 Oct?
6. Will the team incorporate after the competition, and where?

---

## 18. Changes from v2

| Item | v2 | v3 |
| --- | --- | --- |
| Core concept | One Vietnamese-specific rotating-savings feature | **Shared Money**: one mechanism, three templates |
| Naming | Traditional Vietnamese name | Neutral English names; terminology table (section 11.3) |
| Customer | Vietnamese workers in Japan | Segment A or B, decided by survey on 6 Oct |
| Compliance Lead's USPs | Not included | USP 1 → Milestone Lock; USP 2 → Send & Claim (roadmap); USP 3 → receiver check; USP 4 → income statement |
| Program design | `Circle` / `Member` | `SharedFund` with `kind` / `Participant` |
| Model | Rotating savings + send home | Adds Milestone Lock parameters (default 0) |

---

## 19. References

### Market and users

- [Vietnamese workers in Japan (MHLW, via nippon.com)](https://www.nippon.com/ja/japan-data/h02693/)
- [Foreign residents in Japan (Immigration Services Agency)](https://www.moj.go.jp/isa/publications/press/13_00062.html)
- [Specified skilled workers (Japan Times)](https://www.japantimes.co.jp/news/2025/09/30/japan/japan-skilled-foreign-workers/)
- [Vietnamese in Korea (Korea Times)](https://www.koreatimes.co.kr/southkorea/globalcommunity/20251219/vietnam-leads-surge-as-koreas-foreign-resident-population-hits-record-high)
- [Workers in Taiwan (secondary source)](https://taiwan.md/en/society/migrant-workers-in-taiwan/)
- [Nearly 900,000 contract workers (Người Lao Động / Tuổi Trẻ)](https://tuoitre.vn/nld/gan-900000-lao-dong-viet-dang-lam-viec-o-nuoc-nao-196260608211624841.htm)
- [Workers send home USD 7 bn a year (VnExpress International)](https://e.vnexpress.net/news/news/vietnamese-workers-abroad-send-7b-home-annually-4958305.html)
- [6+ million Vietnamese abroad, USD 16 bn remittances (VietnamNet)](https://vietnamnet.vn/hon-6-trieu-nguoi-viet-o-nuoc-ngoai-gui-ve-16-ty-usd-kieu-hoi-2441569.html)
- [Trainee recruitment debt (nippon.com)](https://www.nippon.com/en/japan-data/h01411/)
- [Amount sent home and the weak yen (nippon.com)](https://www.nippon.com/en/in-depth/d01054/)
- [Underground remittance in Hyogo (Sun TV)](https://www.sun-tv.co.jp/suntvnews/news/2024/05/29/78646/)
- [Underground bank ring (TokyoReporter)](https://www.tokyoreporter.com/crime/vietnamese-nationals-accused-of-running-underground-bank/)
- [Losses in online savings groups, over VND 10 bn in one case (VTV)](https://vtv.vn/xa-hoi/rui-ro-tu-nhung-hoi-nhom-choi-hui-ho-tren-mang-xa-hoi-20241117201532831.htm)
- [17 million crypto holders in Vietnam (Government portal)](https://en.baochinhphu.vn/viet-nam-ranks-7th-in-number-of-crypto-asset-holders-globally-111260129102245433.htm)
- [Chainalysis Global Crypto Adoption Index 2025](https://www.chainalysis.com/blog/2025-global-crypto-adoption-index/)
- [Stablecoins as Vietnam's parallel VND (Tiger Research, secondary)](https://reports.tiger-research.com/p/stablecoins-as-vietnams-parallel-vnd-eng)
- Freelancer jobs and reach channels: Compliance Lead's customer research (N.E.D Compliance Hub, team only)

### Remittance prices

- [Japan → Vietnam (World Bank)](https://remittanceprices.worldbank.org/corridor/Japan/Vietnam)
- [Korea → Vietnam (World Bank)](https://remittanceprices.worldbank.org/corridor/KR/VN)
- [USA → Vietnam (World Bank)](https://remittanceprices.worldbank.org/corridor/United-States/Vietnam)

### Competitors and precedents

- [MoneyFellows raises USD 13 m (TechCrunch)](https://techcrunch.com/2025/05/04/moneyfellows-raises-13m-to-take-its-group-savings-model-outside-egypt)
- [Phantom Cash](https://phantom.com/learn/blog/phantom-cash-accounts-are-here)
- [Bitget Wallet and VietQR (The Paypers)](https://thepaypers.com/crypto-web3-and-cbdc/news/bitget-wallet-rolls-out-national-qr-payment-support-goes-live-in-vietnam)
- [MiniPay Visa card (Opera)](https://press.opera.com/2026/06/23/minipay-visa-debit-card/)
- [SBI Remit and Vietnam](https://www.remit.co.jp/en/kaigaisoukin/information/release20230906/)
- [Colosseum Frontier 2026 winners](https://blog.colosseum.com/announcing-the-winners-of-the-solana-frontier-hackathon/)
- [Colosseum Cypherpunk 2025 winners](https://blog.colosseum.com/announcing-the-winners-of-the-solana-cypherpunk-hackathon/)
- [How to win a Colosseum hackathon](https://blog.colosseum.com/how-to-win-a-colosseum-hackathon/)

### Law: international

- [Japan's stablecoin licensing regime (Curvegrid)](https://www.curvegrid.com/blog/2026-02-24-japan%E2%80%99s-stablecoin-moment-the-new-licensing-regime-what-came-before-and-what-comes-next)
- [SBI VC Trade launches USDC (CoinTelegraph)](https://cointelegraph.com/news/sbi-vc-trade-usdc-launch-japan-stablecoin-regulation)
- [Japan removes unregistered exchange apps (BeInCrypto)](https://beincrypto.com/japan-bans-five-crypto-exchanges/)
- [Korea stablecoin law (Chakwon)](https://blog.chakwon.com/2026/04/17/korea-digital-asset-basic-act-stablecoin-sto-split/)
- [Taiwan Virtual Asset Service Act (TRM Labs)](https://www.trmlabs.com/resources/blog/unpacking-taiwans-virtual-asset-service-act-what-crypto-and-stablecoin-issuers-need-to-know)

### Law: Vietnam

- [Decree 19/2019/ND-CP on rotating savings and credit groups](https://thuvienphapluat.vn/van-ban/Tien-te-Ngan-hang/Nghi-dinh-19-2019-ND-CP-quy-dinh-ve-ho-hui-bieu-phuong-386324.aspx)
- [Resolution 05/2025/NQ-CP](https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-quyet-so-5-2025-nq-cp-ve-trien-khai-thi-diem-thi-truong-tai-san-ma-hoa-tai-viet-nam-119250909184045221.htm)
- [Decree 284/2026/ND-CP](https://luatvietnam.vn/tin-van-ban-moi/tu-01-9-2026-cung-cap-dich-vu-tai-san-ma-hoa-chua-duoc-cap-phep-bi-phat-den-200-trieu-dong-186-110675-article.html)
- [Decree 52/2024/ND-CP](https://thuvienphapluat.vn/van-ban/Tien-te-Ngan-hang/Nghi-dinh-52-2024-ND-CP-thanh-toan-khong-dung-tien-mat-427855.aspx)
- [Decree 94/2025/ND-CP (banking sandbox)](https://luatvietnam.vn/tai-chinh/nghi-dinh-942025nd-cp-co-che-thu-nghiem-co-kiem-soat-trong-linh-vuc-ngan-hang-399142-d1.html)
- [Resolution 136/2024/QH15 (Da Nang)](https://luatvietnam.vn/chinh-sach/nghi-quyet-136-2024-qh15-cua-quoc-hoi-ve-to-chuc-chinh-quyen-do-thi-va-thi-diem-co-che-chinh-sach-dac-thu-phat-trien-thanh-pho-da-nang-360463-d1.html)
- [Basal Pay, Da Nang sandbox (LNT & Partners)](https://www.lntpartners.com/legal-briefing/the-first-blockchain-payment-solution-approved-for-trial-how-does-da-nangs-international-financial-center-differ-from-the-rest-of-vietnam)
- [Resolution 222/2025/QH15 (International Financial Centre)](https://thuvienphapluat.vn/van-ban/Tai-chinh-nha-nuoc/Nghi-quyet-222-2025-QH15-Trung-tam-tai-chinh-quoc-te-tai-Viet-Nam-663581.aspx)
- [NDAChain (Tuổi Trẻ)](https://tuoitre.vn/viet-nam-co-nen-tang-blockchain-quoc-gia-xuyen-suot-tu-trung-uong-den-dia-phuong-2025101317482419.htm)
- [Circular 121/2020/TT-BTC](https://thuvienphapluat.vn/van-ban/Doanh-nghiep/Thong-tu-121-2020-TT-BTC-huong-dan-hoat-dong-cua-cong-ty-chung-khoan-453690.aspx)
- Other documents (Decree 89/2016, Decree 135/2015, Law 91/2025, Law 116/2025, Law 23/2026 …): see [`../05-vietnam-strategy-and-revenue-model.md`](../05-vietnam-strategy-and-revenue-model.md), section 11

---

*Research, not legal or financial advice. Every number labelled [Assumption] must be validated before it is used for decisions.*
