const { verificarToken } = require('../helpers/jwt.js');

function autenticarJWT(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Token não fornecido.' });
  }

  const token = authHeader.split(' ')[1]; // Espera formato: Bearer <token>
  if (!token) {
    return res.status(401).json({ success: false, message: 'Token mal formatado.' });
  }

  try {
    const decoded = verificarToken(token);
    req.usuario = decoded; // payload do token disponível nas rotas
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token inválido ou expirado.' });
  }
}

module.exports = autenticarJWT;