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
  - Sử dụng các State `email`, `otpCode`, và `step` (`'EMAIL_INPUT' | 'OTP_INPUT'`) để điều hướng giao diện.

---

### 🔹 [Phase 1 - Bước 5: Tích hợp và Hiển thị Địa chỉ Ví Ngầm (Embedded Wallet)]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - Cấu hình `embedded.ethereum.createOnLogin: 'users-without-wallets'` và `embedded.solana.createOnLogin: 'users-without-wallets'` trong [app/_layout.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/_layout.tsx) để tự động sinh ví ngầm khi đăng nhập.
  - Tích hợp hook `useEmbeddedEthereumWallet` cùng hàm trích xuất đa nguồn (`user.wallet`, `ethWallets`, `user.linked_accounts`).
  - Hiển thị đầy đủ User ID, địa chỉ ví ngầm (Embedded Wallet) và bổ sung nút khởi tạo thủ công nếu tài khoản chưa có ví.
- **Ghi chú:**
  - Bổ sung logic hiển thị và kiểm tra địa chỉ ví ngầm (Embedded Wallet) sau khi đăng nhập thành công.
