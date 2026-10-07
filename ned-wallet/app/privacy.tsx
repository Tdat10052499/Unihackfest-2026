// Privacy notice (compliance fix list P3, appendix 1 with review A12). Public: the consent screen, Settings and the
// Workspace footers link here.
import React from 'react';
import { LegalPage } from '@/components/LegalPage';
import { PRIVACY, PRIVACY_HEADING } from '@/services/legalCopy';

export default function PrivacyScreen() {
  return <LegalPage title="Privacy Policy" heading={PRIVACY_HEADING} sections={PRIVACY} />;
}
