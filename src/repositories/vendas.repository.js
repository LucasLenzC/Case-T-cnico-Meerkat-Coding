const pool = require('../config/database');
const prisma = require('../config/prisma');

async function inserirVenda(venda) {
  const query = `
    INSERT INTO vendas (id_venda, data_venda, loja, cliente, sku, quantidade, preco_unitario, desconto, status, vendedor)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (id_venda, sku) DO NOTHING
    RETURNING *
  `;
  const values = [venda.id_venda, venda.data_venda, venda.loja, venda.cliente, venda.sku, venda.quantidade, venda.preco_unitario, venda.desconto, venda.status, venda.vendedor];
  const resultado = await pool.query(query, values);
  return resultado.rows[0] ?? null;
}

async function listarVendas() {
  return prisma.vendas.findMany({ orderBy: { id: 'asc' } });
}

module.exports = { inserirVenda, listarVendas };
