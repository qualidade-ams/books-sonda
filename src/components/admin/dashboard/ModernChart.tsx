import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface ModernChartProps {
  title: string;
  icon: LucideIcon;
  data: any[];
  type: 'bar' | 'line' | 'area' | 'pie';
  height?: number;
  color?: string;
  colors?: string[];
  dataKey?: string;
  xAxisKey?: string;
  yAxisKey?: string;
  layout?: 'horizontal' | 'vertical';
  showLegend?: boolean;
  showGrid?: boolean;
  gradient?: boolean;
  className?: string;
  formatTooltip?: (value: any, name: string) => [string, string];
  formatYAxis?: (value: any) => string;
}

const defaultColors = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

export const ModernChart = ({
  title,
  icon: Icon,
  data,
  type,
  height = 300,
  color = '#3b82f6',
  colors = defaultColors,
  dataKey = 'value',
  xAxisKey = 'name',
  yAxisKey,
  layout = 'horizontal',
  showLegend = true,
  showGrid = true,
  gradient = false,
  className,
  formatTooltip,
  formatYAxis
}: ModernChartProps) => {
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 20, right: 30, left: 20, bottom: 20 }
    };

    switch (type) {
      case 'bar':
        return (
          <BarChart {...commonProps} layout={layout}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            {layout === 'vertical' ? (
              <>
                <XAxis type="number" tickFormatter={formatYAxis} />
                <YAxis dataKey={xAxisKey} type="category" width={100} />
              </>
            ) : (
              <>
                <XAxis dataKey={xAxisKey} />
                <YAxis tickFormatter={formatYAxis} />
              </>
            )}
            <Tooltip formatter={formatTooltip} />
            {showLegend && <Legend />}
            <Bar 
              dataKey={dataKey} 
              fill={color}
              radius={[4, 4, 0, 0]}
              className="drop-shadow-sm"
            />
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            <XAxis dataKey={xAxisKey} />
            <YAxis tickFormatter={formatYAxis} />
            <Tooltip formatter={formatTooltip} />
            {showLegend && <Legend />}
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color}
              strokeWidth={3}
              dot={{ fill: color, r: 4 }}
              activeDot={{ r: 6, stroke: color, strokeWidth: 2, fill: '#fff' }}
            />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {gradient && (
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
            )}
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            <XAxis dataKey={xAxisKey} />
            <YAxis tickFormatter={formatYAxis} />
            <Tooltip formatter={formatTooltip} />
            {showLegend && <Legend />}
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color}
              strokeWidth={2}
              fill={gradient ? `url(#${gradientId})` : color}
              fillOpacity={gradient ? 1 : 0.6}
            />
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart {...commonProps}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill={color}
              dataKey={dataKey}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={formatTooltip} />
            {showLegend && <Legend />}
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={cn('shadow-sm border-0 bg-white dark:bg-gray-800', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
            <Icon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};