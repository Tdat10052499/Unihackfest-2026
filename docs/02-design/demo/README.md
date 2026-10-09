# Demo: các luồng sử dụng N.E.D (8/10/2026)

Ảnh chụp từ hai app thật trên `main` (`ea92659`), với cờ D30 bật (`EXPO_PUBLIC_FEATURE_ACCOUNT_ROLES=true`, `VITE_FEATURE_ACCOUNT_ROLES=true`):

- **Ví trên điện thoại** (`ned-wallet`), 390 × 844.
- **Workspace và N.E.D Jobs trên máy tính** (`ned-workspace`), 1280 × 800.

Bộ test tự động 55 kịch bản cho phần mới (D30) ở [`../test/README.md`](../test/README.md).

## Ảnh được tạo thế nào (cần đọc trước)

- **Không có đăng nhập Google thật.** Ví chạy ở chế độ xem trước (preview), đóng vai một ví có sẵn. Workspace dùng chế độ dev `?previewWallet=`. Trạng thái tài khoản (vai trò, quốc gia, agreement) được đặt sẵn trên máy.
- **Không ký giao dịch.** Chế độ preview không ký được, nên các bước "tạo hợp đồng", "khoá tiền", "nộp bài", "release" dừng ở màn xác nhận ngay trước khi ký.
- **Dữ liệu sau khi tạo là dữ liệu thật trên Solana devnet.** Hợp đồng "Landing page design" (`Ff9h…GNc`) giữa ví client `BT9c…RT7B` và ví freelancer `EcpC…rA4y`; hợp đồng đã xong "D1 review timeout"; listing "E2E job · apply here" của business `4b1d…4EY3`. Brief của hợp đồng được mã hoá, máy chụp không có khoá nên hiện "This device cannot open the brief yet". Đó là hành vi đúng.
- **Thông báo đỏ ở đáy ảnh điện thoại** là SDK đăng nhập Dynamic không kết nối được từ máy chụp, không phải lỗi của app. Không có email nào trên ảnh.

---

## A. Freelancer ở Việt Nam đăng ký (điện thoại)

Luồng: Welcome → role → country → agreement → (nạp SOL phí, chạy ngầm) → profile → Home. Thanh bước có **4 phần**.

| # | Màn hình | Người dùng làm gì / thấy gì |
| --- | --- | --- |
| A1 | ![](A1-welcome.png) | **Welcome**: bấm "Continue with Google". Ví được tạo tự động (Dynamic MPC), không có seed phrase. |
| A2 | ![](A2-role-freelancer.png) | **Bước 1/4 · How will you use N.E.D?** Chọn "I do the work" (Freelancer). Ghi chú: người sống ở Việt Nam chỉ tham gia làm freelancer. |
| A3 | ![](A3-country-vietnam.png) | **Bước 2/4 · Where do you live now?** Tìm "viet" và chọn Vietnam. Ghi chú: thấy số tiền bằng VND (ước tính), nhận tiền về ngân hàng qua payout partner, không hiện số dư crypto. |
| A4 | ![](A4-agreement-freelancer.png) | **Bước 3/4 · The N.E.D Agreement**: thẻ "As a freelancer" (quyền lợi / nghĩa vụ), thẻ "What N.E.D does and does not do", rồi 3 ô đồng ý. Đủ 3 ô thì nút "Agree and continue" mới bật. Bấm Agree sẽ ghi consent v3, hồ sơ, agreement (kèm mã hash của đúng văn bản đã hiện) và chế độ hiển thị tiền lên máy. |
| A5 | ![](A5-profile.png) | **Bước 4/4 · Create your profile**: chọn @username (và số điện thoại nếu muốn). Một giao dịch `create_profile` ghi lên Solana; người dùng tự trả phí devnet. |
| A6 | ![](A6-home-vietnam.png) | **Home, chế độ Việt Nam**: tiền đã khoá cho mình (≈ VND), hợp đồng, nút chia sẻ @username cho client. Không có USDC hay SOL. |
| A7 | ![](A7-settings-vietnam.png) | **Settings → Your account**: "Also work" bật; "Also hire" bị khoá ("Not available for people who live in Vietnam."); Where you live = Vietnam; Agreement version 1. |

## B. Client doanh nghiệp ở Singapore đăng ký (điện thoại)

Luồng: role (business) → country → **About your business** → agreement → profile → Home. Thanh bước có **5 phần**.

