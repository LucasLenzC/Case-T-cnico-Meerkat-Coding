# Decisões do projeto

## Arquitetura

A aplicação usa Express com uma separação simples:

- **Routes** definem as URLs e os métodos HTTP.
- **Controllers** recebem a requisição e devolvem a resposta.
- **Services** concentram validação, normalização e regras de negócio.
- **Repositories** fazem as consultas usando Prisma.
- **Scripts** executam a importação dos CSVs fora do fluxo HTTP.

src/app.js configura o Express e pode ser carregado pelos testes. src/server.js
apenas abre a porta HTTP.

## Banco e migrations

O PostgreSQL foi escolhido por ser relacional e adequado para relacionar peças e
vendas. O Prisma centraliza o acesso ao banco e as migrations em
prisma/migrations mantêm a evolução do schema versionada.

A peça tem SKU único. A venda usa a combinação id_venda + sku como chave única,
porque uma venda pode ter mais de uma peça. As vendas guardam o SKU recebido no
CSV para preservar o formato da origem.

## Importação

Os CSVs são lidos pelo script src/scripts/import-csv.js. A importação:

1. Normaliza os dados antes de salvar.
2. Valida datas, números, SKU, status e referências de peças.
3. Processa peças antes das vendas.
4. Usa upsert para permitir reexecução sem duplicar registros.
5. Continua após rejeitar uma linha e grava um relatório JSON.
6. Permite --dry-run para simular sem alterar o banco.

Categorias, lojas e status são padronizados na entrada para evitar que diferenças
de maiúsculas, acentos ou nomes equivalentes criem filtros duplicados.

## Regras dos indicadores

O faturamento líquido considera somente vendas concluídas:

quantidade × preço_unitário × (1 − desconto)

O desconto 5 ou 5% representa 5%. A margem é o faturamento menos o custo atual
da peça. Uma peça é considerada nunca vendida quando possui estoque maior que
zero e não aparece em nenhuma venda concluída do histórico.

Os cálculos ficam no backend para que o painel apenas envie filtros e renderize os
valores recebidos da API.

## API e painel

A API oferece o CRUD de peças, busca combinada, paginação e ordenação. O dashboard
aceita período, loja e categoria como filtros. O frontend usa Bootstrap para a
estrutura visual e Chart.js para os gráficos, mantendo JavaScript simples e sem
repetir as regras financeiras.

## Limitações assumidas

O custo usado na margem é o custo atual cadastrado da peça. O projeto ainda não
mantém histórico de custo por venda. O upload de CSV pelo painel também não faz
parte do fluxo principal: a importação é executada pelo comando do terminal,
conforme o requisito do case.

Essas escolhas mantêm o escopo pequeno e deixam as regras principais fáceis de
testar e revisar.
