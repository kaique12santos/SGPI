import { ativar } from "../utils/alerts.js";
import { getMinhasDisciplinas, getMeusGrupos, getMeusProjetos } from "../services/perfilAcademicoServices.js";
import { getDisciplinasDisponiveis, vincularDisciplinasProfessor } from "../services/disciplinaService.js";


document.addEventListener("DOMContentLoaded", () => {
  const disciplinasContainer = document.querySelector(".disciplinas-container");
  const gruposContainer = document.querySelector(".grupos-container");
  const projetosContainer = document.querySelector(".projetos-container");
  const sectionDisciplinasDisponiveis = document.getElementById("section-disciplinas-disponiveis");
  const btnDisciplinasDisponiveis = document.getElementById("btn-disciplinas-disponiveis");

  const userRole = localStorage.getItem('userRole');
  const userId = localStorage.getItem('usuarioId');
  const containerDisciplinasDisponiveis = document.querySelector(".disciplinas-disponiveis-container");
  const confirmarBtn = document.getElementById("confirmar-disciplinas-btn");

  // Ajuste de visibilidade do botão "Disciplinas Disponíveis"
  if (userRole === "professor" || userRole === "professor_orientador") {
    btnDisciplinasDisponiveis.style.display = "flex";
  } else {
    btnDisciplinasDisponiveis.style.display = "none";
  }

  // 🔹 Carregar disciplinas disponíveis conforme o perfil
  async function carregarDisciplinasDisponiveis() {
    containerDisciplinasDisponiveis.innerHTML = "<p>Carregando disciplinas...</p>";
    confirmarBtn.disabled = true;
  
    try {
      const data = await getDisciplinasDisponiveis(userRole);
      if (!data.success || !data.disciplinas.length) {
        containerDisciplinasDisponiveis.innerHTML = "<div class='empty-state'><h3>Nenhuma disciplina disponível no momento.</h3></div>";
        return;
      }
  
      // 🔹 Separar disciplinas de orientação e da grade normal
      const orientacao = data.disciplinas.filter(d => d.disciplina_nome.startsWith("Orientação de Projetos"));
      const regulares = data.disciplinas.filter(d => !d.disciplina_nome.startsWith("Orientação de Projetos"));
  
      let html = "";
  
      // 🔸 Exibe as duas seções para orientadores
      if (userRole === "professor_orientador") {
        html += `
          <div class="disciplinas-bloco">
            <h3 class="disciplinas-titulo">📘 Disciplinas Regulares</h3>
            <div class="disciplinas-lista">
              ${
                regulares.length
                  ? regulares
                      .map(
                        d => `
                        <label class="disciplina-item">
                          <input type="checkbox" value="${d.disciplina_id}">
                          <span>${d.disciplina_nome}</span> <small>(${d.semestre_id}º semestre)</small>
                        </label>`
                      )
                      .join("")
                  : "<p class='disciplinas-vazio'>Nenhuma disciplina regular disponível.</p>"
              }
            </div>
          </div>
  
          <div class="disciplinas-bloco">
            <h3 class="disciplinas-titulo">🎓 Disciplinas de Orientação</h3>
            <div class="disciplinas-lista">
              ${
                orientacao.length
                  ? orientacao
                      .map(
                        d => `
                        <label class="disciplina-item orientacao">
                          <input type="checkbox" value="${d.disciplina_id}">
                          <span>${d.disciplina_nome}</span> <small>(${d.semestre_id}º semestre)</small>
                        </label>`
                      )
                      .join("")
                  : "<p class='disciplinas-vazio'>Nenhuma disciplina de orientação disponível.</p>"
              }
            </div>
          </div>
        `;
      } 
      // 🔸 Professores comuns veem apenas disciplinas regulares
      else {
        html += `
          <div class="disciplinas-bloco">
            <h3 class="disciplinas-titulo">📘 Disciplinas Regulares</h3>
            <div class="disciplinas-lista">
              ${
                regulares.length
                  ? regulares
                      .map(
                        d => `
                        <label class="disciplina-item">
                          <input type="checkbox" value="${d.disciplina_id}">
                          <span>${d.disciplina_nome}</span> <small>(${d.semestre_id}º semestre)</small>
                        </label>`
                      )
                      .join("")
                  : "<p class='disciplinas-vazio'>Nenhuma disciplina disponível.</p>"
              }
            </div>
          </div>
        `;
      }
  
      containerDisciplinasDisponiveis.innerHTML = html;
      confirmarBtn.disabled = false;
    } catch (err) {
      console.error("Erro ao carregar disciplinas disponíveis:", err);
      containerDisciplinasDisponiveis.innerHTML = "<div class='empty-state'><h3>Erro ao carregar disciplinas disponíveis.</h3></div>";
    }
  }
  

// 🔹 Evento de confirmação para Disciplinas Disponíveis
confirmarBtn.addEventListener("click", async () => {
  const selecionadas = Array.from(containerDisciplinasDisponiveis.querySelectorAll("input:checked")).map(i => i.value);

  if (selecionadas.length === 0) {
    ativar("Selecione pelo menos uma disciplina.", "erro", "");
    return;
  }

  try {
    const resposta = await vincularDisciplinasProfessor(userId, selecionadas);
    if (resposta.success) {
      ativar("Disciplinas vinculadas com sucesso!", "sucesso", "/TelaPrincipal");
      await carregarDisciplinasDisponiveis(); // atualiza a lista
    } else {
      ativar(resposta.message || "Erro ao vincular disciplinas.", "erro", "");
    }
  } catch (err) {
    ativar("Erro na comunicação com o servidor.", "erro", "");
  }
});


  // === Minhas Disciplinas ===
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

  // === Meus Grupos ===
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

  // === Meus Projetos ===
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
  
      const cardsHTML = data.projetos.map(p => `
        <div class="projeto-card">
          <h3>${p.titulo} <small>${p.status}</small></h3>
          <p>${p.descricao ?? ""}</p>
          <small>Semestre: ${p.semestre_id}</small>
        </div>
      `).join("");
  
      listaProjetos.innerHTML = cardsHTML;
  
    } catch (e) {
      console.error(e);
      listaProjetos.innerHTML = "<p>Erro ao carregar projetos.</p>";
      ativar("Erro ao carregar projetos.", "erro", "");
    }
  }


  // 🧰 Inicializa os eventos do filtro após o HTML estar inserido
  function inicializarEventosFiltro(semestreAtual = null) {
    const filtroSelect = document.getElementById("projetos-filtro-semestre");
    const filtroBtn = document.getElementById("btn-filtrar-semestre");
    const limparBtn = document.getElementById("btn-limpar-filtro-semestre");

    if (semestreAtual) filtroSelect.value = semestreAtual;

    filtroBtn.onclick = () => {
      const semestreSelecionado = filtroSelect.value || null;
      carregarProjetos(semestreSelecionado);
    };

    limparBtn.onclick = () => {
      filtroSelect.value = "";
      carregarProjetos(); // volta a mostrar todos
    };
  }
  
  // === Botões do menu lateral (Lógica UNIFICADA com style.display) ===
  const perfilNavItems = document.querySelectorAll(".perfil-nav-item");
  const perfilSections = document.querySelectorAll(".perfil-section"); // Seleciona todas as seções de conteúdo

  perfilNavItems.forEach(item => {
    item.addEventListener("click", () => {
      // 1. Remove 'active' de todos os itens de navegação (visual)
      perfilNavItems.forEach(navItem => navItem.classList.remove("active"));
      // 2. Adiciona 'active' ao item clicado (visual)
      item.classList.add("active");

      // 3. Oculta TODAS as seções de conteúdo (display: none)
      perfilSections.forEach(section => {
        section.style.display = "none";
      });

      // 4. Identifica a seção alvo e a exibe (display: block)
      const targetSectionId = item.dataset.section; // Pega o valor do atributo data-section
      const targetSection = document.getElementById(`section-${targetSectionId}`);
      if (targetSection) {
        targetSection.style.display = "block"; // Exibe apenas a seção desejada

        // 5. Chama a função de carregamento de dados apropriada
        switch (targetSectionId) {
          case "meus-dados":
            // Meus Dados não precisa de carregamento dinâmico ao ativar
            break;
          case "minhas-disciplinas":
            carregarDisciplinas();
            break;
          case "meus-grupos":
            carregarGrupos();
            break;
          case "meus-projetos":
            inicializarEventosFiltro();
            carregarProjetos();
            break;
          case "disciplinas-disponiveis":
            carregarDisciplinasDisponiveis();
            break;
          case "dashboard-admin":
          case "dashboard-coordenador":
          case "dashboard-professor":
          case "dashboard-orientador":
            // Funções de carregamento de dashboard aqui, se existirem
            break;
        }
      }
    });
  });

  // --- Lógica para o carregamento inicial da página ---
  // Oculta todas as seções no início, exceto a que deve estar ativa
  perfilSections.forEach(section => {
      section.style.display = "none";
  });

  const initialActiveButton = document.querySelector(".perfil-nav-item.active");
  if (initialActiveButton) {
      const initialTargetSectionId = initialActiveButton.dataset.section;
      const initialTargetSection = document.getElementById(`section-${initialTargetSectionId}`);
      if (initialTargetSection) {
          initialTargetSection.style.display = "block"; // Exibe a seção ativa inicial
          // Também chame a função de carregamento inicial para essa seção se necessário
          switch (initialTargetSectionId) {
            case "minhas-disciplinas":
                carregarDisciplinas();
                break;
            case "meus-projetos":
                inicializarEventosFiltro();
                carregarProjetos();
                break;
            // Adicione outros casos iniciais aqui
          }
      }
  } else {
      // Se nenhum botão tem 'active' no HTML, ative 'Meus Dados' por padrão
      const meusDadosBtn = document.getElementById("btn-meus-dados");
      if (meusDadosBtn) {
          meusDadosBtn.click(); // Simula o clique para ativar a seção e carregar (se houver)
      }
  }
});