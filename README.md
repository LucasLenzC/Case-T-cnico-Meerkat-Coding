# AutoVisão — Autopeças Case

API e painel para cadastro de peças, consulta de vendas e análise de indicadores
de uma loja de autopeças. Os registros são persistidos em PostgreSQL; os
indicadores e as séries dos gráficos são calculados no backend.

## Tecnologias

- Node.js, Express e CommonJS.
- PostgreSQL e Prisma 6.
- HTML, CSS e JavaScript, com Bootstrap e Chart.js.
- `csv-parser` para a importação e `node:test` para os testes.

O frontend carrega Bootstrap, ícones, fontes e Chart.js por CDN, portanto requer
acesso à internet para esses recursos.

## Configuração e execução

Use Node.js 24 (versão utilizada no desenvolvimento), npm e PostgreSQL.
Execute os comandos na pasta que contém `package.json`.

1. Instale as dependências:

   ```powershell
   npm install
   ```

2. Crie um banco vazio chamado `autopecas` no PostgreSQL e um arquivo `.env`
   na raiz do projeto:

   ```env
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/autopecas"
   PORT=3000
   ```

3. Prepare o cliente Prisma e aplique a migration no banco novo:

   ```powershell
   npm run prisma:generate
   npx prisma migrate deploy
   ```

   `database/schema.sql` é uma alternativa para criar as tabelas manualmente.
   Se o banco já foi criado por SQL, faça o baseline das migrations antes de
   usar `migrate deploy`; não aplique a migration inicial sobre tabelas já
   existentes sem reconciliar o histórico.

4. Confira os CSVs e importe os dados, se desejar:

   ```powershell
   npm run import -- --dry-run
   npm run import
   ```

5. Inicie a aplicação:

   ```powershell
   npm run dev
   ```

