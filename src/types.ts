export interface User {
  id: number;
  full_name: string;
  email: string;
  role: 'admin' | 'tienda' | 'taller' | 'cliente' | 'operario';
  permissions?: string[];
}

export interface Product {
  id: number;
  name: string;
  base_price: number;
  active: boolean;
  product_type_id: number;
}

export interface AttributeType {
  id: number;
  code: string;
  name: string;
  input_component: string;
  requires_catalog_value: boolean;
}

export interface ProductAttributeValue {
  id: number;
  attribute_id: number;
  value: string;
  price_modifier: number;
  active: boolean;
}

export interface ProductAttribute {
  id: number;
  product_id: number;
  attribute_name: string;
  attribute_type_id: number;
  is_required: boolean;
  requires_catalog_value?: boolean;
  values?: ProductAttributeValue[];
}

export interface ProductSize {
  id: number;
  product_id: number;
  size_id: number;
  price_modifier: number;
  active: boolean;
  size_code?: string;
  size_name?: string;
  size_gender?: string;
}

export interface Size {
  id: number;
  code: string;
  name: string;
  sort_order: number;
  gender?: string;
}

export interface OrderItemSize {
  id: number;
  order_item_id: number;
  product_size_id: number;
  size_label: string;
  price_modifier_snapshot: number;
  quantity: number;
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

export interface OrderItemFile {
  id: number;
  order_item_id: number;
  file_url: string;
  file_type?: string;
  uploaded_at: string;
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
  // Joins
  stage_name?: string;
  status_name?: string;
  assigned_name?: string;
  product_name?: string;
  client_name?: string;
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
  registered_by_name?: string;
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


