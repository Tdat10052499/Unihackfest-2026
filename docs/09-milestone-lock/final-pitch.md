# N.E.D Milestone Lock: kịch bản thuyết trình vòng Final

**Phiên bản:** 7 Oct 2026 (cập nhật ngôn ngữ) · **Build tham chiếu:** `main` at `b9353d9` (program v1.3 trên devnet) · **Người soạn:** Compliance Lead
**Thời lượng:** pitch **4:30** (giới hạn 5:00, đèn vàng lúc 4:00) + Q&A **3–4 phút**
**Ngôn ngữ (ban tổ chức xác nhận 7 Oct):**
- Thuyết trình, slide và Q&A: **chỉ dùng tiếng Việt**.
- Sản phẩm (app, nút bấm, thông báo, lỗi): **giữ tiếng Anh**. Khi demo, đọc tên nút đúng như trên màn hình (ví dụ "**Accept & release**", "**Release now**"), sau đó giải thích bằng tiếng Việt.
- Thuật ngữ kỹ thuật không có từ Việt quen dùng thì giữ nguyên tiếng Anh: milestone, vault, program, PDA, instruction, transaction, deadline, payout partner, devnet.

Trong mọi slide, demo và Q&A: **người A** là client ở nước ngoài (Singapore), **người B** là freelancer ở Việt Nam (Hà Nội).

---

## 0. Bám theo tiêu chí chấm (Track 2)

| Tiêu chí | Điểm | Chỗ ghi điểm trong pitch | Bằng chứng đưa ra |
| --- | ---: | --- | --- |
| **Technical Difficulty & Depth** | 30 | Demo (1:40) + Slide 4 | Tiền đi theo deadline, ai cũng gọi được lệnh; nơi nhận tiền chốt từ lúc accept; yêu cầu chỉnh sửa không hoàn tiền cho client; nội dung mã hoá đầu-cuối trên chain công khai; Funded Jobs ghép nhiều lệnh trong một transaction |
| **Architecture & Smart Contract Quality** | 25 | Slide 5 | Sơ đồ PDA; bất biến `released + refunded + unsettled = total`; 54/54 test LiteSVM; 53 mã lỗi; 24 event; `transfer_checked` |
| **Solana Stack, Composability & Performance** | 25 | Slide 6 | Anchor 1.1.2, Token Interface, Circle devnet USDC, ví MPC của Dynamic; bảng compute units; IDL đăng on-chain |
| **Build Evidence, Documentation & Reproducibility** | 20 | Slide 7 + link trong Q&A | Repo công khai, hơn 420 commit; decision log D1–D28; program spec; 3 lệnh để chạy lại; script smoke trên devnet |

Track 2 không chấm business model, nên pitch **không có slide đối thủ, cũng không có slide doanh thu**. Nếu giám khảo hỏi thì trả lời trong Q&A (mục 4).

---

## 1. Phân bổ thời gian

| # | Slide | Thời gian | Thời lượng | Người nói | Tiêu chí |
| --- | --- | --- | --- | --- | --- |
| 1 | Vấn đề | 0:00–0:20 | 20 s | PO | (dẫn vào) |
| 2 | Giải pháp & ràng buộc thiết kế | 0:20–0:40 | 20 s | PO | Difficulty |
| 3 | **Demo trực tiếp** | 0:40–2:20 | 1:40 | PO thao tác, Dev đứng máy thứ 2 | Difficulty |
| 4 | Ba bài toán khó | 2:20–3:00 | 40 s | Dev | Difficulty |
| 5 | Kiến trúc & chất lượng contract | 3:00–3:30 | 30 s | Dev | Architecture |
| 6 | Solana stack & hiệu năng | 3:30–3:50 | 20 s | Dev | Solana stack |
| 7 | Bằng chứng build & khả năng chạy lại | 3:50–4:10 | 20 s | CL | Build evidence |
| 8 | Giới hạn, lộ trình & kết | 4:10–4:30 | 20 s | PO | (kết) |
| — | Dự phòng | 4:30–5:00 | 30 s | — | phòng khi demo chậm |

