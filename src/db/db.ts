import pg from 'pg';
import bcrypt from 'bcryptjs';

// Define DB Types
export interface Role {
  id: number;
  name: string;
  description: string;
}

export interface RolePermission {
  role_id: number;
  permission_key: string;
  is_enabled: boolean;
}

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  password_hash: string;
  role_id: number;
  is_active: boolean;
}

export interface ProductType {
  id: number;
  name: string;
}

export interface AttributeType {
  id: number;
  code: string;
  name: string;
  input_component: string;
  requires_catalog_value: boolean;
}

export interface OrderStatus {
  id: number;
  name: string;
  is_terminal: boolean;
}

export interface ProductionStatus {
  id: number;
  name: string;
}

export interface ProductionStage {
  id: number;
  name: string;
  sequence_order: number;
}

export interface Size {
  id: number;
  code: string;
  name: string;
  sort_order: number;
  gender?: string;
}

export interface Product {
  id: number;
  name: string;
  base_price: number;
  active: boolean;
  product_type_id: number;
}

export interface ProductAttribute {
  id: number;
  product_id: number;
  attribute_name: string;
  attribute_type_id: number;
  is_required: boolean;
  values?: ProductAttributeValue[];
}

export interface ProductAttributeValue {
  id: number;
  attribute_id: number;
  value: string;
  price_modifier: number;
  active: boolean;
}

export interface ProductSize {
  id: number;
  product_id: number;
  size_id: number;
  price_modifier: number;
  active: boolean;
  size_code?: string;
  size_name?: string;
}

export interface Order {
  id: number;
  client_id: number | null;
  client_name: string;
  created_by: number;
  status_id: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  total_price: number;
  notes?: string;
  client_confirmed: boolean;
  client_confirmed_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
  estimated_delivery_date: string;
  production_start_date: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  custom_notes?: any;
  sizes?: OrderItemSize[];
  attributes?: OrderItemAttribute[];
  files?: OrderItemFile[];
}

export interface OrderItemAttribute {
  id: number;
  order_item_id: number;
  attribute_id: number;
  attribute_name?: string;
  attribute_value_id: number | null;
  custom_value: string | null;
  value_label: string;
  price_modifier_snapshot: number;
}

export interface OrderItemSize {
  id: number;
  order_item_id: number;
  product_size_id: number;
  size_label: string;
  price_modifier_snapshot: number;
  quantity: number;
}

export interface OrderItemFile {
  id: number;
  order_item_id: number;
  file_url: string;
  file_type?: string;
  uploaded_at: string;
}

export interface OrderStatusHistory {
  id: number;
  order_id: number;
  status_id: number;
  changed_by: number;
  changed_at: string;
  comment?: string;
}

export interface ProductionTask {
  id: number;
  order_id: number;
  order_item_id: number;
  stage_id: number;
  assigned_to: number | null;
  status_id: number;
  start_date: string;
  end_date_estimated?: string;
  end_date_actual?: string;
  workload_points: number;
  created_at: string;
  updated_at: string;
  task_type?: 'normal' | 'repair' | 'remake';
  // Joins
  stage_name?: string;
  status_name?: string;
  assigned_name?: string;
  product_name?: string;
  client_name?: string;
}

export interface ProductionTaskHistory {
  id: number;
  production_task_id: number;
  status_id: number;
  changed_by: number | null;
  changed_at: string;
  comment?: string;
}

export interface WorkCalendar {
  id: number;
  work_date: string;
  stage_id: number;
  max_capacity_points: number;
  is_working_day: boolean;
  notes?: string;
}

export interface Payment {
  id: number;
  order_id: number;
  amount: number;
  payment_method: 'efectivo' | 'tarjeta' | 'transferencia';
  created_at: string;
  notes?: string;
  registered_by: number;
}

export interface Invoice {
  id: number;
  order_id: number;
  invoice_number: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  created_at: string;
  invoice_type: 'consumidor_final' | 'credito_fiscal';
  issue_date?: string;
  status?: string;
  notes?: string;
}

export interface AuditLog {
  id: number;
  user_name: string;
  action: string;
  created_at: string;
  old_value: string;
  new_value: string;
}

