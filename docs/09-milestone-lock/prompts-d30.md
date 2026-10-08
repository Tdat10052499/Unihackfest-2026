# D30 code prompts: roles, country of residence, business details and the N.E.D Agreement (R0–R9)

**Owner:** PO (Hồ Du Tuấn Đạt) · **Written:** 8 Oct 2026 · **Design:** [`roles-and-agreement-plan.md`](roles-and-agreement-plan.md) · **Plan:** [`roles-and-agreement-build.md`](roles-and-agreement-build.md) (§ numbers below refer to it) · **Boards and copy deck:** [`prompts-d30-design.md`](prompts-d30-design.md)

## How to use

- **One prompt per session.** Open a **new** Claude Code session in the repo for each step and paste one prompt. Wait for its report and the "Done when" before the next step.
- **Between steps:** do the "PO check" listed under each prompt (5–10 minutes).
- **Order:**
  - R0 first.
  - R1 and R2 can run in parallel sessions. The design prompts D1–D8 can run at the same time.
  - R4 needs R1, R2 and the boards.
  - R5 and R6 need R4.
  - R7 needs R5 and R6.
  - R8 needs R7. R9 only after the CL review.
- **Timing:** after the final (10 Oct). If a step runs earlier, it must keep `FEATURES.accountRoles` **off**. The demo build must not change.

```
R0 ─┬─ R1 ─┐
    ├─ R2 ─┼─ R4 ─┬─ R5 ─┐
    └─ D1–D8 ┘     └─ R6 ─┴─ R7 ─ R8 ─ (CL review) ─ R9
```

## 0. Rules every D30 prompt refers to

Each prompt starts with "Follow prompts-d30.md section 0". These rules **add to** `prompts-6oct.md` section 0, which still applies: main only, never commit keys, copy rules, motion tokens, end-of-step report.

1. **Work on `main`.** Run `git switch main && git pull --ff-only origin main` before the step. Push after the tests pass. Never force-push.
2. **The flag.** Every behaviour change is behind `FEATURES.accountRoles` (core `CORE_FEATURES.accountRoles`, wallet `EXPO_PUBLIC_FEATURE_ACCOUNT_ROLES`, Workspace `VITE_FEATURE_ACCOUNT_ROLES`).
   - With the flag off, the app must behave exactly as today, and today's tests must still pass unchanged.
   - Never turn the flag on in a committed default before R9.
3. **Naming.** The account-level types are `AccountRole`, `ClientKind`, `AccountProfile`.
   - Never reuse `Role`: it is the per-contract client/freelancer role in `milestone/view.ts`.
   - Keep `Region` (`'vn' | 'intl'`) as the money-view switch, derived from the country.
4. **Copy.**
   - Every user-facing string comes from `packages/ned-core/src/account/copy.ts` or `legal/agreement.ts`, which are filled from the copy deck in `prompts-d30-design.md` §C. Never type copy inline in a screen.
   - Banned words (design §6, also enforced by the R2 test): payment / pay for USDC, escrow, intermediary, trung gian, guaranteed, safe, protected, verified (user or business), trusted, employer, employee, salary.
5. **Residence rules.**
   - Vietnam → freelancer only.
   - A business registered in Vietnam cannot be a client.
   - No geolocation and no IP lookup.
   - The program does not check roles, so never write that it does.
6. **Personal data.**
   - Country, role and business details stay on the device (`@ned_account_v1`) in Phase 1. Nothing new goes on-chain, into a URL, or to a third party.
   - The registration number never leaves the device.
   - Sign-out clears the profile but keeps the agreement log.
7. **Tests.**
   - core: `cd packages/ned-core && npm test`.
   - wallet: `cd ned-wallet && npm test` (node --test, services level; there are no screen tests).
   - Workspace: `cd ned-workspace && npm test && npm run test:ui`.
   
   Run the suites of every package you touched, with the flag off **and** on where the step says so.
8. **Stop and report** instead of guessing in any of these cases:
   - a board or a copy-deck line is missing;
   - the plan and the code disagree;
   - a step would need a program change, a dashboard change or a deploy.
