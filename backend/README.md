# 🐾 PawPrint – Backend API (MVP)

> Every Paw Leaves a Story · Node.js + Express 5 + TypeScript + Prisma + **TiDB** + Cloudinary

Hiện thực phạm vi **MVP (P0)** của SRS v1.0: Auth, Pet Profile, Together Days, Paw Moments,
Timeline (Pet Journey), Care Diary, upload ảnh, thông báo cơ bản.

## 1. Cấu trúc dự án

```
PAWprint/
├── database/
│   └── pawprint_tidb.sql        # Schema + seed cho TiDB (nguồn sự thật của DB)
└── backend/
    ├── prisma/schema.prisma     # Phản chiếu 1-1 file SQL (không dùng prisma migrate)
    ├── src/
    │   ├── config/env.ts        # Validate biến môi trường (zod, fail-fast)
    │   ├── lib/                 # prisma, logger, cloudinary, mailer, push, audit
    │   ├── common/              # errors, middlewares (auth, validate, rate-limit, error), utils
    │   ├── modules/             # mỗi module: *.schema.ts · *.service.ts · *.routes.ts
    │   │   ├── auth/  users/  pets/  milestones/  media/
    │   │   ├── moments/  care-records/  timeline/  notifications/  plans/
    │   ├── jobs/                # cron: nhắc cân nặng, mốc kỷ niệm, gửi push, dọn ảnh
    │   ├── routes.ts  app.ts  server.ts
    ├── tests/                   # vitest + supertest
    └── api.http                 # request mẫu
```

Kiến trúc phân lớp: **routes** (HTTP + validate) → **service** (nghiệp vụ, transaction) → **Prisma** (TiDB).

## 2. Cài đặt

### 2.1 Database (TiDB)

Yêu cầu TiDB ≥ 6.6 (hỗ trợ FOREIGN KEY) – khuyến nghị TiDB 8.5 LTS hoặc TiDB Cloud.

```bash
mysql --comments -h <host> -P 4000 -u <user> -p < database/pawprint_tidb.sql
```

Script tạo database `pawprint`, 16 bảng và seed gói `FREE` / `CLOUD_PLUS_MONTHLY`.

### 2.2 Backend

```bash
cd backend
cp .env.example .env      # điền DATABASE_URL, JWT_ACCESS_SECRET, CLOUDINARY_*
npm install               # tự chạy prisma generate
npm run dev               # http://localhost:3000/api/v1
```

| Script | Mô tả |
|---|---|
| `npm run dev` | Chạy dev (tsx watch) |
| `npm run build && npm start` | Build & chạy production |
| `npm test` | Unit + HTTP smoke test (không cần DB) |
| `npm run typecheck` / `npm run lint` | Kiểm tra kiểu / lint |
| `npm run prisma:pull` | Đối chiếu schema Prisma với DB thật |

**TiDB Cloud Serverless** bắt buộc TLS:
`DATABASE_URL="mysql://USER:PASS@gateway01.<region>.prod.aws.tidbcloud.com:4000/pawprint?sslaccept=strict"`

## 3. API (prefix `/api/v1`)

Response thành công: `{ "data": ..., "meta"?: { "nextCursor": "..." } }`
Response lỗi: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details"?: [...] } }`

| Nhóm | Endpoint |
|---|---|
| Auth | `POST /auth/register` · `/auth/login` · `/auth/refresh` · `/auth/logout` · `/auth/logout-all` · `/auth/forgot-password` · `/auth/reset-password` · `/auth/verify-email` · `/auth/resend-verification` |
| User | `GET/PATCH /users/me` (timeZone, currentPetId, notifyEnabled) · `POST /users/me/change-password` · `POST/DELETE /users/me/devices` |
| Pets | `GET/POST /pets` · `GET/PATCH /pets/:id` · `DELETE /pets/:id?confirm=true` |
| Together Days | `GET /pets/:id/together-days` · `GET/POST /pets/:id/milestones` · `DELETE /milestones/:id` |
| Media | `POST /media/upload-url` · `POST /media/confirm` · `DELETE /media/:id` |
| Moments | `GET/POST /pets/:id/moments` · `GET/PATCH/DELETE /moments/:id` |
| Care Diary | `GET/POST /pets/:id/care-records` · `GET/PATCH/DELETE /care-records/:id` · `GET /pets/:id/weights` |
| Timeline | `GET /pets/:id/timeline` · `GET /timeline?petIds=` (lọc `kinds`, `careTypes`, `from`, `to`) |
| Notifications | `GET /notifications` · `GET /notifications/unread-count` · `POST /notifications/:id/read` · `POST /notifications/read-all` |
| Plans | `GET /plans` · `GET /subscriptions/me` |

