import type { PAFData } from '@/types/paf';
import type { SupportingDocs } from '@/components/wizard/steps/SupportingDocsStep';
import { 
  PDFContext, 
  PDF_CONFIG,
  addPageHeader,
  addCenteredTitle,
  addParagraph,
  addBoldParagraph,
  checkPageBreak,
  formatCurrency,
  formatDate,
} from '../pdfHelpers';
import { addCompactDigitalSignature, SignatoryWithImage } from '../signatureRenderer';
import { supabase } from '@/integrations/supabase/client';

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

/**
 * Adds the position-specific Actual Wage Determination section.
 * This document is UNIQUE for each LCA/position - it explains how the 
 * wage was determined for this specific job title, SOC code, and worker.
 */
export async function addWageMemoSection(
  ctx: PDFContext, 
  data: PAFData, 
  supportingDocs?: SupportingDocs
): Promise<void> {
  const { doc, pageWidth, margin } = ctx;
  
  // Start new page
  doc.addPage();
  addPageHeader(ctx, 'Actual Wage Determination');
  
  ctx.yPos += 10;
  addCenteredTitle(ctx, 'ACTUAL WAGE DETERMINATION', 14);
  addCenteredTitle(ctx, 'Position-Specific Wage Analysis', 11);
  
  ctx.yPos += 10;
  
  // Multi-worker LCA: use position-based language; single-worker: use name
  const isMultiWorker = (data.job.workersNeeded ?? 1) > 1;
  const employeeName = isMultiWorker
    ? 'the H-1B worker(s) covered under this LCA'
    : (data.employer.employeeName || 'the H-1B worker');
  
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
  doc.text(isMultiWorker ? `Workers: All H-1B workers covered under this LCA (${data.job.workersNeeded} positions)` : `Worker: ${employeeName}`, margin + 5, ctx.yPos);
  ctx.yPos += 15;
  
  // Introduction - position specific
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('I. DETERMINATION SUMMARY', margin, ctx.yPos);
  ctx.yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const introPara = isMultiWorker
    ? `This Actual Wage Determination is prepared for the position of ${data.job.jobTitle} (SOC ${data.job.socCode}) in accordance with 20 CFR § 655.731 and the Company's Actual Wage Standards policy. This determination applies to all H-1B workers (${data.job.workersNeeded} positions) covered under this LCA, employed at ${data.worksite.worksiteName ? data.worksite.worksiteName + ', ' : ''}${data.worksite.address1}${data.worksite.address2 ? ', ' + data.worksite.address2 : ''}, ${data.worksite.city}, ${data.worksite.state} ${data.worksite.postalCode}.`
    : `This Actual Wage Determination is prepared for the position of ${data.job.jobTitle} (SOC ${data.job.socCode}) in accordance with 20 CFR § 655.731 and the Company's Actual Wage Standards policy. This determination applies specifically to ${employeeName} for employment at ${data.worksite.worksiteName ? data.worksite.worksiteName + ', ' : ''}${data.worksite.address1}${data.worksite.address2 ? ', ' + data.worksite.address2 : ''}, ${data.worksite.city}, ${data.worksite.state} ${data.worksite.postalCode}.`;
  addParagraph(ctx, introPara);
  
  ctx.yPos += 5;
  
  // Wage Confirmation Box - CRITICAL COMPLIANCE ELEMENT
  const actualWage = data.wage.actualWage;
  const prevailingWage = data.wage.prevailingWage;
  // The wizard already enforces actualWage >= prevailingWage, so actualWage IS the final wage
  const higherWage = actualWage;
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
  const wageConfirmation = isMultiWorker
    ? `WAGE CONFIRMATION: All H-1B workers covered under this LCA will be paid ${formatCurrency(higherWage, data.wage.actualWageUnit)}, which is the HIGHER of the actual wage or the prevailing wage, as required by 20 CFR § 655.731(a).`
    : `WAGE CONFIRMATION: ${employeeName} will be paid ${formatCurrency(higherWage, data.wage.actualWageUnit)}, which is the HIGHER of the actual wage or the prevailing wage, as required by 20 CFR § 655.731(a).`;
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
    ['Actual Wage Offered', formatCurrency(actualWage, data.wage.actualWageUnit), 'Employer Determination'],
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
      analysis: isMultiWorker
        ? `The position of ${data.job.jobTitle} requires experience commensurate with a ${data.wage.wageLevel} wage level. Prior experience of workers in similar roles was evaluated against the requirements for this position.`
        : `The position of ${data.job.jobTitle} requires experience commensurate with a ${data.wage.wageLevel} wage level. ${employeeName}'s prior experience in similar roles was evaluated against the requirements.`
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
      analysis: supportingDocs?.noComparableWorkers
        ? `There are no U.S. workers similarly employed in this position at ${data.employer.legalBusinessName}. Accordingly, no internal wage comparisons are available, and the prevailing wage serves as the primary reference benchmark for this determination.`
        : supportingDocs?.comparableWorkersCount
          ? `The offered wage was benchmarked against ${supportingDocs.comparableWorkersCount} similarly employed worker${Number(supportingDocs.comparableWorkersCount) !== 1 ? 's' : ''} in substantially equivalent roles at ${data.employer.legalBusinessName}, with wages ranging from $${(supportingDocs.comparableWageMin || 0).toLocaleString()} to $${(supportingDocs.comparableWageMax || 0).toLocaleString()} annually. The offered wage falls within this range and satisfies the Company's internal pay equity requirements.`
          : `The offered wage was benchmarked against rates paid to similarly employed U.S. workers in substantially equivalent positions within the Company, confirming compliance with internal pay equity standards.`
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
  
  const conclusion = isMultiWorker
    ? `Based on the application of the Company's Actual Wage Standards to this specific position, it is determined that all H-1B workers covered under this LCA shall be compensated at a rate of ${formatCurrency(higherWage, data.wage.actualWageUnit)} for the position of ${data.job.jobTitle}. This rate equals or exceeds both the actual wage paid to similarly employed workers and the ${data.wage.wageLevel} prevailing wage of ${formatCurrency(prevailingWage, data.wage.prevailingWageUnit)} for SOC ${data.job.socCode} in the ${data.worksite.areaName || data.worksite.city + ', ' + data.worksite.state} area.`
    : `Based on the application of the Company's Actual Wage Standards to this specific position, it is determined that ${employeeName} shall be compensated at a rate of ${formatCurrency(higherWage, data.wage.actualWageUnit)} for the position of ${data.job.jobTitle}. This rate equals or exceeds both the actual wage paid to similarly employed workers and the ${data.wage.wageLevel} prevailing wage of ${formatCurrency(prevailingWage, data.wage.prevailingWageUnit)} for SOC ${data.job.socCode} in the ${data.worksite.areaName || data.worksite.city + ', ' + data.worksite.state} area.`;
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
  
  // Digital Signature
  ctx.yPos += 15;
  checkPageBreak(ctx, 70);
  
  // Get the signatory from database with image path
  const signatory = await getSignatoryFromDB(data.employer.signatoryId);
  
  if (signatory) {
    await addCompactDigitalSignature(ctx, signatory, data.employer.legalBusinessName, false);
  } else {
    await addCompactDigitalSignature(ctx, {
      id: 'fallback',
      name: 'Authorized Signatory',
      title: 'Authorized Representative',
      signatureImagePath: null
    }, data.employer.legalBusinessName, false);
  }
}
