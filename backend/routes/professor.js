const express = require('express');
const router = express.Router();
const { getConnection, oracledb } = require('../connectOracle.js');
const path = require('path');
const frontendPath = path.join(__dirname, '..', '..', 'frontend');
require('dotenv').config()

function lobToString(lob) {
  return new Promise((resolve, reject) => {
    if (lob === null) return resolve(null);
    let content = '';
    lob.setEncoding('utf8');
    lob.on('data', chunk => content += chunk);
    lob.on('end', () => resolve(content));
    lob.on('error', err => reject(err));
  });
}

router.get('/criar-atividade', (req, res) => {
  return res.sendFile(path.join(frontendPath, 'criar-atividade.html'));
});

router.post('/atividades', async (req, res) => {
  const {
    titulo,
    descricao,
    professor_id,
    projeto_id,
    prazo_entrega,
    criterios_avaliacao,
    semestre,
  } = req.body;

  const connection = await getConnection();

  try {
    if (!titulo || !descricao || !professor_id || !projeto_id || !prazo_entrega || !semestre) {
      return res.status(400).json({ success: false, message: 'Preencha todos os campos obrigatórios.' });
    }

    const result = await connection.execute(
      `INSERT INTO Atividades (
          titulo, descricao, professor_id, projeto_id, prazo_entrega,
          criterios_avaliacao, semestre
      ) VALUES (
          :1, :2, :3, :4, TO_TIMESTAMP(:5, 'YYYY-MM-DD"T"HH24:MI'), :6, :7
      )`,
      [titulo, descricao, professor_id, projeto_id, prazo_entrega, criterios_avaliacao, semestre],
      { autoCommit: true }
    );
    await notificarAlunosSobreAtividade(connection, {
      titulo,
      prazo_entrega,
      semestre
    });

    res.json({
      success: result.rowsAffected > 0,
      message: result.rowsAffected > 0
        ? 'Atividade cadastrada com sucesso!'
        : 'Erro ao cadastrar atividade.'
    });
  } catch (error) {
    console.error('Erro ao cadastrar atividade:', error);
    res.status(500).json({ success: false, message: 'Erro no servidor.', error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

router.get('/atividades', async (req, res) => {
  const connection = await getConnection();

  try {
    const professorId = parseInt(req.query.professor_id, 10);
    if (isNaN(professorId)) return res.status(400).json({ message: 'ID de professor inválido.' });

    const result = await connection.execute(
      `SELECT id, titulo, descricao, criterios_avaliacao,
              TO_CHAR(prazo_entrega, 'YYYY-MM-DD"T"HH24:MI') as prazo_entrega, semestre
       FROM Atividades
       WHERE professor_id = :professorId
       ORDER BY data_criacao DESC`,
      [professorId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const atividades = await Promise.all(result.rows.map(async row => ({
      id: row.ID,
      titulo: row.TITULO,
      descricao: await lobToString(row.DESCRICAO),
      criterios_avaliacao: await lobToString(row.CRITERIOS_AVALIACAO),
      prazo_entrega: row.PRAZO_ENTREGA,
      semestre: row.SEMESTRE
    })));

    res.json(atividades);
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    res.status(500).json({ message: 'Erro ao buscar atividades' });
  } finally {
    if (connection) await connection.close();
  }
});

router.put('/atividades/:atividadeId', async (req, res) => {
  const connection = await getConnection();

  try {
    const atividadeId = parseInt(req.params.atividadeId, 10);
    const professorId = parseInt(req.body.professor_id, 10);
    console.log('📥 Dados recebidos no body:', req.body);
    console.log('🆔 atividadeId:', atividadeId);
    console.log('🧑 professorId:', professorId);

    if (isNaN(atividadeId) || isNaN(professorId)) {
      return res.status(400).json({ message: 'ID inválido.' });
    }

    const { titulo, descricao, prazo_entrega, criterios_avaliacao, semestre } = req.body;

    const verificacao = await connection.execute(
      `SELECT COUNT(*) as count FROM Atividades WHERE id = :atividadeId AND professor_id = :professorId`,
      [atividadeId, professorId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (verificacao.rows[0].COUNT === 0) {
      return res.status(404).json({ message: 'Atividade não encontrada ou sem permissão.' });
    }

    const result = await connection.execute(
      `UPDATE Atividades
       SET titulo = :titulo,
           descricao = :descricao,
           prazo_entrega = TO_TIMESTAMP(:prazo_entrega, 'YYYY-MM-DD"T"HH24:MI'),
           criterios_avaliacao = :criterios_avaliacao,
           semestre = :semestre,
           data_atualizacao = CURRENT_TIMESTAMP
       WHERE id = :atividadeId AND professor_id = :professorId`,
      [titulo, descricao, prazo_entrega, criterios_avaliacao, semestre, atividadeId, professorId],
      { autoCommit: true }
    );

    res.json({
      message: result.rowsAffected > 0
        ? 'Atividade atualizada com sucesso!'
        : 'Não foi possível atualizar a atividade'
    });
  } catch (error) {
    console.error('Erro ao atualizar atividade:', error);
    res.status(500).json({ message: 'Erro no servidor.', error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

router.delete('/atividades/:atividadeId', async (req, res) => {
  const connection = await getConnection();

  try {
    const atividadeId = parseInt(req.params.atividadeId, 10);
    const professorId = parseInt(req.query.professor_id || req.body.professor_id, 10);

    console.log('📥 Dados recebidos no body:', req.body);
    console.log('🆔 atividadeId:', atividadeId);
    console.log('🧑 professorId:', professorId);

    if (isNaN(atividadeId) || isNaN(professorId)) {
      return res.status(400).json({ message: 'IDs inválidos.' });
    }

    const verificacao = await connection.execute(
      `SELECT COUNT(*) as count FROM Atividades WHERE id = :atividadeId AND professor_id = :professorId`,
      [atividadeId, professorId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (verificacao.rows[0].COUNT === 0) {
      return res.status(403).json({ message: 'Atividade não encontrada ou sem permissão.' });
    }

    const result = await connection.execute(
      `DELETE FROM Atividades WHERE id = :atividadeId AND professor_id = :professorId`,
      [atividadeId, professorId],
      { autoCommit: true }
    );

    res.json({
      message: result.rowsAffected > 0
        ? 'Atividade excluída com sucesso'
        : 'Erro ao excluir a atividade'
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
    // Buscar alunos do mesmo semestre
    const alunosResult = await connection.execute(
      `SELECT id FROM Usuarios
       WHERE tipo = 'Aluno' 
       AND semestre = :semestre
       AND ativo = 1`,
      [atividade.semestre],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // Para cada aluno, criar uma notificação
    for (const aluno of alunosResult.rows) {
      await connection.execute(
        `INSERT INTO Notificacoes (
            usuario_id, titulo, mensagem, tipo
         ) VALUES (
            :usuario_id,
            :titulo,
            :mensagem,
            'Nova_Atividade'
         )`,
        {
          usuario_id: aluno.ID,
          titulo: `Nova atividade: ${atividade.titulo}`,
          mensagem: `Uma nova atividade foi criada pelo professor: ${atividade.titulo}. 
                    Prazo de entrega: ${new Date(atividade.prazo_entrega).toLocaleString()}`,
        },
        { autoCommit: true }
      );
    }
    console.log(`Notificações enviadas para ${alunosResult.rows.length} alunos.`);
  } catch (error) {
    console.error('Erro ao enviar notificações:', error);
    // Não quebra o fluxo principal mesmo se as notificações falharem
  }
}

module.exports = router;
