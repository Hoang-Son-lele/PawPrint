# Chức năng bổ sung theo SRS

## Chạy thử

Database hiện tại đã được áp dụng `03_features.sql`, `04_media_roles.sql` và kiểm tra bằng integration test. Khi cài trên máy khác, chạy `01_schema.sql`, `03_features.sql`, rồi `04_media_roles.sql` trong SSMS. Các script hiện giữ lại dữ liệu cũ; không cần xóa database.

```powershell
cd backend
npm ci
npm run dev
```

Mở terminal thứ hai:

```powershell
cd mobile
npm ci
npx expo start -c
```

Trang chủ có Pet Shop, nhắc nhở và tổng kết. Cửa hàng mới sẽ trống cho tới khi quản trị viên thêm sản phẩm.

## Cấp quyền quản trị

Đăng ký một tài khoản bình thường trước. Người quản lý database thực hiện câu lệnh sau trong SSMS, thay email mẫu bằng tài khoản cần cấp quyền:

```sql
USE PawPrintDB;
UPDATE dbo.Users SET Role=N'admin' WHERE Email=N'email-quan-tri@example.com';
```

Đăng xuất rồi đăng nhập lại để thấy mục Quản lý tài khoản và Quản lý sản phẩm/đơn hàng. API kiểm tra quyền trực tiếp trong database ở mỗi yêu cầu. Đăng ký không cho phép tự chọn quyền admin.

Admin có màn hình tìm kiếm tài khoản, nâng/hạ quyền `owner`, `manage`, `admin`, khóa/mở khóa tài khoản. Không được tự khóa/hạ quyền; luôn giữ ít nhất một admin hoạt động. Thay đổi được ghi audit log và thu hồi refresh token của tài khoản đích. Tài khoản khóa bị từ chối ngay cả khi giữ access token cũ.

Role **manage** có CRUD sản phẩm và theo dõi/cập nhật đơn hàng, không được truy cập quản lý tài khoản hay audit log. Admin cũng có quyền quản lý cửa hàng. Xóa sản phẩm là ngừng bán để giữ toàn bộ lịch sử đơn hàng. Phân quyền hiển thị trên app và kiểm tra riêng tại API.

Trong Quản trị: thêm/sửa/ẩn sản phẩm, điều chỉnh tồn kho; xem thông tin giao hàng và sản phẩm trong từng đơn; xác nhận, bắt đầu giao, đánh dấu đã giao hoặc hủy đơn đang chờ. Hủy hoàn tồn kho trong cùng giao dịch; không hoàn hai lần. Thay đổi sản phẩm và trạng thái đơn được ghi audit log.

## Đối chiếu yêu cầu

| SRS | Hiện trạng |
| --- | --- |
| FR-01 | Có đăng ký, đăng nhập, đăng xuất, JWT, ownership; refresh token lưu hash, xoay token khi dùng, thu hồi khi đăng xuất. Chưa có quên mật khẩu, xác minh email. |
| FR-02 | CRUD hồ sơ hiện có; các màn nhật ký chọn và chuyển giữa nhiều thú cưng. Chưa có luồng tải ảnh đại diện. |
| FR-03 | Chặn ngày đón về tương lai theo múi giờ tài khoản. Tạo các mốc đã đạt khi đọc Together Days; đọc lại không tạo trùng. |
| FR-04 | Upload ảnh Cloudinary qua backend, lưu metadata trong SQL; chọn file trên web, chụp ảnh tự lưu trên điện thoại, sửa chú thích/xóa mềm. Ảnh authenticated, URL tải có chữ ký hết hạn sau 1 giờ. Cần cấu hình Cloudinary thực tế. |
| FR-05 | Timeline kết hợp khoảnh khắc, chăm sóc, mốc; lọc theo thú cưng/loại và phân trang. Chưa có chế độ nhóm tháng/năm. |
| FR-06 | CRUD cân nặng, tắm, cắt móng, khám thú y, ghi chú; xem lịch sử cân nặng trong tổng kết tháng. Chưa có biểu đồ cân nặng. |
| FR-07 | Nhắc cân nặng sau 30 ngày trong ứng dụng khi mở trang nhắc nhở. Chưa có scheduler, push, opt-out, AI. Không phải dịch vụ gửi thông báo nền. |
| FR-08 | Tổng kết tháng tính từ số bản ghi thật và lịch sử cân nặng. Chưa lưu snapshot recap, tổng kết năm, xuất/chia sẻ. |
| FR-09 | Chưa triển khai Cloud+, quota, thuê bao và thanh toán in-app. |
| FR-10 | Bán trực tiếp: danh mục/tìm kiếm/phân trang/chi tiết, giỏ hàng SQL, checkout COD, địa chỉ, đơn hàng, tồn kho, trạng thái giao thủ công. Chưa tích hợp cổng thanh toán, tính phí vận chuyển hay hãng vận chuyển. |
| FR-11 | Có RBAC admin/manage, quản lý tài khoản/quyền/trạng thái, sản phẩm/đơn hàng và API audit log. Chưa có kiểm duyệt nội dung, gói và dashboard vận hành. |

