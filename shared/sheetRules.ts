export type PromptFields = Record<string, string>;
export type PromptLocks = Record<string, boolean>;

const strengthDirection: Record<string, string> = {
  Subtle: "subtle cinematic realism",
  Strong: "strong filmic continuity look",
  Heavy: "heavy muted arthouse film look",
};

const lockDirection: Record<string, string> = {
  shoes: "shoes clearly visible in full-body frames",
  back: "back full-body view with neck posture and shoulder silhouette",
  hands: "hand detail frame: veins, skin texture, natural tension",
  lenses: "lens variance: 28mm wide / 35mm observational / 50mm natural / 85mm close-up",
  mannequin: "no mannequin posture — natural weight imbalance and imperfect stance",
  variation: "continuity consistency not cloning — subtle natural variation allowed",
};

const realismProtection = `Hidden Character Realism Protection:
preserve asymmetry; preserve natural facial imbalance; preserve skin irregularities; preserve visible natural pores; preserve fine skin texture; preserve uneven skin tone; preserve subtle facial imperfections; preserve realistic age-appropriate skin texture; preserve natural under-eye shadows; preserve slight redness, blemishes, pores, small wrinkles, and normal skin variation; skin must look tactile and human, not polished or cosmetic; retain ordinary human appearance; maintain facial structure from reference.`;

const avoidDirection = "concept art style, game character sheets, fashion editorial lighting, AI-perfect skin, plastic texture, mannequin posture, white seamless backgrounds, hard rim lighting, heavy HDR grading, beauty retouching, commercial beauty photography, influencer aesthetics, plastic skin, waxy skin, porcelain skin, airbrushed skin, symmetrical face enhancement, beautified facial proportions, skin smoothing, skin softening, pore removal, perfect clean skin, cosmetic ad skin, glamour photography, beauty filter";

const platformDirection: Record<string, { instruction: string; suffix: string }> = {
  Universal: { instruction: "Use natural-language visual-production instructions that can be adapted across image models.", suffix: "" },
  GPT: { instruction: "Write as a structured GPT image-generation instruction: prioritize explicit subject, composition, camera, lighting, continuity and exclusions in readable natural language.", suffix: "" },
  Midjourney: { instruction: "Write as a Midjourney-ready cinematic prompt with concise visual clauses, explicit camera language and a clean parameter tail.", suffix: " --ar 4:5 --stylize 100" },
};

export function buildCharacterPrompt(fields: PromptFields, platform: string, strength: string, locks: PromptLocks) {
  const value = (key: string, fallback: string) => fields[key]?.trim() || fallback;
  const direction = strengthDirection[strength] ?? strengthDirection.Strong;
  const platformRule = platformDirection[platform] ?? platformDirection.Universal;
  const activeLocks = Object.entries(locks).filter(([, enabled]) => enabled).map(([key]) => lockDirection[key] ?? key);
  const lockBlock = activeLocks.length ? activeLocks.map(item => `• ${item}`).join("\n") : "• preserve natural continuity and human imperfection";
  const header = `[FREE CHARACTER SHEET PROMPT — ${platform}]`;
  const important = `IMPORTANT:\nThis is a free character-sheet generator.\nIf the character description or any input field is written in Korean, first translate the meaning internally into precise English visual-production language before generating the image. Do not ignore Korean text. Preserve the user's intended facial structure, posture, wardrobe, age, nationality, and emotional quality. Empty fields mean: infer naturally from the provided character description without changing the core identity.\nUse only the provided character information and infer missing details naturally.\nPrioritize facial structure, hair logic, body posture, wardrobe continuity, and human imperfection over mood-only styling.\nThe goal is not a fashion editorial. The goal is a usable AI character sheet for later scene generation.`;
  const context = `Character Description:\n\"${value("description", "a grounded cinematic protagonist with a distinctive but believable face")}\"\n\nContext:\n- Period / Country: ${value("period", "infer naturally")}.\n- Role / Background: ${value("role", "infer naturally")}.\n- Emotion / Personality: ${value("emotion", "quietly observant, emotionally restrained")}.\n- Body / Posture: ${value("body", "natural weight imbalance and relaxed posture")}.\n- Wardrobe: ${value("wardrobe", "coherent wardrobe inferred from the character")}.`;
  const board = `Board Structure:\n1. IDENTITY ZONE\n- front full-body view\n- left profile\n- right profile in a natural walking pose\n- clear back full-body view\n\n2. CINEMATIC HUMAN ZONE\n- mid-length shots\n- subtle emotional states\n- natural interaction poses\n- candid documentary feeling\n\n3. PRODUCTION CONTINUITY ZONE\n- face texture close-up\n- eye / nose / lips detail\n- hand detail\n- wardrobe texture\n- shoes and accessories`;
  const style = `Visual Style:\n${direction}.\n35mm motion picture film.\nNatural spherical lenses.\nPractical, naturalistic lighting only.\nMuted grey-beige palette.\nLow-key exposure density.\nNatural skin texture, visible pores, subtle imperfections.`;
  const full = `${header}\n\nCreate a photorealistic cinematic actor continuity board based on the following character description.\n\n${platformRule.instruction}\n\n${important}\n\n${context}\n\n${board}\n\n${style}\n\nLocks:\n${lockBlock}\n\n${realismProtection}\n\nAvoid:\n${avoidDirection}${platformRule.suffix}`;
  const compact = `${header}\n${platformRule.instruction} Create a photorealistic ${direction} character continuity board. Character: ${value("description", "a grounded cinematic protagonist with a distinctive but believable face")}. Context: ${value("period", "infer naturally")}; ${value("role", "infer naturally")}; ${value("emotion", "quietly observant, emotionally restrained")}; ${value("body", "natural weight imbalance and relaxed posture")}; Wardrobe: ${value("wardrobe", "coherent wardrobe inferred from the character")}. Include front/profile/back identity views, cinematic human interaction frames, and production detail zones for face, hands, wardrobe and shoes. Practical 35mm film lighting, muted grey-beige palette, natural pores and asymmetry. Locks: ${activeLocks.join(", ") || "natural human imperfection"}.`;
  const negative = `${avoidDirection}${platform === "Midjourney" ? ", --no plastic skin, beauty filter, mannequin pose" : ""}`;
  return { full, compact, negative };
}

