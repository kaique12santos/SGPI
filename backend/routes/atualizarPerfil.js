const express = require('express');
const router = express.Router();
const { getConnection, oracledb } = require('../connectOracle.js');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

// Configuração do multer para upload de imagens (simplificado)
const storage = multer.memoryStorage(); // Armazena o arquivo na memória

// Filtro para aceitar apenas arquivos de imagem
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // Limite de 5MB
    },
    fileFilter: fileFilter
});

const salvarImagemConvertida = async (buffer, userId) => {
    const uploadDir = path.join(__dirname, '..', '..', 'frontend', 'imagens', 'perfil');
    await fs.mkdir(uploadDir, { recursive: true }); // Garante que o diretório existe

    const caminhoFinal = path.join(uploadDir, `user_${userId}.png`); // Salva como PNG

    await sharp(buffer)
        .png({ quality: 90 }) // Converte para PNG
        .toFile(caminhoFinal);

    return `/imagens/perfil/user_${userId}.png`; // Caminho público para frontend
};

// Rota para obter dados do usuário
router.get('/usuario/:id', async (req, res) => {
    const userId = req.params.id;
    const connection = await getConnection();

    try {
        console.log(`Rota /usuario/:id acessada com userId: ${userId}`);
        const result = await connection.execute(
            `SELECT ID, NOME, EMAIL, FOTO FROM Usuarios WHERE ID = :1`,
            [userId],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (result.rows.length > 0) {
            const userData = {
                id: result.rows[0].ID,
                nome: result.rows[0].NOME,
                email: result.rows[0].EMAIL,
                //foto: result.rows[0].FOTO  // Remova esta linha temporariamente
            };

            // Converta o buffer da imagem para base64
            if (result.rows[0].FOTO) {
                const fotoBuffer = result.rows[0].FOTO;
                const fotoBase64 = fotoBuffer.toString('base64');
                userData.foto = `/imagens/perfil/user_${userId}.png`;  // Ajuste o tipo MIME se necessário
            }
            console.log('Dados do usuário que serão enviados:', userData);
            return res.json(userData);  // Adicionado 'return'
        } else {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });  // Adicionado 'return'
        }
    } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        return res.status(500).json({ success: false, message: 'Erro no servidor.' });  // Adicionado 'return'
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (closeError) {
                console.error("Erro ao fechar a conexão:", closeError);
            }
        }
    }
});

// Rota para atualizar perfil
router.put('/atualizar-perfil/:id', upload.single('foto'), async (req, res) => {
    const userId = req.params.id;
    const { nome, senha } = req.body;
    const connection = await getConnection();

    try {
        // Iniciar a construção da query de atualização
        let updateQuery = `UPDATE Usuarios SET nome = :nome`;
        const bindParams = { nome };

        // Se tiver senha, adiciona à query
        if (senha) {
            // Hash da senha
            const saltRounds = 10;
            const hashedSenha = await bcrypt.hash(senha, saltRounds);
            updateQuery += `, senha = :senha`;
            bindParams.senha = hashedSenha;
        }

        // Se tiver foto, adiciona à query
        if (req.file) {
            // Obtém o buffer da imagem do req.file.buffer
            const fotoBuffer = req.file.buffer;  // Usa o buffer da imagem diretamente

            // Converte para PNG usando sharp
            const pngBuffer = await sharp(fotoBuffer).png().toBuffer();

            // Converte e salva a imagem (opcional)
            const caminhoFoto = await salvarImagemConvertida(pngBuffer, userId);
            console.log("Caminho da foto convertida:", caminhoFoto);

            updateQuery += `, foto = :foto`;
            bindParams.foto = pngBuffer; // Envia o buffer PNG para o banco de dados.
        }

        // Finaliza a query com a condição
        updateQuery += ` WHERE id = :id`;
        bindParams.id = userId;

        // Executa a atualização
        const result = await connection.execute(
            updateQuery,
            bindParams,
            { autoCommit: true }
        );

        if (result.rowsAffected > 0) {
            res.json({ success: true, message: 'Perfil atualizado com sucesso!' });
        } else {
            res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
        }
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);

        // Se houve erro e o arquivo foi enviado, tenta remover
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Erro ao remover arquivo:', unlinkError);
            }
        }

        res.status(500).json({ success: false, message: 'Erro no servidor.', error: error.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (closeError) {
                console.error("Erro ao fechar a conexão:", closeError);
            }
        }
    }
});

module.exports = router;