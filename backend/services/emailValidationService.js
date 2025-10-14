const crypto = require("crypto");
const nodemailer = require("nodemailer");

class EmailValidationService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT),
            secure: false, // true para 465, false para 587
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

        // ✅ inicializa o tokenStore
        this.tokenStore = new Map();
    }

    // Gerar token de validação
    generateValidationToken(length = 8) {
        return crypto.randomBytes(Math.ceil(length / 2))
                     .toString("hex")
                     .slice(0, length)
                     .toUpperCase();   // Ficará tipo "A1B2C3D4"
    }

    // Validar domínio @fatec (mantendo a validação existente)
    validateFatecDomain(email) {
        return email.toLowerCase().endsWith('@fatec.sp.gov.br') || 
               email.toLowerCase().endsWith('@fatec.edu.br');
    }

    // Enviar email de validação
    async sendValidationEmail(email, userData) {
        try {
            if (!this.validateFatecDomain(email)) {
                throw new Error('Email deve ser do domínio @fatec');
            }

            const token = this.generateValidationToken();
            const expiresAt = Date.now() + (15 * 60 * 1000); 

            // ✅ salva token em memória
            this.tokenStore.set(token, {
                email,
                userData,
                expiresAt,
                attempts: 0
            });
           

            const emailTemplate = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2c3e50;">Validação de Email - SGPI</h2>
                    <p>Olá <strong>${userData.nome}</strong>,</p>
                    <p>Para completar seu cadastro, você precisa validar seu email utilizando o codigo abaixo:</p>

                    <p>Ou use o código de validação: 
                        <strong style="font-size: 18px; color: #e74c3c;">
                            ${token.substring(0, 8).toUpperCase()}
                        </strong>
                    </p>

                    <p style="color: #7f8c8d; font-size: 12px;">
                        Este link expira em 15 minutos.<br>
                        Se você não solicitou este cadastro, ignore este email.
                    </p>
                </div>
            `;

            await this.transporter.sendMail({
                from: process.env.EMAIL_FROM,
                to: email,
                subject: 'Validação de Email - SGPI',
                html: emailTemplate
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

    // Validar token
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

    // Reenviar email de validação
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