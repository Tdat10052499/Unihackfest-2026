# Kế hoạch code chi tiết — N.E.D Wallet (27/09 → 10/10/2026)

> Tài liệu để **dev + Claude Code** làm theo từng bước. Mỗi task có: mục tiêu, file liên quan, tiêu chí hoàn thành (DoD), ước tính giờ và **prompt dán thẳng vào Claude Code**.
> Soạn ngày 26/09/2026 sau khi khảo sát trực tiếp code trên `main` (commit `205eae4`); **cập nhật 26/09 23:30: bỏ Supabase và `ned-hub`, hệ thống chạy hoàn toàn web3**. Ước tính giờ là **ước tính của Claude, chưa kiểm chứng** — cập nhật lại sau mỗi phase.

---

## 0. Phát hiện quan trọng từ khảo sát code (đọc trước)

| # | Phát hiện | Hệ quả |
|---|---|---|
| F1 | **Repo đang ở Expo SDK 57** (`app.json` → `sdkVersion: 57.0.0`, `expo ~57.0.21`, RN 0.86), nhưng `ned-wallet/AGENTS.md` và `docs/` ghi **SDK 54** | AI sẽ tra sai tài liệu. Sửa ở task T0.1 |
| F2 | 🔴 **Khoá bí mật nằm trong biến public**: `hooks/useOnchainTransfer.ts` đọc `EXPO_PUBLIC_ADMIN_SECRET_KEY` (khoá ví admin/relayer) ngay trong app | Mọi biến `EXPO_PUBLIC_*` bị đóng gói vào app/web (repo còn deploy web lên GitHub Pages). Coi khoá này **đã lộ**: đổi khoá, bỏ khỏi app (task T0.2) |
| F3 | Privy xuất hiện ở **~27 file** (`app/_layout.tsx` bọc `PrivyProvider`, auth, onboarding, send, history, settings, các phòng xã hội, MWA…) + script `postinstall: patch-privy.js` | Chuyển sang Dynamic là việc lớn → Phase 1 |
| F4 | Supabase dùng ở ~15 file: identity/username, ví con (`useWalletCardsStore`), **thông báo realtime**, **Shake/Coin Toss/Geo-Red Packet**, presence | Bỏ Supabase = hỏng các tính năng xã hội + thông báo |
| F5 | `ned_program` thực tế: `UserProfile` PDA `[b"profile", owner]` (1 ví ↔ 1 profile) và `IdentityAccount` PDA `[b"identity", sha256(identifier)]` (SĐT/username **đã được băm**). `register_identity` cần chữ ký `authority` + `payer` (đang là relayer fee payer) | Code hiện tại **chưa** có Dual PDA phone/name/reverse như kế hoạch 25/09 → cần T1.5. Cách băm SĐT (sha256) trong `services/identity.ts` dùng lại được |
| F6 | `ned-hub/api/relayer.ts` đang làm fee payer cho giao dịch | Là "backend" nhỏ **đã chạy được** |
| F7 | Chưa có Jupiter, xStocks, Earn, AI, MMKV (app đang dùng AsyncStorage + SecureStore) | Đúng như kỳ vọng |

### Quyết định kiến trúc (26/09): **bỏ Supabase và `ned-hub` — hoàn toàn web3**

| Chức năng | Trước | Thay bằng (web3) |
|---|---|---|
| Đăng nhập + ví | Privy | Dynamic (Google, ví nhúng MPC V3) |
| Phí giao dịch | Relayer `ned-hub` | **Dynamic SVM Gas Sponsorship** (bật trong Dynamic Console) — chỉ trả **phí giao dịch** |
| Tiền thuê (rent) tạo tài khoản: 3 PDA phone/name/reverse, ATA USDC | Relayer trả | ⚠️ **Người dùng phải có SOL** — tài liệu Dynamic không nói có tài trợ rent. Demo devnet: **nạp sẵn SOL** cho tài khoản demo + nút "Get test SOL" (airdrop devnet, có thể bị giới hạn) |
| Tra cứu SĐT/username → ví | Supabase | **Dual PDA** (theo kế hoạch 25/09): `[b"phone", …]`, `[b"name", username]` — xem T1.5 |
| Ví → tên (lịch sử, người quay lại) | Supabase | **Reverse PDA** `[b"reverse", wallet]` (T1.5) + reverse SNS |
| Tên `.sol` | — | SNS (Bonfida), chỉ đọc, luôn gọi Mainnet |
| Thông báo tiền đến | Supabase Realtime | Helius WebSocket (`accountSubscribe`/`logsSubscribe` trên ATA USDC) + lịch sử on-chain |
| Ví con (`useWalletCardsStore`) | Supabase | Lưu cục bộ (AsyncStorage) |
| Shake to Split · Coin Toss Room · Geo-Red Packet · presence | Supabase Realtime | **Ẩn khỏi bản demo** (được phép cắt theo mục 8 định hướng) |
| Jupiter Swap v2 `/order` | (qua proxy) | Gọi thẳng **keyless 0.5 RPS** — đủ cho demo (quote 15 giây/lần) |
| Jupiter **Tokens API** (danh sách xStocks) | (qua proxy) | ⚠️ **Bắt buộc `x-api-key`** → chọn ở Gate D0 |
| LLM cho trợ lý AI | Proxy | ⚠️ Cần khoá bí mật → chọn ở Gate D0 |

