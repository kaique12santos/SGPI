const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');
router.post('/grupos', async (req, res) => {
  const connection = await getConnection();
  const { nome, descricao, semestre_id, disciplina_id, alunos } = req.body;

  try {
    if (!nome || !semestre_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nome e semestre são obrigatórios.' 
      });
    }

    if (!Array.isArray(alunos) || alunos.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'É necessário ao menos um aluno para criar um grupo.' 
      });
    }

    await connection.beginTransaction();

    // Inserir grupo
    const [resultGrupo] = await connection.execute(
      `INSERT INTO Grupos (nome, descricao, semestre_id, disciplina_id) 
       VALUES (?, ?, ?, ?)`,
      [nome, descricao, semestre_id, disciplina_id]
    );

    const grupoId = resultGrupo.insertId;

    // Adicionar alunos usando procedure
    const alunosCSV = alunos.join(',');
    await connection.execute(
      `CALL adicionar_alunos_grupo2(?, ?)`,
      [grupoId, alunosCSV]
    );

    await connection.commit();
    res.status(201).json({ success: true, message: 'Grupo criado com sucesso!' });

  } catch (error) {
    await connection.rollback();
    console.error('Erro ao criar grupo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao criar grupo.', 
      error: error.message 
    });
  } finally {
    await connection.end();
  }
});

// Listar grupos
router.get('/grupos', async (req, res) => {
  const connection = await getConnection();

  try {
    const [rows] = await connection.execute(
      `SELECT g.id, g.nome, g.descricao, g.semestre_id, g.disciplina_id,
              g.data_criacao, g.data_atualizacao,
              s.periodo as semestre_periodo,
              d.nome as disciplina_nome
       FROM Grupos g
       LEFT JOIN Semestres s ON g.semestre_id = s.id
       LEFT JOIN Disciplinas d ON g.disciplina_id = d.id
       ORDER BY g.data_criacao DESC`
    );

    const grupos = rows.map(row => ({
      id: row.id,
      nome: row.nome,
      descricao: row.descricao,
      semestre_id: row.semestre_id,
      semestre_periodo: row.semestre_periodo,
      disciplina_id: row.disciplina_id,
      disciplina_nome: row.disciplina_nome,
      data_criacao: row.data_criacao,
      data_atualizacao: row.data_atualizacao
    }));

    res.json(grupos);

  } catch (error) {
    console.error('Erro ao listar grupos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao listar grupos.', 
      error: error.message 
    });
  } finally {
    await connection.end();
  }
});

// Buscar grupo por ID
router.get('/grupos/:id', async (req, res) => {
  const connection = await getConnection();
  const grupoId = parseInt(req.params.id, 10);

  if (isNaN(grupoId)) {
    return res.status(400).json({ message: 'ID de grupo inválido' });
  }

  try {
    const [rows] = await connection.execute(
      `SELECT g.id, g.nome, g.descricao, g.semestre_id, g.disciplina_id,
              g.data_criacao, g.data_atualizacao,
              s.periodo as semestre_periodo,
              d.nome as disciplina_nome
       FROM Grupos g
       LEFT JOIN Semestres s ON g.semestre_id = s.id
       LEFT JOIN Disciplinas d ON g.disciplina_id = d.id
       WHERE g.id = ?`,
      [grupoId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Grupo não encontrado' });
    }

    const grupo = {
      id: rows[0].id,
      nome: rows[0].nome,
      descricao: rows[0].descricao,
      semestre_id: rows[0].semestre_id,
      semestre_periodo: rows[0].semestre_periodo,
      disciplina_id: rows[0].disciplina_id,
      disciplina_nome: rows[0].disciplina_nome,
      data_criacao: rows[0].data_criacao,
      data_atualizacao: rows[0].data_atualizacao
    };

    res.json(grupo);

  } catch (error) {
    console.error('Erro ao buscar detalhes do grupo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar detalhes do grupo.', 
      error: error.message 
    });
  } finally {
    await connection.end();
  }
});

