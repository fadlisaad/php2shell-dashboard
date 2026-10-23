import type { Severity } from "./types";

export function severityFor(result: { vulnerable: boolean | null; verdict: string }): Severity {
  if (result.vulnerable === true || result.verdict === "VULNERABLE") return "critical";
  switch (result.verdict) {
    case "INCONCLUSIVE":
      return "high";
    case "ERROR":
      return "medium";
    case "FIXED":
      return "low";
    case "NO SIGNAL":
      return "info";
    default:
      return "medium";
  }
}

export const SEVERITY_META: Record<Severity, { label: string; color: string; badge: string }> = {
  critical: { label: "Critical", color: "#dc2626", badge: "bg-red-100 text-red-800 ring-red-600/20" },
  high: { label: "High", color: "#ea580c", badge: "bg-orange-100 text-orange-800 ring-orange-600/20" },
  medium: { label: "Medium", color: "#ca8a04", badge: "bg-yellow-100 text-yellow-800 ring-yellow-600/20" },
  low: { label: "Low", color: "#16a34a", badge: "bg-green-100 text-green-800 ring-green-600/20" },
  info: { label: "Info", color: "#2563eb", badge: "bg-blue-100 text-blue-800 ring-blue-600/20" },
};
