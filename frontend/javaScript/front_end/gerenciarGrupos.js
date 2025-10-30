import { ativar } from "../utils/alerts.js";
import { confirmarAcao } from "../utils/confirmDialog.js";
import {
  obterGrupos,
  obterGrupo,
  obterMembrosDoGrupo,
  criarGrupo,
  atualizarGrupo,
  excluirGrupo,
  obterMinhasOrientacoes, // NOVO
  obterAlunosDisponiveis,
  obterSemestreAtivo
} from "../services/GerenciarGruposService.js";

// Estado global
let orientadorId = null;
let semestreAtivo = null;
// NOVO: Referência ao select de disciplina
let selectDisciplina = null; 

// ====================================
// INICIALIZAÇÃO
// ====================================

document.addEventListener("DOMContentLoaded", async () => {
  // Obter ID do orientador logado
  orientadorId = obterIdUsuarioLogado();
  
  if (!orientadorId) {
    ativar("Erro: Usuário não identificado.", "erro", "");
    return;
  }

  // NOVO: Pegar referência do select
  selectDisciplina = document.getElementById("disciplinaOrientacao");

  // Carregar semestre ativo (que agora também chama carregarMinhasOrientacoes)
  await carregarSemestreAtivo();

  // Inicializar gerenciamento
  inicializarGerenciamentoGrupos();

  // Event listener do formulário
  const formGrupo = document.getElementById("formGrupo");
  if (formGrupo) {
    formGrupo.addEventListener("submit", criarNovoGrupo);
  }
});

// ====================================
// FUNÇÕES AUXILIARES
// ====================================

/**
 * Obtém ID do usuário logado
 * Ajuste conforme sua implementação de autenticação
 */
function obterIdUsuarioLogado() {
  // Exemplo: pode vir de sessionStorage, cookie, token JWT, etc.
  const userId = localStorage.getItem("usuarioId");
  return userId || null;
}

/**
 * Carrega informações do semestre ativo
 */
async function carregarSemestreAtivo() {
  try {
    const resultado = await obterSemestreAtivo();
    
    if (!resultado.success || !resultado.semestre) {
      ativar("Não há semestre ativo. Avise o Administrador do sistema", "erro", "");
      if (selectDisciplina) {
        selectDisciplina.innerHTML = "<option value='' disabled selected>Falha ao carregar semestre</option>";
      }
      return;
    }

    semestreAtivo = resultado.semestre;
   
    // Atualizar UI com info do semestre
    const infoSemestre = document.getElementById("info-semestre");
    if (infoSemestre) {
      infoSemestre.textContent = `Semestre Ativo: ${semestreAtivo.periodo}º/${semestreAtivo.ano}`;
    }

    // NOVO: Chamar o carregamento das disciplinas APÓS carregar o semestre
    await carregarMinhasOrientacoes();

  } catch (error) {
    console.error("Erro ao carregar semestre ativo:", error);
    ativar("Erro ao carregar informações do semestre.", "erro", "");
    if (selectDisciplina) {
        selectDisciplina.innerHTML = "<option value='' disabled selected>Erro ao carregar</option>";
    }
  }
}

/**
 * Verifica se grupo foi atualizado após criação
 */
function foiAtualizado(dataCriacao, dataAtualizacao) {
  if (!dataAtualizacao || !dataCriacao) return false;
  
  const criacao = new Date(dataCriacao);
  const atualizacao = new Date(dataAtualizacao);
  const diferencaSegundos = Math.abs(atualizacao - criacao) / 1000;
  
  return diferencaSegundos > 10;
}

/**
 * Formata data para exibição
 */
