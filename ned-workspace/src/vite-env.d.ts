/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DYNAMIC_ENVIRONMENT_ID?: string;
  readonly VITE_HELIUS_DEVNET_URL?: string;
  readonly VITE_PROGRAM_ID?: string;
  readonly VITE_MOBILE_ORIGIN?: string;
  readonly VITE_WORKSPACE_ORIGIN?: string;
  /** '1' only in dev/test builds: enables the read-only ?previewWallet= preview */
  readonly VITE_DEV_TOOLS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