Tốc độ nói: khoảng 3 âm tiết mỗi giây. Lời nói bên dưới đã được cắt cho khớp thời gian, **đừng thêm câu**.

---

## 2. Từng slide

### Slide 1: Vấn đề (0:00–0:20)

**Trên slide**
- Tiêu đề: **"Làm xong việc. Không nhận được tiền công."**
- Con số lớn: **68%**, kèm dòng nhỏ: *freelancer Việt Nam từng ít nhất một lần không nhận được tiền công (khảo sát PayPal, 2017)*
- Hình: người B (Hà Nội) ↔ người A (Singapore), giữa hai người là dấu "?"

**Lời nói**
> "Theo khảo sát của PayPal năm 2017, 68% freelancer Việt Nam từng ít nhất một lần không nhận được tiền công từ khách hàng. Người B ở Hà Nội làm xong việc, người A ở Singapore biến mất. Và B không thể nhận crypto, vì ở Việt Nam, tiền mã hoá không phải là phương tiện thanh toán hợp pháp."

**Lưu ý:**
- Số 68% là của năm 2017, nên luôn nói kèm năm. Không nói "hầu hết freelancer".
- Cụm "phương tiện thanh toán hợp pháp" là trích theo Nghị định 52/2024, nên được dùng. Ngoài câu trích luật, không dùng chữ "thanh toán" cho USDC.

### Slide 2: Giải pháp & ràng buộc thiết kế (0:20–0:40)

**Trên slide**
- **"Tiền được khoá bằng code trước khi bắt đầu làm."**
- Ba dòng:
  - *Khoá theo từng milestone, trong vault do program sở hữu, không phải N.E.D*
  - *Tiền chỉ đi theo luật viết sẵn lúc tạo hợp đồng*
  - *Người B ở Việt Nam không bao giờ chạm vào crypto: nhận VND vào ngân hàng qua payout partner (mô phỏng trong demo)*

**Lời nói**
> "N.E.D Milestone Lock. Người A khoá USDC cho từng milestone trước khi bắt đầu làm, trong một vault do program sở hữu, không phải chúng tôi. Tiền chỉ đi theo luật viết trong code. Người B không bao giờ chạm vào crypto: payout partner ở nước ngoài chuyển VND vào ngân hàng. Trong demo, partner là mô phỏng."

### Slide 3: Demo trực tiếp (0:40–2:20)

Slide này chỉ có tiêu đề "Chạy trực tiếp trên Solana devnet" và link. Màn hình chuyển sang 2 trình duyệt đặt cạnh nhau. Chuẩn bị theo **mục 3 (Demo runbook)**. App hiển thị tiếng Anh; người nói đọc tên nút rồi giải thích bằng tiếng Việt.

| Thời gian | Thao tác | Lời nói |
| --- | --- | --- |
| 0:40 | Trình duyệt A (Workspace, chế độ xem quốc tế): mở `/new` **đã điền sẵn** "Landing page design", 2 milestone × 10 USDC, mỗi milestone có "Done when" → **Create** → ký | "Người A chia công việc thành hai milestone, mỗi milestone có tiêu chí nghiệm thu và deadline riêng." |
| 0:55 | Trình duyệt B (chế độ xem Việt Nam): mở link mời → đọc brief → **Accept** → chọn **"VND to my bank account"** → ký | "Người B đọc brief. Brief đã được mã hoá, chỉ hai bên đọc được. B bấm Accept và chọn nơi nhận tiền. Nơi nhận này giờ đã được chốt trên chain, không ai đổi được." |
| 1:15 | A: **Lock** 20 USDC → B thấy *"≈ 520,000 VND locked (estimate)"* | "Người A khoá 20 USDC. Người B thấy số tiền bằng VND, không có số dư crypto nào. Giờ B mới bắt đầu làm." |
| 1:30 | B: **Submit** milestone 1 (link Drive có watermark) → ký | "B nộp bản preview có watermark, không nộp file gốc. Trên chain chỉ lưu dấu vân tay của file và thời gian nộp." |
| 1:45 | A: chuông thông báo → **Review** → **Accept & release** | "A đối chiếu với tiêu chí rồi bấm Accept & release. Tiền đi tới payout partner; phần chuyển VND là mô phỏng." |
| 1:58 | Mở **contract B** đã chuẩn bị (link trực tiếp) → **Release now** | "Đây là tình huống quan trọng nhất. Ở hợp đồng này, A không review. Deadline review đã qua, nên ai cũng bấm được Release now, và B vẫn nhận được tiền." |
| 2:10 | Mở Solana Explorer: vault account → owner = program | "Vault thuộc về program. Không có key nào của N.E.D di chuyển được số tiền này." |
| 2:20 | Chuyển sang Slide 4 | — |

