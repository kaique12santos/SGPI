// routes/usuarios.js
const express = require('express');
const router = express.Router();
const { getConnection, oracledb } = require('../connectOracle');

// Listar todos os usuários
router.get('/usuarios', async (req, res) => {
    try {
        const connection = await getConnection();
        const result = await connection.execute(
            `SELECT id, nome, email, tipo, semestre, ativo, 
                    TO_CHAR(ultimo_acesso, 'DD/MM/YYYY HH24:MI') as ultimo_acesso 
             FROM Usuarios ORDER BY id`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        await connection.close();
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

// Atualizar tipo de usuário
router.put('/usuarios/:id/tipo', async (req, res) => {
    const userId = req.params.id;
    const { tipo } = req.body;
    try {
        const connection = await getConnection();
        const result = await connection.execute(
            `UPDATE Usuarios SET tipo = :1 WHERE id = :2`,
            [tipo, userId],
            { autoCommit: true }
        );
        await connection.close();
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar tipo:', error);
        res.status(500).json({ success: false });
    }
});

// Alterar status (ativo/inativo)
router.put('/usuarios/:id/status', async (req, res) => {
    const userId = req.params.id;
    const { ativo } = req.body;
    try {
        const connection = await getConnection();
        const result = await connection.execute(
            `UPDATE Usuarios SET ativo = :1 WHERE id = :2`,
            [ativo, userId],
            { autoCommit: true }
        );
        await connection.close();
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ success: false });
    }
});

module.exports = router;
