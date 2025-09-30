
const { gerarToken } = require('../helpers/jwt.js');
const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js'); // Agora usa MySQL
const bcrypt = require("bcryptjs");
const EmailValidationService = require('../services/emailValidationService.js');
const { AppError } = require('../helpers/response.js');

const emailService = new EmailValidationService();

// 🚀 CADASTRO (envio do email de validação)
router.post("/cadastro", async (req, res) => {
  const { nome, email, senha, tipo, ra, disciplinas, termos_aceitos } = req.body;

  try {
    if (!nome || !email || !senha || !tipo) {
      return res.status(400).json({ success: false, message: "Nome, e-mail, senha e tipo são obrigatórios." });
    }

    if (senha.length < 6) {
      return res.status(400).json({ success: false, message: "Senha deve ter pelo menos 6 caracteres." });
    }

    if (![0,1,true,false].includes(termos_aceitos)) {
      return res.status(400).json({ success: false, message: "O campo termos_aceitos deve ser 0 ou 1." });
    }

    const connection = await getConnection();
    try {
      const check = await connection.execute(
        "SELECT COUNT(1) AS cnt FROM Usuarios WHERE UPPER(email) = UPPER(?)",
        [email]
      );

      if (check.rows && check.rows[0] && check.rows[0].cnt > 0) {
        return res.status(409).json({ success: false, message: "Este e-mail já está cadastrado." });
      }
    } finally {
      await connection.close();
    }

    // 🚀 Agora: não insere no banco ainda, só cria token de validação
    const tokenData = {
      nome,
      email,
      senha,
      tipo,
      ra,
      disciplinas,
      termos_aceitos
    };

    const token = await emailService.sendValidationEmail(email, tokenData);

    return res.status(200).json({
      success: true,
      message: "Email de validação enviado. Confirme para concluir seu cadastro.",
      previewToken: token // só para debug, remove em produção
    });

  } catch (error) {
    console.error("Erro no pré-cadastro:", error);
    res.status(500).json({ success: false, message: "Erro interno no servidor." });
  }
});


// 🔐 VALIDAR TOKEN e concluir cadastro
router.post('/validar-token', async (req, res) => {
  try {
    const { token, codigo } = req.body;
    if (!token && !codigo) {
      return res.status(400).json({ success: false, message: 'Token ou código é obrigatório' });
    }

    const result = await emailService.validateToken(token || codigo);
    if (!result.success) return res.status(400).json(result);

    const { nome, email, senha, tipo, ra, disciplinas, termos_aceitos } = result.userData;

    const hashedPassword = await bcrypt.hash(senha, 10);

    const connection = await getConnection();
    try {
      // Inserir usuário de verdade só agora
      const insertResult = await connection.execute(
        "INSERT INTO Usuarios (nome, email, senha, tipo, ativo, termos_aceitos) VALUES (?, ?, ?, ?, 1, ?)",
        [nome, email, hashedPassword, tipo, termos_aceitos ? 1 : 0]
      );
      const usuarioId = insertResult.rows.insertId;

      if (tipo === "Aluno") {
        await connection.execute("INSERT INTO Alunos (usuario_id, RA) VALUES (?, ?)", [usuarioId, ra || `RA${usuarioId}`]);

        if (Array.isArray(disciplinas) && disciplinas.length > 0) {
          const resultDisciplinas = await connection.execute(
            `SELECT id FROM Disciplinas WHERE codigo IN (${disciplinas.map(() => "?").join(",")})`,
            disciplinas
          );
          const disciplinaIds = resultDisciplinas.rows.map(d => d.id);

          if (disciplinaIds.length > 0) {
            const resultSemestres = await connection.execute(
              `SELECT DISTINCT semestre_id FROM Disciplinas_Ofertas WHERE disciplina_id IN (${disciplinaIds.map(() => "?").join(",")})`,
              disciplinaIds
            );
            for (const row of resultSemestres.rows) {
              if (row.semestre_id) {
                await connection.execute(
                  `INSERT IGNORE INTO Usuario_Semestre (usuario_id, semestre_id, papel) VALUES (?, ?, 'Aluno')`,
                  [usuarioId, row.semestre_id]
                );
              }
            }
          }
        }
      }

      res.json({
        success: true,
        message: "Cadastro concluído após validação!",
        user: { id: usuarioId, nome, email, tipo }
      });

    } finally {
      await connection.close();
    }
  } catch (error) {
    console.error("Erro ao validar token/cadastrar usuário:", error);
    res.status(500).json({ success: false, message: "Erro interno no servidor" });
  }
});

// 📧 Reenviar email de validação
router.post('/reenviar-validacao', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email é obrigatório' });

    const result = await emailService.resendValidationEmail(email);
    res.json({ success: true, message: 'Email de validação reenviado com sucesso', tokenPreview: result.tokenPreview });

  } catch (error) {
    console.error('Erro ao reenviar validação:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// 🔗 Validar por link GET
router.get('/validar-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.redirect('/cadastro?erro=token-invalido');

    const result = await emailService.validateToken(token);
    if (result.success) res.redirect('/login?sucesso=cadastro-realizado');
    else res.redirect(`/cadastro?erro=${encodeURIComponent(result.message)}`);

  } catch (error) {
    console.error('Erro ao validar por link:', error);
    res.redirect('/cadastro?erro=erro-interno');
  }
});

// 🔑 LOGIN
router.post('/login', async (req, res, next) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      throw new AppError('Credenciais inválidas.', { status: 400, code: 'AUTH_INVALID_INPUT' });
    }

    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT id, email, senha, tipo 
         FROM Usuarios 
         WHERE UPPER(email) = UPPER(?) AND ativo = 1`,
        [String(username)]
      );
      console.log("Login - resultado da busca:", result.rows);
      
      const user = result.rows[0]; 

      const genericFail = () => res.fail?.('AUTH_INVALID_CREDENTIALS', 'Usuário ou senha incorretos.', 401) 
        || res.status(401).json({ success: false, message: 'Usuário ou senha incorretos.' });

      if (!user) return genericFail();

      const passwordMatch = await bcrypt.compare(String(password), user.senha);
      if (!passwordMatch) return genericFail();

      // Definir papel para frontend
      let roleFrontend = 'aluno';
      const tipo = user.tipo?.toLowerCase();
      if (tipo === 'professor') roleFrontend = 'professor';
      else if (tipo === 'coordenador') roleFrontend = 'coordenador';
      else if (tipo === 'professor_orientador') roleFrontend = 'professor_orientador';
      else if (tipo === 'administrador') roleFrontend = 'administrador';

      const payload = { id: user.id, userRole: roleFrontend };
      const token = gerarToken(payload);
      console.log("tipo de conta:",tipo)
      return res.ok?.({ ...payload, token }, 'Login realizado com sucesso.')
        || res.json({ success: true, message: 'Login realizado com sucesso.', ...payload, token });

    } finally {
      await connection.release();
    }
  } catch (err) {
    return next(err);
  }
});

module.exports = router;