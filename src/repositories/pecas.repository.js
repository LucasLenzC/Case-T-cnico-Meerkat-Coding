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
 


async function listarPecas({ texto, categoria, precoMin, precoMax, page, pageSize, sortBy, order }) {
  const filtros = [];

  if (texto) {
    filtros.push({
      OR: [
        { sku: { contains: texto, mode: 'insensitive' } },
        { nome_peca: { contains: texto, mode: 'insensitive' } }
      ]
    });
  }
  if (categoria) {
    filtros.push({ categoria: { equals: categoria, mode: 'insensitive' } });
  }
  if (precoMin !== undefined || precoMax !== undefined) {
    filtros.push({
      custo_unitario: {
        ...(precoMin !== undefined ? { gte: precoMin } : {}),
        ...(precoMax !== undefined ? { lte: precoMax } : {})
      }
    });
  }

  const where = filtros.length ? { AND: filtros } : {};
  const [data, total] = await Promise.all([
    prisma.pecas.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: order }
    }),
    prisma.pecas.count({ where })
  ]);

  return {
    data,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize)
  };
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
