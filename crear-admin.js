const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Crear la tabla si aún no existe
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        rol TEXT
    )`);

    // 2. Verificar o insertar el usuario admin
    const username = 'admin';
    const passwordOriginal = 'admin123'; // Cambia esta contraseña si lo deseas
    const rol = 'admin';

    db.get('SELECT * FROM usuarios WHERE username = ?', [username], async (err, row) => {
        if (err) {
            console.error('❌ Error al consultar la base de datos:', err.message);
            return;
        }

        if (!row) {
            const passwordHash = await bcrypt.hash(passwordOriginal, 10);
            db.run(
                'INSERT INTO usuarios (username, password, rol) VALUES (?, ?, ?)',
                [username, passwordHash, rol],
                (err) => {
                    if (err) {
                        console.error('❌ Error al crear usuario:', err.message);
                    } else {
                        console.log('✅ Usuario administrador creado con éxito.');
                    }
                }
            );
        } else {
            console.log('ℹ️ El usuario administrador ya existe.');
        }
    });
});
