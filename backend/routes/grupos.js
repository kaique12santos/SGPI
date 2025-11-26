const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');

// ====================================
// UTILITÁRIOS
// ====================================

/**
 * Obtém o semestre ativo atual
 */
async function obterSemestreAtivo(connection) {
  const sql = `
    SELECT id, periodo, ano
    FROM Semestres
    WHERE ativo = 1
    ORDER BY ano DESC, periodo DESC
    LIMIT 1
  `;
  // CORREÇÃO: Trocado 'execute' por 'query' e corrigida a leitura de 'rows'
  const [rows] = await connection.query(sql); 
  return rows.length ? rows[0] : null;
}

/**
 * Verifica se um grupo tem projetos não finalizados
 */
async function grupoTemProjetoAtivo(connection, grupoId) {
  const sql = `SELECT COUNT(*) AS total FROM Projetos WHERE grupo_id = ? AND status != 'Concluído'`;
  // CORREÇÃO: Trocado 'execute' por 'query' e corrigida a leitura de 'rows'
  const [rows] = await connection.query(sql, [grupoId]); 
  const total = rows.length ? parseInt(rows[0].total, 10) : 0;
  return total > 0;
}

/**
 * GET /grupos/alunos-disponiveis/:orientadorId
 * (Esta rota parece ser uma versão antiga, a rota mais abaixo com /:semestrePadrao é a usada)
 */
// ... (vou pular a correção desta rota duplicada, pois a de baixo é a mais completa)


/**
 * GET /grupos/semestre-ativo
 * Retorna informações do semestre ativo
 */
router.get('/grupos/semestre-ativo', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const semestreAtivo = await obterSemestreAtivo(connection); // Esta função já foi corrigida
    
    if (!semestreAtivo) {
      return res.status(404).json({ 
        success: false,
        message: 'Não há semestre ativo no momento.' 
      });
    }

    res.json({
      success: true,
      semestre: semestreAtivo
    });

  } catch (error) {
    console.error('Erro ao buscar semestre ativo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar semestre ativo.', 
      error: error.message 
    });
  } finally {
    if (connection) await connection.release();
  }
});


// ====================================
// ROTA PRINCIPAL DE CRIAÇÃO (MODIFICADA)
// ====================================
router.post('/grupos', async (req, res) => {
  // MODIFICADO: Recebendo os novos campos do frontend
  const { nome, semestre_id, alunos, disciplina_id, orientador_id } = req.body;

  // MODIFICADO: Adicionada validação dos novos campos
  if (!nome || !semestre_id || !disciplina_id || !orientador_id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Nome, semestre, disciplina e orientador são obrigatórios.' 
    });
  }

  if (!Array.isArray(alunos) || alunos.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'É necessário ao menos um aluno para criar um grupo.' 
    });
  }

  let connection;
  try {
    connection = await getConnection();
    console.log('Backend: Tentando inserir grupo. Nome:', nome, 'Semestre ID:', semestre_id, 'Orientador:', orientador_id, 'Disciplina:', disciplina_id);
    
    // MODIFICADO: Query de INSERT agora inclui os novos campos
    const sqlInsert = `
      INSERT INTO Grupos (nome, semestre_id, orientador_id, disciplina_id) 
      VALUES (?, ?, ?, ?)
    `;
    
    // CORREÇÃO: Trocado 'execute' por 'query' e corrigida a leitura do 'insertId'
    const [resultGrupo] = await connection.query(sqlInsert, [
      nome, 
      semestre_id, 
      orientador_id, 
      disciplina_id
    ]);
    
    const grupoId = resultGrupo.insertId; // Correção aqui
    
    console.log('Backend: Grupo inserido. Novo grupoId:', grupoId);

    // Adicionar alunos ao grupo via procedure
    const alunosCSV = alunos.join(',');
    console.log('Backend: Tentando chamar procedure. GrupoID:', grupoId, 'AlunosCSV:', alunosCSV);
    const sqlProc = `CALL adicionar_alunos_grupo2(?, ?)`;
    
    // CORREÇÃO: Trocado 'execute' por 'query'
    await connection.query(sqlProc, [grupoId, alunosCSV]);

    res.status(201).json({ 
      success: true, 
      message: 'Grupo criado com sucesso!',
      grupoId 
    });

  } catch (error) {
    console.error('Erro ao criar grupo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao criar grupo.', 
      error: error.message 
    });
  } finally {
    if (connection) await connection.release();
  }
});