**Hệ quả an toàn**: không còn khoá admin nào trong hệ thống → T0.2 đơn giản hơn. **Hệ quả rủi ro**: ai cũng tự đăng ký được phone PDA cho một SĐT bất kỳ (không OTP) — đã biết, nói rõ khi pitching.

- **Lưu trữ cục bộ**: dùng **AsyncStorage/SecureStore sẵn có** thay vì thêm MMKV.

---

## 1. Cách làm việc với Claude Code

**Nhánh**: mỗi task 1 nhánh `feat/<ten-task>` → PR → merge `main`. Không để Claude Code push thẳng `main`.

**Mẫu prompt chung** (đầu mỗi phiên):
```
Đọc docs/README.md, docs/03-ky-thuat/dev-handoff.md và docs/04-ke-hoach-code.md (task <MÃ TASK>).
Dùng MCP (dynamic / jupiter / solana / expo) để xác minh API trước khi viết code.
Lập kế hoạch ngắn, chờ tôi duyệt, rồi làm trên nhánh feat/<ten>. Chạy `npx tsc --noEmit` và `pnpm lint` trước khi báo xong.
```

**Definition of Done chung**: `tsc` không lỗi · chạy được trên điện thoại (dev build) · không có khoá bí mật trong `EXPO_PUBLIC_*` · UI text tiếng Anh · khớp màn hình thiết kế tương ứng trong `docs/02-thiet-ke/canvas/`.

**Dùng model**: Opus cho task kiến trúc/tích hợp (T1.x, T2.1–T2.3, T5.x); Sonnet cho task UI thuần.

---

## 2. Lịch tổng thể

| Ngày | Phase | Giờ ước tính |
|---|---|---|
| CN 27/09 | **Phase 0** — dọn dẹp, bảo mật, cấu hình, **PoC Dynamic** · **Gate D0** | 6–8h |
| 27–30/09 | **Phase 1** — Privy → Dynamic, nâng cấp program, tài trợ gas, gỡ Supabase | 19–26h |
| 01–03/10 | **Phase 2 (P0)** — Swap Jupiter (keyless) + phí | 15–19h |
| 03–05/10 | **Phase 3** — xStocks mua/bán + biểu đồ | 15–19h |
| 05–06/10 | **Phase 4** — Home V4 + hai chế độ ví + Settings | 12–16h |
| 07/10 | **Phase 5 (stretch)** — AI "Plan my money" | 10–14h |
| 08/10 | **Phase 6** — dApp Browser polish · (Earn nếu dư) | 6–8h |
| 09/10 | **Phase 7** — Test toàn luồng, quay video, diễn tập | 6–8h |
| **Tổng** | | **~92–121h** vs ngân sách ~90–100h |

⚠️ **Vượt ngân sách** (bỏ Supabase + nâng cấp program thêm ~9–12h, bỏ proxy bớt ~4h). Thứ tự cắt nếu trễ: (1) AI Phase 5 → (2) Earn → (3) UI mới cho màn phụ (giữ UI cũ) → (4) biểu đồ xStocks (thay bằng giá + % 24h). **Không cắt**: Phase 1, Phase 2, luồng mua xStocks, công tắc chế độ ví.

**Nguyên tắc UI**: chỉ dựng UI mới cho **các màn trên đường demo** (Onboarding → Home → Swap → xStocks → Settings/Mode → T.E.D). Các màn khác giữ nguyên UI Neo-brutalism cũ.

---

## Phase 0 — Dọn dẹp & cấu hình (27/09, 3–4h)

### T0.1 Sửa thông tin phiên bản + MCP (0.5h)
- Sửa `ned-wallet/AGENTS.md`: link tài liệu Expo → `https://docs.expo.dev/versions/v57.0.0/`.
- Sửa `docs/` chỗ ghi "SDK 54" → "SDK 57".
- Thêm `.mcp.json` ở gốc repo (Dynamic, Jupiter, Solana, Expo).
- **DoD**: `/mcp` trong Claude Code hiện 4 server connected.

```
Task T0.1: repo đang dùng Expo SDK 57 (xem ned-wallet/app.json, package.json) nhưng ned-wallet/AGENTS.md và docs/ ghi SDK 54.
Sửa mọi chỗ ghi SDK 54 thành 57 và link docs Expo thành v57. Tạo .mcp.json ở gốc repo với 4 server http:
dynamic https://www.dynamic.xyz/docs/mcp, jupiter https://developers.jup.ag/docs/mcp, solana https://mcp.solana.com/mcp, expo https://mcp.expo.dev/mcp.
```

