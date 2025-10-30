const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js'); 

// ==========================================================
// Rota para buscar Semestres
// ==========================================================
router.get('/api/semestres', async (req, res) => {
  const connection = await getConnection(); 
  const apenasAtivos = req.query.ativo === '1'; 

  try {
    let querySql = `
      SELECT id, periodo, ano
      FROM Semestres
    `;
    if (apenasAtivos) {
      querySql += ` WHERE ativo = 1`; 
    }
    querySql += ` ORDER BY ano DESC, periodo DESC`;
    
    // MUDANÇA: Trocado execute por query e voltado para [rows]
    const [rows] = await connection.query(querySql); 
    
    // Formata para melhor exibição (ex: "2/2025")
    const semestres = rows.map(s => ({
      id: s.id,
      descricao: `${s.periodo}/${s.ano}`
    }));

    res.json({ success: true, semestres: semestres });
  } catch (err) {
    console.error('Erro ao buscar semestres:', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar semestres.' });
  } finally {
    if (connection) connection.release(); 
  }
});

// ==========================================================
// Rota para buscar Disciplinas do Orientador
// ==========================================================
router.get('/api/disciplinas', async (req, res) => {
  const connection = await getConnection();
  const orientadorId = req.query.orientador_id;

  try {
    if (!orientadorId) {
      return res.status(400).json({ success: false, message: 'ID do orientador é obrigatório.' });
    }

    const querySql = `
      SELECT DISTINCT d.id, d.nome 
      FROM Disciplinas d
      JOIN Disciplinas_Ofertas do_tbl ON d.id = do_tbl.disciplina_id
      WHERE do_tbl.professor_responsavel = ?
      AND d.nome LIKE 'Orientação%'
      ORDER BY d.nome`;
    
    // MUDANÇA: Trocado execute por query e voltado para [rows]
    const [rows] = await connection.query(querySql, [orientadorId]);

    res.json({ success: true, disciplinas: rows });
    
  } catch (err) {
    console.error('Erro ao buscar disciplinas:', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar disciplinas.' });
  } finally {
    if (connection) connection.release();
  }
});

// ==========================================================
// CORRIGIDO: Rota de Grupos agora filtra por disciplina_id e orientador_id
// ==========================================================
router.get('/api/grupos', async (req, res) => {
  const connection = await getConnection();
  // MODIFICADO: Lendo os filtros corretos
  const disciplinaId = req.query.disciplina_id; 
  const orientadorId = req.query.orientador_id; 

  try {
    let querySql, params;
    
    // MODIFICADO: Filtro principal agora é a disciplina E orientador
    if (disciplinaId && orientadorId) {
      querySql = `
        SELECT g.id, g.nome
        FROM Grupos g
        WHERE g.disciplina_id = ? AND g.orientador_id = ?
        ORDER BY g.nome`;
      params = [disciplinaId, orientadorId];
    } else {
      // Se nenhum filtro for passado, retorna lista vazia
      return res.json({ success: true, grupos: [] });
    }

    // Usando .query() como corrigimos da última vez
    const [rows] = await connection.query(querySql, params);
    res.json({ success: true, grupos: rows });
    
  } catch (err) {
    console.error('Erro ao buscar grupos:', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar grupos.' });
  } finally {
    if (connection) connection.release();
  }
});
// ==========================================================
// Rota de Listar Projetos
// ==========================================================
router.get('/api/projetos', async (req, res) => {
  const orientadorId = parseInt(req.query.orientador_id, 10);
  const connection = await getConnection();

  try {
    if (isNaN(orientadorId)) {
      return res.status(400).json({ success: false, message: 'ID de orientador inválido.' });
    }

    const querySql = `
      SELECT 
        p.id, p.titulo, p.descricao, p.grupo_id,
        g.nome AS grupo_nome,
        p.semestre_id,
        s.periodo as semestre_periodo,
        s.ano as semestre_ano,
        d.semestre_padrao,
        p.disciplina_id,
        d.nome AS disciplina_nome,
        p.status
      FROM Projetos p
      LEFT JOIN Grupos g ON p.grupo_id = g.id
      LEFT JOIN Semestres s ON p.semestre_id = s.id
      LEFT JOIN Disciplinas d ON p.disciplina_id = d.id
      WHERE p.orientador_id = ?
      ORDER BY p.data_criacao DESC`;
      
    // MUDANÇA: Trocado execute por query e voltado para [rows]
    const [rows] = await connection.query(querySql, [orientadorId]);

    const projetos = rows.map(p => ({
      id: p.id,
      titulo: p.titulo,
      descricao: p.descricao,
      grupo_id: p.grupo_id,
      grupo_nome: p.grupo_nome,
      semestre_id: p.semestre_id,
      semestre_formatado: (p.semestre_periodo && p.semestre_ano) ? `${p.semestre_periodo}/${p.semestre_ano}` : 'N/A',
      semestre_padrao: p.semestre_padrao,
      disciplina_id: p.disciplina_id,
      disciplina_nome: p.disciplina_nome,
      status: p.status
    }));
    
    res.json({ success: true, projetos });
    
  } catch (err) {
    console.error('Erro ao buscar projetos:', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar projetos.' });
  } finally {
    if (connection) connection.release();
  }
});

// ==========================================================
// Rota de Criar Projeto
// ==========================================================
router.post('/api/projetos', async (req, res) => {
  // MODIFICADO: 'semestre_id' removido da desestruturação
  const { titulo, descricao, grupo_id, orientador_id, disciplina_id } = req.body;

  const connection = await getConnection();
  try {
    // MODIFICADO: Validação não checa mais 'semestre_id'
    if (!titulo || !grupo_id || !orientador_id || !disciplina_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Preencha todos os campos obrigatórios.' 
      });
    }

    // NOVO: Buscar o 'semestre_id' a partir do 'grupo_id'
    let semestre_id_buscado;
    const [grupoCheck] = await connection.query(
      `SELECT semestre_id FROM Grupos WHERE id = ?`,
      [grupo_id]
    );

    if (grupoCheck.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Grupo não encontrado.' 
      });
    }
    // Aqui está o semestre_id que precisamos
    semestre_id_buscado = grupoCheck[0].semestre_id; 

    // MODIFICADO: Query de INSERT usa o 'semestre_id_buscado'
    await connection.query(
      `INSERT INTO Projetos (titulo, descricao, grupo_id, orientador_id, semestre_id, disciplina_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [titulo, descricao, grupo_id, orientador_id, semestre_id_buscado, disciplina_id]
    );

    res.json({ success: true, message: 'Projeto criado com sucesso!' });
  } catch (err) {
    console.error('Erro ao criar projeto:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao criar projeto.', 
      error: err.message 
    });
  } finally {
    if (connection) connection.release();
  }
});

// ==========================================================
// Rota de Atualizar Projeto
// ==========================================================
router.put('/api/projetos/:id', async (req, res) => {
  const projetoId = parseInt(req.params.id, 10);
  const { titulo, descricao, semestre_id, status, disciplina_id, orientador_id } = req.body;
  const connection = await getConnection();

  try {
    if (isNaN(projetoId)) {
      return res.status(400).json({ success: false, message: 'ID de projeto inválido.' });
    }

    if (orientador_id) {
      // MUDANÇA: Trocado execute por query
      const [verificacao] = await connection.query(
        `SELECT id FROM Projetos WHERE id = ? AND orientador_id = ?`,
        [projetoId, orientador_id]
      );

      if (verificacao.length === 0) {
        return res.status(403).json({ 
          success: false, 
          message: 'Projeto não encontrado ou sem permissão.' 
        });
      }
    }

    // MUDANÇA: Trocado execute por query
    const [result] = await connection.query(
      `UPDATE Projetos
       SET titulo = ?, descricao = ?, semestre_id = ?,
           status = ?, disciplina_id = ?, data_atualizacao = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [titulo, descricao, semestre_id, status, disciplina_id, projetoId]
    );

    if (result.affectedRows > 0) {
      res.json({ success: true, message: 'Projeto atualizado com sucesso.' });
    } else {
      res.status(404).json({ success: false, message: 'Projeto não encontrado.' });
    }
  } catch (err) {
    console.error('Erro ao atualizar projeto:', err);
    res.status(500).json({ success: false, message: 'Erro ao atualizar projeto.' });
  } finally {
    if (connection) connection.release();
  }
});

