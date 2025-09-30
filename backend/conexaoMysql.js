const mysql = require('mysql2/promise');
require('dotenv').config();
// Configuração da conexão MySQL
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  // Pool de conexões para melhor performance
  connectionLimit: 10,
  queueLimit: 0
};

// Pool de conexões
let pool;

async function initializePool() {
  try {
    pool = mysql.createPool(dbConfig);
    console.log('Pool de conexões MySQL inicializado com sucesso');
    
    // Teste de conexão
    const connection = await pool.getConnection();
    console.log('Conexão MySQL estabelecida com sucesso');
    connection.release();
    
    return pool;
  } catch (error) {
    console.error('Erro ao inicializar pool MySQL:', error);
    throw error;
  }
}

// Função para obter conexão (equivalente ao Oracle)
async function getConnection() {
  try {
    if (!pool) {
      await initializePool();
    }
    
    const connection = await pool.getConnection();
    
    // Adicionar método execute personalizado para manter compatibilidade
    const originalExecute = connection.execute.bind(connection);
    
    connection.execute = async function(sql, params = []) {
      try {
        // Converter parâmetros nomeados (:param) para ? se necessário
        let processedSql = sql;
        let processedParams = params;
        
        // Se params é um objeto (parâmetros nomeados), converter para array
        if (params && typeof params === 'object' && !Array.isArray(params)) {
          const namedParams = params;
          processedParams = [];
          
          // Substituir :param por ? e construir array de parâmetros
          processedSql = sql.replace(/:(\w+)/g, (match, paramName) => {
            processedParams.push(namedParams[paramName]);
            return '?';
          });
        }
        
        const [rows, fields] = await originalExecute(processedSql, processedParams);
        
        // Retornar no formato similar ao Oracle para compatibilidade
        return {
          rows: rows,
          fields: fields,
          rowsAffected: rows.affectedRows || rows.length || 0
        };
      } catch (error) {
        console.error('Erro na execução da query:', error);
        throw error;
      }
    };
    
    // Adicionar método close personalizado
    connection.close = function() {
      return connection.release();
    };
    
    return connection;
  } catch (error) {
    console.error('Erro ao obter conexão MySQL:', error);
    throw error;
  }
}

// Função para fechar o pool
async function closePool() {
  try {
    if (pool) {
      await pool.end();
      console.log('Pool de conexões MySQL fechado');
    }
  } catch (error) {
    console.error('Erro ao fechar pool MySQL:', error);
    throw error;
  }
}

// Função para executar queries simples sem gerenciar conexão
async function executeQuery(sql, params = []) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(sql, params);
    return result;
  } finally {
    await connection.close();
  }
}

// Tratamento de encerramento da aplicação
process.on('SIGINT', async () => {
  console.log('Encerrando aplicação...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Encerrando aplicação...');
  await closePool();
  process.exit(0);
});

// Inicializar pool na importação do módulo
initializePool().catch(console.error);

module.exports = {
  getConnection,
  executeQuery,
  closePool,
  // Exportar constantes para compatibilidade (MySQL não precisa, mas mantém compatibilidade)
  mysql: {
    OUT_FORMAT_OBJECT: 'object' // Placeholder para compatibilidade
  }
};