# D30 build plan: account roles, country of residence, business details and the N.E.D Agreement (prompts R0–R9)

**Owner:** PO (Hồ Du Tuấn Đạt) · **Written:** 8 Oct 2026 · **Design:** [`roles-and-agreement-plan.md`](roles-and-agreement-plan.md) (D30) · **Base:** `main` after plan A (`prompts-final-fixes-8oct.md`)

## 0. When and how

**When:** after the final (10 Oct). The demo build must not change before then.
- If the team starts earlier, every change sits behind **`FEATURES.accountRoles`**, which defaults to **off** in core, wallet and Workspace.
- Production keeps the flag off until R9. That gate needs the CL sign-off on the copy (§8 of the design) and the PO's answer to design §9 question 1: who "N.E.D" is in the contract.

**How:** one Claude Code session per prompt, on `main`.
- Follow `prompts-6oct.md` section 0: `git switch main && git pull --ff-only origin main`.
- Small conventional commits; run the tests of every package the step touches; push.
- Add one progress row per step in `docs/tong-hop-tien-do.md`.
- Never put keys, invite fragments or `.env` values in the repo.

**Order:**

```
R0 flag + scaffolding ─┬─ R1 core: account model, countries, rules ─┬─ R4 wallet onboarding ─ R5 wallet gates + Settings ─┐
                       ├─ R2 core: agreement + legal copy (CL)       ├─ R6 Workspace + N.E.D Jobs ──────────────────────┤
                       └─ R3 design boards (Designer)                └─ R7 existing users (migration) ──────────────────┴─ R8 tests + docs ─ R9 CL review + rollout
```

R1, R2 and R3 can run in parallel. R4 needs R1 and R2. R6 needs R1 and R2. R7 needs R4. Phase 2 (program v1.5, §11) starts only after a lawyer has answered design §9.

## 1. What changes, by area

