const pecasRepository = require('../repositories/pecas.repository');

async function listar() {
  return pecasRepository.listarPecas();
}

async function buscarPorId(id) {
  return pecasRepository.buscarPecaPorId(id);
}

async function inserir(peca) {
  return pecasRepository.inserirPeca(peca);
}

module.exports = { listar, buscarPorId, inserir };
