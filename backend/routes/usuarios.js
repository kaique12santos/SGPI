const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');
const {extractRows} = require ('../utils/sqlUtils.js')

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
    console.log(result)
    const usuarios = extractRows(result); 
    res.json(usuarios)
  } catch (error) {
    console.error('❌ Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  } finally {
    if (connection) await connection.end();
  }
});

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
    // --- MUDANÇA AQUI: Desestruture o resultado para pegar o objeto de info da query ---
    const resultInfo = await connection.execute( // Note o `[resultInfo]`
      `UPDATE Usuarios SET tipo = ? WHERE id = ?`,
      [tipo, userId]
    );

    // Agora 'resultInfo' é o objeto que contém affectedRows
    if (resultInfo.affectedRows > 0) {
      res.json({ success: true, message: 'Tipo atualizado com sucesso.' });
    } else {
      res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar tipo:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar tipo.' });
  } finally {
    if (connection) await connection.end();
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
    // --- MUDANÇA AQUI: Já estava correto! Apenas nomeei a variável para clareza ---
    const resultInfo = await connection.execute( // Note o `[resultInfo]`
      `UPDATE Usuarios SET ativo = ? WHERE id = ?`,
      [ativo, userId]
    );

    // Agora 'resultInfo' é o objeto que contém affectedRows
    if (resultInfo.affectedRows > 0) {
      res.json({ success: true, message: 'Status atualizado com sucesso.' });
    } else {
      res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar status.' });
  } finally {
    if (connection) await connection.end();
  }
});

module.exports = router;