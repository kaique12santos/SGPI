import { ativar } from "../utils/alerts.js";
import {
  obterGrupos,
  obterGrupo,
  obterMembrosDoGrupo,
  criarGrupo,
  atualizarGrupo,
  excluirGrupo,
  obterAlunosPorSemestre,
} from "../services/GerenciarGruposService.js";

document.addEventListener("DOMContentLoaded", () => {
  inicializarGerenciamentoGrupos();

  const formGrupo = document.getElementById("formGrupo");
  if (formGrupo) {
    formGrupo.addEventListener("submit", criarNovoGrupo);
  }

  const semestreSelect = document.getElementById("semestre");
  if (semestreSelect) {
    semestreSelect.addEventListener("change", () => {
      const semestreSelecionado = semestreSelect.value;
      if (semestreSelecionado !== "0") {
        carregarAlunosPorSemestre(semestreSelecionado);
      } else {
        limparAlunos();
      }
    });
  }
});

function inicializarGerenciamentoGrupos() {
  const containerGrupo = document.querySelector(".container-grupo");
  if (!containerGrupo) return;

  const listagemSection = document.createElement("div");
  listagemSection.className = "grupos-existentes";
  listagemSection.innerHTML = "<h3>Grupos Existentes</h3>";

  containerGrupo.insertAdjacentElement("afterend", listagemSection);
  carregarGrupos();
}

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

function criarCardGrupo({ id, nome, descricao, semestre }) {
  const card = document.createElement("div");
  card.className = "grupo-card";
  card.dataset.grupoId = id;

  card.innerHTML = `
    <strong>${nome}</strong>
    <p>Semestre: ${semestre}</p>
  `;

  const btnVerDetalhes = document.createElement("button");
  btnVerDetalhes.className = "btn-Ver btn";
  btnVerDetalhes.innerHTML = `👁 Ver`;
  btnVerDetalhes.onclick = () => exibirDetalhesGrupo(id);

  const btnEditar = document.createElement("button");
  btnEditar.className = "btn-alterar btn";
  btnEditar.innerHTML = `✏️ Alterar`;
  btnEditar.onclick = () => abrirModalEdicao({ id, nome, descricao, semestre });

  const btnExcluir = document.createElement("button");
  btnExcluir.className = "btn-excluir btn";
  btnExcluir.innerHTML = `🗑 Excluir`;
  btnExcluir.onclick = () => confirmarExclusaoGrupo(id, nome);

  card.appendChild(btnVerDetalhes);
  card.appendChild(btnEditar);
  card.appendChild(btnExcluir);

  return card;
}

// função de verificação de atualização de grupo
function foiAtualizado(dataCriacao, dataAtualizacao) {
    if (!dataAtualizacao) return false;
    
    if (!dataCriacao) return !!dataAtualizacao;
    
    const criacao = new Date(dataCriacao);
    const atualizacao = new Date(dataAtualizacao);
    
    const diferencaSegundos = Math.abs(atualizacao - criacao) / 1000;
    return diferencaSegundos > 10;
}

