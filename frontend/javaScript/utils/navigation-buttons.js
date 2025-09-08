const navigationButtonsByRole = {
    aluno: [
      
      {
        text: "Próximas Entregas",
        url: "/listaTarefas",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/>
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/>
              </svg>`
      },
      {
        text: "Avaliações",
        url: "/notas",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path d="M7.84 4.1a.178.178 0 0 1 .32 0l.634 1.285a.18.18 0 0 0 .134.098l1.42.206c.145.021.204.2.098.303L9.42 6.993a.18.18 0 0 0-.051.158l.242 1.414a.178.178 0 0 1-.258.187l-1.27-.668a.18.18 0 0 0-.165 0l-1.27.668a.178.178 0 0 1-.257-.187l.242-1.414a.18.18 0 0 0-.05-.158l-1.03-1.001a.178.178 0 0 1 .098-.303l1.42-.206a.18.18 0 0 0 .134-.098z"/>
                <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1z"/>
              </svg>`
      },
      {
        text: "Manual do Curso",
        url: "/uploads/manuais/Manual_de_Projetos_Interdisciplinares_para_o_CST_em_Desenvolvimento_de_Software Multiplataforma.pdf",
        target: "_blank",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M6 8V1h1v6.117L8.743 6.07a.5.5 0 0 1 .514 0L11 7.117V1h1v7a.5.5 0 0 1-.757.429L9 7.083 6.757 8.43A.5.5 0 0 1 6 8"/>
                <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2"/>
                <path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1z"/>
              </svg>`
      }
    ],
    
    professor: [
      {
        text: "Artefatos entregues",
        url: "/artefatosEntregues",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855a.75.75 0 0 0-.124 1.329l4.995 3.178 1.531 2.406a.5.5 0 0 0 .844-.536L6.637 10.07l7.494-7.494-1.895 4.738a.5.5 0 1 0 .928.372zm-2.54 1.183L5.93 9.363 1.591 6.602z"/>
                <path d="M16 12.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0m-1.993-1.679a.5.5 0 0 0-.686.172l-1.17 1.95-.547-.547a.5.5 0 0 0-.708.708l.774.773a.75.75 0 0 0 1.174-.144l1.335-2.226a.5.5 0 0 0-.172-.686"/>
              </svg>`
      },
      {
        text: "Criar Artefato",
        url: "/criar-atividade",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path d="M8 6.5a.5.5 0 0 1 .5.5v1.5H10a.5.5 0 0 1 0 1H8.5V11a.5.5 0 0 1-1 0V9.5H6a.5.5 0 0 1 0-1h1.5V7a.5.5 0 0 1 .5-.5"/>
                <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z"/>
              </svg>`
      },
      {
        text: "Pedidos de Reconsiderações",
        url: "/reconsideracoes",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" class="link-icon">
                '<path d="M15 4h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3"/>
                <path d="M9 7h6"/>
                <path d="m9 14 2 2 4-4"/>
                <path d="M10 3v3.5h4V3z"/>
              </svg>`
      }
    ],
    
    professor_orientador: [
      {
        text: "Artefatos entregues",
        url: "/artefatosEntregues",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855a.75.75 0 0 0-.124 1.329l4.995 3.178 1.531 2.406a.5.5 0 0 0 .844-.536L6.637 10.07l7.494-7.494-1.895 4.738a.5.5 0 1 0 .928.372zm-2.54 1.183L5.93 9.363 1.591 6.602z"/>
                <path d="M16 12.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0m-1.993-1.679a.5.5 0 0 0-.686.172l-1.17 1.95-.547-.547a.5.5 0 0 0-.708.708l.774.773a.75.75 0 0 0 1.174-.144l1.335-2.226a.5.5 0 0 0-.172-.686"/>
              </svg>`
      },
      {
        text: "Criar Projetos",
        url: "/projetos",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/>
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/>
              </svg>`
      },
      {
        text: "Gerenciar grupos",
        url: "/criar-grupos",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1zm-7.978-1L7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002-.014.002zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4m3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0M6.936 9.28a6 6 0 0 0-1.23-.247A7 7 0 0 0 5 9c-4 0-5 3-5 4q0 1 1 1h4.216A2.24 2.24 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816M4.92 10A5.5 5.5 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0m3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4"/>
              </svg>`
      },
      {
        text: "Criar Artefatos",
        url: "/criar-atividade",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path d="M8 6.5a.5.5 0 0 1 .5.5v1.5H10a.5.5 0 0 1 0 1H8.5V11a.5.5 0 0 1-1 0V9.5H6a.5.5 0 0 1 0-1h1.5V7a.5.5 0 0 1 .5-.5"/>
                <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z"/>
              </svg>`
      },
      {
        text: "Pedidos de Reconsiderações",
        url: "/reconsideracoes",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" class="link-icon">
                '<path d="M15 4h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3"/>
                <path d="M9 7h6"/>
                <path d="m9 14 2 2 4-4"/>
                <path d="M10 3v3.5h4V3z"/>
              </svg>`
      }
    ],
    coordenador: [
      {
        text: "Gerenciar usuários",
        url: "/gerenciar-usuarios",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                 <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
               </svg>`
      },
      {
        text: "Entregas dos grupos",
        url: "/listaProjetos",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                 <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM4 8l2 2 4-4-1-1-3 3-1-1-1 1z"/>
               </svg>`
      },
      {
        text: "Gerar relatórios",
        url: "listaGruposCoordenador",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                 <path d="M3 0a2 2 0 0 0-2 2v11.5A2.5 2.5 0 0 0 3.5 16H13a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H3zm10 2v12H3.5a.5.5 0 0 1-.5-.5V2h10z"/>
                 <path d="M5 4h6v1H5V4zm0 2h6v1H5V6zm0 2h6v1H5V8z"/>
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
    
   if (!userRole || !['aluno', 'professor', 'coordenador', 'professor_orientador'].includes(userRole)) {
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
    
    container.classList.remove('aluno', 'professor', 'coordenador','professor_orientador');
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
      buttonElement.textContent = button.text;
      
      buttonElement.insertAdjacentHTML('beforeend', ' ' + button.icon);
      
      link.appendChild(buttonElement);
      
      pageLinksDiv.appendChild(link);
    });
    
    container.appendChild(pageLinksDiv);
  }
  
  document.addEventListener('DOMContentLoaded', function() {
    renderNavigationButtons('navigation-container');
    
    function changeUserRole(role) {
      const container = document.getElementById('navigation-container');
      
      container.classList.remove('aluno', 'professor', 'coordenador','professor_orientador');
      
      container.classList.add(role);
      
      renderNavigationButtons('navigation-container');
    }
    
    window.changeUserRole = changeUserRole;
  });