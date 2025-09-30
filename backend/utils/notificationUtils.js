// utils/notificationUtils.js

/**
 * Utilitários para notificações internas
 */
module.exports = {
    reconsideracaoAprovada: (atividade, resposta, novaNota) =>
      `Seu pedido de reconsideração para a atividade <strong>${atividade}</strong> foi aprovado.<br>
       Resposta do professor: ${resposta}. 
       ${novaNota ? `<br>Nova nota: ${novaNota}` : ''}`,
  
    reconsideracaoNegada: (atividade, resposta) =>
      `Seu pedido de reconsideração para a atividade <strong>${atividade}</strong> foi negado.<br>
       Resposta do professor: ${resposta}.`,

    // ------------------------------
    // Nova atividade publicada
    // ------------------------------
    novaAtividade: (atividade, disciplina, prazoEntrega, professorNome) =>
        `O professor ${professorNome} publicou uma nova atividade: <strong>${atividade}</strong>.<br>
        Disciplina: ${disciplina}.<br>
        Prazo de entrega: ${new Date(prazoEntrega).toLocaleString()}.`,

    // ------------------------------
    // Feedback de avaliação
    // ------------------------------
    feedbackAvaliacao: (atividade, nota, comentario) =>
        `Você recebeu feedback na atividade <strong>${atividade}</strong>.<br>
        Nota: ${nota !== null ? nota : 'Sem nota atribuída'}.
        ${comentario ? `<br>Comentário: ${comentario}` : ''}`
};