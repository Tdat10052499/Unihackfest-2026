// Core-level feature defaults. Each app spreads these into its own FEATURES and may override them (env flags).

export const CORE_FEATURES = {
  /** v1.4 (D29): "Lock when I hire" on /jobs/new and /new (post_job_open, then fund_job at selection). Default on */
  lockAtHire: true,
  /** D30 roles and agreement; off until the CL sign-off (D30 prompt R9) */
  accountRoles: false,
} as const;
