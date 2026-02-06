import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Download, FileText, Save, Pencil, X, Upload, Loader2, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { downloadPAF } from '@/lib/pdfGenerator';
import type { PAFData } from '@/types/paf';
import { toast } from 'sonner';
import { useState, useCallback } from 'react';

// LCA Status Card with re-upload capability + post remove date
function LCAStatusCard({ pafRecord, pafId }: { pafRecord: any; pafId: string }) {
  const queryClient = useQueryClient();
  const lcaStatus = pafRecord.lca_status || 'certified';
  const isInProcess = lcaStatus === 'in_process';
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [postRemoveDate, setPostRemoveDate] = useState(pafRecord.notice_posting_end_date || '');

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file);
  }, []);

  const handleUploadCertifiedLCA = async () => {
    if (!uploadedFile) return;
    setIsUploading(true);
    try {
      // Scan the PDF with AI to verify it's certified
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const pdfBase64 = btoa(binary);

      const { data: scanResult, error: scanError } = await supabase.functions.invoke('scan-lca-pdf', {
        body: { pdfBase64 },
      });

      if (scanError) throw scanError;
      if (!scanResult?.success) throw new Error(scanResult?.error || 'Scan failed');

      const scanData = scanResult.data;
      const isCertified = scanData.caseStatus?.toLowerCase() === 'certified';

      if (!isCertified) {
        toast.error('This LCA is not certified. Please upload a certified LCA.');
        setIsUploading(false);
        return;
      }

      // Update the PAF record: status to certified, case number, and post remove date
      const updates: Record<string, unknown> = {
        lca_status: 'certified',
      };
      if (scanData.caseNumber) updates.lca_case_number = scanData.caseNumber;
      if (postRemoveDate) updates.notice_posting_end_date = postRemoveDate;

      const { error: updateError } = await supabase
        .from('paf_records')
        .update(updates)
        .eq('id', pafId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['paf-record', pafId] });
      queryClient.invalidateQueries({ queryKey: ['all-pafs'] });
      toast.success('LCA certified & posting closed successfully!');
      setUploadedFile(null);
    } catch (err: any) {
      console.error('Upload certified LCA error:', err);
      toast.error(err.message || 'Failed to process certified LCA');
    } finally {
      setIsUploading(false);
    }
  };

  // Allow saving just the post remove date for already-certified records
  const handleSavePostRemoveDate = async () => {
    try {
      const { error } = await supabase
        .from('paf_records')
        .update({ notice_posting_end_date: postRemoveDate || null })
        .eq('id', pafId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['paf-record', pafId] });
      toast.success('Post remove date updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update date');
    }
  };

  return (
    <Card className={`md:col-span-2 border-2 ${isInProcess ? 'border-warning/30' : 'border-success/30'}`}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          LCA Status
          <Badge
            variant={isInProcess ? 'secondary' : 'default'}
            className={isInProcess ? 'bg-warning/20 text-warning border-warning/30' : ''}
          >
            {isInProcess ? '🟡 In Process' : '🟢 Certified'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isInProcess ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-warning/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">LCA is still in process</p>
                <p className="text-muted-foreground">
                  Once your LCA is certified by DOL, upload the certified PDF and enter the post remove date to close the posting.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Upload Certified LCA</Label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                </div>
              </div>
              {uploadedFile && (
                <p className="text-xs text-muted-foreground">
                  Selected: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="postRemoveDate">LCA Post Remove Date</Label>
              <Input
                id="postRemoveDate"
                type="date"
                value={postRemoveDate}
                onChange={(e) => setPostRemoveDate(e.target.value)}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Date the LCA notice was removed (after 10 business days)
              </p>
            </div>

            <Button
              onClick={handleUploadCertifiedLCA}
              disabled={!uploadedFile || isUploading}
              variant="wizard"
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning & Certifying...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Certified LCA & Close Posting
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-success/10 rounded-lg">
              <CheckCircle className="h-5 w-5 text-success mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">LCA is certified</p>
                <p className="text-muted-foreground">
                  This PAF has a certified LCA. You can download the complete PAF document.
                </p>
              </div>
            </div>

            {/* Show posting dates info */}
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              {pafRecord.notice_posting_start_date && (
                <div>
                  <p className="text-muted-foreground">Posting Start Date</p>
                  <p className="font-medium">{new Date(pafRecord.notice_posting_start_date).toLocaleDateString()}</p>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-muted-foreground">Post Remove Date</p>
                {pafRecord.notice_posting_end_date ? (
                  <p className="font-medium">{new Date(pafRecord.notice_posting_end_date).toLocaleDateString()}</p>
                ) : (
                  <div className="flex gap-2 items-end">
                    <Input
                      type="date"
                      value={postRemoveDate}
                      onChange={(e) => setPostRemoveDate(e.target.value)}
                      className="max-w-[180px] h-8 text-sm"
                    />
                    <Button size="sm" variant="outline" onClick={handleSavePostRemoveDate} disabled={!postRemoveDate}>
                      <Save className="mr-1 h-3 w-3" />
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function EditPAF() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [workerName, setWorkerName] = useState('');

  const { data: pafRecord, isLoading, error } = useQuery({
    queryKey: ['paf-record', id],
    queryFn: async () => {
      if (!id) throw new Error('No PAF ID provided');
      
      const { data, error } = await supabase
        .from('paf_records')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Initialize workerName when data loads
  useState(() => {
    if (pafRecord?.worker_name) {
      setWorkerName(pafRecord.worker_name);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: { worker_name: string }) => {
      const { error } = await supabase
        .from('paf_records')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paf-record', id] });
      toast.success('PAF updated successfully');
      setIsEditing(false);
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error('Failed to update PAF');
    },
  });

  const handleSave = () => {
    updateMutation.mutate({ worker_name: workerName });
  };

  const handleStartEdit = () => {
    setWorkerName(pafRecord?.worker_name || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setWorkerName(pafRecord?.worker_name || '');
    setIsEditing(false);
  };

  const handleDownload = async () => {
    if (!pafRecord) return;

    // Map database record to PAFData structure
    const pafData: PAFData = {
      visaType: pafRecord.visa_type as PAFData['visaType'],
      caseNumber: pafRecord.lca_case_number || undefined,
      caseStatus: pafRecord.lca_status === 'in_process' ? 'In Process' : 'Certified',
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
        employeeName: pafRecord.worker_name || undefined,
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

    // Build supportingDocs from stored posting data
    const supportingDocs = {
      lcaCaseNumber: pafRecord.lca_case_number || '',
      lcaFile: null,
      actualWageMemo: '',
      noticePostingProof: null,
      noticePostingStartDate: pafRecord.notice_posting_start_date || '',
      noticePostingEndDate: pafRecord.notice_posting_end_date || '',
      noticePostingLocation: pafRecord.notice_posting_location || '',
      noticePostingLocation2: pafRecord.notice_posting_location2 || '',
      benefitsComparisonFile: null,
      benefitsNotes: '',
    };

    try {
      toast.loading('Generating PDF...', { id: 'download' });
      await downloadPAF(pafData, supportingDocs);
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
            <div className="flex gap-2">
              {!isEditing && (
                <Button onClick={handleStartEdit} variant="outline">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
              <Button onClick={handleDownload} variant="wizard">
                <Download className="mr-2 h-4 w-4" />
                Download PAF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Editable Worker Info Card */}
        <Card className="mb-6 border-2 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>H-1B Worker / Beneficiary</span>
              {!pafRecord.worker_name && !isEditing && (
                <Badge variant="outline" className="text-warning border-warning">
                  Not Set
                </Badge>
              )}
            </CardTitle>
            {isEditing && (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                  <X className="mr-1 h-4 w-4" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                  <Save className="mr-1 h-4 w-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-2">
                <Label htmlFor="workerName">Worker Full Name</Label>
                <Input
                  id="workerName"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  placeholder="Enter the H-1B worker's full name"
                  className="max-w-md"
                />
                <p className="text-sm text-muted-foreground">
                  This name will appear on the Worker Receipt and other personalized documents.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium">
                  {pafRecord.worker_name || (
                    <span className="text-muted-foreground italic">
                      No worker name set. Click "Edit" to add the beneficiary name.
                    </span>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

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

          {/* LCA Status & Re-upload */}
          <LCAStatusCard pafRecord={pafRecord} pafId={id!} />

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
