import { ativar } from "./alerts.js";

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar o gerenciamento de grupos
    inicializarGerenciamentoGrupos();
    
    // Configurar o form de criação de grupos
    const formGrupo = document.getElementById('formGrupo');
    if (formGrupo) {
        formGrupo.addEventListener('submit', criarNovoGrupo);
    }
});

function inicializarGerenciamentoGrupos() {
    // Criar container para listar grupos existentes
    const containerGrupo = document.querySelector('.container-grupo');
    
    if (!containerGrupo) return;
    
    // Criar seção para listar grupos
    const listagemSection = document.createElement('div');
    listagemSection.className = 'grupos-existentes';
    listagemSection.innerHTML = '<h3>Grupos Existentes</h3>';
    
    // Adicionar após o formulário
    containerGrupo.insertAdjacentElement('afterend', listagemSection);
    
    // Carregar a lista de grupos
    carregarGrupos();
}

async function carregarGrupos() {
    try {
        const response = await fetch('/grupos');
        
        if (!response.ok) {
            throw new Error(`Erro ao carregar grupos: ${response.status}`);
        }
        
        const grupos = await response.json();
        renderizarGrupos(grupos);
    } catch (error) {
        console.error('Falha ao carregar grupos:', error);
        ativar('Não foi possível carregar a lista de grupos.', 'erro', '');
    }
}

function renderizarGrupos(grupos) {
    const container = document.querySelector('.grupos-existentes');
    
    if (!container) return;
    
    // Limpar conteúdo existente
    const titulo = container.querySelector('h3');
    container.innerHTML = '';
    container.appendChild(titulo);
    
    if (grupos.length === 0) {
        const mensagem = document.createElement('p');
        mensagem.textContent = 'Nenhum grupo encontrado.';
        container.appendChild(mensagem);
        return;
    }
    
    // Criar cards para cada grupo
    grupos.forEach(grupo => {
        const card = criarCardGrupo(grupo);
        container.appendChild(card);
    });
}

