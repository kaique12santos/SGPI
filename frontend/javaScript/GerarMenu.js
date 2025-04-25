function gerarMenu(tipoPerfil) {

    const menuItens = document.getElementById('menu-itens');
    
    menuItens.innerHTML = '';
    
    const itensMenu = {
        aluno: [
            { texto: 'Artefatos entregues', link: '/aluno/artefatos' },
            { texto: 'Atividades pendentes', link: '/aluno/atividades' },
            { texto: 'Visualizar Notas', link: '/aluno/notas' },
            { texto: 'Manual do Curso', link: '/aluno/manual' }
        ],
        professor_orientador: [
            { texto: 'Artefatos entregues', link: '/professor_orientador/artefatos' },
            { texto: 'Atividades pendentes', link: '/professor_orientador/atividades' },
            { texto: 'Gerenciar grupo', link: '/professor_orientador/grupos' },
            { texto: 'Atividades Corrigidas', link: '/professor_orientador/corrigidas' },
            { texto: 'Criar Atividades', link: '/professor_orientador/atividades' }
            
        ],
        coordenador: [
            { texto: 'Gerenciar usuarios', link: '/coordenador/gerenciar-usuarios' },
            { texto: 'Relatórios de desempenho', link: '/coordenador/relatorios' },
            { texto: 'Visualizar entregas', link: '/coordenador/entregas'}
        ],
        professor: [
            { texto: 'Artefatos entregues', link: '/professor/artefatos' },
            { texto: 'Atividades pendentes', link: '/professor/atividades' },
            { texto: 'Atividades Corrigidas', link: '/professor/corrigidas' },
            { texto: 'Criar Atividades', link: '/professor/atividades' }
            
        ]
    };
    
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


document.addEventListener('DOMContentLoaded', function() {
    const perfilUsuario = localStorage.getItem('userRole') || 'aluno'; 
    gerarMenu(perfilUsuario);
});
