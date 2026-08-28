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
  - Khởi tạo màn hình chính [app/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/index.tsx) tích hợp hook `usePrivy` (`login`, `logout`, trạng thái `isReady`) với UI placeholder để kiểm thử luồng đăng nhập và sinh ví ngầm.
  - Xử lý trạng thái hiển thị thông tin User ID, địa chỉ ví ngầm (Embedded Wallet) khi đăng nhập thành công và nút Đăng xuất.
  - Tuyệt đối không sử dụng thư viện UI bên ngoài, sử dụng hoàn toàn React Native core components (`View`, `Text`, `Button`, `ActivityIndicator`, `StyleSheet`).
- **Kết quả đầu ra dự kiến:**
  - Màn hình chính render chuẩn xác trên Expo Go / Dev Client.
  - Sẵn sàng kiểm thử tương tác đăng nhập xác thực qua Privy SDK.
