const prisma = require('../config/prisma');

async function buscarDadosDashboard() {
  const [pecas, vendas] = await Promise.all([
    prisma.pecas.findMany({ orderBy: { id: 'asc' } }),
    prisma.vendas.findMany({ orderBy: { id: 'asc' } })
  ]);

  return { pecas, vendas };
}

module.exports = { buscarDadosDashboard };
