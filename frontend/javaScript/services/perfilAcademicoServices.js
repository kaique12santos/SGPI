import {  fetchComAuth} from "../utils/fetchHelper.js";

export async function getMinhasDisciplinas() {
  const id = localStorage.getItem("usuarioId");
  return await fetchComAuth(`/perfilAcademico/disciplinas/${id}`, { method: "GET" });
}

export async function getMeusGrupos() {
  const id = localStorage.getItem("usuarioId");
  return await fetchComAuth(`/perfilAcademico/grupos/${id}`, { method: "GET" });
}

export async function getMeusProjetos(semestreId = null) {
  const id = localStorage.getItem("usuarioId");
  let url = `/perfilAcademico/projetos/${id}`;
  if (semestreId) url += `?semestre=${semestreId}`;
  return await fetchComAuth(url, { method: "GET" });
}
