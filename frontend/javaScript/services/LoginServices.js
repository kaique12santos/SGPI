// Service para autenticação de usuário (login)

export async function loginUsuario(username, password) {
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
  
    const data = await response.json();
    return { ok: response.ok, data };
  }