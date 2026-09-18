# N.E.D Wallet 🚀

![N.E.D Wallet Banner](https://drive.google.com/uc?export=view&id=YOUR_BANNER_IMAGE_ID)

## 1. Giới thiệu dự án (Project Overview)

**Tên dự án:** N.E.D Wallet

**Mô tả:** N.E.D Wallet là một ví Web3 thông minh trên nền tảng Solana, được thiết kế tập trung vào trải nghiệm người dùng liền mạch (chuẩn Web2.5). Ứng dụng mang phong cách thiết kế **Neo-brutalism** phá cách, độc đáo và cung cấp giải pháp quản lý linh hoạt, an toàn cho các tài sản Stablecoin của bạn.

---

## 2. Hình ảnh minh họa (Screenshots & Assets)

*(Lưu ý: Thay thế `YOUR_IMAGE_ID` trong các link dưới đây bằng ID thực tế của từng ảnh trên Google Drive để GitHub render trực tiếp)*

| Home | Analytics | QR Scan | Auth |
| :---: | :---: | :---: | :---: |
| ![Home](https://drive.google.com/uc?export=view&id=YOUR_HOME_IMAGE_ID) | ![Analytics](https://drive.google.com/uc?export=view&id=YOUR_ANALYTICS_IMAGE_ID) | ![QR Scan](https://drive.google.com/uc?export=view&id=YOUR_SCAN_IMAGE_ID) | ![Auth](https://drive.google.com/uc?export=view&id=YOUR_AUTH_IMAGE_ID) |

> 🎨 **Toàn bộ tài nguyên thiết kế:** [Xem trên Google Drive](https://drive.google.com/drive/folders/1e1gSUG-g5Ha5jdqUT4mdwWAhQoJOlz68?usp=drive_link)

---

## 3. Tính năng nổi bật (Key Features)

* 🎨 **Giao diện Neo-brutalism:** Hệ thống UI/UX độc đáo với viền đen dày, bóng đổ cứng (hard shadows) và tích hợp các hiệu ứng phản hồi haptic sinh động mang lại cảm giác chân thực.
* ⚡ **Gasless Transactions:** Trải nghiệm Web2.5 hoàn hảo. Ví tài trợ phí mạng lưới (network fee) thông qua Relayer (NED-Hub), giúp người dùng thực hiện giao dịch hoàn toàn miễn phí mà không cần giữ SOL làm phí gas.
* 🌍 **Đa ngôn ngữ (i18n):** Hỗ trợ chuyển đổi toàn diện và mượt mà giữa Tiếng Việt và Tiếng Anh trên toàn bộ ứng dụng.
* 🔒 **Bảo mật & Quản lý:** Tách biệt dữ liệu thẻ Stablecoin của từng tài khoản một cách an toàn thông qua chính sách bảo mật Row Level Security (RLS) của Supabase.

---

## 4. Kiến trúc hệ thống (Architecture)

N.E.D Wallet hoạt động dựa trên cơ chế ký giao dịch một phần (partial sign) kết hợp với Relayer Server để đài thọ phí giao dịch cho người dùng.

```mermaid
sequenceDiagram
    participant C as Client (N.E.D Wallet)
    participant S as Supabase (Database)
    participant R as NED-Hub (Relayer Server)
    participant B as Solana Network

    C->>S: Xác thực người dùng & Truy xuất ví (RLS)
    S-->>C: Trả về thông tin danh mục Stablecoin
    C->>C: Khởi tạo giao dịch & User ký (Partial Sign)
    C->>R: Gửi giao dịch đã ký một phần lên Relayer
    R->>R: Kiểm tra Rate Limit & Thêm chữ ký Fee Payer (Tài trợ Gas)
    R->>B: Đẩy giao dịch hoàn chỉnh lên mạng Solana
    B-->>R: Trả về trạng thái giao dịch (Tx Hash)
    R-->>C: Thông báo giao dịch thành công/thất bại
```

---

## 5. Công cụ & Công nghệ (Tech Stack)

Dự án được xây dựng với các công nghệ hiện đại và mạnh mẽ nhất:

* **Framework & UI:**

| Công nghệ | Vai trò trong hệ thống |
| :--- | :--- |
| ![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) | Nền tảng cốt lõi phát triển giao diện Cross-platform |
| ![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white) | Quản lý vòng đời ứng dụng, cấp quyền thiết bị & build hệ thống |
| ![Reanimated](https://img.shields.io/badge/Reanimated-FF4154?style=for-the-badge) | Xử lý hiệu ứng mượt mà (60fps) mang phong cách Neo-brutalism |

* **Blockchain (Solana):**

| Công nghệ | Vai trò trong hệ thống |
| :--- | :--- |
| ![@solana/web3.js](https://img.shields.io/badge/Solana_Web3.js-14F195?style=for-the-badge&logo=solana&logoColor=white) | Tương tác trực tiếp với RPC và đọc/ghi dữ liệu lên mạng Solana |
| ![Anchor](https://img.shields.io/badge/Anchor-000000?style=for-the-badge&logo=anchor) | SDK chuẩn hóa tương tác với các Smart Contracts (Programs) |

* **Backend-as-a-Service & Auth:**

| Công nghệ | Vai trò trong hệ thống |
| :--- | :--- |
| ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white) | Lưu trữ Database (PostgreSQL) & phân quyền Row Level Security (RLS) |
| ![Privy](https://img.shields.io/badge/Privy_Auth-6B46C1?style=for-the-badge) | Giải pháp xác thực an toàn, khởi tạo ví Web3 nhúng (Embedded Wallet) |

* **State Management & Utils:**

| Công nghệ | Vai trò trong hệ thống |
| :--- | :--- |
| ![Zustand](https://img.shields.io/badge/Zustand-454545?style=for-the-badge) | Quản lý State tập trung, phân tách logic on-chain & UI tinh gọn |
| ![i18next](https://img.shields.io/badge/i18next-26A69A?style=for-the-badge) | Khung chuyển đổi đa ngôn ngữ (Localization - Tiếng Việt/Anh) |
