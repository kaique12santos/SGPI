const express = require('express');
const { getConnection } = require('../conexaoMysql.js');
const router = express.Router();

// 🔹 Buscar disciplinas disponíveis de acordo com o tipo de professor
router.get("/disciplinas-disponiveis/:tipoUsuario", async (req, res) => {
  const { tipoUsuario } = req.params;
  const connection = await getConnection();

  try {
    // 🔹 Seleciona disciplinas que ainda não têm professor responsável
    let queryBase = `
      SELECT 
        d.id AS disciplina_id, 
        d.nome AS disciplina_nome, 
        do.semestre_id
      FROM Disciplinas_Ofertas do
      JOIN Disciplinas d ON d.id = do.disciplina_id
      WHERE do.professor_responsavel IS NULL
    `;

    // 🔸 Professores comuns só podem pegar disciplinas normais
    if (tipoUsuario === "professor") {
      queryBase += ` AND d.nome NOT LIKE 'Orientação de Projetos%'`;
    }

    // 🔸 Professores orientadores podem ver todas as disciplinas (sem restrição)
    // Então, aqui não adicionamos nenhum filtro
   
    queryBase += ` ORDER BY do.semestre_id, d.nome`;

    const result = await connection.execute(queryBase);
    console.log('===== RETORNO DA QUERY DE DISCIPLINAS =====');
    console.log(result);
    console.log('Total de disciplinas:', result.rows.length);
    console.log('Dados detalhados:');
    result.rows.forEach((disc, idx) => {
        console.log(idx + 1, {
            id: disc.disciplina_id,
            nome: disc.disciplina_nome,
            semestre_id: disc.semestre_id
        });
    });
    console.log('====================================');

    
    res.json({ success: true, disciplinas: result.rows });
  } catch (error) {
    console.error("❌ Erro ao buscar disciplinas disponíveis:", error);
    res.status(500).json({ success: false, message: "Erro interno do servidor." });
  } finally {
    await connection.close();
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
    for (const id of disciplinas) {
      await connection.execute(
        `UPDATE Disciplinas_Ofertas
         SET professor_responsavel = ?
         WHERE disciplina_id = ? AND professor_responsavel IS NULL`,
        [professor_id, id]
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

module.exports = router;