- **Nếu đang trễ hơn 15 s:** bỏ bước Explorer, nói câu cuối khi chuyển slide.
- **Nếu đang sớm hơn 15 s:** ở contract A, mở màn **Request changes**, chỉ cho xem chứ không ký. Lời nói: *"Nếu bài chưa đạt, A có thể yêu cầu chỉnh sửa, nhưng tiền không bao giờ quay về một mình A. Tiền vẫn bị khoá cho tới khi hai bên đồng ý."*
- **Nếu demo hỏng** (mạng, RPC, đăng nhập): nói *"Mình chuyển sang video quay đúng bản build này"*, rồi bật backup video 60–90 s ngay. Không cố gỡ lỗi trên sân khấu.

### Slide 4: Ba bài toán khó (2:20–3:00)

**Trên slide** (3 cột, mỗi cột 1 icon + 2 dòng)
1. **Không ai tự lấy được tiền.** *Hết deadline thì ai cũng gọi được lệnh · nơi nhận tiền chốt từ lúc accept · yêu cầu chỉnh sửa không hoàn tiền cho client*
2. **Nội dung riêng tư trên chain công khai.** *Mã hoá ngay trên thiết bị (XChaCha20-Poly1305) · khoá hợp đồng được bọc cho từng thiết bị (X25519 + HKDF) · không có backend*
3. **Funded Jobs, nguyên tử.** *Ngân sách bị khoá ngay lúc đăng job · `create_fund + select_job` và `accept + lock_from_job` đều nằm trong một transaction*

**Lời nói**
> "Ba bài toán khó. Một: không ai tự lấy được tiền. Hết deadline thì ai cũng gọi được lệnh release hoặc refund; nơi nhận tiền được chốt từ lúc freelancer accept; và yêu cầu chỉnh sửa không bao giờ hoàn tiền cho client. Hai: nội dung riêng tư trên một chain công khai. Brief và bài nộp được mã hoá ngay trên thiết bị; khoá của hợp đồng được bọc cho từng thiết bị bằng X25519, nên kể cả chúng tôi cũng không đọc được. Ba: Funded Jobs. Doanh nghiệp khoá toàn bộ ngân sách ngay khi đăng job. Chọn người và accept đều là một transaction nguyên tử, nên tiền chỉ di chuyển sau khi nơi nhận đã được chốt."

**Hình gợi ý:** ảnh chụp một transaction `post_note` trên Explorer để thấy dữ liệu chỉ là ciphertext.

### Slide 5: Kiến trúc & chất lượng contract (3:00–3:30)

**Trên slide**
- Sơ đồ: `Workspace (web) · Wallet (mobile)` → `@ned/core` (dùng chung) → **`ned_program`** (Anchor) → PDA: `SharedFund` · `vault` · `JobListing` · `job_vault` · `JobApplication` · `DeviceKeys` → USDC (Token Interface)
- Ô bên phải:
  - **27 instruction** · **53 mã lỗi** · **24 event**
  - Bất biến: `released + refunded + unsettled = total`
  - **54/54 test LiteSVM**: mọi mốc deadline, release hai lần, sai mint, token gửi lạc vào vault, đường Việt Nam
  - Checked math · `transfer_checked` · mỗi hợp đồng một vault

