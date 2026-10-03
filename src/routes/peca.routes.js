const express = require('express');
const pecasController = require('../controller/peca.controller');

const router = express.Router();

router.get('/', pecasController.listar);
router.get('/:id', pecasController.buscarPorId);
router.post('/', pecasController.inserir);
router.delete('/:id', pecasController.deletarPeca);
router.put('/:id', pecasController.atualizarPeca);

module.exports = router;
