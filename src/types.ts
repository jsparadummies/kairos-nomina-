export interface Worker {
  id: string;
  name: string;
  documentId: string; // Cédula de ciudadanía
  role: string; // Cargo, e.g. "Operario de Obra"
  biweeklySalary: number; // Compensación quincenal acordada (ej. 1285000)
  monthlySalary: number; // Compensación mensual total (biweeklySalary * 2)
  active: boolean;
  pin: string; // PIN de 4 dígitos para ingresar
  phone?: string;
  createdAt?: string;
}

export interface CompanySettings {
  companyName: string;
  nit: string;
  representativeName: string;

  // Parámetros Salario Mínimo Legal Colombia (Quincena Completa)
  biweeklyBaseSalary: number; // Salario Básico Quincenal ($875.453 COP)
  biweeklyTransportAllowance: number; // Auxilio Transporte Quincenal ($124.547 COP)
  healthDeductionPercent: number; // Deducción Salud EPS (4%)
  pensionDeductionPercent: number; // Deducción Pensión (4%)
  biweeklyMinimumWage: number; // Neto Salarial resultante: $929.964 (~$930.000 COP)
  
  // Recargos y Factores (editables por el jefe)
  saturdayFactor: number; // 1.0 (Día ordinario)
  sundayRecargoPercent: number; // 50% acordado (factor 1.5)
  holidayRecargoPercent: number; // 50% acordado (factor 1.5)
  nightShiftRecargoPercent: number; // 35% recargo noche ordinaria
  extraDayRecargoPercent: number; // 25% extra diurna
  extraNightRecargoPercent: number; // 75% extra nocturna
  
  adminPin: string; // PIN para ingresar al panel de Jefe
}

export type ShiftType = 
  | 'saturday'       // Sábado adicional
  | 'sunday'         // Domingo (50%)
  | 'holiday'        // Festivo (50%)
  | 'night_shift'    // Turno u horas nocturnas ordinarias (+35%)
  | 'overtime_day'   // Hora extra diurna (+25%)
  | 'overtime_night'; // Hora extra nocturna (+75%)

export interface WorkShift {
  id: string;
  date: string; // YYYY-MM-DD
  type: ShiftType;
  startTime?: string;
  endTime?: string;
  hours: number;
  notes?: string;
  rateApplied: number;
  totalAmount: number;
}

export interface PayrollSummary {
  biweeklySalary: number;
  monthlySalary: number;
  dailyValue: number;
  hourlyValue: number;
  
  // Control de Quincena y Ausencias
  workedFullPeriod: boolean;
  missedDaysTotal: number;
  missedDaysJustified: number;
  missedDaysUnjustified: number;
  unjustifiedDeductionAmount: number; // Días sin justificación * valor día
  
  // Bloque 1: Salarial Oficial Colombia (~$930.000 neto quincenal)
  salarioBasicoQuincenal: number; // $875.453
  auxilioTransporteQuincenal: number; // $124.547
  totalDevengadoSalarial: number; // $1.000.000
  deduccionSalud: number; // -$35.018 (4%)
  deduccionPension: number; // -$35.018 (4%)
  totalDeduccionesLey: number; // -$70.036
  netoSalarialLegal: number; // $929.964 (~$930.000)
  salarioFijoSalarial: number; // Alias para neto salarial legal
  smlvQuincenal: number;
  
  // Bloque 2: No Salarial (Total englobado como Alquiler de Herramientas y Equipos)
  totalNoSalarialAlquilerEquipos: number;
  
  // Cálculos internos (para control interno en la app, NO salen en el PDF)
  alquilerEquiposBase: number;
  totalSabadolaborado: number;
  totalDomingolaborado: number;
  totalFestivolaborado: number;
  totalNocheOrdinaria: number;
  totalExtraDiurna: number;
  totalExtraNocturna: number;
  
  // Ajustes de Jefe
  bonuses: number;
  deductions: number;
  adminNotes?: string;

  // Totales
  totalSalarial: number;
  totalNoSalarial: number;
  totalNetoAPagar: number;
}

export interface BiweeklyRecord {
  id: string;
  workerId: string;
  periodName: string; // ej. "1ra Quincena - Noviembre 2026"
  periodYear: number;
  periodMonth: number; // 1-12
  periodHalf: 1 | 2; // 1: días 1 al 15, 2: días 16 al fin de mes
  
  // Asistencia Quincenal
  workedFullPeriod: boolean; // ¿Trabajó la quincena completa de lunes a viernes?
  missedDaysTotal: number;   // Cuántos días faltó en total
  missedDaysJustified: number; // Días con justificación (NO se descuentan)
  missedDaysUnjustified: number; // Días sin justificación (SE DESCUENTAN)
  justificationReason?: string; // Motivo de la justificación
  
  shifts: WorkShift[];
  
  // Ajustes directos del jefe
  bonus: number;
  deduction: number;
  adminNotes: string;
  
  status: 'borrador' | 'enviado' | 'aprobado';
  createdAt: string;
  updatedAt: string;
  summary: PayrollSummary;
}
