const express = require('express');
const { getConnection } = require('../conexaoMysql.js');
const router = express.Router();
const {safeRelease} = require ('../utils/safeRealase.js')

// 🔹 Buscar disciplinas disponíveis de acordo com o tipo de professor
// Rota corrigida com safeRelease
router.get("/disciplinas-disponiveis/:tipoUsuario", async (req, res) => {
  const { tipoUsuario } = req.params;
  const { professor_id } = req.query; // 🔹 receba do front, ou use o usuário autenticado

  // Validação básica do professor_id
  if (!professor_id || isNaN(Number(professor_id))) {
      return res.status(400).json({ success: false, message: "ID do professor inválido." });
  }
  const currentProfessorId = Number(professor_id); // Use um nome mais claro

  let conn;
  try {
    conn = await getConnection();
    if (!conn || typeof conn.execute !== 'function') {
      console.error('Erro: conexão inválida obtida em /disciplinas-disponiveis', conn);
      return res.status(500).json({ success: false, message: 'Erro de conexão com o banco' });
    }

    // 🔹 Busca o semestre ativo
    const [semestreAtivoResult] = await conn.execute(`
      SELECT id FROM Semestres WHERE ativo = 1 LIMIT 1
    `);

    if (!semestreAtivoResult.length) {
      return res.status(400).json({ success: false, message: "Nenhum semestre ativo encontrado." });
    }

    const semestreAtivoId = semestreAtivoResult[0].id;

    // 🔹 Base da query
    let queryBase = `
      SELECT
        do.id AS oferta_id,
        d.id AS disciplina_id,
        d.nome AS disciplina_nome,
        d.semestre_padrao, -- Adicionado semestre_padrao para uso no frontend
        s.id AS semestre_id,
        s.periodo,
        s.ano,
        do.professor_responsavel,
        CASE WHEN do.professor_responsavel IS NOT NULL THEN 1 ELSE 0 END AS atribuida,
        CASE WHEN do.professor_responsavel = ? THEN 1 ELSE 0 END AS minha
      FROM Disciplinas_Ofertas do
      JOIN Disciplinas d ON d.id = do.disciplina_id
      JOIN Semestres s ON s.id = do.semestre_id
      WHERE do.semestre_id = ?
    `;

    // 🔸 Professores comuns: não veem "Orientação de Projetos"
    if (tipoUsuario === "professor") {
      queryBase += ` AND d.nome NOT LIKE 'Orientação de Projetos%'`;
    }
    // 🔸 Orientadores: filtram para ver APENAS "Orientação de Projetos"
    else if (tipoUsuario === "professor_orientador" || tipoUsuario === "orientador") { // Use 'orientador' ou 'professor_orientador' consistentemente
        queryBase += ` AND d.nome LIKE 'Orientação de Projetos%'`;
    }


    queryBase += ` ORDER BY d.nome`;

    const [rows] = await conn.execute(queryBase, [currentProfessorId, semestreAtivoId]);

    console.log("📘 Disciplinas encontradas:", rows.length);

    res.json({ success: true, disciplinas: rows });
  } catch (error) {
    console.error("❌ Erro ao buscar disciplinas disponíveis:", error);
    res.status(500).json({ success: false, message: "Erro interno do servidor." });
  } finally {
    safeRelease(conn); // Usar safeRelease em vez de connection.close()
  }
});


// 🔹 Vincular professor às disciplinas selecionadas
router.post("/vincular-disciplinas", async (req, res) => {
  const { professor_id, disciplinas } = req.body;

  if (!professor_id || !Array.isArray(disciplinas) || disciplinas.length === 0) {
    return res.status(400).json({ success: false, message: "Dados inválidos." });
  }

  const connection = await getConnection();
  try {
    for (const ofertaId of disciplinas) {
      await connection.execute(
        `UPDATE Disciplinas_Ofertas
         SET professor_responsavel = ?
         WHERE id = ? AND professor_responsavel IS NULL`,
        [professor_id, ofertaId]
      );
    }

    res.json({ success: true, message: "Disciplinas vinculadas com sucesso." });
  } catch (error) {
    console.error("Erro ao vincular disciplinas:", error);
    res.status(500).json({ success: false, message: "Erro interno ao vincular disciplinas." });
  } finally {
    await connection.close();
  }
});

