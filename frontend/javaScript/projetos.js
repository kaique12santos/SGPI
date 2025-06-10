import { ativar } from "./alerts.js";

document.addEventListener('DOMContentLoaded', () => {
    carregarGruposPorSemestre()
    document.getElementById('formProjeto').addEventListener('submit', criarProjeto);
  });

  document.getElementById('semestre').addEventListener('change', function () {
    const semestreSelecionado = this.value;
    if (semestreSelecionado) {
      carregarGruposPorSemestre(semestreSelecionado);
      
    } else {
      document.getElementById('grupo').innerHTML = '<option value="">Selecione um grupo</option>';
    }
  });
  
  async function carregarGruposPorSemestre(semestre) {
    const grupoSelect = document.getElementById('grupo');
    grupoSelect.innerHTML = '<option value="">Carregando grupos...</option>';
  
    try {
      const [resGrupos, resProjetos] = await Promise.all([
        fetch(`/api/grupos?semestre=${semestre}`),
        fetch(`/api/projetos?orientador_id=${localStorage.getItem('usuarioId')}`)
      ]);
  
      const dataGrupos = await resGrupos.json();
      const dataProjetos = await resProjetos.json();
  
      grupoSelect.innerHTML = '';
  
      if (dataGrupos.success && dataGrupos.grupos.length > 0) {
        const gruposUsados = dataProjetos.projetos.map(p => p.grupo_id);
        const gruposDisponiveis = dataGrupos.grupos.filter(g => !gruposUsados.includes(g.ID));
  
        if (gruposDisponiveis.length === 0) {
          grupoSelect.innerHTML = '<option value="">Nenhum grupo disponível</option>';
          return;
        }
  
        grupoSelect.innerHTML = '<option value="">Selecione um grupo</option>';
        gruposDisponiveis.forEach(g => {
          const opt = document.createElement('option');
          opt.value = g.ID;
          opt.textContent = g.NOME;
          grupoSelect.appendChild(opt);
        });
      } else {
        grupoSelect.innerHTML = '<option value="">Nenhum grupo encontrado</option>';
      }
    } catch (e) {
      console.error('Erro ao carregar grupos:', e);
      grupoSelect.innerHTML = '<option value="">Erro ao buscar grupos</option>';
    }
  }
  
  
  
  async function criarProjeto(event) {
    event.preventDefault();
  
    const titulo = document.getElementById('titulo').value.trim();
    const descricao = document.getElementById('descricao').value.trim();
    const semestre = document.getElementById('semestre').value.trim();
    const grupo_id = document.getElementById('grupo').value;
    const orientador_id = localStorage.getItem('usuarioId'); // já salvo no login
  
  
    if (!titulo || !grupo_id || !semestre || !descricao) {
      ativar('Preencha todos os campos obrigatórios.','info','')
      return;
    }
  
    try {
      const res = await fetch('/api/projetos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          descricao,
          grupo_id,
          orientador_id,
          semestre
        })
      });
  
      const result = await res.json();
  
     
  
      if (result.success) {
        document.getElementById('formProjeto').reset();
        ativar('Projeto criado com sucesso!', 'sucesso', '/projetos.html');

      }
    } catch (err) {
      ativar('Erro na requisição','erro','')
    }
  }
  