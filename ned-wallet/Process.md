# NHẬT KÝ TIẾN ĐỘ DỰ ÁN N.E.D (PROCESS LOG)

---

## 📌 Bảng phân loại Types (Log Conventions)
- `[SETUP]`: Khởi tạo môi trường, cấu hình ban đầu.
- `[CONFIG]`: Cấu hình hệ thống, Metro Bundler, resolver, polyfill.
- `[DEBUG / FIX]`: Sửa lỗi, khắc phục sự cố runtime/compile.
- `[FEAT]`: Xây dựng và phát triển tính năng mới.
- `[DOCS]`: Cập nhật tài liệu kỹ thuật, quy trình.

---

## 📝 Nhật ký Chi tiết Theo Giai đoạn

### 🔹 [Phase 0 - Setup & Polyfills Core]
- **Type:** `[SETUP]` | `[CONFIG]`
- **Nội dung:**
  - Khởi tạo bộ khung dự án bằng Expo SDK thuần.
  - Chuẩn hóa Package Manager bằng `pnpm`, cấp quyền `pnpm approve-builds`.
  - Cài đặt `@solana/web3.js` cùng các module thiết yếu (`react-native-get-random-values`, `buffer`, `text-encoding`).

---

### 🔹 [Phase 1 - Bước 1: Tích hợp Privy SDK & Cấu hình Polyfills Hoàn chỉnh]
- **Type:** `[FEAT]` | `[CONFIG]` | `[DEBUG / FIX]`
- **Nội dung chi tiết:**
  - Cài đặt `@privy-io/expo` và các peer dependencies tương thích Expo SDK 54 (`expo-secure-store`, `expo-application`, `expo-crypto`, `expo-apple-authentication`, `expo-clipboard`, `react-native-webview`, `viem`).
  - Tách luồng khởi động qua [index.js](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/index.js) $\rightarrow$ [polyfill.js](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/polyfill.js) $\rightarrow$ [app/_layout.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/_layout.tsx).
  - Khắc phục lỗi `Cannot read property 'slice' of undefined` và lỗi import Node standard libraries (`http`, `zlib`) bằng cách ánh xạ `jose` sang Browser build và polyfill an toàn `global.process.version`.

---

### 🔹 [Phase 1 - Bước 2: Khởi tạo Giao diện Đăng nhập Cơ bản]
- **Type:** `[FEAT]`
- **Nội dung chi tiết:**
  - Khởi tạo màn hình chính [app/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/index.tsx) tích hợp hook `usePrivy` và xử lý trạng thái hiển thị thông tin User ID, địa chỉ ví ngầm.

---

### 🔹 [Phase 1 - Bước 3: Cấu hình Thông tin Xác thực Thực tế (Privy App ID & Client ID)]
- **Type:** `[CONFIG]`
- **Nội dung chi tiết:**
  - Cập nhật file [app/_layout.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/_layout.tsx) với thông số xác thực thực tế (`appId="cmtd0fy9n00x20bjsrwz1bxh9"`, `clientId="client-WY6d4xXJ5k11vtbhmk6hTvrToEBHd8ogAfzBa8x6siAUR"`).

---

### 🔹 [Phase 1 - Bước 4: Hoàn thiện Luồng Đăng nhập Email OTP 2 Bước]
- **Type:** `[FEAT]` | `[DEBUG / FIX]`
- **Nội dung chi tiết:**
  - Chia luồng đăng nhập Email thành 2 bước: Nhập email lấy mã và Nhập mã OTP xác thực.

---

### 🔹 [Phase 1 - Bước 5: Cấu hình Sinh Ví Ngầm Chuyên Biệt Mạng Lưới Solana]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - Cấu hình thuộc tính `embedded.solana.createOnLogin: 'users-without-wallets'` trong [app/_layout.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/_layout.tsx).
  - Tích hợp hook `useEmbeddedSolanaWallet` và hàm trích xuất địa chỉ ví Solana dạng Base58 trong [app/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/index.tsx).

---

### 🔹 [Phase 1 - Bước 6: Hoàn Thiện Luồng Ký & Broadcast Giao Dịch Solana Devnet On-chain]
- **Type:** `[DEBUG / FIX]` | `[FEAT]`
- **Nội dung chi tiết:**
  - Khắc phục lỗi treo ký và hoàn thiện luồng Sign and Send Broadcast trực tiếp lên Solana Devnet.

