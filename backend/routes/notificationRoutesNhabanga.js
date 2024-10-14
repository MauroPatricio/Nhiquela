const express = require('express');
const { createNotification } = require('../controllers/notificationControllerNhabanga');
const router = express.Router();


router.post('/', createNotification);


module.exports = router;
