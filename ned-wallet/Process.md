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

### 🔹 [Phase 1 - Bước 2: Cấu hình Sinh Ví Ngầm Chuyên Biệt Mạng Lưới Solana]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - Cấu hình thuộc tính `embedded.solana.createOnLogin: 'users-without-wallets'` trong [app/_layout.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/_layout.tsx).
  - Tích hợp hook `useEmbeddedSolanaWallet` và hàm trích xuất địa chỉ ví Solana dạng Base58 trong [app/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/index.tsx).

---

### 🔹 [Phase 1 - Bước 3: Hoàn Thiện Luồng Ký & Broadcast Giao Dịch Solana Devnet On-chain]
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

### 🔹 [Phase 2 - Bước 5: Ráp Nối Dữ Liệu UI, Pull-to-Refresh & Tối Ưu Trải Nghiệm Render (Anti-Flicker)]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Khớp nối State vào UI**: Gắn kết chính xác số dư `solBalance` (kèm quy đổi USD / VND linh hoạt) tại trung tâm Balance Card và ánh xạ mảng `activities` vào khối Recent Activity.
  - **Bổ sung Pull-to-Refresh**: Tích hợp component `RefreshControl` màu xanh lá `#00A859` cho `ScrollView`.
  - **Tối ưu Render (Chống chớp giật)**: So sánh sâu mảng dữ liệu mạng mới với mảng cache qua `useRef`, loại bỏ re-render thừa.

---

### 🔹 [Phase 2 - Bước 6: Tối Giản Bottom Sheet Deposit với 2 Luồng Nạp Chính]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - Tái cấu trúc Bottom Sheet nạp tiền [components/DepositModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/DepositModal.tsx), loại bỏ tùy chọn thẻ tín dụng/Stripe để giao diện tối giản và tập trung vào 2 khối chính (VNPAY và Solana Network QR).

---

### 🔹 [Phase 2 - Bước 7: Màn Hình Authentication Đa Phương Thức (Email OTP 2 Bước & Google OAuth)]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - Tích hợp hook `useLoginWithEmail` (`sendCode`, `loginWithCode`) và `useLoginWithOAuth` (`login({ provider: 'google' })`) từ `@privy-io/expo` trong [app/login.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/login.tsx).
  - Quản lý trạng thái 2 bước mượt mà:
    - **Bước 1 (Initial)**: Nhập Email với ô `TextInput` bo góc kèm icon hòm thư, nút 'Tiếp tục với Email', đường phân cách 'Hoặc' và nút 'Tiếp tục với Google'.
    - **Bước 2 (OTP Verification)**: Hiển thị thông báo email đích, ô nhập mã xác nhận 6 chữ số, nút 'Xác nhận & Đăng nhập' và nút Text 'Quay lại nhập email khác'.
  - Bọc form trong `KeyboardAvoidingView` và `ScrollView` giúp tương tác nhập liệu trơn tru trên mọi thiết bị di động.
  - Tự động điều hướng / chuyển đổi liền mạch sang màn hình chính [app/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/index.tsx) ngay khi xác thực thành công.

---

### 🔹 [Phase 2 - Bước 8: Thanh Tìm Kiếm Thông Minh (Debounce Lookup) Tra Cứu Ví Qua Supabase]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - Cài đặt `@supabase/supabase-js` và cấu hình client Supabase trong [services/supabase.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/supabase.ts).
  - Viết hàm `lookupWalletByPhone(phone)` chuẩn hóa định dạng số điện thoại (E.164 / `+84` / `0...`) và tra cứu địa chỉ ví Solana liên kết.
  - Xây dựng component [components/SendModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/SendModal.tsx) và màn hình [app/send.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/send.tsx):
    - **Cơ chế Debounce (500ms)**: Hoãn gọi API đến khi người dùng ngưng gõ, dọn dẹp timer qua `clearTimeout`.
    - **Phân loại định dạng**: Tự động nhận diện chuỗi Solana Base58 (32-44 ký tự) hoặc số điện thoại để kích hoạt tra cứu.
    - **UI phản hồi thông minh**: Hiển thị `ActivityIndicator` xoay nhẹ khi tra cứu, thẻ xanh nhạt 'Đã tìm thấy ví N.E.D' kèm địa chỉ rút gọn khi thành công, hoặc thông báo đỏ 'Số điện thoại này chưa liên kết ví N.E.D' khi không tìm thấy.
  - Tích hợp trực tiếp `SendModal` vào [app/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/index.tsx) phục vụ nút Withdraw, Tab Send và luồng quét mã QR Camera.

---

### 🔹 [Phase 2 - Bước 9: Module Liên Kết Số Điện Thoại (Phone Linking) với Mock OTP]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - Xây dựng component [components/PhoneLinkingModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/PhoneLinkingModal.tsx) dạng Bottom Sheet hiện đại.
  - **Kiểm tra trạng thái hiển thị**: Tự động kiểm tra `getLinkedPhone()` và `getHasSkippedPhoneLink()` trong `AsyncStorage` khi render Home ([app/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/index.tsx)), chỉ hiển thị khi người dùng chưa từng liên kết và chưa từng bấm 'Bỏ qua'.
  - **Bước 1 (Nhập SĐT)**: Ô nhập SĐT với cờ Việt Nam `🇻🇳 +84` và nút 'Nhận mã OTP'.
  - **Bước 2 (Mock OTP)**: Ô nhập mã 6 số, logic hardcode chấp thuận mã `123456` và cảnh báo lỗi khi nhập sai.
  - **Lưu trữ dữ liệu**: Gọi `linkPhoneNumber(userId, walletAddress, phone)` lưu vào bảng `phone_wallets` trên Supabase, đồng thời lưu `setLinkedPhone()` vào `AsyncStorage`.
  - **Tính năng Bỏ qua (Skip)**: Nút 'Bỏ qua' lưu cờ `setHasSkippedPhoneLink()` vào `AsyncStorage` để không hiển thị lại ở các phiên sau.

---

### 🔹 [Phase 2 - Bước 10: Quản Lý Số Điện Thoại (Cập Nhật & Hủy Liên Kết) Chuẩn Bảo Mật]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - Xây dựng component [components/PhoneManagementModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/PhoneManagementModal.tsx) và tích hợp vào thẻ Cài đặt / Next Steps trong [app/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/index.tsx).
  - **Giao diện Masked**: Hiển thị số điện thoại bị che một phần an toàn (VD: `+84 9xx xxx x78`) kèm badge "Đã xác minh".
  - **Luồng Thay đổi (Update)**: Mở luồng 2 bước (Nhập SĐT mới $\rightarrow$ Mock OTP `123456`), gọi `updatePhoneNumber()` trên Supabase và cập nhật `setLinkedPhone()` trong `AsyncStorage`.
  - **Luồng Hủy (Delete)**: Modal cảnh báo an ninh, yêu cầu người dùng gõ **chính xác 100% số điện thoại đầy đủ đang liên kết** để kích hoạt nút 'Hủy liên kết'. Gọi `unlinkPhoneNumber()` trên Supabase và `removeLinkedPhone()` khỏi `AsyncStorage`.
  - **Xử lý State UI**: Cập nhật trạng thái tức thì mà không cần tải lại ứng dụng.

---

### 🔹 [Phase 2 - Bước 11: Màn Hình Cài Đặt / Profile (Dark Theme & Quản Lý Tài Khoản)]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - Tạo mới file [app/settings.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/settings.tsx) với giao diện Dark Theme cao cấp (`#1E1F2E` / `#2A2C3E`):
    - **Header Cá nhân**: Avatar tròn gradient chữ 'Đ', trích xuất tên tài khoản Google/Email từ Privy, hiển thị số điện thoại liên kết kèm icon cây bút (chạm để mở `PhoneManagementModal`), badge `🟢 Google Backed up >`.
    - **Nhóm 1 (Tài chính & Lịch sử)**: Tùy chọn 'Local currency' (VND) và 'Transaction history' dẫn đến trang lịch sử.
    - **Nhóm 2 (Hiển thị)**: Hai switch 'Stealth mode' và 'Show empty pockets'.
    - **Nhóm 3 (Hỗ trợ & Tài khoản)**: Các mục Invite friends, FAQ, Contact support, About và Sign out (gọi hook `logout()` từ Privy và chuyển hướng về `/login`).
  - Cập nhật điều hướng tại Home ([app/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/index.tsx)) cho phép chạm vào Badge chào mừng hoặc avatar để chuyển sang màn hình Cài đặt mượt mà.
  - **Cấu hình Tab MiniApps**: Icon 4 ô vuông (`grid-outline`) ở vị trí Tab thứ 4 được dành riêng làm điểm chờ (Placeholder) cho trung tâm MiniApps Hub và sẽ được kích hoạt ở giai đoạn sau.

---

### 🔹 [Phase 2 - Bước 12: Tinh Chỉnh UI/UX Home & Di Chuyển Ví Solana Sang Settings]
- **Type:** `[DEBUG / FIX]` | `[FEAT]`
- **Nội dung chi tiết:**
  - **Dọn dẹp Home ([app/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/index.tsx))**: Xóa bỏ hoàn toàn Drawer menu 'Solana Devnet & Settings', nút chevron, và các biến state không cần thiết (`showDevnetDrawer`, `isCreatingWallet`, `signatureResult`), giúp giao diện Home tối giản và tập trung đúng chuẩn MiniPay.
  - **Cập nhật Settings ([app/settings.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/settings.tsx))**:
    - Trích xuất địa chỉ ví Solana ngầm Base58 của người dùng.
    - Hiển thị địa chỉ ví rút gọn (VD: `9hdn...Xw5p`) ngay bên dưới số điện thoại tại khu vực Header.
    - Tích hợp icon sao chép (`Feather name="copy"`), sử dụng `expo-clipboard` để sao chép ví và thông báo 'Đã sao chép địa chỉ ví Solana!'.

---

### 🔹 [Phase 2 - Bước 13: Xây Dựng Trang Lịch Sử Giao Dịch Toàn Diện (app/history.tsx)]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - Tạo mới màn hình [app/history.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/history.tsx) chứa toàn bộ các hoạt động giao dịch on-chain:
    - **Header Bar**: Nút quay lại (`<`), Tiêu đề và nút Làm mới dữ liệu.
    - **Thanh Tìm Kiếm (Search)**: Tra cứu nhanh theo số tiền, chữ ký tx hoặc nội dung.
    - **Bộ Lọc Danh Mục (Filter Pills)**: Lọc theo Tất cả, Nhận tiền, Chuyển tiền, Phần thưởng.
    - **Chi Tiết Giao Dịch**: Hiển thị biến động số dư, thời gian, sao chép nhanh Signature và liên kết mở trực tiếp trên Solana Explorer Devnet.
    - **Pull-to-Refresh**: Vuốt để tải lại lịch sử on-chain trực tiếp.
  - Cập nhật [app/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/index.tsx): Giới hạn hiển thị **tối đa 4 mục gần nhất** tại Recent Activity ở Home, nút 'View more' và chạm vào giao dịch chuyển hướng trực tiếp sang `/history`.
  - Cập nhật [app/settings.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/settings.tsx): Thêm mục 'Transaction history' trong menu Cài đặt để chuyển đến màn hình History.

---

### 🔹 [Phase 2 - Bước 14: Xây Dựng N.E.D Transfer Hub (app/transfer-hub.tsx)]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - Tạo mới màn hình [app/transfer-hub.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/transfer-hub.tsx) đóng vai trò trung tâm phương thức chuyển tiền Web3 thế hệ mới:
    - **Thẻ cốt lõi (Sẵn sàng)**: Chuyển tiền P2P & Số điện thoại (tích hợp `SendModal`).
    - **Thẻ 1 (In Development)**: Shake to Split (Lắc chia tiền qua Geolocation).
    - **Thẻ 2 (In Development)**: AirDrop Radar (Chuyển không chạm tầm gần).
    - **Thẻ 3 (In Development)**: Geo-Red Packet (Lì xì không gian bán kính 10m).
    - **Hiệu ứng Animation**: Tích hợp animation đàn hồi `Animated.spring` mượt mà khi nhấn vào từng thẻ.

---

### 🔹 [Phase 2 - Bước 15: Sửa Lỗi Mất Bottom Navigation & Xóa Bỏ Tab Explore Dư Thừa]
- **Type:** `[DEBUG / FIX]` | `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Cấu trúc Tab Router Chuẩn**: Di chuyển các màn hình chính vào `app/(tabs)/` bao gồm `app/(tabs)/index.tsx`, `app/(tabs)/card.tsx`, `app/(tabs)/transfer-hub.tsx`, `app/(tabs)/miniapps.tsx`.
  - **Xóa bỏ tab Explore**: Xóa file `app/(tabs)/explore.tsx` và gỡ bỏ route `explore` khỏi `app/(tabs)/_layout.tsx`, chuẩn hóa đúng 4 tab chính thức.
  - **Custom Tab Bar & Animated Sliding Indicator ([app/(tabs)/_layout.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/(tabs)/_layout.tsx))**:
    - Xây dựng component `CustomTabBar` với thanh ngang trượt (Sliding Indicator) màu xanh `#00A859` chạy mượt mà theo vị trí tab được chọn qua `Animated.spring`.
    - Tích hợp phản hồi xúc giác `Haptics.impactAsync` khi chuyển tab.
    - Cấu hình hiệu ứng chuyển cảnh `animation: 'shift'` trong `<Tabs>`.
  - **Dọn dẹp Header**: Loại bỏ nút Back trong `app/(tabs)/transfer-hub.tsx` và xóa bỏ bottom nav tĩnh trong `index.tsx`, đảm bảo trải nghiệm đồng nhất 100% qua Bottom Navigation.
  - **Định tuyến Root**: Cấu hình [app/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/index.tsx) tự động điều hướng `<Redirect href="/(tabs)" />`.

---

### 🔹 [Phase 2 - Bước 16: Đánh Chặn Điều Hướng Tab Card & Hiển Thị Thông Báo Đang Phát Triển]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Đánh chặn sự kiện (Event Interception)**: Tại `CustomTabBar` và `listeners.tabPress` của `<Tabs.Screen name="card" />` trong [app/(tabs)/_layout.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/(tabs)/_layout.tsx), gọi `e.preventDefault()` để chặn chuyển trang khi người dùng chạm vào tab Card.
  - **Kích hoạt thông báo**: Hiển thị hộp thoại `Alert.alert('Đang phát triển', 'Tính năng quản lý Thẻ N.E.D sẽ ra mắt trong bản cập nhật tới. Cùng đón chờ nhé!')`.
  - **Gợi ý trực quan (Visual Hint)**: Đặt độ mờ `opacity: 0.45` cho icon thẻ của tab Card để báo hiệu tính năng đang khóa tạm thời.
  - **Điều hướng Cài đặt**: Cập nhật Welcome Badge trên Header của [app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/(tabs)/index.tsx) điều hướng chuẩn xác sang màn hình Quản lý tài khoản [app/settings.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/settings.tsx).

---

### 🔹 [Phase 2 - Bước 17: Thiết Lập Định Vị & Hiện Diện Toàn Cục (Global Presence Provider cho Shake to Split)]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Cài đặt `expo-location`**: Tích hợp thư viện định vị GPS phần cứng chính thức của Expo.
  - **Global Presence Provider ([contexts/GlobalPresenceContext.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/contexts/GlobalPresenceContext.tsx))**:
    - Tự động xin quyền `Location.requestForegroundPermissionsAsync()`, xử lý an toàn không block luồng nếu người dùng từ chối.
    - Lắng nghe tọa độ liên tục qua `Location.watchPositionAsync` (khoảng cách 5 mét, thời gian 8 giây).
    - Tự động kết nối Supabase Presence Channel `global_radar` và đẩy dữ liệu định danh (`user_id`, `name`, `avatar`, `lat`, `lng`, `wallet_address`).
    - Tính toán khoảng cách (Haversine formula) và đồng bộ danh sách thiết bị xung quanh (`nearbyUsers`).
    - Quản lý bộ nhớ nghiêm ngặt: Hủy watcher và channel Supabase khi unmount hoặc đăng xuất.
  - **Bọc Root Layout ([app/_layout.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/_layout.tsx))**: Bọc `<GlobalPresenceProvider>` bên trong `<PrivyProvider>` ở cấp cao nhất của ứng dụng.

---

