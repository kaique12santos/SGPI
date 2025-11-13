import { ativar } from "../utils/alerts.js";
import { enviarAvaliacao } from "../services/AvaliarService.js";

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-avaliacao');
    const entregaId = localStorage.getItem('entrega_id');
    const role = localStorage.getItem('userRole') || 'professor';
    const baseEndpoint = (role === "professor_orientador") ? "/professor_orientador" : "/professor";
  
    if (!entregaId) {
      ativar('Erro: ID da entrega não definido. Volte e selecione a entrega novamente.', 'erro', '');
      form.querySelector('button').disabled = true;
      return;
    }
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const notaInput = document.getElementById('nota');
      const comentarioInput = document.getElementById('comentario');
      const arquivoInput = document.getElementById('arquivo-devolutiva');
      
      const nota = parseFloat(notaInput.value);
      const comentario = comentarioInput.value.trim();
      const arquivo = arquivoInput.files[0]; // Pega o arquivo (pode ser undefined)

      // Validação
      if (isNaN(nota) || nota < 0 || !comentario) {
        ativar('Preencha a Nota e o Comentário. A nota não pode ser negativa.', 'erro', '');
        return;
      }
      
      // ---- LÓGICA DE UPLOAD ALTERADA ----
      // 1. Criar FormData
      const formData = new FormData();
      formData.append('entrega_id', entregaId);
      formData.append('nota', nota);
      formData.append('comentario', comentario);
      
      // 2. Adiciona o arquivo SOMENTE se ele foi selecionado
      if (arquivo) {
        formData.append('arquivo_devolutiva', arquivo);
      }
      // ---------------------------------

      try {
        // 3. Enviar FormData
        const res = await enviarAvaliacao(formData, baseEndpoint); 
      
        // 4. O 'fetchFormDataComAuth' retorna a *resposta*, não o JSON
        // Precisamos ler o JSON dela
        const resultJson = await res.json();

        if (res.ok && resultJson.success) {
          ativar('Nota Registrada com Sucesso!', 'sucesso', 'artefatosEntregues');
        } else {
          // Exibe a mensagem de erro específica do backend
          ativar(resultJson.message || 'Erro ao salvar avaliação.', 'erro', '');
        }
      
      } catch (error) {
        console.error('Erro ao enviar avaliação:', error);
        // Tenta ler a mensagem de erro do 'error'
        ativar(error.message || 'Erro de conexão ao enviar avaliação.', 'erro', '');
      }
    });
});