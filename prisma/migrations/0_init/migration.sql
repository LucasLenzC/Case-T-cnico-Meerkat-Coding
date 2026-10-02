-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "pecas" (
    "id" SERIAL NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "nome_peca" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "custo_unitario" DECIMAL(12,2) NOT NULL,
    "fornecedor" TEXT,
    "estoque_atual" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pecas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendas" (
    "id" SERIAL NOT NULL,
    "id_venda" VARCHAR(50) NOT NULL,
    "data_venda" DATE NOT NULL,
    "loja" TEXT NOT NULL,
    "cliente" TEXT,
    "sku" VARCHAR(50) NOT NULL,
    "quantidade" DECIMAL(12,2) NOT NULL,
    "preco_unitario" DECIMAL(12,2) NOT NULL,
    "desconto" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "status" VARCHAR(30) NOT NULL,
    "vendedor" TEXT,

    CONSTRAINT "vendas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pecas_sku_key" ON "pecas"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "vendas_id_venda_sku_key" ON "vendas"("id_venda", "sku");