### 🔹 [Phase 2 - Bước 18: Sửa Lỗi Tương Thích Phiên Bản `expo-location` & Khắc Phục Lỗi Module RootLayout]
- **Type:** `[DEBUG / FIX]`
- **Nội dung chi tiết:**
  - **Nguyên nhân**: `expo-location` bị cài nhầm phiên bản `57.0.14` (dành cho SDK 57) trong khi dự án đang chạy Expo SDK 54, dẫn đến lỗi `TypeError: 0, _expo.createPermissionHook is not a function` khi bundle `app/_layout.tsx`.
  - **Giải pháp**:
    1. Chạy `npx expo install expo-location` hạ phiên bản về đúng chuẩn `19.0.8` tương thích hoàn hảo với Expo SDK 54.
    2. Cập nhật `app/_layout.tsx` chuẩn hóa cấu trúc `<Stack>` bọc `<GlobalPresenceProvider>` và `<PrivyProvider>`.
    3. Thêm cơ chế phòng thủ an toàn `try / catch` cho các hook Privy trên toàn bộ component.

---

### 🔹 [Phase 2 - Bước 19: Giai Đoạn 2 - Hoàn Thiện Shake to Split (Accelerometer, Lọc Bán Kính 20m & Mở Phòng Giao Dịch)]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Cài đặt & Lắng nghe Gia Tốc (`expo-sensors`)**: Cài đặt `expo-sensors@15.0.8`. Sử dụng `Accelerometer` theo dõi tổng gia tốc 3 chiều với ngưỡng $1.75$ và debounce 3 giây chống spam.
  - **Lọc Người Dùng Lân Cận (< 20m)**: Lọc danh sách thiết bị từ `nearbyUsers` của kênh `global_radar` theo khoảng cách Haversine $\le 20\text{m}$ (kèm demo peers fallback thông minh khi chạy môi trường dev).
  - **Host Bottom Sheet Modal ([app/(tabs)/transfer-hub.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/(tabs)/transfer-hub.tsx))**:
    - Trượt Bottom Sheet mượt mà khi người dùng lắc thiết bị (hoặc chạm trực tiếp vào thẻ Shake to Split).
    - Hiệu ứng Radar quét sóng, hiển thị danh sách Avatar, Tên và khoảng cách từng bạn bè kèm bộ chọn checkbox.
  - **Phát Sóng Lời Mời Broadcast (`room_invite`)**: Sinh `room_id` ngẫu nhiên và dùng Supabase Realtime Broadcast `room_invite` gửi payload (`room_id`, `host_name`, `host_avatar`, `target_user_ids`).
  - **Điều Hướng & Xây Dựng Màn Hình Phòng Giao Dịch ([app/shake-room.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/shake-room.tsx))**:
    - Tự động điều hướng Host sang `app/shake-room.tsx?roomId=[room_id]`.
    - Kết nối kênh Realtime `shake_room_[roomId]`, hiển thị danh sách thành viên trong phòng, tính toán chia đều hóa đơn (`amountPerPerson`), đẩy yêu cầu `bill_updated` và xác nhận thanh toán `member_paid`.

---

### 🔹 [Phase 2 - Bước 20: Xây Dựng Phase 3: Guest Bắt Sự Kiện `room_invite` & Tạo Khung Màn Hình Shake Room]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Lắng nghe Broadcast (Guest) ([contexts/GlobalPresenceContext.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/contexts/GlobalPresenceContext.tsx))**:
    - Bổ sung listener cho sự kiện broadcast `room_invite` trên Supabase Channel `global_radar`.
    - Kiểm tra danh tính: Bắt sự kiện khi `user.id` có mặt trong `payload.target_user_ids` và `payload.host_id !== user.id`.
  - **Popup Thông Báo Mời Chia Tiền**:
    - Kích hoạt `Alert.alert('🔔 Lời mời chia tiền', '[host_name] muốn chia hóa đơn chung với bạn')`.
    - Nút 'Từ chối': Đóng popup, không chuyển màn hình.
    - Nút 'Tham gia': Kích hoạt `router.push('/shake-room?roomId=' + payload.room_id)` đưa Guest gia nhập phòng tức thì.
  - **Khung Màn Hình Shake Room ([app/shake-room.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/shake-room.tsx))**:
    - Thiết kế chuẩn Dark Theme cao cấp (`#0F172A`, `#1E293B`).
    - Hiển thị tiêu đề **'Phòng giao dịch ảo'** kèm mã phòng `roomId` trích xuất từ URL parameters và nút sao chép nhanh.

---

### 🔹 [Phase 2 - Bước 21: Giai Đoạn 4 - Nhập Tiền Trước Khi Lắc, Phân Quyền Host/Guest & Đồng Bộ `payment_update`]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Màn Hình Transfer Hub (Khởi Tạo & Nhập Tiền Trước Khi Lắc)**:
    - Bổ sung ô `TextInput` nhập tổng hóa đơn kèm các nút preset nhanh (`100k`, `200k`, `500k`, `1M`) và ô ghi chú hóa đơn.
    - **Logic `handleShake()`**: Kiểm tra tổng tiền $> 0$, tính toán mức chia đều `splitAmount = Math.round(totalBill / (guestCount + 1))`, đính kèm số tiền này vào payload `room_invite`.
  - **Kiến Trúc Phân Quyền Shake Room ([app/shake-room.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/shake-room.tsx))**:
    - Khởi tạo kết nối vào channel cục bộ `room_[room_id]` qua Supabase Realtime.
    - Phân chia 2 luồng giao diện rõ ràng dựa trên `isHost` (`user.id === hostId`):
      - **Giao diện Host**: Thẻ Card lớn trung tâm **'Waiting...'** kèm thanh tiến độ thanh toán. Danh sách Guest hiển thị trạng thái mặc định **'Pending'** (màu vàng `#F59E0B`). Lắng nghe sự kiện `payment_update` để tự động chuyển sang **'Paid'** (màu xanh `#00A859`) trong thời gian thực.
      - **Giao diện Guest**: Hiển thị chính xác số tiền cần chia, thông tin Host và nút **'Thanh toán'** nổi bật. Khi nhấn, hiển thị loading, bắn event `payment_update` lên channel `room_[room_id]` và chuyển nút sang trạng thái vô hiệu hóa **'Đã thanh toán'**.

---

### 🔹 [Phase 2 - Bước 22: Di Chuyển Logic Nhập Tiền & Lắc Điện Thoại Vào Bên Trong Host Workspace Của Shake Room]
- **Type:** `[FEAT]` | `[CONFIG]` | `[DEBUG / FIX]`
- **Nội dung chi tiết:**
  - **Dọn dẹp Transfer Hub ([app/(tabs)/transfer-hub.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/(tabs)/transfer-hub.tsx))**:
    - Gỡ bỏ toàn bộ ô `TextInput` nhập tiền và listener `Accelerometer` khỏi màn hình Hub.
    - Chuyển thẻ 'Shake to Split' về component sạch sẽ, khi bấm sẽ sinh ngẫu nhiên `roomId` và chuyển hướng thẳng sang `app/shake-room.tsx?roomId=[roomId]&isHost=true`.
  - **Kiến Trúc Host Workspace ([app/shake-room.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/shake-room.tsx))**:
    - **Giai đoạn SETUP**: Ô `TextInput` to rõ ràng để Host nhập tổng tiền, kèm quét danh sách bạn bè xung quanh 20m từ `global_radar` và nút 'Mời tất cả'.
    - **Gia nhập Realtime**: Khi Guest tham gia `room_[roomId]`, avatar của Guest hiển thị trực tiếp lên phòng chờ của Host.
    - **Lắc thiết bị (Shake Trigger)**: Tích hợp `Accelerometer` (với debounce và auto-remove watcher sau khi lắc). Khi Host nhập tiền và lắc điện thoại (hoặc nhấn nút chốt), tính toán chia đều và phát sóng event `trigger_split` vào channel `room_[roomId]`, đồng thời chuyển Host sang giao diện quản lý 'Waiting...'.
  - **Kiến Trúc Guest Workspace**:
    - Khi vừa vào phòng: Hiển thị giao diện chờ 'Đang chờ Host chốt hóa đơn và lắc thiết bị... ⏳' cùng animation radar.
    - Khi nhận `trigger_split`: Tự động chuyển sang giao diện thanh toán số tiền chính xác, nút 'Thanh toán' bắn event `payment_update` cập trạng thái Host từ Pending sang Paid.
  - **Quản lý bộ nhớ**: Hủy sạch các subscriptions `Accelerometer` và Realtime channels khi component unmount.

---

### 🔹 [Phase 2 - Bước 23: Tự Động Kết Thúc Phòng Khi Host Đã Thu Đủ Tiền & Phát Sóng `room_closed`]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Lắng nghe Hoàn tất Phía Host ([app/shake-room.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/shake-room.tsx))**:
    - Sử dụng `useEffect` theo dõi danh sách Guest. Khi `guests.length > 0` và tất cả Guest đều có `status === 'paid'`, tự động hiển thị popup: `Alert.alert('Hoàn tất 🎉', 'Đã thu đủ tiền từ tất cả thành viên!')`.
  - **Xử lý Đóng phòng (`handleCloseRoom`)**:
    - Host gửi broadcast event `room_closed` lên channel `room_[roomId]`.
    - Điều hướng Host về `router.replace('/(tabs)/transfer-hub')`.
  - **Xử lý Giải tán Phía Guest**:
    - Guest lắng nghe sự kiện `room_closed` trên channel `room_[roomId]`.
    - Khi bắt được sự kiện, hiển thị thông báo popup `'Giao dịch hoàn tất, phòng đã đóng!'` và tự động điều hướng `router.replace('/(tabs)')`.
  - **Dọn dẹp Tài nguyên (Memory Cleanup)**:
    - Trong hàm cleanup của `useEffect`, gọi `channel.unsubscribe()`, `supabase.removeChannel(channel)` và gỡ bỏ `accelerometerSubRef` an toàn.

---

### 🔹 [Phase 2 - Bước 24: Nâng Cấp Giao Diện Quét Radar & Tích Chọn Từng Người (Checkbox)]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Quản lý State `selectedUserIds` ([app/shake-room.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/shake-room.tsx))**:
    - Thêm state `selectedUserIds: string[]` lưu danh sách ID người dùng được chọn.
    - Thêm hàm `toggleUserSelection(userId)` với phản hồi rung xúc giác `Haptics.impactAsync`.
  - **Giao diện Danh sách Bạn bè & Checkbox**:
    - Bọc từng item bạn bè trong `TouchableOpacity`.
    - Thêm icon `Ionicons` Checkbox (`checkbox` màu xanh `#00A859` khi chọn, `square-outline` màu `#64748B` khi chưa chọn).
    - Làm nổi bật viền và avatar xanh khi người dùng được tích chọn.
  - **Cập nhật Nút Hành động**:
    - Đổi nút thành `'Mời (X) người'` với `X = selectedUserIds.length`.
    - Tự động vô hiệu hóa (disabled & opacity 0.5) khi `selectedUserIds.length === 0`.
  - **Tối ưu Broadcast Payload**:
    - Gửi chính xác mảng `selectedUserIds` vào trường `target_user_ids` trong payload `room_invite` lên Supabase Realtime `global_radar`.

---

### 🔹 [Phase 2 - Bước 25: Gỡ Bỏ Mock Data & Hoàn Thiện Empty State Quét Radar Thời Gian Thực]
- **Type:** `[FEAT]` | `[CONFIG]` | `[DEBUG / FIX]`
- **Nội dung chi tiết:**
  - **Loại bỏ Mock Data**: Xóa bỏ hoàn toàn mảng `demoFallbackPeers` và danh sách thành viên giả lập. Hệ thống chỉ lấy danh sách thiết bị thực tế đang phát sóng tọa độ trên Supabase Presence `global_radar`.
  - **Giao diện Empty State Quét Radar**:
    - Khi không có thiết bị nào trong bán kính 20m (`candidateNearbyUsers.length === 0`), hiển thị icon radar bo tròn mờ `#64748B`, tiêu đề 'Chưa tìm thấy ai ở gần' và mô tả 'Đang liên tục rà quét tín hiệu thiết bị trong bán kính 20m...'.
    - Bổ sung `ActivityIndicator` màu tím nhạt `#8B5CF6` báo hiệu quá trình rà quét GPS đang hoạt động liên tục.
  - **Khóa nút Mời khi danh sách rỗng**: Nút 'Mời' bị vô hiệu hóa an toàn (`disabled={true}`, `opacity: 0.4`), ngăn ngừa gửi nhầm request với mảng `target_user_ids` rỗng.

---

### 🔹 [Phase 2 - Bước 26: Nâng Cấp Nút Thanh Toán Guest Với Xác Thực Số Dư & Giao Dịch Database ACID]
- **Type:** `[FEAT]` | `[CONFIG]` | `[DEBUG / FIX]`
- **Nội dung chi tiết:**
  - **Kiểm tra số dư (Validation)**:
    - Hiển thị spinner `ActivityIndicator` 'Đang trừ ví & xử lý...' chống bấm liên tiếp (double-click).
    - Kiểm tra số dư trên Supabase `wallets` (hoặc SOL cache quy đổi). Nếu `balance < amount`, hủy giao dịch và cảnh báo 'Số dư không đủ ❌'.
  - **Giao dịch Database ([services/supabase.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/supabase.ts))**:
    - Hàm `processTransferDB`: Thử gọi RPC `process_transfer` trên Supabase; nếu chưa cấu hình thì tự động fallback sang trừ tiền Guest và cộng tiền Host trong bảng `wallets`, đồng thời ghi log vào bảng `transactions`.
  - **Đồng bộ UI & Local Cache**:
    - Cập nhật số dư trong `AsyncStorage` (`cacheBalance`), thêm giao dịch mới vào `cacheActivities` để trang Home hiển thị số dư mới liền mạch.
  - **Phát sóng an toàn**: Chỉ phát sóng `payment_update` (status: 'paid') khi DB transaction hoàn tất thành công.

---

### 🔹 [Phase 2 - Bước 27: Hoàn Thiện Logic Thực Nhận, Nút Xác Nhận Thu Tiền Của Host & Ghi Nhận Lịch Sử]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Công thức tính toán**:
    - Tiền mỗi người: `splitAmount = totalBill / (guestCount + 1)`.
    - Tổng tiền Host cần thu: `splitAmount * guestCount`.
    - Tổng tiền đã thu realtime: `splitAmount * paidGuestsCount`.
  - **Giao diện Host (Card tổng kết & Nút Nhận tiền)**:
    - Render Card tổng hợp nổi bật hiển thị 'Đã thu được realtime' (màu xanh `#00A859`) và 'Tổng tiền cần thu'.
    - Nút 'Xác nhận & Nhận tiền' mặc định bị khóa (disabled/opacity 0.6) và **chỉ được bật** khi toàn bộ Guest trong danh sách hoàn tất thanh toán (`status === 'paid'`).
  - **Tách biệt Database Transactions & Ghi log Activities ([services/supabase.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/supabase.ts))**:
    - `processGuestPaymentDB`: Trừ tiền Guest và insert log `activities` (`type: 'send'`, title: 'Chuyển tiền Shake to Split', status: 'completed').
    - `processHostClaimDB`: Cộng tổng tiền đã thu vào ví Host và insert log `activities` (`type: 'receive'`, title: 'Nhận tiền Shake to Split', status: 'completed').
  - **Giải tán phòng an toàn**: Host sau khi nhận tiền sẽ phát sóng broadcast `room_closed` để tự động điều hướng tất cả thành viên về màn hình chính.

---

