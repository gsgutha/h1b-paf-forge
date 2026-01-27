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

/**
 * Adds the position-specific Actual Wage Determination section.
 * This document is UNIQUE for each LCA/position - it explains how the 
 * wage was determined for this specific job title, SOC code, and worker.
 */
export function addWageMemoSection(
  ctx: PDFContext, 
  data: PAFData, 
  supportingDocs?: SupportingDocs
): void {
  const { doc, pageWidth, margin } = ctx;
  
  // Start new page
  doc.addPage();
  addPageHeader(ctx, 'Actual Wage Determination');
  
  ctx.yPos += 10;
  addCenteredTitle(ctx, 'ACTUAL WAGE DETERMINATION', 14);
  addCenteredTitle(ctx, 'Position-Specific Wage Analysis', 11);
  
  ctx.yPos += 10;
  
  // Employee name for personalization
  const employeeName = data.employer.employeeName || 'the H-1B worker';
  
  // Position Identification Box
  doc.setFillColor(...PDF_CONFIG.colors.lightGray);
  const boxHeight = 45;
  doc.rect(margin, ctx.yPos, pageWidth - margin * 2, boxHeight, 'F');
  ctx.yPos += 8;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('POSITION IDENTIFICATION', margin + 5, ctx.yPos);
  ctx.yPos += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Job Title: ${data.job.jobTitle}`, margin + 5, ctx.yPos);
  ctx.yPos += 6;
  doc.text(`SOC Code: ${data.job.socCode} - ${data.job.socTitle}`, margin + 5, ctx.yPos);
  ctx.yPos += 6;
  if (data.job.onetCode) {
    doc.text(`O*NET Code: ${data.job.onetCode}${data.job.onetTitle ? ' - ' + data.job.onetTitle : ''}`, margin + 5, ctx.yPos);
    ctx.yPos += 6;
  }
  doc.text(`Worker: ${employeeName}`, margin + 5, ctx.yPos);
  ctx.yPos += 15;
  
  // Introduction - position specific
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('I. DETERMINATION SUMMARY', margin, ctx.yPos);
  ctx.yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const introPara = `This Actual Wage Determination is prepared for the position of ${data.job.jobTitle} (SOC ${data.job.socCode}) in accordance with 20 CFR § 655.731 and the Company's Actual Wage Standards policy. This determination applies specifically to ${employeeName} for employment at ${data.worksite.worksiteName ? data.worksite.worksiteName + ', ' : ''}${data.worksite.address1}, ${data.worksite.city}, ${data.worksite.state} ${data.worksite.postalCode}.`;
  addParagraph(ctx, introPara);
  
  ctx.yPos += 5;
  
  // Wage Confirmation Box - CRITICAL COMPLIANCE ELEMENT
  const actualWage = data.wage.actualWage;
  const prevailingWage = data.wage.prevailingWage;
  const higherWage = Math.max(actualWage, prevailingWage);
  const wageSource = actualWage >= prevailingWage ? 'actual wage' : 'prevailing wage';
  
  doc.setFillColor(220, 245, 220); // Light green
  const confirmBoxHeight = 30;
  doc.rect(margin, ctx.yPos, pageWidth - margin * 2, confirmBoxHeight, 'F');
  doc.setDrawColor(34, 139, 34); // Forest green border
  doc.rect(margin, ctx.yPos, pageWidth - margin * 2, confirmBoxHeight, 'S');
  ctx.yPos += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 100, 0);
  const wageConfirmation = `WAGE CONFIRMATION: ${employeeName} will be paid ${formatCurrency(higherWage, data.wage.actualWageUnit)}, which is the HIGHER of the actual wage or the prevailing wage, as required by 20 CFR § 655.731(a).`;
  const confirmLines = doc.splitTextToSize(wageConfirmation, pageWidth - margin * 2 - 10);
  doc.text(confirmLines, margin + 5, ctx.yPos);
  doc.setTextColor(0, 0, 0); // Reset to black
  ctx.yPos += confirmBoxHeight - 5;
  
  ctx.yPos += 10;
  doc.setFont('helvetica', 'normal');
  
  // Employment Details
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('II. EMPLOYMENT DETAILS', margin, ctx.yPos);
  ctx.yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const employmentDetails = [
    `Employment Period: ${formatDate(data.job.beginDate)} to ${formatDate(data.job.endDate)}`,
    `Employment Type: ${data.job.isFullTime ? 'Full-Time' : 'Part-Time'}`,
    `Workers Needed: ${data.job.workersNeeded}`,
    `Worksite: ${data.worksite.city}, ${data.worksite.state}`,
    data.worksite.areaName ? `Wage Area: ${data.worksite.areaName}` : '',
  ].filter(Boolean);
  
  employmentDetails.forEach(detail => {
    doc.text(detail, margin, ctx.yPos);
    ctx.yPos += 6;
  });
  
  ctx.yPos += 5;
  
  // Wage Analysis
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('III. WAGE ANALYSIS', margin, ctx.yPos);
  ctx.yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Create a table-like structure
  const wageData = [
    ['Wage Type', 'Amount', 'Source'],
    ['Prevailing Wage', formatCurrency(prevailingWage, data.wage.prevailingWageUnit), data.wage.wageSource],
    ['Wage Level', data.wage.wageLevel, `As of ${formatDate(data.wage.wageSourceDate)}`],
    ['Actual Wage Offered', formatCurrency(data.job.wageRateFrom, data.job.wageUnit), 'Employer Determination'],
    ['Final Wage (Higher Of)', formatCurrency(higherWage, data.wage.actualWageUnit), wageSource === 'actual wage' ? 'Actual Wage Applied' : 'Prevailing Wage Applied'],
  ];
  
  doc.setFont('helvetica', 'bold');
  doc.text(wageData[0][0], margin, ctx.yPos);
  doc.text(wageData[0][1], margin + 60, ctx.yPos);
  doc.text(wageData[0][2], margin + 120, ctx.yPos);
  ctx.yPos += 6;
  
  doc.setFont('helvetica', 'normal');
  for (let i = 1; i < wageData.length; i++) {
    doc.text(wageData[i][0], margin, ctx.yPos);
    doc.text(wageData[i][1], margin + 60, ctx.yPos);
    doc.text(wageData[i][2], margin + 120, ctx.yPos);
    ctx.yPos += 6;
  }
  
  ctx.yPos += 10;
  checkPageBreak(ctx, 80);
  
  // Factors Applied - Position-Specific Analysis
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('IV. FACTORS APPLIED TO THIS POSITION', margin, ctx.yPos);
  ctx.yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  addParagraph(ctx, `In determining the wage for the ${data.job.jobTitle} position, the following factors from our Actual Wage Standards policy were evaluated:`);
  
  ctx.yPos += 5;
  
  const positionFactors = [
    {
      factor: 'Experience Requirements',
      analysis: `The position of ${data.job.jobTitle} requires experience commensurate with a ${data.wage.wageLevel} wage level. ${employeeName}'s prior experience in similar roles was evaluated against the requirements.`
    },
    {
      factor: 'Educational Qualifications',
      analysis: `Educational credentials appropriate for the ${data.job.socTitle} occupational classification (SOC ${data.job.socCode}) were verified and considered in the wage determination.`
    },
    {
      factor: 'Job Responsibility',
      analysis: `The duties and responsibilities of the ${data.job.jobTitle} position, including the level of autonomy and decision-making authority, support the determined wage rate.`
    },
    {
      factor: 'Specialized Skills',
      analysis: data.job.onetCode 
        ? `The position aligns with O*NET ${data.job.onetCode} (${data.job.onetTitle}), which defines the specialized knowledge and skills required for this role.`
        : `The technical skills and specialized knowledge required for the ${data.job.socTitle} classification were assessed.`
    },
    {
      factor: 'Comparable Employees',
      analysis: `The wage was compared against rates paid to similarly employed U.S. workers in comparable positions within the Company to ensure internal equity.`
    }
  ];
  
  positionFactors.forEach((item, index) => {
    checkPageBreak(ctx, 25);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${item.factor}:`, margin, ctx.yPos);
    doc.setFont('helvetica', 'normal');
    ctx.yPos += 5;
    
    const lines = doc.splitTextToSize(item.analysis, pageWidth - margin * 2 - 10);
    doc.text(lines, margin + 5, ctx.yPos);
    ctx.yPos += lines.length * 5 + 5;
  });
  
  ctx.yPos += 5;
  checkPageBreak(ctx, 50);
  
  // Conclusion
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('V. DETERMINATION CONCLUSION', margin, ctx.yPos);
  ctx.yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const conclusion = `Based on the application of the Company's Actual Wage Standards to this specific position, it is determined that ${employeeName} shall be compensated at a rate of ${formatCurrency(higherWage, data.wage.actualWageUnit)} for the position of ${data.job.jobTitle}. This rate equals or exceeds both the actual wage paid to similarly employed workers and the ${data.wage.wageLevel} prevailing wage of ${formatCurrency(prevailingWage, data.wage.prevailingWageUnit)} for SOC ${data.job.socCode} in the ${data.worksite.areaName || data.worksite.city + ', ' + data.worksite.state} area.`;
  addParagraph(ctx, conclusion);
  
  // If user provided additional notes, include them
  if (supportingDocs?.actualWageMemo && supportingDocs.actualWageMemo.length > 10) {
    ctx.yPos += 10;
    checkPageBreak(ctx, 40);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('VI. ADDITIONAL NOTES', margin, ctx.yPos);
    ctx.yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    const memoLines = supportingDocs.actualWageMemo.split('\n');
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
  checkPageBreak(ctx, 40);
  const signerName = data.employer.signingAuthorityName || 'Authorized Representative';
  const signerTitle = data.employer.signingAuthorityTitle || undefined;
  addSignatureLine(ctx, signerName, signerTitle, data.employer.legalBusinessName, false);
}
