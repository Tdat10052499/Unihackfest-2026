# N.E.D Wallet — Đề xuất hướng đi v2: "Hụi minh bạch" cho người Việt xa quê

> **Trạng thái:** đề xuất v2. Chủ dự án đã đồng ý hướng đi ngày 01/10/2026. Chưa được mentor, Compliance Lead hay luật sư thẩm định.
> **Thay thế:** [`../05-vietnam-strategy-and-revenue-model.md`](../05-vietnam-strategy-and-revenue-model.md) (v1). V1 vẫn giữ để tra cứu phần pháp lý.
> **Cập nhật:** 01/10/2026 · **Người lập:** Ho Du Tuan Dat, cùng trợ lý AI nghiên cứu
> **Bản tiếng Anh:** [`strategy-v2.en.md`](strategy-v2.en.md) · **Mô hình số liệu:** [`unit_economics.py`](unit_economics.py)

---

## 0. Dành cho người đọc và trợ lý AI

Nếu bạn clone repo và dùng Claude (hoặc trợ lý AI khác) để phân tích, hãy đọc mục này trước.

**Quy ước trong tài liệu:**

| Nhãn | Nghĩa |
| --- | --- |
| **[Nguồn]** | Dữ kiện có nguồn, link nằm ở mục 16 |
| **[Suy luận]** | Kết luận rút ra từ dữ kiện, chưa được chuyên gia xác nhận |
| **[Giả định]** | Con số hoặc điều kiện tự đặt ra để tính toán; cần kiểm chứng |
| **[Chưa xác minh]** | Đã tìm nhưng chưa có nguồn đáng tin |

**Năm điều cần biết ngay:**

1. **Định vị mới:** N.E.D là **ví USD cho người Việt xa quê**. Điểm khác biệt chính là **hụi không thể bị giật**: tiền góp hụi nằm trong smart contract, không nằm trong tay chủ hụi.
2. **Thị trường đầu tiên là lao động Việt tại Nhật.** Đây là nhóm lao động nước ngoài đông nhất tại Nhật: 605.906 người, chiếm 23,6% (10/2025) **[Nguồn]**.
3. **Tại Việt Nam, N.E.D không cung cấp dịch vụ crypto.** Bản Việt Nam là sổ hụi điện tử, tiền chuyển giữa các tài khoản ngân hàng, cộng với giáo dục tài chính và đầu tư mô phỏng. Lý do: Nghị quyết 05/2025, Nghị định 52/2024 và Nghị định 284/2026 (xem mục 8).
4. **Phí chuyển tiền không còn là lợi thế lớn.** Kênh chính thức Nhật → Việt Nam chỉ tốn trung bình 3,70% (gửi 200 USD) và 2,05% (gửi 500 USD) **[Nguồn]**. Lợi thế của N.E.D là niềm tin và tính minh bạch, không phải giá.
5. **UniHackfest 2026:** nhóm thi hạng mục Best Product & Business và Best Technical Build; bài thi bằng tiếng Anh; thể lệ không có giải Best AI Product **[Nguồn: `../05-legal/compliance-lead-tasks.md`]**. Vì vậy, T.E.D (AI) bị hạ ưu tiên.

**File liên quan trong repo:**

- `../01-dinh-huong-du-an.md`: định hướng gốc và lời mentor.
- `../tong-hop-tien-do.md`: tiến độ code đến 28/09/2026.
- `../04-ke-hoach-code.md`: kế hoạch code theo phase.
- `../05-legal/compliance-lead-tasks.md`: việc của Compliance Lead và các quyết định đã xác nhận với ban tổ chức.
- `../../ned_program/programs/ned-program/src/lib.rs`: Anchor program hiện có (định danh).
- `unit_economics.py`: mô hình doanh thu. Đổi giả định rồi chạy `python3 unit_economics.py`.

---

## 1. Tóm tắt điều hành

**Vấn đề.** Có khoảng 605.906 lao động Việt tại Nhật, 270.000 người Việt tại Hàn và 294.000 lao động Việt tại Đài Loan **[Nguồn]**. Họ phải:

- trả nợ môi giới: 80% thực tập sinh Việt sang Nhật mang nợ, trung bình 674.000 yên **[Nguồn]**;
- gửi tiền về nhà hằng tháng: khoảng 100.000 yên với một thực tập sinh điển hình **[Nguồn]**;
- tiết kiệm bằng hụi, trong khi "giật hụi" và "bể hụi" là rủi ro ai cũng biết. Có vụ thiệt hại hơn 10 tỷ đồng **[Nguồn]**;
- đối mặt với các đường dây chuyển tiền chui và lừa đảo chuyển tiền trên Facebook, nhất là trước Tết **[Nguồn]**.

**Giải pháp.** N.E.D gồm ba tính năng dựa trên nền tảng đã code (đăng nhập Google, ví nhúng, định danh @username/SĐT on-chain, gửi USDC):

1. **Hụi minh bạch:** góp hụi bằng USDC. Tiền nằm trong smart contract, ai đã đóng hay chưa đều hiển thị on-chain, và thành viên phải đặt cọc để hạn chế bỏ hụi.
2. **Gửi về nhà:** gửi tiền hốt hụi hoặc tiền lương về cho gia đình. Người nhận ở Việt Nam nhận VND qua đối tác được cấp phép.
3. **Quỹ về nước:** mục tiêu tiết kiệm bằng USD, theo dõi cả nợ môi giới.

**Vì sao khác biệt.** Wise, JRF hay SBI Remit rẻ nhưng không có hụi. Phantom có USDC nhưng không làm cho người Việt. MoneyFellows số hoá hụi rất thành công ở Ai Cập (8,5 triệu người dùng) nhưng không có ở châu Á **[Nguồn]**. Chưa tìm thấy sản phẩm nào kết hợp hụi on-chain với chuyển tiền về Việt Nam cho người lao động **[Chưa xác minh: không tìm thấy không có nghĩa là không tồn tại]**.

**Doanh thu.** Phí dịch vụ hụi (giả định 1%) cộng phí gửi về nhà (giả định 1,5%). Ở kịch bản cơ sở, đạt 2% lao động Việt tại Nhật (12.118 người) cho khoảng **1,6 triệu USD doanh thu** và **616.000 USD lợi nhuận gộp mỗi năm** **[Giả định, mục 10]**.

**Rủi ro lớn nhất:**

- Pháp lý của hụi on-chain tại Nhật chưa rõ, có thể liên quan đến luật chuyển tiền và Luật Kinh doanh Mujin (無尽業法) **[Chưa xác minh]**.
- Chưa có dữ liệu về mức độ phổ biến của hụi trong cộng đồng người Việt ở nước ngoài.

---

## 2. Thay đổi so với v1

