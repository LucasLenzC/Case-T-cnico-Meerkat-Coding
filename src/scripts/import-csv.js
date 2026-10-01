const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const pecasPath = path.join(__dirname, '../../dados/pecas.csv');
const vendasPath = path.join(__dirname, '../../dados/vendas.csv');

const pecas = [];
const vendas = [];

fs.createReadStream(pecasPath)
  .pipe(csv({ separator: ';' }))
  .on('data', (linha) => pecas.push(linha))
  .on('end', () => {
    console.log(`Peças lidas: ${pecas.length}`);
  });

fs.createReadStream(vendasPath)
  .pipe(csv({ separator: ';' }))
  .on('data', (linha) => vendas.push(linha))
  .on('end', () => {
    console.log(`Vendas lidas: ${vendas.length}`);
  });