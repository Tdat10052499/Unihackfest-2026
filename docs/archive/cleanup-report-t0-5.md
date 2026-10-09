# Báo cáo dọn dẹp T0.5 — kiến trúc web3 (26/09/2026)

> **Lưu trữ (09/10/2026):** tài liệu thời N.E.D Wallet, chỉ để tra lịch sử, không làm theo. Sản phẩm hiện hành: `docs/09-milestone-lock/`. Xem `archive/README.md`.

Nhánh `chore/t0-5-web3-cleanup` (tạo từ `main` @ `7c7674c`, đã gồm PoC Dynamic). Kiến trúc mới: **không Supabase, không `ned-hub`, không relayer**. Sơ đồ thư mục + luồng dữ liệu: [`ned-wallet/ARCHITECTURE.md`](../../ned-wallet/ARCHITECTURE.md).

## Các commit

| Commit | Nội dung |
|---|---|
| `73f0bb8` | Xoá Shake to Split, Coin Toss Room, Geo-Red Packet, presence |
| `4ac96f0` | Bỏ luồng thông báo Supabase Realtime |
| `7a2117a` | Bỏ UI liên kết ví ngoài + màn dev |
| `dd16084` | Xoá file nháp, `Process.md` trùng, `ned-mock-dapp/` |
| `f971d10` | Gỡ Supabase, hồ sơ lưu cục bộ tới khi có Dual PDA |
| `1f52b85` | Xoá helper broadcast của relayer còn sót |
| `1159369` | Gộp `src/` vào thư mục gốc |
| `19e3125` | Tạo khung `services/auth`, `services/identity`, `services/jupiter`, `useWalletModeStore` |
| `bb69fa7` | Tài liệu: ARCHITECTURE.md, README, AGENTS.md, .env.example |

## 1. Phân loại (Bước 1)

| Mục | Phân loại | Ghi chú |
|---|---|---|
| `docs/`, `.mcp.json`, `assets/` | GIỮ | |
| `ned_program/` | GIỮ | Không sửa (việc của T1.5) |
| `ned-mock-dapp/` | **XOÁ** | Bản sao độc lập của dApp test; dApp Browser dùng bản nhúng `constants/mockDAppHtml.ts` |
| `ned-hub/` | Đã xoá khỏi git từ T0.2 | Thư mục rác trên máy đã xoá (mục 7) |
| `ned-wallet/app`, `components`, `hooks`, `services`, `stores`, `contexts`, `constants`, `locales` | GIỮ (đã lọc) | Chi tiết ở dưới |
| `ned-wallet/src/*` | **GỘP–DI CHUYỂN** | Xem mục 3 |
| Privy (`@privy-io/expo`, `PrivyProvider`, `scripts/patch-privy.js`) | TẠM GIỮ | Theo yêu cầu, tới Phase 1 |

## 2. Đã xoá

| File / thư mục | Lý do |
|---|---|
| `app/shake-room.tsx`, `app/coin-toss-room.tsx`, `app/geo-redpacket.tsx` | Tính năng bị loại; kèm route trong `_layout.tsx` và 2 thẻ trong Transfer Hub |
| `contexts/GlobalPresenceContext.tsx`, `components/AirDropUserIcon.tsx` | Presence / chỉ dùng cho Shake |
| Hàm Geo-Red Packet + haversine trong `services/identity`, `GEO_REDPACKET_TREASURY` trong `services/solana.ts` | Chỉ phục vụ Geo-Red Packet |
| `services/notificationService.ts` | Broadcast Supabase Realtime |
| `components/NotificationDetailModal.tsx` | Không ai import |
| `components/PhantomAuthButton.tsx` (+ ô trên màn đăng nhập) | Liên kết ví ngoài |
| `src/components/ConnectWalletButton.tsx`, `WalletSelectorModal.tsx` | Liên kết ví ngoài, không ai import |
| `app/onConnect.tsx`, `onSignMessage.tsx`, `onSignTransaction.tsx` | Route callback deep link của Phantom |
| `app/developer-mode.tsx`, `app/settings/developer.tsx` (+ thẻ trong Settings) | Màn dev đổi mạng; mạng mặc định lấy từ `EXPO_PUBLIC_SOLANA_CLUSTER` |
| `src/components/TestInitProfile.tsx`, `TransferScreen.tsx`, `src/hooks/useInitProfile.ts`, `useTransferStablecoin.ts` | Màn/hook thử, không ai import |
| `scratch.js`, `test.js`, `test_tx.js`, `test_browser.html`, `test-stablecoin.ts` (+ script `test:stablecoin`) | File nháp |
| `ned-wallet/Process.md` | Trùng y hệt `ned-wallet/docs/Process.md` (giữ bản trong `docs/`) |
| `scripts/reset-project.js` (+ script `reset-project`) | Script mẫu create-expo-app; chạy nhầm sẽ chuyển `app/` sang `app-example/` |
| `services/supabase.ts`, dependency `@supabase/supabase-js` | Gỡ Supabase |
| `sponsorAndBroadcastTransaction` trong `services/solana.ts` | Helper relayer, không còn ai gọi |
| Đoạn tải `mini_apps` từ Supabase ở tab dApps | Giữ danh sách tĩnh |