// ==========================================================
// Rota de Excluir projeto
// ==========================================================
router.delete('/api/projetos/:id', async (req, res) => {
  const projetoId = parseInt(req.params.id, 10);
  const orientadorId = parseInt(req.query.orientador_id || req.body.orientador_id, 10);
  const connection = await getConnection();

  try {
    if (isNaN(projetoId)) {
      return res.status(400).json({ success: false, message: 'ID de projeto inválido.' });
    }

    if (!isNaN(orientadorId)) {
      // MUDANÇA: Trocado execute por query
      const [verificacao] = await connection.query(
        `SELECT id FROM Projetos WHERE id = ? AND orientador_id = ?`,
        [projetoId, orientadorId]
      );

      if (verificacao.length === 0) {
        return res.status(403).json({ 
          success: false, 
          message: 'Projeto não encontrado ou sem permissão.' 
        });
      }
    }

    // MUDANÇA: Trocado execute por query
    const [result] = await connection.query(
      `DELETE FROM Projetos WHERE id = ?`,
      [projetoId]
    );

    if (result.affectedRows > 0) {
      res.json({ success: true, message: 'Projeto deletado com sucesso.' });
    } else {
      res.status(404).json({ success: false, message: 'Projeto não encontrado.' });
    }
  } catch (err) {
    console.error('Erro ao deletar projeto:', err);
    res.status(500).json({ success: false, message: 'Erro ao deletar projeto.' });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;