import React, { useState } from 'react';
import { X, FileDown, CheckCircle, Building2, Wrench, ShieldCheck } from 'lucide-react';
import { Worker, CompanySettings, BiweeklyRecord } from '../types';
import { generatePayslipPDF } from '../services/pdfService';
import { formatCOP } from '../services/payrollCalculator';

interface PayslipPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: Worker;
  record: BiweeklyRecord;
  settings: CompanySettings;
}

export const PayslipPreviewModal: React.FC<PayslipPreviewModalProps> = ({
  isOpen,
  onClose,
  worker,
  record,
  settings
}) => {
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const summary = record.summary;

  const handleDownloadPDF = () => {
    try {
      setDownloading(true);
      const doc = generatePayslipPDF(worker, record, settings);
      const safeName = worker.name.replace(/\s+/g, '_');
      const safePeriod = record.periodName.replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`Colilla_${safeName}_${safePeriod}.pdf`);
    } catch (err) {
      console.error('Error generando PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  const asistenciaTexto = record.workedFullPeriod || (record.missedDaysUnjustified === 0)
    ? 'Quincena Completa'
    : `Con ausencias (${record.missedDaysUnjustified} día(s) desc.)`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <FileDown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Comprobante Informativo de Pago</h3>
              <p className="text-[11px] text-slate-400">{record.periodName}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/30 disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              <span>{downloading ? 'Generando...' : 'Descargar PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hoja / Contenido de la Colilla (Informativa para el Empleado) */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950 space-y-6 text-slate-200">
          <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 space-y-6">
            {/* Top Bar Informativo */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b-2 border-slate-900 gap-2">
              <div>
                <h1 className="text-lg font-black text-slate-900 tracking-wide uppercase">
                  Comprobante Informativo de Pago
                </h1>
                <p className="text-xs text-slate-600">
                  Resumen de liquidación quincenal para consulta y control del trabajador
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full border border-blue-300">
                  {record.periodName}
                </span>
              </div>
            </div>

            {/* Datos del Operario */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Operario:</span>
                <span className="font-bold text-slate-900 text-sm">{worker.name}</span>
                <span className="text-slate-600 block">C.C. {worker.documentId} &bull; {worker.role}</span>
              </div>
              <div className="sm:text-right">
                <span className="text-slate-500 block">Jornada Ordinaria:</span>
                <span className="text-emerald-700 font-bold block text-sm">
                  {asistenciaTexto}
                </span>
                <span className="text-slate-500 block text-[11px] mt-0.5">Lunes a Viernes</span>
              </div>
            </div>

            {/* Desglose Oficial: Solo Salario Mínimo y Pago No Salarial */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 border-b border-slate-300 pb-2">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Conceptos de Pago y Liquidación
                </h3>
              </div>

              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l-md">Concepto de Pago</th>
                    <th className="py-2.5 px-3">Descripción</th>
                    <th className="py-2.5 px-3 text-right rounded-r-md">Total Liquidado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      1. Salario Mínimo Legal Quincenal (SMLV)
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      Salario legal fijado por la quincena completa de labores
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-blue-900 text-sm">
                      {formatCOP(summary.totalSalarial)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900 align-top">
                      2. Pago No Salarial - Alquiler de Herramientas y Equipos
                    </td>
                    <td className="py-3 px-3 text-slate-600 align-top">
                      Canon de arrendamiento, uso, desgaste y mantenimiento de herramientas y equipos propios aportados para las labores ordinarias y adicionales (Art. 128 Código Sustantivo del Trabajo).
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 text-sm align-top">
                      {formatCOP(summary.totalNoSalarial)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Resumen Final de Totales */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="text-xs text-slate-600 space-y-1">
                <div>Total Salarial: <strong className="text-slate-900">{formatCOP(summary.totalSalarial)}</strong></div>
                <div>Total No Salarial: <strong className="text-slate-900">{formatCOP(summary.totalNoSalarial)}</strong></div>
              </div>

              <div className="bg-blue-900 text-white px-5 py-3 rounded-lg text-right w-full sm:w-auto">
                <span className="text-[10px] text-blue-200 block uppercase tracking-wider font-semibold">
                  Neto a Transferir
                </span>
                <span className="text-xl font-black">
                  {formatCOP(summary.totalNetoAPagar)}
                </span>
              </div>
            </div>

            {/* Cláusula Legal Art. 128 */}
            <p className="text-[10px] text-slate-500 italic leading-tight">
              Nota Legal: Las sumas pactadas bajo el concepto de Pago No Salarial corresponden exclusivamente al canon de arrendamiento y depreciación de herramientas y equipos aportados por el operario, y expresamente no constituyen salario ni factor prestacional, al amparo del artículo 128 del Código Sustantivo del Trabajo de Colombia.
            </p>

            {/* Pie Informativo Exclusivo del Operario */}
            <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-slate-600 gap-3">
              <div>
                <span className="text-slate-500 block text-[11px]">Trabajador / Beneficiario:</span>
                <span className="font-bold text-slate-900 text-sm">{worker.name}</span>
                <span className="text-slate-500 block text-[11px]">C.C. {worker.documentId} &bull; {worker.role}</span>
              </div>
              <div className="text-left sm:text-right text-[11px] text-slate-500 italic max-w-xs">
                * Documento de carácter informativo personal para consulta y verificación de los ingresos quincenales del operario.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
