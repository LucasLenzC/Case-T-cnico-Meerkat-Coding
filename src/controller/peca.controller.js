const pecasService = require('../services/pecas.service');

async function listar(req, res ) {
  try {
    const pecas = await pecasService.listar();
    res.json(pecas);
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
    console.error('Erro ao inserir peça:', erro.message);
    res.status(500).json({ mensagem: 'Não foi possível inserir a peça' });
  }
}
module.exports = { listar, buscarPorId, inserir };
