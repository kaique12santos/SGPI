import { ativar as toast } from "../utils/alerts.js";
import {
  // novos services
  listarTodosSemestres,
  getSemestreAtivo,
  criarSemestre,
  ativarSemestre as svcAtivarSemestre,
  // legados (mantidos se você ainda tem no backend)
  listarSemestres,                // GET /semestres/listar (legado)
  criarProximoSemestreAuto,      // POST /semestres/criar-proximo (legado)
  criarSemestreManual            // POST /semestres/criar-proximo (legado manual)
} from '../services/painelSemestreService.js';

let semestres = [];
let semestreAtual = null;
let modoManual = false;

document.addEventListener('DOMContentLoaded', () => {
  inicializarPainel();
  configurarEventListeners();
});

async function inicializarPainel() {
  await carregarSemestres();
  identificarSemestreAtual();
  renderizarSemestreAtual();
  renderizarHistorico();
  atualizarPreview();
}

function configurarEventListeners() {
  const toggleManual = document.getElementById('modo-manual-toggle');
  if (toggleManual) {
    toggleManual.addEventListener('change', (e) => {
      modoManual = e.target.checked;
      toggleCamposManual(modoManual);
      atualizarPreview();
    });
  }

  const periodoInput = document.getElementById('periodo-input');
  const anoInput = document.getElementById('ano-input');
  
  if (periodoInput) periodoInput.addEventListener('change', atualizarPreview);
  if (anoInput) anoInput.addEventListener('input', atualizarPreview);

  const btnCriar = document.getElementById('btn-criar-semestre');
  if (btnCriar) btnCriar.addEventListener('click', handleCriarSemestre);

  const btnRefresh = document.getElementById('btn-refresh-historico');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      await carregarSemestres();
      renderizarHistorico();
      toast('Historico Atualizado','sucesso','');
    });
  }
}

async function carregarSemestres() {
  try {
    const response = await listarTodosSemestres();
    const data = await response.json();

    if (data.success) {
      semestres = data.data || [];
      console.log('Semestres carregados:', semestres);
    } else {
      console.error('Erro ao carregar semestres:', data);
      toast('Não foi possível carregar os semestres.','erro','/painelSemestre');
    }
  } catch (error) {
    console.error('Erro na requisição de semestres:', error);
    toast('Erro ao conectar com o servidor.','erro','/painelSemestre');
  }
}

function identificarSemestreAtual() {
  if (semestres.length === 0) {
    semestreAtual = null;
    return;
  }

  semestreAtual = semestres.find(s => Number(s.ativo) === 1);
  if (!semestreAtual) {
    // fallback: mais recente
    semestreAtual = semestres[0];
  }
  console.log('Semestre atual identificado:', semestreAtual);
}

function renderizarSemestreAtual() {
  const periodoEl = document.getElementById('semestre-atual-periodo');
  const anoEl = document.getElementById('semestre-atual-ano');
  const projetosEl = document.getElementById('semestre-atual-projetos');
  const ofertasEl = document.getElementById('semestre-atual-ofertas');

  if (!semestreAtual) {
    if (periodoEl) periodoEl.textContent = 'Nenhum semestre';
    if (anoEl) anoEl.textContent = 'cadastrado';
    if (projetosEl) projetosEl.textContent = '0';
    if (ofertasEl) ofertasEl.textContent = '0';
    return;
  }

  if (periodoEl) periodoEl.textContent = `${semestreAtual.periodo}º Semestre`;
  if (anoEl) anoEl.textContent = semestreAtual.ano;
  // se quiser buscar números reais, crie services para estatísticas e preencha aqui
  if (projetosEl) projetosEl.textContent = String(semestreAtual.total_projetos ?? 0);
  if (ofertasEl) ofertasEl.textContent = String(semestreAtual.total_ofertas ?? 0);
}

function renderizarHistorico() {
  const listaEl = document.getElementById('semestre-lista');
  if (!listaEl) return;

  if (semestres.length === 0) {
    listaEl.innerHTML = `
      <div class="semestre-item" style="justify-content: center;">
        <p style="color: #6b7280; margin: 0;">Nenhum semestre cadastrado</p>
      </div>
    `;
    return;
  }

  listaEl.innerHTML = '';
  semestres.forEach((sem) => {
    const isAtivo = Number(sem.ativo) === 1;
    const itemDiv = document.createElement('div');
    itemDiv.className = 'semestre-item';
    
    itemDiv.innerHTML = `
      <div class="semestre-item-info">
        <h4>${sem.periodo}º Semestre de ${sem.ano}</h4>
        <p>ID: ${sem.id}</p>
      </div>
      <div class="semestre-item-actions">
        <span class="semestre-item-badge ${isAtivo ? 'atual' : ''}">
          ${isAtivo ? '✓ Ativo' : 'Inativo'}
        </span>
        ${!isAtivo ? '<button class="btn-ativar" data-semestre-id="' + sem.id + '" title="Ativar este semestre">Ativar</button>' : ''}
      </div>
    `;
    
    if (!isAtivo) {
      const btnAtivar = itemDiv.querySelector('.btn-ativar');
      if (btnAtivar) {
        btnAtivar.addEventListener('click', () => ativarSemestreUI(sem.id));
      }
    }
    listaEl.appendChild(itemDiv);
  });
}

