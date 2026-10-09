# N.E.D Wallet — Tổng hợp định hướng dự án

> **Lưu trữ (09/10/2026):** tài liệu thời N.E.D Wallet, chỉ để tra lịch sử, không làm theo. Sản phẩm hiện hành: `docs/09-milestone-lock/`. Xem `archive/README.md`.

> **Cập nhật 02/10/2026:** định hướng sản phẩm trong tài liệu này (Swap là P0, phí 0,25%, xStocks, Earn, AI) đã được thay thế bởi [`09-milestone-lock/`](../09-milestone-lock/README.md) (Milestone Lock cho freelancer). Trạng thái kỹ thuật mới nhất (không backend, không tài trợ gas, người dùng tự trả phí bằng SOL devnet) nằm ở [`progress-log.md`](../progress-log.md) và [`ned-wallet/ARCHITECTURE.md`](../../ned-wallet/ARCHITECTURE.md).

> Bản rút gọn từ tài liệu định hướng trong Project "N.E.D Wallet" (cập nhật 25/09/2026), giữ nguyên các quyết định và số liệu. Đây là **nguồn sự thật về định hướng sản phẩm**; các quyết định thiết kế sau ngày 25/09 nằm ở [`02-design/design-status.md`](02-design-v1/design-status.md) (mục 6) và [`03-engineering/dev-handoff.md`](03-engineering/dev-handoff.md).

## Lưu ý về nguồn & phạm vi tài liệu

Tài liệu này hợp nhất: (1) bản tổng hợp hội thoại trước đó về định hướng N.E.D Wallet (dựa trên tài liệu docx sản phẩm, thư mục Drive mentor, và **bản gỡ băng lời thoại đầy đủ** của mentor Thái Phạm Ngọc Tường — nguồn có độ tin cậy cao nhất), và (2) kết quả đọc trực tiếp mã nguồn repo GitHub `Tdat10052499/Unihackfest-2026` (nhánh mặc định, commit `7c98c16`) để đối chiếu tiến độ thực tế.

## 1. Bối cảnh dự án

N.E.D Wallet là ví thông minh Web3 trên Solana, dự thi **UniHackfest 2026**, hướng đến trải nghiệm "Web2.5".

- **Frontend**: React Native / Expo SDK 57, TypeScript, Zustand, Reanimated, i18next (song ngữ Việt–Anh).
- **Auth & ví (đã chốt 26/09)**: **Dynamic SDK** — đăng nhập **chỉ bằng Google**, ví nhúng **MPC** (không seed phrase), tài trợ phí gas cho người dùng. **Không dùng Privy nữa.**
- **RPC**: Helius. **Lưu trữ cục bộ**: MMKV. **Tên miền**: SNS (`.sol`).
- **Hướng kiến trúc**: không backend riêng; ngoại lệ duy nhất là 1 proxy serverless nhỏ giữ khoá LLM và khoá Jupiter (xem `03-engineering/dev-handoff.md` mục 7).
- ⚠️ **Code trên `main` vẫn là stack cũ**: Privy (`@privy-io/expo`) + Supabase (PostgreSQL + RLS + Realtime) + relayer `ned-hub` (Vercel, 5 giao dịch miễn phí/ngày/user). Việc chuyển sang Dynamic là **hạng mục code chưa làm** (xem mục 8–9).
- **Smart contract**: Anchor `ned_program` (Rust) — hồ sơ người dùng, chuyển stablecoin qua `TransferChecked`, định danh qua PDA (username/số điện thoại → ví).

Monorepo gồm: `ned-wallet/` (app), `ned-hub/` (relayer — thuộc stack cũ), `ned_program/` (on-chain program).

## 2. Nguồn bằng chứng đã dùng

- Tài liệu docx mô tả sản phẩm.
- Mã nguồn repo GitHub (`lib.rs`, `Process.md`, `relayer.ts`, các màn hình app).
- Thư mục Google Drive của mentor.
- **Bản gỡ băng lời thoại đầy đủ** buổi mentor với anh **Thái Phạm Ngọc Tường** — nguồn độ tin cậy cao nhất.

## 3. Định hướng đã xác nhận trực tiếp từ mentor

Tập trung thuần di động. Ba tính năng tích hợp qua **Jupiter** thay vì tự xây, theo thứ tự ưu tiên:

