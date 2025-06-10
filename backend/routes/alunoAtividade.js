const express = require('express');
const router = express.Router();
const { getConnection, oracledb } = require('../connectOracle.js');
const path = require('path');
const frontendPath = path.join(__dirname, '..', '..', 'frontend');
const multer = require('multer');
const fs = require('fs');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const nomeOriginal = file.originalname.replace(/\s+/g, '_');
    const extensao = path.extname(nomeOriginal);
    const baseNome = path.basename(nomeOriginal, extensao);
    const nomeFinal = `${Date.now()}_${baseNome}${extensao}`;
    cb(null, nomeFinal);
  }
});
const upload = multer({ storage });

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

  try {
    const { aluno_id, atividade_id } = req.body;
    const arquivo = req.file;

    if (!arquivo) {
      return res.status(400).json({ success: false, message: 'Arquivo não enviado.' });
    }

    const nomeFinal = arquivo.filename;
    const tamanho = arquivo.size;

    // Verificar prazo da atividade
    const atividadePrazoResult = await connection.execute(
      `SELECT prazo_entrega FROM Atividades WHERE id = :id`,
      [atividade_id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const prazoEntrega = new Date(atividadePrazoResult.rows[0].PRAZO_ENTREGA);
    const agora = new Date();
    const status = agora > prazoEntrega ? 'Atrasado' : 'Entregue';

    // Verificar grupo do aluno
    const grupoIdResult = await connection.execute(
      `SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :aluno_id FETCH FIRST 1 ROWS ONLY`,
      { aluno_id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (grupoIdResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Grupo do aluno não encontrado.' });
    }

    const grupoId = grupoIdResult.rows[0].GRUPO_ID;

    // Verificar se já existe entrega para essa atividade e grupo
    const entregaResult = await connection.execute(
      `SELECT id, caminho_arquivo FROM Entregas
       WHERE atividade_id = :atividade_id AND grupo_id = :grupo_id`,
      { atividade_id, grupo_id: grupoId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (entregaResult.rows.length > 0) {
      const entregaExistente = entregaResult.rows[0];

      // Apagar arquivo antigo
      const caminhoAntigo = path.join(__dirname, '..', 'uploads', entregaExistente.CAMINHO_ARQUIVO);
      if (fs.existsSync(caminhoAntigo)) {
        fs.unlinkSync(caminhoAntigo);
      }

      // Atualizar entrega existente - INCLUINDO aluno_id
      await connection.execute(
        `UPDATE Entregas
         SET caminho_arquivo = :caminho, tamanho_arquivo = :tamanho,
             data_entrega = CURRENT_TIMESTAMP, status = :status, aluno_id = :aluno_id
         WHERE id = :id`,
        {
          caminho: nomeFinal,
          tamanho,
          status,
          aluno_id,
          id: entregaExistente.ID
        },
        { autoCommit: true }
      );

      return res.json({ success: true, message: 'Entrega substituída com sucesso.' });
    } else {
      // Criar nova entrega - INCLUINDO aluno_id
      await connection.execute(
        `INSERT INTO Entregas (atividade_id, grupo_id, aluno_id, caminho_arquivo, tamanho_arquivo, status, data_entrega)
         VALUES (:atividade_id, :grupo_id, :aluno_id, :caminho_arquivo, :tamanho_arquivo, :status, CURRENT_TIMESTAMP)`,
        {
          atividade_id,
          grupo_id: grupoId,
          aluno_id,
          caminho_arquivo: nomeFinal,
          tamanho_arquivo: tamanho,
          status
        },
        { autoCommit: true }
      );

      return res.json({ success: true, message: 'Entrega enviada com sucesso.' });
    }
  } catch (err) {
    console.error('Erro ao enviar entrega:', err);
    res.status(500).json({ success: false, message: 'Erro ao enviar entrega.' });
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

    // Obter semestre e grupo do aluno
    const grupoSemestreResult = await connection.execute(
      `SELECT g.id as grupo_id, u.semestre
       FROM Usuario_Grupo ug
       JOIN Grupos g ON ug.grupo_id = g.id
       JOIN Usuarios u ON ug.usuario_id = u.id
       WHERE ug.usuario_id = :alunoId FETCH FIRST 1 ROWS ONLY`,
      [alunoId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (grupoSemestreResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Aluno sem grupo ou semestre não encontrado.' });
    }

    const grupoId = grupoSemestreResult.rows[0].GRUPO_ID;
    const semestre = grupoSemestreResult.rows[0].SEMESTRE;

    // Buscar apenas 1 atividade por grupo para o semestre do aluno
    const result = await connection.execute(
      `SELECT a.id, a.titulo, a.descricao, a.semestre, 
              TO_CHAR(a.prazo_entrega, 'YYYY-MM-DD"T"HH24:MI:SS') as prazo_entrega,
              a.criterios_avaliacao, a.professor_id,
              p.nome as professor_nome,
              TO_CHAR(a.data_criacao, 'YYYY-MM-DD"T"HH24:MI:SS') as data_criacao,
              TO_CHAR(a.data_atualizacao, 'YYYY-MM-DD"T"HH24:MI:SS') as data_atualizacao,
              (SELECT e.status FROM Entregas e 
               WHERE e.atividade_id = a.id AND e.grupo_id = :grupoId_status FETCH FIRST 1 ROWS ONLY
              ) as status_entrega,
              (SELECT e.id FROM Entregas e 
               WHERE e.atividade_id = a.id AND e.grupo_id = :grupoId_entrega FETCH FIRST 1 ROWS ONLY
              ) as entrega_id,
              (SELECT nome FROM Grupos WHERE id = :grupoId_nome FETCH FIRST 1 ROWS ONLY) as grupo_nome
       FROM Atividades a
       JOIN Usuarios p ON a.professor_id = p.id
       WHERE a.semestre = :semestre AND a.grupo_id = :grupoId_main
       ORDER BY a.data_criacao DESC, a.id DESC`,
      {
        grupoId_status: grupoId,
        grupoId_entrega: grupoId,
        grupoId_nome: grupoId,
        grupoId_main: grupoId,
        semestre
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    // === ADICIONE LOG PARA DEBUG ===
    console.log('Atividades do banco (ordenadas):', result.rows.map(row => ({
      id: row.ID,
      titulo: row.TITULO,
      data_criacao: row.DATA_CRIACAO
    })));

    const atividades = await Promise.all(result.rows.map(async row => ({
      id: row.ID,
      titulo: row.TITULO,
      descricao: await lobToString(row.DESCRICAO),
      semestre: row.SEMESTRE,
      prazo_entrega: row.PRAZO_ENTREGA,
      criterios_avaliacao: await lobToString(row.CRIOS_AVALIACAO),
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

    // Buscar detalhes da atividade com FETCH FIRST para evitar ORA-01427
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
                     e.grupo_id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId FETCH FIRST 1 ROWS ONLY)
               FETCH FIRST 1 ROWS ONLY) as status_entrega,

              (SELECT e.id FROM Entregas e 
               WHERE e.atividade_id = a.id AND 
                     e.grupo_id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId FETCH FIRST 1 ROWS ONLY)
               FETCH FIRST 1 ROWS ONLY) as entrega_id,

              (SELECT e.caminho_arquivo FROM Entregas e 
               WHERE e.atividade_id = a.id AND 
                     e.grupo_id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId FETCH FIRST 1 ROWS ONLY)
               FETCH FIRST 1 ROWS ONLY) as arquivo_entrega,

              (SELECT g.id FROM Grupos g 
               WHERE g.id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId FETCH FIRST 1 ROWS ONLY)
               FETCH FIRST 1 ROWS ONLY) as grupo_id,

              (SELECT g.nome FROM Grupos g 
               WHERE g.id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId FETCH FIRST 1 ROWS ONLY)
               FETCH FIRST 1 ROWS ONLY) as grupo_nome,

              (SELECT av.nota FROM Avaliacoes av 
               JOIN Entregas e ON av.entrega_id = e.id
               WHERE e.atividade_id = a.id AND 
                     e.grupo_id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId FETCH FIRST 1 ROWS ONLY)
               FETCH FIRST 1 ROWS ONLY) as nota,

              (SELECT av.comentario FROM Avaliacoes av 
               JOIN Entregas e ON av.entrega_id = e.id
               WHERE e.atividade_id = a.id AND 
                     e.grupo_id IN (SELECT grupo_id FROM Usuario_Grupo WHERE usuario_id = :alunoId FETCH FIRST 1 ROWS ONLY)
               FETCH FIRST 1 ROWS ONLY) as comentario_avaliacao

       FROM Atividades a
       JOIN Usuarios p ON a.professor_id = p.id
       WHERE a.id = :atividadeId`,
      {
        alunoId,
        atividadeId
      },
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
      criterios_avaliacao: await lobToString(row.CRIOS_AVALIACAO),
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
    res.status(500).json({ success: false, message: 'Erro ao buscar detalhes da atividade.', error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});


module.exports = router;