"use client";
import { useState } from "react";

export interface ScanRequest {
  url: string;
  token: string;
  sapi: string;
  insecure: boolean;
}

const inputCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none";

export default function ScanForm({
  onScan,
  busy,
  error,
}: {
  onScan: (req: ScanRequest) => void;
  busy: boolean;
  error: string | null;
}) {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [sapi, setSapi] = useState("auto");
  const [insecure, setInsecure] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !token || busy) return;
    onScan({ url: url.trim(), token, sapi, insecure });
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700">Scan a URL</h2>
      <p className="mt-1 text-xs text-slate-500">
        Runs the live scanner against one target. Requires the scan token. The target receives large
        multipart probes — only scan hosts you are authorized to test.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[18rem] flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Target URL</span>
          <input
            type="text"
            inputMode="url"
            placeholder="https://example.com/index.php"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={inputCls}
            required
          />
        </label>
        <label className="flex min-w-[12rem] flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Scan token</span>
          <input
            type="password"
            autoComplete="off"
            placeholder="secret token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className={inputCls}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">SAPI</span>
          <select value={sapi} onChange={(e) => setSapi(e.target.value)} className={inputCls}>
            <option value="auto">auto</option>
            <option value="mod_php">mod_php</option>
            <option value="fpm">fpm</option>
          </select>
        </label>
        <label className="mb-2 flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={insecure} onChange={(e) => setInsecure(e.target.checked)} />
          Skip TLS verify
        </label>
        <button
          type="submit"
          disabled={busy || !url.trim() || !token}
          className="mb-0.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Scanning…" : "Scan"}
        </button>
      </div>
      {error && (
        <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
    </form>
  );
}