**Lời nói**
> "Một Anchor program, một core TypeScript dùng chung, hai app. Mỗi hợp đồng và mỗi job có vault PDA riêng. Program luôn giữ một bất biến: đã release cộng đã refund cộng phần chưa xử lý luôn bằng tổng. 54 test LiteSVM kiểm tra mọi mốc deadline, release hai lần, sai mint, token gửi lạc vào vault và đường Việt Nam. Mỗi lỗi có mã riêng, mỗi thay đổi trạng thái đều phát event."

### Slide 6: Solana stack & hiệu năng (3:30–3:50)

**Trên slide**
- Stack: **Anchor 1.1.2 · SPL Token Interface · Circle devnet USDC · Dynamic (đăng nhập Google → ví MPC nhúng, không seed phrase) · IDL đăng on-chain**
- Bảng compute units (LiteSVM và smoke run trên devnet):

| Instruction | CU |
| --- | ---: |
| `create_fund` (3 milestone) | 29,824 |
| `lock` | 22,260 |
| `approve` | 27,185 |
| `release_after_review` | 27,355 |
| `accept + lock_from_job` (1 transaction) | 36,411 |
| `accept_cancel` (cao nhất) | 39,781 |

- Dòng dưới bảng: *Mọi instruction đều dùng dưới 20% hạn mức mặc định 200,000 CU*

**Lời nói**
> "Chúng tôi dùng Token Interface với USDC devnet của Circle, nên đây là dòng token thật. Người dùng đăng nhập bằng Google và có ví MPC nhúng, không cần seed phrase. Mọi instruction dùng chưa tới 20% compute budget mặc định, và các lệnh ghép được vào một transaction."

### Slide 7: Bằng chứng build & khả năng chạy lại (3:50–4:10)

**Trên slide**
- **Repo công khai:** `github.com/Tdat10052499/Unihackfest-2026`, hơn 420 commit
- **Tài liệu:** decision log D1–D28 · program spec (byte layout, mã lỗi, test) · nhật ký tiến độ kèm kết quả test
- **Chạy lại bằng 3 lệnh:**
  ```
  cd ned_program && anchor build
  cargo test --manifest-path programs/ned-program/Cargo.toml   # 54/54
  cd ../ned-wallet && npm run jobs:smoke                         # chạy end-to-end trên devnet
  ```
- **Bản live:** Workspace `unihackfest-2026.vercel.app` · Program `8azx…WbX5Wh` (devnet), binary trên devnet đã kiểm tra trùng với bản build local
- QR **chỉ trỏ tới repo** (không QR sàn giao dịch, không referral)

**Lời nói**
> "Mọi thứ đều công khai: hơn bốn trăm commit, decision log cho từng quyết định thiết kế và đặc tả program đầy đủ. Chỉ với ba lệnh, ban giám khảo có thể build lại program, chạy đủ 54 test và chạy lại toàn bộ luồng trên devnet. Chúng tôi đã kiểm tra binary trên devnet trùng với bản build local."

### Slide 8: Giới hạn, lộ trình & kết (4:10–4:30)

**Trên slide**
- **N.E.D không bao giờ:** giữ tiền · quy đổi tiền · thu phí (v1)
- **Giới hạn hiện tại:** devnet, token thử · chưa audit · payout partner là mô phỏng · chưa có trọng tài trung lập
- **Tiếp theo:** sandbox với partner (ứng viên: Due, Nium) → ý kiến luật sư → người review trung lập → audit → multisig cho quyền upgrade → thí điểm
- Câu kết lớn: **"Khoá trước khi làm. Release theo luật. VND cho người B."**

**Lời nói**
> "N.E.D không giữ tiền, không quy đổi tiền và không thu phí. Đây là prototype trên devnet: chưa audit, partner là mô phỏng, chưa có trọng tài trung lập. Bước tiếp theo là sandbox với partner, ý kiến luật sư, audit và multisig. Khoá trước khi làm. Release theo luật. Xin cảm ơn."

