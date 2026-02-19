import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BlobReader, ZipReader, TextWriter } from "https://deno.land/x/zipjs@v2.7.32/index.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { result.push(current.trim().replace(/^"|"$/g, '')); current = ''; }
    else { current += char; }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Auth required' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { zipUrl, wageYear } = await req.json();
    if (!zipUrl || !wageYear) {
      return new Response(JSON.stringify({ success: false, error: 'zipUrl and wageYear required' }), { status: 400, headers: corsHeaders });
    }

    const ALLOWED_DOMAINS = ['flag.dol.gov', 'www.dol.gov', 'www.flcdatacenter.com', 'flcdatacenter.com'];
    try {
      const parsedUrl = new URL(zipUrl);
      if (!ALLOWED_DOMAINS.includes(parsedUrl.hostname)) {
        return new Response(JSON.stringify({ success: false, error: 'URL must be from an approved DOL domain' }), { status: 400, headers: corsHeaders });
      }
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid URL' }), { status: 400, headers: corsHeaders });
    }

    console.log(`Patching area names for ${wageYear} from ${zipUrl}`);

    // Download ZIP
    const zipResponse = await fetch(zipUrl);
    if (!zipResponse.ok) throw new Error(`Failed to download ZIP: ${zipResponse.status}`);
    const zipBlob = await zipResponse.blob();
    console.log(`Downloaded ${(zipBlob.size / 1024 / 1024).toFixed(2)} MB`);

    // Extract ZIP
    const zipReader = new ZipReader(new BlobReader(zipBlob));
    const entries = await zipReader.getEntries();
    console.log('Files in ZIP:', entries.map(e => e.filename));

    // Step 1: Load Geography.csv to build area_code -> area_name map
    const geoEntry = entries.find(e => e.filename.toLowerCase().includes('geography'));
    const areaNameMap = new Map<string, string>();

    if (geoEntry) {
      const textWriter = new TextWriter();
      const geoContent = await geoEntry.getData!(textWriter);
      const geoLines = geoContent.split('\n').filter(l => l.trim());
      const geoHeader = parseCSVLine(geoLines[0]).map(h => h.toLowerCase().trim());
      console.log('Geography headers:', geoHeader);

      // Find area_code and area_name columns — handles both 'area'/'areaname' and 'area_code'/'area_name' variants
      const codeIdx = geoHeader.findIndex(h => h === 'area' || h === 'area_code' || h === 'areacode');
      const nameIdx = geoHeader.findIndex(h => h === 'areaname' || h === 'area_name' || h === 'label' || (h.includes('area') && h.includes('name')));

      if (codeIdx !== -1 && nameIdx !== -1) {
        for (let i = 1; i < geoLines.length; i++) {
          const row = parseCSVLine(geoLines[i]);
          if (row.length > Math.max(codeIdx, nameIdx)) {
            const code = row[codeIdx]?.trim();
            const name = row[nameIdx]?.trim();
            if (code && name) areaNameMap.set(code, name);
          }
        }
        console.log(`Loaded ${areaNameMap.size} area name mappings from Geography.csv`);
      } else {
        console.log('Could not find area_code/area_name columns in Geography.csv, headers:', geoHeader);
      }
    }

    // Step 2: Load main wage CSV to also extract area names from label column
    const mainEntry = entries.find(e =>
      e.filename.toLowerCase().endsWith('.csv') &&
      (e.filename.toLowerCase().includes('alc') || e.filename.toLowerCase().includes('wage'))
    ) || entries.find(e => e.filename.toLowerCase().endsWith('.csv'));

    let labelMapFromMain = new Map<string, string>();
    if (mainEntry) {
      const textWriter2 = new TextWriter();
      const mainContent = await mainEntry.getData!(textWriter2);
      const mainLines = mainContent.split('\n').filter(l => l.trim());
      const mainHeader = parseCSVLine(mainLines[0]).map(h => h.toLowerCase().trim());
      const areaIdx = mainHeader.findIndex(h => h === 'area' || h === 'area_code');
      const labelIdx = mainHeader.findIndex(h => h === 'label' || h === 'area_name');
      
      if (areaIdx !== -1 && labelIdx !== -1) {
        // Sample first 10000 rows to build the map (area codes are repeated, so this is enough)
        const limit = Math.min(mainLines.length, 10001);
        for (let i = 1; i < limit; i++) {
          const row = parseCSVLine(mainLines[i]);
          if (row.length > Math.max(areaIdx, labelIdx)) {
            const code = row[areaIdx]?.trim();
            const name = row[labelIdx]?.trim();
            if (code && name) labelMapFromMain.set(code, name);
          }
        }
        console.log(`Loaded ${labelMapFromMain.size} area name mappings from main CSV label column`);
      }
    }

    await zipReader.close();

    // Merge maps — prefer Geography.csv, fallback to label column
    const mergedMap = new Map([...labelMapFromMain, ...areaNameMap]);
    console.log(`Total unique area codes with names: ${mergedMap.size}`);

    if (mergedMap.size === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Could not load any area name mappings from the ZIP file' }), { headers: corsHeaders });
    }

    // Step 3: Single RPC call to update all area_names at once (much faster than individual UPDATEs)
    const areaCodes = Array.from(mergedMap.keys());
    const areaNames = areaCodes.map(code => mergedMap.get(code)!);

    console.log(`Calling patch_area_names for ${areaCodes.length} area codes in ${wageYear}...`);
    const { data: updatedRows, error: rpcError } = await supabase.rpc('patch_area_names', {
      p_wage_year: wageYear,
      p_area_codes: areaCodes,
      p_area_names: areaNames,
    });

    if (rpcError) {
      console.error('RPC error:', rpcError);
      throw new Error(`patch_area_names failed: ${rpcError.message}`);
    }

    const totalUpdated = updatedRows as number;
    console.log(`Patch complete! Updated ${totalUpdated} rows for ${wageYear}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Patched area names for ${totalUpdated} area codes in ${wageYear}`,
      wageYear,
      areaCodes: mergedMap.size,
      updated: totalUpdated,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Patch error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
