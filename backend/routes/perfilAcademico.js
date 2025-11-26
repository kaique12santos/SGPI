const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');
const {extractRows} = require ('../utils/sqlUtils.js');
const {safeRelease} = require ('../utils/safeRealase.js')




router.get('/disciplinas/:id', async (req, res) => {
  const usuarioId = Number(req.params.id);
  if (!usuarioId) return res.status(400).json({ success: false, message: 'ID inválido' });

  let conn;
  try {
    conn = await getConnection();
    if (!conn) {
      return res.status(500).json({ success: false, message: 'Erro de conexão com o banco' });
    }

    // SQL CORRIGIDA:
    // 1. JOIN com Semestres para acessar o status 'ativo'
    // 2. Filtro 's.ativo = 1' para pegar só o semestre atual
    // 3. Filtro 'ao.status = Matriculado' para garantir que está cursando
    const sql = `
      SELECT d.id, d.nome, d.codigo, d.descricao
      FROM Aluno_Oferta ao
      JOIN Disciplinas_Ofertas dof ON ao.oferta_id = dof.id
      JOIN Semestres s ON dof.semestre_id = s.id   -- JOIN NOVO
      JOIN Disciplinas d ON dof.disciplina_id = d.id
      WHERE ao.aluno_id = ?
        AND s.ativo = 1                            -- FILTRO DO SEMESTRE NOVO
        AND ao.status = 'Matriculado'              -- FILTRO DE STATUS
      ORDER BY d.nome
    `;

    // Padronização para .query() e [rows] para evitar erros de driver
    const [rows] = await conn.query(sql, [usuarioId]);

    return res.json({ success: true, disciplinas: rows });

  } catch (err) {
    console.error('Erro na rota GET /perfilAcademico/disciplinas/:id ->', err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  } finally {
    safeRelease(conn);
  }
});

// Rota: grupos do aluno
router.get('/grupos/:id', async (req, res) => {
  const usuarioId = Number(req.params.id);
  if (!usuarioId) return res.status(400).json({ success: false, message: 'ID inválido' });

  let conn;
  try {
    conn = await getConnection();
    if (!conn || typeof conn.execute !== 'function') {
      console.error('Erro: conexão inválida obtida em /grupos', conn);
      return res.status(500).json({ success: false, message: 'Erro de conexão com o banco' });
    }

    const sql = `
      SELECT
        g.id,
        g.nome,
        g.semestre_id,
        s.ano,
        s.periodo,
        ug.data_entrada
      FROM Usuario_Grupo ug
      JOIN Grupos g ON g.id = ug.grupo_id
      JOIN Semestres s ON g.semestre_id = s.id
      WHERE ug.usuario_id = ?
      ORDER BY g.data_criacao DESC;
    `;
    const result = await conn.execute(sql, [usuarioId]);

    const grupos = extractRows(result);
    if (!Array.isArray(grupos)) console.error('grupos: formato inesperado do resultado', result);

    return res.json({ success: true, grupos });
  } catch (err) {
    console.error('Erro na rota GET /perfilAcademico/grupos/:id ->', err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  } finally {
    safeRelease(conn);
  }
});

// Rota: projetos com filtro por semestre
router.get('/projetos/:id', async (req, res) => {
  const usuarioId = Number(req.params.id);
  if (!usuarioId) return res.status(400).json({ success: false, message: 'ID inválido' });

  const semestreId = req.query.semestre ? Number(req.query.semestre) : null;

  let conn;
  try {
    conn = await getConnection();
    if (!conn || typeof conn.execute !== 'function') {
      console.error('Erro: conexão inválida obtida em /projetos', conn);
      return res.status(500).json({ success: false, message: 'Erro de conexão com o banco' });
    }

    // Parte inicial da query SEM o ORDER BY
    let sql = `
      SELECT
        p.id,
        p.titulo,
        p.descricao,
        p.semestre_id,
        s.ano,
        s.periodo,
        p.status,
        p.grupo_id
      FROM Usuario_Grupo ug
      JOIN Projetos p ON ug.grupo_id = p.grupo_id
      JOIN Semestres s ON p.semestre_id = s.id
      WHERE ug.usuario_id = ?
    `;
    const params = [usuarioId];

    // Adiciona a condição do semestre SE ela existir
    if (semestreId) {
      sql += ' AND p.semestre_id = ?';
      params.push(semestreId);
    }

    // Adiciona o ORDER BY APENAS UMA VEZ no final
    sql += ' ORDER BY p.data_criacao DESC;'; // Adicione o ponto e vírgula final aqui, se for a convenção do seu driver

    const result = await conn.execute(sql, params);
    const projetos = extractRows(result);
    if (!Array.isArray(projetos)) console.error('projetos: formato inesperado do resultado', result);

    return res.json({ success: true, projetos });
  } catch (err) {
    console.error('Erro na rota GET /perfilAcademico/projetos/:id ->', err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  } finally {
    safeRelease(conn);
  }
});
// rota para update das diciplinas dos alunos
router.put('/disciplinas/:id', async (req, res) => {
  const alunoId = Number(req.params.id);
  const { disciplinas: ofertasIdsSelecionadas } = req.body; 
  
  console.log("--------------- INÍCIO DA REQUISIÇÃO PUT ---------------");
  console.log("Aluno ID:", alunoId);
  console.log("Ofertas IDs recebidas no Body:", ofertasIdsSelecionadas);

  if (!alunoId || !Array.isArray(ofertasIdsSelecionadas)) {
    console.log("Erro: Dados inválidos (alunoId ou disciplinas).");
    return res.status(400).json({ success: false, message: "Dados inválidos." });
  }

  let conn;
  try {
    conn = await getConnection();
    await conn.query('START TRANSACTION');
    console.log("Transação iniciada.");

    // --- Lógica de DELEÇÃO ---
    // 1. Obter o semestre ativo ID
    // ==================
    // 1. CORREÇÃO AQUI: Removido [ ] e adicionado .rows
    // ==================
    const semestreResult = await conn.execute(
      `SELECT id FROM Semestres WHERE ativo = 1 LIMIT 1`
    );
    const semestreAtivoId = semestreResult?.rows?.[0]?.id; // Acessa via .rows

    if (!semestreAtivoId) {
      throw new Error("Nenhum semestre ativo encontrado para atualizar matrículas.");
    }
    
    // 2. Obter as matrículas ATUAIS do aluno *APENAS* no semestre ativo
    // ==================
    // 2. CORREÇÃO AQUI: Removido [ ] e adicionado .rows
    // ==================
    const matriculasAtuaisResult = await conn.execute(
      `SELECT ao.oferta_id
       FROM Aluno_Oferta ao
       JOIN Disciplinas_Ofertas do ON ao.oferta_id = do.id
       WHERE ao.aluno_id = ? AND do.semestre_id = ?`,
      [alunoId, semestreAtivoId]
    );
    
    const matriculasAtuaisRows = matriculasAtuaisResult?.rows || []; // Acessa via .rows
    const matriculasAtuaisSet = new Set(matriculasAtuaisRows.map(row => row.oferta_id));
    const ofertasNovasSet = new Set(ofertasIdsSelecionadas.map(id => Number(id)));
    
    console.log("Matrículas Atuais (Set de oferta_id):", Array.from(matriculasAtuaisSet));
    console.log("Matrículas Novas (Set de oferta_id):", Array.from(ofertasNovasSet));
    
    // --- Lógica de DELEÇÃO ---
    console.log("--- Iniciando lógica de DELEÇÃO ---");
    for (const ofertaIdAntiga of matriculasAtuaisSet) {
      if (!ofertasNovasSet.has(ofertaIdAntiga)) {
        console.log(`DELETE: aluno ${alunoId} da oferta ${ofertaIdAntiga}`);
        await conn.execute(
          `DELETE FROM Aluno_Oferta WHERE aluno_id = ? AND oferta_id = ?`,
          [alunoId, ofertaIdAntiga]
        );
      } else {
        console.log(`SKIP DELETE: oferta ${ofertaIdAntiga} ainda marcada.`);
      }
    }

    // --- Lógica de INSERÇÃO (Adicionar novas matrículas) ---
    console.log("--- Iniciando lógica de INSERÇÃO ---");
    for (const ofertaIdNova of ofertasNovasSet) {
      if (!matriculasAtuaisSet.has(ofertaIdNova)) {
        console.log(`INSERT: aluno ${alunoId} na oferta ${ofertaIdNova}`);
        await conn.execute(
          `INSERT INTO Aluno_Oferta (aluno_id, oferta_id, status, data_matricula) VALUES (?, ?, 'Matriculado', CURRENT_TIMESTAMP)`,
          [alunoId, ofertaIdNova]
        );
      } else {
        console.log(`SKIP INSERT: aluno ${alunoId} já matriculado na oferta ${ofertaIdNova}`);
      }
    }

    await conn.query('COMMIT');
    console.log("Transação confirmada.");
    res.json({ success: true, message: "Disciplinas atualizadas com sucesso!" });

  } catch (err) {
    console.error("Erro ao atualizar disciplinas:", err);
    if (conn) {
      await conn.query('ROLLBACK');
      console.log("Transação revertida.");
    }
    // Retorna a mensagem de erro específica
    res.status(500).json({ success: false, message: err.message || "Erro interno no servidor" });
  } finally {
    safeRelease(conn);
    console.log("--------------- FIM DA REQUISIÇÃO PUT ---------------");
  }
});
// rota para listar disciplinas disponíveis para o aluno
router.get('/disciplinas-disponiveis/:id', async (req, res) => {
  const alunoId = Number(req.params.id);
  if (!alunoId)
  return res.status(400).json({ success: false, message: "ID do aluno inválido." });
  
  let conn;
  try {
  conn = await getConnection();
  
  // ==================
  // 1. CORREÇÃO AQUI: Mudar de "do.disciplina_id" para "ao.oferta_id"
  // ==================
  const matriculadasResult = await conn.execute(
   `SELECT ao.oferta_id 
    FROM Aluno_Oferta ao
      JOIN Disciplinas_Ofertas do ON ao.oferta_id = do.id
      JOIN Semestres s ON do.semestre_id = s.id
       WHERE ao.aluno_id = ? AND s.ativo = 1`, // Adicionado s.ativo = 1 por segurança
       [alunoId]
  );
 
 // Renomeado para clareza
 const matriculadasOfertaIds = matriculadasResult.rows.map(r => r.oferta_id);
      // Agora matriculadasOfertaIds = [176] (usando o exemplo da sua imagem)
  
   // Busca todas as disciplinas disponíveis (grade completa)
  const todasResult = await conn.execute(
   `SELECT
     do.id,
     d.nome,
     d.codigo,
     do.semestre_id,
     d.semestre_padrao,
     s.ano,
     s.periodo
     FROM Disciplinas d
     JOIN Disciplinas_Ofertas do ON d.id = do.disciplina_id
     JOIN Semestres s ON do.semestre_id = s.id 
     WHERE s.ativo = 1 
     ORDER BY d.semestre_padrao, d.nome;
   `
  );
  
  if (!todasResult.rows || todasResult.rows.length === 0) {
   return res.status(404).json({
    success: false,
    message: "Nenhuma disciplina disponível encontrada."
   });
  }
  
  // ==================
  // 2. CORREÇÃO AQUI: Usar a variável correta
  // ==================
  const disciplinas = todasResult.rows.map(d => ({
   id: d.id, // Este é o oferta_id (ex: 176)
   nome: d.nome,
   codigo: d.codigo,
   semestre_id: d.semestre_id,
   semestre_padrao: d.semestre_padrao,
   ano_semestre: d.ano,    
   periodo_semestre: d.periodo,
   // A comparação agora é correta: [176].includes(176) -> true
   matriculado: matriculadasOfertaIds.includes(d.id) 
  }));
  
  res.json({
   success: true,
   disciplinas
   });
  
  } catch (err) {
   console.error("Erro ao buscar disciplinas disponíveis do aluno:", err);
   res.status(500).json({
   success: false,
   message: "Erro interno do servidor ao buscar disciplinas."
   });
   } finally {
   safeRelease(conn);
   }
  });
// rota para listar disciplinas disponíveis para o professor/orientador
// Rota: disciplinas disponíveis para vinculação de professores/orientadores
router.get('/disciplinas-disponiveis-professor/:id', async (req, res) => {
  const professorId = Number(req.params.id);
  if (!professorId) {
    return res.status(400).json({ success: false, message: "ID do professor inválido." });
  }

  let conn;
  try {
    conn = await getConnection();

    // 🔹 Seleciona apenas disciplinas de semestres ativos
    const [rows] = await conn.query(`
      SELECT 
        do_tbl.id AS oferta_id,
        d.id AS disciplina_id,
        d.nome AS disciplina_nome,
        d.semestre_padrao,
        do_tbl.semestre_id,
        s.ano,
        s.periodo,
        do_tbl.professor_responsavel
      FROM Disciplinas_Ofertas do_tbl
      JOIN Disciplinas d ON do_tbl.disciplina_id = d.id
      JOIN Semestres s ON do_tbl.semestre_id = s.id
      WHERE s.ativo = 1
      ORDER BY d.semestre_padrao, d.nome;
    `);

    // 🔹 Mapeia status da disciplina com base no professor_responsavel
    const disciplinas = rows.map(d => ({
      oferta_id: d.oferta_id,
      disciplina_id: d.disciplina_id,
      disciplina_nome: d.disciplina_nome,
      semestre_padrao: d.semestre_padrao,
      semestre_id: d.semestre_id,
      ano: d.ano,
      periodo: d.periodo,
      atribuida: d.professor_responsavel !== null,
      minha: d.professor_responsavel === professorId
    }));

    // Se quiser, pode ordenar as “minhas” disciplinas primeiro:
    disciplinas.sort((a, b) => {
      if (a.minha && !b.minha) return -1;
      if (!a.minha && b.minha) return 1;
      return a.semestre_padrao - b.semestre_padrao;
    });
    console.log(disciplinas)
    res.json({ success: true, disciplinas });
  } catch (err) {
    console.error("Erro ao buscar disciplinas disponíveis para professor:", err);
    res.status(500).json({ success: false, message: "Erro interno do servidor." });
  } finally {
    if (conn) conn.release();
  }
});



module.exports = router;
