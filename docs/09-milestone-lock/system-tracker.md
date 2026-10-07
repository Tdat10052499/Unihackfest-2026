# N.E.D Milestone Lock: System Tracker

**Owner:** Compliance Lead (Nguyễn Minh Chính) · **Cập nhật:** 7 Oct 2026 · **Build tham chiếu:** `main` at `8f17921` (program **v1.3** live on devnet: Milestone Lock + Funded Jobs + D27 note rules)
**Mục đích:** một chỗ duy nhất để cả team biết hệ thống *phải* chạy thế nào, theo dõi mọi tình huống (positive và negative) và từng việc còn phải làm. Mỗi khi code hoặc quyết định thay đổi, cập nhật mục 12 (build tracker) và mục 13 (decisions).
**Rà soát 7 Oct (PO, đối chiếu với program v1.3 và code trên `main`):** workflow lõi (mục 1–5) khớp với code. Đã sửa: I6 chuyển thành đề xuất (chờ Q1); câu D-5 bỏ phần chưa build; mục 7.1 ghi rõ nguồn dữ liệu; trạng thái hint "Public on Solana" và record của business; câu C-1; thêm hub v4 vào build tracker (B-21); `close` ở bảng 3.2; thay từ cấm ở mục 7.2 và 11 bằng "bond".
**Nguồn ưu tiên khi có mâu thuẫn:** decision log D1–D28 trong [`README.md`](README.md) thắng về product và program; file này tóm tắt và theo dõi, không thay thế decision log. Không phải legal advice. Đây là devnet prototype, tiền thử.

**Ký hiệu:** ✅ đã chạy trên `main` · 🔧 đang làm hoặc còn thiếu một phần · 🆕 đề xuất mới (7 Oct, chưa duyệt) · 🗺 roadmap (sau final) · ⛔ cố ý không làm

---

## 1. Tổng quan & invariants

**Một câu:** Client nước ngoài **lock** USDC cho từng milestone *trước khi* freelancer làm. Client **accept & release**, hoặc **request changes** nếu bài chưa đạt. Nếu client không review kịp, hết review deadline thì cả hai bên đều thấy **Release now** và freelancer vẫn nhận tiền. Tiền đi tới đích đã chốt từ đầu:
- freelancer quốc tế nhận USDC vào ví riêng;
- freelancer ở Việt Nam nhận **VND vào ngân hàng** qua payout partner (demo: simulated).

**Funded Jobs (D25)** là cách freelancer tìm việc đã có tiền: business đăng job và lock toàn bộ budget ngay lúc đăng.

**Invariants:** những điều luôn phải đúng. Nếu một thay đổi làm vỡ một trong các điều này thì không merge.

| # | Invariant | Vì sao / nguồn |
| --- | --- | --- |
| I1 | Freelancer ở Việt Nam **không bao giờ nhận, giữ hay gửi USDC qua N.E.D**. Họ chỉ ký `accept`/`submit` bằng login wallet; phí mạng trên devnet là test SOL và không hiện số lượng (A4); trước launch có fee payer (D8) | NĐ 52/2024 Đ.3(11), 8(6); câu trả lời pháp lý số 1. "Chỉ ký có tính là sử dụng không" là câu hỏi luật sư Q6 |
| I2 | **N.E.D không giữ tiền và không di chuyển được tiền đã lock** (contract vault và job vault đều là PDA của program) | Custody (NQ 05), FATF ¶67/¶70, D4 |
| I3 | **Không bên nào tự ý lấy tiền.** Tiền chỉ đi theo rule: client accept · hết review deadline (Release now) · hết submission deadline (Refund now) · freelancer tự trả lại (concede) · hai bên đồng ý split | D1, D11, D27 |
| I4 | **Request changes không bao giờ hoàn tiền cho client.** Tiền vẫn lock cho tới khi hai bên đồng ý | D27 (chống "copy bài rồi đòi tiền") |
| I5 | Đích nhận tiền được **chốt lúc freelancer accept**, không đổi được; Vietnam path chỉ vào địa chỉ partner trong allowlist | D7, D13 |
| I6 🆕 | **Hết hạn thì bên không có lỗi thắng.** Không có tiền phạt; hậu quả là mất quyền phản đối (đã có: Release now, Refund now), cộng thêm record và cooldown (mục 7, chưa build) | **Đề xuất** 7 Oct (thay cho "confirm 2 phía + phạt tiền"), CL đồng ý, **chờ PO ở Q1**. Khi PO duyệt: thêm D29 vào decision log trong `README.md` rồi bỏ 🆕 |
| I7 | **Không thu phí** trong v1; không có fee code | D2, NĐ 284/2026 Đ.7(4) |
| I8 | `released + refunded + unsettled = total` cho mọi contract; job vault chuyển đúng số đã lưu | Có test |
| I9 | Brief và delivery của **contract** được mã hoá, chỉ hai bên đọc; file không bao giờ bị upload, chỉ lưu fingerprint. (Brief của **job listing** là công khai, mục 10) | D15, D22, D26 |
| I10 | Vietnam view **không đăng job**, không tạo contract với vai trò client | D18, D25 |
| I11 | N.E.D **không chọn, không thẩm định, không tuyển dụng** ai và không phải một bên của công việc | Terms (funded-jobs-plan §9) |
| I12 | Mọi chữ trên UI theo word table (product-spec §6): lock, release, refund, receive earnings, request changes; không dùng pay/payment/escrow/safe/licensed partner/auto-release | Compliance, rule cuộc thi, D26 |

