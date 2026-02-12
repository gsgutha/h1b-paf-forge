import type { PAFData } from '@/types/paf';
import type { SupportingDocs } from '@/components/wizard/steps/SupportingDocsStep';
import { format, addDays } from 'date-fns';
import { 
  PDFContext, 
  PDF_CONFIG,
  addPageHeader,
  addCenteredTitle,
  addSectionHeader,
  addSubsectionHeader,
  addLabelValue,
  addParagraph,
  checkPageBreak,
  formatDate,
  formatCurrency,
  parseLocalDate,
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

export async function addPostingNoticeSection(
  ctx: PDFContext, 
  data: PAFData, 
  supportingDocs?: SupportingDocs
): Promise<void> {
  const { doc, pageWidth, margin } = ctx;
  
  // Start new page - LCA Display Details
  doc.addPage();
  addPageHeader(ctx, 'LCA Posting Documentation');
  
  ctx.yPos += 10;
  addCenteredTitle(ctx, 'LCA DISPLAY DETAILS', 14);
  
  ctx.yPos += 10;
  
  // Case number
  if (supportingDocs?.lcaCaseNumber) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`ETA Case Number: ${supportingDocs.lcaCaseNumber}`, margin, ctx.yPos);
    ctx.yPos += 10;
  }
  
  // Posting dates - use manual dates if provided, otherwise fall back to defaults
  const postingStartDate = supportingDocs?.noticePostingStartDate 
    ? parseLocalDate(supportingDocs.noticePostingStartDate)
    : new Date();
  const postingEndDate = supportingDocs?.noticePostingEndDate
    ? parseLocalDate(supportingDocs.noticePostingEndDate)
    : addDays(postingStartDate, 14); // Default: 10 business days ≈ 14 calendar days
  
  const certText = `This is to certify that Labor Condition Application for the position of ${data.job.jobTitle} was posted for 10 business days from ${format(postingStartDate, 'MM/dd/yyyy')} to ${format(postingEndDate, 'MM/dd/yyyy')} in the below mentioned place of employment.`;
  addParagraph(ctx, certText);
  
  ctx.yPos += 5;
  
  // Location section
  addSubsectionHeader(ctx, 'Worksite Location(s)');
  const worksiteNameText = data.worksite.worksiteName ? `${data.worksite.worksiteName}: ` : '';
  const clientLocation = `${worksiteNameText}${data.worksite.address1}${data.worksite.address2 ? ', ' + data.worksite.address2 : ''}, ${data.worksite.city}, ${data.worksite.state} ${data.worksite.postalCode}`;
  addLabelValue(ctx, 'Primary Worksite', clientLocation, 50);
  
  // Secondary worksite if present
  if (data.worksite.hasSecondaryWorksite && data.worksite.secondaryWorksite) {
    const secondary = data.worksite.secondaryWorksite;
    const secondaryNameText = secondary.worksiteName ? `${secondary.worksiteName}: ` : '';
    const secondaryLocation = `${secondaryNameText}${secondary.address1}${secondary.address2 ? ', ' + secondary.address2 : ''}, ${secondary.city}, ${secondary.state} ${secondary.postalCode}`;
    addLabelValue(ctx, 'Secondary Worksite', secondaryLocation, 50);
    
    if (secondary.county) {
      addLabelValue(ctx, 'Secondary County', secondary.county, 50);
    }
  }
  
  ctx.yPos += 5;
  
  // Display Areas - Two conspicuous locations per worksite as per DOL requirements
  const hasSecondary = data.worksite.hasSecondaryWorksite && data.worksite.secondaryWorksite;
  addSubsectionHeader(ctx, hasSecondary ? 'Display Areas (Primary Worksite)' : 'Display Areas (Two Conspicuous Locations)');
  const location1 = supportingDocs?.noticePostingLocation || `${data.employer.legalBusinessName} - Location 1`;
  const location2 = supportingDocs?.noticePostingLocation2 || `${data.employer.legalBusinessName} - Location 2`;
  addLabelValue(ctx, 'Display Area 1', location1, 45);
  addLabelValue(ctx, 'Display Area 2', location2, 45);
  
  if (hasSecondary) {
    ctx.yPos += 5;
    addSubsectionHeader(ctx, 'Display Areas (Secondary Worksite)');
    const location3 = supportingDocs?.noticePostingLocation3 || `${data.employer.legalBusinessName} - Secondary Location 1`;
    const location4 = supportingDocs?.noticePostingLocation4 || `${data.employer.legalBusinessName} - Secondary Location 2`;
    addLabelValue(ctx, 'Display Area 3', location3, 45);
    addLabelValue(ctx, 'Display Area 4', location4, 45);
  }
  
  ctx.yPos += 10;
  
  // Complaints section
  addSubsectionHeader(ctx, 'Complaints');
  const complaintsText = 'Complaints alleging misrepresentations of material facts in the labor condition application and/or failure to comply with terms of the labor condition application may be filed using the WH-4 Form with any office of the Wage and Hour Division, Employment Standards Administration, U.S. Department of Labor.';
  addParagraph(ctx, complaintsText);
  
  const complaintsText2 = 'Complaints alleging failure to offer employment to an equally or better qualified U.S. worker or an employer\'s misrepresentation regarding such offers of employment may be filed with the Office of Special Counsel for Immigration Related Unfair Employment Practices, Civil Rights Division, Department of Justice.';
  addParagraph(ctx, complaintsText2);
  
  // Digital Signature
  ctx.yPos += 10;
  
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
  
  // ----- Page 2: LCA Posting Notice (Primary Worksite) -----
  const primaryLocation = `${worksiteNameText}${data.worksite.address1}${data.worksite.address2 ? ', ' + data.worksite.address2 : ''}, ${data.worksite.city}, ${data.worksite.state} ${data.worksite.postalCode}`;
  addPostingNoticePage(ctx, data, primaryLocation, hasSecondary ? 'Primary Worksite' : undefined);
  
  // ----- Page 3: LCA Posting Notice (Secondary Worksite) - only if secondary exists -----
  if (hasSecondary) {
    const secondary = data.worksite.secondaryWorksite!;
    const secondaryNameText = secondary.worksiteName ? `${secondary.worksiteName}: ` : '';
    const secondaryFullLocation = `${secondaryNameText}${secondary.address1}${secondary.address2 ? ', ' + secondary.address2 : ''}, ${secondary.city}, ${secondary.state} ${secondary.postalCode}`;
    addPostingNoticePage(ctx, data, secondaryFullLocation, 'Secondary Worksite');
  }
}

