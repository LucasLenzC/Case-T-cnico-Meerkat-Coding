function renderizarPecas(pecas) {
  $('pecas-tbody').innerHTML = pecas.length
    ? pecas.map(peca => `
        <tr>
          <td>${esc(peca.sku)}</td>
          <td>${esc(peca.nome_peca)}</td>
          <td>${esc(peca.categoria)}</td>
          <td>${money(peca.custo_unitario)}</td>
          <td>${number(peca.estoque_atual)}</td>
          <td>${esc(peca.fornecedor || 'Sem fornecedor')}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="6">Nenhuma peça cadastrada.</td></tr>';
}

async function carregarPecas() {
  try {
    const pecas = await api('/pecas');
    renderizarPecas(pecas);
  } catch (erro) {
    $('pecas-tbody').innerHTML = '<tr><td colspan="6">Não foi possível carregar o catálogo.</td></tr>';
    alerta(erro.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('atualizar-pecas').onclick = carregarPecas;
  carregarPecas();
});
