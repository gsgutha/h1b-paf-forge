import type { Employer, PAFData, SecondaryWorksite, WorksiteLocation } from '@/types/paf';

function cleanWhitespace(value?: string | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function canonicalizeForComparison(value?: string | null): string {
  return cleanWhitespace(value)
    .toLowerCase()
    .replace(/\bste\b/g, 'suite')
    .replace(/\bsuite\b/g, 'suite')
    .replace(/\bpl\b/g, 'place')
    .replace(/\btx\b/g, 'texas')
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeSbsZipCode(
  postalCode: string,
  address1?: string,
  city?: string,
  state?: string,
  legalBusinessName?: string,
  tradeName?: string,
): string {
  const cleanPostalCode = cleanWhitespace(postalCode);
  const normalizedAddress = canonicalizeForComparison(address1);
  const normalizedCity = canonicalizeForComparison(city);
  const normalizedState = canonicalizeForComparison(state);
  const normalizedCompany = canonicalizeForComparison(`${legalBusinessName ?? ''} ${tradeName ?? ''}`);

  const isSbsHoustonAddress =
    cleanPostalCode === '77085' &&
    normalizedCity === 'houston' &&
    normalizedState === 'texas' &&
    normalizedAddress.includes('16001parktenplace') &&
    (normalizedCompany.includes('saibusinesssolutionsllc') || normalizedCompany.includes('sbscorp'));

  return isSbsHoustonAddress ? '77084' : cleanPostalCode;
}

export function dedupeAddress2(address1: string, address2?: string): string {
  const cleanAddress2 = cleanWhitespace(address2);
  if (!cleanAddress2) return '';

  const normalizedAddress1 = canonicalizeForComparison(address1);
  const normalizedAddress2 = canonicalizeForComparison(cleanAddress2);

  if (!normalizedAddress2) return '';
  if (normalizedAddress1.includes(normalizedAddress2)) return '';

  return `, ${cleanAddress2}`;
}

export function formatAddressLine(address1: string, address2?: string): string {
  const cleanAddress1 = cleanWhitespace(address1);
  return `${cleanAddress1}${dedupeAddress2(cleanAddress1, address2)}`;
}

function sanitizeEmployer(employer: Employer): Employer {
  return {
    ...employer,
    address1: cleanWhitespace(employer.address1),
    address2: dedupeAddress2(employer.address1, employer.address2)
      ? cleanWhitespace(employer.address2)
      : undefined,
    postalCode: normalizeSbsZipCode(
      employer.postalCode,
      employer.address1,
      employer.city,
      employer.state,
      employer.legalBusinessName,
      employer.tradeName,
    ),
  };
}

function sanitizeSecondaryWorksite(
  worksite: SecondaryWorksite | undefined,
  employer: Employer,
): SecondaryWorksite | undefined {
  if (!worksite) return undefined;

  return {
    ...worksite,
    address1: cleanWhitespace(worksite.address1),
    address2: dedupeAddress2(worksite.address1, worksite.address2)
      ? cleanWhitespace(worksite.address2)
      : undefined,
    postalCode: normalizeSbsZipCode(
      worksite.postalCode,
      worksite.address1,
      worksite.city,
      worksite.state,
      employer.legalBusinessName,
      employer.tradeName,
    ),
  };
}

function sanitizeWorksite(worksite: WorksiteLocation, employer: Employer): WorksiteLocation {
  return {
    ...worksite,
    address1: cleanWhitespace(worksite.address1),
    address2: dedupeAddress2(worksite.address1, worksite.address2)
      ? cleanWhitespace(worksite.address2)
      : undefined,
    postalCode: normalizeSbsZipCode(
      worksite.postalCode,
      worksite.address1,
      worksite.city,
      worksite.state,
      employer.legalBusinessName,
      employer.tradeName,
    ),
    secondaryWorksite: sanitizeSecondaryWorksite(worksite.secondaryWorksite, employer),
  };
}

export function sanitizePAFData(data: PAFData): PAFData {
  const employer = sanitizeEmployer(data.employer);
  const worksite = sanitizeWorksite(data.worksite, employer);

  return {
    ...data,
    employer,
    contact: {
      ...data.contact,
      postalCode: normalizeSbsZipCode(
        data.contact.postalCode,
        data.contact.address1,
        data.contact.city,
        data.contact.state,
        employer.legalBusinessName,
        employer.tradeName,
      ),
    },
    worksite,
  };
}

export function normalizeKnownPostalCode(
  postalCode: string,
  options: {
    address1?: string;
    city?: string;
    state?: string;
    legalBusinessName?: string;
    tradeName?: string;
  },
): string {
  return normalizeSbsZipCode(
    postalCode,
    options.address1,
    options.city,
    options.state,
    options.legalBusinessName,
    options.tradeName,
  );
}