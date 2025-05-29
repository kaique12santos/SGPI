const express = require('express');
const router = express.Router();
const { getConnection, oracledb } = require('../connectOracle.js');

// GET - listar pedidos pendentes
router.get('/api/professor/reconsideracoes', async (req, res) => {
  const professorId = parseInt(req.query.professor_id, 10);
  const connection = await getConnection();

  try {
    const result = await connection.execute(
      `SELECT
         r.id AS id,
         r.motivo AS motivo,
         r.avaliacao_id AS avaliacao_id,
         TO_CHAR(r.data_solicitacao, 'YYYY-MM-DD"T"HH24:MI:SS') AS data_solicitacao,
         a.titulo AS atividade,
         av.nota AS nota,
         av.comentario AS comentario,
         u.nome AS aluno_nome
       FROM Reconsideracoes r
       JOIN Avaliacoes av ON r.avaliacao_id = av.id
       JOIN Entregas e ON av.entrega_id = e.id
       JOIN Atividades a ON e.atividade_id = a.id
       JOIN Usuarios u ON r.aluno_id = u.id
       WHERE r.status = 'Pendente' AND av.professor_id = :professorId`,
      { professorId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({ success: true, reconsideracoes: result.rows });
  } catch (err) {
    
    console.error('Erro ao buscar reconsiderações:', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar reconsiderações.' });
  } finally {
    if (connection) await connection.close();
  }
});

// POST - Aprovar
router.post('/api/professor/reconsideracoes/:id/aprovar', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { resposta, novaNota } = req.body;
  const connection = await getConnection();

  try {
    await connection.execute(
      `UPDATE Reconsideracoes
       SET status = 'Aprovado', resposta = :resposta, data_resposta = CURRENT_TIMESTAMP
       WHERE id = :id`,
      { resposta, id },
      { autoCommit: false }
    );

    let notaConvertida = null;
    if (novaNota !== undefined && novaNota !== null && novaNota !== '') {
      const parsed = Number(novaNota);
      if (!isNaN(parsed)) {
        notaConvertida = parsed;
      } else {
        return res.status(400).json({ success: false, message: 'Nota inválida.' });
      }
    }

    if (notaConvertida !== null) {
      await connection.execute(
        `UPDATE Avaliacoes
         SET nota = :novaNota, data_avaliacao = CURRENT_TIMESTAMP
         WHERE id = (SELECT avaliacao_id FROM Reconsideracoes WHERE id = :id)`,
        { novaNota: notaConvertida, id },
        { autoCommit: false }
      );
    }

    await connection.commit();
    res.json({ success: true, message: 'Pedido aprovado com sucesso!' });
  } catch (err) {
    await connection.rollback();
    console.log("nota: "+novaNota+" resposta: "+resposta+" id: "+id)
    console.error('Erro ao aprovar reconsideração:', err);
    res.status(500).json({ success: false, message: 'Erro ao aprovar pedido.' });
  } finally {
    if (connection) await connection.close();
  }
});

// POST - Recusar
router.post('/api/professor/reconsideracoes/:id/recusar', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { resposta } = req.body;
  const connection = await getConnection();

  try {
    await connection.execute(
      `UPDATE Reconsideracoes
       SET status = 'Negado', resposta = :resposta, data_resposta = CURRENT_TIMESTAMP
       WHERE id = :id`,
      { resposta, id },
      { autoCommit: true }
    );

    res.json({ success: true, message: 'Pedido negado com sucesso.' });
  } catch (err) {
    console.error('Erro ao negar reconsideração:', err);
    res.status(500).json({ success: false, message: 'Erro ao negar pedido.' });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;

