# PoC Dynamic — T0.4 (cổng GO/NO-GO)

Nhánh `poc/dynamic` — **không merge vào `main`**. Màn test: `ned-wallet/app/poc-dynamic.tsx` (deep link `nedwallet://poc-dynamic`).

## 1. Kết quả tra cứu (MCP dynamic, 26/09/2026)

### Gói npm
- Dùng **JavaScript SDK (headless)** — tài liệu gọi đây là đường mặc định cho React Native. **Không** dùng SDK React Native cũ (`@dynamic-labs/legacy-client`, WebView).
- Đã xác minh đúng tên gói trong kế hoạch cũ: `@dynamic-labs-sdk/client`, `@dynamic-labs-sdk/react-hooks`, `@dynamic-labs-sdk/solana` (bản 1.34.2).
- Gói phụ bắt buộc: `@tanstack/react-query`, `@react-native-async-storage/async-storage`, `react-native-keychain`, `expo-linking`, `expo-crypto`, `buffer`.
- Đăng nhập social: `react-native-inappbrowser-reborn` (tài liệu).
- Kiểm tra mã nguồn: bundle native của `@dynamic-labs-sdk/client` **import cứng** `react-native-inappbrowser-reborn`, `react-native-keychain` và `react-native-passkey`. Tuy được khai là peer tuỳ chọn, thiếu bất kỳ gói nào thì Metro **không bundle được** → phải cài cả 3.
- Bản thân `@dynamic-labs-sdk/client` có **module native Android/iOS** → không chạy được trên Expo Go, cần dev build.

### Polyfill & entry
- Cần `crypto.getRandomValues`, `crypto.randomUUID`, `global.Buffer`, và `globalThis.location = { origin: <universalLink> }`.
- Polyfill phải chạy trước mọi import khác (entry riêng). App đã có `index.js` → `polyfill.js` (có sẵn `react-native-get-random-values`, `Buffer`) → chỉ cần bổ sung `randomUUID` và `location`.

### Client & cấu hình app
- `createDynamicClient({ environmentId, metadata: { nativeLink, universalLink } })`.
- `nativeLink` là deep link scheme của app (`app.json` › `scheme: "nedwallet"`); `universalLink` là origin HTTPS.
- Không cần config plugin Expo riêng cho Dynamic.

### Đăng nhập Google trên mobile
- Trên React Native, `signInWithSocialRedirect` **không dùng được** (ném `MethodNotImplementedError`) → dùng **`signInWithSocialPopUp({ provider: 'google' })`**.
- SDK dùng `metadata.nativeLink` làm OAuth redirect URL. Nó mở phiên auth qua `react-native-inappbrowser-reborn`, hoặc qua hàm tự cung cấp ở `coreConfig.openAuthSession`. PoC dùng **`expo-web-browser`** (`openAuthSessionAsync`, Custom Tabs) vì Expo bảo trì và hỗ trợ New Architecture.
- Callback phải cùng origin với `nativeLink`, nếu không SDK ném `InvalidSocialCallbackOriginError`.
- **Dynamic Console › Security**:
  - bật **Whitelist Mobile Deeplink**, thêm `nedwallet://poc-dynamic`;
  - thêm `https://tdat10052499.github.io` vào **Allowed Origins**.
- Ví nhúng **không tự tạo** sau đăng nhập: phải gọi `createWaasWalletAccounts({ chains: ['SOL'] })` (nghe sự kiện `userChanged`).

### Chọn Solana devnet
- Bật **Solana Devnet** trong Console › Chains & Networks.
- Trong app: `getNetworksData()` → lấy mạng `chain === 'SOL'`, `cluster === 'devnet'` → `switchActiveNetwork({ networkId, walletAccount })`.
- Tạo Connection: `getSolanaConnection({ networkData })`.
- Không hard-code network ID: tài liệu ghi lệch nhau (102 hay 103 cho devnet).

### Ký & gửi giao dịch
- `signAndSendTransaction({ transaction, walletAccount, sponsorshipMode })` với `sponsorshipMode`:
  - `'auto'` (mặc định): tài trợ nếu được;
  - `'off'`: không bao giờ tài trợ.
- Ngoài ra có `signTransaction` và `signAllTransactions`.
- Nhận `Transaction` và `VersionedTransaction` của `@solana/web3.js`.

### SVM Gas Sponsorship

