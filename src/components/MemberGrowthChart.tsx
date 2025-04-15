'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface GrowthDataPoint {
  month: string; // e.g. '2024-01'
  members: number;
}

interface Props {
  data: GrowthDataPoint[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    name: string;
  }>;
  label?: string;
}

export default function MemberGrowthChart({ data }: Props) {
  // Custom tooltip with proper typing
  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      // Format month as 'Jan 2024'
      const [year, month] = (label || '').split('-');
      const formattedDate = `${new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'short' })} ${year}`;
      return (
        <div className="bg-white p-2 border rounded shadow">
          <p className="text-sm">{formattedDate}</p>
          <p className="text-sm font-semibold">New Members: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  // Calculate Y-axis ticks in increments of 10
  const maxValue = Math.max(0, ...data.map(d => d.members));
  const yTicks = [];
  for (let i = 0; i <= maxValue + 10; i += 10) {
    yTicks.push(i);
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="month"
            tickFormatter={(label) => {
              if (!label) return '';
              const [year, month] = label.split('-');
              if (!year || !month) return label;
              // Show "Jan 25", "Feb 25", etc.
              return `${new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'short' })} '${year.slice(-2)}`;
            }}
            angle={-30}
            textAnchor="end"
            interval={0}
            height={60}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            domain={[0, yTicks[yTicks.length - 1]]}
            allowDecimals={false}
            interval={0}
            ticks={yTicks}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="members" 
            fill="#4F46E5"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 