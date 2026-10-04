const express = require('express');
const importacaoController = require('../controller/importacao.controller');

const router = express.Router();

router.post('/csv', importacaoController.importar);

module.exports = router;
