
import { fetchJsonComAuth } from "../utils/fetchHelper.js";
/**
 * NOVO: Busca semestres ativos (ex: "2/2025") para o dropdown
 */
export async function obterSemestresAtivos() {
    return await fetchJsonComAuth(`/api/semestres?ativo=1`, null, "GET");
}

export async function obterTodosSemestres() {
    return await fetchJsonComAuth(`/api/semestres`, null, "GET");
}

export async function obterDisciplinasPorOrientador(orientadorId) {
    if (!orientadorId) return { success: false, disciplinas: [] };
    // Aplicando o filtro de 'Orientação' que definimos
    return await fetchJsonComAuth(`/api/disciplinas?orientador_id=${orientadorId}`, null, "GET");
}
    
  /**
   * CORRIGIDO: Busca grupos com base no semestre_id.
   */
  export async function obterGruposPorSemestre(semestreId) { //
      if (!semestreId) return { success: false, grupos: [] };
      // Chama a rota de grupos com o filtro correto
      return await fetchJsonComAuth(`/api/grupos?semestre_id=${semestreId}`, null, "GET"); //
  }
  
  // ==========================================
  // FUNÇÕES DE PROJETO (JÁ EXISTENTES)
  // ==========================================
    
  export async function obterProjetosPorOrientador(orientadorId) { //
    if (!orientadorId) return { projetos: [] };
    return await fetchJsonComAuth(`/api/projetos?orientador_id=${orientadorId}`, null, "GET"); //
  }

  export async function obterGruposPorDisciplina(disciplinaId, orientadorId) { //
    if (!disciplinaId || !orientadorId) return { success: false, grupos: [] };
    
    // MODIFICADO: A URL da API agora passa os dois filtros
    return await fetchJsonComAuth(
      `/api/grupos?disciplina_id=${disciplinaId}&orientador_id=${orientadorId}`, 
      null, 
      "GET"
    );
}
  export async function criarProjetoAPI(dados) {
      // dados: { titulo, descricao, grupo_id, orientador_id, semestre_id, disciplina_id }
     return await fetchJsonComAuth('/api/projetos', dados, 'POST'); //
  }
    
  export async function atualizarProjeto(id, dados) {
      // MODIFICADO: 'dados' agora deve incluir 'disciplina_id'
      return await fetchJsonComAuth(`/api/projetos/${id}`, dados, 'PUT'); //
  }
    
  export async function excluirProjeto(id) { //
      return await fetchJsonComAuth(`/api/projetos/${id}`, null, 'DELETE'); //
  }