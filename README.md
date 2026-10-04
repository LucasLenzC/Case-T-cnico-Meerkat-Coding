# AutoVisão — controle de uma loja de autopeças

O AutoVisão é uma API com um painel simples para acompanhar o estoque e as vendas
de uma loja de autopeças. A aplicação recebe os dados dos CSVs, guarda tudo no
PostgreSQL e deixa os cálculos no backend. Assim, o painel fica responsável por
mostrar as informações, enquanto a API concentra as regras do negócio.

## Respostas do case

Os números abaixo foram calculados a partir dos CSVs fornecidos, considerando
somente vendas concluídas. Depois que os dados forem importados, o mesmo resumo
fica disponível no painel e na rota GET /dashboard/resumo.

1. **Faturamento líquido total:** **R$ 886.092,01**.

2. **Categorias que mais faturaram:**

   - Elétrica: R$ 225.367,56
   - Suspensão: R$ 197.304,01
   - Freios: R$ 167.287,65
   - Motor: R$ 157.539,45
   - Filtros: R$ 138.593,33

3. **Peças com estoque e sem nenhuma venda concluída:** 5 peças.

   - PC-1036 — Filtro de Oleo Fras-le (22 unidades)
   - PC-1031 — Bomba d'Agua Monroe (17 unidades)
   - PC-1020 — MOLA HELICOIDAL FRAS-LE (10 unidades)
   - PC-1022 — Bieleta Valeo (10 unidades)
   - PC-1044 — Farol Dianteiro Cofap (17 unidades)

Se os dados forem importados novamente ou alterados pelo painel, basta atualizar o
dashboard para consultar os valores mais recentes.

## Tecnologias utilizadas

- Node.js e Express.
- PostgreSQL e Prisma 6 com migration versionada.
- HTML, CSS, Bootstrap, JavaScript e Chart.js.
- csv-parser para leitura dos arquivos.
- node:test para os testes automatizados.

## Como executar localmente

Pré-requisitos: Node.js, npm e PostgreSQL.

1. Instale as dependências:

   ~~~powershell
   npm install
   ~~~

2. Crie um banco chamado autopecas e coloque um arquivo .env na raiz do projeto:

   ~~~env
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/autopecas"
   PORT=3000
   ~~~

3. Prepare o Prisma e aplique as migrations:

   ~~~powershell
   npm run prisma:generate
   npx prisma migrate deploy
   ~~~

4. Importe os CSVs que estão em dados/. O primeiro comando apenas confere os
   arquivos; o segundo grava os dados:

   ~~~powershell
   npm run import -- --dry-run
   npm run import
   ~~~

5. Inicie a aplicação:

   ~~~powershell
   npm run dev
   ~~~

Abra http://localhost:3000. O arquivo .env contém a senha do banco e, por isso,
fica fora do Git. Use .env.example como referência.

## Deploy com Supabase e Render

O Supabase fornece o PostgreSQL e o Render executa o Express e serve o painel. O
arquivo render.yaml já deixa definidos a instalação, a migration, o comando de
início e o health check.

1. Crie um projeto no Supabase e abra Connect. Como a aplicação é um servidor
   Express persistente, use a conexão Session pooler. Copie a URL exibida pelo
   Supabase e substitua apenas a senha. Não digite o host manualmente.
2. Envie o commit para um repositório público no GitHub.
3. No Render, escolha New > Web Service, conecte o repositório e selecione a
   branch main. Se o Render pedir os comandos manualmente, use:

   ~~~text
   Build Command: npm ci && npx prisma generate && npx prisma migrate deploy
   Start Command: npm start
   Health Check Path: /health
   ~~~

4. Cadastre no Render as variáveis:

   ~~~text
   DATABASE_URL=<URL do Session pooler do Supabase>
   NODE_ENV=production
   ~~~

5. Aguarde o deploy e teste SEU-ENDERECO.onrender.com/health. Depois teste
   /db-health, /pecas e /dashboard/resumo.

6. Para carregar os CSVs no banco remoto, use o painel publicado ou execute a
   importação local com a DATABASE_URL do Supabase. A URL deve ficar somente no
   .env local e nas variáveis privadas do Render.

