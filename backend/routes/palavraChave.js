const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');

// Criar chave
router.post('/chaves', async (req, res) => {
    const { chave, tipo, geradoPor, limiteUso = 10 } = req.body;
  
    if (!chave || !tipo || !geradoPor) {
      return res.status(400).json({ sucesso: false, mensagem: 'Chave, tipo e geradoPor são obrigatórios.' });
    }
  
    try {
      const connection = await getConnection();
      const sql = `
        INSERT INTO PalavrasChave (chave, tipo_usuario, gerado_por, limite_uso, usos)
        VALUES (?, ?, ?, ?, 0)
      `;
      await connection.execute(sql, [
        chave,
        tipo === 'professor' ? 'Professor' : 'Professor_Orientador',
        geradoPor,
        limiteUso
      ]);
      connection.release();
  
      res.json({ sucesso: true, mensagem: 'Chave salva com sucesso!' });
    } catch (error) {
      console.error('Erro ao salvar chave:', error);
      res.status(500).json({ sucesso: false, mensagem: 'Erro ao salvar chave' });
    }
  });

// Listar histórico de chaves
router.get('/chaves', async (req, res) => {
    try {
      const connection = await getConnection();
      const sql = `
        SELECT chave_id, chave, tipo_usuario, usos, limite_uso, gerado_por, usuario_destino_id, data_geracao
        FROM PalavrasChave
        ORDER BY data_geracao DESC
      `;
      const result = await connection.execute(sql);
      connection.release();
  
      res.json({ sucesso: true, dados: result.rows });
    } catch (error) {
      console.error('Erro ao buscar chaves:', error);
      res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar chaves' });
    }
  });
// Marcar chave como usada
router.put('/chaves/:chaveId/usar', async (req, res) => {
    const { chaveId } = req.params;
    const { usuarioDestinoId } = req.body; // professor que usou a chave
  
    if (!usuarioDestinoId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Usuário destino obrigatório.' });
    }
  
    try {
      const connection = await getConnection();
  
      const sql = `
        UPDATE PalavrasChave
        SET usos = usos + 1, usuario_destino_id = ?
        WHERE chave_id = ? AND usos < limite_uso
      `;
      const result = await connection.execute(sql, [usuarioDestinoId, chaveId]);
      connection.release();
  
      if (result.rowsAffected > 0) {
        res.json({ sucesso: true, mensagem: 'Chave usada com sucesso!' });
      } else {
        res.status(400).json({ sucesso: false, mensagem: 'Chave inválida ou sem usos restantes.' });
      }
    } catch (error) {
      console.error('Erro ao usar chave:', error);
      res.status(500).json({ sucesso: false, mensagem: 'Erro ao usar chave' });
    }
  });
module.exports = router;