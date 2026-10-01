require('dotenv').config();

const express = require('express');
const cors = require('cors');



const app = express();

app.use(cors());
app.use(express.json());


app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Servidor rodando na porta http://localhost:${port}`);
});
const pool = require('./config/database');

app.get('/db-health', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT NOW() AS agora');

    res.json({
      status: 'ok',
      banco: resultado.rows[0]
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      status: 'erro',
      mensagem: 'Não foi possível conectar ao banco'
    });
  }
});