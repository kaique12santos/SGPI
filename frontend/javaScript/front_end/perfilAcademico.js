// perfilAcademico.js (corrigido)
// Usa services/ and utils externos para manter padrão do projeto

import { ativar } from "../utils/alerts.js";
import { getMinhasDisciplinas, getMeusGrupos, getMeusProjetos } from "../services/perfilAcademicoServices.js";
import { getDisciplinasDisponiveis, vincularDisciplinasProfessor } from "../services/disciplinaService.js";

// novos imports que estavam faltando / eram sugeridos
import { getDisciplinasDisponiveisAluno, atualizarDisciplinasAluno } from "../services/alunoDisciplinaService.js";
import { confirmarAcao } from "../utils/confirmDialog.js";

document.addEventListener("DOMContentLoaded", () => {
  // Containers principais
  const disciplinasContainer = document.querySelector(".disciplinas-container");
  const gruposContainer = document.querySelector(".grupos-container");
  const projetosContainer = document.querySelector(".projetos-container");

  // Botão e seção de disciplinas para professores/orientadores
  const btnDisciplinas = document.getElementById("btn-disciplinas-disponiveis");
  const sectionDisciplinas = document.getElementById("section-disciplinas-disponiveis");

  // Botão e seção de gerenciamento de disciplinas (alunos)
  const btnGerenciar = document.getElementById("btn-gerenciar-disciplinas");
  const sectionGerenciar = document.getElementById("section-gerenciar-disciplinas");

  // Dados do usuário
  const userRole = localStorage.getItem("userRole");
  const userId = localStorage.getItem("usuarioId");

  // ========== PROFESSOR / ORIENTADOR ==========
  const containerProf = document.querySelector(".disciplinas-disponiveis-container");
  const confirmarBtnProf = document.getElementById("confirmar-disciplinas-btn");

  if (userRole === "professor" || userRole === "professor_orientador") {
    btnDisciplinas?.classList?.add("visible");
    sectionDisciplinas.style.display = "none"; // inicia oculta
  }

  // 🔹 Carregar disciplinas disponíveis para professores/orientadores
  async function carregarDisciplinasDisponiveis() {
    containerProf.innerHTML = "<p>Carregando disciplinas...</p>";
    if (confirmarBtnProf) confirmarBtnProf.disabled = true;

    try {
      const data = await getDisciplinasDisponiveis(userRole);
      if (!data || !data.success || !Array.isArray(data.disciplinas) || data.disciplinas.length === 0) {
        containerProf.innerHTML = "<div class='empty-state'><h3>Nenhuma disciplina disponível no momento.</h3></div>";
        return;
      }

      const orientacao = data.disciplinas.filter(d => d.disciplina_nome.startsWith("Orientação de Projetos"));
      const regulares = data.disciplinas.filter(d => !d.disciplina_nome.startsWith("Orientação de Projetos"));

      let html = "";

      if (userRole === "professor_orientador") {
        html += /* html for orientador */ `
          <div class="disciplinas-bloco">
            <h3 class="disciplinas-titulo">📘 Disciplinas Regulares</h3>
            <div class="disciplinas-lista">
              ${
                regulares.length
                  ? regulares.map(d => `
                      <label class="disciplina-item">
                        <input type="checkbox" value="${d.disciplina_id}">
                        <span>${d.disciplina_nome}</span> <small>(${d.semestre_id}º semestre)</small>
                      </label>`).join("")
                  : "<p class='disciplinas-vazio'>Nenhuma disciplina regular disponível.</p>"
              }
            </div>
          </div>

          <div class="disciplinas-bloco">
            <h3 class="disciplinas-titulo">🎓 Disciplinas de Orientação</h3>
            <div class="disciplinas-lista">
              ${
                orientacao.length
                  ? orientacao.map(d => `
                      <label class="disciplina-item orientacao">
                        <input type="checkbox" value="${d.disciplina_id}">
                        <span>${d.disciplina_nome}</span> <small>(${d.semestre_id}º semestre)</small>
                      </label>`).join("")
                  : "<p class='disciplinas-vazio'>Nenhuma disciplina de orientação disponível.</p>"
              }
            </div>
          </div>
        `;
      } else {
        html += `
          <div class="disciplinas-bloco">
            <h3 class="disciplinas-titulo">📘 Disciplinas Regulares</h3>
            <div class="disciplinas-lista">
              ${
                regulares.length
                  ? regulares.map(d => `
                      <label class="disciplina-item">
                        <input type="checkbox" value="${d.disciplina_id}">
                        <span>${d.disciplina_nome}</span> <small>(${d.semestre_id}º semestre)</small>
                      </label>`).join("")
                  : "<p class='disciplinas-vazio'>Nenhuma disciplina disponível.</p>"
              }
            </div>
          </div>
        `;
      }

      containerProf.innerHTML = html;
      if (confirmarBtnProf) confirmarBtnProf.disabled = false;
    } catch (err) {
      console.error("Erro ao carregar disciplinas:", err);
      containerProf.innerHTML = "<div class='empty-state'><h3>Erro ao carregar disciplinas disponíveis.</h3></div>";
      ativar("Erro ao carregar disciplinas disponíveis.", "erro", "");
    }
  }

  confirmarBtnProf?.addEventListener("click", async () => {
    const selecionadas = Array.from(containerProf.querySelectorAll("input:checked")).map(i => i.value);

    if (selecionadas.length === 0) {
      ativar("Selecione pelo menos uma disciplina.", "erro", "");
      return;
    }

    try {
      const resposta = await vincularDisciplinasProfessor(userId, selecionadas);
      if (resposta.success) {
        ativar("Disciplinas vinculadas com sucesso!", "sucesso", "");
        await carregarDisciplinasDisponiveis();
      } else {
        ativar(resposta.message || "Erro ao vincular disciplinas.", "erro", "");
      }
    } catch (err) {
      ativar("Erro na comunicação com o servidor.", "erro", "");
    }
  });

  btnDisciplinas?.addEventListener("click", () => {
    document.querySelectorAll(".perfil-section").forEach(sec => sec.classList.remove("active"));
    sectionDisciplinas.classList.add("active");
    carregarDisciplinasDisponiveis();
  });


// === FUNÇÃO PARA ALUNOS ===
async function carregarDisciplinasAluno() {
  const container = document.querySelector(".disciplinas-gerenciar-container");
  const confirmarBtn = document.getElementById("btn-salvar-alteracoes");
  container.innerHTML = "<p>Carregando disciplinas...</p>";
  confirmarBtn.disabled = true;

  try {
    const { success, disciplinas } = await getDisciplinasDisponiveisAluno();

    if (!success || !disciplinas || disciplinas.length === 0) {
      container.innerHTML = "<p class='disciplinas-vazio'>Nenhuma disciplina disponível no momento.</p>";
      return;
    }

    const html = disciplinas.map(d => `
      <label class="disciplina-item">
        <input type="checkbox" value="${d.disciplina_id}" ${d.matriculado ? "checked" : ""}>
        <span>${d.disciplina_nome}</span>
        <small>(${d.semestre_id}º semestre)</small>
      </label>
    `).join("");

    container.innerHTML = `
      <div class="disciplinas-bloco">
        <h3 class="disciplinas-titulo">📘 Disciplinas disponíveis</h3>
        <div class="disciplinas-lista">${html}</div>
      </div>
    `;
    confirmarBtn.disabled = false;
  } catch (err) {
    console.error("Erro ao carregar disciplinas do aluno:", err);
    container.innerHTML = "<p>Erro ao carregar disciplinas.</p>";
  }
}


document.getElementById("btn-salvar-alteracoes")?.addEventListener("click", async () => {
  const container = document.querySelector(".disciplinas-gerenciar-container");
  const selecionadas = Array.from(container.querySelectorAll("input:checked")).map(i => Number(i.value));

  if (selecionadas.length === 0) {
    ativar("Selecione pelo menos uma disciplina.", "erro", "");
    return;
  }

  const confirmar = await confirmarAcao(
    "Confirmar alteração?",
    "As disciplinas antigas serão substituídas pelas novas seleções.",
    "Confirmar",
    "Cancelar"
  );
  if (!confirmar) return;

  try {
    const resposta = await atualizarDisciplinasAluno(selecionadas);
    if (resposta.success) {
      ativar("Disciplinas atualizadas com sucesso!", "sucesso", "");
      await carregarDisciplinasAluno();
    } else {
      ativar(resposta.message || "Erro ao atualizar disciplinas.", "erro", "");
    }
  } catch (err) {
    console.error("Erro ao salvar alterações:", err);
    ativar("Erro na comunicação com o servidor.", "erro", "");
  }
});


if (userRole === "aluno") {
  btnGerenciar.style.display = "flex";
  btnGerenciar.addEventListener("click", () => {
    document.querySelectorAll(".perfil-section").forEach(sec => sec.classList.remove("active"));
    document.getElementById("section-gerenciar-disciplinas").classList.add("active");
    carregarDisciplinasAluno();
  });
}



  // ========== OUTRAS SEÇÕES ==========
  async function carregarDisciplinas() {
    disciplinasContainer.innerHTML = "<p>Carregando...</p>";
    try {
      const resp = await getMinhasDisciplinas();
      const data = await resp.json();
      if (!data.success || !data.disciplinas.length) {
        disciplinasContainer.innerHTML = "<p>Nenhuma disciplina cadastrada.</p>";
        return;
      }
      disciplinasContainer.innerHTML = data.disciplinas.map(d => `
        <div class="disciplina-card">
          <h3>${d.nome}</h3>
          <p><b>Código:</b> ${d.codigo}</p>
          <p>${d.descricao ?? ""}</p>
        </div>`).join("");
    } catch (e) {
      console.error(e);
      ativar("Erro ao carregar disciplinas.", "erro", "");
    }
  }

  async function carregarGrupos() {
    gruposContainer.innerHTML = "<p>Carregando...</p>";
    try {
      const resp = await getMeusGrupos();
      const data = await resp.json();
      if (!data.success || !data.grupos.length) {
        gruposContainer.innerHTML = "<p>Nenhum grupo encontrado.</p>";
        return;
      }
      gruposContainer.innerHTML = data.grupos.map(g => `
        <div class="grupo-card">
          <h3>${g.nome}</h3>
          <p>${g.descricao ?? ""}</p>
          <small>Semestre: ${g.semestre_id}</small>
        </div>`).join("");
    } catch (e) {
      console.error(e);
      ativar("Erro ao carregar grupos.", "erro", "");
    }
  }

  async function carregarProjetos(semestreId = null) {
    const listaProjetos = document.querySelector(".lista-projetos");
    listaProjetos.innerHTML = "<p>Carregando projetos...</p>";
    try {
      const resp = await getMeusProjetos(semestreId);
      const data = await resp.json();
      if (!data.success || !data.projetos.length) {
        listaProjetos.innerHTML = "<p>Nenhum projeto encontrado.</p>";
        return;
      }
      listaProjetos.innerHTML = data.projetos.map(p => `
        <div class="projeto-card">
          <h3>${p.titulo} <small>${p.status}</small></h3>
          <p>${p.descricao ?? ""}</p>
          <small>Semestre: ${p.semestre_id}</small>
        </div>
      `).join("");
    } catch (e) {
      console.error(e);
      listaProjetos.innerHTML = "<p>Erro ao carregar projetos.</p>";
      ativar("Erro ao carregar projetos.", "erro", "");
    }
  }

  function inicializarEventosFiltro(semestreAtual = null) {
    const filtroSelect = document.getElementById("projetos-filtro-semestre");
    const filtroBtn = document.getElementById("btn-filtrar-semestre");
    const limparBtn = document.getElementById("btn-limpar-filtro-semestre");

    if (semestreAtual) filtroSelect.value = semestreAtual;

    filtroBtn?.addEventListener("click", () => {
      const semestreSelecionado = filtroSelect.value || null;
      carregarProjetos(semestreSelecionado);
    });

    limparBtn?.addEventListener("click", () => {
      filtroSelect.value = "";
      carregarProjetos();
    });
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("#btn-disciplinas-disponiveis")) carregarDisciplinasDisponiveis();
    if (e.target.closest("#btn-minhas-disciplinas")) carregarDisciplinas();
    if (e.target.closest("#btn-meus-grupos")) carregarGrupos();
    if (e.target.closest("#btn-meus-projetos")) {
      inicializarEventosFiltro();
      carregarProjetos();
    }
  });
});
