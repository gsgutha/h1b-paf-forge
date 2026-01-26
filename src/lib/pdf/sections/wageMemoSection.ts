import type { PAFData } from '@/types/paf';
import type { SupportingDocs } from '@/components/wizard/steps/SupportingDocsStep';
import { 
  PDFContext, 
  PDF_CONFIG,
  addPageHeader,
  addCenteredTitle,
  addParagraph,
  addBoldParagraph,
  addSignatureLine,
  checkPageBreak,
  formatCurrency,
  formatDate,
} from '../pdfHelpers';

export function addWageMemoSection(
  ctx: PDFContext, 
  data: PAFData, 
  supportingDocs?: SupportingDocs
): void {
  const { doc, pageWidth, margin } = ctx;
  
  // Start new page
  doc.addPage();
  addPageHeader(ctx, 'Statement of Actual Wage Determination');
  
  ctx.yPos += 10;
  addCenteredTitle(ctx, 'STATEMENT OF ACTUAL WAGE DETERMINATION FORM', 14);
  
  ctx.yPos += 10;
  
  // Employee name for personalization
  const employeeName = data.employer.employeeName || 'the H-1B worker';
  
  // Introduction paragraph with populated data
  const introPara = `This memorandum is prepared in accordance with the regulations of the U.S. Department of Labor (DOL) at 20 CFR Section 655.700 regarding the Labor Condition Application (LCA) filed by ${data.employer.legalBusinessName} for the position of ${data.job.jobTitle} for ${employeeName} located at: ${data.worksite.worksiteName ? data.worksite.worksiteName + ', ' : ''}${data.worksite.address1}, ${data.worksite.city}, ${data.worksite.state} ${data.worksite.postalCode}.`;
  addParagraph(ctx, introPara);
  
  ctx.yPos += 5;
  
  // Position Details Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('POSITION DETAILS', margin, ctx.yPos);
  ctx.yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const positionDetails = [
    `Position Title: ${data.job.jobTitle}`,
    `SOC Code: ${data.job.socCode} - ${data.job.socTitle}`,
    data.job.onetCode ? `O*NET Code: ${data.job.onetCode}${data.job.onetTitle ? ' - ' + data.job.onetTitle : ''}` : '',
    `Employment Period: ${formatDate(data.job.beginDate)} to ${formatDate(data.job.endDate)}`,
    `Employment Type: ${data.job.isFullTime ? 'Full-Time' : 'Part-Time'}`,
    `Workers Needed: ${data.job.workersNeeded}`,
  ].filter(Boolean);
  
  positionDetails.forEach(detail => {
    doc.text(detail, margin, ctx.yPos);
    ctx.yPos += 6;
  });
  
  ctx.yPos += 5;
  
  // Higher of Actual or Prevailing Wage Confirmation
  ctx.yPos += 5;
  const actualWage = data.wage.actualWage;
  const prevailingWage = data.wage.prevailingWage;
  const higherWage = Math.max(actualWage, prevailingWage);
  const wageSource = actualWage >= prevailingWage ? 'actual wage' : 'prevailing wage';
  
  const wageConfirmation = `WAGE CONFIRMATION: ${employeeName} will be paid ${formatCurrency(higherWage, data.wage.actualWageUnit)}, which is the HIGHER of the actual wage (${formatCurrency(actualWage, data.wage.actualWageUnit)}) or the prevailing wage (${formatCurrency(prevailingWage, data.wage.prevailingWageUnit)}), as required by 20 CFR § 655.731(a).`;
  
  // Draw highlighted confirmation box
  doc.setFillColor(...PDF_CONFIG.colors.lightGray);
  const confirmLines = doc.splitTextToSize(wageConfirmation, pageWidth - margin * 2 - 10);
  doc.rect(margin, ctx.yPos - 3, pageWidth - margin * 2, confirmLines.length * 5 + 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(confirmLines, margin + 5, ctx.yPos + 2);
  ctx.yPos += confirmLines.length * 5 + 12;
  
  doc.setFont('helvetica', 'normal');
  
  // Prevailing Wage Details
  ctx.yPos += 5;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PREVAILING WAGE INFORMATION', margin, ctx.yPos);
  ctx.yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const pwDetails = [
    `Prevailing Wage: ${formatCurrency(prevailingWage, data.wage.prevailingWageUnit)}`,
    `Wage Level: ${data.wage.wageLevel}`,
    `Wage Source: ${data.wage.wageSource}`,
    `Wage Source Date: ${formatDate(data.wage.wageSourceDate)}`,
    `Wage Area: ${data.worksite.areaName || data.worksite.city + ', ' + data.worksite.state}`,
  ];
  
  pwDetails.forEach(detail => {
    doc.text(detail, margin, ctx.yPos);
    ctx.yPos += 6;
  });
  
  ctx.yPos += 5;
  
  // Wage statement
  const wageStatement = `Pursuant to the LCA, ${employeeName} for the position of ${data.job.jobTitle} will be paid at a rate of ${formatCurrency(data.job.wageRateFrom, data.job.wageUnit)}${data.job.wageRateTo ? ' to ' + formatCurrency(data.job.wageRateTo, data.job.wageUnit) : ''}. In determining the wage for the position the following factors were considered:`;
  addParagraph(ctx, wageStatement);
  
  ctx.yPos += 5;
  
  // Numbered factors
  const factors = [
    'Experience, including whether the applicant has been previously employed in this position, the length of any such employment, the type of employment (i.e. supervisory in nature), and, the depth and breadth of such employment.',
    'Educational background, including the level of education obtained, the existence of special educational achievements (such as superior class rank or other distinction), and the reputation of the educational facility or facilities attended.',
    'Job responsibility and function, including nature of duties and responsibilities to be performed and degree of supervision to be exercised.',
    'Possession of specialized knowledge, skills or training.',
    'Other indicators of performance/ability, including job references, performance evaluations, awards, achievements and/or accomplishments.',
  ];
  
  doc.setFontSize(10);
  factors.forEach((factor, index) => {
    checkPageBreak(ctx, 20);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}.`, margin, ctx.yPos);
    doc.setFont('helvetica', 'normal');
    
    const lines = doc.splitTextToSize(factor, pageWidth - margin * 2 - 15);
    doc.text(lines, margin + 12, ctx.yPos);
    ctx.yPos += lines.length * 5 + 5;
  });
  
  ctx.yPos += 5;
  
  // Additional consideration
  addParagraph(ctx, 'We also may consider other legitimate business factors such as the current market for individuals with the applicant\'s experience and qualifications. The consideration of such factors conforms to recognized principles of industry practice.');
  
  addParagraph(ctx, 'Those parties receiving a salary higher than the candidate have higher compensation based upon their possessing relevant experience, their level of job responsibility and function, a higher level of specialized knowledge, skills, and/or training, and/or a record of successful performance in the position.');
  
  // If user provided a custom wage memo, include it
  if (supportingDocs?.actualWageMemo && supportingDocs.actualWageMemo.length > 100) {
    ctx.yPos += 10;
    addBoldParagraph(ctx, 'Additional Wage Determination Notes:', 10);
    
    // Split memo into lines
    const memoLines = supportingDocs.actualWageMemo.split('\n');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    memoLines.forEach(line => {
      if (line.trim()) {
        checkPageBreak(ctx, 8);
        const wrappedLines = doc.splitTextToSize(line, pageWidth - margin * 2);
        doc.text(wrappedLines, margin, ctx.yPos);
        ctx.yPos += wrappedLines.length * 4 + 2;
      } else {
        ctx.yPos += 3;
      }
    });
  }
  
  // Signature without date
  ctx.yPos += 15;
  const signerName = data.employer.signingAuthorityName || 'Authorized Representative';
  const signerTitle = data.employer.signingAuthorityTitle || undefined;
  addSignatureLine(ctx, signerName, signerTitle, data.employer.legalBusinessName, false);
}
