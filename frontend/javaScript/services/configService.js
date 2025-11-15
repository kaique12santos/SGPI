import { fetchJsonComAuth } from "../utils/fetchHelper.js";

/**
 * Busca o status atual das matrículas (controlado pelo Coordenador).
 * O backend deve retornar algo como:
 * { success: true, settings: { alunoMatricula: true, professorMatricula: true } }
 */
export async function getConfigMatriculas() {
  // Esta rota GET precisa ser criada no seu backend
  return await fetchJsonComAuth(`/config/matriculas`, null, "GET");
}

/**
 * Atualiza o status das matrículas (só para Coordenador).
 * O backend deve receber algo como:
 * { alunoMatricula: true, professorMatricula: true }
 */
export async function updateConfigMatriculas(settings) {
  // Esta rota PUT/POST precisa ser criada no seu backend
  return await fetchJsonComAuth(`/config/matriculas`, settings, "POST"); // ou 'PUT'
}