> **Quyết định 26/09/2026**: công tắc SVM Gas Sponsorship trên Console **bị khoá** (project không ở gói Enterprise). Environment `sandbox` cũng báo `svmGasSponsorshipEnabled: false`. → **Dùng phương án dự phòng T1.6**:
> - người dùng tự trả phí + rent bằng SOL devnet;
> - nạp sẵn SOL cho các tài khoản demo;
> - thêm nút **Get test SOL** (airdrop devnet);
> - pitch: "Production: Dynamic SVM Gas Sponsorship (Enterprise)".
>
> ZeroDev (Console › Sponsor Gas › External Providers) chỉ dành cho **EVM** (ERC-4337/7702), không dùng được cho Solana.
- ⚠️ Tài liệu ghi: **"SVM Gas Sponsorship is an enterprise-only feature"** → phải kiểm tra gói của project trên Console. Nếu không bật được: bước (c) sẽ báo `SponsorTransactionError`.
- Bật tại: Console › Settings › Embedded Wallets › **SVM Gas Sponsorship**. Chỉ áp dụng cho **ví nhúng MPC V3**. Hỗ trợ Solana **Mainnet và Devnet**.
- Cơ chế:
  1. SDK gửi giao dịch lên backend Dynamic;
  2. Dynamic **thay fee payer** bằng tài khoản tài trợ;
  3. ví người dùng ký;
  4. SDK broadcast (mặc định `skipPreflight: true`).
- `signAndSendSponsoredTransaction` **bắt buộc** tài trợ, ném `SponsorTransactionError` nếu không được — nên dùng cho ví 0 SOL.
- Giới hạn:
  - tối đa 2KB (base64);
  - giao dịch đã ký sẵn sẽ không được tài trợ;
  - mỗi giao dịch được tài trợ riêng.
- **Rent**: tài liệu chỉ nói tới phí mạng (fee payer), **không đề cập rent**. Lệnh tạo ATA dùng `payer` = ví người dùng (signer), nên nhiều khả năng rent vẫn trừ vào ví người dùng. Bước (d) sẽ kiểm chứng.

### Rủi ro khác cần để ý
- Tài liệu yêu cầu xử lý **device registration** và **step-up auth** thủ công trước khi nhận API version `2026_04_01` (Console › Developers › API & SDK Keys). PoC chưa xử lý; nếu đăng nhập báo lỗi liên quan, xem mục này.
- `@dynamic-labs-sdk/solana` ghim `@solana/web3.js` **1.98.1**, app dùng 1.98.4. Hai bản song song làm hỏng kiểu và có thể làm hỏng `instanceof` lúc chạy → đã ép một bản duy nhất bằng `overrides` trong `pnpm-workspace.yaml`.

### Bản web (quyết định 26/09/2026: ưu tiên web)
- Lý do: chủ dự án chỉ có iPhone, không có tài khoản Apple Developer trả phí → không cài được bản native lên iOS. Bản web cho mọi người (iOS, Android, desktop) test bằng một link; APK Android là bản phụ.
- Trên web, SDK dùng build `index.esm.js`, không cần module native hay polyfill `location`.
- Đăng nhập trên web:
  - `signInWithSocialRedirect({ provider: 'google', redirectUrl })` → trang chuyển sang Google;
  - khi quay lại: `detectSocialRedirectUrl` + `completeSocialRedirect`.
- Cần khai báo trong Console › Security › **Allowed Origins**: `https://tdat10052499.github.io` (và `http://localhost:8081` nếu test trên máy).
- URL màn PoC: `https://tdat10052499.github.io/Unihackfest-2026/poc-dynamic`.

## 2. Thay đổi trên nhánh PoC

| File | Thay đổi |
|---|---|
| `ned-wallet/package.json`, `pnpm-lock.yaml` | Thêm các gói:<br>• Dynamic: `@dynamic-labs-sdk/client`, `@dynamic-labs-sdk/react-hooks`, `@dynamic-labs-sdk/solana`<br>• phụ trợ: `@tanstack/react-query`, `react-native-keychain`, `react-native-inappbrowser-reborn`, `react-native-passkey`<br>• scrypt: `@noble/hashes` |
| `ned-wallet/pnpm-workspace.yaml` | `allowBuilds: false` cho `bigint-buffer`, `protobufjs`, `react-native-inappbrowser-reborn` (script cài đặt không cần cho RN). Thêm `overrides` `@solana/web3.js: 1.98.4` |
| `ned-wallet/polyfill.js` | Thêm `crypto.randomUUID` (expo-crypto) và `globalThis.location` |
| `ned-wallet/src/poc/dynamicConstants.ts` | Hằng `universalLink` / `nativeLink` |
| `ned-wallet/src/poc/dynamicClient.ts` | Tạo client (`autoInitialize: false`), `addWaasSolanaExtension`. Native: `openAuthSession` bằng expo-web-browser. Web: không cần `nativeLink` |
| `ned-wallet/app/poc-dynamic.tsx` | Màn PoC với 5 nút; tự bọc `QueryClientProvider` + `DynamicProvider`. Nút (d) đo rent do người dùng trả |
| `ned-wallet/.env.example` | Thêm `EXPO_PUBLIC_DYNAMIC_ENVIRONMENT_ID` |

**Privy**: giữ nguyên, không cô lập. Dynamic chỉ khởi tạo khi mở màn PoC. Privy không đọc `window.location` (đã kiểm tra mã nguồn), nên shim `location` không ảnh hưởng.

## 3. Kết quả PoC (26/09/2026)

Thiết bị: iPhone · Safari · Bản: web (GitHub Pages, nhánh `poc/dynamic`) · Ví nhúng: `9PZwK7pZmZnqfq1D5Xm9JvmoFQbPSjCoxj4AHiVLrhkW`

