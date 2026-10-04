# Decisões do projeto

Este arquivo registra as escolhas que orientaram o desenvolvimento do AutoVisão.
A ideia foi manter a aplicação simples de entender, fácil de testar e próxima do
fluxo de uma loja de autopeças.

## Como o código foi dividido

Escolhi uma separação em camadas para que cada parte tenha uma responsabilidade
clara:

- **Routes** dizem quais URLs existem e qual método HTTP cada uma aceita.
- **Controllers** recebem a requisição, chamam a regra necessária e montam a resposta.
- **Services** concentram validações, normalização e regras de negócio.
- **Repositories** conversam com o banco usando o Prisma.
- **Scripts** executam tarefas fora do HTTP, como a importação dos CSVs.

O arquivo src/app.js monta o Express e pode ser reutilizado pelos testes. O
src/server.js fica apenas com a inicialização do servidor e a abertura da porta.

## Banco e migrations

Usei PostgreSQL porque as peças e as vendas têm uma relação natural e precisam de
dados consistentes. O Prisma concentra o acesso ao banco e as migrations em
prisma/migrations deixam registrada a evolução das tabelas.

Cada peça tem um SKU único. Para as vendas, a chave é a combinação de id_venda + sku,
pois uma mesma venda pode ter mais de uma peça. O SKU também é mantido na tabela de
vendas para preservar a referência que veio do CSV.

## Por que a importação funciona desse jeito

O script src/scripts/import-csv.js reaproveita o mesmo service usado pelo upload do
painel. Antes de gravar, a aplicação:

1. normaliza datas, números, SKUs, categorias, lojas e status;
2. valida os campos obrigatórios e a existência da peça vendida;
3. importa as peças antes das vendas;
4. usa upsert, permitindo repetir a importação sem duplicar dados;
5. registra as linhas rejeitadas em um relatório JSON;
6. oferece --dry-run para conferir o arquivo sem alterar o banco.

Padronizar os dados logo na entrada evita que diferenças como ELETRICA, Elétrica e
elétrica apareçam como categorias diferentes no dashboard.

## Regras usadas no dashboard

O faturamento líquido considera somente vendas concluídas e segue esta fórmula:

~~~text
quantidade × preço unitário × (1 − desconto)
~~~

O valor 5 ou 5% representa um desconto de cinco por cento. A margem é o faturamento
menos o custo atual cadastrado para a peça. Uma peça entra na lista de nunca vendida
quando ainda tem estoque e não aparece em nenhuma venda concluída do histórico.

Essas contas ficam no backend. O painel envia os filtros e exibe os valores que a
API devolve, sem repetir as regras financeiras no JavaScript do navegador.

## API e painel

A API oferece o CRUD de peças, busca por texto, categoria e faixa de custo,
paginação e ordenação. O dashboard pode ser filtrado por período, loja e categoria.

No frontend, usei Bootstrap para organizar a página e Chart.js para os gráficos.
O código do painel continua em JavaScript simples, suficiente para consumir as
rotas sem criar uma camada adicional desnecessária. O upload recebe os dois CSVs e
reutiliza o mesmo service da importação pelo terminal.

## Limitações que assumi

A margem usa o custo atual da peça. O sistema ainda não guarda o histórico do
custo no momento de cada venda. O upload limita cada arquivo a 5 MB e exige o envio
dos arquivos de peças e vendas juntos.

Essas decisões mantêm o escopo do case controlado, mas deixam um caminho claro
para evoluções futuras, como histórico de custos e testes de integração mais
abrangentes.
