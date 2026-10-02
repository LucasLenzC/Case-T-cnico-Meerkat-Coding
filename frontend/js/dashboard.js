let ultimoResumo = null;

function filtrosDashboard() {
  const filtros = new URLSearchParams();
  ['inicio', 'fim', 'loja', 'categoria'].forEach(id => {
    if ($(id).value) filtros.set(id, $(id).value);
  });
  return filtros;
}

function preencherOpcoes(resumo) {
  const opcoes = resumo.opcoes || { lojas: [], categorias: [] };
  const preencher = (id, valores, texto) => {
    const select = $(id);
    const valorAtual = select.value;
    select.innerHTML = `<option value="">${texto}</option>` + valores
      .map(valor => `<option value="${esc(valor)}">${esc(valor)}</option>`)
      .join('');
    if (valores.includes(valorAtual)) select.value = valorAtual;
  };

  preencher('loja', opcoes.lojas || [], 'Todas as lojas');
  preencher('categoria', opcoes.categorias || [], 'Todas as categorias');
  preencher('filtro-categoria', opcoes.categorias || [], 'Todas as categorias');
}

function renderizarResumo(resumo) {
  ultimoResumo = resumo;
  $('faturamento').textContent = money(resumo.faturamento);
  $('margem').textContent = money(resumo.margem);
  $('margem-percentual').textContent = `${Number(resumo.margemPercentual || 0).toFixed(1)}% do faturamento`;
  $('vendas').textContent = number(resumo.vendas);
  $('unidades').textContent = `${number(resumo.unidades)} unidades vendidas`;
  $('paradas').textContent = `${number(resumo.pecasNuncaVendidas.length)} peças`;
  $('paradas-badge').textContent = number(resumo.pecasNuncaVendidas.length);
  $('capital').textContent = `${money(resumo.capitalParado)} em custo parado`;
  $('periodo').textContent = `${number(resumo.itens)} itens em vendas concluídas`;

  $('categorias-list').innerHTML = resumo.categorias.length
    ? resumo.categorias.map(item => `<div><span>${esc(item.categoria)}</span><strong>${money(item.faturamento)}</strong></div>`).join('')
    : '<p class="text-secondary small mb-0">Sem vendas no filtro.</p>';

  $('lista-paradas').innerHTML = resumo.pecasNuncaVendidas.length
    ? resumo.pecasNuncaVendidas.slice(0, 8).map(peca => `<div class="stalled-item"><i class="bi bi-box-seam"></i><div><strong>${esc(peca.nome_peca)}</strong><small>${esc(peca.sku)} · ${number(peca.estoque_atual)} em estoque</small></div></div>`).join('')
    : '<p class="text-success small mb-0"><i class="bi bi-check-circle me-1"></i>Nenhuma peça parada.</p>';
}

async function carregarDashboard() {
  try {
    const resumo = await api(`/dashboard/resumo?${filtrosDashboard()}`);
    preencherOpcoes(resumo);
    renderizarResumo(resumo);
  } catch (erro) {
    alerta(`Não foi possível carregar o resumo: ${erro.message}`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('aplicar').onclick = carregarDashboard;
  $('limpar').onclick = () => {
    ['inicio', 'fim', 'loja', 'categoria'].forEach(id => { $(id).value = ''; });
    carregarDashboard();
  };
  carregarDashboard();
});
