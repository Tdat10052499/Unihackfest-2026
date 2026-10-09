# D30 boards · review renders (8 Oct 2026)

The phone boards of `../../canvas-v2/` (heading "D30 · roles, country, business, agreement"), rendered at 390 × 844 @2x for review. The two Settings boards are 754 × 844 because they include the Agreement-detail inset. `*-full` files show the whole scrolling screen (business form, agreement).

**How they were made:** a static preview of each `.dc.html` (template filled with the board's own sample values) in headless Chromium. The canvas runtime (`support.js`) is not in the repo. Two things differ from the canvas:
- The generated avatar (`dc-import name="Avatar"`) is blank in the Settings renders.
- The sheets load the Settings render underneath.

The web boards (`WebAccountPrompt`, `WebRoleGate`) are not rendered here. `WebAccountPrompt` imports the full `WebWorkspace` board, which this preview cannot run.

| File | Board | State |
| --- | --- | --- |
| `OnbRole` / `OnbRoleBusiness` / `OnbRoleUpdate` | Role | nothing chosen (1/4) · business (1/5) · existing user, update notice, no back |
| `OnbCountry` / `OnbCountryVN` / `OnbCountryVNClient` | Country | Singapore (2/4) · freelancer in Vietnam, VN note · client taps Vietnam, "Join as a freelancer?" sheet |
| `OnbBusiness(-full)` / `OnbBusinessError(-full)` | Business (3/5) | filled and valid · three errors, Continue disabled |
| `OnbAgreement(-full)` / `OnbAgreementBusiness(-full)` / `OnbAgreementReady` / `OnbAgreementNed` | Agreement | freelancer 3/4 · business client 4/5 · all ticked · N.E.D sheet |
| `SettingsAccount` / `SettingsAccountVN` | Settings → Your account | Mia, business client + freelancer in Singapore · Vinh in Vietnam |
| `SheetChangeCountry` / `SheetCountryBlocked` | Settings sheets | Singapore → Vietnam · blocked by 2 contracts and 1 listing |
