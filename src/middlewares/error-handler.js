function classificarErro(erro) {
  if (erro?.statusCode) {
    return { statusCode: erro.statusCode, mensagem: erro.message };
  }

  if (erro?.code === 'P2002') {
    return { statusCode: 409, mensagem: 'SKU já cadastrado' };
  }

  if (erro?.code === 'P2025') {
    return { statusCode: 404, mensagem: 'Peça não encontrada' };
  }

  if (erro?.code === 'P2023') {
    return { statusCode: 400, mensagem: 'Identificador inválido' };
  }

  return { statusCode: 500, mensagem: 'Erro interno do servidor' };
}

function errorHandler(erro, req, res, next) {
  if (res.headersSent) return next(erro);

  const resposta = classificarErro(erro);
  if (resposta.statusCode >= 500) console.error(erro);

  return res.status(resposta.statusCode).json({ mensagem: resposta.mensagem });
}

module.exports = { classificarErro, errorHandler };
