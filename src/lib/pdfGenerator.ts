import jsPDF from 'jspdf';
import type { PAFData } from '@/types/paf';
import type { SupportingDocs } from '@/components/wizard/steps/SupportingDocsStep';
import { format } from 'date-fns';
import { createPDFContext, addPageNumber } from './pdf/pdfHelpers';
import { addCoverPage } from './pdf/sections/coverPage';
import { addLCASection } from './pdf/sections/lcaSection';
import { addActualWageStandardsSection } from './pdf/sections/actualWageStandardsSection';
import { addWageMemoSection } from './pdf/sections/wageMemoSection';
import { addPrevailingWageSection } from './pdf/sections/prevailingWageSection';
import { addPostingNoticeSection } from './pdf/sections/postingNoticeSection';
import { addBenefitsSection } from './pdf/sections/benefitsSection';
import { addWorkerReceiptSection } from './pdf/sections/workerReceiptSection';
import { addH1BDependencySection } from './pdf/sections/h1bDependencySection';
import { addRecruitmentSummarySection } from './pdf/sections/recruitmentSummarySection';

export interface PAFDocumentOptions {
  includeLCA?: boolean;
  includeActualWageStandards?: boolean;
  includeWageMemo?: boolean;
  includePrevailingWage?: boolean;
  includePostingNotice?: boolean;
  includeBenefits?: boolean;
  includeWorkerReceipt?: boolean;
  includeH1BDependency?: boolean;
  includeRecruitmentSummary?: boolean;
}

const defaultOptions: PAFDocumentOptions = {
  includeLCA: true,
  includeActualWageStandards: true,
  includeWageMemo: true,
  includePrevailingWage: true,
  includePostingNotice: true,
  includeBenefits: true,
  includeWorkerReceipt: true,
  includeH1BDependency: true,
  includeRecruitmentSummary: true,
};

/**
 * Generates a comprehensive PAF document matching the professional format
 * with cover page, table of contents, and all required sections.
 * Now async to support embedding uploaded PDF files.
 */
export async function generatePAFDocument(
  data: PAFData, 
  supportingDocs?: SupportingDocs,
  options: PAFDocumentOptions = defaultOptions
): Promise<jsPDF> {
  const ctx = createPDFContext();
  const mergedOptions = { ...defaultOptions, ...options };
  
  // 1. Cover Page with Table of Contents
  addCoverPage(ctx, data, supportingDocs);
  
  // 2. LCA Section (simulated ETA-9035 form) + embedded LCA PDF
  if (mergedOptions.includeLCA) {
    await addLCASection(ctx, data, supportingDocs);
  }
  
  // 3. Actual Wage Standards (Company-wide policy - same for all LCAs)
  if (mergedOptions.includeActualWageStandards) {
    await addActualWageStandardsSection(ctx, data, supportingDocs);
  }
  
  // 4. Actual Wage Determination (Position-specific - unique per LCA)
  if (mergedOptions.includeWageMemo) {
    await addWageMemoSection(ctx, data, supportingDocs);
  }
  
  // 5. Prevailing Wage Rate and Source
  if (mergedOptions.includePrevailingWage) {
    addPrevailingWageSection(ctx, data);
  }
  
  // 5. LCA Posting Notice and Display Details
  if (mergedOptions.includePostingNotice) {
    await addPostingNoticeSection(ctx, data, supportingDocs);
  }
  
  // 6. Benefits Summary (with embedded benefits docs if uploaded)
  if (mergedOptions.includeBenefits) {
    await addBenefitsSection(ctx, data, supportingDocs);
  }
  
  // 7. H-1B Dependency and Willful Violator Status
  if (mergedOptions.includeH1BDependency) {
    await addH1BDependencySection(ctx, data, supportingDocs);
  }
  
  // 8. Recruitment Summary (only for H-1B dependent employers)
  if (mergedOptions.includeRecruitmentSummary) {
    await addRecruitmentSummarySection(ctx, data, supportingDocs);
  }
  
  // 9. Worker Receipt Statement
  if (mergedOptions.includeWorkerReceipt) {
    addWorkerReceiptSection(ctx, data, supportingDocs);
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
export async function downloadPAF(
  data: PAFData, 
  supportingDocs?: SupportingDocs,
  filename?: string
): Promise<void> {
  const doc = await generatePAFDocument(data, supportingDocs);
  const defaultFilename = `PAF_${data.employer.legalBusinessName.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(filename || defaultFilename);
}

/**
 * Opens the PAF document in a new window for printing
 */
export async function printPAF(data: PAFData, supportingDocs?: SupportingDocs): Promise<void> {
  const doc = await generatePAFDocument(data, supportingDocs);
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
export async function getPAFBlob(data: PAFData, supportingDocs?: SupportingDocs): Promise<Blob> {
  const doc = await generatePAFDocument(data, supportingDocs);
  return doc.output('blob');
}
