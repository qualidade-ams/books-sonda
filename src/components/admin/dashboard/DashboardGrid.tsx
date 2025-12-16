import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DashboardGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

const columnVariants = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 lg:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
};

const gapVariants = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6'
};

export const DashboardGrid = ({ 
  children, 
  columns = 2, 
  gap = 'md',
  className 
}: DashboardGridProps) => {
  return (
    <div className={cn(
      'grid',
      columnVariants[columns],
      gapVariants[gap],
      className
    )}>
      {children}
    </div>
  );
};