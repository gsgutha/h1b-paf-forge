import type { PAFData } from '@/types/paf';
import type { SupportingDocs } from '@/components/wizard/steps/SupportingDocsStep';
import { format, addDays } from 'date-fns';
import { 
  PDFContext, 
  PDF_CONFIG,
  addPageHeader,
  addCenteredTitle,
  addSectionHeader,
  addSubsectionHeader,
  addLabelValue,
  addParagraph,
  addSignatureLine,
  checkPageBreak,
  formatDate,
  formatCurrency,
  parseLocalDate,
} from '../pdfHelpers';

export function addPostingNoticeSection(
  ctx: PDFContext, 
  data: PAFData, 
  supportingDocs?: SupportingDocs
): void {
  const { doc, pageWidth, margin } = ctx;
  
  // Start new page - LCA Display Details
  doc.addPage();
  addPageHeader(ctx, 'LCA Posting Documentation');
  
  ctx.yPos += 10;
  addCenteredTitle(ctx, 'LCA DISPLAY DETAILS', 14);
  
  ctx.yPos += 10;
  
  // Case number
  if (supportingDocs?.lcaCaseNumber) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`ETA Case Number: ${supportingDocs.lcaCaseNumber}`, margin, ctx.yPos);
    ctx.yPos += 10;
  }
  
  // Posting certification
  const postingDate = supportingDocs?.noticePostingDate 
    ? parseLocalDate(supportingDocs.noticePostingDate)
    : new Date();
  const postingEndDate = addDays(postingDate, 14); // 10 business days ≈ 14 calendar days
  
  const certText = `This is to certify that Labor Condition Application for the position of ${data.job.jobTitle} was posted for 10 business days from ${format(postingDate, 'MM/dd/yyyy')} to ${format(postingEndDate, 'MM/dd/yyyy')} in the below mentioned place of employment.`;
  addParagraph(ctx, certText);
  
  ctx.yPos += 5;
  
  // Location section
  addSubsectionHeader(ctx, 'Worksite Location(s)');
  const clientLocation = `${data.worksite.address1}${data.worksite.address2 ? ', ' + data.worksite.address2 : ''}, ${data.worksite.city}, ${data.worksite.state} ${data.worksite.postalCode}`;
  addLabelValue(ctx, 'Primary Worksite', clientLocation, 50);
  
  // Secondary worksite if present
  if (data.worksite.hasSecondaryWorksite && data.worksite.secondaryWorksite) {
    const secondary = data.worksite.secondaryWorksite;
    const secondaryLocation = `${secondary.address1}${secondary.address2 ? ', ' + secondary.address2 : ''}, ${secondary.city}, ${secondary.state} ${secondary.postalCode}`;
    addLabelValue(ctx, 'Secondary Worksite', secondaryLocation, 50);
    
    if (secondary.county) {
      addLabelValue(ctx, 'Secondary County', secondary.county, 50);
    }
  }
  
  ctx.yPos += 5;
  
  // Display Areas
  addSubsectionHeader(ctx, 'Display Areas');
  const location1 = supportingDocs?.noticePostingLocation || `${data.employer.legalBusinessName} Notice Board`;
  addLabelValue(ctx, 'Display Area 1', location1, 45);
  addLabelValue(ctx, 'Display Area 2', 'Company Intranet / Electronic Posting', 45);
  
  ctx.yPos += 10;
  
  // Complaints section
  addSubsectionHeader(ctx, 'Complaints');
  const complaintsText = 'Complaints alleging misrepresentations of material facts in the labor condition application and/or failure to comply with terms of the labor condition application may be filed using the WH-4 Form with any office of the Wage and Hour Division, Employment Standards Administration, U.S. Department of Labor.';
  addParagraph(ctx, complaintsText);
  
  const complaintsText2 = 'Complaints alleging failure to offer employment to an equally or better qualified U.S. worker or an employer\'s misrepresentation regarding such offers of employment may be filed with the Office of Special Counsel for Immigration Related Unfair Employment Practices, Civil Rights Division, Department of Justice.';
  addParagraph(ctx, complaintsText2);
  
  // Signature
  ctx.yPos += 10;
  const signerName = supportingDocs?.signingAuthorityName || 'Authorized Representative';
  const signerTitle = supportingDocs?.signingAuthorityTitle || undefined;
  addSignatureLine(ctx, signerName, signerTitle, data.employer.legalBusinessName);
  
  // ----- Page 2: LCA Posting Notice -----
  doc.addPage();
  addPageHeader(ctx, 'LCA Posting Notice');
  
  ctx.yPos += 10;
  addCenteredTitle(ctx, 'LCA POSTING NOTICE', 14);
  
  ctx.yPos += 10;
  addSubsectionHeader(ctx, 'Notice to All Employees:');
  
  const noticeIntro = 'Notice is hereby given to all employees that a Labor Condition Application (ETA Form 9035 & 9035E) will be filed with the United States Department of Labor, Office of Foreign Labor Certification for a H-1B non-immigrant worker with the following details:';
  addParagraph(ctx, noticeIntro);
  
  ctx.yPos += 5;
  
  // Notice details table
  const noticeDetails = [
    ['Number of H-1B non-immigrant workers included in LCA:', String(data.job.workersNeeded)],
    ['Job Position:', data.job.jobTitle],
    ['Wages Offered:', formatCurrency(data.job.wageRateFrom, data.job.wageUnit)],
    ['Period of Employment:', `${formatDate(data.job.beginDate)} to ${formatDate(data.job.endDate)} (As per LCA)`],
    ['Location where H-1B non-immigrant worker will work:', clientLocation],
  ];
  
  doc.setFontSize(10);
  noticeDetails.forEach(([label, value]) => {
    checkPageBreak(ctx, 15);
    doc.setFont('helvetica', 'bold');
    const labelLines = doc.splitTextToSize(label, 80);
    doc.text(labelLines, margin, ctx.yPos);
    
    doc.setFont('helvetica', 'normal');
    const valueLines = doc.splitTextToSize(value, pageWidth - margin - 95);
    doc.text(valueLines, margin + 85, ctx.yPos);
    
    ctx.yPos += Math.max(labelLines.length, valueLines.length) * 5 + 5;
  });
  
  ctx.yPos += 5;
  
  const complaintsFooter = 'Complaints alleging misrepresentation of material facts in the Labor Condition Application and/or failure to comply with the terms of the Labor Condition Application may be filed with any office of the Wage & Hour Division of the United States Department of Labor.';
  addParagraph(ctx, complaintsFooter);
  
  addParagraph(ctx, 'The verification of Labor Condition Application (ETA Form 9035 & 9035E) will be available for all to review.');
}
