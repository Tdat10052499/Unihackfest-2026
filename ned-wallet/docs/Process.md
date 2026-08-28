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

### 🔹 [Phase 2 - Bước 1: Giao diện Home Tối giản & Luồng Thanh toán QR Solana Pay (World App/MiniPay Style)]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - Cài đặt `expo-camera`, `react-native-qrcode-svg`, `react-native-svg` và cập nhật quyền camera trong `app.json`.
  - Thiết kế lại màn hình chính [app/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/index.tsx) theo phong cách World App/MiniPay tối giản với số dư tổng cỡ lớn nằm ở trung tâm và 2 nút hành động chính: **'Gửi tiền (Scan QR)'** và **'Nhận tiền (My QR)'**.
  - **Tính năng Nhận tiền**: Mở Modal hiển thị mã QR Code tạo bởi `react-native-qrcode-svg` chứa địa chỉ ví Solana (Base58) kèm nút sao chép nhanh.
  - **Tính năng Gửi tiền**: Tích hợp `CameraView` mở camera quét mã QR, khi quét thành công sẽ in ra console và phát thông báo Alert địa chỉ ví đã quét.
- **Ghi chú:**
  - Hoàn thiện giao diện Home tối giản và tích hợp luồng Quét/Tạo mã QR thanh toán chuẩn Solana Pay.
