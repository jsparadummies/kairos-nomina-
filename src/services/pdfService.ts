import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Worker, CompanySettings, BiweeklyRecord } from '../types';
import { formatCOP } from './payrollCalculator';

export function generatePayslipPDF(
  worker: Worker,
  record: BiweeklyRecord,
  settings: CompanySettings
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const summary = record.summary;
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- ENCABEZADO INFORMATIVO (SIN DATOS DE LA EMPRESA) ---
  // Franja superior azul oscuro elegante
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Acento azul vibrante
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(0, 26, pageWidth, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('COMPROBANTE INFORMATIVO DE PAGO DE QUINCENA', 14, 12);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Documento informativo de ingresos y conceptos liquidados para el trabajador', 14, 18);
  doc.text(`Período: ${record.periodName}`, 14, 23);

  // Fecha emisión y uso informativo
  doc.setFontSize(8);
  doc.text(`Emisión: ${new Date(record.updatedAt || record.createdAt).toLocaleDateString('es-CO')}`, pageWidth - 14, 18, { align: 'right' });
  doc.text(`USO INFORMATIVO PERSONAL`, pageWidth - 14, 23, { align: 'right' });

  // --- DATOS DEL OPERARIO ---
  let startY = 35;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, startY, pageWidth - 28, 24, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL TRABAJADOR / OPERARIO', 18, startY + 6);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  // Columna 1
  doc.text(`Nombre: `, 18, startY + 12);
  doc.setFont('helvetica', 'bold');
  doc.text(worker.name, 35, startY + 12);

  doc.setFont('helvetica', 'normal');
  doc.text(`Cédula: `, 18, startY + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(worker.documentId, 35, startY + 18);

  // Columna 2
  const col2X = 110;
  doc.setFont('helvetica', 'normal');
  doc.text(`Cargo / Labor: `, col2X, startY + 12);
  doc.setFont('helvetica', 'bold');
  doc.text(worker.role, col2X + 35, startY + 12);

  const asistenciaTexto = record.workedFullPeriod || (record.missedDaysUnjustified === 0)
    ? 'Quincena Completa'
    : `Con ausencias (${record.missedDaysUnjustified} día(s) desc.)`;

  doc.setFont('helvetica', 'normal');
  doc.text(`Jornada Ordinaria: `, col2X, startY + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(asistenciaTexto, col2X + 35, startY + 18);

  // --- TABLA DE LIQUIDACIÓN: SOLO MÍNIMO LEGAL Y PAGO NO SALARIAL ---
  // (Por instrucción explícita del empleador, no se desglosan sábados ni extras en la colilla)
  startY = 66;

  const tableBody = [
    [
      '1. Salario Mínimo Legal Quincenal (SMLV)',
      'Salario legal fijado por la quincena completa de labores',
      'Quincena Completa',
      formatCOP(summary.totalSalarial)
    ],
    [
      '2. Pago No Salarial - Alquiler y Desgaste de Herramientas y Equipos',
      'Compensación y canon de arrendamiento por uso, transporte, desgaste y mantenimiento de herramientas y equipos propios aportados por el operario para la ejecución de labores (Art. 128 CST)',
      'Canon Quincenal',
      formatCOP(summary.totalNoSalarial)
    ]
  ];

  autoTable(doc, {
    startY,
    head: [['Concepto de Pago', 'Descripción y Fundamento Legal', 'Unidad / Período', 'Total Liquidado']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 5
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 80 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 22, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 14, right: 14 }
  });

  // --- CUADRO DE TOTALES ---
  // @ts-ignore
  let totalsY = doc.lastAutoTable.finalY + 8;

  const totalsBoxWidth = 85;
  const totalsBoxX = pageWidth - 14 - totalsBoxWidth;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(totalsBoxX, totalsY, totalsBoxWidth, 34, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.text('Total Devengos Salariales:', totalsBoxX + 4, totalsY + 6);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCOP(summary.totalSalarial), totalsBoxX + totalsBoxWidth - 4, totalsY + 6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text('Total Pagos No Salariales:', totalsBoxX + 4, totalsY + 13);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCOP(summary.totalNoSalarial), totalsBoxX + totalsBoxWidth - 4, totalsY + 13, { align: 'right' });

  // Línea divisoria
  doc.setDrawColor(203, 213, 225);
  doc.line(totalsBoxX + 4, totalsY + 17, totalsBoxX + totalsBoxWidth - 4, totalsY + 17);

  // Gran Total Destacado
  doc.setFillColor(30, 64, 175); // blue-800
  doc.roundedRect(totalsBoxX + 2, totalsY + 19, totalsBoxWidth - 4, 12, 1, 1, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('NETO A TRANSFERIR:', totalsBoxX + 5, totalsY + 27);
  doc.setFontSize(11);
  doc.text(formatCOP(summary.totalNetoAPagar), totalsBoxX + totalsBoxWidth - 5, totalsY + 27, { align: 'right' });

  // Cláusula legal (Código Sustantivo del Trabajo Art. 128)
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  const legalText =
    'Nota Legal: Las sumas liquidadas bajo el concepto de Pago No Salarial corresponden exclusivamente al canon de arrendamiento, uso y desgaste de herramientas y equipos de trabajo aportados de forma independiente por el operario para el desarrollo de sus labores, por lo cual expresamente NO constituyen salario ni factor prestacional, al amparo del artículo 128 del Código Sustantivo del Trabajo de Colombia.';
  doc.text(doc.splitTextToSize(legalText, totalsBoxX - 22), 14, totalsY + 8);

  // --- PIE INFORMATIVO EXCLUSIVO PARA EL EMPLEADO (SIN DATOS DE LA EMPRESA) ---
  const footerY = totalsY + 45;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, footerY, pageWidth - 28, 22, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`TRABAJADOR / BENEFICIARIO: ${worker.name.toUpperCase()}`, 18, footerY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Identificación: C.C. ${worker.documentId}   |   Cargo / Labor: ${worker.role}`, 18, footerY + 14);

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'italic');
  doc.text('* Este documento es de carácter estrictamente informativo para control personal del operario sobre sus ingresos y conceptos de la quincena.', 18, footerY + 19);

  return doc;
}
