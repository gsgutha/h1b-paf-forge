import { ReactNode } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-card py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>H-1B PAF Portal • Data sourced from FLAG.gov</p>
          <p className="mt-1 text-xs">For informational purposes only. Consult an immigration attorney for legal advice.</p>
        </div>
      </footer>
    </div>
  );
}