async function exibirDetalhesGrupo(grupoId) {
  try {
    const grupo = await obterGrupo(grupoId);
    const membros = await obterMembrosDoGrupo(grupoId);

    const overlay = document.createElement("div");
    overlay.className = "div-zindex";

    const modal = document.createElement("div");
    modal.className = "div-mostrar";

    let membrosHTML = "<p><strong>Membros:</strong></p><ul>";
    if (membros && membros.length > 0) {
      membros.forEach(
        (membro) => (membrosHTML += `<li>${membro.nome} (${membro.papel})</li>`)
      );
    } else {
      membrosHTML += "<li>Nenhum membro cadastrado</li>";
    }
    membrosHTML += "</ul>";

    if (foiAtualizado(grupo.dataCriacao,grupo.dataAtualizacao)=== true) {
        modal.innerHTML = `
      <h2>${grupo.nome}</h2>
      <p><strong>Descrição:</strong> ${grupo.descricao || "Sem descrição"}</p>
      <p><strong>Semestre:</strong> ${grupo.semestre}º Semestre</p>
      <p><strong>Data de Criação:</strong> ${formatarData(grupo.dataCriacao)}</p>
      <p><strong>Ultima atualização:</strong> ${formatarData(grupo.dataAtualizacao)}</p>
      ${membrosHTML}
      <button id="fecharModal" class='send-button' style="margin-top: 1rem;">Fechar</button>
    `;
    }else{
        modal.innerHTML = `
      <h2>${grupo.nome}</h2>
      <p><strong>Descrição:</strong> ${grupo.descricao || "Sem descrição"}</p>
      <p><strong>Semestre:</strong> ${grupo.semestre}º Semestre</p>
      <p><strong>Data de Criação:</strong> ${formatarData(grupo.dataCriacao)}</p>
      ${membrosHTML}
      <button id="fecharModal" class='send-button' style="margin-top: 1rem;">Fechar</button>
    `;
    }
    

    modal.querySelector("#fecharModal").onclick = () =>
      document.body.removeChild(overlay);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  } catch (error) {
    console.error("Erro ao exibir detalhes do grupo:", error);
    ativar("Não foi possível carregar os detalhes do grupo.", "erro", "");
  }
}

