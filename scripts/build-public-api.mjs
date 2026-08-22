import { readFileSync, writeFileSync } from "node:fs";

function readSeed(path, exportName) {
  const source = readFileSync(path, "utf8");
  const start = source.indexOf("[");
  const end = source.lastIndexOf("]");
  if (start < 0 || end < start) throw new Error(`Cannot read ${exportName}`);
  return JSON.parse(source.slice(start, end + 1));
}

const films = readSeed("server/filmGrabSeed.ts", "filmGrabSeed").map((item, index) => ({
  id: index + 1,
  filmTitle: item.filmTitle,
  sourcePage: item.sourcePage,
  imageUrls: JSON.stringify(item.imageUrls),
  palette: JSON.stringify(item.palette),
  analysis: JSON.stringify(item.analysis),
}));
const characters = [
  { id: 1, caseName: "attached-universal-strong", platform: "Universal", strength: "Strong", sourceLabel: "user attachment: Strong Filmic Continuity" },
  { id: 2, caseName: "attached-universal-subtle", platform: "Universal", strength: "Subtle", sourceLabel: "user attachment: Subtle Cinematic Realism" },
  { id: 3, caseName: "attached-universal-heavy", platform: "Universal", strength: "Heavy", sourceLabel: "user attachment: Heavy Muted Arthouse" },
];

const payload = `const films = ${JSON.stringify(films)};\nconst characters = ${JSON.stringify(characters)};\n\nfunction envelope(data) { return [{ result: { data: { json: data } } }]; }\nfunction send(res, status, body) { res.statusCode = status; res.setHeader("content-type", "application/json; charset=utf-8"); res.setHeader("access-control-allow-origin", "*"); res.end(JSON.stringify(body)); }\nexport default async function handler(req, res) {\n  const path = String(req.url || "").split("?")[0];\n  if (path === "/api/cron/film-grab") {\n    try {\n      const response = await fetch("https://film-grab.com/", { headers: { "user-agent": "Visual-Sheet-Lab-Cron/1.0" } });\n      const html = await response.text();\n      const discoveredPages = [...new Set([...html.matchAll(/href=["'](https:\\/\\/film-grab\\.com\\/\\d{4}\\/[^"']+)["']/gi)].map((match) => match[1]))].slice(0, 20);\n      const result = { ok: response.ok, checkedAt: new Date().toISOString(), sourceStatus: response.status, source: "film-grab.com", discoveredCount: discoveredPages.length, discoveredPages, note: "Public Vercel deployment uses a static benchmark fallback; discovered pages are logged for the next data refresh." };\n      console.log(JSON.stringify({ event: "film-grab-sync", ...result }));\n      return send(res, response.ok ? 200 : 502, result);\n    } catch (error) {\n      return send(res, 502, { ok: false, checkedAt: new Date().toISOString(), error: error instanceof Error ? error.message : String(error), source: "film-grab.com" });\n    }\n  }\n  const procedures = path.split("/api/trpc/")[1] || "";\n  const names = procedures.split(",").filter(Boolean);\n  const result = names.map((name) => {\n    if (name === "filmGrab.list") return films;\n    if (name === "characterPrompts.list") return characters;\n    if (name === "filmGrab.sync" || name === "filmGrab.syncLatest" || name === "characterPrompts.sync") return { synced: 0, source: "public-seed-fallback" };\n    return null;\n  });\n  if (!names.length || result.some((value) => value === null)) return send(res, 404, { error: "Public procedure not found" });\n  send(res, 200, envelope(result.length === 1 ? result[0] : result));\n}\n`;
writeFileSync("api/index.js", payload);
console.log(`Generated public API with ${films.length} films and ${characters.length} character benchmarks.`);