---

## 2. Actors & quyền hạn

| Actor | Là ai | Được làm gì | Không bao giờ được |
| --- | --- | --- | --- |
| **Client / Business** | Công ty hoặc cá nhân ở nước ngoài (non-Vietnam view) | Đăng job (lock budget), chọn applicant, tạo contract, lock, **accept & release**, **request changes**, đề xuất/chấp nhận split, close, withdraw job | Đổi đích nhận tiền; lấy lại tiền một mình sau khi freelancer đã submit |
| **Freelancer (Vietnam view)** | Cư trú tại Việt Nam | Xem và apply job, accept + chọn "VND to my bank", submit, gửi bản sửa, hand over final files, trả lại (Return to client), đề xuất split | Thấy USDC/SOL balance, gửi/nhận/swap, đăng job (I1, I10) |
| **Freelancer (international)** | Ở nước ngoài | Như trên + nhận USDC vào ví riêng | — |
| **Payout partner** | Ứng viên Due, Nium; demo là ví test của team | Nhận USDC tại địa chỉ allowlist, quy đổi, chuyển VND | — (ngoài hệ thống) |
| **"Anyone"** | Bất kỳ ai, kể cả hai bên | Release now (hết review deadline), Refund now (hết submission deadline), `lock_from_job` | Chọn tiền đi đâu |
| **N.E.D (team)** | Người viết phần mềm | Deploy/upgrade program (deploy wallet giữ tới 10/10), hosting | Di chuyển tiền đã lock, đọc nội dung đã mã hoá, giữ dữ liệu ngân hàng, chọn hay thẩm định người |

---

## 3. Lifecycle

### 3.1 Job listing (D25, v1.3)

`Open → Selected → Filled`, hoặc `→ Withdrawn`

| Từ | Instruction | Ai ký | Điều kiện chính | Sang |
| --- | --- | --- | --- | --- |
| — | `post_job` (+ `post_job_brief`) | Business | 1–5 milestone; total ≤ 1,000 USDC; `now < apply_by ≤ select_by`; budget chuyển vào job vault | Open |
| Open | `apply_job(pitch ≤ 280 bytes, public)` | Freelancer | `now ≤ apply_by`; không phải chính business; mỗi người 1 đơn | Open |
| Open | `create_fund` + `select_job` (cùng một transaction) | Business | `now ≤ select_by`; contract khớp listing | Selected |
| Selected (quá accept window) | Re-select (đóng contract cũ trong cùng transaction) | Business | `now > selected_at + JOB_ACCEPT_WINDOW` (120 s trên devnet) | Selected (người mới) |
| Selected | `accept` + `lock_from_job` (cùng một transaction) | Freelancer | Đích được chốt trước khi tiền vào contract | Filled (contract Funded) |
| Open/Selected | `withdraw_job` | Business | Chưa ai apply; hoặc quá `select_by` (và quá accept window nếu đang Selected) | Withdrawn (budget về business) |

### 3.2 Contract & milestone

**Contract:** `Created → Accepted → Funded → Settled → Closed`
**Milestone:** `Pending → Submitted → Released` · `Pending → Refunded` · `Submitted → Disputed ("Changes requested") → Released | Refunded | Cancelled`

| Từ | Hành động (UI → instruction) | Ai | Điều kiện | Sang |
| --- | --- | --- | --- | --- |
| — | New contract → `create_fund` | Client | 1–5 milestone, đủ work/review window, ≤ 1,000 USDC | Created |
| Created | Accept → `accept` | Freelancer | Chọn đích | Accepted |
| Accepted | Lock → `lock` (contract trực tiếp) hoặc `lock_from_job` (từ job) | Client / anyone | Đủ USDC; đủ work window | Funded |
| Pending | Submit → `submit` + delivery note | Freelancer | Trước `submit_by` | Submitted |
| Submitted / Disputed | **Accept & release** → `approve` | Client | — | Released |
| Submitted | **Request changes** → `dispute` + review note (kind 3: điểm chưa đạt + lý do) | Client | Trước `review_by` | Disputed |
| Disputed | **Send revised version** → delivery note (`stage: revision`) | Freelancer | — | Disputed |
| Disputed | **Return to client** → `concede` | Freelancer | — | Refunded |
| Chưa xong | **Propose / Accept split** → `propose_cancel` + `accept_cancel` | Hai bên | Split cho **cả contract**, không riêng một milestone | Cancelled (chia theo thoả thuận) |
| Submitted, quá `review_by` | **Release now** → `release_after_review` | Anyone (cả hai bên đều thấy nút) | Không bị dispute | Released |
| Pending, quá `submit_by` | **Refund now** → `refund` | Anyone | Chưa submit | Refunded |
| Released | **Hand over final files** → delivery note (`stage: handover`) | Freelancer | Không bắt buộc (không có gì cưỡng chế) | Released |
| Created / Accepted / Settled | Close → `close` | Creator | Vault rỗng; phần thừa về client. Ở Created/Accepted đây là huỷ contract trước khi lock | Closed |

