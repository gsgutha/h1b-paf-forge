import type { PAFData } from '@/types/paf';
import type { SupportingDocs } from '@/components/wizard/steps/SupportingDocsStep';
import { 
  PDFContext, 
  PDF_CONFIG, 
  addCenteredTitle, 
  formatDate,
  checkPageBreak 
} from '../pdfHelpers';

export function addCoverPage(
  ctx: PDFContext, 
  data: PAFData, 
  supportingDocs?: SupportingDocs
): void {
  const { doc, pageWidth, margin } = ctx;
  
  // Company name header
  ctx.yPos = 50;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_CONFIG.colors.gray);
  doc.text('PUBLIC ACCESS FILE', pageWidth / 2, ctx.yPos, { align: 'center' });
  
  ctx.yPos += 20;
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_CONFIG.colors.navy);
  doc.text(data.employer.legalBusinessName, pageWidth / 2, ctx.yPos, { align: 'center' });
  
  ctx.yPos += 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_CONFIG.colors.black);
  doc.text(`Job Title: ${data.job.jobTitle}`, pageWidth / 2, ctx.yPos, { align: 'center' });
  
  ctx.yPos += 10;
  doc.setFontSize(11);
  const worksiteAddress = `Primary Worksite: ${data.worksite.address1}, ${data.worksite.city}, ${data.worksite.state} ${data.worksite.postalCode}`;
  doc.text(worksiteAddress, pageWidth / 2, ctx.yPos, { align: 'center' });
  
  // Secondary worksite if present
  if (data.worksite.hasSecondaryWorksite && data.worksite.secondaryWorksite) {
    ctx.yPos += 8;
    doc.setFontSize(10);
    const secondaryAddress = `Secondary Worksite: ${data.worksite.secondaryWorksite.address1}, ${data.worksite.secondaryWorksite.city}, ${data.worksite.secondaryWorksite.state} ${data.worksite.secondaryWorksite.postalCode}`;
    doc.text(secondaryAddress, pageWidth / 2, ctx.yPos, { align: 'center' });
  }
  
  ctx.yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text(
    `LCA Validity: ${formatDate(data.job.beginDate)} until ${formatDate(data.job.endDate)}`,
    pageWidth / 2,
    ctx.yPos,
    { align: 'center' }
  );
  
  // Table of Contents
  ctx.yPos += 30;
  doc.setFillColor(...PDF_CONFIG.colors.navy);
  doc.rect(margin, ctx.yPos - 5, pageWidth - 2 * margin, 10, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_CONFIG.colors.white);
  doc.text('TABLE OF CONTENTS', margin + 5, ctx.yPos + 2);
  doc.setTextColor(...PDF_CONFIG.colors.black);
  
  ctx.yPos += 15;
  
  const tocItems = [
    { num: '1.', text: 'Copy of the Certified Labor Condition Application' },
    { num: '2.', text: 'Actual Wage Standards (Company-Wide Policy)' },
    { num: '3.', text: 'Actual Wage Determination (Position-Specific)' },
    { num: '4.', text: 'Prevailing Wage Rate and its Source' },
    { num: '5.', text: 'Memorandum to Confirm Compliance with Posting Requirement' },
    { num: '6.', text: 'Benefits Summary and Benefits Materials' },
    { num: '7.', text: 'If H-1B dependent company, list of "exempt" H-1B non-immigrants' },
    { num: '8.', text: 'If H-1B dependent company and LCA is filed for a non-exempt H-1B employee, summary of the recruitment methods used and the time frames of recruitment of U.S. workers' },
    { num: '9.', text: 'Sworn statement if there is a name change & List of employees affected with the name change and new EIN number if any' },
    { num: '10.', text: 'If dependent company and LCA is filed for a non-exempt H-1B employee, Secondary Displacement Inquiry' },
  ];
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  tocItems.forEach((item) => {
    checkPageBreak(ctx, 12);
    doc.setFont('helvetica', 'bold');
    doc.text(item.num, margin, ctx.yPos);
    doc.setFont('helvetica', 'normal');
    
    const maxWidth = pageWidth - margin * 2 - 15;
    const lines = doc.splitTextToSize(item.text, maxWidth);
    doc.text(lines, margin + 12, ctx.yPos);
    ctx.yPos += lines.length * 5 + 3;
  });
  
  // Case number at bottom if available
  if (supportingDocs?.lcaCaseNumber) {
    ctx.yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text(`LCA Case Number: ${supportingDocs.lcaCaseNumber}`, margin, ctx.yPos);
  }
}
