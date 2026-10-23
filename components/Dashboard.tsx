"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeResults, summarize } from "@/lib/normalizeResults";
import type { NormalizedResult, NormalizedScan } from "@/lib/types";
import { VERDICTS } from "@/lib/types";
import SummaryCards from "./SummaryCards";
import SeverityChart from "./SeverityChart";
import ResultsTable from "./ResultsTable";
import DetailDrawer from "./DetailDrawer";
import Filters, { EMPTY_FILTERS, type FilterState } from "./Filters";
import ScanForm, { type ScanRequest } from "./ScanForm";

type Source = { kind: "api" } | { kind: "sample" } | { kind: "upload"; name: string } | { kind: "scan" };

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 } as const;

function resultKey(r: NormalizedResult): string {
  return r.tested_url ?? r.host;
}

export default function Dashboard() {
  const [scan, setScan] = useState<NormalizedScan | null>(null);
  const [source, setSource] = useState<Source>({ kind: "api" });
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<NormalizedResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async (url: string, next: Source) => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load ${url}: HTTP ${res.status}`);
      setScan(normalizeResults(await res.json()));
      setSource(next);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load("/api/scan-results", { kind: "api" });
  }, [load]);

  const onUpload = async (file: File) => {
    try {
      setScan(normalizeResults(JSON.parse(await file.text())));
      setSource({ kind: "upload", name: file.name });
      setFilters(EMPTY_FILTERS);
      setSelected(null);
      setError(null);
    } catch (e) {
      setError(e instanceof SyntaxError ? `${file.name} is not valid JSON` : (e as Error).message);
    }
  };

  const onScan = async (req: ScanRequest) => {
    setScanning(true);
    setScanError(null);
    try {
      const base = process.env.NEXT_PUBLIC_SCAN_API_URL ?? "";
      const res = await fetch(`${base}/api/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-scan-token": req.token },
        body: JSON.stringify({ url: req.url, sapi: req.sapi, insecure: req.insecure }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? `scan failed: HTTP ${res.status}`);
      const fresh = normalizeResults(payload).results;
      setScan((prev) => {
        const keys = new Set(fresh.map(resultKey));
        const kept = (prev?.results ?? []).filter((r) => !keys.has(resultKey(r)));
        return { scanTime: new Date().toISOString(), results: [...fresh, ...kept] };
      });
      setSource({ kind: "scan" });
      setSelected(fresh[0] ?? null);
    } catch (e) {
      setScanError((e as Error).message);
    } finally {
      setScanning(false);
    }
  };

  const results = useMemo(() => scan?.results ?? [], [scan]);
  const summary = useMemo(() => summarize(results), [results]);
  const verdicts = useMemo(
    () => Array.from(new Set([...VERDICTS, ...results.map((r) => r.verdict)])),
    [results],
  );
  const sapis = useMemo(() => {
    const set = new Set(results.map((r) => r.sapi ?? "__none__"));
    return Array.from(set).sort();
  }, [results]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return results
      .filter((r) => {
        if (q && ![r.host, r.tested_url, r.final_url].some((v) => v?.toLowerCase().includes(q))) return false;
        if (filters.verdict && r.verdict !== filters.verdict) return false;
        if (filters.severity && r.severity !== filters.severity) return false;
        if (filters.sapi && (r.sapi ?? "__none__") !== filters.sapi) return false;
        return true;
      })
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.host.localeCompare(b.host));
  }, [results, filters]);

  const sourceLabel =
    source.kind === "upload"
      ? `Uploaded: ${source.name}`
      : source.kind === "sample"
        ? "Sample data"
        : source.kind === "scan"
          ? "Live scan"
          : "data/scan-results.json";

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">php2shell Security Overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            CVE-2026-109618 / CVE-2026-109619 scan results · {sourceLabel}
            {scan?.scanTime && <> · scanned {new Date(scan.scanTime).toLocaleString()}</>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => load("/sample-results.json", { kind: "sample" })}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Load sample
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Upload results.json
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
        </div>
      </header>

      <ScanForm onScan={onScan} busy={scanning} error={scanError} />

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {scan && (
        <>
          <SummaryCards summary={summary} />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SeverityChart summary={summary} />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Vulnerable targets</h2>
              {results.filter((r) => r.severity === "critical").length ? (
                <ul className="space-y-2 text-sm">
                  {results
                    .filter((r) => r.severity === "critical")
                    .map((r) => (
                      <li key={r.id}>
                        <button onClick={() => setSelected(r)} className="w-full text-left hover:underline">
                          <div className="truncate font-medium text-red-700">{r.final_url ?? r.host}</div>
                          <div className="text-xs text-slate-500">
                            {r.sapi ?? "unknown SAPI"} · {r.powered_by ?? "version not advertised"}
                          </div>
                        </button>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No vulnerable targets in this scan.</p>
              )}
            </div>
          </div>
          <Filters value={filters} onChange={setFilters} verdicts={verdicts} sapis={sapis} />
          <div className="text-xs text-slate-500">
            Showing {filtered.length} of {results.length} results
          </div>
          <ResultsTable results={filtered} selectedId={selected?.id ?? null} onSelect={setSelected} />
        </>
      )}

      <DetailDrawer result={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
