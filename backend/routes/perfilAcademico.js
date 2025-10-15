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
// rota para update das diciplinas dos alunos
router.put('/disciplinas/:id', async (req, res) => {
  const alunoId = Number(req.params.id);
  const { disciplinas: disciplinasBody } = req.body;
  
  console.log("--------------- INÍCIO DA REQUISIÇÃO PUT ---------------");
  console.log("Aluno ID:", alunoId);
  console.log("Disciplinas recebidas no Body (disciplinasBody):", disciplinasBody);

  if (!alunoId || !Array.isArray(disciplinasBody)) {
    console.log("Erro: Dados inválidos (alunoId ou disciplinasBody).");
    return res.status(400).json({ success: false, message: "Dados inválidos." });
  }

  let conn;
  try {
    conn = await getConnection();
    await conn.query('START TRANSACTION');
    console.log("Transação iniciada.");

    // Obter as ofertas IDs que o aluno *já está* matriculado
    const matriculasAtuaisQueryResult = await conn.execute(
      `SELECT ao.oferta_id, do.disciplina_id
       FROM Aluno_Oferta ao
       JOIN Disciplinas_Ofertas do ON ao.oferta_id = do.id
       WHERE ao.aluno_id = ?`,
      [alunoId]
    );
    const matriculasAtuaisMap = new Map(matriculasAtuaisQueryResult.rows.map(row => [row.disciplina_id, row.oferta_id]));
    
    console.log("Matrículas atuais do aluno (disciplina_id -> oferta_id):", Array.from(matriculasAtuaisMap.entries()));

    // Obter as ofertas IDs correspondentes às disciplinas enviadas no body
    let ofertasNovasQueryResult = { rows: [] };
    if (disciplinasBody.length > 0) {
      const placeholders = disciplinasBody.map(() => "?").join(",");
      ofertasNovasQueryResult = await conn.execute(
        `SELECT id, disciplina_id FROM Disciplinas_Ofertas WHERE disciplina_id IN (${placeholders})`,
        disciplinasBody
      );
    }
    const disciplinasNovasSet = new Set(disciplinasBody);
    
    console.log("Ofertas novas do Body (id, disciplina_id):", ofertasNovasQueryResult.rows);
    console.log("Disciplinas novas do Body (Set):", Array.from(disciplinasNovasSet));

    // --- Lógica de INSERÇÃO (Adicionar novas matrículas) ---
    console.log("--- Iniciando lógica de INSERÇÃO ---");
    for (const disciplinaId of disciplinasBody) {
      if (!matriculasAtuaisMap.has(disciplinaId)) {
        const ofertaParaInserir = ofertasNovasQueryResult.rows.find(o => o.disciplina_id === disciplinaId);
        if (ofertaParaInserir) {
          console.log(`INSERT: aluno ${alunoId} na oferta ${ofertaParaInserir.id} (disciplina ${disciplinaId})`);
          await conn.execute(
            `INSERT INTO Aluno_Oferta (aluno_id, oferta_id, status, data_matricula) VALUES (?, ?, 'Matriculado', CURRENT_TIMESTAMP)`,
            [alunoId, ofertaParaInserir.id]
          );
        } else {
          console.warn(`AVISO: Disciplina ${disciplinaId} no body não possui oferta correspondente.`);
        }
      } else {
        console.log(`SKIP INSERT: aluno ${alunoId} já matriculado na disciplina ${disciplinaId}`);
      }
    }

    // --- Lógica de DELEÇÃO (Remover matrículas que não estão mais no body) ---
    console.log("--- Iniciando lógica de DELEÇÃO ---");
    for (const [disciplinaIdAntiga, ofertaIdAntiga] of matriculasAtuaisMap.entries()) {
      if (!disciplinasNovasSet.has(disciplinaIdAntiga)) {
        console.log(`DELETE: aluno ${alunoId} da oferta ${ofertaIdAntiga} (disciplina ${disciplinaIdAntiga})`);
        await conn.execute(
          `DELETE FROM Aluno_Oferta WHERE aluno_id = ? AND oferta_id = ?`,
          [alunoId, ofertaIdAntiga]
        );
      } else {
        console.log(`SKIP DELETE: disciplina ${disciplinaIdAntiga} ainda marcada.`);
      }
    }

    await conn.query('COMMIT');
    console.log("Transação confirmada.");
    res.json({ success: true, message: "Disciplinas atualizadas com sucesso!" });

  } catch (err) {
    console.error("Erro ao atualizar disciplinas:", err);
    if (conn) {
      await conn.query('ROLLBACK');
      console.log("Transação revertida.");
    }
    res.status(500).json({ success: false, message: "Erro interno no servidor" });
  } finally {
    safeRelease(conn);
    console.log("--------------- FIM DA REQUISIÇÃO PUT ---------------");
  }
});
// rota para listar disciplinas disponíveis para o aluno
router.get('/disciplinas-disponiveis/:id', async (req, res) => {
  const alunoId = Number(req.params.id);
  if (!alunoId)
    return res.status(400).json({ success: false, message: "ID do aluno inválido." });

  let conn;
  try {
    conn = await getConnection();

    // Busca disciplinas já matriculadas (Aluno_Oferta → Disciplinas_Ofertas → Disciplinas)
    const matriculadasResult = await conn.execute(
      `SELECT do.disciplina_id
         FROM Aluno_Oferta ao
         JOIN Disciplinas_Ofertas do ON ao.oferta_id = do.id
        WHERE ao.aluno_id = ?`,
      [alunoId]
    );
    const matriculadasIds = matriculadasResult.rows.map(r => r.disciplina_id);

    // Busca todas as disciplinas disponíveis (grade completa)
    const todasResult = await conn.execute(
      `SELECT d.id, d.nome, d.codigo, do.semestre_id
         FROM Disciplinas d
         JOIN Disciplinas_Ofertas do ON d.id = do.disciplina_id
        ORDER BY do.semestre_id, d.nome`
    );

    if (!todasResult.rows || todasResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Nenhuma disciplina disponível encontrada."
      });
    }

    // Marca as disciplinas que o aluno já está matriculado
    const disciplinas = todasResult.rows.map(d => ({
      id: d.id,
      nome: d.nome,
      codigo: d.codigo,
      semestre_id: d.semestre_id,
      matriculado: matriculadasIds.includes(d.id)
    }));

    res.json({
      success: true,
      disciplinas
    });

  } catch (err) {
    console.error("Erro ao buscar disciplinas disponíveis do aluno:", err);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor ao buscar disciplinas."
    });
  } finally {
    safeRelease(conn);
  }
});

module.exports = router;