export interface ReworkEvent {
  id: number;
  production_task_id: number;
  order_id: number;
  rework_type: 'arreglo' | 'hacer_de_nuevo';
  description: string;
  created_at: string;
  created_by: number;
  created_by_name?: string;
  stage_id: number;
  stage_name?: string;
}

export interface PasswordResetRequest {
  id: number;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}




// Business rule violation raised by the data layer. The server error middleware
// maps `sqlState` (45001-45013) to an HTTP status and shows `message` to the user.
export class BusinessRuleError extends Error {
  sqlState: string;
  code: string;

  constructor(sqlState: string, codeName: string, message: string) {
    super(`${codeName}|${message}`);
    this.name = 'BusinessRuleError';
    this.sqlState = sqlState;
    this.code = codeName;
    Object.setPrototypeOf(this, BusinessRuleError.prototype);
  }
}

// Production Scheduling Helper (Excludes Sundays as non-working days)
export function getProductionSchedule(startDateStr: string, endDateStr: string, numStages = 10): string[] {
  const start = new Date(startDateStr + 'T12:00:00'); // Use noon to avoid timezone shift issues
  const end = new Date(endDateStr + 'T12:00:00');
  
  const workingDays: string[] = [];
  const calendarDays: string[] = [];
  
  let current = new Date(start);
  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    calendarDays.push(dateStr);
    if (current.getDay() !== 0) { // Not Sunday
      workingDays.push(dateStr);
    }
    current.setDate(current.getDate() + 1);
  }
  
  const targetDays = workingDays.length > 0 ? workingDays : calendarDays;
  const scheduledDates: string[] = [];
  
  for (let i = 0; i < numStages; i++) {
    if (targetDays.length === 1) {
      scheduledDates.push(targetDays[0]);
    } else {
      const idx = Math.floor(i * (targetDays.length - 1) / (numStages - 1));
      scheduledDates.push(targetDays[idx]);
    }
  }
  
  return scheduledDates;
}

// Stateful Mock Database for Sandbox Mode
class MockDatabase {
  roles: Role[] = [];
  rolePermissions: RolePermission[] = [];
  users: User[] = [];
  productTypes: ProductType[] = [];
  attributeTypes: AttributeType[] = [];
  orderStatus: OrderStatus[] = [];
  productionStatus: ProductionStatus[] = [];
  productionStages: ProductionStage[] = [];
  sizes: Size[] = [];
  products: Product[] = [];
  productAttributes: ProductAttribute[] = [];
  productAttributeValues: ProductAttributeValue[] = [];
  productSizes: ProductSize[] = [];
  orders: Order[] = [];
  orderItems: OrderItem[] = [];
  orderItemAttributes: OrderItemAttribute[] = [];
  orderItemSizes: OrderItemSize[] = [];
  orderItemFiles: OrderItemFile[] = [];
  orderStatusHistory: OrderStatusHistory[] = [];
  productionTasks: ProductionTask[] = [];
  productionTaskHistory: ProductionTaskHistory[] = [];
  workCalendar: WorkCalendar[] = [];
  payments: Payment[] = [];
  invoices: Invoice[] = [];
  auditLogs: AuditLog[] = [];
  reworkEvents: ReworkEvent[] = [];
  invoiceSequences: { year: number; next_number: number }[] = [];
  passwordResetRequests: PasswordResetRequest[] = [];

  private nextIds: Record<string, number> = {};

  constructor() {
    this.initSeedData();
  }

  private nextId(table: string): number {
    if (!this.nextIds[table]) {
      this.nextIds[table] = 1;
    }
    return this.nextIds[table]++;
  }

