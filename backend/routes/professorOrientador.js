const express = require('express');
const router = express.Router();
const { getConnection, oracledb } = require('../connectOracle.js');
const path = require('path');
const frontendPath = path.join(__dirname, '..', '..', 'frontend');

require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASSWORD
  }, 
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  },
    debug: true
});


// Criar nova atividade
router.post('/atividades', async (req, res) => {
  const {
    titulo,
    descricao,
    professor_id,
    prazo_entrega,
    criterios_avaliacao,
    semestre
  } = req.body;

  const connection = await getConnection();

  try {
    if (!titulo || !descricao || !professor_id || !prazo_entrega || !criterios_avaliacao || !semestre) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios não preenchidos.' });
    }

    await connection.execute(
      `BEGIN
          criar_atividade_para_semestre(:1, :2, :3, TO_TIMESTAMP(:4, 'YYYY-MM-DD"T"HH24:MI:SS'), :5, :6);
       END;`,
      [titulo, descricao, professor_id, prazo_entrega, criterios_avaliacao, semestre],
      { autoCommit: true }
    );

    // Se chegou até aqui, procedure rodou sem erro
    res.json({
      success: true,
      message: 'Atividade cadastrada com sucesso!'
    });

    // notificar alunos pode ser rodado depois
    await notificarAlunosSobreAtividade(connection, {
      titulo,
      prazo_entrega,
      semestre,
      professor_id
    });

  } catch (error) {
    console.error('Erro ao cadastrar atividade:', error);
    res.status(500).json({ success: false, message: 'Erro no servidor.', error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Listar atividades 
router.get('/atividades', async (req, res) => {
  const connection = await getConnection();
  const professorId = parseInt(req.query.professor_id, 10);

  if (isNaN(professorId)) {
    return res.status(400).json({ message: 'ID de professor inválido' });
  }

  try {
    const result = await connection.execute(
      `SELECT 
          MIN(id) AS id,  -- Pega o menor ID (pode ser qualquer função de agregação)
          titulo,
          descricao,
          criterios_avaliacao,
          TO_CHAR(prazo_entrega, 'YYYY-MM-DD"T"HH24:MI') as prazo_entrega,
          semestre
      FROM Atividades
      WHERE professor_id = :professorId
      GROUP BY titulo, descricao, criterios_avaliacao, prazo_entrega, semestre  -- Agrupa as atividades
      ORDER BY MIN(data_criacao) DESC`,
      [professorId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const atividades = result.rows.map(row => ({ 
      id: row.ID,
      titulo: row.TITULO,
      descricao: row.DESCRICAO,  
      criterios_avaliacao: row.CRITERIOS_AVALIACAO,  
      prazo_entrega: row.PRAZO_ENTREGA,
      semestre: row.SEMESTRE
  }));

    res.json(atividades);
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    res.status(500).json({ message: 'Erro ao buscar atividades.' });
  } finally {
    if (connection) await connection.close();
  }
});

// Atualizar atividade
router.put('/atividades/:atividadeId', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();

    const atividadeId = parseInt(req.params.atividadeId, 10);
    const professorId = parseInt(req.body.professor_id, 10);

    console.log('📥 Dados recebidos no body:', req.body);
    console.log('🆔 atividadeId:', atividadeId);
    console.log('🧑 professorId:', professorId);

    if (isNaN(atividadeId) || isNaN(professorId)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const { titulo, descricao, prazo_entrega, criterios_avaliacao, semestre } = req.body;

    // 🔎 Verifica se a atividade pertence ao professor
    const verificacao = await connection.execute(
      `SELECT COUNT(*) as count
         FROM Atividades
        WHERE id = :atividadeId AND professor_id = :professorId`,
      [atividadeId, professorId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (verificacao.rows[0].COUNT === 0) {
      return res.status(404).json({ message: 'Atividade não encontrada ou sem permissão.' });
    }

    // 🔄 Executa a procedure de atualização
    await connection.execute(
      `BEGIN
          atualizar_atividades_por_data_criacao(
            :1, :2, :3, TO_TIMESTAMP(:4, 'YYYY-MM-DD"T"HH24:MI'), :5, :6
          );
       END;`,
      [atividadeId, titulo, descricao, prazo_entrega, criterios_avaliacao, semestre],
      { autoCommit: true }
    );

    // ✅ Faz SELECT para validar se foi atualizada
    const check = await connection.execute(
      `SELECT id, titulo, descricao, semestre, criterios_avaliacao, prazo_entrega
         FROM Atividades
        WHERE id = :atividadeId AND professor_id = :professorId`,
      [atividadeId, professorId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (check.rows.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Atividade atualizada com sucesso!',
        atividade: check.rows[0] // devolve os dados atualizados
      });
    } else {
      return res.status(400).json({ message: 'Erro ao atualizar atividade.' });
    }

  } catch (error) {
    console.error('❌ Erro ao atualizar atividade:', error);
    res.status(500).json({ message: 'Erro no servidor.', error: error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('🔌 Conexão com o Oracle fechada com sucesso.');
      } catch (err) {
        console.error('❌ Erro ao fechar a conexão com o Oracle:', err);
      }
    }
  }
});


// Excluir atividade
router.delete('/atividades/:atividadeId', async (req, res) => {
  const connection = await getConnection();
  const atividadeId = parseInt(req.params.atividadeId, 10);
  const professorId = parseInt(req.query.professor_id, 10);

  if (isNaN(atividadeId) || isNaN(professorId)) {
    return res.status(400).json({ message: 'IDs inválidos.' });
  }

  try {
    const verificacao = await connection.execute(
      `SELECT COUNT(*) as count FROM Atividades
       WHERE id = :atividadeId AND professor_id = :professorId`,
      [atividadeId, professorId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (verificacao.rows[0].COUNT === 0) {
      return res.status(403).json({ message: 'Atividade não encontrada ou sem permissão.' });
    }

    await connection.execute(
      `BEGIN
         deletar_atividades_por_data_criacao(:id);
       END;`,
      { id: atividadeId },
      { autoCommit: true }
    );

    res.json({
      success: true,
      message: 'Atividades excluídas com sucesso'
    });

  } catch (error) {
    console.error('Erro ao excluir atividade:', error);
    res.status(500).json({ message: 'Erro ao excluir atividade', error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});


async function notificarAlunosSobreAtividade(connection, atividade) {
  try {
    
    const professorResult = await connection.execute(
      `SELECT nome FROM Usuarios WHERE id = :id`,
      [atividade.professor_id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const nomeProfessor = professorResult.rows[0]?.NOME || 'Professor';

    const alunosResult = await connection.execute(
      `SELECT id, email, nome FROM Usuarios
       WHERE tipo = 'Aluno' 
       AND semestre = :semestre
       AND ativo = 1`,
      [atividade.semestre],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    for (const aluno of alunosResult.rows) {
      const titulo = `Nova atividade: ${atividade.titulo}`;
      const mensagem = `O professor ${nomeProfessor} publicou a atividade: <strong>${atividade.titulo}</strong><br>
                        Prazo de entrega: ${new Date(atividade.prazo_entrega).toLocaleString()}`;

      await connection.execute(
        `INSERT INTO Notificacoes (usuario_id, titulo, mensagem, tipo) 
         VALUES (:1, :2, :3, 'Nova_Atividade')`,
        [aluno.ID, titulo, mensagem],
        { autoCommit: true }
      );

      try {
        await transporter.sendMail({
          from: `SGPI <${process.env.EMAIL_FROM}>`,
          to: aluno.EMAIL,
          subject: `📢 Nova Atividade - ${atividade.titulo}`,
          html: `
                    <!DOCTYPE html>
                    <html lang="pt-BR">
                    <head><meta charset="UTF-8"><title>Nova Atividade</title></head>
                    <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,sans-serif;">
                      <div style="max-width:600px;margin:40px auto;background:white;padding:30px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                        <div style="background:#2563eb;color:white;padding:16px;border-radius:6px 6px 0 0;text-align:center;font-size:20px;">
                          📘 Nova Atividade Publicada
                        </div>
                        <div style="padding:24px;font-size:16px;color:#374151;">
                          <p>Olá <strong>${aluno.NOME}</strong>,</p>
                          <p>O professor <strong>${nomeProfessor}</strong> publicou uma nova atividade no SGPI:</p>
                          <div style="background:#e0f2fe;padding:10px;border-left:4px solid #3b82f6;margin:16px 0;border-radius:4px;font-weight:bold;">
                            📌 <strong>${atividade.titulo}</strong>
                          </div>
                          <p><strong>Prazo de entrega:</strong> ${new Date(atividade.prazo_entrega).toLocaleString()}</p>
                          <p>Acesse o sistema SGPI para mais detalhes e entrega.</p>
                        </div>
                        <div style="text-align:center;font-size:13px;color:#6b7280;margin-top:30px;">
                          Sistema de Gestão de Projetos Integradores - SGPI<br>
                          Este e-mail foi enviado automaticamente. Por favor, não responda.
                        </div>
                      </div>
                    </body>
                    </html> `
        });
        console.log(`📧 Notificação enviada para ${aluno.EMAIL}`);
      } catch (emailError) {
        console.warn(`❌ Falha ao enviar e-mail para ${aluno.EMAIL}:`, emailError.message);
      }
    }

    console.log(`✅ Notificações internas e e-mails enviados para ${alunosResult.rows.length} alunos.`);
  } catch (error) {
    console.error('Erro ao notificar alunos:', error);
  }
}

module.exports = router;
