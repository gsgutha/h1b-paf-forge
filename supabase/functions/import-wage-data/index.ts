import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BlobReader, ZipReader, TextWriter } from "https://deno.land/x/zipjs@v2.7.32/index.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WageRecord {
  wage_year: string;
  area_code: string;
  area_name: string;
  soc_code: string;
  soc_title: string;
  level_1_hourly: number | null;
  level_1_annual: number | null;
  level_2_hourly: number | null;
  level_2_annual: number | null;
  level_3_hourly: number | null;
  level_3_annual: number | null;
  level_4_hourly: number | null;
  level_4_annual: number | null;
  mean_hourly: number | null;
  mean_annual: number | null;
}

// Parse CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

// Parse number, return null if invalid
function parseNumber(value: string): number | null {
  if (!value || value === '' || value === 'N/A' || value === '#N/A' || value === '*') {
    return null;
  }
  const num = parseFloat(value.replace(/[$,]/g, ''));
  return isNaN(num) ? null : num;
}

// Determine wage year from filename or URL
function getWageYear(url: string): string {
  if (url.includes('2025-26')) return '2025-2026';
  if (url.includes('2024-25')) return '2024-2025';
  if (url.includes('2023-24')) return '2023-2024';
  if (url.includes('2022-23')) return '2022-2023';
  if (url.includes('2021-22')) return '2021-2022';
  if (url.includes('2020-21')) return '2020-2021';
  if (url.includes('2019-20')) return '2019-2020';
  return 'unknown';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { zipUrl, wageYear: customWageYear, skipRows = 0, clearExisting = true } = await req.json();

    if (!zipUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'zipUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const wageYear = customWageYear || getWageYear(zipUrl);
    console.log(`Importing wage data for year: ${wageYear} from ${zipUrl}, skipRows: ${skipRows}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download ZIP file
    console.log('Downloading ZIP file...');
    const zipResponse = await fetch(zipUrl);
    if (!zipResponse.ok) {
      throw new Error(`Failed to download ZIP: ${zipResponse.status}`);
    }

    const zipBlob = await zipResponse.blob();
    console.log(`Downloaded ${(zipBlob.size / 1024 / 1024).toFixed(2)} MB`);

    // Extract ZIP
    console.log('Extracting ZIP...');
    const zipReader = new ZipReader(new BlobReader(zipBlob));
    const entries = await zipReader.getEntries();
    
    // Find the main wage data CSV
    const csvFiles = entries.filter(e => e.filename.toLowerCase().endsWith('.csv'));
    console.log('CSV files found:', csvFiles.map(e => e.filename));

    let wageDataEntry = entries.find(e => 
      e.filename.toLowerCase().endsWith('.csv') &&
      (e.filename.toLowerCase().includes('oews') || 
       e.filename.toLowerCase().includes('wage'))
    );
    
    if (!wageDataEntry && csvFiles.length > 0) {
      wageDataEntry = csvFiles[0];
    }

    if (!wageDataEntry) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not find wage data CSV in ZIP',
          availableFiles: entries.map(e => e.filename)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing file: ${wageDataEntry.filename}`);
    
    // Extract CSV content
    const textWriter = new TextWriter();
    const csvContent = await wageDataEntry.getData!(textWriter);
    await zipReader.close();

    // Parse CSV
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file appears to be empty');
    }

    console.log(`Total lines in CSV: ${lines.length}`);

    // Parse header
    const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    console.log('CSV headers:', header);

    // Map column names
    const getColIndex = (names: string[]): number => {
      for (const name of names) {
        const idx = header.findIndex(h => h === name || h.includes(name));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const colMap = {
      areaCode: getColIndex(['area', 'area_code', 'areacode']),
      socCode: getColIndex(['soccode', 'soc_code', 'occ_code']),
      geoLevel: getColIndex(['geolvl', 'geo_level']),
      level1: getColIndex(['level1', 'lev_1', 'level_1']),
      level2: getColIndex(['level2', 'lev_2', 'level_2']),
      level3: getColIndex(['level3', 'lev_3', 'level_3']),
      level4: getColIndex(['level4', 'lev_4', 'level_4']),
      average: getColIndex(['average', 'mean', 'avg']),
      label: getColIndex(['label', 'area_name', 'title']),
    };

    if (colMap.areaCode === -1 || colMap.socCode === -1) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Required columns (area, soccode) not found',
          headers: header,
          colMap
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only delete if clearExisting and not resuming
    if (clearExisting && skipRows === 0) {
      console.log(`Deleting existing data for ${wageYear}...`);
      const { error: deleteError } = await supabase
        .from('oflc_prevailing_wages')
        .delete()
        .eq('wage_year', wageYear);

      if (deleteError) {
        console.error('Delete error:', deleteError);
      }
    }

    // Use larger batches for efficiency
    const batchSize = 1000;
    let totalInserted = 0;
    let batch: WageRecord[] = [];
    let skipped = 0;

    // Start from skipRows + 1 (accounting for header)
    const startRow = 1 + skipRows;
    console.log(`Starting from row ${startRow}`);

    for (let i = startRow; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      if (row.length < 3) continue;

      const areaCode = row[colMap.areaCode] || '';
      const socCode = row[colMap.socCode] || '';
      
      if (!areaCode || !socCode) {
        skipped++;
        continue;
      }

      const label = colMap.label !== -1 ? row[colMap.label] || '' : '';
      
      const level1 = colMap.level1 !== -1 ? parseNumber(row[colMap.level1]) : null;
      const level2 = colMap.level2 !== -1 ? parseNumber(row[colMap.level2]) : null;
      const level3 = colMap.level3 !== -1 ? parseNumber(row[colMap.level3]) : null;
      const level4 = colMap.level4 !== -1 ? parseNumber(row[colMap.level4]) : null;
      const average = colMap.average !== -1 ? parseNumber(row[colMap.average]) : null;

      // FLAG.gov data stores HOURLY wages in level columns
      const record: WageRecord = {
        wage_year: wageYear,
        area_code: areaCode,
        area_name: label,
        soc_code: socCode,
        soc_title: '',
        level_1_hourly: level1,
        level_1_annual: level1 ? Math.round(level1 * 2080 * 100) / 100 : null,
        level_2_hourly: level2,
        level_2_annual: level2 ? Math.round(level2 * 2080 * 100) / 100 : null,
        level_3_hourly: level3,
        level_3_annual: level3 ? Math.round(level3 * 2080 * 100) / 100 : null,
        level_4_hourly: level4,
        level_4_annual: level4 ? Math.round(level4 * 2080 * 100) / 100 : null,
        mean_hourly: average,
        mean_annual: average ? Math.round(average * 2080 * 100) / 100 : null,
      };

      batch.push(record);

      if (batch.length >= batchSize) {
        const { error: insertError } = await supabase
          .from('oflc_prevailing_wages')
          .insert(batch);

        if (insertError) {
          console.error(`Batch insert error at row ${i}:`, insertError);
        } else {
          totalInserted += batch.length;
          if (totalInserted % 10000 === 0) {
            console.log(`Inserted ${totalInserted} records...`);
          }
        }
        batch = [];
      }
    }

    // Insert remaining records
    if (batch.length > 0) {
      const { error: insertError } = await supabase
        .from('oflc_prevailing_wages')
        .insert(batch);

      if (insertError) {
        console.error('Final batch insert error:', insertError);
      } else {
        totalInserted += batch.length;
      }
    }

    console.log(`Import complete! Total records: ${totalInserted}, Skipped: ${skipped}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully imported ${totalInserted} wage records for ${wageYear}`,
        wageYear,
        recordCount: totalInserted,
        skippedCount: skipped,
        sourceFile: wageDataEntry.filename,
        totalRowsInFile: lines.length - 1,
        nextSkipRows: skipRows + totalInserted + skipped
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
