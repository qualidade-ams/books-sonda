import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'yellow' | 'indigo' | 'cyan' | 'teal';
  className?: string;
}

const colorVariants = {
  blue: {
    border: 'border-l-blue-500',
    icon: 'text-blue-500',
    value: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/20'
  },
  green: {
    border: 'border-l-green-500',
    icon: 'text-green-500',
    value: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950/20'
  },
  orange: {
    border: 'border-l-orange-500',
    icon: 'text-orange-500',
    value: 'text-orange-600',
    bg: 'bg-orange-50 dark:bg-orange-950/20'
  },
  purple: {
    border: 'border-l-purple-500',
    icon: 'text-purple-500',
    value: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950/20'
  },
  pink: {
    border: 'border-l-pink-500',
    icon: 'text-pink-500',
    value: 'text-pink-600',
    bg: 'bg-pink-50 dark:bg-pink-950/20'
  },
  yellow: {
    border: 'border-l-yellow-500',
    icon: 'text-yellow-500',
    value: 'text-yellow-600',
    bg: 'bg-yellow-50 dark:bg-yellow-950/20'
  },
  indigo: {
    border: 'border-l-indigo-500',
    icon: 'text-indigo-500',
    value: 'text-indigo-600',
    bg: 'bg-indigo-50 dark:bg-indigo-950/20'
  },
  cyan: {
    border: 'border-l-cyan-500',
    icon: 'text-cyan-500',
    value: 'text-cyan-600',
    bg: 'bg-cyan-50 dark:bg-cyan-950/20'
  },
  teal: {
    border: 'border-l-teal-500',
    icon: 'text-teal-500',
    value: 'text-teal-600',
    bg: 'bg-teal-50 dark:bg-teal-950/20'
  }
};

export const StatCard = ({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend, 
  color = 'blue',
  className 
}: StatCardProps) => {
  const colors = colorVariants[color];

  return (
    <Card className={cn(
      'relative overflow-hidden transition-all duration-200 hover:shadow-md',
      colors.border,
      colors.bg,
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
        <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {title}
        </CardTitle>
        <div className={cn(
          'p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm',
          colors.icon
        )}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-1">
          <div className={cn('text-2xl font-bold', colors.value)}>
            {value}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1">
              <span className={cn(
                'text-xs font-medium',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">
                vs. mês anterior
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};