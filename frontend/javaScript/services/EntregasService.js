

// Buscar detalhes da atividade pelo aluno
export async function obterDetalhesAtividade(atividadeId, alunoId) {
  const url = `/api/atividade/${atividadeId}?aluno_id=${alunoId}`;
  return fetchJsonComAuth(url, null, 'GET');
}

// Enviar entrega do aluno
export async function enviarEntregaService(formData) {
  return fetchFormDataComAuthVersaoFormatada('/api/entregas', formData, 'POST');
}