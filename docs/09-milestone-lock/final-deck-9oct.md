# Bộ slide Final (bản 9/10): tối ưu theo tiêu chí chấm + nguồn tham khảo

**Ngày:** 9/10/2026 · **Người soạn:** Compliance Lead (với Claude) · **Áp dụng cho:** vòng Final 10/10/2026
**Canva:** design `DAHXZ7BFF7g` ("N.E.D · Final 10/10/2026"), đã lưu bản này ngày 9/10.
**Thay thế các điểm sau trong [`final-pitch.md`](final-pitch.md):** thời lượng Q&A (4 → **5 phút**), "không có slide doanh thu" (nay có **1 slide Sản phẩm & kinh doanh, 20 s**), thứ tự và mốc giờ slide. Phần còn lại của `final-pitch.md` (kịch bản demo, Q&A, cơ sở pháp lý) vẫn dùng.

> Không phải tư vấn pháp lý. Nhãn nguồn theo quy ước của repo: \[Verified\] / \[Inference\] / \[Assumption\] / \[Unverified\].

---

## 1. Yêu cầu cuộc thi (UniHackFest 2026, Corelia Academy × UEF)

- **Định dạng:** thuyết trình **5 phút** (đèn vàng 4:00) + **Q&A 5 phút** (team chốt 9/10 theo thông tin người thuyết trình; xác nhận lại với BTC tại chỗ) \[Unverified bằng văn bản\].
- **Ngôn ngữ:** slide, lời nói, Q&A **chỉ tiếng Việt**; tên nút trong app giữ tiếng Anh (BTC xác nhận 7/10, xem [`../05-legal/compliance-lead-tasks.md`](../05-legal/compliance-lead-tasks.md)) \[Verified\].
- **Hai track đã đăng ký** \[Verified\]:
  - *Track 1 · Best Product & Business (MEXC):* vấn đề thị trường và người dùng mục tiêu, giải pháp/demo, mô hình kinh doanh + đi thị trường (GTM) cho VN/SEA, trình bày/Q&A.
  - *Track 2 · Best Technical Build (Solana):* program chạy trên devnet, kết nối ví + frontend, bằng chứng trên Explorer, chất lượng code.
- **Tiêu chí chấm vòng Final** (BTC gửi, xác nhận 7/10) \[Verified\]:

| Tiêu chí | Điểm | Slide ghi điểm |
| --- | ---: | --- |
| Technical Difficulty & Depth | 30 | 4 Demo, 5 Ba bài toán khó |
| Architecture & Smart Contract Quality | 25 | 6 Kiến trúc |
| Solana Stack, Composability & Performance | 25 | 7 Solana + Phụ lục hiệu năng |
| Build Evidence, Documentation & Reproducibility | 20 | 8 Build + tiêu đề demo "kiểm chứng trên Explorer" |
| (Track 1: thị trường, mô hình, GTM) | — | 9 Sản phẩm & kinh doanh |

## 2. Nguyên tắc làm slide đã tổng hợp và áp dụng

| Nguyên tắc (từ nguồn ở mục 6) | Áp dụng trên bộ slide |
| --- | --- |
| Mở bằng vấn đề, rồi giải pháp, rồi demo; demo sớm | Vấn đề 0:00 → Giải pháp 0:20 → Demo bắt đầu 0:40 |
| Demo chạy thật, một luồng, khoảng 90 s, có một khoảnh khắc đáng nhớ | Demo 95 s, một luồng A→B; khoảnh khắc: **Release now** sau deadline review |
| Cho giám khảo thấy bằng chứng, không chỉ lời nói | Tiêu đề demo "Chạy trực tiếp trên devnet · kiểm chứng trên Explorer"; bước Explorer 10 s (bỏ nếu trễ >15 s) |
| Mỗi slide gắn với một tiêu chí chấm | Nhãn tiêu chí ở góc phải mỗi slide (28 px, đậm) |
| Tiêu đề là một câu khẳng định (assertion–evidence), chữ ít | "Một program, kiểm chứng sau mỗi bước", "Ai trả tiền? Client, không phải freelancer." |
| Nói rõ giới hạn | Slide 10 giữ: devnet, token thử, chưa audit, partner mô phỏng, chưa có trọng tài trung lập |
| Tập theo mốc giờ, có dự phòng | Ghi chú người nói có mốc giờ từng slide; dư 20 s; video dự phòng nếu demo hỏng |
| Phụ lục cho Q&A, không trình bày | Phụ lục hiệu năng (CU) và pháp lý chỉ mở khi được hỏi |