### 🔹 [Phase 2 - Bước 28: Tái Cấu Trúc Khớp Nối Ví Tổng (Main Wallet), Dọn Dẹp Schema & Chuẩn Hóa Dollar (USD)]
- **Type:** `[DEBUG / FIX]` | `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Dọn dẹp triệt để**: Xóa file `supabase_schema.sql`, gỡ bỏ toàn bộ code gọi đến các bảng và RPC giả lập (`wallets`, `activities`, `guest_pay_split`, `host_claim_split`).
  - **Cấu trúc Dữ liệu & Ví Tổng Thực Tế**:
    - Số dư ví tổng: Quản lý dựa trên **Solana Web3 Balance** (`getSolanaBalance`) và cache `AsyncStorage` (`cacheBalance`, `getCachedBalance`).
    - Lịch sử giao dịch ví tổng: Quản lý qua `fetchOnChainHistory` và cache `AsyncStorage` (`cacheActivities`, `getCachedActivities`).
    - Cơ sở dữ liệu Supabase: Chuyên biệt quản lý Identity/Phone linking (`phone_wallets`, `users`) và Realtime channels (`global_radar`, `room_[roomId]`).
  - **Khắc phục tiền tệ Dollar (USD)**:
    - Xóa bỏ 100% các ký hiệu 'VNĐ', 'VND', 'đ' trong `app/shake-room.tsx`.
    - Chuẩn hóa toàn bộ thành **Dollar ($ USD)** (Preset: `$5`, `$10`, `$20`, `$50`, `$100`; hiển thị `$XX.XX USD`).
  - **Khớp nối Trừ/Cộng tiền vào Ví Tổng**:
    - Khi Guest thanh toán: Kiểm tra số dư USD khả dụng trong ví tổng. Trừ trực tiếp số dư SOL/USD tương ứng qua `cacheBalance` và ghi log `ActivityItem` (`type: 'sent'`, amount: `-$XX.XX`) vào `cacheActivities`.
    - Khi Host nhận tiền: Cộng trực tiếp số dư SOL/USD đã thu vào ví tổng qua `cacheBalance` và ghi log `ActivityItem` (`type: 'received'`, amount: `+$XX.XX`) vào `cacheActivities`.
    - Khi quay về màn hình chính (`HomeScreen`), số dư và lịch sử giao dịch tức thì cập nhật đồng bộ và chính xác.

---

### 🔹 [Phase 2 - Bước 29: Thực Thi Giao Dịch Web3 On-Chain Solana Devnet Thực Tế Cho Shake to Split]
- **Type:** `[FEAT]` | `[DEBUG / FIX]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Truyền Địa Chỉ Ví On-Chain**:
    - Host truyền `host_wallet` (Solana Base58 address) trong payload `room_invite` ([contexts/GlobalPresenceContext.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/contexts/GlobalPresenceContext.tsx)) và trong sự kiện broadcast `trigger_split` ([app/shake-room.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/shake-room.tsx)).
    - Mọi thành viên tự động đồng bộ địa chỉ ví on-chain thông qua Supabase Presence `wallet_address`.
  - **Ký & Thực Thi Giao Dịch Chuỗi On-Chain (Guest Payment)**:
    - Chuyển đổi số tiền Dollar sang SOL lamports theo tỷ giá hệ thống `1 SOL = $150 USD`: `solAmount = paymentAmountUSD / 150`, `lamports = Math.floor(solAmount * 1e9)`.
    - Kiểm tra số dư SOL on-chain trên mạng lưới Solana Devnet qua `solanaConnection.getBalance()`.
    - Tạo giao dịch `SystemProgram.transfer({ fromPubkey: guestPubkey, toPubkey: hostPubkey, lamports })`.
    - Lấy recent blockhash và gọi Provider của Privy `useEmbeddedSolanaWallet().wallets[0].getProvider()` để ký số giao dịch `signTransaction`.
  - **Chờ Xác Nhận Mạng Lưới (Await Confirmation Receipt)**:
    - Broadcast transaction qua `solanaConnection.sendRawTransaction(rawBytes)`.
    - Sử dụng `solanaConnection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')` chờ biên lai xác nhận on-chain được đưa vào block.
  - **Xác Nhận Realtime & Ghi Lịch Sử**:
    - **Chỉ khi giao dịch on-chain thành công và có chữ ký `txSignature` hợp lệ**, Guest mới bắn broadcast `payment_update` (kèm `tx_signature`) lên channel `room_[roomId]`.
    - Ghi nhận lịch sử hoạt động vào ví đính kèm `signature: txSignature` để đối soát minh bạch trên Solana Explorer.

---

### 🔹 [Phase 2 - Bước 30: Tinh Chỉnh UI/UX Chuẩn FinTech Quốc Tế, Ẩn Thuật Ngữ Kỹ Thuật & Tối Ưu Loading Modal]
- **Type:** `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Ẩn hoàn toàn thuật ngữ Blockchain**:
    - Xóa bỏ tất cả các chuỗi mã băm `Tx: ...`, chữ ký số `Signature`, địa chỉ ví raw, hay các từ khóa kỹ thuật `(On-Chain)`, `(SOLANA ON-CHAIN)`, `(Solana Devnet)` khỏi toàn bộ giao diện và thông báo.
    - Rút gọn mã phòng thành mã ngắn thanh lịch (VD: `MÃ PHÒNG: #8A4F1E9C`).
  - **Chuẩn hóa Hiển thị Tiền Tệ**:
    - Gỡ bỏ chữ `SOL` và các phép quy đổi token kỹ thuật trên UI; chỉ hiển thị định dạng Dollar (`$5.00`, `$20.00`, `$50.00`).
    - Logic ký và gửi SOL on-chain vẫn vận hành 100% ngầm bên dưới an toàn và chuẩn xác.
  - **Loading Overlay Toàn Màn Hình Thân Thiện**:
    - Thiết kế `Modal` Loading toàn màn hình với hiệu ứng mờ nền tối sang trọng, spinner xoay mượt mà cùng thông điệp: *'Đang xử lý thanh toán... Vui lòng giữ ứng dụng và chờ trong giây lát'*.
  - **Thông Báo Tối Giản (Minimalist Alerts)**:
    - Khi thanh toán thành công: Hiển thị thông báo ngắn gọn *'Thành công! 🎉 - Thanh toán thành công!'*.
    - Khi Host thu đủ tiền: Hiển thị *'Thu tiền hoàn tất 🎉 - Đã thu đủ $X.XX từ các thành viên!'*.

---

### 🔹 [Phase 2 - Bước 31: Chuyển Source of Truth Định Danh Sang Supabase, Xử Lý Lỗi Cập Nhật Ảo & Khắc Phục Chuyển Tiền Qua SĐT]
- **Type:** `[DEBUG / FIX]` | `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Chuyển Source of Truth sang Supabase (Khởi động ứng dụng)**:
    - Tại `useEffect` khởi động khi người dùng đăng nhập (`isReady && user`), ứng dụng gọi trực tiếp hàm `getUserPhoneNumberFromDB(user.id)` truy vấn `SELECT phone_number FROM phone_wallets WHERE user_id = [user.id]`.
    - Nếu DB đã có bản ghi, ứng dụng lập tức đồng bộ vào State và Local Storage (`setLinkedPhoneState`, `setLinkedPhone`), đồng thời **tuyệt đối không hiển thị lại modal liên kết SĐT**, giải quyết triệt để lỗi mất đồng bộ khi cài lại ứng dụng hoặc đăng nhập thiết bị mới.
  - **Khắc phục triệt để lỗi cập nhật UI ảo tại Form SĐT**:
    - Tái cấu trúc hàm `linkPhoneNumber` và `updatePhoneNumber` với lệnh `UPSERT` (onConflict: `user_id`) lên Supabase `phone_wallets`, đồng thời kiểm tra trùng lặp SĐT với tài khoản khác trước khi ghi.
    - Tại [components/PhoneLinkingModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/PhoneLinkingModal.tsx) và [components/PhoneManagementModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/PhoneManagementModal.tsx), bắt buộc `await` phản hồi từ DB và kiểm tra `!res.error`. Chỉ khi database xác nhận thành công mới cập nhật UI và lưu cache; nếu thất bại lập tức hiển thị Alert báo lỗi và giữ người dùng ở lại form để chỉnh sửa.
  - **Hoàn thiện cơ chế Phone-to-Wallet Resolution cho Chuyển tiền qua SĐT**:
    - Viết hàm `getPhoneVariants(phone)` tạo tập hợp các định dạng số điện thoại phổ biến (`+84...`, `0...`, `84...`, chuỗi số thuần) và thực hiện tra cứu bằng toán tử `.in('phone_number', variants)` trên bảng `phone_wallets`.
    - Tại [components/SendModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/SendModal.tsx), [app/send.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/send.tsx), và `handleSendTransaction` tại [app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/index.tsx): Khi người dùng nhập SĐT đích, hệ thống tự động resolve ra địa chỉ ví Solana Base58 tương ứng trước khi khởi tạo `SystemProgram.transfer`, hoặc thông báo lỗi rõ ràng *'Không tìm thấy ví liên kết với số điện thoại này'* nếu SĐT chưa được đăng ký.

---

### 🔹 [Phase 2 - Bước 32: Tái Cấu Trúc Toàn Bộ Luồng Chuyển Tiền Tiêu Chuẩn 100% On-Chain Solana Devnet & Quản Lý Trạng Thái Giao Dịch]
- **Type:** `[FEAT]` | `[DEBUG / FIX]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Dọn dẹp hoàn toàn can thiệp Off-chain**: Loại bỏ 100% các lệnh `supabase.update()` can thiệp số dư ví tổng; toàn bộ số dư được quản lý trực tiếp on-chain từ Solana Devnet.
  - **Module hóa Web3 On-Chain Core (`executeSolanaTransfer` trong [services/solana.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/solana.ts))**:
    - Phân giải địa chỉ đích: Tự động nhận diện chuỗi Solana Base58 hoặc gọi Supabase tra cứu SĐT ra ví đích.
    - Kiểm tra số dư SOL và phí gas an toàn trên mạng lưới Solana Devnet qua `solanaConnection.getBalance()`.
    - Khởi tạo giao dịch `SystemProgram.transfer`, lấy latest blockhash, và ký số qua Provider Privy `signTransaction`.
    - Broadcast transaction `sendRawTransaction` và sử dụng `confirmTransaction` với cam kết `confirmed` để chờ biên lai khối on-chain hoàn tất.
  - **Đồng bộ hóa toàn diện các màn hình & Modal Chuyển tiền**:
    - Áp dụng `executeSolanaTransfer` trên toàn bộ luồng: [app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/index.tsx), [app/(tabs)/transfer-hub.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/transfer-hub.tsx), [components/SendModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/SendModal.tsx), và [app/send.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/send.tsx).
    - Quản lý trạng thái giao dịch: Hiển thị thông điệp trực quan *'Đang chờ mạng lưới xác nhận...'* và spinner xoay mượt mà.
    - Ghi log Lịch sử: **Chỉ khi giao dịch on-chain thành công và có chữ ký `txSignature` hợp lệ**, hệ thống mới ghi nhận bản ghi `ActivityItem` (kèm chữ ký tx) vào Recent Activities.
    - Xử lý lỗi toàn diện: Bắt trọn các trường hợp người dùng hủy ký giao dịch hoặc ví không đủ phí gas.

---

### 🔹 [Phase 2 - Bước 33: Nâng Cấp Recent Activities Phân Tích & Hiển Thị Chuẩn Xác 4 Giao Dịch Mới Nhất Mọi Loại On-Chain]
- **Type:** `[FEAT]` | `[CONFIG]` | `[DEBUG / FIX]`
- **Nội dung chi tiết:**
  - **Giải mã On-Chain Toàn Diện 4 Giao Dịch Đầu**:
    - Mở rộng phân tích toàn bộ `signaturesInfo.slice(0, 4)` qua `Promise.allSettled(solanaConnection.getParsedTransaction(...))`.
    - Tính toán biến động số dư thực tế `balanceDiffLamports = postBalance - preBalance` cho từng giao dịch:
      - **Nhận tiền (Receive)**: `balanceDiffLamports > 0` $\rightarrow$ `type: 'received'`, `title: 'Nhận tiền'`, `amount: +$X.XX`, `isPositive: true`, icon mũi tên chỉ xuống màu xanh lá `#10B981`.
      - **Chuyển tiền (Send)**: `balanceDiffLamports < 0` $\rightarrow$ `type: 'sent'`, `title: 'Chuyển tiền'`, `amount: -$X.XX`, `isPositive: false`, icon mũi tên chéo lên màu tối `#374151`.
      - **Tương tác Web3 khác**: `type: 'sent'`, `title: 'Tương tác Web3'`, `amount: -$0.00`, icon xám `#64748B`.
      - **Giao dịch lỗi**: `type: 'sent'`, `title: 'Giao dịch lỗi'`, icon đỏ `#DC2626`.
  - **Chuẩn hóa Định dạng Tiền Tệ**:
    - Đồng bộ thống nhất định dạng tiền tệ Dollar quốc tế (`+$5.00`, `-$1.50`, `+$0.25`, v.v.) trên toàn bộ [services/solana.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/solana.ts), [app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/index.tsx), [app/(tabs)/transfer-hub.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/transfer-hub.tsx) và [app/send.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/send.tsx).
  - **Hiển thị 4 Giao Dịch Mới Nhất Tại Trang Chủ**:
    - Giữ trọn vẹn danh sách 4 giao dịch mới nhất trong `activities.slice(0, 4)`, tự động cập nhật ngay khi nhận được tín hiệu WebSocket hoặc giao dịch chuyển khoản thành công.

---

### 🔹 [Phase 2 - Bước 34: Khắc Phục Triệt Để Lỗi Ký Giao Dịch Shake to Split & Tái Cấu Trúc Luồng Guest Pay On-Chain]
- **Type:** `[DEBUG / FIX]` | `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Nguyên nhân lỗi `Operation reached timeout: user-signer:sign`**: Màn hình `app/shake-room.tsx` tự triển khai luồng ký thủ công riêng biệt, không có cơ chế timeout retry và không sử dụng core `executeSolanaTransfer`.
  - **Khắc phục & Đồng bộ Core `executeSolanaTransfer`**:
    - Bổ sung cơ chế **Tự Động Retry Ký Giao Dịch**: Khi signer gặp lỗi timeout (`user-signer:sign`), hệ thống tự động nghỉ 500ms, làm mới `recentBlockhash` và kích hoạt ký lại lần 2 trước khi báo lỗi.
    - Chuyển đổi toàn bộ hàm `handleGuestPay` trong [app/shake-room.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/shake-room.tsx) sang gọi hàm Web3 chuẩn `executeSolanaTransfer`.
    - Đảm bảo quy trình On-chain 100%: Kiểm tra số dư SOL $\rightarrow$ Ký số bảo mật $\rightarrow$ Broadcast Solana Devnet $\rightarrow$ Chờ xác nhận biên lai (`confirmTransaction`) $\rightarrow$ Ghi log ví $\rightarrow$ Bắn sự kiện realtime `payment_update` cho Host.

---

### 🔹 [Phase 2 - Bước 35: Khắc Phục Lỗi Hook Lifecycle & Tối Ưu Provider Resolution Cho Privy Embedded Solana Signer]
- **Type:** `[DEBUG / FIX]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Khắc phục Hook Lifecycle**: Chuyển các hook `usePrivy` và `useEmbeddedSolanaWallet` trong [app/shake-room.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/shake-room.tsx) lên cấp cao nhất của component, loại bỏ khối `try / catch` sai chuẩn React Hook.
  - **Tối ưu Dynamic Provider Resolution ([services/solana.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/solana.ts))**:
    - Truyền trực tiếp ví đối tượng `solanaWalletState.wallets[0]` vào `executeSolanaTransfer`.
    - Cơ chế tự động giải quyết Provider (`getProvider()`) động cả ở lượt gọi đầu tiên và khi cần retry nếu WebView kết nối lại, khắc phục triệt để lỗi `Embedded wallet WebView failed to become ready`.

---

