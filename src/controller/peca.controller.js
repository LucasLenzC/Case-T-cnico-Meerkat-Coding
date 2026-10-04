const pecasService = require('../services/pecas.service');

async function listar(req, res, next) {
  try {
    res.json(await pecasService.listar(req.query));
  } catch (erro) {
    next(erro);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const peca = await pecasService.buscarPorId(req.params.id);
    if (!peca) return res.status(404).json({ mensagem: 'Peça não encontrada' });
    return res.json(peca);
  } catch (erro) {
    return next(erro);
  }
}

async function inserir(req, res, next) {
  try {
    await pecasService.inserir(req.body);
    res.status(201).json({ mensagem: 'Peça inserida com sucesso' });
  } catch (erro) {
    next(erro);
  }
}

async function deletarPeca(req, res, next) {
  try {
    await pecasService.deletarPeca(req.params.id);
    res.json({ mensagem: 'Peça deletada com sucesso' });
  } catch (erro) {
    next(erro);
  }
}

async function atualizarPeca(req, res, next) {
  try {
    await pecasService.atualizarPeca(req.params.id, req.body);
    res.json({ mensagem: 'Peça atualizada com sucesso' });
  } catch (erro) {
    next(erro);
  }
}

module.exports = { listar, buscarPorId, inserir, deletarPeca, atualizarPeca };
