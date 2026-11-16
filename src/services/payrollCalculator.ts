import { Worker, CompanySettings, WorkShift, PayrollSummary, ShiftType } from '../types';

export const DEFAULT_SETTINGS: CompanySettings = {
  companyName: 'KAIROS CONSTRUCCIÓN & PROYECTOS',
  nit: '901.234.567-8',
  representativeName: 'Administración Kairos',
  
  // Parámetros oficiales del Salario Mínimo Legal en Colombia (Quincena Completa)
  biweeklyBaseSalary: 875453,        // Básico Quincenal (Mitad de $1.750.905 mensual)
  biweeklyTransportAllowance: 124547,// Auxilio de Transporte Quincenal (Mitad de $249.095)
  healthDeductionPercent: 4,         // Descuento Salud EPS (4% sobre básico) = $35.018
  pensionDeductionPercent: 4,        // Descuento Pensión (4% sobre básico) = $35.018
  biweeklyMinimumWage: 929964,       // Neto salarial resultante quincena completa: $929.964 (~$930.000)

  saturdayFactor: 1.0,         // Sábado = Día ordinario (100%)
  sundayRecargoPercent: 50,    // Domingo = 50% de recargo acordado (1.5x)
  holidayRecargoPercent: 50,   // Festivo = 50% de recargo acordado (1.5x)
  nightShiftRecargoPercent: 35,// Recargo noche ordinaria legal (35%)
  extraDayRecargoPercent: 25,  // Hora extra diurna (25%)
  extraNightRecargoPercent: 75,// Hora extra nocturna (75%)
  adminPin: '1234'             // Clave por defecto para el jefe
};

/**
 * Calcula el valor del día según el salario quincenal pactado:
 * Salario Quincenal / 10.
 */
export function getDailyRate(biweeklySalary: number): number {
  return biweeklySalary / 10;
}

/**
 * Calcula el valor de la hora ordinaria:
 * Valor día / 8 horas de jornada.
 */
export function getHourlyRate(biweeklySalary: number): number {
  return getDailyRate(biweeklySalary) / 8;
}

/**
 * Calcula el valor de un turno o turno adicional según su tipo
 */
export function calculateShiftAmount(
  type: ShiftType,
  hours: number,
  biweeklySalary: number,
  settings: CompanySettings
): { rate: number; total: number } {
  const dailyRate = getDailyRate(biweeklySalary);
  const hourlyRate = getHourlyRate(biweeklySalary);

  let rate = hourlyRate;
  let total = 0;

  switch (type) {
    case 'saturday':
      // Se paga a valor de día ordinario
      rate = hourlyRate * settings.saturdayFactor;
      total = hours * rate;
      break;

    case 'sunday':
      // Domingo con recargo del 50% acordado (factor 1.5)
      rate = hourlyRate * (1 + settings.sundayRecargoPercent / 100);
      total = hours * rate;
      break;

    case 'holiday':
      // Festivo con recargo del 50% acordado (factor 1.5)
      rate = hourlyRate * (1 + settings.holidayRecargoPercent / 100);
      total = hours * rate;
      break;

    case 'night_shift':
      // Recargo por hora nocturna ordinaria (35%)
      rate = hourlyRate * (settings.nightShiftRecargoPercent / 100);
      total = hours * rate;
      break;

    case 'overtime_day':
      // Hora extra diurna (+25% = 1.25x)
      rate = hourlyRate * (1 + settings.extraDayRecargoPercent / 100);
      total = hours * rate;
      break;

    case 'overtime_night':
      // Hora extra nocturna (+75% = 1.75x)
      rate = hourlyRate * (1 + settings.extraNightRecargoPercent / 100);
      total = hours * rate;
      break;
  }

  return { rate, total: Math.round(total) };
}

/**
 * Calcula la liquidación de la quincena:
 * - El Salario Mínimo Legal Vigente Quincenal oficial en Colombia con auxilio de transporte
 *   y descuentos de ley (EPS 4% y Pensión 4%) corresponde a $929.964 (~$930.000).
 * - Las faltas injustificadas se descuentan de la compensación total.
 * - Todo el restante ganado se clasifica como Pago No Salarial por Alquiler de Herramientas y Equipos.
 */
