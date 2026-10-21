-- =============================================================================
--  PAWPRINT – Database schema for TiDB (MySQL-compatible)
--  Version : 1.0 (MVP + placeholder tables cho V1.1 / V2)
--  Source  : PawPrint SRS v1.0 (15/10/2026) – mục 6 "Thiết kế dữ liệu"
--
--  Yêu cầu : TiDB >= 6.6 (hỗ trợ FOREIGN KEY; khuyến nghị TiDB 8.5 LTS / TiDB Cloud)
--  Cách chạy:
--     mysql --comments -h <host> -P 4000 -u <user> -p < pawprint_tidb.sql
--
--  Quy ước:
--   * Tên bảng/cột snake_case, khoá chính CHAR(36) = UUID v4 (sinh ở tầng ứng dụng).
--     UUID ngẫu nhiên phân tán ghi đều trên các Region của TiKV -> tránh hotspot
--     (không dùng AUTO_INCREMENT cho bảng ghi nhiều).
--   * Mọi DATETIME(3) lưu theo UTC. Múi giờ người dùng nằm ở users.time_zone (IANA).
--   * Cột DATE (birth_date, adopted_at, milestone_date) là "ngày lịch" không có giờ.
--   * Ảnh KHÔNG lưu trong DB: chỉ lưu metadata + storage_key (Cloudinary public_id).
--   * Soft-delete bằng deleted_at; cột version dùng cho optimistic locking
--     (thay cho rowversion của SQL Server).
--   * Collation utf8mb4_bin (mặc định của TiDB): so sánh nhị phân -> thứ tự id
--     trong DB trùng với so sánh chuỗi ở tầng ứng dụng (keyset pagination).
--     Email luôn được chuẩn hoá lowercase trước khi lưu.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS pawprint
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_bin;

USE pawprint;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- -----------------------------------------------------------------------------
-- (Tuỳ chọn) Reset toàn bộ schema – bỏ comment khi cần dựng lại từ đầu
-- -----------------------------------------------------------------------------
-- SET FOREIGN_KEY_CHECKS = 0;
-- DROP TABLE IF EXISTS audit_logs, products, payment_webhook_events, subscriptions,
--   plans, recaps, notifications, milestones, care_records, moment_media, moments,
--   pets, device_tokens, verification_tokens, refresh_tokens, users;
-- SET FOREIGN_KEY_CHECKS = 1;


-- =============================================================================
--  1. AUTH & USERS  (FR-01)
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id                 CHAR(36)      NOT NULL,
  email              VARCHAR(255)  NOT NULL COMMENT 'Luôn lưu dạng lowercase',
  password_hash      VARCHAR(255)  NOT NULL COMMENT 'bcrypt',
  display_name       VARCHAR(100)  NULL,
  time_zone          VARCHAR(64)   NOT NULL DEFAULT 'Asia/Ho_Chi_Minh' COMMENT 'IANA time zone',
  locale             VARCHAR(10)   NOT NULL DEFAULT 'vi',
  role               ENUM('USER','ADMIN')              NOT NULL DEFAULT 'USER',
  status             ENUM('ACTIVE','LOCKED','DELETED') NOT NULL DEFAULT 'ACTIVE',
  current_pet_id     CHAR(36)      NULL COMMENT 'Thú cưng đang chọn (FR-02). Không đặt FK để tránh vòng tham chiếu users<->pets; kiểm tra ở tầng ứng dụng',
  notify_enabled     TINYINT(1)    NOT NULL DEFAULT 1 COMMENT 'Opt-in nhận push notification',
  ai_consent_at      DATETIME(3)   NULL COMMENT 'V1.1: thời điểm đồng ý cho AI xử lý dữ liệu',
  email_verified_at  DATETIME(3)   NULL,
  last_login_at      DATETIME(3)   NULL,
  created_at         DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at         DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at         DATETIME(3)   NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_status (status)
) COMMENT = 'Tài khoản người dùng (Pet Owner / Admin)';


