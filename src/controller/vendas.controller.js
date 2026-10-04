const vendasRepository = require('../repositories/vendas.repository');

async function listar(req, res, next) {
  try {
    res.json(await vendasRepository.listarVendas());
  } catch (erro) {
    next(erro);
  }
}

module.exports = { listar };
