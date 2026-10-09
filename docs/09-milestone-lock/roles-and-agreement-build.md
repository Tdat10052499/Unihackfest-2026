# D30 build plan: account roles, country of residence, business details and the N.E.D Agreement (prompts R0–R9)

**Owner:** PO (Hồ Du Tuấn Đạt) · **Written:** 8 Oct 2026 · **Design:** [`roles-and-agreement-plan.md`](roles-and-agreement-plan.md) (D30) · **Base:** `main` after plan A (`prompts-final-fixes-8oct.md`)

## 0. When and how

**When:** after the final (10 Oct). The demo build must not change before then.
- If the team starts earlier, every change sits behind **`FEATURES.accountRoles`**, which defaults to **off** in core, wallet and Workspace.
- Production keeps the flag off until R9. That gate needs the CL sign-off on the copy (§8 of the design) and the PO's answer to design §9 question 1: who "N.E.D" is in the contract.

**How:** one Claude Code session per prompt, on `main`.
- Follow `prompts-6oct.md` section 0: `git switch main && git pull --ff-only origin main`.
- Small conventional commits; run the tests of every package the step touches; push.
- Add one progress row per step in `docs/progress-log.md`.
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
| **Design** `docs/02-design/canvas-v2/` | `OnbConsent`, `OnbResidence`, `Settings` | New boards `OnbRole`, `OnbCountry`, `OnbBusiness`, `OnbAgreement` (+ VN and business variants), `SettingsAccount`, `WebAccountPrompt` |
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

The prompts moved on 8 Oct to two files, so each one has its own rules and checks:

- **Code, R0–R9:** [`prompts-d30.md`](prompts-d30.md). It adds a section 0 for D30, a PO check after each step, stop conditions and a progress-row template.
- **Design, D0–D8:** [`prompts-d30-design.md`](prompts-d30-design.md). It holds the board list, the shared design rules and the **copy deck**, which is the source of every English string in `account/copy.ts` and `legal/agreement.ts`.
