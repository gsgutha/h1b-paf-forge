import jsPDF from 'jspdf';
import type { PAFData } from '@/types/paf';
import type { SupportingDocs } from '@/components/wizard/steps/SupportingDocsStep';
import { format } from 'date-fns';
import { createPDFContext, addPageNumber } from './pdf/pdfHelpers';
import { addCoverPage } from './pdf/sections/coverPage';
import { addLCASection } from './pdf/sections/lcaSection';
import { addWageMemoSection } from './pdf/sections/wageMemoSection';
import { addPrevailingWageSection } from './pdf/sections/prevailingWageSection';
import { addPostingNoticeSection } from './pdf/sections/postingNoticeSection';
import { addBenefitsSection } from './pdf/sections/benefitsSection';
import { addWorkerReceiptSection } from './pdf/sections/workerReceiptSection';

export interface PAFDocumentOptions {
  includeLCA?: boolean;
  includeWageMemo?: boolean;
  includePrevailingWage?: boolean;
  includePostingNotice?: boolean;
  includeBenefits?: boolean;
  includeWorkerReceipt?: boolean;
}

const defaultOptions: PAFDocumentOptions = {
  includeLCA: true,
  includeWageMemo: true,
  includePrevailingWage: true,
  includePostingNotice: true,
  includeBenefits: true,
  includeWorkerReceipt: true,
};

/**
 * Generates a comprehensive PAF document matching the professional format
 * with cover page, table of contents, and all required sections.
 */
export function generatePAFDocument(
  data: PAFData, 
  supportingDocs?: SupportingDocs,
  options: PAFDocumentOptions = defaultOptions
): jsPDF {
  const ctx = createPDFContext();
  const mergedOptions = { ...defaultOptions, ...options };
  
  // 1. Cover Page with Table of Contents
  addCoverPage(ctx, data, supportingDocs);
  
  // 2. LCA Section (simulated ETA-9035 form)
  if (mergedOptions.includeLCA) {
    addLCASection(ctx, data, supportingDocs);
  }
  
  // 3. Actual Wage Memorandum
  if (mergedOptions.includeWageMemo) {
    addWageMemoSection(ctx, data, supportingDocs);
  }
  
  // 4. Prevailing Wage Rate and Source
  if (mergedOptions.includePrevailingWage) {
    addPrevailingWageSection(ctx, data);
  }
  
  // 5. LCA Posting Notice and Display Details
  if (mergedOptions.includePostingNotice) {
    addPostingNoticeSection(ctx, data, supportingDocs);
  }
  
  // 6. Benefits Summary
  if (mergedOptions.includeBenefits) {
    addBenefitsSection(ctx, data, supportingDocs);
  }
  
  // 7. Worker Receipt Statement
  if (mergedOptions.includeWorkerReceipt) {
    addWorkerReceiptSection(ctx, data);
  }
  
  // Add page numbers
  const totalPages = ctx.doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    ctx.doc.setPage(i);
    addPageNumber(ctx, i, totalPages);
  }
  
  return ctx.doc;
}

/**
 * Downloads the PAF document as a PDF file
 */
export function downloadPAF(
  data: PAFData, 
  supportingDocs?: SupportingDocs,
  filename?: string
): void {
  const doc = generatePAFDocument(data, supportingDocs);
  const defaultFilename = `PAF_${data.employer.legalBusinessName.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(filename || defaultFilename);
}

/**
 * Opens the PAF document in a new window for printing
 */
export function printPAF(data: PAFData, supportingDocs?: SupportingDocs): void {
  const doc = generatePAFDocument(data, supportingDocs);
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(pdfUrl, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

/**
 * Returns the PAF document as a Blob for upload/storage
 */
export function getPAFBlob(data: PAFData, supportingDocs?: SupportingDocs): Blob {
  const doc = generatePAFDocument(data, supportingDocs);
  return doc.output('blob');
}
