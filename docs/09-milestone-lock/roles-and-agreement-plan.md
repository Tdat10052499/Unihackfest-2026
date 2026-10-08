# D30 (proposed): roles at sign-up, country of residence, business details and the N.E.D Agreement

**Owner:** PO (Hồ Du Tuấn Đạt) · **Written:** 8 Oct 2026 · **Status:** proposed. It is **built after the final** (10 Oct) and needs a CL review first, and a lawyer before any real user. It is not in plan A and not in the pitch.

**Reading:** this file is the design. §8 is a draft of the agreement text for the CL and a lawyer to review. It is not legal advice.

## 1. Why

The PO's view (8 Oct) is that onboarding does not look professional. The app asks "I live in Vietnam / I live outside Vietnam" without saying why, and it never asks what the person came to do. Gaps found in the code:

| Today (code) | Problem |
| --- | --- |
| `app/(onboarding)/residence.tsx`: two cards, Vietnam or outside, stored on the device (`useRegionStore`) | It reads like a currency setting, not a role. A client and a freelancer see the same question. There is no country list, so the app cannot tell a client in Singapore from one in the US |
| `consent.tsx`: one checkbox covering data, with links to Terms, Privacy and Disclosures | Agreeing to the Terms and consenting to data use are bundled into one tick. PDP Law 91/2025 wants explicit consent and no implied consent \[Verified, research doc §legal table\]. There is no 18+ statement. Neither side's rights are shown before they agree |
| No role | Anyone outside Vietnam can create contracts and post jobs. The Workspace never asks whether the user is a business |
| No business details | Freelancers see only `@username` on a job. There is nothing about the business behind it, not even a self-declared one |

**What must stay** (decisions D18, A4, I1; CLAUDE.md):
- The rule is about **residence, not nationality**. A Vietnamese citizen living in Singapore is "outside Vietnam".
- A person living in Vietnam **never receives, holds or sends USDC**. So they can only join as a freelancer, and they are paid VND through a payout partner.
- Residence is **self-declared**. N.E.D does not geolocate. An IP address says nothing reliable (VPNs), and reading it would be extra personal data.

## 2. New sign-up flow (phone first; the Workspace shows the same steps)

```
Welcome (Continue with Google)
 → 1. How will you use N.E.D?        Freelancer · Client (individual) · Client (business)
 → 2. Where do you live now?         country list, search; note "where you live, not your nationality"
 → 2b. About your business           only for Client (business)
 → 3. The N.E.D Agreement            your rights and duties for the chosen role + 3 checkboxes
 → (fund, silent: devnet SOL for fees, as today)
 → 4. Choose your @username          as today (create_profile)
 → Home for that role
```

- Steps 1, 2 and 2b stay on the device until step 3 is agreed. The rule "consent before anything sends the wallet address to a third party" (V2, `services/onboarding.ts`) still holds, because the faucet runs after step 3.
- `region` stays the switch the money view already uses. It is **derived** from the country: Vietnam gives `'vn'`, any other country gives `'intl'`. The Vietnam-view code, the regionGuard and the payout path do not change.

### Step 1 · Role

| Option | Title | One line |
| --- | --- | --- |
| Freelancer | **I do the work** | Accept contracts, submit milestones, get paid when work is released |
| Client (individual) | **I hire, for myself** | Create contracts, lock budgets, review and release |
| Client (business) | **I hire for a business** | Same as above, plus N.E.D Jobs listings under your business name |

Outside Vietnam a person can hold both roles. Settings has **Also hire** and **Also work**. Home shows a role switch only when both are on.

### Step 2 · Country of residence, and the rule for Vietnam

| Residence | Freelancer | Client (individual or business) |
| --- | --- | --- |
| Vietnam | Yes: Vietnam view, VND through a payout partner | **No.** The option is disabled, with the line below |
| Any other country | Yes: USDC wallet | Yes |

