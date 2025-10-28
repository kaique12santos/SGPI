
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
  const { nome, email, senha, tipo, disciplinas, termos_aceitos,politica_privacidade,chaveProfessor } = req.body;

  try {
    if (!nome || !email || !senha || !tipo) {
      return res.status(400).json({ success: false, message: "Nome, e-mail, senha e tipo são obrigatórios." });
    }

    if (senha.length < 6) {
      return res.status(400).json({ success: false, message: "Senha deve ter pelo menos 6 caracteres." });
    }

    if (![0,1,true,false].includes(termos_aceitos) && ![0,1,true,false].includes(politica_privacidade)) {
      return res.status(400).json({ success: false, message: "Os campos termos_aceitos e politica_privacidade devem ser 0 ou 1." });
    }

    if ((tipo === 'professor' || tipo === 'professor_orientador') && !chaveProfessor) {
      return res.status(400).json({ 
        success: false, 
        message: "Chave de professor é obrigatória para este tipo de usuário." 
      });
    }

    let chaveValidada = null;
    if (chaveProfessor) {
      // Valida a chave internamente
      const connection = await getConnection();
      try {
        const chaveResult = await connection.execute(
          `SELECT chave_id, usos, limite_uso,tipo_usuario FROM PalavrasChave 
           WHERE chave = ? AND usos < limite_uso`,
          [chaveProfessor]
        );

        if (!chaveResult.rows || chaveResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Chave inválida ou já totalmente utilizada."
          });
        }

        chaveValidada = chaveResult.rows[0];
      } finally {
        await connection.close();
      }
    }

     //---------------------------
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
      tipo: chaveValidada ? chaveValidada.tipo_usuario : tipo,
      
      disciplinas,
      termos_aceitos,
      politica_privacidade,
      chaveProfessor: chaveValidada ? chaveValidada.chave_id : null
    };
    
   
    const token = await emailService.sendValidationEmail(email, tokenData);

    return res.status(200).json({
      success: true,
      message: "Email de validação enviado. Confirme para concluir seu cadastro.",
      
    });
    

  } catch (error) {
    console.error("Erro no pré-cadastro:", error);
    res.status(500).json({ success: false, message: "Erro interno no servidor." });
  }
});

