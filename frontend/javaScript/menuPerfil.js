document.addEventListener("DOMContentLoaded", () => {
    const btnPerfil = document.getElementById("user-profile-pic");
    const menu = document.getElementById("perfil-menu");
    const btnMeuPerfil = document.getElementById("btn-meu-perfil");
    const btnLogout = document.getElementById("logout-button");
    const btnNotificacoes = document.getElementById("notificacao-toggle");
    

    btnPerfil.addEventListener("click", () => {
        menu.style.display = menu.style.display === "none" ? "block" : "none";
    });

    btnMeuPerfil.addEventListener("click", () => {
        window.location.href = "/perfil.html";
    });

    btnLogout.addEventListener("click", () => {
        console.log("Logout acionado");
        window.location.href = "/login.html";
    });
    btnNotificacoes.addEventListener("click", () => {
        const isVisible = dropdown.style.display === "block";
        dropdown.style.display = isVisible ? "none" : "block";
    });

    document.addEventListener("click", function (event) {
        const isClickInside = document.querySelector(".perfil-container").contains(event.target);
        if (!isClickInside) {
            menu.style.display = "none";
        }
    });
});

