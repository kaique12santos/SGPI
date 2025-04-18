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


app.use(cors());
app.use(express.static(frontendPath)); 
app.use(express.json()); 


// Rota para servir o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Usar as rotas importadas
app.use('/professor', professor);



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
                res.json({ success: true ,userRole: roleFrontend});
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


// //rota de criar-atividade
//  app.get('/professor/criar-atividade', (req, res) => {
//    return res.sendFile(path.join(frontendPath, 'criar-atividade.html'));
//  });
 
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

//rota para cadastro de atividades
// app.post('/professor/atividades', async (req, res) => {
//     const {
//         titulo,
//         descricao,
//         professor_id,
//         projeto_id,
//         prazo_entrega,
//         criterios_avaliacao,
//         semestre
//     } = req.body;

//     const connection = await getConnection();

//     try {
//         // Validação básica
//         if (!titulo || !descricao || !professor_id || !projeto_id || !prazo_entrega || !semestre) {
//             if (connection) await connection.close();
//             return res.status(400).json({ success: false, message: 'Todos os campos obrigatórios devem ser preenchidos.' });
//         }

//         // Inserção na tabela Atividades
//         const result = await connection.execute(
//             `INSERT INTO Atividades (
//                 titulo, descricao, professor_id, projeto_id, prazo_entrega,
//                 criterios_avaliacao, semestre
//             ) VALUES (
//                 :1, :2, :3, :4, TO_TIMESTAMP(:5, 'YYYY-MM-DD"T"HH24:MI'), :6, :7
//             )`,
//             [
//                 titulo,
//                 descricao,
//                 professor_id,
//                 projeto_id,
//                 prazo_entrega,
//                 criterios_avaliacao,
//                 semestre
//             ],
//             { autoCommit: true }
//         );

//         if (result.rowsAffected > 0) {
//             if (connection) await connection.close();
//             return res.json({ success: true, message: 'Atividade cadastrada com sucesso!' });
//         } else {
//             if (connection) await connection.close();
//             return res.status(500).json({ success: false, message: 'Erro ao cadastrar atividade.' });
//         }

//     } catch (error) {
//         console.error('Erro ao cadastrar atividade:', error);
//         if (connection) {
//             try { await connection.close(); } catch (innerError) { console.error('Erro ao fechar conexão:', innerError); }
//         }
//         return res.status(500).json({ success: false, message: 'Erro no servidor.', error: error.message });
//     }
// });


// Função para converter LOB (CLOB) em string
// function lobToString(lob) {
//     return new Promise((resolve, reject) => {
//       if (lob === null) return resolve(null);
  
//       let content = '';
//       lob.setEncoding('utf8');
  
//       lob.on('data', chunk => {
//         content += chunk;
//       });
  
//       lob.on('end', () => {
//         resolve(content);
//       });
  
//       lob.on('error', err => {
//         reject(err);
//       });
//     });
//   }
//   // rota para visualizar os dados
//   app.get('/professor/atividades', async (req, res) => {
//     const connection = await getConnection();
  
//     try {
//       const professorId = 1;
  
//       const result = await connection.execute(
//         `SELECT id,
//                 titulo,
//                 descricao,
//                 criterios_avaliacao,
//                 TO_CHAR(prazo_entrega, 'YYYY-MM-DD"T"HH24:MI') as prazo_entrega,
//                 semestre
//          FROM Atividades
//          WHERE professor_id = :professorId
//          ORDER BY data_criacao DESC`,
//         [professorId],
//         { outFormat: oracledb.OUT_FORMAT_OBJECT }
//       );
  
//       // Processar cada linha e transformar os CLOBs em string
//       const atividades = await Promise.all(result.rows.map(async row => {
//         const descricao = await lobToString(row.DESCRICAO);
//         const criterios = await lobToString(row.CRITERIOS_AVALIACAO);
  
//         return {
//           id: row.ID,           
//           titulo: row.TITULO,
//           descricao,
//           criterios_avaliacao: criterios,
//           prazo_entrega: row.PRAZO_ENTREGA,
//           semestre: row.SEMESTRE
//         };
//       }));
  
//       res.json(atividades);
//     } catch (error) {
//       console.error('Erro ao buscar atividades:', error);
//       res.status(500).json({ message: 'Erro ao buscar atividades' });
//     }
//   });

