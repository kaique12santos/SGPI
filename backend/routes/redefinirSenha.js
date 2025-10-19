require('dotenv').config();
const express = require('express');
const { getConnection } = require('../conexaoMysql.js');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const emailTemplates = require('../utils/emailTemplates.js');
const router = express.Router();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  },
  debug: true
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Erro na configuração do email:', error);
  } else {
    console.log('✅ Servidor de email pronto para enviar mensagens');
  }
});

// -----------------------------
// POST - Solicitar recuperação
// -----------------------------
router.post('/recuperar-senha', async (req, res) => {
  const { email } = req.body;
  console.log(`📧 Solicitação de recuperação para: ${email}`);

  if (!email) {
    return res.status(400).json({ success: false, message: 'E-mail é obrigatório.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // Verifica se o usuário existe
    const result = await connection.execute( 
      `SELECT id, nome FROM Usuarios WHERE email = ? AND ativo = 1 LIMIT 1`,
      [email]
    );

    const users = result.rows; 

    if (users.length === 0) {
      console.log(`❌ Email não encontrado: ${email}`);
      return res.status(404).json({ success: false, message: 'E-mail não encontrado.' });
    }

    const { id: userId, nome: nomeUsuario } = users[0];
    const token = uuidv4();
    const expiracao = new Date(Date.now() + 3600 * 1000); // 1 hora

    console.log(`✅ Usuário encontrado ID: ${userId}, gerando token...`);

    // Remove tokens antigos do usuário
    await connection.execute(
      `DELETE FROM Recuperacao_Senha WHERE usuario_id = ?`,
      [userId]
    );

    // Insere o novo token
    await connection.execute(
      `INSERT INTO Recuperacao_Senha (usuario_id, token, data_expiracao) VALUES (?, ?, ?)`,
      [userId, token, expiracao]
    );

    console.log(`✅ Token gerado e salvo no banco`);

    const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/redefine-password?token=${token}`;
    let emailEnviado = false;

    try {
      const template = emailTemplates.recuperacaoSenha(link);
      
      const info = await transporter.sendMail({
        from: `"SGPI Suporte" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: template.subject,
        html: template.html
      });

      console.log(`✅ Email enviado: ${info.messageId}`);
      emailEnviado = true;
    } catch (emailError) {
      console.error('❌ Erro ao enviar e-mail:', emailError);
    }

    return res.json({
      success: true,
      emailEnviado,
      link: emailEnviado ? null : link, // só retorna link se email falhou (para debug)
      message: emailEnviado
        ? "E-mail enviado com sucesso! Verifique sua caixa de entrada e spam."
        : "Não foi possível enviar o e-mail. Tente novamente mais tarde."
    });

  } catch (error) {
    console.error('❌ Erro ao recuperar senha:', error);
    return res.status(500).json({ success: false, message: 'Erro no servidor.', error: error.message });
  } finally {
    if (connection) await connection.end();
  }
});

// -----------------------------
// POST - Redefinir senha
// -----------------------------
router.post('/redefinir-senha', async (req, res) => {
  const { token, novaSenha } = req.body;

  if (!token || !novaSenha) {
    return res.status(400).json({ success: false, message: 'Token e nova senha são obrigatórios.' });
  }

  if (novaSenha.length < 6) {
    return res.status(400).json({ success: false, message: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // Busca token e dados do usuário
    const result = await connection.execute(
      `SELECT rs.usuario_id, rs.data_expiracao, u.email, u.nome 
       FROM Recuperacao_Senha rs
       JOIN Usuarios u ON rs.usuario_id = u.id
       WHERE rs.token = ? LIMIT 1`,
      [token]
    );
    const tokens = result.rows; 
    if (tokens.length === 0) {
      return res.status(404).json({ success: false, message: 'Token inválido ou expirado.' });
    }

    const tokenInfo = tokens[0];
    const agora = new Date();
    const dataExpiracao = new Date(tokenInfo.data_expiracao);

    if (agora > dataExpiracao) {
      // Remove token expirado
      await connection.execute(`DELETE FROM Recuperacao_Senha WHERE token = ?`, [token]);
      return res.status(400).json({ success: false, message: 'Token expirado. Solicite um novo.' });
    }

    // Gera senha criptografada
    const saltRounds = 10;
    const hashedSenha = await bcrypt.hash(novaSenha, saltRounds);

    // Atualiza senha
    await connection.execute(
      `UPDATE Usuarios SET senha = ? WHERE id = ?`,
      [hashedSenha, tokenInfo.usuario_id]
    );

    // Remove token usado
    await connection.execute(
      `DELETE FROM Recuperacao_Senha WHERE token = ?`,
      [token]
    );

    // Envia e-mail de confirmação
    try {
      const template = emailTemplates.senhaAlterada();
      
      await transporter.sendMail({
        from: `"SGPI Suporte" <${process.env.EMAIL_FROM}>`,
        to: tokenInfo.email,
        subject: template.subject,
        html: template.html
      });

      console.log(`✅ E-mail de confirmação enviado para ${tokenInfo.email}`);
    } catch (emailError) {
      console.warn('⚠️ Falha ao enviar e-mail de confirmação:', emailError.message);
    }

    return res.json({ success: true, message: 'Senha redefinida com sucesso!' });
        
  } catch (error) {
    console.error('❌ Erro ao redefinir senha:', error);
    return res.status(500).json({ success: false, message: 'Erro no servidor.', error: error.message });
  } finally {
    if (connection) await connection.end();
  }
});

module.exports = router;