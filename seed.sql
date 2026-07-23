-- =============================================================================
-- SEED DE DATOS DE NEGOCIO - erp_maquila_db
-- Complementa los catálogos base (roles, estados, etapas, tallas, empleados,
-- asistencia) con datos reales de operación: productos, pedidos, producción,
-- facturación, pagos y nómina. Pensado para correr DESPUÉS del schema.sql
-- original (que ya crea las tablas y catálogos).
-- =============================================================================

USE `erp_maquila_db`;
SET FOREIGN_KEY_CHECKS = 1;
SET NAMES utf8mb4;

-- =============================================================================
-- 1. CLIENTES (usuarios con rol "cliente")
-- =============================================================================
INSERT INTO users (id, full_name, email, password_hash, role_id, is_active, nit, nrc, nombre_comercial, actividad_economica, direccion, telefono) VALUES
(4, 'Boutique La Moda S.A. de C.V.', 'compras@boutiquelamoda.com', '$2b$10$Y5t72Bf/Y9p7l.bUjFv3ZeqI1SshR/r1S0U8LqYg8WIdD9OInYpPq', 4, 1, '06141801234567', '123456-7', 'Boutique La Moda', 'Venta al por menor de prendas de vestir', 'Metrocentro Local 45, San Salvador', '2222-3344'),
(5, 'Roberto Hernández Pineda', 'roberto.hernandez@gmail.com', '$2b$10$Y5t72Bf/Y9p7l.bUjFv3ZeqI1SshR/r1S0U8LqYg8WIdD9OInYpPq', 4, 1, NULL, NULL, NULL, NULL, 'Col. Escalón, San Salvador', '7788-9900')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), email=VALUES(email);

-- =============================================================================
-- 2. PRODUCTOS BASE
-- =============================================================================
INSERT INTO products (id, name, base_price, active, product_type_id) VALUES
(1, 'Camisa Polo Básica', 8.50, 1, 1),
(2, 'Camisa Oxford Manga Larga', 12.00, 1, 1),
(3, 'Chumpa Rompevientos Impermeable', 25.00, 1, 2),
(4, 'Chumpa Softshell', 32.00, 1, 2),
(5, 'Pantalón Jeans Clásico', 18.00, 1, 3)
ON DUPLICATE KEY UPDATE name=VALUES(name), base_price=VALUES(base_price);

-- =============================================================================
-- 3. ATRIBUTOS DE PRODUCTO Y SUS VALORES
-- =============================================================================
INSERT INTO product_attributes (id, product_id, attribute_name, attribute_type_id, is_required) VALUES
(1, 1, 'Color', 1, 1),
(2, 1, 'Tipo de tela', 2, 1),
(3, 2, 'Color', 1, 1),
(4, 2, 'Tipo de tela', 2, 1),
(5, 3, 'Color', 1, 1),
(6, 3, 'Logo bordado (texto libre)', 3, 0),
(7, 4, 'Color', 1, 1),
(8, 5, 'Color', 1, 1),
(9, 5, 'Tipo de tela', 2, 1)
ON DUPLICATE KEY UPDATE attribute_name=VALUES(attribute_name);

INSERT INTO product_attribute_values (id, attribute_id, value, price_modifier, active) VALUES
-- Camisa Polo Básica: color / tela
(1, 1, 'Negro', 0.00, 1),
(2, 1, 'Blanco', 0.00, 1),
(3, 1, 'Azul Rey', 0.00, 1),
(4, 1, 'Rojo', 0.50, 1),
(5, 2, 'Algodón 100%', 0.00, 1),
(6, 2, 'Piqué Premium', 1.00, 1),
-- Camisa Oxford: color / tela
(7, 3, 'Blanco', 0.00, 1),
(8, 3, 'Celeste', 0.00, 1),
(9, 3, 'Rayado', 1.50, 1),
(10, 4, 'Popelina', 0.00, 1),
(11, 4, 'Oxford Premium', 2.00, 1),
-- Chumpa Rompevientos: color
(12, 5, 'Negro', 0.00, 1),
(13, 5, 'Azul Marino', 0.00, 1),
(14, 5, 'Gris', 0.00, 1),
-- Chumpa Softshell: color
(15, 7, 'Negro', 0.00, 1),
(16, 7, 'Verde Militar', 0.00, 1),
-- Pantalón Jeans: color / tela
(17, 8, 'Azul Clásico', 0.00, 1),
(18, 8, 'Negro', 0.00, 1),
(19, 9, 'Denim 12oz', 0.00, 1),
(20, 9, 'Denim Stretch', 1.50, 1)
ON DUPLICATE KEY UPDATE value=VALUES(value), price_modifier=VALUES(price_modifier);

