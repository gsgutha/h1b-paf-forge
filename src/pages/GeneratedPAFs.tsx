import { FileText, Eye, Edit, Download, Trash2, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { downloadPAF } from '@/lib/pdfGenerator';
import { toast } from 'sonner';
import type { PAFData } from '@/types/paf';
// Fetch full record for download
async function fetchFullPAFRecord(id: string) {
  const { data, error } = await supabase
    .from('paf_records')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
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

interface PAFRecord {
  id: string;
  job_title: string;
  employer_legal_name: string;
  lca_case_number: string | null;
  created_at: string;
  soc_code: string;
  soc_title: string;
  begin_date: string;
  end_date: string;
  worksite_city: string;
  worksite_state: string;
}
export default function GeneratedPAFs() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: pafs, isLoading } = useQuery({
    queryKey: ['all-pafs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paf_records')
        .select('id, job_title, employer_legal_name, lca_case_number, created_at, soc_code, soc_title, begin_date, end_date, worksite_city, worksite_state')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PAFRecord[];
    },
  });

  const filteredPafs = pafs?.filter(paf => 
    paf.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    paf.lca_case_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    paf.soc_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownload = async (e: React.MouseEvent, pafId: string) => {
    e.stopPropagation();
    try {
      toast.loading('Generating PDF...', { id: 'download' });
      const fullRecord = await fetchFullPAFRecord(pafId);
      const pafData = convertToPAFData(fullRecord);
      await downloadPAF(pafData);
      toast.success('PAF downloaded successfully', { id: 'download' });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download PAF', { id: 'download' });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Generated PAFs</h1>
              <p className="text-muted-foreground mt-1">
                View and edit all generated Public Access Files
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by job title, case number, or SOC..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Button asChild>
                <Link to="/create">Create New PAF</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="paf-section">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !filteredPafs || filteredPafs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">
                {searchTerm ? 'No PAFs match your search' : 'No PAFs generated yet'}
              </p>
              <p className="text-sm mt-1">
                {searchTerm ? 'Try a different search term' : 'Create your first Public Access File to get started'}
              </p>
              {!searchTerm && (
                <Button asChild className="mt-4">
                  <Link to="/create">Create PAF</Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Case Number</TableHead>
                  <TableHead>SOC Code</TableHead>
                  <TableHead>Worksite</TableHead>
                  <TableHead>Validity Period</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPafs.map((paf) => (
                  <TableRow 
                    key={paf.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/edit/${paf.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{paf.job_title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {paf.lca_case_number || 'N/A'}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{paf.soc_code}</Badge>
                    </TableCell>
                    <TableCell>
                      {paf.worksite_city}, {paf.worksite_state}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(paf.begin_date).toLocaleDateString()} - {new Date(paf.end_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(paf.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            Actions
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </Layout>
  );
}
