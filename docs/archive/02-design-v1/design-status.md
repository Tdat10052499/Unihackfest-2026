# N.E.D Wallet — Trạng thái thiết kế (Design Artifact) (cập nhật 26/09/2026, v85)

> **Lưu trữ (09/10/2026):** tài liệu thời N.E.D Wallet, chỉ để tra lịch sử, không làm theo. Sản phẩm hiện hành: `docs/09-milestone-lock/`. Xem `archive/README.md`.

## 1. Thông tin Artifact

- **Artifact URL**: `https://claude.ai/artifact/JvAg5gy7bAg5hDqvz74huY`
- **Artifact Type**: Design (canvas) — `.dc.html` format
- **Version hiện tại**: 85 (version id `1790406521-ec8c`) — Trợ lý AI "Plan my money" (v85);  Home chế độ Simple (v84); Settings + chế độ ví (v83); Swap đủ luồng (v82); Simple Earn (v81); Send & Receive (v80); Home V4 + Wallet cards (v67–v72); Splash không loader (v66); Onboarding (v63); Investments nhiều khoản (v62); xStocks (v57)
- **Ngôn ngữ mặc định**: **ENGLISH** (đã chuyển toàn bộ từ tiếng Việt sang tiếng Anh ở Version 55-56)

## 2. Canvas Layout — canvas.json

```json
{
  "boards (thứ tự order)": {
    "Main.dc.html": { "x": 0, "y": 0, "title": "Color System" },
    "Typography.dc.html": { "x": 1280, "y": 0, "title": "Typography & Spacing" },
    "TEDBotV1.dc.html": { "x": 3451, "y": 0, "title": "T.E.D Bot — Chat" },
    "SwapV1.dc.html": { "x": 2591, "y": 5600, "title": "Swap — Enter amount" },
    "SwapTokenPick / SwapReview / SwapSuccess / SwapFailed": { "x": 3061→4471 (bước 470), "y": 5600 },
    "XStocksList.dc.html": { "x": 2591, "y": 1300, "title": "xStocks — Market" },
    "XStockDetail.dc.html": { "x": 3061, "y": 1300, "title": "xStocks — Stock detail" },
    "XStockBuy.dc.html": { "x": 3531, "y": 1300, "title": "xStocks — Buy" },
    "XStockReview.dc.html": { "x": 4001, "y": 1300, "title": "xStocks — Review (buy)" },
    "XStockSuccess.dc.html": { "x": 4471, "y": 1300, "title": "xStocks — Done (buy)" },
    "XStockSell.dc.html": { "x": 3531, "y": 2264, "title": "xStocks — Sell" },
    "XStockSellReview.dc.html": { "x": 4001, "y": 2264, "title": "xStocks — Review (sell)" },
    "XStockSellSuccess.dc.html": { "x": 4471, "y": 2264, "title": "xStocks — Done (sell)" },
    "OnbSplash.dc.html": { "x": 2591, "y": -1169, "title": "Onboarding — Splash" },
    "OnbWelcome.dc.html": { "x": 3061, "y": -1169, "title": "Onboarding — Welcome" },
    "OnbSetup.dc.html": { "x": 3531, "y": -1169, "title": "Onboarding — Setting up" },
    "OnbProfile.dc.html": { "x": 4001, "y": -1169, "title": "Onboarding — Create profile" },
    "OnbMode.dc.html": { "x": 4471, "y": -1169, "title": "Onboarding — Choose mode" },
    "HomeV4.dc.html": { "x": 2591, "y": 0, "title": "Home V4" },
    "WalletCards.dc.html": { "x": 3021, "y": 0, "title": "Wallet cards" },
    "Receive.dc.html": { "x": 2591, "y": 3400, "title": "Receive" },
    "SendRecipient.dc.html": { "x": 3061, "y": 3400, "title": "Send — Choose recipient" },
    "SendAmount.dc.html": { "x": 3531, "y": 3400, "title": "Send — Amount" },
    "SendReview.dc.html": { "x": 4001, "y": 3400, "title": "Send — Review" },
    "SendSuccess.dc.html": { "x": 4471, "y": 3400, "title": "Send — Sent" }
    // board điện thoại: 390×844, is_interactive: true
  },
  "notes": {"n1": {"text": "NED Wallet Design System — Bold Minimal + Purple Mascot", "x": 0, "y": -120}, "n3": {"text": "Home Screen Directions", "x": 2560, "y": -170}, "onb1": {"text": "Onboarding — New & Returning Users", "x": 2591, "y": -1429}, "xs1": {"text": "xStocks — Buy & Sell Flow", "x": 2591, "y": 1040}, "snd1": {"text": "Send & Receive", "x": 2591, "y": 3140}}
}
```

