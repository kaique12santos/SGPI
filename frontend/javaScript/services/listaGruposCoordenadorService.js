import { fetchJsonComAuth } from "../utils/fetchHelper.js";

export async function listarGruposPorSemestre(semestre) {
    if (!semestre) throw new Error('Semestre não informado');
  
    // A função fetchJsonComAuth, conforme fetchHelper.js, já retorna JSON.
    // Aqui usamos GET para a rota do backend '/coordenador/grupos/:semestre'
    const data = await fetchJsonComAuth(`/coordenador/grupos/${encodeURIComponent(semestre)}`, null, 'GET');
    return data; // { success: true, grupos: [...] } ou { success: false, message: '...' }
  }