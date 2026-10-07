# N.E.D · Network of Employment Deals: kịch bản thuyết trình vòng Final

> **Tên và logo mới (PO, 7 Oct):** sản phẩm là **N.E.D · Network of Employment Deals**, gồm hai phần **Milestone Lock** (hợp đồng theo milestone) và **N.E.D Jobs** (nơi đăng việc). Logo: `assets/images/ned-logo.png` (vuông) và `assets/images/ned-logo-banner.png` (ngang). Dùng logo ở slide mở đầu và slide 8; không tự vẽ lại logo.

**Phiên bản:** 7 Oct 2026 (sau đợt rà soát: code, tài liệu và nguồn bên ngoài) · **Build tham chiếu:** `main`, program v1.4 trên devnet (upgrade V3 và IDL on-chain V4, 7/10; trước đó v1.3) · **Người soạn:** Compliance Lead
**Thời lượng:** pitch **4:30** (giới hạn 5:00, đèn vàng lúc 4:00) + Q&A **3 phút**
**Ngôn ngữ (ban tổ chức xác nhận 7 Oct):**
- Thuyết trình, slide và Q&A: **chỉ dùng tiếng Việt**.
- Sản phẩm (app, nút bấm, thông báo, lỗi): **giữ tiếng Anh**. Khi demo, đọc tên nút đúng như trên màn hình (ví dụ "**Slide to accept**", "**Accept & release**", "**Release now**"), rồi giải thích bằng tiếng Việt.
- Thuật ngữ kỹ thuật chưa có từ Việt quen dùng thì giữ nguyên tiếng Anh: milestone, vault, program, PDA, instruction, transaction, deadline, payout partner, devnet.

Trong mọi slide, demo và Q&A: **người A** là client ở nước ngoài (Singapore), **người B** là freelancer ở Việt Nam (Hà Nội).

---

## 0. Bám theo tiêu chí chấm vòng Final (BTC gửi, xác nhận 7/10)

| Tiêu chí | Điểm | Ghi điểm ở đâu | Bằng chứng đưa ra |
| --- | ---: | --- | --- |
| **Technical Difficulty & Depth** | 30 | Demo (1:40) + Slide 4 | Tiền chỉ đi theo deadline và ai cũng gọi được lệnh; nơi nhận tiền chốt từ lúc accept; yêu cầu chỉnh sửa không hoàn tiền cho client; nội dung mã hoá đầu-cuối trên chain công khai; job board khoá ngân sách lúc đăng hoặc lúc chọn người, luôn trước khi accept (`fund_job + create_fund + select_job` trong một transaction) |
| **Architecture & Smart Contract Quality** | 25 | Slide 5 | Sơ đồ PDA; bất biến `released + refunded + unsettled = total` được kiểm tra sau mỗi bước test; 67 test (62 test LiteSVM chạy trên program); 55 mã lỗi; 26 event; `transfer_checked` |
| **Solana Stack, Composability & Performance** | 25 | Slide 6 | Anchor 1.1.2, Token Interface, Circle devnet USDC, ví MPC của Dynamic; bảng compute units |
| **Build Evidence, Documentation & Reproducibility** | 20 | Slide 7 + link trong Q&A | Repo công khai, hơn 420 commit; decision log D1–D29; program spec; build và test bằng 2 lệnh; script chạy lại luồng trên devnet |

Vòng Final ngày **10/10/2026** chấm theo đúng 4 tiêu chí trên (nhóm thi cả hai track; BTC đã xác nhận 7/10). Không có tiêu chí business model, nên pitch **không có slide đối thủ, cũng không có slide doanh thu**. Nếu giám khảo hỏi thì trả lời trong Q&A (mục 4, P2 và P6; số liệu trong `../05-legal/qa-cheatsheet.md`).

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
- Con số lớn: **68%**, kèm dòng nhỏ: *freelancer ở Việt Nam từng gặp tình trạng không được trả tiền công (khảo sát PayPal, 10/2017; 1.602 người ở 4 nước Đông Nam Á)*
- Hình: người B (Hà Nội) ↔ người A (Singapore), giữa hai người là dấu "?"

**Lời nói**
> "Theo một khảo sát của PayPal cuối năm 2017, 68% freelancer ở Việt Nam từng gặp tình trạng không được trả tiền công. Người B ở Hà Nội làm xong việc, người A ở Singapore biến mất. Và theo cách nhóm đọc Nghị định 52, B không nên nhận crypto, vì tiền mã hoá không nằm trong danh mục phương tiện thanh toán hợp pháp."

**Lưu ý:**
- Số 68% là của khảo sát năm 2017 (công bố 3/2018), nên luôn nói kèm năm. Không nói "ít nhất một lần" hay "hầu hết freelancer": nguồn chỉ nói "từng gặp tình trạng không được trả tiền".
- Mẫu 1.602 người là tổng của 4 nước (gồm cả người đang cân nhắc làm freelance), không phải riêng Việt Nam.
- Cụm "phương tiện thanh toán hợp pháp" là trích theo Nghị định 52/2024, nên được dùng. Nghị định không gọi tên crypto; "không nằm trong danh mục" là cách đọc chính xác. Ngoài câu trích luật, không dùng chữ "thanh toán" cho USDC.

### Slide 2: Giải pháp & ràng buộc thiết kế (0:20–0:40)

**Trên slide**
- **"Tiền được khoá bằng code trước khi bắt đầu làm."**
- Ba dòng:
  - *Khoá theo từng milestone, trong vault do program sở hữu, không phải N.E.D*
  - *Tiền chỉ đi theo luật viết sẵn lúc tạo hợp đồng*
  - *Người B ở Việt Nam không bao giờ nhận, giữ hay gửi USDC: nhận VND vào ngân hàng qua payout partner (mô phỏng trong demo)*