CREATE TABLE IF NOT EXISTS refresh_tokens (
  id              CHAR(36)     NOT NULL,
  user_id         CHAR(36)     NOT NULL,
  token_hash      CHAR(64)     NOT NULL COMMENT 'SHA-256 hex của refresh token, không lưu token gốc',
  family_id       CHAR(36)     NOT NULL COMMENT 'Chuỗi token xoay vòng – phát hiện token bị dùng lại',
  expires_at      DATETIME(3)  NOT NULL,
  revoked_at      DATETIME(3)  NULL,
  replaced_by_id  CHAR(36)     NULL,
  user_agent      VARCHAR(255) NULL,
  ip_address      VARCHAR(45)  NULL,
  created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_tokens_hash (token_hash),
  KEY idx_refresh_tokens_user (user_id),
  KEY idx_refresh_tokens_family (family_id),
  KEY idx_refresh_tokens_expires (expires_at),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) COMMENT = 'JWT refresh token (rotation)';


CREATE TABLE IF NOT EXISTS verification_tokens (
  id          CHAR(36)    NOT NULL,
  user_id     CHAR(36)    NOT NULL,
  purpose     ENUM('EMAIL_VERIFY','PASSWORD_RESET') NOT NULL,
  token_hash  CHAR(64)    NOT NULL,
  expires_at  DATETIME(3) NOT NULL,
  used_at     DATETIME(3) NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_verification_tokens_hash (token_hash),
  KEY idx_verification_tokens_user_purpose (user_id, purpose),
  CONSTRAINT fk_verification_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) COMMENT = 'Token xác minh email / quên mật khẩu (one-time)';


CREATE TABLE IF NOT EXISTS device_tokens (
  id            CHAR(36)     NOT NULL,
  user_id       CHAR(36)     NOT NULL,
  platform      ENUM('IOS','ANDROID','WEB') NOT NULL,
  token         VARCHAR(512) NOT NULL COMMENT 'FCM / APNs token',
  last_seen_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_device_tokens_token (token),
  KEY idx_device_tokens_user (user_id),
  CONSTRAINT fk_device_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) COMMENT = 'Thiết bị nhận push notification';


-- =============================================================================
--  2. PET PROFILE  (FR-02, FR-03)
-- =============================================================================

