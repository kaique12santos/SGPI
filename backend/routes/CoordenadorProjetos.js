const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');

/**
 * Rota: GET /coordenador/projetos/:semestre
 * Lista os projetos do semestre com nomes dos membros
 * * CORRIGIDO:
 * 1. Filtra pelo semestre acadêmico (1-6) via `Disciplinas.semestre_padrao` 
 * 2. Busca `DATA_ENCERRAMENTO` do `Historico_Status_Projeto` 
 * 3. Garante que os aliases (AS) estejam em MAIÚSCULAS para corresponder ao front-end
 */
router.get('/projetos/:semestre', async (req, res) => {
  const semestreEscolhido = Number(req.params.semestre);
  if (isNaN(semestreEscolhido)) {
    return res.status(400).json({ success: false, message: 'ID de semestre inválido.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // SQL CORRIGIDA
    const sqlListarProjetos = `
      SELECT
        p.id AS PROJETO_ID,
        p.titulo AS TITULO_PROJETO,
        p.status AS STATUS_PROJETO,
        GROUP_CONCAT(u.nome ORDER BY u.nome SEPARATOR ', ') AS NOMES_MEMBROS,
        h.data_alteracao AS DATA_ENCERRAMENTO
      FROM Projetos p
      JOIN Grupos g ON p.grupo_id = g.id
      JOIN Usuario_Grupo ug ON g.id = ug.grupo_id
      JOIN Usuarios u ON ug.usuario_id = u.id
      LEFT JOIN Disciplinas d ON p.disciplina_id = d.id
      LEFT JOIN Historico_Status_Projeto h
        ON p.id = h.projeto_id AND h.status_novo = 'Concluído'
      WHERE d.semestre_padrao = ? 
      GROUP BY p.id, p.titulo, p.status, h.data_alteracao
      ORDER BY 
        CASE WHEN p.status = 'Concluído' THEN 2 ELSE 1 END
    `;

    const result = await connection.execute(sqlListarProjetos, [semestreEscolhido]);
    // O front-end espera 'proj.PROJETO_ID', etc. (maiúsculas)
    // O MySQL com Node.js já retorna os aliases como definidos (MAIÚSCULAS)
    res.json({ success: true, projetos: result.rows });

  } catch (err) {
    console.error('Erro ao buscar projetos do semestre:', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar projetos.' });
  } finally {
    if (connection) await connection.release();
  }
});

/**
 * Rota: GET /coordenador/projetos/:projetoId/atividades
 *
 * *CORREÇÃO (FRONT-END):*
 * O front-end espera chaves em MAIÚSCULO (ex: TITULO_ATIVIDADE).
 * A consulta foi atualizada para usar Aliases (AS) em maiúsculo.
 */
router.get('/projetos/:projetoId/atividades', async (req, res) => {
  const projetoId = Number(req.params.projetoId);
  if (isNaN(projetoId)) {
    return res.status(400).json({ success: false, message: 'ID de projeto inválido.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // 1) Buscar o grupo_id do Projeto
    const resultProjeto = await connection.execute(
      `SELECT grupo_id FROM Projetos WHERE id = ?`,
      [projetoId]
    );

    if (resultProjeto.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Projeto não encontrado.' });
    }
    const grupo_id = resultProjeto.rows[0].grupo_id;
    if (!grupo_id) {
       return res.status(404).json({ success: false, message: 'Projeto não está vinculado a um grupo.' });
    }

    // 2) Execute a consulta validada com ALIASES EM MAIÚSCULO
    const sqlAtividades = `
      SELECT
        g.nome AS NOME_GRUPO,
        a.id AS ATIVIDADE_ID,
        a.titulo AS TITULO_ATIVIDADE,
        u_prof.nome AS NOME_PROFESSOR,
        e.id AS ENTREGA_ID,
        av.nota AS NOTA_AVALIACAO,
        av.comentario AS COMENTARIO_AVALIACAO,
        av.data_avaliacao AS DATA_AVALIACAO
      FROM Grupos g
      JOIN Disciplinas_Ofertas dof 
          ON g.disciplina_id = dof.disciplina_id AND g.semestre_id = dof.semestre_id
      JOIN Atividades a 
          ON a.oferta_id = dof.id
      LEFT JOIN Usuarios u_prof 
          ON a.professor_id = u_prof.id
      LEFT JOIN Entregas e 
          ON a.id = e.atividade_id AND e.grupo_id = g.id
      LEFT JOIN Avaliacoes av 
          ON e.id = av.entrega_id
      WHERE 
          g.id = ?
      ORDER BY 
          a.titulo;
    `;

    const resultAtividades = await connection.execute(sqlAtividades, [grupo_id]);
    
    return res.json({ success: true, atividades: resultAtividades.rows });

  } catch (err) {
    console.error('Erro ao buscar atividades avaliadas do projeto:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar atividades.' });
  } finally {
    if (connection) {
      try { await connection.release(); } catch (_) { /**/ }
    }
  }
});
module.exports = router;
