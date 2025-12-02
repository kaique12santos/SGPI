const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const {closePool}=require ('./conexaoMysql.js');
const path = require('path');
const app = express();
require('dotenv').config();
const frontendPath = path.join(__dirname, '..', 'frontend');
const fs = require('fs').promises; 

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.userway.org",
          "https://*.userway.org",
          "https://cdn.jsdelivr.net" 
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.userway.org",
          "https://*.userway.org",
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com",
        ],
        connectSrc: [
          "'self'",
          "https://api.userway.org",
          "https://*.userway.org",
          "https://cdn.jsdelivr.net"  
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https://cdn.userway.org",
          "https://*.userway.org",
          "https://static.vecteezy.com",
          "https://cdn.jsdelivr.net"
        ],
        fontSrc: [
          "'self'",
          "https://cdn.userway.org",
          "https://*.userway.org",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com"
        ],
        frameSrc: [
          "'self'",
          "https://cdn.userway.org",
          "https://*.userway.org"
        ],
      },
    },
  })
);


// Importar as rotas
const authPerfil = require('./middlewares/authPerfil.js');
const auth = require('./routes/auth.js')
const redefinirSenha = require('./routes/redefinirSenha.js');
const palavraChaveRoutes = require('./routes/palavraChave');
const atualizarPerfil = require('./routes/atualizarPerfil.js');
const grupos = require('./routes/grupos.js');
const notificacoes = require('./routes/notificacoes.js')
const usuarios = require ('./routes/usuarios.js');
const alunoAtividadesRoutes = require('./routes/alunoAtividadesRoutes.js');
const entregas = require('./routes/entregas.js')
const projetos = require('./routes/projetos.js')
const ListaProjetos = require('./routes/CoordenadorProjetos.js')
const coordenadorRelatorios= require('./routes/CoordenadorRelatorios.js')
const perfilAcademico = require('./routes/perfilAcademico.js')
const perfilDashboard = require( './routes/perfilDashboard.js'); 
const professoresDiciplinas = require('./routes/professoresDiciplinas.js')
const semestreRoutes = require('./routes/semestres.js');
const atividadesProfessorRoutes = require ('./routes/atividadesProfessorRoutes.js')
const configRoutes = require('./routes/configRoutes');


//importar as rotas de tratamento de erros
const attachResponseHelpers = require('./middlewares/responseMiddleware.js');
const notFound = require('./middlewares/notFound.js');
const errorHandler = require('./middlewares/errorHandler.js');

const { AppError } = require('./helpers/response.js');
const port = process.env.PORT;


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
app.use('/professor',authPerfil, atividadesProfessorRoutes);
app.use('/professor_orientador',authPerfil, atividadesProfessorRoutes);
app.use('/perfil', atualizarPerfil);
app.use('/perfilAcademico',perfilAcademico);
app.use('/dashboard', perfilDashboard);
app.use('/',grupos);
app.use('/', notificacoes);
app.use('/',usuarios);
app.use('/', redefinirSenha);
app.use('/aluno', authPerfil, alunoAtividadesRoutes);
app.use('/', entregas);
app.use('/',projetos);
app.use('/config', configRoutes);


app.use('/coordenador',ListaProjetos);
app.use('/coordenador',coordenadorRelatorios);
app.use('/api', palavraChaveRoutes);
app.use('/',professoresDiciplinas)
app.use('/semestres', semestreRoutes);



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

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}/`);
});

process.on('SIGINT', async () => {
  try {
    await closePool();
    console.log('Pool MySQL fechado.');
    process.exit(0);
  } catch (err) {
    console.error('Erro ao fechar pool MySQL:', err);
    process.exit(1);
  }
});
process.on('SIGTERM', async () => {
  try {
    await closePool();
    console.log('Pool MySQL fechado.');
    process.exit(0);
  } catch (err) {
    console.error('Erro ao fechar pool MySQL:', err);
    process.exit(1);
  }
});