// Listar membros de um grupo
router.get('/grupos/:id/membros', async (req, res) => {
  const connection = await getConnection();
  const grupoId = parseInt(req.params.id, 10);

  if (isNaN(grupoId)) {
    return res.status(400).json({ message: 'ID de grupo inválido' });
  }

  try {
    const [rows] = await connection.execute(
      `SELECT u.id, u.nome, u.email, ug.papel, ug.data_entrada
       FROM Usuario_Grupo ug
       JOIN Usuarios u ON ug.usuario_id = u.id
       WHERE ug.grupo_id = ?
       ORDER BY u.nome`,
      [grupoId]
    );

    const membros = rows.map(row => ({
      id: row.id,
      nome: row.nome,
      email: row.email,
      papel: row.papel,
      data_entrada: row.data_entrada
    }));

    res.json(membros);

  } catch (error) {
    console.error('Erro ao listar membros do grupo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao listar membros do grupo.', 
      error: error.message 
    });
  } finally {
    await connection.end();
  }
});

// Atualizar grupo
router.put('/grupos/:id', async (req, res) => {
  const connection = await getConnection();
  const grupoId = parseInt(req.params.id, 10);
  const { nome, descricao, semestre_id, disciplina_id, alunos } = req.body;

  if (isNaN(grupoId)) {
    return res.status(400).json({ message: 'ID de grupo inválido' });
  }

  try {
    await connection.beginTransaction();

    // Verificar se o grupo existe
    const [verificacao] = await connection.execute(
      `SELECT COUNT(*) as count FROM Grupos WHERE id = ?`,
      [grupoId]
    );

    if (verificacao[0].count === 0) {
      return res.status(404).json({ message: 'Grupo não encontrado.' });
    }

    // Atualizar dados do grupo
    const [result] = await connection.execute(
      `UPDATE Grupos
       SET nome = ?,
           descricao = ?,
           semestre_id = ?,
           disciplina_id = ?,
           data_atualizacao = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [nome, descricao, semestre_id, disciplina_id, grupoId]
    );

    // Atualizar membros se fornecidos
    if (Array.isArray(alunos)) {
      // Remover todos os membros anteriores
      await connection.execute(
        `DELETE FROM Usuario_Grupo WHERE grupo_id = ?`,
        [grupoId]
      );

      // Adicionar novos membros
      for (const alunoId of alunos) {
        await connection.execute(
          `INSERT INTO Usuario_Grupo (usuario_id, grupo_id, papel)
           VALUES (?, ?, 'Membro')`,
          [alunoId, grupoId]
        );
      }
    }

    await connection.commit();

    res.json({
      success: result.affectedRows > 0,
      message: result.affectedRows > 0
        ? 'Grupo atualizado com sucesso!'
        : 'Erro ao atualizar grupo.'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erro ao atualizar grupo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao atualizar grupo.', 
      error: error.message 
    });
  } finally {
    await connection.end();
  }
});

// Adicionar membro ao grupo
router.post('/grupos/:id/membros', async (req, res) => {
  const connection = await getConnection();
  const grupoId = parseInt(req.params.id, 10);
  const { usuario_id, papel } = req.body;

  if (isNaN(grupoId) || isNaN(usuario_id)) {
    return res.status(400).json({ message: 'IDs inválidos' });
  }

  try {
    // Verificar se usuário já pertence ao grupo
    const [verificacao] = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM Usuario_Grupo 
       WHERE grupo_id = ? AND usuario_id = ?`,
      [grupoId, usuario_id]
    );

    if (verificacao[0].count > 0) {
      return res.status(400).json({ message: 'Usuário já pertence ao grupo.' });
    }

    const [result] = await connection.execute(
      `INSERT INTO Usuario_Grupo (usuario_id, grupo_id, papel)
       VALUES (?, ?, ?)`,
      [usuario_id, grupoId, papel || 'Membro']
    );

    res.status(201).json({
      success: true,
      message: 'Membro adicionado ao grupo com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao adicionar membro ao grupo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao adicionar membro ao grupo.', 
      error: error.message 
    });
  } finally {
    await connection.end();
  }
});