### 🔹 [Phase 2 - Bước 36: Triệt Tiêu Cơn Bão Tin Nhắn WebSocket Presence & Giải Phóng Bridge Cho Privy Signer]
- **Type:** `[DEBUG / FIX]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Phát hiện Nguyên nhân Cốt lõi của Timeout**:
    - Trong [contexts/GlobalPresenceContext.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/contexts/GlobalPresenceContext.tsx), `trackPresence` liên tục chèn `updated_at: new Date().toISOString()` và kích hoạt liên hồi mỗi vài trăm ms khi có thay đổi nhỏ về vị trí hoặc re-render.
    - Việc này tạo ra **cơn bão tin nhắn Realtime Presence** (liên tục Join/Leave/Sync giữa các thiết bị) làm bão hòa (100% saturation) luồng JavaScript Bridge của React Native.
    - Cổng giao tiếp Bridge của `react-native-webview` (nơi Privy nhúng user-signer) bị nghẽn sau hàng trăm sự kiện Presence, khiến `signTransaction` không thể gửi nhận dữ liệu và rơi vào trạng thái timeout (`user-signer:sign`).
  - **Giải Pháp Xử Lý Triệt Để**:
    - **Throttle Geolocation Presence**: Chỉ gửi update Presence khi người dùng thực sự di chuyển **$\ge 10$ mét** hoặc sau nhịp tim **$45$ giây**.
    - Loại bỏ trường `updated_at` biến thiên ép buộc khỏi payload Presence, chấm dứt hoàn toàn hiện tượng Presence Flapping.
    - Giãn cách chu kỳ `Location.watchPositionAsync` lên $15$ giây và khoảng cách $10$ mét.
    - Đảm bảo luồng JS Bridge luôn thông thoáng, cho phép Privy Signer xử lý yêu cầu ký giao dịch tức thì.

---

### 🔹 [Phase 2 - Bước 37: Đồng Bộ Custom Hook `useTransferToken`, Loại Bỏ Xung Đột Native Modal & Chuẩn Hóa Wallet Readiness Check]
- **Type:** `[FEAT]` | `[DEBUG / FIX]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Xây dựng Custom Hook `useTransferToken` ([hooks/useTransferToken.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/hooks/useTransferToken.ts))**:
    - Đóng gói toàn bộ logic On-chain Transfer, Provider extraction, và kiểm tra tính sẵn sàng `isWalletReady` (`isReady && user && status === 'connected' && wallets.length > 0`).
    - Trả về hàm `transfer()`, cờ `isTransferring`, trạng thái `walletStatus`, và chuỗi tiến trình `statusMessage`.
  - **Đồng bộ hóa 100% toàn bộ ứng dụng**:
    - Thay thế toàn bộ logic gọi Web3 phân tán tại [app/shake-room.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/shake-room.tsx), [app/send.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/send.tsx), [app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/index.tsx), và [app/(tabs)/transfer-hub.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/transfer-hub.tsx) bằng `useTransferToken`.
  - **Loại bỏ Xung đột Native `<Modal>` gây đóng băng WebView**:
    - Thay thế `<Modal visible={isGuestPaying}>` bằng `<View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>`.
    - Ngăn chặn việc tạo Native Window Hierarchy mới trên Android/iOS làm pause/throttle WebView của Privy chạy ở Root Layout.
  - **Kiểm tra trạng thái Ready chặt chẽ**:
    - Bắt buộc kiểm tra `isWalletReady` trước khi khởi tạo giao dịch; nếu ví nhúng đang trong giai đoạn `connecting`/`reconnecting`, hiển thị thông báo hướng dẫn người dùng chờ 2-3 giây hoàn tất handshaking.

---

### 🔹 [Phase 2 - Bước 38: Tối Ưu Memoize Provider Context, Khóa Nút Thanh Toán Đến Khi Sẵn Sàng & Giám Sát Mount State]
- **Type:** `[FEAT]` | `[DEBUG / FIX]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Bảo toàn Provider Context với `useMemo` ([contexts/GlobalPresenceContext.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/contexts/GlobalPresenceContext.tsx))**:
    - Bọc `contextValue` của `GlobalPresenceProvider` bằng `React.useMemo`, ngăn ngừa việc tạo object reference mới gây re-render cascading xuống các màn hình con trong Navigation Stack.
  - **Giám sát State của Ví khi Mount ([app/shake-room.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/shake-room.tsx))**:
    - Thêm log `🔍 [ShakeRoom Mount Check]` ghi nhận chi tiết `isReady`, `authenticated`, `userId`, `walletsCount`, `walletStatus`, và địa chỉ `firstWalletAddress` ngay khi màn hình khởi tạo.
  - **Khóa Nút Thanh Toán (Disable until Ready)**:
    - Nút 'Thanh toán' của Guest tự động bị khóa (`disabled={!isWalletReady}`) và hiển thị spinner kèm text `'Đang kết nối ví...'` cho đến khi `isReady === true` và `wallets.length > 0`.
    - Khi ví sẵn sàng, nút lập tức chuyển sang trạng thái kích hoạt với nhãn `'Thanh toán $XX.XX'`.
  - **Mapping Chính Xác Wallet Object**:
    - `useTransferToken` đảm bảo trỏ trực tiếp vào `wallets[0]` (đối tượng ví hiện tại của người dùng) để ký, loại bỏ hoàn toàn các trường hợp truyền tham số null/undefined.

---

### 🔹 [Phase 2 - Bước 39: Tích Hợp Luồng Khôi Phục Ví Embedded Wallet (Needs Recovery), Modal Cảnh Báo Thiết Bị Mới & Cấu Hình Android `minSdkVersion: 24`]
- **Type:** `[FEAT]` | `[DEBUG / FIX]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Cấu hình Android `minSdkVersion: 24` ([app.json](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app.json))**:
    - Cài đặt plugin `expo-build-properties` và thiết lập `android.minSdkVersion: 24` trong `app.json`, bảo đảm WebView của Android hỗ trợ đầy đủ các hàm mã hóa bảo mật và WebCrypto phục vụ luồng khôi phục ví.
  - **Phát hiện Trạng thái Needs Recovery**:
    - Trong `useTransferToken`, mở rộng kiểm tra trạng thái từ cả `useEmbeddedSolanaWallet()` và `useEmbeddedWallet()`: `needsRecovery = status === 'needs-recovery' || embeddedWalletState?.status === 'needs-recovery'`, xuất cờ `needsRecovery`, hàm `recoverWallet` và cờ `isRecovering`.
  - **Xây dựng UI/UX Khôi Phục Ví Chuyên Dụng ([components/WalletRecoveryModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/WalletRecoveryModal.tsx)) & Alert Banner Home**:
    - Banner cảnh báo nổi bật tại Home: *"Thiết bị mới phát hiện ⚠️. Cần khôi phục ví bảo mật để tiếp tục giao dịch."*
    - Modal sang trọng Dark Theme với icon chìa khóa bảo mật màu cam `#F59E0B`.
    - Cung cấp 3 phương thức khôi phục từ Privy SDK:
      1. Khôi phục tự động (Cloud / Privy Sync) qua `recover({ recoveryMethod: 'privy' })`.
      2. Khôi phục qua Google Drive qua `recover({ recoveryMethod: 'google-drive' })`.
      3. Khôi phục bằng Mật khẩu / Passcode qua `recover({ recoveryMethod: 'user-passcode', password })`.
  - **Cập nhật Nút Hành động & Chặn Giao Dịch Lỗi**:
    - Khi ví rơi vào trạng thái `needsRecovery`, nút thanh toán trong `shake-room.tsx`, `send.tsx`, `SendModal.tsx`, và `transfer-hub.tsx` chuyển sang màu vàng hổ phách `#F59E0B` với icon chìa khóa và nhãn **'Khôi phục ví bảo mật'**.
    - Nhấn nút sẽ kích hoạt `WalletRecoveryModal` thay vì gọi `sendTransaction` / `executeSolanaTransfer`, loại bỏ hoàn toàn nguy cơ crash WebView.

---

