const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
function normalizarNumero(valor) {
  let texto = String(valor ?? '')
    .trim()
    .replace("R$", '')
    .replace('%', '');

  if (texto.includes(',') && texto.includes('.')) {
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (texto.includes(',')) {
    texto = texto.replace(',', '.');
  }

  return Number(texto);
}
function normalizaPeca(linha) {
  return {
    sku: linha.sku.trim().toUpperCase(),
    nome_peca: linha.nome_peca.trim(),
    categoria: linha.categoria.trim(),
    custo_unitario: normalizarNumero(linha.custo_unitario),
    fornecedor: linha.fornecedor.trim(),
    estoque_atual: Number(linha.estoque_atual.trim())
  };
}

function normalizaVenda(linha) {
  return {
    id_venda: linha.id_venda.trim(),
    data_venda: linha.data_venda.trim(),
    loja: linha.loja.trim(),
    cliente: linha.cliente.trim(),
    sku: linha.sku.trim().toUpperCase(),
    quantidade: normalizarNumero(linha.quantidade),
    preco_unitario: normalizarNumero(linha.preco_unitario),
    desconto: normalizarNumero(linha.desconto) / 100,
    status: linha.status.trim().toLowerCase(),
    vendedor: linha.vendedor.trim()
  };
}

const pecasPath = path.join(__dirname, '../../dados/pecas.csv');
const vendasPath = path.join(__dirname, '../../dados/vendas.csv');

const pecas = [];
const vendas = [];

fs.createReadStream(pecasPath)
  .pipe(csv({ separator: ';' }))
  .on('data', (linha) => {
    const peca = normalizaPeca(linha);
    pecas.push(peca);
  })
  .on('end', () => {
    console.log(`Peças lidas: ${pecas.length}`);
    console.log('Primeira peça:', pecas[4]);
  })
  .on('error', (erro) => {
    console.error('Erro ao ler peças:', erro.message);
  });

fs.createReadStream(vendasPath)
  .pipe(csv({ separator: ';' }))
  .on('data', (linha) => {
    const venda = normalizaVenda(linha);
    vendas.push(venda);
  })
  .on('end', () => {
    console.log(`Vendas lidas: ${vendas.length}`);
    console.log('Primeira venda:', vendas[0]);
  })
  .on('error', (erro) => {
    console.error('Erro ao ler vendas:', erro.message);
  });

  