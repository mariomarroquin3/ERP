import { MySqlCustomError, IVA_RATE } from './db';

/**
 * REGLA GENERAL DE DISEÑO HISTÓRICO / CONGELACIÓN DE DATOS:
 * Cualquier función que tome una decisión sobre una fila o registro YA CREADO 
 * (como order_item_attributes, order_item_sizes, payments, invoices, production_tasks) 
 * debe basarse EXCLUSIVAMENTE en las columnas ya congeladas de esa fila 
 * (ej: value_label, price_modifier_snapshot, unit_price, etc.), NUNCA releyendo 
 * el catálogo mutable (como product_attributes, products, etc.) en tiempo de 
 * cálculo posterior a la creación. Esto garantiza que cambios posteriores en el 
 * catálogo (ej. renombrar un atributo o cambiar su precio) no alteren de forma 
 * retroactiva y silenciosa pedidos ya realizados o facturados.
 */

/**
 * Snapshots the size and adds it to order_item_sizes.
 * Enforces product assignment matching and active size flags.
 */
export async function snapshotOrderItemSize(
  conn: any,
  orderItemId: number,
  productSizeId: number,
  quantity: number
): Promise<void> {
  const [psRows]: any = await conn.query(
    `SELECT ps.product_id, ps.active, ps.price_modifier, s.name as size_name
     FROM product_sizes ps
     JOIN sizes s ON ps.size_id = s.id
     WHERE ps.id = ?`,
    [productSizeId]
  );

  if (psRows.length === 0) {
    throw new MySqlCustomError('45007', 'ERR_SIZE_PRODUCT_MISMATCH', 'La talla seleccionada no existe para el producto');
  }

  const ps = psRows[0];

  const [itemRows]: any = await conn.query(
    `SELECT product_id FROM order_items WHERE id = ?`,
    [orderItemId]
  );

  if (itemRows.length === 0) {
    throw new MySqlCustomError('45007', 'ERR_SIZE_PRODUCT_MISMATCH', 'El ítem de pedido no existe');
  }

  const item = itemRows[0];
  if (ps.product_id !== item.product_id) {
    throw new MySqlCustomError(
      '45007',
      'ERR_SIZE_PRODUCT_MISMATCH',
      'La talla seleccionada no coincide con el producto del pedido'
    );
  }

  if (!ps.active) {
    throw new MySqlCustomError(
      '45007',
      'ERR_SIZE_PRODUCT_MISMATCH',
      'La talla seleccionada no está activa para este producto'
    );
  }

  await conn.query(
    `INSERT INTO order_item_sizes (order_item_id, product_size_id, size_label, price_modifier_snapshot, quantity)
     VALUES (?, ?, ?, ?, ?)`,
    [orderItemId, productSizeId, ps.size_name, ps.price_modifier, quantity]
  );
}

/**
 * Snapshots order item attribute.
 * Enforces requires_catalog_value validations.
 */
