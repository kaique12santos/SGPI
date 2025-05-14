document.addEventListener('DOMContentLoaded', async () => {
    const atividadesContainer = document.getElementById('atividades-container');
    const loading = document.getElementById('loading');
    const erro = document.getElementById('mensagem-erro');
    const semAtividades = document.getElementById('sem-atividades');
    
    // Correção aqui: usando a chave correta que é salva no Login.js
    const alunoId = localStorage.getItem('usuarioId');
    
    if (!alunoId) {
        erro.style.display = 'block';
        erro.textContent = 'ID do aluno não encontrado. Faça login novamente.';
        loading.style.display = 'none';
        return;
    }
    
    try {
        const response = await fetch(`/api/atividades?aluno_id=${alunoId}`);
        const data = await response.json();
        loading.style.display = 'none';
        
        if (!data.success || data.atividades.length === 0) {
            semAtividades.style.display = 'block';
            return;
        }
        
        data.atividades.forEach(atividade => {
            const card = document.createElement('div');
            card.classList.add('atividade-card');
        
            const statusClasse = `status-${atividade.status_entrega.toLowerCase()}`;
        
            card.innerHTML = `
                <h3>${atividade.titulo}</h3>
                <p class="prazo"><strong>Prazo:</strong> ${new Date(atividade.prazo_entrega).toLocaleString('pt-BR')}</p>
                <p class="info-grupo"><strong>Grupo:</strong> ${atividade.grupo_nome || 'N/A'}</p>
                <span class="status-badge ${statusClasse}">${atividade.status_entrega}</span>
            `;
        
            card.addEventListener('click', () => {
                localStorage.setItem('atividade_id', atividade.id);
                window.location.href = 'entrega.html';
            });
        
            atividadesContainer.appendChild(card);
        });
        
    } catch (e) {
        console.error('Erro ao carregar atividades:', e);
        loading.style.display = 'none';
        erro.style.display = 'block';
    }
});