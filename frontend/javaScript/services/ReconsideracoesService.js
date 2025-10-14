import { fetchJsonComAuth } from "../utils/fetchHelper.js";

export async function obterReconsideracoes(professorId) {
    return await fetchJsonComAuth(
      `/api/professor/reconsideracoes?professor_id=${professorId}`,
      null,
      "GET"
    );
  }
  
  export async function aprovarReconsideracao(id, resposta, novaNota = null) {
    const payload = { resposta };
    if (novaNota !== null && novaNota !== undefined) {
      payload.novaNota = novaNota;
    }
    return await fetchJsonComAuth(
      `/api/professor/reconsideracoes/${id}/aprovar`,
      payload,
      "POST"
    );
  }
  
  export async function recusarReconsideracao(id, resposta) {
    return await fetchJsonComAuth(
      `/api/professor/reconsideracoes/${id}/recusar`,
      { resposta },
      "POST"
    );
  }