---

### 🔹 [Phase 2 - Bước 1: Tái Cấu Trúc Toàn Bộ Giao Diện Theo Chuẩn UI MiniPay]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Header Component**: Badge chào mừng 'Welcome to N.E.D! 👋' và nút quét mã QR.
  - **Balance Card**: Thẻ xanh lá `#00A859` hiển thị số dư, switch USD/VND, 2 nút 'Deposit' / 'Withdraw' và nút chevron mở rộng Devnet Tools.
  - **Next Steps & Recent Activity**: Thẻ onboarding tiến trình 50% và danh sách lịch sử giao dịch.
  - **Bottom Navigation Bar**: 4 tabs (Home, Card, Send, Hub).

---

### 🔹 [Phase 2 - Bước 2: Thiết lập Local Caching (AsyncStorage) Tối Ưu Tốc Độ Hiển Thị]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - Cài đặt `@react-native-async-storage/async-storage` tương thích Expo SDK 54.
  - Xây dựng module [services/storage.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/storage.ts) với các helper: `cacheBalance()`, `getCachedBalance()`, `cacheActivities()`, `getCachedActivities()`.
  - Tích hợp nạp cache ngay lập tức trong `useEffect` khởi động của [app/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/index.tsx), loại bỏ hiện tượng màn hình trống.

---

### 🔹 [Phase 2 - Bước 3: Truy Xuất Lịch Sử Giao Dịch On-chain & Luồng Đồng Bộ Cache-then-Network]
- **Type:** `[FEAT]` | `[CONFIG]` | `[DEBUG / FIX]`
- **Nội dung chi tiết:**
  - **Khắc phục lỗi Rate-limit RPC**: Cơ chế lấy chữ ký `getSignaturesForAddress` siêu nhẹ kết hợp giải mã phân tán `Promise.allSettled` và metadata fallback từ `services/solana.ts`.
  - **Bóc tách hai chiều**: Phân loại giao dịch 'Nhận tiền' (xanh lá) và 'Chuyển tiền' (tối màu) dựa theo biến động số dư tài khoản.
  - **Cache-then-Network**: Hiển thị cache tức thì và âm thầm đồng bộ dữ liệu chuỗi ở chế độ nền.

---

### 🔹 [Phase 2 - Bước 4: Tích Hợp WebSocket Listener & Tối Ưu Hóa Chống Nghẽn 429 Khi Chuyển Tiền Liên Tiếp]
- **Type:** `[FEAT]` | `[CONFIG]` | `[DEBUG / FIX]`
- **Nội dung chi tiết:**
  - **Nguyên nhân lỗi 429**: Đồng thời broadcast tx và WebSocket callback làm spam RPC.
  - **Giải pháp**: Synchronous lock cho Camera Scanner, WebSocket Debounce 2s, Optimistic UI update, và Throttling 2.5s trong `services/solana.ts`.

---

### 🔹 [Phase 2 - Bước 5: Hoàn Thiện Ráp Nối Dữ Liệu UI, Pull-to-Refresh & Tối Ưu Trải Nghiệm Render (Anti-Flicker)]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Khớp nối State vào UI**: Gắn kết chính xác số dư `solBalance` (kèm quy đổi USD / VND linh hoạt) tại trung tâm Balance Card và ánh xạ mảng `activities` vào khối Recent Activity, bổ sung empty state khi chưa có giao dịch.
  - **Bổ sung Pull-to-Refresh**: Tích hợp component `RefreshControl` màu xanh lá `#00A859` cho `ScrollView`. Khi vuốt xuống sẽ kích hoạt làm mới toàn bộ số dư và lịch sử giao dịch on-chain tức thì.
  - **Tối ưu Render (Chống chớp giật màn hình)**: Kiểm tra so sánh sâu mảng dữ liệu mạng mới với mảng cache hiện tại qua `useRef`, loại bỏ hoàn toàn các lần re-render thừa khi dữ liệu không đổi.
- **Ghi chú:**
  - Hoàn thành Bước 4: Ráp nối luồng dữ liệu đồng bộ vào UI, thêm tính năng Pull-to-Refresh và tối ưu trải nghiệm hiển thị.
