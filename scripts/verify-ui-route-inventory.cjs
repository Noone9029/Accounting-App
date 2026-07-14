const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const appRoot = path.join(repoRoot, "apps", "web", "src", "app");
const routeRegistry = path.join(repoRoot, "apps", "web", "src", "lib", "app-routes.ts");

function walk(current) {
  return fs.readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(current, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function pageHref(file) {
  let relative = path.relative(appRoot, path.dirname(file)).split(path.sep).join("/");
  relative = relative.replace(/^\([^/]+\)\//, "");
  relative = relative.replace(/\[\.\.\.([^\]]+)\]/g, "*$1");
  relative = relative.replace(/\[([^\]]+)\]/g, ":$1");
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
      key: match[1],
      href,
      capabilityStatus: block.includes('capabilityStatus: "planned"')
        ? "planned"
        : block.includes('capabilityStatus: "inactive"')
          ? "inactive"
          : "active",
    };
  });
}

const pageFiles = walk(appRoot).filter((file) => file.endsWith(`${path.sep}page.tsx`));
const pageHrefs = new Set(pageFiles.map(pageHref));
const routes = routeDefinitions();
const missingActive = routes.filter((route) => route.capabilityStatus === "active" && !pageHrefs.has(route.href));
const missingPlanned = routes.filter((route) => route.capabilityStatus === "planned" && !pageHrefs.has(route.href));
const expectedPageCount = 205;
const expectedRouteCount = 96;
const expectedPlannedCount = 4;

const failures = [];
if (pageFiles.length !== expectedPageCount) failures.push(`expected ${expectedPageCount} page modules, found ${pageFiles.length}`);
if (routes.length !== expectedRouteCount) failures.push(`expected ${expectedRouteCount} route definitions, found ${routes.length}`);
if (routes.filter((route) => route.capabilityStatus === "planned").length !== expectedPlannedCount) failures.push(`expected ${expectedPlannedCount} planned routes`);
if (missingActive.length) failures.push(`active routes without page modules: ${missingActive.map((route) => route.href).join(", ")}`);

console.log(`UI route inventory: ${pageFiles.length} page modules, ${routes.length} canonical routes (${routes.filter((route) => route.capabilityStatus === "active").length} active, ${routes.filter((route) => route.capabilityStatus === "planned").length} planned)`);
console.log(`Planned routes without page modules: ${missingPlanned.map((route) => route.href).join(", ") || "none"}`);
console.log(`Signed-in page modules: ${pageFiles.filter((file) => file.includes(`${path.sep}(app)${path.sep}`)).length}`);
console.log(`Public/auth page modules: ${pageFiles.filter((file) => !file.includes(`${path.sep}(app)${path.sep}`)).length}`);

if (failures.length) {
  console.error(failures.map((failure) => `FAIL: ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("PASS: every active canonical route has a page module; planned gaps are explicit capability placeholders.");
}
