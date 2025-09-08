export async function enviarAvaliacao(dados, baseEndpoint) {
    return fetchJsonComAuth(`${baseEndpoint}/avaliacoes`, dados, 'POST');
  }