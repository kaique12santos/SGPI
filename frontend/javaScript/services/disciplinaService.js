import { fetchJsonComAuth } from "../utils/fetchHelper.js";

// Buscar disciplinas disponíveis conforme o tipo de usuário
export async function getDisciplinasDisponiveis(tipoUsuario) {
  return fetchJsonComAuth(`/disciplinas-disponiveis/${tipoUsuario}`, null, "GET");
}

// Vincular professor às disciplinas selecionadas
export async function vincularDisciplinasProfessor(professor_id, disciplinas) {
  return fetchJsonComAuth("/vincular-disciplinas", { professor_id, disciplinas }, "POST");
}