## 3. Danh sách file trong Artifact

Mỗi board ở mục 2 là một file `project/<tên>.dc.html`; cộng `project/canvas.json`, `BoldGlass.dc.html` và các file `artifact-type/` cố định. **HomeV2 và OnbHome đã bị xoá khỏi canvas (người dùng xoá, 26/09)**; mọi link cũ đã trỏ sang `HomeV4.dc.html`.

## 4. Design Token System

### Colors
- **Primary**: NED Purple `#7B2FBE`
  - /400: `#9B4FDE`
  - /600: `#5A1D9E`
  - /300: `#B87AED`
  - /100: `#F0E4FF`
- **Dark Surfaces**: 
  - Background: `#0A0A0A` → `#080812`
  - Surface 1: `#141418`
  - Surface 2: `#1C1C24`
  - Full gradient: `linear-gradient(170deg, #110822 0%, #0D0618 30%, #080812 60%, #06060E 100%)`
- **Semantic**:
  - Success: `#22C55E` / `#4ADE80`
  - Error: `#EF4444`
  - Warning: `#F59E0B` / `#FBBF24`
  - Info: `#6366F1` / `#818CF8`

### Typography
- **Display/Headings**: `'Space Grotesk', sans-serif`
- **Body**: `'Inter', system-ui, sans-serif`
- **Amounts/Addresses**: `'Space Mono', monospace`
- **Google Fonts link**: `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600&display=swap`

### Visual Effects
- **Glassmorphism**: `backdrop-filter: blur(Xpx)` + semi-transparent backgrounds + subtle borders
- **Ambient orbs**: `radial-gradient(circle, rgba(123,47,190,0.XX) 0%, transparent 65%)` positioned absolute
- **Scrollbar hidden**: `.ned-scroll` class — `scrollbar-width:none; -ms-overflow-style:none; ::-webkit-scrollbar{display:none}`

### Assets
- **Mascot (cũ)**: asset `6aab8bb1ecb5e39c7537fa4a9799ea97` — không còn dùng trên thẻ ví từ v59
- **Mascot line-art (gấu ria mép, nét trắng, nền trong suốt)**: asset `3606719d081640f73145640e612b071e` → `/_blob/3606719d081640f73145640e612b071e` — watermark góc dưới phải thẻ ví HomeV2 (opacity 0.3), v59; logo màn Splash
- Teddy confused `/_blob/195e0aeefc275136e89ec220d2c399a1` (Send — không tìm thấy) · happy `/_blob/22f5490f03888bc46a04dbf909a17ab4` (Send — thành công)
- **Teddy full (bản 16 mood gốc, ~200px, chờ bản @3x)**: curious `/_blob/6b5178b3c2e1fe17910ea565b9a1f09f` (trống Investments) · waving `/_blob/5bb51609a7ff36b0643dc0cc23146ac6` (Welcome) · thinking `/_blob/3385a7c81923ce262d24f4cda7f87bcd` (Setting up) · exciting `/_blob/e22583d8a70ae1fb499f29d477b5e1c9` (Home lần đầu — board đã xoá)

## 5. Chi tiết từng màn hình

