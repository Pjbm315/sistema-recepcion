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

// Conexión a SQLite
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Asegurar estructura de la base de datos
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT,
        password TEXT,
        rol TEXT
    )`, () => {
        db.run(`ALTER TABLE usuarios ADD COLUMN email TEXT`, () => {});
    });
});

// Ruta de Login
app.post('/api/login', (req, res) => {
    const { email, username, password } = req.body;
    const identificador = email || username;

    if (!identificador || !password) {
        return res.status(400).json({ error: 'Por favor ingresa correo/usuario y contraseña' });
    }

    const query = 'SELECT * FROM usuarios WHERE email = ? OR username = ?';
    db.get(query, [identificador, identificador], async (err, usuario) => {
        if (err) {
            console.error('Error BD:', err.message);
            return res.status(500).json({ error: 'Error interno en la base de datos' });
        }

        if (!usuario) {
            return res.status(401).json({ error: 'El usuario o correo no existe' });
        }

        const esValida = await bcrypt.compare(password, usuario.password);
        if (!esValida) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        // Respuesta exitosa siempre en formato JSON
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

// Redireccionar rutas no encontradas de la API
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Ruta API no encontrada' });
});

// Puerto dinámico para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
