require('dotenv').config();
const express = require('express');
const { getConnection, oracledb } = require('../connectOracle');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
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
        ciphers: 'SSLv3',
        rejectUnauthorized: false
    },
    debug: true
});

transporter.verify(function(error, success) {
    if (error) {
        console.error('❌ Erro na configuração do email:', error);
    } else {
        console.log('✅ Servidor de email pronto para enviar mensagens');
    }
});

router.post('/recuperar-senha', async (req, res) => {
    const { email } = req.body;
    console.log(`📧 Solicitação de recuperação para: ${email}`);

    try {
        const connection = await getConnection();
        const result = await connection.execute(
            `SELECT id FROM Usuarios WHERE email = :email`,
            [email],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (result.rows.length === 0) {
            console.log(`❌ Email não encontrado: ${email}`);
            return res.status(404).json({ success: false, message: 'E-mail não encontrado.' });
        }

        const userId = result.rows[0].ID;
        const token = uuidv4();
        const expiracao = new Date(Date.now() + 3600 * 1000); // 1h

        console.log(`✅ Usuário encontrado ID: ${userId}, gerando token...`);

        await connection.execute(
            `DELETE FROM Recuperacao_Senha WHERE usuario_id = :1`,
            [userId],
            { autoCommit: true }
        );

        await connection.execute(
            `INSERT INTO Recuperacao_Senha (usuario_id, token, data_expiracao) VALUES (:1, :2, :3)`,
            [userId, token, expiracao],
            { autoCommit: true }
        );

        console.log(`✅ Link gerado e salvo no banco de dados`);

        const link = `http://localhost:3000/redefine-password.html?token=${token}`;
        let emailEnviado = false;

        try {
            console.log(`📧 Tentando enviar email para ${email}...`);
            const info = await transporter.sendMail({
                from: `"SGPI Suporte" <${process.env.EMAIL_FROM}>`,
                to: email,
                subject: 'Redefinição de Senha - SGPI',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="color: #333;">Redefinição de Senha - SGPI</h2>
                    <p>Você solicitou a redefinição de senha para sua conta no Sistema de Gerenciamento de Projetos Interdisciplinares.</p>
                    <p>Clique no botão abaixo para redefinir sua senha:</p>
                    <p style="text-align: center;">
                        <a href="${link}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Redefinir Senha</a>
                    </p>
                    <p>Ou copie e cole o link abaixo no seu navegador:</p>
                    <p style="word-break: break-all;"><a href="${link}">${link}</a></p>
                    <p><strong>Este link expira em 1 hora.</strong></p>
                    <p>Se você não solicitou a redefinição de senha, por favor ignore este e-mail.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="font-size: 12px; color: #777;">Este é um e-mail automático, por favor não responda.</p>
                </div>
                `
            });
            
            console.log(`✅ Email enviado: ${info.messageId}`);
            emailEnviado = true;
        } catch (emailError) {
            console.error('❌ Erro ao enviar e-mail:', emailError);
        }

        await connection.close();

        return res.json({
            success: true,
            emailEnviado,
            link: emailEnviado ? null : link,
            message: emailEnviado
                ? "E-mail enviado com sucesso! Verifique sua caixa de entrada e caixa de spam."
                : "Não foi possível enviar o e-mail."
        });

    } catch (error) {
        console.error('❌ Erro ao recuperar senha:', error);
        return res.status(500).json({ success: false, message: 'Erro no servidor.', error: error.message });
    }
});

router.post('/redefinir-senha', async (req, res) => {
    const { token, novaSenha } = req.body;

    if (!token || !novaSenha) {
        return res.status(400).json({ success: false, message: 'Token e nova senha são obrigatórios.' });
    }

    try {
        const connection = await getConnection();
        
        const result = await connection.execute(
            `SELECT usuario_id, data_expiracao FROM Recuperacao_Senha WHERE token = :1`,
            [token],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (result.rows.length === 0) {
            await connection.close();
            return res.status(404).json({ success: false, message: 'Token inválido ou expirado.' });
        }

        const tokenInfo = result.rows[0];
        const agora = new Date();
        const dataExpiracao = new Date(tokenInfo.DATA_EXPIRACAO);

        if (agora > dataExpiracao) {
            await connection.close();
            return res.status(400).json({ success: false, message: 'Token expirado. Solicite um novo link de redefinição.' });
        }

        const saltRounds = 10;
        const hashedSenha = await bcrypt.hash(novaSenha, saltRounds);

        await connection.execute(
            `UPDATE Usuarios SET senha = :1 WHERE id = :2`,
            [hashedSenha, tokenInfo.USUARIO_ID],
            { autoCommit: true }
        );

        await connection.execute(
            `DELETE FROM Recuperacao_Senha WHERE token = :1`,
            [token],
            { autoCommit: true }
        );

        await connection.close();
        return res.json({ success: true, message: 'Senha redefinida com sucesso!' });
        
    } catch (error) {
        console.error('Erro ao redefinir senha:', error);
        return res.status(500).json({ success: false, message: 'Erro no servidor.', error: error.message });
    }
});

module.exports = router;