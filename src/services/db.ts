import { Worker, CompanySettings, BiweeklyRecord } from '../types';
import { getSupabase, isSupabaseConfigured } from './supabase';
import {
  getStoredWorkers, saveWorkers,
  getStoredSettings, saveSettings,
  getStoredRecords, saveRecord, deleteRecord as deleteStoredRecord,
  deleteWorker as deleteStoredWorker
} from './storage';

/**
 * Mapeo de Operario a tabla Supabase
 */
function workerToDb(w: Worker) {
  return {
    id: w.id,
    name: w.name,
    document_id: w.documentId,
    role: w.role,
    biweekly_salary: w.biweeklySalary,
    monthly_salary: w.monthlySalary,
    active: w.active,
    pin: w.pin,
    phone: w.phone || null,
    created_at: w.createdAt || new Date().toISOString()
  };
}

function dbToWorker(row: any): Worker {
  return {
    id: row.id,
    name: row.name,
    documentId: row.document_id,
    role: row.role,
    biweeklySalary: Number(row.biweekly_salary),
    monthlySalary: Number(row.monthly_salary),
    active: Boolean(row.active),
    pin: row.pin,
    phone: row.phone || undefined,
    createdAt: row.created_at
  };
}

/**
 * Mapeo de Quincena a tabla Supabase
 */
function recordToDb(r: BiweeklyRecord) {
  return {
    id: r.id,
    worker_id: r.workerId,
    period_name: r.periodName,
    period_year: r.periodYear,
    period_month: r.periodMonth,
    period_half: r.periodHalf,
    worked_full_period: r.workedFullPeriod,
    missed_days_total: r.missedDaysTotal,
    missed_days_justified: r.missedDaysJustified,
    missed_days_unjustified: r.missedDaysUnjustified,
    justification_reason: r.justificationReason || null,
    shifts: r.shifts || [],
    bonus: r.bonus || 0,
    deduction: r.deduction || 0,
    admin_notes: r.adminNotes || null,
    status: r.status,
    summary: r.summary,
    created_at: r.createdAt || new Date().toISOString(),
    updated_at: r.updatedAt || new Date().toISOString()
  };
}

function dbToRecord(row: any): BiweeklyRecord {
  return {
    id: row.id,
    workerId: row.worker_id,
    periodName: row.period_name,
    periodYear: Number(row.period_year),
    periodMonth: Number(row.period_month),
    periodHalf: Number(row.period_half) as 1 | 2,
    workedFullPeriod: Boolean(row.worked_full_period),
    missedDaysTotal: Number(row.missed_days_total || 0),
    missedDaysJustified: Number(row.missed_days_justified || 0),
    missedDaysUnjustified: Number(row.missed_days_unjustified || 0),
    justificationReason: row.justification_reason || undefined,
    shifts: Array.isArray(row.shifts) ? row.shifts : [],
    bonus: Number(row.bonus || 0),
    deduction: Number(row.deduction || 0),
    adminNotes: row.admin_notes || undefined,
    status: row.status,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ==========================================
// OPERARIOS
// ==========================================

export async function fetchWorkers(): Promise<Worker[]> {
  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data) {
        const mapped = data.map(dbToWorker);
        saveWorkers(mapped); // Cache local
        return mapped;
      }
    } catch (err) {
      console.warn('Error trayendo operarios de la nube, usando local:', err);
    }
  }
  return getStoredWorkers();
}

export async function upsertWorker(worker: Worker): Promise<void> {
  const current = getStoredWorkers();
  const exists = current.some(w => w.id === worker.id);
  const updated = exists ? current.map(w => (w.id === worker.id ? worker : w)) : [...current, worker];
  saveWorkers(updated);

  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('workers').upsert(workerToDb(worker));
    } catch (err) {
      console.warn('Error guardando operario en la nube:', err);
    }
  }
}

export async function deleteWorkerDb(workerId: string): Promise<Worker[]> {
  const updated = deleteStoredWorker(workerId);

  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('workers').delete().eq('id', workerId);
    } catch (err) {
      console.warn('Error eliminando operario de la nube:', err);
    }
  }

  return updated;
}

// ==========================================
// REGISTROS / QUINCENAS
// ==========================================

export async function fetchRecords(): Promise<BiweeklyRecord[]> {
  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('records')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map(dbToRecord);
        mapped.forEach(r => saveRecord(r)); // Cache local
        return mapped;
      }
    } catch (err) {
      console.warn('Error trayendo registros de la nube, usando local:', err);
    }
  }
  return getStoredRecords();
}

export async function upsertRecord(record: BiweeklyRecord): Promise<void> {
  saveRecord(record);

  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('records').upsert(recordToDb(record));
    } catch (err) {
      console.warn('Error guardando quincena en la nube:', err);
    }
  }
}

export async function deleteRecordDb(recordId: string): Promise<void> {
  deleteStoredRecord(recordId);

  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('records').delete().eq('id', recordId);
    } catch (err) {
      console.warn('Error eliminando quincena de la nube:', err);
    }
  }
}

// ==========================================
// CONFIGURACIÓN DE EMPRESA
// ==========================================

export async function fetchSettings(): Promise<CompanySettings> {
  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('data')
        .eq('id', 'company_settings')
        .single();

      if (!error && data && data.data) {
        saveSettings(data.data);
        return data.data;
      }
    } catch (err) {
      console.warn('Error trayendo configuración de la nube, usando local:', err);
    }
  }
  return getStoredSettings();
}

export async function upsertSettings(settings: CompanySettings): Promise<void> {
  saveSettings(settings);

  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('settings').upsert({
        id: 'company_settings',
        data: settings,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Error guardando configuración en la nube:', err);
    }
  }
}
