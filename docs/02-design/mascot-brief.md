# N.E.D Wallet — Brief thiết kế Mascot "Teddy"

**Ngày lập**: 26/09/2026 · **Hạn dùng cho demo**: trước 10/10/2026 (pitching final)
**Mục đích tài liệu**: bản mô tả đầy đủ để bắt đầu tạo/hoàn thiện bộ nguyên liệu mascot trong một cuộc hội thoại mới. Đọc kèm `claude/Design-Artifact-Status.md` (design token, canvas).

---

## 0. Tóm tắt một đoạn

Teddy là chú gấu tím có bộ ria đen, đại diện thương hiệu N.E.D. Bộ hiện có gồm 16 biểu cảm toàn thân (PNG nền trong suốt) và 1 bản nét trắng (line-art) trong khung tròn. Vấn đề cần xử lý trước: **độ phân giải quá thấp (~200px), khung hình không đồng đều, thiếu bản chỉ-đầu (bust) và thiếu bản line-art cho các biểu cảm**. Nguyên tắc sử dụng: mascot phản ánh **trạng thái của ứng dụng** (thành công, chờ, lỗi, trống), **không bao giờ phản ánh lãi/lỗ của người dùng**, và **không xuất hiện ở màn hình ra quyết định tiền** (nhập số tiền, Review, Swap).

---

## 1. Hồ sơ nhân vật (character sheet)

| Thuộc tính | Mô tả (quan sát từ bộ hiện có) |
|---|---|
| Loài / dáng | Gấu bông, thân tròn mập, đầu to (tỉ lệ đầu ≈ 45–50% chiều cao), chân ngắn, tay ngắn tròn |
| Màu thân | Tím — xấp xỉ `#7236B4` (vùng sáng `#7A40C0`, vùng bóng `#5A2494`) |
| Bụng | Mảng oval màu kem `#F2E6E2`, không có chi tiết |
| Tai | Tròn nhỏ hai bên đỉnh đầu, lòng tai cùng màu thân, hơi đậm hơn |
| Mắt | Hai chấm đen tròn nhỏ, có điểm sáng trắng; khoảng cách rộng |
| Mũi | Tam giác bo tròn màu đen bóng, ngay trên ria |
| **Ria mép** | **Dấu hiệu nhận diện chính**: ria đen bóng `#111111`, cong vểnh hai đầu, rộng gần bằng mặt, có highlight bóng |
| Chất liệu | Mềm, 3D nhẹ kiểu "soft vinyl/clay", viền đậm hơn thân, bóng đổ mềm, không có đường viền đen |
| Tính cách | Thân thiện, điềm tĩnh, hơi "quý ông" (nhờ bộ ria) — đáng tin cậy chứ không nghịch ngợm |
| Tên gọi | Teddy. **Đề xuất: T.E.D Bot = Teddy** (trợ lý AI chính là chú gấu) |

*Mã màu đo từ file `happy.png`, sai số ±8 mỗi kênh do ảnh nhỏ. Khi có file gốc, lấy màu chính xác từ file gốc và cập nhật bảng này.*

**Quy tắc nhất quán khi vẽ thêm**: giữ nguyên tỉ lệ đầu–thân, hình ria, màu bụng, kiểu mắt chấm. Mọi biểu cảm mới chỉ thay đổi: lông mày/mí mắt, miệng (nhìn thấy dưới ria), tay, và ký hiệu phụ (❓, 💤, "…", tia sáng).

---

## 2. Kiểm kê bộ hiện có

