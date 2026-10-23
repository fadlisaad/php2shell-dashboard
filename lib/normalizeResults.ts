import { ScanFileSchema, type NormalizedResult, type NormalizedScan, type Severity, SEVERITIES } from "./types";
import { severityFor } from "./severity";

const PHP_VERSION = /PHP\/(\d+\.\d+(?:\.\d+)?)/i;

export function extractPhpVersion(poweredBy: string | null): string | null {
  if (!poweredBy) return null;
  return poweredBy.match(PHP_VERSION)?.[1] ?? null;
}

export class ScanParseError extends Error {}

export function normalizeResults(input: unknown): NormalizedScan {
  const parsed = ScanFileSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ScanParseError(
      `Not a php2shell-scanner results file: ${issue.path.join(".") || "(root)"} ${issue.message}`,
    );
  }
  const results: NormalizedResult[] = parsed.data.results.map((r, i) => ({
    ...r,
    id: `${i}:${r.tested_url ?? r.host}`,
    severity: severityFor(r),
    phpVersion: extractPhpVersion(r.powered_by),
  }));
  return { scanTime: parsed.data.scan_time, results };
}

export interface ScanSummary {
  total: number;
  vulnerable: number;
  fixed: number;
  inconclusive: number;
  noSignal: number;
  errors: number;
  errorRate: number;
  bySeverity: Record<Severity, number>;
}

export function summarize(results: NormalizedResult[]): ScanSummary {
  const bySeverity = Object.fromEntries(SEVERITIES.map((s) => [s, 0])) as Record<Severity, number>;
  let vulnerable = 0, fixed = 0, inconclusive = 0, noSignal = 0, errors = 0;
  for (const r of results) {
    bySeverity[r.severity]++;
    if (r.severity === "critical") vulnerable++;
    else if (r.verdict === "FIXED") fixed++;
    else if (r.verdict === "INCONCLUSIVE") inconclusive++;
    else if (r.verdict === "NO SIGNAL") noSignal++;
    else errors++;
  }
  const total = results.length;
  return {
    total, vulnerable, fixed, inconclusive, noSignal, errors,
    errorRate: total ? errors / total : 0,
    bySeverity,
  };
}
