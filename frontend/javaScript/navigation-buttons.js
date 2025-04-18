

//codigo para a geraçao dos buttons e links das funçoes na div container no body
//-----------------------------------------------------------------------------------------------------
// Definição de botões por tipo de perfil
const navigationButtonsByRole = {
    // Botões para alunos
    aluno: [
      {
        text: "Artefatos entregues",
        url: "/aluno/artefatos-entregues",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855a.75.75 0 0 0-.124 1.329l4.995 3.178 1.531 2.406a.5.5 0 0 0 .844-.536L6.637 10.07l7.494-7.494-1.895 4.738a.5.5 0 1 0 .928.372zm-2.54 1.183L5.93 9.363 1.591 6.602z"/>
                <path d="M16 12.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0m-1.993-1.679a.5.5 0 0 0-.686.172l-1.17 1.95-.547-.547a.5.5 0 0 0-.708.708l.774.773a.75.75 0 0 0 1.174-.144l1.335-2.226a.5.5 0 0 0-.172-.686"/>
              </svg>`
      },
      {
        text: "Atividades pendentes",
        url: "/aluno/atividades-pendentes",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/>
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/>
              </svg>`
      },
      {
        text: "Visualizar matérias",
        url: "/aluno/visualizar-materias",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783"/>
              </svg>`
      },
      {
        text: "Manual do Curso",
        url: "/aluno/manual",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M6 8V1h1v6.117L8.743 6.07a.5.5 0 0 1 .514 0L11 7.117V1h1v7a.5.5 0 0 1-.757.429L9 7.083 6.757 8.43A.5.5 0 0 1 6 8"/>
                <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2"/>
                <path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1z"/>
              </svg>`
      }
    ],
    
    // Botões para professores
    professor: [
      {
        text: "Artefatos entregues",
        url: "/professor/artefatos-entregues",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855a.75.75 0 0 0-.124 1.329l4.995 3.178 1.531 2.406a.5.5 0 0 0 .844-.536L6.637 10.07l7.494-7.494-1.895 4.738a.5.5 0 1 0 .928.372zm-2.54 1.183L5.93 9.363 1.591 6.602z"/>
                <path d="M16 12.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0m-1.993-1.679a.5.5 0 0 0-.686.172l-1.17 1.95-.547-.547a.5.5 0 0 0-.708.708l.774.773a.75.75 0 0 0 1.174-.144l1.335-2.226a.5.5 0 0 0-.172-.686"/>
              </svg>`
      },
      {
        text: "Atividades pendentes",
        url: "/professor/atividades-pendentes",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/>
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/>
              </svg>`
      },
      {
        text: "Criar atividade",
        url: "/professor/criar-atividade",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path d="M8 6.5a.5.5 0 0 1 .5.5v1.5H10a.5.5 0 0 1 0 1H8.5V11a.5.5 0 0 1-1 0V9.5H6a.5.5 0 0 1 0-1h1.5V7a.5.5 0 0 1 .5-.5"/>
                <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z"/>
              </svg>`
      },
      {
        text: "Atividades corrigidas",
        url: "/professor/atividades-corrigidas",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                <path d="m10.97 4.97-.02.022-3.473 4.425-2.093-2.094a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05"/>
              </svg>`
      }
    ],
    
    // Botões para coordenadores
    professor_orientador: [
      {
        text: "Artefatos entregues",
        url: "/professor_orientador/artefatos-entregues",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855a.75.75 0 0 0-.124 1.329l4.995 3.178 1.531 2.406a.5.5 0 0 0 .844-.536L6.637 10.07l7.494-7.494-1.895 4.738a.5.5 0 1 0 .928.372zm-2.54 1.183L5.93 9.363 1.591 6.602z"/>
                <path d="M16 12.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0m-1.993-1.679a.5.5 0 0 0-.686.172l-1.17 1.95-.547-.547a.5.5 0 0 0-.708.708l.774.773a.75.75 0 0 0 1.174-.144l1.335-2.226a.5.5 0 0 0-.172-.686"/>
              </svg>`
      },
      {
        text: "Atividades pendentes",
        url: "/professor_orientador/atividades-pendentes",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/>
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/>
              </svg>`
      },
      {
        text: "Gerenciar grupos",
        url: "/professor_orientador/gerenciar-grupos",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1zm-7.978-1L7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002-.014.002zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4m3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0M6.936 9.28a6 6 0 0 0-1.23-.247A7 7 0 0 0 5 9c-4 0-5 3-5 4q0 1 1 1h4.216A2.24 2.24 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816M4.92 10A5.5 5.5 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0m3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4"/>
              </svg>`
      },
      {
        text: "Criar atividade",
        url: "/professor_orientador/criar-atividade",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path d="M8 6.5a.5.5 0 0 1 .5.5v1.5H10a.5.5 0 0 1 0 1H8.5V11a.5.5 0 0 1-1 0V9.5H6a.5.5 0 0 1 0-1h1.5V7a.5.5 0 0 1 .5-.5"/>
                <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z"/>
              </svg>`
      },
      {
        text: "Atividades corrigidas",
        url: "/professor_orientador/atividades-corrigidas",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                <path d="m10.97 4.97-.02.022-3.473 4.425-2.093-2.094a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05"/>
              </svg>`
      }
    ],
    coordenador: [
      {
        text: "Gerenciar usuários",
        url: "/coordenador/gerenciar-usuarios",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                 <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
               </svg>`
      },
      {
        text: "Entregas dos grupos",
        url: "/coordenador/entregas-grupos",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                 <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM4 8l2 2 4-4-1-1-3 3-1-1-1 1z"/>
               </svg>`
      },
      {
        text: "Gerar relatórios",
        url: "/coordenador/relatorios",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="link-icon" viewBox="0 0 16 16">
                 <path d="M3 0a2 2 0 0 0-2 2v11.5A2.5 2.5 0 0 0 3.5 16H13a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H3zm10 2v12H3.5a.5.5 0 0 1-.5-.5V2h10z"/>
                 <path d="M5 4h6v1H5V4zm0 2h6v1H5V6zm0 2h6v1H5V8z"/>
               </svg>`
      }
    ]
  };

  // Função para alternar a visibilidade do menu dropdown
