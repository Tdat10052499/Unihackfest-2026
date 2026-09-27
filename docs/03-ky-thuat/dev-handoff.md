# Bàn giao kỹ thuật — dữ liệu, API và quyết định cho từng tính năng

> Tổng hợp từ các buổi trao đổi thiết kế (25–26/09/2026). Mỗi mục ghi rõ **đã chốt**, **đề xuất** hay **chưa xác minh**. Trước khi code một tính năng, hãy kiểm tra lại tài liệu API chính thức ở các mục đánh dấu ⚠️.

## 0. Ràng buộc chung

- **Hạn chót**: pitching final 10/10/2026 · 1 người code.
- **Kiến trúc demo (đã chốt)**: gọi Jupiter **Mainnet** để lấy giá/APY/quote **thật**, **không broadcast** giao dịch Swap / xStocks / Earn — giả lập kết quả thành công và hiện nhãn "Demo mode". Send P2P chạy thật trên **Devnet**.
- **Phí N.E.D (đã chốt tạm)**: 0.2–0.3% trên swap/đầu tư; thiết kế dùng **0.25%**.
- **Không làm**: mini-app platform, Perps, Prediction Market, Gacha, đa chuỗi, VNPAY.

### Stack đã chốt (26/09) và việc chuyển từ code cũ

| Hạng mục | Code trên `main` (cũ) | Đã chốt |
|---|---|---|
| Đăng nhập / ví | Privy (`@privy-io/expo`), Email OTP + Google | **Dynamic SDK** — chỉ Google, ví nhúng MPC. **Không dùng Privy** |
| Gas | Relayer `ned-hub` (5 giao dịch/ngày) | ⚠️ **Người dùng tự trả phí** — SVM Gas Sponsorship của Dynamic cần gói Enterprise (xem `docs/poc-dynamic.md`). Tài khoản demo nạp sẵn SOL devnet |
| Backend | Supabase (+ Realtime) | Không backend riêng; ngoại lệ: 1 proxy serverless cho LLM + khoá Jupiter (mục 7) |
| Tra cứu SĐT/username | Supabase | PDA `ned_program` (phone / name / reverse) — **đã deploy devnet (T1.5)**, xem mục 1a |
| Lưu cục bộ | — | AsyncStorage / SecureStore sẵn có (không thêm MMKV) |

**Trạng thái (27/09)**:
- Đã gỡ Privy, Supabase và `ned-hub`.
- Auth chạy trên Dynamic qua `useAuth()` (T1.2/T1.4).
- Identity PDA đã deploy devnet (T1.5).

**Còn lại**: nối màn onboarding / gửi tiền vào identity mới (T1.3); làm màn nạp SOL (T1.6).

## 1. Onboarding (Google-only)

- Bỏ Email OTP và liên kết ví ngoài (Phantom/Solflare). Chế độ Crypto chỉ là cách hiển thị khác của **cùng một ví N.E.D**.
- **Phân biệt người mới / quay lại**: sau khi có ví, tra reverse PDA `[b"reverse", wallet]` của `ned_program`. Có → "Welcome back" → Home. Không → Profile. Thoát giữa chừng → lần sau quay lại bước Profile.
- **Profile**: username (kiểm tra trùng khi gõ) + SĐT (+84). Hiển thị công bố: dữ liệu lưu on-chain, ai biết SĐT/username có thể tìm ra ví, không đổi SĐT được.
- **Riêng tư**: seed của PhoneRecord là `phone_key = scrypt(SĐT)`, không phải SĐT dạng rõ. Vẫn dò được bằng cách thử cả không gian số VN, nhưng scrypt làm việc đó tốn kém. Nói rõ khi pitching.
- Splash: nền đặc + icon, ≤1000 ms, không spinner (theo hướng dẫn splash Android 12).

### 1a. Identity on-chain — `ned_program` (Phương án C, deploy devnet 27/09)

**Program ID**: `8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh` (Anchor 1.1.2). IDL: `ned-wallet/idl/`. Thư viện app: `ned-wallet/services/identity/{dualPda,phoneKey}.ts`.

