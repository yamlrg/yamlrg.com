'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface GrowthDataPoint {
  date: string;
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
      const date = new Date(label || '');
      const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
      return (
        <div className="bg-white p-2 border rounded shadow">
          <p className="text-sm">{formattedDate}</p>
          <p className="text-sm font-semibold">Members: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(date) => {
              const d = new Date(date);
              // Use fixed format for ticks too
              return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear().toString().slice(-2)}`;
            }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            domain={[0, 'dataMax + 5']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="members" 
            stroke="#4F46E5" 
            strokeWidth={2}
            dot={{ fill: '#4F46E5', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 