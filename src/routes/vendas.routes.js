const express = require('express');
const vendasController = require('../controller/vendas.controller');

const router = express.Router();

router.get('/', vendasController.listar);

module.exports = router;
