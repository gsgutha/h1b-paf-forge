import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, CheckCircle2, Calendar, MapPin, DollarSign, Briefcase } from 'lucide-react';
import { format } from 'date-fns';

const EMPLOYER_NAME = 'Sai Business Solutions LLC';

export interface LCARecord {
  id: string;
  case_number: string;
  case_status: string;
  employer_name: string;
  employer_city: string | null;
  employer_state: string | null;
  employer_address1: string | null;
  employer_address2: string | null;
  employer_postal_code: string | null;
  employer_country: string | null;
  employer_phone: string | null;
  employer_fein: string | null;
  naics_code: string | null;
  job_title: string | null;
  soc_code: string | null;
  soc_title: string | null;
  wage_rate_from: number | null;
  wage_rate_to: number | null;
  wage_unit: string | null;
  prevailing_wage: number | null;
  pw_wage_level: string | null;
  worksite_city: string | null;
  worksite_state: string | null;
  worksite_postal_code: string | null;
  worksite_county: string | null;
  begin_date: string | null;
  end_date: string | null;
  decision_date: string | null;
  visa_class: string;
  h1b_dependent: boolean | null;
  willful_violator: boolean | null;
  full_time_position: boolean | null;
  total_workers: number | null;
  paf_generated: boolean;
  paf_generated_at: string | null;
}

interface LCASelectionStepProps {
  onSelect: (lca: LCARecord) => void;
}

export function LCASelectionStep({ onSelect }: LCASelectionStepProps) {
  const [selectedLcaId, setSelectedLcaId] = useState<string>('');

  // Fetch pending LCAs (not yet used for PAF)
  const { data: pendingLcas, isLoading: loadingPending } = useQuery({
    queryKey: ['pending-lcas', EMPLOYER_NAME],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lca_disclosure')
        .select('*')
        .eq('employer_name', EMPLOYER_NAME)
        .eq('paf_generated', false)
        .ilike('case_status', '%certified%')
        .order('decision_date', { ascending: false });
      
      if (error) throw error;
      return data as LCARecord[];
    },
  });

  // Fetch generated PAFs
  const { data: generatedLcas, isLoading: loadingGenerated } = useQuery({
    queryKey: ['generated-lcas', EMPLOYER_NAME],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lca_disclosure')
        .select('*')
        .eq('employer_name', EMPLOYER_NAME)
        .eq('paf_generated', true)
        .order('paf_generated_at', { ascending: false });
      
      if (error) throw error;
      return data as LCARecord[];
    },
  });

  const selectedLca = pendingLcas?.find(lca => lca.id === selectedLcaId);

  const formatCurrency = (amount: number | null, unit: string | null) => {
    if (amount === null) return 'N/A';
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    
    if (unit) {
      const unitLabel = unit.toLowerCase().includes('year') ? '/yr' : 
                        unit.toLowerCase().includes('hour') ? '/hr' : 
                        unit.toLowerCase().includes('month') ? '/mo' : '';
      return `${formatted}${unitLabel}`;
    }
    return formatted;
  };

  const handleContinue = () => {
    if (selectedLca) {
      onSelect(selectedLca);
    }
  };

  return (
    <div className="space-y-6">
      {/* LCA Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Select LCA for PAF Generation
          </CardTitle>
          <CardDescription>
            Choose a certified LCA from {EMPLOYER_NAME} to generate a Public Access File
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingPending ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : pendingLcas && pendingLcas.length > 0 ? (
            <>
              <Select value={selectedLcaId} onValueChange={setSelectedLcaId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an LCA case..." />
                </SelectTrigger>
                <SelectContent>
                  {pendingLcas.map((lca) => (
                    <SelectItem key={lca.id} value={lca.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{lca.case_number}</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="truncate max-w-[200px]">{lca.job_title || 'No title'}</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-xs text-muted-foreground">
                          {lca.decision_date ? format(new Date(lca.decision_date), 'MMM d, yyyy') : 'N/A'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Selected LCA Details */}
              {selectedLca && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{selectedLca.job_title || 'Position Details'}</h4>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        🟡 Not Generated
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span>SOC: {selectedLca.soc_code || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedLca.worksite_city}, {selectedLca.worksite_state}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>Wage: {formatCurrency(selectedLca.wage_rate_from, selectedLca.wage_unit)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {selectedLca.begin_date ? format(new Date(selectedLca.begin_date), 'MMM d, yyyy') : 'N/A'}
                          {' - '}
                          {selectedLca.end_date ? format(new Date(selectedLca.end_date), 'MMM d, yyyy') : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <p>Prevailing Wage: {formatCurrency(selectedLca.prevailing_wage, selectedLca.wage_unit)} ({selectedLca.pw_wage_level || 'N/A'})</p>
                      <p>Workers: {selectedLca.total_workers || 1} | Full-time: {selectedLca.full_time_position ? 'Yes' : 'No'}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={handleContinue} 
                disabled={!selectedLcaId}
                className="w-full"
              >
                Continue with Selected LCA
              </Button>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50 text-green-500" />
              <p>All LCAs have been processed!</p>
              <p className="text-sm mt-1">No pending LCAs require PAF generation.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated PAFs Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Generated PAFs
          </CardTitle>
          <CardDescription>
            LCAs that already have PAF documents generated
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingGenerated ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : generatedLcas && generatedLcas.length > 0 ? (
            <div className="space-y-2">
              {generatedLcas.map((lca) => (
                <div 
                  key={lca.id} 
                  className="flex items-center justify-between p-3 rounded-lg border bg-green-50/50 dark:bg-green-950/20"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-mono text-sm">{lca.case_number}</p>
                      <p className="text-xs text-muted-foreground">{lca.job_title || 'No title'}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                          🟢 PAF Generated
                        </Badge>
                        <span className="text-green-600" title="Audit Ready">✅</span>
                      </div>
                      {lca.paf_generated_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(lca.paf_generated_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No PAFs generated yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
