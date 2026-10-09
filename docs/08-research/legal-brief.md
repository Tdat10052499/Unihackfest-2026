# Legal brief: escrow and crypto tax

Research of 2 Oct 2026 · Author: Nguyễn Minh Chính (Compliance Lead) · Vietnamese version: [`legal-brief.vi.md`](../archive/legal-brief.vi.md)

> **Update (2 Oct 2026):** question 1 led to the Vietnam path in [`../09-milestone-lock/`](../09-milestone-lock/README.md): the freelancer in Vietnam receives only VND from a payout partner abroad and never holds USDC, so Milestone Lock is now the main demo. The Milestone Lock rows below ("Planned", "Roadmap only") are superseded. The open legal question has moved to whether N.E.D's software is a crypto-asset related service (Decree 284/2026 Art. 7(4)): see the legal section of [`ned-research-and-compliance.md`](ned-research-and-compliance.md). Also note that the application of Decree 52/2024 to a *recipient* is our inference, not a verified rule.

This is not legal advice. It is a student team's reading of public sources, written so that a mentor, law lecturer or university legal clinic only has to confirm or correct it.

## Purpose

Two legal questions decide which USPs N.E.D can safely pitch at UniHackFest 2026. Both affect strategy v3 (`docs/07-strategy-v3/`): question 1 covers **Milestone Lock**, question 2 covers the income statement.

## Facts about N.E.D

N.E.D is a self-custody wallet on Solana. Today it runs only on devnet, with test money, and has no server of its own.

| Feature | Status | Does N.E.D hold users' money? |
| --- | --- | --- |
| Google login, embedded MPC wallet | Built | No: the key is split between the user and Dynamic, a US provider |
| Send USDC to an address, @username or Vietnamese phone number | Built | No: user to user |
| Income statement from on-chain history | Planned | No: read only |
| Locked client payment (Milestone Lock): a client abroad locks USDC in a smart contract; it is released when the client approves the work, to the freelancer's wallet abroad or to a payout partner that pays VND in Vietnam | Main demo (superseded status, see update above) | The contract holds it, not the team |

Users: Vietnamese freelancers living in Vietnam, paid by foreign clients in USDC or USDT. N.E.D does not exchange USDC into VND, does not offer trading to users in Vietnam, and charges no fee during the competition.

## Question 1: Is a smart-contract escrow for freelance work "payment"?

**Our reading: probably yes, so escrow is high risk for users in Vietnam.** A client locking USDC that is released to a freelancer when the work is approved looks like paying for a service with a crypto asset.

