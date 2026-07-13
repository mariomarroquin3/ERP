import React, { useState, useEffect } from 'react';
import { ClipboardList, Clock, Layers, User, RefreshCw, CheckCircle } from 'lucide-react';
import { Order } from '../types';
import OrderDetailsTimeline from './OrderDetailsTimeline';

interface MyOrdersProps {
  token: string;
}

export default function MyOrders({ token }: MyOrdersProps) {
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
      case 1: return 'bg-amber-50 text-amber-700 border-amber-200';
      case 2: return 'bg-blue-50 text-blue-700 border-blue-200';
      case 3: return 'bg-purple-50 text-purple-700 border-purple-200';
      case 4: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 5: return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-indigo-600" />
            Mis Pedidos de Maquila
          </h2>
          <p className="text-slate-500 text-sm">Historial de órdenes y seguimiento en tiempo real de su estado de confección</p>
        </div>
        <button
          onClick={fetchMyOrders}
          className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition"
          title="Actualizar Datos"
        >
          <RefreshCw className="h-4.5 w-4.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Clock className="h-10 w-10 animate-spin text-indigo-600 mb-2" />
          <span className="text-sm">Consultando sus pedidos con el servidor...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl">
          <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 mb-1">Aún no posee pedidos registrados</h3>
          <p className="text-xs text-slate-400">Póngase en contacto con el personal de tienda para registrar su primera maquila.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-indigo-150 transition space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 block uppercase font-mono">ORDEN #{order.id}</span>
                  <strong className="text-slate-800 text-sm">{order.client_name}</strong>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusClass(order.status_id)}`}>
                    {getStatusLabel(order.status_id)}
                  </span>
                  <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                    Total: ${parseFloat(order.total_price as any).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Entrega Estimada</span>
                  <strong className="text-slate-700 font-bold">{order.estimated_delivery_date}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Inicio en Taller</span>
                  <strong className="text-slate-700 font-bold">{order.production_start_date}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Fecha Creación</span>
                  <strong className="text-slate-700 font-bold">{order.created_at.split('T')[0]}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Garantía Maquila</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Sincronizada
                  </span>
                </div>
              </div>

              {order.notes && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-[11px] text-slate-500 italic leading-relaxed">
                  <strong>Instrucción Especial:</strong> {order.notes}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition py-1 px-3 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 rounded-xl"
                >
                  {expandedOrderId === order.id ? 'Ocultar evolución ↑' : 'Seguimiento de Pedido (Timeline) ↓'}
                </button>
              </div>

              {expandedOrderId === order.id && (
                <div className="pt-4 border-t border-slate-100">
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
