const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');
const { extractRows } = require('../utils/sqlUtils.js');

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
   📌 ROTAS NOVAS (REST padrão)
=============================== */

// GET / - Lista todos os semestres com estatísticas
router.get('/', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    console.log('[GET /] listando todos os semestres');
    
    const result = await conn.execute(`
      SELECT 
        s.id, 
        s.periodo, 
        s.ano, 
        s.ativo,
        CONCAT(s.periodo, 'º Semestre de ', s.ano) AS descricao,
        COUNT(DISTINCT do_tbl.id) AS total_ofertas,
        COUNT(DISTINCT p.id) AS total_projetos
      FROM Semestres s
      LEFT JOIN Disciplinas_Ofertas do_tbl ON do_tbl.semestre_id = s.id
      LEFT JOIN Projetos p ON p.semestre_id = s.id
      GROUP BY s.id, s.periodo, s.ano, s.ativo
      ORDER BY COALESCE(s.ano, 0) DESC, CAST(s.periodo AS UNSIGNED) DESC
    `);
    
    const rows = extractRows(result);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[GET /] erro:', err);
    res.status(500).json({ success: false, message: 'Erro ao listar semestres', error: err.message });
  } finally {
    safeRelease(conn);
  }
});

// GET /ativo - Obter semestre ativo atual
router.get('/ativo', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    console.log('[GET /ativo] buscando semestre ativo');
    
    const result = await conn.execute(`
      SELECT 
        s.id, 
        s.periodo, 
        s.ano, 
        s.ativo,
        CONCAT(s.periodo, 'º Semestre de ', s.ano) AS descricao,
        COUNT(DISTINCT do_tbl.id) AS total_ofertas,
        COUNT(DISTINCT p.id) AS total_projetos
      FROM Semestres s
      LEFT JOIN Disciplinas_Ofertas do_tbl ON do_tbl.semestre_id = s.id
      LEFT JOIN Projetos p ON p.semestre_id = s.id
      WHERE s.ativo = 1
      GROUP BY s.id, s.periodo, s.ano, s.ativo
      LIMIT 1
    `);
    
    const rows = extractRows(result);
    
    if (!rows.length) {
      return res.status(404).json({ 
        success: false, 
        message: 'Nenhum semestre ativo encontrado' 
      });
    }
    
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[GET /ativo] erro:', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar semestre ativo', error: err.message });
  } finally {
    safeRelease(conn);
  }
});

// POST / - Criar novo semestre
router.post('/', async (req, res) => {
  const { periodo, ano } = req.body;
  
  if (!periodo || !ano) {
    return res.status(400).json({ 
      success: false, 
      message: 'Período e ano são obrigatórios' 
    });
  }
  
  let conn;
  try {
    conn = await getConnection();
    console.log(`[POST /] criando semestre ${periodo}/${ano}`);
    
    // Verificar se já existe
    const checkResult = await conn.execute(
      `SELECT id FROM Semestres WHERE periodo = ? AND ano = ?`,
      [periodo, ano]
    );
    const existing = extractRows(checkResult);
    
    if (existing.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Este semestre já existe' 
      });
    }
    
    const result = await conn.execute(
      `INSERT INTO Semestres (periodo, ano, ativo) VALUES (?, ?, 0)`,
      [periodo, ano]
    );
    
    const insertId = result?.rows?.insertId ?? result?.insertId ?? result?.[0]?.insertId;
    
    console.log('[POST /] semestre criado, id:', insertId);
    res.status(201).json({ 
      success: true, 
      message: `Semestre ${periodo}/${ano} criado com sucesso`,
      semestre_id: insertId,
      id: insertId
    });
  } catch (err) {
    console.error('[POST /] erro:', err);
    res.status(500).json({ success: false, message: 'Erro ao criar semestre', error: err.message });
  } finally {
    safeRelease(conn);
  }
});

/* =================================================================
   POST /:id/ativar - Ativa um semestre e migra dados (Processo MESTRE)
   ATUALIZADO: Removido migrarGruposEProjetos pois a lógica agora
   é sempre reiniciar os grupos.
================================================================= */
router.post('/:id/ativar', async (req, res) => {
  const semestreId = Number(req.params.id);

  const { 
    copiarProfessores = true, // Padrão FALSE pois professores mudam
    migrarApenasMatriculados = true 
    // migrarGruposEProjetos foi REMOVIDO daqui
  } = req.body;
  
  if (!semestreId || isNaN(semestreId)) {
    return res.status(400).json({ success: false, message: 'ID de semestre inválido' });
  }
  
  let conn;
  try {
    conn = await getConnection();
    
    console.log(`[POST /:id/ativar] Chamando sp_ativar_e_migrar_semestre_completo para ${semestreId}`);
    
    // ATENÇÃO: A ordem dos parâmetros deve bater com a nova PROCEDURE no banco
    // 1. ID Novo
    // 2. Copiar Professores?
    // 3. Migrar Apenas Matriculados?
    const params = [
      semestreId,
      copiarProfessores ? 1 : 0,
      migrarApenasMatriculados ? 1 : 0
    ];

    const result = await conn.execute(
      `CALL sp_ativar_e_migrar_semestre_completo(?, ?, ?)`, // Apenas 3 interrogações agora
      params
    );
    
    // Tratamento de retorno da procedure
    let message = 'Semestre ativado com sucesso. Grupos reiniciados.'; 
    
    if (Array.isArray(result) && result.length > 0) {
      const lastResultSet = result[result.length - 1];
      if (Array.isArray(lastResultSet) && lastResultSet.length > 0) {
        message = lastResultSet[0]?.mensagem || message;
      }
      else if (Array.isArray(lastResultSet?.[0]) && lastResultSet[0].length > 0) {
         message = lastResultSet[0][0]?.mensagem || message;
      }
    }

    console.log(`[POST /:id/ativar] Sucesso: ${message}`);
    res.json({ 
      success: true, 
      message: message 
    });

  } catch (err) {
    console.error(`[POST /:id/ativar] Erro na migração:`, err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Erro ao ativar semestre', 
      error: err.message 
    });
  } finally {
    safeRelease(conn);
  }
});

