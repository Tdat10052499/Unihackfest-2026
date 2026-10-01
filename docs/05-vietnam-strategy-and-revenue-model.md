# N.E.D Wallet — Proposed Direction and New Revenue Model

> **Superseded on 1 Oct 2026 by strategy v2:** [`06-strategy-v2/strategy-v2.en.md`](06-strategy-v2/strategy-v2.en.md). Kept as a legal reference. Note: the 5–7% remittance-cost figure used below was corrected in v2 (World Bank: Japan → VN 3.70% / 2.05%).

> **Status:** proposal, not yet reviewed by a mentor or a lawyer.
> **Last updated:** 1 Oct 2026 · **Author:** Ho Du Tuan Dat (with an AI research assistant)
> **Suggested location in the repo:** `docs/05-vietnam-strategy-and-revenue-model.md`
> **Read together with:** [`01-dinh-huong-du-an.md`](01-dinh-huong-du-an.md), [`tong-hop-tien-do.md`](tong-hop-tien-do.md), [`04-ke-hoach-code.md`](04-ke-hoach-code.md)

This document is for team members and anyone reading the repo who wants to analyse where N.E.D should go after UniHackfest 2026. Each claim is labelled as a **sourced fact**, an **inference** or an **assumption**. Section 10 lists what is still unverified. This is research, not legal or financial advice.

---

## Contents