### 🔹 [Phase 2 - Bước 40: Khắc Phục Treo WebView Android, Thêm Hàm Hard Reset Session, Debounce 800ms & Kiểm Tra Embedded Wallet]
- **Type:** `[DEBUG / FIX]` | `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Bảo Toàn Hierarchy của PrivyProvider ([app/_layout.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/_layout.tsx))**:
    - Xác nhận `<PrivyProvider>` bọc ở tầng cao nhất của toàn bộ ứng dụng, hoàn toàn không bị unmount hay re-render khi chuyển trang trong Navigation Stack.
  - **Xây Dựng Hàm Hard Reset Dọn Dẹp Sâu Corrupted State (`executeHardReset` trong [services/storage.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/storage.ts))**:
    - Xử lý timeout an toàn cho `logout()` của Privy (bọc `try / catch` và `Promise.race` 2.5s bỏ qua lỗi timeout `mfa:clear` khi WebView bị treo).
    - Chạy `await AsyncStorage.clear()` xóa sạch 100% dữ liệu local state bị corrupted để ép Privy cấp lại phiên hoàn toàn mới.
    - Tích hợp nút **"Reset phiên ví & Dọn dẹp"** trong [app/settings.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/settings.tsx) và nút khẩn cấp trong [app/login.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/login.tsx).
  - **Tạo Độ Trễ An Toàn 800ms (Debounce Main Thread)**:
    - Tại `handleBarCodeScanned` trong [app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/index.tsx), bọc việc mở `SendModal` sau khi quét QR trong `setTimeout(800ms)`, ngăn ngừa việc tắt CameraView và mở Modal ký cùng lúc làm bão hòa Main Thread trên Android.
    - Thêm khoảng nghỉ an toàn 800ms trong `useTransferToken.ts` và 500ms trong `services/solana.ts` trước khi gọi `signTransaction`.
  - **Kiểm Tra Xác Thực Embedded Wallet Trước Khi Ký ([hooks/useTransferToken.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/hooks/useTransferToken.ts))**:
    - Ghi log chi tiết `console.log('🔍 [Privy LinkedAccounts]:', JSON.stringify(linkedAccounts, null, 2))`.
    - Kiểm tra `type === 'wallet'` và `walletClientType === 'privy'` hoặc `wallets.length > 0`. Nếu không thỏa mãn, lập tức báo lỗi *'Không tìm thấy ví hợp lệ'*, chặn đứng việc gọi ký khi thiếu key.

---

### 🔹 [Phase 2 - Bước 41: Tối Ưu Hóa Kích Thước Viewport Layout Gốc, Tích Hợp InteractionManager & Fallback Reset Session]
- **Type:** `[DEBUG / FIX]` | `[FEAT]` | `[CONFIG]`
- **Nội dung chi tiết:**
  - **Khắc Phục Kích Thước Viewport 0x0 Trên Android ([app/_layout.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/_layout.tsx))**:
    - Bọc `<SafeAreaProvider style={{ flex: 1 }}>` và `<View style={{ flex: 1 }}>` bên ngoài và bên trong `<PrivyProvider>`, đảm bảo WebView ẩn của Privy luôn được cấp viewport kích thước rõ ràng, không bao giờ bị hệ điều hành Android tự động thu hồi (kill process) do kích thước 0x0.
  - **Giải Phóng UI Thread với `InteractionManager.runAfterInteractions` ([app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/index.tsx) & [services/solana.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/solana.ts))**:
    - Bọc quá trình mở Modal sau khi quét QR và các lệnh trước khi `signTransaction` trong `InteractionManager.runAfterInteractions` kèm `setTimeout(1000ms)`, đảm bảo toàn bộ animation unmount camera và transition của modal đã hoàn tất trước khi đánh thức WebView.
  - **Cơ Chế Fallback Tự Động Khôi Phục Khi Dính Lỗi Treo WebView**:
    - Trong [app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/index.tsx), [app/send.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/send.tsx) và [app/shake-room.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/shake-room.tsx), nếu bắt được lỗi `timeout: user-signer:sign` hoặc `Embedded wallet WebView failed to become ready`, hệ thống sẽ kích hoạt hộp thoại popup: *"Phiên làm việc bị gián đoạn ⚠️ - Phiên kết nối ví ngầm trên thiết bị Android đang bị treo bởi hệ thống. Bạn có muốn dọn dẹp và làm mới phiên đăng nhập ngay?"* và tự động thực thi `executeHardReset(logout)`.

---

### 🔹 [Phase 2 - Bước 42: Khắc Phục Lỗi Missing Access Token, Bảo Vệ Phiên Giao Dịch & Điều Hướng Bắt Buộc Sau Hard Reset]
- **Type:** `[DEBUG / FIX]` | `[FEAT]` | `[SECURITY]`
- **Nội dung chi tiết:**
  - **Kiểm Tra & Xác Thực Access Token Trước Khi Giao Dịch ([hooks/useTransferToken.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/hooks/useTransferToken.ts))**:
    - Sử dụng `getAccessToken()` từ hook `usePrivy` để kiểm tra tính toàn vẹn của token xác thực trước khi kích hoạt bất kỳ lệnh ký `signTransaction` nào.
    - Nếu token trả về `null` hoặc không hợp lệ, hệ thống lập tức gọi `logout()` và trả về lỗi: *'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại'*, ngăn ngừa hoàn toàn lỗi `Missing access token`.
  - **Bắt Buộc Điều Hướng Sau Hard Reset ([app/settings.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/settings.tsx), [app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/index.tsx), [app/send.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/send.tsx), [app/shake-room.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/shake-room.tsx))**:
    - Khi người dùng hoặc hệ thống kích hoạt `executeHardReset()`, sau khi dọn dẹp bộ nhớ đệm và xóa `AsyncStorage`, ứng dụng BẮT BUỘC gọi `router.replace('/login')` để đẩy người dùng về màn hình đăng nhập, không cho phép lưu lại phiên giao dịch không có token.
  - **Bảo Vệ State Giao Diện Theo Trạng Thái Xác Thực ([app/send.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/send.tsx), [app/shake-room.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/shake-room.tsx), [app/(tabs)/transfer-hub.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/transfer-hub.tsx))**:
    - Đặt chốt chặn guard `if (!isReady || !user)` tại tất cả các màn hình chức năng giao dịch, chuyển tiền và phòng chia tiền Shake to Split.
    - Khi phát hiện người dùng mất session hoặc chưa đăng nhập, lập tức khóa render giao diện giao dịch và chuyển hướng an toàn về `/login`.

---

### 🔹 [Phase 2 - Bước 43: Tái Cấu Trúc Core: Dọn Dẹp Code Cũ & Tái Thiết Lập Luồng Định Danh Supabase]
- **Type:** `[REFACTOR]` | `[FEAT]` | `[CLEANUP]`
- **Nội dung chi tiết:**
  - **Bước 1 - Dọn Dẹp Code Cũ**:
    - Xóa bỏ toàn bộ logic gọi chuyển tiền cũ và các API phụ trợ tạm thời trong [app/shake-room.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/shake-room.tsx), [app/send.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/send.tsx), [app/(tabs)/transfer-hub.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/transfer-hub.tsx) và [app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/index.tsx).
    - Đưa toàn bộ các hàm handler và nút 'Thanh toán' / 'Xác nhận' về trạng thái rỗng an toàn, sẵn sàng tích hợp Custom Hook `useOnchainTransfer` ở Bước 3.
  - **Bước 2 - Tái Thiết Lập Luồng Định Danh (Supabase Identity Service)**:
    - Làm sạch và chuẩn hóa API định danh trong [services/supabase.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/supabase.ts) với `linkPhoneNumber(userId, walletAddress, phoneNumber)`, `getUserPhoneNumberFromDB(userId)` và `lookupWalletByPhone(phone)`.
    - Khi người dùng đăng nhập Privy thành công, hệ thống truy vấn Supabase bảng `phone_wallets`. Với cơ sở dữ liệu trắng, ứng dụng tự động mở [components/PhoneLinkingModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/PhoneLinkingModal.tsx) yêu cầu người dùng nhập Số điện thoại và thực hiện `INSERT` bản ghi mới gồm `user_id`, `phone_number` và `wallet_address` vào Supabase.

---

### 🔹 [Phase 2 - Bước 44: Xây Dựng Hook Core `useOnchainTransfer` & Tích Hợp Giao Dịch 100% On-Chain Vào UI]
- **Type:** `[FEAT]` | `[REFACTOR]` | `[CORE]` | `[STABILITY]`
- **Nội dung chi tiết:**
  - **Bước 3 - Xây Dựng Hook Giao Dịch Core ([hooks/useOnchainTransfer.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/hooks/useOnchainTransfer.ts))**:
    - Tạo hook quản lý giao dịch 100% on-chain với các state: `isTransferring`, `error`, `transactionHash`, `statusMessage`, `isWalletReady`, `needsRecovery`, `walletStatus`, `senderAddress`, `transfer`.
    - **Kiểm Tra Access Token & Sẵn Sàng**: Trước khi ký giao dịch, kiểm tra `getAccessToken()`. Nếu token không hợp lệ hoặc đã hết hạn, lập tức gọi `logout()` và trả về lỗi rõ ràng.
    - **Phân Giải SĐT Tự Động**: Tự động nhận diện chuỗi SĐT đầu vào và tra cứu ví Solana từ Supabase qua `lookupWalletByPhone(input)`.
    - **Quy Tắc Sinh Tử Cho Android**: Bọc quá trình gọi `provider.request({ method: 'signTransaction' })` trong `InteractionManager.runAfterInteractions` kèm delay 1000ms, giải phóng hoàn toàn Main Thread và ngăn chặn crash/unmount WebView. Kèm cơ chế retry ký tự động nếu gặp lỗi timeout.
    - **Broadcast & Confirm Devnet**: Phát sóng giao dịch trực tiếp lên mạng Solana Devnet qua `solanaConnection.sendRawTransaction()` và xác nhận bằng `solanaConnection.confirmTransaction()`.
  - **Bước 4 - Tích Hợp Lại Vào Toàn Bộ UI Ứng Dụng**:
    - **Guest Payment trong Shake to Split ([app/shake-room.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/shake-room.tsx))**: Tích hợp `useOnchainTransfer` vào `handleGuestPay`. Khóa hoàn toàn nút thanh toán (`disabled = !isReady || !user || !isWalletReady || isGuestPaying || hasGuestPaid`) để đảm bảo trải nghiệm ổn định.
    - **Màn Hình Chuyển Tiền Chuẩn ([app/send.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/send.tsx))**: Tích hợp `useOnchainTransfer` vào `handleSendTransaction`. Tra cứu ví từ SĐT/Base58 và cập nhật cache lịch sử on-chain ngay sau khi giao dịch thành công.
    - **Transfer Hub ([app/(tabs)/transfer-hub.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/transfer-hub.tsx))**: Kết nối `useOnchainTransfer` vào luồng chuyển nhanh.
    - **Trang Chủ ([app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/index.tsx))**: Kết nối `useOnchainTransfer` vào modal chuyển tiền và luồng sau khi quét mã QR.

---

### 🔹 [Phase 2 - Bước 45: Khắc Phục Triệt Để Lỗi `timeout: user-signer:sign` & `WebView failed to become ready` trên Android]
- **Type:** `[DEBUG / FIX]` | `[CORE]` | `[STABILITY]` | `[ARCHITECTURE]`
- **Nguyên nhân gốc rễ (Root Cause Analysis)**:
  1. **Nghẽn Window Focus do React Native `<Modal>`**: Trên Android, việc sử dụng thẻ `<Modal>` gốc tạo ra một cửa sổ native `android.app.Dialog` độc lập. Khi Dialog này hiển thị (như modal quét QR hoặc modal xác nhận chuyển tiền `SendModal`), WindowManager của Android coi cửa sổ Activity chính của ứng dụng là đang ở background/mất focus, khiến Chrome WebView chạy ngầm của Privy bị hệ điều hành đóng băng timer (throttling JS loop) và làm trễ/treo tiến trình nhận tin nhắn `postMessage` (`privy:user-signer:sign`), dẫn đến vượt quá giới hạn timeout 15s (`Operation reached timeout: user-signer:sign`) và kéo theo lỗi `Embedded wallet WebView failed to become ready`.
  2. **Xung đột Chuỗi Modal Camera $\rightarrow$ Send**: Khi quét QR hoàn tất, việc chuyển tiếp giữa 2 `<Modal>` liên tiếp trên Android làm bão hòa Main Thread và giữ Activity chính liên tục trong trạng thái unfocused.
- **Giải pháp Kiến Trúc & Triển khai chi tiết**:
  - **1. Chuyển Đổi Toàn Bộ Modal Sang In-Tree Overlays ([components/SendModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/SendModal.tsx), [components/WalletRecoveryModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/WalletRecoveryModal.tsx), [components/DepositModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/DepositModal.tsx), [components/PhoneLinkingModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/PhoneLinkingModal.tsx), [components/PhoneManagementModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/PhoneManagementModal.tsx))**:
    - Thay thế hoàn toàn thẻ `<Modal>` gốc bằng cơ chế In-Tree Overlay (`if (!visible) return null; return <View style={styles.overlayWrapper}>...`).
    - Giữ trọn vẹn 100% giao diện, hiệu ứng animation mượt mà của bottom sheet, nhưng chạy hoàn toàn trong cùng một Activity Window, đảm bảo WebView ngầm của Privy luôn giữ vững Window Focus và hoạt động ở tốc độ xử lý tối đa (Full Priority).
  - **2. In-Tree Camera Scanner & Điều Hướng Trực Tiếp ([app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/index.tsx))**:
    - Chuyển `CameraView` scanner sang in-tree overlay `{showScanner && <View style={styles.cameraContainer}>...}`.
    - Trong `handleBarCodeScanned`, sau khi quét thành công, lập tức đóng camera và sử dụng `router.push({ pathname: '/send', params: { recipient: data } })` để điều hướng trực tiếp sang màn hình chuyên dụng [app/send.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/send.tsx).
    - Cập nhật nút "Withdraw" trên trang chủ và nút "Chuyển tiền P2P" trong [app/(tabs)/transfer-hub.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/transfer-hub.tsx) chuyển hướng mượt mà sang `/send`.
  - **3. Tối Ưu Provider Resolution & Retry trong `useOnchainTransfer` ([hooks/useOnchainTransfer.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/hooks/useOnchainTransfer.ts))**:
    - Hỗ trợ fallback linh hoạt giữa `solanaWalletState.getProvider()` và `wallets[0].getProvider()`.
    - Khi gặp lỗi ký tạm thời hoặc timeout, hệ thống tự động chờ 1200ms, lấy lại `recentBlockhash` tươi mới từ Solana Devnet RPC và kích hoạt cơ chế retry ký an toàn.
  - **4. Đăng Ký Đầy Đủ Navigation Stack ([app/_layout.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/_layout.tsx))**:
    - Khai báo tường minh màn hình `<Stack.Screen name="send" />` bên trong cây Navigation Root.

---

### 🔹 [Phase 2 - Bước 46: Vá Trực Tiếp SDK Privy (Patch Engine) - Giải Phóng Viewport 0x0 & Nâng Timeout Ký 60s]
- **Type:** `[CORE]` | `[PATCH]` | `[STABILITY]` | `[PERFORMANCE]`
- **Nguyên nhân cốt lõi trong SDK nội tại**:
  1. **Throttling kích thước 0x0 trong `@privy-io/expo`**: Trong file phân phối gốc `chunk-77II74GH.js`, component WebView `_t` bị bọc cứng trong `style: { width: 0, height: 0, overflow: 'hidden' }`. Nhân Chromium trên Android tự động bóp nghẹt hoặc tạm dừng Event Loop/WebCrypto của các WebView có diện tích bằng 0 để tiết kiệm pin.
  2. **Thiếu tham số Timeout trong `signWithUserSigner` của `@privy-io/js-sdk-core`**: Trong khi các phương thức khác (`createWallet`, `recover`, `createSolana`) đều có `timeoutMs: 6e4` (60 giây), thì `signWithUserSigner` bị bỏ quên và nhận giá trị mặc định chỉ 15 giây (`15000ms`), dẫn tới lỗi `Operation reached timeout: user-signer:sign` ngay khi tiến trình xử lý on-chain kéo dài trên thiết bị di động.
- **Giải pháp triển khai tự động hóa**:
  - **1. Xây dựng Script Vá Tự Động ([scripts/patch-privy.js](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/scripts/patch-privy.js))**:
    - Duyệt đệ quy toàn bộ `node_modules` và `.pnpm` store.
    - Vá Viewport của WebView từ `{width:0,height:0,overflow:"hidden"}` sang `{position:"absolute",top:-9999,left:-9999,width:50,height:50,opacity:0.01}`.
    - Bổ sung `timeoutMs: 6e4` (60s) cho `signWithUserSigner` và `ms: 3e4` cho `clearMfa`.
  - **2. Tích hợp Hook `postinstall` ([package.json](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/package.json))**:
    - Đăng ký `"postinstall": "node ./scripts/patch-privy.js"` để tự động chạy và vá mã nguồn mỗi khi cài đặt hoặc cập nhật thư viện.
  - **3. Tối ưu Điều Hướng Khi Hết Hạn Token ([app/send.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/send.tsx), [app/shake-room.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/shake-room.tsx), [app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/index.tsx))**:
    - Tự động bắt lỗi `'hết hạn'` hoặc `'Missing access token'` và điều hướng người dùng quay lại `/login` để nhận token mới mà không bị kẹt ở màn hình cũ.

---

### 🔹 [Phase 2 - Bước 47: Khắc Phục Đồng Bộ Số Dư Thời Gian Thực & Recent Activities Cho Người Nhận Tiền]
- **Type:** `[CORE]` | `[REALTIME]` | `[UI/UX]` | `[STABILITY]`
- **Nguyên nhân cốt lõi (Root Cause)**:
  1. **Lỗi Cache Perspective trong `services/solana.ts`**: `parsedTxCache` lưu cache theo chữ ký `sig` mà không phân biệt theo `address`. Khi Người gửi hoàn tất giao dịch và lưu cache dạng `sent` (Chuyển tiền -$X.XX), Người nhận khi tra cứu cùng chữ ký `sig` đó nhận lại kết quả từ cache là `sent` thay vì `received` (Nhận tiền +$X.XX).
  2. **Lỗi ép kiểu `accountKeys` của RPC**: Cấu trúc `accountKeys` trả về từ Solana RPC có nhiều định dạng (`PublicKey`, `{ pubkey: string }`, `{ pubkey: PublicKey }`). Việc gọi trực tiếp `.toBase58()` mà không kiểm tra kiểu dữ liệu gây ra lỗi runtime silent bên trong block `try/catch`, khiến giao dịch không được phân tích và giữ nguyên giá trị `$0.00`.
  3. **Thiếu cơ chế Polling Heartbeat trên Mobile**: Kết nối WebSocket `onAccountChange` trên Solana Devnet thường bị timeout hoặc ngắt kết nối ngầm khi chạy trên điện thoại di động (qua mạng di động/WiFi). Thiếu cơ chế polling định kỳ và thiếu hook `useFocusEffect` khiến màn hình Trang chủ của Người nhận không tự động cập nhật số dư và lịch sử giao dịch khi có tiền mới chuyển đến.
- **Giải pháp triển khai chi tiết**:
  - **1. Nâng Cấp Bộ Phân Tích On-Chain & Cache Độc Lập Theo Ví ([services/solana.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/solana.ts))**:
    - Đổi khóa cache sang `${address}:${sig}` (Address-Scoped Cache), đảm bảo Người gửi hiển thị `Chuyển tiền` (`-$...`, `#374151`) và Người nhận hiển thị `Nhận tiền` (`+$...`, `#10B981`, `isPositive: true`).
    - Hỗ trợ toàn diện 5 định dạng `accountKeys` tránh mọi ngoại lệ runtime.
    - Quản lý `inFlightHistoryMap` chống gọi trùng lặp (Deduplication) và tối ưu commitment `'confirmed'` cho `getSolanaBalance`.
  - **2. Đồng Bộ Đa Tầng (Multi-Layer Real-time Sync) Cho Trang Chủ ([app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/index.tsx))**:
    - **Heartbeat Polling (3.5 giây)**: Tự động kiểm tra số dư SOL từ Devnet. Khi phát hiện số dư tăng lên, hệ thống lập tức cập nhật state, lưu cache, kích hoạt rung phản hồi Haptic (`Success`) và tải lại danh sách Recent Activities ngay lập tức.
    - **Focus Listener (`useFocusEffect`)**: Tự động làm mới 100% dữ liệu mỗi khi người dùng mở hoặc chuyển tab về Trang chủ.
    - **AppState Listener**: Tự động làm mới khi ứng dụng được mở lại từ chế độ nền (Foreground active).
    - **WebSocket Listener**: Giữ kết nối `onAccountChange` để bắt biến động số dư sub-second khi WebSocket hoạt động.
    - **Khởi tạo sạch**: Xóa bỏ các mock activity ảo ("4 mo ago"), khởi tạo danh sách từ cache cục bộ sạch.
  - **3. Tự Động Làm Mới Màn Hình Lịch Sử ([app/history.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/history.tsx))**:
    - Tích hợp `useFocusEffect` để tự động kéo toàn bộ lịch sử on-chain mới nhất mỗi khi người dùng truy cập màn hình History.

---

### 🔹 [Phase 2 - Bước 48: Vá Lỗ Hổng Tự Chuyển Tiền Cho Chính Mình (Self-Transfer Prevention & Double-Check)]
- **Type:** `[SECURITY]` | `[VALIDATION]` | `[CORE]` | `[UX]`
- **Mục tiêu**:
  - Ngăn chặn triệt để trường hợp người dùng nhập chính số điện thoại của mình hoặc chính địa chỉ ví của mình để thực hiện giao dịch chuyển tiền cho bản thân.
- **Giải pháp triển khai chi tiết**:
  - **1. Helper So Sánh Số Điện Thoại Thông Minh ([services/supabase.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/supabase.ts))**:
    - Xây dựng hàm `isSamePhoneNumber(phone1, phone2)` tự động chuẩn hóa mọi biến thể đầu số (`+84...`, `0...`, `84...`, dấu cách, gạch ngang) để phát hiện chính xác 100% SĐT trùng khớp.
  - **2. Chặn Tức Thì Tại Giao Diện (Front-end UI Validation & Cleanup)**:
    - **Màn hình Chuyển tiền ([app/send.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/send.tsx))** và **Modal Chuyển tiền ([components/SendModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/SendModal.tsx))**:
      - Khi người dùng nhập SĐT trùng với `myPhone` hoặc nhập địa chỉ Base58 trùng với `myAddress`:
        - Đặt `resolvedAddress = null` (tuyệt đối không hiển thị thẻ thông tin ví thành công).
        - Hiển thị thông báo lỗi màu đỏ: `'Bạn không thể chuyển tiền đến tài khoản của chính mình'`.
        - Khóa hoàn toàn nút `'Xác nhận Chuyển tiền'` (`disabled = true`).
  - **3. Chặn Chéo Bằng Địa Chỉ Ví (Double-Check After Supabase Lookup)**:
    - Trong luồng tra cứu Supabase: Khi nhận về `foundAddress`, lập tức so sánh với ví người gửi `myAddress` (`wallets[0].address`).
    - Nếu trùng nhau $\rightarrow$ ngắt luồng ngay, không lưu state người nhận và văng cảnh báo lỗi đỏ.
  - **4. Bảo Vệ Tầng Core Hook & Service ([hooks/useOnchainTransfer.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/hooks/useOnchainTransfer.ts), [services/solana.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/solana.ts))**:
    - Kiểm tra `from === finalToAddress` hoặc `fromPubkey.equals(toPubkey)` trước khi xây dựng giao dịch và ký số. Trả về lỗi: `'Bạn không thể chuyển tiền đến tài khoản của chính mình.'` nếu vi phạm.

---

### 🔹 [Phase 2 - Bước 49: Tích Hợp Tính Năng Không Gian Geo-RedPacket (Lì Xì Theo Tọa Độ GPS) & Gỡ Bỏ AirDrop Radar]
- **Type:** `[FEATURE]` | `[GEOLOCATION]` | `[ONCHAIN]` | `[DATABASE]` | `[UI/UX]`
- **Mục tiêu**:
  - Gỡ bỏ hoàn toàn tính năng AirDrop Radar cũ.
  - Tích hợp tính năng Geo-RedPacket: Cho phép người dùng thả bao lì xì SOL tại tọa độ GPS thực tế (khóa an toàn on-chain vào Escrow Treasury) và lưu trữ vị trí lên Supabase.
- **Giải pháp triển khai chi tiết**:
  - **1. Phase 1: Dọn Dẹp AirDrop Radar ([app/(tabs)/transfer-hub.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/transfer-hub.tsx))**:
    - Xóa bỏ toàn bộ UI thẻ AirDrop Radar và hàm xử lý `handleOpenFeatureInfo` không còn sử dụng.
    - Kích hoạt thẻ `Geo-RedPacket (Lì xì theo tọa độ)` sang trạng thái sẵn sàng (`isAvailable = true`) với theme màu đỏ lễ hội (`#EF4444`, `#FEE2E2`).
  - **2. Phase 2: Thiết Kế Database & Service Tọa Độ ([services/supabase.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/supabase.ts))**:
    - Xây dựng bảng `geo_red_packets` trên Supabase (UUID, `creator_wallet`, `amount`, `lat`, `lng`, `radius`, `message`, `status`, `tx_signature`, `claimed_by`, `claimed_at`, `created_at`).
    - Viết thuật toán tính khoảng cách GPS `calculateDistanceInMeters` theo công thức Haversine.
    - Bổ sung các phương thức `createGeoRedPacketRecord` và `fetchActiveGeoRedPackets`.
  - **3. Phase 3: Dựng Màn Hình & Logic Khởi Tạo Lì Xì ([app/geo-redpacket.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/geo-redpacket.tsx))**:
    - Tích hợp `expo-location` lấy vị trí GPS vệ tinh chính xác cao (`Location.Accuracy.High`).
    - Tab Switcher: Gồm 2 chế độ `Thả Lì Xì` và `Quét Lì Xì Quanh Đây` với hiệu ứng Radar Pulse Animation sinh động.
    - Logic Thả Lì Xì On-chain: Thực thi ký chuyển SOL vào ví Treasury Escrow `GEO_REDPACKET_TREASURY` (`9WzDXw...`) qua `useOnchainTransfer`.
    - **Cơ chế Atomic Consistency**: CHỈ KHI giao dịch on-chain thành công và có chữ ký `txSignature`, hệ thống mới INSERT bản ghi tọa độ lên Supabase.