### HomeV4.dc.html (Home chính thức, 26/09 — thay HomeV2)
- Layout theo mẫu fintech (tham khảo người dùng gửi): phần trên gradient tím chuyển mượt (≈36 điểm màu, smoothstep) xuống nền trang.
- **Header dạng island**: viên trái = avatar Teddy line-art + "Good morning/afternoon/evening," (theo giờ thiết bị) + "tdat"; viên phải = nút chat T.E.D (chấm vàng) | chuông (chấm tím). Không có ô Search.
- **Total balance** $1,234.56 + viên "▲ +5.23% 24h". **Không có tab Cash/Crypto/Stocks** (đã bỏ theo yêu cầu).
- Hàng thẻ mini Cash / Crypto / Stocks (mở `WalletCards`) + **thẻ nét đứt "+"** (Add money → `Receive`).
- 4 ô thao tác sáng: RECEIVE → `Receive` · SEND → `SendRecipient` · SWAP → `SwapV1` · XSTOCKS → `XStocksList`.
- Phần dưới phẳng (không bottom-sheet/box): dòng **Simple Earn** (4.0% APY on your Cash) + **Your Assets** (USDC, Solana, Apple có sparkline).
- Thanh điều hướng viên thuốc nổi: Home / dApps / xStocks / More. Tweak `sheet` light/dark.

### Home V4 — chế độ Simple/Cash (v84)
- HomeV4 thêm tweak `mode` crypto (mặc định, như cũ) / cash; `HomeCash.dc.html` = vỏ dc-import HomeV4 mode=cash (HomeV4 đã chuyển sang dạng importable: helmet chỉ còn font + body{margin:0}).
- Ở cash: tổng $871.71 (Cash $750 + Investments $121.71, không tính SOL), ▲ +0.18%; thẻ mini chỉ Cash + Stocks; ô SWAP → **EARN** (→ EarnHome); danh sách "Your money": Cash (Ready to spend) + Apple (Investment); dòng mờ "2.45 SOL is kept aside. Switch to Crypto mode in Settings to see it".
- Chuỗi prototype: HomeV4 → Settings (crypto) → Change → SettingsMode → Switch → SettingsSwitched → nút Home → HomeCash.
- **Đã chốt bởi chủ dự án (27/09, Gate D0)**: chế độ Simple thay ô SWAP bằng EARN.

### WalletCards.dc.html (Wallet cards)
- Thẻ dọc 250×360 trượt ngang (Cash / Crypto / Stocks), bấm thẻ ló hoặc chấm phân trang để chuyển; số dư, "Wallet info" (address + username có copy, Network, Holds) và nút thao tác đổi theo thẻ (Stocks: Buy/Sell/Market). Không hiển thị bí mật; ghi chú "same Solana address, never shows private key". Tweak `start`.

### Send & Receive (v80) — 5 artboard
- `Receive` — QR (mẫu trang trí, logo Teddy giữa), @tdat, dòng Username / Phone (che số) / Wallet address có copy, cảnh báo "chỉ nhận USDC/SOL/token Solana", nút Share.
- `SendRecipient` — ô "Phone, @username or name.sol" tự nhận dạng (SĐT ≥9 số / username / .sol / địa chỉ Solana), danh sách Recent, badge N.E.D / .SOL ✓, nhãn **Unverified number**; không tìm thấy → Teddy confused. Dữ liệu thử: @minh, 0901234567 (Lan, unverified), anna.sol.
- `SendAmount` — chip người nhận, bàn phím số, chip $5/$10/$20/$50, ghi chú, "From Cash · $750 available", "No fee", báo vượt số dư. Tweak `recipient` minh/lan.
- `SendReview` — số tiền, người nhận, From/To wallet/Note/Network fee Free/Arrives; nếu SĐT chưa xác minh → hộp cảnh báo; slide to send. Tweak `recipient`.
- `SendSuccess` — Teddy happy, "Sent $25.00", biên nhận, View on Solana Explorer, Done → HomeV4, Send again. (P2P chạy thật trên Devnet nên không gắn nhãn "Demo mode".)