## 3. Thứ tự slide và mốc giờ (đã lưu trên Canva)

| # | Slide | Thời lượng | Mốc kết thúc |
| ---: | --- | ---: | ---: |
| 1 | Bìa | 0 | — |
| 2 | Vấn đề · người dùng | 20 s | 0:20 |
| 3 | Giải pháp | 20 s | 0:40 |
| 4 | Demo trực tiếp | 95 s | 2:15 |
| 5 | Ba bài toán khó (30 đ) | 35 s | 2:50 |
| 6 | Kiến trúc & chất lượng smart contract (25 đ) | 25 s | 3:15 |
| 7 | Solana stack · kết hợp · hiệu năng (25 đ) | 20 s | 3:35 |
| 8 | Bằng chứng build · tài liệu · chạy lại (20 đ) | 20 s | 3:55 |
| 9 | **Mới:** Sản phẩm & kinh doanh (Track 1) | 20 s | 4:15 |
| 10 | Giới hạn & lộ trình | 20 s | 4:35 |
| 11 | Kết → giữ slide này khi vào Q&A 5 phút | 5 s | 4:40 |
| 12 | Phụ lục · hiệu năng (chỉ khi được hỏi) | — | — |
| 13 | Phụ lục · pháp lý (chỉ khi được hỏi) | — | — |
| 14 | Cảm ơn đã lắng nghe! | — | — |

Trang 15–17 là trang thừa của template: **xoá tay trong Canva** (API không xoá được trang).

## 4. Thay đổi so với bản 8/10

- Bỏ ngày ("Final 10/10/2026", "Devnet 2026") ở đầu mọi trang; thêm nhãn tiêu chí chấm ở góc phải.
- Bìa: "Đội N.E.D · UniHackFest 2026 · Vòng chung kết".
- Slide cảm ơn chuyển sang tiếng Việt: "Cảm ơn / đã lắng nghe!".
- Slide 8: decision log **D1–D30**; ghi chú "537 commit lúc 9/10".
- **Slide 9 mới (Sản phẩm & kinh doanh):**
  - *Người dùng:* freelancer Việt Nam làm cho client nước ngoài; client đã giữ USDC; ≈ 7,2 tỷ USD USDC trên Solana (DefiLlama, đọc 2/10/2026) \[Verified, live\]; Việt Nam hạng 4/151 về mức độ dùng crypto (Chainalysis 9/2025) \[Verified\].
  - *Mô hình (dự kiến):* client trả 1% khi release; freelancer trả 0 cho N.E.D; Upwork Basic thu client 5% + phí hợp đồng \[Verified\]; v1 không thu phí, chỉ thu sau ý kiến luật sư \[Assumption\], xem `unit_economics.py`.
  - *Đi thị trường:* freelancer qua nhóm Facebook và CLB IT đại học; client qua cộng đồng Solana và hackathon; sau chung kết xin sandbox Due, Nium (ứng viên, partner hiện là mô phỏng).
  - *Minh hoạ, không phải dự báo:* 1.000 freelancer × 500 USD/tháng × 12 × 1% ≈ 60.000 USD/năm \[Assumption\].
- Ghi chú người nói mọi slide cập nhật mốc giờ mới, kèm các câu "không nói" theo bảng từ ngữ (`product-spec.md` §6).

## 5. Kiểm tra trước khi lưu (9/10)

- Rà toàn bộ chữ trên slide và ghi chú theo bảng từ cấm: chỉ còn các câu nhắc "không nói …" và tên nghị định trích dẫn ("phương tiện thanh toán hợp pháp" là nội dung NĐ 52/2024, không gọi USDC là thanh toán).
- Số liệu khớp `program-spec.md` / `progress-log.md`: 29 instruction, 55 mã lỗi, 26 event, 67 test (62 LiteSVM), post_job 49.173 CU = 24,6% của 200.000, transaction chọn người 789/1.232 byte.
- Tổng thời lượng 4:40, dư 20 s trong 5:00.
- So khớp từng phần tử bản đã lưu với bản xem trước đã được duyệt: trùng hết.

## 5b. Viết lại cho người không chuyên (9/10, chiều; đã lưu trên Canva)

