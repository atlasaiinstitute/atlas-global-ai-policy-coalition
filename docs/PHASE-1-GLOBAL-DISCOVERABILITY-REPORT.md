# Phase 1 — Homepage, About & Technical SEO Foundation

**Project:** Atlas Global South AI Policy Coalition
**Repository:** `atlasaiinstitute/atlas-global-ai-policy-coalition`
**Primary origin configured:** `https://atlas-global-ai-policy-coalition.vercel.app`
**Status:** Phase 1 implementation and local validation complete. Phase 2 has not started.

## Executive summary

The existing Vanilla HTML/CSS/JavaScript project and its routes were preserved. The production build now renders the page content already produced by the existing application into the initial HTML for all 28 literal routes in `manus-routes.json`, rather than shipping an empty app mount with generic registry metadata. It gives the homepage and About page dedicated metadata and structured data, keeps the existing visible page markup unchanged, and emits domain-consistent canonical URLs, social cards, `robots.txt` and `sitemap.xml`.

The Google verification meta tag and the user-provided verification HTML file are included in generated output. The Vercel `.app` host was confirmed live before the change; post-push deployment and Google Search Console ownership confirmation are recorded separately below and should not be inferred from the local build.

## Before the change

The live Vercel homepage and About URL both returned HTTP 200, but their raw HTML used the generic “Global Members” title/description and an empty `#app` mount. `robots.txt` referenced the planned `coalition.atlasai.institute` sitemap rather than the live Vercel origin. Baseline Lighthouse mobile-emulation results were:

| Live page | Performance | Accessibility | Best Practices | SEO | FCP | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Homepage | 98 | 96 | 100 | 100 | 1.6 s | 2.1 s | 0 | 0 ms |
| About | 95 | 95 | 100 | 100 | 1.6 s | 2.9 s | 0 | 0 ms |

Those scores reflect a browser-rendered audit; they did not reveal the empty initial HTML. Phase 1 addresses the crawler-visible response directly. Matching post-deployment Lighthouse runs are pending so the before/after measurements use the actual production build.

## Implementation

### Homepage and About

- Added distinct titles, content-derived descriptions, canonical URLs, Open Graph and Twitter/X card tags, index/follow directives, a language declaration, and route-specific hidden keyword metadata.
- The homepage JSON-LD graph contains the existing Coalition Organization identity, WebSite and WebPage entities. The About route uses AboutPage and links its main entity to the Coalition. The organization description is taken from published Coalition copy; no legal status, partner, recognition or other unsupported claim was added.
- Existing image elements across the generated public routes already had `alt` attributes; no visual asset, logo, styling or visible copy was changed.
- The existing rendering script now preserves the generated page title and head metadata on boot and binds the current interactions to the pre-rendered DOM instead of replacing the page body after loading. This avoids a visible redraw and duplicate DOM work.

### All literal public routes

- The build generated initial HTML for all **28** literal route declarations using the existing route renderer and its current source data.
- Route titles and descriptions are derived from each route’s existing manifest and rendered text; titles are 30–60 characters and descriptions 50–160 characters. Hidden keywords are concise, topic-relevant and derived from the page heading, site identity and existing page copy; they do not alter visible text.
- Open Graph, Twitter/X, canonical and WebPage metadata use only the configured live Vercel origin.
- `/global-members/` remains reachable but is identified as a duplicate of `/members/` using a canonical to `/members/`; the sitemap lists the canonical directory only. This removes a duplicate index target without removing or redirecting either existing route.
- Existing Founding Committee and eight committee-member profile pages remain generated with their prior `FAQPage`, `ItemList`, `Person` and `ProfilePage` data.

### Crawl and verification files

- `robots.txt` allows public crawling, excludes `/api/*`, and names the sitemap on the current Vercel primary domain. No legitimate search or AI-search crawler is blocked.
- `sitemap.xml` contains **35 unique canonical URLs**: 27 canonical literal routes plus the eight existing committee-member profiles. It contains no planned-domain URLs.
- The supplied Google verification meta tag is emitted in prerendered public pages, and the exact requested root file `google343e8e6554f1798d.html` is copied into the Vercel output.
- `404.html` now has a truthful page title, `noindex,follow`, and the existing page body remains unchanged.
- Vercel’s existing `buildCommand`, `outputDirectory` and rewrite file were left in place; the build still uses the project’s existing static-generation pipeline.

