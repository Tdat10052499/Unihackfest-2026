// The legal text of the N.E.D pilot, one source for the phone app (/terms, /privacy, /disclosures, Settings › Help)
// and N.E.D Jobs (/jobs/legal). Shipped in S11 (compliance fix list P3, C2, appendices 1–2 with review A12;
// funded-jobs-plan.md section 9; review-decision-plan.md section 4; U5 + U6), moved here in H4 without rewording.
// H4 adds the Disclosures document (the phone app's Disclosures list) and the Job posting rules (board WebJobsLegal).
// Pure data so it can be tested; change it only with the compliance lead.

export interface LegalSection {
  title: string;
  /** Paragraphs, or list items when `list` is set */
  body: string[];
  list?: 'bullet' | 'number';
}

export const PRIVACY_HEADING = 'N.E.D privacy notice · pilot version 1 · 6 Oct 2026';
export const PRIVACY: LegalSection[] = [
  { title: 'About this pilot', body: ['N.E.D is a student project for UniHackFest 2026. It runs on Solana devnet with test money.'] },
  {
    title: 'What we process and why',
    list: 'bullet',
    body: [
      'Google account name and email, to sign you in. Login is run by Dynamic (United States).',
      'Wallet address, to run your account and your contracts.',
      '@username, so the other party can find you.',
      'Phone number (optional): only a hash goes on Solana. The number itself stays on your device.',
      'Device key: a public key on Solana, so your contracts open on your other devices.',
      'Contract data: titles, amounts and deadlines are public on Solana. Briefs and deliveries are encrypted, and only the two parties hold the key.',
      'Bank details and ID: never processed by N.E.D. In a real launch, a payout partner would collect them in its own flow. In this demo the partner is simulated.',
    ],
  },
  {
    title: 'Where data goes',
    list: 'bullet',
    body: [
      'Dynamic: login (United States). Dynamic uses Ably to deliver login messages.',
      'Helius: blockchain data (United States).',
      'Vercel and GitHub Pages: hosting. Their servers keep standard request logs (such as IP address and time).',
      'Solana devnet: public blockchain.',
    ],
  },
  { title: 'Data on Solana is public or permanent', body: ['It cannot be deleted by anyone, including N.E.D.'] },
  {
    title: 'Your choices',
    body: [
      'You can withdraw consent in Settings, and N.E.D then stops running your account. Data stored on your device is removed when you clear the app’s data. We keep a record of when you gave or withdrew consent.',
    ],
  },
  {
    title: 'Contact',
    body: [
      'The N.E.D team, through the UniHackFest 2026 organisers. This notice follows Personal Data Protection Law 91/2025 and Decree 356/2025 as we understand them. It has not been reviewed by a lawyer yet.',
    ],
  },
];

export const TERMS_HEADING = 'N.E.D terms of use · pilot version 1 · 6 Oct 2026';
export const TERMS: LegalSection[] = [
  { title: 'Pilot only', body: ['N.E.D runs on Solana devnet with test tokens that have no value. Do not send real money.'] },
  {
    title: 'What N.E.D is',
    body: [
      'Software that lets a client lock test USDC per milestone in a Solana program and release it to the freelancer, or refund it to the client after a missed deadline. N.E.D holds no funds, converts nothing and charges no fee.',
    ],
  },
  {
    title: 'What N.E.D is not',
    body: [
      'It is not a payment service, a bank or an exchange. N.E.D shows job listings that businesses post with a budget locked in the program. N.E.D does not choose, vet or employ anyone and is not a party to the work. It gives no legal, tax or financial advice.',
    ],
  },
  {
    title: 'Vietnam',
    body: [
      'Users who choose the Vietnam view see amounts in VND as estimates and never hold crypto. The payout partner is simulated in this demo; no VND is sent.',
    ],
  },
  { title: 'Your keys, your actions', body: ['Transactions you sign cannot be reversed. Release and refund follow the deadlines written into the contract.'] },
  { title: 'No warranty', body: ['The program has not been audited. Use the pilot at your own risk.'] },
  { title: 'Changes', body: ['These terms may change before any launch. A real launch needs a legal review and new terms.'] },
];