function addPostingNoticePage(
  ctx: PDFContext, 
  data: PAFData, 
  worksiteLocation: string,
  worksiteLabel?: string
): void {
  const { doc, pageWidth, margin } = ctx;
  
  doc.addPage();
  addPageHeader(ctx, worksiteLabel ? `LCA Posting Notice - ${worksiteLabel}` : 'LCA Posting Notice');
  
  ctx.yPos += 10;
  addCenteredTitle(ctx, 'LCA POSTING NOTICE', 14);
  
  ctx.yPos += 10;
  addSubsectionHeader(ctx, 'Notice to All Employees:');
  
  const noticeIntro = 'Notice is hereby given to all employees that a Labor Condition Application (ETA Form 9035 & 9035E) will be filed with the United States Department of Labor, Office of Foreign Labor Certification for a H-1B non-immigrant worker with the following details:';
  addParagraph(ctx, noticeIntro);
  
  ctx.yPos += 5;
  
  // Notice details table
  const noticeDetails = [
    ['Number of H-1B non-immigrant workers included in LCA:', String(data.job.workersNeeded)],
    ['Job Position:', data.job.jobTitle],
    ['Wages Offered:', formatCurrency(data.job.wageRateFrom, data.job.wageUnit)],
    ['Period of Employment:', `${formatDate(data.job.beginDate)} to ${formatDate(data.job.endDate)} (As per LCA)`],
    ['Location where H-1B non-immigrant worker will work:', worksiteLocation],
  ];
  
  doc.setFontSize(10);
  noticeDetails.forEach(([label, value]) => {
    checkPageBreak(ctx, 15);
    doc.setFont('helvetica', 'bold');
    const labelLines = doc.splitTextToSize(label, 80);
    doc.text(labelLines, margin, ctx.yPos);
    
    doc.setFont('helvetica', 'normal');
    const valueLines = doc.splitTextToSize(value, pageWidth - margin - 95);
    doc.text(valueLines, margin + 85, ctx.yPos);
    
    ctx.yPos += Math.max(labelLines.length, valueLines.length) * 5 + 5;
  });
  
  ctx.yPos += 5;
  
  const complaintsFooter = 'Complaints alleging misrepresentation of material facts in the Labor Condition Application and/or failure to comply with the terms of the Labor Condition Application may be filed with any office of the Wage & Hour Division of the United States Department of Labor.';
  addParagraph(ctx, complaintsFooter);
  
  addParagraph(ctx, 'The verification of Labor Condition Application (ETA Form 9035 & 9035E) will be available for all to review.');
}