### T0.2 🔴 Gỡ khoá bí mật + relayer khỏi app (1h)
- Xoá luồng "client-side relayer" dùng `EXPO_PUBLIC_ADMIN_SECRET_KEY` và mọi lời gọi `ned-hub` (`EXPO_PUBLIC_RELAYER_API_URL`, `EXPO_PUBLIC_HUB_API_URL`, `RELAYER_FEE_PAYER`, `TREASURY_FEE_PAYER`). Tạm thời fee payer = chính ví người dùng (Phase 1 bật tài trợ gas Dynamic).
- Tạo `ned-wallet/.env.example` (không giá trị thật); `.env` trong `.gitignore`.
- **Việc bạn tự làm**: coi ví admin/relayer cũ là **đã lộ** — rút hết số dư, ngừng dùng; build/deploy lại bản web để bundle cũ không còn khoá; tắt project `ned-hub` trên Vercel.
- **DoD**: `grep -rE "ADMIN_SECRET|RELAYER|HUB_API|FEE_PAYER" ned-wallet --include=*.ts*` = 0.

```
Task T0.2 (bảo mật): hệ thống bỏ hẳn ned-hub. Trong ned-wallet, xoá luồng client-side relayer đọc EXPO_PUBLIC_ADMIN_SECRET_KEY
(hooks/useOnchainTransfer.ts) và mọi tham chiếu RELAYER_FEE_PAYER, TREASURY_FEE_PAYER, EXPO_PUBLIC_RELAYER_API_URL, EXPO_PUBLIC_HUB_API_URL.
Fee payer tạm thời = ví người dùng. Tạo ned-wallet/.env.example liệt kê các biến EXPO_PUBLIC_* còn lại (không giá trị). Báo danh sách file đã đổi.
```

### T0.3 Dev build chạy được (1–2h)
- Dynamic/Anchor/native module ⇒ cần **development build** (không dùng Expo Go).
- `eas build --profile development --platform android` (hoặc build local), cài lên máy; `npx expo start --dev-client`.
- **DoD**: app hiện tại (còn Privy) mở được trên điện thoại bằng dev build.

```
Task T0.3: kiểm tra eas.json và app.json, hướng dẫn tôi tạo development build Android cho Expo SDK 57 (dùng MCP expo để tra lệnh đúng).
Không đổi code tính năng. Báo trước các lệnh sẽ tốn thời gian build.
```

### T0.4 PoC Dynamic — cổng GO/NO-GO (3–4h, Opus) — theo "Kế hoạch 25/09", Giai đoạn 0
Trên nhánh `poc/dynamic`, **không đụng code tính năng**:
1. Cài Dynamic SDK cho Expo SDK 57 (tra MCP dynamic), bọc provider tối giản, đăng nhập Google → nhận ví Solana nhúng.
2. Ký và gửi 1 giao dịch memo trên devnet.
3. Bật **SVM Gas Sponsorship** trong Dynamic Console → gửi lại memo từ ví **0 SOL**.
4. **Thử tạo 1 account có rent** (vd. ATA USDC devnet) từ ví 0 SOL → biết chắc rent có được tài trợ không.
5. Đo thời gian `scrypt` trên điện thoại (cho T1.5).
- **GO** nếu 1–3 chạy. Nếu 4 thất bại → áp dụng phương án rent ở T1.6. Nếu 1–2 thất bại sau 4 giờ → dừng lại, bàn phương án khác trước khi đi tiếp.

```
Task T0.4 (PoC, nhánh poc/dynamic, không sửa code tính năng): dùng MCP dynamic tra cách tích hợp Dynamic vào Expo SDK 57.
Làm một màn test riêng (app/poc-dynamic.tsx): đăng nhập Google → hiện địa chỉ ví Solana nhúng → nút "Send memo" (devnet)
→ nút "Create USDC ATA" (devnet) → nút "Benchmark scrypt" (đo ms cho N=2^14, 2^15 với chuỗi +84901234567).
Ghi kết quả từng bước vào docs/poc-dynamic.md, gồm: có tài trợ phí không, có tài trợ rent không, thời gian scrypt.
```

### 🚦 Gate D0 — chốt trước khi sang Phase 1
- [x] Supabase: **bỏ** · `ned-hub`: **bỏ** (26/09).
- [x] Identity: **Phương án C** — username công khai, SĐT tuỳ chọn băm scrypt, 1 SĐT ↔ 1 tài khoản (26/09).
- [ ] Kết quả PoC T0.4: GO / NO-GO; rent có được tài trợ không.
- [ ] **Tokens API (danh sách xStocks) cần `x-api-key`** — chọn 1:
  - (a) Nhúng **khoá gói Free** (1 RPS) vào app (`EXPO_PUBLIC_JUPITER_API_KEY`): lộ được nhưng hậu quả chỉ là người khác dùng hết hạn mức → **khuyến nghị cho demo**;
  - (b) Tạo sẵn **danh sách xStocks tĩnh** (JSON commit vào repo, sinh bằng script lúc dev), giá lấy từ quote Swap keyless.