Quy ước thời gian: dùng giờ của chain, "quá hạn" nghĩa là `now > deadline`. **Khi đang Disputed thì không có deadline nào chạy** (mục 5).

---

## 4. Workflows (ví dụ)

### 4.1 Contract trực tiếp: Mia (client, Singapore, Workspace) & Vinh (designer, Hà Nội, Vietnam view)

| Bước | Ai | Làm gì | Vinh / Mia thấy gì | Status |
| --- | --- | --- | --- | --- |
| 0 | Cả hai | Google sign-in → consent v2 → (fund chạy ngầm "Preparing your account…") → residence | Không có số SOL ở Vietnam view | ✅ |
| 1 | Mia | `/new`: "Landing page design", 2 × 10 USDC, "Done when" cho từng milestone, 2 deadline | Gợi ý "Public on Solana…" ở ô title | ✅ |
| 2 | Vinh | Mở link → đọc brief → **Accept** → "VND to my bank account" | "≈ 520,000 VND (estimate)" | ✅ |
| 3 | Mia | **Lock** 20 USDC | Vinh thấy "Locked" → bắt đầu làm | ✅ |
| 4 | Vinh | **Submit** M1: đọc "Before you submit" (U5), gắn watermark cho preview (U6), share bằng Google Drive link | Fingerprint + thời gian lưu on-chain | ✅ Workspace · 🔧 mobile (S13) |
| 5 | Mia | Chuông thông báo (U3) → **Review**: "What to check" bên cạnh "What Vinh delivered" | Countdown review deadline | ✅ Workspace · 🔧 mobile (S12) |
| 6a | Mia | **Accept & release** | "Released to payout partner · VND transfer simulated" | ✅ |
| 6b | Mia | Hoặc **Request changes** (tick điểm chưa đạt + lý do) | Cả hai thấy "No deadline while changes are requested" | ✅ Workspace · 🔧 mobile |
| 7 | Vinh | (sau 6b) **Send revised version**, rồi Mia accept & release | "Revised version received · review it" | ✅ Workspace |
| 8 | Vinh | Sau release: **Hand over final files** | Mia **Check a file** khớp fingerprint | ✅ Workspace |
| 9 | Mia im lặng ở M2 | Hết review deadline → **Release now** (cả hai thấy) | Tiền về Vinh; tính 1 "late review" cho Mia 🆕 | ✅ (🆕 record) |
| 10 | Vinh | Records → CSV (≈ VND, kèm note "estimate · simulated · not tax advice") | — | ✅ |
| 11 | Mia | Close contract, lấy lại rent | — | ✅ |

### 4.2 Funded Job

| Bước | Ai | Làm gì | Status |
| --- | --- | --- | --- |
| 1 | Business (non-VN) | `/jobs/new`: đăng job, **lock toàn bộ budget** ("Budget locked" + Explorer link) | ✅ |
| 2 | Freelancer | `/jobs/find` → job detail → **Apply** (pitch công khai ≤ 280 bytes) | ✅ |
| 3 | Business | Applicants → **Select** → tạo contract bình thường (brief mã hoá + key wraps) | ✅ |
| 4 | Freelancer | Mở invite → **Review & accept in wallet** → chọn đích → budget chuyển vào contract | ✅ |
| 5 | — | Từ đây chạy y như 4.1, bước 4–11 | ✅ |
| 6 | Business | Không ai phù hợp → **Withdraw** sau `select_by` → budget về business | ✅ |

---

## 5. Timers & deadlines

**Rule chính (I6, 🆕 chờ Q1): hết hạn thì bên không có lỗi thắng.** Phần "mất quyền phản đối" đã chạy trong program (Release now, Refund now); record và cooldown thì chưa. Ngoại lệ: khi đang **Changes requested** thì không có timer nào (D27), nên đây là chỗ cần layer ở mục 7.

