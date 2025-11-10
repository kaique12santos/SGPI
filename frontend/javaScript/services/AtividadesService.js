import { fetchComAuth, fetchJsonComAuth } from "../utils/fetchHelper.js";

// NOVA FUNÇÃO: Buscar as ofertas para preencher o dropdown
export async function listarOfertas(usuarioId, baseEndpoint) {
  const res = await fetchComAuth(`${baseEndpoint}/ofertas?professor_id=${usuarioId}`);
  return res.json(); // garante JSON
}

export async function listarAtividades(usuarioId, baseEndpoint) {
  const res = await fetchComAuth(`${baseEndpoint}/atividades?professor_id=${usuarioId}`);
  return res.json(); // garante JSON
}

// Cria uma nova atividade
export async function criarAtividade(dados, baseEndpoint) {
  // O 'dados' agora deve conter 'nota_maxima' e 'oferta_id' vindos do Atividades.js
  return fetchJsonComAuth(`${baseEndpoint}/atividades`, dados, 'POST');
}

// Atualiza atividade existente
export async function atualizarAtividade(id, dados, baseEndpoint) {
  // O 'dados' agora deve conter 'nota_maxima' e 'oferta_id'
  return fetchJsonComAuth(`${baseEndpoint}/atividades/${id}`, dados, 'PUT');
}

// Exclui atividade
export async function excluirAtividadeService(id, usuarioId, baseEndpoint) {
  const res = await fetchComAuth(
    `${baseEndpoint}/atividades/${id}?professor_id=${usuarioId}`,
    { method: 'DELETE' }
  );
  return res.json(); // garante JSON
}