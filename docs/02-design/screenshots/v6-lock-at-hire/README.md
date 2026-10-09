# V6 · Lock at hire UI (D29, program v1.4) — 7 Oct 2026

Dev harness `/dev/hub` (VITE_DEV_TOOLS=1), fixture data; every third sample listing locks when hired. `d-` = 1440 px,
`m-` = 390 px. Reduced motion.

| File | What |
| --- | --- |
| `*-post-lock-when-hired` | Post a job, default "Lock when I hire": card preview "Locks when hired", bar text, "Publish" |
| `*-post-lock-now` | "Lock now": card "Locked", "Lock 30.00 USDC & publish" |
| `*-find-chips` | Find jobs: "Locked" and "Locks when hired" chips; locked total counts funded listings only |
| `*-vn-find-chips` | Vietnam view: same chips, ≈ VND, no USDC or SOL |
| `*-funded-only-sheet` / `*-funded-only-chip` | Filters sheet with "Funded only" on (`?funded=1`), then the removable chip |
| `*-detail-locks-when-hired` | Job detail: chip, "Locks when hired" card with the hint, Apply available |
| `*-select-sheet` / `*-select-sheet-low-balance` | Applicants → Select: "Select @x and lock X USDC", balance after, three bullets; balance too low shows the V5 error and turns the button off |
| `*-overview-stats` | Overview: CL hero copy, locked counts funded only, "+N jobs that lock when hired" |