  private initSeedData() {
    // 1. Roles
    this.roles = [
      { id: 1, name: 'admin', description: 'Administración general' },
      { id: 2, name: 'tienda', description: 'Personal de tienda / ventas' },
      { id: 3, name: 'taller', description: 'Personal de producción / Supervisor' },
      { id: 4, name: 'cliente', description: 'Cliente con cuenta' },
      { id: 5, name: 'operario', description: 'Operario de taller / producción' },
    ];
    this.nextIds['roles'] = 6;

    // 1.5 Role Permissions Seed
    this.rolePermissions = [
      // Admin permissions
      { role_id: 1, permission_key: 'dashboard', is_enabled: true },
      { role_id: 1, permission_key: 'calendar', is_enabled: true },
      { role_id: 1, permission_key: 'create_order', is_enabled: true },
      { role_id: 1, permission_key: 'kanban', is_enabled: true },
      { role_id: 1, permission_key: 'admin_panel', is_enabled: true },
      { role_id: 1, permission_key: 'my_orders', is_enabled: false },

      // Tienda permissions
      { role_id: 2, permission_key: 'dashboard', is_enabled: true },
      { role_id: 2, permission_key: 'calendar', is_enabled: true },
      { role_id: 2, permission_key: 'create_order', is_enabled: true },
      { role_id: 2, permission_key: 'kanban', is_enabled: false },
      { role_id: 2, permission_key: 'admin_panel', is_enabled: false },
      { role_id: 2, permission_key: 'my_orders', is_enabled: false },

      // Taller permissions
      { role_id: 3, permission_key: 'dashboard', is_enabled: false },
      { role_id: 3, permission_key: 'calendar', is_enabled: false },
      { role_id: 3, permission_key: 'create_order', is_enabled: false },
      { role_id: 3, permission_key: 'kanban', is_enabled: true },
      { role_id: 3, permission_key: 'admin_panel', is_enabled: false },
      { role_id: 3, permission_key: 'my_orders', is_enabled: false },

      // Cliente permissions
      { role_id: 4, permission_key: 'dashboard', is_enabled: false },
      { role_id: 4, permission_key: 'calendar', is_enabled: false },
      { role_id: 4, permission_key: 'create_order', is_enabled: false },
      { role_id: 4, permission_key: 'kanban', is_enabled: false },
      { role_id: 4, permission_key: 'admin_panel', is_enabled: false },
      { role_id: 4, permission_key: 'my_orders', is_enabled: true },

      // Operario permissions
      { role_id: 5, permission_key: 'dashboard', is_enabled: false },
      { role_id: 5, permission_key: 'calendar', is_enabled: false },
      { role_id: 5, permission_key: 'create_order', is_enabled: false },
      { role_id: 5, permission_key: 'kanban', is_enabled: true },
      { role_id: 5, permission_key: 'admin_panel', is_enabled: false },
      { role_id: 5, permission_key: 'my_orders', is_enabled: false },
    ];

    // 2. Users (sandbox only). Passwords: admin123, tienda123, taller123, cliente123, operario123
    const sandboxHash = (password: string) => bcrypt.hashSync(password, 8);
    this.users = [
      { id: 1, full_name: 'Admin Maquila', email: 'admin@maquila.com', password_hash: sandboxHash('admin123'), role_id: 1, is_active: true },
      { id: 2, full_name: 'Tienda Ventas', email: 'tienda@maquila.com', password_hash: sandboxHash('tienda123'), role_id: 2, is_active: true },
      { id: 3, full_name: 'Supervisor Taller', email: 'taller@maquila.com', password_hash: sandboxHash('taller123'), role_id: 3, is_active: true },
      { id: 4, full_name: 'Cliente Ejemplo', email: 'cliente@maquila.com', password_hash: sandboxHash('cliente123'), role_id: 4, is_active: true },
      { id: 5, full_name: 'Operario Juan', email: 'operario@maquila.com', password_hash: sandboxHash('operario123'), role_id: 5, is_active: true },
    ];
    this.nextIds['users'] = 6;

    // 3. Product Types
    this.productTypes = [
      { id: 1, name: 'Camisa' },
      { id: 2, name: 'Chumpa' },
      { id: 3, name: 'Pantalón' },
    ];
    this.nextIds['product_types'] = 4;

    // 4. Attribute Types
    this.attributeTypes = [
      { id: 1, code: 'select', name: 'Selección única', input_component: 'select_dropdown', requires_catalog_value: true },
      { id: 2, code: 'color', name: 'Selector de color', input_component: 'color_picker', requires_catalog_value: true },
      { id: 3, code: 'text', name: 'Texto libre', input_component: 'text_input', requires_catalog_value: false },
      { id: 4, code: 'number', name: 'Número', input_component: 'number_input', requires_catalog_value: false },
    ];
    this.nextIds['attribute_types'] = 5;

    // 5. Order Status
    this.orderStatus = [
      { id: 1, name: 'pendiente_confirmacion', is_terminal: false },
      { id: 2, name: 'confirmado', is_terminal: false },
      { id: 3, name: 'en_produccion', is_terminal: false },
      { id: 4, name: 'listo_entrega', is_terminal: false },
      { id: 5, name: 'entregado', is_terminal: true },
      { id: 6, name: 'cancelado', is_terminal: true },
    ];
    this.nextIds['order_status'] = 7;

    // 6. Production Status
    this.productionStatus = [
      { id: 1, name: 'pendiente' },
      { id: 2, name: 'en_proceso' },
      { id: 3, name: 'completado' },
      { id: 4, name: 'bloqueado' },
      { id: 5, name: 'listo_revision' },
    ];
    this.nextIds['production_status'] = 6;

    // 7. Production Stages
    this.productionStages = [
      { id: 1, name: 'Corte', sequence_order: 1 },
      { id: 2, name: 'Estampado', sequence_order: 2 },
      { id: 3, name: 'Confeccionado', sequence_order: 3 },
      { id: 4, name: 'Acabado', sequence_order: 4 },
      { id: 5, name: 'Revisado', sequence_order: 5 },
      { id: 6, name: 'Bordado', sequence_order: 6 },
      { id: 7, name: 'Planchado', sequence_order: 7 },
      { id: 8, name: 'Empaquetado', sequence_order: 8 },
      { id: 9, name: 'Recibido en Tienda', sequence_order: 9 },
      { id: 10, name: 'Despachado', sequence_order: 10 },
    ];
    this.nextIds['production_stages'] = 11;

    // 8. Sizes (Separadas por Hombre y Mujer)
    this.sizes = [
      // Hombre
      { id: 1, code: 'H-XS', name: 'XS Hombre', sort_order: 1, gender: 'hombre' },
      { id: 2, code: 'H-S', name: 'S Hombre', sort_order: 2, gender: 'hombre' },
      { id: 3, code: 'H-M', name: 'M Hombre', sort_order: 3, gender: 'hombre' },
      { id: 4, code: 'H-L', name: 'L Hombre', sort_order: 4, gender: 'hombre' },
      { id: 5, code: 'H-XL', name: 'XL Hombre', sort_order: 5, gender: 'hombre' },
      { id: 6, code: 'H-XXL', name: 'XXL Hombre', sort_order: 6, gender: 'hombre' },
      // Mujer
      { id: 7, code: 'M-XS', name: 'XS Mujer', sort_order: 11, gender: 'mujer' },
      { id: 8, code: 'M-S', name: 'S Mujer', sort_order: 12, gender: 'mujer' },
      { id: 9, code: 'M-M', name: 'M Mujer', sort_order: 13, gender: 'mujer' },
      { id: 10, code: 'M-L', name: 'L Mujer', sort_order: 14, gender: 'mujer' },
      { id: 11, code: 'M-XL', name: 'XL Mujer', sort_order: 15, gender: 'mujer' },
      { id: 12, code: 'M-XXL', name: 'XXL Mujer', sort_order: 16, gender: 'mujer' },
    ];
    this.nextIds['sizes'] = 13;

    // 9. Products
    this.products = [
      { id: 1, name: 'Camisa Oxford Premium', base_price: 15.00, active: true, product_type_id: 1 },
      { id: 2, name: 'Chumpa Impermeable Polar', base_price: 35.00, active: true, product_type_id: 2 },
      { id: 3, name: 'Pantalón Gabardina Oficial', base_price: 22.00, active: true, product_type_id: 3 },
    ];
    this.nextIds['products'] = 4;

    // 10. Product Attributes & Values
    this.productAttributes = [
      // Camisa Oxford (id 1)
      { id: 1, product_id: 1, attribute_name: 'Tipo de Cuello', attribute_type_id: 1, is_required: true },
      { id: 2, product_id: 1, attribute_name: 'Color de Tela', attribute_type_id: 2, is_required: true },
      { id: 3, product_id: 1, attribute_name: 'Texto de Bordado Personalizado', attribute_type_id: 3, is_required: false },
      // Chumpa (id 2)
      { id: 4, product_id: 2, attribute_name: 'Tipo de Forro', attribute_type_id: 1, is_required: true },
      { id: 5, product_id: 2, attribute_name: 'Instrucción Especial de Logo', attribute_type_id: 3, is_required: true },
    ];
    this.nextIds['product_attributes'] = 6;

    this.productAttributeValues = [
      // Tipo de Cuello (attr 1)
      { id: 1, attribute_id: 1, value: 'Cuello Italiano', price_modifier: 0.00, active: true },
      { id: 2, attribute_id: 1, value: 'Cuello Inglés', price_modifier: 0.50, active: true },
      { id: 3, attribute_id: 1, value: 'Cuello Mao', price_modifier: 1.00, active: true },
      // Color de Tela (attr 2)
      { id: 4, attribute_id: 2, value: 'Blanco', price_modifier: 0.00, active: true },
      { id: 5, attribute_id: 2, value: 'Celeste', price_modifier: 0.00, active: true },
      { id: 6, attribute_id: 2, value: 'Rojo Corporativo', price_modifier: 0.75, active: true },
      // Tipo de Forro (attr 4)
      { id: 7, attribute_id: 4, value: 'Forro Térmico Polar', price_modifier: 3.50, active: true },
      { id: 8, attribute_id: 4, value: 'Forro Sencillo Seda', price_modifier: 0.00, active: true },
    ];
    this.nextIds['product_attribute_values'] = 9;

    // 11. Product Sizes (Habilitando tallas de hombre y mujer para productos de prueba)
    this.productSizes = [
      // Camisa Oxford (id 1)
      { id: 1, product_id: 1, size_id: 2, price_modifier: 0.00, active: true }, // H-S
      { id: 2, product_id: 1, size_id: 3, price_modifier: 0.00, active: true }, // H-M
      { id: 3, product_id: 1, size_id: 4, price_modifier: 0.50, active: true }, // H-L
      { id: 4, product_id: 1, size_id: 5, price_modifier: 1.50, active: true }, // H-XL
      { id: 5, product_id: 1, size_id: 8, price_modifier: 0.00, active: true }, // M-S
      { id: 6, product_id: 1, size_id: 9, price_modifier: 0.00, active: true }, // M-M
      { id: 7, product_id: 1, size_id: 10, price_modifier: 0.50, active: true }, // M-L
      { id: 8, product_id: 1, size_id: 11, price_modifier: 1.50, active: true }, // M-XL

      // Chumpa (id 2)
      { id: 9, product_id: 2, size_id: 3, price_modifier: 0.00, active: true }, // H-M
      { id: 10, product_id: 2, size_id: 4, price_modifier: 1.50, active: true }, // H-L
      { id: 11, product_id: 2, size_id: 5, price_modifier: 3.00, active: true }, // H-XL
      { id: 12, product_id: 2, size_id: 9, price_modifier: 0.00, active: true }, // M-M
      { id: 13, product_id: 2, size_id: 10, price_modifier: 1.50, active: true }, // M-L
      { id: 14, product_id: 2, size_id: 11, price_modifier: 3.00, active: true }, // M-XL

      // Pantalón (id 3)
      { id: 15, product_id: 3, size_id: 2, price_modifier: 0.00, active: true }, // H-S
      { id: 16, product_id: 3, size_id: 3, price_modifier: 0.00, active: true }, // H-M
      { id: 17, product_id: 3, size_id: 4, price_modifier: 0.00, active: true }, // H-L
      { id: 18, product_id: 3, size_id: 8, price_modifier: 0.00, active: true }, // M-S
      { id: 19, product_id: 3, size_id: 9, price_modifier: 0.00, active: true }, // M-M
      { id: 20, product_id: 3, size_id: 10, price_modifier: 0.00, active: true }, // M-L
    ];
    this.nextIds['product_sizes'] = 21;

    // 12. Seed Work Calendar (Default max capacities for next 30 days)
    const today = new Date();
    for (let i = -5; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // Seed all 10 stages
      for (let stageId = 1; stageId <= 10; stageId++) {
        this.workCalendar.push({
          id: this.nextId('work_calendar'),
          work_date: dateStr,
          stage_id: stageId,
          max_capacity_points: [2, 6].includes(stageId) ? 200 : 500, // smaller capacity for printing & embroidery
          is_working_day: date.getDay() !== 0, // working day unless Sunday
          notes: date.getDay() === 0 ? 'Domingo - Cerrado' : undefined,
        });
      }
    }

    // 13. Create some initial sample orders to populate the calendar and kanban board!
    const sampleDates = [0, 2, 5, 8];
    sampleDates.forEach((offset, idx) => {
      const deliveryDate = new Date(today);
      deliveryDate.setDate(today.getDate() + offset + 2);
      const deliveryDateStr = deliveryDate.toISOString().split('T')[0];

      const startDate = new Date(today);
      startDate.setDate(today.getDate() + offset);
      const startDateStr = startDate.toISOString().split('T')[0];

      const orderId = this.nextId('orders');
      this.orders.push({
        id: orderId,
        client_id: 4,
        client_name: 'Cliente Ejemplo S.A.',
        created_by: 2, // Tienda
        status_id: offset === 0 ? 3 : 2, // 3 = en_produccion, 2 = confirmado
        priority: offset === 0 ? 'urgent' : 'medium',
        total_price: 0, // Calculated below via trigger triggers
        notes: `Pedido semilla de prueba #${idx + 1}`,
        client_confirmed: true,
        client_confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        estimated_delivery_date: deliveryDateStr,
        production_start_date: startDateStr,
      });

      // Add item (Camisa Oxford = 1)
      const itemId = this.nextId('order_items');
      this.orderItems.push({
        id: itemId,
        order_id: orderId,
        product_id: 1,
        quantity: 0,
        unit_price: 15.00,
        subtotal: 0,
        custom_notes: { instruction: 'Bordado lado izquierdo del pecho' },
      });

      // Add size matrix (10 S, 15 M, 5 L)
      this.orderItemSizes.push(
        { id: this.nextId('order_item_sizes'), order_item_id: itemId, product_size_id: 1, size_label: 'Small', price_modifier_snapshot: 0.00, quantity: 10 },
        { id: this.nextId('order_item_sizes'), order_item_id: itemId, product_size_id: 2, size_label: 'Medium', price_modifier_snapshot: 0.00, quantity: 15 },
        { id: this.nextId('order_item_sizes'), order_item_id: itemId, product_size_id: 3, size_label: 'Large', price_modifier_snapshot: 0.50, quantity: 5 }
      );

      // Add attributes
      this.orderItemAttributes.push(
        { id: this.nextId('order_item_attributes'), order_item_id: itemId, attribute_id: 1, attribute_value_id: 1, custom_value: null, value_label: 'Cuello Italiano', price_modifier_snapshot: 0.00 },
        { id: this.nextId('order_item_attributes'), order_item_id: itemId, attribute_id: 2, attribute_value_id: 5, custom_value: null, value_label: 'Celeste', price_modifier_snapshot: 0.00 },
        { id: this.nextId('order_item_attributes'), order_item_id: itemId, attribute_id: 3, attribute_value_id: null, custom_value: 'Logo Corporativo SRL', value_label: 'Logo Corporativo SRL', price_modifier_snapshot: 2.50 }
      );

      // Add image attach
      this.orderItemFiles.push({
        id: this.nextId('order_item_files'),
        order_item_id: itemId,
        file_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400',
        file_type: 'image/jpeg',
        uploaded_at: new Date().toISOString(),
      });

      // Recalculate
      this.sp_recalc_order_item_subtotal(itemId);
      this.sp_recalc_order_total(orderId);

      // Add Production Tasks for all 10 stages
      const scheduledDates = getProductionSchedule(startDateStr, deliveryDateStr, 10);
      for (let i = 0; i < 10; i++) {
        const stageId = i + 1;
        const taskStartDate = scheduledDates[i];
        const taskId = this.nextId('production_tasks');
        const isCurrent = offset === 0 && stageId === 1; // first task is in process if offset=0
        this.productionTasks.push({
          id: taskId,
          order_id: orderId,
          order_item_id: itemId,
          stage_id: stageId,
          assigned_to: stageId === 1 ? 3 : null, // assigned to Taller Supervisor
          status_id: isCurrent ? 2 : 1, // en_proceso (2) or pendiente (1)
          start_date: taskStartDate,
          end_date_estimated: deliveryDateStr,
          workload_points: 30, // 30 units total quantity
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          task_type: 'normal',
        });
      }
    });
  }

