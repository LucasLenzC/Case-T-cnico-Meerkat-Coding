const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { normalizaPeca, normalizaVenda, normalizarData } = require('../src/utils/normalizacao');
const { importarArquivo } = require('../src/scripts/import-csv');

const peca = { sku: ' pc-1001 ', nome_peca: ' Peça ', categoria: ' FRENAGEM ', custo_unitario: 'R$ 1.234,50', estoque_atual: '0' };
const venda = { id_venda: 'V-1', sku: 'pc-1001', data_venda: '29/02/2024', loja: ' LOJA CENTRO ', quantidade: '2,0', preco_unitario: '50.25', desconto: '5%', status: 'CONCLUÍDA' };

test('padroniza categorias, lojas, status e SKU; aceita campos opcionais vazios', () => {
  const p = normalizaPeca(peca);
  assert.equal(p.sku, 'PC-1001');
  assert.equal(p.categoria, 'Freios');
  assert.equal(p.custo_unitario, 1234.5);
  assert.equal(p.estoque_atual, 0);
  assert.equal(p.fornecedor, null);
  const v = normalizaVenda(venda);
  assert.equal(v.loja, 'Loja Centro');
  assert.equal(v.status, 'concluida');
  assert.equal(v.desconto, 0.05);
  assert.equal(v.cliente, null);
  assert.equal(normalizaVenda({ ...venda, desconto: '' }).desconto, 0);
});

test('rejeita datas impossíveis sem aceitar o rollover de Date', () => {
  for (const data of ['31/02/2025', '2025-02-29', '2025-13-01', '01/02-2025', 'qualquer coisa', '']) {
    assert.throws(() => normalizarData(data));
  }
  assert.equal(normalizarData('29-02-2024').toISOString(), '2024-02-29T00:00:00.000Z');
});

test('rejeita SKU ausente, espaços internos e tamanho além do schema', () => {
  for (const sku of ['', ' ', 'PC 1001', 'x'.repeat(51)]) assert.throws(() => normalizaPeca({ ...peca, sku }));
});

test('rejeita números vazios, não numéricos, negativos e valores fora do schema', () => {
  for (const custo_unitario of ['', 'abc', '-10', 'Infinity', '10000000000', '1.234']) {
    assert.throws(() => normalizaPeca({ ...peca, custo_unitario }));
  }
  for (const estoque_atual of ['-1', '1.5', '2147483648']) assert.throws(() => normalizaPeca({ ...peca, estoque_atual }));
  for (const quantidade of ['-1', '0', 'abc']) assert.throws(() => normalizaVenda({ ...venda, quantidade }));
  for (const desconto of ['-1', '101', 'abc']) assert.throws(() => normalizaVenda({ ...venda, desconto }));
  assert.throws(() => normalizaVenda({ ...venda, status: 'desconhecido' }));
});

test('conta inserções/atualizações e continua após SKU inexistente ou falha no banco', async t => {
  const pasta = await fs.mkdtemp(path.join(os.tmpdir(), 'import-csv-test-'));
  t.after(() => fs.rm(pasta, { recursive: true, force: true }));
  const arquivo = path.join(pasta, 'teste.csv');
  await fs.writeFile(arquivo, 'sku\nNOVO\nNOVO\nINEXISTENTE\nERRO\nEXISTENTE\n');
  const salvos = [];
  const resumo = await importarArquivo({
    arquivo,
    normalizar: linha => {
      if (linha.sku === 'INEXISTENTE') throw new Error('SKU inexistente');
      return linha;
    },
    salvar: async registro => {
      if (registro.sku === 'ERRO') throw Object.assign(new Error('Erro do banco'), { code: 'P2000' });
      salvos.push(registro.sku);
    },
    existentes: new Set(['EXISTENTE']),
    chave: registro => registro.sku,
    simular: false
  });
  assert.deepEqual(salvos, ['NOVO', 'NOVO', 'EXISTENTE']);
  assert.equal(resumo.lidos, 5);
  assert.equal(resumo.validos, 3);
  assert.equal(resumo.inseridos, 1);
  assert.equal(resumo.atualizados, 2);
  assert.equal(resumo.rejeitados, 2);
  assert.equal(resumo.rejeicoes[0].registro, 3);
  const simulado = await importarArquivo({ arquivo, normalizar: x => x, salvar: () => assert.fail('Não deve salvar'), existentes: new Set(), chave: x => x.sku, simular: true });
  assert.equal(simulado.inseridos, 4);
  assert.equal(simulado.atualizados, 1);
  await assert.rejects(importarArquivo({ arquivo: path.join(pasta, 'ausente.csv'), normalizar: x => x }));
});
