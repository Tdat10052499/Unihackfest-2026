# N.E.D Milestone Lock: kịch bản thuyết trình vòng Final

**Phiên bản:** 7 Oct 2026 · **Build tham chiếu:** `main` at `cd5bbac` (program v1.3 trên devnet) · **Người soạn:** Compliance Lead
**Thời lượng:** pitch **4:30** (giới hạn 5:00, đèn vàng lúc 4:00) + Q&A **3–4 phút**
**Ngôn ngữ trên sân khấu:** **English** (ban tổ chức đã xác nhận: English only). Hướng dẫn trong file viết bằng tiếng Việt; chữ trên slide và lời nói viết bằng tiếng Anh, dùng nguyên văn.

Trong mọi slide, demo và Q&A: **Person A** là client ở nước ngoài (Singapore), **Person B** là freelancer ở Việt Nam (Hà Nội).

---

## 0. Bám theo tiêu chí chấm

| Tiêu chí | Điểm | Chỗ ghi điểm trong pitch | Bằng chứng đưa ra |
| --- | ---: | --- | --- |
| **Technical Difficulty & Depth** | 30 | Demo (1:40) + Slide 4 | Tiền được giải phóng theo deadline, ai cũng gọi được; nơi nhận tiền chốt từ lúc accept; trạng thái "request changes" không hoàn tiền; nội dung mã hoá đầu-cuối trên chain công khai; Funded Jobs gói nhiều lệnh trong một transaction |
| **Architecture & Smart Contract Quality** | 25 | Slide 5 | Sơ đồ PDA; invariant `released + refunded + unsettled = total`; 54/54 test LiteSVM; 53 mã lỗi; 24 event; `transfer_checked` |
| **Solana Stack, Composability & Performance** | 25 | Slide 6 | Anchor 1.1.2, Token Interface, Circle devnet USDC, Dynamic MPC wallet; bảng compute units; IDL đăng on-chain |
| **Build Evidence, Documentation & Reproducibility** | 20 | Slide 7 + link trong Q&A | Repo công khai, 426 commit; decision log D1–D28; program spec; 3 lệnh để chạy lại; script smoke trên devnet |

Track 2 không chấm business model, nên pitch **không có slide đối thủ, cũng không có slide doanh thu**. Nếu giám khảo hỏi thì trả lời trong Q&A (mục 4).

---

## 1. Phân bổ thời gian

| # | Slide | Thời gian | Thời lượng | Người nói | Tiêu chí |
| --- | --- | --- | --- | --- | --- |
| 1 | Problem | 0:00–0:20 | 20 s | PO | (dẫn vào) |
| 2 | Solution & design constraint | 0:20–0:40 | 20 s | PO | Difficulty |
| 3 | **Live demo** | 0:40–2:20 | 1:40 | PO thao tác, Dev đứng máy thứ 2 | Difficulty |
| 4 | Three hard problems | 2:20–3:00 | 40 s | Dev | Difficulty |
| 5 | Architecture & contract quality | 3:00–3:30 | 30 s | Dev | Architecture |
| 6 | Solana stack & performance | 3:30–3:50 | 20 s | Dev | Solana stack |
| 7 | Build evidence & reproducibility | 3:50–4:10 | 20 s | CL | Build evidence |
| 8 | Limits, roadmap & close | 4:10–4:30 | 20 s | PO | (kết) |
| — | Buffer | 4:30–5:00 | 30 s | — | phòng khi demo chậm |

Tốc độ nói: khoảng 140 từ/phút. Lời nói bên dưới đã được cắt cho khớp thời gian, **đừng thêm câu**.

---

## 2. Từng slide

### Slide 1: Problem (0:00–0:20)

**Trên slide**
- Tiêu đề: **"Finished the work. Never received the earnings."**
- Con số lớn: **68%**, kèm dòng nhỏ: *of Vietnamese freelancers were not paid at least once (PayPal survey, 2017)*
- Hình: Person B (Hà Nội) ↔ Person A (Singapore), giữa hai người là dấu "?"