- [ ] **LLM cho trợ lý AI cần khoá bí mật** — chọn 1:
  - (a) Chấp nhận **1 ngoại lệ**: một hàm serverless nhỏ chỉ giữ khoá LLM (không lưu dữ liệu người dùng);
  - (b) **Bỏ LLM**, trợ lý chạy thuần quy tắc + câu chữ mẫu (phần "AI" yếu đi đáng kể với tiêu chí giải Best AI Product);
  - (c) Bỏ hẳn Phase 5.
- [ ] Chế độ Simple: ô thứ 3 là **EARN** hay **SWAP/Convert**?
Ghi kết quả vào `docs/02-thiet-ke/trang-thai-thiet-ke.md` mục "Quyết định đã chốt".

---

## Phase 1 — Auth Privy → Dynamic + Onboarding (27–29/09, 10–14h)

Thiết kế: `OnbSplash`, `OnbWelcome`, `OnbSetup`, `OnbProfile`, `OnbMode` trong `docs/02-thiet-ke/canvas/`.

### T1.1 Khảo sát & kế hoạch chuyển (1h, Opus)
```
Task T1.1: đọc docs/04-ke-hoach-code.md mục 0 (F3, F5). Dùng MCP dynamic tìm cách tích hợp Dynamic vào Expo SDK 57 / React Native:
đăng nhập Google, ví nhúng Solana (MPC), lấy địa chỉ ví, ký transaction/message, lấy JWT. Liệt kê gói npm cần cài và cấu hình app.json.
Sau đó quét toàn bộ ned-wallet, lập bảng: file dùng Privy → API Privy đang dùng → API Dynamic thay thế. Chưa sửa code, chỉ gửi kế hoạch.
```
- **DoD**: bảng ánh xạ Privy→Dynamic được duyệt; xác nhận Dynamic có hỗ trợ Expo SDK 57.

### T1.2 Dựng provider Dynamic + đăng nhập Google (3–4h)
- Tạo `services/auth/` (hoặc `contexts/AuthProvider.tsx`) bọc Dynamic, xuất hook thống nhất `useAuth()` → `{ user, walletAddress, signTransaction, signMessage, getJwt, logout }` để các màn không phụ thuộc trực tiếp SDK.
- Thay `PrivyProvider` trong `app/_layout.tsx`.
- **DoD**: đăng nhập Google → có địa chỉ ví Solana devnet; đăng xuất được.

```
Task T1.2: theo kế hoạch T1.1, cài Dynamic SDK và tạo hook useAuth() (walletAddress, signTransaction, signMessage, getJwt, logout)
bọc toàn bộ SDK Dynamic trong một chỗ. Thay PrivyProvider trong app/_layout.tsx. Chỉ bật đăng nhập Google.
Chưa sửa các màn khác. Biến môi trường: EXPO_PUBLIC_DYNAMIC_ENVIRONMENT_ID (ID môi trường là public, không phải bí mật).
```

### T1.3 Onboarding mới + phân biệt người mới/quay lại (3–4h)
- Luồng: Splash → Welcome (chỉ "Continue with Google") → Setting up → (có `profile` PDA? → Home : Profile → Mode → Home).
- Người quay lại = **tồn tại reverse PDA `[b"reverse", wallet]`** (sau T1.5).
- Profile: username + SĐT → một lệnh `create_profile` tạo **3 PDA cùng lúc** (T1.5); signer = ví người dùng, phí giao dịch do Dynamic tài trợ, rent do ví người dùng trả (cần SOL — xem T1.6).
- Username/SĐT (đã che) đọc từ reverse PDA.
- **DoD**: người mới đi hết 5 màn; người cũ vào thẳng Home; thoát giữa chừng → mở lại quay về bước Profile.

```
Task T1.3: dựng lại onboarding theo docs/02-thiet-ke/canvas/OnbSplash, OnbWelcome, OnbSetup, OnbProfile, OnbMode (.dc.html là đặc tả UI).
Sau đăng nhập, kiểm tra reverse PDA [b"reverse", wallet] của ned_program (IDL mới sau T1.5): có → Home, không → Profile.
Profile gọi create_profile(username, phone) — tạo 3 PDA phone/name/reverse trong 1 giao dịch, signer = ví người dùng (không còn ned-hub).
OnbMode lưu chế độ ví (cash|crypto) vào AsyncStorage. Bỏ màn Email OTP và nút Phantom.
```

