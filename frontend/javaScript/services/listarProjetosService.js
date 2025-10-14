import { fetchJsonComAuth } from "../utils/fetchHelper.js";

export async function listarProjetosPorSemestre(semestre) {
    if (!semestre) throw new Error('Semestre não informado');
  
    const data = await fetchJsonComAuth(
      `/coordenador/projetos/${encodeURIComponent(semestre)}`,
      null,
      'GET'
    );
  
    return data; // { success: true, projetos: [...] }
}