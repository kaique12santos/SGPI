const crypto = require("crypto");
const nodemailer = require("nodemailer");
const emailTemplates = require("../utils/emailTemplates.js");

class EmailValidationService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT),
            secure: false,
            auth: {
                user: process.env.EMAIL_FROM,
                pass: process.env.EMAIL_PASSWORD,
            },
            tls: {
                ciphers: 'SSLv3',
                rejectUnauthorized: false, 
            },
            debug: true 
        });

        this.tokenStore = new Map();
    }

    generateValidationToken(length = 8) {
        return crypto.randomBytes(Math.ceil(length / 2))
                     .toString("hex")
                     .slice(0, length)
                     .toUpperCase();
    }

    validateFatecDomain(email) {
        return email.toLowerCase().endsWith('@fatec.sp.gov.br') || 
               email.toLowerCase().endsWith('@fatec.edu.br');
    }

    async sendValidationEmail(email, userData) {
        try {
            if (!this.validateFatecDomain(email)) {
                throw new Error('Email deve ser do domínio @fatec');
            }

            const token = this.generateValidationToken();
            const expiresAt = Date.now() + (15 * 60 * 1000); 

            this.tokenStore.set(token, {
                email,
                userData,
                expiresAt,
                attempts: 0
            });

            const emailContent = emailTemplates.validacaoEmail(userData.nome, token);

            await this.transporter.sendMail({
                from: process.env.EMAIL_FROM,
                to: email,
                subject: emailContent.subject,
                html: emailContent.html
            });

            return {
                success: true,
                message: 'Email de validação enviado com sucesso',
                tokenPreview: token.substring(0, 8).toUpperCase()
            };

        } catch (error) {
            console.error('Erro ao enviar email de validação:', error);
            throw error;
        }
    }

    async validateToken(token) {
        try {
            const tokenData = this.tokenStore.get(token);

            if (!tokenData) {
                return { success: false, message: 'Token inválido ou expirado' };
            }

            if (Date.now() > tokenData.expiresAt) {
                this.tokenStore.delete(token);
                return { success: false, message: 'Token expirado. Solicite um novo email de validação.' };
            }

            tokenData.attempts++;
            if (tokenData.attempts > 3) {
                this.tokenStore.delete(token);
                return { success: false, message: 'Muitas tentativas. Solicite um novo email de validação.' };
            }

            this.tokenStore.delete(token);

            return {
                success: true,
                message: 'Email validado com sucesso',
                userData: tokenData.userData,
                email: tokenData.email
            };

        } catch (error) {
            console.error('Erro ao validar token:', error);
            return { success: false, message: 'Erro interno do servidor' };
        }
    }

    async resendValidationEmail(email) {
        for (let [token, data] of this.tokenStore.entries()) {
            if (data.email === email) {
                this.tokenStore.delete(token);
            }
        }
        return await this.sendValidationEmail(email, { nome: 'Usuário' });
    }
}

module.exports = EmailValidationService;