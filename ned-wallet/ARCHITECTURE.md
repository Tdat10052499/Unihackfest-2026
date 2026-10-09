# Kiến trúc app N.E.D trên điện thoại (ned-wallet)

Cập nhật 03/10/2026, sau N0–N13 (Milestone Lock) và W0 (gói dùng chung `packages/ned-core`); dọn phần N.E.D Wallet cũ ngày 09/10/2026. Sản phẩm và đặc tả: [`../docs/09-milestone-lock/`](../docs/09-milestone-lock/README.md). Cài đặt, test, deploy, biến môi trường: [README gốc](../README.md#build-and-test).

## Nguyên tắc

- **Đang xây: Milestone Lock.** Logic nằm trong `services/milestone/`, màn hình dùng hook trong `hooks/`. Màn hình hợp đồng (`app/contracts/`) chờ bản thiết kế mới; tạm thời có harness dev `app/dev/milestone.tsx`.
- **Không backend riêng**: không Supabase, không `ned-hub`, không relayer. Dữ liệu dùng chung nằm **on-chain** (`ned_program`) hoặc lấy từ API công khai. Payout partner ở bản demo là một ví devnet do team giữ.
- **Gói dùng chung `@ned/core`** (`../packages/ned-core`, workspace-plan W0, quyết định D20). Phần TypeScript thuần nằm ở đây, không có React / React Native và không đọc env. Các đường dẫn cũ trong app chỉ là **shim re-export**, nên màn hình và hook không phải đổi import. Gồm:
  - hằng số chain;
  - IDL;
  - `services/chain/*`;
  - `services/milestone/*`;
  - phần thuần của `services/identity`;
  - `utils/amountInput`;
  - pipeline `actions.ts`.

  App cấu hình core một lần trong `services/coreInit.ts` (`configureCore` từ các biến `EXPO_PUBLIC_*`).
- **Chỉ devnet**: cluster, mint USDC và tỷ giá USD→VND ở `@ned/core/constants.ts`; program ID và `Connection` devnet duy nhất lấy qua `getProgramId()` / `getConnection()` của core (shim cũ `constants/chain.ts`, `services/chain/connection.ts` vẫn export `PROGRAM_ID`, `connection`).
- **Màn hình chỉ gọi hook**: không import `@solana/web3.js` hay builder instruction trong màn hình mới. Đăng nhập và ký qua `useAuth()` (`services/auth`), lớp duy nhất import `@dynamic-labs-sdk/*`.
- **Tiền là `bigint` base units** (6 chữ số thập phân USDC). Chỉ đổi sang chuỗi khi hiển thị (`services/milestone/format.ts`).
- **Ưu tiên web** (GitHub Pages); Android APK qua EAS là phụ.
- **Không có khoá bí mật trong app**: mọi biến `EXPO_PUBLIC_*` đều nằm trong bundle công khai (`.env.example`).
- Người dùng tự trả phí + rent bằng SOL devnet. Trước khi ra mắt, cần một fee payer cho người dùng Việt Nam (product-spec 4.3).

## Cây thư mục

```
ned-wallet/
├── app/                      Expo Router — mỗi file là một route
│   ├── _layout.tsx           AuthProvider (Dynamic) → Stack + AuthGate (chưa đăng nhập → /welcome)
│   │                         + OnboardingGate (đã đăng nhập nhưng chưa xong onboarding → /setup)
│   ├── index.tsx             Splash → welcome hoặc setup
│   ├── (onboarding)/         welcome → setup → consent → fund (thiếu SOL) → profile → residence; D30: role, country,
│   │                         business, agreement
│   ├── (tabs)/               Home (index, Vietnam view / international view) với thanh WalletNav
│   ├── contracts/            index (danh sách, B4 làm lại), new (tạm); records.tsx (= history tới B5); disclosures.tsx
│   ├── send.tsx, receive.tsx, history.tsx, notification-detail.tsx, scan-qr.tsx, settings.tsx
│   └── dev/milestone.tsx     Harness Milestone Lock, chỉ khi __DEV__ hoặc EXPO_PUBLIC_DEV_TOOLS=1
├── components/               design/ (bộ UI chung), onboarding/, wallet/, contracts/, home/, settings/, SendFlow, thông báo, mascot
├── constants/                chain.ts (shim → @ned/core/constants + PROGRAM_ID), features.ts (cờ dispute,
│                             records, lockAtHire, accountRoles, devTools), design.ts, mascot.ts
├── hooks/                    Milestone Lock: useFunds, useFund, useMilestoneActions, useChainTime, useRegion
│                             (+ milestoneRefresh); useOnchainTransfer (gửi USDC), useNotificationSync
├── services/
│   ├── coreInit.ts           configureCore(...) từ EXPO_PUBLIC_*; import đầu tiên trong _layout và trong mọi shim
│   ├── auth/                 Dynamic: useAuth() → walletAddress, signTransaction…
│   ├── chain/                shim → @ned/core/chain/* (connection, send, errors, ata, balance, idl)
│   ├── milestone/            shim → @ned/core/milestone/* (view.ts thêm mặc định FEATURES.dispute cho P1)
│   ├── identity/             dualPda, resolveCore, format, transactionCost: shim → @ned/core/identity/*;
│   │                         phoneKey (E.164 + scrypt), ownPhone, resolve (người nhận / tên hiển thị), sns: ở app
│   ├── onboarding.ts         Chi phí thật, bước tiếp theo (fund | consent | profile | region | home), tạo hồ sơ
│   ├── p2pTransfer.ts        Chuẩn bị giao dịch gửi USDC devnet (số tiền → base units, không dùng float)
│   ├── solana.ts             Số dư, lịch sử, lệnh SPL (dùng hằng số và connection ở trên)
│   └── storage.ts, i18n.ts (chỉ còn nhóm chuỗi activities), webAlert.ts
├── stores/                   Zustand: user, region (@ned_region_v1), consent (@ned_consent_v1),
│                             account (@ned_account_v1, D30), signupDraft (D30, chỉ trong bộ nhớ), notification
├── idl/                      shim → @ned/core/idl (IDL thật nằm ở packages/ned-core/src/idl/)
├── utils/amountInput.ts      shim → @ned/core/utils/amountInput
├── scripts/                  identity-devnet, identity-readonly, milestone-devnet (smoke run), milestone-status,
│                             jobs-smoke, jobs-e2e, recycle-demo-usdc, gh-pages-gitignore
│                             (chạy bằng ts-node -P tsconfig.scripts.json để nạp được @ned/core)
└── polyfill.js, index.js     Polyfill (Buffer, crypto, location cho Dynamic) nạp trước expo-router
```

## Luồng dữ liệu

```
                 ┌──────────────────── Dynamic ──────────────────────┐
 Người dùng ──►  │ Google login → ví nhúng Solana (MPC) → ký tx      │
                 └───────────────┬───────────────────────────────────┘
                                 │ địa chỉ ví / chữ ký
   màn hình ──► hooks/ ──► services/milestone (builder, rules, view) ──► services/chain/send
                                 │                                            │
        ┌────────────────────────┼──────────────────────────┬─────────────────┘
        ▼                        ▼                          ▼
  Helius RPC (devnet)      ned_program (devnet)         SNS (mainnet, chỉ đọc)
  số dư, lịch sử,          identity PDA + SharedFund     tên .sol ↔ ví
  gửi USDC P2P             (vault USDC theo hợp đồng)
        │
        ▼
  AsyncStorage / SecureStore: khu vực, nhật ký đồng ý, hồ sơ D30, SĐT của chính mình, cache
```

- **Đăng nhập** (`useAuth().login()`): web = redirect Google → SDK tạo ví Solana nếu chưa có → chuyển ví sang devnet. `setup` gọi `resolveOnboarding`, rồi chuyển sang bước tiếp theo bằng `onboardingRoute`.
- **Onboarding** (B3): `consent` → `fund` (thiếu SOL) → `profile` → `residence` → `home`; khi bật D30: `role` → `country` → (`business`) → `agreement` → `fund` → `profile` → `home`.
  - Consent lưu theo ví (`@ned_consent_v1`); residence ghi region (`@ned_region_v1`) quyết định chế độ xem Vietnam / international.
- **Ký và gửi giao dịch**: `services/chain/send.ts` `sendAndConfirm` làm lần lượt:
  1. tính phí + rent thật;
  2. kiểm tra SOL;
  3. ký bằng `useAuth().signTransaction`;
  4. gửi;
  5. confirm theo blockhash;
  6. báo lỗi nếu `value.err`.

  Lỗi đổi thành một câu tiếng Anh bằng `describeTxError(err, 'profile' | 'contract' | 'transfer')`.
- **Milestone Lock**:
  - Pipeline nằm ở `@ned/core/actions.ts`: đọc lại fund mới nhất → kiểm tra bằng `rules.ts` (giống program) → dựng giao dịch bằng builder → ký bằng signer được truyền vào → `sendAndConfirm`.
  - `useMilestoneActions` chỉ bọc nó: trạng thái busy / status / error, rồi làm mới mọi `useFund` / `useFunds` đang mở.
  - Danh sách hợp đồng lấy bằng `getProgramAccounts` (kích thước 708, discriminator, `memcmp` ở offset 12 cho client hoặc 44 cho freelancer).
  - Đếm ngược dùng giờ chain (`useChainTime`).
- **Gửi USDC**: người nhận là địa chỉ ví, `@username` (NameRecord) hoặc SĐT (PhoneRecord, cảnh báo "Unverified number"). `p2pTransfer.ts` đổi số tiền gõ vào thành base units. Ví nhúng ký, người dùng trả phí.
- **Identity on-chain**: `NameRecord [b"name", username] → wallet`, `ReverseRecord [b"reverse", wallet] → username, has_phone`, `PhoneRecord [b"phone_v1", scrypt(SĐT)] → wallet`.
- **Thông báo**: `useNotificationSync` đọc lịch sử on-chain mỗi 8 giây → banner + danh sách.
- **Đã bỏ ở N11**: dApp Browser, cầu nối ví (`useWeb3Bridge`), Mobile Wallet Adapter (`MwaProvider`), trang `poc-dynamic`, các tab và modal không dùng.
- **Đã bỏ 09/10/2026**: Swap, xStocks, client Jupiter, sổ demo (`demoLedger`), `services/history.ts`, chế độ ví Simple/Crypto (`/mode`, `useWalletModeStore`), `useNetworkStore`, `solanaConnection.ts`, `anchorClient.ts`, các modal và ảnh không dùng, chuỗi dịch cũ. Tài liệu thời đó: [`../docs/archive/`](../docs/archive/README.md).
