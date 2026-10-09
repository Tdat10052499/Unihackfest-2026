# D30 design prompts: role, country, business, the N.E.D Agreement and account settings (D0–D8)

**Owner:** PO (Hồ Du Tuấn Đạt) · **Written:** 8 Oct 2026 · **For:** the Designer, in the Design canvas "NED Wallet Design System" (claude.ai, the canvas the `canvas-v2` boards were exported from) · **Design:** [`roles-and-agreement-plan.md`](roles-and-agreement-plan.md) · **Build:** [`roles-and-agreement-build.md`](roles-and-agreement-build.md), code prompts in [`prompts-d30.md`](prompts-d30.md)

## How to use

1. **Open the canvas.** Paste **D0** first, once per canvas session. It gives the shared rules and the copy deck. Then paste D1–D7, one board group per prompt, and check each result against its checklist before moving on.
2. **Export.** **D8** reviews all the boards together and exports them to `docs/02-design/canvas-v2/`, adding the README rows.
3. **Copy deck.** The copy deck in §C is the **source of the English copy**.
   - Code prompt R1 copies it into `packages/ned-core/src/account/copy.ts`, and R2 copies the agreement text into `legal/agreement.ts`.
   - If the CL changes a line, change it here first, then in code.
4. **Timing.** The boards can be made before the final. They change nothing in the app.

---

## A. Board list

| Board | Variant of | Screen | Code step |
| --- | --- | --- | --- |
| `OnbRole` | — | Role, nothing chosen | R4 |
| `OnbRoleBusiness` | `OnbRole` | Business chosen | R4 |
| `OnbRoleUpdate` | `OnbRole` | Existing user, freelancer preselected, update banner | R7 |
| `OnbCountry` | — | Country list, search empty, Singapore selected | R4 |
| `OnbCountryVN` | `OnbCountry` | Freelancer + Vietnam selected (VN note) | R4 |
| `OnbCountryVNClient` | `OnbCountry` | Client + Vietnam: the "Join as a freelancer?" sheet | R4 |
| `OnbBusiness` | — | Business form, filled, valid | R4 |
| `OnbBusinessError` | `OnbBusiness` | Name empty, registered in Vietnam, website without https | R4 |
| `OnbAgreement` | — | Freelancer, nothing ticked, button disabled | R4 |
| `OnbAgreementBusiness` | `OnbAgreement` | Business client, cards for client and business | R4 |
| `OnbAgreementReady` | `OnbAgreement` | All three ticked, button enabled | R4 |
| `OnbAgreementNed` | `OnbAgreement` | The "What N.E.D does and does not do" sheet, open | R4 |
| `SettingsAccount` | `Settings` (layout) | "Your account" section, client business in Singapore | R5 |
| `SettingsAccountVN` | `SettingsAccount` | Freelancer in Vietnam (Also hire disabled) | R5 |
| `SheetChangeCountry` | — | Confirm sheet when changing country | R5 |
| `SheetCountryBlocked` | — | Blocked sheet: open client contracts before moving to Vietnam | R5 |
| `WebAccountPrompt` | — | Workspace modal "Finish setting up your account" (1280 × 800) | R6 |
| `WebRoleGate` | — | Workspace page `/new` opened by a freelancer-only account | R6 |

---

## B. D0 · Shared rules and context (paste first)

