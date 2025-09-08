
// Lista todas as atividades (retorna JSON)
export async function listarAtividades(usuarioId, baseEndpoint) {
    const res = await fetchComAuth(`${baseEndpoint}/atividades?professor_id=${usuarioId}`);
    return res.json(); // garante JSON
  }
  
  // Cria uma nova atividade (já retorna JSON do fetchJsonComAuth)
  export async function criarAtividade(dados, baseEndpoint) {
    return fetchJsonComAuth(`${baseEndpoint}/atividades`, dados, 'POST');
  }
  
  // Atualiza atividade existente
  export async function atualizarAtividade(id, dados, baseEndpoint) {
    return fetchJsonComAuth(`${baseEndpoint}/atividades/${id}`, dados, 'PUT');
  }
  
  // Exclui atividade
  export async function excluirAtividadeService(id, usuarioId, baseEndpoint) {
    const res = await fetchComAuth(
      `${baseEndpoint}/atividades/${id}?professor_id=${usuarioId}`,
      { method: 'DELETE' }
    );
    return res.json(); // garante JSON
  }