const express = require('express');
const router = express.Router();
const { getConnection, oracledb } = require('../connectOracle.js');
const path = require('path');
const frontendPath = path.join(__dirname, '..', '..', 'frontend');

// Utilitário para converter CLOB em string
function lobToString(lob) {
  return new Promise((resolve, reject) => {
    if (!lob) return resolve(null);
    let content = '';
    lob.setEncoding('utf8');
    lob.on('data', chunk => content += chunk);
    lob.on('end', () => resolve(content));
    lob.on('error', reject);
  });
}

// Rota para a página de criação de grupos
router.get('/criar-grupos', (req, res) => {
  res.sendFile(path.join(frontendPath, 'criar-grupos.html'));
});

// Criar novo grupo
router.post('/grupos', async (req, res) => {
  const connection = await getConnection();
  const { nome, descricao, semestre, alunos } = req.body;

  try {
    if (!nome || !semestre) {
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

    // Inserir grupo e obter ID
    const resultGrupo = await connection.execute(
      `INSERT INTO Grupos (nome, descricao, semestre) 
       VALUES (:1, :2, :3) 
       RETURNING id INTO :4`,
      [nome, descricao, semestre, { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }],
      { autoCommit: false }
    );

    const grupoId = resultGrupo.outBinds[0];

    for (const alunoIdRaw of alunos) {
      const alunoId = parseInt(alunoIdRaw);
      if (isNaN(alunoId)) {
        throw new Error(`ID de aluno inválido: ${alunoIdRaw}`);
      }
    
      await connection.execute(
        `INSERT INTO Usuario_Grupo (usuario_id, grupo_id, papel) 
         VALUES (:usuario_id, :grupo_id, :papel)`,
        {
          usuario_id: { val: alunoId, type: oracledb.NUMBER },
          grupo_id:   { val: grupoId, type: oracledb.NUMBER },
          papel:      { val: 'Membro', type: oracledb.STRING }
        }
      );
    }
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Erro ao realizar rollback:', rollbackError);
    }

    console.error('Erro ao criar grupo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao criar grupo.', 
      error: error.message 
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Erro ao fechar conexão:', closeError);
      }
    }
  }
});

