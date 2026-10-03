const pecasService = require('../services/pecas.service');

async function listar(req, res) {
  try {
    const resultado = await pecasService.listar(req.query);
    res.json(resultado);
  } catch (erro) {
    console.error('Erro ao listar peças:', erro.message);
    res.status(500).json({ mensagem: 'Não foi possível listar as peças' });
  }
}

async function buscarPorId(req, res) {
  const id = req.params.id;
  try {
    const peca = await pecasService.buscarPorId(id);
    if (peca) {
      res.json(peca);
    } else {
      res.status(404).json({ mensagem: 'Peça não encontrada' });
    }
  } catch (erro) {
    console.error('Erro ao buscar peça por ID:', erro.message);
    res.status(500).json({ mensagem: 'Não foi possível buscar a peça' });
  }
}
async function inserir(req, res) {
  const peca = req.body;
  try {

    await pecasService.inserir(peca);
    res.status(201).json({ mensagem: 'Peça inserida com sucesso' });
  } catch (erro) {
  if (erro.message.includes('inválido') || erro.message.includes('obrigatório')) {
    return res.status(400).json({ mensagem: erro.message });
  }

  if (erro.code === 'P2002') {
    return res.status(409).json({ mensagem: 'SKU já cadastrado' });
  }

  res.status(500).json({ mensagem: 'Erro interno' });
}
}
async function deletarPeca(req, res) {
    const id = req.params.id;

    try {
        await pecasService.deletarPeca(id);
        res.status(200).json({ mensagem: 'Peça deletada com sucesso' });
    } catch (erro) {
        console.error('Erro ao deletar peça:', erro.message);
        res.status(500).json({ mensagem: 'Não foi possível deletar a peça' });
    }
}
async function atualizarPeca(req, res) {
    const id = req.params.id;
    const pecaAtualizada = req.body;
    try {


        await pecasService.atualizarPeca(id, pecaAtualizada);
        res.status(200).json({ mensagem: 'Peça atualizada com sucesso' });
    } catch (erro) {
        console.error('Erro ao atualizar peça:', erro.message);
        res.status(500).json({ mensagem: 'Não foi possível atualizar a peça' });
    }
}
module.exports = { listar, buscarPorId, inserir, deletarPeca, atualizarPeca };
