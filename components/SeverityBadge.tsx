import { SEVERITY_META } from "@/lib/severity";
import type { Severity } from "@/lib/types";

export default function SeverityBadge({ severity }: { severity: Severity }) {
  const meta = SEVERITY_META[severity];
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.badge}`}>
      {meta.label}
    </span>
  );
}
