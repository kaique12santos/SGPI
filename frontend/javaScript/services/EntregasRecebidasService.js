import { fetchJsonComAuth } from "../utils/fetchHelper.js";

// Buscar entregas recebidas pelo professor
export async function obterEntregasRecebidas(professorId, baseEndpoint) {
  // Atualiza a URL para a nova rota
  const url = `${baseEndpoint}/entregas-para-avaliar?professor_id=${professorId}`;
  return fetchJsonComAuth(url, null, "GET");
}