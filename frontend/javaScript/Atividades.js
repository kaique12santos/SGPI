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

function criarCardAtividade({ titulo, prazo_entrega, semestre }) {
    const div = document.createElement('div');
    div.className = 'atividade-card';
    div.innerHTML = `
        <strong>${titulo}</strong><br>
        Prazo: ${formatarData(prazo_entrega)}<br>
        Semestre: ${semestre} <br>
    `;
    const btnAlterar = document.createElement('button');
    btnAlterar.textContent = 'Alterar';
    btnAlterar.className = 'btn-alterar';
    btnAlterar.onclick = () => {
        // lógica para alterar atividade
        alert(`Alterar: ${titulo}`);
    };

    const btnExcluir = document.createElement('button');
    btnExcluir.textContent = 'Excluir';
    btnExcluir.className = 'btn-excluir';
    btnExcluir.onclick = () => {
        // lógica para excluir atividade
        div.remove(); // Exemplo simples
    };

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
            ativar('Atividade criada com sucesso!', 'sucesso', '/professor/criar-atividades');
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
        titulo: nomeAtividade,
        prazo_entrega: dataEntrega,
        semestre: semestre
    };
    const lembrete = criarCardAtividade(novaAtividade);
    document.querySelector('.atividades-criadas').prepend(lembrete);
    
    // Limpar formulário
    form.reset();
}
