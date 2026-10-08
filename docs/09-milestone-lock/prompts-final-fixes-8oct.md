# Final fixes before the freeze: plan A and Claude Code prompts A1–A6

**Owner:** PO (Hồ Du Tuấn Đạt) · **Written:** 8 Oct 2026 · **Base:** `main` at `858939a` · **Cut line:** 8 Oct 18:00 (code), freeze 9 Oct

## Why

Only what the pitch (`final-pitch.md`, written by the CL) relies on is fixed before the final. That means a demo step, a slide line, a Q&A answer, or a row in its §5 "Phải xong trước final".

Everything else waits until after the final:
- any program change or redeploy (it would change the numbers on Slides 5–7);
- N1–N3, F-7, D16, D17, F-14, the M1 captures and an Android build;
- D12/D14 consent v3, unless the PO decides otherwise (see the end of this file).

Sources:
- `../05-legal/pre-pitch-check-7oct.md` §13 and §14 (CL reply, 8 Oct);
- `final-pitch.md` §5;
- the audit of 8 Oct (this file).

| Step | What | Pitch line that needs it | Owner | Time |
| --- | --- | --- | --- | --- |
| A1 | D2: the Vietnam view never shows USDC, a SOL price or a "$" amount from the activity sync | Slide 2 "B never receives, holds or sends USDC"; demo with B in the Vietnam view | Dev | ~45 min |
| A2 | F-1 and S-1: the phone sends Submit and change-request replies to the Workspace | §5 rows 6 and 12 ("judges try the app") | Dev | ~30 min |
| A3 | CL wording leftovers (§14.1) | Optional demo step "Final files" card; Q&A P7 | Dev | ~10 min |
| A4 | `jobs:smoke --skip-binary-check` | Slide 7 "one script replays the devnet flow"; §5 row 3 | Dev | ~15 min |
| A5 | Docs: program-spec title v1.4, runbook ≥ 40 USDC, `final-pitch` licence line | §5 rows 2 and 13 | Dev / PO | ~10 min |
| A6 | Full test run, push, progress rows, notify the CL | §5 row 11 (CL sign-off on 9 Oct) | Dev | ~15 min |
| PO | Team email (D6), LICENSE (O2), confirm the key rotation (S1–S3) | §5 rows 2, 7, 8 | PO | today |

Run A1–A5 in order in one Claude Code session on `main`. Each step commits on its own, and A6 pushes. If 18:00 comes first, push what is green and record what is left in the progress table.

---

## A1 · D2: no USDC, SOL price or "$" in the Vietnam view

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main: git switch main && git pull --ff-only origin main).
Read: docs/05-legal/pre-pitch-check-7oct.md §13–§14 (D2), CLAUDE.md (the freelancer in Vietnam never holds or
receives USDC), ned-wallet/services/regionGuard.ts, ned-wallet/stores/useNotificationStore.ts (loadNotifications,
the on-chain history block), ned-wallet/hooks/useNotificationSync.ts, ned-wallet/components/GlobalNotificationManager.tsx,
ned-wallet/services/solana.ts (around lines 470–520), ned-wallet/stores/useRegionStore.ts.
Problem: the activity sync turns any SOL change into "+$<sol × 150>" with currency 'USDC' and the Vietnamese titles
"Nhận tiền thành công" / "Chuyển tiền thành công". It runs every 8 s for every wallet, including the Vietnam view, and
/notification-detail can open it.
Task:
1. In useNotificationStore.loadNotifications, read the region of walletAddress (useRegionStore getRegion). Unless it
   is 'intl', skip the on-chain history block entirely (no fetchOnChainHistory call) and drop any saved item whose
   type is RECEIVE_MONEY or TRANSFER. Contract notifications (milestone events) stay.
2. Add '/notification-detail' to VN_BLOCKED_ROUTES in services/regionGuard.ts.
3. In services/solana.ts, remove the hard-coded "* 150" SOL price:
   - SOL changes are shown as SOL (e.g. "+0.0100 SOL") with currency 'SOL';
   - they are never labelled USDC and never turned into "$".
   Change the titles to English (product is English): "Received", "Sent".
