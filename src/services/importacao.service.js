const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const csv = require('csv-parser');
const prisma = require('../config/prisma');
const { normalizaPeca, normalizaVenda } = require('../utils/normalizacao');
const { importarPeca } = require('../repositories/pecas.repository');
const { inserirVenda } = require('../repositories/vendas.repository');

function novoResumo(arquivo) {
  return { arquivo, lidos: 0, validos: 0, inseridos: 0, atualizados: 0, rejeitados: 0, motivos: {}, rejeicoes: [] };
}

function entradaCsv({ arquivo, conteudo }) {
  if (conteudo !== undefined) return Readable.from([Buffer.from(conteudo, 'utf8')]);
  return fs.createReadStream(arquivo);
}

async function importarArquivo({ arquivo, conteudo, nomeArquivo, normalizar, salvar, existentes, chave, simular }) {
  const resumo = novoResumo(nomeArquivo || path.basename(arquivo));
  await pipeline(
    entradaCsv({ arquivo, conteudo }),
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

async function importarCsvs({ pecasArquivo, vendasArquivo, pecasConteudo, vendasConteudo, simular = false }) {
  const chaveVenda = registro => JSON.stringify([registro.id_venda, registro.sku]);
  const pecasExistentes = new Set((await prisma.pecas.findMany({ select: { sku: true } })).map(p => p.sku));
  const vendasExistentes = new Set((await prisma.vendas.findMany({ select: { id_venda: true, sku: true } })).map(chaveVenda));

  const pecas = await importarArquivo({
    arquivo: pecasArquivo,
    conteudo: pecasConteudo,
    nomeArquivo: 'pecas.csv',
    normalizar: normalizaPeca,
    salvar: importarPeca,
    existentes: pecasExistentes,
    chave: peca => peca.sku,
    simular
  });

  const vendas = await importarArquivo({
    arquivo: vendasArquivo,
    conteudo: vendasConteudo,
    nomeArquivo: 'vendas.csv',
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

  return { simular, geradoEm: new Date().toISOString(), pecas, vendas };
}

function gravarRelatorio(relatorio, simular = false) {
  const pasta = path.join(__dirname, '../../relatorios');
  fs.mkdirSync(pasta, { recursive: true });
  const destino = path.join(pasta, `importacao-${simular ? 'simulacao-' : ''}${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(destino, JSON.stringify(relatorio, null, 2));
  return destino;
}

module.exports = { importarArquivo, importarCsvs, gravarRelatorio };
