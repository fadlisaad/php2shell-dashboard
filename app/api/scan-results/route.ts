import { NextResponse } from "next/server";
import { ScanFileSchema } from "@/lib/types";
import bundled from "@/data/scan-results.json";

// Serves the scanner output. Set SCAN_RESULTS_URL to fetch from remote storage
// (S3/R2/Blob, etc.); otherwise the bundled data/scan-results.json is returned.
export const dynamic = "force-dynamic";

export async function GET() {
  let payload: unknown = bundled;
  const remote = process.env.SCAN_RESULTS_URL;
  if (remote) {
    const res = await fetch(remote, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: `upstream returned HTTP ${res.status}` }, { status: 502 });
    }
    payload = await res.json();
  }
  const parsed = ScanFileSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid scan results", issues: parsed.error.issues }, { status: 500 });
  }
  return NextResponse.json(parsed.data);
}
