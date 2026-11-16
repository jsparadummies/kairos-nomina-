import { Worker, CompanySettings, BiweeklyRecord } from '../types';
import { DEFAULT_SETTINGS, calculatePayrollSummary } from './payrollCalculator';

const WORKERS_STORAGE_KEY = 'kairos_nomina_workers_v2';
const SETTINGS_STORAGE_KEY = 'kairos_nomina_settings_v1';
const RECORDS_STORAGE_KEY = 'kairos_nomina_records_v1';
const SESSION_STORAGE_KEY = 'kairos_nomina_session_v1';

// Sin nombres ni operarios predeterminados por defecto:
export const INITIAL_WORKERS: Worker[] = [];

export function getStoredWorkers(): Worker[] {
  try {
    if (localStorage.getItem('kairos_nomina_workers_v1')) {
      localStorage.removeItem('kairos_nomina_workers_v1');
    }

    const raw = localStorage.getItem(WORKERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(WORKERS_STORAGE_KEY, JSON.stringify(INITIAL_WORKERS));
      return INITIAL_WORKERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_WORKERS;
  }
}

export function saveWorkers(workers: Worker[]): void {
  localStorage.setItem(WORKERS_STORAGE_KEY, JSON.stringify(workers));
}

export function deleteWorker(workerId: string): Worker[] {
  const workers = getStoredWorkers().filter(w => w.id !== workerId);
  saveWorkers(workers);
  return workers;
}

export function getStoredSettings(): CompanySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    // Si tenía un valor anterior menor a los ~$930.000 oficiales (con auxilio y deducciones EPS/Pensión), actualizar
    if (!parsed.biweeklyMinimumWage || parsed.biweeklyMinimumWage < 900000) {
      parsed.biweeklyBaseSalary = DEFAULT_SETTINGS.biweeklyBaseSalary;
      parsed.biweeklyTransportAllowance = DEFAULT_SETTINGS.biweeklyTransportAllowance;
      parsed.healthDeductionPercent = DEFAULT_SETTINGS.healthDeductionPercent;
      parsed.pensionDeductionPercent = DEFAULT_SETTINGS.pensionDeductionPercent;
      parsed.biweeklyMinimumWage = DEFAULT_SETTINGS.biweeklyMinimumWage;
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(parsed));
    }
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: CompanySettings): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function getStoredRecords(): BiweeklyRecord[] {
  try {
    const raw = localStorage.getItem(RECORDS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveRecord(record: BiweeklyRecord): void {
  const records = getStoredRecords();
  const existingIdx = records.findIndex(r => r.id === record.id);
  if (existingIdx >= 0) {
    records[existingIdx] = record;
  } else {
    records.unshift(record);
  }
  localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
}

export function deleteRecord(recordId: string): void {
  const records = getStoredRecords().filter(r => r.id !== recordId);
  localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
}

export interface SessionState {
  role: 'admin' | 'worker' | null;
  workerId?: string;
}

export function getStoredSession(): SessionState {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return { role: null };
    return JSON.parse(raw);
  } catch {
    return { role: null };
  }
}

export function saveSession(session: SessionState): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}
