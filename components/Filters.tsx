"use client";
import { SEVERITY_META } from "@/lib/severity";
import { SEVERITIES, type Severity } from "@/lib/types";

export interface FilterState {
  search: string;
  verdict: string;
  severity: "" | Severity;
  sapi: string;
}

export const EMPTY_FILTERS: FilterState = { search: "", verdict: "", severity: "", sapi: "" };

const selectCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none";

export default function Filters({
  value,
  onChange,
  verdicts,
  sapis,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
  verdicts: string[];
  sapis: string[];
}) {
  const set = <K extends keyof FilterState>(k: K, v: FilterState[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="search"
        placeholder="Search host or URL…"
        value={value.search}
        onChange={(e) => set("search", e.target.value)}
        className={`${selectCls} min-w-[16rem] flex-1`}
      />
      <select aria-label="Verdict" value={value.verdict} onChange={(e) => set("verdict", e.target.value)} className={selectCls}>
        <option value="">All verdicts</option>
        {verdicts.map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
      <select
        aria-label="Severity"
        value={value.severity}
        onChange={(e) => set("severity", e.target.value as FilterState["severity"])}
        className={selectCls}
      >
        <option value="">All severities</option>
        {SEVERITIES.map((s) => (
          <option key={s} value={s}>{SEVERITY_META[s].label}</option>
        ))}
      </select>
      <select aria-label="SAPI" value={value.sapi} onChange={(e) => set("sapi", e.target.value)} className={selectCls}>
        <option value="">All SAPIs</option>
        {sapis.map((s) => (
          <option key={s} value={s}>{s === "__none__" ? "(not detected)" : s}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onChange(EMPTY_FILTERS)}
        className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
      >
        Reset
      </button>
    </div>
  );
}
