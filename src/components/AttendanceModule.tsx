import React, { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CalendarDays, Clock3, LogIn, LogOut, Plus, Search, UsersRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { Attendance, AttendanceStatus, ContractType, Employee } from '../types';

type View = 'register' | 'employees' | 'history';
interface Props { token: string; view: View; }

const auth = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
const dateKey = (value: string) => String(value || '').slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);
const timeNow = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
const apiError = async (res: Response) => (await res.json().catch(() => ({}))).message || 'No fue posible completar la operación.';

function StatusSeal({ record }: { record: Attendance }) {
  const code = record.status_code || '';
  const tone = code === 'present' ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
    : code === 'late' ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
    : code === 'leave' ? 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200'
    : 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200';
  return <span className={`inline-flex border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${tone}`}>{record.status_name || 'Sin estado'}</span>;
}

export default function AttendanceModule({ token, view }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<Attendance[]>([]);
  const [statuses, setStatuses] = useState<AttendanceStatus[]>([]);
  const [contracts, setContracts] = useState<ContractType[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('active');
  const [contractFilter, setContractFilter] = useState('');
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [editing, setEditing] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', position: '', hire_date: today(), contract_type_id: '', base_salary: '', user_id: '' });

  const loadEmployees = async () => {
    const res = await fetch('/api/employees', { headers: auth(token) });
    if (!res.ok) throw new Error(await apiError(res));
    const data = await res.json(); setEmployees(data.data || []);
  };
  const loadRecords = async (from = today(), to = today(), employeeId = '') => {
    const params = new URLSearchParams({ start_date: from, end_date: to });
    if (employeeId) params.set('employee_id', employeeId);
    const res = await fetch(`/api/attendance?${params}`, { headers: auth(token) });
    if (!res.ok) throw new Error(await apiError(res));
    const data = await res.json(); setRecords(data.data || []);
  };
  const load = async () => {
    setLoading(true);
    try {
      const base: Promise<void>[] = [loadEmployees()];
      if (view !== 'employees') base.push(loadRecords(startDate, endDate, employeeFilter));
      if (view === 'register') base.push(fetch('/api/catalogs/attendance-statuses', { headers: auth(token) }).then(r => r.json()).then(d => setStatuses(d.data || [])));
      if (view === 'employees') base.push(fetch('/api/catalogs/contract-types', { headers: auth(token) }).then(r => r.json()).then(d => setContracts(d.data || [])));
      if (view === 'employees') base.push(fetch('/api/admin/users', { headers: auth(token) }).then(r => r.ok ? r.json() : { users: [] }).then(d => setUsers(d.users || [])));
      await Promise.all(base);
    } catch (error: any) { toast.error(error.message || 'No fue posible cargar los datos.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [view]);

  const todayRecords = useMemo(() => records.filter(r => dateKey(r.work_date) === today()), [records]);
  const recordFor = (employeeId: number) => todayRecords.find(r => r.employee_id === employeeId);
  const shownEmployees = employees.filter(employee => {
    const found = `${employee.full_name} ${employee.position}`.toLowerCase().includes(query.toLowerCase());
    return found && (view !== 'employees' || (activeFilter === 'all' || String(employee.is_active) === String(activeFilter === 'active'))) && (!contractFilter || String(employee.contract_type_id) === contractFilter);
  });

  const mark = async (employee: Employee) => {
    const record = recordFor(employee.id); setBusyId(employee.id);
    try {
      const checkout = !!record?.check_in && !record?.check_out;
      const payload = checkout ? { employee_id: employee.id, work_date: today(), check_out: timeNow() }
        : { employee_id: employee.id, work_date: today(), check_in: timeNow(), status_id: statuses.find(s => s.code === 'present')?.id || 1 };
      const res = await fetch(checkout ? '/api/attendance/check-out' : '/api/attendance/check-in', { method: 'POST', headers: auth(token), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await apiError(res));
      await loadRecords(today(), today());
      toast.success(checkout ? `Salida registrada: ${employee.full_name}` : `Entrada registrada: ${employee.full_name}`, { description: checkout ? 'La jornada quedó cerrada.' : 'El control de asistencia quedó actualizado.' });
    } catch (error: any) { toast.error(error.message || 'No se pudo registrar la marca.'); }
    finally { setBusyId(null); }
  };

  const openForm = (employee?: Employee) => {
    setEditing(employee || null);
    setForm(employee ? { full_name: employee.full_name, position: employee.position, hire_date: dateKey(employee.hire_date), contract_type_id: String(employee.contract_type_id), base_salary: String(employee.base_salary), user_id: employee.user_id ? String(employee.user_id) : '' } : { full_name: '', position: '', hire_date: today(), contract_type_id: '', base_salary: '', user_id: '' });
    setShowForm(true);
  };
  const saveEmployee = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload = { ...form, contract_type_id: Number(form.contract_type_id), base_salary: Number(form.base_salary), user_id: form.user_id ? Number(form.user_id) : null };
      const res = await fetch(editing ? `/api/employees/${editing.id}` : '/api/employees', { method: editing ? 'PUT' : 'POST', headers: auth(token), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await apiError(res));
      toast.success(editing ? 'Ficha de empleado actualizada.' : 'Empleado registrado.'); setShowForm(false); await loadEmployees();
    } catch (error: any) { toast.error(error.message || 'No se pudo guardar el empleado.'); }
  };
  const toggleEmployee = async (employee: Employee) => {
    try {
      const res = await fetch(`/api/employees/${employee.id}/status`, { method: 'PUT', headers: auth(token), body: JSON.stringify({ is_active: !employee.is_active }) });
      if (!res.ok) throw new Error(await apiError(res));
      toast.success(employee.is_active ? 'Empleado desactivado.' : 'Empleado activado.'); await loadEmployees();
    } catch (error: any) { toast.error(error.message || 'No se pudo actualizar el estado.'); }
  };

  if (view === 'register') return <section className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-700 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-indigo-600 dark:text-indigo-400">Control de piso · {today()}</p><h2 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">Marcación de turno</h2><p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Seleccione su tarjeta y confirme la marca. Diseñado para uso táctil.</p></div><div className="border-2 border-slate-900 px-4 py-2 text-center font-mono text-sm font-black text-slate-900 dark:border-slate-200 dark:text-slate-100"><Clock3 className="mr-2 inline h-4 w-4" />{timeNow()}<span className="ml-2 text-[10px] tracking-widest text-slate-400">TURNO HOY</span></div></header>
    <div className="relative"><Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar colaborador por nombre o puesto" className="w-full rounded-2xl border border-slate-300 bg-white py-4 pl-12 pr-4 text-base font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></div>
    {loading ? <p className="py-16 text-center text-slate-500">Cargando tarjetas de turno…</p> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{shownEmployees.filter(e => e.is_active).map(employee => { const record = recordFor(employee.id); const checkedOut = !!record?.check_out; const isOut = !!record?.check_in && !checkedOut; return <article key={employee.id} className={`border-2 p-5 shadow-sm dark:bg-slate-900 ${checkedOut ? 'border-slate-200 bg-slate-50 dark:border-slate-700' : isOut ? 'border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20' : 'border-indigo-200 bg-white dark:border-indigo-900'}`}><div className="mb-5 flex items-start justify-between"><div><span className="font-mono text-[10px] font-black tracking-widest text-slate-400">FICHA #{String(employee.id).padStart(3, '0')}</span><h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">{employee.full_name}</h3><p className="text-sm font-medium text-slate-500 dark:text-slate-400">{employee.position}</p></div>{record && <StatusSeal record={record} />}</div><div className="mb-4 border-y border-slate-200 py-3 text-sm dark:border-slate-700">{record?.check_in ? <span className="font-bold text-emerald-700 dark:text-emerald-300">Entrada · {record.check_in}</span> : <span className="font-bold text-slate-500">Pendiente de entrada</span>}{record?.check_out && <span className="ml-3 font-bold text-slate-600 dark:text-slate-300">Salida · {record.check_out}</span>}</div><button disabled={busyId === employee.id || checkedOut} onClick={() => mark(employee)} className={`flex min-h-16 w-full items-center justify-center gap-3 rounded-xl text-lg font-black transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60 ${isOut ? 'bg-rose-600 text-white hover:bg-rose-700' : checkedOut ? 'bg-slate-200 text-slate-500 dark:bg-slate-800' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>{isOut ? <LogOut className="h-6 w-6" /> : checkedOut ? <BadgeCheck className="h-6 w-6" /> : <LogIn className="h-6 w-6" />}{busyId === employee.id ? 'Registrando…' : isOut ? 'MARCAR SALIDA' : checkedOut ? 'TURNO COMPLETADO' : 'MARCAR ENTRADA'}</button></article>; })}</div>}</section>;

  if (view === 'employees') return <section className="space-y-6"><header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-indigo-600">Administración · personal</p><h2 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">Fichas de empleados</h2></div><button onClick={() => openForm()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-bold text-white hover:bg-indigo-700"><Plus className="h-5 w-5" />Nuevo empleado</button></header><div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-3"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar ficha" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800" /><select value={activeFilter} onChange={e => setActiveFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="active">Activos</option><option value="inactive">Inactivos</option><option value="all">Todos los estados</option></select><select value={contractFilter} onChange={e => setContractFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="">Todos los contratos</option>{contracts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"><table className="min-w-full text-left text-sm"><thead className="bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:bg-slate-800"><tr><th className="p-4">Ficha / empleado</th><th className="p-4">Puesto</th><th className="p-4">Contrato</th><th className="p-4">Estado</th><th className="p-4 text-right">Acciones</th></tr></thead><tbody>{shownEmployees.map(e => <tr key={e.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-4"><strong className="block text-slate-900 dark:text-white">{e.full_name}</strong><span className="font-mono text-xs text-slate-400">FICHA #{e.id} {e.user_id ? `· Usuario #${e.user_id}` : '· Sin vínculo'}</span></td><td className="p-4 text-slate-600 dark:text-slate-300">{e.position}</td><td className="p-4"><span className="border border-slate-300 px-2 py-1 text-xs font-bold dark:border-slate-600">{e.contract_type_name || '—'}</span></td><td className="p-4"><span className={e.is_active ? 'font-black text-emerald-700 dark:text-emerald-300' : 'font-black text-slate-500'}>{e.is_active ? 'ACTIVO' : 'INACTIVO'}</span></td><td className="p-4 text-right"><button onClick={() => openForm(e)} className="mr-3 font-bold text-indigo-600 dark:text-indigo-400">Editar</button><button onClick={() => toggleEmployee(e)} className="font-bold text-slate-600 dark:text-slate-300">{e.is_active ? 'Desactivar' : 'Activar'}</button></td></tr>)}{!loading && !shownEmployees.length && <tr><td colSpan={5} className="p-10 text-center text-slate-500">No hay empleados que coincidan con los filtros.</td></tr>}</tbody></table></div>{showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"><form onSubmit={saveEmployee} className="w-full max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="flex items-center justify-between"><h3 className="text-xl font-black dark:text-white">{editing ? 'Editar ficha' : 'Nueva ficha de empleado'}</h3><button type="button" onClick={() => setShowForm(false)}><X /></button></div><div className="grid gap-4 sm:grid-cols-2">{[['full_name','Nombre completo'],['position','Puesto'],['hire_date','Fecha de contratación'],['base_salary','Salario base']].map(([key,label]) => <label key={key} className="text-xs font-bold text-slate-600 dark:text-slate-300">{label}<input required type={key === 'hire_date' ? 'date' : key === 'base_salary' ? 'number' : 'text'} value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800" /></label>)}<label className="text-xs font-bold text-slate-600 dark:text-slate-300">Tipo de contrato<select required value={form.contract_type_id} onChange={e => setForm({ ...form, contract_type_id: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="">Seleccione</option>{contracts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="text-xs font-bold text-slate-600 dark:text-slate-300">Usuario vinculado (opcional)<select value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="">Sin vínculo</option>{users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}</select></label></div><button className="w-full rounded-xl bg-indigo-600 py-3 font-black text-white">Guardar ficha</button></form></div>}</section>;

  const worked = (record: Attendance) => { if (!record.check_in || !record.check_out) return '—'; const [ih, im] = record.check_in.split(':').map(Number); const [oh, om] = record.check_out.split(':').map(Number); const minutes = oh * 60 + om - ih * 60 - im; return `${Math.floor(minutes / 60)}h ${minutes % 60}m`; };
  return <section className="space-y-6"><header><p className="text-[10px] font-black uppercase tracking-[.2em] text-indigo-600">Control de jornada</p><h2 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">Historial de asistencia</h2></header><div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-4"><label className="text-xs font-bold">Desde<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-xl border p-2 dark:bg-slate-800" /></label><label className="text-xs font-bold">Hasta<input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-xl border p-2 dark:bg-slate-800" /></label><label className="text-xs font-bold">Empleado<select value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)} className="mt-1 block w-full rounded-xl border p-2 dark:bg-slate-800"><option value="">Todos</option>{employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></label><button onClick={() => loadRecords(startDate, endDate, employeeFilter)} className="mt-auto rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white">Consultar registros</button></div><div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"><table className="min-w-full text-left text-sm"><thead className="bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:bg-slate-800"><tr><th className="p-4">Fecha / ficha</th><th className="p-4">Estado</th><th className="p-4">Entrada — salida</th><th className="p-4">Horas</th><th className="p-4">Etapa</th></tr></thead><tbody>{records.map(r => <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-4"><strong className="block dark:text-white">{r.employee_name}</strong><span className="font-mono text-xs text-slate-400">{dateKey(r.work_date)} · #{r.employee_id}</span></td><td className="p-4"><StatusSeal record={r} /></td><td className="p-4 font-mono text-slate-600 dark:text-slate-300">{r.check_in || '—'} — {r.check_out || '—'}</td><td className="p-4 font-black dark:text-white">{worked(r)}</td><td className="p-4 text-slate-600 dark:text-slate-300">{r.stage_name || 'Sin asignar'}</td></tr>)}{!loading && !records.length && <tr><td colSpan={5} className="p-12 text-center"><CalendarDays className="mx-auto mb-3 h-8 w-8 text-slate-300" /><strong className="block text-slate-700 dark:text-slate-200">No hay registros en este rango</strong><span className="text-sm text-slate-500">Ajuste las fechas o seleccione otro empleado.</span></td></tr>}</tbody></table></div></section>;
}