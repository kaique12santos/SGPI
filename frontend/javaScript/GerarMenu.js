//codigo das funçoes no menu-dropdown
//-------------------------------------------------------------------------------------------------------
// Função para gerar o menu baseado no tipo de perfil
function gerarMenu(tipoPerfil) {
    // Elemento do menu
    const menuItens = document.getElementById('menu-itens');
    
    // Limpar conteúdo atual do menu
    menuItens.innerHTML = '';
    
    // Estrutura de itens de menu por tipo de perfil
    const itensMenu = {
        aluno: [
            { texto: 'Artefatos entregues', link: '/aluno/artefatos' },
            { texto: 'Atividades pendentes', link: '/aluno/atividades' },
            { texto: 'Visualizar matérias', link: '/aluno/materias' }
        ],
        professor: [
            { texto: 'Artefatos entregues', link: '/professor/artefatos' },
            { texto: 'Atividades pendentes', link: '/professor/atividades' },
            { texto: 'Gerenciar grupo', link: '/professor/grupos' },
            { texto: 'Visualizar matérias', link: '/professor/materias' }
        ],
        coordenador: [
            { texto: 'Artefatos entregues', link: '/coordenador/artefatos' },
            { texto: 'Atividades pendentes', link: '/coordenador/atividades' },
            { texto: 'Gerenciar grupo', link: '/coordenador/grupos' },
            { texto: 'Gerenciar professores', link: '/coordenador/professores' },
            { texto: 'Visualizar matérias', link: '/coordenador/materias' },
            { texto: 'Relatórios de desempenho', link: '/coordenador/relatorios' }
        ]
    };
    
    // Verificar se o tipo de perfil é válido
    if (!itensMenu[tipoPerfil]) {
        console.error('Tipo de perfil inválido:', tipoPerfil);
        return;
    }
    
    // Criar e adicionar os itens do menu
    itensMenu[tipoPerfil].forEach(item => {
        const link = document.createElement('a');
        link.href = item.link;
        link.textContent = item.texto;
        menuItens.appendChild(link);
    });
}

// Exemplo de uso:
// Supondo que temos uma variável "perfilUsuario" que contém o tipo de perfil atual
// Esta informação normalmente viria de uma sessão do usuário ou de um sistema de autenticação
let perfilUsuario = 'coordenador'; // Pode ser 'aluno', 'professor' ou 'coordenador'

// Executar a função quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    gerarMenu(perfilUsuario);
});

// Para testar diferentes perfis
function mudarPerfil(novoPerfil) {
    perfilUsuario = novoPerfil;
    gerarMenu(perfilUsuario);
}