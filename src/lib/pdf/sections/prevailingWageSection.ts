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
  // Real level values from DB lookup (all 4 levels)
  wageLevelData?: {
    levelI_hourly: number | null;
    levelI_annual: number | null;
    levelII_hourly: number | null;
    levelII_annual: number | null;
    levelIII_hourly: number | null;
    levelIII_annual: number | null;
    levelIV_hourly: number | null;
    levelIV_annual: number | null;
  };
}

interface LevelEntry {
  label: string;
  hourly: number;
  annual: number;
}

function buildLevelEntries(wageData: WageReportData): LevelEntry[] {
  const ld = wageData.wageLevelData;

  // If we have real DB level data, use it directly
  if (
    ld &&
    ld.levelI_annual != null &&
    ld.levelII_annual != null &&
    ld.levelIII_annual != null &&
    ld.levelIV_annual != null
  ) {
    return [
      { label: 'Level I', hourly: ld.levelI_hourly ?? (ld.levelI_annual / 2080), annual: ld.levelI_annual },
      { label: 'Level II', hourly: ld.levelII_hourly ?? (ld.levelII_annual / 2080), annual: ld.levelII_annual },
      { label: 'Level III', hourly: ld.levelIII_hourly ?? (ld.levelIII_annual / 2080), annual: ld.levelIII_annual },
      { label: 'Level IV', hourly: ld.levelIV_hourly ?? (ld.levelIV_annual / 2080), annual: ld.levelIV_annual },
    ];
  }

  // Fallback: derive from prevailing wage using multipliers relative to the selected level
  const baseWage = wageData.prevailingWage;
  const yearlyBase = wageData.prevailingWageUnit === 'Year' ? baseWage : baseWage * 2080;
  const hourlyBase = wageData.prevailingWageUnit === 'Year' ? baseWage / 2080 : baseWage;

  // Multipliers relative to selected level
  const levelMultipliers: Record<string, number> = {
    'Level I': 0.785,
    'Level II': 1,
    'Level III': 1.215,
    'Level IV': 1.43,
  };

  const selectedMultiplier = levelMultipliers[wageData.wageLevel] ?? 1;

  return ['Level I', 'Level II', 'Level III', 'Level IV'].map(level => {
    const ratio = levelMultipliers[level] / selectedMultiplier;
    return {
      label: level,
      hourly: hourlyBase * ratio,
      annual: yearlyBase * ratio,
    };
  });
}

function renderWageReport(ctx: PDFContext, wageData: WageReportData, isFirst: boolean): void {
  const { doc, pageWidth, margin } = ctx;
  
  if (!isFirst) {
    doc.addPage();
  }
  
  addPageHeader(ctx, `Prevailing Wage Rate and Source - ${wageData.locationLabel}`);
  
  ctx.yPos += 6;

  // FLAG.DOL.GOV branded header box
  const headerBoxY = ctx.yPos;
  const headerBoxH = 22;
  doc.setFillColor(13, 47, 99); // DOL navy blue
  doc.rect(margin, headerBoxY, pageWidth - margin * 2, headerBoxH, 'F');

  // FLAG.DOL.GOV text
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('FLAG', margin + 5, headerBoxY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('.DOL.GOV', margin + 19, headerBoxY + 10);

  // FLC Wage Results label
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('FLC Wage Results', pageWidth / 2, headerBoxY + headerBoxH / 2 + 2, { align: 'center' });

  // Subtitle
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 215, 235);
  doc.text('Foreign Labor Certification Data Center', pageWidth / 2, headerBoxY + headerBoxH / 2 + 8, { align: 'center' });

  doc.setTextColor(...PDF_CONFIG.colors.black);
  ctx.yPos = headerBoxY + headerBoxH + 6;
  
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
  const tableData: [string, string][] = [
    ['Area Code:', wageData.areaCode || 'N/A'],
    ['Area Title:', wageData.areaName],
    ['County:', wageData.county || 'N/A'],
    ['OEWS/SOC Code:', wageData.socCode],
    ['OEWS/SOC Title:', wageData.socTitle],
  ];
  
  // Build real level entries
  const levelEntries = buildLevelEntries(wageData);

  levelEntries.forEach(({ label, hourly, annual }) => {
    const highlight = label === wageData.wageLevel ? ' ← SELECTED' : '';
    tableData.push([
      `${label} Wage:`,
      `$${hourly.toFixed(2)}/hour - $${Math.round(annual).toLocaleString()}/year${highlight}`,
    ]);
  });
  
  // Draw table
  doc.setFontSize(10);
  const colWidth = 70;
  
  tableData.forEach((row, index) => {
    checkPageBreak(ctx, 8);
    
    // Check if this is the selected wage level row
    const isSelectedWageLevel = row[0] === `${wageData.wageLevel} Wage:`;
    
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
    wageLevelData: data.wage.wageLevelData,
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
      prevailingWageUnit: secondaryWage.prevailingWageUnit ?? 'Year',
      wageLevel: secondaryWage.wageLevel ?? 'Level I',
      wageSource: secondaryWage.wageSource ?? '',
      wageSourceDate: secondaryWage.wageSourceDate ?? '',
    };
    
    renderWageReport(ctx, secondaryWageData, false);
  }
}