| Hạng mục | v1 (file `05-…`, 01/10/2026) | v2 (bản này) |
| --- | --- | --- |
| Điểm khác biệt | "Gửi tiền về nhà bằng SĐT" | **"Hụi không thể bị giật"** cộng với gửi về nhà |
| Khách hàng đầu tiên | Người Việt ở nước ngoài nói chung | **Lao động Việt tại Nhật** (thực tập sinh, kỹ năng đặc định) |
| Giả định phí thị trường | 5–7% qua SWIFT | **Đính chính:** Nhật → VN 3,70% / 2,05%; Hàn → VN 5,15%; Mỹ → VN 5,27% (World Bank, quý 3/2025) |
| Doanh thu chính | Phí chuyển tiền | Phí dịch vụ hụi cộng phí gửi về nhà |
| Bản Việt Nam | Nhận VND qua đối tác, đầu tư mô phỏng | Thêm **sổ hụi điện tử** (NĐ 19/2019), bán công nghệ (B2B), sandbox Đà Nẵng, NDAChain |
| T.E.D (AI) | Lập kế hoạch tiền gửi về | **Hạ ưu tiên**, vì thể lệ không có giải Best AI Product |
| Hackathon | Chưa rõ hạng mục | Best Product & Business và Best Technical Build; Anchor program cho hụi là điểm kỹ thuật chính |

---

## 3. Dữ liệu thị trường

### 3.1. Người Việt ở nước ngoài

| Quốc gia / nhóm | Số liệu | Ghi chú |
| --- | --- | --- |
| Tổng | Hơn 6 triệu người Việt ở nước ngoài tại hơn 130 quốc gia; gần 900.000 lao động hợp đồng (cuối 2025) | **[Nguồn]** VietnamNet 09/2025; Người Lao Động 06/2026 |
| **Nhật, cư dân** | 681.100 người, đông thứ 2 trong số người nước ngoài (cuối 2025) | **[Nguồn]** Cục Xuất nhập cảnh Nhật |
| **Nhật, người lao động** | **605.906 người, đông nhất, chiếm 23,6% trong 2,57 triệu lao động nước ngoài** (10/2025) | **[Nguồn]** Bộ Y tế, Lao động và Phúc lợi Nhật, qua nippon.com |
| Nhật, kỹ năng đặc định | Người Việt chiếm 44,2% trong 336.196 người (06/2025) | **[Nguồn]** Japan Times |
| Nhật, thực tập sinh kỹ năng | Người Việt chiếm 40,6% (10/2024) | **[Nguồn]** OTIT, qua YOLO Japan |
| Hàn Quốc | Khoảng 270.000 người, cộng khoảng 100.000 du học sinh (đông nhất) | **[Nguồn]** Korea Times 12/2025 |
| Đài Loan | Khoảng 294.000 lao động (03/2026) | **[Nguồn thứ cấp]** cần đối chiếu số liệu của Bộ Lao động Đài Loan |
| Mỹ | Khoảng 2,3 triệu người Mỹ gốc Việt | **[Nguồn]** Pew 2025 |
| Úc | 326.630 người sinh tại Việt Nam (06/2025) | **[Nguồn]** ABS |
| Du học sinh | Khoảng 250.000 người | **[Nguồn]** Bộ GD&ĐT, qua VTC News 09/2025 |

### 3.2. Kiều hối

- **Cả nước:** khoảng 16 tỷ USD/năm **[Nguồn]**.
- **TP.HCM, năm 2025:** 10,34 tỷ USD, tăng 8,3%. Theo khu vực gửi: châu Á 48,9%, châu Mỹ 31,9%, châu Âu 8,9%, châu Đại Dương 8,6%. 71,8% đi qua công ty kiều hối **[Nguồn]**.
- **Lao động hợp đồng:** gửi về khoảng 6,5–7 tỷ USD/năm. Riêng Đài Loan dự kiến khoảng 2,8 tỷ USD năm 2025 **[Nguồn]**.

### 3.3. Chi phí gửi tiền (World Bank, quý 3/2025)

| Hành lang | Trung bình | Một số nhà cung cấp |
| --- | --- | --- |
| **Nhật → VN** | **3,70% (200 USD), 2,05% (500 USD)** | JRF khoảng 2,2%, Wise 2,74%, Seven Bank 2,95%, Japan Post Bank khoảng 20% |
| Hàn → VN | 5,15% | Woori Bank 2,01%, MoneyGram 2,91%, IBK/Shinhan 3,08% |
| Mỹ → VN | 5,27% | Wise 1,61%, Ria 2,1%, Western Union 4,3–5,8% |
| Đài Loan → VN | Không có dữ liệu | — |

**[Suy luận]** Người gửi vẫn dùng chuyển tiền chui dù kênh chính thức đã rẻ. Điều này cho thấy họ quan tâm đến sự tiện lợi, giờ giấc và niềm tin, không chỉ giá. Cạnh tranh bằng giá sẽ không thắng.

### 3.4. Nỗi đau cụ thể

| Nỗi đau | Bằng chứng | Nguồn |
| --- | --- | --- |
| Nợ môi giới | 80% thực tập sinh Việt sang Nhật mang nợ, trung bình 674.000 yên; phí trung bình 656.000 yên, cao nhất trong các quốc tịch | **[Nguồn]** Cục Xuất nhập cảnh Nhật, khảo sát 2021–22 |
| Gửi tiền đều đặn | Khoảng 100.000 yên/tháng; đồng yên yếu làm giảm giá trị tiền gửi về | **[Nguồn]** nippon.com 10/2024 |
| Chuyển tiền chui | Hyogo: khoảng 18 triệu yên (2022–24); một đường dây khác khoảng 460 triệu yên (2017–18) | **[Nguồn]** Sun TV, TokyoReporter |
| Lừa đảo chuyển tiền | Nhóm Facebook giả danh chuyển tiền lấy 850.000 yên và 500.000 yên của từng thực tập sinh | **[Nguồn]** Kokoro/VAIJ 01/2022 |
| Giật hụi, bể hụi | Hụi online có thành viên ảo, biên nhận giả; có vụ hơn 10 tỷ đồng | **[Nguồn]** VTV 11/2024 |
| Hụi trong cộng đồng ở nước ngoài | Chưa có số liệu | **[Chưa xác minh]**: phải phỏng vấn (mục 12) |

---

## 4. Định vị và khách hàng mục tiêu

### 4.1. Câu định vị

> **N.E.D — hụi không thể bị giật. Góp hụi, tiết kiệm và gửi tiền về nhà cho người Việt xa quê.**
>
> Bản tiếng Anh cho pitch: *"N.E.D — the savings circle nobody can run away with. Save together, send home, built for Vietnamese workers abroad."*

### 4.2. Người dùng mục tiêu (nhân vật minh hoạ **[Giả định]**)

**Minh, 24 tuổi, thực tập sinh ngành cơ khí ở tỉnh Aichi:**

- Nợ môi giới khoảng 650.000 yên. Mỗi tháng gửi mẹ khoảng 100.000 yên.
- Chơi hụi với 9 người cùng xưởng, mỗi người 30.000 yên/tháng, chủ hụi là anh trưởng nhóm.
- Từng nghe kể về vụ chủ hụi bỏ trốn.

