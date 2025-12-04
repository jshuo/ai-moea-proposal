'use client';

import React from 'react';

interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area';
  data: any[];
  title: string;
}

interface ChartRendererProps {
  chartData: ChartData;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ChartRenderer({ chartData }: ChartRendererProps) {
  const [RechartsComponents, setRechartsComponents] = React.useState<any>(null);

  React.useEffect(() => {
    import('recharts').then((mod) => {
      setRechartsComponents(mod);
    });
  }, []);

  if (!RechartsComponents) {
    return (
      <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <p className="text-sm text-gray-500">Loading chart...</p>
      </div>
    );
  }

  const {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
  } = RechartsComponents;

  const { type, data, title } = chartData;

  let chart = null;

  if (type === 'bar') {
    chart = (
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        {data[0]?.BHI !== undefined ? (
          <>
            <Bar dataKey="BHI" fill="#3b82f6" name="Battery Health Index" />
            <Bar dataKey="RUL" fill="#10b981" name="Remaining Life (days)" />
          </>
        ) : (
          <Bar dataKey="count" fill="#f59e0b" name="Count" />
        )}
      </BarChart>
    );
  } else if (type === 'pie') {
    chart = (
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry: any) => `${entry.name}: ${entry.value}`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((_: any, index: number) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    );
  } else if (type === 'line') {
    chart = (
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
      </LineChart>
    );
  } else if (type === 'area') {
    chart = (
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
      </AreaChart>
    );
  }

  if (!chart) {
    return (
      <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <p className="text-sm text-gray-500">Unsupported chart type</p>
      </div>
    );
  }

  return (
    <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">{title}</h4>
      <ResponsiveContainer width="100%" height={300}>
        {chart}
      </ResponsiveContainer>
    </div>
  );
}
