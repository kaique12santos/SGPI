
// // Arquivo de serviços para comunicação com a API de Semestres

// import { fetchComAuth } from '../utils/fetchHelper.js';

// /**
//  * Lista todos os semestres cadastrados
//  * @returns {Promise<Response>}
//  */
// export const listarSemestres = () => fetchComAuth('/semestres/listar');

// /**
//  * Cria o próximo semestre automaticamente
//  * @returns {Promise<Response>}
//  */
// export const criarProximoSemestreAuto = () => 
//   fetchComAuth('/semestres/criar-proximo', {
//     method: 'POST'
//   });

// /**
//  * Cria semestre manualmente com período e ano específicos
//  * @param {string} periodo - '1' ou '2'
//  * @param {number} ano - Ano do semestre (ex: 2025)
//  * @returns {Promise<Response>}
//  */
// export const criarSemestreManual = (periodo, ano) =>
//   fetchComAuth('/semestres/criar-proximo', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({ periodo, ano })
//   });

// /**
//  * Busca estatísticas do semestre atual
//  * @param {number} semestreId - ID do semestre
//  * @returns {Promise<Response>}
//  */
// export const getEstatisticasSemestre = (semestreId) =>
//   fetchComAuth(`/semestres/estatisticas/${semestreId}`);

// Arquivo de serviços para comunicação com a API de Semestres

import { fetchComAuth } from '../utils/fetchHelper.js';

/* ===============================
   📌 ROTAS NOVAS (REST padrão)
   Use estas preferencialmente
=============================== */

/**
 * Lista todos os semestres com estatísticas (GET /semestres)
 */
export const listarTodosSemestres = () => fetchComAuth('/semestres');

/**
 * Retorna o semestre ativo atual (GET /semestres/ativo)
 */
export const getSemestreAtivo = () => fetchComAuth('/semestres/ativo');

/**
 * Cria semestre manualmente (POST /semestres)
 * @param {string} periodo - '1' ou '2'
 * @param {number} ano - Ano do semestre (ex: 2025)
 */
export const criarSemestre = (periodo, ano) =>
  fetchComAuth('/semestres', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ periodo, ano })
  });

/**
 * Ativa um semestre e opcionalmente gera ofertas (POST /semestres/:id/ativar)
 * @param {number} semestreId
 * @param {Object} opts
 * @param {boolean} [opts.gerarOfertas=false]
 * @param {boolean} [opts.copiarProfessores=false]
 */
export const ativarSemestre = (semestreId, opts = {}) =>
  fetchComAuth(`/semestres/${semestreId}/ativar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gerarOfertas: opts.gerarOfertas ?? false,
      copiarProfessores: opts.copiarProfessores ?? false
    })
  });

/**
 * Gera ofertas para um semestre sem ativá-lo (POST /semestres/:id/gerar-ofertas)
 * @param {number} semestreId
 * @param {Object} opts
 * @param {boolean} [opts.copiarProfessores=true]
 */
export const gerarOfertasSemestre = (semestreId, opts = {}) =>
  fetchComAuth(`/semestres/${semestreId}/gerar-ofertas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      copiarProfessores: opts.copiarProfessores ?? true
    })
  });

/**
 * Exclui um semestre (DELETE /semestres/:id)
 * Apenas se não tiver vínculos
 */
export const deletarSemestre = (semestreId) =>
  fetchComAuth(`/semestres/${semestreId}`, {
    method: 'DELETE'
  });

/**
 * Busca estatísticas de um semestre (GET /semestres/estatisticas/:id)
 */
export const getEstatisticasSemestre = (semestreId) =>
  fetchComAuth(`/semestres/estatisticas/${semestreId}`);

/* ===============================
   📦 ROTAS LEGADAS (compatibilidade)
   Mantidas para não quebrar código antigo
=============================== */

/**
 * @deprecated Use listarTodosSemestres()
 */
export const listarSemestres = () => fetchComAuth('/semestres/listar');

/**
 * @deprecated Use criarSemestre() sem params para auto
 */
export const criarProximoSemestreAuto = () =>
  fetchComAuth('/semestres/criar-proximo', {
    method: 'POST'
  });

/**
 * @deprecated Use criarSemestre(periodo, ano)
 */
export const criarSemestreManual = (periodo, ano) =>
  fetchComAuth('/semestres/criar-proximo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ periodo, ano })
  });