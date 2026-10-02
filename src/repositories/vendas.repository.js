const prisma = require('../config/prisma');

function converterData(valor) {
  if (valor instanceof Date) return valor;
  const texto = String(valor ?? '').trim();
  const partes = texto.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  const iso = partes ? `${partes[3]}-${partes[2]}-${partes[1]}` : texto.slice(0, 10);
  const data = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(data.getTime())) throw new Error(`Data de venda inválida: ${valor}`);
  return data;
}

async function inserirVenda(venda) {
  return prisma.vendas.upsert({
    where: {
      id_venda_sku: {
        id_venda: venda.id_venda,
        sku: venda.sku
      }
    },
    update: {
      data_venda: converterData(venda.data_venda),
      loja: venda.loja,
      cliente: venda.cliente,
      sku: venda.sku,
      quantidade: venda.quantidade,
      preco_unitario: venda.preco_unitario,
      desconto: venda.desconto,
      status: venda.status,
      vendedor: venda.vendedor
    },
    create: {
      id_venda: venda.id_venda,
      data_venda: converterData(venda.data_venda),
      loja: venda.loja,
      cliente: venda.cliente,
      sku: venda.sku,
      quantidade: venda.quantidade,
      preco_unitario: venda.preco_unitario,
      desconto: venda.desconto,
      status: venda.status,
      vendedor: venda.vendedor
    }
  });
}

async function listarVendas() {
  return prisma.vendas.findMany({ orderBy: { id: 'asc' } });
}

module.exports = { inserirVenda, listarVendas };