**Vị trí gốc**: `<thư mục mascot gốc>\` — tên file dạng `mascot teddy - <mood>.png`

| Mood | Kích thước hiện tại (px) | Mô tả tư thế | Dùng trong app? |
|---|---|---|---|
| waving | 239×182 | Vẫy tay phải, có ký hiệu ♡ | ✅ Có |
| thinking | 234×183 | Tay chống cằm, bong bóng "…" | ✅ Có |
| happy | 306×213 | Hai tay giơ cao, mắt cười | ✅ Có |
| exciting | 270×212 | Nhảy, một chân nhấc, tia chuyển động | ✅ Có (hiếm) |
| proud | 259×182 | Mắt nhắm tự hào, tay chống hông, lấp lánh | ✅ Có |
| curious | 258×209 | Tay chạm cằm, nhìn nghiêng | ✅ Có |
| confused | 241×205 | Gãi má, dấu "?" | ✅ Có |
| sleepy | 285×186 | Ngáp, "zzz" | ✅ Có |
| surprised | 242×203 | Hai tay ôm má, dấu "!" | ✅ Có |
| embarrassed | 244×186 | Má ửng hồng, ôm bụng, ♡ | ✅ Có |
| sad | 261×203 | Mắt rũ, vòng rối trên đầu | ✅ Có |
| laughing | 231×189 | Cười lớn, tay giơ | ⚠️ Chỉ marketing/sticker |
| angry | 298×207 | Khoanh tay, khói giận | ❌ Không dùng trong UI |
| frustrated | 273×188 | Ôm đầu, vòng rối | ❌ Không dùng trong UI |
| crying | 247×192 | Khóc, giọt nước mắt xanh | ❌ Không dùng trong UI |
| scared | 272×177 | Mắt tròn, run | ❌ Không dùng trong UI |
| (line-art) | 2048×2048 | Nét trắng, đầu + vai, khung tròn | ✅ Watermark thẻ ví (đã dùng, asset `3606719d081640f73145640e612b071e`) |

### Vấn đề kỹ thuật của bộ hiện có

1. **Độ phân giải thấp**: nhân vật chỉ cao ~170–195px. Trên màn hình @3x, ảnh chỉ nét khi hiển thị ≤ ~65pt. Mọi vị trí lớn hơn (onboarding, success 140–180pt) sẽ mờ.
2. **Khung không đồng đều**: mỗi file một kích thước, nhân vật lệch vị trí → khi đổi mood, gấu "nhảy" và đổi cỡ.
3. **Tương phản với nền tối**: thân tím trên nền app `#110822` → viền chìm, nhất là ở cỡ nhỏ.
4. **Toàn thân quá nhỏ ở cỡ avatar**: ở 24–32pt không đọc được mặt.

---

## 3. Đặc tả kỹ thuật xuất file (áp dụng cho MỌI file mới và file làm lại)

| Hạng mục | Yêu cầu |
|---|---|
| Khung | **Vuông 1024×1024px** (master), nền trong suốt |
| Vị trí nhân vật | Căn giữa ngang; **đường chân đế cố định ở y = 940px**; đầu không vượt y = 60px |
| Vùng an toàn | Chừa ~6% mỗi cạnh; ký hiệu phụ (?, zzz, "…") nằm trong khung, không bị cắt |
| Định dạng | PNG 32-bit (RGBA). Nếu vẽ vector được → thêm SVG |
| Bản xuất cho app | `@1x` 128px · `@2x` 256px · `@3x` 384px (cỡ vừa) và bản 1024px cho màn hình lớn |
| Tối ưu | Nén PNG (TinyPNG/pngquant), mục tiêu < 80KB cho bản 384px |
| Rim light | Thêm viền sáng nhẹ (1–2px, tím nhạt `#B87AED` ~40%) ở mép phải/trên để tách khỏi nền tối |
| Bóng đổ | Không bake bóng đổ dưới chân vào file (app tự thêm nếu cần) |
| Đặt tên | `teddy_<loại>_<mood>@<scale>.png` — ví dụ `teddy_full_happy@3x.png`, `teddy_bust_waving@2x.png`, `teddy_line_sleepy.svg` |

**Ba "loại" (variant) cần có:**
- `full` — toàn thân (bộ hiện có, làm lại độ phân giải + khung).
- `bust` — chỉ đầu + vai, khung vuông, mặt chiếm ~70% khung. Dùng cho avatar 24–48pt.
- `line` — nét trắng một màu trên nền trong suốt (như file line-art hiện có), nét dày ≥ 2% chiều rộng khung để còn thấy ở cỡ nhỏ. Dùng cho watermark, nền thẻ, hoạ tiết.

