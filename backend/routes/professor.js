const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
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

// Criar atividade
router.post('/atividades', async (req, res) => {
  const {
    titulo,
    descricao,
    professor_id,
    prazo_entrega,
    criterios_avaliacao,
    semestre_id,
    disciplina_id
  } = req.body;

  const connection = await getConnection();

  try {
    if (!titulo || !descricao || !professor_id || !prazo_entrega || !semestre_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Preencha todos os campos obrigatórios.' 
      });
    }

    // Usar a procedure para criar atividade para todos os grupos do semestre
    await connection.execute(
      `CALL criar_atividade_para_semestre(?, ?, ?, ?, ?, ?, ?)`,
      [titulo, descricao, professor_id, prazo_entrega, criterios_avaliacao, semestre_id, disciplina_id]
    );
    
    res.json({
      success: true,
      message: 'Atividade cadastrada com sucesso!'
    });

    // Notificar alunos (não bloqueia a resposta)
    await notificarAlunosSobreAtividade(connection, {
      titulo,
      prazo_entrega,
      semestre_id,
      disciplina_id,
      professor_id
    });

  } catch (error) {
    console.error('Erro ao cadastrar atividade:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro no servidor.', 
      error: error.message 
    });
  } finally {
    if (connection) await connection.end();
  }
});

// Listar atividades do professor
router.get('/atividades', async (req, res) => {
  const connection = await getConnection();

  try {
    const professorId = parseInt(req.query.professor_id, 10);
    if (isNaN(professorId)) return res.status(400).json({ message: 'ID de professor inválido.' });

    const [rows] = await connection.execute(
      `SELECT 
          MIN(a.id) AS id,
          a.titulo,
          a.descricao,
          a.criterios_avaliacao,
          a.prazo_entrega,
          a.semestre_id,
          a.disciplina_id,
          s.periodo as semestre_periodo,
          d.nome as disciplina_nome,
          MIN(a.data_criacao) as data_criacao
      FROM Atividades a
      LEFT JOIN Semestres s ON a.semestre_id = s.id
      LEFT JOIN Disciplinas d ON a.disciplina_id = d.id
      WHERE a.professor_id = ?
      GROUP BY a.titulo, a.descricao, a.criterios_avaliacao, a.prazo_entrega, 
               a.semestre_id, a.disciplina_id, s.periodo, d.nome
      ORDER BY MIN(a.data_criacao) DESC`,
      [professorId]
    );

    const atividades = rows.map(row => ({ 
      id: row.id,
      titulo: row.titulo,
      descricao: row.descricao,  
      criterios_avaliacao: row.criterios_avaliacao,  
      prazo_entrega: row.prazo_entrega,
      semestre_id: row.semestre_id,
      semestre_periodo: row.semestre_periodo,
      disciplina_id: row.disciplina_id,
      disciplina_nome: row.disciplina_nome,
      data_criacao: row.data_criacao
    }));

    res.json(atividades);
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    res.status(500).json({ message: 'Erro ao buscar atividades' });
  } finally {
    if (connection) await connection.end();
  }
});

