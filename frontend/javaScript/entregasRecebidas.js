document.addEventListener('DOMContentLoaded', () => {
    carregarEntregasRecebidas();
  });
  
  async function carregarEntregasRecebidas() {
    const professorId = localStorage.getItem('usuarioId');
    const role = localStorage.getItem('userRole');
    const container = document.getElementById('entregas-container');
  
    if (!professorId || (role !== 'professor' && role !== 'professor_orientador')) {
        container.innerHTML = '<p>Usuário não autorizado.</p>';
        return;
    }
    try {
      const res = await fetch(`/api/entregas/recebidas?professor_id=${professorId}`);
      const data = await res.json();
  
      if (!data.success || data.entregas.length === 0) {
        container.innerHTML = '<p>Nenhuma entrega encontrada.</p>';
        return;
      }
  
      // data.entregas.forEach(e => {
      //   const card = document.createElement('div');
      //   card.classList.add('entrega-card');
  
      //   card.innerHTML = `
      //     <div class="entrega-info">
      //       <span><strong>Atividade:</strong> ${e.atividade_titulo}</span>
      //       <span><strong>Aluno:</strong> ${e.aluno_nome}</span>
      //       <span><strong>Semestre:</strong> ${e.atividade_semestre}ª</span>
      //       <span><strong>Grupo:</strong> ${e.grupo_nome}</span>
      //       <span><strong>Data da Entrega:</strong> ${new Date(e.data_entrega).toLocaleString('pt-BR')}</span>
      //     </div>
      //     <div class="entrega-acoes">
      //       <a class="link-arquivo" href="/uploads/${e.caminho_arquivo}" target="_blank">Abrir Arquivo</a>
      //       <button class="botao-avaliar" onclick="avaliar(${e.entrega_id})">Avaliar</button>
      //     </div>
      //   `;
  
      //   container.appendChild(card);
      // });
      data.entregas.forEach(e => {
        // 1) Constrói datas zeradas em hora
        const prazo = new Date(e.prazo_entrega);
        prazo.setHours(0,0,0,0);
      
        const hoje = new Date();
        hoje.setHours(0,0,0,0);
      
        // 2) Só pode avaliar se hoje >= prazo
        const podeAvaliar = hoje >= prazo;
      
        // 3) Monta o botão avaliando essa flag
        const botaoAvaliar = document.createElement('button');
        botaoAvaliar.textContent = 'Avaliar';
        botaoAvaliar.classList.add('botao-avaliar');
        if (!podeAvaliar) {
          botaoAvaliar.disabled = true;
          botaoAvaliar.title = 'Só após o prazo de entrega';
        } else {
          botaoAvaliar.addEventListener('click', () => {
            localStorage.setItem('entrega_id', e.entrega_id);
            window.location.href = 'avaliar.html';
          });
        }
      
        // 4) Monta e append o card…
        const card = document.createElement('div');
        card.classList.add('entrega-card');
        card.innerHTML = `
          <div class="entrega-info">
            <span><strong>Atividade:</strong> ${e.atividade_titulo}</span>
            <span><strong>Aluno:</strong> ${e.aluno_nome}</span>
            <span><strong>Semestre:</strong> ${e.atividade_semestre}ª</span>
            <span><strong>Grupo:</strong> ${e.grupo_nome}</span>
            <span><strong>Data da Entrega:</strong> ${new Date(e.data_entrega).toLocaleString('pt-BR')}</span>
            <span><strong>Prazo da Atividade:</strong> ${prazo.toLocaleDateString('pt-BR')}</span>
          </div>
          <div class="entrega-acoes">
           <a class="link-arquivo" href="/uploads/${e.caminho_arquivo}" target="_blank">Abrir Arquivo</a>
          </div>
        `;
        card.querySelector('.entrega-acoes').appendChild(botaoAvaliar);
      
        container.appendChild(card);
      });
      
  
    } catch (err) {
      console.error('Erro ao carregar entregas:', err);
      container.innerHTML = '<p>Erro ao carregar entregas.</p>';
    }
  }
  
  function avaliar(entregaId) {
    localStorage.setItem('entrega_id', entregaId);
    window.location.href = 'avaliar.html';
  }
  