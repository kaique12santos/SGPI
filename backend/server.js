const express = require('express');
const cors = require('cors');
const { getConnection, oracledb } = require('./connectOracle.js');
const path = require('path');
const app = express();
const port = 3000;
const bcrypt = require('bcrypt');
const frontendPath = path.join(__dirname, '..', 'frontend');
const fs = require('fs').promises; 

// Importar as rotas
const professor = require('./routes/professor.js')
const professorOrientador = require('./routes/professorOrientador.js');
const atualizarPerfil = require('./routes/atualizarPerfil.js');
const grupos = require('./routes/grupos.js');
const notificacoes = require('./routes/notificacoes.js');
const usuarios = require ('./routes/usuarios.js');



app.use(cors());
app.use(express.static(frontendPath)); 
app.use(express.json()); 


// Rota para servir o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
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

            // Mapeie os valores do banco para os valores esperados pelo frontend
            let roleFrontend = 'aluno'; // valor padrão
            
            // Adapte este mapeamento conforme os valores do seu banco
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
//atualizações futuras
//---------------------------------------------------------------------------------------------

// Rota de atualização de dados
app.put('/atualizar', async (req, res) => {
    const { userId, username, password, email } = req.body;  // userId para identificar o usuário

    try {
        const connection = await getConnection();
        const result = await connection.execute(
            `UPDATE loginn SET username = :1, senha = :2, email = :3 WHERE id = :4`, // Assumindo que você tem um campo 'id'
            [username, password, email, userId]
        );

        if (result.rowsAffected > 0) {
            res.json({ success: true, message: 'Dados atualizados com sucesso!' });
        } else {
            res.json({ success: false, message: 'Erro ao atualizar dados.' });
        }

        if (connection) await connection.close();

    } catch (error) {
        console.error('Erro ao atualizar dados:', error);
        res.status(500).json({ success: false, message: 'Erro no servidor.' });
    }
});



// Rota para deletar tarefa
app.delete('/tarefas/:id', async (req, res) => {  // Usando parâmetro de rota para o ID da tarefa
    const taskId = req.params.id;

    try {
        const connection = await getConnection();
        const result = await connection.execute(
            `DELETE FROM tarefas WHERE id = :1`, // Substitua 'tarefas' pelo nome da sua tabela de tarefas
            [taskId]
        );

        if (result.rowsAffected > 0) {
            res.json({ success: true, message: 'Tarefa excluída com sucesso!' });
        } else {
            res.json({ success: false, message: 'Tarefa não encontrada ou erro ao excluir.' });
        }

        if (connection) await connection.close();

    } catch (error) {
        console.error('Erro ao excluir tarefa:', error);
        res.status(500).json({ success: false, message: 'Erro no servidor.' });
    }
});


// Rota para a página do dashboard (protegida)
app.get('/TelaPrincipal', (req, res) => {
    res.sendFile(path.join(frontendPath, 'TelaPrincipal.html'));
})


app.use(async (req, res) => {
    try {
      const notFoundPath = path.join(frontendPath, '404.html');
      // Verificar se existe uma página 404 personalizada
      await fs.access(notFoundPath);
      res.status(404).sendFile(notFoundPath);
    } catch (error) {
      // Se não existir, enviar uma mensagem simples
      res.status(404).send('Página não encontrada');
    }
  });




app.listen(port, async () => { 
  console.log(`Servidor rodando em http://localhost:${port}/`);
});