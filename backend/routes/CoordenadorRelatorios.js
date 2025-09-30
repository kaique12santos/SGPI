const express = require('express');
const router = express.Router();
const { getConnection } = require('../conexaoMysql.js');
const ExcelJS = require('exceljs');

/**
 * Rota: GET /coordenador/grupos/:semestre
 * Descrição: Lista todos os grupos de um semestre, com nome e id, para exibir no front-end.
 */
router.get('/grupos/:semestre', async (req, res) => {
  const semestreEscolhido = String(req.params.semestre);

  let connection;
  try {
    connection = await getConnection();

    const sqlListarGrupos = `
      SELECT
        g.id AS grupo_id,
        g.nome AS grupo_nome,
        GROUP_CONCAT(u.nome ORDER BY u.nome SEPARATOR ', ') AS nomes_membros
      FROM Grupos g
      JOIN Usuario_Grupo ug ON g.id = ug.grupo_id
      JOIN Usuarios u ON ug.usuario_id = u.id
      WHERE g.semestre = ?
      GROUP BY g.id, g.nome
      ORDER BY g.nome
    `;

    const [rows] = await connection.execute(sqlListarGrupos, [semestreEscolhido]);
    return res.json({ success: true, grupos: rows });

  } catch (err) {
    console.error('Erro ao buscar grupos do semestre:', err.stack || err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar grupos.' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (_) { /**/ }
    }
  }
});

/**
 * Função auxiliar para definir estilos do Excel
 */
function getExcelStyles() {
  return {
    // Estilo para título principal
    titleStyle: {
      font: { bold: true, size: 18, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E86AB' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      }
    },

    // Estilo para cabeçalhos de seção
    sectionHeaderStyle: {
      font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      }
    },

    // Estilo para cabeçalhos de tabela
    tableHeaderStyle: {
      font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      }
    },

    // Estilo para rótulos (labels)
    labelStyle: {
      font: { bold: true, size: 11, color: { argb: 'FF000000' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } },
      alignment: { vertical: 'middle', horizontal: 'left' },
      border: {
        top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
      }
    },

    // Estilo para valores
    valueStyle: {
      font: { size: 11, color: { argb: 'FF000000' } },
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
      border: {
        top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
      }
    },

    // Estilo para linhas da tabela (alternadas)
    tableRowStyle: {
      font: { size: 10, color: { argb: 'FF000000' } },
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
      border: {
        top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
      }
    },

    // Estilo para linhas alternadas
    tableRowAlternateStyle: {
      font: { size: 10, color: { argb: 'FF000000' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } },
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
      border: {
        top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
      }
    }
  };
}

/**
 * Função auxiliar para formatar datas
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Rota: GET /coordenador/grupos/:grupoId/relatorio
 * Descrição: Gera um arquivo Excel (.xlsx) com o relatório completo do grupo e envia como download.
 */
