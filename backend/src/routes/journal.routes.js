const router = require("express").Router();
const { definitions } = require("../services/journal.service");
const {
  createJournalController,
  timeline,
} = require("../controllers/journal.controller");
router.use(require("../middlewares/auth"));
for (const [kind, definition] of Object.entries(definitions)) {
  const controller = createJournalController(kind, definition);
  router.get(`/pets/:petId/${kind}`, controller.list);
  router.post(`/pets/:petId/${kind}`, controller.create);
  router.patch(`/${kind}/:id`, controller.update);
  router.delete(`/${kind}/:id`, controller.remove);
}
router.get("/pets/:petId/timeline", timeline);
module.exports = router;
