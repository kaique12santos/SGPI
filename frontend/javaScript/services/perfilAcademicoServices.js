import { fetchJsonComAuth } from "../utils/fetchHelper.js";

export async function getMinhasDisciplinas() {
  const id = localStorage.getItem("usuarioId");
  return await fetchJsonComAuth(`/perfilAcademico/disciplinas/${id}`, null, "GET");
}
export async function getDisciplinasDisponiveisProfessor() {
  const id =localStorage.getItem("usuarioId")
  return await fetchJsonComAuth(`/perfilAcademico/disciplinas-disponiveis-professor/${id}`, null, "GET");
}


export async function getMeusGrupos() {
  const id = localStorage.getItem("usuarioId");
  return await fetchJsonComAuth(`/perfilAcademico/grupos/${id}`, null, "GET");
}

export async function getMeusProjetos(semestreId = null) {
  const id = localStorage.getItem("usuarioId");
  let url = `/perfilAcademico/projetos/${id}`;
  if (semestreId) url += `?semestre=${semestreId}`;
  return await fetchJsonComAuth(url, null, "GET");
}