document.addEventListener('DOMContentLoaded', () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem('usuario'));

    // --- MANEJO DE LOGIN (Si estamos en index.html) ---
    const loginForm = document.getElementById('loginForm') || document.querySelector('form');
    if (loginForm && window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.querySelector('input[type="email"]') || document.querySelector('input[type="text"]');
            const passwordInput = document.querySelector('input[type="password"]');

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailInput.value.trim(), password: passwordInput.value })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                localStorage.setItem('usuario', JSON.stringify(data.usuario));
                window.location.href = '/dashboard.html';
            } catch (err) {
                alert(err.message);
            }
        });
        return;
    }

    // --- MANEJO DE DASHBOARD ---
    if (window.location.pathname.includes('dashboard.html')) {
        if (!usuarioGuardado) {
            window.location.href = '/index.html';
            return;
        }

        // Mostrar datos del usuario
        document.getElementById('user-name').textContent = usuarioGuardado.username;
        document.getElementById('user-role').textContent = usuarioGuardado.rol;

        // BOTÓN CERRAR SESIÓN
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('usuario');
                window.location.href = '/index.html';
            });
        }

        // MOSTRAR PANEL ADMIN SI EL ROL ES ADMIN
        if (usuarioGuardado.rol === 'admin') {
            const adminSection = document.getElementById('admin-section');
            if (adminSection) adminSection.classList.remove('hidden');

            cargarUsuarios();

            // Formulario Crear Usuario
            const createUserForm = document.getElementById('create-user-form');
            if (createUserForm) {
                createUserForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const username = document.getElementById('new-username').value;
                    const email = document.getElementById('new-email').value;
                    const password = document.getElementById('new-password').value;
                    const rol = document.getElementById('new-role').value;

                    try {
                        const res = await fetch('/api/usuarios', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username, email, password, rol })
                        });

                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error);

                        alert('✅ Usuario creado exitosamente');
                        createUserForm.reset();
                        cargarUsuarios();
                    } catch (err) {
                        alert('❌ Error: ' + err.message);
                    }
                });
            }
        }
    }
});

// Función para cargar la lista de usuarios en la tabla
async function cargarUsuarios() {
    try {
        const res = await fetch('/api/usuarios');
        const usuarios = await res.json();
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';
        usuarios.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${u.id}</td>
                <td>${u.username}</td>
                <td>${u.email || '-'}</td>
                <td><strong>${u.rol}</strong></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error cargando usuarios:', err);
    }
}