```
You are designing new boards for N.E.D (No Empty Deals), in this canvas "NED Wallet Design System". Match the
existing boards exactly: OnbConsent, OnbResidence, OnbProfile and Settings are the references for every phone board,
and WebSignIn / WebWorkspace for the web boards. Do not restyle anything that exists.

Product in one line: clients lock a budget per milestone in a Solana program vault; freelancers see it locked before
they start; people who live in Vietnam join only as freelancers and get VND through a payout partner (simulated).

Frame and layout (phone):
- 390 × 844, background #F4F4F6, status bar row "9:41" as on the references.
- Top row: 44 × 44 back button (white, radius 12, shadow S1) and the segmented step bar to its right
  (segments 4 px high, radius 9999, gap 6; done/current #7B2FBE, upcoming #E4E4EA). Padding 12px 24px 8px.
- Title: Space Grotesk 700, 28 px, letter-spacing -0.6 px, #111116, top padding 22 px. Subtitle: Inter 400, 15 px,
  line-height 1.45, #3F3F49, 8 px below the title.
- Side padding 24 px. Cards: #FFFFFF, radius 20, padding 16–18, shadow S1 =
  0 1px 2px rgba(17,17,22,0.04), 0 6px 16px -6px rgba(17,17,22,0.10). No borders on surfaces; the only line allowed
  is the divider #F0F0F3 between rows of one list.
- Selected card (as OnbResidence): background #F2EAFB, no shadow; radio 22 px, ring 2 px #6A22B0, inner dot #6A22B0.
  Unselected radio ring #8A8A96.
- Checkbox (as OnbConsent): 24 × 24, radius 6, unticked ring 2 px #8A8A96 on white; ticked #7B2FBE with a white check.
  Never pre-ticked.
- Fields (as OnbProfile): label Inter 600 14 px #111116; field #F4F4F6 on white cards or #FFFFFF on the ground,
  height 52, radius 16; valid state ring 2 px #2E9E5B with a check; error ring 2 px #D93A3A and the error text
  Inter 13 px #D93A3A under the field. Placeholder #8A8A96.
- Chips (single choice): height 36, radius 9999, padding 0 14, Inter 500 14 px; off #FFFFFF with shadow S1,
  on #F2EAFB with text #6A22B0.
- Bottom area: padding 12px 24px 28px. Primary button 52 px, radius 9999, #7B2FBE, Inter 600 16 px white.
  Disabled: #E4E4EA with text #8A8A96, and a caption under it (Inter 13 px #5E5E6A), as OnbConsent.
- Info line: 16 px info icon #5E5E6A + Inter 13 px #5E5E6A. Notice card: #F2EAFB, radius 16, padding 14, Inter 14 px #3F3F49.
- Warning card: #FFF6E5, radius 16, padding 14, Inter 14 px #3F3F49, warning icon #B26B00.
- Sheets: white, top radius 28, grabber 36 × 4 #E4E4EA, padding 24, dimmed ground rgba(17,17,22,0.4).
- Fonts: Space Grotesk 500/600/700 (titles), Inter 400/500/600 (text), Space Mono 400/700 (codes, wallet strings).
- Touch targets ≥ 44 px. Text contrast ≥ 4.5:1 (#8A8A96 only for placeholders).
- Motion: none on these boards (static).

Copy rules (must hold on every board):
- English only, exactly the copy deck (section C of docs/09-milestone-lock/prompts-d30-design.md, pasted below).
- Never write: payment / pay (for USDC), escrow, intermediary, guaranteed, safe, protected, verified (for a user or
  business), trusted, employer, employee, salary, hire staff.
- The Vietnam view never shows USDC or a SOL amount. N.E.D never "holds" money: the program vault does.
- Business details are always "self-declared".

Board conventions (canvas-v2/README.md): one artboard per file; inline styles are the exact values; final copy in
the markup; sample data in renderVals(); variants are wrapper boards that import the base board with props in
data-props. Name the files exactly as in the board list.

Copy deck:
<paste section C here>
Reply "Ready" and wait for the next prompt.
```

---

## C. Copy deck (source for `account/copy.ts` and `legal/agreement.ts`)

### C1 · Role (`OnbRole`)

| Key | Text |
| --- | --- |
| `role.title` | How will you use N.E.D? |
| `role.sub` | Pick what you'll do most. You can add the other role later in Settings. |
| `role.freelancer.title` | I do the work |
| `role.freelancer.tag` | Freelancer |
| `role.freelancer.body` | Accept contracts, submit milestones and receive your earnings when work is released. |
| `role.client.title` | I hire, for myself |
| `role.client.tag` | Client |
| `role.client.body` | Create contracts, lock the budget for each milestone, then review and release. |
| `role.business.title` | I hire for a business |
| `role.business.tag` | Client · business |
| `role.business.body` | Everything a client does, plus N.E.D Jobs listings under your business name. |
| `role.note` | People who live in Vietnam join as freelancers. You'll choose your country next. |
| `role.update` | We've updated how N.E.D works. Please confirm your role and where you live, and agree to the new terms. |
| `common.continue` | Continue |
| `common.chooseOne` | Choose one to continue |

