document.addEventListener('DOMContentLoaded', function() {
    // Encontra todos os elementos que têm a classe 'password-toggle-icon'
    const toggleIcons = document.querySelectorAll('.password-toggle-icon');
  
    toggleIcons.forEach(toggleIcon => {
      // Para cada ícone, precisamos encontrar o input de senha correspondente
      // Ele será o input com a classe 'password-toggle-input' dentro do mesmo 'password-field-wrapper'
      const passwordWrapper = toggleIcon.closest('.password-field-wrapper');
      const passwordInput = passwordWrapper ? passwordWrapper.querySelector('.password-toggle-input') : null;
  
      const eyeOpenIcon = toggleIcon.querySelector('.feather-eye');
      const eyeOffIcon = toggleIcon.querySelector('.feather-eye-off');
  
      // Se encontramos o input e os ícones, configuramos o listener
      if (passwordInput && eyeOpenIcon && eyeOffIcon) {
        // Configura atributos de acessibilidade iniciais
        toggleIcon.setAttribute('role', 'button');
        toggleIcon.setAttribute('aria-label', 'Mostrar senha');
        // Usar o ID do input para aria-controls (se o input tiver ID)
        if (passwordInput.id) {
            toggleIcon.setAttribute('aria-controls', passwordInput.id);
        }
        toggleIcon.setAttribute('aria-pressed', 'false');
  
        toggleIcon.addEventListener('click', function() {
          // Alterna o tipo do input
          const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
          passwordInput.setAttribute('type', type);
  
          // Alterna a visibilidade dos ícones
          eyeOpenIcon.classList.toggle('hidden');
          eyeOffIcon.classList.toggle('hidden');
  
          // Atualiza atributos de acessibilidade
          toggleIcon.setAttribute('aria-label', type === 'password' ? 'Mostrar senha' : 'Ocultar senha');
          toggleIcon.setAttribute('aria-pressed', type === 'text' ? 'true' : 'false');
  
          // Opcional: foca no input após a alternância
          passwordInput.focus();
        });
      }
    });
  });