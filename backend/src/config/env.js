require("dotenv").config();

function requireEnv(key) {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`Thiếu biến ${key} trong backend/.env`);
  return value;
}

const jwtSecret = requireEnv("JWT_SECRET");
if (jwtSecret.length < 32 || jwtSecret.includes("REPLACE_THIS")) {
  throw new Error("JWT_SECRET phải là chuỗi ngẫu nhiên dài ít nhất 32 ký tự.");
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  dbServer: requireEnv("DB_SERVER"),
  dbName: requireEnv("DB_NAME"),
  dbUser: requireEnv("DB_USER"),
  dbPassword: requireEnv("DB_PASSWORD"),
  dbPort: process.env.DB_PORT?.trim() || null,
  dbInstance: process.env.DB_INSTANCE?.trim() || null,
  dbEncrypt: process.env.DB_ENCRYPT === "true",
  dbTrustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  corsOrigin: process.env.CORS_ORIGIN?.trim() || null,
};

if (env.dbPort && env.dbInstance) {
  throw new Error("Chỉ sử dụng DB_PORT hoặc DB_INSTANCE, không dùng cả hai.");
}
if (
  env.dbPort &&
  (!Number.isInteger(Number(env.dbPort)) || Number(env.dbPort) < 1)
) {
  throw new Error("DB_PORT phải là số cổng hợp lệ.");
}
module.exports = env;
