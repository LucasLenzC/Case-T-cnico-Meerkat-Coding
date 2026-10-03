let paginaAtual = 1;
let totalPaginas = 1;
const pecasExibidas = new Map();

function abrirFormularioPeca(peca = null) {
  $('form-peca-wrapper').classList.remove('d-none');
  $('form-peca-titulo').textContent = peca ? 'Editar peça' : 'Cadastrar peça';
  $('salvar-peca').textContent = peca ? 'Salvar alterações' : 'Cadastrar peça';
  $('peca-id').value = peca?.id || '';
  $('peca-sku').value = peca?.sku || '';
  $('peca-nome').value = peca?.nome_peca || '';
  $('peca-categoria').value = peca?.categoria || '';
  $('peca-custo').value = peca?.custo_unitario ?? '';
  $('peca-fornecedor').value = peca?.fornecedor || '';
  $('peca-estoque').value = peca?.estoque_atual ?? '';
  $('peca-sku').focus();
  $('form-peca-wrapper').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fecharFormularioPeca() {
  $('form-peca').reset();
  $('peca-id').value = '';
  $('form-peca').classList.remove('was-validated');
  $('form-peca-titulo').textContent = 'Cadastrar peça';
  $('salvar-peca').textContent = 'Cadastrar peça';
  $('form-peca-wrapper').classList.add('d-none');
}

function dadosDoFormulario() {
  return {
    sku: $('peca-sku').value.trim(),
    nome_peca: $('peca-nome').value.trim(),
    categoria: $('peca-categoria').value.trim(),
    custo_unitario: Number($('peca-custo').value),
    fornecedor: $('peca-fornecedor').value.trim() || null,
    estoque_atual: Number($('peca-estoque').value)
  };
}

function renderizarPecas(pecas) {
  pecasExibidas.clear();
  pecas.forEach(peca => pecasExibidas.set(String(peca.id), peca));
  $('pecas-tbody').innerHTML = pecas.length
    ? pecas.map(peca => `
        <tr>
          <td>${esc(peca.sku)}</td>
          <td>${esc(peca.nome_peca)}</td>
          <td>${esc(peca.categoria)}</td>
          <td>${money(peca.custo_unitario)}</td>
          <td>${number(peca.estoque_atual)}</td>
          <td>${esc(peca.fornecedor || 'Sem fornecedor')}</td>
          <td class="text-end text-nowrap">
            <button class="btn btn-sm btn-outline-primary me-1" type="button" data-acao="editar" data-id="${peca.id}" title="Editar peça">
              <i class="bi bi-pencil"></i><span class="visually-hidden">Editar</span>
            </button>
            <button class="btn btn-sm btn-outline-danger" type="button" data-acao="excluir" data-id="${peca.id}" title="Excluir peça">
              <i class="bi bi-trash"></i><span class="visually-hidden">Excluir</span>
            </button>
          </td>
        </tr>
      `).join('')
    : '<tr><td colspan="7">Nenhuma peça encontrada.</td></tr>';
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
    $('pecas-tbody').innerHTML = '<tr><td colspan="7">Não foi possível carregar o catálogo.</td></tr>';
    alerta(erro.message);
  }
}

function pesquisarPecas() {
  paginaAtual = 1;
  carregarPecas();
}

async function salvarPeca(evento) {
  evento.preventDefault();
  const formulario = $('form-peca');
  if (!formulario.checkValidity()) {
    formulario.classList.add('was-validated');
    alerta('Preencha os campos obrigatórios corretamente.');
    return;
  }

  const id = $('peca-id').value;
  const botao = $('salvar-peca');
  botao.disabled = true;

  try {
    await api(id ? `/pecas/${id}` : '/pecas', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosDoFormulario())
    });
    fecharFormularioPeca();
    await carregarPecas();
    if (typeof carregarDashboard === 'function') carregarDashboard();
    alerta(id ? 'Peça atualizada com sucesso.' : 'Peça cadastrada com sucesso.', 'success');
  } catch (erro) {
    alerta(erro.message);
  } finally {
    botao.disabled = false;
  }
}

async function excluirPeca(id) {
  const peca = pecasExibidas.get(String(id));
  const descricao = peca ? `${peca.nome_peca} (${peca.sku})` : 'esta peça';
  if (!window.confirm(`Deseja realmente excluir ${descricao}?`)) return;

  try {
    await api(`/pecas/${id}`, { method: 'DELETE' });
    await carregarPecas();
    if (typeof carregarDashboard === 'function') carregarDashboard();
    alerta('Peça excluída com sucesso.', 'success');
  } catch (erro) {
    alerta(erro.message);
  }
}

function tratarAcaoDaTabela(evento) {
  const botao = evento.target.closest('button[data-acao]');
  if (!botao) return;
  const peca = pecasExibidas.get(String(botao.dataset.id));
  if (botao.dataset.acao === 'editar' && peca) abrirFormularioPeca(peca);
  if (botao.dataset.acao === 'excluir') excluirPeca(botao.dataset.id);
}

document.addEventListener('DOMContentLoaded', () => {
  $('atualizar-pecas').onclick = carregarPecas;
  $('nova-peca').onclick = () => abrirFormularioPeca();
  $('cancelar-peca').onclick = fecharFormularioPeca;
  $('cancelar-peca-rodape').onclick = fecharFormularioPeca;
  $('form-peca').addEventListener('submit', salvarPeca);
  $('pecas-tbody').addEventListener('click', tratarAcaoDaTabela);
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
