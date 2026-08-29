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
- **Ghi chú:**
  - Đánh chặn điều hướng tab Card và hiển thị thông báo Đang phát triển.