Minh cần ba thứ: hụi không bị giật, gửi về nhà nhanh và rẻ, và biết bao giờ trả hết nợ và có đủ tiền để về nước.

### 4.3. Thứ tự mở rộng

| Giai đoạn | Thị trường | Lý do |
| --- | --- | --- |
| 1 | **Nhật** | Nhóm lao động đông nhất; đã có USDC hợp pháp qua SBI VC Trade (từ 03/2025) **[Nguồn]** |
| 2 | Hàn Quốc | Đông người Việt, nhưng luật stablecoin còn treo, dự kiến không trước 2027 **[Nguồn]** |
| 3 | Đài Loan | Dòng tiền lớn (khoảng 2,8 tỷ USD) nhưng Luật Dịch vụ Tài sản ảo có hiệu lực sớm nhất quý 1/2027, hoạt động không phép có thể bị phạt tù đến 7 năm **[Nguồn]**; rủi ro cao |
| Sau | Mỹ, Úc, châu Âu | Cộng đồng Việt kiều lâu năm; chi phí giấy phép cao |

---

## 5. Sản phẩm

### 5.1. Hụi minh bạch (bản quốc tế)

**Loại hụi khi ra mắt:** chỉ làm **hụi không lãi**, thứ tự hốt cố định hoặc bốc thăm. Không làm hụi đấu (có lãi) để tránh bị coi là cho vay **[Suy luận]**.

**Luồng sử dụng:**

```text
1. Tạo hụi       Chủ hụi chọn: số thành viên (≤ 12), mức góp (USDC/kỳ), kỳ hạn (tháng),
                 cách chọn thứ tự (cố định / bốc thăm), mức cọc.
2. Mời           Mời bằng @username hoặc SĐT (dùng định danh on-chain hiện có).
3. Tham gia      Thành viên đặt cọc (ví dụ bằng 1 kỳ góp) vào vault của hụi.
4. Mỗi kỳ        Thành viên góp USDC vào vault. Ai đã góp đều hiển thị on-chain.
5. Hốt hụi       Hết hạn kỳ: smart contract chuyển cả "bát hụi" cho người hốt kỳ đó.
                 Người hốt chọn: giữ USDC / "Gửi về nhà" / đưa vào "Quỹ về nước".
6. Trễ hạn       Nếu ai không góp, phần cọc của người đó bù vào bát hụi; lịch sử trễ ghi on-chain.
7. Kết thúc      Sau kỳ cuối, ai không vi phạm được hoàn cọc.
```

**Khác biệt so với hụi truyền thống:**

| Rủi ro | Hụi truyền thống | Hụi N.E.D |
| --- | --- | --- |
| Chủ hụi bỏ trốn (giật hụi) | Rủi ro cao nhất | **Không thể**: tiền nằm trong vault do program kiểm soát, chủ hụi không rút được |
| Thành viên ảo, biên nhận giả | Có | Mỗi thành viên là một ví có định danh @username; mọi khoản góp đều có chữ ký giao dịch |
| Thành viên hốt xong rồi bỏ | Rủi ro lớn | **Vẫn còn rủi ro**. Giảm bằng: tiền cọc, lịch sử uy tín on-chain, hụi giữa người quen. MoneyFellows cũng phải bù vị trí trống ở khoảng 7–8% số hụi **[Nguồn]** |
| Tranh cãi ai đã đóng | Thường gặp | Lịch sử công khai, không sửa được |

**[Suy luận]** Smart contract chặn được giật hụi từ chủ hụi, nhưng **không chặn hoàn toàn** việc thành viên hốt sớm rồi bỏ. Pitch phải nói rõ điểm này. Đừng hứa "không rủi ro".

**Thiết kế Anchor program (đề xuất, thêm vào `ned_program`):**

| Account | Seeds | Nội dung |
| --- | --- | --- |
| `Circle` | `[b"circle", creator, circle_id]` | creator, mint USDC, mức góp, số thành viên tối đa, kỳ hạn (giây), thời điểm bắt đầu, kỳ hiện tại, thứ tự hốt, mức cọc, trạng thái |
| Vault | ATA của PDA `Circle` | Giữ USDC góp và cọc |
| `Member` | `[b"member", circle, wallet]` | các kỳ đã góp (bitmap), cọc còn lại, đã hốt chưa, số lần trễ |

| Instruction | Việc làm |
| --- | --- |
| `create_circle` | Tạo hụi và vault |
| `join_circle` | Đặt cọc, tạo `Member` |
| `contribute(round)` | Góp USDC cho kỳ `round` |
| `payout(round)` | Ai cũng gọi được sau hạn kỳ. Chuyển bát hụi cho người hốt; nếu ai thiếu thì trừ cọc người đó |
| `close_circle` | Hoàn cọc, đóng account, hoàn rent |

### 5.2. Gửi về nhà

- Dùng lại `components/SendFlow.tsx` và hệ thống định danh hiện có.
- **Người nhận ở Việt Nam nhận VND vào tài khoản ngân hàng** qua đối tác được Ngân hàng Nhà nước cho phép nhận và chi trả ngoại tệ (NĐ 89/2016, TT 34/2015) **[Suy luận: chưa có đối tác]**.
- **Từ ngữ:** dùng "gửi về nhà", "nhận tiền"; không dùng "thanh toán" (NĐ 52/2024).

### 5.3. Quỹ về nước

- Mục tiêu tiết kiệm bằng USD, ví dụ "Về nước tháng 4/2028 với 8.000 USD", kèm theo dõi khoản nợ môi giới còn lại.
- Đầu tư xStocks chỉ bật ở nước được phép và chỉ khi người dùng tự chọn. Không gợi ý mã cụ thể.

### 5.4. T.E.D (hạ ưu tiên)

- Chỉ còn vai trò trợ lý chia tiền theo quy tắc cố định: gửi về bao nhiêu, góp hụi bao nhiêu, giữ bao nhiêu.
- Không làm trước ngày 10/10 vì thể lệ không có giải Best AI Product.

---

## 6. Cạnh tranh

| Sản phẩm | Hụi | Chuyển về VN | Tập trung người Việt | Minh bạch on-chain | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| JRF, SBI Remit, Wise, Seven Bank | Không | Có, khoảng 2–3% | Một phần | Không | Rẻ, đáng tin; SBI Remit dùng XRP phía sau **[Nguồn]** |
| Chuyển tiền chui, nhóm Facebook | Không | Có | Có | Không | Tiện, nhưng rủi ro pháp lý và lừa đảo |
| Hụi qua nhóm Zalo/Facebook | Có | Không | Có | Không | Dựa hoàn toàn vào niềm tin cá nhân |
| MoneyFellows (Ai Cập) | Có, bằng tiền pháp định | Không | Không | Không | 8,5 triệu người dùng, hơn 60 triệu USD vốn **[Nguồn]** |
| Phantom | Không | Không | Không | — | Phantom Cash, @username, xStocks |
| Bitget Wallet + VietQR | Không | Thanh toán tại VN bằng stablecoin | Một phần | — | Dành cho trader; rủi ro pháp lý tại VN |
| Hanpass + Finger (Hàn) | Không | Thử nghiệm stablecoin (06/2026), chưa nêu hành lang VN | Không | — | **[Nguồn]** |
| "Hụi On-Chain" (demo Solana) | Có | Không | Có | Có | Có vẻ là dự án hackathon; chưa có người dùng **[Nguồn]** |
| **N.E.D v2** | **Có** | **Có** | **Có** | **Có** | Kết hợp cả bốn |

