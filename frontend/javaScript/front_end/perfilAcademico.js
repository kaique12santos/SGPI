import { obterPerfil } from "../services/perfilServices.js";
import { iniciarObserverDescricoes } from '../utils/descricaoLista.js';
import { ativar } from "../utils/alerts.js";
import { getMinhasDisciplinas, getMeusGrupos, getMeusProjetos, getDisciplinasDisponiveisProfessor } from "../services/perfilAcademicoServices.js";
import { getDisciplinasDisponiveis, vincularDisciplinasProfessor, desvincularDisciplinasProfessor } from "../services/disciplinaService.js";
import { getDisciplinasDisponiveisAluno, atualizarDisciplinasAluno } from "../services/alunoDisciplinaService.js";
import { confirmarAcao } from "../utils/confirmDialog.js";

document.addEventListener("DOMContentLoaded", () => {
  // ============================================
  // VARIÁVEIS GLOBAIS DO ESCOPO
  // ============================================
  const disciplinasContainer = document.querySelector(".disciplinas-container");
  const gruposContainer = document.querySelector(".grupos-container");
  const projetosContainer = document.querySelector(".projetos-container");
  const btnDisciplinas = document.getElementById("btn-disciplinas-disponiveis");
  const sectionDisciplinas = document.getElementById("section-disciplinas-disponiveis");
  const btnGerenciar = document.getElementById("btn-gerenciar-disciplinas");
  const sectionGerenciar = document.getElementById("section-gerenciar-disciplinas");
  const containerProf = document.querySelector(".disciplinas-disponiveis-container");
  const confirmarBtnProf = document.getElementById("confirmar-disciplinas-btn");
  const desvincularBtn = document.getElementById("desvincular-disciplinas-btn");
  //-- alunos
  const containerAluno = document.querySelector(".disciplinas-gerenciar-container");
  const btnSalvarAluno = document.getElementById("btn-salvar-alteracoes");
  const btnToggleGerenciamentoAluno = document.getElementById("btn-toggle-gerenciamento-aluno");

  const rawRole = localStorage.getItem("userRole") || "";
  const userRole = rawRole.toLowerCase();
  const userId = localStorage.getItem("usuarioId");
  const isProfessor = ["professor", "professor_orientador", "orientador"].includes(userRole);

  // Variáveis de controle do modo desvinculação professores/orientadores
  let modoDesvinculacao = false;
  let disciplinasOriginais = [];
  // --- Estado do Aluno ---
  let modoGerenciamentoAluno = false;

  // ============================================
  // HELPER: Alternar Seções
  // ============================================
  function hideAllSections() {
    // A busca é feita dinamicamente
    const sectionsAtuais = document.querySelectorAll(".perfil-section"); 
    
    sectionsAtuais.forEach(sec => {
      sec.classList.remove("active");
    });
  }
  
  function showSection(sectionEl) {
    if (!sectionEl) {
      console.warn("Tentativa de mostrar uma seção nula.");
      return;
    }
    
    // 1. Remove 'active' de todas
    hideAllSections(); 
    
    // 2. Adiciona 'active' apenas na seção alvo
    sectionEl.classList.add("active");
  }

  // ============================================
  // CONFIGURAÇÃO INICIAL PROFESSOR
  // ============================================
  if (isProfessor) {
    // Professor logado:
    btnDisciplinas?.classList?.add("visible");
    if (sectionGerenciar) sectionGerenciar.style.display = "none"; // Esconde a seção do ALUNO
  } else {
    // Aluno logado:
    if (sectionDisciplinas) sectionDisciplinas.style.display = "none"; // Esconde a seção do PROFESSOR
  }

  // ============================================
  // FUNÇÕES: PROFESSORES/ORIENTADORES
  // ============================================
  
  async function carregarDisciplinasDisponiveis() {
    if (!isProfessor || !containerProf) return;

    containerProf.innerHTML = "<p>Carregando disciplinas...</p>";
    if (confirmarBtnProf) confirmarBtnProf.disabled = true;
    if (desvincularBtn) desvincularBtn.disabled = true;

    modoDesvinculacao = false;
    disciplinasOriginais = [];
    atualizarEstadoBotoes();

    try {
      const data = await getDisciplinasDisponiveisProfessor(userId);
      console.log("📊 Dados recebidos:", data);
      
      const disciplinasResp = Array.isArray(data) ? data :
        (data?.disciplinas && Array.isArray(data.disciplinas) ? data.disciplinas : []);

      if (!disciplinasResp.length) {
        containerProf.innerHTML = "<div class='empty-state'><h3>Nenhuma disciplina disponível no momento.</h3></div>";
        return;
      }

      disciplinasOriginais = disciplinasResp
        .filter(d => d.minha)
        .map(d => String(d.oferta_id));
      
      console.log("📌 Minhas disciplinas originais:", disciplinasOriginais);

      const orientacao = disciplinasResp.filter(d => d.disciplina_nome?.startsWith("Orientação de Projetos"));
      const regulares = disciplinasResp.filter(d => !d.disciplina_nome?.startsWith("Orientação de Projetos"));

      let html = "";

      if (userRole === "professor_orientador" || userRole === "orientador") {
        html += gerarBlocoHTML("📘 Disciplinas Regulares", regulares);
        html += gerarBlocoHTML("🎓 Disciplinas de Orientação", orientacao, "orientacao");
      } else {
        html += gerarBlocoHTML("📘 Disciplinas Disponíveis", regulares);
      }

      containerProf.innerHTML = html;
      if (confirmarBtnProf) confirmarBtnProf.disabled = false;
      if (desvincularBtn) desvincularBtn.disabled = false;

      adicionarListenersCheckboxes();
    } catch (err) {
      console.error("❌ Erro ao carregar disciplinas:", err);
      containerProf.innerHTML = "<div class='empty-state'><h3>Erro ao carregar disciplinas disponíveis.</h3></div>";
      ativar("Erro ao carregar disciplinas disponíveis.", "erro", "");
    }
  }

  function gerarBlocoHTML(titulo, disciplinas, classeExtra = "") {
    if (!disciplinas.length) {
      return `
        <div class="disciplinas-bloco">
          <h3 class="disciplinas-titulo">${titulo}</h3>
          <p class='disciplinas-vazio'>Nenhuma disciplina disponível nesta categoria.</p>
        </div>
      `;
    }

    const items = disciplinas.map(d => `
      <label class="disciplina-item ${classeExtra} ${d.minha ? 'vinculada' : ''} ${d.atribuida && !d.minha ? 'ocupada' : ''}" data-oferta-id="${d.oferta_id}">
        <input 
          type="checkbox" 
          value="${d.oferta_id}" 
          data-minha="${d.minha ? '1' : '0'}"
          data-atribuida="${d.atribuida ? '1' : '0'}"
          ${d.minha ? "checked" : ""} 
          ${d.atribuida && !d.minha ? "disabled" : ""}>
        <span>${d.disciplina_nome}</span>
        <small>(${d.semestre_padrao}º semestre - 0${d.periodo}/${d.ano})</small>
        ${d.minha ? '<span class="badge-vinculada">✓ Vinculada</span>' : ''}
        ${d.atribuida && !d.minha ? '<span class="badge-ocupada">✕ Ocupada</span>' : ''}
      </label>
    `).join("");

    return `
      <div class="disciplinas-bloco">
        <h3 class="disciplinas-titulo">${titulo}</h3>
        <div class="disciplinas-lista">${items}</div>
      </div>
    `;
  }

  function adicionarListenersCheckboxes() {
    if (!containerProf) return;
    const checkboxes = containerProf.querySelectorAll('input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const minha = e.target.dataset.minha === '1';
        
        if (!modoDesvinculacao) {
          if (minha && !e.target.checked) {
            e.target.checked = true;
            ativar("Use o botão 'Gerenciar Minhas Disciplinas' para desvincular.", "aviso", "");
          }
        }
      });
    });
  }

  function alternarModo(ativarDesvinculacao) {
    if (!containerProf) return;
    modoDesvinculacao = ativarDesvinculacao;
    
    const checkboxes = containerProf.querySelectorAll('input[type="checkbox"]');
    const labels = containerProf.querySelectorAll('.disciplina-item');
    
    checkboxes.forEach((checkbox, index) => {
      const minha = checkbox.dataset.minha === '1';
      const atribuida = checkbox.dataset.atribuida === '1';
      const label = labels[index];
      
      if (modoDesvinculacao) {
        if (!minha) {
          checkbox.disabled = true;
          label?.classList.add('desabilitada');
        } else {
          checkbox.disabled = false;
          label?.classList.remove('desabilitada');
        }
      } else {
        if (atribuida && !minha) {
          checkbox.disabled = true;
        } else {
          checkbox.disabled = false;
        }
        label?.classList.remove('desabilitada');
      }
    });
    
    atualizarEstadoBotoes();
  }

  function atualizarEstadoBotoes() {
    if (modoDesvinculacao) {
      if (confirmarBtnProf) confirmarBtnProf.style.display = 'none';
      if (desvincularBtn) {
        desvincularBtn.innerHTML = '<span>✅</span> Confirmar Alterações';
        desvincularBtn.classList.add('ativo');
      }
    } else {
      if (confirmarBtnProf) confirmarBtnProf.style.display = 'inline-block';
      if (desvincularBtn) {
        desvincularBtn.innerHTML = '<span>⚙️</span> Gerenciar Minhas Disciplinas';
        desvincularBtn.classList.remove('ativo');
      }
    }
  }

  // ============================================
  // EVENTOS: VINCULAR/DESVINCULAR
  // ============================================
  
  confirmarBtnProf?.addEventListener("click", async () => {
    if (!isProfessor || !containerProf) return;

    const selecionadas = Array.from(
      containerProf.querySelectorAll('input[type="checkbox"]:checked[data-minha="0"]')
    ).map(i => i.value);

    if (selecionadas.length === 0) {
      ativar("Selecione pelo menos uma disciplina disponível para vincular.", "aviso", "");
      return;
    }

    try {
      const resp = await obterPerfil();
      if (resp.ok) {
        const dataProfessores = await resp.json();
        const nomeProfessor = dataProfessores.usuario.usuario_nome;
        
        const confirmar = await confirmarAcao(
          `${nomeProfessor}, tem certeza?`,
          `Você está vinculando ${selecionadas.length} disciplina(s) à sua grade.`,
          "Confirmar Vínculo",
          "Cancelar"
        );
        
        if (!confirmar) return;
      } else {
        const errorData = await resp.json();
        ativar(errorData.message || "Erro ao carregar dados do usuário", "erro", "");
        return;
      }

      const resposta = await vincularDisciplinasProfessor(userId, selecionadas);
      
      if (resposta?.success) {
        ativar("Disciplinas vinculadas com sucesso!", "sucesso", "");
        await carregarDisciplinasDisponiveis();
      } else {
        ativar(resposta?.message || "Erro ao vincular disciplinas.", "erro", "");
      }
    } catch (err) {
      console.error("❌ Erro ao vincular:", err);
      ativar("Erro na comunicação com o servidor.", "erro", "");
    }
  });

  desvincularBtn?.addEventListener("click", async () => {
    if (!isProfessor || !containerProf) return;

    if (!modoDesvinculacao) {
      alternarModo(true);
      ativar("Modo de gerenciamento ativado. Desmarque as disciplinas que deseja desvincular.", "info", "");
      return;
    }

    const disciplinasAtuais = Array.from(
      containerProf.querySelectorAll('input[type="checkbox"][data-minha="1"]:checked')
    ).map(i => String(i.value));

    const paraDesvincular = disciplinasOriginais.filter(id => !disciplinasAtuais.includes(id));

    if (paraDesvincular.length === 0) {
      ativar("Nenhuma alteração detectada. Desmarque disciplinas para desvinculá-las.", "aviso", "");
      alternarModo(false);
      return;
    }

    try {
      const resp = await obterPerfil();
      if (resp.ok) {
        const dataProfessores = await resp.json();
        const nomeProfessor = dataProfessores.usuario.usuario_nome;
        
        const confirmar = await confirmarAcao(
          `${nomeProfessor}, deseja mesmo desvincular?`,
          `Você está removendo ${paraDesvincular.length} disciplina(s) da sua grade.`,
          "Sim, Desvincular",
          "Cancelar"
        );
        
        if (!confirmar) {
          alternarModo(false);
          await carregarDisciplinasDisponiveis();
          return;
        }
      } else {
        const errorData = await resp.json();
        ativar(errorData.message || "Erro ao carregar dados do usuário", "erro", "");
        return;
      }

      const resposta = await desvincularDisciplinasProfessor(userId, paraDesvincular);
      
      if (resposta?.success) {
        ativar("Disciplinas desvinculadas com sucesso!", "sucesso", "");
        await carregarDisciplinasDisponiveis();
      } else {
        ativar(resposta?.message || "Erro ao desvincular disciplinas.", "erro", "");
      }
    } catch (err) {
      console.error("❌ Erro ao desvincular:", err);
      ativar("Erro na comunicação com o servidor.", "erro", "");
    }
  });

  // ============================================
  // FUNÇÕES: ALUNOS (INÍCIO DA SEÇÃO MODIFICADA)
  // ============================================

  /**
   * Habilita ou desabilita os checkboxes e botões
   * da seção de gerenciamento do aluno, baseado na variável global `modoGerenciamentoAluno`.
   */
  function atualizarEstadoGerenciamentoAluno() {
    // Usamos as variáveis globais que você definiu no topo
    if (!containerAluno || !btnSalvarAluno || !btnToggleGerenciamentoAluno) return;

    const checkboxes = containerAluno.querySelectorAll('input[type="checkbox"]');
    
    if (modoGerenciamentoAluno) {
      // MODO EDIÇÃO (DESBLOQUEADO)
      checkboxes.forEach(cb => cb.disabled = false);
      btnSalvarAluno.disabled = false;
      btnToggleGerenciamentoAluno.innerHTML = "<span>❌</span> Cancelar";
      btnToggleGerenciamentoAluno.classList.add("ativo"); // (Opcional, para estilo)
    } else {
      // MODO PADRÃO (BLOQUEADO)
      checkboxes.forEach(cb => cb.disabled = true);
      btnSalvarAluno.disabled = true;
      btnToggleGerenciamentoAluno.innerHTML = "<span>⚙️</span> Gerenciar Matrículas";
      btnToggleGerenciamentoAluno.classList.remove("ativo"); // (Opcional, para estilo)
    }
  }
  
  /**
   * Carrega as disciplinas do aluno e aplica o estado de "bloqueado" por padrão.
   */
  async function carregarDisciplinasAluno() {
    // Usamos as variáveis globais
    if (!containerAluno || !btnSalvarAluno || !btnToggleGerenciamentoAluno) {
      console.warn("Elementos do DOM de gerenciamento do Aluno não encontrados.");
      return;
    }

    containerAluno.innerHTML = "<p>Carregando disciplinas...</p>";
    
    // Reseta o estado para "bloqueado" toda vez que carregar
    modoGerenciamentoAluno = false;
    atualizarEstadoGerenciamentoAluno(); // Chama a função para bloquear o formulário

    try {
      const { success, disciplinas } = await getDisciplinasDisponiveisAluno();

      if (!success || !disciplinas || disciplinas.length === 0) {
        containerAluno.innerHTML = "<p class='disciplinas-vazio'>Nenhuma disciplina disponível no momento.</p>";
        // Desabilita o botão de gerenciar se não há disciplinas
        btnToggleGerenciamentoAluno.disabled = true;
        return;
      }
      
      // Habilita o botão de gerenciar, pois há disciplinas
      btnToggleGerenciamentoAluno.disabled = false;

      const html = disciplinas.map(d => `
        <label class="disciplina-item">
          <input type="checkbox" value="${d.id}" ${d.matriculado ? "checked" : ""}>
          <span>${d.nome}</span>
          <small>(${d.semestre_padrao}º semestre)</small>
        </label>
      `).join("");

      containerAluno.innerHTML = `
        <div class="disciplinas-bloco">
          <h3 class="disciplinas-titulo">📘 Disciplinas disponíveis</h3>
          <div class="disciplinas-lista">${html}</div>
        </div>
      `;

      // Aplica o estado inicial (bloqueado) aos novos checkboxes
      atualizarEstadoGerenciamentoAluno();

    } catch (err) {
      console.error("Erro ao carregar disciplinas do aluno:", err);
      containerAluno.innerHTML = "<p>Erro ao carregar disciplinas.</p>";
    }
  }

  // Listener para o botão "Gerenciar/Cancelar" (usa a variável global)
  btnToggleGerenciamentoAluno?.addEventListener("click", () => {
    if (modoGerenciamentoAluno) {
      // Estava em modo edição, clicou em "Cancelar"
      modoGerenciamentoAluno = false;
      // Recarrega as disciplinas para resetar o estado dos checkboxes
      carregarDisciplinasAluno(); 
    } else {
      // Estava bloqueado, clicou em "Gerenciar"
      modoGerenciamentoAluno = true;
      atualizarEstadoGerenciamentoAluno(); // Desbloqueia os inputs
      ativar("Modo de edição ativado. Faça suas alterações e salve.", "info", "");
    }
  });

  // Listener para o botão "Salvar" (usa as variáveis globais)
  btnSalvarAluno?.addEventListener("click", async () => {
    if (!containerAluno) return;

    const selecionadas = Array.from(containerAluno.querySelectorAll("input:checked"))
      .map(i => Number(i.value))
      .filter(id => !isNaN(id)); // Permite array vazio (desmatricular de tudo)

    const confirmar = await confirmarAcao(
      "Confirmar alteração?",
      "Sua lista de matrículas será atualizada para as disciplinas selecionadas.",
      "Confirmar",
      "Cancelar"
    );
    if (!confirmar) return;

    try {
      const resposta = await atualizarDisciplinasAluno(selecionadas);
      if (resposta?.success) {
        ativar("Disciplinas atualizadas com sucesso!", "sucesso", "");
        // Reseta o modo e recarrega a lista, bloqueando o formulário
        modoGerenciamentoAluno = false; 
        await carregarDisciplinasAluno();
      } else {
        ativar(resposta?.message || "Erro ao atualizar disciplinas.", "erro", "");
      }
    } catch (err) {
      console.error("Erro ao salvar alterações:", err);
      ativar("Erro na comunicação com o servidor.", "erro", "");
    }
  });

  // Listener que MOSTRA a seção do aluno (usa a variável global `btnGerenciar`)
  if (userRole === "aluno") {
    if (btnGerenciar) btnGerenciar.style.display = "flex";
    btnGerenciar?.addEventListener("click", () => {
      showSection(sectionGerenciar);
      carregarDisciplinasAluno(); // Apenas chama a função de carregar
    });
  }

  async function carregarDisciplinas() {
    if (!disciplinasContainer) return;
    disciplinasContainer.innerHTML = "<p>Carregando...</p>";
    try {
      const data = await getMinhasDisciplinas();
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
      const data = await getMeusGrupos();
      if (!data?.success || !Array.isArray(data.grupos) || !data.grupos.length) {
        gruposContainer.innerHTML = "<p>Nenhum grupo encontrado.</p>";
        return;
      }
      gruposContainer.innerHTML = data.grupos.map(g => `
        <div class="grupo-card">
          <h3>${g.nome}</h3>
          <p>${g.descricao ?? ""}</p>
          <small>Semestre: ${g.periodo}º / ${g.ano}</small>
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
      const data = await getMeusProjetos(semestreId);
      if (!data?.success || !Array.isArray(data.projetos) || !data.projetos.length) {
        listaProjetos.innerHTML = "<p>Nenhum projeto encontrado.</p>";
        return;
      }
      listaProjetos.innerHTML = data.projetos.map(p => `
        <div class="projeto-card">
          <h3>${p.titulo} <small>${p.status ?? ""}</small></h3>
          <p>${p.descricao ?? ""}</p>
          <small>Semestre: ${p.periodo}º / ${p.ano}</small>
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

  // ============================================
  // NAVEGAÇÃO POR CLIQUE (CORRIGIDO)
  // ============================================
  
  btnDisciplinas?.addEventListener("click", () => {
    showSection(sectionDisciplinas);
    carregarDisciplinasDisponiveis();
  });

  document.getElementById("btn-minhas-disciplinas")?.addEventListener("click", () => {
    const sec = document.getElementById("section-minhas-disciplinas");
    showSection(sec);
    carregarDisciplinas();
  });

  document.getElementById("btn-meus-grupos")?.addEventListener("click", () => {
    const sec = document.getElementById("section-meus-grupos");
    showSection(sec);
    carregarGrupos();
  });

  document.getElementById("btn-meus-projetos")?.addEventListener("click", () => {
    const sec = document.getElementById("section-meus-projetos");
    showSection(sec);
    inicializarEventosFiltro();
    carregarProjetos();
  });

  iniciarObserverDescricoes();

});