| Timer | Hết hạn thì | Bên "thua" | Demo | Launch (đề xuất) | Status |
| --- | --- | --- | --- | --- | --- |
| Work window tối thiểu | Không cho tạo/accept/lock nếu còn quá ít thời gian | — | 60 s | vài giờ | ✅ |
| `apply_by` / `select_by` (job) | Hết nhận đơn / business được withdraw | Business (nếu không chọn) | tuỳ | 3–7 ngày | ✅ |
| Job accept window | Business được chọn người khác | Applicant được chọn nhưng không accept | 120 s | 48 h | ✅ (🆕 48 h launch) |
| `submit_by` | **Refund now** mở cho anyone | Freelancer | +10 min | theo job | ✅ |
| `review_by` | **Release now** mở cho anyone | Client | 60 s | **72 h** | ✅ (🆕 72 h default) |
| Changes requested | **Không có deadline**; tiền lock tới khi hai bên đồng ý | — | — | Dispute timeout hoặc neutral reviewer | 🗺 (🆕 record "long hold", mục 7) |
| Reminders 24 h / 1 h trước `submit_by` và `review_by` | Nhắc trong app | — | — | in-app; push 🗺 | 🆕 |
| Lock deadline (contract trực tiếp) | Hiện không có: client accept xong có thể không bao giờ lock | — | — | 72 h rồi hết hiệu lực | 🗺 |
| Gia hạn deadline | Hiện không có instruction | — | — | `extend_deadline` (hai bên ký) | 🗺 |

---

## 6. Scenarios

"Today" = hành vi trên `main` 8f17921. "Solution" = cách xử lý hiện có hoặc đề xuất.

### 6A. Positive

| ID | Tình huống | Today |
| --- | --- | --- |
| P1 | Client accept & release từng milestone | ✅ |
| P2 | Client quên review, hết `review_by` → Release now | ✅ (client bị tính "late review" 🆕) |
| P3 | Freelancer quốc tế nhận USDC vào ví riêng | ✅ |
| P4 | Bài chưa đạt → request changes → bản sửa → accept | ✅ Workspace (D27) |
| P5 | Freelancer hand over final files, client kiểm tra khớp fingerprint | ✅ Workspace |
| P6 | Hai bên đồng ý split | ✅ Workspace (split cho cả contract) |
| P7 | Business đăng job, chọn người, freelancer accept → budget chuyển vào contract | ✅ |
| P8 | Mở contract trên thiết bị khác | ✅ (D22) |
| P9 | Records CSV để tự khai thuế | ✅ |

### 6B. Negative: client / business

| ID | Tình huống | Today | Rủi ro | Solution | Status |
| --- | --- | --- | --- | --- | --- |
| C-1 | Freelancer đã accept nhưng **client không bao giờ lock** (contract trực tiếp) | Không mất tiền | Freelancer làm trước khi thấy "Locked" | Banner "Don't start until this shows Locked"; lock deadline 🗺. (Funded Jobs không có vấn đề này vì budget đã lock sẵn) | 🆕 |
| C-2 | **Client ngâm review** | Hết `review_by` → Release now | Freelancer phải chờ | Countdown + reminders; record "late review"; cooldown nếu lặp lại | ✅ / 🆕 |
| C-3 | Client **copy preview rồi request changes** để ép giá | Tiền vẫn lock (I4), không về client | Ép freelancer nhận split thấp | Watermark preview (U6); số milestone đang bị request changes hiện trên record của business ở trang job ✅ (chỉ đếm yêu cầu **đang mở**, không tích luỹ; `labels.ts`); record "long hold" và "repeated change requests" 🆕; neutral reviewer 🗺 | ✅ / 🆕 |
| C-4 | **Stalemate:** không bên nào nhường | Tiền lock không có hạn | Kẹt tiền vô thời hạn | Disclosure "No neutral arbiter"; record "long hold" sau 7 ngày 🆕; dispute timeout / `arbiter` 🗺 | 🔧 / 🗺 |
| C-5 | Client lấy được final files rồi biến mất | Final chỉ giao sau release (D27) | — | "Before you submit" + handover sau release | ✅ |
| C-6 | Client muốn **đổi đích** sang địa chỉ của mình | Program chặn | — | I5 | ✅ |
| C-7 | Client không đủ USDC khi lock hoặc khi đăng job | App kiểm tra trước | — | — | ✅ |
| C-8 | Business **đăng job ảo hoặc spam** | Không có moderation (chỉ có withdraw) | Uy tín board; dữ liệu công khai | Budget phải lock thật (cái giá của spam); nút report 🗺 | 🗺 |
| C-9 | Business **không chọn ai** | Withdraw sau `select_by` | Applicant mất rent (devnet SOL) | Đóng application 🗺 | ✅ / 🗺 |
| C-10 | Circle **freeze** USDC | Milestone hoặc job đó kẹt | Ngoài tầm kiểm soát | Disclosed; mỗi contract/job một vault | ✅ |
| C-11 | Ví client bị sanction | **Không có screening** | AML | Không nói "we screen wallets" (A2); screening 🗺 | 🗺 |

### 6C. Negative: freelancer

