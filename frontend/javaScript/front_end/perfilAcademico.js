// perfilAcademico.js (patch focado)
// Usa services/ and utils externos para manter padrão do projeto
import { iniciarObserverDescricoes } from '../utils/descricaoLista.js';
import { ativar } from "../utils/alerts.js";
import { getMinhasDisciplinas, getMeusGrupos, getMeusProjetos } from "../services/perfilAcademicoServices.js";
import { getDisciplinasDisponiveis, vincularDisciplinasProfessor } from "../services/disciplinaService.js";
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

  // FIX: helper para alternar seções de forma consistente
  const allSections = Array.from(document.querySelectorAll(".perfil-section"));
  function hideAllSections() {
    allSections.forEach(sec => {
      sec.classList.remove("active");
      sec.style.display = "none"; // garante esconder
    });
  }
  function showSection(sectionEl) {
    if (!sectionEl) return;
    hideAllSections();
    sectionEl.style.display = "block"; // FIX: remove bloqueio por inline style
    sectionEl.classList.add("active");
  }

  // Dados do usuário (padroniza role)
  const rawRole = localStorage.getItem("userRole") || "";
  const userRole = rawRole.toLowerCase(); // FIX: padroniza
  const userId = localStorage.getItem("usuarioId");

  // ========== PROFESSOR / ORIENTADOR ==========
  const containerProf = document.querySelector(".disciplinas-disponiveis-container");
  const confirmarBtnProf = document.getElementById("confirmar-disciplinas-btn");

  // FIX: exibe botão/aba de professores apenas se for docente
  const isProfessor = ["professor", "professor_orientador", "orientador"].includes(userRole);
  if (isProfessor) {
    btnDisciplinas?.classList?.add("visible");
    // deixa a seção oculta até clicar
    if (sectionDisciplinas) sectionDisciplinas.style.display = "none";
  } else {
    // se não é professor, garante que não quebra ao acessar elementos
    // e mantém seção escondida
    if (sectionDisciplinas) sectionDisciplinas.style.display = "none";
  }

  // 🔹 Carregar disciplinas disponíveis para professores/orientadores
  async function carregarDisciplinasDisponiveis() {
    if (!isProfessor) return; // FIX: não executa para alunos
    if (!containerProf) return;

    containerProf.innerHTML = "<p>Carregando disciplinas...</p>";
    if (confirmarBtnProf) confirmarBtnProf.disabled = true;

    try {
      // FIX: passe um role compatível com seu backend se necessário
      const data = await getDisciplinasDisponiveis(userRole);
      // Suporte aos dois formatos: {success, disciplinas} OU array direto
      const disciplinasResp = Array.isArray(data) ? data :
        (data?.disciplinas && Array.isArray(data.disciplinas) ? data.disciplinas : []);

      if (!disciplinasResp.length) {
        containerProf.innerHTML = "<div class='empty-state'><h3>Nenhuma disciplina disponível no momento.</h3></div>";
        return;
      }

      const orientacao = disciplinasResp.filter(d => d.disciplina_nome?.startsWith("Orientação de Projetos"));
      const regulares = disciplinasResp.filter(d => !d.disciplina_nome?.startsWith("Orientação de Projetos"));

      let html = "";

      if (userRole === "professor_orientador" || userRole === "orientador") {
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
    if (!isProfessor) return;
    if (!containerProf) return;

    const selecionadas = Array.from(containerProf.querySelectorAll("input:checked")).map(i => i.value);

    if (selecionadas.length === 0) {
      ativar("Selecione pelo menos uma disciplina.", "erro", "");
      return;
    }

    try {
      const resposta = await vincularDisciplinasProfessor(userId, selecionadas);
      if (resposta?.success) {
        ativar("Disciplinas vinculadas com sucesso!", "sucesso", "");
        await carregarDisciplinasDisponiveis();
      } else {
        ativar(resposta?.message || "Erro ao vincular disciplinas.", "erro", "");
      }
    } catch (err) {
      ativar("Erro na comunicação com o servidor.", "erro", "");
    }
  });

  btnDisciplinas?.addEventListener("click", () => {
    if (!isProfessor) return;
    showSection(sectionDisciplinas); // FIX: garante show + active
    carregarDisciplinasDisponiveis();
  });

  // === FUNÇÃO PARA ALUNOS ===
  async function carregarDisciplinasAluno() {
    const container = document.querySelector(".disciplinas-gerenciar-container");
    const confirmarBtn = document.getElementById("btn-salvar-alteracoes");
    if (!container || !confirmarBtn) return;

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
          <input type="checkbox" value="${d.id}" ${d.matriculado ? "checked" : ""}>
          <span>${d.nome}</span>
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
    if (!container) return;

    const selecionadas = Array.from(container.querySelectorAll("input:checked"))
    .map(i => Number(i.value))
    .filter(id => !isNaN(id) && id !== 0 && id !== null);

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
      if (resposta?.success) {
        ativar("Disciplinas atualizadas com sucesso!", "sucesso", "");
        await carregarDisciplinasAluno();
      } else {
        ativar(resposta?.message || "Erro ao atualizar disciplinas.", "erro", "");
      }
    } catch (err) {
      console.error("Erro ao salvar alterações:", err);
      ativar("Erro na comunicação com o servidor.", "erro", "");
    }
  });

  if (userRole === "aluno") {
    if (btnGerenciar) btnGerenciar.style.display = "flex";
    btnGerenciar?.addEventListener("click", () => {
      showSection(sectionGerenciar); // FIX
      carregarDisciplinasAluno();
    });
  }

  // ========== OUTRAS SEÇÕES ==========
  // FIX: seus services provavelmente já retornam JSON.
  // Pare de chamar resp.json(), use diretamente o objeto.

  async function carregarDisciplinas() {
    if (!disciplinasContainer) return;
    disciplinasContainer.innerHTML = "<p>Carregando...</p>";
    try {
      const data = await getMinhasDisciplinas(); // FIX: sem .json()
      const list = data?.disciplinas ?? [];
      if (!data?.success || list.length === 0) {
        disciplinasContainer.innerHTML = "<p>Nenhuma disciplina cadastrada.</p>";
        return;
      }
      disciplinasContainer.innerHTML = data.disciplinas.map(d => `
        <div class="disciplina-card">
          <h3>${d.nome}</h3>
          <p><b>Código:</b> ${d.codigo ?? d.id ?? ""}</p>
          <p>${d.descricao ?? ""}</p>
        </div>`).join("");
    } catch (e) {
      console.error(e);
      ativar("Erro ao carregar disciplinas.", "erro", "");
      disciplinasContainer.innerHTML = "<p>Erro ao carregar disciplinas.</p>";
    }
  }

  async function carregarGrupos() {
    if (!gruposContainer) return;
    gruposContainer.innerHTML = "<p>Carregando...</p>";
    try {
      const data = await getMeusGrupos(); // FIX
      if (!data?.success || !Array.isArray(data.grupos) || !data.grupos.length) {
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
      gruposContainer.innerHTML = "<p>Erro ao carregar grupos.</p>";
    }
  }

  async function carregarProjetos(semestreId = null) {
    const listaProjetos = document.querySelector(".lista-projetos");
    if (!listaProjetos) return;

    listaProjetos.innerHTML = "<p>Carregando projetos...</p>";
    try {
      const data = await getMeusProjetos(semestreId); // FIX
      if (!data?.success || !Array.isArray(data.projetos) || !data.projetos.length) {
        listaProjetos.innerHTML = "<p>Nenhum projeto encontrado.</p>";
        return;
      }
      listaProjetos.innerHTML = data.projetos.map(p => `
        <div class="projeto-card">
          <h3>${p.titulo} <small>${p.status ?? ""}</small></h3>
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

    if (semestreAtual && filtroSelect) filtroSelect.value = semestreAtual;

    filtroBtn?.addEventListener("click", () => {
      const semestreSelecionado = filtroSelect?.value || null;
      carregarProjetos(semestreSelecionado);
    });

    limparBtn?.addEventListener("click", () => {
      if (filtroSelect) filtroSelect.value = "";
      carregarProjetos();
    });
  }

  // Navegação por clique (garante mostrar seção)
  document.addEventListener("click", (e) => {
    if (e.target.closest("#btn-disciplinas-disponiveis")) {
      showSection(sectionDisciplinas);
      carregarDisciplinasDisponiveis();
    }
    if (e.target.closest("#btn-minhas-disciplinas")) {
      const sec = document.getElementById("section-minhas-disciplinas");
      showSection(sec);
      carregarDisciplinas();
    }
    if (e.target.closest("#btn-meus-grupos")) {
      const sec = document.getElementById("section-meus-grupos");
      showSection(sec);
      carregarGrupos();
    }
    if (e.target.closest("#btn-meus-projetos")) {
      const sec = document.getElementById("section-meus-projetos");
      showSection(sec);
      inicializarEventosFiltro();
      carregarProjetos();
    }
  });

  iniciarObserverDescricoes();
});