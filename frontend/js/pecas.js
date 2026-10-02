const PECAS_LOCAL_KEY = 'autovisao.pecas.local.v1';
let pecas = [];
let paginaPecas = 1;
let ordemPecas = 'nome_peca';
let direcaoPecas = 'asc';
let modalPeca;
let alteracoesLocais = { atualizacoes: {}, removidas: [] };

function carregarAlteracoesLocais() {
  try {
    alteracoesLocais = JSON.parse(localStorage.getItem(PECAS_LOCAL_KEY) || '{"atualizacoes":{},"removidas":[]}');
  } catch {
    alteracoesLocais = { atualizacoes: {}, removidas: [] };
  }
}

function salvarAlteracoesLocais() {
  localStorage.setItem(PECAS_LOCAL_KEY, JSON.stringify(alteracoesLocais));
}

function aplicarAlteracoesLocais(lista) {
  const removidas = new Set(alteracoesLocais.removidas || []);
  const porSku = new Map(lista.map(peca => [String(peca.sku).trim(), { ...peca }]));
  removidas.forEach(sku => porSku.delete(String(sku).trim()));
  Object.values(alteracoesLocais.atualizacoes || {}).forEach(peca => {
    if (!removidas.has(peca.sku)) porSku.set(peca.sku, { ...peca });
  });
  return [...porSku.values()];
}

