const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');

/**
 * Rota: GET /coordenador/projetos/:semestre
 * Lista os projetos do semestre com nomes dos membros
 */
router.get('/projetos/:semestre', async (req, res) => {
  const semestreEscolhido = Number(req.params.semestre);
  if (isNaN(semestreEscolhido)) {
    return res.status(400).json({ success: false, message: 'ID de semestre inválido.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const sqlListarProjetos = `
      SELECT
        p.id AS projeto_id,
        p.titulo AS titulo_projeto,
        p.status AS status_projeto,
        GROUP_CONCAT(u.nome ORDER BY u.nome SEPARATOR ', ') AS nomes_membros
      FROM Projetos p
      JOIN Grupos g ON p.grupo_id = g.id
      JOIN Usuario_Grupo ug ON g.id = ug.grupo_id
      JOIN Usuarios u ON ug.usuario_id = u.id
      WHERE p.semestre_id = ?
      GROUP BY p.id, p.titulo, p.status
      ORDER BY 
        CASE WHEN p.status = 'Concluído' THEN 2 ELSE 1 END
    `;

    const [rows] = await connection.execute(sqlListarProjetos, [semestreEscolhido]);
    res.json({ success: true, projetos: rows });

  } catch (err) {
    console.error('Erro ao buscar projetos do semestre:', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar projetos.' });
  } finally {
    if (connection) await connection.end();
  }
});

/**
 * Rota: GET /coordenador/projetos/:projetoId/atividades
 * Lista atividades avaliadas de um projeto específico
 */
router.get('/projetos/:projetoId/atividades', async (req, res) => {
  const projetoId = Number(req.params.projetoId);
  if (isNaN(projetoId)) {
    return res.status(400).json({ success: false, message: 'ID de projeto inválido.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // 1) Buscar grupo_id do projeto
    const [grupoRows] = await connection.execute(
      `SELECT grupo_id FROM Projetos WHERE id = ?`,
      [projetoId]
    );

    if (grupoRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Projeto não encontrado.' });
    }

    const grupoIdDoProjeto = grupoRows[0].grupo_id;

    // 2) Buscar atividades avaliadas desse grupo
    const sqlAtividadesAvaliadas = `
      SELECT
        a.id AS atividade_id,
        a.titulo AS titulo_atividade,
        av.nota AS nota_avaliacao,
        av.comentario AS comentario_avaliacao,
        av.data_avaliacao AS data_avaliacao,
        u.nome AS nome_professor
      FROM Atividades a
      JOIN Entregas e ON a.id = e.atividade_id
      JOIN Avaliacoes av ON e.id = av.entrega_id
      JOIN Usuarios u ON av.professor_id = u.id
      WHERE a.grupo_id = ?
      ORDER BY av.data_avaliacao DESC
    `;

    const [atividades] = await connection.execute(sqlAtividadesAvaliadas, [grupoIdDoProjeto]);
    return res.json({ success: true, atividades });

  } catch (err) {
    console.error('Erro ao buscar atividades avaliadas do projeto:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar atividades.' });
  } finally {
    if (connection) await connection.end();
  }
});

module.exports = router;
