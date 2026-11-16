import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(projectRoot, "dist");
const readJson = async (relativePath) =>
  JSON.parse(await readFile(path.join(projectRoot, relativePath), "utf8"));
const domainConfig = await readJson("site-domains.json");
const origin = new URL(domainConfig.primaryCanonicalOrigin).origin;
const linkedinUrl = "https://www.linkedin.com/showcase/atlas-global-south-ai-policy-coalition/";
const logoUrl = `${origin}/assets/atlas-global-south-logo.jpg`;
const coalitionId = `${origin}/#organization`;
const websiteId = `${origin}/#website`;
const googleVerification = "I60SfR9EJ1Gzc2L719S3_uOF1rQ-T0e3SNM2fbEF6MU";

const [membersData, committeeData, homepageData, contributionsData, countriesData, routesData] =
  await Promise.all([
    readJson("data/members.json"),
    readJson("data/founding-committee.json"),
    readJson("data/homepage-content.json"),
    readJson("data/contributions.json"),
    readJson("data/countries.json"),
    readJson("manus-routes.json"),
  ]);
const members = membersData.members;
const appSource = await readFile(path.join(projectRoot, "src/app.js"), "utf8");
if (!/\nload\(\);\s*$/.test(appSource)) {
  throw new Error("Could not safely prepare the existing app renderer for static page generation.");
}
let renderedMarkup = "";
const appMount = {
  get innerHTML() { return renderedMarkup; },
  set innerHTML(value) { renderedMarkup = String(value); },
};
const prerenderDocument = {
  title: "",
  querySelector(selector) { return selector === "#app" ? appMount : null; },
  querySelectorAll() { return []; },
  head: { querySelector() { return null; }, appendChild() {} },
  createElement() { return { setAttribute() {}, content: "" }; },
};
const sandbox = {
  document: prerenderDocument,
  location: { pathname: "/", href: `${origin}/` },
  membersData,
  committeeData,
  homepageData,
  contributionsData,
  countriesData,
  siteOrigin: origin,
};
vm.createContext(sandbox);
vm.runInContext(
  `${appSource.replace(/\nload\(\);\s*$/, "\n")}
state.homepage = homepageData;
state.members = membersData.members;
state.auditedCount = membersData.meta.audited_records || membersData.members.length;
state.committee = committeeData.members;
state.committeeName = committeeData.committee_name;
state.committeeType = committeeData.committee_type || committeeData.committee;
state.committeeHost = committeeData.institutional_host_and_secretariat;
state.contributions = contributionsData.contributions || [];
state.countries = countriesData.countries || [];
globalThis.prerender = {
  header, footer, leadershipOverview, foundingCommittee, profile, committeeFaqItems,
  renderRoute(route) {
    location.pathname = route;
    location.href = siteOrigin + route;
    renderedMarkup = "";
    render();
    return { html: document.querySelector("#app").innerHTML, title: document.title };
  },
};
`,
  sandbox,
  { filename: "src/app.js" },
);

const render = sandbox.prerender;
const committee = committeeData.members;
const memberBySlug = new Map(members.map((member) => [member.slug, member]));
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character],
  );
const safeJsonLd = (value) =>
  JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
const absolute = (route) => `${origin}${route.startsWith("/") ? route : `/${route}`}`;
const cleanRoute = (route) => (route.endsWith("/") ? route : `${route}/`);
const entityOrganization = {
  "@type": "Organization",
  "@id": coalitionId,
  name: "Atlas Global South AI Policy Coalition",
  url: `${origin}/`,
  description: homepageData.about.body,
  logo: { "@type": "ImageObject", url: `${origin}/assets/atlas-global-south-logo.jpg` },
  sameAs: [linkedinUrl],
};
const websiteEntity = {
  "@type": "WebSite",
  "@id": websiteId,
  url: `${origin}/`,
  name: "Atlas Global South AI Policy Coalition",
  inLanguage: "en",
  publisher: { "@id": coalitionId },
};

function profileUrl(slug) {
  return absolute(`/members/${encodeURIComponent(slug)}/`);
}

