# REST API hiện đã được viết

Base URL: `http://localhost:3000/api`. `Content-Type: application/json`.

| HTTP | Path | Auth | Chức năng |
| --- | --- | --- | --- |
| GET | `/health` | Không | SQL Server health check |
| POST | `/auth/register` | Không | Đăng ký + nhận JWT |
| POST | `/auth/login` | Không | Đăng nhập + nhận JWT |
| GET | `/auth/me` | Bearer JWT | Người dùng hiện tại |
| GET | `/pets` | Bearer JWT | Danh sách thú cưng của user |
| POST | `/pets` | Bearer JWT | Tạo Pet Profile |
| GET | `/pets/:id` | Bearer JWT | Xem một hồ sơ |
| PATCH | `/pets/:id` | Bearer JWT | Sửa các trường gửi lên |
| DELETE | `/pets/:id` | Bearer JWT | Xóa mềm một hồ sơ |
| GET | `/pets/:id/together-days` | Bearer JWT | Số ngày đồng hành theo timezone |

## Ví dụ 1. Đăng ký

```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "displayName": "Sơn",
  "email": "son@example.com",
  "password": "Password123!",
  "timeZone": "Asia/Ho_Chi_Minh"
}
```

Response 201: `{ "user": {"id": "...", "email": "..."}, "token": "<JWT>" }`.

## Ví dụ 2. Đăng nhập

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "son@example.com",
  "password": "Password123!"
}
```

Dán token trả về vào Postman → Authorization → Bearer Token.

## Ví dụ 3. Tạo thú cưng

```http
POST http://localhost:3000/api/pets
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "name": "Miu",
  "species": "cat",
  "breed": "Mèo ta",
  "sex": "female",
  "birthDate": "2025-08-20",
  "adoptedAt": "2026-01-01",
  "weightKg": 3.7,
  "notes": "Rất thích chơi bóng"
}
```

Các trường tùy chọn có thể bỏ qua/null. `species`: `dog` | `cat` | `other`; `sex`: `male` | `female` | `unknown` | null. Ngày có dạng `YYYY-MM-DD`.

## Ví dụ 4. Xem số ngày đồng hành

```http
GET http://localhost:3000/api/pets/<PET_ID>/together-days
Authorization: Bearer <TOKEN>
```

Trả `days: null` nếu chưa nhập ngày đón về. Nếu ngày đón về ở tương lai, API trả 400. Mốc tiếp theo được tính trong 100, 365, 1000 ngày.

## Ví dụ 5. Sửa / xóa mềm

```http
PATCH http://localhost:3000/api/pets/<PET_ID>
Authorization: Bearer <TOKEN>
Content-Type: application/json

{"name":"Miu Miu","weightKg":4.1}
```

`DELETE` yêu cầu xác nhận từ UI, server cập nhật `DeletedAt`, không xóa dữ liệu vĩnh viễn trong starter.

## Kiểm tra ownership

Mọi đường dẫn `/pets` đều yêu cầu JWT. Câu SQL lọc đồng thời theo `Id` và `UserId` lấy từ token, không nhận `UserId` do mobile gửi. Người A không thể đọc/sửa/xóa Pet của B (trả 404).

## API chưa làm

Refresh/forgot-password, media upload, paw moments, timeline, care diary, notification push, AI, recap, shop, subscription, admin. Các API này nằm ở các sprint sau trong `ROADMAP.md`.