/**
 * GET /grupos
 * Listar todos os grupos
 */
/**
 * GET /grupos
 * Listar todos os grupos (APENAS DO SEMESTRE ATIVO)
 */
router.get('/grupos', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();

    const sql = `
      SELECT 
        g.id, 
        g.nome, 
        g.semestre_id,
        s.periodo,
        s.ano,
        d.semestre_padrao,
        g.data_criacao, 
        g.data_atualizacao,
        COUNT(DISTINCT ug.usuario_id) as total_membros,
        d.nome as disciplina_nome,
        u.nome as orientador_nome
      FROM Grupos g
      JOIN Semestres s ON g.semestre_id = s.id
      LEFT JOIN Usuario_Grupo ug ON g.id = ug.grupo_id
      LEFT JOIN Disciplinas d ON g.disciplina_id = d.id
      LEFT JOIN Usuarios u ON g.orientador_id = u.id
      WHERE s.ativo = 1  -- << O FILTRO MÁGICO: Só traz grupos do semestre atual
      GROUP BY g.id, g.nome, g.semestre_id, s.periodo, s.ano, g.data_criacao, g.data_atualizacao, d.nome, u.nome
      ORDER BY g.data_criacao DESC
    `;

    // CORREÇÃO: Trocado 'execute' por 'query'
    const [grupos] = await connection.query(sql, []);

    res.json(grupos);

  } catch (error) {
    console.error('Erro ao listar grupos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao listar grupos.', 
      error: error.message 
    });
  } finally {
    if (connection) await connection.release();
  }
});

/**
 * GET /grupos/:id
 * Obter detalhes de um grupo específico
 */
router.get('/grupos/:id', async (req, res) => {
  const grupoId = Number(req.params.id);

  if (!grupoId || isNaN(grupoId)) {
    return res.status(400).json({ success: false, message: 'ID de grupo inválido' });
  }

  let connection;
  try {
    connection = await getConnection();

    // 1. Obter detalhes do grupo
    const sql = `
      SELECT 
        g.id, 
        g.nome, 
        g.semestre_id,
        s.periodo,
        s.ano,
        s.ativo as semestre_ativo,
        g.data_criacao, 
        g.data_atualizacao,
        g.disciplina_id,        -- BÔNUS
        g.orientador_id,        -- BÔNUS
        d.nome as disciplina_nome, -- BÔNUS
        u.nome as orientador_nome  -- BÔNUS
      FROM Grupos g
      JOIN Semestres s ON g.semestre_id = s.id
      LEFT JOIN Disciplinas d ON g.disciplina_id = d.id -- BÔNUS
      LEFT JOIN Usuarios u ON g.orientador_id = u.id -- BÔNUS
      WHERE g.id = ?
    `;
    // CORREÇÃO: Trocado 'execute' por 'query'
    const [rows] = await connection.query(sql, [grupoId]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Grupo não encontrado' });
    }

    const grupo = rows[0];

    // 2. LÓGICA do semestre_padrao
    const sqlSemestrePadrao = `
        SELECT d.semestre_padrao
        FROM Usuario_Grupo ug
        JOIN Aluno_Oferta ao ON ug.usuario_id = ao.aluno_id
        JOIN Disciplinas_Ofertas do_tbl ON ao.oferta_id = do_tbl.id
        JOIN Disciplinas d ON do_tbl.disciplina_id = d.id
        WHERE ug.grupo_id = ? AND do_tbl.semestre_id = ?
        LIMIT 1
    `;
    // CORREÇÃO: Trocado 'execute' por 'query'
    const [sp_rows] = await connection.query(sqlSemestrePadrao, [grupoId, grupo.semestre_id]);
    
    grupo.semestre_padrao = (sp_rows && sp_rows.length > 0) ? sp_rows[0].semestre_padrao : null;

    if (!grupo.semestre_padrao && grupo.orientador_id) { // Lógica de fallback melhorada
        const sqlOrientadorSP = `
            SELECT d.semestre_padrao
            FROM Disciplinas_Ofertas do_tbl
            JOIN Disciplinas d ON do_tbl.disciplina_id = d.id
            WHERE do_tbl.professor_responsavel = ?
            AND do_tbl.semestre_id = ?
            AND d.nome LIKE 'Orientação%'
            LIMIT 1
        `;
        // CORREÇÃO: Trocado 'execute' por 'query'
        const [osp_rows] = await connection.query(sqlOrientadorSP, [grupo.orientador_id, grupo.semestre_id]);
        if (osp_rows && osp_rows.length > 0) {
            grupo.semestre_padrao = osp_rows[0].semestre_padrao;
        }
    }

    res.json(grupo); 

  } catch (error) {
    console.error('Erro ao buscar detalhes do grupo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar detalhes do grupo.', 
      error: error.message 
    });
  } finally {
    if (connection) await connection.release();
  }
});