---

## 4. Danh sách nguyên liệu cần tạo (theo ưu tiên)

### Ưu tiên CAO — cần cho demo 10/10

| # | File | Mô tả chi tiết | Dùng ở đâu |
|---|---|---|---|
| A1 | `full` × 11 mood dùng trong UI (waving, thinking, happy, exciting, proud, curious, confused, sleepy, surprised, embarrassed, sad) | Làm lại ở 1024×1024 theo mục 3, giữ nguyên tư thế hiện tại | Toàn app |
| A2 | `bust_waving` | Đầu + vai, mắt cười, một bàn tay vẫy lấp ló ở góc dưới phải; mặt nhìn thẳng | Avatar header Home, màn đăng nhập (nhỏ) |
| A3 | `bust_neutral` | Đầu + vai, mặt bình thản mỉm cười, không tay | Avatar T.E.D Bot trong chat, thông báo |
| A4 | `bust_thinking` | Đầu + vai, mắt nhìn lên, bong bóng "…" nhỏ góc trên phải | Chỉ báo "T.E.D đang trả lời" |
| A5 | `mustache_glyph` (SVG) | Chỉ hình bộ ria, một màu, dạng icon 24×24 viewBox | Loading spinner, dấu tích thành công, pull-to-refresh, favicon |

### Ưu tiên TRUNG BÌNH — nếu còn thời gian trước 10/10

| # | File | Mô tả chi tiết | Dùng ở đâu |
|---|---|---|---|
| B1 | `line` × 4 mood (waving, happy, sleepy, curious) | Phiên bản nét trắng của 4 mood, cùng phong cách file line-art hiện có nhưng **không có khung tròn** | Watermark thẻ, nền banner, trạng thái trống dạng nhẹ |
| B2 | `full_coin` | Gấu ôm một đồng xu vàng lớn có ký hiệu $ trước bụng, mặt hài lòng | Chế độ Cash, Simple Earn banner |
| B3 | `full_magnifier` | Gấu cầm kính lúp soi một biểu đồ đường nhỏ đi lên, vẻ tò mò | Onboarding xStocks, mục "What is an xStock?" |
| B4 | `full_sending` | Gấu đưa một phong bì/gói quà tím về phía trước | Gửi tiền P2P, màn gửi thành công |
| B5 | `peek_curious` | Chỉ nửa trên đầu + hai tay bám mép, như ló lên từ mép dưới khung | Cuối danh sách, trạng thái trống kiểu "ló đầu" |

### Ưu tiên THẤP — sau pitching

| # | File | Mô tả | Dùng ở đâu |
|---|---|---|---|
| C1 | `full_shield` | Gấu cầm khiên có ổ khoá | Bảo mật, sao lưu ví |
| C2 | `full_confetti` | Gấu nhảy giữa pháo giấy | Cột mốc đặc biệt (thay exciting) |
| C3 | App icon | Bust Teddy hoặc chỉ bộ ria trên nền gradient tím NED | Icon app, splash screen |
| C4 | Lottie | Hoạt ảnh 1–2 giây cho waving, thinking, happy | Thay ảnh tĩnh |
| C5 | Sticker pack | Dùng các mood angry/frustrated/crying/scared/laughing | Mạng xã hội, pitch deck, marketing |

---

## 5. Quy tắc sử dụng trong giao diện

### 5.1 Năm nguyên tắc

1. **Tối đa 1 mascot trên mỗi màn hình.**
2. **Không đặt mascot ở màn hình ra quyết định tiền**: nhập số tiền, Review/xác nhận, Swap, màn Buy/Sell xStocks. Mascot chỉ xuất hiện **trước** (khám phá, trống) hoặc **sau** (thành công, lỗi).
3. **Không gắn cảm xúc gấu với lãi/lỗ của người dùng.** Không có "gấu buồn khi danh mục giảm" hay "gấu phấn khích khi cổ phiếu tăng" — tránh thúc đẩy giao dịch theo cảm xúc, giữ hình ảnh "an toàn, đáng tin".
4. **Cảm xúc = trạng thái ứng dụng**: thành công, đang chờ, lỗi, trống, chào hỏi.
5. **Dùng hiếm để có giá trị**: `exciting` và `proud` chỉ cho "lần đầu" hoặc cột mốc.