**Lời nói (≈ 45 từ)**
> "In a 2017 PayPal survey, 68% of Vietnamese freelancers said a client had not paid them at least once. Person B in Hanoi finishes the work; Person A in Singapore disappears. And Person B can't simply accept crypto: in Vietnam, crypto is not a lawful payment instrument."

**Lưu ý:** số liệu 68% là của năm 2017, nên luôn nói kèm năm. Không nói "most freelancers".

### Slide 2: Solution & design constraint (0:20–0:40)

**Trên slide**
- **"Money locked by code before work starts."**
- Ba dòng:
  - *Locked per milestone, in a vault owned by the program, not by us*
  - *Released only by rules written at creation*
  - *Person B in Vietnam never touches crypto: VND to the bank via a payout partner (simulated in this demo)*

**Lời nói (≈ 45 từ)**
> "N.E.D Milestone Lock. Person A locks USDC per milestone before work starts, in a vault owned by our program, not by us. Release follows rules written in code. Person B never touches crypto: a payout partner abroad sends VND to the bank, simulated in this demo."

### Slide 3: Live demo (0:40–2:20)

Slide này chỉ có tiêu đề "Live on Solana devnet" và link. Màn hình chuyển sang 2 trình duyệt đặt cạnh nhau. Chuẩn bị theo **mục 3 (Demo runbook)**.

| Thời gian | Thao tác | Lời nói |
| --- | --- | --- |
| 0:40 | Trình duyệt A (Workspace, chế độ xem quốc tế): mở `/new` **đã điền sẵn** "Landing page design", 2 milestone × 10 USDC, mỗi milestone có "Done when" → **Create** → ký | "Person A splits the job into two milestones, each with its own acceptance criteria and deadlines." |
| 0:55 | Trình duyệt B (chế độ xem Việt Nam): mở link mời → đọc brief → **Accept** → chọn **"VND to my bank account"** → ký | "Person B reads the brief, which is encrypted so only the two of them can read it, accepts, and picks where the earnings go. That destination is now fixed on-chain; nobody can change it." |
| 1:15 | A: **Lock** 20 USDC → B thấy *"≈ 520,000 VND locked (estimate)"* | "Person A locks 20 USDC. Person B sees it in VND and no crypto balance. Now the work starts." |
| 1:30 | B: **Submit** milestone 1 (link Drive có watermark) → ký | "Person B submits a watermarked preview, not the final files. Only a fingerprint and a timestamp go on-chain." |
| 1:45 | A: chuông thông báo → **Review** → **Accept & release** | "Person A reviews against the criteria and accepts. Released to the payout partner; the VND transfer is simulated." |
| 1:58 | Mở **contract B** đã chuẩn bị (link trực tiếp) → **Release now** | "Now the case that matters. In this contract, Person A never reviewed. The review deadline has passed, so anyone can press Release now, and Person B still receives the earnings." |
| 2:10 | Mở Solana Explorer: vault account → owner = program | "The vault is owned by the program. No N.E.D key can move these funds." |
| 2:20 | Chuyển sang Slide 4 | — |

- **Nếu đang trễ hơn 15 s:** bỏ bước Explorer, nói câu cuối khi chuyển slide.
- **Nếu đang sớm hơn 15 s:** ở contract A, chuyển sang màn **Request changes**, chỉ cho xem chứ không ký. Lời nói: *"If the work misses the brief, Person A can request changes, but the money never goes back to Person A alone. It stays locked until both agree."*
- **Nếu demo hỏng** (mạng, RPC, đăng nhập): nói *"Let me switch to our recording of the same build"*, rồi bật backup video 60–90 s ngay lập tức. Không cố gỡ lỗi trên sân khấu.

### Slide 4: Three hard problems (2:20–3:00)

**Trên slide** (3 cột, mỗi cột 1 icon + 2 dòng)
1. **Nobody can take the money alone.** *Deadline-based settlement anyone can trigger · destination fixed at accept · "request changes" never refunds the client*
2. **Private content on a public chain.** *Briefs and deliveries encrypted on-device (XChaCha20-Poly1305) · contract key wrapped per device (X25519 + HKDF) · no backend*
3. **Funded jobs, atomically.** *Budget locked when the job is posted · `create_fund + select_job` and `accept + lock_from_job` each in one transaction*

