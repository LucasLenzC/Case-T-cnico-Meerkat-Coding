function texto(valor) {
  return String(valor ?? '').trim();
}

function semAcentos(valor) {
  return texto(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
}

function obrigatorio(valor, campo) {
  const resultado = texto(valor);
  if (!resultado) throw new Error(`${campo} obrigatório`);
  return resultado;
}

function numero(valor, campo, { minimo = 0, maximo = 9999999999.99, inteiro = false, percentual = false } = {}) {
  let entrada = obrigatorio(valor, campo).replace(/^R\$\s*/, '').trim();
  if (percentual) entrada = entrada.replace(/%$/, '').trim();
  if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(entrada)) entrada = entrada.replace(/\./g, '');
  entrada = entrada.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(entrada)) throw new Error(`${campo} inválido`);
  const resultado = Number(entrada);
  if (!Number.isFinite(resultado)) throw new Error(`${campo} inválido`);
  if (resultado < 0) throw new Error(`${campo} negativo`);
  if (resultado < minimo || resultado > maximo) throw new Error(`${campo} fora do intervalo permitido`);
  if (inteiro && !Number.isInteger(resultado)) throw new Error(`${campo} deve ser inteiro`);
  if (!inteiro && (entrada.split('.')[1] || '').length > 2) throw new Error(`${campo} deve ter no máximo duas casas decimais`);
  return resultado;
}

function normalizarSku(valor) {
  const sku = obrigatorio(valor, 'SKU').toUpperCase();
  if (sku.length > 50 || !/^[A-Z0-9][A-Z0-9._-]*$/.test(sku)) throw new Error('SKU inválido');
  return sku;
}

function normalizarData(valor) {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor;
  const entrada = obrigatorio(valor, 'Data');
  const iso = entrada.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const brasileira = entrada.match(/^(\d{2})([/-])(\d{2})\2(\d{4})$/);
  if (!iso && !brasileira) throw new Error('Data inválida');
  const resultado = iso ? entrada : `${brasileira[4]}-${brasileira[3]}-${brasileira[1]}`;
  const data = new Date(`${resultado}T00:00:00.000Z`);
  // O Date pode transformar 31/02 em março; a comparação impede isso.
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== resultado) throw new Error('Data inválida');
  return data;
}

function normalizarCategoria(valor) {
  const entrada = obrigatorio(valor, 'Categoria');
  const categoria = semAcentos(entrada);
  if (categoria.includes('freio') || categoria.includes('frenagem')) return 'Freios';
  if (categoria.includes('eletric')) return 'Elétrica';
  if (categoria.includes('suspens')) return 'Suspensão';
  if (categoria.includes('motor')) return 'Motor';
  if (categoria.includes('filtro')) return 'Filtros';
  return capitalizar(entrada);
}

function capitalizar(valor) {
  return texto(valor).toLowerCase().replace(/\s+/g, ' ').replace(/(^|\s)(\p{L})/gu, (_, espaco, letra) => espaco + letra.toUpperCase());
}

function normalizarLoja(valor) {
  const entrada = obrigatorio(valor, 'Loja');
  const loja = semAcentos(entrada);
  if (loja.includes('centro')) return 'Loja Centro';
  if (loja.includes('norte')) return 'Loja Norte';
  if (loja.includes('sul')) return 'Loja Sul';
  return capitalizar(entrada);
}

function normalizarStatus(valor) {
  const status = {
    concluida: 'concluida', concluido: 'concluida', finalizada: 'concluida', finalizado: 'concluida',
    cancelada: 'cancelada', cancelado: 'cancelada', devolvida: 'devolvida', devolvido: 'devolvida'
  };
  const resultado = status[semAcentos(obrigatorio(valor, 'Status'))];
  if (!resultado) throw new Error('Status desconhecido');
  return resultado;
}

function dataIso(valor) {
  if (valor === undefined || valor === null || valor === '') return '';
  try {
    return normalizarData(valor).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function normalizaPeca(linha) {
  return {
    sku: normalizarSku(linha.sku),
    nome_peca: obrigatorio(linha.nome_peca, 'Nome da peça'),
    categoria: normalizarCategoria(linha.categoria),
    custo_unitario: numero(linha.custo_unitario, 'Custo unitário'),
    fornecedor: texto(linha.fornecedor) || null,
    estoque_atual: numero(linha.estoque_atual, 'Estoque', { inteiro: true, maximo: 2147483647 })
  };
}

function normalizaVenda(linha) {
  const id = obrigatorio(linha.id_venda, 'ID da venda');
  if (id.length > 50) throw new Error('ID da venda inválido');
  return {
    id_venda: id,
    data_venda: normalizarData(linha.data_venda),
    loja: normalizarLoja(linha.loja),
    cliente: texto(linha.cliente) || null,
    sku: normalizarSku(linha.sku),
    quantidade: numero(linha.quantidade, 'Quantidade', { minimo: 0.01 }),
    preco_unitario: numero(linha.preco_unitario, 'Preço unitário'),
    desconto: numero(texto(linha.desconto) || '0', 'Desconto', { maximo: 100, percentual: true }) / 100,
    status: normalizarStatus(linha.status),
    vendedor: texto(linha.vendedor) || null
  };
}

module.exports = {
  normalizaPeca,
  normalizaVenda,
  normalizarData,
  normalizarCategoria,
  normalizarLoja,
  normalizarStatus,
  normalizarSku,
  dataIso
};
