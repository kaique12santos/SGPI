// const express = require('express');
// const router = express.Router();
// const { getConnection } = require('../conexaoMysql.js');
// const { extractRows } = require('../utils/sqlUtils.js');

// function safeRelease(conn) {
//   if (!conn) return;
//   try {
//     if (typeof conn.release === 'function') return conn.release();
//     if (typeof conn.close === 'function') return conn.close();
//     if (typeof conn.end === 'function') return conn.end();
//   } catch (e) {
//     console.warn('safeRelease: erro ao liberar conexão:', e);
//   }
// }

// /* ===============================
//    GET /api/semestres/listar
//    Lista todos os semestres ordenados
// =============================== */
// router.get('/listar', async (req, res) => {
//   let conn;
//   try {
//     conn = await getConnection();

//     const result = await conn.execute(`
//       SELECT id, periodo, ano, ativo,
//              CONCAT(periodo, 'º Semestre de ', ano) AS descricao
//       FROM Semestres
//       ORDER BY ano DESC, CAST(periodo AS UNSIGNED) DESC
//     `);
//     const rows = extractRows(result);

//     console.log('[/semestres/listar] Semestres encontrados:', rows.length);
//     res.json({ success: true, semestres: rows });
//   } catch (err) {
//     console.error('[/semestres/listar] Erro:', err);
//     res.status(500).json({ success: false, message: err.message });
//   } finally {
//     safeRelease(conn);
//   }
// });

// /* ===============================
//    POST /api/semestres/criar-proximo
//    Cria o próximo semestre (auto ou manual)
//    Body (opcional): { periodo: '1', ano: 2026 }
// =============================== */
// router.post('/criar-proximo', async (req, res) => {
//   let conn;
//   try {
//     conn = await getConnection();

//     // 1. Busca o semestre mais recente
//     const resSemAtual = await conn.execute(`
//       SELECT ano, periodo 
//       FROM Semestres 
//       ORDER BY ano DESC, CAST(periodo AS UNSIGNED) DESC 
//       LIMIT 1
//     `);
//     const rowsSemAtual = extractRows(resSemAtual);

//     let novoAno, novoPeriodo;

//     // 2. Determina o próximo semestre
//     if (req.body.ano && req.body.periodo) {
//       // Modo Manual
//       novoAno = Number(req.body.ano);
//       novoPeriodo = String(req.body.periodo);
      
//       console.log('[/criar-proximo] Modo Manual:', { novoPeriodo, novoAno });
//     } else {
//       // Modo Automático
//       if (!rowsSemAtual.length) {
//         // Se não existe nenhum, cria o primeiro semestre do ano atual
//         const hoje = new Date();
//         novoAno = hoje.getFullYear();
//         novoPeriodo = '1';
//         console.log('[/criar-proximo] Primeiro semestre do sistema:', { novoPeriodo, novoAno });
//       } else {
//         const atual = rowsSemAtual[0];
        
//         // Lógica: 1 → 2 (mesmo ano), 2 → 1 (próximo ano)
//         if (atual.periodo === '1') {
//           novoAno = atual.ano;
//           novoPeriodo = '2';
//         } else {
//           novoAno = atual.ano + 1;
//           novoPeriodo = '1';
//         }
        
//         console.log('[/criar-proximo] Modo Automático:', { atual, proximo: { novoPeriodo, novoAno } });
//       }
//     }

//     // Validações
//     if (!['1', '2'].includes(novoPeriodo)) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Período inválido. Use "1" ou "2".' 
//       });
//     }

//     if (novoAno < 2020 || novoAno > 2050) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Ano inválido. Deve estar entre 2020 e 2050.' 
//       });
//     }

//     // 3. Verifica se já existe
//     const resVerifica = await conn.execute(
//       `SELECT id FROM Semestres WHERE ano = ? AND periodo = ?`,
//       [novoAno, novoPeriodo]
//     );
//     const rowsVerifica = extractRows(resVerifica);

//     if (rowsVerifica.length) {
//       console.log('[/criar-proximo] Semestre já existe:', { novoPeriodo, novoAno });
//       return res.status(400).json({ 
//         success: false, 
//         message: `Semestre ${novoPeriodo}/${novoAno} já existe no sistema.` 
//       });
//     }