**Lời nói (≈ 95 từ, nói nhanh vừa phải)**
> "Three hard problems. First, nobody can take the money alone. After a deadline, release or refund is permissionless; the destination is fixed when the freelancer accepts; and requesting changes never sends money back to the client. Second, private content on a public chain. Briefs and deliveries are encrypted on the device; the contract key is wrapped for each device with X25519, so even we can't read them. Third, funded jobs. A business locks the whole budget when it posts. Selecting and accepting are each one atomic transaction, so money only moves after the destination is fixed."

**Hình gợi ý:** ảnh chụp một transaction `post_note` trên Explorer để thấy dữ liệu chỉ là ciphertext.

### Slide 5: Architecture & contract quality (3:00–3:30)

**Trên slide**
- Sơ đồ: `Workspace (web) · Wallet (mobile)` → `@ned/core` (dùng chung) → **`ned_program`** (Anchor) → PDA: `SharedFund` · `vault` · `JobListing` · `job_vault` · `JobApplication` · `DeviceKeys` → USDC (Token Interface)
- Ô bên phải:
  - **27 instructions** · **53 error codes** · **24 events**
  - Invariant: `released + refunded + unsettled = total`
  - **54/54 LiteSVM tests**: every deadline boundary, double release, wrong mint, token donations, Vietnam payout path
  - Checked math · `transfer_checked` · one vault per contract

**Lời nói (≈ 65 từ)**
> "One Anchor program, one shared TypeScript core, two apps. Every contract and every job gets its own vault PDA. The program enforces one invariant: released plus refunded plus unsettled always equals the total. Fifty-four LiteSVM tests cover every deadline boundary, double release, wrong mint, token donations and the Vietnam path. Every failure has an explicit error code, and every state change emits an event."

### Slide 6: Solana stack & performance (3:30–3:50)

**Trên slide**
- Stack: **Anchor 1.1.2 · SPL Token Interface · Circle devnet USDC · Dynamic (Google login → embedded MPC wallet, no seed phrase) · IDL published on-chain**
- Bảng compute units (LiteSVM và smoke run trên devnet):

| Instruction | CU |
| --- | ---: |
| `create_fund` (3 milestones) | 29,824 |
| `lock` | 22,260 |
| `approve` | 27,185 |
| `release_after_review` | 27,355 |
| `accept + lock_from_job` (1 tx) | 36,411 |
| `accept_cancel` (highest) | 39,781 |

- Dòng dưới bảng: *Every instruction under 20% of the default 200,000 CU budget*

**Lời nói (≈ 45 từ)**
> "We use Solana's Token Interface with Circle's devnet USDC, so these are real token flows. Users sign in with Google and get an embedded MPC wallet, with no seed phrase. Every instruction uses less than twenty percent of the default compute budget, and instructions compose into single transactions."

### Slide 7: Build evidence & reproducibility (3:50–4:10)

**Trên slide**
- **Public repo:** `github.com/Tdat10052499/Unihackfest-2026`, with 426 commits
- **Docs:** decision log D1–D28 · program spec (byte layout, errors, tests) · progress log with test results
- **Reproduce in 3 commands:**
  ```
  cd ned_program && anchor build
  cargo test --manifest-path programs/ned-program/Cargo.toml   # 54/54
  cd ../ned-wallet && npm run jobs:smoke                         # devnet end-to-end
  ```
- **Live:** Workspace `unihackfest-2026.vercel.app` · Program `8azx…WbX5Wh` (devnet), with the deployed binary verified equal to the local build
- QR **chỉ trỏ tới repo** (không QR sàn giao dịch, không referral)

**Lời nói (≈ 45 từ)**
> "Everything is public. Over four hundred commits, a decision log for every design choice, and a full program specification. You can rebuild the program, run all fifty-four tests and replay the devnet flow with three commands. We checked that the deployed binary matches the local build."