1. [Summary](#1-summary)
2. [Problems with the current direction](#2-problems-with-the-current-direction)
3. [New positioning and target customers](#3-new-positioning-and-target-customers)
4. [Legal constraints in Vietnam](#4-legal-constraints-in-vietnam)
5. [Two-version model](#5-two-version-model)
6. [Direction in Vietnam](#6-direction-in-vietnam)
7. [Revenue model](#7-revenue-model)
8. [Roadmap](#8-roadmap)
9. [Product and code changes](#9-product-and-code-changes)
10. [Risks, unverified points and open questions](#10-risks-unverified-points-and-open-questions)
11. [References](#11-references)

---

## 1. Summary

- **New positioning:** N.E.D moves from "a Web2.5 wallet with tokenized stocks" to **"a USD wallet for Vietnamese people living abroad"**: hold money, invest where you live, and send money home using only a phone number.
- **Two versions on one codebase:**
  - The **international version** is for senders and has the full feature set in countries that allow it.
  - The **Vietnam version** is for recipients and complies with Vietnamese law. Users in Vietnam only see results in VND; the blockchain part stays on the international side.
- **In Vietnam, N.E.D acts as the front-end experience layer for licensed institutions** (banks, remittance companies, licensed crypto-asset exchanges). It does not provide crypto services itself.
- **Main revenue:** international transfer fees, charged to the sender. The 0.25% swap/investment fee becomes a secondary source, international version only. Expansion sources: yield spread on balances, referral fees from licensed exchanges, and selling infrastructure to businesses (B2B).
- **Caveat:** remittance is a thin-margin business that only pays off at high volume. The illustration in section 7.3 shows a 0.1% market share yields only about USD 80,000 of gross profit per year.

---

## 2. Problems with the current direction

### 2.1. No differentiation (sourced fact)

Every core feature N.E.D has today already exists in at least one major competitor:

| N.E.D feature | Competitor that has it | Competitor scale |
| --- | --- | --- |
| No-seed-phrase login, send by @username | Phantom (Phantom Cash, 17 Nov 2025) | ~15–17 million MAU (CoinLaw, secondary source) |
| Tokenized stocks (xStocks) | Phantom, Bitget Wallet (130+ xStocks), Robinhood, Coinbase | Bitget Wallet has 90+ million users |
| Send money by phone number | MiniPay (Opera, on Celo) | 16+ million wallets, 65+ countries |
| Stablecoin payments in Vietnam | Bitget Wallet supports VietQR (since Jun 2025) | — |
| AI investment assistant | Finhay (Jul 2026) | — |

Observation on Solana hackathons (inference from Colosseum's winner lists): general-purpose consumer wallets usually place low, e.g. Bagel finished 5th at Breakout 2025. Payment-track winners all target **one specific customer group in one specific place**, for example:

- **KinnectFi:** a neobank for the Filipino diaspora; top 25 at Frontier 2026, admitted to Cohort 5.
- **Credible:** stablecoin remittance to India, sold to banks and fintechs; 2nd place in the Stablecoin track at Cypherpunk 2025.

### 2.2. Cannot launch in Vietnam (sourced fact)

Fee-charging swaps, using USDC as payment and buying xStocks all conflict with Vietnamese law. Details are in section 4.

---

## 3. New positioning and target customers

### 3.1. Positioning statement

> **N.E.D — the USD wallet for Vietnamese people abroad. Hold, invest and send money home with just a phone number.**

Goal: when people think of "sending money home by phone number", they think of N.E.D.

### 3.2. Customer segments

| Segment | Pain point | Legal fit | Competition | Assessment |
| --- | --- | --- | --- | --- |
| **1. Vietnamese abroad** (workers, students, overseas Vietnamese) | Remittance costs of 5–7% via SWIFT; want to hold and invest in USD | Good in countries that allow it | No product built specifically for Vietnamese people | **Primary segment** |
| 2. Family members receiving money in Vietnam | Slow, costly transfers | May only receive VND through licensed channels | Banks, remittance companies | **Secondary segment**, comes with segment 1 |
| 3. Freelancers and online sellers paid in USDT/USDC | Convert to VND through informal channels | Hard: needs a licensed exchange | Binance P2P, Bitget Wallet | Later |
| 4. Retail investors in international markets | Hard to access US stocks | Good | Very crowded | Avoid: this is exactly why N.E.D currently looks undifferentiated |

**Background facts:**

- Remittances to Vietnam hit a record of about **USD 16 billion in 2025** (VietnamNet, 3 Jan 2026).
- Part of these remittances already flows through stablecoins and informal OTC channels (Tiger Research, secondary source).

### 3.3. Three differentiators

1. **Built for Vietnamese users:** send straight to a relative's +84 phone number, Vietnamese-language interface, Teddy the mascot.
2. **Two versions, two legal frameworks:** senders abroad get the full feature set; recipients in Vietnam get a compliant version. After ONUS halted withdrawals (20 Mar 2026), "compliant" is a trust advantage.
3. **T.E.D plans the money sent home:** e.g. "send Mum USD 300 this month, keep USD 200, invest USD 100". This is a new version of the "Plan my money" feature already designed.

---

## 4. Legal constraints in Vietnam

The full register of 42 documents is in a separate research document ("Register of Vietnamese legal documents"). The table below keeps only the documents that directly affect features.

| Document | Effective | Key content | Feature affected |
| --- | --- | --- | --- |
| Law on Digital Technology Industry 71/2025/QH15 | 1 Jan 2026 | Arts 46–47: crypto assets are civil-law assets, not money; securities are excluded | Holding USDC is lawful |
| Resolution 05/2025/NQ-CP (5-year pilot) | 9 Sep 2025 | Trading in VND only, only through licensed providers; providers need VND 10,000 bn of capital, max 49% foreign ownership | N.E.D cannot get its own licence |
| Decree 284/2026/ND-CP | 1 Sep 2026 | Unlicensed service provision: VND 180–200 m fine; investors trading outside licensed providers: VND 30–50 m | Fee-charging swaps |
| Decree 52/2024/ND-CP | 1 Jul 2024 | Art. 8: virtual currency may not be used as a means of payment | Must not be called "payment" |
| Criminal Code, Art. 206 | In force | Illegal means of payment | Criminal risk if mispositioned |
| Ordinance on Foreign Exchange 28/2005 (amended 2013) | 2006 / 2014 | No payment or price listing in foreign currency inside Vietnam | Do not show USD/USDC prices to domestic users |
| Decree 89/2016/ND-CP, Circular 34/2015/TT-NHNN | In force (latest amendment Circular 75/2025) | Conditions for organisations receiving and paying out foreign currency (remittances) | **The lawful route for recipients** |
| Decree 135/2015/ND-CP | Still in force | Individuals may only invest indirectly abroad through ESOP schemes | Do not open xStocks to domestic users |
| Law on Securities 54/2019/QH14, Art. 4(32) | 1 Jan 2021 | Recommending to buy, sell or hold securities is investment advice and needs a licence | Limits what T.E.D can say |
| Law on Personal Data Protection 91/2025/QH15, Decree 356/2025/ND-CP | 1 Jan 2026 | Financial data is sensitive data; rules on cross-border transfer; no default (pre-ticked) consent | Phone hash stored on-chain; data passing through Dynamic (US) |
| Law on Cybersecurity 116/2025/QH15, Decree 333/2026/ND-CP | 1 Jul 2026 | User verification; personal data stored in Vietnam | Where data is stored |
| Law 23/2026/QH16 (amending the Anti-Money Laundering Law) | 1 Dec 2026 | Adds crypto-asset services to AML reporting entities | KYC and transaction reporting |
| Law on Science, Technology and Innovation 93/2025/QH15 | 1 Oct 2025 | Controlled-testing (sandbox) mechanism for AI and blockchain | Possible route (procedure unverified) |

**Licensing status (sourced fact):**

- Five applicants passed the first round: VIXEX, TCEX (Techcombank), CAEX (VPBank), SCEX, Vietnam Digital Assets.
- As of 31 Aug 2026 no final licence had been issued.

**Conclusion (inference):** N.E.D cannot keep its current model and still operate lawfully in Vietnam.

---

## 5. Two-version model

One app, one codebase, with features switched on or off by the user's region (region gating).

| Feature | International version (sender) | Vietnam version (recipient) |
| --- | --- | --- |
| Google login, embedded wallet | Yes | Yes (a lawyer needs to confirm the use of an MPC wallet) |
| Send USDC by @username/phone number | Yes, the core feature | No. Receive only, and receive in VND through a partner |
| Convert to VND | Not applicable | Through a licensed bank or remittance company (route 1); later through a licensed exchange (route 3) |
| Token swap | Yes (Jupiter, 0.25% fee) | Off |
| Tokenized stocks | Yes, only in countries where xStocks is available | Simulated investing only (real prices, no real money) |
| T.E.D | Planning: how much to send home, keep and invest | General financial guidance, no specific securities recommendations |
| In-app wording | "Send", "Pay" | "Receive money", "Transfer to bank account"; never "payment" |

**Note on xStocks in the international version (sourced fact):**

- xStocks is not sold to US persons. Kraken's page also excludes Canada, the UK and Australia.
- Phantom additionally blocks tokenized stocks in France, the Netherlands and Germany.

So the first launch country must meet both conditions: xStocks is available, and there is a large Vietnamese community. This is task L10 in the legal task board.

---

## 6. Direction in Vietnam

### 6.1. Principle

> **In Vietnam, sell VND outcomes, not crypto.** N.E.D is the front-end experience layer. The licensed institution is responsible for funds, transactions and KYC.

### 6.2. Viable routes, in the order to pursue them

#### Route 1 — Remittance partner (do this first)

```text
Sender (abroad)                                     Recipient (Vietnam)
  N.E.D international app
     │  fund account, send USDC to a +84 phone number
     ▼
  N.E.D legal entity abroad
     │  convert USDC → USD (via off-ramp partner)
     │  transfer USD under a "foreign partner" contract
     ▼
  Bank / organisation licensed by the SBV to receive and pay out foreign currency
     │  (Decree 89/2016, Circular 34/2015)
     ▼
  VND into the recipient's bank account ───────────► Recipient
  (the recipient never touches crypto)
```

- **Basis:** Decree 89/2016, Art. 6, requires a remittance-paying organisation to have a contract with a foreign partner. N.E.D's entity abroad could be that partner.
- **Unverified risks:**
  - Whether domestic organisations will accept funds converted from stablecoins.
  - The sending country may require a money-transmission licence.

#### Route 2 — Learning and simulated investing

- Keep the existing Demo mode: real prices from Jupiter, no real money, clearly labelled as an educational tool.
- **Basis:** no document specifically regulates simulation apps. Risk arises only if the app gives recommendations, takes real money or handles orders.
- **Precedent to note:** in Nov 2022 the State Securities Commission (SSC) warned against unlicensed securities apps (Tititada, Anfin, Infina).
- **Role:** user acquisition, no revenue yet.

#### Route 3 — Connect to a licensed exchange (once one is operating)

- N.E.D provides the interface (Google login, @username, Teddy). The exchange handles KYC, VND order matching and 0.1% tax withholding.
- **Dependencies:**
  - A licensed exchange must exist, and the 6-month transition period after the first licence must have passed (Resolution 05/2025, Art. 7).
  - Exchanges may not need a partner because they have their own apps.

#### Route 4 — Apply for controlled testing (fallback)

- Based on Law 93/2025. The article number and procedure are unverified. Low chance of success.

---

## 7. Revenue model

### 7.1. Change from the old model

| | Old model | New model |
| --- | --- | --- |
| Main source | 0.25% swap/investment fee | **International transfer fee** |
| Charged to | All users | Senders abroad |
| Role of Vietnam | Main market | User acquisition; indirect revenue |

### 7.2. Revenue sources

| Phase | Source | Where | Mechanism | Confidence |
| --- | --- | --- | --- | --- |
| 1 | **Transfer fee** | International | Fixed fee plus FX spread, below the 5–7% cost via SWIFT | Proven model (Credible, KinnectFi); exact fee needs partner quotes |
| 1 | **0.25% swap and investment fee** | International | On each Jupiter and xStocks trade | Already built (Demo mode); Jupiter's platform-fee mechanism not yet verified |
| 2 | **Yield spread on USD balances** | International | Senders hold USDC before sending; N.E.D keeps part of the interest from a lending partner | MiCA restricts interest on stablecoins (specific provision not yet checked) |
| 2 | **Referral fees from licensed exchanges** | Vietnam | Exchange pays per user who opens an account and passes KYC | Depends on exchanges being licensed |
| In parallel | **Selling infrastructure to businesses (B2B)** | Vietnam and international | License the on-chain @username/phone identity system and onboarding flow to banks and remittance companies | Credible won with a bank-facing model; N.E.D has not validated demand |

### 7.3. Illustration of scale

> Every number in this table is an **assumption** to show scale, not a forecast.

| Variable | Assumed value | Note |
| --- | --- | --- |
| Remittance market to Vietnam | USD 16 bn/year | 2025 fact |
| N.E.D market share | 0.1% (conservative) / 1% (ambitious) | Assumption |
| Fee charged to sender | 1.5% | Assumption, vs 5–7% via SWIFT |
| Conversion, payout and KYC costs | ~1% | Needs real quotes |
| **Gross margin** | **~0.5%** | Assumption |

```text
Annual gross profit = Market × Market share × Gross margin

Conservative: 16,000,000,000 × 0.1% × 0.5% ≈    80,000 USD
Ambitious:    16,000,000,000 × 1%   × 0.5% ≈   800,000 USD
```

**Interpretation:** a 0.1% share only supports a small team, and that is before licensing, legal and staff costs. To be profitable, N.E.D needs the phase 2 sources or the B2B line on top.

### 7.4. Per-transaction cost model (template to fill in)

| Item | Paid to | Value | Where to get the number |
| --- | --- | --- | --- |
| Funding (fiat → USDC) in the sending country | On-ramp partner | ? | Partner quote |
| Solana network fee | Network | ~0.000005 SOL/transaction | Measured on devnet (poc-dynamic.md); re-measure on mainnet |
| Convert USDC → USD | Off-ramp partner | ? | Partner quote |
| Transfer USD to Vietnam | Intermediary bank | ? | Quote |
| VND payout to recipient | Vietnamese remittance company | ? | Negotiation |
| Sender KYC | KYC provider | ? | Quote |
| **Total cost** | | ? | |
| **Fee charged to sender** | N.E.D | ? | Decide once total cost is known |

---

## 8. Roadmap

| When | Goal | Key work |
| --- | --- | --- |
| **By 10 Oct 2026** (UniHackfest) | Pitch the new story | Rewrite the pitch deck around segment 1; demo the "send home by phone number" flow on devnet; International/Vietnam region switch; two-column legal slide; interview 10–15 Vietnamese people abroad |
| **Q4 2026** | Validate | Choose the first remittance corridor; get legal advice; set up an entity abroad; contact 1–2 Vietnamese banks or remittance companies; prepare KYC/AML before 1 Dec 2026 |
| **H1 2027** | International pilot | Launch on mainnet in one country; test route 1 with a Vietnamese partner |
| **2027 onwards** | Expand in Vietnam | Once an exchange is licensed and the 6-month transition has passed: negotiate route 3; consider applying for the sandbox |

**What to cut first if resources run short:** sandbox (route 4) → exchange integration (route 3) → yield spread → 0.25% swap. Do not cut: the send-home flow and simulated investing.

---

## 9. Product and code changes

Most of the existing code can be reused: Dynamic login, on-chain identity in `ned_program`, sending by @username/phone number, Jupiter, xStocks, Demo mode.

| Change | Reason | Implementation hint |
| --- | --- | --- |
| International / Vietnam region switch (region gating) | Turn features on/off by law | Replaces Phase 4 "two wallet modes" in `04-ke-hoach-code.md`; can build on `stores/useWalletModeStore.ts` |
| Disable real swaps and xStocks in the Vietnam version | Decree 284/2026, Decree 135/2015 | Keep `app/xstocks/*` in Demo mode with an educational label |
| Change wording: drop "payment" | Decree 52/2024 | `locales/vi.json`, `locales/en.json` |
| "Send home" shortcut on Home | Core feature | Reuse `components/SendFlow.tsx` |
| Review putting the phone hash on-chain for Vietnamese users | Law 91/2025, Decree 356/2025 | Explicit consent screen; consider not creating a `PhoneRecord` for Vietnamese users |
| Assess data transfer through Dynamic (US) | Law 91/2025 Art. 20; Law 116/2025 | Cross-border transfer impact assessment dossier |
| T.E.D gives general guidance only | Law on Securities Art. 4(32) | Rule-based per Gate D0; no specific tickers in the Vietnam version; never executes trades by itself (Decision 33/2026) |
| Prepare KYC/AML | Law 23/2026, effective 1 Dec 2026 | Choose a KYC provider for the international version |

---

## 10. Risks, unverified points and open questions

### 10.1. Main risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| No remittance partner accepts stablecoin-sourced funds | Medium–high | Lose route 1 | Off-ramp partner abroad sends USD through normal banking channels |
| Money-transmission licence in the sending country is too costly | High | Delayed launch | Choose a lighter-regulation country; partner with an already-licensed firm |
| Margins too thin | High | Unprofitable at small scale | Add B2B and yield spread |
| Vietnamese exchanges licensed late | Medium | Route 3 pushed back | Do not depend on route 3 in year one |
| Large competitors (Bitget, Phantom) target Vietnamese users | Medium | Lose differentiation | Go deep on community and domestic partners |

### 10.2. Unverified points

- Whether any Vietnamese exchange received a final licence by late Sep 2026.
- Whether swapping on a DEX from a self-custody wallet counts as "trading through an unlicensed platform" under Decree 284/2026.
- Whether Vietnamese remittance companies accept funds converted from stablecoins.
- Whether Dynamic's embedded MPC wallet counts as non-custodial under MiCA and Vietnamese law.
- The legal status of xStocks in Japan, South Korea and Taiwan.
- Money-transmission licences in candidate sending countries.
- Jupiter's platform-fee mechanism (mentioned in our research but not verified).
- MiCA's rules on paying interest on stablecoins.
- The sandbox article number and procedure in Law 93/2025.

### 10.3. Open questions for the team and readers

1. Will the team incorporate and continue the product after UniHackfest?
2. Which remittance corridor comes first?
3. What is the average transfer size for the target segment? This should come from user interviews.
4. Should we prioritise B2C (an app for senders) or B2B (selling infrastructure to banks and remittance companies)?
5. Should we keep on-chain phone-number identity, or use a different approach for Vietnamese users?

---

## 11. References

### Vietnamese law

- Law 71/2025/QH15: https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Luat-Cong-nghiep-cong-nghe-so-2025-so-71-2025-QH15-621341.aspx
- Resolution 05/2025/NQ-CP: https://luatvietnam.vn/tai-chinh/nghi-quyet-05-2025-nq-cp-cua-chinh-phu-ve-viec-trien-khai-thi-diem-thi-truong-tai-san-ma-hoa-tai-viet-nam-410830-d1.html
- Decree 284/2026/ND-CP: https://luatvietnam.vn/tin-van-ban-moi/da-co-nghi-dinh-284-2026-nd-cp-quy-dinh-xu-phat-vi-pham-hanh-chinh-ve-tai-san-ma-hoa-186-110570-article.html
- Decree 52/2024/ND-CP: https://thuvienphapluat.vn/van-ban/Tien-te-Ngan-hang/Nghi-dinh-52-2024-ND-CP-thanh-toan-khong-dung-tien-mat-427855.aspx
- Decree 89/2016/ND-CP: https://luatvietnam.vn/tai-chinh/nghi-dinh-89-2016-nd-cp-chinh-phu-106701-d1.html
- Circular 34/2015/TT-NHNN (consolidated 24/VBHN-NHNN 2026): https://luatvietnam.vn/tai-chinh/van-ban-hop-nhat-24-vbhn-nhnn-2026-huong-dan-dich-vu-nhan-va-chi-tra-ngoai-te-431743-d5.html
- Decree 135/2015/ND-CP: https://luatvietnam.vn/dau-tu/nghi-dinh-135-2015-nd-cp-chinh-phu-101821-d1.html
- Law on Securities 2019: https://luatvietnam.vn/chung-khoan/luat-chung-khoan-2019-179050-d1.html
- Law on Personal Data Protection 91/2025/QH15: https://luatvietnam.vn/linh-vuc-khac/luat-bao-ve-du-lieu-ca-nhan-moi-nhat-va-van-ban-huong-dan-883-106497-article.html
- Decree 356/2025/ND-CP: https://luatvietnam.vn/thong-tin/nghi-dinh-356-2025-nd-cp-quy-dinh-chi-tiet-luat-bao-ve-du-lieu-ca-nhan-422896-d1.html
- Law on Cybersecurity 116/2025/QH15: https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Luat-An-ninh-mang-2025-so-116-2025-QH15-666020.aspx
- Law 23/2026/QH16: https://thuvienphapluat.vn/chinh-sach-phap-luat-moi/vn/ho-tro-phap-luat/chi-dao-dieu-hanh/116259/thong-qua-luat-sua-doi-luat-ngan-hang-nha-nuoc-viet-nam-luat-phong-chong-rua-tien-va-luat-cac-to-chuc-tin-dung
- Law on Artificial Intelligence 134/2025/QH15: https://luatvietnam.vn/linh-vuc-khac/luat-tri-tue-nhan-tao-2025-va-diem-dang-chu-y-883-105846-article.html
- Law 93/2025/QH15 (sandbox): https://vietnamnet.vn/chinh-thuc-co-co-che-sandbox-de-trien-khai-mo-hinh-cong-nghe-chinh-sach-moi-2415685.html
- Exchange licensing status: https://dientuungdung.vn/tcex-duoc-bo-tai-chinh-chap-thuan-vong-1-cap-phep-san-giao-dich-tai-san-ma-hoa-14978.html

### Market and competitors

- Vietnam remittances 2025: https://vietnamnet.vn/en/vn-sets-remittance-record-of-over-16-billion-in-2025-says-foreign-minister-2478410.html
- Stablecoins in Vietnam (Tiger Research, secondary source): https://reports.tiger-research.com/p/stablecoins-as-vietnams-parallel-vnd-eng
- Phantom Cash: https://phantom.com/learn/blog/phantom-cash-accounts-are-here
- Phantom feature availability by region: https://help.phantom.com/hc/en-us/articles/48634486197651-Feature-availability-by-region
- Bitget Wallet and VietQR: https://crypto.news/bitget-wallet-becomes-first-crypto-wallet-to-support-national-vietnam-qr-payment/
- MiniPay: https://press.opera.com/2026/06/23/minipay-visa-debit-card/
- xStocks legal structure: https://docs.xstocks.fi/docs/product-legal-overview
- Kraken acquires Backed: https://blog.kraken.com/news/backed-acquisition
- ONUS halts withdrawals: https://technode.global/2026/03/23/vietnams-cryptocurrency-trading-platform-onus-halt-cashout-amid-police-activity/

### Hackathons

- Colosseum Frontier 2026: https://blog.colosseum.com/announcing-the-winners-of-the-solana-frontier-hackathon/
- Colosseum Cypherpunk 2025: https://blog.colosseum.com/announcing-the-winners-of-the-solana-cypherpunk-hackathon/
- Colosseum Breakout 2025: https://blog.colosseum.com/announcing-the-winners-of-the-solana-breakout-hackathon/
- How to win a Colosseum hackathon: https://blog.colosseum.com/how-to-win-a-colosseum-hackathon/
