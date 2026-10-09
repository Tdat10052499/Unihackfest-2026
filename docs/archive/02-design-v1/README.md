# Thiết kế giao diện N.E.D Wallet

> **Lưu trữ (09/10/2026):** tài liệu thời N.E.D Wallet, chỉ để tra lịch sử, không làm theo. Sản phẩm hiện hành: `docs/09-milestone-lock/`. Xem `archive/README.md`.

> Bản thiết kế gốc nằm trên canvas **Claude Design** "NED Wallet Design System" (bản v85, 26/09/2026). Thư mục này là **bản sao để đội phát triển đọc và code theo**. Khi thiết kế thay đổi, canvas là nguồn mới nhất; hãy xuất lại vào đây.

- **Canvas (xem & bấm thử prototype)**: https://claude.ai/artifact/JvAg5gy7bAg5hDqvz74huY — mặc định **riêng tư**; chủ canvas cần mở quyền trong menu *Share* thì thành viên khác mới xem được.
- **Trạng thái & quyết định thiết kế đầy đủ**: [`design-status.md`](design-status.md)
- **Quy tắc dùng mascot Teddy**: [`mascot-brief.md`](../../02-design/mascot-brief.md)
- **Dữ liệu/API cho từng màn hình**: [`../03-engineering/dev-handoff.md`](../03-engineering/dev-handoff.md)

## Cách đọc các file `.dc.html`

Mỗi file trong [`canvas/`](canvas) là **toàn bộ mã nguồn một màn hình** (HTML + style inline + một class JS nhỏ). Chúng chạy trong runtime của Claude Design nên **mở trực tiếp bằng trình duyệt sẽ không hiển thị đúng**. Dùng chúng như bản đặc tả:

| Trong file | Ý nghĩa khi code React Native |
|---|---|
| `style="..."` trên từng thẻ | Kích thước, màu, bo góc, khoảng cách chính xác (khung 390×844) |
| `{{ten}}` | Giá trị động, được tính trong `renderVals()` ở cuối file |
| `<sc-for list=...>` / `<sc-if value=...>` | Danh sách lặp / hiển thị có điều kiện |
| `<a href="X.dc.html">` | Điều hướng sang màn X |
| `data-props='{...}'` | Các **biến thể/trạng thái** của màn (tweak), ví dụ `mode: crypto / cash` |
| `<dc-import name="X" ...>` | Màn này dùng lại màn X với tham số khác |
| `/_blob/<id>` | Ảnh mascot, xem bảng ánh xạ bên dưới |
| [`canvas.json`](canvas/canvas.json) | Vị trí, tên của mọi màn trên canvas |

**Mẹo**: có thể đưa file `.dc.html` cho trợ lý AI lập trình (Claude Code, Cursor…) kèm yêu cầu "chuyển màn này sang React Native/Expo theo đúng style" — mọi số đo đều nằm sẵn trong file.

### Ánh xạ ảnh `/_blob/<id>` → file trong repo

| `/_blob/…` | File |
|---|---|
| `3606719d081640f73145640e612b071e` | [`assets/mascot/teddy-line-art.png`](../../02-design/assets/mascot/teddy-line-art.png) |
| `5bb51609a7ff36b0643dc0cc23146ac6` | [`teddy-waving.png`](../../02-design/assets/mascot/teddy-waving.png) |
| `3385a7c81923ce262d24f4cda7f87bcd` | [`teddy-thinking.png`](../../02-design/assets/mascot/teddy-thinking.png) |
| `e22583d8a70ae1fb499f29d477b5e1c9` | [`teddy-exciting.png`](../../02-design/assets/mascot/teddy-exciting.png) |
| `6b5178b3c2e1fe17910ea565b9a1f09f` | [`teddy-curious.png`](../../02-design/assets/mascot/teddy-curious.png) |
| `195e0aeefc275136e89ec220d2c399a1` | [`teddy-confused.png`](../../02-design/assets/mascot/teddy-confused.png) |
| `22f5490f03888bc46a04dbf909a17ab4` | [`teddy-happy.png`](../../02-design/assets/mascot/teddy-happy.png) |

Thư mục [`assets/mascot/`](../../02-design/assets/mascot) có đủ 16 cảm xúc (~200px, bản gốc; bản @3x đang chờ — xem mascot brief).

## Design tokens (tóm tắt)