| # | Hạng mục | Kết quả | Thời gian | Ghi chú |
|---|---|---|---|---|
| 1 | Đăng nhập Google → ví Solana nhúng + số dư devnet | ✅ OK | 12 990 ms (lần đầu, tính cả trang Google) · 477 ms (khi còn phiên) | Redirect Google → quay lại → tạo ví SOL (MPC V3) chạy trên Safari iOS |
| 2 | Ký & gửi memo devnet (người dùng trả phí) | ✅ OK | 3 683 ms | Tx [`4dnwALqq…`](https://explorer.solana.com/tx/4dnwALqqkbgMDgxk6M2btMvq2EXRgtunP9smu37rhKK4JHg4Q9zfXnA8E4tVZd7qdD4GhYNxXbCzHx9MZseTyMKe?cluster=devnet), phí 5 000 lamports, người trả = ví người dùng. Đã đối chiếu on-chain (`err: null`) |
| 3 | Memo từ ví **0 SOL** — gas sponsorship có trả phí? | ❌ Không khả dụng | 2 156 ms | `SponsorTransactionError: Failed to sponsor transaction`. Công tắc bị khoá (không phải gói Enterprise) → phương án dự phòng T1.6 |
| 4 | Tạo ATA USDC (**người dùng trả**) | ✅ OK | 4 030 ms | Rent **1 488 440 lamports (0.001488 SOL)** + phí 5 000 → trừ tổng **0.001493 SOL**. Tx [`5eTEpCW2…`](https://explorer.solana.com/tx/5eTEpCW26JBUSkV9qP1FFsEnzfcKZQpsqBK7dkjrT5dYXwvKhRixZoF8k1m994wBhenzk4WLbJBV9AQCJr2FmuxW?cluster=devnet). Rent **không** được tài trợ |
| 5 | scrypt `+84901234567` (r=8, p=1, dkLen=32), TB 3 lần | ✅ OK | N=2^14: **85 ms** · N=2^15: **187 ms** | Safari iOS. Hash giống hệt bản chạy trên máy tính (`6ba260ad…`, `aef8e4c1…`) → kết quả xác định, dùng chéo nền tảng được |
| — | Airdrop devnet trong app (`requestAirdrop`) | ❌ 429 | 8 098 ms | "reached your airdrop limit today or the faucet has run dry" → không thể dựa vào khi demo; dùng faucet.solana.com (đăng nhập GitHub) |

**Kết luận: ✅ GO.** Dynamic JS SDK chạy được (đăng nhập Google, ví nhúng Solana, ký + gửi giao dịch devnet) trên **web / Safari iOS**. Bản native Android chưa build nhưng JS bundle đã build thành công.

### Hệ quả cho các task sau
- **Nền tảng demo: web trước** (GitHub Pages), APK Android là phụ.
- **Trước khi tích hợp Dynamic vào app chính** (Phase 1), phải sửa luồng web của Privy hoặc bỏ Privy:
  - `patch-privy.js` đã được sửa trên nhánh này;
  - bản web trên `main` cũng đang bị màn trắng vì lỗi này → cần đưa bản sửa sang `main`.
- **T1.6 (không có sponsorship)**:
  - Người dùng tự trả phí (5 000 lamports/tx) và rent.
  - Chi phí ước tính khi onboarding (theo `getMinimumBalanceForRentExemption` trên devnet; kích thước PDA là ước lượng, chốt ở T1.5):
    - Name (~49 B): 899 160 lamports;
    - Reverse (~67 B): 990 600 lamports;
    - Phone (~49 B, tuỳ chọn): 899 160 lamports;
    - ATA USDC: 1 488 440 lamports.
    - **Tổng ≈ 0.0043 SOL** + phí.
  - Nạp sẵn **≥ 0.05 SOL** cho mỗi tài khoản demo (dư cho vài chục giao dịch).
  - Nút "Get test SOL" chỉ để dự phòng, khi lỗi 429 thì hiện link faucet.solana.com.
- **T1.5 (scrypt)**:
  - Mục tiêu 0.2–0.5 s/lần.
  - N=2^15 ≈ 0.19 s trên iPhone Safari, sát mức dưới. N=2^16 ước ~0.37 s (chưa đo).
  - **Đề xuất N=2^16** nếu chỉ băm khi cần (SĐT của mình + số đang tra); dùng N=2^15 nếu phải băm hàng loạt danh bạ.
  - Đo lại trên Android (Hermes) khi có máy.

## 4. Cách chạy test
1. (a) Login.
2. (c) tuỳ chọn: chỉ để chụp lỗi `SponsorTransactionError` làm bằng chứng.
3. Nạp SOL devnet: nút "Get test SOL", hoặc faucet.solana.com nếu bị 429.
4. (b) Send memo.
5. (d) Create USDC ATA: ghi lại dòng "Rent locked in ATA" và "Total deducted".
6. (e) Benchmark scrypt.

Nếu ví đã có ATA USDC, (d) sẽ báo "already exists" → cần tài khoản Google khác.
