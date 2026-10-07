// Settings › Help: the "Before you submit" guide (delivery-review-updates.md U5 + the U6 Drive guide), the same copy
// as the Workspace submit page.
import React from 'react';
import { LegalPage } from '@/components/LegalPage';
import { GUIDE, GUIDE_TITLE } from '@/services/legalCopy';

export default function HelpScreen() {
  return <LegalPage title="Help" heading={GUIDE_TITLE} sections={GUIDE} />;
}