**Lời nói**
> "N.E.D, Network of Employment Deals. Với Milestone Lock, người A khoá USDC cho từng milestone trước khi bắt đầu làm, trong một vault do program sở hữu, không phải chúng tôi. Tiền chỉ đi theo luật viết trong code. Người B không bao giờ nhận USDC: payout partner ở nước ngoài chuyển VND vào ngân hàng. Trong demo, partner là mô phỏng."

**Lưu ý:** không nói "B không bao giờ chạm vào crypto". Ví đăng nhập của B vẫn ký giao dịch và dùng test SOL trả phí mạng (A4), giám khảo thấy được điều đó trong app.

### Slide 3: Demo trực tiếp (0:40–2:20)

Slide này chỉ có tiêu đề "Chạy trực tiếp trên Solana devnet" và link. Màn hình chuyển sang 2 trình duyệt đặt cạnh nhau. Chuẩn bị theo **mục 3 (Demo runbook)**. App hiển thị tiếng Anh; người nói đọc tên nút rồi giải thích bằng tiếng Việt.

**Lưu ý kỹ thuật:** Accept và Lock không làm trên trang hợp đồng của Workspace, mà trong **panel ví** (nút **Open in wallet**, mở bản app ví ngay trong Workspace). Trong panel ví, hai thao tác này là thanh trượt **Slide to accept** / **Slide to lock**.

| Thời gian | Thao tác | Lời nói |
| --- | --- | --- |
| 0:40 | Trình duyệt A (Workspace, chế độ xem quốc tế): mở `/new` **đã điền sẵn** "Landing page design", 2 milestone × 10 USDC (deadline +1 day), mỗi milestone có "Done when" → **Create** → xác nhận trong panel ví | "Người A chia công việc thành hai milestone, mỗi milestone có tiêu chí nghiệm thu và deadline riêng." |
| 0:55 | Trình duyệt B (chế độ xem Việt Nam): mở link mời → đọc brief → **Open in wallet** → **Slide to accept** (lựa chọn "VND to my Vietnamese bank account" đã được chọn sẵn) | "Người B đọc brief. Brief đã được mã hoá, N.E.D không có khoá để đọc. B trượt để accept, nhận tiền bằng VND vào tài khoản ngân hàng. Nơi nhận này giờ đã được chốt trên chain, không bên nào đổi được." |
| 1:15 | A: **Open in wallet** → **Slide to lock** 20 USDC → B thấy *"Locked for you · ≈ 520,000 VND (estimate)"* | "Người A khoá 20 USDC. Người B thấy khoảng 520 nghìn đồng, không có số dư crypto nào. Giờ B mới bắt đầu làm." |
| 1:30 | B: **Submit** milestone 1 (link Drive có watermark; ở mục **Final files you will hand over after release** chọn sẵn 2 file cuối, *cập nhật 7/10: bắt buộc từ F1*) → xác nhận | "B nộp bản preview có watermark, không nộp file gốc. Trên chain lưu dấu vân tay và thời gian nộp; nội dung bài nộp được mã hoá." |
| 1:45 | A: bấm vào cửa sổ A → chuông thông báo → **Review** → **Load preview** (khung Drive hiện bản preview có watermark) → **Accept & release** | "A xem bản preview ngay trong trang Review, đối chiếu với tiêu chí rồi bấm Accept & release. Tiền đi tới payout partner; phần chuyển VND là mô phỏng." *(cập nhật 7/10: thêm bước Load preview)* |
| 1:58 | Mở **contract B** đã chuẩn bị (link trực tiếp) → **Release now** | "Đây là tình huống quan trọng nhất. Ở hợp đồng này, A không review. Deadline review đã qua, nên ai cũng bấm được Release now, và tiền đi tới payout partner cho B." |
| 2:10 | Mở Solana Explorer: vault account → owner = program | "Vault thuộc về program. Không có instruction nào cho N.E.D di chuyển số tiền này." |
| 2:20 | Chuyển sang Slide 4 | — |

- **Nếu đang trễ hơn 15 s:** bỏ bước Explorer, nói câu cuối khi chuyển slide.
- **Nếu còn dư thời gian (tuỳ chọn, thêm 7/10):** sau **Accept & release** ở bước 1:45, cuộn lên thẻ **Final files** đang ở trạng thái *"Waiting for final files from @…"* với danh sách file đã hứa. Lời nói: *"Sau khi release, A thấy rõ đang chờ những file nào, và kiểm tra được khi file tới."*
- **Nếu đang sớm hơn 15 s:** ở bước 1:45, **trước khi** bấm Accept & release, mở **Request changes** cho xem rồi bấm Cancel. (Sau khi đã release, nút này không còn hiện.) Lời nói: *"Nếu bài chưa đạt, A có thể yêu cầu chỉnh sửa, nhưng tiền không bao giờ quay về một mình A. Tiền vẫn bị khoá cho tới khi hai bên đồng ý."*
- **Nếu demo hỏng** (mạng, RPC, đăng nhập): nói *"Mình chuyển sang video quay đúng bản build này"*, rồi bật backup video 60–90 s ngay. Không cố gỡ lỗi trên sân khấu.

### Slide 4: Ba bài toán khó (2:20–3:00)