| Rule | What it says | What it means for escrow |
| --- | --- | --- |
| [Decree 52/2024/NĐ-CP](https://luatvietan.vn/quy-dinh-phap-ly-co-ban-ve-tien-ao-tai-viet-nam.html) on non-cash payments (in force 1 Jul 2024); fines in Decree 340/2025 Art. 30(6)(d) (in force 9 Feb 2026, replacing Decree 88/2019); Criminal Code Art. 206 | Lists the lawful non-cash payment instruments (cheques, payment orders, bank cards, e-wallets…) and prohibits "issuing, supplying or using unlawful means of payment"; crypto is not a lawful instrument. Fines VND 150–200 m for individuals, double for organisations; criminal liability possible. The ban is Art. 8(6), with definitions in Art. 3(10)–(11) [Verified 2 Oct 2026] | The clearest rule against escrow: USDC paying for freelance work is using an unlawful means of payment for a service |
| [Resolution 05/2025/NQ-CP](https://www.bakermckenzie.com/-/media/files/insight/publications/alerts/09/vietnam-new-resolution-on-pilot-program-for-digital-and-crypto-assets-marke.pdf), 9 Sep 2025 | Crypto may be used "for exchange or investment purposes"; trading must go through a licensed provider; six months after the first licence, trading outside one can be fined or prosecuted | No licence had been issued as of 30 Aug 2026 ([KuCoin News](https://www.kucoin.com/news/flash/vietnam-s-crypto-pilot-five-firms-pass-initial-review-no-licenses-issued-yet)), so the six-month clock has not started |
| [Decree 52/2024/NĐ-CP](https://www.rajahtannasia.com/wp-content/uploads/2024/09/2024_07_22-Decree-52-2024-ND-CP-NCP.pdf), intermediary services | Also bans "providing payment services despite not being a payment service provider, or providing [intermediary payment services] without a licence from the State Bank of Vietnam" | If escrow counts as an intermediary payment service, N.E.D would need a licence. Unclear, because these services are defined around Vietnamese dong |

**Correction (2 Oct 2026, later the same day):** an earlier version of this brief said the Law on Digital Technology Industry (Law 71/2025/QH15) bans crypto as a means of payment and that Decree 52/2024 has no crypto rule. Both were wrong. The law's text (Arts 46–48) defines digital, virtual and crypto assets but contains no payment ban; the ban comes from Decree 52/2024's prohibition on unlawful means of payment. Strategy v3's original citation (Decree 52/2024; Criminal Code Art. 206) was right.

**Questions for the reviewer:**

1. Does a contract that releases USDC to a freelancer after a client approves the work count as "using crypto as a means of payment for services"?
2. Does it change anything that the client is abroad and only the freelancer is in Vietnam?
3. If the smart contract holds the money and the team cannot move it, is N.E.D providing an intermediary payment service?
4. Would a version with no approval step, such as a time-locked transfer the freelancer can see, be treated differently?

## Question 2: Does the 0.1% tax cover transfers between self-held wallets?

**Our reading: probably not.** [Circular 32/2026](https://gvlawyers.com.vn/wp-content/uploads/2026/03/EN_Legal-alert-_Circular-32-2026_Taxation-of-transactions-in-crypto-assets.pdf), effective 27 Mar 2026 according to GV Lawyers (another source says 1 Jul 2026) [Unverified], taxes "individual investors ... conducting transfers of crypto assets through crypto asset service providers in Vietnam" at 0.1% of the full transaction value, gain or loss. A wallet-to-wallet transfer does not go through such a provider. [Việt Nam News](https://vietnamnews.vn/economy/1778511/0-1-tax-on-transfer-of-crypto-assets-mof-s-circular.html) reports the same wording.

What this means for the income statement:

- Do not sell it as "for the 0.1% tax".
- A freelancer's USDC is still income from services, which may need personal income tax [Inference]. The statement helps as proof of income for tax returns, visas, renting and loans.
- The statement must say it is a record, not tax advice.

**Questions for the reviewer:**

1. Is our reading right that Circular 32/2026 does not apply to wallet-to-wallet transfers?
2. How should a freelancer in Vietnam declare service income received in USDC: at what VND rate, and on which date?
3. Would a monthly statement in USD and VND, with links to on-chain receipts, be accepted as supporting evidence?

## Safe defaults until we get an answer

| USP | Decision for the final | How we say it on stage |
| --- | --- | --- |
| Income statement | Build and demo | "A clear record of the dollars you received, for your own tax return, visa or loan." Never "pays your tax" or "tax-compliant" |
| Check before you send | Build and demo | "See the facts about who you are sending to." Never "safe" or "scam-free" |
| Send to phone, claim later | Roadmap only | "Next, pending legal review" |
| Locked client payment (Milestone Lock) | **Superseded:** build and demo on devnet, VND-only path for Vietnam, partner simulated | "A foreign client locks USDC per milestone; a freelancer in Vietnam receives VND through a payout partner. Partner simulated in this demo." |

**Words we never use:** "pay" or "payment" for USDC, "invest", "safe", "scam-free", "tax-compliant". We say "send" or "transfer".

**If a judge asks "Is this legal?":** "In Vietnam, crypto is not a lawful means of payment under Decree 52/2024, so N.E.D doesn't do payments in Vietnam. Users send dollars between their own wallets on devnet today, and features that hold money wait for a licensed partner."

## Sources

Opened 2 Oct 2026 unless marked. These are law-firm and news summaries, not the official Vietnamese texts; a reviewer should check the originals.

- [Watson Farley & Williams: Landmark legislation regulates digital assets in Vietnam](https://www.wfw.com/articles/landmark-legislation-regulates-digital-assets-in-vietnam/)
- [Baker McKenzie: Resolution on pilot program for digital and crypto assets market](https://www.bakermckenzie.com/-/media/files/insight/publications/alerts/09/vietnam-new-resolution-on-pilot-program-for-digital-and-crypto-assets-marke.pdf)
- [Luật Việt An: legal basis for the ban on virtual currency as payment (20 Mar 2025)](https://luatvietan.vn/quy-dinh-phap-ly-co-ban-ve-tien-ao-tai-viet-nam.html)
- [Law 71/2025/QH15 on Digital Technology Industry, full text](https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Luat-Cong-nghiep-cong-nghe-so-2025-so-71-2025-QH15-621341.aspx)
- [Rajah & Tann: Decree 52/2024/NĐ-CP on non-cash payments](https://www.rajahtannasia.com/wp-content/uploads/2024/09/2024_07_22-Decree-52-2024-ND-CP-NCP.pdf)
- [KuCoin News, 30 Aug 2026: five firms pass initial review, no licences issued yet](https://www.kucoin.com/news/flash/vietnam-s-crypto-pilot-five-firms-pass-initial-review-no-licenses-issued-yet)
- [GV Lawyers: Circular 32/2026 on taxation of crypto asset transactions](https://gvlawyers.com.vn/wp-content/uploads/2026/03/EN_Legal-alert-_Circular-32-2026_Taxation-of-transactions-in-crypto-assets.pdf)
- [Việt Nam News: 0.1% tax on transfer of crypto assets](https://vietnamnews.vn/economy/1778511/0-1-tax-on-transfer-of-crypto-assets-mof-s-circular.html)
- [LuatVietnam: Resolution 05/2025/NQ-CP full text (English)](https://english.luatvietnam.vn/resolution-no-05-2025-nq-cp-dated-september-09-2025-of-the-government-on-piloting-the-crypto-asset-market-in-vietnam-410830-doc1.html) (not opened; for the reviewer)
