const express = require('express');
const cors = require('cors');
const { getConnection, oracledb, initOraclePool } = require('./connectOracle.js');
const path = require('path');
const app = express();
const port = 3000;
const bcrypt = require('bcrypt');
const frontendPath = path.join(__dirname, '..', 'frontend');
const fs = require('fs').promises; 
const {v4: uuidv4}=require('uuid');



// Importar as rotas
const auth = require('./routes/auth.js')
const redefinirSenha = require('./routes/redefinirSenha.js');
const professor = require('./routes/professor.js')
const professorOrientador = require('./routes/professorOrientador.js');
const atualizarPerfil = require('./routes/atualizarPerfil.js');
const grupos = require('./routes/grupos.js');
const notificacoes = require('./routes/notificacoes.js');
const usuarios = require ('./routes/usuarios.js');
const aluno = require('./routes/alunoAtividade.js')
const entregas = require('./routes/entregas.js')
const projetos = require('./routes/projetos.js')
const avaliar = require('./routes/avaliacoes.js')
const notas = require('./routes/alunoNotas.js')
const reconsideracoes = require('./routes/professorReconsideracoes.js')
const ListaProjetos = require('./routes/CoordenadorProjetos.js')
const coordenadorRelatorios= require('./routes/CoordenadorRelatorios.js')

//importar as rotas de tratamento de erros
const attachResponseHelpers = require('./middlewares/responseMiddleware.js');
const notFound = require('./middlewares/notFound.js');
const errorHandler = require('./middlewares/errorHandler.js');

const { AppError } = require('./helpers/response.js');



app.use(cors());
app.use(express.static(frontendPath)); 
app.use(express.json()); 
app.use(attachResponseHelpers);



// Rota para servir o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend','views', 'index.html'));
});