-- =============================================================================
-- 4. TALLAS DISPONIBLES POR PRODUCTO
-- =============================================================================
INSERT INTO product_sizes (id, product_id, size_id, price_modifier, active) VALUES
-- Camisa Polo (tallas hombre H-S a H-XXL)
(1, 1, 2, 0.00, 1), (2, 1, 3, 0.00, 1), (3, 1, 4, 0.00, 1), (4, 1, 5, 0.50, 1), (5, 1, 6, 1.00, 1),
-- Camisa Oxford
(6, 2, 2, 0.00, 1), (7, 2, 3, 0.00, 1), (8, 2, 4, 0.00, 1), (9, 2, 5, 0.50, 1),
-- Chumpa Rompevientos
(10, 3, 2, 0.00, 1), (11, 3, 3, 0.00, 1), (12, 3, 4, 0.00, 1), (13, 3, 5, 1.00, 1),
-- Chumpa Softshell
(14, 4, 3, 0.00, 1), (15, 4, 4, 0.00, 1), (16, 4, 5, 1.00, 1),
-- Pantalón Jeans (tallas P-H 30 a 38)
(17, 5, 18, 0.00, 1), (18, 5, 19, 0.00, 1), (19, 5, 20, 0.00, 1), (20, 5, 21, 0.50, 1)
ON DUPLICATE KEY UPDATE price_modifier=VALUES(price_modifier);

-- =============================================================================
-- 5. PEDIDOS
-- =============================================================================
INSERT INTO orders (id, client_id, client_name, created_by, status_id, priority, total_price, notes, client_confirmed, client_confirmed_at, delivered_at, production_start_date, estimated_delivery_date) VALUES
(1, 4, 'Boutique La Moda S.A. de C.V.', 3, 5, 'medium', 425.00, 'Pedido recurrente mensual de camisas polo.', 1, '2026-06-02 09:15:00', '2026-06-20 14:00:00', '2026-06-03', '2026-06-18'),
(2, 5, 'Roberto Hernández Pineda', 3, 3, 'high', 96.00, 'Cliente pidió entrega urgente para evento.', 1, '2026-07-10 11:00:00', NULL, '2026-07-12', '2026-07-24'),
(3, NULL, 'Ferretería San José (mostrador)', 3, 2, 'medium', 675.00, 'Uniformes para personal de bodega.', 1, '2026-07-18 16:20:00', NULL, '2026-07-21', '2026-08-05'),
(4, 4, 'Boutique La Moda S.A. de C.V.', 1, 4, 'medium', 300.00, 'Chumpas de temporada, listas para despacho.', 1, '2026-07-01 10:00:00', NULL, '2026-07-03', '2026-07-22'),
(5, NULL, 'Cliente mostrador - Juana Ramírez', 3, 1, 'low', 54.00, 'Pendiente de confirmar tallas exactas.', 0, NULL, NULL, '2026-07-25', '2026-08-08')
ON DUPLICATE KEY UPDATE status_id=VALUES(status_id), total_price=VALUES(total_price);

