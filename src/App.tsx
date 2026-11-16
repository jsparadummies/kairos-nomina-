import React, { useState, useEffect } from 'react';
import { Users, Shield, Lock, ArrowRight, Wrench, Building2, CheckCircle2, UserPlus, LogIn, DollarSign } from 'lucide-react';
import { Worker, CompanySettings, BiweeklyRecord } from './types';
import {
  getStoredWorkers, saveWorkers,
  getStoredSettings, saveSettings,
  getStoredRecords,
  getStoredSession, saveSession, clearSession, SessionState
} from './services/storage';
import {
  fetchWorkers, upsertWorker, deleteWorkerDb,
  fetchRecords, upsertRecord, deleteRecordDb,
  fetchSettings, upsertSettings
} from './services/db';
import { isSupabaseConfigured } from './services/supabase';
import { Navbar } from './components/Navbar';
import { WorkerPortal } from './components/WorkerPortal';
import { AdminPortal } from './components/AdminPortal';
import { formatCOP, getDailyRate, getHourlyRate } from './services/payrollCalculator';

export const App: React.FC = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(getStoredSettings());
  const [records, setRecords] = useState<BiweeklyRecord[]>([]);
  const [session, setSession] = useState<SessionState>({ role: null });

  // Estados de Login / Rol
  const [selectedRoleChoice, setSelectedRoleChoice] = useState<'worker' | 'admin' | null>(null);
  const [workerAuthMode, setWorkerAuthMode] = useState<'login' | 'register'>('login');

  // Login de Operario existente
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [workerPin, setWorkerPin] = useState<string>('');

  // Registro de Operario nuevo (Auto-registro)
  const [regName, setRegName] = useState<string>('');
  const [regDocumentId, setRegDocumentId] = useState<string>('');
  const [regRole, setRegRole] = useState<string>('Operario de Obra');
  const [regBiweeklySalary, setRegBiweeklySalary] = useState<number>(1285000);
  const [regPin, setRegPin] = useState<string>('');

  // Login Jefe
  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  // Carga inicial (Híbrida: Local inmediata + Nube)
  useEffect(() => {
    // 1. Carga inmediata local
    setWorkers(getStoredWorkers());
    setSettings(getStoredSettings());
    setRecords(getStoredRecords());
    const loadedSession = getStoredSession();
    if (loadedSession.role) {
      setSession(loadedSession);
    }

    // 2. Sincronización en la nube (Supabase) si está activo
    fetchWorkers().then(w => setWorkers(w));
    fetchSettings().then(s => setSettings(s));
    fetchRecords().then(r => setRecords(r));
  }, []);

  const handleUpdateWorkers = async (newWorkers: Worker[]) => {
    setWorkers(newWorkers);
    saveWorkers(newWorkers);
    for (const w of newWorkers) {
      await upsertWorker(w);
    }
  };

  const handleDeleteWorker = async (workerId: string) => {
    const updated = await deleteWorkerDb(workerId);
    setWorkers(updated);
    if (session.workerId === workerId) {
      handleLogout();
    }
  };

  const handleUpdateSettings = async (newSettings: CompanySettings) => {
    setSettings(newSettings);
    await upsertSettings(newSettings);
  };

  const handleSaveRecord = async (record: BiweeklyRecord) => {
    await upsertRecord(record);
    const recs = await fetchRecords();
    setRecords(recs);
  };

  const handleDeleteRecord = async (recordId: string) => {
    await deleteRecordDb(recordId);
    const recs = await fetchRecords();
    setRecords(recs);
  };

  // Iniciar Sesión Operario existente
  const handleWorkerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const targetWorker = workers.find(w => w.id === selectedWorkerId);
    if (!targetWorker) {
      setLoginError('Por favor selecciona tu nombre.');
      return;
    }

    if (targetWorker.pin && workerPin.trim() !== targetWorker.pin) {
      setLoginError('El PIN ingresado es incorrecto.');
      return;
    }

    const newSession: SessionState = { role: 'worker', workerId: targetWorker.id };
    setSession(newSession);
    saveSession(newSession);
    setSelectedRoleChoice(null);
    setWorkerPin('');
  };

  // Auto-registro de Operario nuevo
  const handleWorkerRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!regName.trim() || !regDocumentId.trim() || !regPin.trim()) {
      setLoginError('Por favor completa todos los campos.');
      return;
    }

    // Verificar si ya existe esa cédula
    if (workers.some(w => w.documentId === regDocumentId.trim())) {
      setLoginError('Ya existe un operario registrado con esta cédula. Selecciona tu nombre en la pestaña "Ingresar".');
      return;
    }

    const newWorker: Worker = {
      id: `worker-${Date.now()}`,
      name: regName.trim(),
      documentId: regDocumentId.trim(),
      role: regRole.trim() || 'Operario de Obra',
      biweeklySalary: Number(regBiweeklySalary) || 1285000,
      monthlySalary: (Number(regBiweeklySalary) || 1285000) * 2,
      active: true,
      pin: regPin.trim(),
      createdAt: new Date().toISOString()
    };

    const updatedWorkers = [...workers, newWorker];
    setWorkers(updatedWorkers);
    saveWorkers(updatedWorkers);
    upsertWorker(newWorker);

    // Iniciar sesión de inmediato
    const newSession: SessionState = { role: 'worker', workerId: newWorker.id };
    setSession(newSession);
    saveSession(newSession);

    // Resetear formulario
    setSelectedRoleChoice(null);
    setRegName('');
    setRegDocumentId('');
    setRegPin('');
  };

  // Iniciar Sesión Jefe
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (adminPinInput.trim() === settings.adminPin) {
      const newSession: SessionState = { role: 'admin' };
      setSession(newSession);
      saveSession(newSession);
      setSelectedRoleChoice(null);
      setAdminPinInput('');
    } else {
      setLoginError('PIN de Administrador incorrecto (por defecto: 1234).');
    }
  };

  const handleLogout = () => {
    clearSession();
    setSession({ role: null });
    setSelectedRoleChoice(null);
    setLoginError('');
  };

  const activeWorkersList = workers.filter(w => w.active);
  const currentActiveWorker = workers.find(w => w.id === session.workerId) || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Navbar Superior */}
      <Navbar
        currentRole={session.role}
        activeWorker={currentActiveWorker}
        settings={settings}
        onSelectRole={role => {
          setSelectedRoleChoice(role);
          setLoginError('');
          if (role === 'worker') {
            if (activeWorkersList.length > 0) {
              setWorkerAuthMode('login');
              setSelectedWorkerId(activeWorkersList[0].id);
            } else {
              setWorkerAuthMode('register');
            }
          }
        }}
        onLogout={handleLogout}
      />

      {/* Contenido Principal */}
      <main className="flex-1">
        {/* --- PANTALLA PRINCIPAL DE ACCESO / SELECCIÓN DE ROL --- */}
        {!session.role && (
          <div className="max-w-4xl mx-auto px-4 py-12 sm:py-20 flex flex-col items-center justify-center text-center space-y-8">
            <div className="space-y-3">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-semibold">
                <Building2 className="w-3.5 h-3.5" />
                <span>KAIROS CONSTRUCCIÓN & PROYECTOS</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Control de Quincenas y Nómina
              </h1>
              <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
                Crea tu usuario, registra tus jornadas, extras o turnos adicionales y obtén tu comprobante de liquidación con desglose oficial legal.
              </p>
            </div>

            {/* Selector de Acceso */}
            {!selectedRoleChoice ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-xl">
                {/* Botón Operario */}
                <div
                  onClick={() => {
                    setSelectedRoleChoice('worker');
                    if (activeWorkersList.length > 0) {
                      setWorkerAuthMode('login');
                      setSelectedWorkerId(activeWorkersList[0].id);
                    } else {
                      setWorkerAuthMode('register');
                    }
                  }}
                  className="bg-slate-900 border border-slate-800 hover:border-blue-500/60 p-6 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-2xl hover:shadow-blue-600/20 text-left group space-y-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                      Soy Operario
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Crea tu cuenta, indica cuánto ganas quincenal, registra tus horas y descarga tu PDF.
                    </p>
                  </div>
                  <div className="flex items-center text-xs font-semibold text-blue-400 space-x-1 pt-2">
                    <span>Crear cuenta o ingresar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Botón Jefe */}
                <div
                  onClick={() => setSelectedRoleChoice('admin')}
                  className="bg-slate-900 border border-slate-800 hover:border-indigo-500/60 p-6 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-2xl hover:shadow-indigo-600/20 text-left group space-y-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                      Soy el Jefe
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Supervisa operarios, corrige salarios ("gana más o menos"), revisa quincenas y elimina perfiles.
                    </p>
                  </div>
                  <div className="flex items-center text-xs font-semibold text-indigo-400 space-x-1 pt-2">
                    <span>Panel de administración</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ) : selectedRoleChoice === 'worker' ? (
              /* --- TARJETA DE OPERARIO: LOGIN O AUTO-REGISTRO --- */
              <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl w-full max-w-md shadow-2xl text-left space-y-5 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-bold text-white">Portal de Operarios</h3>
                  </div>
                  <button
                    onClick={() => setSelectedRoleChoice(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Volver
                  </button>
                </div>

                {/* Pestañas: Ingresar vs Crear Cuenta */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setWorkerAuthMode('login'); setLoginError(''); }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                      workerAuthMode === 'login'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Ingresar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setWorkerAuthMode('register'); setLoginError(''); }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                      workerAuthMode === 'register'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Crear Cuenta</span>
                  </button>
                </div>

                {loginError && (
                  <div className="bg-red-900/40 border border-red-500/50 text-red-300 px-3 py-2 rounded-xl text-xs">
                    {loginError}
                  </div>
                )}

                {/* PESTAÑA 1: INICIAR SESIÓN */}
                {workerAuthMode === 'login' && (
                  activeWorkersList.length === 0 ? (
                    <div className="text-center py-6 space-y-3">
                      <p className="text-xs text-slate-400">
                        No hay usuarios registrados aún. Haz clic en <strong>"Crear Cuenta"</strong> para registrar tu perfil de operario.
                      </p>
                      <button
                        onClick={() => setWorkerAuthMode('register')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl"
                      >
                        Crear mi Cuenta de Operario
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleWorkerLogin} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Selecciona tu Nombre
                        </label>
                        <select
                          value={selectedWorkerId}
                          onChange={e => setSelectedWorkerId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                          {activeWorkersList.map(w => (
                            <option key={w.id} value={w.id}>
                              {w.name} ({w.role}) - {formatCOP(w.biweeklySalary)}/qna
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Tu PIN de Acceso (4 dígitos)
                        </label>
                        <input
                          type="password"
                          placeholder="Ingresa tu PIN"
                          maxLength={6}
                          value={workerPin}
                          onChange={e => setWorkerPin(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white tracking-widest font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/30"
                      >
                        Entrar a mi Quincena
                      </button>
                    </form>
                  )
                )}

                {/* PESTAÑA 2: AUTO-REGISTRO DEL OPERARIO */}
                {workerAuthMode === 'register' && (
                  <form onSubmit={handleWorkerRegister} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Nombre y Apellidos
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Carlos Gómez"
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Cédula
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Número de cédula"
                          value={regDocumentId}
                          onChange={e => setRegDocumentId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Crea tu PIN (4 dígitos)
                        </label>
                        <input
                          type="password"
                          required
                          maxLength={6}
                          placeholder="Ej: 1234"
                          value={regPin}
                          onChange={e => setRegPin(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Cargo u Oficio
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Operario de Obra, Soldador, Oficial..."
                        value={regRole}
                        onChange={e => setRegRole(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    {/* ¿Cuánto te ganas quincenal? */}
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-blue-900/50 space-y-1.5">
                      <label className="block text-xs font-bold text-blue-400">
                        ¿Cuánto ganas por quincena? (COP)
                      </label>
                      <div className="relative">
                        <DollarSign className="w-4 h-4 text-emerald-400 absolute left-3 top-2" />
                        <input
                          type="number"
                          step="5000"
                          required
                          value={regBiweeklySalary}
                          onChange={e => setRegBiweeklySalary(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-emerald-400 font-bold"
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 flex justify-between pt-1">
                        <span>Valor Día: <strong>{formatCOP(getDailyRate(regBiweeklySalary))}</strong></span>
                        <span>Hora: <strong>{formatCOP(getHourlyRate(regBiweeklySalary))}</strong></span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/30"
                    >
                      Crear Cuenta y Entrar
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* --- FORMULARIO JEFE --- */
              <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl w-full max-w-md shadow-2xl text-left space-y-5 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white">Ingreso del Jefe / Administrador</h3>
                  </div>
                  <button
                    onClick={() => setSelectedRoleChoice(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Volver
                  </button>
                </div>

                {loginError && (
                  <div className="bg-red-900/40 border border-red-500/50 text-red-300 px-3 py-2 rounded-xl text-xs">
                    {loginError}
                  </div>
                )}

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      PIN del Jefe
                    </label>
                    <input
                      type="password"
                      placeholder="PIN (por defecto: 1234)"
                      value={adminPinInput}
                      onChange={e => setAdminPinInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white tracking-widest font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">
                      El PIN por defecto es <strong className="text-slate-300">1234</strong> (lo puedes cambiar adentro).
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30"
                  >
                    Acceder al Panel del Jefe
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* --- VISTA: OPERARIO LOGUEADO --- */}
        {session.role === 'worker' && currentActiveWorker && (
          <WorkerPortal
            worker={currentActiveWorker}
            settings={settings}
            existingRecords={records}
            onSaveRecord={handleSaveRecord}
          />
        )}

        {/* --- VISTA: JEFE LOGUEADO --- */}
        {session.role === 'admin' && (
          <AdminPortal
            workers={workers}
            settings={settings}
            records={records}
            onUpdateWorkers={handleUpdateWorkers}
            onDeleteWorker={handleDeleteWorker}
            onUpdateSettings={handleUpdateSettings}
            onUpdateRecord={handleSaveRecord}
            onDeleteRecord={handleDeleteRecord}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} {settings.companyName} &bull; Sistema de Nómina y Alquiler de Equipos</p>
      </footer>
    </div>
  );
};