**[Suy luận]** Lợi thế của N.E.D không nằm ở bất kỳ tính năng riêng lẻ nào mà nằm ở **sự kết hợp** cho đúng một cộng đồng. Lợi thế này dễ bị sao chép về kỹ thuật. Muốn giữ được, N.E.D phải đi sâu vào cộng đồng: hội người Việt, nghiệp đoàn, công ty phái cử.

---

## 7. Phiên bản Việt Nam

### 7.1. Nguyên tắc

> Ở Việt Nam, N.E.D **không giữ tiền, không cung cấp dịch vụ tài sản mã hoá, không khuyến nghị đầu tư**. Người dùng trong nước chỉ thấy VND và thông tin.

### 7.2. Các phương án hợp pháp

| Phương án | Cách làm | Căn cứ | Khả thi | Rủi ro |
| --- | --- | --- | --- | --- |
| **A. Sổ hụi điện tử** | Ghi sổ, nhắc lịch, lịch sử đóng hụi; tiền chuyển trực tiếp giữa tài khoản ngân hàng của thành viên (VietQR); N.E.D không giữ tiền | NĐ 19/2019/NĐ-CP, còn hiệu lực: chủ hụi phải là cá nhân từ 18 tuổi (Điều 5–6); có thể thoả thuận hoa hồng chủ hụi (Điều 8); phải báo UBND xã nếu một kỳ từ 100 triệu đồng (Điều 14); lãi tối đa 20%/năm (Điều 21) | Trung bình | Công ty không được làm chủ hụi; không ghép người lạ; chưa có tiền lệ cho app thuần phần mềm **[Chưa xác minh]** |
| **B. Giáo dục tài chính, đầu tư mô phỏng** | Dùng lại Demo mode; nhắm sinh viên; liên kết ra app công ty chứng khoán có phép theo hợp đồng quảng cáo | Tiền lệ cuộc thi đầu tư ảo (KIS, RongViet Invest 2026 với 32 trường đại học); TT 121/2020 Điều 13 | Cao | Không khuyến nghị mã; không mở tài khoản chứng khoán trong app; không quảng bá sàn crypto chưa có phép (NĐ 284/2026 Điều 7(4)) |
| **C. Bán công nghệ (B2B)** | Bán bộ ví nhúng, chuyển theo @username, định danh và **module hụi** cho ngân hàng, ví điện tử, sàn tài sản mã hoá được cấp phép | NQ 05/2025 Điều 15(2)(p): tổ chức được cấp phép được dùng bên thứ ba nhưng vẫn chịu trách nhiệm | Trung bình–cao | Chu kỳ bán hàng dài; cần pháp nhân, kiểm định an ninh, có thể cần ISO 27001 |
| **D. Sandbox Đà Nẵng** | Xin thử nghiệm một trường hợp hẹp | NQ 136/2024/QH15; tiền lệ Basal Pay (QĐ 1181/QĐ-UBND, 08/2025, thử nghiệm 36 tháng, KYC 3 cấp, Travel Rule) | Trung bình | Tuỳ quyết định của thành phố; cần pháp nhân tại Đà Nẵng; yêu cầu AML nặng |
| **E. Định danh qua NDAChain hoặc NDA DID** | Thay hash SĐT on-chain bằng định danh quốc gia | NDAChain ra mắt 07/2025, liên kết VNeID | Trung bình | Chưa có chương trình hỗ trợ nhà phát triển công khai **[Chưa xác minh]** |
| **F. Trung tâm Tài chính Quốc tế** | Chỉ theo dõi | NQ 222/2025/QH15; NĐ 323–330/2025; Đà Nẵng đã cấp 12 chứng nhận thành viên (03/2026) | Thấp | Thử nghiệm hướng tới nhà đầu tư tổ chức; chưa có bộ quy tắc sandbox cho tài sản số |

### 7.3. Một thương hiệu, hai cách thực hiện

| | Quốc tế | Việt Nam |
| --- | --- | --- |
| Hụi | Góp hụi bằng USDC, tiền trong smart contract | Sổ hụi điện tử, tiền chuyển giữa tài khoản ngân hàng (A) |
| Gửi tiền | Gửi về nhà | Nhận VND qua đối tác kiều hối |
| Tài chính cá nhân | Quỹ về nước, xStocks ở nước được phép | Giáo dục tài chính, đầu tư mô phỏng (B) |
| Doanh thu | Phí hụi, phí gửi về nhà, phí swap 0,25% | Gói nâng cao cho người quản lý hụi, phí quảng cáo từ công ty chứng khoán, B2B (C) |

---

## 8. Pháp lý

### 8.1. Việt Nam (tóm tắt; danh mục đầy đủ 42 văn bản nằm trong tài liệu nghiên cứu của nhóm)

| Văn bản | Ảnh hưởng |
| --- | --- |
| NQ 05/2025/NQ-CP; NĐ 284/2026/NĐ-CP | Không swap hay mua bán crypto cho người dùng trong nước |
| NĐ 52/2024/NĐ-CP; Bộ luật Hình sự Điều 206 | Không dùng USDC làm phương tiện thanh toán |
| NĐ 89/2016/NĐ-CP; TT 34/2015/TT-NHNN | Con đường hợp pháp cho người nhận kiều hối |
| NĐ 135/2015/NĐ-CP | Không mở xStocks cho người dùng trong nước |
| Luật Chứng khoán 54/2019, Điều 4(32) | T.E.D không khuyến nghị mã chứng khoán |
| Luật 91/2025/QH15; NĐ 356/2025/NĐ-CP | Dữ liệu cá nhân, chuyển dữ liệu ra nước ngoài, hash SĐT on-chain |
| Luật 116/2025/QH15; NĐ 333/2026/NĐ-CP | Lưu dữ liệu tại Việt Nam, xác thực người dùng |
| Luật 23/2026/QH16 (từ 01/12/2026) | AML cho dịch vụ tài sản mã hoá |
| **NĐ 19/2019/NĐ-CP** | **Quy tắc cho sổ hụi điện tử** |

### 8.2. Nhật Bản (thị trường đầu tiên)

