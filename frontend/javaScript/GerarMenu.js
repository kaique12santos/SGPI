function gerarMenu(tipoPerfil) {

    const menuItens = document.getElementById('menu-itens');
    
    menuItens.innerHTML = '';
    
    const itensMenu = {
        aluno: [
            { texto: 'Artefatos entregues', link: '/aluno/artefatos' },
            { texto: 'Artefatos pendentes', link: '/listaTarefas.html' },
            { texto: 'Visualizar Notas', link: '/notas.html' },
            { texto: 'Manual do Curso', link: '/uploads/manuais/Manual_de_Projetos_Interdisciplinares_para_o_CST_em_Desenvolvimento_de_Software Multiplataforma.pdf' }
        ],
        professor_orientador: [
            { texto: 'Artefatos entregues', link: '/artefatosEntregues.html' },
            { texto: 'Criar Projetos', link: '/projetos.html' },
            { texto: 'Gerenciar grupo', link: '/criar-grupos.html' },
            { texto: 'Pedidos de reconsiderações', link: '/reconsideracoes.html' },
            { texto: 'Criar Atividades', link: '/professor_orientador/criar-atividade' }
            
        ],
        coordenador: [
            { texto: 'Gerenciar usuarios', link: '/gerenciar-usuarios.html' },
            { texto: 'Relatórios de desempenho', link: '/coordenador/relatorios' },
            { texto: 'Visualizar entregas', link: '/coordenador/entregas'}
        ],
        professor: [
            { texto: 'Artefatos entregues', link: '/artefatosEntregues.html' },
            { texto: 'Artefatos pendentes', link: '/professor/atividades' },
            { texto: 'Pedidos de reconsiderações', link: '/reconsideracoes.html' },
            { texto: 'Criar Artefato', link: '/professor/criar-atividade' }
            
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
