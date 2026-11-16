import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(projectRoot, "dist");
const origin = "https://coalition.atlasai.institute";
const instituteUrl = "https://atlasai.institute";
const linkedinUrl = "https://www.linkedin.com/showcase/atlas-global-south-ai-policy-coalition/";
const coalitionId = `${origin}/#organization`;
const websiteId = `${origin}/#website`;
const logoUrl = `${origin}/assets/atlas-global-south-logo.jpg`;
const profileKeywords = [
  "Atlas Global South AI Policy Coalition",
  "global AI governance",
  "international AI policy",
  "responsible AI governance",
  "AI policy research",
  "Global South perspectives",
  "international policy cooperation",
];

const readJson = async (relativePath) =>
  JSON.parse(await readFile(path.join(projectRoot, relativePath), "utf8"));
const [membersData, committeeData, homepageData] = await Promise.all([
  readJson("data/members.json"),
  readJson("data/founding-committee.json"),
  readJson("data/homepage-content.json"),
]);
const members = membersData.members;
const appSource = await readFile(path.join(projectRoot, "src/app.js"), "utf8");
if (!/\nload\(\);\s*$/.test(appSource)) {
  throw new Error("Could not safely prepare the existing app renderer for static page generation.");
}
const sandbox = {};
sandbox.homepageData = homepageData;
sandbox.members = members;
sandbox.committeeData = committeeData;
vm.createContext(sandbox);
vm.runInContext(
  `${appSource.replace(/\nload\(\);\s*$/, "\n")}
state.homepage = homepageData;
state.members = members;
state.committee = committeeData.members;
state.committeeName = committeeData.committee_name;
state.committeeType = committeeData.committee_type || committeeData.committee;
state.committeeHost = committeeData.institutional_host_and_secretariat;
globalThis.prerender = { header, footer, leadershipOverview, foundingCommittee, profile, committeeFaqItems };
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
  description:
    "An international platform for AI policy, governance, research and cooperation, convened by Atlas AI Institute. The Institute serves as the Coalition's institutional host and secretariat.",
  sameAs: [linkedinUrl],
  parentOrganization: {
    "@type": "Organization",
    "@id": `${instituteUrl}/#organization`,
    name: "Atlas AI Institute",
    url: instituteUrl,
  },
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

function pageDocument({ route, title, description, html, graph, image = logoUrl }) {
  const canonical = absolute(cleanRoute(route));
  const keywords = profileKeywords.join(", ");
  const head = [
    '<!doctype html>',
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<meta name="keywords" content="${escapeHtml(keywords)}">`,
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

const committeePages = [
  {
    route: "/leadership/",
    title: "Leadership | Atlas Global South AI Policy Coalition",
    description:
      "Meet the Atlas Global South AI Policy Coalition’s Founding Committee, convened by Atlas AI Institute to support international AI policy dialogue.",
    html: `${render.header()}${render.leadershipOverview()}${render.footer()}`,
  },
  {
    route: "/leadership/founding-committee/",
    title: "Founding Committee | Atlas Global South AI Policy Coalition",
    description:
      "Meet the eight-member Founding Committee of the Atlas Global South AI Policy Coalition, convened by Atlas AI Institute, and explore its published roles.",
    html: `${render.header()}${render.foundingCommittee()}${render.footer()}`,
  },
];

for (const page of committeePages) {
  const faqItems = render.committeeFaqItems();
  const graph = committeeGraph(page.route, page.title, page.description, faqItems);
  const outputPath = path.join(outputRoot, page.route.replace(/^\//, ""), "index.html");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, pageDocument({ ...page, graph }), "utf8");
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
  await writeFile(outputPath, pageDocument({ route, title, description, html, graph, image }), "utf8");
}

const routesData = await readJson("manus-routes.json");
const staticRoutes = (routesData.routes || [])
  .map(({ path: route }) => route)
  .filter((route) => route && !route.includes(":"));
const sitemapRoutes = new Set(staticRoutes.map(cleanRoute));
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

console.log(`SEO static pages generated: ${committeePages.length} committee pages and ${committee.length} member profiles.`);
console.log(`Sitemap URLs: ${sitemapRoutes.size}; robots.txt allows public crawling.`);
