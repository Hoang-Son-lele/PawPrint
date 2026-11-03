const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const authRequired = require("../middlewares/auth");
const {
  register,
  login,
  me,
  refresh,
  logout,
} = require("../controllers/auth.controller");
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/me", authRequired, me);
router.post("/refresh", authLimiter, refresh);
router.post("/logout", authLimiter, logout);
module.exports = router;
