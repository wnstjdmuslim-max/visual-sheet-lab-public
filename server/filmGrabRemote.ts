import sharp from "sharp";
import { filmGrabSeed } from "./filmGrabSeed";
import { upsertFilmGrabBenchmark } from "./db";

const FILM_GRAB_HOME = "https://film-grab.com/";
const POST_LINK = /https:\/\/film-grab\.com\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9-]+\/?/g;
const IMAGE_LINK = /https?:\/\/film-grab\.com\/wp-content\/uploads\/[^\"'<>\\s]+/g;

type RemoteFilm = { filmTitle: string; sourcePage: string; imageUrls: string[] };

function decodeHtml(value: string) {
  return value.replace(/&#8217;|&#x2019;/g, "’").replace(/&amp;/g, "&").replace(/&#038;/g, "&").replace(/<[^>]+>/g, "").trim();
}

function titleFromHtml(html: string, sourcePage: string) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return decodeHtml(match?.[1] || sourcePage.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "Untitled Film").replace(/\s+[-|].*$/, "");
}

async function analyzeRemoteImages(imageUrls: string[]) {
  const buckets = new Map<string, number>(); let count = 0; let luma = 0; let saturation = 0; let warmth = 0;
  for (const url of imageUrls.slice(0, 9)) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "Visual-Sheet-Lab/1.0" } });
      if (!response.ok) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      const { data, info } = await sharp(buffer).resize(48, 48, { fit: "cover" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      for (let index = 0; index < data.length; index += info.channels) {
        const [r, g, b] = [data[index], data[index + 1], data[index + 2]];
        const key = `#${[r, g, b].map(value => Math.min(255, Math.round(value / 32) * 32).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
        buckets.set(key, (buckets.get(key) || 0) + 1); const max = Math.max(r, g, b); const min = Math.min(r, g, b);
        luma += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; saturation += max ? (max - min) / max : 0; warmth += (r - b) / 255; count += 1;
      }
    } catch { /* keep the remote entry even if one image is unavailable */ }
  }
  const sorted = Array.from(buckets.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([hex]) => hex);
  const averageLuma = luma / Math.max(count, 1); const averageSaturation = saturation / Math.max(count, 1); const averageWarmth = warmth / Math.max(count, 1);
  return {
    palette: sorted.length ? sorted : ["#222222", "#444444", "#666666", "#888888", "#AAAAAA", "#CCCCCC", "#DDDDDD", "#EEEEEE"],
    mood: averageLuma < .35 ? "Nocturnal / introspective" : averageSaturation > .45 ? "Energetic / saturated" : "Cinematic / restrained",
    exposure: averageLuma < .32 ? "Low-key / underexposed" : averageLuma > .68 ? "Bright / lifted" : "Balanced / natural",
    saturation: averageSaturation < .2 ? "Muted" : averageSaturation > .48 ? "Rich / vivid" : "Moderate",
    contrast: averageLuma < .32 || averageLuma > .68 ? "High density" : "Soft / controlled",
    temperature: averageWarmth > .08 ? "Warm" : averageWarmth < -.08 ? "Cool" : "Neutral",
    bias: averageWarmth > .1 ? "Amber / red bias" : averageWarmth < -.1 ? "Blue / cyan bias" : "Balanced chroma",
    raw_metrics: { averageLuma, averageSaturation, averageWarmth },
  };
}

async function parseLatestFilms(limit = 12): Promise<RemoteFilm[]> {
  const home = await (await fetch(FILM_GRAB_HOME, { headers: { "user-agent": "Visual-Sheet-Lab/1.0" } })).text();
  const pages = Array.from(new Set(home.match(POST_LINK) || [])).slice(0, limit);
  const results: RemoteFilm[] = [];
  for (const sourcePage of pages) {
    try {
      const html = await (await fetch(sourcePage, { headers: { "user-agent": "Visual-Sheet-Lab/1.0" } })).text();
      const imageUrls = Array.from(new Set((html.match(IMAGE_LINK) || []).map(url => url.replace(/&amp;/g, "&").replace(/\\u0026/g, "&")))).slice(0, 9);
      if (imageUrls.length) results.push({ filmTitle: titleFromHtml(html, sourcePage), sourcePage, imageUrls });
    } catch { /* skip an unavailable post */ }
  }
  return results;
}

export async function syncLatestFilmGrab(limit = 12) {
  const latest = await parseLatestFilms(limit);
  let synced = 0;
  for (const item of latest) {
    const existing = filmGrabSeed.find(seed => seed.sourcePage === item.sourcePage || seed.filmTitle.toLowerCase() === item.filmTitle.toLowerCase());
    const analysis = existing?.analysis || await analyzeRemoteImages(item.imageUrls);
    const palette = existing?.palette || analysis.palette;
    await upsertFilmGrabBenchmark({ filmTitle: item.filmTitle, sourcePage: item.sourcePage, imageUrls: JSON.stringify(item.imageUrls), palette: JSON.stringify(palette), analysis: JSON.stringify(analysis), sourceUpdatedAt: new Date() });
    synced += 1;
  }
  return { synced, discovered: latest.length, source: FILM_GRAB_HOME, syncedAt: new Date().toISOString() };
}