| Account | Seeds | Dữ liệu | Kích thước | Rent devnet |
|---|---|---|---|---|
| `NameRecord` | `[b"name", username]` | `wallet`, `created_at`, `bump` | 49 B | 899 160 lamports |
| `ReverseRecord` | `[b"reverse", wallet]` | `username` (≤20), `has_phone`, `created_at`, `bump` | 42 B | 863 600 lamports |
| `PhoneRecord` | `[b"phone_v1", phone_key]` | `wallet`, `created_at`, `bump` | 49 B | 899 160 lamports |

Instruction (signer = ví người dùng = payer):

| Instruction | Việc làm | Lỗi chính |
|---|---|---|
| `create_profile(username)` | Tạo Name + Reverse | `InvalidUsername`, `UsernameTaken`, `ProfileAlreadyExists` |
| `link_phone(phone_key: [u8;32])` | Tạo Phone, `has_phone = true` | `PhoneAlreadyLinked`, `PhoneTaken` |
| `unlink_phone()` | Đóng Phone của chính mình (hoàn rent), `has_phone = false` | `NotPhoneOwner` |
| `update_username(new)` | Đóng Name cũ (hoàn rent), tạo Name mới, sửa Reverse | `SameUsername`, `UsernameTaken`, `InvalidUsername` |
| `transfer_stablecoin(amount)` | Giữ nguyên | `InvalidAmount` |

- **Username**: 3–20 ký tự `[a-z0-9_]`, kiểm tra cả on-chain lẫn trong app (`isValidUsername`).
- **phone_key**:
  - chuẩn hoá SĐT di động VN về E.164 (`+84` + 9 số, đầu số 3/5/7/8/9);
  - `phone_key = scrypt(e164, salt "ned-wallet/phone/v1", N=2^15, r=8, p=1, dkLen=32)`, khoảng 0,19 giây trên iPhone Safari, có cache trong bộ nhớ;
  - đổi salt hoặc tham số là đổi toàn bộ khoá, khi đó phải chuyển sang seed mới (`phone_v2`).
- **Chi phí onboarding cho người dùng**: Name + Reverse ≈ **0,00176 SOL**, thêm Phone ≈ 0,0009 SOL, thêm ATA USDC ≈ 0,0015 SOL, cộng phí 5 000 lamports/tx. Tổng dưới 0,005 SOL (xem T1.6).
- **Người quay lại** = đọc được `ReverseRecord` của ví (`fetchReverseRecord`).
- **Tra nhiều mục một lượt** (lịch sử, danh bạ): `fetchReverseRecords`, `fetchPhoneRecords` (`getMultipleAccountsInfo`, 100 mục/RPC).
- **Kiểm chứng**:
  - `cd ned_program && anchor build && cargo test` (10 test LiteSVM);
  - `cd ned-wallet && pnpm test:identity` (unit test SĐT/phone_key);
  - `pnpm identity:devnet -- --fresh` (chạy thật trên devnet).

## 2. Home & hai chế độ ví

- Công tắc chế độ nằm trong **Settings → Wallet mode** (Home không có tab chế độ).
- **Crypto**: hiện mọi token (USDC, SOL, xStocks…); ô thao tác SWAP.
- **Simple (Cash)**: chỉ hiện **Cash** (USDC, đổi tên thành "Cash") + **Investments** (xStocks); ẩn SOL/token khác; ô thứ 3 là **EARN** thay cho SWAP (giả định, chưa được xác nhận). Tổng số dư không tính crypto bị ẩn.
- Tự động quy đổi chỉ áp dụng cho **crypto nhận vào** (→ USDC, thu phí 0.25%), **không** áp dụng cho xStocks.
- Khi chuyển Crypto → Simple mà đang giữ crypto: hỏi người dùng **Keep as SOL** (mặc định, ẩn khỏi Home) hoặc **Convert to Cash now** (tính phí). ⚠️ Đề xuất, chưa chốt.
- Lưu chế độ ở MMKV; Home đọc chế độ để lọc tài sản.

## 3. Swap (P0)