Mô hình Pet Shop bán trực tiếp được chọn theo yêu cầu người dùng. COD là phương thức hiện có. Tổng tiền chỉ gồm tiền hàng; màn checkout và chi tiết đơn nêu rõ phí giao hàng sẽ được cửa hàng xác nhận trước khi gửi. Không có thao tác thu tiền online.

Các hạng mục chưa có ở bảng trên vẫn là công việc còn lại; bản cập nhật này chưa đáp ứng toàn bộ SRS. Tích hợp ảnh/email/push/thanh toán cần chọn dịch vụ và cấu hình riêng qua biến môi trường. Không đặt khóa bí mật vào mobile.

Cloudinary đã có adapter; điền ba biến `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` trong `backend/.env` rồi khởi động lại backend. Các nhóm email, push, billing vẫn là cấu hình dự phòng, chưa có adapter. Cloud+ cho tính năng số cần luồng thanh toán in-app riêng với COD của cửa hàng.

`npm run dev` hiện theo dõi cả `src` và `.env`, tự khởi động lại backend khi lưu cấu hình. Nếu terminal cũ được mở trước cập nhật này, dừng bằng Ctrl+C rồi chạy lại `npm run dev` một lần. Kết quả `cloudinary:check` phản ánh cấu hình của tiến trình kiểm tra mới; backend cũ chưa khởi động lại có thể vẫn giữ cấu hình trước đó.

## Cloudinary và chụp ảnh

```dotenv
CLOUDINARY_CLOUD_NAME=ten-cloud-cua-ban
CLOUDINARY_API_KEY=api-key-cua-ban
CLOUDINARY_API_SECRET=api-secret-cua-ban
```

Không đưa API secret vào mobile hoặc commit `.env`. Không cần unsigned upload preset: backend nhận multipart, kiểm tra ownership, định dạng thực và giới hạn 10 MB, rồi dùng Cloudinary SDK để tải ảnh JPEG/PNG/WebP dưới dạng authenticated. SQL chỉ lưu public ID, định dạng, dung lượng và quan hệ moment. Upload thất bại không tạo bản ghi khoảnh khắc; client giữ ảnh để thử lại với cùng request key nhằm tránh trùng bản ghi. Nếu Cloudinary đã nhận ảnh nhưng SQL lỗi, retry dùng lại public ID đó. Việc xóa khoảnh khắc hiện ẩn bản ghi; không xóa vật lý ảnh Cloudinary.

Web: Khoảnh khắc → chọn thú cưng → Chọn file ảnh → nhập chú thích → Lưu khoảnh khắc. Điện thoại: cho phép camera, chụp và xác nhận ảnh; ảnh tự upload và danh sách tải lại ngay khi lưu thành công. Có thể chọn ảnh thư viện rồi nhấn lưu. Đây là cập nhật ngay trên thiết bị đang thao tác, chưa có đồng bộ đẩy giữa nhiều thiết bị. Mất mạng sẽ hiển thị lỗi và nút thử lại; chưa có hàng đợi upload nền hoặc lưu nháp sau khi đóng app.

Quản lý cửa hàng cũng có nút chọn ảnh sản phẩm để upload Cloudinary và xem trước ảnh. Ảnh sản phẩm là ảnh công khai cho catalog, tách khỏi ảnh khoảnh khắc authenticated. Upload xong vẫn cần nhấn Lưu sản phẩm để lưu thông tin sản phẩm.

Kiểm tra thông tin kết nối mà không in khóa bí mật:

```powershell
cd backend
npm run cloudinary:check
```

Nếu build native riêng, build lại sau khi thêm plugin `expo-image-picker` để áp dụng quyền camera/thư viện. Đã kiểm tra đóng gói native; thao tác camera thực tế vẫn cần thử trên thiết bị.

## Cấu trúc mã nguồn

- `backend/src/routes`: khai báo endpoint và middleware.
- `backend/src/controllers`: controller riêng cho tài khoản, catalog, giỏ hàng, đơn hàng, quản trị cửa hàng, nhật ký và media.
- `backend/src/services`: kiểm tra/lưu media Cloudinary và logic dữ liệu nhật ký.
- `backend/src/middlewares/roles.js`: kiểm tra quyền từ SQL Server.
- `mobile/app`: entry của Expo Router; các màn chính trỏ tới feature.
- `mobile/src/features`: home, shop, moments, accounts, store; tách form, card, hook và screen.
- `mobile/src/services/media.js`: chọn/chụp ảnh và multipart upload.
- `mobile/src/components`: typography, form controls và chip chọn dùng chung.
- `mobile/src/utils/format.js`: định dạng ngày, tiền và trạng thái đơn; không import tiện ích từ file route.