---

### 🔹 [Phase 2 - Bước 50: Tái Cấu Trúc Bảo Mật Toàn Diện Với Supabase Edge Function Backend Signer & Strict RLS]
- **Type:** `[SECURITY]` | `[BACKEND]` | `[EDGE_FUNCTION]` | `[ONCHAIN_SIGNER]` | `[ARCHITECTURE]`
- **Mục tiêu**:
  - Loại bỏ hoàn toàn lỗ hổng bảo mật phía client (hủy bỏ quyền `UPDATE` trực tiếp từ Front-end).
  - Triển khai mô hình **Backend Signer** với Supabase Edge Function (`claim-redpacket`): Tính khoảng cách Haversine server-side, bảo mật Private Key Treasury, ký chuyển SOL on-chain và cập nhật trạng thái `claimed` nguyên tử (Atomic).
- **Giải pháp triển khai chi tiết**:
  - **1. Khóa Chặt Database & Cập Nhật RLS ([supabase/migrations/20260831_geo_red_packets_security.sql](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/supabase/migrations/20260831_geo_red_packets_security.sql))**:
    - Hủy bỏ toàn bộ policy `FOR UPDATE USING (true)`.
    - Thiết lập RLS: Public/Anon CHỈ có quyền `SELECT` và `INSERT`.
    - TUYỆT ĐỐI KHÔNG cấp quyền `UPDATE`/`DELETE` cho client. Chỉ có `Service Role Key` của Backend mới có quyền sửa đổi DB.
  - **2. Xây Dựng Supabase Edge Function Backend Signer ([supabase/functions/claim-redpacket/index.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/supabase/functions/claim-redpacket/index.ts))**:
    - Nhận payload: `{ packet_id, user_wallet, user_lat, user_lng }`.
    - **Xác thực GPS Server-side**: Sử dụng công thức Haversine để tính khoảng cách thực tế giữa người nhận và bao lì xì. Kiểm tra nghiêm ngặt `distance <= packet.radius + 10m buffer`.
    - **Chống gian lận (Anti-Self-Farming & Double Claim)**: Kiểm tra `packet.status === 'active'` và chặn người tạo tự nhặt lại bao lì xì của chính mình.
    - **Ký On-chain Bảo Mật**: Cất giữ an toàn `TREASURY_SECRET_KEY` trong Supabase Secrets, tự động tạo và ký giao dịch chuyển `packet.amount` SOL từ Treasury về ví người nhận trên Solana Devnet.
    - **Cập Nhật Nguyên Tử (Atomic Update)**: CHỈ KHI mạng lưới Solana xác nhận thành công chữ ký `claim_tx_signature`, Edge Function mới cập nhật `status = 'claimed'` trên Supabase.
  - **3. Tích Hợp Front-End Client ([services/supabase.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/supabase.ts), [app/geo-redpacket.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/geo-redpacket.tsx))**:
    - Xây dựng hàm `claimGeoRedPacketViaBackend` gọi Edge Function qua `supabase.functions.invoke('claim-redpacket')`.
    - Màn hình Geo-RedPacket hiển thị trạng thái động cho từng bao lì xì (nếu trong bán kính $\rightarrow$ hiện nút đỏ *"🧧 Mở Lì Xì Ngay"*; nếu ngoài bán kính $\rightarrow$ hiển thị khoảng cách cần di chuyển lại gần).
    - Tự động rung Haptic Success, mở thông báo chúc mừng kèm chữ ký On-chain và làm mới số dư ví tức thì.

---

### 🔹 [Phase 2 - Bước 51: Xây Dựng Tính Năng 'Phòng Lì Xì Tung Đồng Xu' (Coin Toss Realtime Room)]
- **Type:** `[FEATURE]` | `[REALTIME]` | `[WEBSOCKETS]` | `[PRESENCE]` | `[ANIMATION]` | `[ONCHAIN]`
- **Mục tiêu**:
  - Hủy bỏ thiết kế Geo-RedPacket GPS, thay thế bằng **Phòng Lì Xì Tung Đồng Xu** trên nền tảng Supabase Realtime (Presence & Broadcast).
  - Tự động quét thiết bị người dùng xung quanh (Presence) và mời vào phòng.
  - Hiệu ứng vuốt tung đồng xu (Swipe to Toss) với PanResponder + Physics 3D Flip Animation.
  - Thuật toán Random chọn 1 Guest duy nhất và thực thi ký chuyển SOL on-chain trực tiếp qua `useOnchainTransfer`.
- **Giải pháp triển khai chi tiết**:
  - **1. Khởi Tạo Phòng & Quét Thiết Bị ([contexts/GlobalPresenceContext.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/contexts/GlobalPresenceContext.tsx), [app/coin-toss-room.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/coin-toss-room.tsx))**:
    - Host tạo phòng với mã định danh riêng biệt `coin_<id>`.
    - Kết nối Realtime Channel `coin_toss_<roomId>` với cơ chế Supabase Presence để đồng bộ danh sách thành viên tức thời (`presenceState`, `track`, `on('presence', { event: 'sync' })`).
    - Tích hợp Modal phát hiện người dùng lân cận đang mở app (`nearbyUsers`), cho phép Host phát sóng lời mời tham gia (`broadcastInvite`).
  - **2. Cấu Trúc UI Phòng Lì Xì ([app/coin-toss-room.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/coin-toss-room.tsx))**:
    - **Nửa trên**: Danh sách Avatar / Tên / Badge Host-Guest của tất cả thành viên trong phòng kèm trạng thái Online.
    - **Khu vực Form nhập tiền (Host Only)**: Ô nhập số SOL lì xì kèm các nút chọn nhanh (`0.005`, `0.01`, `0.02`, `0.05` SOL) và hiển thị số dư ví.
    - **Nửa dưới (Bottom Middle)**: Component **Đồng Xu Vàng 3D (Golden Coin)** với biểu tượng SOL và hiệu ứng ánh sáng hào quang (Glow Pulse).
  - **3. Hiệu Ứng Tung Đồng Xu (Swipe to Toss & Physics Animation)**:
    - Bắt cử chỉ vuốt ngón tay từ dưới lên trên qua `PanResponder` (`dy < -50` / `vy < -0.4`).
    - Animation phức hợp: Đồng xu phóng vút lên cao (`translateY: 0 -> -240 -> 0`), xoay 3D Flip 5 vòng (`rotateY: 0 -> 1800deg`), co giãn quán tính (`scale: 1 -> 1.35 -> 1`) và rơi có độ nảy `Easing.bounce`.
    - Tự động khóa Form và broadcast sự kiện `toss_started` cho toàn bộ thiết bị trong phòng cùng xem hoạt cảnh đồng xu bay.
  - **4. Thuật Toán Random & Ký Chuyển SOL On-chain**:
    - Khi đồng xu đang bay, hệ thống lọc danh sách Guest hợp lệ (`!is_host && wallet_address`) và Random chọn 1 người trúng thưởng: `chosenGuest = guests[Math.floor(Math.random() * guests.length)]`.
    - Host thực thi lệnh chuyển SOL trực tiếp on-chain qua `useOnchainTransfer` gửi tới ví `chosenGuest.wallet_address`.
    - Khi có `txSignature` thành công $\rightarrow$ Broadcast sự kiện `winner_selected` đến tất cả thành viên.
  - **5. Màn Hình Vinh Danh & Chúc Mừng (Celebration Modal)**:
    - Mở Popup vinh danh đích danh người chiến thắng, hiển thị số SOL trúng thưởng, avatar, tên và chữ ký giao dịch Solana Devnet Explorer.
    - Rung phản hồi xúc giác Success và tự động làm mới số dư tức thì.

---

### 🔹 [Phase 2 - Bước 52: Tái Cấu Trúc Cử Chỉ Tung Đồng Xu với GestureDetector & Reanimated Shared Values]
- **Type:** `[UI/UX]` | `[GESTURE]` | `[REANIMATED]` | `[HAPTIC_FEEDBACK]` | `[INTERACTION]`
- **Mục tiêu**:
  - Khắc phục triệt để độ trễ nhịp và thiếu phản hồi xúc giác khi vuốt ném đồng xu.
  - Chuyển đổi toàn bộ logic vuốt sang `GestureDetector` (`react-native-gesture-handler`) kết hợp `useSharedValue` (`react-native-reanimated`).
- **Giải pháp triển khai chi tiết**:
  - **1. Bọc Khung Gốc Root Gesture ([app/coin-toss-room.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/coin-toss-room.tsx))**:
    - Bọc toàn bộ màn hình trong `<GestureHandlerRootView style={{ flex: 1 }}>`.
  - **2. 3 Giai Đoạn Tương Tác Cử Chỉ Vật Lý ([app/coin-toss-room.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/coin-toss-room.tsx))**:
    - **Trạng thái Nén (Touch Down / onBegin)**:
      - Khi người dùng chạm ngón tay vào đồng xu: Lập tức co scale xuống `0.9` (withSpring) và giảm opacity xuống `0.7` (withTiming) tạo cảm giác đồng xu bị đè ép xuống.
      - Kích hoạt rung xúc giác nhẹ `Haptics.impactAsync(Light)` thông qua `runOnJS`.
    - **Trạng thái Vuốt Bám Ngón Tay (Drag / onUpdate)**:
      - Đồng xu di chuyển bám sát theo tọa độ `translationY` của ngón tay người dùng (chỉ cho phép vuốt lên trên `translationY < 0`, kéo xuống bị cản lực).
    - **Trạng thái Tung & Phản Hồi Thả Tay (Release / onEnd)**:
      - **Đủ lực vuốt (`translationY < -120px` hoặc `velocityY < -550`)**: Khóa cảm ứng, kích hoạt rung mạnh `Heavy`, phóng vút đồng xu lên trời (`translationY: -500px`), xoay 3D 5 vòng (`rotateY: +1800deg`) và gọi luồng Random + Ký chuyển SOL on-chain trên Solana Devnet.
      - **Chưa đủ lực**: Nảy đàn hồi mượt mà về vị trí gốc (`withSpring(0)`), khôi phục `opacity = 1` và `scale = 1` để Host thao tác lại.

---

### 🔹 [Phase 2 - Bước 53: Tích Hợp Chuyển Đổi Đa Ngôn Ngữ (i18n) với AsyncStorage & Settings UI]
- **Type:** `[FEATURE]` | `[I18N]` | `[STORAGE]` | `[UI/UX]`
- **Mục tiêu**:
  - Thiết lập hệ thống đa ngôn ngữ (`i18next`, `react-i18next`) hỗ trợ Tiếng Việt (`vi`) và Tiếng Anh (`en`).
  - Tự động lưu trữ và nạp cấu hình ngôn ngữ người dùng từ `AsyncStorage` (`@app_language`).
  - Xây dựng thanh chọn ngôn ngữ tương tác (Segmented Control) trong màn hình Settings với khả năng cập nhật giao diện thời gian thực không cần reload app.
- **Giải pháp triển khai chi tiết**:
  - **1. Cấu Hình i18next & AsyncStorage ([services/i18n.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/i18n.ts), [app/_layout.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/_layout.tsx))**:
    - Xây dựng từ điển dịch đầy đủ cho 2 ngôn ngữ `vi` và `en`.
    - Khi app khởi động, hàm `initLanguageFromStorage` tự động đọc khóa `@app_language` từ `AsyncStorage`. Nếu chưa có, mặc định thiết lập là `vi`.
    - Nạp `services/i18n` ngay tại `RootLayout` (`app/_layout.tsx`) để đảm bảo sẵn sàng trên toàn app.
  - **2. Tích Hợp Giao Diện Chuyển Đổi Ngôn Ngữ ([app/settings.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/settings.tsx))**:
    - Thêm nhóm cấu hình *"Ngôn ngữ / Language"* với Segmented Control 2 nút: `🇻🇳 Tiếng Việt` và `🇬🇧 English`.
    - Trạng thái nút active được viền sáng xanh thương hiệu (`#10B981`) kèm phản hồi rung Haptic (`Haptics.selectionAsync()`).
    - Khi người dùng bấm chọn: Gọi đồng thời `changeAppLanguage(newLang)` và `AsyncStorage.setItem('@app_language', newLang)`.
    - Toàn bộ text trong màn hình Settings (tiêu đề, thông tin tài khoản, các menu chức năng, cảnh báo xác nhận, popup...) tự động cập nhật ngôn ngữ ngay lập tức mà không cần khởi động lại ứng dụng.

---

### 🔹 [Phase 2 - Bước 54: Mở Khóa Lan Truyền Đa Ngôn Ngữ Sang Tab Navigation & Các Màn Hình Chính]
- **Type:** `[NAVIGATION]` | `[I18N]` | `[REACTIVITY]` | `[ARCHITECTURE]`
- **Mục tiêu**:
  - Khắc phục lỗi React Navigation cache chuỗi tĩnh và text không cập nhật khi đổi ngôn ngữ.
  - Lan truyền cập nhật ngôn ngữ ngay lập tức tới Tab Navigation (`app/(tabs)/_layout.tsx`), Trang chủ (`index.tsx`), và Transfer Hub (`transfer-hub.tsx`).
- **Giải pháp triển khai chi tiết**:
  - **1. Mở Khóa Động Tab Navigation ([app/(tabs)/_layout.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/_layout.tsx))**:
    - Gọi hook `const { t } = useTranslation();` ngay bên trong `TabLayout` và `CustomTabBar`.
    - Gán động `title` và `tabBarLabel` qua `t('tabs.home')`, `t('tabs.card')`, `t('tabs.transfer')`, `t('tabs.miniapps')`.
    - Dynamic hóa các hộp thoại cảnh báo khi nhấn vào tab Card (`t('tabs.cardInDev')`, `t('tabs.cardInDevMsg')`).
  - **2. Rà Soát & Xóa Bỏ Text Ngoại Lai (Static Calls)**:
    - Đảm bảo 100% các lệnh gọi `t()` được đặt bên trong lifecycle của React Function Components.
    - Mở rộng từ điển dịch thuật (`services/i18n.ts`) đầy đủ cho các module `tabs`, `home`, `transferHub`, `coinToss`, `settings`.
  - **3. Lan Truyền Reactive Từ Root Sang Màn Hình Chính**:
    - Cập nhật [app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/index.tsx) và [app/(tabs)/transfer-hub.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/transfer-hub.tsx) sử dụng hook `useTranslation()`.
    - Khi thay đổi ngôn ngữ tại Settings, toàn bộ Tab Bar, Home Screen và Transfer Hub lập tức đồng bộ chuyển đổi tức thì.

---

### 🔹 [Phase 2 - Bước 55: Đa Ngôn Ngữ Hóa Toàn Diện Recent Activities & Lịch Sử Giao Dịch]
- **Type:** `[I18N]` | `[ONCHAIN]` | `[UI/UX]` | `[LOCALIZATION]`
- **Mục tiêu**:
  - Khắc phục tình trạng danh sách Recent activities tại Trang chủ và màn hình Lịch sử giao dịch (`app/history.tsx`) bị kẹt text cứng Tiếng Việt (tiêu đề, thời gian tương đối, bộ lọc, thanh tìm kiếm, empty state).
  - Tách bạch cấu trúc dữ liệu thô (`type`, `blockTime`) và cơ chế render động theo ngôn ngữ người dùng lựa chọn.
- **Giải pháp triển khai chi tiết**:
  - **1. Cấu Trúc Hóa Dữ Liệu Giao Dịch & Helper Dịch Thuật ([services/solana.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/solana.ts))**:
    - Bổ sung trường `blockTime` (Unix timestamp) vào cấu trúc `ActivityItem`.
    - Xây dựng hàm `getActivityTitle(item, t)` để ánh xạ động kiểu giao dịch (`received` $\rightarrow$ Nhận tiền / Received, `sent` $\rightarrow$ Chuyển tiền / Sent, `reward` $\rightarrow$ Thưởng Lì Xì / Lucky Reward).
    - Xây dựng hàm `formatLocalizedRelativeTime(blockTime, t)` để tính toán và format thời gian tương đối đa ngôn ngữ (Vừa xong / Just now, X phút trước / Xm ago, X giờ trước / Xh ago, X ngày trước / Xd ago...).
  - **2. Đồng Bộ Hóa Màn Hình Trang Chủ ([app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/index.tsx))**:
    - Chuyển đổi toàn bộ component Recent Activity để sử dụng `getActivityTitle` và `formatLocalizedRelativeTime`.
    - Các nút hành động `Deposit` $\rightarrow$ Nhận / Receive, `Withdraw` $\rightarrow$ Chuyển / Send, `Recent activity` $\rightarrow$ Hoạt động gần đây / Recent Activities, `View more` $\rightarrow$ Xem tất cả / See all tự động chuyển ngữ theo hệ thống.
  - **3. Toàn Diện Hóa Màn Hình Lịch Sử Giao Dịch ([app/history.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/history.tsx))**:
    - Dịch động tiêu đề Header, Placeholder tìm kiếm, các Tab bộ lọc (Tất cả / All, Nhận tiền / Received, Chuyển tiền / Sent, Phần thưởng / Lucky Reward), Badge xác nhận (`Confirmed`), và Empty State.

