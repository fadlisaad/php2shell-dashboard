# php2shell Security Dashboard

Next.js dashboard that turns [php2shell-scanner](https://github.com/assetnote/php2shell-scanner) JSON output (CVE-2026-109618 / CVE-2026-109619) into a severity-based security overview.

The dashboard never runs the scanner. It reads the file written by `save_results()` in `scanner.py`.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

The app ships with sample data, so it works as soon as it starts.

## Using your own scan results

1. Run the scanner. Pass `--all-results` so fixed, inconclusive, and errored hosts are included too. Without it, only vulnerable hosts are saved.
   ```bash
   python3 scanner.py -l hosts.txt -t 20 --all-results -o results.json
   ```
2. Load the results in one of three ways:
   - **Upload:** click **Upload results.json** in the UI. The file is parsed in the browser and is never uploaded to a server.
   - **Bundle:** replace `data/scan-results.json` with your file and rebuild. `/api/scan-results` serves this file by default.
   - **Remote:** set `SCAN_RESULTS_URL` to a JSON URL (S3, R2, Azure Blob, etc.). `/api/scan-results` fetches it on each request.

## Severity model

| Scanner result | Severity |
|---|---|
| `vulnerable === true` / `VULNERABLE` | Critical |
| `INCONCLUSIVE` | High |
| `ERROR` (or an unknown verdict) | Medium |
| `FIXED` | Low |
| `NO SIGNAL` | Info |

The mapping lives in `lib/severity.ts`.

## Structure

```
app/
  page.tsx                   redirects to /dashboard
  dashboard/page.tsx
  api/scan-results/route.ts  serves bundled or remote JSON, validated with Zod
components/                  SummaryCards, SeverityChart, Filters, ResultsTable, DetailDrawer, Dashboard
lib/
  types.ts                   Zod schemas matching base_result() / response_metadata() / save_results()
  severity.ts
  normalizeResults.ts        parse + severity + PHP version extraction + summary
data/scan-results.json       data served by the API route
public/sample-results.json   sample covering every verdict
```

## Deploy

- **Vercel:** import the repo. No configuration is needed. Optionally set `SCAN_RESULTS_URL`.
- **Cloudflare Workers:** use [OpenNext for Cloudflare](https://opennext.js.org/cloudflare) (`npx @opennextjs/cloudflare`).
- **Netlify / Azure Static Web Apps:** both support Next.js App Router natively.

> Scan output contains hostnames and response excerpts. Don't deploy real results to a public URL without access control.

## Live scan (iteration 1)

The dashboard can run the real scanner against a single URL you type in. Because the
scanner is Python and Vercel's Next.js builder does not build top-level `/api/*.py`
functions, the scanner runs as its **own Vercel project** in [`scanner-api/`](scanner-api/).

- `scanner-api/api/scan.py` - token-gated endpoint, returns the same shape as `save_results()`
- `scanner-api/api/_scanner.py` - vendored copy of the upstream `scanner.py`
- `scanner-api/pyproject.toml` - sets `[tool.vercel] entrypoint = "api.scan:handler"` (required)

### Environment variables

| Project | Variable | Purpose |
| --- | --- | --- |
| scanner-api | `SCAN_TOKEN` | required; callers must send it as the `x-scan-token` header |
| scanner-api | `ALLOWED_ORIGIN` | CORS origin allowed to call the endpoint (the dashboard URL) |
| dashboard | `NEXT_PUBLIC_SCAN_API_URL` | base URL of the scanner-api deployment |

Without `SCAN_TOKEN` set, the endpoint returns 503 and scanning is disabled.
Rotate the token by updating `SCAN_TOKEN` and redeploying `scanner-api`.

### Deploying the scanner API

```bash
cd scanner-api
vercel deploy --prod
```

> The scanner sends large multipart probes to whatever URL is submitted. Only scan
> hosts you are authorized to test, and keep the scan token private.

### Probe payload (iteration 2)

The scanner escalates a **0.5 / 1 / 2 MiB** probe ladder by default (previously 1 / 8 / 20 MiB).
Each probe is ~87% real multipart parts (~2000 / 4000 / 8000 parts) rather than filler, so the
memory-exhaustion pressure scales with *part count* while every probe stays under a 2 MiB ceiling —
the range most production servers and WAFs allow (old 8/20 MiB probes were rejected before PHP ever
parsed them). Detection logic (in-band fatal memory error, empty-body 500/200 differentials, FPM
gateway errors) is unchanged.

The ceiling is configurable per scan via the **Max probe size** control in the form, or the
`max_mib` field in the POST body (default `2`, clamped to 0.0625–32 MiB). A body-size rejection
(e.g. HTTP 413) is reported distinctly as "body-size limit detected". Raise the ceiling only for an
authorized, permissive target.
