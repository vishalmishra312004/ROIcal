# Mirchi radio effectiveness planner

A standalone prototype for planning and presenting a radio campaign effectiveness view. Open index.html in a browser or serve this folder with any static web server. It has no build step, package dependencies, or backend.

## What it does

- Models campaign spend, spots, audience, estimated net reach, frequency, GRPs and CPM.
- Compares website visits, branded search, enquiries and dealer/store visits across equal-length baseline and campaign periods.
- Calculates attributed revenue, gross contribution, ROAS, cost per enquiry and modeled ROI from user-entered sales assumptions.
- Switches display formatting between INR, USD and EUR. Currency selection changes formatting only; it does not convert amounts.
- Exports the current inputs and KPI summary as a CSV report.

The starting values are illustrative planning assumptions, not Radio Mirchi results. Observed changes during a campaign do not establish that radio caused those changes. Use campaign-specific data and document the attribution method before sharing a case study.

## Run locally

Serve the directory with any static web server so browser storage and downloads work consistently:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Deploy

The repository includes a GitHub Pages workflow at `.github/workflows/deploy-pages.yml`. Push to `main`, enable **GitHub Pages** in the repository settings with **GitHub Actions** as the source, and the workflow will publish the site. The `_headers` file also provides security headers on hosts that support Netlify-style headers.

The application has no package dependencies or build step. `app.js` stores the current scenario only in the visitor's browser and does not send campaign data to a server.
