export function confirmarAcao(
  titulo = "Confirmação",
  mensagem = "Deseja confirmar?",
  labelSim = "Sim",
  labelNao = "Não"
) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <h3>${titulo}</h3>
        <p>${mensagem}</p>
        <div class="confirm-buttons">
          <button id="confirm-yes" class="btn-sim">${labelSim}</button>
          <button id="confirm-no" class="btn-nao">${labelNao}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector("#confirm-yes").addEventListener("click", () => { overlay.remove(); resolve(true); });
    overlay.querySelector("#confirm-no").addEventListener("click", () => { overlay.remove(); resolve(false); });
  });
}