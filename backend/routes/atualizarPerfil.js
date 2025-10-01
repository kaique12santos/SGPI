// const express = require('express');
// const router = express.Router();
// const { getConnection } = require('../conexaoMysql.js'); // ← MySQL já
// const bcrypt = require('bcrypt');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs').promises;
// const sharp = require('sharp');
// const storage = multer.memoryStorage(); 
// const autenticarJWT = require('../middlewares/auth.js');

// const fileFilter = (req, file, cb) => {
//   const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];

//   if (allowedTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
//   }
// };

// const upload = multer({
//   storage: storage,
//   limits: { fileSize: 5 * 1024 * 1024 },
//   fileFilter: fileFilter
// });

// router.get('/usuario/:id', async (req, res) => {
//   const userId = Number(req.params.id);
//   if (!Number.isFinite(userId) || userId <= 0) {
//     return res.status(400).json({ success: false, message: 'ID de usuário inválido.' });
//   }

//   const connection = await getConnection();
//   try {
//     const [result] = await connection.execute(
//       `SELECT id, nome, email, foto 
//        FROM Usuarios 
//        WHERE id = ?`,
//       [userId]
//     );

//     if (result.length > 0) {
//       const userData = {
//         id: result[0].id,
//         nome: result[0].nome,
//         email: result[0].email,
//         foto: `/perfil/usuario/${userId}/foto`
//       };

//       res.json(userData);
//     } else {
//       return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
//     }
//   } catch (error) {
//     console.error('Erro ao buscar dados do usuário:', error);
//     return res.status(500).json({ success: false, message: 'Erro no servidor.' });
//   } finally {
//     if (connection) await connection.close();
//   }
// });

// router.get('/usuario/:id/foto', async (req, res) => {
//   const userId = Number(req.params.id);
//   if (!Number.isFinite(userId) || userId <= 0) {
//     return res.status(400).send('ID inválido.');
//   }
//   const connection = await getConnection();
//   try {
//     const [result] = await connection.execute(
//       `SELECT foto FROM Usuarios WHERE id = ?`,
//       [userId]
//     );

//     if (result.length === 0 || !result[0].foto) {
//       return res.status(404).send('Foto não encontrada.');
//     }

//     res.setHeader('Content-Type', 'image/png');
//     res.setHeader('Cache-Control', 'private, max-age=3600');
//     return res.send(result[0].foto);
//   } catch (e) {
//     console.error('Erro ao buscar foto:', e);
//     return res.status(500).send('Erro no servidor.');
//   } finally {
//     if (connection) await connection.close();
//   }
// });

// router.put('/atualizar-perfil/:id', autenticarJWT, upload.single('foto'), async (req, res) => {
//   const idNumPut = Number(req.params.id);
//   if (!Number.isFinite(idNumPut) || idNumPut <= 0) {
//     return res.status(400).json({ success: false, message: 'ID de usuário inválido.' });
//   }

//   const { nome, senha } = req.body;
//   const connection = await getConnection();

//   try {
//     let updateQuery = 'UPDATE Usuarios SET';
//     const setParts = [];
//     const params = [];

//     if (nome && nome.trim() !== '') {
//       setParts.push(' nome = ?');
//       params.push(nome);
//     }

//     if (senha) {
//       const saltRounds = 10;
//       const hashedSenha = await bcrypt.hash(senha, saltRounds);
//       setParts.push(' senha = ?');
//       params.push(hashedSenha);
//     }

//     if (req.file) {
//       const fotoBuffer = req.file.buffer;
//       const pngBuffer = await sharp(fotoBuffer).png().toBuffer();
//       setParts.push(' foto = ?');
//       params.push(pngBuffer);
//     }

//     if (setParts.length === 0) {
//       return res.status(400).json({ success: false, message: 'Nenhum dado para atualizar.' });
//     }

//     updateQuery += setParts.join(', ');
//     updateQuery += ' WHERE id = ?';
//     params.push(idNumPut);

//     const [result] = await connection.execute(updateQuery, params);

//     if (result.affectedRows > 0) {
//       res.json({ success: true, message: 'Perfil atualizado com sucesso!' });
//     } else {
//       res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
//     }
//   } catch (error) {
//     console.error('Erro ao atualizar perfil:', error);
//     res.status(500).json({ success: false, message: 'Erro no servidor.', error: error.message });
//   } finally {
//     if (connection) await connection.close();
//   }
// });

// module.exports = router;
const multer = require("multer");
const upload = multer();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { getConnection } = require('../conexaoMysql.js');

/**
 * GET /perfil/:id
 * Busca dados do perfil do usuário
 */
