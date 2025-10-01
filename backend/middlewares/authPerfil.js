const { verificarToken } = require('../helpers/jwt.js'); // usa sem alterar helper

function authPerfil(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
  }

  const token = authHeader.split(' ')[1]; // formato "Bearer xxx"

  try {
    const decoded = verificarToken(token); // usa helper que já existe
    req.user = decoded; // agora suas rotas continuam usando req.user.id
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Token inválido ou expirado.' });
  }
}

module.exports = authPerfil;