**Trên slide** (3 cột, mỗi cột 1 icon + 2 dòng)
1. **Không instruction nào cho một bên tự lấy tiền.** *Hết deadline thì ai cũng gọi được lệnh (trừ khi client đã yêu cầu chỉnh sửa) · nơi nhận tiền chốt từ lúc accept · yêu cầu chỉnh sửa không hoàn tiền cho client*
2. **Nội dung riêng tư trên chain công khai.** *Mã hoá ngay trên thiết bị (XChaCha20-Poly1305) · khoá hợp đồng được bọc cho từng thiết bị (X25519 + HKDF) · N.E.D không chạy server riêng*
3. **Job board, tiền khoá trước khi accept.** *Khoá lúc đăng, hoặc ngay lúc chọn người (`fund_job + create_fund + select_job` trong một transaction) · `accept + lock_from_job` cũng là một transaction*

**Lời nói**
> "Ba bài toán khó. Một: không instruction nào cho một bên tự lấy tiền. Hết deadline review mà client chưa yêu cầu chỉnh sửa thì ai cũng gọi được release; trễ hạn nộp thì ai cũng gọi được refund; nơi nhận chốt từ lúc accept; yêu cầu chỉnh sửa không bao giờ hoàn tiền. Hai: nội dung riêng tư trên chain công khai: mã hoá ngay trên thiết bị, khoá bọc cho từng thiết bị bằng X25519, N.E.D không giữ khoá. Ba: job board: ngân sách khoá lúc đăng, hoặc ngay lúc chọn người trong cùng một transaction; program không cho chọn người khi tiền chưa vào vault, nên freelancer không bao giờ accept việc chưa có tiền."

*(7/10: rút gọn khoảng 15 chữ cho vừa 40 s, thêm ngoại lệ "chưa yêu cầu chỉnh sửa". 7/10, V7: bài toán 3 và câu "Ba: …" đổi theo D29 / v1.4, `pre-pitch-check-7oct.md` §9.4; bằng chứng lock at hire là link Explorer của smoke Run 3, không demo trực tiếp.)*

**Hình gợi ý:** ảnh chụp một transaction `post_note` trên Explorer để thấy dữ liệu chỉ là ciphertext.

### Slide 5: Kiến trúc & chất lượng contract (3:00–3:30)

**Trên slide**
- Sơ đồ: `Workspace (web) · Wallet (mobile)` → `@ned/core` (dùng chung) → **`ned_program`** (Anchor) → PDA: `SharedFund` · `vault` · `JobListing` · `job_vault` · `JobApplication` · `DeviceKeys` → USDC (Token Interface)
- Ô bên phải:
  - **29 instruction** · **55 mã lỗi** · **26 event**
  - Bất biến: `released + refunded + unsettled = total` (test kiểm tra sau mỗi bước)
  - **67 test** (62 test LiteSVM chạy trên program): từng giây quanh mỗi deadline của milestone, release hai lần, sai mint, token gửi lạc vào vault, đường Việt Nam
  - Checked math · `transfer_checked` · mỗi hợp đồng và mỗi job một vault

**Lời nói**
> "Một Anchor program, một core TypeScript dùng chung, hai app. Mỗi hợp đồng và mỗi job có vault PDA riêng. Sổ sách luôn giữ một bất biến: đã release cộng đã refund cộng phần chưa xử lý bằng tổng, và test kiểm tra điều này sau mỗi bước. 67 test, trong đó 62 test chạy trên program bằng LiteSVM, kiểm tra từng giây quanh deadline, release hai lần, sai mint, token gửi lạc và đường Việt Nam. Mỗi lỗi có mã riêng, mọi thay đổi về tiền đều phát event."

### Slide 6: Solana stack & hiệu năng (3:30–3:50)

**Trên slide**
- Stack: **Anchor 1.1.2 · SPL Token Interface · Circle devnet USDC · Dynamic (đăng nhập Google → ví MPC nhúng, không seed phrase)**
- Bảng compute units:

| Instruction | CU (thấp nhất–cao nhất) |
| --- | ---: |
| `create_fund` (3 milestone) | 24,142–33,142 |
| `lock` | 22,482–28,482 |
| `approve` | 22,907–31,938 |
| `release_after_review` | 23,077–32,108 |
| `accept + lock_from_job` (1 transaction) | 45,470–51,487 |
| `post_job` (cao nhất) | 34,173–49,173 |
| `post_job_open` (khoá khi chọn người) | 26,120–36,620 |
| `fund_job` | 21,154–24,154 |
| `fund_job + create_fund + select_job` (1 transaction, 5 milestone) | 57,985–71,485 |

- Dòng nguồn (chữ nhỏ): *LiteSVM, program v1.4, 7/10, 10 lần chạy; khoảng dao động do keypair test ngẫu nhiên (mỗi lần tìm bump PDA thêm ~1,500 CU)*. Bảng cũ (v1.0, 2/10) không dùng nữa.
- Dòng dưới bảng: *Mọi instruction đã đo đều dùng dưới 25% hạn mức mặc định 200,000 CU* (đo lại 7/10 bằng LiteSVM, 10 lần chạy: cao nhất `post_job` 49,173 = 24,6%; `lock_from_job` 45,045; `accept_cancel` 43,015. Các mức trên 40,000 đã có từ v1.3, nên câu "dưới 20%" cũ không còn đúng. Nguồn: `docs/tong-hop-tien-do.md`, dòng V2. Smoke trên devnet, cả transaction: `fund_job + create_fund + select_job` 51,633; `accept + lock_from_job` 36,505; `post_job_open` 22,080. Transaction chọn người 5 milestone: 789 byte / 1,232, không cần lookup table)
- ~~"IDL đăng on-chain" **chỉ đưa lên slide khi IDL v1.3 đã được đăng lại** (hiện bản on-chain là v1.1).~~ **7/10 (V4):** IDL v1.4 đã đăng on-chain (tx `2AsdDUbn…uCC7`), nên được nói "IDL on-chain".

