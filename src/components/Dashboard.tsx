import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Clock, 
  AlertTriangle, 
  DollarSign, 
  Percent, 
  BarChart2, 
  Printer, 
  ShieldAlert, 
  FileText, 
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2
} from 'lucide-react';
import { User, Order, Payment, ProductionTask, Invoice } from '../types';
import { InvoiceDocument } from './InvoiceDocument';
import { toast } from 'sonner';

interface DashboardProps {
  token: string;
  user: User;
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ token, user, setActiveTab }: DashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // Payment dialog states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // Invoice dialog states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceOrderId, setInvoiceOrderId] = useState<string>('');
  const [invoiceType, setInvoiceType] = useState<'consumidor_final' | 'credito_fiscal'>('consumidor_final');
  const [invoiceDiscount, setInvoiceDiscount] = useState<string>('0');
  const [invoiceTax, setInvoiceTax] = useState<string>('0');
  const [invoiceStatus, setInvoiceStatus] = useState<string>('emitida');
  const [invoiceNotes, setInvoiceNotes] = useState<string>('');
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, logsRes, ordersRes, paymentsRes, invoicesRes] = await Promise.all([
        fetch('/api/reports/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/audit-logs', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/orders', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/payments', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/invoices', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const safeParseJson = async (res: Response) => {
        try {
          const contentType = res.headers.get('content-type');
          if (res.ok && contentType && contentType.includes('application/json')) {
            return await res.json();
          }
          return { success: false, message: `HTTP error or non-JSON content: ${res.status}` };
        } catch (e) {
          return { success: false, message: 'JSON parse failure' };
        }
      };

      const [statsData, logsData, ordersData, paymentsData, invoicesData] = await Promise.all([
        safeParseJson(statsRes),
        safeParseJson(logsRes),
        safeParseJson(ordersRes),
        safeParseJson(paymentsRes),
        safeParseJson(invoicesRes)
      ]);

      if (statsData.success) setStats(statsData.stats);
      if (logsData.success) setAuditLogs(logsData.logs);
      if (ordersData.success) setOrders(ordersData.orders || ordersData.list || []);
      if (paymentsData.success) setPayments(paymentsData.payments);
      if (invoicesData.success) setInvoices(invoicesData.invoices);
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
      toast.error('Error al actualizar las métricas del sistema');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    if (!paymentOrderId || !paymentAmount) {
      setPaymentError('Por favor complete todos los campos obligatorios');
      return;
    }

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: parseInt(paymentOrderId, 10),
          amount: parseFloat(paymentAmount),
          payment_method: paymentMethod,
          notes: paymentNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Pago registrado correctamente');
        setShowPaymentModal(false);
        setPaymentOrderId('');
        setPaymentAmount('');
        setPaymentNotes('');
        fetchDashboardData();
      } else {
        setPaymentError(data.message || 'Error al procesar el pago');
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Error de conexión');
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvoiceError(null);
    if (!invoiceOrderId) {
      setInvoiceError('Seleccione un pedido válido');
      return;
    }

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: parseInt(invoiceOrderId, 10),
          invoice_type: invoiceType,
          discount: parseFloat(invoiceDiscount || '0'),
          tax: parseFloat(invoiceTax || '0'),
          status: invoiceStatus,
          notes: invoiceNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Factura emitida con éxito');

        const invoicesRes = await fetch('/api/invoices', { headers: { 'Authorization': `Bearer ${token}` } });
        const invoicesData = await invoicesRes.json();

        let newInvoice: Invoice | null = null;
        if (invoicesData.success) {
          const nextInvoices = invoicesData.invoices || [];
          setInvoices(nextInvoices);
          newInvoice = nextInvoices.find((i: Invoice) => i.id === data.invoiceId) || null;
        }

        setShowInvoiceModal(false);
        setInvoiceOrderId('');
        setInvoiceDiscount('0');
        setInvoiceTax('0');
        setInvoiceStatus('emitida');
        setInvoiceNotes('');
        fetchDashboardData();

        if (newInvoice) {
          await handleViewInvoice(newInvoice);
        }
      } else {
        setInvoiceError(data.message || 'Error al emitir factura');
      }
    } catch (err: any) {
      setInvoiceError(err.message || 'Error de conexión');
    }
  };

  const handleViewInvoice = async (invoice: Invoice) => {
    const relatedOrder = orders.find((o) => o.id === invoice.order_id) || null;

    if (relatedOrder?.items && relatedOrder.items.length > 0) {
      setViewingInvoice(invoice);
      setViewingOrder(relatedOrder);
      return;
    }

    try {
      const res = await fetch(`/api/orders/${invoice.order_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success && data.order) {
        setViewingInvoice(invoice);
        setViewingOrder(data.order);
      } else {
        setViewingInvoice(invoice);
        setViewingOrder(relatedOrder);
      }
    } catch (err) {
      console.error('Error loading order for invoice preview:', err);
      setViewingInvoice(invoice);
      setViewingOrder(relatedOrder);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const getOrderStatusBadge = (statusId: number) => {
    switch (statusId) {
      case 1:
        return <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-amber-200">Pendiente Conf.</span>;
      case 2:
        return <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-blue-200">Confirmado</span>;
      case 3:
        return <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-indigo-200">En Producción</span>;
      case 4:
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-emerald-200">Listo Entrega</span>;
      case 5:
        return <span className="bg-slate-100 text-slate-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-slate-200">Entregado</span>;
      case 6:
        return <span className="bg-rose-100 text-rose-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-rose-200">Cancelado</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-slate-200">Desconocido</span>;
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm font-semibold">Cargando métricas de rendimiento corporativo...</p>
        </div>
      </div>
    );
  }

  // Generate important enterprise alerts dynamically
  const alerts: string[] = [];
  if (stats?.production?.delayedTasks > 0) {
    alerts.push(`¡Alerta de Producción! Hay ${stats.production.delayedTasks} tareas de taller retrasadas con respecto a la fecha planificada.`);
  }

  // Find non-cancelled orders with pending balance that are ready for delivery
  const deliveryAlerts = orders.filter(
    (o) => o.status_id === 4 && (parseFloat(o.total_price) - (payments.filter((p) => p.order_id === o.id).reduce((sum, p) => sum + parseFloat(p.amount), 0))) > 0.01
  );
  deliveryAlerts.forEach((o) => {
    alerts.push(`Control Financiero: El pedido #${o.id} listo para entrega de "${o.client_name}" cuenta con un saldo pendiente.`);
  });

  return (
    <div className="space-y-8 pb-16 print:p-0 print:space-y-4" id="dashboard-tab">
      {/* Corporate Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Panel de Control General</h2>
          <p className="text-sm text-slate-500">Métricas clave, flujos de caja corporativos, facturación e historial de auditoría en tiempo real.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Period Filter */}
          <div className="inline-flex rounded-xl bg-white border border-slate-200 p-1">
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                period === 'month' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mes Actual
            </button>
            <button
              onClick={() => setPeriod('quarter')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                period === 'quarter' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Trimestre
            </button>
            <button
              onClick={() => setPeriod('year')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                period === 'year' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Año Actual
            </button>
          </div>

          {/* Quick Action buttons */}
          <button 
            onClick={fetchDashboardData}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition shadow-sm"
            title="Recargar Métricas"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button 
            onClick={handlePrintReport}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition"
          >
            <Printer className="h-4 w-4" />
            Exportar Informe
          </button>
        </div>
      </div>

      {/* PRINT-ONLY HEADER */}
      <div className="hidden print:block border-b border-slate-200 pb-4 mb-4">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">INFORME CORPORATIVO DE RENDIMIENTO</h1>
        <p className="text-sm text-slate-500 font-mono mt-1">
          Generado el: {new Date().toLocaleString()} | Usuario: {user.full_name} ({user.role.toUpperCase()})
        </p>
      </div>

      {/* Dynamic Alerts Module */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4 print:hidden">
          <div className="p-3 bg-amber-100 text-amber-800 rounded-xl h-fit">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-amber-900 text-base">Alertas y Acciones Críticas</h4>
            <ul className="list-disc pl-5 text-sm text-amber-800 space-y-1">
              {alerts.map((alert, idx) => (
                <li key={idx} className="leading-relaxed">{alert}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI: Ventas del periodo */}
        <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos Reales</span>
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                ${(stats?.finances?.totalRevenue || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <span className="text-emerald-600 font-bold">100% cobrado</span> en caja real.
          </div>
        </div>

        {/* KPI: Ingresos Estimados */}
        <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ventas Estimadas</span>
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                ${(stats?.finances?.estimatedRevenue || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 font-semibold">
            Pedidos confirmados y activos.
          </div>
        </div>

        {/* KPI: Pendiente de Pago */}
        <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cuentas por Cobrar</span>
              <h3 className="text-2xl font-extrabold text-rose-700 tracking-tight">
                ${(stats?.finances?.pendingPayments || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 font-semibold flex items-center gap-1">
            Saldos pendientes de clientes.
          </div>
        </div>

        {/* KPI: Utilización y Tareas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Eficiencia de Taller</span>
              <h3 className="text-2xl font-extrabold text-indigo-900 tracking-tight">
                {stats?.production?.efficiency || 0}%
              </h3>
            </div>
            <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 font-semibold flex justify-between items-center">
            <span>{stats?.production?.completedTasks || 0} completados</span>
            <span className="text-rose-600 font-bold">{stats?.production?.delayedTasks || 0} demorados</span>
          </div>
        </div>
      </div>

      {/* Advanced Payments and Invoices Quick Actions Panel (print:hidden) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
        {/* Core Quick Buttons */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <CreditCard className="text-indigo-600 h-5 w-5" /> Transacciones de Negocio
          </h3>
          <p className="text-xs text-slate-400">
            Utilice los accesos rápidos corporativos para procesar pagos de órdenes e iniciar facturas válidas ante hacienda.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                setPaymentError(null);
                setShowPaymentModal(true);
              }}
              className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100/50 text-emerald-800 rounded-xl text-sm font-semibold transition text-left"
            >
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Registrar Pago / Anticipo
              </span>
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">$ USD</span>
            </button>

            <button
              onClick={() => {
                setInvoiceError(null);
                setShowInvoiceModal(true);
              }}
              className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100/50 text-indigo-800 rounded-xl text-sm font-semibold transition text-left"
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Emitir Factura de Pedido
              </span>
              <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-mono font-bold">PDF</span>
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 hover:bg-slate-100/50 text-slate-700 rounded-xl text-sm font-semibold transition text-left"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" /> Ver Listado de Pedidos
              </span>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono font-bold">{orders.length}</span>
            </button>
          </div>
        </div>

        {/* Active Cashflows Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-emerald-600 h-5 w-5" /> Últimos Pagos Registrados
            </h3>
            <span className="text-xs font-mono font-bold text-slate-400">HISTORIAL DE FLUJOS</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5">ID</th>
                  <th className="py-2.5">Pedido</th>
                  <th className="py-2.5">Método</th>
                  <th className="py-2.5">Monto</th>
                  <th className="py-2.5 text-right">Registrado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {payments.slice(0, 5).map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-mono text-slate-400">#{pay.id}</td>
                    <td className="py-2.5">Pedido #{pay.order_id}</td>
                    <td className="py-2.5 text-slate-600 capitalize">{pay.payment_method}</td>
                    <td className="py-2.5 text-emerald-600 font-bold">${parseFloat(pay.amount).toFixed(2)}</td>
                    <td className="py-2.5 text-right text-slate-500">{pay.registered_by_name || 'Sistema'}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">No hay transacciones registradas todavía</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4 print:hidden">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-indigo-600 h-5 w-5" /> Facturas Emitidas
          </h3>
          <span className="text-xs font-semibold text-slate-400">VISTA RÁPIDA</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-2">#</th>
                <th className="py-2">Factura</th>
                <th className="py-2">Pedido</th>
                <th className="py-2">Tipo</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {invoices.length > 0 ? invoices.slice(0, 8).map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50">
                  <td className="py-2.5 font-mono text-slate-400">#{invoice.id}</td>
                  <td className="py-2.5 font-semibold text-slate-700">{invoice.invoice_number}</td>
                  <td className="py-2.5 text-slate-600">Pedido #{invoice.order_id}</td>
                  <td className="py-2.5">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${invoice.invoice_type === 'credito_fiscal' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                      {invoice.invoice_type === 'credito_fiscal' ? 'Crédito Fiscal' : 'Consumidor Final'}
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-indigo-600 font-bold">${Number(invoice.total).toFixed(2)}</td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => handleViewInvoice(invoice)}
                      className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-100"
                    >
                      <FileText className="h-3.5 w-3.5" /> Ver
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">No hay facturas emitidas todavía</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Business Report details (visible in Print mode) */}
      <div className="hidden print:grid grid-cols-2 gap-6 pt-6">
        <div className="border border-slate-200 p-4 rounded-xl space-y-3">
          <h3 className="text-sm font-bold text-slate-800 border-b pb-2 uppercase tracking-wide">INDICADORES FINANCIEROS</h3>
          <table className="w-full text-xs">
            <tbody>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Ingresos Recaudados:</td>
                <td className="py-1 text-right font-bold text-emerald-700">${(stats?.finances?.totalRevenue || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Ingresos Estimados:</td>
                <td className="py-1 text-right font-bold text-slate-800">${(stats?.finances?.estimatedRevenue || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Cuentas por Cobrar:</td>
                <td className="py-1 text-right font-bold text-rose-700">${(stats?.finances?.pendingPayments || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Facturas Emitidas:</td>
                <td className="py-1 text-right font-bold text-slate-800">{stats?.finances?.invoiceCount || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border border-slate-200 p-4 rounded-xl space-y-3">
          <h3 className="text-sm font-bold text-slate-800 border-b pb-2 uppercase tracking-wide">RESUMEN DE PRODUCCIÓN</h3>
          <table className="w-full text-xs">
            <tbody>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Eficiencia de Operación:</td>
                <td className="py-1 text-right font-bold text-indigo-700">{stats?.production?.efficiency || 0}%</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Tareas de Taller Totales:</td>
                <td className="py-1 text-right font-bold text-slate-800">{stats?.production?.totalTasks || 0}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Tareas Completadas:</td>
                <td className="py-1 text-right font-bold text-slate-800">{stats?.production?.completedTasks || 0}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Retrasos Detectados:</td>
                <td className="py-1 text-right font-bold text-rose-700">{stats?.production?.delayedTasks || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Client Historical Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Top Clients Rank */}
        <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <BarChart2 className="text-indigo-600 h-5 w-5" /> Ranking Histórico de Clientes
            </h3>
            <span className="text-xs font-semibold text-slate-400">POR FACTURADO</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2">Cliente</th>
                  <th className="py-2">Pedidos</th>
                  <th className="py-2 text-right">Inversión Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {stats?.clients?.clientHistory?.map((c: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 font-bold text-slate-700">{c.client_name}</td>
                    <td className="py-2.5">{c.order_count} pedidos</td>
                    <td className="py-2.5 text-right text-indigo-600 font-bold">${parseFloat(c.total_spent).toFixed(2)}</td>
                  </tr>
                ))}
                {(!stats?.clients?.clientHistory || stats.clients.clientHistory.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400">Sin historial de facturación de clientes</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product Profitability Analysis */}
        <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-emerald-600 h-5 w-5" /> Margen Estimado de Catálogo
            </h3>
            <span className="text-xs font-semibold text-slate-400">VALORES DE MARGEN</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2">Producto</th>
                  <th className="py-2">Precio Base</th>
                  <th className="py-2 text-right">Rentabilidad Est. (40%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {stats?.finances?.productProfitability?.map((p: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 text-slate-700 font-semibold">{p.product_name}</td>
                    <td className="py-2.5 text-slate-500 font-mono">${parseFloat(p.base_price).toFixed(2)}</td>
                    <td className="py-2.5 text-right text-emerald-600 font-bold">${parseFloat(p.estimated_profit).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Enterprise Audit Log (print:hidden) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4 print:hidden">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="text-slate-700 h-5 w-5" /> Historial de Auditoría Interna (Logs)
          </h3>
          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-500 font-bold">SEGURIDAD ACTIVA</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-2">ID</th>
                <th className="py-2">Usuario</th>
                <th className="py-2">Acción</th>
                <th className="py-2">Fecha</th>
                <th className="py-2">Valor Anterior</th>
                <th className="py-2 text-right">Nuevo Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-mono">
              {auditLogs.slice(0, 10).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 text-[11px] text-slate-600">
                  <td className="py-2 font-bold text-slate-400">#{log.id}</td>
                  <td className="py-2 font-bold text-slate-800">{log.user_name}</td>
                  <td className="py-2 font-semibold text-indigo-700">{log.action}</td>
                  <td className="py-2 text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="py-2 text-slate-400 truncate max-w-[150px]" title={log.old_value}>{log.old_value || '-'}</td>
                  <td className="py-2 text-right text-slate-900 font-semibold truncate max-w-[200px]" title={log.new_value}>{log.new_value || '-'}</td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">No se han registrado auditorías de seguridad</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====================================================
          MODAL: REGISTRAR PAGO
          ==================================================== */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-100 max-w-md w-full p-6 shadow-xl space-y-4"
          >
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-extrabold text-slate-800 text-lg">Registrar Pago / Anticipo</h4>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
            </div>

            {paymentError && (
              <div className="p-3 bg-rose-50 text-rose-800 border border-rose-100 text-xs font-semibold rounded-lg leading-relaxed">
                {paymentError}
              </div>
            )}

            <form onSubmit={handleRegisterPayment} className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Seleccionar Pedido *</label>
                <select 
                  value={paymentOrderId} 
                  onChange={(e) => setPaymentOrderId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                >
                  <option value="">-- Seleccione un Pedido --</option>
                  {orders.filter((o) => o.status_id !== 6).map((o) => (
                    <option key={o.id} value={o.id}>
                      Pedido #{o.id} - {o.client_name} (${parseFloat(o.total_price).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Monto del Pago *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 pl-7 pr-3 py-2.5 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Método de Pago *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['efectivo', 'tarjeta', 'transferencia'] as const).map((method) => (
                    <button
                      type="button"
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border capitalize transition ${
                        paymentMethod === method 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Notas de Transacción</label>
                <textarea
                  placeholder="Detalles de depósito, transferencia bancaria, etc."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none h-20 resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition"
                >
                  Confirmar Pago
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ====================================================
          MODAL: EMITIR FACTURA
          ==================================================== */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-100 max-w-md w-full p-6 shadow-xl space-y-4"
          >
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-extrabold text-slate-800 text-lg">Emitir Factura Electrónica</h4>
              <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
            </div>

            {invoiceError && (
              <div className="p-3 bg-rose-50 text-rose-800 border border-rose-100 text-xs font-semibold rounded-lg leading-relaxed">
                {invoiceError}
              </div>
            )}

            <form onSubmit={handleCreateInvoice} className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Seleccionar Pedido *</label>
                <select 
                  value={invoiceOrderId} 
                  onChange={(e) => setInvoiceOrderId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                >
                  <option value="">-- Seleccione un Pedido --</option>
                  {orders.filter((o) => o.status_id !== 6).map((o) => (
                    <option key={o.id} value={o.id}>
                      Pedido #{o.id} - {o.client_name} (${parseFloat(o.total_price).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Tipo de Factura *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInvoiceType('consumidor_final')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                      invoiceType === 'consumidor_final' 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Consumidor Final
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceType('credito_fiscal')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                      invoiceType === 'credito_fiscal' 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Crédito Fiscal
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Descuento ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={invoiceDiscount}
                    onChange={(e) => setInvoiceDiscount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 font-semibold leading-none">Max. 15% (Admin libre)</p>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Impuestos/IVA ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={invoiceTax}
                    onChange={(e) => setInvoiceTax(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Estado de Factura</label>
                <select
                  value={invoiceStatus}
                  onChange={(e) => setInvoiceStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="emitida">Emitida</option>
                  <option value="paga">Pagada</option>
                  <option value="anulada">Anulada</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Notas / Comentarios</label>
                <textarea
                  placeholder="Notas adicionales para la factura..."
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none h-16 resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow transition"
                >
                  Emitir Factura
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* Viewer for Realistic Invoice Document */}
      {viewingInvoice && (
        <InvoiceDocument 
          invoice={viewingInvoice} 
          order={viewingOrder} 
          onClose={() => {
            setViewingInvoice(null);
            setViewingOrder(null);
          }} 
        />
      )}
    </div>
  );
}
