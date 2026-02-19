import type { PAFData } from '@/types/paf';
import type { SupportingDocs } from '@/components/wizard/steps/SupportingDocsStep';
import { 
  PDFContext, 
  addPageHeader,
  addCenteredTitle,
  addParagraph,
  addSignatureLine,
} from '../pdfHelpers';

export function addWorkerReceiptSection(ctx: PDFContext, data: PAFData, supportingDocs?: SupportingDocs): void {
  const { doc, margin } = ctx;
  
  const isMultiWorker = (data.job.workersNeeded ?? 1) > 1;
  // Multi-worker: no name; single-worker: use name or placeholder
  const employeeName = isMultiWorker ? null : (data.employer.employeeName?.trim() || '[Worker Name]');
  
  // Start new page
  doc.addPage();
  addPageHeader(ctx, 'Worker Receipt Acknowledgment');
  
  ctx.yPos += 15;
  addCenteredTitle(ctx, 'STATEMENT OF RECEIPT OF CERTIFIED LABOR CONDITION', 13);
  ctx.yPos += 3;
  addCenteredTitle(ctx, 'APPLICATION BY H-1B NONIMMIGRANT WORKER', 13);
  
  ctx.yPos += 15;
  
  const receiptText = isMultiWorker
    ? `By signing this form, each H-1B worker covered under this LCA affirms that on or before the day he/she began work as an H-1B employee for ${data.employer.legalBusinessName}, he/she was provided with a copy of the Labor Condition Application as certified by the Department of Labor that was filed in support of his/her H-1B nonimmigrant petition.`
    : `By signing this form, ${employeeName} affirms that on or before the day he/she began work as an H-1B employee for ${data.employer.legalBusinessName}, he/she was provided with a copy of the Labor Condition Application as certified by the Department of Labor that was filed in support of ${employeeName}'s H-1B nonimmigrant petition.`;
  addParagraph(ctx, receiptText);
  
  ctx.yPos += 20;
  
  // Worker signature line
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Signature', margin, ctx.yPos);
  ctx.yPos += 5;
  
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, ctx.yPos + 15, margin + 100, ctx.yPos + 15);
  
  ctx.yPos += 25;
  // Multi-worker: generic label; single-worker: print the name
  doc.text(isMultiWorker ? 'H-1B Worker Name (Print)' : employeeName!, margin, ctx.yPos);
  
  ctx.yPos += 20;
  doc.text('Date: ____________________', margin, ctx.yPos);
}
