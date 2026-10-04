# AutoVisão — Case Autopeças

API e painel para controlar peças e analisar as vendas de uma loja de autopeças.
Os dados ficam no PostgreSQL e as regras de cálculo ficam no backend.

## Respostas do case

Os valores abaixo foram obtidos do banco atual considerando somente vendas concluídas.

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

Se os dados forem importados novamente ou alterados pelo painel, execute o endpoint
`GET /dashboard/resumo` para atualizar os valores.

## Tecnologias

- Node.js e Express.
- PostgreSQL e Prisma 6 com migration versionada.
- HTML, CSS, Bootstrap, JavaScript e Chart.js.
- `csv-parser` para leitura dos arquivos.
- `node:test` para os testes automatizados.

## Como executar

Pré-requisitos: Node.js, npm e PostgreSQL.

1. Instale as dependências:

   ```powershell
   npm install
   ```

2. Crie um banco chamado `autopecas` e um arquivo `.env` na raiz:

   ```env
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/autopecas"
   PORT=3000
   ```

3. Prepare o Prisma e aplique as migrations:

   ```powershell
   npm run prisma:generate
   npx prisma migrate deploy
   ```

4. Importe os CSVs de `dados/`:

   ```powershell
   npm run import -- --dry-run
   npm run import
   ```

5. Inicie a aplicação:

   ```powershell
   npm run dev
   ```

Abra <http://localhost:3000>. O `.env` não deve ser versionado.

## Funcionalidades

- Dashboard com faturamento líquido, custo, margem, pedidos, unidades e capital parado.
- Filtros do dashboard por período, loja e categoria.
- Gráficos por categoria, status e dia.
- Cadastro, edição e exclusão de peças.
- Busca combinada por texto, categoria e faixa de custo.
- Paginação e ordenação da lista de peças.
- Importação idempotente dos CSVs, com validação e relatório de rejeições.

## Rotas principais

| Método | Rota | Uso |
| --- | --- | --- |
| GET | `/health` | Verifica se a API está disponível |
| GET | `/db-health` | Verifica a conexão com o PostgreSQL |
| GET | `/pecas` | Lista peças com filtros e paginação |
| GET | `/pecas/:id` | Busca uma peça pelo ID |
| POST | `/pecas` | Cadastra uma peça |
| PUT | `/pecas/:id` | Atualiza uma peça |
| DELETE | `/pecas/:id` | Exclui uma peça |
| GET | `/vendas` | Lista vendas importadas |
| GET | `/dashboard/resumo` | Retorna indicadores e dados dos gráficos |

Exemplo de busca combinada:

```text
GET /pecas?texto=cofap&categoria=Suspensão&precoMin=100&precoMax=500&page=1&pageSize=10&sortBy=estoque_atual&order=desc
```

O cadastro exige `sku`, `nome_peca`, `categoria`, `custo_unitario` e
`estoque_atual`. O fornecedor é opcional. O SKU duplicado retorna `409`.

## Regras dos indicadores

- Faturamento líquido: `quantidade × preço unitário × (1 − desconto)`.
- Somente vendas com status `concluida` entram no faturamento e na margem.
- Margem: faturamento menos o custo atual da peça.
- Pedidos concluídos: quantidade de `id_venda` distintos.
- Peças nunca vendidas: estoque maior que zero e nenhum registro de venda concluída.
- O desconto `5` ou `5%` representa 5%.

O frontend apenas envia filtros, formata valores e renderiza os dados recebidos.
Os cálculos são feitos em `src/services/dashboard.service.js`.

## Importação

Os arquivos esperados são:

```text
dados/pecas.csv
dados/vendas.csv
```

Ambos usam cabeçalho, UTF-8 e separador `;`. A importação normaliza SKU,
categorias, lojas, status, datas e valores. Peças são processadas antes das
vendas, e cada venda usa a chave composta `id_venda + sku` para evitar duplicidade.

Use `--dry-run` para validar os arquivos sem gravar. A execução gera um relatório
JSON em `relatorios/`; essa pasta é ignorada pelo Git.

## Organização

```text
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
```

## Verificação

```powershell
npm test
npm run prisma:validate
npm run prisma:status
```

O fluxo principal do case está implementado. Melhorias posteriores podem incluir
upload de CSV pelo painel, testes de integração do CRUD e publicação online.

## Decisões de implementação

- O Prisma é a única camada usada pela aplicação para acessar o banco.
- Controllers tratam HTTP; services concentram regras; repositories fazem consultas.
- A importação usa `upsert` e pode ser repetida sem criar duplicatas.
- A normalização acontece na entrada para que o dashboard trabalhe com dados consistentes.
- As migrations em `prisma/migrations` são a fonte versionada da estrutura do banco.