function formatarData(dataISO) {
  if (!dataISO) return "Data não disponível";
  const data = new Date(dataISO);
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Limita seleção de checkboxes
 */
function limitarSelecaoDeCheckboxes(max, containerId = "alunos-container") {
  const checkboxes = document.querySelectorAll(
    `#${containerId} input[type="checkbox"]`
  );
  
  checkboxes.forEach((cb) => {
    cb.addEventListener("change", () => {
      const selecionados = Array.from(checkboxes).filter((c) => c.checked);
      if (selecionados.length > max) {
        cb.checked = false;
        ativar(`Você pode selecionar no máximo ${max} alunos.`, "erro", "");
      }
    });
  });
}

// ====================================
// GRUPOS - CRUD
// ====================================

/**
 * Inicializa listagem de grupos
 */
function inicializarGerenciamentoGrupos() {
  const containerGrupo = document.querySelector(".container-grupo");
  if (!containerGrupo) return;

  const listagemSection = document.createElement("div");
  listagemSection.className = "grupos-existentes";
  listagemSection.innerHTML = "<h3>Grupos Existentes</h3>";

  containerGrupo.insertAdjacentElement("afterend", listagemSection);
  carregarGrupos();
  
}
/**
 * Carrega e renderiza grupos
 */
async function carregarGrupos() {
  try {
    const grupos = await obterGrupos();

    if (!Array.isArray(grupos)) {
      console.error("Resposta inesperada de obterGrupos:", grupos);
      ativar("Não foi possível carregar a lista de grupos.", "erro", "");
      return;
    }

    renderizarGrupos(grupos);
  } catch (error) {
    console.error("Falha ao carregar grupos:", error);
    ativar("Não foi possível carregar a lista de grupos.", "erro", "");
  }
}

/**
 * Renderiza lista de grupos na UI
 */
function renderizarGrupos(grupos) {
  const container = document.querySelector(".grupos-existentes");
  if (!container) return;

  const titulo = container.querySelector("h3");
  container.innerHTML = "";
  container.appendChild(titulo);

  if (grupos.length === 0) {
    const mensagem = document.createElement("p");
    mensagem.textContent = "Nenhum grupo encontrado.";
    container.appendChild(mensagem);
    return;
  }

  grupos.forEach((grupo) => {
    const card = criarCardGrupo(grupo);
    container.appendChild(card);
  });
}

/**
 * Cria card de grupo
 */
function criarCardGrupo(grupo) {
  
  const card = document.createElement("div");
  card.className = "grupo-card";
  card.dataset.grupoId = grupo.id;

  card.innerHTML = `
    <div class="fundo_do_card">
      <strong>${grupo.nome}</strong>
    </div>
    <p>Semestre: ${grupo.semestrePadrao}º Sem.</p>
    <p>Membros: ${grupo.totalMembros}</p>
  `;


  const botoesContainer = document.createElement("div");
  botoesContainer.className = "grupo-card-botoes"; 

  const btnVerDetalhes = document.createElement("button");
  btnVerDetalhes.className = "btn-Ver btn";
  btnVerDetalhes.innerHTML = `Visualizar`;
  btnVerDetalhes.onclick = () => exibirDetalhesGrupo(grupo.id);

  const btnEditar = document.createElement("button");
  btnEditar.className = "btn-alterar btn";
  btnEditar.innerHTML = `Editar`;
  btnEditar.onclick = () => abrirModalEdicao(grupo);

  const btnExcluir = document.createElement("button");
  btnExcluir.className = "btn-excluir btn";
  btnExcluir.innerHTML = `Excluir`;
  btnExcluir.onclick = () => confirmarExclusaoGrupo(grupo.id, grupo.nome);


  botoesContainer.appendChild(btnVerDetalhes);
  botoesContainer.appendChild(btnEditar);
  botoesContainer.appendChild(btnExcluir);

  card.appendChild(botoesContainer);

  return card;
}

/**
 * Exibe modal com detalhes do grupo
 */
async function exibirDetalhesGrupo(grupoId) {
  try {
    const grupo = await obterGrupo(grupoId);
    const membros = await obterMembrosDoGrupo(grupoId);

    const overlay = document.createElement("div");
    overlay.className = "div-zindex"; //

    const modal = document.createElement("div");
    modal.className = "div-mostrar"; //

    // --- Bloco de Membros Modificado ---
    let membrosHTML = '<div class="secao-membros">';
    membrosHTML += '<h3>Membros:</h3>'; // Mais semântico que <p><strong>

    if (membros && membros.length > 0) {
      membrosHTML += '<ul class="lista-membros">'; // Nova classe
      membros.forEach((membro) => {
        // Nova estrutura para o <li> com tags
        membrosHTML += `
          <li>
            <span class="nome-membro">${membro.nome}</span>
            <span class="tag-funcao">${membro.papel} </span>
          </li>
        `;
      });
      membrosHTML += "</ul>";
    } else {
      membrosHTML += "<p>Nenhum membro cadastrado</p>"; // Simplificado
    }
    membrosHTML += "</div>";
    // --- Fim do Bloco de Membros ---


    // --- Estrutura HTML Principal Modificada ---
    const detalhesHTML = `
      <button class="btn-fechar-icone" id="fecharModalIcone">&times;</button>
      
      <div class="card-header">
        <span class="label">Grupo</span>
        <h2 class="titulo-grupo">${grupo.nome}</h2>
      </div>

      <div class="card-body">
        <div class="info-item">
          <strong>Semestre:</strong>
          <span>${grupo.semestrePadrao}º Sem</span>
        </div>
        <div class="info-item">
          <strong>Data de Criação:</strong>
          <span>${formatarData(grupo.dataCriacao)}</span>
        </div>
        
        ${foiAtualizado(grupo.dataCriacao, grupo.dataAtualizacao) 
          ? `<div class="info-item">
               <strong>Última atualização:</strong>
               <span>${formatarData(grupo.dataAtualizacao)}</span>
             </div>` 
          : ''}
        
        <hr class="divisor">
        
        ${membrosHTML}
      </div>

      <div class="card-footer">
        <button id="fecharModal" class="btn-fechar-secundario">Fechar</button>
      </div>
    `;
    // --- Fim da Estrutura HTML ---

    modal.innerHTML = detalhesHTML;

    // --- Adiciona Eventos aos DOIS Botões de Fechar ---
    const fecharModal = () => document.body.removeChild(overlay);
    
    modal.querySelector("#fecharModalIcone").onclick = fecharModal;
    modal.querySelector("#fecharModal").onclick = fecharModal;
    // --- Fim dos Eventos ---

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  } catch (error) {
    console.error("Erro ao exibir detalhes do grupo:", error);
    ativar("Não foi possível carregar os detalhes do grupo.", "erro", "");
  }
}

/**
 * Abre modal para edição de grupo
 */
async function abrirModalEdicao(grupoCardInfo) {
  const overlay = document.createElement("div");
  overlay.className = "div-zindex";

  const modal = document.createElement("div");
  // Adicionamos a classe 'form-edit-modal' para especificidade
  modal.className = "div-mostrar form-edit-modal"; 

  // 1. Estrutura do Modal (com classes CSS e sem estilos inline)
  modal.innerHTML = `
    <form id="editar-grupo">
      
      <div class="card-header">
        <h2 class="titulo-grupo">✏️ Editar Grupo</h2>
        <button type-="button" id="cancelar-edicao" class="btn-fechar-icone">&times;</button>
      </div>

      <div class="card-body">
        <label for="edit-nome" class="label-form">Nome do Grupo:</label>
        <input type="text" id="edit-nome" value="${grupoCardInfo.nome}" required class="input-form" maxlength="100">
        
        <div class="info-item">
          <strong>Semestre:</strong>
          <span>${grupoCardInfo.semestrePadrao}º Sem</span>
        </div>

        <hr class="divisor">

        <h3 class="label-form">👥 Membros Atuais (Máx. 5)</h3>
        <div id="membros-atuais-container" class="lista-edit-container">
          <p>Carregando membros...</p>
        </div>
        
        <h3 class="label-form">Adicionar Alunos (do semestre de origem)</h3>
        <div id="alunos-adicionar-container" class="lista-edit-container">
          <p>Carregando alunos disponíveis...</p>
        </div>
      </div>

      <div class="card-footer">
        <button type="submit" class="btn btn-alterar" style="width: 100%;">💾 Salvar Alterações</button>
      </div>

    </form>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Funcionalidade do botão "Fechar"
  modal.querySelector("#cancelar-edicao").onclick = () =>
    document.body.removeChild(overlay);

  // --- Carregamento de Dados ---
  let grupoCompleto;
  let membrosAtuais = [];
  let alunosDisponiveis = [];
  const containerMembros = modal.querySelector("#membros-atuais-container");
  const containerAlunos = modal.querySelector("#alunos-adicionar-container");

  try {
    // 1. Obter detalhes do grupo
    grupoCompleto = await obterGrupo(grupoCardInfo.id);
    if (!grupoCompleto || !grupoCompleto.semestrePadrao) {
      throw new Error("Não foi possível encontrar a referência de semestre para este grupo. Grupos vazios ou sem referência não podem ser editados.");
    }

    // 2. Obter membros atuais
    membrosAtuais = await obterMembrosDoGrupo(grupoCardInfo.id);
    renderizarMembrosAtuais();

    // 3. Obter alunos disponíveis
    const resultadoAlunos = await obterAlunosDisponiveis(orientadorId, grupoCompleto.semestrePadrao);
    if (resultadoAlunos.success) {
      const idsMembrosAtuais = membrosAtuais.map(m => m.id);
      alunosDisponiveis = resultadoAlunos.alunos.filter(a => !idsMembrosAtuais.includes(a.id));
      renderizarAlunosParaAdicionar();
    } else {
      throw new Error("Falha ao carregar alunos disponíveis.");
    }

  } catch (error) {
    console.error("Erro ao carregar dados para edição:", error);
    ativar(`Erro: ${error.message}`, "erro", "");
    containerMembros.innerHTML = `<p class="texto-erro">${error.message}</p>`; // Use uma classe para erros
    containerAlunos.innerHTML = "";
  }

  // --- Funções de Renderização (internas do modal) ---

  function renderizarMembrosAtuais() {
    containerMembros.innerHTML = "";
    if (membrosAtuais.length === 0) {
      containerMembros.innerHTML = "<p>Nenhum membro neste grupo.</p>";
      return;
    }

    membrosAtuais.forEach(membro => {
      const div = document.createElement("div");
      div.className = "membro-edit-item"; // Classe principal
      div.dataset.id = membro.id;
      div.dataset.nome = membro.nome;

      div.innerHTML = `
        <span class="nome-membro">${membro.nome}</span>
        <div class="membro-actions">
          <select class="membro-papel-select select-form-mini">
            <option value="Membro" ${membro.papel === 'Membro' ? 'selected' : ''}>Membro</option>
            <option value="Líder" ${membro.papel === 'Líder' ? 'selected' : ''}>Líder</option>
          </select>
          <button type="button" class="btn btn-excluir btn-mini btn-remover-membro" data-id="${membro.id}">&times; Remover</button>
        </div>
      `;
      containerMembros.appendChild(div);
    });
    
    // Adicionar listener para "Remover"
    containerMembros.querySelectorAll('.btn-remover-membro').forEach(btn => {
      btn.onclick = (e) => {
        const idParaRemover = Number(e.target.dataset.id);
        const itemElement = e.target.closest('.membro-edit-item');
        
        const membroRemovido = membrosAtuais.find(m => m.id === idParaRemover);
        if (membroRemovido) {
            alunosDisponiveis.unshift(membroRemovido); 
            renderizarAlunosParaAdicionar();
        }
        
        membrosAtuais = membrosAtuais.filter(m => m.id !== idParaRemover);
        itemElement.remove();
        
        // Se esvaziar a lista, mostrar a mensagem
        if (membrosAtuais.length === 0) {
            containerMembros.innerHTML = "<p>Nenhum membro neste grupo.</p>";
        }
      };
    });
  }

  function renderizarAlunosParaAdicionar() {
    containerAlunos.innerHTML = "";
    if (alunosDisponiveis.length === 0) {
      containerAlunos.innerHTML = "<p>Nenhum aluno disponível para adicionar.</p>";
      return;
    }

    alunosDisponiveis.forEach(aluno => {
      const div = document.createElement("div");
      div.className = "aluno-add-item"; // Classe principal
      div.dataset.id = aluno.id;
      div.dataset.nome = aluno.nome;

      div.innerHTML = `
        <span class="nome-membro">${aluno.nome}</span>
        <button type="button" class="btn btn-Ver btn-mini btn-adicionar" data-id="${aluno.id}">+ Adicionar</button>
      `;
      containerAlunos.appendChild(div);
    });

    // Adicionar listener para "Adicionar"
    containerAlunos.querySelectorAll('.btn-adicionar').forEach(btn => {
      btn.onclick = (e) => {
        const idParaAdicionar = Number(e.target.dataset.id);
        const itemElement = e.target.closest('.aluno-add-item');

        if (membrosAtuais.length >= 5) {
            ativar("Um grupo pode ter no máximo 5 membros.", "erro", "");
            return;
        }
        
        // Se a lista estava vazia, limpa a mensagem "Nenhum membro"
        if (membrosAtuais.length === 0) {
            containerMembros.innerHTML = ""; 
        }

        const alunoAdicionado = alunosDisponiveis.find(a => a.id === idParaAdicionar);
        if (alunoAdicionado) {
            membrosAtuais.push({ ...alunoAdicionado, papel: 'Membro' });
            renderizarMembrosAtuais();
        }

        alunosDisponiveis = alunosDisponiveis.filter(a => a.id !== idParaAdicionar);
        itemElement.remove();
        
        // Se esvaziar a lista, mostrar a mensagem
        if (alunosDisponiveis.length === 0) {
            containerAlunos.innerHTML = "<p>Nenhum aluno disponível para adicionar.</p>";
        }
      };
    });
  }

  // --- Lógica de Submit (sem alterações) ---
  modal.querySelector("#editar-grupo").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const nomeAtualizado = modal.querySelector("#edit-nome").value;
    if (!grupoCompleto || !grupoCompleto.semestrePadrao) {
      ativar("Erro crítico: Não foi possível identificar o semestre de origem deste grupo. Recarregue a página.", "erro", "");
      return;
    }
    const semestrePadraoDoGrupo = grupoCompleto.semestrePadrao;
    
    const membrosFinal = [];
    containerMembros.querySelectorAll(".membro-edit-item").forEach(item => {
      membrosFinal.push({
        id: item.dataset.id,
        papel: item.querySelector('.membro-papel-select').value
      });
    });
    
    const lideresCount = membrosFinal.filter(membro => membro.papel === 'Líder').length;
    
    if (membrosFinal.length === 0) {
      ativar("Um grupo não pode ficar sem membros. Adicione ao menos um.", "erro", "");
      return;
    }
    if (membrosFinal.length > 5) {
        ativar(`Um grupo não pode ter mais que 5 membros. Você tem ${membrosFinal.length}.`, "erro", "");
        return;
    }
    if (lideresCount > 1) {
      ativar("Apenas um membro pode ser selecionado como Líder no grupo.", "erro", "");
      return;
    }

    const dadosAtualizados = {
      nome: nomeAtualizado,
      membros: membrosFinal,
    };
    const confirmacao = await confirmarAcao(
      "Confirmar Alterações",
      `Deseja realmente salvar as alterações no grupo <strong>"${dadosAtualizados.nome}"</strong>?`,
      "Salvar",
      "Cancelar"
    );

    if (!confirmacao) {
      ativar("Alterações canceladas.", "info", "");
      return;
    }
    try {
      const resultado = await atualizarGrupo(grupoCardInfo.id, dadosAtualizados);
      document.body.removeChild(overlay);
      ativar(resultado.message || "Grupo atualizado com sucesso!", "sucesso", "");
      carregarGrupos();
      carregarAlunosDisponiveis(semestrePadraoDoGrupo); 
    } catch (error) {
      console.error("Erro:", error);
      ativar(`Falha ao atualizar grupo: ${error.message}`, "erro", "");
    }
  });
}

async function confirmarExclusaoGrupo(grupoId, grupoNome) {

  const confirmacao = await confirmarAcao(
    "Confirmar Exclusão",
    `Tem certeza que deseja excluir o grupo <strong>"${grupoNome}"</strong>? Esta ação não pode ser desfeita.`,
    "Excluir", // labelSim
    "Cancelar" // labelNao
  );
  if (!confirmacao) {
    ativar("Exclusão do grupo cancelada.", "info", "");
    return;
  }

  try {
    const resultado = await excluirGrupo(grupoId);
    ativar(resultado.message || "Grupo excluído com sucesso!", "sucesso", "");
    carregarGrupos();
  } catch (error) {
    console.error("Erro ao excluir grupo:", error);
    ativar(`Falha ao excluir grupo: ${error.message}`, "erro", "");
  }
}

/**
 * Cria novo grupo
 */
async function criarNovoGrupo(event) {
  event.preventDefault();
  const form = event.target;

  if (!semestreAtivo) {
    ativar("Não há semestre ativo para criar grupos.", "erro", "");
    return;
  }

  // MODIFICADO: Como lemos a disciplina selecionada
  const selectElement = document.getElementById("disciplinaOrientacao");
  const selectedOption = selectElement.options[selectElement.selectedIndex];
  const semestrePadraoSelecionado = selectElement.value; // Este é o 'semestre_padrao'
  const disciplinaIdSelecionada = selectedOption ? selectedOption.dataset.disciplinaId : null; // Este é o 'disciplina_id'

  if (!disciplinaIdSelecionada) { // Verificação corrigida
    ativar("Selecione uma disciplina de orientação.", "erro", "");
    return;
  }

  const checkboxes = document.querySelectorAll(
    "#alunos-container input[type='checkbox']:checked"
  );
  const alunosSelecionados = Array.from(checkboxes).map((cb) => cb.value);

  if (alunosSelecionados.length === 0) {
    ativar("Selecione ao menos 1 aluno para criar o grupo.", "erro", "");
    return;
  }

  // MODIFICADO: 'grupoData' agora inclui os novos IDs
  const grupoData = {
    nome: form.querySelector("#nomeGrupo").value,
    semestre_id: semestreAtivo.id,
    alunos: alunosSelecionados,
    disciplina_id: disciplinaIdSelecionada, // <-- ADICIONADO
    orientador_id: orientadorId             // <-- ADICIONADO
  };
  
  // MODIFICADO: Log atualizado para mostrar os novos dados
  console.log(
    "Enviando dados para criar grupo:", 
    "Nome:", grupoData.nome, 
    "Semestre:", grupoData.semestre_id, 
    "Alunos:", grupoData.alunos.length,
    "Disciplina:", grupoData.disciplina_id,
    "Orientador:", grupoData.orientador_id
  );
  const confirmacao = await confirmarAcao(
    "Confirmar Criação",
    `Deseja realmente criar o grupo <strong>"${grupoData.nome}"</strong> com <strong>${alunosSelecionados.length}</strong> aluno(s)?`,
    "Criar",
    "Cancelar"
  );
  if (!confirmacao) {
    ativar("Criação de grupo cancelada.", "info", "");
    return;
  }

  try {
    const resultado = await criarGrupo(grupoData);
    ativar(resultado.message || "Grupo criado com sucesso!", "sucesso", "");
    form.reset();
    limparCheckboxes("alunos-container");
    carregarGrupos();
    
    // MODIFICADO: Passa o 'semestrePadraoSelecionado' para recarregar os alunos corretamente
    carregarAlunosDisponiveis(semestrePadraoSelecionado); 
  } catch (error) {
    console.error("Erro:", error);
    ativar(`Falha ao criar grupo: ${error.message}`, "erro", "");
  }
}

// ====================================
// ALUNOS DISPONÍVEIS
// ====================================

/**
 * Carrega alunos disponíveis para formar grupos
 */
// NOVO: Função para carregar as disciplinas do orientador no select
/**
 * Carrega as disciplinas de orientação do professor no dropdown
 */
async function carregarMinhasOrientacoes() {
  if (!selectDisciplina) return;

  try {
    const resultado = await obterMinhasOrientacoes(orientadorId);
    
    if (!resultado.success || resultado.disciplinas.length === 0) {
      selectDisciplina.innerHTML = "<option value='' disabled selected>Nenhuma disciplina de orientação encontrada</option>";
      ativar("Nenhuma disciplina de orientação encontrada para este professor no semestre ativo.", "aviso", "");
      return;
    }

    selectDisciplina.innerHTML = "<option value='' disabled selected>-- Selecione uma disciplina --</option>";
    
    resultado.disciplinas.forEach(disc => {
      const option = document.createElement("option");
      
      // MODIFICADO: O valor (value) continua sendo o semestre_padrao
      option.value = disc.semestre_padrao; 
      
      // NOVO: Armazenamos o ID da disciplina em um 'data-attribute'
      option.dataset.disciplinaId = disc.id; 
      
      option.textContent = `${disc.nome} (${disc.semestre_padrao}º Semestre)`;
      selectDisciplina.appendChild(option);
    });

    // Adicionar o listener de mudança
    selectDisciplina.addEventListener("change", handleOrientacaoChange);

  } catch (error) {
    console.error("Erro ao carregar disciplinas:", error);
    selectDisciplina.innerHTML = "<option value='' disabled selected>Erro ao carregar disciplinas</option>";
    ativar("Erro ao carregar suas disciplinas de orientação.", "erro", "");
  }
}

// NOVO: Handler para a mudança no select de disciplina
/**
 * Chamado quando o usuário seleciona uma disciplina de orientação
 */
async function handleOrientacaoChange(event) {
  const semestrePadrao = event.target.value;
  const container = document.getElementById("alunos-container");
  
  if (!semestrePadrao) {
    container.innerHTML = "<p class='p_Check-box'>Selecione uma disciplina de orientação para ver os alunos disponíveis</p>";
    return;
  }

  container.innerHTML = "<p class='p_Check-box'>Carregando alunos...</p>";
  await carregarAlunosDisponiveis(semestrePadrao);
}


/**
 * Carrega alunos disponíveis para formar grupos
 */
// MODIFICADO: Recebe semestrePadrao e usa "alunos-container" como padrão
async function carregarAlunosDisponiveis(semestrePadrao, containerId = "alunos-container") {
  try {
    // MODIFICADO: Passa o semestrePadrao para o service
    const resultado = await obterAlunosDisponiveis(orientadorId, semestrePadrao);

    if (!resultado.success) {
      ativar("Não foi possível carregar alunos disponíveis.", "erro", "");
      return;
    }

    renderizarAlunosDisponiveis(resultado.alunos, containerId);
  } catch (error) {
    console.error("Erro ao carregar alunos:", error);
    ativar("Erro ao carregar lista de alunos.", "erro", "");
    const container = document.getElementById(containerId);
    if(container) container.innerHTML = "<p>Erro ao carregar alunos.</p>";
  }
}

/**
 * Renderiza alunos disponíveis com checkboxes
 */
// MODIFICADO: Recebe o containerId
function renderizarAlunosDisponiveis(alunos, containerId = "alunos-container") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  if (alunos.length === 0) {
    container.innerHTML = "<p>Nenhum aluno disponível para este semestre.</p>";
    return;
  }

  alunos.forEach((aluno, index) => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = aluno.id;
    checkbox.id = `${containerId}-aluno-${index}`; // ID único por container

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent = `${aluno.nome}`;

    const div = document.createElement("div");
    div.classList.add("aluno-checkbox");
    div.appendChild(checkbox);
    div.appendChild(label);

    container.appendChild(div);
  });

  limitarSelecaoDeCheckboxes(5, containerId);
}


/**
 * Carrega alunos para edição (disponíveis + membros atuais)
 */
async function carregarAlunosParaEdicao(membrosAtuais = [], containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // NOVO: Descobrir qual semestre padrão está selecionado no formulário principal
  const select = document.getElementById('disciplinaOrientacao');
  const semestrePadrao = select ? select.value : null;

  if (!semestrePadrao) {
      container.innerHTML = "<p>Por favor, selecione uma disciplina de orientação no formulário principal para poder editar membros.</p>";
      return;
  }

  try {
    // MODIFICADO: Busca alunos do semestre padrão selecionado
    const resultado = await obterAlunosDisponiveis(orientadorId, semestrePadrao);

    const alunos = resultado.alunos;
    container.innerHTML = "";

    const idsDisponiveis = alunos.map((a) => String(a.id));
    const idsMembros = membrosAtuais.map((m) => String(m.id));

    // Renderizar alunos disponíveis
    alunos.forEach((aluno, index) => {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = aluno.id;
      checkbox.id = `${containerId}-aluno-${index}`;
      
      // Marcar se já é membro
      if (idsMembros.includes(String(aluno.id))) {
        checkbox.checked = true;
      }

      const label = document.createElement("label");
      label.htmlFor = checkbox.id;
      label.textContent = aluno.nome;

      const div = document.createElement("div");
      div.classList.add("aluno-checkbox");
      div.appendChild(checkbox);
      div.appendChild(label);

      container.appendChild(div);
    });

    // Adicionar membros que não estão mais disponíveis (já em outro grupo)
    membrosAtuais.forEach((membro, index) => {
      if (!idsDisponiveis.includes(String(membro.id))) {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = membro.id;
        checkbox.id = `${containerId}-extra-${index}`;
        checkbox.checked = true;

        const label = document.createElement("label");
        label.htmlFor = checkbox.id;
        label.textContent = `${membro.nome} (Membro atual)`;

        const div = document.createElement("div");
        div.classList.add("aluno-checkbox");
        div.appendChild(checkbox);
        div.appendChild(label);

        container.appendChild(div);
      }
    });

    limitarSelecaoDeCheckboxes(5, containerId);
  } catch (error) {
    console.error("Erro ao carregar alunos para edição:", error);
    container.innerHTML = "<p>Erro ao carregar alunos.</p>";
  }
}

/**
 * Limpa checkboxes de um container
 */
function limparCheckboxes(containerId) {
  const checkboxes = document.querySelectorAll(
    `#${containerId} input[type="checkbox"]`
  );
  checkboxes.forEach((cb) => (cb.checked = false));
}