9. **End of step.** Add a row to "Milestone Lock — progress" in `docs/tong-hop-tien-do.md` (Vietnamese) with the step id, commits, test results and open issues. Then write a short report: what changed, the test results, the PO check, anything left.

---

## R0 · Pre-flight, flag and scaffolding

```
Follow docs/09-milestone-lock/prompts-d30.md section 0.
Read: docs/09-milestone-lock/roles-and-agreement-plan.md (D30), roles-and-agreement-build.md §0–§2,
packages/ned-core/src/features.ts, packages/ned-core/src/index.ts, ned-wallet/constants/features.ts,
ned-workspace/src/config.ts, ned-workspace/src/vite-env.d.ts, commit e68e755 (how lockAtHire was added).
Task:
1. CORE_FEATURES.accountRoles = false, comment "D30 roles and agreement; off until the CL sign-off (prompts-d30.md R9)".
2. Wallet FEATURES.accountRoles = process.env.EXPO_PUBLIC_FEATURE_ACCOUNT_ROLES === undefined
   ? CORE_FEATURES.accountRoles : process.env.EXPO_PUBLIC_FEATURE_ACCOUNT_ROLES === 'true'.
   Workspace FEATURES.accountRoles from VITE_FEATURE_ACCOUNT_ROLES the same way; type it in vite-env.d.ts.
3. Empty modules with a header comment (purpose + "D30, behind accountRoles"): packages/ned-core/src/account/
   {index,types,rules,countries,copy}.ts and packages/ned-core/src/legal/agreement.ts; export account from
   packages/ned-core/src/index.ts.
4. Run the core, wallet and Workspace tests.
Commit: chore: D30 flag accountRoles (off) and core account scaffolding
Done when: every suite passes; grep -rn "accountRoles" shows only the three flag definitions.
```

**PO check:** open the live Workspace preview (or `npm run web`). Nothing should look different.

## R1 · Core: account model, countries and rules

```
Follow docs/09-milestone-lock/prompts-d30.md section 0.
Read: roles-and-agreement-build.md §2 and §4, roles-and-agreement-plan.md §2–§3, prompts-d30-design.md §C (copy deck
C1–C3, C5, C6), packages/ned-core/src/jobs/taxonomy.ts (JOB_CATEGORIES, JOB_CATEGORY_COUNT),
packages/ned-core/src/milestone/view.ts (Region, and Role which must not be reused).
Task:
1. account/types.ts: AccountRole, ClientKind, CountryCode, TeamSize, BusinessDetails, AccountProfile, AgreementRecord,
   exactly as in build §2. TEAM_SIZES = [{id:'solo',label:'Just me'},{id:'2-10',label:'2–10'},{id:'11-50',label:'11–50'},
   {id:'51-200',label:'51–200'},{id:'200+',label:'200+'}].
2. account/countries.ts:
   - COUNTRIES: a static readonly array of { code, name } for every ISO 3166-1 alpha-2 country, English short
     names, sorted by name;
   - SANCTIONED: readonly CountryCode[] = [], with the comment "// lawyer before launch";
   - isCountry, countryName, searchCountries(query): case- and accent-insensitive, matching the code or the name;
     the result excludes SANCTIONED.
   No dependency, no Intl.DisplayNames.
3. account/copy.ts: every key of the copy deck C1, C2, C3, C5 and C6 as named exports, grouped as objects
   (ROLE_COPY, COUNTRY_COPY, BUSINESS_COPY, SETTINGS_COPY, WEB_COPY, GATE_COPY), with {placeholders} replaced by small
   format functions. Copy each string exactly.
4. account/rules.ts:
   - regionFromCountry, canBeClient, canRegisterBusinessIn;
   - validateBusiness → { field, message }[], using the copy;
   - validateProfile;
   - capabilities(profile | null) → { createContract, lock, postJob, selectApplicant, apply, accept, submit,
     region }. A null profile gives today's behaviour (freelancer + 'vn');
   - canChangeCountry(profile, next, { clientContracts, listings }) → { ok } | { ok:false, reason, copy }.
5. Tests in packages/ned-core/src/account/__tests__/:
   - rules.test.ts: every rule; every row of build §4; a VN profile cannot hold the client role; a business
     registered in VN fails;
   - countries.test.ts: unique codes; 'VN' present; sorted by name; "viet", "VIET" and "vn" find Vietnam;
     SANCTIONED is filtered;
   - copy.test.ts: no banned word (section 0 rule 4) in any account copy.
Do not touch the wallet or the Workspace.
Commit: feat(core): D30 account model, country list and role rules (behind accountRoles)
Done when: npm test in packages/ned-core passes.
```

