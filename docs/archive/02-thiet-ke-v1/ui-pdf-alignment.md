# Home, Swap và xStocks — đối chiếu PDF

> **Lưu trữ (09/10/2026):** tài liệu thời N.E.D Wallet, chỉ để tra lịch sử, không làm theo. Sản phẩm hiện hành: `docs/09-milestone-lock/`. Xem `archive/README.md`.

Ngày: 28/09/2026. Nhánh `feat/ui-pdf-alignment`, từ `main` tại `698dd7e`.

Phạm vi theo yêu cầu mới nhất: Home, Swap, xStocks. Nguồn: `ned-wallet-ui.pdf` trang 8–11, 13–18, 29–33 và canvas tương ứng. Các màn khác chưa đổi giao diện trong đợt này.

## Thay đổi

- Home: phần đầu chuyển sắc tím sang trắng, cụm avatar/thông báo/QR, số dư lớn, thẻ Cash/Crypto/Stocks, bốn nút Receive/Send/Swap/xStocks, danh sách tài sản. Gỡ số dư và phần trăm mẫu của Home cũ. Làm mới khi focus, kéo xuống và định kỳ khi màn đang mở; tên lấy từ ReverseRecord.
- Thanh điều hướng dạng pill dùng Home/History/xStocks/Settings. History thay vị trí dApps trong PDF vì mini-app platform đã bị cắt. Không thêm Earn hay AI chưa triển khai.
- Swap: thẻ pay/get, đảo chiều, chọn slippage, keypad hỗ trợ dấu phẩy, nút gradient, review/receipt, xác nhận bằng kéo hoặc nút thay thế cho bàn phím/trợ năng. Quote đổi trong review cần Accept. Phí hiển thị bằng đơn vị token/USD, số nhận và ledger trừ phí 0.25%.
- Sửa lỗi hiển thị sẵn có trong Swap: chọn token trước đây chỉ đổi nhãn, quote vẫn SOL/USDC. Bộ chọn hiện chỉ cho giao dịch SOL/USDC; các token khác là danh sách tham khảo có verified/unverified. Chưa mở rộng swap sang mint tuỳ ý.
- xStocks: list/investments/allocation, Teddy curious cho trạng thái chưa đầu tư; chart xanh/đỏ theo biến động với vùng tô, bốn khung dưới chart; vị thế/stats dạng lưới, Buy/Sell cố định dưới màn; số tiền lớn, keypad, review có khối số tiền, disclosure và slide; result dùng Teddy và đường dẫn View position.
- Dùng Space Grotesk/Inter/Space Mono, nền tối và gradient từ theme onboarding. Các component được định dạng lại để dễ chỉnh tiếp.

## Khác biệt có chủ ý so với hình mẫu

- Không dùng số dư, biểu đồ mini, APY hay phần trăm tăng trưởng giả của PDF. Tổng Home là Cash + giá trị đầu tư, SOL tách riêng và ghi rõ. Demo balance không dùng để ký P2P.
- Copy network fee dùng “Demo — not broadcast” cho Swap/xStocks. Không có `/execute`, ký hoặc broadcast trong các màn này.
- Bàn phím hệ thống vẫn dùng được khi chạm ô tiền; keypad trong app là lựa chọn bổ sung.
- Buy xStock lấy quote ở bước Review như luồng hiện có; màn nhập tiền ghi rõ số cổ phần được tính khi review, không bịa ước tính từ giá hiển thị.

## Kiểm tra và giới hạn

- `npx tsc --noEmit`: pass.
- `npx expo export --platform web --platform android --max-workers 2 --output-dir /tmp/ned-ui-export`: pass; còn cảnh báo dependency exports `rpc-websockets`/`@noble/hashes` có từ trước. Lần chạy trước bị gián đoạn; lần kiểm tra cuối exit 0.
- Test Node ledger/xStocks/Jupiter/tokenResponse/amountInput: 5 file pass.
- Lint toàn repo: main 49 errors / 94 warnings; nhánh 48 errors / 71 warnings. Không tăng lỗi theo file/rule; các file thay đổi 0 errors / 0 warnings.
- Đã render bảy màn bằng Chromium ở 390×844 với fixture: Home, Swap, list, detail, buy, review, result; không tràn ngang. Đã xem ảnh và sửa vùng nhập tiền, nút Buy/Sell. Harness tạm mock auth/dữ liệu/icon, không thay auth production. Đây không phải kiểm thử ví thật hay Safari.
- Cần chủ dự án kiểm thử trên Safari iPhone sau deploy; chưa xác nhận thao tác kéo trên thiết bị thật.

