const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');
const {extractRows} = require ('../utils/sqlUtils.js');

// libera conexão de forma segura
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

/* ===============================
   Funções de Semestre (Global + Contextual)
=============================== */

// Global: pega 1 semestre "atual" sem contexto
async function getSemestreGlobalAtual(conn) {
  console.log('getSemestreGlobalAtual: iniciando busca do semestre global atual');
  
  // Pega o semestre mais recente baseado em ano e período
  const resAny = await conn.execute(`
    SELECT id
    FROM Semestres
    ORDER BY COALESCE(ano, 0) DESC, CAST(periodo AS UNSIGNED) DESC, id DESC
    LIMIT 1
  `);
  const rowsAny = extractRows(resAny);
  console.log('getSemestreGlobalAtual: resultado query:', rowsAny);
  const result = rowsAny.length ? rowsAny[0].id : null;
  console.log('getSemestreGlobalAtual: retorna semestre:', result);
  return result;
}

// Contextual: decide pelo papel
async function getSemestreContextual(conn, params = {}) {
  console.log('getSemestreContextual: entrada params:', params);
  const semestreIdExpl = Number(params.semestreIdExpl);
  if (semestreIdExpl) {
    console.log('getSemestreContextual: semestreIdExpl fornecido, retornando:', semestreIdExpl);
    return semestreIdExpl;
  }

  // a) Professor: usa Disciplinas_Ofertas.professor_responsavel
  if (Number(params.professorId)) {
    const pid = Number(params.professorId);
    console.log(`getSemestreContextual: tentando resolver por professorId=${pid}`);

    // Tenta pelo semestre com atividades mais recentes
    const rsAtv = await conn.execute(`
      SELECT atv.semestre_id
      FROM Atividades atv
      WHERE atv.professor_id = ?
      GROUP BY atv.semestre_id
      ORDER BY MAX(atv.data_criacao) DESC, atv.semestre_id DESC
      LIMIT 1
    `, [pid]);
    const rowsAtv = extractRows(rsAtv);
    console.log(`getSemestreContextual: resultado Atividades para professor ${pid}:`, rowsAtv);
    if (rowsAtv.length) {
      console.log('getSemestreContextual: semestre decidido pela última atividade do professor:', rowsAtv[0].semestre_id);
      return rowsAtv[0].semestre_id;
    }

    // Fallback: busca em Disciplinas_Ofertas onde ele é professor_responsavel
    console.log('getSemestreContextual: nenhuma atividade encontrada, consultando Disciplinas_Ofertas');
    const rsDO = await conn.execute(`
      SELECT semestre_id
      FROM Disciplinas_Ofertas
      WHERE professor_responsavel = ?
      ORDER BY semestre_id DESC
      LIMIT 1
    `, [pid]);
    const rowsDO = extractRows(rsDO);
    console.log(`getSemestreContextual: resultado Disciplinas_Ofertas para professor ${pid}:`, rowsDO);
    if (rowsDO.length) {
      console.log('getSemestreContextual: semestre decidido por Disciplinas_Ofertas:', rowsDO[0].semestre_id);
      return rowsDO[0].semestre_id;
    }
  }

  // b) Orientador: último semestre com projetos
  if (Number(params.orientadorId)) {
    const oid = Number(params.orientadorId);
    console.log(`getSemestreContextual: tentando resolver por orientadorId=${oid}`);

    const rsOri = await conn.execute(`
      SELECT p.semestre_id
      FROM Projetos p
      WHERE p.orientador_id = ?
      GROUP BY p.semestre_id
      ORDER BY MAX(p.data_criacao) DESC, p.semestre_id DESC
      LIMIT 1
    `, [oid]);
    const rowsOri = extractRows(rsOri);
    console.log(`getSemestreContextual: resultado Projetos para orientador ${oid}:`, rowsOri);
    if (rowsOri.length) {
      console.log('getSemestreContextual: semestre decidido pelo orientador:', rowsOri[0].semestre_id);
      return rowsOri[0].semestre_id;
    }
  }

  // c) Coordenador / sem contexto
  console.log('getSemestreContextual: sem contexto específico encontrado, chamando getSemestreGlobalAtual');
  const global = await getSemestreGlobalAtual(conn);
  console.log('getSemestreContextual: semestre global retornado:', global);
  return global;
}