**PO check:** read `account/copy.ts` next to the copy deck. The wording should match word for word.

## R2 · Core: the agreement, consent v3 and the legal drafts (for the CL)

```
Follow docs/09-milestone-lock/prompts-d30.md section 0.
Read: prompts-d30-design.md §C4 (agreement copy and the four cards, verbatim), roles-and-agreement-plan.md §5, §6, §8,
roles-and-agreement-build.md §8, docs/05-legal/pre-pitch-check-7oct.md §14.2 (what Privacy and consent must add),
packages/ned-core/src/legal/copy.ts and legal/__tests__/copy.test.ts, ned-wallet/stores/useConsentStore.ts,
ned-workspace/src/hooks/consent.ts, ned-wallet/app/(onboarding)/consent.tsx (CONSENT_SCOPE, CONSENT_TEXT),
packages/ned-core/src/milestone/evidence.ts (how core imports sha256).
Task:
1. legal/agreement.ts, with the header "Draft for CL review (D30); not live until R9":
   - AGREEMENT_VERSION = 1; AGREEMENT_COPY (C4 table);
   - FREELANCER_CARD, CLIENT_CARD, BUSINESS_CARD, NED_CARD ({ heading, countOn[], agreeTo[] } or { heading, items[] }),
     verbatim from C4;
   - AGREEMENT_CHECKS: the 3 checkbox texts;
   - agreementCards(profile): the cards for the profile's roles, in the order freelancer, client, business, ned;
   - agreementText(profile, versions): the exact text shown, joined with "\n", used for the hash;
   - agreementHash(text): sha256 hex with sha256 from '@noble/hashes/sha2.js'.
2. Consent version in one place:
   - consentVersion(accountRoles: boolean) returns 3 when on and 2 when off;
   - CONSENT_SCOPE_V3 = today's scope + 'country', 'role', 'business-details', 'jobs-public';
   - ned-wallet/stores/useConsentStore.ts and ned-workspace/src/hooks/consent.ts import consentVersion(FEATURES.accountRoles)
     instead of keeping their own number. Existing tests keep passing with the flag off.
3. New legal docs, live text unchanged:
   - TERMS_V12_HEADING ("N.E.D terms of use · version 1.2 · draft") and TERMS_V12 = today's TERMS plus these sections:
     "Who we are" (OPERATOR_NAME), "Your role and where you live" (self-declared; you are responsible), "Rights and
     duties" (the cards), "Limit of responsibility", "Misuse", "Changes" (re-acceptance), "Contact" (TEAM_EMAIL),
     "Law" (GOVERNING_LAW);
   - PRIVACY_V2_HEADING and PRIVACY_V2 = today's PRIVACY plus the CL §14.2 items (cross-border transfer to Dynamic,
     Helius, Vercel, GitHub in the US and Solana nodes worldwide; retention; the rights to access, correct, delete,
     restrict, object and complain, and how blockchain data limits deletion; 18+; residence self-declared; the purpose
     of the phone number; N.E.D Jobs data). Add "Country, role and business details are kept on this device".
   - OPERATOR_NAME = '[operator]'; GOVERNING_LAW = '[governing law]'.
   - legalDocs(disputesOn, accountRoles = false) returns the v1.2/v2 docs only when accountRoles is true.
4. Tests:
   - legal/__tests__/agreement.test.ts: the hash is stable for the same input and changes with role, country and
     version; a business gets four cards; check texts present;
   - copy.test.ts: banned words over TERMS_V12, PRIVACY_V2 and every agreement string;
   - a test that fails when accountRoles is true and OPERATOR_NAME or GOVERNING_LAW is still a placeholder (it runs
     with an explicit true argument and is expected to fail until R9; mark it test.todo while the flag is off).
5. Append to docs/05-legal/pre-pitch-check-7oct.md: "## D30 copy for CL review (R2)", listing each new constant, its
   file path and what the CL needs to decide (design §9 questions 1–3).
Commit: feat(core): D30 agreement, consent v3 and Terms v1.2 / Privacy v2 drafts (flag off, for CL review)
Done when: core, wallet and Workspace suites pass with the flag off.
```