### Swap (v82) — 5 artboard (hàng y=5600, note "Swap — Pick, Review, Done")
- `SwapV1` (Enter amount) — back → HomeV4; nút giới hạn giá (Auto/0.5/1/3%, cảnh báo khi 3%); thẻ You pay (Balance, 50%/Max, chip token → SwapTokenPick) + nút đảo chiều + thẻ You get (estimate); dòng tỷ giá với vòng đếm "Updates in 15s" (app tự lấy quote mới); "N.E.D fee 0.25% · $x" + "Network fee free"; bàn phím số; CTA "Review swap" / "Not enough SOL" / "Enter an amount".
- `SwapTokenPick` — tìm kiếm lọc thật; Your tokens (SOL, USDC) + Popular on Solana (USDT, JUP, JitoSOL, BONK, RAY — giá mẫu), dấu verified; dán địa chỉ → thẻ UNVERIFIED có cảnh báo + xác nhận; không khớp → trạng thái trống; lối tắt "Looking for stocks like AAPLx?" → XStocksList. Tweak `side` from/to.
- `SwapReview` — You pay / You get, bảng Rate, N.E.D fee, Network fee, Price impact, Max price change, Minimum you get, Route Jupiter; đếm giờ quote; tweak `priceMoved` → banner "Price updated … Accept", khoá slide tới khi chấp nhận.
- `SwapSuccess` (importable, tweak `result` success/failed) + `SwapFailed` (vỏ dc-import result=failed): thành công = Teddy happy + nhãn Demo mode + biên nhận (không có link Explorer vì không broadcast); thất bại = Teddy confused, "The price moved more than your limit, so nothing was swapped", Try again → SwapReview.
- Map dữ liệu Jupiter Swap v2 `/order`: số nhận ước tính, ngưỡng tối thiểu, price impact, route, phí nền tảng; **chưa xác minh** tên trường chính xác và việc v2 có slippage tự động hay không → kiểm tra API reference khi code.

### Settings (v83) — 3 artboard (hàng y=6700, note "Settings & Wallet mode")
- `Settings` — tab thứ 4 của thanh điều hướng (HomeV4: nút hồ sơ và nút "…" đều mở Settings). Hồ sơ (Teddy line-art, tdat, @tdat · SĐT che, "Signed in with Google", nút QR → Receive); thẻ **Wallet mode** nổi bật (Simple/Crypto, "Change" → SettingsMode); PREFERENCES: Display currency (USD), Hide balances, Notifications, Language; SECURITY: App lock (Face ID), Wallet protection (MPC by Dynamic, không recovery phrase), New phone? (đăng nhập lại Google), Wallet address → WalletCards; HELP & ABOUT: Ask T.E.D, Terms & Privacy, Version 1.0.0 + nhãn DEVNET; Sign out → OnbWelcome. Công tắc bấm được thật (role=switch). Tweak `mode` cash/crypto, `toast`. File importable.
- `SettingsMode` — 2 thẻ chọn Simple (RECOMMENDED) / Crypto, mỗi thẻ 3 dòng "bạn sẽ thấy gì"; chuyển Crypto → Simple khi đang giữ 2.45 SOL: hỏi **Keep it as SOL** (ẩn khỏi Home) hay **Convert to Cash now** (≈$362.96 sau phí 0.25%); chuyển Simple → Crypto: ghi chú "Nothing is converted". CTA đổi theo lựa chọn; trùng chế độ hiện tại → nút khoá. Tweak `current` crypto/cash.
- `SettingsSwitched` — vỏ dc-import Settings mode=cash toast=true (thông báo "Switched to Simple mode").
- **Giả định chưa chốt**: (a) chuyển sang Simple có hỏi quy đổi crypto đang giữ (mặc định Keep); (b) Swap ở chế độ Simple chưa quyết định (ẩn hay "Convert").

