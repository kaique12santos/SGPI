export async function listarNotificacoes(usuarioId) {
    return await fetchJsonComAuth(`/notificacoes?usuario_id=${usuarioId}`, null, 'GET');
}
  
export async function marcarTodasNotificacoesLidas(usuarioId) {
    return await fetchJsonComAuth(`/notificacoes/todas/lidas`, { usuario_id: usuarioId }, 'PUT');
}
  
export async function marcarNotificacaoLida(usuarioId, notificacaoId) {
    return await fetchJsonComAuth(`/notificacoes/${notificacaoId}/lida`, { usuario_id: usuarioId }, 'PUT');
}