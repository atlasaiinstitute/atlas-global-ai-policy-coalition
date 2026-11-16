# Atlas Global AI Policy Coalition — Website Architecture Plan

## Architecture assessment

The existing project is a dependency-free static HTML/CSS/JavaScript application. Its strongest reusable asset is the centralized `data/members.json` dataset with 163 source-audited records, unique IDs, unique slugs, member directory search/filter/pagination, reusable profile rendering, future photo fields and a validation script. There is no existing framework, backend, CMS, authenticated admin dashboard, or verified country dataset.

The implementation will preserve the registry and extend the same static architecture rather than introduce an unnecessary framework. `src/app.js` remains the single route-aware presentation layer, with homepage copy separated under `data/`. Repetitive content uses route-driven templates and explicit content status markers. The architecture is ready to migrate the data-access layer to an API or PostgreSQL later.

## Implementation and design decisions

- **Routes:** keep the existing static entry points and route-aware renderer for `/`, institutional pages, directory pages, member profiles and editorial sections. The homepage update adds no new routes.
- **Data:** `data/members.json` remains the source of truth for the 163 audited member-registry records. `data/founding-committee.json` remains the shared source for the eight approved committee members and positions. Store the new user-supplied homepage copy in `data/homepage-content.json`; do not change member records to accommodate homepage headline statistics.
- **Homepage content:** use the supplied Home Page brief for the header identity, hero, `55` member countries, `170+` researchers and experts, `5` global regions, `6` research tracks, mission/vision, member and leadership sections, research tracks, initiatives, forthcoming publications, news/events, member contributions, join CTA and footer. Render it through the existing editorial visual system, reusing registry cards and existing links.
- **Truthfulness and data boundaries:** the supplied copy is the authorized source for the homepage wording and headline figures. Keep the separate audited registry at 163 records. `data/countries.json` currently has zero records, so do not invent the names or regions of 55 countries; show available country cards only when supplied data exists and otherwise keep a neutral country-list placeholder. Featured-member country details appear only when present in the verified registry.
- **About page scope:** leave the current About page body and layout unchanged until separate About copy is supplied. Any subsequent About update is content-only, preserving its existing layout and styling.
- **Domain and deployment:** retain the existing standard Manus hosted publication URL and owner-only visibility. The custom-domain line in the supplied footer copy is content only; do not change DNS or hosting configuration.
- **Accessibility:** preserve semantic headings, visible focus states, labelled controls, keyboard-friendly navigation and readable contrast.
- **Responsive behavior:** preserve the existing responsive editorial composition, adapting the content sections to the current mobile layout.

## Design direction

The approved style remains **International Editorial Ledger**: contemporary institutional editorial design with the restraint of a policy journal and the clarity of a diplomatic briefing.

- **Core principles:** evidence before ornament; generous whitespace; calm hierarchy; global but not decorative.
- **Color philosophy:** deep navy signals institutional trust, blue supports clarity and navigation, and restrained teal marks verified action and forward movement.
- **Layout paradigm:** asymmetrical editorial bands, with text-led hero content offset against a quiet geometric globe motif rather than a centered marketing grid.
- **Signature elements:** thin rule lines, teal evidence markers, and a geometric “A” seal used as a wordmark placeholder.
- **Interaction philosophy:** interactions reduce uncertainty through clear labels and predictable transitions.
- **Animation:** the homepage hero uses a subtle SVG world-network animation with rotating grid lines, flowing connection routes, pulsing nodes and a breathing halo; reduced-motion preferences disable the loop.
- **Typography:** DM Sans for navigation and body copy; Playfair Display for high-trust editorial headlines.
- **Brand essence:** an international platform for responsible AI governance cooperation; precise, credible, connective. Personality: rigorous, inclusive, forward-looking.
- **Brand voice:** direct, measured and evidence-aware. Example lines: “Advancing global AI governance through international cooperation.” “Explore the member registry.”
- **Wordmark and logo:** an outlined “A” seal paired with an uppercase institutional wordmark; the supplied logo asset remains in use.
- **Signature color:** `#00A99D` teal, reserved for verified status and calls to action.

## Project structure

```text
data/                   member, founding-committee, country and homepage content data
public/manus-routes.json route manifest for all page templates
src/app.js               route resolution, reusable page templates and registry integration
src/styles/main.css      institutional visual system and responsive layouts
scripts/                 import and validation utilities
docs/                    architecture, data, URL, photo and admin guidance
plan.md                  approved implementation and design decisions
TODO.md                  outcome-based implementation status
```

## Remaining content dependencies

Country names and regional assignments for the 55 country cards, verified member-country assignments for profile cards, authorized portraits, contact details and social links remain unavailable in the current project. The supplied homepage already provides the approved wording for its research tracks, initiatives, forthcoming publications and announcement/event items. The About page copy has not yet been supplied, so its current content remains untouched.
