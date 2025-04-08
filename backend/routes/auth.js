const express = require('express');
const router = express.Router();
const { getConnection, oracledb } = require('../connectOracle.js');
const bcrypt = require('bcrypt');

// Rota de login
//rota do login
router.post('/login', async (req, res) => {
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

// Rota de cadastro
router.post('/cadastro', async (req, res) => {
    const { nome, email, senha } = req.body;
    let { semestre, tipo } = req.body 
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