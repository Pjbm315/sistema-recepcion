document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form') || document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message') || document.getElementById('errorMessage');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Buscar inputs por typo, id o name
            const emailInput = document.querySelector('input[type="email"]') || document.querySelector('input[type="text"]');
            const passwordInput = document.querySelector('input[type="password"]');

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';

            if (errorMessage) errorMessage.textContent = '';

            try {
                // Petición a ruta relativa /api/login
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                // Verificar que el servidor devolvió un JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('El servidor no devolvió una respuesta JSON válida.');
                }

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Ocurrió un error al iniciar sesión');
                }

                // Guardar usuario en localStorage y redirigir
                localStorage.setItem('usuario', JSON.stringify(data.usuario));
                window.location.href = '/dashboard.html';

            } catch (error) {
                console.error('Error de autenticación:', error);
                if (errorMessage) {
                    errorMessage.textContent = error.message;
                } else {
                    alert(error.message);
                }
            }
        });
    }
});