**Lời nói**
> "Chúng tôi dùng Token Interface với USDC devnet của Circle, nên đây là token SPL thật trên devnet, dù không có giá trị. Người dùng đăng nhập bằng Google và có ví MPC nhúng, không cần seed phrase. Mọi instruction đã đo đều dùng chưa tới một phần tư compute budget mặc định, và các lệnh ghép được vào một transaction."

### Slide 7: Bằng chứng build & khả năng chạy lại (3:50–4:10)

**Trên slide**
- **Repo công khai:** `github.com/Tdat10052499/Unihackfest-2026`, hơn 420 commit
- **Tài liệu:** decision log D1–D29 · program spec (byte layout, mã lỗi, test) · nhật ký tiến độ kèm kết quả test
- **Build và test bằng 2 lệnh, chạy lại luồng devnet bằng 1 script:**
  ```
  cd ned_program && anchor build
  cargo test --manifest-path programs/ned-program/Cargo.toml   # 67 test
  cd ../ned-wallet && npm run jobs:smoke                         # luồng N.E.D Jobs trên devnet (Run 1–4)
  ```
  Chữ nhỏ: *script dùng ví dùng một lần: cần nạp devnet SOL và 0,2 USDC từ faucet.*
- **Bản live:** Workspace `unihackfest-2026.vercel.app` · Program `8azx…WbX5Wh` (devnet); nhóm đã kiểm tra binary trên devnet trùng với bản build của nhóm
- QR **chỉ trỏ tới repo** (không QR sàn giao dịch, không referral)

**Lời nói**
> "Mọi thứ đều công khai: hơn bốn trăm commit, decision log cho từng quyết định thiết kế và đặc tả program đầy đủ. Hai lệnh là build lại program và chạy đủ 67 test; một script chạy lại toàn bộ luồng N.E.D Jobs trên devnet. Nhóm đã kiểm tra binary trên devnet trùng với bản build của nhóm."

**Lưu ý:** script `jobs:smoke` so binary trên devnet với file `.so` vừa build; build của người khác gần như chắc chắn khác byte, nên script dừng. Dev thêm tuỳ chọn bỏ qua bước so binary trước final (mục 5). Tới lúc đó, không nói "giám khảo chạy lại toàn bộ bằng ba lệnh".

### Slide 8: Giới hạn, lộ trình & kết (4:10–4:30)

**Trên slide**
- **N.E.D không:** giữ tiền · quy đổi tiền · thu phí trong v1
- **Giới hạn hiện tại:** devnet, token thử · chưa audit · payout partner là mô phỏng · chưa có trọng tài trung lập · quyền upgrade vẫn ở ví deploy của nhóm
- **Tiếp theo:** sandbox với partner (ứng viên: Due, Nium) → ý kiến luật sư → người review trung lập → audit → multisig cho quyền upgrade → thí điểm
- Câu kết lớn: **"Khoá trước khi làm. Release theo luật. VND cho người B."**

**Lời nói**
> "N.E.D không giữ tiền, không quy đổi tiền, và v1 không thu phí. Đây là prototype trên devnet: chưa audit, partner là mô phỏng, chưa có trọng tài trung lập, quyền upgrade vẫn ở ví của nhóm. Tiếp theo: sandbox với partner, luật sư, audit, multisig. Khoá trước khi làm. Release theo luật. Xin cảm ơn."

---

## 3. Demo runbook

**Ngày hôm trước (9 Oct)**
- [ ] Người A có **≥ 30 devnet USDC** (10 cho contract B + 20 cho contract A). Faucet: 20 USDC/địa chỉ mỗi 2 giờ, nên claim 2 lần cách nhau 2 giờ, hoặc chạy `npm run recycle:demo-usdc`.
- [ ] Người B có devnet SOL để trả phí mạng (không hiện số ở chế độ xem Việt Nam).
- [ ] Tài khoản B đã sẵn sàng: có profile N.E.D (@username), đã đồng ý consent, chọn nơi ở Việt Nam, đã đăng ký thiết bị (mở Workspace một lần). Thiếu profile thì bước chọn VND sẽ báo lỗi.
- [ ] Quay **backup video 60–90 s** bằng app thật, đúng thứ tự demo. Không dùng mock-up. Lồng tiếng hoặc phụ đề tiếng Việt.
- [ ] Tập toàn bộ ít nhất **2 lần có bấm giờ**, kể cả 15 phút chuẩn bị contract B.

**Trên sân khấu, T−30 phút**
- [ ] **2 laptop**, hoặc 1 laptop với **2 trình duyệt khác nhau / 2 profile trình duyệt**. Hai cửa sổ cùng một profile dùng chung đăng nhập, nên sẽ là cùng một người.
- [ ] Cả hai vai đều trên Workspace: người A ở chế độ xem quốc tế, người B ở chế độ xem Việt Nam. *(Không dùng app mobile cho phần request changes; app mobile chưa có nút trả lời yêu cầu chỉnh sửa.)*
- [ ] Mỗi cửa sổ **rộng ít nhất 900 px** (zoom 100%). Cửa sổ hẹp hơn sẽ bị chuyển link mời sang bản mobile.
- [ ] Đăng nhập sẵn cả hai tài khoản Google. Tắt thông báo hệ thống.
- [ ] Điền sẵn form `/new` với deadline **+1 day** (đừng dùng "+10 min", sẽ quá hạn trước giờ demo). Form không tự lưu: **không tải lại trang**, và **chưa bấm Create**.
- [ ] Mở sẵn tab Solana Explorer (cluster devnet) để chỉ vào vault.
- [ ] Hotspot điện thoại dự phòng. Backup video mở sẵn ở tab khác.