// // Rota para atualizar uma atividade existente
// app.put('/professor/atividades/:atividadeId', async (req, res) => {
//   const connection = await getConnection();
  
//   try {
//     const atividadeId = parseInt(req.params.atividadeId, 10);
    
//     if (isNaN(atividadeId)) {
//       return res.status(400).json({ message: 'ID de atividade inválido' });
//     }
    
//     const professorId = 1; // ID fixo como no exemplo original
    
//     const {
//       titulo,
//       descricao,
//       prazo_entrega,
//       criterios_avaliacao,
//       semestre,
//       projeto_id
//     } = req.body;
    
//     // Validação básica
//     if (!titulo || !descricao || !prazo_entrega || !criterios_avaliacao || !semestre) {
//       return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos' });
//     }
    
//     // Verificar se a atividade existe e pertence ao professor
//     const verificacao = await connection.execute(
//       `SELECT COUNT(*) as count 
//        FROM Atividades 
//        WHERE id = :atividadeId AND professor_id = :professorId`,
//       [atividadeId, professorId],
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
    
//     if (verificacao.rows[0].COUNT === 0) {
//       return res.status(404).json({ message: 'Atividade não encontrada ou você não tem permissão para alterá-la' });
//     }
    
//     // Atualizar a atividade
//     const result = await connection.execute(
//       `UPDATE Atividades 
//        SET titulo = :titulo, 
//            descricao = :descricao, 
//            prazo_entrega = TO_TIMESTAMP(:prazo_entrega, 'YYYY-MM-DD"T"HH24:MI'),
//            criterios_avaliacao = :criterios_avaliacao,
//            semestre = :semestre,
//            data_atualizacao = CURRENT_TIMESTAMP
//        WHERE id = :atividadeId AND professor_id = :professorId`,
//       [
//         titulo,
//         descricao,
//         prazo_entrega,
//         criterios_avaliacao,
//         semestre,
//         atividadeId,
//         professorId
//       ],
//       { autoCommit: true }
//     );
    
//     if (result.rowsAffected > 0) {
//       res.json({ message: 'Atividade atualizada com sucesso!' });
//     } else {
//       res.status(500).json({ message: 'Não foi possível atualizar a atividade' });
//     }
    
//   } catch (error) {
//     console.error('Erro ao atualizar atividade:', error);
    
//     if (connection) {
//       try {
//         await connection.rollback();
//       } catch (rollbackError) {
//         console.error('Erro ao realizar rollback:', rollbackError);
//       }
//     }
    
//     res.status(500).json({ message: 'Erro ao atualizar atividade', error: error.message });
//   } finally {
//     if (connection) {
//       try {
//         await connection.close();
//       } catch (closeError) {
//         console.error('Erro ao fechar conexão:', closeError);
//       }
//     }
//   }
// });

// // Também é necessário corrigir a rota DELETE para usar o mesmo caminho
// // Modifique a rota DELETE existente para usar o mesmo padrão de URL
// app.delete('/professor/atividades/:atividadeId', async (req, res) => {
//   const connection = await getConnection();
  
//   try {
//     const atividadeId = parseInt(req.params.atividadeId, 10);
    
//     if (isNaN(atividadeId)) {
//       return res.status(400).json({ message: 'ID de atividade inválido' });
//     }
    
//     const professorId = 1; // Usando ID fixo como no exemplo original
    
//     // Verificar se a atividade pertence ao professor antes de excluir
//     const verificacao = await connection.execute(
//       `SELECT COUNT(*) as count 
//        FROM Atividades 
//        WHERE id = :atividadeId AND professor_id = :professorId`,
//       [atividadeId, professorId],
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );
    
//     if (verificacao.rows[0].COUNT === 0) {
//       return res.status(403).json({ message: 'Atividade não encontrada ou você não tem permissão para excluí-la' });
//     }
    
//     // Executar a exclusão
//     const result = await connection.execute(
//       `DELETE FROM Atividades 
//        WHERE id = :atividadeId AND professor_id = :professorId`,
//       [atividadeId, professorId],
//       { autoCommit: true }
//     );
    
//     if (result.rowsAffected > 0) {
//       res.json({ message: 'Atividade excluída com sucesso' });
//     } else {
//       res.status(404).json({ message: 'Não foi possível excluir a atividade' });
//     }
//   } catch (error) {
//     console.error('Erro ao excluir atividade:', error);
    
