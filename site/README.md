# N.E.D landing page (`site/`)

> **Superseded (3 Oct 2026, D21):** the landing page is built in a separate repository. This folder is kept for reference and is not deployed; do not point a Vercel project at it.

Static HTML and CSS (build-plan C5), Vercel project 1. No JavaScript in the page, no login, no wallet code, no analytics.

```bash
cd site
npm ci          # one build-time dependency: qrcode (own lockfile; site/ is not part of the pnpm workspace)
npm run build   # src/ → dist/, fills the URLs and inlines the QR code
```

| Env (build time) | Default | Used for |
| --- | --- | --- |
| `LANDING_ORIGIN` | `https://$VERCEL_PROJECT_PRODUCTION_URL` on Vercel, `http://localhost:4174` locally | The QR code points at `<LANDING_ORIGIN>/m` |
| `WORKSPACE_URL` | `https://unihackfest-2026.vercel.app` | "Open Workspace" buttons |

**Vercel project 1:** Root Directory `site`, Framework Preset "Other". `site/vercel.json` sets `npm ci`, `npm run build`, output `dist`, the `/m` redirect (302 → the GitHub Pages mobile build) and the security headers (strict CSP with no scripts, `X-Frame-Options: DENY`, `Permissions-Policy`). The printed QR code goes to `/m`, so moving the mobile build only means changing that redirect.

Fonts are self-hosted (Inter, Space Grotesk, Space Mono; latin subset; SIL Open Font License 1.1), so the page loads from one origin.