**PO check:** send the CL the new section in `pre-pitch-check-7oct.md`. Answer design §9 Q1 (operator) and Q2 (law) there.

## R3 · Design boards

R3 is the design track: [`prompts-d30-design.md`](prompts-d30-design.md), **D0–D8**, run by the Designer in the canvas.

Its last step (D8) is a Claude Code commit that exports the boards to `docs/02-thiet-ke/canvas-v2/` and adds the README rows. R4–R7 read those boards.

## R4 · Wallet: the new onboarding (behind the flag)

```
Follow docs/09-milestone-lock/prompts-d30.md section 0.
Read: roles-and-agreement-build.md §2–§3; the boards OnbRole*, OnbCountry*, OnbBusiness*, OnbAgreement* in
docs/02-thiet-ke/canvas-v2/; ned-wallet/AGENTS.md (Expo v57 docs, useAuth only); ned-wallet/services/onboarding.ts
(resolveOnboarding, onboardingRoute, the V2 rule "consent before the faucet"); ned-wallet/app/(onboarding)/
{_layout,setup,consent,residence,profile,fund}.tsx; ned-wallet/components/onboarding/ui.tsx (OnbScreen, StepHeader,
PrimaryButton, NoticeCard); ned-wallet/stores/{useConsentStore,useRegionStore}.ts; ned-wallet/app/_layout.tsx
(PUBLIC_SEGMENTS, OnboardingGate); packages/ned-core/src/account/* and legal/agreement.ts.
Task:
1. stores/useAccountStore.ts (zustand persist, AsyncStorage '@ned_account_v1', same pattern as useRegionStore):
   - state: profiles: Record<wallet, AccountProfile>; agreements: Record<wallet, AgreementRecord[]> (append-only log);
   - actions: setProfile, clearProfile, acceptAgreement, withdrawAgreement, getProfile, getAgreement(wallet) (the
     latest record that is not withdrawn, at AGREEMENT_VERSION and the current consent version);
   - waitForAccountHydration().
2. stores/useSignupDraft.ts: in memory only (no persist). Holds the draft profile between the steps.
3. Screens app/(onboarding)/role.tsx, country.tsx, business.tsx and agreement.tsx:
   - build each one from its board with components/design and the tokens; never paste board HTML;
   - StepHeader totals are 4, or 5 for a business;
   - Country: the search uses searchCountries; choosing VN while the draft has a client role opens the
     "Join as a freelancer?" sheet;
   - Business: uses validateBusiness;
   - Agreement: the cards come from agreementCards(draft); the three checkboxes start unticked; the button stays
     disabled until all three are ticked; Terms, Privacy and Disclosures (and Job posting rules for a business) open
     the existing legal routes.
4. On "Agree and continue", write in this order:
   - useConsentStore.accept(wallet, CONSENT_SCOPE_V3, 3);
   - useAccountStore.setProfile;
   - acceptAgreement with { agreementVersion, consentVersion: 3, roles, country, acceptedAt,
     textSha256: agreementHash(agreementText(...)) };
   - useRegionStore.setRegion(wallet, regionFromCountry(country)).
   Then router.replace('/setup').
5. services/onboarding.ts, when FEATURES.accountRoles is on:
   - steps 'role' | 'country' | 'business' | 'agreement' | 'fund' | 'profile' | 'home';
   - new wallet: role → country → business (business only) → agreement → fund (if SOL is short) → profile → home;
   - returning wallet: the missing ones of role/country/business/agreement, then home.
   The agreement step always comes before fund. With the flag off, keep the current function body unchanged (branch
   at the top). onboardingRoute maps the new steps; residence.tsx redirects to /country when the flag is on.
6. Tests (node --test, services/__tests__/onboarding.d30.test.ts, stores mocked): order with the flag off (unchanged)
   and on (freelancer, individual client, business); returning wallet with a reverse record and no profile; the
   agreement comes before fund; the write order on Agree; a VN draft with a client role cannot reach agreement.
Commit: feat(wallet): D30 onboarding (role, country, business, agreement) behind accountRoles
Done when: npm test passes. With EXPO_PUBLIC_FEATURE_ACCOUNT_ROLES=true npm run web, a new Google account goes
role → country → (business) → agreement → profile → home. With the variable unset, the old flow runs.
```

