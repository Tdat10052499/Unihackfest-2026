# Tổng hợp tiến độ N.E.D Wallet (26–27/09/2026)

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
- Commit message kết thúc bằng dòng `Co-Authored-By` theo quy ước; mỗi task một nhánh từ main → commit từng bước → push nhánh; agent **không tạo PR, không merge main** (chủ dự án tự làm).
