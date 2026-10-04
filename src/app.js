require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const pecasRoutes = require('./routes/peca.routes');
const vendasRoutes = require('./routes/vendas.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const importacaoRoutes = require('./routes/importacao.routes');
const prisma = require('./config/prisma');
const { errorHandler } = require('./middlewares/error-handler');
const { notFound } = require('./utils/http-error');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/pecas', pecasRoutes);
app.use('/vendas', vendasRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/importacao', importacaoRoutes);
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/db-health', async (req, res, next) => {
  try {
    const [resultado] = await prisma.$queryRaw`SELECT NOW() AS agora`;
    res.json({ status: 'ok', banco: resultado });
  } catch (erro) {
    next(erro);
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

app.use((req, res, next) => next(notFound('Rota não encontrada')));
app.use(errorHandler);

module.exports = app;
