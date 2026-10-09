# D30 tests: role, country, business, N.E.D Agreement (8 Oct 2026)

**Result: 55/55 scenarios PASS**, run automatically on the two live apps (the `ned-wallet` wallet at 390 × 844, the Workspace and N.E.D Jobs at 1280 × 800, screenshots @2x) with both D30 flags on (`EXPO_PUBLIC_FEATURE_ACCOUNT_ROLES=true`, `VITE_FEATURE_ACCOUNT_ROLES=true`), on `main` at `ea92659`.

## How the tests ran

- Each scenario opens the real screen, performs the actions (taps, typing), then **checks automatically**: text that must be on screen, text that must not be (for example "I live in Vietnam", "illegal", USDC amounts in the Vietnam view) and, for W27, the data written to the device (consent v3, profile, agreement, region). The screenshot is the final state.
- **No real Google sign-in.** The wallet runs in preview mode (cannot sign transactions) through a temporary dev page (not committed); the Workspace uses the `?previewWallet=` mode. The account state (role, country, agreement) is set up on the device for each scenario. Contract, listing and history data is real Solana devnet data (test wallet `BT9c…RT7B`).
- The red notice at the bottom of the phone screenshots is the sign-in SDK (Dynamic) failing to connect from the test machine, not an app bug.

## Results per scenario


### Wallet · Step 1: role

| ID | Scenario | Result | Screenshot |
| --- | --- | --- | --- |
| W01 | Role: nothing chosen, Continue disabled with caption | ✅ PASS | [`W01-role-empty.png`](W01-role-empty.png) |
| W02 | Role: tap "I do the work" | ✅ PASS | [`W02-role-pick-freelancer.png`](W02-role-pick-freelancer.png) |
| W03 | Role: tap "I hire for a business" (5-step bar) | ✅ PASS | [`W03-role-pick-business.png`](W03-role-pick-business.png) |
| W04 | Update flow, Vietnam view: notice, freelancer preselected, no Back | ✅ PASS | [`W04-role-update-vn.png`](W04-role-update-vn.png) |
| W05 | Update flow, international view: roles preselected from chain history of the wallet | ✅ PASS | [`W05-role-update-intl-history.png`](W05-role-update-intl-history.png) |

### Wallet · Step 2: country

| ID | Scenario | Result | Screenshot |
| --- | --- | --- | --- |
| W06 | Country: nothing chosen yet | ✅ PASS | [`W06-country-empty.png`](W06-country-empty.png) |
| W07 | Country search "viet" | ✅ PASS | [`W07-country-search-viet.png`](W07-country-search-viet.png) |
| W08 | Country search with accents "việt" | ✅ PASS | [`W08-country-search-accent.png`](W08-country-search-accent.png) |
| W09 | Country search by code "sg" | ✅ PASS | [`W09-country-search-code.png`](W09-country-search-code.png) |
| W10 | Country search with no match | ✅ PASS | [`W10-country-no-result.png`](W10-country-no-result.png) |
| W11 | Freelancer picks Singapore: USDC note | ✅ PASS | [`W11-country-singapore.png`](W11-country-singapore.png) |
| W12 | Freelancer picks Vietnam: VND note, no crypto balance | ✅ PASS | [`W12-country-vietnam-freelancer.png`](W12-country-vietnam-freelancer.png) |
| W13 | Client taps Vietnam: "Join as a freelancer?" sheet | ✅ PASS | [`W13-country-vietnam-client-sheet.png`](W13-country-vietnam-client-sheet.png) |
| W14 | Sheet → Continue as a freelancer: Vietnam saved, role becomes freelancer | ✅ PASS | [`W14-country-vietnam-client-continue.png`](W14-country-vietnam-client-continue.png) |
| W15 | Sheet → Choose another country: Vietnam not saved | ✅ PASS | [`W15-country-vietnam-client-other.png`](W15-country-vietnam-client-other.png) |

### Wallet · Step 3: business details