function toggleCamposManual(mostrar) {
  const camposEl = document.getElementById('form-manual-fields');
  if (camposEl) camposEl.style.display = mostrar ? 'grid' : 'none';
}

function atualizarPreview() {
  const previewEl = document.getElementById('semestre-preview');
  const previewValueEl = document.getElementById('preview-value');
  if (!previewEl || !previewValueEl) return;

  let proximoPeriodo, proximoAno;

  if (modoManual) {
    const periodoInput = document.getElementById('periodo-input');
    const anoInput = document.getElementById('ano-input');

    proximoPeriodo = periodoInput?.value || '1';
    proximoAno = anoInput?.value || new Date().getFullYear();
  } else {
    if (!semestreAtual) {
      proximoPeriodo = '1';
      proximoAno = new Date().getFullYear();
    } else {
      if (String(semestreAtual.periodo) === '1') {
        proximoPeriodo = '2';
        proximoAno = semestreAtual.ano;
      } else {
        proximoPeriodo = '1';
        proximoAno = Number(semestreAtual.ano) + 1;
      }
    }
  }

  previewValueEl.textContent = `${proximoPeriodo}º Semestre de ${proximoAno}`;
  previewEl.style.display = 'block';
}

async function handleCriarSemestre() {
  const btnCriar = document.getElementById('btn-criar-semestre');
  if (!btnCriar) return;

  let periodo, ano;

  if (modoManual) {
    const periodoInput = document.getElementById('periodo-input');
    const anoInput = document.getElementById('ano-input');
    periodo = periodoInput?.value;
    ano = Number(anoInput?.value);

    if (!periodo || !ano || ano < 2020 || ano > 2050) {
      toast('Preencha período e ano válidos.','erro','');
      return;
    }
  } else {
    // Calcular próximo semestre automaticamente
    if (!semestreAtual) {
      periodo = '1';
      ano = new Date().getFullYear();
    } else {
      if (String(semestreAtual.periodo) === '1') {
        periodo = '2';
        ano = semestreAtual.ano;
      } else {
        periodo = '1';
        ano = Number(semestreAtual.ano) + 1;
      }
    }
  }

  const checkboxAtivar = document.getElementById('ativar-automatico');
  const ativarAuto = checkboxAtivar?.checked;

  let tituloConfirm = 'Criar Próximo Semestre';
  let mensagemConfirm;
  if (ativarAuto && semestreAtual) {
    tituloConfirm = '⚠️ ATENÇÃO - MUDANÇA DE SEMESTRE';
    mensagemConfirm = `Você está prestes a:\n\n` +
      `• Criar um novo semestre (${periodo}/${ano})\n` +
      `• DESATIVAR o semestre atual (${semestreAtual.periodo}º/${semestreAtual.ano})\n` +
      `• ATIVAR o novo semestre\n\n` +
      `Esta ação afetará todo o sistema.\n\n` +
      `Deseja continuar?`;
  } else if (!ativarAuto) {
    mensagemConfirm = `O semestre ${periodo}/${ano} será criado como INATIVO.\n\n` +
      `Você poderá ativá-lo depois através do botão "Ativar" no histórico.\n\n` +
      `Continuar?`;
  } else {
    mensagemConfirm = `Criar o semestre ${periodo}/${ano} e ativá-lo automaticamente?`;
  }

  const confirmar = await mostrarModalConfirmar(tituloConfirm, mensagemConfirm);
  if (!confirmar) return;

  btnCriar.disabled = true;
  btnCriar.innerHTML = '<span class="btn-icon">⏳</span>Criando...';

  try {
    const response = await criarSemestre(periodo, ano);
    const data = await response.json();

    console.log('[Frontend] Resposta de criar semestre:', data);

    if (data.success) {
      const semestreIdCriado = data.semestre_id || data.id;

      if (ativarAuto && semestreIdCriado) {
        btnCriar.innerHTML = '<span class="btn-icon">⏳</span>Ativando...';

        const ativarResp = await svcAtivarSemestre(semestreIdCriado, {
          gerarOfertas: true,
          copiarProfessores: true
        });
        const ativarData = await ativarResp.json();

        console.log('[Frontend] Resposta de ativar:', ativarData);

        if (ativarData.success) {
          toast('Semestre criado e ativado com sucesso!','sucesso','');
        } else {
          toast(`Semestre criado, mas erro ao ativar: ${ativarData.message}`,'info','');
        }
      } else {
        toast(data.message || 'Semestre criado com sucesso!','sucesso','');
      }

      await carregarSemestres();
      identificarSemestreAtual();
      renderizarSemestreAtual();
      renderizarHistorico();
      atualizarPreview();

      const toggleManual = document.getElementById('modo-manual-toggle');
      const checkboxAtivarReset = document.getElementById('ativar-automatico');
      if (toggleManual) {
        toggleManual.checked = false;
        modoManual = false;
        toggleCamposManual(false);
      }
      if (checkboxAtivarReset) checkboxAtivarReset.checked = false;
    } else {
      toast(data.message || 'Erro ao criar semestre.','erro','');
    }
  } catch (error) {
    console.error('[Frontend] Erro ao criar semestre:', error);
    toast('Erro ao conectar com o servidor.','erro','');
  } finally {
    if (btnCriar) {
      btnCriar.disabled = false;
      btnCriar.innerHTML = '<span class="btn-icon">+</span>Criar Próximo Semestre';
    }
  }
}

