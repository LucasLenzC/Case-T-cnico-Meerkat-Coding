const { importarCsvs, gravarRelatorio } = require('../services/importacao.service');
const { badRequest } = require('../utils/http-error');

function validarConteudo(valor, campo) {
  if (typeof valor !== 'string' || !valor.trim()) throw badRequest(`Arquivo ${campo} obrigatório`);
  if (Buffer.byteLength(valor, 'utf8') > 5 * 1024 * 1024) {
    throw badRequest(`Arquivo ${campo} excede o limite de 5 MB`);
  }
}

async function importar(req, res, next) {
  try {
    const { pecas, vendas } = req.body || {};
    validarConteudo(pecas, 'pecas');
    validarConteudo(vendas, 'vendas');
    const relatorio = await importarCsvs({ pecasConteudo: pecas, vendasConteudo: vendas });
    const arquivoRelatorio = gravarRelatorio(relatorio);
    res.json({
      mensagem: 'CSV importado com sucesso',
      relatorio,
      arquivoRelatorio: arquivoRelatorio.split(/[\\/]/).pop()
    });
  } catch (erro) {
    next(erro);
  }
}

module.exports = { importar };
