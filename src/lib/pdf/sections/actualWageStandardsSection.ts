import type { PAFData } from '@/types/paf';
import type { SupportingDocs } from '@/components/wizard/steps/SupportingDocsStep';
import { 
  PDFContext, 
  PDF_CONFIG,
  addPageHeader,
  addCenteredTitle,
  addParagraph,
  addBoldParagraph,
  checkPageBreak,
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

/**
 * Adds the company-wide Actual Wage Standards policy section.
 * This document is the SAME for all LCAs/positions - it describes 
 * the employer's general methodology for determining actual wages.
 */
export async function addActualWageStandardsSection(
  ctx: PDFContext, 
  data: PAFData, 
  _supportingDocs?: SupportingDocs
): Promise<void> {
  const { doc, pageWidth, margin } = ctx;
  
  // Start new page
  doc.addPage();
  addPageHeader(ctx, 'Actual Wage Standards');
  
  ctx.yPos += 10;
  addCenteredTitle(ctx, 'ACTUAL WAGE STANDARDS', 14);
  addCenteredTitle(ctx, 'Company-Wide Wage Determination Policy', 11);
  
  ctx.yPos += 10;
  
  // Company identification
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYER INFORMATION', margin, ctx.yPos);
  ctx.yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  doc.text(`Legal Business Name: ${data.employer.legalBusinessName}`, margin, ctx.yPos);
  ctx.yPos += 6;
  if (data.employer.tradeName) {
    doc.text(`Trade Name (DBA): ${data.employer.tradeName}`, margin, ctx.yPos);
    ctx.yPos += 6;
  }
  doc.text(`FEIN: ${data.employer.fein}`, margin, ctx.yPos);
  ctx.yPos += 6;
  doc.text(`NAICS Code: ${data.employer.naicsCode}`, margin, ctx.yPos);
  ctx.yPos += 12;
  
  // Policy Statement
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('I. POLICY STATEMENT', margin, ctx.yPos);
  ctx.yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const policyStatement = `${data.employer.legalBusinessName} ("the Company") is committed to maintaining a fair and equitable wage system that complies with all applicable federal, state, and local laws, including the requirements set forth in 20 CFR § 655.731 for H-1B nonimmigrant workers. This document establishes the Company's standards and methodology for determining actual wages for all positions.`;
  addParagraph(ctx, policyStatement);
  
  ctx.yPos += 5;
  
  // Regulatory Compliance
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('II. REGULATORY COMPLIANCE', margin, ctx.yPos);
  ctx.yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const complianceText = `The Company maintains actual wage rates that meet or exceed the higher of: (a) the actual wage paid by the employer to other workers with similar experience and qualifications for the specific employment in question, or (b) the prevailing wage level for the occupational classification in the geographic area of intended employment, as required by 20 CFR § 655.731(a).`;
  addParagraph(ctx, complianceText);
  
  ctx.yPos += 5;
  
  // Wage Determination Factors
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('III. WAGE DETERMINATION FACTORS', margin, ctx.yPos);
  ctx.yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  addParagraph(ctx, 'The Company considers the following factors when determining actual wages for all positions:');
  
  ctx.yPos += 5;
  
  const factors = [
    {
      title: 'Experience',
      description: 'The length, depth, and type of relevant work experience, including prior employment in similar positions, supervisory experience, and industry-specific knowledge.'
    },
    {
      title: 'Education',
      description: 'Educational credentials including degree level, field of study, academic achievements, certifications, and reputation of educational institutions attended.'
    },
    {
      title: 'Job Responsibility and Function',
      description: 'The nature and complexity of duties and responsibilities, degree of supervision exercised or received, decision-making authority, and scope of impact on business operations.'
    },
    {
      title: 'Specialized Knowledge and Skills',
      description: 'Possession of unique technical skills, proprietary knowledge, language capabilities, specialized training, and industry certifications relevant to the position.'
    },
    {
      title: 'Performance Indicators',
      description: 'Job references, performance evaluations, professional awards, publications, patents, and other documented achievements demonstrating exceptional ability.'
    },
    {
      title: 'Market Conditions',
      description: 'Current market rates for comparable positions in the geographic area, supply and demand factors for specific skill sets, and competitive compensation benchmarking.'
    }
  ];
  
  factors.forEach((factor, index) => {
    checkPageBreak(ctx, 20);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${factor.title}:`, margin, ctx.yPos);
    doc.setFont('helvetica', 'normal');
    ctx.yPos += 5;
    
    const lines = doc.splitTextToSize(factor.description, pageWidth - margin * 2 - 10);
    doc.text(lines, margin + 5, ctx.yPos);
    ctx.yPos += lines.length * 5 + 5;
  });
  
  ctx.yPos += 5;
  checkPageBreak(ctx, 60);
  
  // Wage Structure
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('IV. WAGE STRUCTURE', margin, ctx.yPos);
  ctx.yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const wageStructure = `The Company maintains a documented wage system that ensures internal pay equity across similar positions. Wage differentials between employees in comparable roles are based on objective, non-discriminatory factors as outlined in Section III above. The Company regularly reviews and updates its wage scales to ensure compliance with prevailing wage requirements and market conditions.`;
  addParagraph(ctx, wageStructure);
  
  ctx.yPos += 5;
  
  // Non-Discrimination
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('V. NON-DISCRIMINATION', margin, ctx.yPos);
  ctx.yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const nonDiscrimination = `The Company's wage determination practices do not discriminate based on race, color, religion, sex, national origin, age, disability, genetic information, or any other protected characteristic. Wage decisions are made solely on the basis of job-related qualifications and the factors set forth in this policy.`;
  addParagraph(ctx, nonDiscrimination);
  
  ctx.yPos += 5;
  
  // Documentation
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('VI. DOCUMENTATION', margin, ctx.yPos);
  ctx.yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const documentation = `For each LCA filed, the Company prepares an individual Actual Wage Determination that documents how these standards were applied to determine the specific wage for that position. These determinations are maintained in the Public Access File and available for inspection as required by DOL regulations.`;
  addParagraph(ctx, documentation);
  
  ctx.yPos += 5;
  checkPageBreak(ctx, 50);
  
  // Certification
  doc.setFillColor(...PDF_CONFIG.colors.lightGray);
  doc.rect(margin, ctx.yPos, pageWidth - margin * 2, 25, 'F');
  ctx.yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const certText = 'CERTIFICATION: This Actual Wage Standards policy has been adopted by the Company and applies to all wage determinations for positions covered by Labor Condition Applications.';
  const certLines = doc.splitTextToSize(certText, pageWidth - margin * 2 - 10);
  doc.text(certLines, margin + 5, ctx.yPos);
  ctx.yPos += certLines.length * 5 + 15;
  
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
}
