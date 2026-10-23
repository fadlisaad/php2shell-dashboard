"use client";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ScanSummary } from "@/lib/normalizeResults";
import { SEVERITY_META } from "@/lib/severity";
import { SEVERITIES } from "@/lib/types";

export default function SeverityChart({ summary }: { summary: ScanSummary }) {
  const data = SEVERITIES.map((s) => ({
    severity: SEVERITY_META[s].label,
    count: summary.bySeverity[s],
    color: SEVERITY_META[s].color,
  }));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-700">Findings by severity</h2>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
          <XAxis dataKey="severity" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.severity} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
