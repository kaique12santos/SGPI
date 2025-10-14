import { fetchJsonComAuth } from "../utils/fetchHelper.js";

export async function listarNotas(alunoId) {
    if (!alunoId) throw new Error("ID do aluno não informado");
    return await fetchJsonComAuth(`/api/aluno/notas?aluno_id=${alunoId}`, null, 'GET');
}
  
export async function pedirReconsideracao(avaliacaoId, alunoId, comentario) {
  if (!avaliacaoId || !alunoId || !comentario) {
    throw new Error("Dados obrigatórios não informados");
  }
  
    return await fetchJsonComAuth('/api/aluno/reconsiderar', { 
      avaliacao_id: avaliacaoId, 
      aluno_id: alunoId, 
      comentario 
    }, 'POST');
}