| Vấn đề | Hiện trạng | Mức rủi ro |
| --- | --- | --- |
| USDC cho người dùng phổ thông | SBI VC Trade được phép bán USDC từ 26/03/2025; giới hạn 1 triệu yên mỗi giao dịch; lúc đầu chỉ trên Ethereum **[Nguồn]** | Trung bình: N.E.D chạy trên Solana nên cần cầu nối hoặc nguồn khác |
| Ví tự lưu ký | Có lẽ ít rủi ro nếu không giữ tiền, không xử lý tiền pháp định **[Suy luận]** | Cần luật sư |
| Sàn nước ngoài chưa đăng ký | Cơ quan FSA đã buộc gỡ các app Bybit, KuCoin, Bitget, MEXC, LBank (02/2025) **[Nguồn]** | Cao nếu có tính năng swap hoặc nạp tiền |
| Hụi như một hoạt động kinh doanh | Có thể thuộc **Luật Kinh doanh Mujin (無尽業法)**, luật cũ về hình thức hụi thương mại, hoặc luật chuyển tiền **[Chưa xác minh]** | **Cao, phải hỏi luật sư Nhật đầu tiên** |
| Chuyển tiền xuyên biên giới | Có thể cần đăng ký làm dịch vụ chuyển tiền, hoặc hợp tác với đơn vị đã đăng ký (JRF, SBI Remit…) **[Chưa xác minh]** | Cao |

**[Suy luận] Phương án giảm rủi ro ở Nhật:**

- N.E.D không xử lý tiền yên. Người dùng tự mua USDC ở sàn đã đăng ký rồi chuyển vào ví tự lưu ký.
- Hụi là smart contract do chính các thành viên tạo, N.E.D chỉ cung cấp phần mềm.
- Phần chi trả VND ở Việt Nam do đối tác được cấp phép đảm nhận.

---

## 9. Đánh giá theo tiêu chí hackathon

Theo hướng dẫn của Colosseum và danh sách đoạt giải đã thu thập **[Nguồn]**:

| Tiêu chí | N.E.D v1 | N.E.D v2 |
| --- | --- | --- |
| Nhóm khách hàng hẹp, địa bàn cụ thể | Yếu | **Mạnh**: lao động Việt tại Nhật |
| "Không thể tồn tại nếu không có crypto" | Yếu: ví giống Phantom | **Mạnh**: tiền góp nằm trong smart contract, thay vai trò giữ tiền của chủ hụi |
| Demo có khoảnh khắc "à ra thế" | Swap demo | Bát hụi tự chuyển cho người hốt, chủ hụi không rút được |
| Bằng chứng nói chuyện với người dùng | Chưa có | Kế hoạch phỏng vấn ở mục 12 |
| Mô hình kinh doanh | Phí swap | Phí hụi cộng phí gửi về nhà, có mô hình số liệu |
| Có tiền lệ đoạt giải | — | KinnectFi (cộng đồng Philippines ở nước ngoài, Frontier 2026), Credible (kiều hối Ấn Độ, Cypherpunk 2025) |

---

## 10. Mô hình doanh thu và số liệu

### 10.1. Nguồn doanh thu

| Giai đoạn | Nguồn | Cơ chế | Mức chắc chắn |
| --- | --- | --- | --- |
| 1 | **Phí dịch vụ hụi** | Giả định 1% trên tiền góp, thu khi góp | Mô hình đã có tiền lệ (MoneyFellows); mức phí chưa kiểm chứng |
| 1 | **Phí gửi về nhà** | Giả định 1,5%, thấp hơn mức trung bình 2,05–3,70% của hành lang Nhật → VN | Chi phí thật cần báo giá |
| 2 | Phí swap và xStocks 0,25% | Chỉ ở nước được phép | Kỹ thuật đã có (Demo mode) |
| 2 | Gói nâng cao cho người quản lý hụi (bản Việt Nam) | Thuê bao tháng | **[Giả định]** |
| Song song | Bán công nghệ (B2B) | Cấp phép module hụi và định danh cho ngân hàng, ví điện tử | Chưa kiểm chứng nhu cầu |

### 10.2. Giả định (giá trị trong `unit_economics.py`)

| Biến | Giá trị | Loại |
| --- | --- | --- |
| Lao động Việt tại Nhật | 605.906 | **[Nguồn]** |
| Kiều hối của lao động hợp đồng (mọi nước) | 6,5 tỷ USD/năm | **[Nguồn]**, lấy mức thấp |
| Tỷ giá | 150 JPY/USD | **[Giả định]**, cần cập nhật |
| Số tiền gửi về mỗi tháng | 100.000 yên (khoảng 667 USD) | **[Nguồn: mức điển hình của thực tập sinh]** dùng làm giả định |
| Tỷ lệ người dùng tham gia hụi | 50% | **[Giả định]** |
| Mức góp hụi | 200 USD/tháng | **[Giả định]** |
| Phí gửi về nhà / chi phí | 1,5% / 1,0% | **[Giả định]** |
| Phí hụi / chi phí | 1,0% / 0,1% | **[Giả định]** |
| Mức chấp nhận sau khoảng 3 năm | 0,5% / 2% / 5% | **[Giả định]** |

### 10.3. Kết quả

**Trên mỗi người dùng hoạt động mỗi năm:** gửi về khoảng 8.000 USD, góp hụi khoảng 1.200 USD (sau khi nhân tỷ lệ tham gia). Doanh thu **132 USD**, lợi nhuận gộp **50,80 USD**.

```text
Doanh thu/người/năm   = 8.000 × 1,5% + 1.200 × 1% = 120 + 12 = 132 USD
Lợi nhuận gộp/người   = 8.000 × (1,5% − 1,0%) + 1.200 × (1% − 0,1%) = 40 + 10,8 = 50,8 USD
```

| Kịch bản | Người dùng | Tiền gửi về/năm | So với kiều hối của lao động hợp đồng | Doanh thu/năm | Lợi nhuận gộp/năm |
| --- | --- | --- | --- | --- | --- |
| Thận trọng (0,5%) | 3.030 | 24,2 triệu USD | 0,37% | **400.000 USD** | **154.000 USD** |
| Cơ sở (2%) | 12.118 | 96,9 triệu USD | 1,49% | **1,60 triệu USD** | **616.000 USD** |
| Tham vọng (5%) | 30.295 | 242,4 triệu USD | 3,73% | **4,00 triệu USD** | **1,54 triệu USD** |

> Cột "so với kiều hối" so với dòng tiền của **mọi** lao động hợp đồng ở **mọi** nước, chỉ để kiểm tra độ hợp lý của quy mô. Đây không phải thị phần trong hành lang Nhật.

### 10.4. Độ nhạy: lợi nhuận gộp (USD/năm) ở kịch bản cơ sở

| Phí gửi về nhà / chi phí | 0,7% | 1,0% | 1,3% |
| --- | --- | --- | --- |
| **1,0%** | 421.706 | 130.874 | **−159.958** |
| **1,5%** | 906.426 | 615.594 | 324.762 |
| **2,0%** | 1.391.146 | 1.100.314 | 809.482 |

**Diễn giải:**

