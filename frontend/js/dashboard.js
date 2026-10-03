function exibirIndicadores(resumo) {
  $('faturamento').textContent = money(resumo.faturamento);
  $('margem').textContent = money(resumo.margem);
  $('margem-percentual').textContent = `${number(resumo.margemPercentual)}% do faturamento`;
  $('vendas').textContent = number(resumo.vendas);
  $('unidades').textContent = `${number(resumo.unidades)} unidades vendidas`;
  $('capital').textContent = `${money(resumo.capitalParado)} em custo parado`;
  $('periodo').textContent = `${number(resumo.itens)} itens de venda`;
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
    const resumo = await api('/dashboard/resumo');
    exibirIndicadores(resumo);
    exibirCategorias(resumo.categorias);
    exibirPecasNuncaVendidas(resumo.pecasNuncaVendidas);
    $('status-api').textContent = 'Resumo atualizado';
  } catch (erro) {
    $('status-api').textContent = 'Resumo indisponível';
    alerta(`Não foi possível carregar o resumo: ${erro.message}`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('atualizar-dashboard').onclick = carregarDashboard;
  carregarDashboard();
});