// Buscar alunos por semestre (sem grupo)
router.get('/alunos/semestre/:semestre_id', async (req, res) => {
  const connection = await getConnection();
  const semestreId = parseInt(req.params.semestre_id, 10);

  if (isNaN(semestreId)) {
    return res.status(400).json({ message: 'ID de semestre inválido' });
  }

  try {
    const [rows] = await connection.execute(
      `SELECT DISTINCT u.id, u.nome, u.email 
       FROM Usuarios u
       JOIN Usuario_Semestre us ON u.id = us.usuario_id
       WHERE us.semestre_id = ? 
       AND u.tipo = 'Aluno'
       AND u.ativo = 1
       AND NOT EXISTS (
           SELECT 1 
           FROM Usuario_Grupo ug 
           JOIN Grupos g ON ug.grupo_id = g.id
           WHERE ug.usuario_id = u.id 
           AND g.semestre_id = ?
       )
       ORDER BY u.nome`,
      [semestreId, semestreId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar alunos por semestre:', error);
    res.status(500).json({ 
      message: 'Erro ao buscar alunos.', 
      error: error.message 
    });
  } finally {
    await connection.end();
  }
});

// Remover membro do grupo
router.delete('/grupos/:grupoId/membros/:usuarioId', async (req, res) => {
  const connection = await getConnection();
  const grupoId = parseInt(req.params.grupoId, 10);
  const usuarioId = parseInt(req.params.usuarioId, 10);

  if (isNaN(grupoId) || isNaN(usuarioId)) {
    return res.status(400).json({ message: 'IDs inválidos' });
  }

  try {
    const [result] = await connection.execute(
      `DELETE FROM Usuario_Grupo
       WHERE grupo_id = ? AND usuario_id = ?`,
      [grupoId, usuarioId]
    );

    res.json({
      success: result.affectedRows > 0,
      message: result.affectedRows > 0
        ? 'Membro removido do grupo com sucesso!'
        : 'Membro não encontrado no grupo.'
    });

  } catch (error) {
    console.error('Erro ao remover membro do grupo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao remover membro do grupo.', 
      error: error.message 
    });
  } finally {
    await connection.end();
  }
});

// Excluir grupo
router.delete('/grupos/:id', async (req, res) => {
  const connection = await getConnection();
  const grupoId = parseInt(req.params.id, 10);

  if (isNaN(grupoId)) {
    return res.status(400).json({ message: 'ID de grupo inválido.' });
  }

  try {
    await connection.beginTransaction();

    // Verificar se há projetos vinculados ao grupo
    const [vinculo] = await connection.execute(
      `SELECT COUNT(*) AS total FROM Projetos WHERE grupo_id = ?`,
      [grupoId]
    );

    if (vinculo[0].total > 0) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível excluir o grupo, pois ele está vinculado a um projeto.'
      });
    }

    // Remover membros do grupo
    await connection.execute(
      `DELETE FROM Usuario_Grupo WHERE grupo_id = ?`,
      [grupoId]
    );

    // Remover o grupo
    const [result] = await connection.execute(
      `DELETE FROM Grupos WHERE id = ?`,
      [grupoId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Grupo não encontrado.' });
    }

    await connection.commit();
    res.json({ success: true, message: 'Grupo excluído com sucesso!' });

  } catch (error) {
    await connection.rollback();
    console.error('Erro ao excluir grupo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao excluir grupo.', 
      error: error.message 
    });
  } finally {
    await connection.end();
  }
});

// Listar semestres disponíveis
router.get('/semestres', async (req, res) => {
  const connection = await getConnection();

  try {
    const [rows] = await connection.execute(
      `SELECT id, periodo, ano, descricao, data_inicio, data_fim, ativo
       FROM Semestres
       WHERE ativo = 1
       ORDER BY periodo`
    );

    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar semestres:', error);
    res.status(500).json({ 
      message: 'Erro ao buscar semestres.', 
      error: error.message 
    });
  } finally {
    await connection.end();
  }
});

// Listar disciplinas disponíveis
router.get('/disciplinas', async (req, res) => {
  const connection = await getConnection();

  try {
    const [rows] = await connection.execute(
      `SELECT id, nome, codigo, descricao, ativo
       FROM Disciplinas
       WHERE ativo = 1
       ORDER BY nome`
    );
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar disciplinas:', error);
    res.status(500).json({ 
      message: 'Erro ao buscar disciplinas.', 
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
})

module.exports = router;