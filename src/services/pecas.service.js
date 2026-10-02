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
async function deletarPeca(id) {
    return pecasRepository.deletarPeca(id);
}

module.exports = { listar, buscarPorId, inserir, deletarPeca };