### Slide 8: Limits, roadmap & close (4:10–4:30)

**Trên slide**
- **What N.E.D never does:** hold funds · convert currency · charge a fee (v1)
- **Honest limits:** devnet, test tokens · not audited · payout partner simulated · no neutral arbiter yet
- **Next:** partner sandbox (candidates: Due, Nium) → legal opinion → neutral reviewer → audit → multisig upgrade authority → pilot
- Câu kết lớn: **"Locked before work starts. Released by rules. VND for Person B."**

**Lời nói (≈ 42 từ)**
> "N.E.D never holds funds, converts currency or charges a fee. This is a devnet prototype: not audited, partner simulated, no neutral arbiter yet. Next: a partner sandbox, a legal opinion, an audit and a multisig. Locked before work starts. Released by rules. Thank you."

---

## 3. Demo runbook

**Ngày hôm trước (9 Oct)**
- [ ] Person A có **≥ 30 devnet USDC** (10 cho contract B + 20 cho contract A). Faucet: 20 USDC/địa chỉ mỗi 2 giờ, nên claim 2 lần cách nhau 2 giờ, hoặc chạy `npm run recycle:demo-usdc`.
- [ ] Person B có devnet SOL để trả phí mạng (không hiện số ở chế độ xem Việt Nam).
- [ ] Quay **backup video 60–90 s** bằng app thật, đúng thứ tự demo. Không dùng mock-up.
- [ ] Tập toàn bộ ít nhất **2 lần có bấm giờ**, kể cả 15 phút chuẩn bị contract B.

**Trên sân khấu, T−30 phút**
- [ ] 2 laptop (hoặc 1 laptop 2 cửa sổ): **cả hai vai đều trên Workspace**. Person A ở chế độ xem quốc tế, Person B ở chế độ xem Việt Nam. *(Không dùng app mobile cho phần request changes cho tới khi S-1 được sửa.)*
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
- Mỗi câu ≤ 30 s.
- PO nhận câu hỏi rồi chỉ định người trả lời. Ai được giao thì người đó nói, không nói chen.
- Không biết thì nói thẳng: *"We haven't measured that yet; here is how we would."* Không đoán.

**Phân công:** Dev trả lời kỹ thuật (T1–T8) · CL trả lời pháp lý, data, thuế (L1–L5) · PO trả lời sản phẩm (P1–P4).

### Kỹ thuật (Dev)

| # | Câu hỏi | Trả lời (English) |
| --- | --- | --- |
| T1 | Who can upgrade the program? Can you rug it? | "No N.E.D key can move locked funds through the program's instructions. The upgrade authority is still our deploy wallet through the final, so we can fix bugs; that's disclosed. Before mainnet it moves to a Squads multisig, or the program becomes immutable." |
| T2 | Why can anyone call release / refund? | "So nobody has to trust a server or stay online. After the review deadline, release can only go to the destination fixed at accept; after the submission deadline, refund can only go to the client. The caller chooses nothing." |
| T3 | What stops a client from stalling? | "If the client doesn't review in time, both sides see Release now. Requesting changes never sends the money back to the client; it stays locked until both agree." |
| T4 | And if they never agree? | "Today the amount stays locked; there is no neutral arbiter yet, and we say so in the app. We reserved space in the account for an arbiter field. Adding it needs a legal review first." |
| T5 | How does the encryption work? | "Each contract has a random key. Content is encrypted with XChaCha20-Poly1305 and posted as notes. The key is wrapped for each registered device with X25519 and HKDF-SHA256. The device public keys are on-chain; private keys never leave the device." |
| T6 | Clock manipulation / deadline edges? | "Deadlines use the cluster clock. Tests cover the exact second before and after every deadline, and the minimum work and review windows are enforced at creation." |
| T7 | Token donations, wrong mint, double release? | "Each is a test. Donations to a vault don't change accounting, a wrong mint is rejected by constraint, and a settled milestone can't settle again." |
| T8 | How does it scale? | "Every contract and job is its own account, so there's no global state contention. The job board reads accounts directly today; past a few hundred listings we'd add an indexer." |