1. **xStocks** (cổ phiếu/ETF mã hoá) — ưu tiên cao nhất: người dùng không cần hiểu blockchain vẫn đầu tư được, an toàn hơn memecoin.
2. **Simple Earn** qua Jupiter Lend (~4,45% APY minh hoạ), gửi/rút USDC một chạm.
3. **dApp Browser mức cơ bản** — chỉ để không bị coi là thiếu.

Mentor **bác bỏ** hướng "nền tảng mini-app cho bên thứ ba"; loại trừ **Perps, Prediction Market, Gacha**, không đua đa chuỗi/ví phần cứng.

**Mô hình doanh thu**: một tỷ lệ phí nhỏ trên hoạt động swap/đầu tư (thay cho "phí nền tảng mini-app" trong pitch deck cũ).

Mentor gợi ý **hai chế độ ví**: "tiền mặt" (tự quy đổi về USDC, thu phí nhỏ mỗi lần swap) và "crypto gốc" (hiển thị đầy đủ từng token).

## 4. Lộ trình đã thống nhất

- **P0**: Swap qua Jupiter Swap API, màn hình xác nhận giao dịch, chỉ di động.
- **P1**: xStocks trước, Simple Earn sau, dApp Browser cơ bản, hai chế độ ví.
- **P2 (không làm)**: mini-app platform, Perps/Prediction/Gacha, VNPAY, đa chuỗi.

## 5. Đối chiếu với hiện trạng repo (commit `7c98c16`)

**Đã có** (stack cũ, sẽ thay phần auth): Auth Privy + ví nhúng Solana; số dư USDC thật qua Helius RPC, lịch sử giao dịch, WebSocket realtime; chuyển P2P qua số điện thoại/username (Supabase), gasless qua `ned-hub`; MWA + Cluster Guard; Shake to Split, Coin Toss Room, Geo-Red Packet; tab MiniApps (danh sách dApp mở trình duyệt nhúng).

**Chưa có**: Jupiter Swap/Quote API thật (`NeoSwapModal` chỉ đổi hiển thị USD↔VND), xStocks, Jupiter Lend, trợ lý AI.

**Lưu ý**: `Process.md` có hai bản giống nhau (`ned-wallet/Process.md`, `ned-wallet/docs/Process.md`) — nên hợp nhất.

## 6. Rủi ro và câu hỏi chưa chốt

- Mâu thuẫn mô hình doanh thu trong pitch deck cũ (cần sửa).
- Tỷ lệ phí chưa có con số chính thức từ mentor.
- Rủi ro pháp lý xStocks tại Việt Nam (giả thuyết, cần xác minh).
- Jupiter Earn API đang beta, cần proof-of-concept.
- Coin Toss Room có thể bị xem là "Gacha" — cần mentor rà soát (suy luận, chưa xác nhận).

## 7. Định hướng AI — giải Best AI Product (15.000.000đ)

Tiêu chí chấm: giá trị AI mang lại, cách tích hợp vào sản phẩm, khả năng dùng thực tế. Hướng cảnh báo lừa đảo đã bị loại (đội khác đã làm). **Hướng đã chọn: trợ lý AI phân bổ tài sản** — hỏi khẩu vị rủi ro ngắn, đọc dữ liệu Jupiter thật (APY Earn, giá xStocks), gợi ý tỷ lệ tiền mặt/đầu tư, giải thích bằng tiếng Việt đơn giản. **Mentor chưa thẩm định hướng này.** (Thiết kế chi tiết: mục "T.E.D — Plan my money" trong tài liệu thiết kế; kiến trúc: `03-engineering/dev-handoff.md`.)

## 8. Quyết định đã chốt ngày 25/09

- **Hạn chót**: pitching final **10/10/2026**.
- **Doanh thu**: phí nhỏ trên swap/đầu tư; **mức tạm 0.2–0.3%** (thiết kế dùng 0.25%).
- **xStocks demo**: giá thật từ Jupiter nhưng **không xử lý tiền thật**.
- **Hai chế độ ví**: làm **logic chuyển đổi thật** — nền cho AI.
- **Tab dApp**: giữ, nâng cấp UI/UX lên chuẩn Phantom/MiniPay (polish, không mở rộng thành nền tảng).
- **Coin Toss Room**: giữ như tính năng phụ, cắt ngay nếu làm lệch trọng tâm.
- **Thứ tự P1**: xStocks trước Simple Earn.
- **Quy mô đội**: 5 thành viên, **chỉ 1 người code**.

### Cập nhật 26/09

