const navigationButtonsByRole = {
  aluno: [
    {
      text: "Próximas Entregas",
      url: "/listaTarefas",
      icon: `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" 
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" 
        stroke-linejoin="round" class="link-icon" viewBox="0 0 24 24">
          <path d="M8 2v4m8-4v4m-9 8 2.5 2.5L17 9"/>
          <rect x="3" y="4" width="18" height="18" rx="2"/>
        </svg>`
    },
    {
      text: "Avaliações",
      url: "/notas",
      icon: `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" 
        stroke-linejoin="round" class="link-icon" viewBox="0 0 24 24">
          <path d="m12 8 1.76 3.57L18 12l-3 2.5.9 4.5L12 16l-3.9 3 1-4.5L6 12l4.24-.43z"/>
        </svg>`
    },
    {
      text: "Manual do Curso",
      url: "/uploads/manuais/Manual_de_Projetos_Interdisciplinares_para_o_CST_em_Desenvolvimento_de_Software Multiplataforma.pdf",
      target: "_blank",
      icon: `
        
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="link-icon" viewBox="0 0 18 18"> <path fill-rule="evenodd" d="M6 8V1h1v6.117L8.743 6.07a.5.5 0 0 1 .514 0L11 7.117V1h1v7a.5.5 0 0 1-.757.429L9 7.083 6.757 8.43A.5.5 0 0 1 6 8"/> <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2"/> <path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1z"/> </svg>
        `
    }
  ],

  professor: [
    {
      text: "Avaliar Entregas",
      url: "/artefatosEntregues",
      icon: `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" 
        stroke-linejoin="round" class="link-icon" viewBox="0 0 24 24">
          <path d="M9 11l2 2 4-4"/>
          <rect x="4" y="3" width="16" height="18" rx="2"/>
          <path d="M9 3h6v4H9z"/>
        </svg>`
    },
    {
      text: "Criar Atividade",
      url: "/criar-atividade",
      icon: `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" 
        stroke-linejoin="round" class="link-icon" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 8v8m-4-4h8"/>
        </svg>`
    },
    {
      text: "Pedidos de Reconsiderações",
      url: "/reconsideracoes",
      icon: `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" 
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" 
        stroke-linejoin="round" class="link-icon" viewBox="0 0 24 24">
          <path d="M22 12h-6l-2 3h-4l-2-3H2"/>
          <path d="M5 12V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"/>
          <path d="M12 15v4"/>
          <circle cx="12" cy="20" r="1"/>
        </svg>`
    }
  ],

  professor_orientador: [
    {
      text: "Avaliar Entregas",
      url: "/artefatosEntregues",
      icon: `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" 
        stroke-linejoin="round" class="link-icon" viewBox="0 0 24 24">
          <path d="M9 11l2 2 4-4"/>
          <rect x="4" y="3" width="16" height="18" rx="2"/>
          <path d="M9 3h6v4H9z"/>
        </svg>`
    },
    {
      text: "Criar Projetos",
      url: "/projetos",
      icon: `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" 
        stroke-linejoin="round" class="link-icon" viewBox="0 0 24 24">
          <path d="M3 6h18v14H3z"/>
          <path d="M3 6l4-3h5l3 3"/>
          <path d="M12 10v6m-3-3h6"/>
        </svg>`
    },
    {
      text: "Criar Grupos",
      url: "/criar-grupos",
      icon: `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" 
        stroke-linejoin="round" class="link-icon" viewBox="0 0 24 24">
          <circle cx="8" cy="9" r="3"/>
          <circle cx="16" cy="9" r="3"/>
          <path d="M2 21c0-4 3-6 6-6s6 2 6 6"/>
          <path d="M12 21c0-4 3-6 6-6s6 2 6 6"/>
        </svg>`
    },
    {
      text: "Criar Atividades",
      url: "/criar-atividade",
      icon: `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" 
        stroke-linejoin="round" class="link-icon" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 8v8m-4-4h8"/>
        </svg>`
    },
    {
      text: "Pedidos de Reconsiderações",
      url: "/reconsideracoes",
      icon: `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" 
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" 
        stroke-linejoin="round" class="link-icon" viewBox="0 0 24 24">
          <path d="M22 12h-6l-2 3h-4l-2-3H2"/>
          <path d="M5 12V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"/>
          <path d="M12 15v4"/>
          <circle cx="12" cy="20" r="1"/>
        </svg>`
    }
  ],

  coordenador: [
    {
      text: "Monitoramento Geral",
      url: "/listaProjetos",
      icon: `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" 
        stroke-linejoin="round" class="link-icon" viewBox="0 0 24 24">
          <path d="M4 12h4l2 6 4-12 2 6h4"/>
        </svg>`
    },
    {
      text: "Gerar relatórios",
      url: "listaGruposCoordenador",
      icon: `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" 
        stroke-linejoin="round" class="link-icon" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6"/>
          <path d="M9 17v-3m4 3v-5m4 5v-2"/>
        </svg>`
    },
    {
      text: "Painel Matrículas",
      url: "painel_controle_diciplinas",
      icon: `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
        stroke-linejoin="round" class="link-icon" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.8 1.8 0 0 0 .3 2l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.8 1.8 0 0 0-2-.3 1.8 1.8 0 0 0-1 1.6V22a2 2 0 0 1-4 0v-.2a1.8 1.8 0 0 0-1-1.6 1.8 1.8 0 0 0-2 .3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.8 1.8 0 0 0 .3-2 1.8 1.8 0 0 0-1.6-1H2a2 2 0 0 1 0-4h.2a1.8 1.8 0 0 0 1.6-1 1.8 1.8 0 0 0-.3-2l-.1-.1A2 2 0 1 1 6.2 3.7l.1.1a1.8 1.8 0 0 0 2 .3h.1A1.8 1.8 0 0 0 10 2.4V2a2 2 0 0 1 4 0v.2a1.8 1.8 0 0 0 1 1.6h.1a1.8 1.8 0 0 0 2-.3l.1-.1A2 2 0 0 1 20.4 7l-.1.1a1.8 1.8 0 0 0-.3 2v.1a1.8 1.8 0 0 0 1.6 1H22a2 2 0 0 1 0 4h-.2a1.8 1.8 0 0 0-1.6 1z"/>
        </svg>`
    },
    {
      text: "Controle de Chaves",
      url: "palavraChave",
      icon: `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" 
        stroke-linejoin="round" class="link-icon" viewBox="0 0 24 24">
          <circle cx="7.5" cy="15.5" r="3.5"/>
          <path d="M10 13l10-10 2 2-3 3 2 2-3 3"/>
        </svg>`
    }
  ],

  administrador: [
    {
      text: "Gerenciar usuários",
      url: "/gerenciar-usuarios",
      icon: `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
        stroke-linejoin="round" class="link-icon" viewBox="0 0 24 24">
          <circle cx="9" cy="7" r="4"/>
          <path d="M2 22c0-4 3-7 7-7"/>
          <circle cx="18" cy="11" r="3"/>
          <path d="M18 22v-2m0-4v-2m2 2h-4"/>
        </svg>`
    },
    {
      text: "Controle de Semestres",
      url: "/painelSemestre",
      icon: `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
        stroke-linejoin="round" class="link-icon" viewBox="0 0 24 24">
          <path d="M8 2v4m8-4v4"/>
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <circle cx="12" cy="14" r="2"/>
          <path d="M12 12v4m-2-2h4"/>
        </svg>`
    }
  ]
};


  function toggleMenu(button) {
    const menuContent = document.getElementById('menu-itens');
    const expanded = button.getAttribute('aria-expanded') === 'true';
    
    button.setAttribute('aria-expanded', !expanded);
    menuContent.style.display = expanded ? 'none' : 'block';
  }
  
  function obterTipoUsuarioLogado() {
   const userRole = localStorage.getItem('userRole');
    
   if (!userRole || !['aluno', 'professor', 'coordenador', 'professor_orientador','administrador'].includes(userRole)) {
    console.warn('Tipo de usuário não encontrado ou inválido. Usando padrão: aluno');
    return 'aluno';
  }
   return userRole;
  }
  
  
  function renderNavigationButtons(containerId) {
    const container = document.getElementById(containerId);
    
    if (!container) {
    console.error(`Container com ID '${containerId}' não encontrado.`);
    return;
    }
    
    const userRole = obterTipoUsuarioLogado(); 
    
    container.classList.remove('aluno', 'professor', 'coordenador','professor_orientador','administrador');
    container.classList.add(userRole);
    
    const buttonsForRole = navigationButtonsByRole[userRole] || [];
    
    container.innerHTML = '';
    
    const pageLinksDiv = document.createElement('div');
    pageLinksDiv.className = 'page-links';
    
    buttonsForRole.forEach(button => {
    const link = document.createElement('a');
    link.href = button.url;
    if (button.target) {
    link.target = button.target;
    }
    
    const buttonElement = document.createElement('button');
    buttonElement.className = 'button-link';
    
    // Criar div para o ícone
    const iconDiv = document.createElement('div');
    iconDiv.className = 'button-icon';
    iconDiv.innerHTML = button.icon;
    
    // Criar span para o texto
    const textSpan = document.createElement('span');
    textSpan.className = 'button-text';
    textSpan.textContent = button.text;
    
    // Adicionar ícone e texto ao botão
    buttonElement.appendChild(iconDiv);
    buttonElement.appendChild(textSpan);
    
    link.appendChild(buttonElement);
    
    pageLinksDiv.appendChild(link);
    });
    
    container.appendChild(pageLinksDiv);
  }
  
  document.addEventListener('DOMContentLoaded', function() {
    renderNavigationButtons('navigation-container');
    
    function changeUserRole(role) {
    const container = document.getElementById('navigation-container');
    
    container.classList.remove('aluno', 'professor', 'coordenador','professor_orientador','administrador');
    
    container.classList.add(role);
    
    renderNavigationButtons('navigation-container');
    }
    
    window.changeUserRole = changeUserRole;
  });