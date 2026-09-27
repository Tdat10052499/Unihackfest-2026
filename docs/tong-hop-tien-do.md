# Tổng hợp tiến độ N.E.D Wallet (26–27/09/2026)

> Tài liệu bàn giao cho phiên làm việc tiếp theo (người hoặc trợ lý AI). Đọc cùng: [`README.md`](README.md), [`04-ke-hoach-code.md`](04-ke-hoach-code.md) (mục "Cập nhật sau Phase 0"), [`03-ky-thuat/dev-handoff.md`](03-ky-thuat/dev-handoff.md) (mục 1a — identity on-chain), [`../ned-wallet/ARCHITECTURE.md`](../ned-wallet/ARCHITECTURE.md).

## 0. Trạng thái nhanh

| Hạng mục | Trạng thái |
|---|---|
| Nhánh `main` | Đã có T0.1 → T1.5 (PR #1–#8) |
| Nhánh đang mở | **`feat/t1-3-onboarding`** (T1.3 + T1.6): code + kiểm tra tự động xong, **chờ test tay với Google rồi tạo PR** |
| Nền tảng demo | **Web trước** (GitHub Pages `https://tdat10052499.github.io/Unihackfest-2026/`); Android APK qua EAS là phụ |
| Auth | **Dynamic** (Google + ví nhúng Solana MPC V3) qua `useAuth()` — Privy đã gỡ hẳn |
| Backend | **Không có** (đã bỏ Supabase, `ned-hub`, relayer) |
| Program | `ned_program` **`8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh`** (devnet, Anchor 1.1.2), IDL đã lên chain |
| Gas | **Không có tài trợ gas** (Dynamic SVM Gas Sponsorship cần gói Enterprise) → người dùng tự trả phí + rent bằng SOL devnet |

### Môi trường của chủ dự án (quan trọng)
- Code trong **WSL** (Windows), **không có Android SDK, không có Mac**, chỉ có **iPhone**, **không có tài khoản Apple Developer trả phí** → không cài được bản native lên iPhone; test chính trên **web (Safari iPhone / Chrome)**.
- Chỉ có **1 tài khoản Google** → mỗi ví chỉ tạo hồ sơ on-chain được 1 lần (chưa có `close_profile`).
- Ví deploy Solana: `~/.config/solana/id.json` = `FSyUz7Kfy58vDosLPMqtVYzbcsCfCyrPiDWc65kY6QuQ` (~8.5 SOL devnet).
- Ví Dynamic của chủ dự án (Google): `9PZwK7pZmZnqfq1D5Xm9JvmoFQbPSjCoxj4AHiVLrhkW` (~4.99 SOL, ~18 USDC devnet, **chưa có hồ sơ** trên program mới).
- Dynamic environment: `b1a57168-6474-44e3-bd3c-d2412f43d0f6` (sandbox "NorthAxis"). Đã bật: Google, Solana + Devnet, ví nhúng V3, CORS `https://tdat10052499.github.io`. **Chưa có** `http://localhost:8081` trong CORS (thêm nếu test local).

## 1. Dòng thời gian các task

### T0.1 — Cấu hình (PR #1)
Cập nhật tham chiếu Expo SDK 57, thêm `.mcp.json` (MCP: dynamic, jupiter, solana, expo).

### T0.2 — Gỡ khoá bí mật + relayer (PR #2)
- Xoá luồng "client-side relayer" dùng `EXPO_PUBLIC_ADMIN_SECRET_KEY`, mọi lời gọi `ned-hub`, `RELAYER_FEE_PAYER`, `TREASURY_FEE_PAYER`; xoá `test_key.js` (chứa secret key) và `test-relayer.js` (Helius key); tạo `.env.example`.
- Quét bí mật toàn repo + lịch sử git: **khoá ví relayer `b7TFMuVZzZneuHSMuoWiV3d52yRF7pLTLVF7HDKNWqz` đã lộ** (trong `test_key.js`, `.env` từng commit, bundle cũ trên `gh-pages`); Helius key và Supabase `service_role` key cũng lộ.
- **Việc chủ dự án cần làm (nếu chưa)**: rút hết SOL khỏi ví `b7TF…Wqz`; đổi Helius API key; đổi/xoá Supabase keys/project; lịch sử git vẫn còn các khoá cũ.

### T0.3 — Chuẩn bị dev build EAS (PR #3)
`eas.json` profile `development` (developmentClient, internal, android apk); cài `expo-dev-client`; `expo install --fix` 21 gói; bỏ `newArchEnabled`/`edgeToEdgeEnabled` (không hợp lệ SDK 57); thêm `runtimeVersion`; đổi package **`com.teichidev.nedwallet`**. `expo-doctor` 21/21.

### T0.4 — PoC Dynamic, cổng GO/NO-GO (PR #4, #5) → **GO**
- Dùng **Dynamic JS SDK headless** `@dynamic-labs-sdk/client|react-hooks|solana` 1.34.2 (không dùng SDK React Native "legacy").
- Bắt buộc cài thêm `react-native-keychain`, `react-native-inappbrowser-reborn`, `react-native-passkey` (bundle native import cứng); polyfill `crypto.randomUUID` + `globalThis.location`; ép một bản `@solana/web3.js` 1.98.4 (`pnpm-workspace.yaml` overrides).
- Web: `signInWithSocialRedirect` + `detectSocialRedirectUrl/completeSocialRedirect`. Native: `signInWithSocialPopUp` + `expo-web-browser`.
- Sửa `patch-privy.js` (lỗi pnpm) để web hết trắng trang (sau đó Privy bị gỡ hẳn ở T1.4).
- **Kết quả trên iPhone Safari**: đăng nhập Google OK (~13 s lần đầu, 0.5 s khi còn phiên); memo devnet OK; **gas sponsorship: không khả dụng** (công tắc bị khoá); tạo ATA USDC tốn **0.001488 SOL rent** + 5 000 lamports phí; scrypt N=2^14: 85 ms, N=2^15: **187 ms**; airdrop trong app hay bị **429**.
- Chi tiết: [`poc-dynamic.md`](poc-dynamic.md).

### T0.5 — Dọn dẹp theo kiến trúc web3 (PR #6)
- Xoá: Shake to Split, Coin Toss Room, Geo-Red Packet, presence, thông báo Supabase Realtime, UI liên kết ví ngoài (Phantom…), Developer Mode, file nháp, `ned-mock-dapp/`, `Process.md` trùng, `reset-project.js`, `@supabase/supabase-js`.
- `services/profile.ts` thay Supabase (lưu cục bộ, tạm thời); gộp `src/` vào thư mục gốc; khung `services/auth|identity|jupiter`, `stores/useWalletModeStore`; viết `ARCHITECTURE.md`.
- Đã xoá thư mục rác trên máy: `ned-hub/`, `ned-mock-dapp/`, `.vercel/`, `.venv/`. Báo cáo: [`cleanup-report-t0-5.md`](cleanup-report-t0-5.md).

### T1.2 + T1.4 — Auth Dynamic, gỡ Privy (PR #7)
- `services/auth/` (`client.ts`, `AuthProvider.tsx`, `constants.ts`): **`useAuth()`** → `{ status, isReady, isAuthenticated, user, walletAddress, connection, error, login, logout, signTransaction, signAndSendTransaction, signMessage, getJwt }`. Mọi giao dịch `sponsorshipMode: 'off'`. **Chỉ `services/auth` được import `@dynamic-labs-sdk/*`.**
- Chuyển mọi màn sang `useAuth()`; gỡ `@privy-io/expo`, `patch-privy.js`, `WalletProvider`, `WalletRecoveryModal`, viem…; đổi `privy_id` → `auth_user_id`.
- Sửa lỗi web: số dư USDC không cập nhật (polling chỉ theo SOL); `Alert.alert` trên web là hàm rỗng → `services/webAlert.ts` (đăng xuất hoạt động); đăng xuất giữ hồ sơ cục bộ.
- Thêm **khung Dev test** trên Home (`components/DevTestPanel.tsx`): số dư USDC/SOL, ký thử, gửi 1 USDC — đã test thành công trên iPhone.

### T1.5 — Identity on-chain Phương án C (PR #8)
- `ned_program` mới: **NameRecord** `[b"name", username]` (49 B, 899 160 lamports), **ReverseRecord** `[b"reverse", wallet]` (42 B, 863 600 lamports), **PhoneRecord** `[b"phone_v1", phone_key]` (49 B, 899 160 lamports).
- Instruction: `create_profile(username)`, `link_phone(phone_key)`, `unlink_phone()`, `update_username(new)`, giữ `transfer_stablecoin`. Lỗi: `InvalidUsername, UsernameTaken, ProfileAlreadyExists, SameUsername, NotNameOwner, PhoneTaken, PhoneAlreadyLinked, NotPhoneOwner, InvalidAmount`. Chống chiếm tên/số bằng cách gửi SOL trước vào PDA.
- 10 test LiteSVM (`cd ned_program && anchor build && cargo test`), `program_autofixer` 0 issue.
- Deploy devnet (chữ ký `5hv7KPBsF1vUxkwpHemQQHpwB4SPukCTqRpXH2xr4BFSp9dG9HSQzu5jyApX7mH6cp5RiVhbd3jB2AkfMbn7diGy`), **IDL lên chain** (metadata `AMX7B6rjAhcdKzZ8N2Xw3uDcjCRrGonWuXxJ5DMiKK8H`), **đóng program cũ `8tTSP…`** + 1 buffer mồ côi (thu hồi ~2.34 SOL).
- App: `idl/` mới; `services/identity/dualPda.ts` (derive/đọc/đọc hàng loạt/builder 4 instruction), `phoneKey.ts` (E.164 VN + scrypt N=2^15, r=8, p=1, dkLen=32, salt `ned-wallet/phone/v1`), test `pnpm test:identity` (6/6), script `pnpm identity:devnet -- --fresh`.
- Gộp env: **một file `ned-wallet/.env`** (gitignored, quyền 600) với 5 biến: `EXPO_PUBLIC_SOLANA_CLUSTER`, `EXPO_PUBLIC_ANCHOR_PROGRAM_ID`, `EXPO_PUBLIC_HELIUS_DEVNET_URL`, `EXPO_PUBLIC_HELIUS_MAINNET_URL`, `EXPO_PUBLIC_DYNAMIC_ENVIRONMENT_ID`; `.env.example` là mẫu (được commit, không có giá trị).
- **Keypair program cần sao lưu**: `~/.config/solana/ned_program-v2-keypair.json` (bản sao: `ned_program/target/deploy/ned_program-keypair.json`). File `ned_program-v1-8tTSP-keypair.json` giờ vô dụng.

### T1.3 + T1.6 — Onboarding mới + nạp SOL (nhánh `feat/t1-3-onboarding`, CHƯA merge)
- Luồng: **Splash** (`app/index.tsx`) → **welcome** → **setup** (đọc ReverseRecord; người quay lại → "Welcome back, @x!" → Home/Mode) → **fund** (thiếu SOL: số cần tính từ rent thật + phí + 25% ≈ 0.0055 SOL, QR + copy, Get test SOL / faucet.solana.com, poll 3 s) → **profile** (kiểm tra trùng username 400 ms + 3 gợi ý; SĐT tuỳ chọn mặc định tắt → phone_key + kiểm tra PhoneRecord; chi phí thật; `create_profile` + `link_phone` trong **một** giao dịch) → **mode** (Simple/Crypto theo ví) → Home.
- Thành phần: `components/onboarding/{theme.ts,ui.tsx}`, `services/onboarding.ts`, `services/identity/ownPhone.ts` (SĐT dạng rõ chỉ ở SecureStore/localStorage), `stores/useWalletModeStore.ts`; font Space Grotesk/Inter/Space Mono; `expo-linear-gradient`.
- Đã xoá `app/(auth)/`, onboarding cũ (phone/username/welcome cũ), stub profile cũ; `/login` → `/welcome`.
- Đổi so với thiết kế: bỏ "No network fees, ever" và "Free. N.E.D covers the network fee" (không có sponsorship).
- Kiểm tra: tsc 0 lỗi; lint không lỗi mới (58 lỗi có sẵn, main 77); web + android export OK; expo-doctor 21/21; headless: redirect đúng, không lỗi JS; **giao dịch gộp create_profile + link_phone trên devnet OK** (`3XLtR1d5VRoEkfGFA93QC1RFeoncap84Qn3av4aTtKdMk3QYMFMXTd36Kp8PdMLdQLuaidbFSrBAFYMDHcjockMP`).
- **Chưa làm**: test tay với Google (đăng nhập → profile → mode → Home; đăng xuất → "Welcome back"). Với 1 tài khoản Google: nên tạo hồ sơ **có bật SĐT** (ví đã có SOL nên màn Fund sẽ được bỏ qua).

## 2. Quyết định đã chốt
- Bỏ Supabase, `ned-hub`, relayer; **không backend** (ngoại lệ có thể: 1 hàm serverless cho LLM/khoá Jupiter — Gate D0 chưa chốt).
- Auth Dynamic, chỉ Google; bỏ Email OTP, bỏ ví ngoài.
- **Không gas sponsorship** → T1.6: nạp sẵn **≥ 0.05 SOL/tài khoản demo** qua faucet.solana.com (GitHub login); airdrop trong app chỉ dự phòng.
- **Ưu tiên web**; scrypt **N=2^15**; thiết kế cần đổi mọi dòng "Network fee free".
- Identity Phương án C: username công khai; SĐT tuỳ chọn, chỉ lưu `scrypt(SĐT)` on-chain, chưa xác minh OTP (hiện "Unverified number"); 1 SĐT ↔ 1 tài khoản.

## 3. Việc còn lại (đề xuất thứ tự)
1. **Test tay T1.3** trên web → tạo PR `feat/t1-3-onboarding` → merge.
2. (Tuỳ chọn) để test lặp: **A.** thêm `close_profile` vào program (+ nút "Delete profile (dev)") — hoặc **B.** đăng nhập email test `+dynamic_test` của Dynamic sandbox chỉ ở chế độ dev.
3. **T1.7**: tra cứu người nhận (send, SendModal, notification-detail, settings) chuyển từ `services/profile.ts` sang `dualPda` (@username → NameRecord, SĐT → phone_key → PhoneRecord, ví → ReverseRecord), hiển thị "Unverified number"; gỡ `services/profile.ts` + `services/identity/legacy.ts`.
4. **Gate D0** còn mở: Jupiter Tokens API cần `x-api-key` (nhúng key Free vs danh sách xStocks tĩnh); LLM cho trợ lý AI (serverless / bỏ LLM / bỏ Phase 5); ô thứ 3 chế độ Simple (EARN hay SWAP).
5. **Phase 2 (P0)**: Swap Jupiter (keyless `/order`, Demo mode không broadcast, phí 0.25%).
6. Phase 3 xStocks, Phase 4 Home V4 + hai chế độ ví + Settings (gỡ `DevTestPanel`), Phase 5 AI (stretch), Phase 6 dApp Browser, Phase 7 test/quay video. Hạn: **10/10/2026**.

## 4. Lệnh hay dùng
```bash
# App (ned-wallet)
pnpm web                                    # chạy web local (cần localhost:8081 trong CORS Dynamic)
npx tsc --noEmit && pnpm lint               # kiểm tra
pnpm test:identity                          # unit test phone_key
pnpm identity:devnet -- --fresh             # kiểm chứng identity trên devnet (tốn ~0.05 SOL từ id.json)
pnpm run predeploy && pnpm run deploy       # deploy GitHub Pages (tự chạy, Claude không có quyền)
npx eas-cli build --profile development --platform android   # dev build Android (cloud)

# Program (ned_program)
anchor build && cargo test --manifest-path programs/ned-program/Cargo.toml
solana program show 8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh --url devnet
anchor idl upgrade -f target/idl/ned_program.json --provider.cluster devnet   # sau khi đổi program
```

## 5. Lưu ý kỹ thuật dễ vấp
- RPC devnet công khai hay lỗi/429 → dùng URL Helius trong `.env` cho CLI/script.
- Web: `Alert.alert` đã được shim (`services/webAlert.ts`); không dùng `Platform`-only API mà không kiểm tra web.
- Typed routes của Expo Router cần dev server chạy để sinh lại `.expo/types` khi thêm màn mới (nếu `tsc` báo route không tồn tại).
- `ts-node` với TypeScript 6 cần các override trong script `identity:devnet` (xem `package.json`).
- Mọi `EXPO_PUBLIC_*` nằm trong bundle → không đặt bí mật; nên giới hạn Helius key theo domain.
- Commit message kết thúc bằng dòng `Co-Authored-By` theo quy ước; mỗi task một nhánh → PR → merge `main` (chủ dự án tự tạo PR/merge).