async function abrirModalEdicao({ id, nome, descricao, semestre }) {
  const overlay = document.createElement("div");
  overlay.className = "div-zindex";

  const modal = document.createElement("div");
  modal.className = "div-mostrar form-task";

  modal.innerHTML = `
    <form id="editar-grupo">
      <h2>Editar Grupo</h2>
      <label>Nome do Grupo:<input type="text" id="edit-nome" value="${nome}" required></label>
      <label>Tema/Descrição:<textarea id="edit-tema" required>${descricao || ""}</textarea></label>
      <label>Semestre:
        <select id="edit-semestre" required>
          <option value="0">Selecione</option>
          ${[1,2,3,4,5,6].map(n => `<option value="${n}" ${semestre == n ? 'selected':''}>${n}º</option>`).join("")}
        </select>
      </label>
      <div id="alunos-edicao-container" class="checkbox-container"></div>
      <div class="btn-group">
        <button type="submit" class="btn-alterar send-button">Salvar</button>
        <button type="button" id="cancelar-edicao" class="btn-excluir send-button">Cancelar</button>
      </div>
    </form>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const semestreSelect = modal.querySelector("#edit-semestre");
  let membrosAtuais = [];
  try {
    membrosAtuais = await obterMembrosDoGrupo(id);
  } catch (error) {
    console.error("Erro ao buscar membros:", error);
  }

  if (semestre && semestre !== "0") {
    await listarAlunosComCheckboxes(semestre, membrosAtuais, "alunos-edicao-container");
  }

  semestreSelect.addEventListener("change", () => {
    if (semestreSelect.value !== "0") {
      listarAlunosComCheckboxes(semestreSelect.value, membrosAtuais, "alunos-edicao-container");
    }
  });

  modal.querySelector("#cancelar-edicao").onclick = () =>
    document.body.removeChild(overlay);

  modal.querySelector("#editar-grupo").addEventListener("submit", async (e) => {
    e.preventDefault();
    const checkboxes = document.querySelectorAll(
      "#alunos-edicao-container input[type='checkbox']:checked"
    );
    const alunosSelecionados = Array.from(checkboxes).map((cb) => cb.value);

    const dadosAtualizados = {
      nome: modal.querySelector("#edit-nome").value,
      descricao: modal.querySelector("#edit-tema").value,
      semestre: semestreSelect.value,
      alunos: alunosSelecionados,
    };

    try {
      const data = await atualizarGrupo(id, dadosAtualizados);
      document.body.removeChild(overlay);
      ativar(data.message || "Grupo atualizado com sucesso!", "sucesso", "");
      carregarGrupos();
    } catch (error) {
      console.error("Erro:", error);
      ativar(`Falha ao atualizar grupo: ${error.message}`, "erro", "");
    }
  });
}

async function carregarAlunosPorSemestre(semestre) {
  try {
    const alunos = await obterAlunosPorSemestre(semestre);
    const container = document.getElementById("alunos-container");
    container.innerHTML = "";

    if (alunos.length === 0) {
      container.innerHTML = "<p>Nenhum aluno encontrado</p>";
      return;
    }

    alunos.forEach((aluno, index) => {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = aluno.id;
      checkbox.id = `aluno-${index}`;

      const label = document.createElement("label");
      label.htmlFor = checkbox.id;
      label.textContent = aluno.nome;

      const div = document.createElement("div");
      div.classList.add("aluno-checkbox");
      div.appendChild(checkbox);
      div.appendChild(label);

      container.appendChild(div);
    });

    limitarSelecaoDeCheckboxes(5);
  } catch (error) {
    console.error("Erro ao carregar alunos:", error);
  }
}

async function listarAlunosComCheckboxes(semestre, membrosAtuais = [], containerId) {
  try {
    const alunos = await obterAlunosPorSemestre(semestre);
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    const idsExistentes = alunos.map((a) => String(a.id));

    alunos.forEach((aluno, index) => {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = aluno.id;
      checkbox.id = `${containerId}-aluno-${index}`;

      const label = document.createElement("label");
      label.htmlFor = checkbox.id;
      label.textContent = aluno.nome;

      const div = document.createElement("div");
      div.classList.add("aluno-checkbox");
      div.appendChild(checkbox);
      div.appendChild(label);

      container.appendChild(div);
    });

    membrosAtuais.forEach((membro, index) => {
      if (!idsExistentes.includes(String(membro.id))) {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = membro.id;
        checkbox.id = `${containerId}-extra-${index}`;
        checkbox.checked = true;

        const label = document.createElement("label");
        label.htmlFor = checkbox.id;
        label.textContent = `${membro.nome} (Membro)`;

        const div = document.createElement("div");
        div.classList.add("aluno-checkbox");
        div.appendChild(checkbox);
        div.appendChild(label);

        container.appendChild(div);
      }
    });

    limitarSelecaoDeCheckboxes(5, containerId);
  } catch (error) {
    console.error("Erro ao listar alunos:", error);
  }
}

async function confirmarExclusaoGrupo(grupoId, grupoNome) {
  const confirmacao = confirm(
    `Tem certeza que deseja excluir o grupo "${grupoNome}"?\nEssa ação não pode ser desfeita.`
  );
  if (!confirmacao) return;

  try {
    const data = await excluirGrupo(grupoId);
    ativar(data.message || "Grupo excluído com sucesso!", "sucesso", "");
    carregarGrupos();
  } catch (error) {
    console.error("Erro ao excluir grupo:", error);
    ativar(`Falha ao excluir grupo: ${error.message}`, "erro", "");
  }
}

async function criarNovoGrupo(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);

  const grupoData = {
    nome: formData.get("nomeGrupo"),
    descricao: formData.get("tema"),
    semestre: formData.get("semestre"),
  };

  const checkboxes = document.querySelectorAll(
    "#alunos-container input[type='checkbox']:checked"
  );
  grupoData.alunos = Array.from(checkboxes).map((cb) => cb.value);

  if (!grupoData.nome || !grupoData.descricao || !grupoData.semestre || grupoData.alunos.length === 0) {
    ativar("Preencha todos os campos e selecione ao menos 1 aluno.", "erro", "");
    return;
  }

  try {
    const data = await criarGrupo(grupoData);
    ativar(data.message || "Grupo criado com sucesso!", "sucesso", "");
    form.reset();
    carregarGrupos();
  } catch (error) {
    console.error("Erro:", error);
    ativar(`Falha ao criar grupo: ${error.message}`, "erro", "");
  }
}

function limparAlunos() {
  const selectAlunos = document.getElementById("alunos");
  selectAlunos.innerHTML = "";
  const opt = document.createElement("option");
  opt.textContent = "Selecione um semestre primeiro";
  opt.disabled = true;
  selectAlunos.appendChild(opt);
}

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
