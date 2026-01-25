import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PAFData } from '@/types/paf';
import { format } from 'date-fns';

export function generatePAFDocument(data: PAFData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Helper functions
  const addTitle = (text: string) => {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(text, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
  };

  const addSectionHeader = (text: string) => {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(15, 41, 66); // Navy color
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(text, margin + 3, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;
  };

  const addRow = (label: string, value: string | number | boolean | undefined) => {
    if (value === undefined || value === '') return;
    let displayValue = String(value);
    if (typeof value === 'boolean') {
      displayValue = value ? 'Yes' : 'No';
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(displayValue, margin + 60, yPos);
    yPos += 6;
  };

  const formatCurrency = (amount: number, unit: string) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
    return `${formatted} / ${unit}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Document Header
  addTitle('PUBLIC ACCESS FILE');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Labor Condition Application (LCA)', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;
  doc.text(`Visa Classification: ${data.visaType}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Generation Info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, margin, yPos);
  yPos += 10;

  // Section 1: Employer Information
  checkPageBreak(50);
  addSectionHeader('SECTION 1: EMPLOYER INFORMATION');
  yPos += 3;
  
  addRow('Legal Business Name', data.employer.legalBusinessName);
  if (data.employer.tradeName) {
    addRow('Trade Name / DBA', data.employer.tradeName);
  }
  addRow('Address', `${data.employer.address1}${data.employer.address2 ? ', ' + data.employer.address2 : ''}`);
  addRow('City, State, ZIP', `${data.employer.city}, ${data.employer.state} ${data.employer.postalCode}`);
  addRow('Country', data.employer.country);
  addRow('Telephone', data.employer.telephone);
  addRow('FEIN', data.employer.fein);
  addRow('NAICS Code', data.employer.naicsCode);
  yPos += 8;

  // Section 2: Job Details
  checkPageBreak(60);
  addSectionHeader('SECTION 2: JOB DETAILS');
  yPos += 3;
  
  addRow('Job Title', data.job.jobTitle);
  addRow('SOC Code', `${data.job.socCode} - ${data.job.socTitle}`);
  if (data.job.onetCode) {
    addRow('O*NET Code', `${data.job.onetCode} - ${data.job.onetTitle}`);
  }
  addRow('Full-Time Position', data.job.isFullTime);
  addRow('Number of Workers', data.job.workersNeeded);
  addRow('Employment Begin Date', formatDate(data.job.beginDate));
  addRow('Employment End Date', formatDate(data.job.endDate));
  
  const wageDisplay = data.job.wageRateTo 
    ? `${formatCurrency(data.job.wageRateFrom, data.job.wageUnit)} - ${formatCurrency(data.job.wageRateTo, data.job.wageUnit)}`
    : formatCurrency(data.job.wageRateFrom, data.job.wageUnit);
  addRow('Offered Wage Rate', wageDisplay);
  yPos += 8;

  // Section 3: Worksite Location
  checkPageBreak(40);
  addSectionHeader('SECTION 3: WORKSITE LOCATION');
  yPos += 3;
  
  addRow('Address', `${data.worksite.address1}${data.worksite.address2 ? ', ' + data.worksite.address2 : ''}`);
  addRow('City, State, ZIP', `${data.worksite.city}, ${data.worksite.state} ${data.worksite.postalCode}`);
  if (data.worksite.county) {
    addRow('County', data.worksite.county);
  }
  if (data.worksite.areaName) {
    addRow('Wage Area', data.worksite.areaName);
  }
  if (data.worksite.areaCode) {
    addRow('Area Code', data.worksite.areaCode);
  }
  yPos += 8;

  // Section 4: Wage Information
  checkPageBreak(50);
  addSectionHeader('SECTION 4: WAGE INFORMATION');
  yPos += 3;
  
  addRow('Prevailing Wage', formatCurrency(data.wage.prevailingWage, data.wage.prevailingWageUnit));
  addRow('Wage Level', data.wage.wageLevel);
  addRow('Wage Source', data.wage.wageSource);
  addRow('Source Date', formatDate(data.wage.wageSourceDate));
  addRow('Actual Wage', formatCurrency(data.wage.actualWage, data.wage.actualWageUnit));
  yPos += 5;

  // Wage Compliance Status
  const isCompliant = data.wage.actualWage >= data.wage.prevailingWage;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  if (isCompliant) {
    doc.setTextColor(22, 163, 74); // Green
    doc.text('✓ WAGE COMPLIANCE: The offered wage meets or exceeds the prevailing wage.', margin, yPos);
  } else {
    doc.setTextColor(220, 38, 38); // Red
    doc.text('✗ WAGE COMPLIANCE ISSUE: The offered wage is below the prevailing wage.', margin, yPos);
  }
  doc.setTextColor(0, 0, 0);
  yPos += 15;

  // Section 5: H-1B Dependency Status
  checkPageBreak(30);
  addSectionHeader('SECTION 5: H-1B DEPENDENCY STATUS');
  yPos += 3;
  
  addRow('H-1B Dependent Employer', data.isH1BDependent);
  addRow('Willful Violator', data.isWillfulViolator);
  yPos += 10;

  // Footer
  checkPageBreak(30);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  const footerText = [
    'This document is part of the Public Access File maintained by the employer as required by',
    '20 CFR 655.760. This file must be made available for public inspection within one working day',
    'after the date on which an LCA is filed with the Department of Labor.',
  ];
  footerText.forEach((line) => {
    doc.text(line, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
  });

  return doc;
}

export function downloadPAF(data: PAFData, filename?: string) {
  const doc = generatePAFDocument(data);
  const defaultFilename = `PAF_${data.employer.legalBusinessName.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(filename || defaultFilename);
}

export function printPAF(data: PAFData) {
  const doc = generatePAFDocument(data);
  // Open PDF in new window for printing
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(pdfUrl, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
