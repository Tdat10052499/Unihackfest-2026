// Copy for /terms, /privacy, the disputes disclosure and the Settings › Help guide (compliance fix list P3, C2,
// appendices 1–2 with review A12; funded-jobs-plan.md section 9; review-decision-plan.md section 4; U5 + U6).
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
