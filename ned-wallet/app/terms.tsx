// Terms of use (compliance fix list P3, appendix 2 with the funded-jobs-plan.md section 9 line). Public: the consent
// screen, Settings and the Workspace footers link here.
import React from 'react';
import { LegalPage } from '@/components/LegalPage';
import { TERMS, TERMS_HEADING, TERMS_V12, TERMS_V12_HEADING } from '@/services/legalCopy';
import { FEATURES } from '@/constants/features';

export default function TermsScreen() {
  // D30: Terms 1.2 (draft for CL review) only with FEATURES.accountRoles
  return FEATURES.accountRoles ? (
    <LegalPage title="Terms of use" heading={TERMS_V12_HEADING} sections={TERMS_V12} />
  ) : (
    <LegalPage title="Terms of use" heading={TERMS_HEADING} sections={TERMS} />
  );
}