/**
 * GET /grupos/:id/membros
 * Listar membros de um grupo
 */
router.get('/grupos/:id/membros', async (req, res) => {
  const grupoId = Number(req.params.id);

  if (!grupoId || isNaN(grupoId)) {
    return res.status(400).json({ success: false, message: 'ID de grupo inválido' });
  }

  let connection;
  try {
    connection = await getConnection();

    const sql = `
      SELECT 
        u.id, 
        u.nome, 
        u.email, 
        ug.papel, 
        ug.data_entrada
      FROM Usuario_Grupo ug
      JOIN Usuarios u ON ug.usuario_id = u.id
      WHERE ug.grupo_id = ?
      ORDER BY ug.papel DESC, u.nome ASC
    `;

    // CORREÇÃO: Trocado 'execute' por 'query'
    const [membros] = await connection.query(sql, [grupoId]);

    res.json(membros);

  } catch (error) {
    console.error('Erro ao listar membros do grupo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao listar membros do grupo.', 
      error: error.message 
    });
  } finally {
    if (connection) await connection.release();
  }
});

/**
 * PUT /grupos/:id
 * Atualizar grupo (nome e membros/papéis)
 */
router.put('/grupos/:id', async (req, res) => {
  const grupoId = Number(req.params.id);
  const { nome, membros } = req.body; 

  if (!grupoId || isNaN(grupoId)) {
    return res.status(400).json({ success: false, message: 'ID de grupo inválido' });
  }

  let connection;
  try {
    connection = await getConnection();

    // 1. Verificar se o grupo existe
    const sqlVerifica = `SELECT id FROM Grupos WHERE id = ?`;
    // CORREÇÃO: Trocado 'execute' por 'query'
    const [rowsVerifica] = await connection.query(sqlVerifica, [grupoId]);

    if (!rowsVerifica || rowsVerifica.length === 0) {
      return res.status(404).json({ success: false, message: 'Grupo não encontrado.' });
    }

    // 2. Atualizar nome do grupo (se fornecido)
    if (nome && nome.trim()) {
      const sqlUpdate = `UPDATE Grupos SET nome = ? WHERE id = ?`;
      // CORREÇÃO: Trocado 'execute' por 'query'
      await connection.query(sqlUpdate, [nome.trim(), grupoId]);
    }

    // 3. Atualizar membros (se fornecido)
    if (Array.isArray(membros)) {
      
      if (membros.length === 0) {
        return res.status(400).json({ success: false, message: 'Um grupo não pode ficar sem membros.' });
      }

      // 3a. Remover membros atuais
      const sqlDelete = `DELETE FROM Usuario_Grupo WHERE grupo_id = ?`;
      // CORREÇÃO: Trocado 'execute' por 'query'
      await connection.query(sqlDelete, [grupoId]);

      // 3b. Adicionar novos membros com papéis
      const sqlInsertMember = `INSERT INTO Usuario_Grupo (grupo_id, usuario_id, papel, data_entrada) VALUES (?, ?, ?, NOW())`;
      
      const insertPromises = membros.map(member => {
        const papel = member.papel || 'Membro';
        // CORREÇÃO: Trocado 'execute' por 'query'
        return connection.query(sqlInsertMember, [grupoId, member.id, papel]);
      });
      await Promise.all(insertPromises);
    }

    res.json({
      success: true,
      message: 'Grupo atualizado com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao atualizar grupo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao atualizar grupo.', 
      error: error.message 
    });
  } finally {
    if (connection) await connection.release();
  }
});

