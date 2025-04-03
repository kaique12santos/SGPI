require('dotenv').config();

const oracledb = require('oracledb');

async function testConnection() {
  try {
    const connection = await oracledb.getConnection({
        user: process.env.USER,
        password: process.env.PASSWORD, 
        connectString: process.env.CONNECTSTRING 
    });
    console.log("Conexão bem-sucedida!");
    await connection.close();
  } catch (err) {
    console.error("Erro de conexão:", err);
  }
}

testConnection();