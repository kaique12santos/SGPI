const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || '1489288834f6440d0b3b0e353ae2602df94ea8eb2cbbad5090bcb6acdc8e2e3a'; // Troque em produção!
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h'

function gerarToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verificarToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { gerarToken, verificarToken };