// javaScript/front_end/Cadastro.js

import { fetchHelper } from "../utils/fetchHelper.js";

document.addEventListener("DOMContentLoaded", () => {
    const formCadastro = document.getElementById("formCadastro");
    const formValidacao = document.getElementById("formValidacaoEmail");
    const btnValidarCodigo = document.getElementById("btnValidarCodigo");
    const btnReenviarEmail = document.getElementById("btnReenviarEmail");

    let dadosUsuarioTemp = {};

    // Etapa 1: Enviar dados para iniciar cadastro e disparar e-mail
    formCadastro.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData(formCadastro);
        const payload = Object.fromEntries(formData);

        try {
            const response = await fetchHelper("/api/email-validation/iniciar-cadastro", {
                method: "POST",
                body: JSON.stringify(payload),
                headers: { "Content-Type": "application/json" }
            });

            if (response.success) {
                dadosUsuarioTemp = payload;
                alert("✅ " + response.message);
                // troca de telas: cadastro → validação
                formCadastro.style.display = "none";
                formValidacao.style.display = "flex";
            } else {
                alert("❌ " + response.message);
            }
        } catch (err) {
            console.error("Erro ao iniciar cadastro:", err);
            alert("Erro de conexão. Tente novamente.");
        }
    });

    // Etapa 2: Validar token
    btnValidarCodigo.addEventListener("click", async (e) => {
        e.preventDefault();
        const codigo = document.getElementById("codigoValidacao").value.trim();

        if (!codigo || codigo.length < 8) {
            alert("Digite o código de 8 caracteres enviado ao seu e-mail.");
            return;
        }

        try {
            const response = await fetchHelper("/api/email-validation/validar-token", {
                method: "POST",
                body: JSON.stringify({ codigo }),
                headers: { "Content-Type": "application/json" }
            });

            if (response.success) {
                alert("🎉 Cadastro concluído! Redirecionando para login...");
                setTimeout(() => window.location.href = "/index", 2000);
            } else {
                alert("❌ " + response.message);
            }
        } catch (err) {
            console.error("Erro ao validar código:", err);
            alert("Erro de conexão. Tente novamente.");
        }
    });

    // Reenviar email
    btnReenviarEmail.addEventListener("click", async (e) => {
        e.preventDefault();
        if (!dadosUsuarioTemp.email) {
            alert("Email não encontrado.");
            return;
        }

        try {
            const response = await fetchHelper("/api/email-validation/reenviar-validacao", {
                method: "POST",
                body: JSON.stringify({ email: dadosUsuarioTemp.email }),
                headers: { "Content-Type": "application/json" }
            });

            if (response.success) {
                alert("📧 Novo email de validação enviado!");
            } else {
                alert("❌ " + response.message);
            }
        } catch (err) {
            console.error("Erro ao reenviar email:", err);
            alert("Erro de conexão. Tente novamente.");
        }
    });
});