# Archive: documents from the N.E.D Wallet period (25 Sep – 1 Oct 2026)

This folder keeps the documents of **N.E.D Wallet**, the project's first direction: a Solana wallet with Swap, xStocks, Earn, two wallet modes (Simple / Crypto), an AI assistant and a dApp browser. **History only: do not follow these documents and do not bring those features back.**

- **2 Oct 2026:** the project moved to **N.E.D: No Empty Deals** (Milestone Lock for freelancers with clients abroad). Current product and decision log D1–D30: [`../09-milestone-lock/`](../09-milestone-lock/README.md). Swap and xStocks were hidden behind `FEATURES` flags from 4 Oct (item C7 in the decision log).
- **9 Oct 2026:** the remaining N.E.D Wallet code was removed from `ned-wallet/` (Swap, xStocks, Jupiter, wallet mode, unused modules and images, old translation strings), and the documents below were moved here with `git mv` (history kept). Each one has an "archive" line under its title. The same day the Vietnamese file and folder names were changed to English (`01-product-direction.md`, `02-design-v1/`, `design-status.md`, `03-engineering/`, `04-code-plan.md`; the current design folder became `docs/02-design/`); the "Old path" column keeps the original names.

The documents themselves stay in their original language (mostly Vietnamese); they are history and are not translated.

## Contents

| Document | Old path | Contents |
| --- | --- | --- |
| [`01-product-direction.md`](01-product-direction.md) | `docs/01-dinh-huong-du-an.md` | Original direction (25 Sep): mentor feedback, priorities Swap → xStocks → two wallet modes → AI, 15-day roadmap, task split |
| [`02-design-v1/README.md`](02-design-v1/README.md) | `docs/02-thiet-ke/README.md` | The 40-screen catalogue of canvas v85, navigation flow, design tokens from the dark-theme period |
| [`02-design-v1/design-status.md`](02-design-v1/design-status.md) | `docs/02-thiet-ke/trang-thai-thiet-ke.md` | Design status (26 Sep, v85) and the design decisions fixed at the time |
| [`02-design-v1/ui-pdf-alignment.md`](02-design-v1/ui-pdf-alignment.md) | `docs/02-thiet-ke/ui-pdf-alignment.md` | Home, Swap and xStocks checked against the PDF (28 Sep) |
| [`02-design-v1/ned-wallet-ui.pdf`](02-design-v1/ned-wallet-ui.pdf) | `docs/02-thiet-ke/ned-wallet-ui.pdf` | The N.E.D Wallet UI PDF |
| [`02-design-v1/canvas/`](02-design-v1/canvas/) | `docs/02-thiet-ke/canvas/` | 42 v1 `.dc.html` boards (Swap, xStocks, Earn, TED bot, Home, wallet mode) |
| [`03-engineering/dev-handoff.md`](03-engineering/dev-handoff.md) | `docs/03-ky-thuat/dev-handoff.md` | Engineering handoff: Jupiter API, data sources per screen, AI architecture, on-chain identity (section 1a) |
| [`04-code-plan.md`](04-code-plan.md) | `docs/04-ke-hoach-code.md` | Phased code plan (27 Sep → 10 Oct), including "Update after Phase 0" (the phone number scrypt parameters) |
| [`05-vietnam-strategy-and-revenue-model.md`](05-vietnam-strategy-and-revenue-model.md) | `docs/05-vietnam-strategy-and-revenue-model.md` | Proposal v1 on the Vietnam direction and revenue model (superseded by v2, then v3); its legal part is still referenced by 06 and 07 |
| [`poc-dynamic.md`](poc-dynamic.md) | `docs/poc-dynamic.md` | Dynamic sign-in PoC (T0.4, GO/NO-GO gate) |
| [`cleanup-report-t0-5.md`](cleanup-report-t0-5.md) | `docs/cleanup-report-t0-5.md` | T0.5 cleanup report (26 Sep): Supabase, `ned-hub` and the relayer removed |
| [`ned-wallet-process-log.md`](ned-wallet-process-log.md) | `ned-wallet/docs/Process.md` | Progress log of the app in the N.E.D Wallet period (from Privy, Supabase and the MiniPay-style UI onwards) |
| [`strategy-v2.vi.md`](strategy-v2.vi.md) | `docs/06-strategy-v2/strategy-v2.vi.md` | Vietnamese version of proposal v2; the English version stays at `../06-strategy-v2/strategy-v2.en.md` (moved here 9 Oct 2026) |
| [`legal-brief.vi.md`](legal-brief.vi.md) | `docs/08-research/legal-brief.vi.md` | Vietnamese version of the legal brief; the English version stays at `../08-research/legal-brief.md` (moved here 9 Oct 2026) |

## What from that period still holds

- **Teddy the mascot:** the images `ned-wallet/assets/images/mascot teddy - *.png` (used through `constants/mascot.ts`) and `../02-design/assets/mascot/`; brief in [`../02-design/mascot-brief.md`](../02-design/mascot-brief.md).
- **On-chain identity:** `NameRecord`, `ReverseRecord`, `PhoneRecord` in `ned_program` (originally described in `03-engineering/dev-handoff.md` section 1a; scrypt parameters in `04-code-plan.md`). Current use: [`../../ned-wallet/ARCHITECTURE.md`](../../ned-wallet/ARCHITECTURE.md).
- **Dynamic sign-in:** Google and the embedded Solana wallet (MPC), first checked in `poc-dynamic.md`; the no-backend architecture comes from `cleanup-report-t0-5.md`.

Everything else (Swap as P0, Jupiter prices, the 0.25% fee, xStocks, Earn, wallet mode, AI, dApp browser) has been superseded and removed from the code.

## Deliberately not archived here

- [`../06-strategy-v2/`](../06-strategy-v2/README.md) and [`../07-strategy-v3/`](../07-strategy-v3/README.md): proposals v2 and v3, superseded but kept in place for their market and legal data.
- [`../08-research/evaluation-and-plan.md`](../08-research/evaluation-and-plan.md): superseded, but kept next to the current research.
- The current design stays in [`../02-design/`](../02-design/README.md) (`canvas-v2/`, screenshots, demo, test, mascot).
