const router = require("express").Router();
const { randomUUID } = require("node:crypto");
const catalog = require("../controllers/catalog.controller");
const cart = require("../controllers/cart.controller");
const orders = require("../controllers/orders.controller");
router.use(require("../middlewares/auth"));
router.post("/traffic", require("../controllers/traffic.controller").record);
router.get("/checkout-key", (req, res) =>
  res.json({ requestKey: randomUUID() }),
);
router.get("/categories", catalog.listCategories);
router.get("/products", catalog.listProducts);
router.post("/products/search", catalog.listProducts);
router.get("/products/:id", catalog.getProduct);
router.get("/cart", cart.getCart);
router.put("/cart/:id", cart.updateCart);
router.delete("/cart/:id", cart.removeCartItem);
router.post("/orders", orders.createOrder);
router.get("/orders", orders.listOrders);
router.get("/orders/:id", orders.getOrder);
module.exports = router;
