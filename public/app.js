document.addEventListener('DOMContentLoaded', () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem('usuario'));

    // --- MANEJO DE LOGIN ---
    const loginForm = document.getElementById('loginForm') || document.querySelector('form');
    if (loginForm && (window.location.pathname.includes('index.html') || window.location.pathname === '/')) {
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

        // Mostrar credenciales
        document.getElementById('user-name').textContent = usuarioGuardado.username;
        document.getElementById('user-role').textContent = usuarioGuardado.rol.toUpperCase();

        // Cierre de Sesión
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('usuario');
                window.location.href = '/index.html';
            });
        }

        // Cargar historial de visitas (Disponible para todos)
        cargarVisitas();

        // Formulario Registrar Visita
        const visitorForm = document.getElementById('visitor-form');
        if (visitorForm) {
            visitorForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const nombre = document.getElementById('vis-nombre').value;
                const cedula = document.getElementById('vis-cedula').value;
                const asunto = document.getElementById('vis-asunto').value;

                try {
                    const res = await fetch('/api/visitas', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            nombre,
                            cedula,
                            asunto,
                            registrado_por: usuarioGuardado.username
                        })
                    });

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);

                    alert('✅ Visita registrada con éxito');
                    visitorForm.reset();
                    cargarVisitas();
                } catch (err) {
                    alert('❌ Error: ' + err.message);
                }
            });
        }

        // VISTA EXCLUSIVA DE ADMINISTRADOR
        if (usuarioGuardado.rol === 'admin') {
            const adminSection = document.getElementById('admin-section');
            if (adminSection) adminSection.classList.remove('hidden');

            cargarUsuarios();

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

// Función para cargar tabla de visitas
async function cargarVisitas() {
    try {
        const res = await fetch('/api/visitas');
        const visitas = await res.json();
        const tbody = document.getElementById('visits-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';
        visitas.forEach(v => {
            const tr = document.createElement('tr');
            const fecha = new Date(v.fecha_ingreso).toLocaleString();
            tr.innerHTML = `
                <td>${fecha}</td>
                <td><strong>${v.nombre}</strong></td>
                <td>${v.cedula}</td>
                <td>${v.asunto}</td>
                <td><small>${v.registrado_por}</small></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error al cargar visitas:', err);
    }
}

// Función para cargar tabla de usuarios
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
        console.error('Error al cargar usuarios:', err);
    }
}