### C2 · Country (`OnbCountry`)

| Key | Text |
| --- | --- |
| `country.title` | Where do you live now? |
| `country.sub` | Where you live, not your nationality. This decides how amounts are shown and where your earnings can go. |
| `country.search` | Search country |
| `country.noResult` | No country matches "{query}". |
| `country.noteVN` | In Vietnam you'll see amounts in VND (estimate) and receive earnings in your bank account through a payout partner. No crypto balance is shown. |
| `country.noteIntl` | You'll see USDC and receive earnings in your N.E.D wallet. |
| `country.settingsHint` | You can change this in Settings. |
| `country.vnClient.title` | Join as a freelancer? |
| `country.vnClient.body` | Clients lock USDC, and N.E.D does not offer USDC to people who live in Vietnam. You can join as a freelancer and receive VND. |
| `country.vnClient.primary` | Continue as a freelancer |
| `country.vnClient.secondary` | Choose another country |

### C3 · Business (`OnbBusiness`)

| Key | Text |
| --- | --- |
| `business.title` | About your business |
| `business.sub` | Tell freelancers who they are working with. |
| `business.selfDeclared` | Self-declared. N.E.D does not check these details. Wherever your business is shown, it is marked "self-declared". |
| `business.name.label` | Business name |
| `business.name.placeholder` | e.g. Lumen Studio Pte. Ltd. |
| `business.name.error` | Enter your business name (2–80 characters). |
| `business.registeredIn.label` | Country where it is registered |
| `business.registeredIn.placeholder` | Choose country |
| `business.registeredIn.errorVN` | A business registered in Vietnam can't be a client on N.E.D, because clients lock USDC. |
| `business.size.label` | Team size |
| `business.size.options` | Just me · 2–10 · 11–50 · 51–200 · 200+ |
| `business.industry.label` | Industry |
| `business.industry.options` | Design · Development · Writing & Translation · Marketing · Video & Animation · Data & AI · Admin & Support · Other |
| `business.website.label` | Website or LinkedIn page (optional) |
| `business.website.placeholder` | https:// |
| `business.website.error` | Use a link that starts with https:// |
| `business.role.label` | Your role in the business (optional) |
| `business.role.placeholder` | e.g. Founder, Hiring manager |
| `business.regNo.label` | Registration number (optional) |
| `business.regNo.help` | Stays on this device. Never written to Solana. |

### C4 · Agreement (`OnbAgreement`)

| Key | Text |
| --- | --- |
| `agreement.title` | The N.E.D Agreement |
| `agreement.sub` | What you can count on, what you agree to, and what N.E.D does and does not do. |
| `agreement.opening` | N.E.D is software for milestone contracts between clients and freelancers. When a client locks a budget, it sits in a vault owned by a Solana program, not by N.E.D, and it leaves only by the rules written into the contract. This pilot runs on Solana devnet with test tokens that have no value. |
| `agreement.countOn` | You can count on |
| `agreement.agreeTo` | You agree to |
| `agreement.freelancer.heading` | As a freelancer |
| `agreement.client.heading` | As a client |
| `agreement.business.heading` | For your business |
| `agreement.ned.heading` | What N.E.D does and does not do |
| `agreement.ned.more` | Read all |
| `agreement.links` | Read the full Terms · Privacy notice · Disclosures |
| `agreement.links.business` | Job posting rules |
| `agreement.check1` | I have read and agree to the N.E.D Terms of use, including my rights and duties above. |
| `agreement.check2` | I agree that N.E.D processes my data as the Privacy notice says. My @username, wallet address, contract titles, job listings and pitches are written to Solana, where they are public and permanent. |
| `agreement.check3` | I am 18 or older, and the country and role I chose are true. |
| `agreement.button` | Agree and continue |
| `agreement.disabled` | Tick all three boxes to continue |
| `agreement.version` | Agreement version 1 · Terms 1.2 · Privacy 2 |

