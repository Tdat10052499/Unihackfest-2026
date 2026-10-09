# N.E.D Wallet — Full evaluation and plan to win UniHackFest 2026

Research of 2 Oct 2026 · Author: Nguyễn Minh Chính (Compliance Lead) · Not legal advice. Labels: [Sourced] / [Inference] / [Assumption] / [Unverified].

> **Superseded (2 Oct 2026)** by [`ned-research-and-compliance.md`](ned-research-and-compliance.md) (research) and [`../09-milestone-lock/`](../09-milestone-lock/README.md) (build spec). This plan assumed a Rotating Fund demo and a choice between segments A and B; both are replaced (Rotating Fund is roadmap only, the customer is freelancers: decisions D3 and D10). Fines quoted here under Decree 88/2019 (VND 50–100 m) are outdated: Decree 340/2025 (VND 150–200 m for individuals, from 9 Feb 2026) applies. Kept for its rubric scorecard and history.

## Verdict

**N.E.D has a strong, rare idea (Shared Money held by a Solana program) and a solid identity layer, but on 2 Oct the core of that idea has zero lines of code, 7 days before the internal deadline.** The repo on main (commit 45bb5b1) has had no code change since 28 Sep; the last eight merged pull requests are documents. The demo judges will score (30% of Track 1, 20% of Track 2) does not exist yet.

The five changes that matter most, in order:

1. **Build the Rotating Fund on-chain, small and well tested, by 5 Oct.** It is the demo, the Track 2 story and the USP at once. Cut everything else first (strategy v3 section 13 already lists the cut order).
2. **Fix the legal design before the pitch, not after.** In Vietnam, pooled USDC used to pay for goods or services is an unlawful means of payment under Decree 52/2024; Milestone Lock for Vietnam-based users stays on the roadmap; the Rotating Fund must be framed as the international version among people who know each other.
3. **Fix phone privacy and verification.** The on-chain phone hash uses a public salt over a 9-digit space, so any number can be linked to a wallet; there is no OTP. Both are now legal points, not only product points (PDP Law 91/2025, Cybersecurity Law 116/2025).
4. **Decide the segment on 6 Oct with real survey data.** No official count of Vietnamese freelancers exists, so the team's own survey is the only evidence a judge will accept.
5. **Rebuild the deck and backup video around what really runs.** Real screenshots, a real 60–90 s recording, verified numbers with sources, and the known gaps said out loud.

**Correction to earlier Compliance Lead documents.** The legal brief (2 Oct) said the Law on Digital Technology Industry (Law 71/2025/QH15) bans crypto as a means of payment, and that Decree 52/2024 has no crypto rule. Reading the law's text shows Articles 46–48 contain no such ban. The ban comes from **Decree 52/2024, which prohibits issuing, supplying or using unlawful means of payment** (crypto is not among the lawful non-cash instruments it lists), with fines of VND 50–100 m under Decree 88/2019 and possible liability under Criminal Code Art. 206. Strategy v3's original citation was right. The legal brief and Tabs 11 and 13 of the Compliance Hub were corrected on 2 Oct; the review note to Đạt still needs its point 2 dropped (section 11).

## Scorecard against the official rubrics

Weights are from the UniHackFest 2026 rules (Hub Tab 02). "Today" is the team's honest position on 2 Oct; "Target" is reachable by 9 Oct if section 10 is followed. Scores are my estimate out of 10 \[Inference\].

**Track 1 — Best Product & Business**

| Criterion (weight) | Today | Gap | Fix | Target |
| --- | --- | --- | --- | --- |
| Market problem and target users (25%) | 5 | Two candidate segments; no own data; strong desk research only | Run the survey now (30+ answers), decide 6 Oct, open the pitch with your own numbers next to MHLW and Chainalysis | 8 |
| Solution, working demo, product experience (30%) | 3 | Core feature not built; app English-only; mode switch fake; balance bug | Rotating Fund end to end on devnet; Vietnamese UI on; fix bugs listed in section 3 | 7–8 |
| Business model, revenue, go-to-market (25%) | 4 | Revenue model built for v2 remittance; fee cost unknown; fee on pooled funds raises legal risk | Re-base `unit_economics.py` on the chosen segment; name channels (Facebook groups, worker associations); show the B2B / Vietnam-ledger path | 7 |
| Presentation, persuasion, Q&A (20%) | 5 | Deck outdated (xStocks/Phantom story, mockups) | New deck, 5-minute script, Q&A drill on legal and security | 8 |

**Track 2 — Best Technical Build**

| Criterion (weight) | Today | Gap | Fix | Target |
| --- | --- | --- | --- | --- |
| Technical depth and difficulty (30%) | 5 | Identity PDAs and MPC login are real; nothing novel on-chain yet | SharedFund program with permissionless time-based release, per-member accounting, security deposit | 8 |
| On-chain/off-chain architecture, smart contract quality (25%) | 6 | 10 LiteSVM tests on identity only; `transfer_stablecoin` untested and unused; phone hash privacy flaw | Tests for every constraint and deadline edge; invariants; fix phone design; emit events | 8 |
| Use of the Solana stack, composability, performance (25%) | 5 | Jupiter (demo), SNS lookup, Dynamic | Add one or two deep integrations: Solana Pay / Actions link to join or contribute; Squads multisig as upgrade authority; compute-unit table | 7–8 |
| Demo completeness and presentation (20%) | 3 | No Shared Money demo; no backup video | Seeded demo fund with 4–5 devnet wallets; 60–90 s real recording | 8 |

**Submission rules that can disqualify or cost points:**

