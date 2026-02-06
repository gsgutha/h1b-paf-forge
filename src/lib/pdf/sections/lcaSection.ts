import type { PAFData } from '@/types/paf';
import type { SupportingDocs } from '@/components/wizard/steps/SupportingDocsStep';
import { 
  PDFContext, 
  PDF_CONFIG,
  addPageHeader,
  addSectionHeader,
  addSubsectionHeader,
  addLabelValue,
  addParagraph,
  checkPageBreak,
  formatDate,
  formatCurrency,
} from '../pdfHelpers';
import { embedFile } from '../embedPdf';

export async function addLCASection(
  ctx: PDFContext, 
  data: PAFData, 
  supportingDocs?: SupportingDocs
): Promise<void> {
  const { doc, pageWidth, margin } = ctx;
  
  // Start new page for LCA
  doc.addPage();
  addPageHeader(ctx, 'Labor Condition Application for Nonimmigrant Workers - Form ETA-9035 & 9035E');
  
  ctx.yPos += 5;
  
  // Header info
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...PDF_CONFIG.colors.gray);
  doc.text('OMB Approval: 1205-0310', pageWidth - margin, 30, { align: 'right' });
  doc.setTextColor(...PDF_CONFIG.colors.black);
  
  // Section A: Visa Information
  addSectionHeader(ctx, 'A. Employment-Based Nonimmigrant Visa Information');
  addLabelValue(ctx, 'Visa Classification', data.visaType);
  ctx.yPos += 5;
  
  // Section B: Temporary Need Information
  addSectionHeader(ctx, 'B. Temporary Need Information');
  addLabelValue(ctx, 'Job Title', data.job.jobTitle);
  addLabelValue(ctx, 'SOC (ONET/OES) Code', data.job.socCode);
  addLabelValue(ctx, 'SOC (ONET/OES) Occupation Title', data.job.socTitle);
  if (data.job.onetCode) {
    addLabelValue(ctx, 'O*NET Code', data.job.onetCode);
    addLabelValue(ctx, 'O*NET Title', data.job.onetTitle);
  }
  addLabelValue(ctx, 'Full-Time Position', data.job.isFullTime);
  addLabelValue(ctx, 'Begin Date', formatDate(data.job.beginDate));
  addLabelValue(ctx, 'End Date', formatDate(data.job.endDate));
  addLabelValue(ctx, 'Number of Workers', data.job.workersNeeded);
  ctx.yPos += 5;
  
  // Section C: Employer Information
  checkPageBreak(ctx, 80);
  addSectionHeader(ctx, 'C. Employer Information');
  addLabelValue(ctx, 'Legal Business Name', data.employer.legalBusinessName);
  if (data.employer.tradeName) {
    addLabelValue(ctx, 'Trade Name/DBA', data.employer.tradeName);
  }
  addLabelValue(ctx, 'Address 1', data.employer.address1);
  if (data.employer.address2) {
    addLabelValue(ctx, 'Address 2', data.employer.address2);
  }
  addLabelValue(ctx, 'City', data.employer.city);
  addLabelValue(ctx, 'State', data.employer.state);
  addLabelValue(ctx, 'Postal Code', data.employer.postalCode);
  addLabelValue(ctx, 'Country', data.employer.country);
  addLabelValue(ctx, 'Telephone', data.employer.telephone);
  addLabelValue(ctx, 'FEIN', data.employer.fein);
  addLabelValue(ctx, 'NAICS Code', data.employer.naicsCode);
  ctx.yPos += 5;
  
  // Section F: Employment and Wage Information
  checkPageBreak(ctx, 60);
  addSectionHeader(ctx, 'F. Employment and Wage Information');
  
  // Primary Worksite
  addSubsectionHeader(ctx, 'Place of Employment Information - Primary Worksite');
  addLabelValue(ctx, 'Number of Workers', data.job.workersNeeded);
  if (data.worksite.worksiteName) {
    addLabelValue(ctx, 'Worksite Name', data.worksite.worksiteName);
  }
  addLabelValue(ctx, 'Address', `${data.worksite.address1}${data.worksite.address2 ? ', ' + data.worksite.address2 : ''}`);
  addLabelValue(ctx, 'City', data.worksite.city);
  if (data.worksite.county) {
    addLabelValue(ctx, 'County', data.worksite.county);
  }
  addLabelValue(ctx, 'State', data.worksite.state);
  addLabelValue(ctx, 'Postal Code', data.worksite.postalCode);
  
  ctx.yPos += 5;
  const wageDisplay = data.job.wageRateTo 
    ? `${formatCurrency(data.job.wageRateFrom, data.job.wageUnit)} to ${formatCurrency(data.job.wageRateTo, data.job.wageUnit)}`
    : formatCurrency(data.job.wageRateFrom, data.job.wageUnit);
  addLabelValue(ctx, 'Wage Rate Paid', wageDisplay);
  addLabelValue(ctx, 'Prevailing Wage', formatCurrency(data.wage.prevailingWage, data.wage.prevailingWageUnit));
  addLabelValue(ctx, 'Wage Level', data.wage.wageLevel);
  addLabelValue(ctx, 'Wage Source', data.wage.wageSource);
  addLabelValue(ctx, 'Source Year/Date', formatDate(data.wage.wageSourceDate));
  
  // Secondary Worksite (if present)
  if (data.worksite.hasSecondaryWorksite && data.worksite.secondaryWorksite) {
    const secondary = data.worksite.secondaryWorksite;
    
    ctx.yPos += 10;
    checkPageBreak(ctx, 60);
    addSubsectionHeader(ctx, 'Place of Employment Information - Secondary Worksite');
    
    if (secondary.worksiteName) {
      addLabelValue(ctx, 'Worksite Name', secondary.worksiteName);
    }
    addLabelValue(ctx, 'Address', `${secondary.address1}${secondary.address2 ? ', ' + secondary.address2 : ''}`);
    addLabelValue(ctx, 'City', secondary.city);
    if (secondary.county) {
      addLabelValue(ctx, 'County', secondary.county);
    }
    addLabelValue(ctx, 'State', secondary.state);
    addLabelValue(ctx, 'Postal Code', secondary.postalCode);
    
    // Secondary worksite wage info (if different county with separate wage)
    if (data.wage.hasSecondaryWage && data.wage.secondaryWage) {
      const secondaryWage = data.wage.secondaryWage;
      ctx.yPos += 5;
      addLabelValue(ctx, 'Wage Rate Paid', wageDisplay); // Same actual wage for both
      addLabelValue(ctx, 'Prevailing Wage', formatCurrency(secondaryWage.prevailingWage, secondaryWage.prevailingWageUnit));
      addLabelValue(ctx, 'Wage Level', secondaryWage.wageLevel);
      addLabelValue(ctx, 'Wage Source', secondaryWage.wageSource);
      addLabelValue(ctx, 'Source Year/Date', formatDate(secondaryWage.wageSourceDate));
    } else {
      // Same wage info as primary
      ctx.yPos += 5;
      addLabelValue(ctx, 'Wage Rate Paid', wageDisplay);
      addLabelValue(ctx, 'Prevailing Wage', formatCurrency(data.wage.prevailingWage, data.wage.prevailingWageUnit));
      addLabelValue(ctx, 'Wage Level', data.wage.wageLevel);
      addLabelValue(ctx, 'Wage Source', data.wage.wageSource);
      addLabelValue(ctx, 'Source Year/Date', formatDate(data.wage.wageSourceDate));
    }
  }
  
  // Section H: H-1B Dependency
  checkPageBreak(ctx, 40);
  addSectionHeader(ctx, 'H. Additional Employer Labor Condition Statements');
  addLabelValue(ctx, 'H-1B Dependent Employer', data.isH1BDependent);
  addLabelValue(ctx, 'Willful Violator', data.isWillfulViolator);
  
  // Case certification info
  if (supportingDocs?.lcaCaseNumber) {
    ctx.yPos += 10;
    doc.setFillColor(...PDF_CONFIG.colors.lightGray);
    doc.rect(margin, ctx.yPos - 3, pageWidth - 2 * margin, 12, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    ctx.yPos += 5;
    doc.text(`Case Number: ${supportingDocs.lcaCaseNumber}`, margin + 5, ctx.yPos);
    const lcaStatusLabel = data.caseStatus === 'In Process' ? 'In Process' : (data.caseStatus || 'Certified');
    doc.text(`Status: ${lcaStatusLabel}`, margin + 100, ctx.yPos);
    doc.text(`Period: ${formatDate(data.job.beginDate)} to ${formatDate(data.job.endDate)}`, margin + 5, ctx.yPos + 6);
    ctx.yPos += 15;
  }
  
  // EMBED THE UPLOADED LCA PDF
  if (supportingDocs?.lcaFile) {
    await embedFile(ctx, supportingDocs.lcaFile, 'Certified LCA (ETA Form 9035/9035E)');
  }
}