- **Jupiter Swap API v2**: base `https://api.jup.ag/swap/v2`, luồng `/order` → (ký) → `/execute`; bắt buộc header `x-api-key`.
- Demo: gọi `/order` để lấy quote thật, **không** gọi `/execute`.
- Màn hình cần từ quote: số nhận ước tính, số tối thiểu (theo slippage), price impact, route, phí.
- Quote tự làm mới mỗi ~15 giây (app tự gọi lại; vòng đếm trên UI).
- Slippage: Auto / 0.5% / 1% / 3%. ⚠️ Chưa xác minh v2 có slippage tự động hay không; nếu không, app đặt mặc định (vd. 0.5%).
- Trạng thái lỗi đã thiết kế: giá đổi trước khi xác nhận (phải bấm Accept), giá vượt giới hạn → Swap Failed ("nothing was swapped").
- Danh sách token: token của người dùng + Popular; dán địa chỉ token lạ → cảnh báo **UNVERIFIED** (dùng cờ verified của Tokens API).
- **Phí**: ⚠️ referral fee của Jupiter có dải 50–255 bps và Jupiter giữ 20% — **không khớp** mức 0.2–0.3%. Tham số `platformFeeBps` trên `/build` chưa xác minh. Cần kiểm tra trước khi hứa con số phí trong pitch.
- ⚠️ Khoá `x-api-key` không được nhúng vào app (bundle Expo lộ được) → đi qua proxy ở mục 7.

## 4. xStocks

- **Danh sách mã**: lấy toàn bộ từ **Jupiter Tokens API v2**, tag `stocks`; lọc xStock + verified + ngưỡng liquidity. Trường dùng: `usdPrice`, `stats24h`, `mcap`, `liquidity`, `holderCount`. Ticker đúng chuẩn hậu tố **x** (AAPLx, TSLAx…).
- Không có chip ngành (API không có); sắp xếp Top movers / Most traded / A–Z + tìm kiếm.
- **Biểu đồ**: GeckoTerminal OHLCV theo pool (miễn phí, không key, ~30 lượt/phút, lịch sử ~6 tháng) + `react-native-wagmi-charts`; khung 1D/1W/1M/6M; ghi "Chart by GeckoTerminal".
- **Thanh toán**: mặc định USDC. Chế độ Cash chỉ USDC ("Cash balance"); thiếu USDC → Quick-Convert SOL→USDC một bước. Chế độ Crypto có "Pay with". Bán luôn nhận USDC.
- Thị trường Mỹ đóng cửa (cuối tuần): hiện banner, giá lấy từ giao dịch on-chain có thể lệch giá đóng cửa thứ Sáu.
- Lần mua đầu: checkbox công bố rủi ro ("tracks Apple's share price but is not an Apple share…").
- Mua/bán dùng lại hạ tầng Swap (mục 3).

## 5. Gửi & Nhận (P2P)

- Ô người nhận tự nhận dạng: SĐT (≥9 số) / `@username` / `.sol` (SNS) / địa chỉ Solana.
- Tra cứu qua PDA `ned_program`: `@username` → `fetchNameRecord`, SĐT → `getPhoneKey` + `fetchPhoneRecord` (mục 1a). Màn gửi tiền nối vào ở T1.3.
- SĐT chưa xác minh (không OTP) → nhãn **Unverified number** + cảnh báo ở Review. Nói rõ khi pitching.
- Phí mạng: người gửi tự trả (~0,000005 SOL). Nếu người nhận chưa có tài khoản USDC, người gửi trả thêm rent tạo ATA (~0,0015 SOL).

## 6. Simple Earn (Jupiter Lend)

| Trên UI | Nguồn dữ liệu (Jupiter Lend Earn SDK) |
|---|---|
| APY hiển thị | `supplyRate + rewardsRate` từ `getLendingTokenDetails` (đơn vị 1e4 = 100%) **trừ spread N.E.D** |
| Quy mô pool | `totalAssets` |
| Số dư trong Earn | `underlyingAssets` / `underlyingBalance` từ `getUserLendingPositionByAsset` |
| Lãi đã kiếm | số dư hiện tại − tổng đã gửi (lưu MMKV) — SDK không trả sẵn |
| "Rút được ngay" | ⚠️ **Chưa tìm thấy trường này**; Jupiter Lend có giới hạn rút động → kiểm tra API reference |

