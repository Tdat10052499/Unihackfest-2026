# D30 · four paths with both flags on (R8, 8 Oct 2026)

`EXPO_PUBLIC_FEATURE_ACCOUNT_ROLES=true` (wallet, 390 × 844 @2x) and `VITE_FEATURE_ACCOUNT_ROLES=true` (Workspace, 1280 × 800 @2x).

**How they were made (not a live Google sign-in):** the real screens on the dev servers, with the device state the wallet writes seeded beforehand. Wallet: a temporary dev route (not committed) under the preview auth provider. Workspace: the dev-only `?previewWallet=` mode with the phone app's records in localStorage. No e-mail is on screen. The red toast at the bottom of the phone renders is the login SDK failing to reach its servers from the sandbox, not the app. A real run with Google accounts is the PO check.

| File | Path | What it shows |
| --- | --- | --- |
| `a1-role-freelancer` … `a5-settings-vietnam` | a. new freelancer in Vietnam | Role (freelancer), Country (Vietnam, VND note), Agreement (unticked, then all ticked), Settings → Your account (Also hire locked) |
| `b1-role-business` … `b5-settings-business`, `b6-workspace-business-overview` | b. new business client in Singapore | Role (business, 5 steps), Country (Singapore), Business form, Agreement (client + business cards), Settings (Lumen Studio · self-declared), Workspace Overview with New contract |
| `c1-role-update`, `c2-workspace-update-prompt` | c. existing v2 account | Role in update mode (notice, no Back, freelancer preselected from the Vietnam view); Workspace prompt with the update copy |
| `d1-wallet-new-vietnam`, `d2-workspace-new-vietnam`, `d3-jobs-new-vietnam` | d. Vietnam account opening /new and /jobs/new by URL | Wallet: today's Vietnam blocked view (build §4); Workspace and N.E.D Jobs: the gate card, Vietnam line, no Open settings, no amount |