| Nhóm | Giá trị |
|---|---|
| Tím chủ đạo | `#7B2FBE` · 400 `#9B4FDE` · 300 `#B87AED` · 600 `#5A1D9E` |
| Nền | gradient `170deg, #110822 → #0D0618 → #080812 → #06060E`; Home: `#0A0614` |
| Nút chính | `linear-gradient(135deg, #7B2FBE, #9B4FDE, #6366F1)`, cao 56, bo 16 |
| Thành công / Cảnh báo / Lỗi / Info | `#22C55E`·`#4ADE80` / `#F59E0B`·`#FBBF24` / `#EF4444` / `#6366F1` |
| Màu phân bổ (đã kiểm tra tương phản nền tối) | Cash `#3987E5` · Earn `#199E70` · xStocks `#9B4FDE`; mã: AAPLx `#9B4FDE`, NVDAx `#C98500`, SPYx `#3987E5`, TSLAx `#199E70`, Other `#6B6780` |
| Font | Tiêu đề/số lớn **Space Grotesk**; nội dung **Inter**; số tiền/địa chỉ **Space Mono** |
| Chạm | vùng chạm tối thiểu 44px |

Chi tiết: [`canvas/Main.dc.html`](canvas/Main.dc.html) (Color System), [`canvas/Typography.dc.html`](canvas/Typography.dc.html).

## Nguyên tắc chung áp dụng cho mọi màn

- Toàn bộ chữ trên UI bằng **tiếng Anh** (i18n tiếng Việt làm sau).
- Mọi giao dịch tiền đi theo khuôn **Nhập → Review (slide to confirm) → Kết quả**.
- Swap / xStocks / Earn trong demo hiển thị nhãn **"Demo mode · real price/rate, no real funds moved"** (giá thật từ Mainnet, không broadcast). Send P2P chạy thật trên Devnet nên không gắn nhãn.
- Phí N.E.D luôn hiển thị rõ trên màn Review (0.25%).
- Mascot tối đa 1 lần/màn, **không** đặt trên màn nhập số tiền/Review.
- Số liệu trên thiết kế là **dữ liệu mẫu** (số dư $750 Cash, 2.45 SOL, 0.5 AAPLx…).

## Danh mục màn hình (40 màn điện thoại)

Luồng demo chính: Splash → Welcome → Setting up → Profile → Mode → **Home** → (Send / Receive / Swap / xStocks / Earn / T.E.D / Settings).

### Onboarding (người mới & quay lại)

| # | Màn hình (file) | Mục đích | Tweak / biến thể | Đi tới |
|---|---|---|---|---|
| 1 | **Onboarding — Splash**<br>[`OnbSplash.dc.html`](canvas/OnbSplash.dc.html) | Splash không loader: icon Teddy nảy ~1s rồi vào Welcome | `variant`: mark / mascot | OnbWelcome |
| 2 | **Onboarding — Welcome**<br>[`OnbWelcome.dc.html`](canvas/OnbWelcome.dc.html) | Chào mừng, 3 lợi ích, chỉ "Continue with Google" | — | OnbSetup |
| 3 | **Onboarding — Setting up**<br>[`OnbSetup.dc.html`](canvas/OnbSetup.dc.html) | Đăng nhập → bảo mật ví MPC → kiểm tra hồ sơ; phân nhánh người mới/quay lại | `returning` (boolean) | HomeV4, OnbProfile |
| 4 | **Onboarding — Create profile**<br>[`OnbProfile.dc.html`](canvas/OnbProfile.dc.html) | Tạo username + SĐT (kiểm tra trùng), công bố dữ liệu on-chain | `usernameState`: available / taken / empty | OnbMode, OnbSetup |
| 5 | **Onboarding — Choose mode**<br>[`OnbMode.dc.html`](canvas/OnbMode.dc.html) | Chọn chế độ Simple (Cash) hoặc Crypto | — | HomeV4, OnbProfile |

### Home & ví

| # | Màn hình (file) | Mục đích | Tweak / biến thể | Đi tới |
|---|---|---|---|---|
| 1 | **Home V4**<br>[`HomeV4.dc.html`](canvas/HomeV4.dc.html) | Home chính thức: tổng số dư, thẻ ví, 4 thao tác, Simple Earn, Your Assets | `mode`: crypto / cash<br>`sheet`: light / dark | EarnHome, Receive, TEDBotV1, WalletCards, XStocksList |
| 2 | **Wallet cards**<br>[`WalletCards.dc.html`](canvas/WalletCards.dc.html) | Xem/chuyển thẻ ví Cash/Crypto/Stocks + thông tin ví | `start` (int) | HomeV4 |
| 3 | **T.E.D Bot — Chat**<br>[`TEDBotV1.dc.html`](canvas/TEDBotV1.dc.html) | Chat T.E.D; chip "Plan my money" mở trợ lý AI | — | HomeV4, TEDPlanAsk |

### xStocks — Mua

