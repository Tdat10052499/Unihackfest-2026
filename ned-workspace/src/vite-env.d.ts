/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DYNAMIC_ENVIRONMENT_ID?: string;
  readonly VITE_HELIUS_DEVNET_URL?: string;
  readonly VITE_PROGRAM_ID?: string;
  readonly VITE_MOBILE_ORIGIN?: string;
  readonly VITE_WORKSPACE_ORIGIN?: string;
  /** '1' only in dev/test builds: enables the read-only ?previewWallet= preview */
  readonly VITE_DEV_TOOLS?: string;
  /** 'false' turns the N.E.D Jobs site (/jobs) off; anything else leaves it on */
  readonly VITE_FEATURE_JOBS?: string;
  /** 'false' turns the D27 dispute controls off */
  readonly VITE_FEATURE_DISPUTE?: string;
  /** "false" hides "Lock when I hire" (v1.4, D29); default from CORE_FEATURES.lockAtHire */
  readonly VITE_FEATURE_LOCK_AT_HIRE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
