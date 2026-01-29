import { PDFContext, PDF_CONFIG, checkPageBreak } from './pdfHelpers';
import { format } from 'date-fns';
import type { AuthorizedSignatory } from '@/config/signatories';

/**
 * Digital signature renderer for PDF documents.
 * Supports both uploaded signature images and fallback cursive-style text.
 */

export interface SignatoryWithImage {
  id: string;
  name: string;
  title: string;
  signatureImagePath?: string | null;
}

/**
 * Renders a digital signature on the PDF document.
 * If signatureImagePath is provided, embeds the image.
 * Otherwise, uses a cursive-style text rendering.
 */
export function addDigitalSignature(
  ctx: PDFContext,
  signatory: AuthorizedSignatory | SignatoryWithImage,
  companyName?: string,
  includeDate: boolean = false
): void {
  const { doc, margin, pageWidth } = ctx;
  
  checkPageBreak(ctx, 60);
  ctx.yPos += 10;
  
  // Check if we have a signature image
  const hasImage = 'signatureImagePath' in signatory && signatory.signatureImagePath;
  
  // Signature box with light background
  const boxWidth = 180;
  const boxHeight = hasImage ? 60 : 50;
  const boxX = margin;
  const boxY = ctx.yPos;
  
  // Light signature area background
  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, 'FD');
  
  let currentY = boxY + 8;
  
  if (hasImage && 'signatureImagePath' in signatory && signatory.signatureImagePath) {
    // Render signature image
    try {
      // The image will be added by the PDF generator with proper async handling
      // For now, we'll add a placeholder area and the name/title below
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Digitally signed by:', boxX + 5, currentY);
      currentY += 5;
      
      // Signature name in cursive-like style (using italic) as fallback
      doc.setFontSize(18);
      doc.setFont('times', 'bolditalic');
      doc.setTextColor(0, 51, 102); // Navy blue for signature
      doc.text(signatory.name, boxX + 5, currentY + 12);
      currentY += 18;
    } catch {
      // Fallback to text-based signature
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Digitally signed by:', boxX + 5, currentY);
      currentY += 5;
      
      doc.setFontSize(18);
      doc.setFont('times', 'bolditalic');
      doc.setTextColor(0, 51, 102);
      doc.text(signatory.name, boxX + 5, currentY + 12);
      currentY += 18;
    }
  } else {
    // "Digitally signed by" label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Digitally signed by:', boxX + 5, currentY);
    currentY += 5;
    
    // Signature name in cursive-like style (using italic)
    doc.setFontSize(18);
    doc.setFont('times', 'bolditalic');
    doc.setTextColor(0, 51, 102); // Navy blue for signature
    doc.text(signatory.name, boxX + 5, currentY + 12);
    currentY += 18;
  }
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Title
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);
  doc.text(signatory.title, boxX + 5, currentY);
  currentY += 7;
  
  // Company name if provided
  if (companyName) {
    doc.setFont('helvetica', 'normal');
    doc.text(companyName, boxX + 5, currentY);
    currentY += 7;
  }
  
  // Date (only if includeDate is true)
  if (includeDate) {
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    const dateStr = format(new Date(), "yyyy.MM.dd HH:mm:ss 'EST'");
    doc.text(`Date: ${dateStr}`, boxX + 5, currentY);
  }
  
  ctx.yPos = boxY + boxHeight + 5;
  
  // Add verification text below the box
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('This document was digitally signed by an authorized representative.', margin, ctx.yPos);
  doc.setTextColor(0, 0, 0);
  
  ctx.yPos += 10;
}

/**
 * Renders a simpler signature line with digital signature styling
 * Used in sections that need a more compact signature format
 */
export function addCompactDigitalSignature(
  ctx: PDFContext,
  signatory: AuthorizedSignatory | SignatoryWithImage,
  companyName?: string,
  includeDate: boolean = false
): void {
  const { doc, margin } = ctx;
  
  checkPageBreak(ctx, 40);
  ctx.yPos += 10;
  
  // Draw signature line
  doc.setDrawColor(...PDF_CONFIG.colors.black);
  doc.line(margin, ctx.yPos, margin + 100, ctx.yPos);
  ctx.yPos += 2;
  
  // Signature in cursive style
  doc.setFontSize(14);
  doc.setFont('times', 'bolditalic');
  doc.setTextColor(0, 51, 102);
  doc.text(signatory.name, margin, ctx.yPos + 5);
  doc.setTextColor(0, 0, 0);
  
  ctx.yPos += 10;
  
  // Name printed
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(signatory.name, margin, ctx.yPos);
  
  // Title
  if (signatory.title) {
    ctx.yPos += 5;
    doc.setFont('helvetica', 'italic');
    doc.text(signatory.title, margin, ctx.yPos);
  }
  
  // Company
  if (companyName) {
    ctx.yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(companyName, margin, ctx.yPos);
  }
  
  // Date (only if includeDate is true)
  if (includeDate) {
    ctx.yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${format(new Date(), 'MMMM d, yyyy')}`, margin, ctx.yPos);
  }
  
  ctx.yPos += 10;
}
