# Design boards v2 (source of truth for screens)

Exported on 3 Oct 2026 from the Design canvas "NED Wallet Design System" (claude.ai, version 104; web boards updated 4 Oct: Records page, wallet extension; Jobs site boards added 6 Oct and redesigned 7 Oct, canvas version 113). Each `.dc.html` file is one artboard: **inline styles are the exact values** (colours, sizes, spacing, radii, shadows), the copy in the markup is the final English copy, and `renderVals()` holds sample data and the state logic (tweaks in `data-props`). Wrapper boards only import a base board with other props.

How to use them in code: rebuild each screen with `components/design` and the tokens in `constants/design.ts` / `constants/motion.ts` (build-plan B2). Do not copy the HTML into the app; do not use the sample data (amounts, names, hashes) outside tests. The motion and surface rules are on `MotionSurfaces.dc.html`.

| Board | Title | Build task | Note |
| --- | --- | --- | --- |
| `Avatar.dc.html` | Avatar (component) | B3 |  |
| `AvatarSystem.dc.html` | User avatars · generated | B3 |  |
| `OnbSplash.dc.html` | Onboarding — Splash | B3 |  |
| `OnbWelcome.dc.html` | Onboarding — Welcome | B3 |  |
| `OnbSetup.dc.html` | Onboarding — Setting up | B3 |  |
| `OnbConsent.dc.html` | Onboarding — Consent | B3 |  |
| `OnbProfile.dc.html` | Onboarding — Create profile | B3 |  |
| `OnbResidence.dc.html` | Onboarding — Where do you live? | B3 |  |
| `WebSignIn.dc.html` | Web · Sign in with N.E.D Wallet | C2–C4 |  |
| `WebWorkspace.dc.html` | Web · Workspace (wallet panel open) | C2–C4 |  |
| `WebWalletPanel.dc.html` | Web · Wallet extension (the mobile app inside) | W6 | The signed-in body is the mobile app itself (every mobile board, 86%); Back, expand, close in the header |
| `Main.dc.html` | Design System · Modern Minimal | B2 |  |
| `MilestoneComponents.dc.html` | Milestone Lock components | B2, B4 |  |
| `HomeVN.dc.html` | Home — Vietnam view (Vinh) | B3 |  |
| `HomeVNNew.dc.html` | Home VN — new contract waiting | B3 | wrapper (props on the base board) |
| `HomeIntl.dc.html` | Home — international / client (Mia) | B3 |  |
| `HomeIntlAccepted.dc.html` | Home Intl — Vinh accepted | B3 | wrapper (props on the base board) |
| `WebContractNew.dc.html` | Web · New contract: brief (client) | C2–C4 |  |
| `WebSubmit.dc.html` | Web · Submit milestone (freelancer, VN view) | C2–C4 |  |
| `WebReview.dc.html` | Web · Review delivery (client) | C2–C4 |  |
| `WebJobs.dc.html` | Jobs site · Overview (landing, scroll effects) | H2 (prompts-hub-v4) | v4 (7 Oct): dusk hero card with a notch for live numbers and a glass card, two-tone light headings, category circles, hairline rules grid, featured split that follows hover, auto-advancing How-it-works tabs, dark CTA band and footer. Tweak `who` (guest / vinh / mia) |
| `WebJobsFind.dc.html` | Jobs site · Find jobs (segmented search, Filters sheet) | H3 (prompts-hub-v4) | v4: sticky What · Field · Budget bar with popovers, removable filter chips, Filters sheet, quiet sort, grid / list, Share. Tweaks `who`, `tab`, `drawer` |
| `WebJobDetail.dc.html` | Jobs site · Job detail and apply | S6, H5 | v4 header and palette. States open / applied / selected (tweak `state`) |
| `WebJobPost.dc.html` | Jobs site · Post a job, budget locked (client) | S6, H5 | v4 header and palette. One page, three sections, live card preview, sticky "Lock … & publish" |
| `WebJobApplicants.dc.html` | Jobs site · Applicants and select (client) | S6, H5 | v4 header and palette. States review / confirm / waiting / hired |
| `WebJobsLegal.dc.html` | Jobs site · Legal (Terms, Privacy, Disclosures, Job posting rules) | H4 (prompts-hub-v4) | Reached from the footer only. Doc cards, sticky table of contents that follows the scroll, reading bar. Tweaks `who`, `doc` |
| `ContractsList.dc.html` | Contracts — list (freelancer) | B4 |  |
| `ContractsListMia.dc.html` | Contracts — list (client) | B4 | wrapper (props on the base board) |
| `ContractNew1Freelancer.dc.html` | New contract 1 — Freelancer | B4 |  |
| `ContractNew2Milestones.dc.html` | New contract 2 — Job & milestones | B4 |  |
| `ContractNew3Review.dc.html` | New contract 3 — Review | B4 |  |
| `ContractCreated.dc.html` | New contract — Created | B4 |  |
| `ContractDetail.dc.html` | Contract detail (all tweaks) | B4 |  |
| `MotionSurfaces.dc.html` | Motion & surfaces (no outlines) | B2 |  |
| `ContractDetailMiaCreated.dc.html` | Detail · Mia · created | B4 | wrapper (props on the base board) |
| `ContractDetailVinhNew.dc.html` | Detail · Vinh · new | B4 | wrapper (props on the base board) |
| `ContractDetailVinhAccepted.dc.html` | Detail · Vinh · accepted | B4 | wrapper (props on the base board) |
| `ContractDetailMiaAccepted.dc.html` | Detail · Mia · ready to lock | B4 | wrapper (props on the base board) |
| `ContractDetailMiaLocked.dc.html` | Detail · Mia · locked | B4 | wrapper (props on the base board) |
| `ContractDetailVinhLocked.dc.html` | Detail · Vinh · locked | B4 | wrapper (props on the base board) |
| `ContractDetailLogo.dc.html` | Detail · Contract B · release now | B4 | wrapper (props on the base board) |
| `ContractAccept.dc.html` | Accept & choose destination | B4 |  |
| `ContractLock.dc.html` | Lock (client) | B4 |  |
| `ContractLocked.dc.html` | Locked (client) | B4 |  |
| `ContractLockedVN.dc.html` | Locked (Vinh mirror) | B4 | wrapper (props on the base board) |
| `MilestoneSubmit.dc.html` | Submit milestone | B4 |  |
| `MilestoneSubmitted.dc.html` | Submit — result | B4 | wrapper (props on the base board) |
| `MilestoneReview.dc.html` | Review milestone (client) | B4 |  |
| `MilestoneReleased.dc.html` | Released (client) | B4 |  |
| `MilestoneReleasedVN.dc.html` | Released (Vinh, VN view) | B4 | wrapper (props on the base board) |
| `MilestoneReleasedB.dc.html` | Released (Contract B, anyone) | B4 | wrapper (props on the base board) |
| `ContractAnyoneAction.dc.html` | Release now (anyone) | B4 |  |
| `ContractAnyoneActionRefund.dc.html` | Refund now (anyone) | B4 | wrapper (props on the base board) |
| `MilestoneRefunded.dc.html` | Refunded (result) | B4 | wrapper (props on the base board) |
| `ContractClose.dc.html` | Close contract | B4 |  |
| `ContractClosed.dc.html` | Close — done | B4 | wrapper (props on the base board) |
| `DisputeSheet.dc.html` | Dispute (client) · if shipped | B4 (P1) |  |
| `ContractDetailMiaDisputed.dc.html` | Detail · Mia · disputed | B4 | wrapper (props on the base board) |
| `ContractDetailVinhDisputed.dc.html` | Detail · Vinh · disputed | B4 | wrapper (props on the base board) |
| `DisputeSheetConcede.dc.html` | Concede (freelancer) · if shipped | B4 (P1) | wrapper (props on the base board) |
| `SplitPropose.dc.html` | Propose split · if shipped | B4 (P1) |  |
| `SplitAccept.dc.html` | Accept split · if shipped | B4 (P1) |  |
| `SplitReleased.dc.html` | Split released · if shipped | B4 (P1) | wrapper (props on the base board) |
| `Records.dc.html` | Records (VN view) | B5 |  |
| `RecordsIntl.dc.html` | Records (Mia, empty) | B5 | wrapper (props on the base board) |
| `Settings.dc.html` | Settings (VN view) | B3 |  |
| `SettingsIntl.dc.html` | Settings (Mia) | B3 | wrapper (props on the base board) |
| `Disclosures.dc.html` | Disclosures | B3 |  |
| `Receive.dc.html` | Receive | B3 |  |
| `SendRecipient.dc.html` | Send — Choose recipient | B3 |  |
| `SendAmount.dc.html` | Send — Amount | B3 |  |
| `SendReview.dc.html` | Send — Review | B3 |  |
| `SendSuccess.dc.html` | Send — Sent | B3 |  |
| `WebRecords.dc.html` | Web · Records (history of contracts and milestones) | W7 | Tweaks: who = mia / vinh, view = contract / activity |
| `WebExtensionGallery.dc.html` | Web · Wallet extension, screen by screen | W6 | Nine extension states for review |

