import jsPDF from 'jspdf';
import { format } from 'date-fns';

/**
 * Parse a date string as local date to avoid timezone shifts.
 * For "YYYY-MM-DD" format, creates date in local timezone.
 */
export function parseLocalDate(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
}

// PDF configuration constants
export const PDF_CONFIG = {
  margin: 20,
  headerHeight: 25,
  lineHeight: 6,
  sectionGap: 15,
  colors: {
    navy: [15, 41, 66] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    black: [0, 0, 0] as [number, number, number],
    gray: [100, 100, 100] as [number, number, number],
    lightGray: [240, 240, 240] as [number, number, number],
    success: [22, 163, 74] as [number, number, number],
    error: [220, 38, 38] as [number, number, number],
  },
};

export interface PDFContext {
  doc: jsPDF;
  yPos: number;
  pageWidth: number;
  margin: number;
}

export function createPDFContext(): PDFContext {
  const doc = new jsPDF();
  return {
    doc,
    yPos: 20,
    pageWidth: doc.internal.pageSize.getWidth(),
    margin: PDF_CONFIG.margin,
  };
}

export function checkPageBreak(ctx: PDFContext, neededSpace: number): void {
  if (ctx.yPos + neededSpace > ctx.doc.internal.pageSize.getHeight() - 20) {
    ctx.doc.addPage();
    ctx.yPos = 20;
  }
}

export function addPageHeader(ctx: PDFContext, title: string): void {
  ctx.doc.setFillColor(...PDF_CONFIG.colors.navy);
  ctx.doc.rect(0, 0, ctx.pageWidth, 15, 'F');
  ctx.doc.setFontSize(10);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setTextColor(...PDF_CONFIG.colors.white);
  ctx.doc.text(title, ctx.margin, 10);
  ctx.doc.setTextColor(...PDF_CONFIG.colors.black);
  ctx.yPos = 25;
}

export function addCenteredTitle(ctx: PDFContext, text: string, fontSize: number = 16): void {
  ctx.doc.setFontSize(fontSize);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.text(text, ctx.pageWidth / 2, ctx.yPos, { align: 'center' });
  ctx.yPos += fontSize * 0.6;
}

export function addSectionHeader(ctx: PDFContext, text: string): void {
  checkPageBreak(ctx, 20);
  ctx.doc.setFontSize(12);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFillColor(...PDF_CONFIG.colors.navy);
  ctx.doc.rect(ctx.margin, ctx.yPos - 5, ctx.pageWidth - 2 * ctx.margin, 8, 'F');
  ctx.doc.setTextColor(...PDF_CONFIG.colors.white);
  ctx.doc.text(text, ctx.margin + 3, ctx.yPos);
  ctx.doc.setTextColor(...PDF_CONFIG.colors.black);
  ctx.yPos += 10;
}

export function addSubsectionHeader(ctx: PDFContext, text: string): void {
  checkPageBreak(ctx, 15);
  ctx.doc.setFontSize(11);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setTextColor(...PDF_CONFIG.colors.navy);
  ctx.doc.text(text, ctx.margin, ctx.yPos);
  ctx.doc.setTextColor(...PDF_CONFIG.colors.black);
  ctx.yPos += 8;
}

export function addLabelValue(ctx: PDFContext, label: string, value: string | number | boolean | undefined, labelWidth: number = 60): void {
  if (value === undefined || value === '') return;
  let displayValue = String(value);
  if (typeof value === 'boolean') {
    displayValue = value ? 'Yes' : 'No';
  }
  ctx.doc.setFontSize(10);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.text(label + ':', ctx.margin, ctx.yPos);
  ctx.doc.setFont('helvetica', 'normal');
  
  // Handle long text with wrapping
  const maxWidth = ctx.pageWidth - ctx.margin * 2 - labelWidth;
  const lines = ctx.doc.splitTextToSize(displayValue, maxWidth);
  ctx.doc.text(lines, ctx.margin + labelWidth, ctx.yPos);
  ctx.yPos += Math.max(6, lines.length * 5);
}

