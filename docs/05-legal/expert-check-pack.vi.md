# N.E.D Milestone Lock: tóm tắt pháp lý 1 trang


Đội N.E.D · UniHackFest 2026 (chung kết 10/10/2026) · Người soạn: Nguyễn Minh Chính, Compliance Lead · 06/10/2026 · Bài thi sinh viên, không phải yêu cầu ý kiến pháp lý chính thức


## 1. Sản phẩm làm gì

Phần mềm (chương trình trên blockchain Solana + ứng dụng) cho phép **khách hàng nước ngoài "khoá" tiền công bằng USDC theo từng mốc công việc** trước khi freelancer bắt đầu làm. Khi khách duyệt mốc, hoặc hết hạn duyệt mà khách không phản hồi, chương trình tự chuyển khoản tiền của mốc đó đến đích đã chọn từ đầu. Nếu freelancer không nộp đúng hạn, tiền tự hoàn lại cho khách.

- **Freelancer ở nước ngoài:** nhận USDC vào ví của chính họ.
- **Freelancer ở Việt Nam:** **không nhận, không giữ, không bán USDC ở bất kỳ bước nào.** USDC được chuyển đến một đối tác chi trả ở nước ngoài (ứng viên: Due, Nium); đối tác quy đổi ở nước ngoài và chuyển **VND** qua ngân hàng (NAPAS). Trong bản demo, đối tác là ví thử nghiệm của đội (mô phỏng).
- **N.E.D:** không giữ tiền, không có khoá quản trị đối với tiền đã khoá, không quy đổi, không thu phí (v1). Toàn bộ chạy trên devnet (tiền thử nghiệm, không có giá trị).

## 2. Các quy định đội đã đối chiếu (đọc ngày 1–2/10/2026)

| Văn bản                                                                     | Nội dung liên quan                                                                                                                                                   | Cách đội áp dụng                                                                |
|-----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------|
| NĐ 52/2024/NĐ-CP, Đ.3(10)–(11), Đ.8(6), (7)                                 | Tiền mã hoá không phải phương tiện thanh toán hợp pháp; cấm phát hành, cung ứng, sử dụng phương tiện thanh toán không hợp pháp; cấm trung gian thanh toán không phép | Người dùng tại VN chỉ nhận VND qua ngân hàng; không gọi USDC là "thanh toán"    |
| NĐ 340/2025/NĐ-CP, Đ.30(6)(d), Đ.5(3)(a)                                    | Phạt 150–200 triệu (cá nhân), gấp đôi với tổ chức                                                                                                                    | Trích dẫn mức phạt mới, không dùng NĐ 88/2019                                   |
| NQ 05/2025/NQ-CP, Đ.3, Đ.4, Đ.7                                             | Thí điểm thị trường tài sản mã hoá; "lưu ký" = nhận, lưu giữ, bảo quản, chuyển giao tài sản mã hoá cho khách hàng                                                    | N.E.D không giữ khoá, không giữ tiền; người dùng VN không giao dịch             |
| NĐ 284/2026/NĐ-CP, Đ.7(4), Đ.9(1)                                           | Phạt "cung cấp dịch vụ **hoặc quảng cáo, tiếp thị** liên quan đến tài sản mã hoá khi chưa được cấp giấy phép": tổ chức 180–200 tr, cá nhân 90–100 tr                 | **Rủi ro mở chính**; chỉ devnet, không thu phí, chờ ý kiến luật sư              |
| Luật BVDLCN 91/2025 + NĐ 356/2025                                           | Đồng ý rõ ràng, không đồng ý ngầm; dữ liệu ngân hàng là dữ liệu nhạy cảm                                                                                             | Màn hình đồng ý riêng; dữ liệu ngân hàng chỉ ở đối tác                          |
| Pháp lệnh Ngoại hối Đ.6; TT 32/2013 Đ.4(16)(b); Luật 109/2025 (TNCN) Đ.7(1) | Giao dịch vãng lai tự do; báo giá dịch vụ cho người không cư trú bằng ngoại tệ; miễn thuế doanh thu kinh doanh đến 500 tr/năm                                        | Hợp đồng định giá USD, VND chỉ là ước tính; cung cấp bản ghi, không tư vấn thuế |

## 3. Điều đội chưa chắc (mong Thầy/Cô góp ý)


Dữ liệu trên chuỗi: tên người dùng, địa chỉ ví, tiêu đề hợp đồng, khoá công khai thiết bị là công khai; nội dung đề bài và bàn giao được **mã hoá** nhưng lưu vĩnh viễn trên chuỗi (không xoá được). Hash số điện thoại (tuỳ chọn) có thể bị dò ngược.