//     // Rollback em caso de erro
//     if (connection) {
//       try {
//         await connection.rollback();
//       } catch (rollbackError) {
//         console.error('Erro ao realizar rollback:', rollbackError);
//       }
//     }
    
//     res.status(500).json({ message: 'Erro ao excluir atividade', error: error.message });
//   } finally {
//     if (connection) {
//       try {
//         await connection.close();
//       } catch (closeError) {
//         console.error('Erro ao fechar conexão:', closeError);
//       }
//     }
//   }
// });

// // Modifique também a rota GET para retornar os IDs das atividades
// app.get('/professor/atividades', async (req, res) => {
//   const connection = await getConnection();

//   try {
//     const professorId = 1;

//     const result = await connection.execute(
//       `SELECT id,
//               titulo,
//               descricao,
//               criterios_avaliacao,
//               TO_CHAR(prazo_entrega, 'YYYY-MM-DD"T"HH24:MI') as prazo_entrega,
//               semestre
//        FROM Atividades
//        WHERE professor_id = :professorId
//        ORDER BY data_criacao DESC`,
//       [professorId],
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     // Processar cada linha e transformar os CLOBs em string
//     const atividades = await Promise.all(result.rows.map(async row => {
//       const descricao = await lobToString(row.DESCRICAO);
//       const criterios = await lobToString(row.CRITERIOS_AVALIACAO);

//       return {
//         id: row.ID,  // Incluir o ID é crucial para operações de edição e exclusão
//         titulo: row.TITULO,
//         descricao,
//         criterios_avaliacao: criterios,
//         prazo_entrega: row.PRAZO_ENTREGA,
//         semestre: row.SEMESTRE
//       };
//     }));

//     res.json(atividades);
//   } catch (error) {
//     console.error('Erro ao buscar atividades:', error);
//     res.status(500).json({ message: 'Erro ao buscar atividades' });
//   } finally {
//     if (connection) {
//       try {
//         await connection.close();
//       } catch (closeError) {
//         console.error('Erro ao fechar conexão:', closeError);
//       }
//     }
//   }
// });
  
// //rota para deletar atividades
// app.delete('/professor/criar-atividade/:atividadeId', async (req, res) => {
//     const connection = await getConnection();
    
//     try {
//       // Converter explicitamente para número para evitar problemas de tipo
//       const atividadeId = parseInt(req.params.atividadeId, 10);
      
//       // Verificar se é um número válido
//       if (isNaN(atividadeId)) {
//         return res.status(400).json({ message: 'ID de atividade inválido' });
//       }
      
//       const professorId = 1; // Usando ID fixo como no exemplo original
      
//       // Verificar se a atividade pertence ao professor antes de excluir
//       const verificacao = await connection.execute(
//         `SELECT COUNT(*) as count 
//          FROM Atividades 
//          WHERE id = :atividadeId AND professor_id = :professorId`,
//         [atividadeId, professorId],
//         { outFormat: oracledb.OUT_FORMAT_OBJECT }
//       );
      
//       if (verificacao.rows[0].COUNT === 0) {
//         return res.status(403).json({ message: 'Atividade não encontrada ou você não tem permissão para excluí-la' });
//       }
      
//       // Executar a exclusão
//       const result = await connection.execute(
//         `DELETE FROM Atividades 
//          WHERE id = :atividadeId AND professor_id = :professorId`,
//         [atividadeId, professorId]
//       );
      
//       // Commit da transação
//       await connection.commit();
      
//       if (result.rowsAffected > 0) {
//         res.json({ message: 'Atividade excluída com sucesso' });
//       } else {
//         res.status(404).json({ message: 'Não foi possível excluir a atividade' });
//       }
//     } catch (error) {
//       console.error('Erro ao excluir atividade:', error);
      
//       // Rollback em caso de erro
//       if (connection) {
//         try {
//           await connection.rollback();
//         } catch (rollbackError) {
//           console.error('Erro ao realizar rollback:', rollbackError);
//         }
//       }
      
//       res.status(500).json({ message: 'Erro ao excluir atividade' });
//     } finally {
//       if (connection) {
//         try {
//           await connection.close();
//         } catch (closeError) {
//           console.error('Erro ao fechar conexão:', closeError);
//         }
//       }
//     }
//   });


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