**PO check:** with the flag on, sign up 3 test accounts (freelancer in Vietnam, client in Singapore, business in Singapore) and compare each screen with its board. With the flag off, the old flow still runs.

## R5 · Wallet: role gates and Settings "Your account"

```
Follow docs/09-milestone-lock/prompts-d30.md section 0.
Read: roles-and-agreement-build.md §4–§5; packages/ned-core/src/account/rules.ts (capabilities, canChangeCountry);
boards SettingsAccount, SettingsAccountVN, SheetChangeCountry, SheetCountryBlocked; the gates
ned-wallet/app/contracts/new.tsx:58,88, app/contracts/[fund]/lock.tsx:27,53,128, app/contracts/[fund]/index.tsx:75,
app/contracts/index.tsx:43,148, app/(tabs)/index.tsx:82,394-397; app/settings.tsx:59-62,113-128;
ned-wallet/hooks/useFunds.ts; packages/ned-core/src/jobs/queries.ts; ned-wallet/services/storage.ts (sign-out);
ned-wallet/services/signOutKeys.ts and its test.
Task:
1. hooks/useCapabilities.ts: flag on → capabilities(useAccountStore profile); flag off → today's region-only booleans
   (client actions = !vn), so the call sites read the same shape either way.
2. Replace each "vn" check that guards a client action (create, lock, the client empty state, New contract buttons)
   with the capability. Keep region for the money view. When an action is refused, use the GATE_COPY messages. If a
   client-only user opens an invite, show "Also work" before Accept.
3. Settings, flag on: a "Your account" group in place of "Where you live", built from the board:
   - roles switches (keep at least one on; Also hire disabled for VN);
   - "Where you live": the country screen in edit mode, then canChangeCountry. Count open client contracts with
     useFunds('client') (not Settled/Closed) and open listings with the jobs queries (Open or Selected, poster =
     wallet). Show SheetCountryBlocked when blocked, otherwise SheetChangeCountry. Confirming updates the profile
     and the region. This closes D17;
   - Business: the business form in edit mode;
   - Agreement: version and date; "View what you agreed to" (agreementText for the saved record); "Withdraw and sign
     out" (withdrawAgreement + today's withdraw flow).
   Flag off: today's toggle, unchanged.
4. Sign-out (services/storage.ts): clear profiles[wallet], including business details (state and storage, as region
   is cleared). Keep the agreements log. Update signOutKeys.test.ts.
5. Tests: capabilities.test.ts (both flag states, every row of build §4); settingsAccount.test.ts (canChangeCountry
   with 0 and with open contracts or listings, the at-least-one-role rule); the sign-out test.
Commit: feat(wallet): D30 role gates and Settings "Your account" (closes D17 behind the flag)
Done when: npm test passes with the flag off and on.
```

**PO check:**
- Flag on, freelancer in Singapore: New contract is hidden. Turn on Also hire, and it appears.
- With an open client contract, change the country to Vietnam: the blocked sheet appears.