/* ===============================
   📌 ADMINISTRADOR
=============================== */
router.get('/admin/total-usuarios', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    console.log('/admin/total-usuarios: iniciando rota');
    const result = await conn.execute(`SELECT COUNT(*) AS total FROM Usuarios`);
    const rows = extractRows(result);
    console.log('/admin/total-usuarios: rows:', rows);
    res.json({ success: true, total: rows[0]?.total ?? 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  } finally {
    safeRelease(conn);
  }
});

router.get('/admin/logs', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    console.log('/admin/logs: iniciando rota');
    const result = await conn.execute(`
      SELECT id, usuario_id, campo, valor_antigo, valor_novo, alterado_por, data_alteracao
      FROM Auditoria_Usuarios
      ORDER BY data_alteracao DESC
      LIMIT 10
    `);
    const rows = extractRows(result);
    console.log('/admin/logs: rows:', rows);
    
    // Formata para o frontend
    const logs = rows.map(r => ({
      id: r.id,
      acao: `${r.campo}: ${r.valor_antigo || 'N/A'} → ${r.valor_novo || 'N/A'}`,
      data: r.data_alteracao
    }));
    
    res.json({ success: true, logs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  } finally {
    safeRelease(conn);
  }
});

/* ===============================
   📌 COORDENADOR
=============================== */
router.get('/coordenador/total-projetos', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();

    console.log('/coordenador/total-projetos: req.query.semestre_id =', req.query.semestre_id);
    const semestreId = await getSemestreContextual(conn, {
      semestreIdExpl: req.query.semestre_id
    });
    console.log('/coordenador/total-projetos: semestreId decidido =', semestreId);

    const result = await conn.execute(
      `SELECT COUNT(*) AS total FROM Projetos WHERE semestre_id = ?`,
      [semestreId]
    );
    const rows = extractRows(result);
    console.log('/coordenador/total-projetos: rows:', rows);
    res.json({ success: true, total: rows[0]?.total ?? 0, semestre_id: semestreId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  } finally {
    safeRelease(conn);
  }
});

router.get('/coordenador/taxa-conclusao', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();

    console.log('/coordenador/taxa-conclusao: req.query.semestre_id =', req.query.semestre_id);
    const semestreId = await getSemestreContextual(conn, {
      semestreIdExpl: req.query.semestre_id
    });
    console.log('/coordenador/taxa-conclusao: semestreId decidido =', semestreId);

    const result = await conn.execute(
      `
      SELECT
        SUM(CASE WHEN status = 'Concluído' THEN 1 ELSE 0 END) AS concluidos,
        COUNT(*) AS total
      FROM Projetos
      WHERE semestre_id = ?
      `,
      [semestreId]
    );
    const rows = extractRows(result);
    console.log('/coordenador/taxa-conclusao: rows:', rows);
    const concluidos = rows[0]?.concluidos ?? 0;
    const total = rows[0]?.total ?? 0;
    const taxa = total > 0 ? Math.round((concluidos / total) * 100) : 0;
    console.log(`/coordenador/taxa-conclusao: concluidos=${concluidos}, total=${total}, taxa=${taxa}`);
    res.json({ success: true, taxa, semestre_id: semestreId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  } finally {
    safeRelease(conn);
  }
});

router.get('/coordenador/projetos-status', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();

    console.log('/coordenador/projetos-status: req.query.semestre_id =', req.query.semestre_id);
    const semestreId = await getSemestreContextual(conn, {
      semestreIdExpl: req.query.semestre_id
    });
    console.log('/coordenador/projetos-status: semestreId decidido =', semestreId);

    const result = await conn.execute(
      `
      SELECT status, COUNT(*) AS qtd
      FROM Projetos
      WHERE semestre_id = ?
      GROUP BY status
      `,
      [semestreId]
    );
    const rows = extractRows(result);
    console.log('/coordenador/projetos-status: rows:', rows);
    res.json({ success: true, data: rows, semestre_id: semestreId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  } finally {
    safeRelease(conn);
  }
});