**Lý do:** người xem ngoài ngành không hiểu được nhiều thuật ngữ (vault, program, release, payout partner, devnet, CU, PDA, multisig), và một số dòng viết như ghi chú cho dev. **Nguyên tắc:** nói bằng lời thường trước, thuật ngữ để trong ngoặc. Mốc giờ, số liệu và thứ tự slide không đổi.

| Slide | Trước | Sau |
| --- | --- | --- |
| Bìa | Khoá trước khi làm. | Khoá tiền công trước khi làm. |
| Vấn đề | Làm xong cho người A ở Singapore, rồi A biến mất … | B làm xong cho client A ở Singapore, rồi A biến mất, không trả tiền. Nhận crypto thay tiền cũng không ổn (theo cách nhóm đọc NĐ 52/2024). |
| Giải pháp | Từng milestone · Khoá trong vault do program sở hữu | Chia việc theo mốc · Client khoá USDC (đô la số) cho từng mốc, trong một két do code giữ. Không phải N.E.D giữ. |
| Giải pháp | Release hoặc refund theo code | Duyệt xong → tiền đi cho B · Quá hạn nộp → tiền về lại client |
| Giải pháp | VND vào ngân hàng qua payout partner (mô phỏng) | Nhận VND vào ngân hàng qua đối tác chuyển tiền (đang mô phỏng) |
| Demo | Chạy trực tiếp trên devnet · kiểm chứng trên Explorer | Chạy thật trên mạng thử Solana · kiểm chứng trên Explorer; mỗi bước có một câu "ai làm gì" (tên nút giữ tiếng Anh) |
| Ba bài toán khó | Hết hạn: ai cũng gọi được lệnh · … · fund_job + create_fund + select_job | Tiền chỉ đi theo hạn chót trong hợp đồng … · Bí mật trên blockchain công khai · Có tiền khoá rồi mới nhận việc (tên lệnh chuyển vào ghi chú) |
| Kiến trúc | Một program, kiểm chứng sau mỗi bước · 29 instruction · Bất biến | Một smart contract, kiểm tra sau mỗi bước · 29 lệnh · 26 nhật ký · Sổ sách luôn khớp (đã trả + đã hoàn + còn khoá = tổng tiền) |
| Solana | IDL on-chain · ví MPC nhúng, không seed phrase · compute budget | Framework chuẩn để viết smart contract · đăng nhập Google là có ví, không phải nhớ 12 từ khôi phục · "của sức tính toán cho phép mỗi lệnh" |
| Build | Binary trên devnet trùng bản build của nhóm | Code trên devnet trùng khớp mã nguồn công khai · Nhật ký 30 quyết định thiết kế (D1–D30) |
| Kinh doanh | Client trả 1% khi release · xin sandbox Due, Nium | Client trả 1% khi duyệt xong mỗi mốc · thử với đối tác chuyển tiền (Due, Nium) |
| Lộ trình | Partner · Audit · Multisig | Đối tác · Kiểm toán · Đa chữ ký, mỗi mục có một dòng giải thích |
| Kết | Release theo luật. · VND cho người B. | Tiền đi theo luật trong code. · Freelancer nhận VND. |

**Ghi chú người nói:** lời thoại slide 2, 4, 5, 6 viết lại bằng lời thường; ghi chú trang bìa có từ điển thuật ngữ (lần đầu nhắc thì giải thích một câu): USDC = đô la số (không gọi là "thanh toán"); vault = két do code giữ; milestone = mốc việc; release = chuyển tiền khi xong mốc; refund = trả lại client; devnet = mạng thử, token không có giá trị; Explorer = trang tra cứu công khai; payout partner = đối tác chuyển tiền (mô phỏng); CU = đơn vị sức tính toán.

**Cách nói đúng về smart contract:** "đoạn code tự chạy trên blockchain; tiền chỉ đi theo luật đã ghi trong code". **Không nói** "không ai sửa được code/luật": quyền nâng cấp program hiện vẫn ở ví của nhóm (sẽ chuyển sang multisig, xem slide Giới hạn & lộ trình). Bản ghi chú trang bìa trên Canva (lưu 9/10) còn câu "không ai sửa giữa chừng được luật đã ghi": cần sửa theo câu ở trên, hoặc không đọc câu đó.

**Lưu ý:** dòng "Đội N.E.D · UniHackFest 2026 · Vòng chung kết" không còn trên bìa bản Canva hiện tại (đã bị xoá trước đợt sửa này); thêm lại nếu nhóm muốn.

