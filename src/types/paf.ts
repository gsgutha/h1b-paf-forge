export interface Employer {
  legalBusinessName: string;
  tradeName?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  telephone: string;
  fein: string;
  naicsCode: string;
  signingAuthorityName?: string;
  signingAuthorityTitle?: string;
  employeeName?: string;
}

export interface EmployerContact {
  lastName: string;
  firstName: string;
  middleName?: string;
  jobTitle: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  telephone: string;
  email: string;
}

export interface JobDetails {
  jobTitle: string;
  socCode: string;
  socTitle: string;
  onetCode?: string;
  onetTitle?: string;
  isFullTime: boolean;
  beginDate: string;
  endDate: string;
  wageRateFrom: number;
  wageRateTo?: number;
  wageUnit: 'Hour' | 'Week' | 'Bi-Weekly' | 'Month' | 'Year';
  workersNeeded: number;
  isRD?: boolean; // R&D classification for ACWIA
}

export interface SecondaryWorksite {
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  county?: string;
}

export interface WorksiteLocation {
  worksiteName?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  county?: string;
  areaCode?: string;
  areaName?: string;
  hasSecondaryWorksite?: boolean;
  secondaryWorksite?: SecondaryWorksite;
}

export interface WageInfo {
  prevailingWage: number;
  prevailingWageUnit: 'Hour' | 'Week' | 'Bi-Weekly' | 'Month' | 'Year';
  wageLevel: 'Level I' | 'Level II' | 'Level III' | 'Level IV';
  wageSource: string;
  wageSourceDate: string;
  actualWage: number;
  actualWageUnit: 'Hour' | 'Week' | 'Bi-Weekly' | 'Month' | 'Year';
}

export interface PAFData {
  visaType: 'H-1B' | 'H-1B1 Chile' | 'H-1B1 Singapore' | 'E-3 Australia';
  caseNumber?: string;
  caseStatus?: 'Certified' | 'Pending' | 'Denied' | 'Withdrawn';
  employer: Employer;
  contact: EmployerContact;
  job: JobDetails;
  worksite: WorksiteLocation;
  wage: WageInfo;
  isH1BDependent: boolean;
  isWillfulViolator: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OccupationCode {
  socCode: string;
  title: string;
  description: string;
}

export interface OnetOccupation {
  onetCode: string;
  onetTitle: string;
  onetDescription: string;
}

export interface GeographyArea {
  areaCode: string;
  areaName: string;
  stateAbbr: string;
  stateName: string;
  countyName: string;
}

export interface CrosswalkEntry {
  oesSocCode: string;
  oesSocTitle: string;
  truncOnetCode: string;
  onetCode: string;
  onetTitle: string;
}

export interface EducationRequirement {
  onetCode: string;
  occupation: string;
  education: string;
  source: string;
}

export interface ACWIACrosswalk {
  onetCode: string;
  onetTitle: string;
  acwiaCode: string;
  acwiaTitle: string;
}
