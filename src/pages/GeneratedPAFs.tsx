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
                          <DropdownMenuItem>
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