export function filterLibraryByProject<T extends { project?: string }>(items: T[], project: string) {
  return project === "ALL PROJECTS" ? items : items.filter(item => (item.project || "Untitled Project") === project);
}

export function deleteProjectItems<T extends { project?: string }>(items: T[], project: string) {
  return items.filter(item => (item.project || "Untitled Project") !== project);
}

export function makeBoardFilename(title: string) {
  return `${(title.trim() || "look-board").replace(/[^a-z0-9가-힣]+/gi, "-").replace(/^-|-$/g, "")}.png`;
}

export function triggerPngDownload(canvas: { toDataURL: (type: string) => string }, documentLike: { createElement: (tag: string) => { download: string; href: string; click: () => void } }, title: string) {
  const link = documentLike.createElement("a");
  link.download = makeBoardFilename(title);
  link.href = canvas.toDataURL("image/png");
  link.click();
  return link.download;
}

export function readLibrary<T>(storage: { getItem: (key: string) => string | null }, key: string): T[] {
  try { return JSON.parse(storage.getItem(key) || "[]") as T[]; } catch { return []; }
}

export function writeLibrary<T>(storage: { setItem: (key: string, value: string) => void }, key: string, items: T[]) {
  storage.setItem(key, JSON.stringify(items));
  return items;
}

export type BenchmarkFilterEntry = { analysis: { mood: string; bias: string } };

export function benchmarkFilterOptions<T extends BenchmarkFilterEntry>(entries: T[]) {
  return {
    moods: Array.from(new Set(entries.map(entry => entry.analysis.mood))).sort(),
    biases: Array.from(new Set(entries.map(entry => entry.analysis.bias))).sort(),
  };
}

export function filterBenchmarkEntries<T extends BenchmarkFilterEntry>(entries: T[], mood: string, bias: string) {
  return entries.filter(entry =>
    (mood === "ALL MOODS" || entry.analysis.mood === mood) &&
    (bias === "ALL COLOR BIAS" || entry.analysis.bias === bias),
  );
}

export function toggleFavoriteKey(keys: string[], key: string) {
  return keys.includes(key) ? keys.filter(value => value !== key) : [...keys, key];
}

export function filterFavoriteEntries<T extends { item: { sourcePage: string } }>(entries: T[], favorites: string[]) {
  return entries.filter(entry => favorites.includes(entry.item.sourcePage));
}

export type SavedSheetRecord = {
  id: string;
  kind: "color" | "character";
  title: string;
  project: string;
  createdAt: string;
  detail: string;
};

export function makeSavedSheetRecord(kind: "color" | "character", title: string, project: string, detail: string, id: string, createdAt: string): SavedSheetRecord {
  return { id, kind, title: title.trim() || (kind === "character" ? "Untitled Character" : "Untitled Look"), project: project.trim() || "Untitled Project", createdAt, detail };
}
