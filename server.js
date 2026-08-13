require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

let db;

// Inicializar y crear tablas automáticamente
(async () => {
    db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            rol_id INTEGER REFERENCES roles(id),
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS visitantes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            documento_identidad TEXT UNIQUE NOT NULL,
            nombre_completo TEXT NOT NULL,
            telefono TEXT,
            empresa TEXT
        );

        CREATE TABLE IF NOT EXISTS visitas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            visitante_id INTEGER REFERENCES visitantes(id),
            usuario_registro_id INTEGER REFERENCES usuarios(id),
            departamento_destino TEXT NOT NULL,
            persona_a_visitar TEXT NOT NULL,
            motivo TEXT NOT NULL,
            fecha_hora_entrada DATETIME DEFAULT CURRENT_TIMESTAMP,
            fecha_hora_salida DATETIME,
            estado TEXT DEFAULT 'En sitio'
        );
    `);

    // Insertar datos iniciales si no existen
    const adminExistente = await db.get('SELECT * FROM usuarios WHERE email = ?', ['admin@institucion.com']);
    if (!adminExistente) {
        await db.run("INSERT OR IGNORE INTO roles (id, nombre) VALUES (1, 'Administrador'), (2, 'Recursos Humanos'), (3, 'Recepcion')");
        const hash = await bcrypt.hash('admin123', 10);
        await db.run("INSERT INTO usuarios (nombre, email, password_hash, rol_id) VALUES (?, ?, ?, 1)", ['Admin Sistema', 'admin@institucion.com', hash]);
    }
})();

// Middleware Token
const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acceso denegado.' });

    try {
        req.usuario = jwt.verify(token, process.env.JWT_SECRET || 'secreto_desarrollo');
        next();
    } catch (err) {
        res.status(403).json({ error: 'Token inválido.' });
    }
};

// Rutas API
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await db.get(`
            SELECT u.id, u.nombre, u.email, u.password_hash, r.nombre AS rol 
            FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE u.email = ?`, [email]);

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ id: user.id, nombre: user.nombre, rol: user.rol }, process.env.JWT_SECRET || 'secreto_desarrollo', { expiresIn: '8h' });
        res.json({ token, usuario: { id: user.id, nombre: user.nombre, rol: user.rol } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/visitas', verificarToken, async (req, res) => {
    const visitas = await db.all(`
        SELECT v.id, vis.documento_identidad, vis.nombre_completo, vis.empresa,
               v.departamento_destino, v.persona_a_visitar, v.motivo, 
               v.fecha_hora_entrada, v.fecha_hora_salida, v.estado
        FROM visitas v
        JOIN visitantes vis ON v.visitante_id = vis.id
        ORDER BY v.fecha_hora_entrada DESC`);
    res.json(visitas);
});

app.post('/api/visitas', verificarToken, async (req, res) => {
    const { documento_identidad, nombre_completo, telefono, empresa, departamento_destino, persona_a_visitar, motivo } = req.body;
    try {
        let vis = await db.get('SELECT id FROM visitantes WHERE documento_identidad = ?', [documento_identidad]);
        let visitanteId = vis ? vis.id : (await db.run('INSERT INTO visitantes (documento_identidad, nombre_completo, telefono, empresa) VALUES (?, ?, ?, ?)', [documento_identidad, nombre_completo, telefono, empresa])).lastID;

        await db.run(`INSERT INTO visitas (visitante_id, usuario_registro_id, departamento_destino, persona_a_visitar, motivo) VALUES (?, ?, ?, ?, ?)`,
            [visitanteId, req.usuario.id, departamento_destino, persona_a_visitar, motivo]);

        res.status(201).json({ mensaje: 'Visita registrada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/visitas/:id/salida', verificarToken, async (req, res) => {
    await db.run(`UPDATE visitas SET fecha_hora_salida = CURRENT_TIMESTAMP, estado = 'Finalizado' WHERE id = ?`, [req.params.id]);
    res.json({ mensaje: 'Salida marcada' });
});

app.listen(3000, () => console.log('Servidor corriendo con SQLite en http://localhost:3000'));
// Middleware para validar roles
const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({ error: 'No tienes permisos para esta acción.' });
        }
        next();
    };
};

// --- RUTAS DE ADMINISTRACIÓN ---

// 1. Obtener lista de roles disponibles
app.get('/api/admin/roles', verificarToken, verificarRol(['Administrador']), async (req, res) => {
    try {
        const roles = await db.all('SELECT * FROM roles ORDER BY id ASC');
        res.json(roles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Obtener lista de usuarios registrados
app.get('/api/admin/usuarios', verificarToken, verificarRol(['Administrador']), async (req, res) => {
    try {
        const usuarios = await db.all(`
            SELECT u.id, u.nombre, u.email, r.nombre AS rol, u.creado_en 
            FROM usuarios u 
            JOIN roles r ON u.rol_id = r.id 
            ORDER BY u.id DESC`);
        res.json(usuarios);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Crear nuevo usuario con asignación de rol
app.post('/api/admin/usuarios', verificarToken, verificarRol(['Administrador']), async (req, res) => {
    const { nombre, email, password, rol_id } = req.body;

    if (!nombre || !email || !password || !rol_id) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    try {
        const existe = await db.get('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existe) return res.status(400).json({ error: 'El correo ya está registrado.' });

        const password_hash = await bcrypt.hash(password, 10);
        await db.run(
            'INSERT INTO usuarios (nombre, email, password_hash, rol_id) VALUES (?, ?, ?, ?)',
            [nombre, email, password_hash, rol_id]
        );

        res.status(201).json({ mensaje: 'Usuario creado exitosamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Actualizar datos y rol de un usuario (Sólo Administrador)
app.put('/api/admin/usuarios/:id', verificarToken, verificarRol(['Administrador']), async (req, res) => {
    const { nombre, email, rol_id } = req.body;
    const userId = req.params.id;

    if (!nombre || !email || !rol_id) {
        return res.status(400).json({ error: 'Todos los campos son requeridos.' });
    }

    try {
        await db.run(
            'UPDATE usuarios SET nombre = ?, email = ?, rol_id = ? WHERE id = ?',
            [nombre, email, rol_id, userId]
        );
        res.json({ mensaje: 'Usuario actualizado correctamente.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Eliminar usuario (Sólo Administrador)
app.delete('/api/admin/usuarios/:id', verificarToken, verificarRol(['Administrador']), async (req, res) => {
    const userId = req.params.id;

    // Evitar que el admin se elimine a sí mismo
    if (parseInt(userId) === req.usuario.id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propio usuario activo.' });
    }

    try {
        await db.run('DELETE FROM usuarios WHERE id = ?', [userId]);
        res.json({ mensaje: 'Usuario eliminado del sistema.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});