### Pháp lý & dữ liệu (CL)

| # | Câu hỏi | Trả lời (English) |
| --- | --- | --- |
| L1 | Is this legal in Vietnam? | "Under Decree 52/2024, crypto is not a lawful payment instrument in Vietnam. That's why our Vietnamese user never receives crypto: the client locks USDC abroad, and a payout partner abroad sends VND by bank transfer. In this demo the partner is simulated. We hold no funds. Before real money moves, a lawyer must confirm our software is not a crypto-asset service under Decree 284/2026." |
| L2 | KYC / AML? | "KYC and bank details would sit with the payout partner, never with us. We cap each contract at 1,000 USDC. Devnet has no KYC, and we disclose that. Wallet screening is on the roadmap." |
| L3 | Where does personal data go? | "Login goes through Dynamic with explicit consent. Contract content is encrypted so even we can't read it. Addresses, usernames, contract titles and job listings are public on-chain, and the app warns users not to put personal data there." |
| L4 | Is this a job marketplace? | "Businesses post funded jobs and choose freelancers themselves. N.E.D doesn't select, vet or employ anyone, and isn't a party to the work." |
| L5 | Tax? | "Business revenue up to VND 500 million a year is exempt from personal income tax under Law 109/2025. We give freelancers a record they can export; it's not tax advice." |

### Sản phẩm (PO)

| # | Câu hỏi | Trả lời (English) |
| --- | --- | --- |
| P1 | Why Solana? | "Sub-cent fees, about US$7 billion of USDC already on Solana, and Circle's devnet USDC let us show real token flows." *(Kiểm tra lại số trên DefiLlama ngày 9 Oct.)* |
| P2 | How will you make money? | "Nothing is charged in v1. A small client-side fee at release is planned only after a legal opinion." |
| P3 | What's missing before launch? | "A payout partner sandbox, a legal opinion, OTP, an audit and a multisig. Then a pilot with real client–freelancer pairs." |
| P4 | Did you use AI? | Trả lời trung thực theo câu team đã thống nhất, ví dụ: *"Yes, AI coding assistants helped; every commit is public and we can walk you through any instruction."* |

---

## 5. Phải xong trước final (chặn pitch nếu chưa xong)

| # | Việc | Owner | Hạn | Vì sao |
| --- | --- | --- | --- | --- |
| 1 | **Viết lại README**: hiện README vẫn tả bản wallet cũ (Neo-brutalism, Jupiter, swap), ghi "24 milestone tests" và "updated 3 Oct". Cần: tổng quan Milestone Lock, link live, program ID, 54 test, 3 lệnh để chạy lại, bảng CU, phần limits | PO + Dev | **8 Oct** | Tiêu chí 4 (20 điểm): giám khảo mở repo là thấy ngay |
| 2 | Thêm file **LICENSE** (README đang ghi MIT nhưng chưa có file) hoặc bỏ dòng đó | PO | 8 Oct | Tiêu chí 4 |
| 3 | **S-1**: bật D27 trên mobile, hoặc đổi disclosure ở mobile cho khớp ("No neutral arbiter") | Dev | 8 Oct 18:00 | Tránh việc app nói sai khi giám khảo tự thử |
| 4 | Thay các key bị lộ (S1–S3) | PO | ngay | An toàn khi demo |
| 5 | Backup video 60–90 s | Design + PO | 9 Oct | Bắt buộc theo rule |
| 6 | Gửi slide cho ban tổ chức | Biz | theo hạn BTC | Bắt buộc theo rule |
| 7 | CL ký duyệt: mọi câu trên slide, app, booth đều đúng sự thật hoặc được ghi là roadmap | CL | 9 Oct | Compliance |

---

## 6. Quy tắc chữ (word table)