//     // 4. Cria o novo semestre (INATIVO por padrão)
//     const resInsert = await conn.execute(
//       `INSERT INTO Semestres (periodo, ano, ativo) VALUES (?, ?, 0)`,
//       [novoPeriodo, novoAno]
//     );

//     const semestreId = resInsert?.rows?.insertId ?? resInsert?.insertId ?? resInsert?.[0]?.insertId;

//     console.log('[/criar-proximo] Semestre criado com sucesso (inativo):', { 
//       id: semestreId, 
//       periodo: novoPeriodo, 
//       ano: novoAno 
//     });

//     res.json({ 
//       success: true, 
//       message: `Semestre ${novoPeriodo}/${novoAno} criado com sucesso! Use "Ativar Semestre" para torná-lo o semestre atual.`,
//       semestre_id: semestreId,
//       periodo: novoPeriodo,
//       ano: novoAno,
//       ativo: false
//     });

//   } catch (err) {
//     console.error('[/criar-proximo] Erro:', err);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Erro ao criar semestre: ' + err.message 
//     });
//   } finally {
//     safeRelease(conn);
//   }
// });

// /* ===============================
//    GET /api/semestres/estatisticas/:id
//    Retorna estatísticas de um semestre específico
// =============================== */
// router.get('/estatisticas/:id', async (req, res) => {
//   const semestreId = Number(req.params.id);
//   let conn;
  
//   try {
//     conn = await getConnection();

//     // Conta projetos
//     const resProjetos = await conn.execute(
//       `SELECT COUNT(*) AS total FROM Projetos WHERE semestre_id = ?`,
//       [semestreId]
//     );
//     const rowsProjetos = extractRows(resProjetos);
//     const totalProjetos = rowsProjetos[0]?.total || 0;

//     // Conta ofertas de disciplinas
//     const resOfertas = await conn.execute(
//       `SELECT COUNT(*) AS total FROM Disciplinas_Ofertas WHERE semestre_id = ?`,
//       [semestreId]
//     );
//     const rowsOfertas = extractRows(resOfertas);
//     const totalOfertas = rowsOfertas[0]?.total || 0;

//     // Conta grupos
//     const resGrupos = await conn.execute(
//       `SELECT COUNT(*) AS total FROM Grupos WHERE semestre_id = ?`,
//       [semestreId]
//     );
//     const rowsGrupos = extractRows(resGrupos);
//     const totalGrupos = rowsGrupos[0]?.total || 0;

//     console.log('[/estatisticas] Stats para semestre', semestreId, {
//       projetos: totalProjetos,
//       ofertas: totalOfertas,
//       grupos: totalGrupos
//     });

//     res.json({
//       success: true,
//       semestre_id: semestreId,
//       estatisticas: {
//         total_projetos: totalProjetos,
//         total_ofertas: totalOfertas,
//         total_grupos: totalGrupos
//       }
//     });

//   } catch (err) {
//     console.error('[/estatisticas] Erro:', err);
//     res.status(500).json({ success: false, message: err.message });
//   } finally {
//     safeRelease(conn);
//   }
// });

// /* ===============================
//    PATCH /api/semestres/ativar/:id
//    Ativa um semestre (desativa todos os outros)
// =============================== */
// router.patch('/ativar/:id', async (req, res) => {
//   const semestreId = Number(req.params.id);
//   let conn;
  
//   try {
//     conn = await getConnection();

//     // Verifica se o semestre existe
//     const resVerifica = await conn.execute(
//       `SELECT id, periodo, ano, ativo FROM Semestres WHERE id = ?`,
//       [semestreId]
//     );
//     const rowsVerifica = extractRows(resVerifica);

//     if (!rowsVerifica.length) {
//       return res.status(404).json({
//         success: false,
//         message: 'Semestre não encontrado.'
//       });
//     }

//     const semestre = rowsVerifica[0];

//     if (semestre.ativo === 1) {
//       return res.status(400).json({
//         success: false,
//         message: 'Este semestre já está ativo.'
//       });
//     }

//     // 1. Desativa todos os semestres
//     await conn.execute(`UPDATE Semestres SET ativo = 0`);

//     // 2. Ativa o semestre escolhido
//     await conn.execute(`UPDATE Semestres SET ativo = 1 WHERE id = ?`, [semestreId]);

//     console.log('[/ativar] Semestre ativado:', semestreId);

//     res.json({
//       success: true,
//       message: `Semestre ${semestre.periodo}/${semestre.ano} ativado com sucesso!`,
//       semestre_id: semestreId
//     });

