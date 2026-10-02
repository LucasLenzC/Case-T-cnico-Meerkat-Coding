const dashboardRepository = require('../repositories/dashboard.repository');

function normalizarTexto(valor) {
  return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function numero(valor) {
  const resultado = Number(valor ?? 0);
  return Number.isFinite(resultado) ? resultado : 0;
}

function arredondar(valor) {
  return Number(Number(valor).toFixed(2));
}

function descontoDecimal(valor) {
  const resultado = numero(valor);
  return resultado > 1 ? resultado / 100 : resultado;
}

function dataIso(valor) {
  const texto = String(valor ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto.slice(0, 10);
  const partes = texto.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  return partes ? `${partes[3]}-${partes[2]}-${partes[1]}` : '';
}

function vendaConcluida(venda) {
  return ['concluida', 'concluido', 'finalizada', 'finalizado'].includes(normalizarTexto(venda.status));
}

function categoriaDaPeca(peca) {
  const categoria = normalizarTexto(peca?.categoria);
  if (categoria.includes('freio') || categoria.includes('frenagem')) return 'Freios';
  if (categoria.includes('eletric')) return 'Elétrica';
  if (categoria.includes('suspens')) return 'Suspensão';
  if (categoria.includes('motor')) return 'Motor';
  if (categoria.includes('filtro')) return 'Filtros';
  return peca?.categoria || 'Sem categoria';
}

function lojaNormalizada(valor) {
  const loja = normalizarTexto(valor);
  if (loja.includes('norte')) return 'Loja Norte';
  if (loja.includes('sul')) return 'Loja Sul';
  if (loja.includes('centro')) return 'Loja Centro';
  return valor || 'Sem loja';
}

function dentroDosFiltros(venda, peca, filtros) {
  const data = dataIso(venda.data_venda);
  if (filtros.inicio && (!data || data < filtros.inicio)) return false;
  if (filtros.fim && (!data || data > filtros.fim)) return false;
  if (filtros.loja && lojaNormalizada(venda.loja) !== filtros.loja) return false;
  if (filtros.categoria && categoriaDaPeca(peca) !== filtros.categoria) return false;
  return true;
}

function calcularResumo({ pecas, vendas }, filtros = {}) {
  const pecasPorSku = new Map(pecas.map(peca => [String(peca.sku).trim(), peca]));
  const vendasConcluidas = vendas.filter(venda => {
    const peca = pecasPorSku.get(String(venda.sku).trim());
    return vendaConcluida(venda) && dentroDosFiltros(venda, peca, filtros);
  });

  const categorias = new Map();
  const vendidos = new Set(
    vendas.filter(vendaConcluida).map(venda => String(venda.sku).trim())
  );
  let faturamento = 0;
  let custo = 0;
  let unidades = 0;

  for (const venda of vendasConcluidas) {
    const peca = pecasPorSku.get(String(venda.sku).trim());
    const quantidade = numero(venda.quantidade);
    const receita = quantidade * numero(venda.preco_unitario) * (1 - descontoDecimal(venda.desconto));
    const custoVenda = quantidade * numero(peca?.custo_unitario);
    const nomeCategoria = categoriaDaPeca(peca);
    const grupo = categorias.get(nomeCategoria) || { categoria: nomeCategoria, faturamento: 0, margem: 0, unidades: 0 };

    faturamento += receita;
    custo += custoVenda;
    unidades += quantidade;
    grupo.faturamento += receita;
    grupo.margem += receita - custoVenda;
    grupo.unidades += quantidade;
    categorias.set(nomeCategoria, grupo);
  }

  const pecasNuncaVendidas = pecas.filter(peca =>
    numero(peca.estoque_atual) > 0 &&
    !vendidos.has(String(peca.sku).trim()) &&
    (!filtros.categoria || categoriaDaPeca(peca) === filtros.categoria)
  );

  const capitalParado = pecasNuncaVendidas.reduce(
    (total, peca) => total + numero(peca.estoque_atual) * numero(peca.custo_unitario),
    0
  );

  return {
    faturamento: arredondar(faturamento),
    custo: arredondar(custo),
    margem: arredondar(faturamento - custo),
    margemPercentual: arredondar(faturamento ? ((faturamento - custo) / faturamento) * 100 : 0),
    capitalParado: arredondar(capitalParado),
    vendas: new Set(vendasConcluidas.map(venda => venda.id_venda || venda.id)).size,
    unidades,
    categorias: [...categorias.values()].map(categoria => ({
      ...categoria,
      faturamento: arredondar(categoria.faturamento),
      margem: arredondar(categoria.margem)
    })).sort((a, b) => b.faturamento - a.faturamento),
    pecasNuncaVendidas,
    itens: vendasConcluidas.length,
    opcoes: {
      lojas: [...new Set(vendas.map(venda => lojaNormalizada(venda.loja)))].sort(),
      categorias: [...new Set(pecas.map(peca => categoriaDaPeca(peca)))].sort()
    },
    filtros
  };
}

async function resumoDashboard(filtros) {
  const dados = await dashboardRepository.buscarDadosDashboard();
  return calcularResumo(dados, filtros);
}

module.exports = { resumoDashboard, calcularResumo };