function toggleMenu(button) {
    const menuContent = document.getElementById('menu-itens');
    const expanded = button.getAttribute('aria-expanded') === 'true';
    
    button.setAttribute('aria-expanded', !expanded);
    menuContent.style.display = expanded ? 'none' : 'block';
  }
  
  // Função para obter o tipo de usuário atual
  function obterTipoUsuarioLogado() {
   // Obtém o tipo de usuário do localStorage
   const userRole = localStorage.getItem('userRole');
    
   // Se não encontrar um tipo válido, use um valor padrão
   if (!userRole || !['aluno', 'professor', 'coordenador', 'professor_orientador'].includes(userRole)) {
    console.warn('Tipo de usuário não encontrado ou inválido. Usando padrão: aluno');
    return 'aluno';
  }
   
   return userRole;
  }
  
  // Função para renderizar os links no menu dropdown com base no tipo de usuário
  // function renderizarMenuDropdown() {
  //   const menuContent = document.getElementById('menu-itens');
    
  //   if (!menuContent) {
  //     console.error("Elemento 'menu-itens' não encontrado");
  //     return;
  //   }
    
  //   // Limpa o conteúdo atual do menu
  //   menuContent.innerHTML = '';
    
  //   // Obtém o tipo de usuário logado
  //   const tipoUsuario = obterTipoUsuarioLogado();
    
  //   // Obtém os links específicos para o tipo de usuário
  //   const linksUsuario = navigationButtonsByRole[tipoUsuario] || [];
    
  //   // Adiciona cada link ao menu
  //   linksUsuario.forEach(item => {
  //     const link = document.createElement('a');
  //     link.href = item.url;
      
  //     // Opção 1: Apenas o texto do link
  //     // link.textContent = item.text;
      
  //     // Opção 2: Incluir o ícone junto com o texto
  //     const spanText = document.createElement('span');
  //     spanText.textContent = item.text;
      
  //     link.insertAdjacentHTML('afterbegin', item.icon);
  //     link.appendChild(spanText);
      
  //     // Estilização opcional para alinhar o ícone e o texto
  //     link.style.display = 'flex';
  //     link.style.alignItems = 'center';
  //     link.style.gap = '8px';
      
  //     menuContent.appendChild(link);
  //   });
  // }
  
  // Função para trocar o tipo de usuário (útil para testes)
  function trocarTipoUsuario(tipo) {
    if (['aluno', 'professor', 'coordenador','professor_orientador'].includes(tipo)) {
      localStorage.setItem('userRole', tipo);
      renderizarMenuDropdown();
    } else {
      console.error('Tipo de usuário inválido:', tipo);
    }
  }
  
  // Função para renderizar os botões com base no perfil
  function renderNavigationButtons(containerId) {
    const container = document.getElementById(containerId);
    
    if (!container) {
      console.error(`Container com ID '${containerId}' não encontrado.`);
      return;
    }
    
    // Determina o perfil do usuário a partir da classe do container
    const userRole = obterTipoUsuarioLogado(); // Perfil padrão caso nenhum seja especificado
    
    container.classList.remove('aluno', 'professor', 'coordenador','professor_orientador');
    container.classList.add(userRole);
    
    // Obtém os botões específicos para o perfil do usuário
    const buttonsForRole = navigationButtonsByRole[userRole] || [];
    
    // Limpa o conteúdo atual do container
    container.innerHTML = '';
    
    // Cria um div para os botões de navegação
    const pageLinksDiv = document.createElement('div');
    pageLinksDiv.className = 'page-links';
    
    // Adiciona cada botão ao div
    buttonsForRole.forEach(button => {
      // Cria o elemento <a>
      const link = document.createElement('a');
      link.href = button.url;
      
      // Cria o elemento <button>
      const buttonElement = document.createElement('button');
      buttonElement.className = 'button-link';
      buttonElement.textContent = button.text;
      
      // Adiciona o ícone SVG
      buttonElement.insertAdjacentHTML('beforeend', ' ' + button.icon);
      
      // Adiciona o botão ao link
      link.appendChild(buttonElement);
      
      // Adiciona o link ao div de links
      pageLinksDiv.appendChild(link);
    });
    
    // Adiciona o div de links ao container
    container.appendChild(pageLinksDiv);
  }
  
  // Exemplo de uso no carregamento da página
  document.addEventListener('DOMContentLoaded', function() {
    renderNavigationButtons('navigation-container');
    
    // Adicional: Exemplo de como mudar o perfil dinamicamente
    function changeUserRole(role) {
      const container = document.getElementById('navigation-container');
      
      // Remove classes de perfil existentes
      container.classList.remove('aluno', 'professor', 'coordenador','professor_orientador');
      
      // Adiciona a nova classe de perfil
      container.classList.add(role);
      
      // Atualiza os botões
      renderNavigationButtons('navigation-container');
    }
    
    // Torna a função disponível globalmente (opcional)
    window.changeUserRole = changeUserRole;
  });