### T1.4 Chuyển các màn còn lại sang useAuth() + gỡ Privy (3–4h)
- Thay mọi import `@privy-io/expo` bằng `useAuth()`; gỡ `@privy-io/expo`, `scripts/patch-privy.js`, `postinstall`, `PhantomAuthButton`, `WalletRecoveryModal`.
- **DoD**: `grep -ri privy ned-wallet --include=*.ts*` = 0.

```
Task T1.4: thay mọi chỗ dùng @privy-io/expo bằng useAuth(). Gỡ gói @privy-io/expo, scripts/patch-privy.js và dòng postinstall,
PhantomAuthButton, WalletRecoveryModal (nếu không còn dùng). Báo danh sách file đã đổi.
```

### T1.5 `ned_program`: identity on-chain — **Phương án C (chốt 26/09 23:45)** (5–7h, Opus)

**Nguyên tắc**: hồ sơ = danh tính công khai do người dùng sở hữu (chỉ username); **SĐT là tuỳ chọn, mặc định tắt, không bao giờ lên chain dạng rõ**; **1 SĐT ↔ 1 tài khoản**.

| PDA | Seeds | Lưu | Tạo bởi |
|---|---|---|---|
| Name | `[b"name", username]` | wallet, created_at, bump | `create_profile` |
| Reverse | `[b"reverse", wallet]` | username, has_phone (bool), created_at, bump | `create_profile` |
| Phone (tuỳ chọn) | `[b"phone_v1", phone_key]` với `phone_key = scrypt(SĐT_E164, APP_SALT)` 32 byte, tính **trong app** | wallet, created_at, bump | `link_phone` |

Instruction:
- `create_profile(username)` → tạo Name + Reverse (nguyên tử). Username: `[a-z0-9_]`, 3–20 ký tự, chữ thường. Trùng → lỗi.
- `link_phone(phone_key: [u8;32])` → yêu cầu `reverse.has_phone == false`; tạo Phone PDA (trùng số → lỗi `PhoneTaken`); đặt `has_phone = true`.
- `unlink_phone()` → đóng Phone PDA của chính mình (hoàn rent), `has_phone = false`.
- (tuỳ chọn) `update_username(new)` → đóng Name cũ, tạo Name mới, sửa Reverse.
- Bỏ `initialize_profile` / `register_identity` / `IdentityAccount` cũ; giữ `transfer_stablecoin`.

Quy tắc phía app:
- Chuẩn hoá SĐT về E.164 (`+849…`) **trước khi băm**; `APP_SALT` là hằng số công khai (chỉ chống bảng tra sẵn, không phải bí mật).
- Tham số scrypt chỉnh để ~0.2–0.5 giây/lần trên máy thật (đo ở T0.4). Kết quả băm của SĐT chính mình và danh bạ được **cache cục bộ**.
- SĐT dạng rõ của chính người dùng chỉ lưu trên máy (SecureStore).
- Gửi theo SĐT: luôn hiện **@username + "Unverified number" + "linked since …"** và bắt xác nhận người nhận.
- Số đã bị chiếm: báo "This number is already linked to another N.E.D account. If it's yours, use your @username."
- Pitch: production = xác minh OTP + attestation, liên kết đã xác minh thay thế liên kết chưa xác minh.

```
Task T1.5: thay phần identity của ned_program theo docs/04-ke-hoach-code.md T1.5 (Phương án C).
Tạo account NameRecord [b"name", username], ReverseRecord [b"reverse", signer] (username, has_phone, created_at), PhoneRecord [b"phone_v1", phone_key 32 byte].
Instruction: create_profile(username) tạo Name + Reverse; link_phone(phone_key) chỉ khi has_phone=false, lỗi PhoneTaken nếu trùng;
unlink_phone() đóng PhoneRecord của signer và hoàn rent; (tuỳ chọn) update_username. Signer = ví người dùng và là payer.
TUYỆT ĐỐI không nhận SĐT dạng rõ làm tham số. Bỏ initialize_profile/register_identity/IdentityAccount, giữ transfer_stablecoin.
Viết test Anchor: tạo hồ sơ, trùng username, link/trùng số/unlink/link lại, has_phone chặn số thứ hai. Chạy program_autofixer (MCP solana).
Hướng dẫn deploy devnet và cập nhật IDL trong ned-wallet/src/idl/. Chưa sửa app.
```

### T1.6 Bật tài trợ gas Dynamic + xử lý rent (2–3h)
- Bật **SVM Gas Sponsorship** trong Dynamic Console (Settings › Embedded Wallets), dùng ví **MPC V3**. Xác minh SDK React Native hỗ trợ.
- Rent: nếu ví < mức cần cho 3 PDA + ATA → hiện hướng dẫn nạp; trên devnet thêm nút **Get test SOL** (`requestAirdrop`, có thể bị giới hạn tần suất) và **nạp sẵn** cho tài khoản demo.
- **DoD**: ví mới (chỉ có SOL devnet vừa airdrop) hoàn tất onboarding; giao dịch gửi USDC không bị trừ SOL phí.

