
export async function listarAtividadesAluno(alunoId) {
    if (!alunoId) throw new Error('ID do aluno não informado');
  
    const data = await fetchJsonComAuth(`/api/atividades?aluno_id=${alunoId}`, null, 'GET');
    return data; // { success: true, atividades: [...] }
  }