// POST /:id/gerar-ofertas - Gerar ofertas manualmente para um semestre (sem ativar)
router.post('/:id/gerar-ofertas', async (req, res) => {
  const semestreId = Number(req.params.id);
  const { copiarProfessores = false } = req.body; // Padrão false aqui também
  
  if (!semestreId || isNaN(semestreId)) {
    return res.status(400).json({ success: false, message: 'ID de semestre inválido' });
  }
  
  let conn;
  try {
    conn = await getConnection();
    await conn.beginTransaction();
    
    console.log(`[POST /:id/gerar-ofertas] iniciando (copiarProfessores=${copiarProfessores})`);
    
    // Verificar se o semestre existe
    const checkResult = await conn.execute(
      `SELECT id, periodo, ano FROM Semestres WHERE id = ?`,
      [semestreId]
    );
    const semestre = extractRows(checkResult);
    
    if (!semestre.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Semestre não encontrado' });
    }
    
    // Gerar ofertas
    try {
      await conn.execute(
        `CALL sp_gerar_ofertas_semestre(?, ?)`,
        [semestreId, copiarProfessores ? 1 : 0]
      );
    } catch (spErr) {
      await conn.rollback();
      return res.status(500).json({ 
        success: false, 
        message: 'Stored procedure não encontrada ou erro ao executar', 
        error: spErr.message 
      });
    }
    
    await conn.commit();
    
    console.log(`[POST /:id/gerar-ofertas] sucesso`);
    res.json({ 
      success: true, 
      message: `Ofertas geradas para o semestre ${semestre[0].periodo}/${semestre[0].ano}` 
    });
  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch(e) { console.error('Erro no rollback:', e); }
    }
    console.error(`[POST /:id/gerar-ofertas] erro:`, err);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao gerar ofertas', 
      error: err.message 
    });
  } finally {
    safeRelease(conn);
  }
});

// DELETE /:id - Deletar semestre (apenas se não tiver dados vinculados)
router.delete('/:id', async (req, res) => {
  const semestreId = Number(req.params.id);
  
  if (!semestreId || isNaN(semestreId)) {
    return res.status(400).json({ success: false, message: 'ID de semestre inválido' });
  }
  
  let conn;
  try {
    conn = await getConnection();
    await conn.beginTransaction();
    
    console.log(`[DELETE /:id] verificando vínculos do semestre ${semestreId}`);
    
    const checkResult = await conn.execute(`
      SELECT 
        (SELECT COUNT(*) FROM Disciplinas_Ofertas WHERE semestre_id = ?) AS ofertas,
        (SELECT COUNT(*) FROM Projetos WHERE semestre_id = ?) AS projetos,
        (SELECT COUNT(*) FROM Grupos WHERE semestre_id = ?) AS grupos
    `, [semestreId, semestreId, semestreId]);
    
    const check = extractRows(checkResult)[0];
    
    if (check.ofertas > 0 || check.projetos > 0 || check.grupos > 0) {
      await conn.rollback();
      return res.status(400).json({ 
        success: false, 
        message: `Não é possível excluir: semestre possui ${check.ofertas} ofertas, ${check.projetos} projetos e ${check.grupos} grupos vinculados` 
      });
    }
    
    const result = await conn.execute(`DELETE FROM Semestres WHERE id = ?`, [semestreId]);
    const affected = result?.affectedRows ?? result?.rows?.affectedRows ?? 0;
    
    if (!affected) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Semestre não encontrado' });
    }
    
    await conn.commit();
    
    console.log(`[DELETE /:id] sucesso`);
    res.json({ success: true, message: 'Semestre excluído com sucesso' });
  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch(e) { console.error('Erro no rollback:', e); }
    }
    console.error(`[DELETE /:id] erro:`, err);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao excluir semestre', 
      error: err.message 
    });
  } finally {
    safeRelease(conn);
  }
});

module.exports = router;