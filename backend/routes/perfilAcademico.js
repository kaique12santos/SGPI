// backend/routes/perfilAcademico.js
const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');
const {extractRows} = require ('../utils/sqlUtils.js');

// libera conexão de forma segura (mysql2: release, oracledb: close, outros: end)
function safeRelease(conn) {
  if (!conn) return;
  try {
    if (typeof conn.release === 'function') return conn.release();
    if (typeof conn.close === 'function') return conn.close();
    if (typeof conn.end === 'function') return conn.end();
  } catch (e) {
    console.warn('safeRelease: erro ao liberar conexão:', e);
  }
}

// Rota: disciplinas matriculadas
router.get('/disciplinas/:id', async (req, res) => {
  const usuarioId = Number(req.params.id);
  if (!usuarioId) return res.status(400).json({ success: false, message: 'ID inválido' });

  let conn;
  try {
    conn = await getConnection();
    if (!conn || typeof conn.execute !== 'function') {
      console.error('Erro: conexão inválida obtida em /disciplinas', conn);
      return res.status(500).json({ success: false, message: 'Erro de conexão com o banco' });
    }

    const sql = `
      SELECT d.id, d.nome, d.codigo, d.descricao
      FROM Aluno_Oferta ao
      JOIN Disciplinas_Ofertas dof ON ao.oferta_id = dof.id
      JOIN Disciplinas d ON dof.disciplina_id = d.id
      WHERE ao.aluno_id = ?
    `;
    const result = await conn.execute(sql, [usuarioId]);

    const disciplinas = extractRows(result);
    // debug: se inesperado, log detalhado (apagar depois)
    if (!Array.isArray(disciplinas)) {
      console.error('disciplinas: formato inesperado do resultado', result);
    }
    return res.json({ success: true, disciplinas });

  } catch (err) {
    console.error('Erro na rota GET /perfilAcademico/disciplinas/:id ->', err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  } finally {
    safeRelease(conn);
  }
});

// Rota: grupos do aluno
router.get('/grupos/:id', async (req, res) => {
  const usuarioId = Number(req.params.id);
  if (!usuarioId) return res.status(400).json({ success: false, message: 'ID inválido' });

  let conn;
  try {
    conn = await getConnection();
    if (!conn || typeof conn.execute !== 'function') {
      console.error('Erro: conexão inválida obtida em /grupos', conn);
      return res.status(500).json({ success: false, message: 'Erro de conexão com o banco' });
    }

    const sql = `
      SELECT g.id, g.nome, g.descricao, g.semestre_id, ug.data_entrada
      FROM Usuario_Grupo ug
      JOIN Grupos g ON g.id = ug.grupo_id
      WHERE ug.usuario_id = ?
      ORDER BY g.data_criacao DESC
    `;
    const result = await conn.execute(sql, [usuarioId]);

    const grupos = extractRows(result);
    if (!Array.isArray(grupos)) console.error('grupos: formato inesperado do resultado', result);

    return res.json({ success: true, grupos });
  } catch (err) {
    console.error('Erro na rota GET /perfilAcademico/grupos/:id ->', err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  } finally {
    safeRelease(conn);
  }
});

// Rota: projetos com filtro por semestre
router.get('/projetos/:id', async (req, res) => {
  const usuarioId = Number(req.params.id);
  if (!usuarioId) return res.status(400).json({ success: false, message: 'ID inválido' });

  const semestreId = req.query.semestre ? Number(req.query.semestre) : null;

  let conn;
  try {
    conn = await getConnection();
    if (!conn || typeof conn.execute !== 'function') {
      console.error('Erro: conexão inválida obtida em /projetos', conn);
      return res.status(500).json({ success: false, message: 'Erro de conexão com o banco' });
    }

    let sql = `
      SELECT p.id, p.titulo, p.descricao, p.semestre_id, p.status, p.grupo_id
      FROM Usuario_Grupo ug
      JOIN Projetos p ON ug.grupo_id = p.grupo_id
      WHERE ug.usuario_id = ?
    `;
    const params = [usuarioId];
    if (semestreId) {
      sql += ' AND p.semestre_id = ?';
      params.push(semestreId);
    }
    sql += ' ORDER BY p.data_criacao DESC';

    const result = await conn.execute(sql, params);
    const projetos = extractRows(result);
    if (!Array.isArray(projetos)) console.error('projetos: formato inesperado do resultado', result);

    return res.json({ success: true, projetos });
  } catch (err) {
    console.error('Erro na rota GET /perfilAcademico/projetos/:id ->', err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  } finally {
    safeRelease(conn);
  }
});

module.exports = router;
