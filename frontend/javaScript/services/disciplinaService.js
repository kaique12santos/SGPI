import { fetchJsonComAuth } from "../utils/fetchHelper.js";

// Buscar disciplinas disponíveis conforme o tipo de usuário
// export async function getDisciplinasDisponiveis(tipoUsuario) {
//   return fetchJsonComAuth(`/disciplinas-disponiveis/${tipoUsuario}`, null, "GET");
// }
export async function getDisciplinasDisponiveis(tipoUsuario) {
  const id = localStorage.getItem("usuarioId");
  const userRole = localStorage.getItem("userRole")?.toLowerCase() || "professor";
  
  // ✅ Passa o tipoUsuario como query param
  return await fetchJsonComAuth(
    `/professoresDisciplinas/disciplinas-disponiveis/${userRole}?professor_id=${id}`, 
    null, 
    "GET"
  );
}

export async function desvincularDisciplinasProfessor(professorId, ofertasIds) {
  console.log("📤 Enviando para desvincular:", { professorId, ofertasIds });
  
  try {
    const response = await fetchJsonComAuth(
      `/desvincular-disciplinas`,
      {
        professor_id: Number(professorId),
        disciplinas: ofertasIds.map(id => Number(id))
      },
      "POST"
    );
    
    console.log("📥 Resposta recebida:", response);
    return response;
  } catch (error) {
    console.error("❌ Erro no service desvincular:", error);
    throw error;
  }
}
// Vincular professor às disciplinas selecionadas
export async function vincularDisciplinasProfessor(professor_id, disciplinas) {
  return fetchJsonComAuth("/vincular-disciplinas", { professor_id, disciplinas }, "POST");
}


