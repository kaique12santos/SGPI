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
        u.ativo AS usuario_ativo
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