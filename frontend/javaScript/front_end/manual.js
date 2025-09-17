document.addEventListener("DOMContentLoaded", async () => {
    try {
      const resposta = await fetch("/api/manuais/manual", {
        headers: { Authorization: localStorage.getItem("token") }
      });
      const manuais = await resposta.json();
  
      const detalhes = document.getElementById("manual-detalhes");
      const downloadArea = document.getElementById("download-area");
  
      if (manuais.length === 0) {
        detalhes.innerHTML = "<p>Nenhum manual disponível para seu perfil.</p>";
        return;
      }
  
      manuais.forEach(manual => {
        detalhes.innerHTML += `
          <div class="manual-card">
            <h2>${manual.TITULO}</h2>
            <p>${manual.DESCRICAO || "Manual do usuário."}</p>
          </div>
        `;
  
        downloadArea.innerHTML = `
          <a href="/api/manuais/manual/download/${manual.MANUAL_ID}">
            <button class="download-btn">📥 Baixar PDF</button>
          </a>
        `;
      });
  
    } catch (err) {
      console.error("Erro ao carregar manuais", err);
    }
  });
  