| ID | Scenario | Result | Screenshot |
| --- | --- | --- | --- |
| W16 | Business form: Continue with empty fields shows errors | ✅ PASS | [`W16-business-empty-continue.png`](W16-business-empty-continue.png) |
| W17 | Business registered in Vietnam is refused | ✅ PASS | [`W17-business-registered-vn.png`](W17-business-registered-vn.png) |
| W18 | Website without https:// is refused | ✅ PASS | [`W18-business-website-error.png`](W18-business-website-error.png) |
| W19 | Registration number is marked device-only; optional labels | ✅ PASS | [`W19-business-device-only.png`](W19-business-device-only.png) |
| W20 | Settings → Business: edit form with the saved details, no step bar | ✅ PASS | [`W20-business-edit-mode.png`](W20-business-edit-mode.png) |

### Wallet · Last step: The N.E.D Agreement

| ID | Scenario | Result | Screenshot |
| --- | --- | --- | --- |
| W21 | Agreement, freelancer in Vietnam: cards, 3 unticked boxes, button disabled | ✅ PASS | [`W21-agreement-freelancer.png`](W21-agreement-freelancer.png) |
| W22 | Two boxes ticked: still disabled | ✅ PASS | [`W22-agreement-two-ticked.png`](W22-agreement-two-ticked.png) |
| W23 | All three ticked: button enabled | ✅ PASS | [`W23-agreement-all-ticked.png`](W23-agreement-all-ticked.png) |
| W24 | "Read all": the 8 N.E.D items in a sheet | ✅ PASS | [`W24-agreement-read-all.png`](W24-agreement-read-all.png) |
| W25 | Agreement, individual client in Singapore: client card + Job posting rules link | ✅ PASS | [`W25-agreement-client.png`](W25-agreement-client.png) |
| W26 | Agreement, business client: client + business cards | ✅ PASS | [`W26-agreement-business.png`](W26-agreement-business.png) |
| W27 | "Agree and continue" writes consent v3, profile, agreement and region on the device | ✅ PASS | [`W27-agreement-agree-writes.png`](W27-agreement-agree-writes.png) |
| W28 | A Vietnam draft with a client role never reaches the agreement | ✅ PASS | [`W28-agreement-vn-client-blocked.png`](W28-agreement-vn-client-blocked.png) |

### Wallet · Settings → Your account, changing country

