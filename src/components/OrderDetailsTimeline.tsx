import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Wrench, 
  FileCheck, 
  Truck, 
  ChevronDown, 
  ChevronUp, 
  DollarSign, 
  Info,
  Calendar,
  Layers,
  AlertCircle,
  Plus,
  FileText,
  Loader2,
  Check,
  Send,
  AlertTriangle
} from 'lucide-react';
import { Order, Payment, Invoice, ProductionTask } from '../types';
import { InvoiceDocument } from './InvoiceDocument';

interface OrderDetailsTimelineProps {
  order: Order;
  token: string;
  role?: string;
  onRefreshNeeded?: () => void;
}

// Client-side helper to decode JWT payload and find the user's role
const getRoleFromToken = (token: string): string => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    return decoded.role || 'cliente';
  } catch (e) {
    return 'cliente';
  }
};

export default function OrderDetailsTimeline({ order, token, role, onRefreshNeeded }: OrderDetailsTimelineProps) {
  const activeRole = role || getRoleFromToken(token);

  // Local state for fetched datasets
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [productionTasks, setProductionTasks] = useState<ProductionTask[]>([]);
  const [localOrder, setLocalOrder] = useState<Order>(order);
  
  // Loading and action state
  const [loading, setLoading] = useState(false);
  const [expandedTrack, setExpandedTrack] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  // Form states for Financial actions
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [showEmitInvoice, setShowEmitInvoice] = useState(false);
  const [invoiceType, setInvoiceType] = useState<'consumidor_final' | 'credito_fiscal'>('consumidor_final');
  const [invoiceDiscount, setInvoiceDiscount] = useState('0');
  const [invoiceTax, setInvoiceTax] = useState('0');
  const [invoiceStatus, setInvoiceStatus] = useState('emitida');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [submittingInvoice, setSubmittingInvoice] = useState(false);

  // Form states for Production Task action
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  const [updatingTaskStatusId, setUpdatingTaskStatusId] = useState<number>(3); // default completed
  const [taskComment, setTaskComment] = useState('');

  // Synchronize local order copy with parent prop updates
  useEffect(() => {
    setLocalOrder(order);
  }, [order]);

  // Expand the active phase by default based on current order status
  useEffect(() => {
    if (localOrder.status_id === 5) {
      setExpandedTrack(3); // Deliver track
    } else if (localOrder.status_id === 4) {
      setExpandedTrack(3); // Awaiting logistics
    } else if (localOrder.status_id === 3) {
      setExpandedTrack(2); // Production track
    } else {
      setExpandedTrack(1); // Payment track
    }
  }, [localOrder.status_id]);

  // Fetch real-time financials and workshop tasks
  useEffect(() => {
    fetchTimelineData();
  }, [localOrder.id, token]);

  const fetchTimelineData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [payRes, invRes, taskRes] = await Promise.all([
        fetch(`/api/payments?order_id=${localOrder.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/invoices?order_id=${localOrder.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/production/tasks?order_id=${localOrder.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const [payData, invData, taskData] = await Promise.all([
        payRes.json(), 
        invRes.json(),
        taskRes.json()
      ]);

      if (payData.success) {
        setPayments(payData.payments || []);
      }
      if (invData.success) {
        setInvoices(invData.invoices || []);
      }
      if (taskData.success) {
        setProductionTasks(taskData.tasks || []);
      }
    } catch (err) {
      console.error('Error fetching full timeline dataset:', err);
      setErrorMessage('Error al sincronizar datos financieros y de taller.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to trigger state synchronization across application tabs
  const handleDataChangeSuccess = (message: string) => {
    setSuccessMessage(message);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 5000);
    fetchTimelineData();
    if (onRefreshNeeded) {
      onRefreshNeeded();
    }
    // Also re-fetch the order details to ensure local metadata is exact
    fetch(`/api/orders/${localOrder.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.order) {
          setLocalOrder(data.order);
        }
      })
      .catch(err => console.error('Error refreshing order details:', err));
  };

  // ----------------------------------------------------
  // Financial Calculators
  // ----------------------------------------------------
  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount as any), 0);
  const remainingBalance = Math.max(0, parseFloat(localOrder.total_price as any) - totalPaid);
  const isFullyPaid = remainingBalance < 0.01;

  // ----------------------------------------------------
  // Workshop Production Calculators
  // ----------------------------------------------------
  const totalTasks = productionTasks.length;
  const completedTasks = productionTasks.filter(t => t.status_id === 3).length;
  const productionProgressPercent = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0;

  // ----------------------------------------------------
  // Form Submission Handlers
  // ----------------------------------------------------
  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('Por favor, ingrese un monto de pago válido mayor a $0.');
      return;
    }

    if (amount > remainingBalance + 0.01) {
      setErrorMessage(`El pago de $${amount.toFixed(2)} excede el saldo pendiente de $${remainingBalance.toFixed(2)}.`);
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: localOrder.id,
          amount,
          payment_method: paymentMethod,
          notes: paymentNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowAddPayment(false);
        setPaymentAmount('');
        setPaymentNotes('');
        handleDataChangeSuccess('Pago registrado exitosamente.');
      } else {
        setErrorMessage(data.message || 'Error al procesar el pago.');
      }
    } catch (err: any) {
      setErrorMessage('Error de conexión con el servidor financiero.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleEmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const discount = parseFloat(invoiceDiscount) || 0;
    const tax = parseFloat(invoiceTax) || 0;

    // Check discount role restrictions (max 15% for non-admin)
    const discountPercentage = (discount / parseFloat(localOrder.total_price as any)) * 100;
    if (discountPercentage > 15 && activeRole !== 'admin') {
      setErrorMessage(`El descuento del ${discountPercentage.toFixed(1)}% supera el límite permitido del 15% para su rol. Requiere aprobación de Administrador.`);
      return;
    }

    setSubmittingInvoice(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: localOrder.id,
          invoice_type: invoiceType,
          discount,
          tax,
          status: invoiceStatus,
          notes: invoiceNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowEmitInvoice(false);
        setInvoiceDiscount('0');
        setInvoiceTax('0');
        setInvoiceStatus('emitida');
        setInvoiceNotes('');
        handleDataChangeSuccess('Factura electrónica emitida exitosamente.');

        const invoicesRes = await fetch(`/api/invoices?order_id=${localOrder.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const invoicesData = await invoicesRes.json();
        if (invoicesData.success) {
          const latestInvoice = (invoicesData.invoices || []).find((inv: Invoice) => inv.id === data.invoiceId) || (invoicesData.invoices || [])[0] || null;
          if (latestInvoice) {
            setViewingInvoice(latestInvoice);
            setViewingOrder(localOrder);
          }
        }
      } else {
        setErrorMessage(data.message || 'Error al emitir factura.');
      }
    } catch (err) {
      setErrorMessage('Error de red al conectar con el facturador.');
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const handleViewInvoice = async (invoice: Invoice) => {
    setViewingInvoice(invoice);
    setViewingOrder(localOrder);
  };

  const handleUpdateTaskStatus = async (taskId: number) => {
    setErrorMessage(null);
    setUpdatingTaskId(taskId);
    try {
      const res = await fetch(`/api/production/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status_id: updatingTaskStatusId,
          comment: taskComment || 'Actualizado desde el panel de evolución'
        })
      });

      const data = await res.json();
      if (data.success) {
        setUpdatingTaskId(null);
        setTaskComment('');
        handleDataChangeSuccess('Estado de etapa de taller actualizado.');
      } else {
        setErrorMessage(data.message || 'Error al actualizar etapa.');
      }
    } catch (err) {
      setErrorMessage('Error al sincronizar con el taller.');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // ----------------------------------------------------
  // Order Level State Machine Transitions
  // ----------------------------------------------------
  const handleTransitionOrderStatus = async (targetStatusId: number, commentStr: string) => {
    setErrorMessage(null);
    
    // UI Validation to prevent invalid state transitions before API request
    if (targetStatusId === 3 && localOrder.status_id !== 2) {
      setErrorMessage('Error de transición: El pedido debe estar en estado "Confirmado" antes de ser ingresado a producción activa.');
      return;
    }

    if (targetStatusId === 4 && localOrder.status_id !== 3) {
      setErrorMessage('Error de transición: El pedido debe estar en estado "En Producción" antes de marcarse como "Listo para Entrega".');
      return;
    }

    // Safeguard for Outstanding Balance check in Logistics Delivery
    if (targetStatusId === 5) {
      if (remainingBalance > 0.01 && activeRole !== 'admin') {
        setErrorMessage(`ENTREGA BLOQUEADA: El pedido #${localOrder.id} tiene un saldo pendiente de $${remainingBalance.toFixed(2)}. Sólo un Administrador puede autorizar entregas con saldo activo.`);
        return;
      }
      
      if (remainingBalance > 0.01 && activeRole === 'admin') {
        const confirmWithBalance = window.confirm(`Autorización Especial de Administrador:\nEl pedido tiene un saldo pendiente de $${remainingBalance.toFixed(2)}.\n¿Desea autorizar el despacho físico y registrar la entrega?`);
        if (!confirmWithBalance) return;
      }
    }

    try {
      const res = await fetch(`/api/orders/${localOrder.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status_id: targetStatusId,
          comment: commentStr
        })
      });

      const data = await res.json();
      if (data.success) {
        handleDataChangeSuccess(`El pedido ha pasado a: ${getStatusLabel(targetStatusId)}`);
      } else {
        setErrorMessage(data.message || 'Error en la transición de estado.');
      }
    } catch (err) {
      setErrorMessage('Error de red al intentar actualizar el estado del pedido.');
    }
  };

  // Helper Labels
  const getStatusLabel = (statusId: number) => {
    switch (statusId) {
      case 1: return 'Pendiente de Confirmación';
      case 2: return 'Confirmado';
      case 3: return 'En Producción';
      case 4: return 'Listo para Entrega / QC';
      case 5: return 'Entregado';
      case 6: return 'Cancelado';
      default: return 'Desconocido';
    }
  };

  const getTaskStatusLabel = (statusId: number) => {
    switch (statusId) {
      case 1: return 'Pendiente';
      case 2: return 'En Proceso';
      case 3: return 'Completado';
      case 4: return 'Bloqueado';
      default: return 'Pendiente';
    }
  };

  const getTaskStatusBadgeClass = (statusId: number) => {
    switch (statusId) {
      case 1: return 'bg-slate-100 text-slate-600 border-slate-200';
      case 2: return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 3: return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 4: return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-200 text-slate-600';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm dark:bg-slate-800 dark:border-slate-700" id="order-details-timeline">
      
      {/* Header and Sync Metadata */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 dark:text-slate-200">
            <Clock className="h-4.5 w-4.5 text-indigo-600 animate-pulse dark:text-indigo-400" />
            Flujo de Control Operativo
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5 dark:text-slate-400">Seguimiento por bloques de pago, taller y despacho.</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
          <span className="text-[10px] font-mono font-bold bg-slate-50 px-2.5 py-1 border border-slate-200 rounded-xl text-slate-500 uppercase dark:text-slate-400 dark:bg-slate-800/50 dark:border-slate-700">
            Rol: {activeRole}
          </span>
        </div>
      </div>

      {/* Notifications Alert Block */}
      <AnimatePresence mode="wait">
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-800 text-xs font-semibold leading-normal"
          >
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-emerald-800 text-xs font-semibold leading-normal animate-pulse dark:text-emerald-300 dark:bg-emerald-900/20"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vertical Progression Tracks */}
      <div className="relative pl-7 space-y-8">
        
        {/* Long connecting track line */}
        <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-100 dark:bg-slate-800" />

        {/* ======================================================== */}
        {/* PHASE 1: FINANCIAL & PAYMENT PROGRESSION */}
        {/* ======================================================== */}
        <div className="relative">
          
          {/* Circular Step Badge Indicator */}
          <div className={`absolute -left-[28px] top-0 w-8.5 h-8.5 rounded-full border flex items-center justify-center z-10 transition-all ${
            isFullyPaid 
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' 
              : totalPaid > 0 
              ? 'bg-amber-500 border-amber-500 text-white shadow-sm animate-pulse'
              : 'bg-white border-slate-250 text-slate-400'
          }`}>
            {isFullyPaid ? <CheckCircle2 className="h-5 w-5" /> : <CreditCard className="h-4.5 w-4.5" />}
          </div>

          {/* Collapsible Card */}
          <div className="space-y-2">
            <div 
              onClick={() => setExpandedTrack(expandedTrack === 1 ? null : 1)}
              className="flex items-start justify-between cursor-pointer select-none group"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-tight group-hover:text-indigo-600 transition dark:text-slate-200">
                    Paso 1: Pago y Facturación
                  </h4>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                    isFullyPaid 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : totalPaid > 0 
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {isFullyPaid ? 'SALDADO' : totalPaid > 0 ? 'ABONADO PARCIAL' : 'PENDIENTE DE PAGO'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Control de anticipos, abonos y emisión de factura de maquila.
                </p>
              </div>
              <button className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 transition shrink-0">
                {expandedTrack === 1 ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {/* Expandable Panel */}
            {expandedTrack === 1 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pt-2"
              >
                <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 space-y-4 dark:border-slate-700 dark:bg-slate-800/50">
                  
                  {/* Ledger Board Card */}
                  <div className="grid grid-cols-3 gap-3 text-center bg-white border border-slate-200 p-3 rounded-xl shadow-2xs dark:bg-slate-800 dark:border-slate-700">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Total del Pedido</span>
                      <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                        ${parseFloat(localOrder.total_price as any).toFixed(2)}
                      </span>
                    </div>
                    <div className="border-x border-slate-100">
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Monto Pagado</span>
                      <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        ${totalPaid.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Saldo Pendiente</span>
                      <span className={`text-xs font-bold font-mono ${isFullyPaid ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ${remainingBalance.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Financial Status Transition Tools for Store Admins */}
                  {(activeRole === 'admin' || activeRole === 'tienda') && localOrder.status_id < 5 && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowAddPayment(!showAddPayment);
                          setShowEmitInvoice(false);
                        }}
                        className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[11px] font-bold px-3 py-1.5 rounded-xl transition dark:text-indigo-300 dark:bg-indigo-900/20 dark:border-indigo-800"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Registrar Abono
                      </button>
                      <button
                        onClick={() => {
                          setShowEmitInvoice(!showEmitInvoice);
                          setShowAddPayment(false);
                        }}
                        className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded-xl transition dark:text-slate-300 dark:bg-slate-800/50 dark:border-slate-700"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Emitir Factura
                      </button>
                    </div>
                  )}

                  {/* Dynamic Register Payment Drawer Form */}
                  {showAddPayment && (
                    <motion.form 
                      onSubmit={handleRegisterPayment}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border border-slate-200 p-3.5 rounded-xl space-y-3 shadow-2xs dark:bg-slate-800 dark:border-slate-700"
                    >
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                        <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1 dark:text-slate-300">
                          <Plus className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-300" />
                          Registrar Nuevo Abono Físico
                        </h5>
                        <button 
                          type="button" 
                          onClick={() => setShowAddPayment(false)}
                          className="text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-slate-400 block font-bold uppercase mb-1">Monto a Pagar ($)</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            max={remainingBalance.toFixed(2)}
                            value={paymentAmount} 
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder={`Max $${remainingBalance.toFixed(2)}`}
                            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg focus:bg-white focus:outline-indigo-500 text-slate-800 dark:text-slate-200 dark:bg-slate-800/50 dark:border-slate-700"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 block font-bold uppercase mb-1">Método de Pago</label>
                          <select 
                            value={paymentMethod} 
                            onChange={(e: any) => setPaymentMethod(e.target.value)}
                            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg focus:bg-white focus:outline-indigo-500 text-slate-800 dark:text-slate-200 dark:bg-slate-800/50 dark:border-slate-700"
                          >
                            <option value="efectivo">Efectivo</option>
                            <option value="tarjeta">Tarjeta de Crédito</option>
                            <option value="transferencia">Transferencia Bancaria</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] text-slate-400 block font-bold uppercase mb-1">Notas / Referencia</label>
                        <input 
                          type="text" 
                          value={paymentNotes} 
                          onChange={(e) => setPaymentNotes(e.target.value)}
                          placeholder="Número de transferencia, recibo manual, etc."
                          className="w-full text-xs font-medium bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg focus:bg-white focus:outline-indigo-500 text-slate-800 dark:text-slate-200 dark:bg-slate-800/50 dark:border-slate-700"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submittingPayment}
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-[11px] font-bold py-1.5 rounded-lg shadow-sm transition"
                      >
                        {submittingPayment ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        Sincronizar Pago en Base de Datos
                      </button>
                    </motion.form>
                  )}

                  {/* Dynamic Emit Invoice Drawer Form */}
                  {showEmitInvoice && (
                    <motion.form 
                      onSubmit={handleEmitInvoice}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border border-slate-200 p-3.5 rounded-xl space-y-3 shadow-2xs dark:bg-slate-800 dark:border-slate-700"
                    >
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                        <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1 dark:text-slate-300">
                          <FileText className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-300" />
                          Emitir Factura de Hacienda
                        </h5>
                        <button 
                          type="button" 
                          onClick={() => setShowEmitInvoice(false)}
                          className="text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] text-slate-400 block font-bold uppercase mb-1">Tipo de Factura</label>
                          <select 
                            value={invoiceType} 
                            onChange={(e: any) => setInvoiceType(e.target.value)}
                            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg focus:bg-white focus:outline-indigo-500 text-slate-800 dark:text-slate-200 dark:bg-slate-800/50 dark:border-slate-700"
                          >
                            <option value="consumidor_final">Consumidor Final</option>
                            <option value="credito_fiscal">Crédito Fiscal</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 block font-bold uppercase mb-1">Descuento ($)</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            value={invoiceDiscount} 
                            onChange={(e) => setInvoiceDiscount(e.target.value)}
                            placeholder="0.00"
                            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg focus:bg-white text-slate-800 dark:text-slate-200 dark:bg-slate-800/50 dark:border-slate-700"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 block font-bold uppercase mb-1">Impuesto (IVA $)</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            value={invoiceTax} 
                            onChange={(e) => setInvoiceTax(e.target.value)}
                            placeholder="0.00"
                            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg focus:bg-white text-slate-800 dark:text-slate-200 dark:bg-slate-800/50 dark:border-slate-700"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-slate-400 block font-bold uppercase mb-1">Estado de Factura</label>
                          <select 
                            value={invoiceStatus} 
                            onChange={(e: any) => setInvoiceStatus(e.target.value)}
                            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg focus:bg-white focus:outline-indigo-500 text-slate-800 dark:text-slate-200 dark:bg-slate-800/50 dark:border-slate-700"
                          >
                            <option value="emitida">Emitida</option>
                            <option value="paga">Pagada</option>
                            <option value="anulada">Anulada</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 block font-bold uppercase mb-1">Notas / Comentarios</label>
                          <input 
                            type="text" 
                            value={invoiceNotes} 
                            onChange={(e) => setInvoiceNotes(e.target.value)}
                            placeholder="Notas opcionales..."
                            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg focus:bg-white text-slate-800 dark:text-slate-200 dark:bg-slate-800/50 dark:border-slate-700"
                          />
                        </div>
                      </div>

                      {activeRole !== 'admin' && (
                        <p className="text-[9px] text-amber-600 font-medium dark:text-amber-400">
                          💡 Nota: Descuentos mayores al 15% del total del pedido requieren rol de Administrador.
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={submittingInvoice}
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-500 text-white text-[11px] font-bold py-1.5 rounded-lg shadow-sm transition"
                      >
                        {submittingInvoice ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Sellar Factura en Hacienda
                      </button>
                    </motion.form>
                  )}

                  {/* Payments Ledger Section */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-slate-400 block font-extrabold uppercase tracking-wider">Historial de Flujos</span>
                    {payments.length > 0 ? (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {payments.map((p) => (
                          <div key={p.id} className="flex justify-between items-center text-[10px] bg-white border border-slate-200 rounded-lg p-2 dark:bg-slate-800 dark:border-slate-700">
                            <div>
                              <strong className="text-slate-800 block dark:text-slate-200">${parseFloat(p.amount as any).toFixed(2)}</strong>
                              <span className="text-[9px] text-slate-400 font-mono capitalize">{p.payment_method} | {new Date(p.created_at).toLocaleDateString()}</span>
                            </div>
                            <span className="text-[10px] bg-slate-50 px-2 py-0.5 border border-slate-200 rounded-lg text-slate-500 font-semibold max-w-[120px] truncate dark:text-slate-400 dark:bg-slate-800/50 dark:border-slate-700">
                              {p.registered_by_name || 'Sistema'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">No hay abonos registrados para este pedido.</p>
                    )}
                  </div>

                  {/* Issued Invoices Section */}
                  <div className="space-y-1.5 border-t border-slate-200 pt-3 dark:border-slate-700">
                    <span className="text-[9px] text-slate-400 block font-extrabold uppercase tracking-wider">Inmuebles y Facturación Emitida</span>
                    {invoices.length > 0 ? (
                      <div className="space-y-1">
                        {invoices.map((inv) => (
                          <div key={inv.id} className="flex justify-between items-center gap-2 text-[10px] bg-indigo-50/40 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-800">
                            <div>
                              <strong className="text-indigo-900 block font-mono font-bold dark:text-indigo-100">{inv.invoice_number}</strong>
                              <span className="text-[9px] text-indigo-700 capitalize font-medium dark:text-indigo-300">Tipo: {inv.invoice_type.replace('_', ' ')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-indigo-900 font-mono text-xs dark:text-indigo-100">
                                ${parseFloat(inv.total as any).toFixed(2)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleViewInvoice(inv)}
                                className="rounded-md border border-indigo-200 bg-white px-2 py-1 text-[9px] font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:text-indigo-300 dark:bg-slate-800 dark:border-indigo-800"
                              >
                                Ver Factura
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">No hay facturación electrónica registrada para este pedido.</p>
                    )}
                  </div>

                </div>
              </motion.div>
            )}
          </div>
        </div>

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

        {/* ======================================================== */}
        {/* PHASE 2: WORKSHOP PRODUCTION PROGRESSION */}
        {/* ======================================================== */}
        <div className="relative">
          
          {/* Circular Step Badge Indicator */}
          <div className={`absolute -left-[28px] top-0 w-8.5 h-8.5 rounded-full border flex items-center justify-center z-10 transition-all ${
            localOrder.status_id >= 4 
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' 
              : localOrder.status_id === 3 
              ? 'bg-purple-600 border-purple-600 text-white shadow-sm ring-4 ring-purple-50 animate-pulse'
              : 'bg-white border-slate-250 text-slate-400'
          }`}>
            {localOrder.status_id >= 4 ? <CheckCircle2 className="h-5 w-5" /> : <Wrench className="h-4.5 w-4.5" />}
          </div>

          {/* Collapsible Card */}
          <div className="space-y-2">
            <div 
              onClick={() => setExpandedTrack(expandedTrack === 2 ? null : 2)}
              className="flex items-start justify-between cursor-pointer select-none group"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-tight group-hover:text-indigo-600 transition dark:text-slate-200">
                    Paso 2: Avance de Confección en Taller
                  </h4>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                    localOrder.status_id >= 4 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : localOrder.status_id === 3 
                      ? 'bg-purple-50 text-purple-700 border-purple-200 animate-pulse'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {localOrder.status_id >= 4 ? 'COMPLETADO' : localOrder.status_id === 3 ? 'EN TALLER ACTIVO' : 'EN COLA DE CORTE'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sincronización del taller físico y control de las 10 etapas de maquila.
                  </p>
                  {localOrder.status_id === 3 && (
                    <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      ({productionProgressPercent}% completado)
                    </span>
                  )}
                </div>
              </div>
              <button className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 transition shrink-0">
                {expandedTrack === 2 ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {/* Expandable Panel */}
            {expandedTrack === 2 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pt-2"
              >
                <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 space-y-4 dark:border-slate-700 dark:bg-slate-800/50">
                  
                  {/* Progress Indicator for Active Confection */}
                  {localOrder.status_id === 3 && (
                    <div className="space-y-1.5 bg-white border border-slate-200 p-3 rounded-xl shadow-2xs dark:bg-slate-800 dark:border-slate-700">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-500 uppercase dark:text-slate-400">Progreso del Lote de Confección</span>
                        <span className="text-indigo-600 font-mono font-bold dark:text-indigo-400">{completedTasks}/{totalTasks} Tareas Completadas</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 dark:bg-slate-800">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${productionProgressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Transition Controller Actions (State Machine Enforcement) */}
                  {(activeRole === 'admin' || activeRole === 'tienda') && (
                    <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs space-y-2 dark:bg-slate-800 dark:border-slate-700">
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Estado Maestro del Pedido</span>
                      
                      {localOrder.status_id === 1 && (
                        <div className="space-y-2">
                          <p className="text-[10px] text-slate-500 leading-normal dark:text-slate-400">
                            ⚠️ Este pedido se encuentra como <strong>Pendiente de Confirmación</strong>. No se permite iniciar la línea de producción hasta que se confirme oficialmente.
                          </p>
                          <button
                            onClick={() => handleTransitionOrderStatus(2, 'Pedido confirmado y autorizado para programar taller.')}
                            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Confirmar Pedido (Autorizar Taller)
                          </button>
                        </div>
                      )}

                      {localOrder.status_id === 2 && (
                        <div className="space-y-2">
                          <p className="text-[10px] text-slate-500 leading-normal dark:text-slate-400">
                            El pedido ha sido <strong>Confirmado</strong>. El taller ya puede iniciar el corte físico de telas y confección.
                          </p>
                          <button
                            onClick={() => handleTransitionOrderStatus(3, 'Producción iniciada formalmente en línea de confección.')}
                            className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition"
                          >
                            <Wrench className="h-3.5 w-3.5" />
                            Ingresar Pedido a Producción Activa
                          </button>
                        </div>
                      )}

                      {localOrder.status_id === 3 && (
                        <div className="space-y-2">
                          <p className="text-[10px] text-slate-500 leading-normal dark:text-slate-400">
                            El pedido se encuentra en <strong>Producción Activa</strong>. Al terminar el lote y pasar control de calidad, márquelo como listo.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleTransitionOrderStatus(4, 'Lote terminado en taller físico y empacado para despacho.')}
                              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition"
                            >
                              <FileCheck className="h-3.5 w-3.5" />
                              Marcar como Listo para Entrega (QC OK)
                            </button>
                          </div>
                        </div>
                      )}

                      {localOrder.status_id >= 4 && (
                        <p className="text-[10px] text-emerald-700 font-medium leading-normal flex items-center gap-1 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 dark:text-emerald-400" />
                          El pedido ya completó su fase de confección.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Interactive Workshop Tasks List */}
                  <div className="space-y-2">
                    <span className="text-[9px] text-slate-400 block font-extrabold uppercase tracking-wider">Flujo Secuencial de las 10 Etapas</span>
                    {productionTasks.length > 0 ? (
                      <div className="space-y-1.5">
                        {productionTasks.map((task) => {
                          const isUpdating = updatingTaskId === task.id;
                          return (
                            <div 
                              key={task.id} 
                              className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[11px] dark:bg-slate-800 dark:border-slate-700"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <strong className="text-slate-800 font-bold dark:text-slate-200">
                                    {task.stage_id}. {task.stage_name}
                                  </strong>
                                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${getTaskStatusBadgeClass(task.status_id)}`}>
                                    {getTaskStatusLabel(task.status_id)}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-2 gap-y-0.5 font-medium">
                                  <span>Asignado: {task.assigned_name || 'Sin Asignar'}</span>
                                  {task.start_date && <span>• Fecha: {task.start_date}</span>}
                                  {task.end_date_actual && <span>• Realizado: {task.end_date_actual}</span>}
                                </div>
                              </div>

                              {/* Interactive Workshop controls for Taller/Admin */}
                              {(activeRole === 'admin' || activeRole === 'taller') && localOrder.status_id === 3 && (
                                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto border-t sm:border-t-0 pt-2 sm:pt-0">
                                  {isUpdating ? (
                                    <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700">
                                      <select
                                        value={updatingTaskStatusId}
                                        onChange={(e) => setUpdatingTaskStatusId(parseInt(e.target.value, 10))}
                                        className="text-[10px] font-bold bg-white border border-slate-200 rounded px-1.5 py-0.5 dark:bg-slate-800 dark:border-slate-700"
                                      >
                                        <option value={1}>Pendiente</option>
                                        <option value={2}>En Proceso</option>
                                        <option value={3}>Completado</option>
                                        <option value={4}>Bloqueado</option>
                                      </select>
                                      <button
                                        onClick={() => handleUpdateTaskStatus(task.id)}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold px-2 py-0.5 rounded"
                                      >
                                        Sellar
                                      </button>
                                      <button
                                        onClick={() => setUpdatingTaskId(null)}
                                        className="text-slate-400 hover:text-slate-600 text-[9px]"
                                      >
                                        X
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setUpdatingTaskId(task.id);
                                        setUpdatingTaskStatusId(task.status_id);
                                      }}
                                      className="inline-flex items-center gap-1 border border-slate-200 hover:bg-slate-50 text-[10px] font-bold px-2.5 py-1 rounded-lg text-slate-600 transition dark:text-slate-400 dark:border-slate-700"
                                    >
                                      Cambiar Estado
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 bg-white border border-slate-200 rounded-xl text-center text-slate-400 text-[11px] dark:bg-slate-800 dark:border-slate-700">
                        {localOrder.status_id < 3 
                          ? 'Las tareas de confección aparecerán cuando el pedido ingrese a Producción Activa.'
                          : 'No se encontraron las tareas de taller programadas.'}
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* PHASE 3: LOGISTICS & DELIVERY PROGRESSION */}
        {/* ======================================================== */}
        <div className="relative">
          
          {/* Circular Step Badge Indicator */}
          <div className={`absolute -left-[28px] top-0 w-8.5 h-8.5 rounded-full border flex items-center justify-center z-10 transition-all ${
            localOrder.status_id === 5 
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' 
              : localOrder.status_id === 4 
              ? 'bg-amber-500 border-amber-500 text-white shadow-sm ring-4 ring-amber-50 animate-pulse'
              : 'bg-white border-slate-250 text-slate-400'
          }`}>
            {localOrder.status_id === 5 ? <CheckCircle2 className="h-5 w-5" /> : <Truck className="h-4.5 w-4.5" />}
          </div>

          {/* Collapsible Card */}
          <div className="space-y-2">
            <div 
              onClick={() => setExpandedTrack(expandedTrack === 3 ? null : 3)}
              className="flex items-start justify-between cursor-pointer select-none group"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-tight group-hover:text-indigo-600 transition dark:text-slate-200">
                    Paso 3: Logística y Despacho
                  </h4>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                    localOrder.status_id === 5 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : localOrder.status_id === 4 
                      ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {localOrder.status_id === 5 ? 'ENTREGADO' : localOrder.status_id === 4 ? 'APTO PARA ENTREGA' : 'NO DISPONIBLE'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Despacho físico y validación financiera antes de liberar las prendas.
                </p>
              </div>
              <button className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 transition shrink-0">
                {expandedTrack === 3 ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {/* Expandable Panel */}
            {expandedTrack === 3 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pt-2"
              >
                <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 space-y-4 dark:border-slate-700 dark:bg-slate-800/50">
                  
                  {/* Delivery Schedule Info Card */}
                  <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs space-y-2 text-[11px] dark:bg-slate-800 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-indigo-500 shrink-0 dark:text-indigo-300" />
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold uppercase">Fecha Estimada de Despacho</span>
                        <strong className="text-slate-800 font-semibold dark:text-slate-200">{localOrder.estimated_delivery_date}</strong>
                      </div>
                    </div>
                    {localOrder.notes && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[9px] text-slate-400 block font-bold uppercase">Notas / Dirección de Envío</span>
                        <p className="text-slate-600 italic bg-slate-50 p-2 rounded-lg mt-1 font-medium border border-slate-100 dark:text-slate-400 dark:bg-slate-800/50">
                          "{localOrder.notes}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Delivery Status Details */}
                  {localOrder.status_id === 5 ? (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold leading-relaxed flex items-center gap-2 dark:text-emerald-300 dark:bg-emerald-900/20">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 dark:text-emerald-400" />
                      <span>✓ Pedido completamente entregado y despachado físicamente al cliente.</span>
                    </div>
                  ) : localOrder.status_id === 4 ? (
                    <div className="space-y-3">
                      
                      {/* Financial control guard alert */}
                      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-950 rounded-xl text-[11px] leading-relaxed space-y-1 dark:bg-amber-900/20">
                        <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>Gobernanza Financiera Activa</span>
                        </div>
                        <p className="font-medium">
                          Para registrar la entrega, la orden debe estar completamente pagada ($0.00 de saldo pendiente). 
                          Solo los administradores de la empresa pueden autorizar la entrega de pedidos con saldo pendiente de pago.
                        </p>
                      </div>

                      {/* Outstanding Balance Alert Block */}
                      {remainingBalance > 0.01 && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-rose-700">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>ENTREGA BLOQUEADA PARA TIENDAS</span>
                          </div>
                          <p className="font-medium leading-normal">
                            Saldo activo de <strong className="font-mono font-bold">${remainingBalance.toFixed(2)}</strong>. 
                            {activeRole === 'admin' 
                              ? ' Como Administrador, tiene autorización para omitir y forzar el despacho con saldo.' 
                              : ' Por favor, registre el abono faltante o solicite autorización a un Administrador.'}
                          </p>
                        </div>
                      )}

                      {/* Manual Register Delivery trigger button */}
                      {(activeRole === 'admin' || activeRole === 'tienda') && (
                        <button
                          onClick={() => handleTransitionOrderStatus(5, 'Despacho físico finalizado exitosamente.')}
                          disabled={remainingBalance > 0.01 && activeRole !== 'admin'}
                          className={`w-full inline-flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl shadow-md transition ${
                            remainingBalance > 0.01 && activeRole !== 'admin'
                              ? 'bg-slate-200 border border-slate-300 text-slate-400 cursor-not-allowed shadow-none'
                              : remainingBalance > 0.01
                              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-100'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100'
                          }`}
                        >
                          <Truck className="h-4 w-4" />
                          {remainingBalance > 0.01 && activeRole === 'admin' 
                            ? 'Autorizar Entrega con Saldo Pendiente (Forzar)' 
                            : 'Registrar Entrega de Confección'}
                        </button>
                      )}

                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 text-slate-500 text-xs rounded-xl italic dark:text-slate-400 dark:bg-slate-800/50 dark:border-slate-700">
                      La sección de logística se activará una vez que el taller complete el 100% de la confección de prendas.
                    </div>
                  )}

                </div>
              </motion.div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
