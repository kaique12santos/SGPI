const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { getConnection, oracledb } = require('../connectOracle.js');
const { AppError } = require('../helpers/response.js');

// Rota de login
router.post('/login', async (req, res, next) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      throw new AppError('Credenciais inválidas.', { status: 400, code: 'AUTH_INVALID_INPUT' });
    }

    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT ID, EMAIL, SENHA, TIPO FROM Usuarios WHERE UPPER(email) = UPPER(:email)`,
        { email: String(username) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const user = result.rows[0];
      const genericFail = () => res.fail('AUTH_INVALID_CREDENTIALS', 'Usuário ou senha incorretos.', 401);

      if (!user) return genericFail();

      const passwordMatch = await bcrypt.compare(String(password), user.SENHA);
      if (!passwordMatch) return genericFail();

      let roleFrontend = 'aluno';
      const tipo = user.TIPO?.toLowerCase();
      if (tipo === 'professor') roleFrontend = 'professor';
      else if (tipo === 'coordenador') roleFrontend = 'coordenador';
      else if (tipo === 'professor_orientador') roleFrontend = 'professor_orientador';

      const { gerarToken } = require('../helpers/jwt.js');
      const payload = { id: user.ID, userRole: roleFrontend };
      const token = gerarToken(payload);

      return res.ok({ ...payload, token }, 'Login realizado com sucesso.');
    } finally {
      try { await connection.close(); } catch (closeError) { console.error('Erro ao fechar a conexão:', closeError); }
    }
  } catch (err) {
    return next(err);
  }
});

// Rota de cadastro
router.post('/cadastro', async (req, res, next) => {
  let { nome, email, senha, semestre, tipo } = req.body;

  try {
    if (!nome || !email || !senha) {
      throw new AppError('Nome, e-mail e senha são obrigatórios.', { status: 400, code: 'USR_MISSING_FIELDS' });
    }

    tipo = tipo || 'Aluno';
    semestre = semestre ? parseInt(semestre, 10) : null;

    const connection = await getConnection();
    try {
      const emailExistsResult = await connection.execute(
        `SELECT COUNT(1) AS CNT FROM Usuarios WHERE UPPER(email) = UPPER(:email)`,
        { email },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const emailExists = emailExistsResult.rows[0].CNT > 0;

      if (emailExists) {
        return res.fail('USR_EMAIL_EXISTS', 'Este e-mail já está cadastrado.', 409);
      }

      const hashedSenha = await bcrypt.hash(String(senha), 10);

      const result = await connection.execute(
        `INSERT INTO Usuarios (nome, email, senha, tipo, semestre, ativo)
         VALUES (:nome, :email, :senha, :tipo, :semestre, 1)`,
        { nome, email, senha: hashedSenha, tipo, semestre },
        { autoCommit: true }
      );

      if (result.rowsAffected > 0) {
        return res.ok(null, 'Usuário cadastrado com sucesso!', 201);
      }

      throw new AppError('Erro ao cadastrar usuário.', { status: 500, code: 'USR_CREATE_FAILED' });
    } finally {
      try { await connection.close(); } catch (closeError) { console.error('Erro ao fechar a conexão:', closeError); }
    }
  } catch (err) {
    return next(err);
  }
});

module.exports = router;