/**
 * DELETE /grupos/:id
 * Excluir grupo (apenas se não tiver projetos ativos)
 */
router.delete('/grupos/:id', async (req, res) => {
  const grupoId = Number(req.params.id);

  if (!grupoId || isNaN(grupoId)) {
    return res.status(400).json({ success: false, message: 'ID de grupo inválido.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // Esta função já foi corrigida
    const temProjetoAtivo = await grupoTemProjetoAtivo(connection, grupoId);
    
    if (temProjetoAtivo) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível excluir o grupo pois ele possui projetos não finalizados.'
      });
    }

    // Remover membros do grupo
    const sqlDeleteMembros = `DELETE FROM Usuario_Grupo WHERE grupo_id = ?`;
    // CORREÇÃO: Trocado 'execute' por 'query'
    await connection.query(sqlDeleteMembros, [grupoId]);

    // Remover o grupo
    const sqlDeleteGrupo = `DELETE FROM Grupos WHERE id = ?`;
    // CORREÇÃO: Trocado 'execute' por 'query' e corrigida leitura de 'affectedRows'
    const [result] = await connection.query(sqlDeleteGrupo, [grupoId]);

    if (!result.affectedRows || result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Grupo não encontrado.' });
    }

    res.json({ 
      success: true, 
      message: 'Grupo excluído com sucesso!' 
    });

  } catch (error) {
    console.error('Erro ao excluir grupo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao excluir grupo.', 
      error: error.message 
    });
  } finally {
    if (connection) await connection.release();
  }
});


// ====================================
// ROTAS - ALUNOS DISPONÍVEIS
// ====================================

/**
 * GET /grupos/minhas-orientacoes/:orientadorId
 * Lista as disciplinas de orientação que o professor leciona no semestre ativo.
 */
router.get('/grupos/minhas-orientacoes/:orientadorId', async (req, res) => {
  const orientadorId = Number(req.params.orientadorId);

  if (!orientadorId || isNaN(orientadorId)) {
    return res.status(400).json({ success: false, message: 'ID de orientador inválido' });
  }

  let connection;
  try {
    connection = await getConnection();

    // Esta função já foi corrigida
    const semestreAtivo = await obterSemestreAtivo(connection);
    if (!semestreAtivo) {
      return res.status(400).json({ 
        success: false,
        message: 'Não há semestre ativo no momento.' 
      });
    }

    // Buscar disciplinas de orientação do professor no semestre ativo
    const sql = `
      SELECT DISTINCT
        d.id,
        d.nome,
        d.semestre_padrao
      FROM Disciplinas d
      JOIN Disciplinas_Ofertas do_tbl ON d.id = do_tbl.disciplina_id
      WHERE do_tbl.professor_responsavel = ?
      AND do_tbl.semestre_id = ?
      AND d.nome LIKE 'Orientação%'
      ORDER BY d.semestre_padrao
    `;

    // CORREÇÃO: Trocado 'execute' por 'query'
    const [disciplinas] = await connection.query(sql, [orientadorId, semestreAtivo.id]);

    res.json({
      success: true,
      disciplinas
    });

  } catch (error) {
    console.error('Erro ao buscar disciplinas de orientação:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro ao buscar disciplinas de orientação.', 
      error: error.message 
    });
  } finally {
    if (connection) await connection.release();
  }
});


