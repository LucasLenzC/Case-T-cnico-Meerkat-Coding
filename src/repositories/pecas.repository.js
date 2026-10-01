const pool = require('../config/database');

async function inserirPeca(peca) {
  const query = `
    INSERT INTO pecas (sku, nome_peca, categoria, custo_unitario, fornecedor, estoque_atual)
    VALUES ($1, $2, $3, $4, $5, $6)
  ON CONFLICT (sku) DO UPDATE SET
      nome_peca = EXCLUDED.nome_peca,
      categoria = EXCLUDED.categoria,
      custo_unitario = EXCLUDED.custo_unitario,
      fornecedor = EXCLUDED.fornecedor,
      estoque_atual = EXCLUDED.estoque_atual
    RETURNING *
  `;

  const values = [
    peca.sku,
    peca.nome_peca,
    peca.categoria,
    peca.custo_unitario,
    peca.fornecedor,
    peca.estoque_atual
  ];

  const resultado = await pool.query(query, values);
  return resultado.rows[0] ?? null;
}

module.exports = {
  inserirPeca
};