function personEntity(committeeMember, includeProfile = true) {
  const profile = memberBySlug.get(committeeMember.profile_slug);
  const role = committeeMember.designation || committeeMember.responsibility || "Founding Committee member";
  const entity = {
    "@type": "Person",
    "@id": `${profileUrl(committeeMember.profile_slug)}#person`,
    name: committeeMember.full_name,
    url: profileUrl(committeeMember.profile_slug),
    memberOf: { "@id": coalitionId },
  };
  if (profile?.designation) entity.jobTitle = profile.designation;
  const profileProperties = [{
    "@type": "PropertyValue",
    name: "Founding Committee role",
    value: role,
  }];
  if (profile?.institution) {
    const affiliations = profile.institution.split(/\s*;\s*/).filter(Boolean);
    const organizations = affiliations.filter((name) => !/^independent consultant$/i.test(name));
    if (organizations.length) {
      entity.affiliation = organizations.map((name) => ({ "@type": "Organization", name }));
    }
    const nonOrganizationAffiliations = affiliations.filter((name) => !organizations.includes(name));
    if (nonOrganizationAffiliations.length) {
      profileProperties.push({
        "@type": "PropertyValue",
        name: "Professional affiliation listed on the public profile",
        value: nonOrganizationAffiliations.join("; "),
      });
    }
  }
  if (profile?.country) {
    profileProperties.push({
      "@type": "PropertyValue",
      name: "Country listed on the public member profile",
      value: profile.country,
    });
  }
  entity.additionalProperty = profileProperties;
  if (includeProfile && profile?.photo && !profile.photo.startsWith("data:")) {
    entity.image = absolute(profile.photo);
  }
  return entity;
}

function committeeGraph(route, title, description, faqItems) {
  const url = absolute(cleanRoute(route));
  const list = {
    "@type": "ItemList",
    "@id": `${url}#committee-members`,
    name: "Atlas Global South AI Policy Coalition Founding Committee members",
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: committee.length,
    itemListElement: committee.map((person, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: personEntity(person),
    })),
  };
  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
      { "@type": "ListItem", position: 2, name: "Leadership", item: absolute("/leadership/") },
      { "@type": "ListItem", position: 3, name: "Founding Committee", item: absolute("/leadership/founding-committee/") },
    ],
  };
  const graph = [
    entityOrganization,
    websiteEntity,
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: title,
      description,
      inLanguage: "en",
      isPartOf: { "@id": websiteId },
      about: { "@id": coalitionId },
      mainEntity: { "@id": list["@id"] },
      primaryImageOfPage: { "@type": "ImageObject", url: logoUrl },
      breadcrumb: { "@id": breadcrumb["@id"] },
    },
    list,
    breadcrumb,
  ];
  if (faqItems.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      url,
      mainEntity: faqItems.map(([question, answer]) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

function profileGraph(profile, committeeMember, route, title, description) {
  const url = absolute(cleanRoute(route));
  const person = personEntity(committeeMember);
  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
      { "@type": "ListItem", position: 2, name: "Members", item: absolute("/members/") },
      { "@type": "ListItem", position: 3, name: profile.full_name, item: url },
    ],
  };
  return {
    "@context": "https://schema.org",
    "@graph": [
      entityOrganization,
      websiteEntity,
      {
        "@type": "ProfilePage",
        "@id": `${url}#webpage`,
        url,
        name: title,
        description,
        inLanguage: "en",
        isPartOf: { "@id": websiteId },
        about: { "@id": coalitionId },
        mainEntity: { "@id": person["@id"] },
        breadcrumb: { "@id": breadcrumb["@id"] },
      },
      person,
      breadcrumb,
    ],
  };
}

function publicPageGraph(route, title, description) {
  const url = absolute(cleanRoute(route));
  const isAbout = route === "/about/";
  const isHome = route === "/";
  const page = {
    "@type": isAbout ? "AboutPage" : "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: "en",
    isPartOf: { "@id": websiteId },
    about: { "@id": coalitionId },
  };
  if (isHome || isAbout) page.mainEntity = { "@id": coalitionId };
  return {
    "@context": "https://schema.org",
    "@graph": [entityOrganization, websiteEntity, page],
  };
}

