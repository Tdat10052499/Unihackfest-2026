# H5 QA results (7 Oct 2026, Chromium 1243, dev frame /dev/hub with fixture data + real /jobs/legal)

| Page | Tab stops | Focus ring missing | Contrast < 4.5:1 (text < 30 px) | scrollWidth at 390 px | Running animations (reduced motion) | Hidden without scroll timelines | Banned words |
| --- | --- | --- | --- | --- | --- | --- | --- |
| overview | 27 | 0 | 0 | 390 | 0 | 0 | 0 |
| overview-vn | 25 | 0 | 0 | 390 | 0 | 0 | 0 |
| find | 27 | 0 | 0 | 390 | 0 | 0 | 0 |
| find-vn | 25 | 0 | 0 | 390 | 0 | 0 | 0 |
| legal | 24 | 0 | 0 | 390 | 0 | 0 | 0 |
| detail | 9 | 0 | 0 | 390 | 0 | 0 | 0 |
| detail-client | 10 | 0 | 0 | 390 | 0 | 0 | 0 |
| applicants | 11 | 0 | 0 | 390 | 0 | 0 | 0 |
| post | 36 | 0 | 0 | 390 | 0 | 0 | 0 |

Escape and narrow-screen checks:

- Profile menu closes on Escape, focus back on the button: True
- Field popover closes on Escape, focus back on Field: True
- Filters sheet closes on Escape: True
- Applicants select sheet opens and closes on Escape: True
- 390 px: the notch is `static` (stacked under the card); the Filters sheet is 390 px wide; typing in the search bar writes `?q=logo`
- Reduced motion: the locked counter shows `337.00 USDC` at once; the How-it-works tab after 6.5 s is still tab 1

Notes:

- "Without scroll timelines" is simulated in Chromium by deleting the `@supports (animation-timeline: …)` rules, which is what Safari and Firefox skip. No Firefox or Safari build was available here.
- The contrast script skips text over background images and gradients (hero card, featured preview, glass card): white or near-white text on the dark dusk art.
- `#9A9AA6` stays only on two-tone headings of 30 px and more, as V2 allows.