function textoBusca(valor) {
  return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function valorNumerico(valor) {
  const numero = Number(String(valor ?? '').replace(',', '.'));
  return Number.isFinite(numero) ? numero : 0;
}

function opcoesCategorias() {
  const categorias = [...new Set(pecas.map(peca => peca.categoria).filter(Boolean))].sort();
  const select = $('filtro-categoria');
  const atual = select.value;
  select.innerHTML = '<option value="">Todas as categorias</option>' + categorias.map(categoria => '<option value="' + esc(categoria) + '">' + esc(categoria) + '</option>').join('');
  if (categorias.includes(atual)) select.value = atual;
}

function pecasFiltradas() {
  const busca = textoBusca($('busca').value);
  const categoria = $('filtro-categoria').value;

  return pecas.filter(peca => {
    const texto = textoBusca(String(peca.sku || '') + ' ' + String(peca.nome_peca || '') + ' ' + String(peca.fornecedor || ''));
    return (!busca || texto.includes(busca)) && (!categoria || peca.categoria === categoria);
  }).sort((a, b) => {
    const aValor = a[ordemPecas] ?? '';
    const bValor = b[ordemPecas] ?? '';
    const resultado = typeof aValor === 'number'
      ? aValor - bValor
      : String(aValor).localeCompare(String(bValor), 'pt-BR');
    return direcaoPecas === 'asc' ? resultado : -resultado;
  });
}

function renderizarPecas() {
  const itens = pecasFiltradas();
  const limite = 8;
  const paginas = Math.max(1, Math.ceil(itens.length / limite));
  paginaPecas = Math.min(Math.max(1, paginaPecas), paginas);
  const visiveis = itens.slice((paginaPecas - 1) * limite, paginaPecas * limite);

  $('pecas-tbody').innerHTML = visiveis.length
    ? visiveis.map(peca => '<tr>' +
        '<td><span class="sku">' + esc(peca.sku) + '</span></td>' +
        '<td><strong>' + esc(peca.nome_peca) + '</strong><small class="d-block text-secondary">' + esc(peca.fornecedor || 'Sem fornecedor') + '</small></td>' +
        '<td><span class="category-pill">' + esc(peca.categoria) + '</span></td>' +
        '<td>' + money(peca.custo_unitario) + '</td>' +
        '<td><strong>' + number(peca.estoque_atual) + '</strong></td>' +
        '<td class="text-end"><button class="btn btn-sm btn-light editar" data-id="' + esc(peca.id) + '" title="Editar"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-light text-danger excluir" data-id="' + esc(peca.id) + '" title="Excluir"><i class="bi bi-trash"></i></button></td>' +
      '</tr>').join('')
    : '<tr><td colspan="6" class="text-center text-secondary py-4">Nenhuma peça encontrada.</td></tr>';

  $('paginacao-info').textContent = 'Página ' + paginaPecas + ' de ' + paginas + ' · ' + number(itens.length) + ' peças';
  $('anterior').disabled = paginaPecas <= 1;
  $('proxima').disabled = paginaPecas >= paginas;
  document.querySelectorAll('.editar').forEach(botao => { botao.onclick = () => editarPeca(botao.dataset.id); });
  document.querySelectorAll('.excluir').forEach(botao => { botao.onclick = () => excluirPeca(botao.dataset.id); });
}

function abrirNovaPeca() {
  $('peca-form').reset();
  $('peca-id').value = '';
  $('modal-title').textContent = 'Nova peça';
  $('form-error').classList.add('d-none');
  modalPeca.show();
}

function editarPeca(id) {
  const peca = pecas.find(item => String(item.id) === String(id));
  if (!peca) return;
  $('peca-id').value = peca.id;
  $('form-sku').value = peca.sku || '';
  $('form-nome').value = peca.nome_peca || '';
  $('form-categoria').value = peca.categoria || '';
  $('form-fornecedor').value = peca.fornecedor || '';
  $('form-custo').value = valorNumerico(peca.custo_unitario);
  $('form-estoque').value = valorNumerico(peca.estoque_atual);
  $('modal-title').textContent = 'Editar peça';
  $('form-error').classList.add('d-none');
  modalPeca.show();
}

function salvarLocalmente(peca, skuAnterior) {
  const removidas = new Set(alteracoesLocais.removidas || []);
  if (skuAnterior && skuAnterior !== peca.sku) removidas.add(skuAnterior);
  removidas.delete(peca.sku);
  alteracoesLocais.removidas = [...removidas];
  alteracoesLocais.atualizacoes[peca.sku] = peca;
  salvarAlteracoesLocais();
}

function excluirPeca(id) {
  const peca = pecas.find(item => String(item.id) === String(id));
  if (!peca || !window.confirm('Excluir este cadastro apenas do painel local?')) return;
  pecas = pecas.filter(item => String(item.id) !== String(id));
  alteracoesLocais.removidas = [...new Set([...(alteracoesLocais.removidas || []), peca.sku])];
  delete alteracoesLocais.atualizacoes[peca.sku];
  salvarAlteracoesLocais();
  renderizarPecas();
  alerta('Peça removida apenas do painel local.', 'success');
}

function csvCampos(linha) {
  const campos = [];
  let campo = '';
  let entreAspas = false;
  for (let i = 0; i < linha.length; i += 1) {
    const caractere = linha[i];
    if (caractere === '"' && linha[i + 1] === '"') { campo += '"'; i += 1; }
    else if (caractere === '"') entreAspas = !entreAspas;
    else if (caractere === ';' && !entreAspas) { campos.push(campo.trim()); campo = ''; }
    else campo += caractere;
  }
  campos.push(campo.trim());
  return campos;
}

async function importarCsvLocalmente() {
  const arquivo = $('arquivo').files[0];
  if (!arquivo) { $('importacao-resultado').textContent = 'Selecione um arquivo CSV.'; return; }
  try {
    const linhas = (await arquivo.text()).split(/\r?\n/).filter(Boolean).map(csvCampos);
    const cabecalho = linhas.shift().map(textoBusca);
    const obrigatorias = ['sku', 'nome_peca', 'categoria', 'custo_unitario', 'fornecedor', 'estoque_atual'];
    const ausentes = obrigatorias.filter(campo => !cabecalho.includes(campo));
    if (ausentes.length) throw new Error('Colunas ausentes: ' + ausentes.join(', '));

    linhas.forEach(linha => {
      const valores = Object.fromEntries(cabecalho.map((campo, index) => [campo, linha[index] || '']));
      const existente = pecas.find(peca => peca.sku === valores.sku);
      const peca = {
        id: existente?.id || 'local-' + valores.sku,
        sku: valores.sku,
        nome_peca: valores.nome_peca,
        categoria: valores.categoria,
        custo_unitario: valorNumerico(valores.custo_unitario),
        fornecedor: valores.fornecedor,
        estoque_atual: valorNumerico(valores.estoque_atual)
      };
      pecas = [...pecas.filter(item => item.sku !== peca.sku), peca];
      salvarLocalmente(peca, existente?.sku);
    });

    $('importacao-resultado').textContent = linhas.length + ' peça(s) carregada(s) no painel local.';
    opcoesCategorias();
    renderizarPecas();
  } catch (erro) {
    $('importacao-resultado').textContent = 'Erro: ' + erro.message;
  }
}

async function carregarPecas() {
  try {
    pecas = aplicarAlteracoesLocais(await api('/pecas'));
    opcoesCategorias();
    renderizarPecas();
  } catch (erro) {
    alerta('Não foi possível carregar as peças: ' + erro.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  carregarAlteracoesLocais();
  modalPeca = new bootstrap.Modal($('pecaModal'));
  $('nova-peca').onclick = abrirNovaPeca;
  $('anterior').onclick = () => { paginaPecas -= 1; renderizarPecas(); };
  $('proxima').onclick = () => { paginaPecas += 1; renderizarPecas(); };
  $('limpar-busca').onclick = () => { $('busca').value = ''; $('filtro-categoria').value = ''; paginaPecas = 1; renderizarPecas(); };
  $('busca').oninput = () => { paginaPecas = 1; renderizarPecas(); };
  $('filtro-categoria').onchange = () => { paginaPecas = 1; renderizarPecas(); };
  document.querySelectorAll('[data-sort]').forEach(cabecalho => {
    cabecalho.onclick = () => {
      const coluna = cabecalho.dataset.sort === 'nome' ? 'nome_peca' : cabecalho.dataset.sort;
      direcaoPecas = ordemPecas === coluna && direcaoPecas === 'asc' ? 'desc' : 'asc';
      ordemPecas = coluna;
      renderizarPecas();
    };
  });
  $('peca-form').onsubmit = evento => {
    evento.preventDefault();
    const id = $('peca-id').value;
    const anterior = pecas.find(item => String(item.id) === String(id));
    const peca = {
      id: id || 'local-' + $('form-sku').value.trim(),
      sku: $('form-sku').value.trim(),
      nome_peca: $('form-nome').value.trim(),
      categoria: $('form-categoria').value.trim(),
      fornecedor: $('form-fornecedor').value.trim(),
      custo_unitario: valorNumerico($('form-custo').value),
      estoque_atual: valorNumerico($('form-estoque').value)
    };
    if (!peca.sku || !peca.nome_peca || !peca.categoria) {
      $('form-error').textContent = 'Preencha SKU, nome e categoria.';
      $('form-error').classList.remove('d-none');
      return;
    }
    if (pecas.some(item => item.sku === peca.sku && String(item.id) !== String(id))) {
      $('form-error').textContent = 'Já existe uma peça com este SKU.';
      $('form-error').classList.remove('d-none');
      return;
    }
    pecas = [...pecas.filter(item => String(item.id) !== String(id)), peca];
    salvarLocalmente(peca, anterior?.sku);
    modalPeca.hide();
    opcoesCategorias();
    renderizarPecas();
    alerta('Peça salva apenas no painel local.', 'success');
  };
  $('importar-btn').onclick = importarCsvLocalmente;
  carregarPecas();
});
