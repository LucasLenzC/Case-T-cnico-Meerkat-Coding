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
async function atualizarPeca(id, pecaAtualizada) {
    const pecaExistente = await pecasRepository.buscarPecaPorId(id);
    if (!pecaExistente) {
        throw new Error('Peça não encontrada');
    }
    const camposPermitidos = [
        'sku',
        'nome_peca',
        'categoria',
        'custo_unitario',
        'fornecedor',
        'estoque_atual'
    ];
    const dadosAtualizacao = Object.fromEntries(
        camposPermitidos
            .filter((campo) => Object.prototype.hasOwnProperty.call(pecaAtualizada, campo))
            .map((campo) => [campo, pecaAtualizada[campo]])
    );
    return pecasRepository.atualizarPeca(id, dadosAtualizacao);
}

module.exports = { listar, buscarPorId, inserir, deletarPeca, atualizarPeca };