- **Line on the disabled option (product copy):** "Clients lock USDC, and N.E.D does not offer USDC to people who live in Vietnam. You can join as a freelancer and receive VND."
  - Do not write "crypto is illegal" or call USDC a payment (word table).
- **If the role is chosen first and Vietnam second:** the app goes back to step 1 with Freelancer selected and shows the same line.
- **A business registered in Vietnam** is also not allowed as a client, for the same reason (Decree 52/2024 Art. 8(6) applies to organisations too; fines VND 300–400 m under Decree 340/2025 \[Verified, research doc\]).
- **Sanctioned countries:** a block list is needed before a real launch \[Assumption, lawyer\]. It is not needed in the devnet pilot.

### Step 2b · About your business (Client, business)

| Field | Required | Values | Shown publicly? |
| --- | --- | --- | --- |
| Business name | yes | 2–80 characters | Phase 2 only (see §4) |
| Country where it is registered | yes | country list; Vietnam not allowed (line above) | Phase 2 only |
| Team size | yes | Just me · 2–10 · 11–50 · 51–200 · 200+ | Phase 2 only |
| Industry | yes | the 8 N.E.D Jobs categories (`jobs/taxonomy.ts`) | Phase 2 only |
| Website or LinkedIn page | no | URL | Phase 2 only |
| Your role in the business | no | e.g. Founder, Hiring manager | no |
| Registration number | no | free text | **no**, device only |

- **Badge everywhere the business shows:** "Business · self-declared". N.E.D does not check these details (L4: N.E.D does not vet anyone). The badge must never read "verified".
- **"Just me":** shown to freelancers as "Sole business". If the person is the business, the details are personal data and are treated that way.

## 3. Where the app enforces the role (UI only)

- **Freelancer only (and every Vietnam resident):** the app hides
  - Create contract (`/new`);
  - Post a job (`/jobs/new`);
  - Slide to lock, and select or fund a job.
  
  Accept, Submit (Workspace), the Records view and Apply stay.
- **Client only:** the app hides Apply and the freelancer records. Accepting a contract offers "Also work" first.
- **The program cannot know anyone's residence or role**, and it does not check them. Two points are honest about this:
  - the Terms say the user declares both and is responsible if a declaration is false;
  - the pitch must never say "the program blocks Vietnamese clients".
- **Changing country later:** from outside Vietnam to Vietnam is blocked while the wallet has an open client contract or listing. Confirming the change is the open D17 item; this design closes it. Payout destinations already fixed on-chain do not change.

## 4. Storage (there is no backend)

| Phase | What is stored | Where | Trade-off |
| --- | --- | --- | --- |
| **Phase 1** (after the final, app only, no program change) | role, country, business details, agreement record | on the device (as region today) | A second device asks again. Freelancers do not see the business details |
| **Phase 2** (program v1.5, after the lawyer) | a public **BusinessCard** PDA (name, registration country, size, industry, website, `declared_at`) and an **encrypted settings note** for role and country | Solana; the note is encrypted with the account's device-key ring (D22) | Public and permanent: separate consent and lawyer question 9. Role and country never go on-chain in clear text |

## 5. The agreement screen (step 3)

**Layout:**
1. A card for the chosen role, "What you can count on / What you agree to" (§8.2 or §8.3).
2. The card "What N.E.D does and does not do" (§8.4).
3. Links: full Terms, Privacy, Disclosures and, for clients, Job posting rules.
4. Three checkboxes, all **unticked**. The button stays disabled until all three are ticked.

| # | Checkbox (product copy) | Why it is separate |
| --- | --- | --- |
| 1 | "I have read and agree to the N.E.D Terms of use, including my rights and duties above." | Standard terms must be shown before agreement (Civil Code 2015, standard-form contracts and general conditions \[Inference: lawyer to confirm the articles\]) |
| 2 | "I agree that N.E.D processes my data as the Privacy notice says. My @username, wallet address, contract titles, job listings and pitches are written to Solana, where they are public and permanent." | PDP Law 91/2025: explicit, specific consent, not bundled \[Verified\]. This is consent v3, so it absorbs D12/D14 |
| 3 | "I am 18 or older, and the country and role I chose are true." | Capacity; it also makes the self-declaration the user's responsibility |

