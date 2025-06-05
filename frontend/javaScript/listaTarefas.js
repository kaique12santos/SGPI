document.addEventListener('DOMContentLoaded', async () => {
    const atividadesContainer = document.getElementById('atividades-container');
    const loading = document.getElementById('loading');
    const erro = document.getElementById('mensagem-erro');
    const semAtividades = document.getElementById('sem-atividades');

    // Filtros no HTML
    const filtroStatus = document.getElementById('filtro-status');
    const filtroPrazo = document.getElementById('filtro-prazo');
    const filtroBusca = document.getElementById('filtro-busca');

    // ID do aluno salvo no Login.js
    const alunoId = localStorage.getItem('usuarioId');

    let hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
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
        
        // === 1) Criação dos cards, incluindo data-attributes para filtro ===
        data.atividades.forEach(atividade => {
            const card = document.createElement('div');
            card.classList.add('atividade-card');

            // Normaliza status em minúsculas
            const status = atividade.status_entrega.toLowerCase();
            const statusClasse = `status-${status}`;

            // Parse da data de prazo (string ISO) para facilitar comparação
            const prazoDate = new Date(atividade.prazo_entrega);

            // Coloca atributos data- para usar depois na filtragem
            card.dataset.status = status;                        // ex: "pendente", "entregue" ou "atrasado"
            card.dataset.prazodat = atividade.prazo_entrega;     // string ISO (para recriar Date depois)
            card.dataset.titulo = atividade.titulo.toLowerCase(); // título em minúsculas (para busca)

            card.innerHTML = `
                <h3>${atividade.titulo}</h3>
                <p class="prazo"><strong>Prazo:</strong> ${prazoDate.toLocaleString('pt-BR')}</p>
                <p class="info-grupo"><strong>Grupo:</strong> ${atividade.grupo_nome || 'N/A'}</p>
                <span class="status-badge ${statusClasse}">${atividade.status_entrega}</span>
            `;

            const isVencido = prazoDate < hoje;
            if (status !== 'entregue' && status !== 'atrasado' && !isVencido) {
                card.addEventListener('click', () => {
                    localStorage.setItem('atividade_id', atividade.id);
                    window.location.href = 'entrega.html';
                });
            } else {
                // desativa (incluindo caso isVencido)
                card.classList.add('card-desativado');
                card.style.cursor = 'not-allowed';
                if (status === 'entregue' || status === 'atrasado') {
                    card.title = 'Esta atividade não pode mais ser alterada.';
                } else {
                    card.title = 'Esta atividade está com prazo vencido.';
                }
            }
            
            

            atividadesContainer.appendChild(card);
        });

        // === 2) Função que percorre todos os cards e aplica os 3 filtros em cascata ===
        function filtrarCards() {
            const statusEscolhido = filtroStatus.value; // "todos", "pendente", "entregue" ou "atrasado"
            const prazoEscolhido = filtroPrazo.value;   // "todos", "proximos", "vencidos"
            const textoBusca = filtroBusca.value.toLowerCase().trim();

            

            // Percorre todos os cards criados
            const cards = atividadesContainer.querySelectorAll('.atividade-card');
            cards.forEach(card => {
                const statusCard = card.dataset.status; // ex: "pendente"
                const prazoISO = card.dataset.prazodat;
                const tituloCard = card.dataset.titulo; // já em minúsculas

                const dataPrazo = new Date(prazoISO);
                dataPrazo.setHours(0, 0, 0, 0); // normaliza horário para comparação só de datas

                // 2.1) Verifica filtro de status
                let passouStatus = false;
                if (statusEscolhido === 'todos') {
                    passouStatus = true;
                } else {
                    passouStatus = (statusCard === statusEscolhido);
                }

                // 2.2) Verifica filtro de prazo
                let passouPrazo = false;
                if (prazoEscolhido === 'todos') {
                    passouPrazo = true;
                } else if (prazoEscolhido === 'proximos') {
                    // "Próximos 7 dias": dataPrazo >= hoje e <= hoje + 7 dias
                    const seteDiasDepois = new Date(hoje);
                    seteDiasDepois.setDate(seteDiasDepois.getDate() + 7);
                    passouPrazo = (dataPrazo >= hoje && dataPrazo <= seteDiasDepois);
                } else if (prazoEscolhido === 'vencidos') {
                    // "Vencidos": dataPrazo < hoje
                    passouPrazo = (dataPrazo < hoje);
                }

                // 2.3) Verifica busca por título
                const passouBusca = tituloCard.includes(textoBusca);

                // === Se todos os 3 critérios forem verdadeiros, mostra; senão, esconde ===
                if (passouStatus && passouPrazo && passouBusca) {
                    card.style.display = ''; // exibe
                } else {
                    card.style.display = 'none'; // esconde
                }
            });
        }

        // === 3) Registra os listeners de filtro que disparam a filtrarCards() ===
        filtroStatus.addEventListener('change', filtrarCards);
        filtroPrazo.addEventListener('change', filtrarCards);
        filtroBusca.addEventListener('input', filtrarCards);

        // Opcional: já aplica o filtro inicial para, por exemplo, esconder cards se houver algo pré-selecionado
        filtrarCards();

    } catch (e) {
        console.error('Erro ao carregar atividades:', e);
        loading.style.display = 'none';
        erro.style.display = 'block';
    }
});
