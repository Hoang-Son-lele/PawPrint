# PawPrint Starter 🐾

> **Cập nhật chức năng:** đã bổ sung Pet Shop bán trực tiếp, phân quyền admin/manage, quản lý tài khoản, nhật ký chăm sóc, upload ảnh Cloudinary, chụp ảnh tự lưu trên điện thoại, timeline và tổng kết tháng. Xem **[hướng dẫn và bảng đối chiếu SRS](docs/FEATURES.md)** để cấu hình Cloudinary, chạy thử và biết các phần còn thiếu. Chạy thêm `database/03_features.sql` và `database/04_media_roles.sql` khi cài mới. Các mô tả starter bên dưới là trạng thái ban đầu.

**Every Paw Leaves a Story** — bộ khung sẵn sàng để tiếp tục phát triển PawPrint trên **Windows + SQL Server**.

## Tech stack
- **Backend:** Node.js >= 22, Express 5, JavaScript (CommonJS), `mssql`, JWT, bcryptjs.
- **Mobile:** React Native + Expo **SDK 57**, JavaScript (không dùng TypeScript), Expo Router, expo-secure-store.
- **Database:** Microsoft SQL Server, SQL Server Authentication, file script SSMS.

> **Tình trạng:** Starter code, chưa phải bản MVP hoàn chỉnh. Đã viết code cho đăng ký, đăng nhập, JWT, `/auth/me`, Pet Profile CRUD, Together Days, giao diện đăng nhập/đăng ký/danh sách/tạo/xem/xóa mềm thú cưng. Các bảng nền của Moments, Media, Care Diary, Milestones và Notifications đã có trong schema **nhưng chưa có API/UI**. Refresh token, forgot-password, upload ảnh, AI, cloud storage, push notification và thanh toán chưa làm.

## Bắt đầu nhanh (Windows PowerShell)

1. Mở thư mục giải nén `PawPrint-Starter` trong VS Code. Cần cài Node.js **22 trở lên**, npm, SQL Server và SQL Server Management Studio (SSMS).
2. Trong SSMS, mở `database/01_schema.sql` rồi **Execute** để tạo `PawPrintDB` và các bảng.
3. Nếu chưa có SQL Server Authentication login, mở `database/02_create_app_login_TEMPLATE.sql`, **đổi password mẫu thành mật khẩu riêng**, chạy một lần trong SSMS. Nếu đang dùng Windows Authentication-only, xem `docs/WINDOWS_SETUP.md` để bật Mixed Mode.
4. Tạo `backend/.env` từ file mẫu:

   ```powershell
   Copy-Item backend\.env.example backend\.env
   ```

   Sửa **DB_SERVER**, **DB_PORT** hoặc **DB_INSTANCE**, **DB_USER**, **DB_PASSWORD**, **JWT_SECRET**. Trong `backend/.env.example` có hướng dẫn SQL Server mặc định và SQL Express.
5. Cài và chạy backend:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

   Mở **http://localhost:3000/api/health**. Kết quả đúng: `{"status":"ok","database":"connected"}`.
6. Mở **terminal PowerShell thứ hai** tại thư mục gốc, tạo `mobile/.env`, rồi chạy Expo:

   ```powershell
   Copy-Item mobile\.env.example mobile\.env
   cd mobile
   npm install
   npx expo start -c
   ```

   - **Android Emulator:** URL mẫu `http://10.0.2.2:3000/api` dùng được khi backend chạy trên cùng máy Windows.
   - **Android điện thoại thật:** Đổi `EXPO_PUBLIC_API_URL` thành `http://<IP-LAN-CUA-WINDOWS>:3000/api` (xem `ipconfig`). Điện thoại và máy tính phải cùng mạng Wi-Fi, mở firewall cho cổng 3000 nếu cần, cho phép kết nối HTTP khi **chỉ test local**.
   - **iOS Simulator trên macOS:** `http://localhost:3000/api`.
   - Khi sửa `mobile/.env`, **khởi động lại Expo** (`Ctrl+C`, `npx expo start -c`).
7. Mở app trên Android Emulator hoặc Expo Go tương thích SDK 57. Đăng ký, đăng nhập, thêm thú cưng để thử luồng end-to-end.

Đọc thêm: **[Hướng dẫn Windows & SQL Server](docs/WINDOWS_SETUP.md)**, **[API](docs/API.md)**, **[Roadmap](docs/ROADMAP.md)**.

## Cấu trúc

```text
PawPrint-Starter/
├── backend/
│   ├── src/
│   │   ├── config/          # .env, SQL connection pool
│   │   ├── controllers/     # auth, pets
│   │   ├── middlewares/     # JWT, error handling
│   │   ├── routes/          # /api/auth, /api/pets
│   │   ├── utils/           # validation, timezone
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   └── .env.example
├── database/
│   ├── 01_schema.sql
│   └── 02_create_app_login_TEMPLATE.sql
├── mobile/
│   ├── app/                 # Expo Router pages
│   │   ├── _layout.js
│   │   ├── index.js
│   │   ├── login.js
│   │   ├── register.js
│   │   └── pets/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   └── services/
│   └── .env.example
├── docs/
└── README.md
```

## Test backend

```powershell
cd backend
npm test
```

Test tự động hiện kiểm tra tính ngày đồng hành, date format và UUID, **không thay thế test tích hợp SQL Server**. Hãy test API bằng Postman theo `docs/API.md`.

## Các lưu ý trước khi production

- `DB_TRUST_SERVER_CERTIFICATE=true` / `DB_ENCRYPT=false` chỉ dùng để hỗ trợ SQL Server local. Production phải kiểm tra TLS và chứng chỉ hợp lệ.
- Chỉ dùng `SQL Authentication` trong starter, không dùng Windows Integrated Authentication qua package `mssql` mặc định.
- JWT 7 ngày là cấu hình tiện phát triển. Khi triển khai thật cần access/refresh token riêng, revoke token, reset password, xác minh email, giới hạn login, logging có kiểm soát, backup, quản lý secrets và chuẩn HTTPS.
- `Expo SDK 57` được chọn để phù hợp Expo Go ở thời điểm tạo starter (21/10/2026), xem thông báo nâng cấp khi Expo Go chuyển sang SDK 58. Không cài React Native khác phiên bản tương thích Expo SDK 57.
- `mobile/.env` sử dụng biến **EXPO_PUBLIC_** nên giá trị sẽ nằm trong ứng dụng; **không để password, JWT secret hay API key vào đây**.
- API `DELETE /pets/:id` sử dụng **soft delete** và mobile có hộp xác nhận. Chính sách xóa hẳn và dữ liệu liên quan sẽ chốt sau.

**Dựa trên:** PawPrint SRS 1.0 ngày 15/10/2026, các module MVP Auth, Pet Profile, Together Days, Moments, Timeline, Care Diary và notification cơ bản; công nghệ đã tùy chỉnh theo yêu cầu Node.js + Express + React Native JavaScript + SQL Server.
