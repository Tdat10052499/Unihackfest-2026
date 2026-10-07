# Community hub v4: Claude Code prompts to update the N.E.D Jobs UI (H1–H5)

**Owner:** PO (Hồ Du Tuấn Đạt) · **Written:** 7 Oct 2026 · **Design:** canvas version 113, exported to [`../02-thiet-ke/canvas-v2/`](../02-thiet-ke/canvas-v2/README.md)

## What changed in v4

| Area | Change |
| --- | --- |
| **Landing (Overview)** | Redesigned after "Xurya – Manufacture Landing Page" (Dipa UI/UX, Dribbble) |
| **Find jobs** | New way to search and filter |
| **Legal page** | New; reached from the footer only |
| **Header, footer, palette** | Shared by every hub page |
| **Motion** | Scroll effects and interactions |

**Boards to read:**

- `WebJobs.dc.html` (Overview)
- `WebJobsFind.dc.html` (Find jobs)
- `WebJobsLegal.dc.html` (Legal)
- `WebJobDetail.dc.html`, `WebJobPost.dc.html`, `WebJobApplicants.dc.html` (restyled)

The written spec is **appendix V** of this file.

**How to run:**

- One new Claude Code session per prompt, in order H1 → H5.
- Every prompt follows section 0 of [`prompts-6oct.md`](prompts-6oct.md) (no secrets, English UI, the word table, tests, a progress row in `docs/tong-hop-tien-do.md`), including the git rule changed on 7 Oct: **work and push directly on `main`**, no branches and no pull requests. Pull before each step; run the tests before each push; never force-push.
- **Starting point (main at `bb69e02`):** S5 and S6 are built (`ned-workspace/src/jobs/`: `JobsLayout`, `ProfileMenu`, `hub.module.css`, `components/`, `pages/`, `__tests__/`), S9 added `LegalLinks` in the Workspace, S11 added the legal text in `ned-wallet/services/legalCopy.ts` and the `/terms`, `/privacy`, `/disclosures` screens. H1–H5 **restyle and extend** that code; they do not rebuild it.

**Not changing:**

- Program, `@ned/core` jobs logic, hooks in `src/jobs/hooks.ts`, data sources, routes, URL filters, D25–D28.
- Purple is for on-chain actions; near-black is for browsing.
- Every number on a hub page is read from Solana.
- "No borders on surfaces" (section 0 rule 5) still holds: v4 rings and hairlines are inset box-shadows or 1px grid gaps, never `border`.

---

