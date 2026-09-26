# Kiến trúc N.E.D Wallet (ned-wallet)

Cập nhật 26/09/2026 — sau T0.5 (dọn dẹp theo kiến trúc web3). Bối cảnh sản phẩm: [`../docs/README.md`](../docs/README.md); kế hoạch code: [`../docs/04-ke-hoach-code.md`](../docs/04-ke-hoach-code.md).

## Nguyên tắc

- **Không backend riêng**: không Supabase, không `ned-hub`, không relayer. Mọi dữ liệu dùng chung nằm **on-chain** hoặc lấy từ API công khai.
- **Ưu tiên web** (GitHub Pages) cho demo; bản Android APK (EAS) là bản phụ. iOS native cần tài khoản Apple Developer trả phí.
- **Không có khoá bí mật trong app**: mọi biến `EXPO_PUBLIC_*` đều bị đóng gói vào bundle. Xem `.env.example`.
- Người dùng tự trả phí + rent bằng SOL devnet (SVM Gas Sponsorship của Dynamic cần gói Enterprise — xem `../docs/poc-dynamic.md`).

## Cây thư mục

```
ned-wallet/
├── app/                  Expo Router — mỗi file là một route
│   ├── _layout.tsx       Provider gốc: PrivyProvider (tạm) → MwaProvider → WalletProvider (tạm) → Stack
│   ├── (auth)/           Đăng nhập (Privy: Google / Email OTP) — thay bằng Dynamic ở T1.2
│   ├── (onboarding)/     welcome → phone → username (tạo hồ sơ)
│   ├── (tabs)/           Home (index), Card/Overview, Transfer Hub, dApps (miniapps)
│   ├── send.tsx          Gửi USDC P2P (tới địa chỉ ví / @username / SĐT)
│   ├── history.tsx, notification-detail.tsx, scan-qr.tsx, settings.tsx
│   ├── mini-app.tsx      dApp Browser: WebView + cầu nối ví (useWeb3Bridge) + modal ký
│   └── poc-dynamic.tsx   Màn PoC Dynamic (T0.4) — tham khảo cho T1.2
├── components/           UI dùng chung (modal gửi/nạp, thông báo, mascot, neo/* Neo-brutalism, mwa/*)
├── contexts/             React context
│   ├── MwaProvider.tsx   N.E.D đóng vai ví trả lời request Mobile Wallet Adapter từ dApp
│   └── WalletProvider.tsx  (tạm) ví ngoài Phantom/Solflare — gỡ ở Phase 1
├── hooks/                Hook dữ liệu: số dư on-chain, chuyển USDC, đồng bộ thông báo, cầu nối dApp
├── services/             Logic không phụ thuộc UI
│   ├── auth/             (khung) Dynamic — T1.2
│   ├── identity/         Tra cứu danh tính: legacy.ts (PDA cũ) → Dual PDA + SNS ở T1.5
│   ├── jupiter/          (khung) Swap + xStocks — Phase 2–3
│   ├── mwa/              Giao thức Mobile Wallet Adapter
│   ├── anchorClient.ts   Kết nối Anchor tới ned_program (IDL trong idl/)
│   ├── solana.ts         Helius RPC: số dư, lịch sử, ATA, lệnh chuyển SPL
│   ├── solanaConnection.ts, storage.ts, i18n.ts
│   └── profile.ts        Hồ sơ người dùng lưu cục bộ (AsyncStorage) — thay bằng Dual PDA ở T1.5/T1.7
├── stores/               Zustand: user, network, notification, walletCards (ví con), walletMode (khung)
├── idl/                  IDL ned_program (cập nhật sau khi deploy T1.5)
├── poc/                  Dynamic client của PoC (T0.4) — gộp vào services/auth ở T1.2
├── constants/, locales/  Theme, mascot, dApp test HTML; bản dịch en/vi
├── scripts/              patch-privy.js (postinstall, gỡ ở T1.4), deploy-web.js, test-*.ts (script Anchor chạy local)
└── polyfill.js, index.js Polyfill (Buffer, crypto, location cho Dynamic) nạp trước expo-router
```

## Luồng dữ liệu

```
                 ┌──────────────── Dynamic (Phase 1) ────────────────┐
 Người dùng ──►  │ Google login → ví nhúng Solana (MPC V3) → ký tx   │   (hiện tại: Privy)
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

- **Đăng nhập** → lấy ví → tra Reverse PDA để biết người mới (vào onboarding) hay người quay lại (vào Home).
- **Gửi USDC**: người nhận là địa chỉ ví (chạy ngay), @username / SĐT (qua Dual PDA — T1.5). Ký bằng ví nhúng, người dùng trả phí.
- **Thông báo**: `useNotificationSync` polling lịch sử on-chain 8s → banner + danh sách. TODO: Helius WebSocket.
- **dApp Browser**: `mini-app.tsx` nạp dApp trong WebView, `useWeb3Bridge` tiêm `window.solana`, yêu cầu ký hiện qua `MiniAppSignatureModal`.

## Đang chuyển tiếp (xem docs/cleanup-report-t0-5.md)

| Phần | Trạng thái | Thay bằng |
|---|---|---|
| Privy (`@privy-io/expo`, `PrivyProvider`, `patch-privy.js`) | Giữ để đăng nhập | Dynamic — T1.2, gỡ ở T1.4 |
| `contexts/WalletProvider.tsx` (ví ngoài) | Giữ, 8 màn còn đọc `useExternalWallet()` | Gỡ cùng Privy ở Phase 1 |
| `services/profile.ts` | Lưu cục bộ, tìm kiếm trả rỗng | Dual PDA — T1.5 / T1.7 |
| `services/identity/legacy.ts` | PDA identity cũ | dualPda.ts + sns.ts — T1.5 |
| `poc/` | Code PoC | services/auth — T1.2 |