**Freelancer card** (verbatim from design §8.2):
- **You can count on**
  - You see the budget locked in the program before you start work.
  - The place your earnings go is fixed when you accept. Nobody, including N.E.D, can change it.
  - If the client neither approves nor requests changes before the review deadline, anyone can release the milestone to you (Release now).
  - A change request never sends the money back to the client alone. It stays locked until you both agree.
  - Your brief and your deliveries are encrypted. N.E.D has no key.
  - Until a milestone is released, you keep the rights to the work submitted for it, unless you and the client agree otherwise. *(Lawyer to confirm. Keep this line on the board; R9 may change it.)*
- **You agree to**
  - Do the work you accept, and submit only work you have the right to hand over.
  - Submit a preview that shows the work honestly, and hand over the final files you listed after release.
  - Keep personal data out of public fields: @username, contract titles, job pitches.
  - Handle your own tax and records. Records from N.E.D are not tax advice.
  - If you live in Vietnam: you receive VND through a payout partner and never receive, hold or send USDC through N.E.D.

**Client card** (verbatim from design §8.3):
- **You can count on**
  - Your budget leaves the vault only by the rules written when the contract was created.
  - If a submission deadline passes with nothing submitted, anyone can refund that milestone to you.
  - Before you release, you see a preview and the list of final files the freelancer promised, with their fingerprints.
  - You can request changes before the review deadline. The amount then stays locked until you both agree.
- **You agree to**
  - Lock the budget before work starts. Review before the review deadline, or the milestone can be released.
  - Write a clear brief with "done when" points for each milestone, and hire only for lawful work.
  - Use contracts for independent services. Whether a relationship counts as employment under the law that applies to you is your responsibility.
  - You do not live in Vietnam, and your business is not registered there.

**Business card** (shown under the client card for a business):
- The business details you give are true and kept up to date.
- Only people the business allows act for it.
- The business is responsible for everything done from this account.

**N.E.D card** (verbatim from design §8.4). On the screen, show the first three bullets; **Read all** opens `OnbAgreementNed`:
- N.E.D provides the software. It does not hold, convert or move your funds. No instruction in the program lets anyone at N.E.D move a locked budget.
- N.E.D is not a party to your contract. It does not choose, vet or employ anyone, and it does not decide disagreements. There is no neutral arbiter in this pilot.
- N.E.D does not check identities, business details, the quality of the work or whether files are handed over. What users declare is self-declared.
- The program has not been audited, the team still holds the upgrade authority (see Disclosures), and the payout partner is simulated.
- Transactions you sign cannot be reversed. N.E.D cannot recover a lost login or undo a release or refund.
- To the extent the law allows, N.E.D is not responsible for losses caused by another user, by transactions you sign, or by outages of Solana, Dynamic or other services. Nothing here removes rights you have by law that cannot be waived.
- N.E.D may stop offering its app to an account that breaks these terms (false declarations, unlawful work, impersonation, money laundering). It cannot freeze or take funds already locked in the program.
- N.E.D shows any new version of these terms before it applies to you. You keep using the app only by agreeing again.

### C5 · Settings and sheets

| Key | Text |
| --- | --- |
| `settings.account` | Your account |
| `settings.alsoWork` | Also work (freelancer) |
| `settings.alsoHire` | Also hire (client) |
| `settings.alsoHireVN` | Not available for people who live in Vietnam. |
| `settings.atLeastOne` | Keep at least one role on. |
| `settings.country` | Where you live |
| `settings.business` | Business |
| `settings.businessValue` | {name} · self-declared |
| `settings.agreement` | Agreement |
| `settings.agreementValue` | Version {n} · {date} |
| `settings.agreementView` | View what you agreed to |
| `settings.agreementWithdraw` | Withdraw and sign out |
| `sheet.change.title` | Change where you live? |
| `sheet.change.body` | Your money view will change. Destinations already fixed in your contracts do not change. |
| `sheet.change.primary` | Change to {country} |
| `sheet.change.cancel` | Cancel |
| `sheet.blocked.title` | Finish your client contracts first |
| `sheet.blocked.body` | You have {contracts} open client contracts and {listings} open job listings. Settle or close them before you move to Vietnam, because people who live in Vietnam can't lock USDC. |
| `sheet.blocked.ok` | OK |

