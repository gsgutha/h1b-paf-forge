import { FileText, MoreHorizontal, Eye, Edit, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface PAFItem {
  id: string;
  jobTitle: string;
  employeeName: string;
  caseNumber: string;
  status: 'certified' | 'pending' | 'draft';
  createdAt: string;
}

const samplePAFs: PAFItem[] = [
  {
    id: '1',
    jobTitle: 'Software Developer',
    employeeName: 'John Smith',
    caseNumber: 'I-200-24001-123456',
    status: 'certified',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    jobTitle: 'Data Scientist',
    employeeName: 'Jane Doe',
    caseNumber: 'I-200-24002-789012',
    status: 'pending',
    createdAt: '2024-01-10',
  },
  {
    id: '3',
    jobTitle: 'Systems Analyst',
    employeeName: 'Bob Johnson',
    caseNumber: '',
    status: 'draft',
    createdAt: '2024-01-08',
  },
];

const statusConfig = {
  certified: { label: 'Certified', className: 'bg-success/10 text-success border-success/20' },
  pending: { label: 'Pending', className: 'bg-warning/10 text-warning border-warning/20' },
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground border-border' },
};

export function RecentPAFs() {
  return (
    <div className="paf-section slide-up">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Recent PAFs</h3>
        <Button variant="ghost" size="sm">
          View All
        </Button>
      </div>
      
      <div className="divide-y divide-border">
        {samplePAFs.map((paf) => (
          <div
            key={paf.id}
            className="flex items-center gap-4 py-4 transition-colors hover:bg-muted/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{paf.jobTitle}</p>
              <p className="text-sm text-muted-foreground">{paf.employeeName}</p>
            </div>
            
            <div className="hidden md:block text-right">
              <p className="text-sm font-mono text-foreground">
                {paf.caseNumber || 'No case number'}
              </p>
              <p className="text-xs text-muted-foreground">{paf.createdAt}</p>
            </div>
            
            <Badge 
              variant="outline" 
              className={statusConfig[paf.status].className}
            >
              {statusConfig[paf.status].label}
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
