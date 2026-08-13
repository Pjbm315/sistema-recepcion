const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Crear tabla usuarios antes de operar
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT,
        password TEXT,
        rol TEXT
    )`, (err) => {
        if (err) {
            console.error('❌ Error creando tabla:', err.message);
            return;
        }
        db.run(`ALTER TABLE usuarios ADD COLUMN email TEXT`, () => {});
    });

    // 2. Insertar usuario administrador
    const username = 'admin';
    const email = 'admin@correo.com';
    const passwordOriginal = 'admin123';
    const rol = 'admin';

    db.get('SELECT * FROM usuarios WHERE username = ? OR email = ?', [username, email], async (err, row) => {
        if (err) {
            console.error('❌ Error al consultar la BD:', err.message);
            return;
        }

        if (!row) {
            const passwordHash = await bcrypt.hash(passwordOriginal, 10);
            db.run(
                'INSERT INTO usuarios (username, email, password, rol) VALUES (?, ?, ?, ?)',
                [username, email, passwordHash, rol],
                (err) => {
                    if (err) {
                        console.error('❌ Error al crear admin:', err.message);
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
