const express = require('express');
const router = express.Router();
const { getConnection, oracledb } = require('../connectOracle.js');
const path = require('path');
const frontendPath = path.join(__dirname, '..', '..', 'frontend');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Função para converter LOBs para string
function lobToString(lob) {
  return new Promise((resolve, reject) => {
    if (!lob || typeof lob === 'string') return resolve(lob);
    let content = '';
    lob.setEncoding('utf8');
    lob.on('data', chunk => content += chunk);
    lob.on('end', () => resolve(content));
    lob.on('error', err => reject(err));
  });
}

router.post('/api/entregas', upload.single('arquivo'), async (req, res) => {
    const connection = await getConnection();
    const { atividade_id, aluno_id } = req.body;
    const arquivo = req.file;
  
    try {
      if (!arquivo) {
        return res.status(400).json({ success: false, message: 'Arquivo não enviado.' });
      }
  
      const grupoResult = await connection.execute(
        `SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :id`,
        [aluno_id],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
  
      const grupo_id = grupoResult.rows[0]?.GRUPO_ID;
  
      if (!grupo_id) {
        return res.status(404).json({ success: false, message: 'Grupo do aluno não encontrado.' });
      }
  
      await connection.execute(
        `INSERT INTO Entregas (atividade_id, grupo_id, caminho_arquivo, tamanho_arquivo, status)
         VALUES (:atividade_id, :grupo_id, :caminho, :tamanho, 'Entregue')`,
        {
          atividade_id,
          grupo_id,
          caminho: arquivo.originalname, // você pode ajustar para caminho absoluto
          tamanho: arquivo.size
        },
        { autoCommit: true }
      );
  
      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao salvar entrega:', error);
      res.status(500).json({ success: false, message: 'Erro ao salvar entrega.' });
    } finally {
      if (connection) await connection.close();
    }
  });



// Página de listagem de atividades do aluno
router.get('/atividades', (req, res) => {
  return res.sendFile(path.join(frontendPath, 'aluno-atividades.html'));
});

// Página de detalhes da atividade
router.get('/atividade/:id', (req, res) => {
  return res.sendFile(path.join(frontendPath, 'aluno-detalhe-atividade.html'));
});

// API para buscar todas as atividades disponíveis para o aluno
router.get('/api/atividades', async (req, res) => {
  const connection = await getConnection();
  
  try {
    const alunoId = parseInt(req.query.aluno_id, 10);
    
    if (isNaN(alunoId)) {
      return res.status(400).json({ success: false, message: 'ID de aluno inválido.' });
    }
    
    // Primeiro, obter o semestre do aluno
    const semestreResult = await connection.execute(
      `SELECT semestre FROM Usuarios WHERE id = :alunoId AND tipo = 'Aluno'`,
      [alunoId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (semestreResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado.' });
    }
    
    const semestre = semestreResult.rows[0].SEMESTRE;
    
    // Buscar atividades para o semestre do aluno com informações do professor e status de entrega
    const result = await connection.execute(
      `SELECT a.id, a.titulo, a.descricao, a.semestre, 
              TO_CHAR(a.prazo_entrega, 'YYYY-MM-DD"T"HH24:MI:SS') as prazo_entrega,
              a.criterios_avaliacao, a.professor_id,
              p.nome as professor_nome,
              TO_CHAR(a.data_criacao, 'YYYY-MM-DD"T"HH24:MI:SS') as data_criacao,
              TO_CHAR(a.data_atualizacao, 'YYYY-MM-DD"T"HH24:MI:SS') as data_atualizacao,
              (SELECT e.status FROM Entregas e 
               WHERE e.atividade_id = a.id AND 
                     e.grupo_id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId)
              ) as status_entrega,
              (SELECT e.id FROM Entregas e 
               WHERE e.atividade_id = a.id AND 
                     e.grupo_id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId)
              ) as entrega_id,
              (SELECT g.nome FROM Grupos g 
               WHERE g.id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId)
              ) as grupo_nome
       FROM Atividades a
       JOIN Usuarios p ON a.professor_id = p.id
       WHERE a.semestre = :semestre
       ORDER BY a.prazo_entrega ASC`,
      [alunoId, alunoId, alunoId, semestre],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    // Converter LOBs para string
    const atividades = await Promise.all(result.rows.map(async row => ({
      id: row.ID,
      titulo: row.TITULO,
      descricao: await lobToString(row.DESCRICAO),
      semestre: row.SEMESTRE,
      prazo_entrega: row.PRAZO_ENTREGA,
      criterios_avaliacao: await lobToString(row.CRITERIOS_AVALIACAO),
      professor_id: row.PROFESSOR_ID,
      professor_nome: row.PROFESSOR_NOME,
      data_criacao: row.DATA_CRIACAO,
      data_atualizacao: row.DATA_ATUALIZACAO,
      status_entrega: row.STATUS_ENTREGA || 'Pendente',
      entrega_id: row.ENTREGA_ID,
      grupo_nome: row.GRUPO_NOME
    })));
    
    res.json({ success: true, atividades });
  } catch (error) {
    console.error('Erro ao buscar atividades do aluno:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar atividades.', error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});


router.get('/api/atividade/:id', async (req, res) => {
    const connection = await getConnection();
  
    try {
      const atividadeId = parseInt(req.params.id, 10);
      const alunoId = parseInt(req.query.aluno_id, 10);
  
      if (isNaN(atividadeId) || isNaN(alunoId)) {
        return res.status(400).json({ success: false, message: 'IDs inválidos.' });
      }
  
      const result = await connection.execute(
        `SELECT a.id, a.titulo, a.descricao, a.semestre, 
                TO_CHAR(a.prazo_entrega, 'YYYY-MM-DD"T"HH24:MI:SS') as prazo_entrega,
                a.criterios_avaliacao, a.professor_id,
                p.nome as professor_nome,
                p.email as professor_email,
                TO_CHAR(a.data_criacao, 'YYYY-MM-DD"T"HH24:MI:SS') as data_criacao,
                TO_CHAR(a.data_atualizacao, 'YYYY-MM-DD"T"HH24:MI:SS') as data_atualizacao,
  
                (SELECT e.status FROM Entregas e 
                 WHERE e.atividade_id = a.id AND 
                       e.grupo_id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId1)) as status_entrega,
  
                (SELECT e.id FROM Entregas e 
                 WHERE e.atividade_id = a.id AND 
                       e.grupo_id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId2)) as entrega_id,
  
                (SELECT e.caminho_arquivo FROM Entregas e 
                 WHERE e.atividade_id = a.id AND 
                       e.grupo_id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId3)) as arquivo_entrega,
  
                (SELECT g.id FROM Grupos g 
                 WHERE g.id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId4)) as grupo_id,
  
                (SELECT g.nome FROM Grupos g 
                 WHERE g.id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId5)) as grupo_nome,
  
                (SELECT av.nota FROM Avaliacoes av 
                 JOIN Entregas e ON av.entrega_id = e.id
                 WHERE e.atividade_id = a.id AND 
                       e.grupo_id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId6)) as nota,
  
                (SELECT av.comentario FROM Avaliacoes av 
                 JOIN Entregas e ON av.entrega_id = e.id
                 WHERE e.atividade_id = a.id AND 
                       e.grupo_id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId7)) as comentario_avaliacao
  
         FROM Atividades a
         JOIN Usuarios p ON a.professor_id = p.id
         WHERE a.id = :atividadeId`,
        [
          alunoId, alunoId, alunoId,
          alunoId, alunoId, alunoId,
          alunoId, atividadeId
        ],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
  
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Atividade não encontrada.' });
      }
  
      const row = result.rows[0];
  
      const atividade = {
        id: row.ID,
        titulo: row.TITULO,
        descricao: await lobToString(row.DESCRICAO),
        semestre: row.SEMESTRE,
        prazo_entrega: row.PRAZO_ENTREGA,
        criterios_avaliacao: await lobToString(row.CRITERIOS_AVALIACAO),
        professor_id: row.PROFESSOR_ID,
        professor_nome: row.PROFESSOR_NOME,
        professor_email: row.PROFESSOR_EMAIL,
        data_criacao: row.DATA_CRIACAO,
        data_atualizacao: row.DATA_ATUALIZACAO,
        status_entrega: row.STATUS_ENTREGA || 'Pendente',
        entrega_id: row.ENTREGA_ID,
        arquivo_entrega: row.ARQUIVO_ENTREGA,
        grupo_id: row.GRUPO_ID,
        grupo_nome: row.GRUPO_NOME,
        nota: row.NOTA,
        comentario_avaliacao: await lobToString(row.COMENTARIO_AVALIACAO)
      };
  
      res.json({ success: true, atividade });
    } catch (error) {
      console.error('Erro ao buscar detalhes da atividade:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar detalhes da atividade.',
        error: error.message
      });
    } finally {
      if (connection) await connection.close();
    }
  });
  

// API para buscar detalhes de uma atividade específica
router.get('/api/atividade/:id', async (req, res) => {
  const connection = await getConnection();
  
  try {
    const atividadeId = parseInt(req.params.id, 10);
    const alunoId = parseInt(req.query.aluno_id, 10);
    
    if (isNaN(atividadeId) || isNaN(alunoId)) {
      return res.status(400).json({ success: false, message: 'IDs inválidos.' });
    }
    
    // Buscar detalhes da atividade
    const result = await connection.execute(
      `SELECT a.id, a.titulo, a.descricao, a.semestre, 
              TO_CHAR(a.prazo_entrega, 'YYYY-MM-DD"T"HH24:MI:SS') as prazo_entrega,
              a.criterios_avaliacao, a.professor_id,
              p.nome as professor_nome,
              p.email as professor_email,
              TO_CHAR(a.data_criacao, 'YYYY-MM-DD"T"HH24:MI:SS') as data_criacao,
              TO_CHAR(a.data_atualizacao, 'YYYY-MM-DD"T"HH24:MI:SS') as data_atualizacao,
              (SELECT e.status FROM Entregas e 
               WHERE e.atividade_id = a.id AND 
                     e.grupo_id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId)
              ) as status_entrega,
              (SELECT e.id FROM Entregas e 
               WHERE e.atividade_id = a.id AND 
                     e.grupo_id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId)
              ) as entrega_id,
              (SELECT e.caminho_arquivo FROM Entregas e 
               WHERE e.atividade_id = a.id AND 
                     e.grupo_id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId)
              ) as arquivo_entrega,
              (SELECT g.id FROM Grupos g 
               WHERE g.id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId)
              ) as grupo_id,
              (SELECT g.nome FROM Grupos g 
               WHERE g.id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId)
              ) as grupo_nome,
              (SELECT av.nota FROM Avaliacoes av 
               JOIN Entregas e ON av.entrega_id = e.id
               WHERE e.atividade_id = a.id AND 
                     e.grupo_id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId)
              ) as nota,
              (SELECT av.comentario FROM Avaliacoes av 
               JOIN Entregas e ON av.entrega_id = e.id
               WHERE e.atividade_id = a.id AND 
                     e.grupo_id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId)
              ) as comentario_avaliacao
       FROM Atividades a
       JOIN Usuarios p ON a.professor_id = p.id
       WHERE a.id = :atividadeId`,
      [alunoId, alunoId, alunoId, alunoId, alunoId, atividadeId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Atividade não encontrada.' });
    }
    
    // Converter LOBs para string
    const atividade = {
      id: result.rows[0].ID,
      titulo: result.rows[0].TITULO,
      descricao: await lobToString(result.rows[0].DESCRICAO),
      semestre: result.rows[0].SEMESTRE,
      prazo_entrega: result.rows[0].PRAZO_ENTREGA,
      criterios_avaliacao: result.rows[0].CRITERIOS_AVALIACAO,
      professor_id: result.rows[0].PROFESSOR_ID,
      professor_nome: result.rows[0].PROFESSOR_NOME,
      professor_email: result.rows[0].PROFESSOR_EMAIL,
      data_criacao: result.rows[0].DATA_CRIACAO,
      data_atualizacao: result.rows[0].DATA_ATUALIZACAO,
      status_entrega: result.rows[0].STATUS_ENTREGA || 'Pendente',
      entrega_id: result.rows[0].ENTREGA_ID,
      arquivo_entrega: result.rows[0].ARQUIVO_ENTREGA,
      grupo_id: result.rows[0].GRUPO_ID,
      grupo_nome: result.rows[0].GRUPO_NOME,
      nota: result.rows[0].NOTA,
      comentario_avaliacao: await lobToString(result.rows[0].COMENTARIO_AVALIACAO)
    };
    
    res.json({ success: true, atividade });
  } catch (error) {
    console.error('Erro ao buscar detalhes da atividade:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar detalhes da atividade.', error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;