export function calculatePayrollSummary(
  biweeklySalary: number,
  workedFullPeriod: boolean,
  missedDaysTotal: number,
  missedDaysJustified: number,
  missedDaysUnjustified: number,
  shifts: WorkShift[],
  settings: CompanySettings,
  bonus: number = 0,
  deduction: number = 0,
  adminNotes: string = ''
): PayrollSummary {
  const dailyValue = getDailyRate(biweeklySalary);
  const hourlyValue = getHourlyRate(biweeklySalary);
  const monthlySalary = biweeklySalary * 2;

  let totalMissed = 0;
  let justifiedCount = 0;
  let unjustifiedCount = 0;

  if (!workedFullPeriod) {
    unjustifiedCount = Math.max(0, missedDaysUnjustified);
    justifiedCount = Math.max(0, missedDaysJustified);
    totalMissed = Math.max(0, missedDaysTotal);
  }

  // Descuento en dinero aplicable ÚNICAMENTE a los días sin justificación
  const unjustifiedDeductionAmount = Math.round(unjustifiedCount * dailyValue);

  // Base devengada de la quincena (los días justificados permanecen pagos)
  const biweeklyEarnedBase = Math.max(0, biweeklySalary - unjustifiedDeductionAmount);

  // Sumatorias por concepto adicional
  let totalSabadolaborado = 0;
  let totalDomingolaborado = 0;
  let totalFestivolaborado = 0;
  let totalNocheOrdinaria = 0;
  let totalExtraDiurna = 0;
  let totalExtraNocturna = 0;

  for (const shift of shifts) {
    const { total } = calculateShiftAmount(shift.type, shift.hours, biweeklySalary, settings);
    shift.totalAmount = total;

    switch (shift.type) {
      case 'saturday':
        totalSabadolaborado += total;
        break;
      case 'sunday':
        totalDomingolaborado += total;
        break;
      case 'holiday':
        totalFestivolaborado += total;
        break;
      case 'night_shift':
        totalNocheOrdinaria += total;
        break;
      case 'overtime_day':
        totalExtraDiurna += total;
        break;
      case 'overtime_night':
        totalExtraNocturna += total;
        break;
    }
  }

  // Gran Total ganado en dinero por el operario en la quincena
  const totalEarnedOverall = Math.max(
    0,
    biweeklyEarnedBase +
      totalSabadolaborado +
      totalDomingolaborado +
      totalFestivolaborado +
      totalNocheOrdinaria +
      totalExtraDiurna +
      totalExtraNocturna +
      bonus -
      deduction
  );

  // --- CÁLCULO SALARIAL OFICIAL COLOMBIA (QUINCENA COMPLETA) ---
  const salarioBasicoQuincenal = settings.biweeklyBaseSalary || 875453;
  const auxilioTransporteQuincenal = settings.biweeklyTransportAllowance || 124547;
  const totalDevengadoSalarial = salarioBasicoQuincenal + auxilioTransporteQuincenal; // $1.000.000

  // Deducciones de ley EPS (4%) y Pensión (4%) calculadas sobre el salario básico
  const deduccionSalud = Math.round(salarioBasicoQuincenal * ((settings.healthDeductionPercent || 4) / 100)); // $35.018
  const deduccionPension = Math.round(salarioBasicoQuincenal * ((settings.pensionDeductionPercent || 4) / 100)); // $35.018
  const totalDeduccionesLey = deduccionSalud + deduccionPension; // $70.036

  // Neto Salarial que percibe en mano por la quincena completa ($929.964 ≈ $930.000 COP)
  const netoSalarialLegal = totalDevengadoSalarial - totalDeduccionesLey;

  let salarioFijoSalarial = netoSalarialLegal;
  let totalNoSalarialAlquilerEquipos = 0;

  if (totalEarnedOverall >= netoSalarialLegal) {
    salarioFijoSalarial = netoSalarialLegal;
    totalNoSalarialAlquilerEquipos = totalEarnedOverall - netoSalarialLegal;
  } else {
    salarioFijoSalarial = totalEarnedOverall;
    totalNoSalarialAlquilerEquipos = 0;
  }

  const totalSalarial = salarioFijoSalarial;
  const totalNoSalarial = totalNoSalarialAlquilerEquipos;
  const totalNetoAPagar = totalSalarial + totalNoSalarial;

  return {
    biweeklySalary,
    monthlySalary,
    dailyValue: Math.round(dailyValue),
    hourlyValue: Math.round(hourlyValue),
    workedFullPeriod,
    missedDaysTotal: totalMissed,
    missedDaysJustified: justifiedCount,
    missedDaysUnjustified: unjustifiedCount,
    unjustifiedDeductionAmount,
    salarioBasicoQuincenal,
    auxilioTransporteQuincenal,
    totalDevengadoSalarial,
    deduccionSalud,
    deduccionPension,
    totalDeduccionesLey,
    netoSalarialLegal,
    smlvQuincenal: netoSalarialLegal,
    salarioFijoSalarial,
    totalNoSalarialAlquilerEquipos,
    alquilerEquiposBase: Math.max(0, biweeklyEarnedBase - netoSalarialLegal),
    totalSabadolaborado,
    totalDomingolaborado,
    totalFestivolaborado,
    totalNocheOrdinaria,
    totalExtraDiurna,
    totalExtraNocturna,
    bonuses: bonus,
    deductions: deduction,
    adminNotes,
    totalSalarial,
    totalNoSalarial,
    totalNetoAPagar
  };
}

/** Formateador de moneda en pesos colombianos ($ COP) */
export function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(value);
}
