# Tài liệu N.E.D Wallet — định hướng, thiết kế, bàn giao kỹ thuật

Thư mục này gom **mọi thông tin quan trọng** để cả đội (và trợ lý AI lập trình của từng người) có cùng một nguồn sự thật khi phát triển N.E.D Wallet cho UniHackfest 2026 (pitching final **10/10/2026**).

| Đọc gì | Khi nào |
|---|---|
| [`09-milestone-lock/`](09-milestone-lock/README.md) | **Hướng đi hiện hành, đọc trước khi code (02/10/2026)**: Milestone Lock cho freelancer có khách nước ngoài; ở Việt Nam freelancer chỉ nhận VND qua đối tác chi trả (mô phỏng trong demo). Gồm đặc tả sản phẩm, đặc tả program (byte layout, instruction, test), nhật ký quyết định D1–D28 và danh sách mâu thuẫn đã xử lý. Tiếng Anh |
| [`08-research/`](08-research/README.md) | Nghiên cứu của Compliance Lead: khách hàng, thị trường, đối thủ, đối tác chi trả, pháp lý, rubric, kế hoạch theo ngày. Bắt đầu từ `ned-research-and-compliance.md` |
| [`01-dinh-huong-du-an.md`](01-dinh-huong-du-an.md) | Muốn biết **làm gì / không làm gì** và vì sao (lời mentor, ưu tiên, lộ trình 15 ngày, phân công) |
| [`02-thiet-ke/README.md`](02-thiet-ke/README.md) | Cần **danh mục 40 màn hình**, luồng điều hướng, design tokens, cách đọc file thiết kế |
| [`02-thiet-ke/trang-thai-thiet-ke.md`](02-thiet-ke/trang-thai-thiet-ke.md) | Cần chi tiết từng màn và **các quyết định thiết kế đã chốt** |
| [`02-thiet-ke/mascot-brief.md`](02-thiet-ke/mascot-brief.md) | Làm việc với mascot Teddy (vẽ thêm, đặt vào UI) |
| [`03-ky-thuat/dev-handoff.md`](03-ky-thuat/dev-handoff.md) | Bắt tay **code** một tính năng: API Jupiter, nguồn dữ liệu cho từng ô trên màn, kiến trúc AI, các điểm ⚠️ chưa xác minh |
| [`07-strategy-v3/`](07-strategy-v3/README.md) | Đề xuất v3 (02/10/2026, **đã được `09-milestone-lock/` thay thế**): "Shared Money" (Rotating Fund, Milestone Lock, Group Goal), hai phân khúc khách hàng chờ khảo sát ngày 06/10, pháp lý, mô hình doanh thu (`unit_economics.py`), lộ trình đến 10/10. Tiếng Anh |
| [`06-strategy-v2/`](06-strategy-v2/README.md) | Đề xuất v2 (01/10/2026, đã được v3 thay thế), giữ để tra cứu dữ liệu thị trường và pháp lý |
| [`05-vietnam-strategy-and-revenue-model.md`](05-vietnam-strategy-and-revenue-model.md) | Đề xuất v1 (đã được v2 thay thế), giữ để tra cứu pháp lý |
| [`05-legal/compliance-lead-tasks.md`](05-legal/compliance-lead-tasks.md) | Việc của Compliance Lead, quyết định đã xác nhận với ban tổ chức |

## Nguyên tắc bất di bất dịch

> **Cập nhật 02/10/2026:** nguyên tắc 1 vẫn giữ. Nguyên tắc 2 và 4 đã được thay thế bởi [`09-milestone-lock/`](09-milestone-lock/README.md): ưu tiên P0 nay là Milestone Lock; Swap, xStocks, Earn và dApp Browser bị ẩn khỏi luồng demo; N.E.D không thu phí trong v1 (quyết định D2). Nguyên tắc 3 chỉ áp dụng nếu nhóm vẫn hiển thị Swap/xStocks.

1. **Không đề xuất lại** mini-app platform, Perps, Prediction Market, Gacha (mentor đã loại).
2. Thứ tự ưu tiên: **Swap (P0) → xStocks → Hai chế độ ví → AI (stretch) → dApp Browser**; Simple Earn chỉ làm nếu dư thời gian.
3. Giá/APY **thật từ Jupiter Mainnet**, giao dịch Swap/xStocks/Earn **không broadcast** (Demo mode).
4. Phí N.E.D **0.25%** trên swap/đầu tư, luôn hiển thị rõ trước khi xác nhận.

## Cập nhật tài liệu

- Canvas thiết kế là nguồn mới nhất; khi thiết kế đổi, xuất lại file vào `02-thiet-ke/canvas/` và cập nhật danh mục.
- Quyết định mới → thêm vào mục "Quyết định đã chốt" trong `02-thiet-ke/trang-thai-thiet-ke.md` (ghi ngày + ai quyết).
- Dùng trợ lý AI lập trình? Hãy trỏ nó đọc `docs/README.md` trước khi code. File `CLAUDE.md` ở gốc repo đã liệt kê thứ tự đọc.
- **Lưu ý:** các tài liệu `01-dinh-huong-du-an.md`, `03-ky-thuat/dev-handoff.md`, `04-ke-hoach-code.md` mô tả định hướng gốc (25–27/09, Swap trước). Thông tin kỹ thuật trong đó (stack, Dynamic, program ID, không backend) vẫn đúng; định hướng sản phẩm thì theo `09-milestone-lock/`.

## Compliance

- **N.E.D Compliance Hub** (team only, Google Doc): https://docs.google.com/document/d/1JQbL5JY5La6Rzev-gaFV1VUUxMW1AmLJQZgTGjqnErA/edit
- Owner: Nguyễn Minh Chính, Compliance Lead. Send any user-facing text (slides, app copy, README, demo video) for review before it is shown to judges.


## Research

- [08-research/](08-research/README.md): target customer, market, competitors, payout partners, legal (2/10/2026). Build spec: [09-milestone-lock/](09-milestone-lock/README.md)