---

### 🔹 [Phase 2 - Bước 56: Mở Rộng Hệ Thống Đa Ngôn Ngữ (MiniApps, Transfer Hub Badges & Bottom Sheet Selector)]
- **Type:** `[I18N]` | `[UI/UX]` | `[REFACTOR]` | `[SCALABILITY]`
- **Mục tiêu**:
  - Dọn dẹp triệt để các chuỗi tĩnh còn sót lại ở `Transfer Hub` (*"Sẵn sàng sử dụng" / "Bắt đầu tương tác ngay"*).
  - Bản địa hóa 100% màn hình `N.E.D MiniApps Hub` (`app/(tabs)/miniapps.tsx`).
  - Tái thiết kế bộ chọn ngôn ngữ trong `Settings`: Thay thế dạng switch button cứng bằng danh sách mở rộng dạng Bottom Sheet Modal (`SUPPORTED_LANGUAGES`) hỗ trợ đa quốc gia (Việt Nam, Anh, Nhật, Hàn, Trung, Pháp, Đức, Tây Ban Nha...).
- **Giải pháp triển khai chi tiết**:
  - **1. Bản Địa Hóa FeatureCard & Transfer Hub ([app/(tabs)/transfer-hub.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/transfer-hub.tsx))**:
    - Tích hợp `useTranslation()` bên trong `FeatureCard`.
    - Ánh xạ badge trạng thái sang `t('transferHub.readyToUse')` (*Sẵn sàng sử dụng* / *Ready to use*) và gợi ý hành động sang `t('transferHub.interactNow')` (*Bắt đầu tương tác ngay* / *Interact now*) & `t('transferHub.learnMore')` (*Tìm hiểu thêm tính năng* / *Learn more features*).
  - **2. Đa Ngôn Ngữ Hóa Toàn Bộ MiniApps Hub ([app/(tabs)/miniapps.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/miniapps.tsx))**:
    - Chuyển đổi toàn bộ Banner giới thiệu, Tiêu đề mục (*ỨNG DỤNG NỔI BẬT* / *FEATURED APPS*), Badge (*Sắp ra mắt* / *Coming Soon*), và các ứng dụng dApps (Solana Pay Merchant, Jupiter Swap Lite, Micro Savings, Web3 Gift Cards) sang hệ thống từ điển đa ngôn ngữ.
  - **3. Tái Cấu Trúc Bộ Chọn Ngôn Ngữ Mở Rộng ([app/settings.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/settings.tsx), [services/i18n.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/i18n.ts))**:
    - Tạo mảng `SUPPORTED_LANGUAGES` mở rộng chuẩn bị sẵn cho lộ trình quốc tế hóa: 🇻🇳 Tiếng Việt, 🇬🇧 English, 🇯🇵 日本語, 🇰🇷 한국어, 🇨🇳 简体中文, 🇫🇷 Français, 🇩🇪 Deutsch, 🇪🇸 Español.
    - Tại Settings, hiển thị hàng menu chuẩn với cờ và tên ngôn ngữ hiện tại.
    - Khi bấm: Mở Modal Bottom Sheet danh sách ngôn ngữ với Radio checkmark xanh emerald (`#10B981`) cho ngôn ngữ đang chọn, gắn nhãn *"Sắp có"* cho các ngôn ngữ tương lai, và chuyển đổi mượt mà ngay lập tức.

---

### 🔹 [Phase 2 - Bước 57: Bản Địa Hóa Thẻ Khởi Đầu (Next Steps & Onboarding) Tại Trang Chủ]
- **Type:** `[I18N]` | `[ONBOARDING]` | `[UI/UX]`
- **Mục tiêu**:
  - Đa ngôn ngữ hóa toàn bộ thành phần hướng dẫn Onboarding (`Next steps`), cảnh báo thiết bị lạ (`New device detected`), và trạng thái liên kết tài khoản (`Connect Account`).
  - Xử lý chuyển ngữ động cho chuỗi gợi ý `(Chạm để quản lý)` $\leftrightarrow$ `(Tap to manage)` và `(Chạm để thêm SĐT)` $\leftrightarrow$ `(Tap to add phone)`.
- **Giải pháp triển khai chi tiết**:
  - **1. Cập Nhật Từ Điển & Bộ Phân Giải Biến Động ([services/i18n.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/i18n.ts))**:
    - Thêm các khóa dịch thuật `newDeviceTitle`, `newDeviceDesc`, `recover`, `nextSteps`, `stepCount`, `connectAccount`, `linkedPhoneTapToManage`, `signedInTapToAddPhone`, `makeDeposit`, `readyHint` vào cả 2 ngôn ngữ `vi` và `en`.
    - Nâng cấp bộ phân giải `useTranslation` để tự động thay thế tất cả các biến template dạng `{{variable}}` (như `{{phone}}`, `{{current}}`, `{{total}}`).
  - **2. Đồng Bộ Hóa Trang Chủ ([app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/index.tsx))**:
    - Gắn kết `t('home.connectAccount')`, `t('home.linkedPhoneTapToManage')`, `t('home.signedInTapToAddPhone')`, `t('home.nextSteps')`, `t('home.stepCount')` và `t('home.makeDeposit')` vào toàn bộ khối Onboarding.

---

### 🔹 [Phase 2 - Bước 58: Đa Ngôn Ngữ Hóa Toàn Bộ Modal Nạp Tiền & Chuyển Tiền On-Chain]
- **Type:** `[I18N]` | `[DEPOSIT]` | `[SEND]` | `[RECOVERY]` | `[UI/UX]`
- **Mục tiêu**:
  - Khắc phục tình trạng khi mở Modal Nạp Tiền (`DepositModal`) và Màn hình / Modal Chuyển Tiền (`SendModal`, `app/send.tsx`, `WalletRecoveryModal`), các tiêu đề, trường nhập liệu, lỗi tra cứu ví, cảnh báo và nút bấm bên trong bị kẹt chuỗi Tiếng Việt tĩnh.
- **Giải pháp triển khai chi tiết**:
  - **1. Xây Dựng Từ Điển Dịch Thuật Chuyên Sâu Cho Deposit & Send & Recovery ([services/i18n.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/i18n.ts))**:
    - Thêm module `deposit`: Toàn bộ tiêu đề modal, phụ đề, thẻ tùy chọn VNPAY / Solana Network, nhãn số tiền, nút sao chép, và hộp thoại giả lập nạp tiền VNPAY.
    - Thêm module `send`: Nhãn người nhận, placeholder tìm kiếm thông minh, cảnh báo tự chuyển cho chính mình, thông báo số dư không đủ, nút ký giao dịch on-chain, và trạng thái đang phát sóng.
    - Thêm module `recovery`: Các thông báo và nút khôi phục ví ngầm qua Cloud Sync / Google Drive / Passcode.
  - **2. Cập Nhật Các Component Nạp & Chuyển Tiền**:
    - [components/DepositModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/DepositModal.tsx)
    - [components/SendModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/SendModal.tsx)
    - [app/send.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/send.tsx)
    - [components/WalletRecoveryModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/WalletRecoveryModal.tsx)

---

