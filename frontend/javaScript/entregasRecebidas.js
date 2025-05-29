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
  
      data.entregas.forEach(e => {
        const card = document.createElement('div');
        card.classList.add('entrega-card');
  
        card.innerHTML = `
          <div class="entrega-info">
            <span><strong>Atividade:</strong> ${e.atividade_titulo}</span>
            <span><strong>Aluno:</strong> ${e.aluno_nome}</span>
            <span><strong>Semestre:</strong> ${e.atividade_semestre}ª</span>
            <span><strong>Grupo:</strong> ${e.grupo_nome}</span>
            <span><strong>Data da Entrega:</strong> ${new Date(e.data_entrega).toLocaleString('pt-BR')}</span>
          </div>
          <div class="entrega-acoes">
            <a class="link-arquivo" href="/uploads/${e.caminho_arquivo}" target="_blank">Abrir Arquivo</a>
            <button class="botao-avaliar" onclick="avaliar(${e.entrega_id})">Avaliar</button>
          </div>
        `;
  
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
  