// Adicione esta rota no seu arquivo de rotas (ex: routes/auth.js ou routes/palavraChave.js)
router.post('/validar-chave-professor', async (req, res) => {
  const { chaveProfessor } = req.body;

  if (!chaveProfessor) {
    return res.status(400).json({ 
      success: false, 
      message: 'Chave do professor é obrigatória.' 
    });
  }

  try {
    const connection = await getConnection();
    
    try {
      // Busca a chave no banco
      const result = await connection.execute(
        `SELECT chave_id, chave, tipo_usuario, usos, limite_uso, gerado_por
         FROM PalavrasChave 
         WHERE chave = ? AND usos < limite_uso`,
        [chaveProfessor]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(200).json({
          success: false
        });
      }

      const chaveData = result.rows[0];

      // Verifica se é do tipo correto (Professor ou Professor_Orientador)
      if (!['Professor', 'Professor_Orientador'].includes(chaveData.tipo_usuario)) {
        return res.status(400).json({
          success: false,
          message: 'Esta chave não é válida para professores.'
        });
      }

      // Retorna sucesso com dados da chave
      return res.status(200).json({
        success: true,
        message: 'Chave válida!',
        data: {
          chaveId: chaveData.chave_id,
          tipo: chaveData.tipo_usuario,
          usosRestantes: chaveData.limite_uso - chaveData.usos,
          geradoPor: chaveData.gerado_por
        }
      });

    } finally {
      await connection.close();
    }

  } catch (error) {
    console.error('Erro ao validar chave do professor:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao validar chave.'
    });
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
    console.log("DEBUG userData recebido no validateToken:", result.userData);
    if (!result.success) return res.status(400).json(result);

    const { nome, email, senha, tipo, disciplinas, termos_aceitos,politica_privacidade, chaveProfessor } = result.userData;

    const hashedPassword = await bcrypt.hash(senha, 10);

    const connection = await getConnection();
    try {
      // Inserir usuário de verdade só agora
      const insertResult = await connection.execute(
        "INSERT INTO Usuarios (nome, email, senha, tipo, ativo, termos_aceitos,politica_privacidade) VALUES (?, ?, ?, ?, 1, ?,?)",
        [nome, email, hashedPassword, tipo, termos_aceitos ? 1 : 0,politica_privacidade ? 1 : 0]
      );
      const usuarioId = insertResult.rows.insertId;

      // Consumo da chave 
      if (result.userData.chaveProfessor) {
        console.log("DEBUG chaveProfessor recebido no token:", result.userData.chaveProfessor);
        await connection.execute(
          `UPDATE PalavrasChave 
          SET usos = usos + 1, usuario_destino_id = ?
          WHERE chave_id = ?`,
          [usuarioId, result.userData.chaveProfessor]
        );

      }
      // if (tipo === "Aluno") {
      //   await connection.execute("INSERT INTO Alunos (usuario_id) VALUES (?)", [usuarioId]);

      //   if (Array.isArray(disciplinas) && disciplinas.length > 0) {
      //     const resultDisciplinas = await connection.execute(
      //       `SELECT id FROM Disciplinas WHERE codigo IN (${disciplinas.map(() => "?").join(",")})`,
      //       disciplinas
      //     );
      //     const disciplinaIds = resultDisciplinas.rows.map(d => d.id);

      //     if (disciplinaIds.length > 0) {
      //       const resultSemestres = await connection.execute(
      //         `SELECT DISTINCT semestre_id FROM Disciplinas_Ofertas WHERE disciplina_id IN (${disciplinaIds.map(() => "?").join(",")})`,
      //         disciplinaIds
      //       );


      //       for (const oferta of ofertasResult) {
      //         await connection.execute(
      //           `INSERT INTO Aluno_Oferta (aluno_id, oferta_id, status)
      //            VALUES (?, ?, 'Matriculado')`,
      //           [usuarioId, oferta.oferta_id]
      //         );
      //       }
      //       console.log(`✅ ${ofertasResult.length} disciplinas vinculadas ao aluno ID ${usuarioId}`);
      //     }
          
      //   }
      // }

      if (tipo === "Aluno") {
        // 1️⃣ Cadastra o aluno na tabela Alunos
        await connection.execute("INSERT INTO Alunos (usuario_id) VALUES (?)", [usuarioId]);
        console.log(`✅ Inserido na tabela Alunos: ${usuarioId}`);
      
        // 2️⃣ Se o aluno escolheu disciplinas no front (TODA a lógica de disciplina fica AQUI DENTRO)
        if (Array.isArray(disciplinas) && disciplinas.length > 0) {
          // Busca os IDs das disciplinas selecionadas
          const resultDisciplinas = await connection.execute(
            `SELECT id, codigo FROM Disciplinas WHERE codigo IN (${disciplinas.map(() => "?").join(",")})`,
            disciplinas
          );
          const disciplinaIds = resultDisciplinas.rows.map(d => d.id);
      
          if (disciplinaIds.length > 0) {
            // Busca as ofertas correspondentes a essas disciplinas
            const ofertasResult = await connection.execute(
              `SELECT id AS oferta_id, disciplina_id, semestre_id 
               FROM Disciplinas_Ofertas 
               WHERE disciplina_id IN (${disciplinaIds.map(() => "?").join(",")})`,
              disciplinaIds
            );
            
            const ofertas = ofertasResult.rows; 
            console.log("DEBUG ofertasResult:", ofertasResult.rows);
      
            if (ofertas.length > 0) {
              // Faz o vínculo do aluno com as ofertas encontradas
              for (const oferta of ofertas) {
                await connection.execute(
                  `INSERT INTO Aluno_Oferta (aluno_id, oferta_id, status)
                   VALUES (?, ?, 'Matriculado')`,
                  [usuarioId, oferta.oferta_id]
                );
              }
              console.log(`✅ ${ofertas.length} disciplinas vinculadas ao aluno ID ${usuarioId}`);
            } else {
              console.warn("⚠️ Nenhuma oferta encontrada para as disciplinas:", disciplinaIds);
            }
          }
        }
        // FIM do bloco "Aluno"
      
      // ✅ CORREÇÃO: Os 'else if' começam AQUI, no mesmo nível do 'if (tipo === "Aluno")'
      } else if (tipo === "Professor") {
        await connection.execute("INSERT INTO Professores (usuario_id) VALUES (?)", [usuarioId]);
        console.log(`✅ Inserido na tabela Professores: ${usuarioId}`);

      } else if (tipo === "Professor_Orientador") {
        await connection.execute("INSERT INTO Professores_Orientadores (usuario_id) VALUES (?)", [usuarioId]);
        console.log(`✅ Inserido na tabela Professores_Orientadores: ${usuarioId}`);

      } else if (tipo === "Coordenador") {
        await connection.execute("INSERT INTO Coordenador (usuario_id) VALUES (?)", [usuarioId]);
        console.log(`✅ Inserido na tabela Coordenador: ${usuarioId}`);

      } else if (tipo === "Administrador") {
        await connection.execute("INSERT INTO Administrador (usuario_id) VALUES (?)", [usuarioId]);
        console.log(`✅ Inserido na tabela Administrador: ${usuarioId}`);
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
      await connection.execute(
        `UPDATE Usuarios 
         SET ultimo_acesso = NOW() 
         WHERE id = ?`,
        [user.id]
      );

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