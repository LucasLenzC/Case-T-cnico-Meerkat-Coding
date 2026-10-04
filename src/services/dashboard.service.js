const dashboardRepository = require('../repositories/dashboard.repository');
const {
  dataIso,
  normalizarData,
  normalizarCategoria,
  normalizarLoja,
  normalizarStatus
} = require('../utils/normalizacao');
const { badRequest } = require('../utils/http-error');

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

function vendaConcluida(venda) {
  try {
    return normalizarStatus(venda.status) === 'concluida';
  } catch {
    return false;
  }
}

function categoriaDaPeca(peca) {
  if (!peca?.categoria) return 'Sem categoria';
  try {
    return normalizarCategoria(peca.categoria);
  } catch {
    return 'Sem categoria';
  }
}

function lojaNormalizada(valor) {
  if (!valor) return 'Sem loja';
  try {
    return normalizarLoja(valor);
  } catch {
    return 'Sem loja';
  }
}

function normalizarFiltros(filtros = {}) {
  const categoriaInformada = String(filtros.categoria || '').trim();
  const valorData = (valor, nome) => {
    if (valor === undefined || valor === '') return '';
    try {
      return normalizarData(valor).toISOString().slice(0, 10);
    } catch (erro) {
      throw badRequest(`${nome} inválida`);
    }
  };
  const inicio = valorData(filtros.dataInicial || filtros.inicio, 'Data inicial');
  const fim = valorData(filtros.dataFinal || filtros.fim, 'Data final');
  if (inicio && fim && inicio > fim) throw badRequest('Data inicial não pode ser posterior à data final');

  return {
    inicio,
    fim,
    loja: filtros.loja ? lojaNormalizada(filtros.loja) : '',
    categoria: categoriaInformada ? categoriaDaPeca({ categoria: categoriaInformada }) : ''
  };
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
  const vendasFiltradas = vendas.filter(venda => {
    const peca = pecasPorSku.get(String(venda.sku).trim());
    return dentroDosFiltros(venda, peca, filtros);
  });
  const vendasConcluidas = vendasFiltradas.filter(venda => vendaConcluida(venda));

  const categorias = new Map();
  // A peça só é considerada nunca vendida se não houver venda concluída em todo o histórico.
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

  const pedidosConcluidos = new Set(vendasConcluidas.map(venda => venda.id_venda || venda.id));
  const pedidosNaoConcluidos = new Set(
    vendasFiltradas
      .filter(venda => !vendaConcluida(venda))
      .map(venda => venda.id_venda || venda.id)
      .filter(id => !pedidosConcluidos.has(id))
  );

  const lojasMaisVendas = new Map();
  const clientesQueMaisCompram = new Map();
  for (const venda of vendasConcluidas) {
    const peca = pecasPorSku.get(String(venda.sku).trim());
    const quantidade = numero(venda.quantidade);
    const receita = quantidade * numero(venda.preco_unitario) * (1 - descontoDecimal(venda.desconto));
    const idPedido = venda.id_venda || venda.id;
    const loja = lojaNormalizada(venda.loja);
    const cliente = String(venda.cliente || 'Cliente não informado').trim();
    const resumoLoja = lojasMaisVendas.get(loja) || { loja, faturamento: 0, unidades: 0, pedidos: new Set() };
    resumoLoja.faturamento += receita;
    resumoLoja.unidades += quantidade;
    resumoLoja.pedidos.add(idPedido);
    lojasMaisVendas.set(loja, resumoLoja);
    const resumoCliente = clientesQueMaisCompram.get(cliente) || { cliente, faturamento: 0, unidades: 0, pedidos: new Set() };
    resumoCliente.faturamento += receita;
    resumoCliente.unidades += quantidade;
    resumoCliente.pedidos.add(idPedido);
    clientesQueMaisCompram.set(cliente, resumoCliente);
  }

  const fornecedoresMaisPresentes = new Map();
  for (const peca of pecas) {
    if (filtros.categoria && categoriaDaPeca(peca) !== filtros.categoria) continue;
    const fornecedor = String(peca.fornecedor || 'Fornecedor não informado').trim();
    const resumoFornecedor = fornecedoresMaisPresentes.get(fornecedor) || {
      fornecedor,
      pecas: 0,
      estoque: 0,
      capitalEmEstoque: 0
    };
    const estoque = numero(peca.estoque_atual);
    resumoFornecedor.pecas += 1;
    resumoFornecedor.estoque += estoque;
    resumoFornecedor.capitalEmEstoque += estoque * numero(peca.custo_unitario);
    fornecedoresMaisPresentes.set(fornecedor, resumoFornecedor);
  }

  const formatarRanking = (mapa, criterio) => [...mapa.values()]
    .map(item => ({
      ...item,
      pedidos: item.pedidos ? item.pedidos.size : undefined
    }))
    .sort(criterio)
    .slice(0, 5);

  const vendasPorDia = new Map();
  for (const venda of vendasConcluidas) {
    const data = dataIso(venda.data_venda) || 'Sem data';
    const peca = pecasPorSku.get(String(venda.sku).trim());
    const quantidade = numero(venda.quantidade);
    const receita = quantidade * numero(venda.preco_unitario) * (1 - descontoDecimal(venda.desconto));
    const dia = vendasPorDia.get(data) || { data, pedidos: new Set(), unidades: 0, faturamento: 0 };
    dia.pedidos.add(venda.id_venda || venda.id);
    dia.unidades += quantidade;
    dia.faturamento += receita;
    vendasPorDia.set(data, dia);
  }

  const pedidosPorStatus = [
    { status: 'Concluídos', quantidade: pedidosConcluidos.size },
    { status: 'Não concluídos', quantidade: pedidosNaoConcluidos.size }
  ];
  const datasComVenda = [...vendasPorDia.keys()].filter(data => /^\d{4}-\d{2}-\d{2}$/.test(data)).sort();
  const inicioSerie = filtros.inicio || datasComVenda[0];
  const fimSerie = filtros.fim || datasComVenda[datasComVenda.length - 1];
  const vendasPorDiaSerie = [];
  if (inicioSerie && fimSerie) {
    for (const cursor = new Date(`${inicioSerie}T00:00:00.000Z`);
      cursor <= new Date(`${fimSerie}T00:00:00.000Z`);
      cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const data = cursor.toISOString().slice(0, 10);
      const dia = vendasPorDia.get(data);
      vendasPorDiaSerie.push({
        data,
        pedidos: dia ? dia.pedidos.size : 0,
        unidades: dia ? arredondar(dia.unidades) : 0,
        faturamento: dia ? arredondar(dia.faturamento) : 0
      });
    }
  }
  const categoriasFormatadas = [...categorias.values()].map(categoria => ({
    categoria: categoria.categoria,
    faturamento: arredondar(categoria.faturamento),
    margem: arredondar(categoria.margem),
    unidades: arredondar(categoria.unidades)
  })).sort((a, b) => b.faturamento - a.faturamento);

  return {
    faturamento: arredondar(faturamento),
    custo: arredondar(custo),
    margem: arredondar(faturamento - custo),
    margemPercentual: arredondar(faturamento ? ((faturamento - custo) / faturamento) * 100 : 0),
    capitalParado: arredondar(capitalParado),
    vendas: pedidosConcluidos.size,
    pedidosConcluidos: pedidosConcluidos.size,
    pedidosNaoConcluidos: pedidosNaoConcluidos.size,
    registrosProcessados: vendasFiltradas.length,
    unidades,
    categorias: categoriasFormatadas,
    pedidosPorStatus,
    lojasMaisVendas: formatarRanking(
      lojasMaisVendas,
      (a, b) => b.faturamento - a.faturamento
    ),
    clientesQueMaisCompram: formatarRanking(
      clientesQueMaisCompram,
      (a, b) => b.unidades - a.unidades || b.faturamento - a.faturamento
    ),
    fornecedoresMaisPresentes: [...fornecedoresMaisPresentes.values()]
      .map(item => ({ ...item, capitalEmEstoque: arredondar(item.capitalEmEstoque) }))
      .sort((a, b) => b.capitalEmEstoque - a.capitalEmEstoque)
      .slice(0, 5),
    vendasPorDia: vendasPorDiaSerie,
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
  const filtrosNormalizados = normalizarFiltros(filtros);
  const dados = await dashboardRepository.buscarDadosDashboard();
  return calcularResumo(dados, filtrosNormalizados);
}

module.exports = { resumoDashboard, calcularResumo };
