# Lưu trữ: tài liệu thời N.E.D Wallet (25/09 – 01/10/2026)

Thư mục này giữ các tài liệu của **N.E.D Wallet**, hướng đi đầu tiên của dự án: ví Solana có Swap, xStocks, Earn, hai chế độ ví (Simple / Crypto), trợ lý AI và dApp Browser. **Chỉ để tra lịch sử, không làm theo và không đưa các tính năng đó trở lại.**

- **02/10/2026:** dự án chuyển sang **N.E.D: No Empty Deals** (Milestone Lock cho freelancer có khách nước ngoài). Sản phẩm hiện hành và nhật ký quyết định D1–D30: [`../09-milestone-lock/`](../09-milestone-lock/README.md). Swap và xStocks bị ẩn sau cờ `FEATURES` từ 04/10 (mục C7 trong nhật ký quyết định).
- **09/10/2026:** phần code còn lại của N.E.D Wallet được gỡ khỏi `ned-wallet/` (Swap, xStocks, Jupiter, chế độ ví, module và ảnh không dùng, chuỗi dịch cũ), và các tài liệu dưới đây được chuyển vào đây bằng `git mv` (giữ lịch sử). Mỗi tài liệu có một dòng "Lưu trữ" dưới tiêu đề.

## Danh sách

| Tài liệu | Đường dẫn cũ | Nội dung |
| --- | --- | --- |
| [`01-dinh-huong-du-an.md`](01-dinh-huong-du-an.md) | `docs/01-dinh-huong-du-an.md` | Định hướng gốc (25/09): lời mentor, ưu tiên Swap → xStocks → hai chế độ ví → AI, lộ trình 15 ngày, phân công |
| [`02-thiet-ke-v1/README.md`](02-thiet-ke-v1/README.md) | `docs/02-thiet-ke/README.md` | Danh mục 40 màn hình của canvas v85, luồng điều hướng, design tokens thời giao diện tối |
| [`02-thiet-ke-v1/trang-thai-thiet-ke.md`](02-thiet-ke-v1/trang-thai-thiet-ke.md) | `docs/02-thiet-ke/trang-thai-thiet-ke.md` | Trạng thái thiết kế (26/09, v85) và các quyết định thiết kế đã chốt lúc đó |
| [`02-thiet-ke-v1/ui-pdf-alignment.md`](02-thiet-ke-v1/ui-pdf-alignment.md) | `docs/02-thiet-ke/ui-pdf-alignment.md` | Đối chiếu Home, Swap và xStocks với bản PDF (28/09) |
| [`02-thiet-ke-v1/ned-wallet-ui.pdf`](02-thiet-ke-v1/ned-wallet-ui.pdf) | `docs/02-thiet-ke/ned-wallet-ui.pdf` | Bản PDF giao diện N.E.D Wallet |
| [`02-thiet-ke-v1/canvas/`](02-thiet-ke-v1/canvas/) | `docs/02-thiet-ke/canvas/` | 42 board `.dc.html` v1 (Swap, xStocks, Earn, TED bot, Home, chế độ ví) |
| [`03-ky-thuat/dev-handoff.md`](03-ky-thuat/dev-handoff.md) | `docs/03-ky-thuat/dev-handoff.md` | Bàn giao kỹ thuật: API Jupiter, nguồn dữ liệu từng màn, kiến trúc AI, identity on-chain (mục 1a) |
| [`04-ke-hoach-code.md`](04-ke-hoach-code.md) | `docs/04-ke-hoach-code.md` | Kế hoạch code theo phase (27/09 → 10/10), gồm "Cập nhật sau Phase 0" (tham số scrypt của số điện thoại) |
| [`05-vietnam-strategy-and-revenue-model.md`](05-vietnam-strategy-and-revenue-model.md) | `docs/05-vietnam-strategy-and-revenue-model.md` | Đề xuất v1 về hướng đi ở Việt Nam và mô hình doanh thu (đã được v2 rồi v3 thay thế); phần pháp lý vẫn được 06 và 07 dẫn tới |
| [`poc-dynamic.md`](poc-dynamic.md) | `docs/poc-dynamic.md` | PoC đăng nhập Dynamic (T0.4, cổng GO/NO-GO) |
| [`cleanup-report-t0-5.md`](cleanup-report-t0-5.md) | `docs/cleanup-report-t0-5.md` | Báo cáo dọn dẹp T0.5 (26/09): bỏ Supabase, `ned-hub`, relayer |
| [`ned-wallet-process-log.md`](ned-wallet-process-log.md) | `ned-wallet/docs/Process.md` | Nhật ký tiến độ của app thời N.E.D Wallet (từ Privy, Supabase và giao diện kiểu MiniPay trở đi) |

## Những gì từ thời đó vẫn còn đúng

- **Mascot Teddy:** bộ ảnh `ned-wallet/assets/images/mascot teddy - *.png` (dùng qua `constants/mascot.ts`) và `../02-thiet-ke/assets/mascot/`, brief ở [`../02-thiet-ke/mascot-brief.md`](../02-thiet-ke/mascot-brief.md).
- **Identity on-chain:** `NameRecord`, `ReverseRecord`, `PhoneRecord` trong `ned_program` (mô tả gốc ở `03-ky-thuat/dev-handoff.md` mục 1a; tham số scrypt ở `04-ke-hoach-code.md`). Cách dùng hiện tại: [`../../ned-wallet/ARCHITECTURE.md`](../../ned-wallet/ARCHITECTURE.md).
- **Đăng nhập Dynamic:** Google và ví nhúng Solana (MPC), kiểm tra lần đầu trong `poc-dynamic.md`; kiến trúc không backend từ `cleanup-report-t0-5.md`.

Mọi điều khác (Swap là P0, giá Jupiter, phí 0,25%, xStocks, Earn, chế độ ví, AI, dApp Browser) đã bị thay thế và đã gỡ khỏi code.

## Cố ý không lưu trữ ở đây

- [`../06-strategy-v2/`](../06-strategy-v2/README.md) và [`../07-strategy-v3/`](../07-strategy-v3/README.md): đề xuất v2 và v3, đã bị thay thế nhưng vẫn giữ tại chỗ vì dữ liệu thị trường và pháp lý trong đó.
- [`../08-research/evaluation-and-plan.md`](../08-research/evaluation-and-plan.md): bị thay thế nhưng vẫn nằm cạnh tài liệu nghiên cứu hiện hành.
- Thiết kế hiện hành vẫn ở [`../02-thiet-ke/`](../02-thiet-ke/README.md) (`canvas-v2/`, ảnh chụp, demo, test, mascot).
