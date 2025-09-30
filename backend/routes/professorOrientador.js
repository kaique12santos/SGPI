const express = require('express');
const router = express.Router();
const emailTemplates = require('../utils/emailTemplates.js');
const notificationUtils = require('../utils/notificationUtils.js');
const { getConnection } = require('../conexaoMysql.js');
require('dotenv').config();
const nodemailer = require('nodemailer');

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

// 🔹 Criar nova atividade (Professor OU Professor_Orientador)
router.post('/atividades', async (req, res) => {
  const {
    titulo,
    descricao,
    usuario_id,    // pode ser professor OU orientador
    prazo_entrega,
    criterios_avaliacao,
    semestre_id,
    disciplina_id,
    tipo_usuario   // novo campo: "Professor" ou "Professor_Orientador"
  } = req.body;

  const connection = await getConnection();

  try {
    if (!titulo || !descricao || !usuario_id || !prazo_entrega || !criterios_avaliacao || !semestre_id || !tipo_usuario) {
      return res.status(400).json({ 
        success: false, 
        message: 'Campos obrigatórios não preenchidos.' 
      });
    }

    // 🚨 Aqui diferencia professor de orientador
    // No banco você pode ter colunas separadas ou só validar o tipo do usuário
    const [verificaUsuario] = await connection.execute(
      `SELECT tipo FROM Usuarios WHERE id = ? LIMIT 1`,
      [usuario_id]
    );

    if (verificaUsuario.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const tipo = verificaUsuario[0].tipo;
    if (tipo !== tipo_usuario) {
      return res.status(403).json({ 
        message: `Usuário não é do tipo esperado: ${tipo_usuario}` 
      });
    }

    // Chama procedure (independente do tipo)
    await connection.execute(
      `CALL criar_atividade_para_semestre(?, ?, ?, ?, ?, ?, ?)`,
      [titulo, descricao, usuario_id, prazo_entrega, criterios_avaliacao, semestre_id, disciplina_id]
    );

    res.json({
      success: true,
      message: `${tipo_usuario} criou a atividade com sucesso!`
    });

    // Notificar alunos
    await notificarAlunosSobreAtividade(connection, {
      titulo,
      prazo_entrega,
      semestre_id,
      disciplina_id,
      usuario_id,
      tipo_usuario
    });

  } catch (error) {
    console.error('Erro ao cadastrar atividade:', error);
    res.status(500).json({ success: false, message: 'Erro no servidor.', error: error.message });
  } finally {
    if (connection) await connection.end();
  }
});

// 🔹 Listar atividades (Professor OU Orientador)
router.get('/atividades', async (req, res) => {
  const connection = await getConnection();
  const usuarioId = parseInt(req.query.usuario_id, 10);
  const tipo_usuario = req.query.tipo_usuario; // "Professor" ou "Professor_Orientador"

  if (isNaN(usuarioId) || !tipo_usuario) {
    return res.status(400).json({ message: 'Parâmetros inválidos.' });
  }

  try {
    const [rows] = await connection.execute(
      `SELECT MIN(a.id) AS id,
              a.titulo,
              a.descricao,
              a.criterios_avaliacao,
              a.prazo_entrega,
              a.semestre_id,
              a.disciplina_id,
              MIN(a.data_criacao) as data_criacao
       FROM Atividades a
       WHERE a.professor_id = ? -- mesmo campo usado para orientador também
       GROUP BY a.titulo, a.descricao, a.criterios_avaliacao, a.prazo_entrega, a.semestre_id, a.disciplina_id
       ORDER BY MIN(a.data_criacao) DESC`,
      [usuarioId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  } finally {
    if (connection) await connection.end();
  }
});

// 🔹 Função para notificar alunos
async function notificarAlunosSobreAtividade(connection, atividade) {
  try {
    const [usuario] = await connection.execute(
      `SELECT nome, tipo FROM Usuarios WHERE id = ?`,
      [atividade.usuario_id]
    );

    const nomeUsuario = usuario[0]?.nome || 'Usuário';
    const cargo = usuario[0]?.tipo || atividade.tipo_usuario;

    // Buscar alunos do semestre
    const [alunos] = await connection.execute(
      `SELECT u.id, u.email, u.nome 
         FROM Usuarios u
         JOIN Usuario_Semestre us ON us.usuario_id = u.id
        WHERE us.semestre_id = ?
          AND u.tipo = 'Aluno'
          AND u.ativo = 1`,
      [atividade.semestre_id]
    );

    for (const aluno of alunos) {
      const titulo = `Nova atividade: ${atividade.titulo}`;
      const mensagem = `O ${cargo.toLowerCase()} ${nomeUsuario} publicou a atividade: <strong>${atividade.titulo}</strong><br>
                        Prazo de entrega: ${new Date(atividade.prazo_entrega).toLocaleString()}`;

      // Notificação interna
      await connection.execute(
        `CALL enviar_notificacao(?, ?, ?, ?)`,
        [aluno.id, template.subject, notificationUtils.novaAtividade(
          atividade.titulo, disciplina.nome, atividade.prazo_entrega, professor.nome
        ), 'Nova_Atividade']
      );

      const template = emailTemplates.novaAtividade(aluno, professor.nome, atividade.titulo, disciplina.nome, atividade.prazo_entrega);
      // E-mail
      await transporter.sendMail({
        from: `SGPI <${process.env.EMAIL_FROM}>`,
        to: aluno.email,
        subject: template.subject,
        html: template.html
      });
    }

    console.log(`✅ ${alunos.length} alunos notificados`);
  } catch (err) {
    console.error('Erro ao notificar alunos:', err);
  }
}

module.exports = router;
