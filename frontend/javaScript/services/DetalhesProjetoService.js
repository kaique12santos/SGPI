
export async function obterAtividadesDoProjeto(projetoId) {
    const url = `/coordenador/projetos/${encodeURIComponent(projetoId)}/atividades`;
    return fetchJsonComAuth(url, null, "GET");
}