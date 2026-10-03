let paginaAtual = 1;
let totalPaginas = 1;

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
    : '<tr><td colspan="6">Nenhuma peça encontrada.</td></tr>';
}

function montarFiltros() {
  const parametros = new URLSearchParams({
    page: paginaAtual,
    pageSize: 10,
    sortBy: $('ordenar-por').value,
    order: $('ordem').value
  });
  const filtros = {
    texto: $('pesquisa-pecas').value.trim(),
    categoria: $('filtro-categoria').value.trim(),
    precoMin: $('preco-min').value,
    precoMax: $('preco-max').value
  };
  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor) parametros.set(chave, valor);
  });
  return parametros;
}

async function carregarPecas() {
  try {
    const resultado = await api(`/pecas?${montarFiltros()}`);
    paginaAtual = resultado.page;
    totalPaginas = Math.max(resultado.totalPages, 1);
    renderizarPecas(resultado.data);
    $('pecas-paginacao-info').textContent = `Página ${resultado.page} de ${totalPaginas} · ${resultado.total} peça(s)`;
    $('pagina-anterior').disabled = paginaAtual <= 1;
    $('pagina-proxima').disabled = paginaAtual >= totalPaginas;
  } catch (erro) {
    $('pecas-tbody').innerHTML = '<tr><td colspan="6">Não foi possível carregar o catálogo.</td></tr>';
    alerta(erro.message);
  }
}

function pesquisarPecas() {
  paginaAtual = 1;
  carregarPecas();
}

document.addEventListener('DOMContentLoaded', () => {
  $('atualizar-pecas').onclick = carregarPecas;
  $('pagina-anterior').onclick = () => {
    if (paginaAtual > 1) {
      paginaAtual -= 1;
      carregarPecas();
    }
  };
  $('pagina-proxima').onclick = () => {
    if (paginaAtual < totalPaginas) {
      paginaAtual += 1;
      carregarPecas();
    }
  };
  ['filtro-categoria', 'preco-min', 'preco-max', 'ordenar-por', 'ordem']
    .forEach(id => $(id).addEventListener('change', pesquisarPecas));
  $('pesquisa-pecas').addEventListener('input', pesquisarPecas);
  carregarPecas();
});