O Supabase oferece mais de um tipo de conexão. Para este projeto, a Session pooler
é a opção mais simples porque o Express permanece rodando como um servidor. A
Transaction pooler é mais adequada a funções serverless e exige uma configuração
adicional do Prisma.

## O que já está funcionando

- Dashboard com faturamento líquido, custo, margem, pedidos, unidades e capital parado.
- Filtros do dashboard por período, loja e categoria.
- Gráficos por categoria, status e dia.
- Cadastro, edição e exclusão de peças.
- Busca combinada por texto, categoria e faixa de custo.
- Paginação e ordenação da lista de peças.
- Importação idempotente dos CSVs, com validação e relatório de rejeições.
- Upload de pecas.csv e vendas.csv pelo painel.

## Principais rotas da API

| Método | Rota | Uso |
| --- | --- | --- |
| GET | /health | Verifica se a API está disponível |
| GET | /db-health | Verifica a conexão com o PostgreSQL |
| GET | /pecas | Lista peças com filtros e paginação |
| GET | /pecas/:id | Busca uma peça pelo ID |
| POST | /pecas | Cadastra uma peça |
| PUT | /pecas/:id | Atualiza uma peça |
| DELETE | /pecas/:id | Exclui uma peça |
| GET | /vendas | Lista vendas importadas |
| GET | /dashboard/resumo | Retorna indicadores e dados dos gráficos |
| POST | /importacao/csv | Importa os dois CSVs enviados pelo painel |

Exemplo de busca combinada:

~~~text
GET /pecas?texto=cofap&categoria=Suspensão&precoMin=100&precoMax=500&page=1&pageSize=10&sortBy=estoque_atual&order=desc
~~~

Para cadastrar uma peça, envie sku, nome_peca, categoria, custo_unitario e
estoque_atual. O fornecedor é opcional. Se o SKU já existir, a API responde com
409.

## Como os indicadores são calculados

- Faturamento líquido: quantidade × preço unitário × (1 − desconto).
- Somente vendas com status concluida entram no faturamento e na margem.
- Margem: faturamento menos o custo atual da peça.
- Pedidos concluídos: quantidade de id_venda distintos.
- Peças nunca vendidas: estoque maior que zero e nenhum registro de venda concluída.
- O desconto 5 ou 5% representa 5%.

O frontend envia os filtros, formata os valores e mostra o que recebe. Os cálculos
ficam em src/services/dashboard.service.js, para que a mesma regra seja usada
por qualquer cliente da API.

## Importação

Os arquivos esperados são:

~~~text
dados/pecas.csv
dados/vendas.csv
~~~

Ambos usam cabeçalho, UTF-8 e separador ;. Antes de salvar, a aplicação ajusta
SKU, categorias, lojas, status, datas e valores para um formato único. As peças são
processadas antes das vendas, e cada venda usa a combinação id_venda + sku para
evitar duplicidade.

Use --dry-run para validar os arquivos sem gravar. A execução gera um relatório
JSON em relatorios/; essa pasta é ignorada pelo Git.

Pelo painel, selecione pecas.csv e vendas.csv na seção Importar CSVs. O navegador
envia o conteúdo para POST /importacao/csv, que usa a mesma normalização e as
mesmas regras do comando do terminal. Cada arquivo pode ter até 5 MB.

## Onde cada parte fica

~~~text
src/
  app.js            Configuração do Express, usada também nos testes
  server.js         Inicialização do servidor HTTP
  routes/           Definição das rotas
  controller/       Entrada e resposta HTTP
  services/         Regras de negócio e indicadores
  repositories/     Consultas e gravações pelo Prisma
  middlewares/      Tratamento padronizado de erros
  utils/            Normalização e erros HTTP
  scripts/          Importação dos CSVs
frontend/           HTML, CSS e JavaScript do painel
dados/              Arquivos CSV de entrada
prisma/             Modelo e migrations do banco
tests/              Testes automatizados
~~~

## Como verificar o projeto

~~~powershell
npm test
npm run prisma:validate
npm run prisma:status
~~~

O fluxo principal do case está disponível. Como próximos passos, ainda é possível
ampliar os testes de integração do CRUD e evoluir o painel conforme novas
necessidades aparecerem.