4. Tests (jest, ned-wallet): a Vietnam-view wallet gets no RECEIVE_MONEY/TRANSFER notification and no fetchOnChainHistory
   call; blockedForRegion('/notification-detail', 'vn') is true; an intl wallet still gets SOL activity labelled SOL.
5. grep the wallet for other "* 150", "currency: 'USDC'" on SOL values and Vietnamese UI strings in the notification
   path; fix the ones on screens the Vietnam view can open, list the others in the commit message.
Do not touch: the program, the Workspace, contract notifications, the region screen.
Commit: fix(wallet): D2 no USDC or SOL price in the Vietnam view (activity sync off, detail blocked, no * 150)
Done when: npm test in ned-wallet passes; in the browser, a Vietnam-view wallet that receives test SOL shows no new
bell item.
```

## A2 · F-1 and S-1: the phone sends Submit and change-request replies to the Workspace

```
Read: docs/05-legal/pre-pitch-check-7oct.md §13 (F-1) and final-pitch.md §5 row 6 (S-1),
ned-wallet/app/contracts/[fund]/submit.tsx, ned-wallet/app/contracts/[fund]/index.tsx,
ned-wallet/components/contracts/MilestoneCard.tsx, packages/ned-core/src/milestone/content.ts (validateDelivery: the
final-file list is required since F1), packages/ned-core/src/milestone/view.ts (status 'Disputed', DISPUTED_STATUS_LINE),
ned-wallet/constants/features.ts, ned-workspace/src/App.tsx (routes: /contract/:fund, /contract/:fund/submit?i=).
Problem: the phone builds files: [] so validateDelivery always fails (F-1, a dead end). The phone has no reply to a
change request (S-1, FEATURES.dispute is false). Do NOT build either feature on the phone; only send the user to the
Workspace.
Task:
1. submit.tsx: replace the form with a short card (keep TopBar, milestone name and criteria for reading):
   title "Submit from the Workspace"
   body "Submitting needs the list of final files you will hand over after release. Open this contract in the
   Workspace on a computer to submit."
   button "Open in the Workspace" → Linking.openURL(`${WORKSPACE_URL}/contract/${fund}/submit?i=${index}`).
   The wallet has no Workspace URL yet: add WORKSPACE_URL in ned-wallet/constants (EXPO_PUBLIC_WORKSPACE_URL, default
   https://unihackfest-2026.vercel.app). No submit transaction from the phone. The Workspace gets the contract key
   through the registered device keys (D22); if a computer has no key yet, the user opens the invite link there.
   Where the contract screen shows the Submit action for the freelancer, keep the button but route it here.
2. Contract screen and MilestoneCard: when a milestone is Disputed (changes requested), show under the status line:
   "Open this contract in the Workspace to respond." with an "Open in the Workspace" link to
   `${WORKSPACE_URL}/contract/${fund}`, for both roles.
3. Use these exact strings (CL-reviewed wording rules: no "auto-release", never call USDC a payment). Add them to the
   copy test if the wallet has one.
4. Tests: the submit screen renders the Workspace card and no Submit button; a Disputed milestone renders the line.
Do not touch: the Workspace submit flow, validateDelivery, FEATURES.dispute, the program.
Commit: fix(wallet): F-1 and S-1, submit and change-request replies open the Workspace
Done when: npm test passes; on the phone web build a freelancer can no longer reach a Submit button that always fails.
```

## A3 · CL wording leftovers (§14.1)

```
Read: docs/05-legal/pre-pitch-check-7oct.md §14.1.
Task:
1. packages/ned-core/src/milestone/view.ts (Released, client, handed over): "Final files received" → "Final files shared".
   Update ned-workspace/src/pages/__tests__/contract.test.tsx (line ~93) and any other test or copy that expects it
   (grep -rn "Final files received" --include=*.ts --include=*.tsx . | grep -v node_modules).
2. packages/ned-core/src/legal/copy.ts (GUIDE, "What happens to what you submit", first bullet) becomes exactly:
   "Your links and note are encrypted with the contract key. N.E.D has no key; anyone holding the contract link can
   read them."
Commit: fix(copy): CL §14.1 leftovers (Final files shared, single "encrypted")
Done when: tests in packages/ned-core, ned-workspace and ned-wallet pass.
```

## A4 · `jobs:smoke --skip-binary-check`

```
Read: final-pitch.md Slide 7 and §5 row 3, ned-wallet/scripts/jobs-smoke.ts (checks(): the deployed binary vs
ned_program/target/deploy/ned_program.so).
Task:
1. Add the flag --skip-binary-check (the script already has has(name)). With it, checks() still confirms the program
   is v1.4 ("Instruction: FundJob" present) and still compares the IDL, but skips the byte comparison with the local
   .so and prints "binary check skipped (--skip-binary-check): another build is not byte-identical".
2. Print the flag in the script's usage/help text and in the failure message when the binary differs:
   "a build made on another machine differs byte for byte; rerun with --skip-binary-check".
3. README.md (How to run / jobs:smoke) and final-pitch.md Slide 7 code block: add "-- --skip-binary-check" to the
   jobs:smoke line, and remove the sentence in the Slide 7 note that says not to claim "chạy lại bằng ba lệnh" until
   the flag exists (replace it with "Đã có cờ --skip-binary-check (A4, 8/10)").
Commit: feat(scripts): jobs:smoke --skip-binary-check for outside builds
Done when: npx tsc -p tsconfig.scripts.json --noEmit passes (or the repo's script typecheck); a dry run without RPC
prints the usage line.
```

## A5 · Small document fixes

```
Task (docs only, no code):
1. docs/09-milestone-lock/program-spec.md line 1: "(v1.3, build target …)" → "(v1.4, live on devnet since 7 Oct 2026)".
   Keep the v1.3 text below; §11 already describes v1.4.
2. docs/09-milestone-lock/final-pitch.md §3: "Người A có ≥ 30 devnet USDC" → "≥ 40 devnet USDC (10 cho contract B,
   20 cho contract A, 10 dự phòng)", matching §5 row 13. Add to the §3 "Ngày hôm trước" list:
   - "B có sẵn 1 file cuối (khác file preview) trên máy để chọn ở bước Submit 1:30 và khi chuẩn bị contract B."
   - "Mỗi tài khoản tối đa 5 device key: đừng đăng nhập thử trên quá nhiều trình duyệt."
3. final-pitch.md §5 row 2: if the PO has added LICENSE (see "PO" below), mark it done with the licence name;
   otherwise change "README đang ghi MIT" to "README ghi chưa có license".
Commit: docs: program-spec v1.4 title, runbook USDC and checklist (A5)
```

## A6 · Test, push, record

```
1. Run every test suite: ned_program (cargo test, if the toolchain is on this machine), packages/ned-core,
   ned-workspace, ned-wallet (npm test in each). Fix only what A1–A5 broke.
2. git pull --ff-only origin main, then push main (never force).
3. docs/tong-hop-tien-do.md: one progress row per step A1–A5 (commit, tests, what is left).
4. docs/05-legal/pre-pitch-check-7oct.md: append "§15 Dev: A1–A5 landed (8 Oct)" with the commit list, so the CL can
   check D2, F-1, S-1 and §14.1 before the 9 Oct walkthrough.
Commit: docs: A1–A6 progress rows and note for the CL
```

## PO (not code)

- **D6:** put the real team email in `packages/ned-core/src/legal/copy.ts:210` (`TEAM_EMAIL`), and update `packages/ned-core/src/legal/__tests__/copy.test.ts`, which currently asserts the placeholder.
- **O2:** add `LICENSE` at the repo root, with the licence the team chooses (MIT was the earlier intent). Then change README "No license file has been added yet".
- **S1–S3:** confirm the key rotation in the chat with the CL. Nothing to commit.

## Not in plan A (decided 8 Oct, PO)

These wait until after the final, because the pitch does not rely on them:
- any change or redeploy of the program, including the G1 per-milestone re-check in `lock_from_job` and the 120 s accept window;
- N1–N3;
- F-7 (do not mention fixed-version links on stage);
- D16, D17, F-14;
- M1 app captures;
- an Android build;
- roles and agreement redesign (`roles-and-agreement-plan.md`).

**D12/D14 (consent v3):** decided by the PO.
- If it lands before 18:00 with tests, both stage accounts re-consent on 9 Oct.
- Otherwise keep consent v2 and answer Q&A L3 as written.
