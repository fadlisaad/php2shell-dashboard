"use client";
import type { NormalizedResult } from "@/lib/types";
import SeverityBadge from "./SeverityBadge";

export default function ResultsTable({
  results,
  selectedId,
  onSelect,
}: {
  results: NormalizedResult[];
  selectedId: string | null;
  onSelect: (r: NormalizedResult) => void;
}) {
  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        No results match the current filters.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Severity</th>
            <th className="px-4 py-3">Host</th>
            <th className="px-4 py-3">Verdict</th>
            <th className="px-4 py-3">SAPI</th>
            <th className="px-4 py-3">PHP / powered_by</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Final URL</th>
            <th className="px-4 py-3">Reason</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {results.map((r) => (
            <tr
              key={r.id}
              onClick={() => onSelect(r)}
              className={`cursor-pointer hover:bg-slate-50 ${selectedId === r.id ? "bg-slate-100" : ""}`}
            >
              <td className="whitespace-nowrap px-4 py-3"><SeverityBadge severity={r.severity} /></td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{r.host}</td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{r.verdict}</td>
              <td className="whitespace-nowrap px-4 py-3">{r.sapi ?? <span className="text-slate-400">—</span>}</td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{r.powered_by ?? <span className="text-slate-400">—</span>}</td>
              <td className="whitespace-nowrap px-4 py-3">{r.status_code ?? <span className="text-slate-400">—</span>}</td>
              <td className="max-w-[16rem] truncate px-4 py-3 text-slate-600" title={r.final_url ?? ""}>
                {r.final_url ?? <span className="text-slate-400">—</span>}
              </td>
              <td className="max-w-[22rem] truncate px-4 py-3 text-slate-600" title={r.reason ?? ""}>
                {r.reason ?? <span className="text-slate-400">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
