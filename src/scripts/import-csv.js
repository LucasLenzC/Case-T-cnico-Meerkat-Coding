const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');
const csv = require('csv-parser');
const { normalizaPeca, normalizaVenda } = require('../utils/normalizacao');

function novoResumo(arquivo) {
  return { arquivo, lidos: 0, validos: 0, inseridos: 0, atualizados: 0, rejeitados: 0, motivos: {}, rejeicoes: [] };
}

async function importarArquivo({ arquivo, normalizar, salvar, existentes, chave, simular }) {
  const resumo = novoResumo(path.basename(arquivo));
  await pipeline(
    fs.createReadStream(arquivo),
    csv({ separator: ';', strict: true, mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim() }),
    async function (linhas) {
      for await (const linha of linhas) {
        resumo.lidos += 1;
        try {
          const registro = normalizar(linha);
          const identificador = chave(registro);
          const jaExiste = existentes.has(identificador);
          if (!simular) await salvar(registro);
          existentes.add(identificador);
          resumo.validos += 1;
          resumo[jaExiste ? 'atualizados' : 'inseridos'] += 1;
        } catch (erro) {


          const motivo = erro.code ? `Falha ao salvar (${erro.code})` : erro.message;
          resumo.rejeitados += 1;
          resumo.motivos[motivo] = (resumo.motivos[motivo] || 0) + 1;
          resumo.rejeicoes.push({ registro: resumo.lidos, sku: String(linha.sku || '').trim(), motivo });
        }
      }
    }
  );
  return resumo;
}

function exibirResumo(resumo, simular) {
  console.log(`\n${resumo.arquivo}${simular ? ' — SIMULAÇÃO (nenhum dado salvo)' : ''}`);
  console.log(`Registros lidos: ${resumo.lidos}`);
  console.log(`Registros válidos${simular ? '' : ' e salvos'}: ${resumo.validos}`);
  console.log(`Registros ${simular ? 'a inserir' : 'inseridos'}: ${resumo.inseridos}`);
  console.log(`Registros ${simular ? 'a atualizar' : 'atualizados'}: ${resumo.atualizados}`);
  console.log(`Registros rejeitados: ${resumo.rejeitados}`);
  for (const [motivo, quantidade] of Object.entries(resumo.motivos)) {
    console.log(`- ${motivo}: ${quantidade}`);
  }
}

async function executarImportacao() {
  const prisma = require('../config/prisma');
  const { inserirPeca } = require('../repositories/pecas.repository');
  const { inserirVenda } = require('../repositories/vendas.repository');
  const simular = process.argv.includes('--dry-run');
  const chaveVenda = registro => JSON.stringify([registro.id_venda, registro.sku]);
  try {
    const pecasExistentes = new Set((await prisma.pecas.findMany({ select: { sku: true } })).map(p => p.sku));
    const vendasExistentes = new Set((await prisma.vendas.findMany({ select: { id_venda: true, sku: true } })).map(chaveVenda));
    const pecas = await importarArquivo({
      arquivo: path.join(__dirname, '../../dados/pecas.csv'),
      normalizar: normalizaPeca,
      salvar: inserirPeca,
      existentes: pecasExistentes,
      chave: p => p.sku,
      simular
    });
    exibirResumo(pecas, simular);
    const vendas = await importarArquivo({
      arquivo: path.join(__dirname, '../../dados/vendas.csv'),
      normalizar: linha => {
        const venda = normalizaVenda(linha);
        if (!pecasExistentes.has(venda.sku)) throw new Error('SKU inexistente');
        return venda;
      },
      salvar: inserirVenda,
      existentes: vendasExistentes,
      chave: chaveVenda,
      simular
    });
    exibirResumo(vendas, simular);
    const pasta = path.join(__dirname, '../../relatorios');
    fs.mkdirSync(pasta, { recursive: true });
    const destino = path.join(pasta, `importacao-${simular ? 'simulacao-' : ''}${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(destino, JSON.stringify({ simular, geradoEm: new Date().toISOString(), pecas, vendas }, null, 2));
    console.log(`\nRelatório detalhado: ${destino}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  executarImportacao().catch(erro => {
    console.error('Importação interrompida:', erro.message);
    process.exitCode = 1;
  });
}

module.exports = { importarArquivo, executarImportacao };
