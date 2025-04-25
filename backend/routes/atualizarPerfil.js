const express = require('express');
const router = express.Router();
const { getConnection, oracledb } = require('../connectOracle.js');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const storage = multer.memoryStorage(); 

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
        fileSize: 5 * 1024 * 1024 
    },
    fileFilter: fileFilter
});

const salvarImagemConvertida = async (buffer, userId) => {
    const uploadDir = path.join(__dirname, '..', '..', 'frontend', 'imagens', 'perfil');
    await fs.mkdir(uploadDir, { recursive: true }); 

    const caminhoFinal = path.join(uploadDir, `user_${userId}.png`); 

    await sharp(buffer)
        .png({ quality: 90 }) 
        .toFile(caminhoFinal);

    return `/imagens/perfil/user_${userId}.png`; 
};

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
                //foto: result.rows[0].FOTO 
            };

            if (result.rows[0].FOTO) {
                const fotoBuffer = result.rows[0].FOTO;
                const fotoBase64 = fotoBuffer.toString('base64');
                userData.foto = `/imagens/perfil/user_${userId}.png`;  
            }
            console.log('Dados do usuário que serão enviados:', userData);
            return res.json(userData);  
        } else {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });  
        }
    } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        return res.status(500).json({ success: false, message: 'Erro no servidor.' }); 
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

router.put('/atualizar-perfil/:id', upload.single('foto'), async (req, res) => {
    const userId = req.params.id;
    const { nome, senha } = req.body;
    const connection = await getConnection();

    try {
        let updateQuery = `UPDATE Usuarios SET nome = :nome`;
        const bindParams = { nome };

        if (senha) {
            const saltRounds = 10;
            const hashedSenha = await bcrypt.hash(senha, saltRounds);
            updateQuery += `, senha = :senha`;
            bindParams.senha = hashedSenha;
        }

        if (req.file) {
            const fotoBuffer = req.file.buffer; 

            const pngBuffer = await sharp(fotoBuffer).png().toBuffer();

            const caminhoFoto = await salvarImagemConvertida(pngBuffer, userId);
            console.log("Caminho da foto convertida:", caminhoFoto);

            updateQuery += `, foto = :foto`;
            bindParams.foto = pngBuffer; 
        }

        updateQuery += ` WHERE id = :id`;
        bindParams.id = userId;

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