const express = require('express');
const router = express.Router();
const { getConnection, oracledb } = require('../connectOracle.js');
const path = require('path');
const frontendPath = path.join(__dirname, '..', '..', 'frontend');


function lobToString(lob) {
  return new Promise((resolve, reject) => {
    if (lob === null) return resolve(null);
    let content = '';
    lob.setEncoding('utf8');
    lob.on('data', chunk => content += chunk);
    lob.on('end', () => resolve(content));
    lob.on('error', err => reject(err));
  });
}

router.get('/notificacoes', async (req, res) => {
  const connection = await getConnection();

  try {
    const usuarioId = parseInt(req.query.usuario_id, 10);
    if (isNaN(usuarioId)) return res.status(400).json({ message: 'ID de usuário inválido.' });

    const contadorQuery = await connection.execute(
      `SELECT COUNT(*) as total FROM Notificacoes 
       WHERE usuario_id = :usuarioId AND lida = 0`,
      [usuarioId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    const totalNaoLidas = contadorQuery.rows[0].TOTAL;

    const result = await connection.execute(
      `SELECT id, titulo, mensagem, tipo, lida, 
              TO_CHAR(data_criacao, 'YYYY-MM-DD"T"HH24:MI:SS') as data_criacao,
              TO_CHAR(data_leitura, 'YYYY-MM-DD"T"HH24:MI:SS') as data_leitura
       FROM Notificacoes
       WHERE usuario_id = :usuarioId
       ORDER BY data_criacao DESC
       FETCH FIRST 20 ROWS ONLY`,
      [usuarioId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const notificacoes = await Promise.all(result.rows.map(async row => ({
      id: row.ID,
      titulo: row.TITULO,
      mensagem: await lobToString(row.MENSAGEM),
      tipo: row.TIPO,
      lida: row.LIDA === 1,
      data_criacao: row.DATA_CRIACAO,
      data_leitura: row.DATA_LEITURA
    })));

    res.json({
      total_nao_lidas: totalNaoLidas,
      notificacoes: notificacoes
    });
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ message: 'Erro ao buscar notificações', error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

router.put('/notificacoes/:notificacaoId/lida', async (req, res) => {
  const connection = await getConnection();

  try {
    const notificacaoId = parseInt(req.params.notificacaoId, 10);
    const usuarioId = parseInt(req.body.usuario_id, 10);

    if (isNaN(notificacaoId) || isNaN(usuarioId)) {
      return res.status(400).json({ message: 'IDs inválidos.' });
    }

    const verificacao = await connection.execute(
      `SELECT COUNT(*) as count FROM Notificacoes 
       WHERE id = :notificacaoId AND usuario_id = :usuarioId`,
      [notificacaoId, usuarioId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (verificacao.rows[0].COUNT === 0) {
      return res.status(403).json({ message: 'Notificação não encontrada ou sem permissão.' });
    }

    const result = await connection.execute(
      `UPDATE Notificacoes
       SET lida = 1, 
           data_leitura = CURRENT_TIMESTAMP
       WHERE id = :notificacaoId AND usuario_id = :usuarioId`,
      [notificacaoId, usuarioId],
      { autoCommit: true }
    );

    res.json({
      success: result.rowsAffected > 0,
      message: result.rowsAffected > 0
        ? 'Notificação marcada como lida.'
        : 'Não foi possível atualizar a notificação.'
    });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ message: 'Erro no servidor.', error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

router.put('/notificacoes/todas/lidas', async (req, res) => {
  const connection = await getConnection();

  try {
    const usuarioId = parseInt(req.body.usuario_id, 10);
    if (isNaN(usuarioId)) return res.status(400).json({ message: 'ID de usuário inválido.' });

    const result = await connection.execute(
      `UPDATE Notificacoes
       SET lida = 1, 
           data_leitura = CURRENT_TIMESTAMP
       WHERE usuario_id = :usuarioId AND lida = 0`,
      [usuarioId],
      { autoCommit: true }
    );

    res.json({
      success: true,
      message: `${result.rowsAffected} notificações marcadas como lidas.`
    });
  } catch (error) {
    console.error('Erro ao marcar notificações como lidas:', error);
    res.status(500).json({ message: 'Erro no servidor.', error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;