### C6 · Workspace

| Key | Text |
| --- | --- |
| `web.prompt.title` | Finish setting up your account |
| `web.prompt.body` | Tell us how you'll use N.E.D and where you live, then agree to the N.E.D Agreement. It takes about a minute. |
| `web.prompt.update` | We've updated how N.E.D works. Please confirm your role and where you live, and agree to the new terms. |
| `web.prompt.primary` | Open in wallet |
| `web.prompt.later` | Later |
| `web.prompt.laterNote` | You can browse, but creating, locking, posting and applying wait until you finish. |
| `gate.clientNeeded` | Add the client role in Settings to create contracts, lock budgets and post jobs. |
| `gate.clientNeededVN` | People who live in Vietnam join as freelancers. Clients lock USDC, and N.E.D does not offer USDC in Vietnam. |
| `gate.freelancerNeeded` | Add the freelancer role to apply and accept contracts. |
| `gate.openSettings` | Open settings |
| `gate.alsoWork` | Also work |
| `badge.business` | Business · self-declared |

---

## D. Board prompts

### D1 · `OnbRole`, `OnbRoleBusiness`, `OnbRoleUpdate`

```
Create OnbRole (phone, 390 × 844), step 1 of the new sign-up. Use the copy deck C1.
Layout, top to bottom:
1. Status bar; top row with back button (back goes to Welcome) and the step bar with 4 segments, the first one on.
2. Title role.title, subtitle role.sub.
3. Three selectable cards, 12 px apart, built exactly like the OnbResidence cards (white + S1 when off, #F2EAFB
   without shadow when on, radio on the right):
   - left: a 40 × 40 icon tile (radius 12, #F4F4F6): "tool" for freelancer, "user" for client, "briefcase" for
     business (Feather icons, 20 px, #3F3F49);
   - title Inter 600 17 px #111116 with the tag as a small chip next to it (Inter 600 11 px, #F4F4F6 background,
     #3F3F49 text, radius 9999, padding 2 8);
   - body Inter 400 14 px #3F3F49 under it.
4. Info line role.note (info icon), 16 px under the cards.
5. Bottom: primary button common.continue, disabled with the caption common.chooseOne.
Variants (wrapper boards):
- OnbRoleBusiness: the business card on; button enabled; the step bar shows 5 segments (a business has one more step).
- OnbRoleUpdate: a notice card with role.update above the title area (under the top row); the freelancer card on;
  button enabled; no back button (the user is already signed in).
Check: three cards fit above the fold with the note; the tag chips do not wrap; nothing says "account type".
```

### D2 · `OnbCountry`, `OnbCountryVN`, `OnbCountryVNClient`

```
Create OnbCountry (phone), step 2. Copy deck C2.
Layout:
1. Top row; step bar 4 segments, two on.
2. Title country.title, subtitle country.sub.
3. Search field (white, height 52, radius 16, search icon #5E5E6A, placeholder country.search).
4. A white card (radius 20, S1) holding a scrolling list. Each row is 56 px:
   - a 32 × 24 code chip (Space Mono 700 12 px, #F4F4F6, radius 8), as the "VN" chip on OnbResidence;
   - the country name, Inter 500 16 px;
   - a radio on the right.
   Dividers #F0F0F3 between rows. Show ~6 rows: Singapore (selected), South Korea, Thailand, United Kingdom,
   United States, Vietnam. No flags or emoji.
5. Under the card: a notice card that follows the selection (country.noteIntl for Singapore), then the info line
   country.settingsHint.
6. Bottom: Continue (enabled).
Variants:
- OnbCountryVN: role freelancer, Vietnam selected, notice card country.noteVN.
- OnbCountryVNClient: role client, Vietnam tapped. Show the sheet over the dimmed screen:
  - title country.vnClient.title (Space Grotesk 700 22 px);
  - body country.vnClient.body (Inter 15 px #3F3F49);
  - primary button country.vnClient.primary;
  - secondary button country.vnClient.secondary (52 px, radius 9999, #F2EAFB, text #6A22B0).
Check: the hint says "not your nationality"; the VN sheet has no "illegal"/"banned" wording; no USDC amount anywhere.
```