```
Task T1.6: dùng MCP dynamic xác minh SVM Gas Sponsorship có dùng được với SDK React Native/Expo và trên devnet không.
Tích hợp để giao dịch của ví nhúng được tài trợ phí. Tính số SOL rent cần cho 3 PDA (phone/name/reverse) + ATA USDC;
nếu thiếu, hiển thị màn nạp + nút "Get test SOL" (devnet airdrop) theo phong cách thiết kế OnbSetup.
```

### T1.7 Gỡ Supabase (4–5h)
- Tra cứu người nhận theo thứ tự: cache cục bộ → SNS `.sol` (Mainnet) → name PDA → phone PDA (băm SĐT) → địa chỉ ví.
- Lịch sử giao dịch: ví → reverse PDA → reverse SNS → địa chỉ rút gọn (batch `getMultipleAccounts`, cache).
- Thông báo tiền đến → Helius WebSocket trên ATA USDC; bỏ `notificationService`/`useNotificationRealtime` dựa Supabase.
- Ví con → AsyncStorage. **Ẩn** Shake to Split, Coin Toss Room, Geo-Red Packet, presence khỏi điều hướng (giữ file, không build vào luồng demo).
- Gỡ `@supabase/supabase-js`, `services/supabase.ts`.
- **DoD**: `grep -ri supabase ned-wallet --include=*.ts*` = 0; gửi USDC theo SĐT/@username chạy end-to-end trên devnet.

```
Task T1.7: hệ thống bỏ hẳn Supabase. Thay: tra cứu người nhận bằng Dual PDA (name/phone) + SNS (@bonfida/spl-name-service, luôn Mainnet); tên trong lịch sử bằng reverse PDA + reverse SNS;
thông báo tiền đến bằng Helius WebSocket (accountSubscribe/logsSubscribe trên ATA USDC của người dùng); ví con lưu AsyncStorage.
Ẩn Shake to Split, Coin Toss Room, Geo-Red Packet và GlobalPresenceContext khỏi điều hướng. Gỡ @supabase/supabase-js và services/supabase.ts.
Kiểm tra gửi USDC theo SĐT và @username trên devnet.
```

---

## Phase 2 (P0) — Swap Jupiter + phí (30/09–02/10, 18–22h)

Thiết kế: `SwapV1`, `SwapTokenPick`, `SwapReview`, `SwapSuccess`, `SwapFailed`. Kiến trúc: **Mainnet quote, không broadcast** (Demo mode).

### T2.1 (bỏ) — không còn proxy
Swap v2 `/order` gọi **thẳng keyless** (0.5 RPS). Nếu Gate D0 chọn khoá Free cho Tokens API, đặt `EXPO_PUBLIC_JUPITER_API_KEY` (chấp nhận lộ, chỉ là hạn mức miễn phí).

### T2.2 Service Jupiter + danh sách token (4–5h)
- `services/jupiter.ts`: `getOrder()` (keyless), `searchTokens()`, `getTokens(tag)` (Tokens API v2 — theo Gate D0), cờ `verified`. Giới hạn tần suất phía app (hàng đợi, không quá 0.5 req/giây).
- Phí N.E.D **0.25%**: ⚠️ xác minh cơ chế phí nền tảng/referral của Jupiter (dải bps, tỷ lệ Jupiter giữ). Nếu không đặt được 25 bps → hiển thị phí mô phỏng trong Demo mode và ghi rõ trong pitch.
- Quote tự làm mới mỗi 15 giây.
- **DoD**: SOL→USDC trả quote thật mainnet, có min received, price impact, route.

```
Task T2.2: tạo services/jupiter.ts gọi thẳng Jupiter (không proxy): getOrder(inputMint, outputMint, amount, slippage) dùng keyless 0.5 RPS có hàng đợi giới hạn tần suất; tìm token và danh sách token theo Gate D0 (khoá Free hoặc danh sách tĩnh).
Dùng MCP jupiter xác minh: cách thu phí nền tảng (platform/referral fee, dải bps cho phép) để đạt 0.25%; slippage tự động có hay không.
Báo lại kết quả xác minh trước khi code phần phí. Viết hook useSwapQuote() tự làm mới mỗi 15 giây.
```

### T2.3 Màn Swap: nhập, chọn token, review, kết quả (8–10h)
- Theo 5 board Swap. Review: slide-to-confirm, banner "Price updated → Accept". Success: nhãn **Demo mode**, không link Explorer. Failed: slippage vượt giới hạn.
- Thay `NeoSwapModal` (hiện chỉ đổi USD↔VND).
- **DoD**: đi hết luồng Swap trên máy; không gọi `/execute`; hiển thị đúng phí 0.25%.