| ID | Scenario | Result | Screenshot |
| --- | --- | --- | --- |
| W29 | Settings → Your account, business client in Singapore | ✅ PASS | [`W29-settings-business.png`](W29-settings-business.png) |
| W30 | Settings, freelancer in Vietnam: Also hire locked | ✅ PASS | [`W30-settings-vietnam.png`](W30-settings-vietnam.png) |
| W31 | Settings, freelancer in Singapore: last role locked on | ✅ PASS | [`W31-settings-freelancer-sg.png`](W31-settings-freelancer-sg.png) |
| W32 | Switch on Also hire: both roles on | ✅ PASS | [`W32-settings-add-client.png`](W32-settings-add-client.png) |
| W33 | Agreement row: version, view, withdraw | ✅ PASS | [`W33-settings-agreement-sheet.png`](W33-settings-agreement-sheet.png) |
| W34 | View what you agreed to: the text, with the declaration | ✅ PASS | [`W34-settings-agreement-text.png`](W34-settings-agreement-text.png) |
| W35 | Settings → Where you live → Vietnam: confirm sheet or blocked sheet (reads the wallet's open contracts on devnet) (shows: Finish your client contracts first) | ✅ PASS | [`W35-country-edit-to-vietnam.png`](W35-country-edit-to-vietnam.png) |
| W36 | Settings → Where you live → Germany: confirm sheet | ✅ PASS | [`W36-country-edit-to-germany.png`](W36-country-edit-to-germany.png) |

### Wallet · Role gates (New contract)

| ID | Scenario | Result | Screenshot |
| --- | --- | --- | --- |
| W37 | New contract opened by a freelancer outside Vietnam | ✅ PASS | [`W37-new-contract-freelancer.png`](W37-new-contract-freelancer.png) |
| W38 | New contract in the Vietnam view: today's blocked view | ✅ PASS | [`W38-new-contract-vietnam.png`](W38-new-contract-vietnam.png) |
| W39 | New contract for a client: the form | ✅ PASS | [`W39-new-contract-client.png`](W39-new-contract-client.png) |

### Workspace · The "Finish setting up your account" prompt

| ID | Scenario | Result | Screenshot |
| --- | --- | --- | --- |
| S01 | Workspace: "Finish setting up your account" for a wallet with no account | ✅ PASS | [`S01-prompt-new-account.png`](S01-prompt-new-account.png) |
| S02 | Workspace: update copy for a wallet from before D30 | ✅ PASS | [`S02-prompt-update.png`](S02-prompt-update.png) |
| S03 | "Later": prompt closes, note stays as a banner | ✅ PASS | [`S03-prompt-later.png`](S03-prompt-later.png) |

### Workspace + N.E.D Jobs · Role gates

| ID | Scenario | Result | Screenshot |
| --- | --- | --- | --- |
| S04 | Workspace Overview, freelancer: no New contract | ✅ PASS | [`S04-overview-freelancer.png`](S04-overview-freelancer.png) |
| S05 | Workspace Overview, business client: New contract | ✅ PASS | [`S05-overview-business.png`](S05-overview-business.png) |
| S06 | /new by URL, freelancer in Singapore: gate card with Open settings | ✅ PASS | [`S06-new-freelancer.png`](S06-new-freelancer.png) |
| S07 | /new by URL, Vietnam: Vietnam line, no Open settings | ✅ PASS | [`S07-new-vietnam.png`](S07-new-vietnam.png) |
| S08 | /new for a client: the editor | ✅ PASS | [`S08-new-client.png`](S08-new-client.png) |
| S09 | /jobs/new by URL, freelancer: gate card | ✅ PASS | [`S09-jobs-new-freelancer.png`](S09-jobs-new-freelancer.png) |
| S10 | /jobs/new by URL, Vietnam: Vietnam line | ✅ PASS | [`S10-jobs-new-vietnam.png`](S10-jobs-new-vietnam.png) |
| S11 | /jobs/new, business: form, preview card shows the self-declared business | ✅ PASS | [`S11-jobs-new-business.png`](S11-jobs-new-business.png) |

### N.E.D Jobs · Overview and Job detail

| ID | Scenario | Result | Screenshot |
| --- | --- | --- | --- |
| S12 | N.E.D Jobs Overview, freelancer in Singapore: no Post a job | ✅ PASS | [`S12-jobs-overview-freelancer.png`](S12-jobs-overview-freelancer.png) |
| S13 | N.E.D Jobs Overview, business: Post a job | ✅ PASS | [`S13-jobs-overview-business.png`](S13-jobs-overview-business.png) |
| S14 | N.E.D Jobs Overview, Vietnam: no Post a job, VND copy | ✅ PASS | [`S14-jobs-overview-vietnam.png`](S14-jobs-overview-vietnam.png) |
| S15 | Job detail, client-only account: "Also work" instead of the pitch form | ✅ PASS | [`S15-job-detail-client-only.png`](S15-job-detail-client-only.png) |
| S16 | Job detail, freelancer: the pitch form | ✅ PASS | [`S16-job-detail-freelancer.png`](S16-job-detail-freelancer.png) |

## Notes

- **W35** uses real data: wallet `BT9c…RT7B` still has 1 open client contract on devnet, so moving to Vietnam is blocked as the rule says (the "Finish your client contracts first" sheet, singular/plural wording per CL, 8 Oct).
- **W05** reads the real on-chain history: the wallet has created contracts, so the update flow preselects "I hire, for myself".
- **The first run** had 7 FAILs caused by the test setup (Metro was still building when the first page opened; the registration-country picker did not have the label the script assumed; the job list loaded slowly because the devnet RPC was rate-limited). The script was fixed and rerun: all 7 PASS. None was an app bug.
- **Not testable here:** the "Change" button in the Workspace wallet panel opens the embedded `/wallet`, which exists only in the build (Vercel), not on the dev server. Google sign-in and signing transactions (create contract, lock, submit, release) need a real person: see the list at the end of `../demo/README.md`.
- The automated code tests (unit/Vitest) also pass with the flags off and on: core 220/220, wallet 67/67, Workspace 22/22 + 141/141.
- **Finding (not part of D30):** when the devnet RPC returns 429 (rate limit), the N.E.D Jobs job page wrongly says "This job does not exist", because `useJob` (`ned-workspace/src/jobs/hooks.ts:77`) treats every error as "no job". Reloading after a few seconds is correct. Details in `../demo/README.md`.
