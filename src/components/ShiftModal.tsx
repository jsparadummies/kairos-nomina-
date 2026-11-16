import React, { useState } from 'react';
import { X, Calendar, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { ShiftType, WorkShift, CompanySettings } from '../types';
import { calculateShiftAmount, formatCOP } from '../services/payrollCalculator';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shift: WorkShift) => void;
  biweeklySalary?: number;
  monthlySalary?: number;
  settings: CompanySettings;
  initialShift?: WorkShift | null;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  onSave,
  biweeklySalary,
  monthlySalary,
  settings,
  initialShift
}) => {
  const [type, setType] = useState<ShiftType>(initialShift?.type || 'saturday');
  const [date, setDate] = useState<string>(
    initialShift?.date || new Date().toISOString().split('T')[0]
  );
  const [fullDay, setFullDay] = useState<boolean>(initialShift ? initialShift.hours === 8 : true);
  const [startTime, setStartTime] = useState<string>(initialShift?.startTime || '08:00');
  const [endTime, setEndTime] = useState<string>(initialShift?.endTime || '17:00');
  const [hours, setHours] = useState<number>(initialShift?.hours || 8);
  const [notes, setNotes] = useState<string>(initialShift?.notes || '');

  if (!isOpen) return null;

  const baseSalary = biweeklySalary ?? (monthlySalary ? monthlySalary / 2 : 1285000);

  // Actualizar horas automáticamente si se ingresa hora inicio y fin
  const handleTimeChange = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
    if (start && end) {
      const [h1, m1] = start.split(':').map(Number);
      const [h2, m2] = end.split(':').map(Number);
      let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diff < 0) diff += 24 * 60; // cruce de medianoche
      const calculatedHrs = Number((diff / 60).toFixed(1));
      if (calculatedHrs > 0) {
        setHours(calculatedHrs);
        setFullDay(false);
      }
    }
  };

  const handleFullDayToggle = (isFull: boolean) => {
    setFullDay(isFull);
    if (isFull) {
      setHours(8);
      setStartTime('08:00');
      setEndTime('17:00');
    }
  };

  const isOvertime = type === 'overtime_day' || type === 'overtime_night';
  const currentHours = isOvertime ? hours : (fullDay ? 8 : hours);
  const preview = calculateShiftAmount(type, currentHours, baseSalary, settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newShift: WorkShift = {
      id: initialShift?.id || `shift-${Date.now()}`,
      date,
      type,
      startTime: isOvertime || !fullDay ? startTime : undefined,
      endTime: isOvertime || !fullDay ? endTime : undefined,
      hours: currentHours,
      notes: notes.trim() || undefined,
      rateApplied: preview.rate,
      totalAmount: preview.total
    };
    onSave(newShift);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">
              {initialShift ? 'Editar Registro de Tiempo' : 'Registrar Tiempo Adicional'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Selector de Tipo */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Tipo de Día o Tiempo Adicional
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setType('saturday'); handleFullDayToggle(true); }}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
                  type === 'saturday'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="font-bold">Sábado</div>
                <div className="text-[10px] opacity-80">Día ordinario (100%)</div>
              </button>

              <button
                type="button"
                onClick={() => { setType('sunday'); handleFullDayToggle(true); }}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
                  type === 'sunday'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="font-bold">Domingo</div>
                <div className="text-[10px] opacity-80">Recargo {settings.sundayRecargoPercent}%</div>
              </button>

              <button
                type="button"
                onClick={() => { setType('holiday'); handleFullDayToggle(true); }}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
                  type === 'holiday'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="font-bold">Festivo</div>
                <div className="text-[10px] opacity-80">Recargo {settings.holidayRecargoPercent}%</div>
              </button>

              <button
                type="button"
                onClick={() => { setType('night_shift'); handleFullDayToggle(false); setHours(4); }}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
                  type === 'night_shift'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="font-bold">Noche Ordinaria</div>
                <div className="text-[10px] opacity-80">Recargo {settings.nightShiftRecargoPercent}%</div>
              </button>

              <button
                type="button"
                onClick={() => { setType('overtime_day'); handleFullDayToggle(false); setHours(2); }}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
                  type === 'overtime_day'
                    ? 'bg-amber-600 border-amber-500 text-white shadow-md'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="font-bold">Extra Diurna</div>
                <div className="text-[10px] opacity-80">Extra L-V (+{settings.extraDayRecargoPercent}%)</div>
              </button>

              <button
                type="button"
                onClick={() => { setType('overtime_night'); handleFullDayToggle(false); setHours(2); }}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
                  type === 'overtime_night'
                    ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="font-bold">Extra Nocturna</div>
                <div className="text-[10px] opacity-80">Extra Noche (+{settings.extraNightRecargoPercent}%)</div>
              </button>
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Fecha en que se laboró
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Jornada / Horas */}
          {!isOvertime && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Duración del Día
              </label>
              <div className="flex items-center space-x-3 mb-3">
                <button
                  type="button"
                  onClick={() => handleFullDayToggle(true)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    fullDay
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400'
                  }`}
                >
                  Jornada Completa (8 horas)
                </button>
                <button
                  type="button"
                  onClick={() => handleFullDayToggle(false)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    !fullDay
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400'
                  }`}
                >
                  Horario Personalizado
                </button>
              </div>
            </div>
          )}

          {/* Horario de inicio y fin (si no es jornada completa o es horas extras) */}
          {(isOvertime || !fullDay) && (
            <div className="grid grid-cols-3 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Desde</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => handleTimeChange(e.target.value, endTime)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Hasta</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => handleTimeChange(startTime, e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Total Horas</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={hours}
                  onChange={e => setHours(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-bold"
                />
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Observación o motivo (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Fundición de losa, vaciado de concreto, etc."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Caja de Cálculo en Vivo */}
          <div className="bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-800/40 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-blue-300 block">Total ganado por este registro:</span>
              <span className="text-xs text-slate-400">
                {currentHours} hrs @ {formatCOP(preview.rate)}/hr
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-emerald-400">{formatCOP(preview.total)}</span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all shadow-lg shadow-blue-600/30"
            >
              Guardar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
