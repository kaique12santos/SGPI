
const express = require('express');
const router = express.Router();
const { getConnection, oracledb } = require('../connectOracle.js');


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

router.get('/api/grupos', async (req, res) => {
    const connection = await getConnection();
    const semestre = req.query.semestre;
  
    try {
      let result;
      if (semestre) {
        result = await connection.execute(
          `SELECT id, nome, semestre FROM Grupos WHERE semestre = :semestre ORDER BY nome`,
          [semestre],
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
      } else {
        result = await connection.execute(
          `SELECT id, nome, semestre FROM Grupos ORDER BY semestre, nome`,
          [],
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
      }
  
      res.json({ success: true, grupos: result.rows });
    } catch (err) {
      console.error('Erro ao buscar grupos:', err);
      res.status(500).json({ success: false, message: 'Erro ao buscar grupos.' });
    } finally {
      if (connection) await connection.close();
    }
  });
  


  router.get('/api/projetos', async (req, res) => {
    const orientadorId = parseInt(req.query.orientador_id, 10);
    const connection = await getConnection();
  
    try {
      const result = await connection.execute(
        `SELECT 
          p.id,
          p.titulo,
          p.descricao,
          p.grupo_id,
          g.nome AS grupo_nome,
          p.semestre,
          p.status,
          p.data_criacao
          FROM Projetos p
          LEFT JOIN Grupos g ON p.grupo_id = g.id
          WHERE p.orientador_id = :id
          ORDER BY p.data_criacao DESC`,
        [orientadorId],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
  
      const projetos = await Promise.all(
        result.rows.map(async p => ({
          id: p.ID,
          titulo: p.TITULO,
          descricao: await lobToString(p.DESCRICAO),
          grupo_id: p.GRUPO_ID,
          grupo_nome:p.GRUPO_NOME,
          semestre: p.SEMESTRE,
          status: p.STATUS,
          data_criacao: p.DATA_CRIACAO
        }))
      );
      
      res.json({ success: true, projetos });
      
    } catch (err) {
      console.error('Erro ao buscar projetos:', err);
      res.status(500).json({ success: false, message: 'Erro ao buscar projetos.' });
    } finally {
      if (connection) await connection.close();
    }
  });
  


  router.post('/api/projetos', async (req, res) => {
    const { titulo, descricao, grupo_id, orientador_id, semestre } = req.body;
  
    const connection = await getConnection();
    try {
      if (!titulo || !grupo_id || !orientador_id || !semestre) {
        return res.status(400).json({ success: false, message: 'Preencha todos os campos obrigatórios.' });
      }
  
      await connection.execute(
        `INSERT INTO Projetos (titulo, descricao, grupo_id, orientador_id, semestre)
         VALUES (:titulo, :descricao, :grupo_id, :orientador_id, :semestre)`,
        { titulo, descricao, grupo_id, orientador_id, semestre },
        { autoCommit: true }
      );
  
      res.json({ success: true, message: 'Projeto criado com sucesso!' });
    } catch (err) {
      console.error('Erro ao criar projeto:', err);
      res.status(500).json({ success: false, message: 'Erro ao criar projeto.', error: err.message });
    } finally {
      if (connection) await connection.close();
    }
  });

  router.put('/api/projetos/:id', async (req, res) => {
    const projetoId = parseInt(req.params.id, 10);
    const { titulo, descricao, semestre, status } = req.body;
  
    const connection = await getConnection();
  
    try {
      await connection.execute(
        `UPDATE Projetos
         SET titulo = :titulo,
             descricao = :descricao,
             semestre = :semestre,
             status = :status,
             data_atualizacao = CURRENT_TIMESTAMP
         WHERE id = :id`,
        { titulo, descricao, semestre, status, id: projetoId },
        { autoCommit: true }
      );
  
      res.json({ success: true, message: 'Projeto atualizado com sucesso.' });
    } catch (err) {
      console.error('Erro ao atualizar projeto:', err);
      res.status(500).json({ success: false, message: 'Erro ao atualizar projeto.' });
    } finally {
      if (connection) await connection.close();
    }
  });

  router.delete('/api/projetos/:id', async (req, res) => {
    const projetoId = parseInt(req.params.id, 10);
    const connection = await getConnection();
  
    try {
      const result = await connection.execute(
        `DELETE FROM Projetos WHERE id = :id`,
        [projetoId],
        { autoCommit: true }
      );
  
      if (result.rowsAffected > 0) {
        res.json({ success: true, message: 'Projeto deletado com sucesso.' });
      } else {
        res.status(404).json({ success: false, message: 'Projeto não encontrado.' });
      }
    } catch (err) {
      console.error('Erro ao deletar projeto:', err);
      res.status(500).json({ success: false, message: 'Erro ao deletar projeto.' });
    } finally {
      if (connection) await connection.close();
    }
  });
  
  
 module.exports = router;  