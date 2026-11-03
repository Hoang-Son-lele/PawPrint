# Checklist nghiệm thu bộ khung

- [ ] Chạy database/01_schema.sql trong SSMS, xem các bảng dbo.Users/dbo.Pets/dbo.Moments/dbo.CareRecords...
- [ ] Backend/.env đã đúng tài khoản SQL login và có JWT_SECRET an toàn.
- [ ] Trong backend: `npm install` / `npm test` / `npm run dev`.
- [ ] `GET http://localhost:3000/api/health` trả `database: connected`.
- [ ] `POST /api/auth/register` tạo được user và token.
- [ ] `POST /api/auth/login` với mật khẩu đúng lấy được token.
- [ ] `POST /api/pets` với Bearer Token tạo được pet; `GET /api/pets` thấy pet.
- [ ] `GET /api/pets/:id/together-days` trả số ngày đồng hành đúng.
- [ ] Trong mobile: `npm install` / `npx expo start -c` chạy được.
- [ ] Đăng ký/login mobile → danh sách → tạo Pet → mở Pet Detail.
- [ ] Đăng xuất → màn hình đăng nhập.

**Chưa thể xác nhận các checkbox này chỉ bằng ZIP:** cần SQL Server, network và Expo chạy trực tiếp trên máy bạn. Khi gặp lỗi, chụp terminal hoặc dán log để mình sửa tiếp.
