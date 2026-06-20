/* ─── TrendCharts — Recharts-based dashboard visualizations ──────────── */

import {
  Area, AreaChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { DashboardData } from '../api/types';
import { CATEGORY_META, formatCO2 } from '../api/types';
import './TrendCharts.css';

interface Props {
  dashboard: DashboardData;
}

const COLORS = ['#34d399', '#0ea5e9', '#f59e0b', '#f43f5e', '#a78bfa', '#6366f1', '#ec4899'];

export default function TrendCharts({ dashboard }: Props) {
  // Prepare daily trend data
  const trendData = dashboard.daily_totals.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    co2e: Number(d.total_co2e.toFixed(2)),
    baseline: dashboard.baseline_daily_avg ? Number(dashboard.baseline_daily_avg.toFixed(2)) : undefined,
  }));

  // Prepare pie data
  const pieData = dashboard.category_breakdown.map(cat => ({
    name: CATEGORY_META[cat.category]?.label || cat.category,
    value: Number(cat.total_co2e.toFixed(2)),
    color: CATEGORY_META[cat.category]?.color || '#666',
  }));

  return (
    <div className="trend-charts">
      <div className="chart-row">
        {/* Daily trend */}
        <div className="glass-card chart-card">
          <h3 className="chart-title">Daily Emissions Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="co2eGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(52,211,153,0.1)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6ee7b7', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(52,211,153,0.2)' }}
              />
              <YAxis
                tick={{ fill: '#6ee7b7', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(52,211,153,0.2)' }}
                tickFormatter={(v) => formatCO2(v)}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(10,46,26,0.9)',
                  border: '1px solid rgba(52,211,153,0.3)',
                  borderRadius: '8px',
                  color: '#ecfdf5',
                }}
                formatter={(v: number) => [formatCO2(v), 'CO₂e']}
              />
              <Area
                type="monotone"
                dataKey="co2e"
                stroke="#34d399"
                strokeWidth={2}
                fill="url(#co2eGradient)"
                name="Daily CO₂e"
              />
              {dashboard.baseline_daily_avg && (
                <Area
                  type="monotone"
                  dataKey="baseline"
                  stroke="#f59e0b"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  fill="none"
                  name="Baseline"
                />
              )}
              <Legend
                wrapperStyle={{ color: '#a7f3d0', fontSize: 12 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category pie chart */}
        <div className="glass-card chart-card chart-card--pie">
          <h3 className="chart-title">Category Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
              >
                {pieData.map((entry, index) => (
                  <Cell key={entry.name} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'rgba(10,46,26,0.9)',
                  border: '1px solid rgba(52,211,153,0.3)',
                  borderRadius: '8px',
                  color: '#ecfdf5',
                }}
                formatter={(v: number) => [formatCO2(v), 'CO₂e']}
              />
              <Legend
                wrapperStyle={{ color: '#a7f3d0', fontSize: 11 }}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
