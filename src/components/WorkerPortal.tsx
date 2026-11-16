import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, DollarSign, Plus, Trash2, Edit3, FileDown,
  CheckCircle, AlertTriangle, ShieldAlert, Sparkles, Wrench, Eye, Check, XCircle
} from 'lucide-react';
import { Worker, CompanySettings, WorkShift, BiweeklyRecord, PayrollSummary } from '../types';
import { calculatePayrollSummary, formatCOP } from '../services/payrollCalculator';
import { ShiftModal } from './ShiftModal';
import { PayslipPreviewModal } from './PayslipPreviewModal';

interface WorkerPortalProps {
  worker: Worker;
  settings: CompanySettings;
  existingRecords: BiweeklyRecord[];
  onSaveRecord: (record: BiweeklyRecord) => void;
}

export const WorkerPortal: React.FC<WorkerPortalProps> = ({
  worker,
  settings,
  existingRecords,
  onSaveRecord
}) => {
  // Configuración del período actual
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentHalf: 1 | 2 = now.getDate() <= 15 ? 1 : 2;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedHalf, setSelectedHalf] = useState<1 | 2>(currentHalf);

  // Control de Asistencia Quincenal (Lunes a Viernes)
  const [workedFullPeriod, setWorkedFullPeriod] = useState<boolean>(true);
  const [missedDaysTotal, setMissedDaysTotal] = useState<number>(1);
  const [missedDaysJustified, setMissedDaysJustified] = useState<number>(0);
  const [missedDaysUnjustified, setMissedDaysUnjustified] = useState<number>(1);
  const [justificationReason, setJustificationReason] = useState<string>('');

  // Turnos y Horas Extras
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [recordId, setRecordId] = useState<string>('');

  // Modales
  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
  const [editingShift, setEditingShift] = useState<WorkShift | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const periodName = `${selectedHalf === 1 ? '1ra Quincena (1 al 15)' : '2da Quincena (16 al fin de mes)'} - ${monthNames[selectedMonth - 1]} ${selectedYear}`;

  // Sincronizar días totales cuando cambian los justificados o injustificados
  const handleJustifiedChange = (justified: number) => {
    const j = Math.max(0, justified);
    setMissedDaysJustified(j);
    setMissedDaysTotal(j + missedDaysUnjustified);
  };

  const handleUnjustifiedChange = (unjustified: number) => {
    const u = Math.max(0, unjustified);
    setMissedDaysUnjustified(u);
    setMissedDaysTotal(missedDaysJustified + u);
  };

  // Cargar registro existente si ya fue guardado previamente
  useEffect(() => {
    const existing = existingRecords.find(
      r => r.workerId === worker.id &&
           r.periodYear === selectedYear &&
           r.periodMonth === selectedMonth &&
           r.periodHalf === selectedHalf
    );

    if (existing) {
      setRecordId(existing.id);
      setWorkedFullPeriod(existing.workedFullPeriod);
      setMissedDaysTotal(existing.missedDaysTotal ?? (existing.workedFullPeriod ? 0 : 1));
      setMissedDaysJustified(existing.missedDaysJustified ?? 0);
      setMissedDaysUnjustified(existing.missedDaysUnjustified ?? (existing.workedFullPeriod ? 0 : 1));
      setJustificationReason(existing.justificationReason || '');
      setShifts(existing.shifts || []);
    } else {
      setRecordId(`rec-${worker.id}-${selectedYear}-${selectedMonth}-${selectedHalf}`);
      setWorkedFullPeriod(true);
      setMissedDaysTotal(0);
      setMissedDaysJustified(0);
      setMissedDaysUnjustified(0);
      setJustificationReason('');
      setShifts([]);
    }
  }, [worker.id, selectedYear, selectedMonth, selectedHalf, existingRecords]);

  // Cálculo en vivo de la nómina
  const summary: PayrollSummary = calculatePayrollSummary(
    worker.biweeklySalary,
    workedFullPeriod,
    missedDaysTotal,
    missedDaysJustified,
    missedDaysUnjustified,
    shifts,
    settings
  );

  const handleSaveShift = (newShift: WorkShift) => {
    if (editingShift) {
      setShifts(shifts.map(s => (s.id === newShift.id ? newShift : s)));
    } else {
      setShifts([...shifts, newShift]);
    }
    setEditingShift(null);
  };

  const handleDeleteShift = (id: string) => {
    setShifts(shifts.filter(s => s.id !== id));
  };

  const handleSaveCurrentRecord = () => {
    const record: BiweeklyRecord = {
      id: recordId || `rec-${worker.id}-${selectedYear}-${selectedMonth}-${selectedHalf}`,
      workerId: worker.id,
      periodName,
      periodYear: selectedYear,
      periodMonth: selectedMonth,
      periodHalf: selectedHalf,
      workedFullPeriod,
      missedDaysTotal: workedFullPeriod ? 0 : missedDaysTotal,
      missedDaysJustified: workedFullPeriod ? 0 : missedDaysJustified,
      missedDaysUnjustified: workedFullPeriod ? 0 : missedDaysUnjustified,
      justificationReason: workedFullPeriod ? undefined : justificationReason.trim() || undefined,
      shifts,
      bonus: 0,
      deduction: 0,
      adminNotes: '',
      status: 'enviado',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      summary
    };

    onSaveRecord(record);
    setSuccessMessage('¡Quincena guardada y enviada a revisión con éxito!');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const currentRecordObject: BiweeklyRecord = {
    id: recordId,
    workerId: worker.id,
    periodName,
    periodYear: selectedYear,
    periodMonth: selectedMonth,
    periodHalf: selectedHalf,
    workedFullPeriod,
    missedDaysTotal: workedFullPeriod ? 0 : missedDaysTotal,
    missedDaysJustified: workedFullPeriod ? 0 : missedDaysJustified,
    missedDaysUnjustified: workedFullPeriod ? 0 : missedDaysUnjustified,
    justificationReason: workedFullPeriod ? undefined : justificationReason.trim() || undefined,
    shifts,
    bonus: 0,
    deduction: 0,
    adminNotes: '',
    status: 'enviado',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    summary
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Alerta de Éxito */}
      {successMessage && (
        <div className="bg-emerald-900/60 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Tarjeta de Perfil del Operario */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400 mb-1">
              <Wrench className="w-4 h-4" />
              <span>MI CUENTA DE OPERARIO</span>
            </div>
            <h1 className="text-2xl font-bold text-white">{worker.name}</h1>
            <p className="text-sm text-slate-400">
              C.C. {worker.documentId} &bull; {worker.role}
            </p>
          </div>

          {/* Desglose de Parámetros del Operario */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <div>
              <span className="text-[11px] text-slate-400 block">Tu Sueldo Quincenal</span>
              <span className="text-sm font-bold text-white">{formatCOP(worker.biweeklySalary)}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Valor Día Ordinario</span>
              <span className="text-sm font-bold text-blue-400">{formatCOP(summary.dailyValue)}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-400 block">Hora Ordinaria (÷ 8h)</span>
              <span className="text-sm font-bold text-emerald-400">{formatCOP(summary.hourlyValue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selector de Período y Control de Asistencia */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Selector de Quincena */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>Seleccionar Quincena</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Mes</label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
              >
                {monthNames.map((m, idx) => (
                  <option key={idx} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedHalf(1)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                  selectedHalf === 1
                    ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                1ra Quincena (1-15)
              </button>
              <button
                type="button"
                onClick={() => setSelectedHalf(2)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                  selectedHalf === 2
                    ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                2da Quincena (16-Fin)
              </button>
            </div>
          </div>
        </div>

        {/* --- CONTROL DE JORNADA ORDINARIA (LUNES A VIERNES) --- */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Jornada Ordinaria de Lunes a Viernes</span>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
              workedFullPeriod
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              {workedFullPeriod ? 'Quincena Completa' : `${missedDaysTotal} día(s) ausente`}
            </span>
          </div>

          <div className="bg-slate-950/70 p-4 sm:p-5 rounded-xl border border-slate-800 space-y-4">
            {/* Pregunta Principal Solicitada por el Usuario */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">
                ¿Trabajaste la quincena completa de lunes a viernes?
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setWorkedFullPeriod(true);
                    setMissedDaysTotal(0);
                    setMissedDaysJustified(0);
                    setMissedDaysUnjustified(0);
                  }}
                  className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                    workedFullPeriod
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Sí, trabajé la quincena completa</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWorkedFullPeriod(false);
                    if (missedDaysTotal === 0) {
                      setMissedDaysTotal(1);
                      setMissedDaysUnjustified(1);
                      setMissedDaysJustified(0);
                    }
                  }}
                  className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                    !workedFullPeriod
                      ? 'bg-amber-600/30 border-amber-500 text-amber-300 shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>No, tuve días de ausencia o faltas</span>
                </button>
              </div>
            </div>

            {/* Sub-formulario si respondió que NO */}
            {!workedFullPeriod && (
              <div className="pt-4 border-t border-slate-800 space-y-4 animate-in fade-in duration-200">
                <div className="bg-amber-950/30 border border-amber-800/40 p-3.5 rounded-xl space-y-1">
                  <p className="text-xs font-bold text-amber-300">
                    Control de Justificación de Ausencias:
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Si tus faltas tienen justificación (incapacidad médica o permiso de la empresa) <strong className="text-emerald-400">NO se te descuentan</strong>. Si no tienen justificación, <strong className="text-amber-400">se descontarán</strong> a valor de día ordinario ({formatCOP(summary.dailyValue)}).
                  </p>
                </div>

                {/* Pregunta: ¿Cuántos días faltaste? */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Días con justificación */}
                  <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-emerald-400">
                        Días CON Justificación
                      </label>
                      <span className="text-[10px] text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                        No se descuentan
                      </span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={missedDaysJustified}
                      onChange={e => handleJustifiedChange(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold"
                    />
                    <span className="text-[10px] text-slate-500 block">
                      Ej: Incapacidad EPS, permiso autorizado, etc.
                    </span>
                  </div>

                  {/* Días sin justificación */}
                  <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-red-400">
                        Días SIN Justificación
                      </label>
                      <span className="text-[10px] text-red-300 bg-red-950 px-2 py-0.5 rounded border border-red-800">
                        Se descuentan
                      </span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={missedDaysUnjustified}
                      onChange={e => handleUnjustifiedChange(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-red-300 font-bold"
                    />
                    <span className="text-[10px] text-slate-500 block">
                      Ausencias no justificadas ni autorizadas.
                    </span>
                  </div>
                </div>

                {/* Campo opcional de justificación si hubo días justificados */}
                {missedDaysJustified > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Motivo o documento de la justificación (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Incapacidad médica 2 días por gripe, permiso familiar autorizado..."
                      value={justificationReason}
                      onChange={e => setJustificationReason(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Resumen del Impacto en Dinero */}
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Total días ausente: <strong>{missedDaysTotal} día(s)</strong></span>
                    <span className="text-emerald-400 text-[11px] block">{missedDaysJustified} día(s) justificados pagados al 100%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Descuento aplicado:</span>
                    <span className={`font-bold text-sm ${missedDaysUnjustified > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {missedDaysUnjustified > 0 ? `-${formatCOP(summary.unjustifiedDeductionAmount)}` : '$0 (Sin descuentos)'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Registro de Sábados, Domingos, Festivos y Horas Extras */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Sábados, Domingos, Festivos y Horas Extras</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold">
                {shifts.length} registros
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Registra tus días adicionales u horas extras para calcular tu total ganado (en la colilla saldrán agrupados como pago no salarial).
            </p>
          </div>

          <button
            onClick={() => {
              setEditingShift(null);
              setIsShiftModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Día o Tiempo Extra</span>
          </button>
        </div>

        {/* Tabla / Lista de Registros */}
        {shifts.length === 0 ? (
          <div className="text-center py-10 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-medium">No has registrado horas extras ni días adicionales.</p>
            <p className="text-xs text-slate-500">Haz clic en el botón superior si trabajaste un sábado, domingo, festivo o metiste horas extras.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Tipo</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Horario / Horas</th>
                  <th className="py-2.5 px-3">Tarifa Aplicada</th>
                  <th className="py-2.5 px-3 text-right">Ganado</th>
                  <th className="py-2.5 px-3 text-right rounded-r-lg">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {shifts.map(shift => {
                  let badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                  let label = 'Sábado (Día ordinario)';

                  if (shift.type === 'sunday') {
                    badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                    label = `Domingo (+${settings.sundayRecargoPercent}%)`;
                  } else if (shift.type === 'holiday') {
                    badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                    label = `Festivo (+${settings.holidayRecargoPercent}%)`;
                  } else if (shift.type === 'night_shift') {
                    badgeColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
                    label = `Noche Ordinaria (+${settings.nightShiftRecargoPercent}%)`;
                  } else if (shift.type === 'overtime_day') {
                    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                    label = `Extra Diurna (+${settings.extraDayRecargoPercent}%)`;
                  } else if (shift.type === 'overtime_night') {
                    badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
                    label = `Extra Nocturna (+${settings.extraNightRecargoPercent}%)`;
                  }

                  return (
                    <tr key={shift.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-md border text-[11px] font-semibold ${badgeColor}`}>
                          {label}
                        </span>
                        {shift.notes && (
                          <span className="block text-[10px] text-slate-400 mt-0.5 italic">{shift.notes}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-medium">{shift.date}</td>
                      <td className="py-3 px-3 text-slate-400">
                        {shift.startTime && shift.endTime ? `${shift.startTime} - ${shift.endTime} ` : ''}
                        <span className="font-semibold text-white">({shift.hours} hrs)</span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{formatCOP(shift.rateApplied)}/hr</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-400">
                        {formatCOP(shift.totalAmount)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => {
                              setEditingShift(shift);
                              setIsShiftModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteShift(shift.id)}
                            className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resumen Informativo de la Liquidación (Desglose Exacto como saldrá en la Colilla) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>Resumen Informativo de Pago</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
              Uso Personal del Operario
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            En tu comprobante informativo solo saldrá el Salario Mínimo Legal y el restante consolidado como Pago No Salarial por alquiler de herramientas y equipos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bloque 1: Salarial */}
          <div className="bg-slate-950/70 border border-blue-900/40 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                1. Devengos Salariales
              </span>
              <span className="text-[10px] text-slate-400">Salario Mínimo Legal</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Salario Fijo Quincenal (SMLV):</span>
                <span className="font-bold text-white text-sm">{formatCOP(summary.totalSalarial)}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Valor fijado por la quincena de labores.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-300">Total Salarial:</span>
              <span className="text-base font-bold text-blue-300">{formatCOP(summary.totalSalarial)}</span>
            </div>
          </div>

          {/* Bloque 2: No Salarial */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                2. Pagos No Salariales
              </span>
              <span className="text-[10px] text-slate-400">Alquiler de Herramientas</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Alquiler y Desgaste de Herramientas y Equipos:</span>
                <span className="font-semibold text-white">{formatCOP(summary.totalNoSalarial)}</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                (Incluye el canon pactado y todos los adicionales de la quincena).
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-300">Subtotal No Salarial:</span>
              <span className="text-base font-bold text-indigo-300">{formatCOP(summary.totalNoSalarial)}</span>
            </div>
          </div>
        </div>

        {/* Gran Total a Pagar y Botones */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-400 block">GRAN TOTAL NETO DE LA QUINCENA:</span>
            <div className="text-3xl font-extrabold text-emerald-400 tracking-tight">
              {formatCOP(summary.totalNetoAPagar)}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="flex items-center space-x-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700"
            >
              <Eye className="w-4 h-4 text-blue-400" />
              <span>Ver Colilla Informativa</span>
            </button>

            <button
              onClick={handleSaveCurrentRecord}
              className="flex items-center space-x-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/30"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Guardar / Enviar a Nómina</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal para Agregar/Editar Turnos */}
      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => {
          setIsShiftModalOpen(false);
          setEditingShift(null);
        }}
        onSave={handleSaveShift}
        biweeklySalary={worker.biweeklySalary}
        settings={settings}
        initialShift={editingShift}
      />

      {/* Modal de Previsualización y Descarga de PDF */}
      <PayslipPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        worker={worker}
        record={currentRecordObject}
        settings={settings}
      />
    </div>
  );
};
