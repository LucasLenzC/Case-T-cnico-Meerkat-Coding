# Autopeças Case
Perguntas ainda serão respondidas:
1
2
3
API e painel para controle de peças, vendas e indicadores de uma loja de autopeças.

## Requisitos

- Node.js
- PostgreSQL
- Banco criado conforme `database/schema.sql`

Crie um `.env` na raiz do projeto:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/autopecas"
PORT=3000
```

## Executar

```powershell
npm install
npm run dev
```

Abra `http://localhost:3000` para acessar o painel.

## Prisma

O projeto usa Prisma 6.19.3. O modelo está em `prisma/schema.prisma` e a migration inicial está em `prisma/migrations/0_init`.

```powershell
npm run prisma:validate
npm run prisma:generate
npm run prisma:status
npm run prisma:studio
```

Quando o modelo mudar, crie uma nova migration em desenvolvimento:

```powershell
npx prisma migrate dev --name nome-da-alteracao
```

As pastas de `prisma/migrations` e o arquivo `prisma/schema.prisma` devem ser versionados no Git. O `.env` não deve ser commitado.

## Importação dos CSVs

Os arquivos esperados estão em `dados/`. Para importar os registros:

```powershell
npm run import
```

O painel usa as rotas `GET /pecas` e `GET /vendas` para carregar os dados. Os ajustes feitos pelo formulário do painel permanecem locais no navegador até o CRUD persistido ser implementado.
