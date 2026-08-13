// public/app.js
const API_URL = 'https://sistema-recepcion.onrender.com';

// Redirección por autenticación
if (window.location.pathname.endsWith('dashboard.html')) {
    const token = localStorage.getItem('token');
    if (!token) window.location.href = 'index.html';
}

// Manejo del Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', JSON.stringify(data.usuario));
            window.location.href = 'dashboard.html';
        } catch (err) {
            const errorMsg = document.getElementById('errorMsg');
            errorMsg.textContent = err.message;
            errorMsg.classList.remove('hidden');
        }
    });
}

// Inicialización del Dashboard
if (window.location.pathname.endsWith('dashboard.html')) {
    const user = JSON.parse(localStorage.getItem('usuario'));
    document.getElementById('userInfo').textContent = `${user.nombre} (${user.rol})`;

    cargarVisitas();

    document.getElementById('visitaForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            documento_identidad: document.getElementById('doc').value,
            nombre_completo: document.getElementById('nombreCompleto').value,
            telefono: document.getElementById('telefono').value,
            empresa: document.getElementById('empresa').value,
            departamento_destino: document.getElementById('depto').value,
            persona_a_visitar: document.getElementById('persona').value,
            motivo: document.getElementById('motivo').value,
        };

        const res = await fetch(`${API_URL}/visitas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            document.getElementById('visitaForm').reset();
            cargarVisitas();
        }
    });
}

async function cargarVisitas() {
    const res = await fetch(`${API_URL}/visitas`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const visitas = await res.json();
    const tbody = document.getElementById('tablaVisitas');
    tbody.innerHTML = '';

    visitas.forEach(v => {
        const fecha = new Date(v.fecha_hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const esActivo = v.estado === 'En sitio';

        tbody.innerHTML += `
            <tr class="hover:bg-gray-75">
                <td class="p-3">
                    <div class="font-bold">${v.nombre_completo}</div>
                    <div class="text-xs text-gray-400">Doc: ${v.documento_identidad}</div>
                </td>
                <td class="p-3">
                    <div>${v.departamento_destino}</div>
                    <div class="text-xs text-gray-400">Visita a: ${v.persona_a_visitar}</div>
                </td>
                <td class="p-3">${fecha}</td>
                <td class="p-3">
                    <span class="px-2 py-1 rounded-full text-xs font-semibold ${esActivo ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-gray-700 text-gray-400'}">
                        ${v.estado}
                    </span>
                </td>
                <td class="p-3">
                    ${esActivo ? `<button onclick="marcarSalida(${v.id})" class="bg-amber-600 hover:bg-amber-700 text-xs px-2 py-1 rounded">Marcar Salida</button>` : '<span class="text-xs text-gray-500">Finalizada</span>'}
                </td>
            </tr>
        `;
    });
}

async function marcarSalida(id) {
    const res = await fetch(`${API_URL}/visitas/${id}/salida`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) cargarVisitas();
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
// Lógica de Tabs y Módulo de Usuarios
if (window.location.pathname.endsWith('dashboard.html')) {
    const user = JSON.parse(localStorage.getItem('usuario'));

    // Mostrar pestaña 'Gestión de Usuarios' solo a Administradores
    if (user && user.rol === 'Administrador') {
        const btnTabUsuarios = document.getElementById('btnTabUsuarios');
        if (btnTabUsuarios) btnTabUsuarios.classList.remove('hidden');
    }

    // Formulario Crear Usuario
    const usuarioForm = document.getElementById('usuarioForm');
    if (usuarioForm) {
        usuarioForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = {
                nombre: document.getElementById('newUserNombre').value,
                email: document.getElementById('newUserEmail').value,
                password: document.getElementById('newUserPassword').value,
                rol_id: document.getElementById('newUserRol').value
            };

            const userMsg = document.getElementById('userMsg');
            userMsg.classList.add('hidden');

            try {
                const res = await fetch(`${API_URL}/admin/usuarios`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(body)
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                userMsg.textContent = "¡Usuario creado exitosamente!";
                userMsg.className = "mt-3 text-xs text-center text-emerald-400 font-semibold";
                userMsg.classList.remove('hidden');

                usuarioForm.reset();
                cargarUsuariosAdmin();
            } catch (err) {
                userMsg.textContent = err.message;
                userMsg.className = "mt-3 text-xs text-center text-red-400 font-semibold";
                userMsg.classList.remove('hidden');
            }
        });
    }
}

function cambiarTab(tab) {
    const btnVisitas = document.getElementById('btnTabVisitas');
    const btnUsuarios = document.getElementById('btnTabUsuarios');
    const secVisitas = document.getElementById('sectionVisitas');
    const secUsuarios = document.getElementById('sectionUsuarios');

    if (tab === 'visitas') {
        btnVisitas.className = "px-4 py-2 rounded font-medium text-sm bg-indigo-600 text-white";
        btnUsuarios.className = "px-4 py-2 rounded font-medium text-sm text-gray-400 hover:bg-gray-700";
        secVisitas.classList.remove('hidden');
        secUsuarios.classList.add('hidden');
        cargarVisitas();
    } else {
        btnUsuarios.className = "px-4 py-2 rounded font-medium text-sm bg-indigo-600 text-white";
        btnVisitas.className = "px-4 py-2 rounded font-medium text-sm text-gray-400 hover:bg-gray-700";
        secUsuarios.classList.remove('hidden');
        secVisitas.classList.add('hidden');
        cargarRolesSelect();
        cargarUsuariosAdmin();
    }
}

async function cargarRolesSelect() {
    const res = await fetch(`${API_URL}/admin/roles`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) return;

    const roles = await res.json();
    const select = document.getElementById('newUserRol');
    select.innerHTML = '';

    roles.forEach(r => {
        select.innerHTML += `<option value="${r.id}">${r.nombre}</option>`;
    });
}

async function cargarUsuariosAdmin() {
    const res = await fetch(`${API_URL}/admin/usuarios`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) return;

    const usuarios = await res.json();
    const tbody = document.getElementById('tablaUsuarios');
    tbody.innerHTML = '';

    usuarios.forEach(u => {
        const fecha = new Date(u.creado_en).toLocaleDateString();
        tbody.innerHTML += `
            <tr class="hover:bg-gray-750">
                <td class="p-3 font-semibold">${u.nombre}</td>
                <td class="p-3 text-gray-300">${u.email}</td>
                <td class="p-3">
                    <span class="px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        ${u.rol}
                    </span>
                </td>
                <td class="p-3 text-xs text-gray-400">${fecha}</td>
            </tr>
        `;
    });
}
// Renderizar tabla con opciones de Administración
async function cargarUsuariosAdmin() {
    const res = await fetch(`${API_URL}/admin/usuarios`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) return;

    const usuarios = await res.json();
    const currentUser = JSON.parse(localStorage.getItem('usuario'));
    const tbody = document.getElementById('tablaUsuarios');
    tbody.innerHTML = '';

    usuarios.forEach(u => {
        const esUsuarioActual = u.id === currentUser.id;

        tbody.innerHTML += `
            <tr class="hover:bg-gray-750">
                <td class="p-3 font-semibold">${u.nombre}</td>
                <td class="p-3 text-gray-300">${u.email}</td>
                <td class="p-3">
                    <span class="px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        ${u.rol}
                    </span>
                </td>
                <td class="p-3 flex gap-2">
                    <button onclick="abrirModalUser(${u.id}, '${u.nombre}', '${u.email}', '${u.rol}')" class="bg-indigo-600 hover:bg-indigo-700 text-xs px-2 py-1 rounded">
                        Editar / Rol
                    </button>
                    ${!esUsuarioActual ? `
                        <button onclick="eliminarUsuario(${u.id}, '${u.nombre}')" class="bg-red-600 hover:bg-red-700 text-xs px-2 py-1 rounded">
                            Eliminar
                        </button>
                    ` : '<span class="text-xs text-gray-500 self-center">(Tú)</span>'}
                </td>
            </tr>
        `;
    });
}

// Eliminar Usuario
async function eliminarUsuario(id, nombre) {
    if (!confirm(`¿Estás seguro de que deseas eliminar al usuario "${nombre}"?`)) return;

    const res = await fetch(`${API_URL}/admin/usuarios/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });

    const data = await res.json();
    if (res.ok) {
        cargarUsuariosAdmin();
    } else {
        alert(data.error);
    }
}

