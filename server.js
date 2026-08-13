const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Conexión a la base de datos SQLite
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Inicializar la tabla y el usuario Administrador
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT,
        password TEXT,
        rol TEXT
    )`, (err) => {
        if (!err) {
            db.run(`ALTER TABLE usuarios ADD COLUMN email TEXT`, () => {});
        }
    });

    // Crear admin por defecto si no existe
    const username = 'admin';
    const email = 'admin@correo.com';
    const passwordOriginal = 'admin123';
    const rol = 'admin';

    db.get('SELECT * FROM usuarios WHERE username = ? OR email = ?', [username, email], async (err, usuarioExistente) => {
        if (!err && !usuarioExistente) {
            const passwordHash = await bcrypt.hash(passwordOriginal, 10);
            db.run(
                'INSERT INTO usuarios (username, email, password, rol) VALUES (?, ?, ?, ?)',
                [username, email, passwordHash, rol]
            );
        }
    });
});

// Endpoint de Login
app.post('/api/login', (req, res) => {
    const { email, username, password } = req.body;
    const identificador = email || username;

    if (!identificador || !password) {
        return res.status(400).json({ error: 'Por favor ingresa correo/usuario y contraseña' });
    }

    const query = 'SELECT * FROM usuarios WHERE email = ? OR username = ?';
    db.get(query, [identificador, identificador], async (err, usuario) => {
        if (err) return res.status(500).json({ error: 'Error interno en la BD' });
        if (!usuario) return res.status(401).json({ error: 'El usuario o correo no existe' });

        const esValida = await bcrypt.compare(password, usuario.password);
        if (!esValida) return res.status(401).json({ error: 'Contraseña incorrecta' });

        return res.json({
            mensaje: 'Inicio de sesión exitoso',
            usuario: {
                id: usuario.id,
                username: usuario.username,
                email: usuario.email,
                rol: usuario.rol
            }
        });
    });
});

// Endpoint: Obtener lista de usuarios (Gestión Admin)
app.get('/api/usuarios', (req, res) => {
    db.all('SELECT id, username, email, rol FROM usuarios', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al consultar usuarios' });
        res.json(rows);
    });
});

// Endpoint: Crear nuevo usuario con rol (Gestión Admin)
app.post('/api/usuarios', async (req, res) => {
    const { username, email, password, rol } = req.body;

    if (!username || !email || !password || !rol) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        db.run(
            'INSERT INTO usuarios (username, email, password, rol) VALUES (?, ?, ?, ?)',
            [username, email, passwordHash, rol],
            function (err) {
                if (err) {
                    return res.status(400).json({ error: 'El usuario o correo ya está registrado' });
                }
                res.status(201).json({ mensaje: 'Usuario creado con éxito', id: this.lastID });
            }
        );
    } catch (e) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Manejo de rutas API inexistentes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Ruta de API no encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor activo en el puerto ${PORT}`);
});
