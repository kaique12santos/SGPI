// Serviço responsável por chamadas ao backend relacionadas à listagem de grupos (Coordenador)
// Depende das funções globais definidas em fetchHelper.js (fetchJsonComAuth)

export async function listarGruposPorSemestre(semestre) {
    if (!semestre) throw new Error('Semestre não informado');
  
    // A função fetchJsonComAuth, conforme fetchHelper.js, já retorna JSON.
    // Aqui usamos GET para a rota do backend '/coordenador/grupos/:semestre'
    const data = await fetchJsonComAuth(`/coordenador/grupos/${encodeURIComponent(semestre)}`, null, 'GET');
    return data; // { success: true, grupos: [...] } ou { success: false, message: '...' }
  }