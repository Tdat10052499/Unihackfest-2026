# Hub v4 QA (H5)

**Date:** 7 Oct 2026 · **Code:** main after H1–H5 (prompts-hub-v4.md) · **Browser:** Chromium 1243 (headless), driven by puppeteer
**Pages:** /jobs (Overview), /jobs/find, /jobs/legal, /jobs/:job, /jobs/new, /jobs/:job/applicants. All but Legal were checked through the dev-only frame `/dev/hub` (VITE_DEV_TOOLS=1), which renders the real page views with fixture listings, because the preview needs a Google sign-in.

## Checklist

| Check | Result |
| --- | --- |
| Keyboard only: every control reachable, visible focus ring (2 px #7B2FBE, offset 3) | Pass: every Tab stop shows the ring, or the input's purple halo |
| Popovers, sheet and menu close with Escape | Pass: profile menu, Field popover, Filters sheet, Applicants select sheet; focus returns |
| 390 px: no horizontal scroll | Pass on every page |
| 390 px: the notch stacks, the search bar stays usable, the sheet is full width | Pass (search bar is not sticky under 860 px, by design) |
| prefers-reduced-motion: no animation, counters at final values, tabs do not auto-advance | Pass |
| Safari / Firefox: everything visible without scroll timelines | Pass when simulated in Chromium (no Firefox or Safari here) |
| Contrast: text ≥ 4.5:1; #9A9AA6 only at ≥ 30 px | Pass after the fix below |
| Wording: no "payment", "pay", "escrow", "safe", "guaranteed", "licensed partner" | Pass, except the Terms line flagged in H4 (waiting for the PO / CL) |

## Fixed in H5

- `--hub-subtle` (captions and labels) changed from #8A8A96 (3.4:1 on white) to #6E6E7A (4.5:1 on white and on #F5F5F7). V1 in prompts-hub-v4.md is updated to match.
- The Legal table-of-contents numbers, the section numbers, and the 22 px "yet" on Find jobs no longer use #9A9AA6.
- Job detail at 390 px: each milestone amount now wraps under the milestone name instead of overlapping it.

## Results per page

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

## Screenshots

- `docs/02-design/screenshots/h1-hub-v4/`: 1-header-top.png, 2-header-scrolled.png, 3-profile-menu.png, 4-header-guest.png, 5-header-vn.png, 6-footer-cta-client.png, 7-footer-vn.png, 8-mobile-header.png, 9-mobile-footer.png
- `docs/02-design/screenshots/h2-overview-v4/`: desktop-client.png, desktop-guest.png, desktop-vn.png, mobile-client.png, mobile-guest.png, mobile-vn.png, overview-scroll.gif, state-empty.png, state-error.png, state-loading.png
- `docs/02-design/screenshots/h3-find-v4/`: d-client-budget.png, d-client-chips.png, d-client-field.png, d-client-grid.png, d-client-list.png, d-client-sheet.png, d-client-tab-applied.png, d-client-tab-listings.png, d-guest-tab-applied.png, d-nomatch.png, d-sticky.png, d-vn-budget.png, d-vn-chips.png, d-vn-field.png, d-vn-grid.png, d-vn-list.png, d-vn-sheet.png, d-vn-tab-applied.png, m-client-budget.png, m-client-chips.png, m-client-field.png, m-client-grid.png, m-client-list.png, m-client-sheet.png, m-client-tab-applied.png, m-client-tab-listings.png, m-guest-tab-applied.png, m-nomatch.png, m-vn-budget.png, m-vn-chips.png, m-vn-field.png, m-vn-grid.png, m-vn-list.png, m-vn-sheet.png, m-vn-tab-applied.png
- `docs/02-design/screenshots/h4-legal/`: d-anchor-privacy-4.png, d-disclosures.png, d-privacy.png, d-rules.png, d-spy-scrolled.png, d-terms.png, m-disclosures.png, m-privacy.png, m-rules.png, m-terms.png
- `docs/02-design/screenshots/h5-qa/`: applicants-1440.png, applicants-390.png, detail-1440.png, detail-390.png, detail-client-1440.png, post-1440.png, post-390.png

## Left open

- Real Firefox and Safari runs (only simulated here).
- The Find jobs search bar is not sticky under 860 px, because the header wraps taller there.
- Terms line "It is not a payment service, a bank or an exchange" (CL to decide; the board suggests "not a bank, an exchange or a money-transfer service").
- "[team email]" placeholder in Legal and the Job posting rules (PO to give the address).
