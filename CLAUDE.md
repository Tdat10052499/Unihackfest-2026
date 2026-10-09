# N.E.D: No Empty Deals — context for AI assistants

Read in this order before analysing or changing anything:

1. `docs/09-milestone-lock/README.md`: the current product direction (2 Oct 2026) and decision log D1–D29. Then `build-order-6oct.md` (today's build order and prompts), then `build-plan.md` (current build order from 3 Oct: program v1.1, mobile wallet, web Workspace, landing) and `workspace-plan.md` (the Workspace is its own app `ned-workspace/`; shared code in `packages/ned-core`; `ned-wallet/` is mobile only), `product-spec.md` (flow, Vietnam path, screens, words, demo, brief and delivery content), `funded-jobs-plan.md` (D25: the job board, program v1.3), `delivery-review-updates.md` (D26), `review-decision-plan.md` (D27), `program-spec.md` (v1.3) before touching the program (byte layout, instructions, errors, tests), and `refactor-plan.md` for the PR details it still holds (what to hide or delete, screen lists).
2. `docs/08-research/ned-research-and-compliance.md`: research behind it (customer, market, competitors, payout partners, Vietnamese and international law, rubric, day plan). Labels [Verified] / [Inference] / [Assumption] / [Unverified].
3. `docs/05-legal/compliance-lead-tasks.md`: competition decisions confirmed with the organisers (pitch in Vietnamese only, product in English, both tracks, no Best AI Product prize) and the review rule for anything shown to judges.
4. `docs/progress-log.md`: what is already built and tested (Vietnamese).
5. `ned-wallet/AGENTS.md` and `ned-wallet/ARCHITECTURE.md` before touching app code; `ned_program/` for the Anchor program.

Superseded but kept for their research: `docs/07-strategy-v3/`, `docs/06-strategy-v2/`, `docs/08-research/evaluation-and-plan.md`.

`docs/archive/` holds the N.E.D Wallet documents (25 Sep – 1 Oct 2026: Swap, xStocks, Earn, wallet mode, the v1 design canvas). They are history only: never follow them and never bring those features back. Their code was removed on 9 Oct 2026; see `docs/archive/README.md`.

Rules:

- Git (PO decision, 7 Oct 2026): commit and push straight to `main`. Do not create branches or pull requests. Pull before you start (`git pull --ff-only origin main`), make small conventional commits, and run the tests before each push. Never force-push `main`.
- If two documents disagree, `docs/09-milestone-lock/` wins on product and program design, and `docs/08-research/ned-research-and-compliance.md` wins on research facts. Fix the losing document instead of following it.
- Keep the source labels when you extend these documents. Never present an assumption as a fact.
- Follow the word table in `docs/09-milestone-lock/product-spec.md` section 6 for product copy, pitch and docs. Never call USDC a "payment".
- `docs/09-milestone-lock/unit_economics.py` holds every revenue assumption; change numbers there, not only in prose.
- The freelancer in Vietnam never holds or receives USDC. N.E.D holds no funds, converts nothing and charges no fee in v1.
- Do not delete earlier documents; mark them superseded instead, or move them to `docs/archive/` and fix the links.
- Write everything in this repository in English: code, comments, logs, file and folder names, and new documents (PO decision, 9 Oct 2026). The Vietnamese documents still in `docs/` are translated after the final; the spoken pitch on 10 Oct stays in Vietnamese, as the organisers require. Test data may keep Vietnamese text on purpose (accents, multi-byte UTF-8).
- Nothing here is legal advice. Legal points marked [Unverified] or [Inference] need a lawyer.
