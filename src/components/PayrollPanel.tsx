import React, { useEffect, useState } from 'react';
import { Banknote, CalendarRange, CheckCircle2, ClipboardList, LoaderCircle, Play, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import { PayrollDetail, PayrollPeriod } from '../types';

interface Props { token: string; }
const headers = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
const errorMessage = async (response: Response) => (await response.json().catch(() => ({}))).message || 'No fue posible completar la operación.';
const date = (value: string) => String(value || '').slice(0, 10);
const money = (value: number) => `$${Number(value || 0).toFixed(2)}`;

export default function PayrollPanel({ token }: Props) {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [details, setDetails] = useState<PayrollDetail[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [destajoModal, setDestajoModal] = useState<{ id: number; employee: string; baseSalary: number; hours: number } | null>(null);

  const loadPeriods = async () => {
    const response = await fetch('/api/payroll/periods', { headers: headers(token) });
    if (!response.ok) throw new Error(await errorMessage(response));
    const data = await response.json(); setPeriods(data.data || []);
  };
  const loadDetails = async (id: number) => {
    const response = await fetch(`/api/payroll/periods/${id}/details`, { headers: headers(token) });
    if (!response.ok) throw new Error(await errorMessage(response));
    const data = await response.json(); setDetails(data.data || []); setSelected(id);
  };
  const load = async () => { setLoading(true); try { await loadPeriods(); } catch (error: any) { toast.error(error.message || 'No se pudo cargar nómina.'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const generate = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      const response = await fetch('/api/payroll/periods/generate', { method: 'POST', headers: headers(token), body: JSON.stringify({ start_date: startDate, end_date: endDate }) });
      if (!response.ok) throw new Error(await errorMessage(response));
      const data = await response.json(); toast.success('Cálculo generado y guardado como snapshot.'); await loadPeriods(); await loadDetails(data.data.id);
    } catch (error: any) { toast.error(error.message || 'No se pudo generar el período.'); } finally { setBusy(false); }
  };
  const pay = async () => {
    if (!selected) return; setBusy(true);
    try {
      const response = await fetch(`/api/payroll/periods/${selected}/pay`, { method: 'POST', headers: headers(token) });
      if (!response.ok) throw new Error(await errorMessage(response));
      toast.success('Período marcado como pagado.'); await loadPeriods();
    } catch (error: any) { toast.error(error.message || 'No se pudo marcar como pagado.'); } finally { setBusy(false); }
  };
  const current = periods.find(p => p.id === selected);
  const total = details.reduce((sum, item) => sum + Number(item.total_to_pay || 0), 0);

  return <section className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 dark:border-slate-700 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-indigo-600 dark:text-indigo-400">Administración financiera</p><h2 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">Nómina</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Se paga la mitad del salario por cada quincena cubierta.</p></div>
      {current?.status_code !== 'pagado' && selected && <button disabled={busy} onClick={pay} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60"><CheckCircle2 className="h-5 w-5" />Marcar como pagado</button>}
    </header>
    <form onSubmit={generate} className="grid gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900 dark:bg-indigo-950/20 md:grid-cols-[1fr_1fr_auto]">
      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Inicio<input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" /></label>
      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Fin<input required type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" /></label>
      <button disabled={busy} className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Generar cálculo</button>
    </form>
    <div className="grid gap-6 lg:grid-cols-[minmax(260px,.7fr)_minmax(0,1.7fr)]">
      <aside className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"><div className="border-b border-slate-100 p-4 dark:border-slate-800"><h3 className="flex items-center gap-2 font-black text-slate-900 dark:text-white"><CalendarRange className="h-5 w-5 text-indigo-500" />Períodos</h3></div>{loading ? <p className="p-6 text-sm text-slate-500">Cargando períodos…</p> : <div className="max-h-[52vh] overflow-y-auto p-2">{periods.map(period => <button key={period.id} onClick={() => loadDetails(period.id)} className={`mb-1 w-full rounded-xl border p-3 text-left transition ${selected === period.id ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/40' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'}`}><span className="block font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">PERÍODO #{String(period.id).padStart(3,'0')}</span><strong className="mt-1 block text-sm text-slate-800 dark:text-slate-100">{date(period.start_date)} — {date(period.end_date)}</strong><span className={`mt-2 inline-block border px-2 py-0.5 text-[10px] font-black uppercase ${period.status_code === 'pagado' ? 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300' : period.status_code === 'calculado' ? 'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300' : 'border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300'}`}>{period.status_name}</span></button>)}{!periods.length && <p className="p-5 text-sm text-slate-500">Aún no hay períodos.</p>}</div>}</aside>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="flex items-center gap-2 font-black text-slate-900 dark:text-white"><ReceiptText className="h-5 w-5 text-indigo-500" />Detalle de período</h3><p className="mt-1 text-xs text-slate-500">{current ? `${date(current.start_date)} al ${date(current.end_date)}` : 'Seleccione un período para ver su desglose.'}</p></div>{selected && <div className="border-2 border-slate-900 px-3 py-2 font-mono text-sm font-black text-slate-900 dark:border-slate-200 dark:text-white">TOTAL {money(total)}</div>}</div>{!selected ? <div className="p-14 text-center text-slate-500"><ClipboardList className="mx-auto mb-3 h-9 w-9 text-slate-300" />Seleccione un período de la lista.</div> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:bg-slate-800"><tr><th className="p-4">Empleado</th><th className="p-4">Detalle Quincenas / Horas (Destajo)</th><th className="p-4">Salario snapshot</th><th className="p-4">Deducciones</th><th className="p-4 text-right">Total</th></tr></thead><tbody>{details.map(item => <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-4"><strong className="block text-slate-900 dark:text-white">{item.employee_name}</strong><span className="text-xs text-slate-500">{item.position}</span></td><td className="p-4 text-xs text-slate-700 dark:text-slate-300">{item.contract_type_code === 'destajo' ? <div className="flex flex-col gap-1 items-start">{current?.status_code !== 'pagado' ? <button onClick={() => setDestajoModal({ id: item.id, employee: item.employee_name!, baseSalary: Number(item.base_salary_snapshot), hours: item.hours_worked || 0 })} className="rounded bg-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-800">Calcular Pago</button> : <span className="font-bold text-indigo-600 dark:text-indigo-400">Calculado</span>}<span className="text-[10px] text-slate-500">{item.notes}</span></div> : item.notes || '—'}</td><td className="p-4 font-mono text-slate-700 dark:text-slate-300">{money(item.base_salary_snapshot)}</td><td className="p-4 font-mono text-slate-700 dark:text-slate-300">{money(item.deductions)}</td><td className="p-4 text-right font-mono font-black text-indigo-700 dark:text-indigo-300">{money(item.total_to_pay)}</td></tr>)}{!details.length && <tr><td colSpan={5} className="p-10 text-center text-slate-500">Este período todavía no tiene detalles calculados.</td></tr>}</tbody></table></div>}</div>
    </div>
    {destajoModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"><h3 className="mb-4 text-lg font-black text-slate-900 dark:text-white">Calcular Destajo</h3><p className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">{destajoModal.employee}</p><div className="mb-4 rounded bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400"><p>Salario Base: {money(destajoModal.baseSalary)}</p><p>Tarifa por hora: {money(destajoModal.baseSalary / 240)}</p></div><label className="mb-4 block"><span className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Horas trabajadas (número entero)</span><input type="number" min="0" step="1" value={destajoModal.hours} onChange={e => setDestajoModal({...destajoModal, hours: parseInt(e.target.value) || 0})} className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label><div className="mb-6 flex justify-between border-t border-slate-200 pt-4 dark:border-slate-700"><span className="text-sm font-bold text-slate-700 dark:text-slate-300">Total a pagar:</span><span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{money((destajoModal.baseSalary / 240) * destajoModal.hours)}</span></div><div className="flex gap-2"><button onClick={() => setDestajoModal(null)} className="flex-1 rounded-xl bg-slate-200 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">Cancelar</button><button disabled={busy} onClick={async () => { setBusy(true); try { const res = await fetch(`/api/payroll/details/${destajoModal.id}/hours`, { method: 'PATCH', headers: headers(token), body: JSON.stringify({ hours: destajoModal.hours }) }); if (!res.ok) throw new Error(await errorMessage(res)); toast.success('Horas guardadas correctamente'); setDestajoModal(null); await loadDetails(selected!); } catch(e: any) { toast.error(e.message); } finally { setBusy(false); } }} className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">Guardar</button></div></div></div>}
  </section>;
}