## R6 · Workspace and N.E.D Jobs

```
Follow docs/09-milestone-lock/prompts-d30.md section 0.
Read: roles-and-agreement-build.md §1, §4, §6; boards WebAccountPrompt, WebRoleGate; ned-workspace/src/hooks/
{region,consent}.ts; src/components/{RegionPrompt,ConsentGate,WalletPanelContext,WalletPanel,WorkspaceNav}.tsx;
src/Layout.tsx; src/jobs/JobsLayout.tsx; src/pages/{NewContract,Overview,Contract}.tsx;
src/jobs/pages/{PostJob,Applicants,JobDetail,Overview}.tsx; packages/ned-core/src/jobs/actions.ts (the VN throw in
postJob stays).
Task (everything behind FEATURES.accountRoles; flag off = today):
1. hooks/account.ts: read '@ned_account_v1' from localStorage (same origin as /wallet) with the storage event and
   the same 3 s fallback as hooks/consent.ts. useAccount() returns { profile, agreement, capabilities, needsSetup,
   isUpdate }.
2. components/AccountPrompt.tsx (board WebAccountPrompt) replaces RegionPrompt when the flag is on (Layout.tsx:23,
   JobsLayout.tsx:101). It shows when needsSetup; "Open in wallet" opens the wallet panel at /role (/role?update=1
   when isUpdate). "Later" closes it for the session and shows web.prompt.laterNote.
3. WalletPanelContext: ensureAccount() next to ensureConsent().
   - Client actions (create, Lock in wallet CTA, post, select) need capabilities.createContract / lock / postJob /
     selectApplicant.
   - Apply needs capabilities.apply.
   - A refusal shows the GATE_COPY message with "Open settings" (wallet panel at /settings) or "Also work".
4. Entry points for non-clients:
   - hide the New contract buttons (WorkspaceNav, Overview quick actions, WalletPanel);
   - hide Post a job (JobsLayout :162, :211, :236);
   - the jobs Overview audience comes from the role;
   - NewContract and PostJob render the WebRoleGate state when opened by URL (the VN variant for VN residents).
5. Applicants: Select needs poster wallet AND capabilities.selectApplicant. JobDetail ApplyCard: "Also work" for a
   client-only account.
6. On the user's own job cards and the contract header where they are the business: "Lumen Studio · Business ·
   self-declared" (badge.business). Phase 1: own device only.
7. Tests (vitest): accountPrompt.test.tsx (shows, Later, update copy), gates.test.tsx (NewContract, PostJob,
   Applicants select, ApplyCard for freelancer-only, client-only, VN, business), hooks/account.test.ts (storage
   event).
Commit: feat(workspace): D30 account prompt and role gates in the Workspace and N.E.D Jobs (behind accountRoles)
Done when: npm test && npm run test:ui pass with the flag off and on.
```

**PO check:** run the Workspace locally with both flags on.
- A freelancer-only account sees the gate on `/new` and `/jobs/new`.
- A client-only account gets "Also work" on Apply.
- With the flags off, everything is as today.

## R7 · Existing users

```
Follow docs/09-milestone-lock/prompts-d30.md section 0.
Read: roles-and-agreement-build.md §6; board OnbRoleUpdate; ned-wallet/services/onboarding.ts; ned-wallet/hooks/useFunds.ts;
packages/ned-core/src/jobs/queries.ts; ned-workspace/src/components/AccountPrompt.tsx.
Task (flag on only):
1. resolveOnboarding: a wallet with a ReverseRecord and no AccountProfile, or with an agreement below the current
   version, goes to 'role' with update=1. Every existing wallet passes through here once.
2. Preselection when update=1, read once at the start:
   - region 'vn' → freelancer + VN;
   - region 'intl' → roles from history: created a contract or posted a listing → client; accepted a contract or
     applied → freelancer; both → both; none → nothing preselected. The country stays empty.
   Show role.update on the role screen (board OnbRoleUpdate). Only preselect; the user confirms each screen.
3. The agreement step is always shown (consent v3). After Agree, return to where the user was going (keep today's
   PendingInviteGate behaviour).
4. Tests (services level): preselection for vn, intl client, intl freelancer, intl both, no history; an older
   agreement version sends the user to update; the flag off never sends anyone to update.
Commit: feat(wallet): D30 update flow for existing users (preselect from region and history)
Done when: npm test passes in ned-wallet and ned-workspace.
```

