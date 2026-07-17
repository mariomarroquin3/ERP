import React, { useState, useEffect } from 'react';
import { 
  Trello, 
  Calendar as CalendarIcon, 
  User as UserIcon, 
  CheckSquare, 
  ExternalLink, 
  Layers, 
  Clock, 
  Check, 
  ChevronRight, 
  ShieldCheck, 
  Eye, 
  X,
  FileImage,
  Tag,
  AlertTriangle,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductionTask, Order, User } from '../types';
import { toast } from 'sonner';

interface KanbanBoardProps {
  token: string;
  user: User;
}

const formatSimpleDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  
  if (dateStr.length <= 10) {
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) return `${day}/${month}/${year}`;
  }
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; 
  
  return `${day}/${month}/${year} ${hours}:${minutes}${ampm}`;
};

export default function KanbanBoard({ token, user }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'active' | 'scheduled'>('active');
  const [loading, setLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);
  
  // Specs viewer modal state
  const [selectedTaskSpec, setSelectedTaskSpec] = useState<ProductionTask | null>(null);
  const [loadingSpec, setLoadingSpec] = useState(false);
  const [detailedOrderSpec, setDetailedOrderSpec] = useState<Order | null>(null);
  const [reworkHistory, setReworkHistory] = useState<any[]>([]);

  // Status Comment modal
  const [commentingTask, setCommentingTask] = useState<ProductionTask | null>(null);
  const [newStatusId, setNewStatusId] = useState<number>(3); // default completado
  const [statusComment, setStatusComment] = useState('');

  // Advance stage modal state
  const [advancingTask, setAdvancingTask] = useState<ProductionTask | null>(null);
  const [advanceComment, setAdvanceComment] = useState('');
  const [advanceSubmitting, setAdvanceSubmitting] = useState(false);

  // Order Timeline inside Card
  const [expandedTimelineTaskId, setExpandedTimelineTaskId] = useState<number | null>(null);
  const [timelineTasks, setTimelineTasks] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const toggleTimeline = async (taskId: number, orderId: number) => {
    if (expandedTimelineTaskId === taskId) {
      setExpandedTimelineTaskId(null);
      return;
    }
    setExpandedTimelineTaskId(taskId);
    setLoadingTimeline(true);
    try {
      const res = await fetch(`/api/production/tasks?order_id=${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTimelineTasks(data.tasks || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  // Rework modal state
  const [reworkTask, setReworkTask] = useState<ProductionTask | null>(null);
  const [reworkType, setReworkType] = useState<'arreglo' | 'hacer_de_nuevo'>('arreglo');
  const [reworkDescription, setReworkDescription] = useState('');
  const [targetStageId, setTargetStageId] = useState<number>(1); // default Corte (1)
  const [reworkSubmitting, setReworkSubmitting] = useState(false);

  // Validación de estado del pedido antes de avanzar
  const validateProductionStatus = (task: ProductionTask) => {
    if (task.order_status_id !== 3) {
      toast.error('El pedido no está en producción', {
        description: 'Solo puedes iniciar procesos o confirmar avances cuando el pedido esté en estado EN PRODUCCIÓN.',
        duration: 4000,
      });
      return false;
    }
    return true;
  };

  // Función específica para abrir el modal de avanzar etapa
  const handleOpenAdvanceModal = (task: ProductionTask) => {
    // Validamos antes de abrir el modal
    if (validateProductionStatus(task)) {
      setAdvancingTask(task);
    }
  };

  const handleAdvanceStage = async () => {
    if (!advancingTask) return;

    setAdvanceSubmitting(true);
    try {
      const res = await fetch(`/api/production/tasks/${advancingTask.id}/advance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          comment: advanceComment || 'Fase completada y avanzada por supervisor'
        })
      });

      const data = await res.json();

      if (data.success) {
        setAdvancingTask(null);
        setAdvanceComment('');
        fetchTasks();
      } else {
        alert(`Error al avanzar etapa: ${data.message}`);
      }
    } catch (err) {
      console.error('Error advancing stage:', err);
    } finally {
      setAdvanceSubmitting(false);
    }
  };

  const handleReworkSubmit = async () => {
    if (!reworkTask) return;
    if (!reworkDescription.trim()) {
      alert('Por favor describe las instrucciones o motivo del retrabajo');
      return;
    }
    setReworkSubmitting(true);
    try {
      const res = await fetch(`/api/production/tasks/${reworkTask.id}/rework`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rework_type: reworkType,
          description: reworkDescription,
          target_stage_id: reworkType === 'hacer_de_nuevo' ? targetStageId : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setReworkTask(null);
        setReworkDescription('');
        setReworkType('arreglo');
        setTargetStageId(1);
        fetchTasks();
      } else {
        alert(`Error al registrar retrabajo: ${data.message}`);
      }
    } catch (err) {
      console.error('Error in rework request:', err);
    } finally {
      setReworkSubmitting(false);
    }
  };

  // Tabs & Approvals state
  const [activeTab, setActiveTab] = useState<'kanban' | 'approvals'>('kanban');
  const [pendingReviewTasks, setPendingReviewTasks] = useState<any[]>([]);
  const [loadingPendingReview, setLoadingPendingReview] = useState(false);
  const [selectedReviewTaskIds, setSelectedReviewTaskIds] = useState<number[]>([]);
  const [bulkApproving, setBulkApproving] = useState(false);

  const fetchPendingReviewTasks = async () => {
    setLoadingPendingReview(true);
    try {
      const res = await fetch('/api/production/tasks/pending-review', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPendingReviewTasks(data.tasks);
        setSelectedReviewTaskIds([]);
      }
    } catch (err) {
      console.error('Error fetching pending review tasks:', err);
    } finally {
      setLoadingPendingReview(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedReviewTaskIds.length === 0) return;
    setBulkApproving(true);
    try {
      const res = await fetch('/api/production/tasks/bulk-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          task_ids: selectedReviewTaskIds,
          comment: 'Validado y aprobado masivamente por supervisor de taller'
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`${selectedReviewTaskIds.length} tareas aprobadas y completadas exitosamente.`);
        fetchPendingReviewTasks();
        fetchTasks();
      } else {
        alert(`Error al realizar aprobación masiva: ${data.message}`);
      }
    } catch (err) {
      console.error('Error in bulk approval:', err);
    } finally {
      setBulkApproving(false);
    }
  };

  const handleApproveSingle = async (taskId: number) => {
    setStatusUpdating(taskId);
    try {
      const res = await fetch(`/api/production/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status_id: 3,
          comment: 'Trabajo validado y aprobado por supervisor con un clic'
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchPendingReviewTasks();
        fetchTasks();
      } else {
        alert(`Error al aprobar tarea: ${data.message}`);
      }
    } catch (err) {
      console.error('Error in single task approval:', err);
    } finally {
      setStatusUpdating(null);
    }
  };

  useEffect(() => {
    fetchTasks();
    if (user.role === 'admin' || user.role === 'taller') {
      fetchPendingReviewTasks();
    }
  }, [selectedDate, viewMode]);

  useEffect(() => {
    if (activeTab === 'approvals' && (user.role === 'admin' || user.role === 'taller')) {
      fetchPendingReviewTasks();
    }
  }, [activeTab]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const url = viewMode === 'active' 
        ? '/api/production/tasks/active' 
        : `/api/production/tasks?date=${selectedDate}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const openSpecViewer = async (task: ProductionTask) => {
    setSelectedTaskSpec(task);
    setLoadingSpec(true);
    setReworkHistory([]);
    try {
      const res = await fetch(`/api/orders/${task.order_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDetailedOrderSpec(data.order);
      }

      const rwRes = await fetch(`/api/production/orders/${task.order_id}/rework`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const rwData = await rwRes.json();
      if (rwData.success) {
        setReworkHistory(rwData.reworkEvents || []);
      }
    } catch (err) {
      console.error('Error fetching order spec:', err);
    } finally {
      setLoadingSpec(false);
    }
  };

  const closeSpecViewer = () => {
    setSelectedTaskSpec(null);
    setDetailedOrderSpec(null);
    setReworkHistory([]);
  };

  const promptStatusChange = (task: ProductionTask, targetStatusId: number) => {
    // Validar si es "Iniciar Proceso" (estado 2)
    if (targetStatusId === 2 && !validateProductionStatus(task)) {
      return;
    }

    setCommentingTask(task);
    setNewStatusId(targetStatusId);
    setStatusComment('');
  };

  const handleUpdateStatus = async () => {
    if (!commentingTask) return;
    const taskId = commentingTask.id;
    setStatusUpdating(taskId);
    setCommentingTask(null);

    const defaultComment = newStatusId === 3 
      ? 'Aprobado y completado en el taller' 
      : newStatusId === 5 
      ? 'Trabajo físico terminado, listo para revisión (READY_FOR_REVIEW)' 
      : 'Iniciado proceso en taller';

    try {
      const res = await fetch(`/api/production/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status_id: newStatusId,
          comment: statusComment || defaultComment
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchTasks();
        if (user.role === 'admin' || user.role === 'taller') {
          fetchPendingReviewTasks();
        }
      } else {
        alert(`Error al actualizar estado: ${data.message}`);
      }
    } catch (err) {
      console.error('Error updating task:', err);
    } finally {
      setStatusUpdating(null);
    }
  };

  // Stage Categories
  const stages = [
    { id: 1, name: 'Corte', color: 'border-t-sky-500 text-sky-700 bg-sky-50/20' },
    { id: 2, name: 'Estampado', color: 'border-t-orange-500 text-orange-700 bg-orange-50/20' },
    { id: 3, name: 'Confeccionado', color: 'border-t-purple-500 text-purple-700 bg-purple-50/20' },
    { id: 4, name: 'Acabado', color: 'border-t-indigo-500 text-indigo-700 bg-indigo-50/20' },
    { id: 5, name: 'Revisado', color: 'border-t-amber-500 text-amber-700 bg-amber-50/20' },
    { id: 6, name: 'Bordado', color: 'border-t-pink-500 text-pink-700 bg-pink-50/20' },
    { id: 7, name: 'Planchado', color: 'border-t-rose-500 text-rose-700 bg-rose-50/20' },
    { id: 8, name: 'Empaquetado', color: 'border-t-teal-500 text-teal-700 bg-teal-50/20' },
    { id: 9, name: 'Recibido en Tienda', color: 'border-t-blue-500 text-blue-700 bg-blue-50/20' },
    { id: 10, name: 'Despachado', color: 'border-t-emerald-500 text-emerald-700 bg-emerald-50/20' }
  ];

  const getStatusLabel = (statusId: number) => {
    switch (statusId) {
      case 1: return 'Pendiente';
      case 2: return 'En Proceso';
      case 3: return 'Completado';
      case 4: return 'Bloqueado';
      case 5: return 'Listo para Revisión';
      default: return 'Pendiente';
    }
  };

  const getStatusBadgeColor = (statusId: number) => {
    switch (statusId) {
      case 1: return 'bg-slate-100 text-slate-700';
      case 2: return 'bg-blue-50 text-blue-700 border border-blue-100';
      case 3: return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 4: return 'bg-rose-50 text-rose-700 border border-rose-100';
      case 5: return 'bg-amber-50 text-amber-700 border border-amber-100';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Trello className="h-6 w-6 text-indigo-600" />
            Tablero Kanban de Producción
          </h2>
          <p className="text-slate-500 text-sm">
            {viewMode === 'active' 
              ? 'Monitoreo en tiempo real del taller operativo — mostrando la etapa activa de cada lote.' 
              : `Calendario de planificación — mostrando tareas programadas para el inicio de la producción.`}
          </p>
        </div>

        {/* View Mode & Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Mode Switcher Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-2xs">
            <button
              onClick={() => setViewMode('active')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'active'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tablero Operativo (Activo)
            </button>
            <button
              onClick={() => setViewMode('scheduled')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'scheduled'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Calendario Planificado
            </button>
          </div>

          {/* Active Mode Status Badge */}
          {viewMode === 'active' ? (
            <div className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Taller Activo</span>
            </div>
          ) : (
            /* Date Filter for Scheduled Mode */
            <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-slate-250 shadow-2xs">
              <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="text-xs font-bold text-slate-500 uppercase">Fecha:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-bold font-mono text-indigo-600 focus:outline-none bg-transparent"
              />
            </div>
          )}
        </div>
      </div>

      {/* Tabs Switcher for Supervisor/Admin */}
      {(user.role === 'admin' || user.role === 'taller') && (
        <div className="flex border-b border-slate-200 gap-1.5">
          <button
            onClick={() => setActiveTab('kanban')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all ${
              activeTab === 'kanban'
                ? 'bg-white border-slate-200 text-indigo-600 border-b-white translate-y-[1px] z-10'
                : 'bg-slate-50/50 border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            Tablero Kanban (Todas las Etapas)
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all flex items-center gap-1.5 ${
              activeTab === 'approvals'
                ? 'bg-white border-slate-200 text-indigo-600 border-b-white translate-y-[1px] z-10'
                : 'bg-slate-50/50 border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
            <span>Control de Calidad (Acción Requerida)</span>
            {pendingReviewTasks.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
                {pendingReviewTasks.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'approvals' && (user.role === 'admin' || user.role === 'taller') ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-500" />
                Lotes Pendientes de Validación de Calidad
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Valide físicamente o mediante fotos el trabajo de los operarios antes de pasarlo a la siguiente etapa de producción.
              </p>
            </div>

            {selectedReviewTaskIds.length > 0 && (
              <button
                onClick={handleBulkApprove}
                disabled={bulkApproving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {bulkApproving ? (
                  <Clock className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Aprobar {selectedReviewTaskIds.length} Lotes Seleccionados
              </button>
            )}
          </div>

          {loadingPendingReview ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Clock className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
              <span className="text-xs font-semibold">Cargando cola de revisión...</span>
            </div>
          ) : pendingReviewTasks.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-150 rounded-2xl bg-slate-50/50">
              <ShieldCheck className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">¡Todo al día!</p>
              <p className="text-xs text-slate-500 mt-1">No hay lotes en "Listo para Revisión" esperando validación en este momento.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-150">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase font-black text-[9px] tracking-wider border-b border-slate-150">
                    <th className="py-3 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={selectedReviewTaskIds.length === pendingReviewTasks.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedReviewTaskIds(pendingReviewTasks.map((t) => t.id));
                          } else {
                            setSelectedReviewTaskIds([]);
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                    </th>
                    <th className="py-3 px-4 w-20">ID Tarea</th>
                    <th className="py-3 px-4">Lote / Producto</th>
                    <th className="py-3 px-4">Etapa</th>
                    <th className="py-3 px-4 text-center">Cantidad</th>
                    <th className="py-3 px-4">Prioridad</th>
                    <th className="py-3 px-4">Fecha Entrega</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 bg-white">
                  {pendingReviewTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/40 transition">
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedReviewTaskIds.includes(task.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedReviewTaskIds([...selectedReviewTaskIds, task.id]);
                            } else {
                              setSelectedReviewTaskIds(selectedReviewTaskIds.filter((id) => id !== task.id));
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500">#{task.id}</td>
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-extrabold text-slate-800 leading-tight text-xs">{task.product_name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Cliente: <span className="font-semibold text-slate-700">{task.client_name}</span> | Orden #{task.order_id}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md uppercase tracking-wide text-[9px]">
                          {task.stage_name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold font-mono text-slate-700">{task.workload_points} uds</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          task.order_priority === 'urgent'
                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                            : task.order_priority === 'high'
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : task.order_priority === 'medium'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'bg-slate-50 text-slate-700 border border-slate-100'
                        }`}>
                          {task.order_priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold font-mono text-slate-600">{task.order_delivery_date}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openSpecViewer(task)}
                            className="bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-600 p-1.5 rounded-lg transition"
                            title="Ver Ficha Técnica"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleApproveSingle(task.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-2xs transition inline-flex items-center gap-1"
                            title="Aprobar y Completar"
                          >
                            <Check className="h-3 w-3" />
                            <span>Aprobar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Horizontal scrollable columns for 10 stages */
        loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Clock className="h-10 w-10 animate-spin text-indigo-600 mb-2" />
            <span className="text-sm font-medium">Sincronizando tareas con el taller...</span>
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-4 pb-6 w-full snap-x scrollbar-thin">
            {stages.map((stage) => {
              const stageTasks = tasks.filter((t) => t.stage_id === stage.id);
              return (
                <div 
                  key={stage.id} 
                  className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 flex flex-col min-h-[550px] shrink-0 w-72 snap-start shadow-xs"
                >
                  {/* Column Header */}
                  <div className={`p-3 rounded-xl border-t-4 ${stage.color} mb-3 shadow-xs`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-wider">{stage.name}</span>
                      <span className="text-[10px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                        {stageTasks.length}
                      </span>
                    </div>
                  </div>

                  {/* Column Tasks List */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {stageTasks.length === 0 ? (
                      <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Sin tareas asignadas</span>
                      </div>
                    ) : (
                      stageTasks.map((task) => (
                        <div 
                          key={task.id} 
                          className="bg-white border border-slate-150 rounded-xl p-4.5 hover:border-indigo-200 transition relative group shadow-xs hover:shadow-sm"
                        >
                          {/* Task Priority Accent */}
                          <div className="absolute top-0 inset-x-0 h-1 rounded-t-xl bg-indigo-500/10 group-hover:bg-indigo-500 transition" />

                          {/* Task Body */}
                          <div className="space-y-3.5">
                            <div className="flex justify-between items-start gap-1 flex-wrap">
                              <div className="flex gap-1.5 items-center flex-wrap">
                                <span className="text-[10px] font-extrabold text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">TASK #{task.id}</span>
                                <span className="text-[10px] font-extrabold text-indigo-600 font-mono bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">PEDIDO #{task.order_id}</span>
                                {task.task_type && task.task_type !== 'normal' && (
                                  <span className={`px-1.5 py-0.5 text-[8px] font-extrabold rounded-md uppercase border ${
                                    task.task_type === 'repair'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}>
                                    {task.task_type === 'repair' ? 'Reparo' : 'Rehecho'}
                                  </span>
                                )}
                              </div>
                              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${getStatusBadgeColor(task.status_id)}`}>
                                {getStatusLabel(task.status_id)}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-xs font-bold text-slate-800 leading-tight mb-0.5">{task.product_name}</h4>
                              <span className="text-[10px] text-slate-400 block font-medium">Cliente: <strong className="text-slate-600">{task.client_name}</strong></span>
                            </div>

                            {/* Workload */}
                            <div className="flex items-center justify-between text-[10px] bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 text-slate-500">
                              <span className="font-semibold">Lote a Producir:</span>
                              <span className="font-bold font-mono text-indigo-700">{task.workload_points} uds</span>
                            </div>

                            {/* Quick Actions Footer */}
                            <div className="flex gap-1.5 pt-2 border-t border-slate-100 flex-wrap">
                              <button
                                onClick={() => openSpecViewer(task)}
                                className="grow inline-flex items-center justify-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-semibold py-1.5 px-2 rounded-lg transition"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Ficha
                              </button>

                              <button
                                onClick={() => toggleTimeline(task.id, task.order_id)}
                                className="grow inline-flex items-center justify-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-semibold py-1.5 px-2 rounded-lg transition"
                                title="Ver Fases del Pedido"
                              >
                                <Layers className="h-3.5 w-3.5" />
                                Fases
                              </button>

                              {(user.role === 'admin' || user.role === 'taller') && (
                                <>
                                  {/* Advance to next stage button */}
                                  {task.stage_id < 10 && (
                                    <button
                                      onClick={() => handleOpenAdvanceModal(task)}
                                      className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold py-1.5 px-2 rounded-lg transition gap-0.5"
                                      title="Avanzar de Etapa (Completar esta y pasar a la siguiente)"
                                    >
                                      <span>Avanzar</span>
                                      <ChevronRight className="h-3 w-3" />
                                    </button>
                                  )}

                                  {/* Rework / Retrabajo button */}
                                  <button
                                    onClick={() => {
                                      setReworkTask(task);
                                      setReworkType('arreglo');
                                      setTargetStageId(1);
                                      setReworkDescription('');
                                    }}
                                    className="inline-flex items-center justify-center bg-amber-500 hover:bg-amber-600 text-white p-1.5 rounded-lg transition"
                                    title="Registrar Retrabajo / Corrección"
                                  >
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}

                              {task.status_id === 1 && (
                                <button
                                  onClick={() => promptStatusChange(task, 2)}
                                  className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg transition"
                                  title="Iniciar Proceso"
                                >
                                  <Play className="h-3.5 w-3.5 fill-current" />
                                </button>
                              )}

                              {task.status_id === 2 && (
                                user.role === 'operario' ? (
                                  <button
                                    onClick={() => promptStatusChange(task, 5)}
                                    className="inline-flex items-center justify-center bg-amber-500 hover:bg-amber-600 text-white p-1.5 rounded-lg transition grow"
                                    title="Marcar Listo para Revisión del Supervisor"
                                  >
                                    <Check className="h-3.5 w-3.5 mr-1" />
                                    <span>Terminar Trabajo</span>
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => promptStatusChange(task, 3)}
                                      className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg transition"
                                      title="Aprobar y Completar Tarea"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => promptStatusChange(task, 5)}
                                      className="inline-flex items-center justify-center bg-amber-500 hover:bg-amber-600 text-white p-1.5 rounded-lg transition"
                                      title="Marcar Listo para Revisión"
                                    >
                                      <Clock className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )
                              )}

                              {task.status_id === 5 && (user.role === 'admin' || user.role === 'taller') && (
                                <button
                                  onClick={() => promptStatusChange(task, 3)}
                                  className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg transition grow font-bold text-[10px]"
                                  title="Aprobar y Completar Tarea"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5 text-white mr-1" />
                                  <span>Aprobar</span>
                                </button>
                              )}
                            </div>

                            {/* Fases del Pedido Dropdown */}
                            {expandedTimelineTaskId === task.id && (
                              <div className="pt-2 mt-2 border-t border-slate-150">
                                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Cronograma del Pedido</h5>
                                {loadingTimeline ? (
                                  <div className="text-center py-4"><span className="animate-spin inline-block h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></span></div>
                                ) : (
                                  <div className="space-y-1.5">
                                    {timelineTasks.map((tt: any) => (
                                      <div key={tt.id} className="flex justify-between items-center text-[9px] p-1.5 rounded bg-slate-50 border border-slate-150">
                                        <div className="flex items-center gap-1.5">
                                          <div className={`h-2 w-2 rounded-full ${tt.status_id === 3 ? 'bg-emerald-500' : tt.status_id === 2 ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                                          <span className="font-bold text-slate-700">{tt.stage_name}</span>
                                        </div>
                                        <div className="text-right">
                                          <div className="font-semibold text-slate-500">{tt.status_name}</div>
                                          <div className="text-[8px] text-slate-400">
                                            {tt.status_id === 3 ? `Fin: ${formatSimpleDate(tt.updated_at || tt.end_date_actual)}` : `Prog: ${formatSimpleDate(tt.start_date)}`}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Task Specification Sheet Modal */}
      <AnimatePresence>
        {selectedTaskSpec && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-xl shadow-2xl flex flex-col border border-slate-100 overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Ficha Técnica de Ensamblaje</h3>
                  <span className="text-xs text-slate-500 font-mono">Tarea #{selectedTaskSpec.id} | Etapa: {selectedTaskSpec.stage_name}</span>
                </div>
                <button
                  onClick={closeSpecViewer}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 transition"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-5 overflow-y-auto max-h-[70vh]">
                {loadingSpec ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Clock className="h-10 w-10 animate-spin text-indigo-600 mb-2" />
                    <span>Cargando matriz de tallas activa...</span>
                  </div>
                ) : detailedOrderSpec ? (
                  <div className="space-y-5 text-sm">
                    {/* Basic specs */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-xs font-semibold uppercase">Lote/Pedido</span>
                        <strong className="text-slate-800 font-bold">Orden #{detailedOrderSpec.id}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-xs font-semibold uppercase">Cliente</span>
                        <strong className="text-slate-800 font-bold">{detailedOrderSpec.client_name}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-xs font-semibold uppercase">Producto Principal</span>
                        <strong className="text-slate-800 font-bold">{selectedTaskSpec.product_name}</strong>
                      </div>
                    </div>

                    {/* Quantity per size matrix to assemble */}
                    {detailedOrderSpec.items && detailedOrderSpec.items.map((item) => (
                      <div key={item.id} className="space-y-3.5">
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Matriz de Tallas a Confeccionar</h4>
                          <div className="grid grid-cols-4 gap-2">
                            {item.sizes && item.sizes.map((sz) => (
                              <div key={sz.id} className="bg-indigo-50/50 border border-indigo-150 rounded-xl p-2.5 text-center">
                                <span className="text-[10px] font-bold text-indigo-700 block uppercase leading-none">{sz.size_label}</span>
                                <span className="text-lg font-black text-slate-800 block mt-1 leading-none">{sz.quantity}</span>
                                <span className="text-[9px] text-slate-400 block mt-1">unidades</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Custom embroidery instructions */}
                        {item.attributes && item.attributes.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Atributos y Detalles de Bordado</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {item.attributes.map((attr) => (
                                <div key={attr.id} className="border border-slate-150 rounded-xl px-3 py-2 text-xs bg-slate-50/20">
                                  <span className="text-[10px] text-slate-400 block font-semibold">{attr.attribute_name}</span>
                                  <strong className="text-slate-700 font-bold">{attr.value_label}</strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Embroidery Blueprint Images */}
                        {item.files && item.files.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Diseño de Bordado Asociado</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {item.files.map((file) => (
                                <div key={file.id} className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 group">
                                  <img 
                                    src={file.file_url} 
                                    referrerPolicy="no-referrer"
                                    alt="Logo maquila" 
                                    className="w-full h-32 object-cover" 
                                  />
                                  <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 p-1.5 text-center text-[10px] text-white font-medium truncate">
                                    Plano de Imagen
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Rework / Retrabajo History Log */}
                    {reworkHistory && reworkHistory.length > 0 && (
                      <div className="pt-4 border-t border-slate-150">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          Historial de Retrabajos y Correcciones
                        </h4>
                        <div className="space-y-2">
                          {reworkHistory.map((rw) => (
                            <div key={rw.id} className="p-3 bg-amber-50/20 border border-amber-150 rounded-xl space-y-1 text-xs">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-800">
                                  {rw.rework_type === 'arreglo' ? 'Arreglo de Etapa' : 'Empezar de Nuevo'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {new Date(rw.created_at).toLocaleString('es-ES')}
                                </span>
                              </div>
                              <p className="text-slate-600 leading-relaxed text-[11px] bg-white/40 p-2 rounded-lg border border-slate-100">
                                {rw.description}
                              </p>
                              <div className="flex justify-between text-[10px] text-slate-500">
                                <span>Reportado en: <strong>{rw.stage_name}</strong></span>
                                <span>Por: <strong>{rw.created_by_name || 'Supervisor'}</strong></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400">Error al consultar los detalles de la orden</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Comment & Status Modal */}
      <AnimatePresence>
        {commentingTask && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 border border-slate-100 space-y-4"
            >
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                Registrar Registro de Control
              </h3>
              
              <div className="space-y-1 bg-slate-50 p-3.5 rounded-xl text-xs text-slate-600 leading-normal">
                <p>El cambio de estado se ejecutará bajo una **lectura bloqueante (FOR UPDATE)** y disparará de inmediato el Trigger de historial de auditoría en la BD.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-750 mb-1.5">Comentario / Nota de Auditoría</label>
                <textarea
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  placeholder="Ej: Corte finalizado para la orden. Cantidad verificada de 30 uds."
                  className="block w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 text-slate-900"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCommentingTask(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs"
                >
                  Confirmar Cambio en Taller
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Advance Stage Modal */}
      <AnimatePresence>
        {advancingTask && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 border border-slate-100 space-y-4 text-left"
            >
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ChevronRight className="h-5 w-5 text-indigo-600" />
                Avanzar a Siguiente Etapa
              </h3>

              <p className="text-xs text-slate-600">
                ¿Estás seguro de que deseas marcar como **Completada** la etapa de <strong className="text-slate-800">{advancingTask.stage_name}</strong> para el producto <strong className="text-slate-800">{advancingTask.product_name}</strong> y avanzar a la siguiente etapa?
              </p>

              <div className="space-y-1 bg-slate-50 p-3 rounded-xl text-xs text-slate-600 leading-normal">
                <p>Esto reprogramará la siguiente etapa para comenzar **hoy** ({selectedDate}), logrando que la tarjeta se actualice visualmente en el tablero de forma inmediata.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-750 mb-1.5">Comentario de Avance (Opcional)</label>
                <textarea
                  value={advanceComment}
                  onChange={(e) => setAdvanceComment(e.target.value)}
                  placeholder="Ej: Corte finalizado. Listas las piezas para la siguiente fase."
                  className="block w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdvancingTask(null);
                    setAdvanceComment('');
                  }}
                  disabled={advanceSubmitting}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAdvanceStage}
                  disabled={advanceSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1"
                >
                  {advanceSubmitting ? (
                    <Clock className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Confirmar Avance
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rework Modal */}
      <AnimatePresence>
        {reworkTask && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 border border-slate-100 space-y-4 text-left"
            >
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Registrar Evento de Retrabajo / Corrección
              </h3>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold uppercase">Pedido</span>
                  <strong className="text-slate-800">Orden #{reworkTask.order_id}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold uppercase">Etapa con error</span>
                  <strong className="text-slate-800">{reworkTask.stage_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold uppercase">Producto</span>
                  <strong className="text-slate-800">{reworkTask.product_name}</strong>
                </div>
              </div>

              {/* Rework Type Options */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-750">Tipo de Retrabajo</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReworkType('arreglo')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition ${
                      reworkType === 'arreglo'
                        ? 'border-indigo-600 bg-indigo-50/30'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-800">Arreglo de Etapa</span>
                    <span className="text-[10px] text-slate-500 leading-normal">Corregir un detalle rápido sin cambiar de columna en el taller.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReworkType('hacer_de_nuevo')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition ${
                      reworkType === 'hacer_de_nuevo'
                        ? 'border-amber-600 bg-amber-50/30'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-800 text-amber-800">Hacer de nuevo (Empezar Corte)</span>
                    <span className="text-[10px] text-slate-500 leading-normal">El error requiere volver a cortar tela y reiniciar procesos previos.</span>
                  </button>
                </div>
              </div>

              {/* Target Stage selector for doing again */}
              {reworkType === 'hacer_de_nuevo' && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="block text-xs font-bold text-slate-750">Reiniciar Desde Etapa</label>
                  <select
                    value={targetStageId}
                    onChange={(e) => setTargetStageId(parseInt(e.target.value, 10))}
                    className="block w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
                  >
                    {stages
                      .filter((s) => s.id <= reworkTask.stage_id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.id === 1 ? 'Corte (Recomendado - Cortar de nuevo)' : s.name}
                        </option>
                      ))}
                  </select>
                  <p className="text-[10px] text-slate-500">
                    Se restablecerán las etapas desde la seleccionada hasta la etapa actual. El inicio de la primera etapa reiniciada se programará para hoy.
                  </p>
                </div>
              )}

              {/* Description / Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-750 mb-1.5">Descripción del Problema o Correcciones Requeridas</label>
                <textarea
                  value={reworkDescription}
                  onChange={(e) => setReworkDescription(e.target.value)}
                  placeholder="Ej: El estampado salió movido 2cm, reiniciar confección desde Corte para reponer piezas."
                  className="block w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReworkTask(null);
                    setReworkDescription('');
                  }}
                  disabled={reworkSubmitting}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleReworkSubmit}
                  disabled={reworkSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1"
                >
                  {reworkSubmitting ? (
                    <Clock className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Solicitar Retrabajo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}