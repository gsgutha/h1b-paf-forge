import type { PAFData } from '@/types/paf';
import { 
  PDFContext, 
  addPageHeader,
  addCenteredTitle,
  addParagraph,
  formatCurrency,
} from '../pdfHelpers';
import { addCompactDigitalSignature, SignatoryWithImage } from '../signatureRenderer';
import { supabase } from '@/integrations/supabase/client';

async function getSignatoryFromDB(signatoryId?: string): Promise<SignatoryWithImage | null> {
  try {
    if (signatoryId) {
      const { data, error } = await supabase
        .from('authorized_signatories')
        .select('*')
        .eq('id', signatoryId)
        .single();
      if (!error && data) {
        return { id: data.id, name: data.name, title: data.title, signatureImagePath: data.signature_image_path };
      }
    }
    const { data: defaultData, error: defaultError } = await supabase
      .from('authorized_signatories')
      .select('*')
      .eq('is_default', true)
      .single();
    if (!defaultError && defaultData) {
      return { id: defaultData.id, name: defaultData.name, title: defaultData.title, signatureImagePath: defaultData.signature_image_path };
    }
    const { data: firstData } = await supabase
      .from('authorized_signatories')
      .select('*')
      .limit(1)
      .single();
    if (firstData) {
      return { id: firstData.id, name: firstData.name, title: firstData.title, signatureImagePath: firstData.signature_image_path };
    }
    return null;
  } catch {
    return null;
  }
}

export async function addPayrollStatementSection(ctx: PDFContext, data: PAFData): Promise<void> {
  const { doc, margin } = ctx;
  const isMultiWorker = (data.job.workersNeeded ?? 1) > 1;
  const employeeName = isMultiWorker ? null : (data.employer.employeeName?.trim() || '[Worker Name]');

  doc.addPage();
  addPageHeader(ctx, 'Payroll Compliance Statement');
  ctx.yPos += 15;
  addCenteredTitle(ctx, 'PAYROLL COMPLIANCE STATEMENT', 13);

  const annualSalary = formatCurrency(data.wage.actualWage, data.wage.actualWageUnit);
  const payrollCycle = 'monthly';

  const para1 = `The Company compensates H-1B employees at or above the required wage listed on the certified Labor Condition Application for this position, consistent with 20 CFR § 655.731.`;
  addParagraph(ctx, para1);

  const workerLabel = isMultiWorker ? 'The employee' : employeeName;
  const para2 = `${workerLabel} will be paid ${annualSalary} annually through the Company's regular ${payrollCycle} payroll cycle, which is applied consistently to similarly situated employees.`;
  addParagraph(ctx, para2);

  const para3 = `The Company pays for all nonproductive time in accordance with 20 CFR § 655.731(c)(7) and does not place H-1B employees in unpaid status due to lack of assigned work. The required wage will be paid beginning no later than the employee's first day of employment, as required by regulation.`;
  addParagraph(ctx, para3);

  // Employer signature
  ctx.yPos += 15;
  const signatory = await getSignatoryFromDB(data.employer.signatoryId);
  if (signatory) {
    await addCompactDigitalSignature(ctx, signatory, data.employer.legalBusinessName, true);
  } else {
    await addCompactDigitalSignature(ctx, {
      id: 'fallback',
      name: 'Authorized Signatory',
      title: 'Authorized Representative',
      signatureImagePath: null,
    }, data.employer.legalBusinessName, true);
  }
}
