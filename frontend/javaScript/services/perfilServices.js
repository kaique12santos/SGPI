export async function obterPerfil() {
    const id = localStorage.getItem('usuarioId');
    return await fetchComAuth(`/perfil/${id}`, { method: "GET" });

}
export async function atualizarPerfilService(formData) {
    const id = localStorage.getItem('usuarioId');
    return await fetchFormDataComAuth(`/perfil/${id}`, formData, "PUT");
}