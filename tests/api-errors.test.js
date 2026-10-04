const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const app = require('../src/app');
const prisma = require('../src/config/prisma');
const pecasService = require('../src/services/pecas.service');
const { classificarErro } = require('../src/middlewares/error-handler');

function iniciarServidor() {
  return new Promise((resolve, reject) => {
    const servidor = http.createServer(app);
    servidor.once('error', reject);
    servidor.listen(0, '127.0.0.1', () => resolve(servidor));
  });
}

function fecharServidor(servidor) {
  return new Promise((resolve, reject) => servidor.close(erro => erro ? reject(erro) : resolve()));
}

test('classifica erros de validação, conflito, não encontrado e falha interna', () => {
  assert.deepEqual(classificarErro({ statusCode: 400, message: 'ID inválido' }), {
    statusCode: 400,
    mensagem: 'ID inválido'
  });
  assert.deepEqual(classificarErro({ code: 'P2002' }), {
    statusCode: 409,
    mensagem: 'SKU já cadastrado'
  });
  assert.deepEqual(classificarErro({ code: 'P2025' }), {
    statusCode: 404,
    mensagem: 'Peça não encontrada'
  });
  assert.deepEqual(classificarErro(new Error('falha inesperada')), {
    statusCode: 500,
    mensagem: 'Erro interno do servidor'
  });
});

test('service rejeita IDs e filtros inválidos antes de consultar o banco', async () => {
  await assert.rejects(
    pecasService.buscarPorId('abc'),
    erro => erro.statusCode === 400 && erro.message === 'ID inválido'
  );
  await assert.rejects(
    pecasService.listar({ page: 'abc' }),
    erro => erro.statusCode === 400 && erro.message === 'Página inválido'
  );
  await assert.rejects(
    pecasService.listar({ precoMin: '500', precoMax: '100' }),
    erro => erro.statusCode === 400 && erro.message.includes('Preço mínimo')
  );
  await assert.rejects(
    pecasService.inserir({}),
    erro => erro.statusCode === 400 && erro.message === 'SKU obrigatório'
  );
});

test('rotas retornam 400 com formato padronizado', async t => {
  const servidor = await iniciarServidor();
  t.after(async () => {
    await fecharServidor(servidor);
    await prisma.$disconnect();
  });

  const endereco = servidor.address();
  const baseUrl = `http://${endereco.address}:${endereco.port}`;
  const casos = [
    '/pecas/abc',
    '/pecas?page=abc',
    '/pecas?precoMin=500&precoMax=100',
    '/dashboard/resumo?dataInicial=2025-02-31'
  ];

  for (const caminho of casos) {
    const resposta = await fetch(`${baseUrl}${caminho}`);
    assert.equal(resposta.status, 400, caminho);
    const corpo = await resposta.json();
    assert.equal(typeof corpo.mensagem, 'string');
    assert.ok(corpo.mensagem.length > 0);
  }
});

test('rota inexistente retorna 404 em JSON', async t => {
  const servidor = await iniciarServidor();
  t.after(async () => {
    await fecharServidor(servidor);
    await prisma.$disconnect();
  });

  const endereco = servidor.address();
  const resposta = await fetch(`http://${endereco.address}:${endereco.port}/rota-inexistente`);
  assert.equal(resposta.status, 404);
  assert.deepEqual(await resposta.json(), { mensagem: 'Rota não encontrada' });
});