```
Task T2.3: dựng các màn Swap theo docs/02-thiet-ke/canvas/SwapV1, SwapTokenPick, SwapReview, SwapSuccess (+ SwapFailed = SwapSuccess result=failed).
Dùng useSwapQuote() từ T2.2. KHÔNG gọi /execute: sau slide-to-confirm hiển thị kết quả giả lập với nhãn "Demo mode · real price, no real funds moved".
Thay thế NeoSwapModal. Font: Space Grotesk / Inter / Space Mono như thiết kế.
```

### T2.4 Kiểm thử Swap (2h)
- Test các trường hợp: số dư không đủ, token chưa verify, quote hết hạn, mất mạng.

---

## Phase 3 — xStocks (03–05/10, 16–20h)

Thiết kế: `XStocksList`, `XStockDetail`, `XStockBuy`, `XStockSell`, `XStockReview`, `XStockSuccess`.

### T3.1 Dữ liệu xStocks (3–4h)
- Tokens API v2 tag `stocks` → lọc xStock + verified + ngưỡng liquidity; trường `usdPrice`, `stats24h`, `mcap`, `liquidity`, `holderCount`.
- Vị thế người dùng: số dư token xStock trong ví (Helius).
```
Task T3.1: tạo services/xstocks.ts lấy danh sách xStocks từ Jupiter Tokens API v2 tag "stocks" (xác minh bằng MCP jupiter),
lọc verified + liquidity tối thiểu, sắp xếp Top movers / Most traded / A–Z. Thêm hàm lấy vị thế xStocks trong ví người dùng.
```

### T3.2 Danh sách + chi tiết + biểu đồ (6–7h)
- Biểu đồ: GeckoTerminal OHLCV (miễn phí, ~30 lượt/phút, ~6 tháng) + `react-native-wagmi-charts` (⚠️ kiểm tra tương thích RN 0.86/Reanimated 4). Khung 1D/1W/1M/6M; ghi "Chart by GeckoTerminal". Cache kết quả.
- Banner thị trường Mỹ đóng cửa.
```
Task T3.2: dựng XStocksList (kèm thẻ "Your investments" nhiều khoản) và XStockDetail theo thiết kế.
Biểu đồ lấy OHLCV từ GeckoTerminal theo pool của token; kiểm tra react-native-wagmi-charts chạy được với RN 0.86 + Reanimated 4,
nếu không thì đề xuất thư viện thay thế. Cache dữ liệu biểu đồ để không vượt ~30 request/phút.
```

### T3.3 Mua/Bán (6–8h)
- Dùng lại hạ tầng Swap (USDC ↔ xStock), Review có checkbox công bố rủi ro lần đầu, cảnh báo giá cuối tuần. Demo mode.
- Chế độ Cash: chỉ USDC; Crypto: "Pay with".
```
Task T3.3: dựng XStockBuy, XStockSell, XStockReview (side buy/sell), XStockSuccess theo thiết kế, dùng lại services/jupiter.ts (USDC ↔ xStock).
Lần mua đầu bắt buộc tick công bố rủi ro. Chế độ ví cash: chỉ trả bằng USDC; crypto: cho chọn token trả. Demo mode, không broadcast.
```

---

## Phase 4 — Home V4 + hai chế độ ví + Settings (05–06/10, 12–16h)

Thiết kế: `HomeV4` (tweak `mode`), `HomeCash`, `WalletCards`, `Settings`, `SettingsMode`.

### T4.1 Store chế độ ví (2–3h)
- `stores/useWalletModeStore.ts` (zustand + AsyncStorage): `mode: 'cash' | 'crypto'`, selector lọc tài sản.
- Chuyển Crypto→Simple khi có crypto: hỏi **Keep** / **Convert now** (Convert dùng Swap → USDC, phí 0.25%, Demo mode).
```
Task T4.1: tạo stores/useWalletModeStore.ts (zustand, lưu AsyncStorage) với mode cash|crypto và selector lọc tài sản:
cash chỉ hiện USDC (gọi là "Cash") + xStocks; crypto hiện tất cả. Thêm hành động switchMode(target, {convert}) theo thiết kế SettingsMode.
```

### T4.2 Home V4 (5–6h)
- Tổng số dư, thẻ ví mini + thẻ "+", 4 ô thao tác (ô 3 = EARN hoặc SWAP theo Gate D0), Simple Earn row, Your Assets/Your money.
```
Task T4.2: dựng lại Home theo docs/02-thiet-ke/canvas/HomeV4.dc.html (mode crypto) và HomeCash (mode cash), đọc từ useWalletModeStore.
Số dư thật từ useUsdcBalance/useOnchainBalance + vị thế xStocks. Thanh điều hướng viên thuốc nổi: Home / dApps / xStocks / Settings.
```

