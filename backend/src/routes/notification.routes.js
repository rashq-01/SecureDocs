const express = require('express');
const router = express.Router();
const { 
  getNotifications, 
  markAsRead, 
  markAllAsRead 
} = require('../controllers/notification.controller');
const verifyJWT = require('../middlewares/verifyJWT.middleware');

router.use(verifyJWT);

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

module.exports = router;