- **Dùng:** lock, release, refund, receive earnings, request changes, Release now, payout partner (simulated).
- **Không dùng:** pay/payment/thanh toán (để chỉ USDC), escrow, ký quỹ, safe/an toàn, guaranteed, invest, "first", zero fees, licensed partner, **auto-release**, "we screen wallets", "not offering a service".
- Mỗi con số phải có nguồn (mục 7); con số nào cũ thì nói kèm năm.

---

## 7. Resources

### Live & on-chain

| Mục | Link |
| --- | --- |
| Workspace (web app, Jobs ở `/jobs`) | https://unihackfest-2026.vercel.app |
| Wallet (mobile web build) | https://tdat10052499.github.io/Unihackfest-2026/ |
| Repo | https://github.com/Tdat10052499/Unihackfest-2026 |
| Program trên Explorer (devnet) | https://explorer.solana.com/address/8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh?cluster=devnet |
| Payout partner demo (allowlist) | `FA2qzovJShkNNNnMz3nXmYXvBzenRTgU2oko7RBBhbyp` |
| Circle devnet USDC mint | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| Circle faucet | https://faucet.circle.com |

### Tài liệu trong repo

| Tài liệu | Dùng để |
| --- | --- |
| `docs/09-milestone-lock/README.md` | Decision log D1–D28 |
| `docs/09-milestone-lock/program-spec.md` | Byte layout, instructions, errors, tests |
| `docs/09-milestone-lock/system-tracker.md` | Workflow, scenarios, invariants |
| `docs/09-milestone-lock/product-spec.md` §6–7 | Word table, demo script gốc |
| `docs/09-milestone-lock/funded-jobs-plan.md`, `review-decision-plan.md` | Funded Jobs (D25), request changes (D27) |
| `docs/tong-hop-tien-do.md` | Kết quả test, bảng CU, thông tin devnet |
| `docs/05-legal/qa-cheatsheet.md` | Bản Q&A đầy đủ |
| `docs/08-research/ned-research-and-compliance.md` | Nguồn số liệu và luật |

### Số liệu dùng trong pitch

| Số | Nguồn | Trạng thái |
| --- | --- | --- |
| 68% freelancer Việt Nam từng bị quỵt tiền | [PayPal survey via The Leader, 2017](https://e.theleader.vn/68-per-cent-of-freelancers-in-vietnam-having-experiences-of-not-being-paid-d2518.html) | Verified, số liệu cũ (nói kèm năm) |
| ≈ US$7 bn USDC trên Solana | [DefiLlama](https://defillama.com/stablecoins/Solana) | Verified ngày 2 Oct; kiểm tra lại 9 Oct |
| 54/54 program tests; CU table | `docs/tong-hop-tien-do.md` (S1, g15) | Verified trên repo |
| 27 instructions, 53 errors, 24 events | `ned_program/programs/ned-program/src/` | Verified trên `cd5bbac` |
| 426 commits | `git log` trên `main` | Verified 7 Oct (cập nhật lại 9 Oct) |
| ≈ 520,000 VND cho 20 USDC | Wise mid-market, 2 Oct | Cập nhật vào ngày thi |

### Cơ sở pháp lý (cho Q&A)

- Nghị định 52/2024/NĐ-CP, Đ.3(10–11), Đ.8(6–7): tiền mã hoá không phải phương tiện thanh toán hợp pháp
- Nghị định 284/2026/NĐ-CP, Đ.7(4): dịch vụ tài sản mã hoá (hiệu lực 1 Sep 2026)
- Nghị quyết 05/2025/NQ-CP: thí điểm thị trường tài sản mã hoá
- Luật Bảo vệ dữ liệu cá nhân 91/2025 + Nghị định 356/2025: dữ liệu cá nhân
- Luật 109/2025, Đ.7: ngưỡng miễn thuế TNCN 500 triệu đồng
- Luật 74/2025 / Nghị định 352/2025: dịch vụ việc làm (áp dụng cho job board hay không vẫn **[Unverified]**, đang chờ chuyên gia; không khẳng định trên sân khấu)

*Đây không phải legal advice. Các điểm [Unverified] cần luật sư xác nhận.*