## Test tay Safari iPhone

1. Home: kiểm tra username, Receive/Send/Swap/xStocks, History/Settings; kéo refresh. Không có số tiền mẫu. Sau mua/bán Demo, quay Home kiểm tra Cash và xStocks.
2. Swap: nhập `0,1` bằng iOS và keypad; thử xoá, 50%/Max, đảo SOL/USDC, slippage Auto/0.5/1/3%; thiếu số dư phải khoá Review. Review kiểm tra phí, min received, route; chờ quote thay đổi, Accept rồi kéo xác nhận hoặc dùng nút thay thế. Result có nhãn Demo, History có giao dịch Demo.
3. xStocks: list có loading/error/retry/empty; search và sort. Mở AAPLx, đổi 1D/1W/1M/6M, kiểm tra nút Buy/Sell luôn ở đáy. Mua $50, tick disclosure, kéo xác nhận; kiểm tra receipt và View position. Bán 50%, kiểm tra P/L và Cash.
4. Cuộn các màn review/result ở chiều rộng hẹp; kiểm tra CTA và nội dung không bị che khi bàn phím iOS mở. Kiểm tra Network không có `/execute`.

# DesignKit trong code (28/09/2026, đợt 2)

Nguồn: `ned-wallet-ui.pdf` trang 6 (Design Token System) và trang 7 (Typography System), giá trị gốc ở `canvas/Main.dc.html`, `Typography.dc.html`.

## Cấu trúc

