// painelSemestre.js
// Lógica do DOM para o painel de gerenciamento de semestres
import { ativar } from "../utils/alerts.js";
import {
    listarSemestres,
    criarProximoSemestreAuto,
    criarSemestreManual
  } from '../services/painelSemestreService.js';
  
  // Estado do painel
  let semestres = [];
  let semestreAtual = null;
  let modoManual = false;
  
  // ========================================
  // INICIALIZAÇÃO
  // ========================================
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
  
  // ========================================
  // EVENT LISTENERS
  // ========================================
  function configurarEventListeners() {
    // Toggle modo manual
    const toggleManual = document.getElementById('modo-manual-toggle');
    if (toggleManual) {
      toggleManual.addEventListener('change', (e) => {
        modoManual = e.target.checked;
        toggleCamposManual(modoManual);
        atualizarPreview();
      });
    }
  
    // Inputs do modo manual
    const periodoInput = document.getElementById('periodo-input');
    const anoInput = document.getElementById('ano-input');
    
    if (periodoInput) {
      periodoInput.addEventListener('change', atualizarPreview);
    }
    
    if (anoInput) {
      anoInput.addEventListener('input', atualizarPreview);
    }
  
    // Botão criar semestre
    const btnCriar = document.getElementById('btn-criar-semestre');
    if (btnCriar) {
      btnCriar.addEventListener('click', handleCriarSemestre);
    }
  
    // Botão refresh histórico
    const btnRefresh = document.getElementById('btn-refresh-historico');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', async () => {
        await carregarSemestres();
        renderizarHistorico();
        ativar('Historico Atualizado','sucesso','')
      });
    }
  }
  
  // ========================================
  // CARREGAMENTO DE DADOS
  // ========================================
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
  
      // Busca o semestre com ativo = 1
      semestreAtual = semestres.find(s => s.ativo === 1);
      
      // Fallback: se nenhum está ativo, pega o mais recente
      if (!semestreAtual) {
        semestreAtual = semestres[0];
      }
      
      console.log('Semestre atual identificado:', semestreAtual);
  }
  
  // ========================================
  // RENDERIZAÇÃO
  // ========================================
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
  
    if (periodoEl) {
      periodoEl.textContent = `${semestreAtual.periodo}º Semestre`;
    }
    if (anoEl) {
      anoEl.textContent = semestreAtual.ano;
    }
  
    // Aqui você pode fazer uma chamada adicional para buscar estatísticas
    // Por enquanto, deixando valores estáticos
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
  
    listaEl.innerHTML = semestres.map((sem) => {
      const isAtivo = sem.ativo === 1;
      return `
      <div class="semestre-item">
        <div class="semestre-item-info">
          <h4>${sem.descricao || `${sem.periodo}º Semestre de ${sem.ano}`}</h4>
          <p>ID: ${sem.id}</p>
        </div>
        <div class="semestre-item-actions">
          <span class="semestre-item-badge ${isAtivo ? 'atual' : ''}">
            ${isAtivo ? '✓ Ativo' : 'Inativo'}
          </span>
          ${!isAtivo ? `
            <button class="btn-ativar" onclick="ativarSemestre(${sem.id})" title="Ativar este semestre">
              Ativar
            </button>
          ` : ''}
        </div>
      </div>
    `}).join('');
  }
  
  // ========================================
  // TOGGLE MODO MANUAL
  // ========================================
  function toggleCamposManual(mostrar) {
    const camposEl = document.getElementById('form-manual-fields');
    if (camposEl) {
      camposEl.style.display = mostrar ? 'grid' : 'none';
    }
  }
  
  // ========================================
  // PREVIEW DO SEMESTRE A SER CRIADO
  // ========================================
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
      // Lógica automática
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
  
  // ========================================
  // CRIAR SEMESTRE
  // ========================================
  async function handleCriarSemestre() {
    const btnCriar = document.getElementById('btn-criar-semestre');
    
    if (!btnCriar) return;
  
    // Verifica se modo manual tem dados válidos
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
  
    // Verifica se vai ativar automaticamente
    const ativarAuto = document.getElementById('ativar-automatico')?.checked;
    
    // Monta mensagem de confirmação
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
  
    // Confirmação (usa modal customizado se existir, senão usa confirm nativo)
    const confirmar = await mostrarModalConfirmar(tituloConfirm, mensagemConfirm);
    
    if (!confirmar) {
      return;
    } 'Criar o próximo semestre?\n\nEle será criado como INATIVO. Você poderá ativá-lo depois no histórico.';
    }
  
  
  
    // Desabilita botão
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
  
      if (data.success) {
        semestreIdCriado = data.semestre_id;
  
        // Se deve ativar automaticamente
        if (ativarAuto && semestreIdCriado) {
          btnCriar.innerHTML = '<span class="btn-icon">⏳</span>Ativando...';
          
          const ativarResponse = await fetch(`/semestres/ativar/${semestreIdCriado}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
  
          const ativarData = await ativarResponse.json();
  
          if (ativarData.success) {
            ativar('Semestre criado e ativado com sucesso!','sucesso','')
          } else {
            ativar(`Semestre criado, mas erro ao ativar: ${ativarData.message}`,'info','')
          }
        } else {
          ativar(data.message || 'Semestre criado com sucesso!','sucesso','')
        }
        
        // Recarrega dados
        await carregarSemestres();
        identificarSemestreAtual();
        renderizarSemestreAtual();
        renderizarHistorico();
        atualizarPreview();
  
        // Reseta formulário
        const toggleManual = document.getElementById('modo-manual-toggle');
        const checkboxAtivar = document.getElementById('ativar-automatico');
        
        if (toggleManual) {
          toggleManual.checked = false;
          modoManual = false;
          toggleCamposManual(false);
        }
        
        if (checkboxAtivar) {
          checkboxAtivar.checked = false;
        }
      } else {
        ativar(data.message || 'Erro ao criar semestre.','erro','')
      }
    } catch (error) {
      console.error('Erro ao criar semestre:', error);
      ativar('Erro ao conectar com o servidor.','erro','')
    } finally {
      // Reabilita botão
      if (btnCriar) {
        btnCriar.disabled = false;
        btnCriar.innerHTML = '<span class="btn-icon">+</span>Criar Próximo Semestre';
      }
    }
  
  
  

  
  // Adiciona animação de slide-out ao CSS (se não existir)
  // if (!document.querySelector('#toast-slide-out-keyframes')) {
  //   const style = document.createElement('style');
  //   style.id = 'toast-slide-out-keyframes';
  //   style.textContent = `
  //     @keyframes toast-slide-out {
  //       from {
  //         transform: translateX(0);
  //         opacity: 1;
  //       }
  //       to {
  //         transform: translateX(400px);
  //         opacity: 0;
  //       }
  //     }
  //   `;
  //   document.head.appendChild(style);
  // }

  // ========================================
// MODAL DE CONFIRMAÇÃO CUSTOMIZADO (Opcional)
// ========================================
function mostrarModalConfirmar(titulo, mensagem) {
  return new Promise((resolve) => {
    const modal = document.getElementById('modal-confirmar');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalMensagem = document.getElementById('modal-mensagem');
    const btnConfirmar = document.getElementById('modal-btn-confirmar');
    const btnCancelar = document.getElementById('modal-btn-cancelar');

    if (!modal) {
      // Fallback para confirm nativo se modal não existir
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
      if (e.target === modal) {
        handleCancelar();
      }
    };

    btnConfirmar.addEventListener('click', handleConfirmar);
    btnCancelar.addEventListener('click', handleCancelar);
    modal.addEventListener('click', handleClickOutside);

    // ESC para cancelar
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        handleCancelar();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  });
}

// ========================================
// ATIVAR SEMESTRE
// ========================================
window.ativarSemestre = async function(semestreId) {
  // Busca dados do semestre a ser ativado
  const semestre = semestres.find(s => s.id === semestreId);
  const semestreAtualDesc = semestreAtual ? `${semestreAtual.periodo}º/${semestreAtual.ano}` : 'nenhum';
  const novoSemestreDesc = semestre ? `${semestre.periodo}º/${semestre.ano}` : `ID ${semestreId}`;

  const mensagemConfirm = `⚠️ ATENÇÃO - ATIVAÇÃO DE SEMESTRE\n\n` +
    `Semestre atual: ${semestreAtualDesc}\n` +
    `Novo semestre: ${novoSemestreDesc}\n\n` +
    `Esta ação irá:\n` +
    `• DESATIVAR todos os outros semestres\n` +
    `• ATIVAR o semestre ${novoSemestreDesc}\n` +
    `• Afetar dashboards e consultas de todo o sistema\n\n` +
    `Tem certeza que deseja continuar?`;

  if (!confirm(mensagemConfirm)) {
    return;
  }

  try {
    const response = await fetch(`/semestres/ativar/${semestreId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const data = await response.json();

    if (data.success) {
      ativar(data.message,'sucesso','')
      
      // Recarrega dados
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