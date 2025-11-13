const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');
require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const emailTemplates = require('../utils/emailTemplates.js');
const notificationUtils = require('../utils/notificationUtils.js');
const multer = require('multer');

// ====================================================================
// Configuração do Upload (Multer)
// ====================================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    cb(null, `${timestamp}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  const filetypes = /pdf|doc|docx|xls|xlsx|zip|rar|ppt|pptx/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error(`Erro: O tipo de arquivo não é suportado. Apenas ${filetypes} são permitidos.`));
};

const limits = {
  fileSize: 10 * 1024 * 1024 // 10MB
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: limits
});

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


// ====================================================================
// ROTA: Listar Entregas para Avaliação (Migração)
// ====================================================================
router.get('/entregas-para-avaliar', async (req, res) => {
  let connection;
  try {
    const professorId = parseInt(req.query.professor_id, 10);
    console.log("Professor ID recebido:", professorId);

    if (isNaN(professorId)) {
      return res.status(400).json({ success: false, message: 'ID do professor inválido.' });
    }

    connection = await getConnection();

    // Query Migrada: Busca entregas baseadas no professor_responsavel da OFERTA
    // Esta lógica é baseada na sua view 'v_entregas_para_avaliar'
    const sql = `
      SELECT 
        e.id AS entrega_id,
        g.nome AS grupo_nome,
        u.nome AS aluno_responsavel_nome,
        a.titulo AS atividade_titulo,
        d.nome AS disciplina_nome,
        s.periodo AS semestre_periodo,
        s.ano AS semestre_ano,
        e.caminho_arquivo,
        e.nome_arquivo_original,
        e.data_entrega,
        a.prazo_entrega
      FROM Entregas e
      JOIN Atividades a ON e.atividade_id = a.id
      JOIN Disciplinas_Ofertas do_tbl ON a.oferta_id = do_tbl.id
      JOIN Grupos g ON e.grupo_id = g.id
      JOIN Usuarios u ON e.aluno_responsavel_id = u.id
      JOIN Disciplinas d ON do_tbl.disciplina_id = d.id
      JOIN Semestres s ON do_tbl.semestre_id = s.id
      WHERE 
        do_tbl.professor_responsavel = ? 
        AND e.status IN ('Entregue', 'Vencida')
        AND NOT EXISTS (SELECT 1 FROM Avaliacoes av WHERE av.entrega_id = e.id)
      ORDER BY e.data_entrega DESC
    `;

    const [rows] = await connection.query(sql, [professorId]);

    res.json({ success: true, entregas: rows });

  } catch (error) {
    console.error('Erro ao buscar entregas recebidas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar entregas recebidas.',
      error: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// ====================================================================
// ROTA: Avaliar Entrega (Migração)
// =DDE (POST /professor/avaliacoes ou /professor_orientador/avaliacoes)
// ====================================================================
router.post('/avaliacoes', upload.single('arquivo_devolutiva'), async (req, res) => {
  const professorId = req.user?.id; 
  
  // Dados agora vêm do req.body (FormData)
  const { entrega_id, nota, comentario } = req.body;
  
  // O arquivo (opcional) vem do req.file
  const arquivo = req.file;

  if (!entrega_id || !professorId || nota == null || comentario == null) {
    // Se a validação falhar, deleta o arquivo que o multer salvou
    if (arquivo) fs.unlinkSync(arquivo.path);
    return res.status(400).json({ success: false, message: 'Campos obrigatórios faltando.' });
  }

  const notaFloat = parseFloat(nota);
  let connection;

  try {
    connection = await getConnection();

    // ---- VALIDAÇÃO DA NOTA MÁXIMA (Lógica existente) ----
    const [rows] = await connection.query(`
      SELECT a.nota_maxima, do_tbl.professor_responsavel
      FROM Entregas e
      JOIN Atividades a ON e.atividade_id = a.id
      JOIN Disciplinas_Ofertas do_tbl ON a.oferta_id = do_tbl.id
      WHERE e.id = ?
    `, [entrega_id]);

    if (rows.length === 0) {
      if (arquivo) fs.unlinkSync(arquivo.path);
      return res.status(404).json({ success: false, message: 'Entrega não encontrada.' });
    }

    const { nota_maxima, professor_responsavel } = rows[0];

    if (professor_responsavel !== professorId) {
      if (arquivo) fs.unlinkSync(arquivo.path);
      return res.status(403).json({ success: false, message: 'Você não tem permissão para avaliar esta entrega.' });
    }

    if (notaFloat < 0 || notaFloat > nota_maxima) {
      if (arquivo) fs.unlinkSync(arquivo.path);
      return res.status(400).json({ 
        success: false, 
        message: `A nota deve estar entre 0 e ${nota_maxima}.` 
      });
    }
    // -----------------------------------

    // 4. Insere a avaliação COM os novos campos de arquivo
    const caminhoDevolutiva = arquivo ? arquivo.path : null;
    const nomeOriginalDevolutiva = arquivo ? arquivo.originalname : null;

    await connection.query(
      `INSERT INTO Avaliacoes 
         (entrega_id, professor_id, nota, comentario, data_avaliacao, 
          caminho_arquivo_devolutiva, nome_original_devolutiva)
       VALUES (?, ?, ?, ?, NOW(), ?, ?)`,
      [entrega_id, professorId, notaFloat, comentario, caminhoDevolutiva, nomeOriginalDevolutiva]
    );
    
    res.json({ success: true, message: 'Avaliação enviada com sucesso!' });

    // (A lógica de e-mail de avaliação continua funcionando)
    await notificarAlunosSobreAvaliacao(
      connection, 
      entrega_id, 
      notaFloat, 
      comentario
    );

  } catch (error) {
    // Se der erro no banco, deleta o arquivo que o multer salvou
    if (arquivo && fs.existsSync(arquivo.path)) {
      fs.unlinkSync(arquivo.path);
    }
    
    console.error('Erro ao salvar avaliação:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Esta entrega já foi avaliada.' });
    }
    res.status(500).json({ success: false, message: 'Erro ao salvar avaliação.', error: error.message });
  } finally {
    if (connection) await connection.release();
  }
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
// ====================================================================
// ROTA: Download de Entrega (Para o Professor)
// ====================================================================
router.get('/entregas/download/:id', async (req, res) => {
  const entregaId = parseInt(req.params.id, 10);
  const professorId = req.user?.id; // Pego do authPerfil

  if (!entregaId || !professorId) {
    return res.status(400).json({ success: false, message: 'IDs inválidos.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // 1. Verifica se a entrega existe E se o professor é o responsável
    const [rows] = await connection.query(`
      SELECT 
        e.caminho_arquivo,
        e.nome_arquivo_original
      FROM Entregas e
      JOIN Atividades a ON e.atividade_id = a.id
      JOIN Disciplinas_Ofertas do_tbl ON a.oferta_id = do_tbl.id
      WHERE e.id = ? AND do_tbl.professor_responsavel = ?
    `, [entregaId, professorId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Entrega não encontrada ou você não tem permissão para baixá-la.' });
    }

    const entrega = rows[0];
    const caminhoAbsoluto = path.resolve(entrega.caminho_arquivo);

    // 2. Verifica se o arquivo existe no disco
    if (!fs.existsSync(caminhoAbsoluto)) {
      return res.status(404).json({ success: false, message: 'Arquivo não encontrado no servidor.' });
    }

    // 3. Força o download com o nome original
    const nomeOriginal = entrega.nome_arquivo_original || path.basename(entrega.caminho_arquivo);
    
    res.download(caminhoAbsoluto, nomeOriginal, (err) => {
      if (err) {
        console.error("Erro ao enviar arquivo para download (professor):", err);
      }
    });

  } catch (err) {
    console.error('Erro ao processar download (professor):', err);
    res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
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

// ====================================================================
// ROTA: Listar Reconsiderações Pendentes (Migração)
// (GET /professor/reconsideracoes)
// ====================================================================
router.get('/reconsideracoes', async (req, res) => {
  const professorId = req.user?.id;

  if (!professorId) {
    return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // Query migrada: Busca reconsiderações PENDENTES baseadas no professor
    const [rows] = await connection.query(`
      SELECT 
        r.id AS ID,
        u.nome AS ALUNO_NOME,
        a.titulo AS ATIVIDADE,
        av.nota AS NOTA,
        av.comentario AS COMENTARIO,
        r.motivo AS MOTIVO,
        a.nota_maxima -- Importante para validação
      FROM Reconsideracoes r
      JOIN Avaliacoes av ON r.avaliacao_id = av.id
      JOIN Entregas e ON av.entrega_id = e.id
      JOIN Atividades a ON e.atividade_id = a.id
      JOIN Disciplinas_Ofertas do_tbl ON a.oferta_id = do_tbl.id
      JOIN Usuarios u ON r.aluno_id = u.id
      WHERE 
        do_tbl.professor_responsavel = ?
        AND r.status = 'Pendente'
      ORDER BY r.data_solicitacao ASC
    `, [professorId]);

    res.json({ success: true, reconsideracoes: rows });

  } catch (err) {
    console.error('Erro ao buscar reconsiderações:', err);
    res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) connection.release();
  }
});

// ====================================================================
// ROTA: Aprovar Reconsideração (Migração)
// (POST /professor/reconsideracoes/:id/aprovar)
// ====================================================================
router.post('/reconsideracoes/:id/aprovar', async (req, res) => {
  const reconsideracaoId = parseInt(req.params.id, 10);
  const professorId = req.user?.id;
  const { resposta, novaNota } = req.body;

  if (!reconsideracaoId || !professorId || !resposta) {
    return res.status(400).json({ success: false, message: 'Campos obrigatórios faltando.' });
  }

  let connection;
  try {
    connection = await getConnection();
    await connection.beginTransaction();

    // 1. Verifica permissão e pega nota_maxima
    const [checkRows] = await connection.query(`
      SELECT 
        a.nota_maxima, 
        do_tbl.professor_responsavel 
      FROM Reconsideracoes r
      JOIN Avaliacoes av ON r.avaliacao_id = av.id
      JOIN Entregas e ON av.entrega_id = e.id
      JOIN Atividades a ON e.atividade_id = a.id
      JOIN Disciplinas_Ofertas do_tbl ON a.oferta_id = do_tbl.id
      WHERE r.id = ?
    `, [reconsideracaoId]);

    if (checkRows.length === 0 || checkRows[0].professor_responsavel !== professorId) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Sem permissão para esta ação.' });
    }

    const { nota_maxima } = checkRows[0];

    // 2. Atualiza a reconsideração
    await connection.query(
      `UPDATE Reconsideracoes
       SET status = 'Aprovado', resposta = ?, data_resposta = NOW()
       WHERE id = ?`,
      [resposta, reconsideracaoId]
    );

    // 3. Atualiza a nota (se fornecida)
    let notaFinal = null;
    if (novaNota !== null && novaNota !== undefined) {
      notaFinal = parseFloat(novaNota);
      if (isNaN(notaFinal) || notaFinal < 0 || notaFinal > nota_maxima) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: `Nota inválida. Deve ser entre 0 e ${nota_maxima}.` });
      }

      await connection.query(
        `UPDATE Avaliacoes
           SET nota = ?, data_avaliacao = NOW()
         WHERE id = (SELECT avaliacao_id FROM Reconsideracoes WHERE id = ?)`,
        [notaFinal, reconsideracaoId]
      );
    }
    
    // O trigger 'notificar_resposta_reconsideracao'
    // cuida da notificação interna. Agora vamos cuidar do E-MAIL.
    
    // 4. Pega dados para o e-mail
    const [dadosEmail] = await connection.query(
      `SELECT r.aluno_id, a.titulo, u.email, u.nome 
         FROM Reconsideracoes r
         JOIN Avaliacoes av ON r.avaliacao_id = av.id
         JOIN Entregas e ON av.entrega_id = e.id
         JOIN Atividades a ON e.atividade_id = a.id
         JOIN Usuarios u ON r.aluno_id = u.id
        WHERE r.id = ?`,
      [reconsideracaoId]
    );

    await connection.commit(); // Salva as alterações no banco

    // 5. Envia o e-mail (fora da transação)
    if (dadosEmail.length > 0) {
      const aluno = dadosEmail[0];
      // (Reutilizando a lógica do seu arquivo antigo 'professorReconsideracoes.js' para os emails)
      // (Assumindo que 'transporter' está definido no topo deste arquivo)
      try {
        const template = emailTemplates.reconsideracaoAprovada(aluno, aluno.titulo, resposta, notaFinal);
        await transporter.sendMail({
          from: `SGPI <${process.env.EMAIL_FROM}>`,
          to: aluno.email,
          subject: template.subject,
          html: template.html
        });
      } catch (emailError) {
        console.warn(`[AVISO] Falha ao enviar e-mail de aprovação: ${emailError.message}`);
      }
    }

    res.json({ success: true, message: 'Pedido aprovado com sucesso.' });

  } catch (err) {
    await connection.rollback();
    console.error('Erro ao aprovar reconsideração:', err);
    res.status(500).json({ success: false, message: 'Erro ao aprovar pedido.' });
  } finally {
    if (connection) connection.release();
  }
});

// ====================================================================
// ROTA: Recusar Reconsideração (Migração)
// (POST /professor/reconsideracoes/:id/recusar)
// ====================================================================
router.post('/reconsideracoes/:id/recusar', async (req, res) => {
  const reconsideracaoId = parseInt(req.params.id, 10);
  const professorId = req.user?.id;
  const { resposta } = req.body;

  if (!reconsideracaoId || !professorId || !resposta) {
    return res.status(400).json({ success: false, message: 'Campos obrigatórios faltando.' });
  }

  let connection;
  try {
    connection = await getConnection();
    await connection.beginTransaction();

    // 1. Verifica permissão
    const [checkRows] = await connection.query(`
      SELECT do_tbl.professor_responsavel 
      FROM Reconsideracoes r
      JOIN Avaliacoes av ON r.avaliacao_id = av.id
      JOIN Entregas e ON av.entrega_id = e.id
      JOIN Atividades a ON e.atividade_id = a.id
      JOIN Disciplinas_Ofertas do_tbl ON a.oferta_id = do_tbl.id
      WHERE r.id = ?
    `, [reconsideracaoId]);

    if (checkRows.length === 0 || checkRows[0].professor_responsavel !== professorId) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Sem permissão para esta ação.' });
    }

    // 2. Atualiza a reconsideração
    await connection.query(
      `UPDATE Reconsideracoes
       SET status = 'Negado', resposta = ?, data_resposta = NOW()
       WHERE id = ?`,
      [resposta, reconsideracaoId]
    );

    // 3. Pega dados para o e-mail
    const [dadosEmail] = await connection.query(
      `SELECT r.aluno_id, a.titulo, u.email, u.nome 
         FROM Reconsideracoes r
         JOIN Avaliacoes av ON r.avaliacao_id = av.id
         JOIN Entregas e ON av.entrega_id = e.id
         JOIN Atividades a ON e.atividade_id = a.id
         JOIN Usuarios u ON r.aluno_id = u.id
        WHERE r.id = ?`,
      [reconsideracaoId]
    );
    
    await connection.commit();

    // 4. Envia o e-mail (fora da transação)
    if (dadosEmail.length > 0) {
      const aluno = dadosEmail[0];
      try {
        const template = emailTemplates.reconsideracaoNegada(aluno, aluno.titulo, resposta);
        await transporter.sendMail({
          from: `SGPI <${process.env.EMAIL_FROM}>`,
          to: aluno.email,
          subject: template.subject,
          html: template.html
        });
      } catch (emailError) {
         console.warn(`[AVISO] Falha ao enviar e-mail de recusa: ${emailError.message}`);
      }
    }
    
    res.json({ success: true, message: 'Pedido negado com sucesso.' });
    
  } catch (err) {
    await connection.rollback();
    console.error('Erro ao negar reconsideração:', err);
    res.status(500).json({ success: false, message: 'Erro ao negar pedido.' });
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

/**
 * NOVA FUNÇÃO: Notificar alunos sobre AVALIAÇÃO de atividade por e-mail.
 */
async function notificarAlunosSobreAvaliacao(connection, entregaId, nota, comentario) {
  try {
    // 1. Buscar informações da atividade e todos os membros do grupo
    const [alunosResult] = await connection.query(
      `SELECT 
          u.id, u.email, u.nome AS aluno_nome,
          a.titulo AS atividade_titulo,
          prof.nome AS professor_nome
       FROM Entregas e
       JOIN Atividades a ON e.atividade_id = a.id
       JOIN Usuario_Grupo ug ON e.grupo_id = ug.grupo_id
       JOIN Usuarios u ON ug.usuario_id = u.id
       LEFT JOIN Usuarios prof ON a.professor_id = prof.id
       WHERE e.id = ? AND u.tipo = 'Aluno' AND u.ativo = 1`,
      [entregaId]
    );

    if (alunosResult.length === 0) {
      console.log('Nenhum aluno no grupo para notificar sobre avaliação.');
      return;
    }

    const { atividade_titulo, professor_nome } = alunosResult[0];

    // 2. Envia e-mail para cada aluno do grupo
    for (const aluno of alunosResult) {
      try {
        await transporter.sendMail({
          from: `SGPI <${process.env.EMAIL_FROM}>`,
          to: aluno.email,
          subject: `✅ Atividade Avaliada - ${atividade_titulo}`,
          html: `
            <body style="font-family:Arial,sans-serif;background-color:#f3f4f6;">
              <div style="max-width:600px;margin:40px auto;background:white;padding:30px;border-radius:8px;">
                <div style="background:#16a34a;color:white;padding:16px;border-radius:6px 6px 0 0;text-align:center;font-size:20px;">
                  ✅ Atividade Avaliada
                </div>
                <div style="padding:24px;font-size:16px;color:#374151;">
                  <p>Olá <strong>${aluno.aluno_nome}</strong>,</p>
                  <p>A entrega do seu grupo para a atividade <strong>"${atividade_titulo}"</strong> foi avaliada pelo professor <strong>${professor_nome || 'Professor'}</strong>.</p>
                  
                  <div style="background:#f0fdf4;padding:16px;border-left:4px solid #4ade80;margin:16px 0;border-radius:4px;">
                    <p style="margin:0;font-size:1.5rem;font-weight:bold;color:#15803d;">Nota: ${nota.toFixed(1)}</p>
                  </div>
                  
                  <p><strong>Comentários do professor:</strong></p>
                  <blockquote style="margin:0;padding:10px;background:#f8fafc;border-left:4px solid #e2e8f0;color:#475569;">
                    ${comentario || 'Nenhum comentário.'}
                  </blockquote>

                  <p style="margin-top:20px;">Acesse o sistema SGPI para mais detalhes.</p>
                </div>
              </div>
            </body>`
        });
        console.log(`📧 E-mail de AVALIAÇÃO enviado para ${aluno.email}`);
      } catch (emailError) {
        console.warn(`❌ Falha ao enviar e-mail de AVALIAÇÃO para ${aluno.email}:`, emailError.message);
      }
    }

  } catch (error) {
    console.error('Erro ao notificar alunos sobre avaliação:', error);
  }
}

module.exports = router;