  // Procedure: Recalcula subtotal del item
  sp_recalc_order_item_subtotal(itemId: number) {
    const item = this.orderItems.find((oi) => oi.id === itemId);
    if (!item) return;

    const attributes = this.orderItemAttributes.filter((oia) => oia.order_item_id === itemId);
    const attrExtra = attributes.reduce((sum, attr) => sum + Number(attr.price_modifier_snapshot || 0), 0);

    const sizes = this.orderItemSizes.filter((ois) => ois.order_item_id === itemId);

    const totalQty = sizes.reduce((sum, s) => sum + s.quantity, 0);
    const subtotal = sizes.reduce((sum, s) => {
      const itemUnitPrice = Number(item.unit_price);
      const sizeExtra = Number(s.price_modifier_snapshot);
      const unitCost = itemUnitPrice + attrExtra + sizeExtra;
      return sum + s.quantity * unitCost;
    }, 0);

    item.quantity = totalQty;
    item.subtotal = subtotal;
  }

  // Procedure: Recalcula total de la orden
  sp_recalc_order_total(orderId: number) {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) return;

    const items = this.orderItems.filter((oi) => oi.order_id === orderId);
    order.total_price = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
  }

  // Trigger capacity checks
  validate_capacity(task: Partial<ProductionTask>, excludeTaskId?: number) {
    if (!task.start_date || !task.stage_id) return;

    const stageId = Number(task.stage_id);
    const startDate = task.start_date;
    const workload = Number(task.workload_points || 1);

    // Look up capacity definition
    const cal = this.workCalendar.find(
      (c) => c.work_date === startDate && c.stage_id === stageId
    );

    if (!cal) {
      throw new BusinessRuleError(
        '45003',
        'ERR_MISSING_CAPACITY_DEFINITION',
        'No hay capacidad definida en work_calendar para esta fecha y etapa'
      );
    }

    if (!cal.is_working_day) {
      throw new BusinessRuleError(
        '45002',
        'ERR_NON_WORKING_DAY',
        'La fecha seleccionada no es día laborable para esta etapa'
      );
    }

    // Committed points
    const committed = this.productionTasks
      .filter((t) => {
        const o = this.orders.find((ord) => ord.id === t.order_id);
        const orderIsCancelled = o && o.status_id === 6;
        return t.stage_id === stageId && t.start_date === startDate && t.id !== excludeTaskId && !orderIsCancelled;
      })
      .reduce((sum, t) => sum + t.workload_points, 0);

    if (committed + workload > cal.max_capacity_points) {
      throw new BusinessRuleError(
        '45001',
        'ERR_CAPACITY_EXCEEDED',
        `Capacidad de taller excedida para esta fecha y etapa. Capacidad disponible: ${cal.max_capacity_points - committed} puntos, Requerido: ${workload} puntos`
      );
    }
  }
}

