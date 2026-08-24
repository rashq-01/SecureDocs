const express = require('express');
const router = express.Router();
const { globalSearch } = require('../controllers/search.controller');
const verifyJWT = require('../middlewares/verifyJWT.middleware');

router.get('/', verifyJWT, globalSearch);

module.exports = router;
