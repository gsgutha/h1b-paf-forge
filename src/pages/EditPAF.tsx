import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { downloadPAF } from '@/lib/pdfGenerator';
import type { PAFData } from '@/types/paf';
import { toast } from 'sonner';

export default function EditPAF() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: pafRecord, isLoading, error } = useQuery({
    queryKey: ['paf-record', id],
    queryFn: async () => {
      if (!id) throw new Error('No PAF ID provided');
      
      const { data, error } = await supabase
        .from('paf_records')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleDownload = async () => {
    if (!pafRecord) return;

    // Map database record to PAFData structure
    const pafData: PAFData = {
      visaType: pafRecord.visa_type as PAFData['visaType'],
      caseNumber: pafRecord.lca_case_number || undefined,
      caseStatus: 'Certified',
      isH1BDependent: pafRecord.is_h1b_dependent,
      isWillfulViolator: pafRecord.is_willful_violator,
      employer: {
        legalBusinessName: pafRecord.employer_legal_name,
        tradeName: pafRecord.employer_trade_name || undefined,
        address1: pafRecord.employer_address1,
        address2: pafRecord.employer_address2 || undefined,
        city: pafRecord.employer_city,
        state: pafRecord.employer_state,
        postalCode: pafRecord.employer_postal_code,
        country: pafRecord.employer_country,
        telephone: pafRecord.employer_telephone,
        fein: pafRecord.employer_fein,
        naicsCode: pafRecord.employer_naics_code,
      },
      contact: {
        lastName: '',
        firstName: '',
        jobTitle: '',
        address1: pafRecord.employer_address1,
        city: pafRecord.employer_city,
        state: pafRecord.employer_state,
        postalCode: pafRecord.employer_postal_code,
        country: pafRecord.employer_country,
        telephone: pafRecord.employer_telephone,
        email: '',
      },
      job: {
        jobTitle: pafRecord.job_title,
        socCode: pafRecord.soc_code,
        socTitle: pafRecord.soc_title,
        onetCode: pafRecord.onet_code || undefined,
        onetTitle: pafRecord.onet_title || undefined,
        isFullTime: pafRecord.is_full_time,
        beginDate: pafRecord.begin_date,
        endDate: pafRecord.end_date,
        wageRateFrom: pafRecord.wage_rate_from,
        wageRateTo: pafRecord.wage_rate_to || undefined,
        wageUnit: pafRecord.wage_unit as PAFData['job']['wageUnit'],
        workersNeeded: pafRecord.workers_needed,
        isRD: pafRecord.is_rd || undefined,
      },
      worksite: {
        address1: pafRecord.worksite_address1,
        address2: pafRecord.worksite_address2 || undefined,
        city: pafRecord.worksite_city,
        state: pafRecord.worksite_state,
        postalCode: pafRecord.worksite_postal_code,
        county: pafRecord.worksite_county || undefined,
        areaCode: pafRecord.worksite_area_code || undefined,
        areaName: pafRecord.worksite_area_name || undefined,
      },
      wage: {
        prevailingWage: pafRecord.prevailing_wage,
        prevailingWageUnit: pafRecord.prevailing_wage_unit as PAFData['wage']['prevailingWageUnit'],
        wageLevel: pafRecord.wage_level as PAFData['wage']['wageLevel'],
        wageSource: pafRecord.wage_source,
        wageSourceDate: pafRecord.wage_source_date,
        actualWage: pafRecord.actual_wage,
        actualWageUnit: pafRecord.actual_wage_unit as PAFData['wage']['actualWageUnit'],
      },
    };

    try {
      toast.loading('Generating PDF...', { id: 'download' });
      await downloadPAF(pafData, undefined);
      toast.success('PAF downloaded successfully', { id: 'download' });
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to generate PAF document', { id: 'download' });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (error || !pafRecord) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-2xl font-bold mb-2">PAF Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The requested Public Access File could not be found.
            </p>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-muted/30 py-8 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{pafRecord.job_title}</h1>
              <p className="mt-2 text-muted-foreground">
                {pafRecord.employer_legal_name} • {pafRecord.lca_case_number || 'No case number'}
              </p>
            </div>
            <Button onClick={handleDownload} variant="wizard">
              <Download className="mr-2 h-4 w-4" />
              Download PAF
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Employer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Employer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Legal Business Name</p>
                <p className="font-medium">{pafRecord.employer_legal_name}</p>
              </div>
              {pafRecord.employer_trade_name && (
                <div>
                  <p className="text-sm text-muted-foreground">Trade Name (DBA)</p>
                  <p className="font-medium">{pafRecord.employer_trade_name}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">
                  {pafRecord.employer_address1}
                  {pafRecord.employer_address2 && `, ${pafRecord.employer_address2}`}
                  <br />
                  {pafRecord.employer_city}, {pafRecord.employer_state} {pafRecord.employer_postal_code}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">FEIN</p>
                <p className="font-medium font-mono">{pafRecord.employer_fein}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">NAICS Code</p>
                <p className="font-medium font-mono">{pafRecord.employer_naics_code}</p>
              </div>
            </CardContent>
          </Card>

          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Job Title</p>
                <p className="font-medium">{pafRecord.job_title}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">SOC Code</p>
                <p className="font-medium font-mono">{pafRecord.soc_code} - {pafRecord.soc_title}</p>
              </div>
              {pafRecord.onet_code && (
                <div>
                  <p className="text-sm text-muted-foreground">O*NET Code</p>
                  <p className="font-medium font-mono">{pafRecord.onet_code}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Employment Period</p>
                <p className="font-medium">
                  {new Date(pafRecord.begin_date).toLocaleDateString()} — {new Date(pafRecord.end_date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant={pafRecord.is_full_time ? "default" : "secondary"}>
                  {pafRecord.is_full_time ? 'Full-Time' : 'Part-Time'}
                </Badge>
                {pafRecord.is_rd && (
                  <Badge variant="outline">R&D</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Worksite */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Worksite Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">
                  {pafRecord.worksite_address1}
                  {pafRecord.worksite_address2 && `, ${pafRecord.worksite_address2}`}
                  <br />
                  {pafRecord.worksite_city}, {pafRecord.worksite_state} {pafRecord.worksite_postal_code}
                </p>
              </div>
              {pafRecord.worksite_county && (
                <div>
                  <p className="text-sm text-muted-foreground">County</p>
                  <p className="font-medium">{pafRecord.worksite_county}</p>
                </div>
              )}
              {pafRecord.worksite_area_name && (
                <div>
                  <p className="text-sm text-muted-foreground">Wage Area</p>
                  <p className="font-medium">{pafRecord.worksite_area_name}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Wage Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Wage Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Offered Wage</p>
                <p className="font-medium text-lg">
                  ${pafRecord.wage_rate_from.toLocaleString()}
                  {pafRecord.wage_rate_to && ` - $${pafRecord.wage_rate_to.toLocaleString()}`}
                  <span className="text-sm text-muted-foreground ml-1">/ {pafRecord.wage_unit}</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Actual Wage</p>
                <p className="font-medium">
                  ${pafRecord.actual_wage.toLocaleString()}
                  <span className="text-sm text-muted-foreground ml-1">/ {pafRecord.actual_wage_unit}</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prevailing Wage</p>
                <p className="font-medium">
                  ${pafRecord.prevailing_wage.toLocaleString()}
                  <span className="text-sm text-muted-foreground ml-1">/ {pafRecord.prevailing_wage_unit}</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wage Level</p>
                <Badge>{pafRecord.wage_level}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wage Source</p>
                <p className="font-medium">{pafRecord.wage_source}</p>
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Compliance Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant={pafRecord.is_h1b_dependent ? "destructive" : "outline"}>
                    H-1B Dependent: {pafRecord.is_h1b_dependent ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={pafRecord.is_willful_violator ? "destructive" : "outline"}>
                    Willful Violator: {pafRecord.is_willful_violator ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    Visa Type: {pafRecord.visa_type}
                  </Badge>
                </div>
                {pafRecord.lca_case_number && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      LCA: {pafRecord.lca_case_number}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                Created: {new Date(pafRecord.created_at).toLocaleString()} • 
                Updated: {new Date(pafRecord.updated_at).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