| # | Màn hình | Người dùng làm gì / thấy gì |
| --- | --- | --- |
| B1 | ![](B1-role-business.png) | Chọn "I hire for a business" (Client · business). Thanh bước chuyển sang 5 phần. |
| B2 | ![](B2-country-singapore.png) | Chọn Singapore: thấy USDC và nhận tiền vào ví N.E.D. |
| B3 | ![](B3-business-form.png) | **About your business**: tên công ty, nơi đăng ký (không được là Việt Nam), quy mô, ngành, website, chức danh, số đăng ký (chỉ lưu trên máy, không ghi lên Solana). Mọi thông tin là **tự khai** ("self-declared"); N.E.D không kiểm tra. |
| B4 | ![](B4-agreement-business.png) | Agreement có thẻ "As a client" và "For your business", cùng link "Job posting rules". |
| B5 | ![](B5-home-client.png) | **Home của client**: số dư USDC, nút "New contract", Receive, Send. |
| B6 | ![](B6-settings-business.png) | Settings → Your account: "Lumen Studio Pte. Ltd. · self-declared", Agreement "Version 1 · 8 Oct 2026". Bấm Agreement để xem lại văn bản đã đồng ý, hoặc "Withdraw and sign out". |

## C. Client tạo hợp đồng (điện thoại)

| # | Màn hình | Người dùng làm gì / thấy gì |
| --- | --- | --- |
| C1 | ![](C1-new-contract-recipient.png) | **New contract 1/3**: nhập @username hoặc địa chỉ ví của freelancer, bấm "Find". App tra trên chain; không thể tạo hợp đồng với chính mình. |
| C2 | ![](C2-new-contract-milestones.png) | **2/3**: tiêu đề (công khai trên Solana), brief (được mã hoá), từng milestone gồm tên, số USDC, hạn nộp, thời gian review và các điểm "done when". |
| C3 | ![](C3-new-contract-review.png) | **3/3 · Review**: tổng tiền sẽ khoá, fingerprint của brief, phí (N.E.D không thu phí trong pilot, phí mạng ~0.000005 SOL), "What happens next". Kéo "Slide to create" để ký giao dịch `create_fund`. |

**Sau khi tạo** (ví thật sẽ ký ở bước C3), app hiện "Contract created" với link mời (chứa khoá giải mã brief) để gửi cho freelancer. Freelancer mở link → **Accept** và chọn nơi nhận tiền (USDC vào ví, hoặc VND qua payout partner) → client **Lock** (khoá USDC vào vault của program) → freelancer làm và **Submit** → client **Review**: chấp nhận để release, hoặc yêu cầu sửa. Quá hạn review thì **ai cũng có thể bấm Release now** cho freelancer; quá hạn nộp mà chưa nộp thì **Refund now** về client.

## D. Hợp đồng sau khi tạo: dữ liệu thật trên devnet (điện thoại)

| # | Màn hình | Thấy gì |
| --- | --- | --- |
| D1 | ![](D1-contracts-client.png) | **Danh sách hợp đồng của client** (tab As client / As freelancer, lọc Active). |
| D2 | ![](D2-contract-client.png) | **Chi tiết, phía client**: "Locked · work in progress", số tiền đang khoá, nơi nhận tiền của freelancer (VND qua payout partner, simulated), "Held by the program, not by N.E.D" và link Explorer. Ở đây hạn nộp đã qua nên hiện **Refund now** (ai cũng làm được). |
| D3 | ![](D3-contract-freelancer.png) | **Cùng hợp đồng, phía freelancer Việt Nam**: số tiền bằng ≈ VND, không có USDC. |
| D4 | ![](D4-submit-freelancer.png) | **Submit milestone** (freelancer): link bản xem trước, ghi chú, danh sách file cuối và fingerprint. |
| D5 | ![](D5-review-client.png) | **Review** (client): xem bản nộp, chấp nhận và release, hoặc yêu cầu sửa (tiền vẫn khoá, không tự hoàn). |
| D6 | ![](D6-settled-freelancer.png) | **Hợp đồng đã hoàn tất (Settled)**. |
| D7 | ![](D7-records-freelancer.png) | **Records**: lịch sử những gì freelancer đã nhận, đọc từ chain. |

## E. Workspace trên máy tính

