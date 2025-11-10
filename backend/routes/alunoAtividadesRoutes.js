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
    cb(null, `${timestamp}-${file.originalname}`);
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
        g.id AS grupo_id, g.nome AS grupo_nome,
        e.id AS entrega_id, e.caminho_arquivo, e.data_entrega,
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
  const caminhoArquivo = req.file ? req.file.path : null;

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
           aluno_responsavel_id = ?, 
           data_entrega = NOW(), 
           status = 'Entregue' 
         WHERE id = ?`,
        [caminhoArquivo, alunoId, entregaAntiga.id]
      );
      
      if (entregaAntiga.caminho_arquivo && fs.existsSync(entregaAntiga.caminho_arquivo)) {
        fs.unlinkSync(entregaAntiga.caminho_arquivo);
      }
      res.json({ success: true, message: 'Entrega atualizada com sucesso!' });
      
    } else {
      await connection.query(
        `INSERT INTO Entregas 
           (atividade_id, grupo_id, aluno_responsavel_id, caminho_arquivo, status, data_entrega)
         VALUES (?, ?, ?, ?, 'Entregue', NOW())`,
        [atividadeId, grupoId, alunoId, caminhoArquivo]
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