## Domain migration readiness

`site-domains.json` is the centralized domain configuration. The confirmed live Vercel origin is the sole active canonical origin. `coalition.atlasai.institute` and `coalition.atlasaii.org` are recorded as planned only; redirects remain disabled. No DNS settings, Vercel domain assignments or production-domain redirects were changed. This config lets a later authorized domain activation update canonical, Open Graph and sitemap origins consistently.

## Validation results

- `npm run check` passed: all 163 member records passed unique-ID/slug checks, and the exact eight-member Committee dataset passed its validator.
- `npm run build` passed: 28 literal pages and eight existing Committee member pages generated.
- A route-by-route output check confirmed the generated `#app` body exactly matches the existing renderer output for all 28 literal routes. No visible text, page structure, CSS, layout, or route was changed.
- Titles, descriptions, 3–8 hidden keywords, one H1, canonical/OG URL agreement, image alt attributes, robots directives, and JSON-LD parsing were checked across the generated pages. The homepage and About schema types were checked explicitly.
- Sitemap XML parsed successfully; all entries use the active origin and are unique. Robots, favicon, Google verification file, and the 404 `noindex` directive passed local checks.
- Local HTTP smoke tests returned 200 for the homepage, About, member directory, Founding Committee, robots, sitemap and Google verification file; a nonexistent static route returned 404.
- The static-site internal-link audit found no broken links among the declared routes or published member slugs.
- `git diff --check` passed.

## Findings and remaining work

1. **Preserved long About heading:** one existing About-page H2 is 130 characters. It has not been rewritten because the user explicitly requires zero visible-copy changes. All H1s are within 80 characters; this H2 remains a disclosed SEO-panel limitation.
2. **Dynamic missing-slug HTTP status:** the existing broad Vercel rewrites send some extensionless dynamic detail URLs to the SPA shell with HTTP 200 even when a slug is unknown; the slash-suffixed unknown test returned 404. This predates Phase 1. Replacing those rewrites safely requires distinguishing published dynamic records from unknown slugs. The routing policy has not been changed in Phase 1 to avoid breaking existing dynamic links; this needs an explicit-data route solution in the next authorized phase.
3. **Dynamic profiles and publications:** the 155 other member profiles and any dynamic publication/article details have not been given individual prerendered metadata or sitemap entries in Phase 1. They are within the separately staged member/publication work, not a claim of complete dynamic-route indexing.
4. **External verification:** Search Console ownership has not yet been confirmed in the Google Search Console account. The HTML and meta proof are in the build; Google must fetch the deployed file/tag before it recognizes ownership.
5. **GitHub-to-Vercel deployment:** the repository’s Vercel build/output configuration is verified. GitHub status/deployment records did not expose a Vercel check before this checkpoint, so automatic production deployment must be confirmed from the pushed commit and live response; no Vercel credentials or project-link file were available in this workspace.
6. **Environment variables:** the sandbox build reported no local Web3Forms membership/publication keys. Production environment values were not inspected or changed; verify those in Vercel without copying secrets into the repository.
7. **Phase 3 items:** cache/security headers, full security review and post-change performance optimization are not implemented in this phase. Baseline results are recorded above; production before/after comparison is pending.

No claim of guaranteed rankings, indexing, citations or AI-search placement is made. Phase 2 has not been started, as requested.

## Files changed or added

- Modified `scripts/generate-seo-pages.mjs` for all-static-route rendering, route-specific metadata, schema, canonical origin, sitemap/robots output and Google verification.
- Modified `scripts/build-static.mjs` to include the verification file in Vercel output.
- Modified `src/app.js` to retain matching prerendered metadata and hydrate existing generated content without replacing its body.
- Modified `404.html` head metadata only.
- Added `site-domains.json` and `google343e8e6554f1798d.html`.
- Updated `docs/COMMITTEE-SEO-IMPLEMENTATION-REPORT.md` to mark its earlier domain recommendations as superseded.
