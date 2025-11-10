import { fetchJsonComAuth } from "../utils/fetchHelper.js";

// A função não precisa mais do alunoId, pois o backend pega do token
export async function listarAtividadesAluno() {
    // CORREÇÃO: A rota agora é /aluno/atividades (baseado na mudança do server.js)
    const data = await fetchJsonComAuth(`/aluno/atividades`, null, 'GET');
    return data; // { success: true, atividades: [...] }
}