import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(projectRoot, "dist");

const directories = [
  "about",
  "assets",
  "committee-rulebook",
  "contact",
  "contribute",
  "contributions",
  "countries",
  "data",
  "events",
  "global-members",
  "initiatives",
  "leadership",
  "member-countries",
  "members",
  "membership",
  "news",
  "news-events",
  "policy-research",
  "privacy",
  "public",
  "publications",
  "reader-charter",
  "src",
];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const directory of directories) {
  await cp(path.join(projectRoot, directory), path.join(outputDir, directory), {
    recursive: true,
    force: true,
  });
}

for (const file of ["index.html", "404.html", "manus-routes.json", "favicon.ico", "google343e8e6554f1798d.html"]) {
  await cp(path.join(projectRoot, file), path.join(outputDir, file));
}

// These browser-side keys are intentionally generated at build time, never committed.
const runtimeConfig = [
  `window.WEB3FORMS_ACCESS_KEY = ${JSON.stringify(process.env.WEB3FORMS_ACCESS_KEY || "")};`,
  `window.WEB3FORMS_PUBLICATION_ACCESS_KEY = ${JSON.stringify(process.env.WEB3FORMS_PUBLICATION_ACCESS_KEY || "")};`,
  "",
].join("\n");
await writeFile(path.join(outputDir, "web3forms-config.js"), runtimeConfig, "utf8");

// Prerender committee pages and committee-member profiles for search crawlers.
await import("./generate-seo-pages.mjs");

console.log(`Static site built in ${path.relative(projectRoot, outputDir)}/`);
console.log(
  `Web3Forms keys configured: membership=${Boolean(process.env.WEB3FORMS_ACCESS_KEY)}, publication=${Boolean(process.env.WEB3FORMS_PUBLICATION_ACCESS_KEY)}`,
);
