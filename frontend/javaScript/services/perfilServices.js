export async function obterPerfil(userId) {
    return await fetchComAuth(`/perfil/usuario/${userId}`, "GET");
}
  
export async function atualizarPerfilService(userId, formData) {
    return await fetchFormDataComAuth(`/perfil/atualizar-perfil/${userId}`, formData, "PUT");
}