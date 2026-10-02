require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const pecasRoutes = require('./routes/peca.routes');
const vendasRoutes = require('./routes/vendas.routes');
const pool = require('./config/database');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/pecas', pecasRoutes);
app.use('/vendas', vendasRoutes);
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/db-health', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT NOW() AS agora');
    res.json({ status: 'ok', banco: resultado.rows[0] });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ status: 'erro', mensagem: 'Não foi possível conectar ao banco' });
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta http://localhost:${port}`);
});