function mostrarModalConfirmar(titulo, mensagem) {
  return new Promise((resolve) => {
    const modal = document.getElementById('modal-confirmar');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalMensagem = document.getElementById('modal-mensagem');
    const btnConfirmar = document.getElementById('modal-btn-confirmar');
    const btnCancelar = document.getElementById('modal-btn-cancelar');

    if (!modal) {
      resolve(confirm(`${titulo}\n\n${mensagem}`));
      return;
    }

    modalTitulo.textContent = titulo;
    modalMensagem.textContent = mensagem;
    modal.style.display = 'flex';

    const handleConfirmar = () => {
      modal.style.display = 'none';
      cleanup();
      resolve(true);
    };

    const handleCancelar = () => {
      modal.style.display = 'none';
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      btnConfirmar.removeEventListener('click', handleConfirmar);
      btnCancelar.removeEventListener('click', handleCancelar);
      modal.removeEventListener('click', handleClickOutside);
    };

    const handleClickOutside = (e) => {
      if (e.target === modal) handleCancelar();
    };

    btnConfirmar.addEventListener('click', handleConfirmar);
    btnCancelar.addEventListener('click', handleCancelar);
    modal.addEventListener('click', handleClickOutside);

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        handleCancelar();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  });
}

async function ativarSemestreUI(semestreId) {
  const semestre = semestres.find(s => s.id === semestreId);
  const semestreAtualDesc = semestreAtual ? `${semestreAtual.periodo}º/${semestreAtual.ano}` : 'nenhum';
  const novoSemestreDesc = semestre ? `${semestre.periodo}º/${semestre.ano}` : `ID ${semestreId}`;

  const titulo = '⚠️ ATIVAÇÃO DE SEMESTRE';
  const mensagem = `Semestre atual: ${semestreAtualDesc}\n` +
    `Novo semestre: ${novoSemestreDesc}\n\n` +
    `Esta ação irá:\n` +
    `• DESATIVAR todos os outros semestres\n` +
    `• ATIVAR o semestre ${novoSemestreDesc}\n` +
    `• GERAR ofertas e copiar professores (recomendado)\n\n` +
    `Tem certeza que deseja continuar?`;

  const confirmar = await mostrarModalConfirmar(titulo, mensagem);
  if (!confirmar) return;

  try {
    const resp = await svcAtivarSemestre(semestreId, {
      gerarOfertas: true,
      copiarProfessores: true
    });
    const data = await resp.json();

    console.log('[Frontend] Resposta de ativar (botão histórico):', data);

    if (data.success) {
      toast(data.message || 'Semestre ativado com sucesso!','sucesso','');
      await carregarSemestres();
      identificarSemestreAtual();
      renderizarSemestreAtual();
      renderizarHistorico();
    } else {
      toast(data.message || 'Erro ao ativar semestre.','erro','');
    }
  } catch (error) {
    console.error('Erro ao ativar semestre:', error);
    toast('Erro ao conectar com o servidor.', 'erro', '');
  }
}