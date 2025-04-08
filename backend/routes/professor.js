const express = require('express');
const router = express.Router();
const { getConnection, oracledb } = require('../connectOracle.js');
const path = require('path');
const frontendPath = path.join(__dirname, '..', '..', 'frontend');

// Função para converter LOB (CLOB) em string
function lobToString(lob) {
  return new Promise((resolve, reject) => {
    if (lob === null) return resolve(null);

    let content = '';
    lob.setEncoding('utf8');

    lob.on('data', chunk => {
      content += chunk;
    });

    lob.on('end', () => {
      resolve(content);
    });

    lob.on('error', err => {
      reject(err);
    });
  });
}

// Rota de criar-atividade
router.get('/criar-atividade', (req, res) => {
  return res.sendFile(path.join(frontendPath, 'criar-atividade.html'));
});

// Rota para cadastro de atividades
router.post('/atividades', async (req, res) => {
  const {
    titulo,
    descricao,
    professor_id,
    projeto_id,
    prazo_entrega,
    criterios_avaliacao,
    semestre
  } = req.body;

  const connection = await getConnection();

  try {
    // Validação básica
    if (!titulo || !descricao || !professor_id || !projeto_id || !prazo_entrega || !semestre) {
      if (connection) await connection.close();
      return res.status(400).json({ success: false, message: 'Todos os campos obrigatórios devem ser preenchidos.' });
    }

    // Inserção na tabela Atividades
    const result = await connection.execute(
      `INSERT INTO Atividades (
          titulo, descricao, professor_id, projeto_id, prazo_entrega,
          criterios_avaliacao, semestre
      ) VALUES (
          :1, :2, :3, :4, TO_TIMESTAMP(:5, 'YYYY-MM-DD"T"HH24:MI'), :6, :7
      )`,
      [
        titulo,
        descricao,
        professor_id,
        projeto_id,
        prazo_entrega,
        criterios_avaliacao,
        semestre
      ],
      { autoCommit: true }
    );

    if (result.rowsAffected > 0) {
      if (connection) await connection.close();
      return res.json({ success: true, message: 'Atividade cadastrada com sucesso!' });
    } else {
      if (connection) await connection.close();
      return res.status(500).json({ success: false, message: 'Erro ao cadastrar atividade.' });
    }

  } catch (error) {
    console.error('Erro ao cadastrar atividade:', error);
    if (connection) {
      try { await connection.close(); } catch (innerError) { console.error('Erro ao fechar conexão:', innerError); }
    }
    return res.status(500).json({ success: false, message: 'Erro no servidor.', error: error.message });
  }
});

