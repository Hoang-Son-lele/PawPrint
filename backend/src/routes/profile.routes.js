const router = require('express').Router();
const profile = require('../controllers/profile.controller');
router.use(require('../middlewares/auth'),require('../middlewares/roles')('owner'));
router.get('/',profile.get);
router.post('/avatar',...require('../middlewares/photo-upload'),require('../controllers/media.controller').uploadAvatar);
router.post('/',profile.save);
router.patch('/',profile.save);
router.delete('/',profile.remove);
module.exports=router;
