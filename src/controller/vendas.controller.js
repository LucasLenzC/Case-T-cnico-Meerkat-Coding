const vendasRepository = require('../repositories/vendas.repository');

async function listar(req, res) {
  try {
    const vendas = await vendasRepository.listarVendas();
    res.json(vendas);
  } catch (erro) {
    console.error('Erro ao listar vendas:', erro.message);
    res.status(500).json({ mensagem: 'Não foi possível listar as vendas' });
  }
}

module.exports = { listar };
