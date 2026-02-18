import type { PAFData } from '@/types/paf';
import type { SupportingDocs } from '@/components/wizard/steps/SupportingDocsStep';
import { format } from 'date-fns';
import { 
  PDFContext, 
  PDF_CONFIG,
  addPageHeader,
  addCenteredTitle,
  addSectionHeader,
  addSubsectionHeader,
  addParagraph,
  addBoldParagraph,
  checkPageBreak,
  formatDate,
  parseLocalDate,
} from '../pdfHelpers';
import { addDigitalSignature, SignatoryWithImage } from '../signatureRenderer';
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

export async function addRecruitmentSummarySection(
  ctx: PDFContext, 
  data: PAFData,
  supportingDocs?: SupportingDocs
): Promise<void> {
  // Only add this section if employer is H-1B dependent AND non-exempt
  if (!data.isH1BDependent) return;
  const exemptionType = supportingDocs?.exemptionType || 'wage';
  if (exemptionType !== 'none') return; // Exempt workers don't need recruitment summary

  const { doc, pageWidth, margin } = ctx;
  
  // Start new page
  doc.addPage();
  addPageHeader(ctx, 'Recruitment Summary for H-1B Dependent Employer');
  
  ctx.yPos += 10;
  addCenteredTitle(ctx, 'SUMMARY OF RECRUITMENT METHODS', 14);
  
  ctx.yPos += 10;
  
  // Introduction
  const introPara = `This recruitment summary is prepared by ${data.employer.legalBusinessName} ("Employer") pursuant to 20 CFR § 655.739 as an H-1B dependent employer filing a Labor Condition Application for the position of ${data.job.jobTitle}.`;
  addParagraph(ctx, introPara);
  
  ctx.yPos += 5;
  
  // Section 1: Position Information
  addSectionHeader(ctx, '1. Position Information');
  
  const positionDetails = [
    ['Job Title:', data.job.jobTitle],
    ['SOC Code:', `${data.job.socCode} - ${data.job.socTitle}`],
    ['Number of Positions:', String(data.job.workersNeeded)],
    ['Employment Period:', `${formatDate(data.job.beginDate)} to ${formatDate(data.job.endDate)}`],
  ];
  
  doc.setFontSize(10);
  positionDetails.forEach(([label, value]) => {
    checkPageBreak(ctx, 8);
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, ctx.yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 55, ctx.yPos);
    ctx.yPos += 7;
  });
  
  ctx.yPos += 10;
  
  // Section 2: Recruitment Timeframe
  addSectionHeader(ctx, '2. Recruitment Timeframe');

  const beginDate = parseLocalDate(data.job.beginDate);
  let recruitmentStartStr: string;
  let recruitmentEndStr: string;

  if (supportingDocs?.recruitmentStartDate) {
    recruitmentStartStr = format(parseLocalDate(supportingDocs.recruitmentStartDate), 'MMMM d, yyyy');
  } else {
    const fallbackStart = new Date(beginDate);
    fallbackStart.setDate(fallbackStart.getDate() - 60);
    recruitmentStartStr = format(fallbackStart, 'MMMM d, yyyy');
  }

  if (supportingDocs?.recruitmentEndDate) {
    recruitmentEndStr = format(parseLocalDate(supportingDocs.recruitmentEndDate), 'MMMM d, yyyy');
  } else {
    recruitmentEndStr = 'Present';
  }

  addParagraph(ctx, `Recruitment efforts for this position were conducted from ${recruitmentStartStr} through ${recruitmentEndStr}, in accordance with 20 CFR § 655.739.`);

  ctx.yPos += 5;
  
  // Section 3: Recruitment Methods / Platforms
  addSectionHeader(ctx, '3. Recruitment Methods Used');
  
  addParagraph(ctx, 'The employer used the following industry-wide recruitment methods to recruit U.S. workers for this position:');
  
  const platformsRaw = supportingDocs?.recruitmentPlatforms || 'LinkedIn, Indeed, Company Website';
  const platforms = platformsRaw.split(',').map(p => p.trim()).filter(Boolean);

  doc.setFontSize(10);
  platforms.forEach((platform, i) => {
    checkPageBreak(ctx, 8);
    doc.setFont('helvetica', 'bold');
    doc.text(`${i + 1}. ${platform}`, margin + 5, ctx.yPos);
    ctx.yPos += 6;
    doc.setFont('helvetica', 'normal');
  });
  
  ctx.yPos += 5;
  
  // Section 4: Recruitment Results
  addSectionHeader(ctx, '4. Recruitment Results');

  const applicantCount = supportingDocs?.usApplicantsCount;
  if (applicantCount !== undefined && applicantCount !== null) {
    checkPageBreak(ctx, 8);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Number of U.S. Applicants Reviewed:', margin, ctx.yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(String(applicantCount), margin + 90, ctx.yPos);
    ctx.yPos += 8;
  }
  
  addParagraph(ctx, 'The employer certifies that:');
  
  const results = [
    'Good faith steps were taken to recruit U.S. workers for the job opportunity using recruitment methods and procedures that are standard for the occupation.',
    'Compensation offered met or exceeded the prevailing wage and actual wage requirements.',
    'All U.S. workers who applied and were equally or better qualified for the position were given full consideration.',
    'No qualified U.S. worker was rejected for reasons other than lawful, job-related criteria.',
  ];
  
  results.forEach((result, index) => {
    checkPageBreak(ctx, 12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}.`, margin + 5, ctx.yPos);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(result, pageWidth - margin * 2 - 15);
    doc.text(lines, margin + 15, ctx.yPos);
    ctx.yPos += lines.length * 5 + 4;
  });

  // Non-selection reasons
  if (supportingDocs?.nonSelectionReasons && supportingDocs.nonSelectionReasons.trim().length > 0) {
    ctx.yPos += 5;
    addSubsectionHeader(ctx, 'Lawful Job-Related Reasons for Non-Selection of U.S. Applicants');
    const reasonLines = doc.splitTextToSize(supportingDocs.nonSelectionReasons, pageWidth - margin * 2 - 5);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(reasonLines, margin + 5, ctx.yPos);
    ctx.yPos += reasonLines.length * 5 + 5;
  }
  
  ctx.yPos += 10;
  
  // Section 5: Non-Displacement Attestation
  addSectionHeader(ctx, '5. Non-Displacement Attestation');
  
  addParagraph(ctx, 'The employer further attests that:');
  
  const displacementAttestations = [
    'No similarly employed U.S. worker has been or will be displaced within 90 days before or after the filing of an H-1B petition supported by this LCA.',
    'Before placing the H-1B worker at another employer\'s worksite, the employer has made a bona fide inquiry as to whether the other employer has or will displace a similarly employed U.S. worker within 90 days before or after the placement.',
    'Where applicable, written confirmation has been obtained from the secondary employer (client site) that no displacement will occur.',
  ];
  
  displacementAttestations.forEach((attestation, index) => {
    checkPageBreak(ctx, 15);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}.`, margin + 5, ctx.yPos);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(attestation, pageWidth - margin * 2 - 15);
    doc.text(lines, margin + 15, ctx.yPos);
    ctx.yPos += lines.length * 5 + 4;
  });
  
  ctx.yPos += 10;
  
  // Certification
  addBoldParagraph(ctx, 'EMPLOYER CERTIFICATION:', 11);
  
  const certStatement = `I hereby certify that ${data.employer.legalBusinessName} has complied with all recruitment requirements applicable to H-1B dependent employers under 20 CFR § 655.739. The information provided in this summary is true and correct to the best of my knowledge.`;
  addParagraph(ctx, certStatement);
  
  // Digital Signature - fetch from database
  const signatory = await getSignatoryFromDB(data.employer.signatoryId);
  
  if (signatory) {
    await addDigitalSignature(ctx, signatory, data.employer.legalBusinessName, false);
  } else {
    await addDigitalSignature(ctx, {
      id: 'fallback',
      name: 'Authorized Signatory',
      title: 'Authorized Representative',
      signatureImagePath: null
    }, data.employer.legalBusinessName, false);
  }
}
