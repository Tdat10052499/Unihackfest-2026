// Expo config on top of app.json (workspace-plan W6). EXPO_BASE_URL picks the web base path:
//   unset          → "/Unihackfest-2026" (GitHub Pages, `npm run deploy`, unchanged)
//   "/wallet"      → the build served inside the Workspace at /wallet (wallet extension, decision D23)
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig =>
  ({
    ...config,
    experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL ?? '/Unihackfest-2026' },
  }) as ExpoConfig;
