document.addEventListener('DOMContentLoaded', async () => {
    const alunoId = localStorage.getItem('usuarioId');
    const container = document.getElementById('notas-container');
    const modal = document.getElementById('modal-reconsideracao');
    const comentarioInput = document.getElementById('comentario-reconsideracao');
    const btnEnviar = document.getElementById('enviar-reconsideracao');
    const btnCancelar = document.getElementById('cancelar-reconsideracao');
    let avaliacaoSelecionada = null;
  
    if (!alunoId) {
      container.innerHTML = '<p>Usuário não autenticado.</p>';
      return;
    }
  
    try {
      const res = await fetch(`/api/aluno/notas?aluno_id=${alunoId}`);
      const data = await res.json();
  
      if (!data.success || data.avaliacoes.length === 0) {
        container.innerHTML = '<p>Nenhuma avaliação disponível.</p>';
        return;
      }
  
      data.avaliacoes.forEach(av => {
        const card = document.createElement('div');
        card.className = 'card-nota';
        const dentroDoPrazo = av.dentro_prazo;
        const jaSolicitado = av.status_reconsideracao !== null;
  
        
          
        card.innerHTML = `
        <p><strong>Atividade:</strong><span> ${av.atividade}</span></p>
        <p><strong>Nota:</strong><span> ${av.nota}</span></p>
        <p><strong>Comentário do Professor:</strong><span> ${av.comentario || 'Nenhum'}</span></p>
        <p><strong>Data da Avaliação:</strong> ${new Date(av.data_avaliacao).toLocaleDateString('pt-BR')}</p>
      `;
    
      if (jaSolicitado) {

        if (av.status_reconsideracao=="Pendente") {
          card.innerHTML += `<p ><strong>Reconsideração:</strong><span class="status-badge status-pendente" > ${av.status_reconsideracao}</span></p>`
        }if (av.status_reconsideracao=="Entregue") {
          card.innerHTML += `<p ><strong>Reconsideração:</strong><span class="status-badge status-entregue" > ${av.status_reconsideracao}</span></p>`
        }if (av.status_reconsideracao=="Negado") {
          card.innerHTML += `<p ><strong>Reconsideração:</strong><span class="status-badge status-reprovado" > ${av.status_reconsideracao}</span></p>`
        }if (av.status_reconsideracao=="Aprovado") {
          card.innerHTML += `<p ><strong>Reconsideração:</strong><span class="status-badge status-aprovado" > ${av.status_reconsideracao}</span></p>`
      
        }
      }
    
      const podePedir = dentroDoPrazo && !jaSolicitado;
      const botao = document.createElement('button');
      botao.className = 'btn-reconsiderar';
      botao.textContent = 'Pedir Reconsideração';
      botao.disabled = !podePedir;
    
      if (!podePedir) {
        botao.style.opacity = 0.6;
        botao.title = jaSolicitado
          ? `Já solicitado (${av.status_reconsideracao})`
          : 'Fora do prazo (7 dias)';
      }
    
      botao.addEventListener('click', () => {
        avaliacaoSelecionada = av.id;
        modal.classList.remove('hidden');
      });
    
      card.appendChild(botao);
      container.appendChild(card);
    });
  
      btnCancelar.onclick = () => {
        modal.classList.add('hidden');
        comentarioInput.value = '';
      };
  
      btnEnviar.onclick = async () => {
        const comentario = comentarioInput.value.trim();
        if (!comentario) return;
  
        const res = await fetch('/api/aluno/reconsiderar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            avaliacao_id: avaliacaoSelecionada,
            aluno_id: parseInt(alunoId),
            comentario
          })
        });
  
        const resposta = await res.json();
        alert(resposta.message);
        modal.classList.add('hidden');
        comentarioInput.value = '';
      };
    } catch (err) {
      console.error('Erro ao carregar notas:', err);
      container.innerHTML = '<p>Erro ao carregar avaliações.</p>';
    }
  });
  