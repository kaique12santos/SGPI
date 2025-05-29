document.addEventListener('DOMContentLoaded', async () => {
  const professorId = localStorage.getItem('usuarioId');
  const container = document.getElementById('lista-reconsideracoes');

  try {
    const res = await fetch(`/api/professor/reconsideracoes?professor_id=${professorId}`);
    const data = await res.json();

    if (!data.success || data.reconsideracoes.length === 0) {
      container.innerHTML = '<p>Sem pedidos de reconsideração pendentes.</p>';
      return;
    }

    data.reconsideracoes.forEach(item => {
      const div = document.createElement('div');
      div.className = 'card';

      div.innerHTML = `
        <strong>Aluno:</strong> ${item.ALUNO_NOME}<br>
        <strong>Atividade:</strong> ${item.ATIVIDADE}<br>
        <strong>Nota Atual:</strong> ${item.NOTA}<br>
        <strong>Comentário do Professor:</strong> ${item.COMENTARIO || 'Nenhum'}<br>
        <strong>Motivo do Aluno:</strong> ${item.MOTIVO}<br>
        <label>Resposta do Professor:</label>
        <textarea class="resposta" placeholder="Digite sua resposta..."></textarea>
        <label>Nova Nota (opcional):</label>
        <input type="number" class="nova-nota" min="0" max="10" step="0.1" />
        <button class="aprovar">Aprovar</button>
        <button class="recusar">Recusar</button>
      `;

      // Evento para aprovar
      div.querySelector('.aprovar').onclick = async () => {
        const resposta = div.querySelector('.resposta').value.trim();
        const notaStr = div.querySelector('.nova-nota').value.trim();
        const novaNota = notaStr === '' ? null : Number(notaStr);

        if (novaNota !== null && (isNaN(novaNota) || novaNota < 0 || novaNota > 10)) {
          alert('Nota inválida. Use um valor entre 0 e 10.');
          return;
        }

        console.log('Enviando:', { id: item.ID, novaNota, resposta });

        const res = await fetch(`/api/professor/reconsideracoes/${item.ID}/aprovar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resposta, novaNota })
        });

        alert((await res.json()).message);
        div.remove();
      };

      // Evento para recusar
      div.querySelector('.recusar').onclick = async () => {
        const resposta = div.querySelector('.resposta').value.trim();

        const res = await fetch(`/api/professor/reconsideracoes/${item.ID}/recusar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resposta })
        });

        alert((await res.json()).message);
        div.remove();
      };

      container.appendChild(div);
    });
  } catch (err) {
    console.error('Erro ao buscar reconsiderações:', err);
    container.innerHTML = '<p>Erro ao carregar reconsiderações.</p>';
  }
});
