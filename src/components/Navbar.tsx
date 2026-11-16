import React from 'react';
import { Users, Shield, LogOut, Clock, FileSpreadsheet, Building2 } from 'lucide-react';
import { Worker, CompanySettings } from '../types';

interface NavbarProps {
  currentRole: 'worker' | 'admin' | null;
  activeWorker: Worker | null;
  settings: CompanySettings;
  onSelectRole: (role: 'worker' | 'admin' | null) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  activeWorker,
  settings,
  onSelectRole,
  onLogout
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectRole(null)}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-lg shadow-md border border-blue-400/30">
              K
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-wider text-white">KAIROS</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                  NÓMINA & EQUIPOS
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Control de Quincenas y Pagos No Salariales</p>
            </div>
          </div>

          {/* User / Role Info & Navigation */}
          <div className="flex items-center space-x-3">
            {currentRole === 'worker' && activeWorker && (
              <div className="flex items-center space-x-3 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-semibold text-xs">
                  {activeWorker.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-semibold text-white leading-tight">{activeWorker.name}</div>
                  <div className="text-[11px] text-slate-400 leading-tight">{activeWorker.role}</div>
                </div>
                <button
                  onClick={onLogout}
                  title="Cambiar de usuario"
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {currentRole === 'admin' && (
              <div className="flex items-center space-x-3 bg-indigo-950/70 border border-indigo-700/50 px-3 py-1.5 rounded-lg">
                <Shield className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-200">Panel del Jefe</span>
                <button
                  onClick={onLogout}
                  title="Cerrar sesión de Jefe"
                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {!currentRole && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onSelectRole('worker')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-all shadow-sm"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Soy Operario</span>
                </button>
                <button
                  onClick={() => onSelectRole('admin')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Soy el Jefe</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
