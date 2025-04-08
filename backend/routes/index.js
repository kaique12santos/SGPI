const express = require('express');
const router = express.Router();
const professorRoutes = require('./professor.js');
const authRoutes = require('./auth.js');

// Rotas de professor
router.use('/professor', professorRoutes);

// Rotas de autenticação (login e cadastro)
router.use('/', authRoutes);

// Rota para a página do dashboard
router.get('/TelaPrincipal', (req, res) => {
    const path = require('path');
    const frontendPath = path.join(__dirname, '..', '..', 'frontend');
    res.sendFile(path.join(frontendPath, 'TelaPrincipal.html'));
});

module.exports = router;