### 5.2 Ba cỡ chuẩn

| Cỡ | Kích thước hiển thị | Variant | Ví dụ |
|---|---|---|---|
| `sm` | 24–32pt | `bust` | Avatar header, T.E.D Bot, thông báo |
| `md` | 72–96pt | `full` hoặc `peek` | Trạng thái trống, banner, badge thị trường |
| `lg` | 140–180pt | `full` (bản 1024px) | Onboarding, màn thành công |

### 5.3 Bảng gán mood → trạng thái

| Mood | Trạng thái / màn hình | Cỡ | Câu thoại gợi ý (EN, vì UI dùng tiếng Anh) |
|---|---|---|---|
| waving | Đăng nhập, onboarding; avatar header Home | lg / sm (bust) | "Hi, I'm Teddy!" |
| thinking | Đang lấy quote Jupiter; T.E.D đang trả lời | sm (bust) / md | "Finding the best price…" |
| happy | Success mua/bán xStocks, swap, gửi tiền | lg | "All done!" |
| exciting | Lần đầu đầu tư; tạo hồ sơ on-chain thành công | lg | "Your first investment!" |
| proud | Hoàn tất trắc nghiệm khẩu vị rủi ro; đặt username | md | "Nice, you're all set." |
| curious | Trống: chưa có khoản đầu tư, chưa có giao dịch | md | "Nothing here yet. Explore xStocks?" |
| confused | Không tìm thấy người nhận; tìm kiếm không có kết quả | md | "Hmm, I couldn't find that." |
| sleepy | Badge/banner "US market closed"; lời chào sau 22h | sm / md | "The US market is asleep." |
| surprised | Thông báo nhận tiền | sm / md | "You just received $20!" |
| embarrassed | Lỗi phía N.E.D (mạng, API timeout) | md | "Sorry, that's on us. Try again?" |
| sad | Giao dịch thất bại (KHÔNG dùng cho thua lỗ) | md | "That didn't go through." |

### 5.4 Ý tưởng tinh tế bổ sung

- **Bộ ria là ký hiệu thương hiệu thu nhỏ**: vòng loading (ria "nhún" lên xuống), dấu tích ở màn thành công, pull-to-refresh, icon app.
- **Kiểu "ló đầu" (peek)**: ở cuối danh sách hoặc trạng thái trống, chỉ hiện nửa đầu gấu từ mép dưới — nhẹ hơn toàn thân.
- **Chào theo giờ**: header dùng `waving` ban ngày, `sleepy` sau 22:00.
- **Watermark line-art**: đã áp dụng trên thẻ ví Home (góc dưới phải, opacity 0.3). Có thể mở rộng sang banner Simple Earn, thẻ "Your investments".

---

## 6. Vị trí cụ thể trong 6 màn hình demo (ưu tiên triển khai)

| # | Màn hình (artboard) | Vị trí | Mood / variant | Cỡ |
|---|---|---|---|---|
| 1 | `HomeV2` | Avatar header (thay icon gấu vẽ tay) | `bust_waving` | 40pt |
| 2 | `TEDBotV1` | Avatar T.E.D + chỉ báo đang gõ | `bust_neutral`, `bust_thinking` | 32–40pt |
| 3 | `XStockSuccess` | Thay vòng tròn dấu tích | `full_happy` | 150pt |
| 4 | `XStocksList` | Trạng thái trống (chưa đầu tư / không tìm thấy) | `full_curious` / `full_confused` | 88pt |
| 5 | `XStocksList`, `XStockDetail` | Badge / banner "US market closed" | `bust` hoặc `full_sleepy` | 24pt / 56pt |
| 6 | Màn lỗi chung | Lỗi mạng / giao dịch thất bại | `full_embarrassed` / `full_sad` | 120pt |

