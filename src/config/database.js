const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
pool.on('error', (err) => {
  console.error('Erro ao conectar ao banco de dados:', err);
});
module.exports = pool;