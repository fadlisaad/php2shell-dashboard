import type { ScanSummary } from "@/lib/normalizeResults";

function Card({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${accent ?? "text-slate-900"}`}>{value}</div>
    </div>
  );
}

export default function SummaryCards({ summary }: { summary: ScanSummary }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <Card label="Targets scanned" value={String(summary.total)} />
      <Card label="Vulnerable" value={String(summary.vulnerable)} accent="text-red-600" />
      <Card label="Fixed" value={String(summary.fixed)} accent="text-green-600" />
      <Card label="Inconclusive" value={String(summary.inconclusive)} accent="text-orange-600" />
      <Card label="No signal" value={String(summary.noSignal)} accent="text-blue-600" />
      <Card label="Error rate" value={`${(summary.errorRate * 100).toFixed(0)}%`} accent="text-yellow-600" />
    </div>
  );
}