### D3 · `OnbBusiness`, `OnbBusinessError`

```
Create OnbBusiness (phone), step 3 of 5 (business only). Copy deck C3. The screen scrolls; the button stays at the
bottom.
Layout:
1. Top row; step bar 5 segments, three on.
2. Title business.title, subtitle business.sub.
3. Notice card business.selfDeclared with a "shield-off" or "info" icon (never a check or a badge that looks verified).
4. Fields on the ground (white fields), 20 px apart, in this order:
   - Business name: "Lumen Studio Pte. Ltd.", valid.
   - Country where it is registered: a select row showing the "SG" chip and "Singapore", chevron; opens the country
     list of OnbCountry.
   - Team size: chips from business.size.options, "2–10" on.
   - Industry: chips that wrap over two lines, "Design" on.
   - Website or LinkedIn page (optional): "https://lumen.studio".
   - Your role in the business (optional): "Founder".
   - Registration number (optional): empty, help text business.regNo.help under it.
5. Bottom: Continue (enabled).
Variant OnbBusinessError:
- name empty with business.name.error;
- registered in "VN Vietnam" with business.registeredIn.errorVN;
- website "lumen.studio" with business.website.error;
- Continue disabled with the caption "Fix the fields in red to continue."
Check: "(optional)" in caption colour after the label; registration number marked device-only; no "verified".
```

### D4 · `OnbAgreement`, `OnbAgreementBusiness`, `OnbAgreementReady`, `OnbAgreementNed`

```
Create OnbAgreement (phone), step 3 of 4 for a freelancer. Copy deck C4 (cards verbatim). The screen scrolls; the
button area stays at the bottom with a soft fade above it.
Layout:
1. Top row; step bar 4 segments, three on.
2. Title agreement.title, subtitle agreement.sub.
3. Opening paragraph agreement.opening (Inter 14 px #3F3F49) in a white card.
4. Role card "As a freelancer" (white, radius 20, S1):
   - heading: Space Grotesk 600 18 px;
   - two labelled lists. "You can count on" uses a #2E9E5B check icon per line; "You agree to" uses a #6A22B0
     dot per line. Inter 14 px #111116, line-height 1.45, 10 px between lines.
5. N.E.D card (white): heading agreement.ned.heading, the first three bullets, then a text button agreement.ned.more
   (#6A22B0, Inter 600 14 px).
6. Links line: "Read the full Terms · Privacy notice · Disclosures" with each name underlined #6A22B0.
7. Three checkbox cards (as the OnbConsent checkbox card: white, radius 20, checkbox at the top left, text Inter 15 px
   #111116), 10 px apart: check1, check2, check3. All unticked.
8. Bottom: Agree and continue, disabled, with the caption agreement.disabled. Under it, agreement.version in
   Inter 12 px #5E5E6A.
Variants:
- OnbAgreementBusiness: step bar 5 segments, four on; role card "As a client" then "For your business" (the business
  card lines), links include "Job posting rules".
- OnbAgreementReady: all three ticked; button enabled.
- OnbAgreementNed: the sheet with all eight N.E.D bullets, heading agreement.ned.heading, a Close button.
Check: three separate boxes, none ticked by default; the words "intermediary", "guaranteed", "safe" and "verified"
appear nowhere; the freelancer card's last-but-one bullet says "Lawyer to confirm" only in the board's notes, not on
screen.
```

### D5 · `SettingsAccount`, `SettingsAccountVN`

