const money = v => new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(Number(v || 0));
const number = v => new Intl.NumberFormat('pt-BR').format(Number(v || 0));
const $ = id => document.getElementById(id);
const LOCAL_KEY = 'autovisao.pecas.local.v1';
let pecas = [], vendas = [], pagina = 1, ordem = 'nome', direcao = 'asc', modal, categoriasChart, mesesChart;
let localOverrides = {}, localRemovidos = new Set();

function alerta(texto, tipo='danger') {
  const el = $('alerta'); el.textContent = texto; el.className = `alert alert-${tipo} mt-3`;
  clearTimeout(alerta.timer); alerta.timer = setTimeout(() => el.classList.add('d-none'), 5000);
}
async function api(url, options) {
  const r = await fetch(url, options); const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.mensagem || 'Não foi possível concluir a operação.');
  return body;
}
function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function plain(v) { return String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase(); }
function num(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').trim().replace(/^R\$\s*/i, '').replace(/\s/g, '').replace(/%$/, '');
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = Number(s); return Number.isFinite(n) ? n : 0;
}
function discount(v) { const n = num(v); return String(v ?? '').includes('%') || n > 1 ? n / 100 : n; }
function isoDate(v) {
  const s = String(v ?? '').trim(); if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}
function category(v) {
  const s = plain(v);
  if (s.includes('freio') || s.includes('frenagem')) return 'Freios';
  if (s.includes('eletric')) return 'Elétrica';
  if (s.includes('suspens')) return 'Suspensão';
  if (s.includes('motor')) return 'Motor';
  if (s.includes('filtro')) return 'Filtros';
  return String(v || 'Sem categoria').trim() || 'Sem categoria';
}
function store(v) {
  const s = plain(v);
  if (s.includes('norte')) return 'Loja Norte';
  if (s.includes('sul')) return 'Loja Sul';
  if (s.includes('centro')) return 'Loja Centro';
  return String(v || 'Sem loja').trim() || 'Sem loja';
}
function done(v) { return ['concluida','concluido','finalizada','finalizado'].includes(plain(v)); }
function loadLocal() {
  try { const x = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); localOverrides = x.overrides || {}; localRemovidos = new Set(x.removidos || []); }
  catch { localOverrides = {}; localRemovidos = new Set(); }
}
function saveLocal() { localStorage.setItem(LOCAL_KEY, JSON.stringify({overrides: localOverrides, removidos: [...localRemovidos]})); }
function mergeLocal(base) {
  const map = new Map(base.map(x => [String(x.sku || '').trim(), {...x}]));
  localRemovidos.forEach(sku => map.delete(String(sku).trim()));
  Object.values(localOverrides).forEach(x => { const sku = String(x.sku || '').trim(); if (sku && !localRemovidos.has(sku)) map.set(sku, {...x, sku}); });
  return [...map.values()];
}
function currentFilters() { return {inicio:$('inicio').value, fim:$('fim').value, loja:$('loja').value, categoria:$('categoria').value}; }
function salePeca(sale) { return pecas.find(x => String(x.sku || '').trim() === String(sale.sku || '').trim()); }
function net(sale) { return num(sale.quantidade) * num(sale.preco_unitario) * (1 - discount(sale.desconto)); }
function cost(sale) { return num(sale.quantidade) * num(salePeca(sale)?.custo_unitario); }
function filteredSales() {
  const f = currentFilters();
  return vendas.filter(v => {
    if (!done(v.status)) return false;
    const d = isoDate(v.data_venda); if (f.inicio && (!d || d < f.inicio)) return false; if (f.fim && (!d || d > f.fim)) return false;
    if (f.loja && store(v.loja) !== f.loja) return false;
    if (f.categoria && category(salePeca(v)?.categoria) !== f.categoria) return false;
    return true;
  });
}
function fillOptions(id, values, placeholder) {
  const el = $(id), prev = el.value; el.innerHTML = `<option value="">${placeholder}</option>` + values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
  if (values.includes(prev)) el.value = prev;
}
function fillAllOptions() {
  fillOptions('loja', [...new Set(vendas.map(v => store(v.loja)))].sort(), 'Todas as lojas');
  const cats = [...new Set(pecas.map(v => category(v.categoria)))].sort();
  fillOptions('categoria', cats, 'Todas as categorias'); fillOptions('filtro-categoria', cats, 'Todas as categorias');
}
function summary() {
  const sales = filteredSales(), f = currentFilters(), revenue = sales.reduce((a,v) => a + net(v), 0), c = sales.reduce((a,v) => a + cost(v), 0);
  const sold = new Set(sales.map(v => String(v.sku || '').trim()));
  const stopped = pecas.filter(p => num(p.estoque_atual) > 0 && !sold.has(String(p.sku || '').trim()) && (!f.categoria || category(p.categoria) === f.categoria));
  const cat = new Map(), top = new Map(), months = new Map();
  sales.forEach(v => {
    const p = salePeca(v), name = category(p?.categoria), a = cat.get(name) || {categoria:name, faturamento:0, margem:0, unidades:0};
    a.faturamento += net(v); a.margem += net(v) - cost(v); a.unidades += num(v.quantidade); cat.set(name, a);
    const sku = String(v.sku || '').trim(), t = top.get(sku) || {sku, nome_peca:p?.nome_peca || sku, unidades:0}; t.unidades += num(v.quantidade); top.set(sku, t);
    const month = isoDate(v.data_venda).slice(0, 7); if (month) months.set(month, (months.get(month) || 0) + net(v));
  });
  return {revenue, margin:revenue-c, units:sales.reduce((a,v)=>a+num(v.quantidade),0), orders:new Set(sales.map(v=>v.id_venda || v.id)).size,
    stopped, categories:[...cat.values()].sort((a,b)=>b.faturamento-a.faturamento), top:[...top.values()].sort((a,b)=>b.unidades-a.unidades).slice(0,7),
    months:[...months.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([mes,faturamento])=>({mes,faturamento})), items:sales.length};
}
function renderDashboard() {
  const x = summary(); $('faturamento').textContent = money(x.revenue); $('margem').textContent = money(x.margin);
  $('margem-percentual').textContent = `${x.revenue ? (x.margin / x.revenue * 100).toFixed(1) : '0.0'}% do faturamento`;
  $('vendas').textContent = number(x.orders); $('unidades').textContent = `${number(x.units)} unidades vendidas`;
  $('paradas').textContent = `${number(x.stopped.length)} peças`; $('paradas-badge').textContent = number(x.stopped.length);
  $('capital').textContent = `${money(x.stopped.reduce((a,p)=>a+num(p.estoque_atual)*num(p.custo_unitario),0))} em custo parado`;
  $('periodo').textContent = `${number(x.items)} itens em vendas concluídas`;
  if (categoriasChart) categoriasChart.destroy();
  categoriasChart = new Chart($('categoriasChart'), {type:'bar', data:{labels:x.categories.map(v=>v.categoria), datasets:[
    {label:'Faturamento',data:x.categories.map(v=>v.faturamento),backgroundColor:'#5c82ed',borderRadius:6},
    {label:'Margem',data:x.categories.map(v=>v.margem),backgroundColor:'#52bd91',borderRadius:6}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{ticks:{callback:v=>money(v)}}}}});
  $('categorias-list').innerHTML = x.categories.length ? x.categories.map(v=>`<div><span>${esc(v.categoria)}</span><strong>${money(v.faturamento)}</strong></div>`).join('') : '<p class="text-secondary small mb-0">Sem vendas no filtro.</p>';
  if (mesesChart) mesesChart.destroy();
  mesesChart = new Chart($('mesesChart'), {type:'line',data:{labels:x.months.map(v=>v.mes),datasets:[{label:'Faturamento',data:x.months.map(v=>v.faturamento),borderColor:'#2369f5',backgroundColor:'rgba(35,105,245,.1)',fill:true,tension:.35}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>money(v)}}}}});
  $('top-pecas').innerHTML = x.top.length ? x.top.map((v,i)=>`<div class="rank-item"><span class="rank-index">${i+1}</span><div><strong>${esc(v.nome_peca)}</strong><small>${esc(v.sku)}</small></div><span class="rank-value">${number(v.unidades)} un.</span></div>`).join('') : '<p class="text-secondary small mb-0">Sem vendas no filtro.</p>';
  $('lista-paradas').innerHTML = x.stopped.length ? x.stopped.slice(0,7).map(v=>`<div class="stalled-item"><i class="bi bi-box-seam"></i><div><strong>${esc(v.nome_peca)}</strong><small>${esc(v.sku)} · ${number(v.estoque_atual)} em estoque</small></div></div>`).join('') : '<p class="text-success small mb-0"><i class="bi bi-check-circle me-1"></i>Nenhuma peça parada.</p>';
}
function piecesFiltered() {
  const search = plain($('busca').value), cat = $('filtro-categoria').value, min = $('min').value === '' ? null : num($('min').value), max = $('max').value === '' ? null : num($('max').value);
  return pecas.filter(p => (!search || plain(`${p.sku} ${p.nome_peca} ${p.fornecedor}`).includes(search)) && (!cat || category(p.categoria) === cat) && (min === null || num(p.custo_unitario) >= min) && (max === null || num(p.custo_unitario) <= max)).sort((a,b) => {
    const keys = {sku:[a.sku,b.sku],nome:[a.nome_peca,b.nome_peca],categoria:[category(a.categoria),category(b.categoria)],custo:[num(a.custo_unitario),num(b.custo_unitario)],estoque:[num(a.estoque_atual),num(b.estoque_atual)]};
    const [av,bv] = keys[ordem] || keys.nome; const result = typeof av === 'number' ? av-bv : String(av).localeCompare(String(bv),'pt-BR'); return direcao === 'asc' ? result : -result;
  });
}
function renderPieces() {
  const all = piecesFiltered(), limit = 8, pages = Math.max(1, Math.ceil(all.length / limit)); pagina = Math.min(Math.max(1,pagina),pages);
  const rows = all.slice((pagina-1)*limit,pagina*limit);
  $('pecas-tbody').innerHTML = rows.length ? rows.map(p=>`<tr><td><span class="sku">${esc(p.sku)}</span></td><td><strong>${esc(p.nome_peca)}</strong><small class="d-block text-secondary">${esc(p.fornecedor || 'Sem fornecedor')}</small></td><td><span class="category-pill">${esc(category(p.categoria))}</span></td><td>${money(p.custo_unitario)}</td><td><strong>${number(p.estoque_atual)}</strong></td><td class="text-end"><button class="btn btn-sm btn-light editar" data-id="${esc(p.id)}" title="Editar"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-light text-danger excluir" data-id="${esc(p.id)}" title="Excluir"><i class="bi bi-trash"></i></button></td></tr>`).join('') : '<tr><td colspan="6" class="text-center text-secondary py-4">Nenhuma peça encontrada.</td></tr>';
  $('paginacao-info').textContent = `Página ${pagina} de ${pages} · ${number(all.length)} peças`; $('anterior').disabled = pagina <= 1; $('proxima').disabled = pagina >= pages;
  document.querySelectorAll('.editar').forEach(b => b.onclick = () => editPiece(b.dataset.id)); document.querySelectorAll('.excluir').forEach(b => b.onclick = () => deletePiece(b.dataset.id));
}
function editPiece(id) {
  const p = pecas.find(x=>String(x.id)===String(id)); if (!p) return; $('peca-id').value=p.id; $('form-sku').value=p.sku || ''; $('form-nome').value=p.nome_peca || ''; $('form-categoria').value=p.categoria || ''; $('form-fornecedor').value=p.fornecedor || ''; $('form-custo').value=num(p.custo_unitario); $('form-estoque').value=num(p.estoque_atual); $('modal-title').textContent='Editar peça'; $('form-error').classList.add('d-none'); modal.show();
}
function saveLocal(p, oldSku) {
  if (oldSku && oldSku !== p.sku) { localRemovidos.add(oldSku); delete localOverrides[oldSku]; }
  localRemovidos.delete(p.sku); localOverrides[p.sku] = p; saveLocalData();
}
function saveLocalData() { localStorage.setItem(LOCAL_KEY, JSON.stringify({overrides:localOverrides,removidos:[...localRemovidos]})); }
function deletePiece(id) {
  const p = pecas.find(x=>String(x.id)===String(id)); if (!p || !confirm('Excluir este cadastro apenas do painel local?')) return;
  pecas = pecas.filter(x=>String(x.id)!==String(id)); localRemovidos.add(String(p.sku).trim()); delete localOverrides[String(p.sku).trim()]; saveLocalData(); renderPieces(); renderDashboard(); alerta('Peça removida do painel local.', 'success');
}
function csvFields(line) {
  const out=[]; let field='', quoted=false;
  for (let i=0;i<line.length;i++) { const c=line[i]; if (c==='"' && line[i+1]==='"') {field+='"';i++;} else if(c==='"') quoted=!quoted; else if(c===';'&&!quoted){out.push(field.trim());field='';} else field+=c; }
  out.push(field.trim()); return out;
}
async function importCsv() {
  const file=$('arquivo').files[0]; if(!file){$('importacao-resultado').textContent='Selecione um arquivo CSV.';return;}
  try {
    const rows=(await file.text()).split(/\r?\n/).filter(Boolean).map(csvFields), header=rows.shift().map(v=>plain(v).replace(/\s+/g,'_'));
    const required=['sku','nome_peca','categoria','custo_unitario','fornecedor','estoque_atual'], missing=required.filter(v=>!header.includes(v)); if(missing.length) throw new Error(`Colunas ausentes: ${missing.join(', ')}`);
    rows.forEach(row=>{const values=Object.fromEntries(header.map((h,i)=>[h,row[i]||''])), old=pecas.find(p=>String(p.sku).trim()===String(values.sku).trim()), p={id:old?.id || `local-${values.sku}`,sku:values.sku.trim(),nome_peca:values.nome_peca.trim(),categoria:values.categoria.trim(),custo_unitario:num(values.custo_unitario),fornecedor:values.fornecedor.trim(),estoque_atual:num(values.estoque_atual)}; pecas=[...pecas.filter(x=>String(x.sku).trim()!==p.sku),p]; saveLocal(p,old?.sku);});
    $('importacao-resultado').textContent=`${rows.length} peça(s) carregada(s) no painel. As alterações ficam salvas neste navegador.`; fillAllOptions(); renderPieces(); renderDashboard();
  } catch(e) { $('importacao-resultado').textContent=`Erro: ${e.message}`; }
}
async function loadData() {
  try { const [basePecas,baseVendas]=await Promise.all([api('/pecas'),api('/vendas')]); pecas=mergeLocal(Array.isArray(basePecas)?basePecas:[]); vendas=Array.isArray(baseVendas)?baseVendas:[]; fillAllOptions(); renderPieces(); renderDashboard(); }
  catch(e) { alerta(`Não foi possível carregar os dados do banco: ${e.message}`); pecas=mergeLocal([]); vendas=[]; fillAllOptions(); renderPieces(); renderDashboard(); }
}
document.addEventListener('DOMContentLoaded', () => {
  loadLocal(); modal=new bootstrap.Modal($('pecaModal')); $('aplicar').onclick=()=>{pagina=1;renderDashboard();}; $('limpar').onclick=()=>{['inicio','fim','loja','categoria'].forEach(id=>$(id).value='');pagina=1;renderDashboard();};
  $('anterior').onclick=()=>{pagina--;renderPieces();}; $('proxima').onclick=()=>{pagina++;renderPieces();}; $('nova-peca').onclick=()=>{$('peca-form').reset();$('peca-id').value='';$('modal-title').textContent='Nova peça';$('form-error').classList.add('d-none');modal.show();};
  document.querySelectorAll('[data-sort]').forEach(h=>h.onclick=()=>{const selected=h.dataset.sort;direcao=ordem===selected&&direcao==='asc'?'desc':'asc';ordem=selected;pagina=1;renderPieces();});
  ['busca','filtro-categoria','min','max'].forEach(id=>$(id).addEventListener(id==='busca'?'input':'change',()=>{pagina=1;renderPieces();}));
  $('peca-form').onsubmit=e=>{e.preventDefault();const id=$('peca-id').value, old=pecas.find(p=>String(p.id)===String(id)), p={id:id||`local-${$('form-sku').value.trim()}`,sku:$('form-sku').value.trim(),nome_peca:$('form-nome').value.trim(),categoria:$('form-categoria').value.trim(),fornecedor:$('form-fornecedor').value.trim(),custo_unitario:num($('form-custo').value),estoque_atual:num($('form-estoque').value)}; if(!p.sku||!p.nome_peca||!p.categoria){$('form-error').textContent='Preencha SKU, nome e categoria.';$('form-error').classList.remove('d-none');return;} if(pecas.some(x=>String(x.sku).trim()===p.sku&&String(x.id)!==String(id))){$('form-error').textContent='Já existe uma peça com este SKU.';$('form-error').classList.remove('d-none');return;} pecas=[...pecas.filter(x=>String(x.id)!==String(id)),p];saveLocal(p,old?.sku);modal.hide();fillAllOptions();renderPieces();renderDashboard();alerta('Peça salva no painel local.', 'success');};
  $('importar-btn').onclick=importCsv; loadData();
});