- Working live link or accessible devnet product, not only a video.
- Public repo with a real commit history (the team has one; keep committing small, real steps).
- 60–90 s backup video of the real app, no staged mockups.
- Slides sent in advance; no exchange sign-up QR codes, referral links or invest-urging language; demos on devnet.
- The written rules say one main track and one prize per team; keep the organisers' permission for both tracks in Hub Tab 10.

## Product and core system: keep, improve, add, remove

The core system judges should see is three layers: **identity** (built), **Shared Money program** (to build), **app screens that make both feel simple** (partly built). Everything else is optional.

| Action | Item | Where | Why | Priority |
| --- | --- | --- | --- | --- |
| **Add** | `SharedFund` + `Participant` accounts, `create_fund`, `join`, `contribute`, `release`, `close` for Rotating Fund | `ned_program/programs/ned-program/src/lib.rs` | This is the product. Without it the pitch has no demo | P0, by 5 Oct |
| **Add** | Tests: every constraint failing, deadlines at t−1 / t / t+1, full cycle with N members, double-release attempt, wrong mint, odd amounts | `ned_program/.../tests/` (LiteSVM) | Track 2 "smart contract quality" (25%) | P0 |
| **Add** | Fund screens: list, create, detail (who has paid, on-chain links), contribute, release result with "Send home" | `ned-wallet/app/` | Track 1 demo (30%) | P0, 6–7 Oct |
| **Add** | Seeded demo fund with 4–5 devnet wallets and a script to reset it | `ned-wallet/scripts/` | A demo that works every time on stage and at the booth | P0 |
| **Add** | Receiver check before sending (account age, phone verified or not, past transfers with you) | `components/SendFlow.tsx` | Low-risk USP, mostly app work | P1 |
| **Add** | Income statement export (CSV/PDF, USD + VND, on-chain links) | `app/history.tsx` | Low-risk USP for segment B | P1 |
| **Add** | Anchor events (`emit!`) for every fund action | program | Clean source for history, statements and indexing | P1 |
| **Improve** | Phone privacy: today `scrypt(E.164, public salt)` on-chain; a 9-digit space can be swept and any known number checked in one hash | `services/identity/phoneKey.ts`, `link_phone` | PDP Law 91/2025; judges who know security will ask | P1: say it honestly; roadmap: OTP then keyed HMAC with a secret pepper, or an off-chain lookup plus a Solana Attestation Service "phone verified" attestation |
| **Improve** | Turn on Vietnamese (`lng: 'en'` is hard-coded; files exist) and add a language switch | `services/i18n.ts`, `settings.tsx` | Target users are Vietnamese; demo stays English | P1 |
| **Improve** | USDC balance falls back to summing every token | `services/solana.ts` `getUsdcTokenBalance` | Shows wrong money on stage | P0 (small fix) |
| **Improve** | Mode screen promises "switch anytime from Home"; no switch exists | `app/(onboarding)/mode.tsx` | Honesty rule | P0 (text fix) or remove the mode step |
| **Improve** | Program security: `InterfaceAccount` + `transfer_checked`, pinned USDC mint, internal accounting (never trust `vault.amount`), checked maths, status enum, `init` not `init_if_needed` | SharedFund | Anchor and Neodyme checklists | P0 |
| **Improve** | Use `Clock.unix_timestamp` with a short grace window for deadlines; compute period from `(now - start) / period_len` | SharedFund | Clock can drift; slots vary | P0 |
| **Remove from the pitch** | xStocks, Swap, T.E.D, dApp browser, Earn | deck, demo path | Off-story, legally sensitive, or not built | Now |
| **Remove or hide** | Orphaned screens and `MwaProvider` fake signing; `poc-dynamic.tsx` open without login | `app/(tabs)/overview.tsx`, `card.tsx`, `transfer-hub.tsx`, `miniapps.tsx`, `contexts/MwaProvider.tsx` | A judge clicking around should not find fake behaviour | P1 |
| **Fix docs** | README claims (Vietnamese/English switch, dApp browser, sub-wallets); design canvas "No fee" | `ned-wallet/README.md`, `docs/02-design/canvas` | Public repo is judged | P1 |
| **Keep** | Google login + MPC wallet, @username and phone lookup, real devnet USDC send, history, 10 identity tests, no backend | — | Already real and demo-able | — |

**Gas fees.** Dynamic's Solana gas sponsorship is Enterprise-only. For the demo, fund the demo wallets with devnet SOL and show the real fee. Roadmap: Kora (Solana Foundation fee relayer) with a program allowlist; Octane was archived in April 2026.

**Composability that is worth the time (pick at most two):** a Solana Pay / Actions link "Join this fund" or "Contribute" (shareable in Zalo/Messenger); Squads multisig as the program's upgrade authority; SNS `.sol` lookup already exists. Jupiter swap is not worth demoing (mainnet only, legally sensitive).

## Target customer: how to decide on 6 Oct

**On today's evidence, segment A (Vietnamese workers in Japan) fits the Rotating Fund demo better, and segment B (freelancers in Vietnam) fits the low-risk USPs better; the survey should confirm one, not the team's preference.** Segment B's signature feature, Milestone Lock, cannot legally serve users in Vietnam today (section 5).