app.use('/imagens/perfil', express.static(path.join(__dirname, '..', 'frontend', 'imagens', 'perfil')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Usar as rotas importadas
app.use('/',auth)
app.use('/professor', professor);
app.use('/professor_orientador', professorOrientador);
app.use('/perfil', atualizarPerfil);
app.use('/',grupos);
app.use('/', notificacoes);
app.use('/',usuarios);
app.use('/', redefinirSenha);
app.use('/', aluno);
app.use('/', entregas);
app.use('/',projetos);
app.use('/',avaliar);
app.use('/',notas);
app.use('/',reconsideracoes);
app.use('/coordenador',ListaProjetos);
app.use('/coordenador',coordenadorRelatorios);





//rota do login
// app.post('/login', async (req, res, next) => {
//     const { username, password } = req.body;
   

  
//     try {
//       if (!username || !password) {
//         throw new AppError('Credenciais inválidas.', { status: 400, code: 'AUTH_INVALID_INPUT' });
//       }
  
//       const connection = await getConnection();
//       try {
//         const result = await connection.execute(
//           `SELECT ID, EMAIL, SENHA, TIPO FROM Usuarios WHERE UPPER(email) = UPPER(:email)`,
//           { email: String(username) },
//           { outFormat: oracledb.OUT_FORMAT_OBJECT }
//         );
  
//         const user = result.rows[0];
//         const genericFail = () => res.fail('AUTH_INVALID_CREDENTIALS', 'Usuário ou senha incorretos.', 401);
  
//         if (!user) return genericFail();
  
//         const passwordMatch = await bcrypt.compare(String(password), user.SENHA);
//         if (!passwordMatch) return genericFail();
  
//         let roleFrontend = 'aluno';
//         const tipo = user.TIPO?.toLowerCase();
//         if (tipo === 'professor') roleFrontend = 'professor';
//         else if (tipo === 'coordenador') roleFrontend = 'coordenador';
//         else if (tipo === 'professor_orientador') roleFrontend = 'professor_orientador';

//         const { gerarToken } = require('./helpers/jwt.js');
//         const payload = { id: user.ID, userRole: roleFrontend };
//         const token = gerarToken(payload);
        
  
//         return res.ok({ ...payload,token}, 'Login realizado com sucesso.');
//       } finally {
//         try { await connection.close(); } catch (closeError) { console.error('Erro ao fechar a conexão:', closeError); }
//       }
//     } catch (err) {
//       return next(err);
//     }
//   });



 
// // Rota de cadastro
// app.post('/cadastro', async (req, res, next) => {
//     let { nome, email, senha, semestre, tipo } = req.body;
  
//     try {
//       if (!nome || !email || !senha) {
//         throw new AppError('Nome, e-mail e senha são obrigatórios.', { status: 400, code: 'USR_MISSING_FIELDS' });
//       }
  
//       tipo = tipo || 'Aluno';
//       semestre = semestre ? parseInt(semestre, 10) : null;
  
//       const connection = await getConnection();
//       try {
//         const emailExistsResult = await connection.execute(
//           `SELECT COUNT(1) AS CNT FROM Usuarios WHERE UPPER(email) = UPPER(:email)`,
//           { email },
//           { outFormat: oracledb.OUT_FORMAT_OBJECT }
//         );
//         const emailExists = emailExistsResult.rows[0].CNT > 0;
  
//         if (emailExists) {
//           return res.fail('USR_EMAIL_EXISTS', 'Este e-mail já está cadastrado.', 409);
//         }
  
//         const hashedSenha = await bcrypt.hash(String(senha), 10);
  
//         const result = await connection.execute(
//           `INSERT INTO Usuarios (nome, email, senha, tipo, semestre, ativo)
//            VALUES (:nome, :email, :senha, :tipo, :semestre, 1)`,
//           { nome, email, senha: hashedSenha, tipo, semestre },
//           { autoCommit: true }
//         );
  
//         if (result.rowsAffected > 0) {
//           return res.ok(null, 'Usuário cadastrado com sucesso!', 201);
//         }
  
//         throw new AppError('Erro ao cadastrar usuário.', { status: 500, code: 'USR_CREATE_FAILED' });
//       } finally {
//         try { await connection.close(); } catch (closeError) { console.error('Erro ao fechar a conexão:', closeError); }
//       }
//     } catch (err) {
//       return next(err);
//     }
//   });



// ROTA DINÂMICA PARA SERVIR OUTRAS PÁGINAS HTML DA PASTA 'views'
// Ex: /avaliar vai servir frontend/views/avaliar.html
// Ex: /TelaPrincipal vai servir frontend/views/TelaPrincipal.html
// Esta rota deve vir DEPOIS de todas as suas rotas de API e rotas estáticas específicas.
app.get('/:pageName', (req, res, next) => { // Adicionado 'next' para possível encadeamento
    const pageName = req.params.pageName;

    // Lista de nomes de página válidos (opcional, mas recomendado para segurança e evitar conflitos)
    // Se você não quiser manter uma lista, pode remover esta validação,
    // mas a validação de caracteres abaixo é altamente recomendada.
    // const validPages = ['TelaPrincipal', 'avaliar', 'criar-atividade', /* ... outros nomes de arquivo sem .html ... */];
    // if (!validPages.includes(pageName)) {
    //     return next(); // Passa para o próximo manipulador (o 404) se não for uma página conhecida
    // }

    // Validação para evitar que `pageName` contenha caracteres perigosos
    // Permite apenas letras (maiúsculas e minúsculas), números, hífen e underscore.
    if (!/^[a-zA-Z0-9_-]+$/.test(pageName)) {
        // Se o nome da página contiver caracteres inesperados, consideramos como não encontrado.
        // Você pode enviar diretamente o 404 aqui ou chamar next() para o manipulador de 404 global.
        return res.status(404).sendFile(path.join(frontendPath, 'views', '404.html'), (err404) => {
            if (err404 && !res.headersSent) {
                res.status(404).send('Página não encontrada (e 404.html personalizado também não).');
            }
        });
    }

    const filePath = path.join(frontendPath, 'views', `${pageName}.html`);

    res.sendFile(filePath, (err) => {
        if (err) {
            // Se o arquivo não for encontrado ou outro erro ocorrer ao enviar
            if (!res.headersSent) { // Verifica se a resposta já não foi iniciada
                if (err.code === 'ENOENT') { // ENOENT = Error NO ENTry (arquivo ou diretório não encontrado)
                    // O arquivo HTML específico não foi encontrado, então chamamos next()
                    // para que o manipulador de 404 global seja acionado.
                    next();
                } else {
                    // Outro tipo de erro (ex: permissão de leitura)
                    console.error(`Erro ao servir o arquivo ${filePath}:`, err);
                    res.status(500).send('Ocorreu um erro no servidor ao tentar carregar a página.');
                }
            }
        }
    });
});


app.use(async (req, res) => {
    try {
      const notFoundPath = path.join(frontendPath,'views', '404.html');
      await fs.access(notFoundPath);
      res.status(404).sendFile(notFoundPath);
    } catch (error) {
      if (!res.headersSent) {
          res.status(404).send('Página não encontrada');
      }
    }
});


app.use(notFound);
app.use(errorHandler);

initOraclePool()
  .then(() => {
    app.listen(port, () => {
      console.log(`Servidor rodando em http://localhost:${port}/`);
    });
  })
  .catch((err) => {
    console.error('Erro ao inicializar pool Oracle:', err);
    process.exit(1);
  });


  process.on('SIGINT', async () => {
    try {
      await oracledb.getPool().close(10);
      console.log('Pool Oracle fechado.');
      process.exit(0);
    } catch (err) {
      console.error('Erro ao fechar pool Oracle:', err);
      process.exit(1);
    }
  });