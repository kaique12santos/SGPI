import { ativar } from "./alerts.js";


document.addEventListener('DOMContentLoaded', () => {
    carregarAtividades();
});

function carregarAtividades() {
    fetch('/professor/atividades')
        .then(response => response.json())
        .then(atividades => {
            const container = document.createElement('div');
            container.className = 'atividades-criadas';

            atividades.forEach(atividade => {
                const div = criarCardAtividade(atividade);
                container.appendChild(div);
            });

            document.querySelector('.container').appendChild(container);
        })
        .catch(error => console.error('Erro ao carregar atividades:', error));
}

function criarCardAtividade({ id, titulo, descricao, semestre, prazo_entrega, criterios_avaliacao}) {
    const div = document.createElement('div');
    div.className = 'atividade-card';
    div.dataset.atividadeId = id;
    
    div.innerHTML = `
        <strong>${titulo}</strong><br>
        Prazo: ${formatarData(prazo_entrega)}<br>
        Semestre: ${semestre} <br>
    `;

    const btnMostrar = document.createElement('button');
    btnMostrar.className = 'btn-Ver btn';
    btnMostrar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                Ver`
    btnMostrar.onclick = () => {
            // Div do fundo escuro
            const overlay = document.createElement('div');
            overlay.className='div-zindex'
        
            // Div do conteúdo central
            const modal = document.createElement('div');
            modal.className='div-mostrar'
            modal.innerHTML = `
                  <h2>${titulo}</h2>
                  <p><strong>Descrição:</strong> ${descricao}</p>
                  <p><strong>Semestre:</strong> ${semestre}</p>
                  <p><strong>Prazo de Entrega:</strong> ${formatarData(prazo_entrega)}</p>
                  <p><strong>Critérios de Avaliação:</strong> ${criterios_avaliacao}</p>
                  <button id="fecharModal" style="margin-top: 1rem;">Fechar</button>
            `;
        
            // Evento para fechar o modal
            modal.querySelector('#fecharModal').onclick = () => {
                document.body.removeChild(overlay);
            };
        
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
        
        
    };
    const btnAlterar = document.createElement('button');
    
    btnAlterar.className = 'btn-alterar btn';
    btnAlterar.innerHTML = ` <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg> Alterar`
    btnAlterar.onclick = () => {
        // lógica para alterar atividade
        alert(`Alterar: ${titulo}`);
    };

    const btnExcluir = document.createElement('button');
    btnExcluir.className = 'btn-excluir btn';
    btnExcluir.innerHTML = ` <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Excluir`
    btnExcluir.onclick = async () => {
        try {
            // Obter e converter ID para número
            const atividadeId = parseInt(div.dataset.atividadeId, 10);
            console.log("ID da atividade a ser excluída:", atividadeId); 
            if (isNaN(atividadeId)) {
                throw new Error('ID da atividade inválido');
            }
            
            if (!confirm('Tem certeza que deseja excluir esta atividade?')) {
                return; 
            }
            
            // Fazer requisição DELETE para o servidor
            const response = await fetch(`/professor/criar-atividade/${atividadeId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao excluir atividade');
            }
            
            // Se chegou aqui, a exclusão foi bem-sucedida
            const data = await response.json();
            ativar(data.message,'sucesso',''); 
            
            // Remover elemento do DOM
            div.remove();
            
        } catch (error) {
            console.error('Erro:', error);
            ativar(`Falha ao excluir atividade: ${error.message}`,'erro','');
        }
    };

    div.appendChild(btnMostrar)
    div.appendChild(btnAlterar);
    div.appendChild(btnExcluir);
    return div;
}

function formatarData(dataISO) {
    const data = new Date(dataISO);
    return data.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

const form = document.querySelector('#create-task');

form.addEventListener('submit', (event) => {
    event.preventDefault();

    const titulo = document.getElementById('nomeAtividade').value;
    const descricao = document.getElementById('descricao').value;
    const semestre = parseInt(document.getElementById('semestre').value);
    const prazo_entrega = document.getElementById('dataEntrega').value;
    const criterios_avaliacao = document.getElementById('pontos').value;

    // IDs fixos (temporariamente estáticos, podem vir do login futuramente)
    const professor_id = 1;
    const projeto_id = 1;

    document.getElementById('semestreError').textContent = '';

    // Validações
    if (!titulo || !descricao || !prazo_entrega || !criterios_avaliacao || !semestre) {
        ativar('Por favor, preencha todos os campos.', 'erro', '');
        return;
    }

    if (semestre < 1) {
        document.getElementById('semestreError').textContent = 'Selecione um Semestre válido.';
        return;
    }

    // Envio para o back-end
    fetch('/professor/atividades', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            titulo,
            descricao,
            professor_id,
            projeto_id,
            prazo_entrega,
            criterios_avaliacao,
            semestre
        })
    })
    .then(response => {
        if (response.ok) {
            ativar('Atividade criada com sucesso!', 'sucesso', '/professor/atividades');
        } else {
            response.json().then(data => {
                ativar(data.message, data.success ? 'sucesso' : 'erro');
            });
        }
    })
    .catch(error => {
        console.error('Erro na requisição:', error);
        ativar(`Erro ${response.status}: ${response.statusText}`, 'erro', '');
    });
});

if (response.ok) {
    ativar('Tarefa adicionada com sucesso!', 'sucesso', '');

    // Criar e adicionar lembrete abaixo do formulário
    const novaAtividade = {
        id,
        titulo,
        descricao,
        prazo_entrega,
        semestre,
        criterios_avaliacao
    };
    const lembrete = criarCardAtividade(novaAtividade);
    document.querySelector('.atividades-criadas').prepend(lembrete);
    
    // Limpar formulário
    form.reset();
}