**T−15 phút: chuẩn bị contract B** (bằng login thật của A và B, không dùng script)
1. A tạo contract: 1 milestone × 10 USDC. **Gõ tay** submission deadline = lúc tạo + 5 phút (preset chỉ có +10 min / +1 day / +7 days), review deadline = 60 s sau đó.
2. B accept (VND) → A lock → B submit. Accept và lock phải xong **trước submission deadline ít nhất 60 s**.
3. Chờ hết review deadline, rồi kiểm tra nút **Release now** đã hiện. **Không bấm.**
4. Mở contract B ở một tab riêng.

**Khi demo:** chuông thông báo cập nhật mỗi 30 s hoặc khi cửa sổ được chọn, nên **bấm vào cửa sổ A** trước khi chỉ vào chuông.

**Tỷ giá:** con số "≈ 520,000 VND" lấy từ hằng số tỷ giá trong code (26,019.5, ngày 2/10). Tỷ giá ngày 7/10 khoảng 25,990, nên 20 USDC vẫn ≈ 520,000 VND. **Không nói con số khác với màn hình** trừ khi Dev đổi hằng số và deploy lại.

---

## 4. Q&A (3 phút ≈ 5–6 câu hỏi)

**Luật trả lời:**
- Trả lời bằng tiếng Việt, mỗi câu ≤ 30 s.
- PO nhận câu hỏi rồi chỉ định người trả lời. Ai được giao thì người đó nói, không nói chen.
- Không biết thì nói thẳng: *"Phần này nhóm chưa đo; nếu làm, nhóm sẽ làm thế này."* Không đoán.

**Phân công:** Dev trả lời kỹ thuật (T1–T8) · CL trả lời pháp lý, dữ liệu, thuế (L1–L5) · PO trả lời sản phẩm (P1–P8).

### Kỹ thuật (Dev)

| # | Câu hỏi | Trả lời |
| --- | --- | --- |
| T1 | Ai upgrade được program? Nhóm có thể ôm tiền không? | "Không có instruction nào cho N.E.D di chuyển tiền đã khoá. Nhưng quyền upgrade hiện vẫn ở ví deploy của nhóm tới hết vòng final để sửa lỗi; màn Disclosures trong app ghi rõ điều này. Trước mainnet, quyền này chuyển sang multisig Squads, hoặc program được khoá không cho upgrade nữa." |
| T2 | Vì sao ai cũng gọi được release / refund? | "Để không ai phải tin một server hay phải online. Hết review deadline, release chỉ đi tới nơi nhận đã chốt lúc accept, trừ khi client đã yêu cầu chỉnh sửa trước đó; khi ấy tiền vẫn khoá cho tới khi hai bên đồng ý. Hết submission deadline, refund chỉ về client. Người gọi lệnh không chọn được gì." |
| T3 | Điều gì ngăn client cố tình ngâm review? | "Nếu client không review kịp, cả hai bên đều thấy Release now. Yêu cầu chỉnh sửa không bao giờ hoàn tiền cho client; tiền vẫn khoá cho tới khi hai bên đồng ý." |
| T4 | Nếu hai bên không bao giờ đồng ý? | "Hiện tại tiền vẫn bị khoá; chưa có trọng tài trung lập, và app ghi rõ điều đó. Account còn 32 byte dự phòng, đủ cho địa chỉ của một arbiter. Muốn thêm thì cần ý kiến pháp lý trước." |
| T5 | Mã hoá hoạt động thế nào? | "Mỗi hợp đồng có một khoá ngẫu nhiên. Nội dung được mã hoá bằng XChaCha20-Poly1305 rồi đăng thành note. Khoá được bọc cho từng thiết bị đã đăng ký bằng X25519 và HKDF-SHA256, và cũng nằm trong link mời. Public key của thiết bị nằm trên chain; private key không rời thiết bị." |
| T6 | Thao túng thời gian / mốc deadline? | "Deadline dùng đồng hồ của cluster. Test kiểm tra đúng giây trước và sau mỗi deadline của milestone, và thời gian làm việc, thời gian review tối thiểu được kiểm tra ngay lúc tạo." |
| T7 | Token gửi lạc, sai mint, release hai lần? | "Mỗi trường hợp đều có test. Token gửi lạc vào vault không làm sai sổ sách, sai mint bị chặn, và milestone đã xử lý thì không xử lý lại được." |
| T8 | Mở rộng quy mô thế nào? | "Mỗi hợp đồng và mỗi job là một account riêng, nên không có tranh chấp state chung. Job board hiện đọc account trực tiếp; khi vượt vài chục listing thì nhóm thêm indexer." |

### Pháp lý & dữ liệu (CL)

