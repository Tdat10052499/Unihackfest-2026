# Tổng hợp tiến độ N.E.D (bắt đầu từ thời N.E.D Wallet, 26/09/2026)

> **Cập nhật 02/10/2026:** việc tiếp theo là Milestone Lock theo [`09-milestone-lock/`](09-milestone-lock/README.md) (program + màn hình hợp đồng). Các mục bên dưới vẫn là trạng thái đã xây và đã test đến 27/09.

> Tài liệu bàn giao cho phiên làm việc tiếp theo (người hoặc trợ lý AI). Đọc cùng: [`README.md`](README.md), [`04-ke-hoach-code.md`](archive/04-ke-hoach-code.md) (mục "Cập nhật sau Phase 0"), [`03-ky-thuat/dev-handoff.md`](archive/03-ky-thuat/dev-handoff.md) (mục 1a — identity on-chain), [`../ned-wallet/ARCHITECTURE.md`](../ned-wallet/ARCHITECTURE.md).

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
- Chi tiết: [`poc-dynamic.md`](archive/poc-dynamic.md).

### T0.5 — Dọn dẹp theo kiến trúc web3 (PR #6)
- Xoá: Shake to Split, Coin Toss Room, Geo-Red Packet, presence, thông báo Supabase Realtime, UI liên kết ví ngoài (Phantom…), Developer Mode, file nháp, `ned-mock-dapp/`, `Process.md` trùng, `reset-project.js`, `@supabase/supabase-js`.
- `services/profile.ts` thay Supabase (lưu cục bộ, tạm thời); gộp `src/` vào thư mục gốc; khung `services/auth|identity|jupiter`, `stores/useWalletModeStore`; viết `ARCHITECTURE.md`.
- Đã xoá thư mục rác trên máy: `ned-hub/`, `ned-mock-dapp/`, `.vercel/`, `.venv/`. Báo cáo: [`cleanup-report-t0-5.md`](archive/cleanup-report-t0-5.md).

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
4. **Gate D0 đã chốt (chủ dự án, 27/09)**: Tokens API dùng khoá Free public `EXPO_PUBLIC_JUPITER_API_KEY` (chấp nhận lộ/hết hạn mức); Swap `/order` keyless 0.5 RPS có hàng đợi; AI rule-based, không LLM/backend, Phase 5 stretch cắt đầu tiên; ô thứ 3 Simple = **EARN**. Xem [quyết định thiết kế](archive/02-thiet-ke-v1/trang-thai-thiet-ke.md#6-quyết-định-thiết-kế-đã-chốt); xác minh API qua MCP trước khi code.
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
- Báo cáo, các khác biệt có chủ ý với PDF và checklist test tay: [ui-pdf-alignment.md](archive/02-thiet-ke-v1/ui-pdf-alignment.md). Ưu tiên Safari: Home refresh/navigation; Swap `0,1`, keypad, slippage, Accept giá, slide; xStocks AAPLx bốn khung, mua $50, bán 50%, receipt, quay Home; Network không có `/execute`.

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
| A1 program v1.1 (`brief_hash`, evidence ≠ 0, `post_note`) | `feat/a1-program-v1-1` | `47ab23f` |
| A2 upgrade devnet v1.1 + IDL + core layout, smoke ×3 | `feat/a1-program-v1-1` | `b114ac9` + commit docs |
| B1 content layer (brief/delivery JSON, note mã hoá, key trong invite link) | `feat/b1-content-layer` | `f6156f3`, `b8544ca` + docs |
| B2 giao diện sáng Modern Minimal v2, bỏ viền, motion | `feat/b2-theme-motion` | `4a762c7`, `d0e8ead` + docs |
| B3 điều hướng, onboarding, Home hai chế độ xem, Settings, Disclosures | `feat/b3-nav-onboarding` | `285bcf9`, `83a0f43`, `ccc9ecd`, `42c0330`, `3c54d48` + docs |
| W2 Workspace: Overview, trang hợp đồng chỉ đọc, router invite `/c/:fund`, dán link hợp đồng | `feat/w2-workspace-overview` | `6f75edf`, `0d5a18e`, `5174980` + docs |
| B4a app: danh sách + chi tiết hợp đồng, accept, lock, release/refund now, close | `feat/b4a-contracts-detail` | `cc08c77`, `aa3e14a` + docs |
| B4b app: tạo hợp đồng 3 bước có brief, submit, review, route invite `/c/[fund]` | `feat/b4b-contracts-flow` | `7806542`, `9e9020d`, `f672557`, `530a05b` + docs |
| B5 Records + thông báo hợp đồng | `feat/b5-records` | `3c0d378`, `a5ff2b3`, `911a590`, `6e2e743` + docs |
| C1 đóng phần mobile (link mời đi qua router Workspace mặc định) | `feat/c1-hosting` | `1088e77` + docs |
| W3 Workspace `/new`: soạn brief, tạo hợp đồng, xác nhận trong wallet panel | `feat/w3-brief-editor` | `af18ff9`, `e0e55ae`, `b588f08` + docs |
| W4 Workspace: nộp bài (submit) và duyệt (review) | `feat/w4-submit-review` | `df00cf2`, `36a61ff`, `ef6492a` + docs |
| W5 Workspace: dọn dẹp, a11y, Reduce Motion, tách bundle, CSP chặn thật, README; **đã deploy production** | `chore/w5-workspace-polish` | `64a64d9`, `20dd075`, `2fdd484`, `1d027fb`, `9d8d7f0` + docs |
| C5 landing page tĩnh `site/` (Vercel project 1) | `feat/c5-landing` | `c75ed87` + docs |
| D1 chạy end-to-end (1 tài khoản Google + script) + sửa lỗi | `fix/d1-e2e`, `fix/d1-ux` | `6ef66ac`, `d4f27c6`, `0963632`, sửa UX + docs |
| D22 key sync Plan C (chương trình v1.2, core, hai app) | `feat/p1-program-v1-2`, `feat/p2-core-key-sync`, `feat/s0-key-check` | `08ea7fd`, `065aeef`, `6851698`, `53e6b7a` |
| S0 baseline 06/10 (`release/6oct`): tất cả test/typecheck/build đạt; lint `ned-wallet` đã lỗi từ trước (11 lỗi) | `release/6oct` | `da14040` + docs |
| S1 program v1.3 (Funded Jobs + note D27): `JobListing` 576 B, `JobApplication` 364 B, 6 lệnh `job`, `post_note` kind 1 thêm Disputed/Released, kind 3 review; `tests/jobs.rs` 10 test (54/54 đạt); program-spec mục 10; IDL đã copy. **Chưa deploy**: .so 661.424 B > tài khoản 528.464 B → cần `extend` ≥ 132.960 B (đề xuất 140.000 B ≈ 0,974 SOL) | `release/6oct` | `f02a0c5`, `2e77cf1` + docs |
| Smoke v1.3 (06/10): `npm run jobs:smoke` (`ned-wallet/scripts/jobs-smoke.ts`) — key dùng một lần trong `ned-wallet/.smoke-keys/` (gitignore); kiểm tra binary trên devnet = bản build local và IDL core = IDL build. `extend` +140.000 B (data 668.464 B); PO đã deploy v1.3, binary devnet = bản build local, IDL core = IDL build. **Chạy xanh trên devnet**: job 1 `6gD6…An2R` Filled, contract `BvTz…E9Y` Settled (0,1 USDC → DEMO_PAYOUT_PARTNER); job 2 `7srC…L7PUg` Withdrawn (trả 0,1 USDC). CU: post_job 25.482 · post_job_brief 3.931 · apply_job 12.855 · create_fund+select_job 36.594 · accept+lock_from_job 36.411 · withdraw_job 17.138 | `release/6oct` | `2050ae3`, `4f16578` + docs |
| S3 `@ned/core` jobs (06/10): `packages/ned-core/src/jobs/` — layout/pda/decode, queries (memcmp 9/42, 10, 9, 41, 508), brief công khai (bộ đầy đủ mới nhất thắng; ok/mismatch/missing), rules, actions (`runPostJob` từ chối chế độ xem Việt Nam, `runApplyJob`, `runWithdrawJob`, `runPostJobBrief`), taxonomy 8 nhóm + 40 kỹ năng (chỉ thêm cuối), search + URL. Test core 127/127 (27 mới); tsc `ned-wallet`, `ned-workspace` đạt. `runSelectJob` và nối `runAccept` để sang S4 | `release/6oct` | `2f98d0c` |
| S4 `@ned/core` (06/10): nối jobs (`runCreate` nhận lệnh trước/sau `create_fund`, `runSelectJob` đóng contract cũ trước, `runAccept` tự thêm `lock_from_job`, `runLockFromJob`, contract của job không bao giờ có nút Lock thường); D27 (`ReviewDraft`, `stage` của delivery — bỏ trống thì hash cũ không đổi, note kind 3, lịch sử từng milestone, `runRequestChanges`/`runPostReview`/`runSendRevision`/`runHandover`, nhãn + dòng trạng thái Disputed); U4 (cả hai bên có Release now, "Release opens in … if not reviewed"); C4; U3 phần 1 (notices vào core, đủ sự kiện bảng U3 + job, shim ở ned-wallet); F2 (cột `note` CSV, `RECORDS_CSV_FILENAME`), `readFundHistory`. Test core 147/147, ned-wallet 26/26, ned-workspace 10/10; tsc hai app đạt | `release/6oct` | `826fac1`, `816a579`, `8ef2c69` |
| S5 khung N.E.D Jobs (06/10): `FEATURES.jobs` (tắt bằng `VITE_FEATURE_JOBS=false` → /jobs/* về /), token hub `src/jobs/hub.module.css`, `JobsLayout` (navbar, menu hồ sơ: Open wallet mở ví extension, Go to Workspace; chưa đăng nhập → `/sign-in?next=`), footer, component dùng chung (`HubButton`, `Chip`, `SectionHeading`, `JobCard`, `CategoryTile`, `StepsBand`, `MoneyText`, `EmptyState`), route /jobs, /jobs/find, /jobs/new, /jobs/:job, /jobs/:job/applicants (trang tạm), mục Jobs ở sidebar Workspace. Phụ lục H (chưa có trong repo) được viết lại từ board WebJobs/WebJobsFind theo PO. Thêm Vitest + jsdom cho test `.tsx`: 7/7 đạt, node test 10/10, build đạt. Ảnh: `docs/02-thiet-ke/screenshots/s5-jobs-shell/` (chưa có @mia trên devnet → chụp bằng @teichi ở chế độ preview) | `release/6oct` | xem commit S5 |
| S5b trang Overview của Jobs (06/10): hero (ô tìm kiếm → `/jobs/find?…`, kỹ năng phổ biến, hình minh hoạ lấy số liệu thật: tổng ngân sách đang khoá, số job Open, số đơn ứng tuyển, cột theo từng job), dải 3 bước chồng lên hero 28 px, 8 ô nhóm có số đếm thật, 6 job mới nhất (thẻ đầu màu tối), mục "Funded before anyone applies"; skeleton khi đang tải, lỗi có Retry, hoạt động khi chưa đăng nhập. Phụ lục H thêm H.12–H.14 (và ghi chú lệch số thứ tự với prompt). Vitest 13/13, node 10/10, build đạt. Ảnh desktop + 390 px × 3 chế độ: `docs/02-thiet-ke/screenshots/s5b-jobs-overview/` (devnet hiện không có job Open nên trang ở trạng thái rỗng) | `release/6oct` | xem commit S5b |
| S5c trang Find jobs (06/10): dải tiêu đề + chip nhóm có số đếm thật, tab Open jobs / My applications / My listings (ẩn My listings ở chế độ Việt Nam; chưa đăng nhập → mời đăng nhập), thanh lọc đủ 7 ô + 2 ô tick + số kết quả + Clear + Copy link, lưới 9 thẻ có Show all, dòng trạng thái cho hai tab "My". Mọi bộ lọc, tab và sort nằm trên URL (mở lại URL ra đúng kết quả, đã kiểm tra trên Chromium). Phụ lục H.15. Vitest 25/25, node 10/10, build đạt. Ảnh 6 trường hợp × desktop/390 px: `docs/02-thiet-ke/screenshots/s5c-jobs-find/` (devnet chưa có job Open) | `release/6oct` | xem commit S5c |
| S6 trang job (06/10): `/jobs/:job` (brief kiểm tra theo fingerprint, mẫu milestone, ngân sách khoá, thành tích business, thẻ Apply: mở / đã apply / được chọn → Review & accept in wallet / đã thuê), `/jobs/new` (3 phần, thẻ xem trước, danh sách thiếu, thanh dưới, tiến độ lưu brief + thử lại), `/jobs/:job/applicants` (Withdraw kèm lý do, ứng viên + thành tích, sheet Select với hạn tuyệt đối, chờ / hết giờ / đã thuê). `JobsLayout` đăng ký khoá thiết bị (D22). Script `jobs:e2e` (vai business). Devnet: job B đăng rồi rút (`4zBk…aNHtB` Withdrawn); job A `Eosp…2BfF` đang Open chờ PO ứng tuyển → select → accept (chưa xong). Preview Vercel cần biến môi trường cho Preview và domain nhánh trong Allowed Origins của Dynamic (PO đã thêm). Phụ lục H.16–H.18. Vitest 32/32, node 10/10, core 147/147, build đạt. Ảnh: `docs/02-thiet-ke/screenshots/s6-job-pages/` | `release/6oct` | `80e4c25`, `2e8e68f`, `c4affd4` |
| S7 trang contract + review (06/10): dòng Delivery cho mỗi milestone đã nộp (U1, còn sau khi release/refund), Release now / Refund now cho cả hai bên (U4, qua sheet xác nhận của panel ví), contract của job ẩn Lock và có Move locked budget, banner D27 (yêu cầu sửa kèm điểm chưa đạt + lý do, bản sửa, file cuối) với Propose a split / Accept split / Return to client; Review hai cột What to check / What {name} delivered, thẻ link có Fixed version, file trong ô tuỳ chọn (U2), chuyển phiên bản, chỉ Accept & release + Request changes (sheet: ≥1 điểm, lý do ≤500 ký tự, đúng câu thông tin), dòng hạn review, khối Final files; chữ C4 + U4 (cả Overview). `FEATURES.dispute` (mặc định bật) chặn mọi phần D27. Trang dev `/dev/states` (chỉ khi `VITE_DEV_TOOLS=1`) cho ảnh chụp; sửa môi trường test jsdom (Uint8Array của Node). Vitest 43/43, node 10/10, build đạt. Ảnh 27 trạng thái: `docs/02-thiet-ke/screenshots/s7-contract-review/` | `release/6oct` | xem commit S7 |
| S8 trang Submit (06/10): chọn loại công việc (Design / Writing & translation / Code / Video / Other, tự chọn theo nhóm của job, chỉ trên máy); `lib/preview.ts` (kiểm tra file nguồn, kích thước >1600 px, đọc/ghi marker PNG `tEXt` / JPEG `COM` "NED-Preview: v1 <fund>", `addWatermark` 1200 px + chữ chéo 18% + nhãn "N.E.D preview"); Design: 3 kiểm tra đúng câu U6, nút Add watermark tải `<tên>-preview.png`, Submit chờ kiểm tra đạt hoặc ô override; kiểm tra link U6 cho mọi loại (không gọi mạng); sheet "Before you submit" (U5 + hướng dẫn Drive + bảng theo loại), 3 ô tick tuỳ chọn, "Files (optional)" (U2); chế độ D27 Send revised version và Hand over final files. Đã thử thật trong Chromium: file tạo ra 1200 × 840, có marker đúng contract. Node 16/16, Vitest 51/51, build đạt. Ảnh: `docs/02-thiet-ke/screenshots/s8-submit/` | `release/6oct` | xem commit S8 |
| S9 Workspace (06/10): chuông thông báo U3 ở TopBar và navbar Jobs (đọc chain 30 s + khi quay lại tab, "đã xem" chỉ lưu trên trình duyệt, Today/Earlier); P4 consent: đọc `@ned_consent_v1` của app ví (cùng origin), chưa có consent → banner + mở ví ở `/consent` một lần mỗi phiên, `confirm()` (mọi thao tác ký) và Select / Request changes bị chặn tới khi đồng ý; font tự host (`public/fonts`, 24 woff2 latin/latin-ext/vietnamese, OFL), bỏ Google khỏi `index.html` và CSP; P3 link Terms/Privacy/Disclosures ở trang sign-in, footer Jobs và footer mới của Workspace (trang từ bản ví ở S11); F5 gợi ý dưới tiêu đề ở `/new`; F4 CSP `/wallet` enforce, bỏ mainnet Helius, api.jup.ag, api.geckoterminal.com; sửa câu U4 trên sign-in. Kiểm tra bản build dưới header thật của vercel.json: 0 request Google, 0 vi phạm CSP, app ví chạy. Node 19/19, Vitest 57/57, build đạt | `release/6oct` | xem commit S9 |
| S10 Mobile (06/10): V1 một guard trong `_layout.tsx` (`services/regionGuard.ts`): chế độ xem Việt Nam (và ví chưa chọn nơi ở) gõ `/send`, `/receive`, `/history`, `/scan-qr` (thêm `/swap`, `/xstocks` đang ẩn) → về `/home`, chạy được cả GitHub Pages lẫn `/wallet` (bỏ base URL); bỏ fallback "N.E.D fee 0.25%" trong history; A4 màn fund chạy âm thầm "Preparing your account…" (tự xin faucet, có thử lại + cách làm tay không có số tiền), màn profile và `FeesCard` không hiện số SOL ở chế độ Việt Nam, giữ câu "Network fees use test SOL"; V2 consent trước fund trong `resolveOnboarding`; C1 đúng câu mới trên accept (+ disclosures bỏ "licensed"); C3 ẩn ô số điện thoại. Test 29/29, tsc + eslint sạch, web build đạt. Còn cần PO thử khi đăng nhập: gõ URL ở chế độ Việt Nam trên cả hai host, ví mới thấy consent trước fund | `release/6oct` | xem commit S10 |
| S11 Mobile (06/10): P1 đăng xuất giữ `@ned_consent_v1` (`services/signOutKeys.ts`, `executeHardReset` chỉ xoá region và khoá khác); P2 `CONSENT_VERSION` 2 ở cả ví lẫn Workspace, scope 9 mục, 4 dòng mới (Username, Phone number hash, Device key, Blockchain data · Helius) và đúng câu checkbox mới; P3 màn `/terms` và `/privacy` (phụ lục 1–2, câu funded-jobs mục 9 thay "marketplace", thêm "or refund it…", Privacy có Ably qua Dynamic và log Vercel / GitHub Pages), mở được khi chưa đăng nhập, link từ consent, Settings và footer Workspace (`/wallet/terms`, `/wallet/privacy`); C2 disclosure theo `FEATURES.dispute` (đang tắt → "No disputes in this demo"); Settings › Help → `/help` (hướng dẫn U5 + U6 Drive, cùng câu với Workspace). Copy nằm ở `services/legalCopy.ts`. Test ví 35/35, Workspace 19 + 57, tsc sạch, web build đạt; eslint còn lỗi cũ ở `Mascot.tsx`, `dev/home-preview.tsx` (không đụng). Còn: email liên hệ thật cho Privacy; PO thử đồng ý → đăng xuất → đăng nhập lại vẫn giữ acceptedAt | `release/6oct` | xem commit S11 |
| H1 Hub v4 nền tảng (07/10, `feat/hub-v4` từ `main`): token V1–V2 trong `src/jobs/hub.module.css` (bảng màu v4, chữ Inter 300 cho tiêu đề, Space Mono 700 cho số tiền, bo góc, bóng, khung 1240 px; tên biến v3 còn lại trỏ sang giá trị v4 cho tới H2–H5); tự host thêm Inter 300 và 700 (P4, không gọi Google); `src/jobs/motion.css` (hiệu ứng cuộn trong `@supports (animation-timeline: view())`, hiệu ứng vào/pop/sheet/float/fill/hover, tắt hết khi giảm chuyển động; Safari/Firefox vẫn thấy đủ nội dung); `src/jobs/motion.ts` (useCountUp, useAutoAdvance, useScrollSpy) + nhịp `HUB_MS` trong `src/motion.ts`; header V4 trắng dính, thu nhỏ khi cuộn, chỉ Overview · Find jobs (không có Legal), nút "Post a job" tím cho client, "Sign in" đen khi chưa đăng nhập, menu hồ sơ giữ hành vi cũ; footer V9 nền #0E0E12 + dải CTA (chỉ Overview); link pháp lý vẫn là `/wallet/…` tới H4; component: HubButton dạng pill (purple/dark/white/ghost), Chip có loại xoá được, JobCard v4 + JobRow, SectionHeading hai tông, Reveal, Popover, Sheet, Switch, Segmented, StatCounter; trang dev `/dev/hub` (VITE_DEV_TOOLS=1) để chụp khi chưa đăng nhập Google. Test Vitest 70/70 (mới: Popover, Sheet, useCountUp giảm chuyển động, useAutoAdvance, JobCard/JobRow ≈ VND, header, footer), node 19/19, tsc sạch, build đạt; Workspace chưa có eslint. Ảnh: `docs/02-thiet-ke/screenshots/h1-hub-v4/`. Còn: Overview/Find/Detail/Post/Applicants vẫn bố cục v3 (H2–H5); khách chưa đăng nhập đang thấy ≈ VND trên Overview (hành vi cũ, xem lại ở H2) | `feat/hub-v4` | xem commit H1 |
| H2 Overview v4 `/jobs` (07/10, `feat/hub-v4`): dựng lại `pages/Overview.tsx` theo V5 — thẻ hero hoàng hôn (SVG trời + 3 lớp đồi parallax `.px-*`, gradient chữ, tiêu đề Inter 300 và câu phụ theo khách / chế độ Việt Nam / client, ô tìm kiếm kính → `/jobs/find?q=`, hai link chữ, thẻ kính nổi tin mới nhất, "notch" 3 StatCounter với 2 góc lõm; dưới 860 px notch xếp dưới thẻ, ẩn thẻ kính); "Funded first…" + 8 vòng tròn danh mục → `/jobs/find?cat=`; lưới 6 quy tắc; khu Featured 4 thẻ đánh số, hover/focus đổi bản xem trước (kế hoạch mốc "Due N days after selection", Apply); "See how a job runs" 5 tab tự chuyển 6 s, dừng khi hover/focus, bấm thì chạy lại, thanh `.hb-fill`; footer có dải CTA. Dữ liệu như cũ (tin đang mở, tổng khoá, số đơn, theo danh mục, 4 tin mới nhất); skeleton khi tải, dòng lỗi + Retry, chạy khi chưa đăng nhập. Xoá StepsBand, CategoryTile, số liệu `bars`. Chế độ Việt Nam không có chữ USDC: mock các bước hiện ≈ VND, quy tắc VND ghi "never hold crypto". Thêm `/dev/hub?page=overview` với dữ liệu mẫu theo board. Header thêm blur nền khi cuộn (board không có) cho dễ đọc. Test Vitest 74/74, node 19/19, tsc sạch, build đạt. Ảnh + GIF cuộn: `docs/02-thiet-ke/screenshots/h2-overview-v4/`. Còn: khách chưa đăng nhập vẫn thấy ≈ VND (quy tắc mặc định Việt Nam; board cho khách xem USDC) — PO quyết; tên mốc dùng "Milestone N" vì tên thật nằm trong brief ngoài chuỗi | `feat/hub-v4` | xem commit H2 |
| H3 Find jobs v4 `/jobs/find` (07/10, `feat/hub-v4`): thay thanh lọc và lưới v3 bằng mô hình tìm kiếm V6 — tiêu đề hai tông "Find jobs, already funded" + "N open jobs · X locked on Solana"; tab gạch chân Open jobs · My applications · My listings có badge đếm (quy tắc hiện như cũ: My cần đăng nhập, không có My listings ở chế độ Việt Nam); thanh tìm kiếm phân đoạn dính top 78 px (What · Field popover 2 cột có số đếm sống · Budget popover radio, khoảng ≈ VND ở chế độ Việt Nam · nút tím), một popover một lúc; toolbar: Filters có badge, chip xoá được + Clear all, số kết quả, Sort, Grid/List, Share ("Copied" xanh); Sheet Filters (Skills, Time to deliver, Milestones, 2 Switch, Clear these, Show N jobs); lưới JobCard / danh sách JobRow, 9 tin một lần; trạng thái "No open jobs match, yet" + Clear all filters; hàng My applications / My listings V6.6. `@ned/core` search: thêm `budget` (lt20 / 20to50 / gt50 theo board), `view`, `tab` vào filtersToQuery / filtersFromQuery (thứ tự q, cat, budget, skills, …, sort, view, tab; link cũ min/max vẫn đọc được) + test. Thẻ ở chế độ Việt Nam hiện "≈ 520,000 VND" và chuyển chữ Estimate xuống dòng dưới (aria-label vẫn đủ). Trang dev `/dev/hub?page=find`. Test Vitest 78/78, node 19/19, ned-core 148/148, tsc sạch, build đạt. Ảnh: `docs/02-thiet-ke/screenshots/h3-find-v4/` (desktop + 390 px, cả hai chế độ, từng popover, sheet, chip, list, từng tab, no match, guest). Còn: dưới 860 px thanh tìm kiếm không dính (header cao hơn), H5 xem lại | `feat/hub-v4` | xem commit H3 |
| H4 Legal `/jobs/legal` (07/10, `feat/hub-v4`): một nguồn chữ pháp lý — chuyển nguyên văn `ned-wallet/services/legalCopy.ts` sang `packages/ned-core/src/legal/copy.ts` (export từ `@ned/core`), file cũ của ví thành re-export nên màn `/terms`, `/privacy`, `/help` và test không đổi; thêm tài liệu Disclosures (12 dòng của màn ví + `disputeDisclosure`, màn `/disclosures` của ví nay đọc cùng danh sách, giữ icon) và "Job posting rules" (lấy từ board, mới, cần CL duyệt). Trang `/jobs/legal` trong JobsLayout theo V8: thanh đọc 3 px, tiêu đề hai tông, intro, ghi chú bản nháp, 4 thẻ tài liệu, mục lục "On this page" dính + scroll spy 170 px (cuối trang chọn mục cuối, trừ khi đang mở bằng link mục), bài viết đánh số, thẻ "Next: … Read it"; `?doc=terms|privacy|disclosures|rules` và `#lg-<doc>-<n>` mở đúng khi tải; route khai báo trước `/jobs/:job`. Legal không có trên navbar; link footer hub (Legal, Terms of use, Privacy, Disclosures) trỏ về `/jobs/legal?doc=…`; `LEGAL_LINKS` của Workspace vẫn là `/wallet/…`. Test: Vitest 82/82, node 19/19, ned-core 151/151, ví 36/36, tsc ví + Workspace sạch, build Workspace + export web ví đạt; lint ví chỉ còn lỗi cũ. Ảnh: `docs/02-thiet-ke/screenshots/h4-legal/`. Chờ quyết: câu Terms "It is not a payment service, a bank or an exchange" (CL; board đề xuất "not a bank, an exchange or a money-transfer service"); email liên hệ thật thay "[team email]" | `feat/hub-v4` | xem commit H4 |
| H5 Restyle + QA (07/10, `feat/hub-v4`): `/jobs/:job`, `/jobs/new`, `/jobs/:job/applicants` theo V10 — nền #F5F5F7, thẻ trắng bo 24 + bóng S1, tiêu đề mục Inter 18/700 (tiêu đề trang giữ Space Grotesk như board), nút back tối, pill v4, `.rv` trên thẻ, cột phải dính dưới header (top 96 px); hành vi, giao dịch và chữ S6 giữ nguyên. QA tự động trong Chromium trên 9 trang/chế độ: Tab tới mọi điều khiển, viền focus 2 px #7B2FBE offset 3 ở mọi điểm dừng; Escape đóng menu hồ sơ, popover, sheet Filters, sheet chọn ứng viên; 390 px không cuộn ngang, notch xếp dưới, sheet rộng 390 px, ô tìm kiếm dùng được; giảm chuyển động: 0 animation, bộ đếm hiện số cuối, tab không tự chuyển; giả lập không có scroll timeline: không phần nào bị ẩn; rà chữ: chỉ còn câu Terms đã nêu ở H4. Sửa: màu chú thích `--hub-subtle` #8A8A96 → #6E6E7A (3.4 → ≥ 4.5:1 trên trắng và #F5F5F7), số mục lục Legal và chữ "yet" 22 px không dùng #9A9AA6 nữa; tiền của từng mốc ở trang chi tiết xuống dòng trên điện thoại (trước bị đè lên tên mốc). Test Vitest 82/82, node 19/19, ned-core 151/151, ví 36/36, tsc sạch, build đạt. Kết quả QA: `docs/09-milestone-lock/hub-v4-qa.md`; ảnh: `docs/02-thiet-ke/screenshots/h5-qa/`. Còn: không có Firefox/Safari để thử thật; thanh tìm kiếm Find không dính dưới 860 px; câu Terms "payment" và "[team email]" chờ PO/CL | `main` | H4 + H5 đưa lên main (quyết định PO 7/10: push thẳng main) |
| R1 Review & preview — core (07/10, `main`, chỉ `packages/ned-core`): `validateDelivery` — lần nộp đầu và bản sửa (không có stage hoặc `revision`) bắt buộc ít nhất 1 link xem trước ("Add a preview link the client can open (Google Drive, Figma, YouTube, Loom or an image link)."), `handover` vẫn "a link or a file"; JSON chuẩn, `deliveryEvidence` và giải mã không đổi (test ghim JSON cũ + SHA-256 độc lập: bản nộp chỉ có file vẫn giải mã và khớp fingerprint). `validateReview` — có điểm done-when: như cũ; 0 điểm: `unmet` phải rỗng, lý do 10–500 ký tự ("Say what is missing and what would make it acceptable."); `reviewNote` trong `actions.ts` dùng luật 0 điểm khi không chọn điểm nào. `validateBrief` / `validateJobDraft`: mỗi mốc cần ≥ 1 điểm done-when ("Add at least one done-when point, so the work can be checked."), brief cũ rỗng vẫn giải mã. Module mới `milestone/embed.ts` (`previewEmbed`, `PREVIEW_FRAME_HOSTS`, export từ `@ned/core`): Drive, Docs/Slides/Sheets, Figma, YouTube (nocookie), Loom → frame; ảnh https .png/.jpg/.jpeg/.webp/.gif → image; http, sai định dạng, host giả (drive.google.com.evil.com, user@host, port lạ) → link. Test ned-core 160/160 (8 test R1 mới), Workspace tsc + Vitest 83/83 + node 19/19, ví tsc + 38/38. Cho R2: `ned-workspace/src/pages/Submit.tsx` (nộp chỉ file giờ bị chặn ở lần đầu/bản sửa), `src/lib/newContract.ts` và `ned-wallet/app/contracts/new.tsx` (form hợp đồng mới cần ≥ 1 điểm done-when mỗi mốc), `jobs/pages/PostJob.tsx` (thông báo mới qua validateJobDraft), trang Review (gửi số điểm thật; 0 điểm → ô lý do bắt buộc); ví `submit.tsx` vốn chỉ gửi link. Thiếu file `docs/09-milestone-lock/prompts-review-preview.md` (không có trên main hay nhánh nào) — làm theo nội dung prompt | `main` | xem commit R1 |
| R2 Review & preview — Workspace (07/10, `main`): component mới `PreviewFrame` (dùng `previewEmbed`): khung 16:10 bo 16 có tên nhà cung cấp + host + nút "Load preview"; chỉ sau khi bấm mới tạo `<iframe>` (sandbox `allow-scripts allow-same-origin allow-popups allow-presentation`, `referrerPolicy=no-referrer`, `loading=lazy`) hoặc `<img>`; luôn có "Open in a new tab ↗", chip Fixed version, dòng gợi ý "Blank? …"; link không nhúng được → thẻ link + "This site can't be shown here…"; nhớ lần bấm trong phiên trang (state, không lưu). Trang Review: 2 cột từ 1024 px (trái ~2/3: "What {name} delivered" + on time, đổi phiên bản, tab theo link, PreviewFrame, ghi chú, "Files listed (fingerprints only)" thu gọn, không có ô thả file; phải ~1/3 dính: chip thời hạn release, What to check — brief 0 điểm hiện câu "Judge the preview against the brief", dòng Integrity, thẻ quyết định); FinalFiles giữ nguyên. RequestSheet 0 điểm: ẩn checklist, lý do bắt buộc 10–500 ký tự có bộ đếm, nút bật theo `validateReview`; lỗi ví hiện trong sheet. Submit: ô "Preview link · required" + hướng dẫn, PreviewFrame của link đầu ("This is what {client} will see"), Files (optional) · fingerprints only; kiểm tra theo stage — sửa lỗi bàn giao chỉ file bị chặn sau R1. New contract và Post a job hiện luật "at least one done-when point" ngay trên mỗi mốc. Test Vitest 91/91 (mới: không request trước Load preview, không ô thả file, sheet 0 điểm 9 ký tự tắt / 10 gửi, lỗi ví trong sheet, Submit không gửi được khi thiếu link, revision cần link, handover chỉ file vẫn gửi), node 19/19, ned-core, ví tsc + test, build đạt. Ảnh: `docs/02-thiet-ke/screenshots/r2-review-preview/`. Lưu ý: dưới 900 px Workspace hiện PhoneGate (D16) nên ảnh hẹp chụp ở 960 px (1 cột) + 1 ảnh PhoneGate 390 px; CSP production chưa cho frame-src các host xem trước → làm ở R3 (trước đó "Load preview" trên production bị chặn) | `main` | xem commit R2 |
| R3 Review & preview — CSP, Privacy, docs (07/10, `main`): `ned-workspace/vercel.json` cả 2 khối CSP (Workspace và `/wallet`): `frame-src` thêm đúng 5 origin `PREVIEW_FRAME_HOSTS` (drive.google.com, docs.google.com, www.figma.com, www.youtube-nocookie.com, www.loom.com), `img-src` thêm `https:` (ảnh chỉ tải sau khi bấm); test `src/lib/__tests__/csp.test.ts` giữ CSP khớp core. Kiểm CSP lại như S9: build `build:all` + server giả lập header/rewrite của vercel.json, Chromium: `/`, `/jobs`, `/jobs/legal`, `/sign-in`, `/wallet/` và Load preview cho Drive, Figma, YouTube, Loom, ảnh trực tiếp → frame/ảnh tải được, 0 vi phạm frame-src/img-src; chỉ còn 1 sự kiện `script-src eval` có từ trước (zod thử `Function('')` trong try/catch, bị chặn đúng ý, vô hại). Privacy (core `legal/copy.ts`, mục "Where data goes") thêm câu Load preview; chưa đổi `CONSENT_VERSION`. Docs: `review-decision-plan.md` mục "Amendment 7 Oct" (5 quyết định, viết lại từ prompt R1–R3 vì thiếu `prompts-review-preview.md`), U6 trong `delivery-review-updates.md`, dòng D27 README, `system-tracker.md` mục 8 + F-2, `final-pitch.md` slide 3 bước 1:45 (Load preview trước Accept & release). E2E 2 tài khoản Google: cần PO làm theo `docs/09-milestone-lock/review-preview-e2e.md`. Test ned-core 162/162, Workspace node + Vitest 91/91, ví 38/38, build đạt. Ảnh kiểm CSP: `docs/02-thiet-ke/screenshots/r3-csp/` | `main` | xem commit R3 |
| F1 Final files — core (07/10, `main`, `packages/ned-core`): `DeliveryDraft.finals` (promised list: tên, cỡ, SHA-256 của file cuối) — JSON chuẩn chỉ có `finals` khi không rỗng, nên mọi bản nộp cũ giữ nguyên JSON và fingerprint on-chain (test ghim JSON + SHA-256 độc lập); `parseDelivery` nhận cả hai. `validateDelivery`: lần đầu/bản sửa cần promised list (1–10, không trùng, tên ≤ 120 ký tự) trừ khi có link phiên bản cố định (Figma version / Git commit), file preview không được trùng file cuối; handover cần link tải ("Add the link where {client} can download the final files."), nếu khác promised list của bản được chấp nhận (tham số thứ 2) thì ghi chú ≥ 10 ký tự; toàn bộ delivery phải vừa 1 note (`DELIVERY_MAX_BYTES` = `NOTE_MAX_PLAINTEXT`, test 10 file tên 120 ký tự). Module mới `milestone/handover.ts`: `acceptedVersion`, `handoverStatus` (not-due / waiting / late sau 48 h `HANDOVER_SOFT_SECS` / handed-over / not-applicable cho Refunded, Cancelled; không có giờ release thì không đếm), `releaseOf`, `buildReceipt` (dòng "Built on the client's device. Not legal advice."), `closeWarnings`; `compareHandover` / `checkDownload` (same, missing, extra, different theo SHA-256) trong `content.ts`; `ReleaseRecord.by` = approve / releaseNow từ giao dịch. `canClose` không đổi. Test core 171/171 (9 test F1 mới + 2 test R1 cập nhật theo luật mới), Workspace tsc + 91/91 (2 test Submit cập nhật theo luật mới), ví tsc + 38/38. Cho F2: Workspace `pages/Submit.tsx` (ô promised list; truyền finals của bản được chấp nhận + tên client cho handover), `pages/Review.tsx` (`FinalFiles` đang so với bản nộp đầu → dùng `acceptedVersion` + `checkDownload`, receipt, trạng thái chờ), trang Contract (banner sau release, cảnh báo Close); ví `app/contracts/[fund]/submit.tsx` + `hooks/useMilestoneActions.ts` (`runSubmit` chỉ gửi link → bị chặn trừ link phiên bản cố định), `app/contracts/[fund]/close.tsx` (`closeWarnings`). ⚠️ PO chọn push ngay: tới khi F2 lên, production chỉ nộp được bằng link Figma version / Git commit, bàn giao cần link tải | `main` | xem commit F1 |
| F2 Final files — Workspace (07/10, `main`): Submit (lần đầu, bản sửa) có mục bắt buộc "Final files you will hand over after release" (chọn file, băm trên máy, không upload; tuỳ chọn khi có link phiên bản cố định), "Files (optional)" → "Preview files · fingerprints only", sheet xác nhận có số file hứa giao; trang bàn giao: link tải bắt buộc + hướng dẫn 30 ngày, so khớp trực tiếp với promised list của bản được chấp nhận, lý do bắt buộc khi khác, chỉ mở khi milestone Released. Review: thẻ "What you will receive after release" + câu "After release, N.E.D cannot make {name} hand over the files…". Component mới `FinalFilesCard` (thay FinalFiles cũ so với bản nộp đầu — G2): đang chờ (từ giờ release; Late sau 48 h, chỉ nhắc), đã bàn giao (Download — 1 file Drive dùng `uc?export=download&id=`, ghi chú/lý do, chip Same as promised / Missing / Extra, "Check your download" file hoặc thư mục với chip checkDownload, "Save receipt" `ned-receipt-<8 ký tự>-m<n>.json`, dòng nhắc tự giữ bản sao), refunded/split. Trang Contract: mục Files (mỗi milestone 1 dòng, trạng thái handoverStatus, Version, thẻ Final files), banner client "Get final files" / "View status", cảnh báo Close ("Keep open" / "Close anyway") trước khi mở ví. Chuông: freelancer "Released · hand over the final files" (core notices), nhắc 24 h và 48 h nếu chưa bàn giao, client "Final files received · milestone {n}" (đọc giờ release và note bàn giao, không giải mã). Core: so khớp bỏ qua khi bản được chấp nhận không hứa file. Ví: review hiện promised list chỉ đọc. Test Workspace node 22 + Vitest 106/106 (15 test F2 mới), core 171/171, ví 38/38, build đạt. Ảnh (1440 và 960 px; dưới 900 px là PhoneGate): `docs/02-thiet-ke/screenshots/f2-final-files/`. Còn cho S13 (mobile): màn submit của ví chưa có ô promised list (chỉ nộp được bằng link phiên bản cố định), chưa có màn bàn giao, review chỉ thấy bản nộp đầu, close.tsx chưa có cảnh báo closeWarnings | `main` | xem commit F2 |
| F3 Final files — docs, copy, e2e (07/10, `main`): `review-decision-plan.md` mục "Amendment 7 Oct (final files)" (bảng Rules của `prompts-final-files.md` + những gì đã build); README dòng D27 thêm câu amended 7 Oct; `system-tracker.md` 3.2 (dòng handover), F-5 (promised list, nhắc 48 h, receipt), 7 ("Handover missing" không tính khi client Close trước; app chưa hiện dòng "closed by the client before handover"), 9 (thông báo mới), 12 (B-22 F1–F3); `final-pitch.md` Q&A P7 (tiếng Việt) + slide 3 bước 1:30 chọn 2 file cuối (bắt buộc từ F1) + bước tuỳ chọn xem thẻ Final files "Waiting". Copy (2 câu, **chờ CL duyệt trước khi push**): GUIDE "List your final files when you submit. Hand them over after release, with a link that allows download." (core + sheet trên Workspace), Terms "After release, N.E.D cannot make the freelancer hand over files. The promised list and fingerprints show what was agreed." (thêm sau câu Terms CL đã sửa). E2E 2 tài khoản Google: PO làm theo `review-preview-e2e.md` phần B (B1–B6) — cập nhật cả phần A cho luật F1; ảnh dựng bằng dữ liệu mẫu đã có ở `docs/02-thiet-ke/screenshots/f2-final-files/`, ảnh e2e thật lưu vào `f3-e2e/` | `main` | docs đã push; copy chờ CL |
| V0 pre-flight (07/10, `main`, không đổi code): công cụ — rustc 1.89.0 (khớp `rust-toolchain.toml`), cargo build-sbf / solana-cli 3.1.10 (platform-tools v1.52), anchor-cli 1.1.2 (khớp anchor-lang 1.1.2), node v24.10.0, pnpm 11.24.0. Baseline trên `main`: `anchor build` đạt, program 54/54 test (1 + 4 + 10 + 10 + 29), ned-core 171/171, ví 38/38, Workspace node 22/22 + Vitest 106/106. Backup v1.3: `ned_program/target/rollback/ned_program-v1.3.so` (661,424 byte, SHA-256 `6af5898d476d2becfbe6b0d46b7cadd28e365d877ee4108d1d0047be548b071e`) và `ned_program-v1.3.json` (IDL, SHA-256 `967fe395…65ed`, giống hệt IDL trong `packages/ned-core`). **Khớp devnet:** `solana program dump` 8azx4Hdo… = 668,464 byte; 661,424 byte đầu có cùng SHA-256 với file backup, phần còn lại toàn số 0 (vùng đệm sau `extend`). Lưu ý: so bằng cách cắt hết số 0 ở cuối sẽ sai vì chính file .so kết thúc bằng 15 byte 0. `target/` đã gitignore (`ned_program/.gitignore`), backup không vào git | `main` | V0 xong, chờ PO đọc trước V1 |
| V1 program v1.4 built and tested (07/10, `main`): `git am --3way` bản nháp `ned-v14-program-draft.patch` áp sạch (commit `d7411e4`), `anchor build` đạt ngay, không lỗi, không cảnh báo, không cần commit sửa. `cargo test`: **61/61** (54 test v1.3 giữ nguyên + 7 test `v14_*`): lib 1, helpers 4, identity 10, jobs 17 (10 + 7), milestone 29. Đọc code: `unfunded == 0` giữ đúng đường v1.3 (post_job vẫn `transfer_checked` total rồi emit `JobPosted`; select_job chỉ thêm `require!(unfunded == 0)`; withdraw trả `job.total`); `lock_from_job` thêm G1 (`fund.freelancer == job.selected`, `fund.brief_hash == job.brief_hash`, lỗi `JobFundMismatch` có sẵn) cho mọi listing, đúng spec mục 11; lỗi `JobNotFunded`, `JobAlreadyFunded` và event `JobPostedOpen`, `JobFunded` thêm ở cuối (không đánh số lại); `JobListing::SPACE == 576` vẫn còn const assert (`unfunded: u8` lấy từ `_reserved`, nay `[u8; 31]`); `fund_job` dùng `transfer_checked` với `job.total` đã lưu, không đọc số dư vault. **Kích thước:** `ned_program.so` v1.4 = **683,040 byte** (SHA-256 `4f5a8ceb9edda53614fd0bf5112f4c1866716f32e6b35829216b3a9a213c3aa5`) so với program data devnet 668,464 byte → V3 cần `solana program extend` ít nhất **14,576 byte** trước khi upgrade (chưa làm, tốn SOL) | `main` | V1 xong, chờ PO đọc trước V2 |
| V2 tự review v1.4 (07/10, `main`): đối chiếu diff từ `1b85d94` với `program-spec.md` §11 từng dòng. Code đúng spec. Đã sửa tài liệu ở 3 chỗ: (1) trạng thái §11 "chưa build" → đã build và test; (2) `lock-at-hire-plan.md` P5 ghi "đóng listing": sai, listing ở lại trạng thái `Withdrawn` như v1.3, chỉ job vault bị đóng; (3) P2 chốt event `JobPostedOpen`, P3 thêm điều kiện `select_by`. Kiểm tra đủ 5 điểm; thêm **5 test** cho các trường hợp chưa có (cộng 1 test đo CU = 6 test mới): `fund_job` bị từ chối trên listing Filled/Withdrawn (vault đã đóng nên Anchor từ chối account; Selected đã có test); withdraw listing chưa khoá trả lại tiền donate và đóng vault; `select_job` báo `SelectClosed`/`JobNotOpen` trước `JobNotFunded`; G1 cùng freelancer nhưng khác brief → `JobFundMismatch`; kích thước giao dịch (R-2). Thêm test đo CU theo từng instruction (`cu_each`). Re-select không khoá lần hai (đã có test). G1 khác freelancer (các trường khác khớp) đã có test. **CU** (LiteSVM, v1.4, 07/10): bảng ở mục Program P0. Instruction trên 40.000 ở một số lần chạy: `post_job` tối đa 49.173, `lock_from_job` 45.045, `accept_cancel` 43.015 (bump PDA ngẫu nhiên; v1.3 cũng vậy; v1.4 chỉ thêm ≤ ~80 CU) → đề nghị CL đổi "dưới 20%" thành "dưới 25%". **Đếm từ source:** 29 instruction / 55 lỗi / 26 event (khớp IDL build). Test: **67/67** (lib 1, helpers 4, identity 10, jobs 23, milestone 29). **Kích thước giao dịch** `fund_job + create_fund + select_job` (title 32 byte, 5 milestone): 737 byte, thêm 2 lệnh compute-budget là 789 byte ≤ 1.232 → giữ một giao dịch, không cần ALT. **Clippy:** code program sạch; 2 cảnh báo cũ `map_or` ở helper `closed()` của test v1.3, không sửa. Code program không đổi; `.so` vẫn 683.040 byte | `main` | V2 xong, chờ PO đọc trước V3 |
| V3 devnet v1.4 (07/10, `main`, PO "go"): **Trước:** `solana program show 8azx4Hdo…X5Wh` — authority `FSyUz7Kfy58vDosLPMqtVYzbcsCfCyrPiDWc65kY6QuQ`, data 668.464 B, slot 508.047.055; ví deploy 6,0535 SOL. **Extend** +20.000 B (cần tối thiểu 14.576 B, chừa chỗ hotfix): tx `2eYyziZt4QjmemNPNv9t5L3QW5k6bG77kSoNXGudRsFn7e8RmSQeCfFqW8ZZkNcdtdTa4hJfvzrwR1SSW84jWBBK`, tốn 0,1016 SOL. **Upgrade** (PO chạy trong terminal WSL vì chế độ auto chặn lệnh deploy): tx `4u1Gcc2vfDbQB4PiKgj2bfNrKCfTCaWb2kvz92VwjB7E5y2vSrtvpcVrHz1tKdv2mGwBF8xVe95s9J9XQnjSEdwg` (13:19:03 UTC, Status Ok, "Upgraded program"). **Sau:** data 688.464 B, slot 508.467.399, authority không đổi, số dư program data 3,4983 SOL; ví còn 5,9485 SOL; không còn buffer. **Binary:** `solana program dump` 688.464 B, 683.040 byte đầu có SHA-256 `4f5a8ceb9edda53614fd0bf5112f4c1866716f32e6b35829216b3a9a213c3aa5` = bản build local V1, phần còn lại toàn số 0. **Listing cũ:** cả 4 JobListing v1.3 trên devnet (`6gD6…An2R` Smoke test job, `7srC…L7PUg` Smoke test withdraw, `4zBk…aNHtB`, `Eosp…2BfF` E2E job) đọc `unfunded` @544 = 0, `_reserved` 545..576 = 0 → vẫn là listing đã khoá. Rollback V8: `target/rollback/ned_program-v1.3.so` (V0). IDL on-chain và core chưa cập nhật (V4) | `main` | V3 xong, chờ PO trước V4 |
| V4 smoke v1.4 (07/10, `main`): **IDL:** chép `target/idl/ned_program.json` + phần type của `target/types/ned_program.ts` vào `packages/ned-core/src/idl/` (đúng từng byte so với build; 29/55/26); `ned-wallet/idl/ned_program.ts` là shim re-export core nên tự khớp. Test sau khi đổi IDL: core 171/171, ví 38/38 + tsc 0 lỗi, Workspace node 22/22 + Vitest 106/106 + tsc 0 lỗi. Upload on-chain bằng `program-metadata@0.5.1`: `create-buffer` qua RPC public lỗi giữa chừng (buffer `A4AZ…46tz` thiếu dữ liệu) → `update-buffer` qua Helius thành công → `fetch-buffer` = build → `update idl --export` + `simulateTransaction` (err null) → `update idl --buffer … --close-buffer`: tx `2AsdDUbnd74AxzjUDnVL4usVQBbspZ3DB2v3dwBaRZ3HrkNcdKAgEbocCgE9XDDEB2tvtiTyAcAmSauoFwMnuCC7`; `fetch idl` = `target/idl` từng byte; buffer đã đóng. Ví deploy 5,9485 → 5,9279 SOL. **`jobs-smoke.ts`:** giữ Run 1–2, thêm Run 3 (lock at hire) và Run 4 (open → withdraw); kiểm tra binary chuyển sang marker `FundJob` (v1.4); `BUSINESS_MIN_SOL` 0,05 → 0,08. `--check` PASS (binary = build, IDL core = build). **Run 1–4 xanh** trên devnet. Run 1: [post_job 24.030](https://explorer.solana.com/tx/5FL2TgAQNLTiajZymVttEN4AwVbHAGJcDWsgBKwRTivxkWXZe9QticQidDgojeS3efmqr6bKC7NDaqny4U6Hy61r?cluster=devnet) · [post_job_brief 3.937](https://explorer.solana.com/tx/5BUPGiJoVogyPCCdNMJYD4U71nwtReRXMhWBiRKCwbYURRCn6NPNF2p7hU8aRDDffjUVV4yGu94DyYd95u6YEcJq?cluster=devnet) · [apply_job 12.904](https://explorer.solana.com/tx/2yyjYayMivXezrRNshQXwaYoh4Tn4KwKBf2smhnt98bCkghwmTC1DaLGcqoNhnB5zVg3ppWN6Cme8JFSWGqv7jRt?cluster=devnet) · [create_fund + select_job 32.148](https://explorer.solana.com/tx/pvurG4bRLtBZeSWzgm4X2S6Y9BLbC7Lv5CFtAUab6XyBik6AQpwLb9BSNKKHzQSk7gCKA7hzWnpgxqmsPUoMfZD?cluster=devnet) · [accept + lock_from_job 36.505](https://explorer.solana.com/tx/4fjZkC2BkWtPeQ8CSQVkotbfWXMn4Q3sNRcqX8Gn5gMLUNF6vrGMbEzDixDVBEUq5E6w6DvnQPbGytYbPn9MxoC1?cluster=devnet) · [submit 7.774](https://explorer.solana.com/tx/ipD1YAbnYrBRTwmLPrBuqK9rZyrk2SRs6jenVFeNkWGcSJod3paHF7vG1DT1J5rv1ZgPzdzJj8cMjFc25waUoPJ?cluster=devnet) · [approve 21.280](https://explorer.solana.com/tx/ZZV9RXzw7TmsubebQ66CUokNQSRe4eaYoVwEbK1QcsB8qt4ppQhffVgpXDJ3tNjDVsrKEUJHKgf5tyY1DGwuu93?cluster=devnet). Run 2: [post_job 27.085](https://explorer.solana.com/tx/3tQ5CKgQo4nxEmwtvnychknhWnryYaGYPrBXw5t6DxszmqVL88dARxJud6XJr3g4RWC5RPkcaGX5g3z7LutjhgQS?cluster=devnet) · [withdraw_job 17.190](https://explorer.solana.com/tx/2PFo47nQJQKrvJypofUWsDFmzogPsBqnQKWX3WeERxNNUvY9FX18w7uRbNHo2DmG4AfCiWGXZck1g7WAPFAFvrbg?cluster=devnet) (trả 0,10 USDC). Run 3: [post_job_open 22.080](https://explorer.solana.com/tx/2aqbn5st8ZMcvhRKwdAidtCJF1NzEqsAaxvoEDuFaHWgGFbKhcwt5nJJECyV4yD8kAJouQFj4PBcCLcaB7AS95CC?cluster=devnet) · [post_job_brief 3.937](https://explorer.solana.com/tx/2PvCxMLCShohSFpjokKA9B2Pacjc7gC3ufSucjyBjpd5v1yVbfpZJUmMBkm2zgxNuVtLpZtxCR4h1LeY9dpAyTpC?cluster=devnet) · [apply_job 12.904](https://explorer.solana.com/tx/5Spo8AGxAVRUvSTvj475S4PKv7tExS1jSj7SrhMkZ5BzHgrsEYr3udBVkmTa13tnmjQHMovVchFrPuwPj8gwzxq8?cluster=devnet) · [fund_job + create_fund + select_job 51.633](https://explorer.solana.com/tx/J1A4KASCt2oakGViMSMnwy85w78x7ftG3fBZxDvirMtQufHuLbBBQjC3tVVCcA5ZSJHi61idipDcLRBVnB5cuse?cluster=devnet) · [accept + lock_from_job 36.488](https://explorer.solana.com/tx/MnBbRkxFEYcRTGDxjC98hUGiBPZBX8K47kTRp9Xeo8eyLyMJj6W8im9CgBxpHHw9LE54EjnDFpuR4m2MUYZ7VTg?cluster=devnet) · [submit 7.774](https://explorer.solana.com/tx/4N1Bm44ckHwts7ziGRrcwC4twxUFDFch4FZ8PXWFy5dxbuZB3zPEUpLJskAEVyCp4x9f9ktkcgbnFBPL9o8mmh9J?cluster=devnet) · [approve 21.280](https://explorer.solana.com/tx/CHbvKfuiLBMTkzPJPBgrtodJENdqHz9DeCy2KD5cs2uagEdYqnHvqZzs6zmChQX5rgzsvzNPD5xdbY1D2ukPBWp?cluster=devnet); post_job_open không chuyển USDC (`unfunded` = 1), 0,10 USDC vào job vault khi chọn, giao dịch chọn 627 byte (1 milestone), cuối cùng Filled, `unfunded` = 0, contract [`Fc2v…bRKB`](https://explorer.solana.com/address/Fc2vD7zp8op7TNKjVcebcFDXyeyzL6Q11KeppBvRbrKB?cluster=devnet) Settled, 0,10 USDC tới DEMO_PAYOUT_PARTNER. Run 4: [post_job_open 22.100](https://explorer.solana.com/tx/2QhqhUHonKVGFGHw6ThtJtE3LXjDWyAcEENApKiLr38K7wxCmXRuSxXGaCGZqAZ4w7oRnxBwedUXXEfkMPW8baTU?cluster=devnet) · [withdraw_job 15.156](https://explorer.solana.com/tx/3crxZbo5Wof8YC35bTAQvFqF2RNja9KVTEsPjnw6PEF35a5rMjNsMVnp5g9vqh7rKJQMXN2PENpy9TrGxKwqzd6i?cluster=devnet); trả 0 USDC, job vault đóng, listing Withdrawn với `unfunded` = 1. CU trên devnet (số trên = cả giao dịch) thấp hơn LiteSVM: giao dịch lớn nhất `fund_job + create_fund + select_job` 51.633 (3 instruction), `accept + lock_from_job` 36.505 | `main` | V4 xong, chờ PO trước V5 |
| V5 core v1.4 (07/10, `main`): `packages/ned-core/src/jobs/` — `layout.ts` `JOB_OFFSET_UNFUNDED = 544`; `decode.ts` `unfunded: boolean`; `queries.ts` `listOpenJobs({ fundedOnly })` thêm memcmp 544 = 0 (mặc định tắt); `events.ts` `jobLogEvents(logs)` giải `JobPostedOpen`, `JobFunded` từ dòng `Program data:` (cho chuông và lịch sử); `client.ts` `buildPostJobIx({ lockNow })` → `post_job` / `post_job_open`, `buildFundJobIx`; `actions.ts` `runPostJob(env, draft, region, onBriefPart, { lockNow = true })` (chỉ kiểm tra số dư khi khoá ngay; Vietnam vẫn bị từ chối; trả `locked`; `JobBriefNotSavedError` có câu riêng khi chưa khoá), `runSelectJob` đặt `fund_job` đầu giao dịch khi listing chưa khoá (`fund_job + create_fund + select_job`), kiểm tra số dư trước: "You need X USDC to lock this budget when you select." (`NEED_USDC_TO_LOCK`), đường fallback re-select vẫn giữ `fund_job`; `runAccept` không đổi; `runWithdrawJob` trả `amount` 0 cho listing chưa khoá; `rules.ts` `isFunded`, `fundedLabel` ("Budget locked" / "Locks when hired"), `canFundJob`, `selectLocksBudget`; `canSelect` cần listing đã khoá hoặc `canFundJob` được. `CORE_FEATURES.lockAtHire = true` (`src/features.ts`); Workspace `FEATURES.lockAtHire` (ghi đè bằng `VITE_FEATURE_LOCK_AT_HIRE=false`), ví lấy mặc định core. Test mới: decode cả 2 loại, filter fundedOnly, decode event từ log, rules funded, thứ tự instruction select chưa khoá / đã khoá, lỗi số dư (cả khi không có ATA), post_job vs post_job_open, VN bị từ chối. Kết quả: core **181/181**, typecheck core (qua tsconfig Workspace, cả test) 0 lỗi; Workspace tsc 0 lỗi, node 22/22, Vitest 106/106 (thêm `unfunded: false` vào fixture, test component và preview của PostJob); ví tsc 0 lỗi, test 38/38; `expo lint` có 17 lỗi cũ ở file không đổi, file sửa sạch. Chưa đổi UI (V6) | `main` | V5 xong, chờ PO trước V6 |
| V6 UI v1.4 (07/10, `main`): `FEATURES.lockAtHire` (Workspace, mặc định bật; `VITE_FEATURE_LOCK_AT_HIRE=false` → giao diện v1.3: không có lựa chọn, không switch, chỉ hiện listing đã khoá, chữ cũ). **Post a job:** "When is the budget locked?" — Lock when I hire (mặc định, `runPostJob(…, { lockNow: false })`, nút "Publish") / Lock now (`lockNow: true`, "Lock X USDC & publish"); sheet xác nhận nhắc lại lựa chọn + câu CL 9.3 mục 10; thanh dưới, đoạn Timing, thẻ xem trước theo lựa chọn. `/new` (N1–N3) chưa làm nên chưa thêm phần open contract và mục 11. **Chip:** `ListingBudgetChip` "Budget locked"/"Locked" (xanh) hoặc "Locks when hired" (trung tính) trên JobCard, JobRow, Job detail, thẻ nổi bật Overview; aria-label và chữ Việt Nam theo CL mục 8. **Job detail:** gợi ý CL mục 9; sheet Apply trên listing chưa khoá dùng thông báo CL mục 7; Apply vẫn mở. **Find:** switch "Funded only" trong sheet Filters, `funded=1` trong URL, chip gỡ được; Newest xếp listing đã khoá trước trong cùng ngày (core `search.ts`); tiêu đề CL mục 6; tổng "locked" chỉ tính listing đã khoá. **Overview:** hero CL mục 4–5; stat "locked in open jobs" chỉ tính listing đã khoá + dòng "+N jobs that lock when hired"; thẻ "Newest funded job" chỉ lấy listing đã khoá. **Applicants:** sheet "Select @x and lock X USDC", số dư sau, 3 gạch đầu dòng, lỗi số dư V5 (nút tắt), sau khi xong "Budget locked · waiting for @x to accept"; "Withdraw listing" trả về "Nothing". **Chuông:** sự kiện core `budgetLocked` (listing của business từ chưa khoá → đã khoá) → "Budget locked for “{job}”", mở trang Applicants; freelancer không có gì mới. Vietnam view: không đăng được (như cũ), thấy chip, chỉ ≈ VND. **Chữ mới chưa có trong CL 9.3 (cần CL duyệt):** TRUST_TEXT, quy tắc "Budget locked before you accept", bước 1 How it works, CTA "Budget locked before you accept", nhãn stat "open jobs, each locked before you accept", ghi chú đầu Post a job, câu "Lock now", thanh dưới và đoạn Timing khi chưa khoá, gạch đầu dòng và "Your balance after" trong sheet Select, "Withdraw listing"/"Nothing", chữ khi listing chưa khoá bị rút, "Locks when you select · X", dòng My listings / My applications, sub của switch, nội dung thông báo chuông. **Test:** `lockAtHire.test.tsx` (chip, VN không có USDC/SOL, Funded only + URL, sort, flag tắt, Overview, Select sheet + lỗi số dư) và `postJobLock.test.tsx` (2 chế độ gọi đúng `lockNow`, flag tắt); sửa 2 test cũ theo chữ CL (mục 6 tiêu đề Find, nhãn stat). Workspace Vitest **123/123**, node 22/22, tsc 0 lỗi, build đạt (2 cảnh báo cũ: chunk > 500 kB, import `default` của anchor); core **184/184**; ví tsc 0 lỗi, 38/38. Workspace không có script lint. **Ảnh:** `docs/02-thiet-ke/screenshots/v6-lock-at-hire/` (20 ảnh, 1440 và 390 px, qua `/dev/hub`; fixture: mỗi listing thứ 3 là chưa khoá, thêm `job=` và `low=`) | `main` | V6 xong, chờ PO + CL trước V7 |
| V7 v1.4 done (07/10, `main`): **Tài liệu (commit docs):** áp lock-at-hire-plan §6 và pre-pitch-check §9.4 (sau V4 xanh) — `final-pitch.md` Slide 4 vấn đề 3 + câu nói, Q&A mới P8, slide 5–7 số 29/55/26, 67 test, bảng CU v1.4 (cao nhất `post_job` 49.173 = 24,6% → "dưới 25%"), CU devnet và 789 byte; `qa-cheatsheet.md` Q11, Q14 (bản tiếng Anh của P8), mục Numbers; `expert-check-pack.vi.md` Q10 + ghi chú Luật 74/2025 Điều 27; `ned-research-and-compliance.md` khối trạng thái 7/10 có v1.4/D29; `system-tracker.md` 3.1 vòng đời có `post_job_open`/`fund_job`, 4.2 hai loại listing, 6B C-8 spam + cách giảm, bất biến I13 "freelancer không bao giờ accept trước khi budget bị khoá (`select_job` bắt buộc)", §9 thông báo "Budget locked for …", §12 dòng V0–V7, §13 Q9 đóng; `program-spec.md` §11 đã deploy; `README.md` gốc trạng thái v1.4 trên devnet; `pre-pitch-check-7oct.md` G1 → "fixed in v1.4 (V1, V3)", sửa ghi chú R-4 (lỗi mới là `JobNotFunded`, `JobAlreadyFunded`), §5 số CU mới. **Copy pháp lý (commit riêng `feat(legal)`):** `copy.ts` Terms (mục 1), Job posting rules "Lock the budget now or when you hire" (mục 2), Disclosures thêm "Some listings lock only when they hire" (mục 3, 13 → 14 dòng), nguyên văn CL 9.3; test copy core + ví sửa cùng commit. **CL ok (PO xác nhận trong phiên, 07/10), đã push `3cafdc7`.** **Kiểm tra cuối (trên main + commit legal local):** `cargo test` 67/67 (1 + 4 + 10 + 23 + 29); `pnpm -r test`: core 185/185 (184 + 1 test copy), ví 38/38, Workspace node 22/22 + Vitest 123/123; build Workspace đạt (2 cảnh báo cũ); build ví web (`build:wallet`, dist/wallet) đạt; `npm run jobs:smoke -- --check`: program v1.4, binary devnet = build (683.040 B, `4f5a8ceb…`), IDL core = IDL build. **Chưa làm / ghi nhận:** số cũ còn ở `NED_Market_Analysis_Final.md`, `cl-review-7oct.md` (P15 13 dòng → 14, việc của CL); "escrow" còn trong câu hỏi Q12 của qa-cheatsheet (câu hỏi giám khảo, không đổi); `/new` open contract (N1–N3, mục 11) chưa build. Từ đây chỉ sửa lỗi và chữ đến final (feature freeze) | `main` | **V7 xong, v1.4 done**; số cũ đã sửa trong `NED_Market_Analysis_Final.md`, ghi chú v1.4 trong `cl-review-7oct.md` (P15 → 14 dòng); README core 185. Từ đây feature freeze |
| P15 kiểm tra production (07/10, sau V7): bundle production `index-P284W4vh.js` đã có copy pháp lý v1.4 và UI V6 ("Lock when I hire", "Locks when hired", "Funded only"). Render `https://unihackfest-2026.vercel.app/jobs/legal` bằng Chrome headless: Disclosures **14 dòng**, "Some listings lock only when they hire" ngay sau "Public on-chain"; Terms có câu "no instruction in the program lets anyone at N.E.D move locked funds" và câu mới "either when it is posted or when the business selects a freelancer, and always before the freelancer accepts"; Job posting rules mục đầu "Lock the budget now or when you hire". Ảnh: `docs/02-thiet-ke/screenshots/v7-prod-legal/`. **Đóng: PO xác nhận trên site thật (07/10)** | `main` | Xong |
| Rà soát ngôn từ toàn hệ thống (07/10, sau V7, PO yêu cầu): áp nguyên văn các câu CL đã viết trong `pre-pitch-check-7oct.md` §3 và §8.2 — **ví:** D1 "released automatically" (submit, contract ×3, new contract, `ui.tsx`) + câu A1, D13 welcome, F-5 review, setup.tsx; **core `copy.ts`:** D3, D4, D5, D10, D15 (+ dòng Disclosures "Residence is self-declared" → **15 dòng**), F-6, F-11, F3 (stash, 2 câu: Terms + guide), RECEIPT_LINE "Built on this device" (F-12), thông báo VN "Milestone {n} released to payout partner"; **Workspace:** D3 Submit, D7, D8, D10 (CTA, footer "runs no database"), D11, F-2 ("As listed by … at hand-over", chip "Listed: same fingerprint"), F-3 ("Hand-over link shared", màu trung tính), F-4/F-10 chuông ("Final files shared", "Reminder: hand over…"), F-8, F-9, F-13 ngữ pháp "You have", tiêu đề Find theo §10.2 "Find jobs · budget locked before you accept", bỏ "verified" (Job detail, Overview). Quét lại từ cấm trên UI 3 app: không còn (chỉ còn trong Swap/xStocks đang ẩn, key locale không dùng, comment IDL). Test sửa theo chữ mới; core 185/185, ví 38/38 + tsc, Workspace 22/22 + 123/123 + tsc, build đạt. **N1–N3:** quyết định roadmap sau final (feature freeze), ghi ở `prompts-open-contract.md`, tracker B-26, pre-pitch §10.2, Q&A P9 trong `final-pitch.md`. Còn mở (không phải chữ hoặc cần quyết): D2, D6, D12, D14, D16, D17, F-1, F-7, F-14, tên sản phẩm (§11) | `main` | Xong |
| D2 + F-1 (08/10, `main`, sửa lỗi trong feature freeze): **D2** — chuông của ví chỉ đồng bộ giao dịch on-chain ở chế độ quốc tế (`syncsOnChainActivity`), bỏ thông báo chuyển/nhận đã lưu khi không phải quốc tế (`isTokenTransferNotice`), chặn `/notification-detail` ở chế độ Việt Nam (`VN_BLOCKED_ROUTES`), số SOL hiện là SOL (`solActivityAmount`, bỏ `* 150` USD giả ở `services/solana.ts`), tiêu đề chuông và lịch sử chuyển sang tiếng Anh ("Received"/"Sent"). **F-1** — màn Submit trên điện thoại hiện "Submit from the Workspace on a computer to list your final files." kèm link "Open this milestone in the Workspace" (`/contract/<fund>/submit?i=<n>`), thanh trượt vẫn tắt khi thiếu danh sách file cuối (`services/submitOnComputer.ts`). Test mới: `regionGuard.test.ts` (D2), `submitOnComputer.test.ts` (F-1). Kết quả: ví **41/41** + tsc 0 lỗi + eslint 0 lỗi (4 cảnh báo cũ), core 185/185, Workspace 22/22 + 123/123, build ví web đạt. Commit `b6d1327` | `main` | Xong; cần PO thử trên iPhone (bước 3 dòng 6–7) |
| D30 R0 flag + scaffolding (08/10, `main`, không đổi hành vi): `CORE_FEATURES.accountRoles = false` (`packages/ned-core/src/features.ts`); ví `FEATURES.accountRoles` lấy mặc định core, ghi đè bằng `EXPO_PUBLIC_FEATURE_ACCOUNT_ROLES=true`; Workspace `FEATURES.accountRoles` ghi đè bằng `VITE_FEATURE_ACCOUNT_ROLES=true` (khai báo trong `vite-env.d.ts`). Module rỗng có comment đầu file (mục đích + "D30, behind accountRoles"): `packages/ned-core/src/account/{index,types,rules,countries,copy}.ts`, `packages/ned-core/src/legal/agreement.ts`; `index.ts` của core export `./account/index.ts`. Chưa chỗ nào đọc cờ. Test: core 185/185, ví 41/41 + tsc 0 lỗi, Workspace node 22/22 + Vitest 123/123 + tsc 0 lỗi. Ghi chú: `grep accountRoles` còn trúng các comment đầu file theo đúng yêu cầu R0 (không có chỗ dùng) | `main` | R0 xong; tiếp R1 và R2 (chạy song song được) |
| D30 R1 core: account model, country list, role rules (08/10, `main`, sau cờ `accountRoles`, chưa màn hình nào dùng): `account/types.ts` đúng build §2 + `TEAM_SIZES`; `account/countries.ts` 249 mã ISO 3166-1 alpha-2, tên tiếng Anh ngắn (sinh một lần từ CLDR rồi sửa tay: "and" thay "&", "Saint", "Côte d'Ivoire", United Kingdom/States, Congo (DRC)/(Republic)), xếp theo tên đã bỏ dấu, `SANCTIONED = []` (// lawyer before launch), `isCountry`, `countryName`, `searchCountries` (bỏ dấu, không phân biệt hoa thường, khớp mã hoặc đầu từ của tên; dùng lại `foldText` của `jobs/search.ts`); `account/copy.ts` nguyên văn copy deck C1, C2, C3, C5, C6 (`ROLE_COPY`, `COUNTRY_COPY`, `BUSINESS_COPY` (+ `badge.business`), `SETTINGS_COPY`, `WEB_COPY`, `GATE_COPY`, placeholder thành hàm); `account/rules.ts` `regionFromCountry`, `canBeClient`, `canRegisterBusinessIn`, `validateBusiness`, `validateProfile` (mã lỗi), `capabilities` (null → freelancer + vn), `canChangeCountry` (→ VN bị chặn khi còn hợp đồng client hoặc listing mở, trả copy sheet C5; `dropsClient` khi chuyển về VN). Test mới 23 (rules, countries, copy từ cấm): core **208/208**; tsc Workspace + ví 0 lỗi; test account typecheck 0 lỗi. **Thiếu copy deck (cần PO/CL ở R2):** lỗi khi chưa chọn country/size/industry (tạm dùng `common.chooseOne`), lỗi title > 60 và registration no. > 40 (message rỗng; ô nhập tự giới hạn độ dài) | `main` | R1 xong; R4 cần thêm R2 và board |
| D30 R2 agreement + legal copy (08/10, `main`, cờ `accountRoles` tắt, văn bản đang chạy không đổi): `legal/agreement.ts` (header "Draft for CL review (D30); not live until R9") — `AGREEMENT_VERSION = 1`, `AGREEMENT_COPY` (C4 nguyên văn), 4 thẻ `FREELANCER_CARD`/`CLIENT_CARD`/`BUSINESS_CARD`/`NED_CARD` (design §8 nguyên văn), `AGREEMENT_CHECKS`, `agreementCards`, `agreementText` (dòng cuối `Declared: <role> · <country>` để hash gắn với khai báo; không hiện trên màn hình), `agreementHash` (SHA-256 hex, `@noble/hashes/sha2.js`); `consentVersion(accountRoles)` (2/3), `CONSENT_SCOPE_V2` (chuyển từ `consent.tsx`) và `CONSENT_SCOPE_V3`. Ví `useConsentStore` và Workspace `hooks/consent.ts` lấy `consentVersion(FEATURES.accountRoles)`; `consent.tsx` lấy scope từ core (không đổi giá trị). `legal/copy.ts`: `TERMS_V12` (+ Who we are, Your role and where you live, Rights and duties = các thẻ, Limit of responsibility, Misuse, Changes thay mục 1.1, Contact, Law), `PRIVACY_V2` (+ mục CL §14.2 và "Country, role and business details are kept on this device"), `OPERATOR_NAME`/`GOVERNING_LAW` placeholder, `legalPlaceholders`; `legalDocs(disputesOn, accountRoles = false)`. Test: `agreement.test.ts` (hash ổn định, đổi theo role/country/version, thẻ, checks, consent) + `copy.test.ts` (từ cấm trên Terms 1.2, Privacy 2, chuỗi agreement; legalDocs theo cờ; mục Privacy 2; test placeholder là todo khi cờ tắt). Kết quả: core **217/217 + 1 todo**, ví 41/41 + tsc 0 lỗi + eslint sạch, Workspace 22/22 + 123/123 + tsc 0 lỗi. CL: `pre-pitch-check-7oct.md` mục "D30 copy for CL review (R2)". **Vấn đề:** thẻ freelancer có câu "Nobody, including N.E.D, can change it" mà audit F11 đã bỏ khỏi văn bản đang chạy (CL chọn chữ) | `main` | R2 xong; chờ CL (§9 câu 1–3 + F11) |
| D30 F11 (08/10, `main`, quyết định PO): thẻ freelancer đổi "Nobody, including N.E.D, can change it." → "No instruction in the program lets anyone change it." (`FREELANCER_CARD`, kéo theo `TERMS_V12`; copy deck §C4 local đã có câu mới); test mới trong `copy.test.ts`: không chuỗi agreement D30 nào có "including N.E.D, can change"; mục 4 của "D30 copy for CL review (R2)" ghi PO đã đổi, CL xác nhận. Test: core 218/218 + 1 todo, ví 41/41, Workspace 22/22 + 123/123 | `main` | Xong; CL xác nhận |
| D30 R3 board thiết kế (08/10, `main`, D0–D8 vẽ trực tiếp trong Claude Code, không export từ canvas): 18 board trong `docs/02-thiet-ke/canvas-v2/` mục "D30 · roles, country, business, agreement (8 Oct)" — `OnbRole`(+Business, Update), `OnbCountry`(+VN, VNClient), `OnbBusiness`(+Error), `OnbAgreement`(+Business, Ready, Ned), `SettingsAccount`(+VN, có inset Agreement), `SheetChangeCountry`, `SheetCountryBlocked`, `WebAccountPrompt`, `WebRoleGate`; tĩnh (không motion). Kiểm tra bằng script: step bar đúng (1/4→2/4→3/4, business 1/5→2/5→3/5→4/5), mọi chuỗi khớp copy deck/core trừ 5 dòng mới, không từ cấm, không số tiền, không SOL; USDC chỉ trong câu giải thích của deck; "self-declared" đi cùng tên business. Ảnh @2x: `docs/02-thiet-ke/screenshots/d30-boards/` (16 board điện thoại + 4 bản full). **Cần PO/CL trước R4:** thêm vào copy deck + core: "Fix the fields in red to continue.", "Close", "Your role", "Creating contracts is for clients", "Find work on N.E.D Jobs", dạng số ít cho `sheet.blocked.body` ("1 open job listings"); màu lỗi #D93A3A chỉ 4,14:1 trên nền #F4F4F6 (đề xuất #C42F2F); `OnbProfile` cũ vẫn ghi 2/3 (R4 đặt số bước trong code); phụ đề D0 15 px #3F3F49 khác board cũ 14 px #5E5E6A | `main` | R3 xong; PO xem ảnh, chốt các dòng copy mới |
| D30 R4 ví: onboarding mới (08/10, `main`, sau cờ `accountRoles`, cờ tắt thì như cũ): `stores/useAccountStore.ts` (`@ned_account_v1`: profile theo ví + log agreement chỉ thêm; `getAgreement` = bản mới nhất chưa rút, đúng `AGREEMENT_VERSION` và consent hiện hành), `stores/useSignupDraft.ts` (chỉ trong bộ nhớ), `services/accountOnboarding.ts` (thuần: `accountStep`, các hàm draft, `commitAgreement`, `currentAgreement`), màn `role`, `country` (`searchCountries`, sheet "Join as a freelancer?"), `business` (`validateBusiness`, chọn quốc gia đăng ký trong sheet), `agreement` (thẻ từ `agreementCards`, 3 ô chưa tick, link Terms/Privacy/Disclosures + Job posting rules mở `/jobs/legal?doc=rules` của Workspace), `components/onboarding/account.tsx`. Agree ghi theo thứ tự: consent v3 (`CONSENT_SCOPE_V3`) → profile → agreement (hash `agreementText`) → region; rồi `/setup`. `resolveOnboarding`: nhánh cờ ở dòng đầu, thân cũ giữ nguyên (test so với `85f7934`); mới: role → country → (business) → agreement → fund → profile → home; ví cũ: bước còn thiếu rồi home. `residence` và `consent` chuyển hướng khi cờ bật; `profile` 4/4 (5/5), xong vào `/home`; `/terms`, `/privacy` hiện bản 1.2 / 2 khi cờ bật. Đăng xuất: giữ key `@ned_account_v1` (log agreement), xoá profile. Core: `BUSINESS_COPY.fixErrors`, `AGREEMENT_COPY.close` (chưa có trong copy deck, PO xác nhận), `AGREEMENT_LINKS`. Test: ví **49/49** (+8 `onboarding.d30.test.ts`), tsc 0 lỗi, eslint sạch ở file sửa; core 219 + 1 todo; Workspace 22/22 + 123/123. Xem trên web (cờ bật, trang dev tạm không commit): 4 màn khớp board. **Chưa làm được:** chạy thật bằng tài khoản Google (PO check); màu lỗi dùng token `status.error` thay #D93A3A | `main` | R4 xong; PO thử 3 tài khoản với cờ bật |
| D30 R5 ví: chặn theo vai trò + Settings "Your account" (08/10, `main`, sau cờ `accountRoles`; cờ tắt thì như cũ, đóng D17 khi cờ bật): `hooks/useCapabilities.ts` + `services/accountSettings.ts` (`capabilitiesFor`: cờ bật = core `capabilities(profile)`, cờ tắt = luật region cũ, cùng shape). Thay check `vn` của hành động client: `contracts/new` (VN giữ màn chặn cũ; freelancer ngoài VN thấy `GATE_COPY.clientNeeded` + Open settings), `lock` (thanh trượt cần `cap.lock`, lời từ chối theo `GATE_COPY`), chi tiết hợp đồng (nút Lock cần `cap.lock`; tài khoản chỉ có vai trò client mở lời mời thấy **Also work** trước Accept; approve/close vẫn theo luật D18 cũ để client không kẹt hợp đồng đang chạy), danh sách hợp đồng (tab mặc định, nút New contract, câu trống), Home (empty state, ô New contract, gợi ý). Settings cờ bật: nhóm "Your account" (`components/settings/YourAccount.tsx`) thay công tắc "I live in Vietnam": Also work / Also hire (giữ ít nhất 1, Also hire khoá ở VN), Where you live → `/country?edit=1` (đếm hợp đồng client chưa Settled bằng `useFunds('client')` và listing Open/Selected bằng `listMyJobs`; chặn → sheet Blocked, không → sheet Change; xác nhận cập nhật profile + region; chuyển về VN bỏ vai trò client và business), Business → `/business?edit=1`, Agreement (phiên bản + ngày, xem lại `agreementText` của bản đã đồng ý, Withdraw and sign out = `withdrawAgreement` + luồng rút consent cũ); dòng Consent ẩn khi cờ bật. Đăng xuất: xoá profile, giữ log agreement (đã làm ở R4; test cập nhật). Test: ví **59/59** cả cờ tắt và bật (+`capabilities.test.ts`, `settingsAccount.test.ts`, test sign-out), tsc 0 lỗi, eslint sạch; core 219 + 1 todo; Workspace 22/22 + 123/123. Xem trên web (cờ bật, trang dev tạm không commit): Settings khớp `SettingsAccount` và `SettingsAccountVN` | `main` | R5 xong; PO kiểm tra với cờ bật |
| D30 R6 Workspace + N.E.D Jobs (08/10, `main`, sau cờ `accountRoles`; cờ tắt thì như cũ): `hooks/account.ts` đọc `@ned_account_v1` của ví (storage event + dự phòng 3 s như consent; Workspace không ghi), `useAccount` → `{ profile, agreement, capabilities, needsSetup, isUpdate }`, `useOwnBusinessLabel`. `AccountPrompt` (board WebAccountPrompt) thay `RegionPrompt` ở `Layout` và `JobsLayout`: Open in wallet → `/role` (`/role?update=1` cho ví đã có money view), Later đóng trong phiên và để lại dòng `laterNote`. `WalletPanelContext.ensureAccount(action)` (thiếu account → panel `/role`; thiếu vai trò → `RoleGateNotice` với `GATE_COPY` + Open settings / Also work, cả hai mở panel ở `/settings` vì Workspace không ghi store của ví); `ensureConsent` mở `/role` khi cờ bật; ConsentGate ẩn khi cờ bật. Gọi `ensureAccount` ở: tạo hợp đồng, Lock/Accept (Open in wallet) và lockFromJob trên trang hợp đồng, Post a job, Select, Apply. Ẩn lối vào cho người không phải client: New contract (WorkspaceNav, Overview, WalletPanel), Post a job (header, footer, CTA); audience trang jobs theo vai trò; `/new` và `/jobs/new` mở bằng URL hiện `RoleGateCard` (bản VN không có Open settings). JobDetail: tài khoản chỉ client thấy Also work thay form pitch. Nhãn "Lumen Studio · Business · self-declared" trên thẻ job của chính mình (Find, xem trước Post a job) và đầu trang hợp đồng khi mình là client business. Nút Change money view trong panel mở `/country?edit=1` khi cờ bật. Core: `capabilitiesFor` và `currentAgreement` chuyển vào core (ví re-export), `WEB_COPY.prompt.steps`, `GATE_COPY.createTitle`, `GATE_COPY.findWork` (chưa có trong copy deck, PO xác nhận). `hooks/consent.ts` đọc phiên bản consent lúc gọi. Test: Workspace node 22/22 + Vitest **141/141** cả cờ tắt và bật (+`accountPrompt.test.tsx` 4, `gates.test.tsx` 11, `hooks/__tests__/account.test.tsx` 3; khối P4 consent của s9 cố định cờ tắt), tsc 0 lỗi, build đạt; core 219 + 1 todo; ví 59/59 | `main` | R6 xong; PO thử Workspace với cờ bật |
| D30 R7 người dùng cũ (08/10, `main`, chỉ khi cờ bật): `accountState` — ví có ReverseRecord mà chưa có profile, hoặc agreement đang hiệu lực là bản cũ (`hasOlderAgreement`: version agreement hoặc consent thấp hơn), vào `role` với `update`; `onboardingRoute('role', true)` → `/role?update=1`; `/setup` chuyển tiếp cờ update. Màn role ở `?update=1` (board OnbRoleUpdate): thẻ thông báo `role.update`, không có nút Back, chọn sẵn một lần lúc mở (`preselectDraft`): money view `vn` → freelancer + VN; `intl` → đọc lịch sử trên chain (`listFunds` client/freelancer, `listMyJobs`, `listMyApplications`): tạo hợp đồng hoặc đăng listing → client, đã accept hoặc đã apply → freelancer, cả hai → cả hai, không có → không chọn sẵn; quốc gia để trống. Chỉ chọn sẵn, người dùng xác nhận từng màn; agreement luôn hỏi (consent v3). Không đổi PendingInviteGate. Workspace: AccountPrompt đã mở `/role?update=1` (R6). Test: ví **67/67** cả cờ tắt và bật (+`onboarding.update.test.ts` 8: chọn sẵn vn / intl client / intl freelancer / cả hai / không lịch sử; agreement cũ → update; cờ tắt không bao giờ vào update), tsc + eslint sạch; Workspace 22/22 + 141/141 cả hai trạng thái cờ; core 219 + 1 todo | `main` | R7 xong; tiếp R8 |
| D30 R8 kiểm tra + tài liệu (08/10, `main`): chạy mọi bộ test với cờ tắt và bật — core 219 + 1 todo, ví 67/67, Workspace node 22/22 + Vitest 141/141 (cả `test:ui`) — không có lỗi D30. Chạy hai app với cả hai cờ bật và chụp 4 luồng (`docs/02-thiet-ke/screenshots/d30/`, 16 ảnh): a. freelancer mới ở VN, b. client business mới ở Singapore, c. tài khoản v2 cũ (luồng update), d. tài khoản VN mở `/new` và `/jobs/new` bằng URL. Ảnh làm bằng trạng thái thiết bị gieo sẵn (route dev tạm không commit + `?previewWallet=`), không phải đăng nhập Google thật. Sửa 1 lỗi giao diện thấy khi chụp: link "Find work on N.E.D Jobs" bị CSS của Jobs tô đen. `product-spec.md` §5.2 màn hình account + bảng từ (self-declared, Also hire, Also work, Your account, danh sách "không viết" design §6); `system-tracker.md` B-27 (R0–R9) và Q10–Q13 (operator, luật áp dụng, dòng quyền với sản phẩm, Phase 2) | `main` | R8 xong; PO chạy thật bằng Google rồi gửi CL commit này để duyệt copy cuối (R9) |
| D30 R9 phần 1: áp dụng câu trả lời của CL (08/10, `main`, cờ vẫn tắt, demo không đổi): CL Nguyễn Minh Chính (@F4ol4n) duyệt; PO trả lời trong cùng tin. `OPERATOR_NAME` = "Hồ Du Tuấn Đạt, on behalf of the N.E.D team (UniHackFest 2026 pilot)", `GOVERNING_LAW` = "the laws of Vietnam; disputes go to the competent courts of Ho Chi Minh City"; test placeholder bỏ `test.todo` (chạy luôn); `sheet.blocked.body` chia số ít/nhiều cho từng danh từ; 5 dòng mới (fixErrors, close, steps, createTitle, findWork) thêm vào copy deck local (`NED-prompts-d30-design.md` §C) và bỏ ghi chú "chưa có trong deck" trong core; ghi câu trả lời vào `pre-pitch-check-7oct.md`. Test cờ tắt và bật: core **220/220 (0 todo)**, ví 67/67, Workspace 22/22 + 141/141; tsc sạch. **Chưa làm:** Vercel preview và bật production (2 biến môi trường) — chờ PO xác nhận lại ngày vì luật "sau final 10/10, demo không đổi" | `main` | Chờ PO chọn ngày bật |
| Deploy GitHub Pages (09/10, PO "go"): bản ví `tdat10052499.github.io/Unihackfest-2026` build lại từ `main` `b6c238d` (trước đó là bản 04/10, chưa có v1.4, D2, F-1, copy CL). Cờ D30 **tắt** (không có `EXPO_PUBLIC_FEATURE_ACCOUNT_ROLES` trong `.env`), dev tools tắt. Trước khi deploy: ví 67/67 + tsc sạch. gh-pages `72217df`, bundle `index-7d4a924f…` đã chạy trên site | `gh-pages` | Xong; D30 production vẫn chờ PO thử preview |
| D30 R9 live (09/10, PO chọn "bật D30 cả hai" trước final): cùng commit `d47fc8e`. **Vercel:** thêm `VITE_FEATURE_ACCOUNT_ROLES=true`, `EXPO_PUBLIC_FEATURE_ACCOUNT_ROLES=true` cho Production (đã đọc lại giá trị), `vercel deploy --prod` từ checkout sạch; kiểm tra bundle: Workspace `FEATURES.accountRoles` bật (`CORE_FEATURES` vẫn `false`), `/wallet` bật. **GitHub Pages:** lần build đầu ra cùng hash với bản cờ tắt (`index-7d4a924f…`, `accountRoles` vẫn lấy từ core) vì Metro dùng lại cache, không thấy biến môi trường mới → build lại với `expo export --clear` (`index-ef61fdd8…`, `accountRoles:!0`), publish gh-pages `69f4a09`, site đã chạy bản mới. Sửa `predeploy` thêm `--clear` để không lặp lại. Ghi: decision log D30 "accepted 8 Oct, live 9 Oct", README dòng "Roles and agreement", ghi chú cho CL trong `pre-pitch-check-7oct.md`, tracker B-27 ✅, Q10–Q12 đã quyết. **Chưa làm (PO):** thử tài khoản demo cũ (luồng update một lần, hợp đồng còn nguyên) và một tài khoản Google mới | `main` + `gh-pages` | Live; chờ PO thử tài khoản thật |
| Settings: Wallet address + Copy (09/10, `main` `50f05af`): hàng mới dưới thẻ hồ sơ, hiện địa chỉ rút gọn, chạm để chép toàn bộ, "Copied ✓" 2 giây; mọi chế độ. Deploy GitHub Pages (PO "go"): build với `EXPO_PUBLIC_FEATURE_ACCOUNT_ROLES=true` và `--clear`, kiểm tra bundle trước khi publish (`index-558390fa…`: `accountRoles:!0`, có hàng mới, `devTools:!1`), gh-pages `9fdb7f0`, site đã chạy bản mới. Vercel `/wallet` (tự build sau push) cũng có hàng mới, D30 bật. Ví 67/67 + tsc sạch | `main` + `gh-pages` | Xong; CL xem có cần ẩn ở chế độ Vietnam không |
| Add USDC (09/10, PO): nhánh local `feat/add-usdc` merge fast-forward vào `main` (`6cd762a`) theo yêu cầu PO. Màn `/add-usdc` (số dư, cần khoá, còn thiếu, "Back to lock" khi có `?fund`; "Get test USDC" chép địa chỉ + mở faucet Circle trong cùng lần bấm, đọc số dư mỗi 5 s tối đa 5 phút; QR + địa chỉ; phí mạng Ready / Low · Get test SOL); Home quốc tế: New contract · Add USDC (bỏ Receive, Send); Lock: nút "Add USDC", số dư đọc lại khi quay về; Settings: "Move USDC out" (chỉ quốc tế) và câu mô tả mới; `/receive` → `/add-usdc`; region guard chặn `/add-usdc` ở chế độ Vietnam; panel Workspace "Add USDC"; `services/testSol.ts` dùng chung với màn fund. Test: ví 70/70, Workspace 22/22 + 141/141, tsc + lint sạch, không có từ cấm. Deploy: Vercel tự build sau push (`/wallet` và panel có Add USDC); GitHub Pages build với D30 bật + `--clear`, bundle `index-56039cec…` (`accountRoles:!0`, `devTools:!1`, có Add USDC), gh-pages `23175df`. Ảnh: `docs/02-thiet-ke/screenshots/add-usdc/`. **Chưa thử:** trạng thái còn thiếu / Back to lock (devnet không có hợp đồng chờ Lock), faucet thật, chế độ Vietnam bằng tài khoản thật | `main` + `gh-pages` | Live; PO thử bằng tài khoản thật |
| Responsive điện thoại hẹp (09/10, PO báo giao diện không co giãn): đo 11 màn × 320–1280 px, không có tràn ngang; lỗi thật là chữ bị cắt "…" dưới 360 px (ô nhanh Home cao cố định + 1 dòng, badge Devnet chiếm chỗ tiêu đề "New cont…", chip trạng thái). Sửa (`5cf7781`): `sizes.narrow = 360` + `useNarrow()`; dưới 360 px badge xuống dòng riêng (Home, TopBar hợp đồng); ô nhanh `minHeight` + 2 dòng; dòng hợp đồng cho số tiền xuống dòng, canh phải. Tablet/desktop vẫn là cột 480 px (thiết kế). Test ví đạt, tsc + lint sạch. Deploy: GitHub Pages `index-c1fbfdaa…`; Vercel bỏ qua build tự động (commit chỉ đổi `ned-wallet`, Root Directory `ned-workspace`) nên `vercel deploy --prod` từ worktree sạch, `/wallet` `index-7c77921f…`; cả hai có `narrow:360`, `accountRoles:!0`, `devTools:!1` | `main` + `gh-pages` | Live |
| Dọn phần N.E.D Wallet cũ (09/10, PO): gỡ Swap, xStocks, client Jupiter, sổ demo, `services/history.ts` (`d8fe77b`); gỡ chế độ ví Simple/Crypto (`/mode`, `useWalletModeStore`; cờ D30 tắt thì ví đã chọn mode trước 04/10 mà chưa chọn nơi ở sẽ được hỏi nơi ở một lần) (`274271f`); xoá module, ảnh và chuỗi dịch không dùng, `USDC_MAINNET_MINT`; locales chỉ còn nhóm `activities` (đóng F3) (`c7056e7`). Chuyển 01, 03, 04, 05-vietnam, poc-dynamic, cleanup-report, `ned-wallet/docs/Process.md` và bộ thiết kế v1 (README, trang-thai-thiet-ke, ui-pdf-alignment, PDF, `canvas/`) sang `docs/archive/` bằng `git mv`, viết lại link, thêm `archive/README.md` và `02-thiet-ke/README.md` mới (`203e6b6`, `f36a54c`). Chữ đổi trên app: History "Money you send, receive or swap shows up here." → "Money you send or receive shows up here."; bỏ dòng "Demo swap". Test: core 220/220, ví 57/57 (70 − 13 test của file đã xoá), Workspace 22/22 + Vitest 141/141; `tsc` 0 lỗi; lint 11 lỗi / 6 cảnh báo, giống hệt trước (theo file và rule); `expo export --clear` và `build:all` đạt; 390 px: History, Settings, Contracts, Residence không màn đỏ, `/swap` và `/xstocks` vào not-found. Dependencies không đổi | `main` (chưa push) | Chờ PO go để push |

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

**B4a (03/10/2026): màn hợp đồng trên app.**
- **`/contracts`** (board ContractsList):
  - tab As freelancer / As client; lọc Active · Needs action · Completed;
  - chip trạng thái, avatar, trạng thái rỗng;
  - "New contract" chỉ khi là client và không ở Vietnam view; "Share my @username" cho freelancer.
- **`/contracts/[fund]`** (board ContractDetail):
  - banner "Next ·", banner "Release now / Refund now · ANYONE CAN DO THIS", không đủ thời gian;
  - bên kia; hero có bằng chứng vault + Explorer; nơi nhận tiền (+SIMULATED);
  - **Brief card**: `ok` / `mismatch` / `noKey`, có ô dán link;
  - milestone có tên, "Done when", đếm ngược theo giờ chain (tô vàng khi gần hết);
  - luật, Disclosures, Contract ID, **Copy contract link** kèm cảnh báo ai có link cũng đọc được brief;
  - thanh hành động theo vai trò.
  - Vietnam view **không có hành động của client** (D18): client chỉ thấy thông báo.
- **Accept** (`/accept`):
  - brief hiện trước và **bắt buộc "Brief matches ✓"**;
  - Vietnam view ẩn lựa chọn USDC và hiện ghi chú "You live in Vietnam, so earnings arrive in VND only";
  - "This can't be changed later", phí liệt kê từng dòng, slide to accept.
- **Lock** (`/lock`): kiểm tra số dư, link faucet, phí liệt kê, slide; màn **Locked** cho client và bản đối xứng cho freelancer (banner "Locked · you can start" trên trang chi tiết).
- **Release now / Refund now** là bottom sheet; **Close** (`/close`) cho biết rent trả về và có màn kết quả.
- Submit / Review trên app là việc của B4b; nút hiện nhưng bị tắt, kèm ghi chú.
- **Nhãn (open issue 3)** sửa trong core: client "Review time is over · anyone can release", freelancer "Ready to release"; thêm "Submission deadline passed". Có 2 test mới.
- `SlideConfirm` restyle theo board (pill tint, nút tròn tím), có trạng thái busy; vẫn giữ "Tap to confirm instead".
- **Preview cho dev:** `/dev/contract-preview?wallet=…&fund=…&view=…&screen=list|detail|accept|lock|locked[&k=…]`, chỉ đọc, chỉ khi `devTools`.
- **Test:**
  - core **86/86**, wallet 21, workspace 3; `tsc` app + workspace 0 lỗi; `expo export --platform web` OK.
- **Devnet:** chạy qua từng trạng thái bằng script tạm (không commit) với hai ví test, VND path, 1 milestone; chụp Chromium 390×844, không chữ bị cắt, không lỗi:
  - created: client chi tiết, freelancer chi tiết + accept;
  - accepted: client chi tiết + lock, freelancer chi tiết;
  - locked: client màn Locked + chi tiết, freelancer chi tiết + màn mirror;
  - review passed: cả hai chi tiết, nhãn đúng open issue 3;
  - sau đó release, đóng hợp đồng; thêm một hợp đồng ngắn để chụp danh sách (đã đóng). Client test còn **11 USDC**, partner nhận 1.
- **Chưa test tay (cần chủ dự án):** hai trình duyệt thật (Mia Chrome desktop, Vinh Safari iPhone) — tạo qua `/dev/milestone`, Vinh đọc brief và accept VND, Mia lock.

**Baseline 06/10/2026 (`release/6oct`, prompts-6oct mục 0).**
- **Branch:** `release/6oct` tạo từ `main` = `4b64b21` (Merge PR #36 `docs/funded-jobs-plan`), đã push lên origin; sau khi PO push tài liệu D27/D28 (PR #37, #38) đã fast-forward lên `6ceb6f0`. Chưa sửa gì trong code.
- **Công cụ:** anchor-cli 1.1.2 · solana-cli 3.1.10 (Agave) · node v24.10.0 · pnpm 11.24.0 · npm 11.6.1 · cargo/rustc 1.98.0.
- **Cài đặt:** `pnpm install --frozen-lockfile` ở gốc repo: OK, lockfile không đổi.
- **Kết quả (tất cả đạt, không có lỗi nào):**

  | Bước | Kết quả |
  | --- | --- |
  | `anchor build` (ned_program) | OK, 0 cảnh báo |
  | `cargo test` (ned_program) | 29 milestone + 10 identity + 4 helper + 1 lib = **44/44** |
  | `packages/ned-core` test | **100/100** |
  | `packages/ned-core` typecheck | không có `tsconfig` riêng; được typecheck qua hai app (bên dưới) |
  | `ned-wallet` test | **26/26** |
  | `ned-wallet` `tsc --noEmit` | 0 lỗi |
  | `ned-workspace` test | **10/10** |
  | `ned-workspace` `tsc --noEmit` | 0 lỗi |
  | `ned-workspace` `npm run build` | OK (cảnh báo sẵn có: chunk chính > 500 kB) |
  | `ned-wallet` web export (`/Unihackfest-2026`, GitHub Pages) | OK |
  | `ned-workspace` `build:wallet` (app ở `/wallet`, W6) | OK, 49 giây |
  | `ned-wallet` `npm run lint` | **đã lỗi từ trước:** 11 lỗi, 6 cảnh báo trong 5 file cũ (`app/dev/home-preview.tsx`, `app/notification-detail.tsx`, `app/scan-qr.tsx`, `components/Mascot.tsx`, `components/NotificationInAppBanner.tsx`). Lỗi đầu tiên: `home-preview.tsx:26` "Calling setState synchronously within an effect" (`react-hooks`). `ned-core` và `ned-workspace` không có script lint |

- **Tài liệu và board cần cho hôm nay (mục 4):** lần kiểm đầu thiếu 3 tài liệu và 5 board. Sau khi PO push (PR #37), **đã đủ**: `funded-jobs-plan.md`, `delivery-review-updates.md`, `review-decision-plan.md`, `build-order-6oct.md`, `prompts-6oct.md`, cùng các board `WebJobs`, `WebJobsFind`, `WebJobDetail`, `WebJobPost`, `WebJobApplicants`.
- **Việc của PO trước S1** (build-order bước 0): thu hồi/đổi các key S1–S3; nạp faucet cho các địa chỉ demo; xác nhận D25–D28.

**D1 (04/10/2026): chạy end-to-end trên bản đã deploy.**
- **Cách chạy:** PO chỉ có 1 tài khoản Google, nên PO đóng một vai bằng giao diện thật, vai còn lại chạy bằng script tạm (hai ví test, dùng chung các hàm của core). Đã chuyển 0.15 SOL từ ví deploy sang hai ví test (PO đồng ý).
- **Công cụ:** `npm run milestone:status -- <hợp đồng | ví>` (chỉ đọc): trạng thái, vault, note brief/delivery/key, số thiết bị đã đăng ký.
- **Deploy:** GitHub Pages bản mới (có `/c/…`, Records, key sync); Workspace qua `main`.
- **Lượt 1 (PO là Mia, client), hợp đồng `DXtu…`:** tạo trên laptop → accept bằng script → lock trên điện thoại → nộp bằng script → PO duyệt trên laptop ("Same delivery ✓", so file) → release → nộp/release M2 → close trên điện thoại. **Đạt.**
  - Bước 7 (release sau khi hết hạn review): dùng hợp đồng chuẩn bị sẵn `3t22…` (hạn nộp +2 phút, review 1 phút). PO bấm Release now trên điện thoại bằng một ví **không tham gia hợp đồng** → `release_after_review` đạt.
- **Lượt 2 (PO là Vinh, freelancer, Vietnam view), hợp đồng `Dfo5…`, sau khi có key sync:** script tạo hợp đồng **không gửi link** → PO mở từ Contracts trên điện thoại: **brief tự hiện**, accept VND → script lock → PO nộp M1 + M2 trên laptop (brief cũng tự hiện) → script kiểm "matches", approve → close. **Đạt.**
- **Lỗi tìm được và đã sửa:**
  1. **Workspace không có chỗ chọn money view** (luôn Vietnam view, client bị chặn) → hộp "Where do you live?" hỏi một lần + "Money view · Change" (`6ef66ac`);
  2. **Dán link mới đọc được brief** → key sync Plan C (D22, xem dưới);
  3. **Chọn hạn nộp bằng tay chậm và dễ nhầm ngày** → nút "+10 min (demo) / +1 day / +7 days", lỗi hạn nộp chỉ hiện khi bấm Create;
  4. **Thông báo Vietnam view che nút Lock mà không có lối tới Settings** → thêm "Open Settings";
  5. `milestone:status` báo lỗi khó hiểu với hợp đồng đã đóng (`d4f27c6`).
- **Còn mở:**
  - router mời mở trên **laptop** thì ở lại Workspace (đúng thiết kế); muốn bấm "Release now" thì phải dùng điện thoại, vì trang hợp đồng trên Workspace chưa có nút đó;
  - hợp đồng `349o…` đã `Settled`, cần PO **Close** trên điện thoại (PO là người tạo) để lấy lại rent.

**D22 (04/10/2026, PO): key sync Plan C, đọc brief trên mọi thiết bị không cần dán link.**
- **S0:** ví MPC của Dynamic ký cùng thông điệp hai lần ra **hai chữ ký khác nhau** → không sinh lại khoá từ chữ ký được (bỏ Plan A).
- **Plan C:**
  - mỗi thiết bị có khoá X25519 riêng, public key đăng ký trên chain (`DeviceKeys`, tối đa 5);
  - khi tạo hợp đồng, K được gói cho mọi thiết bị đã đăng ký của hai bên (note loại 2);
  - thiết bị đã có K tự gói lại cho thiết bị anh em còn thiếu;
  - link mời vẫn là kênh liên lạc đầu tiên và phương án dự phòng.
- **Chương trình v1.2 trên devnet:**
  - `init_device_keys`, `add_device_key`, `remove_device_key`, `post_note` loại 2; test g19, g20, toàn bộ 29 test milestone + 10 identity đạt;
  - upgrade `31n4oCxDZfv59Q6KQMu5czm9hXuNwWPpAXqetn3QKFXNLf4eKneGvZWxQWKyot4i1o9DC5TZB1pBDcKqunEproML` (slot 507408511), extend +40,000 byte (≈ 0.204 SOL), buffer đã hoàn lại; smoke test devnet đạt sau upgrade.
  - CU: `post_note` key (6 wrap) 4,611; `init_device_keys` + `add_device_key` 14,554.
- **Core:** `devicekeys.ts` (khoá thiết bị, registry, wrap/unwrap HKDF + XChaCha20-Poly1305, AD = fund ‖ thiết bị), `runRegisterDevice`, `runShareKey`, `recoverContentKey`; `runCreate` tự gói K. `@noble/curves` 2.0.1 thành dependency trực tiếp (PO đồng ý; lockfile chỉ thêm 9 dòng). Core **100/100**.
- **Hai app:**
  - tự đăng ký thiết bị sau khi đăng nhập (một giao dịch nhỏ, lần đầu, ≈ 0.0017 SOL);
  - mở hợp đồng thì tự lấy K từ note key; tự gói cho thiết bị còn thiếu;
  - câu báo "chưa có key" mới (mở N.E.D trên thiết bị đã dùng trước, hoặc dán link).
- **Kiểm tra devnet:** script mô phỏng nhiều thiết bị (điện thoại đọc không cần link, laptop mới đọc sau khi gói lại; lần gói thứ hai không gửi gì); PO kiểm trên laptop + iPhone thật: **brief hiện trên cả hai, không dán link**.
- **Tài liệu:** `key-sync-plan.md`, `program-spec.md` v1.2, D22 trong decision log.

**D21 (03/10/2026, PO): landing chuyển sang repo khác.**
- Landing giới thiệu sẽ được xây ở **một repo riêng** và gắn link sau. Project Vercel của repo này **chỉ chạy Workspace** tại `https://unihackfest-2026.vercel.app`.
- Luồng vào: chưa đăng nhập → `/sign-in` (hero WebSignIn + "Sign in with N.E.D Wallet" → Google) → Workspace (Overview). Luồng này đã có từ W1, **không cần thêm code**.
- `site/` (C5) giữ lại để tham khảo, **không deploy**; đã ghi D21 trong decision log, đánh dấu C5 trong build-plan và `site/README.md` là superseded.
- **Sự cố 03/10:** Root Directory của project Workspace bị đổi thành `site`, nên domain Workspace trả về landing: `/sign-in` báo 404, mất đăng nhập. Cách sửa: Root Directory trả lại `ned-workspace`, rồi tạo deployment mới từ `main`.
- Link cần đưa cho repo landing: Workspace `https://unihackfest-2026.vercel.app`, bản mobile `https://tdat10052499.github.io/Unihackfest-2026/`.

**C5 (03/10/2026): landing page tĩnh `site/`.**
- **Cách làm:** HTML + CSS tĩnh, **không có JavaScript**, không đăng nhập, không có code ví, không analytics.
- **Nội dung:**
  - hero với câu "Freelancers receive their earnings, locked by code." và mô tả sản phẩm (product-spec 1);
  - **"Try the mobile demo"**: mã QR + link thường tới `/m`;
  - **"Open Workspace"** (`WORKSPACE_URL`, mặc định `https://unihackfest-2026.vercel.app`);
  - "How it works" 3 bước; "The 2-minute judge path" (theo product-spec 7);
  - Disclosures (devnet/test money, payout partner giả lập với Due, Nium là ứng viên, N.E.D không giữ tiền, không đổi tiền, không thu phí trong pilot, chưa KYC, chưa audit, Circle có thể freeze, không phải tư vấn pháp lý/thuế/tài chính).
  - Kiểm tra từ cấm (pay/payment/escrow/safe/guaranteed/invest/free/zero fees): không có.
- **QR tạo lúc build** (PO chọn): `site/build.mjs` dùng `qrcode@1.5.4` (devDependency duy nhất, có `package-lock.json` riêng). QR trỏ tới `<LANDING_ORIGIN>/m`, mặc định là domain production của chính project Vercel (`VERCEL_PROJECT_PRODUCTION_URL`), nên QR in ra vẫn đúng dù đổi host mobile.
  - `site/` **không** nằm trong pnpm workspace: thử thêm vào thì pnpm tính lại peer dependency của app điện thoại (~1.000 dòng lockfile đổi), nên đã hoàn tác.
- **`site/vercel.json`:**
  - `/m` → `https://tdat10052499.github.io/Unihackfest-2026/` (302);
  - CSP chặt (`script-src 'none'`, chỉ cùng origin), `X-Frame-Options: DENY`, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`; font cache 1 năm.
- **Giao diện:** theme sáng, không viền, một hiệu ứng rise (opacity + transform, 360 ms, lệch 40 ms); tắt hẳn khi Reduce Motion (đã kiểm: `animation none`, opacity 1).
  - Font tự host (Inter, Space Grotesk, Space Mono; bộ latin; SIL OFL), vì Google Fonts làm chậm mobile (Performance 87 → 100).
- **Lighthouse** (bản build + header như `vercel.json` + gzip):

  | | Performance | Accessibility | Best Practices | SEO |
  | --- | --- | --- | --- | --- |
  | Mobile | 100 | 100 | 100 | 100 |
  | Desktop | 100 | 100 | 100 | 100 |

  - Mobile: FCP 1.4 s, LCP 1.5 s, CLS 0.
- **Local:** 390 px và 1440 px không bị tràn ngang, không lỗi console; `/m` trả 302 tới GitHub Pages; link "Open the mobile demo" mở đúng bản mobile.
- **Chưa làm (cần PO), không đổi dashboard:**
  - tạo **Vercel project 1**: Import repo → Root Directory `site` → Framework Preset "Other" (build/install/output đã nằm trong `site/vercel.json`); không cần biến môi trường (tuỳ chọn `LANDING_ORIGIN`, `WORKSPACE_URL`);
  - mở bản preview, quét QR bằng iPhone → phải mở bản mobile;
  - nếu dùng domain riêng: thêm vào project rồi đặt `LANDING_ORIGIN` và build lại để QR dùng domain đó.
  - Lưu ý: bản GitHub Pages vẫn là bản trước B4b, cần `npm run deploy`.

**W5 (03/10/2026): hoàn thiện Workspace; đã deploy production (PO đồng ý).**
- **Dọn dẹp:**
  - xoá `pages/ComingSoon.tsx` (không còn dùng);
  - xoá 42 branch local đã merge vào `main` (`git branch -d`, chỉ xoá được khi commit đã có trong `main`); giữ 3 branch chưa merge (`docs/build-plan`, `feat/c1-hosting-early`, `feat/t1-dynamic-auth`);
  - xoá thư mục tạm của các task trước và hai script devnet tạm.
- **Bundle:** `/new`, submit và review tải khi mở lần đầu (`React.lazy`), mỗi trang 7–21 KB.
  - Bundle đầu vẫn ~1.89 MB (494 KB gzip) vì gần hết là thư viện: Dynamic SDK là phần lớn nhất, sau đó react-dom, motion, react-router, web3.js, Anchor. Không bỏ được vì đăng nhập và đọc chain cần ngay từ đầu.
- **Bàn phím:**
  - thứ tự Tab hợp lý (skip link → logo → ví → breadcrumb → form), mọi điểm dừng đều có vòng focus;
  - bảng hợp đồng: dòng là `div role="row"`, tên hợp đồng là link phủ cả dòng (trước là `<a role="row">`, sai ARIA), mỗi hợp đồng một điểm Tab;
  - Escape hoặc bấm ra ngoài đóng panel; **sau khi xác nhận hoặc huỷ, focus quay lại đúng nút đã mở** (ví dụ "Release 0.50 USDC");
  - breadcrumb có gạch chân (link trong đoạn chữ không chỉ khác nhau bằng màu).
- **Reduce Motion:** khi bật, mọi phần tử hiện ngay (opacity 1, transform none) sau 40 ms điều hướng; CSS cũng tắt transition.
- **Layout shift:** trang submit và review đợi đọc xong key và note rồi mới vẽ (trước đây khối "Open the contract link" và "Does not match" chớp lên rồi mất, CLS 0.25 → 0.002).
- **CSP:** chuyển từ Report-Only sang **chặn thật**; thêm `Permissions-Policy` (tắt camera, mic, vị trí, payment).
  - Kiểm tra trên bản live (chế độ Report-Only) với `/`, `/sign-in`, `/c/…` và khi mở panel đăng nhập: chỉ có 1 vi phạm là `Function('')` của Zod (trong Dynamic SDK) để thử xem eval có được phép không. Nó tự bắt lỗi và chạy tiếp, nên chặn không ảnh hưởng.
  - Kiểm tra local với đúng header của `vercel.json` trên mọi trang: chỉ có vi phạm đó.
  - **Chưa kiểm được luồng đăng nhập Google + ký** dưới CSP chặn thật, vì Dynamic chỉ cho đăng nhập trên domain production. Nếu sau deploy đăng nhập hoặc ký lỗi, đổi lại `Content-Security-Policy-Report-Only` trong `vercel.json` (1 dòng) và gửi lỗi console để thêm host.
- **Lighthouse desktop** (build có header như Vercel + gzip, ví preview, Helius):

  | Trang | Performance | Accessibility | Best Practices |
  | --- | --- | --- | --- |
  | `/` | 100 | 100 | 96 |
  | `/new` | 100 | 100 | 96 |
  | `/contract/:fund/review` | 98 | 100 | 96 |

  - Best Practices 96 chỉ vì log vi phạm CSP của Zod ở trên.
  - Lần đầu review chỉ 87 (CLS 0.25), accessibility 96–99 (role sai trên dòng bảng, link breadcrumb, độ tương phản). Đã sửa hết.
- **README:** thêm mục "Workspace (ned-workspace): run, env, deploy" (lệnh chạy, tên biến môi trường, deploy Vercel, header, lưu ý domain của Dynamic).
- **Test:** workspace 10, core 96, wallet 25; `npm run build` OK; `tsc` app 0 lỗi.
- **Devnet:** một hợp đồng tạm `3LF5…` (0.5 USDC, own wallet) để đo trang review; đã release và đóng. Hợp đồng W4 `Ff9h…` còn milestone 2 (1 USDC) chờ hết hạn nộp, sau đó ai cũng refund được rồi đóng.
- **Production (03/10, sau khi PO đồng ý):** `main` = `986881f`, Vercel đã deploy.
  - `curl -I https://unihackfest-2026.vercel.app/new`: có `content-security-policy` (chặn thật), `permissions-policy`, `x-frame-options: DENY`, `referrer-policy: no-referrer`, `x-content-type-options: nosniff`.
  - Mở live dưới CSP chặn thật: Dynamic khởi động, nút "Continue with Google" bật, router invite giữ lại máy tính; **không có lỗi CSP hay lỗi console**.
- **Còn lại (cần PO):** chạy D1 end-to-end trên URL production (đăng nhập Google, tạo, accept, lock, submit, review, release), mở console xem có lỗi CSP không, rồi ghi kết quả vào đây. Nếu đăng nhập hoặc ký lỗi vì CSP: đổi tên header thành `Content-Security-Policy-Report-Only` trong `ned-workspace/vercel.json` rồi gửi lỗi console.

**W4 (03/10/2026): nộp và duyệt milestone trên Workspace (board WebSubmit, WebReview).**
- **Xác nhận trong wallet panel:** đã làm ở W3 (các dòng tóm tắt, ghi chú, Cancel/Confirm, vị trí cố định, backdrop fade, trả về lựa chọn của người dùng); W4 dùng lại cho submit và release.
  - **Dynamic có tự hiện xác nhận trên web không:** Workspace dùng SDK JS headless (`@dynamic-labs-sdk/client`), không có UI của Dynamic, nên panel của mình vẫn giữ nút Confirm. [Inference] Cần xác nhận lại trong lần chạy thật với Google.
- **`/contract/:fund/submit?i=`** (freelancer):
  - link có nhãn ("Figma · version 2214", "GitHub · commit 3f9a1c2"), chip "Fixed version", gợi ý khi link chưa cố định;
  - file: kéo thả hoặc chọn; băm SHA-256 bằng `crypto.subtle` ngay trên máy, **không upload**; từ chối file > 200 MB; file > 20 MB có thanh tiến trình; tối đa 10 file, không trùng;
  - note (đếm /500); tự kiểm "Done when" (chỉ trên máy); delivery fingerprint cập nhật trực tiếp (`deliveryEvidence` của core);
  - hạn nộp theo giờ chain + "How on-time is decided"; cảnh báo khi chưa tick hết. Không nhắc dispute vì P1 đang tắt;
  - Submit → xác nhận → `runSubmit` → màn "Submitted · in review" (giờ ghi nhận, On time, fingerprint, số tiền, Explorer);
  - Vietnam view chỉ hiện ≈ VND. Chưa có key thì hiện ô dán link hợp đồng.
- **`/contract/:fund/review?i=`** (client):
  - delivery: note, link mở bằng `rel="noopener noreferrer"`, file kèm fingerprint;
  - "On time / Late" so `submitted_at` với `submit_by`;
  - khối integrity: "Same delivery that was submitted ✓" (kèm giải thích nó **không** chứng minh nội dung sau link không đổi) hoặc "Does not match what was submitted"; hiện cả hai fingerprint;
  - **"Drop a file to compare":** cùng fingerprint → "Same file ✓"; cùng tên khác fingerprint → "Different file"; khác cả hai → "không có trong danh sách";
  - tick "Done when" trên máy, timeline (giờ tạo và giờ nộp lấy từ chain; accept và lock không có giờ trên chain), đếm ngược auto-release;
  - Release → xác nhận → `approve` → màn "Milestone N released" (số còn lock, milestone tiếp theo, Explorer);
  - **không có nút Dispute** (P1 tắt trong Workspace); client ở Vietnam view bị chặn (D18).
- **Core:** `milestone/links.ts` (`looksUnversioned`, `isFixedVersion`, `linkLabel`) dùng chung cho app và Workspace; app điện thoại bỏ bản copy trong `submit.tsx`.
- Link "Open delivery form / Review delivery" trên trang hợp đồng giờ kèm `?i=<milestone>`.
- **Test:** workspace **10** (+3: băm file, giới hạn, so file), core **96** (+2 links), wallet 25; `npm run build` OK; `tsc` app 0 lỗi.
- **Devnet** (script tạm đã xoá, 2 ví test, VND path), hợp đồng `Ff9h…NGnc` có 2 milestone kèm "Done when":
  - tạo, accept, lock bằng core;
  - trang submit (preview chỉ đọc, ví freelancer, Vietnam view): thêm 1 link cố định + 1 link chưa cố định (hiện gợi ý), 1 file 2.9 MB + 1 file 24.8 MB (có thanh tiến trình), tick 1/2; panel xác nhận đúng; chỉ hiện VND;
  - nộp 2 link + 1 file bằng core → trang review (ví client): **"Same delivery that was submitted ✓"**, On time, link có `noopener noreferrer`;
  - thả đúng file → **"Same file ✓"**; cùng tên khác nội dung → **"Different file"**; file lạ → "không có trong danh sách";
  - panel xác nhận release đúng; client ở Vietnam view bị chặn;
  - release milestone 1 bằng core → app điện thoại (preview, Vietnam view của freelancer) hiện **"Released to payout partner"**, ≈ VND, không có USDC.
  - Milestone 2 (1 USDC) vẫn đang lock, hạn nộp khoảng 19:57 ngày 3/10; sau hạn có thể refund rồi đóng hợp đồng.
- **Chưa test tay (cần chủ dự án):** chạy thật với Google: Vinh mở link trên laptop, nộp 2 link + 1 file → Mia duyệt trên laptop → thử cùng file / file khác → release → iPhone của Vinh hiện Released ở Vietnam view (cần `npm run deploy` cho GitHub Pages trước).
- **Ghi chú:** `pages/ComingSoon.tsx` không còn được dùng; chưa xoá (theo luật hỏi trước khi xoá file). Bản build local dùng RPC public nên hay gặp 429; bản Vercel dùng Helius.

**W3 (03/10/2026): trình soạn brief `/new` trên Workspace (board WebContractNew).**
- **Freelancer:**
  - nhập @username hoặc địa chỉ ví → bấm **Find**, luôn đọc on-chain mới (`createIdentityResolver` của core + `dualPda`, cache theo tab);
  - không tự chọn chính mình;
  - Workspace không nhận số điện thoại hay `.sol` (`resolve.ts` của app vẫn chỉ dùng cho mobile).
- **The job:** tiêu đề có bộ đếm byte /32 (tô vàng khi đầy, đỏ khi vượt), scope, references (chỉ `https://`, tối đa 5, không trùng).
- **Milestone cards:**
  - tên, số tiền, **Submit by** (`datetime-local`, giờ máy), review time có **"1 min (devnet demo)"** / 3 / 7 ngày;
  - danh sách **"Done when…"** thêm/xoá, tối đa 6, không trùng; thêm/xoá milestone (tối đa 5).
- **Kiểm tra:** giống hệt app điện thoại (`validateDraft` + `validateBrief` + giới hạn B1), gom trong `lib/newContract.ts` (có test).
  - Nút Create bị đánh dấu `aria-disabled`; bấm vào thì hiện lý do đầu tiên.
- **Cột tóm tắt:** tổng cần lock, từng milestone, **brief fingerprint** cập nhật khi gõ (`briefHash` của core), danh sách "Checked before you sign".
- **Create:**
  - **wallet panel chuyển sang trạng thái xác nhận** (theo board WebWalletPanel, chế độ sign): hợp đồng, freelancer, số milestone + tổng, fingerprint, phí mạng, **rent tài khoản** (đọc từ chain, ~0.0059 SOL, trả lại khi đóng), N.E.D fee "None during the pilot", ghi chú, Cancel/Create;
  - có backdrop; panel cố định trên màn hình khi trang đã cuộn; Escape, bấm ra ngoài hoặc đóng panel đều tính là Cancel;
  - sau đó gọi `runCreate` của core.
- **Created:** link mời (Copy link), **QR để mở trên điện thoại**, fingerprint, "Next", View contract.
  - Link mời dùng origin Workspace production (`DEFAULT_WORKSPACE_ORIGIN`), kể cả từ preview hay localhost, để điện thoại đi qua router `/c/:fund`.
- **Vietnam view:** khối "New contracts come from your clients" + Share @username (D18).
- **Motion:**
  - thêm/xoá milestone, "Done when" và reference dùng layout animation (`layout="position"`, chỉ transform + opacity);
  - chuyển trạng thái editor → created mất 320 ms.
  - `LazyMotion` chuyển từ `domAnimation` sang `domMax` để có layout animation.
- Nút "New contract" trong wallet panel giờ mở `/new` trên Workspace, thay vì app điện thoại.
- **Khác prompt / board:**
  - trạng thái xác nhận của wallet panel vốn thuộc W4, nhưng W3 cần nó nên làm luôn; W4 chỉ cần dùng lại `confirm()`;
  - board có câu "at least one done-when item per milestone", nhưng core và app điện thoại không bắt buộc. Theo prompt ("validation identical to mobile") nên **không** bắt buộc và bỏ câu đó khỏi danh sách luật. Nếu muốn bắt buộc thì sửa `validateBrief` trong core để cả hai app cùng đổi;
  - tên hiển thị "Vinh Nguyen" trên board không có trong N.E.D: chỉ có @username + ví.
- **Test:** workspace **7/7** (+4 cho form), core 94; `npm run build` (tsc + vite) OK; `tsc` app điện thoại 0 lỗi.
- **Kiểm tra trên Chromium 1440×900** (preview chỉ đọc `?previewWallet=`, `VITE_DEV_TOOLS=1`):
  - điền đủ 2 milestone với "Done when", fingerprint đổi khi gõ;
  - bấm Create khi thiếu → "Choose the freelancer first.";
  - panel xác nhận hiện đúng các dòng; Escape hủy; Confirm ở preview báo lỗi vì không ký được (đúng);
  - Vietnam view hiện khối chặn; trạng thái created xem qua `?previewCreated` (chỉ có trong bản dev, đã kiểm tra bản build thường không có);
  - không có lỗi console.
- **Chưa test (cần chủ dự án):**
  - tạo hợp đồng 2 milestone có "Done when" trên devnet **từ bản preview Vercel** (cần đăng nhập Google thật);
  - mở link mời trên iPhone → app hiện brief và "Brief matches ✓".
  - Lưu ý: bản GitHub Pages cần `npm run deploy` (bản đang chạy là trước B4b).

**C1 (03/10/2026): đóng theo D20, chỉ làm phần mobile.**
- Prompt C1 cũ (build app Expo lên Vercel, route `/workspace`, `vercel.json` trong `ned-wallet`) **trái với D20**: `ned-wallet` chỉ là app điện thoại. PO chọn đóng C1 phía mobile (03/10).
- Phần C1 cần đã có trong `ned-workspace`: header bảo mật trong `vercel.json` (W1, CSP vẫn Report-Only tới W5) và router `/c/:fund` (W2).
- **Đã sửa:**
  - link mời từ app mặc định đi qua Workspace production (`DEFAULT_WORKSPACE_ORIGIN` trong `@ned/core`). Trước đây `.env` local không có `EXPO_PUBLIC_WORKSPACE_ORIGIN`, nên bản GitHub Pages tạo link thẳng về mobile, bỏ qua router. Đặt biến này thành `""` để tắt bước qua Workspace;
  - `routeInvite()` bỏ TODO: bản mobile luôn tự xử lý invite; `constants/hosts.ts` ghi rõ vì sao không cần `isWorkspaceHost()`;
  - build-plan C1 và prompts-build mục 9 ghi "đã đóng".
- **Test:** wallet **25** (+1: link mời mặc định đi qua `https://unihackfest-2026.vercel.app/c/<fund>#k=…`), core 94; `tsc` 0 lỗi; `expo export --platform web` OK, bundle có origin Workspace.
- **Kiểm tra:**
  - Router Workspace live (fund và key giả): rộng 390 → `tdat10052499.github.io/Unihackfest-2026/c/<fund>#k=…`, giữ nguyên fragment; rộng 1440 → ở lại Workspace;
  - bản mobile mới serve local dưới `/Unihackfest-2026`: `/contracts/<fund>` và `/c/<fund>#k=…` đều trả 200 và tải được; khi chưa đăng nhập thì về `/welcome`, invite được lưu chờ.
- **Vấn đề:** bản GitHub Pages đang chạy là bản **trước B4b**, chưa có route `/c/…`, nên link từ Workspace sang điện thoại đang rơi về `/`. Cần `npm run deploy` (chờ PO đồng ý).

**B5 (03/10/2026): Records và thông báo hợp đồng.**
- **`/records`** (board Records / RecordsIntl):
  - nhóm theo tháng; Vietnam view hiện **≈ VND** (dòng phụ "$x · estimate", tổng "(estimate) · $x · rate of 2 Oct 2026"), international view hiện USDC;
  - mỗi dòng: "tên việc · Milestone N", ngày, "from @client", chip "Released to payout partner" / "Released", link **Explorer tới đúng giao dịch release**;
  - **Export CSV** (web tải file, native mở share sheet): ngày UTC, contract, milestone, title, ví client, USDC, VND ước tính, tỷ giá, ngày tỷ giá, nơi nhận, link giao dịch;
  - câu "Not tax advice", chú thích tỷ giá + payout partner giả lập, badge Devnet, link Disclosures; trạng thái rỗng có mascot.
- **Nguồn dữ liệu** (`@ned/core` `records.ts`, cache `@ned_records_v1:<wallet>`):
  - hợp đồng còn mở: khi thấy milestone đã release thì đọc giao dịch của hợp đồng để lấy ngày, chữ ký giao dịch và số tiền;
  - **lịch sử ví của freelancer**: freelancer ký `accept`, nên từ chữ ký của ví tìm được mọi hợp đồng đã tham gia, **kể cả hợp đồng đã đóng ở máy khác**. Mỗi hợp đồng đã đóng chỉ đọc một lần. Đọc được cả hợp đồng v1 cũ (tên lấy thủ công từ `create_fund`).
  - **Khác spec cũ** (refactor-plan PR6 chỉ có hợp đồng mở + cache, chấp nhận mất bản ghi): đã sửa PR6 trong cùng branch.
  - Lần quét đầu đọc 100 chữ ký mới nhất của ví (~13 giây trên devnet với Helius), sau đó chỉ đọc chữ ký mới; gặp 429 thì thử lại.
- **Thông báo** (`hooks/useContractWatch.ts`, gắn trong `GlobalNotificationManager`):
  - so sánh mỗi lần đọc hợp đồng với lần trước lưu trên máy (`@ned_contract_seen_v1:<wallet>`); lần đầu không báo gì;
  - chỉ báo việc **bên kia** làm: hợp đồng mới và lock → freelancer; submit → client; release → freelancer;
  - qua `useNotificationStore.addNotification` (tự bật banner); loại mới `CONTRACT` có `route`, bấm banner hoặc dòng thông báo mở thẳng trang hợp đồng;
  - nội dung chỉ dùng dữ liệu on-chain (tên việc, số tiền, hạn review): **không có key, không có brief, không có tên milestone**. Có test kiểm tra không có từ cấm.
  - release cũng cập nhật cache Records.
- **Test:** core **94/94** (+8: records, events), wallet **24** (+1 notices), workspace 3; `tsc` app + workspace 0 lỗi; `expo export --platform web` OK.
- **Devnet (chỉ đọc, không tốn SOL):** Records của freelancer test hiện **8 lần release**, trên cùng là hợp đồng B4b `85qN…1Tuo` (1.00 USDC → payout partner, 3 Oct), dù hợp đồng này đã đóng trước khi app thấy. Chụp Chromium 390×844 cả hai view, không chữ bị cắt, không lỗi; CSV tải về đúng; lần mở sau hiện ngay từ cache. Ví client test: trạng thái rỗng.
- **Chưa test tay (cần chủ dự án):** thông báo cần đăng nhập thật (preview dev không chạy `GlobalNotificationManager` với ví preview):
  - mở app bằng hai tài khoản; Mia tạo hợp đồng → Vinh thấy "New contract from …";
  - Mia lock → Vinh thấy "Locked · you can start"; Vinh submit → Mia thấy "Milestone 1 submitted";
  - Mia release → Vinh thấy "Milestone 1 released" và dòng mới trong Records.
- **Vấn đề mới:**
  - thông báo on-chain cũ của `useNotificationStore` vẫn bằng tiếng Việt ("Nhận tiền thành công") và còn ghi phí cố định; chưa sửa (ngoài phạm vi B5);
  - `useContractWatch` cũng poll 8 giây, nên khi đang mở màn hợp đồng sẽ có hai lần đọc song song.

**B4b (03/10/2026): tạo hợp đồng, nộp, duyệt, link mời trên app.**
- **`/contracts/new`** (3 bước, một màn):
  - bước 1: freelancer qua `resolveRecipient(…, { fresh: true })`, không cho chọn chính ví mình;
  - bước 2: tên việc (đếm byte /32), scope, references, tối đa 5 milestone; mỗi milestone có tên, số tiền, hạn nộp, thời gian review và danh sách "Done when"; giới hạn lấy từ `LIMITS` trong content.ts, kiểm tra bằng `validateDraft` + `validateBrief`;
  - bước 3: tóm tắt, phí liệt kê từng dòng, **brief fingerprint**, "What happens next", slide to create;
  - màn Created: **QR** (`react-native-qrcode-svg`) + Copy contract link + View contract.
  - Vietnam view: "Not available in the Vietnam view" (D18).
  - **Khác prompt:** hạn nộp chọn theo mốc (10 min demo / 1 / 3 / 7 / 14 ngày) cộng vào giờ chain, không dùng date picker; review 1 min (demo) / 3 / 7 ngày.
- **Submit** (`/contracts/[fund]/submit?i=`):
  - link (gợi ý dùng phiên bản cố định: Figma có version-id, Git commit / tree/<sha> / blob/<sha>; `looksUnversioned()` cảnh báo link chưa cố định);
  - note; tự kiểm "Done when" (chỉ trên máy, không lên chain); delivery fingerprint cập nhật trực tiếp; hạn theo giờ chain;
  - slide to submit (tắt nếu không có key); màn kết quả "Submitted · in review" + Explorer.
- **Review** (`/contracts/[fund]/review?i=`):
  - chip "On time"/"Late" từ `submitted_at`; đếm ngược auto-release theo giờ chain;
  - "Same delivery that was submitted ✓" / "Does not match what was submitted" (kèm giải thích: chứng minh note khớp evidence trên chain, **không** chứng minh nội dung trong link không đổi); không có key → hướng dẫn mở link;
  - tick "Done when" trên máy, phí, slide to release, màn Released có biên nhận + Explorer; nút Dispute chỉ khi `FEATURES.dispute`.
  - **Khác prompt:** Submit và Review là route riêng (trượt lên như sheet), không phải bottom sheet, để giữ được trạng thái khi tải lại.
- **`/c/[fund]`** (route mời):
  - gọi `routeInvite()` trước (hiện luôn trả `here`, có TODO(C1) cho chuyển host hẹp/rộng);
  - fund sai → về `/`; đã đăng nhập → nhập key, xoá fragment (`history.replaceState` trên web), vào `/contracts/[fund]`;
  - chưa đăng nhập → lưu tạm invite (`@ned_pending_invite_v1`, hết hạn 1 ngày), vào `/welcome`; `PendingInviteGate` trong `_layout` nhập key sau khi đăng nhập.
  - key K không xuất hiện trong log, thông báo hay lỗi.
- **Test:** core **86/86**, wallet **23** (+2 test invite), workspace 3; `tsc` app + workspace 0 lỗi; `expo export --platform web` OK.
- **Devnet:** script tạm (đã xoá), VND path, 1 milestone, hợp đồng `85qN…1Tuo`; chụp Chromium 390×844, không chữ bị cắt, không lỗi:
  - client: new (3 bước); freelancer: submit (gợi ý link cố định hiện đúng);
  - sau khi nộp: client review hiện **"Same delivery that was submitted ✓"** và "On time";
  - client chi tiết **không có key**: hiện thông báo mở link, nút "Approve milestone 1" vẫn còn;
  - `/c/<fund>#k=…` khi chưa đăng nhập: về `/welcome`, fragment đã xoá, invite đã lưu, key không có trong console;
  - sau đó approve + close. Client test còn **10 USDC**.
- **Chưa test tay (cần chủ dự án):** chu trình hai trình duyệt thật (Mia tạo trên desktop → gửi link/QR → Vinh mở trên iPhone, accept VND → Mia lock → Vinh submit → Mia review + release).

**W2 (03/10/2026): Workspace Overview, trang hợp đồng, router invite.**
- **Hook** (`ned-workspace/src/hooks`):
  - `useFunds`, `useFund`, `useChainTime`, `useRegion`, `useContractContent` (lớp mỏng trên `@ned/core`);
  - key hợp đồng lưu trong `localStorage` theo ví (`@ned_contract_keys_v1:<wallet>`, cùng định dạng với điện thoại).
- **`/` Overview** theo board WebWorkspace:
  - menu bên (Overview, Contracts, New contract chỉ ở international view, Records / Settings mở app điện thoại);
  - lời chào + nút chính (Vietnam view: "Share @user" sao chép tên; ngược lại "New contract");
  - 3 thẻ số liệu; thẻ Needs your action có chip thời hạn và nút; bảng hợp đồng (cuộn ngang khi hẹp).
  - Vietnam view chỉ ≈ VND, không có "New contract".
  - `/contracts` hiện toàn bộ bảng.
- **`/contract/:fund`** (chỉ đọc):
  - trạng thái, bên kia, số tiền theo chế độ xem, nơi nhận tiền (+SIMULATED), link vault trên Explorer;
  - brief: `ok` / `mismatch` / `noKey` / `missing`, có ô "Paste the contract link" nhận link đầy đủ hoặc `#k=…`; link của hợp đồng khác bị từ chối;
  - milestone có tên và tiêu chí từ brief, đếm ngược theo giờ chain, delivery (khớp ✓);
  - bước tiếp theo theo vai trò: submit → `/contract/:fund/submit`, review → `/review`. Hai trang này và `/new` là màn tạm cho W3/W4.
- **`/c/:fund`** nằm ngoài layout, nên quyết định **trước** khi chạm vào key:
  - màn hình < 900 px → `location.replace(MOBILE_ORIGIN + '/c/' + fund + hash)`, giữ nguyên `#k=`;
  - máy tính đã đăng nhập → import key cho ví này, xoá fragment bằng `history.replaceState`, mở `/contract/:fund`;
  - chưa đăng nhập → giữ invite trong `sessionStorage` của tab, xoá fragment, đăng nhập rồi import (`PendingInvite`).
  - Phần quyết định là hàm thuần `decideInvite`, có 3 test node; `npm test` ở gốc giờ chạy cả test workspace.
- **Motion:** đổi trang bằng `AnimatePresence` (mờ dần 200 ms, thoát 70 %); mỗi trang nâng 5 khối đầu, cách 40 ms.
- **Preview cho dev:** `?previewWallet=<địa chỉ>` chỉ đọc, chỉ có trong bản build có `VITE_DEV_TOOLS=1`; bản build thường không chứa đoạn code này (đã kiểm tra bundle).
- **Test:**
  - core 84, wallet 21, workspace 3, tất cả pass; `tsc` và `vite build` OK.
  - Chromium với một hợp đồng devnet tạm (tạo từ ví client test, có brief, sau đó đã đóng), tất cả đạt:
    - điện thoại → GitHub Pages `/c/<fund>` giữ đúng `#k=`;
    - máy tính chưa đăng nhập → `/sign-in`, fragment đã xoá, invite chờ;
    - máy tính đã đăng nhập (client) → `/contract/<fund>`, fragment đã xoá, key đã lưu cho ví, "Brief matches ✓";
    - freelancer chưa có key → `noKey`; dán link hợp đồng khác → bị từ chối; dán `#k=` → mở brief;
    - Overview: international view có hợp đồng; Vietnam view chỉ VND, không có link hay nút "New contract".
- **Cần chủ dự án:**
  - test trên Vercel với tài khoản thật Mia và Vinh;
  - deploy lại Vercel (tự động từ `main`);
  - đặt `EXPO_PUBLIC_WORKSPACE_ORIGIN=https://unihackfest-2026.vercel.app` khi build GitHub Pages, để link mời của app điện thoại đi qua router này.
  - App điện thoại **chưa có route `/c/[fund]`** (B4b), nên link mở trên iPhone sẽ tới trang "not found" của bản mobile, `#k=` vẫn còn nguyên.

**B3 (03/10/2026): điều hướng, onboarding, Home, Settings.**
- **Điều hướng:** thanh dưới màu trắng Home · Contracts · Records · Settings (theo board).
  - `/contracts`: danh sách đơn giản, B4 làm lại;
  - `/records`: tạm dùng màn History, B5 làm lại;
  - `/contracts/new`: màn tạm "Coming in the next build", vì tạo hợp đồng là việc của B4;
  - `/swap`, `/xstocks` chuyển về Home; `/mode` chuyển sang `/residence`.
- **Onboarding:** welcome → setup → (fund) → **consent** → profile (có avatar) → **residence** → home.
  - Consent không tick sẵn, lưu log theo ví (`@ned_consent_v1`).
  - Đã bỏ cầu nối N11.
  - Chữ Welcome theo board, bỏ "invest" và "Send money with a phone number".
- **Avatar:** thuật toán ở `@ned/core/avatar`, app gọi qua `services/avatar`. Test `services/avatar/__tests__` so với **kết quả chạy chính code của board Avatar** trên 5 seed (3 ví demo + 2 tên). Component `components/Avatar` vẽ bằng react-native-svg; seed là địa chỉ ví.
- **Home** (board HomeVN / HomeIntl):
  - lời chào theo giờ + tên, badge Devnet, avatar dẫn tới Settings;
  - **Vietnam view:** cờ VN, "Locked for you ≈ VND", "Released to you", ô Share @user / Records, **không bao giờ đọc hay hiện số dư USDC**;
  - **international view:** cờ US, số dư USDC, ô New contract / Receive / Send, "Locked in your contracts" / "Locked for you";
  - Needs your action, Your contracts, Suggested for you, sheet chia sẻ @username.
- **Settings:** công tắc "I live in Vietnam" (đổi chế độ xem, có thông báo), Display currency, Consent (xem / rút lại; rút lại thì đăng xuất), Disclosures, phiên bản + badge Devnet, Sign out.
  - Hộp xác nhận đăng xuất là `Sheet`: `Alert` có nút không chạy trên web, nên trước đây Sign out trên web không làm gì.
- **Disclosures:** theo board, thêm dòng D15 về invite link.
- **Sửa chữ** (refactor-plan PR4): `receive.tsx` (không dùng "pay"), `fund.tsx` (không dùng "free"), `SendFlow.tsx` (không dùng "You pay", bỏ chữ "Cash"), lỗi "Not enough devnet SOL to cover setup".
- **Primitive:** `Button` sửa theo board Main: pill, Inter 600, phẳng, disabled `#E6E6EB`. `useFunds` trả thêm `raw`.
- **Preview cho dev:** `/dev/home-preview?wallet=…&view=vn|intl` chỉ đọc, chỉ khi `devTools`, để chụp Home với dữ liệu thật mà không cần đăng nhập.
- **Test:**
  - core 84/84, wallet **21/21** (thêm 2 test avatar); `tsc` app + workspace 0 lỗi; `expo export --platform web` OK.
  - Chromium 390×844: welcome, consent, profile, residence, settings, disclosures, contracts, new contract, records không có chữ bị cắt và không lỗi; `/swap` → `/`, `/xstocks` → `/`, `/mode` → `/residence`.
  - Ảnh **hai chế độ Home** chụp với một hợp đồng thật trên devnet: chạy `milestone:devnet --refund`, chụp lúc hợp đồng đang Locked. Client ở international view: số dư 10,00 USDC, khoá 2,00 USDC. Freelancer ở Vietnam view: ≈ 52 000 VND, "Submit milestone 1". Smoke run PASS ×2, fund đã refund và đóng; client vẫn 12 USDC.
- **Lệch so với board / prompt:**
  - "Received this month" thành "Released to you", vì chain không lưu ngày release (giống W1).
  - Display currency đi theo chế độ xem (chỉ hiển thị), không có radio riêng.
  - Bỏ công tắc Notifications cho tới B5, vì chưa có cài đặt thông báo thật.
  - Link chia sẻ "ned.app/@user" thành sao chép `@username`, vì chưa có domain đó.
  - Dòng "Public on-chain" ở Disclosures đổi thành "the brief and the delivery are stored encrypted on Solana", vì từ B1 điều đó là sự thật. **Cần compliance lead duyệt.**
  - Consent: app không có tên Google (Dynamic chỉ trả email), nên dòng "Google account name" hiện "From Google".
- **Chưa test tay (cần chủ dự án):** checklist N11 với đăng nhập Google thật (đăng nhập, người cũ, người mới tới Home, Send). Phần không cần đăng nhập đã kiểm tra trong Chromium như trên.

**B2 (03/10/2026): giao diện sáng, bỏ viền, motion.**
- **`constants/design.ts`:**
  - `palette`: ground `#F4F4F6`, card `#FFFFFF`, ink `#111116`, caption `#5E5E6A`, accent `#7B2FBE`, link `#6A22B0`, tint `#F2EAFB`, divider `#F0F0F3`;
  - `status` (tint nền / chữ / chấm); `shadows.s1`, `sAccent`, `pop`, `focusHalo`;
  - `elevation` theo nền tảng: web `boxShadow`, iOS shadow props, Android `elevation`.
  - Các tên cũ của theme tối (`surface1–3`, `glass.*`, `light.*`, `home.*`, `gradients.screen`, `orbs`) vẫn giữ làm alias **deprecated** với giá trị sáng, nên các màn hình tự đổi sang nền sáng mà không phải vẽ lại.
  - `textTertiary` dùng màu caption (không dùng muted) để giữ độ tương phản 4.5:1.
- **`constants/motion.ts`:**
  - bảng token MotionSurfaces: press 160, hover 200, enter 200 + 360, stagger 40 ms tối đa 5, state 320, popover 200, sheet 360, backdrop 220, focus 180;
  - đường cong (0.2,0,0,1) và (0.16,1,0.3,1); `useMotion()` cho Reduce Motion.
- **`components/design`:**
  - Card, ListGroup/ListRow, Badge, Notice, IconButton bỏ viền, chỉ dùng tông màu + S1; divider chỉ nằm giữa các hàng;
  - Button, hàng bấm được, card, icon button thu nhỏ 0.98 trong 160 ms (`PressableScale`, CSS transition của Reanimated 4);
  - nội dung `Screen` hiện dần + nâng 10 px, cách nhau 40 ms;
  - primitive mới: `Field` (nền đặc, halo khi focus chỉ đổi opacity, lỗi tô nền đỏ, `on="ground"` khi đặt thẳng trên nền màn), `Sheet` (SlideInDown + backdrop fade), `Popover`.
  - `grep borderWidth|border:` trong `components/design`: không còn dòng nào, kể cả switch.
- **Khác prompt:** hiệu ứng vào màn của `Screen` dùng **keyframe CSS của Reanimated 4**, không dùng layout animation `FadeInDown`. Trên web, `entering` để lại `position: absolute` cho nội dung, khiến ScrollView mất chiều cao (Settings không cuộn được). Sheet, backdrop và popover vẫn dùng `SlideInDown` / `FadeIn`.
- **Test:**
  - core 84/84, wallet 19/19; `tsc` app và workspace 0 lỗi; `expo export --platform web` OK.
  - Bundle JS web (có `EXPO_PUBLIC_DEV_TOOLS=1`): 10 666 839 → 10 677 081 byte (+10 KB); gzip 1 995 593 → 1 999 009 (+3,4 KB).
  - Ảnh Chromium 390×844 (Home, Settings, `/dev/milestone`, Welcome): không có chữ bị cắt. Đã kiểm tra Settings cuộn tới cuối, nút Sign out không bị thanh tab che.
  - Kiểm tra trong trình duyệt: enter 360 ms với delay 0/40/80/120/160; press scale 0,98 trong 160 ms; Reduce Motion thì không có animation và press tức thì.
- **Còn mở (màn hình, B3/B4):**
  - Home vẫn là bố cục cũ, chỉ đổi sang nền sáng;
  - chữ cũ còn từ cấm: Welcome "invest", Settings "Your wallet stays safe";
  - `NotificationInAppBanner` còn màu riêng (B5);
  - ảnh chụp không đăng nhập vì Google login cần người thật.

**B1 (03/10/2026): content layer.**
- **Core (`packages/ned-core/src/milestone/`):**
  - `content.ts`: JSON chuẩn (canonical) cho brief và delivery; giới hạn theo build-plan; `briefHash`, `deliveryEvidence`.
  - `keys.ts`:
    - key `K` 32 byte cho mỗi hợp đồng, lưu theo ví qua adapter (AsyncStorage trên điện thoại, localStorage trên Workspace);
    - `inviteLink` (`…/c/<fund>#k=…`); `parseInvite` / `importKeyFromFragment`.
  - `notes.ts`:
    - mã hoá XChaCha20-Poly1305; AD = fund ‖ kind ‖ milestone ‖ setId ‖ part ‖ parts;
    - mỗi part tối đa 900 byte (855 byte nội dung);
    - `fetchNotes` bỏ qua giao dịch lỗi và instruction của fund khác;
    - `readContractContent` chỉ nhận bộ note có hash trùng hash on-chain, kiểm tra author (client cho brief, freelancer cho delivery).
  - `client.ts` / `actions.ts`:
    - create = `create_fund` + giao dịch brief note;
    - `postBrief` để gửi lại brief nếu bước note thất bại;
    - accept dùng hash của brief đã giải mã và hiển thị;
    - submit nhận `DeliveryDraft`, note đi chung giao dịch submit.
  - Bỏ `temporaryBriefHash` của A2.
- **App (`ned-wallet`):**
  - `constants/hosts.ts`, `services/milestone/keyStore.ts` (AsyncStorage);
  - `hooks/useContractContent.ts`; `useMilestoneActions` có `create(draft + brief)` (trả về `inviteLink`), `postBrief`, `accept`, `submit(index, delivery)`;
  - harness `/dev/milestone` có ô scope, link delivery, dán link hợp đồng, xem brief và delivery.
  - `.env.example` thêm `EXPO_PUBLIC_MOBILE_ORIGIN` / `EXPO_PUBLIC_WORKSPACE_ORIGIN`. `WORKSPACE_ORIGIN` để trống cho tới khi Workspace có router `/c/:fund` (W2).
- **Phụ thuộc mới:** `@noble/ciphers` ^2.4.0 (đã được duyệt trong prompt B1), thêm vào core (peer), `ned-wallet`, `ned-workspace`.
- **Test:**
  - core **84/84** (thêm 9 test B1: thứ tự canonical, vector hash, giới hạn, mã hoá/giải mã, sửa byte / sai key / chuyển part, tách part 899/900/901, invite link, kích thước giao dịch, note lỗi / của người lạ / bộ thứ hai không khớp);
  - `ned-wallet` 19/19; `tsc` (app, scripts, workspace) 0 lỗi; `expo export --platform web` OK; `vite build` OK.
- **Devnet (smoke script dùng đúng code core như harness):**
  - fund `6veAy5aT8nHdzdjLQs1aJerNCPnEfw5ARHaGnT6KF2kv`, PASS;
  - đọc lại brief được (`ok`); không có key thì `noKey`; accept bằng hash của brief đã đọc;
  - delivery 2 link đi chung giao dịch submit, client thấy "matches"; đã đóng fund.
  - Kích thước giao dịch: `create_fund` 483 B, brief note 601 B, accept 308 B, submit + note 496 B; submit + một part 900 byte đầy = 1 166 B, vẫn ≤ 1 232.
  - Chữ ký ví: create 2 (1 + số part brief), accept 1, submit 1. CU `post_note` ≈ 4 629.
- **Chưa làm:**
  - chạy harness trong app với hai tài khoản Google thật (cần chủ dự án);
  - route `/c/[fund]` trên điện thoại (B4b) và trên Workspace (W2);
  - Disclosures phải nói rõ "ai có link đều đọc được brief" (product-spec 5.1).

**A2 (03/10/2026): program v1.1 đã lên devnet.**
- **G4:** trên devnet không còn fund 708 byte nào (program có 17 account, đều là identity), nên không phải đóng gì.
- **Extend:** +13 184 byte, data length 475 280 → **488 464 byte**, tốn 0,0670 SOL. Chữ ký `2S2HEbJazRZyMU9GjjQrwcWaokFfPuBEsY6sFpez8662yrTaf9KYYjddU6u3R848zAmH7W28PfK4jzeygNhC32rC` (slot 507005135).
- **Upgrade:** chữ ký `5k1jLkf6PCb7XegoNCdbJzzvBqhcsTVfBqF5w7uSXrJa7tWe5EAUMZk3qTLsyvSHUvd8tbk9Fmb18sw78cXgcgWH` (slot 507005500). SHA-256 của bản dump on-chain trùng file build (`d9c4d508…3a3017`). Không còn buffer sót lại.
- **IDL:**
  - dùng `program-metadata` (create-buffer → so buffer với file local → simulate → update `--close-buffer`), không dùng `anchor idl upgrade` vì lệnh này từng lỗi;
  - chữ ký `3oACniePnuo6nBUTtN5NEQh54huPQ8VgjEc3qKijZg5KzhRyRbpNKGJvLdByCeQko5aKHz1otR94RhzZuAAbr2vv`;
  - metadata `AMX7B6…` 6 329 → 6 900 byte, 18 instruction, trùng `target/idl/ned_program.json`.
- **Ví deploy:** 7,197 → 7,124 SOL.
- **Core (`packages/ned-core`, W0 đã chuyển từ `ned-wallet/services/milestone/`):**
  - IDL v1.1 (json + ts);
  - `FUND_SIZE 740`, `OFFSET_BRIEF_HASH 676`, `NOTE_MAX_LEN 900`, `NOTE_MAX_PARTS 8`; `decodeFund` đọc `briefHash`;
  - `buildCreateFund({ briefHash })`: **tạm thời** mặc định SHA-256 của tiêu đề (`temporaryBriefHash`) cho tới B1;
  - `buildAccept({ expectedBriefHash })`: **tạm thời** `actions.ts` truyền giá trị của chính fund, smoke script truyền hash của tiêu đề; B1 phải đổi thành hash của brief đã giải mã mà freelancer đọc;
  - `buildSubmit` từ chối evidence toàn số 0.
- **Test:**
  - core 75/75 (74 cũ + 1 test brief hash), `ned-wallet` 19/19; `npx tsc --noEmit` (app và scripts) 0 lỗi; `npx expo export --platform web` OK; `ned-workspace` tsc OK;
  - `cargo test` 42/42;
  - test IDL coder `chain/__tests__/idl.test.ts` vẫn dùng IDL nháp N2 (bản v1, cố ý giữ nguyên).
- **Smoke devnet (`npm run milestone:devnet`), cả 3 lần PASS, fund version 2, brief hash đã lưu:**
  - VND #1: fund `CX8q8wTrTf1E1ExjreGFzsZamRrbLmKouNJteCYMUrBi`, partner nhận 2 USDC;
  - VND #2: fund `FeRjiRymT8nqqigg2hjE5nkMa8zoWDWMSYEnp4hXRQUs`, partner nhận 2 USDC;
  - `--refund`: fund `8zEWdLvEWVmxGue5hLd8QxR6io7f4Ep5Vr3a2eEGvNv3`, client nhận lại 2 USDC;
  - các fund đều đã đóng. Client test còn 14 USDC, partner giữ 4 USDC (có thể dùng `recycle:demo-usdc`).
- **Lưu ý:** bản web đang chạy (GitHub Pages, Vercel) được build với IDL v1, nên tạo hoặc nhận hợp đồng trên đó sẽ lỗi cho tới khi build lại từ `main`.

**A1 (03/10/2026):**
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
- **Kích thước `.so`:** 488 464 byte, lớn hơn 475 280 byte đang cấp phát nên A2 **phải `solana program extend`** thêm ≥ 13 184 byte. A2 đã extend: thực tế tốn 0,0670 SOL (ước tính 0,092 SOL ở A1 bị sai).
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
| Program | `8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh`, **v1.4** (V3, 07/10), data length **688.464 byte** (extend +20.000 B), `.so` 683.040 B (SHA-256 `4f5a8ceb…3aa5`), authority `FSyUz7Kfy58vDosLPMqtVYzbcsCfCyrPiDWc65kY6QuQ` |
| Upgrade v1.4 (V3) | `4u1Gcc2vfDbQB4PiKgj2bfNrKCfTCaWb2kvz92VwjB7E5y2vSrtvpcVrHz1tKdv2mGwBF8xVe95s9J9XQnjSEdwg` (07/10 13:19 UTC); extend `2eYyziZt4QjmemNPNv9t5L3QW5k6bG77kSoNXGudRsFn7e8RmSQeCfFqW8ZZkNcdtdTa4hJfvzrwR1SSW84jWBBK` |
| Deploy N6 (P0) | `2bDxqhioVtTekVmMiHa4GQtLyCmV3GDttkT2WwQc3uLW69DPyXYBYAu3ifihbSLigi1xRBkkLZyfuRDkapk5QxUq` (extend 231 360 → 420 000) |
| Deploy N7 (P1) | `eokWJZ1oius7q234LLWXNoR1sqSHFWnVK8TfuJkWqYyER3MZNCC2M3YYJkJ1Ax3iY8m7z7unCstrzW36nLFLLpy` (extend → 475 280) |
| Deploy N12 (partner thật) | `2PvXW7PwD1jCgy14zTjjhCN1zZ2edC6kUJQZgrrbrXRcdSNjU4NcL4vUFKmxqRxnNt4N6Zi1G9uY9anKn6BqJu1L` (slot 506891469) |
| IDL on-chain | Metadata `AMX7B6rjAhcdKzZ8N2Xw3uDcjCRrGonWuXxJ5DMiKK8H`, **v1.4: 29 instruction / 55 lỗi / 26 event**, update `2AsdDUbnd74AxzjUDnVL4usVQBbspZ3DB2v3dwBaRZ3HrkNcdKAgEbocCgE9XDDEB2tvtiTyAcAmSauoFwMnuCC7` (07/10 15:16 UTC); fetch lại = `target/idl/ned_program.json` = `packages/ned-core/src/idl/ned_program.json` (`ned-wallet/idl/` là shim re-export core) |
| Smoke v1.4 (V4, `npm run jobs:smoke`) | Ví tạm business `4b1dLk99mm54gBUdbpGYsYed1FuKToV8ayeQD5tp4EY3`, freelancer `6HaTF69iUhG2btQYAczH3ZUHWoMTyJnUz62iZZLi6cCG` (`ned-wallet/.smoke-keys/`). Run 1 job [`4KMf…uSg5`](https://explorer.solana.com/address/4KMfUw28d8guSLuc5i9tXVNRSVk7DP3kn5p1HRCcuSg5?cluster=devnet) Filled; Run 2 [`5GvQ…Dg9Q`](https://explorer.solana.com/address/5GvQSsstiUaJM12b5H1uMKQ6AdgAGBuD66z7HQiKDg9Q?cluster=devnet) Withdrawn; Run 3 [`1Acc…yf4`](https://explorer.solana.com/address/1Acc4LUtobSPf6k4E6Xd6zTe7r78CL9WznPB35qkyf4?cluster=devnet) Filled; Run 4 [`Cypw…RMSN`](https://explorer.solana.com/address/CypwXjvdBDrPbQLDP5n7ieAGEKM4oQtP5fHmDybMMRSN?cluster=devnet) Withdrawn. Link từng giao dịch ở dòng V4 |
| Payout partner demo | `FA2qzovJShkNNNnMz3nXmYXvBzenRTgU2oko7RBBhbyp` (keypair `~/.config/solana/ned-demo-partner.json`), USDC ATA `Abey9woydP9w8voHfGsoBzM6tKnAcDugUVWmeQdiD96i` |
| Ví test smoke run | Client `BT9czjT3y8MZvGT5HSB8c7uXZriXJj13BBiGDQCtRT7B` (12 USDC; partner giữ 6), freelancer `EcpCrZB6HAV8VBRcfmR6DZqwitFpxfkUnEXfqAYPrA4y` |
| Ví deploy | 8,546 SOL (02/10) → 7,197 → 7,124 SOL (A2) → … → 6,0535 (07/10 trước V3) → 5,9279 SOL (sau V3 + IDL V4) |
| Workspace (Vercel) | https://unihackfest-2026.vercel.app (Root Directory `ned-workspace`, CSP đang Report-Only) |
| Kích thước | `SharedFund` **740 byte** (client @12, freelancer @44, brief_hash @676); `JobListing` **576 byte** (`unfunded` @544, v1.4); `.so` 683.040 byte (v1.4) |

### Vấn đề còn mở

1. **Đổi khoá** (chỉ chủ dự án làm được): xem checklist ở mục T0.2 bên dưới (relayer, Helius + giới hạn domain, Supabase, Jupiter, deploy lại Pages). Key Helius mainnet hiện làm `identity:check` lỗi ở bước `sns.sol`.
2. **LICENSE**: README ghi MIT nhưng chưa có file LICENSE. Cần quyết định: thêm file MIT hay bỏ dòng này.
3. ~~**Nhãn còn thiếu (review N10 #3)**~~ — **đã đóng ở B4a (03/10)**: client "Review time is over · anyone can release", freelancer "Ready to release" (chữ theo prompt B4a); thêm "Submission deadline passed" cho milestone chưa nộp đã quá hạn. Có test trong core.
4. **Chưa test tay**:
   - harness hai trình duyệt (N10);
   - checklist web N11 (đăng nhập, người cũ, người mới đến Home, Send, `/swap` và `/xstocks` chuyển về Home);
   - Send 1 USDC sau khi đổi sang tính tiền bằng BigInt (`55a6954`).
5. ~~**Phần cầu nối tạm (TODO(N11 bridge))**~~ — **đã đóng ở B3 (03/10)**: có màn consent và màn residence, `CONSENT_SCREEN_READY = true`, `/mode` chuyển sang `/residence`.
6. **Mất 2 USDC devnet** ở partner tạm cũ `DwjFsw…`; không lấy lại được (không ảnh hưởng demo).
7. ~~**Mục nhìn thấy nhưng đã bị ẩn**~~ — **đã đóng ở B3 (03/10)**: thanh điều hướng mới Home · Contracts · Records · Settings; Home không còn ô SWAP / XSTOCKS; `/swap` và `/xstocks` vẫn chuyển về Home.
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

**Compute units mỗi instruction — LiteSVM, v1.4, 07/10/2026** (bảng hiện hành; chi tiết và cách đo ở `program-spec.md` §11.5). 10 lần chạy `cargo test -- --nocapture --test-threads=1`, ghi thấp nhất–cao nhất: keypair test ngẫu nhiên mỗi lần chạy, mỗi lần thử thêm bump PDA tốn 1.500 CU.

| Instruction | CU (thấp nhất–cao nhất) |
| --- | ---: |
| `post_job` (2 milestone) | 34.173–49.173 |
| `post_job_open` (2 milestone) | 26.120–36.620 |
| `post_job_brief` (900 byte) | 3.937 |
| `apply_job` | 12.904–20.404 |
| `fund_job` | 21.154–24.154 |
| `create_fund` (2 milestone, trong giao dịch chọn) | 24.060–37.560 |
| `select_job` | 12.105 |
| `accept` | 7.925–7.996 |
| `lock_from_job` | 37.545–45.045 |
| `withdraw_job` (đã khoá / chưa khoá) | 26.148–33.648 / 18.046–24.046 |
| `create_fund` (3 milestone) | 24.142–33.142 |
| `lock` | 22.482–28.482 |
| `submit` | 7.774–7.781 |
| `approve` | 22.907–31.938 |
| `release_after_review` | 23.077–32.108 |
| `refund` | 22.765–28.765 |
| `close` | 17.030–23.030 |
| `dispute` · `propose_cancel` | 7.686 · 7.583 |
| `concede` | 22.842–34.842 |
| `accept_cancel` | 35.515–43.015 |
| `post_note` (900 byte) | 4.612–4.626 |

Giao dịch: `fund_job + create_fund + select_job` 57.319–67.819 (2 milestone) / 57.985–71.485 (5 milestone); `accept + lock_from_job` 45.470–51.487. **Trên 40.000 CU ở một số lần chạy:** `post_job` (tối đa 49.173 = 24,6%), `lock_from_job` (45.045), `accept_cancel` (43.015); đã như vậy từ v1.3 (v1.4 chỉ thêm ≤ ~80 CU). "Dưới 20%" không còn an toàn cho pitch; "dưới 25%" đúng với mọi số đo (CL quyết).

**Bảng cũ (v1.0, 01/10, giữ để tham khảo)** (LiteSVM, test `g15_compute_units_per_instruction`; fund 3 milestone, đường Vietnam trừ dòng `accept (OwnWallet)`):

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

(Số cũ v1.0.) Mọi instruction P0 đều dưới 30 000 CU; `accept_cancel` (P1) là 39 781 CU. Tất cả đều dưới 20% hạn mức mặc định 200 000.

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
