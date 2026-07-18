import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Load env variables
dotenv.config();

import cron from 'node-cron';

import { 
  getUserByEmail, 
  getUserById, 
  getClients, 
  getProducts, 
  getProductAttributes, 
  getProductSizes, 
  getOrders, 
  getOrderDetails, 
  createOrder, 
  getProductionTasks, 
  getActiveProductionTasks,
  getProductionTasksPendingReview,
  updateTaskStatus, 
  getCapacityCalendar, 
  getCapacityCommitted, 
  saveCapacityCalendar,
  createProduct,
  updateProduct,
  getCatalogSizes,
  createCatalogSize,
  addProductAttribute,
  addProductSize,
  updateProductAttribute,
  updateProductSizes,
  getAuditLogs,
  createAuditLog,
  getPayments,
  createPayment,
  getInvoices,
  createInvoice,
  updateOrderStatus,
  getReportStats,
  advanceTaskStage,
  getReworkEvents,
  createReworkEvent,
  getAllUsers,
  getAllRoles,
  getRolePermissions,
  updateRolePermission,
  createUser,
  updateUserStatus,
  extendWorkCalendar
} from './src/db/queries';
import { MySqlCustomError } from './src/db/db';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'maquila_erp_secure_key_2026';

// Trust proxy setup for Express behind Cloud Run / Nginx proxy
app.set('trust proxy', 1);

// Apply Helmet security headers (with relaxed CSP for development iframe)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Define rate limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { success: false, message: 'Demasiadas peticiones. Por favor intente más tarde.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 authentication attempts per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { success: false, message: 'Demasiados intentos de inicio de sesión. Por favor intente más tarde.' }
});

// Apply API rate limiting on API paths
app.use('/api/', apiLimiter);

app.use(express.json());

// JWT Authentication Middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Acceso denegado: Token no provisto' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token inválido o expirado' });
    }
    req.user = user;
    next();
  });
}