-- =============================================================================
-- 6. LÍNEAS DE PEDIDO (order_items)
-- =============================================================================
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, subtotal, custom_notes) VALUES
(1, 1, 1, 50, 8.50, 425.00, 'Logo de la boutique bordado en pecho.'),
(2, 2, 3, 3, 25.00, 75.00, 'Entrega antes del 24 de julio.'),
(3, 2, 5, 1, 18.00, 18.00, NULL),
(4, 3, 2, 45, 12.00, 540.00, 'Uniforme de bodega, tela reforzada.'),
(5, 3, 5, 5, 18.00, 90.00, NULL),
(6, 4, 4, 10, 32.00, 320.00, 'Ajuste de -20 por descuento por volumen (ver invoice).'),
(7, 5, 1, 6, 8.50, 51.00, 'Cliente aún definiendo colores.')
ON DUPLICATE KEY UPDATE quantity=VALUES(quantity), subtotal=VALUES(subtotal);

-- =============================================================================
-- 7. ATRIBUTOS SELECCIONADOS POR LÍNEA DE PEDIDO
-- =============================================================================
INSERT INTO order_item_attributes (id, order_item_id, attribute_id, attribute_value_id, custom_value, value_label, price_modifier_snapshot) VALUES
(1, 1, 1, 3, NULL, 'Azul Rey', 0.00),
(2, 1, 2, 6, NULL, 'Piqué Premium', 1.00),
(3, 2, 5, 13, NULL, 'Azul Marino', 0.00),
(4, 2, 6, NULL, 'Boutique LM', 'Boutique LM', 0.00),
(5, 3, 8, 17, NULL, 'Azul Clásico', 0.00),
(6, 3, 9, 19, NULL, 'Denim 12oz', 0.00),
(7, 4, 3, 7, NULL, 'Blanco', 0.00),
(8, 4, 4, 10, NULL, 'Popelina', 0.00),
(9, 5, 8, 18, NULL, 'Negro', 0.00),
(10, 5, 9, 20, NULL, 'Denim Stretch', 1.50),
(11, 6, 7, 16, NULL, 'Verde Militar', 0.00),
(12, 7, 1, 1, NULL, 'Negro', 0.00),
(13, 7, 2, 5, NULL, 'Algodón 100%', 0.00)
ON DUPLICATE KEY UPDATE value_label=VALUES(value_label);

-- =============================================================================
-- 8. TALLAS Y CANTIDADES POR LÍNEA DE PEDIDO
-- =============================================================================
INSERT INTO order_item_sizes (id, order_item_id, product_size_id, size_label, price_modifier_snapshot, quantity) VALUES
(1, 1, 2, 'M Hombre', 0.00, 20),
(2, 1, 3, 'L Hombre', 0.00, 20),
(3, 1, 4, 'XL Hombre', 0.50, 10),
(4, 2, 11, 'M Hombre', 0.00, 3),
(5, 3, 18, '32 Hombre', 0.00, 1),
(6, 4, 6, 'S Hombre', 0.00, 15),
(7, 4, 7, 'M Hombre', 0.00, 20),
(8, 4, 8, 'L Hombre', 0.00, 10),
(9, 5, 19, '34 Hombre', 0.00, 5),
(10, 6, 14, 'M Hombre', 0.00, 4),
(11, 6, 15, 'L Hombre', 0.00, 6),
(12, 7, 2, 'M Hombre', 0.00, 6)
ON DUPLICATE KEY UPDATE quantity=VALUES(quantity);

