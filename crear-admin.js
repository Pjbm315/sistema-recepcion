require('dotenv').config();
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

(async () => {
    // Abrir conexión a la base de datos local
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    // Configura los datos del usuario que deseas crear
    const nombre = "Nuevo Admin";
    const email = "admin2@institucion.com";
    const passwordPlana = "admin123456";
    const rolId = 1; // 1 = Administrador, 2 = Recursos Humanos, 3 = Recepcion

    try {
        const passwordHash = await bcrypt.hash(passwordPlana, 10);
        
        await db.run(
            'INSERT INTO usuarios (nombre, email, password_hash, rol_id) VALUES (?, ?, ?, ?)',
            [nombre, email, passwordHash, rolId]
        );

        console.log(`✅ Usuario ${email} creado con éxito.`);
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            console.error('❌ El correo ya existe en la base de datos.');
        } else {
            console.error('❌ Error al crear usuario:', error.message);
        }
    }
})();