// Global variable to persist database in sandbox mode
const globalAny: any = globalThis;
if (!globalAny.__mockDb) {
  globalAny.__mockDb = new MockDatabase();
}
export const mockDb: MockDatabase = globalAny.__mockDb;

// ==========================================
// POSTGRES / SUPABASE CONNECTION
// ==========================================

// Return DATE columns as plain 'YYYY-MM-DD' strings. The frontend and the
// scheduling code compare and display dates as strings; turning them into JS
// Date objects shifts them by the server timezone.
pg.types.setTypeParser(pg.types.builtins.DATE, (value: string) => value);
// COUNT/SUM over integers return BIGINT, and NUMERIC(10,2) money columns come
// back as strings by default. Both stay well inside JS number precision here.
pg.types.setTypeParser(pg.types.builtins.INT8, (value: string) => Number(value));
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value: string) => Number(value));

/** Result of a write statement, shaped like the old mysql2 ResultSetHeader. */
export interface WriteResult {
  insertId: number;
  affectedRows: number;
  rows: any[];
}

/**
 * Converts `?` placeholders to Postgres `$n` placeholders, leaving question
 * marks inside quoted strings or identifiers untouched.
 */
export function toPgPlaceholders(sql: string): string {
  let out = '';
  let index = 0;
  let quote: string | null = null;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (quote) {
      out += ch;
      if (ch === quote) {
        if (sql[i + 1] === quote) {
          out += sql[++i];
        } else {
          quote = null;
        }
      }
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
    } else if (ch === '?') {
      out += `$${++index}`;
    } else {
      out += ch;
    }
  }
  return out;
}

