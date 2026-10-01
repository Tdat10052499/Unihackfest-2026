# Tài liệu N.E.D Wallet — định hướng, thiết kế, bàn giao kỹ thuật

Thư mục này gom **mọi thông tin quan trọng** để cả đội (và trợ lý AI lập trình của từng người) có cùng một nguồn sự thật khi phát triển N.E.D Wallet cho UniHackfest 2026 (pitching final **10/10/2026**).

| Đọc gì | Khi nào |
|---|---|
| [`01-dinh-huong-du-an.md`](01-dinh-huong-du-an.md) | Muốn biết **làm gì / không làm gì** và vì sao (lời mentor, ưu tiên, lộ trình 15 ngày, phân công) |
| [`02-thiet-ke/README.md`](02-thiet-ke/README.md) | Cần **danh mục 40 màn hình**, luồng điều hướng, design tokens, cách đọc file thiết kế |
| [`02-thiet-ke/trang-thai-thiet-ke.md`](02-thiet-ke/trang-thai-thiet-ke.md) | Cần chi tiết từng màn và **các quyết định thiết kế đã chốt** |
| [`02-thiet-ke/mascot-brief.md`](02-thiet-ke/mascot-brief.md) | Làm việc với mascot Teddy (vẽ thêm, đặt vào UI) |
| [`03-ky-thuat/dev-handoff.md`](03-ky-thuat/dev-handoff.md) | Bắt tay **code** một tính năng: API Jupiter, nguồn dữ liệu cho từng ô trên màn, kiến trúc AI, các điểm ⚠️ chưa xác minh |
| [`06-strategy-v2/`](06-strategy-v2/README.md) | **Đề xuất hướng đi v2 (01/10/2026)**: "Hụi minh bạch" cho lao động Việt ở nước ngoài, dữ liệu thị trường, pháp lý VN/Nhật, mô hình doanh thu (`unit_economics.py`), lộ trình đến 10/10. Bản tiếng Việt và tiếng Anh |
| [`05-vietnam-strategy-and-revenue-model.md`](05-vietnam-strategy-and-revenue-model.md) | Đề xuất v1 (đã được v2 thay thế), giữ để tra cứu pháp lý |
| [`05-legal/compliance-lead-tasks.md`](05-legal/compliance-lead-tasks.md) | Việc của Compliance Lead, quyết định đã xác nhận với ban tổ chức |

## Nguyên tắc bất di bất dịch

1. **Không đề xuất lại** mini-app platform, Perps, Prediction Market, Gacha (mentor đã loại).
2. Thứ tự ưu tiên: **Swap (P0) → xStocks → Hai chế độ ví → AI (stretch) → dApp Browser**; Simple Earn chỉ làm nếu dư thời gian.
3. Giá/APY **thật từ Jupiter Mainnet**, giao dịch Swap/xStocks/Earn **không broadcast** (Demo mode).
4. Phí N.E.D **0.25%** trên swap/đầu tư, luôn hiển thị rõ trước khi xác nhận.

## Cập nhật tài liệu

- Canvas thiết kế là nguồn mới nhất; khi thiết kế đổi, xuất lại file vào `02-thiet-ke/canvas/` và cập nhật danh mục.
- Quyết định mới → thêm vào mục "Quyết định đã chốt" trong `02-thiet-ke/trang-thai-thiet-ke.md` (ghi ngày + ai quyết).
- Dùng trợ lý AI lập trình? Hãy trỏ nó đọc `docs/README.md` trước khi code. File `CLAUDE.md` ở gốc repo đã liệt kê thứ tự đọc.
- **Lưu ý:** các nguyên tắc ở trên là định hướng gốc (25–27/09). Đề xuất v2 trong `06-strategy-v2/` đổi thứ tự ưu tiên (hụi và gửi về nhà trước, T.E.D hạ ưu tiên); nhóm cần chốt trước khi sửa mục "Nguyên tắc".

## Compliance

- **N.E.D Compliance Hub** (team only, Google Doc): https://docs.google.com/document/d/1JQbL5JY5La6Rzev-gaFV1VUUxMW1AmLJQZgTGjqnErA/edit
- Owner: Nguyễn Minh Chính, Compliance Lead. Send any user-facing text (slides, app copy, README, demo video) for review before it is shown to judges.

