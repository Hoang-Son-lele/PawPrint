require("dotenv").config();
const { getCloudinary } = require("../src/config/cloudinary");
(async () => {
  try {
    const result = await getCloudinary().api.ping({ timeout: 15000 });
    console.log(
      result.status === "ok"
        ? "Cloudinary: connected."
        : "Cloudinary: unexpected response.",
    );
  } catch (error) {
    console.error(
      error.status === 503
        ? "Cloudinary: missing backend environment variables."
        : `Cloudinary: connection failed (${error.http_code || error.code || "unknown"}).`,
    );
    process.exitCode = 1;
  }
})();
