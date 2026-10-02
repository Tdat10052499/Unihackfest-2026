# Customer demographic: freelancers paid in USD

Research of 2 Oct 2026 · Author: Nguyễn Minh Chính (Compliance Lead) · Status: working profile, to be confirmed by the survey and interviews before the team decision on 6 Oct 2026.

> **Update (2 Oct 2026):** USP 1 (Milestone Lock) is now the main demo through the VND-only path in [`../09-milestone-lock/`](../09-milestone-lock/README.md); its "Roadmap only" status below is superseded. Vietnamese abroad are served as international freelancers who receive USDC; sending money home to family is not in v1. The 6 Oct survey is a go/no-go on demand, not a segment choice (decision D10). The latest customer profile is in [`ned-research-and-compliance.md`](ned-research-and-compliance.md).

Labels: **[Sourced]** fact with a source · **[Inference]** conclusion from facts · **[Assumption]** chosen for planning, must be tested · **[Unverified]** searched, no reliable source found.

## Summary

Our first customer is a **Vietnamese freelancer or remote worker, roughly 22–35, paid by foreign clients in USD or stablecoins (USDT/USDC)**, who keeps part of that money in dollars and sends part to family or friends in Vietnam. The core group lives in Vietnam; an extension group is Vietnamese freelancers, students and workers abroad who send money to Vietnam.

No study covers exactly this niche, so this profile combines several sources. Strategy v3 (`docs/07-strategy-v3/`) lists this group as segment B.

## Market size

