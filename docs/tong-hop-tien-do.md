# Tổng hợp tiến độ N.E.D Wallet (26–27/09/2026)

> **Cập nhật 02/10/2026:** việc tiếp theo là Milestone Lock theo [`09-milestone-lock/`](09-milestone-lock/README.md) (program + màn hình hợp đồng). Các mục bên dưới vẫn là trạng thái đã xây và đã test đến 27/09.

> Tài liệu bàn giao cho phiên làm việc tiếp theo (người hoặc trợ lý AI). Đọc cùng: [`README.md`](README.md), [`04-ke-hoach-code.md`](04-ke-hoach-code.md) (mục "Cập nhật sau Phase 0"), [`03-ky-thuat/dev-handoff.md`](03-ky-thuat/dev-handoff.md) (mục 1a — identity on-chain), [`../ned-wallet/ARCHITECTURE.md`](../ned-wallet/ARCHITECTURE.md).

## 0. Trạng thái nhanh

| Hạng mục | Trạng thái |
|---|---|
| Nhánh `main` | Đã có T0.1–T0.5, T1.2/T1.4, T1.5 và T1.3/T1.6 (PR #1–#9); xác minh `origin/main` tại `6c5f4e9` |
| Onboarding T1.3 + T1.6 | **Đã merge PR #9**; chủ dự án xác nhận đã test onboarding web và hệ thống hoạt động ổn (27/09/2026) |
| Nền tảng demo | **Web trước** (GitHub Pages `https://tdat10052499.github.io/Unihackfest-2026/`); Android APK qua EAS là phụ |
| Auth | **Dynamic** (Google + ví nhúng Solana MPC V3) qua `useAuth()` — Privy đã gỡ hẳn |
| Backend | **Không có** (đã bỏ Supabase, `ned-hub`, relayer) |
| Program | `ned_program` **`8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh`** (devnet, Anchor 1.1.2), IDL đã lên chain |
| Gas | **Không có tài trợ gas** (Dynamic SVM Gas Sponsorship cần gói Enterprise) → người dùng tự trả phí + rent bằng SOL devnet |

### Môi trường của chủ dự án (quan trọng)
- Code trong **WSL** (Windows), **không có Android SDK, không có Mac**, chỉ có **iPhone**, **không có tài khoản Apple Developer trả phí** → không cài được bản native lên iPhone; test chính trên **web (Safari iPhone / Chrome)**.
- Chỉ có **1 tài khoản Google** → mỗi ví chỉ tạo hồ sơ on-chain được 1 lần (chưa có `close_profile`).
- Ví deploy Solana: `~/.config/solana/id.json` = `FSyUz7Kfy58vDosLPMqtVYzbcsCfCyrPiDWc65kY6QuQ` (~8.5 SOL devnet).
- Ví Dynamic của chủ dự án (Google): `9PZwK7pZmZnqfq1D5Xm9JvmoFQbPSjCoxj4AHiVLrhkW` (snapshot trước test onboarding: ~4.99 SOL, ~18 USDC devnet, chưa có hồ sơ trên program mới; trạng thái hiện tại chưa xác nhận).
- Dynamic environment: `b1a57168-6474-44e3-bd3c-d2412f43d0f6` (sandbox "NorthAxis"). Đã bật: Google, Solana + Devnet, ví nhúng V3, CORS `https://tdat10052499.github.io`. **Chưa có** `http://localhost:8081` trong CORS (thêm nếu test local).

## 1. Dòng thời gian các task

### T0.1 — Cấu hình (PR #1)
Cập nhật tham chiếu Expo SDK 57, thêm `.mcp.json` (MCP: dynamic, jupiter, solana, expo).

### T0.2 — Gỡ khoá bí mật + relayer (PR #2)
- Xoá luồng "client-side relayer" dùng `EXPO_PUBLIC_ADMIN_SECRET_KEY`, mọi lời gọi `ned-hub`, `RELAYER_FEE_PAYER`, `TREASURY_FEE_PAYER`; xoá `test_key.js` (chứa secret key) và `test-relayer.js` (Helius key); tạo `.env.example`.
- Quét bí mật toàn repo + lịch sử git: **khoá ví relayer `b7TFMuVZzZneuHSMuoWiV3d52yRF7pLTLVF7HDKNWqz` đã lộ** (trong `test_key.js`, `.env` từng commit, bundle cũ trên `gh-pages`); Helius key và Supabase `service_role` key cũng lộ.
- **Việc chủ dự án cần làm (nếu chưa)** — cập nhật ở N13 (03/10/2026). Lịch sử git và bundle cũ trên `gh-pages` vẫn còn các khoá cũ, nên phải đổi khoá chứ không chỉ xoá file:
  - [ ] Rút hết SOL khỏi ví relayer `b7TF…Wqz` và không dùng ví này nữa.
  - [ ] Helius: tạo key devnet + mainnet mới, xoá key cũ, **giới hạn key theo domain** `https://tdat10052499.github.io` (thêm `http://localhost:8081` khi chạy local). Cập nhật `EXPO_PUBLIC_HELIUS_DEVNET_URL` / `EXPO_PUBLIC_HELIUS_MAINNET_URL` trong `.env`, rồi kiểm tra bằng `npm run identity:check` (bước tra `sns.sol` trên mainnet).
  - [ ] Supabase: xoá project (không còn dùng) hoặc đổi `service_role` + anon key.
  - [ ] Jupiter: thu hồi key cũ (từng nằm trong `.env.example` và bundle), tạo key mới, chỉ đặt trong `.env`.
  - [ ] Sau khi đổi khoá: deploy lại GitHub Pages (`npm run predeploy && npm run deploy`) để bundle chỉ chứa khoá mới.

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

### T1.3 + T1.6 — Onboarding mới + nạp SOL (PR #9, đã merge main)
- Luồng: **Splash** (`app/index.tsx`) → **welcome** → **setup** (đọc ReverseRecord; người quay lại → "Welcome back, @x!" → Home/Mode) → **fund** (thiếu SOL: số cần tính từ rent thật + phí + 25% ≈ 0.0055 SOL, QR + copy, Get test SOL / faucet.solana.com, poll 3 s) → **profile** (kiểm tra trùng username 400 ms + 3 gợi ý; SĐT tuỳ chọn mặc định tắt → phone_key + kiểm tra PhoneRecord; chi phí thật; `create_profile` + `link_phone` trong **một** giao dịch) → **mode** (Simple/Crypto theo ví) → Home.
- Thành phần: `components/onboarding/{theme.ts,ui.tsx}`, `services/onboarding.ts`, `services/identity/ownPhone.ts` (SĐT dạng rõ chỉ ở SecureStore/localStorage), `stores/useWalletModeStore.ts`; font Space Grotesk/Inter/Space Mono; `expo-linear-gradient`.
- Đã xoá `app/(auth)/`, onboarding cũ (phone/username/welcome cũ), stub profile cũ; `/login` → `/welcome`.
- Đổi so với thiết kế: bỏ "No network fees, ever" và "Free. N.E.D covers the network fee" (không có sponsorship).
- Kiểm tra: tsc 0 lỗi; lint không lỗi mới (58 lỗi có sẵn, main 77); web + android export OK; expo-doctor 21/21; headless: redirect đúng, không lỗi JS; **giao dịch gộp create_profile + link_phone trên devnet OK** (`3XLtR1d5VRoEkfGFA93QC1RFeoncap84Qn3av4aTtKdMk3QYMFMXTd36Kp8PdMLdQLuaidbFSrBAFYMDHcjockMP`).
- **Test tay (27/09/2026): chủ dự án xác nhận “Tôi đã test và đã hệ thống hoạt động ổn”** khi được hỏi về onboarding web. Chưa cung cấp thiết bị/trình duyệt hoặc kết quả riêng từng nhánh (Fund, SĐT tuỳ chọn, đăng nhập lại); không suy ra các nhánh này đều đã được test.

### Đồng bộ trạng thái onboarding + Gate D0 (27/09/2026)
- Nhánh: `chore/onboarding-status-d0`, từ `origin/main` (`6c5f4e9`, merge PR #9).
- Sửa trạng thái merge T1.3/T1.6; ghi quyết định D0 của chủ dự án và thứ tự việc tiếp theo.
- Đã nhận xác nhận của chủ dự án: onboarding web đã test, hệ thống hoạt động ổn. Hoàn tất việc 1; phạm vi chi tiết từng nhánh test chưa được cung cấp.
- Chỉ sửa tài liệu; không thay đổi app/program, không gửi giao dịch hoặc dùng khoá.
- Kiểm tra phiên này: `npx tsc --noEmit` pass; lint 53 lỗi / 81 cảnh báo có sẵn (app/config không đổi so với `origin/main`); `git diff --check` pass; `npx expo export --platform web --platform android` pass (có cảnh báo package exports). Chưa chạy build APK native trong task tài liệu này.
- Test tay Safari iPhone: mở bản web đã deploy → Continue with Google → Setup → Profile (Fund chỉ khi thiếu SOL) → Mode → Home; đăng xuất/đăng nhập lại kiểm tra "Welcome back". Ghi rõ bước bị bỏ qua; nếu đã có hồ sơ thì luồng người mới chưa được kiểm chứng lại.

## 2. Quyết định đã chốt
- Bỏ Supabase, `ned-hub`, relayer; **không backend**, không ngoại lệ serverless cho LLM/khoá Jupiter (Gate D0 chốt 27/09).
- Auth Dynamic, chỉ Google; bỏ Email OTP, bỏ ví ngoài.
- **Không gas sponsorship** → T1.6: nạp sẵn **≥ 0.05 SOL/tài khoản demo** qua faucet.solana.com (GitHub login); airdrop trong app chỉ dự phòng.
- **Ưu tiên web**; scrypt **N=2^15**; thiết kế cần đổi mọi dòng "Network fee free".
- Identity Phương án C: username công khai; SĐT tuỳ chọn, chỉ lưu `scrypt(SĐT)` on-chain, chưa xác minh OTP (hiện "Unverified number"); 1 SĐT ↔ 1 tài khoản.

## 3. Việc còn lại (đề xuất thứ tự)
1. **Đã hoàn tất xác nhận test tay T1.3/T1.6**: chủ dự án báo hệ thống hoạt động ổn (27/09); PR #9 đã merge.
2. **T1.8 (tuỳ chọn)**: trình kế hoạch `close_profile` đóng Name + Reverse (+ Phone nếu có), hoàn rent về chủ và nút "Delete profile" trong Settings chỉ ở chế độ dev; chờ chủ dự án duyệt trước khi sửa program.
3. **T1.7 → Checkpoint 2 (HOÀN TẤT, 28/09/2026)**: send/SendModal dùng resolver chung: cache cục bộ → SNS `.sol` Mainnet (chỉ đọc) → NameRecord → PhoneRecord → địa chỉ ví. Trước khi ký luôn tra mới lại recipient; SĐT hiện `@username · Unverified number` và checkbox `Is this @username?`. Settings đọc ReverseRecord/ownPhone và link/unlink phone bằng instruction thật, hiển thị phí/rent SOL. History/notification batch ReverseRecord rồi reverse SNS, fallback địa chỉ rút gọn. Đã gỡ `services/profile.ts` + `services/identity/legacy.ts`.
   - **Test tay trên web: 6/6 đạt** — gửi theo `@username`; gửi theo SĐT với cảnh báo `Unverified number` và bước xác nhận; gửi theo địa chỉ ví; `.sol` chỉ tra cứu Mainnet; History hiện `@username`; Settings link/unlink phone.
   - Fixture devnet (script `pnpm identity:devnet -- --fresh --recipients`, tạo ví tạm trong RAM, hoàn SOL dư): `@t17_0_8wc8v6zk` có SĐT `+84995141202`, ví `8wC8V6ZKabTn4Hc8q6jWA4CELuMvyX4VxiAZMGX6VyH`; `@t17_1_4hkvkahz` không có SĐT, ví `4HkvkahZoJhYxoTVJKAiy11TiihdWWCsWGg3Cmmt8EuT`. Không ghi khóa riêng.
   - Kiểm chứng read-only đã pass: hai username, SĐT + cảnh báo, địa chỉ, batch reverse, `sns.sol` Mainnet. SNS SDK 4.0.1 có ngưỡng slot tạm dừng `.sol`; cần kiểm tra lại trước pitching.
   - **Polish sau review (nhánh `fix/t1-7-polish`, 28/09/2026)**: `.sol` chỉ lookup, khóa Continue và giải thích Mainnet/Devnet; transaction đã prepare được truyền thẳng tới bước ký/gửi (không dựng lần ba); tham số transfer dùng `amountUsdc`.
4. **Gate D0 đã chốt (chủ dự án, 27/09)**: Tokens API dùng khoá Free public `EXPO_PUBLIC_JUPITER_API_KEY` (chấp nhận lộ/hết hạn mức); Swap `/order` keyless 0.5 RPS có hàng đợi; AI rule-based, không LLM/backend, Phase 5 stretch cắt đầu tiên; ô thứ 3 Simple = **EARN**. Xem [quyết định thiết kế](02-thiet-ke/trang-thai-thiet-ke.md#6-quyết-định-thiết-kế-đã-chốt); xác minh API qua MCP trước khi code.
5. **Phase 2 (P0)**: Swap Jupiter (keyless `/order`, Demo mode không broadcast, phí 0.25%).
   - **T2.2–T2.4 (28/09/2026, nhánh `feat/p2-swap`)**: thêm `services/jupiter/` với hàng đợi tối đa 0.5 request/giây, huỷ quote cũ, timeout, cache Tokens API, hook quote tự làm mới 15 giây và mapping số dư Devnet → mint Mainnet (SOL → wSOL, USDC devnet → USDC Mainnet; token khác = 0). Phí 25 bps được tính/hiển thị phía client trong Demo mode; không gọi `/execute`, không ký, không broadcast.
   - Màn `/swap` thay NeoSwapModal: amount, token picker (verified/unverified), đảo chiều, 50%/Max, Auto/0.5/1/3% slippage, review với minimum received/route/price impact, success/failed và lưu lịch sử `Demo swap` vào AsyncStorage. Home SWAP đã trỏ vào luồng này.
   - Kiểm tra đã chạy: `npx tsc --noEmit`; `node --test services/jupiter/__tests__/jupiter.test.ts`; `npx expo export --platform web --platform android` (pass; chỉ còn cảnh báo exports dependency). `pnpm test:jupiter` không chạy được trong WSL hiện tại vì pnpm global trỏ SQLite store Windows, dùng lệnh `node --test` tương đương.
   - Test tay web Safari iPhone: mở Home → SWAP; thử SOL→USDC và USDC→SOL, đảo chiều, 50%/Max, Auto/0.5/1/3% (3% cần cảnh báo), số dư không đủ, token UNVERIFIED, chờ quote stale để thấy `Price updated`, kiểm tra History có `Demo swap`; mở Network xác nhận không có request `/execute`.
   - **Test tay Safari iPhone vùng Việt Nam (28/09/2026):** `/order` keyless chạy, quote tự làm mới 15 giây và Review → Success đạt. Phát hiện hai lỗi: bàn phím VN trả dấu phẩy (`0,1`) và History mất Demo swap. Đã sửa helper nhập tiền dùng chung (giữ dấu người dùng gõ, chuẩn hoá dấu chấm) và History merge on-chain + Demo theo ví, sắp xếp thời gian. Nguyên nhân History: màn hình refresh ghi đè cache bằng dữ liệu on-chain và bộ lọc cache loại mọi amount chứa `SOL`, nên bản ghi Demo SOL bị loại.
6. Phase 3 xStocks, Phase 4 Home V4 + hai chế độ ví + Settings (gỡ `DevTestPanel`), Phase 5 AI (stretch), Phase 6 dApp Browser, Phase 7 test/quay video. Hạn: **10/10/2026**.

### Phase 3 — xStocks (nhánh `feat/p3-xstocks`)
- MCP Jupiter xác nhận Tokens API v2 `GET /tag?query=stocks`, kết quả có `isVerified`, `tags`, `usdPrice`, `stats24h`, `mcap`, `liquidity`, `holderCount`; client lọc ticker hậu tố `x`, verified và liquidity tối thiểu $10k.
- Thêm Demo Ledger theo ví cho swap/mua/bán, cost basis, lãi/lỗ và reset trong Settings dev. Demo ledger chỉ điều chỉnh số dư hiển thị; P2P vẫn đọc số dư Devnet thật.
- Thêm dữ liệu xStocks, market hours America/New_York, GeckoTerminal OHLCV keyless và cache phía màn xStocks. Màn `/xstocks` gom danh sách, chi tiết, biểu đồ, mua/bán/review/success/failed Demo mode.
- Kiểm tra: unit tests ledger/xStocks, `npx tsc --noEmit`, web + Android export. Test tay Safari iPhone: danh sách → AAPLx → đổi khung → mua $50 → bán 50% → reset demo; kiểm tra không có `/execute`.

### Phase 3 — xStocks rework sau kiểm thử trống (nhánh `fix/p3-xstocks-rework`, 27/09/2026)
- **Nguyên nhân đã xác nhận trong checkout**: `ned-wallet/.env` thiếu `EXPO_PUBLIC_JUPITER_API_KEY`; `pnpm xstocks:diagnose` (chạy tương đương `ts-node`) dừng trước request. Trước đó màn chỉ bắt lỗi mà không render nên nhìn như danh sách trống. Người dùng để trống phần kết quả deploy trong báo cáo, vì vậy chưa có bằng chứng về deploy hoặc số token live; không kết luận bộ lọc là nguyên nhân.
- Thêm `scripts/xstocks-diagnose.ts`, lệnh `pnpm xstocks:diagnose`, biến mẫu public vào `.env.example`, và ghi schema Jupiter xác nhận qua MCP: `symbol`, `isVerified`, `tags`, `liquidity`, `usdPrice`, `stats24h`. Giữ x + verified + liquidity ≥$10k đến khi có output từ API thật.
- Tách `/xstocks`, `/xstocks/[mint]`, `/xstocks/trade`, `/xstocks/review`, `/xstocks/result`; thêm `components/xstocks/*`. Danh sách có Loading, lỗi rõ + Retry (thiếu key, HTTP/mạng, 0 token/0 token đạt filter), Search/Sort, market badge, Your investments/empty state và allocation palette. Home có Your Assets Demo balance; Swap có shortcut sang xStocks.
- Detail hỗ trợ 1D/1W nến giờ, 1M/6M nến ngày (6M dùng `/ohlcv/day`), thay đổi % theo khung, vị thế/P&L và stats. OHLCV dùng `react-native-svg`, queue cách nhau ≥2,1 giây + cache 60 giây. Kiểm tra thật GeckoTerminal ngày 27/09: GET token-pools và OHLCV day đều HTTP 200, `access-control-allow-origin: *` cho Origin GitHub Pages.
- Buy/Sell có màn Review riêng; đầu ra cổ phần lấy từ Jupiter `outAmount` (trừ N.E.D fee demo 0,25%), ledger không tính `USD / price`. Sell nhận gross USDC từ quote, ledger tính phí/cost basis/P&L; Risk Disclosure chỉ hiện cho lần mua đầu theo ví; success/fail có Teddy và receipt. Mọi lệnh đều Demo, không ký, không broadcast, không `/execute`.
- Test filter dùng fixture theo schema Tokens API (5 bản ghi kiểm thử, không phải snapshot live do thiếu key); test ledger buy/sell/cost basis/reset, giờ thị trường và cấu hình 6M daily đều pass. `node --test services/__tests__/demoLedger.test.ts services/__tests__/xstocks.test.ts` pass; `pnpm test:xstocks` lỗi do SQLite store pnpm global ở đường dẫn Windows trong WSL. `npx tsc --noEmit` pass; eslint phần code mới 0 lỗi; `npx expo export --platform web` và `--platform android` pass (còn cảnh báo exports dependency đã có).
- **Còn cần test tay Safari iPhone sau khi thêm key public vào `.env` và deploy**: chạy `pnpm xstocks:diagnose` (gửi output, tuyệt đối không gửi key), đảm bảo ≥5 mã; mở AAPLx, thử 1D/1W/1M/6M; mua $50, xác nhận Cash giảm và danh mục/allocation tăng; bán 50%, xem P/L; Reset demo data trong Settings (dev). Kiểm tra Network không có `/execute`. Chưa đánh dấu Phase 3 hoàn tất đến khi có dữ liệu API và test tay này.

### Căn chỉnh PDF: Home / Swap / xStocks — `feat/ui-pdf-alignment` (28/09/2026)

- Chủ dự án xác nhận hệ thống đã hoạt động ổn sau sửa Jupiter; yêu cầu tiếp theo tập trung thiết kế ba nhóm màn Home, Swap, xStocks. Chưa suy diễn thành hoàn tất toàn bộ checklist Safari Phase 3.
- Đã đối chiếu PDF 42 trang và canvas: thay Home Neo cũ bằng hero tím → trắng, các thẻ ví nhỏ, bốn action, Your Assets; thanh điều hướng pill. Không dùng số dư/biến động mẫu. Home hiển thị Cash + đầu tư Demo và tách SOL on-chain.
- Swap dùng thẻ pay/get, keypad hỗ trợ dấu phẩy, slippage, nút gradient, review/receipt, slide xác nhận và lựa chọn nút cho trợ năng. Phí 0.25% hiển thị token/USD và trừ khỏi số nhận Demo. Khoá review khi quote chưa khớp input; quote đổi yêu cầu Accept. Bộ chọn không còn đổi nhãn token mà giữ quote SOL/USDC âm thầm: demo hiện chỉ cho chọn hai tài sản được hỗ trợ.
- xStocks: list/investments với Teddy empty, chart xanh/đỏ + vùng tô, range dưới chart, vị thế/stats dạng lưới, Buy/Sell cố định, màn tiền lớn/keypad, review/disclosure/slide và result/receipt/View position. Tái dùng theme/fonts/assets, không thêm dependency production.
- Kiểm tra: `tsc` 0 lỗi; 5 file test Node (ledger, xStocks, Jupiter, tokenResponse, amountInput) pass. Lint main 49 errors/94 warnings → nhánh 48 errors/71 warnings, không có lỗi mới theo file/rule; code đổi 0 errors/0 warnings. Export Web + Android pass với `--max-workers 2` (cảnh báo dependency exports cũ).
- Đã kiểm tra ảnh Chromium 390×844 bằng fixture cho bảy màn, không tràn ngang; sửa khoảng cách dấu `$` và cố định CTA chi tiết. Chưa test ví thật hay Safari iPhone cho giao diện mới; không thực hiện giao dịch on-chain trong phiên này.
- Báo cáo, các khác biệt có chủ ý với PDF và checklist test tay: [ui-pdf-alignment.md](02-thiet-ke/ui-pdf-alignment.md). Ưu tiên Safari: Home refresh/navigation; Swap `0,1`, keypad, slippage, Accept giá, slide; xStocks AAPLx bốn khung, mua $50, bán 50%, receipt, quay Home; Network không có `/execute`.

## Milestone Lock — progress

*Bàn giao ngày 03/10/2026. `main` = `e1e77d5`. Chi tiết từng task ở mục "Milestone Lock" ngay bên dưới.*

### Task đã xong (non-ui-plan N0–N13)

Mọi nhánh dưới đây đã nằm trong `main`; từ N12, mỗi thay đổi được push và fast-forward `main`.

| Task | Nhánh | Commit chính |
| --- | --- | --- |
| N0 cấu hình chain + sửa B1, B2, B4, B7 · N1 send/errors/ATA | `chore/n0-chain-config` | `7cb4187`, `32831ec`, `8d6e781`, `b7ca01a` |
| N2 spike IDL coder (BorshCoder dùng được) | `spike/n2-idl-coder` (PR #31) | `2b98f91` |
| N3 tách module program + helper test | `refactor/n3-program-modules` | `3b63204`, `951e111` |
| N4–N6 `SharedFund` + 8 instruction P0, test, deploy | `feat/n4-milestone-p0` | `3768be7`, `3a8337e`, `ea2cd2c` |
| N7 nhóm P1 (dispute, concede, propose/accept cancel) + deploy | `feat/n7-milestone-p1` | `6e162fd`, `b96135a`, `d723064` |
| N8 `services/milestone` · N9 hook cho màn hình | `feat/n8-milestone-services` | `102a595`, `374bba9`, `e561795` |
| N10 smoke script devnet + harness `/dev/milestone`; sửa theo review | `feat/n10-devnet-harness` | `2c52ec8`, `2e5c663`, `7cbd282`, `c4de3fc`, `6499dc0` |
| N11 cờ tính năng, gate onboarding, store region/consent, xoá code chết | `chore/n11-app-plumbing` | `23f04a2`, `d174e8b`, `575de43`, `9fc01be`, `9f2a2b9` |
| N12 key partner thật, script recycle, deploy lại | `chore/n12-demo-ops` | `692c78c`, `8523571`, `b90a462` |
| N13 bảo mật + README; sửa theo review | `chore/n13-security-readme` | `8dacce1`, `bf752d4`, `7b866ee`, `55a6954`, `e1e77d5` |
| W0 `packages/ned-core` + pnpm workspace ở gốc | `feat/w0-ned-core` | `5e55049`, `111c970`, `c3d70a1`, `ad83f13` |
| W1 khung `ned-workspace` (Vite + React), đăng nhập, wallet panel, `vercel.json` | `feat/w1-workspace-scaffold` | `1a8fb24`, `5b0ac9a`, `fb3648f`, `17ab376`, `df97ef1`, `6e3fc52` |
| A1 program v1.1 (`brief_hash`, evidence ≠ 0, `post_note`), chưa deploy | `feat/a1-program-v1-1` (chưa merge, chờ A2) | xem block A1 |

**W0 (03/10/2026):**
- **Đã chọn pnpm workspace ở gốc repo**, chạy được ngay, không cần phương án path-alias. Lockfile chuyển lên gốc; giữ nguyên version (không tải gì mới); chỉ còn **một** bản `@solana/web3.js` 1.98.4, kiểm tra cả trên đĩa và trong bundle web.
- **Test:** core 72/72 + `ned-wallet` 19/19 = 91 (bằng trước); `npx tsc --noEmit` 0 lỗi; `npx expo export --platform web` OK. Bước devnet của `identity:check` PASS qua core.
- **Script ts-node** chạy bằng `tsconfig.scripts.json`.
- **Devnet sau W0:**
  - `npm run milestone:devnet` PASS qua `@ned/core` (fund `EnGA2qTWs995ihRP22W1SFNmRxx6nWNmAqW7GFyVVJWr`, Settled 2/0/2, đã đóng).
  - `recycle:demo-usdc` trả 4 USDC từ partner về client test (14 → 18 USDC).
  - Đã merge vào `main` qua PR #32.
- **Vấn đề mới:**
  - chưa thử build EAS (Android) từ monorepo;
  - `tsc` riêng cho core cần thêm `@types/node` (devDependency, cần hỏi trước, làm ở W1);
  - cài đặt từ **gốc repo** (`pnpm install`), không chạy trong `ned-wallet/`.

**A1 (03/10/2026, chưa deploy):**
- **Program v1.1 theo program-spec:**
  - `SharedFund` thêm `brief_hash` ở offset 676, nên account dài **740 byte**; `ACCOUNT_VERSION = 2`; `NOTE_MAX_LEN = 900`, `NOTE_MAX_PARTS = 8`;
  - `create_fund(…, brief_hash)`: hash toàn số 0 thì lỗi `InvalidBriefHash`; event `FundCreated` có thêm `brief_hash`;
  - `accept(…, expected_brief_hash)`: khác hash đã lưu thì lỗi `BriefMismatch`, kiểm tra trước mọi thay đổi state;
  - `submit`: evidence toàn số 0 thì lỗi `InvalidEvidence`;
  - instruction mới `post_note` (fund chỉ đọc, không đổi state, emit `NotePosted`);
  - 5 lỗi mới nối sau `MathOverflow`, không đổi thứ tự lỗi cũ.
- **Test:**
  - `anchor build && cargo test`: milestone 27/27 (24 cũ + 16, 17, 18), identity 10/10, helpers 4/4, `test_id` 1/1; 0 warning;
  - `program_autofixer`: 0 issue;
  - CU: `post_note` 900 byte ≈ 4 630 (brief) / 4 641 (delivery).
- **Kích thước `.so`:** 488 464 byte, lớn hơn 475 280 byte đang cấp phát nên A2 **phải `solana program extend`** thêm ≥ 13 184 byte. Tiền rent ước tính ≈ 0,092 SOL [Inference: 6 960 lamport/byte]; A2 sẽ tính chính xác.
- **Chưa làm (A2):** đóng các fund 708 byte cũ (G4), extend, upgrade, `anchor idl upgrade`, copy IDL vào `packages/ned-core/src/idl/`, sửa `layout.ts`/`decode.ts`/`client.ts` trong core (W0 đã chuyển các file này từ `ned-wallet/services/milestone/` sang core), smoke run. Cho tới lúc đó app vẫn dùng IDL v1, khớp với program đang chạy trên devnet.

**W1 (03/10/2026):**
- **App mới `ned-workspace/`** (Vite 8 + React 19 + TypeScript, trong pnpm workspace):
  - React Router, TanStack Query, Motion 13.5 (`LazyMotion` + `domAnimation`, `MotionConfig reducedMotion="user"`; khi bật Reduce Motion thì mọi animation tức thì, đúng board MotionSurfaces);
  - token CSS theo các board `Web*` (`src/styles/tokens.css`), CSS Modules, không viền;
  - đăng nhập Dynamic Google (redirect) qua `src/auth/` với cùng hình dạng `useAuth()` như mobile;
  - `configureCore()` từ các biến `VITE_*`; `.env.example` chỉ có tên biến.
- **Màn hình:**
  - top bar (logo, badge Devnet, nút ví có avatar sinh từ địa chỉ ví bằng `@ned/core/avatar`);
  - wallet panel: chưa đăng nhập ("Continue with Google") và home (số dư USDC hoặc ≈ VND theo region, "Needs your action" dạng placeholder, quick actions mở app điện thoại, "Open the full wallet", "Sign out"); Escape, bấm ra ngoài, focus trap, `aria-expanded`; API `confirm(request)` để sẵn, trạng thái confirm làm ở W4;
  - `/sign-in` theo board WebSignIn; `/` là Overview tạm (lời chào + bảng "Your contracts" đọc từ chain); `*` → `/`;
  - màn hình hẹp hơn 900 px: "Use the N.E.D app on your phone" + QR tới app điện thoại.
- **`ned-workspace/vercel.json`:**
  - rewrite SPA;
  - CSP ở chế độ **Report-Only** (Dynamic, Ably realtime của ví MPC, RPC devnet Solana/Helius https+wss, Google Fonts);
  - `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `nosniff`;
  - lệnh install pnpm 11 cho monorepo. Đã chạy thử install + build trong một bản clone sạch: OK (16 giây).
- **Test:**
  - `pnpm --filter ned-workspace build` và `tsc --noEmit`: OK;
  - core 74/74 + `ned-wallet` 19/19; `ned-wallet` tsc 0 lỗi;
  - Playwright với `vite preview`: panel mở/đóng (có và không có Reduce Motion), focus trap, Escape trả focus về nút, bấm ra ngoài thì đóng, cổng màn hình hẹp;
  - Lighthouse desktop `/sign-in`: performance 99, accessibility 100, best practices 100.
- **Chưa làm / cần chủ dự án:**
  - đăng nhập Google thật (cần `.env.local` và thêm `http://localhost:4173` vào allowed origins của Dynamic);
  - so địa chỉ ví với điện thoại; Lighthouse cho `/` khi đã đăng nhập;
  - ~~tạo project Vercel~~: chủ dự án đã tạo ngày 03/10/2026, domain production **https://unihackfest-2026.vercel.app** (route SPA và các header của `vercel.json` đã được kiểm tra trên site thật). Lần deploy đầu thiếu `VITE_DYNAMIC_ENVIRONMENT_ID` và `VITE_HELIUS_DEVNET_URL`; sau khi Redeploy, bundle đã có đủ biến. Đã kiểm tra: Dynamic cho phép origin Vercel và GitHub Pages, chặn origin lạ. Riêng key Helius **vẫn nhận request từ origin lạ** (Allowed Domains chưa có hiệu lực).
- **Ghi chú:**
  - board ghi "Received this month", nhưng chain không lưu ngày release, nên panel hiện "Released to you" (tổng từ trước đến nay);
  - bundle JS 457 kB gzip (Dynamic + web3.js), sẽ tách lazy-load ở W6;
  - region mặc định `vn` khi máy này chưa lưu (hỏi region trên Workspace: W2).

### Test (lần chạy cuối, 03/10/2026)

- `anchor build && cargo test`: identity 10/10, milestone 24/24, helpers 4/4, `test_id` 1/1; 0 warning. `program_autofixer`: 0 issue.
- `npm test`: 93/93 (core 74 + wallet 19). `pnpm --filter ned-workspace build`: OK. `npx tsc --noEmit`: 0 lỗi. `npx expo export --platform web`: OK.
- Devnet: `npm run milestone:devnet` PASS (VND path ×2, `--refund` ×1), lần cuối với partner thật. `recycle:demo-usdc` PASS (16 → 18 USDC).
- `npm run identity:check`: các bước devnet PASS; bước `sns.sol` trên **mainnet** lỗi (xem vấn đề mở 1).

### Thông tin devnet

| Mục | Giá trị |
| --- | --- |
| Program | `8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh`, data length **475 280 byte**, authority `FSyUz7Kfy58vDosLPMqtVYzbcsCfCyrPiDWc65kY6QuQ` |
| Deploy N6 (P0) | `2bDxqhioVtTekVmMiHa4GQtLyCmV3GDttkT2WwQc3uLW69DPyXYBYAu3ifihbSLigi1xRBkkLZyfuRDkapk5QxUq` (extend 231 360 → 420 000) |
| Deploy N7 (P1) | `eokWJZ1oius7q234LLWXNoR1sqSHFWnVK8TfuJkWqYyER3MZNCC2M3YYJkJ1Ax3iY8m7z7unCstrzW36nLFLLpy` (extend → 475 280) |
| Deploy N12 (partner thật) | `2PvXW7PwD1jCgy14zTjjhCN1zZ2edC6kUJQZgrrbrXRcdSNjU4NcL4vUFKmxqRxnNt4N6Zi1G9uY9anKn6BqJu1L` (slot 506891469) |
| IDL on-chain | Metadata `AMX7B6rjAhcdKzZ8N2Xw3uDcjCRrGonWuXxJ5DMiKK8H`, 17 instruction, khớp `ned-wallet/idl/` |
| Payout partner demo | `FA2qzovJShkNNNnMz3nXmYXvBzenRTgU2oko7RBBhbyp` (keypair `~/.config/solana/ned-demo-partner.json`), USDC ATA `Abey9woydP9w8voHfGsoBzM6tKnAcDugUVWmeQdiD96i` |
| Ví test smoke run | Client `BT9czjT3y8MZvGT5HSB8c7uXZriXJj13BBiGDQCtRT7B` (18 USDC), freelancer `EcpCrZB6HAV8VBRcfmR6DZqwitFpxfkUnEXfqAYPrA4y` |
| Ví deploy | 8,546 SOL (02/10) → 7,197 SOL |
| Workspace (Vercel) | https://unihackfest-2026.vercel.app (Root Directory `ned-workspace`, CSP đang Report-Only) |
| Kích thước | `SharedFund` 708 byte (client @12, freelancer @44); `.so` 475 280 byte |

### Vấn đề còn mở

1. **Đổi khoá** (chỉ chủ dự án làm được): xem checklist ở mục T0.2 bên dưới (relayer, Helius + giới hạn domain, Supabase, Jupiter, deploy lại Pages). Key Helius mainnet hiện làm `identity:check` lỗi ở bước `sns.sol`.
2. **LICENSE**: README ghi MIT nhưng chưa có file LICENSE. Cần quyết định: thêm file MIT hay bỏ dòng này.
3. **Nhãn còn thiếu (review N10 #3)**: milestone đã Submitted và quá review deadline vẫn hiện "auto-release in 0:00". Cần chủ dự án chốt câu chữ. Đề xuất: client "Submitted · review time over · anyone can release", freelancer "Submitted · ready to release".
4. **Chưa test tay**:
   - harness hai trình duyệt (N10);
   - checklist web N11 (đăng nhập, người cũ, người mới đến Home, Send, `/swap` và `/xstocks` chuyển về Home);
   - Send 1 USDC sau khi đổi sang tính tiền bằng BigInt (`55a6954`).
5. **Phần cầu nối tạm (TODO(N11 bridge))**:
   - `CONSENT_SCREEN_READY = false` (bỏ qua màn consent);
   - bước region mở màn `mode`.

   Gỡ khi có màn thiết kế mới.
6. **Mất 2 USDC devnet** ở partner tạm cũ `DwjFsw…`; không lấy lại được (không ảnh hưởng demo).
7. **Mục nhìn thấy nhưng đã bị ẩn**: ô SWAP / XSTOCKS ở Home và tab xStocks ở `WalletNav` vẫn hiện (bấm thì về Home). Gỡ cùng thanh điều hướng mới (PR4/PR5).
8. **Kiểm tra trước khi làm màn hình** (non-ui-plan mục 4): còn mục "harness chạy đủ vòng với hai trình duyệt". Các mục khác đã đạt.

### Prompt tiếp theo (chạy nguyên văn)

```text
Task: refactor-plan.md PR5 — contract screens (list, new, detail with action sheets), built on the redesigned boards.
Branch: feat/pr5-contract-screens (from up-to-date main).
Before coding, read: CLAUDE.md, docs/09-milestone-lock/product-spec.md (sections 3–6), non-ui-plan.md section 3 (frozen hook interface, incl. the N8 additions FundView.actions and FundView.split), refactor-plan.md PR5, docs/tong-hop-tien-do.md "Milestone Lock — progress" (open issues), and the design boards I attach.
Rules:
- Screens use only the hooks (useFunds, useFund, useMilestoneActions, useChainTime, useRegion) and components/design; never import @solana/web3.js, services/milestone/client or services/chain in a screen.
- Routes: app/contracts/index.tsx, app/contracts/new.tsx, app/contracts/[fund].tsx (+ accept sheet); register them in app/_layout.tsx; deep link /contracts/<fund> must work for the prepared demo contract B.
- Copy: product-spec section 6 word table; labels come from FundView (do not re-derive). Ask me for the wording of the "Submitted after the review deadline" label (open issue 3) before building that state.
- P1 actions (dispute, concede, split) only when FEATURES.dispute is true; keep it false.
- No program changes, no deploys, no SOL spending without asking.
Acceptance: npm test, npx tsc --noEmit, npx expo export --platform web; then give me the exact two-browser manual test (Mia desktop Chrome, Vinh iPhone Safari) for create → accept (VND) → lock → submit → approve → release_after_review → close.
After each change: commit, push the branch and fast-forward main (stop if main is not a fast-forward).
```

Nếu bản thiết kế chưa có, chạy trước: *"Run the non-ui-plan section 4 checks: the two-browser harness cycle on /dev/milestone and the N11 web checklist; report each step's result and fix only what fails."*

## Milestone Lock

Đặc tả: [`09-milestone-lock/program-spec.md`](09-milestone-lock/program-spec.md). Kế hoạch: [`09-milestone-lock/non-ui-plan.md`](09-milestone-lock/non-ui-plan.md).

### Program P0 — N4 + N5 (nhánh `feat/n4-milestone-p0`, 02/10/2026; deploy devnet ở N6 bên dưới)

- `ned_program` có thêm 8 instruction P0: `create_fund`, `accept`, `lock`, `submit`, `approve`, `release_after_review`, `refund`, `close`. Thêm account `SharedFund` (708 byte; `client` ở offset 12, `freelancer` ở 44) và lỗi mới mã 6009 (`InvalidMilestoneCount`) → 6033 (`MathOverflow`). Identity giữ nguyên.
- `PAYOUT_PARTNERS` đang dùng public key tạm `DwjFswK4mFycQgV2pckFWYj8T2jTWc4RWgBNgDcbZYjt`, không lưu private key; thay ở N12.
- Kiểm tra: `anchor build && cargo test` đều pass: 10 test identity, 17 test milestone (nhóm 1–6, 9–15 của program-spec mục 8; nhóm 13 mới làm nửa approve + auto-release + refund) và 4 test helper. `program_autofixer`: 0 issue.
- `.so` mới 420 000 byte, bản identity là 231 520 byte.

**Compute units mỗi instruction** (LiteSVM, test `g15_compute_units_per_instruction`; fund 3 milestone, đường Vietnam trừ dòng `accept (OwnWallet)`):

| Instruction | Compute units |
| --- | ---: |
| `create_fund` (3 milestone, tạo fund + vault) | 29 824 |
| `accept` (PayoutPartner) | 7 650 |
| `accept` (OwnWallet) | 7 713 |
| `lock` | 22 260 |
| `submit` | 7 518 |
| `approve` | 27 185 |
| `release_after_review` | 27 355 |
| `refund` | 22 543 |
| `close` (đóng vault + fund) | 16 851 |
| `dispute` (P1, N7) | 7 452 |
| `concede` (P1, N7) | 22 608 |
| `propose_cancel` (P1, N7) | 7 349 |
| `accept_cancel` (P1, N7; hai lần chuyển) | 39 781 |

Mọi instruction P0 đều dưới 30 000 CU; `accept_cancel` (P1) là 39 781 CU. Tất cả đều dưới 20% hạn mức mặc định 200 000.

### Program P1 — N7 (nhánh `feat/n7-milestone-p1`, 02/10/2026)

- Thêm `dispute`, `concede`, `propose_cancel`, `accept_cancel(expected_freelancer_amount, expected_unsettled)`. Mọi thay đổi trạng thái milestone đều xoá đề xuất huỷ đang chờ (program-spec 3.3).
- Kiểm tra:
  - `cargo test`: 10 identity + 23 milestone (thêm nhóm 7, 8 và nửa huỷ của nhóm 13) + 4 helper, tất cả pass.
  - `program_autofixer`: 0 issue.
- IDL có 17 instruction. `.so` 475 280 byte.
- Phần app (builder, rules, action, `FEATURES.dispute`) làm ở N8/N9/N11, không làm ở N7.

### Deploy devnet — N6 (02/10/2026)

| Mục | Giá trị |
| --- | --- |
| Program ID | `8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh` (giữ nguyên) |
| Chữ ký upgrade | `2bDxqhioVtTekVmMiHa4GQtLyCmV3GDttkT2WwQc3uLW69DPyXYBYAu3ifihbSLigi1xRBkkLZyfuRDkapk5QxUq` (finalized, slot 506732736) |
| Program data length | 420 000 byte. Đã `solana program extend … 188640` từ 231 360 byte, tốn 0,958 SOL rent |
| Upgrade authority | `FSyUz7Kfy58vDosLPMqtVYzbcsCfCyrPiDWc65kY6QuQ` (ví deploy) |
| IDL on-chain | Metadata `AMX7B6rjAhcdKzZ8N2Xw3uDcjCRrGonWuXxJ5DMiKK8H`, 13 instruction, khớp `target/idl/ned_program.json`. Đã chép vào `ned-wallet/idl/` |
| `PAYOUT_PARTNERS` | Key tạm `DwjFsw…ZYjt` (không có private key). Đổi ở N12 thì phải deploy lại |
| Ví deploy | 8,546 → 7,529 SOL (tốn ≈ 1,017 SOL; phần lớn là rent extend) |

- Kiểm tra sau deploy: `npm run identity:check` PASS (username, SĐT + cảnh báo, địa chỉ, batch reverse, `sns.sol`), nghĩa là identity không bị ảnh hưởng. `npx tsc --noEmit` 0 lỗi, 34 test node pass.
- **Lưu ý khi đổi IDL (Anchor 1.1.2):**
  - `anchor deploy` cố *init* lại IDL dù metadata account đã có, nên lỗi `Failed to initialize IDL`; phần upgrade program vẫn thành công.
  - Sau đó `anchor idl upgrade` cũng lỗi ở bước cuối (`Failed to upgrade IDL`), để lại buffer.
  - Cách đã chạy được: `npx @solana-program/program-metadata@0.5.1 update idl <program> --buffer <buffer đầy đủ> --close-buffer --rpc https://api.devnet.solana.com -k ~/.config/solana/id.json`, rồi `close-buffer` cho buffer hỏng. Mỗi lần thất bại tốn ≈ 0,05 SOL; các buffer đã đóng và lấy lại rent.
  - Lần sau nên kiểm tra trước bằng `--export` + `simulateTransaction` (miễn phí).

### Deploy devnet lần 2 — N7 (02/10/2026)

| Mục | Giá trị |
| --- | --- |
| Chữ ký upgrade | `eokWJZ1oius7q234LLWXNoR1sqSHFWnVK8TfuJkWqYyER3MZNCC2M3YYJkJ1Ax3iY8m7z7unCstrzW36nLFLLpy` (slot 506736737) |
| Program data length | 475 280 byte. Đã `solana program extend … 55280` từ 420 000 byte, tốn 0,2808 SOL rent |
| Upgrade authority | `FSyUz7Kfy58vDosLPMqtVYzbcsCfCyrPiDWc65kY6QuQ` (ví deploy) |
| IDL on-chain | 17 instruction, khớp `target/idl/ned_program.json`. Đã chép vào `ned-wallet/idl/` |
| `PAYOUT_PARTNERS` | Vẫn là key tạm `DwjFsw…ZYjt` (N12) |
| Ví deploy | 7,529 → 7,243 SOL (tốn ≈ 0,287 SOL; phần lớn là rent extend) |

- Quy trình không lỗi, nên dùng lại lần sau:
  1. `solana program extend` nếu `.so` lớn hơn data length.
  2. `anchor deploy --provider.cluster devnet --no-idl`.
  3. `npx @solana-program/program-metadata@0.5.1 create-buffer target/idl/ned_program.json`.
  4. `fetch-buffer`, so với file IDL local.
  5. `update idl <program> --buffer <buffer> --close-buffer --export` rồi `simulateTransaction` (miễn phí).
  6. Gửi lệnh `update` thật.
- Kiểm tra sau deploy: `npm run identity:check` PASS, `npx tsc --noEmit` 0 lỗi, 34 test node pass.

### Smoke run devnet — N10 (02/10/2026, `npm run milestone:devnet`)

- Script dùng chính builder của app (`services/milestone/client.ts`), nên chạy pass nghĩa là phần mã hoá và danh sách account của app khớp program thật.
- Keypair tạm: client `BT9czjT3…RT7B`, freelancer `EcpCrZB6…PrA4y`, lưu ở `~/.config/solana/ned-milestone-*.json` (ngoài repo). USDC của client lấy từ faucet Circle (20 USDC).

| Lần chạy | Kết quả | Fund |
| --- | --- | --- |
| VND path: create → accept → lock → submit/approve 0 → submit 1 → chờ → `release_after_review` 1 → close | PASS. Partner nhận 2 USDC; Settled 2/0/2 | `HqhrBhHEJLDKrft9C86YbhwByZhH3HktM2D1qMBT3Ca4` |
| `--refund`: create → accept → lock → chờ → refund 0, 1 → close | PASS. Client nhận lại 2 USDC; Settled 0/2/2 | `13uVjgED4fdttWbcu1W9jmLAiQtv6ZVi1LoFiLwXfedp` |

- CU đo trên devnet (chỉ tính program): `create_fund` 19 806 (2 milestone), `accept` 7 642, `lock` 16 191, `submit` 7 518, `approve` 21 124, `release_after_review` 21 291, `refund` 16 471, `close` 13 961.
- Ví deploy: 7,2428 → 7,2013 SOL. 2 USDC gửi tới partner tạm không lấy lại được cho tới N12.
- Harness `/dev/milestone`: chỉ hiện khi `__DEV__` hoặc build với `EXPO_PUBLIC_DEV_TOOLS=1`, không có link trong app.

### Partner demo thật và deploy lần 3 — N12 (03/10/2026)

- **Ví partner demo:** `FA2qzovJShkNNNnMz3nXmYXvBzenRTgU2oko7RBBhbyp`. Keypair ở `~/.config/solana/ned-demo-partner.json` (ngoài repo, quyền 600); chủ dự án tự tạo bằng `solana-keygen new`. Đã đặt vào `PAYOUT_PARTNERS` (program) và `DEMO_PAYOUT_PARTNER` (app).
- **Deploy:** chữ ký `2PvXW7PwD1jCgy14zTjjhCN1zZ2edC6kUJQZgrrbrXRcdSNjU4NcL4vUFKmxqRxnNt4N6Zi1G9uY9anKn6BqJu1L` (slot 506891469). Data length vẫn 475 280 byte, nên không cần extend. IDL không đổi (17 instruction, khớp on-chain). Authority `FSyU…QuQ`. Ví deploy 7,2013 → 7,1988 SOL.
- **`npm run identity:check`:**
  - Mọi kiểm tra identity trên devnet đều pass (hai username, SĐT + cảnh báo, địa chỉ, batch reverse).
  - Bước cuối, tra `sns.sol` trên **mainnet**, lỗi "Unable to resolve this .sol name on Mainnet". Code SNS không đổi so với `main`.
  - Có thể do key `EXPO_PUBLIC_HELIUS_MAINNET_URL` hoặc SNS tạm dừng; kiểm tra key mainnet khi đổi key (N13).
- 2 USDC từ smoke run N10 nằm ở partner tạm cũ `DwjFsw…`, không lấy lại được.
- **Kiểm chứng sau deploy (03/10/2026):**
  - Tạo USDC ATA cho partner: `Abey9woydP9w8voHfGsoBzM6tKnAcDugUVWmeQdiD96i`.
  - `npm run milestone:devnet` (VND path) PASS: partner mới nhận 2 USDC (fund `BaCKQhnoMwwuPUAEcb7GPiWn5fKC8H33GEVuqy8v7keY`, Settled và đã đóng).
  - `npm run recycle:demo-usdc` gửi 2 USDC về client test (16 → 18 USDC). Vậy allowlist mới chạy trên devnet, và USDC partner nhận được có thể lấy lại.
  - Ví deploy còn 7,1973 SOL.

### Checklist ngày demo (product-spec mục 7)

| Khi nào | Việc | Ai |
| --- | --- | --- |
| Trước 7/10 | **Tài khoản Google thứ hai cho Mia (client).** Đăng nhập app, tạo hồ sơ `@mia…`, chọn Crypto (region `intl`). Ghi lại địa chỉ ví | PO |
| Trước 7/10 | **Vinh (freelancer):** tài khoản Google hiện tại, có hồ sơ, chọn Simple (region `vn`) | PO |
| 7/10 và 8/10 | **USDC cho Mia:** https://faucet.circle.com → USDC → Solana Devnet → địa chỉ ví Mia (20 USDC mỗi lần, cách nhau ít nhất 2 giờ). Ngày demo cần **30 USDC** (10 cho hợp đồng B, 20 cho hợp đồng A); số dư có thể bù bằng lệnh recycle | PO |
| 7/10 | **SOL devnet cho cả hai ví:** https://faucet.solana.com (đăng nhập GitHub). Mỗi ví ≥ 0,05 SOL. Vinh cần SOL để ký `accept` và `submit` | PO |
| 8/10 | Tập demo đủ một lần: hợp đồng A (2 × 10 USDC, VND path) và hợp đồng B (1 × 10 USDC, submit_by = lúc tạo + 5 phút, review 60 s) | Team |
| Sau mỗi lần tập | **Recycle USDC partner về Mia** (lệnh dưới); kiểm tra số dư Mia ≥ 30 USDC | Dev |
| 15 phút trước pitch | Chuẩn bị hợp đồng B **trong app** bằng chính login của Mia và Vinh (create → accept VND → lock → submit). Để review deadline qua lúc trình bày | Team |
| Ngày demo | Mở hợp đồng B bằng deep link, bấm Release; mở explorer xem vault thuộc program | Presenter |

Lệnh recycle (chạy trong `ned-wallet/`; keypair partner mặc định `~/.config/solana/ned-demo-partner.json`; phí do `~/.config/solana/id.json` trả, partner không cần SOL):

```bash
npm run recycle:demo-usdc -- --to <ví Mia> --dry-run      # xem trước
npm run recycle:demo-usdc -- --to <ví Mia>                # gửi toàn bộ
npm run recycle:demo-usdc -- --to <ví Mia> --amount 10    # gửi 10 USDC
```

## 4. Lệnh hay dùng

### Bổ sung sửa `tokens.filter is not a function` — `fix/p3-xstocks-rework`
- Sau khi chủ dự án thêm key, đã xác minh nguyên nhân tiếp theo: Jupiter `/tag?query=stocks` trả HTTP 200 nhưng JSON lỗi `{status:400,message:"Invalid tag provided."}`; code cũ ép object thành mảng. Kết luận thiếu key trước đây chỉ áp dụng môi trường lúc chưa cấu hình.
- Sửa parser chung cho Tokens API và script; dự phòng search xStock có tag `xstocks` khi tag stocks bị từ chối. Không đổi tiêu chí verified/liquidity. Search chưa phải toàn bộ danh sách stocks.
- Chạy script thật thành công: **20/20/20/20** token qua các bước; snapshot có AAPLx. Thêm test lỗi body HTTP 200, fallback đúng lỗi, không fallback 401 và filter snapshot live. TypeScript/lint code sửa, unit tests và export Web + Android pass. Vẫn cần kiểm thử UI Safari sau build/deploy lại.

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
- Commit message kết thúc bằng dòng `Co-Authored-By` theo quy ước; mỗi task một nhánh từ main → commit từng bước → push nhánh; agent **không tạo PR, không merge main** (chủ dự án tự làm).