**Asset đã có trên canvas Design**: line-art `/_blob/3606719d081640f73145640e612b071e`; mascot cũ `/_blob/6aab8bb1ecb5e39c7537fa4a9799ea97` (không còn dùng trên thẻ ví).

---

## 7. Gợi ý triển khai code (React Native / Expo)

```ts
// src/components/Mascot.tsx
type Mood = 'waving' | 'thinking' | 'happy' | 'exciting' | 'proud' | 'curious'
          | 'confused' | 'sleepy' | 'surprised' | 'embarrassed' | 'sad';
type Variant = 'full' | 'bust' | 'line';
type Size = 'sm' | 'md' | 'lg';

const SIZE: Record<Size, number> = { sm: 32, md: 88, lg: 160 };

// require() tĩnh để Metro bundle đúng @2x/@3x
const ASSETS = {
  full: { happy: require('@/assets/mascot/teddy_full_happy.png'), /* ... */ },
  bust: { waving: require('@/assets/mascot/teddy_bust_waving.png'), /* ... */ },
} as const;

export function Mascot({ mood, variant = 'full', size = 'md' }:
  { mood: Mood; variant?: Variant; size?: Size }) {
  const src = ASSETS[variant]?.[mood] ?? ASSETS.full.happy;
  return <Image source={src} style={{ width: SIZE[size], height: SIZE[size] }}
                accessibilityIgnoresInvertColors accessible={false} />;
}
```

- Đặt file theo quy ước Metro: `teddy_full_happy.png`, `teddy_full_happy@2x.png`, `teddy_full_happy@3x.png` → Metro tự chọn theo mật độ màn hình.
- Mascot là trang trí: `accessible={false}`; thông điệp phải nằm trong text đi kèm, không chỉ trong hình.
- Ước tính công sức: 1–2 giờ (component + thay 6 vị trí). Lottie để sau pitching.

---

## 8. Checklist bàn giao nguyên liệu

- [ ] 11 file `full` làm lại ở 1024×1024, cùng chân đế, có rim light
- [ ] Bản xuất @1x/@2x/@3x cho 11 file `full`
- [ ] 3 file `bust` (waving, neutral, thinking) + bản xuất
- [ ] `mustache_glyph.svg`
- [ ] (Tuỳ chọn) 4 file `line` không khung tròn
- [ ] (Tuỳ chọn) B2–B5: coin, magnifier, sending, peek
- [ ] Đặt tên đúng quy ước mục 3, nén < 80KB/file 384px
- [ ] Cập nhật bảng màu mục 1 bằng mã màu lấy từ file gốc
- [ ] Đưa bộ mới lên canvas Design và thay vào 6 vị trí ở mục 6

---

## 9. Câu hỏi còn mở (cần chốt với đội)

1. **File gốc** của mascot ở định dạng nào (Procreate, PSD, AI, ảnh AI tạo)? Quyết định cách làm lại độ phân giải: xuất lại từ gốc, vẽ lại vector, hay upscale.
2. **T.E.D Bot = Teddy?** Nếu đồng ý, cần đổi avatar và lời chào của T.E.D Bot, và thống nhất câu chuyện trong pitch deck.
3. **Ai vẽ?** Thành viên thiết kế trong đội, hay dùng công cụ AI tạo ảnh (cần giữ đúng nhân vật theo mục 1)?
4. **Bản quyền nhân vật**: nếu mascot tạo bằng công cụ AI, kiểm tra điều khoản sử dụng thương mại của công cụ đó (thành viên pháp lý).

---

## 10. Câu mở đầu gợi ý cho cuộc hội thoại mới

> Đọc `claude/Mascot-Brief.md` trong Project N.E.D Wallet. Bộ mascot gốc ở thư mục `<thư mục mascot gốc>` (16 file PNG). Hãy bắt đầu với nhóm ưu tiên CAO ở mục 4: [chọn A1 / A2–A4 / A5]. File gốc của tôi ở định dạng [...].
