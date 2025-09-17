function gerarMenu(tipoPerfil) {
    // Gera menu para ambas as versões
    gerarMenuMobile(tipoPerfil);
    gerarMenuDesktop(tipoPerfil);
}

function gerarMenuMobile(tipoPerfil) {
    const menuItens = document.getElementById('menu-itens');
    if (!menuItens) return;
    
    menuItens.innerHTML = '';
    
    const itensMenu = getItensMenu();
    
    if (!itensMenu[tipoPerfil]) {
        console.error('Tipo de perfil inválido:', tipoPerfil);
        return;
    }
    
    itensMenu[tipoPerfil].forEach(item => {
        const link = document.createElement('a');
        link.href = item.link;
        link.textContent = item.texto;
        menuItens.appendChild(link);
    });
}

function gerarMenuDesktop(tipoPerfil) {
    const menuDesktop = document.getElementById('menu-desktop');
    if (!menuDesktop) return;
    
    menuDesktop.innerHTML = '';
    
    const itensMenu = getItensMenu();
    
    if (!itensMenu[tipoPerfil]) {
        console.error('Tipo de perfil inválido:', tipoPerfil);
        return;
    }
    
    itensMenu[tipoPerfil].forEach(item => {
        const link = document.createElement('a');
        link.href = item.link;
        link.textContent = item.texto;
        link.className = 'menu-desktop-item';
        menuDesktop.appendChild(link);
    });
}

function getItensMenu() {
    return {
        aluno: [
            
            { texto: 'Artefatos pendentes', link: '/listaTarefas' },
            { texto: 'Visualizar Notas', link: '/notas' },
            { texto: 'Manual do Curso', link: '/uploads/manuais/Manual_de_Projetos_Interdisciplinares_para_o_CST_em_Desenvolvimento_de_Software Multiplataforma.pdf' }
        ],
        professor_orientador: [
            { texto: 'Artefatos entregues', link: '/artefatosEntregues' },
            { texto: 'Criar Projetos', link: '/projetos' },
            { texto: 'Gerenciar grupo', link: '/criar-grupos' },
            { texto: 'Pedidos de reconsiderações', link: '/reconsideracoes' },
            { texto: 'Criar Atividades', link: '/criar-atividade' }
        ],
        coordenador: [
            { texto: 'Gerenciar usuarios', link: '/gerenciar-usuarios' },
            { texto: 'Gerar Relatorios', link: '/listaGruposCoordenador' },
            { texto: 'Visualizar entregas', link: '/listaProjeto'}
        ],
        professor: [
            { texto: 'Artefatos entregues', link: '/artefatosEntregues' },
            { texto: 'Artefatos pendentes', link: '/professor/atividades' },
            { texto: 'Pedidos de reconsiderações', link: '/reconsideracoes' },
            { texto: 'Criar Artefato', link: '/criar-atividade' }
        ]
    };
}

// Função para toggle do menu mobile (mantém a existente)
function toggleMenu(button) {
    const menuContent = button.nextElementSibling;
    menuContent.classList.toggle('show');
    
    const isExpanded = menuContent.classList.contains('show');
    button.setAttribute('aria-expanded', isExpanded);
}

document.addEventListener('DOMContentLoaded', function() {
    const perfilUsuario = localStorage.getItem('userRole') || 'aluno'; 
    gerarMenu(perfilUsuario);
});