-- =============================================================================
-- 9. TAREAS DE PRODUCCIÓN (Kanban) — para pedidos ya en/después de producción
-- =============================================================================
INSERT INTO production_tasks (id, order_id, order_item_id, stage_id, assigned_to, status_id, start_date, end_date_estimated, end_date_actual, workload_points, task_type) VALUES
-- Pedido 1 (entregado) — flujo completo
(1, 1, 1, 1, 2, 3, '2026-06-03', '2026-06-04', '2026-06-04', 50, 'normal'),
(2, 1, 1, 3, 2, 3, '2026-06-05', '2026-06-08', '2026-06-08', 50, 'normal'),
(3, 1, 1, 6, 2, 3, '2026-06-09', '2026-06-11', '2026-06-12', 50, 'repair'),
(4, 1, 1, 5, 2, 3, '2026-06-12', '2026-06-13', '2026-06-13', 50, 'normal'),
(5, 1, 1, 8, 2, 3, '2026-06-14', '2026-06-15', '2026-06-15', 50, 'normal'),
-- Pedido 4 (listo para entrega) — casi completo
(6, 4, 6, 1, 2, 3, '2026-07-03', '2026-07-04', '2026-07-04', 10, 'normal'),
(7, 4, 6, 3, 2, 3, '2026-07-05', '2026-07-10', '2026-07-10', 10, 'normal'),
(8, 4, 6, 4, 2, 5, '2026-07-11', '2026-07-14', NULL, 10, 'normal'),
-- Pedido 3 (en producción, recién iniciado)
(9, 3, 4, 1, 2, 2, '2026-07-21', '2026-07-22', NULL, 45, 'normal'),
(10, 3, 5, 1, 2, 1, '2026-07-22', '2026-07-23', NULL, 5, 'normal')
ON DUPLICATE KEY UPDATE status_id=VALUES(status_id), end_date_actual=VALUES(end_date_actual);

-- Evento de retrabajo (asociado a la tarea 3, que fue de tipo 'repair')
INSERT INTO rework_events (id, production_task_id, order_id, rework_type, description, created_by, stage_id, created_at) VALUES
(1, 3, 1, 'arreglo', 'Bordado del logo salió descentrado en 8 unidades; se corrigió antes de pasar a acabado.', 2, 6, '2026-06-11 15:30:00')
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- =============================================================================
-- 10. CAPACIDAD DIARIA POR ETAPA (próximos días)
-- =============================================================================
INSERT INTO work_calendar (id, work_date, stage_id, max_capacity_points, is_working_day, notes) VALUES
(1, '2026-07-22', 1, 200, 1, NULL),
(2, '2026-07-22', 3, 200, 1, NULL),
(3, '2026-07-23', 1, 200, 1, NULL),
(4, '2026-07-23', 3, 200, 1, NULL),
(5, '2026-07-24', 1, 200, 1, NULL),
(6, '2026-07-25', 1, 0, 0, 'Feriado local'),
(7, '2026-07-27', 3, 250, 1, 'Turno extendido para pedido urgente')
ON DUPLICATE KEY UPDATE max_capacity_points=VALUES(max_capacity_points), is_working_day=VALUES(is_working_day);

-- =============================================================================
-- 11. FACTURACIÓN (invoices) — pedidos confirmados en adelante
-- =============================================================================
INSERT INTO invoice_sequences (year, next_number) VALUES (2026, 3)
ON DUPLICATE KEY UPDATE next_number=VALUES(next_number);

INSERT INTO invoices (id, order_id, invoice_number, codigo_generacion, numero_control, sello_recepcion, fecha_hora_generacion, receptor_nombre, receptor_nit, receptor_nrc, receptor_actividad_economica, receptor_direccion, receptor_telefono, receptor_correo, receptor_nombre_comercial, subtotal, tax, ventas_no_sujetas, ventas_exentas, ventas_gravadas, iva_retenido, iva_percibido, retencion_renta, discount, total, invoice_type) VALUES
(1, 1, 'DTE-2026-0001', 'A1B2C3D4-E5F6-7890-ABCD-1234567890AB', 'DTE-03-00000001-000000000000001', 'SELLO-HDA-0001', '2026-06-20 14:05:00', 'Boutique La Moda S.A. de C.V.', '06141801234567', '123456-7', 'Venta al por menor de prendas de vestir', 'Metrocentro Local 45, San Salvador', '2222-3344', 'compras@boutiquelamoda.com', 'Boutique La Moda', 425.00, 55.25, 0.00, 0.00, 425.00, 0.00, 0.00, 0.00, 0.00, 480.25, 'credito_fiscal'),
(2, 4, 'DTE-2026-0002', 'B2C3D4E5-F6A7-8901-BCDE-2345678901BC', 'DTE-03-00000001-000000000000002', 'SELLO-HDA-0002', '2026-07-15 09:40:00', 'Boutique La Moda S.A. de C.V.', '06141801234567', '123456-7', 'Venta al por menor de prendas de vestir', 'Metrocentro Local 45, San Salvador', '2222-3344', 'compras@boutiquelamoda.com', 'Boutique La Moda', 320.00, 41.60, 0.00, 0.00, 300.00, 0.00, 0.00, 0.00, 20.00, 341.60, 'credito_fiscal')
ON DUPLICATE KEY UPDATE total=VALUES(total);