/* ===============================
   📌 PROFESSOR
=============================== */
router.get('/professor/total-atividades/:id', async (req, res) => {
  const professorId = Number(req.params.id);
  let conn;
  try {
    conn = await getConnection();

    console.log(`/professor/total-atividades: professorId=${professorId}, req.query.semestre_id=`, req.query.semestre_id);
    const semestreId = await getSemestreContextual(conn, {
      semestreIdExpl: req.query.semestre_id,
      professorId
    });
    console.log('/professor/total-atividades: semestreId decidido =', semestreId);

    const result = await conn.execute(
      `SELECT COUNT(*) AS total
       FROM Atividades atv
       JOIN Disciplinas_Ofertas dof ON atv.oferta_id = dof.id
       WHERE atv.professor_id = ? AND dof.semestre_id = ?`,
      [professorId, semestreId]
    );
    const rows = extractRows(result);
    console.log('/professor/total-atividades: rows:', rows);
    res.json({ success: true, total: rows[0]?.total ?? 0, semestre_id: semestreId });
  } catch (err) {
    console.error('/professor/total-atividades erro:', err);
    res.status(500).json({ success: false });
  } finally {
    safeRelease(conn);
  }
});

router.get('/professor/entregas/:id', async (req, res) => {
  const professorId = Number(req.params.id);
  let conn;
  try {
    conn = await getConnection();

    console.log(`/professor/entregas: professorId=${professorId}, req.query.semestre_id=`, req.query.semestre_id);
    const semestreId = await getSemestreContextual(conn, {
      semestreIdExpl: req.query.semestre_id,
      professorId
    });
    console.log('/professor/entregas: semestreId decidido =', semestreId);

    const result = await conn.execute(
      `
      SELECT
        SUM(CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END) AS avaliadas,
        SUM(CASE WHEN a.id IS NULL  THEN 1 ELSE 0 END) AS pendentes
      FROM Entregas e
      JOIN Atividades atv ON e.atividade_id = atv.id
      JOIN Disciplinas_Ofertas dof ON atv.oferta_id = dof.id
      LEFT JOIN Avaliacoes a ON a.entrega_id = e.id
      WHERE atv.professor_id = ? AND dof.semestre_id = ?
      `,
      [professorId, semestreId]
    );
    const rows = extractRows(result);
    console.log('/professor/entregas: rows:', rows);
    res.json({
      success: true,
      avaliadas: rows[0]?.avaliadas ?? 0,
      pendentes: rows[0]?.pendentes ?? 0,
      semestre_id: semestreId
    });
  } catch (err) {
    console.error('/professor/entregas erro:', err);
    res.status(500).json({ success: false });
  } finally {
    safeRelease(conn);
  }
});

router.get('/professor/media-notas/:id', async (req, res) => {
  const professorId = Number(req.params.id);
  let conn;
  try {
    conn = await getConnection();

    console.log(`/professor/media-notas: professorId=${professorId}, req.query.semestre_id=`, req.query.semestre_id);
    const semestreId = await getSemestreContextual(conn, {
      semestreIdExpl: req.query.semestre_id,
      professorId
    });
    console.log('/professor/media-notas: semestreId decidido =', semestreId);

    const result = await conn.execute(
      `
      SELECT ROUND(AVG(av.nota), 2) AS media
      FROM Avaliacoes av
      JOIN Entregas e ON av.entrega_id = e.id
      JOIN Atividades atv ON e.atividade_id = atv.id
      JOIN Disciplinas_Ofertas dof ON atv.oferta_id = dof.id
      WHERE atv.professor_id = ? AND dof.semestre_id = ?
      `,
      [professorId, semestreId]
    );
    const rows = extractRows(result);
    console.log('/professor/media-notas: rows:', rows);
    res.json({ success: true, media: Number(rows[0]?.media ?? 0), semestre_id: semestreId });
  } catch (err) {
    console.error('/professor/media-notas erro:', err);
    res.status(500).json({ success: false });
  } finally {
    safeRelease(conn);
  }
});

