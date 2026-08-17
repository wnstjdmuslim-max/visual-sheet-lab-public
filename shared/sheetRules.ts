export type PromptFields = Record<string, string>;
export type PromptLocks = Record<string, boolean>;

export function buildCharacterPrompt(fields: PromptFields, platform: string, strength: string, locks: PromptLocks) {
  const value = (key: string, fallback: string) => fields[key]?.trim() || fallback;
  const activeLocks = Object.entries(locks).filter(([, enabled]) => enabled).map(([key]) => key).join(", ") || "natural human imperfection";
  const core = `Create a cinematic character continuity sheet for ${platform}.\n\nCharacter description: ${value("description", "a grounded cinematic protagonist with a distinctive but believable face")}\nPeriod / Country: ${value("period", "infer naturally")}\nRole / Background: ${value("role", "infer naturally")}\nEmotion / Personality: ${value("emotion", "quietly observant, emotionally restrained")}\nBody / Posture: ${value("body", "natural weight imbalance and relaxed posture")}\nWardrobe: ${value("wardrobe", "coherent wardrobe inferred from the character")}`;
  const full = `${core}\n\nBoard structure: front full-body, left profile, right profile, clear back full-body; mid-length emotion and interaction frames; face, hands, wardrobe, shoes and accessory detail frames.\n\nVisual direction: ${strength} cinematic continuity, natural spherical lenses, practical lighting, muted grey-beige palette, low-key exposure, tactile skin texture, visible pores, subtle asymmetry.\n\nContinuity locks: ${activeLocks}.\n\nAvoid: plastic skin, beauty retouching, mannequin posture, fashion editorial lighting, hard rim light, HDR, concept art, game character sheet, porcelain skin, perfect symmetry.`;
  const compact = `${core}. Cinematic character continuity board with front/profile/back views, detail zones, practical light, realistic skin texture, consistent wardrobe, ${strength} look. Locks: ${activeLocks}.`;
  const negative = "plastic skin, waxy skin, airbrushed skin, beauty filter, glamour retouching, mannequin pose, rigid symmetry, fashion editorial, hard rim light, heavy HDR, concept art, game art";
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
