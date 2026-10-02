# N.E.D Wallet — context for AI assistants

Read in this order before analysing or changing anything:

1. `docs/09-milestone-lock/README.md`: the current product direction (2 Oct 2026) and decision log D1–D12. Then `product-spec.md` (flow, Vietnam path, screens, words, demo), `program-spec.md` before touching the program (byte layout, instructions, errors, tests), and `refactor-plan.md` before changing app or program structure (PR order, what to hide or delete).
2. `docs/08-research/ned-research-and-compliance.md`: research behind it (customer, market, competitors, payout partners, Vietnamese and international law, rubric, day plan). Labels [Verified] / [Inference] / [Assumption] / [Unverified].
3. `docs/05-legal/compliance-lead-tasks.md`: competition decisions confirmed with the organisers (English only, both tracks, no Best AI Product prize) and the review rule for anything shown to judges.
4. `docs/tong-hop-tien-do.md`: what is already built and tested (Vietnamese).
5. `ned-wallet/AGENTS.md` and `ned-wallet/ARCHITECTURE.md` before touching app code; `ned_program/` for the Anchor program.

Superseded but kept for their research: `docs/07-strategy-v3/`, `docs/06-strategy-v2/`, `docs/05-vietnam-strategy-and-revenue-model.md`, `docs/08-research/evaluation-and-plan.md`. The product direction in `docs/01-dinh-huong-du-an.md`, `docs/03-ky-thuat/dev-handoff.md` and `docs/04-ke-hoach-code.md` (Swap first) is also superseded.

Rules:

- If two documents disagree, `docs/09-milestone-lock/` wins on product and program design, and `docs/08-research/ned-research-and-compliance.md` wins on research facts. Fix the losing document instead of following it.
- Keep the source labels when you extend these documents. Never present an assumption as a fact.
- Follow the word table in `docs/09-milestone-lock/product-spec.md` section 6 for product copy, pitch and docs. Never call USDC a "payment".
- `docs/09-milestone-lock/unit_economics.py` holds every revenue assumption; change numbers there, not only in prose.
- The freelancer in Vietnam never holds or receives USDC. N.E.D holds no funds, converts nothing and charges no fee in v1.
- Do not delete earlier documents; mark them superseded instead.
- Nothing here is legal advice. Legal points marked [Unverified] or [Inference] need a lawyer.