- `ned-wallet/constants/design.ts`: toàn bộ token, gồm:
  - `purple` 100–900; `colors` (surfaces #0A0A0A/#141418/#1C1C24/#252530, border #353540, semantic, text hierarchy #FFF/#9CA3AF/#6B7280/#9B4FDE);
  - `glass` (lớp kính trên nền gradient), `light` (nửa dưới sáng của Home), `home`;
  - `gradients` (Primary, Purple→Indigo, Purple→Pink, Deep, nền màn), `dataColors`;
  - `space` (bước 4px), `radius` (8/12/16/20/pill), `fonts`, `sizes` (nút 52, vùng chạm 44), `type` (Display 56 … Label 12, Button 16/600).
- `ned-wallet/components/design/`: `DText`, `Button` (primary/secondary/outline/ghost/destructive), `Card` (default/bordered/accent/filled/glass), `Screen`, `Header`, `IconButton`, `SectionLabel`, `ListGroup`/`ListRow`/`InfoRow`, `Badge`, `Notice`, `Toggle`.
- `components/onboarding/theme.ts` và `components/xstocks/Screen.tsx` giữ API cũ nhưng trỏ vào DesignKit.
- Nạp thêm font `SpaceGrotesk_500Medium` (dùng cho H3). Inter chỉ dùng 400/500/600.

## Màn đã chuyển

Onboarding, Splash, Home, thanh điều hướng, Swap, xStocks (list/detail/trade/review/result), Send, Receive (màn mới `/receive`, thay `DepositModal`), Settings, History, Scan QR, Notifications, 404, modal SĐT. Các file này không còn mã màu viết trực tiếp.

## Khác biệt có chủ ý

- Nút chính theo DesignKit: gradient 2 màu #7B2FBE→#9B4FDE, cao 52 (trước là 3 màu, cao 56).
- Home giữ nửa dưới nền trắng như PDF trang 8.
- Thanh điều hướng chỉ có icon, rộng 256, theo canvas.
- Settings chỉ hiện mục đã có tính năng thật: hồ sơ, QR, chế độ ví (chỉ xem), SĐT, địa chỉ ví, tiền tệ, bảo mật, phiên bản/DEVNET, Sign out. Chưa có App lock, Notifications, Language và nút đổi chế độ ví (việc T4.3).
- Receive bỏ tuỳ chọn VNPAY "Coming soon" của modal cũ.
- i18n mặc định chuyển sang `en` và bỏ qua ngôn ngữ `vi` đã lưu, vì toàn bộ UI là tiếng Anh (quyết định thiết kế số 3).

## Kiểm tra

- `npx tsc --noEmit`: pass.
- Lint toàn repo: trước 48 errors / 71 warnings, sau 48 errors / 64 warnings. Các file đã đổi: 0 errors.
- Test Node: identity 12/12, jupiter 6/6, xstocks 4/4, amountInput 1/1.
- `expo export --platform web --platform android`: exit 0.
- Đã render bằng Chromium ở 390×844 với phiên đăng nhập giả tạm thời (đã gỡ, không commit): Home, Receive, Settings, History, Swap, xStocks, Send, Scan QR, Setup, 404. Không tràn ngang sau khi sửa quầng sáng. Đây không phải kiểm thử ví thật hay Safari.

## Test tay Safari iPhone (bổ sung)

1. Home → Receive: QR, copy username/SĐT/địa chỉ, Share (Safari có share sheet; nếu không có thì chép vào clipboard).
2. Settings: đổi ảnh đại diện, liên kết/huỷ SĐT (xem phí SOL), copy địa chỉ, Sign out → Welcome.
3. History: lọc All/Received/Sent/Rewards, tìm kiếm, copy chữ ký, mở Explorer; chữ hiển thị tiếng Anh.
4. Onboarding và Send: nút chính cao 52, màu gradient mới; luồng Send vẫn hiện phí mạng thật.

# Sửa icon, font và hiệu ứng (28/09/2026, đợt 3)

## Nguyên nhân mất icon và sai font trên web

Nhánh `gh-pages` còn sót `.gitignore` cũ có dòng `*/node_modules/`. Expo xuất font chữ và font icon (Feather, Ionicons) vào `dist/assets/node_modules/…`, nên git bỏ qua toàn bộ 46 file `.ttf` khi deploy. Kết quả trên web: icon trống, chữ dùng font hệ thống.

- `scripts/gh-pages-gitignore.js` chạy cuối `predeploy`: ghi `dist/.gitignore` rỗng để ghi đè file cũ, và dừng deploy nếu không tìm thấy file `.ttf`.
- `app/_layout.tsx` chờ font nạp xong mới vẽ app; nếu nạp lỗi thì vẫn vẽ. Bỏ Inter 700 vì không thuộc DesignKit.
- Nhánh `gh-pages` còn các thư mục cũ không liên quan (`ned-wallet/`, `ned_program/`, `ned-mock-dapp/`), nên dọn khi có dịp.

## Hiệu ứng lấy từ canvas

- `shadows` trong `constants/design.ts`: header pill, thanh điều hướng, thẻ ví mini, ô thao tác, nút kéo xác nhận, nút Google, thẻ QR, popover, núm công tắc, vầng sáng thành công, vòng focus, icon splash.
- `blur.glass` (18px): header pill trên Home, chỉ có hiệu lực trên web.
- `orbs`: quầng sáng riêng cho từng board (Welcome, Setup, Receive, Settings/History, Swap, xStocks list/detail/buy/sell/review, kết quả thành công, hero Home). Board nào không có quầng sáng thì code cũng tắt.
- Home: hero dùng dải màu smoothstep 7 mốc; thẻ ví mini 64×40 có watermark Teddy line-art và thẻ "+" nét đứt dẫn tới Receive; phần xu của số dư mờ 72%; avatar dùng Teddy line-art.
- Công tắc theo Settings: 50×30, bật #9B4FDE, núm có bóng. Sign out dùng biến thể `destructiveSoft`. Bảng Max price change của Swap dạng popover. Kết quả mua/bán xStocks dùng vòng tick phát sáng (PDF trang 15).

## Kiểm tra

- Chromium 390×844 với phiên giả (đã gỡ) trên 9 màn: mọi phần tử chữ dùng font DesignKit, icon hiển thị đủ, font không lỗi 404, không tràn ngang.
- `tsc` pass. Lint 48 errors (có từ trước) / 63 warnings. Test identity/jupiter/xstocks pass. `npm run predeploy`: xuất 46 file font.
