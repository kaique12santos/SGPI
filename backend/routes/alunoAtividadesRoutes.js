const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// ====================================================================
// ROTA 1: Listar Atividades (Para a página 'Minhas Atividades')
// Migração do `GET /atividades/:semestreId`
// ====================================================================
router.get('/atividades', async (req, res) => {
  const alunoId = req.user?.id; 

  if (!alunoId) {
    return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
  }

  let connection;
  try {
    connection = await getConnection();
    

    const [semestreRows] = await connection.query(`
      SELECT id FROM Semestres WHERE ativo = 1 LIMIT 1
    `);
    
    if (semestreRows.length === 0) {
      return res.json({ success: true, atividades: [] }); 
    }
    const semestreAtivoId = semestreRows[0].id;

    // Esta é a query migrada que fizemos para a lista de tarefas
    const [atividades] = await connection.query(`
      SELECT 
        a.id AS atividade_id,
        a.titulo AS atividade_titulo,
        a.descricao AS atividade_descricao,
        a.prazo_entrega AS atividade_prazo,
        a.data_criacao AS atividade_data_criacao,
        a.nota_maxima,
        d.nome AS disciplina_nome,
        prof.nome AS professor_nome,
        g.id AS grupo_id,
        g.nome AS grupo_nome,
        e.id AS entrega_id,
        e.status AS entrega_status,
        e.data_entrega AS entrega_data,
        av.nota AS avaliacao_nota
      FROM Atividades a
      JOIN Disciplinas_Ofertas do_tbl ON a.oferta_id = do_tbl.id
      JOIN Aluno_Oferta ao ON do_tbl.id = ao.oferta_id
      JOIN Disciplinas d ON do_tbl.disciplina_id = d.id
      LEFT JOIN Usuarios prof ON a.professor_id = prof.id
     LEFT JOIN Usuario_Grupo ug ON ao.aluno_id = ug.usuario_id
      LEFT JOIN Grupos g ON ug.grupo_id = g.id 
            AND g.semestre_id = do_tbl.semestre_id 
      -- A LINHA "AND g.disciplina_id = do_tbl.disciplina_id" FOI REMOVIDA
      -- =======================
            
      LEFT JOIN Entregas e ON e.atividade_id = a.id AND e.grupo_id = g.id
      LEFT JOIN Avaliacoes av ON e.id = av.entrega_id
      WHERE 
        ao.aluno_id = ? 
        AND do_tbl.semestre_id = ?
        AND ao.status = 'Matriculado'
      ORDER BY 
        a.prazo_entrega ASC, a.titulo ASC
    `, [alunoId, semestreAtivoId]);

    return res.json({ success: true, atividades: atividades });

  } catch (err) {
    console.error('Erro ao buscar atividades do aluno:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) connection.release();
  }
});

// ====================================================================
// ROTA 2: Obter Detalhes da Atividade (Para a página 'Entrega')
// Migração do `GET /atividades/:atividadeId/detalhes`
// ====================================================================
router.get('/atividade/:id/detalhes', async (req, res) => {
  const atividadeId = parseInt(req.params.id, 10);
  const alunoId = req.user?.id;

  if (!atividadeId || !alunoId) {
    return res.status(400).json({ success: false, message: 'IDs inválidos.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // Esta é a query migrada que fizemos para a página de entrega
    const [rows] = await connection.query(`
      SELECT 
        a.id, a.titulo, a.descricao, a.nota_maxima, a.prazo_entrega,
        prof.nome AS professor_nome,
        g.id AS grupo_id,
        g.nome AS grupo_nome,
        e.id AS entrega_id,
        e.caminho_arquivo,
        e.nome_arquivo_original,
        e.data_entrega,
        resp.nome AS aluno_responsavel_nome
      FROM Atividades a
      JOIN Disciplinas_Ofertas do_tbl ON a.oferta_id = do_tbl.id
      JOIN Aluno_Oferta ao ON do_tbl.id = ao.oferta_id
      LEFT JOIN Usuarios prof ON a.professor_id = prof.id
      -- ==== CORREÇÃO AQUI ====
      LEFT JOIN Usuario_Grupo ug ON ao.aluno_id = ug.usuario_id
      LEFT JOIN Grupos g ON ug.grupo_id = g.id 
            AND g.semestre_id = do_tbl.semestre_id
      -- A LINHA "AND g.disciplina_id = do_tbl.disciplina_id" FOI REMOVIDA
      -- =======================

      LEFT JOIN Entregas e ON e.atividade_id = a.id AND e.grupo_id = g.id
      LEFT JOIN Usuarios resp ON e.aluno_responsavel_id = resp.id
      WHERE a.id = ? AND ao.aluno_id = ? AND ao.status = 'Matriculado'
    `, [atividadeId, alunoId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Atividade não encontrada ou você não está matriculado nela.' });
    }

    const atividade = rows[0];
    const resposta = {
      atividade: {
        id: atividade.id,
        titulo: atividade.titulo,
        descricao: atividade.descricao,
        nota_maxima: atividade.nota_maxima,
        prazo_entrega: atividade.prazo_entrega,
        professor_nome: atividade.professor_nome,
        grupo_id: atividade.grupo_id,
        grupo_nome: atividade.grupo_nome
      },
      entrega_existente: null
    };

    if (atividade.entrega_id) {
      resposta.entrega_existente = {
        id: atividade.entrega_id,
        caminho_arquivo: atividade.caminho_arquivo,
        nome_arquivo_original: atividade.nome_arquivo_original,
        data_entrega: atividade.data_entrega,
        aluno_responsavel_nome: atividade.aluno_responsavel_nome
      };
    }

    res.json({ success: true, ...resposta });

  } catch (err) {
    console.error('Erro ao buscar detalhes da atividade:', err);
    res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) connection.release();
  }
});

// ====================================================================
// ROTA 3: Enviar/Atualizar Entrega
// Migração do `POST /atividades/:atividadeId/entregar`
// ====================================================================
router.post('/entregas', upload.single('arquivo'), async (req, res) => {
  const atividadeId = parseInt(req.body.atividade_id, 10);
  const alunoId = req.user?.id; 
  const caminhoArquivo = req.file.path;
  const nomeOriginal = req.file.originalname;

  if (!caminhoArquivo) {
    return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const [grupoRows] = await connection.query(`
      SELECT g.id as grupo_id
      FROM Atividades a
      JOIN Disciplinas_Ofertas do_tbl ON a.oferta_id = do_tbl.id
      JOIN Aluno_Oferta ao ON do_tbl.id = ao.oferta_id
      JOIN Usuario_Grupo ug ON ao.aluno_id = ug.usuario_id

      -- ==== CORREÇÃO AQUI ====
      JOIN Grupos g ON ug.grupo_id = g.id 
            AND g.semestre_id = do_tbl.semestre_id
      -- A LINHA "AND g.disciplina_id = do_tbl.disciplina_id" FOI REMOVIDA
      -- =======================

      WHERE a.id = ? AND ao.aluno_id = ?
    `, [atividadeId, alunoId]);

    if (grupoRows.length === 0 || !grupoRows[0].grupo_id) {
      fs.unlinkSync(caminhoArquivo);
      return res.status(403).json({ success: false, message: 'Você não está em um grupo válido para esta atividade.' });
    }
    const grupoId = grupoRows[0].grupo_id;

    const [prazoRows] = await connection.query(`SELECT prazo_entrega FROM Atividades WHERE id = ?`, [atividadeId]);
    if (new Date(prazoRows[0].prazo_entrega) < new Date()) {
      fs.unlinkSync(caminhoArquivo);
      return res.status(400).json({ success: false, message: 'O prazo para esta atividade já encerrou.' });
    }

    const [entregaRows] = await connection.query(
      `SELECT id, caminho_arquivo FROM Entregas WHERE atividade_id = ? AND grupo_id = ?`,
      [atividadeId, grupoId]
    );

    if (entregaRows.length > 0) {
      const entregaAntiga = entregaRows[0];
      await connection.query(
        `UPDATE Entregas SET 
           caminho_arquivo = ?, 
           nome_arquivo_original = ?,
           aluno_responsavel_id = ?, 
           data_entrega = NOW(), 
           status = 'Entregue' 
         WHERE id = ?`,
        [caminhoArquivo, nomeOriginal, alunoId, entregaAntiga.id]
      );
      
      if (entregaAntiga.caminho_arquivo && fs.existsSync(entregaAntiga.caminho_arquivo)) {
        fs.unlinkSync(entregaAntiga.caminho_arquivo);
      }
      res.json({ success: true, message: 'Entrega atualizada com sucesso!' });
      
    } else {
      await connection.query(
        `INSERT INTO Entregas 
           (atividade_id, grupo_id, aluno_responsavel_id, caminho_arquivo,nome_arquivo_original, status, data_entrega)
         VALUES (?, ?, ?, ?,?, 'Entregue', NOW())`,
        [atividadeId, grupoId, alunoId, caminhoArquivo, nomeOriginal,'Entregue', new Date()]
      );
      res.json({ success: true, message: 'Entrega enviada com sucesso!' });
    }
    
  } catch (err) {
    if (caminhoArquivo && fs.existsSync(caminhoArquivo)) {
      fs.unlinkSync(caminhoArquivo);
    }
    console.error('Erro ao processar entrega:', err);
    res.status(500).json({ success: false, message: 'Erro interno do servidor.', error: err.message });
  } finally {
    if (connection) connection.release();
  }
});


// ====================================================================
// ROTA 4: Listar Entregas (Para uma página 'Minhas Entregas')
// Migração do `GET /entregas/:semestreId`
// ====================================================================
router.get('/entregas', async (req, res) => {
  const alunoId = req.user?.id;

  if (!alunoId) {
    return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
  }

  let connection;
  try {
    connection = await getConnection();
    
    // Busca o semestre ativo
    const [semestreRows] = await connection.query(`
      SELECT id FROM Semestres WHERE ativo = 1 LIMIT 1
    `);
    
    if (semestreRows.length === 0) {
      return res.json({ success: true, entregas: [] }); // Sem semestre, sem entregas
    }
    const semestreAtivoId = semestreRows[0].id;

    // Query migrada para usar o semestre_id da oferta
    const [entregas] = await connection.query(`
      SELECT 
        e.id AS entrega_id,
        e.status AS entrega_status,
        e.data_entrega AS entrega_data,
        e.caminho_arquivo AS entrega_arquivo,
        a.id AS atividade_id,
        a.titulo AS atividade_titulo,
        a.prazo_entrega AS atividade_prazo,
        g.nome AS grupo_nome,
        d.nome AS disciplina_nome,
        av.nota AS avaliacao_nota,
        av.comentario AS avaliacao_comentario,
        av.data_avaliacao AS avaliacao_data
      FROM Entregas e
      JOIN Atividades a ON e.atividade_id = a.id
      JOIN Grupos g ON e.grupo_id = g.id
      JOIN Usuario_Grupo ug ON g.id = ug.grupo_id
      LEFT JOIN Disciplinas d ON g.disciplina_id = d.id
      LEFT JOIN Avaliacoes av ON e.id = av.entrega_id
      JOIN Disciplinas_Ofertas do_tbl ON a.oferta_id = do_tbl.id
      WHERE 
        ug.usuario_id = ? 
        AND do_tbl.semestre_id = ?
      ORDER BY e.data_entrega DESC
    `, [alunoId, semestreAtivoId]);
    
    res.json({ success: true, entregas: entregas });

  } catch (err) {
    console.error('Erro ao buscar entregas do aluno:', err);
    res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) connection.release();
  }
});
// ====================================================================
// ROTA 5: Download de Arquivo de Entrega (NOVA)
// ====================================================================
router.get('/entregas/download/:id', async (req, res) => {
  const entregaId = parseInt(req.params.id, 10);
  const alunoId = req.user?.id; // Pego do authPerfil

  if (!entregaId || !alunoId) {
    return res.status(400).json({ success: false, message: 'IDs inválidos.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // 1. Verifica se a entrega existe E se o aluno está no grupo
    const [rows] = await connection.query(`
      SELECT 
        e.caminho_arquivo,
        e.nome_arquivo_original
      FROM Entregas e
      JOIN Usuario_Grupo ug ON e.grupo_id = ug.grupo_id
      WHERE e.id = ? AND ug.usuario_id = ?
    `, [entregaId, alunoId]);

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
    
    // O res.download() cuida de tudo: define o header e envia o arquivo
    res.download(caminhoAbsoluto, nomeOriginal, (err) => {
      if (err) {
        console.error("Erro ao enviar arquivo para download:", err);
      }
    });

  } catch (err) {
    console.error('Erro ao processar download:', err);
    res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) connection.release();
  }
});

// ====================================================================
// ROTA 6: Listar Notas (Migração de 'alunoNotas.js')
// ====================================================================
router.get('/notas', async (req, res) => {
  const alunoId = req.user?.id;

  if (!alunoId) {
    return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // 1. Encontrar o semestre ativo
    const [semestreRows] = await connection.query(`
      SELECT id FROM Semestres WHERE ativo = 1 LIMIT 1
    `);
    
    if (semestreRows.length === 0) {
      return res.json({ success: true, avaliacoes: [] }); // Sem semestre, sem notas
    }
    const semestreAtivoId = semestreRows[0].id;

    // 2. Query migrada para atender ao frontend 'notas.js'
    //    e usar a lógica de 15 dias para reconsideração
    const [avaliacoes] = await connection.query(`
      SELECT 
        av.id,
        av.nota,
        av.comentario,
        av.data_avaliacao,
        av.caminho_arquivo_devolutiva,   -- <-- ADICIONADO
        av.nome_original_devolutiva, -- <-- ADICIONADO
        a.titulo AS atividade,
        r.status AS status_reconsideracao,
        (DATEDIFF(NOW(), av.data_avaliacao) <= 15) AS dentro_prazo
      FROM Avaliacoes av
      -- ... (joins) ...
      INNER JOIN Entregas e ON av.entrega_id = e.id
      INNER JOIN Atividades a ON e.atividade_id = a.id
      INNER JOIN Disciplinas_Ofertas do_tbl ON a.oferta_id = do_tbl.id
      INNER JOIN Usuario_Grupo ug ON e.grupo_id = ug.grupo_id
      LEFT JOIN Reconsideracoes r ON av.id = r.avaliacao_id AND r.aluno_id = ug.usuario_id
      WHERE 
        ug.usuario_id = ? 
        AND do_tbl.semestre_id = ?
      ORDER BY av.data_avaliacao DESC
    `, [alunoId, semestreAtivoId]);
    
    res.json({ success: true, avaliacoes: avaliacoes });

  } catch (err) {
    console.error('Erro ao buscar notas do aluno:', err);
    res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) connection.release();
  }
});

// ====================================================================
// ROTA 7: Pedir Reconsideração (Migração de 'alunoNotas.js')
// ====================================================================
router.post('/reconsiderar', async (req, res) => {
  const alunoId = req.user?.id;
  const { avaliacao_id, comentario } = req.body;

  if (!alunoId || !avaliacao_id || !comentario?.trim()) {
    return res.status(400).json({ success: false, message: 'Parâmetros inválidos.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // 1. Verificar se a avaliação pertence ao aluno
    const [verificarRows] = await connection.query(`
      SELECT av.id
      FROM Avaliacoes av
      INNER JOIN Entregas e ON av.entrega_id = e.id
      INNER JOIN Usuario_Grupo ug ON e.grupo_id = ug.grupo_id
      WHERE av.id = ? AND ug.usuario_id = ?
    `, [avaliacao_id, alunoId]);
    
    if (verificarRows.length === 0) {
      return res.status(403).json({ success: false, message: 'Avaliação não encontrada ou sem permissão.' });
    }

    // ==== CORREÇÃO AQUI: Dividir a query em duas ====
    
    // 2a. Primeira chamada: Executa a procedure
    await connection.query(
      `CALL sp_verificar_prazo_reconsideracao(?, @p_pode_pedir);`,
      [avaliacao_id]
    );
    
    // 2b. Segunda chamada: Busca o valor da variável
    const [prazoResult] = await connection.query(`SELECT @p_pode_pedir AS pode_pedir;`);
    const podePedir = prazoResult[0].pode_pedir;
    // ===============================================
    
    if (podePedir === 0) {
      return res.status(400).json({ success: false, message: 'Fora do prazo para pedir reconsideração (limite de 15 dias).' });
    }

    // 3. Inserir a reconsideração
    await connection.query(
      `INSERT INTO Reconsideracoes (avaliacao_id, aluno_id, motivo, status)
       VALUES (?, ?, ?, 'Pendente')`,
      [avaliacao_id, alunoId, comentario.trim()]
    );
    
    // O trigger 'notificar_reconsideracao' cuida do alerta
    res.json({ success: true, message: 'Solicitação de reconsideração enviada com sucesso.' });

  } catch (err) {
    console.error('Erro ao solicitar reconsideração:', err);
    if (err.code === 'ER_DUP_ENTRY' || err.message.includes('reconsideracoes_avaliacao_id_aluno_id_key')) {
        return res.status(409).json({ success: false, message: 'Você já solicitou uma reconsideração para esta nota.' });
    }
    res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) await connection.release();
  }
});

// ====================================================================
// ROTA 8: Estatísticas de Notas (Migração de 'alunoNotas.js')
// ====================================================================
router.get('/notas/estatisticas', async (req, res) => {
  const alunoId = req.user?.id;

  if (!alunoId) {
    return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const [semestreRows] = await connection.query(`
      SELECT id FROM Semestres WHERE ativo = 1 LIMIT 1
    `);
    
    if (semestreRows.length === 0) {
      return res.json({ success: true, estatisticas: { geral: {}, por_disciplina: [] } });
    }
    const semestreAtivoId = semestreRows[0].id;

    // Query migrada
    const [rows] = await connection.query(`
      SELECT 
        d.nome AS disciplina_nome,
        AVG(av.nota) AS media_disciplina,
        COUNT(av.id) AS total_avaliacoes_disciplina,
        MAX(av.nota) AS nota_maxima_disciplina,
        MIN(av.nota) AS nota_minima_disciplina
      FROM Avaliacoes av
      INNER JOIN Entregas e ON av.entrega_id = e.id
      INNER JOIN Atividades a ON e.atividade_id = a.id
      INNER JOIN Disciplinas_Ofertas do_tbl ON a.oferta_id = do_tbl.id
      INNER JOIN Usuario_Grupo ug ON e.grupo_id = ug.grupo_id
      LEFT JOIN Disciplinas d ON do_tbl.disciplina_id = d.id
      WHERE ug.usuario_id = ? AND do_tbl.semestre_id = ?
      GROUP BY d.id, d.nome
      ORDER BY d.nome
    `, [alunoId, semestreAtivoId]);

    // Calcular estatísticas gerais
    const [geralRows] = await connection.query(`
      SELECT 
        COUNT(*) AS total_avaliacoes,
        AVG(av.nota) AS media_geral,
        MAX(av.nota) AS nota_maxima,
        MIN(av.nota) AS nota_minima
      FROM Avaliacoes av
      INNER JOIN Entregas e ON av.entrega_id = e.id
      INNER JOIN Atividades a ON e.atividade_id = a.id
      INNER JOIN Disciplinas_Ofertas do_tbl ON a.oferta_id = do_tbl.id
      INNER JOIN Usuario_Grupo ug ON e.grupo_id = ug.grupo_id
      WHERE ug.usuario_id = ? AND do_tbl.semestre_id = ?
    `, [alunoId, semestreAtivoId]);

    res.json({ 
      success: true, 
      estatisticas: {
        geral: geralRows[0] || {},
        por_disciplina: rows
      }
    });

  } catch (err) {
    console.error('Erro ao buscar estatísticas das notas:', err);
    res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) await connection.release();
  }
});

// ====================================================================
// ROTA 9: Listar Reconsiderações (Migração de 'alunoNotas.js')
// ====================================================================
router.get('/reconsideracoes', async (req, res) => {
  const alunoId = req.user?.id;

  if (!alunoId) {
    return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
  }

  let connection;
  try {
    connection = await getConnection();

    const [semestreRows] = await connection.query(`
      SELECT id FROM Semestres WHERE ativo = 1 LIMIT 1
    `);
    
    if (semestreRows.length === 0) {
      return res.json({ success: true, reconsideracoes: [] });
    }
    const semestreAtivoId = semestreRows[0].id;

    // Query migrada
    const [rows] = await connection.query(`
      SELECT 
        r.id AS reconsideracao_id,
        r.motivo AS reconsideracao_motivo,
        r.status AS reconsideracao_status,
        r.resposta AS reconsideracao_resposta,
        r.data_solicitacao AS reconsideracao_data_solicitacao,
        r.data_resposta AS reconsideracao_data_resposta,
        av.nota AS avaliacao_nota,
        av.comentario AS avaliacao_comentario,
        a.titulo AS atividade_titulo,
        d.nome AS disciplina_nome
      FROM Reconsideracoes r
      INNER JOIN Avaliacoes av ON r.avaliacao_id = av.id
      INNER JOIN Entregas e ON av.entrega_id = e.id
      INNER JOIN Atividades a ON e.atividade_id = a.id
      INNER JOIN Disciplinas_Ofertas do_tbl ON a.oferta_id = do_tbl.id
      LEFT JOIN Disciplinas d ON do_tbl.disciplina_id = d.id
      WHERE r.aluno_id = ? AND do_tbl.semestre_id = ?
      ORDER BY r.data_solicitacao DESC
    `, [alunoId, semestreAtivoId]);
    
    res.json({ success: true, reconsideracoes: rows });

  } catch (err) {
    console.error('Erro ao buscar reconsiderações:', err);
    res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) await connection.release();
  }
});

// ====================================================================
// ROTA 10: Download de Arquivo de Devolutiva (NOVA)
// ====================================================================
router.get('/avaliacoes/download/:id', async (req, res) => {
  const avaliacaoId = parseInt(req.params.id, 10);
  const alunoId = req.user?.id; // Pego do authPerfil

  if (!avaliacaoId || !alunoId) {
    return res.status(400).json({ success: false, message: 'IDs inválidos.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // 1. Verifica se a avaliação existe E se o aluno está no grupo
    const [rows] = await connection.query(`
      SELECT 
        av.caminho_arquivo_devolutiva,
        av.nome_original_devolutiva
      FROM Avaliacoes av
      JOIN Entregas e ON av.entrega_id = e.id
      JOIN Usuario_Grupo ug ON e.grupo_id = ug.grupo_id
      WHERE av.id = ? AND ug.usuario_id = ?
    `, [avaliacaoId, alunoId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Arquivo de avaliação não encontrado ou você não tem permissão para baixá-lo.' });
    }

    const avaliacao = rows[0];
    
    if (!avaliacao.caminho_arquivo_devolutiva) {
       return res.status(404).json({ success: false, message: 'O professor não anexou um arquivo de devolutiva.' });
    }

    const caminhoAbsoluto = path.resolve(avaliacao.caminho_arquivo_devolutiva);

    // 2. Verifica se o arquivo existe no disco
    if (!fs.existsSync(caminhoAbsoluto)) {
      return res.status(404).json({ success: false, message: 'Arquivo não encontrado no servidor.' });
    }

    // 3. Força o download com o nome original
    const nomeOriginal = avaliacao.nome_original_devolutiva || path.basename(caminhoAbsoluto);
    
    res.download(caminhoAbsoluto, nomeOriginal, (err) => {
      if (err) {
        console.error("Erro ao enviar arquivo de devolutiva:", err);
      }
    });

  } catch (err) {
    console.error('Erro ao processar download de devolutiva:', err);
    res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  } finally {
    if (connection) connection.release();
  }
});
// ====================================================================
// Middleware de Erro do Multer
// ====================================================================
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: `Erro de upload: ${err.message}. Limite de 10MB.` });
  } else if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
});

module.exports = router;