Abra [http://localhost:3000](http://localhost:3000). Para executar sem nodemon,
use `npm start`. Mantenha uma única instância na porta configurada. No nodemon,
digite `rs` para reiniciar; com `npm start`, pare e inicie novamente após mudar
o backend. Atualize o navegador para carregar mudanças do frontend.

## Funcionalidades atuais

- Cadastro, edição e exclusão de peças pelo painel, com confirmação de exclusão.
- Pesquisa por nome ou SKU, filtro de categoria e custo, paginação e ordenação.
- Normalização compartilhada entre cadastro, edição e importação.
- Dashboard com faturamento, custo, margem, pedidos, unidades e capital parado.
- Gráficos de resultado por categoria, pedidos por status e pedidos por dia.
- Importação pelo terminal, com simulação e relatório de rejeições.

## API de peças

| Método | Rota | Comportamento atual |
| --- | --- | --- |
| GET | `/pecas` | Listagem com filtros e paginação |
| GET | `/pecas/:id` | Consulta pelo ID interno |
| POST | `/pecas` | Insere ou atualiza pelo SKU (`upsert`) |
| PUT | `/pecas/:id` | Atualiza a peça com os campos obrigatórios completos |
| DELETE | `/pecas/:id` | Exclui a peça |

Exemplo de consulta com filtros combinados:

```http
GET /pecas?texto=cofap&categoria=Suspens%C3%A3o&precoMin=100&precoMax=500&page=1&pageSize=10&sortBy=estoque_atual&order=desc
```

`texto` busca em `nome_peca` e `sku`. `precoMin` e `precoMax` filtram
`custo_unitario`. A página padrão é 1 e o tamanho padrão é 10, limitado a 100.
`sortBy` aceita `id`, `sku`, `nome_peca`, `categoria`, `custo_unitario`,
`estoque_atual` e `fornecedor`; `order` aceita `asc` ou `desc`.

Formato da resposta:

```json
{
  "data": [],
  "page": 1,
  "pageSize": 10,
  "total": 0,
  "totalPages": 0
}
```

Exemplo de corpo para cadastro ou edição:

```json
{
  "sku": "PC-2000",
  "nome_peca": "Pastilha de freio",
  "categoria": "Freios",
  "custo_unitario": 100.5,
  "estoque_atual": 10,
  "fornecedor": "Fornecedor exemplo"
}
```

SKU, nome, categoria, custo e estoque são obrigatórios. Fornecedor é opcional.
O service normaliza os dados antes de chamar o repository.

## Dashboard e vendas

```http
GET /dashboard/resumo
GET /dashboard/resumo?dataInicial=2025-01-01&dataFinal=2025-06-30&loja=Loja%20Centro&categoria=Freios
GET /vendas
GET /health
GET /db-health
```

Os filtros do dashboard podem ser combinados pela API e também estão disponíveis
no painel. `GET /vendas` retorna uma lista sem paginação. As duas rotas de saúde
verificam a aplicação e a conexão com o banco.

Significado dos indicadores:

| Campo | Significado |
| --- | --- |
| `faturamento` | Quantidade × preço unitário × (1 − desconto), em vendas concluídas |
| `custo` | Quantidade vendida × custo atual da peça cadastrada |
| `margem` | Faturamento menos custo |
| `margemPercentual` | Margem / faturamento × 100; zero quando não há faturamento |
| `pedidosConcluidos` / `vendas` | IDs de pedido distintos nas linhas concluídas |
| `pedidosNaoConcluidos` | IDs distintos nas linhas com outros status |
| `unidades` | Soma das quantidades das vendas concluídas |
| `registrosProcessados` | Linhas de vendas dentro dos filtros, com qualquer status |
| `itens` | Linhas de vendas concluídas dentro dos filtros |
| `capitalParado` | Estoque × custo das peças listadas em `pecasNuncaVendidas` |

O backend também entrega `categorias`, `resultadoPorCategoria`,
`pedidosPorStatus`, `vendasPorDia`, `pecasNuncaVendidas`, `opcoes` e `filtros`.
O frontend formata os valores e renderiza as tabelas e os gráficos.

## Importação de CSVs

Os arquivos devem estar em `dados/`, em UTF-8, com cabeçalho e separador `;`:

```text
pecas.csv:
sku;nome_peca;categoria;custo_unitario;fornecedor;estoque_atual

vendas.csv:
id_venda;data_venda;loja;cliente;sku;quantidade;preco_unitario;desconto;status;vendedor
```

Peças são processadas antes de vendas. A importação valida datas do calendário,
SKU, números e a existência da peça referenciada pela venda. Quantidades de
venda devem ser positivas; quantidades negativas, inclusive em devoluções, são
rejeitadas. Custo, preço e estoque podem ser zero; estoque deve ser inteiro.
Fornecedor, cliente e vendedor são opcionais.

Valores como `R$ 1.234,50` são convertidos para números. Datas aceitas:
`YYYY-MM-DD`, `DD/MM/YYYY` e `DD-MM-YYYY`. No CSV, `5` e `5%` significam
desconto de 5%; desconto vazio significa 0%.

Exemplos de padronização:

| Entrada | Valor salvo |
| --- | --- |
| `pc-1001` | `PC-1001` |
| `FREIOS`, `Freio`, `Frenagem` | `Freios` |
| `ELETRICA` | `Elétrica` |
| `suspensao` | `Suspensão` |
| `Filtro`, `FILTROS` | `Filtros` |
| ` LOJA CENTRO ` | `Loja Centro` |
| `CONCLUÍDA`, `finalizada` | `concluida` |
| `CANCELADA`, `DEVOLVIDA` | `cancelada`, `devolvida` |

O terminal mostra registros lidos, válidos, inseridos, atualizados, rejeitados e
motivos. Um JSON em `relatorios/` detalha o número do registro, SKU e motivo.
Os relatórios locais são ignorados pelo Git.

As contagens se referem a linhas: uma chave repetida conta como atualização
após a primeira inserção. A simulação consulta o banco e prevê essas contagens
sem gravar. A importação real usa `upsert` e sobrescreve dados existentes,
incluindo custo e estoque. Registros antigos rejeitados pelo CSV atual não são
apagados. Erros de uma linha permitem continuar; arquivo ausente ou CSV
malformado interrompe a execução. Linhas já salvas permanecem no banco.

## Verificação

```powershell
npm run test:import
npm run prisma:validate
npm run prisma:status
```

Os testes atuais cobrem normalização, datas impossíveis, valores inválidos,
contagens, falhas por linha e simulação sem gravação. Ainda não cobrem o CRUD
HTTP, os indicadores do dashboard ou os fluxos do navegador.

## Organização

```text
src/
  routes/          Rotas HTTP
  controller/      Entrada e resposta HTTP
  services/        Regras e indicadores
  repositories/    Consultas e gravação no Prisma
  utils/           Normalização compartilhada
  scripts/         Importação executada pelo terminal
frontend/          Painel HTML, CSS e JavaScript
dados/             CSVs de entrada
prisma/            Modelo e migrations
tests/             Testes da importação e normalização
```

## Pendências conhecidas

- Implementar upload de CSV pelo painel, reutilizando a importação em um service.
- Retornar 400 para validação, 404 para atualização/exclusão inexistente e 409
  para conflitos de SKU; hoje esses erros podem virar 500 genérico.
- Validar IDs e filtros inválidos e separar o cadastro manual (`create`) do
  `upsert` da importação, se o cadastro não deve sobrescrever um SKU existente.
- Proteger o histórico ao excluir uma peça ou alterar seu SKU. As vendas são
  relacionadas por texto do SKU; sem a peça, o dashboard considera custo zero.
- Definir custo histórico: hoje editar o custo da peça muda a margem de vendas
  antigas, pois o cálculo usa o custo atual.
- Após excluir o último item de uma página, ajustar a página; evitar mensagens
  de sucesso que ocultem falha no recarregamento.
- Revisar dados antigos que ainda estejam fora do padrão e ampliar os testes
  para HTTP, dashboard e fluxos do navegador.

O `.env` contém credenciais e não deve ser versionado. O projeto ainda está em
desenvolvimento; as pendências acima fazem parte do estado atual.
