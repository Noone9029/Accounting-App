const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const appRoot = path.join(repoRoot, "apps", "web", "src", "app");
const routeRegistry = path.join(repoRoot, "apps", "web", "src", "lib", "app-routes.ts");
const outputPath = path.join(repoRoot, "docs", "quality", "ui-route-page-dispositions.json");

function walk(current) {
  return fs.readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(current, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function normalizeRoute(file) {
  let relative = path.relative(appRoot, path.dirname(file)).split(path.sep).join("/");
  relative = relative.replace(/^\([^/]+\)\//, "");
  relative = relative.replace(/\[\.\.\.([^\]]+)\]/g, "*$1").replace(/\[([^\]]+)\]/g, ":$1");
  return `/${relative === "." ? "" : relative}`.replace(/\/$/, "") || "/";
}

function routeDefinitions() {
  const source = fs.readFileSync(routeRegistry, "utf8");
  const starts = [...source.matchAll(/\broute\(\s*"([^"]+)"/g)];
  return starts.map((match, index) => {
    const block = source.slice(match.index, starts[index + 1]?.index ?? source.length);
    const href = block.match(/\broute\(\s*"[^"]+"\s*,\s*"[^"]+"\s*,\s*"([^"]+)"/s)?.[1];
    if (!href) throw new Error(`Unable to parse href for route ${match[1]}`);
    return {
      href,
      capabilityStatus: block.includes('capabilityStatus: "planned"')
        ? "planned"
        : block.includes('capabilityStatus: "inactive"')
          ? "inactive"
          : "active",
    };
  });
}

const routeByHref = new Map(routeDefinitions().map((route) => [route.href, route]));

const pages = walk(appRoot)
  .filter((file) => file.endsWith(`${path.sep}page.tsx`))
  .map((file) => {
    const relative = path.relative(repoRoot, file).split(path.sep).join("/");
    const signedIn = file.includes(`${path.sep}(app)${path.sep}`);
    const route = normalizeRoute(file);
    const canonicalRoute = routeByHref.get(route);
    const activelyExercised = canonicalRoute?.capabilityStatus === "active";
    return {
      id: `page:${route}`,
      pageModule: relative,
      route,
      surface: signedIn ? "signed-in" : "public-or-auth",
      coverage: activelyExercised ? "canonical-active-route" : "inventory-only-page-module",
      roles: activelyExercised ? (signedIn ? ["Owner", "Admin", "Accountant", "Sales", "Purchases", "Viewer"] : ["Public/auth"]) : [],
      viewports: activelyExercised ? ["1440x1000", "1024x768", "390x844"] : [],
      locales: activelyExercised ? ["en/LTR", "ar/RTL"] : [],
      stateContract: activelyExercised
        ? ["normal", "loading", "empty", "zero-value", "large-data", "long-text", "validation", "api-failure", "denied", "success", "destructive"]
        : ["inventory-only; route-specific state proof required"],
      classification: activelyExercised ? "canonical route baseline disposition" : "inventory-only page-module disposition",
      disposition: activelyExercised
        ? "Canonical active route included in the bounded role/viewport structural matrix; route-specific workflow findings remain linked from the product stabilization ledger."
        : "Page module is inventoried but is not a canonical active-route matrix target; do not infer role, viewport, locale, or state proof from this row.",
      evidence: activelyExercised
        ? ["verify:ui:inventory", "role-filtered-route-polish.visual.spec.ts", "arabic-locale.visual.spec.ts", "all-active-routes.visual.spec.ts"]
        : ["verify:ui:inventory"],
    };
  })
  .sort((left, right) => left.pageModule.localeCompare(right.pageModule));

const payload = {
  generatedFrom: "apps/web/src/app/**/page.tsx",
  generatedAt: "stable-inventory",
  contract: "Each page row records coverage status and only claims role, viewport, locale, state, classification, disposition, and evidence for canonical active routes that are actually exercised; inventory-only modules are explicitly marked as requiring route-specific proof.",
  pages,
};

if (process.argv.includes("--check")) {
  if (!fs.existsSync(outputPath)) throw new Error(`Missing ${path.relative(repoRoot, outputPath)}`);
  const current = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  if (JSON.stringify(current) !== JSON.stringify(payload)) throw new Error("UI route/page disposition register is stale; run the generator and review the resulting diff.");
  console.log(`PASS: ${pages.length} page dispositions are current.`);
} else {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${pages.length} page dispositions to ${path.relative(repoRoot, outputPath)}`);
}