| # | Câu hỏi | Trả lời |
| --- | --- | --- |
| L1 | Ở Việt Nam có hợp pháp không? | "Theo cách đọc của nhóm về Nghị định 52/2024, tiền mã hoá không nằm trong danh mục phương tiện thanh toán hợp pháp. Vì vậy người dùng Việt Nam của nhóm không bao giờ nhận crypto: client khoá USDC ở nước ngoài, payout partner ở nước ngoài chuyển VND qua ngân hàng; trong demo, partner là mô phỏng. Nhóm không giữ tiền. Người dùng Việt Nam chỉ ký accept và submit bằng ví đăng nhập; trên devnet phí mạng là test SOL, trước launch sẽ có fee payer. Trước khi có tiền thật, cần luật sư xác nhận phần mềm này không phải dịch vụ tài sản mã hoá theo Nghị định 284/2026." |
| L2 | KYC / chống rửa tiền? | "KYC và thông tin ngân hàng nằm ở payout partner, không bao giờ ở nhóm. Mỗi hợp đồng bị giới hạn 1,000 USDC. Devnet chưa có KYC, và nhóm công khai điều đó. Sàng lọc ví nằm trong lộ trình." |
| L3 | Dữ liệu cá nhân đi đâu? | "Đăng nhập qua Dynamic, có màn đồng ý rõ ràng. Nội dung hợp đồng được mã hoá, N.E.D không có khoá. Địa chỉ ví, username, tiêu đề hợp đồng, job listing và pitch là công khai trên chain, và app nhắc người dùng không ghi dữ liệu cá nhân vào đó." |
| L4 | Đây có phải sàn việc làm không? | "Doanh nghiệp tự đăng job và tự chọn freelancer. N.E.D không chọn, không thẩm định, không tuyển dụng ai, không phải một bên của công việc, và v1 không thu phí. Trước khi ra mắt thật, nhóm sẽ hỏi luật sư về giấy phép dịch vụ việc làm (Luật Việc làm 74/2025) và đăng ký sàn thương mại điện tử (Luật 122/2025)." *(Không khẳng định job board nằm ngoài các luật này; đây là câu hỏi đang chờ chuyên gia.)* |
| L5 | Thuế thì sao? | "Luật 109/2025 đặt ngưỡng 500 triệu đồng một năm cho cá nhân có doanh thu kinh doanh, từ kỳ tính thuế 2026. Thu nhập freelance từ khách nước ngoài có được xếp vào doanh thu kinh doanh hay không thì nhóm đang chờ chuyên gia thuế. Nhóm cung cấp bản ghi để freelancer tự kê khai; đây không phải tư vấn thuế." |

### Sản phẩm (PO)

| # | Câu hỏi | Trả lời |
| --- | --- | --- |
| P1 | Vì sao chọn Solana? | "Phí dưới một cent, khoảng 7,2 tỷ đô USDC đang nằm trên Solana, và USDC devnet của Circle giúp nhóm demo bằng token SPL thật trên devnet, không có giá trị." *(DefiLlama 7/10; kiểm tra lại ngày 9/10.)* |
| P2 | Nhóm kiếm tiền thế nào? | "Bản v1 không thu phí. Kế hoạch là 1% phía client khi release, chỉ áp dụng sau khi có ý kiến pháp lý. Với 1.000 USD, Upwork thu client 3–10% cộng phí khởi tạo hợp đồng; nhóm không nói N.E.D rẻ hơn Wise, vì giá trị là tiền được khoá trước." |
| P3 | Còn thiếu gì trước khi launch? | "Sandbox với payout partner, ý kiến luật sư, OTP, audit và multisig. Sau đó thí điểm với các cặp client và freelancer thật." |
| P4 | Nhóm có dùng AI không? | Trả lời trung thực theo câu team đã thống nhất, ví dụ: *"Có, nhóm dùng AI hỗ trợ viết code; mọi commit đều công khai và nhóm có thể giải thích bất kỳ instruction nào."* |
| P5 | Sao app lại bằng tiếng Anh? | "Người dùng chính là client nước ngoài và freelancer làm việc với họ, nên sản phẩm dùng tiếng Anh. Nhóm đã thống nhất với ban tổ chức: pitch bằng tiếng Việt, sản phẩm giữ tiếng Anh." |
| P6 | Khác gì các dự án khoá tiền khác trên Solana? | "Một số dự án devnet khác cũng release khi client im lặng, nên nhóm không nói mình là đầu tiên. Điểm N.E.D thêm vào: đường VND cho người ở Việt Nam, nơi nhận chốt lúc accept và chỉ là địa chỉ partner trong allowlist; yêu cầu chỉnh sửa không bao giờ hoàn tiền; brief mã hoá có dấu vân tay trên chain; và N.E.D Jobs khoá ngân sách trước khi freelancer accept, lúc đăng hoặc lúc chọn người." *(7/10, V7: sửa theo D29)* |
| P7 | Nếu freelancer không bao giờ gửi file cuối thì sao? | "Trước khi đồng ý, client thấy danh sách file cuối kèm fingerprint. Sau khi release, client kiểm tra file tải về với danh sách đó và lưu biên nhận. Hiện chúng tôi chưa thể bắt buộc bàn giao; mã hoá file cuối và mở khoá cùng lúc với tiền nằm trong roadmap." *(thêm 7/10, F3)* |
| P8 | Doanh nghiệp đăng job không có tiền thì sao? | "Thẻ job ghi rõ 'Locks when hired'. Program không cho chọn người khi tiền chưa vào vault, nên freelancer không bao giờ accept một việc chưa có tiền." *(thêm 7/10, V7, D29)* |

---

## 5. Phải xong trước final (chặn pitch nếu chưa xong)

