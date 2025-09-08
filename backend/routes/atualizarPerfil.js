const express = require('express');
const router = express.Router();
const { getConnection, oracledb } = require('../connectOracle.js');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const storage = multer.memoryStorage(); 
const autenticarJWT = require('../middlewares/auth.js');

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

    return `/perfil/usuario/${idNum}/foto`; 
};

router.get('/usuario/:id', async (req, res) => {
    const userId = req.params.id;
    const connection = await getConnection();

    const idNum = Number(userId);
    if (!Number.isFinite(idNum) || !Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ success: false, message: 'ID de usuário inválido.' });
    }


    try {
    console.log(`Rota /usuario/:id acessada com userId: ${userId}`);
    const result = await connection.execute(
      `SELECT ID, NOME, EMAIL, FOTO FROM Usuarios WHERE ID = :id`,
      { id: idNum },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length > 0) {
    const userData = {
    id: result.rows[0].ID,
    nome: result.rows[0].NOME,
    email: result.rows[0].EMAIL,
    foto: `/perfil/usuario/${idNum}/foto` 
    };

    if (result.rows[0].FOTO) {
    const fotoBuffer = result.rows[0].FOTO;
    const fotoBase64 = fotoBuffer.toString('base64');
    userData.foto = `/perfil/usuario/${idNum}/foto`;  
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

router.get('/usuario/:id/foto', async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).send('ID inválido.');
  }
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT foto FROM usuarios WHERE id = :id`,
      { id: userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (result.rows.length === 0 || !result.rows[0].FOTO) {
      return res.status(404).send('Foto não encontrada.');
    }
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.send(result.rows[0].FOTO);
  } catch (e) {
    return res.status(500).send('Erro no servidor.');
  } finally {
    try { await connection.close(); } catch {}
  }
});

router.put('/atualizar-perfil/:id',autenticarJWT, upload.single('foto'), async (req, res) => {
  const userId = req.params.id;
  const idNumPut = Number(userId);
  if (!Number.isFinite(idNumPut) || !Number.isInteger(idNumPut) || idNumPut <= 0) {
    return res.status(400).json({ success: false, message: 'ID de usuário inválido.' });
  }

  const { nome, senha } = req.body;
  const connection = await getConnection();

  try {
    let updateQuery = 'UPDATE Usuarios SET';
    const bindParams = {};
    const setParts = [];

    if (nome !== undefined && nome !== null && nome.trim() !== '') {
      setParts.push(' nome = :nome');
      bindParams.nome = nome;
    }

    if (senha) {
      const saltRounds = 10;
      const hashedSenha = await bcrypt.hash(senha, saltRounds);
      setParts.push(' senha = :senha');
      bindParams.senha = hashedSenha;
    }

    if (req.file) {
      const fotoBuffer = req.file.buffer;
      const pngBuffer = await sharp(fotoBuffer).png().toBuffer();
      setParts.push(' foto = :foto');
      bindParams.foto = pngBuffer;
    }

    if (setParts.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhum dado para atualizar.' });
    }

    updateQuery += setParts.join(',');
    updateQuery += ' WHERE id = :id';
    bindParams.id = idNumPut;

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
    // Não precisa mais tentar remover arquivo do disco!
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