const WRITE_COMMANDS = new Set(['INSERT', 'UPDATE', 'DELETE']);

async function runQuery(client: pg.Pool | pg.PoolClient, sql: string, params: any[] = []): Promise<[any, pg.FieldDef[]]> {
  const result = await client.query(toPgPlaceholders(sql), params);
  if (WRITE_COMMANDS.has(result.command)) {
    const write: WriteResult = {
      insertId: result.rows[0]?.id ?? 0,
      affectedRows: result.rowCount ?? 0,
      rows: result.rows,
    };
    return [write, result.fields];
  }
  return [result.rows, result.fields];
}

/** A single connection checked out from the pool, used for transactions. */
export class DbConnection {
  constructor(private client: pg.PoolClient) {}

  query(sql: string, params?: any[]): Promise<[any, pg.FieldDef[]]> {
    return runQuery(this.client, sql, params);
  }

  async beginTransaction(): Promise<void> {
    await this.client.query('BEGIN');
  }

  async commit(): Promise<void> {
    await this.client.query('COMMIT');
  }

  async rollback(): Promise<void> {
    await this.client.query('ROLLBACK');
  }

  release(): void {
    this.client.release();
  }
}

/**
 * Thin wrapper around pg.Pool that keeps the `[rows] = await pool.query(sql, params)`
 * calling convention used throughout queries.ts. Write statements that need the new
 * id must end with `RETURNING id`.
 */
