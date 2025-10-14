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

// POST /api/semestres/criar-proximo
// Body: { periodo: '1' ou '2', ano: 2026 } (opcional - usa lógica automática se não enviar)
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

    if (!rowsSemAtual.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nenhum semestre encontrado no banco. Crie o primeiro manualmente.' 
      });
    }

    const atual = rowsSemAtual[0];
    let novoAno, novoPeriodo;

    // 2. Calcula o próximo semestre (ou usa o enviado no body)
    if (req.body.ano && req.body.periodo) {
      novoAno = Number(req.body.ano);
      novoPeriodo = String(req.body.periodo);
    } else {
      // Lógica automática: 1 → 2 (mesmo ano), 2 → 1 (próximo ano)
      if (atual.periodo === '1') {
        novoAno = atual.ano;
        novoPeriodo = '2';
      } else {
        novoAno = atual.ano + 1;
        novoPeriodo = '1';
      }
    }

    // 3. Verifica se já existe
    const resVerifica = await conn.execute(
      `SELECT id FROM Semestres WHERE ano = ? AND periodo = ?`,
      [novoAno, novoPeriodo]
    );
    const rowsVerifica = extractRows(resVerifica);

    if (rowsVerifica.length) {
      return res.status(400).json({ 
        success: false, 
        message: `Semestre ${novoPeriodo}/${novoAno} já existe!` 
      });
    }

    // 4. Cria o novo semestre
    const resInsert = await conn.execute(
      `INSERT INTO Semestres (periodo, ano) VALUES (?, ?)`,
      [novoPeriodo, novoAno]
    );

    res.json({ 
      success: true, 
      message: `Semestre ${novoPeriodo}/${novoAno} criado com sucesso!`,
      semestre_id: resInsert.insertId
    });

  } catch (err) {
    console.error('Erro ao criar próximo semestre:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    safeRelease(conn);
  }
});

// GET /api/semestres/listar
router.get('/listar', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();

    const result = await conn.execute(`
      SELECT id, periodo, ano,
             CONCAT(periodo, 'º Semestre de ', ano) AS descricao
      FROM Semestres
      ORDER BY ano DESC, CAST(periodo AS UNSIGNED) DESC
    `);
    const rows = extractRows(result);

    res.json({ success: true, semestres: rows });
  } catch (err) {
    console.error('Erro ao listar semestres:', err);
    res.status(500).json({ success: false });
  } finally {
    safeRelease(conn);
  }
});

module.exports = router;