router.get('/professor/reconsideracoes/:id', async (req, res) => {
  const professorId = Number(req.params.id);
  let conn;
  try {
    conn = await getConnection();

    console.log(`/professor/reconsideracoes: professorId=${professorId}`);
    const result = await conn.execute(
      `
      SELECT
        COUNT(rc.id) AS total,
        SUM(CASE WHEN rc.data_resposta IS NOT NULL THEN 1 ELSE 0 END) AS respondidos
      FROM Reconsideracoes rc
      JOIN Avaliacoes av ON rc.avaliacao_id = av.id
      WHERE av.professor_id = ?
      `,
      [professorId]
    );
    const rows = extractRows(result);
    console.log('/professor/reconsideracoes: rows:', rows);
    res.json({
      success: true,
      total: rows[0]?.total ?? 0,
      respondidos: rows[0]?.respondidos ?? 0
    });
  } catch (err) {
    console.error('/professor/reconsideracoes erro:', err);
    res.status(500).json({ success: false });
  } finally {
    safeRelease(conn);
  }
});

router.get('/professor/semestres-anteriores/:id', async (req, res) => {
  const professorId = Number(req.params.id);
  let conn;
  try {
    conn = await getConnection();

    console.log(`/professor/semestres-anteriores: professorId=${professorId}`);
    
    // Busca semestres onde o professor foi professor_responsavel em alguma oferta
    const result = await conn.execute(
      `
      SELECT DISTINCT s.id, s.ano, s.periodo, 
             CONCAT(s.periodo, 'º Semestre de ', s.ano) AS descricao
      FROM Disciplinas_Ofertas dof
      JOIN Semestres s ON dof.semestre_id = s.id
      WHERE dof.professor_responsavel = ?
      ORDER BY COALESCE(s.ano, 0) DESC, CAST(s.periodo AS UNSIGNED) DESC, s.id DESC
      `,
      [professorId]
    );
    const rows = extractRows(result);
    console.log('/professor/semestres-anteriores: rows:', rows);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('/professor/semestres-anteriores erro:', err);
    res.status(500).json({ success: false });
  } finally {
    safeRelease(conn);
  }
});

