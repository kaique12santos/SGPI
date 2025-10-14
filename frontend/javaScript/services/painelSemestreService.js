// semestreServices.js
// Arquivo de serviços para comunicação com a API de Semestres

import { fetchComAuth } from '../utils/fetchHelper.js';

/**
 * Lista todos os semestres cadastrados
 * @returns {Promise<Response>}
 */
export const listarSemestres = () => fetchComAuth('/semestres/listar');

/**
 * Cria o próximo semestre automaticamente
 * @returns {Promise<Response>}
 */
export const criarProximoSemestreAuto = () => 
  fetchComAuth('/semestres/criar-proximo', {
    method: 'POST'
  });

/**
 * Cria semestre manualmente com período e ano específicos
 * @param {string} periodo - '1' ou '2'
 * @param {number} ano - Ano do semestre (ex: 2025)
 * @returns {Promise<Response>}
 */
export const criarSemestreManual = (periodo, ano) =>
  fetchComAuth('/semestres/criar-proximo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ periodo, ano })
  });

/**
 * Busca estatísticas do semestre atual
 * @param {number} semestreId - ID do semestre
 * @returns {Promise<Response>}
 */
export const getEstatisticasSemestre = (semestreId) =>
  fetchComAuth(`/semestres/estatisticas/${semestreId}`);