| # | Việc | Owner | Hạn | Vì sao |
| --- | --- | --- | --- | --- |
| 1 | ✅ **Xong 7/10 (`552c9da`, CL duyệt câu chữ):** README viết lại cho N.E.D · Network of Employment Deals, logo mới. Còn lại: sau V3–V4 cập nhật bảng Status (v1.4 trên devnet). Mô tả cũ: hiện README vẫn tả bản wallet cũ (Neo-brutalism, Jupiter, swap), ghi "17 instructions", "24 milestone tests", "708 bytes", "updated 3 Oct". Cần: tổng quan Milestone Lock, link live, program ID, 27 instruction, 54 test (v1.3; nay v1.4: 29 instruction, 67 test), cách build và test, bảng CU, phần limits. README giữ tiếng Anh (thuộc sản phẩm) | PO + Dev | **8 Oct** | Tiêu chí 4 (20 điểm): giám khảo mở repo là thấy ngay |
| 2 | Thêm file **LICENSE** (README đang ghi MIT nhưng chưa có file) hoặc bỏ dòng đó | PO | 8 Oct | Tiêu chí 4 |
| 3 | `jobs:smoke`: thêm tuỳ chọn bỏ qua bước so binary (ví dụ `--skip-binary-check`) để người ngoài chạy được | Dev | 8 Oct | Slide 7 |
| 4 | ✅ **Xong 7/10 (V2):** đo lại bảng compute units trên v1.4 (LiteSVM, 10 lần chạy; cao nhất `post_job` 49,173 = 24,6% → "dưới 25%"). Mô tả cũ: đo lại trên v1.3 (test `g15`, thêm `accept_cancel` và các lệnh job) | Dev | 8 Oct | Slide 6 dùng số của đúng bản đang chạy |
| 5 | ✅ **Xong 7/10 (V4):** IDL v1.4 đã đăng on-chain (metadata `AMX7B6rj…KK8H`). Mô tả cũ: đăng lại IDL v1.3 lên chain (program-metadata), nếu muốn nói "IDL on-chain" | Dev | 8 Oct | Slide 6 |
| 6 | **S-1**: disclosure đã đúng ở cả hai app; còn thiếu nút trả lời yêu cầu chỉnh sửa trên app mobile (S13), hoặc dòng "Open this contract in the Workspace to respond" | Dev | 8 Oct 18:00 | Giám khảo tự thử trên điện thoại |
| 7 | Email thật thay "[team email]" trên trang Legal | PO | 8 Oct 12:00 | Trang công khai |
| 8 | Thay các key bị lộ (S1–S3) | PO | ngay | An toàn khi demo |
| 9 | Backup video 60–90 s (lồng tiếng hoặc phụ đề tiếng Việt) | Design + PO | 9 Oct | Bắt buộc theo rule |
| 10 | Slide tiếng Việt, gửi cho ban tổ chức | Biz | theo hạn BTC | Bắt buộc theo rule |
| 11 | CL ký duyệt: mọi câu trên slide, app, booth đều đúng sự thật hoặc được ghi là lộ trình | CL | 9 Oct | Compliance |
| 12 | Sửa chữ và lộ thông tin trong app theo `../05-legal/pre-pitch-check-7oct.md` mục 3 ("released automatically" trên app ví, thông báo lộ USDC ở chế độ Việt Nam, Privacy và consent) | Dev + CL | 8 Oct 18:00 | Giám khảo tự thử app |
| 13 | Bổ sung runbook: **B cần sẵn 1 file cuối (khác file preview) trên máy để chọn ở bước Submit 1:30 và khi chuẩn bị contract B (F2 bắt buộc danh sách file cuối)**; độ rộng màn hình ≥ 900 px mỗi cửa sổ, cách đưa link mời sang B, ≥ 40 USDC cho người A, consent v2, giới hạn 5 device key | PO | 9 Oct | Demo không vỡ trên sân khấu |

---

## 6. Quy tắc chữ khi nói tiếng Việt

Word table gốc nằm ở `product-spec.md` §6 (cho chữ tiếng Anh trong sản phẩm). Khi thuyết trình bằng tiếng Việt:

| Dùng | Không dùng |
| --- | --- |
| khoá (lock), release, hoàn tiền (refund), nhận tiền công / nhận thu nhập, yêu cầu chỉnh sửa (request changes), Release now | "thanh toán" hoặc "trả tiền" cho USDC (trừ câu trích Nghị định 52/2024), "ký quỹ", "escrow" (trừ khi giám khảo dùng trước), "đặt cọc", "đầu tư", "lợi nhuận", "lãi suất" |
| "payout partner (ứng viên: Due, Nium), mô phỏng trong demo" | "đối tác của chúng tôi", "đối tác được cấp phép" |
| "devnet, token thử" | "an toàn", "đảm bảo", "cam kết", "chống lừa đảo", "đúng luật thuế", "đầu tiên", "duy nhất", "miễn phí hoàn toàn" |
| "khi hết deadline review, cả hai bên thấy Release now" | "tự động giải ngân", "auto-release" |
| "người B không bao giờ nhận, giữ hay gửi USDC" | "người B không bao giờ chạm vào crypto" |
| "không có instruction nào cho N.E.D di chuyển tiền", "không instruction nào cho một bên tự lấy tiền" | "không ai di chuyển được tiền", "không ai tự lấy được tiền", "kể cả N.E.D cũng không thể" (quyền upgrade vẫn ở ví của nhóm) |
| "N.E.D không chạy server riêng" | "không có backend" (app vẫn dùng Dynamic, Helius, Vercel) |
| "token SPL thật trên devnet, không có giá trị" | "dòng tiền thật", "token thật" (nghe như tiền thật) |
| "v1 không thu phí" | "không bao giờ thu phí" (kế hoạch 1%) |
| "nơi đăng việc; doanh nghiệp tự chọn người" | N.E.D "tuyển dụng", "sàn việc làm của chúng tôi" |
| "tiền đi tới payout partner cho B (mô phỏng)" | "B nhận được tiền" trong demo (VND là mô phỏng) |
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
| `docs/09-milestone-lock/README.md` | Decision log D1–D29 |
| `docs/09-milestone-lock/program-spec.md` | Byte layout, instruction, mã lỗi, test |
| `docs/09-milestone-lock/system-tracker.md` | Workflow, tình huống, bất biến |
| `docs/09-milestone-lock/product-spec.md` §6–7 | Word table, demo script gốc |
| `docs/09-milestone-lock/funded-jobs-plan.md`, `lock-at-hire-plan.md`, `review-decision-plan.md` | Funded Jobs (D25), lock at hire (D29), yêu cầu chỉnh sửa (D27) |
| `docs/tong-hop-tien-do.md` | Kết quả test, bảng CU, thông tin devnet |
| `docs/05-legal/qa-cheatsheet.md` | Bản Q&A tham khảo bằng tiếng Anh (đã khớp với mục 4, cập nhật 7/10) |
| `docs/05-legal/cl-review-7oct.md` | Các lỗi đã sửa và việc còn mở |
| `docs/08-research/ned-research-and-compliance.md` | Nguồn số liệu và luật |