### T.E.D — Plan my money / Trợ lý AI phân bổ tài sản (v85) — 5 artboard (hàng y=7800)
- Điểm vào: chip nổi bật **"Plan my money"** (đầu hàng chip chào của `TEDBotV1`).
- `TEDPlanAsk` — hỏi 5 câu dạng chat có chip (mục đích · khi nào cần tiền · khoản chi lớn sắp tới [gõ tự do, EN/VI] · phản ứng khi giảm 20% · kinh nghiệm). Câu 3 minh hoạ AI: người dùng gõ "Tháng 12 mình cần 5 triệu đóng học phí" → thẻ vàng **UNDERSTOOD FROM YOUR MESSAGE** (Tuition · 5,000,000 VND ≈ $190 · Dec 2026 · Edit). Chip bấm thật, có thể gửi câu gõ. Tweak `start` 0/3/5.
- `TEDPlanResult` — thẻ "Your money plan" $871.71: thanh tỷ trọng + 3 dòng Cash $351.71 (40%) / Earn $320 (37%) / xStocks $200 (23%, gồm Apple $121.71 + SPYx $78.29), mỗi dòng có "vì sao" + dữ liệu (4.0% APY Jupiter Lend…); "What could happen in a year": Tough ≈ −$40 / Typical ≈ +$29 ("Not a promise"); chip hồ sơ + Edit answers; Apply this plan; chip Make it safer / Why SPYx / What is Earn; disclaimer "not financial advice".
- `TEDPlanAdjust` — người dùng gõ tiếng Việt "Làm an toàn hơn…" → T.E.D giải thích + thẻ so sánh trước/sau (Earn 37→46%, xStocks 23→14%, Tough −$40→−$19, Typical +$29→+$26); Keep original / Use safer plan.
- `TEDPlanApply` (importable; tweak `plan` original/safer, `done` 1–3) + `TEDPlanApplySafer` (vỏ plan=safer): 3 bước, bước kế tiếp có nút mở màn có sẵn (EarnDeposit / XStockBuy, "amount filled in"); đủ 3/3 → Teddy happy "Your plan is in place". Ghi chú "T.E.D never moves money on its own".
- Màu tỷ trọng: Cash #3987E5, Earn #199E70, xStocks #9B4FDE (từ bảng đã chạy validator).
- **Số liệu là mẫu**: tỷ giá VND/USD, ngưỡng bộ quy tắc, kịch bản năm xấu/bình thường (Earn 3–4%, xStocks −25%/+8%) là giả định minh hoạ, cần thống nhất khi code.

### TEDBotV1.dc.html (T.E.D Bot Chat)
- Header: Back button → `HomeV4.dc.html`, T.E.D avatar (gradient purple + AI sparkle badge), "T.E.D Bot" title, "Online" status
- Welcome message: "Hey there! I'm T.E.D — your AI assistant for NED Wallet..."
- **Suggestion chips** (Meta AI / Messenger-inspired, Version 55+):
  - Uniform styling: `rgba(255,255,255,0.04)` bg, `rgba(255,255,255,0.1)` border, `14px` border-radius
  - Horizontal scroll, leading emoji, 13px font
  - Welcome chips: 📈 How's SOL today? / 🔄 How to swap tokens / 💼 Analyze my portfolio / 📊 What is xStocks?
- User message: "How's SOL today?" (gradient purple bubble, right-aligned)
- T.E.D Response: Inline SOL price card ($148.12, +3.42%, mini chart) + text analysis
- Follow-up chips: 🤔 Should I buy more? / 📉 Technical analysis
- Input composer: text field "Ask T.E.D anything..." + gradient purple send button


### xStocks flow (v57) — 8 artboard
- `XStocksList` — tiêu đề + badge thị trường Mỹ (mở/đóng), thẻ "Your investments" (tổng, lãi/lỗ, dòng Apple), ô tìm kiếm (lọc thật), chip sắp xếp Top movers / Most traded / A–Z (hoạt động), danh sách 10 mã (monogram, không dùng logo thương hiệu), bottom nav tab xStocks active. Tweak: `marketOpen`.
- `XStockDetail` — giá, % theo khung, banner thị trường đóng cửa, biểu đồ 1D/1W/1M/6M (đổi được; 1W tô vùng "Weekend" khi thị trường đóng), Your position, Market stats (24h volume, Liquidity, Holders, 24/7), "What is an xStock?" thu gọn, CTA Sell/Buy cố định. Tweak: `marketOpen`.
- `XStockBuy` — nhập USD bằng bàn phím số (hoạt động), chip $10/$50/$100/Max, ước tính AAPLx sau phí, Pay with, phí 0.25%, báo lỗi vượt số dư. Tweak: `walletMode` cash (khoá USDC "Cash balance") / crypto (có nút đổi token).
- `XStockSell` — nhập USD, chip 25/50/75%/All, You receive, phí, lãi trên lần bán. Tweak: `walletMode`.
- `XStockReview` — bảng chi tiết lệnh, cảnh báo giá khi thị trường đóng, checkbox công bố rủi ro lần đầu, slide-to-confirm (khoá tới khi tick). Tweak: `side` buy/sell, `firstTime`, `marketOpen`.
- `XStockSuccess` — xác nhận, nhãn "Demo mode · real price, no real funds moved", biên nhận. Tweak: `side`.
- `XStockSellReview`, `XStockSellSuccess` — vỏ mỏng `<dc-import>` Review/Success với `side="sell"`.
- Số liệu trên các board là dữ liệu mẫu (giá AAPLx $243.42 khớp 0.5 AAPLx = $121.71 trên Home).