- **Chi phí trên mỗi giao dịch quyết định dự án có lãi hay không.** Nếu phí 1% mà chi phí 1,3% thì lỗ. Việc đầu tiên sau cuộc thi là lấy báo giá thật cho từng khoản ở bảng 10.5.
- Phí hụi đóng góp ít (khoảng 12 USD/người/năm) nhưng là **lý do giữ chân người dùng** và là điểm khác biệt.
- Chưa tính **chi phí cố định**: luật sư, giấy phép ở Nhật, nhân sự, kiểm toán smart contract. Đây là ẩn số lớn nhất.

### 10.5. Chi phí trên mỗi giao dịch (khung để điền)

| Khoản | Bên thu | Giá trị | Cách lấy số liệu |
| --- | --- | --- | --- |
| Mua USDC bằng yên | Sàn đã đăng ký (ví dụ SBI VC Trade) | ? | Biểu phí công khai |
| Cầu nối Ethereum → Solana (nếu cần) | Dịch vụ bridge | ? | Đo thực tế |
| Phí mạng Solana | Mạng lưới | ~0,000005 SOL/giao dịch | Đo trên devnet (`../poc-dynamic.md`); cần đo lại trên mainnet |
| Đổi USDC → USD | Đối tác off-ramp | ? | Báo giá |
| Chi trả VND tại Việt Nam | Tổ chức kiều hối hoặc ngân hàng | ? | Đàm phán |
| KYC | Nhà cung cấp KYC | ? | Báo giá |

---

## 11. Lộ trình

### 11.1. Đến UniHackfest (01/10 → 10/10/2026)

Còn 9 ngày, 1 dev. Ước tính giờ là **[Giả định]**.

| Ngày | Dev | Thành viên khác |
| --- | --- | --- |
| 01–02/10 | Thiết kế Anchor `Circle` / `Member`; viết `create_circle`, `join_circle` | Viết lại pitch deck bằng tiếng Anh; đăng tin tìm người phỏng vấn trong nhóm người Việt tại Nhật |
| 03–04/10 | `contribute`, `payout`, `close_circle`; test LiteSVM; deploy devnet | Phỏng vấn 10–15 người (mục 12); Compliance Lead rà soát câu chữ |
| 05–06/10 | Các màn hình: danh sách hụi, tạo hoặc tham gia, chi tiết hụi (ai đã góp), góp (slide xác nhận), kết quả hốt kèm nút "Gửi về nhà" | Tổng hợp kết quả phỏng vấn thành slide |
| 07/10 | Tạo hụi demo 4–5 ví trên devnet; công tắc vùng International/Vietnam | Hỏi ý kiến mentor và luật sư theo danh sách của Compliance Lead |
| 08/10 | Sửa lỗi, kiểm thử toàn luồng | Diễn tập Q&A pháp lý |
| 09/10 | **Đóng băng code**; quay video dự phòng | Compliance sign-off |
| 10/10 | Pitching | |

**Ước tính:** Anchor program khoảng 14–18 giờ, UI khoảng 12–16 giờ, tích hợp và kiểm thử khoảng 6–8 giờ, tổng khoảng 32–42 giờ.

**Thứ tự cắt nếu trễ:**

1. Bỏ `close_circle` và cơ chế trừ cọc, chỉ ghi trễ hạn.
2. Bỏ bốc thăm, chỉ dùng thứ tự cố định.
3. Màn "Quỹ về nước" chỉ làm bản tĩnh.
4. Không làm T.E.D, dApp Browser và Earn.

**Không cắt:** tạo hụi, góp, hốt và hiển thị on-chain ai đã góp.

### 11.2. Sau cuộc thi

| Thời gian | Mục tiêu | Việc chính |
| --- | --- | --- |
| Quý 4/2026 | Kiểm chứng | 30–50 phỏng vấn; luật sư Nhật về hụi (Luật Mujin) và chuyển tiền; luật sư VN về sổ hụi điện tử; báo giá chi phí; quyết định thành lập công ty |
| Quý 1/2027 | Thử nghiệm kín | Kiểm toán smart contract; 5–10 nhóm hụi người quen trên mainnet với mức góp nhỏ; liên hệ đối tác chi trả tại VN |
| Quý 2–3/2027 | Ra mắt Nhật | Gửi về nhà qua đối tác; sổ hụi điện tử ở Việt Nam; thử bán B2B |
| 2027 trở đi | Mở rộng | Hàn Quốc, Đài Loan khi luật rõ; sandbox Đà Nẵng; kết nối sàn được cấp phép |

---

## 12. Kế hoạch kiểm chứng

### 12.1. Phỏng vấn

- **Đối tượng:** 10–15 người trước 08/10, 30–50 người trong quý 4/2026. Gồm lao động Việt tại Nhật, Hàn, Đài Loan và người thân ở Việt Nam.
- **Kênh:** nhóm Facebook/Zalo của người Việt tại Nhật, du học sinh, người quen của nhóm.

**Câu hỏi:**

1. Mỗi tháng bạn gửi về bao nhiêu? Qua kênh nào? Vì sao chọn kênh đó?
2. Hai năm qua bạn có chơi hụi không? Nhóm bao nhiêu người, mỗi kỳ bao nhiêu?
3. Bạn hoặc người quen đã từng bị giật hụi hay bể hụi chưa?
4. Nếu tiền hụi được giữ an toàn, không ai rút được, bạn có chịu trả khoảng 1% không?
5. Bạn có từng dùng USDC hay crypto không? Điều gì làm bạn ngại?
6. Bạn còn nợ môi giới không? Bạn dự định về nước khi nào?

### 12.2. Ngưỡng để tiếp tục (đề xuất **[Giả định]**)

| Chỉ số | Ngưỡng |
| --- | --- |
| Đã chơi hụi trong 2 năm qua | ≥ 40% số người được phỏng vấn |
| Biết hoặc đã gặp vụ giật hụi, bể hụi | ≥ 30% |
| Sẵn sàng trả khoảng 1% cho hụi an toàn | ≥ 30% |
| Ngại dùng crypto | Ghi nhận để thiết kế onboarding; không phải điều kiện dừng |

Nếu không đạt hai chỉ số đầu, quay về hướng "gửi về nhà" của v1 và coi hụi là tính năng phụ.

### 12.3. Chỉ số khi thử nghiệm

- Số hụi đang chạy.
- Tỷ lệ kỳ góp đúng hạn.
- Tỷ lệ thành viên bỏ sau khi hốt.
- Tỷ lệ tiền hốt được chọn "Gửi về nhà".
- Số tiền gửi về mỗi người mỗi tháng.

---

## 13. Pitch tại UniHackfest

