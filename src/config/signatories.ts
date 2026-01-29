/**
 * Authorized Signatories Configuration
 * 
 * This module defines the authorized individuals who can sign PAF documents.
 * Each signatory has a name, title, and associated digital signature image.
 */

export interface AuthorizedSignatory {
  id: string;
  name: string;
  title: string;
  // Base64 encoded signature image (PNG with transparent background)
  signatureImage?: string;
}

/**
 * Predefined authorized signatories for Sai Business Solutions LLC
 */
export const AUTHORIZED_SIGNATORIES: AuthorizedSignatory[] = [
  {
    id: 'sreedevi-nair',
    name: 'Sreedevi Nair',
    title: 'CSO',
  },
  {
    id: 'venkat-kalyan',
    name: 'Venkat Kalyan Chivukula',
    title: 'Chief Executive Officer',
  },
];

/**
 * Get signatory by ID
 */
export function getSignatoryById(id: string): AuthorizedSignatory | undefined {
  return AUTHORIZED_SIGNATORIES.find(s => s.id === id);
}

/**
 * Get default signatory
 */
export function getDefaultSignatory(): AuthorizedSignatory {
  return AUTHORIZED_SIGNATORIES[0];
}
