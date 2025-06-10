import { ativar } from "./alerts.js";

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-avaliacao');
    const entregaId = localStorage.getItem('entrega_id');
    const professorId = localStorage.getItem('usuarioId');
    const mensagem = document.getElementById('mensagem');
  
    if (!entregaId || !professorId) {
      mensagem.textContent = 'Erro: entrega ou usuário não definido.';
      return;
    }
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const nota = parseFloat(document.getElementById('nota').value);
      const comentario = document.getElementById('comentario').value.trim();
  
      if (isNaN(nota) || nota < 0 || nota > 10 || !comentario) {
        mensagem.textContent = 'Preencha todos os campos corretamente.';
        return;
      }
  
      try {
        const res = await fetch('/api/avaliacoes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entrega_id: parseInt(entregaId),
            professor_id: parseInt(professorId),
            nota,
            comentario
          })
        });
  
        const data = await res.json();
        
        if (data.success) {
          ativar('enviado!','sucesso','artefatosEntregues')
        }
      } catch (error) {
        console.error('Erro ao enviar avaliação:', error);
        mensagem.textContent = 'Erro ao enviar avaliação.';
      }
    });
  });
  