function criarCardGrupo({ id, nome, descricao, semestre }) {
    const card = document.createElement('div');
    card.className = 'grupo-card';
    card.dataset.grupoId = id;
    
    card.innerHTML = `
        <strong>${nome}</strong>
        <p>Semestre: ${semestre}</p>
    `;
    
    // Botão Ver Detalhes
    const btnVerDetalhes = document.createElement('button');
    btnVerDetalhes.className = 'btn-Ver btn';
    btnVerDetalhes.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
        Ver
    `;
    btnVerDetalhes.onclick = () => exibirDetalhesGrupo(id);
    
    // Botão Editar
    const btnEditar = document.createElement('button');
    btnEditar.className = 'btn-alterar btn';
    btnEditar.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        Alterar
    `;
    btnEditar.onclick = () => abrirModalEdicao({ id, nome, descricao, semestre });

    const btnExcluir = document.createElement('button');
    btnExcluir.className = 'btn-excluir btn';
    btnExcluir.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                <path d="M10 11v6"></path>
                <path d="M14 11v6"></path>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
            </svg>
            Excluir
            `;

    btnExcluir.onclick = () => confirmarExclusaoGrupo(id, nome);

    card.appendChild(btnVerDetalhes);
    card.appendChild(btnEditar);
    card.appendChild(btnExcluir);
    
    return card;
}

async function exibirDetalhesGrupo(grupoId) {
    try {
        // Buscar informações detalhadas do grupo
        const response = await fetch(`/grupos/${grupoId}`);
        
        if (!response.ok) {
            throw new Error(`Erro ao carregar detalhes do grupo: ${response.status}`);
        }
        
        const grupo = await response.json();
        
        // Buscar membros do grupo
        const membrosResponse = await fetch(`/grupos/${grupoId}/membros`);
        const membros = await membrosResponse.json();
        
        // Criar overlay e modal
        const overlay = document.createElement('div');
        overlay.className = 'div-zindex';
        
        const modal = document.createElement('div');
        modal.className = 'div-mostrar';
        
        // Formatar lista de membros
        let membrosHTML = '<p><strong>Membros:</strong></p><ul>';
        if (membros && membros.length > 0) {
            membros.forEach(membro => {
                membrosHTML += `<li>${membro.nome} (${membro.papel})</li>`;
            });
        } else {
            membrosHTML += '<li>Nenhum membro cadastrado</li>';
        }
        membrosHTML += '</ul>';
        
        modal.innerHTML = `
            <h2>${grupo.nome}</h2>
            <p><strong>Descrição:</strong> ${grupo.descricao || 'Sem descrição'}</p>
            <p><strong>Semestre:</strong> ${grupo.semestre}º Semestre</p>
            <p><strong>Data de Criação:</strong> ${formatarData(grupo.data_criacao)}</p>
            ${membrosHTML}
            <button id="fecharModal" class='send-button' style="margin-top: 1rem;">Fechar</button>
        `;
        
        // Evento para fechar o modal
        modal.querySelector('#fecharModal').onclick = () => {
            document.body.removeChild(overlay);
        };
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
    } catch (error) {
        console.error('Erro ao exibir detalhes do grupo:', error);
        ativar('Não foi possível carregar os detalhes do grupo.', 'erro', '');
    }
}

async function abrirModalEdicao({ id, nome, descricao, semestre }) {
    const overlay = document.createElement('div');
    overlay.className = 'div-zindex';

    const modal = document.createElement('div');
    modal.className = 'div-mostrar form-task';

    modal.innerHTML = `
        <form id="editar-grupo">
            <h2>Editar Grupo</h2>

            <label for="edit-nome" class="label-form">Nome do Grupo:</label>
            <input type="text" id="edit-nome" class="input-form" value="${nome}" required>

            <label for="edit-tema" class="label-form">Tema/Descrição:</label>
            <textarea id="edit-tema" class="textarea-form" required>${descricao || ''}</textarea>

            <label for="edit-semestre" class="label-form">Semestre:</label>
            <select id="edit-semestre" class="select-form" required>
                <option value="0">Selecione</option>
                ${[1,2,3,4,5,6].map(n => `<option value="${n}" ${semestre === String(n) ? 'selected' : ''}>${n}º Semestre</option>`).join('')}
            </select>

            <label for="alunos" class="label-form">Alunos (selecione múltiplos):</label>
            <select id="alunos" name="alunos" class="select-form" multiple required>
                <option disabled>Selecione um semestre primeiro</option>
            </select>

            <div class="btn-group">
                <button type="submit" class="send-button">Salvar</button>
                <button type="button" id="cancelar-edicao" class="btn-excluir">Cancelar</button>
            </div>
        </form>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const semestreSelect = modal.querySelector('#edit-semestre');
    const alunosSelect = modal.querySelector('#alunos');

    let membroAtuais = [];
    try {
        const membrosResponse = await fetch(`/grupos/${id}/membros`);
        membroAtuais = await membrosResponse.json();
    } catch (error) {
        console.error('Erro ao buscar membros do grupo:', error);
    }

    if (semestre && semestre !== '0') {
        await listarAlunosPorSemestre(alunosSelect, semestre, membroAtuais);
    }

    semestreSelect.addEventListener('change', () => {
        const semestreSelecionado = semestreSelect.value;
        if (semestreSelecionado !== "0") {
            listarAlunosPorSemestre(alunosSelect, semestreSelecionado, membroAtuais);
        } else {
            alunosSelect.innerHTML = '<option disabled>Selecione um semestre primeiro</option>';
        }
    });

    modal.querySelector('#cancelar-edicao').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });

    modal.querySelector('#editar-grupo').addEventListener('submit', async (e) => {
        e.preventDefault();

        const alunosSelecionados = Array.from(alunosSelect.selectedOptions).map(option => option.value);

        const dadosAtualizados = {
            nome: modal.querySelector('#edit-nome').value,
            descricao: modal.querySelector('#edit-tema').value,
            semestre: semestreSelect.value,
            alunos: alunosSelecionados
        };

        try {
            const response = await fetch(`/grupos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosAtualizados)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao atualizar grupo');
            }

            const data = await response.json();
            document.body.removeChild(overlay);
            ativar(data.message || 'Grupo atualizado com sucesso!', 'sucesso', '');
            carregarGrupos();

        } catch (error) {
            console.error('Erro:', error);
            ativar(`Falha ao atualizar grupo: ${error.message}`, 'erro', '');
        }
    });
}

async function carregarAlunosPorSemestre(semestre) {
    try {
        const response = await fetch(`/alunos/semestre/${semestre}`);
        if (!response.ok) throw new Error('Erro ao buscar alunos');
        
        const alunos = await response.json();
        const selectAlunos = document.getElementById('alunos');

        // Limpar opções atuais
        selectAlunos.innerHTML = '';

        if (alunos.length === 0) {
            const opt = document.createElement('option');
            opt.textContent = 'Nenhum aluno encontrado';
            opt.disabled = true;
            selectAlunos.appendChild(opt);
            return;
        }

        alunos.forEach(aluno => {
            const option = document.createElement('option');
            option.value = aluno.ID; // ID do aluno
            option.textContent = aluno.NOME;
            selectAlunos.appendChild(option);
        });

        
    } catch (error) {
        console.error('Erro ao carregar alunos:', error);
    }
}

async function listarAlunosPorSemestre(selectAlvo, semestre, membrosAtuais = []) {
    try {
        const response = await fetch(`/alunos/semestre/${semestre}`);
        if (!response.ok) throw new Error('Erro ao buscar alunos');

        const alunos = await response.json();
        selectAlvo.innerHTML = '';

        if (alunos.length === 0) {
            const opt = document.createElement('option');
            opt.textContent = 'Nenhum aluno encontrado';
            opt.disabled = true;
            selectAlvo.appendChild(opt);
            return;
        }

        alunos.forEach(aluno => {
            const option = document.createElement('option');
            option.value = aluno.ID;
            option.textContent = aluno.NOME;
            selectAlvo.appendChild(option);
        });

        membrosAtuais.forEach(membro => {
            const jaExiste = Array.from(selectAlvo.options).some(opt => opt.value == membro.id);
            if (!jaExiste) {
                const opt = document.createElement('option');
                opt.value = membro.id;
                opt.textContent = membro.nome;
                opt.selected = true;
                selectAlvo.appendChild(opt);
            } else {
                const optExistente = Array.from(selectAlvo.options).find(opt => opt.value == membro.id);
                if (optExistente) optExistente.selected = true;
            }
        });

    } catch (error) {
        console.error('Erro ao listar alunos:', error);
        selectAlvo.innerHTML = '<option disabled>Erro ao carregar alunos</option>';
    }
}


async function confirmarExclusaoGrupo(grupoId, grupoNome) {
    const confirmacao = confirm(`Tem certeza que deseja excluir o grupo "${grupoNome}"?\nEssa ação não pode ser desfeita.`);

    if (!confirmacao) return;

    try {
        const response = await fetch(`/grupos/${grupoId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Erro ao excluir grupo');
        }

        ativar(data.message || 'Grupo excluído com sucesso!', 'sucesso', '');
        carregarGrupos(); // Atualiza lista
    } catch (error) {
        console.error('Erro ao excluir grupo:', error);
        ativar(`Falha ao excluir grupo: ${error.message}`, 'erro', '');
    }
}

async function criarNovoGrupo(event) {
    event.preventDefault();
    
    // Capturar dados do formulário
    const form = event.target;
    const formData = new FormData(form);
    
    // Converter para objeto
    const grupoData = {
        nome: formData.get('nomeGrupo'),
        descricao: formData.get('tema'),
        semestre: formData.get('semestre')
    };
    
    // Validação básica
    if (!grupoData.nome || !grupoData.descricao || !grupoData.semestre) {
        ativar('Por favor, preencha todos os campos obrigatórios.', 'erro', '');
        return;
    }
    
    // Capturar seleção múltipla de alunos
    const alunosSelect = document.getElementById('alunos');
    const alunosSelecionados = Array.from(alunosSelect.selectedOptions).map(option => option.value);
    
    if (alunosSelecionados.length === 0) {
        ativar('Por favor, selecione pelo menos um aluno para o grupo.', 'erro', '');
        return;
    }
    
    // Adicionar alunos ao objeto de dados
    grupoData.alunos = alunosSelecionados;
    
    try {
        // Enviar para o servidor
        const response = await fetch('/grupos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(grupoData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao criar grupo');
        }
        
        const data = await response.json();
        
        // Exibir mensagem de sucesso
        ativar(data.message || 'Grupo criado com sucesso!', 'sucesso', '');
        
        // Resetar formulário
        form.reset();
        
        // Recarregar lista de grupos
        carregarGrupos();
        
    } catch (error) {
        console.error('Erro:', error);
        ativar(`Falha ao criar grupo: ${error.message}`, 'erro', '');
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const semestreSelect = document.getElementById('semestre');
    if (semestreSelect) {
        semestreSelect.addEventListener('change', () => {
            const semestreSelecionado = semestreSelect.value;
            if (semestreSelecionado !== "0") {
                carregarAlunosPorSemestre(semestreSelecionado);
            } else {
                limparAlunos();
            }
        });
    }
});



function limparAlunos() {
    const selectAlunos = document.getElementById('alunos');
    selectAlunos.innerHTML = '';
    const opt = document.createElement('option');
    opt.textContent = 'Selecione um semestre primeiro';
    opt.disabled = true;
    selectAlunos.appendChild(opt);
}

function formatarData(dataISO) {
    if (!dataISO) return 'Data não disponível';
    
    const data = new Date(dataISO);
    return data.toLocaleString('pt-BR', {
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
    });
}