export function addParagraph(ctx: PDFContext, text: string, fontSize: number = 10): void {
  ctx.doc.setFontSize(fontSize);
  ctx.doc.setFont('helvetica', 'normal');
  const maxWidth = ctx.pageWidth - ctx.margin * 2;
  const lines = ctx.doc.splitTextToSize(text, maxWidth);
  checkPageBreak(ctx, lines.length * 5 + 5);
  ctx.doc.text(lines, ctx.margin, ctx.yPos);
  ctx.yPos += lines.length * 5 + 3;
}

export function addBoldParagraph(ctx: PDFContext, text: string, fontSize: number = 10): void {
  ctx.doc.setFontSize(fontSize);
  ctx.doc.setFont('helvetica', 'bold');
  const maxWidth = ctx.pageWidth - ctx.margin * 2;
  const lines = ctx.doc.splitTextToSize(text, maxWidth);
  checkPageBreak(ctx, lines.length * 5 + 5);
  ctx.doc.text(lines, ctx.margin, ctx.yPos);
  ctx.yPos += lines.length * 5 + 3;
}

export function addSignatureLine(ctx: PDFContext, name: string, title?: string, companyName?: string, includeDate: boolean = true): void {
  checkPageBreak(ctx, 35);
  ctx.yPos += 10;
  ctx.doc.setDrawColor(...PDF_CONFIG.colors.black);
  ctx.doc.line(ctx.margin, ctx.yPos, ctx.margin + 80, ctx.yPos);
  ctx.yPos += 5;
  ctx.doc.setFontSize(10);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.text(name, ctx.margin, ctx.yPos);
  if (title) {
    ctx.yPos += 5;
    ctx.doc.setFont('helvetica', 'italic');
    ctx.doc.text(title, ctx.margin, ctx.yPos);
  }
  if (companyName) {
    ctx.yPos += 5;
    ctx.doc.setFont('helvetica', 'normal');
    ctx.doc.text(companyName, ctx.margin, ctx.yPos);
  }
  ctx.yPos += 10;
}

export function addDateLine(ctx: PDFContext): void {
  ctx.doc.setFontSize(10);
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.text(`Date: ${format(new Date(), 'MMMM d, yyyy')}`, ctx.margin, ctx.yPos);
  ctx.yPos += 8;
}

export function formatCurrency(amount: number, unit: string): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
  return `${formatted} / ${unit}`;
}

export function formatDate(dateStr: string): string {
  try {
    // Parse date string as local date to avoid timezone shifts
    // For "YYYY-MM-DD" format, split and create date with local timezone
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return format(new Date(year, month - 1, day), 'MMMM d, yyyy');
    }
    return format(new Date(dateStr), 'MMMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function formatShortDate(dateStr: string): string {
  try {
    // Parse date string as local date to avoid timezone shifts
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return format(new Date(year, month - 1, day), 'MM/dd/yyyy');
    }
    return format(new Date(dateStr), 'MM/dd/yyyy');
  } catch {
    return dateStr;
  }
}

export function addPageNumber(ctx: PDFContext, pageNum: number, totalPages: number): void {
  const pageHeight = ctx.doc.internal.pageSize.getHeight();
  ctx.doc.setFontSize(8);
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setTextColor(...PDF_CONFIG.colors.gray);
  ctx.doc.text(
    `Page ${pageNum} of ${totalPages}`,
    ctx.pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
  ctx.doc.setTextColor(...PDF_CONFIG.colors.black);
}

export function addHorizontalRule(ctx: PDFContext): void {
  ctx.doc.setDrawColor(...PDF_CONFIG.colors.lightGray);
  ctx.doc.line(ctx.margin, ctx.yPos, ctx.pageWidth - ctx.margin, ctx.yPos);
  ctx.yPos += 5;
}
