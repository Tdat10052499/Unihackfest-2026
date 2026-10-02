# N.E.D Wallet — context for AI assistants

Read in this order before analysing or changing anything:

1. `docs/07-strategy-v3/README.md`, then `docs/07-strategy-v3/strategy-v3.en.md`: the current proposed product direction ("Shared Money": Rotating Fund, Milestone Lock, Group Goal on one Solana program), the two candidate customer segments and the 6 Oct 2026 survey decision, market data, Vietnamese and Japanese legal constraints, revenue model and roadmap to 10 Oct 2026. Section 0 lists the key facts and the labels [Sourced] / [Inference] / [Assumption] / [Unverified].
2. `docs/05-legal/compliance-lead-tasks.md`: competition decisions confirmed with the organisers (English only, tracks, no Best AI Product prize) and wording rules for anything shown to judges.
3. `docs/README.md`: index of product direction, the 40 screen designs and the tech handoff.
4. `docs/tong-hop-tien-do.md`: what is already built and tested (Vietnamese).
5. `ned-wallet/AGENTS.md` and `ned-wallet/ARCHITECTURE.md` before touching app code; `ned_program/` for the Anchor program.

Earlier strategy documents (`docs/06-strategy-v2/`, `docs/05-vietnam-strategy-and-revenue-model.md`) are superseded but kept for their market and legal research.

Rules:

- Keep the source labels when you extend the strategy documents. Never present an assumption as a fact.
- Follow the terminology table in `docs/07-strategy-v3/strategy-v3.en.md` section 11.3 for product copy, pitch and docs.
- `docs/07-strategy-v3/unit_economics.py` holds every revenue assumption; change numbers there, not only in prose.
- Do not delete earlier documents; mark them superseded instead.
- Nothing here is legal advice. Legal points marked [Unverified] need a lawyer.
