const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js'); // Verifique o caminho

/**
 * Rota: GET /config/matriculas
 * Busca o status atual das matrículas
 */
router.get('/matriculas', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    
    // Busca a única linha de configuração
    const sql = "SELECT alunoMatricula, professorMatricula FROM Configuracoes WHERE id = 1";
    const result = await connection.execute(sql);

    let settings = {
      alunoMatricula: false,
      professorMatricula: false
    };

    if (result.rows.length > 0) {
      // Converte 0/1 (do DB) para true/false (para o JSON)
      settings.alunoMatricula = Boolean(result.rows[0].alunoMatricula);
      settings.professorMatricula = Boolean(result.rows[0].professorMatricula);
    }

    res.json({ success: true, settings: settings });

  } catch (err) {
    console.error('Erro ao buscar configurações:', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar configurações.' });
  } finally {
    if (connection) {
      try { await connection.release(); } catch (e) { console.error('Erro ao liberar conexão:', e) }
    }
  }
});

/**
 * Rota: POST /config/matriculas
 * Atualiza o status das matrículas (Coordenador)
 */
router.post('/matriculas', async (req, res) => {
  // Pega true/false do body
  const { alunoMatricula, professorMatricula } = req.body;

  // Validação básica
  if (typeof alunoMatricula !== 'boolean' || typeof professorMatricula !== 'boolean') {
    return res.status(400).json({ success: false, message: 'Dados inválidos.' });
  }

  // Converte true/false (do JSON) para 1/0 (para o DB)
  const alunoFlag = alunoMatricula ? 1 : 0;
  const profFlag = professorMatricula ? 1 : 0;

  let connection;
  try {
    connection = await getConnection();

    // SQL "UPSERT": Insere se não existir, atualiza se já existir (pela PRIMARY KEY id=1)
    const sql = `
      INSERT INTO Configuracoes (id, alunoMatricula, professorMatricula)
      VALUES (1, ?, ?)
      ON DUPLICATE KEY UPDATE
        alunoMatricula = ?,
        professorMatricula = ?;
    `;
    
    // Os parâmetros são repetidos para o INSERT e para o UPDATE
    const params = [alunoFlag, profFlag, alunoFlag, profFlag];
    
    await connection.execute(sql, params);

    res.json({ success: true, message: 'Configurações salvas com sucesso!' });

  } catch (err) {
    console.error('Erro ao salvar configurações:', err);
    res.status(500).json({ success: false, message: 'Erro ao salvar configurações.' });
  } finally {
    if (connection) {
      try { await connection.release(); } catch (e) { console.error('Erro ao liberar conexão:', e) }
    }
  }
});

module.exports = router;