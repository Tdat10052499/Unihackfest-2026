# Tài liệu N.E.D: No Empty Deals

Thư mục này là nguồn sự thật chung của cả đội (và trợ lý AI lập trình của từng người) khi phát triển N.E.D cho UniHackfest 2026 (pitching final **10/10/2026**). Thứ tự đọc cho trợ lý AI nằm ở `CLAUDE.md` gốc repo.

| Đọc gì | Khi nào |
|---|---|
| [`09-milestone-lock/`](09-milestone-lock/README.md) | **Hướng đi hiện hành, đọc trước khi code (từ 02/10/2026):** Milestone Lock cho freelancer có khách nước ngoài; ở Việt Nam freelancer chỉ nhận VND qua đối tác chi trả (mô phỏng trong demo). Đặc tả sản phẩm, đặc tả program, kế hoạch build, nhật ký quyết định D1–D30. Tiếng Anh |
| [`progress-log.md`](progress-log.md) | Những gì đã build và đã test, theo từng ngày |
| [`08-research/`](08-research/README.md) | Nghiên cứu của Compliance Lead: khách hàng, thị trường, đối thủ, đối tác chi trả, pháp lý, rubric. Bắt đầu từ `ned-research-and-compliance.md` |
| [`05-legal/compliance-lead-tasks.md`](05-legal/compliance-lead-tasks.md) | Việc của Compliance Lead, quyết định đã xác nhận với ban tổ chức, quy tắc rà soát mọi thứ đưa cho giám khảo |
| [`02-design/`](02-design/README.md) | Thiết kế hiện hành: board `canvas-v2/`, ảnh chụp, demo, test, mascot Teddy |
| [`07-strategy-v3/`](07-strategy-v3/README.md), [`06-strategy-v2/`](06-strategy-v2/README.md) | Đề xuất v3 (02/10) và v2 (01/10), **đã bị `09-milestone-lock/` thay thế**; giữ để tra dữ liệu thị trường và pháp lý |
| [`archive/`](archive/README.md) | Tài liệu thời N.E.D Wallet (25/09 – 01/10/2026: Swap, xStocks, Earn, chế độ ví). Chỉ để tra lịch sử, không làm theo |

## Nguyên tắc

1. **Không đề xuất lại** mini-app platform, Perps, Prediction Market, Gacha (mentor đã loại), và **không đưa trở lại** Swap, xStocks, Earn, dApp Browser hay chế độ ví (Simple / Crypto); code của chúng đã gỡ ngày 09/10/2026.
2. Hai tài liệu mâu thuẫn: `09-milestone-lock/` thắng về sản phẩm và thiết kế program; `08-research/ned-research-and-compliance.md` thắng về dữ kiện nghiên cứu. Sửa tài liệu thua, đừng làm theo nó.
3. Chữ trên sản phẩm, pitch và tài liệu theo bảng từ ngữ ở [`09-milestone-lock/product-spec.md` mục 6](09-milestone-lock/product-spec.md#6-words). Không bao giờ gọi USDC là "payment".
4. N.E.D không giữ tiền, không quy đổi và **không thu phí trong v1** (quyết định D2). Freelancer ở Việt Nam không bao giờ giữ hay nhận USDC.

## Cập nhật tài liệu

- Board thiết kế mới xuất vào `02-design/canvas-v2/` và cập nhật `canvas-v2/README.md`.
- Quyết định sản phẩm mới → thêm một dòng vào nhật ký quyết định trong `09-milestone-lock/README.md` (ghi ngày + ai quyết).
- Không xoá tài liệu cũ: đánh dấu đã bị thay thế, hoặc chuyển vào `archive/` và sửa các link.

## Compliance

- **N.E.D Compliance Hub** (team only, Google Doc): https://docs.google.com/document/d/1JQbL5JY5La6Rzev-gaFV1VUUxMW1AmLJQZgTGjqnErA/edit
- Owner: Nguyễn Minh Chính, Compliance Lead. Send any user-facing text (slides, app copy, README, demo video) for review before it is shown to judges.
