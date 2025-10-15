import { ativar } from "../utils/alerts.js";
import {
    listarSemestres,
    criarProximoSemestreAuto,
    criarSemestreManual
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
      ativar('Historico Atualizado','sucesso','')
    });
  }
}

async function carregarSemestres() {
  try {
    const response = await listarSemestres();
    const data = await response.json();

    if (data.success) {
      semestres = data.semestres || [];
      console.log('Semestres carregados:', semestres);
    } else {
      console.error('Erro ao carregar semestres:', data);
      ativar('Não foi possível carregar os semestres.','erro','/painelSemestre')
    }
  } catch (error) {
    console.error('Erro na requisição de semestres:', error);
    ativar('Erro ao conectar com o servidor.','erro','/painelSemestre')
  }
}

function identificarSemestreAtual() {
  if (semestres.length === 0) {
    semestreAtual = null;
    return;
  }

  semestreAtual = semestres.find(s => s.ativo === 1);
  
  if (!semestreAtual) {
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
  if (projetosEl) projetosEl.textContent = '0';
  if (ofertasEl) ofertasEl.textContent = '0';
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

  // Limpa a lista
  listaEl.innerHTML = '';

  // Cria cada item
  semestres.forEach((sem) => {
    const isAtivo = sem.ativo === 1;
    
    // Cria o elemento
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
    
    // Adiciona event listener no botão (se existir)
    if (!isAtivo) {
      const btnAtivar = itemDiv.querySelector('.btn-ativar');
      if (btnAtivar) {
        btnAtivar.addEventListener('click', () => ativarSemestre(sem.id));
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
      if (semestreAtual.periodo === '1') {
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

  if (modoManual) {
    const periodoInput = document.getElementById('periodo-input');
    const anoInput = document.getElementById('ano-input');
    const periodo = periodoInput?.value;
    const ano = Number(anoInput?.value);

    if (!periodo || !ano || ano < 2020 || ano > 2050) {
      ativar('Preencha período e ano válidos.','erro','')
      return;
    }
  }

  const ativarAuto = document.getElementById('ativar-automatico')?.checked;
  
  let tituloConfirm = 'Criar Próximo Semestre';
  let mensagemConfirm;
  
  if (ativarAuto && semestreAtual) {
    tituloConfirm = '⚠️ ATENÇÃO - MUDANÇA DE SEMESTRE';
    mensagemConfirm = `Você está prestes a:\n\n` +
      `• Criar um novo semestre\n` +
      `• DESATIVAR o semestre atual (${semestreAtual.periodo}º/${semestreAtual.ano})\n` +
      `• ATIVAR o novo semestre\n\n` +
      `Esta ação afetará todo o sistema.\n\n` +
      `Deseja continuar?`;
  } else if (!ativarAuto) {
    mensagemConfirm = `O próximo semestre será criado como INATIVO.\n\n` +
      `Você poderá ativá-lo depois através do botão "Ativar" no histórico.\n\n` +
      `Continuar?`;
  } else {
    mensagemConfirm = `Criar o próximo semestre e ativá-lo automaticamente?`;
  }

  const confirmar = await mostrarModalConfirmar(tituloConfirm, mensagemConfirm);
  
  if (!confirmar) return;

  btnCriar.disabled = true;
  btnCriar.innerHTML = '<span class="btn-icon">⏳</span>Criando...';

  try {
    let response;
    let semestreIdCriado;

    if (modoManual) {
      const periodoInput = document.getElementById('periodo-input');
      const anoInput = document.getElementById('ano-input');
      const periodo = periodoInput?.value;
      const ano = Number(anoInput?.value);

      response = await criarSemestreManual(periodo, ano);
    } else {
      response = await criarProximoSemestreAuto();
    }

    const data = await response.json();

    console.log('[Frontend] Resposta de criar semestre:', data);

    if (data.success) {
      semestreIdCriado = data.semestre_id;

      console.log('[Frontend] ID criado:', semestreIdCriado, 'Ativar auto:', ativarAuto);

      if (ativarAuto && semestreIdCriado) {
        btnCriar.innerHTML = '<span class="btn-icon">⏳</span>Ativando...';
        
        const ativarResponse = await fetch(`/api/semestres/ativar/${semestreIdCriado}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const ativarData = await ativarResponse.json();

        console.log('[Frontend] Resposta de ativar:', ativarData);

        if (ativarData.success) {
          ativar('Semestre criado e ativado com sucesso!','sucesso','')
        } else {
          ativar(`Semestre criado, mas erro ao ativar: ${ativarData.message}`,'info','')
        }
      } else {
        ativar(data.message || 'Semestre criado com sucesso!','sucesso','')
      }
      
      await carregarSemestres();
      identificarSemestreAtual();
      renderizarSemestreAtual();
      renderizarHistorico();
      atualizarPreview();

      const toggleManual = document.getElementById('modo-manual-toggle');
      const checkboxAtivar = document.getElementById('ativar-automatico');
      
      if (toggleManual) {
        toggleManual.checked = false;
        modoManual = false;
        toggleCamposManual(false);
      }
      
      if (checkboxAtivar) checkboxAtivar.checked = false;
    } else {
      ativar(data.message || 'Erro ao criar semestre.','erro','')
    }
  } catch (error) {
    console.error('Erro ao criar semestre:', error);
    ativar('Erro ao conectar com o servidor.','erro','')
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

async function ativarSemestre(semestreId) {
  const semestre = semestres.find(s => s.id === semestreId);
  const semestreAtualDesc = semestreAtual ? `${semestreAtual.periodo}º/${semestreAtual.ano}` : 'nenhum';
  const novoSemestreDesc = semestre ? `${semestre.periodo}º/${semestre.ano}` : `ID ${semestreId}`;

  const titulo = '⚠️ ATIVAÇÃO DE SEMESTRE';
  const mensagem = `Semestre atual: ${semestreAtualDesc}\n` +
    `Novo semestre: ${novoSemestreDesc}\n\n` +
    `Esta ação irá:\n` +
    `• DESATIVAR todos os outros semestres\n` +
    `• ATIVAR o semestre ${novoSemestreDesc}\n` +
    `• Afetar dashboards e consultas de todo o sistema\n\n` +
    `Tem certeza que deseja continuar?`;

  const confirmar = await mostrarModalConfirmar(titulo, mensagem);

  if (!confirmar) return;

  try {
    const response = await fetch(`/semestres/ativar/${semestreId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const data = await response.json();

    console.log('[Frontend] Resposta de ativar (botão histórico):', data);

    if (data.success) {
      ativar(data.message,'sucesso','')
      
      await carregarSemestres();
      identificarSemestreAtual();
      renderizarSemestreAtual();
      renderizarHistorico();
    } else {
      ativar(data.message,'erro','')
    }
  } catch (error) {
    console.error('Erro ao ativar semestre:', error);
    ativar('Erro ao conectar com o servidor.', 'erro', '');
  }
}