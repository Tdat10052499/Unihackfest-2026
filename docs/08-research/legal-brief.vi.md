# Bản tóm tắt pháp lý: escrow và thuế crypto

Nghiên cứu ngày 2/10/2026 · Người thực hiện: Nguyễn Minh Chính (Compliance Lead) · Bản tiếng Anh: [`legal-brief.md`](legal-brief.md). Nếu hai bản khác nhau, hãy báo để sửa cả hai.

Đây không phải tư vấn pháp lý, chỉ là cách đọc các nguồn công khai của một nhóm sinh viên, viết ra để mentor, giảng viên luật hoặc phòng tư vấn pháp luật của trường chỉ cần xác nhận hoặc sửa lại.

## Mục đích

Hai câu hỏi pháp lý quyết định những USP nào N.E.D có thể thuyết trình an toàn tại UniHackFest 2026. Cả hai đều ảnh hưởng tới strategy v3 (`docs/07-strategy-v3/`): câu 1 liên quan tới **Milestone Lock**, câu 2 liên quan tới sao kê thu nhập.

## Thông tin về N.E.D

N.E.D là ví tự quản (self-custody wallet) trên Solana. Hiện tại app chỉ chạy trên devnet với tiền thử, và không có máy chủ riêng.

| Tính năng | Tình trạng | N.E.D có giữ tiền hộ người dùng không? |
| --- | --- | --- |
| Đăng nhập bằng Google, ví MPC nhúng | Đã làm | Không: khóa được chia giữa người dùng và Dynamic, một nhà cung cấp của Mỹ |
| Gửi USDC tới địa chỉ ví, @username hoặc số điện thoại Việt Nam | Đã làm | Không: người dùng chuyển trực tiếp cho nhau |
| Sao kê thu nhập từ lịch sử on-chain | Dự kiến | Không: chỉ đọc dữ liệu |
| Tiền ký quỹ (escrow / Milestone Lock): khách hàng khóa USDC trong smart contract; tiền được mở khi khách duyệt công việc | Dự kiến | Smart contract giữ tiền, không phải nhóm |

Người dùng: freelancer người Việt sống tại Việt Nam, được khách hàng nước ngoài trả bằng USDC hoặc USDT. N.E.D không đổi USDC sang VND, không cung cấp giao dịch mua bán cho người dùng tại Việt Nam, và không thu phí trong thời gian thi.

## Câu hỏi 1: Escrow bằng smart contract cho công việc freelance có bị coi là "thanh toán" không?

**Cách hiểu của nhóm: có thể là có, nên escrow có rủi ro cao với người dùng tại Việt Nam.** Khách hàng khóa USDC rồi tiền được chuyển cho freelancer khi công việc được duyệt trông giống việc thanh toán cho dịch vụ bằng tài sản mã hóa.

