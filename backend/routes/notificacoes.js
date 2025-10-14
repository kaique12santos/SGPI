const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');

// Listar notificações do usuário
router.get('/notificacoes', async (req, res) => {
  const connection = await getConnection();

  try {
    const usuarioId = parseInt(req.query.usuario_id, 10);
    if (isNaN(usuarioId)) {
      return res.status(400).json({ message: 'ID de usuário inválido.' });
    }

    // Contador de notificações não lidas
    const resultCount = await connection.execute(
      `SELECT COUNT(*) as total 
       FROM Notificacoes 
       WHERE usuario_id = ? AND lida = 0`,
      [usuarioId]
    );
    const totalNaoLidas = resultCount.rows[0]?.total ?? 0;

    // Listar últimas 20 notificações
    const resultRows = await connection.execute(
      `SELECT id, titulo, mensagem, lida, data_criacao, data_leitura
       FROM Notificacoes
       WHERE usuario_id = ?
       ORDER BY data_criacao DESC
       LIMIT 20`,
      [usuarioId]
    );

    const notificacoes = resultRows.rows.map(row => ({
      id: row.id,
      titulo: row.titulo,
      mensagem: row.mensagem,
      tipo: row.tipo,
      lida: row.lida === 1,
      data_criacao: row.data_criacao,
      data_leitura: row.data_leitura
    }));

    res.json({
      total_nao_lidas: totalNaoLidas,
      notificacoes
    });
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ message: 'Erro ao buscar notificações', error: error.message });
  } finally {
    if (connection) await connection.release();
  }
});

// Marcar uma notificação como lida
router.put('/notificacoes/:notificacaoId/lida', async (req, res) => {
  const connection = await getConnection();

  try {
    const notificacaoId = parseInt(req.params.notificacaoId, 10);
    const usuarioId = parseInt(req.body.usuario_id, 10);

    if (isNaN(notificacaoId) || isNaN(usuarioId)) {
      return res.status(400).json({ message: 'IDs inválidos.' });
    }

    const verificacaoResult = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM Notificacoes 
       WHERE id = ? AND usuario_id = ?`,
      [notificacaoId, usuarioId]
    );

    if (verificacaoResult.rows[0].count === 0) {
      return res.status(403).json({ message: 'Notificação não encontrada ou sem permissão.' });
    }

    const updateResult = await connection.execute(
      `UPDATE Notificacoes
       SET lida = 1, data_leitura = CURRENT_TIMESTAMP
       WHERE id = ? AND usuario_id = ?`,
      [notificacaoId, usuarioId]
    );

    res.json({
      success: updateResult.rowsAffected > 0,
      message: updateResult.rowsAffected > 0
        ? 'Notificação marcada como lida.'
        : 'Não foi possível atualizar a notificação.'
    });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ message: 'Erro no servidor.', error: error.message });
  } finally {
    if (connection) await connection.release();
  }
});

// Marcar todas as notificações como lidas
router.put('/notificacoes/todas/lidas', async (req, res) => {
  const connection = await getConnection();

  try {
    const usuarioId = parseInt(req.body.usuario_id, 10);
    if (isNaN(usuarioId)) {
      return res.status(400).json({ message: 'ID de usuário inválido.' });
    }

    const updateResult = await connection.execute(
      `UPDATE Notificacoes
       SET lida = 1, data_leitura = CURRENT_TIMESTAMP
       WHERE usuario_id = ? AND lida = 0`,
      [usuarioId]
    );

    res.json({
      success: true,
      message: `${updateResult.rowsAffected} notificações marcadas como lidas.`
    });
  } catch (error) {
    console.error('Erro ao marcar notificações como lidas:', error);
    res.status(500).json({ message: 'Erro no servidor.', error: error.message });
  } finally {
    if (connection) await connection.release();
  }
});

// Criar notificação manualmente usando procedure
router.post('/notificacoes', async (req, res) => {
  const connection = await getConnection();

  try {
    const { usuario_id, titulo, mensagem, tipo } = req.body;

    if (!usuario_id || !titulo || !mensagem || !tipo) {
      return res.status(400).json({ 
        success: false,
        message: 'Campos obrigatórios: usuario_id, titulo, mensagem, tipo'
      });
    }

    // Chama a procedure enviar_notificacao
    await connection.execute(
      `CALL enviar_notificacao(?, ?, ?, ?)`,
      [usuario_id, titulo, mensagem, tipo]
    );

    res.status(201).json({
      success: true,
      message: 'Notificação criada e enviada com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro ao criar notificação.',
      error: error.message
    });
  } finally {
    if (connection) await connection.release();
  }
});

module.exports = router;