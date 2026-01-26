import type { OccupationCode, OnetOccupation, GeographyArea, CrosswalkEntry, EducationRequirement, ACWIACrosswalk } from '@/types/paf';

// Parse CSV string into array of objects
function parseCSV<T>(csvString: string, mapper: (row: string[]) => T): T[] {
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return [];
  
  const results: T[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length > 0) {
      results.push(mapper(row));
    }
  }
  
  return results;
}

// Parse a single CSV line, handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

let occupationsCache: OccupationCode[] | null = null;
let onetCache: OnetOccupation[] | null = null;
let geographyCache: GeographyArea[] | null = null;
let crosswalkCache: CrosswalkEntry[] | null = null;
let educationCache: EducationRequirement[] | null = null;
let acwiaCache: ACWIACrosswalk[] | null = null;

export async function loadOccupations(): Promise<OccupationCode[]> {
  if (occupationsCache) return occupationsCache;
  
  const response = await fetch('/data/oes_soc_occs.csv');
  const text = await response.text();
  
  occupationsCache = parseCSV(text, (row) => ({
    socCode: row[0]?.replace(/"/g, '') || '',
    title: row[1]?.replace(/"/g, '') || '',
    description: row[2]?.replace(/"/g, '') || '',
  }));
  
  return occupationsCache;
}

export async function loadOnetOccupations(): Promise<OnetOccupation[]> {
  if (onetCache) return onetCache;
  
  const response = await fetch('/data/onet_occs.csv');
  const text = await response.text();
  
  onetCache = parseCSV(text, (row) => ({
    onetCode: row[0] || '',
    onetTitle: row[1] || '',
    onetDescription: row[2] || '',
  }));
  
  return onetCache;
}

export async function loadGeography(): Promise<GeographyArea[]> {
  if (geographyCache) return geographyCache;
  
  const response = await fetch('/data/geography.csv');
  const text = await response.text();
  
  geographyCache = parseCSV(text, (row) => ({
    areaCode: row[0] || '',
    areaName: row[1] || '',
    stateAbbr: row[2] || '',
    stateName: row[3] || '',
    countyName: row[4] || '',
  }));
  
  return geographyCache;
}

export async function loadCrosswalk(): Promise<CrosswalkEntry[]> {
  if (crosswalkCache) return crosswalkCache;
  
  const response = await fetch('/data/xwalk_plus.csv');
  const text = await response.text();
  
  crosswalkCache = parseCSV(text, (row) => ({
    oesSocCode: row[0]?.replace(/"/g, '') || '',
    oesSocTitle: row[1]?.replace(/"/g, '') || '',
    truncOnetCode: row[2]?.replace(/"/g, '') || '',
    onetCode: row[3]?.replace(/"/g, '') || '',
    onetTitle: row[4]?.replace(/"/g, '') || '',
  }));
  
  return crosswalkCache;
}

export async function loadEducationRequirements(): Promise<EducationRequirement[]> {
  if (educationCache) return educationCache;
  
  const response = await fetch('/data/education_requirements.csv');
  const text = await response.text();
  
  educationCache = parseCSV(text, (row) => ({
    onetCode: row[0] || '',
    occupation: row[1] || '',
    education: row[2] || '',
    source: row[3] || '',
  }));
  
  return educationCache;
}

export async function loadACWIACrosswalk(): Promise<ACWIACrosswalk[]> {
  if (acwiaCache) return acwiaCache;
  
  const response = await fetch('/data/acwia_crosswalk.csv');
  const text = await response.text();
  
  acwiaCache = parseCSV(text, (row) => ({
    onetCode: row[0] || '',
    onetTitle: row[1] || '',
    acwiaCode: row[2] || '',
    acwiaTitle: row[3] || '',
  }));
  
  return acwiaCache;
}

export function searchOccupations(occupations: OccupationCode[], query: string): OccupationCode[] {
  const lowerQuery = query.toLowerCase();
  return occupations.filter(occ => 
    occ.socCode.toLowerCase().includes(lowerQuery) ||
    occ.title.toLowerCase().includes(lowerQuery) ||
    occ.description.toLowerCase().includes(lowerQuery)
  ).slice(0, 50);
}

export function searchGeography(geography: GeographyArea[], query: string): GeographyArea[] {
  const lowerQuery = query.toLowerCase();
  return geography.filter(geo =>
    geo.areaName.toLowerCase().includes(lowerQuery) ||
    geo.stateName.toLowerCase().includes(lowerQuery) ||
    geo.countyName.toLowerCase().includes(lowerQuery) ||
    geo.stateAbbr.toLowerCase().includes(lowerQuery)
  ).slice(0, 50);
}

export function getOnetCodesForSoc(crosswalk: CrosswalkEntry[], socCode: string): CrosswalkEntry[] {
  const normalizedCode = socCode.replace(/\./g, '-').split('.')[0];
  return crosswalk.filter(entry => 
    entry.oesSocCode === normalizedCode || 
    entry.truncOnetCode === normalizedCode
  );
}

export function getUniqueStates(geography: GeographyArea[]): string[] {
  const states = new Set(geography.map(g => g.stateName));
  return Array.from(states).sort();
}

export function getAreasForState(geography: GeographyArea[], state: string): GeographyArea[] {
  return geography.filter(g => g.stateName === state || g.stateAbbr === state);
}

export function getEducationForOnet(education: EducationRequirement[], onetCode: string): EducationRequirement | undefined {
  return education.find(e => e.onetCode === onetCode);
}

export function getACWIAForOnet(acwia: ACWIACrosswalk[], onetCode: string): ACWIACrosswalk[] {
  return acwia.filter(a => a.onetCode === onetCode);
}

export function hasRDClassification(acwia: ACWIACrosswalk[], onetCode: string): boolean {
  const entries = getACWIAForOnet(acwia, onetCode);
  return entries.some(e => e.acwiaTitle.includes('R&D'));
}
