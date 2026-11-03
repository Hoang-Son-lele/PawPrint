# Chạy PawPrint trên Windows / SQL Server

## A. Kiểm tra SQL Server đã chạy

1. `Win + R` → `services.msc` → tìm **SQL Server (MSSQLSERVER)** hoặc **SQL Server (SQLEXPRESS)** → trạng thái **Running**.
2. Mở SSMS, đăng nhập bằng Windows Authentication để kiểm tra. Xem **Server name** trên ô Connect:
   - `.` / `localhost` / `TEN-MAY` → thường là default instance.
   - `.\SQLEXPRESS` / `TEN-MAY\SQLEXPRESS` → named instance.
3. Trong SQL Server Configuration Manager, kiểm tra **SQL Server Network Configuration → Protocols for ... → TCP/IP → Enabled**. Sau khi chỉnh phải restart SQL Server.
4. Nếu kết nối named instance theo `DB_INSTANCE`, SQL Server Browser có thể cần chạy; cách dễ xác định nhất là bật cổng TCP cố định rồi dùng `DB_PORT=1433` thay vì DB_INSTANCE, nhưng phải cấu hình đúng instance và firewall.

## B. SQL Server Authentication (khác Windows Authentication)

Driver JS `mssql` trong starter sử dụng **tài khoản SQL login + password**, không dùng Windows Integrated Authentication.

Nếu SSMS hiện chỉ đăng nhập bằng Windows Authentication:

1. Vào SSMS → chuột phải server → **Properties → Security → SQL Server and Windows Authentication mode**.
2. OK và khởi động lại SQL Server service.
3. Chạy `database/01_schema.sql` trong SSMS để có `PawPrintDB`.
4. Mở `database/02_create_app_login_TEMPLATE.sql`, **thay mật khẩu mẫu**, Execute **một lần** với tài khoản có quyền tạo login.
5. Dùng chính login/mật khẩu đó trong `backend/.env` (`DB_USER=pawprint_app`).
6. Thử dùng **SQL Server Authentication** để đăng nhập SSMS trước khi chạy backend.

Bạn cũng có thể dùng một SQL login đã tồn tại có quyền đọc/ghi trên `PawPrintDB`; không nhất thiết tạo `pawprint_app`.

**Lưu ý:** `02_create_app_login_TEMPLATE.sql` chỉ là script mẫu, không chạy nguyên với mật khẩu ví dụ. Nếu tên login đã tồn tại, bỏ qua hoặc sửa thủ công.

## C. File backend/.env

**Default SQL Server** (cổng 1433):

```dotenv
DB_SERVER=localhost
DB_PORT=1433
DB_INSTANCE=
DB_NAME=PawPrintDB
DB_USER=pawprint_app
DB_PASSWORD=<MAT_KHAU_BAN_DA_TAO>
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
```

**SQL Server Express (`SQLEXPRESS`)** — nếu SQL Server Browser hoạt động:

```dotenv
DB_SERVER=localhost
DB_PORT=
DB_INSTANCE=SQLEXPRESS
DB_NAME=PawPrintDB
DB_USER=pawprint_app
DB_PASSWORD=<MAT_KHAU_BAN_DA_TAO>
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
```

> Nếu tên instance dùng cổng khác 1433 hoặc dynamic port, phải xem TCP/IP Properties → IP Addresses → TCP Port/TCP Dynamic Ports. `DB_PORT` và `DB_INSTANCE` không được dùng đồng thời trong starter.

Đặt `JWT_SECRET` là một chuỗi ngẫu nhiên có ít nhất 32 ký tự (nên dài hơn), KHÔNG để nguyên giá trị mẫu. Có thể tạo secret trong PowerShell:

```powershell
$bytes = New-Object byte[] 48
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

## D. Lỗi thường gặp

| Lỗi | Kiểm tra |
| --- | --- |
| `ELOGIN` / `Login failed` | SQL Authentication, SQL login/password, Mixed Mode, quyền DB |
| `ETIMEOUT` / `ESOCKET` | SQL Server service, TCP/IP Enabled, server / instance / port, SQL Browser |
| `Cannot open database PawPrintDB` | Chạy `01_schema.sql` và cấp quyền cho SQL login |
| `/api/health` 500/không kết nối | Xem console backend, `.env`, kiểm tra DB pool |
| Mobile báo `Network request failed` | Kiểm tra API từ Windows, IP LAN/10.0.2.2, cùng Wi-Fi, firewall cổng 3000 |
| Expo không thấy QR / không mở app | `npx expo start -c`, phiên bản Expo Go hỗ trợ SDK 57, thử Android Emulator |

## E. Mobile Android Emulator vs điện thoại thật

`localhost` bên trong app không phải localhost của Windows khi chạy trên điện thoại thật.

- **Android Emulator (máy ảo Android chính thức):** dùng `10.0.2.2` trỏ về máy Windows.
- **Điện thoại thật:** chạy `ipconfig`, lấy **IPv4 Address** mạng Wi-Fi (ví dụ `192.168.1.8`), đặt `EXPO_PUBLIC_API_URL=http://192.168.1.8:3000/api`.
- **Backend** đã lắng nghe `0.0.0.0:3000`. Nếu máy khác không truy cập được, kiểm tra Windows Defender Firewall (chỉ mở trong mạng private đáng tin cậy) và chính sách cleartext HTTP của thiết bị. Production phải dùng HTTPS.

Không bao giờ mở SQL Server port ra Internet để test app. Mobile **chỉ gọi backend API**, backend mới kết nối DB.
