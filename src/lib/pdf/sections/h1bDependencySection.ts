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
import { addDigitalSignature } from '../signatureRenderer';
import { getSignatoryById, getDefaultSignatory } from '@/config/signatories';

export function addH1BDependencySection(
  ctx: PDFContext, 
  data: PAFData,
  supportingDocs?: SupportingDocs
): void {
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
  
  // Explanation of H-1B dependency calculation
  addSubsectionHeader(ctx, 'H-1B Dependency Calculation Method');
  
  const calcExplanation = `Under 20 CFR § 655.736, an employer is considered "H-1B dependent" if it meets one of the following thresholds based on full-time equivalent (FTE) employees:`;
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
  
  // Digital Signature
  // Get the selected signatory or use default
  const signatory = data.employer.signatoryId 
    ? getSignatoryById(data.employer.signatoryId) || getDefaultSignatory()
    : getDefaultSignatory();
  
  addDigitalSignature(ctx, signatory, data.employer.legalBusinessName, false);
}
