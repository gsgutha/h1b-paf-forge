import type { PAFData } from '@/types/paf';
import type { SupportingDocs } from '@/components/wizard/steps/SupportingDocsStep';
import { 
  PDFContext, 
  PDF_CONFIG,
  addPageHeader,
  addCenteredTitle,
  addParagraph,
  addSignatureLine,
  checkPageBreak,
} from '../pdfHelpers';
import { embedFile } from '../embedPdf';

export async function addBenefitsSection(
  ctx: PDFContext, 
  data: PAFData, 
  supportingDocs?: SupportingDocs
): Promise<void> {
  const { doc, pageWidth, margin } = ctx;
  
  // Start new page
  doc.addPage();
  addPageHeader(ctx, 'Benefits Summary');
  
  ctx.yPos += 10;
  addCenteredTitle(ctx, 'SUMMARY OF BENEFITS OFFERED TO ALL EMPLOYEES', 14);
  
  ctx.yPos += 10;
  
  // Introduction
  const introText = `All workers that are employed by ${data.employer.legalBusinessName} are entitled to the same benefits regardless of race, gender, nationality, immigration status, or any other factor.`;
  addParagraph(ctx, introText);
  
  // Check if user uploaded an external benefits document
  if (supportingDocs?.benefitsComparisonFile) {
    // User uploaded external benefits - embed it
    ctx.yPos += 5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Benefits documentation attached below:', margin, ctx.yPos);
    ctx.yPos += 10;
    
    // Embed the benefits document
    await embedFile(ctx, supportingDocs.benefitsComparisonFile, 'Benefits Documentation');
  } else {
    // Use the template-based benefits summary
    ctx.yPos += 5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('A summary of the offered benefits includes:', margin, ctx.yPos);
    ctx.yPos += 10;
    
    // Default benefits list
    const defaultBenefits = [
      'Medical insurance for the employee and additional beneficiaries (at the employee\'s discretion).',
      'Dental insurance for the employee and additional beneficiaries (at the employee\'s discretion).',
      'Vision insurance for the employee and additional beneficiaries (at the employee\'s discretion).',
      '401(k) Retirement Plan with employer matching contributions.',
      'Paid Time Off (PTO) in accordance with company policy.',
      'Paid holidays as per company calendar.',
      'Life insurance coverage.',
      'Reimbursement of expenses incurred while performing duties that are tied to their job description and responsibilities.',
    ];
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    defaultBenefits.forEach((benefit) => {
      checkPageBreak(ctx, 12);
      doc.text('•', margin + 5, ctx.yPos);
      const lines = doc.splitTextToSize(benefit, pageWidth - margin * 2 - 15);
      doc.text(lines, margin + 12, ctx.yPos);
      ctx.yPos += lines.length * 5 + 3;
    });
    
    ctx.yPos += 5;
    
    // Waiver statement
    addParagraph(ctx, 'All employees also have the right to waive any type of insurance or reimbursement offers, and documentation of the same can be found in the employee\'s personal file (if the employee does indeed waive claims to insurance or reimbursement).');
    
    // If user provided custom benefits notes (more than just the default template)
    if (supportingDocs?.benefitsNotes && supportingDocs.benefitsNotes.length > 50 && 
        !supportingDocs.benefitsNotes.includes('BENEFITS COMPARISON - U.S. Workers vs. H-1B Workers')) {
      ctx.yPos += 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Additional Benefits Information:', margin, ctx.yPos);
      ctx.yPos += 8;
      
      // Parse and display the benefits notes
      const notesLines = supportingDocs.benefitsNotes.split('\n');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      notesLines.forEach(line => {
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
  }
  
  // Signature
  checkPageBreak(ctx, 40);
  ctx.yPos += 15;
  const signerName = supportingDocs?.signingAuthorityName || 'Authorized Representative';
  const signerTitle = supportingDocs?.signingAuthorityTitle || undefined;
  addSignatureLine(ctx, signerName, signerTitle, data.employer.legalBusinessName);
}
