import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LCARecord {
  case_number: string;
  case_status: string;
  received_date: string | null;
  decision_date: string | null;
  visa_class: string;
  employer_name: string;
  employer_dba: string | null;
  employer_address1: string | null;
  employer_address2: string | null;
  employer_city: string | null;
  employer_state: string | null;
  employer_postal_code: string | null;
  employer_country: string | null;
  employer_phone: string | null;
  naics_code: string | null;
  job_title: string | null;
  soc_code: string | null;
  soc_title: string | null;
  full_time_position: boolean | null;
  begin_date: string | null;
  end_date: string | null;
  total_workers: number | null;
  wage_rate_from: number | null;
  wage_rate_to: number | null;
  wage_unit: string | null;
  prevailing_wage: number | null;
  pw_unit: string | null;
  pw_wage_level: string | null;
  pw_source: string | null;
  h1b_dependent: boolean | null;
  willful_violator: boolean | null;
  worksite_city: string | null;
  worksite_county: string | null;
  worksite_state: string | null;
  worksite_postal_code: string | null;
}

// Parse CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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

function parseDate(dateStr: string | null): string | null {
  if (!dateStr || dateStr === '' || dateStr === 'NA') return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

function parseNumber(numStr: string | null): number | null {
  if (!numStr || numStr === '' || numStr === 'NA') return null;
  const num = parseFloat(numStr.replace(/[$,]/g, ''));
  return isNaN(num) ? null : num;
}

function parseBoolean(boolStr: string | null): boolean | null {
  if (!boolStr || boolStr === '' || boolStr === 'NA') return null;
  return boolStr.toUpperCase() === 'Y' || boolStr.toUpperCase() === 'YES' || boolStr === '1';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { csvData, fiscalYear } = await req.json();
    
    if (!csvData) {
      return new Response(
        JSON.stringify({ error: 'CSV data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lines = csvData.split('\n');
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
    
    console.log('Headers found:', headers.slice(0, 20));
    
    // Map column names to our schema
    const columnMap: Record<string, string> = {
      'case_number': 'case_number',
      'case_status': 'case_status',
      'received_date': 'received_date',
      'decision_date': 'decision_date',
      'visa_class': 'visa_class',
      'employer_name': 'employer_name',
      'trade_name_dba': 'employer_dba',
      'employer_business_dba': 'employer_dba',
      'employer_address1': 'employer_address1',
      'employer_address_1': 'employer_address1',
      'employer_address2': 'employer_address2',
      'employer_address_2': 'employer_address2',
      'employer_city': 'employer_city',
      'employer_state': 'employer_state',
      'employer_postal_code': 'employer_postal_code',
      'employer_country': 'employer_country',
      'employer_phone': 'employer_phone',
      'naics_code': 'naics_code',
      'job_title': 'job_title',
      'soc_code': 'soc_code',
      'soc_title': 'soc_title',
      'full_time_position': 'full_time_position',
      'begin_date': 'begin_date',
      'end_date': 'end_date',
      'total_workers': 'total_workers',
      'total_worker_positions': 'total_workers',
      'wage_rate_of_pay_from': 'wage_rate_from',
      'wage_rate_of_pay_from_1': 'wage_rate_from',
      'wage_rate_of_pay_to': 'wage_rate_to',
      'wage_rate_of_pay_to_1': 'wage_rate_to',
      'wage_unit_of_pay': 'wage_unit',
      'wage_unit_of_pay_1': 'wage_unit',
      'prevailing_wage': 'prevailing_wage',
      'prevailing_wage_1': 'prevailing_wage',
      'pw_unit_of_pay': 'pw_unit',
      'pw_unit_of_pay_1': 'pw_unit',
      'pw_wage_level': 'pw_wage_level',
      'pw_wage_level_1': 'pw_wage_level',
      'pw_source': 'pw_source',
      'pw_source_1': 'pw_source',
      'h-1b_dependent': 'h1b_dependent',
      'willful_violator': 'willful_violator',
      'worksite_city': 'worksite_city',
      'worksite_city_1': 'worksite_city',
      'worksite_county': 'worksite_county',
      'worksite_county_1': 'worksite_county',
      'worksite_state': 'worksite_state',
      'worksite_state_1': 'worksite_state',
      'worksite_postal_code': 'worksite_postal_code',
      'worksite_postal_code_1': 'worksite_postal_code',
    };

    // Find column indices
    const colIndices: Record<string, number> = {};
    headers.forEach((header, idx) => {
      const mapped = columnMap[header];
      if (mapped && colIndices[mapped] === undefined) {
        colIndices[mapped] = idx;
      }
    });

    console.log('Column mapping:', colIndices);

    const records: any[] = [];
    let skipped = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = parseCSVLine(line);
      
      const caseNumber = values[colIndices['case_number']] || '';
      const caseStatus = values[colIndices['case_status']] || '';
      const visaClass = values[colIndices['visa_class']] || '';
      const employerName = values[colIndices['employer_name']] || '';
      
      if (!caseNumber || !caseStatus || !visaClass || !employerName) {
        skipped++;
        continue;
      }

      const record = {
        case_number: caseNumber,
        case_status: caseStatus,
        visa_class: visaClass,
        employer_name: employerName,
        employer_dba: values[colIndices['employer_dba']] || null,
        employer_address1: values[colIndices['employer_address1']] || null,
        employer_address2: values[colIndices['employer_address2']] || null,
        employer_city: values[colIndices['employer_city']] || null,
        employer_state: values[colIndices['employer_state']] || null,
        employer_postal_code: values[colIndices['employer_postal_code']] || null,
        employer_country: values[colIndices['employer_country']] || null,
        employer_phone: values[colIndices['employer_phone']] || null,
        naics_code: values[colIndices['naics_code']] || null,
        job_title: values[colIndices['job_title']] || null,
        soc_code: values[colIndices['soc_code']] || null,
        soc_title: values[colIndices['soc_title']] || null,
        full_time_position: parseBoolean(values[colIndices['full_time_position']]),
        begin_date: parseDate(values[colIndices['begin_date']]),
        end_date: parseDate(values[colIndices['end_date']]),
        total_workers: parseNumber(values[colIndices['total_workers']]) as number | null,
        wage_rate_from: parseNumber(values[colIndices['wage_rate_from']]),
        wage_rate_to: parseNumber(values[colIndices['wage_rate_to']]),
        wage_unit: values[colIndices['wage_unit']] || null,
        prevailing_wage: parseNumber(values[colIndices['prevailing_wage']]),
        pw_unit: values[colIndices['pw_unit']] || null,
        pw_wage_level: values[colIndices['pw_wage_level']] || null,
        pw_source: values[colIndices['pw_source']] || null,
        h1b_dependent: parseBoolean(values[colIndices['h1b_dependent']]),
        willful_violator: parseBoolean(values[colIndices['willful_violator']]),
        worksite_city: values[colIndices['worksite_city']] || null,
        worksite_county: values[colIndices['worksite_county']] || null,
        worksite_state: values[colIndices['worksite_state']] || null,
        worksite_postal_code: values[colIndices['worksite_postal_code']] || null,
        fiscal_year: fiscalYear || null,
        received_date: parseDate(values[colIndices['received_date']]),
        decision_date: parseDate(values[colIndices['decision_date']]),
      };

      records.push(record);
    }

    console.log(`Parsed ${records.length} records, skipped ${skipped}`);

    // Insert in batches
    const batchSize = 500;
    let inserted = 0;
    let errors = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('lca_disclosure')
        .upsert(batch, { onConflict: 'case_number' });
      
      if (error) {
        console.error('Batch insert error:', error);
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalParsed: records.length,
        inserted,
        errors,
        skipped
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