---

## 3. Demo runbook

**Ngày hôm trước (9 Oct)**
- [ ] Người A có **≥ 30 devnet USDC** (10 cho contract B + 20 cho contract A). Faucet: 20 USDC/địa chỉ mỗi 2 giờ, nên claim 2 lần cách nhau 2 giờ, hoặc chạy `npm run recycle:demo-usdc`.
- [ ] Người B có devnet SOL để trả phí mạng (không hiện số ở chế độ xem Việt Nam).
- [ ] Quay **backup video 60–90 s** bằng app thật, đúng thứ tự demo. Không dùng mock-up. Lồng tiếng hoặc phụ đề tiếng Việt.
- [ ] Tập toàn bộ ít nhất **2 lần có bấm giờ**, kể cả 15 phút chuẩn bị contract B.

**Trên sân khấu, T−30 phút**
- [ ] 2 laptop (hoặc 1 laptop 2 cửa sổ): **cả hai vai đều trên Workspace**. Người A ở chế độ xem quốc tế, người B ở chế độ xem Việt Nam. *(Không dùng app mobile cho phần request changes cho tới khi S-1 được sửa.)*
- [ ] Đăng nhập sẵn cả hai tài khoản Google. Tắt thông báo hệ thống, zoom trình duyệt 125%.
- [ ] Điền sẵn form `/new`, nhưng **chưa bấm Create**.
- [ ] Mở sẵn tab Solana Explorer (cluster devnet) để chỉ vào vault.
- [ ] Hotspot điện thoại dự phòng. Backup video mở sẵn ở tab khác.

**T−15 phút: chuẩn bị contract B** (bằng login thật của A và B, không dùng script)
1. A tạo contract: 1 milestone × 10 USDC, submission deadline = lúc tạo + 5 phút, review deadline = 60 s sau submission deadline.
2. B accept (chọn VND) → A lock → B submit.
3. Chờ hết review deadline, rồi kiểm tra nút **Release now** đã hiện. **Không bấm.**
4. Mở contract B ở một tab riêng.

**Tỷ giá:** cập nhật con số "≈ 520,000 VND" (20 × tỷ giá mid-market trong ngày) nếu tỷ giá thay đổi đáng kể.

---

## 4. Q&A (3–4 phút ≈ 5–7 câu hỏi)

**Luật trả lời:**
- Trả lời bằng tiếng Việt, mỗi câu ≤ 30 s.
- PO nhận câu hỏi rồi chỉ định người trả lời. Ai được giao thì người đó nói, không nói chen.
- Không biết thì nói thẳng: *"Phần này nhóm chưa đo; nếu làm, nhóm sẽ làm thế này."* Không đoán.

**Phân công:** Dev trả lời kỹ thuật (T1–T8) · CL trả lời pháp lý, dữ liệu, thuế (L1–L5) · PO trả lời sản phẩm (P1–P4).

### Kỹ thuật (Dev)

