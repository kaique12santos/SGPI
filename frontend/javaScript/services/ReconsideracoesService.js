import { fetchJsonComAuth } from "../utils/fetchHelper.js";

export async function obterReconsideracoes(baseEndpoint) {
    // Rota migrada
    return await fetchJsonComAuth(
      `${baseEndpoint}/reconsideracoes`,
      null,
      "GET"
    );
  }
  
  export async function aprovarReconsideracao(id, resposta, novaNota, baseEndpoint) {
    const payload = { resposta };
    if (novaNota !== null && novaNota !== undefined) {
      payload.novaNota = novaNota;
    }
    // Rota migrada
    return await fetchJsonComAuth(
      `${baseEndpoint}/reconsideracoes/${id}/aprovar`,
      payload,
      "POST"
    );
  }
  
  export async function recusarReconsideracao(id, resposta, baseEndpoint) {
    // Rota migrada
    return await fetchJsonComAuth(
      `${baseEndpoint}/reconsideracoes/${id}/recusar`,
      { resposta },
      "POST"
    );
  }