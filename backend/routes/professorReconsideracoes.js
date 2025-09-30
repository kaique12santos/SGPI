const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');
const nodemailer = require('nodemailer');
const emailTemplates = require('../utils/emailTemplates.js');
const notificationUtils = require('../utils/notificationUtils.js');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: { rejectUnauthorized: false }
});

// POST - Aprovar
router.post('/api/professor/reconsideracoes/:id/aprovar', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { resposta, novaNota } = req.body;
  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE Reconsideracoes
       SET status = 'Aprovado', resposta = ?, data_resposta = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [resposta, id]
    );

    if (novaNota) {
      const nota = Number(novaNota);
      if (isNaN(nota)) return res.status(400).json({ success: false, message: 'Nota inválida.' });

      await connection.execute(
        `UPDATE Avaliacoes
           SET nota = ?, data_avaliacao = CURRENT_TIMESTAMP
         WHERE id = (SELECT avaliacao_id FROM Reconsideracoes WHERE id = ?)`,
        [nota, id]
      );
    }

    const [dados] = await connection.execute(
      `SELECT r.aluno_id, r.resposta, a.titulo, u.email, u.nome 
         FROM Reconsideracoes r
         JOIN Avaliacoes av ON r.avaliacao_id = av.id
         JOIN Entregas e ON av.entrega_id = e.id
         JOIN Atividades a ON e.atividade_id = a.id
         JOIN Usuarios u ON r.aluno_id = u.id
        WHERE r.id = ?`,
      [id]
    );

    await connection.commit();

    if (dados.length > 0) {
      const aluno = dados[0];

      // Notificação interna
      await connection.execute(
        `CALL enviar_notificacao(?, ?, ?, ?)`,
        [aluno.aluno_id, '📢 Pedido de reconsideração aprovado',
          notificationUtils.reconsideracaoAprovada(aluno.titulo, resposta, novaNota),
          'Reconsideracao_Aprovada']
      );

      // Email
      const template = emailTemplates.reconsideracaoAprovada(aluno, aluno.titulo, resposta, novaNota);
      await transporter.sendMail({
        from: `SGPI <${process.env.EMAIL_FROM}>`,
        to: aluno.email,
        subject: template.subject,
        html: template.html
      });
    }

    res.json({ success: true, message: 'Pedido aprovado e notificação enviada.' });
  } catch (err) {
    await connection.rollback();
    console.error('Erro ao aprovar reconsideração:', err);
    res.status(500).json({ success: false, message: 'Erro ao aprovar pedido.' });
  } finally {
    if (connection) await connection.end();
  }
});

// POST - Recusar
router.post('/api/professor/reconsideracoes/:id/recusar', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { resposta } = req.body;
  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE Reconsideracoes
       SET status = 'Negado', resposta = ?, data_resposta = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [resposta, id]
    );

    const [dados] = await connection.execute(
      `SELECT r.aluno_id, r.resposta, a.titulo, u.email, u.nome 
         FROM Reconsideracoes r
         JOIN Avaliacoes av ON r.avaliacao_id = av.id
         JOIN Entregas e ON av.entrega_id = e.id
         JOIN Atividades a ON e.atividade_id = a.id
         JOIN Usuarios u ON r.aluno_id = u.id
        WHERE r.id = ?`,
      [id]
    );

    await connection.commit();

    if (dados.length > 0) {
      const aluno = dados[0];

      // Notificação interna
      await connection.execute(
        `CALL enviar_notificacao(?, ?, ?, ?)`,
        [aluno.aluno_id, '📢 Pedido de reconsideração negado',
          notificationUtils.reconsideracaoNegada(aluno.titulo, resposta),
          'Reconsideracao_Negada']
      );

      // Email
      const template = emailTemplates.reconsideracaoNegada(aluno, aluno.titulo, resposta);
      await transporter.sendMail({
        from: `SGPI <${process.env.EMAIL_FROM}>`,
        to: aluno.email,
        subject: template.subject,
        html: template.html
      });
    }

    res.json({ success: true, message: 'Pedido negado e notificação enviada.' });
  } catch (err) {
    await connection.rollback();
    console.error('Erro ao negar reconsideração:', err);
    res.status(500).json({ success: false, message: 'Erro ao negar pedido.' });
  } finally {
    if (connection) await connection.end();
  }
});

module.exports = router;