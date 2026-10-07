// Terms of use (compliance fix list P3, appendix 2 with the funded-jobs-plan.md section 9 line). Public: the consent
// screen, Settings and the Workspace footers link here.
import React from 'react';
import { LegalPage } from '@/components/LegalPage';
import { TERMS, TERMS_HEADING } from '@/services/legalCopy';

export default function TermsScreen() {
  return <LegalPage title="Terms of use" heading={TERMS_HEADING} sections={TERMS} />;
}
