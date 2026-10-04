const pecasRepository = require('../repositories/pecas.repository');
const { normalizaPeca, normalizarCategoria } = require('../utils/normalizacao');
const { badRequest } = require('../utils/http-error');

function inteiroQuery(valor, nome, padrao, maximo = Number.MAX_SAFE_INTEGER) {
  if (valor === undefined || valor === '') return padrao;
  if (!/^\d+$/.test(String(valor))) throw badRequest(`${nome} inválido`);
  const resultado = Number(valor);
  if (!Number.isSafeInteger(resultado) || resultado < 1 || resultado > maximo) {
    throw badRequest(`${nome} inválido`);
  }
  return resultado;
}

function precoQuery(valor, nome) {
  if (valor === undefined || valor === '') return undefined;
  const resultado = Number(valor);
  if (!Number.isFinite(resultado) || resultado < 0) throw badRequest(`${nome} inválido`);
  return resultado;
}

function validarId(id) {
  if (!/^\d+$/.test(String(id)) || Number(id) < 1) throw badRequest('ID inválido');
  return Number(id);
}

function normalizarEntrada(peca) {
  try {
    return normalizaPeca(peca || {});
  } catch (erro) {
    throw badRequest(erro.message);
  }
}

async function listar(filtros = {}) {
  const page = inteiroQuery(filtros.page, 'Página', 1);
  const pageSize = inteiroQuery(filtros.pageSize, 'Tamanho da página', 10, 100);
  const precoMin = precoQuery(filtros.precoMin, 'Preço mínimo');
  const precoMax = precoQuery(filtros.precoMax, 'Preço máximo');
  if (precoMin !== undefined && precoMax !== undefined && precoMin > precoMax) {
    throw badRequest('Preço mínimo não pode ser maior que o preço máximo');
  }
  const camposOrdenaveis = [
    'id', 'sku', 'nome_peca', 'categoria', 'custo_unitario', 'estoque_atual', 'fornecedor'
  ];
  if (filtros.sortBy && !camposOrdenaveis.includes(filtros.sortBy)) {
    throw badRequest('Campo de ordenação inválido');
  }
  if (filtros.order && !['asc', 'desc'].includes(filtros.order)) {
    throw badRequest('Ordem de ordenação inválida');
  }

  return pecasRepository.listarPecas({
    texto: String(filtros.texto || '').trim(),
    categoria: filtros.categoria ? normalizarCategoria(filtros.categoria) : '',
    precoMin,
    precoMax,
    page,
    pageSize,
    sortBy: camposOrdenaveis.includes(filtros.sortBy) ? filtros.sortBy : 'id',
    order: filtros.order === 'desc' ? 'desc' : 'asc'
  });
}

async function buscarPorId(id) {
  return pecasRepository.buscarPecaPorId(validarId(id));
}

async function inserir(peca) {
  const pecaNormalizada = normalizarEntrada(peca);
  return pecasRepository.inserirPeca(pecaNormalizada);
}
async function deletarPeca(id) {
  return pecasRepository.deletarPeca(validarId(id));
}
async function atualizarPeca(id, pecaAtualizada) {
  const pecaNormalizada = normalizarEntrada(pecaAtualizada);
  return pecasRepository.atualizarPeca(validarId(id), pecaNormalizada);
}

module.exports = { listar, buscarPorId, inserir, deletarPeca, atualizarPeca };