const decodeHtml = (value) => String(value ?? "")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
const plainText = (html) => decodeHtml(String(html).replace(/<[^>]*>/g, " "))
  .replace(/\s+/g, " ").trim();
function trimDescription(value, limit = 155) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  const prefix = text.slice(0, limit - 1);
  const boundary = prefix.lastIndexOf(" ");
  return `${prefix.slice(0, boundary > 90 ? boundary : limit - 1).replace(/[ ,;:.!?-]+$/, "")}…`;
}
function pageDescription(route, html) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || html;
  const paragraphs = [...main.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => plainText(match[1])).filter((value) => value.length > 30);
  const source = paragraphs[0] || homepageData.about.body;
  return trimDescription(source);
}
function pageKeywords(html) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || html;
  const bodyText = plainText(main).toLowerCase();
  const heading = plainText(main.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "")
    .replace(/[,:;]+/g, " ").replace(/\s+/g, " ").trim();
  const existingTopics = [
    "AI governance", "AI policy", "responsible AI", "international cooperation",
    "global South", "policy research", "membership", "member registry",
    "founding committee", "AI ethics", "institutional capacity", "country engagement",
    "international dialogue", "reader charter", "publication", "events",
  ].filter((term) => bodyText.includes(term.toLowerCase()));
  const keywords = [heading, "Atlas Global South AI Policy Coalition", ...existingTopics]
    .map((term) => term.trim()).filter(Boolean)
    .filter((term, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === term.toLowerCase()) === index)
    .slice(0, 8);
  for (const fallback of ["AI governance", "AI policy"]) {
    if (keywords.length >= 3) break;
    if (!keywords.some((term) => term.toLowerCase() === fallback.toLowerCase())) keywords.push(fallback);
  }
  return keywords;
}
function pageTitle(route, manifestTitle, html) {
  if (route === "/") return "Atlas Global South AI Policy Coalition | AI Governance";
  if (route === "/about/") return "About the Coalition | Atlas Global South AI Policy Coalition";
  let base = String(manifestTitle || "").replace(/\s*\|.*$/, "").trim()
    || plainText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "Coalition information");
  const titlePrefixes = {
    "Contact": "Contact the Coalition",
    "Countries": "Coalition Countries",
    "Events": "Coalition Events",
    "Governance": "Coalition Governance",
    "Members": "Coalition Members",
    "Membership": "Coalition Membership",
    "News": "Coalition News",
  };
  base = titlePrefixes[base] || base;
  const suffix = " | Atlas Coalition";
  const maxBase = 60 - suffix.length;
  if (base.length <= maxBase) return `${base}${suffix}`;
  const cropped = base.slice(0, maxBase - 1);
  const boundary = cropped.lastIndexOf(" ");
  return `${cropped.slice(0, boundary > 15 ? boundary : maxBase - 1).trimEnd()}…${suffix}`;
}

function pageDocument({ route, pageRoute = route, title, description, keywords = [], html, graph, image = logoUrl }) {
  const canonical = absolute(cleanRoute(route));
  const head = [
    '<!doctype html>',
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<meta name="keywords" content="${escapeHtml(keywords.join(", "))}">`,
    `<meta name="google-site-verification" content="${googleVerification}">`,
    `<meta name="atlas-prerendered-route" content="${escapeHtml(cleanRoute(pageRoute))}">`,
    '<meta name="robots" content="index,follow,max-image-preview:large">',
    '<link rel="icon" href="/favicon.ico" type="image/x-icon">',
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`,
    '<meta property="og:site_name" content="Atlas Global South AI Policy Coalition">',
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    '<meta property="og:image:alt" content="Atlas Global South AI Policy Coalition official logo">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(image)}">`,
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@400;600&amp;family=Newsreader:opsz,wght@6..72,500;6..72,600;6..72,700&amp;display=swap">',
    '<link rel="stylesheet" href="/src/styles/main.css">',
    `<script type="application/ld+json">${safeJsonLd(graph)}</script>`,
    "</head>",
    "<body>",
    `<div id="app">${html}</div>`,
    '<script src="/web3forms-config.js"></script>',
    '<script type="module" src="/src/app.js"></script>',
    "</body>",
    "</html>",
  ];
  return head.join("");
}