/** C2: the disputes disclosure follows FEATURES.dispute */
export function disputeDisclosure(disputesOn: boolean): { title: string; body: string } {
  return disputesOn
    ? {
        title: 'No neutral arbiter',
        body: 'After a milestone is submitted, the client can request changes instead of releasing. The amount then stays locked until both sides agree: the client accepts a revised version, the freelancer returns it, or both agree a split. Nobody outside the contract decides.',
      }
    : {
        title: 'No disputes in this demo',
        body: 'In this version a client cannot open a dispute. If the client does not review before the review deadline, anyone can release the milestone to the freelancer. There is no neutral arbiter.',
      };
}

/** U5 + the U6 Drive guide: the same copy as the Workspace GuideSheet (ned-workspace/src/pages/Submit.tsx) */
export const GUIDE_TITLE = 'Before you submit: what to share, what to keep private';
export const GUIDE: LegalSection[] = [
  {
    title: 'What happens to what you submit',
    list: 'bullet',
    body: [
      'Your links and note are encrypted with the contract key. Only you and the client can read them.',
      'A fingerprint of the delivery is saved on Solana. It proves what you submitted and reveals nothing about it.',
      'Files never leave your device. N.E.D keeps only their fingerprints.',
      'A link is only as private as its sharing setting.',
    ],
  },
  {
    title: 'Do',
    list: 'bullet',
    body: [
      'Link to one fixed version (a Figma version, a Git commit, a shared file version).',
      'Give view-only or comment-only access.',
      'Share previews (watermarked or lower resolution) if you prefer to hand over final files after release.',
      'Say which done-when point each part covers.',
      'Keep your own copy of everything you submit.',
    ],
  },
  {
    title: 'Don’t',
    list: 'bullet',
    body: [
      'Put passwords, API keys, private keys or recovery phrases in links, the note or file names.',
      'Include personal data: ID numbers, phone numbers, home addresses, bank details, yours or anyone else’s.',
      'Include client data you don’t need to show.',
      'Use links that let anyone edit or delete your work.',
    ],
  },
  {
    title: 'Share a preview on Google Drive',
    list: 'number',
    body: [
      'Upload the watermarked preview, not the final file.',
      'Share → General access → Anyone with the link → Viewer.',
      'In the sharing settings (gear icon), untick “Viewers and commenters can see the option to download, print and copy”.',
      'Copy the link of the file, not the folder, and paste it into the delivery.',
      'Open the link in a private window to check what the client will see.',
      'Drive shows the file owner’s Google name to anyone with the link. Use a work account if you don’t want to show your personal one.',
    ],
  },
  {
    title: 'What to share for each type of work',
    list: 'bullet',
    body: [
      'Design: share a watermarked preview up to 1200 px; keep source files and full-size exports until release.',
      'Writing & translation: share a view-only Google Doc with download and copy turned off, or an excerpt; keep the editable file.',
      'Code: share a deployed demo link, a screen recording or test results; keep repository access and source code.',
      'Video: share a watermarked, lower-resolution version on Drive or as an unlisted video; keep the master file.',
    ],
  },
  {
    title: 'Quick check',
    list: 'bullet',
    body: [
      'My links open with the access I chose (try a private window).',
      'Nothing secret or personal is in the links, note or file names.',
      'Each done-when point is covered.',
    ],
  },
];


/** One line of the Disclosures list; `id` lets the phone app keep its icon per line */
export interface DisclosureItem {
  id: string;
  title: string;
  body: string;
}

export const DISCLOSURES_LEAD = 'Please read these before you lock or receive anything. Version 1.0.0 · pilot on Solana devnet.';

