import type { PAFData } from '@/types/paf';
import { 
  PDFContext, 
  PDF_CONFIG,
  addPageHeader,
  addCenteredTitle,
  addSectionHeader,
  addParagraph,
  checkPageBreak,
  formatDate,
} from '../pdfHelpers';

interface WageReportData {
  locationLabel: string;
  locationName: string;
  areaCode: string;
  areaName: string;
  county?: string;
  socCode: string;
  socTitle: string;
  onetCode?: string;
  onetTitle?: string;
  prevailingWage: number;
  prevailingWageUnit: string;
  wageLevel: string;
  wageSource: string;
  wageSourceDate: string;
}

function renderWageReport(ctx: PDFContext, wageData: WageReportData, isFirst: boolean): void {
  const { doc, pageWidth, margin } = ctx;
  
  if (!isFirst) {
    doc.addPage();
  }
  
  addPageHeader(ctx, `Prevailing Wage Rate and Source - ${wageData.locationLabel}`);
  
  ctx.yPos += 10;
  addCenteredTitle(ctx, 'FLC Wage Results', 14);
  
  ctx.yPos += 8;
  
  // Location identification box
  doc.setFillColor(...PDF_CONFIG.colors.lightGray);
  doc.rect(margin, ctx.yPos - 3, pageWidth - margin * 2, 18, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`WORKSITE: ${wageData.locationLabel}`, margin + 5, ctx.yPos + 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(wageData.locationName, margin + 5, ctx.yPos + 10);
  ctx.yPos += 22;
  
  // Database info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`You selected the All Industries database for ${formatDate(wageData.wageSourceDate)}.`, margin, ctx.yPos);
  ctx.yPos += 10;
  
  addSectionHeader(ctx, 'Your search returned the following:');
  
  // Create wage results table
  const tableData = [
    ['Area Code:', wageData.areaCode || 'N/A'],
    ['Area Title:', wageData.areaName],
    ['County:', wageData.county || 'N/A'],
    ['OEWS/SOC Code:', wageData.socCode],
    ['OEWS/SOC Title:', wageData.socTitle],
  ];
  
  // Calculate wage levels (approximation based on prevailing wage)
  const baseWage = wageData.prevailingWage;
  const hourlyBase = wageData.prevailingWageUnit === 'Year' ? baseWage / 2080 : baseWage;
  const yearlyBase = wageData.prevailingWageUnit === 'Year' ? baseWage : baseWage * 2080;
  
  // Add wage levels to table
  const levelMultipliers = {
    'Level I': 0.785,
    'Level II': 1,
    'Level III': 1.215,
    'Level IV': 1.43,
  };
  
  const selectedLevel = wageData.wageLevel as keyof typeof levelMultipliers;
  
  Object.entries(levelMultipliers).forEach(([level, multiplier]) => {
    const hourly = (hourlyBase * multiplier).toFixed(2);
    const yearly = Math.round(yearlyBase * multiplier).toLocaleString();
    const highlight = level === selectedLevel ? ' ← SELECTED' : '';
    tableData.push([`${level} Wage:`, `$${hourly}/hour - $${yearly}/year${highlight}`]);
  });
  
  // Draw table
  doc.setFontSize(10);
  const colWidth = 70;
  
  tableData.forEach((row, index) => {
    checkPageBreak(ctx, 8);
    
    // Check if this is the selected wage level row (exact match)
    const isSelectedWageLevel = row[0] === `${selectedLevel} Wage:`;
    
    // Highlight selected wage level row with green, otherwise alternate gray
    if (isSelectedWageLevel) {
      doc.setFillColor(200, 230, 200);
      doc.rect(margin, ctx.yPos - 4, pageWidth - margin * 2, 7, 'F');
    } else if (index % 2 === 0) {
      doc.setFillColor(...PDF_CONFIG.colors.lightGray);
      doc.rect(margin, ctx.yPos - 4, pageWidth - margin * 2, 7, 'F');
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text(row[0], margin + 2, ctx.yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(row[1], margin + colWidth, ctx.yPos);
    ctx.yPos += 7;
  });
  
  ctx.yPos += 10;
  
  // O*NET occupation info
  addSectionHeader(ctx, 'This wage applies to the following O*NET occupations:');
  
  const onetCode = wageData.onetCode || wageData.socCode + '.00';
  const onetTitle = wageData.onetTitle || wageData.socTitle;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${onetCode} ${onetTitle}`, margin, ctx.yPos);
  ctx.yPos += 10;
  
  // SOC description placeholder
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const description = `This occupation includes workers who perform duties related to ${onetTitle.toLowerCase()}. Workers in this occupation typically require specialized education and training in their field.`;
  const descLines = doc.splitTextToSize(description, pageWidth - margin * 2);
  doc.text(descLines, margin, ctx.yPos);
  ctx.yPos += descLines.length * 4 + 8;
  
  // Education info
  doc.setFont('helvetica', 'bold');
  doc.text('Education & Training Code: 4-Bachelor\'s degree', margin, ctx.yPos);
  ctx.yPos += 10;
  
  // Footer notes
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...PDF_CONFIG.colors.gray);
  addParagraph(ctx, 'For information on determining the proper occupation and wage level see the Prevailing Wage Guidance on the Skill Level page at OFLC.');
  addParagraph(ctx, 'The offered wage must be at, or above the federal or state or local minimum wage, whichever is higher.');
  doc.setTextColor(...PDF_CONFIG.colors.black);
}

export function addPrevailingWageSection(ctx: PDFContext, data: PAFData): void {
  // Primary worksite wage report
  const primaryWorksite = data.worksite;
  const primaryWage: WageReportData = {
    locationLabel: 'Primary Worksite',
    locationName: `${primaryWorksite.worksiteName ? primaryWorksite.worksiteName + ', ' : ''}${primaryWorksite.address1}, ${primaryWorksite.city}, ${primaryWorksite.state} ${primaryWorksite.postalCode}`,
    areaCode: primaryWorksite.areaCode || '',
    areaName: primaryWorksite.areaName || `${primaryWorksite.city}, ${primaryWorksite.state}`,
    county: primaryWorksite.county,
    socCode: data.job.socCode,
    socTitle: data.job.socTitle,
    onetCode: data.job.onetCode,
    onetTitle: data.job.onetTitle,
    prevailingWage: data.wage.prevailingWage,
    prevailingWageUnit: data.wage.prevailingWageUnit,
    wageLevel: data.wage.wageLevel,
    wageSource: data.wage.wageSource,
    wageSourceDate: data.wage.wageSourceDate,
  };
  
  // Start new page for primary
  ctx.doc.addPage();
  renderWageReport(ctx, primaryWage, true);
  
  // Secondary worksite wage report (if different county)
  if (
    data.worksite.hasSecondaryWorksite && 
    data.worksite.secondaryWorksite &&
    data.wage.hasSecondaryWage &&
    data.wage.secondaryWage
  ) {
    const secondaryWorksite = data.worksite.secondaryWorksite;
    const secondaryWage = data.wage.secondaryWage;
    
    const secondaryWageData: WageReportData = {
      locationLabel: 'Secondary Worksite',
      locationName: `${secondaryWorksite.worksiteName ? secondaryWorksite.worksiteName + ', ' : ''}${secondaryWorksite.address1}, ${secondaryWorksite.city}, ${secondaryWorksite.state} ${secondaryWorksite.postalCode}`,
      areaCode: secondaryWage.areaCode || '',
      areaName: secondaryWage.areaName || `${secondaryWorksite.city}, ${secondaryWorksite.state}`,
      county: secondaryWorksite.county,
      socCode: data.job.socCode,
      socTitle: data.job.socTitle,
      onetCode: data.job.onetCode,
      onetTitle: data.job.onetTitle,
      prevailingWage: secondaryWage.prevailingWage,
      prevailingWageUnit: secondaryWage.prevailingWageUnit,
      wageLevel: secondaryWage.wageLevel,
      wageSource: secondaryWage.wageSource,
      wageSourceDate: secondaryWage.wageSourceDate,
    };
    
    renderWageReport(ctx, secondaryWageData, false);
  }
}
