const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');

router.post('/api/avaliacoes', async (req, res) => {
  const { entrega_id, professor_id, nota, comentario } = req.body;

  if (!entrega_id || !professor_id || nota == null || comentario == null) {
    return res.status(400).json({ success: false, message: 'Campos obrigatórios faltando.' });
  }

  const connection = await getConnection();

  try {
    await connection.execute(
      `INSERT INTO Avaliacoes (entrega_id, professor_id, nota, comentario)
       VALUES (?, ?, ?, ?)`,
      [entrega_id, professor_id, nota, comentario]
    );

    res.json({ success: true, message: 'Avaliação enviada com sucesso!' });
  } catch (error) {
    console.error('Erro ao salvar avaliação:', error);
    res.status(500).json({ success: false, message: 'Erro ao salvar avaliação.', error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;