**Recording:**
- **On the device:** `{wallet, termsVersion, privacyVersion, role, country, acceptedAtISO, sha256(text shown)}`.
- **Optional, Phase 2:** a Memo `ned:agree:t2:p3` in the `create_profile` transaction. It is public evidence that this wallet accepted those versions, and it holds no personal data.

**Changes:** a new `TERMS_VERSION` or `CONSENT_VERSION` shows the screen again, highlighting what changed. Nobody is bound by a changed term until they tick again.

## 6. Words to avoid in the agreement, and why

| Do not write | Write instead | Reason |
| --- | --- | --- |
| "N.E.D is an intermediary", "trung gian", "escrow agent", "N.E.D holds your money" | "Software. The money sits in a vault owned by the Solana program, not by N.E.D" | Intermediary payment services need an SBV licence (Decree 52/2024 Art. 8(7)) \[Verified\]. "Intermediary platform" is also a term in Law 122/2025 (lawyer question 8) |
| "guaranteed payment", "safe", "protected" | "locked in the program before work starts", "released by the deadlines written into the contract" | The pilot is not audited; there is no arbiter |
| "verified business", "trusted client" | "Business · self-declared" | N.E.D does not vet anyone (L4) |
| "employer", "employee", "salary", "hire staff" | "client", "freelancer", "contract", "milestone" | Law 74/2025 on employment services (lawyer question 7) |
| "payment" for USDC | "lock", "release", "refund" | Word table, `product-spec.md` §6 |

## 7. Build plan (after the final)

The detailed plan and the Claude Code prompts R0–R9 are in [`roles-and-agreement-build.md`](roles-and-agreement-build.md). The table below is the short version.

| Step | Scope | Program change |
| --- | --- | --- |
| R1 | `@ned/core`: types `Role`, `ClientType`, `Country` (ISO 3166-1 alpha-2 list), `regionFromCountry`, `canBeClient(country, registrationCountry)`, agreement copy and versions, tests | no |
| R2 | Phone onboarding: Role, Country, Business, Agreement screens (boards first in canvas-v2); the residence screen is retired; `onboarding.ts` gets the new step order | no |
| R3 | Role gates in the wallet and Workspace (§3); Settings "Also hire / Also work" and the country change guard (closes D17) | no |
| R4 | Workspace first sign-in shows the same steps when this device has no record | no |
| R5 | Phase 2: BusinessCard PDA, encrypted settings note, agreement memo (program v1.5, new spec section, tests) | **yes**, after a lawyer |

## 8. Draft agreement text (English product copy; for CL and lawyer review)

### 8.1 Opening

"N.E.D is software for milestone contracts between clients and freelancers. When a client locks a budget, it sits in a vault owned by a Solana program, not by N.E.D, and it leaves only by the rules written into the contract. This pilot runs on Solana devnet with test tokens that have no value."

### 8.2 Freelancer

**What you can count on**
- You see the budget locked in the program before you start work.
- The place your earnings go is fixed when you accept. Nobody, including N.E.D, can change it.
- If the client neither approves nor requests changes before the review deadline, anyone can release the milestone to you (Release now).
- A change request never sends the money back to the client alone. It stays locked until you both agree.
- Your brief and your deliveries are encrypted. N.E.D has no key.
- Until a milestone is released, you keep the rights to the work submitted for it, unless you and the client agree otherwise. *(Lawyer to confirm.)*

