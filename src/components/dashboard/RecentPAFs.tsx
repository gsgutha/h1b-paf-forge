import { FileText, MoreHorizontal, Eye, Edit, Download, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { downloadPAF } from '@/lib/pdfGenerator';
import { toast } from 'sonner';
import type { PAFData } from '@/types/paf';

interface PAFRecord {
  id: string;
  job_title: string;
  employer_legal_name: string;
  lca_case_number: string | null;
  created_at: string;
  soc_code: string;
}
// Convert DB record to PAFData format
function convertToPAFData(record: any): PAFData {
  return {
    visaType: record.visa_type || 'H-1B',
    caseNumber: record.lca_case_number,
    employer: {
      legalBusinessName: record.employer_legal_name,
      tradeName: record.employer_trade_name,
      address1: record.employer_address1,
      address2: record.employer_address2,
      city: record.employer_city,
      state: record.employer_state,
      postalCode: record.employer_postal_code,
      country: record.employer_country,
      telephone: record.employer_telephone,
      fein: record.employer_fein,
      naicsCode: record.employer_naics_code,
    },
    contact: {
      lastName: '',
      firstName: '',
      jobTitle: '',
      address1: record.employer_address1,
      city: record.employer_city,
      state: record.employer_state,
      postalCode: record.employer_postal_code,
      country: record.employer_country,
      telephone: record.employer_telephone,
      email: '',
    },
    job: {
      jobTitle: record.job_title,
      socCode: record.soc_code,
      socTitle: record.soc_title,
      onetCode: record.onet_code,
      onetTitle: record.onet_title,
      isFullTime: record.is_full_time,
      beginDate: record.begin_date,
      endDate: record.end_date,
      wageRateFrom: record.wage_rate_from,
      wageRateTo: record.wage_rate_to,
      wageUnit: record.wage_unit,
      workersNeeded: record.workers_needed,
      isRD: record.is_rd,
    },
    worksite: {
      address1: record.worksite_address1,
      address2: record.worksite_address2,
      city: record.worksite_city,
      state: record.worksite_state,
      postalCode: record.worksite_postal_code,
      county: record.worksite_county,
      areaCode: record.worksite_area_code,
      areaName: record.worksite_area_name,
    },
    wage: {
      prevailingWage: record.prevailing_wage,
      prevailingWageUnit: record.prevailing_wage_unit,
      wageLevel: record.wage_level,
      wageSource: record.wage_source,
      wageSourceDate: record.wage_source_date,
      actualWage: record.actual_wage,
      actualWageUnit: record.actual_wage_unit,
    },
    isH1BDependent: record.is_h1b_dependent,
    isWillfulViolator: record.is_willful_violator,
  };
}

export function RecentPAFs() {
  const { data: pafs, isLoading } = useQuery({
    queryKey: ['recent-pafs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paf_records')
        .select('id, job_title, employer_legal_name, lca_case_number, created_at, soc_code')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as PAFRecord[];
    },
  });

  if (isLoading) {
    return (
      <div className="paf-section slide-up">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Recent PAFs</h3>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!pafs || pafs.length === 0) {
    return (
      <div className="paf-section slide-up">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Recent PAFs</h3>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No PAFs created yet</p>
          <p className="text-sm mt-1">Create your first Public Access File to get started</p>
          <Button asChild className="mt-4">
            <Link to="/create">
              <Plus className="mr-2 h-4 w-4" />
              Create PAF
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleDownload = async (e: React.MouseEvent, pafId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      toast.loading('Generating PDF...', { id: 'download' });
      const { data: fullRecord, error } = await supabase
        .from('paf_records')
        .select('*')
        .eq('id', pafId)
        .single();
      
      if (error) throw error;
      const pafData = convertToPAFData(fullRecord);
      await downloadPAF(pafData);
      toast.success('PAF downloaded successfully', { id: 'download' });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download PAF', { id: 'download' });
    }
  };

  return (
    <div className="paf-section slide-up">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Recent PAFs</h3>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/generated-pafs">View All</Link>
        </Button>
      </div>
      
      <div className="divide-y divide-border">
        {pafs.map((paf) => (
          <Link
            key={paf.id}
            to={`/edit/${paf.id}`}
            className="flex items-center gap-4 py-4 transition-colors hover:bg-muted/30 cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{paf.job_title}</p>
              <p className="text-sm text-muted-foreground">{paf.employer_legal_name}</p>
            </div>
            
            <div className="hidden md:block text-right">
              <p className="text-sm font-mono text-foreground">
                {paf.lca_case_number || 'No case number'}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(paf.created_at).toLocaleDateString()}
              </p>
            </div>
            
            <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
              {paf.soc_code}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={`/edit/${paf.id}`}>
                    <Eye className="mr-2 h-4 w-4" /> View
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/edit/${paf.id}`}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleDownload(e, paf.id)}>
                  <Download className="mr-2 h-4 w-4" /> Download
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Link>
        ))}
      </div>
    </div>
  );
}
