# Kiến trúc N.E.D Wallet (ned-wallet)

Cập nhật 27/09/2026 — sau T1.2 + T1.4 (auth chuyển hẳn sang Dynamic). Bối cảnh sản phẩm: [`../docs/README.md`](../docs/README.md); kế hoạch code: [`../docs/04-ke-hoach-code.md`](../docs/04-ke-hoach-code.md).

## Nguyên tắc

- **Không backend riêng**: không Supabase, không `ned-hub`, không relayer. Mọi dữ liệu dùng chung nằm **on-chain** hoặc lấy từ API công khai.
- **Ưu tiên web** (GitHub Pages) cho demo; bản Android APK (EAS) là bản phụ. iOS native cần tài khoản Apple Developer trả phí.
- **Không có khoá bí mật trong app**: mọi biến `EXPO_PUBLIC_*` đều bị đóng gói vào bundle. Xem `.env.example`.
- Người dùng tự trả phí + rent bằng SOL devnet (SVM Gas Sponsorship của Dynamic cần gói Enterprise — xem `../docs/poc-dynamic.md`).

## Cây thư mục

```
ned-wallet/
├── app/                  Expo Router — mỗi file là một route
│   ├── _layout.tsx       Provider gốc: AuthProvider (Dynamic) → MwaProvider → Stack + AuthGate
│   ├── index.tsx         Splash (≤1s) → welcome hoặc setup
│   ├── (onboarding)/     welcome (Google) → setup (kiểm tra ReverseRecord) → fund (nạp SOL devnet) → profile (create_profile [+ link_phone]) → mode
│   ├── (tabs)/           Home (index), Card/Overview, Transfer Hub, dApps (miniapps)
│   ├── send.tsx          Gửi USDC P2P (tới địa chỉ ví / @username / SĐT)
│   ├── history.tsx, notification-detail.tsx, scan-qr.tsx, settings.tsx
│   ├── mini-app.tsx      dApp Browser: WebView + cầu nối ví (useWeb3Bridge) + modal ký
│   └── poc-dynamic.tsx   Màn PoC Dynamic (T0.4) — dùng chung useAuth()
├── components/           UI dùng chung (modal gửi/nạp, thông báo, mascot, neo/* Neo-brutalism, mwa/*)
├── contexts/             React context
│   └── MwaProvider.tsx   N.E.D đóng vai ví trả lời request Mobile Wallet Adapter từ dApp
├── hooks/                Hook dữ liệu: số dư on-chain, chuyển USDC, đồng bộ thông báo, cầu nối dApp
├── services/             Logic không phụ thuộc UI
│   ├── auth/             Dynamic: client.ts, AuthProvider + useAuth() — lớp DUY NHẤT import @dynamic-labs-sdk
│   ├── identity/         dualPda.ts (Name/Reverse/Phone PDA + builders), phoneKey.ts (E.164 + scrypt), resolve.ts (recipient/display resolver), sns.ts (Mainnet read-only SNS)
│   ├── jupiter/          (khung) Swap + xStocks — Phase 2–3
│   ├── mwa/              Giao thức Mobile Wallet Adapter
│   ├── anchorClient.ts   Kết nối Anchor tới ned_program (IDL trong idl/)
│   ├── solana.ts         Helius RPC: số dư, lịch sử, ATA, lệnh chuyển SPL
│   ├── solanaConnection.ts, storage.ts, i18n.ts
│   ├── onboarding.ts     Chi phí thật (rent + phí), bước tiếp theo (fund/profile/mode/home), giao dịch tạo hồ sơ, dịch lỗi
│   └── p2pTransfer.ts    USDC Devnet transfer preparation with current fee/rent
├── stores/               Zustand: user, network, notification, walletCards (ví con), walletMode (Simple/Crypto theo ví)
├── idl/                  IDL ned_program 8azx4Hdo…X5Wh (sinh từ anchor build, không sửa tay)
├── constants/, locales/  Theme, mascot, dApp test HTML; bản dịch en/vi
├── scripts/              deploy-web.js, identity-devnet.ts (pnpm identity:devnet — kiểm chứng identity trên devnet)
└── polyfill.js, index.js Polyfill (Buffer, crypto, location cho Dynamic) nạp trước expo-router
```

## Luồng dữ liệu

```
                 ┌──────────────────── Dynamic ──────────────────────┐
 Người dùng ──►  │ Google login → ví nhúng Solana (MPC V3) → ký tx   │
                 └───────────────┬───────────────────────────────────┘
                                 │ địa chỉ ví / chữ ký
        ┌────────────────────────┼─────────────────────────────┬──────────────────────┐
        ▼                        ▼                             ▼                      ▼
  Helius RPC (devnet)      ned_program (devnet)           Jupiter (mainnet)       SNS (mainnet)
  số dư SOL/USDC,          Dual PDA: name / reverse /     giá, quote Swap,        tên .sol ↔ ví
  lịch sử → thông báo,     phone (T1.5) — tra cứu         xStocks (không          (chỉ đọc)
  gửi USDC P2P             người nhận, người mới/cũ       broadcast, Demo mode)
        │
        ▼
  AsyncStorage / SecureStore: cache hồ sơ, ví con, SĐT của chính mình, cài đặt
```

- **Đăng nhập** (`useAuth().login()`): web = redirect Google, native = popup (expo-web-browser) → SDK tạo ví Solana nếu chưa có → chuyển ví sang devnet. Màn `setup` đọc `ReverseRecord [b"reverse", wallet]`: có → "Welcome back" → Home (hoặc `mode` nếu chưa chọn); chưa có → `fund` (nếu thiếu SOL) → `profile` → `mode`.
- **Tạo hồ sơ**: `create_profile` (+ `link_phone` nếu bật SĐT) trong **một** giao dịch, ký qua `useAuth().signAndSendTransaction`. SĐT dạng rõ chỉ lưu trên máy (`services/identity/ownPhone.ts`: SecureStore / localStorage).
- **Ký giao dịch**: màn hình chỉ gọi `useAuth().signTransaction / signAndSendTransaction` (sponsorshipMode `'off'`, người dùng trả phí).
- **Gửi USDC**: người nhận là địa chỉ ví (chạy ngay); @username → `fetchNameRecord`, SĐT → `getPhoneKey` + `fetchPhoneRecord` (thư viện xong ở T1.5, màn hình nối ở T1.3). Ký bằng ví nhúng, người dùng trả phí.
- **Identity on-chain** (schema chi tiết: `docs/03-ky-thuat/dev-handoff.md` mục 1a): `NameRecord [b"name", username] → wallet`, `ReverseRecord [b"reverse", wallet] → username, has_phone`, `PhoneRecord [b"phone_v1", scrypt(SĐT)] → wallet`. Ghi qua builder `build*Tx` + `useAuth().signAndSendTransaction`.
- **Thông báo**: `useNotificationSync` polling lịch sử on-chain 8s → banner + danh sách. TODO: Helius WebSocket.
- **dApp Browser**: `mini-app.tsx` nạp dApp trong WebView, `useWeb3Bridge` tiêm `window.solana`, yêu cầu ký hiện qua `MiniAppSignatureModal`.

## Đang chuyển tiếp (xem docs/cleanup-report-t0-5.md)

| Phần | Trạng thái | Thay bằng |
|---|---|---|
| Recipient lookup | Đã chuyển ở T1.7 | `services/identity/resolve.ts` — local cache → SNS Mainnet → Name/Phone PDA → address |
| Phone management | Đã chuyển ở T1.7 | `PhoneManagementModal` builds `link_phone`/`unlink_phone` and displays live SOL cost |
