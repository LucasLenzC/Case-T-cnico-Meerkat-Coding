const express = require('express');
const dashboardController = require('../controller/dashboard.controller');

const router = express.Router();

router.get('/resumo', dashboardController.resumo);

module.exports = router;
