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
| `OnbRole.dc.html` | Onboarding — How will you use N.E.D? (D30 step 1) | R4 | D30, behind `accountRoles`. Copy deck C1. Static (no motion). Tweaks `selected` (none / freelancer / client / business), `update`. A business gets a 5-segment step bar. The "Client · business" chip moves under its title at 390 px; chip text never breaks |
| `OnbRoleBusiness.dc.html` | Role — business chosen | R4 | wrapper (props on the base board) |
| `OnbRoleUpdate.dc.html` | Role — existing user (update notice, freelancer preselected, no back) | R7 | wrapper (props on the base board). Top row is the step bar only, so the notice, the three cards and the note fit above the fold |
