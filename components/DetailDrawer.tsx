"use client";
import { useEffect } from "react";
import type { NormalizedResult, ResponseMetadata } from "@/lib/types";
import SeverityBadge from "./SeverityBadge";

function formatBytes(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MiB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${n} B`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-all text-sm text-slate-900">{children ?? <span className="text-slate-400">—</span>}</dd>
    </div>
  );
}

function Dump({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <div>
      <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</h3>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">
        {text.replace(/\r\n/g, "\n")}
      </pre>
    </div>
  );
}

function ProbeRow({ label, m }: { label: string; m: ResponseMetadata }) {
  return (
    <tr className="border-t border-slate-100">
      <td className="py-2 pr-3 font-medium text-slate-700">{label}</td>
      <td className="py-2 pr-3">{m.status_code ?? "—"}</td>
      <td className="py-2 pr-3">{formatBytes(m.bytes_sent)}</td>
      <td className="py-2 pr-3">{formatBytes(m.response_bytes)}</td>
      <td className="py-2 text-slate-600">{m.error ?? m.description ?? "—"}</td>
    </tr>
  );
}

export default function DetailDrawer({ result, onClose }: { result: NormalizedResult | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!result) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <aside className="relative z-50 flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-white shadow-xl">
        <header className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <SeverityBadge severity={result.severity} />
              <span className="font-mono text-xs text-slate-500">{result.verdict}</span>
            </div>
            <h2 className="mt-1 break-all text-lg font-semibold text-slate-900">{result.host}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">✕</button>
        </header>
        <div className="space-y-6 px-6 py-5">
          <section>
            <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Reason</h3>
            <p className="text-sm text-slate-900">{result.reason ?? "—"}</p>
          </section>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Tested URL">{result.tested_url}</Field>
            <Field label="Final URL">{result.final_url}</Field>
            <Field label="Status code">{result.status_code}</Field>
            <Field label="SAPI">{result.sapi}</Field>
            <Field label="powered_by">{result.powered_by}</Field>
            <Field label="PHP version">{result.phpVersion}</Field>
            <Field label="Scanned at">{result.timestamp}</Field>
            <Field label="Vulnerable">{result.vulnerable === null ? "unknown" : String(result.vulnerable)}</Field>
          </dl>
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Probe evidence</h3>
            {result.control || result.probes.length ? (
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-1 pr-3 font-medium">Request</th>
                    <th className="pb-1 pr-3 font-medium">Status</th>
                    <th className="pb-1 pr-3 font-medium">Sent</th>
                    <th className="pb-1 pr-3 font-medium">Received</th>
                    <th className="pb-1 font-medium">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {result.control && <ProbeRow label="Control" m={result.control} />}
                  {result.probes.map((p, i) => <ProbeRow key={i} label={`Probe ${i + 1}`} m={p} />)}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-slate-400">No probes were sent.</p>
            )}
          </section>
          <Dump label="Request (redacted)" text={result.request} />
          <Dump label="Response summary" text={result.response} />
        </div>
      </aside>
    </div>
  );
}
