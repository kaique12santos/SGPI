const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');

/**
 * GET /aluno/notas/:semestreId
 * Busca todas as notas do aluno no semestre especificado
 */
router.get('/notas/:semestreId', async (req, res) => {
  const semestreId = parseInt(req.params.semestreId);
  const alunoId = req.user?.id;

  if (!alunoId || isNaN(semestreId)) {
    return res.status(400).json({ success: false, message: 'Parâmetros inválidos.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const sqlNotas = `
      SELECT 
        av.id AS avaliacao_id,
        av.nota AS avaliacao_nota,
        av.comentario AS avaliacao_comentario,
        av.data_avaliacao AS avaliacao_data,
        a.id AS atividade_id,
        a.titulo AS atividade_titulo,
        a.prazo_entrega AS atividade_prazo,
        d.nome AS disciplina_nome,
        d.codigo AS disciplina_codigo,
        u_prof.nome AS professor_nome,
        g.nome AS grupo_nome,
        e.data_entrega AS entrega_data,
        e.status AS entrega_status,
        s.periodo AS semestre_periodo,
        s.ano AS semestre_ano
      FROM Avaliacoes av
      INNER JOIN Entregas e ON av.entrega_id = e.id
      INNER JOIN Atividades a ON e.atividade_id = a.id
      INNER JOIN Grupos g ON e.grupo_id = g.id
      INNER JOIN Usuario_Grupo ug ON g.id = ug.grupo_id
      INNER JOIN Semestres s ON a.semestre_id = s.id
      LEFT JOIN Disciplinas d ON a.disciplina_id = d.id
      LEFT JOIN Usuarios u_prof ON av.professor_id = u_prof.id
      WHERE ug.usuario_id = ? AND a.semestre_id = ?
      ORDER BY av.data_avaliacao DESC, a.titulo ASC
    `;
    //select funcional

    const [rows] = await connection.execute(sqlNotas, [alunoId, semestreId]);
    return res.json({ success: true, notas: rows });

  } catch (err) {
    console.error('Erro ao buscar notas do aluno:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) await connection.release();
  }
});

/**
 * GET /aluno/notas/estatisticas/:semestreId
 * Busca estatísticas das notas do aluno no semestre
 */
router.get('/notas/estatisticas/:semestreId', async (req, res) => {
  const semestreId = parseInt(req.params.semestreId);
  const alunoId = req.user?.id;

  if (!alunoId || isNaN(semestreId)) {
    return res.status(400).json({ success: false, message: 'Parâmetros inválidos.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const sqlEstatisticas = `
      SELECT 
        COUNT(*) AS total_avaliacoes,
        AVG(av.nota) AS media_geral,
        MAX(av.nota) AS nota_maxima,
        MIN(av.nota) AS nota_minima,
        COUNT(CASE WHEN av.nota >= 7.0 THEN 1 END) AS aprovacoes,
        COUNT(CASE WHEN av.nota < 7.0 THEN 1 END) AS reprovacoes,
        d.nome AS disciplina_nome,
        AVG(av.nota) AS media_disciplina
      FROM Avaliacoes av
      INNER JOIN Entregas e ON av.entrega_id = e.id
      INNER JOIN Atividades a ON e.atividade_id = a.id
      INNER JOIN Grupos g ON e.grupo_id = g.id
      INNER JOIN Usuario_Grupo ug ON g.id = ug.grupo_id
      LEFT JOIN Disciplinas d ON a.disciplina_id = d.id
      WHERE ug.usuario_id = ? AND a.semestre_id = ?
      GROUP BY d.id, d.nome
      ORDER BY d.nome
    `;

    const [rows] = await connection.execute(sqlEstatisticas, [alunoId, semestreId]);

    // Calcular estatísticas gerais
    const sqlGeral = `
      SELECT 
        COUNT(*) AS total_avaliacoes,
        AVG(av.nota) AS media_geral,
        MAX(av.nota) AS nota_maxima,
        MIN(av.nota) AS nota_minima
      FROM Avaliacoes av
      INNER JOIN Entregas e ON av.entrega_id = e.id
      INNER JOIN Atividades a ON e.atividade_id = a.id
      INNER JOIN Grupos g ON e.grupo_id = g.id
      INNER JOIN Usuario_Grupo ug ON g.id = ug.grupo_id
      WHERE ug.usuario_id = ? AND a.semestre_id = ?
    `;
    //select funcional
    const [geralRows] = await connection.execute(sqlGeral, [alunoId, semestreId]);

    return res.json({ 
      success: true, 
      estatisticas: {
        geral: geralRows[0] || {},
        por_disciplina: rows
      }
    });

  } catch (err) {
    console.error('Erro ao buscar estatísticas das notas:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) await connection.release();
  }
});

/**
 * POST /aluno/notas/:avaliacaoId/reconsideracao
 * Solicita reconsideração de uma avaliação
 */
router.post('/notas/:avaliacaoId/reconsideracao', async (req, res) => {
  const avaliacaoId = parseInt(req.params.avaliacaoId);
  const alunoId = req.user?.id;
  const { motivo } = req.body;

  if (!alunoId || isNaN(avaliacaoId) || !motivo?.trim()) {
    return res.status(400).json({ success: false, message: 'Parâmetros inválidos.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // Verificar se a avaliação pertence ao aluno
    const sqlVerificar = `
      SELECT av.id
      FROM Avaliacoes av
      INNER JOIN Entregas e ON av.entrega_id = e.id
      INNER JOIN Grupos g ON e.grupo_id = g.id
      INNER JOIN Usuario_Grupo ug ON g.id = ug.grupo_id
      WHERE av.id = ? AND ug.usuario_id = ?
    `;
    //select funcional

    const [verificarRows] = await connection.execute(sqlVerificar, [avaliacaoId, alunoId]);
    
    if (verificarRows.length === 0) {
      return res.status(403).json({ success: false, message: 'Avaliação não encontrada ou sem permissão.' });
    }

    // Verificar se já existe uma reconsideração pendente
    const sqlVerificarReconsideracao = `
      SELECT id FROM Reconsideracoes 
      WHERE avaliacao_id = ? AND aluno_id = ? AND status = 'Pendente'
    `;

    const [reconsideracaoRows] = await connection.execute(sqlVerificarReconsideracao, [avaliacaoId, alunoId]);
    
    if (reconsideracaoRows.length > 0) {
      return res.status(400).json({ success: false, message: 'Já existe uma reconsideração pendente para esta avaliação.' });
    }

    // Criar nova reconsideração
    const sqlReconsideracao = `
      INSERT INTO Reconsideracoes (avaliacao_id, aluno_id, motivo, status)
      VALUES (?, ?, ?, 'Pendente')
    `;

    await connection.execute(sqlReconsideracao, [avaliacaoId, alunoId, motivo.trim()]);

    return res.json({ success: true, message: 'Solicitação de reconsideração enviada com sucesso.' });

  } catch (err) {
    console.error('Erro ao solicitar reconsideração:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) await connection.release();
  }
});

/**
 * GET /aluno/reconsideracoes/:semestreId
 * Lista todas as reconsiderações do aluno no semestre
 */
router.get('/reconsideracoes/:semestreId', async (req, res) => {
  const semestreId = parseInt(req.params.semestreId);
  const alunoId = req.user?.id;

  if (!alunoId || isNaN(semestreId)) {
    return res.status(400).json({ success: false, message: 'Parâmetros inválidos.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const sqlReconsideracoes = `
      SELECT 
        r.id AS reconsideracao_id,
        r.motivo AS reconsideracao_motivo,
        r.status AS reconsideracao_status,
        r.resposta AS reconsideracao_resposta,
        r.data_solicitacao AS reconsideracao_data_solicitacao,
        r.data_resposta AS reconsideracao_data_resposta,
        av.nota AS avaliacao_nota,
        av.comentario AS avaliacao_comentario,
        a.titulo AS atividade_titulo,
        d.nome AS disciplina_nome
      FROM Reconsideracoes r
      INNER JOIN Avaliacoes av ON r.avaliacao_id = av.id
      INNER JOIN Entregas e ON av.entrega_id = e.id
      INNER JOIN Atividades a ON e.atividade_id = a.id
      LEFT JOIN Disciplinas d ON a.disciplina_id = d.id
      WHERE r.aluno_id = ? AND a.semestre_id = ?
      ORDER BY r.data_solicitacao DESC
    `;
    //select funcional

    const [rows] = await connection.execute(sqlReconsideracoes, [alunoId, semestreId]);
    return res.json({ success: true, reconsideracoes: rows });

  } catch (err) {
    console.error('Erro ao buscar reconsiderações:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) await connection.release();
  }
});

module.exports = router;