| # | Màn hình | Thấy gì |
| --- | --- | --- |
| E1 | ![](E1-sign-in.png) | **Sign in with N.E.D Wallet** (cùng tài khoản Google với điện thoại). |
| E2 | ![](E2-overview-client.png) | **Overview của client**: số liệu, việc cần làm, bảng hợp đồng, nút "New contract". Bấm avatar để mở panel ví (chính app điện thoại, nhúng trong trang). |
| E3 | ![](E3-new-contract-editor.png) | **Soạn hợp đồng trên máy tính** (brief editor rộng hơn); bấm Create thì panel ví hiện yêu cầu ký. |
| E4 | ![](E4-contract-client.png) | **Trang hợp đồng, phía client**: milestone, trạng thái, bước tiếp theo. |
| E5 | ![](E5-overview-freelancer.png) | **Overview của freelancer Việt Nam**: ≈ VND, nút chia sẻ @username, không có New contract. |
| E6 | ![](E6-contract-freelancer.png) | **Trang hợp đồng, phía freelancer**. |
| E7 | ![](E7-submit-freelancer.png) | **Nộp milestone trên máy tính**, kèm hướng dẫn "Before you submit" (chia sẻ bản xem trước, giữ file gốc tới khi release). |
| E8 | ![](E8-review-client.png) | **Client review trên máy tính**. |

## F. N.E.D Jobs (máy tính)

| # | Màn hình | Thấy gì |
| --- | --- | --- |
| F1 | ![](F1-jobs-overview-guest.png) | **Overview** cho khách chưa đăng nhập. |
| F2 | ![](F2-jobs-find.png) | **Find jobs**: tìm kiếm, lọc, chip "Budget locked" hoặc "Locks when hired". |
| F3 | ![](F3-job-detail-apply.png) | **Job detail**: freelancer viết pitch (công khai) và Apply. Không khoá tiền từ ví freelancer. |
| F4 | ![](F4-post-job.png) | **Post a job** (business): "Lock now" hoặc "Lock when I hire"; thẻ xem trước ghi "Lumen Studio Pte. Ltd. · Business · self-declared". |
| F5 | ![](F5-applicants.png) | **Applicants** (business): danh sách người ứng tuyển, pitch, track record từ chain, nút Select. Chọn người sẽ tạo hợp đồng (và khoá tiền nếu listing khoá khi thuê). |
| F6 | ![](F6-job-filled.png) | **Job đã thuê xong (Filled)**. |

## G. Chặn theo vai trò

Các màn chặn mới (freelancer mở `/new`, người ở Việt Nam mở `/jobs/new`, client-only gặp "Also work", đổi quốc gia bị chặn khi còn hợp đồng client mở…) nằm ở [`../test/`](../test/README.md), các kịch bản W29–W39 và S04–S16.

---

## Điều cần người thật làm (đăng nhập Google, ký giao dịch)

Trên bản Vercel preview có bật cờ, hoặc chạy local với cả hai cờ bật:

1. Tài khoản Google mới, freelancer ở Vietnam: A1 → A7, rồi tạo @username (ký giao dịch).
2. Tài khoản Google mới khác, business ở Singapore: B1 → B6.
3. Business tạo hợp đồng cho @username của freelancer (C1 → C3, kéo "Slide to create"). Gửi link mời → freelancer Accept (chọn VND) → client Lock → freelancer Submit → client Review và release.
4. Business đăng một job → freelancer Apply → business Select → freelancer Accept.
5. Tài khoản demo cũ (Mia, Vinh): thấy luồng update **một lần**, hợp đồng cũ vẫn còn.

## Phát hiện khi chụp (không thuộc D30)

- **Trang job báo nhầm "This job does not exist" khi RPC devnet bị giới hạn tốc độ (lỗi 429).** Hàm `useJob` (`ned-workspace/src/jobs/hooks.ts:77`) bắt mọi lỗi rồi trả về "không có job". Tải lại sau vài giây thì trang hiện đúng (F3, F5, F6 đều đã chụp lại được). Có thể ảnh hưởng buổi demo nếu RPC chậm. Đề xuất sau final: phân biệt "không tồn tại" với "chưa đọc được, thử lại".
- Dòng "The public brief is missing or does not match" trên màn Applicants (F5) có thể cùng nguyên nhân (đọc brief bị 429), cần kiểm tra lại khi RPC không nghẽn.
