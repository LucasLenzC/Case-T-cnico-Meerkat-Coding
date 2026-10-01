CREATE TABLE IF NOT EXISTS pecas (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) NOT NULL UNIQUE,
  nome_peca TEXT NOT NULL,
  categoria TEXT NOT NULL,
  custo_unitario NUMERIC(12, 2) NOT NULL,
  fornecedor TEXT,
  estoque_atual INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vendas (
  id SERIAL PRIMARY KEY,
  id_venda VARCHAR(50) NOT NULL,
  data_venda DATE NOT NULL,
  loja TEXT NOT NULL,
  cliente TEXT,
  sku VARCHAR(50) NOT NULL,
  quantidade NUMERIC(12, 2) NOT NULL,
  preco_unitario NUMERIC(12, 2) NOT NULL,
  desconto NUMERIC(5, 4) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL,
  vendedor TEXT,
  UNIQUE (id_venda, sku)
);