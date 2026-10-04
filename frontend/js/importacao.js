function arquivoCsv(input, nome) {
  const arquivo = input.files[0];
  if (!arquivo) throw new Error(`Selecione o arquivo ${nome}.`);
  if (!arquivo.name.toLowerCase().endsWith('.csv')) {
    throw new Error(`${nome} deve estar no formato CSV.`);
  }
  if (arquivo.size > 5 * 1024 * 1024) {
    throw new Error(`${nome} deve ter no máximo 5 MB.`);
  }
  return arquivo;
}

async function importarArquivosCsv() {
  const botao = $('importar-csv');
  const resultado = $('resultado-importacao');
  botao.disabled = true;
  resultado.textContent = 'Lendo os arquivos…';

  try {
    const pecas = arquivoCsv($('arquivo-pecas'), 'pecas.csv');
    const vendas = arquivoCsv($('arquivo-vendas'), 'vendas.csv');
    const resposta = await api('/importacao/csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pecas: await pecas.text(), vendas: await vendas.text() })
    });
    const p = resposta.relatorio.pecas;
    const v = resposta.relatorio.vendas;
    resultado.textContent = `Peças: ${p.validos} válidas, ${p.rejeitados} rejeitadas. Vendas: ${v.validos} válidas, ${v.rejeitados} rejeitadas.`;
    alerta('CSV importado com sucesso.', 'success');
    await carregarPecas();
    await carregarDashboard();
  } catch (erro) {
    resultado.textContent = 'A importação não foi concluída.';
    alerta(erro.message);
  } finally {
    botao.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('importar-csv').onclick = importarArquivosCsv;
});
