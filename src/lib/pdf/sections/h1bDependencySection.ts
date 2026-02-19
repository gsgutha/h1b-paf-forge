import type { PAFData } from '@/types/paf';
import type { SupportingDocs } from '@/components/wizard/steps/SupportingDocsStep';
import { 
  PDFContext, 
  PDF_CONFIG,
  addPageHeader,
  addCenteredTitle,
  addSectionHeader,
  addSubsectionHeader,
  addLabelValue,
  addParagraph,
  addBoldParagraph,
  addDateLine,
  checkPageBreak,
} from '../pdfHelpers';
import { addDigitalSignature, SignatoryWithImage } from '../signatureRenderer';
import { supabase } from '@/integrations/supabase/client';

function annualizeWage(wage: number, unit: string): number {
  switch (unit) {
    case 'Hour': return wage * 2080;
    case 'Week': return wage * 52;
    case 'Bi-Weekly': return wage * 26;
    case 'Month': return wage * 12;
    case 'Year': return wage;
    default: return wage;
  }
}

function formatWageCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}
async function getSignatoryFromDB(signatoryId?: string): Promise<SignatoryWithImage | null> {
  try {
    // First try to get by signatoryId if provided
    if (signatoryId) {
      const { data, error } = await supabase
        .from('authorized_signatories')
        .select('*')
        .eq('id', signatoryId)
        .single();
      
      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          title: data.title,
          signatureImagePath: data.signature_image_path,
        };
      }
    }
    
    // Fall back to default signatory
    const { data: defaultData, error: defaultError } = await supabase
      .from('authorized_signatories')
      .select('*')
      .eq('is_default', true)
      .single();
    
    if (!defaultError && defaultData) {
      return {
        id: defaultData.id,
        name: defaultData.name,
        title: defaultData.title,
        signatureImagePath: defaultData.signature_image_path,
      };
    }
    
    // If no default, get the first signatory
    const { data: firstData } = await supabase
      .from('authorized_signatories')
      .select('*')
      .limit(1)
      .single();
    
    if (firstData) {
      return {
        id: firstData.id,
        name: firstData.name,
        title: firstData.title,
        signatureImagePath: firstData.signature_image_path,
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

export async function addH1BDependencySection(
  ctx: PDFContext, 
  data: PAFData,
  supportingDocs?: SupportingDocs
): Promise<void> {
  const { doc, pageWidth, margin } = ctx;
  
  // Start new page
  doc.addPage();
  addPageHeader(ctx, 'H-1B Dependency and Willful Violator Status');
  
  ctx.yPos += 10;
  addCenteredTitle(ctx, 'H-1B DEPENDENCY ATTESTATION', 14);
  
  ctx.yPos += 10;
  
  // Introduction
  const introPara = `This attestation is made by ${data.employer.legalBusinessName} ("Employer") pursuant to 20 CFR § 655.736 regarding the employer's H-1B dependency status and willful violator status as required for the Labor Condition Application (LCA).`;
  addParagraph(ctx, introPara);
  
  ctx.yPos += 5;
  
  // Section 1: H-1B Dependency Status
  addSectionHeader(ctx, '1. H-1B Dependency Status Declaration');
  
  const dependencyStatus = data.isH1BDependent ? 'H-1B DEPENDENT' : 'NOT H-1B DEPENDENT';
  const statusColor = data.isH1BDependent ? PDF_CONFIG.colors.error : PDF_CONFIG.colors.success;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...statusColor);
  doc.text(`Status: ${dependencyStatus}`, margin, ctx.yPos);
  doc.setTextColor(...PDF_CONFIG.colors.black);
  ctx.yPos += 10;
  
  // Section 1b: Dependency Calculation Worksheet
  addSubsectionHeader(ctx, 'H-1B Dependency Calculation Worksheet');

  if (supportingDocs?.totalFTECount && supportingDocs?.totalH1BCount) {
    const pct = ((supportingDocs.totalH1BCount / supportingDocs.totalFTECount) * 100).toFixed(1);
    const calcDate = supportingDocs.dependencyCalculationDate || '—';
    const worksheetRows = [
      ['Total Full-Time Equivalent (FTE) Employees:', String(supportingDocs.totalFTECount)],
      ['Total H-1B Workers Currently Employed:', String(supportingDocs.totalH1BCount)],
      ['H-1B Percentage of Workforce:', `${pct}%`],
      ['Calculation Date (as of LCA Filing):', calcDate],
    ];
    // Show H-4 exemption verification if available
    if (supportingDocs.h1bExemptionChecked !== undefined && supportingDocs.h1bExemptionChecked !== null) {
      worksheetRows.push([
        'Section H-4 Exemption Box (from LCA):',
        supportingDocs.h1bExemptionChecked ? 'Checked ✓ (Worker is Exempt)' : 'Not Checked (Worker is Non-Exempt)',
      ]);
    }
    doc.setFontSize(10);
    worksheetRows.forEach(([label, value]) => {
      checkPageBreak(ctx, 8);
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin + 5, ctx.yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 110, ctx.yPos);
      ctx.yPos += 7;
    });
  } else {
    addParagraph(ctx, 'See attached dependency worksheet. Employer has determined dependency status based on current FTE headcount and H-1B worker count per 20 CFR § 655.736.');
  }

  ctx.yPos += 5;

  // Explanation of H-1B dependency thresholds
  addSubsectionHeader(ctx, 'Statutory Thresholds (20 CFR § 655.736)');
  
  const calcExplanation = `An employer is considered "H-1B dependent" if it meets one of the following thresholds:`;
  addParagraph(ctx, calcExplanation);
  
  const thresholds = [
    '• 25 or fewer FTEs: 8 or more H-1B workers',
    '• 26 to 50 FTEs: 13 or more H-1B workers',
    '• 51 or more FTEs: 15% or more of workforce are H-1B workers',
  ];
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  thresholds.forEach(threshold => {
    checkPageBreak(ctx, 8);
    doc.text(threshold, margin + 5, ctx.yPos);
    ctx.yPos += 6;
  });
  
  ctx.yPos += 5;
  
  if (data.isH1BDependent) {
    // Determine exemption type from supportingDocs
    const exemptionType = supportingDocs?.exemptionType || 'wage';
    const annualizedWage = annualizeWage(data.job.wageRateFrom, data.job.wageUnit);
    const isWageExempt = exemptionType === 'wage' && annualizedWage >= 60000;
    const isDegreeExempt = exemptionType === 'degree';
    const isExempt = isWageExempt || isDegreeExempt;
    
    if (isExempt) {
      addBoldParagraph(ctx, 'EXEMPT H-1B NONIMMIGRANT — Additional Attestations Not Required', 11);
      
      if (isWageExempt) {
        const exemptExplanation = `Although ${data.employer.legalBusinessName} is classified as an H-1B dependent employer, the H-1B nonimmigrant worker named in this LCA qualifies as an "exempt" H-1B nonimmigrant under 20 CFR § 655.737. The offered annual wage of ${formatWageCurrency(annualizedWage)} exceeds the statutory threshold of $60,000 per year as specified in INA § 212(n)(3)(B)(i).`;
        addParagraph(ctx, exemptExplanation);
        ctx.yPos += 3;
        addSubsectionHeader(ctx, 'Exemption Criteria Met');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        checkPageBreak(ctx, 8);
        doc.text(`• Wage Exemption: Annual wage offered ${formatWageCurrency(annualizedWage)} ≥ $60,000 threshold ✓`, margin + 5, ctx.yPos);
        ctx.yPos += 6;
      } else {
        const exemptExplanation = `Although ${data.employer.legalBusinessName} is classified as an H-1B dependent employer, the H-1B nonimmigrant worker named in this LCA qualifies as an "exempt" H-1B nonimmigrant under 20 CFR § 655.737 by virtue of holding a Master's degree or its equivalent in a specialty related to the employment, as specified in INA § 212(n)(3)(B)(ii).`;
        addParagraph(ctx, exemptExplanation);
        ctx.yPos += 3;
        addSubsectionHeader(ctx, 'Exemption Criteria Met');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        checkPageBreak(ctx, 8);
        doc.text('• Degree Exemption: Worker holds a U.S. Master\'s degree or equivalent in a specialty related to employment ✓', margin + 5, ctx.yPos);
        ctx.yPos += 6;
      }
      
      ctx.yPos += 3;
      const exemptConsequence = `Pursuant to 20 CFR § 655.737(b), because this worker is an exempt H-1B nonimmigrant, the employer is NOT required to make the additional attestations regarding non-displacement of U.S. workers (20 CFR § 655.738) and recruitment of U.S. workers (20 CFR § 655.739) that would otherwise apply to H-1B dependent employers. See LCA Form ETA-9035, Section H, Item H-4.`;
      addParagraph(ctx, exemptConsequence);
    } else {
      addBoldParagraph(ctx, 'As an H-1B dependent employer, the following additional attestations apply to this LCA:', 10);
      
      const additionalAttestations = [
        '1. The employer will not displace any similarly employed U.S. worker within 90 days before or after filing an H-1B petition.',
        '2. The employer will not place the H-1B worker at another employer\'s worksite unless the employer has inquired whether the other employer has displaced or will displace a similarly employed U.S. worker within 90 days before or after the placement.',
        '3. The employer has taken good faith steps to recruit U.S. workers for the job using industry-wide standards and offering compensation at least as great as required by the LCA.',
        '4. The employer has offered the job to any U.S. worker who applies and is equally or better qualified for the job.',
      ];
      
      additionalAttestations.forEach(attestation => {
        checkPageBreak(ctx, 15);
        const lines = doc.splitTextToSize(attestation, pageWidth - margin * 2 - 5);
        doc.text(lines, margin + 5, ctx.yPos);
        ctx.yPos += lines.length * 5 + 3;
      });
    }
  } else {
    addParagraph(ctx, 'The employer is not H-1B dependent and therefore is not subject to the additional attestation requirements regarding displacement and recruitment under 20 CFR § 655.738-739.');
  }
  
  ctx.yPos += 10;
  
  // Section 2: Willful Violator Status
  addSectionHeader(ctx, '2. Willful Violator Status Declaration');
  
  const willfulStatus = data.isWillfulViolator ? 'WILLFUL VIOLATOR' : 'NOT A WILLFUL VIOLATOR';
  const willfulColor = data.isWillfulViolator ? PDF_CONFIG.colors.error : PDF_CONFIG.colors.success;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...willfulColor);
  doc.text(`Status: ${willfulStatus}`, margin, ctx.yPos);
  doc.setTextColor(...PDF_CONFIG.colors.black);
  ctx.yPos += 10;
  
  if (data.isWillfulViolator) {
    addParagraph(ctx, 'The employer has been found to have willfully violated the H-1B program requirements and is subject to additional attestation requirements under 20 CFR § 655.738-739.');
  } else {
    addParagraph(ctx, 'The employer attests that it has not been found by the Department of Labor to have willfully violated the terms and conditions of the H-1B program within the past 5 years.');
  }
  
  ctx.yPos += 10;
  
  // Section 3: Corporate Information
  addSectionHeader(ctx, '3. Corporate Information');
  
  addLabelValue(ctx, 'Legal Business Name', data.employer.legalBusinessName, 55);
  if (data.employer.tradeName) {
    addLabelValue(ctx, 'Trade Name/DBA', data.employer.tradeName, 55);
  }
  addLabelValue(ctx, 'Federal EIN', data.employer.fein, 55);
  addLabelValue(ctx, 'NAICS Code', data.employer.naicsCode, 55);
  
  ctx.yPos += 10;
  
  // Certification statement
  addBoldParagraph(ctx, 'EMPLOYER CERTIFICATION:', 11);
  
  const certStatement = `I hereby certify that the information provided above regarding ${data.employer.legalBusinessName}'s H-1B dependency status and willful violator status is true and correct to the best of my knowledge. I understand that providing false information may result in civil and/or criminal penalties under 18 U.S.C. § 1546.`;
  addParagraph(ctx, certStatement);
  
  // Digital Signature - fetch from database
  const signatory = await getSignatoryFromDB(data.employer.signatoryId);
  
  if (signatory) {
    await addDigitalSignature(ctx, signatory, data.employer.legalBusinessName, false);
  } else {
    await addDigitalSignature(ctx, {
      id: 'fallback',
      name: 'Authorized Signatory',
      title: 'Authorized Representative',
      signatureImagePath: null
    }, data.employer.legalBusinessName, false);
  }
}
