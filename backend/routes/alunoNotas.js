const express = require('express');
const router = express.Router();
const { getConnection, oracledb } = require('../connectOracle.js');
oracledb.fetchAsString = [ oracledb.CLOB ];

// GET - Listar notas recebidas pelo aluno
router.get('/api/aluno/notas', async (req, res) => {
  const alunoId = parseInt(req.query.aluno_id, 10);
  const connection = await getConnection();

  try {
    const querySQL = `
  SELECT 
    av.id,
    a.titulo AS atividade,
    av.nota,
    av.comentario,
    TO_CHAR(av.data_avaliacao, 'YYYY-MM-DD') AS data_avaliacao,
    r.status AS status_reconsideracao
  FROM Avaliacoes av
  JOIN Entregas e ON av.entrega_id = e.id
  JOIN Atividades a ON e.atividade_id = a.id
  JOIN Usuario_Grupo ug ON ug.grupo_id = e.grupo_id
  LEFT JOIN Reconsideracoes r ON r.avaliacao_id = av.id AND r.aluno_id = :alunoId
  WHERE ug.usuario_id = :alunoId
  ORDER BY av.data_avaliacao DESC
`;

const result = await connection.execute(querySQL, { alunoId }, {
  outFormat: oracledb.OUT_FORMAT_OBJECT
});


    const hoje = new Date();
    const avaliacoes = result.rows.map(row => {
    const dataAval = new Date(row.DATA_AVALIACAO); // já é string, por causa do TO_CHAR
    const diffDias = (hoje - dataAval) / (1000 * 60 * 60 * 24);

        return {
        id: row.ID,
        atividade: row.ATIVIDADE,
        nota: row.NOTA !== null ? parseFloat(row.NOTA) : null,
        comentario: row.COMENTARIO ? String(row.COMENTARIO) : '',
        data_avaliacao: row.DATA_AVALIACAO, // já como string
        dentro_prazo: diffDias <= 7,
        status_reconsideracao: row.STATUS_RECONSIDERACAO || null
        };
    });


    res.json({ success: true, avaliacoes });
  } catch (error) {
    console.error('Erro ao buscar notas:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar notas.' });
  } finally {
    if (connection) await connection.close();
  }
});

// POST - Solicitação de reconsideração
router.post('/api/aluno/reconsiderar', async (req, res) => {
    const { avaliacao_id, aluno_id, comentario } = req.body;
  
    if (!avaliacao_id || !aluno_id || !comentario) {
      return res.status(400).json({ success: false, message: 'Dados obrigatórios ausentes.' });
    }
  
    const connection = await getConnection();
  
    try {
      // Verifica se já existe um pedido pendente para essa avaliação
      const existe = await connection.execute(
        `SELECT COUNT(*) AS total FROM Reconsideracoes
         WHERE avaliacao_id = :avaliacao_id AND aluno_id = :aluno_id AND status = 'Pendente'`,
        [avaliacao_id, aluno_id],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
  
      if (existe.rows[0].TOTAL > 0) {
        return res.status(409).json({
          success: false,
          message: 'Já existe um pedido de reconsideração pendente para essa avaliação.'
        });
      }
  
      await connection.execute(
        `INSERT INTO Reconsideracoes (avaliacao_id, aluno_id, motivo)
         VALUES (:avaliacao_id, :aluno_id, :motivo)`,
        {
          avaliacao_id,
          aluno_id,
          motivo: comentario
        },
        { autoCommit: true }
      );
  
      res.json({ success: true, message: 'Pedido de reconsideração enviado com sucesso!' });
    } catch (error) {
      console.error('Erro ao salvar pedido de reconsideração:', error);
      res.status(500).json({ success: false, message: 'Erro no servidor.' });
    } finally {
      if (connection) await connection.close();
    }
  });
  

module.exports = router;