| # | Màn hình (file) | Mục đích | Tweak / biến thể | Đi tới |
|---|---|---|---|---|
| 1 | **xStocks — Market**<br>[`XStocksList.dc.html`](canvas/XStocksList.dc.html) | Thị trường xStocks + thẻ "Your investments" nhiều khoản | `holdings` (int)<br>`marketOpen` (boolean) | HomeV4, XStockDetail |
| 2 | **xStocks — Stock detail**<br>[`XStockDetail.dc.html`](canvas/XStockDetail.dc.html) | Chi tiết mã: giá, biểu đồ 1D/1W/1M/6M, vị thế, thống kê | `marketOpen` (boolean) | XStockBuy, XStockSell, XStocksList |
| 3 | **xStocks — Buy**<br>[`XStockBuy.dc.html`](canvas/XStockBuy.dc.html) | Nhập số tiền mua (USD), Pay with theo chế độ ví | `walletMode`: cash / crypto | XStockDetail, XStockReview |
| 4 | **xStocks — Review (buy)**<br>[`XStockReview.dc.html`](canvas/XStockReview.dc.html) | Xem lại lệnh, cảnh báo thị trường đóng, tick công bố rủi ro, slide to confirm | `side`: buy / sell<br>`firstTime` (boolean)<br>`marketOpen` (boolean) | — |
| 5 | **xStocks — Done (buy)**<br>[`XStockSuccess.dc.html`](canvas/XStockSuccess.dc.html) | Hoàn tất (Demo mode) | `side`: buy / sell | XStockDetail, XStocksList |

### xStocks — Bán

| # | Màn hình (file) | Mục đích | Tweak / biến thể | Đi tới |
|---|---|---|---|---|
| 1 | **xStocks — Sell**<br>[`XStockSell.dc.html`](canvas/XStockSell.dc.html) | Nhập số tiền bán, 25/50/75%/All | `walletMode`: cash / crypto | XStockDetail, XStockSellReview |
| 2 | **xStocks — Review (sell)**<br>[`XStockSellReview.dc.html`](canvas/XStockSellReview.dc.html) | Review (bán) — dùng lại XStockReview side=sell | import `XStockReview` side="sell" | — |
| 3 | **xStocks — Done (sell)**<br>[`XStockSellSuccess.dc.html`](canvas/XStockSellSuccess.dc.html) | Hoàn tất (bán) — dùng lại XStockSuccess side=sell | import `XStockSuccess` side="sell" | — |

### Gửi & Nhận

| # | Màn hình (file) | Mục đích | Tweak / biến thể | Đi tới |
|---|---|---|---|---|
| 1 | **Receive**<br>[`Receive.dc.html`](canvas/Receive.dc.html) | QR + @username + SĐT + địa chỉ ví, cảnh báo mạng | — | HomeV4 |
| 2 | **Send — Choose recipient**<br>[`SendRecipient.dc.html`](canvas/SendRecipient.dc.html) | Nhập SĐT/@username/.sol/địa chỉ, tự nhận dạng, Recent | — | HomeV4, SendAmount |
| 3 | **Send — Amount**<br>[`SendAmount.dc.html`](canvas/SendAmount.dc.html) | Nhập số tiền, ghi chú, kiểm tra số dư | `recipient`: minh / lan | SendRecipient, SendReview |
| 4 | **Send — Review**<br>[`SendReview.dc.html`](canvas/SendReview.dc.html) | Xem lại; cảnh báo SĐT chưa xác minh; slide to send | `recipient`: minh / lan | SendAmount, SendSuccess |
| 5 | **Send — Sent**<br>[`SendSuccess.dc.html`](canvas/SendSuccess.dc.html) | Đã gửi + biên nhận + Explorer | `recipient`: minh / lan | HomeV4, SendAmount |

### Simple Earn

| # | Màn hình (file) | Mục đích | Tweak / biến thể | Đi tới |
|---|---|---|---|---|
| 1 | **Simple Earn**<br>[`EarnHome.dc.html`](canvas/EarnHome.dc.html) | APY, tiền lãi chạy theo giây, ước tính, Details & risks | `state`: active / empty | EarnDeposit, EarnWithdraw, HomeV4 |
| 2 | **Earn — Deposit**<br>[`EarnDeposit.dc.html`](canvas/EarnDeposit.dc.html) | Gửi tiền từ Cash vào Earn | — | EarnHome, EarnSuccess |
| 3 | **Earn — Deposited**<br>[`EarnSuccess.dc.html`](canvas/EarnSuccess.dc.html) | Hoàn tất gửi/rút (Demo mode) | `side`: deposit / withdraw | EarnHome, HomeV4 |
| 4 | **Earn — Withdraw**<br>[`EarnWithdraw.dc.html`](canvas/EarnWithdraw.dc.html) | Rút tiền; trạng thái bị giới hạn rút | `limited` (boolean) | EarnHome, EarnWithdrawSuccess |
| 5 | **Earn — Withdrawn**<br>[`EarnWithdrawSuccess.dc.html`](canvas/EarnWithdrawSuccess.dc.html) | Hoàn tất rút — dùng lại EarnSuccess side=withdraw | import `EarnSuccess` side="withdraw" | — |

