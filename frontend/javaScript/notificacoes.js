
document.addEventListener('DOMContentLoaded', function() {
    const usuarioId = localStorage.getItem("usuarioId");
    console.log("usuarioId carregado:", usuarioId);
    
    if (!usuarioId) {
        console.warn("ID do usuário não encontrado. Notificações não serão carregadas.");
        return;
    }
    
    const notificacaoBotao = document.getElementById('notificacao-toggle');
    const notificacoesContainer = document.getElementById('notificacoes-container');
    const notificacoesLista = document.getElementById('notificacoes-lista');
    const contadorNotificacoes = document.getElementById('contador-notificacoes');
    const marcarTodasLidas = document.getElementById('marcar-todas-lidas');
    
    let notificacoesAbertas = false;
    
    notificacaoBotao.addEventListener('click', function(event) {
        event.stopPropagation();
        notificacoesAbertas = !notificacoesAbertas;
        notificacoesContainer.style.display = notificacoesAbertas ? 'block' : 'none';
        if (notificacoesAbertas) carregarNotificacoes();
    });
    
    document.addEventListener('click', function(event) {
        if (notificacoesAbertas && 
            !notificacoesContainer.contains(event.target) && 
            event.target !== notificacaoBotao) {
            notificacoesContainer.style.display = 'none';
            notificacoesAbertas = false;
        }
    });
    
    marcarTodasLidas.addEventListener('click', function() {
        fetch(`/notificacoes/todas/lidas`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: usuarioId })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                document.querySelectorAll('.notificacao-item.nao-lida')
                    .forEach(el => el.classList.remove('nao-lida'));
                contadorNotificacoes.textContent = '0';
                contadorNotificacoes.style.display = 'none';
            }
        })
        .catch(e => console.error('Erro ao marcar todas como lidas:', e));
    });

    function formatarData(dataStr) {
        if (!dataStr) return '';
        const data = new Date(dataStr);
        const hoje = new Date();
        const ontem = new Date(hoje);
        ontem.setDate(hoje.getDate() - 1);

        if (data.toDateString() === hoje.toDateString()) {
            return `Hoje às ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;
        }

        if (data.toDateString() === ontem.toDateString()) {
            return `Ontem às ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;
        }

        return `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth()+1).toString().padStart(2, '0')}/${data.getFullYear()} ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;
    }

    function carregarNotificacoes() {
        fetch(`/notificacoes?usuario_id=${usuarioId}`)
            .then(res => res.json())
            .then(data => {
                const { total_nao_lidas, notificacoes } = data;

                if (total_nao_lidas > 0) {
                    contadorNotificacoes.textContent = total_nao_lidas > 9 ? '9+' : total_nao_lidas;
                    contadorNotificacoes.style.display = 'block';
                } else {
                    contadorNotificacoes.style.display = 'none';
                }

                notificacoesLista.innerHTML = '';

                if (notificacoes.length === 0) {
                    notificacoesLista.innerHTML = `
                        <div class="notificacao-item notificacao-vazia">
                            <p>Nenhuma notificação disponível.</p>
                        </div>
                    `;
                    return;
                }

                notificacoes.forEach(notif => {
                    const item = document.createElement('div');
                    item.className = `notificacao-item ${!notif.lida ? 'nao-lida' : ''}`;
                    item.dataset.id = notif.id;
                    item.innerHTML = `
                        <div class="notificacao-titulo">${notif.titulo}</div>
                        <div class="notificacao-mensagem">${notif.mensagem}</div>
                        <div class="notificacao-data">${formatarData(notif.data_criacao)}</div>
                    `;

                    item.addEventListener('click', function() {
                        marcarComoLida(notif.id);
                        this.classList.remove('nao-lida');
                    });

                    notificacoesLista.appendChild(item);
                });
            })
            .catch(e => {
                console.error('Erro ao carregar notificações:', e);
                notificacoesLista.innerHTML = `
                    <div class="notificacao-item notificacao-vazia">
                        <p>Erro ao carregar notificações.</p>
                    </div>
                `;
            });
    }

    function marcarComoLida(notificacaoId) {
        fetch(`/notificacoes/${notificacaoId}/lida`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: usuarioId })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const atual = parseInt(contadorNotificacoes.textContent);
                if (atual > 1) {
                    contadorNotificacoes.textContent = atual - 1;
                } else {
                    contadorNotificacoes.style.display = 'none';
                }
            }
        })
        .catch(e => console.error('Erro ao marcar como lida:', e));
    }

    function verificarNotificacoesPeriodicamente() {
        fetch(`/notificacoes?usuario_id=${usuarioId}`)
            .then(res => res.json())
            .then(data => {
                const { total_nao_lidas } = data;
                if (total_nao_lidas > 0) {
                    contadorNotificacoes.textContent = total_nao_lidas > 9 ? '9+' : total_nao_lidas;
                    contadorNotificacoes.style.display = 'block';
                } else {
                    contadorNotificacoes.style.display = 'none';
                }
            })
            .catch(e => console.error('Erro ao verificar notificações:', e));
    }

    verificarNotificacoesPeriodicamente();
    setInterval(verificarNotificacoesPeriodicamente, 120000);
});
