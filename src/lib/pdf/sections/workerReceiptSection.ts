import type { PAFData } from '@/types/paf';
import { 
  PDFContext, 
  addPageHeader,
  addCenteredTitle,
  addParagraph,
  addSignatureLine,
} from '../pdfHelpers';

export function addWorkerReceiptSection(ctx: PDFContext, data: PAFData): void {
  const { doc, margin } = ctx;
  
  // Start new page
  doc.addPage();
  addPageHeader(ctx, 'Worker Receipt Acknowledgment');
  
  ctx.yPos += 20;
  addCenteredTitle(ctx, 'STATEMENT OF RECEIPT OF CERTIFIED LABOR', 14);
  ctx.yPos -= 5;
  addCenteredTitle(ctx, 'CONDITION APPLICATION BY H-1B NONIMMIGRANT WORKER', 14);
  
  ctx.yPos += 15;
  
  const receiptText = `By signing this form, [Worker Name] affirms that on or before the day he/she began work as an H-1B employee for ${data.employer.legalBusinessName}, he/she was provided with a copy of the Labor Condition Application as certified by the Department of Labor that was filed in support of [Worker Name]'s H-1B nonimmigrant petition.`;
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
  doc.text('[Worker Name]', margin, ctx.yPos);
  
  ctx.yPos += 20;
  doc.text('Date: ____________________', margin, ctx.yPos);
}
