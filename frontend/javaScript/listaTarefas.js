document.addEventListener('DOMContentLoaded', async () => {
    const atividadesContainer = document.getElementById('atividades-container');
    const loading = document.getElementById('loading');
    const erro = document.getElementById('mensagem-erro');
    const semAtividades = document.getElementById('sem-atividades');
    const filtroStatus = document.getElementById('filtro-status');
    const filtroPrazo = document.getElementById('filtro-prazo');
    const filtroBusca = document.getElementById('filtro-busca');
    const alunoId = localStorage.getItem('usuarioId');
    const agora = new Date();
    
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
        
        data.atividades.sort((a, b) => {
            const dataA = new Date(a.data_criacao);
            const dataB = new Date(b.data_criacao);
            return dataB - dataA; 
        });

        console.log('Atividades ordenadas:', data.atividades.map(a => ({
            titulo: a.titulo,
            data_criacao: a.data_criacao
        })));
        
        data.atividades.forEach(atividade => {
            const card = document.createElement('div');
            card.classList.add('atividade-card');
    
            const status = atividade.status_entrega.toLowerCase();
            const statusClasse = `status-${status}`;
    
            const prazoDate = new Date(atividade.prazo_entrega);
    
            card.dataset.status = status;
            card.dataset.prazodat = atividade.prazo_entrega;
            card.dataset.titulo = atividade.titulo.toLowerCase();
            card.dataset.datacriacao = atividade.data_criacao; 
    
            card.innerHTML = `
                <h3>${atividade.titulo}</h3>
                <p class="prazo"><strong>Prazo:</strong> ${prazoDate.toLocaleString('pt-BR')}</p>
                <p class="info-grupo"><strong>Grupo:</strong> ${atividade.grupo_nome || 'N/A'}</p>
                <span class="status-badge ${statusClasse}">${atividade.status_entrega}</span>
            `;
    
            const isPrazoVencido = prazoDate.getTime() < agora.getTime();
            const isAtrasado = status === 'atrasado';
            
            if (!isPrazoVencido && !isAtrasado) {
                // Atividade no prazo e não atrasada: pode ser editada (mesmo se já entregue)
                card.addEventListener('click', () => {
                    localStorage.setItem('atividade_id', atividade.id);
                    window.location.href = 'entrega';
                });
            } else {
                card.classList.add('card-desativado');
                card.style.cursor = 'not-allowed';
                
                if (isAtrasado) {
                    card.title = 'Esta atividade está marcada como atrasada e não pode ser alterada.';
                } else if (isPrazoVencido) {
                    card.title = 'Esta atividade está com prazo vencido.';
                }
            }
    
            atividadesContainer.appendChild(card);
        });

        function filtrarCards() {
            const statusEscolhido = filtroStatus.value;
            const prazoEscolhido = filtroPrazo.value;  
            const textoBusca = filtroBusca.value.toLowerCase().trim();

            const cards = atividadesContainer.querySelectorAll('.atividade-card');
            cards.forEach(card => {
                const statusCard = card.dataset.status;
                const prazoISO = card.dataset.prazodat;
                const tituloCard = card.dataset.titulo; 

                const dataPrazo = new Date(prazoISO);

                let passouStatus = false;
                if (statusEscolhido === 'todos') {
                    passouStatus = true;
                } else {
                    passouStatus = (statusCard === statusEscolhido);
                }

                let passouPrazo = false;
                if (prazoEscolhido === 'todos') {
                    passouPrazo = true;
                } else if (prazoEscolhido === 'proximos') {
                    const seteDiasDepois = new Date(agora.getTime() + 7 * 24*60*60*1000);
                    passouPrazo = (dataPrazo.getTime() >= agora.getTime() && dataPrazo.getTime() <= seteDiasDepois.getTime());
                } else if (prazoEscolhido === 'vencidos') {
                    passouPrazo = (dataPrazo.getTime() < agora.getTime());
                }

                const passouBusca = tituloCard.includes(textoBusca);

                if (passouStatus && passouPrazo && passouBusca) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        filtroStatus.addEventListener('change', filtrarCards);
        filtroPrazo.addEventListener('change', filtrarCards);
        filtroBusca.addEventListener('input', filtrarCards);

        filtrarCards();

    } catch (e) {
        console.error('Erro ao carregar atividades:', e);
        loading.style.display = 'none';
        erro.style.display = 'block';
    }
});