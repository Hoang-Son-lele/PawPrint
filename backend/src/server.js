const app = require("./app");
const env = require("./config/env");
const { getPool } = require("./config/db");

(async () => {
  try {
    await getPool();
    app.listen(env.port, "0.0.0.0", () => {
      console.log(`PawPrint API: http://localhost:${env.port}/api/health`);
    });
  } catch (error) {
    console.error("Không kết nối được SQL Server:", error.message);
    console.error(
      "Kiểm tra backend/.env, SQL Server TCP/IP, login và database PawPrintDB.",
    );
    process.exitCode = 1;
  }
})();
