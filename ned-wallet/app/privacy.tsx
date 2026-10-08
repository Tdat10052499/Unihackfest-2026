// Privacy notice (compliance fix list P3, appendix 1 with review A12). Public: the consent screen, Settings and the
// Workspace footers link here.
import React from 'react';
import { LegalPage } from '@/components/LegalPage';
import { PRIVACY, PRIVACY_HEADING, PRIVACY_V2, PRIVACY_V2_HEADING } from '@/services/legalCopy';
import { FEATURES } from '@/constants/features';

export default function PrivacyScreen() {
  // D30: Privacy 2 (draft for CL review) only with FEATURES.accountRoles
  return FEATURES.accountRoles ? (
    <LegalPage title="Privacy Policy" heading={PRIVACY_V2_HEADING} sections={PRIVACY_V2} />
  ) : (
    <LegalPage title="Privacy Policy" heading={PRIVACY_HEADING} sections={PRIVACY} />
  );
}
