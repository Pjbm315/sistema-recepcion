-- Crear tablas
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol_id INT REFERENCES roles(id),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE visitantes (
    id SERIAL PRIMARY KEY,
    documento_identidad VARCHAR(50) UNIQUE NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    telefono VARCHAR(20),
    empresa VARCHAR(100)
);

CREATE TABLE visitas (
    id SERIAL PRIMARY KEY,
    visitante_id INT REFERENCES visitantes(id),
    usuario_registro_id INT REFERENCES usuarios(id),
    departamento_destino VARCHAR(100) NOT NULL,
    persona_a_visitar VARCHAR(100) NOT NULL,
    motivo TEXT NOT NULL,
    fecha_hora_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_hora_salida TIMESTAMP NULL,
    estado VARCHAR(20) DEFAULT 'En sitio'
);

-- Datos iniciales
INSERT INTO roles (nombre) VALUES ('Administrador'), ('Recursos Humanos'), ('Recepcion');

-- Password en texto plano: admin123 (hasheado con bcrypt cost 10)
INSERT INTO usuarios (nombre, email, password_hash, rol_id) 
VALUES ('Admin Sistema', 'admin@institucion.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1);
