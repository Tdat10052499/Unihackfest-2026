# N.E.D — Phân tích thị trường và kinh doanh (2.1–2.5)

**Phiên bản:** bản nháp 1 · 06/10/2026
**Cơ sở sản phẩm:** repo `Tdat10052499/Unihackfest-2026`, nhánh `main` @ `3a1564a` (04/10/2026)
**Cơ sở bằng chứng:** `NED_Evidence_Base.md` (đã đóng băng). Tài liệu này không dùng thêm nguồn nào mới.

> **Cập nhật 07/10/2026 (Compliance Lead, kiểm tra tại `main` 343faa6).** Đã mở lại nguồn và sửa trực tiếp các dòng sau, mỗi dòng có ghi "(07/10)":
> - Sản phẩm nay là **program v1.4** (07/10, trên devnet): 29 instruction, 55 mã lỗi, 26 event, 67 test. Có thêm **N.E.D Jobs** (D25, sửa bởi D29): doanh nghiệp khóa ngân sách lúc đăng việc hoặc ngay lúc chọn người, luôn trước khi freelancer accept. **Yêu cầu chỉnh sửa (request changes) đã có trên Workspace** (D27), không còn bị ẩn. Từ "tự giải phóng / auto-release" không dùng nữa (D26): sau hạn duyệt, **bất kỳ ai** bấm **Release now**.
> - **Phí Contra bị ghi ngược:** freelancer trả 15 USD (dự án dưới 500 USD) hoặc 29 USD mỗi dự án ở gói miễn phí, 0 ở gói Pro; khách trả phí xử lý (ACH 0,8%, tối đa 5 USD; thẻ 2,9% + 0,30 USD) ([Contra](https://help.contra.com/en/articles/9322934)).
> - Nghị định 284/2026: mức 180–200 triệu là cho **tổ chức**; cá nhân bằng một nửa. Upwork: phí khách 3–10% (gói Basic 3–5%) + phí khởi tạo hợp đồng. Payoneer: 71% (không phải 71–75%). Escrow.com: dưới 5.000 USD người mua có thể trả bằng PayPal hoặc thẻ.
> - Không dùng cụm "đối tác chi trả có giấy phép" và "bảo đảm thanh toán" cho N.E.D (bảng từ ngữ, `product-spec.md` mục 6): nói "đối tác chi trả ở nước ngoài (ứng viên Due, Nium; mô phỏng trong demo)" và "khóa tiền trước".
> - Danh sách đầy đủ: [`../05-legal/pre-pitch-check-7oct.md`](../05-legal/pre-pitch-check-7oct.md).

> **Về tài liệu này.** Đây là bản phân tích kinh doanh nội bộ, viết theo khung 2.1–2.5. Khung này lấy từ một mẫu của cuộc thi khác (Ra Khơi 2026), không phải yêu cầu nộp bài của UniHackFest. Theo rubric BTC gửi cho team, vòng final UniHackFest chấm bốn tiêu chí kỹ thuật (độ khó kỹ thuật; kiến trúc và chất lượng smart contract; cách dùng Solana; bằng chứng xây dựng, tài liệu và khả năng tái lập). Phần thị trường và kinh doanh không phải tiêu chí chấm điểm, nhưng vẫn cần thiết để trả lời giám khảo, để hiểu sản phẩm đang đứng ở đâu, và để định hướng sau cuộc thi.
>
> **Cách đọc các khẳng định.** Tài liệu tách rõ ba loại:
> - **Sự thật thị trường**: điều mà nguồn bên ngoài cho thấy.
> - **Sự thật sản phẩm**: điều N.E.D thực sự làm được hôm nay, kiểm chứng từ code.
> - **Giả thuyết kinh doanh**: điều team tin là có thể đúng nhưng chưa được kiểm chứng.
>
> Mã trong ngoặc vuông, ví dụ [P11] hay [C9], trỏ tới mục tương ứng trong bảng nguồn ở cuối tài liệu.

---

## BỨC TRANH TỔNG THỂ VỀ N.E.D

**N.E.D đang khám phá vấn đề gì?** Khi một freelancer (người làm việc tự do, nhận dự án theo từng đầu việc) làm cho một khách hàng mà họ chưa từng gặp, hai bên đều phải đặt niềm tin vào nhau. Freelancer lo rằng làm xong sẽ bị trả chậm hoặc không được trả. Khách hàng lo rằng trả tiền trước thì không nhận được sản phẩm. Các sàn freelance lớn như Upwork hay Fiverr giải quyết nỗi lo này bằng cách giữ tiền của khách hàng trước khi công việc bắt đầu, rồi mới trả cho freelancer. Đổi lại, sàn thu phí khá cao và ràng buộc hai bên phải làm việc trên nền tảng của họ. Khi hai bên làm việc trực tiếp với nhau ngoài sàn, lớp bảo vệ này biến mất.

**N.E.D là gì?** Hiện tại N.E.D là một sản phẩm thử nghiệm (prototype) mang tên **Milestone Lock**. Nó cho phép khách hàng **khóa trước** số tiền của từng giai đoạn công việc (milestone) vào một "két" do phần mềm quản lý, trước khi freelancer bắt đầu làm. Két này là một smart contract (chương trình chạy trên blockchain) trên mạng Solana. Tiền dùng là USDC, một đồng tiền số có giá trị neo 1:1 với đô la Mỹ. Tiền trong két chỉ được giải phóng theo luật đã cài sẵn:

- khách hàng duyệt bài thì tiền về freelancer;
- khách hàng im lặng quá hạn duyệt thì **bất kỳ ai** cũng có thể bấm giải phóng tiền cho freelancer;
- freelancer không nộp kịp hạn thì **bất kỳ ai** cũng có thể bấm hoàn tiền cho khách hàng.

Với freelancer sống ở Việt Nam, sản phẩm được thiết kế để họ nhận tiền đồng qua ngân hàng thông qua một đối tác chi trả ở nước ngoài (ứng viên: Due, Nium) (07/10), thay vì nhận đồng tiền số. Phần này **hiện đang được mô phỏng**.

**Sản phẩm đang ở trạng thái nào?** Mọi thứ chạy trên **devnet**, tức mạng thử nghiệm của Solana, dùng tiền thử không có giá trị thật. Smart contract (v1.3) có 27 lệnh (instruction) (07/10), chưa được kiểm toán bảo mật (audit). Có hai giao diện web: một bản cho điện thoại và một bản cho máy tính (Workspace). Ngày 04/10/2026, team đã chạy trọn vòng hợp đồng (tạo → chấp nhận → khóa → nộp → duyệt → giải phóng → đóng) trên bản đã triển khai, hai lượt đều đạt. Trong mỗi lượt, một vai do người thật thao tác trên giao diện, vai còn lại chạy bằng script, vì team chỉ có một tài khoản Google. Có ba điều sản phẩm **chưa có**:

- chưa có đối tác chi trả tiền đồng thật;
- chưa thu phí;
- chưa có trọng tài trung lập khi hai bên tranh chấp.

**Bằng chứng kinh doanh nói gì?** Có bằng chứng rằng freelancer ở nhiều thị trường (Mỹ, Anh) gặp tình trạng bị trả chậm hoặc không được trả. Có bằng chứng rằng các sàn freelance bảo vệ thanh toán bằng cách giữ tiền trước. Nhưng khi thu hẹp vào đúng nhóm mà N.E.D nhắm tới, tức **freelancer Việt Nam làm trực tiếp cho khách nước ngoài**, bằng chứng trở nên rất mỏng:

- Việt Nam chưa có số liệu chính thức về quy mô nhóm này.
- Nguồn định lượng duy nhất về việc freelancer Việt Nam bị quỵt tiền là một khảo sát năm 2017.
- Nhiều tính năng của N.E.D đã có ở các sản phẩm khác, kể cả một sản phẩm đang chạy trên Solana mainnet.

**Giả định lớn nhất chưa được kiểm chứng.** Mô hình của N.E.D chỉ hoạt động nếu **khách hàng tự nguyện khóa trước toàn bộ tiền milestone, bằng USDC, khi không có sàn nào bắt buộc họ**. Bằng chứng hiện có cho thấy khách hàng làm việc này khi sàn bắt buộc. Ngoài sàn, thông lệ phổ biến là làm xong rồi mới xuất hóa đơn và trả sau. Ngay cả trong cộng đồng crypto, nơi mọi người đã quen dùng USDC, việc trả tiền sau khi nhận sản phẩm vẫn phổ biến hơn việc khóa tiền trước.

Vì vậy, cách mô tả trung thực nhất về N.E.D hôm nay là:

> **Một vấn đề có thật đã được ghi nhận ở cấp độ chung, cộng với một giải pháp kỹ thuật đã chạy được trên mạng thử nghiệm. Nhu cầu đối với chính giải pháp này, và với nhóm khách hàng cụ thể này, chưa được chứng minh.**

---
## 2.1 Thị trường và khách hàng mục tiêu

### 2.1.1 Bối cảnh: làm việc tự do và câu hỏi "ai trả tiền trước?"

Mọi giao dịch dịch vụ giữa hai bên chưa quen nhau đều có một câu hỏi cốt lõi: **ai chịu rủi ro trước?**

- Nếu freelancer làm trước rồi mới được trả, họ chịu rủi ro bị trả chậm hoặc bị "bùng" tiền.
- Nếu khách hàng trả trước toàn bộ, khách chịu rủi ro không nhận được sản phẩm như cam kết.

Có ba cách phổ biến để chia rủi ro này:

1. **Làm việc qua sàn freelance** (Upwork, Fiverr…). Sàn yêu cầu khách hàng nạp tiền trước cho từng milestone. Sàn giữ tiền, và chỉ trả cho freelancer khi khách hàng duyệt hoặc khi hết thời gian duyệt. Khi có tranh chấp, sàn đứng ra hòa giải hoặc chuyển sang trọng tài [C1, C3].
2. **Làm việc trực tiếp và tự thỏa thuận.** Phổ biến nhất là freelancer xin đặt cọc 30–50%, chia thanh toán theo giai đoạn, hoặc giữ file gốc cho đến khi được trả đủ [P21].
3. **Dùng dịch vụ giữ tiền trung gian độc lập (escrow)**, ví dụ Escrow.com: một bên thứ ba giữ tiền và giải phóng khi điều kiện được đáp ứng [C7].

N.E.D đặt mình vào khoảng trống giữa cách 1 và cách 2. Ý tưởng là mang cơ chế "khóa tiền trước, giải phóng theo luật" của sàn ra ngoài sàn, nhưng không cần một công ty đứng giữa giữ tiền.

### 2.1.2 Vấn đề có thật đến mức nào?

**Ở cấp độ chung, có bằng chứng rằng vấn đề tồn tại.** Ở những thị trường có dữ liệu tốt, trả chậm và không trả là chuyện lặp đi lặp lại, không phải trường hợp cá biệt:

- **New York (Mỹ).** Trong 5 năm (2019–2023), cơ quan quản lý nhận 2.184 khiếu nại của freelancer về hành vi thanh toán trái luật. Trong khảo sát 263 người đã khiếu nại, 49% cho biết cuối cùng không được trả đồng nào [P11]. Một khảo sát khác năm 2019 với 1.728 freelancer ở New York ghi nhận 74% từng bị trả chậm hoặc không được trả [P12].
- **Anh.** Theo hiệp hội người lao động tự do IPSE, 35% thành viên bị trả chậm trong 12 tháng gần nhất, và 31% từng hoàn thành công việc mà không được trả. Nguồn này không công bố cỡ mẫu [P8].
- **Dữ liệu hóa đơn của Bonsai** (một nền tảng quản lý hóa đơn cho freelancer): khoảng 29% hóa đơn bị trả trễ. Nhưng phần lớn chỉ trễ ít: khoảng 90% được thanh toán trong vòng một tháng sau hạn [P10].

**Cũng có bằng chứng làm vấn đề "nhẹ" đi.** Khảo sát của Tổ chức Lao động Quốc tế (ILO) cho thấy mối lo lớn nhất của người làm việc online là **thiếu việc và thu nhập thấp**, chứ không phải bị quỵt tiền [P20]. Dữ liệu của Bonsai cũng cho thấy phần lớn trường hợp "trả chậm" là vấn đề dòng tiền ngắn hạn, không phải mất trắng.

**Vì sao làm ngoài sàn lại quan trọng?** Lớp bảo vệ của sàn chỉ tồn tại *bên trong* sàn:

- Upwork chỉ bảo vệ những giờ làm có theo dõi và những milestone đã được nạp tiền.
- Để đưa một khách hàng quen ra làm việc ngoài sàn, Upwork thu phí chuyển đổi 13,5% thu nhập dự kiến của 12 tháng, tối thiểu 1.000 USD [C1, P15].
- PayPal (kênh nhận tiền phổ biến khi làm trực tiếp) chỉ bảo vệ người bán dịch vụ trước khiếu nại kiểu "không nhận được hàng" khi có bằng chứng đã giao, và chính sách khác nhau theo quốc gia [P18] (07/10).
- Luật chống trả chậm của Anh hay New York thực tế không áp dụng được cho một freelancer Việt Nam có khách ở nước ngoài. Ví dụ, luật mới của Anh miễn trừ giao dịch xuất nhập khẩu [P19].

Tóm lại: **làm ngoài sàn thì rẻ hơn và tự do hơn, nhưng gần như không có lưới an toàn.**

### 2.1.3 Riêng ở Việt Nam, chúng ta biết gì?

Khi chuyển sang Việt Nam, bằng chứng mỏng đi rõ rệt:

- **Không có số liệu chính thức** về số freelancer Việt Nam làm cho khách nước ngoài. ILO và Tổng cục Thống kê đã thử khảo sát việc làm qua nền tảng số năm 2023, nhưng mẫu quá nhỏ nên không công bố được con số [P2, P3]. Báo cáo của Ngân hàng Thế giới về lao động online (2023) cũng không có ước tính riêng cho Việt Nam [S2].
- Con số thường được trích dẫn, **"68% freelancer Việt Nam từng không được trả"**, đến từ một khảo sát online của PayPal vào **tháng 10/2017**:
  - người trả lời gồm cả "người đang cân nhắc làm freelance";
  - không công bố cỡ mẫu riêng cho Việt Nam;
  - không tách khách trong nước với khách nước ngoài [P1].

  Đây là tín hiệu lịch sử, không phải số liệu hiện tại.
- Báo chí Việt Nam có nhiều câu chuyện freelancer "bị bùng tiền", nhưng phần lớn liên quan đến **khách trong nước**, và không có số liệu tần suất [P21].
- Các con số như "2 triệu freelancer" hay "500.000 thành viên nhóm Facebook" đến từ doanh nghiệp có lợi ích thương mại, hoặc chỉ là số người có thể tiếp cận, không phải số người thật đang làm freelance [P5; con số 500.000 thành viên là của Thanh Niên, 07/10].

Về mặt **kênh nhận tiền**, freelancer Việt Nam gặp một số bất tiện:

- PayPal thu phí 4,4% cộng phí cố định, chênh lệch đổi tiền khoảng 4% [S10].
- Người cư trú tại Việt Nam không được giữ số dư trên Wise [S11].

Nhưng mức độ bất tiện này **ở khoảng giữa trong khu vực**. Upwork chuyển tiền về ngân hàng Việt Nam với phí 0,99 USD, và có ngân hàng miễn phí nhận chuyển khoản quốc tế cho cá nhân [S12]. Trong khi đó, freelancer ở Bangladesh hay Pakistan còn không dùng được PayPal [S15]. Quan trọng hơn, đây là vấn đề **phí và kênh chuyển tiền**, khác với vấn đề **niềm tin: tiền đã được khóa trước khi bắt đầu làm** mà Milestone Lock giải quyết (07/10).

Có một tín hiệu đáng chú ý: theo báo cáo của Deel (nền tảng trả lương quốc tế) năm 2026, Việt Nam đứng **thứ 5 thế giới** trong xếp hạng mức độ dùng stablecoin của người làm hợp đồng (contractor); báo cáo chỉ đưa thứ hạng, không đưa tỷ lệ [S4] (07/10). Đây là dữ liệu của chính Deel. Nó cho thấy contractor Việt Nam có tồn tại trên các nền tảng quốc tế và có thiện cảm với tiền số, nhưng không cho biết số lượng.

### 2.1.4 Khách hàng mục tiêu: giả thuyết ban đầu và những gì còn đứng được

Milestone Lock là sản phẩm **hai phía**. Nó chỉ hoạt động khi **cả** freelancer **và** khách hàng cùng tham gia.

**Giả thuyết ban đầu của team** [08-research, D10]:
- *Phía nhận tiền:* freelancer Việt Nam (khoảng 22–35 tuổi; thiết kế, nội dung, lập trình, dịch thuật) làm trực tiếp cho khách nước ngoài.
- *Phía trả tiền:* startup, agency, team Web3 ở nước ngoài thuê freelancer Việt Nam trực tiếp.

Để hiểu nhóm nào phù hợp nhất, cần tách "freelancer Việt Nam" thành các nhóm nhỏ hơn:

| Nhóm | Có hợp với Milestone Lock không? | Lý do |
|---|---|---|
| Freelancer làm chủ yếu qua sàn | Không | Sàn đã có cơ chế giữ tiền và chuyển tiền về Việt Nam |
| Freelancer có khách nước ngoài trực tiếp, làm theo dự án | **Có, về lý thuyết** | Đây là nhóm không có lưới an toàn. Quy mô chưa đo được |
| Người làm hợp đồng dài hạn cho công ty nước ngoài | Ít | Trả lương theo kỳ, không theo milestone. Các nền tảng trả lương (Deel…) đã phục vụ nhóm này |
| Agency/studio nhỏ phục vụ khách nước ngoài | Ít | Hợp đồng doanh nghiệp, chuyển khoản ngân hàng, giá trị thường vượt mức trần 1.000 USDC hiện tại |

**Phía khách hàng là nơi giả thuyết yếu nhất.** Ba điểm sau đều làm giả thuyết này yếu đi:

- **Ngoài sàn, khách hàng không có thói quen trả trước.** Thông lệ phổ biến là làm xong rồi xuất hóa đơn. Ví dụ, doanh nghiệp nhỏ ở Mỹ mất trung bình 29,3 ngày mới được thanh toán [S16]. Khách hàng chịu nạp tiền trước khi sàn bắt buộc [S17]. Nhưng nghiên cứu không tìm thấy bằng chứng công khai nào cho thấy khách hàng **tự nguyện** làm vậy ở quy mô đáng kể khi làm việc ngoài sàn. Dịch vụ escrow lớn nhất, Escrow.com, chủ yếu xử lý mua bán tên miền và thiết bị điện tử. Tỷ trọng dịch vụ và freelance không được công bố [G1–G3].
- **Khách hàng phổ thông chưa dùng USDC.** Chỉ khoảng 9% doanh nghiệp trong một khảo sát năm 2025 có dùng stablecoin. Rào cản lớn nhất là pháp lý (73%) và kế toán/thuế (38%) [S19]. Ngay cả Deel, nơi trả lương bằng stablecoin, cũng nhận tiền từ doanh nghiệp bằng tiền pháp định rồi mới chuyển đổi [S21].
- **Thu hẹp sang khách hàng "crypto-native" không giải quyết được vấn đề.** Đây là các team Web3 đã quen dùng USDC. Nhóm này không gặp rào cản về USDC, nhưng thực tế họ thường **trả sau khi nhận sản phẩm**, không khóa tiền trước:
  - Dework thanh toán theo lô sau khi xong việc.
  - Request Finance xử lý hơn 1 tỷ USD theo mô hình hóa đơn rồi trả.
  - Công cụ escrow của Superteam chỉ là tùy chọn, dùng để "chứng minh có tiền".
  - Các escrow on-chain như Kleros hay Smart Invoice có rất ít giao dịch công khai [G7, G8, G12, G14].

### 2.1.5 Quy mô thị trường: vì sao chưa thể tính TAM/SAM/SOM

TAM, SAM, SOM là ba lớp quy mô thị trường: toàn bộ, phần có thể phục vụ, và phần có thể giành được. Tính chúng một cách nghiêm túc cần số liệu ở từng tầng. Bảng dưới cho thấy số liệu mất đi từ đâu:

| Tầng | Con số | Nguồn / độ tin cậy |
|---|---|---|
| Lao động có việc làm ở Việt Nam (2023) | 51,29 triệu | Tổng cục Thống kê [S1], cao |
| Lao động tự làm (own-account) | 17,11 triệu (33,4%) | [S1], cao. *Không phải số freelancer* |
| Freelancer (mọi loại) | **Chưa biết** | Không có thống kê chính thức |
| Freelancer làm online / dịch vụ số | **Chưa biết** | Ngân hàng Thế giới không công bố số cho Việt Nam [S2] |
| … có khách nước ngoài | **Chưa biết** | — |
| … làm trực tiếp, ngoài sàn | **Chưa biết** | Số tham chiếu toàn cầu của Payoneer (2022): 71% tìm việc chủ yếu qua sàn, không áp được cho Việt Nam [S8] |
| … theo dự án/milestone | **Chưa biết** | — |
| … gặp vấn đề bảo đảm thanh toán đáng kể | **Chưa biết** | Bằng chứng riêng cho Việt Nam yếu [P1] |
| … có khách hàng chịu khóa trước bằng USDC | **Chưa biết**, nhiều khả năng nhỏ | [S19, G1–G14] |

Để tham khảo bối cảnh: năm 2024 có khoảng 1.900 doanh nghiệp công nghệ số Việt Nam có doanh thu từ nước ngoài, tổng cộng khoảng 11,5 tỷ USD [S7]. Đây là doanh thu của **doanh nghiệp**, tập trung ở các công ty lớn. Không thể dùng con số này làm quy mô thị trường freelancer.

Từ tầng thứ ba trở đi, mọi con số điền vào đều là phỏng đoán. Vì vậy tài liệu này **không đưa ra TAM/SAM/SOM**.

### 2.1.6 Cách xác định khách hàng mục tiêu có thể bảo vệ được hiện nay

Với bằng chứng hiện có, cách mô tả trung thực nhất là:

> **Vấn đề:** rủi ro bị trả chậm hoặc không được trả khi làm dự án trực tiếp, ngoài sàn. Rủi ro này đã được ghi nhận ở nhiều thị trường.
> **Nhóm người dùng giả định:** freelancer làm dự án trực tiếp với khách hàng ở nước khác, trong đó có freelancer Việt Nam.
> **Điều chưa được kiểm chứng:** quy mô nhóm này tại Việt Nam; mức độ nghiêm trọng của vấn đề với họ; và việc khách hàng có chịu khóa tiền trước bằng USDC hay không.

Thị trường trong tương lai: theo thiết kế, freelancer ở ngoài Việt Nam nhận thẳng USDC vào ví của mình. Vì vậy về kỹ thuật, sản phẩm không bị giới hạn ở Việt Nam. Tuy nhiên, chưa có bằng chứng nào cho thấy nhu cầu ở các thị trường đó. Đây vẫn chỉ là khả năng kỹ thuật, chưa phải thị trường đã xác định.

> **Kết luận của phần này**
> Vấn đề "làm xong không chắc được trả" là có thật ở cấp độ chung, và lớp bảo vệ hiện có gắn liền với việc chấp nhận phí cao của các sàn. Nhưng nhóm khách hàng cụ thể của N.E.D, tức freelancer Việt Nam làm trực tiếp cho khách nước ngoài, chưa được đo lường. Mắt xích yếu nhất nằm ở phía khách hàng: chưa có bằng chứng họ sẵn sàng khóa trước tiền bằng USDC. Vì vậy N.E.D nên được hiểu là **một giả thuyết sản phẩm đặt trên một vấn đề có thật**, chưa phải một thị trường đã được xác thực.

---
## 2.2 Đối thủ cạnh tranh, lợi thế và rào cản

Trước khi so sánh với đối thủ, cần hiểu N.E.D vận hành ra sao hôm nay. Mọi so sánh bên dưới đều dựa trên **sản phẩm hiện tại**, không dựa trên kế hoạch.

### 2.2.1 N.E.D vận hành thế nào (sự thật sản phẩm)

**Một hợp đồng trên N.E.D đi qua các bước sau:**

1. **Khách hàng tạo hợp đồng.** Khách nhập tên người dùng (@username) của freelancer, chia công việc thành tối đa 5 milestone, và đặt cho mỗi milestone số tiền, hạn nộp, hạn duyệt. Phần mô tả công việc (brief) được **mã hóa**. Trên blockchain chỉ lưu "dấu vân tay" (hash) của brief. Nhờ đó hai bên có bằng chứng về điều đã thỏa thuận mà nội dung không bị công khai.
2. **Freelancer chấp nhận và chọn nơi nhận tiền.** Có hai lựa chọn: ví của chính mình, hoặc "nhận VND qua đối tác chi trả". Lựa chọn này được ghi lên blockchain và **không thể đổi** sau đó. Như vậy khách hàng không thể đổi người nhận giữa chừng.
3. **Khách hàng khóa tiền.** Toàn bộ số USDC của hợp đồng chuyển vào một "két" (vault). Két này không thuộc về khách, cũng không thuộc về freelancer. Nó do chính chương trình quản lý thông qua một địa chỉ đặc biệt trên Solana, gọi là Program Derived Address (PDA). Freelancer nhìn thấy trạng thái "Đã khóa" trước khi bắt tay vào làm.
4. **Freelancer nộp bài trước hạn.** Bài nộp gồm đường link, dấu vân tay của file và ghi chú. Dấu vân tay được lưu lên chain làm bằng chứng đã nộp đúng hạn.
5. **Giải phóng tiền**, theo một trong các trường hợp:
   - khách hàng duyệt thì tiền của milestone đó về nơi freelancer đã chọn;
   - khách hàng im lặng quá hạn duyệt và không mở tranh chấp thì **bất kỳ ai** cũng có thể bấm giải phóng;
   - freelancer không nộp kịp hạn thì **bất kỳ ai** cũng có thể bấm hoàn tiền cho khách.
6. **Đóng hợp đồng**, phí thuê bộ nhớ trên chain (rent) được hoàn lại.

**Tiền di chuyển như thế nào:**

> Ví của khách hàng → (khóa) → két do chương trình quản lý → (duyệt, hoặc hết hạn duyệt mà không bị tranh chấp) → ví freelancer **hoặc** ví của đối tác chi trả nằm trong danh sách cho phép
> Két → (freelancer trễ hạn, nhượng bộ, hoặc hai bên thỏa thuận chia) → trả lại khách hàng

**Một số điểm cần nói rõ về sản phẩm hiện tại:**

| Điểm | Sự thật hôm nay |
|---|---|
| Mạng | Chỉ chạy **devnet** (mạng thử nghiệm), dùng USDC thử của Circle |
| Đăng nhập | Bằng tài khoản Google. Ví được tạo tự động bằng công nghệ MPC của Dynamic, người dùng không cần ghi nhớ cụm từ khôi phục (seed phrase) |
| Phí N.E.D | **Không có** (chưa có dòng code thu phí nào) |
| Giới hạn | Tối đa 1.000 USDC mỗi hợp đồng, tối đa 5 milestone |
| Ai rút được tiền khỏi két | Không có lệnh nào cho N.E.D rút tiền. Tiền chỉ ra theo các luật ở bước 5. **Tuy nhiên**, chương trình vẫn có thể được team nâng cấp bằng khóa triển khai (upgrade authority), và khóa này hiện là một khóa đơn. Về lý thuyết, nâng cấp code thì luật cũng có thể bị thay. Kế hoạch là chuyển khóa này sang ví đa chữ ký (multisig) hoặc khóa cứng chương trình trước khi lên mainnet |
| Tranh chấp | Khách hàng có thể **yêu cầu chỉnh sửa (request changes)** trước hạn duyệt; khi đó không ai bấm Release now được nữa. Milestone chỉ kết thúc khi khách chấp nhận bản sửa, freelancer trả lại tiền, hoặc hai bên thỏa thuận chia; **không bao giờ tự hoàn tiền**. **Không có trọng tài trung lập.** Đã có trên Workspace (D27); ứng dụng điện thoại chưa phản hồi được yêu cầu chỉnh sửa (07/10) |
| Trả VND | **Mô phỏng.** Tiền được giải phóng tới một ví thử nghiệm do team giữ, đóng vai đối tác. Màn hình ghi rõ "VND payout simulated". Không có đồng VND nào được trả thật |
| Kiểm chứng | Chạy end-to-end hai lượt trên bản đã triển khai (04/10/2026); một vai là người thật, vai còn lại là script. Test lần gần nhất (v1.4, 07/10): 67/67 test program đạt. **Chưa audit bảo mật** |

**Vì sao thiết kế như vậy?** Có hai lý do chính.

- **Pháp lý tại Việt Nam.** Theo cách đọc của team đối với Nghị định 52/2024 (Điều 3 khoản 10–11, Điều 8 khoản 6), tiền mã hóa không nằm trong danh sách phương tiện thanh toán hợp pháp tại Việt Nam. Theo Nghị quyết 05/2025 (thí điểm), giao dịch tài sản mã hóa phải thanh toán bằng VND qua tổ chức được Bộ Tài chính cấp phép, mà đến 06/10/2026 vẫn chưa có tổ chức nào được cấp phép (07/10) [L1–L14, L18]. Vì vậy team chọn một thiết kế thận trọng: **freelancer ở Việt Nam không nhận USDC**, mà nhận VND qua một đối tác chi trả ở nước ngoài (ứng viên: Due, Nium), thực hiện việc chuyển đổi ở ngoài Việt Nam. Đây là **lựa chọn thiết kế**, không phải kết luận pháp lý đã được luật sư xác nhận.
- **Không cần ai giữ tiền hộ.** Ý tưởng là hai bên tin vào luật được viết trong chương trình, thay vì phải tin vào một công ty trung gian. Tuy vậy, như bảng trên đã nêu, ý tưởng này chỉ đúng hoàn toàn khi quyền nâng cấp chương trình đã được khóa lại.

### 2.2.2 Người dùng hiện đang làm gì thay vì dùng N.E.D?

Đối thủ của N.E.D không chỉ là các startup tương tự. Đối thủ là **mọi cách mà người ta đang dùng để giải quyết cùng một nhu cầu**. Có năm nhóm:

**1. Sàn freelance (Upwork, Fiverr, Contra, Freelancer.com).** Đây là giải pháp hoàn chỉnh nhất: sàn mang khách hàng đến, giữ tiền, tự động trả khi hết hạn duyệt, và có cơ chế xử lý tranh chấp.
- Upwork tự động giải phóng sau 14 ngày; có hòa giải, rồi trọng tài ràng buộc. Freelancer trả phí 0–15%, khách trả 3–10% cộng phí khởi tạo [C1].
- Fiverr giữ 20% của freelancer, tiền về sau 14 ngày [C3].
- Contra tự động giải phóng sau 120 giờ. Tranh chấp treo quá 3 tháng thì tiền về freelancer [C4].
- Upwork có cả sản phẩm "Direct Contracts" để đưa khách quen vào cơ chế giữ tiền của Upwork, với phí 5% cho freelancer [C2].

*Đánh đổi:* phí cao và bị ràng buộc vào nền tảng.

**2. Dịch vụ escrow truyền thống (Escrow.com).** Khách nạp đủ tiền trước. Mỗi milestone có thời gian kiểm tra từ 1 đến 30 ngày; hết hạn mà khách không phản hồi thì coi như chấp nhận và tiền được giải phóng. Tranh chấp đi tới trọng tài ràng buộc tại California [C7].

*Đánh đổi:* phí tối thiểu 50 USD, không hỗ trợ VND; giao dịch lớn chủ yếu bằng điện chuyển khoản quốc tế (dưới 5.000 USD người mua có thể dùng PayPal hoặc thẻ) (07/10). Bất tiện với dự án nhỏ của freelancer Việt Nam.

**3. Nền tảng thanh toán (Payoneer, Wise, PayPal, Deel, Request Finance).** Các nền tảng này **chuyển tiền**, nhưng **không bảo đảm** khách hàng sẽ trả.
- Payoneer đã đóng dịch vụ escrow từ năm 2018.
- Wise cấm dùng tài khoản làm escrow.
- Deel có loại hợp đồng theo milestone; việc khách có phải nạp trước hay không **chưa kiểm chứng được** (nguồn [C8] nói về rút tiền bằng stablecoin) (07/10).

Đây là kênh nhận tiền, không phải đối thủ trực tiếp về việc khóa tiền trước.

**4. Escrow bằng smart contract.**
- **Worqen:** một sàn freelance trên Solana mainnet. Freelancer không mất phí, khách trả 3–5%, tranh chấp do nhân viên Worqen quyết định [C9]. Tuy nhiên số liệu sử dụng chỉ do công ty tự công bố (khoảng 37 lần chi trả, tổng khoảng 5.000 USD tính đến tháng 9/2026) và chưa kiểm chứng được on-chain [G10].
- **Kleros Escrow** và **Smart Invoice:** có trọng tài trung lập (bồi thẩm đoàn phi tập trung) [C13, C14].
- **Trustless Work:** hạ tầng escrow cho các nền tảng khác tích hợp [C12].
- **Stillpaid:** dự án hackathon có cơ chế gần giống N.E.D ("im lặng là đồng ý"), nhưng chỉ chạy devnet [C10].

**5. Cách làm thủ công.** Đặt cọc 30–50%, chia thanh toán theo giai đoạn, giữ file gốc, thỏa thuận qua Zalo hoặc email [P21]. Cách này miễn phí và quen thuộc. Nó giảm rủi ro nhưng không loại bỏ được: phần tiền còn lại sau đặt cọc vẫn có thể không được trả.

### 2.2.3 So sánh tổng hợp

| | Khóa tiền trước | Tự giải phóng khi khách im lặng | Xử lý tranh chấp | Phí | Phù hợp với Việt Nam | Trạng thái |
|---|---|---|---|---|---|---|
| Upwork | Có | 14 ngày | Hòa giải, trọng tài | Freelancer 0–15%, khách 3–10% | Rút về ngân hàng Việt Nam 0,99 USD | Đang hoạt động |
| Fiverr | Có | 3 ngày, cộng 14 ngày chờ tiền | Trung tâm giải quyết của sàn | Freelancer 20%, khách 5,5% | Qua Payoneer/PayPal | Đang hoạt động |
| Contra | Có | 120 giờ | Tiền giữ tối đa 3 tháng khi tranh chấp; ai được nhận sau đó **chưa kiểm chứng** (07/10) | Freelancer 15–29 USD/dự án (gói miễn phí) hoặc 0 (Pro); khách trả phí xử lý (07/10) | Chưa rõ | Đang hoạt động |
| Escrow.com | Có, toàn bộ | Hết thời gian kiểm tra | Trọng tài (California) | 2,6%, tối thiểu 50 USD | Không có VND, chỉ điện chuyển khoản | Đang hoạt động |
| Fastlance (VN) | Có | 7 ngày | Chưa rõ | Không công bố | VND, khách trong nước | Đang hoạt động |
| Worqen | Có (on-chain) | 7 ngày (với hóa đơn theo giờ) | Nhân viên Worqen quyết định | Khách 3–5% | Không thấy kênh chi trả tiền pháp định | Mainnet (theo công ty tự công bố) |
| Kleros / Smart Invoice | Có (on-chain) | Có | **Trọng tài trung lập** | Không thu phí nền tảng | Không có tiền pháp định | Mainnet, ít giao dịch |
| Đặt cọc thủ công | Một phần | — | Không có | 0 | Có | Phổ biến |
| **N.E.D (hôm nay)** | Có (USDC, devnet) | **Bất kỳ ai** bấm được khi quá hạn | **Không có trọng tài**; giao diện đang ẩn | 0 (1% là kế hoạch) | VND **mô phỏng** | Devnet |

Nguồn: [C1–C14], [G10].

### 2.2.4 N.E.D khác biệt ở đâu, và không khác biệt ở đâu

**Những gì N.E.D *không* thể khẳng định:**

- **Không phải sản phẩm đầu tiên hay duy nhất.** Khóa tiền trước, giải phóng khi khách im lặng quá hạn, hoàn tiền khi trễ hạn: mỗi cơ chế này đều đã có ở ít nhất một sản phẩm khác [C16].
- **Không rẻ hơn một cách bền vững.** Phí 0 hiện tại chỉ vì phiên bản thử nghiệm chưa thu phí. Ngoài ra, dịch vụ chuyển USDC thành VND sẽ có chi phí riêng, hiện chưa biết.
- **Không đơn giản hơn với khách hàng phổ thông.** Khách phải có USDC trên Solana, trong khi Escrow.com hay Upwork nhận thẻ hoặc chuyển khoản ngân hàng.
- **Không bảo vệ freelancer mạnh hơn trong mọi tình huống.** Khi khách hàng mở tranh chấp, N.E.D không có trọng tài. Freelancer chỉ có thể chờ, thương lượng hoặc nhượng bộ. Trong khi đó, Contra và Worqen mặc định trả cho freelancer khi tranh chấp bị treo quá lâu, còn Escrow.com và Kleros có trọng tài.

**Những gì N.E.D *có thể* khẳng định (về mặt kỹ thuật, ở dạng prototype):**

Không có tính năng riêng lẻ nào của N.E.D là độc nhất. Điểm khác là **cách kết hợp** các tính năng:

- tiền nằm trong két do chương trình quản lý, không có lệnh nào cho N.E.D rút (kèm lưu ý về quyền nâng cấp);
- luật giải phóng và hoàn tiền theo thời hạn mà ai cũng kích hoạt được;
- nơi nhận tiền do freelancer chốt **trước** khi khách khóa tiền, và không đổi được;
- danh sách đối tác chi trả được phép, để freelancer ở Việt Nam về nguyên tắc nhận VND mà không phải cầm tiền mã hóa;
- brief và bài nộp được mã hóa, chỉ lưu dấu vân tay trên chain.

Trong số các sản phẩm đã khảo sát, **chưa tìm thấy** sản phẩm escrow tiền mã hóa nào công bố việc chi trả VND cho người nhận tại Việt Nam [C15]. Đây là khoảng trống *có thể có*. Nhưng hiện tại chính N.E.D cũng chưa lấp được khoảng trống này, vì phần chi trả VND đang mô phỏng.

### 2.2.5 Rào cản kinh doanh và hướng xử lý

| Rào cản | Vì sao quan trọng | Hướng xử lý (hiện trạng) |
|---|---|---|
| **Khách hàng không có thói quen khóa tiền trước ngoài sàn** | Đây là giả định trung tâm của mô hình. Bằng chứng hiện có không ủng hộ nó | Chưa có hướng đã kiểm chứng. Cần dữ liệu từ người dùng thật (xem 2.3, 2.4) |
| **Khách hàng phải dùng USDC** | Chỉ khoảng 9% doanh nghiệp dùng stablecoin [S19] | Chưa có. Cho phép khách nạp bằng tiền pháp định là một hướng, nhưng chưa có trong sản phẩm hay kế hoạch đã chốt |
| **Không có trọng tài trung lập** | Khách hàng có thể chặn việc giải phóng tiền bằng cách mở tranh chấp, đi ngược lời hứa "tiền không bị giữ tùy tiện" | Team đã ghi nhận và công khai giới hạn này (quyết định D11). Thiết kế trọng tài cần được xem xét về pháp lý |
| **Sản phẩm hai phía** | Phải thuyết phục được cả freelancer lẫn khách hàng ở nước ngoài | Chưa có kênh tiếp cận khách hàng nào được kiểm chứng (xem 2.3) |
| **Phụ thuộc đối tác chi trả VND** | Không có đối tác thì không có VND thật | Đã gửi câu hỏi cho Due và Nium ngày 02/10/2026; chưa ghi nhận phản hồi. Nium có tài liệu công khai về nhận USDC và chi VND qua NAPAS/ví điện tử [M9, M10] |
| **Pháp lý chưa rõ** | Nghị định 284/2026 phạt hành vi "cung cấp dịch vụ liên quan đến tài sản mã hóa" và "quảng cáo, tiếp thị liên quan đến tài sản mã hóa" khi chưa có giấy phép, mức 180–200 triệu đồng với **tổ chức**, cá nhân bằng một nửa (Điều 7 khoản 4) [R1-3] (07/10). Chưa rõ một phần mềm khóa và giải phóng USDC có thuộc phạm vi này không | Chỉ chạy devnet, không thu phí, freelancer Việt Nam không nhận USDC. **Cần ý kiến luật sư Việt Nam** trước khi lên mainnet |
| **Chưa sẵn sàng cho tiền thật** | Chưa audit; quyền nâng cấp là khóa đơn; chưa có cơ chế trả hộ phí giao dịch; chưa có KYC | Đã có trong kế hoạch (xem 2.4) |

> **Kết luận của phần này**
> N.E.D không thắng nhờ một tính năng độc nhất, vì các thành phần đã có ở nơi khác, kể cả trên Solana. Trong các sản phẩm đã khảo sát, điểm khác biệt hợp lý duy nhất là cách kết hợp "két do chương trình quản lý + luật thời hạn ai cũng kích hoạt được + đường VND để freelancer Việt Nam không phải cầm tiền mã hóa". Nhưng chính phần làm nên khác biệt (VND) hiện chỉ là mô phỏng, và ở điểm quan trọng nhất là tranh chấp, N.E.D đang yếu hơn đối thủ. Rào cản lớn nhất không nằm ở công nghệ mà ở hành vi: khách hàng có chịu khóa tiền trước, bằng USDC, khi không ai bắt buộc hay không.

---
## 2.3 Thương mại hóa, mô hình kinh doanh và GTM

Phần 2.2 cho thấy rào cản lớn nhất của N.E.D nằm ở hành vi của khách hàng. Phần này trả lời câu hỏi tiếp theo: **nếu** khách hàng chấp nhận khóa tiền, thì N.E.D kiếm tiền bằng cách nào, chi phí ra sao, và tiếp cận người dùng đầu tiên thế nào. Mọi nội dung dưới đây là **giả thuyết kinh doanh**, trừ khi được ghi rõ là sự thật.

### 2.3.1 Hiện trạng: chưa có doanh thu, có chủ đích

N.E.D hiện **không thu bất kỳ khoản phí nào** và không có dòng code thu phí. Đây là quyết định có chủ đích của team (quyết định D2), vì hai lý do:

- sản phẩm chỉ chạy trên mạng thử nghiệm;
- việc thu phí có thể làm hoạt động của N.E.D giống "cung cấp dịch vụ liên quan đến tài sản mã hóa" hơn theo Nghị định 284/2026 [R1-3, R1-8]. Team chủ trương không thu phí cho đến khi có ý kiến luật sư.

### 2.3.2 Mô hình dự kiến: ai trả, trả cho cái gì, khi nào

| Câu hỏi | Mô hình dự kiến | Trạng thái |
|---|---|---|
| **Ai trả?** | Khách hàng (bên khóa tiền). Freelancer không trả phí cho N.E.D | Kế hoạch |
| **Trả cho cái gì?** | Cho việc dùng cơ chế khóa tiền theo milestone, giải phóng và hoàn tiền theo luật | Kế hoạch |
| **Khi nào?** | Khi một milestone được giải phóng | Kế hoạch |
| **Bao nhiêu?** | 1% số tiền được giải phóng (team có xem thêm kịch bản 2%) | Kế hoạch, chưa kiểm chứng mức sẵn lòng chi trả |
| **Vì sao khách có thể chịu trả?** | Giả thuyết: (a) để chứng tỏ cam kết và thu hút freelancer tốt; (b) để được hoàn tiền nếu freelancer không giao bài đúng hạn; (c) vì rẻ hơn phí của sàn | **Chưa có bằng chứng.** Nghiên cứu không tìm thấy dữ liệu cho thấy khách hàng muốn cung cấp bảo đảm thanh toán để thu hút freelancer [S18] |

**Các dòng doanh thu khác team từng nêu** (đều là giả định, chưa có bằng chứng về nhu cầu):
- gói thuê bao cho agency có nhiều freelancer;
- phí chi trả qua đối tác, thu đúng giá vốn;
- cấp phép module Milestone Lock cho nền tảng khác.

### 2.3.3 So sánh chi phí phía khách hàng (minh họa trên một milestone 1.000 USD)

| Lựa chọn | Khách hàng trả | Freelancer trả |
|---|---|---|
| Upwork | 30–100 USD (3–10%) + phí khởi tạo hợp đồng (07/10) | 0–150 USD |
| Fiverr | 55 USD | 200 USD |
| Escrow.com | tối thiểu 50 USD | — |
| Contra | phí xử lý: tối đa 5 USD (ACH) đến khoảng 29 USD (thẻ) | 29 USD (gói miễn phí) hoặc 0 (Pro) (07/10) |
| **N.E.D (kế hoạch)** | **10 USD** (1%) | 0 cho N.E.D |

Nguồn: [C1–C7], bảng phí trong research của team.

Bảng này cho thấy **nếu** thu 1%, N.E.D có phí thấp hơn Upwork, Fiverr và Escrow.com với milestone cỡ này. Có ba lưu ý quan trọng khiến **không được** kết luận "N.E.D rẻ hơn":

1. Chưa tính **phí của đối tác chuyển USDC thành VND**. Giá của các ứng viên (Due, Nium) không công bố. Tham chiếu công khai của Stripe cho chi trả về Việt Nam là khoảng 1,50 USD + 1% + 1% phí đổi tiền, tức khoảng 21,50 USD trên 1.000 USD nếu người gửi ở Mỹ; người gửi ngoài Mỹ chịu 2% phí đổi tiền, khoảng 31,50 USD (07/10).
2. Chưa tính **chi phí để khách hàng có USDC** (mua, chuyển vào ví).
3. Contra có tổng phí ngang hoặc thấp hơn (đặc biệt với gói Pro của freelancer), và đã có khách hàng.

Với chuyển tiền thông thường, N.E.D **không rẻ hơn Wise**. Chính tài liệu của team cũng ghi nhận điều này. Nếu có giá trị, thì giá trị nằm ở **tiền được khóa trước theo luật viết sẵn**, không phải ở giá (07/10).

### 2.3.4 Chi phí N.E.D phải gánh

| Khoản | Hiện tại | Khi vận hành thật |
|---|---|---|
| Phí mạng Solana | Rất nhỏ. Người dùng tự trả bằng SOL thử nghiệm | Team dự kiến trả hộ phí cho người dùng ở Việt Nam để họ không phải giữ SOL. Chi phí cụ thể: chưa biết |
| Tiền thuê bộ nhớ trên chain | Khoảng 0,008 SOL mỗi hợp đồng, **được hoàn lại** khi đóng (ước tính của team) | Như hiện tại |
| Phí đối tác chi trả VND | Không có (mô phỏng) | Chưa biết. Dự kiến tính thẳng cho người dùng theo giá vốn |
| Kiểm toán bảo mật, ý kiến pháp lý, sàng lọc ví, KYC, hỗ trợ khách hàng | Chưa có | Chưa ước tính. Đây là các khoản lớn so với mức phí 1% |

### 2.3.5 Minh họa doanh thu (không phải dự báo)

Công thức đơn giản:

> **Doanh thu năm = số freelancer hoạt động × giá trị giao dịch mỗi tháng × 12 × mức phí**

Ví dụ minh họa (giả định của team): 1.000 freelancer × 500 USD/tháng × 12 × 1% = **60.000 USD/năm**, trước mọi chi phí. Với 100 freelancer thì là **6.000 USD/năm**.

Không có đầu vào nào trong công thức này được kiểm chứng:
- số freelancer sẽ dùng thì chưa biết (2.1.5);
- giá trị giao dịch thì chưa có dữ liệu;
- mức phí 1% chưa được thử nghiệm với khách hàng.

Phép tính này chỉ cho thấy **thứ tự độ lớn**. Muốn có doanh thu đáng kể, N.E.D cần khối lượng giao dịch lớn. Khối lượng đó lại phụ thuộc vào giả định khách hàng chịu khóa tiền trước.

### 2.3.6 Tiếp cận thị trường (GTM): giả thuyết, chưa kiểm chứng

Vì là sản phẩm hai phía, N.E.D phải tiếp cận **cùng lúc** freelancer ở Việt Nam và khách hàng ở nước ngoài. Kế hoạch hiện có của team:

| Bước | Ai | Vì sao có thể tiếp cận được | Cách làm dự kiến |
|---|---|---|---|
| Thí điểm | 3–5 cặp freelancer–khách hàng trong mạng lưới quen biết của team | Có quan hệ sẵn | Mỗi cặp chạy một hợp đồng trên devnet, ghi nhận phản ứng |
| Phía freelancer | Freelancer Việt Nam trong các nhóm Facebook freelance, cộng đồng Upwork/Fiverr Việt Nam, câu lạc bộ IT ở trường đại học | Cộng đồng tiếng Việt, team tiếp cận được (lưu ý: số thành viên nhóm chỉ là phạm vi tiếp cận, không phải số người dùng) | Giới thiệu sản phẩm, mời dùng thử |
| Phía khách hàng | Cộng đồng Web3 và startup đã có sẵn USDC trên Solana (ví dụ Superteam) | Không vướng rào cản USDC | Giới thiệu qua mạng lưới hackathon |
| Đối tác | Due, Nium | Có tài liệu công khai về nhận USDC và chi trả VND [M9, M10] | Xin môi trường thử nghiệm sau cuộc thi |

**Điều cần học được từ GTM ban đầu:**
- khách hàng có thực sự khóa tiền trước không, và với giá trị bao nhiêu;
- họ có chịu trả phí không;
- tranh chấp xảy ra thường xuyên đến mức nào;
- freelancer có thực sự cần nhận VND, hay thích nhận USDC hơn (dữ liệu của Deel gợi ý contractor Việt Nam có xu hướng thích nhận stablecoin [S4], nhưng điều này vướng vấn đề pháp lý ở 2.2.5).

**Dấu hiệu cho thấy giả thuyết GTM sai:**
- khách hàng từ chối khóa trước, hoặc chỉ muốn trả theo hóa đơn;
- chỉ người quen mới chịu dùng thử;
- khách hàng muốn nạp bằng thẻ hoặc chuyển khoản thay vì USDC;
- freelancer vẫn chọn đặt cọc thủ công;
- không đối tác nào chấp nhận một startup giai đoạn đầu.

Một lưu ý từ nghiên cứu: ngay trong cộng đồng crypto, cách trả tiền phổ biến vẫn là trả sau khi nhận sản phẩm [G12–G14]. Vì vậy việc nhóm khách hàng crypto-native dễ tiếp cận hơn **không** đồng nghĩa với việc họ sẽ dùng cơ chế khóa trước.

Team từng lên kế hoạch một khảo sát người dùng, với ngưỡng quyết định là tối thiểu 30% freelancer từng mất tiền và 30% cho rằng khách hàng sẽ chịu khóa tiền. Kết quả khảo sát này không có trong cơ sở bằng chứng của tài liệu: [UNKNOWN].

### 2.3.7 Các giả định thương mại hóa còn cần kiểm chứng

| # | Giả định | Bằng chứng hiện có |
|---|---|---|
| 1 | Khách hàng tự nguyện khóa trước tiền milestone khi làm việc ngoài sàn | Không có bằng chứng ủng hộ; thông lệ là trả sau [S16, G1–G14] |
| 2 | Khách hàng chấp nhận dùng USDC | Có với nhóm crypto-native; không có với khách hàng phổ thông [S19, S21] |
| 3 | Khách hàng chịu trả phí 1% | Chưa kiểm chứng |
| 4 | Có đối tác chi trả VND chấp nhận hợp tác, với chi phí chấp nhận được | Chưa có phản hồi; giá không công bố |
| 5 | Mô hình không vướng giấy phép tại Việt Nam | Chưa rõ, cần luật sư [R1] |
| 6 | Đủ khối lượng giao dịch để phí 1% bù được chi phí | Chưa biết |

> **Kết luận của phần này**
> Mô hình kinh doanh dự kiến khá rõ ràng: khách hàng trả một khoản phí nhỏ khi tiền được giải phóng, freelancer không trả gì. Nhưng mọi con số đều phụ thuộc vào một chuỗi giả định chưa được kiểm chứng: khách chịu khóa tiền trước, chịu dùng USDC, chịu trả phí, có đối tác chi trả, và không vướng pháp lý. Lợi thế về phí chỉ có thật nếu các chi phí đi kèm (đối tác, kiểm toán, tuân thủ) đủ thấp, và hiện chưa ai biết điều đó. Vì vậy phần thương mại hóa nên được trình bày như **một kế hoạch cần kiểm chứng**, không phải một mô hình đã chạy.

---
## 2.4 Các hoạt động chính

Phần này không phải danh sách việc cần làm chung chung cho một startup. Mỗi hoạt động dưới đây xuất phát từ **một khoảng trống cụ thể** đã được xác định ở các phần trước. Bảng đầu tiên tóm tắt những gì đã làm xong, để thấy điểm xuất phát.

### 2.4.1 Đã làm được gì (sự thật sản phẩm, tính đến 04/10/2026; cập nhật 07/10)

| Hạng mục | Hiện trạng |
|---|---|
| Smart contract | Chương trình `ned_program` (v1.4, 29 lệnh, 55 mã lỗi, 26 event) trên **devnet**: hợp đồng milestone, két do chương trình quản lý, giải phóng và hoàn tiền theo thời hạn, yêu cầu chỉnh sửa, định danh @username, đăng ký khóa thiết bị, **Funded Jobs** (đăng việc kèm ngân sách đã khóa, ứng tuyển, chọn người) (07/10) |
| Kiểm thử | 67/67 test program đạt ở lần ghi nhận gần nhất (v1.4, 07/10); test thư viện dùng chung 185/185; smoke test trên devnet đạt; chạy end-to-end 2 lượt đạt (04/10/2026), một vai là người thật, vai còn lại là script; chưa có lượt nào với hai người dùng thật |
| Giao diện | Ứng dụng web cho điện thoại (GitHub Pages) và Workspace cho máy tính (Vercel). Đăng nhập Google qua Dynamic. Có giao diện cho người ở Việt Nam (hiển thị VND ước tính) và giao diện quốc tế |
| Bảo mật nội dung | Brief và bài nộp mã hóa đầu cuối; khóa được chia sẻ tự động giữa các thiết bị đã đăng ký |
| Tài liệu kỹ thuật | Đặc tả chương trình v1.3 đầy đủ (07/10); hướng dẫn build, test, deploy |
| Đang ẩn hoặc tắt | Swap và xStocks (tính năng của sản phẩm cũ, vẫn còn code) |

### 2.4.2 Các hoạt động cần làm, theo khoảng trống

**A. Kiểm chứng thị trường** (khoảng trống lớn nhất, xem 2.1 và 2.3)

| Khoảng trống | Hoạt động |
|---|---|
| Chưa biết khách hàng có chịu khóa tiền trước ngoài sàn | Chạy thí điểm với các cặp freelancer–khách hàng thật, đo tỷ lệ khóa tiền, giá trị hợp đồng, tỷ lệ tranh chấp |
| Chưa biết mức sẵn lòng trả phí | Thử nghiệm mức phí với khách hàng sau khi có ý kiến pháp lý |
| Quy mô nhóm khách hàng mục tiêu ở Việt Nam chưa đo được | Thu thập dữ liệu người dùng thật trong giai đoạn thí điểm |

**B. Pháp lý và tuân thủ**

| Khoảng trống | Hoạt động |
|---|---|
| Chưa rõ N.E.D có thuộc diện "cung cấp dịch vụ liên quan đến tài sản mã hóa" (Nghị định 284/2026, Điều 7(4)) không | Xin ý kiến luật sư Việt Nam có chuyên môn |
| Chưa rõ việc freelancer ở Việt Nam ký giao dịch on-chain có bị coi là sử dụng tài sản mã hóa không | Đưa vào câu hỏi gửi luật sư (team đã liệt kê sẵn) |
| Chưa có KYC và sàng lọc chống rửa tiền | Thực hiện KYC qua đối tác chi trả có giấy phép, sau khi chọn được đối tác |
| Chưa rõ quy định về escrow ở nước của khách hàng | Thuộc phạm vi tư vấn pháp lý khi mở rộng |

**C. Hạ tầng chi trả VND**

| Khoảng trống | Hoạt động |
|---|---|
| VND đang là mô phỏng | Hoàn tất trao đổi với Due và/hoặc Nium: đối tác có nhận một startup không, có khớp được khoản nạp với người nhận bằng mã tham chiếu không, nhận tiền từ địa chỉ chương trình được không, giá bao nhiêu |
| Danh sách đối tác trên mainnet đang để trống | Chỉ thêm địa chỉ đối tác thật sau khi đã ký kết hợp tác |

**D. Bảo mật và sẵn sàng cho mainnet**

| Khoảng trống | Hoạt động |
|---|---|
| Chưa audit | Kiểm toán bảo mật smart contract trước khi xử lý tiền thật |
| Quyền nâng cấp là một khóa đơn của team | Chuyển sang ví đa chữ ký (multisig) hoặc khóa cứng chương trình. Bước này cũng là điều kiện để nói "N.E.D không thể động vào tiền" một cách chính xác |
| Người dùng phải tự trả phí mạng | Xây dựng cơ chế trả hộ phí (fee payer). Việc này cần một máy chủ nhỏ, trái với kiến trúc "không backend" hiện tại |
| Không có trọng tài trung lập | Thiết kế cơ chế xử lý tranh chấp, kèm đánh giá pháp lý |
| Giới hạn hiện tại để demo (1.000 USDC, cửa sổ thời gian 60 giây) | Đặt lại giới hạn và thời hạn tối thiểu cho môi trường thật (team dự kiến 24 giờ làm việc và 72 giờ duyệt) |

**E. Tài liệu và khả năng tái lập** (liên quan trực tiếp đến tiêu chí chấm "Build Evidence, Documentation & Reproducibility")

| Khoảng trống | Hoạt động |
|---|---|
| README vẫn mô tả sản phẩm ví cũ; số liệu sai (17 lệnh thay vì 27, 708 byte thay vì 740, 24 test thay vì 54) (07/10) | Cập nhật README theo Milestone Lock |
| `ARCHITECTURE.md` lỗi thời | Cập nhật theo v1.3, Workspace và N.E.D Jobs |
| Ảnh chụp màn hình là của sản phẩm cũ | Thay bằng ảnh của Milestone Lock |
| README ghi giấy phép MIT nhưng không có file LICENSE | Thêm file hoặc sửa lại dòng ghi |
| Tổng số test của v1.2 chưa được ghi đầy đủ | Chạy lại toàn bộ test và ghi kết quả |

**F. Vận hành**

| Khoảng trống | Hoạt động |
|---|---|
| Chưa có hỗ trợ người dùng, quy trình xử lý sự cố | Thiết lập khi bắt đầu thí điểm với người dùng thật |

### 2.4.3 Thứ tự ưu tiên hợp lý

Có thể chia thành ba lớp phụ thuộc nhau:

1. **Ngắn hạn (cho cuộc thi):** cập nhật tài liệu (nhóm E), giữ cách nói trung thực về những phần mô phỏng.
2. **Sau cuộc thi, trước khi có tiền thật:** ý kiến pháp lý (B), trao đổi với đối tác chi trả (C), thí điểm thị trường trên devnet (A). Ba việc này quyết định có nên đi tiếp hay không.
3. **Chỉ khi bước 2 cho kết quả tích cực:** audit, multisig, trả hộ phí, mainnet (D), rồi đến vận hành (F).

Lý do của thứ tự này: đầu tư vào audit và mainnet trước khi biết khách hàng có chịu khóa tiền hay không là rủi ro không cần thiết.

---

## 2.5 Tác động kinh tế, xã hội và môi trường

Phần này phân biệt rõ **tác động tiềm năng** (nếu sản phẩm được dùng rộng rãi) với **tác động đã đo được**. N.E.D hiện chạy trên mạng thử nghiệm, chưa có người dùng thật trả tiền thật, nên **chưa có tác động nào đo được**.

### Kinh tế (tiềm năng)

Nếu được chấp nhận, cơ chế khóa tiền trước có thể giúp:
- freelancer làm trực tiếp với khách nước ngoài giảm rủi ro mất tiền công;
- cả hai bên có luật rõ ràng về thời hạn và việc giải phóng tiền, thay vì phụ thuộc thiện chí của bên kia;
- người làm dự án tránh được một phần phí cao của các sàn.

Quy mô của tác động này **chưa thể ước tính**, vì quy mô nhóm khách hàng chưa đo được (2.1.5).

Cũng cần nói rõ: đây chưa phải tác động lên nền kinh tế. Các con số vĩ mô như doanh thu xuất khẩu công nghệ số của Việt Nam là doanh thu của doanh nghiệp, không phản ánh tác động của N.E.D.

### Xã hội (tiềm năng)

- **Tính minh bạch và dễ dự đoán:** người làm theo dự án biết trước tiền đã được khóa, biết thời hạn, và có bằng chứng (dấu vân tay của brief và bài nộp) về điều đã thỏa thuận và đã giao.
- **Thiết kế thận trọng với người dùng ở Việt Nam:** theo thiết kế, freelancer ở Việt Nam không nhận USDC mà nhận VND qua đối tác. Mục đích là giảm rủi ro pháp lý cho cá nhân. Đây mới là ý định thiết kế: hiện tại freelancer vẫn ký giao dịch trên chain và trả phí mạng bằng SOL thử nghiệm; việc trả hộ phí và đối tác chi trả thật đều chưa có. Việc ký giao dịch có bị coi là sử dụng tài sản mã hóa hay không vẫn chưa rõ về pháp lý.
- **Giới hạn cần thừa nhận:** khi xảy ra tranh chấp, sản phẩm hiện không có trọng tài. Bên yếu thế hơn (thường là freelancer) có thể vẫn bị giữ tiền. Vì vậy không nên nói rằng sản phẩm "bảo vệ" freelancer một cách tuyệt đối.

### Môi trường

N.E.D **không có tác động môi trường đáng kể nào đã được chứng minh**, theo cả chiều tích cực lẫn tiêu cực. Tài liệu này không đưa ra lợi ích môi trường, vì không có bằng chứng.

---
## KẾT LUẬN: N.E.D ĐANG ĐỨNG Ở ĐÂU?

Tóm gọn trong một câu: **N.E.D đã xây được một cơ chế khóa và giải phóng tiền theo milestone chạy thật trên mạng thử nghiệm. Bằng chứng cho thấy vấn đề mà cơ chế này nhắm tới là có thật ở cấp độ chung. Nhưng mô hình kinh doanh vẫn dựa trên giả định rằng khách hàng sẽ tự nguyện khóa tiền trước bằng USDC, và giả định này chưa được chứng minh.**

Có thể tách thành bốn phần:

**1. Điều đã được chứng minh (về thị trường)**
- Freelancer ở nhiều thị trường có dữ liệu (Mỹ, Anh) gặp tình trạng bị trả chậm hoặc không được trả một cách lặp đi lặp lại.
- Lớp bảo vệ thanh toán hiện có chủ yếu nằm trong các sàn, đi kèm phí cao và ràng buộc nền tảng.
- Cơ chế giữ tiền theo milestone là một mô hình đã được chấp nhận, khi có nền tảng đứng giữa.

**2. Điều đã được xây (về kỹ thuật)**
- Một smart contract trên Solana devnet: khóa USDC theo milestone vào két do chương trình quản lý, giải phóng và hoàn tiền theo thời hạn mà bất kỳ ai cũng kích hoạt được, nơi nhận tiền được chốt trước và không đổi được.
- Brief và bài nộp được mã hóa, khóa chia sẻ giữa các thiết bị.
- Hai giao diện web.
- Đã chạy end-to-end và có bộ test.

**3. Điều chưa được chứng minh**
- Quy mô và mức độ nghiêm trọng của vấn đề với freelancer Việt Nam làm cho khách nước ngoài.
- Việc khách hàng tự nguyện khóa trước tiền ngoài sàn, và chịu dùng USDC.
- Việc khách hàng chịu trả phí.
- Đường chi trả VND (hiện mô phỏng) và chi phí của nó.
- Tính hợp pháp của mô hình tại Việt Nam.
- Một điểm khác biệt mà người dùng thực sự coi trọng so với các giải pháp đã có.

**4. Điều cần xảy ra tiếp theo**
- **Về thị trường:** thí điểm với người dùng thật để biết khách hàng có khóa tiền hay không. Đây là câu hỏi quyết định số phận của mô hình.
- **Về pháp lý và đối tác:** có ý kiến luật sư Việt Nam; có ít nhất một đối tác chi trả chấp nhận hợp tác.
- **Về kỹ thuật:** chỉ sau hai bước trên mới nên đầu tư vào audit, multisig, trả hộ phí và mainnet. Trước đó, cập nhật tài liệu cho khớp với sản phẩm hiện tại.

Hoàn thiện kỹ thuật và kiểm chứng thị trường là **hai việc riêng biệt**. Smart contract chạy tốt không chứng minh có người muốn dùng nó. Và việc chưa chứng minh được thị trường cũng không làm giảm giá trị của những gì đã xây về mặt kỹ thuật.

---

## GIỚI HẠN CỦA PHÂN TÍCH

Phân tích này chỉ dựa trên nghiên cứu tại bàn (desk research), số liệu thứ cấp và mã nguồn của repo. Những giới hạn dưới đây cần được đọc cùng mọi kết luận ở trên:

1. **Không có nghiên cứu sơ cấp.** Không phỏng vấn, không khảo sát, không thử nghiệm với người dùng. Kết quả khảo sát team dự định làm không có trong cơ sở bằng chứng.
2. **Thiếu dữ liệu riêng cho Việt Nam.** Không có số liệu chính thức về freelancer Việt Nam làm cho khách nước ngoài. Số liệu về việc bị quỵt tiền chỉ có từ khảo sát PayPal năm 2017.
3. **Bằng chứng về việc khách hàng tự nguyện khóa tiền.** Không tìm thấy bằng chứng công khai về mức sử dụng đáng kể. Một số nguồn on-chain (Worqen, Trustless Work, Kleros, Smart Invoice) chưa được truy vấn đầy đủ. Vì vậy "không tìm thấy bằng chứng" **không có nghĩa** là "chắc chắn không có".
4. **Quy mô thị trường.** Không tính được TAM/SAM/SOM; các tầng từ "freelancer" trở xuống đều chưa biết.
5. **Mức sẵn lòng dùng USDC của khách hàng.** Dữ liệu về stablecoin trong doanh nghiệp chủ yếu đến từ Mỹ và các khảo sát có cỡ mẫu vừa phải.
6. **Diễn giải pháp lý.** Nguyên văn Nghị định 284/2026 được đọc qua các bản sao pháp lý uy tín; bản gốc là file scan không đọc được bằng máy. (07/10) Theo Điều 4 khoản 2, mức phạt chung trong Nghị định là cho tổ chức và cá nhân chịu một nửa; riêng mức 30–50 triệu ở Điều 9 khoản 1 được báo chí mô tả là cho cá nhân giao dịch ngoài tổ chức được cấp phép ([VnEconomy](https://vneconomy.vn/phat-den-50-trieu-dong-voi-ca-nhan-giao-dich-tai-san-ma-hoa-khong-qua-don-vi-duoc-cap-phep.htm)). Cần đọc bản gốc trước khi trích dẫn. Mọi đánh giá về việc N.E.D có thuộc phạm vi cấp phép hay không đều **cần luật sư Việt Nam**.
7. **Giá của đối tác chi trả.** Due và Nium không công bố giá. Tham chiếu duy nhất là bảng giá của Stripe.
8. **Không có doanh thu hay giao dịch thật.** Mọi hoạt động diễn ra trên mạng thử nghiệm với tiền không có giá trị.
9. **Số liệu do công ty tự công bố.** Một số số liệu về đối thủ và thị trường (Worqen, Deel, Bonsai, Remote, PayPal) do chính các công ty công bố, chưa được kiểm chứng độc lập.
10. **Tính thời điểm.** Số liệu về sản phẩm của đối thủ, phí và quy định có thể đã thay đổi sau thời điểm thu thập (01–06/10/2026).

---

## NGUỒN THAM KHẢO / EVIDENCE MAP

Mã nguồn tương ứng với các mục trong `NED_Evidence_Base.md`.

**Sản phẩm (sự thật sản phẩm)**
- Repo `Tdat10052499/Unihackfest-2026`, `main` @ `3a1564a`: `ned_program/` (21 lệnh, v1.2; nay là v1.4, 29 lệnh, 07/10), `docs/09-milestone-lock/` (product-spec, program-spec, decision log), `docs/tong-hop-tien-do.md` (kết quả test, D1, thông tin devnet), `docs/08-research/ned-research-and-compliance.md` (bảng phí, kế hoạch GTM của team) — https://github.com/Tdat10052499/Unihackfest-2026

**Vấn đề (Q1: P1–P23)**
- [P1] PayPal Global Freelancer Survey (10/2017) — https://www.matterhorncommunications.com/half-freelancers-surveyed-four-southeast-asia-markets-experienced-not-paid-paypal-global-freelancer-survey/
- [P2] ILO, khảo sát thí điểm Việt Nam — https://www.ilo.org/resource/article/pilot-survey-viet-nam-promising-start-defining-digital-platform-employment · https://www.ilo.org/sites/default/files/2025-07/ILO%20Research%20brief_Measuring%20DPE%20-%20VNM_2025-07_final.pdf
- [P5] Tuổi Trẻ (07/2025) — https://tuoitre.vn/nld/lao-dong-tu-do-lua-chon-may-rui-196250720210432798.htm
- [P8] IPSE — https://www.ipse.co.uk/campaigns/prompt-payment/late-payment-within-the-self-employed-sector
- [P10] Bonsai — https://www.hellobonsai.com/blog/late-freelance-payment
- [P11] NYC DCWP, báo cáo 5 năm — https://www.nyc.gov/assets/dca/downloads/pdf/workers/DCWP-Freelance-Isnt-Free-Act-Five-YearReport-2023.pdf
- [P12] Freelancing in NYC 2019 — https://www.nyc.gov/assets/mome/pdf/freelancing-ny-report-09062019.pdf
- [P15] Upwork, bảo vệ thanh toán và phí — https://support.upwork.com/hc/en-us/articles/211062568-How-Upwork-protects-your-payments · https://www.upwork.com/legal
- [P18] PayPal Seller Protection — https://www.paypal.com/us/legalhub/paypal/seller-protection
- [P19] Chính phủ Anh, phản hồi tham vấn về trả chậm (03/2026) — https://assets.publishing.service.gov.uk/media/69c2c7c413f1436476e443a2/late-payments-consultation-response.pdf
- [P20] ILO WESO 2021 — https://www.ilo.org/media/387316/download
- [P21] Dân Trí (2021) — https://dantri.com.vn/lao-dong-viec-lam/freelancer-va-noi-lo-bi-quyt-tien-20210520120359225.htm · Luật Minh Khuê — https://luatminhkhue.vn/lam-freelancer-bi-bung-tien-co-kien-duoc-khong.aspx

**Phân khúc và hành vi (Q3: S1–S24)**
- [S1] Tổng cục Thống kê, Báo cáo Lao động việc làm 2023 — https://www.nso.gov.vn/wp-content/uploads/2025/03/B1.-Sach-Bao-cao-LD-viec-lam-TA-Can3bo-Mar.pdf
- [S2] World Bank, Working Without Borders (2023) — https://documents1.worldbank.org/curated/en/099071923113511279/pdf/P17730205fbe2002709043043e4d4f7efee.pdf
- [S4] Deel Global Hiring Report 2026 — https://www.deel.com/global-hiring-report-2026/
- [S7] VnEconomy (01/2025) — https://vneconomy.vn/viet-nam-hien-co-gan-74-000-cong-ty-cong-nghe-voi-tren-1-2-trieu-lao-dong.htm
- [S8] Payoneer 2022 — https://www.payoneer.com/resources/news-events/2022-global-freelancer-income-report-the-ongoing-rise-of-the-freelance-revolution/
- [S10] PayPal Việt Nam, biểu phí — https://www.paypal.com/vn/webapps/mpp/merchant-fees
- [S11] Wise, quốc gia được giữ số dư — https://wise.com/help/articles/2813542/where-do-i-need-to-live-to-hold-money-with-wise
- [S12] Upwork, chuyển về ngân hàng nội địa — https://support.upwork.com/hc/en-us/articles/211060578 · Techcombank, biểu phí — https://techcombank.com/content/dam/techcombank/public-site/documents/techcombank-bieu-phi-dich-vu-ngan-hang-dien-tu-va-chuyen-tien-ca-nhan.pdf
- [S15] TBS News (Bangladesh) — https://www.tbsnews.net/features/panorama/paypal-bangladesh-whats-holding-back-965116
- [S16] Xero Small Business Insights — https://www.xero.com/us/resources/small-business-insights/latest-united-states/
- [S17] Upwork, bảo vệ fixed-price — https://support.upwork.com/hc/en-us/articles/211063748 · Fiverr, milestone — https://help.fiverr.com/hc/en-us/articles/360010560178
- [S19] EY-Parthenon, khảo sát stablecoin (06/2025) — https://www.ey.com/en_us/insights/financial-services/cost-savings-and-speed-drive-stablecoin-adoption
- [S20] McKinsey — https://www.mckinsey.com/featured-insights/week-in-charts/stablecoins-find-their-niche
- [S21] Deel, stablecoin cho contractor — https://www.deel.com/blog/stablecoin-pay-as-a-contractor/

**Cạnh tranh (Q2: C1–C17) và mức sử dụng escrow (Q-G1: G1–G17)**
- [C1–C2] Upwork — https://www.upwork.com/resources/is-upwork-free · https://support.upwork.com/hc/en-us/articles/360025200853-A-freelancer-or-agency-sent-you-a-direct-contract-now-what
- [C3] Fiverr — https://help.fiverr.com/hc/en-us/articles/360010639617-Managing-your-orders-A-freelancer-s-guide-to-the-Fiverr-order-process
- [C4] Contra — https://help.contra.com/en/articles/9322934-fees-overview · https://help.contra.com/en/articles/9322969-contra-s-dispute-process
- [C5] Freelancer.com — https://www.freelancer.com/page.php?p=info/dispute_policy
- [C6] vLance — https://www.vlance.vn/page/quy-che-hoat-dong · Fastlance — https://fastwork4276.zendesk.com/hc/vi/articles/12126653672591
- [C7] Escrow.com — https://www.escrow.com/milestones/how-it-works · https://www.escrow.com/fee-calculator
- [C8] Wise, chính sách sử dụng — https://wise.com/us/legal/acceptable-use-policy · Deel — https://help.letsdeel.com/hc/en-gb/articles/23524211726481
- [C9, G10] Worqen — https://worqen.com · https://worqen.com/llms-full.txt · https://github.com/Worqen-Labs/Worqen-Solana
- [C10] Stillpaid — https://github.com/NWichter/stillpaid
- [C12] Trustless Work — https://www.trustlesswork.com/
- [C13, G7] Kleros Escrow — https://etherscan.io/address/0x0d67440946949FE293B45c52eFD8A9b3d51e2522
- [C14, G8] Smart Invoice / Raid Guild — https://handbook.raidguild.org/docs/escrow/intro-to-smartinvoice
- [G1] Escrow.com H1/2026 — https://domainnamewire.com/2026/07/28/escrow-h1/
- [G12] Superteam Earn, điều khoản sử dụng — https://superteam.fun/earn/terms-of-use.pdf
- [G13] Gitcoin Bounties — https://www.onchainatlas.org/gitcoin-bounties/
- [G14] Dework — https://dework.gitbook.io/product-docs/guides-for-orgs/manage-payments/batch-payments
- [M9, M10] Nium — https://docs.nium.com/docs/payouts/country-and-regional-guides/vnd-payments-to-vietnam · https://www.nium.com/products/stablecoin-payouts

**Pháp lý (Q1-legal: L1–L27; R1)**
- [L1–L4] Nghị quyết 05/2025/NQ-CP — https://thuvienphapluat.vn/van-ban/Tien-te-Ngan-hang/Nghi-quyet-05-2025-NQ-CP-trien-khai-thi-diem-thi-truong-tai-san-ma-hoa-tai-Viet-Nam-672252.aspx
- [L10] UBCK về việc giữ tài sản trong ví cá nhân — https://vneconomy.vn/nha-dau-tu-tai-san-so-van-duoc-giu-vi-ca-nhan-nhung-phai-giao-dich-qua-san-cap-phep.htm
- [L13] Tình trạng cấp phép (09/2026) — https://theleader.vn/to-chuc-tai-san-ma-hoa-dau-tien-du-kien-hoat-dong-trong-nam-nay-d47678.html
- [L18] Nghị định 52/2024/NĐ-CP — https://english.luatvietnam.vn/tai-chinh/decree-52-2024-nd-cp-on-non-cash-payment-336447-d1.html
- [R1-1] Nghị định 284/2026/NĐ-CP (thông tin văn bản) — https://vanban.chinhphu.vn/?docid=218906&pageid=27160
- [R1-3, R1-4] Toàn văn (bản sao) — https://luatminhnguyen.com.vn/nghi-dinh-so-284-2026-nd-cp-quy-dinh-xu-phat-vi-pham-hanh-chinh-ve-tai-san-ma-hoa-va-thi-truong-tai-san-ma-hoa/ · https://english.luatvietnam.vn/decree-no-284-2026-nd-cp-dated-july-16-2026-of-the-government-prescribing-the-sanctioning-of-administrative-violations-regarding-crypto-assets-and-t-440680-doc1.html

**Bối cảnh cuộc thi (R2)**
- Thể lệ UniHackfest 2026 (cập nhật 21/07/2026) — https://docs.google.com/document/d/1gveC_I-KCVGpC9PP94D2TDx_vEP3TXbBHKY0dgvxw5M/edit
- Rubric vòng final do BTC gửi trực tiếp cho team (ảnh, 06/10/2026) — không có đường link công khai
