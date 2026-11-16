import React, { useState } from 'react';
import {
  Users, Shield, Settings as SettingsIcon, Plus, Edit3, Trash2,
  FileDown, CheckCircle2, DollarSign, Clock, Search, Save, AlertCircle, Wrench,
  Cloud, Database, Copy, Check, ExternalLink
} from 'lucide-react';
import { Worker, CompanySettings, BiweeklyRecord, WorkShift } from '../types';
import { formatCOP, getDailyRate, getHourlyRate, calculatePayrollSummary } from '../services/payrollCalculator';
import { getSupabaseConfig, saveSupabaseConfig, isSupabaseConfigured } from '../services/supabase';
import { PayslipPreviewModal } from './PayslipPreviewModal';
import { ShiftModal } from './ShiftModal';

interface AdminPortalProps {
  workers: Worker[];
  settings: CompanySettings;
  records: BiweeklyRecord[];
  onUpdateWorkers: (workers: Worker[]) => void;
  onDeleteWorker: (workerId: string) => void;
  onUpdateSettings: (settings: CompanySettings) => void;
  onUpdateRecord: (record: BiweeklyRecord) => void;
  onDeleteRecord: (recordId: string) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  workers,
  settings,
  records,
  onUpdateWorkers,
  onDeleteWorker,
  onUpdateSettings,
  onUpdateRecord,
  onDeleteRecord
}) => {
  const [activeTab, setActiveTab] = useState<'workers' | 'records' | 'settings'>('workers');

  // Estado para gestión de operarios
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);
  const [workerSearch, setWorkerSearch] = useState('');

  // Estado para configuración
  const [tempSettings, setTempSettings] = useState<CompanySettings>(settings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Estado para conexión a la Nube (Supabase)
  const [supabaseConfig, setSupabaseConfig] = useState(getSupabaseConfig());
  const [isCloudConnected, setIsCloudConnected] = useState(isSupabaseConfigured());
  const [cloudSavedMsg, setCloudSavedMsg] = useState('');
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Estado para ver/editar quincenas
  const [selectedRecordForPreview, setSelectedRecordForPreview] = useState<{
    worker: Worker;
    record: BiweeklyRecord;
  } | null>(null);

  const [editingRecord, setEditingRecord] = useState<BiweeklyRecord | null>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<WorkShift | null>(null);

  // --- FILTROS DE OPERARIOS ---
  const filteredWorkers = workers.filter(w =>
    w.name.toLowerCase().includes(workerSearch.toLowerCase()) ||
    w.documentId.includes(workerSearch) ||
    w.role.toLowerCase().includes(workerSearch.toLowerCase())
  );

  // Guardar Operario (Crear o Editar Salario)
  const handleSaveWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorker) return;

    const workerToSave: Worker = {
      ...editingWorker,
      monthlySalary: editingWorker.biweeklySalary * 2
    };

    if (workers.some(w => w.id === workerToSave.id)) {
      const updated = workers.map(w => (w.id === workerToSave.id ? workerToSave : w));
      onUpdateWorkers(updated);
    } else {
      onUpdateWorkers([...workers, workerToSave]);
    }

    setIsWorkerModalOpen(false);
    setEditingWorker(null);
  };

  const handleOpenNewWorker = () => {
    setEditingWorker({
      id: `worker-${Date.now()}`,
      name: '',
      documentId: '',
      role: 'Operario de Obra',
      biweeklySalary: 1285000,
      monthlySalary: 2570000,
      active: true,
      pin: '1234',
      phone: ''
    });
    setIsWorkerModalOpen(true);
  };

  // Guardar Ajustes de Empresa y Recargos
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(tempSettings);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  // Guardar Conexión a Supabase (Nube)
  const handleSaveCloudConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(supabaseConfig);
    const connected = Boolean(supabaseConfig.url.trim() && supabaseConfig.anonKey.trim());
    setIsCloudConnected(connected);
    setCloudSavedMsg(connected ? '¡Conexión guardada exitosamente!' : 'Modo local activo.');
    setTimeout(() => setCloudSavedMsg(''), 4000);
  };

  // Edición directa de una Quincena por parte del Jefe
  const handleSaveEditingRecord = () => {
    if (!editingRecord) return;
    const worker = workers.find(w => w.id === editingRecord.workerId);
    if (!worker) return;

    const justified = editingRecord.missedDaysJustified || 0;
    const unjustified = editingRecord.missedDaysUnjustified || 0;
    const totalMissed = justified + unjustified;

    const recalculatedSummary = calculatePayrollSummary(
      worker.biweeklySalary,
      editingRecord.workedFullPeriod,
      totalMissed,
      justified,
      unjustified,
      editingRecord.shifts,
      settings,
      editingRecord.bonus,
      editingRecord.deduction,
      editingRecord.adminNotes
    );

    const updated: BiweeklyRecord = {
      ...editingRecord,
      missedDaysTotal: editingRecord.workedFullPeriod ? 0 : totalMissed,
      missedDaysJustified: editingRecord.workedFullPeriod ? 0 : justified,
      missedDaysUnjustified: editingRecord.workedFullPeriod ? 0 : unjustified,
      summary: recalculatedSummary,
      status: 'aprobado',
      updatedAt: new Date().toISOString()
    };

    onUpdateRecord(updated);
    setEditingRecord(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header del Panel del Jefe */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs mb-1">
            <Shield className="w-4 h-4" />
            <span>PANEL DE CONTROL DEL JEFE / ADMINISTRADOR</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Gestión de Nómina, Operarios y Salarios</h1>
          <p className="text-xs text-slate-400">
            Ajusta remuneraciones, autoriza registros de quincenas y configura porcentajes de recargo.
          </p>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('workers')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'workers'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Operarios ({workers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('records')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'records'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Revisión de Quincenas ({records.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Tarifas y Parámetros</span>
          </button>
        </div>
      </div>

      {/* --- TAB 1: OPERARIOS Y SALARIOS --- */}
      {activeTab === 'workers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por nombre, cédula o cargo..."
                value={workerSearch}
                onChange={e => setWorkerSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleOpenNewWorker}
              className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Operario</span>
            </button>
          </div>

          {filteredWorkers.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-800/70 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-300 font-bold">No hay operarios registrados en el sistema</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Los operarios pueden crear su propia cuenta desde la pantalla inicial, o tú como jefe puedes agregarlos con <strong>"+ Nuevo Operario"</strong>.
                </p>
              </div>
              <button
                onClick={handleOpenNewWorker}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Primer Operario</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-3 rounded-l-lg">Operario</th>
                    <th className="py-3 px-3">Cédula / PIN</th>
                    <th className="py-3 px-3">Cargo</th>
                    <th className="py-3 px-3 text-right">Sueldo Quincenal</th>
                    <th className="py-3 px-3 text-right">Valor Día (L-V)</th>
                    <th className="py-3 px-3 text-right">Valor Hora</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                    <th className="py-3 px-3 text-right rounded-r-lg">Acción Jefe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredWorkers.map(w => {
                    const daily = getDailyRate(w.biweeklySalary);
                    const hourly = getHourlyRate(w.biweeklySalary);

                    return (
                      <tr key={w.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-bold text-white">{w.name}</td>
                        <td className="py-3 px-3 text-slate-400">
                          {w.documentId} <span className="text-[10px] text-slate-500">(PIN: {w.pin})</span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">{w.role}</td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-400">
                          {formatCOP(w.biweeklySalary)}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-blue-300">
                          {formatCOP(daily)}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-400">
                          {formatCOP(hourly)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            w.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                          }`}>
                            {w.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                setEditingWorker(w);
                                setIsWorkerModalOpen(true);
                              }}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white text-xs font-semibold transition-all border border-slate-700"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Editar Salario</span>
                            </button>
                            <button
                              onClick={() => setWorkerToDelete(w)}
                              title="Eliminar perfil del operario"
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-600 text-red-300 hover:text-white text-xs font-semibold transition-all border border-red-800/50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Borrar</span>
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
      )}

      {/* --- TAB 2: REVISIÓN DE QUINCENAS --- */}
      {activeTab === 'records' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">
              Historial de Quincenas y Liquidaciones Reportadas
            </h2>
          </div>

          {records.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
              <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Aún no hay quincenas enviadas por los operarios.</p>
              <p className="text-xs text-slate-500">Cuando un operario guarde su quincena, aparecerá aquí para tu revisión y aprobación.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-3 rounded-l-lg">Operario</th>
                    <th className="py-3 px-3">Período</th>
                    <th className="py-3 px-3">Asistencia L-V</th>
                    <th className="py-3 px-3 text-right">Salario Mínimo</th>
                    <th className="py-3 px-3 text-right">Pago No Salarial (Equipos)</th>
                    <th className="py-3 px-3 text-right">Gran Total</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                    <th className="py-3 px-3 text-right rounded-r-lg">Acciones Jefe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {records.map(rec => {
                    const worker = workers.find(w => w.id === rec.workerId);
                    if (!worker) return null;

                    return (
                      <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-bold text-white">{worker.name}</td>
                        <td className="py-3 px-3 text-slate-300">{rec.periodName}</td>
                        <td className="py-3 px-3 text-slate-400">
                          {rec.workedFullPeriod ? (
                            <span className="text-emerald-400 font-semibold">Completa</span>
                          ) : (
                            <span className="text-amber-400">
                              {rec.missedDaysUnjustified ? `-${rec.missedDaysUnjustified} desc.` : 'Justificada'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-blue-300">
                          {formatCOP(rec.summary.totalSalarial)}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-indigo-300">
                          {formatCOP(rec.summary.totalNoSalarial)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-400">
                          {formatCOP(rec.summary.totalNetoAPagar)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            rec.status === 'aprobado'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {rec.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setEditingRecord({ ...rec })}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                            >
                              Corregir
                            </button>
                            <button
                              onClick={() => setSelectedRecordForPreview({ worker, record: rec })}
                              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                              <span>PDF</span>
                            </button>
                            <button
                              onClick={() => onDeleteRecord(rec.id)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
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
      )}

      {/* --- TAB 3: TARIFAS Y PARÁMETROS DE LA EMPRESA --- */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white">Parámetros de Liquidación y Porcentajes</h2>
                <p className="text-xs text-slate-400">
                  Define el salario mínimo de referencia en Colombia y los recargos acordados para tu empresa.
                </p>
              </div>
              {settingsSaved && (
                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-3 py-1 rounded-full border border-emerald-500/30">
                  ¡Parámetros guardados!
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Datos de Empresa */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Datos de la Empresa
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Comercial</label>
                  <input
                    type="text"
                    value={tempSettings.companyName}
                    onChange={e => setTempSettings({ ...tempSettings, companyName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">NIT</label>
                  <input
                    type="text"
                    value={tempSettings.nit}
                    onChange={e => setTempSettings({ ...tempSettings, nit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                {/* Parámetros Salario Mínimo Legal Colombia */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      SMLV Oficial Colombia (Quincenal)
                    </span>
                    <span className="text-[11px] font-extrabold text-white bg-emerald-950 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                      Neto: {formatCOP(tempSettings.biweeklyMinimumWage || 929964)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Básico Quincenal (COP)</label>
                      <input
                        type="number"
                        value={tempSettings.biweeklyBaseSalary || 875453}
                        onChange={e => {
                          const base = Number(e.target.value);
                          const transp = tempSettings.biweeklyTransportAllowance || 124547;
                          const health = Math.round(base * ((tempSettings.healthDeductionPercent || 4) / 100));
                          const pension = Math.round(base * ((tempSettings.pensionDeductionPercent || 4) / 100));
                          const neto = (base + transp) - (health + pension);
                          setTempSettings({
                            ...tempSettings,
                            biweeklyBaseSalary: base,
                            biweeklyMinimumWage: neto
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Aux. Transporte (COP)</label>
                      <input
                        type="number"
                        value={tempSettings.biweeklyTransportAllowance || 124547}
                        onChange={e => {
                          const transp = Number(e.target.value);
                          const base = tempSettings.biweeklyBaseSalary || 875453;
                          const health = Math.round(base * ((tempSettings.healthDeductionPercent || 4) / 100));
                          const pension = Math.round(base * ((tempSettings.pensionDeductionPercent || 4) / 100));
                          const neto = (base + transp) - (health + pension);
                          setTempSettings({
                            ...tempSettings,
                            biweeklyTransportAllowance: transp,
                            biweeklyMinimumWage: neto
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Deducción EPS (%)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={tempSettings.healthDeductionPercent || 4}
                        onChange={e => {
                          const hp = Number(e.target.value);
                          const base = tempSettings.biweeklyBaseSalary || 875453;
                          const transp = tempSettings.biweeklyTransportAllowance || 124547;
                          const health = Math.round(base * (hp / 100));
                          const pension = Math.round(base * ((tempSettings.pensionDeductionPercent || 4) / 100));
                          const neto = (base + transp) - (health + pension);
                          setTempSettings({
                            ...tempSettings,
                            healthDeductionPercent: hp,
                            biweeklyMinimumWage: neto
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Deducción Pensión (%)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={tempSettings.pensionDeductionPercent || 4}
                        onChange={e => {
                          const pp = Number(e.target.value);
                          const base = tempSettings.biweeklyBaseSalary || 875453;
                          const transp = tempSettings.biweeklyTransportAllowance || 124547;
                          const health = Math.round(base * ((tempSettings.healthDeductionPercent || 4) / 100));
                          const pension = Math.round(base * (pp / 100));
                          const neto = (base + transp) - (health + pension);
                          setTempSettings({
                            ...tempSettings,
                            pensionDeductionPercent: pp,
                            biweeklyMinimumWage: neto
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-tight">
                    Total devengado: <strong>{formatCOP((tempSettings.biweeklyBaseSalary || 875453) + (tempSettings.biweeklyTransportAllowance || 124547))}</strong> menos descuentos ley EPS/Pensión 8% (<strong>-{formatCOP(Math.round((tempSettings.biweeklyBaseSalary || 875453) * 0.08))}</strong>) = <strong className="text-emerald-400">{formatCOP(tempSettings.biweeklyMinimumWage || 929964)}</strong> neto quincenal.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">PIN del Jefe (Clave de acceso)</label>
                  <input
                    type="password"
                    value={tempSettings.adminPin}
                    onChange={e => setTempSettings({ ...tempSettings, adminPin: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                  />
                </div>
              </div>

              {/* Recargos y Porcentajes */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Porcentajes de Recargos Acordados
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Festivo Acordado (%)</label>
                    <input
                      type="number"
                      value={tempSettings.holidayRecargoPercent}
                      onChange={e => setTempSettings({ ...tempSettings, holidayRecargoPercent: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                    />
                    <span className="text-[10px] text-slate-400">Configurado al 50% (1.5x)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Domingo Acordado (%)</label>
                    <input
                      type="number"
                      value={tempSettings.sundayRecargoPercent}
                      onChange={e => setTempSettings({ ...tempSettings, sundayRecargoPercent: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                    />
                    <span className="text-[10px] text-slate-400">Configurado al 50% (1.5x)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Noche Ordinaria (%)</label>
                    <input
                      type="number"
                      value={tempSettings.nightShiftRecargoPercent}
                      onChange={e => setTempSettings({ ...tempSettings, nightShiftRecargoPercent: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                    />
                    <span className="text-[10px] text-slate-400">Recargo legal del 35%</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Sábado (Factor)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={tempSettings.saturdayFactor}
                      onChange={e => setTempSettings({ ...tempSettings, saturdayFactor: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                    />
                    <span className="text-[10px] text-slate-400">1.0 = Día ordinario</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Extra Diurna (%)</label>
                    <input
                      type="number"
                      value={tempSettings.extraDayRecargoPercent}
                      onChange={e => setTempSettings({ ...tempSettings, extraDayRecargoPercent: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                    />
                    <span className="text-[10px] text-slate-400">+25% L-V</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Extra Nocturna (%)</label>
                    <input
                      type="number"
                      value={tempSettings.extraNightRecargoPercent}
                      onChange={e => setTempSettings({ ...tempSettings, extraNightRecargoPercent: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                    />
                    <span className="text-[10px] text-slate-400">+75% L-V noche</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="submit"
                className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/30"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Parámetros de Liquidación</span>
              </button>
            </div>
          </form>

          {/* Tarjeta de Conexión a Base de Datos en la Nube (Supabase) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>Base de Datos en la Nube (Sincronización Multidispositivo)</span>
                    {isCloudConnected ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                        ● Nube Conectada
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                        Modo Local (Sin Nube)
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Conecta Supabase (100% gratis) para que los operarios entren desde sus celulares y tú veas todo en tu PC en tiempo real.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSqlModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Ver Script SQL</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveCloudConfig} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://xyzcompany.supabase.co"
                    value={supabaseConfig.url}
                    onChange={e => setSupabaseConfig({ ...supabaseConfig, url: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-500">De Settings &gt; API en tu panel de Supabase</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Supabase Anon Public Key
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    value={supabaseConfig.anonKey}
                    onChange={e => setSupabaseConfig({ ...supabaseConfig, anonKey: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Clave pública "anon public"</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-emerald-400 font-semibold">{cloudSavedMsg}</span>
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/30"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Guardar y Conectar Nube</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL EDITAR / CREAR OPERARIO --- */}
      {isWorkerModalOpen && editingWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Wrench className="w-4 h-4 text-blue-400" />
                <span>Configurar Operario y Sueldo Quincenal</span>
              </h3>
              <button onClick={() => setIsWorkerModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveWorker} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pedro Pérez"
                  value={editingWorker.name}
                  onChange={e => setEditingWorker({ ...editingWorker, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cédula</label>
                  <input
                    type="text"
                    required
                    placeholder="Número de cédula"
                    value={editingWorker.documentId}
                    onChange={e => setEditingWorker({ ...editingWorker, documentId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">PIN de Acceso</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Ej: 1234"
                    value={editingWorker.pin}
                    onChange={e => setEditingWorker({ ...editingWorker, pin: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Cargo / Especialidad</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Operario de Obra, Soldador, Oficial..."
                  value={editingWorker.role}
                  onChange={e => setEditingWorker({ ...editingWorker, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Ajuste de Salario Quincenal del Operario por el Jefe */}
              <div className="bg-slate-950 p-4 rounded-xl border border-blue-900/50 space-y-2">
                <label className="block text-xs font-bold text-blue-400">
                  Sueldo Quincenal Acordado (COP)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    step="5000"
                    required
                    value={editingWorker.biweeklySalary}
                    onChange={e => {
                      const bSal = Number(e.target.value);
                      setEditingWorker({
                        ...editingWorker,
                        biweeklySalary: bSal,
                        monthlySalary: bSal * 2
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-emerald-400 font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between pt-1">
                  <span>Valor Día (÷10): <strong>{formatCOP(getDailyRate(editingWorker.biweeklySalary))}</strong></span>
                  <span>Hora (÷8h): <strong>{formatCOP(getHourlyRate(editingWorker.biweeklySalary))}</strong></span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="workerActive"
                  checked={editingWorker.active}
                  onChange={e => setEditingWorker({ ...editingWorker, active: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                />
                <label htmlFor="workerActive" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Operario activo en la empresa
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWorkerModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30"
                >
                  Guardar Operario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL CONFIRMAR ELIMINACIÓN DE OPERARIO --- */}
      {workerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">¿Eliminar Operario?</h3>
              <p className="text-xs text-slate-400">
                ¿Estás seguro de que deseas eliminar el perfil de <strong className="text-white">{workerToDelete.name}</strong>?
              </p>
              <p className="text-[11px] text-red-400/90 pt-1">
                Si ya no labora con la empresa, esta acción borrará su usuario de forma definitiva.
              </p>
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setWorkerToDelete(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteWorker(workerToDelete.id);
                  setWorkerToDelete(null);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-colors"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL PARA QUE EL JEFE CORRIJA UNA QUINCENA --- */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>Corrección de Quincena por el Jefe</span>
              </h3>
              <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block">Período:</span>
                  <span className="font-bold text-white">{editingRecord.periodName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-slate-300 font-medium">¿Quincena Completa?</label>
                  <input
                    type="checkbox"
                    checked={editingRecord.workedFullPeriod}
                    onChange={e => setEditingRecord({ ...editingRecord, workedFullPeriod: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700 text-blue-600"
                  />
                </div>
              </div>

              {!editingRecord.workedFullPeriod && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-emerald-400 font-bold mb-1">Días con Justificación (No descuentan)</label>
                      <input
                        type="number"
                        min="0"
                        value={editingRecord.missedDaysJustified || 0}
                        onChange={e => setEditingRecord({ ...editingRecord, missedDaysJustified: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-red-400 font-bold mb-1">Días sin Justificación (Se descuentan)</label>
                      <input
                        type="number"
                        min="0"
                        value={editingRecord.missedDaysUnjustified || 0}
                        onChange={e => setEditingRecord({ ...editingRecord, missedDaysUnjustified: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-red-300 font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Motivo / Soporte de la justificación</label>
                    <input
                      type="text"
                      placeholder="Ej: Incapacidad médica"
                      value={editingRecord.justificationReason || ''}
                      onChange={e => setEditingRecord({ ...editingRecord, justificationReason: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                    />
                  </div>
                </div>
              )}

              {/* Turnos extras registrados */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                    Turnos y Horas Extras
                  </span>
                  <button
                    onClick={() => {
                      setEditingShift(null);
                      setIsShiftModalOpen(true);
                    }}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    + Añadir Turno
                  </button>
                </div>

                <div className="space-y-2">
                  {editingRecord.shifts.map(s => (
                    <div key={s.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-white block">{s.type.toUpperCase()}</span>
                        <span className="text-slate-400 text-[10px]">{s.date} &bull; {s.hours} horas</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-emerald-400">{formatCOP(s.totalAmount)}</span>
                        <button
                          onClick={() => {
                            setEditingRecord({
                              ...editingRecord,
                              shifts: editingRecord.shifts.filter(x => x.id !== s.id)
                            });
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ajustes Especiales del Jefe */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bonificación Especial (+)</label>
                  <input
                    type="number"
                    value={editingRecord.bonus || 0}
                    onChange={e => setEditingRecord({ ...editingRecord, bonus: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-emerald-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Descuento o Anticipo (-)</label>
                  <input
                    type="number"
                    value={editingRecord.deduction || 0}
                    onChange={e => setEditingRecord({ ...editingRecord, deduction: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-red-400 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Nota u Observación del Jefe</label>
                <input
                  type="text"
                  placeholder="Ej: Corrección autorizada por gerencia de obra"
                  value={editingRecord.adminNotes || ''}
                  onChange={e => setEditingRecord({ ...editingRecord, adminNotes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditingRecord}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md"
                >
                  Aprobar y Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para que el Jefe agregue un turno mientras edita una quincena */}
      {isShiftModalOpen && editingRecord && (
        <ShiftModal
          isOpen={isShiftModalOpen}
          onClose={() => setIsShiftModalOpen(false)}
          onSave={shift => {
            setEditingRecord({
              ...editingRecord,
              shifts: [...editingRecord.shifts, shift]
            });
            setIsShiftModalOpen(false);
          }}
          biweeklySalary={workers.find(w => w.id === editingRecord.workerId)?.biweeklySalary || 1285000}
          settings={settings}
          initialShift={editingShift}
        />
      )}

      {/* Modal de Script SQL para Supabase */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Script SQL para Inicializar Supabase</h3>
                  <p className="text-[11px] text-slate-400">Pégalo en el SQL Editor de Supabase y dale "Run"</p>
                </div>
              </div>
              <button onClick={() => setIsSqlModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <p className="text-slate-300">
                Copia este script completo y pégalo en tu proyecto de <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-400 underline font-semibold">Supabase.com</a> &gt; <strong>SQL Editor</strong> &gt; <strong>New Query</strong>:
              </p>

              <div className="relative bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto max-h-72">
                <pre>{`-- 1. TABLA DE OPERARIOS
CREATE TABLE IF NOT EXISTS public.workers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  document_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'Operario de Obra',
  biweekly_salary NUMERIC NOT NULL DEFAULT 1285000,
  monthly_salary NUMERIC NOT NULL DEFAULT 2570000,
  active BOOLEAN NOT NULL DEFAULT true,
  pin TEXT NOT NULL DEFAULT '1234',
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABLA DE QUINCENAS
CREATE TABLE IF NOT EXISTS public.records (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  period_name TEXT NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  period_half INTEGER NOT NULL,
  worked_full_period BOOLEAN NOT NULL DEFAULT true,
  missed_days_total INTEGER NOT NULL DEFAULT 0,
  missed_days_justified INTEGER NOT NULL DEFAULT 0,
  missed_days_unjustified INTEGER NOT NULL DEFAULT 0,
  justification_reason TEXT,
  shifts JSONB DEFAULT '[]'::jsonb,
  bonus NUMERIC DEFAULT 0,
  deduction NUMERIC DEFAULT 0,
  admin_notes TEXT,
  status TEXT NOT NULL DEFAULT 'enviado',
  summary JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABLA DE CONFIGURACIÓN
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- HABILITAR RLS Y PERMISOS
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access workers" ON public.workers;
CREATE POLICY "Public access workers" ON public.workers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access records" ON public.records;
CREATE POLICY "Public access records" ON public.records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access settings" ON public.settings;
CREATE POLICY "Public access settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);`}</pre>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const sql = `-- 1. TABLA DE OPERARIOS
CREATE TABLE IF NOT EXISTS public.workers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  document_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'Operario de Obra',
  biweekly_salary NUMERIC NOT NULL DEFAULT 1285000,
  monthly_salary NUMERIC NOT NULL DEFAULT 2570000,
  active BOOLEAN NOT NULL DEFAULT true,
  pin TEXT NOT NULL DEFAULT '1234',
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABLA DE QUINCENAS
CREATE TABLE IF NOT EXISTS public.records (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  period_name TEXT NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  period_half INTEGER NOT NULL,
  worked_full_period BOOLEAN NOT NULL DEFAULT true,
  missed_days_total INTEGER NOT NULL DEFAULT 0,
  missed_days_justified INTEGER NOT NULL DEFAULT 0,
  missed_days_unjustified INTEGER NOT NULL DEFAULT 0,
  justification_reason TEXT,
  shifts JSONB DEFAULT '[]'::jsonb,
  bonus NUMERIC DEFAULT 0,
  deduction NUMERIC DEFAULT 0,
  admin_notes TEXT,
  status TEXT NOT NULL DEFAULT 'enviado',
  summary JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABLA DE CONFIGURACIÓN
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access workers" ON public.workers;
CREATE POLICY "Public access workers" ON public.workers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access records" ON public.records;
CREATE POLICY "Public access records" ON public.records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access settings" ON public.settings;
CREATE POLICY "Public access settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);`;
                    navigator.clipboard.writeText(sql);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 3000);
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md transition-colors"
                >
                  {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSql ? '¡Copiado al Portapapeles!' : 'Copiar Script SQL'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSqlModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Previsualización y Descarga de PDF */}
      {selectedRecordForPreview && (
        <PayslipPreviewModal
          isOpen={true}
          onClose={() => setSelectedRecordForPreview(null)}
          worker={selectedRecordForPreview.worker}
          record={selectedRecordForPreview.record}
          settings={settings}
        />
      )}
    </div>
  );
};
