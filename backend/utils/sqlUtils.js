
/**
 * Função utilitária para extrair as linhas de dados do resultado de uma consulta SQL.
 * Lida com diferentes formatos de retorno de drivers (ex: [rows, fields] ou { rows: [...] }).
 * @param {any} result - O resultado bruto retornado pelo driver do banco de dados (ex: connection.execute).
 * @returns {Array} Um array contendo as linhas de dados da consulta. Retorna um array vazio se não conseguir extrair.
 */
function extractRows(result) {
    if (Array.isArray(result)) {
      // Caso comum para mysql2/promise: result é [rows, fields]
      if (Array.isArray(result[0])) {
        return result[0];
      }
      // Caso onde o driver já retorna apenas as rows como um array direto
      return result;
    }
    // Caso para drivers que retornam um objeto com uma propriedade 'rows' (ex: pg)
    if (result && Array.isArray(result.rows)) {
      return result.rows;
    }
    // Fallback para outros formatos ou se for um objeto onde o primeiro item é um array
    if (result && typeof result === 'object' && Array.isArray(result[0])) {
      return result[0];
    }
    // Se nada coube, retorna um array vazio para segurança
    return [];
  }
  
  // Exporta a função para que outros módulos possam importá-la
  module.exports = {
    extractRows,
  };