| Fact | Number | Source · label |
| --- | --- | --- |
| Vietnamese who own crypto | ~17 million (peak 21 million) | [Government portal, Jan 2026, citing Chainalysis](https://en.baochinhphu.vn/viet-nam-ranks-7th-in-number-of-crypto-asset-holders-globally-111260129102245433.htm) · [Sourced] |
| Vietnam's crypto adoption rank, 2025 | 4th in the world | [VnEconomy, Sep 2025](https://en.vneconomy.vn/vietnam-ranks-fourth-globally-in-crypto-adoption.htm) · [Sourced] |
| Share of money from abroad arriving as stablecoins | ~7.8% | [Tiger Research](https://reports.tiger-research.com/p/stablecoins-as-vietnams-parallel-vnd-eng) · [Sourced] |
| Average premium of USDT over the official USD rate, 2024 | 3.35% | [Tiger Research](https://reports.tiger-research.com/p/stablecoins-as-vietnams-parallel-vnd-eng) · [Sourced] |
| Members of Facebook freelancer groups | 500,000+ | [Thanh Niên, 3 Oct 2025](https://thanhnien.vn/ngay-cang-co-nhieu-nguoi-lam-viec-tu-do-tren-nen-tang-so-185251003140934982.htm) · [Sourced] |
| Vietnamese freelancers paid in stablecoins | Unknown | [Unverified] |

Group members are not unique people, so 500,000+ is a reach figure, not a headcount.

## Core segment: freelancers in Vietnam

| Factor | Profile | Label |
| --- | --- | --- |
| Age | Mostly 22–35. Freelancers in a 2025 press feature are 25–26; at a 2024 crypto event, 48% were under 25 and 28% were 25–40 | [Inference] from [Sourced] cases |
| Gender | Leans male; 56% male / 44% female at that crypto event, a biased sample | [Sourced], weak |
| Location | Hanoi, Ho Chi Minh City, Da Nang | [Assumption] |
| Jobs | Graphic design, content writing, translation, programming, ads, fanpage management; Web3 roles in marketing, community and data | [Sourced] |
| Income | Very uneven: a Fiverr designer earns 20–30M VND/month; an Upwork developer USD 500–2,000+/month | [Sourced], single cases |
| How they get paid | PayPal, Payoneer, e-wallets; USDT via Telegram | [Sourced] |
| How they turn USDT into VND | Binance P2P, Telegram OTC, direct wallet trades | [Sourced] |
| Where to reach them | Facebook freelancer groups, Telegram, Upwork / Fiverr communities | [Sourced] |
| Phone number | Vietnamese +84, which N.E.D's phone lookup already supports | [Inference] |

**Pains:**

- Payment scams through PayPal and e-wallets, and no legal protection or social insurance. [Sourced]
- Converting USDT to VND through unofficial channels that carry risk. [Sourced]
- Proving income for tax, visas, renting or loans. [Inference]
- Sending part of their income to family who don't use crypto. [Assumption]

## Extension segment: Vietnamese abroad

| Group | Size | Source · label |
| --- | --- | --- |
| Vietnamese workers in Japan | 605,906 (largest foreign group, Oct 2025) | MHLW via strategy v2 · [Sourced] |
| Vietnamese in South Korea | ~270,000 + ~100,000 students | Korea Times via strategy v2 · [Sourced] |
| Vietnamese workers in Taiwan | ~294,000 | Secondary source · [Unverified] |
| Vietnamese students abroad | ~250,000 | MOET via strategy v2 · [Sourced] |
| Vietnamese freelancers living abroad | Unknown | [Unverified] |

**What blocks this segment today:**

- The app only accepts +84 numbers, so a sender with a Japanese (+81) or Korean (+82) number can't link a phone.
- Family can't receive VND because there is no licensed payout partner.
- Formal channels from Japan already cost 2.05–3.70%, so price alone won't attract them. [Sourced: World Bank via v2]
- Japanese law on an on-chain savings product is [Unverified].

A sender abroad who keeps a Vietnamese number can already send to a receiver in Vietnam who is happy to hold USDC. How many senders keep a +84 number is a survey question. [Assumption]

## Personas · [Assumption]

**Vinh, 26, freelance designer in Hanoi (core).** Foreign clients pay him USD 800–1,500 a month, partly in USDT through Telegram. He keeps most of it in dollars, sells some on Binance P2P when he needs VND, and sends money to his parents, who don't use crypto. He worries about P2P scams and how to declare this income for tax.

**Linh, 24, IT worker in Osaka (extension).** She still keeps her Vietnamese SIM for banking OTPs, sends about ¥50,000–100,000 home a month, and has seen remittance scams in Facebook groups. Her brother in Ho Chi Minh City is a freelancer who already holds USDT.

## USPs, one per pain

| # | Pain | USP | Legal risk in Vietnam | Build by 9/10? |
| --- | --- | --- | --- | --- |
| 1 | Clients disappear or reverse payments | Milestone Lock: client locks USDC per milestone | High if a Vietnam resident receives USDC; the VND-only path avoids that (see `../09-milestone-lock/`) | **Main demo** (superseded status) |
| 2 | Family has no crypto wallet | Send to any Vietnamese phone, claim later | Medium: may count as holding funds | Roadmap only |
| 3 | Scams when paying strangers | Check before you send: on-chain facts about the receiver | Low | Mostly app work |
| 4 | Proving income for tax, visas, loans | Income statement in USD and VND with on-chain receipts | Low | Mostly app work |

**Wording rules:** say "send" or "transfer", never "pay" or "payment" for USDC (crypto is not a lawful means of payment under Decree 52/2024). The receiver check shows facts only, never "safe" or "scam-free". Anything not built by 9/10 is roadmap, never done.

## Who to recruit for the survey and interviews

Target by 6 Oct: 30+ survey answers and 6 interviews.

Screening questions:

1. Are you 18 or older?
2. In the last 6 months, have you been paid by a client or employer outside Vietnam?
3. Have you ever received or held USDT or USDC?
4. Where do you live now: Vietnam or abroad? Which country?
5. Do you still use a Vietnamese (+84) phone number?

| Group | Survey | Interviews | Where to find them |
| --- | --- | --- | --- |
| Freelancers in VN paid in USD or stablecoins | 20 | 3 | Facebook freelancer groups, Upwork/Fiverr Vietnam communities |
| Vietnamese abroad who send money home | 10 | 2 | Vietnamese student and worker groups in Japan/Korea |
| Group-fund organisers (class, club, Web3 community) | Optional | 1 | University clubs, Web3 Telegram groups |

Use income bands, never exact income, and collect no names or phone numbers.

## Pitch slide version

Only [Sourced] numbers go on the judges' slide:

- **17 million** Vietnamese own crypto; Vietnam ranks **4th** in the world for adoption (Chainalysis 2025)
- **~7.8%** of money from abroad already arrives as stablecoins (Tiger Research)
- **500,000+** members in Vietnamese freelancer Facebook groups (Thanh Niên, Oct 2025)
- **Target user:** 22–35, freelancer or remote worker in a big city, paid by foreign clients, sends money to family

Do not put on the slide: the 56/44 gender split (biased sample), single income cases as averages, or tax claims before they are confirmed.

## Sources

Opened 2 Oct 2026.

- [Government news portal: Vietnam 7th in crypto holders](https://en.baochinhphu.vn/viet-nam-ranks-7th-in-number-of-crypto-asset-holders-globally-111260129102245433.htm)
- [VnEconomy: Vietnam ranks 4th in crypto adoption](https://en.vneconomy.vn/vietnam-ranks-fourth-globally-in-crypto-adoption.htm)
- [Tiger Research: Stablecoins as Vietnam's parallel VND](https://reports.tiger-research.com/p/stablecoins-as-vietnams-parallel-vnd-eng)
- [Thanh Niên: More people freelancing on digital platforms](https://thanhnien.vn/ngay-cang-co-nhieu-nguoi-lam-viec-tu-do-tren-nen-tang-so-185251003140934982.htm)
- [KuCoin survey at VTIS 2024, Vietnam Gen Z](https://rss.boorghani.com/?p=271387)
- [TGM Research: Vietnam crypto insights (summary page only; full report is paid)](https://tgmresearch.com/vietnam-crypto-insights-2024.html)
- Strategy v2 in this repo (`docs/06-strategy-v2/`) for the figures on Vietnamese abroad