Danh sách dùng **cursor pagination** (`?limit=20&cursor=<meta.nextCursor>`).

### Luồng upload ảnh (Cloudinary, upload trực tiếp từ mobile)

```mermaid
sequenceDiagram
  participant App
  participant API
  participant Cloudinary
  App->>API: POST /media/upload-url
  API-->>App: uploadUrl, apiKey, signature, params(public_id, timestamp, type=authenticated…)
  App->>Cloudinary: multipart: file + api_key + signature + params
  Cloudinary-->>App: 200
  App->>API: POST /media/confirm {publicId}
  API->>Cloudinary: Admin API kiểm tra format/size
  API-->>App: {id, url, thumbnailUrl}
  App->>API: POST /pets/:id/moments {caption, mediaIds:[id]}
```

- Ảnh dùng delivery type `authenticated` → chỉ xem được qua **URL có chữ ký** do API cấp.
- `public_id` nằm trong thư mục `pawprint/u_<userId>/…` → server kiểm tra ownership.
- Ảnh upload nhưng không gắn vào moment sau 24h sẽ tự bị xoá.

## 4. Mapping SRS → hiện thực

| SRS | Hiện thực |
|---|---|
| FR-01 | bcrypt (12 rounds), JWT access 15' + refresh token xoay vòng (phát hiện reuse → thu hồi cả chuỗi), token một lần cho verify email / reset mật khẩu, chống dò email |
| FR-02 | CRUD + `currentPetId`; pet đầu tiên tự được chọn; ngày sinh/đón về tuỳ chọn; xoá cần `confirm=true` |
| FR-03 | Tính theo múi giờ user; mốc 100/365/1000 chống trùng bằng unique `(pet_id, dedupe_key)`; chặn ngày đón về ở tương lai |
| FR-04 | Metadata trong TiDB, file trên Cloudinary; quota moments / ảnh mỗi moment / dung lượng theo gói |
| FR-05 | Gộp Moments + Milestones + Care, sắp theo ngày sự kiện, keyset pagination, trả `localDate` để nhóm ngày/tháng/năm |
| FR-06 | Cân nặng (kg), tắm, cắt móng, khám thú y, ghi chú; sửa/xoá; biểu đồ biến động cân nặng |
| FR-07 | Job theo giờ địa phương: nhắc cân nặng sau 30 ngày, thông báo mốc kỷ niệm; inbox in-app; push qua provider (log ở MVP) |
| NFR | Helmet, CORS allow-list, rate limit (chặt hơn cho auth), kiểm tra ownership từng pet, optimistic locking (`version`), soft-delete, audit log, log có redact secret |

## 5. Giả định cần xác nhận với khách hàng

> Các giá trị dưới đây đều cấu hình được, đặt theo đề xuất trong SRS mục 10.

1. **Đếm ngày đồng hành**: ngày đón về = ngày 1 (`COUNT_ADOPTION_DAY_AS_DAY_ONE` trong `together-days.ts`).
2. **Quota FREE**: 5 pet, 50 moments, 5 ảnh/moment, 1 GB; Cloud+ 19.000đ/tháng – chỉnh trong bảng `plans`.
3. Moment **bắt buộc ≥ 1 ảnh**; ảnh tối đa 10 MB, định dạng jpg/png/webp/heic.
4. Xoá pet = **soft-delete** toàn bộ dữ liệu liên quan (có thể khôi phục/purge theo chính sách).
5. Push notification: đã có bảng `device_tokens` + dispatcher có retry; cần service account FCM để bật gửi thật.
6. Jobs chạy trong process (node-cron) – chỉ bật `JOBS_ENABLED=true` trên **1 instance**.