# Câu hỏi cho chuyên gia


Xin Thầy/Cô ghi ngắn: "Đúng / Sai / Cần xem thêm" và một dòng lý do. Đội sẽ sửa tài liệu và câu trả lời trước ban giám khảo ngay trong ngày.


| \#  | Câu hỏi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Góp ý |
|-----|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------|
| 1   | Một chương trình trên Solana mà N.E.D không kiểm soát, khoá USDC của khách nước ngoài và chuyển cho đối tác chi trả nước ngoài, có bị coi là "lưu ký" (NQ 05 Đ.3) hoặc "dịch vụ liên quan đến tài sản mã hoá" (NĐ 284 Đ.7(4)) nếu được xây dựng và giới thiệu từ Việt Nam?                                                                                                                                                                                                                               |       |
| 2   | N.E.D có thể bị coi là "cung ứng" phương tiện thanh toán không hợp pháp (NĐ 52 Đ.8(6)) hoặc dịch vụ "thu hộ, chi hộ" không phép (Đ.8(7)) không?                                                                                                                                                                                                                                                                                                                                                          |       |
| 3   | Freelancer tại VN chỉ nhận VND từ đối tác nước ngoài cho hợp đồng định giá USD: có vi phạm gì không? Việc tài khoản đối tác thuộc về khách (phương án A) hay thuộc về freelancer (phương án B) có làm thay đổi kết luận không?                                                                                                                                                                                                                                                                           |       |
| 4   | Thu nhập freelance từ khách nước ngoài là doanh thu kinh doanh (ngưỡng 500 tr, 2%) hay thu nhập kiểu tiền công theo Luật 109/2025?                                                                                                                                                                                                                                                                                                                                                                       |       |
| 5   | Trước khi ra mắt, cấu trúc nào an toàn hơn: công ty phần mềm tại VN, pháp nhân ở nước ngoài, hay hợp tác với đơn vị được cấp phép vận hành hợp đồng?                                                                                                                                                                                                                                                                                                                                                     |       |
| 6   | Người cư trú tại VN chỉ **ký** các thông điệp "chấp nhận" và "nộp bài" trên chuỗi (không giữ USDC, phí mạng do bên khác trả) thì có bị coi là "sử dụng" tài sản mã hoá không?                                                                                                                                                                                                                                                                                                                            |       |
| 7   | Lưu nội dung hợp đồng **đã mã hoá** vĩnh viễn trên blockchain công khai (không xoá được) có phù hợp Luật BVDLCN 91/2025 nếu người dùng đã đồng ý rõ ràng? Cần thêm gì trong nội dung đồng ý?                                                                                                                                                                                                                                                                                                             |       |
| 8   | Việc đội trình bày sản phẩm tại cuộc thi, gian hàng Expo và bài đăng mạng xã hội (bản thử nghiệm trên devnet, tiền thử, không cung cấp cho ai) có thể bị coi là "quảng cáo, tiếp thị" dịch vụ tài sản mã hoá theo NĐ 284 Đ.7(4) không? Nên tránh cách diễn đạt nào?                                                                                                                                                                                                                                      |       |
| 9   | Câu đội định nói trước ban giám khảo có chỗ nào sai hoặc dễ hiểu nhầm không? *"Ở Việt Nam tiền mã hoá không phải phương tiện thanh toán hợp pháp theo NĐ 52/2024, vì vậy người dùng Việt Nam của chúng tôi không bao giờ nhận tiền mã hoá: khách khoá USDC ở nước ngoài, đối tác chi trả ở nước ngoài chuyển VND qua ngân hàng. Bản demo dùng đối tác mô phỏng. Chúng tôi không giữ tiền. Trước khi dùng tiền thật, luật sư phải xác nhận phần mềm không phải dịch vụ tài sản mã hoá theo NĐ 284/2026."* |       |

Nguồn: tài liệu nghiên cứu của đội, docs/08-research/ned-research-and-compliance.md trong repo công khai github.com/Tdat10052499/Unihackfest-2026. Số điều khoản được đối chiếu từ cơ sở dữ liệu pháp luật (TVPL, LuatVietnam), cần kiểm tra lại với văn bản gốc trên vanban.chinhphu.vn.

Người góp ý: ............................................ Ngày: ....../10/2026 · Đội cảm ơn Thầy/Cô rất nhiều.
