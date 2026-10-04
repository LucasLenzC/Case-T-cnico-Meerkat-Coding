const graficos = {};

function montarFiltrosDashboard() {
  const parametros = new URLSearchParams();
  const filtros = {
    dataInicial: $('dashboard-data-inicial').value,
    dataFinal: $('dashboard-data-final').value,
    loja: $('dashboard-loja').value,
    categoria: $('dashboard-categoria').value
  };
  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor) parametros.set(chave, valor);
  });
  const query = parametros.toString();
  return query ? `?${query}` : '';
}

function preencherOpcoesDashboard(id, opcoes, textoPadrao) {
  const select = $(id);
  const valorAtual = select.value;
  select.innerHTML = `<option value="">${textoPadrao}</option>`;
  opcoes.forEach(opcao => {
    const elemento = document.createElement('option');
    elemento.value = opcao;
    elemento.textContent = opcao;
    select.appendChild(elemento);
  });
  select.value = opcoes.includes(valorAtual) ? valorAtual : '';
}

function exibirOpcoesDashboard(opcoes = {}) {
  preencherOpcoesDashboard('dashboard-loja', opcoes.lojas || [], 'Todas as lojas');
  preencherOpcoesDashboard('dashboard-categoria', opcoes.categorias || [], 'Todas as categorias');
}

function substituirGrafico(id, configuracao) {
  if (graficos[id]) graficos[id].destroy();
  graficos[id] = new Chart($(id), configuracao);
}

function formatarDataGrafico(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano.slice(2)}`;
}

function exibirGraficoCategorias(categorias) {
  substituirGrafico('grafico-categorias', {
    type: 'bar',
    data: {
      labels: categorias.map(item => item.categoria),
      datasets: [
        {
          label: 'Faturamento',
          data: categorias.map(item => item.faturamento),
          backgroundColor: '#2369f5',
          borderRadius: 6
        },
        {
          label: 'Margem',
          data: categorias.map(item => item.margem),
          backgroundColor: '#22a879',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: valor => money(valor) }
        }
      },
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function exibirGraficoStatus(pedidosPorStatus) {
  substituirGrafico('grafico-status', {
    type: 'doughnut',
    data: {
      labels: pedidosPorStatus.map(item => item.status),
      datasets: [{
        data: pedidosPorStatus.map(item => item.quantidade),
        backgroundColor: ['#22a879', '#f59e0b'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function exibirGraficoVendasPorDia(vendasPorDia) {
  substituirGrafico('grafico-vendas-dia', {
    type: 'line',
    data: {
      labels: vendasPorDia.map(item => formatarDataGrafico(item.data)),
      datasets: [{
        label: 'Pedidos concluídos',
        data: vendasPorDia.map(item => item.pedidos),
        borderColor: '#2369f5',
        backgroundColor: 'rgba(35, 105, 245, .12)',
        fill: true,
        tension: .3,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function exibirIndicadores(resumo) {
  $('faturamento').textContent = money(resumo.faturamento);
  $('margem').textContent = money(resumo.margem);
  $('margem-percentual').textContent = `${number(resumo.margemPercentual)}% do faturamento`;
  $('vendas').textContent = number(resumo.pedidosConcluidos ?? resumo.vendas);
  $('unidades').textContent = `${number(resumo.unidades)} itens vendidos`;
  $('capital').textContent = `${money(resumo.capitalParado)} em custo parado`;
  $('periodo').textContent = `${number(resumo.registrosProcessados ?? resumo.itens)} registros processados`;
}

function exibirCategorias(categorias) {
  $('categorias-tbody').innerHTML = categorias.length
    ? categorias.map(item => `
        <tr>
          <td>${esc(item.categoria)}</td>
          <td>${money(item.faturamento)}</td>
          <td>${money(item.margem)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="3">Nenhuma venda concluída.</td></tr>';
}

function exibirPecasNuncaVendidas(pecas) {
  $('lista-paradas').innerHTML = pecas.length
    ? pecas.map(peca => `
        <div class="stalled-item">
          <div>
            <strong>${esc(peca.nome_peca)}</strong>
            <small>${esc(peca.sku)} · ${number(peca.estoque_atual)} em estoque</small>
          </div>
        </div>
      `).join('')
    : '<p>Nenhuma peça com estoque e sem venda.</p>';
}

async function carregarDashboard() {
  $('status-api').textContent = 'Carregando resumo…';
  try {
    const resumo = await api(`/dashboard/resumo${montarFiltrosDashboard()}`);
    exibirOpcoesDashboard(resumo.opcoes);
    exibirIndicadores(resumo);
    exibirCategorias(resumo.categorias);
    exibirPecasNuncaVendidas(resumo.pecasNuncaVendidas);
    exibirGraficoCategorias(resumo.categorias || []);
    exibirGraficoStatus(resumo.pedidosPorStatus || []);
    exibirGraficoVendasPorDia(resumo.vendasPorDia || []);
    $('status-api').textContent = 'Resumo atualizado';
  } catch (erro) {
    $('status-api').textContent = 'Resumo indisponível';
    alerta(`Não foi possível carregar o resumo: ${erro.message}`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('atualizar-dashboard').onclick = carregarDashboard;
  ['dashboard-data-inicial', 'dashboard-data-final', 'dashboard-loja', 'dashboard-categoria']
    .forEach(id => $(id).addEventListener('change', carregarDashboard));
  $('limpar-filtros-dashboard').onclick = () => {
    $('dashboard-data-inicial').value = '';
    $('dashboard-data-final').value = '';
    $('dashboard-loja').value = '';
    $('dashboard-categoria').value = '';
    carregarDashboard();
  };
  carregarDashboard();
});
