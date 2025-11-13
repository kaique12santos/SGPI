import { fetchJsonComAuth } from "../utils/fetchHelper.js";

export async function listarNotas() {
    return await fetchJsonComAuth(`/aluno/notas`, null, 'GET');
}
  
export async function pedirReconsideracao(avaliacaoId, comentario) {
    return await fetchJsonComAuth('/aluno/reconsiderar', { 
      avaliacao_id: avaliacaoId, 
      comentario: comentario 
    }, 'POST');
}

// ==== FUNÇÃO ADICIONADA ====
// (Esta função não será usada diretamente, mas é bom tê-la no service)
// O 'notas.js' fará o fetch autenticado manualmente para 'blob'
export async function baixarDevolutiva(avaliacaoId) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Usuário não autenticado');

    const response = await fetch(`/aluno/avaliacoes/download/${avaliacaoId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Falha no download');
    }
    return response.blob();
}