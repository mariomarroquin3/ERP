import React, { useState, useEffect } from 'react';
import { ClipboardList, Clock, Layers, User, RefreshCw, CheckCircle, Sun, Moon } from 'lucide-react';
import { Order } from '../types';
import OrderDetailsTimeline from './OrderDetailsTimeline';
import { useTheme } from '../contexts/ThemeContext';

interface MyOrdersProps {
  token: string;
}

export default function MyOrders({ token }: MyOrdersProps) {
  const { theme, toggleTheme } = useTheme();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  useEffect(() => {
    fetchMyOrders();
  }, []);

  const fetchMyOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Error fetching client orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (statusId: number) => {
    switch (statusId) {
      case 1: return 'Pendiente';
      case 2: return 'Confirmado';
      case 3: return 'En Producción';
      case 4: return 'Listo para Entrega';
      case 5: return 'Entregado';
      case 6: return 'Cancelado';
      default: return 'Recibido';
    }
  };

  const getStatusClass = (statusId: number) => {
    switch (statusId) {
      case 1: return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 2: return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 3: return 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 4: return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 5: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
      default: return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Mis Pedidos de Maquila
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Historial de órdenes y seguimiento en tiempo real de su estado de confección</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition"
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            onClick={fetchMyOrders}
            className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl transition"
            title="Actualizar Datos"
          >
            <RefreshCw className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
          <Clock className="h-10 w-10 animate-spin text-indigo-600 dark:text-indigo-400 mb-2" />
          <span className="text-sm">Consultando sus pedidos con el servidor...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl">
          <ClipboardList className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1">Aún no posee pedidos registrados</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">Póngase en contacto con el personal de tienda para registrar su primera maquila.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs hover:border-indigo-200 dark:hover:border-indigo-800 transition space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block uppercase font-mono">ORDEN #{order.id}</span>
                  <strong className="text-slate-800 dark:text-slate-200 text-sm">{order.client_name}</strong>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusClass(order.status_id)}`}>
                    {getStatusLabel(order.status_id)}
                  </span>
                  <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800">
                    Total: ${parseFloat(order.total_price as any).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block font-medium">Entrega Estimada</span>
                  <strong className="text-slate-700 dark:text-slate-300 font-bold">{order.estimated_delivery_date}</strong>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block font-medium">Inicio en Taller</span>
                  <strong className="text-slate-700 dark:text-slate-300 font-bold">{order.production_start_date}</strong>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block font-medium">Fecha Creación</span>
                  <strong className="text-slate-700 dark:text-slate-300 font-bold">{order.created_at.split('T')[0]}</strong>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block font-medium">Garantía Maquila</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Sincronizada
                  </span>
                </div>
              </div>

              {order.notes && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 italic leading-relaxed">
                  <strong>Instrucción Especial:</strong> {order.notes}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition py-1 px-3 bg-indigo-50/50 dark:bg-indigo-900/20 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-xl"
                >
                  {expandedOrderId === order.id ? 'Ocultar evolución ↑' : 'Seguimiento de Pedido (Timeline) ↓'}
                </button>
              </div>

              {expandedOrderId === order.id && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                  <OrderDetailsTimeline 
                    order={order} 
                    token={token} 
                    role="cliente"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