- Tiền lãi chạy theo giây trên UI (prototype tăng tốc ×40 để thấy; bản thật chạy đúng APY).
- Phí Earn: hiển thị công khai "N.E.D fee 0.45% of interest · already in the rate". ⚠️ Đề xuất, **mentor chưa xác nhận** thu phí Earn.
- Earn nằm ngoài lịch code 15 ngày — chỉ làm nếu dư thời gian.

## 7. Trợ lý AI "Plan my money" (stretch — Best AI Product)

**Quyết định (26/09)**: đặt **trong chat T.E.D**; **không** gợi ý đổi chế độ ví; mentor **chưa thẩm định**.

### Kiến trúc

```
App ── POST /chat (Bearer JWT đăng nhập) ──▶ Proxy serverless (Cloudflare Worker / Vercel Edge)
                                              1. Xác minh JWT đăng nhập Dynamic (JWKS)
                                              2. Rate limit (vd. 20 lượt/người/giờ)
                                              3. System prompt + tool schema cố định ở server
                                              4. Gọi LLM bằng khoá bí mật (secret)
                                              (có thể giữ luôn khoá Jupiter x-api-key)
```

1. **LLM – hiểu**: câu trả lời tự do (vd. "Tháng 12 mình cần 5 triệu đóng học phí") → tool `extract_profile` trả JSON `{goal, horizon, upcoming:[{amount, due}], drawdownReaction, experience}`.
2. **Bộ quy tắc – tính (chạy trong app, xác định, kiểm tra được)**: Cash = khoản chi sắp tới + đệm; phần còn lại chia Earn / xStocks theo điểm rủi ro; xStocks có trần (đề xuất ≤40%) và ưu tiên quỹ chỉ số (SPYx). **LLM không bao giờ tạo con số.**
3. **LLM – giải thích**: viết lý do bằng ngôn ngữ đơn giản; nhận yêu cầu điều chỉnh ("an toàn hơn") → đổi tham số → bộ quy tắc tính lại.
4. **Áp dụng**: mỗi bước mở màn có sẵn (EarnDeposit, XStockBuy) với số tiền điền sẵn; người dùng tự xác nhận. **AI không tự thực hiện giao dịch.**
5. **Dự phòng**: proxy/mạng lỗi → chỉ dùng chip + quy tắc + lời giải thích mẫu.

### Còn mở

- Chọn nhà cung cấp LLM (tiêu chí: tool use/JSON, tiếng Việt, chi phí/hạn mức miễn phí, độ trễ). Thử 5 câu mẫu tiếng Việt trước khi chọn.
- ⚠️ Endpoint JWKS / định dạng JWT của nhà cung cấp đăng nhập — kiểm tra tài liệu.
- ⚠️ Pháp lý: tư vấn đầu tư chứng khoán tại VN có thể là ngành nghề cần phép (Luật Chứng khoán 2019) — chưa xác minh với token hoá. UI luôn ghi "not financial advice".
- Số trên thiết kế là mẫu: tỷ giá 5.000.000 VND ≈ $190; kịch bản 1 năm (Earn 3–4%, xStocks −25%/+8%) cần thay bằng cách tính có căn cứ (vd. từ dữ liệu giá lịch sử GeckoTerminal).
- Prompt injection: rủi ro thấp vì LLM không quyết định số và không giao dịch, nhưng giới hạn chủ đề trong system prompt.

## 8. Settings

- Hồ sơ (tên, @username, SĐT che), Wallet mode, Display currency, Hide balances, Notifications, Language, App lock (Face ID), thông tin bảo mật ví (MPC, không recovery phrase; đổi điện thoại → đăng nhập lại Google), địa chỉ ví, Ask T.E.D, Terms & Privacy, phiên bản + nhãn DEVNET, Sign out.
- Không có "Export private key" trong bản demo.

## 9. Việc còn thiếu (chưa thiết kế)

- **Activity / lịch sử giao dịch** (đã bỏ khỏi Home — cần nơi xem lại).
- **dApp Browser** (giao thành viên thiết kế theo chuẩn Phantom/MiniPay).
- Màn lỗi chung (mất mạng…), Notifications, chi tiết token crypto.
