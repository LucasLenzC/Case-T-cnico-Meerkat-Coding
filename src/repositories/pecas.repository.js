const prisma = require('../config/prisma');

async function inserirPeca(peca) {
  
 return prisma.pecas.upsert({
    where: { sku: peca.sku },
    update: {
      nome_peca: peca.nome_peca,
      categoria: peca.categoria,
      custo_unitario: peca.custo_unitario,
      fornecedor: peca.fornecedor,
      estoque_atual: peca.estoque_atual
    },
    create: {
      sku: peca.sku,
      nome_peca: peca.nome_peca,
      categoria: peca.categoria,
      custo_unitario: peca.custo_unitario,
      fornecedor: peca.fornecedor,
      estoque_atual: peca.estoque_atual
    }
  });
  }
 


async function listarPecas() {

  return prisma.pecas.findMany({ orderBy: { id: 'asc' } });
}
async function buscarPecaPorId(id) {
  
  return prisma.pecas.findUnique({ where: { id: Number(id) } });
}
async function buscarPecaPorSku(sku) {
  return prisma.pecas.findUnique({ where: { sku } });
}
async function deletarPeca(id) {
  return prisma.pecas.delete({ where: { id: Number(id) } });
}
async function atualizarPeca(id, pecaAtualizada) {
  const pecaExistente = await prisma.pecas.findUnique({ where: { id: Number(id) } });
  if (!pecaExistente) {
    throw new Error('Peça não encontrada');
  }
 return prisma.pecas.update({ where: { id: Number(id) }, data: pecaAtualizada });
}
module.exports = { inserirPeca, listarPecas, buscarPecaPorId, buscarPecaPorSku, deletarPeca, atualizarPeca };