// Atualizar atividade
router.put('/atividades/:atividadeId', async (req, res) => {
  const connection = await getConnection();

  try {
    const atividadeId = parseInt(req.params.atividadeId, 10);
    const professorId = parseInt(req.body.professor_id, 10);
    
    console.log("ID da atividade recebido:", atividadeId);
    console.log("Dados recebidos:", JSON.stringify(req.body));

    if (isNaN(atividadeId) || isNaN(professorId)) {
      return res.status(400).json({ message: 'ID inválido.' });
    }

    const { titulo, descricao, prazo_entrega, criterios_avaliacao, semestre_id, disciplina_id } = req.body;

    // Verificar permissão
    const [verificacao] = await connection.execute(
      `SELECT COUNT(*) as count FROM Atividades WHERE id = ? AND professor_id = ?`,
      [atividadeId, professorId]
    );

    if (verificacao[0].count === 0) {
      return res.status(404).json({ message: 'Atividade não encontrada ou sem permissão.' });
    }

    // Usar procedure para atualizar atividades relacionadas
    await connection.execute(
      `CALL atualizar_atividades_por_data_criacao(?, ?, ?, ?, ?, ?, ?)`,
      [atividadeId, titulo, descricao, prazo_entrega, criterios_avaliacao, semestre_id, disciplina_id]
    );

    res.json({
      success: true,
      message: 'Atividade atualizada com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao atualizar atividade:', error);
    res.status(500).json({ message: 'Erro no servidor.', error: error.message });
  } finally {
    if (connection) await connection.end();
  }
});

// Excluir atividade
router.delete('/atividades/:atividadeId', async (req, res) => {
  const connection = await getConnection();

  try {
    const atividadeId = parseInt(req.params.atividadeId, 10);
    const professorId = parseInt(req.query.professor_id || req.body.professor_id, 10);

    console.log('🆔 atividadeId:', atividadeId);
    console.log('🧑 professorId:', professorId);

    if (isNaN(atividadeId) || isNaN(professorId)) {
      return res.status(400).json({ message: 'IDs inválidos.' });
    }

    // Verificar permissão
    const [verificacao] = await connection.execute(
      `SELECT COUNT(*) as count FROM Atividades WHERE id = ? AND professor_id = ?`,
      [atividadeId, professorId]
    );

    if (verificacao[0].count === 0) {
      return res.status(403).json({ message: 'Atividade não encontrada ou sem permissão.' });
    }

    // Usar procedure para deletar atividades relacionadas
    await connection.execute(
      `CALL deletar_atividades_por_data_criacao(?)`,
      [atividadeId]
    );

    res.json({
      success: true,
      message: 'Atividades excluídas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir atividade:', error);
    res.status(500).json({ message: 'Erro ao excluir atividade', error: error.message });
  } finally {
    if (connection) await connection.end();
  }
});

// Listar semestres para dropdown
router.get('/semestres', async (req, res) => {
  const connection = await getConnection();

  try {
    const [rows] = await connection.execute(
      `SELECT id, periodo, ano, descricao, ativo
       FROM Semestres
       WHERE ativo = 1
       ORDER BY periodo`
    );

    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar semestres:', error);
    res.status(500).json({ message: 'Erro ao buscar semestres.' });
  } finally {
    if (connection) await connection.end();
  }
});

// Listar disciplinas para dropdown
router.get('/disciplinas', async (req, res) => {
  const connection = await getConnection();

  try {
    const [rows] = await connection.execute(
      `SELECT id, nome, codigo, descricao, ativo
       FROM Disciplinas
       WHERE ativo = 1
       ORDER BY nome`
    );

    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar disciplinas:', error);
    res.status(500).json({ message: 'Erro ao buscar disciplinas.' });
  } finally {
    if (connection) await connection.end();
  }
});

// Função para notificar alunos sobre nova atividade
async function notificarAlunosSobreAtividade(connection, atividade) {
  try {
    // Buscar nome do professor
    const [professorResult] = await connection.execute(
      `SELECT nome FROM Usuarios WHERE id = ?`,
      [atividade.professor_id]
    );

    const nomeProfessor = professorResult[0]?.nome || 'Professor';

    // Buscar nome do semestre e disciplina
    const [infoResult] = await connection.execute(
      `SELECT s.periodo as semestre_periodo, d.nome as disciplina_nome
       FROM Semestres s
       LEFT JOIN Disciplinas d ON d.id = ?
       WHERE s.id = ?`,
      [atividade.disciplina_id, atividade.semestre_id]
    );

    const semestreInfo = infoResult[0]?.semestre_periodo || 'N/A';
    const disciplinaInfo = infoResult[0]?.disciplina_nome || 'N/A';

    // Buscar alunos do semestre
    const [alunosResult] = await connection.execute(
      `SELECT DISTINCT u.id, u.email, u.nome 
       FROM Usuarios u
       JOIN Usuario_Semestre us ON u.id = us.usuario_id
       WHERE u.tipo = 'Aluno' 
       AND us.semestre_id = ?
       AND u.ativo = 1`,
      [atividade.semestre_id]
    );

    for (const aluno of alunosResult) {
      const titulo = `Nova atividade: ${atividade.titulo}`;
      const mensagem = `O professor ${nomeProfessor} publicou a atividade: <strong>${atividade.titulo}</strong><br>
                        Disciplina: ${disciplinaInfo}<br>
                        Semestre: ${semestreInfo}º<br>
                        Prazo de entrega: ${new Date(atividade.prazo_entrega).toLocaleString()}`;

      // Inserir notificação no banco
      await connection.execute(
        `CALL enviar_notificacao(?, ?, ?, ?)`,
        [aluno.id, titulo, mensagem, 'Nova_Atividade']
      );

      // Enviar e-mail
      try {
        await transporter.sendMail({
          from: `SGPI <${process.env.EMAIL_FROM}>`,
          to: aluno.email,
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
                  <p>Olá <strong>${aluno.nome}</strong>,</p>
                  <p>O professor <strong>${nomeProfessor}</strong> publicou uma nova atividade no SGPI:</p>
                  <div style="background:#e0f2fe;padding:10px;border-left:4px solid #3b82f6;margin:16px 0;border-radius:4px;font-weight:bold;">
                    📌 <strong>${atividade.titulo}</strong>
                  </div>
                  <p><strong>Disciplina:</strong> ${disciplinaInfo}</p>
                  <p><strong>Semestre:</strong> ${semestreInfo}º</p>
                  <p><strong>Prazo de entrega:</strong> ${new Date(atividade.prazo_entrega).toLocaleString()}</p>
                  <p>Acesse o sistema SGPI para mais detalhes e entrega.</p>
                </div>
                <div style="text-align:center;font-size:13px;color:#6b7280;margin-top:30px;">
                  Sistema de Gestão de Projetos Integradores - SGPI<br>
                  Este e-mail foi enviado automaticamente. Por favor, não responda.
                </div>
              </div>
            </body>
            </html>`
        });
        console.log(`📧 Notificação enviada para ${aluno.email}`);
      } catch (emailError) {
        console.warn(`❌ Falha ao enviar e-mail para ${aluno.email}:`, emailError.message);
      }
    }

    console.log(`✅ Notificações internas e e-mails enviados para ${alunosResult.length} alunos.`);
  } catch (error) {
    console.error('Erro ao notificar alunos:', error);
  }
}

module.exports = router;