const staticRoutes = (routesData.routes || [])
  .map(({ path: route, title }) => ({ route: cleanRoute(route), title }))
  .filter(({ route }) => route && !route.includes(":"));
const canonicalOverrides = new Map([["/global-members/", "/members/"]]);
const committeeRouteSet = new Set(["/leadership/", "/leadership/founding-committee/"]);
for (const routeInfo of staticRoutes) {
  const { route } = routeInfo;
  const canonicalRoute = canonicalOverrides.get(route) || route;
  const canonicalTitle = staticRoutes.find((entry) => entry.route === canonicalRoute)?.title || routeInfo.title;
  const rendered = render.renderRoute(route);
  const title = pageTitle(canonicalRoute, canonicalTitle, rendered.html);
  const description = pageDescription(canonicalRoute, rendered.html);
  const faqItems = committeeRouteSet.has(route) ? render.committeeFaqItems() : [];
  const graph = committeeRouteSet.has(route)
    ? committeeGraph(canonicalRoute, title, description, faqItems)
    : publicPageGraph(canonicalRoute, title, description);
  const documentHtml = pageDocument({
    route: canonicalRoute,
    pageRoute: route,
    title,
    description,
    keywords: pageKeywords(rendered.html),
    html: rendered.html,
    graph,
  });
  const outputPath = route === "/"
    ? path.join(outputRoot, "index.html")
    : path.join(outputRoot, route.replace(/^\//, ""), "index.html");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, documentHtml, "utf8");
}

for (const committeeMember of committee) {
  const profile = memberBySlug.get(committeeMember.profile_slug);
  if (!profile) throw new Error(`No public member record for ${committeeMember.profile_slug}`);
  const route = `/members/${profile.slug}/`;
  const title = `${profile.full_name} | Founding Committee`;
  const biography = String(profile.biography || "").replace(/\s+/g, " ").trim();
  const descriptionLead = "Founding Committee member of the Atlas Global South AI Policy Coalition. ";
  const excerptLength = Math.max(0, 150 - descriptionLead.length);
  const excerpt = biography.slice(0, excerptLength).replace(/[\s,;:.!?-]+$/, "");
  const description = `${descriptionLead}${excerpt}${biography.length > excerpt.length ? "…" : ""}`;
  const image = profile.photo ? absolute(profile.photo) : logoUrl;
  const graph = profileGraph(profile, committeeMember, route, title, description);
  const html = `${render.header()}${render.profile(profile.slug)}${render.footer()}`;
  const outputPath = path.join(outputRoot, "members", profile.slug, "index.html");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, pageDocument({ route, title, description, keywords: pageKeywords(html), html, graph, image }), "utf8");
}

const sitemapRoutes = new Set(staticRoutes.map(({ route }) => route).filter((route) => !canonicalOverrides.has(route)));
for (const member of committee) sitemapRoutes.add(`/members/${member.profile_slug}/`);
const sitemapEntries = [...sitemapRoutes]
  .sort((left, right) => left.localeCompare(right))
  .map((route) => `  <url><loc>${escapeHtml(absolute(route))}</loc></url>`)
  .join("\n");
await writeFile(
  path.join(outputRoot, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`,
  "utf8",
);
await writeFile(
  path.join(outputRoot, "robots.txt"),
  `User-agent: *\nAllow: /\nDisallow: /api/*\nSitemap: ${origin}/sitemap.xml\n`,
  "utf8",
);

console.log(`SEO static pages generated: ${staticRoutes.length} literal routes and ${committee.length} committee-member profiles.`);
console.log(`Sitemap URLs: ${sitemapRoutes.size}; canonical origin: ${origin}; robots.txt allows public crawling.`);