| ID | Tình huống | Today | Rủi ro | Solution | Status |
| --- | --- | --- | --- | --- | --- |
| F-1 | Accept rồi **không submit** | Hết `submit_by` → Refund now | Client mất thời gian | Reminders; record "missed submission"; cooldown | ✅ / 🆕 |
| F-2 | **Nộp bài rác** | Client request changes (D27) | — | Done-when checklist trong Review | ✅ Workspace |
| F-3 | Trễ submit vài phút | Refund now mở ngay | Mất milestone | Reminders; `extend_deadline` 🗺 | 🆕 / 🗺 |
| F-4 | Được chọn ở job nhưng **không accept** | Business chọn lại sau accept window | — | Record "no-show after selection" 🆕 | ✅ / 🆕 |
| F-5 | **Giữ final files** sau release | Không cưỡng chế được | Client mất bài | Fingerprint + record công khai; record "handover missing" 🆕; final mã hoá, key mở khi release 🗺 | 🔧 / 🗺 |
| F-6 | Mất điện thoại/login | Google login khôi phục ví; key từ thiết bị khác hoặc link mời | Mất hết thiết bị và link thì không đọc lại được brief | Hướng dẫn lưu link mời | ✅ |
| F-7 | Người ở VN **chuyển sang international view** | Residence tự khai | Vỡ I1 | Disclose; launch: KYC của partner quyết định | ⚠ disclosed |
| F-8 | Người ở VN gõ URL `/send`, `/receive`… | Route guard chuyển về `/home` (cả GitHub Pages và `/wallet`) | — | V1 | ✅ (PO cần thử khi đã đăng nhập) |
| F-9 | Partner **không chuyển VND** | Ngoài chain | Freelancer phụ thuộc partner | Disclosed; `payout_reference`; partner SLA 🗺 | ✅ / 🗺 |
| F-10 | Pitch công khai chứa **thông tin cá nhân** | Pitch lưu on-chain vĩnh viễn | PDP Law | Hint "Public on Solana. Don't put names or personal details here." ở ô pitch (`JobDetail.tsx`) và ô brief của job (`PostJob.tsx`); pitch mã hoá 🗺 | ✅ Workspace / 🗺 |

### 6D. Hệ thống / bảo mật / nhất quán

| ID | Tình huống | Today | Solution | Status |
| --- | --- | --- | --- | --- |
| S-1 | **Lệch flag dispute:** Workspace bật (D27), mobile tắt (`ned-wallet/constants/features.ts:13`) | Mobile disclosure nói "No disputes in this demo" trong khi client trên Workspace request changes được; freelancer trên mobile không có nút gửi bản sửa / trả lại / split | Làm xong S13 (D27 trên mobile) và bật flag mobile, đồng thời đổi disclosure sang bản "No neutral arbiter"; tới lúc đó demo phần revision trên Workspace | 🔧 **P0** |
| S-2 | Release / refund 2 lần, donation vào vault, sai mint | Program chặn, có test | — | ✅ |
| S-3 | Team upgrade program khi đang có tiền lock | Có thể (deploy wallet tới 10/10) | Disclose; Squads multisig hoặc immutable trước mainnet | ✅ disclosed / 🗺 |
| S-4 | Link mời bị lộ | Ai có link đọc được nội dung vĩnh viễn (không di chuyển được tiền) | Disclosed | ✅ |
| S-5 | Ví bị chiếm → thêm device key | Nhận key của contract mới | `remove_device_key`; disclose | ⚠ |
| S-6 | Spam `post_note` / review note | Không giới hạn | Giới hạn 🗺 | ⚠ |
| S-7 | API key bị lộ (Jupiter, Helius, key cũ) | Owner task | Revoke, giới hạn domain, redeploy | 🔧 S1–S3 |
| S-8 | Banner tiếng Việt "Nhận tiền thành công" | Còn trên mobile | S12 (C5) | 🔧 |
| S-9 | RPC rate-limit / devnet sập lúc demo | — | Key giới hạn domain; backup video | 🔧 |
| S-10 | Hơn vài chục listing → board chậm | `getProgramAccounts` | Indexer 🗺 | 🗺 |

### 6E. Demo day

| ID | Tình huống | Solution |
| --- | --- | --- |
| D-1 | Contract B (Release now) chưa sẵn sàng | Chuẩn bị bằng login thật 15 phút trước; tập ít nhất 1 lần |
| D-2 | Hết USDC faucet | Claim 2 lần hôm trước; `recycle-demo-usdc` |
| D-3 | Demo request changes trên mobile khi S13 chưa xong | Demo phần review và revision trên Workspace (cả hai vai) |
| D-4 | Mất Wi-Fi | Hotspot; backup video 60–90 s của app thật |
| D-5 | "What stops a client from stalling?" | "If the client doesn't review in time, both sides see Release now and the freelancer receives the earnings. Requesting changes never sends the money back to the client; it stays locked until both agree, and a business's open change requests show on its record in N.E.D Jobs." (Chỉ nói những gì đã build. Record "late review" và cooldown ở mục 7 là roadmap; nếu bị hỏi tiếp thì nói đó là bước tiếp theo, không nói là đã có.) |

