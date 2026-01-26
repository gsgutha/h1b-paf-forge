import * as pdfjsLib from 'pdfjs-dist';
import type { PDFContext } from './pdfHelpers';
import { PDF_CONFIG, checkPageBreak, addPageHeader } from './pdfHelpers';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Converts a File to an ArrayBuffer
 */
async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Converts a File to a data URL
 */
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Renders a PDF page to a canvas and returns image data
 */
async function renderPdfPageToImage(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  scale: number = 2
): Promise<string> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create canvas context');
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  await page.render({
    canvasContext: context,
    viewport,
  }).promise;
  
  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Embeds all pages of a PDF file into the PAF document
 */
export async function embedPdfDocument(
  ctx: PDFContext,
  file: File,
  sectionTitle: string
): Promise<void> {
  try {
    const arrayBuffer = await fileToArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      ctx.doc.addPage();
      addPageHeader(ctx, `${sectionTitle} - Page ${pageNum} of ${numPages}`);
      
      const imageData = await renderPdfPageToImage(pdf, pageNum, 2);
      
      // Calculate dimensions to fit the page
      const pageWidth = ctx.pageWidth - ctx.margin * 2;
      const pageHeight = ctx.doc.internal.pageSize.getHeight() - 40;
      
      // Get image dimensions
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageData;
      });
      
      const aspectRatio = img.width / img.height;
      let imgWidth = pageWidth;
      let imgHeight = imgWidth / aspectRatio;
      
      if (imgHeight > pageHeight) {
        imgHeight = pageHeight;
        imgWidth = imgHeight * aspectRatio;
      }
      
      const xOffset = (ctx.pageWidth - imgWidth) / 2;
      ctx.doc.addImage(imageData, 'JPEG', xOffset, ctx.yPos, imgWidth, imgHeight);
    }
  } catch (error) {
    console.error('Error embedding PDF:', error);
    // Add error notice if PDF couldn't be embedded
    ctx.doc.addPage();
    addPageHeader(ctx, sectionTitle);
    ctx.yPos += 20;
    ctx.doc.setFontSize(12);
    ctx.doc.setFont('helvetica', 'italic');
    ctx.doc.setTextColor(...PDF_CONFIG.colors.error);
    ctx.doc.text('Unable to embed PDF document. Please attach separately.', ctx.margin, ctx.yPos);
    ctx.doc.setTextColor(...PDF_CONFIG.colors.black);
  }
}

/**
 * Embeds an image file into the PAF document
 */
export async function embedImageDocument(
  ctx: PDFContext,
  file: File,
  sectionTitle: string
): Promise<void> {
  try {
    const dataUrl = await fileToDataUrl(file);
    
    ctx.doc.addPage();
    addPageHeader(ctx, sectionTitle);
    ctx.yPos += 5;
    
    // Get image dimensions
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = dataUrl;
    });
    
    const pageWidth = ctx.pageWidth - ctx.margin * 2;
    const pageHeight = ctx.doc.internal.pageSize.getHeight() - 50;
    
    const aspectRatio = img.width / img.height;
    let imgWidth = pageWidth;
    let imgHeight = imgWidth / aspectRatio;
    
    if (imgHeight > pageHeight) {
      imgHeight = pageHeight;
      imgWidth = imgHeight * aspectRatio;
    }
    
    const xOffset = (ctx.pageWidth - imgWidth) / 2;
    const format = file.type.includes('png') ? 'PNG' : 'JPEG';
    ctx.doc.addImage(dataUrl, format, xOffset, ctx.yPos, imgWidth, imgHeight);
  } catch (error) {
    console.error('Error embedding image:', error);
    ctx.doc.addPage();
    addPageHeader(ctx, sectionTitle);
    ctx.yPos += 20;
    ctx.doc.setFontSize(12);
    ctx.doc.setFont('helvetica', 'italic');
    ctx.doc.setTextColor(...PDF_CONFIG.colors.error);
    ctx.doc.text('Unable to embed image. Please attach separately.', ctx.margin, ctx.yPos);
    ctx.doc.setTextColor(...PDF_CONFIG.colors.black);
  }
}

/**
 * Embeds a file (PDF or image) based on its type
 */
export async function embedFile(
  ctx: PDFContext,
  file: File,
  sectionTitle: string
): Promise<void> {
  if (file.type === 'application/pdf') {
    await embedPdfDocument(ctx, file, sectionTitle);
  } else if (file.type.startsWith('image/')) {
    await embedImageDocument(ctx, file, sectionTitle);
  } else {
    // For other file types, add a reference page
    ctx.doc.addPage();
    addPageHeader(ctx, sectionTitle);
    ctx.yPos += 20;
    ctx.doc.setFontSize(12);
    ctx.doc.text(`Attached document: ${file.name}`, ctx.margin, ctx.yPos);
    ctx.yPos += 10;
    ctx.doc.setFontSize(10);
    ctx.doc.setFont('helvetica', 'italic');
    ctx.doc.text('(Document type cannot be embedded - please attach separately)', ctx.margin, ctx.yPos);
  }
}