| # | Câu hỏi | Trả lời |
| --- | --- | --- |
| T1 | Ai upgrade được program? Nhóm có thể ôm tiền không? | "Không có instruction nào cho key của N.E.D di chuyển tiền đã khoá. Quyền upgrade hiện vẫn ở deploy wallet của nhóm tới hết vòng final để sửa lỗi, và nhóm đã công khai điều này. Trước mainnet, quyền này chuyển sang multisig Squads, hoặc program được khoá không cho upgrade nữa." |
| T2 | Vì sao ai cũng gọi được release / refund? | "Để không ai phải tin một server hay phải online. Hết review deadline, release chỉ đi tới nơi nhận đã chốt lúc accept; hết submission deadline, refund chỉ về client. Người gọi lệnh không chọn được gì." |
| T3 | Điều gì ngăn client cố tình ngâm review? | "Nếu client không review kịp, cả hai bên đều thấy Release now. Yêu cầu chỉnh sửa không bao giờ hoàn tiền cho client; tiền vẫn khoá cho tới khi hai bên đồng ý." |
| T4 | Nếu hai bên không bao giờ đồng ý? | "Hiện tại tiền vẫn bị khoá; chưa có trọng tài trung lập, và app có ghi rõ điều đó. Nhóm đã chừa sẵn chỗ trong account cho trường arbiter. Muốn thêm thì cần ý kiến pháp lý trước." |
| T5 | Mã hoá hoạt động thế nào? | "Mỗi hợp đồng có một khoá ngẫu nhiên. Nội dung được mã hoá bằng XChaCha20-Poly1305 rồi đăng thành note. Khoá được bọc cho từng thiết bị đã đăng ký bằng X25519 và HKDF-SHA256. Public key của thiết bị nằm trên chain; private key không bao giờ rời thiết bị." |
| T6 | Thao túng thời gian / mốc deadline? | "Deadline dùng đồng hồ của cluster. Test kiểm tra đúng giây trước và sau mỗi deadline, và thời gian làm việc, thời gian review tối thiểu được kiểm tra ngay lúc tạo." |
| T7 | Token gửi lạc, sai mint, release hai lần? | "Mỗi trường hợp đều có test. Token gửi lạc vào vault không làm sai sổ sách, sai mint bị constraint chặn, và milestone đã xử lý thì không xử lý lại được." |
| T8 | Mở rộng quy mô thế nào? | "Mỗi hợp đồng và mỗi job là một account riêng, nên không có tranh chấp state chung. Job board hiện đọc account trực tiếp; khi vượt vài trăm listing thì nhóm thêm indexer." |

### Pháp lý & dữ liệu (CL)

| # | Câu hỏi | Trả lời |
| --- | --- | --- |
| L1 | Ở Việt Nam có hợp pháp không? | "Theo Nghị định 52/2024, tiền mã hoá không phải phương tiện thanh toán hợp pháp ở Việt Nam. Vì vậy người dùng Việt Nam của nhóm không bao giờ nhận crypto: client khoá USDC ở nước ngoài, payout partner ở nước ngoài chuyển VND qua ngân hàng. Trong demo, partner là mô phỏng. Nhóm không giữ tiền. Trước khi có tiền thật, cần luật sư xác nhận phần mềm này không phải dịch vụ tài sản mã hoá theo Nghị định 284/2026." |
| L2 | KYC / chống rửa tiền? | "KYC và thông tin ngân hàng nằm ở payout partner, không bao giờ ở nhóm. Mỗi hợp đồng bị giới hạn 1,000 USDC. Devnet chưa có KYC, và nhóm công khai điều đó. Sàng lọc ví nằm trong lộ trình." |
| L3 | Dữ liệu cá nhân đi đâu? | "Đăng nhập qua Dynamic, có màn đồng ý rõ ràng. Nội dung hợp đồng được mã hoá, kể cả nhóm cũng không đọc được. Địa chỉ ví, username, tiêu đề hợp đồng và job listing là công khai trên chain, và app nhắc người dùng không ghi dữ liệu cá nhân vào đó." |
| L4 | Đây có phải sàn việc làm không? | "Doanh nghiệp tự đăng funded job và tự chọn freelancer. N.E.D không chọn, không thẩm định, không tuyển dụng ai, và không phải một bên của công việc." |
| L5 | Thuế thì sao? | "Doanh thu kinh doanh tới 500 triệu đồng một năm được miễn thuế thu nhập cá nhân theo Luật 109/2025. Nhóm cung cấp bản ghi để freelancer tự kê khai; đây không phải tư vấn thuế." |

### Sản phẩm (PO)

