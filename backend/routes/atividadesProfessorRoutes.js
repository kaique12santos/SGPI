const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');
require('dotenv').config();
const nodemailer = require('nodemailer');

// Configuração do Nodemailer (mantida)
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
  debug: false
});

// ====================================
// NOVAS ROTAS DE ATIVIDADES (CRUD)
// ====================================

/**
 * 1. CRIAR Atividade
 */
router.post('/atividades', async (req, res) => {
  const {
    titulo,
    descricao,
    professor_id,
    prazo_entrega,
    nota_maxima,
    oferta_id
  } = req.body;

  if (!titulo || !descricao || !professor_id || !prazo_entrega || !nota_maxima || !oferta_id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Preencha todos os campos obrigatórios.' 
    });
  }

  let connection; // Definido fora para o finally
  try {
    connection = await getConnection();
    // 2. Verifica se há alunos matriculados na oferta
    const [alunosCheck] = await connection.query(
      `SELECT COUNT(DISTINCT u.id) as total_alunos
       FROM Aluno_Oferta ao
       JOIN Usuarios u ON ao.aluno_id = u.id
       WHERE ao.oferta_id = ?
         AND ao.status = 'Matriculado'
         AND u.ativo = 1`,
      [oferta_id]
    );

    const totalAlunos = alunosCheck[0].total_alunos;

    if (totalAlunos === 0) {
      // 3. Bloqueia a criação se não houver alunos
      return res.status(400).json({
        success: false,
        message: 'Não é possível criar atividade. Não há alunos matriculados nesta disciplina/oferta.'
      });
    }
    
    // CORREÇÃO: Trocado 'execute' por 'query' e mantida a desestruturação
    const [result] = await connection.query(
      `INSERT INTO Atividades 
         (titulo, descricao, professor_id, prazo_entrega, nota_maxima, oferta_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [titulo, descricao, professor_id, prazo_entrega, parseFloat(nota_maxima), parseInt(oferta_id)]
    );
    
    res.status(201).json({
      success: true,
      message: 'Atividade cadastrada com sucesso!',
      insertedId: result.insertId
    });
    await notificarAlunosSobreNovaAtividade(connection, result.insertId);

  } catch (error) {
    console.error('Erro ao cadastrar atividade:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro no servidor.', 
      error: error.message 
    });
  } finally {
    // CORREÇÃO: Trocado 'end' por 'release'
    if (connection) connection.release();
  }
});

/**
 * 2. LISTAR Atividades
 */
router.get('/atividades', async (req, res) => {
  const professorId = parseInt(req.query.professor_id, 10);
  if (isNaN(professorId)) {
    return res.status(400).json({ message: 'ID de professor inválido.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // CORREÇÃO: Trocado 'execute' por 'query' e desestruturação direta
    const [rows] = await connection.query(
      `SELECT 
          a.id,
          a.titulo,
          a.descricao,
          a.nota_maxima,
          a.prazo_entrega,
          a.oferta_id,
          a.data_criacao,
          d.nome as disciplina_nome,
          s.periodo as semestre_periodo,
          s.ano as semestre_ano
      FROM Atividades a
      LEFT JOIN Disciplinas_Ofertas do ON a.oferta_id = do.id
      LEFT JOIN Disciplinas d ON do.disciplina_id = d.id
      LEFT JOIN Semestres s ON do.semestre_id = s.id
      WHERE a.professor_id = ?
      ORDER BY a.data_criacao DESC`,
      [professorId]
    );

    res.json(rows); // 'rows' já é o array de resultados

  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    res.status(500).json({ message: 'Erro ao buscar atividades' });
  } finally {
    // CORREÇÃO: Trocado 'end' por 'release'
    if (connection) connection.release();
  }
});

/**
 * 3. ATUALIZAR Atividade
 */
router.put('/atividades/:atividadeId', async (req, res) => {
  let connection;
  try {
    const atividadeId = parseInt(req.params.atividadeId, 10);
    const professorId = parseInt(req.body.professor_id, 10);

    if (isNaN(atividadeId) || isNaN(professorId)) {
      return res.status(400).json({ message: 'ID inválido.' });
    }

    const { titulo, descricao, prazo_entrega, nota_maxima, oferta_id } = req.body;

    connection = await getConnection();

    // CORREÇÃO: Trocado 'execute' por 'query'
    const [result] = await connection.query(
      `UPDATE Atividades SET 
         titulo = ?, 
         descricao = ?, 
         prazo_entrega = ?, 
         nota_maxima = ?, 
         oferta_id = ?
       WHERE id = ? AND professor_id = ?`,
      [titulo, descricao, prazo_entrega, parseFloat(nota_maxima), parseInt(oferta_id), atividadeId, professorId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Atividade não encontrada ou sem permissão para atualizar.' });
    }

    res.json({
      success: true,
      message: 'Atividade atualizada com sucesso!'
    });
    
    // Dispara notificação (não bloqueia a resposta)
    await notificarAlunosSobreAtualizacao(connection, atividadeId, {
      titulo,
      prazo_entrega
    });
    

  } catch (error) {
    console.error('Erro ao atualizar atividade:', error);
    res.status(500).json({ message: 'Erro no servidor.', error: error.message });
  } finally {
    // CORREÇÃO: Trocado 'end' por 'release'
    if (connection) connection.release();
  }
});

/**
 * 4. EXCLUIR Atividade
 */
router.delete('/atividades/:atividadeId', async (req, res) => {
  let connection;
  try {
    const atividadeId = parseInt(req.params.atividadeId, 10);
    const professorId = parseInt(req.query.professor_id, 10); 

    if (isNaN(atividadeId) || isNaN(professorId)) {
      return res.status(400).json({ message: 'IDs inválidos.' });
    }

    connection = await getConnection();

    // CORREÇÃO: Trocado 'execute' por 'query'
    const [result] = await connection.query(
      `DELETE FROM Atividades WHERE id = ? AND professor_id = ?`,
      [atividadeId, professorId]
    );

    if (result.affectedRows === 0) {
      return res.status(403).json({ message: 'Atividade não encontrada ou sem permissão para excluir.' });
    }

    res.json({
      success: true,
      message: 'Atividade excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir atividade:', error);
    res.status(500).json({ message: 'Erro ao excluir atividade', error: error.message });
  } finally {
    // CORREÇÃO: Trocado 'end' por 'release'
    if (connection) connection.release();
  }
});


// ====================================
// ROTAS AUXILIARES (ESSENCIAL)
// ====================================

/**
 * 5. NOVA ROTA: Listar Ofertas
 */
router.get('/ofertas', async (req, res) => {
    const professorId = parseInt(req.query.professor_id, 10);
    if (isNaN(professorId)) {
      return res.status(400).json({ message: 'ID de professor inválido.' });
    }

    let connection;
    try {
      connection = await getConnection();
      
      // CORREÇÃO: Trocado 'execute' por 'query' e simplificada a desestruturação
      // Para CALL, o 'query' retorna [ [rows], fields ]. As linhas são o primeiro elemento.
      const [rows] = await connection.query(
        `CALL sp_ofertas_professor(?)`,
        [professorId]
      );
      // ==== DEBUGGING: PASSO 3 ====
      // O que a procedure do banco retornou?
      console.log('DADOS DO BD ANTES DE ENVIAR (ROWS):', rows);
      // ============================
      res.json(rows[0]); // 'rows' já é o array de resultados da procedure

    } catch (error) {
      console.error('Erro ao buscar ofertas:', error);
      res.status(500).json({ message: 'Erro ao buscar ofertas.' });
    } finally {
      // CORREÇÃO: Trocado 'end' por 'release'
      if (connection) connection.release();
    }
});

// Adicionando rotas que estavam no 'professor.js' original para manter a consistência
router.get('/semestres', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    // CORREÇÃO: Trocado 'execute' por 'query'
    const [rows] = await connection.query(
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
    if (connection) connection.release();
  }
});

router.get('/disciplinas', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    // CORREÇÃO: Trocado 'execute' por 'query'
    const [rows] = await connection.query(
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
    if (connection) connection.release();
  }
});

// ====================================
// OBSERVER / NOTIFICAÇÃO
// ====================================

/**
 * Função "Observer" para notificar alunos sobre ATUALIZAÇÃO de atividade.
 * Esta função REUTILIZA a conexão passada pela rota PAI.
 * Ela não abre nem fecha a conexão.
 */
async function notificarAlunosSobreAtualizacao(connection, atividadeId, atividade) {
  try {
    // CORREÇÃO: Trocado 'execute' por 'query'
    const [alunosResult] = await connection.query(
      `SELECT 
          u.id, u.email, u.nome,
          a.titulo, a.prazo_entrega,
          prof.nome as professor_nome
       FROM Atividades a
       JOIN Disciplinas_Ofertas do ON a.oferta_id = do.id
       JOIN Aluno_Oferta ao ON ao.oferta_id = do.id
       JOIN Usuarios u ON ao.aluno_id = u.id
       LEFT JOIN Usuarios prof ON a.professor_id = prof.id
       WHERE a.id = ? AND u.tipo = 'Aluno' AND u.ativo = 1 AND ao.status = 'Matriculado'`,
      [atividadeId]
    );

    if (alunosResult.length === 0) {
      console.log('Nenhum aluno matriculado para notificar sobre atualização.');
      return;
    }

    const professorNome = alunosResult[0].professor_nome || 'Professor';

    for (const aluno of alunosResult) {
      const titulo = `Atividade Atualizada: ${atividade.titulo}`;
      const mensagem = `O professor ${professorNome} atualizou a atividade: <strong>${atividade.titulo}</strong><br>
                        Novo prazo de entrega: ${new Date(atividade.prazo_entrega).toLocaleString()}`;

      // Inserir notificação no banco
      // CORREÇÃO: Trocado 'execute' por 'query'
      await connection.query(
        `INSERT INTO Notificacoes (usuario_id, titulo, mensagem) VALUES (?, ?, ?)`,
        [aluno.id, titulo, mensagem]
      );

      // Enviar e-mail (lógica do transporter mantida)
      try {
        await transporter.sendMail({
          from: `SGPI <${process.env.EMAIL_FROM}>`,
          to: aluno.email,
          subject: `🔄 Atividade Atualizada - ${atividade.titulo}`,
          html: `
            <body style="font-family:Arial,sans-serif;background-color:#f3f4f6;">
              <div style="max-width:600px;margin:40px auto;background:white;padding:30px;border-radius:8px;">
                <div style="background:#f59e0b;color:white;padding:16px;border-radius:6px 6px 0 0;text-align:center;font-size:20px;">
                  🔄 Atividade Atualizada
                </div>
                <div style="padding:24px;font-size:16px;color:#374151;">
                  <p>Olá <strong>${aluno.nome}</strong>,</p>
                  <p>O professor <strong>${professorNome}</strong> atualizou a atividade:</p>
                  <div style="background:#fefce8;padding:10px;border-left:4px solid #f59e0b;margin:16px 0;border-radius:4px;font-weight:bold;">
                    📌 <strong>${atividade.titulo}</strong>
                  </div>
                  <p><strong>Novo Prazo de entrega:</strong> ${new Date(atividade.prazo_entrega).toLocaleString()}</p>
                  <p>Acesse o sistema SGPI para mais detalhes.</p>
                </div>
              </div>
            </body>`
        });
        console.log(`📧 Notificação de ATUALIZAÇÃO enviada para ${aluno.email}`);
      } catch (emailError) {
        console.warn(`❌ Falha ao enviar e-mail de ATUALIZAÇÃO para ${aluno.email}:`, emailError.message);
      }
    }
  } catch (error) {
    console.error('Erro ao notificar alunos sobre atualização:', error);
  }
}

async function notificarAlunosSobreNovaAtividade(connection, atividadeId) {
  try {
    // 1. Buscar informações da atividade e todos os alunos matriculados
    const [alunosResult] = await connection.query(
      `SELECT 
          u.id, u.email, u.nome AS aluno_nome,
          a.titulo, a.prazo_entrega,
          prof.nome AS professor_nome,
          d.nome AS disciplina_nome,
          s.periodo AS semestre_periodo,
          s.ano AS semestre_ano
       FROM Atividades a
       JOIN Disciplinas_Ofertas do_tbl ON a.oferta_id = do_tbl.id
       JOIN Disciplinas d ON do_tbl.disciplina_id = d.id
       JOIN Semestres s ON do_tbl.semestre_id = s.id
       JOIN Aluno_Oferta ao ON ao.oferta_id = do_tbl.id
       JOIN Usuarios u ON ao.aluno_id = u.id
       LEFT JOIN Usuarios prof ON a.professor_id = prof.id
       WHERE a.id = ? 
         AND u.tipo = 'Aluno' 
         AND u.ativo = 1 
         AND ao.status = 'Matriculado'`,
      [atividadeId]
    );

    if (alunosResult.length === 0) {
      console.log('Nenhum aluno matriculado para notificar sobre nova atividade.');
      return;
    }

    // Pega os dados da atividade (são iguais para todos os alunos)
    const { professor_nome, disciplina_nome, semestre_periodo, semestre_ano, titulo, prazo_entrega } = alunosResult[0];

    // 2. Envia e-mail para cada aluno
    for (const aluno of alunosResult) {
      try {
        await transporter.sendMail({
          from: `SGPI <${process.env.EMAIL_FROM}>`,
          to: aluno.email,
          subject: `📢 Nova Atividade - ${titulo}`,
          html: `
            <body style="font-family:Arial,sans-serif;background-color:#f3f4f6;">
              <div style="max-width:600px;margin:40px auto;background:white;padding:30px;border-radius:8px;">
                <div style="background:#2563eb;color:white;padding:16px;border-radius:6px 6px 0 0;text-align:center;font-size:20px;">
                  📘 Nova Atividade Publicada
                </div>
                <div style="padding:24px;font-size:16px;color:#374151;">
                  <p>Olá <strong>${aluno.aluno_nome}</strong>,</p>
                  <p>O professor <strong>${professor_nome || 'Professor'}</strong> publicou uma nova atividade no SGPI:</p>
                  <div style="background:#e0f2fe;padding:10px;border-left:4px solid #3b82f6;margin:16px 0;border-radius:4px;font-weight:bold;">
                    📌 <strong>${titulo}</strong>
                  </div>
                  <p><strong>Disciplina:</strong> ${disciplina_nome}</p>
                  <p><strong>Semestre:</strong> ${semestre_periodo}º / ${semestre_ano}</p>
                  <p><strong>Prazo de entrega:</strong> ${new Date(prazo_entrega).toLocaleString()}</p>
                  <p>Acesse o sistema SGPI para mais detalhes e entrega.</p>
                </div>
              </div>
            </body>`
        });
        console.log(`📧 E-mail de NOVA atividade enviado para ${aluno.email}`);
      } catch (emailError) {
        console.warn(`❌ Falha ao enviar e-mail de NOVA atividade para ${aluno.email}:`, emailError.message);
      }
    }

    console.log(`✅ E-mails de NOVA atividade enviados para ${alunosResult.length} alunos.`);
  } catch (error) {
    console.error('Erro ao notificar alunos sobre nova atividade:', error);
  }
}

module.exports = router;