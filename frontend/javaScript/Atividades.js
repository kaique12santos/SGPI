import { ativar } from "./alerts.js";

document.addEventListener('DOMContentLoaded', () => {
    carregarAtividades();
});

const usuarioId = parseInt(localStorage.getItem('usuarioId'), 10);
const usuarioRole = localStorage.getItem('userRole') || localStorage.getItem('usuarioRole') || 'professor';
const baseEndpoint = usuarioRole === 'professor_orientador' 
    ? '/professor_orientador' 
    : '/professor';

if (!usuarioId || isNaN(usuarioId)) {
    console.error("ID do usuário não encontrado ou inválido no localStorage.");
}

async function carregarAtividades() {
    try {
        const response = await fetch(`${baseEndpoint}/atividades?professor_id=${usuarioId}`);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const atividades = await response.json();

        let container = document.querySelector('.atividades-criadas');
        if (!container) container = createContainer();
        container.innerHTML = '';

        // Ordena pela data de criação (mais recente primeiro)
        atividades.sort((a, b) => new Date(b.data_criacao) - new Date(a.data_criacao));
        atividades.forEach(atividade => {
            const div = criarCardAtividade(atividade);
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Erro ao carregar atividades:', error);
        ativar(`Falha ao carregar atividades: ${error.message}`, 'erro', '');
    }
}

function createContainer() {
    const container = document.createElement('div');
    container.className = 'atividades-criadas';
    document.querySelector('.container').appendChild(container);
    return container;
}

function criarCardAtividade({ id, titulo, descricao, semestre, prazo_entrega, criterios_avaliacao }) {
    const div = document.createElement('div');
    div.className = 'atividade-card';
    div.dataset.atividadeId = id;

    div.innerHTML = `
        <strong>${titulo}</strong><br>
        Prazo de Entrega: ${formatarData(prazo_entrega)}<br>
        Semestre: ${semestre}º Semestre<br>
    `;

    div.appendChild(criarBotao('Ver', 'btn-Ver', () => mostrarDetalhes(div, { titulo, descricao, semestre, prazo_entrega, criterios_avaliacao })));
    div.appendChild(criarBotao('Alterar', 'btn-alterar', () => abrirModalEdicao(div, { id, titulo, descricao, semestre, prazo_entrega, criterios_avaliacao })));
    div.appendChild(criarBotao('Excluir', 'btn-excluir', () => excluirAtividade(div, id)));

    return div;
}

function criarBotao(texto, classe, onClick) {
    const btn = document.createElement('button');
    btn.className = `${classe} btn`;
    btn.textContent = texto;
    btn.addEventListener('click', onClick);
    return btn;
}

function mostrarDetalhes(wrapper, detalhes) {
    const { titulo, descricao, semestre, prazo_entrega, criterios_avaliacao } = detalhes;
    const overlay = document.createElement('div'); overlay.className = 'div-zindex';
    const modal = document.createElement('div'); modal.className = 'div-mostrar';
    modal.innerHTML = `
        <h2>Título: ${titulo}</h2>
        <p><strong>Descrição:</strong> ${descricao}</p>
        <p><strong>Semestre:</strong> ${semestre}º Semestre</p>
        <p><strong>Prazo de Entrega:</strong> ${formatarData(prazo_entrega)}</p>
        <p><strong>Critérios de Avaliação:</strong> ${criterios_avaliacao} Pontos</p>
        <button id="fecharModal" class='send-button' style="margin-top:1rem;">Fechar</button>
    `;
    modal.querySelector('#fecharModal').onclick = () => document.body.removeChild(overlay);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

function abrirModalEdicao(div, atividade) {
    const { id, titulo, descricao, semestre, prazo_entrega, criterios_avaliacao } = atividade;
    const overlay = document.createElement('div'); overlay.className = 'div-zindex';

    const dataISO = new Date(prazo_entrega);
    const dataFormatada = dataISO.toISOString().slice(0,16);

    const modal = document.createElement('div'); modal.className = 'div-mostrar form-task';
    modal.innerHTML = `
        <form id="editar-atividade">
            <h2>Editar Atividade</h2>
            <label>Nome da atividade<input type="text" id="edit-titulo" class="input-atividade" value="${titulo}" required></label>
            <label>Descrição<textarea id="edit-descricao" class="input-atividade textarea-tamanho" required>${descricao}</textarea></label>
            <label>Semestre<select id="edit-semestre" class="input-atividade selectSemestre" required>
                <option value="0">Selecione</option>
                ${[1,2,3,4,5,6].map(n => `<option value="${n}" ${semestre===n? 'selected':''}>${n}º Semestre</option>`).join('')}
            </select></label>
            <label>Data de entrega<input type="datetime-local" id="edit-prazo" class="input-atividade" value="${dataFormatada}" required></label>
            <label>Pontos<input type="number" id="edit-criterios" class="input-atividade" value="${criterios_avaliacao}" min="1" max="100" required></label>
            <div class="btn-group">
                <button type="submit" class="send-button">Salvar</button>
                <button type="button" id="cancelar-edicao" class="btn-excluir">Cancelar</button>
            </div>
        </form>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('cancelar-edicao').addEventListener('click', () => document.body.removeChild(overlay));

    document.getElementById('editar-atividade').addEventListener('submit', async e => {
        e.preventDefault();
        const dados = {
            titulo: document.getElementById('edit-titulo').value,
            descricao: document.getElementById('edit-descricao').value,
            semestre: parseInt(document.getElementById('edit-semestre').value, 10),
            prazo_entrega: document.getElementById('edit-prazo').value,
            criterios_avaliacao: parseInt(document.getElementById('edit-criterios').value, 10),
            professor_id: usuarioId
        };

        try {
            const response = await fetch(`${baseEndpoint}/atividades/${id}`, {
                method: 'PUT',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify(dados)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            ativar(data.message, 'sucesso', '');
            document.body.removeChild(overlay);
            carregarAtividades();
        } catch (err) {
            console.error('Erro:', err);
            ativar(`Falha ao atualizar atividade: ${err.message}`,'erro','');
        }
    });
}

async function excluirAtividade(div, atividadeId) {
    if (!confirm('Tem certeza que deseja excluir esta atividade?')) return;
    try {
        const response = await fetch(`${baseEndpoint}/atividades/${atividadeId}?professor_id=${usuarioId}`, { method:'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        ativar(data.message,'sucesso','');
        div.remove();
    } catch (err) {
        console.error('Erro:', err);
        ativar(`Falha ao excluir atividade: ${err.message}`,'erro','');
    }
}

function formatarData(dataISO) {
    const data = new Date(dataISO);
    return data.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

// Formulário de criação
const form = document.querySelector('#create-task');
form.addEventListener('submit', async event => {
    event.preventDefault();
    const titulo = document.getElementById('nomeAtividade').value;
    const descricao = document.getElementById('descricao').value;
    const semestre = parseInt(document.getElementById('semestre').value, 10);
    const prazo_entrega = document.getElementById('dataEntrega').value;
    const criterios_avaliacao = parseInt(document.getElementById('pontos').value, 10);

    document.getElementById('semestreError').textContent = '';
    if (!titulo || !descricao || !prazo_entrega || !criterios_avaliacao || !semestre) {
        ativar('Por favor, preencha todos os campos.', 'erro','');
        return;
    }
    if (semestre < 1) {
        document.getElementById('semestreError').textContent = 'Selecione um Semestre válido.';
        return;
    }

    try {
        const response = await fetch(`${baseEndpoint}/atividades`, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ titulo, descricao, semestre, prazo_entrega, criterios_avaliacao, professor_id: usuarioId })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        ativar('Atividade criada com sucesso!', 'sucesso','/criar-atividade');
        form.reset();
        carregarAtividades();
    } catch (error) {
        console.error('Erro na criação:', error);
        ativar(`Erro na criação: ${error.message}`, 'erro','');
    }
});