- **Auth chuyển từ Privy sang Dynamic**: chỉ đăng nhập Google (bỏ Email OTP), bỏ liên kết ví ngoài (Phantom/Solflare); ví nhúng MPC; gas do N.E.D tài trợ qua Dynamic. Chế độ Crypto chỉ là cách hiển thị khác của cùng ví N.E.D.
- **Phân biệt người mới / quay lại**: tra reverse PDA `[b"reverse", wallet]` trong `ned_program` sau khi Dynamic trả ví.
- **Còn phải chốt** (ảnh hưởng trực tiếp đến code):
  1. **Supabase** bỏ hẳn hay giữ? Nếu bỏ: tra cứu SĐT/username chuyển hoàn toàn sang PDA `ned_program`; nhưng **Shake to Split, Coin Toss Room, Geo-Red Packet đang dựa vào Supabase Realtime** sẽ ngừng chạy.
  2. **`ned-hub` relayer** bỏ hẳn (thay bằng tài trợ gas của Dynamic) hay giữ làm dự phòng?
  3. ⚠️ Chưa xác minh: gói SDK Dynamic cho Expo/React Native và khả năng tài trợ gas trên Solana — kiểm tra tài liệu Dynamic trước khi code.

## 9. Lộ trình 15 ngày (25/09 → 10/10, 1 dev)

### Phân công 4 thành viên không code

1. **Pitch deck**: sửa mô hình doanh thu, bỏ "nền tảng mini-app", cập nhật thứ tự tính năng (xStocks → Earn → dApp Browser).
2. **Pháp lý xStocks tại VN** (và pháp lý tư vấn đầu tư cho trợ lý AI).
3. **Thiết kế UI/UX dApp Browser** theo chuẩn Phantom/MiniPay.
4. **QA / kịch bản demo / video nộp bài**.

### Lịch code

| Ngày | Hạng mục |
| --- | --- |
| 1–4 (25–28/9) | P0 Swap: Jupiter + màn xác nhận + phí |
| 5–8 (29/9–2/10) | xStocks mua/bán, giá thật |
| 9–11 (3–5/10) | Hai chế độ ví (logic thật) |
| 12–13 (6–7/10) | AI (stretch) — **cắt đầu tiên nếu trễ** |
| 14 (8/10) | Lắp UI dApp Browser |
| 15 (9/10) | Buffer, diễn tập |
| 10/10 | Pitching final |

Không đụng trong 15 ngày: Simple Earn (chỉ làm nếu dư thời gian), Coin Toss/Shake to Split/Geo-Red Packet, mini-app/đa chuỗi/VNPAY.

### Ước tính giờ công (dev code 7–8 giờ/ngày)

| Hạng mục | Giờ |
| --- | --- |
| Swap Jupiter (P0) + phí | 18–24h |
| xStocks | 16–20h |
| Hai chế độ ví | 12–16h |
| AI | 10–14h |
| dApp Browser polish | 6–10h |
| Test/tích hợp | 10–14h |
| **Tổng** | **~72–98h** |
| *Chuyển auth Privy → Dynamic (phát sinh 26/09, ước tính của Claude, chưa kiểm chứng)* | *~6–12h* |

⚠️ Hạng mục chuyển auth **chưa có trong ngân sách ban đầu** → tổng có thể lên ~78–110h, sát hoặc vượt ngân sách 90–100h. Nếu thiếu thời gian, AI (stretch) vẫn là mục cắt đầu tiên.

**Kiến trúc Jupiter đã chốt (nền tảng, giữ nguyên khi code)**: Jupiter chỉ có thanh khoản thật trên **Mainnet** → gọi API Mainnet để lấy giá/APY **thật**, nhưng **không broadcast giao dịch** — giả lập kết quả thành công để demo.

## 10. Những phần "ăn tiền"

Xếp hạng theo bằng chứng hiện có: **Swap** (cơ chế thu phí nền) > **xStocks** (khác biệt + doanh thu) > **Hai chế độ ví** (nhân tần suất phí) > **AI** (giải thưởng riêng) > **dApp Browser** (tránh mất điểm).

## 11. Phí trên Earn (đề xuất, chưa qua mentor)

Lấy spread giữa APY gốc và APY hiển thị, chỉ cắt trên phần lãi, không đụng gốc. Thiết kế hiện hiển thị công khai "N.E.D fee 0.45% of interest · already in the rate" trong mục Details & risks. **Cần hỏi mentor trước khi đưa vào pitch.**
