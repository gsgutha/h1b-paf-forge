import type { PAFData } from '@/types/paf';
import type { SupportingDocs } from '@/components/wizard/steps/SupportingDocsStep';
import { 
  PDFContext, 
  addPageHeader,
  addCenteredTitle,
  addParagraph,
  addSubsectionHeader,
  addSignatureLine,
  checkPageBreak,
  formatCurrency,
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
  
  ctx.yPos += 10;
  checkPageBreak(ctx, 60);
  
  // Payroll Statement subsection
  addSubsectionHeader(ctx, 'Payroll Statement');
  
  const annualSalary = formatCurrency(data.wage.actualWage, data.wage.actualWageUnit);
  const payrollCycle = 'monthly';
  
  const payrollPara1 = `The Company compensates H-1B employees at or above the required wage listed on the certified Labor Condition Application for this position, consistent with 20 CFR § 655.731.`;
  addParagraph(ctx, payrollPara1);
  
  const workerLabel = isMultiWorker ? 'The employee' : employeeName;
  const payrollPara2 = `${workerLabel} will be paid ${annualSalary} annually through the Company's regular ${payrollCycle} payroll cycle, which is applied consistently to similarly situated employees.`;
  addParagraph(ctx, payrollPara2);
  
  const payrollPara3 = `The Company pays for all nonproductive time in accordance with 20 CFR § 655.731(c)(7) and does not place H-1B employees in unpaid status due to lack of assigned work. The required wage will be paid beginning no later than the employee's first day of employment, as required by regulation.`;
  addParagraph(ctx, payrollPara3);
  
  ctx.yPos += 20;
  
  // Worker signature line
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Signature', margin, ctx.yPos);
  ctx.yPos += 5;
  
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, ctx.yPos + 15, margin + 100, ctx.yPos + 15);
  
  ctx.yPos += 25;
  doc.text(isMultiWorker ? 'H-1B Worker Name (Print)' : employeeName!, margin, ctx.yPos);
  
  ctx.yPos += 20;
  doc.text('Date: ____________________', margin, ctx.yPos);
}
