const router = require("express").Router();
const { createPhotoMoment } = require("../controllers/media.controller");
router.use(require("../middlewares/auth"));
router.post(
  "/pets/:petId/moments/photo",
  ...require("../middlewares/photo-upload"),
  createPhotoMoment,
);
module.exports = router;