/**
 * GET /grupos/alunos-disponiveis/:orientadorId/:semestrePadrao
 * Lista alunos disponíveis para formar grupos baseado no orientador E no semestre padrão
 */
router.get('/grupos/alunos-disponiveis/:orientadorId/:semestrePadrao', async (req, res) => {
  const orientadorId = Number(req.params.orientadorId);
  const semestrePadrao = Number(req.params.semestrePadrao);

  if (!orientadorId || isNaN(orientadorId)) {
    return res.status(400).json({ success: false, message: 'ID de orientador inválido' });
  }

  if (!semestrePadrao || isNaN(semestrePadrao)) {
    return res.status(400).json({ success: false, message: 'Semestre padrão inválido' });
  }

  let connection;
  try {
    connection = await getConnection();

    // Esta função já foi corrigida
    const semestreAtivo = await obterSemestreAtivo(connection);
    
    if (!semestreAtivo) {
      return res.status(400).json({ 
        success: false,
        message: 'Não há semestre ativo no momento.' 
      });
    }

    const sql = `
      SELECT DISTINCT
        u.id,
        u.nome,
        u.email,
        d.semestre_padrao
      FROM Usuarios u
      JOIN Alunos a ON u.id = a.usuario_id
      JOIN Aluno_Oferta ao ON u.id = ao.aluno_id
      JOIN Disciplinas_Ofertas do_tbl ON ao.oferta_id = do_tbl.id
      JOIN Disciplinas d ON do_tbl.disciplina_id = d.id
      WHERE u.ativo = 1
      AND ao.status = 'Matriculado'
      AND do_tbl.semestre_id = ?        -- (semestreAtivo.id)
      AND d.semestre_padrao = ?        -- (semestrePadrao - O NOVO FILTRO)
      AND d.semestre_padrao IN (       -- (Verificação de segurança)
        SELECT DISTINCT d2.semestre_padrao
        FROM Disciplinas_Ofertas do2
        JOIN Disciplinas d2 ON do2.disciplina_id = d2.id
        WHERE do2.professor_responsavel = ? -- (orientadorId)
        AND do2.semestre_id = ?           -- (semestreAtivo.id)
      )
      AND u.id NOT IN (                -- (Verificação de aluno já em grupo)
        SELECT ug.usuario_id
        FROM Usuario_Grupo ug
        JOIN Grupos g ON ug.grupo_id = g.id
        WHERE g.semestre_id = ?           -- (semestreAtivo.id)
      )
      ORDER BY u.nome
    `;

    // CORREÇÃO: Trocado 'execute' por 'query'
    const [alunos] = await connection.query(sql, [
      semestreAtivo.id, 
      semestrePadrao,
      orientadorId, 
      semestreAtivo.id, 
      semestreAtivo.id
    ]);

    res.json({
      success: true,
      semestreAtivo: {
        id: semestreAtivo.id,
        periodo: semestreAtivo.periodo,
        ano: semestreAtivo.ano
      },
      alunos
    });

  } catch (error) {
    console.error('Erro ao buscar alunos disponíveis:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro ao buscar alunos disponíveis.', 
      error: error.message 
    });
  } finally {
    if (connection) await connection.release();
  }
});



module.exports = router;