//   } catch (err) {
//     console.error('[/ativar] Erro:', err);
//     res.status(500).json({ success: false, message: err.message });
//   } finally {
//     safeRelease(conn);
//   }
// });

// /* ===============================
//    DELETE /api/semestres/deletar/:id
//    Deleta um semestre (apenas se vazio)
//    CUIDADO: Use com cautela!
// =============================== */
// router.delete('/deletar/:id', async (req, res) => {
//   const semestreId = Number(req.params.id);
//   let conn;
  
//   try {
//     conn = await getConnection();

//     // Verifica se tem dados vinculados
//     const resCheck = await conn.execute(`
//       SELECT 
//         (SELECT COUNT(*) FROM Projetos WHERE semestre_id = ?) AS projetos,
//         (SELECT COUNT(*) FROM Disciplinas_Ofertas WHERE semestre_id = ?) AS ofertas,
//         (SELECT COUNT(*) FROM Grupos WHERE semestre_id = ?) AS grupos
//     `, [semestreId, semestreId, semestreId]);
    
//     const rowsCheck = extractRows(resCheck);
//     const check = rowsCheck[0];

//     if (check.projetos > 0 || check.ofertas > 0 || check.grupos > 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Não é possível deletar um semestre com dados vinculados.',
//         dados: {
//           projetos: check.projetos,
//           ofertas: check.ofertas,
//           grupos: check.grupos
//         }
//       });
//     }

//     // Deleta
//     await conn.execute(`DELETE FROM Semestres WHERE id = ?`, [semestreId]);

//     console.log('[/deletar] Semestre', semestreId, 'deletado com sucesso');

//     res.json({
//       success: true,
//       message: 'Semestre deletado com sucesso.'
//     });

//   } catch (err) {
//     console.error('[/deletar] Erro:', err);
//     res.status(500).json({ success: false, message: err.message });
//   } finally {
//     safeRelease(conn);
//   }
// });


// module.exports = router;

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
    console.log('[GET /] rows:', rows.length);
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
    console.log('[GET /ativo] rows:', rows);
    
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

// POST /:id/ativar - Ativa um semestre e migra dados (Processo MESTRE)
// POST /:id/ativar - Ativa um semestre e migra dados (Processo MESTRE)
router.post('/:id/ativar', async (req, res) => {
  const semestreId = Number(req.params.id);

  const { 
    copiarProfessores = true, 
    migrarGruposEProjetos = true, 
    migrarApenasMatriculados = true 
  } = req.body;
  
  if (!semestreId || isNaN(semestreId)) {
    return res.status(400).json({ success: false, message: 'ID de semestre inválido' });
  }
  
  let conn;
  try {
    conn = await getConnection();
    
    console.log(`[POST /:id/ativar] Chamando sp_ativar_e_migrar_semestre_completo para ${semestreId}`);
    
    const params = [
      semestreId,
      copiarProfessores ? 1 : 0,
      migrarGruposEProjetos ? 1 : 0,
      migrarApenasMatriculados ? 1 : 0
    ];

    // ==================
    // 1. CORREÇÃO AQUI: Removido o [ ] de "result"
    // ==================
    const result = await conn.execute(
      `CALL sp_ativar_e_migrar_semestre_completo(?, ?, ?, ?)`,
      params
    );
    
    // ==================
    // 2. CORREÇÃO AQUI: Lógica para encontrar a mensagem de sucesso
    // A SP retorna múltiplos resultados (OKs, SELECTs). A mensagem é a última.
    // ==================
    let message = 'Semestre ativado e migrado com sucesso.'; // Mensagem padrão
    
    if (Array.isArray(result) && result.length > 0) {
      // Pega o último resultado da procedure
      const lastResultSet = result[result.length - 1];
      
      // Verifica se é um array de SELECT (ex: [ { mensagem: '...' } ])
      if (Array.isArray(lastResultSet) && lastResultSet.length > 0) {
        message = lastResultSet[0]?.mensagem || message;
      }
      // Verifica se o driver agrupou os resultados (ex: [ [Ok], [Ok], [ { msg } ] ])
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
  const { copiarProfessores = true } = req.body;
  
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
    
    // Verificar se há dados vinculados
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
    
    console.log(`[DELETE /:id] excluindo semestre ${semestreId}`);
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