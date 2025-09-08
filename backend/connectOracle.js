const oracledb = require('oracledb');
require('dotenv').config();

let pool;
oracledb.fetchAsBuffer = [ oracledb.BLOB ];

async function initOraclePool() {
  if (pool) return pool; // já inicializado
  pool = await oracledb.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECTSTRING,
    poolMin: 2,
    poolMax: 10,
    poolIncrement: 1,
    poolTimeout: 60
  });
  return pool;
}

async function getConnection() {
  if (!pool) await initOraclePool();
  return await pool.getConnection();
}

module.exports = {getConnection, initOraclePool, oracledb};