/** The phone app's Disclosures list (S10/S11 text); the disputes line follows FEATURES.dispute (C2) */
export function disclosureItems(disputesOn: boolean): DisclosureItem[] {
  return [
    { id: 'devnet', title: 'Devnet only', body: 'This demo runs on Solana devnet with test money. Nothing here has real value.' },
    { id: 'kyc', title: 'No KYC yet', body: 'N.E.D does not check anyone’s identity in this version.' },
    { id: 'phone', title: 'Phone numbers are not verified', body: 'We don’t send a code. A number on a profile may not belong to that person.' },
    { id: 'audit', title: 'The program is not audited', body: 'The Solana program that locks and releases USDC has not had a security audit.' },
    { id: 'partner', title: 'The payout partner is simulated', body: 'No payout partner is connected in this demo. No VND is sent to any bank.' },
    { id: 'fees', title: 'Network fees use test SOL', body: 'Each action costs about 0.000005 test SOL on devnet. N.E.D charges no fee during the pilot.' },
    { id: 'disputes', ...disputeDisclosure(disputesOn) },
    { id: 'vn-release', title: 'After release in the Vietnam path', body: 'Once a milestone is released to the payout partner, you rely on that partner to send you the VND.' },
    { id: 'freeze', title: 'Circle can freeze USDC addresses', body: 'USDC is issued by Circle, which can freeze an address. N.E.D cannot undo that.' },
    // D15 (product-spec 5.1): the invite link carries the key that opens the brief and the delivery
    { id: 'link', title: 'Anyone with the contract link can read it', body: 'The contract link holds the key to the brief and the delivery. Anyone who has the link can read them, but cannot move money. Share it only with the other party.' },
    // B1: the brief and delivery are stored encrypted on Solana
    { id: 'public', title: 'Public on-chain', body: 'Contract titles and the fingerprints of the brief and the delivery are public. The brief and the delivery are stored encrypted on Solana. N.E.D never stores your bank details.' },
    { id: 'advice', title: 'Not advice', body: 'This is not legal, tax or financial advice.' },
  ];
}

/** The Disclosures list as a document of sections (/jobs/legal?doc=disclosures) */
export const disclosuresDoc = (disputesOn: boolean): LegalSection[] => disclosureItems(disputesOn).map((d) => ({ title: d.title, body: [d.body] }));

/** Placeholder until the PO gives a contact address; shown as is, never invented */
export const TEAM_EMAIL = '[team email]';

/** Job posting rules (board WebJobsLegal, H4); new text, reviewed with the compliance lead before the freeze */
export const JOB_POSTING_RULES: LegalSection[] = [
  {
    title: 'Lock the whole budget to post',
    body: [
      'A job is published only when its whole budget is locked in the program. The budget moves into the contract when the selected freelancer accepts.',
      'With no applicants you can withdraw the budget at any time. Once someone has applied, it stays locked until the select-by date, and until the accept window of a selected applicant has passed.',
    ],
  },
  { title: 'Describe the work so others can check it', body: ['Write a short title, a summary for the job card and done-when points someone else could check. Reviews are made against those points.'] },
  {
    title: 'Keep personal data out',
    body: ['Titles, summaries and pitches are public on Solana forever. Do not put names, phone numbers, addresses, bank details, passwords or keys in them.'],
  },
  { title: 'Lawful work only', body: ['Do not post work that breaks the law, asks for passwords, keys or identity documents, or asks a freelancer to send money.'] },
  {
    title: 'Selecting and accepting',
    body: ['Select one applicant before the select-by date. Selecting creates the contract. The applicant accepts within 48 hours (2 minutes on devnet); if not, you can select someone else.'],
  },
  {
    title: 'Delivering and reviewing',
    body: ['Freelancers share watermarked previews to be reviewed and hand over final files after release. Clients accept and release, or request changes; a request never refunds the amount on its own.'],
  },
  { title: 'Problems with a listing', body: [`There is no report button in this pilot yet. Write to ${TEAM_EMAIL} with the link to the listing.`] },
];

export type LegalDocId = 'terms' | 'privacy' | 'disclosures' | 'rules';
export const LEGAL_DOC_IDS: readonly LegalDocId[] = ['terms', 'privacy', 'disclosures', 'rules'];

export interface LegalDoc {
  id: LegalDocId;
  title: string;
  /** One line under the title (board WebJobsLegal) */
  kicker: string;
  sections: LegalSection[];
}

/** The four documents of /jobs/legal, in order; the text is the shipped text above */
export function legalDocs(disputesOn: boolean): LegalDoc[] {
  return [
    { id: 'terms', title: 'Terms of use', kicker: 'How the pilot works and what N.E.D is not', sections: TERMS },
    { id: 'privacy', title: 'Privacy notice', kicker: 'What we process, where it goes, your choices', sections: PRIVACY },
    { id: 'disclosures', title: 'Disclosures', kicker: 'The limits of this pilot, stated plainly', sections: disclosuresDoc(disputesOn) },
    { id: 'rules', title: 'Job posting rules', kicker: 'How to post, apply and hire on N.E.D Jobs', sections: JOB_POSTING_RULES },
  ];
}

export const LEGAL_VERSION_LINE = 'Pilot version 1 · last updated 6 Oct 2026';
