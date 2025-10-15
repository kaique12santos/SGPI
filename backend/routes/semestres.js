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
   GET /api/semestres/listar
   Lista todos os semestres ordenados
=============================== */
router.get('/listar', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();

    const result = await conn.execute(`
      SELECT id, periodo, ano, ativo,
             CONCAT(periodo, 'º Semestre de ', ano) AS descricao
      FROM Semestres
      ORDER BY ano DESC, CAST(periodo AS UNSIGNED) DESC
    `);
    const rows = extractRows(result);

    console.log('[/semestres/listar] Semestres encontrados:', rows.length);
    res.json({ success: true, semestres: rows });
  } catch (err) {
    console.error('[/semestres/listar] Erro:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    safeRelease(conn);
  }
});

/* ===============================
   POST /api/semestres/criar-proximo
   Cria o próximo semestre (auto ou manual)
   Body (opcional): { periodo: '1', ano: 2026 }
=============================== */
router.post('/criar-proximo', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();

    // 1. Busca o semestre mais recente
    const resSemAtual = await conn.execute(`
      SELECT ano, periodo 
      FROM Semestres 
      ORDER BY ano DESC, CAST(periodo AS UNSIGNED) DESC 
      LIMIT 1
    `);
    const rowsSemAtual = extractRows(resSemAtual);

    let novoAno, novoPeriodo;

    // 2. Determina o próximo semestre
    if (req.body.ano && req.body.periodo) {
      // Modo Manual
      novoAno = Number(req.body.ano);
      novoPeriodo = String(req.body.periodo);
      
      console.log('[/criar-proximo] Modo Manual:', { novoPeriodo, novoAno });
    } else {
      // Modo Automático
      if (!rowsSemAtual.length) {
        // Se não existe nenhum, cria o primeiro semestre do ano atual
        const hoje = new Date();
        novoAno = hoje.getFullYear();
        novoPeriodo = '1';
        console.log('[/criar-proximo] Primeiro semestre do sistema:', { novoPeriodo, novoAno });
      } else {
        const atual = rowsSemAtual[0];
        
        // Lógica: 1 → 2 (mesmo ano), 2 → 1 (próximo ano)
        if (atual.periodo === '1') {
          novoAno = atual.ano;
          novoPeriodo = '2';
        } else {
          novoAno = atual.ano + 1;
          novoPeriodo = '1';
        }
        
        console.log('[/criar-proximo] Modo Automático:', { atual, proximo: { novoPeriodo, novoAno } });
      }
    }

    // Validações
    if (!['1', '2'].includes(novoPeriodo)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Período inválido. Use "1" ou "2".' 
      });
    }

    if (novoAno < 2020 || novoAno > 2050) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ano inválido. Deve estar entre 2020 e 2050.' 
      });
    }

    // 3. Verifica se já existe
    const resVerifica = await conn.execute(
      `SELECT id FROM Semestres WHERE ano = ? AND periodo = ?`,
      [novoAno, novoPeriodo]
    );
    const rowsVerifica = extractRows(resVerifica);

    if (rowsVerifica.length) {
      console.log('[/criar-proximo] Semestre já existe:', { novoPeriodo, novoAno });
      return res.status(400).json({ 
        success: false, 
        message: `Semestre ${novoPeriodo}/${novoAno} já existe no sistema.` 
      });
    }

    // 4. Cria o novo semestre (INATIVO por padrão)
    const resInsert = await conn.execute(
      `INSERT INTO Semestres (periodo, ano, ativo) VALUES (?, ?, 0)`,
      [novoPeriodo, novoAno]
    );

    const semestreId = resInsert?.rows?.insertId ?? resInsert?.insertId ?? resInsert?.[0]?.insertId;

    console.log('[/criar-proximo] Semestre criado com sucesso (inativo):', { 
      id: semestreId, 
      periodo: novoPeriodo, 
      ano: novoAno 
    });

    res.json({ 
      success: true, 
      message: `Semestre ${novoPeriodo}/${novoAno} criado com sucesso! Use "Ativar Semestre" para torná-lo o semestre atual.`,
      semestre_id: semestreId,
      periodo: novoPeriodo,
      ano: novoAno,
      ativo: false
    });

  } catch (err) {
    console.error('[/criar-proximo] Erro:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao criar semestre: ' + err.message 
    });
  } finally {
    safeRelease(conn);
  }
});