- **Hạng mục:** Best Product & Business và Best Technical Build. Bài thi bằng tiếng Anh **[Nguồn: `../05-legal/compliance-lead-tasks.md`]**.
- **Mạch câu chuyện (khoảng 3 phút):**
  1. Minh và 605.906 lao động Việt tại Nhật.
  2. Nợ môi giới, gửi tiền về nhà, hụi và giật hụi.
  3. Demo: tạo hụi, các ví góp, bát hụi tự chuyển, "Gửi về nhà".
  4. Vì sao cần blockchain: chủ hụi không giữ tiền.
  5. Hai phiên bản, hai khung luật.
  6. Mô hình doanh thu và độ nhạy.
  7. Lộ trình và việc cần kiểm chứng.
- **Điểm kỹ thuật cho Best Technical Build:**
  - Anchor program hụi với vault do PDA kiểm soát.
  - Định danh @username/SĐT on-chain đã có.
  - Test bằng LiteSVM.
  - Đăng nhập Google, ví nhúng MPC.
- **Tuân thủ quy định của Compliance Lead:**
  - Không nói "invest now", "no fees", "không rủi ro".
  - Ghi rõ Demo mode và devnet.
  - Nêu các điểm còn thiếu: chưa có KYC, SĐT chưa xác minh OTP, phí đang mô phỏng, chưa có đối tác được cấp phép.

---

## 14. Rủi ro

| Rủi ro | Khả năng | Ảnh hưởng | Giảm thiểu |
| --- | --- | --- | --- |
| Hụi on-chain ở Nhật thuộc luật Mujin hoặc luật chuyển tiền | Trung bình–cao | Không ra mắt được ở Nhật | Hỏi luật sư Nhật đầu tiên; N.E.D chỉ cung cấp phần mềm; cân nhắc thị trường khác |
| Thành viên hốt xong rồi bỏ | Cao | Mất niềm tin | Cọc, lịch sử uy tín on-chain, hụi giữa người quen, giới hạn mức góp |
| Lỗi smart contract | Trung bình | Mất tiền | Kiểm toán trước mainnet; giới hạn mức góp lúc đầu |
| Người dùng ngại crypto | Cao | Khó onboarding | Ẩn chữ "crypto", hiển thị USD; đăng nhập Google |
| Hụi ít phổ biến hơn dự kiến | Chưa rõ | Mất điểm khác biệt | Kiểm chứng ở mục 12; quay về hướng "gửi về nhà" |
| Chi phí giao dịch cao hơn phí thu | Trung bình | Lỗ | Lấy báo giá trước khi định giá (mục 10.4) |
| Đối thủ lớn sao chép | Trung bình | Mất lợi thế | Đi sâu vào cộng đồng và quan hệ đối tác |
| Sổ hụi điện tử ở Việt Nam bị coi là tổ chức hụi | Trung bình | Phải sửa bản Việt Nam | Người dùng là chủ hụi; N.E.D không giữ tiền, không hưởng hoa hồng chủ hụi |

---

## 15. Điểm chưa xác minh và câu hỏi mở

### 15.1. Chưa xác minh

- Mức độ phổ biến của hụi trong cộng đồng người Việt tại Nhật, Hàn, Đài Loan.
- Luật Kinh doanh Mujin (無尽業法) và luật chuyển tiền của Nhật có áp dụng cho hụi on-chain không.
- Ví tự lưu ký có cần giấy phép ở Nhật không, khi app có tính năng swap.
- Có USDC trên Solana tại sàn được phép ở Nhật không, hay phải dùng bridge.
- Tổ chức kiều hối Việt Nam có chấp nhận nguồn tiền đổi từ stablecoin không.
- App sổ hụi thuần phần mềm có hợp lệ theo NĐ 19/2019 không.
- Số lao động Việt tại Đài Loan (đang dùng nguồn thứ cấp).
- Chương trình hỗ trợ nhà phát triển của NDAChain.
- Không tìm thấy sản phẩm hụi on-chain nào cho người Việt ở nước ngoài; điều này cần kiểm tra thêm.

### 15.2. Câu hỏi mở cho nhóm

1. Có giữ lại xStocks và swap trong pitch không, hay chỉ tập trung vào hụi và gửi về nhà?
2. Mức cọc bao nhiêu là hợp lý: 1 kỳ, 2 kỳ hay theo uy tín?
3. Thứ tự hốt: cố định, bốc thăm hay theo uy tín?
4. Ai trong nhóm phụ trách phỏng vấn và liên hệ cộng đồng người Việt tại Nhật?
5. Sau cuộc thi, nhóm có thành lập công ty không? Đặt ở đâu?

---

## 16. Nguồn tham khảo

### Thị trường và người dùng

- Lao động Việt tại Nhật (Bộ Y tế, Lao động và Phúc lợi): https://www.nippon.com/ja/japan-data/h02693/
- Cư dân nước ngoài tại Nhật (Cục Xuất nhập cảnh): https://www.moj.go.jp/isa/publications/press/13_00062.html
- Lao động kỹ năng đặc định: https://www.japantimes.co.jp/news/2025/09/30/japan/japan-skilled-foreign-workers/
- Thực tập sinh (OTIT): https://www.yolo-japan.co.jp/yolo-work/15321
- Người Việt tại Hàn: https://www.koreatimes.co.kr/southkorea/globalcommunity/20251219/vietnam-leads-surge-as-koreas-foreign-resident-population-hits-record-high
- Lao động tại Đài Loan (nguồn thứ cấp): https://taiwan.md/en/society/migrant-workers-in-taiwan/
- Người Mỹ gốc Việt (Pew): https://www.pewresearch.org/race-and-ethnicity/fact-sheet/asian-americans-vietnamese-in-the-u-s/
- Người sinh tại Việt Nam ở Úc (ABS): https://www.abs.gov.au/statistics/people/population/australias-population-country-birth/latest-release
- Hơn 6 triệu người Việt ở nước ngoài, 16 tỷ USD kiều hối: https://vietnamnet.vn/hon-6-trieu-nguoi-viet-o-nuoc-ngoai-gui-ve-16-ty-usd-kieu-hoi-2441569.html
- Gần 900.000 lao động hợp đồng: https://tuoitre.vn/nld/gan-900000-lao-dong-viet-dang-lam-viec-o-nuoc-nao-196260608211624841.htm
- Kiều hối TP.HCM 2025: https://en.vneconomy.vn/remittances-to-hcm-city-top-1034-bln-in-2025.htm
- Lao động gửi về 7 tỷ USD/năm: https://e.vnexpress.net/news/news/vietnamese-workers-abroad-send-7b-home-annually-4958305.html
- Du học sinh: https://vtcnews.vn/gan-250-000-nguoi-viet-dang-hoc-tap-o-nuoc-ngoai-ar966260.html
- Chi phí gửi tiền Nhật → VN (World Bank): https://remittanceprices.worldbank.org/corridor/Japan/Vietnam
- Chi phí gửi tiền Hàn → VN: https://remittanceprices.worldbank.org/corridor/KR/VN
- Chi phí gửi tiền Mỹ → VN: https://remittanceprices.worldbank.org/corridor/United-States/Vietnam
- Nợ môi giới của thực tập sinh: https://www.nippon.com/en/japan-data/h01411/
- Số tiền gửi về, ảnh hưởng của đồng yên yếu: https://www.nippon.com/en/in-depth/d01054/
- Chuyển tiền chui tại Hyogo: https://www.sun-tv.co.jp/suntvnews/news/2024/05/29/78646/
- Đường dây ngân hàng ngầm: https://www.tokyoreporter.com/crime/vietnamese-nationals-accused-of-running-underground-bank/
- Lừa đảo chuyển tiền: https://www.kokoro-vj.org/vi/post_16003
- Rủi ro hụi online (VTV): https://vtv.vn/xa-hoi/rui-ro-tu-nhung-hoi-nhom-choi-hui-ho-tren-mang-xa-hoi-20241117201532831.htm
- Hụi tại Việt Nam (Vietcetera): https://vietcetera.com/onboardy/choi-hui-kieu-tiet-kiem-an-toan-hay-tiem-tang-nguy-hiem

