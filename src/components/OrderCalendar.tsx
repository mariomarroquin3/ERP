import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  DollarSign, 
  User as UserIcon, 
  FileText, 
  Image as ImageIcon, 
  Layers, 
  X, 
  Info, 
  Clock, 
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order } from '../types';
import OrderDetailsTimeline from './OrderDetailsTimeline';

interface OrderCalendarProps {
  token: string;
  onCreateNewOrder: () => void;
}

export default function OrderCalendar({ token, onCreateNewOrder }: OrderCalendarProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailedOrder, setDetailedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (id: number) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setDetailedOrder(data.order);
      }
    } catch (err) {
      console.error('Error fetching details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    fetchOrderDetails(order.id);
  };

  const closeDetails = () => {
    setSelectedOrder(null);
    setDetailedOrder(null);
  };

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay(); // 0 is Sunday
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayIndex = getFirstDayOfMonth(currentDate);

  const monthsEs = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const getOrdersForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return orders.filter((o) => o.estimated_delivery_date === dateStr);
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'high': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'medium': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getStatusLabel = (statusId: number) => {
    switch (statusId) {
      case 1: return 'Pendiente de Confirmación';
      case 2: return 'Confirmado';
      case 3: return 'En Producción';
      case 4: return 'Listo para Entrega';
      case 5: return 'Entregado';
      case 6: return 'Cancelado';
      default: return 'Estado';
    }
  };

  const getStatusBadgeClass = (statusId: number) => {
    switch (statusId) {
      case 1: return 'bg-amber-50 text-amber-800 border border-amber-200';
      case 2: return 'bg-blue-50 text-blue-800 border border-blue-200';
      case 3: return 'bg-purple-50 text-purple-800 border border-purple-200';
      case 4: return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
      case 5: return 'bg-slate-100 text-slate-800 border border-slate-200';
      default: return 'bg-red-50 text-red-800 border border-red-200';
    }
  };

  // Render Calendar Grid Days
  const calendarDays = [];
  // Placeholders for empty days at start of month
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(
      <div key={`empty-${i}`} className="h-32 bg-slate-50/50 border border-slate-100 p-2 text-slate-300"></div>
    );
  }

  // Actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayOrders = getOrdersForDay(day);
    const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();

    calendarDays.push(
      <div 
        key={`day-${day}`} 
        className={`h-32 bg-white border border-slate-100 p-2 flex flex-col justify-between overflow-y-auto hover:bg-slate-50/50 transition ${
          isToday ? 'ring-2 ring-indigo-500 ring-inset' : ''
        }`}
      >
        <span className={`text-xs font-bold ${isToday ? 'text-indigo-600' : 'text-slate-600'}`}>{day}</span>
        <div className="flex flex-col gap-1 mt-1 grow overflow-y-auto">
          {dayOrders.map((order) => (
            <button
              key={order.id}
              onClick={() => handleOrderClick(order)}
              className="w-full text-left p-1.5 rounded-lg text-[10px] font-semibold border truncate hover:scale-102 transition shadow-xs"
              style={{
                backgroundColor: order.priority === 'urgent' ? '#FFF1F2' : order.priority === 'high' ? '#FEF3C7' : '#EEF2FF',
                borderColor: order.priority === 'urgent' ? '#FECDD3' : order.priority === 'high' ? '#FDE68A' : '#C7D2FE',
                color: order.priority === 'urgent' ? '#9F1239' : order.priority === 'high' ? '#92400E' : '#3730A3'
              }}
            >
              #{order.id} | {order.client_name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Calendario de Pedidos</h2>
          <p className="text-slate-500 text-sm">Visualización interactiva por fecha estimada de entrega (estimated_delivery_date)</p>
        </div>
        <button
          onClick={onCreateNewOrder}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-100 transition"
        >
          <Plus className="h-4 w-4" />
          Nuevo Pedido Complejo
        </button>
      </div>

      {/* Month Navigator */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-150 shadow-xs">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-5 w-5 text-indigo-600" />
          <span className="text-base font-bold text-slate-800">
            {monthsEs[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-3xl border border-slate-150 overflow-hidden shadow-xs">
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-150 text-center py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <div>Dom</div>
          <div>Lun</div>
          <div>Mar</div>
          <div>Mié</div>
          <div>Jue</div>
          <div>Vie</div>
          <div>Sáb</div>
        </div>
        <div className="grid grid-cols-7 border-collapse">
          {calendarDays}
        </div>
      </div>

      {/* Dynamic Modal for Order Details */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white z-10">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-slate-900">Detalles de Pedido #{selectedOrder.id}</h3>
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getPriorityBadgeClass(selectedOrder.priority)}`}>
                      Prioridad {selectedOrder.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    Cliente: <strong className="text-slate-700">{selectedOrder.client_name}</strong>
                  </p>
                </div>
                <button
                  onClick={closeDetails}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-8 overflow-y-auto">
                {loadingDetails ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Clock className="h-10 w-10 animate-spin text-indigo-600 mb-2" />
                    <span>Cargando esquema relacional desde base de datos...</span>
                  </div>
                ) : detailedOrder ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* General info column */}
                    <div className="space-y-4 lg:col-span-5">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-indigo-500" />
                          Información General
                        </h4>
                        <div className="text-sm space-y-2 text-slate-600">
                          <div>
                            <span className="text-[11px] text-slate-400 block font-medium">Estado del Pedido</span>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(detailedOrder.status_id)}`}>
                              {getStatusLabel(detailedOrder.status_id)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block font-medium">Fecha Estimada de Entrega</span>
                            <span className="font-semibold text-slate-800">{detailedOrder.estimated_delivery_date}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block font-medium">Fecha de Inicio en Taller</span>
                            <span className="font-semibold text-slate-800">{detailedOrder.production_start_date}</span>
                          </div>
                          {detailedOrder.notes && (
                            <div className="border-t border-slate-200 pt-2 mt-2">
                              <span className="text-[11px] text-slate-400 block font-medium">Notas / Instrucciones</span>
                              <p className="text-xs italic bg-white p-2 rounded-lg border border-slate-150 text-slate-500 mt-1">
                                {detailedOrder.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Order Status Evolution Timeline Stepper */}
                      <OrderDetailsTimeline 
                        order={detailedOrder} 
                        token={token} 
                      />

                      {/* DB Trigger Compliance Box */}
                      <div className="bg-indigo-50/50 border border-indigo-150 p-4 rounded-2xl space-y-2">
                        <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Info className="h-4 w-4 text-indigo-600" />
                          Gobernanza de Datos
                        </h4>
                        <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">
                          Los subtotales, totales y de capacidad de taller son calculados directamente en la base de datos por Triggers SQL inmutables.
                        </p>
                      </div>
                    </div>

                    {/* Matrix & specifications column */}
                    <div className="lg:col-span-7 space-y-6">
                      {detailedOrder.items && detailedOrder.items.map((item, itemIdx) => (
                        <div key={item.id} className="border border-slate-150 rounded-2xl overflow-hidden shadow-xs bg-white">
                          <div className="bg-slate-50 px-4 py-3 border-b border-slate-150 flex justify-between items-center">
                            <h4 className="text-sm font-bold text-slate-800">{item.product_name || 'Especificación de Producto'}</h4>
                            <span className="text-xs text-slate-500 font-mono bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                              Base: ${parseFloat(item.unit_price as any).toFixed(2)}
                            </span>
                          </div>

                          <div className="p-5 space-y-6">
                            {/* Matrix sizes */}
                            <div>
                              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Matriz de Tallas y Cantidades
                              </h5>
                              <div className="grid grid-cols-6 gap-2">
                                {item.sizes && item.sizes.map((sz) => (
                                  <div key={sz.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-center flex flex-col justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{sz.size_label}</span>
                                    <span className="text-sm font-extrabold text-slate-800 mt-1">{sz.quantity}</span>
                                    <span className="text-[9px] text-indigo-600 font-medium mt-1 bg-indigo-50/50 rounded-md py-0.5 border border-indigo-100/30">
                                      +${parseFloat(sz.price_modifier_snapshot as any).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Attributes list */}
                            <div>
                              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Atributos Configurados (Snapshots)
                              </h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {item.attributes && item.attributes.map((attr) => (
                                  <div key={attr.id} className="flex justify-between items-center border border-slate-100 rounded-xl px-3 py-2 text-xs">
                                    <div>
                                      <span className="text-[10px] text-slate-400 font-medium block">{attr.attribute_name}</span>
                                      <strong className="text-slate-800 font-semibold">{attr.value_label}</strong>
                                    </div>
                                    {Number(attr.price_modifier_snapshot) > 0 && (
                                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md">
                                        +${parseFloat(attr.price_modifier_snapshot as any).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* File Upload / Image Attachment */}
                            {item.files && item.files.length > 0 && (
                              <div>
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                  Archivos de Diseño y Bordados Adjuntos
                                </h5>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {item.files.map((file) => (
                                    <div key={file.id} className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 group hover:border-indigo-300 transition">
                                      <img
                                        src={file.file_url}
                                        alt="Diseño de maquila"
                                        referrerPolicy="no-referrer"
                                        className="w-full h-24 object-cover"
                                      />
                                      <div className="absolute inset-x-0 bottom-0 bg-slate-900/70 p-1 text-center text-[9px] text-white font-medium truncate">
                                        Bordado Adjunto
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Financial Recalculation Section */}
                            <div className="border-t border-slate-150 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                                <Info className="h-4 w-4 text-slate-400" />
                                Cantidad Total: <strong className="text-slate-800 font-bold font-mono">{item.quantity} unidades</strong>
                              </span>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Subtotal Ítem (Recalculado)</span>
                                <span className="text-lg font-black text-indigo-600 font-mono">
                                  ${parseFloat(item.subtotal as any).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Order Total summary */}
                      <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-center border border-slate-800 shadow-lg">
                        <div className="flex items-center gap-3 mb-2 sm:mb-0">
                          <div className="bg-indigo-600 p-2 rounded-xl text-white">
                            <DollarSign className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold leading-none mb-1">Costo Total Recalculado</h4>
                            <p className="text-[10px] text-slate-400">Total acumulado de ítems y variaciones</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black text-indigo-400 font-mono">
                            ${parseFloat(detailedOrder.total_price as any).toFixed(2)}
                          </span>
                          <span className="text-[9px] text-emerald-400 block font-medium">✓ Trigger SQL Sincronizado</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500">Error al cargar detalles de la orden</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
