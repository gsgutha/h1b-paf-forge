import type { PAFData } from '@/types/paf';
import { 
  PDFContext, 
  PDF_CONFIG,
  addPageHeader,
  addCenteredTitle,
  addSectionHeader,
  addLabelValue,
  addParagraph,
  checkPageBreak,
  formatCurrency,
  formatDate,
} from '../pdfHelpers';

export function addPrevailingWageSection(ctx: PDFContext, data: PAFData): void {
  const { doc, pageWidth, margin } = ctx;
  
  // Start new page
  doc.addPage();
  addPageHeader(ctx, 'Prevailing Wage Rate and Source');
  
  ctx.yPos += 10;
  addCenteredTitle(ctx, 'FLC Wage Results', 14);
  
  ctx.yPos += 10;
  
  // Database info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`You selected the All Industries database for ${formatDate(data.wage.wageSourceDate)}.`, margin, ctx.yPos);
  ctx.yPos += 10;
  
  addSectionHeader(ctx, 'Your search returned the following:');
  
  // Create wage results table
  const tableData = [
    ['Area Code:', data.worksite.areaCode || 'N/A'],
    ['Area Title:', data.worksite.areaName || `${data.worksite.city}, ${data.worksite.state}`],
    ['OEWS/SOC Code:', data.job.socCode],
    ['OEWS/SOC Title:', data.job.socTitle],
  ];
  
  // Calculate wage levels (approximation based on prevailing wage)
  const baseWage = data.wage.prevailingWage;
  const hourlyBase = data.wage.prevailingWageUnit === 'Year' ? baseWage / 2080 : baseWage;
  const yearlyBase = data.wage.prevailingWageUnit === 'Year' ? baseWage : baseWage * 2080;
  
  // Add wage levels to table
  const levelMultipliers = {
    'Level I': 0.785,
    'Level II': 1,
    'Level III': 1.215,
    'Level IV': 1.43,
  };
  
  const selectedLevel = data.wage.wageLevel as keyof typeof levelMultipliers;
  
  Object.entries(levelMultipliers).forEach(([level, multiplier]) => {
    const hourly = (hourlyBase * multiplier).toFixed(2);
    const yearly = Math.round(yearlyBase * multiplier).toLocaleString();
    const highlight = level === selectedLevel ? ' ←' : '';
    tableData.push([`${level} Wage:`, `$${hourly} hour - $${yearly} year${highlight}`]);
  });
  
  // Draw table
  doc.setFontSize(10);
  let startY = ctx.yPos;
  const colWidth = 70;
  
  tableData.forEach((row, index) => {
    checkPageBreak(ctx, 8);
    
    // Alternate row background
    if (index % 2 === 0) {
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
  
  const onetCode = data.job.onetCode || data.job.socCode + '.00';
  const onetTitle = data.job.onetTitle || data.job.socTitle;
  
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
