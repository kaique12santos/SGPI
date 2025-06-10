const express = require('express');
const cors = require('cors');
const { getConnection, oracledb } = require('./connectOracle.js');
const path = require('path');
const app = express();
const port = 3000;
const bcrypt = require('bcrypt');
const frontendPath = path.join(__dirname, '..', 'frontend');
const fs = require('fs').promises; 
const {v4: uuidv4}=require('uuid');



// Importar as rotas
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



app.use(cors());
app.use(express.static(frontendPath)); 
app.use(express.json()); 


// Rota para servir o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend','views', 'index.html'));
});

app.use('/imagens/perfil', express.static(path.join(__dirname, '..', 'frontend', 'imagens', 'perfil')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Usar as rotas importadas
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
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const connection = await getConnection();
        const usernameString = String(username);
        const passwordString = String(password);

        
        const result = await connection.execute(
            `SELECT * FROM Usuarios WHERE UPPER(email) = UPPER(:1)`,
            [usernameString], 
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (result.rows.length > 0) {
            const storedHashedPassword = result.rows[0].SENHA;

            const userRole = result.rows[0].TIPO;

            let roleFrontend = 'aluno'; // valor padrão
            
            if (userRole === 'Professor' || userRole === 'professor') {
                roleFrontend = 'professor';
            } else if (userRole === 'Coordenador' || userRole === 'coordenador') {
                roleFrontend = 'coordenador';
            }else if (userRole === 'Professor_Orientador' || userRole === 'professor_orientador') {
                roleFrontend='professor_orientador'
            }
           
            
            // Comparando a senha digitada com a senha criptografada
            const passwordMatch = await bcrypt.compare(passwordString, storedHashedPassword);

            if (passwordMatch) {
                res.json({ success: true ,userRole: roleFrontend,id: result.rows[0].ID});
                console.log('LOGIN SUCESSO:', {
                    id: result.rows[0].ID,
                    role: roleFrontend
                  });
            } else {
                res.json({ success: false, message: 'Usuário ou senha incorretos.' });
            }
        } else {
            res.json({ success: false, message: 'Usuário ou senha incorretos.' });
        }

        // Fecha a conexão após o uso
        if (connection) {
            try {
                await connection.close();
            } catch (closeError) {
                console.error("Erro ao fechar a conexão:", closeError);
            }
        }
    } catch (error) {
        console.error('Erro ao realizar login:', error);
        res.status(500).json({ success: false, message: 'Erro no servidor.' });
    }
});



 
// Rota de cadastro
app.post('/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body;
  let { semestre, tipo } = req.body;
    
  tipo = tipo || 'Aluno'; 
  semestre = semestre ? parseInt(semestre, 10) : null; 

  const connection = await getConnection();
    
  try {
        
// Verificar se o email já existe
      const emailExistsResult = await connection.execute(
        `SELECT COUNT(*) FROM Usuarios WHERE email = :1`,
        [email]
      );
      const emailExists = emailExistsResult.rows[0][0] > 0;

      if (emailExists) {
          if (connection) await connection.close();
            
          return res.status(400).json({ success: false, message: 'Este e-mail já está cadastrado.' });    
      }
       // variavel saltRounds para definir complexidade da criptografia
       //variavel hashedSenha para receber a criptografia
      const saltRounds = 10;
      const hashedSenha = await bcrypt.hash(senha, saltRounds);

       // Inserir usuário
      const result = await connection.execute(
          `INSERT INTO Usuarios (nome, email, senha, tipo, semestre, ativo) VALUES (:1, :2, :3, :4, :5, :6)`,
          [nome, email, hashedSenha, tipo, semestre, 1],
          { autoCommit: true } 
      );

      if (result.rowsAffected > 0) {

       const usuariosResult = await connection.execute(`SELECT * FROM Usuarios`);
           console.log('Lista de usuários:', usuariosResult.rows);
           if (connection) await connection.close();
           return res.json({ success: true, message: 'Usuário cadastrado com sucesso!' });
       } else {
           if (connection) await connection.close();
           return res.json({ success: false, message: 'Erro ao cadastrar usuário.' });
       }
        
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        if (connection) { 
            try { await connection.close(); } catch(innerError) { console.error("Erro fechando conexão:", innerError); } 
        }

        return res.status(500).json({ success: false, message: 'Erro no servidor.', error: error.message });
    }
});



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




app.listen(port, async () => { 
  console.log(`Servidor rodando em http://localhost:${port}/`);
});