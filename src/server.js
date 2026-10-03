require('dotenv').config();
const prisma = require('./config/prisma');
const express = require('express');
const cors = require('cors');
const path = require('path');

const pecasRoutes = require('./routes/peca.routes');
const vendasRoutes = require('./routes/vendas.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/pecas', pecasRoutes);
app.use('/vendas', vendasRoutes);
app.use('/dashboard', dashboardRoutes);
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/db-health', async (req, res) => {
  try {
    const [resultado] = await prisma.$queryRaw`SELECT NOW() AS agora`;

    res.json({
      status: 'ok',
      banco: resultado
    });
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      status: 'erro',
      mensagem: 'Não foi possível conectar ao banco'
    });
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta http://localhost:${port}`);
});