### T4.3 Settings + đổi chế độ (4–5h)
```
Task T4.3: dựng Settings và SettingsMode theo thiết kế. Công tắc Hide balances, Notifications, App lock (expo-local-authentication nếu cần).
Đổi chế độ gọi switchMode(); sau khi đổi hiện toast và Home cập nhật ngay. Sign out gọi useAuth().logout().
```

---

## Phase 5 (stretch) — AI "Plan my money" (07/10, 10–14h)

Thiết kế: `TEDPlanAsk`, `TEDPlanResult`, `TEDPlanAdjust`, `TEDPlanApply`. **Cắt đầu tiên nếu trễ.**

### T5.1 Bộ quy tắc phân bổ (2–3h) — chạy trong app, có unit test
- Input: `{goal, horizon, upcoming[], drawdownReaction, experience}` + số dư + APY Earn. Output: `{cash, earn, xstocks}` + lý do.
- Cash = khoản chi sắp tới + đệm; xStocks ≤ 40%, ưu tiên SPYx. **LLM không tạo con số.**

### T5.2 LLM (3–4h) — **tuỳ Gate D0**
- (a) Hàm serverless tối giản chỉ giữ khoá LLM: tool `extract_profile` (JSON schema) + giải thích; không lưu dữ liệu.
- (b) Không LLM: trích xuất bằng chip + mẫu câu, giải thích bằng mẫu soạn sẵn.

### T5.3 Màn trong T.E.D (4–6h)
- Chip "Plan my money" → hỏi 5 câu → kế hoạch → "Make it safer" → Apply (mở EarnDeposit/XStockBuy điền sẵn).
```
Task T5: làm theo docs/03-ky-thuat/dev-handoff.md mục 7 và thiết kế TEDPlanAsk/Result/Adjust/Apply.
(1) services/allocation.ts: bộ quy tắc thuần, có test. (2) phần LLM theo Gate D0 (hàm serverless chỉ giữ khoá LLM, hoặc không LLM).
(3) Màn chat. Nếu LLM lỗi hoặc không dùng LLM, dùng chip + lời giải thích mẫu. Luôn hiển thị "not financial advice".
```

---

## Phase 6 — dApp Browser & Earn (08/10, 6–8h)

- **dApp Browser**: polish tab `miniapps.tsx` theo mockup của thành viên thiết kế (không mở rộng thành nền tảng mini-app).
- **Earn** (chỉ nếu Phase 1–4 xong): Jupiter Lend SDK — `getLendingTokenDetails`, `getUserLendingPositionByAsset`; ⚠️ xác minh trường "rút được ngay".

---

## Phase 7 — Kiểm thử & demo (09/10, 6–8h)

- Chạy kịch bản demo đầy đủ trên máy thật 3 lần: Onboarding → Receive → Swap → Mua xStock → Đổi chế độ Simple → Home Simple → (AI plan).
- Chuẩn bị **tài khoản demo** đã có số dư devnet, và phương án dự phòng (video quay sẵn) nếu mạng hội trường yếu.
- Đóng băng code chiều 09/10; chỉ sửa lỗi chặn.

---

## Sổ rủi ro

| Rủi ro | Khả năng | Ảnh hưởng | Giảm thiểu |
|---|---|---|---|
| Dynamic chưa hỗ trợ tốt Expo SDK 57 / RN 0.86 | Trung bình | Chặn Phase 1 | Xác minh ở T1.1 ngay ngày 27/09; nếu kẹt >4h → hỏi lại hướng |
| Tài trợ gas Dynamic không chạy với RN/devnet | Trung bình | Người dùng phải tự có SOL | Xác minh ở T1.6; dự phòng: nạp sẵn SOL devnet cho tài khoản demo |
| Rent tạo tài khoản không được tài trợ | Cao | Người mới không onboarding được nếu 0 SOL | Airdrop devnet + nạp sẵn; nói rõ khi pitching |
| Đổi schema identity (Dual PDA) làm dữ liệu devnet cũ không dùng được | Chắc chắn | Tài khoản cũ phải tạo lại | Deploy program mới, tạo lại tài khoản demo |
| Phí 0.25% không đặt được qua Jupiter | Cao | Sai con số pitch | Xác minh ở T2.2; nếu không → phí mô phỏng + nói rõ |
| Thư viện chart không chạy trên Reanimated 4 | Trung bình | Trễ Phase 3 | Thay bằng đường giá đơn giản vẽ bằng `react-native-svg` |
| Khoá admin cũ đã lộ | Đã xảy ra | Mất tiền devnet / bị lạm dụng | T0.2: bỏ khoá, rút số dư, tắt `ned-hub` |
| Vượt ngân sách giờ | Cao | Thiếu tính năng | Thứ tự cắt ở mục 2 |
| Mạng yếu khi pitching | Trung bình | Demo hỏng | Video dự phòng, dữ liệu cache |
