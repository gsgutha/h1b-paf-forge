import { FileText, Home, Plus, Search, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/create', label: 'Create PAF', icon: Plus },
  { href: '/lookup', label: 'Lookup', icon: Search },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Header() {
  const location = useLocation();

  return (
    <header className="nav-gradient sticky top-0 z-50 w-full border-b border-white/10 shadow-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
            <FileText className="h-5 w-5 text-accent" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-primary-foreground">H-1B PAF Portal</span>
            <span className="text-xs text-primary-foreground/70">Public Access File Generator</span>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-white/15 text-primary-foreground shadow-sm'
                    : 'text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