/* ===============================
   📌 ORIENTADOR
=============================== */
router.get('/orientador/projetos-ativos/:id', async (req, res) => {
  const id = Number(req.params.id);
  let conn;
  try {
    conn = await getConnection();

    console.log(`/orientador/projetos-ativos: id=${id}, req.query.semestre_id=`, req.query.semestre_id);
    const semestreId = await getSemestreContextual(conn, {
      semestreIdExpl: req.query.semestre_id,
      orientadorId: id
    });
    console.log('/orientador/projetos-ativos: semestreId decidido =', semestreId);

    const result = await conn.execute(
      `SELECT COUNT(*) AS total
       FROM Projetos
       WHERE orientador_id = ? AND semestre_id = ? AND status != 'Concluído'`,
      [id, semestreId]
    );
    const rows = extractRows(result);
    console.log('/orientador/projetos-ativos: rows:', rows);
    res.json({ success: true, total: rows[0]?.total ?? 0, semestre_id: semestreId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  } finally {
    safeRelease(conn);
  }
});

router.get('/orientador/projetos-status/:id', async (req, res) => {
  const id = Number(req.params.id);
  let conn;
  try {
    conn = await getConnection();

    console.log(`/orientador/projetos-status: id=${id}, req.query.semestre_id=`, req.query.semestre_id);
    const semestreId = await getSemestreContextual(conn, {
      semestreIdExpl: req.query.semestre_id,
      orientadorId: id
    });
    console.log('/orientador/projetos-status: semestreId decidido =', semestreId);

    const result = await conn.execute(
      `SELECT status, COUNT(*) AS qtd
       FROM Projetos
       WHERE orientador_id = ? AND semestre_id = ?
       GROUP BY status`,
      [id, semestreId]
    );
    const rows = extractRows(result);
    console.log('/orientador/projetos-status: rows:', rows);
    res.json({ success: true, data: rows, semestre_id: semestreId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  } finally {
    safeRelease(conn);
  }
});

router.get('/orientador/total-grupos/:id', async (req, res) => {
  const id = Number(req.params.id);
  let conn;
  try {
    conn = await getConnection();

    console.log(`/orientador/total-grupos: id=${id}, req.query.semestre_id=`, req.query.semestre_id);
    const semestreId = await getSemestreContextual(conn, {
      semestreIdExpl: req.query.semestre_id,
      orientadorId: id
    });
    console.log('/orientador/total-grupos: semestreId decidido =', semestreId);

    const result = await conn.execute(
      `SELECT COUNT(DISTINCT g.id) AS total
       FROM Grupos g
       JOIN Projetos p ON p.grupo_id = g.id
       WHERE p.orientador_id = ? AND p.semestre_id = ?`,
      [id, semestreId]
    );
    const rows = extractRows(result);
    console.log('/orientador/total-grupos: rows:', rows);
    res.json({ success: true, total: rows[0]?.total ?? 0, semestre_id: semestreId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  } finally {
    safeRelease(conn);
  }
});

router.get('/orientador/total-alunos/:id', async (req, res) => {
  const id = Number(req.params.id);
  let conn;
  try {
    conn = await getConnection();

    console.log(`/orientador/total-alunos: id=${id}, req.query.semestre_id=`, req.query.semestre_id);
    const semestreId = await getSemestreContextual(conn, {
      semestreIdExpl: req.query.semestre_id,
      orientadorId: id
    });
    console.log('/orientador/total-alunos: semestreId decidido =', semestreId);

    const result = await conn.execute(
      `SELECT COUNT(DISTINCT ug.usuario_id) AS total
       FROM Usuario_Grupo ug
       JOIN Grupos g ON g.id = ug.grupo_id
       JOIN Projetos p ON p.grupo_id = g.id
       WHERE p.orientador_id = ? AND p.semestre_id = ?`,
      [id, semestreId]
    );
    const rows = extractRows(result);
    console.log('/orientador/total-alunos: rows:', rows);
    res.json({ success: true, total: rows[0]?.total ?? 0, semestre_id: semestreId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  } finally {
    safeRelease(conn);
  }
});

router.get('/orientador/taxa-conclusao/:id', async (req, res) => {
  const id = Number(req.params.id);
  let conn;
  try {
    conn = await getConnection();

    console.log(`/orientador/taxa-conclusao: id=${id}, req.query.semestre_id=`, req.query.semestre_id);
    const semestreId = await getSemestreContextual(conn, {
      semestreIdExpl: req.query.semestre_id,
      orientadorId: id
    });
    console.log('/orientador/taxa-conclusao: semestreId decidido =', semestreId);

    const result = await conn.execute(
      `SELECT SUM(CASE WHEN status = 'Concluído' THEN 1 ELSE 0 END) AS concluidos,
              COUNT(*) AS total
       FROM Projetos
       WHERE orientador_id = ? AND semestre_id = ?`,
      [id, semestreId]
    );
    const rows = extractRows(result);
    console.log('/orientador/taxa-conclusao: rows:', rows);
    const concluidos = rows[0]?.concluidos ?? 0;
    const total = rows[0]?.total ?? 0;
    const taxa = total > 0 ? Math.round((concluidos / total) * 100) : 0;
    console.log(`/orientador/taxa-conclusao: concluidos=${concluidos}, total=${total}, taxa=${taxa}`);
    res.json({ success: true, taxa, semestre_id: semestreId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  } finally {
    safeRelease(conn);
  }
});

router.get('/orientador/historico-semestres/:id', async (req, res) => {
  const id = Number(req.params.id);
  let conn;
  try {
    conn = await getConnection();

    console.log(`/orientador/historico-semestres: id=${id}`);
    const result = await conn.execute(
      `SELECT DISTINCT s.id, s.ano, s.periodo, 
              CONCAT(s.periodo, 'º Semestre de ', s.ano) AS descricao
       FROM Projetos p
       JOIN Semestres s ON s.id = p.semestre_id
       WHERE p.orientador_id = ?
       ORDER BY COALESCE(s.ano, 0) DESC, CAST(s.periodo AS UNSIGNED) DESC, s.id DESC`,
      [id]
    );
    const rows = extractRows(result);
    console.log('/orientador/historico-semestres: rows:', rows);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  } finally {
    safeRelease(conn);
  }
});

module.exports = router;