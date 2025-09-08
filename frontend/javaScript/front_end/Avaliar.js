import { ativar } from "../utils/alerts.js";
import { enviarAvaliacao } from "../services/AvaliarService.js";

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
        const res = await enviarAvaliacao({
            entrega_id: parseInt(entregaId),
            professor_id: parseInt(professorId),
            nota,
            comentario
        }, '/api'); // CORRIGIDO: sempre com barra
      
        console.log("Resposta do servidor:", res);
      
        if (res.success) {
          ativar('Nota Registrada com Sucesso!', 'sucesso', 'artefatosEntregues');
        } else {
          mensagem.textContent = res.message || 'Erro ao salvar avaliação.';
        }
      
      } catch (error) {
        console.error('Erro ao enviar avaliação:', error);
        mensagem.textContent = 'Erro ao enviar avaliação.';
      }
    });
  });
  