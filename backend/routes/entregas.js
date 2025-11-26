const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');

router.get('/api/entregas/recebidas', async (req, res) => {
  let connection;
  try {
    const professorId = parseInt(req.query.professor_id, 10);
    console.log("Professor ID recebido:", professorId);

    if (isNaN(professorId)) {
      return res.status(400).json({ success: false, message: 'ID do professor inválido.' });
    }

    connection = await getConnection();

    // const sql = `
    //   SELECT 
    //     e.id AS entrega_id,
    //     u.nome AS aluno_nome,
    //     g.nome AS grupo_nome,
    //     a.titulo AS atividade_titulo,
    //     a.semestre_id AS atividade_semestre,
    //     e.caminho_arquivo,
    //     DATE_FORMAT(e.data_entrega, '%Y-%m-%dT%H:%i:%s') AS data_entrega,
    //     DATE_FORMAT(a.prazo_entrega, '%Y-%m-%dT%H:%i:%s') AS prazo_entrega
    //   FROM Entregas e
    //   JOIN Atividades a ON e.atividade_id = a.id
    //   JOIN Grupos g ON e.grupo_id = g.id
    //   JOIN Usuarios u ON e.aluno_id = u.id
    //   WHERE a.professor_id = ?
    //   AND e.id IN (
    //     SELECT MIN(id)
    //     FROM Entregas
    //     WHERE id NOT IN (
    //       SELECT entrega_id FROM Avaliacoes
    //     )
    //     GROUP BY grupo_id, atividade_id
    //   )
    //   ORDER BY e.data_entrega DESC
    // `;
    const sql = `
      SELECT 
        e.id AS entrega_id,
        u.nome AS aluno_nome,
        g.nome AS grupo_nome,
        a.titulo AS atividade_titulo,
        s.periodo,
        s.ano,
        e.caminho_arquivo,
        DATE_FORMAT(e.data_entrega, '%Y-%m-%dT%H:%i:%s') AS data_entrega,
        DATE_FORMAT(a.prazo_entrega, '%Y-%m-%dT%H:%i:%s') AS prazo_entrega
      FROM Entregas e
      JOIN Atividades a ON e.atividade_id = a.id
      JOIN Disciplinas_Ofertas do_tbl ON a.oferta_id = do_tbl.id -- JOIN NOVO
      JOIN Semestres s ON do_tbl.semestre_id = s.id              -- JOIN NOVO
      JOIN Grupos g ON e.grupo_id = g.id
      JOIN Usuarios u ON e.aluno_responsavel_id = u.id           -- COLUNA CORRIGIDA
      WHERE a.professor_id = ?
      AND s.ativo = 1                                            -- FILTRO NOVO
      AND e.id IN (
        SELECT MIN(id)
        FROM Entregas
        WHERE id NOT IN (
          SELECT entrega_id FROM Avaliacoes
        )
        GROUP BY grupo_id, atividade_id
      )
      ORDER BY e.data_entrega DESC
    `;

    const [rows] = await connection.execute(sql, [professorId]);

    res.json({ success: true, entregas: rows });

  } catch (error) {
    console.error('Erro ao buscar entregas recebidas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar entregas recebidas.',
      error: error.message
    });
  } finally {
    if (connection) {
      try { 
        await connection.close(); 
      } catch (closeErr) { 
        console.warn('Aviso: Erro ao fechar conexão:', closeErr.message);
      }
    }
  }
});

module.exports = router;
