
// 1️⃣ Mapeamento de abas por tipo de usuário
const perfilTabsByRole = {
    aluno: [
      { id: "btn-meus-dados", text: "Meus Dados", section: "meus-dados" },
      { id: "btn-minhas-disciplinas", text: "Minhas Disciplinas", section: "minhas-disciplinas" },
      { id: "btn-meus-grupos", text: "Meus Grupos", section: "meus-grupos" },
      { id: "btn-meus-projetos", text: "Meus Projetos", section: "meus-projetos" },
      { id: "btn-gerenciar-disciplinas", text: "Gerenciar Diciplinas", section: "gerenciar-disciplinas" },
    ],
  
    professor: [
      { id: "btn-meus-dados", text: "Meus Dados", section: "meus-dados" },
      { id: "btn-dashboard-professor", text: "Estatísticas do Semestre", section: "dashboard-professor" },
      { id: "btn-disciplinas-disponiveis", text: "Disciplinas Disponíveis", section: "disciplinas-disponiveis" }
    ],
    
    professor_orientador: [
      { id: "btn-meus-dados", text: "Meus Dados", section: "meus-dados" },
      { id: "btn-dashboard-orientador", text: "Painel de Orientações", section: "dashboard-orientador" },
      { id: "btn-disciplinas-disponiveis", text: "Disciplinas Disponíveis", section: "disciplinas-disponiveis" } 
    ],    
  
    coordenador: [
      { id: "btn-meus-dados", text: "Meus Dados", section: "meus-dados" },
      { id: "btn-dashboard-coordenador", text: "Indicadores do Semestre", section: "dashboard-coordenador" },
    ],
  
    administrador: [
      { id: "btn-meus-dados", text: "Meus Dados", section: "meus-dados" },
      { id: "btn-dashboard-admin", text: "Painel Administrativo", section: "dashboard-admin" },
    ],
  };
  
  // 2️⃣ Função auxiliar: obtém role logada
  function obterTipoUsuarioLogado() {
    const role = localStorage.getItem('userRole');
    const validRoles = ['aluno', 'professor', 'professor_orientador', 'coordenador', 'administrador'];
    if (!role || !validRoles.includes(role)) {
      console.warn(`Tipo de usuário inválido (${role}), usando padrão: aluno`);
      return 'aluno';
    }
    return role;
  }
  
  // 3️⃣ Renderiza os botões laterais dinamicamente
  function renderPerfilSidebar() {
    const sidebarNav = document.querySelector(".perfil-nav");
    if (!sidebarNav) {
      console.error("Elemento .perfil-nav não encontrado");
      return;
    }
  
    const role = obterTipoUsuarioLogado();
    const tabs = perfilTabsByRole[role] || [];
  
    sidebarNav.innerHTML = ""; // limpa sidebar
  
    tabs.forEach((tab, index) => {
      const btn = document.createElement("button");
      btn.className = "perfil-nav-item";
      if (index === 0) btn.classList.add("active");
      btn.id = tab.id;
      btn.dataset.section = tab.section;
  
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4"/>
        </svg>
        <span>${tab.text}</span>
      `;
  
      sidebarNav.appendChild(btn);
    });
  
    inicializarEventosDeNavegacao();
  }
  
  // 4️⃣ Troca de seção ao clicar nos botões
  function inicializarEventosDeNavegacao() {
    const navButtons = document.querySelectorAll(".perfil-nav-item");
    const sections = document.querySelectorAll(".perfil-section");
  
    navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        navButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
  
        const sectionId = `section-${btn.dataset.section}`;
        sections.forEach(sec => sec.classList.remove("active"));
        const targetSection = document.getElementById(sectionId);
        if (targetSection) targetSection.classList.add("active");
      });
    });
  }
  
  // 5️⃣ Inicializa ao carregar DOM
  document.addEventListener("DOMContentLoaded", () => {
    renderPerfilSidebar();
  });
  