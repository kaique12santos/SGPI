import { fetchJsonComAuth } from "../utils/fetchHelper.js";

export async function obterGruposPorSemestre(semestre = '') {
    // Retorna o JSON cru do backend (ex: { success, grupos })
   return await fetchJsonComAuth(`/api/grupos?semestre=${semestre}`, null, "GET");
}
  
export async function obterProjetosPorOrientador(orientadorId) {
  if (!orientadorId) return { projetos: [] };
  return await fetchJsonComAuth(`/api/projetos?orientador_id=${orientadorId}`, null, "GET");
}
  
export async function criarProjetoAPI(dados) {
    // dados: { titulo, descricao, grupo_id, orientador_id, semestre }
   return await fetchJsonComAuth('/api/projetos', dados, 'POST');
}
  
export async function atualizarProjeto(id, dados) {
    return await fetchJsonComAuth(`/api/projetos/${id}`, dados, 'PUT');
}
  
export async function excluirProjeto(id) {
    return await fetchJsonComAuth(`/api/projetos/${id}`, null, 'DELETE');
}