// Listar todos os grupos
router.get('/grupos', async (req, res) => {
  const connection = await getConnection();

  try {
    const result = await connection.execute(
      `SELECT id, nome, descricao, semestre, 
              TO_CHAR(data_criacao, 'YYYY-MM-DD"T"HH24:MI:SS') as data_criacao,
              TO_CHAR(data_atualizacao, 'YYYY-MM-DD"T"HH24:MI:SS') as data_atualizacao
       FROM Grupos
       ORDER BY data_criacao DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // Processar resultados para converter CLOBs
    const grupos = await Promise.all(result.rows.map(async row => ({
      id: row.ID,
      nome: row.NOME,
      descricao: row.DESCRICAO ? await lobToString(row.DESCRICAO) : null,
      semestre: row.SEMESTRE,
      data_criacao: row.DATA_CRIACAO,
      data_atualizacao: row.DATA_ATUALIZACAO
    })));

    res.json(grupos);

  } catch (error) {
    console.error('Erro ao listar grupos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao listar grupos.', 
      error: error.message 
    });
  } finally {
    if (connection) await connection.close();
  }
});

// Obter detalhes de um grupo específico
router.get('/grupos/:id', async (req, res) => {
  const connection = await getConnection();
  const grupoId = parseInt(req.params.id, 10);

  if (isNaN(grupoId)) {
    return res.status(400).json({ message: 'ID de grupo inválido' });
  }

  try {
    const result = await connection.execute(
      `SELECT id, nome, descricao, semestre, 
              TO_CHAR(data_criacao, 'YYYY-MM-DD"T"HH24:MI:SS') as data_criacao,
              TO_CHAR(data_atualizacao, 'YYYY-MM-DD"T"HH24:MI:SS') as data_atualizacao
       FROM Grupos
       WHERE id = :grupoId`,
      [grupoId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Grupo não encontrado' });
    }

    // Converter CLOB para string
    const grupo = {
      id: result.rows[0].ID,
      nome: result.rows[0].NOME,
      descricao: result.rows[0].DESCRICAO ? await lobToString(result.rows[0].DESCRICAO) : null,
      semestre: result.rows[0].SEMESTRE,
      data_criacao: result.rows[0].DATA_CRIACAO,
      data_atualizacao: result.rows[0].DATA_ATUALIZACAO
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
    if (connection) await connection.close();
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
    const result = await connection.execute(
      `SELECT u.id, u.nome, u.email, ug.papel, 
              TO_CHAR(ug.data_entrada, 'YYYY-MM-DD"T"HH24:MI:SS') as data_entrada
       FROM Usuario_Grupo ug
       JOIN Usuarios u ON ug.usuario_id = u.id
       WHERE ug.grupo_id = :grupoId`,
      [grupoId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const membros = result.rows.map(row => ({
      id: row.ID,
      nome: row.NOME,
      email: row.EMAIL,
      papel: row.PAPEL,
      data_entrada: row.DATA_ENTRADA
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
    if (connection) await connection.close();
  }
});

// Atualizar grupo
router.put('/grupos/:id', async (req, res) => {
  const connection = await getConnection();
  const grupoId = parseInt(req.params.id, 10);
  const { nome, descricao, semestre } = req.body;

  if (isNaN(grupoId)) {
    return res.status(400).json({ message: 'ID de grupo inválido' });
  }

  try {
    // Verificar se o grupo existe
    const verificacao = await connection.execute(
      `SELECT COUNT(*) as count FROM Grupos WHERE id = :grupoId`,
      [grupoId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (verificacao.rows[0].COUNT === 0) {
      return res.status(404).json({ message: 'Grupo não encontrado.' });
    }

    // Atualizar grupo
    const result = await connection.execute(
      `UPDATE Grupos
       SET nome = :nome,
           descricao = :descricao,
           semestre = :semestre,
           data_atualizacao = CURRENT_TIMESTAMP
       WHERE id = :grupoId`,
      [nome, descricao, semestre, grupoId],
      { autoCommit: true }
    );

    res.json({
      success: result.rowsAffected > 0,
      message: result.rowsAffected > 0
        ? 'Grupo atualizado com sucesso!'
        : 'Erro ao atualizar grupo.'
    });

  } catch (error) {
    console.error('Erro ao atualizar grupo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao atualizar grupo.', 
      error: error.message 
    });
  } finally {
    if (connection) await connection.close();
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
    // Verificar se o usuário já está no grupo
    const verificacao = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM Usuario_Grupo 
       WHERE grupo_id = :grupoId AND usuario_id = :usuario_id`,
      [grupoId, usuario_id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (verificacao.rows[0].COUNT > 0) {
      return res.status(400).json({ message: 'Usuário já pertence ao grupo.' });
    }

    // Adicionar usuário ao grupo
    const result = await connection.execute(
      `INSERT INTO Usuario_Grupo (usuario_id, grupo_id, papel)
       VALUES (:usuario_id, :grupoId, :papel)`,
      [usuario_id, grupoId, papel || 'Membro'],
      { autoCommit: true }
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
    if (connection) await connection.close();
  }
});
// Buscar alunos por semestre
router.get('/alunos/semestre/:semestre', async (req, res) => {
  const connection = await getConnection();
  const semestre = req.params.semestre;

  try {
    const result = await connection.execute(
      `SELECT id, nome FROM Usuarios WHERE semestre = :semestre AND tipo = 'Aluno'`,
      [semestre],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar alunos por semestre:', error);
    res.status(500).json({ message: 'Erro ao buscar alunos.', error: error.message });
  } finally {
    if (connection) await connection.close();
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
    const result = await connection.execute(
      `DELETE FROM Usuario_Grupo
       WHERE grupo_id = :grupoId AND usuario_id = :usuarioId`,
      [grupoId, usuarioId],
      { autoCommit: true }
    );

    res.json({
      success: result.rowsAffected > 0,
      message: result.rowsAffected > 0
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
    if (connection) await connection.close();
  }
});

module.exports = router;