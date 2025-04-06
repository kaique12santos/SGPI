const express = require('express');
const cors = require('cors');
const { getConnection, oracledb } = require('./connectOracle.js');
const path = require('path');
const app = express();
const port = 3000;
const bcrypt = require('bcrypt');
const frontendPath = path.join(__dirname, '..', 'frontend');
const fs = require('fs').promises; // Para operações de arquivo assíncronas

app.use(cors());
app.use(express.static(frontendPath)); 
app.use(express.json()); 


// Rota para servir o index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(port, async () => { 
    console.log(`Servidor rodando em http://localhost:${port}/`);

});

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

            // Comparando a senha digitada com a senha criptografada
            const passwordMatch = await bcrypt.compare(passwordString, storedHashedPassword);

            if (passwordMatch) {
                res.json({ success: true });
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

// app.get('/professor/criar-atividade', async (req, res) => {
//     try {
//       // Verificar se o arquivo existe antes de enviá-lo (opcional)
//       const filePath = path.join(frontendPath, 'criar-atividade.html');
//       await fs.access(filePath);
      
//       // Enviar o arquivo
//       res.sendFile(filePath);
//     } catch (error) {
//       console.error('Erro ao acessar a página do professor:', error);
      
//       // Se o arquivo não existir ou houver outro erro
//       res.status(404).send('Página não encontrada. Erro: ' + error.message);
//     }
//   });

//rota de criar-atividade
 app.get('/professor/criar-atividade', (req, res) => {
    // Verifique se o usuário tem permissão de professor (implementação depende do seu sistema de autenticação)
    // if (!req.session.user || req.session.user.role !== 'professor') {
    //   return res.status(403).send('Acesso negado: Somente professores podem acessar esta página');
    // }
    
    // Opção 1: Renderizar uma view (se estiver usando um motor de template)
    // return res.render('professor/criar-atividade', {
    //   title: 'Criar Nova Atividade',
    //   professor: req.session.user
    // });
    
    // Opção 2: Enviar um arquivo HTML estático
   return res.sendFile(path.join(frontendPath, 'criar-atividade.html'));
    
    // Opção 3: Responder com JSON (para aplicações SPA/frontend separado)
    // return res.json({
    //   page: 'criar-atividade',
    //   message: 'Use esta API para criar uma nova atividade'
    // });
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

app.post('/professor/atividades', async (req, res) => {
    const {
        titulo,
        descricao,
        professor_id,
        projeto_id,
        prazo_entrega,
        criterios_avaliacao,
        semestre
    } = req.body;

    const connection = await getConnection();

    try {
        // Validação básica
        if (!titulo || !descricao || !professor_id || !projeto_id || !prazo_entrega || !semestre) {
            if (connection) await connection.close();
            return res.status(400).json({ success: false, message: 'Todos os campos obrigatórios devem ser preenchidos.' });
        }

        // Inserção na tabela Atividades
        const result = await connection.execute(
            `INSERT INTO Atividades (
                titulo, descricao, professor_id, projeto_id, prazo_entrega,
                criterios_avaliacao, semestre
            ) VALUES (
                :1, :2, :3, :4, TO_TIMESTAMP(:5, 'YYYY-MM-DD"T"HH24:MI'), :6, :7
            )`,
            [
                titulo,
                descricao,
                professor_id,
                projeto_id,
                prazo_entrega,
                criterios_avaliacao,
                semestre
            ],
            { autoCommit: true }
        );

        if (result.rowsAffected > 0) {
            if (connection) await connection.close();
            return res.json({ success: true, message: 'Atividade cadastrada com sucesso!' });
        } else {
            if (connection) await connection.close();
            return res.status(500).json({ success: false, message: 'Erro ao cadastrar atividade.' });
        }

    } catch (error) {
        console.error('Erro ao cadastrar atividade:', error);
        if (connection) {
            try { await connection.close(); } catch (innerError) { console.error('Erro ao fechar conexão:', innerError); }
        }
        return res.status(500).json({ success: false, message: 'Erro no servidor.', error: error.message });
    }
});


app.get('/professor/atividades', async (req, res) => {

    const connection = await getConnection();
    try {
      const professorId = 1; // ID fixo por enquanto
      const result = await connection.execute(
        `SELECT titulo, TO_CHAR(prazo_entrega, 'YYYY-MM-DD"T"HH24:MI') as prazo_entrega, semestre
         FROM Atividades
         WHERE professor_id = :professorId
         ORDER BY data_criacao DESC`,
        [professorId]
      );
      
      res.json(result.rows.map(([titulo, prazo_entrega, semestre]) => ({
        titulo, prazo_entrega, semestre
      })));
    } catch (error) {
      console.error('Erro ao buscar atividades:', error);
      res.status(500).json({ message: 'Erro ao buscar atividades' });
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