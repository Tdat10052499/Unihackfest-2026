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
- **Type:** `[FEAT]` | `[CONFIG]` | `[DEBUG / FIX]`
- **Nội dung chi tiết:**
  - **Khắc phục lỗi Version & Metro Bundling**:
    - Đồng bộ chuẩn phiên bản cho Expo SDK 54: `expo-camera@~17.0.10`, `react-native-svg@15.12.1`, `react-native-get-random-values@~1.11.0`.
    - Chuẩn hóa cấu hình [metro.config.js](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/metro.config.js): Giữ danh sách `extraNodeModules` chuẩn cho Node shims (`stream`, `crypto`, `events`, `process`, `buffer`, `zlib`, `util`, `http`, `https`, `url`, `os`, `path`), và chuyển hướng `jose` sang Browser condition name.
    - Đã kiểm tra thực tế bằng lệnh bundle `npx expo export --platform ios` đạt thành công **100% (3,370 modules)** không còn bất kỳ lỗi nào.
  - **Cập nhật Giao diện Home MiniPay**:
    - Hiển thị số dư khả dụng to, rõ ràng ở trung tâm (`42px`).
    - 2 nút bấm hành động chính: **'Gửi tiền (Scan QR)'** (kích hoạt `CameraView` quét mã) & **'Nhận tiền (My QR)'** (hiển thị mã QR SVG chứa địa chỉ ví Solana Base58).
    - Tích hợp Modal quét QR và Modal nhận tiền đầy đủ tính năng sao chép bộ nhớ tạm.
- **Ghi chú:**
  - Hoàn thiện giao diện Home tối giản và tích hợp luồng Quét/Tạo mã QR thanh toán chuẩn Solana Pay.
