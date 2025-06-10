const express = require('express');
const router = express.Router();
const { getConnection, oracledb } = require('../connectOracle.js');


router.get('/api/entregas/recebidas', async (req, res) => {
  const connection = await getConnection();

  try {
    const professorId = parseInt(req.query.professor_id, 10);
    console.log("Professor ID from localStorage:", professorId);

    if (isNaN(professorId)) {
      return res.status(400).json({ success: false, message: 'ID do professor inválido.' });
    }

    const result = await connection.execute(
      `SELECT 
      e.id AS entrega_id,
      u.nome AS aluno_nome,
      g.nome AS grupo_nome,
      a.titulo AS atividade_titulo,
      a.semestre AS atividade_semestre,
      e.caminho_arquivo,
      TO_CHAR(e.data_entrega, 'YYYY-MM-DD"T"HH24:MI:SS') AS data_entrega,
      TO_CHAR(a.prazo_entrega, 'YYYY-MM-DD"T"HH24:MI:SS') AS prazo_entrega
      FROM Entregas e
      JOIN Atividades a ON e.atividade_id = a.id
      JOIN Grupos g ON e.grupo_id = g.id
      JOIN Usuarios u ON e.aluno_id = u.id
      WHERE a.professor_id = :professorId
      AND e.id IN 
      (
        SELECT MIN(id)
        FROM Entregas
        WHERE id NOT IN (
          SELECT entrega_id FROM Avaliacoes
        )
        GROUP BY grupo_id, atividade_id
      )
      ORDER BY e.data_entrega DESC`,
      [professorId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const entregas = result.rows.map(row => ({
      entrega_id: row.ENTREGA_ID,
      aluno_nome: row.ALUNO_NOME,
      grupo_nome: row.GRUPO_NOME,
      atividade_titulo: row.ATIVIDADE_TITULO,
      atividade_semestre: row.ATIVIDADE_SEMESTRE,
      caminho_arquivo: row.CAMINHO_ARQUIVO,
      data_entrega: row.DATA_ENTREGA,
      prazo_entrega: row.PRAZO_ENTREGA
    }));

    res.json({ success: true, entregas });
  } catch (error) {
    console.error('Erro ao buscar entregas recebidas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar entregas recebidas.',
      error: error.message
    });
  } finally {
    if (connection) await connection.close();
  }
});

  

  module.exports = router;