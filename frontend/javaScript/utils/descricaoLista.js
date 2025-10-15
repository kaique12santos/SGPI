export function processarDescricaoDoCard(card) {
    if (!card || card.dataset.descProcessed === 'true') return;
  
    let descEl = card.querySelector('p.card-descricao');
    if (!descEl) {
      const ps = card.querySelectorAll('p');
      if (ps.length) descEl = ps[ps.length - 1];
    }
    if (!descEl) return;
  
    const raw = (descEl.textContent || '').trim();
    if (!raw) return;
  
    const partes = raw
      .split(';')
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  
    if (partes.length > 1) {
      const ul = document.createElement('ul');
      ul.className = 'card-desc-list';
      partes.forEach(txt => {
        const li = document.createElement('li');
        li.textContent = txt.endsWith('.') ? txt.slice(0, -1) : txt;
        ul.appendChild(li);
      });
      descEl.replaceWith(ul);
    } else {
      descEl.classList.add('card-desc--multiline');
      descEl.textContent = raw.replace(/;\s*/g, ';\n');
    }
  
    card.dataset.descProcessed = 'true';
  }
  
  export function processarTodosOsCards() {
    document.querySelectorAll('.disciplina-card').forEach(processarDescricaoDoCard);
  }
  
  export function iniciarObserverDescricoes({
    containerSelector = '#section-minhas-disciplinas .disciplinas-container'
  } = {}) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
  
    processarTodosOsCards();
  
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        m.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          if (node.matches?.('.disciplina-card')) {
            processarDescricaoDoCard(node);
          }
          node.querySelectorAll?.('.disciplina-card').forEach(processarDescricaoDoCard);
        });
      }
    });
  
    observer.observe(container, { childList: true, subtree: true });
    return observer;
  }