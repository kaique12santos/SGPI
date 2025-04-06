import { ativar } from "./alerts.js";

const form = document.querySelector('#create-task'); 
const lembreteContainer = document.createElement('div');
lembreteContainer.id = 'lembrete-atividade';
document.querySelector('.form-task').appendChild(lembreteContainer);

form.addEventListener('submit', (event) => {
    event.preventDefault(); 

    const nomeAtividade = document.getElementById('nomeAtividade').value;
    const descricaoAtividade = document.getElementById('descricao').value;
    const semestre = document.getElementById('semestre').value;
    const dataEntrega = document.getElementById('dataEntrega').value;
    const pontos = document.getElementById('pontos').value;
    const professor_id = 1;
    const projeto_id = 1;
    document.getElementById('semestreError').textContent = '';

    if (!nomeAtividade || !descricaoAtividade || !semestre || !dataEntrega || !pontos) {
        ativar('Por favor, preencha todos os campos.','erro','')
        return;
    }

    if (semestre < 1){
        document.getElementById('semestreError').textContent = 'Selecione um Semestre';
        return;
    }

    fetch('/professor/criar-atividade', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nomeAtividade, descricaoAtividade, semestre, dataEntrega, pontos })
    })
    .then(response => {
        if (response.ok) {
            // ✅ Mostrar lembrete após criação
            mostrarLembrete(nomeAtividade, dataEntrega, semestre);
            ativar('Tarefa adicionada com sucesso!','sucesso','');
            form.reset(); // Limpa o formulário
        } else {
            response.json().then(data => {
                ativar(data.message, data.success ? 'sucesso' : 'erro');
            });
        }
    })
    .catch(error => {
        console.error('Erro na requisição:', error);
        ativar('Erro ao conectar com o servidor.','erro','');
    });
});

// ➕ Função que cria o lembrete da atividade criada
function mostrarLembrete(titulo, prazo, semestre) {
    const date = new Date(prazo);
    const formatado = date.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    lembreteContainer.innerHTML = `
        <div class="lembrete-box" style="
            background: #dff0d8; 
            border-left: 5px solid #3c763d; 
            padding: 10px; 
            margin-top: 20px;
            border-radius: 8px;
        ">
            <h4>Atividade Criada!</h4>
            <p><strong>Título:</strong> ${titulo}</p>
            <p><strong>Prazo:</strong> ${formatado}</p>
            <p><strong>Semestre:</strong> ${semestre}º</p>
        </div>
    `;
}
