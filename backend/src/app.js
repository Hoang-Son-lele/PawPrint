const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const env = require("./config/env");
const { getPool } = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const petsRoutes = require("./routes/pets.routes");
const { asyncHandler } = require("./utils/http");
const { errorHandler, notFound } = require("./middlewares/errors");

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors(
    env.corsOrigin
      ? { origin: env.corsOrigin.split(",").map((x) => x.trim()) }
      : {},
  ),
);
app.use(express.json({ limit: "100kb" }));
app.get(
  "/api/health",
  asyncHandler(async (req, res) => {
    const pool = await getPool();
    await pool.request().query("SELECT 1 AS ok");
    res.json({ status: "ok", database: "connected" });
  }),
);
app.use("/api/auth", authRoutes);
app.use("/api/profile", require("./routes/profile.routes"));
app.use("/api/pets", petsRoutes);
app.use("/api/shop", require("./routes/shop.routes"));
app.use("/api", require("./routes/media.routes"));
app.use("/api", require("./routes/journal.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api", require("./routes/insights.routes"));
app.use(notFound);
app.use(errorHandler);
module.exports = app;
