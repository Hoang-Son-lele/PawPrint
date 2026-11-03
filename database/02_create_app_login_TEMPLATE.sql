-- TÙY CHỌN: ví dụ tạo tài khoản SQL Server Authentication riêng cho backend.
-- Chạy trong SSMS bằng tài khoản sysadmin sau khi sửa mật khẩu bên dưới.
-- Chỉ chạy một lần. KHÔNG commit mật khẩu thật lên Git.
-- Nếu đã có SQL login, bỏ qua file này.

USE master;
GO
CREATE LOGIN pawprint_app WITH PASSWORD = 'REPLACE_WITH_A_VERY_STRONG_PASSWORD!';
GO
USE PawPrintDB;
GO
CREATE USER pawprint_app FOR LOGIN pawprint_app;
GO
ALTER ROLE db_datareader ADD MEMBER pawprint_app;
ALTER ROLE db_datawriter ADD MEMBER pawprint_app;
GO
