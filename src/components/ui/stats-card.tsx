import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  description?: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatsCard({
  title,
  value,
  icon,
  description,
  trend,
  trendDirection = 'neutral',
  className
}: StatsCardProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600'
  };

  return (
    <Card className={cn("shadow-sm border border-gray-200", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">
          {title}
        </CardTitle>
        {icon && (
          <div className="text-sonda-blue">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">
          {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
        </div>
        {(description || trend) && (
          <div className="flex items-center justify-between mt-1">
            {description && (
              <p className="text-xs text-gray-600">
                {description}
              </p>
            )}
            {trend && (
              <p className={cn("text-xs font-medium", trendColors[trendDirection])}>
                {trend}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}