// Rota para visualizar os dados
router.get('/atividades', async (req, res) => {
  const connection = await getConnection();

  try {
    const professorId = 1;

    const result = await connection.execute(
      `SELECT id,
              titulo,
              descricao,
              criterios_avaliacao,
              TO_CHAR(prazo_entrega, 'YYYY-MM-DD"T"HH24:MI') as prazo_entrega,
              semestre
       FROM Atividades
       WHERE professor_id = :professorId
       ORDER BY data_criacao DESC`,
      [professorId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // Processar cada linha e transformar os CLOBs em string
    const atividades = await Promise.all(result.rows.map(async row => {
      const descricao = await lobToString(row.DESCRICAO);
      const criterios = await lobToString(row.CRITERIOS_AVALIACAO);

      return {
        id: row.ID,
        titulo: row.TITULO,
        descricao,
        criterios_avaliacao: criterios,
        prazo_entrega: row.PRAZO_ENTREGA,
        semestre: row.SEMESTRE
      };
    }));

    res.json(atividades);
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    res.status(500).json({ message: 'Erro ao buscar atividades' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Erro ao fechar conexão:', closeError);
      }
    }
  }
});

// Rota para atualizar uma atividade existente
router.put('/atividades/:atividadeId', async (req, res) => {
  const connection = await getConnection();
  
  try {
    const atividadeId = parseInt(req.params.atividadeId, 10);
    
    if (isNaN(atividadeId)) {
      return res.status(400).json({ message: 'ID de atividade inválido' });
    }
    
    const professorId = 1; // ID fixo como no exemplo original
    
    const {
      titulo,
      descricao,
      prazo_entrega,
      criterios_avaliacao,
      semestre,
      projeto_id
    } = req.body;
    
    // Validação básica
    if (!titulo || !descricao || !prazo_entrega || !criterios_avaliacao || !semestre) {
      return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos' });
    }
    
    // Verificar se a atividade existe e pertence ao professor
    const verificacao = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM Atividades 
       WHERE id = :atividadeId AND professor_id = :professorId`,
      [atividadeId, professorId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (verificacao.rows[0].COUNT === 0) {
      return res.status(404).json({ message: 'Atividade não encontrada ou você não tem permissão para alterá-la' });
    }
    
    // Atualizar a atividade
    const result = await connection.execute(
      `UPDATE Atividades 
       SET titulo = :titulo, 
           descricao = :descricao, 
           prazo_entrega = TO_TIMESTAMP(:prazo_entrega, 'YYYY-MM-DD"T"HH24:MI'),
           criterios_avaliacao = :criterios_avaliacao,
           semestre = :semestre,
           data_atualizacao = CURRENT_TIMESTAMP
       WHERE id = :atividadeId AND professor_id = :professorId`,
      [
        titulo,
        descricao,
        prazo_entrega,
        criterios_avaliacao,
        semestre,
        atividadeId,
        professorId
      ],
      { autoCommit: true }
    );
    
    if (result.rowsAffected > 0) {
      res.json({ message: 'Atividade atualizada com sucesso!' });
    } else {
      res.status(500).json({ message: 'Não foi possível atualizar a atividade' });
    }
    
  } catch (error) {
    console.error('Erro ao atualizar atividade:', error);
    
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Erro ao realizar rollback:', rollbackError);
      }
    }
    
    res.status(500).json({ message: 'Erro ao atualizar atividade', error: error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Erro ao fechar conexão:', closeError);
      }
    }
  }
});

// Rota para deletar uma atividade
router.delete('/criar-atividade/:atividadeId', async (req, res) => {
  const connection = await getConnection();
  
  try {
    // Converter explicitamente para número para evitar problemas de tipo
    const atividadeId = parseInt(req.params.atividadeId, 10);
    
    // Verificar se é um número válido
    if (isNaN(atividadeId)) {
      return res.status(400).json({ message: 'ID de atividade inválido' });
    }
    
    const professorId = 1; // Usando ID fixo como no exemplo original
    
    // Verificar se a atividade pertence ao professor antes de excluir
    const verificacao = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM Atividades 
       WHERE id = :atividadeId AND professor_id = :professorId`,
      [atividadeId, professorId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (verificacao.rows[0].COUNT === 0) {
      return res.status(403).json({ message: 'Atividade não encontrada ou você não tem permissão para excluí-la' });
    }
    
    // Executar a exclusão
    const result = await connection.execute(
      `DELETE FROM Atividades 
       WHERE id = :atividadeId AND professor_id = :professorId`,
      [atividadeId, professorId],
      { autoCommit: true }
    );
    
    if (result.rowsAffected > 0) {
      res.json({ message: 'Atividade excluída com sucesso' });
    } else {
      res.status(404).json({ message: 'Não foi possível excluir a atividade' });
    }
  } catch (error) {
    console.error('Erro ao excluir atividade:', error);
    
    // Rollback em caso de erro
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Erro ao realizar rollback:', rollbackError);
      }
    }
    
    res.status(500).json({ message: 'Erro ao excluir atividade', error: error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Erro ao fechar conexão:', closeError);
      }
    }
  }
});

// Rota para deletar uma atividade (endpoint alternativo)
router.delete('/atividades/:atividadeId', async (req, res) => {
  const connection = await getConnection();
  
  try {
    const atividadeId = parseInt(req.params.atividadeId, 10);
    
    if (isNaN(atividadeId)) {
      return res.status(400).json({ message: 'ID de atividade inválido' });
    }
    
    const professorId = 1; // Usando ID fixo como no exemplo original
    
    // Verificar se a atividade pertence ao professor antes de excluir
    const verificacao = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM Atividades 
       WHERE id = :atividadeId AND professor_id = :professorId`,
      [atividadeId, professorId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (verificacao.rows[0].COUNT === 0) {
      return res.status(403).json({ message: 'Atividade não encontrada ou você não tem permissão para excluí-la' });
    }
    
    // Executar a exclusão
    const result = await connection.execute(
      `DELETE FROM Atividades 
       WHERE id = :atividadeId AND professor_id = :professorId`,
      [atividadeId, professorId],
      { autoCommit: true }
    );
    
    if (result.rowsAffected > 0) {
      res.json({ message: 'Atividade excluída com sucesso' });
    } else {
      res.status(404).json({ message: 'Não foi possível excluir a atividade' });
    }
  } catch (error) {
    console.error('Erro ao excluir atividade:', error);
    
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Erro ao realizar rollback:', rollbackError);
      }
    }
    
    res.status(500).json({ message: 'Erro ao excluir atividade', error: error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Erro ao fechar conexão:', closeError);
      }
    }
  }
});

module.exports = router;