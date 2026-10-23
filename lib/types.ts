import { z } from "zod";

export const VERDICTS = ["VULNERABLE", "INCONCLUSIVE", "ERROR", "FIXED", "NO SIGNAL"] as const;
export type Verdict = (typeof VERDICTS)[number];

export const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;
export type Severity = (typeof SEVERITIES)[number];

const nullableString = z.string().nullish().transform((v) => v ?? null);
const nullableNumber = z.number().nullish().transform((v) => v ?? null);

// Mirrors response_metadata() in scanner.py; used for both `control` and each `probes` item.
export const ResponseMetadataSchema = z.object({
  status_code: nullableNumber,
  response_bytes: nullableNumber,
  bytes_sent: nullableNumber,
  error: nullableString,
  description: nullableString,
});
export type ResponseMetadata = z.infer<typeof ResponseMetadataSchema>;

// Mirrors base_result() in scanner.py. Unknown verdicts are kept as strings so a
// newer scanner version doesn't break ingestion.
export const ScanResultSchema = z.object({
  host: z.string(),
  vulnerable: z.boolean().nullish().transform((v) => v ?? null),
  verdict: z.string().default("ERROR"),
  status_code: nullableNumber,
  error: nullableString,
  reason: nullableString,
  sapi: nullableString,
  powered_by: nullableString,
  request: nullableString,
  response: nullableString,
  final_url: nullableString,
  tested_url: nullableString,
  control: ResponseMetadataSchema.nullish().transform((v) => v ?? null),
  probes: z.array(ResponseMetadataSchema).nullish().transform((v) => v ?? []),
  timestamp: nullableString,
});
export type ScanResult = z.infer<typeof ScanResultSchema>;

// Mirrors save_results() in scanner.py.
export const ScanFileSchema = z.object({
  scan_time: nullableString,
  total_results: z.number().optional(),
  results: z.array(ScanResultSchema),
});
export type ScanFile = z.infer<typeof ScanFileSchema>;

export interface NormalizedResult extends ScanResult {
  id: string;
  severity: Severity;
  phpVersion: string | null;
}

export interface NormalizedScan {
  scanTime: string | null;
  results: NormalizedResult[];
}