- **v62 — thẻ "Your investments" nhiều khoản** (XStocksList): tổng + Today + All-time; thanh tỷ trọng ngang (2px gap, đầu bo 4px) + chú thích ticker/% ; tối đa 3 dòng + "See all N investments"; >4 khoản gộp "Other (n)". Màu theo từng mã, cố định (đã chạy validator dataviz, nền tối): AAPLx `#9B4FDE`, NVDAx `#C98500`, SPYx `#3987E5`, TSLAx `#199E70`, Other `#6B6780`. 0 khoản = trạng thái trống với Teddy curious. Tweak `holdings` 0–5.

### Onboarding (v63) — 6 artboard
- `OnbSplash` — **không loader** (v66): tweak `variant` mark (nền tím, icon Teddy line-art nảy + vòng sáng + chữ N.E.D, ~1s) / mascot (Teddy vẫy trồi lên từ đáy); tôn trọng reduced-motion; chạm → Welcome.
- `OnbWelcome` — Teddy waving, "Your money, made simple.", 3 lợi ích (gửi bằng SĐT, cổ phiếu Mỹ từ $1, không phí mạng), **chỉ "Continue with Google"**, dòng Terms/Privacy. Không carousel, không liên kết ví ngoài.
- `OnbSetup` — Teddy thinking, 3 bước tự chạy (Signed in → Securing wallet → Checking profile), dòng "Secured with MPC. No recovery phrase". Tweak `returning`: người quay lại → "Welcome back, tdat!" → HomeV4; người mới → Continue → Profile.
- `OnbProfile` — bước 1/2: username (@, kiểm tra hợp lệ/trùng khi gõ, gợi ý tên khi trùng) + SĐT (VN +84, kiểm tra độ dài, báo SĐT đã liên kết ví khác); hộp công bố "saved on Solana… anyone who knows them can find your wallet; can't change number later"; "Free. N.E.D covers the network fee". Tweak `usernameState` available/taken/empty.
- `OnbMode` — bước 2/2: chọn Simple (Cash, Recommended) hoặc Crypto; Continue → HomeV4.
- `OnbHome` — Home lần đầu $0: thẻ ví Cash, banner "Your wallet is ready!" (Teddy exciting, đóng được), "Add money to get started": Receive (@username/SĐT) + Get test USDC (DEMO, Devnet), quick actions, "No assets yet".

### Simple Earn (v81) — 5 artboard (hàng y=4500, note "Simple Earn")
- `EarnHome` — mở từ dòng Simple Earn trên HomeV4. Thẻ chính: **4.0% APY · variable**, "added every second"; trạng thái `active`: In Earn (số dư tăng) + Earned so far (đếm 6 chữ số thập phân, **tăng nhanh ×40 để thấy được trong prototype**) + ước tính/tháng; trạng thái `empty`: "Your $750 Cash could earn ~$30/year". Bộ ước tính chip $100/$500/$750/$1000 → /tháng, /năm. 3 bước "How it works". Mục thu gọn **Details & risks**: Jupiter Lend USDC vault, pool size (mẫu), **N.E.D fee 0.45% of interest · already in the rate**, principal never charged, withdrawals usually instant*, hộp rủi ro (rate thay đổi, không phải tiền gửi ngân hàng/không bảo hiểm, smart contract, rút có thể bị giới hạn). CTA Withdraw + Deposit/Start earning. Tweak `state` active/empty.
- `EarnDeposit` — từ Cash ($750 available), bàn phím số, chip 25/50/75%/Max, rate + ước tính tháng/năm, slide to deposit.
- `EarnWithdraw` — In Earn $503.42, chip 25/50/75%/All, Available now/You receive/Fee Free; tweak `limited` → hộp cảnh báo "Only $180 can be withdrawn right now" và chặn vượt mức.
- `EarnSuccess` (importable, tweak `side`) + `EarnWithdrawSuccess` (vỏ dc-import side=withdraw) — Teddy happy, nhãn "Demo mode · real rate, no real funds moved".
- Map dữ liệu: APY = `supplyRate` + `rewardsRate` (Jupiter Lend SDK, 1e4 = 100%) trừ spread N.E.D; pool = `totalAssets`; vị thế = `underlyingAssets`/`underlyingBalance`; lãi = số dư − tổng gửi (MMKV). **Chưa thấy trường "rút được ngay"** trong SDK → cần kiểm tra API reference.

