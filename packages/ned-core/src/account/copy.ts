// User-facing copy for the role, country and business steps, Settings → "Your account", the change-country sheets,
// the Workspace prompt and the role gates. Verbatim from the D30 copy deck (NED-prompts-d30-design.md §C: C1, C2,
// C3, C5, C6); the agreement itself (C4) lives in legal/agreement.ts. Screens never type this copy inline.
// {placeholders} are small format functions. D30, behind accountRoles.
import { JOB_CATEGORIES } from '../jobs/taxonomy.ts';
import { TEAM_SIZES } from './types.ts';

/** C1 · Role (OnbRole). `common.*` is shared by the onboarding steps */
export const ROLE_COPY = {
  title: 'How will you use N.E.D?',
  sub: "Pick what you'll do most. You can add the other role later in Settings.",
  freelancer: {
    title: 'I do the work',
    tag: 'Freelancer',
    body: 'Accept contracts, submit milestones and receive your earnings when work is released.',
  },
  client: {
    title: 'I hire, for myself',
    tag: 'Client',
    body: 'Create contracts, lock the budget for each milestone, then review and release.',
  },
  business: {
    title: 'I hire for a business',
    tag: 'Client · business',
    body: 'Everything a client does, plus N.E.D Jobs listings under your business name.',
  },
  note: "People who live in Vietnam join as freelancers. You'll choose your country next.",
  update: "We've updated how N.E.D works. Please confirm your role and where you live, and agree to the new terms.",
  common: {
    continue: 'Continue',
    chooseOne: 'Choose one to continue',
  },
} as const;

/** C2 · Country (OnbCountry) */
export const COUNTRY_COPY = {
  title: 'Where do you live now?',
  sub: 'Where you live, not your nationality. This decides how amounts are shown and where your earnings can go.',
  search: 'Search country',
  noResult: (query: string) => `No country matches "${query}".`,
  noteVN:
    "In Vietnam you'll see amounts in VND (estimate) and receive earnings in your bank account through a payout partner. No crypto balance is shown.",
  noteIntl: "You'll see USDC and receive earnings in your N.E.D account.",
  settingsHint: 'You can change this in Settings.',
  vnClient: {
    title: 'Join as a freelancer?',
    body: 'Clients lock USDC, and N.E.D does not offer USDC to people who live in Vietnam. You can join as a freelancer and receive VND.',
    primary: 'Continue as a freelancer',
    secondary: 'Choose another country',
  },
} as const;

/** C3 · Business (OnbBusiness). `badge` is C6 `badge.business`, used wherever the business shows */
export const BUSINESS_COPY = {
  title: 'About your business',
  sub: 'Tell freelancers who they are working with.',
  selfDeclared:
    'Self-declared. N.E.D does not check these details. Wherever your business is shown, it is marked "self-declared".',
  name: {
    label: 'Business name',
    placeholder: 'e.g. Lumen Studio Pte. Ltd.',
    error: 'Enter your business name (2–80 characters).',
  },
  registeredIn: {
    label: 'Country where it is registered',
    placeholder: 'Choose country',
    errorVN: "A business registered in Vietnam can't be a client on N.E.D, because clients lock USDC.",
  },
  size: {
    label: 'Team size',
    /** "Just me · 2–10 · 11–50 · 51–200 · 200+" */
    options: TEAM_SIZES.map((s) => s.label),
  },
  industry: {
    label: 'Industry',
    /** "Design · Development · … · Other": the N.E.D Jobs categories, by index */
    options: JOB_CATEGORIES.map((c) => c.label),
  },
  website: {
    label: 'Website or LinkedIn page (optional)',
    placeholder: 'https://',
    error: 'Use a link that starts with https://',
  },
  role: {
    label: 'Your role in the business (optional)',
    placeholder: 'e.g. Founder, Hiring manager',
  },
  regNo: {
    label: 'Registration number (optional)',
    help: 'Stays on this device. Never written to Solana.',
  },
  badge: 'Business · self-declared',
  /** Caption under the disabled Continue (board OnbBusinessError); copy deck business.fixErrors (CL 8 Oct) */
  fixErrors: 'Fix the fields in red to continue.',
} as const;

/** C5 · Settings → "Your account" and the change-country sheets */
export const SETTINGS_COPY = {
  account: 'Your account',
  alsoWork: 'Also work (freelancer)',
  alsoHire: 'Also hire (client)',
  alsoHireVN: 'Not available for people who live in Vietnam.',
  atLeastOne: 'Keep at least one role on.',
  country: 'Where you live',
  business: 'Business',
  businessValue: (name: string) => `${name} · self-declared`,
  agreement: 'Agreement',
  agreementValue: (n: number, date: string) => `Version ${n} · ${date}`,
  agreementView: 'View what you agreed to',
  agreementWithdraw: 'Withdraw and sign out',
  sheet: {
    change: {
      title: 'Change where you live?',
      body: 'Your money view will change. Destinations already fixed in your contracts do not change.',
      primary: (country: string) => `Change to ${country}`,
      cancel: 'Cancel',
    },
    blocked: {
      title: 'Finish your client contracts first',
      body: (contracts: number, listings: number) =>
        // CL 8 Oct: singular or plural per noun ("1 open client contract", "2 open client contracts")
        `You have ${contracts} open client ${contracts === 1 ? 'contract' : 'contracts'} and ${listings} open job ${listings === 1 ? 'listing' : 'listings'}. Settle or close them before you move to Vietnam, because people who live in Vietnam can't lock USDC.`,
      ok: 'OK',
    },
  },
} as const;

/** C6 · Workspace account prompt */
export const WEB_COPY = {
  prompt: {
    title: 'Finish setting up your account',
    body: "Tell us how you'll use N.E.D and where you live, then agree to the N.E.D Agreement. It takes about a minute.",
    update: "We've updated how N.E.D works. Please confirm your role and where you live, and agree to the new terms.",
    primary: 'Open in wallet',
    later: 'Later',
    laterNote: 'You can browse, but creating, locking, posting and applying wait until you finish.',
    /** The three numbered steps (board WebAccountPrompt); copy deck web.prompt.steps (CL 8 Oct) */
    steps: ['Your role', 'Where you live', 'The N.E.D Agreement'],
  },
} as const;

/** C6 · Role gates (wallet and Workspace) */
export const GATE_COPY = {
  clientNeeded: 'Add the client role in Settings to create contracts, lock budgets and post jobs.',
  clientNeededVN:
    'People who live in Vietnam join as freelancers. Clients lock USDC, and N.E.D does not offer USDC in Vietnam.',
  freelancerNeeded: 'Add the freelancer role to apply and accept contracts.',
  openSettings: 'Open settings',
  alsoWork: 'Also work',
  /** Title and link of the /new gate (board WebRoleGate); copy deck gate.createTitle, gate.findWork (CL 8 Oct) */
  createTitle: 'Creating contracts is for clients',
  findWork: 'Find work on N.E.D Jobs',
} as const;
