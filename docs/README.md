# N.E.D: No Empty Deals documentation

This folder is the team's shared source of truth (and that of each member's AI coding assistant) for building N.E.D for UniHackfest 2026 (final pitch on **10 Oct 2026**). The read order for AI assistants is in the root `CLAUDE.md`.

| What to read | When |
|---|---|
| [`09-milestone-lock/`](09-milestone-lock/README.md) | **Current direction; read before coding (since 2 Oct 2026):** Milestone Lock for freelancers with clients abroad; in Vietnam the freelancer receives only VND through a payout partner (simulated in the demo). Product spec, program spec, build plans, decision log D1–D30 |
| [`progress-log.md`](progress-log.md) | What has been built and tested, day by day (Vietnamese; translation planned after the final) |
| [`08-research/`](08-research/README.md) | The Compliance Lead's research: customers, market, competitors, payout partners, law, rubric. Start with `ned-research-and-compliance.md` |
| [`05-legal/compliance-lead-tasks.md`](05-legal/compliance-lead-tasks.md) | The Compliance Lead's tasks, decisions confirmed with the organisers, the review rule for anything shown to judges |
| [`02-design/`](02-design/README.md) | Current design: `canvas-v2/` boards, screenshots, demo, tests, Teddy the mascot |
| [`07-strategy-v3/`](07-strategy-v3/README.md), [`06-strategy-v2/`](06-strategy-v2/README.md) | Proposals v3 (2 Oct) and v2 (1 Oct), **superseded by `09-milestone-lock/`**; kept for their market and legal data |
| [`archive/`](archive/README.md) | Documents from the N.E.D Wallet period (25 Sep – 1 Oct 2026: Swap, xStocks, Earn, wallet mode). History only; do not follow them |

## Rules

1. **Never re-propose** a mini-app platform, Perps, Prediction Market or Gacha (ruled out by the mentors), and **never bring back** Swap, xStocks, Earn, the dApp browser or the wallet mode (Simple / Crypto); their code was removed on 9 Oct 2026.
2. When two documents disagree, `09-milestone-lock/` wins on product and program design, and `08-research/ned-research-and-compliance.md` wins on research facts. Fix the losing document instead of following it.
3. Product copy, pitch and docs follow the word table in [`09-milestone-lock/product-spec.md` section 6](09-milestone-lock/product-spec.md#6-words). Never call USDC a "payment".
4. N.E.D holds no funds, converts nothing and **charges no fee in v1** (decision D2). The freelancer in Vietnam never holds or receives USDC.
5. Everything in the repository is written in English (9 Oct 2026); the Vietnamese documents that remain are translated after the final.

## Updating the documentation

- Export new design boards to `02-design/canvas-v2/` and update `canvas-v2/README.md`.
- A new product decision → add a row to the decision log in `09-milestone-lock/README.md` (with the date and who decided).
- Never delete earlier documents: mark them superseded, or move them to `archive/` and fix the links.

## Compliance

- **N.E.D Compliance Hub** (team only, Google Doc): https://docs.google.com/document/d/1JQbL5JY5La6Rzev-gaFV1VUUxMW1AmLJQZgTGjqnErA/edit
- Owner: Nguyễn Minh Chính, Compliance Lead. Send any user-facing text (slides, app copy, README, demo video) for review before it is shown to judges.
