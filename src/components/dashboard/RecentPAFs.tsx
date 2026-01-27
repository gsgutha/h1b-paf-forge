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

interface PAFRecord {
  id: string;
  job_title: string;
  employer_legal_name: string;
  lca_case_number: string | null;
  created_at: string;
  soc_code: string;
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

  return (
    <div className="paf-section slide-up">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Recent PAFs</h3>
        <Button variant="ghost" size="sm">
          View All
        </Button>
      </div>
      
      <div className="divide-y divide-border">
        {pafs.map((paf) => (
          <div
            key={paf.id}
            className="flex items-center gap-4 py-4 transition-colors hover:bg-muted/30"
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
                <DropdownMenuItem>
                  <Eye className="mr-2 h-4 w-4" /> View
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" /> Edit
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
          </div>
        ))}
      </div>
    </div>
  );
}