| Factor | Segment A: Vietnamese workers in Japan | Segment B: freelancers in Vietnam paid in USD |
| --- | --- | --- |
| Size | 605,906 workers, 23.6% of 2.57 M foreign workers, largest group (MHLW, Oct 2025) \[Sourced\] | No official count; ILO says no national statistics exist \[Sourced\]; 17 M Vietnamese hold crypto \[Sourced\] |
| Money flow | Japan→Vietnam remittances ¥288.7 bn (\~US$1.78 bn) in the year to Mar 2026, Vietnam the largest recipient (MOF/BoJ via VnEconomy) \[Sourced\] | \~7.8% of remittances to Vietnam arrive as stablecoins (Tiger Research, citing Artemis) \[Sourced\] |
| Pain | 80% of Vietnamese interns arrive in debt, average ¥674k (ISA survey 2021–22) \[Sourced\]; organiser fraud in rotating groups \[Sourced: Vietnam cases\] | 68% have gone unpaid at some point (PayPal survey, 2017, old) \[Sourced, dated\]; Fiverr takes 20% from sellers \[Sourced\] |
| Feature that fits | Rotating Fund + Send home | Income statement + receiver check; Milestone Lock only for clients and freelancers outside Vietnam |
| Biggest blocker | Phone lookup accepts +84 only; Japan's Mujin Business Act may apply if a company runs rotating funds as a business \[Unverified\]; USDC in Japan sold on Ethereum (SBI VC Trade) | Vietnam treats crypto as an unlawful means of payment (Decree 52/2024); Milestone Lock blocked for domestic users |
| How to reach them | Vietnamese worker and student groups in Japan; employers and unions (roadmap) | Facebook freelancer groups (500k+ members), Upwork/Fiverr Vietnam communities |

**Decision rule for 6 Oct (adapt strategy v3 section 14.2):**

1. Use strategy v3's thresholds (section 14.2) unchanged, so the decision is not adjusted after seeing results: segment A passes if ≥ 40% saved in a group in the past two years, ≥ 30% know of a group where money was lost, and ≥ 30% would pay \~1%; segment B passes if ≥ 30% have lost money to a client and ≥ 30% say clients would lock money through a wallet.
2. Pick the segment that passes more thresholds. If neither passes, keep Shared Money as the technical demo and pitch the sourced segment A story.
3. Whatever wins, the demo template is the **Rotating Fund**: it is the only one that is legally presentable for both segments and already first in v3's build order.

Add one question to v3's survey for segment B: "Do you live in Vietnam?" Milestone Lock can only be offered where the freelancer or the client is outside Vietnam.

**KYC and age:** survey and interviews collect no names or phone numbers, adults only, income in bands (customer research plan). The product itself has no KYC on devnet; say so.

## Regulation, KYC/AML and data privacy

**N.E.D is defensible on devnet as a non-custodial wallet; it stops being defensible the moment pooled USDC is used to pay for work in Vietnam, a fee is charged on pooled funds, or real phone numbers are stored without consent and verification.** Not legal advice; a lawyer should confirm the items marked \[Unverified\].

**Vietnam**