CREATE TABLE IF NOT EXISTS pets (
  id                  CHAR(36)      NOT NULL,
  user_id             CHAR(36)      NOT NULL,
  name                VARCHAR(100)  NOT NULL,
  species             ENUM('DOG','CAT','BIRD','RABBIT','HAMSTER','FISH','REPTILE','OTHER') NOT NULL DEFAULT 'OTHER',
  breed               VARCHAR(100)  NULL,
  sex                 ENUM('MALE','FEMALE','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  birth_date          DATE          NULL COMMENT 'Có thể chưa biết',
  adopted_at          DATE          NULL COMMENT 'Ngày đón về – gốc tính Together Days; không được ở tương lai',
  weight_kg           DECIMAL(6,2)  NULL COMMENT 'Cân nặng mới nhất (đồng bộ từ care_records WEIGHT)',
  avatar_storage_key  VARCHAR(255)  NULL COMMENT 'Cloudinary public_id',
  note                TEXT          NULL,
  version             INT           NOT NULL DEFAULT 1 COMMENT 'Optimistic locking',
  created_at          DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at          DATETIME(3)   NULL,
  PRIMARY KEY (id),
  KEY idx_pets_user (user_id, deleted_at),
  KEY idx_pets_adopted (adopted_at),
  CONSTRAINT fk_pets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) COMMENT = 'Hồ sơ thú cưng – 1 user sở hữu nhiều pet';


-- =============================================================================
--  3. PAW MOMENTS  (FR-04)
-- =============================================================================

CREATE TABLE IF NOT EXISTS moments (
  id           CHAR(36)       NOT NULL,
  pet_id       CHAR(36)       NOT NULL,
  user_id      CHAR(36)       NOT NULL COMMENT 'Phi chuẩn hoá để kiểm tra ownership & quota nhanh',
  caption      VARCHAR(2000)  NULL,
  occurred_at  DATETIME(3)    NOT NULL COMMENT 'Ngày ghi nhận (UTC)',
  visibility   ENUM('PRIVATE','FRIENDS','PUBLIC') NOT NULL DEFAULT 'PRIVATE' COMMENT 'MVP: luôn PRIVATE',
  version      INT            NOT NULL DEFAULT 1,
  created_at   DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at   DATETIME(3)    NULL,
  PRIMARY KEY (id),
  KEY idx_moments_pet_occurred (pet_id, deleted_at, occurred_at),
  KEY idx_moments_user (user_id, deleted_at),
  CONSTRAINT fk_moments_pet  FOREIGN KEY (pet_id)  REFERENCES pets  (id) ON DELETE CASCADE,
  CONSTRAINT fk_moments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) COMMENT = 'Khoảnh khắc (ảnh + caption)';


CREATE TABLE IF NOT EXISTS moment_media (
  id                CHAR(36)     NOT NULL,
  user_id           CHAR(36)     NOT NULL,
  moment_id         CHAR(36)     NULL COMMENT 'NULL khi ảnh đã upload nhưng chưa gắn vào moment',
  status            ENUM('UNATTACHED','ATTACHED') NOT NULL DEFAULT 'UNATTACHED',
  storage_provider  VARCHAR(20)  NOT NULL DEFAULT 'cloudinary',
  storage_key       VARCHAR(255) NOT NULL COMMENT 'Cloudinary public_id (type=authenticated)',
  mime_type         VARCHAR(100) NOT NULL,
  format            VARCHAR(20)  NULL,
  size_bytes        INT          NOT NULL,
  width             INT          NULL,
  height            INT          NULL,
  sort_order        INT          NOT NULL DEFAULT 0,
  created_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_moment_media_storage_key (storage_key),
  KEY idx_moment_media_moment (moment_id, sort_order),
  KEY idx_moment_media_user_status (user_id, status, created_at),
  CONSTRAINT fk_moment_media_moment FOREIGN KEY (moment_id) REFERENCES moments (id) ON DELETE CASCADE,
  CONSTRAINT fk_moment_media_user   FOREIGN KEY (user_id)   REFERENCES users   (id) ON DELETE CASCADE
) COMMENT = 'Metadata ảnh của moment – file thật nằm trên Cloudinary';


-- =============================================================================
--  4. PET CARE DIARY  (FR-06)
-- =============================================================================

CREATE TABLE IF NOT EXISTS care_records (
  id             CHAR(36)       NOT NULL,
  pet_id         CHAR(36)       NOT NULL,
  user_id        CHAR(36)       NOT NULL,
  type           ENUM('WEIGHT','BATH','NAIL_TRIM','VET_VISIT','NOTE','OTHER') NOT NULL,
  value_decimal  DECIMAL(10,3)  NULL COMMENT 'Bắt buộc với WEIGHT',
  unit           VARCHAR(20)    NULL COMMENT 'kg với WEIGHT',
  title          VARCHAR(200)   NULL,
  note           TEXT           NULL,
  occurred_at    DATETIME(3)    NOT NULL,
  version        INT            NOT NULL DEFAULT 1,
  created_at     DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at     DATETIME(3)    NULL,
  PRIMARY KEY (id),
  KEY idx_care_records_pet_occurred (pet_id, deleted_at, occurred_at),
  KEY idx_care_records_pet_type (pet_id, type, deleted_at, occurred_at),
  KEY idx_care_records_user (user_id),
  CONSTRAINT fk_care_records_pet  FOREIGN KEY (pet_id)  REFERENCES pets  (id) ON DELETE CASCADE,
  CONSTRAINT fk_care_records_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) COMMENT = 'Nhật ký chăm sóc: cân nặng, tắm, cắt móng, khám thú y, ghi chú';


-- =============================================================================
--  5. MILESTONES  (FR-03, FR-05)
-- =============================================================================

CREATE TABLE IF NOT EXISTS milestones (
  id              CHAR(36)      NOT NULL,
  pet_id          CHAR(36)      NOT NULL,
  user_id         CHAR(36)      NOT NULL,
  type            ENUM('TOGETHER_100','TOGETHER_365','TOGETHER_1000','BIRTHDAY','ADOPTION_ANNIVERSARY','CUSTOM') NOT NULL,
  milestone_date  DATE          NOT NULL,
  title           VARCHAR(200)  NOT NULL,
  note            VARCHAR(1000) NULL,
  is_system       TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '1 = hệ thống tự sinh',
  dedupe_key      VARCHAR(100)  NULL COMMENT 'Chống tạo mốc trùng (vd TOGETHER_100). NULL với CUSTOM',
  created_at      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at      DATETIME(3)   NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_milestones_pet_dedupe (pet_id, dedupe_key),
  KEY idx_milestones_pet_date (pet_id, deleted_at, milestone_date),
  CONSTRAINT fk_milestones_pet  FOREIGN KEY (pet_id)  REFERENCES pets  (id) ON DELETE CASCADE,
  CONSTRAINT fk_milestones_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) COMMENT = 'Mốc kỷ niệm: 100/365/1000 ngày đồng hành, mốc tuỳ chỉnh';


-- =============================================================================
--  6. NOTIFICATIONS  (FR-07 – MVP: theo lịch/quy tắc)
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id            CHAR(36)      NOT NULL,
  user_id       CHAR(36)      NOT NULL,
  pet_id        CHAR(36)      NULL,
  type          ENUM('WEIGHT_REMINDER','MILESTONE','SYSTEM') NOT NULL,
  title         VARCHAR(200)  NOT NULL,
  body          VARCHAR(1000) NOT NULL,
  data_json     JSON          NULL,
  dedupe_key    VARCHAR(150)  NULL COMMENT 'Chống gửi trùng cùng 1 quy tắc',
  status        ENUM('PENDING','SENT','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  scheduled_at  DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  sent_at       DATETIME(3)   NULL,
  read_at       DATETIME(3)   NULL,
  retry_count   INT           NOT NULL DEFAULT 0,
  last_error    VARCHAR(500)  NULL,
  created_at    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_notifications_user_dedupe (user_id, dedupe_key),
  KEY idx_notifications_user_created (user_id, created_at),
  KEY idx_notifications_status_scheduled (status, scheduled_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_pet  FOREIGN KEY (pet_id)  REFERENCES pets  (id) ON DELETE SET NULL
) COMMENT = 'Thông báo in-app + hàng đợi push';


-- =============================================================================
--  7. RECAP  (FR-08 – V1.1, tạo sẵn bảng)
-- =============================================================================

CREATE TABLE IF NOT EXISTS recaps (
  id            CHAR(36)    NOT NULL,
  pet_id        CHAR(36)    NOT NULL,
  period_type   ENUM('MONTH','YEAR') NOT NULL,
  period_start  DATE        NOT NULL,
  payload_json  JSON        NOT NULL COMMENT 'Số liệu tổng hợp từ dữ liệu thực tế',
  generated_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_recaps_pet_period (pet_id, period_type, period_start),
  CONSTRAINT fk_recaps_pet FOREIGN KEY (pet_id) REFERENCES pets (id) ON DELETE CASCADE
) COMMENT = 'Tổng kết tháng/năm (V1.1/V2)';


-- =============================================================================
--  8. PLANS & SUBSCRIPTIONS  (FR-09 Cloud+ – MVP chỉ dùng để tính quota)
-- =============================================================================

CREATE TABLE IF NOT EXISTS plans (
  id                    VARCHAR(32)    NOT NULL COMMENT 'Mã gói, vd FREE, CLOUD_PLUS_MONTHLY',
  name                  VARCHAR(100)   NOT NULL,
  description           VARCHAR(500)   NULL,
  price                 DECIMAL(12,2)  NOT NULL DEFAULT 0,
  currency              CHAR(3)        NOT NULL DEFAULT 'VND',
  billing_period        ENUM('NONE','MONTH','YEAR') NOT NULL DEFAULT 'NONE',
  max_pets              INT            NULL COMMENT 'NULL = không giới hạn',
  max_moments           INT            NULL COMMENT 'NULL = không giới hạn',
  max_media_per_moment  INT            NOT NULL DEFAULT 5,
  max_storage_mb        INT            NULL,
  is_active             TINYINT(1)     NOT NULL DEFAULT 1,
  sort_order            INT            NOT NULL DEFAULT 0,
  created_at            DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id)
) COMMENT = 'Danh mục gói dịch vụ & quota';


CREATE TABLE IF NOT EXISTS subscriptions (
  id                        CHAR(36)     NOT NULL,
  user_id                   CHAR(36)     NOT NULL,
  plan_id                   VARCHAR(32)  NOT NULL,
  provider                  ENUM('APP_STORE','GOOGLE_PLAY','MANUAL') NOT NULL,
  external_subscription_id  VARCHAR(255) NOT NULL,
  status                    ENUM('ACTIVE','GRACE','EXPIRED','CANCELLED') NOT NULL,
  started_at                DATETIME(3)  NOT NULL,
  expires_at                DATETIME(3)  NULL,
  auto_renew                TINYINT(1)   NOT NULL DEFAULT 1,
  created_at                DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at                DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_subscriptions_provider_external (provider, external_subscription_id),
  KEY idx_subscriptions_user_status (user_id, status, expires_at),
  CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES plans (id)
) COMMENT = 'Thuê bao in-app (App Store / Google Play)';


CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id            CHAR(36)     NOT NULL,
  provider      ENUM('APP_STORE','GOOGLE_PLAY') NOT NULL,
  event_id      VARCHAR(255) NOT NULL,
  payload_json  JSON         NOT NULL,
  processed_at  DATETIME(3)  NULL,
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_webhook_events (provider, event_id)
) COMMENT = 'V1.1 – idempotency cho webhook thanh toán';