### Số liệu dùng trong pitch

| Số | Nguồn | Trạng thái |
| --- | --- | --- |
| 68% freelancer ở Việt Nam từng gặp tình trạng không được trả tiền công | [Khảo sát PayPal, qua The Leader](https://e.theleader.vn/68-per-cent-of-freelancers-in-vietnam-having-experiences-of-not-being-paid-d2518.html): khảo sát 10/2017, công bố 3/2018; 1.602 người ở SG, ID, VN, PH | Verified 7/10, số liệu cũ (nói kèm năm) |
| ≈ 7,2 tỷ đô USDC trên Solana | [DefiLlama](https://defillama.com/stablecoins/Solana): $7.221bn ngày 7/10 | Verified 7/10; kiểm tra lại 9/10 |
| 67 test; 62 test LiteSVM | `ned_program/programs/ned-program/tests` (identity 10, milestone 29, jobs 23) + helpers 4 + lib 1 | Verified trên repo 7/10 (v1.4, V2); v1.3 là 54 / 49 |
| Bảng CU | `docs/tong-hop-tien-do.md` (dòng V2: LiteSVM v1.4, 7/10, 10 lần chạy; smoke devnet V4) | Verified 7/10; cao nhất 49,173 = 24,6% → "dưới 25%" |
| 29 instruction, 55 mã lỗi, 26 event | `ned_program/programs/ned-program/src/` (v1.4) | Verified 7/10 (v1.3 là 27 / 53 / 24) |
| Hơn 420 commit | `git log` trên `main` | Verified 7/10 (441 commit) |
| ≈ 520,000 VND cho 20 USDC | Hằng số trong app: 26,019.5 (Wise, 2/10); Wise 7/10: 25,990 | Vẫn đúng ≈ 520,000 |
| Faucet 20 USDC / 2 giờ / địa chỉ | faucet.circle.com | Verified 7/10 |

### Cơ sở pháp lý (cho Q&A)

- Nghị định 52/2024/NĐ-CP: Đ.3(10) liệt kê phương tiện thanh toán hợp pháp, Đ.3(11) mọi thứ ngoài danh mục là không hợp pháp, Đ.8(6) cấm phát hành, cung ứng và sử dụng. Nghị định không gọi tên crypto; "crypto không nằm trong danh mục" là cách đọc của nhóm
- Nghị định 340/2025/NĐ-CP (hiệu lực 9/2/2026): phạt 150–200 triệu đồng với cá nhân (Đ.30(6)(d), đọc qua cơ sở dữ liệu luật), gấp đôi với tổ chức (Đ.5(3)(a)). **Không trích điều khoản và mức phạt trên sân khấu** cho tới khi mở được văn bản chính thức
- Nghị định 284/2026/NĐ-CP, Đ.7(4): cung cấp **hoặc quảng cáo** dịch vụ tài sản mã hoá khi chưa có giấy phép; tổ chức 180–200 triệu, cá nhân 90–100 triệu (hiệu lực 1/9/2026). Tới 6/10/2026 chưa có tổ chức nào được cấp phép
- Nghị quyết 05/2025/NQ-CP (9/9/2025): thí điểm thị trường tài sản mã hoá 5 năm
- Luật Bảo vệ dữ liệu cá nhân 91/2025 + Nghị định 356/2025 (hiệu lực 1/1/2026): dữ liệu cá nhân
- Luật 109/2025, Đ.7(1): cá nhân có doanh thu kinh doanh tới 500 triệu đồng/năm không phải nộp thuế TNCN (hiệu lực 1/7/2026, kỳ tính thuế 2026). Thu nhập freelance có thuộc diện này không: **[Unverified]**, chờ chuyên gia thuế
- [Luật Việc làm 74/2025](https://thuvienphapluat.vn/van-ban/Lao-dong-Tien-luong/Luat-Viec-lam-2025-so-74-2025-QH15-530912.aspx) (Đ.27–28) và Nghị định 352/2025 (hiệu lực 1/1/2026): kinh doanh dịch vụ việc làm qua thương mại điện tử chỉ do doanh nghiệp có giấy phép thực hiện. Job board có thuộc diện này không vẫn **[Unverified]**, đang chờ chuyên gia; không khẳng định trên sân khấu
- [Luật Thương mại điện tử 122/2025](https://thuvienphapluat.vn/van-ban/EN/Thuong-mai/Law-122-2025-QH15-Electronic-Commerce/703876/tieng-anh.aspx) + Nghị định 248/2026 (hiệu lực 1/7/2026): sàn trung gian gồm cả sàn dịch vụ; nền tảng nước ngoài có giao diện tiếng Việt phải đăng ký với Bộ Công Thương. N.E.D Jobs có thuộc diện này không: **[Unverified]**

*Đây không phải tư vấn pháp lý. Các điểm [Unverified] cần luật sư xác nhận.*