## 6. Nguồn đã dùng / đã tìm (để truy vết)

**Cuộc thi**
- UEF, "UEF launches UniHackFest 2026: opening a nationwide journey for students to conquer AI and Web3": https://www.uef.edu.vn/fit/news-events/uef-launches-unihackfest-2026-opening-a-nationwide-journey-for-students-to-conquer-ai-and-web3-37431
- Trang chính thức UniHackFest 2026: https://unihackfest.vn và tài liệu https://docs.unihackfest.vn (thể lệ, hai track; đường dẫn trang cụ thể không được lưu lại)
- Blog Corelia Academy (bài giới thiệu UniHackFest; đường dẫn cụ thể không được lưu lại): https://corelia.academy
- Sự kiện đào tạo UniHackFest × VLU: https://luma.com/cuo1h8or · UniHackFest × HUTECH Unitour: https://luma.com/px2q9yfk
- Tiêu chí chấm Final: ảnh chụp BTC gửi team (7/10), lưu ở Compliance Hub Tab 10.

**Cách làm slide, demo và cách giám khảo chấm**
- JetBrains, "How to win a hackathon: notes from the judging table" (6/2026): https://blog.jetbrains.com/ai/2026/06/how-to-win-a-hackathon-notes-from-the-judging-table/
- Colosseum, "Perfecting Your Hackathon Submission: Key Insights from the Colosseum Workshop": https://blog.colosseum.com/perfecting-your-hackathon-submission/
- AngelHack, "10 tips to help you rock your next hackathon demo": https://angelhack.com/blog/10-tips-to-help-you-rock-your-next-hackathon-demo/
- UNM, "Checklist for Assertion Evidence Slides": https://cpl.health.unm.edu/AssetListing/Using-PowerPoint-Effectively-4223/Checklist-for-Assertion-Evidence-Slides-11213
- Penn State, "Assertion-Evidence Slides Instruction Set": https://bpb-us-e1.wpmucdn.com/sites.psu.edu/dist/7/13153/files/2008/10/Assertion-Evidence-Slides-Instruction_Set.pdf
- Oakland University CETL, "Assertion-Evidence Slide Design for Better Learning Outcomes": https://oakland.edu/cetl/teaching-resources/teaching-tips/2020/Assertion-Evidence-Slide-Design-for-Better-Learning-Outcomes
- Superteam, Hackathon Resources: https://superteamdao.notion.site/Hackathon-Resources-2db72d2411584987b3c6a98aecc5c750

**Số liệu thị trường và phí (slide 2 và 9)**
- PayPal 2017 qua The Leader, 68% freelancer VN từng không được trả: https://e.theleader.vn/68-per-cent-of-freelancers-in-vietnam-having-experiences-of-not-being-paid-d2518.html
- Remote, trả chậm cho contractor (2/2025): https://remote.com/blog/contractor-management/reversing-late-payment-culture
- DefiLlama, USDC trên Solana: https://defillama.com/stablecoins/Solana
- Chainalysis, 2025 Global Crypto Adoption Index: https://www.chainalysis.com/blog/2025-global-crypto-adoption-index/
- Upwork, phí client: https://www.upwork.com/pricing/client · phí freelancer: https://support.upwork.com/hc/en-us/articles/211062538
- Fiverr: https://help.fiverr.com/hc/en-us/articles/360050216133 · Escrow.com: https://www.escrow.com/fee-calculator · Contra: https://contra.com/pricing
- Tham khảo phí payout: Stripe Global Payouts https://docs.stripe.com/global-payouts/pricing · Request Finance https://www.requestfinance.com/pricing
- Superteam Earn (kênh client): https://superteam.fun/earn

**Trong repo**
- [`final-pitch.md`](final-pitch.md), [`product-spec.md`](product-spec.md) §6 (bảng từ ngữ), [`program-spec.md`](program-spec.md), [`unit_economics.py`](unit_economics.py), [`../08-research/ned-research-and-compliance.md`](../08-research/ned-research-and-compliance.md) (mục Business model, rubric map), [`../05-legal/compliance-lead-tasks.md`](../05-legal/compliance-lead-tasks.md), [`../05-legal/qa-cheatsheet.md`](../05-legal/qa-cheatsheet.md), [`../progress-log.md`](../progress-log.md).