---

## 7. Accountability layer (🆕 đề xuất 7 Oct, chờ PO duyệt)

**Mục tiêu:** không ai câu giờ hay ép bên kia mà không chịu hậu quả, và **không phạt tiền** (I6, I7, I1). Layer này lấp đúng chỗ D27 để trống: khi đang changes requested thì không có timer.

### 7.1 Sự kiện bị tính ("lapse"), đọc từ lịch sử on-chain

| Lapse | Ai | Phát hiện | Lấy dữ liệu từ đâu |
| --- | --- | --- | --- |
| **Late review** | Client | Milestone được release bằng `release_after_review` (Release now), không phải `approve` | Event `MilestoneReleased.by_timeout` trong log giao dịch. Account chỉ lưu `Released`, không phân biệt hai cách |
| **Long hold** | Client | Milestone ở trạng thái Disputed quá **7 ngày** mà client không accept và không gửi review note mới sau bản sửa gần nhất | Thời điểm của giao dịch `dispute` và các note. Account không có `disputed_at` |
| **Repeated change requests** | Client | ≥ **3** review note trên cùng một milestone | Lịch sử giao dịch `post_note` (kind 3) |
| **Missed submission** | Freelancer | Milestone bị refund vì quá `submit_by` | Account: `Refunded` + `submitted_at = 0` (đọc thẳng được) |
| **No-show after selection** | Freelancer | Được chọn ở job nhưng không accept trong accept window | Lịch sử giao dịch `select_job`. Re-select ghi đè `selected_at`/`fund` của listing |
| **Handover missing** | Freelancer | Milestone đã Released nhưng không có handover note sau **48 h** | Thời điểm giao dịch release và note `stage: handover`. Account không có `released_at` |

Không tính lapse do bên kia gây ra, và không tính contract demo/test (có tag).

**Hệ quả về dữ liệu:** 5 trên 6 lapse không đọc được từ account state mà phải quét lịch sử giao dịch (`getSignaturesForAddress` + parse log) của từng contract và listing. Không có indexer thì cách này tốn RPC và chậm khi số contract tăng (cùng vấn đề với S-10). Vì vậy layer này chỉ lên slide roadmap; khi build thì cần indexer, hoặc program lưu thêm `disputed_at`/`released_at`/`by_timeout` (đổi layout, cần upgrade).

### 7.2 Hậu quả

| Mức | Điều kiện (30 ngày gần nhất) | Hậu quả | Ai thấy |
| --- | --- | --- | --- |
| Record | Mọi contract | "On-time reviews 9/10 · Changes requested 2 · Missed submissions 1" (mở rộng từ record của business đã có ở trang job: contract đã release, milestone đã nhận, "Milestones still locked by a request") | Bên kia, trước khi accept/select/apply |
| ⚠ Warning | ≥ 1 lapse | Badge vàng "1 missed deadline in the last 30 days" | Bên kia |
| ⏸ Cooldown | ≥ 2 lapse | App tạm khoá **đăng job / tạo contract** (client) hoặc **apply / accept** (freelancer) trong **24 h**; hiện lý do và giờ hết khoá | Chính người đó |

**Giới hạn:**
- Không có backend, nên rule tính trong app từ dữ liệu on-chain; program không cưỡng chế, người rành kỹ thuật vẫn gọi thẳng program được. Với prototype thì chấp nhận được.
- Phần lớn lapse cần lịch sử giao dịch, không có trong account state (xem "Hệ quả về dữ liệu" ở 7.1).
- Record là dữ liệu cá nhân suy ra từ dữ liệu công khai, nên phải ghi trong Privacy notice.
- Wording: dùng "missed deadline", "late review"; không dùng "fine" hay "penalty".
- Bond (cả hai bên đặt một khoản bond): 🗺, chỉ cho người ngoài Việt Nam và sau khi có ý kiến luật sư.

---

## 8. Submit: "Before you submit" (U5 + U6, đã có trên Workspace)

Hiện có trên Workspace (S8): sheet "Before you submit", kiểm tra watermark cho preview thiết kế (nút **Add watermark**), share bằng Google Drive link, "Files (optional)" chỉ lưu fingerprint, các chế độ Send revised version và Hand over final files. Mobile: 🔧 S13. Help guide `/help` trên mobile ✅ (S11).

Năm ý cốt lõi phải luôn có trong guide (kiểm tra mỗi khi đổi copy):
1. **Send a review copy, not the final files:** preview có watermark, bản low-res hoặc một phần, link chỉ xem.
2. **Keep the final files** tới khi milestone được release, rồi **Hand over final files**.
3. **Match the brief:** tick từng "Done when".
4. **Fingerprints prove what you sent:** file không bị upload; fingerprint và thời gian được lưu trên Solana.
5. **Know the clock:** client có tới *[review deadline]* để review; nếu client không review thì cả hai thấy Release now. Nếu client request changes thì tiền vẫn lock, không về client.