## 3. Đã gộp / di chuyển / thay thế

| Từ | Sang | Ghi chú |
|---|---|---|
| `src/idl/` | `idl/` | |
| `src/utils/anchorClient.ts` | `services/anchorClient.ts` | |
| `src/providers/WalletProvider.tsx` | `contexts/WalletProvider.tsx` | |
| `src/poc/` | `poc/` | Code PoC Dynamic — gộp vào `services/auth` ở T1.2 |
| `services/identity.ts` | `services/identity/legacy.ts` | `services/identity/index.ts` re-export → mọi import cũ giữ nguyên |
| `hooks/useNotificationRealtime.ts` | `hooks/useNotificationSync.ts` | Chỉ giữ phần polling on-chain (bỏ kênh Supabase) |
| `services/supabase.ts` | `services/profile.ts` | Cùng chữ ký hàm, lưu **AsyncStorage** |
| `stores/useWalletCardsStore.ts` | (tại chỗ) | Ví con chỉ lưu AsyncStorage theo ví |

Khung mới (chỉ comment mục đích): `services/auth/index.ts`, `services/identity/index.ts`, `services/jupiter/index.ts`, `stores/useWalletModeStore.ts`.

## 4. Tạm giữ (kèm lý do)

| Mục | Lý do | Xử lý ở |
|---|---|---|
| Privy + `scripts/patch-privy.js` + `postinstall` | Yêu cầu T0.5: app vẫn cần để đăng nhập | T1.2 / T1.4 |
| `contexts/WalletProvider.tsx` (ví ngoài) | 8 màn cốt lõi còn đọc `useExternalWallet()` (Home, Overview, send, history, settings, scan-qr, username, mini-app, `useOnchainTransfer`); gỡ nó = viết lại logic chọn ví | Phase 1 (thay bằng ví Dynamic) |
| `contexts/MwaProvider.tsx`, `services/mwa/*`, `components/mwa/*` | N.E.D đóng vai ví trả lời Mobile Wallet Adapter cho dApp — không thuộc "liên kết ví ngoài"; không chắc còn cần | Quyết định khi làm dApp Browser (Phase 6) |
| `app/mini-app.tsx`, `hooks/useWeb3Bridge.ts`, `components/MiniAppSignatureModal.tsx`, `constants/mockDAppHtml.ts` | **Đây là dApp Browser** (WebView + cầu nối + modal ký + dApp test) | Giữ |
| `app/notification-detail.tsx`, `NotificationModal`, `NotificationInAppBanner`, `GlobalNotificationManager`, `useNotificationStore` | Chạy trên lịch sử on-chain (Helius), không phụ thuộc Supabase | Giữ; TODO Helius WebSocket |
| `PhoneLinkingModal`, `PhoneManagementModal`, `app/(onboarding)/phone.tsx` | Luồng SĐT — gọi hàm stub | T1.5 (Phone PDA) |
| `scripts/test-connection.ts`, `test-init-tx.ts`, `test-transfer-tx.ts` | Script Anchor chạy local (đọc keypair từ `~/.config/solana/id.json`, không có bí mật trong repo), dùng IDL cũ | Cập nhật hoặc xoá ở T1.5 |
| `scripts/deploy-web.js` (+ `deploy:web`) | Deploy Vercel; hiện dùng GitHub Pages (`predeploy`/`deploy`) — không chắc còn cần | Xoá nếu không dùng Vercel |
| Mẫu create-expo-app không ai import: `components/external-link.tsx`, `haptic-tab.tsx`, `components/ui/*`, `app/modal.tsx`; và `components/neo/NeoBalanceCard.tsx`, `hooks/useUsdcBalance.ts` | Không chắc sẽ dùng lại → giữ theo quy tắc | Dọn khi làm UI mới (Phase 4) |
| Route alias `app/home.tsx`, `login.tsx`, `transfer-hub.tsx`, `(tabs)/card.tsx` | Redirect/alias còn được điều hướng tới | Giữ |
| Chuỗi i18n của tính năng đã xoá (`transferHub.shakeSplit*`, `coinToss*`…) trong `locales/*.json` | Vô hại | Dọn khi làm i18n |
| Comment "Relayer / N.E.D Hub" trong `ned_program/…/lib.rs` và `tests/ned_identity.ts` (5 dòng) | Không được sửa `ned_program` | T1.5 |

