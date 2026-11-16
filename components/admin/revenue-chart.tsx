'use client'
import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { DashboardTrend } from '@/lib/admin-dashboard'

export function RevenueChart({ data }: { data: DashboardTrend[] }) {
    const [mode, setMode] = useState<'orderValue' | 'retained'>('orderValue')
    const previous = mode === 'orderValue' ? 'previousOrderValue' : 'previousRetained'
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Order trends</h2>
                <label className="text-xs text-slate-500 inline-flex items-center gap-2">
                    <select
                        aria-label="Chart measure"
                        value={mode}
                        onChange={(event) => setMode(event.target.value as typeof mode)}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
                    >
                        <option value="orderValue">Order value</option>
                        <option value="retained">Payments retained</option>
                    </select>
                </label>
            </div>
            <div className="h-64 min-w-0 w-full">
                <ResponsiveContainer
                    width="100%"
                    height={256}
                    minWidth={0}
                    initialDimension={{ width: 1, height: 256 }}
                >
                    <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                            dataKey="day"
                            tickFormatter={(day) => String(day).slice(5)}
                            tick={{ fontSize: 11 }}
                            minTickGap={30}
                        />
                        <YAxis
                            width={65}
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value) =>
                                `₹${Number(value).toLocaleString('en-IN', { notation: 'compact' })}`
                            }
                        />
                        <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Area
                            type="linear"
                            isAnimationActive={false}
                            dataKey={previous}
                            name="Previous"
                            stroke="#94a3b8"
                            fill="#f1f5f9"
                            strokeDasharray="4 4"
                        />
                        <Area
                            type="linear"
                            isAnimationActive={false}
                            dataKey={mode}
                            name="This period"
                            stroke="#be185d"
                            fill="#fce7f3"
                            fillOpacity={0.35}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
