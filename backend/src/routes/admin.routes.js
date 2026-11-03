const router = require("express").Router();
const store = require("../controllers/store.controller");
const accounts = require("../controllers/accounts.controller");
const roles = require("../middlewares/roles");
router.use(require("../middlewares/auth"));
router.get("/accounts", roles("admin"), accounts.list);
router.patch("/accounts/:id", roles("admin"), accounts.update);
router.get("/audit", roles("admin"), store.listAudit);
router.use(roles("manager", "staff"));
const categories = require("../controllers/categories.controller");
router.get("/categories", categories.list);
router.post("/categories", categories.save);
router.put("/categories/:id", categories.save);
router.delete("/categories/:id", categories.remove);
router.get("/traffic", require("../controllers/traffic.controller").summary);
router.post(
  "/product-image",
  ...require("../middlewares/photo-upload"),
  require("../controllers/media.controller").uploadProductImage,
);
router.get("/products", store.listProducts);
router.post("/products", store.saveProduct);
router.put("/products/:id", store.saveProduct);
router.delete("/products/:id", store.deleteProduct);
router.get("/orders", store.listOrders);
router.patch("/orders/:id", store.updateOrder);
module.exports = router;