| # | Câu hỏi | Trả lời |
| --- | --- | --- |
| P1 | Vì sao chọn Solana? | "Phí dưới một cent, khoảng 7 tỷ đô USDC đang nằm trên Solana, và USDC devnet của Circle giúp nhóm demo dòng token thật." *(Kiểm tra lại số trên DefiLlama ngày 9 Oct.)* |
| P2 | Nhóm kiếm tiền thế nào? | "Bản v1 không thu phí. Một khoản phí nhỏ phía client khi release chỉ được tính tới sau khi có ý kiến pháp lý." |
| P3 | Còn thiếu gì trước khi launch? | "Sandbox với payout partner, ý kiến luật sư, OTP, audit và multisig. Sau đó thí điểm với các cặp client và freelancer thật." |
| P4 | Nhóm có dùng AI không? | Trả lời trung thực theo câu team đã thống nhất, ví dụ: *"Có, nhóm dùng AI hỗ trợ viết code; mọi commit đều công khai và nhóm có thể giải thích bất kỳ instruction nào."* |
| P5 | Sao app lại bằng tiếng Anh? | "Người dùng chính là client nước ngoài và freelancer làm việc với họ, nên sản phẩm dùng tiếng Anh. Ban tổ chức cũng yêu cầu sản phẩm bằng tiếng Anh." |

---

## 5. Phải xong trước final (chặn pitch nếu chưa xong)

| # | Việc | Owner | Hạn | Vì sao |
| --- | --- | --- | --- | --- |
| 1 | **Viết lại README**: hiện README vẫn tả bản wallet cũ (Neo-brutalism, Jupiter, swap), ghi "24 milestone tests" và "updated 3 Oct". Cần: tổng quan Milestone Lock, link live, program ID, 54 test, 3 lệnh để chạy lại, bảng CU, phần limits. README giữ tiếng Anh (thuộc sản phẩm) | PO + Dev | **8 Oct** | Tiêu chí 4 (20 điểm): giám khảo mở repo là thấy ngay |
| 2 | Thêm file **LICENSE** (README đang ghi MIT nhưng chưa có file) hoặc bỏ dòng đó | PO | 8 Oct | Tiêu chí 4 |
| 3 | **S-1**: bật D27 trên mobile, hoặc đổi disclosure ở mobile cho khớp ("No neutral arbiter") | Dev | 8 Oct 18:00 | Tránh việc app nói sai khi giám khảo tự thử |
| 4 | Thay các key bị lộ (S1–S3) | PO | ngay | An toàn khi demo |
| 5 | Backup video 60–90 s (lồng tiếng hoặc phụ đề tiếng Việt) | Design + PO | 9 Oct | Bắt buộc theo rule |
| 6 | Slide tiếng Việt, gửi cho ban tổ chức | Biz | theo hạn BTC | Bắt buộc theo rule |
| 7 | CL ký duyệt: mọi câu trên slide, app, booth đều đúng sự thật hoặc được ghi là lộ trình | CL | 9 Oct | Compliance |

---

## 6. Quy tắc chữ khi nói tiếng Việt

Word table gốc nằm ở `product-spec.md` §6 (cho chữ tiếng Anh trong sản phẩm). Khi thuyết trình bằng tiếng Việt:

| Dùng | Không dùng |
| --- | --- |
| khoá (lock), release, hoàn tiền (refund), nhận tiền công / nhận thu nhập, yêu cầu chỉnh sửa (request changes), Release now | "thanh toán" hoặc "trả tiền" cho USDC (trừ câu trích Nghị định 52/2024), "ký quỹ", "escrow" (trừ khi giám khảo dùng trước), "đặt cọc", "đầu tư", "lợi nhuận", "lãi suất" |
| "payout partner (ứng viên: Due, Nium), mô phỏng trong demo" | "đối tác của chúng tôi", "đối tác được cấp phép" |
| "devnet, token thử" | "an toàn", "đảm bảo", "cam kết", "chống lừa đảo", "đúng luật thuế", "đầu tiên", "duy nhất", "miễn phí hoàn toàn" |
| "khi hết deadline review, cả hai bên thấy Release now" | "tự động giải ngân", "auto-release" |
| "sàng lọc ví nằm trong lộ trình" | "chúng tôi sàng lọc ví", "chúng tôi không cung cấp dịch vụ" |

