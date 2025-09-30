// utils/emailTemplates.js

/**
 * Templates de e-mails do SGPI
 */
module.exports = {
    // ------------------------------
    // Reconsiderações
    // ------------------------------
    reconsideracaoAprovada: (aluno, atividade, resposta, novaNota) => ({
      subject: `📢 Pedido de reconsideração aprovado`,
      html: `
        <p>Olá ${aluno.nome},</p>
        <p>Seu pedido de reconsideração foi <strong>aprovado</strong>.</p>
        <p><strong>Atividade:</strong> ${atividade}</p>
        <p><strong>Resposta do professor:</strong> ${resposta}</p>
        ${novaNota ? `<p><strong>Nova nota:</strong> ${novaNota}</p>` : ''}
        <p>Acesse o SGPI para mais detalhes.</p>
      `
    }),
  
    reconsideracaoNegada: (aluno, atividade, resposta) => ({
      subject: `📢 Pedido de reconsideração negado`,
      html: `
        <p>Olá ${aluno.nome},</p>
        <p>Seu pedido de reconsideração foi <strong>negado</strong>.</p>
        <p><strong>Atividade:</strong> ${atividade}</p>
        <p><strong>Resposta do professor:</strong> ${resposta}</p>
        <p>Acesse o SGPI para mais detalhes.</p>
      `
    }),
  
    // ------------------------------
    // Nova atividade publicada
    // ------------------------------
    novaAtividade: (aluno, professorNome, atividade, disciplina, prazoEntrega) => ({
      subject: `📘 Nova atividade publicada - ${atividade}`,
      html: `
        <p>Olá ${aluno.nome},</p>
        <p>O professor <strong>${professorNome}</strong> publicou uma nova atividade:</p>
        <p><strong>Atividade:</strong> ${atividade}</p>
        <p><strong>Disciplina:</strong> ${disciplina}</p>
        <p><strong>Prazo de entrega:</strong> ${new Date(prazoEntrega).toLocaleString()}</p>
        <p>Acesse o SGPI para visualizar detalhes e realizar a entrega.</p>
      `
    }),
  
    // ------------------------------
    // Feedback de avaliação
    // ------------------------------
    feedbackAvaliacao: (aluno, atividade, nota, comentario) => ({
      subject: `📊 Feedback disponível - ${atividade}`,
      html: `
        <p>Olá ${aluno.nome},</p>
        <p>Você recebeu feedback de sua avaliação na atividade:</p>
        <p><strong>Atividade:</strong> ${atividade}</p>
        <p><strong>Nota:</strong> ${nota !== null ? nota : 'Sem nota atribuída'}</p>
        ${comentario ? `<p><strong>Comentário:</strong> ${comentario}</p>` : ''}
        <p>Acesse o SGPI para mais detalhes.</p>
      `
    }),
  
    // ------------------------------
    // Recuperação de senha
    // ------------------------------
    recuperacaoSenha: (link) => ({
      subject: `🔐 Redefinição de Senha - SGPI`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #2563eb; margin: 0;">🔐 Redefinição de Senha</h2>
            <p style="color: #6b7280; margin: 5px 0;">Sistema de Gestão de Projetos Integradores</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <p style="color: #374151; margin-bottom: 15px;">Você solicitou a redefinição de senha para sua conta no SGPI.</p>
            
            <p style="color: #374151; margin-bottom: 20px;">Clique no botão abaixo para criar uma nova senha:</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${link}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                Redefinir Senha
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">Ou copie e cole o link abaixo no seu navegador:</p>
            <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-size: 12px; color: #4b5563;">
              <a href="${link}" style="color: #2563eb;">${link}</a>
            </p>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              ⚠️ <strong>Este link expira em 1 hora.</strong>
            </p>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 12px;">
            <p>Se você não solicitou a redefinição de senha, ignore este e-mail.</p>
            <p>Este é um e-mail automático, por favor não responda.</p>
          </div>
        </div>
      `
    }),
  
    // ------------------------------
    // Confirmação de senha alterada
    // ------------------------------
    senhaAlterada: () => ({
      subject: `✅ Senha alterada com sucesso - SGPI`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #059669; margin: 0;">✅ Senha Alterada</h2>
            <p style="color: #6b7280; margin: 5px 0;">Sistema de Gestão de Projetos Integradores</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <p style="color: #374151; margin-bottom: 15px;">Sua senha foi alterada com sucesso!</p>
            <p style="color: #374151; margin-bottom: 15px;">Agora você já pode fazer login no SGPI com sua nova senha.</p>
          </div>
          
          <div style="background: #dcfce7; border: 1px solid #16a34a; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="color: #166534; margin: 0; font-size: 14px;">
              🔒 <strong>Sua conta está segura.</strong> Se você não fez esta alteração, entre em contato conosco imediatamente.
            </p>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 12px;">
            <p>Este é um e-mail automático, por favor não responda.</p>
          </div>
        </div>
      `
    })
  };