**What you agree to**
- Do the work you accept, and submit only work you have the right to hand over.
- Submit a preview that shows the work honestly, and hand over the final files you listed after release.
- Keep personal data out of public fields: @username, contract titles, job pitches.
- Handle your own tax and records. Records from N.E.D are not tax advice.
- If you live in Vietnam: you receive VND through a payout partner and never receive, hold or send USDC through N.E.D.

### 8.3 Client (individual or business)

**What you can count on**
- Your budget leaves the vault only by the rules written when the contract was created.
- If a submission deadline passes with nothing submitted, anyone can refund that milestone to you.
- Before you release, you see a preview and the list of final files the freelancer promised, with their fingerprints.
- You can request changes before the review deadline. The amount then stays locked until you both agree.

**What you agree to**
- Lock the budget before work starts. Review before the review deadline, or the milestone can be released.
- Write a clear brief with "done when" points for each milestone, and hire only for lawful work.
- Use contracts for independent services. Whether a relationship counts as employment under the law that applies to you is your responsibility.
- You do not live in Vietnam, and your business is not registered there.
- **Business only:**
  - the business details you give are true and kept up to date;
  - only people the business allows act for it;
  - the business is responsible for everything done from this account.

### 8.4 What N.E.D does and does not do

- **N.E.D provides the software.** It does not hold, convert or move your funds. No instruction in the program lets anyone at N.E.D move a locked budget.
- **N.E.D is not a party to your contract.** It does not choose, vet or employ anyone, and it does not decide disagreements. There is no neutral arbiter in this pilot.
- **N.E.D does not check identities, business details, the quality of the work or whether files are handed over.** What users declare is self-declared.
- **The pilot has limits:**
  - the program has not been audited;
  - the team still holds the upgrade authority, as the Disclosures say;
  - the payout partner is simulated.
- **Your actions are your own.** Transactions you sign cannot be reversed. N.E.D cannot recover a lost login or undo a release or refund.
- **Limit of responsibility:** to the extent the law allows, N.E.D is not responsible for losses caused by another user, by transactions you sign, or by outages of Solana, Dynamic or other services. Nothing here removes rights you have by law that cannot be waived.
- **Misuse:** N.E.D may stop offering its app to an account that breaks these terms, for example through false declarations, unlawful work, impersonation or attempts to launder money. It cannot freeze or take funds already locked in the program.
- **Changes:** N.E.D shows any new version of these terms before it applies to you. You keep using the app only by agreeing again.
- **Contact:** the team email (D6).

### 8.5 Why this protects all three sides

| Side | Protected by |
| --- | --- |
| Freelancer | Budget locked before work; destination fixed at accept; Release now; a change request never refunds the client alone; rights to unreleased work (lawyer) |
| Client / business | Refund after a missed submission deadline; review before release; promised file list; change requests; truthful-declaration duty on the other side |
| N.E.D (the team) | Software only, not a party, holds no funds; self-declared data; no verification promise; limit of responsibility with the legal carve-out; misuse clause; versioned acceptance record |

**Why the carve-out matters:** under Vietnamese law, terms in a standard form that exclude the drafter's liability, or let it change the deal alone, can be void against consumers. Ambiguous terms are read against the drafter (Civil Code 2015; Consumer Protection Law 19/2023 \[Inference: lawyer to confirm the articles and whether freelancers and clients count as consumers\]). Keeping the "to the extent the law allows" carve-out and the re-acceptance rule makes the protective terms more likely to hold.

## 9. Open questions (PO and lawyer, before Phase 2 or real users)

1. **Who is "N.E.D" in the contract?** The Terms name no legal entity. A registered entity (or a named person for the pilot) is needed before the limit of responsibility means anything.
2. Governing law and forum for disputes between users and N.E.D (Vietnam? Singapore?).
3. The default on rights to the work before release (§8.2, last bullet).
4. Whether a public BusinessCard and the agreement memo are disclosures that need their own consent under PDP Law 91/2025 (lawyer question 9).
5. The sanctions block list, and whether any other country needs a rule like Vietnam's.
