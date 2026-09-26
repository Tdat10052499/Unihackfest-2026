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

## 2. Thay đổi trên nhánh PoC

| File | Thay đổi |
|---|---|
| `ned-wallet/package.json`, `pnpm-lock.yaml` | Thêm các gói:<br>• Dynamic: `@dynamic-labs-sdk/client`, `@dynamic-labs-sdk/react-hooks`, `@dynamic-labs-sdk/solana`<br>• phụ trợ: `@tanstack/react-query`, `react-native-keychain`, `react-native-inappbrowser-reborn`, `react-native-passkey`<br>• scrypt: `@noble/hashes` |
| `ned-wallet/pnpm-workspace.yaml` | `allowBuilds: false` cho `bigint-buffer`, `protobufjs`, `react-native-inappbrowser-reborn` (script cài đặt không cần cho RN). Thêm `overrides` `@solana/web3.js: 1.98.4` |
| `ned-wallet/polyfill.js` | Thêm `crypto.randomUUID` (expo-crypto) và `globalThis.location` |
| `ned-wallet/src/poc/dynamicConstants.ts` | Hằng `universalLink` / `nativeLink` |
| `ned-wallet/src/poc/dynamicClient.ts` | Tạo client (`autoInitialize: false`), `openAuthSession` bằng expo-web-browser, `addWaasSolanaExtension` |
| `ned-wallet/app/poc-dynamic.tsx` | Màn PoC với 5 nút; tự bọc `QueryClientProvider` + `DynamicProvider` |
| `ned-wallet/.env.example` | Thêm `EXPO_PUBLIC_DYNAMIC_ENVIRONMENT_ID` |

**Privy**: giữ nguyên, không cô lập. Dynamic chỉ khởi tạo khi mở màn PoC. Privy không đọc `window.location` (đã kiểm tra mã nguồn), nên shim `location` không ảnh hưởng.

## 3. Kết quả PoC (điền sau khi chạy trên điện thoại)

Thiết bị: … · Android … · Dev build EAS: …

| # | Hạng mục | Kết quả | Thời gian | Ghi chú / lỗi |
|---|---|---|---|---|
| 1 | Đăng nhập Google → ví Solana nhúng + số dư devnet | ⏳ | | |
| 2 | Ký & gửi memo devnet (người dùng trả phí) | ⏳ | | |
| 3 | Memo từ ví **0 SOL** — gas sponsorship có trả phí? | ⏳ | | |
| 4 | Tạo ATA USDC từ ví **0 SOL** — rent có được tài trợ? | ⏳ | | |
| 5 | scrypt `+84901234567` (r=8, p=1, dkLen=32) — N=2^14 / 2^15, TB 3 lần | ⏳ | | |

**Kết luận**: ⏳ GO / NO-GO (GO nếu 1–3 chạy; 4 thất bại → phương án rent ở T1.6).

## 4. Cách chạy test
- Ví **0 SOL** cho (c) và (d): đăng nhập bằng tài khoản Google mới, **chưa** airdrop. Chạy (c) và (d) **trước** (b), vì (b) cần SOL.
- Sau đó airdrop SOL devnet cho ví (faucet.solana.com) để chạy (b).
- Nếu ví đã có ATA USDC, (d) sẽ báo "already exists" → cần tài khoản Google khác.