-- =============================================================================
--  9. PET SHOP  (FR-10 – V2, tạo sẵn bảng)
-- =============================================================================

CREATE TABLE IF NOT EXISTS products (
  id             CHAR(36)       NOT NULL,
  name           VARCHAR(200)   NOT NULL,
  description    TEXT           NULL,
  image_url      VARCHAR(1024)  NULL,
  price          DECIMAL(12,2)  NOT NULL,
  currency       CHAR(3)        NOT NULL DEFAULT 'VND',
  affiliate_url  VARCHAR(1024)  NULL,
  is_active      TINYINT(1)     NOT NULL DEFAULT 1,
  created_at     DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_products_active (is_active)
) COMMENT = 'Sản phẩm Pet Shop / affiliate (V2)';


-- =============================================================================
-- 10. AUDIT LOG  (FR-11, NFR bảo mật – log truy cập quan trọng)
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id             CHAR(36)     NOT NULL,
  actor_user_id  CHAR(36)     NULL,
  action         VARCHAR(100) NOT NULL COMMENT 'vd auth.login, pet.delete',
  entity_type    VARCHAR(50)  NULL,
  entity_id      CHAR(36)     NULL,
  metadata_json  JSON         NULL,
  ip_address     VARCHAR(45)  NULL,
  user_agent     VARCHAR(255) NULL,
  created_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_audit_logs_actor (actor_user_id, created_at),
  KEY idx_audit_logs_entity (entity_type, entity_id)
) COMMENT = 'Nhật ký thao tác quan trọng (không FK để giữ log khi xoá user)';


-- =============================================================================
--  SEED DATA
-- =============================================================================

-- Quota gói FREE / Cloud+ là giá trị đề xuất – cần chốt với khách hàng (SRS mục 10)
INSERT INTO plans (id, name, description, price, currency, billing_period,
                   max_pets, max_moments, max_media_per_moment, max_storage_mb, is_active, sort_order)
VALUES
  ('FREE', 'Miễn phí', 'Gói mặc định', 0, 'VND', 'NONE', 5, 50, 5, 1024, 1, 0),
  ('CLOUD_PLUS_MONTHLY', 'Cloud+ (tháng)', 'Không giới hạn moments, nhiều ảnh hơn mỗi moment',
   19000, 'VND', 'MONTH', NULL, NULL, 10, NULL, 1, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  price = VALUES(price),
  max_pets = VALUES(max_pets),
  max_moments = VALUES(max_moments),
  max_media_per_moment = VALUES(max_media_per_moment),
  max_storage_mb = VALUES(max_storage_mb);

-- =============================================================================
-- END
-- =============================================================================
