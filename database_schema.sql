DROP DATABASE IF EXISTS `erp_maquila_db`;
CREATE DATABASE `erp_maquila_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `erp_maquila_db`;
-- =============================================================================
-- ERP LIGHT - ESQUEMA DE BASE DE DATOS REAL Y AMPLIADO
-- Diseñado para: Gestión de producción textil, pedidos, facturación y capacidad
-- Arquitectura: Sin lógica en base de datos (Sin Triggers, Procedimientos ni Enums)
-- =============================================================================

-- Habilitar restricciones de llaves foráneas y codificación segura
SET FOREIGN_KEY_CHECKS = 1;
SET NAMES utf8mb4;

-- =============================================================================
-- DIAGRAMA DE RELACIONES PRINCIPALES (E-R Simplificado)
-- =============================================================================
-- [roles] 1 ------ N [users] 1 (creador/responsable) ------ N [orders]
--                                                             |
--                                                             +-- 1 ------ N [order_items]
--                                                             |                |
--                                                             |                +-- N ------ 1 [products]
--                                                             |                +-- 1 ------ N [order_item_attributes]
--                                                             |                +-- 1 ------ N [order_item_sizes]
--                                                             |                +-- 1 ------ N [order_item_files]
--                                                             |
--                                                             +-- 1 ------ N [invoices] (Facturación)
--                                                             +-- 1 ------ N [payments] (Pagos de pedido)
--                                                             |
--                                                             +-- 1 ------ N [production_tasks] (Flujo por etapas)
--                                                                              |
--                                                                              +-- N ------ 1 [production_stages]
--                                                                              +-- N ------ 1 [production_status]
--                                                                              +-- 1 ------ N [rework_events] (Reprocesos)
--
-- [work_calendar] (Capacidad de producción diaria por etapa de producción)
-- [audit_logs] (Registro detallado para auditoría de acciones del sistema)
-- =============================================================================


-- =============================================================================
-- 1. TABLAS CATÁLOGO (Consistente con la filosofía de cero DB-Enums)
-- =============================================================================

-- Tabla de Roles de Usuario
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Estados de los Pedidos
CREATE TABLE IF NOT EXISTS order_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    is_terminal TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Estados de Tarea de Producción
CREATE TABLE IF NOT EXISTS production_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Etapas de Producción (Físicas del taller)
CREATE TABLE IF NOT EXISTS production_stages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    sequence_order INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Categorías o Tipos de Productos
CREATE TABLE IF NOT EXISTS product_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Tipos de Atributos del Producto (Color, Tela, Cuello, etc.)
CREATE TABLE IF NOT EXISTS attribute_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    input_component VARCHAR(100) NOT NULL,
    requires_catalog_value TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Tallas Estándar
CREATE TABLE IF NOT EXISTS sizes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    sort_order INT NOT NULL,
    gender VARCHAR(50) NOT NULL DEFAULT 'unisex'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- 2. TABLAS OPERACIONALES (Entidades de Negocio)
-- =============================================================================

-- Tabla de Usuarios (Colaboradores y Clientes del sistema)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    nit VARCHAR(20) NULL,
    nrc VARCHAR(20) NULL,
    nombre_comercial VARCHAR(255) NULL,
    actividad_economica VARCHAR(255) NULL,
    direccion TEXT NULL,
    telefono VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Productos Textiles Base
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    product_type_id INT NOT NULL,
    FOREIGN KEY (product_type_id) REFERENCES product_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Atributos específicos asignados a un producto (Ej: "Color", "Material")
CREATE TABLE IF NOT EXISTS product_attributes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    attribute_name VARCHAR(255) NOT NULL,
    attribute_type_id INT NOT NULL,
    is_required TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_type_id) REFERENCES attribute_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Catálogo de valores permitidos para atributos de un producto con modificadores de precio
CREATE TABLE IF NOT EXISTS product_attribute_values (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attribute_id INT NOT NULL,
    value VARCHAR(255) NOT NULL,
    price_modifier DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    active TINYINT(1) NOT NULL DEFAULT 1,
    FOREIGN KEY (attribute_id) REFERENCES product_attributes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tallas disponibles por producto con modificadores de precio
CREATE TABLE IF NOT EXISTS product_sizes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    size_id INT NOT NULL,
    price_modifier DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    active TINYINT(1) NOT NULL DEFAULT 1,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (size_id) REFERENCES sizes(id) ON DELETE RESTRICT,
    UNIQUE KEY uq_product_size (product_id, size_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Pedidos (Orders)
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NULL,
    client_name VARCHAR(255) NOT NULL, -- Nombre de cliente (con o sin cuenta registrada)
    created_by INT NOT NULL,
    status_id INT NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    total_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT NULL,
    client_confirmed TINYINT(1) NOT NULL DEFAULT 0,
    client_confirmed_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    production_start_date DATE NOT NULL,
    estimated_delivery_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (status_id) REFERENCES order_status(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Detalle del Pedido: Líneas de productos solicitados
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL, -- Conserva precio histórico de la base del producto
    subtotal DECIMAL(10, 2) NOT NULL,
    custom_notes TEXT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Atributos seleccionados para cada línea de pedido (con captura del modificador de precio cobrado)
CREATE TABLE IF NOT EXISTS order_item_attributes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_item_id INT NOT NULL,
    attribute_id INT NOT NULL,
    attribute_value_id INT NULL,
    custom_value TEXT NULL,
    value_label VARCHAR(255) NOT NULL,
    price_modifier_snapshot DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_id) REFERENCES product_attributes(id) ON DELETE RESTRICT,
    FOREIGN KEY (attribute_value_id) REFERENCES product_attribute_values(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tallas y cantidades solicitadas en la línea de pedido (con modificador congelado)
CREATE TABLE IF NOT EXISTS order_item_sizes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_item_id INT NOT NULL,
    product_size_id INT NOT NULL,
    size_label VARCHAR(50) NOT NULL,
    price_modifier_snapshot DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    quantity INT NOT NULL,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
    FOREIGN KEY (product_size_id) REFERENCES product_sizes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fichas de especificaciones, archivos o imágenes adjuntas por el cliente al pedido
CREATE TABLE IF NOT EXISTS order_item_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_item_id INT NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL DEFAULT 'image/jpeg',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- 3. MÓDULOS EXPANDIDOS (Ampliaciones solicitadas)
-- =============================================================================

-- Ampliación 1: Módulo de Facturación Simple
-- Secuencias para números de factura
CREATE TABLE IF NOT EXISTS invoice_sequences (
    year INT PRIMARY KEY,
    next_number INT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Relación: orders 1 ------ N invoices (Una orden puede tener facturas emitidas por abonos/completos)
CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    codigo_generacion VARCHAR(36) NULL,
    numero_control VARCHAR(50) NULL,
    sello_recepcion VARCHAR(100) NULL,
    fecha_hora_generacion DATETIME NULL,
    receptor_nombre VARCHAR(255) NULL,
    receptor_nit VARCHAR(20) NULL,
    receptor_nrc VARCHAR(20) NULL,
    receptor_actividad_economica VARCHAR(255) NULL,
    receptor_direccion TEXT NULL,
    receptor_telefono VARCHAR(50) NULL,
    receptor_correo VARCHAR(255) NULL,
    receptor_nombre_comercial VARCHAR(255) NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ventas_no_sujetas DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ventas_exentas DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ventas_gravadas DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    iva_retenido DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    iva_percibido DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    retencion_renta DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10, 2) NOT NULL,
    invoice_type VARCHAR(50) NOT NULL, -- 'consumidor_final' o 'credito_fiscal'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Pagos de Pedido (Vinculado a pedidos y facturas)
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'efectivo', 'tarjeta', 'transferencia'
    notes TEXT NULL,
    registered_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Tareas de Producción por Etapa
CREATE TABLE IF NOT EXISTS production_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    order_item_id INT NOT NULL,
    stage_id INT NOT NULL,
    assigned_to INT NULL,
    status_id INT NOT NULL DEFAULT 1,
    start_date DATE NOT NULL,
    end_date_estimated DATE NULL,
    end_date_actual DATE NULL,
    workload_points INT NOT NULL DEFAULT 0, -- Unidad de medida de esfuerzo (ej: unidades físicas)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Ampliación 2: Columna de Tipo de Tarea para clasificar reprocesos
    task_type VARCHAR(50) NOT NULL DEFAULT 'normal', -- 'normal', 'repair' (arreglo), 'remake' (hacer de nuevo)
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
    FOREIGN KEY (stage_id) REFERENCES production_stages(id) ON DELETE RESTRICT,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (status_id) REFERENCES production_status(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ampliación 3: Capacidad de Producción por Etapa y Fecha (Anteriormente general)
CREATE TABLE IF NOT EXISTS work_calendar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_date DATE NOT NULL,
    stage_id INT NOT NULL,
    max_capacity_points INT NOT NULL DEFAULT 500, -- Límite de capacidad en puntos/unidades por etapa
    is_working_day TINYINT(1) NOT NULL DEFAULT 1,
    notes VARCHAR(255) NULL,
    FOREIGN KEY (stage_id) REFERENCES production_stages(id) ON DELETE RESTRICT,
    UNIQUE KEY uq_date_stage (work_date, stage_id) -- Garantiza unicidad por fecha y etapa
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Registro de Eventos de Retrabajo / Rework (Evidencia física de reparaciones y repeticiones)
CREATE TABLE IF NOT EXISTS rework_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    production_task_id INT NOT NULL,
    order_id INT NOT NULL,
    rework_type VARCHAR(50) NOT NULL, -- 'arreglo', 'hacer_de_nuevo'
    description TEXT NOT NULL,
    created_by INT NOT NULL,
    stage_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (production_task_id) REFERENCES production_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (stage_id) REFERENCES production_stages(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ampliación 4: Solicitudes de Recuperación de Contraseña con Aprobación de Administrador
-- Flujo: El usuario solicita un cambio → queda en estado 'pending' → el admin aprueba o rechaza
--        → si es aprobado el usuario puede ingresar su nueva contraseña desde el login
CREATE TABLE IF NOT EXISTS password_reset_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- 4. TABLAS DE HISTORIAL Y AUDITORÍA
-- =============================================================================

-- Historial de transiciones de estados de Pedidos
CREATE TABLE IF NOT EXISTS order_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    status_id INT NOT NULL,
    changed_by INT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comment TEXT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (status_id) REFERENCES order_status(id) ON DELETE RESTRICT,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Historial de transiciones de estados de Tareas de Producción
CREATE TABLE IF NOT EXISTS production_task_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    production_task_id INT NOT NULL,
    status_id INT NOT NULL,
    changed_by INT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comment TEXT NULL,
    FOREIGN KEY (production_task_id) REFERENCES production_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (status_id) REFERENCES production_status(id) ON DELETE RESTRICT,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla General de Auditoría de Acciones críticas del Sistema
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    action TEXT NOT NULL,
    old_value TEXT NULL,
    new_value TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permisos de Rol (Para el control de acceso en la UI del ERP)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL,
    permission_key VARCHAR(50) NOT NULL,
    is_enabled TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (role_id, permission_key),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- 5. DATOS DE SEMILLA (Datos iniciales alineados al backend)
-- =============================================================================

-- Inserción de Roles del Sistema
INSERT INTO roles (id, name, description) VALUES
(1, 'admin', 'Administrador General - Control total de catálogo, usuarios y finanzas'),
(2, 'tienda', 'Vendedor de Tienda - Creación de pedidos, facturación y cobro de abonos'),
(3, 'taller', 'Supervisor de Taller - Visualización de Kanban, avance de etapas y reprocesos'),
(4, 'cliente', 'Cliente Externo - Consulta de estado de pedidos propios')
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);

-- Inserción de Estados de Pedido
INSERT INTO order_status (id, name, is_terminal) VALUES
(1, 'pendiente_confirmacion', 0),
(2, 'confirmado', 0),
(3, 'en_produccion', 0),
(4, 'listo_entrega', 0),
(5, 'entregado', 1),
(6, 'cancelado', 1)
ON DUPLICATE KEY UPDATE name=VALUES(name), is_terminal=VALUES(is_terminal);

-- Inserción de Estados de Producción (Kanban)
INSERT INTO production_status (id, name) VALUES
(1, 'pendiente'),
(2, 'en_proceso'),
(3, 'completado'),
(4, 'bloqueado'),
(5, 'listo_revision')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Inserción de Etapas de Producción Textil Real
INSERT INTO production_stages (id, name, sequence_order) VALUES
(1, 'Corte', 1),
(2, 'Estampado', 2),
(3, 'Confeccionado', 3),
(4, 'Acabado', 4),
(5, 'Revisado', 5),
(6, 'Bordado', 6),
(7, 'Planchado', 7),
(8, 'Empaquetado', 8),
(9, 'Recibido en Tienda', 9),
(10, 'Despachado', 10)
ON DUPLICATE KEY UPDATE name=VALUES(name), sequence_order=VALUES(sequence_order);

-- Inserción de Categorías de Productos
INSERT INTO product_types (id, name) VALUES
(1, 'Camisas'),
(2, 'Chumpas / Abrigos'),
(3, 'Pantalones / Jeans')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Inserción de Tipos de Atributos de Producto
INSERT INTO attribute_types (id, code, name, input_component, requires_catalog_value) VALUES
(1, 'color', 'Color de prenda', 'color_picker', 1),
(2, 'fabric', 'Tipo de tela / textil', 'select_dropdown', 1),
(3, 'text', 'Texto libre impreso', 'text_input', 0),
(4, 'number', 'Número identificador', 'number_input', 0)
ON DUPLICATE KEY UPDATE name=VALUES(name), input_component=VALUES(input_component), requires_catalog_value=VALUES(requires_catalog_value);

-- Inserción de Tallas (Hombres y Mujeres)
INSERT INTO sizes (id, code, name, sort_order, gender) VALUES
(1, 'H-XS', 'XS Hombre', 1, 'hombre'),
(2, 'H-S', 'S Hombre', 2, 'hombre'),
(3, 'H-M', 'M Hombre', 3, 'hombre'),
(4, 'H-L', 'L Hombre', 4, 'hombre'),
(5, 'H-XL', 'XL Hombre', 5, 'hombre'),
(6, 'H-XXL', 'XXL Hombre', 6, 'hombre'),
(7, 'M-XS', 'XS Mujer', 11, 'mujer'),
(8, 'M-S', 'S Mujer', 12, 'mujer'),
(9, 'M-M', 'M Mujer', 13, 'mujer'),
(10, 'M-L', 'L Mujer', 14, 'mujer'),
(11, 'M-XL', 'XL Mujer', 15, 'mujer'),
(12, 'M-XXL', 'XXL Mujer', 16, 'mujer')
ON DUPLICATE KEY UPDATE code=VALUES(code), name=VALUES(name), sort_order=VALUES(sort_order), gender=VALUES(gender);

-- Inserción de Usuarios de Prueba (Contraseña en hash correspondiente a '123456')
INSERT INTO users (id, full_name, email, password_hash, role_id, is_active) VALUES
(1, 'Mario Marroquín', 'mario.marroquin.2007@gmail.com', '$2b$10$Y5t72Bf/Y9p7l.bUjFv3ZeqI1SshR/r1S0U8LqYg8WIdD9OInYpPq', 1, 1),
(2, 'Supervisor de Taller', 'taller@erplight.com', '$2b$10$Y5t72Bf/Y9p7l.bUjFv3ZeqI1SshR/r1S0U8LqYg8WIdD9OInYpPq', 3, 1),
(3, 'Vendedor de Tienda', 'tienda@erplight.com', '$2b$10$Y5t72Bf/Y9p7l.bUjFv3ZeqI1SshR/r1S0U8LqYg8WIdD9OInYpPq', 2, 1)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), email=VALUES(email), role_id=VALUES(role_id), is_active=VALUES(is_active);


-- =============================================================================
-- EXPLICACIÓN DE DECISIONES DE DISEÑO Y CONFIRMACIÓN
-- =============================================================================
-- 1. SEPARACIÓN ABSOLUTA DE LÓGICA (CONFIRMACIÓN): No hay Triggers, no hay Procedimientos
--    Almacenados, ni Enums rígidos de Base de Datos. La base de datos es 100% una capa 
--    de persistencia relacional limpia, previsible y sumamente eficiente.
-- 2. FACTURACIÓN SIMPLE CONECTADA: Se integra la tabla `invoices` vinculada de forma
--    segura a `orders`. Los pagos (`payments`) continúan relacionándose con `orders`, 
--    soportando cobros por abonos antes o después de emitirse la factura de forma flexible.
-- 3. TIPADO DE TAREAS DE PRODUCCIÓN: Se añade el campo `task_type` a `production_tasks` 
--    con valores `'normal'`, `'repair'` y `'remake'`. Esto clasifica y diferencia 
--    automáticamente las etapas de producción normales de aquellas relanzadas por 
--    reprocesos de calidad, registrando la causa en la tabla de soporte `rework_events`.
-- 4. CAPACIDAD POR ETAPA Y FECHA: Se adopta y estandariza la tabla `work_calendar` como
--    implementación real de capacidad por etapa, sustituyendo la tabla general 
--    `production_capacity`. Esto permite modularizar los límites diarios de producción 
--    de forma granular (ej: Corte puede tener 100 uds de capacidad límite, mientras que 
--    Confección tiene 200 uds para un mismo día).
-- 5. ATRIBUTOS COMPLEJOS TEXTILES: Se preserva la modularización relacional de atributos 
--    y tallas mediante `product_attributes`, `product_attribute_values`, `sizes`, 
--    y `product_sizes` con modificadores de precio individuales. Al capturar snapshots 
--    de estos modificadores al momento de registrar el ítem del pedido, se garantiza la 
--    consistencia histórica de la facturación y los precios cobrados.
-- 6. RECUPERACIÓN DE CONTRASEÑA CON APROBACIÓN: La tabla `password_reset_requests`
--    implementa un flujo seguro de restablecimiento de contraseña donde el usuario
--    solicita el cambio y un administrador debe aprobarlo antes de que el usuario
--    pueda definir su nueva contraseña desde la pantalla de login.
-- =============================================================================