### Đối thủ và tiền lệ

- MoneyFellows: https://techcrunch.com/2025/05/04/moneyfellows-raises-13m-to-take-its-group-savings-model-outside-egypt
- Esusu: https://www.cnbc.com/2025/12/11/esusu-funding-renters-credit-scores.html
- "Hụi On-Chain" (demo): https://hui-mu.vercel.app/
- SBI Remit và Việt Nam: https://www.remit.co.jp/en/kaigaisoukin/information/release20230906/
- Bitget Wallet và VietQR: https://thepaypers.com/crypto-web3-and-cbdc/news/bitget-wallet-rolls-out-national-qr-payment-support-goes-live-in-vietnam
- Hanpass và Finger: https://finance.biggo.com/news/d9348689-f4de-4cc2-a876-a7fb74b378c9
- Kinh tế stablecoin tại Việt Nam (CoinShares): https://coinshares.com/insights/the-node/por-iced-coffee-and-invisible-dollars-inside-vietnams-stablecoin-economy/
- Colosseum Frontier 2026: https://blog.colosseum.com/announcing-the-winners-of-the-solana-frontier-hackathon/
- Colosseum Cypherpunk 2025: https://blog.colosseum.com/announcing-the-winners-of-the-solana-cypherpunk-hackathon/
- Cách thắng hackathon Colosseum: https://blog.colosseum.com/how-to-win-a-colosseum-hackathon/

### Pháp lý quốc tế

- Stablecoin tại Nhật: https://www.curvegrid.com/blog/2026-02-24-japan%E2%80%99s-stablecoin-moment-the-new-licensing-regime-what-came-before-and-what-comes-next
- SBI VC Trade mở USDC: https://cointelegraph.com/news/sbi-vc-trade-usdc-launch-japan-stablecoin-regulation
- Nhật gỡ app sàn chưa đăng ký: https://beincrypto.com/japan-bans-five-crypto-exchanges/
- Luật stablecoin Hàn Quốc: https://blog.chakwon.com/2026/04/17/korea-digital-asset-basic-act-stablecoin-sto-split/
- Luật Dịch vụ Tài sản ảo Đài Loan: https://www.trmlabs.com/resources/blog/unpacking-taiwans-virtual-asset-service-act-what-crypto-and-stablecoin-issuers-need-to-know

### Pháp lý Việt Nam

- NĐ 19/2019/NĐ-CP về họ, hụi, biêu, phường: https://thuvienphapluat.vn/van-ban/Tien-te-Ngan-hang/Nghi-dinh-19-2019-ND-CP-quy-dinh-ve-ho-hui-bieu-phuong-386324.aspx
- NQ 05/2025/NQ-CP: https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-quyet-so-5-2025-nq-cp-ve-trien-khai-thi-diem-thi-truong-tai-san-ma-hoa-tai-viet-nam-119250909184045221.htm
- NĐ 284/2026/NĐ-CP: https://luatvietnam.vn/tin-van-ban-moi/tu-01-9-2026-cung-cap-dich-vu-tai-san-ma-hoa-chua-duoc-cap-phep-bi-phat-den-200-trieu-dong-186-110675-article.html
- NQ 222/2025/QH15 (Trung tâm Tài chính Quốc tế): https://thuvienphapluat.vn/van-ban/Tai-chinh-nha-nuoc/Nghi-quyet-222-2025-QH15-Trung-tam-tai-chinh-quoc-te-tai-Viet-Nam-663581.aspx
- Các nghị định về Trung tâm Tài chính Quốc tế (Baker McKenzie): https://www.bakermckenzie.com/-/media/files/insight/publications/2026/01/vietnam-international-financial-center-opens.pdf
- Trung tâm Tài chính Quốc tế Đà Nẵng cấp 12 chứng nhận: https://dttc.sggp.org.vn/trung-tam-tai-chinh-quoc-te-da-nang-cap-12-chung-nhan-thanh-vien-cho-nha-dau-tu-post132418.html
- NQ 136/2024/QH15 (Đà Nẵng): https://luatvietnam.vn/chinh-sach/nghi-quyet-136-2024-qh15-cua-quoc-hoi-ve-to-chuc-chinh-quyen-do-thi-va-thi-diem-co-che-chinh-sach-dac-thu-phat-trien-thanh-pho-da-nang-360463-d1.html
- Basal Pay, sandbox Đà Nẵng: https://www.lntpartners.com/legal-briefing/the-first-blockchain-payment-solution-approved-for-trial-how-does-da-nangs-international-financial-center-differ-from-the-rest-of-vietnam
- NĐ 353/2025/NĐ-CP (sandbox theo Luật 71/2025): https://luatvietnam.vn/cong-nghiep/nghi-dinh-353-2025-nd-cp-quy-dinh-chi-tiet-luat-cong-nghiep-cong-nghe-so-423495-d1.html
- NDAChain: https://tuoitre.vn/viet-nam-co-nen-tang-blockchain-quoc-gia-xuyen-suot-tu-trung-uong-den-dia-phuong-2025101317482419.htm
- TT 121/2020/TT-BTC: https://thuvienphapluat.vn/van-ban/Doanh-nghiep/Thong-tu-121-2020-TT-BTC-huong-dan-hoat-dong-cua-cong-ty-chung-khoan-453690.aspx
- Cuộc thi RongViet Invest 2026: https://vietstock.vn/2026/09/rongviet-invest-2026-lan-toa-suc-nong-den-sinh-vien-32-truong-dai-hoc-830-1494966.htm
- Các văn bản khác (NĐ 52/2024, NĐ 89/2016, NĐ 135/2015, Luật 91/2025, Luật 116/2025, Luật 23/2026…): xem mục 11 của [`../05-vietnam-strategy-and-revenue-model.md`](../05-vietnam-strategy-and-revenue-model.md)

---

*Đây là tài liệu nghiên cứu, không phải tư vấn pháp lý hay tài chính. Mọi con số có nhãn [Giả định] cần được kiểm chứng trước khi dùng để ra quyết định.*
