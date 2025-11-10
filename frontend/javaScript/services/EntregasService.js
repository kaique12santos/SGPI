// ASSUMINDO que você tem os helpers 'fetchJsonComAuth' e 'fetchFormDataComAuth'
import { fetchJsonComAuth, fetchFormDataComAuth } from "../utils/fetchHelper.js";

// Buscar detalhes da atividade E entrega existente
export async function obterDetalhesAtividade(atividadeId) {
  // O alunoId não é mais necessário na URL, o backend pega do token
  const url = `/aluno/atividade/${atividadeId}/detalhes`;
  return fetchJsonComAuth(url, null, 'GET');
}

// Enviar entrega (FormData)
export async function enviarEntregaService(formData) {
  // Rota agora é /aluno/entregas
  return fetchFormDataComAuth('/aluno/entregas', formData, 'POST');
}