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

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { getConnection } = require('../conexaoMysql.js');

/**
 * GET /perfil
 * Busca dados do perfil do usuário logado
 */
router.get('/perfil', async (req, res) => {
  const usuarioId = req.user?.id;

  if (!usuarioId) {
    return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const sqlPerfil = `
      SELECT 
        u.id AS usuario_id,
        u.nome AS usuario_nome,
        u.email AS usuario_email,
        u.tipo AS usuario_tipo,
        u.ultimo_acesso AS usuario_ultimo_acesso,
        u.data_criacao AS usuario_data_criacao,
        u.ativo AS usuario_ativo,
        a.RA AS aluno_ra
      FROM Usuarios u
      LEFT JOIN Alunos a ON u.id = a.usuario_id
      WHERE u.id = ?
    `;
    //select funcional

    const [rows] = await connection.execute(sqlPerfil, [usuarioId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const usuario = rows[0];
    // Remove dados sensíveis
    delete usuario.senha;

    return res.json({ success: true, usuario });

  } catch (err) {
    console.error('Erro ao buscar perfil do usuário:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) await connection.release();
  }
});

/**
 * PUT /perfil
 * Atualiza dados do perfil do usuário logado
 */
router.put('/perfil', async (req, res) => {
  const usuarioId = req.user?.id;
  const { nome, email, senhaAtual, novaSenha } = req.body;

  if (!usuarioId) {
    return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
  }

  if (!nome?.trim() || !email?.trim()) {
    return res.status(400).json({ success: false, message: 'Nome e email são obrigatórios.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // Verificar se o usuário existe e buscar senha atual
    const sqlUsuario = `
      SELECT id, nome, email, senha FROM Usuarios WHERE id = ?
    `;

    const [usuarioRows] = await connection.execute(sqlUsuario, [usuarioId]);
    
    if (usuarioRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const usuarioAtual = usuarioRows[0];

    // Verificar se o email já está em uso por outro usuário
    if (email.trim() !== usuarioAtual.email) {
      const sqlVerificarEmail = `
        SELECT id FROM Usuarios WHERE email = ? AND id != ?
      `;

      const [emailRows] = await connection.execute(sqlVerificarEmail, [email.trim(), usuarioId]);
      
      if (emailRows.length > 0) {
        return res.status(400).json({ success: false, message: 'Este email já está em uso por outro usuário.' });
      }
    }

    let novaSenhaHash = null;

    // Se foi fornecida uma nova senha, validar a senha atual
    if (novaSenha?.trim()) {
      if (!senhaAtual?.trim()) {
        return res.status(400).json({ success: false, message: 'Senha atual é obrigatória para alterar a senha.' });
      }

      const senhaValida = await bcrypt.compare(senhaAtual, usuarioAtual.senha);
      if (!senhaValida) {
        return res.status(400).json({ success: false, message: 'Senha atual incorreta.' });
      }

      if (novaSenha.length < 6) {
        return res.status(400).json({ success: false, message: 'Nova senha deve ter pelo menos 6 caracteres.' });
      }

      novaSenhaHash = await bcrypt.hash(novaSenha, 10);
    }

    // Atualizar dados do usuário
    let sqlUpdate, params;

    if (novaSenhaHash) {
      sqlUpdate = `
        UPDATE Usuarios 
        SET nome = ?, email = ?, senha = ?
        WHERE id = ?
      `;
      params = [nome.trim(), email.trim(), novaSenhaHash, usuarioId];
    } else {
      sqlUpdate = `
        UPDATE Usuarios 
        SET nome = ?, email = ?
        WHERE id = ?
      `;
      params = [nome.trim(), email.trim(), usuarioId];
    }

    await connection.execute(sqlUpdate, params);

    return res.json({ 
      success: true, 
      message: 'Perfil atualizado com sucesso.',
      usuario: {
        id: usuarioId,
        nome: nome.trim(),
        email: email.trim()
      }
    });

  } catch (err) {
    console.error('Erro ao atualizar perfil:', err);
    
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Este email já está em uso.' });
    }
    
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) await connection.release();
  }
});

/**
 * POST /perfil/foto
 * Atualiza foto do perfil do usuário
 */
router.post('/perfil/foto', async (req, res) => {
  const usuarioId = req.user?.id;
  const { foto } = req.body; // Base64 ou buffer

  if (!usuarioId) {
    return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
  }

  if (!foto) {
    return res.status(400).json({ success: false, message: 'Foto é obrigatória.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // Converter base64 para buffer se necessário
    let fotoBuffer;
    if (typeof foto === 'string' && foto.startsWith('data:image/')) {
      const base64Data = foto.split(',')[1];
      fotoBuffer = Buffer.from(base64Data, 'base64');
    } else {
      fotoBuffer = foto;
    }

    const sqlUpdateFoto = `
      UPDATE Usuarios 
      SET foto = ?
      WHERE id = ?
    `;

    await connection.execute(sqlUpdateFoto, [fotoBuffer, usuarioId]);

    return res.json({ success: true, message: 'Foto atualizada com sucesso.' });

  } catch (err) {
    console.error('Erro ao atualizar foto do perfil:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) await connection.release();
  }
});

/**
 * GET /perfil/foto
 * Busca foto do perfil do usuário
 */
router.get('/perfil/foto', async (req, res) => {
  const usuarioId = req.user?.id;

  if (!usuarioId) {
    return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const sqlFoto = `
      SELECT foto FROM Usuarios WHERE id = ?
    `;

    const [rows] = await connection.execute(sqlFoto, [usuarioId]);
    
    if (rows.length === 0 || !rows[0].foto) {
      return res.status(404).json({ success: false, message: 'Foto não encontrada.' });
    }

    const foto = rows[0].foto;
    
    // Definir tipo de conteúdo baseado nos primeiros bytes
    let contentType = 'image/jpeg'; // padrão
    if (foto[0] === 0x89 && foto[1] === 0x50) {
      contentType = 'image/png';
    } else if (foto[0] === 0xFF && foto[1] === 0xD8) {
      contentType = 'image/jpeg';
    }

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
 * DELETE /perfil/foto
 * Remove foto do perfil do usuário
 */
router.delete('/perfil/foto', async (req, res) => {
  const usuarioId = req.user?.id;

  if (!usuarioId) {
    return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const sqlRemoverFoto = `
      UPDATE Usuarios 
      SET foto = NULL
      WHERE id = ?
    `;

    await connection.execute(sqlRemoverFoto, [usuarioId]);

    return res.json({ success: true, message: 'Foto removida com sucesso.' });

  } catch (err) {
    console.error('Erro ao remover foto do perfil:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) await connection.release();
  }
});

module.exports = router;