### 🔹 [Phase 2 - Bước 59: Chuyển Đổi Trải Nghiệm Chuẩn MiniPay (Web3 Abstraction & Gasless USDC)]
- **Type:** `[WEB3_ABSTRACTION]` | `[USDC_SPL]` | `[GASLESS_FEE_PAYER]` | `[FIAT_BALANCE]` | `[UI/UX]`
- **Mục tiêu**:
  - Ẩn hoàn toàn yếu tố Web3 / Blockchain phức tạp khỏi trải nghiệm người dùng cuối, tương tự ví MiniPay.
  - Hiển thị số dư Fiat động 100% từ on-chain (`$100.00` $\leftrightarrow$ `đ 2,500,000`), không mock hay gán tĩnh.
  - Chuyển dịch toàn bộ giao dịch sang Stablecoin **USDC SPL Token** (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`) trên Solana Devnet.
  - Xây dựng cơ chế **Tài trợ phí mạng (Gasless Fee Payer Relayer)**: Người dùng ký một phần (Partial Sign) token USDC và Backend Treasury ký bù `feePayer` rồi broadcast on-chain.
  - Loại bỏ hoàn toàn chuỗi địa chỉ ví Base58 dài, thay bằng SĐT ẩn ký tự (`0912 ••• 678`) và Mã tài khoản động (`NED-xxxx`).
- **Giải pháp triển khai chi tiết**:
  - **1. Xây Dựng SPL Token Builders & Formatters ([services/solana.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/solana.ts))**:
    - `formatFiatBalance(usdAmount, currency)`: Render số dư trực quan định dạng `$USD` hoặc `đ VND`.
    - `getUsdcTokenBalance(address)` & `getAccountDisplayBalance(address)`: Đọc số dư trực tiếp từ on-chain Associated Token Account (ATA) và quy đổi ra Fiat.
    - `getAssociatedTokenAddress`, `createAssociatedTokenAccountInstruction`, `createSplTokenTransferInstruction`: Xây dựng cấu trúc SPL Token thuần `@solana/web3.js`.
    - `sponsorAndBroadcastTransaction`: Gọi Edge Function `sponsor-transfer` để Treasury ký Fee Payer và phát sóng giao dịch.
  - **2. Supabase Edge Function Gasless Relayer ([supabase/functions/sponsor-transfer/index.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/supabase/functions/sponsor-transfer/index.ts))**:
    - Nhận Partial Signed Transaction base64 từ client, ký bù bí mật với `TREASURY_SECRET_KEY` và broadcast lên Solana.
  - **3. Cập Nhật Hook Giao Dịch Core ([hooks/useOnchainTransfer.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/hooks/useOnchainTransfer.ts))**:
    - Tạo giao dịch chuyển USDC 6 decimals, tự động tạo ATA cho người nhận nếu chưa có, gán `feePayer = TREASURY_FEE_PAYER`, người dùng ký partial sign qua Privy.
  - **4. Tinh Chỉnh Giao Diện Người Dùng**:
    - [app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/index.tsx): Thẻ số dư hiển thị dynamic fiat balance, header hiển thị SĐT/mã tài khoản.
    - [components/SendModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/SendModal.tsx) & [app/send.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/send.tsx): Nhập số tiền USD, hiển thị tỷ giá VND và badge `Miễn phí chuyển tiền`.
    - [app/settings.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/settings.tsx): Hiển thị `Mã tài khoản: NED-xxxx`.
    - [services/i18n.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/i18n.ts): Thanh lọc toàn bộ từ vựng blockchain thành thuật ngữ tài khoản ngân hàng thân thiện.

---

### 🔹 [Phase 2 - Bước 60: Tối Ưu Hóa Bộ Ký Giao Dịch Đa Năng (Dual-Engine Signer) & Fix Intl Warning]
- **Type:** `[SOLANA_TRANSACTION]` | `[I18N_WARNING_FIX]` | `[RELIABILITY]`
- **Mục tiêu**:
  - Xử lý triệt để lỗi `Signature verification failed. Missing signature for public key [9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM]` khi phát sóng giao dịch on-chain.
  - Sửa cảnh báo `i18next::pluralResolver: Your environment seems not to be Intl API compatible` bằng cách cấu hình `compatibilityJSON: 'v3'`.
- **Giải pháp triển khai chi tiết**:
  - **1. Cơ Chế Dual-Engine On-Chain Transfer ([hooks/useOnchainTransfer.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/hooks/useOnchainTransfer.ts))**:
    - Tự động kiểm tra số dư on-chain của người gửi: Nếu có số dư USDC SPL Token $\rightarrow$ Chuyển SPL Token và tự tạo ATA cho người nhận. Nếu người gửi sở hữu SOL Devnet $\rightarrow$ Chuyển Native SOL tương đương.
    - Cấu hình `feePayer = fromPubkey` cho phép Transaction được ký hoàn chỉnh 100% từ ví người dùng và phát sóng trực tiếp lên Solana Devnet mà không bị phụ thuộc vào việc deploy trước Edge Function lên remote Supabase.
  - **2. Khắc Phục Cảnh Báo i18next ([services/i18n.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/services/i18n.ts))**:
    - Thêm `compatibilityJSON: 'v3'` vào `i18n.init()` giúp tương thích hoàn hảo với môi trường React Native Hermes / JSC.

---

### 🔹 [Phase 2 - Bước 61: Xây Dựng Giao Diện Neo-Brutalism & Custom Floating Pill Tab Bar]
- **Type:** `[NEO_BRUTALISM]` | `[CUSTOM_TAB_BAR]` | `[BALANCE_CARD]` | `[UI/UX]`
- **Mục tiêu**:
  - Tái thiết kế giao diện theo phong cách **Neo-brutalism** với viền đen dày (`borderWidth: 2-2.5px`) và bóng đổ đặc không làm mờ (`solid offset shadow`), chuẩn xác theo 3 hình ảnh thiết kế.
  - Xây dựng các component tái sử dụng (`NeoCard`, `NeoButton`, `NeoBalanceCard`) giải quyết triệt để bài toán hard shadow trên cả iOS, Android và Web.
  - Xây dựng **Custom Floating Pill Tab Bar**: Nổi phía dưới màn hình, Light Mode nền xanh mint nhạt, Tab Active mở rộng thành viên thuốc đen có icon + text Home, Tab Inactive là hình tròn tím nhạt; hỗ trợ sẵn Dark Mode.
  - Xây dựng **Home Layout & Neo Header**: Nền Beige sáng (`#F5EBE1`), Nút Profile tròn trắng viền đen góc trái và Nút QR góc phải.
- **Giải pháp triển khai chi tiết**:
  - **1. Neo Design Tokens ([components/neo/tokens.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/neo/tokens.ts))**: Định nghĩa hệ màu sắc, kích thước viền và độ lệch bóng đổ cho cả Light và Dark Mode.
  - **2. Reusable Components ([components/neo/NeoCard.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/neo/NeoCard.tsx), [components/neo/NeoButton.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/neo/NeoButton.tsx))**: Sử dụng lớp View đen offset phía sau kết hợp animation xúc giác trượt thụt bóng khi bấm.
  - **3. Neo Balance Card ([components/neo/NeoBalanceCard.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/neo/NeoBalanceCard.tsx))**: Thẻ tím bo góc `#9E77DC`, số dư Dollars `$100`, dòng phụ `đ 0.00`, 2 nút thao tác Deposit (vàng `#FFF1A6`) và Withdraw (xanh mint `#D8FAF7`), kèm nút bán nguyệt đính ở cạnh dưới đáy thẻ.
  - **4. Custom Floating Pill Tab Bar ([app/(tabs)/_layout.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/_layout.tsx))**: Căn giữa nổi phía dưới màn hình, chuyển trạng thái Active (viên thuốc đen) và Inactive (hình tròn tím nhạt) mượt mà.
  - **5. Cập Nhật Màn Hình Chính ([app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/index.tsx))**: Nền Beige sáng `#F5EBE1`, Header tròn Profile & QR, tích hợp hoàn hảo với `NeoBalanceCard` và toàn bộ logic on-chain.

---

### 🔹 [Phase 2 - Bước 62: Khắc Phục Lỗi Hiển Thị Màu Nút Deposit & Withdraw]
- **Type:** `[NEO_BUTTON_FIX]` | `[UI/UX]` | `[STYLING]`
- **Mục tiêu**:
  - Khắc phục tình trạng 2 nút `Deposit` và `Withdraw` bị đen thui do lớp bóng đổ `shadowUnderlay` đè lên lớp button chính.
- **Giải pháp triển khai chi tiết**:
  - **1. Phân Tầng zIndex & Layout Trong NeoButton ([components/neo/NeoButton.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/neo/NeoButton.tsx))**:
    - Đặt `shadowUnderlay` ở tầng dưới cùng `zIndex: 1`.
    - Gán trực tiếp `backgroundColor` và `zIndex: 5`, `elevation: 3` lên `Animated.View` của nút bấm để đảm bảo màu nền luôn hiển thị nổi bật trên mọi thiết bị.
  - **2. Cập Nhật Thẻ NeoBalanceCard ([components/neo/NeoBalanceCard.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/neo/NeoBalanceCard.tsx))**:
    - Nút **Deposit**: Nền vàng pastel `#FFF1A6`, viền đen 2px, icon `(↓)` trong vòng tròn trắng, chữ Deposit màu đen đậm (`#000000`).
    - Nút **Withdraw**: Nền xanh mint pastel `#D8FAF7`, viền đen 2px, icon `(↗)` trong vòng tròn trắng, chữ Withdraw màu đen đậm (`#000000`).

---

### 🔹 [Phase 2 - Bước 63: Nâng Cấp Next Steps, Recent Activities & Transfer Hub Chuẩn Neo-Brutalism]
- **Type:** `[NEO_BRUTALISM]` | `[NEXT_STEPS]` | `[RECENT_ACTIVITIES]` | `[TRANSFER_HUB]` | `[UI/UX]`
- **Mục tiêu**:
  - Cập nhật giao diện của 2 khối `Next steps` và `Recent Activities` trên màn hình Home và toàn bộ 3 thẻ tính năng trên màn hình `Transfer Hub` theo chuẩn thiết kế Neo-brutalism từ 2 hình ảnh tham chiếu.
- **Giải pháp triển khai chi tiết**:
  - **1. Khối Next Steps ([app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/index.tsx))**:
    - Bọc toàn bộ khối trong `NeoCard` nền trắng `#FFFFFF`, viền đen 2.5px, bóng đổ đen cứng 5px.
    - Progress Bar: Thanh bo góc viền đen 1.8px bao quanh, lõi màu xanh ngọc `#00A389`.
    - Badge `1 of 2`: Nền xanh ngọc `#00A389`, chữ trắng, viền đen 1.5px.
    - Checkbox & Nút: Vòng tròn checkbox viền đen dày 2px; Nút `Receive` nền xanh ngọc `#00A389`, viền đen 2px, chữ trắng, bóng đổ cứng.
  - **2. Khối Recent Activities ([app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/index.tsx))**:
    - Bọc trong `NeoCard` nền trắng `#FFFFFF`, viền đen 2.5px, bóng đổ đen cứng 5px.
    - Nút `See all >`: Dạng viên thuốc nền hồng nhạt `#FFD6E8`, viền đen dày 1.8px, chữ hồng đậm `#9D174D`.
    - Icon Giao dịch: Vòng tròn viền đen 2px; Nền hồng nhạt `#FFD6E8` cho giao dịch `Sent` (mũi tên `↗` đen) và Nền đỏ thẫm `#DC2626` cho giao dịch `Received` (mũi tên `↓` trắng).
  - **3. Màn hình Transfer Hub ([app/(tabs)/transfer-hub.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/transfer-hub.tsx))**:
    - Nền màn hình Beige sáng `#F5EBE1`, tiêu đề to đậm `Transfer Hub`.
    - 3 Thẻ tính năng `NeoFeatureCard` (dùng `NeoCard` viền đen 2.5px, bóng đổ cứng 5px):
      1. `Shake & Split bill`: Nền tím nhạt `#F3EBFF`, icon tím đậm viền đen.
      2. `Transfer by Phone Number`: Nền xanh ngọc nhạt `#E6FAF8`, icon xanh ngọc viền đen.
      3. `Coin Toss Lì Xì Room`: Nền trắng `#FFFFFF`, icon nâu/vàng viền đen.
    - Mỗi thẻ có badge `• Active` viền đen ở góc phải, đường kẻ ngang mảnh phân cách mô tả và nút điều hướng `Interact now ->` ở đáy thẻ.

---

### 🔹 [Phase 2 - Bước 64: Nâng Cấp Custom Tab Bar Bằng React-Native-Reanimated]
- **Type:** `[ANIMATION]` | `[REANIMATED]` | `[CUSTOM_TAB_BAR]` | `[PERFORMANCE]`
- **Mục tiêu**:
  - Loại bỏ hoàn toàn cảm giác giật và thô khi chuyển đổi giữa các tab.
  - Sử dụng `react-native-reanimated` để áp dụng chuyển động vật lý nảy nhẹ (`damping: 14, stiffness: 120`).
  - Thêm hiệu ứng **Scale Pop (bật nảy icon)** khi click vào tab.
  - Tách biệt component `AnimatedTabItem` độc lập với `React.memo`, toàn bộ hiệu ứng chạy 100% trên Main Thread (UI Thread).
- **Giải pháp triển khai chi tiết**:
  - **1. Component AnimatedTabItem ([app/(tabs)/_layout.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/_layout.tsx))**:
    - `useSharedValue`: Quản lý tiến trình active (`activeProgress`) và tỉ lệ icon (`iconScale`).
    - `animatedContainerStyle`: Tự co giãn chiều rộng (`44px` $\leftrightarrow$ `104px`) và biến thiên màu nền (`#D8BCFA` $\leftrightarrow$ `#111827`) mượt mà với `withSpring(SPRING_CONFIG)`.
    - `animatedIconStyle`: Bật nảy icon `withSequence(withSpring(1.25), withSpring(1.0))` khi active.
    - `animatedLabelStyle`: Chữ Label xuất hiện trượt nhẹ và tăng độ mờ `opacity: 0 -> 1`.
  - **2. Tối Ưu Hiệu Năng**:
    - Bọc trong `React.memo` giúp các tab không bị render lại không cần thiết khi React Navigation chuyển màn hình.

---

### 🔹 [Phase 2 - Bước 65: Tối Ưu Thông Số Lò Xo Tab Bar Tạo Cảm Giác Cơ Học & Dứt Khoát]
- **Type:** `[SPRING_PHYSICS]` | `[SNAPPY_ANIMATION]` | `[REANIMATED]` | `[UI/UX]`
- **Mục tiêu**:
  - Tinh chỉnh các tham số của `withSpring` để chuyển động tab diễn ra nhanh, cơ học và dứt khoát, triệt tiêu dao động dư thừa.
- **Giải pháp triển khai chi tiết**:
  - **1. Siết Lò Xo Chuyển Tab ([app/(tabs)/_layout.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/_layout.tsx))**:
    - Thiết lập `SPRING_CONFIG = { damping: 26, stiffness: 280, mass: 0.8 }`.
    - Giúp khối nền trượt cực nhanh tới đích và khựng lại 1 nhịp rất nhẹ, không bị nảy qua lại nhiều lần.
  - **2. Bật Nảy Icon Cơ Học (Scale Pop)**:
    - Hạ biên độ scale phóng to từ `1.2x` xuống `1.1x`.
    - Cấu hình độ nảy `ICON_SPRING_CONFIG = { damping: 20, stiffness: 300 }` tạo cảm giác phản hồi nút bấm vật lý cứng cáp.

---

### 🔹 [Phase 2 - Bước 66: Loại Bỏ Badge "Active" Khỏi Các Thẻ Transfer Hub]
- **Type:** `[UI_CLEANUP]` | `[TRANSFER_HUB]` | `[NEO_CARD]`
- **Mục tiêu**:
  - Bỏ toàn bộ badge "• Active" ở góc phải của cả 3 thẻ tính năng trên màn hình Transfer Hub (`app/(tabs)/transfer-hub.tsx`).
- **Giải pháp triển khai chi tiết**:
  - **1. Component NeoFeatureCard ([app/(tabs)/transfer-hub.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/transfer-hub.tsx))**:
    - Xóa thuộc tính `badgeText` và khối giao diện `activeBadgePill` khỏi header của thẻ.
    - Làm sạch các thẻ `Shake & Split bill`, `Transfer by Phone Number`, `Coin Toss Lì Xì Room` mang lại giao diện tinh gọn, tập trung vào icon và nội dung tính năng.

---

### 🔹 [Phase 2 - Bước 67: Tái Cấu Trúc Deposit Modal Bằng Root Modal & Reanimated]
- **Type:** `[MODAL_REFACTOR]` | `[Z_INDEX_FIX]` | `[REANIMATED]` | `[ANIMATION]`
- **Mục tiêu**:
  - Khắc phục lỗi Bottom Tab Bar đè lên Deposit Modal bằng cách render ở Root level (`<Modal transparent animationType="none">`).
  - Tách biệt animation: Backdrop chạy Fade-in (`opacity: 0 -> 0.6` với `withTiming`) và Bottom Sheet chạy Slide-up (`translateY: SCREEN_HEIGHT -> 0` với `withSpring`).
  - Đồng bộ luồng đóng (Close Transition): Chạy hiệu ứng trượt xuống & fade-out trước khi unmount component (`runOnJS`).
- **Giải pháp triển khai chi tiết**:
  - **1. Root Modal Level ([components/DepositModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/DepositModal.tsx))**:
    - Bọc toàn bộ UI trong `<Modal transparent={true} visible={visible || isModalMounted} animationType="none" statusBarTranslucent={true}>`.
    - Thoát khỏi stacking context của Tab Navigator, che phủ 100% màn hình bao gồm Bottom Tab Bar và Status Bar.
  - **2. Tách Biệt 2 Lớp Animation Độc Lập**:
    - **Lớp Backdrop**: `Pressable` absolute với `animatedBackdropStyle` (`opacity` fade-in/fade-out).
    - **Lớp Sheet**: `animatedSheetStyle` (`translateY` spring slide-up / timing slide-down).
  - **3. Luồng Đóng An Toàn (Close Transition)**:
    - Khi ấn nền đen hoặc nút đóng, kích hoạt `handleCloseWithAnimation`, đợi `withTiming` hoàn tất mới gọi `runOnJS(finishClose)()`.

---

### 🔹 [Phase 2 - Bước 68: Tối Ưu Easing Dứt Khoát Cho Deposit Bottom Sheet]
- **Type:** `[EASING_TIMING]` | `[MODAL_ANIMATION]` | `[REANIMATED]`
- **Mục tiêu**:
  - Loại bỏ hoàn toàn hiệu ứng đàn hồi `withSpring` của Deposit Bottom Sheet, thay bằng chuyển động trượt dứt khoát không có độ nảy.
- **Giải pháp triển khai chi tiết**:
  - **1. Cấu hình withTiming & Easing ([components/DepositModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/DepositModal.tsx))**:
    - Khi mở: `sheetTranslateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) })`.
    - Khi đóng: `sheetTranslateY.value = withTiming(SCREEN_HEIGHT, { duration: 220, easing: Easing.in(Easing.cubic) })`.
    - Giúp khối Bottom Sheet trượt nhanh từ dưới lên và dừng dứt khoát tại đích, không bị nảy rung.
  - **2. Độc Lập Backdrop**:
    - Giữ nguyên hiệu ứng mờ dần (Fade-in `0 -> 0.6` trong 300ms) của lớp nền đen.

---

### 🔹 [Phase 2 - Bước 69: Ứng Dụng Reanimated Layout Transitions & FadeIn/FadeOut Cho Deposit Modal]
- **Type:** `[LAYOUT_TRANSITIONS]` | `[REANIMATED]` | `[MODAL_SUBVIEWS]` | `[UI/UX]`
- **Mục tiêu**:
  - Giúp khung Deposit Modal tự động co giãn chiều cao mượt mà không bị giật cục khi chuyển đổi giữa các màn hình con (Options, VNPAY, Solana QR).
- **Giải pháp triển khai chi tiết**:
  - **1. Layout Transition Trên Container ([components/DepositModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/DepositModal.tsx))**:
    - Gán `layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}` lên `bottomSheetContainer`.
    - Box tự động tính toán chênh lệch chiều cao và mở rộng/thu gọn mượt mà, dứt khoát không có độ nảy.
  - **2. Chuyển Đổi Mờ Dần Nội Dung Con (Enter/Exit Animation)**:
    - Bọc cả 3 khối nội dung (`OPTIONS`, `VNPAY`, `SOLANA_QR`) trong `<Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>`.
    - Đảm bảo nội dung cũ biến mất nhẹ nhàng và nội dung mới hiện ra đồng bộ với tốc độ co giãn của khung modal.

---

### 🔹 [Phase 2 - Bước 70: Thiết Kế Khu Vực Sub-Wallets & Hệ Thống Swap Neo-Brutalism]
- **Type:** `[SUB_WALLETS]` | `[SWAP_POPUP]` | `[NEO_BRUTALISM]` | `[EXCHANGE_RATE]`
- **Mục tiêu**:
  - Mở rộng hệ thống ví đa tiền tệ với ScrollView ngang các ví phụ (VND, EUR, GBP, JPY).
  - Nút "Thêm ví" viền đen nét đứt (dashed border) mở Bottom Sheet kích hoạt ví mới.
  - Swap Popup phong cách Neo-brutalism với 2 khối Input lớn (USD nền tím, VND nền vàng) tự động tính toán tỷ giá tức thì và nút xác nhận đổi tiền to bản.
- **Giải pháp triển khai chi tiết**:
  - **1. Hook Quản Lý Sub-Wallets ([hooks/useSubWallets.ts](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/hooks/useSubWallets.ts))**:
    - Quản lý danh sách ví phụ, lưu trữ persistence qua AsyncStorage, hỗ trợ thêm/xóa ví và thực thi quy đổi tiền tệ.
  - **2. Component NeoSubWallets ([components/neo/NeoSubWallets.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/neo/NeoSubWallets.tsx))**:
    - ScrollView ngang: Nút "Thêm ví" viền đen nét đứt, cao 86px; Các thẻ mini ví phụ nền pastel (vàng VND, mint EUR...) viền đen 2px, bóng đổ cứng 3px.
  - **3. Component AddSubWalletModal ([components/neo/AddSubWalletModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/neo/AddSubWalletModal.tsx))**:
    - Bottom Sheet Root Modal chọn loại tiền tệ hỗ trợ (VND, EUR, GBP, JPY).
  - **4. Component NeoSwapModal ([components/neo/NeoSwapModal.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/neo/NeoSwapModal.tsx))**:
    - 2 Khối Input lớn: Khối USD (nền tím pastel `#EDE4FF`), Khối VND (nền vàng pastel `#FFF1A6`).
    - Icon mũi tên đảo chiều ở giữa.
    - TextInput font số cực lớn `fontSize: 32`, tự động nhân tỷ giá (1 USD ≈ 25,400 VND) khi gõ.
    - Nút "Xác Nhận Đổi Tiền" nền đen `#111827`, chữ trắng đậm, viền đen 2px và bóng đổ cứng.
  - **5. Tích Hợp HomeScreen ([app/(tabs)/index.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/app/%28tabs%29/index.tsx))**:
    - Render `NeoSubWallets` ngay dưới thẻ số dư chính và kết nối mở Modal Swap/Add Sub-wallet trơn tru.

---

### 🔹 [Phase 2 - Bước 71: Lồng Ghép Sub-Wallets Vào Thẻ Tím Hoạt Động Theo Cơ Chế Accordion]
- **Type:** `[ACCORDION]` | `[REANIMATED]` | `[BALANCE_CARD]` | `[UI/UX]`
- **Mục tiêu**:
  - Di chuyển toàn bộ block 'Ví Tiền Tệ Phụ' vào hoàn toàn BÊN TRONG thẻ tím chính (`NeoBalanceCard`), hoạt động theo cơ chế Accordion trượt mở/đóng.
- **Giải pháp triển khai chi tiết**:
  - **1. Accordion LinearTransition ([components/neo/NeoBalanceCard.tsx](file:///c:/Users/tdat1/github/Unihackfest-2026/ned-wallet/components/neo/NeoBalanceCard.tsx))**:
    - Gán `layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}` lên `Animated.View` ngoài cùng.
    - Toàn bộ viền đen 2.5px và bóng đổ cứng 5px của thẻ tím tự động mở rộng/thu gọn bao bọc lấy cả khu vực ví phụ.
  - **2. Render Có Điều Kiện & FadeIn/FadeOut**:
    - `{isExpanded && (<Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}> ... </Animated.View>)}`
    - Có đường kẻ ngang phân cách viền đen 2px ngăn cách giữa nút Action và vùng ví phụ.
  - **3. Xoay Mũi Tên Latch 180 Độ (Chevron Rotation)**:
    - Sử dụng `useSharedValue` và `useAnimatedStyle` xoay icon `chevron-down` từ `0deg` $\leftrightarrow$ `180deg` mượt mà khi người dùng bấm nút bán nguyệt để toggle.






