## D30 · roles, country, business, agreement (8 Oct)

Drawn in Claude Code on 8 Oct 2026 from `NED-prompts-d30-design.md` (D0–D8), not exported from the canvas. Every board is behind `FEATURES.accountRoles` (off until R9) and **static** (no motion, D0). Copy: deck §C (C1–C6), the same strings as `packages/ned-core/src/account/copy.ts` and `legal/agreement.ts`. Step bars: freelancer and individual client Role 1/4 → Country 2/4 → Agreement 3/4 → Profile 4/4; business Role 1/5 → Country 2/5 → Business 3/5 → Agreement 4/5 → Profile 5/5 (`OnbProfile` itself still shows the old 2/3; R4 sets the count in code). Review renders: `../screenshots/d30-boards/`.

| Board | Title | Build task | Note |
| --- | --- | --- | --- |
| `OnbRole.dc.html` | Onboarding — How will you use N.E.D? (D30 step 1) | R4 | D30, behind `accountRoles`. Copy deck C1. Static (no motion). Tweaks `selected` (none / freelancer / client / business), `update`. A business gets a 5-segment step bar. The "Client · business" chip moves under its title at 390 px; chip text never breaks |
| `OnbRoleBusiness.dc.html` | Role — business chosen | R4 | wrapper (props on the base board) |
| `OnbRoleUpdate.dc.html` | Role — existing user (update notice, freelancer preselected, no back) | R7 | wrapper (props on the base board). Top row is the step bar only, so the notice, the three cards and the note fit above the fold |
| `OnbCountry.dc.html` | Onboarding — Where do you live now? (D30 step 2) | R4 | D30, behind `accountRoles`. Copy deck C2. Static. Tweaks `role` (freelancer / client / business: 5-segment bar), `selected` (sample rows from core `COUNTRIES`). The notice follows the selection; a client who taps Vietnam gets the "Join as a freelancer?" sheet. With the VN note, the page scrolls 34 px to the settings hint |
| `OnbCountryVN.dc.html` | Country — freelancer, Vietnam selected | R4 | wrapper (props on the base board) |
| `OnbCountryVNClient.dc.html` | Country — client taps Vietnam (sheet) | R4 | wrapper (props on the base board). "Choose another country" closes the sheet |
| `OnbBusiness.dc.html` | Onboarding — About your business (D30 step 3 of 5, business only) | R4 | D30, behind `accountRoles`. Copy deck C3. Static; the screen scrolls, the button stays. Tweak `errors`. Team size is one row of five equal chips (with padding 0 14 "200+" wrapped alone); the 8 industry chips wrap over 4 lines at 390 px. "Fix the fields in red to continue." is not in the copy deck yet |
| `OnbBusinessError.dc.html` | Business — errors (name empty, registered in Vietnam, website without https) | R4 | wrapper (props on the base board) |
| `OnbAgreement.dc.html` | Onboarding — The N.E.D Agreement (D30, step 3 of 4; 4 of 5 for a business) | R4 | D30, behind `accountRoles`. Copy deck C4; the card text is generated from core `legal/agreement.ts` (Draft for CL review). Static; the screen scrolls under a fade, the button area stays. Tweaks `role`, `ticked`, `nedOpen`. Three separate boxes, never pre-ticked. Note for R9: the freelancer card's last "You can count on" line (rights to the work until release) is "Lawyer to confirm" (design §9 Q3); the note lives in the script, not on screen. "Close" on the N.E.D sheet is not in the copy deck yet |
| `OnbAgreementBusiness.dc.html` | Agreement — business client (client card, business card, Job posting rules link) | R4 | wrapper (props on the base board) |
| `OnbAgreementReady.dc.html` | Agreement — all three ticked, button enabled | R4 | wrapper (props on the base board) |
| `OnbAgreementNed.dc.html` | Agreement — "What N.E.D does and does not do" sheet, all eight items | R4 | wrapper (props on the base board) |
| `SettingsAccount.dc.html` | Settings — Your account (D30; Mia, client business + freelancer in Singapore) | R5 | D30, behind `accountRoles`. Copy deck C5. Built from the `Settings` layout; "Your account" replaces the "I live in Vietnam" switch (closes D17), and "Consent: view or withdraw" moves into the Agreement row. The artboard is 754 px wide: the phone frame (390 × 844) plus an inset of the Agreement detail (`settings.agreementView`, `settings.agreementWithdraw`). Static. The last role that is on cannot be switched off (`settings.atLeastOne`). Tweak `view` |
| `SettingsAccountVN.dc.html` | Settings — Your account (Vinh, freelancer in Vietnam) | R5 | wrapper (props on the base board). Also work on and locked, Also hire off and locked with `settings.alsoHireVN`, no Business row |
| `SheetChangeCountry.dc.html` | Settings — Change where you live? (sheet, Singapore → Vietnam) | R5 | D30, behind `accountRoles`. Copy deck C5 `sheet.change.*`. Over a dimmed `SettingsAccount`. Shown when core `canChangeCountry()` is ok. No amounts |
| `SheetCountryBlocked.dc.html` | Settings — Finish your client contracts first (sheet) | R5 | D30. Copy deck C5 `sheet.blocked.*` with 2 contracts and 1 listing (`canChangeCountry()` reason `openClientWork`). The deck reads "1 open job listings": singular forms are not in the deck yet |
| `WebAccountPrompt.dc.html` | Web · Finish setting up your account (modal over the dimmed Overview) | R6 | D30, behind `accountRoles`. Copy deck C6 `web.prompt.*`. 1280 × 800; imports `WebWorkspace` (Mia, panel closed). Modal 480 px, radius 24, padding 32, shadow = the v2 popover/sheet shadow (MotionSurfaces; Main has no "S2"). Inset (scaled 0.62): the update copy for existing users. "Your role" is not in the copy deck yet. Static |
| `WebRoleGate.dc.html` | Web · /new for a freelancer-only account (Singapore) | R6 | D30, behind `accountRoles`. Copy deck C6 `gate.*`. Workspace header and nav from `WebWorkspace` (New contract hidden, nothing current). Open settings opens the wallet panel at Settings. Inset: the Vietnam variant (`gate.clientNeededVN`, no Open settings, no amount). With the flag on it replaces the VN gate of `WebContractNew`. "Creating contracts is for clients" and "Find work on N.E.D Jobs" are not in the copy deck yet |