Access token mặc định 15 phút; refresh token 30 ngày, chỉ lưu hash SHA-256 trong SQL và xoay sau mỗi lần dùng. Mobile lưu refresh token trong SecureStore (web dùng sessionStorage), tự gia hạn một lần khi gặp 401. Cấu hình `.env` cũ có `JWT_EXPIRES_IN=7d` vẫn được ưu tiên, nên đổi thành `15m` khi muốn áp dụng TTL mới. Đăng xuất thu hồi refresh token hiện tại; access token đã cấp còn hiệu lực tới lúc hết hạn. Khi mất mạng, đăng xuất chỉ xóa token trên thiết bị; không xác nhận đã thu hồi phía server.

## API mới

Tất cả endpoint cần Bearer token. `/admin/accounts*` và `/admin/audit` chỉ dành cho `admin`; quản lý sản phẩm, ảnh sản phẩm và đơn hàng dành cho `admin` hoặc `manage`.

- `GET /api/shop/categories`
- `POST /api/auth/refresh`, `POST /api/auth/logout` với `{refreshToken}`
- `POST /api/pets/:petId/moments/photo` multipart: `file`, `caption`, `occurredAt`, `requestKey`.
- `GET /api/admin/accounts?search=&page=1`, `PATCH /api/admin/accounts/:id` với `{role,isActive}` (admin).
- `DELETE /api/admin/products/:id` (admin/manage): ngừng bán sản phẩm.
- `POST /api/admin/product-image` multipart `file` (admin/manage): upload ảnh công khai cho sản phẩm.
- `GET /api/shop/products?search=&category=&page=1&limit=20`
- `GET /api/shop/products/:id`
- `GET /api/shop/cart`, `PUT /api/shop/cart/:productId` với `{quantity}`, `DELETE /api/shop/cart/:productId`
- `GET /api/shop/checkout-key` lấy UUID để gửi `requestKey`; giữ cùng key khi retry.
- `POST /api/shop/orders` với `{requestKey,recipient,phone,address}`; giá và tổng lấy lại từ SQL, không nhận giá từ client.
- `GET /api/shop/orders?page=1`, `GET /api/shop/orders/:id`
- `GET /api/admin/products`, `POST /api/admin/products`, `PUT /api/admin/products/:id`
- `GET /api/admin/orders`, `PATCH /api/admin/orders/:id` với `{status}`
- `GET /api/admin/audit?page=1`
- `GET/POST /api/pets/:id/moments`, `PATCH/DELETE /api/moments/:id`
- `GET/POST /api/pets/:id/care-records`, `PATCH/DELETE /api/care-records/:id`
- `GET /api/pets/:id/timeline?type=all|moment|care|milestone&page=1`
- `GET /api/notifications`
- `GET /api/pets/:id/recaps?year=2026&month=11`

Các thao tác PATCH nhật ký nhận toàn bộ trường của bản ghi: `occurredAt` (YYYY-MM-DD), `caption` cho moments; hoặc `type`, `valueDecimal` (cho weight), `note` cho care. Care type: `weight`, `bath`, `nails`, `vet`, `note`.

## Kiểm tra

```powershell
cd backend
npm test
# Tích hợp SQL: tạo dữ liệu test riêng, xóa sau khi hoàn tất.
$env:RUN_SQL_TESTS='1'
npm test
Remove-Item Env:RUN_SQL_TESTS
```

Test tích hợp kiểm tra ownership, dữ liệu không hợp lệ, CRUD nhật ký, timeline, recap, mốc không trùng, RBAC, đơn hàng retry, tồn kho, hủy đơn và hai người mua đồng thời. Không thay thế kiểm thử thao tác trên thiết bị thật.

Test media/roles kiểm tra manage không vào quản lý tài khoản, admin đổi quyền/khóa/mở khóa, token cũ bị chặn sau khóa, upload ảnh gắn đúng pet, retry không trùng, truy vấn ảnh có ownership. Cloudinary trong bài test được giả lập, không xác nhận kết nối tài khoản Cloudinary thật.

Tham khảo triển khai: [Cloudinary authenticated media](https://cloudinary.com/documentation/control_access_to_media), [Cloudinary Upload API](https://cloudinary.com/documentation/image_upload_api_reference), [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/).