Không dùng "safe/safely/an toàn".

---

## 9. Notification map

Kênh: chuông U3 trên Workspace (đọc chain mỗi 30 s, ✅ S9); mobile banner kiểu mới 🔧 S12. Chỉ chạy khi app đang mở; push/email 🗺.

| Sự kiện | Client / Business | Freelancer | Status |
| --- | --- | --- | --- |
| Job: có đơn apply mới | "New applicant: @vinh" | — | ✅ Workspace |
| Job: được chọn | — | "You were selected · review & accept" | ✅ |
| Contract mới / accepted / locked | ✓ | ✓ | ✅ |
| Submitted | "Waiting for your review · review by …" | — | ✅ Workspace · 🔧 mobile |
| Changes requested | — | "Changes requested · send a revised version" | ✅ Workspace · 🔧 mobile |
| Revised version sent | "Revised version received · review it" | — | ✅ Workspace |
| Review deadline passed | "Review time is over · Release now" | "Release now" | ✅ |
| Released | "Released" | "Released · hand over the final files" | ✅ |
| Final files handed over | "Final files received" | — | ✅ Workspace |
| Refunded | ✓ | ✓ | ✅ |
| Reminders 24 h / 1 h | review | submit | 🆕 |
| Warning / cooldown | ✓ | ✓ | 🆕 |
| Wallet transfer banner (Vietnam view) | — | **Không hiện** | 🔧 S12 (C5) |

---

## 10. Data & privacy map

| Data | Lưu ở đâu | Ai thấy | Ghi chú |
| --- | --- | --- | --- |
| Google name/email | Dynamic (US); Ably qua Dynamic | Dynamic, app | Consent v2 ✅ |
| Wallet, @username | Solana | Public, vĩnh viễn | — |
| Phone hash | Ô nhập đã **ẩn** trong onboarding (C3) | — | Record cũ vẫn ở trên chain |
| Device public keys | Solana | Public | D22 |
| Contract title, amounts, deadlines, hashes | Solana | Public | Hint "no personal data" ✅ |
| Brief và delivery của contract, review notes | Solana, mã hoá | Hai bên | Không xoá được |
| **Job listing: title, summary, brief, milestones, budget** | Solana, **plain text** | **Public** | Business không được đưa dữ liệu cá nhân vào; hint "Public on Solana" ✅ (`PostJob.tsx`) |
| **Applications / pitch** | Solana, plain text | **Public** | Hint ✅ (F-10) |
| Record của business (✅: contract đã release, milestone đã nhận, milestone đang bị request changes); reputation và lapse (🆕) | Tính từ dữ liệu trên chain | Public / bên kia | Ghi trong Privacy notice 🆕 |
| Consent log | Thiết bị (giữ lại khi sign-out ✅) | Người dùng | — |
| Bank, ID | Chỉ ở partner (simulated) | Partner | N.E.D không bao giờ thấy |
| Logs | Vercel, GitHub Pages | Hosting | Có trong Privacy notice ✅ |

---

## 11. Compliance guardrails (check trước mỗi thay đổi)

- [ ] Giữ được I1 (đúng câu A4)? Vietnam view không có USDC/SOL amount, send/receive/swap, đăng job.
- [ ] Có làm N.E.D cầm, di chuyển hay thu tiền không (I2, I7)? Nếu có: dừng, hỏi CL.
- [ ] Có tiền phạt hay bond nào chạm tới người ở Việt Nam không? → ⛔
- [ ] Có thêm dữ liệu công khai on-chain (job, pitch, record) không? → cập nhật consent, Privacy, hint ở ô nhập.
- [ ] Wording: word table; partner "simulated (candidates: Due, Nium)"; không dùng "auto-release" (D26), "not offering a service" (A3), "we screen wallets" (A2).
- [ ] Disclosure khớp với **flag dispute của từng app** (S-1).
- [ ] Job board: N.E.D không chọn, thẩm định hay tuyển dụng (I11); chưa có review pháp lý về dịch vụ việc làm / sàn TMĐT (Luật 74/2025, NĐ 352/2025 \[Unverified\]) → câu hỏi chuyên gia.
- [ ] Bài đăng, booth, slide: "public student prototype on devnet, test tokens, no fee, no payout partner connected" (A3); không mời gọi người dùng ở Việt Nam (NĐ 284 Đ.7(4) bao gồm cả quảng cáo).

---

## 12. Build tracker

