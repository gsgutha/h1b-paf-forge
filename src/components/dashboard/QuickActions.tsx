import { Plus, Search, FileText, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const actions = [
  {
    title: 'Create New PAF',
    description: 'Start a new Public Access File',
    icon: Plus,
    href: '/create',
    variant: 'hero' as const,
  },
  {
    title: 'Occupation Lookup',
    description: 'Search SOC/ONET codes',
    icon: Search,
    href: '/lookup',
    variant: 'outline' as const,
  },
  {
    title: 'View Sample PAF',
    description: 'See a completed example',
    icon: FileText,
    href: '/preview',
    variant: 'outline' as const,
  },
];

export function QuickActions() {
  return (
    <div className="paf-section slide-up">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Quick Actions</h3>
      <div className="grid gap-3">
        {actions.map((action) => (
          <Link key={action.href} to={action.href} className="block">
            <Button
              variant={action.variant}
              className="h-auto w-full justify-start gap-4 px-4 py-4 text-left"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                <action.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{action.title}</p>
                <p className="text-sm opacity-80">{action.description}</p>
              </div>
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