### Swap

| # | Màn hình (file) | Mục đích | Tweak / biến thể | Đi tới |
|---|---|---|---|---|
| 1 | **Swap — Enter amount**<br>[`SwapV1.dc.html`](canvas/SwapV1.dc.html) | Nhập số tiền swap, đảo chiều, giới hạn trượt giá, quote tự làm mới | — | HomeV4, SwapReview, SwapTokenPick |
| 2 | **Swap — Pick token**<br>[`SwapTokenPick.dc.html`](canvas/SwapTokenPick.dc.html) | Chọn token, tìm kiếm, cảnh báo token chưa xác minh | `side`: from / to | SwapV1, XStocksList |
| 3 | **Swap — Review**<br>[`SwapReview.dc.html`](canvas/SwapReview.dc.html) | Xem lại swap; trạng thái giá thay đổi cần chấp nhận | `priceMoved` (boolean) | SwapSuccess, SwapV1 |
| 4 | **Swap — Done**<br>[`SwapSuccess.dc.html`](canvas/SwapSuccess.dc.html) | Swap xong (Demo mode) hoặc thất bại | `result`: success / failed | — |
| 5 | **Swap — Failed**<br>[`SwapFailed.dc.html`](canvas/SwapFailed.dc.html) | Swap thất bại (trượt giá) — dùng lại SwapSuccess result=failed | import `SwapSuccess` result="failed" | — |

### Settings & chế độ ví

| # | Màn hình (file) | Mục đích | Tweak / biến thể | Đi tới |
|---|---|---|---|---|
| 1 | **Settings**<br>[`Settings.dc.html`](canvas/Settings.dc.html) | Hồ sơ, Wallet mode, Preferences, Security, About, Sign out | `mode`: crypto / cash<br>`toast` (boolean) | OnbWelcome, Receive, SettingsMode, TEDBotV1, WalletCards, XStocksList |
| 2 | **Settings — Wallet mode**<br>[`SettingsMode.dc.html`](canvas/SettingsMode.dc.html) | Đổi chế độ Simple/Crypto; hỏi xử lý crypto đang giữ | `current`: crypto / cash | Settings, SettingsSwitched |
| 3 | **Settings — After switch**<br>[`SettingsSwitched.dc.html`](canvas/SettingsSwitched.dc.html) | Settings sau khi đổi chế độ (toast) | import `Settings` mode="cash" toast="true" | — |
| 4 | **Home V4 — Simple (Cash) mode**<br>[`HomeCash.dc.html`](canvas/HomeCash.dc.html) | Home ở chế độ Simple (Cash) — dùng lại HomeV4 mode=cash | import `HomeV4` mode="cash" | — |

### T.E.D — Plan my money (AI)

| # | Màn hình (file) | Mục đích | Tweak / biến thể | Đi tới |
|---|---|---|---|---|
| 1 | **T.E.D Plan — Questions**<br>[`TEDPlanAsk.dc.html`](canvas/TEDPlanAsk.dc.html) | 5 câu hỏi dạng chat; AI trích xuất khoản chi từ câu gõ tự do | `start`: 0 / 3 / 5 | TEDBotV1, TEDPlanResult |
| 2 | **T.E.D Plan — Your plan**<br>[`TEDPlanResult.dc.html`](canvas/TEDPlanResult.dc.html) | Kế hoạch Cash/Earn/xStocks + lý do + kịch bản 1 năm | — | TEDPlanAdjust, TEDPlanApply, TEDPlanAsk |
| 3 | **T.E.D Plan — Make it safer**<br>[`TEDPlanAdjust.dc.html`](canvas/TEDPlanAdjust.dc.html) | Điều chỉnh bằng lời ("an toàn hơn") + so sánh trước/sau | — | TEDPlanApplySafer, TEDPlanResult |
| 4 | **T.E.D Plan — Apply**<br>[`TEDPlanApply.dc.html`](canvas/TEDPlanApply.dc.html) | Checklist áp dụng; mỗi bước mở màn có sẵn với số tiền điền sẵn | `plan`: original / safer<br>`done`: 1 / 2 / 3 | TEDBotV1, TEDPlanResult |
| 5 | **T.E.D Plan — Apply (safer)**<br>[`TEDPlanApplySafer.dc.html`](canvas/TEDPlanApplySafer.dc.html) | Apply cho kế hoạch an toàn hơn — dùng lại TEDPlanApply plan=safer | import `TEDPlanApply` plan="safer" done="1" | — |
