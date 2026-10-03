const pecasRepository = require('../repositories/pecas.repository');
const { normalizaPeca, normalizarCategoria } = require('../utils/normalizacao');

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
    categoria: filtros.categoria ? normalizarCategoria(filtros.categoria) : '',
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
  const pecaNormalizada = normalizaPeca(peca);
  return pecasRepository.inserirPeca(pecaNormalizada);
}
async function deletarPeca(id) {

    return pecasRepository.deletarPeca(id);
}
async function atualizarPeca(id, pecaAtualizada) {


    const pecaNormalizada = normalizaPeca(pecaAtualizada);
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
            .filter((campo) => Object.prototype.hasOwnProperty.call(pecaNormalizada, campo))
            .map((campo) => [campo, pecaNormalizada[campo]])
    );
    return pecasRepository.atualizarPeca(id, dadosAtualizacao);
}

module.exports = { listar, buscarPorId, inserir, deletarPeca, atualizarPeca };