## 6. Quyết định thiết kế đã chốt

1. **HomeV4 là Home chính thức (26/09)** — HomeV2 và OnbHome đã xoá khỏi canvas. (HomeV3 cũ vẫn bị loại, không dùng tên này.)
2. **Suggestion chips**: đã redesign từ multi-colored pills → uniform Meta AI-inspired chips (Version 55)
3. **Ngôn ngữ**: tất cả UI text phải bằng tiếng Anh (chuyển đổi hoàn tất ở Version 56)
4. **HomeV3.dc.html**: file tồn tại local nhưng KHÔNG ĐƯỢC publish lên artifact. Không tham chiếu.
5. **xStocks — thanh toán (26/09)**: USDC mặc định. Chế độ Cash: chỉ USDC ("Cash balance"), thiếu USDC thì Quick-Convert SOL→USDC trong một bước, thu phí một lần. Chế độ Crypto: mặc định USDC, có "Pay with" đổi sang SOL/token khác. Bán nhận về USDC.
6. **Chế độ Cash hiển thị xStocks (phương án B, 26/09)**: Home ở Cash mode chia "Cash" (USDC) và "Investments" (xStocks); chỉ ẩn crypto (SOL…). Tự động quy đổi chỉ áp dụng cho crypto, không cho xStocks. → Sửa mô tả Kế hoạch Bước 5.2.
7. **xStocks — danh sách mã**: lấy toàn bộ từ Jupiter Tokens API v2 (tag `stocks`, lọc xStock + verified + ngưỡng liquidity). Bỏ chip ngành (API không có), dùng Top movers / Most traded / A–Z + tìm kiếm. Không sparkline trong danh sách tổng (giới hạn API), chỉ ở holdings.
8. **xStocks — biểu đồ**: GeckoTerminal OHLCV theo pool (miễn phí, không key) + react-native-wagmi-charts; vẽ giá token on-chain (khớp giá quote Jupiter), khung 1D/1W/1M/6M (không có 1Y vì API giới hạn ~6 tháng). Ghi nguồn "Chart by GeckoTerminal".
9. **Ticker đúng chuẩn**: hậu tố "x" (AAPLx, TSLAx…), không dùng xAAPL.
10. **Luồng Sell làm trong đợt này.**
11. **Đăng nhập chỉ bằng Google (26/09)**: bỏ Email OTP và bỏ liên kết ví ngoài Phantom/Solflare → **bỏ Kế hoạch Bước 5.5**; chế độ Crypto chỉ là cách hiển thị khác của cùng ví N.E.D.
12. **Phân biệt người mới / quay lại** bằng reverse PDA `[b"reverse", wallet]` sau khi Dynamic trả ví; thoát giữa chừng → quay lại bước tạo hồ sơ.
13a. **Công tắc chế độ ví Cash/Crypto đặt trong Settings** (chốt 26/09) — Home V4 không còn tab ví.
13c. **Trợ lý AI (26/09, kiến trúc LLM/proxy đã bị thay thế bởi Gate D0 ngày 27/09 bên dưới)**: đặt trong T.E.D (không màn riêng); **không** gợi ý đổi chế độ ví; kiến trúc LLM hiểu + giải thích, bộ quy tắc trong app tính con số; LLM gọi qua **proxy serverless nhỏ** (Cloudflare Worker/Vercel Edge) xác minh JWT Dynamic + rate limit, có thể giữ luôn khoá Jupiter; dự phòng chỉ-quy-tắc khi proxy lỗi. Nhà cung cấp LLM chưa chọn. Mentor chưa thẩm định.
13b. **Earn: hiển thị công khai phí N.E.D** (0.45% lãi, đã tính trong APY) trong mục Details & risks — tạm theo đề xuất, mentor chưa xác nhận thu phí Earn.
13. **SĐT chưa xác minh (tạm theo đề xuất)**: chấp nhận cho demo + nói rõ khi pitching + nhãn "Unverified number" khi gửi lần đầu (sẽ làm ở luồng Send). **Lưu ý riêng tư**: SĐT làm seed PDA là dữ liệu công khai, có thể dò; cân nhắc seed = hash(SĐT) — vẫn dò được vì không gian SĐT nhỏ, nhưng không lộ trực tiếp.

