const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');

/**
 * GET /aluno/atividades/:semestreId
 * Lista todas as atividades do semestre para o aluno logado
 */
router.get('/atividades/:semestreId', async (req, res) => {
  const semestreId = parseInt(req.params.semestreId);
  const alunoId = req.user?.id;

  if (!alunoId || isNaN(semestreId)) {
    return res.status(400).json({ success: false, message: 'Parâmetros inválidos.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const sqlAtividades = `
      SELECT DISTINCT
        a.id AS atividade_id,
        a.titulo AS atividade_titulo,
        a.descricao AS atividade_descricao,
        a.prazo_entrega AS atividade_prazo,
        a.criterios_avaliacao AS atividade_criterios,
        d.nome AS disciplina_nome,
        u_prof.nome AS professor_nome,
        g.id AS grupo_id,
        g.nome AS grupo_nome,
        e.id AS entrega_id,
        e.status AS entrega_status,
        e.data_entrega AS entrega_data,
        av.nota AS avaliacao_nota,
        av.comentario AS avaliacao_comentario,
        av.data_avaliacao AS avaliacao_data
      FROM Atividades a
      INNER JOIN Semestres s ON a.semestre_id = s.id
      LEFT JOIN Disciplinas d ON a.disciplina_id = d.id
      LEFT JOIN Usuarios u_prof ON a.professor_id = u_prof.id
      LEFT JOIN Grupos g ON a.grupo_id = g.id
      LEFT JOIN Usuario_Grupo ug ON g.id = ug.grupo_id AND ug.usuario_id = ?
      LEFT JOIN Entregas e ON a.id = e.atividade_id AND e.grupo_id = g.id
      LEFT JOIN Avaliacoes av ON e.id = av.entrega_id
      WHERE a.semestre_id = ?
        AND (ug.usuario_id IS NOT NULL OR a.grupo_id IS NULL)
      ORDER BY a.prazo_entrega ASC, a.titulo ASC
    `;
    //select funcional

    const [rows] = await connection.execute(sqlAtividades, [alunoId, semestreId]);
    return res.json({ success: true, atividades: rows });

  } catch (err) {
    console.error('Erro ao buscar atividades do aluno:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) await connection.release();
  }
});

/**
 * GET /aluno/atividades/:atividadeId/detalhes
 * Busca detalhes específicos de uma atividade
 */
router.get('/atividades/:atividadeId/detalhes', async (req, res) => {
  const atividadeId = parseInt(req.params.atividadeId);
  const alunoId = req.user?.id;

  if (!alunoId || isNaN(atividadeId)) {
    return res.status(400).json({ success: false, message: 'Parâmetros inválidos.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const sqlDetalhes = `
      SELECT 
        a.id AS atividade_id,
        a.titulo AS atividade_titulo,
        a.descricao AS atividade_descricao,
        a.criterios_avaliacao AS atividade_criterios,
        a.prazo_entrega AS atividade_prazo,
        a.data_criacao AS atividade_data_criacao,
        d.nome AS disciplina_nome,
        d.codigo AS disciplina_codigo,
        u_prof.nome AS professor_nome,
        u_prof.email AS professor_email,
        g.id AS grupo_id,
        g.nome AS grupo_nome,
        s.periodo AS semestre_periodo,
        s.ano AS semestre_ano,
        s.descricao AS semestre_descricao
      FROM Atividades a
      INNER JOIN Semestres s ON a.semestre_id = s.id
      LEFT JOIN Disciplinas d ON a.disciplina_id = d.id
      LEFT JOIN Usuarios u_prof ON a.professor_id = u_prof.id
      LEFT JOIN Grupos g ON a.grupo_id = g.id
      LEFT JOIN Usuario_Grupo ug ON g.id = ug.grupo_id AND ug.usuario_id = ?
      WHERE a.id = ?
        AND (ug.usuario_id IS NOT NULL OR a.grupo_id IS NULL)
    `;
    //select funcional

    const [rows] = await connection.execute(sqlDetalhes, [alunoId, atividadeId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Atividade não encontrada.' });
    }

    return res.json({ success: true, atividade: rows[0] });

  } catch (err) {
    console.error('Erro ao buscar detalhes da atividade:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) await connection.release();
  }
});

/**
 * POST /aluno/atividades/:atividadeId/entregar
 * Realiza a entrega de uma atividade
 */
router.post('/atividades/:atividadeId/entregar', async (req, res) => {
  const atividadeId = parseInt(req.params.atividadeId);
  const alunoId = req.user?.id;
  const { caminhoArquivo, tamanhoArquivo } = req.body;

  if (!alunoId || isNaN(atividadeId)) {
    return res.status(400).json({ success: false, message: 'Parâmetros inválidos.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // Verificar se o aluno pertence a um grupo para esta atividade
    const sqlVerificarGrupo = `
      SELECT g.id AS grupo_id
      FROM Atividades a
      INNER JOIN Grupos g ON a.grupo_id = g.id
      INNER JOIN Usuario_Grupo ug ON g.id = ug.grupo_id
      WHERE a.id = ? AND ug.usuario_id = ?
    `;
    //select funcional

    const [grupoRows] = await connection.execute(sqlVerificarGrupo, [atividadeId, alunoId]);
    
    if (grupoRows.length === 0) {
      return res.status(403).json({ success: false, message: 'Você não tem permissão para entregar esta atividade.' });
    }

    const grupoId = grupoRows[0].grupo_id;

    // Verificar se já existe uma entrega
    const sqlVerificarEntrega = `
      SELECT id FROM Entregas 
      WHERE atividade_id = ? AND grupo_id = ?
    `;
    //select funcional

    const [entregaRows] = await connection.execute(sqlVerificarEntrega, [atividadeId, grupoId]);

    if (entregaRows.length > 0) {
      // Atualizar entrega existente
      const sqlAtualizarEntrega = `
        UPDATE Entregas 
        SET caminho_arquivo = ?, tamanho_arquivo = ?, status = 'Entregue', data_entrega = CURRENT_TIMESTAMP
        WHERE atividade_id = ? AND grupo_id = ?
      `;
      //update funcional
      
      await connection.execute(sqlAtualizarEntrega, [caminhoArquivo, tamanhoArquivo, atividadeId, grupoId]);
    } else {
      // Criar nova entrega
      const sqlNovaEntrega = `
        INSERT INTO Entregas (atividade_id, grupo_id, aluno_id, caminho_arquivo, tamanho_arquivo, status)
        VALUES (?, ?, ?, ?, ?, 'Entregue')
      `;
      //insert funcional
      
      await connection.execute(sqlNovaEntrega, [atividadeId, grupoId, alunoId, caminhoArquivo, tamanhoArquivo]);
    }

    return res.json({ success: true, message: 'Entrega realizada com sucesso.' });

  } catch (err) {
    console.error('Erro ao realizar entrega:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) await connection.release();
  }
});

/**
 * GET /aluno/entregas/:semestreId
 * Lista todas as entregas do aluno no semestre
 */
router.get('/entregas/:semestreId', async (req, res) => {
  const semestreId = parseInt(req.params.semestreId);
  const alunoId = req.user?.id;

  if (!alunoId || isNaN(semestreId)) {
    return res.status(400).json({ success: false, message: 'Parâmetros inválidos.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const sqlEntregas = `
      SELECT 
        e.id AS entrega_id,
        e.status AS entrega_status,
        e.data_entrega AS entrega_data,
        e.caminho_arquivo AS entrega_arquivo,
        a.id AS atividade_id,
        a.titulo AS atividade_titulo,
        a.prazo_entrega AS atividade_prazo,
        g.nome AS grupo_nome,
        d.nome AS disciplina_nome,
        av.nota AS avaliacao_nota,
        av.comentario AS avaliacao_comentario,
        av.data_avaliacao AS avaliacao_data
      FROM Entregas e
      INNER JOIN Atividades a ON e.atividade_id = a.id
      INNER JOIN Grupos g ON e.grupo_id = g.id
      INNER JOIN Usuario_Grupo ug ON g.id = ug.grupo_id
      LEFT JOIN Disciplinas d ON a.disciplina_id = d.id
      LEFT JOIN Avaliacoes av ON e.id = av.entrega_id
      WHERE ug.usuario_id = ? AND a.semestre_id = ?
      ORDER BY e.data_entrega DESC
    `;
    //select funcional

    const [rows] = await connection.execute(sqlEntregas, [alunoId, semestreId]);
    return res.json({ success: true, entregas: rows });

  } catch (err) {
    console.error('Erro ao buscar entregas do aluno:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) await connection.release();
  }
});

module.exports = router;