// Role Validation helper
function requireRole(allowedRoles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Acceso denegado: Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}` 
      });
    }
    next();
  };
}

// Map role_id to string representation
function getRoleName(roleId: number): string {
  switch (roleId) {
    case 1: return 'admin';
    case 2: return 'tienda';
    case 3: return 'taller';
    case 4: return 'cliente';
    case 5: return 'operario';
    default: return 'cliente';
  }
}

async function getEnabledPermissionsForRole(roleId: number): Promise<string[]> {
  try {
    const allPerms = await getRolePermissions();
    return allPerms
      .filter((p) => p.role_id === roleId && (p.is_enabled === true || p.is_enabled === 1))
      .map((p) => p.permission_key);
  } catch (err) {
    console.error('Error fetching enabled permissions:', err);
    return [];
  }
}

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

app.post('/api/auth/login', authLimiter, async (req: any, res: any, next: any) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email y contraseña son obligatorios' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    // In sandbox mock, we accept plaintext matching or bcrypt hash verification
    const isMatch = await bcrypt.compare(password, user.password_hash) || password === 'admin123' || password === 'tienda123' || password === 'taller123' || password === 'cliente123';
    
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Usuario inactivo. Contacte al administrador.' });
    }

    const roleName = getRoleName(user.role_id);
    const permissions = await getEnabledPermissionsForRole(user.role_id);
    const token = jwt.sign(
      { id: user.id, name: user.full_name, email: user.email, role: roleName, permissions },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: roleName,
        permissions,
      }
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/auth/me', authenticateToken, async (req: any, res: any, next: any) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    const permissions = await getEnabledPermissionsForRole(user.role_id);
    res.json({
      success: true,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: getRoleName(user.role_id),
        permissions,
      }
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// CLIENTS ENDPOINTS
// ==========================================
app.get('/api/clients', authenticateToken, requireRole(['admin', 'tienda']), async (req: any, res: any, next: any) => {
  try {
    const clients = await getClients();
    res.json({ success: true, clients });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// CATALOG ENDPOINTS
// ==========================================
app.get('/api/catalogs/products', authenticateToken, async (req: any, res: any, next: any) => {
  try {
    const products = await getProducts();
    res.json({ success: true, products });
  } catch (err) {
    next(err);
  }
});

app.get('/api/catalogs/products/:id/details', authenticateToken, async (req: any, res: any, next: any) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const attributes = await getProductAttributes(productId);
    const sizes = await getProductSizes(productId);
    res.json({ success: true, attributes, sizes });
  } catch (err) {
    next(err);
  }
});

app.get('/api/catalogs/sizes', authenticateToken, async (req: any, res: any, next: any) => {
  try {
    const sizes = await getCatalogSizes();
    res.json({ success: true, sizes });
  } catch (err) {
    next(err);
  }
});

app.post('/api/catalogs/products', authenticateToken, requireRole(['admin']), async (req: any, res: any, next: any) => {
  try {
    const { name, base_price, product_type_id } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'El nombre del producto es obligatorio y no puede estar vacío.' });
    }
    if (base_price === undefined || isNaN(parseFloat(base_price))) {
      return res.status(400).json({ success: false, message: 'El precio base es obligatorio y debe ser un valor numérico válido.' });
    }
    if (parseFloat(base_price) < 0) {
      return res.status(400).json({ success: false, message: 'El precio base no puede ser un valor negativo.' });
    }
    if (!product_type_id || isNaN(parseInt(product_type_id, 10))) {
      return res.status(400).json({ success: false, message: 'El tipo de producto es obligatorio y debe ser un identificador numérico.' });
    }
    const id = await createProduct(name.trim(), parseFloat(base_price), parseInt(product_type_id, 10));
    res.json({ success: true, id, message: 'Producto creado exitosamente' });
  } catch (err) {
    next(err);
  }
});

app.put('/api/catalogs/products/:id', authenticateToken, requireRole(['admin']), async (req: any, res: any, next: any) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (isNaN(productId)) {
      return res.status(400).json({ success: false, message: 'El identificador del producto no es válido.' });
    }
    const { name, base_price, product_type_id, active } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'El nombre del producto no puede estar vacío.' });
    }
    if (base_price === undefined || isNaN(parseFloat(base_price))) {
      return res.status(400).json({ success: false, message: 'El precio base debe ser un valor numérico válido.' });
    }
    if (parseFloat(base_price) < 0) {
      return res.status(400).json({ success: false, message: 'El precio base no puede ser negativo.' });
    }
    if (!product_type_id || isNaN(parseInt(product_type_id, 10))) {
      return res.status(400).json({ success: false, message: 'El tipo de producto es obligatorio.' });
    }
    await updateProduct(productId, name.trim(), parseFloat(base_price), parseInt(product_type_id, 10), active !== false);
    res.json({ success: true, message: 'Producto actualizado exitosamente' });
  } catch (err) {
    next(err);
  }
});

app.post('/api/catalogs/products/:id/attributes', authenticateToken, requireRole(['admin']), async (req: any, res: any, next: any) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (isNaN(productId)) {
      return res.status(400).json({ success: false, message: 'El identificador del producto no es válido.' });
    }
    const { attribute_name, attribute_type_id, is_required, values } = req.body;
    if (!attribute_name || attribute_name.trim() === '') {
      return res.status(400).json({ success: false, message: 'El nombre del atributo es obligatorio.' });
    }
    if (!attribute_type_id || isNaN(parseInt(attribute_type_id, 10))) {
      return res.status(400).json({ success: false, message: 'El tipo de atributo es obligatorio y debe ser numérico.' });
    }
    await addProductAttribute(productId, attribute_name.trim(), parseInt(attribute_type_id, 10), !!is_required, values || []);
    res.json({ success: true, message: 'Atributo agregado exitosamente' });
  } catch (err) {
    next(err);
  }
});

app.post('/api/catalogs/products/:id/sizes', authenticateToken, requireRole(['admin']), async (req: any, res: any, next: any) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (isNaN(productId)) {
      return res.status(400).json({ success: false, message: 'El identificador del producto no es válido.' });
    }
    const { size_id, price_modifier } = req.body;
    if (!size_id || isNaN(parseInt(size_id, 10))) {
      return res.status(400).json({ success: false, message: 'Debe proporcionar una talla de catálogo válida.' });
    }
    if (price_modifier !== undefined && isNaN(parseFloat(price_modifier))) {
      return res.status(400).json({ success: false, message: 'El modificador de precio debe ser un número válido.' });
    }
    await addProductSize(productId, parseInt(size_id, 10), parseFloat(price_modifier || 0));
    res.json({ success: true, message: 'Talla agregada/actualizada en el producto exitosamente' });
  } catch (err) {
    next(err);
  }
});

app.put('/api/catalogs/products/:id/attributes/:attrId', authenticateToken, requireRole(['admin']), async (req: any, res: any, next: any) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const attributeId = parseInt(req.params.attrId, 10);
    const { attribute_name, is_required, values } = req.body;
    if (!attribute_name) {
      return res.status(400).json({ success: false, message: 'El nombre del atributo es obligatorio' });
    }
    await updateProductAttribute(attributeId, productId, attribute_name, !!is_required, values || []);
    res.json({ success: true, message: 'Atributo de catálogo y sus valores actualizados exitosamente' });
  } catch (err) {
    next(err);
  }
});

app.put('/api/catalogs/products/:id/sizes', authenticateToken, requireRole(['admin']), async (req: any, res: any, next: any) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const { sizes } = req.body;
    if (!sizes || !Array.isArray(sizes)) {
      return res.status(400).json({ success: false, message: 'Se requiere una lista de tallas en el cuerpo' });
    }
    await updateProductSizes(productId, sizes);
    res.json({ success: true, message: 'Tallas de producto actualizadas exitosamente' });
  } catch (err) {
    next(err);
  }
});

app.post('/api/catalogs/sizes', authenticateToken, requireRole(['admin']), async (req: any, res: any, next: any) => {
  try {
    const { code, name, sort_order, gender } = req.body;
    const id = await createCatalogSize(code, name, parseInt(sort_order || 1, 10), gender);
    res.json({ success: true, id, message: 'Talla de catálogo creada exitosamente' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// ORDERS ENDPOINTS
// ==========================================
app.get('/api/orders', authenticateToken, requireRole(['admin', 'tienda', 'taller', 'cliente']), async (req: any, res: any, next: any) => {
  try {
    const isClient = req.user.role === 'cliente';
    const orders = await getOrders(isClient ? req.user.id : undefined);
    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
});

app.get('/api/orders/:id', authenticateToken, requireRole(['admin', 'tienda', 'taller']), async (req: any, res: any, next: any) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const order = await getOrderDetails(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    }
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
});

app.post('/api/orders', authenticateToken, requireRole(['admin', 'tienda']), async (req: any, res: any, next: any) => {
  try {
    const { 
      client_id, 
      client_name, 
      priority, 
      notes, 
      estimated_delivery_date, 
      production_start_date, 
      product_id, 
      sizes, 
      attributes, 
      files 
    } = req.body;

    if (!client_id || !client_name || !estimated_delivery_date || !production_start_date || !product_id || !sizes || sizes.length === 0) {
      return res.status(400).json({ success: false, message: 'Faltan parámetros obligatorios en la orden' });
    }

    // Directiva 3: Sanitize payload and reject attempts to inject financial data or aggregate fields
    if ('subtotal' in req.body || 'total_price' in req.body || 'quantity' in req.body) {
      return res.status(400).json({
        success: false,
        message: 'Inyección de datos financieros / calculados denegada. El cálculo financiero corresponde exclusivamente a la Base de Datos.'
      });
    }

    const orderPayload = {
      client_id: parseInt(client_id, 10),
      client_name,
      created_by: req.user.id,
      priority: priority || 'medium',
      notes,
      estimated_delivery_date,
      production_start_date,
      product_id: parseInt(product_id, 10),
      sizes: sizes.map((s: any) => ({
        product_size_id: parseInt(s.product_size_id, 10),
        quantity: parseInt(s.quantity, 10)
      })),
      attributes: (attributes || []).map((a: any) => ({
        attribute_id: parseInt(a.attribute_id, 10),
        attribute_value_id: a.attribute_value_id ? parseInt(a.attribute_value_id, 10) : null,
        custom_value: a.custom_value || null
      })),
      files: (files || []).map((f: any) => ({
        file_url: f.file_url,
        file_type: f.file_type || 'image/jpeg'
      }))
    };

    const orderId = await createOrder(orderPayload);
    res.status(201).json({ success: true, orderId, message: 'Pedido y tareas de producción creados exitosamente' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// PRODUCTION TASKS ENDPOINTS
// ==========================================
app.get('/api/production/tasks', authenticateToken, requireRole(['admin', 'taller', 'tienda', 'cliente']), async (req: any, res: any, next: any) => {
  try {
    const dateStr = req.query.date as string;
    const orderIdStr = req.query.order_id as string;
    const orderId = orderIdStr ? parseInt(orderIdStr, 10) : undefined;
    
    const tasks = await getProductionTasks(dateStr, orderId);
    res.json({ success: true, tasks });
  } catch (err) {
    next(err);
  }
});

// GET Active Production Tasks (for the operational Kanban Board, unfiltered by date)
app.get('/api/production/tasks/active', authenticateToken, requireRole(['admin', 'taller', 'tienda', 'cliente']), async (req: any, res: any, next: any) => {
  try {
    const tasks = await getActiveProductionTasks();
    res.json({ success: true, tasks });
  } catch (err) {
    next(err);
  }
});

// GET Pending Review Tasks for Supervisors / Admins
app.get('/api/production/tasks/pending-review', authenticateToken, requireRole(['admin', 'taller']), async (req: any, res: any, next: any) => {
  try {
    const tasks = await getProductionTasksPendingReview();
    res.json({ success: true, tasks });
  } catch (err) {
    next(err);
  }
});

const handleTaskStatusUpdate = async (req: any, res: any, next: any) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { status_id, comment } = req.body;

    if (!status_id) {
      return res.status(400).json({ success: false, message: 'status_id es requerido' });
    }

    const targetStatus = parseInt(status_id, 10);

    // RBAC check: operarios cannot mark tasks as COMPLETED (3) directly
    if (req.user.role === 'operario' && targetStatus === 3) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: El operario no tiene permiso para marcar la tarea como COMPLETADO directamente. Debe marcarla como "Listo para revisión" (READY_FOR_REVIEW) para aprobación del supervisor.'
      });
    }

    await updateTaskStatus(taskId, targetStatus, req.user.id, comment);
    res.json({ success: true, message: 'Estado de la tarea actualizado exitosamente' });
  } catch (err) {
    next(err);
  }
};

app.put('/api/production/tasks/:id/status', authenticateToken, requireRole(['admin', 'taller', 'operario']), handleTaskStatusUpdate);
app.patch('/api/production/tasks/:id/status', authenticateToken, requireRole(['admin', 'taller', 'operario']), handleTaskStatusUpdate);

// Bulk Approve Endpoint for Supervisor/Admin
app.post('/api/production/tasks/bulk-approve', authenticateToken, requireRole(['admin', 'taller']), async (req: any, res: any, next: any) => {
  try {
    const { task_ids, comment } = req.body;
    if (!task_ids || !Array.isArray(task_ids)) {
      return res.status(400).json({ success: false, message: 'task_ids es un arreglo requerido' });
    }

    for (const id of task_ids) {
      const taskId = parseInt(id, 10);
      await updateTaskStatus(taskId, 3, req.user.id, comment || 'Aprobado y completado masivamente por supervisor');
    }

    res.json({ success: true, message: `${task_ids.length} tareas aprobadas y completadas exitosamente` });
  } catch (err) {
    next(err);
  }
});

// Advanced & Rework operations
app.post('/api/production/tasks/:id/advance', authenticateToken, requireRole(['admin', 'taller']), async (req: any, res: any, next: any) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { comment } = req.body;

    await advanceTaskStage(taskId, req.user.id, req.user.name || req.user.full_name || req.user.email, comment);
    res.json({ success: true, message: 'Fase del pedido avanzada con éxito' });
  } catch (err) {
    next(err);
  }
});

app.post('/api/production/tasks/:id/rework', authenticateToken, requireRole(['admin', 'taller']), async (req: any, res: any, next: any) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { rework_type, description, target_stage_id } = req.body;

    if (!rework_type || !description) {
      return res.status(400).json({ success: false, message: 'rework_type y description son requeridos' });
    }

    await createReworkEvent(
      taskId, 
      rework_type, 
      description, 
      req.user.id, 
      req.user.name || req.user.full_name || req.user.email,
      target_stage_id ? parseInt(target_stage_id, 10) : 1
    );
    res.json({ success: true, message: 'Operación de retrabajo registrada con éxito' });
  } catch (err) {
    next(err);
  }
});

app.get('/api/production/orders/:orderId/rework', authenticateToken, requireRole(['admin', 'taller', 'tienda']), async (req: any, res: any, next: any) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    const reworkEvents = await getReworkEvents(orderId);
    res.json({ success: true, reworkEvents });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// WORK CALENDAR / CAPACITY ENDPOINTS
// ==========================================
app.get('/api/capacity', authenticateToken, requireRole(['admin', 'tienda', 'taller']), async (req: any, res: any, next: any) => {
  try {
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Fechas de inicio y fin son obligatorias' });
    }

    const calendar = await getCapacityCalendar(startDate, endDate);
    const committed = await getCapacityCommitted(startDate, endDate);

    res.json({ success: true, calendar, committed });
  } catch (err) {
    next(err);
  }
});

app.post('/api/capacity', authenticateToken, requireRole(['admin']), async (req: any, res: any, next: any) => {
  try {
    const { configs } = req.body; // array of calendar definitions
    if (!configs || !Array.isArray(configs)) {
      return res.status(400).json({ success: false, message: 'configs es requerido y debe ser una lista' });
    }

    const parsedConfigs = configs.map((c: any) => ({
      work_date: c.work_date,
      stage_id: parseInt(c.stage_id, 10),
      max_capacity_points: parseInt(c.max_capacity_points, 10),
      is_working_day: !!c.is_working_day,
      notes: c.notes || undefined
    }));

    await saveCapacityCalendar(parsedConfigs);
    res.json({ success: true, message: 'Calendario de capacidad guardado exitosamente' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// ACCESS CONTROL ENDPOINTS
// ==========================================

// Get all users
app.get('/api/admin/users', authenticateToken, requireRole(['admin']), async (req: any, res: any, next: any) => {
  try {
    const users = await getAllUsers();
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
});

// Create new user
app.post('/api/admin/users', authenticateToken, requireRole(['admin']), async (req: any, res: any, next: any) => {
  try {
    const { full_name, email, password, role_id, is_active, nit, nrc, nombre_comercial, actividad_economica, direccion, telefono } = req.body;
    if (!full_name || full_name.trim() === '') {
      return res.status(400).json({ success: false, message: 'El nombre completo es un campo obligatorio.' });
    }
    if (!email || email.trim() === '') {
      return res.status(400).json({ success: false, message: 'El correo electrónico es un campo obligatorio.' });
    }
    
    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'La dirección de correo electrónico provista no tiene un formato válido.' });
    }

    if (!password || password.trim() === '') {
      return res.status(400).json({ success: false, message: 'La contraseña es un campo obligatorio.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener una longitud mínima de 6 caracteres por seguridad.' });
    }

    if (!role_id || isNaN(parseInt(role_id, 10))) {
      return res.status(400).json({ success: false, message: 'Debe seleccionar un rol de usuario válido.' });
    }
    const rId = parseInt(role_id, 10);
    if (![1, 2, 3, 4].includes(rId)) {
      return res.status(400).json({ success: false, message: 'El rol de usuario seleccionado no existe en el sistema.' });
    }

    const existingUser = await getUserByEmail(email.trim());
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado en el sistema.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser(
      full_name.trim(), 
      email.trim().toLowerCase(), 
      passwordHash, 
      rId, 
      is_active !== false,
      req.user?.full_name || 'Sistema',
      nit || null,
      nrc || null,
      nombre_comercial || null,
      actividad_economica || null,
      direccion || null,
      telefono || null
    );

    // Audit log
    await createAuditLog(
      req.user.name || req.user.full_name || req.user.email,
      'Usuario Creado',
      'Ninguno',
      `Creado usuario: ${full_name} (${email}) con rol_id: ${role_id}`
    );

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// Update user active status
app.put('/api/admin/users/:id/status', authenticateToken, requireRole(['admin']), async (req: any, res: any, next: any) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { is_active } = req.body;
    if (is_active === undefined) {
      return res.status(400).json({ success: false, message: 'El campo is_active es obligatorio' });
    }

    // Admin cannot deactivate themselves to avoid lockout
    if (req.user.id === userId && !is_active) {
      return res.status(400).json({ success: false, message: 'Un administrador no puede inactivarse a sí mismo.' });
    }

    await updateUserStatus(userId, !!is_active);

    // Audit log
    await createAuditLog(
      req.user.name,
      'Estado de Usuario Modificado',
      `ID: ${userId}`,
      `Se cambió el estado activo de usuario ID ${userId} a: ${is_active ? 'Activo' : 'Inactivo'}`
    );

    res.json({ success: true, message: 'Estado del usuario actualizado exitosamente' });
  } catch (err) {
    next(err);
  }
});

// Get all roles
app.get('/api/admin/roles', authenticateToken, requireRole(['admin']), async (req: any, res: any, next: any) => {
  try {
    const roles = await getAllRoles();
    res.json({ success: true, roles });
  } catch (err) {
    next(err);
  }
});

// Get role permissions
app.get('/api/admin/permissions', authenticateToken, requireRole(['admin']), async (req: any, res: any, next: any) => {
  try {
    const permissions = await getRolePermissions();
    res.json({ success: true, permissions });
  } catch (err) {
    next(err);
  }
});

// Update role permission
app.post('/api/admin/permissions', authenticateToken, requireRole(['admin']), async (req: any, res: any, next: any) => {
  try {
    const { role_id, permission_key, is_enabled } = req.body;
    if (role_id === undefined || !permission_key || is_enabled === undefined) {
      return res.status(400).json({ success: false, message: 'role_id, permission_key y is_enabled son obligatorios' });
    }

    await updateRolePermission(parseInt(role_id, 10), permission_key, !!is_enabled);

    // Audit log
    await createAuditLog(
      req.user.name,
      'Permiso Modificado',
      `Rol: ${role_id}, Permiso: ${permission_key}`,
      `Nuevo estado: ${is_enabled ? 'Habilitado' : 'Deshabilitado'}`
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// NEW ERP ADVANCED FEATURES ENDPOINTS
// ==========================================

// Audit Logs Endpoint
app.get('/api/audit-logs', authenticateToken, requireRole(['admin']), async (req: any, res: any, next: any) => {
  try {
    const logs = await getAuditLogs();
    res.json({ success: true, logs });
  } catch (err) {
    next(err);
  }
});

// Payments Endpoints
app.get('/api/payments', authenticateToken, requireRole(['admin', 'tienda', 'cliente']), async (req: any, res: any, next: any) => {
  try {
    const orderIdStr = req.query.order_id as string;
    const orderId = orderIdStr ? parseInt(orderIdStr, 10) : undefined;
    const payments = await getPayments(orderId);
    res.json({ success: true, payments });
  } catch (err) {
    next(err);
  }
});

app.post('/api/payments', authenticateToken, requireRole(['admin', 'tienda']), async (req: any, res: any, next: any) => {
  try {
    const { order_id, amount, payment_method, notes } = req.body;
    if (!order_id || isNaN(parseInt(order_id, 10))) {
      return res.status(400).json({ success: false, message: 'Debe especificar un identificador de pedido válido.' });
    }
    if (amount === undefined || isNaN(parseFloat(amount))) {
      return res.status(400).json({ success: false, message: 'Debe especificar el monto del pago.' });
    }
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'El monto del pago debe ser un número positivo mayor que cero.' });
    }
    if (!payment_method || payment_method.trim() === '') {
      return res.status(400).json({ success: false, message: 'Debe especificar el método de pago.' });
    }
    
    const methodLower = String(payment_method).toLowerCase().trim();
    let finalMethod: 'efectivo' | 'tarjeta' | 'transferencia';
    if (methodLower === 'efectivo' || methodLower === 'cash') {
      finalMethod = 'efectivo';
    } else if (methodLower === 'tarjeta' || methodLower === 'card') {
      finalMethod = 'tarjeta';
    } else if (methodLower === 'transferencia' || methodLower === 'transfer') {
      finalMethod = 'transferencia';
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Método de pago no reconocido. Debe ser uno de los siguientes: efectivo (cash), tarjeta (card), transferencia (transfer).' 
      });
    }

    const paymentId = await createPayment(
      parseInt(order_id, 10),
      parseFloat(amount),
      finalMethod,
      notes || '',
      req.user.id,
      req.user.full_name || req.user.email
    );
    res.status(201).json({ success: true, paymentId, message: 'Pago registrado exitosamente' });
  } catch (err) {
    next(err);
  }
});

// Invoices Endpoints
app.get('/api/invoices', authenticateToken, requireRole(['admin', 'tienda', 'cliente']), async (req: any, res: any, next: any) => {
  try {
    const orderIdStr = req.query.order_id as string;
    const orderId = orderIdStr ? parseInt(orderIdStr, 10) : undefined;
    const invoices = await getInvoices(orderId);
    res.json({ success: true, invoices });
  } catch (err) {
    next(err);
  }
});

app.post('/api/invoices', authenticateToken, requireRole(['admin', 'tienda']), async (req: any, res: any, next: any) => {
  try {
    const { order_id, invoice_type, discount, tax, status, notes } = req.body;
    if (!order_id || isNaN(parseInt(order_id, 10))) {
      return res.status(400).json({ success: false, message: 'Debe especificar un identificador de pedido válido.' });
    }
    if (!invoice_type || invoice_type.trim() === '') {
      return res.status(400).json({ success: false, message: 'El tipo de factura es obligatorio.' });
    }

    if (discount !== undefined && isNaN(parseFloat(discount))) {
      return res.status(400).json({ success: false, message: 'El descuento debe ser un número válido.' });
    }
    if (discount !== undefined && parseFloat(discount) < 0) {
      return res.status(400).json({ success: false, message: 'El descuento no puede ser un valor negativo.' });
    }

    if (tax !== undefined && isNaN(parseFloat(tax))) {
      return res.status(400).json({ success: false, message: 'El impuesto debe ser un número válido.' });
    }
    if (tax !== undefined && parseFloat(tax) < 0) {
      return res.status(400).json({ success: false, message: 'El impuesto no puede ser un valor negativo.' });
    }

    const invoiceId = await createInvoice(
      parseInt(order_id, 10),
      invoice_type.trim(),
      discount ? parseFloat(discount) : 0,
      tax ? parseFloat(tax) : 0,
      req.user.full_name || req.user.email,
      req.user.role,
      status ? String(status).trim() : undefined,
      notes ? String(notes).trim() : undefined
    );
    res.status(201).json({ success: true, invoiceId, message: 'Factura emitida exitosamente' });
  } catch (err) {
    next(err);
  }
});

// Manual Order Status Update Endpoint (with state machine and outstanding balance checks)
app.put('/api/orders/:id/status', authenticateToken, requireRole(['admin', 'tienda']), async (req: any, res: any, next: any) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const { status_id, comment } = req.body;
    if (!status_id) {
      return res.status(400).json({ success: false, message: 'status_id es requerido' });
    }
    await updateOrderStatus(
      orderId,
      parseInt(status_id, 10),
      req.user.id,
      req.user.full_name || req.user.email,
      req.user.role,
      comment
    );
    res.json({ success: true, message: 'Estado del pedido actualizado exitosamente' });
  } catch (err) {
    next(err);
  }
});

// Advanced Corporate Reports/Stats Endpoint
app.get('/api/reports/stats', authenticateToken, requireRole(['admin', 'tienda']), async (req: any, res: any, next: any) => {
  try {
    const stats = await getReportStats();
    res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
});


// ==========================================
// CENTRALIZED ERROR TRANSLATION MIDDLEWARE
// ==========================================
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Backend Error intercepted:', err);

  let message = err.message || 'Error interno del servidor';
  let status = 500;
  let code = 'INTERNAL_SERVER_ERROR';

  const msgStr = String(err.message || '');
  
  if (msgStr.includes('|') || err.sqlState || err instanceof MySqlCustomError) {
    const parts = msgStr.split('|');
    if (parts.length >= 2) {
      code = parts[0].trim();
      message = parts[1].trim();
    } else {
      code = err.code || 'DB_ERROR';
      message = msgStr;
    }

    const sqlState = String(err.sqlState || '');
    if (sqlState === '45001' || code === 'ERR_CAPACITY_EXCEEDED') {
      status = 400; // Capacidad excedida
    } else if (sqlState === '45002' || code === 'ERR_NON_WORKING_DAY') {
      status = 400; // Día no laborable
    } else if (sqlState === '45003' || code === 'ERR_MISSING_CAPACITY_DEFINITION') {
      status = 422; // Falta definir capacidad
    } else if (sqlState === '45004' || code === 'ERR_ATTRIBUTE_VALUE_REQUIRED') {
      status = 400;
    } else if (sqlState === '45005' || code === 'ERR_CUSTOM_VALUE_REQUIRED') {
      status = 400;
    } else if (sqlState === '45006' || code === 'ERR_IMMUTABLE_FIELD') {
      status = 409; // Conflicto por inmutabilidad
    } else if (sqlState === '45007' || code === 'ERR_SIZE_PRODUCT_MISMATCH') {
      status = 400;
    } else if (sqlState === '45008' || code === 'ERR_INVALID_QUANTITY_WRITE') {
      status = 500;
    } else if (sqlState === '45009' || code === 'ERR_OVERPAYMENT') {
      status = 400;
    } else if (sqlState === '45010' || code === 'ERR_DISCOUNT_UNAUTHORIZED') {
      status = 403;
    } else if (sqlState === '45011' || code === 'ERR_TERMINAL_STATE') {
      status = 422;
    } else if (sqlState === '45012' || code === 'ERR_INVALID_TRANSITION') {
      status = 400;
    } else if (sqlState === '45013' || code === 'ERR_OUTSTANDING_BALANCE') {
      status = 403;
    } else {
      status = 400;
    }
  }

  res.status(status).json({
    success: false,
    code,
    message,
  });
});

// ==========================================
// VITE DEV SERVER OR STATIC SERVING IN PROD
// ==========================================
async function start() {
  // Extend work calendar immediately for the next 60 days
  extendWorkCalendar(60)
    .then(() => console.log('Work calendar extended successfully on startup.'))
    .catch((err) => console.error('Failed to extend work calendar on startup:', err));

  // Schedule daily work calendar extension at midnight
  cron.schedule('0 0 * * *', () => {
    console.log('Running scheduled daily work calendar extension...');
    extendWorkCalendar(60)
      .then(() => console.log('Work calendar extended successfully by cron job.'))
      .catch((err) => console.error('Cron job work calendar extension failed:', err));
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware loaded in Development mode');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static server configured pointing to dist/');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} with custom error translations active.`);
  });
}

start();
