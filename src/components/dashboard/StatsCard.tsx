import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  href?: string;
}

export function StatsCard({ title, value, description, icon: Icon, trend, className, href }: StatsCardProps) {
  const content = (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
        {trend && (
          <p className={cn(
            "mt-2 text-sm font-medium",
            trend.isPositive ? "text-success" : "text-destructive"
          )}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% from last month
          </p>
        )}
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
        <Icon className="h-6 w-6 text-accent" />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link to={href} className={cn("paf-section slide-up block hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer", className)}>
        {content}
      </Link>
    );
  }

  return (
    <div className={cn("paf-section slide-up", className)}>
      {content}
    </div>
  );
}