| ID | Hạng mục | Owner | Status | Due | Done when |
| --- | --- | --- | --- | --- | --- |
| B-01 | Program v1.3 (Milestone Lock + Funded Jobs + D27 notes) | Dev | ✅ | — | 54 tests, live trên devnet |
| B-02 | Workspace: Jobs site, contract/review D27, submit U5/U6, bell U3, consent gate, fonts, CSP (S5–S9) | Dev | ✅ | — | Theo progress log S5–S9 |
| B-03 | Mobile: V1 guard, A4, V2, C1, C3, P1–P3, C2 theo flag, Help (S10–S11) | Dev | ✅ | — | PO thử khi đã đăng nhập |
| B-04 | Mobile notifications U3 + C5 (S12) | Dev | 🔧 | 8 Oct | Không còn chữ Việt; Vietnam view không có wallet banner |
| B-05 | Mobile D27 screens + U1/U5/U6 (S13) **và flag mobile = Workspace** | Dev | 🔧 **P0** | 8 Oct | S-1 hết lệch; disclosure "No neutral arbiter" ở cả hai app |
| B-06 | Docs & copy (S14): Q&A theo A1–A4/A10, câu trả lời job marketplace, Terms | CL + PO | 🔧 | 8 Oct | `qa-cheatsheet.md` + Hub tab 08 khớp D27/D25 |
| B-07 | Test T1–T15 (S15), merge & deploy (S16) | Dev | 🔧 | 9 Oct | Cả hai build được deploy |
| B-08 | Keys S1–S3 | PO | 🔧 | ngay | Bundle mới không còn key; register row 12 |
| B-09 | README R1 + LICENSE R2 | PO + Dev | 🔧 | 8 Oct | CL đọc README đối chiếu app live |
| B-21 | Hub v4 (`prompts-hub-v4.md`): H1 nền tảng, H2 Overview, H3 Find jobs đã xong trên nhánh `feat/hub-v4` (chưa vào `main`); H4 trang Legal (chỉ ở footer), H5 restyle + QA chưa làm | Dev | 🔧 | 8 Oct | H1–H5 trên `main`; demo dùng giao diện v4. Nếu không kịp freeze: demo giao diện S5/S6 hiện có |
| B-10 | Banner "Don't start until Locked" (contract trực tiếp) | Dev | 🆕 | sau freeze | — |
| B-11 | Preset review 72 h, job accept window 48 h (launch) | Dev | 🆕 | sau freeze | — |
| B-12 | Reminders 24 h / 1 h | Dev | 🆕 | sau freeze | — |
| B-13 | Accountability layer: record + warning + cooldown (mục 7) | Dev | 🆕 | sau freeze; slide roadmap trước | — |
| B-14 | Hint "Public on Solana" ở ô pitch và brief của job | Dev | ✅ Workspace | — | Đã có từ S6 (`JobDetail.tsx`, `PostJob.tsx`) |
| B-15 | Dispute timeout / neutral reviewer (`arbiter`) | Dev + luật sư | 🗺 | — | — |
| B-16 | `extend_deadline`, split theo milestone | Dev | 🗺 | — | — |
| B-17 | Final mã hoá, key mở khi release; pitch mã hoá | Dev | 🗺 | — | — |
| B-18 | Push/email, indexer, report button, đóng application | Dev | 🗺 | — | — |
| B-19 | Partner thật, wallet screening, KYC qua partner | PO + CL | 🗺 | — | — |
| B-20 | Squads multisig / immutable | Dev | 🗺 | trước mainnet | — |

---

## 13. Open questions & decisions log

| # | Câu hỏi | Đề xuất | Ai quyết | Hạn | Kết quả |
| --- | --- | --- | --- | --- | --- |
| Q1 | Accountability layer (mục 7) thay cho "confirm 2 phía + phạt tiền"; kéo theo I6 | Dùng layer (roadmap, xem hệ quả dữ liệu ở 7.1) | PO | 8 Oct | CL đồng ý 7 Oct; chờ PO. Duyệt thì thêm D29 |
| Q2 | Ngưỡng lapse (7 ngày long hold, 3 lần request changes, 48 h handover) và cooldown (2 lapse → 24 h) | Như mục 7 | PO + CL | 8 Oct | |
| Q3 | Review mặc định khi launch | 72 h | PO | 8 Oct | |
| Q4 | S-1: bật D27 trên mobile trước freeze hay chỉ demo trên Workspace? | Bật nếu S13 xong trước 8 Oct 18:00; nếu không, mobile hiện "Open in Workspace to respond" và disclosure bản "No neutral arbiter" | PO | 8 Oct | |
| Q5 | Record hiện cho ai | Bên kia của contract / người đang xem listing | CL | 8 Oct | |
| Q6 | Câu hỏi chuyên gia mới: job board (Luật 74/2025, NĐ 352/2025, sàn TMĐT); record/cooldown | Thêm vào expert pack | CL | 8 Oct | |
| Q7 | Bond-based penalties | Roadmap, ngoài Việt Nam, cần luật sư | CL | sau final | |
| Q8 | Q&A mới: "What stops a client from stalling?" và "Is this a job marketplace?" | D-5; câu trong funded-jobs-plan §9 | CL | 8 Oct | |
