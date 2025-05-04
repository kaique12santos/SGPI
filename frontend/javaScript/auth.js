// scripts/auth.js

(function verificarAutenticacao() {
    const usuarioId = localStorage.getItem("usuarioId");
    const tipoUsuario = localStorage.getItem("tipo_usuario");

    if (!usuarioId || !tipoUsuario) {
        alert("Você precisa estar logado para acessar esta página.");
        window.location.href = "index.html"; // ajuste o caminho se necessário
    }
})();
