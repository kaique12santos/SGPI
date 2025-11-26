const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');
const { extractRows } = require('../utils/sqlUtils.js');

// ------------------------------
// GET - Listar todos os usuários
// ------------------------------
router.get('/usuarios', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT 
          id, 
          nome, 
          email, 
          tipo, 
          ativo, 
          DATE_FORMAT(ultimo_acesso, '%d/%m/%Y %H:%i') AS ultimo_acesso
       FROM Usuarios
       ORDER BY id`
    );
    
    // Mantendo sua lógica de leitura
    const usuarios = extractRows(result); 
    res.json(usuarios);
  } catch (error) {
    console.error('❌ Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  } finally {
    if (connection) await connection.release();
  }
});

// ============================================================================
// FUNÇÃO AUXILIAR PARA LER AFFECTED ROWS
// (Resolve o problema da estrutura variável do retorno do banco)
// ============================================================================
function getAffectedRows(result) {
  if (!result) return 0;

  // Caso 1: Array padrão [ResultSetHeader, Fields]
  if (Array.isArray(result) && result[0] && result[0].affectedRows !== undefined) {
    return result[0].affectedRows;
  }
  
  // Caso 2: Objeto encapsulado { rows: ResultSetHeader } (O SEU CASO ATUAL)
  if (result.rows && result.rows.affectedRows !== undefined) {
    return result.rows.affectedRows;
  }

  // Caso 3: Objeto direto { affectedRows: 1 }
  if (result.affectedRows !== undefined) {
    return result.affectedRows;
  }

  // Caso 4: Propriedade customizada (apareceu no seu log como rowsAffected)
  if (result.rowsAffected !== undefined) {
    return result.rowsAffected;
  }

  return 0;
}

// ------------------------------------
// PUT - Atualizar tipo de usuário
// ------------------------------------
router.put('/usuarios/:id/tipo', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { tipo } = req.body;

  if (!tipo) {
    return res.status(400).json({ success: false, message: 'Campo tipo é obrigatório.' });
  }

  let connection;
  try {
    connection = await getConnection();
    
    const result = await connection.execute(
      `UPDATE Usuarios SET tipo = ? WHERE id = ?`,
      [tipo, userId]
    );

    console.log('🔍 Debug Tipo - Resultado Bruto:', result); // Log para conferência
    const affected = getAffectedRows(result);

    if (affected > 0) {
      res.json({ success: true, message: 'Tipo atualizado com sucesso.' });
    } else {
      res.status(404).json({ success: false, message: 'Usuário não encontrado ou sem alterações.' });
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar tipo:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar tipo.' });
  } finally {
    if (connection) await connection.release();
  }
});

// ------------------------------------
// PUT - Alterar status (ativo/inativo)
// ------------------------------------
router.put('/usuarios/:id/status', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { ativo } = req.body;

  if (typeof ativo !== 'number') {
    return res.status(400).json({ success: false, message: 'Campo ativo deve ser 0 ou 1.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `UPDATE Usuarios SET ativo = ? WHERE id = ?`,
      [ativo, userId]
    );

    console.log('🔍 Debug Status - Resultado Bruto:', result); // Log para conferência
    const affected = getAffectedRows(result);
    console.log('✅ Status - Linhas Afetadas calculadas:', affected);

    if (affected > 0) {
      res.json({ success: true, message: 'Status atualizado com sucesso.' });
    } else {
      // Importante: Se você enviar o mesmo status que já está no banco, 
      // o MySQL pode retornar affectedRows = 0 (pois nada mudou).
      // Nesse caso, tecnicamente não é um erro 404, mas vamos manter assim por enquanto.
      res.status(404).json({ success: false, message: 'Usuário não encontrado ou status já era esse.' });
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar status.' });
  } finally {
    if (connection) await connection.release();
  }
});

module.exports = router;