## 5. TODO để lại cho Phase 1

- `TODO(T1.5/T1.7)` tại mọi import `services/profile` (7 file) và trong `services/profile.ts`:
  - `checkPhoneExists` → Phone PDA; `getUserProfileByUsername` → Name PDA; `getUserProfileByWallet` / `getUserProfileFromDB` → Reverse PDA + SNS; `upsertUserProfile` → `create_profile` / `link_phone`.
  - `searchUsersOffchain` **trả rỗng**: gõ @username / SĐT trong màn gửi tiền chưa gợi ý người nhận (gửi tới **địa chỉ ví** vẫn chạy).
  - Hồ sơ chỉ lưu **trên thiết bị**: đăng nhập máy khác sẽ phải onboarding lại; `checkPhoneExists` luôn `false`.
- `TODO(T1.5)` trong `PhoneLinkingModal`, `PhoneManagementModal`, `phone.tsx`, `settings.tsx` (link/unlink SĐT).
- `services/identity/legacy.ts` → `dualPda.ts` + `sns.ts` + `phoneKey.ts`.
- `services/auth/` ← gộp `poc/` (T1.2); gỡ Privy, `WalletProvider`, `patch-privy.js` (T1.4).
- `useNotificationSync`: polling 8s → Helius WebSocket.
- Ảnh đại diện giờ lưu data URI cục bộ (`uploadUserAvatarFile`) — quyết định ở Phase 4.

## 6. Kết quả kiểm tra (Bước 7)

| Kiểm tra | Kết quả |
|---|---|
| `grep -ri "supabase\|ned-hub\|relayer"` trong code `ned-wallet` (bỏ node_modules, lockfile) | **0** |
| Cùng lệnh trên cả `ned_program` | 5 dòng comment (xem mục 4 — không được sửa) |
| `npx tsc --noEmit` | **0 lỗi** (main: 0) |
| `pnpm lint` | **103 lỗi / 138 cảnh báo** (main: 152 / 186). Không có lỗi mới: so theo (file, rule), không cặp nào tăng. Cảnh báo `exhaustive-deps` ở `useNotificationSync` đã có ở file cũ |
| `npx expo-doctor` | **21/21** |
| `expo export --platform android` / `web` | Build thành công |
| Mở bản web bằng Chromium headless (origin github.io) | `/`, `/poc-dynamic`, `/miniapps`, `/send` đều render, **không lỗi JS** |

Lỗi lint có sẵn (không sửa): chủ yếu React Compiler — `react-hooks/refs` 46, `immutability` 26, `set-state-in-effect` 20, `rules-of-hooks` 6, `no-undef` 2, `preserve-manual-memoization` 2, `purity` 1. Nhiều nhất ở `(onboarding)/welcome.tsx` (18), `(auth)/index.tsx` (17), `neo/NeoPhysicalWalletCard.tsx` (11), `Mascot.tsx` (7).

**Chưa kiểm chứng được** (cần tài khoản thật): đăng nhập Privy, xem số dư, gửi USDC tới địa chỉ ví. Code của các luồng này không đổi logic (chỉ đổi đường import / nguồn hồ sơ), nhưng cần bạn thử tay.

## 7. Việc bạn cần tự làm

1. **Thử tay** trên web (`pnpm web` hoặc sau khi deploy):
   1. đăng nhập Privy;
   2. xem số dư;
   3. gửi USDC tới một **địa chỉ ví**;
   4. mở tab dApps → "DApp Test Bridge".
2. ~~Xoá thư mục rác trên máy~~ — **đã xoá** (26/09): `ned-hub/` (`node_modules`, `.env.local`), `ned-mock-dapp/.vercel`, `.vercel/`, `.venv/` ở thư mục gốc. Vẫn cần: đổi Supabase service_role key và rút SOL khỏi ví relayer `b7TF…Wqz` nếu chưa làm.
3. `ned-wallet/.env` / `.env.local` còn `EXPO_PUBLIC_SUPABASE_*`, `EXPO_PUBLIC_SIWS_DOMAIN` — không còn dùng, có thể xoá cho gọn.
4. Nếu dự án Supabase không còn dùng: tắt/xoá project trên Supabase.
5. Quyết định giữ hay xoá `scripts/deploy-web.js` (Vercel) và `MwaProvider`.