-- =============================================================================
-- 12. PAGOS
-- =============================================================================
INSERT INTO payments (id, order_id, amount, payment_method, notes, registered_by) VALUES
(1, 1, 480.25, 'transferencia', 'Pago completo contra factura DTE-2026-0001.', 3),
(2, 2, 50.00, 'efectivo', 'Abono inicial del 50%.', 3),
(3, 3, 200.00, 'transferencia', 'Abono para iniciar producción.', 3),
(4, 4, 341.60, 'tarjeta', 'Pago completo contra factura DTE-2026-0002.', 1)
ON DUPLICATE KEY UPDATE amount=VALUES(amount);

-- =============================================================================
-- 13. HISTORIAL DE ESTADOS (ejemplo para el pedido 1, ya entregado)
-- =============================================================================
INSERT INTO order_status_history (id, order_id, status_id, changed_by, changed_at, comment) VALUES
(1, 1, 1, 3, '2026-06-01 08:00:00', 'Pedido creado, pendiente de confirmación del cliente.'),
(2, 1, 2, 3, '2026-06-02 09:15:00', 'Cliente confirmó el pedido.'),
(3, 1, 3, 2, '2026-06-03 07:30:00', 'Inicia producción en etapa de corte.'),
(4, 1, 4, 2, '2026-06-15 16:00:00', 'Empacado y listo para despacho.'),
(5, 1, 5, 3, '2026-06-20 14:00:00', 'Entregado al cliente en tienda.')
ON DUPLICATE KEY UPDATE comment=VALUES(comment);

-- =============================================================================
-- 14. NÓMINA (completa el módulo de payroll iniciado en el schema)
-- =============================================================================
INSERT INTO payroll_periods (id, start_date, end_date, status_id, closed_at) VALUES
(1, '2026-07-01', '2026-07-15', 3, '2026-07-16 10:00:00'),
(2, '2026-07-16', '2026-07-31', 1, NULL)
ON DUPLICATE KEY UPDATE status_id=VALUES(status_id);

INSERT INTO payroll_period_quincenas (id, payroll_period_id, year, month, quincena_number) VALUES
(1, 1, 2026, 7, 1),
(2, 2, 2026, 7, 2)
ON DUPLICATE KEY UPDATE payroll_period_id=VALUES(payroll_period_id);

-- Detalle de nómina del período ya pagado (id 1). Empleado 4 es destajo:
-- se deja en 0 para cálculo manual hasta definir la fórmula por producción.
INSERT INTO payroll_details (id, payroll_period_id, employee_id, days_worked, hours_worked, base_salary_snapshot, deductions, total_to_pay, notes) VALUES
(1, 1, 1, 11.00, 88.00, 600.00, 45.00, 255.00, 'Descuento ISSS/AFP proporcional a quincena.'),
(2, 1, 2, 10.50, 84.00, 450.00, 33.75, 191.25, NULL),
(3, 1, 3, 10.00, 80.00, 450.00, 33.75, 182.25, 'Una tardanza registrada, sin descuento adicional aplicado.'),
(4, 1, 4, 0.00, 0.00, 380.00, 0.00, 0.00, 'Contrato por destajo: pendiente de cálculo manual según piezas producidas.')
ON DUPLICATE KEY UPDATE total_to_pay=VALUES(total_to_pay);

-- =============================================================================
-- FIN DEL SEED DE DATOS DE NEGOCIO
-- =============================================================================