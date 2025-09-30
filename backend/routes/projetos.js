const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');

// GET - Listar grupos (com filtro opcional por semestre)
router.get('/api/grupos', async (req, res) => {
  const connection = await getConnection();
  const semestreId = req.query.semestre_id;

  try {
    let query, params;
    
    if (semestreId) {
      query = `
        SELECT g.id, g.nome, g.semestre_id, s.periodo as semestre_periodo, s.ano
        FROM Grupos g
        LEFT JOIN Semestres s ON g.semestre_id = s.id
        WHERE g.semestre_id = ?
        ORDER BY g.nome`;
      params = [semestreId];
    } else {
      query = `
        SELECT g.id, g.nome, g.semestre_id, s.periodo as semestre_periodo, s.ano
        FROM Grupos g
        LEFT JOIN Semestres s ON g.semestre_id = s.id
        ORDER BY s.periodo, g.nome`;
      params = [];
    }

    const [rows] = await connection.execute(query, params);
    res.json({ success: true, grupos: rows });
  } catch (err) {
    console.error('Erro ao buscar grupos:', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar grupos.' });
  } finally {
    if (connection) await connection.end();
  }
});

// GET - Listar projetos do orientador
router.get('/api/projetos', async (req, res) => {
  const orientadorId = parseInt(req.query.orientador_id, 10);
  const connection = await getConnection();

  try {
    if (isNaN(orientadorId)) {
      return res.status(400).json({ success: false, message: 'ID de orientador inválido.' });
    }

    const [rows] = await connection.execute(
      `SELECT 
        p.id,
        p.titulo,
        p.descricao,
        p.grupo_id,
        g.nome AS grupo_nome,
        p.semestre_id,
        s.periodo as semestre_periodo,
        s.ano as semestre_ano,
        p.status,
        p.data_criacao,
        p.data_atualizacao
      FROM Projetos p
      LEFT JOIN Grupos g ON p.grupo_id = g.id
      LEFT JOIN Semestres s ON p.semestre_id = s.id
      WHERE p.orientador_id = ?
      ORDER BY p.data_criacao DESC`,
      [orientadorId]
    );

    // No MySQL, TEXT já vem como string, não precisa de lobToString
    const projetos = rows.map(p => ({
      id: p.id,
      titulo: p.titulo,
      descricao: p.descricao, // já é string no MySQL
      grupo_id: p.grupo_id,
      grupo_nome: p.grupo_nome,
      semestre_id: p.semestre_id,
      semestre_periodo: p.semestre_periodo,
      semestre_ano: p.semestre_ano,
      status: p.status,
      data_criacao: p.data_criacao,
      data_atualizacao: p.data_atualizacao
    }));
    
    res.json({ success: true, projetos });
    
  } catch (err) {
    console.error('Erro ao buscar projetos:', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar projetos.' });
  } finally {
    if (connection) await connection.end();
  }
});

// POST - Criar novo projeto
router.post('/api/projetos', async (req, res) => {
  const { titulo, descricao, grupo_id, orientador_id, semestre_id } = req.body;

  const connection = await getConnection();
  try {
    if (!titulo || !grupo_id || !orientador_id || !semestre_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Preencha todos os campos obrigatórios.' 
      });
    }

    // Verificar se o grupo existe e pertence ao semestre
    const [grupoCheck] = await connection.execute(
      `SELECT id FROM Grupos WHERE id = ? AND semestre_id = ?`,
      [grupo_id, semestre_id]
    );

    if (grupoCheck.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Grupo não encontrado ou não pertence ao semestre informado.' 
      });
    }

    await connection.execute(
      `INSERT INTO Projetos (titulo, descricao, grupo_id, orientador_id, semestre_id)
       VALUES (?, ?, ?, ?, ?)`,
      [titulo, descricao, grupo_id, orientador_id, semestre_id]
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
    if (connection) await connection.end();
  }
});

// PUT - Atualizar projeto
router.put('/api/projetos/:id', async (req, res) => {
  const projetoId = parseInt(req.params.id, 10);
  const { titulo, descricao, semestre_id, status, orientador_id } = req.body;

  const connection = await getConnection();

  try {
    if (isNaN(projetoId)) {
      return res.status(400).json({ success: false, message: 'ID de projeto inválido.' });
    }

    // Verificar se o projeto pertence ao orientador (segurança)
    if (orientador_id) {
      const [verificacao] = await connection.execute(
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

    const [result] = await connection.execute(
      `UPDATE Projetos
       SET titulo = ?,
           descricao = ?,
           semestre_id = ?,
           status = ?,
           data_atualizacao = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [titulo, descricao, semestre_id, status, projetoId]
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
    if (connection) await connection.end();
  }
});

// DELETE - Excluir projeto
router.delete('/api/projetos/:id', async (req, res) => {
  const projetoId = parseInt(req.params.id, 10);
  const orientadorId = parseInt(req.query.orientador_id || req.body.orientador_id, 10);
  const connection = await getConnection();

  try {
    if (isNaN(projetoId)) {
      return res.status(400).json({ success: false, message: 'ID de projeto inválido.' });
    }

    // Verificar permissão se orientador_id foi fornecido
    if (!isNaN(orientadorId)) {
      const [verificacao] = await connection.execute(
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

    const [result] = await connection.execute(
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
    if (connection) await connection.end();
  }
});

// GET - Listar semestres para dropdown
router.get('/api/semestres', async (req, res) => {
  const connection = await getConnection();

  try {
    const [rows] = await connection.execute(
      `SELECT id, periodo, ano, descricao, ativo
       FROM Semestres
       WHERE ativo = 1
       ORDER BY periodo`
    );

    res.json({ success: true, semestres: rows });
  } catch (err) {
    console.error('Erro ao buscar semestres:', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar semestres.' });
  } finally {
    if (connection) await connection.end();
  }
});

module.exports = router;