| Quy định | Nội dung | Ý nghĩa với escrow |
| --- | --- | --- |
| [Nghị định 52/2024/NĐ-CP](https://luatvietan.vn/quy-dinh-phap-ly-co-ban-ve-tien-ao-tai-viet-nam.html) về thanh toán không dùng tiền mặt (hiệu lực 1/7/2024); mức phạt tại Nghị định 340/2025 Điều 30(6)(d) (hiệu lực 9/2/2026, thay Nghị định 88/2019); Bộ luật Hình sự Điều 206 | Liệt kê các phương tiện thanh toán không dùng tiền mặt hợp pháp (séc, lệnh chi, thẻ ngân hàng, ví điện tử…) và cấm "phát hành, cung ứng, sử dụng phương tiện thanh toán không hợp pháp"; crypto không phải phương tiện hợp pháp. Phạt 150–200 triệu đồng với cá nhân, gấp đôi với tổ chức; có thể bị truy cứu hình sự. Quy định cấm nằm ở Điều 8 khoản 6, định nghĩa ở Điều 3 khoản 10–11 [Đã kiểm chứng 2/10/2026] | Quy định rõ nhất chống lại escrow: dùng USDC trả cho công việc freelance là dùng phương tiện thanh toán không hợp pháp |
| [Nghị quyết 05/2025/NQ-CP](https://www.bakermckenzie.com/-/media/files/insight/publications/alerts/09/vietnam-new-resolution-on-pilot-program-for-digital-and-crypto-assets-marke.pdf) về thí điểm thị trường tài sản mã hóa, ngày 9/9/2025 | Tài sản mã hóa được dùng "cho mục đích trao đổi hoặc đầu tư"; giao dịch phải qua đơn vị được cấp phép; 6 tháng sau giấy phép đầu tiên, giao dịch ngoài các đơn vị này có thể bị phạt hành chính hoặc truy cứu hình sự | Tính đến 30/8/2026 chưa có giấy phép nào được cấp ([KuCoin News](https://www.kucoin.com/news/flash/vietnam-s-crypto-pilot-five-firms-pass-initial-review-no-licenses-issued-yet)), nên mốc 6 tháng chưa bắt đầu |
| [Nghị định 52/2024/NĐ-CP](https://www.rajahtannasia.com/wp-content/uploads/2024/09/2024_07_22-Decree-52-2024-ND-CP-NCP.pdf), dịch vụ trung gian | Đồng thời cấm "cung ứng dịch vụ thanh toán khi không phải tổ chức cung ứng dịch vụ thanh toán, hoặc cung ứng dịch vụ trung gian thanh toán khi chưa có giấy phép của Ngân hàng Nhà nước" (dịch từ bản tóm tắt tiếng Anh) | Nếu escrow bị coi là dịch vụ trung gian thanh toán, N.E.D sẽ cần giấy phép. Chưa rõ, vì các dịch vụ này được định nghĩa xoay quanh đồng Việt Nam |

**Đính chính (cuối ngày 2/10/2026):** bản trước của tài liệu này nói Luật Công nghiệp công nghệ số (Luật 71/2025/QH15) cấm dùng crypto làm phương tiện thanh toán và Nghị định 52/2024 không có quy định về crypto. Cả hai ý đó đều sai. Văn bản luật (Điều 46–48) chỉ định nghĩa tài sản số, tài sản ảo, tài sản mã hóa, không có quy định cấm thanh toán; quy định cấm nằm ở Nghị định 52/2024 (cấm sử dụng phương tiện thanh toán không hợp pháp). Căn cứ ban đầu của strategy v3 (Nghị định 52/2024; Bộ luật Hình sự Điều 206) là đúng.

**Câu hỏi cho người thẩm định:**

1. Một smart contract chuyển USDC cho freelancer sau khi khách hàng duyệt công việc có bị coi là "dùng crypto làm phương tiện thanh toán cho dịch vụ" không?
2. Việc khách hàng ở nước ngoài và chỉ freelancer ở Việt Nam có làm thay đổi kết luận không?
3. Nếu smart contract giữ tiền và nhóm không thể chuyển số tiền đó, N.E.D có đang cung ứng dịch vụ trung gian thanh toán không?
4. Một phiên bản không có bước duyệt, ví dụ chuyển khoản khóa theo thời gian mà freelancer nhìn thấy được, có được xem xét khác đi không?

## Câu hỏi 2: Thuế 0,1% có áp dụng cho chuyển khoản giữa các ví tự quản không?

**Cách hiểu của nhóm: có thể là không.** [Thông tư 32/2026](https://gvlawyers.com.vn/wp-content/uploads/2026/03/EN_Legal-alert-_Circular-32-2026_Taxation-of-transactions-in-crypto-assets.pdf), có hiệu lực từ 27/3/2026 theo GV Lawyers (nguồn khác ghi 1/7/2026) [Unverified], đánh thuế 0,1% trên toàn bộ giá trị giao dịch, dù lãi hay lỗ, đối với "nhà đầu tư cá nhân ... chuyển nhượng tài sản mã hóa thông qua tổ chức cung cấp dịch vụ tài sản mã hóa tại Việt Nam" (dịch từ bản tóm tắt tiếng Anh). Chuyển từ ví tự quản này sang ví tự quản khác không đi qua tổ chức như vậy. [Việt Nam News](https://vietnamnews.vn/economy/1778511/0-1-tax-on-transfer-of-crypto-assets-mof-s-circular.html) đưa tin với cùng cách diễn đạt.

Ý nghĩa với sao kê thu nhập:

- Không quảng bá sao kê là "để nộp thuế 0,1%".
- USDC mà freelancer nhận được vẫn là thu nhập từ dịch vụ, có thể phải nộp thuế thu nhập cá nhân [Suy luận]. Sao kê giúp chứng minh thu nhập khi khai thuế, xin visa, thuê nhà hay vay tiền.
- Sao kê phải ghi rõ đây là bản ghi, không phải tư vấn thuế.

**Câu hỏi cho người thẩm định:**

1. Nhóm hiểu đúng chưa khi cho rằng Thông tư 32/2026 không áp dụng cho chuyển khoản từ ví sang ví?
2. Freelancer ở Việt Nam nên kê khai thu nhập dịch vụ nhận bằng USDC thế nào: theo tỷ giá nào, vào ngày nào?
3. Sao kê hàng tháng bằng USD và VND, có đường dẫn tới biên nhận on-chain, có được chấp nhận làm chứng từ kèm theo không?

## Mặc định an toàn khi chưa có câu trả lời

| USP | Quyết định cho chung kết | Cách nói khi thuyết trình |
| --- | --- | --- |
| Sao kê thu nhập | Xây và demo | "A clear record of the dollars you received, for your own tax return, visa or loan." (Bản ghi rõ ràng số đô la bạn đã nhận, dùng cho tờ khai thuế, visa hay khoản vay của bạn.) Không bao giờ nói "nộp thuế giúp bạn" hay "đúng luật thuế" |
| Kiểm tra người nhận | Xây và demo | "See the facts about who you are sending to." (Xem thông tin về người bạn sắp gửi tiền.) Không bao giờ nói "an toàn" hay "chống lừa đảo" |
| Gửi trước, nhận sau | Chỉ đưa vào lộ trình | "Next, pending legal review." (Tiếp theo, đang chờ thẩm định pháp lý.) |
| Tiền ký quỹ (escrow / Milestone Lock) | Chỉ đưa vào lộ trình, cho các thị trường cho phép | "Planned for clients and freelancers outside Vietnam, or with a licensed partner in Vietnam." (Dự kiến cho khách hàng và freelancer ngoài Việt Nam, hoặc cùng đối tác được cấp phép tại Việt Nam.) |

**Từ không bao giờ dùng:** "pay" hay "payment" (thanh toán) cho USDC, "invest" (đầu tư), "safe" (an toàn), "scam-free" (chống lừa đảo), "tax-compliant" (đúng luật thuế). Nhóm dùng "send" hoặc "transfer" (chuyển).

**Nếu giám khảo hỏi "Is this legal?":** trả lời bằng tiếng Anh như bản tiếng Anh. Ý nghĩa: tại Việt Nam, crypto không phải phương tiện thanh toán hợp pháp theo Nghị định 52/2024, nên N.E.D không làm thanh toán tại Việt Nam. Hiện người dùng chỉ chuyển đô la giữa các ví của chính họ trên devnet, còn các tính năng giữ tiền sẽ chờ đối tác được cấp phép.

## Nguồn

Các nguồn giống bản tiếng Anh, đều là bản tóm tắt tiếng Anh của các công ty luật và báo, không phải văn bản gốc tiếng Việt. Các đoạn trích trong ngoặc kép ở bản này là bản dịch của nhóm, nên người thẩm định cần đối chiếu với văn bản gốc.

- [Watson Farley & Williams: Luật Công nghiệp công nghệ số và Nghị quyết 05/2025](https://www.wfw.com/articles/landmark-legislation-regulates-digital-assets-in-vietnam/)
- [Baker McKenzie: Nghị quyết thí điểm thị trường tài sản mã hóa](https://www.bakermckenzie.com/-/media/files/insight/publications/alerts/09/vietnam-new-resolution-on-pilot-program-for-digital-and-crypto-assets-marke.pdf)
- [Luật Việt An: căn cứ pháp lý cấm dùng tiền ảo để thanh toán (20/3/2025)](https://luatvietan.vn/quy-dinh-phap-ly-co-ban-ve-tien-ao-tai-viet-nam.html)
- [Toàn văn Luật 71/2025/QH15 Công nghiệp công nghệ số](https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Luat-Cong-nghiep-cong-nghe-so-2025-so-71-2025-QH15-621341.aspx)
- [Rajah & Tann: Nghị định 52/2024/NĐ-CP](https://www.rajahtannasia.com/wp-content/uploads/2024/09/2024_07_22-Decree-52-2024-ND-CP-NCP.pdf)
- [KuCoin News, 30/8/2026: chưa có giấy phép nào được cấp](https://www.kucoin.com/news/flash/vietnam-s-crypto-pilot-five-firms-pass-initial-review-no-licenses-issued-yet)
- [GV Lawyers: Thông tư 32/2026](https://gvlawyers.com.vn/wp-content/uploads/2026/03/EN_Legal-alert-_Circular-32-2026_Taxation-of-transactions-in-crypto-assets.pdf)
- [Việt Nam News: thuế 0,1% khi chuyển nhượng tài sản mã hóa](https://vietnamnews.vn/economy/1778511/0-1-tax-on-transfer-of-crypto-assets-mof-s-circular.html)
- [LuatVietnam: toàn văn Nghị quyết 05/2025/NQ-CP](https://english.luatvietnam.vn/resolution-no-05-2025-nq-cp-dated-september-09-2025-of-the-government-on-piloting-the-crypto-asset-market-in-vietnam-410830-doc1.html) (chưa mở; dành cho người thẩm định)
