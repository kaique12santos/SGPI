import { ativar } from "./alerts.js";

document.addEventListener('DOMContentLoaded', () => {
    carregarAtividades();
});


function carregarAtividades() {
    const professor_id = parseInt(localStorage.getItem('usuarioId'));

        if (!professor_id || isNaN(professor_id)) {
            console.error("ID do professor não encontrado no localStorage.");
        }
    fetch(`/professor/atividades?professor_id=${professor_id}`)
        .then(response => response.json())
        .then(atividades => {
            const container = document.createElement('div');
            container.className = 'atividades-criadas';
            container.innerHTML = '';

            atividades.sort((a, b) => new Date(b.data_criacao) - new Date(a.data_criacao));
            atividades.forEach(atividade => {
                const div = criarCardAtividade(atividade);
                container.appendChild(div);
            });

            if (!document.querySelector('.atividades-criadas')) {
                document.querySelector('.container').appendChild(container);
            }
        })
        .catch(error => console.error('Erro ao carregar atividades:', error));
}

function criarCardAtividade({ id, titulo, descricao, semestre, prazo_entrega, criterios_avaliacao}) {
    const div = document.createElement('div');
    div.className = 'atividade-card';
    div.dataset.atividadeId = id;
    
    div.innerHTML = `
        <strong>${titulo}</strong><br>
        Prazo de Entrega: ${formatarData(prazo_entrega)}<br>
        Semestre: ${semestre}º Semestre <br>
    `;

    const btnMostrar = document.createElement('button');
    btnMostrar.className = 'btn-Ver btn';
    btnMostrar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                Ver`
    btnMostrar.onclick = () => {
            const overlay = document.createElement('div');
            overlay.className='div-zindex'
        
            const modal = document.createElement('div');
            modal.className='div-mostrar'
            modal.innerHTML = `
            
                  <h2>Titulo: ${titulo}</h2>
                  <p><strong>Descrição:</strong> ${descricao}</p>
                  <p><strong>Semestre:</strong> ${semestre}º Semestre</p>
                  <p><strong>Prazo de Entrega:</strong> ${formatarData(prazo_entrega)}</p>
                  <p><strong>Critérios de Avaliação:</strong> ${criterios_avaliacao} Pontos</p>
                  <button id="fecharModal" class='send-button' style="margin-top: 1rem;">Fechar</button>
            `;
        
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
        const overlay = document.createElement('div');
        overlay.className = 'div-zindex';
        
        const dataHora = new Date(prazo_entrega);
        const ano = dataHora.getFullYear();
        const mes = String(dataHora.getMonth() + 1).padStart(2, '0');
        const dia = String(dataHora.getDate()).padStart(2, '0');
        const hora = String(dataHora.getHours()).padStart(2, '0');
        const minuto = String(dataHora.getMinutes()).padStart(2, '0');
        const dataFormatada = `${ano}-${mes}-${dia}T${hora}:${minuto}`;
        
        const modal = document.createElement('div');
        modal.className = 'div-mostrar form-task';
        modal.innerHTML = `
            
            <form id="editar-atividade">
            <h2>Editar Atividade</h2>
                <label for="edit-titulo">Nome da atividade</label>
                <input type="text" id="edit-titulo" class="input-atividade" value="${titulo}" required>
                
                <label for="edit-descricao">Descrição da Atividade</label>
                <textarea id="edit-descricao" class="input-atividade textarea-tamanho" required>${descricao}</textarea>
                
                <label for="edit-semestre">Semestre</label>
                <select id="edit-semestre" class="input-atividade selectSemestre" required>
                   <option value="0">Selecione</option>
                    ${[1,2,3,4,5,6].map(n => `<option value="${n}" ${semestre === String(n) ? 'selected' : ''}>${n}º Semestre</option>`).join('')}
                </select>
                
                <label for="edit-prazo">Data de entrega</label>
                <input type="datetime-local" id="edit-prazo" class="input-atividade" value="${dataFormatada}" required>
                
                <label for="edit-criterios">Pontos</label>
                <input type="number" id="edit-criterios" class="input-atividade" value="${criterios_avaliacao}" min="1" max="100" required>
                
                <div class="btn-group">
                    <button type="submit" class="send-button btn">Salvar</button>
                    <button type="button" id="cancelar-edicao" class="btn-excluir btn">Cancelar</button>
                </div>
            </form>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        document.getElementById('cancelar-edicao').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        document.getElementById('editar-atividade').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const atividadeId = div.dataset.atividadeId;
            const professorId = parseInt(localStorage.getItem('usuarioId'));
            console.log("Professor ID:", professorId);
            
            const dadosAtualizados = {
                titulo: document.getElementById('edit-titulo').value,
                descricao: document.getElementById('edit-descricao').value,
                semestre: parseInt(document.getElementById('edit-semestre').value),
                prazo_entrega: document.getElementById('edit-prazo').value,
                criterios_avaliacao: parseInt(document.getElementById('edit-criterios').value, 10),
                professor_id: professorId,   
            };
            console.log(dadosAtualizados)
            console.log("✔️ professor_id está definido corretamente:", dadosAtualizados.professor_id);
            try {
                const response = await fetch(`/professor/atividades/${atividadeId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(dadosAtualizados)
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Erro ao atualizar atividade');
                }
                
                const data = await response.json();
                
                div.querySelector('strong').textContent = dadosAtualizados.titulo;
                div.querySelector('br').nextSibling.textContent = `Prazo: ${formatarData(dadosAtualizados.prazo_entrega)}`;
                
                 titulo = dadosAtualizados.titulo;
                 descricao = dadosAtualizados.descricao;
                 semestre = dadosAtualizados.semestre;
                 prazo_entrega = dadosAtualizados.prazo_entrega;
                criterios_avaliacao = dadosAtualizados.criterios_avaliacao;
                
                
                document.body.removeChild(overlay);
                ativar(data.message, 'sucesso', '');
                carregarAtividades()
                
            } catch (error) {
                console.error('Erro:', error);
                ativar(`Falha ao atualizar atividade: ${error.message}`,'erro','')
            }
        });
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
            const atividadeId = parseInt(div.dataset.atividadeId, 10);
            const professorId = parseInt(localStorage.getItem('usuarioId'), 10);
            console.log("ID da atividade a ser excluída:", atividadeId); 
            if (isNaN(atividadeId) || isNaN(professorId)) {
                throw new Error('ID da atividade ou professor inválido');
            }
            
            if (!confirm('Tem certeza que deseja excluir esta atividade?')) {
                return;
            }
            
            const response = await fetch(`/professor/atividades/${atividadeId}?professor_id=${professorId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao excluir atividade');
            }
            
            const data = await response.json();
            ativar(data.message,'sucesso',''); 
            
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
    const professor_id = parseInt(localStorage.getItem('usuarioId'));

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

    fetch('/professor/atividades', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            titulo,
            descricao,
            professor_id,
            prazo_entrega,
            criterios_avaliacao,
            semestre
        })
    })
    .then(response => {
        if (response.ok) {
            ativar('Atividade criada com sucesso!', 'sucesso', '/criar-atividade');
            form.reset();
            response.json().then(data => {
                carregarAtividades();
            });
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