router.get('/:id', async (req, res) => {
  const usuarioId = Number(req.params.id);

  if (!usuarioId)
    return res.status(400).json({ success: false, message: 'ID inválido.' });

  let connection;
  try {
    connection = await getConnection();

    const sqlPerfil = `
      SELECT 
        u.id AS usuario_id,
        u.nome AS usuario_nome,
        u.tipo AS usuario_tipo,
        u.ultimo_acesso AS usuario_ultimo_acesso,
        u.data_criacao AS usuario_data_criacao,
        u.ativo AS usuario_ativo,
        a.RA AS aluno_ra
      FROM Usuarios u
      LEFT JOIN Alunos a ON u.id = a.usuario_id
      WHERE u.id = ?
    `;

    const result = await connection.execute(sqlPerfil, [usuarioId]);
    const rows = result.rows;

    if (!rows || rows.length === 0)
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });

    const usuario = rows[0];
    delete usuario.senha; // segurança

    return res.json({ success: true, usuario });

  } catch (err) {
    console.error('Erro ao buscar perfil do usuário:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) await connection.release();
  }
});

/**
 * PUT /perfil/:id
 * Atualiza nome, senha (se enviada) e foto
 */
router.put('/:id', upload.single("foto"), async (req, res) => {
  const usuarioId = Number(req.params.id);
  const { nome, senha } = req.body;

  if (!usuarioId) {
    return res.status(400).json({ success: false, message: 'ID inválido.' });
  }

  if (!nome?.trim()) {
    return res.status(400).json({ success: false, message: 'Nome é obrigatório.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // Buscar usuário
    const sqlUsuario = `SELECT id FROM Usuarios WHERE id = ?`;
    const resultUser = await connection.execute(sqlUsuario, [usuarioId]);
    const usuarioRows = resultUser.rows;

    if (usuarioRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    let senhaHash = null;
    if (senha?.trim()) {
      if (senha.length < 6) {
        return res.status(400).json({ success: false, message: 'Senha deve ter pelo menos 6 caracteres.' });
      }
      if (senha.length > 12) {
        return res.status(400).json({ success: false, message: 'Senha deve ter no máximo 12 caracteres.' });
      }
      senhaHash = await bcrypt.hash(senha, 10);
    }

    // Atualizar nome e, se enviada, senha
    if (senhaHash) {
      await connection.execute(
        `UPDATE Usuarios SET nome = ?, senha = ? WHERE id = ?`,
        [nome.trim(), senhaHash, usuarioId]
      );
    } else {
      await connection.execute(
        `UPDATE Usuarios SET nome = ? WHERE id = ?`,
        [nome.trim(), usuarioId]
      );
    }

    // Se vier foto, atualiza
    if (req.file) {
      const fotoBuffer = req.file.buffer;
      await connection.execute(
        `UPDATE Usuarios SET foto = ? WHERE id = ?`,
        [fotoBuffer, usuarioId]
      );
    }

    return res.json({
      success: true,
      message: 'Perfil atualizado com sucesso.',
      usuario: {
        id: usuarioId,
        nome: nome.trim()
      }
    });

  } catch (err) {
    console.error('Erro ao atualizar perfil:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) await connection.release();
  }
});

/**
 * GET /perfil/:id/foto
 * Retorna a foto do usuário
 */
router.get('/:id/foto', async (req, res) => {
  const usuarioId = Number(req.params.id);

  if (!usuarioId)
    return res.status(400).json({ success: false, message: 'ID inválido.' });

  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(`SELECT foto FROM Usuarios WHERE id = ?`, [usuarioId]);
    const rows = result.rows;

    if (!rows || rows.length === 0 || !rows[0].foto)
      return res.status(404).json({ success: false, message: 'Foto não encontrada.' });

    const foto = rows[0].foto;

    let contentType = 'image/jpeg';
    if (foto[0] === 0x89 && foto[1] === 0x50) contentType = 'image/png';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', foto.length);
    res.send(foto);

  } catch (err) {
    console.error('Erro ao buscar foto do perfil:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) await connection.release();
  }
});

/**
 * DELETE /perfil/:id/foto
 * Remove a foto do usuário
 */
router.delete('/:id/foto', async (req, res) => {
  const usuarioId = Number(req.params.id);

  if (!usuarioId)
    return res.status(400).json({ success: false, message: 'ID inválido.' });

  let connection;
  try {
    connection = await getConnection();
    await connection.execute(`UPDATE Usuarios SET foto = NULL WHERE id = ?`, [usuarioId]);
    return res.json({ success: true, message: 'Foto removida com sucesso.' });

  } catch (err) {
    console.error('Erro ao remover foto do perfil:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) await connection.release();
  }
});

module.exports = router;