| Area | Today (8 Oct audit) | After D30 |
| --- | --- | --- |
| **Core** `packages/ned-core` | `Region = 'vn' \| 'intl'` (`milestone/view.ts:15`); per-contract `Role = 'client' \| 'freelancer'` (`view.ts:14`); no country data | New module `src/account/`: `AccountRole`, `ClientKind`, `CountryCode`, `COUNTRIES`, `BusinessDetails`, `AccountProfile`, rules (`regionFromCountry`, `canBeClient`, `capabilities`), agreement copy and hash. **Never reuse the name `Role`**, which is taken per contract |
| **Legal copy** `src/legal/copy.ts` | Terms v1.1, Privacy v1, a single bundled consent text in the wallet (`consent.tsx:26`) | `src/legal/agreement.ts`: the agreement cards per role (design §8), 3 checkbox texts, `AGREEMENT_VERSION = 1`. Terms v1.2 and Privacy v2 (D14 items, country, role, business details) as **new constants**, used only when the flag is on |
| **Wallet onboarding** `app/(onboarding)/` | welcome → setup → consent (1 tick) → fund → profile → residence → home | welcome → setup → **role → country → business (client business) → agreement (3 ticks)** → fund → profile → home. `residence.tsx` redirects to `/country` when the flag is on |
| **Wallet stores** | `@ned_region_v1`, `@ned_consent_v1` (v2) | New `@ned_account_v1` (`useAccountStore`: profile and agreement log per wallet). Region is still written, derived from the country. Consent becomes **v3** |
| **Wallet gates** | `vn` checks: `contracts/new.tsx:58,88`, `[fund]/lock.tsx:27,53`, `[fund]/index.tsx:75`, `contracts/index.tsx:43,148`, `(tabs)/index.tsx:82,394` | `useCapabilities()`: `createContract`, `lock`, `postJob`, `selectApplicant` need the client role; `accept` and `submit` need the freelancer role. The money view still uses region |
| **Wallet Settings** | "I live in Vietnam" toggle without a confirm (`settings.tsx:59-62`, D17) | "Your account": roles (**Also hire / Also work**), country (guarded change, closes D17), business details, agreement record, withdraw |
| **Workspace** | `RegionPrompt` (`Layout.tsx:23`, `JobsLayout.tsx:101`); `ConsentGate`; `hooks/consent.ts` mirrors v2; `ensureConsent()` in `WalletPanelContext.tsx:98-106` | `AccountPrompt` replaces `RegionPrompt` (opens the wallet panel at `/role`); `hooks/account.ts` reads `@ned_account_v1`; consent mirror v3; `ensureAccount()` before client and freelancer actions |
| **N.E.D Jobs** | Post blocked for `vn` only (`PostJob.tsx:101-103`, core `jobs/actions.ts:78`); Applicants gated by poster wallet | Post and Select need the client role; Apply needs the freelancer role (offers "Also work"); the job card shows "Business · self-declared" (Phase 2 for other people's devices) |
| **Design** `docs/02-thiet-ke/canvas-v2/` | `OnbConsent`, `OnbResidence`, `Settings` | New boards `OnbRole`, `OnbCountry`, `OnbBusiness`, `OnbAgreement` (+ VN and business variants), `SettingsAccount`, `WebAccountPrompt` |
| **Docs** | D30 proposed | D30 accepted, product-spec screens and word table, tracker, progress rows, CL file |
| **Program** | Profile = username + phone flag | **Phase 2 only (v1.5):** BusinessCard PDA, encrypted settings note, agreement memo |

## 2. Data model (core, R1)

```ts
// packages/ned-core/src/account/types.ts
export type AccountRole = 'freelancer' | 'client';
export type ClientKind = 'individual' | 'business';
export type CountryCode = string;                 // ISO 3166-1 alpha-2, upper case, from COUNTRIES
export type TeamSize = 'solo' | '2-10' | '11-50' | '51-200' | '200+';

export interface BusinessDetails {
  name: string;                 // 2–80
  registeredIn: CountryCode;    // never 'VN'
  size: TeamSize;
  industry: number;             // JOB_CATEGORIES index (jobs/taxonomy.ts)
  website?: string;             // https URL
  title?: string;               // the person's role in the business, ≤ 60
  registrationNo?: string;      // device only, never on-chain, ≤ 40
}

export interface AccountProfile {
  version: 1;
  freelancer: boolean;
  client: null | { kind: ClientKind };
  country: CountryCode;
  business?: BusinessDetails;   // required when client.kind === 'business'
  updatedAt: number;            // unix ms
}

export interface AgreementRecord {
  agreementVersion: number;     // AGREEMENT_VERSION
  consentVersion: number;       // CONSENT_VERSION (3)
  roles: { freelancer: boolean; client: ClientKind | null };
  country: CountryCode;
  acceptedAt: number;
  textSha256: string;           // hash of the exact text shown (agreementText())
  withdrawnAt?: number;
}
```

**Rules** (`account/rules.ts`, pure, tested):

| Function | Rule |
| --- | --- |
| `regionFromCountry(c)` | `'VN'` gives `'vn'`; anything else gives `'intl'` |
| `canBeClient(country)` | `country !== 'VN'` |
| `canRegisterBusinessIn(c)` | `c !== 'VN'` |
| `validateProfile(p)` | At least one role. A client needs `canBeClient`. A business client needs `business` and `validateBusiness`. A Vietnam resident has `freelancer: true` and `client: null` |
| `validateBusiness(b)` | Lengths as above; `https://` URL only; `registeredIn` is in `COUNTRIES` and not VN; `industry` < `JOB_CATEGORY_COUNT` |
| `capabilities(p)` | `{ createContract, lock, postJob, selectApplicant }` = client; `{ accept, submit, apply }` = freelancer; `{ moneyView: region }`. `null` profile → freelancer + vn (today's default) |
| `canChangeCountry(p, next, open)` | Moving to VN while `open.clientContracts + open.listings > 0` is refused with a reason |
| `SANCTIONED: readonly CountryCode[] = []` | Empty in the pilot, with a `// lawyer` note; `COUNTRIES` filters it |

**Countries** (`account/countries.ts`): a static list of `{ code, name }` in English, sorted by name, with no runtime dependency. `Intl.DisplayNames` is not reliable on Hermes. Put Vietnam first in the picker only for the search hint, never pre-selected.

## 3. Screens and copy (wallet, R4)

Product copy is in English and follows the word table. Every string lives in core (`account/copy.ts`), so the Workspace and the copy tests use the same text.

| Route | Board | Content | StepHeader |
| --- | --- | --- | --- |
| `/(onboarding)/role` | `OnbRole` | Title **"How will you use N.E.D?"** Three cards: **I do the work** (Freelancer) · **I hire, for myself** (Client) · **I hire for a business** (Client, business). Line: "You can add the other role later in Settings, unless you live in Vietnam." | 1 / 4 (business: 1 / 5) |
| `/(onboarding)/country` | `OnbCountry` | Title **"Where do you live now?"** Search list. Hint: "Where you live, not your nationality. This decides how your money is shown." Choosing Vietnam with a client role shows: **"Clients lock USDC, and N.E.D does not offer USDC to people who live in Vietnam. You can join as a freelancer and receive VND."** with buttons **Continue as a freelancer** / **Choose another country** | 2 / 4 |
| `/(onboarding)/business` | `OnbBusiness` | Title **"About your business"**. Fields from §2. Note: **"N.E.D does not check these details. Freelancers will see them marked 'self-declared'."** Registration country VN is refused with the same line as above | 3 / 5 |
| `/(onboarding)/agreement` | `OnbAgreement` | The role card(s) (design §8.2 / §8.3), the "What N.E.D does and does not do" card (§8.4), links to Terms, Privacy, Disclosures (and Job posting rules for clients), 3 unticked checkboxes (design §5), button **Agree and continue**, disabled until all 3 are ticked | 3 / 4 (business 4 / 5) |
| `/(onboarding)/profile` | `OnbProfile` | Unchanged (create_profile) | 4 / 4 (5 / 5) |

**Order in `services/onboarding.ts` when the flag is on:**
- No ReverseRecord: role → country → business (client business only) → agreement → fund (silent) → profile → home.
- ReverseRecord present (returning user): the missing steps out of role → country → business → agreement, then home.

The rule that consent comes before anything that sends the wallet address to a third party still holds: agreement comes before fund.

**Writing on Agree:**
1. `useConsentStore.accept(wallet, scope, 3)`, with the scope extended by `'country'`, `'role'`, `'business-details'` and `'jobs-public'`.
2. `useAccountStore.setProfile(wallet, profile)`.
3. `useAccountStore.acceptAgreement(wallet, record)`, with `textSha256 = sha256(agreementText(profile))`.
4. `useRegionStore.setRegion(wallet, regionFromCountry(country))`.

## 4. Gates (R5 wallet, R6 Workspace)

| Action | Today | After (flag on) | Message when hidden or refused |
| --- | --- | --- | --- |
| Create contract (`/new`, wallet and Workspace) | `!vn` | `cap.createContract` | Freelancer outside VN: "Add the client role in Settings to create contracts." VN: today's blocked view |
| Slide to lock | `!vn` | `cap.lock` and the user is this contract's client | same |
| Post a job (`/jobs/new`, nav buttons, core `postJob`) | `!vn` (+ core throw) | `cap.postJob` (core keeps its VN throw) | same |
| Select applicant / fund_job | poster wallet | poster wallet **and** `cap.selectApplicant` | same |
| Apply (`JobDetail` ApplyCard) | signed in + consent | `cap.apply` | "Add the freelancer role to apply." with **Also work** (VN residents always have it) |
| Accept a contract | anyone invited | `cap.accept`; a client-only user sees **Also work** first | — |
| Money view, regionGuard, VND path | region | unchanged (region derived from country) | — |

**Important:** these are UI gates. The program does not know roles or residence (design §3), so the copy and the pitch never say it does.

## 5. Settings → "Your account" (R5)

- **Roles:** two switches, **Also hire** and **Also work**. At least one stays on. Also hire is disabled for VN residents (with the line from §3). Turning on Also hire as a business opens the business form.
- **Country:**
  - opens the country screen in edit mode;
  - `canChangeCountry` blocks a move to VN while the user has open client contracts or listings;
  - every change asks to confirm, which closes D17: **"Your money view will change. Destinations already fixed in your contracts do not change."**
- **Business details:** edit form, with the "self-declared" note.
- **Agreement:**
  - shows "Agreed to version N on <date>", with **View** (the text that was shown, rebuilt from the version) and **Withdraw**;
  - Withdraw keeps today's behaviour: sign out, keep the log.
- **Sign-out:**
  - clears `profile` and `business` for the wallet (personal data);
  - keeps the `AgreementRecord` log, as today's consent log is kept.

## 6. Existing users (R7)

Everyone who signed up before the flag has consent v2 and a region, but no profile. When the flag is turned on:

1. `resolveOnboarding` sees no `AccountProfile`, so the user gets **"Update your account"**, the same screens in a short form:
   - Role: preselect **freelancer** when region is `vn`. When region is `intl`, preselect from history: client if the wallet created a contract or a listing, freelancer if it accepted one, both if both.
   - Country: preselect VN when region is `vn`; ask when region is `intl`.
   - Agreement: always asked (consent v3).
2. The Workspace shows the same flow through `AccountPrompt`, which opens the wallet panel at `/role?update=1`.
3. History-based preselection uses the existing queries (`useFunds`, jobs `queries.ts`). It only preselects; the user confirms.

## 7. Tests (R8 and in each step)

| Package | Runner | New tests |
| --- | --- | --- |
| core | `node --test "src/**/*.test.ts"` | `account/__tests__/rules.test.ts` (every row of §2), `countries.test.ts` (unique codes, VN present, sorted, sanctions filter), `agreement.test.ts` (hash stable for the same input, changes with role, country or version), `legal/__tests__/copy.test.ts` (banned words extended: intermediary, trung gian, escrow agent, guarantee, verified business, trusted client, employer, salary, payment) |
| wallet | `node --test "services/**/*.test.ts"` (no screen tests) | `services/__tests__/onboarding.test.ts`: step order with the flag on and off, the returning-user path, agreement before fund. `capabilities.test.ts`: the §4 table. `signOutKeys.test.ts`: profile cleared, agreement log kept |
| Workspace | `node --test … && vitest run` | `components/__tests__/accountPrompt.test.tsx`, gates on `/new`, `/jobs/new`, Applicants select and ApplyCard; `hooks/account.test.ts` (reads `@ned_account_v1`, storage event) |

**Manual run (R8, flag on, in a preview build):** check these four paths on the phone web build and in the Workspace.
1. New VN freelancer.
2. New Singapore business.
3. Existing v2 user.
4. VN user trying `/new` and `/jobs/new` by URL.

## 8. Copy and legal (R2, then R9)

- `account/copy.ts` and `legal/agreement.ts` carry the design §8 text **verbatim** as the starting draft. The file header says **"Draft for CL review (D30); not live until R9"**.
- Terms v1.2 adds these sections:
  - "Your role and where you live" (self-declared, the user is responsible);
  - "Rights and duties" (links to the cards);
  - "Limit of responsibility" (with the carve-out);
  - "Misuse";
  - "Changes" (re-acceptance);
  - "Contact" (`TEAM_EMAIL`);
  - "Who we are" (`OPERATOR_NAME`, a placeholder that fails a test while it is still `'[operator]'` **only when the flag is on**).
- Privacy v2 adds the D14 items from CL §14.2:
  - cross-border transfer, retention and rights, 18+, residence self-declared, the purpose of the phone number;
  - N.E.D Jobs data;
  - plus the country, role and business details kept on the device.
- **Banned words** (design §6) are enforced by the copy test.

## 9. Rollout (R9)

1. The CL reviews `account/copy.ts`, `legal/agreement.ts`, Terms v1.2 and Privacy v2 against design §6 and §8. The review goes in `docs/05-legal/` as a new section, and the CL's edits are applied.
2. The PO answers design §9 Q1 (operator name) and Q2 (governing law), and sets `OPERATOR_NAME`.
3. Flag on in a Vercel preview, then the manual run from §7. Then flag on in production for both apps, with the same commit for the wallet `/wallet` build.
4. Record the result:
   - D30 marked **accepted** in the decision log;
   - `product-spec.md` screens and word table updated;
   - tracker rows, progress rows;
   - README "On the phone" table gets a "Roles and agreement" row.

## 10. Risks and how the plan handles them

| Risk | Handling |
| --- | --- |
| It breaks onboarding for the demo accounts | Flag off until R9; the old flow stays intact and keeps its tests |
| Two copies of the consent version drift (`useConsentStore.ts` and Workspace `hooks/consent.ts`) | Move `CONSENT_VERSION` to core (`legal/agreement.ts`) and import it in both. The R2 test asserts the value |
| A second device does not know the role | Accepted in Phase 1: the same origin shares localStorage between the Workspace and `/wallet`, so only a truly new device asks again. Phase 2 encrypted note |
| A false declaration (a VN resident picks Singapore) | Terms make the user responsible. No geolocation (design §1). The pitch never claims the program checks residence |
| A business name that looks like a real company (impersonation) | "self-declared" badge; misuse clause; Phase 2 public card only after a lawyer |
| Copy promises more than the code does | R2 copy test, plus the CL review in R9 |

## 11. Phase 2 (program v1.5): outline only, after a lawyer

- **P2-1:** `BusinessCard` PDA `[b"business", owner]`, created and updated by the owner, closable.
  - Fields: name (80), registered_in (2), size (u8), industry (u8), website (100), declared_at, version, bump.
  - New spec section, tests, CU, size; Explorer check.
- **P2-2:** encrypted settings note. Role and country are encrypted with the account's device-key ring (D22), so a second device reads them. They never go on-chain in clear text.
- **P2-3:** agreement memo `ned:agree:t<N>:p<M>` in the `create_profile` transaction (SPL Memo program), with no personal data.
- **P2-4:** job cards and the contract header show the BusinessCard as "Business · self-declared".

---

## Prompts

> Paste one prompt per Claude Code session. Each prompt assumes the previous ones are on `main`.

### R0 · Pre-flight, flag and scaffolding

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main: git switch main && git pull --ff-only origin main).
Read: docs/09-milestone-lock/roles-and-agreement-plan.md (D30 design), docs/09-milestone-lock/roles-and-agreement-build.md
(this plan, sections 0–2), packages/ned-core/src/features.ts, ned-wallet/constants/features.ts, ned-workspace/src/config.ts,
ned-workspace/src/vite-env.d.ts.
Task:
1. Add accountRoles: false to CORE_FEATURES (packages/ned-core/src/features.ts) with the comment
   "D30 roles and agreement; off until CL sign-off (roles-and-agreement-build.md R9)".
2. Wallet FEATURES.accountRoles: process.env.EXPO_PUBLIC_FEATURE_ACCOUNT_ROLES === undefined ? CORE_FEATURES.accountRoles
   : process.env.EXPO_PUBLIC_FEATURE_ACCOUNT_ROLES === 'true'.
   Workspace FEATURES.accountRoles from VITE_FEATURE_ACCOUNT_ROLES the same way (type it in vite-env.d.ts), following
   the lockAtHire pattern (commit e68e755).
3. Create empty modules with a header comment and an index export: packages/ned-core/src/account/{index,types,rules,
   countries,copy}.ts and packages/ned-core/src/legal/agreement.ts. Export account from packages/ned-core/src/index.ts.
4. Run the tests of core, wallet and Workspace: nothing changes behaviour.
Commit: chore: D30 flag accountRoles (off) and core account scaffolding
Done when: all tests pass; grep shows no use of the flag yet.
```

### R1 · Core: account model, countries and rules

```
Read: roles-and-agreement-build.md §2 and §4, roles-and-agreement-plan.md §2–§3, packages/ned-core/src/jobs/taxonomy.ts
(JOB_CATEGORIES, JOB_CATEGORY_COUNT), packages/ned-core/src/milestone/view.ts (Region; do NOT reuse the name Role).
Task:
1. account/types.ts: AccountRole, ClientKind, CountryCode, TeamSize, BusinessDetails, AccountProfile, AgreementRecord,
   exactly as in §2. TEAM_SIZES with labels: solo "Just me", '2-10', '11-50', '51-200', '200+'.
2. account/countries.ts: COUNTRIES as a static readonly array of { code, name } for every ISO 3166-1 alpha-2 country,
   English short names, sorted by name; SANCTIONED: readonly CountryCode[] = [] with "// lawyer before launch";
   isCountry(code), countryName(code), searchCountries(query) (case- and accent-insensitive, matches code or name).
3. account/rules.ts: regionFromCountry, canBeClient, canRegisterBusinessIn, validateBusiness (returns a list of
   field errors with the copy from account/copy.ts), validateProfile, capabilities(profile | null), canChangeCountry
   (profile, next, { clientContracts, listings }) with the reasons in account/copy.ts. A null profile gives today's
   behaviour (freelancer + 'vn').
4. account/copy.ts: every string in roles-and-agreement-build.md §3–§5 (titles, card lines, the Vietnam line, field
   labels and errors, Settings lines), as named constants.
5. Tests in packages/ned-core/src/account/__tests__/: rules.test.ts (each rule and each row of §4), countries.test.ts
   (unique codes, 'VN' present, sorted, search "viet" and "vn" find Vietnam, SANCTIONED filtered).
Do not touch the wallet or the Workspace yet.
Commit: feat(core): D30 account model, country list and role rules (behind accountRoles)
Done when: node --test in packages/ned-core passes.
```

### R2 · Core: the agreement, consent v3 and the legal drafts (CL review)

```
Read: roles-and-agreement-plan.md §5, §6 and §8 (agreement text, verbatim), roles-and-agreement-build.md §8,
docs/05-legal/pre-pitch-check-7oct.md §14.2 (D12/D14: what Privacy and consent must add),
packages/ned-core/src/legal/copy.ts and its tests, ned-wallet/stores/useConsentStore.ts,
ned-workspace/src/hooks/consent.ts, ned-wallet/app/(onboarding)/consent.tsx (CONSENT_SCOPE, CONSENT_TEXT).
Task:
1. legal/agreement.ts (header: "Draft for CL review (D30); not live until R9"):
   - AGREEMENT_VERSION = 1, CONSENT_VERSION_V3 = 3;
   - AGREEMENT_OPENING, FREELANCER_CARD, CLIENT_CARD (with the business-only lines), NED_CARD
     (from design §8.1–§8.4 verbatim);
   - AGREEMENT_CHECKS = three checkbox texts from design §5;
   - agreementCards(profile) returns the cards for the chosen roles;
   - agreementText(profile, versions) is the exact string shown, used for the hash;
   - agreementHash(text): sha256 hex, using sha256 from '@noble/hashes/sha2.js', as milestone/evidence.ts does.
2. Terms v1.2 and Privacy v2 as NEW exports (TERMS_V12, TERMS_V12_HEADING, PRIVACY_V2, PRIVACY_V2_HEADING) with the
   sections in roles-and-agreement-build.md §8, plus OPERATOR_NAME = '[operator]' and GOVERNING_LAW = '[governing law]'.
   legalDocs() returns the new docs only when CORE_FEATURES/app flag accountRoles is on (take the flag as a parameter;
   do not read env in core). The live v1.1/v1 text is unchanged.
3. Move the consent version into core:
   - export CONSENT_VERSION from legal/agreement.ts: 3 when the flag is on, 2 when it is off, via a function
     consentVersion(flag);
   - ned-wallet/stores/useConsentStore.ts and ned-workspace/src/hooks/consent.ts import it, instead of each keeping
     its own number.
4. Tests:
   - legal/__tests__/agreement.test.ts: the hash is stable and changes with role, country and version; each role gets
     the right cards; the 3 checks exist;
   - extend copy.test.ts banned words to the new texts (intermediary, trung gian, escrow agent, guarantee,
     verified business, trusted client, employer, salary, and "payment" for USDC);
   - a test that fails when the flag is on and OPERATOR_NAME is still '[operator]' (skipped while the flag is off).
Commit: feat(core): D30 agreement, consent v3 and Terms v1.2 / Privacy v2 drafts (flag off, CL review)
Done when: core, wallet and Workspace tests pass. Then append to docs/05-legal/pre-pitch-check-7oct.md a short section
"D30 copy for CL review" that lists the new constants and their file paths.
```

### R3 · Design boards (Designer, in the canvas project)

```
Read: roles-and-agreement-build.md §3 and §5, roles-and-agreement-plan.md §2 and §8, docs/02-thiet-ke/canvas-v2/README.md
(board conventions: one artboard per file, inline styles are the exact values, final copy in markup, renderVals for
sample data), and the existing OnbConsent, OnbResidence, OnbProfile and Settings boards (same frame 390 × 844, same
StepHeader, same tokens).
Make these boards with the exact copy from packages/ned-core/src/account/copy.ts and legal/agreement.ts:
- OnbRole: three cards, none selected; variant OnbRoleSelected (business chosen).
- OnbCountry: search list; variant OnbCountryVN (client role + Vietnam: the line and the two buttons).
- OnbBusiness: the form, one field in error; the "self-declared" note.
- OnbAgreement: freelancer variant and business variant, checkboxes unticked, button disabled; variant
  OnbAgreementReady (all ticked).
- SettingsAccount: roles switches, country row, business row, agreement row ("Agreed to version 1 on …").
- WebAccountPrompt: the Workspace modal that opens the wallet panel ("Finish setting up your account").
Add a row per board to canvas-v2/README.md (Board | Title | Build task R4/R5/R6 | Note). Export the boards into
docs/02-thiet-ke/canvas-v2/ in the same commit.
Commit: design: D30 onboarding boards (role, country, business, agreement) and account settings
```

### R4 · Wallet: the new onboarding (behind the flag)

```
Read: roles-and-agreement-build.md §2–§3, the R3 boards, ned-wallet/services/onboarding.ts (resolveOnboarding,
onboardingRoute), ned-wallet/app/(onboarding)/{setup,consent,residence,profile,fund}.tsx,
ned-wallet/components/onboarding/ui.tsx (OnbScreen, StepHeader, PrimaryButton, NoticeCard),
ned-wallet/stores/{useConsentStore,useRegionStore}.ts, ned-wallet/app/_layout.tsx (OnboardingGate, PUBLIC_SEGMENTS),
ned-wallet/AGENTS.md (Expo v57 docs, useAuth only).
Task:
1. stores/useAccountStore.ts (zustand persist, AsyncStorage key '@ned_account_v1'):
   - state: profiles: Record<wallet, AccountProfile>, agreements: Record<wallet, AgreementRecord[]> (a log);
   - actions: setProfile, acceptAgreement, withdrawAgreement, getProfile, getAgreement (the latest record that is
     not withdrawn and has the current versions), waitForAccountHydration.
2. Screens app/(onboarding)/role.tsx, country.tsx, business.tsx, agreement.tsx, built from the boards with
   components/design and the tokens (never copy board HTML). Keep a draft profile in a small in-memory store between
   the steps and write nothing persistent before Agree. The agreement screen writes, in this order:
   consent v3 → setProfile → acceptAgreement (with agreementHash) → setRegion(regionFromCountry(country)).
3. services/onboarding.ts: when FEATURES.accountRoles is on, the steps are 'role' | 'country' | 'business' |
   'agreement' | 'fund' | 'profile' | 'home', in the order of build plan §3 (new user and returning user). Agreement
   must come before fund. When the flag is off, nothing changes (keep the current code path and its tests).
   onboardingRoute maps the new steps; residence.tsx redirects to /country when the flag is on.
4. StepHeader totals: 4 for a freelancer or individual client, 5 for a business client.
5. Tests (node --test, services level): onboarding order with the flag on and off; returning user without a profile;
   agreement before fund; the agreement write order (mock the stores).
Commit: feat(wallet): D30 onboarding (role, country, business, agreement) behind accountRoles
Done when: npm test passes in ned-wallet; with EXPO_PUBLIC_FEATURE_ACCOUNT_ROLES=true npm run web, a new Google
account goes role → country → (business) → agreement → profile → home, and with the flag unset the old flow runs.
```

### R5 · Wallet: role gates and Settings "Your account"

```
Read: roles-and-agreement-build.md §4–§5, packages/ned-core/src/account/rules.ts (capabilities, canChangeCountry),
the gate list in §1 (contracts/new.tsx:58,88; [fund]/lock.tsx:27,53,128; [fund]/index.tsx:75; contracts/index.tsx:43,148;
(tabs)/index.tsx:82,394-397; app/settings.tsx:59-62,113-128), ned-wallet/hooks/useFunds.ts, ned-wallet/services/storage.ts
(sign-out), ned-wallet/services/signOutKeys.ts, the SettingsAccount board.
Task:
1. hooks/useCapabilities.ts: capabilities(useAccountStore profile) when FEATURES.accountRoles is on; today's
   region-only behaviour when off.
2. Replace each "vn" check that guards a CLIENT action (create, lock, the client empty state, New contract buttons)
   with the capability, keeping the region check for the money view. Messages from account/copy.ts (§4 table).
   Accept: a client-only user sees "Also work" first.
3. Settings → "Your account" (flag on; the old "Where you live" toggle stays for flag off): roles switches,
   country row with canChangeCountry and the confirm text (closes D17), business details form, agreement row with
   View and Withdraw. Count open client contracts with useFunds('client') (state not Settled/Closed) and open
   listings with the jobs queries (state Open or Selected, poster = wallet).
4. Sign-out: clear profiles[wallet] and business details from useAccountStore (state and storage, as region is
   cleared); keep the agreements log. Update signOutKeys.test.ts.
5. Tests: capabilities.test.ts (§4), canChangeCountry with open contracts, sign-out.
Commit: feat(wallet): D30 role gates and Settings "Your account" (closes D17 when the flag is on)
```

### R6 · Workspace and N.E.D Jobs

```
Read: roles-and-agreement-build.md §1, §4 and §6, ned-workspace/src/hooks/{region,consent}.ts,
ned-workspace/src/components/{RegionPrompt,ConsentGate,WalletPanelContext,WalletPanel,WorkspaceNav}.tsx,
src/Layout.tsx, src/jobs/JobsLayout.tsx, src/pages/{NewContract,Overview,Contract}.tsx,
src/jobs/pages/{PostJob,Applicants,JobDetail,Overview}.tsx, packages/ned-core/src/jobs/actions.ts (postJob VN throw).
Task (all behind FEATURES.accountRoles; flag off = today's behaviour):
1. hooks/account.ts: read '@ned_account_v1' from localStorage (same origin as /wallet; listen to the storage event
   with the same 3 s fallback as hooks/consent.ts); useAccount() → { profile, agreement, capabilities }.
2. AccountPrompt.tsx replaces RegionPrompt when the flag is on. If the profile or a current agreement is missing,
   show the WebAccountPrompt board ("Finish setting up your account") with a button that opens the wallet panel at
   /role (or /role?update=1 for an existing user). Mount it where RegionPrompt is (Layout.tsx:23, JobsLayout.tsx:101).
3. WalletPanelContext: ensureAccount() next to ensureConsent(). Client actions (create, lock CTA, post, select)
   need capabilities.client; Apply needs capabilities.apply. Each refusal shows the §4 message and an
   "Open settings" button (wallet panel /settings).
4. Hide or disable client entry points for non-clients: WorkspaceNav New contract, Overview quick actions,
   WalletPanel New contract, JobsLayout Post a job buttons (:162, :211, :236), jobs Overview audience from the role.
   NewContract and PostJob render the §4 message on direct URL access.
5. Applicants: select needs poster wallet AND capabilities.selectApplicant. JobDetail ApplyCard: "Also work" for a
   client-only user.
6. Show "Business · self-declared" with the business name on the user's own job cards and on the contract header
   when they are the business (Phase 1, own device only).
7. Tests (vitest): accountPrompt.test.tsx, the gates on NewContract, PostJob, Applicants select and ApplyCard;
   hooks/account.test.ts.
Commit: feat(workspace): D30 account prompt and role gates in the Workspace and N.E.D Jobs (behind accountRoles)
Done when: npm run test and npm run test:ui pass in ned-workspace; with VITE_FEATURE_ACCOUNT_ROLES=true and the
wallet flag on, a freelancer-only account cannot reach /new or /jobs/new, and a client-only account is offered
"Also work" on Apply.
```

### R7 · Existing users

```
Read: roles-and-agreement-build.md §6, ned-wallet/services/onboarding.ts, ned-wallet/hooks/useFunds.ts,
packages/ned-core/src/jobs/queries.ts, ned-workspace/src/components/AccountPrompt.tsx.
Task (flag on only):
1. resolveOnboarding: a wallet with a ReverseRecord and no AccountProfile goes to 'role' with update=1.
2. Preselection in the role and country screens when update=1:
   - region 'vn' → freelancer + VN;
   - region 'intl' → roles from history (created a contract or listing → client; accepted a contract → freelancer;
     both → both), country empty.
   Read history with the existing queries. Only preselect; the user confirms. Show the line
   "We've updated how N.E.D works. Please confirm your role and where you live, and agree to the new terms."
3. The agreement step is always shown (consent v3).
4. Tests: preselection for vn, intl client, intl freelancer, intl both, no history.
Commit: feat(wallet): D30 update flow for existing users (preselect from region and history)
```

### R8 · Tests, docs and the manual run

```
Read: roles-and-agreement-build.md §7 and §9, docs/09-milestone-lock/product-spec.md (screens, §6 word table),
docs/09-milestone-lock/system-tracker.md, docs/tong-hop-tien-do.md.
Task:
1. Run every suite (core, wallet, Workspace incl. vitest). Fix only D30 regressions.
2. Manual run with both flags on (EXPO_PUBLIC_FEATURE_ACCOUNT_ROLES=true npm run web; VITE_FEATURE_ACCOUNT_ROLES=true
   in the Workspace): the four paths in §7. Save screenshots (390 × 844 for the phone, 1280 wide for the Workspace)
   to docs/02-thiet-ke/screenshots/d30/ with no personal e-mail on screen.
3. product-spec.md: add the onboarding screens and the "Your account" settings; add to the word table:
   "self-declared", "Also hire", "Also work", and the "do not write" list from design §6.
4. system-tracker.md: rows for R0–R8 and the open items (operator name, governing law, Phase 2).
5. Progress rows R0–R8 in docs/tong-hop-tien-do.md.
Commit: docs: D30 build recorded (R0–R8), product-spec screens and word table, screenshots
```

### R9 · CL review and rollout

```
Read: roles-and-agreement-build.md §8–§9, the CL section added in R2 to docs/05-legal/pre-pitch-check-7oct.md.
Task (only after the CL has replied in that file and the PO has given the operator name and governing law):
1. Apply the CL's copy edits to account/copy.ts, legal/agreement.ts, TERMS_V12 and PRIVACY_V2; set OPERATOR_NAME
   and GOVERNING_LAW. All tests pass with the flag on.
2. Turn the flag on in a Vercel preview for the Workspace and the /wallet build; repeat the four manual paths.
3. Turn it on in production: set CORE_FEATURES.accountRoles = true (or the two env variables, as the PO decides);
   deploy both builds from the same commit.
4. Decision log: D30 status "accepted" with the date and commits. README "On the phone" table: add "Roles and
   agreement". Notify the CL in docs/05-legal/ with the commit list.
Commit: feat: D30 roles and agreement live (CL ok <date>)
```