Mỗi con số phải có nguồn (mục 7); con số nào cũ thì nói kèm năm.

---

## 7. Tài nguyên

### Bản live & on-chain

| Mục | Link |
| --- | --- |
| Workspace (web app, Jobs ở `/jobs`) | https://unihackfest-2026.vercel.app |
| Wallet (bản web của app mobile) | https://tdat10052499.github.io/Unihackfest-2026/ |
| Repo | https://github.com/Tdat10052499/Unihackfest-2026 |
| Program trên Explorer (devnet) | https://explorer.solana.com/address/8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh?cluster=devnet |
| Payout partner demo (allowlist) | `FA2qzovJShkNNNnMz3nXmYXvBzenRTgU2oko7RBBhbyp` |
| Circle devnet USDC mint | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| Circle faucet | https://faucet.circle.com |

### Tài liệu trong repo

| Tài liệu | Dùng để |
| --- | --- |
| `docs/09-milestone-lock/README.md` | Decision log D1–D28 |
| `docs/09-milestone-lock/program-spec.md` | Byte layout, instruction, mã lỗi, test |
| `docs/09-milestone-lock/system-tracker.md` | Workflow, tình huống, bất biến |
| `docs/09-milestone-lock/product-spec.md` §6–7 | Word table, demo script gốc |
| `docs/09-milestone-lock/funded-jobs-plan.md`, `review-decision-plan.md` | Funded Jobs (D25), yêu cầu chỉnh sửa (D27) |
| `docs/tong-hop-tien-do.md` | Kết quả test, bảng CU, thông tin devnet |
| `docs/05-legal/qa-cheatsheet.md` | Bản Q&A đầy đủ (tiếng Anh, dùng để tham khảo nội dung) |
| `docs/08-research/ned-research-and-compliance.md` | Nguồn số liệu và luật |

### Số liệu dùng trong pitch

| Số | Nguồn | Trạng thái |
| --- | --- | --- |
| 68% freelancer Việt Nam từng không nhận được tiền công | [Khảo sát PayPal, qua The Leader, 2017](https://e.theleader.vn/68-per-cent-of-freelancers-in-vietnam-having-experiences-of-not-being-paid-d2518.html) | Verified, số liệu cũ (nói kèm năm) |
| ≈ 7 tỷ đô USDC trên Solana | [DefiLlama](https://defillama.com/stablecoins/Solana) | Verified ngày 2 Oct; kiểm tra lại 9 Oct |
| 54/54 test program; bảng CU | `docs/tong-hop-tien-do.md` (S1, g15) | Verified trên repo |
| 27 instruction, 53 mã lỗi, 24 event | `ned_program/programs/ned-program/src/` | Verified trên `b9353d9` |
| Hơn 420 commit | `git log` trên `main` | Verified 7 Oct (428 commit) |
| ≈ 520,000 VND cho 20 USDC | Wise mid-market, 2 Oct | Cập nhật vào ngày thi |

### Cơ sở pháp lý (cho Q&A)

- Nghị định 52/2024/NĐ-CP, Đ.3(10–11), Đ.8(6–7): tiền mã hoá không phải phương tiện thanh toán hợp pháp
- Nghị định 284/2026/NĐ-CP, Đ.7(4): dịch vụ tài sản mã hoá (hiệu lực 1 Sep 2026)
- Nghị quyết 05/2025/NQ-CP: thí điểm thị trường tài sản mã hoá
- Luật Bảo vệ dữ liệu cá nhân 91/2025 + Nghị định 356/2025: dữ liệu cá nhân
- Luật 109/2025, Đ.7: ngưỡng miễn thuế TNCN 500 triệu đồng
- Luật 74/2025 / Nghị định 352/2025: dịch vụ việc làm (áp dụng cho job board hay không vẫn **[Unverified]**, đang chờ chuyên gia; không khẳng định trên sân khấu)

*Đây không phải tư vấn pháp lý. Các điểm [Unverified] cần luật sư xác nhận.*
