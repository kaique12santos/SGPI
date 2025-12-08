import { confirmarAcao } from "../utils/confirmDialog.js";
async function realizarLogout(e) {
    e.preventDefault();
  
    const confirmar = await confirmarAcao(
      "Sair do sistema?",
      "Você realmente deseja encerrar sua sessão e sair?",
      "Sair",
      "Cancelar"
    );
  
    if (!confirmar) return;
  
    localStorage.removeItem('token');
    localStorage.removeItem('tipoUsuario');
    localStorage.removeItem('usuarioId');
    localStorage.removeItem('userRole');
  
    window.location.href = '/index';
}
  

function gerarMenu(tipoPerfil) {
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
        link.href = item.link || '#';
        link.textContent = item.texto;

        // --- ADICIONE ISTO AQUI ---
        if (item.target) {
            link.target = item.target;
            // Boa prática de segurança para links externos
            link.rel = "noopener noreferrer"; 
        }
        // --------------------------

        if (item.id) {
            link.id = item.id;
            if (item.id === 'logout-button') {
                link.addEventListener('click', realizarLogout);
            }
        }
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
        link.href = item.link || '#';
        link.textContent = item.texto;
        link.className = 'menu-desktop-item';

        // --- ADICIONE ISTO AQUI ---
        if (item.target) {
            link.target = item.target;
            // Boa prática de segurança para links externos
            link.rel = "noopener noreferrer";
        }
        // --------------------------

        if (item.id) {
            link.id = item.id;
            if (item.id === 'logout-button') {
                link.addEventListener('click', realizarLogout);
            }
        }
        menuDesktop.appendChild(link);
    });
}

function getItensMenu() {
    return {
    aluno: [

    { texto: 'Próximas entregas', link: '/listaTarefas' },
    { texto: 'Avaliações', link: '/notas' },
    { texto: 'Manual do Curso', link: 'https://drive.google.com/file/d/1xcY21Jn1IgjfqUWu3XM8JpxXLWKqcJC_/view?usp=sharing',target: '_blank' },
    {texto: 'Meu Perfil', link: '/perfil'},
    {texto: 'Sair', id:'logout-button'}
    ],
    professor_orientador: [
    { texto: 'Avaliar Entregas', link: '/artefatosEntregues' },
    { texto: 'Criar Projetos', link: '/projetos' },
    { texto: 'Criar Grupos', link: '/criar-grupos' },
    { texto: 'Pedidos de reconsiderações', link: '/reconsideracoes' },
    { texto: 'Criar Atividades', link: '/criar-atividade' },
    {texto: 'Meu Perfil', link: '/perfil'},
    {texto: 'Sair',id:'logout-button'}
    ],
    coordenador: [
    { texto: 'Gerar Relatorios', link: '/listaGruposCoordenador' },
    { texto: 'Monitoramento Geral', link: '/listaProjetos'},
    { texto: 'Controle de Chaves', link: '/palavraChave'},
    {texto: 'Painel de Matrículas', link: '/painel_controle_diciplinas'},
    {texto: 'Meu Perfil', link: '/perfil'},
    
    {texto: 'Sair', id:'logout-button'}
    ],
    professor: [
    { texto: 'Avaliar Entregas', link: '/artefatosEntregues' },
    { texto: 'Pedidos de reconsiderações', link: '/reconsideracoes' },
    { texto: 'Criar Atividade', link: '/criar-atividade' },
    {texto: 'Meu Perfil', link: '/perfil'},
    {texto: 'Sair', id:'logout-button'}
    ],
    administrador: [
        { texto: 'Gerenciar usuarios', link: '/gerenciar-usuarios' },
        { texto: 'Controle de Semestres', link: '/painelSemestre' },
        {texto: 'Meu Perfil', link: '/perfil'},
        {texto: 'Sair', id:'logout-button'}
    ]

    };
}

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