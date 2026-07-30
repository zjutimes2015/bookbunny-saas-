'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const COLORS = ['#FF6B8A', '#C8A2E8', '#98D8C8', '#87CEEB', '#FFDAB9'];

interface AnalyticsChartsProps {
  dailyBooks: { day: string; count: number }[];
  dailyChars: { day: string; count: number }[];
  statusCounts: { status: string; count: number }[];
  recentBooks: { title: string; status: string; date: string }[];
}

/**
 * Client-side chart component for the admin analytics page.
 *
 * Uses recharts (already a dependency). Dark-mode aware via currentColor
 * and muted Tailwind tokens.
 */
export function AnalyticsCharts({
  dailyBooks,
  dailyChars,
  statusCounts,
  recentBooks,
}: AnalyticsChartsProps) {
  const totalBooks = dailyBooks.reduce((s, d) => s + d.count, 0);
  const totalChars = dailyChars.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-4">
      {/* Summary numbers */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Last 14 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalBooks}</div>
            <p className="text-sm text-muted-foreground">books created</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Last 14 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalChars}</div>
            <p className="text-sm text-muted-foreground">new characters</p>
          </CardContent>
        </Card>
      </div>

      {/* Books per day */}
      <Card>
        <CardHeader>
          <CardTitle>Books Created Per Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={
                  dailyBooks.length > 0
                    ? dailyBooks
                    : [{ day: 'No data', count: 0 }]
                }
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--popover))',
                    color: 'hsl(var(--popover-foreground))',
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#FF6B8A"
                  radius={[6, 6, 0, 0]}
                  name="Books"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Status + Characters trend */}
      <div className="grid gap-4 md:grid-cols-2">
        {statusCounts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Book Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusCounts.map((s) => ({
                        name:
                          s.status.charAt(0).toUpperCase() + s.status.slice(1),
                        value: s.count,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusCounts.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--popover))',
                        color: 'hsl(var(--popover-foreground))',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {statusCounts.map((s, i) => (
                  <div
                    key={s.status}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    {s.status}: {s.count}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>New Characters Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={
                    dailyChars.length > 0
                      ? dailyChars
                      : [{ day: 'No data', count: 0 }]
                  }
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="day"
                    tick={{
                      fontSize: 11,
                      fill: 'hsl(var(--muted-foreground))',
                    }}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis
                    tick={{
                      fontSize: 11,
                      fill: 'hsl(var(--muted-foreground))',
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--popover))',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#C8A2E8"
                    strokeWidth={2}
                    dot={{ fill: '#C8A2E8', r: 4 }}
                    name="Characters"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent books list */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Books</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No books yet</p>
          ) : (
            <div className="space-y-3">
              {recentBooks.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        b.status === 'ready'
                          ? 'bg-emerald-500'
                          : b.status === 'generating'
                            ? 'bg-amber-500'
                            : 'bg-muted'
                      }`}
                    />
                    <span className="font-medium">{b.title}</span>
                  </div>
                  <span className="text-muted-foreground">{b.date}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