/* ===============================
   GET /api/semestres/estatisticas/:id
   Retorna estatísticas de um semestre específico
=============================== */
router.get('/estatisticas/:id', async (req, res) => {
  const semestreId = Number(req.params.id);
  let conn;
  
  try {
    conn = await getConnection();

    // Conta projetos
    const resProjetos = await conn.execute(
      `SELECT COUNT(*) AS total FROM Projetos WHERE semestre_id = ?`,
      [semestreId]
    );
    const rowsProjetos = extractRows(resProjetos);
    const totalProjetos = rowsProjetos[0]?.total || 0;

    // Conta ofertas de disciplinas
    const resOfertas = await conn.execute(
      `SELECT COUNT(*) AS total FROM Disciplinas_Ofertas WHERE semestre_id = ?`,
      [semestreId]
    );
    const rowsOfertas = extractRows(resOfertas);
    const totalOfertas = rowsOfertas[0]?.total || 0;

    // Conta grupos
    const resGrupos = await conn.execute(
      `SELECT COUNT(*) AS total FROM Grupos WHERE semestre_id = ?`,
      [semestreId]
    );
    const rowsGrupos = extractRows(resGrupos);
    const totalGrupos = rowsGrupos[0]?.total || 0;

    console.log('[/estatisticas] Stats para semestre', semestreId, {
      projetos: totalProjetos,
      ofertas: totalOfertas,
      grupos: totalGrupos
    });

    res.json({
      success: true,
      semestre_id: semestreId,
      estatisticas: {
        total_projetos: totalProjetos,
        total_ofertas: totalOfertas,
        total_grupos: totalGrupos
      }
    });

  } catch (err) {
    console.error('[/estatisticas] Erro:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    safeRelease(conn);
  }
});

/* ===============================
   PATCH /api/semestres/ativar/:id
   Ativa um semestre (desativa todos os outros)
=============================== */
router.patch('/ativar/:id', async (req, res) => {
  const semestreId = Number(req.params.id);
  let conn;
  
  try {
    conn = await getConnection();

    // Verifica se o semestre existe
    const resVerifica = await conn.execute(
      `SELECT id, periodo, ano, ativo FROM Semestres WHERE id = ?`,
      [semestreId]
    );
    const rowsVerifica = extractRows(resVerifica);

    if (!rowsVerifica.length) {
      return res.status(404).json({
        success: false,
        message: 'Semestre não encontrado.'
      });
    }

    const semestre = rowsVerifica[0];

    if (semestre.ativo === 1) {
      return res.status(400).json({
        success: false,
        message: 'Este semestre já está ativo.'
      });
    }

    // 1. Desativa todos os semestres
    await conn.execute(`UPDATE Semestres SET ativo = 0`);

    // 2. Ativa o semestre escolhido
    await conn.execute(`UPDATE Semestres SET ativo = 1 WHERE id = ?`, [semestreId]);

    console.log('[/ativar] Semestre ativado:', semestreId);

    res.json({
      success: true,
      message: `Semestre ${semestre.periodo}/${semestre.ano} ativado com sucesso!`,
      semestre_id: semestreId
    });

  } catch (err) {
    console.error('[/ativar] Erro:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    safeRelease(conn);
  }
});

/* ===============================
   DELETE /api/semestres/deletar/:id
   Deleta um semestre (apenas se vazio)
   CUIDADO: Use com cautela!
=============================== */
router.delete('/deletar/:id', async (req, res) => {
  const semestreId = Number(req.params.id);
  let conn;
  
  try {
    conn = await getConnection();

    // Verifica se tem dados vinculados
    const resCheck = await conn.execute(`
      SELECT 
        (SELECT COUNT(*) FROM Projetos WHERE semestre_id = ?) AS projetos,
        (SELECT COUNT(*) FROM Disciplinas_Ofertas WHERE semestre_id = ?) AS ofertas,
        (SELECT COUNT(*) FROM Grupos WHERE semestre_id = ?) AS grupos
    `, [semestreId, semestreId, semestreId]);
    
    const rowsCheck = extractRows(resCheck);
    const check = rowsCheck[0];

    if (check.projetos > 0 || check.ofertas > 0 || check.grupos > 0) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível deletar um semestre com dados vinculados.',
        dados: {
          projetos: check.projetos,
          ofertas: check.ofertas,
          grupos: check.grupos
        }
      });
    }

    // Deleta
    await conn.execute(`DELETE FROM Semestres WHERE id = ?`, [semestreId]);

    console.log('[/deletar] Semestre', semestreId, 'deletado com sucesso');

    res.json({
      success: true,
      message: 'Semestre deletado com sucesso.'
    });

  } catch (err) {
    console.error('[/deletar] Erro:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    safeRelease(conn);
  }
});


module.exports = router;