export async function snapshotOrderItemAttribute(
  conn: any,
  orderItemId: number,
  attributeId: number,
  attributeValueId: number | null,
  customValue: string | null
): Promise<void> {
  const [attrRows]: any = await conn.query(
    `SELECT pa.product_id, pa.attribute_name, at.requires_catalog_value
     FROM product_attributes pa
     JOIN attribute_types at ON pa.attribute_type_id = at.id
     WHERE pa.id = ?`,
    [attributeId]
  );

  if (attrRows.length === 0) {
    throw new Error('Atributo de producto no encontrado');
  }

  const attr = attrRows[0];
  const requiresCatalogValue = !!attr.requires_catalog_value;

  let valueLabel = '';
  let priceModifierSnapshot = 0;

  if (requiresCatalogValue) {
    if (!attributeValueId) {
      throw new MySqlCustomError(
        '45004',
        'ERR_ATTRIBUTE_VALUE_REQUIRED',
        'Se requiere seleccionar un valor de catálogo para este atributo'
      );
    }
    const [valRows]: any = await conn.query(
      `SELECT value, price_modifier FROM product_attribute_values WHERE id = ? AND attribute_id = ?`,
      [attributeValueId, attributeId]
    );
    if (valRows.length === 0) {
      throw new MySqlCustomError(
        '45004',
        'ERR_ATTRIBUTE_VALUE_REQUIRED',
        'El valor de atributo seleccionado no es válido o no pertenece a este atributo'
      );
    }
    valueLabel = valRows[0].value;
    priceModifierSnapshot = Number(valRows[0].price_modifier);
  } else {
    if (!customValue || String(customValue).trim() === '') {
      throw new MySqlCustomError(
        '45005',
        'ERR_CUSTOM_VALUE_REQUIRED',
        'Se requiere ingresar un valor personalizado para este atributo libre'
      );
    }
    valueLabel = String(customValue).trim();
    if (attr.attribute_name && attr.attribute_name.toLowerCase().includes('bordado')) {
      priceModifierSnapshot = 2.50;
    } else {
      priceModifierSnapshot = 0;
    }
  }

  await conn.query(
    `INSERT INTO order_item_attributes (order_item_id, attribute_id, attribute_value_id, custom_value, value_label, price_modifier_snapshot)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [orderItemId, attributeId, attributeValueId, customValue, valueLabel, priceModifierSnapshot]
  );
}

/**
 * Validates capacity constraints and reserves capacity on a work calendar date for a given stage.
 */
export async function validateAndReserveCapacity(
  conn: any,
  stageId: number,
  workDate: string,
  workloadPoints: number,
  excludeTaskId?: number
): Promise<void> {
  const [calRows]: any = await conn.query(
    `SELECT max_capacity_points, is_working_day FROM work_calendar WHERE work_date = ? AND stage_id = ? FOR UPDATE`,
    [workDate, stageId]
  );

  if (calRows.length === 0) {
    throw new MySqlCustomError(
      '45003',
      'ERR_MISSING_CAPACITY_DEFINITION',
      'No hay capacidad definida en work_calendar para esta fecha y etapa'
    );
  }

  const cal = calRows[0];
  if (!cal.is_working_day) {
    throw new MySqlCustomError(
      '45002',
      'ERR_NON_WORKING_DAY',
      'La fecha seleccionada no es día laborable para esta etapa'
    );
  }

  let query = `
    SELECT SUM(pt.workload_points) as committed_points
    FROM production_tasks pt
    JOIN orders o ON pt.order_id = o.id
    WHERE pt.stage_id = ? AND pt.start_date = ? AND o.status_id <> 6
  `;
  const params: any[] = [stageId, workDate];
  if (excludeTaskId) {
    query += ` AND pt.id <> ?`;
    params.push(excludeTaskId);
  }

  const [sumRows]: any = await conn.query(query, params);
  const committed = Number(sumRows[0].committed_points || 0);

  if (committed + workloadPoints > cal.max_capacity_points) {
    const available = cal.max_capacity_points - committed;
    throw new MySqlCustomError(
      '45001',
      'ERR_CAPACITY_EXCEEDED',
      `Capacidad de taller excedida para esta fecha y etapa. Capacidad disponible: ${available} puntos, Requerido: ${workloadPoints} puntos`
    );
  }
}

/**
 * Recalculates subtotal of an order item by tallying size and attribute modifiers.
 */
export async function recalcOrderItemSubtotal(conn: any, orderItemId: number): Promise<void> {
  const [itemRows]: any = await conn.query(
    `SELECT unit_price FROM order_items WHERE id = ?`,
    [orderItemId]
  );
  if (itemRows.length === 0) return;
  const unitPrice = Number(itemRows[0].unit_price);

  const [attrRows]: any = await conn.query(
    `SELECT price_modifier_snapshot FROM order_item_attributes WHERE order_item_id = ?`,
    [orderItemId]
  );

  let attrExtra = 0;
  for (const attr of attrRows) {
    attrExtra += Number(attr.price_modifier_snapshot);
  }

  const [sizeRows]: any = await conn.query(
    `SELECT price_modifier_snapshot, quantity FROM order_item_sizes WHERE order_item_id = ?`,
    [orderItemId]
  );

  let totalQty = 0;
  let subtotal = 0;
  for (const s of sizeRows) {
    const qty = Number(s.quantity);
    totalQty += qty;
    const sizeExtra = Number(s.price_modifier_snapshot);
    const unitCost = unitPrice + attrExtra + sizeExtra;
    subtotal += qty * unitCost;
  }

  await conn.query(
    `UPDATE order_items SET quantity = ?, subtotal = ? WHERE id = ?`,
    [totalQty, subtotal, orderItemId]
  );
}

/**
 * Recalculates total price of an order by summing all item subtotals.
 */
export async function recalcOrderTotal(conn: any, orderId: number): Promise<void> {
  const [sumRows]: any = await conn.query(
    `SELECT COALESCE(SUM(subtotal), 0) as total FROM order_items WHERE order_id = ?`,
    [orderId]
  );
  const totalPrice = Number(sumRows[0].total) * (1 + IVA_RATE);

  await conn.query(
    `UPDATE orders SET total_price = ? WHERE id = ?`,
    [totalPrice, orderId]
  );
}

/**
 * Asserts that the client_name of an order does not change.
 */
export async function assertClientNameImmutable(
  conn: any,
  orderId: number,
  newClientName: string
): Promise<void> {
  const [orderRows]: any = await conn.query(
    `SELECT client_name FROM orders WHERE id = ?`,
    [orderId]
  );
  if (orderRows.length > 0) {
    const oldClientName = orderRows[0].client_name;
    if (oldClientName !== newClientName) {
      throw new MySqlCustomError(
        '45006',
        'ERR_IMMUTABLE_FIELD',
        'El nombre del cliente es un campo inmutable y no puede modificarse'
      );
    }
  }
}

/**
 * Validates that adding a payment does not exceed the order's total price (with FOR UPDATE lock).
 * Enforces MySqlCustomError with state 45009 / ERR_OVERPAYMENT.
 */
export async function validateAndCheckOverpayment(
  conn: any,
  orderId: number,
  amount: number
): Promise<void> {
  const [orderRows]: any = await conn.query(
    `SELECT total_price FROM orders WHERE id = ? FOR UPDATE`,
    [orderId]
  );
  if (orderRows.length === 0) {
    throw new Error('Pedido no encontrado');
  }
  const totalPrice = Number(orderRows[0].total_price);

  const [paymentRows]: any = await conn.query(
    `SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE order_id = ?`,
    [orderId]
  );
  const totalPaidSoFar = Number(paymentRows[0].total_paid);

  if (totalPaidSoFar + amount > totalPrice + 0.01) {
    throw new MySqlCustomError(
      '45009',
      'ERR_OVERPAYMENT',
      `El pago de $${amount.toFixed(2)} excede el saldo pendiente de $${(totalPrice - totalPaidSoFar).toFixed(2)}. Total del pedido: $${totalPrice.toFixed(2)}.`
    );
  }
}

/**
 * Validates that the discount percentage is authorized for the given user role (with FOR UPDATE lock).
 * Discounts above 15% require 'admin' role.
 * Enforces MySqlCustomError with state 45010 / ERR_DISCOUNT_UNAUTHORIZED.
 * Returns the total price of the order so it can be used for subtotal.
 */
export async function validateDiscountAuthorization(
  conn: any,
  orderId: number,
  discount: number,
  userRole: string
): Promise<number> {
  const [orderRows]: any = await conn.query(
    `SELECT total_price FROM orders WHERE id = ? FOR UPDATE`,
    [orderId]
  );
  if (orderRows.length === 0) {
    throw new Error('Pedido no encontrado');
  }
  const totalPrice = Number(orderRows[0].total_price);

  if (totalPrice > 0) {
    const netPrice = totalPrice / (1 + IVA_RATE);
    const discountPercentage = (discount / netPrice) * 100;
    if (discountPercentage > 15 && userRole !== 'admin') {
      throw new MySqlCustomError(
        '45010',
        'ERR_DISCOUNT_UNAUTHORIZED',
        `El descuento de $${discount.toFixed(2)} (${discountPercentage.toFixed(1)}%) supera el límite del 15% permitido para su rol. Solicite autorización de un administrador.`
      );
    }
  }
  return totalPrice;
}

/**
 * Generates a deterministic and unique invoice number sequence (with FOR UPDATE lock).
 * Enforces serial sequence numbering for invoices.
 */
export async function getNextInvoiceNumber(
  conn: any,
  year: number
): Promise<number> {
  // a. Ensure row exists for this year
  await conn.query(
    `INSERT INTO invoice_sequences (year, next_number) VALUES (?, 1) ON DUPLICATE KEY UPDATE year = year`,
    [year]
  );

  // b. Lock sequence row for this year
  const [seqRows]: any = await conn.query(
    `SELECT next_number FROM invoice_sequences WHERE year = ? FOR UPDATE`,
    [year]
  );

  const nextNumber = Number(seqRows[0].next_number);

  // c. Increment sequence
  await conn.query(
    `UPDATE invoice_sequences SET next_number = next_number + 1 WHERE year = ?`,
    [year]
  );

  return nextNumber;
}

/**
 * Validates state transition rules for orders (with FOR UPDATE lock).
 * Checks terminal state (45011), transition paths (45012), and outstanding balance (45013).
 */
export async function validateOrderStatusTransition(
  conn: any,
  orderId: number,
  newStatusId: number,
  userRole: string
): Promise<{ oldStatusId: number; clientName: string }> {
  // a. SELECT status_id, total_price, client_name FROM orders WHERE id = ? FOR UPDATE
  const [orderRows]: any = await conn.query(
    `SELECT status_id, total_price, client_name FROM orders WHERE id = ? FOR UPDATE`,
    [orderId]
  );
  if (orderRows.length === 0) {
    throw new Error('Pedido no encontrado');
  }

  const oldStatusId = Number(orderRows[0].status_id);
  const totalPrice = Number(orderRows[0].total_price);
  const clientName = orderRows[0].client_name;

  if (oldStatusId === newStatusId) {
    return { oldStatusId, clientName };
  }

  // terminal state check
  if (oldStatusId === 5 || oldStatusId === 6) {
    throw new MySqlCustomError(
      '45011',
      'ERR_TERMINAL_STATE',
      'No se puede cambiar el estado de un pedido que ya está en estado terminal (Entregado o Cancelado).'
    );
  }

  // transition paths check
  if (newStatusId === 3 && oldStatusId !== 2) {
    throw new MySqlCustomError(
      '45012',
      'ERR_INVALID_TRANSITION',
      'Un pedido sólo puede pasar a "En Producción" si primero ha sido "Confirmado".'
    );
  }
  if (newStatusId === 4 && oldStatusId !== 3) {
    throw new MySqlCustomError(
      '45012',
      'ERR_INVALID_TRANSITION',
      'Un pedido sólo puede pasar a "Listo para Entrega" si primero estuvo "En Producción".'
    );
  }

  // outstanding balance check
  if (newStatusId === 5) {
    const [paymentRows]: any = await conn.query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE order_id = ?`,
      [orderId]
    );
    const totalPaid = Number(paymentRows[0].total_paid);
    const balance = totalPrice - totalPaid;

    if (balance > 0.01 && userRole !== 'admin') {
      throw new MySqlCustomError(
        '45013',
        'ERR_OUTSTANDING_BALANCE',
        `No se permite registrar la entrega del pedido #${orderId} con un saldo pendiente de $${balance.toFixed(2)}, a menos que cuente con autorización del Administrador.`
      );
    }
  }

  return { oldStatusId, clientName };
}