### Gate D0 — chủ dự án chốt ngày 27/09/2026

- **Jupiter Tokens API**: nhúng khoá gói Free vào `EXPO_PUBLIC_JUPITER_API_KEY` trong `ned-wallet/.env` (không commit); chấp nhận khoá public và rủi ro bị dùng hết hạn mức. Swap `/order` dùng keyless **0.5 RPS**, có hàng đợi. Đây là quyết định triển khai; xác minh API qua MCP trước khi code.
- **Trợ lý AI Phase 5 (stretch)**: rule-based, không LLM, không proxy/serverless; giữ kiến trúc không backend. Cắt đầu tiên nếu trễ. Quyết định này thay thế kiến trúc LLM/proxy ở mục 13c.
- **Simple mode**: ô thao tác thứ ba là **EARN**. Earn vẫn chỉ triển khai nếu dư thời gian.
- **Phí**: người dùng tự trả phí mạng + rent SOL devnet; khi triển khai phải thay mọi dòng "Network fee free / N.E.D covers the fee" trong canvas bằng phí thật. Phí N.E.D swap/đầu tư **0.25%**, công khai trước xác nhận; Swap/xStocks/Earn có nhãn "Demo mode", không broadcast.

## 7. Màn hình còn thiếu (cần thiết kế thêm)

Theo project roadmap và bottom nav hiện tại:

| Màn hình | Trạng thái | Ưu tiên | Ghi chú |
|----------|-----------|---------|---------|
| xStocks | ✅ v57 | P1 (cao nhất) | 8 board mua/bán, nối từ Home. Còn thiếu: Home ở Cash mode với mục Investments |
| dApp Browser | ❌ Chưa có | P1 | Tab "dApps" trên bottom nav, chuẩn Phantom/MiniPay |
| Settings | ✅ v83 | P1 | 3 board, kèm công tắc chế độ ví |
| Simple Earn | ✅ v81 | P2 (ngoài phạm vi code 15 ngày) | 5 board, demo mode |
| Onboarding | ✅ v63 | P0 | 6 board, Google-only |
| Send/Receive | ✅ v80 | P0 | 5 board |
| Home V4 + Wallet cards | ✅ v72 | P0 | Home chính thức |
| Swap (pick/review/done/failed) | ✅ v82 | P0 | 5 board |
| Home V4 ở chế độ Cash | ✅ v84 | P0 | tweak `mode` + HomeCash |
| Trợ lý AI Plan my money | ✅ v85 | Stretch (Best AI Product) | 5 board trong T.E.D |

**Thứ tự thiết kế đề xuất (26/09)**: Activity → dApp Browser (thành viên không code)

## 8. Ràng buộc dự án (QUAN TRỌNG)

- **Hạn chót**: Pitching final **10/10/2026**
- **Đội ngũ**: 5 thành viên, chỉ 1 người code (user)
- **Cuộc thi**: UniHackfest 2026
- **KHÔNG được đề xuất lại**: mini-app platform, Perps, Gacha (mentor đã loại trừ)
- **Thứ tự ưu tiên dev**: Swap (P0) → xStocks → Two wallet modes → AI (stretch) → dApp Browser
- **Kiến trúc**: Jupiter Quote API Mainnet cho giá thật, KHÔNG broadcast giao dịch thật (demo Devnet)
- **Phí**: 0.2–0.3% trên swap/đầu tư
