const path = require('node:path');
const prisma = require('../config/prisma');
const { importarArquivo, importarCsvs, gravarRelatorio } = require('../services/importacao.service');

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
  const simular = process.argv.includes('--dry-run');
  try {
    const relatorio = await importarCsvs({
      pecasArquivo: path.join(__dirname, '../../dados/pecas.csv'),
      vendasArquivo: path.join(__dirname, '../../dados/vendas.csv'),
      simular
    });
    exibirResumo(relatorio.pecas, simular);
    exibirResumo(relatorio.vendas, simular);
    console.log(`\nRelatório detalhado: ${gravarRelatorio(relatorio, simular)}`);
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

module.exports = { importarArquivo, importarCsvs, executarImportacao };
