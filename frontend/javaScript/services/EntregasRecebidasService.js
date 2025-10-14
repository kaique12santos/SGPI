import { fetchJsonComAuth } from "../utils/fetchHelper.js";

// Buscar entregas recebidas pelo professor
export async function obterEntregasRecebidas(professorId) {
  const url = `/api/entregas/recebidas?professor_id=${professorId}`;
  return fetchJsonComAuth(url, null, "GET");
}