```
Create SettingsAccount (phone) by reusing the Settings board layout (title "Settings", the profile card, the grouped
white lists, the tab bar with Settings active). Replace the "Where you live" group with a "Your account" group
(copy deck C5), placed right under the profile card:
- Row 1: "Also work (freelancer)" with a switch (on).
- Row 2: "Also hire (client)" with a switch (on).
- Row 3: "Where you live", value "SG Singapore", chevron.
- Row 4: "Business", value "Lumen Studio · self-declared", chevron.
- Row 5: "Agreement", value "Version 1 · 10 Oct 2026", chevron.
Keep Preferences and Privacy & legal below. Move "Consent: view or withdraw" into the Agreement row: its detail page
has settings.agreementView and settings.agreementWithdraw. Draw it as a small inset on the board, not a new board.
Variant SettingsAccountVN:
- Also work on and disabled (it is the only role);
- Also hire off and disabled, with the caption settings.alsoHireVN;
- "Where you live" shows "VN Vietnam";
- no Business row.
Check: no toggle labelled "I live in Vietnam" remains; every row is ≥ 52 px; switches use the existing switch style.
```

### D6 · `SheetChangeCountry`, `SheetCountryBlocked`

```
Create two sheets over a dimmed SettingsAccount (phone). Copy deck C5.
- SheetChangeCountry:
  - title sheet.change.title;
  - body sheet.change.body;
  - a small "from → to" row: "SG Singapore → VN Vietnam" with code chips;
  - primary button "Change to Vietnam";
  - secondary button Cancel.
- SheetCountryBlocked:
  - a warning card style icon at the top;
  - title sheet.blocked.title;
  - body sheet.blocked.body with "2" contracts and "1" listing;
  - one primary button OK.
Check: neither sheet shows an amount; the body says destinations already fixed do not change.
```

### D7 · `WebAccountPrompt`, `WebRoleGate`

```
Create two web boards at 1280 × 800, reusing WebWorkspace (nav, page background, wallet panel position).
- WebAccountPrompt: the Workspace Overview dimmed, with a centred modal 480 px wide:
  - white, radius 24, padding 32, shadow S2 from Main;
  - title web.prompt.title (Space Grotesk 700 24 px) and body web.prompt.body;
  - three short steps with small numbered circles: "1 Your role", "2 Where you live", "3 The N.E.D Agreement";
  - primary button web.prompt.primary (opens the wallet panel);
  - text button web.prompt.later, with web.prompt.laterNote under it in caption style.
  Inset variant in the same board: the update copy web.prompt.update replaces the body.
- WebRoleGate: the /new page for a freelancer-only account in Singapore. Instead of the form:
  - an empty-state card (white, radius 20) with the "briefcase" icon;
  - title "Creating contracts is for clients" and body gate.clientNeeded;
  - primary button gate.openSettings (opens the wallet panel at Settings);
  - text link "Find work on N.E.D Jobs".
  Add a second inset showing the Vietnam variant with gate.clientNeededVN and no Open settings button.
Check: web boards use the Workspace typography and widths; no USDC amount on the Vietnam inset.
```

### D8 · Review and export

```
Review all the D30 boards together:
1. Same step bar, title, button and card styles as OnbConsent / OnbResidence / OnbProfile. Step bars are correct:
   - freelancer and individual client: Role 1/4 → Country 2/4 → Agreement 3/4 → Profile 4/4;
   - business: Role 1/5 → Country 2/5 → Business 3/5 → Agreement 4/5 → Profile 5/5.
2. Every string matches the copy deck exactly (C1–C6); list any line you had to shorten and why.
3. Search all boards for the banned words in D0. Check that no board shows USDC or SOL in a Vietnam context and
   that "self-declared" appears with every business name.
4. Export each board as <Name>.dc.html into docs/02-design/canvas-v2/, wrappers as wrappers. Add one row per board
   to canvas-v2/README.md under a new heading "D30 · roles, country, business, agreement (8 Oct)":
   | Board | Title | Build task (R4/R5/R6/R7) | Note |
5. Render the phone boards at 390 × 844 @2x into docs/02-design/screenshots/d30-boards/ for review.
Commit (Claude Code, on main): design: D30 boards (role, country, business, agreement, account settings, web prompt)
```