export class DbPool {
  constructor(private pool: pg.Pool) {}

  query(sql: string, params?: any[]): Promise<[any, pg.FieldDef[]]> {
    return runQuery(this.pool, sql, params);
  }

  async getConnection(): Promise<DbConnection> {
    return new DbConnection(await this.pool.connect());
  }

  end(): Promise<void> {
    return this.pool.end();
  }
}

let dbPool: DbPool | null = null;

/** True when the server is configured to use Postgres (Supabase) instead of the in-memory sandbox. */
export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

function sslConfig(connectionString: string): pg.PoolConfig['ssl'] {
  const mode = (process.env.DATABASE_SSL || '').toLowerCase();
  if (mode === 'disable' || mode === 'false') return false;
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])(:|\/)/.test(connectionString);
  if (isLocal && mode === '') return false;
  // Supabase requires TLS. If the project's CA certificate is provided
  // (Project Settings > Database > SSL configuration), verify it.
  if (process.env.DATABASE_CA_CERT) {
    return { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, '\n'), rejectUnauthorized: true };
  }
  return { rejectUnauthorized: false };
}

export async function getDbPool(): Promise<DbPool | null> {
  if (dbPool) return dbPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Not configured: fall back to the in-memory sandbox (development only;
    // server.ts refuses to start in production without DATABASE_URL).
    return null;
  }

  const pool = new pg.Pool({
    connectionString,
    ssl: sslConfig(connectionString),
    max: process.env.DATABASE_POOL_MAX ? parseInt(process.env.DATABASE_POOL_MAX, 10) : 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  pool.on('error', (err) => {
    console.error('Unexpected Postgres pool error:', err);
  });
  dbPool = new DbPool(pool);
  return dbPool;
}