| Rule | What it says (source) | What N.E.D must do |
| --- | --- | --- |
| Decree 52/2024/NĐ-CP on non-cash payments (15 May 2024, in force 1 Jul 2024) | Lists the lawful non-cash instruments (cheques, payment orders, bank cards, e-wallets…); prohibits issuing, supplying or using unlawful means of payment; intermediary payment services need a State Bank licence ([Rajah & Tann](https://www.rajahtannasia.com/wp-content/uploads/2024/09/2024_07_22-Decree-52-2024-ND-CP-NCP.pdf); [Luật Việt An, 20 Mar 2025](https://luatvietan.vn/quy-dinh-phap-ly-co-ban-ve-tien-ao-tai-viet-nam.html)). Article number of the prohibition: 6(6) or 8(6) depending on the source \[Unverified\] | Never let USDC pay for goods or services between users in Vietnam. Milestone Lock and any fee on pooled funds: international version or licensed partner only |
| Decree 88/2019 (as amended by 143/2021), Art. 26.6(d); Criminal Code Art. 206 | Fines of VND 50–100 m for using unlawful means of payment; criminal liability possible ([Luật Việt An](https://luatvietan.vn/quy-dinh-phap-ly-co-ban-ve-tien-ao-tai-viet-nam.html); [VOV](https://vov.vn/kinh-te/phat-toi-100-trieu-dong-hoac-xu-ly-hinh-su-khi-su-dung-giao-dich-tien-ao-pi-post1167514.vov)). Whether 88/2019 is still the current sanctions decree: \[Unverified\] | Use this as the answer to "Is this legal?" |
| Law 71/2025/QH15 on Digital Technology Industry (in force 1 Jan 2026) | Arts 46–48 define digital, virtual and crypto assets; both exclude securities and digital forms of fiat; AML details left to the Government ([thuvienphapluat](https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Luat-Cong-nghiep-cong-nghe-so-2025-so-71-2025-QH15-621341.aspx)). No express payment ban | Cite only for definitions, not for the payment ban |
| Resolution 05/2025/NQ-CP (9 Sep 2025), crypto pilot | Trading in VND through MoF-licensed providers (VND 10 tn capital); assets must be backed by real assets, not securities or fiat, so fiat-backed stablecoins like USDC fall outside the pilot ([Vietnam Law Magazine](https://vietnamlawmagazine.vn/government-resolves-to-facilitate-crypto-asset-market-operation-75266.html)). Five applicants passed first review (VIXEX, SCEX, CAEX, TCEX, Vietnam Digital Assets); no licence as of late Sep 2026, so the six-month clock has not started ([The Investor](https://theinvestor.vn/vietnam-considers-pilot-licenses-for-5-digital-asset-exchanges-d18648.html); [crypto.news](https://crypto.news/vietnam-crypto-licenses-5-firms-clear-first-review/)) | No swap, trading or VND conversion for domestic users; keep Swap/xStocks out of the pitch |
| Decree 284/2026/NĐ-CP (in force 1 Sep 2026) | Individuals trading outside a licensed provider: VND 30–50 m; organisations offering unlicensed services: VND 180–200 m ([LuatVietnam](https://english.luatvietnam.vn/decree-no-284-2026-nd-cp-dated-july-16-2026-of-the-government-prescribing-the-sanctioning-of-administrative-violations-regarding-crypto-assets-and-t-440680-doc1.html); [VnExpress](https://vnexpress.net/giao-dich-tai-san-ma-hoa-qua-san-khong-phep-bi-phat-toi-50-trieu-dong-5098825.html)) | Same as above; do not market any crypto service to Vietnamese users |
| Law 23/2026/QH16 amending the AML Law 14/2022 (passed 24 Aug 2026, in force 1 Dec 2026) | Adds licensed crypto-asset service providers as reporting entities and 15 crypto red flags ([VietnamPlus](https://www.vietnamplus.vn/quoc-hoi-thong-qua-luat-phong-chong-rua-tien-bo-sung-quy-dinh-ve-tai-san-ma-hoa-post1132145.vnp)) | Non-custodial software is not named; at launch, KYC/AML sits with the licensed partner. Design caps and red-flag monitoring in now |
| Law 91/2025/QH15 on Personal Data Protection + Decree 356/2025 (in force 1 Jan 2026); sanctions Decree 330/2026 | Explicit, granular consent; impact assessment for cross-border transfers within 60 days; fines up to 5% of revenue for cross-border breaches; startups get 5 years' grace for some duties unless they process data of 100,000+ people or sensitive data ([Baker McKenzie](https://connectontech.bakermckenzie.com/vietnam-decoding-vietnams-pdp-law-gdpr-inspired-rules-with-local-twists/); [Tilleke](https://www.tilleke.com/insights/new-decree-provides-guidance-for-vietnams-personal-data-protection-law/)) | Consent screen before linking a phone; privacy notice; record that Dynamic (US) receives email and key shares = cross-border transfer |
| Cybersecurity Law 116/2025/QH15 (in force 1 Jul 2026) + Decree 333/2026 | Art. 16: accounts verified by Vietnamese mobile number, national ID or e-ID; Art. 19: data localisation on request ([thuvienphapluat](https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Nghi-dinh-333-2026-ND-CP-huong-dan-Luat-An-ninh-mang-721117.aspx)). Whether it applies to a wallet app: \[Unverified\] | Another reason to add OTP phone verification before launch |
| Decree 19/2019/NĐ-CP on rotating savings (hụi) | Organiser is an individual 18+; written agreement; notify the commune if a round is VND 100 m+ or one person runs 2+ groups; interest cap 20%/yr ([thuvienphapluat](https://thuvienphapluat.vn/van-ban/Tien-te-Ngan-hang/Decree-19-2019-ND-CP-on-tontine-409375.aspx)) | Vietnam version = ledger and reminders only, money moves bank to bank |
| Circular 32/2026/TT-BTC | 0.1% tax on transfers made through licensed providers, withheld by them ([Baker McKenzie, May 2026](https://www.bakermckenzie.com/en/insight/publications/2026/05/vietnam-launches-pilot-tax-framework-for-crypto-asset-transactions)). Effective date 27 Mar or 1 Jul 2026 \[Unverified\] | Income statement is proof of income, not a tax tool |
| Da Nang sandbox (Resolutions 136/2024, 222/2025) | Basal Pay, TORA, Umi Pay and others approved to test crypto–VND services ([VnEconomy, 22 Aug 2026](https://en.vneconomy.vn/da-nang-accelerates-crypto-sandbox-and-rwa-tokenization-for-infrastructure-funding.htm)) | Roadmap: partner with a sandboxed off-ramp instead of building one |

**Japan (segment A)**

- Self-custody wallets where users hold their own keys are not crypto-asset exchange business (FSA gray-zone answer, Oct 2024) \[Sourced\].
- USDC is an "electronic payment instrument"; SBI VC Trade was the first registered intermediary (Mar 2025) \[Sourced\].
- Mujin Business Act (1931): running rotating savings as a business needs a licence and a ¥50 m joint-stock company; penalties up to 3 years. Private groups among acquaintances appear outside it; app-based groups paying out USDC: no guidance \[Unverified\]. **Design consequence:** N.E.D does not organise groups or charge a fee on them in Japan until a lawyer confirms.

**Global (FATF)**

- Developers of unhosted wallet software are typically not VASPs (2021 guidance, para. 76); "control" need not be unilateral (para. 73), so any key share held by Dynamic or N.E.D that is needed to move funds should be checked \[Inference\].
- Stablecoins were 84% of illicit virtual-asset volume in 2025 (FATF, Mar 2026) \[Sourced\]: expect judges to ask about AML.

**KYC/AML design for the product (what to say and build):**

1. Devnet today: no KYC, stated openly.
2. Contribution caps per fund and per member in the program (strategy v3 already plans this).
3. OTP phone verification before mainnet; Vietnamese numbers satisfy Decree 333 Art. 16 if it applies.
4. KYC through the licensed partner at launch; N.E.D never holds fiat.
5. Red-flag monitoring based on Law 23/2026's list (split transactions, rapid in-out, fan-in/fan-out).

## Market data (verified)

Every number below was opened at its source on 2 Oct 2026. Use only these on slides; anything else is in section 11.

| Fact | Number | Source (date) |
| --- | --- | --- |
| Remittances to Vietnam, 2025 | Above US$16 bn, a record | [VietnamNet](https://vietnamnet.vn/en/vietnam-ready-for-lunar-new-year-remittance-inflows-2480086.html) (8 Jan 2026) |
| Remittances to Ho Chi Minh City, 2025 | US$10.34 bn (+8.3%); 71.8% via remittance companies; Asia 48.9% | [VnEconomy](https://vneconomy.vn/hon-1034-ty-usd-kieu-hoi-chuyen-ve-tp-ho-chi-minh-trong-nam-2025.htm) (22 Jan 2026) |
| Sent home by \~860k contract workers abroad | US$6.5–7 bn a year | [VnEconomy](https://vneconomy.vn/860000-lao-dong-viet-xuat-ngoai-gui-ve-nuoc-gan-7-ty-usd-moi-nam.htm) (31 Oct 2025) |
| Workers sent abroad in 2025 | 144,345 (Japan 64,600+, Taiwan 57,000+, Korea 11,600+) | [Dân Trí](https://dantri.com.vn/lao-dong-viec-lam/hon-144000-lao-dong-ra-nuoc-ngoai-huong-toi-thi-truong-thu-nhap-cao-20251226225850596.htm) (26 Dec 2025) |
| Vietnamese workers in Japan | 605,906; 23.6% of 2,571,037 foreign workers; largest group | [MHLW](https://www.mhlw.go.jp/stf/newpage_68794.html) (30 Jan 2026) |
| Remittances Japan → Vietnam, year to Mar 2026 | ¥288.7 bn (\~US$1.78 bn); Vietnam the largest recipient | [VnEconomy, citing MOF/BoJ](https://vneconomy.vn/luong-kieu-hoi-chuyen-tu-nhat-ban-lap-ky-luc-viet-nam-dan-dau.htm) (14 Jul 2026) |
| Vietnamese interns arriving in debt | 80%, average ¥674k | [nippon.com, ISA survey](https://www.nippon.com/en/japan-data/h01411/) (29 Jul 2022) |
| Cost to send Japan → Vietnam | 3.70% (¥20k) / 2.05% (¥42k); range 2.19% (JRF) to 20.03% (Japan Post Bank) | [World Bank RPW, Q3 2025](https://remittanceprices.worldbank.org/corridor/Japan/Vietnam) |
| Cost to send Korea → Vietnam | 5.15% | [World Bank RPW, Q3 2025](https://remittanceprices.worldbank.org/corridor/South%20Korea/Vietnam) |
| Vietnam crypto adoption | 4th of 151 countries; \~US$220 bn received Jul 2024–Jun 2025 (+55%) | [VnEconomy](https://en.vneconomy.vn/vietnam-ranks-fourth-globally-in-crypto-adoption.htm) (4 Sep 2025); [VTV](https://english.vtv.vn/news/vietnams-crypto-market-value-tops-220-billion-usd-chainalysis-20250929105131954.htm) (29 Sep 2025) |
| Vietnamese crypto holders | \~17 M (peak 21 M) | [Government portal](https://en.baochinhphu.vn/viet-nam-ranks-7th-in-number-of-crypto-asset-holders-globally-111260129102245433.htm) (29 Jan 2026) |
| Stablecoins as remittance | \~7.8% of remittances; USDT premium 3.35% over official rate (2024) | [Tiger Research](https://reports.tiger-research.com/p/stablecoins-as-vietnams-parallel-vnd-eng) (undated) |
| Stablecoin supply | USDT US$184.1 bn, USDC US$74.2 bn; on Solana US$16.23 bn (USDC US$7.30 bn) | [DefiLlama](https://stablecoins.llama.fi/stablecoins) (live, read 2 Oct 2026) |
| Solana and USDC usage | #1 chain for USDC transfers 7 weeks running; 22.7 M transfers in one week | [Solana Compass, citing Visa data](https://solanacompass.com/news/solana-holds-1-spot-for-usdc-transactions-for-7-straight-weeks-as-salary-and-retail-payments-near-records) (23 Jun 2026) |
| Rotating-savings fraud in Vietnam | One HCMC case \~VND 200 bn (2025); An Giang: 1,234 victims, VND 14.3 bn, 17-year sentence (2026) | [Tiền Phong](https://tienphong.vn/hang-chuc-nguoi-tu-tap-o-nha-chu-hui-vi-lo-bi-bung-200-ty-dong-post1781584.html) (26 Sep 2025); [SGGP](https://www.sggp.org.vn/lua-dao-chiem-doat-hon-143-ty-dong-chu-hui-lanh-17-nam-tu-post842144.html) (10 Mar 2026) |

**What the data says for the pitch:** price is not the hook (formal channels already cost 2–4% from Japan); trust is. Organiser fraud is documented in hundreds of billions of VND, and N.E.D's answer, "the creator cannot withdraw the money", is a technical fact the demo can show.

## Competitors (verified)

**No product found combines a Vietnamese-first wallet, sending to a Vietnamese phone number on Solana, and smart-contract-held group money.** That claim is \[Inference\] from a search, not proof. Bitget Wallet is the main distribution threat in Vietnam; Phantom is the main UX threat on Solana; MoMo and ZaloPay group funds are the everyday alternative for hụi.

| Competitor | What it does and scale | Vietnam fit | Overlap | N.E.D's opening |
| --- | --- | --- | --- | --- |
| [Bitget Wallet](https://macaubusiness.com/bitget-wallet-hits-100m-users-and-payments-just-overtook-trading/) | 100 M+ users; Google/Apple/email login without seed phrase since Dec 2025 | Pays VietQR codes with USDT/USDC since Jun 2025 via AEON, 55+ banks ([Fintech Times](https://thefintechtimes.com/bitget-wallet-launches-crypto-payments-in-vietnam-via-national-qr-code-vietqr/)) | High | No group funds, no rotating savings, trader-focused |
| [MiniPay](https://forum.celo.org/t/minipay-update-q2-2026/13664) (Opera, Celo) | 18 M+ wallets, 66+ countries; send stablecoins to a phone number | On the Vietnamese App Store but English only, 10 ratings | Very high on phone sending | Not Solana, no Vietnamese UI, no group money. Do not say "no wallet sends to a phone number" |
| [Phantom](https://phantom.com/learn/blog/introducing-phantom-cash) | 20 M+ users; @username sending; CASH stablecoin and Visa card (US/EU) | Vietnamese UI since 2021; Cash in Vietnam not confirmed | Highest on Solana UX | No +84 phone sending, no group money |
| [MoneyFellows](https://techcrunch.com/2025/05/04/moneyfellows-raises-13m-to-take-its-group-savings-model-outside-egypt) (Egypt) | Digital rotating savings; 8.5 M+ users; US$60 M+ raised | Not in Asia | Same idea, off-chain | Proof that digital ROSCAs scale; N.E.D adds code-held funds |
| On-chain ROSCAs ([WeTrust](https://www.coingecko.com/learn/wetrust-rosca-ethereum-2017-launch), [CeloSusu](https://www.karmahq.org/project/celosusu/about)) | Ethereum (2017), Celo; hackathon-stage projects | None | Same mechanism | No production ROSCA found on Solana \[Inference\] |
| MoMo / ZaloPay group funds | Group-fund features already used for hụi ([Vietcetera](https://vietcetera.com/vn/choi-hui-kieu-tiet-kiem-an-toan-hay-tiem-tang-nguy-hiem)) | Native, VND, licensed | High for the Vietnam version | They hold VND under licence; N.E.D's Vietnam version should be a ledger, not a rival wallet |
| [Upwork](https://support.upwork.com/hc/en-us/articles/211063748) / [Fiverr](https://vaultleap.com/blog/fiverr-fees-explained-2026) | Escrow on-platform; Upwork freelancer fee 0–15%, Fiverr 20% | Widely used | Milestone escrow | Off-platform jobs only; size unknown \[Unverified\] |
| [Request Finance](https://solanacompass.com/projects/request-finance) | Invoices and escrow, Solana USDC; from US$300/month | Business tool | Medium | Individual freelancers, near-zero fee |
| [Squads](https://solanacompass.com/projects/Squads) | Multisig and smart accounts; US$15 bn+ secured | For teams | Shared treasury tech | Consumer UX for friends and co-workers; can use Squads underneath |
| [RedotPay](https://www.bleap.finance/blog/redotpay-review) | Stablecoin Visa card, 6 M+ users | Card works in Vietnam, 1% on VND | Spending | Not social, not group money |

**How to say it on stage:** "Bitget and Phantom are great for holding and trading. MiniPay sends by phone number. None of them lets a group of co-workers put money together where nobody, not even the organiser, can take it. That is what N.E.D adds." No logos (Tab 03).

## Business model and go-to-market: what to fix

**Strategy v3's model (section 12) is clear and labelled, but its main fee, 1% on Shared Money contributions, is the part most likely to turn a non-custodial tool into a regulated business in both target countries.** Re-order the revenue story so the pitch does not depend on it.

| Issue in v3 | Why it matters | Change |
| --- | --- | --- |
| 1% fee on Rotating Fund contributions and Milestone Lock amounts | Japan: running rotating savings as a business may need a Mujin licence \[Unverified\]. Vietnam: a fee for holding money that pays for work looks like an intermediary payment service (Decree 52/2024) | Free during the pilot. Phase 1 revenue = B2B licensing of the Shared Money program to licensed or sandboxed providers; fee only where a lawyer confirms |
| Send-home fee 1.5% vs cost 1.0% | Cost has no quote; at 1.3% cost and 1.0% fee the base case loses US$160k a year (v3 section 12.4) | Get one written quote from a Da Nang sandbox off-ramp or remittance partner before the pitch, or present the fee as a range |
| Exchange rate 150 JPY/USD | An assumption that ages | Update in `unit_economics.py` on 8 Oct and state the date |
| Every user sends ¥100k a month | That is a typical intern's figure, not an average for all workers | Show the conservative scenario first |
| Segment B economics are only an illustration | Judges score business model at 25% | If B wins, model income-statement premium (subscription) instead of a fee on locked money |

**Go-to-market that a judge can believe (first 100 users):**

1. **Pilot group:** one real group of 5–10 Vietnamese workers or students the team knows, running a devnet Rotating Fund for one cycle before 10 Oct. One real group beats any projection.
2. **Channels:** Vietnamese worker and student Facebook/Zalo groups in Japan (segment A); freelancer Facebook groups with 500k+ members (segment B) \[Sourced\].
3. **Partners (roadmap):** the five Vietnamese exchanges that passed first review and the Da Nang sandbox off-ramps (TORA, Umi Pay, Basal Pay) as licensed rails; MoMo/ZaloPay-style licensed wallets for the Vietnam ledger version.
4. **Metrics to show:** survey sample size and results, pilot group retention, cost per transaction, contribution on-time rate.

## Pitch, demo, booth and submission checklist

The final format in the rules: **5-minute pitch + 3-minute Q&A** on stage (yellow light at 4:00, red at 5:00), and an **Expo booth** whose score counts towards the product criterion. Ties go to the higher product-and-demo score.

**Deck (about 10 slides, English):**

1. Problem: organiser fraud in group savings (VND 200 bn case) and the size of the segment (605,906 / 17 M).
2. Who: the chosen segment, with the team's own survey numbers.
3. Solution: "Shared money, held by rules, not by a middleman."
4. Live demo (see below).
5. How it works: one program, PDA vault, permissionless time-based release, LiteSVM tests, compute-unit table.
6. Why us vs Bitget, Phantom, MiniPay, MoneyFellows (competitor table, no logos).
7. Two versions, each within its own law (international on-chain; Vietnam ledger).
8. Business model and conservative numbers.
9. Roadmap: Milestone Lock, Group Goal, Send & Claim, OTP, audit, licensed partner.
10. Team and the ask.

**Live demo script (under 2 minutes):** create a Rotating Fund → four devnet wallets contribute → the period's pot releases to the recipient by time, without anyone pressing a button → "Send home" to a @username → open the explorer to show the vault is owned by the program, not the creator → receiver check on a new address.

**Booth:** two phones logged in, the seeded fund on screen, a printed one-page compliance summary, a QR to the web demo only (no exchange or referral QR).

**Q&A to rehearse (Compliance Lead owns the first three):**

- "Is this legal in Vietnam?" → Decree 52/2024 answer; international version on-chain, Vietnam version is a ledger.
- "What about KYC/AML?" → non-custodial software, caps in the program, KYC via the licensed partner at launch, Law 23/2026 red flags.
- "Can someone see my phone number?" → honest answer on the hash, plus the OTP + keyed-hash roadmap.
- "What if the creator disappears?" → release is permissionless and time-based.
- "Why Solana?" → fees and USDC volume data (section 6).

**Submission:**

- [ ] Live devnet web demo link works on a fresh phone
- [ ] Public repo README matches what runs (no Vietnamese-switch, dApp browser or "no fee" claims unless true)
- [ ] 60–90 s backup video of the real app
- [ ] Slides sent to the organisers in advance
- [ ] Disclaimers in app and deck: devnet, Demo mode, not financial advice, known gaps (no KYC, phone not OTP-verified, no audit, no licensed partner)

## Day-by-day plan to 9 Oct

Built on strategy v3 section 13.1, with the compliance and evidence work added. Roles: **Dev** (developer), **CL** (Compliance Lead, Chính), **Biz** (Business Model Designer, Thành Đạt), **Design** (Brand and UI/UX, Ngân and Đan), **PO** (Product Owner, Tuấn Đạt). Who codes is the team's call.

| Date | Dev | CL | Biz | Design |
| --- | --- | --- | --- | --- |
| 2–3 Oct | `SharedFund`/`Participant`, `create_fund`, `join`, `contribute`; fix USDC balance bug and mode text | Launch survey (Forms, consent line); send v3 review to PO; correct legal brief (section 11) | Re-base `unit_economics.py` (free pilot, B2B first, conservative case) | Fund screens (list, create, detail) in DesignKit |
| 4–5 Oct | `release`, `close`, security amount; LiteSVM tests incl. deadlines and double release; deploy to devnet | 6 interviews; book mentor or law lecturer for 7 Oct; approved wording for fund screens (Hub Tab 05) | Get one partner cost quote (send-home) | Deck skeleton with real screenshots as they land |
| 6 Oct | Screens wired; seed demo fund script | Survey results → segment decision with PO | Market slide from section 6 | Update design canvas: remove "No fee" |
| 7 Oct | Contribute and release UX, "Send home", receiver check; turn on Vietnamese | Expert check of the legal answers; privacy notice and consent screen text | Business model slide | Booth materials, one-page compliance summary |
| 8 Oct | Income statement export if time; otherwise bug fixes; README matches reality; compute-unit table | Q&A drill (15 min, legal and security) | Rehearse numbers | Final deck |
| 9 Oct | **Code freeze**; record 60–90 s backup video | **Compliance sign-off** (Hub Tab 09): every slide claim true or marked roadmap | Send slides to organisers | — |

**Cut order if late (from v3):** Milestone Lock → random draw order → income statement → shortfall cover. **Never cut:** create, contribute, release, on-chain proof of who has paid, tests.

## Unverified points, corrections and open questions

**Corrections the team must make (owner: CL):**

- [x] `docs/08-research/legal-brief.md` and `.vi.md`: the payment ban comes from Decree 52/2024 (unlawful means of payment), not Law 71/2025; the "Correction" paragraph now admits the earlier error. Done 2 Oct (repo files, Claude legal brief, Hub Tabs 11 and 13).
- [x] Compliance Hub Tab 11 and Tab 13: same fix.
- [ ] Review note to Đạt: drop point 2 (v3's citation of Decree 52/2024 was right); keep points 1, 3 and 4.
- [ ] Strategy v3 section 11.1: Decree 284 fine for organisations is VND 180–200 m (correct) and for individuals VND 30–50 m (add).

**\[Unverified\] — do not put on slides without a new source:**

- Article number of Decree 52/2024's ban on unlawful means of payment (6(6) or 8(6)), and whether Decree 88/2019 as amended is still the sanctions decree.
- Whether Cybersecurity Decree 333/2026 Art. 16 (account verification) applies to a wallet app.
- Whether the Mujin Business Act covers app-based groups paying out USDC.
- Whether Dynamic's MPC key share counts as "control" under FATF para. 73.
- Circular 32/2026 effective date (27 Mar or 1 Jul 2026).
- Number of Vietnamese freelancers paid in stablecoins; how common rotating savings are among Vietnamese abroad.
- Average monthly remittance per Vietnamese worker in Japan (¥100k is a typical intern figure; ¥40k is only a division of totals).
- Bitget Wallet's user count in Vietnam; MiniPay support for +84 numbers; Phantom Cash availability in Vietnam.
- Solana Attestation Service program ID and devnet deployment; Jupiter liquidity on devnet.
- Size of off-platform freelance work (the gap Milestone Lock would fill).

**Open questions for the team (decide by 6 Oct):**

1. Who codes, and is 7 days enough for Rotating Fund + screens + tests? If not, what is cut first?
2. Keep the onboarding "mode" step (Simple/Crypto) or remove it?
3. Pitch fee model: free pilot + B2B, or 1% fee with the legal caveat?
4. Milestone Lock (v3 open question 3): auto-release after the approval deadline, or a dispute step? CL recommends roadmap only.
5. Run a real pilot group before 10 Oct?

## Sources

Opened on 2 Oct 2026 unless noted. Repo state: `main` at commit 45bb5b1 (PR #24); app code unchanged since 28 Sep. Competition rules: UniHackFest 2026 rules, updated 21 Jul 2026 (Hub Tab 02).

**Law and regulation**

- [Rajah & Tann: Decree 52/2024](https://www.rajahtannasia.com/wp-content/uploads/2024/09/2024_07_22-Decree-52-2024-ND-CP-NCP.pdf) · [Luật Việt An: legal basis on virtual currency (20 Mar 2025)](https://luatvietan.vn/quy-dinh-phap-ly-co-ban-ve-tien-ao-tai-viet-nam.html) · [VOV: fines for using virtual currency](https://vov.vn/kinh-te/phat-toi-100-trieu-dong-hoac-xu-ly-hinh-su-khi-su-dung-giao-dich-tien-ao-pi-post1167514.vov)
- [Law 71/2025/QH15 full text](https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Luat-Cong-nghiep-cong-nghe-so-2025-so-71-2025-QH15-621341.aspx) · [Vietnam Law Magazine: Resolution 05/2025](https://vietnamlawmagazine.vn/government-resolves-to-facilitate-crypto-asset-market-operation-75266.html) · [The Investor: five applicants](https://theinvestor.vn/vietnam-considers-pilot-licenses-for-5-digital-asset-exchanges-d18648.html) · [crypto.news: no licence yet](https://crypto.news/vietnam-crypto-licenses-5-firms-clear-first-review/)
- [LuatVietnam: Decree 284/2026](https://english.luatvietnam.vn/decree-no-284-2026-nd-cp-dated-july-16-2026-of-the-government-prescribing-the-sanctioning-of-administrative-violations-regarding-crypto-assets-and-t-440680-doc1.html) · [VnExpress: fines up to VND 50 m](https://vnexpress.net/giao-dich-tai-san-ma-hoa-qua-san-khong-phep-bi-phat-toi-50-trieu-dong-5098825.html) · [VietnamPlus: Law 23/2026 AML](https://www.vietnamplus.vn/quoc-hoi-thong-qua-luat-phong-chong-rua-tien-bo-sung-quy-dinh-ve-tai-san-ma-hoa-post1132145.vnp)
- [Baker McKenzie: PDP Law](https://connectontech.bakermckenzie.com/vietnam-decoding-vietnams-pdp-law-gdpr-inspired-rules-with-local-twists/) · [Tilleke: Decree 356/2025](https://www.tilleke.com/insights/new-decree-provides-guidance-for-vietnams-personal-data-protection-law/) · [Decree 333/2026 (Cybersecurity)](https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Nghi-dinh-333-2026-ND-CP-huong-dan-Luat-An-ninh-mang-721117.aspx) · [Decree 19/2019 (hụi)](https://thuvienphapluat.vn/van-ban/Tien-te-Ngan-hang/Decree-19-2019-ND-CP-on-tontine-409375.aspx)
- [Baker McKenzie: Circular 32/2026](https://www.bakermckenzie.com/en/insight/publications/2026/05/vietnam-launches-pilot-tax-framework-for-crypto-asset-transactions) · [VnEconomy: Da Nang sandbox](https://en.vneconomy.vn/da-nang-accelerates-crypto-sandbox-and-rwa-tokenization-for-infrastructure-funding.htm)
- Japan: [The Block: SBI VC Trade USDC](https://www.theblock.co/post/344406/japans-sbi-vc-trade-completes-regulatory-registration-to-process-usdc-transactions) · [FSA gray-zone answer on unhosted wallets (BeInCrypto JP)](https://jp.beincrypto.com/fsa-not-recognize-unhosted-wallets-as-crypto-exchange-businesses/) · [Mujin Business Act text](https://hourei.net/law/306AC0000000042)
- FATF: [2021 Updated Guidance](https://www.fatf-gafi.org/en/publications/Fatfrecommendations/Guidance-rba-virtual-assets-2021.html) · [Targeted report on stablecoins and unhosted wallets (Mar 2026)](https://www.fatf-gafi.org/en/publications/Virtualassets/targeted-report-stablecoins-unhosted-wallets.html)

**Market**: sources are linked in the section 6 table (VietnamNet, VnEconomy, Dân Trí, MHLW, nippon.com, World Bank RPW, Chainalysis via VnEconomy/VTV, government portal, Tiger Research, DefiLlama, Solana Compass, Tiền Phong, SGGP). [ILO: no official platform-worker statistics](https://www.ilo.org/resource/article/pilot-survey-viet-nam-promising-start-defining-digital-platform-employment).

**Competitors**: linked in the section 7 table.

**Technical**

- [Anchor security exploits](https://www.anchor-lang.com/docs/references/security-exploits) · [Neodyme: common pitfalls](https://neodyme.io/en/blog/solana_common_pitfalls) · [Anchor changelog](https://www.anchor-lang.com/docs/updates/changelog)
- [LiteSVM](https://solana.com/docs/tools/litesvm) · [Mollusk](https://solana.com/docs/programs/testing/mollusk) · [Trident fuzzing](https://ackee.xyz/trident/docs/dev/basics/commands) · [Clock sysvar](https://docs.anza.xyz/runtime/sysvars)
- [Dynamic SVM gas sponsorship](https://www.dynamic.xyz/docs/react/smart-wallets/svm-gas-sponsorship) · [Kora](https://solana.com/docs/tools/kora/getting-started) · [Octane archived](https://github.com/anza-xyz/octane) · [Circle devnet USDC](https://developers.circle.com/stablecoins/quickstart-transfer-10-usdc-on-solana)
- [Solana Attestation Service](https://solana.com/news/solana-attestation-service) · [Solana Actions](https://solana.com/docs/advanced/actions) · [Solana Pay spec](https://solana.com/docs/tools/solana-pay/specification/version1-1) · [Squads spending limits](https://docs.squads.so/main/development/reference/spending-limits) · [Helius plans](https://www.helius.dev/docs/billing/plans)
