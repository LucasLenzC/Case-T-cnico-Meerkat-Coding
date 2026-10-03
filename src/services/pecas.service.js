const pecasRepository = require('../repositories/pecas.repository');

async function listar(filtros = {}) {
  const page = Math.max(Number.parseInt(filtros.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(Number.parseInt(filtros.pageSize, 10) || 10, 1), 100);
  const precoMin = filtros.precoMin === undefined || filtros.precoMin === ''
    ? undefined
    : Number(filtros.precoMin);
  const precoMax = filtros.precoMax === undefined || filtros.precoMax === ''
    ? undefined
    : Number(filtros.precoMax);
  const camposOrdenaveis = [
    'id', 'sku', 'nome_peca', 'categoria', 'custo_unitario', 'estoque_atual', 'fornecedor'
  ];

  return pecasRepository.listarPecas({
    texto: String(filtros.texto || '').trim(),
    categoria: String(filtros.categoria || '').trim(),
    precoMin: Number.isFinite(precoMin) ? precoMin : undefined,
    precoMax: Number.isFinite(precoMax) ? precoMax : undefined,
    page,
    pageSize,
    sortBy: camposOrdenaveis.includes(filtros.sortBy) ? filtros.sortBy : 'id',
    order: filtros.order === 'desc' ? 'desc' : 'asc'
  });
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