## H1 · Hub foundation v4: tokens, header, footer, motion, shared components

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main: git switch main && git pull --ff-only origin main).
Read: docs/09-milestone-lock/prompts-hub-v4.md (run notes and appendix V1–V4, V7, V9), README.md D28, the boards
docs/02-thiet-ke/canvas-v2/{WebJobs,WebJobsFind,WebJobsLegal}.dc.html (the helmet <style> is the exact CSS of the
effects), and the code already built in S5/S6: ned-workspace/src/jobs/{JobsLayout.tsx,ProfileMenu.tsx,hub.module.css,
components/*,__tests__/*}, ned-workspace/src/{motion.ts,styles/*,components/LegalLinks.tsx}.
Task: replace the hub's visual foundation; page content changes come in H2–H5.
1. Tokens (V1–V2) in src/jobs/hub.module.css: replace the v3 lavender/peach palette with the v4 colours, type scale
   (Inter 300/400/500/600/700; Space Grotesk 700 for the logo only; Space Mono 700 for amounts), radii, shadows, content
   width 1240 px. Add Inter 300 to the self-hosted fonts (compliance P4); no Google Fonts request.
2. Motion (V3): src/jobs/motion.css with the scroll-driven classes inside @supports (animation-timeline: view()), the
   entry, pop, sheet, float, fill and hover classes; all off under prefers-reduced-motion. Content stays fully visible
   where scroll timelines are unsupported. Add the curves to src/motion.ts if missing. Hooks in src/jobs/hooks.ts or a
   new src/jobs/motion.ts: useCountUp(target, 1400 ms, easeOutCubic; target at once under reduced motion),
   useAutoAdvance(count, 6000 ms, paused), useScrollSpy(ids, offset 170).
3. JobsLayout header (V4): white, sticky, shrinking on scroll; tabs Overview and Find jobs ONLY (Legal never in the
   navbar); Devnet chip; "Post a job" purple pill (signed in, not the Vietnam view); signed out a dark "Sign in" pill to
   /sign-in?next=… as today. ProfileMenu keeps its behaviour and keyboard handling; restyle only.
4. Footer (V9): dark #0E0E12; links Overview · Find jobs · Post a job · Workspace · Legal; "Student project ·
   UniHackFest 2026"; the disclaimer line per view; Terms of use · Privacy · Disclosures. Until H4 lands, these legal
   links keep using LEGAL_LINKS (/wallet/…); H4 points them at /jobs/legal. Optional CTA band prop (Overview only).
5. Components in src/jobs/components/: restyle HubButton as the v4 pill (variants purple = on-chain, dark = browse,
   white, ghost), Chip (removable variant), JobCard (V6.5 card) and add JobRow, SectionHeading → two-tone (ink + grey,
   weight 300). Add Reveal, Popover (anchored; outside click and Escape close; focus returns), Sheet (right, 440 px,
   backdrop, focus trap, Escape), Switch (46×28), Segmented, StatCounter. Export them from components/index.ts.
   StepsBand and CategoryTile stay until H2 replaces their use; delete them in H2 only if nothing imports them.
Tests: update src/jobs/__tests__ for changed markup and copy (do not delete a test to make it pass); new tests: Popover
and Sheet close on Escape and outside click; useCountUp returns the target under reduced motion; JobCard shows ≈ VND in
the Vietnam view.
Done when: typecheck, lint, tests and build pass; screenshots of the header at the top and after scrolling, the profile
menu, the footer; progress row added; pushed to main.
```

## H2 · Overview landing v4 (`/jobs`)

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main).
Read: prompts-hub-v4.md appendix V5 (every subsection) and V9, the board docs/02-thiet-ke/canvas-v2/WebJobs.dc.html
(inline styles are the exact values; renderVals() holds the copy per view: guest, Vietnam view, client), the H1
components, and the current ned-workspace/src/jobs/{pages/Overview.tsx,pages/Overview.module.css,overview.ts,hooks.ts}.
Task: rebuild pages/Overview.tsx top to bottom as V5, keeping the data from overview.ts/hooks.ts:
1. Hero card (V5.1): the dusk SVG with the three parallax hill layers, the text gradient, eyebrow, light headline and
   sub-line per view, the glass search pill (submits to /jobs/find?q=… as today), the two text links, the floating
   glass card with the newest open listing, and the notch with three StatCounters (two concave corners). Under 860 px
   the notch stacks under the card and the glass card hides.
2. "Funded first, so both sides can start with trust" and the eight category circles (V5.2) → /jobs/find?cat=…
3. The six-rule hairline grid (V5.3).
4. Featured split (V5.4): four numbered cards; hover or focus updates the large preview (title, business, milestone plan
   "Due N days after selection", budget, Apply).
5. "See how a job runs, step by step" (V5.5): five tabs, useAutoAdvance 6 s, pause on hover/focus, restart on click,
   .hb-fill progress, exact copy per step.
6. Footer with the CTA band (V9).
Data: as today (open listings, sum of totals, open count, sum of application_count, counts per category, newest four with
their milestone plans). Skeletons while loading; the error line with Retry. Works signed out. Remove v3-only pieces
(steps band, lavender hero) that no page uses any more.
Done when: typecheck, lint, tests and build pass (overview.test.tsx updated); screenshots desktop and 390 px for guest,
Vietnam view and client; a short screen recording or GIF of the scroll effects in Chrome; progress row; pushed.
```

## H3 · Find jobs v4 (`/jobs/find`)

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main).
Read: prompts-hub-v4.md appendix V6, funded-jobs-plan.md section 6.1, the board
docs/02-thiet-ke/canvas-v2/WebJobsFind.dc.html, packages/ned-core/src/jobs/ (search, filtersToQuery/filtersFromQuery),
the H1 components, and the current ned-workspace/src/jobs/{pages/Find.tsx,pages/Find.module.css,find.ts}.
Task: replace the v3 filter bar and grid in pages/Find.tsx with the v4 search model (V6); filter logic stays in
@ned/core and find.ts:
1. Title row: "Find jobs, already funded" (two-tone) and "N open jobs · X locked on Solana"; underline tabs Open jobs ·
   My applications · My listings with count badges (visibility rules as today: "My" tabs need sign-in, no My listings in
   the Vietnam view).
2. Sticky segmented search bar (top 78 px): What · Field (Popover, 2 columns, live counts) · Budget (Popover, radio list,
   VND ranges in the Vietnam view) · round purple search button. One popover at a time; bar and active segment states
   as V6.2.
3. Toolbar: Filters button with count badge; removable chips for every active filter and Clear all; result count, Sort
   (Newest / Apply by soonest / Highest budget), Grid/List Segmented, Share (copies the URL; "Copied" in green).
4. Filters Sheet (V6.4): Skills, Time to deliver, Milestones, the two Switch rows, "Clear these" and "Show N jobs".
5. Results: JobCard grid (minmax 320 px) or JobRow list; 9 at a time with "Show all N jobs"; the empty state "No open
   jobs match, yet" with "Clear all filters".
6. My applications / My listings rows (V6.6), same statuses and actions as today.
7. URL holds q, cat, budget, skills, dur, ms, soon, hide, sort, view and tab; add view and tab to filtersToQuery /
   filtersFromQuery with tests in @ned/core. Reload or a shared URL restores the view; nothing is stored.
Done when: typecheck, lint, tests and build pass (find.test.tsx and the ned-core jobs tests updated); screenshots desktop
and 390 px of each popover, the sheet, chips, list view, each tab, both views; a filtered URL reopens the same results;
progress row; pushed.
```

## H4 · Legal page (`/jobs/legal`), one source for the legal text

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main).
Read: prompts-hub-v4.md appendix V8, the board docs/02-thiet-ke/canvas-v2/WebJobsLegal.dc.html, the shipped text in
ned-wallet/services/legalCopy.ts (+ its test), ned-wallet/app/{terms,privacy,disclosures}.tsx,
ned-workspace/src/components/LegalLinks.tsx, compliance-fix-list.md appendices 1–2 and P3.
Task:
1. One source: move the legal text from ned-wallet/services/legalCopy.ts to packages/ned-core/src/legal/ and export it
   from @ned/core (LegalSection, TERMS, PRIVACY, the disclosures, disputeDisclosure, GUIDE, headings). Keep
   ned-wallet/services/legalCopy.ts as a re-export so the mobile screens and their tests do not change. The SHIPPED text
   wins over the board's DOCS text; the board gives the layout. Add what the shipped text lacks: the Disclosures document
   (from app/disclosures.tsx and disputeDisclosure) and "Job posting rules" (from the board). Do not reword shipped text.
2. Flag, do not fix alone: the shipped Terms say "It is not a payment service, a bank or an exchange", and section 0 bans
   "payment". Put the line in the report for the CL with the board's alternative "not a bank, an exchange or a
   money-transfer service"; change it only if the PO confirms in the session.
3. /jobs/legal inside JobsLayout (V8): reading bar, heading, intro, draft notice, four document cards, sticky "On this
   page" with useScrollSpy, the article with numbered sections and the "Next: … Read it" card. ?doc=terms|privacy|
   disclosures|rules selects the document; anchors #lg-<doc>-<n> work on load. Declare the route before /jobs/:job.
4. Legal is NOT in the navbar. Point the hub footer links (Legal, Terms of use, Privacy, Disclosures) at /jobs/legal?doc=…
   Keep LEGAL_LINKS for the Workspace pages as /wallet/… unless the PO asks to switch them; the mobile screens stay.
5. Keep "[team email]" as a visible placeholder and list it in the report for the PO.
Done when: typecheck, lint, tests and build pass for ned-core, ned-wallet and ned-workspace; each document opens by URL;
the table of contents follows the scroll; screenshots desktop and 390 px; progress row; pushed.
```

## H5 · Restyle detail, post and applicants; QA

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main).
Read: prompts-hub-v4.md appendix V1–V4 and V10, the boards docs/02-thiet-ke/canvas-v2/{WebJobDetail,WebJobPost,
WebJobApplicants}.dc.html, and ned-workspace/src/jobs/pages/{JobDetail.tsx,Job.module.css,PostJob.tsx,Applicants.tsx}.
Task:
1. /jobs/:job, /jobs/new and /jobs/:job/applicants: v4 header and footer, page background #F5F5F7, v4 pills, the dark
   back pill, Reveal on cards. Behaviour, transactions and copy from S6 stay.
2. QA across all hub pages:
   - keyboard only: every control reachable, visible focus ring (2 px #7B2FBE, offset 3); popovers, sheet and menu close
     with Escape;
   - 390 px: no horizontal scroll, the notch stacks, the search bar stays usable, the sheet is full width;
   - prefers-reduced-motion: no animation, counters at final values, tabs do not auto-advance;
   - Safari or Firefox: everything visible without scroll timelines;
   - contrast: text ≥ 4.5:1 (grey #9A9AA6 only for display sizes ≥ 30 px);
   - wording sweep: no "payment", "pay" (for USDC), "escrow", "safe", "guaranteed", "licensed partner" (except the Terms
     line flagged in H4 if the PO has not decided).
3. Fix what fails in small commits; list anything left in the progress row.
4. Write the QA checklist with results and the screenshot list in docs/09-milestone-lock/hub-v4-qa.md; push to main.
Done when: typecheck, lint, tests and build pass; hub-v4-qa.md is on main; screenshots of the three restyled pages.
```

---

## Appendix V · Community hub v4 spec

The boards are the source of truth; this is their written form. Where they differ, the board's inline values win.

### V1 Colours

| Token | Value | Use |
| --- | --- | --- |
| ink | `#16161C` | Text, dark buttons, dark segmented thumb |
| ink-2 | `#3F3F49` | Body on white |
| muted | `#6B6B76` | Secondary text, inactive tabs |
| subtle | `#8A8A96` | Captions, labels |
| tone-2 | `#9A9AA6` | Second part of two-tone headings (display sizes only) |
| line | `#ECECF0` | Hairlines, grid gaps, inset card outline (`inset 0 0 0 1px`) |
| soft | `#F5F5F7` | Grey sections, chips, inputs, page background of detail/post/applicants |
| purple | `#7B2FBE` | On-chain actions, active underline, progress, switches on |
| purple-ink / tint | `#6A22B0` / `#F2EAFB` | Links, icon tiles, removable chips |
| night | `#0E0E12` | Footer and CTA band; inner hairline `#24242C`; text `#D7D7DE`, `#A9A9B4`, `#8F8F9B` |
| success chip | `#E7F6EC` / `#127A3A` | "Budget locked", "Locked" |
| devnet chip | `#F5F5F7` / `#8A5300`, dot `#F59E0B` | Header |
| draft notice | `#FFF5E1` / `#6B4300`, icon `#B26B00` | Legal |

Category ink / tile colours are unchanged from appendix H.1 of `prompts-6oct.md` (the S5 values in `hub.module.css`).

### V2 Type, shape, layout

**Type**

| Use | Values |
| --- | --- |
| Display headings | Inter **300**, letter-spacing −1.2 to −2.6px |
| Hero | `clamp(44px, 6vw, 76px)` / 1.02 |
| Section | `clamp(30px, 3.4vw, 44px)` / 1.12 |
| Find jobs title | `clamp(34px, 4.4vw, 54px)` |
| Legal title | `clamp(38px, 5vw, 64px)` |
| Stats | `clamp(30px, 3.4vw, 44px)`, Inter 300 |
| Card titles | 15–18px, 600 |
| Body | 14–16px, line-height 1.6–1.75 |
| Amounts | Space Mono 700 |

**Shape**

- **Radii:** hero card 32; showcase and Legal doc cards 20–28; cards 18–22; popovers 24–26; pill buttons, chips and the search bar 9999.
- **Shadows:**
  - card lift on hover: `0 2px 4px rgba(17,17,22,.05), 0 22px 40px -20px rgba(17,17,22,.28)` with `translateY(-4px)`;
  - popovers: `0 2px 6px rgba(17,17,22,.06), 0 30px 60px -26px rgba(17,17,22,.35)`;
  - search bar: `0 1px 2px rgba(17,17,22,.05), 0 14px 34px -18px rgba(17,17,22,.3)`.

**Layout**

- Content max 1240px, gutter 24px.
- Section spacing: 112px between landing sections; the grey rules band has 96px padding.

### V3 Motion

**Load and interaction**

| Class or effect | Value |
| --- | --- |
| Page fade | 240ms `cubic-bezier(.2,0,0,1)` |
| `.hb-in` … `.hb-in-4` | Rise 16px, 520ms `cubic-bezier(.16,1,.3,1)`, delays 0 / 90 / 180 / 270ms |
| `.hb-pop` | 200ms from `translateY(-6px) scale(.97)` |
| `.hb-sheet` | 360ms slide from the right |
| `.hb-float` | 8px float, 7s ease-in-out loop |
| `.hb-fill` | Tab progress `scaleX` 0→1 over 6s linear; paused while the showcase is hovered |
| `.hb-ul` | Underline grows on hover, 260ms |
| `.hb-arrow` | Nudges 2px up-right on hover |
| Press | `scale(.98)` |

**Scroll-driven** (inside `@supports (animation-timeline: view())`)

| Class | Timeline and range | Effect |
| --- | --- | --- |
| `.rv` | `view()`, `entry 0% cover 26%` | From `opacity 0, translateY(36px)` |
| `.rv-x` | `entry 0% cover 30%` | From `translateX(-28px)` |
| `.rv-scale` | `entry 0% cover 34%` | From `opacity .4, scale(.94)` |
| `.hb-hdr` | `scroll(root)`, 0–140px | Gains `0 1px 0 #ECECF0, 0 12px 30px -20px rgba(17,17,22,.3)` and a white 86% background |
| `.hb-hdr-in` | Same | Padding 18px → 10px |
| `.px-sky` | `scroll(root)`, 0–800px | −18px and scale 1.04 |
| `.px-1` / `.px-2` / `.px-3` | Same | +26 / +54 / +90px |
| `.hb-progress` | `scroll(root)` | `scaleX` 0→1 (Legal reading bar) |

**JS effects**

- Counters: easeOutCubic over 1.4s on load.
- How-it-works tabs: advance every 6s.
- Legal: scroll spy at 170px from the top.

**Reduced motion:** everything off; counters at final values; no auto-advance.

### V4 Header

- **Frame:** sticky, white; inner max 1240px, padding 18px (10px after scrolling).
- **Left:** logo, a 34px dark tile "N.E.D" plus "Jobs" (Space Grotesk 17/700). Tabs **Overview · Find jobs** (14px; active: ink 600 with a 2px purple underline; inactive `#6B6B76` 500). **Legal is not in the navbar.**
- **Right:** Devnet chip; then "Post a job" (purple pill 42px with arrow, client only); then "Sign in" (dark pill, signed out) or the profile button (`#F5F5F7` pill, avatar, @handle, view line).
- **Profile menu:** 290px, radius 18, items Open wallet and Go to Workspace (as before).

### V5 Overview

**V5.1 Hero**

- **Card:** height 640px, radius 32, overflow hidden, background `#1B1230`. The `.rv-scale` class is on the card.
- **Sky:** linear gradient top→bottom `#120C22` 0, `#3A1F62` .42, `#8E4A8C` .68, `#E0866C` .84, `#F5C07A` 1.
- **Sun:** radial at (74%, 70%), r .42, `#FFE2B0` .95 → `#F7A86F` .45 at .35 → transparent.
- **Stars:** nine white dots at 55% opacity.
- **Hills** (viewBox 1200×640, anchored to the bottom):
  - `M0 430C200 380 380 425 560 395S900 352 1200 398V640H0Z`, `#5B2E7A` at .9 (`.px-1`);
  - `M0 486C170 452 410 506 640 472S1010 440 1200 474V640H0Z`, `#3B1D58` (`.px-2`);
  - `M0 548C240 512 520 566 770 532S1090 520 1200 548V640H0Z`, `#1F102D`, with short grass strokes in `#2E1842` (`.px-3`).
- **Text gradient:** `linear-gradient(90deg, rgba(10,6,20,.62) 0, rgba(10,6,20,.25) 46%, transparent 70%)`.
- **Text block:** max 660px, padding 64/56.
  - Eyebrow "Jobs with budgets locked on Solana" (dot `#C9A6F2`).
  - Headline (white, 300):
    - guest and Vietnam view: "Work that is / already funded";
    - client: "Hire with the / budget on the table".
  - Sub-line (white 78%):
    - Vietnam view: "Every job here has its full budget locked on Solana before it is posted. If you are hired, you receive VND milestone by milestone.";
    - guest: the same, ending "…you receive your earnings milestone by milestone.";
    - client: "Post a job with its whole budget locked, pick one applicant, and release each milestone after you accept the work."
  - Glass search pill: white 14%, blur 14px, inset 1px white 22%, max 520px. Placeholder "Search logo, Framer, translation…"; a white "Search" pill with arrow.
  - Text links: "Find jobs ↗", and "How it works ↗" (guest and Vietnam view) or "Post a job ↗" (client).
- **Glass card:** top-right 36px, 236px wide, radius 22, floating. Holds a 120px gradient thumbnail (`#F7C27A` → `#C0628A` → `#4A2470`) with "Budget locked" and the amount, then "Newest funded job" and the title.
- **Notch:** absolute bottom-right, 600px wide, white, top-left radius 32, padding 26/8/4/36.
  - Two concave corners, 32px each, `radial-gradient(circle at 0 0, transparent 31.5px, #FFFFFF 32px)`: one at top −32px on the right edge, one at left −32px on the bottom edge.
  - Three stats:
    - "<locked> locked in open jobs, read from Solana now" (USDC, or "≈ x.xM VND" in the Vietnam view);
    - "<n> open jobs, each with its budget already locked";
    - "<n> applications on open jobs".

**V5.2 Trust and circles**

- Two-tone heading "Funded first, / so both sides can start with trust", with the paragraph "A business can only post a job by locking its whole budget in the program. When it hires you, that budget moves into your contract and is released milestone by milestone after the work is accepted."
- **Circles:** 136px, overlapping −18px. Each has the category icon, name and "N open jobs".
  - First circle: white with a shadow, raised above the others.
  - Others: `#F5F5F7` with a 6px white ring.
  - Hover: lift.

**V5.3 Rules grid**

- Heading "Same rules for every job, / written into the program", on `#F5F5F7`.
- Grid: `auto-fit minmax(300px,1fr)`, gap 1px on `#ECECF0`, radius 24, white cells with padding 30/28/34. Each cell has a 36px tint icon tile, a title (16/600) and text (14 `#6B6B76`).
- The six rules:

| Title | Text |
| --- | --- |
| Budget locked first | A business can post a job only by locking its whole budget in the program. Anyone can check it on Explorer. |
| Released per milestone | Each milestone is released after the client accepts the work, or when the review time ends. |
| Request changes, not refunds | A client who refuses a delivery names what is missing. The amount stays locked; it never goes back alone. |
| Preview first, final files after | Share a watermarked preview to be reviewed. Hand over the final files after release, checked against their fingerprints. |
| VND for freelancers in Vietnam | Choose VND to your bank when you accept, and never hold USDC. The payout partner is simulated in this demo. |
| Track record from Solana | Completed contracts and on-time submissions are counted from the chain. No ratings that can be bought. |

**V5.4 Featured split**

- **Left:** "Featured jobs, / for every kind of skill", a purple "Find jobs ↗" pill, then four 168px cards (radius 18):
  - each card: number 01–04, title, "Category · amount", "View details";
  - the selected card has an ink inset ring 1.5px; the others an `#ECECF0` 1px ring.
- **Right:** a card at least 520px tall, radius 28, gradient `#F7C27A` → `#C0628A` 40% → `#4A2470` 78% → `#1F102D`, with two hill paths.
  - At the bottom, a white 94% panel (radius 22, blur 10): avatar, @business · category, "Budget locked", title (22/500), up to three milestone rows ("Due N days after selection"), the amount, "Apply by … · N applicants", and a purple Apply.

**V5.5 How it works**

- Heading "See how a job runs, / step by step".
- Showcase: `#F5F5F7`, radius 28, padding 14px.
  - Left: a white text card (role label in purple caps, title 26/400, text, note).
  - Right: a gradient (`#EFE6FB` → `#FFE9D6`) holding a mock card.
  - Below: five tabs (number, label, 2px track with the purple fill when active).
- Steps:

| # | Role | Title | Text | Note | Mock |
| --- | --- | --- | --- | --- | --- |
| 1 | Business | Post and lock the budget | Write the brief, split it into milestones and lock the whole budget. The job appears with a "Budget locked" badge anyone can check on Explorer. | One page, one wallet confirmation to lock, one to save the public brief. | "Icon set, 24 icons", 1 milestone 15.00 USDC, Apply by 10 Oct, purple "Lock 15.00 USDC & publish" |
| 2 | Freelancer | Apply with a short pitch | Read the verified brief and the business's track record, then apply with up to 280 bytes. Your pitch is public on Solana, so keep personal details out. | One wallet confirmation; the network fee is test SOL on devnet. | Job detail, budget and applicants, purple Apply |
| 3 | Business | Select one applicant | Compare pitches and track records counted from Solana. Selecting someone creates a Milestone Lock contract with your brief and real deadlines. | If the person does not accept in time, you can select someone else. | "Select @linh?", purple "Create contract & select" |
| 4 | Freelancer | Accept and start | Choose where earnings go: your own wallet, or VND to your bank through a payout partner. When you accept, the locked budget moves into your contract in the same transaction. | In this demo the payout partner is simulated. | Payout choice, purple "Accept & start" |
| 5 | Both | Deliver, review, release | Share a watermarked preview for each milestone. The client accepts and releases, or requests changes; the money never goes back on a refusal. Final files follow the release. | If the client does not review in time, anyone can release the milestone. | Milestone 1 Released, green "Released" |

### V6 Find jobs

**V6.1 Title row**

- Heading "Find jobs, / already funded"; right side "N open jobs · X locked on Solana".
- Tabs underline: 46px high, active ink 600 with a 2px ink underline; badge dark when active, `#F0F0F3` when not.

**V6.2 Search bar**

- **Frame:** sticky at top 78px, on a white fade (`linear-gradient(#FFFFFF 78%, transparent)`). White pill with padding 6px.
- **Segments:** padding 8/22, a label (11/700) and a value (14; `#8A8A96` when empty). Separated by 1px `#ECECF0` dividers.
  - What: flex 1.5;
  - Field and Budget: flex 1 each, with a chevron;
  - then a 52px purple circle with the search icon.
- **While a popover is open:** the bar turns `#F5F5F7` and the active segment turns white with `0 6px 20px -8px rgba(17,17,22,.3)`. A transparent full-screen layer closes the popover on outside click.

**V6.3 Popovers**

- **Field:** 520px, radius 26, padding 14, a 2-column grid. Each option has a 38px icon tile, name and "N open jobs"; the selected option is `#F5F5F7` with an inset 1.5px ink ring.
- **Budget:** 340px, radius 24. Radio rows (18px dot; selected = 6px purple inset) with "N open jobs".

**V6.4 Toolbar and sheet**

- **Toolbar:**
  - "Filters" pill (`#F5F5F7`, sliders icon, dark count badge);
  - removable chips (tint `#F2EAFB` / `#6A22B0`, 34px, ×), then "Clear all";
  - right side: count, "Sort [select]", the Grid/List Segmented (34×32 buttons on `#F5F5F7`), Share.
- **Sheet:** 440px, backdrop `rgba(17,17,22,.32)`.
  - Header "Filters" (20/500) with a 40px round close.
  - Sections separated by `#F0F0F3` hairlines:
    - Skills: pills 36px; dark when selected;
    - Time to deliver: Segmented, 4 columns;
    - Milestones: Segmented;
    - two switch rows: "Apply by within 24 hours" / "Jobs that close soon", and "Hide jobs I applied to" / "Keep your list fresh". Switch: 46×28, knob 22px, purple when on.
  - Footer: "Clear these" (underline) and a dark "Show N jobs" (48px).

**V6.5 Cards**

- **JobCard v4:** white, radius 22, `inset 0 0 0 1px #ECECF0`, padding 22. Lifts on hover; reveals with `.rv`.
  1. Category dot and "Category · Up to …", a status chip, a green "Locked" chip.
  2. Title (18/600).
  3. Summary (14 `#6B6B76`).
  4. Skill pills (`#F5F5F7`).
  5. Footer: avatar, @business and "Apply by … · N applicants", amount (Space Mono 17) with "N milestones".
- **JobRow:** in one hairline box. Avatar 38, title and meta, "Apply by" column (150px), amount column (170px) with "Budget locked", arrow.

**V6.6 Rows**

My applications and My listings use a hairline box with the same statuses and actions as before.

### V7 Shared card rules

- Card titles never use the Space Grotesk display font.
- Amounts always use Space Mono with "≈ … VND" in the Vietnam view.
- "Budget locked" / "Locked" uses the success chip.

### V8 Legal

**Top of the page**

- A 3px purple reading bar fixed at the top.
- Eyebrow "Legal", heading "Legal, / in plain words", and the line "The rules and notices for N.E.D Jobs and the N.E.D Wallet pilot. Pilot version 1 · 6 Oct 2026."
- Draft notice: "These are drafts for the devnet pilot. They have not been reviewed by a lawyer yet and are not legal advice."
- **Document cards:** `auto-fit minmax(230px,1fr)`, radius 20.
  - Each card: a 42px icon tile, the title (16/600) and the kicker.
  - Selected: white with an inset 1.5px ink ring and a shadow; others `#F5F5F7`.
  - Kickers:
    - Terms of use: "How the pilot works and what N.E.D is not";
    - Privacy notice: "What we process, where it goes, your choices";
    - Disclosures: "The limits of this pilot, stated plainly";
    - Job posting rules: "How to post, apply and hire on N.E.D Jobs".

**Body**

- **Aside:** sticky at top 100px. "On this page" list (numbers 01…, active: `#F5F5F7` with an inset 2px purple left bar), then the "[team email]" box.
- **Article:** max 760px.
  - Meta "Pilot version 1 · last updated 6 Oct 2026", title (`clamp(30px,3.4vw,42px)`/300), kicker.
  - Sections: number, title (19/600), paragraphs (15/1.75), separated by 1px hairlines.
  - Ends with the "Next: … Read it" card.

The shipped text in `ned-wallet/services/legalCopy.ts` (S11) is the source for Terms and Privacy; the `DOCS` object in `WebJobsLegal.dc.html` gives the layout and the drafts of Disclosures and Job posting rules. The shipped Terms say "not a payment service, a bank or an exchange", and the word table bans "payment": the CL decides; the board's alternative is "not a bank, an exchange or a money-transfer service".

### V9 Footer and CTA band

- **CTA band** (Overview only), on night `#0E0E12`, padding 88/64:
  - Heading (white 300 + grey `#8E8E9A`):
    - client: "Hire with the money on the table, / and no fee from N.E.D";
    - others: "Work with the money on the table, / and no fee from N.E.D".
  - Two purple-dot checks: "Budget locked before posting", "Checkable on Solana Explorer".
  - Paragraph "N.E.D holds no funds and charges no fee in this version. The money waits in the program until the work is accepted or a deadline passes."
  - Buttons: white "Find jobs ↗", and purple "Post a job" (client only).
- **Footer:**
  - Row: logo; links Overview · Find jobs · Post a job · Workspace · Legal; "Student project · UniHackFest 2026".
  - Bottom row: the disclaimer per view and Terms of use · Privacy · Disclosures.

### V10 Restyled pages

Job detail, Post a job and Applicants keep their S6 layout and behaviour. They get:
- the v4 header and footer;
- page background `#F5F5F7`;
- PillButtons;
- the dark back pill;
- Reveal on cards.