**PO check:**
- Flag on, sign in with one of the old demo accounts. The update banner shows, the preselection is right, and after Agree the contracts are still there.

## R8 · Tests, docs and the manual run

```
Follow docs/09-milestone-lock/prompts-d30.md section 0.
Read: roles-and-agreement-build.md §7 and §9, docs/09-milestone-lock/product-spec.md (screens, §6 word table),
docs/09-milestone-lock/system-tracker.md, docs/tong-hop-tien-do.md.
Task:
1. Run every suite (core, wallet, Workspace incl. vitest) with the flag off and on. Fix only D30 regressions.
2. Manual run with both flags on (EXPO_PUBLIC_FEATURE_ACCOUNT_ROLES=true npm run web in ned-wallet;
   VITE_FEATURE_ACCOUNT_ROLES=true npm run dev in ned-workspace):
   a. new freelancer in Vietnam;
   b. new business client in Singapore;
   c. an existing v2 account (update flow);
   d. a VN account opening /new and /jobs/new by URL.
   Save screenshots (phone 390 × 844, Workspace 1280 wide) to docs/02-thiet-ke/screenshots/d30/, with no personal
   e-mail on screen.
3. product-spec.md:
   - add the screens (Role, Country, Business, Agreement, Your account);
   - add to the word table: self-declared, Also hire, Also work, Your account, and the "do not write" list from
     design §6.
4. system-tracker.md: rows for R0–R8, and the open items (operator name, governing law, the rights-to-work line,
   Phase 2).
5. Progress rows R0–R8 in docs/tong-hop-tien-do.md.
Commit: docs: D30 build recorded (R0–R8), product-spec screens and word table, screenshots
Done when: all suites pass in both flag states; the four paths are recorded with screenshots.
```

**PO check:** look through the screenshots against the boards. Then send the CL the R8 commit for the final copy review.

## R9 · CL review and rollout

```
Follow docs/09-milestone-lock/prompts-d30.md section 0.
Read: roles-and-agreement-build.md §8–§9; the CL reply to "D30 copy for CL review" in docs/05-legal/pre-pitch-check-7oct.md
(or the newer CL file it points to); the PO's answers to design §9 Q1–Q3.
Stop at once if the CL reply or the PO answers are missing.
Task:
1. Apply the CL's copy edits:
   - to the copy deck in prompts-d30-design.md §C first, then account/copy.ts, legal/agreement.ts, TERMS_V12 and
     PRIVACY_V2 (word for word);
   - set OPERATOR_NAME and GOVERNING_LAW;
   - remove test.todo from the placeholder test.
   Every suite passes with the flag on.
2. Turn the flags on in a Vercel preview (Workspace and the /wallet build) and repeat the four manual paths from R8.
3. Production: set CORE_FEATURES.accountRoles = true, or the two env variables (the PO says which). Deploy both
   builds from the same commit. Re-check that the live demo accounts see the update flow once and keep their
   contracts.
4. Record it:
   - decision log D30: status "accepted <date>", with the commits;
   - README "On the phone" table: a "Roles and agreement" row;
   - docs/05-legal/: a short note to the CL with the commit list;
   - progress row R9.
Commit: feat: D30 roles and agreement live (CL ok <date>)
```

**PO check:** sign in on the live app with a fresh account. The new flow shows, and the Terms page shows version 1.2 with the operator name.

---

## Progress row template (`docs/tong-hop-tien-do.md`)

```
| R<n> D30 <short name> | <commits> | core x/x · wallet x/x · workspace x/x (flag off) · … (flag on) | <open issues or "—"> |
```