router.get('/grupos/:grupoId/relatorio', async (req, res) => {
  const grupoId = Number(req.params.grupoId);
  const semestreParam = String(req.query.semestre || '');

  if (isNaN(grupoId) || semestreParam.trim() === '') {
    return res.status(400).json({ success: false, message: 'Parâmetros inválidos.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // 1) Buscar dados do GRUPO
    const sqlGrupo = `
      SELECT
        id AS grupo_id,
        nome AS grupo_nome,
        semestre AS grupo_semestre,
        descricao AS grupo_descricao
      FROM Grupos
      WHERE id = ? AND semestre = ?
    `;
    const [resultGrupo] = await connection.execute(sqlGrupo, [grupoId, semestreParam]);
    
    if (resultGrupo.length === 0) {
      return res.status(404).json({ success: false, message: 'Grupo não encontrado.' });
    }
    const grupo = resultGrupo[0];

    // 2) Buscar dados do PROJETO vinculado a esse grupo/semestre
    const sqlProjeto = `
      SELECT
        p.id AS projeto_id,
        p.titulo AS projeto_titulo,
        p.descricao AS projeto_descricao,
        p.status AS projeto_status,
        uorient.nome AS projeto_orientador,
        p.data_criacao AS projeto_data_criacao,
        p.data_atualizacao AS projeto_data_atualizacao
      FROM Projetos p
      JOIN Usuarios uorient ON p.orientador_id = uorient.id
      WHERE p.grupo_id = ? AND p.semestre = ?
    `;
    const [resultProjeto] = await connection.execute(sqlProjeto, [grupoId, semestreParam]);
    const projeto = (resultProjeto.length > 0) ? resultProjeto[0] : null;

    // 3) Buscar lista de MEMBROS (detalhado)
    const sqlMembros = `
      SELECT
        u.nome AS membro_nome,
        u.email AS membro_email,
        ug.papel AS membro_papel,
        u.semestre AS membro_semestre,
        ug.data_entrada AS membro_data_entrada
      FROM Usuario_Grupo ug
      JOIN Usuarios u ON ug.usuario_id = u.id
      WHERE ug.grupo_id = ?
      ORDER BY u.nome
    `;
    const [resultMembros] = await connection.execute(sqlMembros, [grupoId]);
    const membros = resultMembros;

    // 4) Buscar "desempenho em atividades" (entregas/avaliações) deste grupo
    const sqlAtividades = `
      SELECT
        a.id AS atividade_id,
        a.titulo AS atividade_titulo,
        upr.nome AS professor_titular,
        a.prazo_entrega AS atividade_prazo,
        e.status AS entrega_status,
        e.data_entrega AS entrega_data,
        av.nota AS avaliacao_nota,
        av.comentario AS avaliacao_comentario
      FROM Atividades a
      LEFT JOIN Entregas e ON a.id = e.atividade_id AND e.grupo_id = ?
      LEFT JOIN Avaliacoes av ON e.id = av.entrega_id
      LEFT JOIN Usuarios upr ON a.professor_id = upr.id
      WHERE a.grupo_id = ?
      ORDER BY a.titulo, e.data_entrega DESC
    `;
    const [resultAtividades] = await connection.execute(sqlAtividades, [grupoId, grupoId]);
    const atividades = resultAtividades;

    // 5) Criar arquivo Excel com formatação melhorada
    const workbook = new ExcelJS.Workbook();
    const safeGrupoNome = grupo.grupo_nome.replace(/[^a-zA-Z0-9]/g, '_');
    const worksheetName = `Relatorio_${safeGrupoNome}`;
    const sheet = workbook.addWorksheet(worksheetName);

    // Configurar larguras das colunas
    sheet.getColumn('A').width = 28;
    sheet.getColumn('B').width = 45;
    sheet.getColumn('C').width = 35;
    sheet.getColumn('D').width = 25;
    sheet.getColumn('E').width = 30;
    sheet.getColumn('F').width = 15;
    sheet.getColumn('G').width = 50;

    const styles = getExcelStyles();
    let currentRow = 1;

    // === TÍTULO PRINCIPAL ===
    sheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const titleCell = sheet.getCell(`A${currentRow}`);
    titleCell.value = `RELATÓRIO ACADÊMICO - ${grupo.grupo_nome}`;
    Object.assign(titleCell, styles.titleStyle);
    sheet.getRow(currentRow).height = 30;
    currentRow += 2;

    // === SEÇÃO: INFORMAÇÕES DO GRUPO ===
    sheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const grupoHeaderCell = sheet.getCell(`A${currentRow}`);
    grupoHeaderCell.value = '📋 INFORMAÇÕES DO GRUPO';
    Object.assign(grupoHeaderCell, styles.sectionHeaderStyle);
    sheet.getRow(currentRow).height = 25;
    currentRow += 1;

    // Dados do grupo
    const grupoData = [
      ['Nome do Grupo', grupo.grupo_nome],
      ['Semestre', grupo.grupo_semestre],
      ['Descrição', grupo.grupo_descricao || 'Não informado'],
      ['Relatório gerado em', formatDate(new Date())]
    ];

    grupoData.forEach(([label, value]) => {
      const labelCell = sheet.getCell(`A${currentRow}`);
      const valueCell = sheet.getCell(`B${currentRow}`);
      
      labelCell.value = label;
      Object.assign(labelCell, styles.labelStyle);
      
      valueCell.value = value;
      Object.assign(valueCell, styles.valueStyle);
      sheet.mergeCells(`B${currentRow}:G${currentRow}`);
      
      sheet.getRow(currentRow).height = 20;
      currentRow++;
    });

    currentRow += 1;

    // === SEÇÃO: INFORMAÇÕES DO PROJETO ===
    sheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const projetoHeaderCell = sheet.getCell(`A${currentRow}`);
    projetoHeaderCell.value = '🎯 INFORMAÇÕES DO PROJETO';
    Object.assign(projetoHeaderCell, styles.sectionHeaderStyle);
    sheet.getRow(currentRow).height = 25;
    currentRow += 1;

    // Dados do projeto
    const projetoData = [
      ['Título do Projeto', projeto?.projeto_titulo || 'Não atribuído'],
      ['Descrição', projeto?.projeto_descricao || 'Não informado'],
      ['Status', projeto?.projeto_status || 'Não informado'],
      ['Professor Orientador', projeto?.projeto_orientador || 'Não atribuído'],
      ['Data de Criação', projeto?.projeto_data_criacao ? formatDate(projeto.projeto_data_criacao) : 'Não informado'],
      ['Última Atualização', projeto?.projeto_data_atualizacao ? formatDate(projeto.projeto_data_atualizacao) : 'Não informado']
    ];

    projetoData.forEach(([label, value]) => {
      const labelCell = sheet.getCell(`A${currentRow}`);
      const valueCell = sheet.getCell(`B${currentRow}`);
      
      labelCell.value = label;
      Object.assign(labelCell, styles.labelStyle);
      
      valueCell.value = value;
      Object.assign(valueCell, styles.valueStyle);
      sheet.mergeCells(`B${currentRow}:G${currentRow}`);
      
      sheet.getRow(currentRow).height = 20;
      currentRow++;
    });

    currentRow += 1;

    // === SEÇÃO: MEMBROS DO GRUPO ===
    sheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const membrosHeaderCell = sheet.getCell(`A${currentRow}`);
    membrosHeaderCell.value = '👥 MEMBROS DO GRUPO';
    Object.assign(membrosHeaderCell, styles.sectionHeaderStyle);
    sheet.getRow(currentRow).height = 25;
    currentRow += 1;

    // Cabeçalho da tabela de membros
    const membrosHeaders = ['Nome', 'E-mail', 'Papel', 'Semestre', 'Data de Entrada'];
    const membrosColumns = ['A', 'B', 'C', 'D', 'E'];
    
    membrosColumns.forEach((col, idx) => {
      const cell = sheet.getCell(`${col}${currentRow}`);
      cell.value = membrosHeaders[idx];
      Object.assign(cell, styles.tableHeaderStyle);
    });
    sheet.getRow(currentRow).height = 25;
    currentRow++;

    // Dados dos membros
    membros.forEach((membro, index) => {
      const isAlternate = index % 2 === 1;
      const rowStyle = isAlternate ? styles.tableRowAlternateStyle : styles.tableRowStyle;

      const memberData = [
        membro.membro_nome,
        membro.membro_email,
        membro.membro_papel,
        membro.membro_semestre,
        membro.membro_data_entrada ? formatDate(membro.membro_data_entrada) : 'Não informado'
      ];

      membrosColumns.forEach((col, idx) => {
        const cell = sheet.getCell(`${col}${currentRow}`);
        cell.value = memberData[idx];
        Object.assign(cell, rowStyle);
      });

      sheet.getRow(currentRow).height = 20;
      currentRow++;
    });

    currentRow += 1;

    // === SEÇÃO: DESEMPENHO EM ATIVIDADES ===
    sheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const atividadesHeaderCell = sheet.getCell(`A${currentRow}`);
    atividadesHeaderCell.value = '📊 DESEMPENHO EM ATIVIDADES';
    Object.assign(atividadesHeaderCell, styles.sectionHeaderStyle);
    sheet.getRow(currentRow).height = 25;
    currentRow += 1;

    // Cabeçalho da tabela de atividades
    const atividadesHeaders = ['Atividade', 'Professor', 'Prazo', 'Status', 'Data Entrega', 'Nota', 'Comentários'];
    const atividadesColumns = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    
    atividadesColumns.forEach((col, idx) => {
      const cell = sheet.getCell(`${col}${currentRow}`);
      cell.value = atividadesHeaders[idx];
      Object.assign(cell, styles.tableHeaderStyle);
    });
    sheet.getRow(currentRow).height = 25;
    currentRow++;

    // Dados das atividades
    if (atividades.length === 0) {
      sheet.mergeCells(`A${currentRow}:G${currentRow}`);
      const noDataCell = sheet.getCell(`A${currentRow}`);
      noDataCell.value = 'Nenhuma atividade encontrada para este grupo.';
      Object.assign(noDataCell, {
        ...styles.valueStyle,
        alignment: { vertical: 'middle', horizontal: 'center' },
        font: { ...styles.valueStyle.font, italic: true }
      });
    } else {
      atividades.forEach((atividade, index) => {
        const isAlternate = index % 2 === 1;
        const rowStyle = isAlternate ? styles.tableRowAlternateStyle : styles.tableRowStyle;

        const atividadeData = [
          atividade.atividade_titulo,
          atividade.professor_titular || 'Não informado',
          atividade.atividade_prazo ? formatDate(atividade.atividade_prazo) : 'Não definido',
          atividade.entrega_status || 'Não entregue',
          atividade.entrega_data ? formatDate(atividade.entrega_data) : '—',
          atividade.avaliacao_nota != null ? atividade.avaliacao_nota : '—',
          atividade.avaliacao_comentario || '—'
        ];

        atividadesColumns.forEach((col, idx) => {
          const cell = sheet.getCell(`${col}${currentRow}`);
          cell.value = atividadeData[idx];
          Object.assign(cell, rowStyle);
          
          // Formatação especial para nota
          if (idx === 5 && atividade.avaliacao_nota != null) {
            const nota = Number(atividade.avaliacao_nota);
            if (nota >= 7) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD5E8D4' } };
            } else if (nota >= 5) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
            } else {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
            }
          }
        });

        sheet.getRow(currentRow).height = 25;
        currentRow++;
      });
    }

    // === RODAPÉ ===
    currentRow += 2;
    sheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const footerCell = sheet.getCell(`A${currentRow}`);
    footerCell.value = `Relatório gerado automaticamente em ${formatDate(new Date())} | Sistema Acadêmico`;
    Object.assign(footerCell, {
      font: { size: 9, italic: true, color: { argb: 'FF666666' } },
      alignment: { vertical: 'middle', horizontal: 'center' }
    });

    // 6) Enviar o arquivo Excel
    const fileName = `Relatorio_${safeGrupoNome}_${grupo.grupo_semestre}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.status(200).end();

  } catch (err) {
    console.error('Erro ao gerar relatório do grupo:', err.stack || err);
    return res.status(500).json({ success: false, message: 'Erro ao gerar relatório.' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (_) { /**/ }
    }
  }
});

router.get('/grupos/:semestre/relatorioGeral', async (req, res) => {
  const semestreParam = String(req.params.semestre || '').trim();
  if (!semestreParam) {
    return res.status(400).json({ success: false, message: 'Semestre não informado.' });
  }

  let connection;
  try {
    connection = await getConnection();

    // 1) Buscar todos os grupos do semestre com lista de membros
    const sqlConsolidado = `
      SELECT
        g.nome AS grupo_nome,
        u.nome AS membro_nome,
        u.email AS membro_email,
        COUNT(*) OVER (PARTITION BY g.id) AS total_membros
      FROM Grupos g
      JOIN Usuario_Grupo ug ON g.id = ug.grupo_id
      JOIN Usuarios u ON ug.usuario_id = u.id
      WHERE g.semestre = ?
      ORDER BY g.nome, u.nome
    `;
    
    const [rows] = await connection.execute(sqlConsolidado, [semestreParam]);

    // 2) Criar o workbook estilizado
    const workbook = new ExcelJS.Workbook();
    const safeNomePlanilha = `Grupos_${semestreParam.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const sheet = workbook.addWorksheet(safeNomePlanilha);

    // === CONFIGURAÇÕES DE ESTILO ===
    
    // Cores personalizadas
    const cores = {
      azulPrimario: 'FF1F4E79',    // Azul escuro profissional
      azulSecundario: 'FF4472C4',  // Azul médio
      cinzaClaro: 'FFF2F2F2',      // Cinza claro para alternância
      cinzaMedio: 'FFD9D9D9',      // Cinza médio para bordas
      branco: 'FFFFFFFF',          // Branco
      verde: 'FF70AD47'            // Verde para destaque
    };

    // Configurar larguras das colunas
    sheet.getColumn('A').width = 35; // Nome do Grupo/Membro
    sheet.getColumn('B').width = 40; // Email (se incluído)
    sheet.getColumn('C').width = 15; // Total de Membros

    // === CABEÇALHO PRINCIPAL ===
    
    // Título principal (linha 1-2)
    sheet.mergeCells('A1:C2');
    const tituloCell = sheet.getCell('A1');
    tituloCell.value = `RELATÓRIO GERAL DE GRUPOS\nSemestre ${semestreParam}`;
    tituloCell.font = { 
      bold: true, 
      size: 18, 
      color: { argb: 'FFFFFFFF' },
      name: 'Calibri'
    };
    tituloCell.alignment = { 
      horizontal: 'center', 
      vertical: 'middle',
      wrapText: true
    };
    tituloCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: cores.azulPrimario }
    };
    tituloCell.border = {
      top: { style: 'thick', color: { argb: cores.azulPrimario } },
      left: { style: 'thick', color: { argb: cores.azulPrimario } },
      bottom: { style: 'thick', color: { argb: cores.azulPrimario } },
      right: { style: 'thick', color: { argb: cores.azulPrimario } }
    };

    // Data de geração (linha 3)
    sheet.mergeCells('A3:C3');
    const dataCell = sheet.getCell('A3');
    dataCell.value = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
    dataCell.font = { 
      italic: true, 
      size: 10, 
      color: { argb: 'FF666666' }
    };
    dataCell.alignment = { horizontal: 'center' };

    // Linha em branco para espaçamento
    let linhaAtual = 5;

    // === CONTEÚDO DOS GRUPOS ===
    
    if (rows.length === 0) {
      // Nenhum grupo encontrado
      const semGruposCell = sheet.getCell(`A${linhaAtual}`);
      semGruposCell.value = 'Nenhum grupo encontrado para este semestre.';
      semGruposCell.font = { 
        italic: true, 
        size: 12, 
        color: { argb: 'FF666666' }
      };
      semGruposCell.alignment = { horizontal: 'center' };
      sheet.mergeCells(`A${linhaAtual}:C${linhaAtual}`);
    } else {
      // Processar grupos e membros
      let grupoAtual = null;
      let contadorGrupo = 0;
      let totalGrupos = new Set(rows.map(r => r.grupo_nome)).size;

      // Adicionar cabeçalho de resumo
      const resumoCell = sheet.getCell(`A${linhaAtual}`);
      resumoCell.value = `📊 RESUMO: ${totalGrupos} grupo(s) encontrado(s)`;
      resumoCell.font = { 
        bold: true, 
        size: 12, 
        color: { argb: cores.verde }
      };
      sheet.mergeCells(`A${linhaAtual}:C${linhaAtual}`);
      linhaAtual += 2;

      rows.forEach((row, index) => {
        if (row.grupo_nome !== grupoAtual) {
          // Novo grupo encontrado
          grupoAtual = row.grupo_nome;
          contadorGrupo++;

          // Aplicar espaçamento entre grupos (exceto no primeiro)
          if (contadorGrupo > 1) {
            linhaAtual++;
          }

          // === CABEÇALHO DO GRUPO ===
          sheet.mergeCells(`A${linhaAtual}:C${linhaAtual}`);
          const grupoCell = sheet.getCell(`A${linhaAtual}`);
          grupoCell.value = `🏆 ${grupoAtual}`;
          grupoCell.font = { 
            bold: true, 
            size: 14, 
            color: { argb: 'FFFFFFFF' }
          };
          grupoCell.alignment = { 
            horizontal: 'left', 
            vertical: 'middle',
            indent: 1
          };
          grupoCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: cores.azulSecundario }
          };
          
          // Aplicar bordas ao cabeçalho do grupo
          ['A', 'B', 'C'].forEach(col => {
            const cell = sheet.getCell(`${col}${linhaAtual}`);
            cell.border = {
              top: { style: 'medium', color: { argb: cores.azulSecundario } },
              bottom: { style: 'medium', color: { argb: cores.azulSecundario } },
              left: { style: 'medium', color: { argb: cores.azulSecundario } },
              right: { style: 'medium', color: { argb: cores.azulSecundario } }
            };
          });

          linhaAtual++;

          // Subcabeçalho com total de membros
          sheet.mergeCells(`A${linhaAtual}:C${linhaAtual}`);
          const totalCell = sheet.getCell(`A${linhaAtual}`);
          totalCell.value = `👥 Total de membros: ${row.total_membros}`;
          totalCell.font = { 
            size: 10, 
            italic: true,
            color: { argb: 'FF666666' }
          };
          totalCell.alignment = { indent: 2 };
          totalCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: cores.cinzaClaro }
          };

          linhaAtual++;
        }

        // === LINHA DO MEMBRO ===
        const membroCell = sheet.getCell(`A${linhaAtual}`);
        const emailCell = sheet.getCell(`B${linhaAtual}`);
        
        membroCell.value = `• ${row.membro_nome}`;
        membroCell.font = { size: 11 };
        membroCell.alignment = { indent: 3 };
        
        if (row.membro_email) {
          emailCell.value = row.membro_email;
          emailCell.font = { size: 10, color: { argb: 'FF666666' } };
        }

        // Alternância de cores nas linhas dos membros
        const linhaMembro = linhaAtual;
        const corFundo = (linhaMembro % 2 === 0) ? cores.branco : cores.cinzaClaro;
        
        ['A', 'B', 'C'].forEach(col => {
          const cell = sheet.getCell(`${col}${linhaMembro}`);
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: corFundo }
          };
          cell.border = {
            left: { style: 'thin', color: { argb: cores.cinzaMedio } },
            right: { style: 'thin', color: { argb: cores.cinzaMedio } },
            bottom: { style: 'hair', color: { argb: cores.cinzaMedio } }
          };
        });

        linhaAtual++;
      });
    }

    // === RODAPÉ ===
    linhaAtual += 2;
    sheet.mergeCells(`A${linhaAtual}:C${linhaAtual}`);
    const rodapeCell = sheet.getCell(`A${linhaAtual}`);
    rodapeCell.value = `Relatório gerado automaticamente pelo sistema • ${new Date().getFullYear()}`;
    rodapeCell.font = { 
      size: 9, 
      italic: true, 
      color: { argb: 'FF999999' }
    };
    rodapeCell.alignment = { horizontal: 'center' };

    // === CONFIGURAÇÕES FINAIS DA PLANILHA ===
    
    // Congelar primeira linha
    sheet.views = [{ state: 'frozen', ySplit: 3 }];
    
    // Configurações de impressão
    sheet.pageSetup = {
      paperSize: 9, // A4
      orientation: 'portrait',
      horizontalCentered: true,
      verticalCentered: false,
      margins: {
        left: 0.7,
        right: 0.7,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3
      }
    };

    // 3) Enviar o arquivo Excel estilizado
    const fileName = `Relatorio_Grupos_${semestreParam}_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    await workbook.xlsx.write(res);
    res.status(200).end();
    
  } catch (err) {
    console.error('Erro ao gerar relatório geral de grupos:', err.stack || err);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno ao gerar relatório. Tente novamente.' 
    });
  } finally {
    if (connection) {
      try { 
        await connection.close(); 
      } catch (closeErr) { 
        console.warn('Aviso: Erro ao fechar conexão:', closeErr.message);
      }
    }
  }
});

module.exports = router;