// Abrir Modal de Edición
async function abrirModalUser(id, nombre, email, rolNombre) {
    document.getElementById('editUserId').value = id;
    document.getElementById('editUserNombre').value = nombre;
    document.getElementById('editUserEmail').value = email;

    // Cargar select de roles
    const res = await fetch(`${API_URL}/admin/roles`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const roles = await res.json();
    const select = document.getElementById('editUserRol');
    select.innerHTML = '';

    roles.forEach(r => {
        const selected = r.nombre === rolNombre ? 'selected' : '';
        select.innerHTML += `<option value="${r.id}" ${selected}>${r.nombre}</option>`;
    });

    document.getElementById('modalEditUser').classList.remove('hidden');
}

function cerrarModalUser() {
    document.getElementById('modalEditUser').classList.add('hidden');
}

// Guardar Cambios del Usuario / Modificar Rol
document.getElementById('editUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editUserId').value;
    const body = {
        nombre: document.getElementById('editUserNombre').value,
        email: document.getElementById('editUserEmail').value,
        rol_id: document.getElementById('editUserRol').value
    };

    const res = await fetch(`${API_URL}/admin/usuarios/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(body)
    });

    if (res.ok) {
        cerrarModalUser();
        cargarUsuariosAdmin();
    } else {
        const data = await res.json();
        alert(data.error);
    }
});
