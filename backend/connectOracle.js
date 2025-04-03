const oracledb = require('oracledb');
require('dotenv').config();

const config = {
  user: process.env.USER,
  password: process.env.PASSWORD,
  connectString: process.env.CONNECTSTRING,
};

async function getConnection() {
    const connection = await oracledb.getConnection(config);
    
    return connection;
}

module.exports = {getConnection, oracledb};