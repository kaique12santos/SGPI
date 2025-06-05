const express = require('express');
const router = express.Router();
const { getConnection, oracledb } = require('../connectOracle.js');

/**
 * Rota: GET /coordenador/projetos/:semestre
 * Descrição: Retorna a lista de projetos do semestre informado, com nomes dos membros.
 */
router.get('/projetos/:semestre', async (req, res) => {
  const semestreEscolhido = String(req.params.semestre);

  let connection;
  try {
    connection = await getConnection();

    const sqlListarProjetos = `
      SELECT
        p.id                            AS projeto_id,
        p.titulo                        AS titulo_projeto,
        p.status                        AS status_projeto,
        p.data_atualizacao              AS data_encerramento,
        LISTAGG(u.nome, ', ') WITHIN GROUP (ORDER BY u.nome) AS nomes_membros
      FROM
        Projetos p
        JOIN Grupos g ON p.grupo_id = g.id
        JOIN Usuario_Grupo ug ON g.id = ug.grupo_id
        JOIN Usuarios u ON ug.usuario_id = u.id
      WHERE
        p.semestre = :semestre_param
      GROUP BY
        p.id,
        p.titulo,
        p.status,
        p.data_atualizacao
      ORDER BY
        CASE WHEN p.status = 'Concluído' THEN 2 ELSE 1 END,
        p.data_atualizacao DESC
    `;

    const result = await connection.execute(
      sqlListarProjetos,
      { semestre_param: semestreEscolhido },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // Se vazio, retorna lista vazia
    res.json({ success: true, projetos: result.rows });

  } catch (err) {
    console.error('Erro ao buscar projetos do semestre:', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar projetos.' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (_) { /**/ }
    }
  }
});

/**
 * Rota: GET /coordenador/projetos/:projetoId/atividades
 * Descrição: Retorna as atividades avaliadas de um projeto específico.
 */
router.get('/projetos/:projetoId/atividades', async (req, res) => {
  const projetoId = Number(req.params.projetoId);
  if (isNaN(projetoId)) {
    return res.status(400).json({ success: false, message: 'ID de projeto inválido.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // 1) Primeiro, recuperamos o grupo_id do projeto
    const sqlBuscaGrupo = `
      SELECT grupo_id
      FROM Projetos
      WHERE id = :projId
    `;
    const resultGrupo = await connection.execute(
      sqlBuscaGrupo,
      { projId: projetoId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (resultGrupo.rows.length === 0) {
      // Se não encontrou projeto com esse ID
      return res.status(404).json({ success: false, message: 'Projeto não encontrado.' });
    }

    const grupoIdDoProjeto = resultGrupo.rows[0].GRUPO_ID;

    // 2) Agora buscamos as atividades avaliadas relacionadas a esse grupo_id
    const sqlAtividadesAvaliadas = `
      SELECT
        a.id                   AS atividade_id,
        a.titulo               AS titulo_atividade,
        av.nota                AS nota_avaliacao,
        av.comentario          AS comentario_avaliacao,
        av.data_avaliacao      AS data_avaliacao,
        u.nome                 AS nome_professor
      FROM
        Atividades a
        JOIN Entregas e      ON a.id = e.atividade_id
        JOIN Avaliacoes av   ON e.id = av.entrega_id
        JOIN Usuarios u      ON av.professor_id = u.id
      WHERE
        a.grupo_id = :grupoId
      ORDER BY
        av.data_avaliacao DESC
    `;

    const result2 = await connection.execute(
      sqlAtividadesAvaliadas,
      { grupoId: grupoIdDoProjeto },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return res.json({ success: true, atividades: result2.rows });
  } catch (err) {
    console.error('Erro ao buscar atividades avaliadas do projeto:', err.stack || err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar atividades.' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (_) { /**/ }
    }
  }
});

module.exports = router;
