const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64 } = await req.json();

    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      throw new Error('Missing or invalid pdfBase64 parameter');
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

    const extractionPrompt = `Analyze this LCA (Labor Condition Application, Form ETA 9035/9035E) document thoroughly across ALL pages and extract the following fields. Return ONLY a JSON object with these fields (no markdown, no explanation):

{
  "caseNumber": "string - the LCA case number (format: I-XXX-XXXXX-XXXXXX)",
  "caseStatus": "string - Certified, Pending, Denied, or Withdrawn",
  "visaClass": "string - visa classification (e.g., H-1B)",

  "employerName": "string - legal business name",
  "employerAddress": "string - street address",
  "employerCity": "string",
  "employerState": "string - full state name",
  "employerPostalCode": "string",
  "employerPhone": "string - employer phone number",
  "employerFein": "string - Federal Employer Identification Number",
  "naicsCode": "string - NAICS code",

  "jobTitle": "string - the job title for the H-1B position",
  "socCode": "string - Standard Occupational Classification code (format: XX-XXXX)",
  "socTitle": "string - SOC occupation title",
  "isFullTime": "boolean - whether this is a full-time position",
  "totalWorkers": "number - total number of workers requested",

  "beginDate": "string - employment begin date in YYYY-MM-DD format",
  "endDate": "string - employment end date in YYYY-MM-DD format",

  "wageRateFrom": "number - wage rate from (numeric only, no dollar sign)",
  "wageRateTo": "number or null - wage rate to, if a range",
  "wageUnit": "string - Year, Hour, Week, Bi-Weekly, or Month",

  "prevailingWage": "number - prevailing wage amount (numeric only)",
  "prevailingWageUnit": "string - Year, Hour, Week, Bi-Weekly, or Month",
  "wageLevel": "string - Level I, Level II, Level III, or Level IV",

  "worksiteAddress": "string - primary worksite street address (Section F on page 3)",
  "worksiteCity": "string - primary worksite city",
  "worksiteState": "string - primary worksite state (full name)",
  "worksitePostalCode": "string - primary worksite zip code",
  "worksiteCounty": "string - primary worksite county",

  "hasSecondaryWorksite": "boolean - true if there is a secondary/additional worksite listed (check page 7 / Appendix A)",
  "secondaryWorksiteAddress": "string or null - secondary worksite street address from Appendix A or additional worksite section",
  "secondaryWorksiteCity": "string or null - secondary worksite city",
  "secondaryWorksiteState": "string or null - secondary worksite state (full name)",
  "secondaryWorksitePostalCode": "string or null - secondary worksite zip code",
  "secondaryWorksiteCounty": "string or null - secondary worksite county",

  "h1bDependent": "boolean - whether the employer is H-1B dependent",
  "willfulViolator": "boolean - whether the employer is a willful violator"
}

IMPORTANT:
- Carefully check ALL pages including page 3 (Section F - primary worksite) and page 7 or Appendix A (additional/secondary worksites)
- Return ONLY the JSON object, no markdown code fences, no explanation text
- Use null for any field that cannot be determined from the document
- Dates must be in YYYY-MM-DD format
- Wage amounts must be plain numbers (no currency symbols or commas)
- Boolean fields must be true or false (not strings)
- For secondary worksite, check the "Additional Worksite" or "Appendix A" section`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: extractionPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI processing error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) throw new Error('No content returned from AI');

    // Parse JSON from the response (handle potential markdown wrapping)
    let parsed;
    try {
      const jsonMatch =
        content.match(/```json\s*([\s\S]*?)\s*```/) ||
        content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsed = JSON.parse(jsonStr.trim());
    } catch {
      console.error('Failed to parse AI response:', content);
      throw new Error('Could not parse extracted data from LCA');
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('scan-lca-pdf error:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