router.post("/desvincular-disciplinas", async (req, res) => {
  console.log("\n========================================");
  console.log("📥 NOVA REQUISIÇÃO: /desvincular-disciplinas");
  console.log("========================================");
  console.log("📦 req.body completo:", JSON.stringify(req.body, null, 2));
  console.log("📦 req.body.professor_id:", req.body.professor_id, "| tipo:", typeof req.body.professor_id);
  console.log("📦 req.body.disciplinas:", req.body.disciplinas, "| tipo:", typeof req.body.disciplinas);
  
  const { professor_id, disciplinas } = req.body;

  // ✅ Validação Passo a Passo
  if (!professor_id) {
    console.error("❌ ERRO: professor_id não fornecido ou é null/undefined");
    return res.status(400).json({ 
      success: false, 
      message: "ID do professor é obrigatório." 
    });
  }

  if (!Array.isArray(disciplinas)) {
    console.error("❌ ERRO: disciplinas não é um array, é:", typeof disciplinas);
    return res.status(400).json({ 
      success: false, 
      message: "Lista de disciplinas deve ser um array." 
    });
  }

  if (disciplinas.length === 0) {
    console.error("❌ ERRO: disciplinas está vazio");
    return res.status(400).json({ 
      success: false, 
      message: "Selecione pelo menos uma disciplina para desvincular." 
    });
  }

  console.log("✅ Validações iniciais OK");
  console.log(`🎯 Professor ID: ${professor_id}`);
  console.log(`🎯 Disciplinas: [${disciplinas.join(', ')}]`);

  let conn;
  try {
    console.log("🔌 Tentando obter conexão...");
    conn = await getConnection();
    console.log("✅ Conexão obtida:", conn ? "OK" : "FALHOU");
    
    if (!conn || typeof conn.execute !== 'function') {
      console.error('❌ ERRO CRÍTICO: Conexão inválida');
      console.error('conn:', conn);
      console.error('conn.execute:', typeof conn?.execute);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro de conexão com o banco de dados' 
      });
    }
    
    console.log("✅ Conexão válida, iniciando updates...\n");
    
    let removidas = 0;
    let erros = [];
    
    for (let i = 0; i < disciplinas.length; i++) {
      const ofertaId = disciplinas[i];
      console.log(`\n--- Processando ${i + 1}/${disciplinas.length} ---`);
      console.log(`🔄 Oferta ID: ${ofertaId} | Professor ID: ${professor_id}`);
      
      try {
        // ✅ Query SQL com log
        const query = `
          UPDATE Disciplinas_Ofertas
          SET professor_responsavel = NULL
          WHERE id = ? AND professor_responsavel = ?
        `;
        const params = [Number(ofertaId), Number(professor_id)];
        
        console.log("📝 SQL:", query.trim().replace(/\s+/g, ' '));
        console.log("📝 Params:", params);
        
        const [result] = await conn.execute(query, params);
        
        console.log("📊 Resultado:", {
          affectedRows: result.affectedRows,
          changedRows: result.changedRows,
          warningCount: result.warningCount
        });
        
        if (result.affectedRows > 0) {
          removidas++;
          console.log(`✅ Oferta ${ofertaId} desvinculada com sucesso`);
        } else {
          const msg = `Oferta ${ofertaId} não encontrada ou já estava desvinculada`;
          erros.push(msg);
          console.warn(`⚠️ ${msg}`);
          
          // ✅ Verifica se a oferta existe
          const [checkOferta] = await conn.execute(
            `SELECT id, professor_responsavel FROM Disciplinas_Ofertas WHERE id = ?`,
            [Number(ofertaId)]
          );
          console.log(`🔍 Verificação da oferta ${ofertaId}:`, checkOferta);
        }
      } catch (updateError) {
        const errorMsg = `Erro na oferta ${ofertaId}: ${updateError.message}`;
        console.error(`❌ ${errorMsg}`);
        console.error("Stack:", updateError.stack);
        erros.push(errorMsg);
      }
    }

    console.log("\n========================================");
    console.log(`✅ PROCESSAMENTO CONCLUÍDO`);
    console.log(`📊 Removidas: ${removidas}/${disciplinas.length}`);
    if (erros.length > 0) {
      console.log(`⚠️ Erros: ${erros.length}`);
      erros.forEach((err, idx) => console.log(`  ${idx + 1}. ${err}`));
    }
    console.log("========================================\n");

    res.json({ 
      success: true, 
      message: `${removidas} disciplina(s) desvinculada(s) com sucesso.`,
      detalhes: {
        removidas,
        total: disciplinas.length,
        erros: erros.length > 0 ? erros : undefined
      }
    });
    
  } catch (error) {
    console.error("\n❌❌❌ ERRO CRÍTICO ❌❌❌");
    console.error("Mensagem:", error.message);
    console.error("Stack completo:", error.stack);
    console.error("Tipo:", error.constructor.name);
    console.error("Código SQL:", error.code);
    console.error("SQL State:", error.sqlState);
    console.error("SQL Message:", error.sqlMessage);
    console.error("❌❌❌❌❌❌❌❌❌❌❌❌❌\n");
    
    res.status(500).json({ 
      success: false, 
      message: "Erro interno ao desvincular disciplinas.",
      error: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage
    });
  } finally {
    console.log("🔌 Liberando conexão...");
    safeRelease(conn);
    console.log("✅ Conexão liberada\n");
  }
});
console.log("📋 Rotas registradas em professoresDisciplinas:");
console.log("  - GET  /disciplinas-disponiveis/:tipoUsuario");
console.log("  - POST /vincular-disciplinas");
console.log("  - POST /desvincular-disciplinas"); 
module.exports = router;
